// tests/interact/i2-decisions-everywhere-c.mjs: the two decisions, the move glyph and the fresh-numbers preset on the five stations of
// goal i2-decisions-everywhere-c: branches, reciprocal, limits, derivative, cauchy-riemann.
//   node tools/smoke.mjs --route branches --script tests/interact/i2-decisions-everywhere-c.mjs --dark
// (one run: the script moves between the five stations itself; the header names a route for tools/interact-all.mjs)
// Steps: (1) A1 the chips on every card and as the function changes, (2) A2 the glyph beside f′(z₀) and A, (3) A3 each station opened by a
// StationRequest, the note, a bad request, reduced motion, (4) the video host, (5) layout and ids after all of it.
// Design: docs/designs/iter-2/i2-decisions-everywhere-c.md, section 7 and Appendix C.

import { settle, clickChip, readText, setSlider, dragHandle } from './_helpers.mjs';
import { problemById } from '../../js/data/problems.js';
import { namesMeaning, addressMeaning } from '../../js/core/decisions.js';
import { compile } from '../../js/core/parse.js';

const PI = Math.PI;

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 600;
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // ---- helpers
  const ready = (route) => page.waitForFunction((r) => { const v = document.getElementById('view'); return !!v && v.dataset.route === r && v.dataset.state === 'ready'; }, route, { timeout: 15000 });
  const go = async (route) => { await ev((r) => window.__mv.app.navigate(r), route); await ready(route); await settle(page, 3); };
  const open = async (station, problem, values) => {
    await ev(({ station, problem, values }) => { window.__mv.app.request({ station, problem, family: problem, values }); window.__mv.app.navigate(station); }, { station, problem, values });
    await ready(station);
    await settle(page, 3);
  };
  const text = (sel) => readText(page, sel);
  const attr = (sel, name) => ev(({ sel, name }) => { const e = document.querySelector(sel); return e ? e.getAttribute(name) : null; }, { sel, name });
  const count = (sel) => ev((s) => document.querySelectorAll(s).length, sel);
  const hidden = (sel) => ev((s) => { const e = document.querySelector(s); return !e || e.hidden || e.hasAttribute('hidden') || e.getBoundingClientRect().width === 0 || getComputedStyle(e).display === 'none'; }, sel);
  const chipsOf = (station) => ev((s) => {
    const a = document.getElementById(s + '-problem-address'), n = document.getElementById(s + '-problem-names');
    return { address: a ? a.dataset.value : null, names: n ? n.dataset.value : null, host: !!(a && a.closest('#' + s + '-problem-decisions')), cardHidden: !!(document.getElementById(s + '-problem') || { hidden: true }).hidden };
  }, station);
  const noOverflow = async (tag) => assert((await ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, `${tag}: no horizontal page scroll`);
  const noDupIds = async (tag) => {
    const dup = await ev(() => { const seen = new Map(); for (const e of document.querySelectorAll('[id]')) seen.set(e.id, (seen.get(e.id) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([k]) => k); });
    assert(dup.length === 0, `${tag}: duplicate ids ${dup.join(', ')}`);
  };
  const glyphOf = (id, readoutId) => ev(({ id, readoutId }) => {
    const g = document.getElementById(id), r = document.getElementById(readoutId);
    if (!g) return null;
    const box = g.getBoundingClientRect();
    return { label: g.getAttribute('aria-label'), hasHidden: g.hasAttribute('hidden'), shown: box.width > 0 && box.height > 0, tag: g.tagName.toLowerCase(), sibling: g.parentElement === r.parentElement, inside: r.contains(g), r: g.dataset.r, theta: g.dataset.theta, focusable: g.getAttribute('focusable') };
  }, { id, readoutId });

  // ================================================================ (1) A1: the chips
  const CARDS = [['problem-2-4-1', 'branches', '2.4.1'], ['problem-2-5-1', 'reciprocal', '2.5.1'], ['problem-2-3-1', 'limits', '2.3.1'],
    ['problem-3-1-2', 'derivative', '3.1.2'], ['problem-3-2-1', 'cauchy-riemann', '3.2.1']];
  for (const [route, station, pid] of CARDS) {
    await go(route);
    const p = problemById(pid);                                    // the table is read from the data, not trusted
    const c = await chipsOf(station);
    assert(c.address === p.address && c.names === p.names && c.host, `A1 ${route}: chips ${JSON.stringify(c)} vs ${p.address}/${p.names}`);
    assert((await text(`#${station}-problem-address`)).length > 0 && (await text(`#${station}-problem-names`)) === `names: ${p.names}`, `A1 ${route}: the names chip reads "names: ${p.names}"`);
    assert((await attr(`#${station}-problem-names`, 'aria-expanded')) === 'false' && await hidden(`#${station}-problem-meaning`), `A1 ${route}: the meaning starts closed`);
    await clickChip(page, `${station}-problem-names`);
    assert((await text(`#${station}-problem-meaning`)) === namesMeaning(p.names) && !(await hidden(`#${station}-problem-meaning`)), `A1 ${route}: tapping the names chip shows its meaning`);
    assert((await attr(`#${station}-problem-names`, 'aria-expanded')) === 'true', `A1 ${route}: aria-expanded follows the tap`);
    await clickChip(page, `${station}-problem-address`);
    assert((await text(`#${station}-problem-meaning`)) === addressMeaning(p.address), `A1 ${route}: the address chip switches the meaning`);
    await clickChip(page, `${station}-problem-address`);
    assert(await hidden(`#${station}-problem-meaning`), `A1 ${route}: a second tap closes it`);
    assert((await text(`#${station}-problem-note`)).indexOf('Fresh numbers') < 0, `A1 ${route}: no fresh-numbers note without a request`);
    await noOverflow(`A1 ${route}`);
  }
  log('A1: both chips on all five cards, with their meanings');

  // the chips follow the active problem
  await go('problem-2-3-1');
  await clickChip(page, 'limits-fn-x-over-z');
  let c = await chipsOf('limits');
  assert(c.address === problemById('P5').address && c.names === problemById('P5').names && (await text('#limits-problem')).includes('Problem P5'), `A1 limits: P5 chips ${JSON.stringify(c)}`);
  await clickChip(page, 'limits-fn-dir');
  assert((await text('#limits-problem')).includes('Problem 2.3.1'), 'A1 limits: back to 2.3.1');
  await go('problem-3-1-2');
  for (const [chip, pid] of [['sq-plus-z', '3.1.1'], ['re', 'P6'], ['abs2', '3.1.2']]) {
    await clickChip(page, `derivative-fn-${chip}`);
    c = await chipsOf('derivative');
    const p = problemById(pid);
    assert(c.address === p.address && c.names === p.names, `A1 derivative ${chip}: chips ${JSON.stringify(c)} vs ${pid} ${p.address}/${p.names}`);
    assert((await text('#derivative-problem')).includes('Problem ' + pid), `A1 derivative ${chip}: the card is ${pid}`);
  }
  assert(problemById('3.1.1').address === 'C' && problemById('3.1.1').names === 'none', 'A1: 3.1.1 is C / none, as the goal says');
  await clickChip(page, 'derivative-fn-cube');
  assert((await hidden('#derivative-problem')) && (await count('#derivative-problem-address')) === 0, 'A1 derivative: no problem for z³, so no card and no chips');
  await go('problem-3-2-1');
  await clickChip(page, 'cauchy-riemann-fn-const-u');
  c = await chipsOf('cauchy-riemann');
  assert(c.address === problemById('P7').address && c.names === problemById('P7').names && (await text('#cauchy-riemann-problem')).includes('Problem P7'), `A1 cauchy-riemann: P7 chips ${JSON.stringify(c)}`);
  await clickChip(page, 'cauchy-riemann-fn-conj');
  assert((await hidden('#cauchy-riemann-problem')) && (await count('#cauchy-riemann-problem-address')) === 0, 'A1 cauchy-riemann: no card for conj z');
  log('A1: the chips follow the problem as the function changes; no card, no chips when there is no problem');

  // ================================================================ (2) A2: the glyph
  await go('problem-3-1-1');
  let g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g && g.label === 'move: turn 33.7°, stretch 3.606' && g.tag === 'svg' && g.shown && !g.hasHidden, `A2 derivative 3.1.1: ${JSON.stringify(g)}`);
  assert(g.sibling && !g.inside, 'A2 derivative: the glyph is a sibling of the readout, never inside it');
  assert(g.r === '3.606' && g.theta === '0.588' && g.focusable === 'false', `A2 derivative: data-r and data-theta ${JSON.stringify(g)}`);
  assert((await text('#derivative-readout')) === 'z₀ = 1 + i; A = 3 + 2i; |B| = 0.000; f′(z₀) = 3 + 2i', `A2 derivative: the readout is iteration 1's: "${await text('#derivative-readout')}"`);
  assert((await text('#derivative-glyph-text')) === 'As a move: turn Arg f′(z₀) = 0.588 rad (33.7°), stretch |f′(z₀)| = 3.606.', `A2 derivative: the caption "${await text('#derivative-glyph-text')}"`);
  await ctx.shot('derivative-3-1-1-glyph');
  await dragHandle(page, 'derivative-zplane-z0', { re: 2, im: 0 });
  g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g.label === 'move: turn 0°, stretch 5' && (await text('#derivative-readout')).startsWith('z₀ = 2; A = 5;'), `A2 derivative: dragging z₀ to 2 moves the glyph: ${g.label} / ${await text('#derivative-readout')}`);
  await go('problem-P6');
  g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g.hasHidden && !g.shown, `A2 derivative P6: the glyph is hidden (${JSON.stringify(g)})`);
  assert((await text('#derivative-glyph-text')) === 'No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.', 'A2 derivative P6: the caption says why');
  await clickChip(page, 'derivative-fn-sq-plus-z');
  g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g.label === 'move: turn -41.2°, stretch 2.126' && g.shown && !g.hasHidden, `A2 derivative: z² + z at 0.3 - 0.7i: ${JSON.stringify(g)}`);
  await go('problem-3-1-2');
  assert((await glyphOf('derivative-glyph', 'derivative-readout')).hasHidden, 'A2 derivative 3.1.2: no f′ at 1 + i');
  await clickChip(page, 'derivative-z0-origin');
  g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g.label === 'no move: 0' && g.shown && (await text('#derivative-readout')) === 'z₀ = 0; A = 0; |B| = 0.000; f′(z₀) = 0', `A2 derivative: |z|² at 0 is the zero move ${JSON.stringify(g)}`);
  assert((await text('#derivative-glyph-text')).startsWith('f′(z₀) = 0: the zero move.'), 'A2 derivative: the zero caption');
  await clickChip(page, 'derivative-fn-recip');
  assert((await glyphOf('derivative-glyph', 'derivative-readout')).hasHidden && (await text('#derivative-glyph-text')) === 'f is undefined at z₀, so there is no move to show.', 'A2 derivative: 1/z at 0 is undefined');
  await noOverflow('A2 derivative');

  await go('problem-3-2-1');
  g = await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout');
  assert(g && g.label === 'move: turn 45.8°, stretch 1.649' && g.shown && g.sibling && !g.inside, `A2 cauchy-riemann 3.2.1: ${JSON.stringify(g)}`);
  assert((await text('#cauchy-riemann-readout')) === 'A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)', `A2 cauchy-riemann: iteration 1's readout "${await text('#cauchy-riemann-readout')}"`);
  await ctx.shot('cauchy-riemann-3-2-1-glyph');
  await clickChip(page, 'cauchy-riemann-fn-conj');
  g = await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout');
  assert(g.label === 'no move: 0' && (await text('#cauchy-riemann-readout')) === 'A = 0; |B| = 1.000; CR holds: no; f′ does not exist here', `A2 cauchy-riemann: conj z is a pure mirror, A = 0: ${g.label}`);
  await clickChip(page, 'cauchy-riemann-fn-abs2');
  assert((await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout')).label === 'move: turn -58°, stretch 0.943', 'A2 cauchy-riemann: |z|² at 0.5 + 0.8i has A = 0.5 - 0.8i');
  await clickChip(page, 'cauchy-riemann-fn-exp');
  assert((await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout')).label === 'move: turn 45.8°, stretch 1.649', 'A2 cauchy-riemann: back on e^z');
  await noOverflow('A2 cauchy-riemann');
  log('A2: the glyph beside f′(z₀) and A, with the iteration-1 readouts unchanged');

  // ================================================================ (3) A3: fresh numbers
  const FRESH = 'Fresh numbers';
  const joined = async (sel, tag) => assert(!/[^.!?] Now on the page/.test(await text(sel)), `${tag}: the handout's answer and "Now on the page" are two sentences`);
  // ---- branches
  await open('branches', '2.4.1', { n: 2, seam: PI / 2, walk: null });
  assert((await text('#branches-readout')) === 'seam = π/2; window (π/2, 5π/2]; z = -i; z^(1/2) on this branch = e^(i 3π/4) = -0.707 + 0.707i; chosen θ = 3π/2; Arg z = -π/2', `A3 branches: "${await text('#branches-readout')}"`);
  assert((await text('#branches-readout')).includes('seam = π/2') && (await ev(() => document.getElementById('branches-n').value)) === '2', 'A3 branches: n and seam are the request\'s');
  assert((await text('#branches-problem-note')).includes(FRESH) && (await text('#branches-problem-note')).includes('Now on the page: the square root, with its seam at π/2'), `A3 branches: the card says so: "${await text('#branches-problem-note')}"`);
  assert(!(await hidden('#branches-fresh')) && (await text('#branches-fresh')).startsWith('Fresh numbers from the Rehearsal Room.'), 'A3 branches: the banner under the header');
  await joined('#branches-problem-note', 'A3 branches');
  assert((await ev(() => [...document.querySelectorAll('#branches-problem .callout')].filter((b) => b.offsetParent !== null).length)) === 0, 'A3 branches: no callout is visible in the problem card before the answer (iteration 1 pins it)');
  assert((await attr('#branches-problem-chips a[aria-current="true"], .station-header a[aria-current="true"]', 'href')) === '#problem-2-4-1', 'A3 branches: the header marks 2.4.1');
  await dragHandle(page, 'branches-zplane-z', { re: 1, im: 1 });
  assert((await text('#branches-problem-note')).includes(FRESH), 'A3 branches: dragging z leaves the note');
  await setSlider(page, 'branches-seam', 0);
  assert((await hidden('#branches-problem-note')) && (await hidden('#branches-fresh')), 'A3 branches: moving the seam ends "fresh"');
  await noOverflow('A3 branches');
  await open('branches', '2.4.1', { n: 3, seam: 0, walk: 'along' });
  await page.waitForFunction(() => document.getElementById('branches-walk-status').dataset.state === 'continuous', null, { timeout: 6000 });
  assert((await text('#branches-walk-status')).startsWith('continuous') && (await ev(() => window.__mv.branches.state().walk.kind)) === 'along', 'A3 branches: the requested walk ran, and is continuous with the seam at 0');
  await open('branches', '2.4.1', { n: 3, seam: -PI, walk: 'across' });
  await page.waitForFunction(() => document.getElementById('branches-walk-status').dataset.state === 'jumps', null, { timeout: 6000 });
  assert((await text('#branches-walk-status')) === 'jumps at the negative real axis', 'A3 branches: across the principal seam it jumps');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open('branches', '2.4.1', { n: 3, seam: -PI, walk: 'across' });
  assert((await text('#branches-walk-status')) === 'jumps at the negative real axis', 'A3 branches, reduced motion: the walk is at its end at once');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open('branches', '2.4.1', { n: 9, seam: 'x', walk: 'sideways' });
  assert((await text('#branches-readout')).startsWith('seam = -π; window (-π, π]; z = -1 + 0.5i') && (await hidden('#branches-fresh')) && (await hidden('#branches-problem-note')), 'A3 branches: a malformed request leaves the default, silently');

  // ---- reciprocal
  await open('reciprocal', '2.5.1', { shape: { kind: 'circle', center: { re: 0, im: 1 }, r: 1 } });
  assert((await text('#reciprocal-readout')) === 'shape: circle |z - i| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; |1/p| = 0.5', `A3 reciprocal: "${await text('#reciprocal-readout')}"`);
  assert((await text('#reciprocal-problem-note')).includes(FRESH) && (await text('#reciprocal-problem-note')).includes('Now on the page: circle |z - i| = 1.'), 'A3 reciprocal: the card says so');
  assert(!(await hidden('#reciprocal-fresh')) && (await chipsOf('reciprocal')).address === 'P', 'A3 reciprocal: banner and chips');
  await joined('#reciprocal-problem-note', 'A3 reciprocal');
  await clickChip(page, 'reciprocal-preset-circle1');
  assert((await text('#reciprocal-problem-note')) === 'This is problem 2.5.1 exactly.' && (await hidden('#reciprocal-fresh')), 'A3 reciprocal: the handout shape ends "fresh"; iteration 1\'s sentence returns');
  await open('reciprocal', '2.5.1', { shape: { kind: 'line', a: { re: 2, im: 0 }, b: { re: 2, im: 1 } } });
  assert((await text('#reciprocal-readout')) === 'shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; |1/p| = 0.447', `A3 reciprocal line: "${await text('#reciprocal-readout')}"`);
  await open('reciprocal', '2.5.1', { shape: { kind: 'circle', center: { re: 2, im: 0 }, r: 2 } });
  assert((await text('#reciprocal-readout')) === 'shape: circle |z - 2| = 2; image: line Re w = 0.25; p = 2 + 2i; 1/p = 0.25 - 0.25i; |1/p| = 0.354', `A3 reciprocal circle 2: "${await text('#reciprocal-readout')}"`);
  const edge = await ev(() => { const pl = window.__mv.planes.get('reciprocal-zplane'), s = pl.getSize(), a = pl.toPixel({ re: 4, im: 0 }), b = pl.toPixel({ re: 0, im: 0 }); return { w: s.w, ax: a.x, bx: b.x }; });
  assert(edge.ax > 0 && edge.ax < edge.w && edge.bx > 0 && edge.bx < edge.w, `A3 reciprocal: the circle |z - 2| = 2 (x from 0 to 4) fits the plane: ${JSON.stringify(edge)}`);
  await open('reciprocal', '2.5.1', { shape: { kind: 'circle', center: { re: 9, im: 9 }, r: 50 } });
  assert((await text('#reciprocal-readout')).startsWith('shape: circle |z - 1| = 1; image: line Re w = 0.5;') && (await hidden('#reciprocal-fresh')), 'A3 reciprocal: a malformed request leaves the default');
  await noOverflow('A3 reciprocal');

  // ---- limits
  await open('limits', '2.3.1', { fn: 'dir', path: 'line', m: 2 });
  assert((await text('#limits-readout')) === 'path: y = 2x; value at t: -0.6 + 0.8i; limit along this path: -0.6 + 0.8i; set of directional limits: circle center 0 radius 1; limit exists: no', `A3 limits: "${await text('#limits-readout')}"`);
  assert((await attr('#limits-path-line', 'aria-pressed')) === 'true' && Number(await ev(() => document.getElementById('limits-m').value)) === 2, 'A3 limits: the line y = 2x is selected');
  assert((await text('#limits-problem-note')).includes(FRESH) && (await text('#limits-problem-note')).includes('Now on the page: g = z²/|z|², way in: y = 2x.'), `A3 limits: the card says so: "${await text('#limits-problem-note')}"`);
  await joined('#limits-problem-note', 'A3 limits');
  await clickChip(page, 'limits-path-vertical');
  assert(await hidden('#limits-problem-note'), 'A3 limits: another way in ends "fresh"');
  await clickChip(page, 'limits-path-line');
  assert((await text('#limits-problem-note')).includes(FRESH), 'A3 limits: the line y = 2x again (the slope is still 2): the request\'s numbers are on the page again');
  await setSlider(page, 'limits-m', 1);
  assert(await hidden('#limits-problem-note'), 'A3 limits: another slope ends "fresh"');
  await open('limits', 'P5', { fn: 'x-over-z', path: 'vertical' });
  assert((await text('#limits-readout')).startsWith('path: x = 0; value at t: 0; limit along this path: 0; set of directional limits: circle center 0.5 radius 0.5;'), `A3 limits P5: "${await text('#limits-readout')}"`);
  c = await chipsOf('limits');
  assert(c.address === problemById('P5').address && (await text('#limits-problem-note')).includes(FRESH), 'A3 limits P5: card, chips and note');
  await open('limits', '2.3.1', { fn: 'dir', path: 'parabola' });
  assert((await text('#limits-readout')).includes('limit along this path: 1;'), 'A3 limits: along y = x² the value tends to 1');
  await open('limits', '2.3.1', { fn: 'dir', path: 'cubic' });
  assert((await attr('#limits-path-parabola', 'aria-pressed')) === 'true' && (await text('#limits-problem-note')).includes('way in: y = x²'), 'A3 limits: a path the station cannot draw is dropped, and the note says what is on the page');
  await noOverflow('A3 limits');

  // ---- derivative
  await open('derivative', '3.1.1', { fn: { src: '2z^2 - 3z + 1' }, z0: { re: 1, im: 1 } });
  assert((await text('#derivative-readout')) === 'z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i', `A3 derivative: "${await text('#derivative-readout')}"`);
  assert((await attr('#derivative-fn-custom', 'aria-pressed')) === 'true' && (await ev(() => window.__mv.derivative.state().fnId)) === 'custom', 'A3 derivative: the custom chip is pressed');
  assert((await glyphOf('derivative-glyph', 'derivative-readout')).label === 'move: turn 76°, stretch 4.123', 'A3 derivative: f′(1 + i) = 1 + 4i as a move');
  assert((await text('#derivative-problem-note')).includes(FRESH) && (await text('#derivative-problem-note')).includes('f(z) = 2z^2 - 3z + 1, at z₀ = 1 + i.'), `A3 derivative: the card says so: "${await text('#derivative-problem-note')}"`);
  c = await chipsOf('derivative');
  assert(c.address === 'C' && c.names === 'none' && (await text('#derivative-problem')).includes('Problem 3.1.1'), 'A3 derivative: 3.1.1 chips');
  await joined('#derivative-problem-note', 'A3 derivative');
  assert(!(await hidden('#derivative-custom-note')) && (await text('#derivative-custom-note')).startsWith('Custom function from the Rehearsal Room:') && await hidden('#derivative-custom-error'), 'A3 derivative: the custom note, no error');
  await ctx.shot('derivative-custom');
  await clickChip(page, 'derivative-fn-abs2');
  assert((await hidden('#derivative-problem-note')) && (await text('#derivative-problem')).includes('Problem 3.1.2'), 'A3 derivative: another function ends "fresh"');
  await clickChip(page, 'derivative-fn-custom');
  assert((await text('#derivative-problem-note')).includes(FRESH) && (await text('#derivative-problem')).includes('Problem 3.1.1'), 'A3 derivative: the custom chip brings the card and the note back');
  await open('derivative', '3.1.2', { fn: 'abs2', z0: { re: 1, im: 1 } });
  assert((await text('#derivative-readout')) === 'z₀ = 1 + i; A = 1 - i; |B| = 1.414; f′(z₀) does not exist (circle radius 1.414)' && (await count('#derivative-fn-custom')) === 0 && (await glyphOf('derivative-glyph', 'derivative-readout')).hasHidden, 'A3 derivative: a chip id selects its chip; no custom chip; no f′, no glyph');
  let parserMessage = null;
  try { compile('2z +'); } catch (e) { parserMessage = e.message; }
  await open('derivative', '3.1.1', { fn: { src: '2z +' }, z0: { re: 1, im: 1 } });
  assert(!(await hidden('#derivative-custom-error')) && (await text('#derivative-custom-error')).includes(parserMessage), `A3 derivative: a bad source shows the parser's sentence verbatim ("${parserMessage}")`);
  assert((await ev(() => window.__mv.derivative.state().fnId)) === 'sq-plus-z' && (await count('#derivative-fn-custom')) === 0, 'A3 derivative: a bad source leaves the default function');
  await open('derivative', '3.1.1', { fn: 'sq-plus-z', z0: { re: 4, im: 3 } });
  const seen = await ev(() => { const pl = window.__mv.planes.get('derivative-zplane'), s = pl.getSize(), p = pl.toPixel({ re: 4, im: 3 }); return { w: s.w, h: s.h, x: p.x, y: p.y }; });
  assert(seen.x > 0 && seen.x < seen.w && seen.y > 0 && seen.y < seen.h, `A3 derivative: a requested z₀ outside the opening view is panned into it ${JSON.stringify(seen)}`);
  await open('derivative', '3.1.1', { z0: 'x', fn: 7 });                     // the malformed request of the goal text, for a station of this goal
  assert((await ev(() => window.__mv.derivative.state().fnId)) === 'sq-plus-z' && (await text('#derivative-readout')).startsWith('z₀ = 1 + i;') && (await hidden('#derivative-problem-note')) && (await hidden('#derivative-custom-error')), 'A3 derivative: a malformed request leaves the default, silently');
  await noOverflow('A3 derivative');

  // ---- cauchy-riemann
  await open('cauchy-riemann', '3.2.1', { fn: { src: 'exp(-z)' }, z0: { re: 0, im: 0 } });
  const crRead = await text('#cauchy-riemann-readout');
  assert(crRead.includes('CR holds: yes') && crRead.includes('f′(z₀) = -1'), `A3 cauchy-riemann: "${crRead}"`);
  assert((await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout')).label === 'move: turn 180°, stretch 1', 'A3 cauchy-riemann: f′(0) = -1 is a half turn');
  assert((await attr('#cauchy-riemann-fn-custom', 'aria-pressed')) === 'true' && (await text('#cauchy-riemann-problem-note')).includes(FRESH) && (await text('#cauchy-riemann-problem-note')).includes('f(z) = exp(-z), at z₀ = 0.'), `A3 cauchy-riemann: chip and note "${await text('#cauchy-riemann-problem-note')}"`);
  c = await chipsOf('cauchy-riemann');
  assert(c.address === 'C' && c.names === 'none', 'A3 cauchy-riemann: 3.2.1 chips');
  await joined('#cauchy-riemann-problem-note', 'A3 cauchy-riemann');
  assert((await text('#cauchy-riemann-custom-check')).startsWith('CR holds at z₀ and at all 25 points of the grid') && (await text('#cauchy-riemann-fn-note')).startsWith('Custom function from the Rehearsal Room:'), 'A3 cauchy-riemann: the 25-point check and the function note');
  assert((await text('#cauchy-riemann-verdict')).length > 0, 'A3 cauchy-riemann: the iteration-1 verdict is still written');
  await ctx.shot('cauchy-riemann-custom');
  await clickChip(page, 'cauchy-riemann-fn-conj');
  assert((await hidden('#cauchy-riemann-problem')) && (await hidden('#cauchy-riemann-custom-check')), 'A3 cauchy-riemann: another function: no card, no custom check');
  await clickChip(page, 'cauchy-riemann-fn-custom');
  assert(!(await hidden('#cauchy-riemann-problem')) && (await text('#cauchy-riemann-problem-note')).includes(FRESH), 'A3 cauchy-riemann: the custom chip brings the card back');
  await open('cauchy-riemann', '3.2.1', { fn: { src: 'conj(z)' }, z0: { re: 0.5, im: 0.8 } });
  assert((await text('#cauchy-riemann-readout')) === 'A = 0; |B| = 1.000; CR holds: no; f′ does not exist here' && (await text('#cauchy-riemann-custom-check')).startsWith('CR fails at z₀ (u_x = 1 but v_y = -1)'), 'A3 cauchy-riemann: conj z fails, and says where');
  await open('cauchy-riemann', 'P7', { fn: { src: '3' }, z0: { re: 0.5, im: 0.8 } });
  assert((await text('#cauchy-riemann-custom-check')).includes('f is constant') && (await text('#cauchy-riemann-problem')).includes('Problem P7') && (await chipsOf('cauchy-riemann')).names === 'none', 'A3 cauchy-riemann: P7 with a constant function: f′ = 0 everywhere, f is constant');
  await open('cauchy-riemann', '3.2.1', { fn: { src: 'z^' }, z0: { re: 0.5, im: 0.8 } });
  assert(!(await hidden('#cauchy-riemann-custom-error')) && (await text('#cauchy-riemann-custom-error')).includes('Something is missing after "^"') && (await text('#cauchy-riemann-fn-exp')).length > 0 && (await attr('#cauchy-riemann-fn-exp', 'aria-pressed')) === 'true', 'A3 cauchy-riemann: a bad source: the parser\'s sentence, and e^z stays');
  await open('cauchy-riemann', '3.2.1', { fn: 'cube', z0: { re: 3, im: 0 } });
  assert((await attr('#cauchy-riemann-fn-custom', 'aria-pressed')) === 'true' && (await ev(() => window.__mv.cauchyRiemann.state().z0.re)) === 0.5, 'A3 cauchy-riemann: z³ opens as a custom function; z₀ outside the z-plane is dropped');
  await noOverflow('A3 cauchy-riemann');
  log('A3: every station opens with the request\'s numbers, says so, and survives a bad request');

  // ================================================================ (4) the video host of derivative
  await go('derivative');
  const manifest = await import('../../media/manifest.js').catch(() => ({ VIDEOS: [] }));
  const listed = (manifest.VIDEOS || []).some((v) => v.id === 'zoom-cr');
  const place = await ev(() => {
    const host = document.getElementById('derivative-video-host'), lower = document.querySelector('#station-derivative .ld-lower'), dc = document.getElementById('derivative-dchost');
    const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { host: !!host, hidden: host.hidden, children: host.children.length, afterDc: after(dc, host), beforeReadout: after(host, document.getElementById('derivative-readout-row')), prevIsLower: host.previousElementSibling === lower };
  });
  assert(place.host && place.afterDc && place.beforeReadout && place.prevIsLower, `(4) derivative: the video host follows the row of the third plane: ${JSON.stringify(place)}`);
  assert(place.hidden === !listed && place.children === (listed ? 1 : 0), `(4) derivative: the host is ${listed ? 'filled' : 'hidden and empty'} for this manifest: ${JSON.stringify(place)}`);
  const demo = await ev(async () => {
    const L = await import('./js/core/listen.js');
    const M = { VIDEOS: [{ id: 'zoom-cr', title: 'T', summary: 'S', station: 'derivative', src: 'data:video/mp4;base64,AAAA', captions: null, seconds: 150, narrated: false, music: false }], SITE_AUDIO: {} };
    const host = document.getElementById('derivative-video-host');
    const had = host.children.length;
    const p = await L.videoPanel(host, 'zoom-cr', { manifest: M });
    const dc = document.getElementById('derivative-dchost');
    const out = { id: p && p.id, after: !!(dc.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING), had };
    if (had === 0 && p) p.remove();
    return out;
  });
  assert(demo.id === 'video-zoom-cr' && demo.after, `(4) a panel put into the host sits after the planes: ${JSON.stringify(demo)}`);
  await noOverflow('(4) derivative');

  // ================================================================ (5) ids and layout after all of it
  for (const station of ['branches', 'reciprocal', 'limits', 'derivative', 'cauchy-riemann']) {
    await go(station);
    await noDupIds(`(5) ${station}`);
    const loose = await ev(() => [...document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view summary')].filter((e) => !e.id).map((e) => e.tagName.toLowerCase()));
    assert(loose.length === 0, `(5) ${station}: controls without an id: ${loose.join(',')}`);
    await noOverflow(`(5) ${station}`);
  }
  if (phone) await ctx.shot('phone-cauchy-riemann');
  log('(4) the video host, (5) ids and layout');
}
