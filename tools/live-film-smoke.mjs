// The live sequence player: one clock, a parameter that moves during play, branching beats.
// Run: node tools/live-film-smoke.mjs
// The node checks are the clock. The chrome checks load live/settle.html and drag z while it plays.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMotion } from '../js/core/anim.js';
import { filmStops } from '../js/core/film.js';
import {
  DURATION,
  EXP_DURATION,
  SETTLED,
  TAIL,
  WINDOW,
  beatsFor,
  createLivePlayer,
  expFrame,
  fateOf,
  finishedStops,
  placeReal,
  placeSeed,
  powers,
  settleFrame,
} from '../js/core/live-film.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
let failed = 0;

function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name);
  } else {
    console.log('ok  ', name);
  }
}

function fakeEnv() {
  let now = 0;
  let q = [];
  let hidden = false;
  let vis = [];
  return {
    env: {
      raf: (fn) => { q.push(fn); return q.length; },
      cancel: () => { q = []; },
      hidden: () => hidden,
      onVisible: (fn) => { vis.push(fn); return () => { vis = vis.filter((f) => f !== fn); }; },
    },
    frame(ms = 16) { now += ms; const run = q; q = []; for (const f of run) f(now); return run.length; },
    get queued() { return q.length; },
    hide() { hidden = true; },
    show() { hidden = false; const v = vis; vis = []; for (const f of v) f(); },
  };
}

function rig(opts = {}) {
  const F = fakeEnv();
  const draws = [];
  let reduced = !!opts.reduced;
  const player = createLivePlayer({
    duration: DURATION,
    params: opts.params || SETTLED,
    motion: createMotion(F.env),
    reduced: () => reduced,
    onFrame: (scene) => draws.push({ t: scene.t, re: scene.re, im: scene.im, fate: scene.fate, holds: scene.claim.holds, index: scene.index }),
  });
  return { F, player, draws, setReduced: (v) => { reduced = v; } };
}

const mod = Math.hypot(SETTLED.re, SETTLED.im);

{ // the sequence the film already draws
  const pts = powers(SETTLED.re, SETTLED.im, 8);
  check('z^0 is 1', pts[0].re === 1 && pts[0].im === 0);
  check('z^2 is 0.1875 + 0.25i', Math.abs(pts[2].re - 0.1875) < 1e-12 && Math.abs(pts[2].im - 0.25) < 1e-12);
  check('|1/2 + i/4| is √5 / 4', Math.abs(mod - Math.sqrt(5) / 4) < 1e-12);
  const end = settleFrame(DURATION, SETTLED);
  check('the finished frame has settled inside the disk', end.index === 8 && end.termMod < TAIL && end.claim.holds && end.fate === 'settle');
  const open = settleFrame(0, SETTLED);
  check('the first term has not settled', open.index === 0 && open.claim.holds === false && /outside the disk/.test(open.claim.text));
  check('on the circle the terms stay', settleFrame(DURATION, { re: 1, im: 0 }).claim.text.startsWith('Stays.'));
  check('outside the circle the terms leave', settleFrame(DURATION, { re: 1.2, im: 0 }).claim.text.startsWith('Leaves.'));
}

{ // the hand can hold the circle, and cannot drag the point off the plane
  const on = placeSeed(1 + 0.04, 0.01);
  check('a near miss snaps onto the circle', on.snapped && Math.abs(Math.hypot(on.re, on.im) - 1) < 1e-12);
  const off = placeSeed(1.2, -0.4);
  check('a clear outside point does not snap', !off.snapped && off.re === 1.2);
  const far = placeSeed(4, -3);
  check('the seed stays inside the window', far.re === WINDOW && far.im === -WINDOW);
}

{ // beats follow the branch, and the reduced-motion stops match the film panel
  const settleBeats = beatsFor(mod);
  const stayBeats = beatsFor(1);
  const leaveBeats = beatsFor(1.2);
  check('the three branches do not share a beat list', JSON.stringify(settleBeats) !== JSON.stringify(stayBeats) && JSON.stringify(stayBeats) !== JSON.stringify(leaveBeats));
  check('settling enters the disk before the film ends', settleBeats[2] > 1 && settleBeats[2] < DURATION);
  check('leaving crosses the window before the film ends', leaveBeats[2] > 1 && leaveBeats[2] < DURATION);
  for (const beats of [settleBeats, stayBeats, leaveBeats, [0, 0.5, 1.2, 2]]) {
    check('finished stops match the film panel', JSON.stringify(finishedStops(DURATION, beats)) === JSON.stringify(filmStops(DURATION, beats)) || JSON.stringify(finishedStops(2, beats)) === JSON.stringify(filmStops(2, beats)));
  }
  check('the stop cut is the film panel cut', JSON.stringify(finishedStops(2, [0, 0.5, 1.2, 2])) === JSON.stringify(filmStops(2, [0, 0.5, 1.2, 2])));
  check('fate is the circle', fateOf(0.2) === 'settle' && fateOf(1) === 'stay' && fateOf(1.2) === 'leave');
}

{ // §5.1: the clock owns the angle, the hand owns the radius
  const end = expFrame(EXP_DURATION, { re: 0 });
  check('a full turn of e^{iy} lands on -1', end.snapped && Math.abs(end.y - Math.PI) < 1e-9 && Math.abs(end.re + 1) < 1e-9 && end.claim.holds);
  const mid = expFrame(EXP_DURATION / 2, { x: 0 });
  check('halfway, e^{iy} is on the positive real axis', Math.abs(mid.y) < 1e-9 && Math.abs(mid.re - 1) < 1e-9 && Math.abs(mid.im) < 1e-9);
  const grown = expFrame(EXP_DURATION / 2, { re: Math.log(2) });
  check('a larger x keeps the angle and doubles the radius', Math.abs(grown.y) < 1e-9 && Math.abs(grown.radius - 2) < 1e-9 && grown.claim.holds === false);
  check('a near-zero real part snaps onto the imaginary axis', placeReal(0.04).snapped && placeReal(0.04).x === 0);
  const F = fakeEnv();
  const draws = [];
  const player = createLivePlayer({
    duration: EXP_DURATION,
    params: { re: 0, im: 0 },
    scene: (t, params) => expFrame(t, params),
    motion: createMotion(F.env),
    onFrame: (scene) => draws.push(scene),
  });
  player.toggle();
  F.frame(16);
  for (let i = 0; i < 20; i += 1) F.frame(16);
  const t0 = player.t;
  const y0 = player.scene().y;
  player.setParams({ re: Math.log(2), im: 0 });
  check('changing x while e^z plays does not rewind the angle', player.t === t0 && Math.abs(player.scene().y - y0) < 1e-9 && Math.abs(player.scene().radius - 2) < 1e-9 && player.playing);
}

{ // opens on the finished frame, and a paused player draws nothing
  const { F, player, draws } = rig();
  const s = player.state();
  check('opens on the end frame', s.t === DURATION && s.atEnd && !s.playing && s.label === 'Play');
  check('the opening picture has already settled', draws.at(-1).holds && draws.at(-1).fate === 'settle');
  const n = draws.length;
  check('a paused film draws nothing', F.frame(16) === 0 && F.frame(16) === 0 && draws.length === n && F.queued === 0);
}

{ // changing z while it plays does not rewind the clock
  const { F, player, draws } = rig();
  player.toggle();
  check('play starts at 0 and says Pause', player.t === 0 && player.state().playing && player.state().label === 'Pause');
  F.frame(16);
  for (let i = 0; i < 20; i += 1) F.frame(16);
  const mid = player.t;
  check('elapsed time moves the walk', mid > 0.25 && mid < 0.45);
  player.setParams({ re: 1.2, im: 0 });
  const jumped = draws.at(-1);
  check('the hand paints at the current time', jumped.t === mid && player.t === mid);
  check('the branch flips without a rewind', jumped.fate === 'leave' && jumped.holds === false && jumped.re === 1.2);
  F.frame(16);
  check('the clock keeps going on the new branch', player.t > mid && player.playing && player.scene().fate === 'leave' && player.scene().re === 1.2);
  const leaveBeats = player.scene().beats;
  check('the beats are now the leaving beats', JSON.stringify(leaveBeats) === JSON.stringify(beatsFor(1.2)));
  player.toggle();
  const n = draws.length;
  const frozen = player.t;
  check('Pause freezes the walk', !player.playing && player.state().label === 'Play');
  check('a paused film still draws nothing', F.frame(16) === 0 && F.frame(32) === 0 && draws.length === n && player.t === frozen && F.queued === 0);
  player.setParams({ re: SETTLED.re, im: SETTLED.im });
  check('a paused drag paints once and does not schedule', draws.length === n + 1 && draws.at(-1).t === frozen && draws.at(-1).fate === 'settle' && F.queued === 0);
}

{ // a hidden tab and a long gap do not jump the walk
  const { F, player } = rig();
  player.toggle();
  F.frame(16);
  for (let i = 0; i < 8; i += 1) F.frame(16);
  const before = player.t;
  F.hide();
  F.frame(16);
  F.frame(5000);
  F.show();
  F.frame(5000);
  F.frame(16);
  check('a gap longer than a frame does not move the walk', player.t - before < 0.1);
}

{ // a finished walk plays again from the start; scrub pauses
  const { F, player } = rig();
  player.toggle();
  for (let i = 0; i < 800 && player.playing; i += 1) F.frame(16);
  check('it finishes on the end frame', player.t === DURATION && !player.playing && player.state().label === 'Play again');
  check('nothing is left queued after the end', F.queued === 0);
  player.toggle();
  check('Play again starts at 0', player.t === 0 && player.playing);
  player.scrub(3.5);
  check('scrub stops the motion and seeks', player.t === 3.5 && !player.playing && F.queued === 0);
}

{ // reduced motion steps the current branch and never says Pause
  const { F, player } = rig({ reduced: true });
  const stops = player.stops();
  check('reduced: a fresh film says Next step', player.state().label === 'Next step' && F.queued === 0);
  player.toggle();
  check('reduced: the first step is the first finished frame', player.t === stops[0] && F.queued === 0);
  player.toggle();
  check('reduced: the next step follows', player.t === stops[1] && player.state().label === 'Next step');
  player.scrub(4);
  check('reduced: scrub lands on a finished frame', player.stops().includes(player.t) && !player.playing);
  const moved = rig();
  moved.player.toggle();
  moved.F.frame(16);
  for (let i = 0; i < 10; i += 1) moved.F.frame(16);
  const mid = moved.player.t;
  moved.setReduced(true);
  moved.player.noteMotion();
  const n = moved.draws.length;
  check('turning on reduced motion freezes the walk', !moved.player.playing && moved.player.t === mid && moved.player.state().label === 'Next step');
  check('that frozen walk draws nothing', moved.F.frame(16) === 0 && moved.draws.length === n && moved.F.queued === 0);
}

{ // unmount leaves no loop
  const { F, player, draws } = rig();
  player.toggle();
  F.frame(16);
  player.destroy();
  const n = draws.length;
  F.frame(16);
  player.toggle();
  player.setParams({ re: 1.2, im: 0 });
  check('destroy leaves no queued frame and ignores the hand', F.queued === 0 && draws.length === n);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
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
      bags.console.push((msg.params.args || []).map((a) => a.value || a.description).join(' '));
    }
    if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
      bags.bad.push(`${msg.params.response.status} ${msg.params.response.url}`);
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
  return { ws, send, bags, close: () => ws.close() };
}

async function waitFor(send, expression, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.result?.value) return result.result.value;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error(`timeout: ${expression}`);
}

async function evalJson(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'eval failed');
  return result.result?.value;
}

async function shot(send, path, width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
  await new Promise((r) => setTimeout(r, 80));
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(path, Buffer.from(data, 'base64'));
}

async function chromePass() {
  const userDataDir = await mkdtemp(join(tmpdir(), 'live-film-chrome-'));
  const shotDir = join(tmpdir(), 'live-film-shots');
  await mkdir(shotDir, { recursive: true });
  const { server, port } = await serve(root);
  let proc = null;
  try {
    const started = await startChrome(userDataDir);
    proc = started.chrome;
    const page = await openPage(started.browserWs, `http://127.0.0.1:${port}/live/settle.html`);
    await waitFor(page.send, '!!(window.__live && document.getElementById("claim").textContent)');
    const opened = await evalJson(page.send, `(() => {
      const s = __live.scene();
      return { holds: s.claim.holds, fate: s.fate, t: __live.player.t, label: __live.player.state().label, claim: document.getElementById('claim').textContent };
    })()`);
    check('page opens on the settled frame', opened.holds && opened.fate === 'settle' && opened.t === 8 && opened.label === 'Play' && opened.claim.startsWith('Settles'));
    await shot(page.send, join(shotDir, 'settled.png'), 1100, 1500);

    await evalJson(page.send, `document.getElementById('play').click()`);
    await waitFor(page.send, '__live.player.playing && __live.player.t > 0.2');
    const mid = await evalJson(page.send, `__live.player.t`);
    await evalJson(page.send, `__live.setZ(1.25, 0)`);
    const flipped = await evalJson(page.send, `(() => {
      const s = __live.scene();
      return { t: __live.player.t, playing: __live.player.playing, fate: s.fate, re: s.re, claim: document.getElementById('claim').textContent, holds: s.claim.holds };
    })()`);
    check('dragging z while it plays does not rewind', flipped.playing && flipped.t + 0.05 >= mid && flipped.t < mid + 0.15 && flipped.fate === 'leave' && flipped.re === 1.25 && flipped.holds === false && flipped.claim.startsWith('Leaves'));
    await waitFor(page.send, '__live.player.playing && __live.player.t > 2.4');
    const later = await evalJson(page.send, `(() => {
      const s = __live.scene();
      const exit = document.getElementById('exit');
      return { t: s.t, fate: s.fate, exit: exit.getAttribute('visibility'), time: document.getElementById('time').textContent };
    })()`);
    check('the walk is still leaving, and a term has gone out of the window', later.t > 2.4 && later.t < 7 && later.fate === 'leave' && later.exit === 'visible' && !later.time.startsWith('0.0'));
    await shot(page.send, join(shotDir, 'leaving.png'), 1100, 1500);

    await evalJson(page.send, `document.getElementById('play').click()`);
    const frozen = await evalJson(page.send, `__live.player.t`);
    await new Promise((r) => setTimeout(r, 200));
    const still = await evalJson(page.send, `({ t: __live.player.t, playing: __live.player.playing, label: document.getElementById('play').textContent })`);
    check('the page pause holds the time', still.t === frozen && still.playing === false && still.label === 'Play');

    await evalJson(page.send, `__live.setZ(${Math.SQRT1_2}, ${Math.SQRT1_2})`);
    const stayed = await evalJson(page.send, `(() => { const s = __live.scene(); return { snapped: s.snapped, mod: s.mod, fate: s.fate, claim: s.claim.text, t: s.t }; })()`);
    check('the circle is a place the hand can hold', stayed.snapped && Math.abs(stayed.mod - 1) < 1e-9 && stayed.fate === 'stay' && stayed.claim.startsWith('Stays') && stayed.t === frozen);

    const narrow = await evalJson(page.send, `(() => {
      const w = document.documentElement;
      return { scroll: w.scrollWidth, client: w.clientWidth };
    })()`);
    await page.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 780, deviceScaleFactor: 1, mobile: true });
    await new Promise((r) => setTimeout(r, 100));
    const phone = await evalJson(page.send, `(() => {
      const w = document.documentElement;
      const plane = document.getElementById('plane').getBoundingClientRect();
      return { scroll: w.scrollWidth, client: w.clientWidth, plane: plane.width };
    })()`);
    check('360px does not scroll sideways', phone.client <= 360 && phone.scroll <= phone.client + 1 && phone.plane <= 360 && phone.plane > 200);
    await shot(page.send, join(shotDir, 'phone.png'), 360, 1400);
    check('the page stays quiet', page.bags.exceptions.length === 0 && page.bags.console.length === 0 && page.bags.bad.length === 0);
    void narrow;
    page.close();
    console.log('shots', shotDir);
  } finally {
    if (proc) proc.kill();
    server.close();
    await new Promise((r) => setTimeout(r, 300));
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  chromePass().then(() => {
    if (failed) {
      console.error(`\n${failed} live-film check(s) failed`);
      process.exit(1);
    }
    console.log('\nall live-film checks passed');
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
