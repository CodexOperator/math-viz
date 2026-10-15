// tests/interact/i1-station-limits-derivative.mjs
// Acceptance A1 to A4 of goal i1-station-limits-derivative (docs/designs/iter-1/i1-station-limits-derivative.md section 7.2).
//   node tools/smoke.mjs --route problem-2-3-1 --script tests/interact/i1-station-limits-derivative.mjs --dark
//   node tools/smoke.mjs --route problem-P5    --script tests/interact/i1-station-limits-derivative.mjs --dark
//   node tools/smoke.mjs --route problem-3-1-1 --script tests/interact/i1-station-limits-derivative.mjs --dark
//   node tools/smoke.mjs --route problem-3-1-2 --script tests/interact/i1-station-limits-derivative.mjs --dark
//   node tools/smoke.mjs --route problem-P6    --script tests/interact/i1-station-limits-derivative.mjs --dark
// One default export that branches on ctx.route (limits and derivative run the same steps as their first problem).

import { clickChip, dragHandle, readText, setSlider, parseCart } from './_helpers.mjs';

const stationOf = (page) => page.evaluate(() => document.querySelector('#view').dataset.station);
const viewState = (page) => page.evaluate(() => document.querySelector('#view').dataset.state);
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const planeIds = (page) => page.evaluate(() => [...window.__mv.planes.keys()]);

async function noBadNumbers(page, assert, where) {
  const body = await bodyText(page);
  assert(!/NaN|Infinity/.test(body), `${where}: the page text contains NaN or Infinity`);
}

// ---------------------------------------------------------------- limits

async function limitsMain(page, ctx) {
  const { assert, shot } = ctx;
  const ro = () => readText(page, '#limits-readout');
  const state = () => page.evaluate(() => window.__mv.limits.state());
  const parseField = (r, label) => parseCart(new RegExp(label + ': ([^;]+)').exec(r)[1]);

  assert((await stationOf(page)) === 'limits', 'station is limits');
  assert((await viewState(page)) === 'ready', 'view state is ready');
  const planes = await planeIds(page);
  assert(planes.includes('limits-zplane') && planes.includes('limits-wplane'), 'limits planes registered: ' + planes.join(','));

  // 1. the default: 2.3.1 along y = x^2
  let r = await ro();
  assert(/y = x\^2|y = x²/.test(r), 'path is y = x^2: ' + r);
  assert(r.includes('limit along this path: 1'), 'limit along this path: 1: ' + r);
  assert(r.includes('circle center 0 radius 1'), 'circle center 0 radius 1: ' + r);
  assert(r.includes('limit exists: no'), 'limit exists: no: ' + r);
  assert((await readText(page, '#limits-verdict')).includes('No limit at 0'), 'verdict says no limit');
  assert((await readText(page, '#limits-problem')).includes('Problem 2.3.1'), 'problem card 2.3.1');
  const mRowHidden = await page.evaluate(() => getComputedStyle(document.getElementById('limits-m-row')).display === 'none');
  assert(mRowHidden, 'the slope row is hidden unless the path is a line');

  // 2. lines y = m x: the value is e^{2 i atan m}
  await clickChip(page, 'limits-path-line');
  assert(!(await page.evaluate(() => getComputedStyle(document.getElementById('limits-m-row')).display === 'none')), 'the slope row shows for a line');
  await setSlider(page, 'limits-m', 1);
  r = await ro();
  assert(r.includes('limit along this path: i'), 'm = 1 gives i: ' + r);
  assert(r.includes('path: y = x'), 'path y = x: ' + r);
  await setSlider(page, 'limits-m', 0);
  r = await ro();
  assert(r.includes('limit along this path: 1') && r.includes('path: y = 0'), 'm = 0 gives 1: ' + r);
  await setSlider(page, 'limits-m', -1);
  assert((await ro()).includes('limit along this path: -i'), 'm = -1 gives -i');
  await setSlider(page, 'limits-m', 2);
  const v2 = parseField(await ro(), 'limit along this path');
  assert(Math.hypot(v2.re + 0.6, v2.im - 0.8) < 1e-9, 'm = 2 gives -0.6 + 0.8i');

  // 3. the value at t tends to the path limit as t -> 0
  await setSlider(page, 'limits-m', 0);
  await setSlider(page, 'limits-t', 0.01);
  r = await ro();
  let v = parseField(r, 'value at t'), L = parseField(r, 'limit along this path');
  assert(Math.hypot(v.re - L.re, v.im - L.im) < 0.05, 'value at t = 0.01 is within 0.05 of the limit (line)');
  await clickChip(page, 'limits-path-parabola');
  await setSlider(page, 'limits-t', 0.01);
  v = parseField(await ro(), 'value at t');
  assert(Math.hypot(v.re - 1, v.im) < 0.05, 'parabola: g(0.012 + 0.000144i) is near 1');
  await setSlider(page, 'limits-t', 1);
  v = parseField(await ro(), 'value at t');
  assert(Math.hypot(v.re + 0.18, v.im - 0.984) < 0.01, 'parabola at t = 1: -0.18 + 0.984i, got ' + JSON.stringify(v));
  await setSlider(page, 'limits-t', 0.45);

  // 4. the explainer (waits for the coalesced render) and the staircase
  await page.waitForTimeout(350);
  const cart = await page.evaluate(() => document.getElementById('limits-ex-now-cart').dataset.tex);
  assert(cart.includes('0.548 + 0.836i'), 'explainer shows g = 0.548 + 0.836i: ' + cart);
  assert((await readText(page, '#limits-stairs-set')).includes('arg g'), 'staircase is labelled arg g');
  assert((await readText(page, '#limits-stairs-arg')).length > 0, 'staircase shows Arg g');

  // 5. P5 by hash change
  await page.evaluate(() => { location.hash = '#problem-P5'; });
  await page.waitForTimeout(600);
  assert((await stationOf(page)) === 'limits', 'still the limits station after the hash change');
  await limitsP5(page, ctx);

  // 6. epsilon-delta
  const d = async (e) => {
    await setSlider(page, 'limits-eps', e);
    return Number(/largest delta = ([0-9.]+)/.exec(await readText(page, '#limits-epsdelta'))[1]);
  };
  const d1 = await d(0.5), d2 = await d(0.1);
  assert(d2 > 0 && d2 < d1, `delta shrinks with epsilon: ${d1} then ${d2}`);
  assert(Math.abs(d1 - 0.225) < 0.001 && Math.abs(d2 - 0.049) < 0.001, `delta values ${d1}, ${d2}`);
  assert((await readText(page, '#limits-epsdelta')).includes('eps = 0.1; largest delta = 0.049'), 'readout text for eps 0.1');
  await clickChip(page, 'limits-ed-fn-dir');
  assert((await readText(page, '#limits-epsdelta')).includes('no delta works'), 'dir mode: no delta works');
  await clickChip(page, 'limits-ed-fn-sq');
  await setSlider(page, 'limits-eps', 0.5);
  assert((await readText(page, '#limits-epsdelta')).includes('eps = 0.5; largest delta = 0.225'), 'readout text for eps 0.5');

  // 7. extras: spiral, follow zoom, walk, text, screenshot
  await clickChip(page, 'limits-path-spiral');
  assert((await ro()).includes('limit along this path: none'), 'the spiral has no limit');
  await clickChip(page, 'limits-path-parabola');
  await setSlider(page, 'limits-t', 0.1);
  await clickChip(page, 'limits-follow');
  let s = await state();
  assert(s.follow === true && s.zView.unitsAcross < 0.5, 'follow zoom: unitsAcross ' + s.zView.unitsAcross);
  await clickChip(page, 'limits-follow');
  s = await state();
  assert(s.follow === false && s.zView.unitsAcross > 3.9, 'follow off resets the view: ' + s.zView.unitsAcross);
  await setSlider(page, 'limits-t', 1);
  await clickChip(page, 'limits-play');
  await page.waitForTimeout(300);
  s = await state();
  assert(s.playing === true && s.t < 1 && s.t > 0.5, 'the walk is running: t = ' + s.t);
  await clickChip(page, 'limits-play');
  s = await state();
  assert(s.playing === false, 'the walk paused');
  await noBadNumbers(page, assert, 'limits');
  await shot('limits-p5');

  // 8. lifecycle
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => !window.__mv.limits && ![...window.__mv.planes.keys()].some((k) => k.startsWith('limits-'))), 'limits hooks and planes are gone after unmount');
}

async function limitsP5(page, ctx) {
  const { assert } = ctx;
  const ro = () => readText(page, '#limits-readout');
  let r = await ro();
  assert(r.includes('circle center 0.5 radius 0.5'), 'P5 circle: ' + r);
  assert(r.includes('limit along this path: 1'), 'P5 along the real axis: ' + r);
  assert(r.includes('path: y = 0'), 'P5 preset path: ' + r);
  assert(await page.evaluate(() => document.getElementById('limits-fn-x-over-z').getAttribute('aria-pressed') === 'true'), 'x-over-z chip pressed');
  assert((await readText(page, '#limits-problem')).includes('Problem P5'), 'problem card P5');
  assert((await readText(page, '#limits-fn-note')).includes('A = 0.5, B = 0.5'), 'P5 note quotes localLinear of Re z');
  await setSlider(page, 'limits-m', 0);
  assert((await ro()).includes('limit along this path: 1'), 'P5 m = 0 gives 1');
  await clickChip(page, 'limits-path-vertical');
  r = await ro();
  assert(r.includes('limit along this path: 0') && r.includes('path: x = 0'), 'P5 vertical gives 0: ' + r);
  assert(r.includes('limit exists: no'), 'P5: limit exists: no');
}

// ---------------------------------------------------------------- derivative

async function derivativeMain(page, ctx) {
  const { assert, shot } = ctx;
  const ro = () => readText(page, '#derivative-readout');
  const drag = (z) => dragHandle(page, 'derivative-zplane-z0', z);
  const state = () => page.evaluate(() => window.__mv.derivative.state());

  assert((await stationOf(page)) === 'derivative', 'station is derivative');
  assert((await viewState(page)) === 'ready', 'view state is ready');
  const planes = await planeIds(page);
  for (const id of ['derivative-zplane', 'derivative-wplane', 'derivative-dcplane']) assert(planes.includes(id), 'plane ' + id);

  // 1. 3.1.1 at z0 = 1 + i
  let r = await ro();
  assert(r.includes('A = 3 + 2i') && r.includes('|B| = 0.000') && r.includes("f'(z0) = 3 + 2i"), 'default readout: ' + r);
  let s = await state();
  assert(s.exists === true && s.kind === 'ring' && s.dcHalf === 6 && s.spokes === 12, 'default state: ' + JSON.stringify({ e: s.exists, k: s.kind, h: s.dcHalf, sp: s.spokes }));
  assert(Math.abs(s.fit.re - 3) < 1e-6 && Math.abs(s.fit.im - 2) < 1e-6, 'the ring fits 3 + 2i: ' + JSON.stringify(s.fit));
  assert(Math.abs(s.zUnits - s.wUnits) < 1e-9, 'both planes share one scale');
  assert((await readText(page, '#derivative-verdict')).startsWith('Every direction gives the same number'), 'verdict for a differentiable point');

  // 2. drag z0
  await drag({ re: 0.5, im: -1 });
  assert((await ro()).includes("f'(z0) = 2 - 2i"), 'f at 0.5 - i: ' + (await ro()));

  // 3 to 5. |z|^2
  await clickChip(page, 'derivative-fn-abs2');
  await drag({ re: 1, im: 1 });
  r = await ro();
  assert(r.includes('A = 1 - i') && r.includes('|B| = 1.414') && r.includes('does not exist'), '|z|^2 at 1 + i: ' + r);
  assert((await state()).kind === 'flat', 'the ring is squashed flat');
  await drag({ re: 0.3, im: 0 });
  assert((await ro()).includes('|B| = 0.300'), '|z|^2 at 0.3');
  await drag({ re: 0, im: 0 });
  r = await ro();
  assert(r.includes('|B| = 0.000') && r.includes("f'(z0) = 0"), '|z|^2 at 0: ' + r);

  // 6 to 8. Re z, conj z, e^z
  await clickChip(page, 'derivative-fn-re');
  r = await ro();
  assert(r.includes('A = 0.5') && r.includes('|B| = 0.500') && r.includes('does not exist'), 'Re z: ' + r);
  await clickChip(page, 'derivative-fn-conj');
  r = await ro();
  assert(r.includes('A = 0') && r.includes('|B| = 1.000'), 'conj z: ' + r);
  assert((await state()).kind === 'mirrored', 'conj z is a pure mirror');
  await clickChip(page, 'derivative-fn-exp');
  await drag({ re: 0, im: 0 });
  assert((await ro()).includes("f'(z0) = 1"), 'e^z at 0: ' + (await ro()));

  // 9. 1/z: a pole, no NaN anywhere
  await clickChip(page, 'derivative-fn-recip');
  r = await ro();
  assert(r.includes('undefined'), '1/z at 0 is undefined: ' + r);
  await noBadNumbers(page, assert, 'derivative at the pole');
  assert((await page.evaluate(() => document.querySelector('#derivative-verdict').dataset.exists)) === 'undefined', 'verdict data-exists is undefined');
  await drag({ re: 0.5, im: 0 });
  r = await ro();
  assert(r.includes("f'(z0) = -4"), '1/z at 0.5: ' + r);
  await noBadNumbers(page, assert, 'derivative near the pole');

  // 10. extras
  await setSlider(page, 'derivative-rho', 0.5);
  s = await state();
  assert(Math.abs(s.rhoEff - 0.25) < 1e-9, 'rho is clipped to 0.25 at the pole: ' + s.rhoEff);
  assert((await readText(page, '#derivative-rho-out')).includes('clipped'), 'the rho output says clipped');
  await setSlider(page, 'derivative-rho', 0.15);
  await clickChip(page, 'derivative-fn-sq-plus-z');
  await drag({ re: 1, im: 1 });
  await setSlider(page, 'derivative-phi', 90);
  assert((await readText(page, '#derivative-phi-out')) === 'Arg h = 90 deg (pi/2)', 'phi output: ' + (await readText(page, '#derivative-phi-out')));
  await page.waitForTimeout(350);
  const tex = await page.evaluate(() => document.getElementById('derivative-ex-quotient-cart').dataset.tex);
  assert(tex.includes('3 + 2.15i'), 'explainer shows q(90 deg) = 3 + 2.15i: ' + tex);
  await setSlider(page, 'derivative-phi', -180);
  assert((await readText(page, '#derivative-phi-out')) === 'Arg h = 180 deg (pi)', 'the seam shows Arg h = 180 deg: ' + (await readText(page, '#derivative-phi-out')));
  await setSlider(page, 'derivative-phi', 0);
  await clickChip(page, 'derivative-z0-origin');
  assert((await ro()).includes('z0 = 0'), 'Move z0 to 0');
  await clickChip(page, 'derivative-z0-origin');

  // reduced motion: shrink becomes a stepper (the next value below the current one)
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setSlider(page, 'derivative-rho', 0.2);
  await clickChip(page, 'derivative-shrink');
  s = await state();
  assert(Math.abs(s.rho - 0.1) < 1e-9, 'reduced motion: one shrink step from 0.2 is 0.1, got ' + s.rho);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // the animation itself
  await setSlider(page, 'derivative-rho', 0.2);
  await clickChip(page, 'derivative-shrink');
  await page.waitForTimeout(4000);
  s = await state();
  assert(s.rho <= 0.0205, 'shrink reaches the smallest ring: ' + s.rho);
  await setSlider(page, 'derivative-rho', 0.2);
  await drag({ re: 1, im: 1 });
  await shot('a4-problem-3-1-1');

  // 11. lifecycle
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => !window.__mv.derivative && ![...window.__mv.planes.keys()].some((k) => k.startsWith('derivative-'))), 'derivative hooks and planes are gone after unmount');
}

async function derivative312(page, ctx) {
  const { assert } = ctx;
  const ro = () => readText(page, '#derivative-readout');
  assert((await stationOf(page)) === 'derivative', 'station is derivative');
  let r = await ro();
  assert(r.includes('A = 1 - i') && r.includes('|B| = 1.414') && r.includes('does not exist'), '3.1.2 readout: ' + r);
  assert(await page.evaluate(() => document.getElementById('derivative-fn-abs2').getAttribute('aria-pressed') === 'true'), 'abs2 chip pressed');
  assert(await page.evaluate(() => { const h = document.getElementById('derivative-hint'); return !h.hidden && getComputedStyle(h).display !== 'none'; }), 'the drag-to-0 hint is visible');
  assert((await readText(page, '#derivative-verdict')).includes('differentiable only at 0'), 'verdict says differentiable only at 0');
  assert((await readText(page, '#derivative-problem')).includes('Problem 3.1.2'), 'problem card 3.1.2');
  await dragHandle(page, 'derivative-zplane-z0', { re: 0, im: 0 });
  assert((await ro()).includes("f'(z0) = 0"), 'at 0: ' + (await ro()));
  await dragHandle(page, 'derivative-zplane-z0', { re: 1, im: 1 });
  assert((await readText(page, '#derivative-verdict')).includes('differentiable only at 0'), 'verdict after dragging back');
  await noBadNumbers(page, assert, '3.1.2');
}

async function derivativeP6(page, ctx) {
  const { assert } = ctx;
  const ro = () => readText(page, '#derivative-readout');
  assert((await stationOf(page)) === 'derivative', 'station is derivative');
  let r = await ro();
  assert(r.startsWith('z0 = 0.3 - 0.7i; A = 0.5; |B| = 0.500'), 'P6 readout: ' + r);
  assert(r.includes('does not exist'), 'P6 does not exist');
  assert(await page.evaluate(() => document.getElementById('derivative-fn-re').getAttribute('aria-pressed') === 'true'), 're chip pressed');
  await dragHandle(page, 'derivative-zplane-z0', { re: 1, im: 1 });
  r = await ro();
  assert(r.includes('A = 0.5') && r.includes('|B| = 0.500'), 'the circle is the same at every z0: ' + r);
  assert((await readText(page, '#derivative-verdict')).includes('problem P5'), 'verdict links P6 to P5');
  assert((await readText(page, '#derivative-problem')).includes('Problem P6'), 'problem card P6');
  await noBadNumbers(page, assert, 'P6');
}

export default async function (page, ctx) {
  const route = ctx.route;
  if (route === 'limits' || route === 'problem-2-3-1') return limitsMain(page, ctx);
  if (route === 'problem-P5') {
    ctx.assert((await stationOf(page)) === 'limits', 'station is limits');
    await limitsP5(page, ctx);
    ctx.assert(!/NaN|Infinity/.test(await bodyText(page)), 'no NaN on P5');
    const r = await readText(page, '#limits-readout');
    ctx.assert(r.includes('limit exists: no'), 'P5 readout: ' + r);
    return undefined;
  }
  if (route === 'derivative' || route === 'problem-3-1-1') return derivativeMain(page, ctx);
  if (route === 'problem-3-1-2') return derivative312(page, ctx);
  if (route === 'problem-P6') return derivativeP6(page, ctx);
  throw new Error('i1-station-limits-derivative: no script branch for route ' + route);
}

