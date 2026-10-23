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
    deep: deep ? deep.textContent : '',
    xrHidden: xr ? xr.hidden : true,
    xrText: xr ? xr.textContent : '',
    canvas: host ? host.querySelectorAll('canvas').length : 0,
    webdriver: navigator.webdriver === true,
  };
})()`;

async function main() {
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
    check('a walk-level learner gets the parameter plane beside the set',
      beside.view === 'split-param' && beside.split === 'split-param' && beside.cite.includes('F2'),
      JSON.stringify({ view: beside.view, split: beside.split, cite: beside.cite, gpu: beside.gpu }));
    check('the split page has no console error', besideErr.exceptions.length === 0 && besideErr.console.length === 0,
      besideErr.exceptions.concat(besideErr.console).join(' | '));
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
    check('a refused headset leaves the shape in the void and the diary still rolls',
      refused.deep.includes('No headset session') && refused.deep.includes('stays in the void')
      && after.key.startsWith('julia/plane/') && (after.phase === 'roll' || after.phase === 'bake' || after.phase === 'settle' || after.phase === 'idle'),
      JSON.stringify({ deep: refused.deep, key: after.key, phase: after.phase, xr: refused.xrText }));
    check('the WebXR miss has no console error', xrErr.exceptions.length === 0 && xrErr.console.length === 0,
      xrErr.exceptions.concat(xrErr.console).join(' | '));
    xr.close();

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
