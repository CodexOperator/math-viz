// Headless check for the playground sphere, the linked split, and a WebXR miss.
// Serves this repo and opens the playground, then the stations that share the
// orbit sentence. A stubbed immersive-vr session is refused. Nothing here is a headset.
// Run: node tools/playground-smoke.mjs

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestImmersive, bindSelect } from '../js/playground/xr.js';

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
    formula: (document.getElementById('formula') || {}).textContent || '',
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

async function main() {
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
      refused.deep.includes('No headset session') && refused.deep.includes('stays in the void')
      && after.key.startsWith('julia/plane/') && (after.phase === 'roll' || after.phase === 'bake' || after.phase === 'settle' || after.phase === 'idle'),
      JSON.stringify({ deep: refused.deep, key: after.key, phase: after.phase, xr: refused.xrText }));
    check('the no-headset line stays on the page',
      refusedNote.includes('No headset session') && refusedNote.includes('stays in the void') && refusedNoteHidden === false,
      refusedNote);
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
      && unitySnap.threads.includes('T3') && unitySnap.threads.includes('F2')
      && unitySnap.places.includes('Story Map') && unitySnap.places.includes('Newton Fractals')
      && unitySnap.places.includes('Roots: Divide the Staircase')
      && /L9/.test(unitySnap.level) && /roots/.test(unitySnap.level)
      && /Degree 3/.test(unityBadge),
      JSON.stringify({ view: unitySnap.view, layout: unitySnap.layout, ink: unityInk, level: unitySnap.level, cite: unitySnap.cite, threads: unitySnap.threads, places: unitySnap.places, badge: unityBadge }));
    await live.send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))` });
    const named = await evalJson(live.send, `(() => ({
      badge: document.getElementById('badge').textContent,
      flash: document.documentElement.dataset.flash || '',
    }))()`);
    check('Enter on the basins names the root and does not flash',
      named.flash === '' && /does not land/.test(named.badge),
      JSON.stringify(named));
    const degreePad = await evalJson(live.send, `(() => {
      const buttons = [...document.querySelectorAll('#controls .pad button')].map((b) => b.textContent + (b.disabled ? ':off' : ':on'));
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
    check('the degree slider changes the basins', /Degree 5/.test(deg5), deg5);
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
      && /Degree 4/.test(splitUnityBadge) && /other pane/.test(splitUnityBadge)
      && /mixes blue and orange/.test(splitUnityBadge)
      && splitBox.dw < 2 && splitBox.overlap <= 0 && splitBox.cover === 'solid'
      && /right pane/.test(splitBox.hint) && !/gesture is a nudge/.test(splitBox.hint),
      JSON.stringify({ view: splitU.view, layout: splitU.layout, cite: splitU.cite, badge: splitUnityBadge, box: splitBox }));
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
    check('a phone stacks the set of c under the basins',
      phoneSplit.overlap <= 0 && phoneSplit.scroll <= 1 && /lower pane/.test(phoneSplit.hint),
      JSON.stringify(phoneSplit));
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
      const err = quiet(page);
      check(`${hash} loads with no console error`, err.exceptions.length === 0 && err.console.length === 0,
        err.exceptions.concat(err.console).join(' | '));
    }
    page.close();

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
    await new Promise((r) => setTimeout(r, 500));
    const play1 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    check('one clock: a playing scrub draws', play1 > play0, JSON.stringify({ play0, play1 }));
    await gate.send('Runtime.evaluate', {
      expression: `document.querySelector('input[data-scrub]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`,
    });
    await new Promise((r) => setTimeout(r, 700));
    const pause0 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    await new Promise((r) => setTimeout(r, 500));
    const pause1 = await evalJson(gate.send, `Number(document.documentElement.dataset.draws || 0)`);
    const pausePhase = await evalJson(gate.send, `document.documentElement.dataset.phase || ''`);
    check('one clock: a paused scrub draws nothing', pause1 === pause0 && pausePhase === 'play', JSON.stringify({ pause0, pause1, pausePhase }));
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
