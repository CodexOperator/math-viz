#!/usr/bin/env node
// Scaffold the example config and load it in headless Chrome, including a subpath.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scaffold, unfinishedReading } from './scaffold.mjs';
import { stampStation } from './stamp-station.mjs';

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
  const polar = byId['1.3.1'].answer.values;
  check('1.3.1 polar', near(polar.r, Math.hypot(-1, Math.sqrt(3))) && near(polar.arg, Math.atan2(Math.sqrt(3), -1)));

  const roots = byId['1.4.1'].answer.values;
  check('1.4.1 roots', roots.n === 5 && near(roots.step * roots.n, Math.PI * 2));

  const sample = byId['2.1.1'].answer.values;
  check('2.1.1 sample', sample.x === 1 && sample.y === 1 && near(sample.u, sample.x ** 2 - sample.y ** 2 - sample.y) && near(sample.v, 2 * sample.x * sample.y + sample.x));

  check('answers are objects with plain text', config.problems.every((p) => p.answer && typeof p.answer.tex === 'string' && typeof p.answer.text === 'string' && !p.answer.text.includes('$') && p.answer.values && p.answerText == null));
  check('textbook is Howell at 90%', config.textbook.title === 'Complex Analysis' && config.textbook.confidence === 0.9 && config.textbook.authors.includes('John H. Mathews') && String(config.textbook.pdfUrl).includes('howell-complex-analysis-web.pdf'));
  check('chapters name the pictured sections', config.chapters.find((c) => c.id === '2').sections.join(',') === '2.1' && config.chapters.find((c) => c.id === '3').sections.join(',') === '3.1' && !config.chapters.some((c) => c.id === '4'));
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

function calculusConfig() {
  const section = {
    chapter: 1,
    section: '1.1',
    sectionTitle: 'Review of Functions',
    url: 'https://openstax.org/books/calculus-volume-1/pages/1-1-review-of-functions',
  };
  return {
    siteTitle: 'Calculus I',
    course: 'Calculus I',
    throughline: 'Drag the input. The purple mark is the output.',
    storagePrefix: 'calc1:',
    textbook: {
      title: 'Calculus Volume 1',
      authors: ['Gilbert Strang', 'Edwin Herman'],
      url: section.url,
      htmlUrl: section.url,
      licence: 'CC BY-NC-SA 4.0',
      confidence: 1,
    },
    maps: [{ id: 'main', title: 'Calculus I' }],
    threads: [
      { id: 'in', title: 'The input', tone: 'input', mark: 'disc' },
      { id: 'out', title: 'The output', tone: 'output', mark: 'ring' },
    ],
    stations: [
      {
        id: 'home', title: 'The Map', kind: 'map', map: 'shared', order: 0, threads: ['in', 'out'],
        summary: 'One number, then its output.',
        observe: 'Drag the number, then open the graph.',
        source: { ...section },
        viz: {
          picture: 'line', start: 1, min: -1, max: 4,
          claim: { op: 'gt', value: 0, whenTrue: 'x is positive.', whenFalse: 'x is not positive.' },
        },
      },
      {
        id: 'input', title: 'Where x sits', kind: 'viz', visualization: 'number-line', map: 'main', order: 1, threads: ['in'],
        summary: 'The green dot is x. It is not f(x).',
        observe: 'Drag x. This line does not draw the output.',
        source: { ...section },
        viz: {
          start: 1, min: -1, max: 4, sentence: 'The dot is x, the input.',
          presets: [{ id: 'zero', label: '0', x: 0 }, { id: 'one', label: '1', x: 1 }],
        },
      },
      {
        id: 'output', title: 'f(x) = 4x^2 - 3x + 1', kind: 'viz', visualization: 'graph', map: 'main', order: 2,
        threads: ['out'], problems: ['8'],
        summary: 'Exercise 8. The purple mark is f(x).',
        observe: 'Drag x. The purple mark is f(x).',
        source: { ...section, exercise: '8', note: 'OpenStax Calculus Volume 1, section 1.1, exercise 8.' },
        viz: {
          fn: 'poly', poly: [1, -3, 4], start: 0, min: -1, max: 4,
          presets: [
            { id: 'zero', label: 'f(0)', x: 0 },
            { id: 'one', label: 'f(1)', x: 1 },
            { id: 'three', label: 'f(3)', x: 3 },
          ],
          claim: {
            op: 'gt', value: 1,
            whenTrue: 'The output is above 1. f(1) = 2 is above 1.',
            whenFalse: 'The output is not above 1. f(0) = 1 sits on 1.',
          },
        },
      },
    ],
    concepts: [{ id: 'C1', title: 'The output', station: 'output', source: { ...section } }],
    problems: [{
      id: '8',
      statement: 'For f(x) = 4x^2 - 3x + 1, find f(0), f(1), and f(3).',
      hint: 'Read the purple mark at each chip.',
      answer: { tex: '$f(0)=1$, $f(1)=2$, $f(3)=28$.', text: 'f(0)=1, f(1)=2, f(3)=28', values: { f0: 1, f1: 2, f3: 28 } },
      station: 'output',
      source: { ...section, exercise: '8' },
    }],
  };
}

async function boxOf(send, selector) {
  return evalJson(send, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  })()`);
}

async function mouseAt(send, type, x, y) {
  await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
}

async function keyTap(send, key, code, vk) {
  const common = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...common });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
}

async function focus(send, selector) {
  await evalJson(send, `document.querySelector(${JSON.stringify(selector)})?.focus()`);
}

async function touchAt(send, type, x, y) {
  await send('Input.dispatchTouchEvent', {
    type,
    touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }],
  });
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
    await scaffold(config, out, { configDir: here });

    const freshOut = join(root, 'fresh');
    await scaffold(freshConfig(), freshOut);
    const freshReg = await import(pathToFileURL(join(freshOut, 'js/registry.js')).href);
    check('fresh scaffold writes a number line', freshReg.stationById('line')?.visualization === 'number-line');
    check('fresh answer values survive', freshReg.problemById('p1')?.answer?.values?.x === 0.5);
    const stillReading = unfinishedReading(config);
    check('example slice has no reading stop', stillReading.length === 0, stillReading.join(','));
    check('fresh sample has no reading stop', unfinishedReading(freshConfig()).length === 0);
    const calcOut = join(root, 'calc');
    await scaffold(calculusConfig(), calcOut);
    const calcReg = await import(pathToFileURL(join(calcOut, 'js/registry.js')).href);
    const calcAnswer = calcReg.problemById('8')?.answer?.values;
    check('a calculus course scaffolds a graph, not a complex plane', calcReg.stationById('output')?.visualization === 'graph' && !calcReg.STATIONS.some((s) => s.visualization === 'two-addresses'));
    check('calculus exercise 8 recomputes', calcAnswer && calcAnswer.f0 === 1 && calcAnswer.f1 === 2 && calcAnswer.f3 === 28, JSON.stringify(calcAnswer));
    check('calculus slice has no reading stop', unfinishedReading(calculusConfig()).length === 0);

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

    function customConfig() {
      const cfg = freshConfig();
      cfg.stations.push({
        id: 'secant',
        title: 'The Secant',
        kind: 'custom',
        module: './stations/secant.js',
        map: 'main',
        summary: 'The hand moves. The lesson has to be drawn.',
        observe: 'Watch the mark the hand changes.',
        source: { chapter: 1, section: '1.1' },
        viz: {
          start: 0.5,
          min: -1,
          max: 1,
          sentence: 'The dot is only the hand.',
          presets: [{ id: 'half', label: '1/2', x: 0.5 }, { id: 'one', label: '1', x: 1 }],
        },
      });
      return cfg;
    }
    const courseDir = join(root, 'course');
    let noDir = false;
    try { await scaffold(customConfig(), join(root, 'no-dir')); }
    catch (err) { noDir = /beside it/.test(err.message); }
    check('custom station without a config folder is refused', noDir);
    let missingFile = false;
    try { await scaffold(customConfig(), join(root, 'missing-picture'), { configDir: courseDir }); }
    catch (err) { missingFile = /not there/.test(err.message); }
    check('custom station with no picture file is refused', missingFile);
    const stampedPath = await stampStation({ id: 'secant', configDir: courseDir });
    const stampedText = await readFile(stampedPath, 'utf8');
    check('stamp writes an open picture', stampedText.includes('export const STAMP_OPEN = true;') && stampedText.includes('export function drawLesson'));
    let secondStamp = false;
    try { await stampStation({ id: 'secant', configDir: courseDir }); }
    catch (err) { secondStamp = /already exists/.test(err.message); }
    check('stamp does not overwrite a picture', secondStamp);
    let shellName = false;
    try { await stampStation({ id: 'reading', configDir: courseDir }); }
    catch (err) { shellName = /shell station/.test(err.message); }
    check('stamp refuses a shell station name', shellName);
    const stampedOut = join(root, 'stamped');
    const stamped = await scaffold(customConfig(), stampedOut, { configDir: courseDir });
    check('an open stamp is listed and the scaffold still returns', stamped.unfinishedStamps.includes('secant'));
    const copied = await readFile(join(stampedOut, 'js/stations/secant.js'), 'utf8');
    check('scaffold copies the picture from beside the config', copied === stampedText);
    await writeFile(join(stampedOut, 'js/stations/secant.js'), copied.replace('STAMP_OPEN = true', 'STAMP_OPEN = false'));
    await scaffold(customConfig(), stampedOut, { force: true, configDir: courseDir });
    const restored = await readFile(join(stampedOut, 'js/stations/secant.js'), 'utf8');
    check('force rebuild restores the picture source', restored.includes('export const STAMP_OPEN = true;'));
    let badModule = false;
    try {
      const bad = customConfig();
      bad.stations.find((s) => s.id === 'secant').module = './stations/other.js';
      await scaffold(bad, join(root, 'bad-module'), { configDir: courseDir });
    } catch (err) {
      badModule = /stations\/secant\.js/.test(err.message);
    }
    check('a custom module must be stations/<id>.js', badModule);

    const linearPath = join(here, 'examples/linear-algebra.config.json');
    const linearConfig = JSON.parse(await readFile(linearPath, 'utf8'));
    const linearById = Object.fromEntries(linearConfig.problems.map((p) => [p.id, p.answer.values]));
    check('2.6.3.1 det', linearById['2.6.3.1'].a11 === 2 && linearById['2.6.3.1'].a22 === 1 && linearById['2.6.3.1'].det === 2);
    check('2.6.3.2 area', linearById['2.6.3.2'].scale === 2 && linearById['2.6.3.2'].det === 4);
    check('2.6.3.3 corner', near(linearById['2.6.3.3'].cornerX, 0.2) && near(linearById['2.6.3.3'].cornerY, -1.15) && linearById['2.6.3.3'].det === 1);
    check('2.6.3.4 corner', near(linearById['2.6.3.4'].cornerX, 1.35) && near(linearById['2.6.3.4'].cornerY, 0.2) && linearById['2.6.3.4'].det === 1);
    const linearOut = join(root, 'linalg');
    await scaffold(linearConfig, linearOut, { configDir: join(here, 'examples') });
    check('linear algebra slice has no reading stop', unfinishedReading(linearConfig).length === 0);
    const linearReg = await import(pathToFileURL(join(linearOut, 'js/registry.js')).href);
    check('linear algebra is four shape pictures', ['wide', 'scale', 'turn', 'shear'].every((id) => linearReg.stationById(id)?.visualization === 'shape'));
    check('linear algebra home picture is the square', linearReg.stationById('home')?.viz?.picture === 'shape');
    const linearDrawn = linearReg.threadsToDraw(linearReg.threadsForMap('main'), linearReg.stationsForMap('main'), 'main');
    check('linear algebra draws two threads', linearDrawn.length === 2, linearDrawn.map((t) => t.id).join(','));

    const reg = await import(pathToFileURL(join(out, 'js/registry.js')).href);
    const app = await import(pathToFileURL(join(out, 'js/app.js')).href);
    check('shape-only home is the square', reg.chooseHomePicture({ viz: {} }, [{ visualization: 'shape' }]) === 'shape');
    check('a graph keeps the line home', reg.chooseHomePicture({ viz: {} }, [{ visualization: 'shape' }, { visualization: 'graph' }]) === 'line');
    check('two-addresses keeps the point home', reg.chooseHomePicture({ viz: {} }, [{ visualization: 'two-addresses' }, { visualization: 'shape' }]) === 'point');
    check('an explicit line stays a line', reg.chooseHomePicture({ viz: { picture: 'line' } }, [{ visualization: 'shape' }]) === 'line');
    check('topic T1.3 opens addresses', reg.stationForTopic('T1.3')?.id === 'addresses');
    check('problem 1.3.1 opens addresses', reg.stationForProblem('1.3.1')?.id === 'addresses');
    check('route #topic-T1-3', app.parseRoute('#topic-T1-3').station === 'addresses');
    check('#home-t2 forces the map that owns T2', app.mapForcedByRoute(reg.stationById('home'), app.parseRoute('#home-t2')) === 'test1');
    check('#home does not force a map', app.mapForcedByRoute(reg.stationById('home'), app.parseRoute('#home')) == null);
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
    check('a slice under six concepts has no topic chips', home.topics === 0);
    check('home does not scroll sideways', home.scroll);
    const taught = await evalJson(page.send, `({
      finder: !!document.querySelector('#home-finder'),
      dot: !!document.querySelector('#home-dot'),
      readout: document.querySelector('#home-readout')?.textContent || '',
      sentence: document.querySelector('#home-dot-sentence')?.textContent || '',
      chips: document.querySelectorAll('#home-dot-panel .chip').length
    })`);
    check('home has a finder and one dot', taught.finder && taught.dot && taught.chips === 0 && taught.readout.includes('-1.000') && taught.readout.includes('1.732'), JSON.stringify(taught));
    check('home names the angle so the jump can be read', taught.readout.includes('angle ='), taught.readout);
    const dot = await evalJson(page.send, `(() => {
      const c = document.querySelector('#home-dot');
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let sx = 0, sy = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (g > 70 && r < 50 && g > b + 10 && g > r + 30) {
          const p = i / 4;
          sx += p % c.width;
          sy += (p / c.width) | 0;
          n += 1;
        }
      }
      return { n, x: n ? sx / n : -1, y: n ? sy / n : -1, w: c.width, h: c.height };
    })()`);
    check('the home dot is on the canvas', dot.n > 12 && dot.x > 8 && dot.y > 8 && dot.x < dot.w - 8 && dot.y < dot.h - 8, JSON.stringify(dot));
    await evalJson(page.send, `document.querySelector('#home-dot')?.scrollIntoView({ block: 'center' })`);
    const seam = await evalJson(page.send, `(() => {
      const c = document.querySelector('#home-dot');
      const r = c.getBoundingClientRect();
      const scale = Math.min(r.width, r.height) / 5;
      const at = (re, im) => ({ x: r.x + r.width / 2 + re * scale, y: r.y + r.height / 2 - im * scale });
      return { cut: at(-1, 0), below: at(-1, -0.25) };
    })()`);
    await mouseAt(page.send, 'mousePressed', seam.cut.x, seam.cut.y);
    await mouseAt(page.send, 'mouseReleased', seam.cut.x, seam.cut.y);
    const onSeam = await evalJson(page.send, `({
      readout: document.querySelector('#home-readout')?.textContent || '',
      sentence: document.querySelector('#home-dot-sentence')?.textContent || ''
    })`);
    check('the negative axis says the angle jumps, and prints the angle', onSeam.sentence.includes('negative real axis') && onSeam.readout.includes('angle = 3.14'), JSON.stringify(onSeam));
    await mouseAt(page.send, 'mousePressed', seam.below.x, seam.below.y);
    await mouseAt(page.send, 'mouseReleased', seam.below.x, seam.below.y);
    const offSeam = await evalJson(page.send, `({
      readout: document.querySelector('#home-readout')?.textContent || '',
      sentence: document.querySelector('#home-dot-sentence')?.textContent || ''
    })`);
    check('just below the axis the angle is negative and the jump sentence is gone', offSeam.readout.includes('angle = -') && !offSeam.sentence.includes('negative real axis'), JSON.stringify(offSeam));
    await evalJson(page.send, `(() => { const i = document.querySelector('#home-finder'); i.value = 'roots'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const found = await evalJson(page.send, `[...document.querySelectorAll('#home-finder-results a')].map(a => a.getAttribute('href'))`);
    check('finder opens the roots stop', Array.isArray(found) && found.includes('#roots'), JSON.stringify(found));
    await focus(page.send, '#home-finder');
    await keyTap(page.send, 'ArrowDown', 'ArrowDown', 40);
    const selected = await evalJson(page.send, `document.querySelector('#home-finder-results a[aria-selected="true"]')?.getAttribute('href') || ''`);
    check('finder arrow selects the first match', selected === '#roots', selected);
    await keyTap(page.send, 'Enter', 'Enter', 13);
    await waitFor(page.send, `document.querySelector('#view')?.dataset?.route === 'roots'`);
    check('finder Enter opens that stop', true);

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
    check('the pictured deck is the four cards on this map', deck.kicker.includes('of 4') && !deck.julia.includes('Julia'), JSON.stringify(deck));

    await go(page.send, `${base}#problems`);
    await evalJson(page.send, `document.querySelector('[id$="-hint-btn"]').click()`);
    await waitFor(page.send, `!!document.querySelector('.pc-hint:not([hidden])')`);
    const practice = await evalJson(page.send, `({
      cards: document.querySelectorAll('.problem-card').length,
      hintOpen: document.querySelector('.pc-hint:not([hidden])')?.textContent || ''
    })`);
    check('practice lists the problems on the pictured stations', practice.cards === 3);
    check('hint opens', practice.hintOpen.length > 8);
    await evalJson(page.send, `document.querySelector('#problem-1-3-1-answer-btn')?.click()`);
    await waitFor(page.send, `document.querySelector('#problem-1-3-1-answer') && !document.querySelector('#problem-1-3-1-answer').hidden`);
    const shown = await evalJson(page.send, `document.querySelector('#problem-1-3-1-answer')?.innerText || ''`);
    check('worked answer opens', shown.includes('2') && (shown.includes('π') || shown.includes('pi')), shown);

    await go(page.send, `${base}#mappings`);
    const mappings = await evalJson(page.send, `({
      source: document.querySelector('.source-tag')?.textContent || '',
      href: document.querySelector('.source-tag a')?.getAttribute('href') || ''
    })`);
    check('mappings cites Howell 2.1', mappings.source.includes('§2.1') && mappings.source.includes('Functions and Linear Mappings') && mappings.href.includes('sec_functions-mappings.html'), JSON.stringify(mappings));
    await evalJson(page.send, `document.querySelector('#mappings-presets [data-preset="i"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#mappings-presets [data-preset="i"]')?.getAttribute('aria-pressed') === 'true'`);
    const mappingPic = await evalJson(page.send, `({
      canvas: !!document.querySelector('#mappings-canvas'),
      readout: document.querySelector('#mappings-readout')?.textContent || '',
      sentence: document.querySelector('#mappings-sentence')?.textContent || '',
      exercise: document.querySelector('[data-exercise="handout 2.1.1"]')?.textContent || '',
      one: document.querySelector('#mappings-presets [data-preset="one"]')?.getAttribute('aria-pressed') || ''
    })`);
    check('mappings turns the square by i', mappingPic.canvas && mappingPic.readout.includes('square') && mappingPic.sentence.includes('multiplication by i') && mappingPic.one === 'false', JSON.stringify(mappingPic));
    check('mappings names the handout prompt, not book exercise 2.1.1', mappingPic.exercise.includes('handout 2.1.1') && mappingPic.exercise.includes('equation') && mappingPic.exercise.includes('not a book exercise'), mappingPic.exercise);
    const turnedHash = await evalJson(page.send, `(() => {
      const url = document.querySelector('#mappings-canvas').toDataURL();
      let h = 0;
      for (let i = 0; i < url.length; i += 13) h = (h * 33 + url.charCodeAt(i)) >>> 0;
      return h;
    })()`);
    await evalJson(page.send, `document.querySelector('#mappings-presets [data-preset="one"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#mappings-presets [data-preset="one"]')?.getAttribute('aria-pressed') === 'true'`);
    const stillHash = await evalJson(page.send, `(() => {
      const url = document.querySelector('#mappings-canvas').toDataURL();
      let h = 0;
      for (let i = 0; i < url.length; i += 13) h = (h * 33 + url.charCodeAt(i)) >>> 0;
      return h;
    })()`);
    check('a quarter turn moves the marked square', turnedHash !== stillHash, `${turnedHash} vs ${stillHash}`);
    await evalJson(page.send, `document.querySelector('#mappings-canvas')?.scrollIntoView({ block: 'center' })`);
    const squareClick = await boxOf(page.send, '#mappings-canvas');
    const beforeClick = await evalJson(page.send, `document.querySelector('#mappings-readout')?.textContent || ''`);
    await mouseAt(page.send, 'mousePressed', squareClick.x + squareClick.w / 2, squareClick.y + squareClick.h / 2);
    await mouseAt(page.send, 'mouseReleased', squareClick.x + squareClick.w / 2, squareClick.y + squareClick.h / 2);
    const afterClick = await evalJson(page.send, `document.querySelector('#mappings-readout')?.textContent || ''`);
    check('a press on the square does not drag the angle', afterClick === beforeClick && afterClick.includes('t = 0.000'), afterClick);
    await evalJson(page.send, `document.querySelector('#mappings-presets [data-preset="i"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#mappings-presets [data-preset="i"]')?.getAttribute('aria-pressed') === 'true'`);
    const handle = await evalJson(page.send, `(() => {
      const c = document.querySelector('#mappings-canvas');
      const r = c.getBoundingClientRect();
      const pad = 36;
      const t = Math.PI / 2;
      const handleX = pad + (t / Math.PI) * (r.width - pad * 2);
      return { x: r.x + handleX + 12, y: r.y + r.height * 0.9 };
    })()`);
    await mouseAt(page.send, 'mousePressed', handle.x, handle.y);
    const held = await evalJson(page.send, `document.querySelector('#mappings-readout')?.textContent || ''`);
    await mouseAt(page.send, 'mouseMoved', handle.x + 2, handle.y);
    const nudged = await evalJson(page.send, `document.querySelector('#mappings-readout')?.textContent || ''`);
    await mouseAt(page.send, 'mouseReleased', handle.x + 2, handle.y);
    check('the handle does not jump until the pointer actually moves', held.includes('t = 1.571') && nudged === held, `${held} / ${nudged}`);
    await mouseAt(page.send, 'mousePressed', handle.x, handle.y);
    await mouseAt(page.send, 'mouseMoved', handle.x + 28, handle.y);
    await mouseAt(page.send, 'mouseReleased', handle.x + 28, handle.y);
    const dragged = await evalJson(page.send, `({
      readout: document.querySelector('#mappings-readout')?.textContent || '',
      pressed: document.querySelector('#mappings-presets [data-preset="i"]')?.getAttribute('aria-pressed') || ''
    })`);
    check('dragging the track leaves the quarter-turn chip', !dragged.readout.includes('t = 1.571') && dragged.pressed === 'false', JSON.stringify(dragged));
    await evalJson(page.send, `document.querySelector('#mappings-presets [data-preset="i"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#mappings-presets [data-preset="i"]')?.getAttribute('aria-pressed') === 'true'`);
    await focus(page.send, '#mappings-canvas');
    await keyTap(page.send, 'ArrowRight', 'ArrowRight', 39);
    const stepped = await evalJson(page.send, `({
      sentence: document.querySelector('#mappings-sentence')?.textContent || '',
      pressed: document.querySelector('#mappings-presets [data-preset="i"]')?.getAttribute('aria-pressed') || ''
    })`);
    check('one key off ×i is no longer multiplication by i', stepped.pressed === 'false' && stepped.sentence.includes('not multiplication by i'), JSON.stringify(stepped));

    await go(page.send, `${base}#staircase`);
    await evalJson(page.send, `document.querySelector('#staircase-presets [data-preset="after"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#staircase-presets [data-preset="after"]')?.getAttribute('aria-pressed') === 'true'`);
    const jumped = await evalJson(page.send, `({
      readout: document.querySelector('#staircase-readout')?.textContent || '',
      sentence: document.querySelector('#staircase-sentence')?.textContent || '',
      source: document.querySelector('.source-tag')?.textContent || ''
    })`);
    check('staircase value jumps after π', jumped.readout.includes('value = -') && jumped.sentence.includes('jumped') && jumped.source.includes('1.3'), JSON.stringify(jumped));
    await evalJson(page.send, `document.querySelector('#staircase-presets [data-preset="before"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#staircase-presets [data-preset="before"]')?.getAttribute('aria-pressed') === 'true'`);
    const before = await evalJson(page.send, `document.querySelector('#staircase-sentence')?.textContent || ''`);
    check('staircase sentence agrees before π', before.includes('agree') && !before.includes('jumped'), before);
    await focus(page.send, '#staircase-canvas');
    await keyTap(page.send, 'ArrowRight', 'ArrowRight', 39);
    const steppedArg = await evalJson(page.send, `({
      pressed: document.querySelector('#staircase-presets [data-preset="before"]')?.getAttribute('aria-pressed') || '',
      sentence: document.querySelector('#staircase-sentence')?.textContent || ''
    })`);
    check('an arrow off the chip unpresses it and the sentence still agrees', steppedArg.pressed === 'false' && steppedArg.sentence.includes('agree'), JSON.stringify(steppedArg));

    await go(page.send, `${base}#roots`);
    await evalJson(page.send, `document.querySelector('#roots-presets [data-preset="five"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#roots-presets [data-preset="five"]')?.getAttribute('aria-pressed') === 'true'`);
    const five = await evalJson(page.send, `({
      readout: document.querySelector('#roots-readout')?.textContent || '',
      sentence: document.querySelector('#roots-sentence')?.textContent || '',
      exercise: document.querySelector('[data-exercise="1.4.1"]')?.textContent || ''
    })`);
    check('five roots are the exercise', five.readout.includes('n = 5') && five.sentence.includes('Five') && five.exercise.includes('1.4.1'), JSON.stringify(five));
    await evalJson(page.send, `document.querySelector('#roots-presets [data-preset="four"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#roots-presets [data-preset="four"]')?.getAttribute('aria-pressed') === 'true'`);
    const four = await evalJson(page.send, `document.querySelector('#roots-sentence')?.textContent || ''`);
    check('four roots are not the fifth roots', four.includes('not five') || four.includes('not the fifth'), four);

    await go(page.send, `${base}#derivative`);
    await evalJson(page.send, `document.querySelector('#derivative-presets [data-preset="turn"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#derivative-presets [data-preset="turn"]')?.getAttribute('aria-pressed') === 'true'`);
    const turned = await evalJson(page.send, `({
      readout: document.querySelector('#derivative-readout')?.textContent || '',
      sentence: document.querySelector('#derivative-sentence')?.textContent || '',
      source: document.querySelector('.source-tag')?.textContent || ''
    })`);
    check('derivative turn is a square', turned.readout.includes('image = square') && turned.sentence.includes('square') && turned.source.includes('3.1'), JSON.stringify(turned));
    await evalJson(page.send, `document.querySelector('#derivative-presets [data-preset="shear"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#derivative-presets [data-preset="shear"]')?.getAttribute('aria-pressed') === 'true'`);
    const sheared = await evalJson(page.send, `({
      readout: document.querySelector('#derivative-readout')?.textContent || '',
      sentence: document.querySelector('#derivative-sentence')?.textContent || ''
    })`);
    check('derivative shear is not a square', sheared.readout.includes('image = not a square') && sheared.sentence.includes('smear'), JSON.stringify(sheared));
    await evalJson(page.send, `document.querySelector('#derivative-presets [data-preset="turn"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#derivative-presets [data-preset="turn"]')?.getAttribute('aria-pressed') === 'true'`);
    await focus(page.send, '#derivative-canvas');
    await keyTap(page.send, 'ArrowRight', 'ArrowRight', 39);
    const oneStep = await evalJson(page.send, `({
      readout: document.querySelector('#derivative-readout')?.textContent || '',
      sentence: document.querySelector('#derivative-sentence')?.textContent || '',
      pressed: document.querySelector('#derivative-presets [data-preset="turn"]')?.getAttribute('aria-pressed') || ''
    })`);
    check('one key off the turn is already not a square', oneStep.pressed === 'false' && oneStep.readout.includes('image = not a square') && oneStep.sentence.includes('smear'), JSON.stringify(oneStep));

    await go(page.send, `${base}#home-t2`);
    const focused = await evalJson(page.send, `({
      map: document.body.dataset.map,
      focus: document.querySelector('#home-map svg')?.getAttribute('data-focus') || '',
      mappings: document.querySelector('#home-map a[href="#mappings"]')?.getAttribute('data-on-focus') || '',
      staircase: document.querySelector('#home-map a[href="#staircase"]')?.getAttribute('data-on-focus') || '',
      stops: document.querySelector('#home-map .map-thread[data-thread="T2"]')?.getAttribute('data-stops') || '',
      dot: !!document.querySelector('#home-map a[href="#problem-1-3-1"]'),
      legend: document.querySelector('#home-legend a[data-thread="T2"]')?.getAttribute('aria-current') || ''
    })`);
    check('#home-t2 lights T2 on test 1', focused.map === 'test1' && focused.focus === 'T2' && focused.staircase === 'true' && focused.mappings === 'false' && focused.legend === 'true', JSON.stringify(focused));
    check('the T2 line skips a stop it does not teach', focused.stops.includes('staircase') && !focused.stops.split(' ').includes('mappings'), focused.stops);
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
    await go(page.send, `http://127.0.0.1:${served.port}/fresh/#home`);
    const freshHome = await evalJson(page.send, `({
      finder: !!document.querySelector('#home-finder'),
      dot: !!document.querySelector('#home-dot'),
      readout: document.querySelector('#home-readout')?.textContent || '',
      chips: document.querySelectorAll('#home-dot-panel .chip').length
    })`);
    check('a line course home is a finder and one real dot', freshHome.finder && freshHome.dot && freshHome.chips === 0 && freshHome.readout.includes('x =') && !freshHome.readout.includes('angle'), JSON.stringify(freshHome));

    await go(page.send, `http://127.0.0.1:${served.port}/stamped/#secant`);
    await evalJson(page.send, `document.querySelector('[data-preset="one"]')?.click()`);
    await waitFor(page.send, `document.querySelector('[data-preset="one"]')?.getAttribute('aria-pressed') === 'true'`);
    const secant = await evalJson(page.send, `({
      station: document.querySelector('#view')?.dataset?.station,
      canvas: !!document.querySelector('#secant-canvas'),
      readout: document.querySelector('#secant-readout')?.textContent || '',
      half: document.querySelector('[data-preset="half"]')?.getAttribute('aria-pressed') || '',
      sentence: document.querySelector('#secant-sentence')?.textContent || '',
      body: document.body.innerText || ''
    })`);
    check('stamped station presses its chip', secant.station === 'secant' && secant.canvas && secant.readout.includes('1.000') && secant.half === 'false', JSON.stringify(secant));
    check('stamped page does not apologise', !secant.body.includes('STAMP_OPEN') && !/unfinished/i.test(secant.body) && secant.sentence.includes('hand'), secant.sentence);

    const calcBase = `http://127.0.0.1:${served.port}/calc/`;
    await go(page.send, `${calcBase}#output`);
    await evalJson(page.send, `document.querySelector('#output-presets [data-preset="one"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#output-presets [data-preset="one"]')?.getAttribute('aria-pressed') === 'true'`);
    const f1 = await evalJson(page.send, `({
      readout: document.querySelector('#output-readout')?.textContent || '',
      sentence: document.querySelector('#output-sentence')?.textContent || '',
      exercise: document.querySelector('[data-exercise="8"]')?.textContent || '',
      touch: getComputedStyle(document.querySelector('#output-canvas')).touchAction
    })`);
    check('calculus f(1) is 2 and the sentence says so', f1.readout.includes('x = 1.000') && f1.readout.includes('value = 2.000') && f1.sentence.includes('above 1') && f1.exercise.includes('Exercise 8'), JSON.stringify(f1));
    check('the graph canvas refuses a browser scroll while the finger is down', f1.touch === 'none', f1.touch);
    await evalJson(page.send, `document.querySelector('#output-presets [data-preset="zero"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#output-presets [data-preset="zero"]')?.getAttribute('aria-pressed') === 'true'`);
    const f0 = await evalJson(page.send, `({
      readout: document.querySelector('#output-readout')?.textContent || '',
      sentence: document.querySelector('#output-sentence')?.textContent || ''
    })`);
    check('calculus f(0) sits on 1, so the above-1 sentence is false', f0.readout.includes('value = 1.000') && f0.sentence.includes('not above 1'), JSON.stringify(f0));
    await evalJson(page.send, `document.querySelector('#output-presets [data-preset="three"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#output-presets [data-preset="three"]')?.getAttribute('aria-pressed') === 'true'`);
    const f3 = await evalJson(page.send, `document.querySelector('#output-readout')?.textContent || ''`);
    check('calculus f(3) is 28', f3.includes('x = 3.000') && f3.includes('value = 28.000'), f3);
    await go(page.send, `${calcBase}#home`);
    const calcHome = await evalJson(page.send, `({
      readout: document.querySelector('#home-readout')?.textContent || '',
      sentence: document.querySelector('#home-dot-sentence')?.textContent || ''
    })`);
    check('a calculus home is a real line, with a sentence about x', calcHome.readout.includes('x = 1.000') && !calcHome.readout.includes('angle') && calcHome.sentence.includes('x is positive'), JSON.stringify(calcHome));
    await focus(page.send, '#home-dot');
    for (let i = 0; i < 9; i += 1) await keyTap(page.send, 'ArrowLeft', 'ArrowLeft', 37);
    const calcLeft = await evalJson(page.send, `({
      readout: document.querySelector('#home-readout')?.textContent || '',
      sentence: document.querySelector('#home-dot-sentence')?.textContent || ''
    })`);
    check('arrow keys on the line cross into x is not positive', calcLeft.readout.startsWith('x = -') && calcLeft.sentence.includes('not positive') && !calcLeft.readout.includes('angle'), JSON.stringify(calcLeft));

    const linearBase = `http://127.0.0.1:${served.port}/linalg/`;
    await go(page.send, linearBase);
    const linearHome = await evalJson(page.send, `({
      title: document.querySelector('#home-dot-panel h2')?.textContent || '',
      readout: document.querySelector('#home-readout')?.textContent || '',
      sentence: document.querySelector('#home-dot-sentence')?.textContent || '',
      chips: document.querySelectorAll('#home-dot-panel .chip').length,
      threads: document.querySelectorAll('#home-legend a').length,
      topics: document.querySelectorAll('#home-topics a').length,
      source: document.querySelector('.source-tag')?.textContent || ''
    })`);
    check('linear algebra home is a square with no chips', linearHome.title === 'The square' && linearHome.chips === 0 && linearHome.readout.includes('image = square') && linearHome.readout.includes('det = 1.000') && !linearHome.readout.includes('angle') && linearHome.sentence.includes('not been sheared'), JSON.stringify(linearHome));
    check('linear algebra home cites section 2.6 and draws both threads', linearHome.source.includes('§2.6') && linearHome.threads === 2 && linearHome.topics === 0, JSON.stringify(linearHome));
    await focus(page.send, '#home-dot');
    await keyTap(page.send, 'ArrowRight', 'ArrowRight', 39);
    const shearedHome = await evalJson(page.send, `({
      readout: document.querySelector('#home-readout')?.textContent || '',
      sentence: document.querySelector('#home-dot-sentence')?.textContent || ''
    })`);
    check('one key on the home square shears it', shearedHome.readout.includes('image = not a square') && shearedHome.sentence.includes('parallelogram'), JSON.stringify(shearedHome));

    await go(page.send, `${linearBase}#wide`);
    await evalJson(page.send, `document.querySelector('#wide-presets [data-preset="double"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#wide-presets [data-preset="double"]')?.getAttribute('aria-pressed') === 'true'`);
    const wide = await evalJson(page.send, `({
      readout: document.querySelector('#wide-readout')?.textContent || '',
      sentence: document.querySelector('#wide-sentence')?.textContent || '',
      exercise: document.querySelector('[data-exercise="2.6.3.1"]')?.textContent || '',
      book: document.querySelector('.source-tag a')?.getAttribute('href') || ''
    })`);
    check('horizontal stretch at 2 is not a square', wide.readout.includes('t = 2.000') && wide.readout.includes('det = 2.000') && wide.readout.includes('image = not a square') && wide.sentence.includes('wide rectangle') && wide.exercise.includes('2.6.3.1') && wide.book.includes('sec-transforms-geom.html'), JSON.stringify(wide));
    await evalJson(page.send, `document.querySelector('#wide-presets [data-preset="stay"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#wide-presets [data-preset="stay"]')?.getAttribute('aria-pressed') === 'true'`);
    const stayed = await evalJson(page.send, `document.querySelector('#wide-sentence')?.textContent || ''`);
    check('horizontal stretch at 1 is still a square', stayed.includes('still a square'), stayed);

    await go(page.send, `${linearBase}#scale`);
    await evalJson(page.send, `document.querySelector('#scale-presets [data-preset="double"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#scale-presets [data-preset="double"]')?.getAttribute('aria-pressed') === 'true'`);
    const doubled = await evalJson(page.send, `({
      readout: document.querySelector('#scale-readout')?.textContent || '',
      sentence: document.querySelector('#scale-sentence')?.textContent || ''
    })`);
    check('a dilation by 2 is still a square', doubled.readout.includes('image = square') && doubled.readout.includes('det = 4.000') && doubled.sentence.includes('still a square'), JSON.stringify(doubled));
    await evalJson(page.send, `document.querySelector('#scale-presets [data-preset="stay"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#scale-presets [data-preset="stay"]')?.getAttribute('aria-pressed') === 'true'`);
    const notDouble = await evalJson(page.send, `document.querySelector('#scale-sentence')?.textContent || ''`);
    check('the stay chip is not the doubling', notDouble.includes('not the doubling'), notDouble);

    await go(page.send, `${linearBase}#turn`);
    await evalJson(page.send, `document.querySelector('#turn-presets [data-preset="clock"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#turn-presets [data-preset="clock"]')?.getAttribute('aria-pressed') === 'true'`);
    const clock = await evalJson(page.send, `({
      readout: document.querySelector('#turn-readout')?.textContent || '',
      sentence: document.querySelector('#turn-sentence')?.textContent || ''
    })`);
    check('the clockwise quarter turn moves the corner and stays a square', clock.readout.includes('corner = (0.200, -1.150)') && clock.readout.includes('image = square') && clock.sentence.includes('fourth quadrant'), JSON.stringify(clock));
    await evalJson(page.send, `document.querySelector('#turn-presets [data-preset="stay"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#turn-presets [data-preset="stay"]')?.getAttribute('aria-pressed') === 'true'`);
    const unturned = await evalJson(page.send, `document.querySelector('#turn-sentence')?.textContent || ''`);
    check('the stay chip is not the clockwise quarter turn', unturned.includes('not that clockwise'), unturned);

    await go(page.send, `${linearBase}#shear`);
    await evalJson(page.send, `document.querySelector('#shear-presets [data-preset="slide"]')?.click()`);
    await waitFor(page.send, `document.querySelector('#shear-presets [data-preset="slide"]')?.getAttribute('aria-pressed') === 'true'`);
    const slid = await evalJson(page.send, `({
      readout: document.querySelector('#shear-readout')?.textContent || '',
      sentence: document.querySelector('#shear-sentence')?.textContent || ''
    })`);
    check('the shear is a parallelogram and keeps the area', slid.readout.includes('det = 1.000') && slid.readout.includes('corner = (1.350, 0.200)') && slid.readout.includes('image = not a square') && slid.sentence.includes('parallelogram'), JSON.stringify(slid));

    await go(page.send, `${linearBase}#cards`);
    const linearCard = await evalJson(page.send, `document.querySelector('#flashcard-station a')?.getAttribute('href') || ''`);
    check('the first linear algebra card links to its station', linearCard === '#wide', linearCard);
    await go(page.send, `${linearBase}#practice`);
    const linearPractice = await evalJson(page.send, `document.querySelectorAll('.problem-card').length`);
    check('linear algebra practice lists the four exercises', linearPractice === 4, String(linearPractice));
    await go(page.send, `${linearBase}#home-axes`);
    const axes = await evalJson(page.send, `({
      focus: document.querySelector('#home-map svg')?.getAttribute('data-focus') || '',
      wide: document.querySelector('#home-map a[href="#wide"]')?.getAttribute('data-on-focus') || '',
      turn: document.querySelector('#home-map a[href="#turn"]')?.getAttribute('data-on-focus') || '',
      stops: document.querySelector('#home-map .map-thread[data-thread="axes"]')?.getAttribute('data-stops') || ''
    })`);
    check('the axes thread skips the quarter turn', axes.focus === 'axes' && axes.wide === 'true' && axes.turn === 'false' && axes.stops.includes('wide') && !axes.stops.split(' ').includes('turn'), JSON.stringify(axes));

    await page.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 1, mobile: true });
    const fits = async (url) => {
      await go(page.send, url);
      return evalJson(page.send, `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`);
    };
    check('360px home does not scroll sideways', await fits(base) === true);
    check('360px picture does not scroll sideways', await fits(`${base}#addresses`) === true);
    check('360px staircase does not scroll sideways', await fits(`${base}#staircase`) === true);
    check('360px mappings does not scroll sideways', await fits(`${base}#mappings`) === true);
    check('360px roots does not scroll sideways', await fits(`${base}#roots`) === true);
    check('360px derivative does not scroll sideways', await fits(`${base}#derivative`) === true);
    check('360px calculus graph does not scroll sideways', await fits(`${calcBase}#output`) === true);
    check('360px linear algebra picture does not scroll sideways', await fits(`${linearBase}#wide`) === true);
    check('360px linear algebra home does not scroll sideways', await fits(linearBase) === true);
    check('360px stamped picture does not scroll sideways', await fits(`http://127.0.0.1:${served.port}/stamped/#secant`) === true);
    await go(page.send, `${base}#staircase`);
    await evalJson(page.send, `document.querySelector('#staircase-canvas')?.scrollIntoView({ block: 'center' })`);
    const touchBox = await boxOf(page.send, '#staircase-canvas');
    const touchStart = { x: touchBox.x + 48, y: touchBox.y + touchBox.h / 2 };
    const touchEnd = { x: touchBox.x + touchBox.w - 48, y: touchBox.y + touchBox.h / 2 };
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await touchAt(page.send, 'touchStart', touchStart.x, touchStart.y);
    await touchAt(page.send, 'touchMove', touchEnd.x, touchEnd.y);
    await touchAt(page.send, 'touchEnd', touchEnd.x, touchEnd.y);
    const touched = await evalJson(page.send, `document.querySelector('#staircase-readout')?.textContent || ''`);
    check('a finger drag on the graph moves x', touched.includes('x = 4.') || touched.includes('x = 3.'), touched);

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
