// tests/interact/i1-station-mappings-cr.mjs
// Interaction script for the stations `mappings` and `cauchy-riemann` (goal i1-station-mappings-cr).
// Run:  node tools/smoke.mjs --route problem-2-1-1 --script tests/interact/i1-station-mappings-cr.mjs
//       node tools/smoke.mjs --route problem-3-2-1 --script tests/interact/i1-station-mappings-cr.mjs
//       node tools/smoke.mjs --route problem-P7   --script tests/interact/i1-station-mappings-cr.mjs
// One file serves all routes: it branches on ctx.route. A2, A3 mark the exact acceptance expectations.

import { dragHandle, clickChip, readText, setSlider, settle, handleZ, nums, parseCart } from './_helpers.mjs';

export default async function (page, ctx) {
  const { route, log } = ctx;
  if (route === 'problem-2-1-1' || route === 'mappings') return mappingsSuite(page, ctx);
  if (route === 'problem-3-2-1' || route === 'cauchy-riemann') return crSuite(page, ctx);
  if (route === 'problem-P7') return p7Suite(page, ctx);
  log(`i1-station-mappings-cr: no suite for route ${route}`);
}

// ---- helpers ---------------------------------------------------------------

// text of a cell with invisible MathML operators and whitespace removed, plus its data-tex without whitespace
const cell = (page, id) => page.evaluate((id) => {
  const el = document.getElementById(id);
  return el ? { text: el.textContent.replace(/[\s⁡-⁤​]/g, ''), tex: (el.dataset.tex || '').replace(/\s/g, '') } : null;
}, id);
const has = (c, glyph, texGlyph) => !!c && (c.text.includes(glyph) || c.tex.includes(texGlyph === undefined ? glyph : texGlyph));
const attr = (page, sel, a) => page.evaluate(([s, a]) => { const e = document.querySelector(s); return e ? e.getAttribute(a) : null; }, [sel, a]);
const isHidden = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !e || e.hidden || e.closest('[hidden]') !== null; }, sel);
const textOf = (page, sel) => readText(page, sel);

// poll a text until a predicate holds (explainers and planes update once per frame)
async function until(page, read, pred, tries = 25) {
  let v;
  for (let i = 0; i < tries; i++) {
    v = await read();
    if (pred(v)) return v;
    await settle(page, 2);
  }
  return v;
}
const textStarts = (page, sel, s) => until(page, () => readText(page, sel), (t) => t.startsWith(s));
const textHas = (page, sel, s) => until(page, () => readText(page, sel), (t) => t.includes(s));
const mv = (page, expr) => page.evaluate(`(${expr})(window.__mv)`);

// every figure of the station has exactly one figcaption and it is the first or the last child (valid HTML5)
const captionsOk = (page, station) => page.evaluate((sel) => {
  const figs = [...document.querySelectorAll(sel + ' figure')];
  const ok = figs.every((f) => {
    const caps = [...f.children].filter((n) => n.tagName === 'FIGCAPTION');
    return caps.length === 1 && (f.firstElementChild === caps[0] || f.lastElementChild === caps[0]);
  });
  return { n: figs.length, ok };
}, station);
// where the origin falls on a plane, in its own pixels
const originPx = (page, planeId) => page.evaluate((id) => {
  const p = window.__mv.planes.get(id), s = p.getSize(), o = p.toPixel({ re: 0, im: 0 });
  return { w: s.w, h: s.h, x: o.x, y: o.y };
}, planeId);

const MAP_AT_1PLUSI = 'z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3';

// ---- mappings (problem 2.1.1) ----------------------------------------------

async function mappingsSuite(page, ctx) {
  const { assert, log, shot } = ctx;
  const tag = 'mappings';

  // 1. loaded in its default state
  await settle(page, 3);
  assert(await page.locator('#station-mappings').count() === 1, `${tag}: #station-mappings exists`);
  assert(await attr(page, '#mappings-fn-sq-plus-iz', 'aria-pressed') === 'true', `${tag}: z^2 + iz chip is pressed`);
  assert((await textOf(page, '#mappings-problem')).includes('Problem 2.1.1'), `${tag}: problem callout names 2.1.1`);

  // 2. A2: both forms at 1 + i
  let readout = await readText(page, '#mappings-readout');
  assert(readout.includes('w = -1 + 3i') && readout.includes('u = -1') && readout.includes('v = 3'), `${tag}: A2 readout has w = -1 + 3i, u = -1, v = 3 (got "${readout}")`);
  assert(readout === MAP_AT_1PLUSI, `${tag}: readout is exactly "${MAP_AT_1PLUSI}" (got "${readout}")`);

  // 3. A2: the rendered cells carry the right pieces
  await until(page, () => cell(page, 'mappings-ex-u-cart'), (c) => !!c && c.tex !== '');
  let c = await cell(page, 'mappings-ex-u-cart');
  assert(has(c, 'x') && has(c, 'y') && has(c, '2'), `${tag}: A2 u (Cartesian) cell has x, y and 2 (got ${JSON.stringify(c)})`);
  c = await cell(page, 'mappings-ex-u-polar');
  assert(has(c, 'r') && has(c, '2θ', '2\\theta'), `${tag}: A2 u (polar) cell has r and 2θ (got ${JSON.stringify(c)})`);
  c = await cell(page, 'mappings-ex-v-cart');
  assert(has(c, 'x') && has(c, 'y') && has(c, '2'), `${tag}: v (Cartesian) cell has x, y and 2`);
  c = await cell(page, 'mappings-ex-v-polar');
  assert(has(c, 'r') && has(c, '2θ', '2\\theta'), `${tag}: v (polar) cell has r and 2θ`);
  c = await cell(page, 'mappings-ex-value-cart');
  assert(c.tex.includes('-1') && c.tex.includes('3'), `${tag}: value (Cartesian) tex has -1 and 3 (got ${c.tex})`);
  c = await cell(page, 'mappings-ex-value-polar');
  assert(c.tex.includes('\\sqrt{2}') && c.tex.includes('\\frac{\\pi}{4}'), `${tag}: value (polar) tex has \\sqrt{2} and \\frac{\\pi}{4} (got ${c.tex})`);
  assert(c.tex.includes('\\theta=\\mathrm{Arg}\\,z=\\frac{\\pi}{4}'), `${tag}: the polar value cell says which angle it is, theta = Arg z (got ${c.tex})`);
  const caps = await captionsOk(page, '#station-mappings');
  assert(caps.n === 2 && caps.ok, `${tag}: both figures have their figcaption first or last (${JSON.stringify(caps)})`);

  // 4. A2: the same-point footer
  const same = await textStarts(page, '#mappings-ex-same', 'same point: agree');
  assert(same.startsWith('same point: agree'), `${tag}: A2 footer starts "same point: agree" (got "${same}")`);
  assert(await attr(page, '#mappings-ex-same', 'data-agree') === 'true', `${tag}: footer data-agree is true`);

  // 5. A2: drag z to i (the 0.1 snap makes the numbers exact)
  let z = await dragHandle(page, 'mappings-zplane-z', { re: 0, im: 1 });
  assert(Math.abs(z.re) < 1e-9 && Math.abs(z.im - 1) < 1e-9, `${tag}: the drag snaps to exactly i (got ${z.re}, ${z.im})`);
  readout = await readText(page, '#mappings-readout');
  assert(readout.includes('w = -2'), `${tag}: A2 after the drag the readout has w = -2 (got "${readout}")`);
  assert(readout === 'z = i; w = -2; u = -2; v = 0; polar: u = -2; v = 0', `${tag}: readout at i is exact (got "${readout}")`);
  assert((await textStarts(page, '#mappings-ex-same', 'same point: agree')).startsWith('same point: agree'), `${tag}: still agrees at i`);
  assert((await textOf(page, '#mappings-zcap')).includes('z = i'), `${tag}: the z caption says z = i`);

  // 6. the staircase: another name of the angle, the same w
  await page.click('#mappings-stairs-k1 button');
  await settle(page, 3);
  assert(await readText(page, '#mappings-readout') === 'z = i; w = -2; u = -2; v = 0; polar: u = -2; v = 0', `${tag}: the readout does not move when a step is picked`);
  assert((await textOf(page, '#mappings-step-note')).includes('k = 1'), `${tag}: the step note says k = 1`);
  await until(page, () => cell(page, 'mappings-ex-value-polar'), (cc) => !!cc && cc.tex.includes('2\\pi'));
  c = await cell(page, 'mappings-ex-value-polar');
  assert(c.tex.includes('2\\pi'), `${tag}: the polar value cell shows the picked name theta + 2pi (got ${c.tex})`);
  assert(c.tex.includes('\\mathrm{Arg}\\,z+2\\pi'), `${tag}: ... and says it is Arg z plus a full turn (got ${c.tex})`);
  assert((await textStarts(page, '#mappings-ex-same', 'same point: agree')).startsWith('same point: agree'), `${tag}: the footer still agrees on step k = 1`);
  await page.click('#mappings-stairs-k0 button');
  await settle(page, 3);
  assert((await textOf(page, '#mappings-step-note')).includes('k = 0'), `${tag}: back to k = 0`);

  // 7. A2: another chip
  await clickChip(page, 'mappings-fn-sq');
  readout = await readText(page, '#mappings-readout');
  assert(readout.includes('w = -1'), `${tag}: A2 chip z^2 gives w = -1 (got "${readout}")`);
  assert(readout === 'z = i; w = -1; u = -1; v = 0; polar: u = -1; v = 0', `${tag}: readout for z^2 at i is exact`);
  assert(await attr(page, '#mappings-fn-sq', 'aria-pressed') === 'true' && await attr(page, '#mappings-fn-sq-plus-iz', 'aria-pressed') === 'false', `${tag}: the chips are a radio group`);
  assert(await isHidden(page, '#mappings-problem'), `${tag}: the problem callout is hidden away from 2.1.1's function`);
  const nat = await until(page, () => page.evaluate(() => { const e = document.querySelector('[data-row="expand"] .ex-native'); return e ? e.textContent : ''; }), (t) => t === 'easy in Polar');
  assert(nat === 'easy in Polar', `${tag}: the expand row is badged "easy in Polar" for z^2 (got "${nat}")`);

  // 8. the pole of 1/z, then back
  await clickChip(page, 'mappings-fn-recip');
  assert(await readText(page, '#mappings-readout') === 'z = i; w = -i; u = 0; v = -1; polar: u = 0; v = -1', `${tag}: readout for 1/z at i`);
  await dragHandle(page, 'mappings-zplane-z', { re: 0, im: 0 });
  assert((await readText(page, '#mappings-readout')).includes('undefined (0 is the pole of 1/z)'), `${tag}: the pole is named in the readout`);
  assert((await textStarts(page, '#mappings-ex-same', 'same point: not checked')).startsWith('same point: not checked'), `${tag}: the footer says not checked at the pole`);
  assert((await textOf(page, '#mappings-stairs-arg')) !== '', `${tag}: the staircase shows its undefined state at z = 0`);
  await clickChip(page, 'mappings-fn-sq-plus-iz');
  z = await dragHandle(page, 'mappings-zplane-z', { re: 1, im: 1 });
  assert(z.re === 1 && z.im === 1, `${tag}: dragged back to exactly 1 + i (got ${z.re}, ${z.im})`);
  assert(await readText(page, '#mappings-readout') === MAP_AT_1PLUSI, `${tag}: readout back at 1 + i`);

  // 9. A2: the morph slider and its hook
  const r1 = await setSlider(page, 'mappings-morph', 1);
  assert(r1 === 1, `${tag}: slider took 1`);
  assert(await page.evaluate(() => window.__mv.mappingsMorph) === 1, `${tag}: A2 window.__mv.mappingsMorph === 1 (a number)`);

  // 10. pieces and grid toggles
  await setSlider(page, 'mappings-morph', 0.5);
  assert(await page.evaluate(() => window.__mv.mappingsMorph) === 0.5, `${tag}: mappingsMorph is 0.5`);
  assert(await textOf(page, '#mappings-morph-value') === '0.50', `${tag}: the value output says 0.50`);
  const p0 = await page.evaluate(() => window.__mv.mappings.state().pieces);
  assert(p0 > 0, `${tag}: the Cartesian grid has carried pieces (got ${p0})`);
  await clickChip(page, 'mappings-grid-polar');
  assert(await attr(page, '#mappings-grid-polar', 'aria-pressed') === 'true', `${tag}: the polar chip is pressed`);
  const p1 = await page.evaluate(() => window.__mv.mappings.state().pieces);
  assert(p1 > p0, `${tag}: switching the polar grid on adds pieces (${p0} -> ${p1})`);
  await clickChip(page, 'mappings-grid-polar');
  await clickChip(page, 'mappings-grid-cart');
  assert(await page.evaluate(() => window.__mv.mappings.state().pieces) === 0, `${tag}: both grids off leaves no pieces`);
  assert(!(await isHidden(page, '#mappings-grid-hint')), `${tag}: the grid hint shows while both grids are off`);
  await clickChip(page, 'mappings-grid-cart');

  // 11. a soft performance guard: both grids on at s = 0.5
  await clickChip(page, 'mappings-grid-polar');
  await setSlider(page, 'mappings-morph', 0.5);
  const ms = await page.evaluate(() => window.__mv.planes.get('mappings-wplane').getStats().lastDrawMs);
  log(`${tag}: w-plane lastDrawMs with both grids at s = 0.5: ${Number(ms).toFixed(1)} ms`);
  assert(ms < 100, `${tag}: the w-plane draw stays cheap (${ms} ms)`);
  await clickChip(page, 'mappings-grid-polar');
  await setSlider(page, 'mappings-morph', 1);

  // 12. Play, then the reduced-motion stepper
  await clickChip(page, 'mappings-play');
  await page.waitForFunction(() => { const s = window.__mv.mappingsMorph; return s > 0 && s < 1; }, null, { timeout: 1500 });
  await page.waitForFunction(() => window.__mv.mappingsMorph === 1, null, { timeout: 4000 });
  await settle(page, 2);
  assert(await textOf(page, '#mappings-play') === 'Play the motion', `${tag}: Play reads "Play the motion" again after the run`);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clickChip(page, 'mappings-play');
  assert(await page.evaluate(() => window.__mv.mappingsMorph) === 0, `${tag}: under reduced motion Play steps (1 wraps to 0)`);
  assert(await textOf(page, '#mappings-play') === 'Step the motion', `${tag}: the button reads "Step the motion"`);
  await clickChip(page, 'mappings-play');
  assert(await page.evaluate(() => window.__mv.mappingsMorph) === 0.25, `${tag}: the next step is 0.25`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await setSlider(page, 'mappings-morph', 1);

  // 13. the Lab button exists (it is not clicked: the Lab may not exist in every snapshot)
  assert((await textOf(page, '#mappings-open-lab')) === 'Draw your own shape in the Lab', `${tag}: the Lab button is labelled`);

  // 14. unmount cleanup
  await page.evaluate(() => { location.hash = '#cauchy-riemann'; });
  await page.waitForSelector('#station-cauchy-riemann', { timeout: 5000 });
  await settle(page, 3);
  const gone = await page.evaluate(() => ({
    morph: window.__mv.mappingsMorph, hook: window.__mv.mappings, plane: window.__mv.planes.has('mappings-zplane'),
    mine: document.querySelectorAll('style[data-for="station-mappings"]').length,
    other: document.querySelectorAll('style[data-for="station-cauchy-riemann"]').length,
  }));
  assert(gone.morph === undefined && gone.hook === undefined && gone.plane === false && gone.mine === 0 && gone.other === 1,
    `${tag}: unmount removed the hooks, the planes and the style block (${JSON.stringify(gone)})`);
  await page.evaluate(() => { location.hash = '#mappings'; });
  await page.waitForSelector('#station-mappings', { timeout: 5000 });
  await settle(page, 3);
  const back = await page.evaluate(() => ({
    hook: typeof window.__mv.mappings, cr: window.__mv.cauchyRiemann, plane: window.__mv.planes.has('cauchy-riemann-zplane'),
    mine: document.querySelectorAll('style[data-for="station-mappings"]').length,
    other: document.querySelectorAll('style[data-for="station-cauchy-riemann"]').length,
  }));
  assert(back.hook === 'object' && back.cr === undefined && back.plane === false && back.mine === 1 && back.other === 0,
    `${tag}: the mirror image holds after navigating back (${JSON.stringify(back)})`);

  await shot('end');
  log('i1-station-mappings-cr: mappings suite ok');
}

// ---- cauchy-riemann (problem 3.2.1) ----------------------------------------

const CR_EXP = "A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f'(z0) = 1.149 + 1.183i (u_x + i v_x)";

async function crSuite(page, ctx) {
  const { assert, log, shot } = ctx;
  const tag = 'cauchy-riemann';
  const Z = 'cauchy-riemann-zplane-z0';

  // 1. loaded in its default state
  await settle(page, 3);
  assert(await attr(page, '#cauchy-riemann-fn-exp', 'aria-pressed') === 'true', `${tag}: the exp chip is pressed`);
  assert((await textOf(page, '#cauchy-riemann-problem')).includes('Problem 3.2.1'), `${tag}: problem callout names 3.2.1`);
  assert(await attr(page, '#cauchy-riemann-paths', 'aria-expanded') === 'false' && await isHidden(page, '#cauchy-riemann-paths-panel'), `${tag}: the paths panel starts closed`);
  assert(await page.evaluate(() => document.querySelector('#cauchy-riemann-wplane-viewport').classList.contains('is-static')), `${tag}: the w-plane is not interactive`);

  const caps = await captionsOk(page, '#station-cauchy-riemann');
  assert(caps.n === 2 && caps.ok, `${tag}: both figures have their figcaption first or last (${JSON.stringify(caps)})`);
  let o = await originPx(page, 'cauchy-riemann-wplane');
  assert(o.x >= 35.5 && o.x <= o.w - 19.5 && o.y >= 21.5 && o.y <= o.h - 21.5, `${tag}: the u and v axes stay off the edges of the w-plane (origin at ${o.x.toFixed(1)}, ${o.y.toFixed(1)} of ${o.w} x ${o.h})`);

  // 2. A3: both tests hold, with the residuals
  assert(await attr(page, '#cauchy-riemann-cr1', 'data-holds') === 'yes' && await attr(page, '#cauchy-riemann-cr2', 'data-holds') === 'yes', `${tag}: A3 both CR lines hold for exp`);
  assert((await readText(page, '#cauchy-riemann-cr1')).startsWith('u_x = v_y: 1.149 vs 1.149, residual 0.000'), `${tag}: cr1 text`);
  assert((await readText(page, '#cauchy-riemann-cr2')).startsWith('u_y = -v_x: -1.183 vs -1.183, residual 0.000'), `${tag}: cr2 text`);

  // 3. A3: the readout, exactly and numerically
  let r = await readText(page, '#cauchy-riemann-readout');
  assert(r === CR_EXP, `${tag}: A3 readout is exact (got "${r}")`);
  assert(r.includes('CR holds: yes') && r.includes('|B| = 0.000'), `${tag}: readout has CR holds: yes and |B| = 0.000`);
  const fp = parseCart(r.slice(r.indexOf("f'(z0) = ") + "f'(z0) = ".length, r.indexOf(' (u_x')));
  assert(fp && Math.abs(fp.re - 1.149) < 1e-3 && Math.abs(fp.im - 1.183) < 1e-3, `${tag}: A3 f'(z0) is 1.149 + 1.183i within 0.001 (got ${JSON.stringify(fp)})`);

  // 4. the Jacobian cells
  const jac = async (key) => nums(await readText(page, `#cauchy-riemann-${key}`))[0];
  const want = { ux: 1.149, uy: -1.183, vx: 1.183, vy: 1.149 };
  for (const k of Object.keys(want)) {
    const got = await jac(k), dv = await attr(page, `#cauchy-riemann-${k}`, 'data-value');
    assert(Math.abs(got - want[k]) < 1e-3, `${tag}: Jacobian ${k} is ${want[k]} (got ${got})`);
    assert(Math.abs(Number(dv) - want[k]) < 1e-3, `${tag}: Jacobian ${k} data-value (got ${dv})`);
  }

  // 5. the geometry through the hook
  let p = await page.evaluate(() => { const q = window.__mv.cauchyRiemann.parts(); return { n: [q.ghost.length, q.A.length, q.B.length, q.image.length], ...q }; });
  assert(p.n.every((n) => n === 33), `${tag}: five polylines of 33 points`);
  const maxDist = (a, b) => Math.max(...a.map((q, i) => Math.hypot(q.re - b[i].re, q.im - b[i].im)));
  assert(maxDist(p.A, p.image) < 1e-9, `${tag}: with no mirror the A part is the image`);
  assert(maxDist(p.B, p.B.map(() => p.fz0)) < 1e-9, `${tag}: the B part collapses onto f(z0)`);
  const side = (a) => Math.hypot(a[8].re - a[0].re, a[8].im - a[0].im);
  assert(Math.abs(side(p.image) - side(p.ghost)) > 0.1, `${tag}: the image is a stretched square, not a translate (${side(p.image).toFixed(3)} vs ${side(p.ghost).toFixed(3)})`);
  assert(await page.evaluate(() => window.__mv.cauchyRiemann.state().holds) === true, `${tag}: state().holds`);

  // 6. text around the picture
  const verdict = await readText(page, '#cauchy-riemann-verdict');
  assert(verdict.includes('entire') && verdict.includes('f(z)'), `${tag}: the verdict says entire and f(z) (got "${verdict}")`);
  await until(page, () => cell(page, 'cauchy-riemann-ab-A-polar'), (cc) => !!cc && cc.tex !== '');
  assert((await cell(page, 'cauchy-riemann-ab-A-polar')).tex.includes('0.8'), `${tag}: A in polar shows Arg A = 0.8`);
  assert((await cell(page, 'cauchy-riemann-ab-fprime-cart')).tex.includes('1.149'), `${tag}: f' cell shows 1.149`);
  assert((await textStarts(page, '#cauchy-riemann-ab-same', 'same point: agree')).startsWith('same point: agree'), `${tag}: the A/B footer agrees`);
  const move = await readText(page, '#cauchy-riemann-move');
  assert(move.includes('Arg A = 0.8') && move.includes('There is no mirror part'), `${tag}: the move line (got "${move}")`);

  // 7. A3: |z|^2 at 1 + i
  await clickChip(page, 'cauchy-riemann-fn-abs2');
  let z = await dragHandle(page, Z, { re: 1, im: 1 });
  assert(z.re === 1 && z.im === 1, `${tag}: drag lands exactly on 1 + i (got ${z.re}, ${z.im})`);
  r = await readText(page, '#cauchy-riemann-readout');
  assert(r === "A = 1 - i; |B| = 1.414; CR holds: no; f' does not exist here", `${tag}: A3 readout for |z|^2 at 1 + i (got "${r}")`);
  assert(r.includes('A = 1 - i') && r.includes('|B| = 1.414') && r.includes('does not exist'), `${tag}: readout has the three pieces`);
  assert(await page.evaluate(() => document.querySelectorAll('[data-holds="no"]').length) === 2, `${tag}: both CR lines fail for |z|^2 at 1 + i`);
  p = await page.evaluate(() => window.__mv.cauchyRiemann.parts());
  assert(maxDist(p.B, p.B.map(() => p.fz0)) > 0.1, `${tag}: the B part is not collapsed`);
  assert((await textOf(page, '#cauchy-riemann-key')).includes('B part'), `${tag}: the key lists the B part`);
  assert(await isHidden(page, '#cauchy-riemann-problem'), `${tag}: no problem callout for |z|^2 (3.1.2 belongs to the derivative station)`);

  // 8. A3: |z|^2 at 0
  await dragHandle(page, Z, { re: 0, im: 0 });
  r = await readText(page, '#cauchy-riemann-readout');
  assert(r === "A = 0; |B| = 0.000; CR holds: yes; f'(z0) = 0 (u_x + i v_x)", `${tag}: A3 readout for |z|^2 at 0 (got "${r}")`);
  assert(r.includes('|B| = 0.000') && r.includes("f'(z0) = 0"), `${tag}: readout has |B| = 0.000 and f'(z0) = 0`);
  assert((await readText(page, '#cauchy-riemann-verdict')).includes('analytic nowhere'), `${tag}: the verdict says analytic nowhere`);

  // 9. A3: Re z
  await clickChip(page, 'cauchy-riemann-fn-re');
  r = await readText(page, '#cauchy-riemann-readout');
  assert(r.includes('|B| = 0.5'), `${tag}: A3 Re z has |B| = 0.5 (got "${r}")`);
  assert(await page.evaluate(() => !!document.querySelector('[data-holds="no"]')), `${tag}: A3 Re z fails a CR line`);

  // 10. A3: u = c
  await clickChip(page, 'cauchy-riemann-fn-const-u');
  const st = await readText(page, '#cauchy-riemann-const-status');
  assert(st.includes("f' = 0") && st.includes('constant'), `${tag}: A3 const status has f' = 0 and constant (got "${st}")`);
  assert(!(await isHidden(page, '#cauchy-riemann-constu')), `${tag}: the u = c controls are visible`);
  assert((await textOf(page, '#cauchy-riemann-problem')).includes('Problem P7'), `${tag}: the callout names P7`);
  assert(!(await isHidden(page, '#cauchy-riemann-polar-note')), `${tag}: the polar note shows for u = c`);

  // 11. A3: the two paths panel
  await clickChip(page, 'cauchy-riemann-paths');
  assert(await attr(page, '#cauchy-riemann-paths', 'aria-expanded') === 'true' && !(await isHidden(page, '#cauchy-riemann-paths-panel')), `${tag}: the panel opens`);
  assert((await textStarts(page, '#cauchy-riemann-ex-same', 'same point: differ')).startsWith('same point: differ'), `${tag}: A3 u = c with v = x + y: same point: differ`);
  await clickChip(page, 'cauchy-riemann-fn-exp');
  assert((await textStarts(page, '#cauchy-riemann-ex-same', 'same point: agree')).startsWith('same point: agree'), `${tag}: A3 exp: same point: agree`);
  await clickChip(page, 'cauchy-riemann-paths');
  assert(await attr(page, '#cauchy-riemann-paths', 'aria-expanded') === 'false' && await isHidden(page, '#cauchy-riemann-paths-panel'), `${tag}: the panel closes`);

  // 12. the side of the square
  const hv = await setSlider(page, 'cauchy-riemann-h', 0.05);
  assert(hv === 0.05 && await textOf(page, '#cauchy-riemann-h-value') === '0.05', `${tag}: h is 0.05`);
  const view = await page.evaluate(() => window.__mv.planes.get('cauchy-riemann-wplane').getView().unitsAcross);
  assert(Math.abs(view - 0.25) < 1e-6, `${tag}: the zoom follows h (unitsAcross ${view})`);
  p = await page.evaluate(() => window.__mv.cauchyRiemann.parts());
  assert(Math.abs(side(p.ghost) - 0.05) < 1e-9, `${tag}: the ghost square has side 0.05`);
  await setSlider(page, 'cauchy-riemann-h', 0.3);

  // 13. back to z0 = 0.5 + 0.8i
  z = await dragHandle(page, Z, { re: 0.5, im: 0.8 });
  assert(z.re === 0.5 && z.im === 0.8, `${tag}: dragged back to exactly 0.5 + 0.8i (got ${z.re}, ${z.im})`);
  assert(await readText(page, '#cauchy-riemann-readout') === CR_EXP, `${tag}: readout back to the 3.2.1 string`);

  // 13b. a negative imaginary part puts the u axis near the top edge: it is held clear of the axis names there
  await dragHandle(page, Z, { re: 0.5, im: -0.8 });
  o = await originPx(page, 'cauchy-riemann-wplane');
  assert(o.x >= 35.5 && o.y >= 21.5 && o.y <= o.h - 21.5, `${tag}: with z0 = 0.5 - 0.8i the axes also stay clear (origin at ${o.x.toFixed(1)}, ${o.y.toFixed(1)} of ${o.w} x ${o.h})`);
  await dragHandle(page, Z, { re: 0.5, im: 0.8 });
  assert(await readText(page, '#cauchy-riemann-readout') === CR_EXP, `${tag}: and back to the 3.2.1 readout`);

  // 14. where f really sends the square
  await page.check('#cauchy-riemann-true');
  await settle(page, 2);
  assert(await page.evaluate(() => window.__mv.cauchyRiemann.parts().truth !== null), `${tag}: the true image is computed`);
  assert((await textOf(page, '#cauchy-riemann-key')).includes('really sends'), `${tag}: the key lists the true image`);
  await page.uncheck('#cauchy-riemann-true');
  await settle(page, 2);

  // 15. keyboard
  await page.focus(`#${Z}`);
  await page.keyboard.press('ArrowRight');
  await settle(page, 2);
  z = await handleZ(page, Z);
  assert(Math.abs(z.re - 0.6) < 1e-9, `${tag}: ArrowRight moves z0 by 0.1 exactly (got ${z.re})`);
  assert((await readText(page, '#cauchy-riemann-readout')).includes('CR holds: yes'), `${tag}: exp still holds after the nudge`);
  await page.keyboard.press('ArrowLeft');
  await settle(page, 2);

  // 16. unmount cleanup
  await page.evaluate(() => { location.hash = '#mappings'; });
  await page.waitForSelector('#station-mappings', { timeout: 5000 });
  await settle(page, 3);
  const gone = await page.evaluate(() => ({
    hook: window.__mv.cauchyRiemann, plane: window.__mv.planes.has('cauchy-riemann-zplane') || window.__mv.planes.has('cauchy-riemann-wplane'),
    mine: document.querySelectorAll('style[data-for="station-cauchy-riemann"]').length,
    other: document.querySelectorAll('style[data-for="station-mappings"]').length,
  }));
  assert(gone.hook === undefined && gone.plane === false && gone.mine === 0 && gone.other === 1, `${tag}: unmount removed the hook, the planes and the style block (${JSON.stringify(gone)})`);
  await page.evaluate(() => { location.hash = '#cauchy-riemann'; });
  await page.waitForSelector('#station-cauchy-riemann', { timeout: 5000 });
  await settle(page, 3);

  await shot('end');
  log('i1-station-mappings-cr: cauchy-riemann suite ok');
}

// ---- P7 ---------------------------------------------------------------------

async function p7Suite(page, ctx) {
  const { assert, log, shot } = ctx;
  const tag = 'P7';
  const R_XY = "A = 0.5 + 0.5i; |B| = 0.707; CR holds: no; f' does not exist here";
  const R_3 = "A = 0; |B| = 0.000; CR holds: yes; f'(z0) = 0 (u_x + i v_x)";
  const R_X2 = "A = 0.5i; |B| = 0.500; CR holds: no; f' does not exist here";
  const ok = (n) => attr(page, `#cauchy-riemann-proof-${n}`, 'data-ok');

  // 1. the default state of the P7 deep link
  await settle(page, 3);
  assert(await attr(page, '#cauchy-riemann-fn-const-u', 'aria-pressed') === 'true', `${tag}: the u = c chip is pressed at load`);
  assert((await textOf(page, '#cauchy-riemann-problem')).includes('Problem P7'), `${tag}: the callout names P7`);
  const st = await readText(page, '#cauchy-riemann-const-status');
  assert(st.includes("f' = 0") && st.includes('constant'), `${tag}: the status has f' = 0 and constant (got "${st}")`);
  assert(await readText(page, '#cauchy-riemann-readout') === R_XY, `${tag}: readout for v = x + y`);
  const marks = [await ok(1), await ok(2), await ok(3), await ok(4)];
  assert(marks.join(',') === 'yes,no,no,no', `${tag}: proof lines are yes,no,no,no (got ${marks})`);

  // 2. a constant v: CR holds everywhere, f' = 0
  await page.fill('#cauchy-riemann-v', '3');
  await settle(page, 3);
  assert(await readText(page, '#cauchy-riemann-readout') === R_3, `${tag}: readout for v = 3 (got "${await readText(page, '#cauchy-riemann-readout')}")`);
  const marks3 = [await ok(1), await ok(2), await ok(3), await ok(4)];
  assert(marks3.every((m) => m === 'yes'), `${tag}: every proof line holds for v = 3 (got ${marks3})`);
  assert((await readText(page, '#cauchy-riemann-const-status')).includes('2 + 3i'), `${tag}: the status names the constant 2 + 3i`);
  assert(await isHidden(page, '#cauchy-riemann-v-error'), `${tag}: no error for v = 3`);

  // 3. a parse error keeps the last good function
  await page.fill('#cauchy-riemann-v', 'x +');
  await settle(page, 2);
  assert(!(await isHidden(page, '#cauchy-riemann-v-error')) && (await readText(page, '#cauchy-riemann-v-error')) !== '', `${tag}: the parse error shows`);
  assert(await page.evaluate(() => !!document.querySelector('#cauchy-riemann-v-error pre.cr-caret')), `${tag}: the error carries a caret line`);
  assert(await attr(page, '#cauchy-riemann-v', 'aria-invalid') === 'true', `${tag}: aria-invalid is set`);
  assert(await readText(page, '#cauchy-riemann-readout') === R_3, `${tag}: the readout keeps the last valid function`);

  // 4. a complex v is refused with its own message
  await page.fill('#cauchy-riemann-v', 'x + i*y');
  await settle(page, 2);
  assert((await readText(page, '#cauchy-riemann-v-error')).includes('real'), `${tag}: the "real number" message shows`);
  assert(await readText(page, '#cauchy-riemann-readout') === R_3, `${tag}: the readout is unchanged`);

  // 5. a preset chip
  await clickChip(page, 'cauchy-riemann-vpreset-x2');
  assert(await page.inputValue('#cauchy-riemann-v') === 'x^2', `${tag}: the preset writes x^2`);
  assert(await readText(page, '#cauchy-riemann-readout') === R_X2, `${tag}: readout for v = x^2 (got "${await readText(page, '#cauchy-riemann-readout')}")`);
  assert(await isHidden(page, '#cauchy-riemann-v-error') && await attr(page, '#cauchy-riemann-v', 'aria-invalid') === null, `${tag}: the error clears`);

  // 6. the image of the square is a segment on Re w = c, whatever c is
  await clickChip(page, 'cauchy-riemann-vpreset-xy');
  let p = await page.evaluate(() => window.__mv.cauchyRiemann.parts());
  assert(p.image.every((q) => Math.abs(q.re - 2) < 1e-9), `${tag}: the image lies on Re w = 2`);
  await page.fill('#cauchy-riemann-c', '5');
  await settle(page, 3);
  p = await page.evaluate(() => window.__mv.cauchyRiemann.parts());
  assert(p.image.every((q) => Math.abs(q.re - 5) < 1e-9), `${tag}: the image lies on Re w = 5 after editing c`);
  assert(await readText(page, '#cauchy-riemann-readout') === R_XY, `${tag}: A does not depend on c`);

  // 7. a typed v with no value at z0 (1/x on x = 0): the readout and every A/B cell say undefined, none prints the polar form of NaN
  await page.fill('#cauchy-riemann-v', '1/x');
  await settle(page, 2);
  await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0, im: 0.5 });
  assert(await readText(page, '#cauchy-riemann-readout') === "A = undefined; |B| = undefined; CR holds: no; f' does not exist here", `${tag}: the undefined readout (got "${await readText(page, '#cauchy-riemann-readout')}")`);
  await until(page, () => cell(page, 'cauchy-riemann-ab-A-polar'), (cc) => !!cc && cc.tex.includes('undefined'));
  for (const id of ['cauchy-riemann-ab-A-cart', 'cauchy-riemann-ab-A-polar', 'cauchy-riemann-ab-B-cart', 'cauchy-riemann-ab-B-polar', 'cauchy-riemann-ab-fprime-polar']) {
    const cc = await cell(page, id);
    assert(cc && (cc.tex.includes('undefined') || cc.tex.includes('doesnotexist') || cc.tex.includes('\\text{doesnotexist}')), `${tag}: ${id} says undefined or does not exist (got ${JSON.stringify(cc)})`);
    assert(!/NaN|undefinede|e\^\{i/.test(cc.tex + cc.text), `${tag}: ${id} does not print a polar form of NaN (got ${JSON.stringify(cc)})`);
  }
  const sameText = await readText(page, '#cauchy-riemann-ab-same');
  assert(!/NaN|undefined\s*e/.test(sameText) && sameText.startsWith('same point: not checked'), `${tag}: the A footer says not checked, with no garbage (got "${sameText}")`);
  await clickChip(page, 'cauchy-riemann-vpreset-xy');
  await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0.5, im: 0.8 });
  assert(await readText(page, '#cauchy-riemann-readout') === R_XY, `${tag}: back to a defined v`);

  await shot('end');
  log('i1-station-mappings-cr: P7 suite ok');
}
