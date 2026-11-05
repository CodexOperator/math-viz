// Headless check for the singing plane: the sentence flips, sound stays off until Hear,
// Mute suspends the context, and 360px does not scroll sideways.
// Run: node tools/hear-smoke.mjs

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
let failed = 0;

function check(name, cond, detail = '') {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name, detail);
  } else {
    console.log('ok  ', name);
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

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
  const bags = { exceptions: [], console: [], bad: [] };
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
      bags.console.push(msg.params.args?.map((a) => a.value || a.description).join(' '));
    }
    if (msg.method === 'Network.responseReceived') {
      const { response } = msg.params;
      if (response.status >= 400) bags.bad.push(`${response.status} ${response.url}`);
    }
  });
  const send = (method, params = {}) => {
    const id = ++next;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  return { ws, send, bags, close: () => ws.close() };
}

async function waitFor(send, expression, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.result?.value) return result.result.value;
    await new Promise((r) => setTimeout(r, 50));
  }
  const snap = await send('Runtime.evaluate', {
    expression: `document.body ? document.body.innerText.slice(0, 500) : 'no body'`,
    returnByValue: true,
  });
  throw new Error(`timeout: ${expression}\n${snap.result?.value || ''}`);
}

async function evalJson(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'eval failed');
  return result.result?.value;
}

async function shot(send, file) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(data, 'base64'));
}

async function click(send, selector) {
  const box = await evalJson(send, `(() => { const n = document.querySelector(${JSON.stringify(selector)}); const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  return box;
}

const dir = await mkdtemp(join(tmpdir(), 'hear-'));
const { server, port } = await serve();
const { chrome, browserWs } = await startChrome(dir);
try {
  const page = await openPage(browserWs, `http://127.0.0.1:${port}/hear.html`);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 2000, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.reload', { ignoreCache: true });
  await waitFor(page.send, 'window.__hear && document.getElementById("hear-map").innerText.includes("220")');
  const opened = await evalJson(page.send, 'window.__hear.state()');
  check('opens silent on tan, between the singularities', opened.preset === 'tan' && opened.claim === 'plain' && opened.armed === false && opened.audio === 'none' && opened.playing === false);
  const probe = await evalJson(page.send, '({ re: document.getElementById("stage").dataset.probeRe, im: document.getElementById("stage").dataset.probeIm, claim: document.getElementById("stage").dataset.claim })');
  check('the probe is one cell another page can read', probe.claim === 'plain' && Math.abs(Number(probe.re) - 0.72) < 1e-9 && Math.abs(Number(probe.im) - 0.55) < 1e-9, JSON.stringify(probe));
  const painted = await evalJson(page.send, `(() => { const c = document.getElementById('hear-color'); const p = c.getContext('2d').getImageData(8, 8, 1, 1).data; return { w: c.width, h: c.height, px: [p[0], p[1], p[2]] }; })()`);
  check('the plane is painted', painted.w > 200 && painted.h > 200 && painted.px.some((n) => n > 0), JSON.stringify(painted));

  await page.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 1400, deviceScaleFactor: 1, mobile: true });
  await new Promise((r) => setTimeout(r, 200));
  const narrow = await evalJson(page.send, `({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bsw: document.body.scrollWidth })`);
  check('360px does not scroll sideways', narrow.sw <= narrow.cw + 1 && narrow.bsw <= narrow.cw + 1, JSON.stringify(narrow));
  await shot(page.send, '/opt/cursor/artifacts/hear-360-silent.png');

  await page.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 2000, deviceScaleFactor: 1, mobile: false });
  await new Promise((r) => setTimeout(r, 250));
  await evalJson(page.send, 'window.__hear.setPoint(0.12, 0)');
  const atZero = await evalJson(page.send, 'window.__hear.state()');
  check('dragging onto the zero flips the sentence quiet', atZero.claim === 'zero' && atZero.gain < 0.02 && /zero/.test(atZero.text));
  await shot(page.send, '/opt/cursor/artifacts/hear-zero.png');

  await evalJson(page.send, `window.__hear.setPoint(${Math.PI / 2 - 0.1}, 0)`);
  const atPole = await evalJson(page.send, 'window.__hear.state()');
  check('dragging onto the pole flips the sentence to a climb and a beat', atPole.claim === 'pole' && atPole.gain > 0.08 && atPole.beatHz > 2 && atPole.beatKind === 'pole' && atPole.audio === 'none');
  await shot(page.send, '/opt/cursor/artifacts/hear-pole-silent.png');

  await click(page.send, '#hear-toggle');
  await waitFor(page.send, 'window.__hear.state().audio === "running" && window.__hear.state().playing === true');
  const hearing = await evalJson(page.send, 'window.__hear.state()');
  check('Hear starts the context and keeps the pole audible', hearing.armed === true && hearing.claim === 'pole' && hearing.playing === true);
  const label = await evalJson(page.send, 'document.getElementById("hear-toggle").textContent');
  check('the button says Mute once sound is on', label === 'Mute');
  await shot(page.send, '/opt/cursor/artifacts/hear-pole-hearing.png');

  await click(page.send, '#hear-toggle');
  await waitFor(page.send, 'window.__hear.state().armed === false');
  await new Promise((r) => setTimeout(r, 500));
  const muted = await evalJson(page.send, 'window.__hear.state()');
  check('Mute stops the note and suspends the context', muted.armed === false && muted.playing === false && (muted.audio === 'suspended' || muted.audio === 'closed'), muted.audio);

  await click(page.send, '#chip-exp');
  const exp = await evalJson(page.send, 'window.__hear.state()');
  check('e^z is the split ear, and it stays silent until Hear', exp.preset === 'exp' && exp.claim === 'exp-both' && exp.armed === false && exp.audio !== 'running');
  await shot(page.send, '/opt/cursor/artifacts/hear-exp.png');

  await click(page.send, '#chip-log');
  await evalJson(page.send, 'window.__hear.setPoint(-0.8, 0.02)');
  const cut = await evalJson(page.send, 'window.__hear.state()');
  check('Log on the cut says the pitch jumps', cut.preset === 'log' && cut.claim === 'log-cut');

  check('no console errors', page.bags.console.length === 0, page.bags.console.join(' | '));
  check('no exceptions', page.bags.exceptions.length === 0, page.bags.exceptions.join(' | '));
  check('no missing assets', page.bags.bad.length === 0, page.bags.bad.join(' | '));
  page.close();
} finally {
  chrome.kill();
  server.close();
  await new Promise((r) => setTimeout(r, 300));
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}

console.log(failed ? `${failed} failed` : 'hear smoke ok');
process.exit(failed ? 1 : 0);
