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

// A station with a video panel (a media/manifest.js entry, here `two-addresses` on addresses and problem-1-3-1) points a <video preload="metadata"> at an
// H.264 file. Playwright's Chromium cannot play H.264 (canPlayType('video/mp4; codecs="avc1.42E01E"') is ''), so it aborts that request with
// net::ERR_ABORTED, which tools/smoke.mjs counts as a failed request, in some runs and not in others. That is the browser build, not the page: an aborted
// request for a video file is allowed here (a 404 is still an error: it is an `HTTP 404` line, not a `request failed` one).
export const expectedErrors = [/request failed: .*\/media\/video\/[\w-]+\.mp4/];

// ---- the words on a plane ------------------------------------------------------------------------------------------------
// A spy on CanvasRenderingContext2D.fillText keeps the words of the LAST frame of every canvas (clearRect from 0, 0 starts a frame);
// the words of the handles are DOM, read from their rectangles. Together they are everything a student can read on the plane.
async function installWordSpy(page) {
  await page.evaluate(() => {
    if (window.__wordSpy) return;
    const proto = CanvasRenderingContext2D.prototype, spy = (window.__wordSpy = new WeakMap());
    const frame = (cv) => { let f = spy.get(cv); if (!f) { f = { words: [] }; spy.set(cv, f); } return f; };
    const clear = proto.clearRect, fill = proto.fillText;
    proto.clearRect = function (x, y, w, h) { if (x === 0 && y === 0) frame(this.canvas).words = []; return clear.call(this, x, y, w, h); };
    proto.fillText = function (t, x, y, ...rest) {
      frame(this.canvas).words.push({ text: String(t), x, y, w: this.measureText(String(t)).width, align: this.textAlign, base: this.textBaseline, size: parseFloat(this.font) });
      return fill.call(this, t, x, y, ...rest);
    };
  });
}
// every word of the last frame of a plane as boxes in canvas pixels: { w, h, canvas: [{ text, size, x0, y0, x1, y1 }], handles: [the DOM words], dots: [the handle dots] }
async function readWords(page, planeId) {
  await installWordSpy(page);
  await page.evaluate((id) => window.__mv.planes.get(id).requestDraw(), planeId);
  await settle(page, 3);
  return page.evaluate((id) => {
    const pl = window.__mv.planes.get(id), f = window.__wordSpy.get(pl.canvas), rect = pl.canvas.getBoundingClientRect();
    const canvas = (f ? f.words : []).map((q) => {
      const x0 = q.align === 'left' || q.align === 'start' ? q.x : q.align === 'right' || q.align === 'end' ? q.x - q.w : q.x - q.w / 2;
      const y0 = q.base === 'middle' ? q.y - q.size / 2 - 2 : q.y - q.size + 1, y1 = q.base === 'middle' ? q.y + q.size / 2 + 2 : q.y + 4;
      return { text: q.text, size: q.size, x0, y0, x1: x0 + q.w, y1 };
    });
    const handles = [...pl.el.querySelectorAll('.plane-handle-label')].filter((el) => el.getClientRects().length > 0).map((el) => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent, size: 13, x0: r.left - rect.left, y0: r.top - rect.top, x1: r.right - rect.left, y1: r.bottom - rect.top };
    });
    const dots = [...pl.el.querySelectorAll('.plane-handle')].filter((el) => el.getClientRects().length > 0).map((el) => {
      const r = (el.querySelector('.plane-handle-dot') || el).getBoundingClientRect();
      return { text: `the dot of ${el.dataset.handleId}`, size: 13, x0: r.left - rect.left, y0: r.top - rect.top, x1: r.right - rect.left, y1: r.bottom - rect.top };
    });
    return { w: rect.width, h: rect.height, canvas, handles, dots };
  }, planeId);
}
const boxHit = (a, b, d = 1) => a.x0 + d < b.x1 && b.x0 + d < a.x1 && a.y0 + d < b.y1 && b.y0 + d < a.y1;
// no two words of the plane touch, none sits on a handle's dot, none leaves the canvas, none sits on a tick number, and the words in `expect` are there (a prefix each)
function assertWordsClear(assert, W, when, expect = [], { ticks: checkTicks = true } = {}) {
  const ticks = W.canvas.filter((q) => q.size < 11.5), words = [...W.canvas.filter((q) => q.size >= 11.5), ...W.handles];
  for (let i = 0; i < words.length; i++) {
    const a = words[i];
    assert(a.x0 >= -1 && a.x1 <= W.w + 1 && a.y0 >= -1 && a.y1 <= W.h + 1, `${when}: "${a.text}" leaves the canvas (${JSON.stringify([a.x0, a.y0, a.x1, a.y1].map(Math.round))} in ${Math.round(W.w)} x ${Math.round(W.h)})`);
    for (let j = i + 1; j < words.length; j++) assert(!boxHit(a, words[j]), `${when}: "${a.text}" overlaps "${words[j].text}"`);
    for (const d of W.dots) assert(!boxHit(a, d), `${when}: "${a.text}" sits on ${d.text}`);
    if (checkTicks) for (const t of ticks) assert(!boxHit(a, t), `${when}: "${a.text}" sits on the tick number ${t.text}`);
  }
  for (const want of expect) assert(words.some((q) => q.text.startsWith(want)), `${when}: the word "${want}" is on the plane (have ${words.map((q) => q.text).join(' | ')})`);
}

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
  await waitText(page, RO, ['|z| = 2', '2.094', '2π/3']);
  assert(await readText(page, RO) === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)', `readout is "${await readText(page, RO)}"`);
  assert(!/pi/.test(await readText(page, RO)), 'the readout has no code-like "pi"');
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
  await waitText(page, RO, ['Arg z = 3.142', 'π']);
  assert(await readText(page, RO) === 'z = -16; |z| = 16; Arg z = 3.142 (π)', `readout after typing is "${await readText(page, RO)}"`);
  assert(await value(page, '#addresses-r') === '16', 'r field is 16');
  assert(await value(page, '#addresses-theta') === '3.142', 'theta field is 3.142');
  const ua = Number(await attr(page, '[data-plane-id="addresses-plane"]', 'data-units-across'));
  assert(ua >= 40, `the view widened to ${ua} units across`);
  await waitData(page, '#addresses-ex-theta-cart', '\\pi');
  await waitText(page, '#addresses-ex-same', 'same point: agree', { mode: 'starts' });

  // 10b. Reset view must not lose the dot: the 8-unit home is wider than -16, so the view stays wide enough to show it
  await page.click('#addresses-plane-zoom-reset');
  await settle(page, 3);
  const onPlane = await page.evaluate(() => { const p = window.__mv.planes.get('addresses-plane'), s = p.getSize(), q = p.toPixel(window.__mv.addresses.state().z); return q.x >= 0 && q.x <= s.w && q.y >= 0 && q.y <= s.h; });
  assert(onPlane, 'after Reset view the dot at -16 is still on the plane');
  assert(Number(await attr(page, '[data-plane-id="addresses-plane"]', 'data-units-across')) >= 40, 'the view is still wide after Reset view');

  // 11. typing a non-home name of the angle: the dot is where it was, and the note says which name is home
  await clickChip(page, 'addresses-preset-m1-sqrt3i');
  await typeInto(page, 'addresses-theta', '8pi/3');
  await waitText(page, '#addresses-note', ['8.378', '2π/3 + 2π', 'Arg z = 2.094 (2π/3)']);
  assert(await readText(page, RO) === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)', 'the dot did not move');
  assert(await value(page, '#addresses-theta') === '2.094', 'theta field shows the home name');

  // 12. a negative length is refused
  await typeInto(page, 'addresses-r', '-2');
  await waitText(page, '#addresses-note', 'A length cannot be negative');
  assert(await attr(page, '#addresses-r', 'aria-invalid') === 'true', 'r field is marked invalid');
  assert(await readText(page, RO) === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)', 'the dot did not move for r = -2');
  // the rejection belongs to what was typed: dragging the dot rewrites the field, and the invalid mark and the sentence go with it
  await dragHandle(page, 'addresses-plane-z', { re: 1, im: 1 });
  await waitText(page, RO, 'z = 1 + i', { mode: 'starts' });
  assert(await attr(page, '#addresses-r', 'aria-invalid') === null && await attr(page, '#addresses-r', 'aria-describedby') === null, 'dragging the dot clears aria-invalid on the r field');
  assert(await readText(page, '#addresses-note') === '', `dragging the dot clears the rejection sentence, got "${await readText(page, '#addresses-note')}"`);
  await typeInto(page, 'addresses-x', 'abc');                                    // an unreadable x: marked and explained
  assert(await attr(page, '#addresses-x', 'aria-invalid') === 'true' && (await readText(page, '#addresses-note')).length > 10, 'an unreadable x is marked invalid with a sentence');
  await clickChip(page, 'addresses-preset-1-i');                                 // a preset rewrites every field
  assert(await attr(page, '#addresses-x', 'aria-invalid') === null, 'a preset clears the invalid mark');
  await typeInto(page, 'addresses-y', 'abc');
  assert(await attr(page, '#addresses-y', 'aria-invalid') === 'true', 'an unreadable y is marked invalid');
  await typeInto(page, 'addresses-x', '2');                                      // a valid x moves the dot, which rewrites the y field too: its rejection goes
  assert(await attr(page, '#addresses-y', 'aria-invalid') === null, 'a valid x rewrites the y field and clears its invalid mark');
  assert(await readText(page, '#addresses-note') === '', `and the sentence goes, got "${await readText(page, '#addresses-note')}"`);
  await clickChip(page, 'addresses-preset-m1-sqrt3i');

  // 13. chips and boxes
  await clickChip(page, 'addresses-preset-m16');
  await waitText(page, RO, 'z = -16; |z| = 16; Arg z = 3.142 (π)', { mode: 'equals' });
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
  await waitText(page, '#addresses-readout', 'z = -16; |z| = 16; Arg z = 3.142 (π)', { mode: 'equals' });
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
  assert(await readText(page, RO) === 'result = 2 + 2i; |result| = 2.828; Arg = 0.785 (π/4)', `the add readout writes the exact angle with a pi sign: "${await readText(page, RO)}"`);
  await settle(page, 3);
  assertWordsClear(assert, await readWords(page, 'arithmetic-plane'), 'add', ['z₁ + z₂']);
  await shot('add');
  // the mirror of the answer: its word and the word of the point it came from sit clear of the dashed hop and of z1's name
  await clickChip(page, 'arithmetic-conj-result');
  await waitText(page, RO, 'result = 2 - 2i');
  assertWordsClear(assert, await readWords(page, 'arithmetic-plane'), 'add and mirror', ['conj(z₁ + z₂)', 'z₁ + z₂']);
  assert((await hook(page, 'arithmetic')).conjResult === true, 'the mirror is on');
  await clickChip(page, 'arithmetic-conj-result');
  await waitText(page, RO, 'result = 2 + 2i');

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
  // the heavy ray stops at the ring (z1 spun); the dashed stretch carries on from there to the result, so it is not hidden under the ray
  const ray = mulPlan.prims.find((p) => p.id === 's-ray-result'), stretch = mulPlan.prims.find((p) => p.id === 's-stretch'), spun = mulPlan.prims.find((p) => p.id === 'spun');
  assert(near(ray.b.re, spun.z.re, 1e-9) && near(ray.b.im, spun.z.im, 1e-9) && ray.arrow === false, 'the heavy ray ends on the ring');
  assert(near(stretch.a.re, spun.z.re, 1e-9) && near(stretch.b.re, 5, 1e-9) && near(stretch.b.im, 14, 1e-9), 'the dashed stretch runs from the ring to (5, 14)');
  assertWordsClear(assert, await readWords(page, 'arithmetic-plane'), 'mul', ['z₁ z₂', 'θ₁', 'θ₂']);
  const placedMul = await page.evaluate(() => window.__mv.arithmetic.labels());
  assert(placedMul['l-result'] === true && placedMul['l-theta1'] === true && placedMul['l-theta2'] === true, `mul: every word is placed ${JSON.stringify(placedMul)}`);
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

  // 7b. a second Play that ends on the same sentence is announced again: Play empties the live region, the end of the move fills it
  assert(await readText(page, '#arithmetic-announce') === 'Done. The result is 5 + 14i.', `the first Play was announced, got "${await readText(page, '#arithmetic-announce')}"`);
  await clickChip(page, 'arithmetic-animate');
  assert(await readText(page, '#arithmetic-announce') === '', 'Play empties the live region');
  await waitText(page, '#arithmetic-announce', 'Done. The result is 5 + 14i.', { mode: 'equals', timeout: 6000 });
  await waitText(page, '#arithmetic-animate', 'Play: spin, then stretch', { mode: 'equals', timeout: 6000 });

  // 7c. a rejected value goes when its field is rewritten: by a drag of the point, the preset button, or the mirror lock
  const invalid = async (n) => [await attr(page, `#arithmetic-z${n}-input`, 'aria-invalid'), (await readText(page, `#arithmetic-z${n}-error`)).length > 0, await attr(page, `#arithmetic-z${n}-input`, 'aria-describedby')];
  await typeInto(page, 'arithmetic-z1-input', '3 +');
  assert(JSON.stringify(await invalid(1)) === JSON.stringify(['true', true, 'arithmetic-z1-error']), `an unreadable z1 is marked and explained: ${JSON.stringify(await invalid(1))}`);
  await dragHandle(page, 'arithmetic-plane-z1', { re: 2, im: -1 });
  assert(JSON.stringify(await invalid(1)) === JSON.stringify([null, false, null]), `dragging z1 clears the rejection: ${JSON.stringify(await invalid(1))}`);
  await typeInto(page, 'arithmetic-z2-input', 'sqrt(');
  assert((await invalid(2))[0] === 'true', 'an unreadable z2 is marked');
  await clickChip(page, 'arithmetic-preset-1-1-1');
  assert(JSON.stringify(await invalid(2)) === JSON.stringify([null, false, null]), `the preset button clears the rejection (it used to leave it): ${JSON.stringify(await invalid(2))}`);
  await typeInto(page, 'arithmetic-z1-input', '1 +');
  await typeInto(page, 'arithmetic-z2-input', '2 +');
  assert((await invalid(1))[0] === 'true' && (await invalid(2))[0] === 'true', 'both fields marked');
  await page.click('#arithmetic-lock-conj'); await settle(page, 3);                  // z2 becomes the mirror of z1: z2's field is rewritten, z1's is not
  assert((await invalid(2))[0] === null, 'the mirror lock rewrites z2 and clears its rejection');
  await page.click('#arithmetic-lock-conj'); await settle(page, 3);
  await clickChip(page, 'arithmetic-preset-1-1-1');
  assert((await invalid(1))[0] === null && (await invalid(2))[0] === null, 'the preset clears both');

  // 7d. the tooltip of a problem chip is plain text: no braces, the exponent shown as ^(...)
  const tip = await attr(page, 'a#arithmetic-p2-chip', 'title');
  assert(tip === 'Spin and unspin cancel: re^(iθ)·re^(−iθ) = r² (θ a name for arg z).', `the P2 chip tooltip is "${tip}"`);
  assert(!/[{}]/.test(await attr(page, '#arithmetic-problem-chip-P2', 'title')), 'the header chip of P2 has no braces either');

  // 7e. a tiny divisor: the denominator keeps its size (three significant digits), it is neither 0.003 nor 0
  await clickChip(page, 'arithmetic-mode-div');
  await typeInto(page, 'arithmetic-z2-input', '0.05');
  await waitData(page, '#arithmetic-ex-point-cart', '2.5\\times10^{-3}');
  assert(!(await attr(page, '#arithmetic-ex-point-cart', 'data-tex')).includes('{0.003}'), 'the denominator 0.0025 is not printed as 0.003');
  await clickChip(page, 'arithmetic-preset-1-1-1');
  await clickChip(page, 'arithmetic-mode-mul');
  await waitText(page, RO, 'result = 5 + 14i');

  // 8. P2: z2 is the mirror of z1; dragging z1 drags z2 with it
  await page.evaluate(() => { location.hash = '#problem-P2'; });
  await page.waitForFunction(() => { const b = document.getElementById('arithmetic-lock-conj'); return !!b && b.checked; }, null, { timeout: 4000 });
  await waitText(page, RO, 'result = 13');
  // the one problem whose lesson is the polar cancellation says so: the angles are opposite and cancel, and polar is the easy address
  const why = await readText(page, '#arithmetic-why');
  assert(why.includes('the two spins cancel') && why.includes('r · r = r²') && !why.includes('not both nice numbers'), `P2 callout: ${why}`);
  assert((await readText(page, '[data-explainer="arithmetic-ex"] tr[data-row="point"] .ex-native')) === 'easy in Polar', 'P2: the point row says easy in Polar');
  assertWordsClear(assert, await readWords(page, 'arithmetic-plane'), 'P2', ['z₁ z₂', 'θ₁', 'θ₂']);
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
    assertWordsClear(assert, await readWords(page, 'arithmetic-plane'), '1.1.2 sub and mirror', ['conj(z₁ − z₂)', 'z₁ − z₂']);
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
    // the one problem whose lesson is the polar cancellation says so on the page, not the generic "multiply out in x and y"
    const why = await readText(page, '#arithmetic-why');
    assert(why.includes('the two spins cancel') && why.includes('θ₁ + θ₂ = -0.588 + 0.588 = 0') && !why.includes('multiply out'), `P2 callout: ${why}`);
    assert((await readText(page, '[data-explainer="arithmetic-ex"] tr[data-row="point"] .ex-native')) === 'easy in Polar', 'P2: the point row says easy in Polar');
    assertWordsClear(assert, await readWords(page, 'arithmetic-plane'), 'P2 load', ['z₁ z₂', 'θ₁', 'θ₂']);
  } else if (route === 'arithmetic-div') {
    await waitText(page, RO, 'result = -0.647 - 0.588i; |result| = 0.874; Arg = -2.404', { mode: 'equals' });
    assert(await attr(page, '#arithmetic-mode-div', 'aria-pressed') === 'true', 'div chip pressed');
    // the jammed state of the review: the result sits inside the stacked arcs, and its word, both θ names and the arcs must not collide
    assertWordsClear(assert, await readWords(page, 'arithmetic-plane'), '1.1.1 part 2 (div)', ['z₁ / z₂', 'θ₁', '−θ₂']);
    const placedDiv = await page.evaluate(() => window.__mv.arithmetic.labels());
    assert(placedDiv['l-result'] === true && placedDiv['l-theta1'] === true && placedDiv['l-theta2'] === true, `div: every word is placed ${JSON.stringify(placedDiv)}`);
    await clickChip(page, 'arithmetic-conj-result');
    assertWordsClear(assert, await readWords(page, 'arithmetic-plane'), '1.1.1 part 2 and mirror', ['conj(z₁ ÷ z₂)', 'z₁ ÷ z₂', 'θ₁', '−θ₂']);
  } else {
    throw new Error(`no checks written for route ${route}`);
  }
}
