// Numeric exactness for the draw-and-map prototype, then a headless load of draw-map.html.
// node tools/draw-map-check.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  starterInk, mapInk, mapByFormula, describeProbe, contourReport, periodImage,
  inkFromStroke, squareReport, CELL,
} from '../js/draw-map/model.js';
import { Arg, abs, exp } from '../js/core/complex.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
let failed = 0;

function check(name, cond, detail = '') {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name, detail);
  } else {
    console.log('ok  ', name);
  }
}

const ink = starterInk();
check('starter is a shaded sector', ink.closed && ink.shape === 'sector' && ink.cells.length >= 20 && ink.cells.length <= 400, String(ink.cells.length));

const sq = mapByFormula('z^2');
const ex = mapByFormula('e^z');
const lg = mapByFormula('log(z)');
const alias = mapByFormula('exp( z )');
const custom = mapByFormula('sin(z)');
const bad = mapByFormula('z^');
check('aliases', sq.id === 'sq' && ex.id === 'exp' && lg.id === 'log' && alias.id === 'exp' && custom.id === 'custom' && bad.ok === false);

for (const spec of [sq, ex, lg, custom]) {
  const image = mapInk(ink, spec.f);
  check(spec.src + ' image matches f at every corner', image.exact && image.broken.length === 0, 'broken ' + image.broken.length);
}

const end = ink.path[ink.path.length - 1];
check('z^2 claim true on the sector arc', describeProbe('sq', end, sq.f).ok === true);
check('z^2 claim false at 0', describeProbe('sq', { re: 0, im: 0 }, sq.f).ok === false);
check('z^2 claim false past the orange ray', describeProbe('sq', { re: Math.cos(2), im: Math.sin(2) }, sq.f).ok === false);
check('e^z claim true inside the strip', describeProbe('exp', end, ex.f).ok === true);
check('e^z claim false above the strip', describeProbe('exp', { re: 0.2, im: Math.PI + 0.4 }, ex.f).ok === false);
check('Log claim true off the cut', describeProbe('log', end, lg.f).ok === true);
check('Log claim false on the cut', describeProbe('log', { re: -1, im: 0 }, lg.f).ok === false);
check('square collapses at 0 for z^2', squareReport({ re: 0, im: 0 }, sq.f).agrees === false);
check('square agrees on the arc for z^2', squareReport(end, sq.f).agrees === true);

let angleOk = true;
const zImage = mapInk(ink, sq.f);
for (const rec of zImage.quads) {
  for (let k = 0; k < 4; k++) {
    const z = rec.z[k];
    if (abs(z) < 1e-6) continue;
    const theta = Arg(z);
    if (Math.abs(theta) > Math.PI / 2) continue;
    const twice = 2 * theta;
    if (twice <= -Math.PI || twice > Math.PI) continue;
    if (Math.abs(Arg(rec.w[k]) - twice) > 1e-6) angleOk = false;
  }
}
check('every z^2 corner doubles the angle', angleOk);

const seg = [];
for (let k = 0; k <= 64; k++) seg.push({ re: 0, im: (Math.PI * k) / 64, t: k / 64 });
const integral = contourReport(seg, ex.f, 'exp');
const want = exp({ re: 0, im: Math.PI });
check('integral of e^z from 0 to i pi is -2', integral.gap != null && integral.gap < 1e-3 && Math.abs(want.re + 1) < 1e-9, String(integral.gap));

const arcSum = contourReport(ink.path, sq.f, 'sq');
check('sector arc matches z^3/3', arcSum.gap != null && arcSum.gap < 1e-3, String(arcSum.gap));

check('e^z period copy lands on the same point', periodImage(end, ex.f).same === true);
check('z^2 period copy does not', periodImage(end, sq.f).same === false);

const circle = [];
for (let k = 0; k <= 96; k++) {
  const t = 2 * Math.PI * k / 96;
  circle.push({ re: Math.cos(t), im: Math.sin(t) });
}
const loop = inkFromStroke(circle, { cell: CELL, closeRadius: 0.35 });
const loopImage = mapInk(loop, sq.f);
const loopSum = contourReport(loop.path, sq.f, 'sq');
check('a drawn loop shades and matches', loop.closed && loopImage.exact && loopSum.gap != null && loopSum.gap < 1e-3, 'closed ' + loop.closed + ' gap ' + loopSum.gap);

const cut = [];
for (let k = 0; k <= 24; k++) cut.push({ re: -1, im: 1 - (2 * k) / 24 });
const cutInk = inkFromStroke(cut, { cell: CELL, closeRadius: 0.05 });
const cutImage = mapInk(cutInk, lg.f);
check('Log withholds the quad that jumps the cut', cutImage.exact && cutImage.broken.length >= 1, 'broken ' + cutImage.broken.length);

if (failed) {
  console.error(failed + ' model checks failed');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

function serve(dir) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = normalize(join(dir, pathname));
      if (!file.startsWith(normalize(dir))) {
        res.writeHead(403);
        res.end('no');
        return;
      }
      const buf = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
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
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start\n' + buf)), 20000);
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

async function openPage(browserWs, url) {
  const port = new URL(browserWs).port;
  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
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
    if (msg.method === 'Runtime.exceptionThrown') bags.exceptions.push(msg.params.exceptionDetails?.text || 'exception');
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      bags.console.push((msg.params.args || []).map((a) => a.value || a.description).join(' '));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  return { ws, send, bags };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'eval failed';
    throw new Error(detail);
  }
  return result.result.value;
}

async function shot(send, name) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  const file = '/opt/cursor/artifacts/' + name + '.png';
  await mkdir('/opt/cursor/artifacts', { recursive: true });
  await writeFile(file, Buffer.from(result.data, 'base64'));
  console.log('shot', file);
}

const { server, port } = await serve(root);
const { chrome, browserWs } = await startChrome('/tmp/draw-map-chrome');
try {
  const { send, bags, ws } = await openPage(browserWs, `http://127.0.0.1:${port}/draw-map.html`);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 980, deviceScaleFactor: 1, mobile: false });
  await send('Page.reload', { ignoreCache: true });
  for (let i = 0; i < 50; i++) {
    const ready = await evaluate(send, 'document.getElementById("picture") && document.getElementById("picture").dataset.ready || ""');
    if (ready === 'true') break;
    await new Promise((r) => setTimeout(r, 100));
    if (i === 49) check('page painted', false);
  }
  const read = '() => { const d = document.getElementById("picture").dataset; return { exact: d.exact, claim: d.claim, fn: d.fn, cells: d.cells, closed: d.closed, periodSame: d.periodSame, riemannGap: d.riemannGap, shape: d.shape }; }';
  await evaluate(send, 'window.__drawMap.restore()');
  const starter = await evaluate(send, '(' + read + ')()');
  check('page exact on the sector', starter.exact === 'true' && starter.claim === 'true' && starter.fn === 'sq', JSON.stringify(starter));
  const claim = await evaluate(send, 'document.getElementById("claim").textContent');
  check('claim sentence is on the page', typeof claim === 'string' && claim.includes('twice'), claim);
  await shot(send, 'draw-map-z2');

  await evaluate(send, 'window.__drawMap.setFormula("log(z)")');
  const logged = await evaluate(send, '(' + read + ')()');
  check('Log keeps the same ink and matches', logged.exact === 'true' && logged.claim === 'true' && logged.fn === 'log' && logged.cells === starter.cells, logged.fn + ' ' + logged.claim);
  await shot(send, 'draw-map-log');

  await evaluate(send, 'window.__drawMap.setFormula("e^z")');
  const expo = await evaluate(send, '(' + read + ')()');
  check('e^z period copy sits on the image', expo.exact === 'true' && expo.claim === 'true' && expo.periodSame === 'true', JSON.stringify({ claim: expo.claim, period: expo.periodSame, gap: expo.riemannGap }));
  await shot(send, 'draw-map-exp');

  const high = [];
  for (let k = 0; k <= 48; k++) high.push({ re: 0.35, im: -3.3 + (6.6 * k) / 48 });
  await evaluate(send, 'window.__drawMap.stroke(' + JSON.stringify(high) + ')');
  const crossed = await evaluate(send, '({ claim: document.getElementById("picture").dataset.claim, exact: document.getElementById("picture").dataset.exact, fn: document.getElementById("picture").dataset.fn, text: document.getElementById("claim").textContent })');
  check('crossing the strip makes the sentence false', crossed.exact === 'true' && crossed.claim === 'false' && crossed.fn === 'exp' && crossed.text.includes('fundamental strip'), crossed.text);
  await shot(send, 'draw-map-exp-cross');

  await evaluate(send, 'window.__drawMap.setFormula("sin(z)")');
  const wall = [];
  for (let k = 0; k <= 40; k++) wall.push({ re: 0.7, im: -1.4 + (2.8 * k) / 40 });
  await evaluate(send, 'window.__drawMap.stroke(' + JSON.stringify(wall) + ')');
  const sine = await evaluate(send, '(' + read + ')()');
  check('a typed sin(z) still matches', sine.exact === 'true' && sine.fn === 'custom', sine.fn + ' ' + sine.exact);
  await shot(send, 'draw-map-sin');

  await evaluate(send, 'window.__drawMap.setFormula("z^")');
  const kept = await evaluate(send, '({ fn: document.getElementById("picture").dataset.fn, hint: document.getElementById("formula-hint").textContent, hidden: document.getElementById("formula-hint").hidden })');
  check('a bad formula keeps the previous map and shows a hint', kept.fn === 'custom' && kept.hidden === false && kept.hint.length > 0, kept.hint);

  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 1400, deviceScaleFactor: 1, mobile: true });
  await new Promise((r) => setTimeout(r, 200));
  await evaluate(send, 'window.__drawMap.restore()');
  await evaluate(send, 'window.__drawMap.setFormula("z^2")');
  const narrow = await evaluate(send, '({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, exact: document.getElementById("picture").dataset.exact })');
  check('360px does not scroll sideways', narrow.sw <= narrow.cw + 1 && narrow.exact === 'true', JSON.stringify(narrow));
  await shot(send, 'draw-map-360');

  check('no console errors', bags.console.length === 0 && bags.exceptions.length === 0, bags.console.concat(bags.exceptions).join(' | '));
  ws.close();
} finally {
  chrome.kill();
  server.close();
}

if (failed) {
  console.error(failed + ' checks failed');
  process.exit(1);
}
console.log('draw-map checks passed');
