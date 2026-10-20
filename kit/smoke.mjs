#!/usr/bin/env node
// Scaffold the example config and load it in headless Chrome, including a subpath.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scaffold, unfinishedReading } from './scaffold.mjs';

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

function near(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

function checkWorkedAnswers(config) {
  const byId = Object.fromEntries(config.problems.map((p) => [p.id, p]));
  const prod = byId['1.1.1'].answer.values;
  const z1 = { re: 3, im: -2 };
  const z2 = { re: -1, im: 4 };
  const den = z2.re * z2.re + z2.im * z2.im;
  check('1.1.1 product', near(prod.productRe, z1.re * z2.re - z1.im * z2.im) && near(prod.productIm, z1.re * z2.im + z1.im * z2.re));
  check('1.1.1 quotient', near(prod.quotRe, (z1.re * z2.re + z1.im * z2.im) / den) && near(prod.quotIm, (z1.im * z2.re - z1.re * z2.im) / den));

  const circle = byId['1.2.1'];
  check('1.2.1 circle', circle.answer.values.centerRe === 1 && circle.answer.values.centerIm === 2 && circle.answer.values.radius === 3 && circle.statement.includes('1 + 2i'));

  const polar = byId['1.3.1'].answer.values;
  check('1.3.1 polar', near(polar.r, Math.hypot(-1, Math.sqrt(3))) && near(polar.arg, Math.atan2(Math.sqrt(3), -1)));

  const roots = byId['1.4.1'].answer.values;
  check('1.4.1 roots', roots.n === 5 && near(roots.step * roots.n, Math.PI * 2));

  const sample = byId['2.1.1'].answer.values;
  check('2.1.1 sample', sample.x === 1 && sample.y === 1 && near(sample.u, sample.x ** 2 - sample.y ** 2 - sample.y) && near(sample.v, 2 * sample.x * sample.y + sample.x));

  const cr = byId['3.2.1'].answer.values;
  const u0 = Math.exp(cr.x) * Math.cos(cr.y);
  const v0 = Math.exp(cr.x) * Math.sin(cr.y);
  check('3.2.1 value', near(cr.u, u0) && near(cr.v, v0) && near(cr.derivativeRe, u0) && near(cr.derivativeIm, v0));
  const uFn = (x, y) => Math.exp(x) * Math.cos(y);
  const vFn = (x, y) => Math.exp(x) * Math.sin(y);
  const partial = (fn, x, y, axis) => {
    const h = 1e-6;
    return axis === 'x' ? (fn(x + h, y) - fn(x - h, y)) / (2 * h) : (fn(x, y + h) - fn(x, y - h)) / (2 * h);
  };
  const px = 0.3;
  const py = 0.4;
  check('3.2.1 Cauchy-Riemann', near(partial(uFn, px, py, 'x'), partial(vFn, px, py, 'y'), 1e-4) && near(partial(uFn, px, py, 'y'), -partial(vFn, px, py, 'x'), 1e-4));

  check('answers are objects with plain text', config.problems.every((p) => p.answer && typeof p.answer.tex === 'string' && typeof p.answer.text === 'string' && !p.answer.text.includes('$') && p.answer.values && p.answerText == null));
  check('textbook is Howell at 90%', config.textbook.title === 'Complex Analysis' && config.textbook.confidence === 0.9 && config.textbook.authors.includes('John H. Mathews') && String(config.textbook.pdfUrl).includes('howell-complex-analysis-web.pdf'));
  check('chapters name 2.1–3.2 and 4.1–4.2', ['2', '3', '4'].every((id) => config.chapters.some((c) => c.id === id)) && config.chapters.find((c) => c.id === '2').sections.join(',') === '2.1,2.2,2.3,2.4,2.5' && config.chapters.find((c) => c.id === '4').sections.join(',') === '4.1,4.2');
  check('no station has a fourth chip', config.stations.every((s) => !s.viz || !s.viz.presets || s.viz.presets.length <= 3));
}

function freshConfig() {
  return {
    siteTitle: 'Fresh map',
    course: 'SAMPLE 101',
    throughline: 'One number, one place on the line.',
    textbook: { title: 'Sample Notes for the Fresh Scaffold', authors: ['Test Author'], url: 'https://example.com/sample' },
    maps: [{ id: 'main', title: 'The course' }],
    threads: [
      { id: 'A', title: 'Where it sits', tone: 'cart', mark: 'disc' },
      { id: 'B', title: 'How it moves', tone: 'polar', mark: 'ring' },
    ],
    stations: [
      { id: 'home', title: 'The Map', kind: 'map', map: 'shared', summary: 'The line.', observe: 'Start at the line.', source: { chapter: 1, section: '1' } },
      { id: 'line', title: 'The Line', kind: 'viz', visualization: 'number-line', map: 'main', summary: 'Drag one number.', observe: 'Watch the green dot.', source: { chapter: 1, section: '1.1' }, viz: { start: 0.5, min: -1, max: 1, sentence: 'The dot is the number.', presets: [{ id: 'half', label: '1/2', x: 0.5 }, { id: 'one', label: '1', x: 1 }] } },
      { id: 'cards', title: 'Cards', kind: 'flashcards', map: 'main', summary: 'One card.', observe: 'Say the back.', source: { chapter: 1, section: '1' } },
      { id: 'practice', title: 'Practice', kind: 'practice', map: 'main', summary: 'One question.', observe: 'Use the hint.', source: { chapter: 1, section: '1.1' } },
    ],
    concepts: [{ id: 'S1', title: 'The line', station: 'line', source: { chapter: 1, section: '1.1' } }],
    flashcards: [{ id: 'fc1', front: 'What moves?', back: 'The green dot.', station: 'line', source: { chapter: 1, section: '1.1' } }],
    problems: [{
      id: 'p1',
      statement: 'Where is the dot when x is 1/2?',
      hint: 'Look at the readout.',
      answer: { tex: 'At $1/2$.', text: 'at 1/2', values: { x: 0.5 } },
      station: 'line',
      source: { chapter: 1, section: '1.1', exercise: '1' },
    }],
  };
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
    checkWorkedAnswers(config);
    await scaffold(config, out);

    const freshOut = join(root, 'fresh');
    await scaffold(freshConfig(), freshOut);
    const freshReg = await import(pathToFileURL(join(freshOut, 'js/registry.js')).href);
    check('fresh scaffold writes a number line', freshReg.stationById('line')?.visualization === 'number-line');
    check('fresh answer values survive', freshReg.problemById('p1')?.answer?.values?.x === 0.5);
    check('example reading stops are not finished', unfinishedReading(config).includes('mappings') && unfinishedReading(config).includes('julia') && unfinishedReading(config).length > 10);
    check('fresh sample has no reading stop', unfinishedReading(freshConfig()).length === 0);

    let tooMany = false;
    try {
      const crowded = freshConfig();
      crowded.stations[1].visualization = 'two-addresses';
      crowded.stations[1].viz = {
        start: { re: 0, im: 0 },
        presets: [1, 2, 3, 4].map((n) => ({ id: `p${n}`, re: n, im: 0 })),
      };
      await scaffold(crowded, join(root, 'crowded'));
    } catch (err) {
      tooMany = /at most 3/.test(err.message);
    }
    check('a fourth preset chip is rejected', tooMany);

    let stringAnswer = false;
    try {
      const bad = freshConfig();
      bad.problems[0].answer = '1/2';
      await scaffold(bad, join(root, 'bad-answer'));
    } catch (err) {
      stringAnswer = /answer as \{ tex, text, values \}/.test(err.message);
    }
    check('a string answer is rejected', stringAnswer);
    const reg = await import(pathToFileURL(join(out, 'js/registry.js')).href);
    const app = await import(pathToFileURL(join(out, 'js/app.js')).href);
    const test2 = reg.stationsForMap('test2').map((s) => s.id);
    check('test 2 is home, julia, newton', test2.includes('home') && test2.includes('julia') && test2.includes('newton') && !test2.includes('addresses'));
    check('test 2 draws no costume thread', reg.threadsToDraw(reg.threadsForMap('test2'), reg.stationsForMap('test2'), 'test2').length === 0);
    check('topic T1.3 opens addresses', reg.stationForTopic('T1.3')?.id === 'addresses');
    check('problem 1.3.1 opens addresses', reg.stationForProblem('1.3.1')?.id === 'addresses');
    check('route #topic-T1-3', app.parseRoute('#topic-T1-3').station === 'addresses');
    check('#home-t2 forces the map that owns T2', app.mapForcedByRoute(reg.stationById('home'), app.parseRoute('#home-t2')) === 'test1');
    check('#home does not force a map', app.mapForcedByRoute(reg.stationById('home'), app.parseRoute('#home')) == null);
    check('#home-F1 forces test 2', app.mapForcedByRoute(reg.stationById('home'), app.parseRoute('#home-F1')) === 'test2');
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
      book: document.querySelector('.source-tag a')?.getAttribute('href') || '',
      links: [...document.querySelectorAll('#home-map a')].map(a => a.getAttribute('href')),
      topics: document.querySelectorAll('#home-topics a').length,
      scroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    })`);
    check('home is ready', home.state === 'ready', JSON.stringify(home));
    check('home title', home.title?.includes('One Point, Two Addresses'));
    check('home cites the book', home.source.includes('Complex Analysis') && home.source.includes('Chapter 1'), home.source);
    check('home links to the HTML edition', home.book.includes('complexanalysis.org/web/root-1-2-2.html'), home.book);
    check('map links to addresses', home.links?.includes('#addresses'));
    check('test 1 shows topic chips', home.topics >= 6);
    check('home does not scroll sideways', home.scroll);

    await go(page.send, `${base}#addresses`);
    const neg = await evalJson(page.send, `(() => {
      const b = document.querySelector('[data-preset="neg"]');
      if (!b) return { missing: true, state: document.querySelector('#view')?.dataset?.state || '', text: (document.body.innerText || '').slice(0, 400) };
      b.click();
      return { missing: false };
    })()`);
    check('addresses preset is on the page', neg && neg.missing === false, JSON.stringify(neg));
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
    const deck = await evalJson(page.send, `({
      href: document.querySelector('#flashcard-station a')?.getAttribute('href') || '',
      kicker: document.querySelector('#flashcard-kicker')?.textContent || '',
      julia: (document.querySelector('#flashcard-front')?.textContent || '') + (document.querySelector('#flashcard-back')?.textContent || '')
    })`);
    check('flashcard links to its station', deck.href === '#addresses', deck.href);
    check('test 1 deck leaves the Julia card on test 2', deck.kicker.includes('of 7') && !deck.julia.includes('Julia'), JSON.stringify(deck));

    await go(page.send, `${base}#problems`);
    await evalJson(page.send, `document.querySelector('[id$="-hint-btn"]').click()`);
    await waitFor(page.send, `!!document.querySelector('.pc-hint:not([hidden])')`);
    const practice = await evalJson(page.send, `({
      cards: document.querySelectorAll('.problem-card').length,
      hintOpen: document.querySelector('.pc-hint:not([hidden])')?.textContent || ''
    })`);
    check('practice lists the problems', practice.cards >= 6);
    check('hint opens', practice.hintOpen.length > 8);
    await evalJson(page.send, `document.querySelector('#problem-1-1-1-answer-btn')?.click()`);
    await waitFor(page.send, `document.querySelector('#problem-1-1-1-answer') && !document.querySelector('#problem-1-1-1-answer').hidden`);
    const shown = await evalJson(page.send, `document.querySelector('#problem-1-1-1-answer')?.innerText || ''`);
    check('worked answer opens', shown.includes('5') && shown.includes('14') && shown.includes('5+14i'), shown);

    await go(page.send, `${base}#mappings`);
    const mappings = await evalJson(page.send, `({
      source: document.querySelector('.source-tag')?.textContent || '',
      href: document.querySelector('.source-tag a')?.getAttribute('href') || ''
    })`);
    check('mappings cites Howell 2.1', mappings.source.includes('§2.1') && mappings.source.includes('Functions and Linear Mappings') && mappings.href.includes('sec_functions-mappings.html'), JSON.stringify(mappings));

    await go(page.send, `${base}#topic-J1`);
    const julia = await evalJson(page.send, `({
      station: document.querySelector('#view')?.dataset?.station,
      map: document.body.dataset.map,
      key: document.querySelector('#colour-key-list')?.textContent || '',
      source: document.querySelector('.source-tag')?.textContent || '',
      href: document.querySelector('.source-tag a')?.getAttribute('href') || '',
      nav: document.querySelector('#site-nav')?.innerText || '',
      topics: document.querySelectorAll('#home-topics a').length
    })`);
    check('topic J1 opens julia on test 2', julia.station === 'julia' && julia.map === 'test2', JSON.stringify(julia));
    check('julia cites 4.2 and mentions 4.1', julia.source.includes('Chapter 4') && julia.source.includes('§4.2') && julia.source.includes('4.1') && julia.href.includes('sec_julia-mandelbrot.html'), julia.source);
    check('test 2 colour key is about the pictures', julia.key.includes('stayed') && !julia.key.includes('Cartesian address'));
    check('test 2 menu has no addresses', !julia.nav.includes('One Point, Two Addresses'));
    await go(page.send, `${base}#home`);
    const test2Home = await evalJson(page.send, `({
      map: document.body.dataset.map,
      topics: document.querySelectorAll('#home-topics a').length,
      doors: [...document.querySelectorAll('#home-map a')].map(a => a.getAttribute('href'))
    })`);
    check('test 2 home keeps the map and skips topic chips', test2Home.map === 'test2' && test2Home.topics === 0 && test2Home.doors.includes('#julia') && !test2Home.doors.includes('#addresses'), JSON.stringify(test2Home));

    await go(page.send, `${base}#home-t2`);
    const focused = await evalJson(page.send, `({
      map: document.body.dataset.map,
      focus: document.querySelector('#home-map svg')?.getAttribute('data-focus') || '',
      arithmetic: document.querySelector('#home-map a[href="#arithmetic"]')?.getAttribute('data-on-focus') || '',
      staircase: document.querySelector('#home-map a[href="#staircase"]')?.getAttribute('data-on-focus') || '',
      dot: !!document.querySelector('#home-map a[href="#problem-1-3-1"]'),
      legend: document.querySelector('#home-legend a[data-thread="T2"]')?.getAttribute('aria-current') || ''
    })`);
    check('#home-t2 lights T2 on test 1', focused.map === 'test1' && focused.focus === 'T2' && focused.staircase === 'true' && focused.arithmetic === 'false' && focused.legend === 'true', JSON.stringify(focused));
    check('map dot opens the exercise', focused.dot === true);

    await go(page.send, `http://127.0.0.1:${served.port}/fresh/#line`);
    await evalJson(page.send, `document.querySelector('[data-preset="one"]')?.click()`);
    await waitFor(page.send, `document.querySelector('[data-preset="one"]')?.getAttribute('aria-pressed') === 'true'`);
    const line = await evalJson(page.send, `({
      station: document.querySelector('#view')?.dataset?.station,
      canvas: !!document.querySelector('canvas'),
      readout: document.querySelector('.readout')?.textContent || '',
      exercise: document.querySelector('[data-exercise="1"]')?.textContent || '',
      half: document.querySelector('[data-preset="half"]')?.getAttribute('aria-pressed') || ''
    })`);
    check('number line chip stays pressed on its value', line.station === 'line' && line.canvas && line.readout.includes('1.000') && line.half === 'false', JSON.stringify(line));
    check('the exercise sits on the number line', line.exercise.includes('Exercise 1'));

    await page.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 1, mobile: true });
    await go(page.send, base);
    const phoneHome = await evalJson(page.send, `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);
    check('360px home does not scroll sideways', phoneHome === true);
    await go(page.send, `${base}#addresses`);
    const phone = await evalJson(page.send, `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);
    check('360px picture does not scroll sideways', phone === true);

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
