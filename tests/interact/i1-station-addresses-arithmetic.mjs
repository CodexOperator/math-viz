// Interaction script for the stations `addresses` and `arithmetic` (goal i1-station-addresses-arithmetic).
//
//   node tools/smoke.mjs --route problem-1-3-1 --script tests/interact/i1-station-addresses-arithmetic.mjs --dark      (A2, A3)
//   node tools/smoke.mjs --route problem-1-1-1 --script tests/interact/i1-station-addresses-arithmetic.mjs --dark      (A4)
//   node tools/smoke.mjs --route arithmetic    --script tests/interact/i1-station-addresses-arithmetic.mjs --dark      (A5, A6)
//   also: addresses, addresses-m16, problem-1-1-2, problem-P1, problem-P2, arithmetic-div
//
// The script branches on ctx.route and must pass at 1280x860, 390x844 and the dark desktop.
// Design: docs/designs/iter-1/i1-station-addresses-arithmetic.md section 7.3.

import { dragHandle, dragHandleAround, clickChip, readText, handleZ, readHandleLabel, settle } from './_helpers.mjs';

// ---- small helpers -----------------------------------------------------------------------------

// Wait until the element's text (or data-tex, or startsWith) satisfies the test; the explainer renders once per frame.
async function waitText(page, sel, want, { mode = 'includes', timeout = 4000 } = {}) {
  const wants = [].concat(want);
  try {
    await page.waitForFunction(({ sel, wants, mode }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const t = mode === 'data' ? (el.dataset.tex || '') : el.textContent;
      if (mode === 'starts') return t.trim().startsWith(wants[0]);
      if (mode === 'equals') return t.trim() === wants[0];
      return wants.every((w) => t.includes(w));
    }, { sel, wants, mode }, { timeout });
  } catch (e) {
    const got = await page.evaluate((s) => { const el = document.querySelector(s); return el ? (el.dataset.tex || el.textContent) : '(no such element)'; }, sel);
    throw new Error(`${sel}: wanted (${mode}) ${JSON.stringify(wants)}, got ${JSON.stringify(got)}`);
  }
}
const waitData = (page, sel, want, opts = {}) => waitText(page, sel, want, { ...opts, mode: 'data' });

async function typeInto(page, id, text) {
  await page.evaluate(({ id, text }) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`no element #${id}`);
    el.focus();
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { id, text });
  await settle(page, 3);
}

const attr = (page, sel, name) => page.evaluate(({ sel, name }) => { const el = document.querySelector(sel); return el ? el.getAttribute(name) : null; }, { sel, name });
const value = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);
const hook = (page, name) => page.evaluate((n) => JSON.parse(JSON.stringify(window.__mv[n].state())), name);
const drawn = (page) => page.evaluate(() => window.__mv.addresses.drawn());
const plan = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__mv.arithmetic.plan())));
const near = (a, b, e) => Math.abs(a - b) <= e;

// Wait for the scene plan (rebuilt on the next frame) to satisfy a predicate written as a string over `plan`.
async function waitPlan(page, src, what) {
  try {
    await page.waitForFunction((s) => { const p = window.__mv.arithmetic.plan(); return new Function('plan', `return (${s})`)(p); }, src, { timeout: 4000 });
  } catch (e) {
    const ids = await plan(page).then((p) => p.prims.map((x) => x.id).join(','));
    throw new Error(`scene plan never satisfied "${what}" (prims: ${ids})`);
  }
}

export default async function (page, ctx) {
  const { route } = ctx;
  if (route === 'problem-1-3-1' || route === 'addresses') return addresses(page, ctx);
  if (route === 'addresses-m16') return addressesM16(page, ctx);
  if (route === 'problem-1-1-1') return arithmetic111(page, ctx);
  if (route === 'arithmetic') return arithmeticStation(page, ctx);
  return arithmeticLoads(page, ctx);
}

// ---- addresses: A2 and A3 -----------------------------------------------------------------------

async function addresses(page, ctx) {
  const { assert, log, shot } = ctx;
  const RO = '#addresses-readout';

  // 1. the 1.3.1 numbers everywhere
  await waitText(page, RO, ['|z| = 2', '2.094', '2pi/3']);
  assert(await readText(page, RO) === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)', `readout is "${await readText(page, RO)}"`);
  assert(await value(page, '#addresses-r') === '2', `r field is ${await value(page, '#addresses-r')}`);
  assert(await value(page, '#addresses-theta') === '2.094', 'theta field is 2.094');
  assert(await value(page, '#addresses-x') === '-1', 'x field is -1');
  assert(await value(page, '#addresses-y') === '1.732', 'y field is 1.732');

  // 2. the converter
  await waitText(page, '#addresses-ex-theta-polar', '2π');
  await waitText(page, '#addresses-ex-theta-cart', '2π');
  await waitData(page, '#addresses-ex-r-polar', 'r = 2');
  await waitText(page, '#addresses-ex-same', 'same point: agree', { mode: 'starts' });

  // 3. the staircase list: Arg z is the home step, the others are names
  assert((await readText(page, '#addresses-stairs-k0')).includes('2π/3'), 'k0 row shows 2π/3');
  assert((await readText(page, '#addresses-stairs-k-1')).includes('2π/3 - 2π'), 'k-1 row shows 2π/3 - 2π');
  assert(await readText(page, '#addresses-stairs-arg') === 'Arg z = 2.094 (2π/3)', `stairs arg line is "${await readText(page, '#addresses-stairs-arg')}"`);

  // 4. the handle announces both addresses; the hook reports z
  const label = await readHandleLabel(page, 'addresses-plane-z');
  assert(label.includes('r = 2') && label.includes('2π/3'), `handle label "${label}"`);
  const st = await hook(page, 'addresses');
  assert(near(st.z.re, -1, 1e-9) && near(st.z.im, Math.sqrt(3), 1e-9), 'hook z is -1 + i sqrt 3');

  // 5. arg z drawn as a set: at least one faint extra winding
  assert((await drawn(page)).pos >= 1, 'at least one extra winding is drawn');

  // 6. the A3 screenshot
  await shot('a3');

  // 7. drag to (2, 1): the soft snap lands on exact values
  await dragHandle(page, 'addresses-plane-z', { re: 2, im: 1 });
  await waitText(page, RO, ['2.236', '0.464']);
  assert(await readText(page, RO) === 'z = 2 + i; |z| = 2.236; Arg z = 0.464', `readout after drag is "${await readText(page, RO)}"`);
  assert(near(parseFloat(await value(page, '#addresses-x')), 2, 0.05), 'x field near 2');
  assert(near(parseFloat(await value(page, '#addresses-r')), 2.236, 0.01), 'r field near 2.236');
  await waitText(page, '#addresses-ex-same', 'same point: agree', { mode: 'starts' });
  await waitData(page, '#addresses-ex-theta-polar', '0.464');

  // 8. performance: a 60-step drag
  await dragHandle(page, 'addresses-plane-z', { re: -1, im: 1.5 }, { steps: 60 });
  const ms = await page.evaluate(() => window.__mv.planes.get('addresses-plane').getStats().lastDrawMs);
  log(`lastDrawMs after a 60-step drag: ${ms.toFixed(1)} ms`);
  assert(ms < 50, `last plane draw took ${ms} ms`);

  // 9. crossing the seam: one continuous press, counterclockwise through the negative real axis
  await dragHandleAround(page, 'addresses-plane-z', { center: { re: 0, im: 0 }, radius: 1.5, startAngle: 2.4, turns: 0.4, steps: 60 });
  const jumps = Number(await attr(page, '[data-stairs="addresses-stairs"]', 'data-jumps'));
  assert(jumps >= 1, `the staircase counted ${jumps} seam crossings`);
  assert(await attr(page, '[data-stairs="addresses-stairs"]', 'data-last-jump') === '1', 'the last crossing was counterclockwise');

  // 10. typing: x = -16, y = 0 (change events), the view widens to show it
  await typeInto(page, 'addresses-x', '-16');
  await typeInto(page, 'addresses-y', '0');
  await waitText(page, RO, ['Arg z = 3.142', 'pi']);
  assert(await readText(page, RO) === 'z = -16; |z| = 16; Arg z = 3.142 (pi)', `readout after typing is "${await readText(page, RO)}"`);
  assert(await value(page, '#addresses-r') === '16', 'r field is 16');
  assert(await value(page, '#addresses-theta') === '3.142', 'theta field is 3.142');
  const ua = Number(await attr(page, '[data-plane-id="addresses-plane"]', 'data-units-across'));
  assert(ua >= 40, `the view widened to ${ua} units across`);
  await waitData(page, '#addresses-ex-theta-cart', '\\pi');
  await waitText(page, '#addresses-ex-same', 'same point: agree', { mode: 'starts' });

  // 11. typing a non-home name of the angle: the dot is where it was, and the note says which name is home
  await clickChip(page, 'addresses-preset-m1-sqrt3i');
  await typeInto(page, 'addresses-theta', '8pi/3');
  await waitText(page, '#addresses-note', ['8.378', '2π/3 + 2π', 'Arg z = 2.094 (2π/3)']);
  assert(await readText(page, RO) === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)', 'the dot did not move');
  assert(await value(page, '#addresses-theta') === '2.094', 'theta field shows the home name');

  // 12. a negative length is refused
  await typeInto(page, 'addresses-r', '-2');
  await waitText(page, '#addresses-note', 'A length cannot be negative');
  assert(await attr(page, '#addresses-r', 'aria-invalid') === 'true', 'r field is marked invalid');
  assert(await readText(page, RO) === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)', 'the dot did not move for r = -2');

  // 13. chips and boxes
  await clickChip(page, 'addresses-preset-m16');
  await waitText(page, RO, 'z = -16; |z| = 16; Arg z = 3.142 (pi)', { mode: 'equals' });
  assert(await attr(page, '#addresses-preset-m16', 'aria-pressed') === 'true', 'the -16 chip is pressed');
  await clickChip(page, 'addresses-grid-polar');
  assert(await attr(page, '#addresses-grid-polar', 'aria-pressed') === 'true', 'polar grid chip pressed');
  assert(await attr(page, '#addresses-grid-cart', 'aria-pressed') === 'false', 'cartesian grid chip not pressed');
  assert(await attr(page, '.station', 'data-grid') === 'polar', 'station data-grid is polar');
  assert((await drawn(page)).pos >= 1, 'windings drawn at -16');
  await clickChip(page, 'addresses-ghosts');
  await settle(page, 3);
  assert((await drawn(page)).pos === 0, 'no extra windings once the box is unticked');
  log('addresses: all steps passed');
}

// the deep link #addresses-m16 loads z = -16 with the view already wide enough
async function addressesM16(page, ctx) {
  const { assert } = ctx;
  await waitText(page, '#addresses-readout', 'z = -16; |z| = 16; Arg z = 3.142 (pi)', { mode: 'equals' });
  const ua = Number(await attr(page, '[data-plane-id="addresses-plane"]', 'data-units-across'));
  assert(ua >= 40, `the view is ${ua} units across`);
  await waitText(page, '#addresses-ex-same', 'same point: agree', { mode: 'starts' });
}

// ---- arithmetic: A4 (problem 1.1.1 and 1.1.2) ---------------------------------------------------

async function arithmetic111(page, ctx) {
  const { assert, log } = ctx;
  const RO = '#arithmetic-readout';

  // 1. the answer to 1.1.1 is on screen and both columns agree
  await waitText(page, RO, ['5 + 14i', '14.866']);
  await waitText(page, '#arithmetic-ex-same', 'same point: agree', { mode: 'starts' });
  assert(await attr(page, '#arithmetic-mode-mul', 'aria-pressed') === 'true', 'mode mul is pressed');
  assert((await readText(page, '#arithmetic-mode-div')).includes('part 2'), 'the division chip says part 2');

  // 2. part 2: the quotient, exactly and in decimals
  await clickChip(page, 'arithmetic-mode-div');
  // the pinned readout format is "<re> - <im>i" (spaced minus), so the imaginary part reads "- 0.588i"
  await waitText(page, RO, 'result = -0.647 - 0.588i; |result| = 0.874; Arg = -2.404', { mode: 'equals' });
  await waitData(page, '#arithmetic-ex-point-cart', '-\\frac{11}{17} - \\frac{10}{17}i');
  await waitText(page, '#arithmetic-ex-same', 'same point: agree', { mode: 'starts' });

  // 3. 1.1.2: subtract
  await clickChip(page, 'arithmetic-mode-sub');
  await waitText(page, RO, '4 - 6i');

  // 4. then mirror the answer: the documented way of conjugating the difference
  await clickChip(page, 'arithmetic-conj-result');
  await waitText(page, RO, '4 + 6i');
  assert(await attr(page, '#arithmetic-conj-result', 'aria-pressed') === 'true', 'the mirror toggle is pressed');
  await waitData(page, '#arithmetic-ex-im-cart', '= 6');
  await waitData(page, '#arithmetic-ex-im-polar', '\\approx 6');
  await waitText(page, '#arithmetic-ex-same', 'same point: agree', { mode: 'starts' });

  // 5. the conj chip is the unary mirror of z1, and a mode change clears the toggle
  await clickChip(page, 'arithmetic-mode-conj');
  await waitText(page, RO, '3 + 2i');
  assert(await attr(page, '#arithmetic-conj-result', 'aria-pressed') === 'false', 'the mirror toggle was cleared by the mode change');
  assert(await attr(page, '#arithmetic-conj-result', 'aria-disabled') === 'true', 'the mirror toggle is disabled in conj mode');

  // 6. back to multiplication: the toggle really is off
  await clickChip(page, 'arithmetic-mode-mul');
  await waitText(page, RO, '5 + 14i');

  // 7. drag z2 to 1: the product is z1 itself
  await dragHandle(page, 'arithmetic-plane-z2', { re: 1, im: 0 });
  await waitText(page, RO, '3 - 2i');
  await waitText(page, '#arithmetic-ex-same', 'same point: agree', { mode: 'starts' });
  const z2 = await handleZ(page, 'arithmetic-plane-z2');
  assert(z2.re === 1 && z2.im === 0, `z2 is (${z2.re}, ${z2.im}), exactly (1, 0) expected`);
  log('1.1.1 and 1.1.2: all steps passed');
}

// ---- arithmetic: A5 and A6 ----------------------------------------------------------------------

async function arithmeticStation(page, ctx) {
  const { assert, log, shot } = ctx;
  const RO = '#arithmetic-readout';
  const hasEl = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);

  // 1. the default state is problem 1.1.1
  await waitText(page, RO, 'result = 5 + 14i');
  assert(await attr(page, '.station', 'data-mode') === 'mul', 'the default mode is mul');

  // 2. add: the parallelogram and the Cartesian emphasis
  await clickChip(page, 'arithmetic-mode-add');
  await waitText(page, RO, 'result = 2 + 2i');
  await waitData(page, '#arithmetic-ex-point-cart', 'x_1+x_2');
  assert((await readText(page, '[data-explainer="arithmetic-ex"] tr[data-row="point"] .ex-native')) === 'easy in Cartesian', 'the add point row says easy in Cartesian');
  await waitPlan(page, "plan.prims.some((p) => p.id === 's-slide')", 's-slide');
  const addPlan = await plan(page);
  const segs = addPlan.prims.filter((p) => p.type === 'segment').map((p) => p.id);
  assert(segs.length === 5 && ['s-a', 's-b', 's-a-v', 's-b-v', 's-slide'].every((id) => segs.includes(id)), `add segments are ${segs.join(',')}`);
  const slide = addPlan.prims.find((p) => p.id === 's-slide');
  assert(near(slide.b.re, 2, 1e-9) && near(slide.b.im, 2, 1e-9), 'the slide ends at 2 + 2i');
  await shot('add');

  // 3. mul: two stacked arcs ending on the result's ray; the polar heading
  await clickChip(page, 'arithmetic-mode-mul');
  await waitText(page, RO, 'result = 5 + 14i');
  await waitPlan(page, "plan.prims.some((p) => p.id === 'arc-2')", 'arc-2');
  const mulPlan = await plan(page);
  const arcs = mulPlan.prims.filter((p) => p.type === 'arc');
  assert(arcs.length === 2, `mul has ${arcs.length} arcs`);
  const a1 = arcs.find((p) => p.id === 'arc-1');
  const a2 = arcs.find((p) => p.id === 'arc-2');
  assert(near(a1.to, -0.588, 1e-3) && near(a2.to, 1.2278, 1e-3), `arc ends ${a1.to}, ${a2.to}`);
  const ray = mulPlan.prims.find((p) => p.id === 's-ray-result');
  assert(near(ray.b.re, 5, 1e-9) && near(ray.b.im, 14, 1e-9), 'the result ray ends at (5, 14)');
  for (const row of ['length', 'angle']) assert((await readText(page, `[data-explainer="arithmetic-ex"] tr[data-row="${row}"] .ex-native`)) === 'easy in Polar', `${row} row says easy in Polar`);
  assert((await readText(page, '[data-explainer="arithmetic-ex"] tr[data-row="point"] .ex-native')) === 'easy in Cartesian', 'the 1.1.1 point row says easy in Cartesian');
  assert((await readText(page, '[data-explainer="arithmetic-ex"] th[data-col="polar"]')) === 'Polar (spin-and-stretch)', 'the polar heading');
  await shot('mul');

  // 4. A6: the two proofs are live in both columns
  await waitText(page, '#arithmetic-p1-same', 'same point: agree', { mode: 'starts' });
  await waitText(page, '#arithmetic-p2-same', 'same point: agree', { mode: 'starts' });
  await waitData(page, '#arithmetic-p1-lhs-cart', '(3 + 2i)(-1 - 4i) = 5 - 14i');
  await waitData(page, '#arithmetic-p2-zzbar-cart', '= 13');
  assert((await attr(page, 'a#arithmetic-p1-chip', 'href')).endsWith('#problem-P1'), 'P1 chip href');
  assert((await attr(page, 'a#arithmetic-p2-chip', 'href')).endsWith('#problem-P2'), 'P2 chip href');
  assert(await hasEl('#arithmetic-proofs'), 'the proofs panel exists');

  // 5. drag z1 to 1 + i: the proofs follow
  await dragHandle(page, 'arithmetic-plane-z1', { re: 1, im: 1 });
  await waitData(page, '#arithmetic-p2-zzbar-cart', '1^2+1^2 = 2');
  await waitText(page, '#arithmetic-p2-same', 'same point: agree', { mode: 'starts' });

  // 6. play: spin, then stretch, on the real clock (start again from the 1.1.1 numbers)
  await clickChip(page, 'arithmetic-preset-1-1-1');
  await waitText(page, RO, 'result = 5 + 14i');
  await clickChip(page, 'arithmetic-animate');
  await waitText(page, '#arithmetic-animate', 'Stop', { mode: 'equals' });
  await waitText(page, '#arithmetic-caption', 'Stretch by the length of z₂.', { mode: 'equals', timeout: 6000 });
  await waitText(page, '#arithmetic-animate', 'Play: spin, then stretch', { mode: 'equals', timeout: 6000 });
  const done = await hook(page, 'arithmetic');
  assert(done.anim.kind === 'done', `animation ended as "${done.anim.kind}"`);
  assert(near(done.anim.point.re, 5, 1e-6) && near(done.anim.point.im, 14, 1e-6), `the traveller ended at (${done.anim.point.re}, ${done.anim.point.im})`);
  assert((await readText(page, RO)).startsWith('result = 5 + 14i;'), 'the readout did not change');
  assert(await readText(page, '#arithmetic-caption') === 'Stretch by the length of z₂.', 'the caption keeps the last phase');

  // 7. reduced motion: the same button is a stepper
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clickChip(page, 'arithmetic-animate');
  await waitText(page, '#arithmetic-caption', 'Spin z₁ by the angle of z₂.', { mode: 'equals' });
  await waitText(page, '#arithmetic-animate', 'Next step (2 of 2)', { mode: 'equals' });
  let s1 = await hook(page, 'arithmetic');
  assert(s1.anim.kind === 'stepped' && s1.anim.step === 1, `after step 1 the animation is ${JSON.stringify(s1.anim)}`);
  await clickChip(page, 'arithmetic-animate');
  await waitText(page, '#arithmetic-caption', 'Stretch by the length of z₂.', { mode: 'equals' });
  await waitText(page, '#arithmetic-animate', 'Start over', { mode: 'equals' });
  s1 = await hook(page, 'arithmetic');
  assert(s1.anim.step === 2 && near(s1.anim.point.re, 5, 1e-6) && near(s1.anim.point.im, 14, 1e-6), `after step 2 the animation is ${JSON.stringify(s1.anim)}`);
  await clickChip(page, 'arithmetic-animate');
  await waitText(page, '#arithmetic-caption', 'Press Play to watch the move.', { mode: 'equals' });
  await waitText(page, '#arithmetic-animate', 'Next step (1 of 2)', { mode: 'equals' });
  s1 = await hook(page, 'arithmetic');
  assert(s1.anim.kind === 'idle', 'start over returns to idle');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // 8. P2: z2 is the mirror of z1; dragging z1 drags z2 with it
  await page.evaluate(() => { location.hash = '#problem-P2'; });
  await page.waitForFunction(() => { const b = document.getElementById('arithmetic-lock-conj'); return !!b && b.checked; }, null, { timeout: 4000 });
  await waitText(page, RO, 'result = 13');
  await dragHandle(page, 'arithmetic-plane-z1', { re: 2, im: 1 });
  await waitText(page, RO, 'result = 5; |result| = 5; Arg = 0', { mode: 'equals' });
  const z2 = await handleZ(page, 'arithmetic-plane-z2');
  assert(z2.re === 2 && z2.im === -1, `z2 is (${z2.re}, ${z2.im}), (2, -1) expected`);
  log('arithmetic: all steps passed');
}

// ---- deep links: the preset each problem loads ---------------------------------------------------

async function arithmeticLoads(page, ctx) {
  const { route, assert } = ctx;
  const RO = '#arithmetic-readout';
  if (route === 'problem-1-1-2') {
    await waitText(page, RO, 'result = 4 + 6i; |result| = 7.211; Arg = 0.983', { mode: 'equals' });
    assert(await attr(page, '#arithmetic-conj-result', 'aria-pressed') === 'true', 'the mirror toggle is on for 1.1.2');
    await waitData(page, '#arithmetic-ex-im-cart', '= 6');
  } else if (route === 'problem-P1') {
    assert(await attr(page, '.station', 'data-mode') === 'conj', 'P1 opens in conj mode');
    await waitText(page, RO, 'result = 3 + 2i');
    await waitText(page, '#arithmetic-p1-same', 'same point: agree', { mode: 'starts' });
  } else if (route === 'problem-P2') {
    await page.waitForFunction(() => { const b = document.getElementById('arithmetic-lock-conj'); return !!b && b.checked; }, null, { timeout: 4000 });
    await waitText(page, RO, 'result = 13; |result| = 13; Arg = 0', { mode: 'equals' });
    await waitText(page, '#arithmetic-p2-same', 'same point: agree', { mode: 'starts' });
  } else if (route === 'arithmetic-div') {
    await waitText(page, RO, 'result = -0.647 - 0.588i; |result| = 0.874; Arg = -2.404', { mode: 'equals' });
    assert(await attr(page, '#arithmetic-mode-div', 'aria-pressed') === 'true', 'div chip pressed');
  } else {
    throw new Error(`no checks written for route ${route}`);
  }
}
