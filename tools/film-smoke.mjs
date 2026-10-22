// Node checks for the film panel clock (js/core/film.js) and the film data (js/data/films.js).
// Run: node tools/film-smoke.mjs
// A fake animation frame and a fake page clock: every seek the player makes is recorded.
// assertFilmClock is the same pause checks kit/smoke.mjs runs on a generated copy.

import { createFilmPlayer, filmStops } from '../js/core/film.js';
import { createMotion } from '../js/core/anim.js';
import { FILMS, filmsFor } from '../js/data/films.js';
import { stationById } from '../js/registry.js';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

let failed = 0;
function check(name, cond) {
  if (!cond) { failed += 1; console.error('FAIL', name); } else console.log('ok  ', name);
}

export function assertFilmClock(createFilmPlayer, filmStops, createMotion, check) {

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
  const seeks = [];
  let reduced = !!opts.reduced;
  const p = createFilmPlayer({ duration: 2, beats: [0, 0.5, 1.2, 2], seek: (t) => seeks.push(t), motion: createMotion(F.env), reduced: () => reduced });
  return { F, p, seeks, setReduced: (v) => { reduced = v; } };
}

{ // opens on the finished last frame
  const { p } = rig();
  const s = p.state();
  check('opens on the end frame', s.t === 2 && s.atEnd && !s.playing);
  check('a fresh film says Play', s.label === 'Play');
}
{ // play from the start, then pause freezes, then continue from the frozen value
  const { F, p, seeks } = rig();
  p.toggle();
  check('play starts at 0', seeks[seeks.length - 1] === 0 && p.state().playing);
  check('while playing the button says Pause', p.state().label === 'Pause');
  for (let i = 0; i < 30; i++) F.frame(16);
  const mid = p.t;
  check('elapsed time moves the film', mid > 0.3 && mid < 0.6);
  p.toggle();
  const n = seeks.length;
  check('Pause freezes the film where it is', p.t === mid && !p.state().playing);
  check('a paused film says Play', p.state().label === 'Play');
  check('a paused film draws nothing', F.frame(16) === 0 && F.frame(16) === 0 && seeks.length === n && F.queued === 0);
  p.toggle();
  F.frame(16); F.frame(16);
  check('the next click continues from the frozen value', seeks[n] === mid && p.t > mid && p.t < mid + 0.1);
}
{ // a hidden tab moves nothing; a long gap does not jump the film
  const { F, p, seeks } = rig();
  p.toggle();
  for (let i = 0; i < 10; i++) F.frame(16);
  const before = p.t;
  F.hide();
  const n = seeks.length;
  check('hidden: nothing is scheduled', F.frame(16) <= 1 && F.queued === 0);
  check('hidden: no seek', seeks.length <= n + 1);
  F.frame(5000);
  F.show();
  F.frame(5000);
  F.frame(16);
  check('a gap longer than a frame does not move the film', p.t - before < 0.1);
}
{ // a finished film plays again from the start
  const { F, p, seeks } = rig();
  p.toggle();
  for (let i = 0; i < 200 && p.state().playing; i++) F.frame(16);
  check('it finishes on the end frame', p.t === 2 && !p.state().playing);
  check('a watched film says Play again', p.state().label === 'Play again');
  check('nothing is left queued after the end', F.queued === 0);
  p.toggle();
  check('Play again starts at 0', seeks[seeks.length - 1] === 0);
}
{ // the scrubber pauses and seeks
  const { F, p } = rig();
  p.toggle(); F.frame(16); F.frame(16);
  p.scrub(1.5);
  check('scrub stops the motion and seeks', p.t === 1.5 && !p.state().playing && F.frame(16) === 0);
}
{ // reduced motion steps between finished frames, and never says Pause
  const { F, p, seeks } = rig({ reduced: true });
  check('stops sit just before each beat, then the end', JSON.stringify(filmStops(2, [0, 0.5, 1.2, 2])) === JSON.stringify([0.45, 1.15, 2]));
  check('reduced: a fresh film says Next step', p.state().label === 'Next step');
  p.toggle();
  check('reduced: the first step is the first finished frame', p.t === 0.45 && F.queued === 0);
  p.toggle();
  check('reduced: next step', p.t === 1.15 && p.state().label === 'Next step');
  p.toggle();
  check('reduced: the last step is the end', p.t === 2 && p.state().label === 'Start again');
  p.toggle();
  check('reduced: start again', p.t === 0.45);
  check('reduced: no frame is ever scheduled', F.queued === 0 && seeks.every((s) => [0.45, 1.15, 2].includes(s)));
}
{ // unmount leaves no loop
  const { F, p, seeks } = rig();
  p.toggle(); F.frame(16);
  p.destroy();
  const n = seeks.length;
  F.frame(16); F.frame(16);
  check('destroy leaves no queued frame and no seek', F.queued === 0 && seeks.length === n);
  p.toggle();
  check('a destroyed player ignores clicks', F.queued === 0 && seeks.length === n);
}
{ // reduced motion: the scrubber lands on a finished frame, and turning it on freezes a playing film
  const { p } = rig({ reduced: true });
  p.scrub(1.5);
  check('reduced: scrub lands on a finished frame', p.t === 1.15 && !p.state().playing);
  const playing = rig();
  playing.p.toggle();
  for (let i = 0; i < 10; i++) playing.F.frame(16);
  const mid = playing.p.t;
  playing.setReduced(true);
  playing.p.noteMotion();
  const n = playing.seeks.length;
  check('turning on reduced motion freezes the film', !playing.p.playing && playing.p.t === mid && playing.p.state().label === 'Next step');
  check('that frozen film draws nothing', playing.F.frame(16) === 0 && playing.seeks.length === n && playing.F.queued === 0);
}
}

function main() {
// the data: every film sits on a real station, has a page, cites the book with a link, and links real places
for (const f of FILMS) {
  check(`${f.id}: station ${f.station} exists`, !!stationById(f.station));
  check(`${f.id}: listed for its station`, filmsFor(f.station).includes(f));
  const path = new URL(`../${f.src}`, import.meta.url);
  check(`${f.id}: page ${f.src} exists`, existsSync(path));
  if (existsSync(path)) {
    const html = readFileSync(path, 'utf8');
    const duration = (html.match(/data-duration="([0-9.]+)"/) || [])[1];
    check(`${f.id}: page has one timeline and beats`, html.includes('window.__tl=tl') && html.includes('window.__beats='));
    check(`${f.id}: the first paint is the finished frame`, !!duration && html.includes(`draw(${duration})`));
    check(`${f.id}: page publishes a readout`, html.includes('data-readout'));
    check(`${f.id}: page has no play button or ticker of its own`, !html.includes('controls.js') && !/gsap\.ticker/.test(html) && !/requestAnimationFrame|setTimeout|setInterval/.test(html));
    check(`${f.id}: page is M0.2j and stacked`, html.includes('data-layout="stacked"') && html.includes('shared/stack.js') && html.includes('shared/hostclock.js') && html.indexOf('shared/hostclock.js') > html.indexOf('window.__tl') && html.lastIndexOf('shared/fit.js') > html.indexOf('window.__tl'));
    check(`${f.id}: page assets are local`, !/https?:\/\//.test(html.replace(/<div class="cite">[^<]*<\/div>/, '')));
    check(`${f.id}: page cites the book`, /Howell &amp; Mathews/.test(html));
    check(`${f.id}: dark colours are the site tokens`, html.includes('--bg:#0d121c') && html.includes('--cart:#62adf2') && html.includes('--input:#3fd0a0'));
    check(`${f.id}: does not load edges.js`, !html.includes('edges.js'));
    check(`${f.id}: page can reflow under the type floor`, html.includes('shared/stack.js') && html.includes('window.__filmFit') && html.includes('__planePad') && html.includes("dataset.stack==='portrait'"));
    check(`${f.id}: page answers setParams`, html.includes('window.__onParams') && !html.includes('__setFilmParams'));
    if (f.id === 'unity') check('unity picture names the multiply turn', html.includes('the multiply turn, backwards'));
    if (f.id === 'orbit') check('orbit finished frame names the multiply turn', html.includes("The square is the multiply turn."));
  }
  check(`${f.id}: a null pdf is not a guessed PDF number`, f.cites.every((c) => c.pdf || !/PDF/.test(c.pin)));
  check(`${f.id}: cites have a section and a link`, f.cites.length > 0 && f.cites.every((c) => /§\d\.\d/.test(c.pin) && /^https:\/\/complexanalysis\.org\/web\//.test(c.href)));
  check(`${f.id}: links go to real places`, f.links.every(([h]) => !!stationById(h.replace(/^#/, ''))));
}
for (const a of ['house.css', 'gsap.min.js', 'edges.js', 'fit.js', 'hostclock.js', 'stack.js', 'DejaVuSans.ttf', 'DejaVuSansMono.ttf']) {
  check(`films/shared/${a} is shipped`, existsSync(new URL(`../films/shared/${a}`, import.meta.url)));
}
{
  const fitSrc = readFileSync(new URL('../films/shared/fit.js', import.meta.url), 'utf8');
  const stackSrc = readFileSync(new URL('../films/shared/stack.js', import.meta.url), 'utf8');
  const clockSrc = readFileSync(new URL('../films/shared/hostclock.js', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../js/core/film.js', import.meta.url), 'utf8');
  check('stack.js reflows under 835px at 15px or more, and has no clock', stackSrc.includes('innerWidth') && stackSrc.includes('clientWidth') && stackSrc.includes('< 835') && stackSrc.includes('#stairs') && stackSrc.includes('font-size:16px') && stackSrc.includes('font-size:15px') && stackSrc.includes('data-stack') && !stackSrc.includes('dataset.layout') && !/requestAnimationFrame|setTimeout|setInterval/.test(stackSrc));
  check('fit.js is the trunk v0.4.4 rule and does not scale a stacked page', fitSrc.includes('v0.4.4') && fitSrc.includes('__hfFit') && fitSrc.includes("=== 'stacked'") && fitSrc.includes("fq === '1'"));
  check('hostclock.js is M0.2j from trunk v0.4.5 and sleeps the ticker', clockSrc.includes('v0.4.5') && clockSrc.includes('__hostclock') && clockSrc.includes('ticker.sleep') && clockSrc.includes("hf: 'seek'") && clockSrc.includes('setParams') && clockSrc.includes("hf: 'params'") && clockSrc.includes('__onParams'));
  check('stack.js does not keep a second param channel', !stackSrc.includes('__setFilmParams'));
  check('the panel seeks the host clock and reseeds through setParams', panel.includes('__hostclock') && panel.includes('hc.seek') && panel.includes('hc.setParams') && panel.includes('readouts') && panel.includes('console.error') && !panel.includes('__setFilmParams'));
  check('a page without the host clock still sleeps the ticker', panel.includes('ticker.sleep'));
  check('the panel uses the same 835px cut and does not pan', panel.includes('const PORTRAIT_W = 835') && panel.includes('w < PORTRAIT_W') && !panel.includes('film-stage-pan'));
  const kitPanel = readFileSync(new URL('../kit/template/js/core/film.js', import.meta.url), 'utf8');
  check('the kit panel uses the same cut', kitPanel.includes('const PORTRAIT_W = 835') && kitPanel.includes('hc.seek') && kitPanel.includes('hc.setParams') && !kitPanel.includes('__setFilmParams'));
  const house = readFileSync(new URL('../films/shared/house.css', import.meta.url), 'utf8');
  check('the cite is 23px, the smallest glyph in the crop', house.includes('font:23px "DVM"') && house.includes('font-size:23px'));
  check('an unchecked PDF number is flagged', panel.includes('PDF number not checked'));
}
{
  const hrefs = (id) => FILMS.find((f) => f.id === id).links.map((link) => link[0]);
  check('multiply links the divide and the square', hrefs('multiply').includes('#roots') && hrefs('multiply').includes('#zero'));
  check('unity links the turn and the square', hrefs('unity').includes('#arithmetic') && hrefs('unity').includes('#zero'));
  check('the orbit links the turn and the divide', hrefs('orbit').includes('#arithmetic') && hrefs('orbit').includes('#roots'));
  check('a film has at most 4 same-move links', FILMS.every((f) => f.links.length <= 4));
  const unity = FILMS.find((f) => f.id === 'unity');
  const multiply = FILMS.find((f) => f.id === 'multiply');
  check('unity lede follows n', /the n on this stop/.test(unity.lede) && !/five fifth-roots/.test(unity.lede));
  check('multiply cite treats the book pair as a special case', /special case/.test(multiply.cites[0].pin) && /Equation \(1\.4\.10\)/.test(multiply.cites[0].pin));
  check('multiply opens as the worked example, not the book figure', multiply.kicker === 'Worked example' && /5 \+ 14i/.test(multiply.lede));
}
{
  const orbit = readFileSync(new URL('../films/film-orbit.html', import.meta.url), 'utf8');
  check('orbit headline is stays, and the line names the cycle', orbit.includes('Settles at ') && orbit.includes('Stays. It cycles ') && orbit.includes("return 'Leaves.'") && !orbit.includes('Cycles:') && !orbit.includes('stays bounded'));
}
{
  const mul = readFileSync(new URL('../films/film-multiply.html', import.meta.url), 'utf8');
  check('multiply angle arc follows |z|, not the view', mul.includes('0.34*RZ') && mul.includes('0.62*RZ') && !mul.includes('/4.3'));
}
{
  const board = readFileSync(new URL('../js/stations/matrix-board.js', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../js/stations/home.js', import.meta.url), 'utf8');
  const test2 = readFileSync(new URL('../js/data/test2.js', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const zero = readFileSync(new URL('../js/stations/concept.js', import.meta.url), 'utf8');
  check('the board is the chain, not a stage catalog', board.includes('THROUGHLINE') && board.includes('The same turn') && !board.includes('Layout'));
  check('map banners name the chapters', home.includes("I: 'The point (Ch 1)'") && !home.includes('R21'));
  check('test 2 banners name the sections', test2.includes("A: 'Sequences (4.1)'") && !test2.includes('R16'));
  check('nav titles name the chapters', app.includes("title: 'The point'") && !app.includes('R21'));
  check('the c = i chip headlines Stays and names the cycle', zero.includes('Stays. It cycles. Example 4.2.12'));
}
{
  const sans = statSync(new URL('../films/shared/DejaVuSans.ttf', import.meta.url)).size;
  const mono = statSync(new URL('../films/shared/DejaVuSansMono.ttf', import.meta.url)).size;
  check('DejaVu Sans is the film subset', sans < 80000, String(sans));
  check('DejaVu Sans Mono is the film subset', mono < 50000, String(mono));
}

if (failed) { console.error(`\n${failed} film check(s) failed`); process.exit(1); }
console.log('\nall film checks passed');
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  assertFilmClock(createFilmPlayer, filmStops, createMotion, check);
  main();
}
