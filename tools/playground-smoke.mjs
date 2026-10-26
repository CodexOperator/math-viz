// Headless check for the playground sphere, the linked split, and a WebXR miss.
// Serves this repo and opens the playground, then the stations that share the
// orbit sentence. A stubbed immersive-vr session is refused. Nothing here is a headset.
// Run: node tools/playground-smoke.mjs

import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestImmersive, bindSelect } from '../js/playground/xr.js';
import { advancePathTime } from '../js/playground/clock.js';
import { RULES } from '../js/playground/playground.js';

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

const SLACK = `(() => {
  const foot = document.querySelector('.chrome.bottom');
  const cite = document.getElementById('cite');
  if (!foot || !cite) return null;
  const fb = foot.getBoundingClientRect();
  const vis = fb.top + foot.clientHeight;
  const range = document.createRange();
  range.selectNodeContents(cite);
  const lines = [...range.getClientRects()].filter((r) => r.width > 2 && r.height > 2);
  const first = lines[0];
  return {
    slack: first ? Math.round(vis - first.bottom) : -1,
    lines: lines.length,
    pad: getComputedStyle(foot).paddingBottom,
    stageH: Math.round(document.getElementById('stage').getBoundingClientRect().height),
  };
})()`;

async function assertFrozen(send, name) {
  await waitFor(send, `document.documentElement.dataset.phase === 'idle'`, 20000);
  const a = await evalJson(send, `Number(document.documentElement.dataset.draws || 0)`);
  await new Promise((r) => setTimeout(r, 280));
  const b = await evalJson(send, `Number(document.documentElement.dataset.draws || 0)`);
  await new Promise((r) => setTimeout(r, 420));
  const c = await evalJson(send, `Number(document.documentElement.dataset.draws || 0)`);
  check(name, a === b && b === c, JSON.stringify({ a, b, c }));
}

async function forceTheme(send, theme) {
  for (let hop = 0; hop < 3; hop++) {
    const cur = await evalJson(send, `document.documentElement.getAttribute('data-theme') || ''`);
    if (cur === theme) return;
    await send('Runtime.evaluate', { expression: `document.getElementById('theme-toggle').click()` });
    await new Promise((r) => setTimeout(r, 80));
  }
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
    places: [...document.querySelectorAll('#places a')].map((a) => a.getAttribute('aria-label') || a.textContent).join(' '),
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

function joinRuleChecks() {
  const caps = { xr: true, webgl2: true, gpu: 2 };
  const hit = (k) => RULES.filter(([, f]) => f(k, caps)).map(([r]) => r);
  const base = { map: 'julia', view: 'join', colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: 'none' };
  const julia = hit(base);
  const other = hit({ ...base, map: 'mandel' });
  const basin = hit({ ...base, colour: 'basin' });
  const curve = hit({ ...base, colour: 'curvature' });
  check('R26 keeps the join on the Julia map',
    !julia.includes('R26') && !julia.includes('R27') && other.includes('R26') && !other.includes('R27'),
    JSON.stringify({ julia, other }));
  check('R27 refuses basin and curvature on the join',
    basin.includes('R27') && curve.includes('R27') && !basin.includes('R26') && !curve.includes('R26'),
    JSON.stringify({ basin, curve }));
  const climb = { map: 'julia', view: 'climb', colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: 'none' };
  const climbJulia = hit(climb);
  const climbOther = hit({ ...climb, map: 'mandel' });
  const climbBasin = hit({ ...climb, colour: 'basin' });
  const climbCurve = hit({ ...climb, colour: 'curvature' });
  const climbPinch = hit({ ...climb, gesture: 'pinch-zoom' });
  check('R28 keeps the climb on the Julia map',
    !climbJulia.includes('R28') && !climbJulia.includes('R29') && climbOther.includes('R28'),
    JSON.stringify({ climbJulia, climbOther }));
  check('R1 and R29 refuse basin on the climb, and R29 refuses curvature',
    climbBasin.includes('R1') && climbBasin.includes('R29') && !climbBasin.includes('R28')
    && climbCurve.includes('R29') && !climbCurve.includes('R1'),
    JSON.stringify({ climbBasin, climbCurve }));
  check('R5 refuses a pinch on the climb',
    climbPinch.includes('R5') && !climbJulia.includes('R5'),
    JSON.stringify({ climbPinch, climbJulia }));
  const fall = { map: 'newton', view: 'fall', colour: 'basin', gesture: 'nudge', reveal: 'roll', path: 'none' };
  const fallOk = hit(fall);
  const fallJulia = hit({ ...fall, map: 'julia', colour: 'smooth' });
  const fallTrap = hit({ ...fall, colour: 'trap' });
  const fallPinch = hit({ ...fall, gesture: 'pinch-zoom' });
  check('R30 keeps the fall on Newton and R31 keeps the colour a basin',
    !fallOk.includes('R30') && !fallOk.includes('R31') && !fallOk.includes('R5')
    && fallJulia.includes('R30') && fallTrap.includes('R31') && fallPinch.includes('R5'),
    JSON.stringify({ fallOk, fallJulia, fallTrap, fallPinch }));
}

function bootGraph() {
  const seen = new Set();
  const stack = [
    join(root, 'js/app.js'),
    join(root, 'js/playground/app.js'),
  ];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let src = '';
    try { src = readFileSync(file, 'utf8'); } catch { continue; }
    const re = /(?:from\s+|import\s*\(\s*|new URL\(\s*)['"](\.[^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) {
      let next = normalize(join(dirname(file), m[1]));
      if (!next.endsWith('.js')) next += '.js';
      stack.push(next);
    }
  }
  const files = [...seen];
  const bad = files.filter((f) => f.includes('/kit/') || f.includes('\\kit\\'));
  check('the live boot graph does not import from kit/', bad.length === 0, bad.join(' ') || String(files.length));
}

function pathClockChecks() {
  joinRuleChecks();
  bootGraph();
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
      && chord.cite.includes('Figure 2.22, page 73') && chord.cite.includes('chordal distance')
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
      && sliceSnap.cite.includes('Figure 4.6, page 114') && sliceSnap.cite.includes('Exercise 4')
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
      && bendSnap.cite.includes('Figure 2.22, page 73') && bendSnap.cite.includes('Exercise 14')
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
      && unitySnap.cite.includes('Equation (1.43), page 31') && unitySnap.cite.includes('Figure 4.3, page 112')
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
    const rootsSlack = await evalJson(live.send, SLACK);
    check('the roots chapter sentence has air under it on a wide window',
      rootsSlack && rootsSlack.slack >= 24,
      JSON.stringify(rootsSlack));
    await shot(live.send, '/opt/cursor/artifacts/l9-roots-slack-1280.png');
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
      && splitU.cite.includes('Figure 4.6, page 114') && splitU.cite.includes('other pane')
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
      && diarySnap.cite.includes('Theorem 4.9, page 113') && diarySnap.cite.includes('Figure 4.6, page 114')
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
      && flashed.cite.includes('Theorem 4.9, page 113')
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
      && /resembles/.test(twinBadge) && /Theorem 4.9, page 113/.test(twinBadge) && /Exercise 10/.test(twinBadge)
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
    await waitFor(live.send, `document.documentElement.dataset.view === 'twins' && /The right pane/.test((document.querySelector('#controls .hint') || {}).textContent || '') && !/Square/.test((document.getElementById('threads') || {}).textContent || '') && (document.getElementById('pg-link-disk') || {}).textContent === 'Disk' && document.getElementById('cite').getBoundingClientRect().top < window.innerHeight - 12`, 20000);
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
        places: [...document.querySelectorAll('#places a')].map((a) => a.getAttribute('aria-label') || a.textContent).join(' '),
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
      /Period 3/.test(bulbPhone.badge) && /Theorem 4.11, page 116/.test(bulbPhone.badge) && /Figure 4.6, page 114/.test(bulbPhone.badge)
      && /orbit of 0/.test(bulbPhone.caption) && !/write back/.test(bulbPhone.caption) && !/Touch a bulb/.test(bulbPhone.caption)
      && bulbPhone.cite.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && /Theorem 4.11, page 116/.test(bulbPhone.cite) && /Definitions 4.9 and 4.10, page 115/.test(bulbPhone.cite)
      && /Figure 4.6, page 114/.test(bulbPhone.cite)
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
      && /Theorem 4.11, page 116/.test(bulbPhone.doors.card) && /orbit of 0/.test(bulbPhone.doors.card)
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
    // The Julia pane is the claim: same span, same iteration budget, same ink.
    // The set-of-c budget can fall when a slow bake steps the governor down,
    // so that count is not the proof.
    check('a pinch of the set of c does not retint the Julia pane',
      juliaAfter.juliaSpan === 2.6 && juliaBefore.juliaSpan === 2.6
      && juliaAfter.juliaIter === juliaBefore.juliaIter
      && juliaAfter.hash === juliaBefore.hash,
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
      const hintEl = document.getElementById('pg-hint');
      const hint = hintEl ? hintEl.textContent : '';
      const hintGlass = !!hintEl && !hintEl.closest('.foot-scroll');
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const citeBox = document.getElementById('cite').getBoundingClientRect();
      const chipRow = document.querySelector('.cascade-acts');
      const chips = [...document.querySelectorAll('.cascade-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
          text: b.textContent,
          h: Math.round(r.height),
          pressed: b.getAttribute('aria-pressed'),
          full: r.top >= fr.top - 1 && r.bottom <= vis + 1,
          inView: r.left >= -1 && r.right <= window.innerWidth + 1,
          owns: !!(hit && (hit === b || b.contains(hit))),
        };
      });
      const actions = [...document.querySelectorAll('.top-actions :is(a, button)')].filter((el) => !el.hidden && getComputedStyle(el).display !== 'none').map((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { text: (el.textContent || '').trim(), h: Math.round(r.height), owns: !!(hit && (hit === el || el.contains(hit))), right: Math.round(r.right) };
      });
      const places = [...document.querySelectorAll('#places a')].map((a) => a.getAttribute('aria-label') || a.textContent).join(' ');
      const doorTops = [...document.querySelectorAll('#places a')].map((a) => a.getBoundingClientRect().top);
      const note = document.getElementById('xr-note').getBoundingClientRect();
      const chipBoxes = [...document.querySelectorAll('.cascade-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, w: r.width };
      }).sort((a, b) => a.top - b.top || a.left - b.left);
      const gaps = [];
      for (let i = 1; i < chipBoxes.length; i++) {
        if (Math.abs(chipBoxes[i].top - chipBoxes[i - 1].top) < 8) gaps.push(chipBoxes[i].left - chipBoxes[i - 1].right);
      }
      const link = document.querySelector('#badge a');
      const formula = (document.getElementById('formula') || {}).textContent || '';
      const asks = [...document.querySelectorAll('#formula .ask-q')].map((el) => el.textContent);
      const cap = document.getElementById('caption');
      const capH = cap.getBoundingClientRect().height;
      const capLh = parseFloat(getComputedStyle(cap).lineHeight) || 1;
      return {
        badge, cite, hint, hintGlass, chips, actions, places, formula, asks,
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
        doorsAbove: (document.getElementById('places').getBoundingClientRect().top + 8) < citeBox.top,
        overlap: Math.round(stage.bottom - fr.top),
        juliaSpan: window.__pg.juliaSpan,
        xr: (document.getElementById('xr-note') || {}).textContent || '',
        gaps,
        citeFold: document.documentElement.dataset.cite || '',
        noteBottom: Math.round(note.bottom),
        noteH: Math.round(note.height),
        ih: window.innerHeight,
        doorTop: doorTops.length ? Math.round(Math.min(...doorTops)) : 0,
        stageBottom: Math.round(stage.bottom),
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
      && cascadePhone.hintGlass
      && !/Tap the void/.test(cascadePhone.hint) && !/lower pane/.test(cascadePhone.hint)
      && cascadePhone.rowScroll <= 1
      && cascadePhone.chips.length === 4 && cascadePhone.chips.every((b) => b.full && b.inView && b.owns && b.h >= 44 && b.h <= 46)
      && cascadePhone.actions.length >= 3 && cascadePhone.actions.every((a) => a.owns && a.h >= 44 && a.h <= 48 && a.right <= 390)
      && cascadePhone.chips.some((b) => b.text === 'Period 2' && b.pressed === 'true')
      && cascadePhone.juliaSpan === 2.6
      && cascadePhone.xr.includes('stays in the void') && cascadePhone.xr.includes('was not used')
      && cascadePhone.places.includes('Story Map') && cascadePhone.places.includes('Cardioid')
      && cascadePhone.doorsAbove
      && cascadePhone.citeFold === 'fold'
      && cascadePhone.gaps.length >= 3 && cascadePhone.gaps.every((g) => g >= 12)
      && cascadePhone.noteBottom <= cascadePhone.ih && cascadePhone.noteH >= 12
      && cascadePhone.doorTop >= cascadePhone.stageBottom - 1
      && /about two pixels/.test(cascadePhone.cite) && /magnified/.test(cascadePhone.cite),
      JSON.stringify(cascadePhone));
    await shot(live.send, '/opt/cursor/artifacts/l13-cascade-390.png');
    await live.send('Runtime.evaluate', { expression: `(() => { const xr = document.getElementById('xr'); xr.hidden = false; xr.dataset.label = 'Leave session'; window.dispatchEvent(new Event('resize')); })()` });
    await waitFor(live.send, `document.getElementById('xr').textContent === 'Leave' && document.getElementById('xr').getAttribute('aria-label') === 'Leave session'`, 8000);
    const leavePhone = await evalJson(live.send, `(() => {
      const xr = document.getElementById('xr');
      const r = xr.getBoundingClientRect();
      const stage = document.getElementById('stage').getBoundingClientRect();
      return {
        text: xr.textContent,
        label: xr.getAttribute('aria-label'),
        h: Math.round(r.height),
        w: Math.round(r.width),
        right: Math.round(r.right),
        stageH: Math.round(stage.height),
        headH: Math.round(document.querySelector('.chrome.top').getBoundingClientRect().height),
      };
    })()`);
    check('Leave on a phone is a 44px target and the stage stays up',
      leavePhone.text === 'Leave' && leavePhone.label === 'Leave session'
      && leavePhone.h >= 44 && leavePhone.h <= 48 && leavePhone.w >= 44 && leavePhone.w <= 88
      && leavePhone.right <= 390 && leavePhone.stageH >= 300,
      JSON.stringify(leavePhone));
    await shot(live.send, '/opt/cursor/artifacts/l13-leave-390.png');
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
    // The phone footer is still the measured band for one frame after the resize.
    await waitFor(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const head = document.querySelector('.chrome.top').getBoundingClientRect();
      return document.documentElement.dataset.view === 'cascade'
        && document.documentElement.dataset.phase === 'idle'
        && stage.height >= 270 && head.height <= 160;
    })()`, 15000);
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
      &&       /4\.23/.test(pileSnap.badge) && /4\.669/.test(pileSnap.badge)
      && /Period 32/.test(pileSnap.badge) && /not its own tick/.test(pileSnap.badge)
      && /about two pixels/.test(pileSnap.badge) && /magnified/.test(pileSnap.badge)
      && /does not number the birth of period 32/.test(pileSnap.badge)
      && !/settled/.test(pileSnap.badge) && pileSnap.flash === '',
      JSON.stringify(pileSnap));
    await shot(live.send, '/opt/cursor/artifacts/l13-pile-1280.png');
    const birth8 = {
      v: 'pg/1', key: 'julia/cascade/escape/scrub/verdict/z0', level: 13, seed: 13,
      map: { kind: 'julia', c: [-1.3680989393912582, 0], d: 2 },
      view: { kind: 'cascade', window: { cx: -0.875, cy: 0, span: 2.25 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'escape', gesture: 'scrub', reveal: 'verdict', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(birth8)})` });
    await waitFor(live.send, `/Four places are becoming eight/.test(document.getElementById('badge').textContent || '')`, 25000);
    const birthSnap = await evalJson(live.send, `document.getElementById('badge').textContent || ''`);
    check('the period-8 birth is a parabolic hinge, and the place holds',
      /Parabolic hinge/.test(birthSnap) && /Four places are becoming eight/.test(birthSnap)
      && /multiplier −1/.test(birthSnap) && /hold still/.test(birthSnap)
      && /does not number this hinge/.test(birthSnap) && !/Settles/.test(birthSnap),
      birthSnap);
    await shot(live.send, '/opt/cursor/artifacts/l13-period8-1280.png');
    const birth16 = {
      v: 'pg/1', key: 'julia/cascade/escape/scrub/verdict/z0', level: 13, seed: 13,
      map: { kind: 'julia', c: [-1.394046156600763, 0], d: 2 },
      view: { kind: 'cascade', window: { cx: -0.875, cy: 0, span: 2.25 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'escape', gesture: 'scrub', reveal: 'verdict', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(birth16)})` });
    await waitFor(live.send, `/Eight places are becoming sixteen/.test(document.getElementById('badge').textContent || '')`, 25000);
    const birth16Snap = await evalJson(live.send, `document.getElementById('badge').textContent || ''`);
    check('the period-16 birth is a parabolic hinge, the same kind of tick',
      /Parabolic hinge/.test(birth16Snap) && /Eight places are becoming sixteen/.test(birth16Snap)
      && /multiplier −1/.test(birth16Snap) && /hold still/.test(birth16Snap)
      && /does not number this hinge/.test(birth16Snap) && !/Settles/.test(birth16Snap),
      birth16Snap);
    await shot(live.send, '/opt/cursor/artifacts/l13-period16-1280.png');
    const rays = {
      v: 'pg/1', key: 'julia/rays/smooth/nudge/roll/none', level: 14, seed: 14,
      map: { kind: 'julia', c: [0.25, 0], d: 2 },
      view: { kind: 'rays', window: { cx: -0.6, cy: 0, span: 3.2 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(rays)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'rays' && document.documentElement.dataset.phase === 'idle' && /Angle 0/.test(document.getElementById('badge').textContent || '')`, 25000);
    const raysWide = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const citeBox = document.getElementById('cite').getBoundingClientRect();
      const places = document.getElementById('places').getBoundingClientRect();
      const fractal = document.getElementById('fractal').getBoundingClientRect();
      const actions = [...document.querySelectorAll('.top-actions :is(a, button)')].filter((el) => !el.hidden && getComputedStyle(el).display !== 'none').map((el) => {
        const r = el.getBoundingClientRect();
        return { h: Math.round(r.height), w: Math.round(r.width) };
      });
      const row = document.getElementById('places');
      const door = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { right: Math.round(r.right), in: r.left >= places.left - 1 && r.right <= places.right + 1, h: Math.round(r.height) };
      };
      return {
        badge: document.getElementById('badge').textContent || '',
        caption: document.getElementById('caption').textContent || '',
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        cite: document.getElementById('cite').textContent || '',
        side: document.getElementById('stage').dataset.layout || '',
        stageH: Math.round(stage.height),
        stageW: Math.round(stage.width),
        headerH: Math.round(document.querySelector('.chrome.top').getBoundingClientRect().height),
        fractalW: Math.round(fractal.width),
        juliaSpan: window.__pg.juliaSpan,
        citeStarts: citeBox.top >= fr.top - 1 && citeBox.top <= vis - 12,
        doorsAbove: places.top + 8 < citeBox.top,
        placesH: Math.round(places.height),
        rowScroll: row.scrollWidth - row.clientWidth,
        disk: door('pg-link-disk'),
        card: door('pg-link-bulbs'),
        chips: [...document.querySelectorAll('.ray-acts button')].map((b) => b.textContent),
        actions,
        hold: window.__pg.raysHold === true,
      };
    })()`);
    check('the rays open on angle 0 at the cusp',
      raysWide.side === 'split' && raysWide.stageH >= 270 && raysWide.stageH <= 300
      && raysWide.headerH <= 160 && raysWide.juliaSpan === 2.6
      && raysWide.fractalW >= raysWide.stageW - 1
      && raysWide.citeStarts && raysWide.doorsAbove
      && /two addresses/.test(raysWide.caption) && /angle of the ray/.test(raysWide.caption)
      && /Where do c and this angle land/.test(raysWide.ask)
      && /Angle 0/.test(raysWide.badge) && /This c is 1\/4/.test(raysWide.badge) && /not Settles/.test(raysWide.badge)
      && raysWide.hold === true
      && /does not number external rays/.test(raysWide.cite)
      && /Figure 1\.15/.test(raysWide.cite)
      && /Figure 1\.15, page 22/.test(raysWide.cite)
      && /Definition 1\.11/.test(raysWide.cite)
      && /Definition 1\.11, page 23/.test(raysWide.cite)
      && !/A general c/.test(raysWide.cite)
      && !/No complex ray/.test(raysWide.cite)
      && /right pane is the Julia set/.test(raysWide.cite)
      && /not that cardioid/.test(raysWide.cite)
      && /T2 · The staircase/.test(raysWide.cite)
      && /F1 · A sequence has a fate/.test(raysWide.cite)
      && raysWide.rowScroll <= 1
      && raysWide.disk && raysWide.disk.in && raysWide.card && raysWide.card.in
      && raysWide.disk.h === 44 && raysWide.card.h === 44
      && raysWide.chips.join() === 'Cusp,Pair,Tip'
      && raysWide.actions.length >= 3 && raysWide.actions.every((a) => a.h >= 44 && a.w >= 44),
      JSON.stringify(raysWide));
    await shot(live.send, '/opt/cursor/artifacts/l14-rays-1280.png');
    const rayBefore = await evalJson(live.send, `(() => {
      const c = document.getElementById('fractal');
      const p = c.getContext('2d').getImageData(Math.round(c.width * 0.25), Math.round(c.height * 0.5), 1, 1).data;
      return [p[0], p[1], p[2], p[3]];
    })()`);
    await live.send('Runtime.evaluate', { expression: `(() => {
      const stage = document.getElementById('stage');
      const r = stage.getBoundingClientRect();
      const mk = (id, x, y) => new Touch({ identifier: id, target: stage, clientX: x, clientY: y });
      const a = mk(1, r.left + r.width * 0.2, r.top + r.height * 0.5);
      const b = mk(2, r.left + r.width * 0.35, r.top + r.height * 0.5);
      stage.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [a, b], targetTouches: [a, b], changedTouches: [a, b] }));
      stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, clientX: r.left + 30, clientY: r.top + 30, bubbles: true, cancelable: true }));
      stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      stage.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    })()` });
    await new Promise((r) => setTimeout(r, 500));
    const rayHold = await evalJson(live.send, `(() => {
      const c = document.getElementById('fractal');
      const p = c.getContext('2d').getImageData(Math.round(c.width * 0.25), Math.round(c.height * 0.5), 1, 1).data;
      return { px: [p[0], p[1], p[2], p[3]], span: window.__pg.juliaSpan, flash: document.documentElement.dataset.flash || '', view: document.documentElement.dataset.view || '' };
    })()`);
    check('a pinch, a wheel, Enter, and Space do not zoom the rays or flash the diary',
      rayHold.view === 'rays' && rayHold.span === 2.6 && rayHold.flash === ''
      && rayHold.px.join() === rayBefore.join(),
      JSON.stringify({ before: rayBefore, after: rayHold }));
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="raypair"]').click()` });
    await waitFor(live.send, `/1\\/3 and 2\\/3/.test(document.getElementById('badge').textContent || '')`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/l14-rays-pair-1280.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="rayhalf"]').click()` });
    await waitFor(live.send, `/Angle 1\\/2/.test(document.getElementById('badge').textContent || '') && /Stays/.test(document.getElementById('badge').textContent || '')`, 15000);
    const tipDesk = await evalJson(live.send, `(() => ({
      badge: document.getElementById('badge').textContent || '',
      hold: window.__pg.raysHold === true,
      span: window.__pg.juliaSpan,
    }))()`);
    check('at 1280 angle 1/2 is Stays and both rays stay on the glass',
      /Angle 1\/2/.test(tipDesk.badge) && /Stays/.test(tipDesk.badge) && /repels/.test(tipDesk.badge) && /not Settles/.test(tipDesk.badge)
      && tipDesk.hold === true && tipDesk.span === 2.6,
      JSON.stringify(tipDesk));
    await shot(live.send, '/opt/cursor/artifacts/l14-rays-tip-1280.png');
    await assertFrozen(live.send, 'a still rays picture does not repaint');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="ray0"]').click()` });
    await waitFor(live.send, `/This c is 1\\/4/.test(document.getElementById('badge').textContent || '')`, 15000);
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'rays' && document.getElementById('stage').getBoundingClientRect().height >= 260 && (document.getElementById('pg-link-disk') || {}).textContent === 'Disk' && (() => { const foot = document.querySelector('.chrome.bottom'); const fr = foot.getBoundingClientRect(); const vis = fr.top + foot.clientHeight; const cite = document.getElementById('cite').getBoundingClientRect(); const places = document.getElementById('places').getBoundingClientRect(); return cite.top >= fr.top - 1 && cite.top <= vis - 12 && places.height >= 88 && places.height <= 150; })()`, 15000);
    const raysPhone = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const citeBox = document.getElementById('cite').getBoundingClientRect();
      const places = document.getElementById('places').getBoundingClientRect();
      const chips = [...document.querySelectorAll('.ray-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, h: Math.round(r.height), w: Math.round(r.width), right: Math.round(r.right) };
      });
      const fractal = document.getElementById('fractal').getBoundingClientRect();
      const actions = [...document.querySelectorAll('.top-actions :is(a, button)')].filter((el) => !el.hidden && getComputedStyle(el).display !== 'none').map((el) => {
        const r = el.getBoundingClientRect();
        return { h: Math.round(r.height), w: Math.round(r.width), right: Math.round(r.right) };
      });
      const row = document.getElementById('places');
      return {
        side: document.getElementById('stage').dataset.layout || '',
        stageH: Math.round(stage.height),
        stageW: Math.round(stage.width),
        fractalW: Math.round(fractal.width),
        citeStarts: citeBox.top >= fr.top - 1 && citeBox.top <= vis - 12,
        doorsAbove: places.top + 8 < citeBox.top,
        placesH: Math.round(places.height),
        rowScroll: row.scrollWidth - row.clientWidth,
        cite: (document.getElementById('cite').textContent || '').slice(0, 48),
        chips,
        gaps: (() => {
          const row = [...document.querySelectorAll('.ray-acts button')].map((b) => b.getBoundingClientRect());
          return row.slice(1).map((c, i) => Math.round(c.left - row[i].right));
        })(),
        actions,
        hold: window.__pg.raysHold === true,
        doors: [...document.querySelectorAll('#places a')].map((a) => a.textContent),
        disk: (() => {
          const el = document.getElementById('pg-link-disk');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const places = document.getElementById('places').getBoundingClientRect();
          return { in: r.left >= places.left - 1 && r.right <= places.right + 1 && r.top >= places.top - 1, h: Math.round(r.height) };
        })(),
        card: (() => {
          const el = document.getElementById('pg-link-bulbs');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const places = document.getElementById('places').getBoundingClientRect();
          return { in: r.left >= places.left - 1 && r.right <= places.right + 1 && r.top >= places.top - 1, h: Math.round(r.height) };
        })(),
      };
    })()`);
    check('at 390 the rays stay side by side and the doors wrap onto the glass',
      raysPhone.side === 'split' && raysPhone.stageH >= 280 && raysPhone.stageH <= 360
      && raysPhone.citeStarts && raysPhone.doorsAbove
      && raysPhone.hold === true
      && raysPhone.placesH >= 88 && raysPhone.placesH <= 150
      && raysPhone.rowScroll <= 1
      && raysPhone.disk && raysPhone.disk.in && raysPhone.disk.h === 44
      && raysPhone.card && raysPhone.card.in && raysPhone.card.h === 44
      && raysPhone.fractalW >= raysPhone.stageW - 1
      && raysPhone.cite.startsWith('Test 1 is Chapters 1 to 3.')
      && raysPhone.chips.length === 3 && raysPhone.chips.every((b) => b.h >= 44 && b.h <= 48 && b.w >= 44 && b.right <= 390)
      && raysPhone.gaps.every((g) => g >= 12)
      && raysPhone.actions.length >= 3 && raysPhone.actions.every((a) => a.h >= 44 && a.w >= 44 && a.right <= 390),
      JSON.stringify(raysPhone));
    const raysSlack = await evalJson(live.send, SLACK);
    check('the rays chapter sentence has air under it on a phone',
      raysSlack && raysSlack.slack >= 24 && raysPhone.stageH >= 280 && raysPhone.stageH <= 360,
      JSON.stringify(raysSlack));
    await shot(live.send, '/opt/cursor/artifacts/l14-rays-390.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="raypair"]').click()` });
    await waitFor(live.send, `/1\\/3 and 2\\/3/.test(document.getElementById('badge').textContent || '')`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/l14-rays-pair-390.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="rayhalf"]').click()` });
    await waitFor(live.send, `/Angle 1\\/2/.test(document.getElementById('badge').textContent || '')`, 15000);
    const tipSnap = await evalJson(live.send, `(() => ({
      badge: document.getElementById('badge').textContent || '',
      span: window.__pg.juliaSpan,
      tipHold: window.__pg.tipHold === true,
    }))()`);
    check('angle 1/2 lands at the tip and the phone Julia pane holds both ends',
      /Angle 1\/2/.test(tipSnap.badge) && /repels/.test(tipSnap.badge) && /Stays/.test(tipSnap.badge) && /not Settles/.test(tipSnap.badge)
      && tipSnap.span === 2.6 && tipSnap.tipHold === true,
      JSON.stringify(tipSnap));
    await shot(live.send, '/opt/cursor/artifacts/l14-rays-tip-390.png');
    const tipSlack = await evalJson(live.send, SLACK);
    check('the tip chapter sentence has the same air as the rays sentence',
      tipSlack && raysSlack && tipSlack.slack >= 24 && Math.abs(tipSlack.slack - raysSlack.slack) <= 8,
      JSON.stringify({ rays: raysSlack, tip: tipSlack }));
    const pole = {
      v: 'pg/1', key: 'julia/pole/smooth/nudge/roll/none', level: 15, seed: 15,
      map: { kind: 'julia', c: [-0.75, 0], d: 2 },
      view: { kind: 'pole', window: { cx: -0.6, cy: 0, span: 3.2 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(pole)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'pole' && document.documentElement.dataset.phase === 'idle' && /two angles/.test(document.getElementById('badge').textContent || '')`, 25000);
    const polePhone = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const citeBox = document.getElementById('cite').getBoundingClientRect();
      const places = document.getElementById('places').getBoundingClientRect();
      const row = document.getElementById('places');
      return {
        caption: document.getElementById('caption').textContent || '',
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        badge: document.getElementById('badge').textContent || '',
        cite: document.getElementById('cite').textContent || '',
        side: document.getElementById('stage').dataset.layout || '',
        stageH: Math.round(stage.height),
        citeStarts: citeBox.top >= fr.top - 1 && citeBox.top <= vis - 12,
        placesH: Math.round(places.height),
        rowScroll: row.scrollWidth - row.clientWidth,
        span: window.__pg.juliaSpan,
        xr: document.documentElement.dataset.xrProof || '',
        note: (document.getElementById('xr-note') || {}).textContent || '',
      };
    })()`);
    check('at 390 the pole is the sphere, and the chapter sentence starts on the glass',
      polePhone.side === 'split' && polePhone.stageH >= 260
      && polePhone.citeStarts && polePhone.rowScroll <= 1 && polePhone.placesH >= 88
      && /two angles/.test(polePhone.caption) && /north pole/.test(polePhone.caption)
      && /Why do both angles leave the same pole/.test(polePhone.ask)
      && /1\/3 and 2\/3/.test(polePhone.badge) && /two angles/.test(polePhone.badge)
      && /not a Newton root/.test(polePhone.badge)
      && /Figure 1\.15/.test(polePhone.cite) && /Figure 1\.15, page 22/.test(polePhone.cite)
      && /Definition 1\.11/.test(polePhone.cite) && /Definition 1\.11, page 23/.test(polePhone.cite)
      && /Figure 2\.22/.test(polePhone.cite)
      && /Exercise 14/.test(polePhone.cite) && /coordinates of z/.test(polePhone.cite)
      && !/A general c/.test(polePhone.cite) && !/is the lift/.test(polePhone.cite)
      && polePhone.span === 2.6 && polePhone.xr === 'untried'
      && /headset was not used/.test(polePhone.note),
      JSON.stringify(polePhone));
    await shot(live.send, '/opt/cursor/artifacts/l15-pole-390.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'pole' && document.getElementById('stage').getBoundingClientRect().width >= 1000`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/l15-pole-1280.png');
    const poleWide = await evalJson(live.send, `(() => ({
      caption: document.getElementById('caption').textContent || '',
      rowScroll: document.getElementById('places').scrollWidth - document.getElementById('places').clientWidth,
      label: (document.getElementById('pg-link-bulbs') || {}).textContent || '',
    }))()`);
    check('at 1280 the pole doors use the full names and do not scroll',
      /two angles/.test(poleWide.caption) && /north pole/.test(poleWide.caption)
      && poleWide.rowScroll <= 1 && /Cardioid/.test(poleWide.label),
      JSON.stringify(poleWide));
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="ray0"]').click()` });
    await waitFor(live.send, `/Angle 0 lands here/.test(document.getElementById('badge').textContent || '') && /two addresses/.test(document.getElementById('caption').textContent || '')`, 15000);
    const poleCusp = await evalJson(live.send, `(() => ({
      caption: document.getElementById('caption').textContent || '',
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
      badge: document.getElementById('badge').textContent || '',
    }))()`);
    check('the cusp on the pole is one landing and two addresses',
      /two addresses/.test(poleCusp.caption) && /north pole/.test(poleCusp.caption)
      && !/Both leave/.test(poleCusp.caption)
      && /this one ray/.test(poleCusp.ask)
      && /Angle 0 lands here/.test(poleCusp.badge) && /This c is 1\/4/.test(poleCusp.badge),
      JSON.stringify(poleCusp));
    await shot(live.send, '/opt/cursor/artifacts/l15-pole-cusp-1280.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="rayhalf"]').click()` });
    await waitFor(live.send, `/Angle 1\\/2 leaves the north pole/.test(document.getElementById('badge').textContent || '')`, 15000);
    const poleTip = await evalJson(live.send, `document.getElementById('caption').textContent || ''`);
    const poleTipBadge = await evalJson(live.send, `document.getElementById('badge').textContent || ''`);
    check('the tip on the pole keeps the two addresses', /two addresses/.test(poleTip) && /north pole/.test(poleTip), poleTip);
    check('the tip says the sphere is turned closer because c = −2 sits near the pole',
      /turned closer/.test(poleTipBadge) && /sits near the pole/.test(poleTipBadge) && /name meets the stroke/.test(poleTipBadge)
      && /Angle 1\/2 leaves the north pole/.test(poleTipBadge),
      poleTipBadge);
    await shot(live.send, '/opt/cursor/artifacts/l15-pole-tip-1280.png');
    await assertFrozen(live.send, 'a still pole picture does not repaint');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'pole' && document.getElementById('stage').getBoundingClientRect().width < 500`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/l15-pole-tip-390.png');
    const join = {
      v: 'pg/1', key: 'julia/join/smooth/nudge/roll/none', level: 16, seed: 4,
      map: { kind: 'julia', c: [-1, Math.sqrt(3)], d: 2 },
      view: { kind: 'join', window: { cx: -0.75, cy: 0.35, span: 4.2 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(join)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'join' && document.documentElement.dataset.phase === 'idle' && /two addresses/.test(document.getElementById('caption').textContent || '')`, 25000);
    const joinPhone = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const cite = document.getElementById('cite').getBoundingClientRect();
      const row = document.getElementById('places');
      const chips = [...document.querySelectorAll('.join-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, right: Math.round(r.right), top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) };
      });
      return {
        stageH: Math.round(stage.height),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        citeStarts: cite.top >= fr.top - 1 && cite.top <= vis - 12,
        rowScroll: row.scrollWidth - row.clientWidth,
        chips,
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        badge: document.getElementById('badge').textContent || '',
        cite: (document.getElementById('cite') || {}).textContent || '',
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
        span: window.__pg.juliaSpan,
        xr: document.documentElement.dataset.xrProof || '',
        flash: document.documentElement.dataset.flash || '',
        noteBox: (() => { const r = document.getElementById('xr-note').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), ih: window.innerHeight }; })(),
        gaps: (() => {
          const chips = [...document.querySelectorAll('.join-acts button')].map((b) => b.getBoundingClientRect());
          return chips.slice(1).map((c, i) => Math.round(c.left - chips[i].right));
        })(),
      };
    })()`);
    const joinIPhone = joinPhone.chips.find((c) => c.text === 'i') || { w: 0, h: 0 };
    const joinGaps = joinPhone.gaps;
    check('the join on a phone names both addresses beside the Julia set',
      joinPhone.stageH >= 240 && joinPhone.scroll <= 1 && joinPhone.citeStarts && joinPhone.rowScroll <= 1
      && joinPhone.chips.length === 4 && joinPhone.chips.every((c) => c.right <= 392 && c.h >= 44 && c.h <= 48 && c.w >= 44)
      && joinIPhone.w <= 56 && joinIPhone.h >= 44 && joinIPhone.h <= 48
      && joinGaps.every((g) => g >= 12)
      && joinPhone.noteBox.top >= 0 && joinPhone.noteBox.bottom <= joinPhone.noteBox.ih && joinPhone.noteBox.h >= 12
      && /two addresses/i.test(joinPhone.ask)
      && /−1 \+ i√3/.test(joinPhone.badge) && /2π\/3/.test(joinPhone.badge) && /Figure 1\.15/.test(joinPhone.badge)
      && !/1\.3\.1/.test(joinPhone.badge) && !/1\.3\.1/.test(joinPhone.cite)
      && /Figure 1\.15/.test(joinPhone.cite) && /Definition 1\.11/.test(joinPhone.cite)
      && /does not print the polar form/.test(joinPhone.cite)
      && /how far across/.test(joinPhone.cite) && /not Exercise 4/.test(joinPhone.cite)
      && /Theorem 4\.9/.test(joinPhone.cite)
      && joinPhone.threads.join() === 'T1,F1,F2'
      && joinPhone.span === 2.6 && joinPhone.xr === 'untried' && joinPhone.flash === '',
      JSON.stringify(joinPhone));
    await shot(live.send, '/opt/cursor/artifacts/l16-join-390.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l16-join-390.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'join' && document.getElementById('stage').getBoundingClientRect().width > 1000`, 15000);
    const joinWide = await evalJson(live.send, `(() => {
      const row = document.getElementById('places');
      return {
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        rowScroll: row.scrollWidth - row.clientWidth,
        label: (document.getElementById('pg-link-bulbs') || {}).textContent || '',
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
      };
    })()`);
    check('the join on a wide window keeps the doors on the glass',
      joinWide.scroll <= 1 && joinWide.rowScroll <= 1 && /Cardioid/.test(joinWide.label)
      && /two addresses/i.test(joinWide.ask),
      JSON.stringify(joinWide));
    await shot(live.send, '/opt/cursor/artifacts/l16-join-1280.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l16-join-1280.png');
    await forceTheme(live.send, 'light');
    await waitFor(live.send, `document.documentElement.getAttribute('data-theme') === 'light' && document.documentElement.dataset.phase === 'idle'`, 15000);
    await new Promise((r) => setTimeout(r, 250));
    await shot(live.send, '/opt/cursor/artifacts/l16-join-light-1280.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'join' && document.getElementById('stage').getBoundingClientRect().width < 500`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/l16-join-light-390.png');
    await forceTheme(live.send, 'dark');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await waitFor(live.send, `document.documentElement.getAttribute('data-theme') === 'dark' && document.getElementById('stage').getBoundingClientRect().width > 1000`, 15000);
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="joini"]').click()` });
    await waitFor(live.send, `/Arg π\\/2/.test(document.getElementById('badge').textContent || '') && /two addresses/.test(document.getElementById('caption').textContent || '')`, 15000);
    const joinI = await evalJson(live.send, `(() => {
      const chips = [...document.querySelectorAll('.join-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left) };
      }).sort((a, b) => a.left - b.left);
      const raw = [...document.querySelectorAll('.join-acts button')].map((b) => b.getBoundingClientRect()).sort((a, b) => a.left - b.left);
      const gaps = raw.slice(1).map((c, i) => Math.round(c.left - raw[i].right));
      const iChip = chips.find((c) => c.text === 'i') || { w: 0, h: 0 };
      return {
        badge: document.getElementById('badge').textContent || '',
        pressed: (document.querySelector('[data-act="joini"]') || {}).getAttribute('aria-pressed') || '',
        w: iChip.w,
        h: iChip.h,
        gap: gaps.length ? Math.min(...gaps) : 0,
      };
    })()`);
    check('i on the join is length 1 at Arg π/2',
      /length 1 at Arg π\/2/.test(joinI.badge) && /Figure 1\.15/.test(joinI.badge)
      && /Definition 1\.11/.test(joinI.badge) && joinI.pressed === 'true'
      && joinI.w >= 44 && joinI.w <= 56 && joinI.h >= 44 && joinI.h <= 48 && joinI.gap >= 12,
      JSON.stringify(joinI));
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="join0"]').click()` });
    await waitFor(live.send, `/no angle at 0/i.test(document.getElementById('caption').textContent || '') && /Why does one address stop/.test((document.querySelector('#formula .ask-q') || {}).textContent || '')`, 15000);
    const joinZero = await evalJson(live.send, `(() => ({
      caption: document.getElementById('caption').textContent || '',
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
      badge: document.getElementById('badge').textContent || '',
      tex: (document.querySelector('#formula') || {}).textContent || '',
      pressed: (document.querySelector('[data-act="join0"]') || {}).getAttribute('aria-pressed') || '',
    }))()`);
    check('zero on the join is no angle, and Exercise 4 is the disk',
      /no angle at 0/i.test(joinZero.caption) && /Why does one address stop/.test(joinZero.ask)
      && /No angle at 0/.test(joinZero.badge) && /Figure 1\.15/.test(joinZero.badge)
      && /Exercise 4 is the disk/.test(joinZero.badge)
      && !/Arg is not defined/.test(joinZero.badge)
      && /no\s+angle\s+at\s*0/i.test(joinZero.tex) && joinZero.pressed === 'true',
      JSON.stringify(joinZero));
    await shot(live.send, '/opt/cursor/artifacts/mid-l16-join-zero-1280.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="joinpair"]').click()` });
    await waitFor(live.send, `/Arg π is not those rays/.test(document.getElementById('badge').textContent || '')`, 15000);
    const joinPair = await evalJson(live.send, `(() => ({
      badge: document.getElementById('badge').textContent || '',
      caption: document.getElementById('caption').textContent || '',
      pressed: (document.querySelector('[data-act="joinpair"]') || {}).getAttribute('aria-pressed') || '',
    }))()`);
    check('pair on the join is the shared landing, and Arg π is not the rays',
      /Arg π/.test(joinPair.badge) && /Shared landing/.test(joinPair.badge)
      && /1\/3 and 2\/3/.test(joinPair.badge) && /Arg π is not those rays/.test(joinPair.badge)
      && /Figure 1\.15/.test(joinPair.badge) && /Definition 1\.11/.test(joinPair.badge)
      && /two addresses/.test(joinPair.caption) && joinPair.pressed === 'true',
      JSON.stringify(joinPair));
    await shot(live.send, '/opt/cursor/artifacts/mid-l16-join-pair-1280.png');
    const joinHash = await openPage(started.browserWs);
    await joinHash.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.removeItem('pg.state.v1');localStorage.removeItem('pg.learner.v1');}catch(e){}`,
    });
    await joinHash.send('Page.navigate', { url: `http://127.0.0.1:${port}/playground.html#join` });
    await waitFor(joinHash.send, `document.documentElement.dataset.view === 'join' && document.documentElement.dataset.ready === '1' && /two addresses/.test(document.getElementById('caption').textContent || '')`, 25000);
    const locked = await evalJson(joinHash.send, `(() => ({
      view: document.documentElement.dataset.view || '',
      level: window.__pg.level,
      xr: document.documentElement.dataset.xrProof || '',
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
    }))()`);
    check('a hash opens the join while the assembler is still locked',
      locked.view === 'join' && locked.level === 0 && /two addresses/i.test(locked.ask) && locked.xr === 'untried',
      JSON.stringify(locked));
    joinHash.close();
    await live.send('Page.bringToFront');
    const still0 = await evalJson(live.send, `Number(document.documentElement.dataset.draws || 0)`);
    await new Promise((r) => setTimeout(r, 450));
    const still1 = await evalJson(live.send, `Number(document.documentElement.dataset.draws || 0)`);
    check('a still join does not repaint', still1 === still0, JSON.stringify({ still0, still1 }));
    const climb = {
      v: 'pg/1', key: 'julia/climb/smooth/nudge/roll/none', level: 17, seed: 1,
      map: { kind: 'julia', c: [-1, Math.sqrt(3)], d: 2 },
      view: { kind: 'climb', window: { cx: -0.75, cy: 0.35, span: 4.2 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(climb)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'climb' && document.documentElement.dataset.phase === 'idle' && /climbs to the north pole/.test(document.getElementById('caption').textContent || '')`, 25000);
    await live.send('Runtime.evaluate', { expression: `(() => {
      window.__fateWords = [];
      if (window.__fateHook) return;
      window.__fateHook = true;
      const orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
        if (text === 'climbs' || text === 'stays' || text === 'approaches' || text === 'north pole') {
          window.__fateWords.push(text);
        }
        return orig.call(this, text, x, y);
      };
    })()` });
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    // The viewport narrows a frame before the door names shorten. Measuring
    // that frame reads the long names and a citation that has not settled.
    await waitFor(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const vis = foot.getBoundingClientRect().top + foot.clientHeight;
      const cite = document.getElementById('cite').getBoundingClientRect();
      const doors = [...document.querySelectorAll('#places a')].map((a) => a.textContent);
      return document.documentElement.dataset.view === 'climb' && stage.width < 500 && stage.height >= 220
        && doors.indexOf('Powers') >= 0 && cite.top <= vis - 12;
    })()`, 15000);
    const climbPhone = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const vis = fr.top + foot.clientHeight;
      const cite = document.getElementById('cite').getBoundingClientRect();
      const row = document.getElementById('places');
      const chips = [...document.querySelectorAll('.climb-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, right: Math.round(r.right), h: Math.round(r.height), pressed: b.getAttribute('aria-pressed') };
      });
      return {
        stageH: Math.round(stage.height),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        citeStarts: cite.top >= fr.top - 1 && cite.top <= vis - 12,
        rowScroll: row.scrollWidth - row.clientWidth,
        chips,
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        badge: document.getElementById('badge').textContent || '',
        cite: (document.getElementById('cite') || {}).textContent || '',
        caption: document.getElementById('caption').textContent || '',
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
        doors: [...document.querySelectorAll('#places a')].map((a) => a.textContent),
        xr: document.documentElement.dataset.xrProof || '',
        note: (document.getElementById('xr-note') || {}).textContent || '',
        keys: (document.getElementById('keys') || {}).textContent || '',
        noteBox: (() => { const r = document.getElementById('xr-note').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), ih: window.innerHeight }; })(),
        chipGap: (() => {
          const chips = [...document.querySelectorAll('.climb-acts button')].map((b) => b.getBoundingClientRect()).sort((a, b) => a.left - b.left);
          return chips.slice(1).map((c, i) => Math.round(c.left - chips[i].right));
        })(),
      };
    })()`);
    check('the climb on a phone puts the orbit of 0 on the sphere',
      climbPhone.stageH >= 220 && climbPhone.scroll <= 1 && climbPhone.citeStarts && climbPhone.rowScroll <= 1
      && climbPhone.chips.length === 4 && climbPhone.chips.every((c) => c.right <= 392 && c.h >= 44)
      && climbPhone.chips.some((c) => c.text === 'Polar' && c.pressed === 'true')
      && /Where does the orbit of 0 go/.test(climbPhone.ask)
      && /climbs to the north pole/.test(climbPhone.caption) && /dust/.test(climbPhone.caption)
      && /Figure 2\.22/.test(climbPhone.badge) && /Theorem 4\.9/.test(climbPhone.badge)
      && /Figure 1\.15/.test(climbPhone.cite) && /Definition 1\.11/.test(climbPhone.cite)
      && /Exercise 14/.test(climbPhone.cite) && /Theorem 4\.9/.test(climbPhone.cite)
      && /Exercise 4/.test(climbPhone.cite) && /Exercise 8/.test(climbPhone.cite)
      && /does not number the sphere/.test(climbPhone.cite)
      && /not a third pane/.test(climbPhone.cite)
      && /Square, then slide is that step/.test(climbPhone.cite)
      && /does not number that arrival/.test(climbPhone.badge)
      && /On the climb/.test(climbPhone.keys)
      && climbPhone.threads.join() === 'T1,T2,F1,F2'
      && !climbPhone.doors.some((d) => /other pane/.test(d))
      && climbPhone.xr === 'untried' && /headset was not used/.test(climbPhone.note)
      && climbPhone.noteBox.top >= 0 && climbPhone.noteBox.bottom <= climbPhone.noteBox.ih && climbPhone.noteBox.h >= 12
      && climbPhone.chipGap.every((g) => g >= 12),
      JSON.stringify(climbPhone));
    const climbPolarWords = await evalJson(live.send, `window.__fateWords || []`);
    check('the phone sphere names the leaving walk',
      climbPolarWords.includes('climbs') && climbPolarWords.includes('north pole'),
      JSON.stringify(climbPolarWords));
    await shot(live.send, '/opt/cursor/artifacts/l17-climb-390.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l17-climb-390.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="climbstay"]').click()` });
    await waitFor(live.send, `/stays off the north pole/.test(document.getElementById('caption').textContent || '')`, 15000);
    const climbStay = await evalJson(live.send, `(() => ({
      caption: document.getElementById('caption').textContent || '',
      badge: document.getElementById('badge').textContent || '',
      pressed: (document.querySelector('[data-act="climbstay"]') || {}).getAttribute('aria-pressed') || '',
    }))()`);
    check('stay on the climb is Exercise 4 and the orbit never reaches the pole',
      /stays off the north pole/.test(climbStay.caption) && /one piece/.test(climbStay.caption)
      && /Exercise 4 is the disk/.test(climbStay.badge) && /stays off the north pole/.test(climbStay.badge)
      && !/climbs to the north pole/.test(climbStay.caption) && climbStay.pressed === 'true',
      JSON.stringify(climbStay));
    const climbStayWord = await evalJson(live.send, `window.__fateWords || []`);
    check('the phone sphere names the staying walk',
      climbStayWord.includes('stays'),
      JSON.stringify(climbStayWord));
    await shot(live.send, '/opt/cursor/artifacts/mid-l17-climb-stay-390.png');
    await live.send('Runtime.evaluate', { expression: `window.__fateWords = []` });
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="climbcusp"]').click()` });
    await waitFor(live.send, `/approaches 1\\/2/.test(document.getElementById('caption').textContent || '')`, 15000);
    const climbCusp = await evalJson(live.send, `(() => ({
      caption: document.getElementById('caption').textContent || '',
      badge: document.getElementById('badge').textContent || '',
    }))()`);
    check('the cusp on the climb approaches 1/2 and does not reach the pole',
      /approaches 1\/2/.test(climbCusp.caption) && /does not reach the north pole/.test(climbCusp.caption)
      && /one piece/.test(climbCusp.caption)
      && /not Settles/.test(climbCusp.badge) && /Exercise 8/.test(climbCusp.badge)
      && /one piece/.test(climbCusp.badge)
      && !/Settles/.test(climbCusp.caption),
      JSON.stringify(climbCusp));
    const climbCuspWord = await evalJson(live.send, `window.__fateWords || []`);
    check('the phone sphere names the cusp approach and does not call it Settles',
      climbCuspWord.includes('approaches') && !climbCuspWord.includes('climbs'),
      JSON.stringify(climbCuspWord));
    await shot(live.send, '/opt/cursor/artifacts/mid-l17-climb-cusp-390.png');
    await live.send('Runtime.evaluate', { expression: `window.__fateWords = []` });
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="climbpast"]').click()` });
    await waitFor(live.send, `/climbs to the north pole/.test(document.getElementById('caption').textContent || '') && document.getElementById('stage').getBoundingClientRect().width < 500`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/l17-climb-past-390.png');
    const climbPastWord = await evalJson(live.send, `window.__fateWords || []`);
    check('the past-1/4 phone names climbs with room off the arc',
      climbPastWord.includes('climbs') && climbPastWord.includes('north pole'),
      JSON.stringify(climbPastWord));
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="climbpolar"]').click()` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'climb' && document.getElementById('stage').getBoundingClientRect().width > 1000 && /climbs to the north pole/.test(document.getElementById('caption').textContent || '')`, 15000);
    const climbWide = await evalJson(live.send, `(() => {
      const row = document.getElementById('places');
      return {
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        rowScroll: row.scrollWidth - row.clientWidth,
        label: (document.getElementById('pg-link-bulbs') || {}).textContent || '',
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
      };
    })()`);
    check('the climb on a wide window keeps the doors on the glass',
      climbWide.scroll <= 1 && climbWide.rowScroll <= 1 && /Cardioid/.test(climbWide.label)
      && /Where does the orbit of 0 go/.test(climbWide.ask),
      JSON.stringify(climbWide));
    await shot(live.send, '/opt/cursor/artifacts/l17-climb-1280.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l17-climb-1280.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="climbpast"]').click()` });
    await waitFor(live.send, `/climbs to the north pole/.test(document.getElementById('caption').textContent || '') && /dust/.test(document.getElementById('caption').textContent || '')`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/mid-l17-climb-past-1280.png');
    await assertFrozen(live.send, 'a still climb does not repaint');
    const climbHash = await openPage(started.browserWs);
    await climbHash.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.removeItem('pg.state.v1');localStorage.removeItem('pg.learner.v1');}catch(e){}`,
    });
    await climbHash.send('Page.navigate', { url: `http://127.0.0.1:${port}/playground.html#climb` });
    await waitFor(climbHash.send, `document.documentElement.dataset.view === 'climb' && document.documentElement.dataset.ready === '1' && /orbit of 0/.test(document.getElementById('caption').textContent || '')`, 25000);
    const climbLocked = await evalJson(climbHash.send, `(() => ({
      view: document.documentElement.dataset.view || '',
      level: window.__pg.level,
      xr: document.documentElement.dataset.xrProof || '',
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
    }))()`);
    check('a hash opens the climb while the assembler is still locked',
      climbLocked.view === 'climb' && climbLocked.level === 0 && /Where does the orbit of 0 go/.test(climbLocked.ask) && climbLocked.xr === 'untried',
      JSON.stringify(climbLocked));
    climbHash.close();
    await live.send('Page.bringToFront');
    const fall = {
      v: 'pg/1', key: 'newton/fall/basin/nudge/roll/none', level: 18, seed: 0,
      map: { kind: 'newton', c: [0.45, 0.35], d: 3 },
      view: { kind: 'fall', window: { cx: 0, cy: 0, span: 3 }, guess: [0.45, 0.35] },
      colour: 'basin', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: null, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `(() => {
      window.__fallWords = [];
      if (window.__fallHook) return;
      window.__fallHook = true;
      const orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
        if (text === 'the basins' || text === 'the sphere' || text === 'the set of c' || text === 'the Julia set' || text === 'not a root' || text === 'step breaks') {
          window.__fallWords.push(text);
        }
        return orig.call(this, text, x, y);
      };
    })()` });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(fall)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'fall' && document.documentElement.dataset.phase === 'idle' && /falls to a root/.test(document.getElementById('caption').textContent || '')`, 25000);
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await waitFor(live.send, `document.documentElement.dataset.view === 'fall' && document.getElementById('stage').getBoundingClientRect().width < 500 && document.documentElement.dataset.phase === 'idle'`, 15000);
    const fallPhone = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const chips = [...document.querySelectorAll('.fall-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) };
      });
      return {
        stageH: Math.round(stage.height),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        cite: (document.getElementById('cite') || {}).textContent || '',
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
        doors: [...document.querySelectorAll('#places a')].map((a) => a.textContent),
        xr: document.documentElement.dataset.xrProof || '',
        note: (document.getElementById('xr-note') || {}).textContent || '',
        keys: (document.getElementById('keys') || {}).textContent || '',
        chips,
        tex: (document.querySelector('#formula annotation') || {}).textContent || '',
        words: window.__fallWords || [],
        noteBox: (() => { const r = document.getElementById('xr-note').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), ih: window.innerHeight }; })(),
      };
    })()`);
    const fallCubes = (fallPhone.tex.match(/z\^\{3\}/g) || []).length;
    check('the fall on a phone sets Newton beside the sphere',
      fallPhone.stageH >= 200 && fallPhone.scroll <= 1
      && /Which root does this guess fall to/.test(fallPhone.ask)
      && /Equation \(1\.43\)/.test(fallPhone.cite) && /Figure 4\.3, page 112/.test(fallPhone.cite)
      && /does not number Newton/.test(fallPhone.cite)
      && /The left pane is the basins/.test(fallPhone.cite)
      && fallPhone.threads.join() === 'T2,T3,F3'
      && !fallPhone.threads.includes('T1') && !fallPhone.threads.includes('F1') && !fallPhone.threads.includes('F2')
      && fallPhone.doors.join(',') === 'Map,Newton,Roots,Move,Sphere'
      && fallPhone.chips.length === 7 && fallPhone.chips.every((c) => c.h >= 44 && c.w >= 44)
      && fallPhone.xr === 'untried' && /headset was not used/.test(fallPhone.note)
      && fallPhone.noteBox.top >= 0 && fallPhone.noteBox.bottom <= fallPhone.noteBox.ih && fallPhone.noteBox.h >= 12
      && fallPhone.chips.every((c) => c.h <= 48)
      && /On the fall/.test(fallPhone.keys)
      && fallCubes === 1 && fallPhone.tex.includes('z^{2}')
      && fallPhone.words.includes('the basins') && fallPhone.words.includes('the sphere')
      && !fallPhone.words.includes('the set of c') && !fallPhone.words.includes('the Julia set'),
      JSON.stringify(fallPhone));
    await shot(live.send, '/opt/cursor/artifacts/l18-fall-390.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l18-fall-open-390.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="fallfar"]').click()` });
    await waitFor(live.send, `/falls inward/.test(document.getElementById('badge').textContent || '')`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/mid-l18-fall-far-390.png');
    await live.send('Runtime.evaluate', { expression: `window.__fallWords = []` });
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="fall0"]').click()` });
    await waitFor(live.send, `/step breaks at 0/.test(document.getElementById('caption').textContent || '')`, 15000);
    const fallZeroWords = await evalJson(live.send, `window.__fallWords || []`);
    check('zero on the fall says the step breaks and the pole is not a root',
      fallZeroWords.includes('step breaks') && fallZeroWords.includes('not a root')
      && !fallZeroWords.includes('the set of c') && !fallZeroWords.includes('the Julia set'),
      JSON.stringify(fallZeroWords));
    await shot(live.send, '/opt/cursor/artifacts/l18-fall-zero-390.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l18-fall-zero-390.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Runtime.evaluate', { expression: `window.__fallWords = []; window.__pg.watch(${JSON.stringify(fall)})` });
    await waitFor(live.send, `document.getElementById('stage').getBoundingClientRect().width > 1000 && document.documentElement.dataset.phase === 'idle' && /The walk falls to a root of 1/.test(document.getElementById('badge').textContent || '')`, 25000);
    const fallWideOpen = await evalJson(live.send, `window.__fallWords || []`);
    check('the wide opening names the basins and the sphere',
      fallWideOpen.includes('the basins') && fallWideOpen.includes('the sphere')
      && !fallWideOpen.includes('the set of c') && !fallWideOpen.includes('the Julia set'),
      JSON.stringify(fallWideOpen));
    await shot(live.send, '/opt/cursor/artifacts/mid-l18-fall-open-1280.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="fallfar"]').click()` });
    await waitFor(live.send, `document.getElementById('stage').getBoundingClientRect().width > 1000 && /falls inward/.test(document.getElementById('badge').textContent || '')`, 15000);
    await shot(live.send, '/opt/cursor/artifacts/mid-l18-fall-far-1280.png');
    await live.send('Runtime.evaluate', { expression: `window.__fallWords = []` });
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="fall0"]').click()` });
    await waitFor(live.send, `document.getElementById('stage').getBoundingClientRect().width > 1000 && /step breaks at 0/.test(document.getElementById('caption').textContent || '')`, 15000);
    const fallWideZero = await evalJson(live.send, `window.__fallWords || []`);
    check('the wide zero names the break, and the pole is not a root',
      fallWideZero.includes('step breaks') && fallWideZero.includes('not a root')
      && !fallWideZero.includes('the Julia set') && !fallWideZero.includes('the set of c'),
      JSON.stringify(fallWideZero));
    await shot(live.send, '/opt/cursor/artifacts/mid-l18-fall-zero-1280.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="fallfar"]').click()` });
    await waitFor(live.send, `document.getElementById('stage').getBoundingClientRect().width > 1000 && /falls to a root/.test(document.getElementById('caption').textContent || '')`, 15000);
    const fallWide = await evalJson(live.send, `(() => {
      const chips = [...document.querySelectorAll('.fall-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height) };
      });
      return {
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        xr: document.documentElement.dataset.xrProof || '',
        chips,
        noteBox: (() => { const r = document.getElementById('xr-note').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), ih: window.innerHeight }; })(),
        chipGap: (() => {
          const chips = [...document.querySelectorAll('.fall-acts button')].map((b) => b.getBoundingClientRect()).sort((a, b) => a.left - b.left || a.top - b.top);
          const gaps = [];
          for (let i = 1; i < chips.length; i++) {
            if (Math.abs(chips[i].top - chips[i - 1].top) < 8) gaps.push(Math.round(chips[i].left - chips[i - 1].right));
          }
          return gaps;
        })(),
      };
    })()`);
    check('the fall on a wide window keeps the guess chips at a tap',
      fallWide.scroll <= 1 && /Which root does this guess fall to/.test(fallWide.ask)
      && fallWide.xr === 'untried'
      && fallWide.chips.length === 7 && fallWide.chips.every((c) => c.w >= 44 && c.h >= 44 && c.h <= 48)
      && fallWide.noteBox.top >= 0 && fallWide.noteBox.bottom <= fallWide.noteBox.ih && fallWide.noteBox.h >= 12
      && fallWide.chipGap.length >= 1 && fallWide.chipGap.every((g) => g >= 12),
      JSON.stringify(fallWide));
    await shot(live.send, '/opt/cursor/artifacts/l18-fall-1280.png');
    const fallHash = await openPage(started.browserWs);
    await fallHash.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.removeItem('pg.state.v1');localStorage.removeItem('pg.learner.v1');}catch(e){}`,
    });
    await fallHash.send('Page.navigate', { url: `http://127.0.0.1:${port}/playground.html#fall` });
    await waitFor(fallHash.send, `document.documentElement.dataset.view === 'fall' && document.documentElement.dataset.ready === '1' && /root/.test(document.getElementById('caption').textContent || '')`, 25000);
    const fallLocked = await evalJson(fallHash.send, `(() => ({
      view: document.documentElement.dataset.view || '',
      level: window.__pg.level,
      xr: document.documentElement.dataset.xrProof || '',
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
    }))()`);
    check('a hash opens the fall while the assembler is still locked',
      fallLocked.view === 'fall' && fallLocked.level === 0 && /root/.test(fallLocked.ask) && fallLocked.xr === 'untried',
      JSON.stringify(fallLocked));
    fallHash.close();
    await live.send('Page.bringToFront');
    const lean = {
      v: 'pg/1', key: 'newton/lean/basin/nudge/roll/none', level: 19, seed: 42,
      map: { kind: 'newton', c: [0.5, 0], d: 2 },
      view: { kind: 'lean', window: { cx: 0, cy: 0, span: 3 }, guess: [0.2, 0.55] },
      colour: 'basin', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: null, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `(() => {
      window.__leanWords = [];
      if (window.__leanHook) return;
      window.__leanHook = true;
      const orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
        if (text === 'the basins' || text === 'the sphere' || text === 'the set of c' || text === 'the Julia set' || text === 'not a root' || text === 'step breaks') {
          window.__leanWords.push(text);
        }
        return orig.call(this, text, x, y);
      };
    })()` });
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await live.send('Runtime.evaluate', { expression: `window.__leanWords = []; window.__pg.watch(${JSON.stringify(lean)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'lean' && document.getElementById('stage').getBoundingClientRect().width < 500 && document.documentElement.dataset.phase === 'idle' && /roots lean/.test(document.getElementById('caption').textContent || '')`, 25000);
    const leanPhone = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const chips = [...document.querySelectorAll('.lean-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), top: Math.round(r.top) };
      });
      const note = document.getElementById('xr-note').getBoundingClientRect();
      const gaps = [];
      const ordered = chips.slice().sort((a, b) => a.top - b.top || a.right - b.right);
      for (let i = 1; i < ordered.length; i++) {
        if (Math.abs(ordered[i].top - ordered[i - 1].top) < 8) gaps.push((ordered[i].right - ordered[i].w) - ordered[i - 1].right);
      }
      return {
        stageH: Math.round(stage.height),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        cite: (document.getElementById('cite') || {}).textContent || '',
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
        doors: [...document.querySelectorAll('#places a')].map((a) => a.textContent),
        xr: document.documentElement.dataset.xrProof || '',
        note: (document.getElementById('xr-note') || {}).textContent || '',
        noteBox: { top: Math.round(note.top), bottom: Math.round(note.bottom), h: Math.round(note.height), ih: window.innerHeight },
        keys: (document.getElementById('keys') || {}).textContent || '',
        chips,
        gaps,
        words: window.__leanWords || [],
      };
    })()`);
    check('the lean on a phone sets a leaning cubic beside the sphere',
      leanPhone.stageH >= 200 && leanPhone.scroll <= 1
      && /once the roots lean/.test(leanPhone.ask)
      && /Equation \(1\.43\)/.test(leanPhone.cite) && /Figure 4\.3, page 112/.test(leanPhone.cite)
      && /Example 4\.7, page 110/.test(leanPhone.cite)
      && /does not number this cubic/.test(leanPhone.cite)
      && /does not number Newton/.test(leanPhone.cite)
      && /staircase badge is on only then/.test(leanPhone.cite)
      && /It moves when c moves/.test(leanPhone.cite)
      && leanPhone.threads.join() === 'T3,F3'
      && !leanPhone.threads.includes('T2') && !leanPhone.threads.includes('T1') && !leanPhone.threads.includes('F1') && !leanPhone.threads.includes('F2')
      && leanPhone.doors.join(',') === 'Map,Newton,Roots,Move,Sphere'
      && leanPhone.chips.length === 5 && leanPhone.chips.every((c) => c.h >= 44 && c.h <= 48 && c.w >= 44 && c.right <= 392)
      && leanPhone.gaps.every((g) => g >= 12)
      && leanPhone.xr === 'untried' && /headset was not used/.test(leanPhone.note)
      && leanPhone.noteBox.top >= 0 && leanPhone.noteBox.bottom <= leanPhone.noteBox.ih && leanPhone.noteBox.h >= 12
      && /On the lean/.test(leanPhone.keys)
      && leanPhone.words.includes('the basins') && leanPhone.words.includes('the sphere') && leanPhone.words.includes('not a root')
      && !leanPhone.words.includes('the set of c') && !leanPhone.words.includes('the Julia set'),
      JSON.stringify(leanPhone));
    await shot(live.send, '/opt/cursor/artifacts/l19-lean-390.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="leaneq"]').click()` });
    await waitFor(live.send, `/equally spaced/.test(document.getElementById('caption').textContent || '') && /z³ − 1/.test((document.querySelector('#formula .ask-q') || {}).textContent || '')`, 15000);
    const leanEqual = await evalJson(live.send, `(() => ({
      threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
      doors: [...document.querySelectorAll('#places a')].map((a) => a.textContent),
    }))()`);
    check('equal spacing wears the staircase, and the question names z³ − 1',
      leanEqual.threads.join() === 'T2,T3,F3'
      && /z³ − 1/.test(leanEqual.ask)
      && leanEqual.doors.join(',') === 'Map,Newton,Roots,Move,Sphere',
      JSON.stringify(leanEqual));
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="leanmid"]').click()` });
    await waitFor(live.send, `/roots lean/.test(document.getElementById('caption').textContent || '') && [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join() === 'T3,F3'`, 15000);
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="leanline"]').click()` });
    await waitFor(live.send, `/sit on a line/.test(document.getElementById('caption').textContent || '') && [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join() === 'T3,F3'`, 15000);
    const leanLine = await evalJson(live.send, `(() => ({
      threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
      doors: [...document.querySelectorAll('#places a')].map((a) => a.textContent),
    }))()`);
    check('a line of roots drops the staircase and keeps the same doors',
      leanLine.threads.join() === 'T3,F3'
      && /sit on a line/.test(leanLine.ask)
      && leanLine.doors.join(',') === 'Map,Newton,Roots,Move,Sphere',
      JSON.stringify(leanLine));
    await live.send('Runtime.evaluate', { expression: `window.__leanWords = []` });
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="leanbrk"]').click()` });
    await waitFor(live.send, `/step breaks/.test(document.getElementById('caption').textContent || '') && [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join() === 'T3,F3'`, 15000);
    const leanBreak = await evalJson(live.send, `(() => ({
      words: window.__leanWords || [],
      threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
    }))()`);
    check('the break on the lean names the step and keeps the pole off the roots',
      leanBreak.words.includes('step breaks') && leanBreak.words.includes('not a root')
      && leanBreak.threads.join() === 'T3,F3',
      JSON.stringify(leanBreak));
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="leaneq"]').click()` });
    await waitFor(live.send, `/equally spaced/.test(document.getElementById('caption').textContent || '') && [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join() === 'T2,T3,F3'`, 15000);
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="leanbrk"]').click()` });
    await waitFor(live.send, `/step breaks/.test(document.getElementById('caption').textContent || '') && /Why does the step break here/.test((document.querySelector('#formula .ask-q') || {}).textContent || '') && [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join() === 'T2,T3,F3'`, 15000);
    const leanEqualBreak = await evalJson(live.send, `(() => ({
      threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
    }))()`);
    check('a break at c = 1 keeps the staircase, because the roots are still equally spaced',
      leanEqualBreak.threads.join() === 'T2,T3,F3'
      && /Why does the step break here/.test(leanEqualBreak.ask),
      JSON.stringify(leanEqualBreak));
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Runtime.evaluate', { expression: `window.__leanWords = []; window.__pg.watch(${JSON.stringify(lean)})` });
    await waitFor(live.send, `document.getElementById('stage').getBoundingClientRect().width > 1000 && document.documentElement.dataset.phase === 'idle' && /roots lean/.test(document.getElementById('caption').textContent || '')`, 25000);
    const leanWide = await evalJson(live.send, `(() => {
      const chips = [...document.querySelectorAll('.lean-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
      }).sort((a, b) => a.top - b.top || a.left - b.left);
      const gaps = [];
      for (let i = 1; i < chips.length; i++) {
        if (Math.abs(chips[i].top - chips[i - 1].top) < 8) gaps.push(chips[i].left - (chips[i - 1].left + chips[i - 1].w));
      }
      const note = document.getElementById('xr-note').getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        xr: document.documentElement.dataset.xrProof || '',
        chips, gaps,
        noteBox: { top: Math.round(note.top), bottom: Math.round(note.bottom), h: Math.round(note.height), ih: window.innerHeight },
        words: window.__leanWords || [],
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
      };
    })()`);
    check('the lean on a wide window keeps the chips and the headset on the glass',
      leanWide.scroll <= 1 && /once the roots lean/.test(leanWide.ask)
      && leanWide.threads.join() === 'T3,F3'
      && leanWide.xr === 'untried'
      && leanWide.chips.length === 5 && leanWide.chips.every((c) => c.w >= 44 && c.h >= 44 && c.h <= 48)
      && leanWide.gaps.every((g) => g >= 12)
      && leanWide.noteBox.top >= 0 && leanWide.noteBox.bottom <= leanWide.noteBox.ih && leanWide.noteBox.h >= 12
      && leanWide.words.includes('the basins') && leanWide.words.includes('the sphere') && leanWide.words.includes('not a root'),
      JSON.stringify(leanWide));
    await shot(live.send, '/opt/cursor/artifacts/l19-lean-1280.png');
    const leanHash = await openPage(started.browserWs);
    await leanHash.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.removeItem('pg.state.v1');localStorage.removeItem('pg.learner.v1');}catch(e){}`,
    });
    await leanHash.send('Page.navigate', { url: `http://127.0.0.1:${port}/playground.html#lean` });
    await waitFor(leanHash.send, `document.documentElement.dataset.view === 'lean' && document.documentElement.dataset.ready === '1' && /root/.test(document.getElementById('caption').textContent || '')`, 25000);
    const leanLocked = await evalJson(leanHash.send, `(() => ({
      view: document.documentElement.dataset.view || '',
      level: window.__pg.level,
      xr: document.documentElement.dataset.xrProof || '',
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
    }))()`);
    check('a hash opens the lean while the assembler is still locked',
      leanLocked.view === 'lean' && leanLocked.level === 0 && /root/.test(leanLocked.ask) && leanLocked.xr === 'untried',
      JSON.stringify(leanLocked));
    leanHash.close();
    await live.send('Page.bringToFront');
    const warp = {
      v: 'pg/1', key: 'julia/warp/smooth/nudge/roll/none', level: 20, seed: 20,
      map: { kind: 'julia', c: [1, 0], d: 2 },
      view: { kind: 'warp', window: { cx: 0, cy: 0, span: 3.2 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(warp)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'warp' && document.documentElement.dataset.phase === 'idle' && /sphere/.test((document.querySelector('#formula .ask-q') || {}).textContent || '')`, 25000);
    const warpPhone = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom');
      const fr = foot.getBoundingClientRect();
      const note = document.getElementById('xr-note').getBoundingClientRect();
      const cite = document.getElementById('cite');
      const chips = [...document.querySelectorAll('.warp-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), pressed: b.getAttribute('aria-pressed') };
      }).sort((a, b) => a.top - b.top || a.left - b.left);
      const gaps = [];
      for (let i = 1; i < chips.length; i++) {
        if (Math.abs(chips[i].top - chips[i - 1].top) < 8) gaps.push(chips[i].left - (chips[i - 1].left + chips[i - 1].w));
      }
      const doors = [...document.querySelectorAll('#places a')].map((a) => ({
        text: a.textContent,
        label: a.getAttribute('aria-label') || '',
        top: a.getBoundingClientRect().top,
        w: Math.round(a.getBoundingClientRect().width),
      }));
      return {
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        cite: cite.textContent || '',
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread),
        doors: doors.map((d) => d.text).join(','),
        doorW: doors.map((d) => d.w),
        labels: doors.map((d) => d.label).join('|'),
        doorTop: doors.length ? Math.round(Math.min(...doors.map((d) => d.top))) : 0,
        stageBottom: Math.round(stage.bottom),
        stageH: Math.round(stage.height),
        overlap: Math.round(stage.bottom - fr.top),
        chips, gaps,
        xr: document.documentElement.dataset.xrProof || '',
        note: (document.getElementById('xr-note') || {}).textContent || '',
        noteBottom: Math.round(note.bottom),
        noteH: Math.round(note.height),
        ih: window.innerHeight,
        fold: document.documentElement.dataset.cite || '',
        chip1: (document.querySelector('[data-act="warp1"]') || {}).getAttribute ? document.querySelector('[data-act="warp1"]').getAttribute('aria-label') : '',
        t1: (document.querySelector('#pg-thread-T1') || {}).title || '',
        storyTitle: (document.querySelector('#pg-link-story') || {}).title || '',
        hint: (document.querySelector('#controls .hint') || {}).textContent || '',
      };
    })()`);
    console.log('warp 390', JSON.stringify(warpPhone));
    check('at 390 the warp keeps the chart, the headset, and the doors off the picture',
      warpPhone.stageH >= 300 && warpPhone.overlap <= 1
      && /Where does this point sit/.test(warpPhone.ask)
      && warpPhone.threads.join() === ''
      && warpPhone.doors === 'Map,Sphere,Length,4D'
      && warpPhone.doorW.length === 4 && warpPhone.doorW.every((w) => w >= 44)
      && warpPhone.labels.includes('Story Map') && warpPhone.labels.includes('Sphere') && warpPhone.labels.includes('Length')
      && warpPhone.doorTop >= warpPhone.stageBottom - 1
      && warpPhone.chips.length === 4 && warpPhone.chips.every((c) => c.h >= 44 && c.h <= 46)
      && warpPhone.chips.some((c) => c.text === '1' && c.pressed === 'true')
      && warpPhone.gaps.length >= 3 && warpPhone.gaps.every((g) => g >= 12)
      && warpPhone.fold === 'fold'
      && warpPhone.cite.startsWith('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.')
      && /Figure 2\.22/.test(warpPhone.cite) && /Exercise 14/.test(warpPhone.cite)
      && /curvature is 4/.test(warpPhone.cite) && /No exercise numbers the distance/.test(warpPhone.cite)
      && /does not draw that pair/.test(warpPhone.cite) && /Chapter 9/.test(warpPhone.cite)
      && /No exercise numbers that distance/.test(warpPhone.chip1) && /Exercise 14 is the coordinates/.test(warpPhone.chip1)
      && warpPhone.t1 === ''
      && /Test 2 map/.test(warpPhone.storyTitle)
      && /Chapter 9/.test(warpPhone.hint) && /Exercise 2/.test(warpPhone.hint)
      && warpPhone.xr === 'untried' && warpPhone.note.includes('stays in the void') && warpPhone.note.includes('was not used')
      && warpPhone.noteBottom <= warpPhone.ih && warpPhone.noteH >= 12,
      JSON.stringify(warpPhone));
    await shot(live.send, '/opt/cursor/artifacts/l20-warp-390.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l20-warp-390.png');
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="warppole"]').click()` });
    await waitFor(live.send, `/corners one point/.test((document.querySelector('#formula .ask-q') || {}).textContent || '')`, 8000);
    const warpPole = await evalJson(live.send, `(() => ({
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
      threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join(),
      pressed: (document.querySelector('[data-act="warppole"]') || {}).getAttribute ? document.querySelector('[data-act="warppole"]').getAttribute('aria-pressed') : '',
    }))()`);
    check('the pole chip names the one point in the corners',
      /Why are the corners one point/.test(warpPole.ask) && warpPole.threads === '' && warpPole.pressed === 'true',
      JSON.stringify(warpPole));
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="warp0"]').click()` });
    await waitFor(live.send, `/Distance to 0 is 0\\. /.test((document.getElementById('badge') || {}).textContent || '') && /area scale is 1/.test((document.getElementById('badge') || {}).textContent || '')`, 8000);
    const warpZero = await evalJson(live.send, `(() => ({
      badge: (document.getElementById('badge') || {}).textContent || '',
      pressed: (document.querySelector('[data-act="warp0"]') || {}).getAttribute ? document.querySelector('[data-act="warp0"]').getAttribute('aria-pressed') : '',
    }))()`);
    check('the origin chip says the distance is 0 and the area scale is 1',
      warpZero.badge.startsWith('Distance to 0 is 0. ')
      && /The area scale is 1/.test(warpZero.badge)
      && !/e\+/.test(warpZero.badge)
      && warpZero.pressed === 'true',
      JSON.stringify(warpZero));
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(warp)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'warp' && document.getElementById('stage').getBoundingClientRect().width > 1000 && document.documentElement.dataset.phase === 'idle'`, 25000);
    const warpWide = await evalJson(live.send, `(() => {
      const chips = [...document.querySelectorAll('.warp-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
      }).sort((a, b) => a.top - b.top || a.left - b.left);
      const gaps = [];
      for (let i = 1; i < chips.length; i++) {
        if (Math.abs(chips[i].top - chips[i - 1].top) < 8) gaps.push(chips[i].left - (chips[i - 1].left + chips[i - 1].w));
      }
      const note = document.getElementById('xr-note').getBoundingClientRect();
      const stage = document.getElementById('stage').getBoundingClientRect();
      const doors = [...document.querySelectorAll('#places a')].map((a) => a.textContent);
      return {
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join(),
        doors: doors.join(','),
        chips, gaps,
        xr: document.documentElement.dataset.xrProof || '',
        noteBottom: Math.round(note.bottom),
        noteH: Math.round(note.height),
        ih: window.innerHeight,
        stageH: Math.round(stage.height),
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);
    console.log('warp 1280', JSON.stringify(warpWide));
    check('the warp on a wide window keeps one point on both panes',
      warpWide.scroll <= 1 && warpWide.stageH >= 270
      && /Where does this point sit/.test(warpWide.ask)
      && warpWide.threads === ''
      && warpWide.doors.includes('Story Map') && warpWide.doors.includes('Sphere')
      && warpWide.chips.length === 4 && warpWide.chips.every((c) => c.w >= 44 && c.h >= 44 && c.h <= 48)
      && warpWide.gaps.every((g) => g >= 12)
      && warpWide.xr === 'untried'
      && warpWide.noteBottom <= warpWide.ih && warpWide.noteH >= 12,
      JSON.stringify(warpWide));
    await shot(live.send, '/opt/cursor/artifacts/l20-warp-1280.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l20-warp-1280.png');
    await live.send('Runtime.evaluate', { expression: `(() => { const s = document.querySelector('#cite summary'); if (!s) return; s.click(); s.scrollIntoView({ block: 'start' }); })()` });
    await shot(live.send, '/opt/cursor/artifacts/mid-l20-warp-book-1280.png');

    await live.send('Runtime.evaluate', { expression: `(() => {
      const a = document.getElementById('to-map');
      a.addEventListener('click', (e) => e.preventDefault(), true);
      a.click();
    })()` });
    const warpRemembered = await evalJson(live.send, `JSON.parse(localStorage.getItem('mv:map') || 'null')`);
    check('the warp header Story Map remembers Test 2', warpRemembered === 'test2', String(warpRemembered));
    await live.send('Runtime.evaluate', { expression: `(() => {
      localStorage.setItem('mv:map', JSON.stringify('test1'));
      const a = document.getElementById('pg-link-story');
      a.addEventListener('click', (e) => e.preventDefault(), true);
      a.click();
    })()` });
    const warpDoorRemembered = await evalJson(live.send, `JSON.parse(localStorage.getItem('mv:map') || 'null')`);
    check('the warp footer Story Map remembers Test 2', warpDoorRemembered === 'test2', String(warpDoorRemembered));
    const cross = {
      v: 'pg/1', key: 'julia/cross/smooth/nudge/roll/none', level: 21, seed: 21,
      map: { kind: 'julia', c: [0, 1], d: 2 },
      view: { kind: 'cross', window: { cx: -0.6, cy: 0, span: 3.2 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    };
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(cross)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'cross' && document.documentElement.dataset.phase === 'idle' && /each plane/.test((document.querySelector('#formula .ask-q') || {}).textContent || '')`, 25000);
    const crossWide = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom').getBoundingClientRect();
      const note = document.getElementById('xr-note').getBoundingClientRect();
      const chips = [...document.querySelectorAll('.cross-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height), pressed: b.getAttribute('aria-pressed') };
      });
      return {
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        cite: (document.getElementById('cite') || {}).textContent || '',
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join(),
        doors: [...document.querySelectorAll('#places a')].map((a) => a.textContent).join(','),
        story: (document.querySelector('#pg-link-story') || {}).title || '',
        chips,
        stageH: Math.round(stage.height),
        overlap: Math.round(stage.bottom - foot.top),
        xr: document.documentElement.dataset.xrProof || '',
        note: (document.getElementById('xr-note') || {}).textContent || '',
        noteBottom: Math.round(note.bottom),
        noteH: Math.round(note.height),
        ih: window.innerHeight,
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);
    console.log('cross 1280', JSON.stringify(crossWide));
    check('the crossing on a wide window is one number on both planes',
      crossWide.scroll <= 1 && crossWide.stageH >= 270 && crossWide.overlap <= 1
      && /each plane/.test(crossWide.ask)
      && crossWide.threads === 'F1,F2'
      && crossWide.doors.includes('Story Map') && crossWide.doors.includes('Mandelbrot') && crossWide.doors.includes('Julia') && crossWide.doors.includes('Orbit')
      && /Test 2 map/.test(crossWide.story)
      && /Figure 4\.6/.test(crossWide.cite) && /Theorem 4\.9/.test(crossWide.cite)
      && crossWide.chips.length === 4 && crossWide.chips.every((c) => c.w >= 44 && c.h >= 44 && c.h <= 48)
      && crossWide.chips.some((c) => c.text === 'i' && c.pressed === 'true')
      && crossWide.xr === 'untried' && crossWide.note.includes('stays in the void') && crossWide.note.includes('was not used')
      && crossWide.noteBottom <= crossWide.ih && crossWide.noteH >= 12,
      JSON.stringify(crossWide));
    await shot(live.send, '/opt/cursor/artifacts/l21-cross-1280.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l21-cross-1280.png');
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify(cross)})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'cross' && document.getElementById('stage').getBoundingClientRect().width < 420 && document.documentElement.dataset.phase === 'idle'`, 25000);
    const crossPhone = await evalJson(live.send, `(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const foot = document.querySelector('.chrome.bottom').getBoundingClientRect();
      const note = document.getElementById('xr-note').getBoundingClientRect();
      const chips = [...document.querySelectorAll('.cross-acts button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent, h: Math.round(r.height), pressed: b.getAttribute('aria-pressed'), right: Math.round(r.right) };
      });
      const doors = [...document.querySelectorAll('#places a')].map((a) => a.textContent);
      return {
        ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
        threads: [...document.querySelectorAll('#threads a')].map((a) => a.dataset.thread).join(),
        doors: doors.join(','),
        chips,
        stageH: Math.round(stage.height),
        overlap: Math.round(stage.bottom - foot.top),
        xr: document.documentElement.dataset.xrProof || '',
        noteBottom: Math.round(note.bottom),
        noteH: Math.round(note.height),
        ih: window.innerHeight,
        doorTop: Math.round(Math.min(...[...document.querySelectorAll('#places a')].map((a) => a.getBoundingClientRect().top))),
        stageBottom: Math.round(stage.bottom),
      };
    })()`);
    console.log('cross 390', JSON.stringify(crossPhone));
    check('at 390 the crossing keeps both planes and the doors off the picture',
      crossPhone.stageH >= 300 && crossPhone.overlap <= 1
      && /each plane/.test(crossPhone.ask)
      && crossPhone.threads === 'F1,F2'
      && crossPhone.doors === 'Map,Set,Julia,Orbit'
      && crossPhone.chips.length === 4 && crossPhone.chips.every((c) => c.h >= 44 && c.h <= 46 && c.right <= 390)
      && crossPhone.chips.some((c) => c.text === 'i' && c.pressed === 'true')
      && crossPhone.xr === 'untried'
      && crossPhone.noteBottom <= crossPhone.ih && crossPhone.noteH >= 12
      && crossPhone.doorTop >= crossPhone.stageBottom - 1,
      JSON.stringify(crossPhone));
    await shot(live.send, '/opt/cursor/artifacts/l21-cross-390.png');
    await shot(live.send, '/opt/cursor/artifacts/mid-l21-cross-390.png');

    const warpHash = await openPage(started.browserWs);
    await warpHash.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await warpHash.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try{localStorage.removeItem('pg.state.v1');localStorage.removeItem('pg.learner.v1');}catch(e){}`,
    });
    await warpHash.send('Page.navigate', { url: `http://127.0.0.1:${port}/playground.html#warp` });
    await waitFor(warpHash.send, `document.documentElement.dataset.view === 'warp' && document.documentElement.dataset.ready === '1' && /sphere/.test((document.querySelector('#formula .ask-q') || {}).textContent || '')`, 25000);
    const warpLocked = await evalJson(warpHash.send, `(() => ({
      view: document.documentElement.dataset.view || '',
      level: window.__pg.level,
      xr: document.documentElement.dataset.xrProof || '',
    }))()`);
    check('a hash opens the warp while the assembler is still locked',
      warpLocked.view === 'warp' && warpLocked.level === 0 && warpLocked.xr === 'untried',
      JSON.stringify(warpLocked));
    await warpHash.send('Runtime.evaluate', { expression: `location.hash = '#nope'` });
    const warpStayed = await evalJson(warpHash.send, `(() => ({
      view: document.documentElement.dataset.view || '',
      hash: location.hash,
      level: window.__pg.level,
    }))()`);
    check('an unknown hash leaves the room that is already open',
      warpStayed.view === 'warp' && warpStayed.hash === '#nope' && warpStayed.level === 0,
      JSON.stringify(warpStayed));
    await warpHash.send('Runtime.evaluate', { expression: `location.hash = '#lean'` });
    await waitFor(warpHash.send, `document.documentElement.dataset.view === 'lean' && document.documentElement.dataset.phase === 'idle' && /roots lean/.test((document.querySelector('#formula .ask-q') || {}).textContent || '')`, 25000);
    const leanSwitched = await evalJson(warpHash.send, `(() => ({
      view: document.documentElement.dataset.view || '',
      hash: location.hash,
      level: window.__pg.level,
      ask: (document.querySelector('#formula .ask-q') || {}).textContent || '',
    }))()`);
    check('a hash change switches to the lean in the same turn',
      leanSwitched.view === 'lean' && leanSwitched.hash === '#lean' && leanSwitched.level === 0 && /roots lean/.test(leanSwitched.ask),
      JSON.stringify(leanSwitched));
    await shot(warpHash.send, '/opt/cursor/artifacts/mid-l20-hash-lean-1280.png');
    await warpHash.send('Runtime.evaluate', { expression: `location.hash = '#warp'` });
    await waitFor(warpHash.send, `document.documentElement.dataset.view === 'warp' && /sphere/.test((document.querySelector('#formula .ask-q') || {}).textContent || '')`, 25000);
    const warpSwitched = await evalJson(warpHash.send, `(() => ({
      view: document.documentElement.dataset.view || '',
      hash: location.hash,
      level: window.__pg.level,
      xr: document.documentElement.dataset.xrProof || '',
    }))()`);
    check('a hash change switches back to the warp without unlocking it',
      warpSwitched.view === 'warp' && warpSwitched.hash === '#warp' && warpSwitched.level === 0 && warpSwitched.xr === 'untried',
      JSON.stringify(warpSwitched));
    await warpHash.send('Runtime.evaluate', { expression: `localStorage.setItem('mv:map', JSON.stringify('test2'))` });
    await warpHash.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html#home` });
    await waitFor(warpHash.send, `!!document.querySelector('.home-map') && !!document.querySelector('[data-station="pg-warp"]')`, 20000);
    await warpHash.send('Runtime.evaluate', { expression: `document.querySelector('[data-station="pg-warp"]').scrollIntoView({ block: 'center' })` });
    await shot(warpHash.send, '/opt/cursor/artifacts/mid-l20-map-1280.png');
    warpHash.close();
    await live.send('Page.bringToFront');
    // A second tab hides this page. The roll clock does not advance while hidden.
    await live.send('Page.bringToFront');
    await live.send('Runtime.evaluate', { expression: `window.__pg.watch(${JSON.stringify({
      v: 'pg/1', key: 'julia/pole/smooth/nudge/roll/none', level: 15, seed: 0,
      map: { kind: 'julia', c: [-2, 0], d: 2 },
      view: { kind: 'pole', window: { cx: -0.6, cy: 0, span: 3.2 }, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
    })})` });
    await waitFor(live.send, `document.documentElement.dataset.view === 'pole' && document.documentElement.dataset.phase === 'idle'`, 25000);
    await live.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await live.send('Runtime.evaluate', { expression: `document.querySelector('[data-act="raypair"]').click()` });
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
