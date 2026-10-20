#!/usr/bin/env node
// Scaffold the example config and load it in headless Chrome, including a subpath.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scaffold } from './scaffold.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const configPath = join(here, 'study-site.config.example.json');
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
  '.json': 'application/json',
};

function serve(root) {
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
    await new Promise((r) => setTimeout(r, 80));
  }
  const snap = await send('Runtime.evaluate', {
    expression: `document.body ? document.body.innerText.slice(0, 400) : 'no body'`,
    returnByValue: true,
  });
  throw new Error(`timeout: ${expression}\n${snap.result?.value || ''}`);
}

async function evalJson(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'eval failed');
  return result.result?.value;
}

async function go(send, url) {
  const target = new URL(url);
  const hash = decodeURIComponent(target.hash.replace(/^#/, ''));
  await send('Page.navigate', { url });
  await waitFor(send, `location.pathname === ${JSON.stringify(target.pathname)} && location.hash === ${JSON.stringify(target.hash)}`);
  const route = hash || 'home';
  await waitFor(send, `['ready','nosuchplace','error'].includes(document.querySelector('#view')?.dataset?.state) && document.querySelector('#view')?.dataset?.route === ${JSON.stringify(route)}`);
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'study-site-'));
  const out = join(root, 'math-viz');
  const profile = join(root, 'chrome');
  let server;
  let chrome;
  let page;
  try {
    let asked = false;
    try {
      await scaffold({ siteTitle: 'No book', course: 'X', throughline: 'Y', maps: [{ id: 'main', title: 'M' }], threads: [{ id: 'A', title: 'A', tone: 'cart', mark: 'disc' }], stations: [] }, join(root, 'should-not'));
    } catch (err) {
      asked = !!err.askTextbook;
    }
    check('missing textbook asks instead of guessing', asked);

    const config = JSON.parse(await readFile(configPath, 'utf8'));
    await scaffold(config, out);
    const reg = await import(pathToFileURL(join(out, 'js/registry.js')).href);
    const app = await import(pathToFileURL(join(out, 'js/app.js')).href);
    const test2 = reg.stationsForMap('test2').map((s) => s.id);
    check('test 2 is home, julia, newton', test2.includes('home') && test2.includes('julia') && test2.includes('newton') && !test2.includes('addresses'));
    check('test 2 draws no costume thread', reg.threadsToDraw(reg.threadsForMap('test2'), reg.stationsForMap('test2'), 'test2').length === 0);
    check('topic T1.3 opens addresses', reg.stationForTopic('T1.3')?.id === 'addresses');
    check('problem 1.3.1 opens addresses', reg.stationForProblem('1.3.1')?.id === 'addresses');
    check('route #topic-T1-3', app.parseRoute('#topic-T1-3').station === 'addresses');
    check('every station has a source chapter', reg.STATIONS.every((s) => s.source && s.source.chapter != null && s.source.section));
    check('every problem cites an exercise', reg.PROBLEMS.every((p) => p.source && p.source.exercise));

    const served = await serve(root);
    server = served.server;
    const base = `http://127.0.0.1:${served.port}/math-viz/`;
    const started = await startChrome(profile);
    chrome = started.chrome;
    page = await openPage(started.browserWs, base);
    await go(page.send, base);
    const home = await evalJson(page.send, `({
      state: document.querySelector('#view')?.dataset?.state,
      title: document.title,
      source: document.querySelector('.source-tag')?.textContent || '',
      links: [...document.querySelectorAll('#home-map a')].map(a => a.getAttribute('href')),
      topics: document.querySelectorAll('#home-topics a').length,
      scroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    })`);
    check('home is ready', home.state === 'ready', JSON.stringify(home));
    check('home title', home.title?.includes('One Point, Two Addresses'));
    check('home cites the handout', home.source.includes('MAT 412 course handout') && home.source.includes('Chapter 1'));
    check('map links to addresses', home.links?.includes('#addresses'));
    check('test 1 shows topic chips', home.topics >= 6);
    check('home does not scroll sideways', home.scroll);

    await go(page.send, `${base}#addresses`);
    await evalJson(page.send, `document.querySelector('[data-preset="neg"]').click()`);
    await waitFor(page.send, `document.querySelector('[data-preset="neg"]')?.getAttribute('aria-pressed') === 'true'`);
    const addr = await evalJson(page.send, `({
      station: document.querySelector('#view')?.dataset?.station,
      map: document.body.dataset.map,
      canvas: !!document.querySelector('canvas'),
      readout: document.querySelector('.readout')?.textContent || '',
      exercise: document.querySelector('[data-exercise="1.3.1"]')?.textContent || '',
      pressed: document.querySelector('[data-preset="neg"]')?.getAttribute('aria-pressed')
    })`);
    check('addresses is the station', addr.station === 'addresses' && addr.map === 'test1', JSON.stringify(addr));
    check('addresses has a canvas', addr.canvas);
    check('preset −1 is pressed and the readout follows', addr.pressed === 'true' && addr.readout.includes('-1.000'), addr.readout);
    check('exercise 1.3.1 is on the picture', addr.exercise.includes('1.3.1'));

    await go(page.send, `${base}#cards`);
    await evalJson(page.send, `document.querySelector('#flashcard-flip')?.click()`);
    const card = await evalJson(page.send, `({
      back: document.querySelector('#flashcard-back')?.textContent || '',
      hidden: document.querySelector('#flashcard-back')?.hidden,
      source: document.querySelector('#flashcard-source-tag')?.textContent || ''
    })`);
    check('flashcard back opens', card.hidden === false && card.back.length > 10, card.back);
    check('flashcard cites a section', card.source.includes('§'));

    await go(page.send, `${base}#problems`);
    await evalJson(page.send, `document.querySelector('[id$="-hint-btn"]').click()`);
    await waitFor(page.send, `!!document.querySelector('.pc-hint:not([hidden])')`);
    const practice = await evalJson(page.send, `({
      cards: document.querySelectorAll('.problem-card').length,
      hintOpen: document.querySelector('.pc-hint:not([hidden])')?.textContent || ''
    })`);
    check('practice lists the problems', practice.cards >= 6);
    check('hint opens', practice.hintOpen.length > 8);

    await go(page.send, `${base}#topic-J1`);
    const julia = await evalJson(page.send, `({
      station: document.querySelector('#view')?.dataset?.station,
      map: document.body.dataset.map,
      key: document.querySelector('#colour-key-list')?.textContent || '',
      nav: document.querySelector('#site-nav')?.innerText || '',
      topics: document.querySelectorAll('#home-topics a').length
    })`);
    check('topic J1 opens julia on test 2', julia.station === 'julia' && julia.map === 'test2', JSON.stringify(julia));
    check('test 2 colour key is about the pictures', julia.key.includes('stayed') && !julia.key.includes('Cartesian address'));
    check('test 2 menu has no addresses', !julia.nav.includes('One Point, Two Addresses'));
    await go(page.send, `${base}#home`);
    const test2Home = await evalJson(page.send, `({
      map: document.body.dataset.map,
      topics: document.querySelectorAll('#home-topics a').length,
      doors: [...document.querySelectorAll('#home-map a')].map(a => a.getAttribute('href'))
    })`);
    check('test 2 home keeps the map and skips topic chips', test2Home.map === 'test2' && test2Home.topics === 0 && test2Home.doors.includes('#julia') && !test2Home.doors.includes('#addresses'), JSON.stringify(test2Home));

    await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await go(page.send, `${base}#addresses`);
    const phone = await evalJson(page.send, `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);
    check('phone width does not scroll sideways', phone === true);

    await go(page.send, `${base}#not-a-place`);
    const missing = await evalJson(page.send, `document.querySelector('#view')?.dataset?.state`);
    check('unknown hash is a page, not a blank', missing === 'nosuchplace');

    check('no console errors', page.bags.console.length === 0 && page.bags.exceptions.length === 0, [...page.bags.console, ...page.bags.exceptions].join(' | '));
    check('no failed assets on the subpath', page.bags.bad.length === 0, page.bags.bad.join(' | '));
  } finally {
    if (page) page.close();
    if (chrome && chrome.pid) {
      chrome.kill('SIGKILL');
      await new Promise((r) => chrome.on('exit', r));
    }
    if (server) await new Promise((r) => server.close(r));
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
  if (failed) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('smoke passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
