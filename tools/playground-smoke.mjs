// Headless check for the playground sphere, the linked split, and a WebXR miss.
// Serves this repo and opens the playground, then the stations that share the
// orbit sentence. A stubbed immersive-vr session is refused. Nothing here is a headset.
// Run: node tools/playground-smoke.mjs

import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestImmersive, bindSelect } from '../js/playground/xr.js';
import { advancePathTime } from '../js/playground/clock.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

let failed = 0;
function check(name, cond, extra = '') {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name, extra);
  } else {
    console.log('ok  ', name);
  }
}

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = normalize(join(root, pathname));
      if (!file.startsWith(normalize(root))) {
        res.writeHead(403);
        res.end('no');
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      const buf = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end('missing');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function startChrome(userDataDir) {
  return new Promise((resolve, reject) => {
    const chrome = spawn('google-chrome', [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let buf = '';
    const timer = setTimeout(() => reject(new Error(`Chrome did not start\n${buf}`)), 20000);
    const onData = (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (!match) return;
      clearTimeout(timer);
      chrome.stderr.off('data', onData);
      chrome.stderr.on('data', () => {});
      resolve({ chrome, browserWs: match[1] });
    };
    chrome.stderr.on('data', onData);
    chrome.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

async function openPage(browserWs) {
  const port = new URL(browserWs).port;
  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let next = 0;
  const pending = new Map();
  const bags = { exceptions: [], console: [] };
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      bags.exceptions.push(d?.exception?.description || d?.text || 'exception');
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      bags.console.push(msg.params.args?.map((a) => a.value || a.description).join(' '));
    }
  });
  const send = (method, params = {}, ms = 20000) => {
    const id = ++next;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`cdp timeout ${method}`));
      }, ms);
      pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
    });
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  return { ws, send, bags, close: () => ws.close() };
}

async function waitFor(send, expression, timeout = 20000) {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeout) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) {
      last = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'exception';
    } else if (result.result?.value) return result.result.value;
    await new Promise((r) => setTimeout(r, 80));
  }
  throw new Error(`timeout: ${expression}${last ? `\n${last}` : ''}`);
}

async function shot(send, file) {
  await mkdir('/opt/cursor/artifacts', { recursive: true });
  const shot = await send('Page.captureScreenshot', { format: 'png' }, 30000);
  await writeFile(file, Buffer.from(shot.data, 'base64'));
}

async function evalJson(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || expression);
  return result.result?.value;
}

function quiet(page) {
  const noise = (line) => /favicon|Failed to load resource/i.test(line || '');
  return {
    exceptions: page.bags.exceptions.filter((line) => !noise(line)),
    console: page.bags.console.filter((line) => !noise(line)),
  };
}

const SNAP = `(() => {
  const de = document.documentElement;
  const cite = document.getElementById('cite');
  const level = document.getElementById('level');
  const deep = document.getElementById('deep');
  const xr = document.getElementById('xr');
  const host = document.getElementById('three-host');
  return {
    ready: de.dataset.ready || '',
    phase: de.dataset.phase || '',
    key: de.dataset.key || '',
    view: de.dataset.view || '',
    layout: document.getElementById('stage') ? document.getElementById('stage').dataset.layout || '' : '',
    split: document.getElementById('stage') ? document.getElementById('stage').dataset.split || '' : '',
    gpu: de.dataset.gpu || '',
    level: level ? level.textContent : '',
    cite: cite ? cite.textContent : '',
    // KaTeX textContent is full of newlines. \\s stays a character class inside this template.
    formula: ((document.getElementById('formula') || {}).textContent || '').replace(/\\s+/g, ' ').trim(),
    katex: document.querySelectorAll('#formula .katex').length,
    places: (document.getElementById('places') || {}).textContent || '',
    placesLabel: (document.getElementById('places') || {}).getAttribute?.('aria-label') || '',
    threads: (document.getElementById('threads') || {}).textContent || '',
    flashHref: (document.getElementById('pg-flash-station') || {}).getAttribute?.('href') || '',
    deep: deep ? deep.textContent : '',
    xrHidden: xr ? xr.hidden : true,
    xrText: xr ? xr.textContent : '',
    xr: de.dataset.xr || '',
    flash: de.dataset.flash || '',
    caption: (document.getElementById('caption') || {}).textContent || '',
    canvas: host ? host.querySelectorAll('canvas').length : 0,
    webdriver: navigator.webdriver === true,
  };
})()`;

const BAND = `(() => {
  const stage = document.getElementById('stage').getBoundingClientRect();
  const foot = document.querySelector('.chrome.bottom');
  const fr = foot ? foot.getBoundingClientRect() : { top: 0, height: 0 };
  const solidTop = fr.top + fr.height * 0.55;
  const de = document.documentElement;
  return {
    layout: document.getElementById('stage') ? document.getElementById('stage').dataset.layout || '' : '',
    theme: de.getAttribute('data-theme') || '',
    into: Math.round(stage.bottom - solidTop),
    scroll: de.scrollWidth - de.clientWidth,
    phase: de.dataset.phase || '',
    view: de.dataset.view || '',
    draws: Number(de.dataset.draws || 0),
  };
})()`;

async function xrContract() {
  const missing = await requestImmersive(null, 'vr');
  check('missing xr is a fallback, not a session', missing.ok === false && missing.reason === 'missing');
  const none = await requestImmersive({
    isSessionSupported: async () => false,
    requestSession: async () => { throw new Error('should not request'); },
  }, 'vr');
  check('an unsupported mode never requests a session', none.ok === false && none.reason === 'unsupported');
  let asked = '';
  const rejected = await requestImmersive({
    isSessionSupported: async (mode) => mode === 'immersive-vr',
    requestSession: async (mode) => { asked = mode; throw new Error('no headset'); },
  }, 'vr');
  check('a refused immersive-vr session is rejected', rejected.ok === false && rejected.reason === 'rejected' && asked === 'immersive-vr');
  const sess = new EventTarget();
  const opened = await requestImmersive({
    isSessionSupported: async (mode) => mode === 'immersive-ar' || mode === 'immersive-vr',
    requestSession: async (mode, features) => {
      asked = mode;
      sess.features = features;
      return sess;
    },
  }, 'ar');
  check('immersive-ar is opened when the device allows it',
    opened.ok === true && opened.mode === 'immersive-ar' && asked === 'immersive-ar'
    && opened.session.features.requiredFeatures.includes('hit-test'));
  const got = [];
  bindSelect(opened.session, (point) => { got.push(point); }, [0, 0]);
  opened.session.dispatchEvent(Object.assign(new Event('select'), { point: [0.2, -0.3] }));
  opened.session.dispatchEvent(new Event('select'));
  check('controller or hand select is the touch point, or the centre',
    got.length === 2 && got[0][0] === 0.2 && got[0][1] === -0.3 && got[1][0] === 0 && got[1][1] === 0);
}

function pathClockChecks() {
  const hidden = advancePathTime(0.2, 100, 12000, true);
  check('a hidden loop does not advance', hidden === 0.2, String(hidden));
  const step = advancePathTime(0, 1200, 12000, false);
  check('a visible frame advances the loop', step > 0.05 && step < 0.2, String(step));
  const stalled = advancePathTime(0, 0, 12000, false);
  check('a swallowed frame still steps the loop', stalled > 0 && stalled < 0.01, String(stalled));
  const wrap = advancePathTime(0.99, 500, 1000, false);
  check('the loop wraps past the last sample', wrap >= 0 && wrap < 0.6, String(wrap));
}

const NO_GPU_NULL = `(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    const kind = String(type || '');
    if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl' || kind === 'webgpu') return null;
    return orig.apply(this, arguments);
  };
  try { Object.defineProperty(Navigator.prototype, 'gpu', { configurable: true, get() { return undefined; } }); } catch (e) {}
})();`;

const NO_GPU_THROW = `(() => {
  const gl2 = window.WebGL2RenderingContext && WebGL2RenderingContext.prototype;
  if (gl2) gl2.getShaderPrecisionFormat = function () { throw new Error('precision'); };
  try { Object.defineProperty(Navigator.prototype, 'gpu', { configurable: true, get() { return undefined; } }); } catch (e) {}
})();`;

const INK = `(id) => {
  const c = document.getElementById(id);
  if (!c || c.width < 2 || c.height < 2) return 0;
  const ctx = c.getContext('2d');
  if (!ctx) return 0;
  let n = 0;
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let i = 0; i < data.length; i += 64) {
    if ((data[i] + data[i + 1] + data[i + 2]) > 18 || data[i + 3] > 12) n += 1;
  }
  return n;
}`;

async function cpuStart(page, send, label) {
  await waitFor(send, `document.documentElement.dataset.ready === '1'`);
  const snap = await evalJson(send, `(() => {
    const de = document.documentElement;
    const cap = document.getElementById('caption');
    const lv = document.getElementById('level');
    return {
      ready: de.dataset.ready || '',
      tier: de.dataset.tier || '',
      gpu: de.dataset.gpu || '',
      phase: de.dataset.phase || '',
      caption: cap ? cap.textContent : '',
      level: lv ? lv.textContent : '',
      stars: (${INK})('stars'),
      canvas: de.dataset.canvas || '',
    };
  })()`);
  check(`${label}: the void starts without a GPU`,
    snap.ready === '1' && snap.tier === 'cpu' && snap.gpu === '0' && snap.phase === 'idle'
    && snap.canvas === '1' && snap.stars > 0
    && snap.caption === 'Touch the void. A shape will answer.'
    && /L0/.test(snap.level)
    && !/could not start/i.test(snap.caption),
    JSON.stringify(snap));
  const err = quiet(page);
  check(`${label}: start has no console error`, err.exceptions.length === 0 && err.console.length === 0,
    err.exceptions.concat(err.console).join(' | '));
  return snap;
}

async function main() {
  pathClockChecks();
  await xrContract();
  const { server, port } = await serve();
  const profile = mkdtempSync(join(tmpdir(), 'pg-chrome-'));
  let chrome;
  try {
    const started = await startChrome(profile);
    chrome = started.chrome;
    const base = `http://127.0.0.1:${port}/playground.html?gpu=1`;

    const fresh = await openPage(started.browserWs);
    await fresh.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await fresh.send('Page.navigate', { url: base });
    await waitFor(fresh.send, `document.documentElement.dataset.ready === '1'`);
    await fresh.send('Runtime.evaluate', { expression: `document.getElementById('next').click()` });
    await waitFor(fresh.send, `!!document.documentElement.dataset.key`);
    const begun = await evalJson(fresh.send, SNAP);
    const begunErr = quiet(fresh);
    check('begin rolls an L0 plane and names the next level',
      begun.key.startsWith('julia/plane/') && begun.view === 'plane' && /touch/.test(begun.level) && /next/.test(begun.level),
      JSON.stringify(begun));
    check('begin has no console error', begunErr.exceptions.length === 0 && begunErr.console.length === 0,
      begunErr.exceptions.concat(begunErr.console).join(' | '));
    await fresh.send('Page.navigate', { url: 'about:blank' }).catch(() => {});
    fresh.close();

    const sphere = await openPage(started.browserWs);
    await sphere.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await sphere.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.setItem('pg.learner.v1','pg-smoke-60');localStorage.setItem('pg.state.v1',JSON.stringify({signals:{taps:9,drags:5,traces:3,scrubs:4,verdicts:3,max_zoom:4000,sessions:1},caps:{xr:false,webgl2:true,gpu:1},history:['julia/split-param/smooth/scrub/verdict/c','poly/plane/trap/pinch-zoom/roll/none']}))}catch(e){}`,
    });
    await sphere.send('Page.navigate', { url: base });
    await waitFor(sphere.send, `document.documentElement.dataset.ready === '1'`);
    await sphere.send('Runtime.evaluate', { expression: `document.getElementById('next').click()` });
    try {
      await waitFor(sphere.send, `document.documentElement.dataset.view === 'split-sphere' && document.getElementById('stage').dataset.layout === 'split' && !!(document.getElementById('three-host') && document.getElementById('three-host').querySelector('canvas'))`);
    } catch (err) {
      const snap = await evalJson(sphere.send, SNAP).catch((e) => String(e));
      console.error('sphere dump', JSON.stringify(snap), sphere.bags.exceptions, sphere.bags.console);
      throw err;
    }
    await new Promise((r) => setTimeout(r, 600));
    const lifted = await evalJson(sphere.send, SNAP);
    const liftedErr = quiet(sphere);
    check('a turn-level learner gets the plane beside the sphere',
      lifted.view === 'split-sphere' && lifted.layout === 'split' && lifted.canvas >= 1
      && lifted.cite.includes('2.5.1') && lifted.cite.includes('north pole') && lifted.cite.includes('T1') && lifted.cite.includes('F2'),
      JSON.stringify({ view: lifted.view, layout: lifted.layout, key: lifted.key, canvas: lifted.canvas, cite: lifted.cite, gpu: lifted.gpu }));
    check('the sphere page has no console error', liftedErr.exceptions.length === 0 && liftedErr.console.length === 0,
      liftedErr.exceptions.concat(liftedErr.console).join(' | '));
    for (const theme of ['light', 'dark']) {
      for (let hop = 0; hop < 3; hop++) {
        const cur = await evalJson(sphere.send, `document.documentElement.getAttribute('data-theme') || ''`);
        if (cur === theme) break;
        await sphere.send('Runtime.evaluate', { expression: `document.getElementById('theme-toggle').click()` });
      }
      for (const [w, h] of [[1280, 800], [700, 900], [390, 844]]) {
        sphere.bags.exceptions.length = 0;
        sphere.bags.console.length = 0;
        await sphere.send('Emulation.setDeviceMetricsOverride', {
          width: w, height: h, deviceScaleFactor: 1, mobile: w < 700,
        });
        await new Promise((r) => setTimeout(r, 280));
        const err = quiet(sphere);
        const band = await evalJson(sphere.send, BAND);
        check(`split sphere ${theme} ${w} has no console error`,
          err.exceptions.length === 0 && err.console.length === 0 && band.theme === theme && band.scroll <= 1 && band.layout === 'split' && band.into <= 1,
          err.exceptions.concat(err.console).join(' | ') + ' ' + JSON.stringify(band));
      }
    }
    await sphere.send('Page.navigate', { url: 'about:blank' }).catch(() => {});
    sphere.close();

    const pure = await openPage(started.browserWs);
    await pure.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await pure.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.setItem('pg.learner.v1','pg-smoke-8');localStorage.setItem('pg.state.v1',JSON.stringify({signals:{taps:9,drags:5,traces:3,scrubs:4,verdicts:3,max_zoom:4000,sessions:1},caps:{xr:false,webgl2:true,gpu:1},history:['julia/split-param/smooth/scrub/verdict/c','poly/plane/trap/pinch-zoom/roll/none']}))}catch(e){}`,
    });
    await pure.send('Page.navigate', { url: base });
    await waitFor(pure.send, `document.documentElement.dataset.ready === '1'`);
    await pure.send('Runtime.evaluate', { expression: `document.getElementById('next').click()` });
    await waitFor(pure.send, `document.documentElement.dataset.view === 'sphere' && !!(document.getElementById('three-host') && document.getElementById('three-host').querySelector('canvas'))`);
    const alone = await evalJson(pure.send, SNAP);
    const aloneErr = quiet(pure);
    check('the same level can lift the set onto the sphere alone',
      alone.view === 'sphere' && alone.canvas >= 1 && alone.cite.includes('north pole') && alone.cite.includes('2.5.1'),
      JSON.stringify({ view: alone.view, key: alone.key, canvas: alone.canvas }));
    check('the lone sphere has no console error', aloneErr.exceptions.length === 0 && aloneErr.console.length === 0,
      aloneErr.exceptions.concat(aloneErr.console).join(' | '));
    await pure.send('Page.navigate', { url: 'about:blank' }).catch(() => {});
    pure.close();

    const split = await openPage(started.browserWs);
    await split.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await split.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.setItem('pg.learner.v1','pg-smoke-0');localStorage.setItem('pg.state.v1',JSON.stringify({signals:{taps:4,drags:3,traces:1,sessions:1},caps:{xr:false,webgl2:true,gpu:1},history:['julia/plane/smooth/nudge/roll/none','julia/plane/smooth/nudge/trace/none','julia/plane/escape/nudge/trace/none','julia/plane/smooth/drag-c/trace/none']}))}catch(e){}`,
    });
    await split.send('Page.navigate', { url: base });
    await waitFor(split.send, `document.documentElement.dataset.ready === '1'`);
    await split.send('Runtime.evaluate', { expression: `document.getElementById('next').click()` });
    await waitFor(split.send, `document.documentElement.dataset.view === 'split-param'`);
    const beside = await evalJson(split.send, SNAP);
    const besideErr = quiet(split);
    const besideBand = await evalJson(split.send, BAND);
    check('a walk-level learner gets the parameter plane beside the set',
      beside.view === 'split-param' && beside.split === 'split-param' && beside.layout === 'param' && beside.cite.includes('F2'),
      JSON.stringify({ view: beside.view, split: beside.split, layout: beside.layout, cite: beside.cite, gpu: beside.gpu }));
    check('the parameter split stops above the solid footer', besideBand.into <= 1, JSON.stringify(besideBand));
    check('the split page has no console error', besideErr.exceptions.length === 0 && besideErr.console.length === 0,
      besideErr.exceptions.concat(besideErr.console).join(' | '));
    for (const theme of ['light', 'dark']) {
      for (let hop = 0; hop < 3; hop++) {
        const cur = await evalJson(split.send, `document.documentElement.getAttribute('data-theme') || ''`);
        if (cur === theme) break;
        await split.send('Runtime.evaluate', { expression: `document.getElementById('theme-toggle').click()` });
      }
      for (const [w, h] of [[1280, 800], [700, 900], [390, 844]]) {
        split.bags.exceptions.length = 0;
        split.bags.console.length = 0;
        await split.send('Emulation.setDeviceMetricsOverride', {
          width: w, height: h, deviceScaleFactor: 1, mobile: w < 700,
        });
        await new Promise((r) => setTimeout(r, 280));
        const err = quiet(split);
        const band = await evalJson(split.send, BAND);
        check(`parameter split ${theme} ${w} has no console error`,
          err.exceptions.length === 0 && err.console.length === 0 && band.theme === theme && band.scroll <= 1,
          err.exceptions.concat(err.console).join(' | ') + ' ' + JSON.stringify(band));
        check(`parameter split ${theme} ${w} stays above the solid footer`,
          band.layout === 'param' && band.into <= 1, JSON.stringify(band));
      }
    }
    split.close();

    const xr = await openPage(started.browserWs);
    await xr.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await xr.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        try { localStorage.removeItem('pg.state.v1'); localStorage.removeItem('pg.learner.v1'); } catch (e) {}
        const stub = {
          isSessionSupported: async (mode) => mode === 'immersive-vr',
          requestSession: async () => { throw new DOMException('no headset', 'NotSupportedError'); },
        };
        try { Object.defineProperty(Navigator.prototype, 'xr', { configurable: true, get() { return stub; } }); }
        catch (e) { try { Object.defineProperty(navigator, 'xr', { configurable: true, value: stub }); } catch (e2) {} }
      })();`,
    });
    await xr.send('Page.navigate', { url: base });
    await waitFor(xr.send, `document.documentElement.dataset.ready === '1' && document.getElementById('xr').hidden === false`);
    await xr.send('Runtime.evaluate', { expression: `document.getElementById('xr').click()` });
    await waitFor(xr.send, `document.getElementById('deep').textContent.includes('No headset session')`);
    const refused = await evalJson(xr.send, SNAP);
    await xr.send('Runtime.evaluate', { expression: `document.getElementById('next').click()` });
    await waitFor(xr.send, `!!document.documentElement.dataset.key`);
    const after = await evalJson(xr.send, SNAP);
    const xrErr = quiet(xr);
    const refusedNote = await evalJson(xr.send, `(document.getElementById('xr-note') || {}).textContent || ''`);
    const refusedNoteHidden = await evalJson(xr.send, `!!(document.getElementById('xr-note') && document.getElementById('xr-note').hidden)`);
    check('a refused headset leaves the shape in the void and the diary still rolls',
      refused.deep.includes('No headset session') && refused.deep.includes('stays in the void') && refused.deep.includes('was not used')
      && after.key.startsWith('julia/plane/') && (after.phase === 'roll' || after.phase === 'bake' || after.phase === 'settle' || after.phase === 'idle'),
      JSON.stringify({ deep: refused.deep, key: after.key, phase: after.phase, xr: refused.xrText }));
    const xrProof = await evalJson(xr.send, `document.documentElement.dataset.xrProof || ''`);
    check('the no-headset line stays on the page',
      refusedNote.includes('No headset session') && refusedNote.includes('stays in the void') && refusedNote.includes('was not used') && refusedNoteHidden === false
      && xrProof === 'untried',
      JSON.stringify({ refusedNote, xrProof }));
    check('the WebXR miss has no console error', xrErr.exceptions.length === 0 && xrErr.console.length === 0,
      xrErr.exceptions.concat(xrErr.console).join(' | '));
    xr.close();

    const live = await openPage(started.browserWs);
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        try { localStorage.removeItem('pg.state.v1'); localStorage.removeItem('pg.learner.v1'); } catch (e) {}
        const sess = new EventTarget();
        sess.requestReferenceSpace = async () => ({});
        sess.requestHitTestSource = async () => { throw new Error('no hit'); };
        sess.updateRenderState = () => {};
        sess.requestAnimationFrame = (cb) => { sess._raf = setTimeout(() => cb(performance.now(), null), 32); return 1; };
        sess.cancelAnimationFrame = () => { clearTimeout(sess._raf); };
        sess.end = async () => { sess.dispatchEvent(new Event('end')); };
        globalThis.__xrSession = sess;
        const stub = {
          isSessionSupported: async (mode) => mode === 'immersive-vr' || mode === 'immersive-ar',
          requestSession: async (mode) => { globalThis.__xrMode = mode; return sess; },
        };
        try { Object.defineProperty(Navigator.prototype, 'xr', { configurable: true, get() { return stub; } }); }
        catch (e) { try { Object.defineProperty(navigator, 'xr', { configurable: true, value: stub }); } catch (e2) {} }
      })();`,
    });
    await live.send('Page.navigate', { url: base });
    await waitFor(live.send, `document.documentElement.dataset.ready === '1' && document.getElementById('xr').hidden === false`);
    await live.send('Runtime.evaluate', { expression: `document.getElementById('xr').click()` });
    await waitFor(live.send, `document.documentElement.dataset.xr === 'immersive-ar' || document.documentElement.dataset.xr === 'immersive-vr'`);
    const entered = await evalJson(live.send, SNAP);
    const voidNote = await evalJson(live.send, `(document.getElementById('xr-note') || {}).textContent || ''`);
    const voidView = await evalJson(live.send, `document.documentElement.dataset.xrView || ''`);
    check('a session with no picture says so on the page',
      voidView === 'void' && voidNote.includes('No headset picture')
      && voidNote.includes('stays in the void') && voidNote.includes('writes the shape'),
      JSON.stringify({ voidView, voidNote, deep: entered.deep }));
    await live.send('Runtime.evaluate', {
      expression: `globalThis.__xrSession.dispatchEvent(Object.assign(new Event('select'), { point: [0.2, -0.3] }))`,
    });
    await waitFor(live.send, `!!document.documentElement.dataset.flash`, 15000);
    const writing = await evalJson(live.send, SNAP);
    check('a session with no headset still opens, and select flashes the shape for that point',
      (entered.xr === 'immersive-ar' || entered.xr === 'immersive-vr')
      && writing.flash === 'julia' && writing.cite.includes('Chapter 4') && writing.deep.includes('writes the shape')
      && writing.caption.includes('Julia') && writing.caption.includes('0.2')
      && writing.flashHref.includes('#julia') && writing.katex >= 1,
      JSON.stringify({ xr: entered.xr, flash: writing.flash, deep: writing.deep, cite: writing.cite, caption: writing.caption, href: writing.flashHref }));
    await waitFor(live.send, `!document.documentElement.dataset.flash && document.documentElement.dataset.phase === 'idle'`, 20000);
    const faded = await evalJson(live.send, SNAP);
    const liveErr = quiet(live);
    check('the flash fades back to the stars and the name stays',
      !faded.flash && faded.phase === 'idle' && /answered/.test(faded.caption || '')
      && /Julia/.test(faded.caption || '') && faded.flashHref.includes('#julia'),
      JSON.stringify(faded));
    const hold0 = await evalJson(live.send, `Number(document.documentElement.dataset.draws || 0)`);
    await new Promise((r) => setTimeout(r, 600));
    const hold1 = await evalJson(live.send, `Number(document.documentElement.dataset.draws || 0)`);
    const holdPhase = await evalJson(live.send, `document.documentElement.dataset.phase || ''`);
    check('one clock: after a flash, idle draws nothing',
      hold1 === hold0 && holdPhase === 'idle',
      JSON.stringify({ hold0, hold1, holdPhase }));
    check('the headset-free session has no console error', liveErr.exceptions.length === 0 && liveErr.console.length === 0,
      liveErr.exceptions.concat(liveErr.console).join(' | '));
    const chordal = {
      v: 'pg/1', key: 'julia/split-chordal/smooth/nudge/roll/none', level: 6, seed: 3,
      map: { kind: 'julia', c: [-0.75, 0], d: 2 },
      view: { kind: 'split-chordal', window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll',
      path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(chordal)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'split-chordal' && document.getElementById('stage').dataset.layout === 'split'`, 20000);
    const chord = await evalJson(live.send, SNAP);
    const chordErr = quiet(live);
    check('the chordal split sits beside the plane and cites the sphere',
      chord.view === 'split-chordal' && chord.layout === 'split' && chord.canvas >= 1
      && chord.cite.includes('Figure 2.5.2') && chord.cite.includes('chordal distance')
      && chord.cite.includes('No exercise') && chord.cite.includes('Exercise 14')
      && chord.cite.includes('north pole') && chord.cite.includes('finite')
      && chord.cite.includes('orange corners')
      && chord.cite.includes('T1') && chord.cite.includes('F2')
      && /L6/.test(chord.level) && /metric/.test(chord.level)
      && /L6/.test(chord.placesLabel)
      && chord.places.includes('Story Map') && chord.places.includes('1/z and the Sphere')
      && chord.threads.includes('T1') && chord.threads.includes('T2') && chord.threads.includes('T3')
      && chord.katex >= 2,
      JSON.stringify({ view: chord.view, layout: chord.layout, canvas: chord.canvas, cite: chord.cite, level: chord.level, places: chord.places, threads: chord.threads, katex: chord.katex, caption: chord.caption }));
    check('the chordal split has no console error', chordErr.exceptions.length === 0 && chordErr.console.length === 0,
      chordErr.exceptions.concat(chordErr.console).join(' | '));
    const inkCount = `(() => {
      const c = document.getElementById('fractal');
      if (!c || c.width < 2) return 0;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 64) if (d[i] > 12) n++;
      return n;
    })()`;
    const slice = {
      v: 'pg/1', key: 'julia/slice/smooth/nudge/roll/none', level: 7, seed: 1,
      map: { kind: 'julia', c: [-0.75, 0], d: 2 },
      view: { kind: 'slice', theta: 0.5, window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll',
      path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(slice)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'slice' && document.documentElement.dataset.phase === 'idle'`, 20000);
    const sliceSnap = await evalJson(live.send, SNAP);
    const sliceInk = await evalJson(live.send, inkCount);
    const sliceErr = quiet(live);
    check('the slice plane cites both ends and names the orbit of 0',
      sliceSnap.view === 'slice' && sliceSnap.layout === 'inset' && sliceInk > 8
      && sliceSnap.cite.includes('Figure 4.2.13') && sliceSnap.cite.includes('Exercise 4')
      && sliceSnap.cite.includes('not in the book') && sliceSnap.cite.includes('F2')
      && /L7/.test(sliceSnap.level) && /family/.test(sliceSnap.level)
      && sliceSnap.places.includes('Story Map') && sliceSnap.places.includes('The Orbit of 0')
      && sliceSnap.places.includes('When c Is 0, a Disk')
      && sliceSnap.places.includes('The 4D Graph of w = f(z)')
      && sliceSnap.cite.includes('with the mappings')
      && sliceSnap.cite.includes('It is not Chapter 4')
      && sliceSnap.places.includes('Slide, Spin, Stretch, Mirror')
      && sliceSnap.cite.includes('not in the book') && sliceSnap.cite.includes('different four numbers')
      && sliceSnap.cite.includes('Test 2 map')
      && sliceSnap.threads.includes('T1') && sliceSnap.threads.includes('T2')
      && sliceSnap.threads.includes('T3') && sliceSnap.threads.includes('F2')
      && sliceSnap.katex >= 2,
      JSON.stringify({ view: sliceSnap.view, layout: sliceSnap.layout, ink: sliceInk, cite: sliceSnap.cite, level: sliceSnap.level, places: sliceSnap.places, threads: sliceSnap.threads, katex: sliceSnap.katex }));
    const sliceEdge = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      return { overlap: Math.round(stage.bottom - foot.getBoundingClientRect().top), cover: foot.dataset.cover || '' };
    })()`);
    check('the slice stage ends at the footer, not under the fade',
      sliceEdge.overlap <= 2 && sliceEdge.cover === 'solid', JSON.stringify(sliceEdge));
    check('the slice has no console error', sliceErr.exceptions.length === 0 && sliceErr.console.length === 0,
      sliceErr.exceptions.concat(sliceErr.console).join(' | '));
    const beforeSlices = await evalJson(live.send, `JSON.parse(localStorage.getItem('pg.state.v1') || '{}').signals.slices || 0`);
    await live.send('Runtime.evaluate', { expression: `(() => {
      const range = document.querySelector('input[data-slice]');
      range.value = '1';
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('stage').focus();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }));
    })()` });
    await waitFor(live.send, `document.getElementById('badge').textContent.includes('between') || document.getElementById('badge').textContent.includes('Julia')`, 8000);
    const turned = await evalJson(live.send, `(() => {
      const s = JSON.parse(localStorage.getItem('pg.state.v1') || '{}');
      return { slices: (s.signals && s.signals.slices) || 0, badge: document.getElementById('badge').textContent, theta: document.querySelector('input[data-slice]').value };
    })()`);
    check('the slider and Shift+Left turn the plane and count the turn',
      turned.slices >= beforeSlices + 2 && /between/.test(turned.badge) && Number(turned.theta) < 1 && Number(turned.theta) > 0.9,
      JSON.stringify({ beforeSlices, turned }));
    const sliderBox = await evalJson(live.send, `(() => {
      const range = document.querySelector('input[data-slice]');
      const r = range.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, h: window.innerHeight, label: (range.parentElement.querySelector('.slider-name') || {}).textContent || '' };
    })()`);
    check('the angle slider is on screen',
      sliderBox.top >= 0 && sliderBox.bottom <= sliderBox.h && /Angle/.test(sliderBox.label),
      JSON.stringify(sliderBox));
    await live.send('Runtime.evaluate', { expression: `(() => {
      const range = document.querySelector('input[data-slice]');
      range.focus();
      range.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }));
    })()` });
    const focused = await evalJson(live.send, `(() => {
      const range = document.querySelector('input[data-slice]');
      return { value: range.value, active: document.activeElement === range, text: range.getAttribute('aria-valuetext') || '' };
    })()`);
    check('Shift+Left still turns the plane while the slider is focused',
      Number(focused.value) < Number(turned.theta) && /degrees/.test(focused.text),
      JSON.stringify({ turned: turned.theta, focused }));
    const splitSlice = {
      v: 'pg/1', key: 'poly/split-slice/escape/nudge/roll/none', level: 7, seed: 7,
      map: { kind: 'poly', c: [0.2, 0.1], d: 3 },
      view: { kind: 'split-slice', theta: 0, window: { cx: 0, cy: 0, span: 3 } },
      colour: 'escape', gesture: 'nudge', reveal: 'roll',
      path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(splitSlice)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'split-slice' && document.documentElement.dataset.phase === 'idle'`, 20000);
    const splitSnap = await evalJson(live.send, SNAP);
    const splitInk = await evalJson(live.send, inkCount);
    const splitBadge = await evalJson(live.send, `document.getElementById('badge').textContent`);
    check('the slice card sits beside the picture',
      splitSnap.view === 'split-slice' && splitSnap.layout === 'split' && splitSnap.split === 'split-slice'
      && splitInk > 8 && splitSnap.cite.includes('One touch drives both panes')
      && /set of c/.test(splitBadge)
      && splitSnap.cite.includes('does not drop one coordinate')
      && splitSnap.cite.includes('schematic of the angle'),
      JSON.stringify({ view: splitSnap.view, layout: splitSnap.layout, split: splitSnap.split, ink: splitInk, badge: splitBadge, cite: splitSnap.cite }));
    const cardDrag = {
      v: 'pg/1', key: 'julia/split-slice/smooth/drag-c/roll/none', level: 7, seed: 3,
      map: { kind: 'julia', c: [-0.75, 0], d: 2 },
      view: { kind: 'split-slice', theta: 0.2, window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'drag-c', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(cardDrag)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'split-slice' && document.documentElement.dataset.phase === 'idle'`, 20000);
    const cardTurn = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage');
      const r = stage.getBoundingClientRect();
      const x = r.left + r.width * 0.75;
      const y = r.top + r.height * 0.45;
      const before = JSON.parse(localStorage.getItem('pg.state.v1') || '{}').signals.slices || 0;
      const c0 = document.getElementById('formula').textContent;
      stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 7 }));
      stage.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x + 140, clientY: y, pointerId: 7 }));
      stage.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x + 140, clientY: y, pointerId: 7 }));
      const s = JSON.parse(localStorage.getItem('pg.state.v1') || '{}');
      return {
        before, slices: (s.signals && s.signals.slices) || 0,
        theta: document.querySelector('input[data-slice]').value,
        cSame: document.getElementById('formula').textContent === c0,
      };
    })()`);
    check('dragging the card turns the plane and leaves c alone',
      cardTurn.slices >= cardTurn.before + 1 && Number(cardTurn.theta) > 0.2 && cardTurn.cSame,
      JSON.stringify(cardTurn));
    const bend = {
      v: 'pg/1', key: 'julia/bend/smooth/nudge/roll/none', level: 8, seed: 2,
      map: { kind: 'julia', c: [-0.75, 0], d: 2 },
      view: { kind: 'bend', window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll',
      path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(bend)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'bend' && document.documentElement.dataset.phase === 'idle'`, 20000);
    const bendSnap = await evalJson(live.send, SNAP);
    const bendInk = await evalJson(live.send, inkCount);
    const bendErr = quiet(live);
    check('the bend shows the angle excess on the book sphere',
      bendSnap.view === 'bend' && bendSnap.layout === 'split' && bendInk > 8
      && bendSnap.cite.includes('Figure 2.5.2') && bendSnap.cite.includes('Exercise 14')
      && bendSnap.cite.includes('Exercise 2') && bendSnap.cite.includes('Chapter 9')
      && bendSnap.cite.includes('No exercise') && bendSnap.cite.includes('4 times the area')
      && bendSnap.cite.includes('course map stops before Chapter 9')
      && bendSnap.cite.includes('same sphere as the chordal distance')
      && bendSnap.cite.includes('Test 1 is Chapters 1 to 3')
      && bendSnap.cite.includes('Test 2 is Chapter 4')
      && bendSnap.cite.includes('No exercise numbers that scale')
      && bendSnap.cite.includes('not a corner')
      && bendSnap.cite.includes('triangle does not use it')
      && bendSnap.cite.includes('not the curvature colour')
      && /L8/.test(bendSnap.level) && /bend/.test(bendSnap.level)
      && bendSnap.places.includes('Story Map') && bendSnap.places.includes('1/z and the Sphere')
      && bendSnap.places.includes('The Derivative Is a Move')
      && !bendSnap.places.includes('Slide, Spin')
      && !bendSnap.places.includes('The 4D Graph')
      && bendSnap.threads.includes('T1') && bendSnap.threads.includes('T3')
      && !bendSnap.threads.includes('T2') && !bendSnap.threads.includes('F2')
      && bendSnap.katex >= 2
      && !bendSnap.formula.includes('|z-c|')
      && /Excess/.test((await evalJson(live.send, `document.getElementById('badge').textContent`))),
      JSON.stringify({ view: bendSnap.view, layout: bendSnap.layout, ink: bendInk, cite: bendSnap.cite, level: bendSnap.level, threads: bendSnap.threads, katex: bendSnap.katex }));
    const bendEdge = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      return { overlap: Math.round(stage.bottom - fr.top), cover: foot.dataset.cover || '', scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    })()`);
    check('the bend stage ends at the footer, not under the fade',
      bendEdge.overlap <= 2 && bendEdge.cover === 'solid' && bendEdge.scroll <= 1,
      JSON.stringify(bendEdge));
    check('the bend has no console error', bendErr.exceptions.length === 0 && bendErr.console.length === 0,
      bendErr.exceptions.concat(bendErr.console).join(' | '));
    await live.send('Runtime.evaluate', { expression: `(() => {
      document.getElementById('stage').focus();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    })()` });
    const nudged = await evalJson(live.send, `document.getElementById('badge').textContent`);
    check('keys pick a corner and Shift moves it, and the ratio stays 4',
      /Excess over area is 4/.test(nudged), nudged);
    const beforeArrow = await evalJson(live.send, `(() => ({
      formula: document.getElementById('formula').textContent,
      badge: document.getElementById('badge').textContent,
      hint: document.querySelector('#controls .hint') ? document.querySelector('#controls .hint').textContent : '',
    }))()`);
    await live.send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))` });
    const afterArrow = await evalJson(live.send, `(() => ({
      formula: document.getElementById('formula').textContent,
      badge: document.getElementById('badge').textContent,
    }))()`);
    check('an arrow on the bend moves the corner and leaves c',
      beforeArrow.formula === afterArrow.formula
      && beforeArrow.badge !== afterArrow.badge
      && /leave c where it is/.test(beforeArrow.hint)
      && /Excess over area is 4/.test(afterArrow.badge),
      JSON.stringify({ before: beforeArrow, after: afterArrow }));
    const excess = {
      v: 'pg/1', key: 'julia/excess/smooth/nudge/roll/none', level: 8, seed: 1,
      map: { kind: 'julia', c: [0, 0], d: 2 },
      view: { kind: 'excess', window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll',
      path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(excess)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'excess' && document.documentElement.dataset.phase === 'idle'`, 20000);
    const excessSnap = await evalJson(live.send, SNAP);
    const excessInk = await evalJson(live.send, inkCount);
    check('the lone sphere still shows the same excess',
      excessSnap.view === 'excess' && excessSnap.layout === 'three' && excessInk > 8
      && excessSnap.cite.includes('Chapter 9'),
      JSON.stringify({ view: excessSnap.view, layout: excessSnap.layout, ink: excessInk }));
    const bendLoop = {
      v: 'pg/1', key: 'julia/bend/smooth/scrub/verdict/c', level: 8, seed: 4,
      map: { kind: 'julia', c: [0.7885, 0], d: 2 },
      view: { kind: 'bend', window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'scrub', reveal: 'verdict',
      path: { of: 'c', preset: 'circle', period_s: 12 },
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(bendLoop)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'bend' && (document.documentElement.dataset.phase === 'play' || document.documentElement.dataset.phase === 'idle')`, 20000);
    const loopHint = await evalJson(live.send, `(document.querySelector('#controls .hint') || {}).textContent || ''`);
    const beforeLoop = await evalJson(live.send, `(() => {
      const c = document.getElementById('fractal');
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let h = 2166136261;
      for (let i = 0; i < data.length; i += 97) h = Math.imul(h ^ data[i], 16777619) >>> 0;
      return { h, formula: document.getElementById('formula').textContent };
    })()`);
    await live.send('Runtime.evaluate', { expression: `(() => {
      const range = document.querySelector('input[data-scrub]');
      range.value = '0.5';
      range.dispatchEvent(new Event('input', { bubbles: true }));
    })()` });
    await new Promise((r) => setTimeout(r, 700));
    const afterLoop = await evalJson(live.send, `(() => {
      const c = document.getElementById('fractal');
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let h = 2166136261;
      for (let i = 0; i < data.length; i += 97) h = Math.imul(h ^ data[i], 16777619) >>> 0;
      return { h, formula: document.getElementById('formula').textContent };
    })()`);
    check('a c-path on the bend updates the formula and leaves the picture',
      beforeLoop.h === afterLoop.h && beforeLoop.formula !== afterLoop.formula
      && /leave c where it is/.test(loopHint)
      && /does not move a letter/.test(loopHint)
      && /triangle does not follow it/.test(loopHint),
      JSON.stringify({ before: beforeLoop, after: afterLoop, hint: loopHint }));
    const unity = {
      v: 'pg/1', key: 'newton/unity/basin/nudge/roll/none', level: 9, seed: 5,
      map: { kind: 'newton', c: [1, 0], d: 3 },
      view: { kind: 'unity', window: { cx: 0, cy: 0, span: 3 } },
      colour: 'basin', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: null, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(unity)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'unity' && document.documentElement.dataset.phase === 'idle'`, 20000);
    const unitySnap = await evalJson(live.send, SNAP);
    const unityInk = await evalJson(live.send, inkCount);
    const unityBadge = await evalJson(live.send, `document.getElementById('badge').textContent`);
    check('the roots picture cites the book and opens the Story Map',
      unitySnap.view === 'unity' && unitySnap.layout === 'inset' && unityInk > 8
      && unitySnap.cite.includes('Equation 1.5.5') && unitySnap.cite.includes('Figures 4.2.5')
      && unitySnap.cite.includes('No exercise numbers the coloured basins')
      && unitySnap.cite.includes('No exercise numbers a higher power')
      && unitySnap.threads.includes('T1') && unitySnap.threads.includes('T2')
      && unitySnap.threads.includes('T3') && unitySnap.threads.includes('F3')
      && !unitySnap.threads.includes('F2')
      && unitySnap.cite.includes('Test 1 is Chapters 1 to 3')
      && unitySnap.cite.includes('Test 2 is Chapter 4')
      && unitySnap.places.includes('Story Map') && unitySnap.places.includes('Newton Fractals')
      && unitySnap.places.includes('Roots: Divide the Staircase')
      && unitySnap.places.includes('Powers') && unitySnap.places.includes('Derivative')
      && !unitySnap.places.includes('1/z') && !unitySnap.places.includes('Mandelbrot')
      && /L9/.test(unitySnap.level) && /roots/.test(unitySnap.level)
      && /Degree 3/.test(unityBadge)
      && unitySnap.caption.includes('Which root does Newton find?')
      && !unitySnap.caption.includes('Which c keep')
      && unitySnap.formula.includes('Which root does Newton find?')
      && !unitySnap.formula.includes('Which c keep')
      && unitySnap.formula.includes('z_{n}^{3}-1')
      && !unitySnap.formula.includes('begin{aligned}')
      && unitySnap.cite.includes('A stripe is one root')
      && !unitySnap.cite.includes('extra root'),
      JSON.stringify({ view: unitySnap.view, layout: unitySnap.layout, ink: unityInk, level: unitySnap.level, cite: unitySnap.cite, threads: unitySnap.threads, places: unitySnap.places, badge: unityBadge, caption: unitySnap.caption, formula: unitySnap.formula }));
    await live.send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))` });
    const named = await evalJson(live.send, `(() => ({
      badge: document.getElementById('badge').textContent,
      flash: document.documentElement.dataset.flash || '',
    }))()`);
    check('Enter on the basins names the root and does not flash',
      named.flash === '' && /does not land/.test(named.badge),
      JSON.stringify(named));
    const degreePad = await evalJson(live.send, `(() => {
      const buttons = [...document.querySelectorAll('[data-act="lower"], [data-act="higher"]')].map((b) => b.textContent + (b.disabled ? ':off' : ':on'));
      const tex = (document.querySelector('#formula annotation') || {}).textContent || '';
      const hint = (document.querySelector('#controls .hint') || {}).textContent || '';
      return { buttons: buttons.join(','), tex, hint };
    })()`);
    check('the degree pad steps, and the Newton step is z_n',
      degreePad.buttons === 'Lower:off,Higher:on'
      && degreePad.tex.includes('z_{n}^{3}-1')
      && degreePad.tex.includes('z_{n}^{2}')
      && !degreePad.tex.includes('z^{3}')
      && !/gesture is a nudge/.test(degreePad.hint)
      && /Arrow keys, or \+ and −, step the degree/.test(degreePad.hint),
      JSON.stringify(degreePad));
    await live.send('Runtime.evaluate', { expression: `(() => {
      const range = document.querySelector('input[data-degree]');
      range.value = '5';
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    })()` });
    await waitFor(live.send, `document.getElementById('badge').textContent.includes('Degree 5')`, 8000);
    const deg5 = await evalJson(live.send, `document.getElementById('badge').textContent`);
    const deg5cap = await evalJson(live.send, `document.getElementById('caption').textContent`);
    check('the degree slider changes the basins',
      /Degree 5/.test(deg5) && /stripe of orange and purple/.test(deg5) && /one root in two inks/.test(deg5)
      && /A stripe is one root, painted in two inks/.test(deg5cap)
      && !/extra root/.test(deg5),
      JSON.stringify({ badge: deg5, caption: deg5cap }));
    const splitUnity = {
      v: 'pg/1', key: 'newton/split-unity/basin/nudge/roll/none', level: 9, seed: 6,
      map: { kind: 'newton', c: [0.3, -0.4], d: 4 },
      view: { kind: 'split-unity', window: { cx: 0, cy: 0, span: 3 } },
      colour: 'basin', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: null, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 128, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(splitUnity)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'split-unity' && document.documentElement.dataset.phase === 'idle'`, 25000);
    const splitU = await evalJson(live.send, SNAP);
    const splitUnityBadge = await evalJson(live.send, `document.getElementById('badge').textContent`);
    const splitBox = await evalJson(live.send, `(() => {
      const s = document.getElementById('stage').getBoundingClientRect();
      const f = document.getElementById('fractal').getBoundingClientRect();
      const footEl = document.querySelector('.chrome.bottom');
      const foot = footEl.getBoundingClientRect();
      return {
        dw: Math.abs(s.width - f.width),
        overlap: Math.round(s.bottom - foot.top),
        cover: footEl.dataset.cover || '',
        hint: (document.querySelector('#controls .hint') || {}).textContent || '',
      };
    })()`);
    check('the split puts the higher power beside the basins',
      splitU.view === 'split-unity' && splitU.layout === 'split'
      && splitU.cite.includes('Figure 4.2.13') && splitU.cite.includes('other pane')
      && !splitU.cite.includes('One touch drives both panes')
      && splitU.places.includes('Roots: Divide the Staircase')
      && splitU.places.includes('The Mandelbrot Set') && splitU.places.includes('Julia')
      && splitU.threads.includes('F3') && splitU.threads.includes('F2')
      && splitU.cite.includes('window follows')
      && !splitU.places.includes('Cardioid') && !splitU.places.includes('1/z')
      && /Degree 4/.test(splitUnityBadge) && /other pane/.test(splitUnityBadge)
      && /stripe of blue and orange/.test(splitUnityBadge)
      && /one root in two inks/.test(splitUnityBadge)
      && /window follows/.test(splitUnityBadge)
      && splitU.caption.includes('Which root does Newton find?')
      && splitU.caption.includes('Which c keep the walk from 0 bounded?')
      && splitU.caption.includes('A stripe is one root, painted in two inks.')
      && splitU.formula.includes('Which root does Newton find?')
      && splitU.formula.includes('Which c keep the walk from 0 bounded?')
      && splitU.formula.includes('z_{0}=0')
      && !splitU.formula.includes('begin{aligned}')
      && splitU.cite.includes('A stripe is one root')
      && splitU.cite.includes('second map')
      && !splitU.cite.includes('extra root')
      && splitBox.dw < 2 && splitBox.overlap <= 0 && splitBox.cover === 'solid'
      && /right pane/.test(splitBox.hint) && /window follows/.test(splitBox.hint)
      && !/gesture is a nudge/.test(splitBox.hint),
      JSON.stringify({ view: splitU.view, layout: splitU.layout, cite: splitU.cite, badge: splitUnityBadge, box: splitBox, caption: splitU.caption, formula: splitU.formula }));
    const firstScreen = `(() => {
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const place = (el) => {
        if (!el) return { top: -1, bottom: -1, full: false };
        const r = el.getBoundingClientRect();
        return {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          full: r.top >= fr.top - 1 && r.bottom <= vis + 1,
          starts: r.top >= fr.top - 1 && r.top <= vis - 12,
        };
      };
      const cap = document.getElementById('caption').getBoundingClientRect();
      const th = document.getElementById('threads');
      const tr = th ? th.getBoundingClientRect() : null;
      const citeEl = document.getElementById('cite');
      return {
        h: window.innerHeight,
        capTop: Math.round(cap.top),
        capBottom: Math.round(cap.bottom),
        capSeen: cap.top >= 0 && cap.bottom <= window.innerHeight,
        asks: [...document.querySelectorAll('#formula .ask-q')].map((el) => Object.assign({ text: el.textContent }, place(el))),
        badge: place(document.getElementById('badge')),
        cite: place(citeEl),
        citeLead: citeEl ? citeEl.textContent.slice(0, 56) : '',
        threads: place(th),
        threadsView: tr && !th.hidden ? {
          top: Math.round(tr.top),
          bottom: Math.round(tr.bottom),
          h: Math.round(tr.height),
          full: tr.top >= 0 && tr.bottom <= window.innerHeight + 1 && tr.height > 8 && tr.height < 72,
        } : { top: -1, bottom: -1, h: 0, full: false },
        vis: Math.round(vis),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`;
    const wideScreen = await evalJson(live.send, firstScreen);
    const unityBake = await evalJson(live.send, `document.documentElement.dataset.bake || ''`);
    check('the roots picture bakes on the GPU when WebGL is present',
      unityBake === 'gpu',
      unityBake);
    check('the two questions sit on the wide first screen',
      wideScreen.capSeen && wideScreen.scroll <= 1
      && wideScreen.asks.length === 2 && wideScreen.asks.every((q) => q.full)
      && wideScreen.cite.starts
      && wideScreen.citeLead.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && wideScreen.threadsView.full,
      JSON.stringify(wideScreen));
    await shot(live.send, '/opt/cursor/artifacts/l9-badges-1280.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await waitFor(live.send, `(() => {
      const s = document.getElementById('stage').getBoundingClientRect();
      const f = document.getElementById('fractal').getBoundingClientRect();
      const hint = (document.querySelector('#controls .hint') || {}).textContent || '';
      return Math.abs(s.width - f.width) < 2 && f.width > 300 && /lower pane/.test(hint);
    })()`, 15000);
    const phoneSplit = await evalJson(live.send, `(() => {
      const s = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom').getBoundingClientRect();
      return {
        overlap: Math.round(s.bottom - foot.top),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        hint: (document.querySelector('#controls .hint') || {}).textContent || '',
      };
    })()`);
    const phoneScreen = await evalJson(live.send, firstScreen);
    const phoneReach = await evalJson(live.send, `(() => {
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const stage = document.getElementById('stage').getBoundingClientRect();
      const head = document.querySelector('.chrome.top').getBoundingClientRect();
      const buttons = [...document.querySelectorAll('[data-act="lower"], [data-act="higher"]')].map((b) => {
        const r = b.getBoundingClientRect();
        return r.top >= fr.top - 1 && r.bottom <= vis + 1 && r.left >= -1 && r.right <= window.innerWidth + 1;
      });
      const th = document.getElementById('threads');
      const threadChips = [...document.querySelectorAll('#threads a')].map((a) => {
        const r = a.getBoundingClientRect();
        return {
          id: a.dataset.thread,
          text: a.textContent,
          label: a.getAttribute('aria-label') || '',
          in: r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1,
        };
      });
      const cite = document.getElementById('cite');
      const range = document.createRange();
      range.setStart(cite.firstChild, 0);
      let line = '';
      let lo = 1;
      let hi = Math.min(cite.firstChild.textContent.length, 80);
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        range.setEnd(cite.firstChild, mid);
        if (range.getClientRects().length <= 1) { line = cite.firstChild.textContent.slice(0, mid); lo = mid + 1; }
        else hi = mid - 1;
      }
      range.setEnd(cite.firstChild, line.length);
      const lr = range.getBoundingClientRect();
      return {
        stageH: Math.round(stage.height),
        headH: Math.round(head.height),
        buttons,
        line,
        lineBottom: Math.round(lr.bottom),
        lineIn: lr.top >= fr.top - 1 && lr.bottom <= vis + 1 && lr.left >= 0 && lr.right <= window.innerWidth + 1,
        threadChips,
        threadOverflow: th ? th.scrollWidth - th.clientWidth : 99,
      };
    })()`);
    check('a phone stacks the set of c under the basins',
      phoneSplit.overlap <= 0 && phoneSplit.scroll <= 1 && /lower pane/.test(phoneSplit.hint)
      && phoneScreen.capSeen && phoneScreen.asks.length === 2 && phoneScreen.asks.every((q) => q.full)
      && phoneScreen.cite.starts
      && phoneScreen.citeLead.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && phoneScreen.threadsView.full
      && phoneReach.stageH >= 160
      && phoneReach.buttons.length === 2 && phoneReach.buttons.every(Boolean)
      && phoneReach.lineIn
      && phoneReach.line.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && phoneReach.threadChips.length === 5
      && phoneReach.threadChips.every((c) => c.in && c.text === c.id && c.label.startsWith(c.id + ' ·'))
      && phoneReach.threadOverflow <= 1,
      JSON.stringify({ phoneSplit, phoneScreen, phoneReach }));
    await shot(live.send, '/opt/cursor/artifacts/l9-badges-390.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    const diary = {
      v: 'pg/1', key: 'julia/diary/smooth/pinch-zoom/roll/none', level: 10, seed: 4,
      map: { kind: 'julia', c: [0.26, 0], d: 2 },
      view: { kind: 'diary', window: { cx: -0.6, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'pinch-zoom', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(diary)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'diary' && document.documentElement.dataset.phase === 'idle'`, 20000);
    const diarySnap = await evalJson(live.send, SNAP);
    const diaryBadge = await evalJson(live.send, `document.getElementById('badge').textContent`);
    const diaryBake = await evalJson(live.send, `document.documentElement.dataset.bake || ''`);
    const diaryScreen = await evalJson(live.send, firstScreen);
    const diaryNote = await evalJson(live.send, `document.getElementById('xr-note').textContent`);
    check('the diary shows the cusp and cites the set of c',
      diarySnap.view === 'diary' && diarySnap.layout === 'inset'
      && diaryBake === 'gpu'
      && /Outside/.test(diaryBadge) && /dust/.test(diaryBadge) && /Leaves/.test(diaryBadge)
      && /Exercise 8/.test(diaryBadge) && /real start/.test(diaryBadge)
      && diarySnap.cite.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && diarySnap.cite.includes('Theorem 4.2.11') && diarySnap.cite.includes('Figure 4.2.13')
      && diarySnap.cite.includes('does not number')
      && diarySnap.threads.includes('T1') && diarySnap.threads.includes('T2')
      && diarySnap.threads.includes('F1') && !diarySnap.threads.includes('F2')
      && !diarySnap.threads.includes('T3') && !diarySnap.threads.includes('F3')
      && !diarySnap.cite.includes('F2')
      && /writes dust/.test(diaryBadge) && !/is dust/.test(diaryBadge)
      && diarySnap.formula.includes('Which c keep the walk from 0 bounded?')
      && diarySnap.formula.includes('What Julia set does this c write back?')
      && diarySnap.places.includes('Story Map') && diarySnap.places.includes('Julia')
      && diarySnap.places.includes('Mandelbrot') && diarySnap.places.includes('Orbit of 0')
      && diarySnap.places.includes('Powers') && diarySnap.places.includes('Disk')
      && !diarySnap.places.includes('Newton')
      && /L10/.test(diarySnap.level) && /diary/.test(diarySnap.level)
      && diaryScreen.threadsView.full && diaryScreen.capSeen && diaryScreen.scroll <= 1
      && diaryScreen.asks.length === 2 && diaryScreen.asks.every((q) => q.full)
      && /stays in the void/.test(diaryNote),
      JSON.stringify({ view: diarySnap.view, bake: diaryBake, badge: diaryBadge, cite: diarySnap.cite, threads: diarySnap.threads, screen: diaryScreen, note: diaryNote, formula: diarySnap.formula }));
    await shot(live.send, '/opt/cursor/artifacts/l10-diary-1280.png');
    await live.send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))` });
    await waitFor(live.send, `(() => {
      const de = document.documentElement;
      if (de.dataset.flash !== 'julia') return false;
      const phase = de.dataset.phase || '';
      const tr = document.getElementById('stage').style.transform || '';
      const m = /scale\\(([\\d.]+)\\)/.exec(tr);
      const scale = m ? Number(m[1]) : 0;
      if (phase !== 'settle' && !(phase === 'roll' && scale >= 0.99)) return false;
      const c = document.getElementById('fractal');
      if (!c || c.width < 2) return false;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0, op = 0;
      for (let i = 3; i < d.length; i += 64) { n++; if (d[i] > 12) op++; }
      return n > 0 && op / n > 0.2;
    })()`, 15000);
    const flashed = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const head = document.querySelector('.chrome.top').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom').getBoundingClientRect();
      return {
        flash: document.documentElement.dataset.flash || '',
        from: document.documentElement.dataset.flashFrom || '',
        cite: (document.getElementById('cite') || {}).textContent || '',
        threads: (document.getElementById('threads') || {}).textContent || '',
        note: (document.getElementById('xr-note') || {}).textContent || '',
        overlap: Math.round(stage.bottom - foot.top),
        gapTop: Math.round(stage.top - head.bottom),
        stageH: Math.round(stage.height),
      };
    })()`);
    const flashInk = await evalJson(live.send, inkCount);
    check('Enter on the diary writes that c’s Julia set back',
      flashed.flash === 'julia' && flashed.from === 'diary'
      && flashed.cite.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && flashed.cite.includes('Theorem 4.2.11')
      && flashed.threads.includes('F1') && !flashed.threads.includes('F2')
      && /stays in the void/.test(flashed.note)
      && flashed.overlap <= 1 && flashed.gapTop >= -1 && flashed.stageH >= 120
      && flashInk > 8,
      JSON.stringify({ flashed, flashInk }));
    await shot(live.send, '/opt/cursor/artifacts/l10-diary-flash.png');
    await live.send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'diary' && !document.documentElement.dataset.flash`, 8000);
    const splitDiary = {
      v: 'pg/1', key: 'julia/split-diary/smooth/pinch-zoom/roll/none', level: 10, seed: 5,
      map: { kind: 'julia', c: [0, 0], d: 2 },
      view: { kind: 'split-diary', window: { cx: -0.6, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'pinch-zoom', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(splitDiary)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'split-diary' && document.documentElement.dataset.phase === 'idle' && /lower pane/.test((document.querySelector('#controls .hint') || {}).textContent || '')`, 25000);
    const phoneDiary = await evalJson(live.send, firstScreen);
    const phoneDiaryBadge = await evalJson(live.send, `document.getElementById('badge').textContent`);
    const phoneDiaryThreads = await evalJson(live.send, `(document.getElementById('threads') || {}).textContent || ''`);
    const phoneDiaryCite = await evalJson(live.send, `(document.getElementById('cite') || {}).textContent || ''`);
    const phoneDiaryBox = await evalJson(live.send, `(() => {
      const s = document.getElementById('stage').getBoundingClientRect();
      const f = document.getElementById('fractal').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom').getBoundingClientRect();
      return {
        dw: Math.abs(s.width - f.width),
        overlap: Math.round(s.bottom - foot.top),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);
    const phoneDiaryStage = await evalJson(live.send, `Math.round(document.getElementById('stage').getBoundingClientRect().height)`);
    check('a phone stacks the Julia set under the index',
      phoneDiary.threadsView.full && phoneDiary.capSeen && phoneDiary.scroll <= 1
      && phoneDiary.asks.length === 2 && phoneDiary.asks.every((q) => q.full)
      && phoneDiary.citeLead.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && /Inside/.test(phoneDiaryBadge) && /Exercise 8/.test(phoneDiaryBadge)
      && /one piece/.test(phoneDiaryBadge)
      && phoneDiaryThreads.includes('F1') && phoneDiaryThreads.includes('F2')
      && !phoneDiaryThreads.includes('F3')
      && phoneDiaryCite.includes('F2') && phoneDiaryCite.includes('square, then slide')
      && phoneDiaryBox.dw < 2 && phoneDiaryBox.overlap <= 0 && phoneDiaryBox.scroll <= 1
      && phoneDiaryStage >= 160,
      JSON.stringify({ phoneDiary, phoneDiaryBadge, phoneDiaryThreads, phoneDiaryBox, phoneDiaryStage }));
    await shot(live.send, '/opt/cursor/artifacts/l10-diary-390.png');
    const twins = {
      v: 'pg/1', key: 'julia/twins/smooth/pinch-zoom/roll/none', level: 11, seed: 7,
      map: { kind: 'julia', c: [-0.743643887037151, 0.13182590420533], d: 2 },
      view: {
        kind: 'twins',
        window: { cx: -0.743643887037151, cy: 0.13182590420533, span: 0.045 },
        julia: { cx: 0, cy: 0, span: 2.6 },
      },
      colour: 'smooth', gesture: 'pinch-zoom', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    const bulbs = {
      v: 'pg/1', key: 'julia/bulbs/smooth/nudge/roll/none', level: 12, seed: 8,
      map: { kind: 'julia', c: [-0.1225611668766537, 0.7448617666197442], d: 2 },
      view: {
        kind: 'bulbs',
        window: { cx: -0.6, cy: 0, span: 3.2 },
        julia: { cx: 0, cy: 0, span: 2.6 },
      },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(twins)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'twins' && document.documentElement.dataset.phase === 'idle'`, 25000);
    const twinSnap = await evalJson(live.send, SNAP);
    const twinBadge = await evalJson(live.send, `document.getElementById('badge').textContent`);
    const twinBake = await evalJson(live.send, `document.documentElement.dataset.bake || ''`);
    const twinActs = await evalJson(live.send, `[...document.querySelectorAll('.twin-acts button')].map((b) => b.textContent).join(' ')`);
    const twinHint = await evalJson(live.send, `(document.querySelector('#controls .hint') || {}).textContent || ''`);
    const twinReach = `(() => {
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const place = (el) => {
        if (!el) return { full: false, top: -1, bottom: -1 };
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), full: r.height > 20 && r.top >= fr.top - 1 && r.bottom <= vis + 1 };
      };
      const buttons = [...document.querySelectorAll('.twin-acts button')].map((b) => ({ text: b.textContent, pressed: b.getAttribute('aria-pressed'), ...place(b) }));
      const cite = document.getElementById('cite').getBoundingClientRect();
      const stage = document.getElementById('stage').getBoundingClientRect();
      return {
        buttons,
        citeStarts: cite.top >= fr.top - 1 && cite.top <= vis - 12,
        stageH: Math.round(stage.height),
        overlap: Math.round(stage.bottom - fr.top),
      };
    })()`;
    const twinGlass = await evalJson(live.send, twinReach);
    const twinDoors = await evalJson(live.send, `(() => ({
      mandel: (document.getElementById('pg-link-mandelbrot') || {}).title || '',
      julia: (document.getElementById('pg-link-julia') || {}).title || '',
      hints: [...document.querySelectorAll('#controls .hint')].map((p) => p.textContent),
    }))()`);
    check('the twin sets the neighborhood beside the Julia set',
      twinSnap.view === 'twins' && twinSnap.layout === 'split'
      && twinBake === 'gpu'
      && /neighborhood of this c resembles/.test(twinSnap.caption)
      && !/Twins in the deep/.test(twinSnap.caption)
      && !/write back/.test(twinSnap.caption)
      && twinSnap.formula.includes('What Julia set sits beside this c?')
      && !twinSnap.formula.includes('write back')
      && /resembles/.test(twinBadge) && /Theorem 4.2.11/.test(twinBadge) && /Exercise 10/.test(twinBadge)
      && /does not number this resemblance/.test(twinBadge)
      && !/small copy/.test(twinBadge)
      && twinSnap.cite.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && twinSnap.cite.includes('does not number this resemblance')
      && !/small copy/.test(twinSnap.cite)
      && !/index that writes/.test(twinSnap.cite)
      && twinSnap.threads.includes('T1') && twinSnap.threads.includes('T2')
      && twinSnap.threads.includes('F1') && twinSnap.threads.includes('F2')
      && !twinSnap.threads.includes('F3') && !twinSnap.threads.includes('T3')
      && twinSnap.places.includes('Story Map') && twinSnap.places.includes('Powers')
      && twinSnap.places.includes('Julia') && twinSnap.places.includes('Mandelbrot')
      && twinSnap.places.includes('Orbit of 0') && twinSnap.places.includes('Disk')
      && !twinSnap.places.includes('Newton')
      && /neighborhood is one place/.test(twinDoors.mandel)
      && !/index/.test(twinDoors.mandel)
      && /beside this neighborhood/.test(twinDoors.julia)
      && twinActs.includes('The twin') && twinActs.includes('The copy')
      && /Julia set follows/.test(twinHint)
      && twinDoors.hints.length === 1
      && /Julia set follows/.test(twinDoors.hints[0])
      && /period-3 antenna/.test(twinDoors.hints[0])
      && !/small copy/.test(twinDoors.hints[0])
      && twinGlass.buttons.length === 2 && twinGlass.buttons.every((b) => b.full)
      && twinGlass.buttons.some((b) => b.text === 'The twin' && b.pressed === 'true')
      && twinGlass.citeStarts && twinGlass.overlap <= 1 && twinGlass.stageH >= 160,
      JSON.stringify({ view: twinSnap.view, bake: twinBake, badge: twinBadge, caption: twinSnap.caption, cite: twinSnap.cite, formula: twinSnap.formula, threads: twinSnap.threads, acts: twinActs, hint: twinHint, doors: twinDoors, glass: twinGlass }));
    const beforeStay = await evalJson(live.send, `(document.getElementById('formula') || {}).textContent || ''`);
    await live.send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))` });
    await new Promise((r) => setTimeout(r, 400));
    await live.send('Runtime.evaluate', { expression: `(() => {
      const stage = document.getElementById('stage');
      const r = stage.getBoundingClientRect();
      const x = r.left + r.width * 0.25;
      const y = r.top + r.height * 0.5;
      const opts = { bubbles: true, clientX: x, clientY: y, pointerId: 11, pointerType: 'mouse' };
      stage.dispatchEvent(new PointerEvent('pointerdown', opts));
      stage.dispatchEvent(new PointerEvent('pointerup', { ...opts }));
    })()` });
    await new Promise((r) => setTimeout(r, 500));
    const stayed = await evalJson(live.send, `(() => ({
      flash: document.documentElement.dataset.flash || '',
      from: document.documentElement.dataset.flashFrom || '',
      phase: document.documentElement.dataset.phase || '',
      view: document.documentElement.dataset.view || '',
      formula: (document.getElementById('formula') || {}).textContent || '',
      caption: (document.getElementById('caption') || {}).textContent || '',
      hint: (document.querySelector('#controls .hint') || {}).textContent || '',
    }))()`);
    const besideAt = stayed.formula.indexOf('What Julia set sits beside this c?');
    const boundedAt = stayed.formula.indexOf('Which c keep the walk from 0 bounded?');
    check('a tap or Enter on the twins stays with the neighborhood beside the Julia set',
      stayed.flash === '' && stayed.from === '' && stayed.phase === 'idle' && stayed.view === 'twins'
      && besideAt >= 0 && boundedAt > besideAt
      && !/write back/.test(stayed.formula)
      && /neighborhood of this c resembles/.test(stayed.caption)
      && !/writes back/.test(stayed.caption)
      && stayed.formula === beforeStay
      && /already beside this neighborhood/.test(stayed.hint)
      && /writes a set back/.test(stayed.hint)
      && !/writes the marked c back/.test(stayed.hint),
      JSON.stringify({ stayed, besideAt, boundedAt }));
    await shot(live.send, '/opt/cursor/artifacts/l11-twins-1280.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="copy"]').click()` });
    await waitFor(live.send, `/antenna/.test(document.getElementById('badge').textContent || '')`, 20000);
    const copyBadge = await evalJson(live.send, `document.getElementById('badge').textContent`);
    check('the copy chip moves to the period-3 antenna', /antenna/.test(copyBadge) && /Exercise 10/.test(copyBadge), copyBadge);
    await shot(live.send, '/opt/cursor/artifacts/l11-twins-copy.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'twins' && /The right pane/.test((document.querySelector('#controls .hint') || {}).textContent || '')`, 20000);
    const phoneTwin = await evalJson(live.send, firstScreen);
    const phoneTwinThreads = await evalJson(live.send, `(document.getElementById('threads') || {}).textContent || ''`);
    const phoneTwinBox = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const head = document.querySelector('.chrome.top').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom').getBoundingClientRect();
      const cap = document.getElementById('caption').getBoundingClientRect();
      const th = document.getElementById('threads').getBoundingClientRect();
      return {
        stageH: Math.round(stage.height),
        headH: Math.round(head.height),
        footH: Math.round(foot.height),
        capH: Math.round(cap.height),
        threadH: Math.round(th.height),
        footTop: Math.round(foot.top),
        headBottom: Math.round(head.bottom),
      };
    })()`);
    const phoneTwinStage = phoneTwinBox.stageH;
    console.log('mid phone box', JSON.stringify(phoneTwinBox));
    const phoneTwinGlass = await evalJson(live.send, twinReach);
    const phoneTwinHint = await evalJson(live.send, `(document.querySelector('#controls .hint') || {}).textContent || ''`);
    const phoneTwinReach = await evalJson(live.send, `(() => {
      const hitOf = (el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { owns: !!(hit && (hit === el || el.contains(hit))), h: Math.round(r.height), pe: getComputedStyle(el).pointerEvents };
      };
      return {
        threads: [...document.querySelectorAll('#threads a')].map(hitOf),
        actions: [...document.querySelectorAll('.top-actions a, .top-actions button')].filter((el) => !el.hidden && getComputedStyle(el).display !== 'none').map((el) => ({ text: el.textContent, ...hitOf(el) })),
      };
    })()`);
    check('phone thread badges and header actions take the tap',
      phoneTwinReach.threads.length === 4 && phoneTwinReach.threads.every((t) => t.owns && t.pe === 'auto' && t.h >= 44)
      && phoneTwinReach.actions.length >= 3 && phoneTwinReach.actions.every((a) => a.owns && a.h >= 44 && a.h <= 48),
      JSON.stringify(phoneTwinReach));
    check('a phone keeps the twin panes side by side, with the chips and the chapter sentence on the glass',
      phoneTwin.threadsView.full && phoneTwin.capSeen && phoneTwin.scroll <= 1
      && phoneTwin.citeLead.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && phoneTwin.cite.starts
      && phoneTwinThreads.includes('F2') && phoneTwinThreads.includes('T1')
      && !phoneTwinThreads.includes('Square')
      && /The right pane/.test(phoneTwinHint) && !/lower pane/.test(phoneTwinHint)
      && phoneTwinStage >= 260
      && phoneTwinGlass.buttons.length === 2 && phoneTwinGlass.buttons.every((b) => b.full)
      && phoneTwinGlass.buttons.some((b) => b.text === 'The copy' && b.pressed === 'true')
      && phoneTwinGlass.citeStarts && phoneTwinGlass.overlap <= 1,
      JSON.stringify({ phoneTwin, phoneTwinThreads, phoneTwinStage, phoneTwinHint, glass: phoneTwinGlass, box: phoneTwinBox }));
    await shot(live.send, '/opt/cursor/artifacts/l11-twins-390.png');
    const pinched = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage');
      const r = stage.getBoundingClientRect();
      const x = r.left + r.width * 0.25;
      const y = r.top + r.height * 0.5;
      for (let i = 0; i < 12; i++) {
        stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -80, clientX: x, clientY: y, bubbles: true, cancelable: true }));
      }
      const juliaX = r.left + r.width * 0.75;
      stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -80, clientX: juliaX, clientY: y, bubbles: true, cancelable: true }));
      return {
        badge: document.getElementById('badge').textContent || '',
        cite: (document.getElementById('cite') || {}).textContent || '',
      };
    })()`);
    check('a pinch on the antenna names the small copy, and the Julia pane stays its own window',
      /small copy/.test(pinched.badge) && /not the copy/.test(pinched.badge) && /Exercise 10/.test(pinched.badge)
      && /does not number this copy/.test(pinched.badge)
      && /small copy/.test(pinched.cite) && /does not number the copy/.test(pinched.cite)
      && /not the copy/.test(pinched.cite),
      JSON.stringify(pinched));
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 500));
    const twin700 = await evalJson(live.send, `(() => {
      const glass = ${twinReach};
      const th = document.getElementById('threads');
      const row = th.getBoundingClientRect();
      const chips = [...th.querySelectorAll('a')].map((a) => {
        const r = a.getBoundingClientRect();
        return {
          text: a.textContent,
          top: Math.round(r.top),
          in: r.right <= row.right + 1 && r.bottom <= row.bottom + 1,
        };
      });
      return {
        glass,
        chips,
        rows: new Set(chips.map((c) => c.top)).size,
        overflow: th.scrollWidth - th.clientWidth,
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);
    console.log('mid twins 700', JSON.stringify(twin700));
    console.log('mid stages', JSON.stringify({ wide: twinGlass.stageH, phone: phoneTwinStage }));
    check('at 700 the twin chips stay on the glass',
      twin700.glass.buttons.length === 2 && twin700.glass.buttons.every((b) => b.full)
      && twin700.glass.citeStarts && twin700.glass.overlap <= 1 && twin700.glass.stageH >= 160
      && twin700.chips.length === 4 && twin700.chips.every((c) => c.in && c.text.includes('·'))
      && twin700.overflow <= 1 && twin700.scroll <= 1,
      JSON.stringify(twin700));
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(bulbs)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'bulbs' && document.documentElement.dataset.phase === 'idle' && /Period 3/.test(document.getElementById('badge').textContent || '')`, 25000);
    const bulbPhone = await evalJson(live.send, `(() => {
      const badge = document.getElementById('badge').textContent || '';
      const cite = (document.getElementById('cite') || {}).textContent || '';
      const formula = (document.getElementById('formula') || {}).textContent || '';
      const hint = (document.querySelector('#controls .hint') || {}).textContent || '';
      const caption = (document.getElementById('caption') || {}).textContent || '';
      const threads = (document.getElementById('threads') || {}).textContent || '';
      const acts = [...document.querySelectorAll('.bulb-acts button')].map((b) => ({ text: b.textContent, name: b.getAttribute('aria-label') || '', pressed: b.getAttribute('aria-pressed') }));
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const citeBox = document.getElementById('cite').getBoundingClientRect();
      const chips = [...document.querySelectorAll('.bulb-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, h: Math.round(r.height), full: r.top >= fr.top - 1 && r.bottom <= vis + 1 };
      });
      const title = (id) => (document.getElementById(id) || {}).title || '';
      return {
        badge, cite, formula, hint, caption, threads, acts, chips,
        doors: { card: title('pg-link-bulbs'), zero: title('pg-link-zero'), julia: title('pg-link-julia'), disk: title('pg-link-disk') },
        places: (document.getElementById('places') || {}).textContent || '',
        flash: document.documentElement.dataset.flash || '',
        bake: document.documentElement.dataset.bake || '',
        stageH: Math.round(stage.height),
        headH: Math.round(document.querySelector('.chrome.top').getBoundingClientRect().height),
        footH: Math.round(fr.height),
        citeStarts: citeBox.top >= fr.top - 1 && citeBox.top <= vis - 12,
        overlap: Math.round(stage.bottom - fr.top),
        periodAt: formula.indexOf('What period is this bulb?'),
        boundedAt: formula.indexOf('Which c keep the walk from 0 bounded?'),
        sideBySide: document.getElementById('stage').dataset.layout === 'split',
      };
    })()`);
    const bulbInkLive = await evalJson(live.send, `(${INK})('fractal')`);
    check('bulbs opens on period 3, and a phone keeps the chapter sentence with the chips',
      /Period 3/.test(bulbPhone.badge) && /Theorem 4.2.20/.test(bulbPhone.badge) && /Figure 4.2.13/.test(bulbPhone.badge)
      && /orbit of 0/.test(bulbPhone.caption) && !/write back/.test(bulbPhone.caption) && !/Touch a bulb/.test(bulbPhone.caption)
      && bulbPhone.cite.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && /Theorem 4.2.20/.test(bulbPhone.cite) && /Definitions 4.2.17/.test(bulbPhone.cite)
      && /Figure 4.2.13/.test(bulbPhone.cite)
      && /Exercise 10/.test(bulbPhone.cite) && /does not number that ordering/.test(bulbPhone.cite)
      && /does not number that cascade/.test(bulbPhone.cite)
      && bulbPhone.periodAt >= 0 && bulbPhone.boundedAt > bulbPhone.periodAt
      && bulbPhone.formula.includes('z_{0}=0')
      && bulbPhone.acts.length === 3
      && bulbPhone.acts.some((b) => b.text === 'Period 1' && b.name === 'Period 1, c = 0')
      && bulbPhone.acts.some((b) => b.text === 'Period 2' && b.name === 'Period 2, c = −1')
      && bulbPhone.acts.some((b) => b.text === 'Period 3' && b.pressed === 'true')
      && bulbPhone.chips.length === 3 && bulbPhone.chips.every((b) => b.full && b.h >= 44)
      && /The right pane/.test(bulbPhone.hint) && /writes a set back/.test(bulbPhone.hint)
      && !/does not write the diary/.test(bulbPhone.hint)
      && bulbPhone.flash === ''
      && bulbPhone.threads.includes('T1') && bulbPhone.threads.includes('T2')
      && bulbPhone.threads.includes('F1') && bulbPhone.threads.includes('F2')
      && !bulbPhone.threads.includes('T3') && !bulbPhone.threads.includes('F3')
      && !bulbPhone.threads.includes('Square')
      && bulbPhone.places.includes('Story Map') && bulbPhone.places.includes('The Cardioid and the Period')
      && bulbPhone.places.includes('The Orbit of 0') && !bulbPhone.places.includes('Newton')
      && /Theorem 4.2.20/.test(bulbPhone.doors.card) && /orbit of 0/.test(bulbPhone.doors.card)
      && /cycle it falls into/.test(bulbPhone.doors.zero)
      && /cycle of this c/.test(bulbPhone.doors.julia)
      && /Period 1/.test(bulbPhone.doors.disk)
      && bulbInkLive > 0 && bulbPhone.citeStarts && bulbPhone.overlap <= 1 && bulbPhone.stageH >= 260
      && bulbPhone.sideBySide,
      JSON.stringify({ bulbPhone, bulbInkLive }));
    console.log('mid bulbs phone', JSON.stringify({ stageH: bulbPhone.stageH, headH: bulbPhone.headH, footH: bulbPhone.footH, citeStarts: bulbPhone.citeStarts }));
    await shot(live.send, '/opt/cursor/artifacts/l12-bulbs-390.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'bulbs' && /Square, then slide/.test((document.getElementById('threads') || {}).textContent || '')`, 20000);
    const bulbWide = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const head = document.querySelector('.chrome.top').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const cite = document.getElementById('cite').getBoundingClientRect();
      const threads = [...document.querySelectorAll('#threads a')].map((a) => a.textContent);
      return {
        stageH: Math.round(stage.height),
        headH: Math.round(head.height),
        footH: Math.round(fr.height),
        citeStarts: cite.top >= fr.top - 1 && cite.top <= vis - 12,
        overlap: Math.round(stage.bottom - fr.top),
        threads,
        layout: document.getElementById('stage').dataset.layout || '',
      };
    })()`);
    console.log('mid bulbs 1280', JSON.stringify(bulbWide));
    check('at 1280 the bulb threads are full names and the chapter sentence starts on the glass',
      bulbWide.layout === 'split' && bulbWide.overlap <= 1 && bulbWide.citeStarts
      && bulbWide.stageH >= 200
      && bulbWide.threads.length === 4
      && bulbWide.threads.every((t) => t.includes('·'))
      && bulbWide.threads.some((t) => t.startsWith('F2')),
      JSON.stringify(bulbWide));
    await shot(live.send, '/opt/cursor/artifacts/l12-bulbs-1280.png');
    const juliaHash = `(() => {
      const c = document.getElementById('fractal');
      const ctx = c.getContext('2d');
      const x0 = Math.round(c.width * 0.62);
      const x1 = Math.round(c.width * 0.92);
      const y0 = Math.round(c.height * 0.28);
      const y1 = Math.round(c.height * 0.82);
      const data = ctx.getImageData(x0, y0, Math.max(2, x1 - x0), Math.max(2, y1 - y0)).data;
      let h = 2166136261;
      for (let i = 0; i < data.length; i += 13) h = Math.imul(h ^ data[i], 16777619);
      return h >>> 0;
    })`;
    const juliaBefore = await evalJson(live.send, `(() => ({
      hash: ${juliaHash}(),
      iter: window.__pg.iter, juliaIter: window.__pg.juliaIter, juliaSpan: window.__pg.juliaSpan,
    }))()`);
    await live.send('Runtime.evaluate', { expression: `(() => {
      const stage = document.getElementById('stage');
      const r = stage.getBoundingClientRect();
      const x = r.left + r.width * 0.25;
      const y = r.top + r.height * 0.45;
      for (let i = 0; i < 8; i++) {
        stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -90, clientX: x, clientY: y, bubbles: true, cancelable: true }));
      }
    })()` });
    await waitFor(live.send, `document.documentElement.dataset.phase === 'idle'`, 20000);
    await new Promise((r) => setTimeout(r, 400));
    const juliaAfter = await evalJson(live.send, `(() => ({
      hash: ${juliaHash}(),
      iter: window.__pg.iter, juliaIter: window.__pg.juliaIter, juliaSpan: window.__pg.juliaSpan,
    }))()`);
    check('a pinch of the set of c does not retint the Julia pane',
      juliaAfter.juliaSpan === 2.6 && juliaBefore.juliaSpan === 2.6
      && juliaAfter.juliaIter === juliaBefore.juliaIter
      && juliaAfter.hash === juliaBefore.hash
      && juliaAfter.iter >= juliaBefore.iter,
      JSON.stringify({ juliaBefore, juliaAfter }));
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="p2"]').click()` });
    await waitFor(live.send, `/Period 2/.test(document.getElementById('badge').textContent || '') && !document.documentElement.dataset.flash`, 20000);
    await live.send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))` });
    await new Promise((r) => setTimeout(r, 300));
    const bulbStay = await evalJson(live.send, `(() => ({
      flash: document.documentElement.dataset.flash || '',
      view: document.documentElement.dataset.view || '',
      badge: document.getElementById('badge').textContent || '',
    }))()`);
    check('a period chip changes the cycle, and Enter does not flash the diary',
      bulbStay.flash === '' && bulbStay.view === 'bulbs' && /Period 2/.test(bulbStay.badge),
      JSON.stringify(bulbStay));
    const cascade = {
      v: 'pg/1', key: 'julia/cascade/escape/scrub/verdict/z0', level: 13, seed: 13,
      map: { kind: 'julia', c: [-1, 0], d: 2 },
      view: { kind: 'cascade', window: { cx: -0.875, cy: 0, span: 2.25 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'escape', gesture: 'scrub', reveal: 'verdict', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(cascade)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'cascade' && document.documentElement.dataset.phase === 'idle' && /Period 2/.test(document.getElementById('badge').textContent || '')`, 25000);
    const cascadePhone = await evalJson(live.send, `(() => {
      const badge = document.getElementById('badge').textContent || '';
      const cite = (document.getElementById('cite') || {}).textContent || '';
      const hint = (document.querySelector('#controls .hint') || {}).textContent || '';
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const citeBox = document.getElementById('cite').getBoundingClientRect();
      const chipRow = document.querySelector('.cascade-acts');
      const chips = [...document.querySelectorAll('.cascade-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return {
          text: b.textContent,
          h: Math.round(r.height),
          pressed: b.getAttribute('aria-pressed'),
          full: r.top >= fr.top - 1 && r.bottom <= vis + 1,
          inView: r.left >= -1 && r.right <= window.innerWidth + 1,
        };
      });
      const actions = [...document.querySelectorAll('.top-actions :is(a, button)')].filter((el) => !el.hidden && getComputedStyle(el).display !== 'none').map((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { text: (el.textContent || '').trim(), h: Math.round(r.height), owns: !!(hit && (hit === el || el.contains(hit))), right: Math.round(r.right) };
      });
      const places = (document.getElementById('places') || {}).textContent || '';
      const link = document.querySelector('#badge a');
      const formula = (document.getElementById('formula') || {}).textContent || '';
      const asks = [...document.querySelectorAll('#formula .ask-q')].map((el) => el.textContent);
      const cap = document.getElementById('caption');
      const capH = cap.getBoundingClientRect().height;
      const capLh = parseFloat(getComputedStyle(cap).lineHeight) || 1;
      return {
        badge, cite, hint, chips, actions, places, formula, asks,
        badgeHref: link ? link.getAttribute('href') : '',
        badgeLink: link ? link.textContent : '',
        caption: cap.textContent || '',
        capLines: Math.round(capH / capLh),
        headH: Math.round(document.querySelector('.chrome.top').getBoundingClientRect().height),
        rowScroll: chipRow ? chipRow.scrollWidth - chipRow.clientWidth : 99,
        side: document.getElementById('stage').dataset.layout || '',
        split: document.getElementById('stage').dataset.split || '',
        stageH: Math.round(stage.height),
        citeStarts: citeBox.top >= fr.top - 1 && citeBox.top <= vis - 12,
        overlap: Math.round(stage.bottom - fr.top),
        juliaSpan: window.__pg.juliaSpan,
        xr: (document.getElementById('xr-note') || {}).textContent || '',
      };
    })()`);
    console.log('mid cascade 390', JSON.stringify(cascadePhone));
    check('at 390 the cascade stays side by side, period 2, and the chapter sentence starts on the glass',
      cascadePhone.side === 'split' && cascadePhone.split === 'cascade'
      && cascadePhone.stageH >= 300 && cascadePhone.overlap <= 1 && cascadePhone.citeStarts
      && cascadePhone.cite.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && /Period 2/.test(cascadePhone.badge) && /not a fixed point/.test(cascadePhone.badge)
      && /light in turn/.test(cascadePhone.badge) && /Walk left/.test(cascadePhone.badge)
      && cascadePhone.asks.length === 1
      && /orbit of 0 as real c walks/.test(cascadePhone.asks[0] || '')
      && !/Which c keep/.test(cascadePhone.formula)
      && /Here real c walks/.test(cascadePhone.cite)
      && cascadePhone.badgeHref === 'index.html#bulbs'
      && cascadePhone.badgeLink === 'The Cardioid and the Period'
      && /real orbit of 0 splits/.test(cascadePhone.caption)
      && /does not number that cascade/.test(cascadePhone.cite)
      && /The right pane/.test(cascadePhone.hint) && /Pinch does not zoom/.test(cascadePhone.hint)
      && !/Tap the void/.test(cascadePhone.hint) && !/lower pane/.test(cascadePhone.hint)
      && cascadePhone.rowScroll <= 1
      && cascadePhone.chips.length === 4 && cascadePhone.chips.every((b) => b.full && b.inView && b.h >= 44 && b.h <= 46)
      && cascadePhone.actions.length >= 3 && cascadePhone.actions.every((a) => a.owns && a.h >= 44 && a.h <= 48 && a.right <= 390)
      && cascadePhone.chips.some((b) => b.text === 'Period 2' && b.pressed === 'true')
      && cascadePhone.juliaSpan === 2.6
      && cascadePhone.xr.includes('stays in the void') && cascadePhone.xr.includes('was not used')
      && cascadePhone.places.includes('Story Map') && cascadePhone.places.includes('Cardioid'),
      JSON.stringify(cascadePhone));
    await shot(live.send, '/opt/cursor/artifacts/l13-cascade-390.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="cas4"]').click()` });
    await waitFor(live.send, `/Period 4/.test(document.getElementById('badge').textContent || '')`, 15000);
    const cascadeFour = await evalJson(live.send, `(() => ({
      badge: document.getElementById('badge').textContent || '',
      juliaSpan: window.__pg.juliaSpan,
      flash: document.documentElement.dataset.flash || '',
    }))()`);
    check('the period-4 chip lights a period-4 cycle and leaves the Julia window alone',
      /Period 4/.test(cascadeFour.badge) && /does not number that cascade/.test(cascadeFour.badge)
      && cascadeFour.juliaSpan === 2.6 && cascadeFour.flash === '',
      JSON.stringify(cascadeFour));
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'cascade' && document.documentElement.dataset.phase === 'idle'`, 15000);
    const cascadeWide = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const cite = document.getElementById('cite').getBoundingClientRect();
      const cap = document.getElementById('caption');
      const capLh = parseFloat(getComputedStyle(cap).lineHeight) || 1;
      return {
        stageH: Math.round(stage.height),
        headH: Math.round(document.querySelector('.chrome.top').getBoundingClientRect().height),
        capLines: Math.round(cap.getBoundingClientRect().height / capLh),
        layout: document.getElementById('stage').dataset.layout || '',
        citeStarts: cite.top >= fr.top - 1 && cite.top <= vis - 12,
        overlap: Math.round(stage.bottom - fr.top),
        juliaSpan: window.__pg.juliaSpan,
        badge: document.getElementById('badge').textContent || '',
        badgeHref: (document.querySelector('#badge a') || {}).getAttribute ? (document.querySelector('#badge a').getAttribute('href') || '') : '',
      };
    })()`);
    check('at 1280 the cascade is a split and the chapter sentence starts on the glass',
      cascadeWide.layout === 'split' && cascadeWide.stageH >= 270 && cascadeWide.capLines === 1
      && cascadeWide.headH <= 170 && cascadeWide.overlap <= 1
      && cascadeWide.citeStarts && cascadeWide.juliaSpan === 2.6 && /Period 4/.test(cascadeWide.badge)
      && /does not number that cascade/.test(cascadeWide.badge)
      && cascadeWide.badgeHref === 'index.html#bulbs',
      JSON.stringify(cascadeWide));
    await shot(live.send, '/opt/cursor/artifacts/l13-cascade-1280.png');
    const hinge = {
      v: 'pg/1', key: 'julia/cascade/escape/scrub/verdict/z0', level: 13, seed: 13,
      map: { kind: 'julia', c: [-0.75, 0], d: 2 },
      view: { kind: 'cascade', window: { cx: -0.875, cy: 0, span: 2.25 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'escape', gesture: 'scrub', reveal: 'verdict', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(hinge)})` });
    await waitFor(live.send, `/Parabolic hinge/.test(document.getElementById('badge').textContent || '') && /one place becomes two/.test(document.getElementById('badge').textContent || '')`, 25000);
    const hingeSnap = await evalJson(live.send, `(() => ({
      badge: document.getElementById('badge').textContent || '',
      href: (document.querySelector('#badge a') || {}).getAttribute ? document.querySelector('#badge a').getAttribute('href') : '',
      flash: document.documentElement.dataset.flash || '',
    }))()`);
    check('the hinge at c = −0.75 is where one place becomes two, and the place holds',
      /Parabolic hinge/.test(hingeSnap.badge) && /one place becomes two/.test(hingeSnap.badge)
      && /holds still/.test(hingeSnap.badge) && /Period 1/.test(hingeSnap.badge)
      && !/Settles/.test(hingeSnap.badge)
      && hingeSnap.href === 'index.html#bulbs' && hingeSnap.flash === '',
      JSON.stringify(hingeSnap));
    const pile = {
      v: 'pg/1', key: 'julia/cascade/escape/scrub/verdict/z0', level: 13, seed: 13,
      map: { kind: 'julia', c: [-1.4011551890920506, 0], d: 2 },
      view: { kind: 'cascade', window: { cx: -0.875, cy: 0, span: 2.25 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'escape', gesture: 'scrub', reveal: 'verdict', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(pile)})` });
    await waitFor(live.send, `/piled up/.test(document.getElementById('badge').textContent || '')`, 25000);
    const pileSnap = await evalJson(live.send, `(() => ({
      badge: document.getElementById('badge').textContent || '',
      flash: document.documentElement.dataset.flash || '',
    }))()`);
    check('the pile-up is the bands running together, and the book does not number the point',
      /piled up/.test(pileSnap.badge) && /no places light/.test(pileSnap.badge)
      && /does not number this point/.test(pileSnap.badge)
      && !/settled/.test(pileSnap.badge) && pileSnap.flash === '',
      JSON.stringify(pileSnap));
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 700, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(splitUnity)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'split-unity' && document.documentElement.dataset.phase === 'idle'`, 25000);
    const tabletThreads = await evalJson(live.send, `(() => {
      const th = document.getElementById('threads');
      const row = th.getBoundingClientRect();
      const chips = [...th.querySelectorAll('a')].map((a) => {
        const r = a.getBoundingClientRect();
        return {
          text: a.textContent,
          label: a.getAttribute('aria-label') || '',
          top: Math.round(r.top),
          in: r.left >= row.left - 1 && r.right <= row.right + 1 && r.bottom <= row.bottom + 1,
        };
      });
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom').getBoundingClientRect();
      return {
        chips,
        overflow: th.scrollWidth - th.clientWidth,
        rows: new Set(chips.map((c) => c.top)).size,
        stageH: Math.round(stage.height),
        overlap: Math.round(stage.bottom - foot.top),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);
    console.log('mid 700 badges', JSON.stringify(tabletThreads));
    check('at 700 the five full labels wrap onto the glass',
      tabletThreads.chips.length === 5
      && tabletThreads.chips.every((c) => c.text === c.label && c.label.includes('·') && c.in)
      && tabletThreads.overflow <= 1
      && tabletThreads.rows >= 2
      && tabletThreads.stageH >= 160
      && tabletThreads.overlap <= 1
      && tabletThreads.scroll <= 1,
      JSON.stringify(tabletThreads));
    await shot(live.send, '/opt/cursor/artifacts/mid-badges-700.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(chordal)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'split-chordal' && document.getElementById('stage').dataset.layout === 'split'`, 20000);
    for (const theme of ['light', 'dark']) {
      for (let hop = 0; hop < 3; hop++) {
        const cur = await evalJson(live.send, `document.documentElement.getAttribute('data-theme') || ''`);
        if (cur === theme) break;
        await live.send('Runtime.evaluate', { expression: `document.getElementById('theme-toggle').click()` });
      }
      for (const [w, h] of [[1280, 800], [700, 900], [390, 844]]) {
        live.bags.exceptions.length = 0;
        live.bags.console.length = 0;
        await live.send('Emulation.setDeviceMetricsOverride', {
          width: w, height: h, deviceScaleFactor: 1, mobile: w < 700,
        });
        await new Promise((r) => setTimeout(r, 1200));
        const err = quiet(live);
        const band = await evalJson(live.send, BAND);
        check(`chordal ${theme} ${w} stays in the page`,
          err.exceptions.length === 0 && err.console.length === 0
          && band.scroll <= 1 && band.layout === 'split' && band.view === 'split-chordal' && band.theme === theme,
          err.exceptions.concat(err.console).join(' | ') + ' ' + JSON.stringify(band));
      }
    }
    live.close();

    const stations = [
      ['#mandelbrot', `!!document.getElementById('mandelbrot-picture-live')`],
      ['#julia', `!!document.getElementById('julia-plane-viewport')`],
      ['#bulbs', `!!document.getElementById('bulbs-picture-live')`],
    ];
    const page = await openPage(started.browserWs);
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    for (const [hash, ready] of stations) {
      page.bags.exceptions.length = 0;
      page.bags.console.length = 0;
      await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/${hash}` });
      await waitFor(page.send, ready);
      await new Promise((r) => setTimeout(r, 400));
      if (hash === '#julia') {
        await page.send('Runtime.evaluate', { expression: `document.getElementById('julia-loop').click()` });
        await waitFor(page.send, `document.getElementById('julia-loop-play') && document.getElementById('julia-loop-play').textContent === 'Pause'`, 6000);
        const j0 = await evalJson(page.send, `Number(document.getElementById('julia-loop-play').dataset.t || 0)`);
        await new Promise((r) => setTimeout(r, 600));
        const j1 = await evalJson(page.send, `Number(document.getElementById('julia-loop-play').dataset.t || 0)`);
        check('julia Play advances the loop', j1 > j0, JSON.stringify({ j0, j1 }));
        await page.send('Runtime.evaluate', { expression: `document.getElementById('julia-loop-play').click()` });
        await new Promise((r) => setTimeout(r, 200));
        const jHold = await evalJson(page.send, `Number(document.getElementById('julia-loop-play').dataset.t || 0)`);
        await new Promise((r) => setTimeout(r, 400));
        const jHeld = await evalJson(page.send, `Number(document.getElementById('julia-loop-play').dataset.t || 0)`);
        const jLabel = await evalJson(page.send, `document.getElementById('julia-loop-play').textContent`);
        check('julia Pause holds the loop', jHeld === jHold && jLabel === 'Play', JSON.stringify({ jHold, jHeld, jLabel }));
      }
      const err = quiet(page);
      check(`${hash} loads with no console error`, err.exceptions.length === 0 && err.console.length === 0,
        err.exceptions.concat(err.console).join(' | '));
    }
    page.close();

    const phoneMap = await openPage(started.browserWs);
    await phoneMap.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await phoneMap.send('Page.addScriptToEvaluateOnNewDocument', { source: NO_GPU_THROW });
    await phoneMap.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html#home` });
    await waitFor(phoneMap.send, `!!document.querySelector('.home-map')`, 15000);
    const homeBox = await evalJson(phoneMap.send, `(() => {
      const map = document.querySelector('.home-map');
      const r = map.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), mode: map.getAttribute('data-mode') || '' };
    })()`);
    check('the Story Map renders on a phone without WebGL', homeBox.w > 200 && homeBox.h > 200, JSON.stringify(homeBox));
    await shot(phoneMap.send, '/opt/cursor/artifacts/story-map-390.png');
    await phoneMap.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html#julia` });
    await waitFor(phoneMap.send, `!!document.getElementById('julia-plane-viewport')`, 15000);
    await phoneMap.send('Runtime.evaluate', { expression: `document.getElementById('julia-loop').click()` });
    await waitFor(phoneMap.send, `document.getElementById('julia-loop-play') && document.getElementById('julia-loop-play').textContent === 'Pause'`, 8000);
    const p0 = await evalJson(phoneMap.send, `Number(document.getElementById('julia-loop-play').dataset.t || 0)`);
    await shot(phoneMap.send, '/opt/cursor/artifacts/julia-loop-390-a.png');
    await new Promise((r) => setTimeout(r, 700));
    const p1 = await evalJson(phoneMap.send, `Number(document.getElementById('julia-loop-play').dataset.t || 0)`);
    await shot(phoneMap.send, '/opt/cursor/artifacts/julia-loop-390-b.png');
    check('a phone Julia loop advances without WebGL', p1 > p0, JSON.stringify({ p0, p1 }));
    phoneMap.close();

    const gate = await openPage(started.browserWs);
    await gate.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await gate.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.removeItem('pg.state.v1');localStorage.removeItem('pg.learner.v1');}catch(e){}`,
    });
    await gate.send('Page.navigate', { url: base });
    await waitFor(gate.send, `document.documentElement.dataset.ready === '1'`);
    await gate.send('Runtime.evaluate', { expression: `document.getElementById('next').click()` });
    await waitFor(gate.send, `!!document.documentElement.dataset.key`);
    for (const theme of ['light', 'dark']) {
      for (let hop = 0; hop < 3; hop++) {
        const cur = await evalJson(gate.send, `document.documentElement.getAttribute('data-theme') || ''`);
        if (cur === theme) break;
        await gate.send('Runtime.evaluate', { expression: `document.getElementById('theme-toggle').click()` });
      }
      for (const [w, h] of [[1280, 800], [700, 900], [390, 844]]) {
        gate.bags.exceptions.length = 0;
        gate.bags.console.length = 0;
        await gate.send('Emulation.setDeviceMetricsOverride', {
          width: w, height: h, deviceScaleFactor: 1, mobile: w < 700,
        });
        await new Promise((r) => setTimeout(r, 280));
        const err = quiet(gate);
        const band = await evalJson(gate.send, BAND);
        check(`plane ${theme} ${w} has no console error`,
          err.exceptions.length === 0 && err.console.length === 0 && band.theme === theme && band.scroll <= 1 && band.layout === 'full',
          err.exceptions.concat(err.console).join(' | ') + ' ' + JSON.stringify(band));
      }
    }
    await gate.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    const watched = {
      v: 'pg/1', key: 'julia/plane/smooth/scrub/verdict/c', level: 2, seed: 1,
      map: { kind: 'julia', c: [-0.75, 0], d: 2 },
      view: { kind: 'plane', window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'scrub', reveal: 'verdict',
      path: { of: 'c', preset: 'circle', period_s: 12 },
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    gate.bags.exceptions.length = 0;
    gate.bags.console.length = 0;
    await gate.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(watched)})` });
    await waitFor(gate.send, `document.documentElement.dataset.phase === 'play'`, 12000);
    const play0 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    const t0 = await evalJson(gate.send, `Number(document.documentElement.dataset.t || 0)`);
    await new Promise((r) => setTimeout(r, 500));
    const play1 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    const t1 = await evalJson(gate.send, `Number(document.documentElement.dataset.t || 0)`);
    check('one clock: a playing scrub draws', play1 > play0, JSON.stringify({ play0, play1 }));
    check('one clock: play advances the loop', t1 > t0, JSON.stringify({ t0, t1 }));
    await gate.send('Runtime.evaluate', {
      expression: `document.querySelector('input[data-scrub]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`,
    });
    await new Promise((r) => setTimeout(r, 700));
    const pause0 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    const tPause0 = await evalJson(gate.send, `Number(document.documentElement.dataset.t || 0)`);
    await new Promise((r) => setTimeout(r, 500));
    const pause1 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    const tPause1 = await evalJson(gate.send, `Number(document.documentElement.dataset.t || 0)`);
    const pausePhase = await evalJson(gate.send, `document.documentElement.dataset.phase || ''`);
    check('one clock: a paused scrub draws nothing', pause1 === pause0 && pausePhase === 'play' && tPause1 === tPause0, JSON.stringify({ pause0, pause1, pausePhase, tPause0, tPause1 }));
    await gate.send('Runtime.evaluate', {
      expression: `document.querySelector('input[data-scrub]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))`,
    });
    await waitFor(gate.send, `document.documentElement.dataset.phase === 'play'`, 4000);
    await new Promise((r) => setTimeout(r, 200));
    const hid = await gate.send('Runtime.evaluate', {
      expression: `(() => { try { Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return true; } }); return document.hidden === true; } catch (e) { return String(e); } })()`,
      returnByValue: true,
    });
    const hiddenOk = hid.result?.value === true;
    await new Promise((r) => setTimeout(r, 400));
    const hide0 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    await new Promise((r) => setTimeout(r, 500));
    const hide1 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    check('one clock: a hidden tab draws nothing', hiddenOk && hide1 === hide0, JSON.stringify({ hiddenOk, hide0, hide1, hid: hid.result?.value }));
    const gateErr = quiet(gate);
    check('the clock pass has no console error', gateErr.exceptions.length === 0 && gateErr.console.length === 0,
      gateErr.exceptions.concat(gateErr.console).join(' | '));
    gate.close();

    const loopSpec = {
      v: 'pg/1', key: 'julia/plane/smooth/scrub/verdict/c', level: 2, seed: 1,
      map: { kind: 'julia', c: [-0.75, 0], d: 2 },
      view: { kind: 'plane', window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'scrub', reveal: 'verdict',
      path: { of: 'c', preset: 'circle', period_s: 8 },
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.5, max_iter: 128, fps_floor: 30, xr: false },
    };
    const diarySpec = {
      v: 'pg/1', key: 'julia/diary/smooth/pinch-zoom/roll/none', level: 10, seed: 4,
      map: { kind: 'julia', c: [0.26, 0], d: 2 },
      view: { kind: 'diary', window: { cx: -0.6, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'pinch-zoom', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.5, max_iter: 96, fps_floor: 30, xr: false },
    };
    const unitySpec = {
      v: 'pg/1', key: 'newton/unity/basin/nudge/roll/none', level: 9, seed: 6,
      map: { kind: 'newton', c: [0, 0], d: 3 },
      view: { kind: 'unity', window: { cx: 0, cy: 0, span: 3 } },
      colour: 'basin', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.5, max_iter: 96, fps_floor: 30, xr: false },
    };

    async function runCpu(width, height, poison, shotVoid, shotLoopA, shotLoopB, shotPicture) {
      const page = await openPage(started.browserWs);
      await page.send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: width < 700,
      });
      await page.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `try{localStorage.removeItem('pg.state.v1');localStorage.removeItem('pg.learner.v1');}catch(e){}` + poison,
      });
      const label = `${width}×${height}`;
      await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/playground.html` });
      await cpuStart(page, page.send, label);
      if (shotVoid) await shot(page.send, shotVoid);
      page.bags.exceptions.length = 0;
      page.bags.console.length = 0;
      const stage = await evalJson(page.send, `(() => {
        const r = document.getElementById('stage').getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + Math.min(80, r.height / 3)) };
      })()`);
      await page.send('Runtime.evaluate', {
        expression: `(() => {
          const stage = document.getElementById('stage');
          const r = stage.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + Math.min(80, r.height / 3);
          const down = new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' });
          const up = new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' });
          stage.dispatchEvent(down);
          stage.dispatchEvent(up);
        })()`,
      });
      await waitFor(page.send, `document.documentElement.dataset.phase === 'roll' || document.documentElement.dataset.phase === 'flash' || !!document.documentElement.dataset.flash`, 8000);
      await page.send('Runtime.evaluate', {
        expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
      });
      await waitFor(page.send, `document.documentElement.dataset.phase === 'idle' && !document.documentElement.dataset.flash`, 8000);
      check(`${label}: a touch still flashes the void`, true);
      await page.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(loopSpec)})` });
      await waitFor(page.send, `document.documentElement.dataset.phase === 'play' && document.documentElement.dataset.bake === 'cpu'`, 20000);
      const ink0 = await evalJson(page.send, `(${INK})('fractal')`);
      const a0 = await evalJson(page.send, `Number(document.documentElement.dataset.t || 0)`);
      if (shotLoopA) await shot(page.send, shotLoopA);
      await new Promise((r) => setTimeout(r, 700));
      const a1 = await evalJson(page.send, `Number(document.documentElement.dataset.t || 0)`);
      const ink1 = await evalJson(page.send, `(${INK})('fractal')`);
      if (shotLoopB) await shot(page.send, shotLoopB);
      check(`${label}: the CPU picture has ink and the loop advances`,
        ink0 > 0 && ink1 > 0 && a1 > a0,
        JSON.stringify({ ink0, ink1, a0, a1, stage }));
      await page.send('Runtime.evaluate', {
        expression: `document.querySelector('input[data-scrub]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }))`,
      });
      await new Promise((r) => setTimeout(r, 250));
      const hold = await evalJson(page.send, `Number(document.documentElement.dataset.t || 0)`);
      await new Promise((r) => setTimeout(r, 450));
      const held = await evalJson(page.send, `Number(document.documentElement.dataset.t || 0)`);
      const heldPhase = await evalJson(page.send, `document.documentElement.dataset.phase || ''`);
      check(`${label}: pause holds the loop`, held === hold && heldPhase === 'play', JSON.stringify({ hold, held, heldPhase }));
      await page.send('Runtime.evaluate', {
        expression: `document.querySelector('input[data-scrub]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 }))`,
      });
      await waitFor(page.send, `document.documentElement.dataset.phase === 'play'`, 4000);
      const resume0 = await evalJson(page.send, `Number(document.documentElement.dataset.t || 0)`);
      await new Promise((r) => setTimeout(r, 500));
      const resume1 = await evalJson(page.send, `Number(document.documentElement.dataset.t || 0)`);
      check(`${label}: resume advances the loop`, resume1 > resume0, JSON.stringify({ resume0, resume1 }));
      await page.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(diarySpec)})` });
      await waitFor(page.send, `document.documentElement.dataset.view === 'diary' && document.documentElement.dataset.bake === 'cpu' && document.documentElement.dataset.phase === 'idle'`, 25000);
      const diaryInk = await evalJson(page.send, `(${INK})('fractal')`);
      check(`${label}: the diary bakes on the CPU`, diaryInk > 0, String(diaryInk));
      await page.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(unitySpec)})` });
      await waitFor(page.send, `document.documentElement.dataset.view === 'unity' && document.documentElement.dataset.bake === 'cpu' && document.documentElement.dataset.phase === 'idle'`, 25000);
      const unityInk = await evalJson(page.send, `(${INK})('fractal')`);
      check(`${label}: the roots bake on the CPU`, unityInk > 0, String(unityInk));
      await page.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(twins)})` });
      await waitFor(page.send, `document.documentElement.dataset.view === 'twins' && document.documentElement.dataset.bake === 'cpu' && document.documentElement.dataset.phase === 'idle'`, 25000);
      const twinInk = await evalJson(page.send, `(${INK})('fractal')`);
      const twinCpuBadge = await evalJson(page.send, `document.getElementById('badge').textContent || ''`);
      check(`${label}: the twin bakes on the CPU`, twinInk > 0 && /resembles/.test(twinCpuBadge), JSON.stringify({ twinInk, twinCpuBadge }));
      if (shotPicture) await shot(page.send, shotPicture);
      await page.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(bulbs)})` });
      await waitFor(page.send, `document.documentElement.dataset.view === 'bulbs' && document.documentElement.dataset.bake === 'cpu' && document.documentElement.dataset.phase === 'idle'`, 25000);
      const bulbInk = await evalJson(page.send, `(${INK})('fractal')`);
      const bulbBadge = await evalJson(page.send, `document.getElementById('badge').textContent || ''`);
      const bulbDraw0 = await evalJson(page.send, `Number(document.documentElement.dataset.draws || 0)`);
      await new Promise((r) => setTimeout(r, 500));
      const bulbDraw1 = await evalJson(page.send, `Number(document.documentElement.dataset.draws || 0)`);
      check(`${label}: the bulbs bake on the CPU and the cycle keeps painting`,
        bulbInk > 0 && /Period 3/.test(bulbBadge) && bulbDraw1 > bulbDraw0,
        JSON.stringify({ bulbInk, bulbBadge, bulbDraw0, bulbDraw1 }));
      if (width < 700) await shot(page.send, '/opt/cursor/artifacts/l12-bulbs-390-cpu.png');
      const tail = quiet(page);
      check(`${label}: CPU pictures have no console error`, tail.exceptions.length === 0 && tail.console.length === 0,
        tail.exceptions.concat(tail.console).join(' | '));
      page.close();
    }

    await runCpu(390, 844, NO_GPU_THROW, '/opt/cursor/artifacts/playground-390-cpu.png', '/opt/cursor/artifacts/playground-390-loop-a.png', '/opt/cursor/artifacts/playground-390-loop-b.png', '/opt/cursor/artifacts/playground-390-roots-cpu.png');
    await runCpu(1280, 800, NO_GPU_NULL, '/opt/cursor/artifacts/playground-desktop-cpu.png', null, null, '/opt/cursor/artifacts/playground-desktop-roots-cpu.png');
  } finally {
    if (chrome && chrome.pid) {
      chrome.kill('SIGKILL');
      await new Promise((r) => chrome.on('exit', r));
    }
    await new Promise((resolve) => server.close(resolve));
  }
  if (failed) {
    console.error(`${failed} failed`);
    process.exit(1);
  }
  console.log('playground smoke passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
