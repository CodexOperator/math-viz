// tests/interact/i1-station-mappings-cr.mjs
// Interaction script for the stations `mappings` and `cauchy-riemann` (goal i1-station-mappings-cr).
// Run:  node tools/smoke.mjs --route problem-2-1-1 --script tests/interact/i1-station-mappings-cr.mjs
//       node tools/smoke.mjs --route problem-3-2-1 --script tests/interact/i1-station-mappings-cr.mjs
//       node tools/smoke.mjs --route problem-P7   --script tests/interact/i1-station-mappings-cr.mjs
// One file serves all routes: it branches on ctx.route. A2, A3 mark the exact acceptance expectations.

// Residue round adds: mappings 4b (the w-plane drop lines are named u and v by plane.js, the z-plane keeps x and y), 4c (the carried
// Cartesian grid is an obstacle: the Arg and drop-line words are not printed across its lines), 4d (neighbour links have no caret and
// one flex item); cauchy-riemann 1b/13b (the w view is centred on f(z0) and no tick number or axis name is struck by an axis),
// 6b (the verdict has real superscripts), 6c (heading before its lead, two-planes, the badge leads its CR line), 6d (the Arg A block
// is clear of the arc, the ray and the ring, at every state of a sweep), 6e (the key follows what is drawn); P7 4b to 4d (the empty
// and the complex v messages), 7b (a huge finite v prints |B| in exponent form and says "off the scale").

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

// Every word a plane draws, with its canvas box: { text, x0, x1, y0, y1 } (y is the middle of the line, boxes are 14 px tall).
const recordWords = (page, planeId) => page.evaluate((id) => new Promise((resolve) => {
  const plane = window.__mv.planes.get(id);
  const c = plane.canvas.getContext('2d');
  const seen = [];
  const fill = c.fillText;
  c.fillText = function (t, x, y, ...a) {
    const w = c.measureText(String(t)).width, al = c.textAlign;
    const x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
    seen.push({ text: String(t), x0, x1: x0 + w, y0: y - 7, y1: y + 7 });
    return fill.call(c, t, x, y, ...a);
  };
  plane.requestDraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { delete c.fillText; resolve(seen); }));
}), planeId);
const isNumber = (t) => /^-?\d+(\.\d+)?$/.test(t);
const hitsBox = (a, b, bx, pad = 0) => {                                      // does the segment a-b pass through the box (grown by pad)?
  const x0 = bx.x0 - pad, x1 = bx.x1 + pad, y0 = bx.y0 - pad, y1 = bx.y1 + pad;
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [pp, q] of [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]]) {
    if (pp === 0) { if (q < 0) return false; } else {
      const r = q / pp;
      if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
  }
  return t0 <= t1;
};
// How many carried grid pieces of the mappings w-plane pass through each non-number word.
async function gridCrossings(page) {
  const words = await recordWords(page, 'mappings-wplane');
  const px = await page.evaluate(() => { const pl = window.__mv.planes.get('mappings-wplane'); return window.__mv.mappings.pieces().map((pc) => pc.map((q) => pl.toPixel(q))); });
  const out = {};
  for (const wd of words) {
    if (isNumber(wd.text)) continue;
    let n = 0;
    for (const pc of px) {
      for (let i = 1; i < pc.length; i++) {
        if (![pc[i - 1].x, pc[i - 1].y, pc[i].x, pc[i].y].every(Number.isFinite)) continue;
        if (hitsBox(pc[i - 1], pc[i], wd)) { n++; break; }
      }
    }
    out[wd.text] = n;
  }
  return out;
}

// distance between the w view's centre and f(z0)
const wCentreError = (page) => page.evaluate(() => { const v = window.__mv.planes.get('cauchy-riemann-wplane').getView(), q = window.__mv.cauchyRiemann.parts().fz0; return Math.hypot(v.center.re - q.re, v.center.im - q.im); });
// no number or axis name of the CR w-plane is struck by its own axes ('0' sits at the corner by design)
async function axesClear(page, assert, tag) {
  const words = await recordWords(page, 'cauchy-riemann-wplane');
  const O = await page.evaluate(() => window.__mv.planes.get('cauchy-riemann-wplane').toPixel({ re: 0, im: 0 }));
  const sz = await page.evaluate(() => window.__mv.planes.get('cauchy-riemann-wplane').getSize());
  for (const wd of words) {
    if (!(isNumber(wd.text) || wd.text === 'u' || wd.text === 'v') || wd.text === '0') continue;
    if (wd.y1 < 0 || wd.y0 > sz.h || wd.x1 < 0 || wd.x0 > sz.w) continue;                 // not on the canvas
    // A number or a name is never struck by ITS OWN axis. The name 'v' (top of the imaginary axis) can still touch the real axis when that
    // runs within about 14 px of the top edge, and 'u' the imaginary axis at the right edge: plane.js places names against their own axis only
    // (reported to the plane owner in the residue report), so a name is not held to the other axis here.
    const struckH = O.y > wd.y0 + 1 && O.y < wd.y1 - 1 && O.y >= 0 && O.y <= sz.h && wd.text !== 'v';
    const struckV = O.x > wd.x0 + 1 && O.x < wd.x1 - 1 && O.x >= 0 && O.x <= sz.w && wd.text !== 'u';
    assert(!struckH && !struckV, `${tag}: "${wd.text}" is not struck by an axis (origin at ${O.x.toFixed(0)}, ${O.y.toFixed(0)}; word ${wd.x0.toFixed(0)}..${wd.x1.toFixed(0)} x ${wd.y0.toFixed(0)}..${wd.y1.toFixed(0)})`);
  }
}
// The Arg A block (two lines) is clear of the arc, the faint winding and the dashed ray at the current state.
async function argBlockClear(page, assert, tag) {
  const g = await page.evaluate(() => {
    const pl = window.__mv.planes.get('cauchy-riemann-wplane'), st = window.__mv.cauchyRiemann.state(), q = window.__mv.cauchyRiemann.parts();
    if (!st.report.finite || st.report.spin === null || Math.abs(st.report.spin) <= 0.02) return null;
    const v = pl.getView(), R = 0.3 * v.unitsAcross, spin = st.report.spin, end = spin + (spin >= 0 ? 2 : -2) * Math.PI;
    const pts = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => pl.toPixel({ re: q.fz0.re + r * Math.cos(a0 + (a1 - a0) * i / n), im: q.fz0.im + r * Math.sin(a0 + (a1 - a0) * i / n) }));
    return { arc: pts(R, 0, spin, 60), ring: pts(1.12 * R, 0, end, 160), ray: [pl.toPixel(q.fz0), pl.toPixel({ re: q.fz0.re + R, im: q.fz0.im })], spin };
  });
  if (!g) return false;
  const words = (await recordWords(page, 'cauchy-riemann-wplane')).filter((x) => /^(Arg A =|also )/.test(x.text));
  assert(words.length === 2, `${tag}: the Arg A block has two lines (got ${JSON.stringify(words.map((x) => x.text))})`);
  for (const wd of words) {
    for (const [name, poly] of [['arc', g.arc], ['ring', g.ring]]) {
      for (let i = 1; i < poly.length; i++) {
        assert(!hitsBox(poly[i - 1], poly[i], wd, 1), `${tag}: "${wd.text}" is not over the ${name} (spin ${g.spin.toFixed(3)}, word ${wd.x0.toFixed(0)}..${wd.x1.toFixed(0)} x ${wd.y0.toFixed(0)}..${wd.y1.toFixed(0)})`);
      }
    }
    assert(!hitsBox(g.ray[0], g.ray[1], wd, 1), `${tag}: "${wd.text}" is not over the dashed ray`);
  }
  return true;
}

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

  // 4b. the w-plane names its drop lines u and v through plane.js's names option (placed by plane.js); the z-plane keeps x and y
  {
    const wt = (await recordWords(page, 'mappings-wplane')).map((x) => x.text), zt = (await recordWords(page, 'mappings-zplane')).map((x) => x.text);
    assert(wt.includes('u = -1') && wt.includes('v = 3'), `${tag}: 4b the w-plane reads "u = -1" and "v = 3" (got ${JSON.stringify(wt.filter((t) => /^[uvxy] =/.test(t)))})`);
    assert(!wt.some((t) => /^[xy] = /.test(t)), `${tag}: 4b no "x = " or "y = " on the w-plane`);
    assert(zt.includes('x = 1') && zt.includes('y = 1') && !zt.some((t) => /^[uv] = /.test(t)), `${tag}: 4b the z-plane keeps "x = 1" and "y = 1"`);
  }

  // 4c. the carried Cartesian grid is an obstacle for the plane's words: the Arg block and the drop-line words are not printed across its
  // lines where a free spot exists. Counted in canvas pixels at the three states of the review (before: 2 to 4 pieces through Arg w and also).
  for (const [zz, name] of [[{ re: 1, im: 1 }, '1 + i'], [{ re: 0.3, im: 0.4 }, '0.3 + 0.4i'], [{ re: -1, im: 0 }, '-1']]) {
    await dragHandle(page, 'mappings-zplane-z', zz);
    await settle(page, 3);
    const cr = await gridCrossings(page);
    for (const [wd, n] of Object.entries(cr)) {
      if (/^(Arg w|also)/.test(wd)) assert(n === 0, `${tag}: 4c at ${name} "${wd}" has no grid line through it (${n})`);
      if (/^[uv] = /.test(wd)) assert(n <= 1, `${tag}: 4c at ${name} "${wd}" has at most one grid line through it (${n})`);
    }
  }
  await dragHandle(page, 'mappings-zplane-z', { re: 1, im: 1 });

  // 4d. the neighbour links: one flex item each, no caret (a thread neighbour can be "z^n: Fans and Parabolas")
  const links = await page.evaluate(() => [...document.querySelectorAll('#station-mappings .station-link')].map((a) => ({ children: a.children.length, caret: a.textContent.includes('^'), text: a.textContent })));
  assert(links.length >= 2 && links.every((l) => l.children === 1 && !l.caret), `${tag}: 4d each neighbour link has one child and no caret (${JSON.stringify(links)})`);

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

const CR_EXP = "A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)";

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
  // 1b. the w view is centred on f(z0), whatever the axes do (plane.js keeps the numbers off an axis near the edge; the station no longer shifts
  // the picture, which made it jump by up to 36 px as an axis crossed the edge), and no tick number or axis name is struck by an axis
  assert(await wCentreError(page) < 1e-9, `${tag}: 1b the w-plane is centred on f(z₀) (off by ${await wCentreError(page)})`);
  await axesClear(page, assert, `${tag} 1b default`);
  assert(await page.evaluate(() => !!document.querySelector('#station-cauchy-riemann .two-planes #cauchy-riemann-zplane-viewport') && !document.querySelector('#station-cauchy-riemann .cr-main')), `${tag}: 1b the planes sit in the shell's .two-planes`);

  // 2. A3: both tests hold, with the residuals
  assert(await attr(page, '#cauchy-riemann-cr1', 'data-holds') === 'yes' && await attr(page, '#cauchy-riemann-cr2', 'data-holds') === 'yes', `${tag}: A3 both CR lines hold for exp`);
  assert((await readText(page, '#cauchy-riemann-cr1')).startsWith('u_x = v_y: 1.149 vs 1.149, residual 0.000'), `${tag}: cr1 text`);
  assert((await readText(page, '#cauchy-riemann-cr2')).startsWith('u_y = -v_x: -1.183 vs -1.183, residual 0.000'), `${tag}: cr2 text`);

  // 3. A3: the readout, exactly and numerically
  let r = await readText(page, '#cauchy-riemann-readout');
  assert(r === CR_EXP, `${tag}: A3 readout is exact (got "${r}")`);
  assert(r.includes('CR holds: yes') && r.includes('|B| = 0.000'), `${tag}: readout has CR holds: yes and |B| = 0.000`);
  const fp = parseCart(r.slice(r.indexOf("f′(z₀) = ") + "f′(z₀) = ".length, r.indexOf(' (u_x')));
  assert(fp && Math.abs(fp.re - 1.149) < 1e-3 && Math.abs(fp.im - 1.183) < 1e-3, `${tag}: A3 f′(z₀) is 1.149 + 1.183i within 0.001 (got ${JSON.stringify(fp)})`);

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
  assert(maxDist(p.B, p.B.map(() => p.fz0)) < 1e-9, `${tag}: the B part collapses onto f(z₀)`);
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

  // 6a. the polar note on 3.2.1 treats arg f as a set (data fix by the data owner, rendered verbatim here): a name for arg f, a continuous
  // choice V = y, and no derivative of the set arg f as if it were a number
  const pn = await readText(page, '#cauchy-riemann-polar-note');
  assert(pn.includes('y is a name for arg f') && pn.includes('a continuous choice of arg f') && !pn.includes('(arg f)') && !pn.includes('arg f = y'), `${tag}: 6a the polar note never differentiates or equates the set arg f (got "${pn}")`);

  // 6a2. the chip "e^x(cos y + i sin y)" is one flex item: the x is raised and sits against the e (a .chip is inline-flex)
  const chipSup = await page.evaluate(() => {
    const b = document.getElementById('cauchy-riemann-fn-exp'), s = b.querySelector('sup'), before = s.previousSibling;
    const r1 = document.createRange(); r1.selectNodeContents(before);
    const er = [...r1.getClientRects()].pop(), nr = s.getBoundingClientRect();
    return { children: b.children.length, gap: nr.left - er.right, raised: (er.top + er.bottom) / 2 - (nr.top + nr.bottom) / 2 };
  });
  assert(chipSup.children === 1 && chipSup.gap < 2.5 && chipSup.raised > 2, `${tag}: 6a2 the exp chip shows a raised x against the e (${JSON.stringify(chipSup)})`);

  // 6b. the verdict goes through prose(): e^x has a real superscript, as the chip note beside it does
  const vd = await page.evaluate(() => { const e = document.getElementById('cauchy-riemann-verdict'); return { sups: [...e.querySelectorAll('sup')].map((x) => x.textContent), text: e.textContent }; });
  assert(vd.sups.length >= 2 && vd.sups.every((t) => t === 'x') && !vd.text.includes('^') && vd.text.includes('e' + 'x cos y'), `${tag}: 6b the verdict shows e with a superscript x, no caret (${JSON.stringify(vd)})`);

  // 6c. the Jacobian heading comes before its lead paragraph, and labels the table; the CR lines lead with their badge on one row
  const order = await page.evaluate(() => {
    const t = document.getElementById('cauchy-riemann-jac-title'), lead = document.querySelector('#cauchy-riemann-jac-title ~ .cr-lead'), tb = document.getElementById('cauchy-riemann-jac');
    const line = document.getElementById('cauchy-riemann-cr1'), badge = line.querySelector('.badge');
    const lr = line.getBoundingClientRect(), br = badge.getBoundingClientRect();
    return { titleFirst: !!lead && (t.compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0, labelled: tb.getAttribute('aria-labelledby') === 't'.concat('', '') || tb.getAttribute('aria-labelledby') === 'cauchy-riemann-jac-title', caption: tb.querySelectorAll('caption').length,
             badgeTop: br.top - lr.top, badgeLeft: br.left - lr.left, lineH: lr.height };
  });
  assert(order.titleFirst && order.labelled && order.caption === 0, `${tag}: 6c the Jacobian heading precedes its lead and labels the table (${JSON.stringify(order)})`);
  assert(order.badgeTop < 12 && order.badgeLeft < 4, `${tag}: 6c the holds badge leads the CR line on the first row (${JSON.stringify(order)})`);

  // 6d. the Arg A block sits outside the arc, the ring and the ray, over a sweep of points and two functions (the review saw it over the arc head on a phone)
  let checked = 0;
  for (const zz of [{ re: 0.5, im: 0.8 }, { re: 0.5, im: -0.8 }, { re: -1.5, im: 0.2 }, { re: 0.1, im: 0.1 }, { re: 1.9, im: -1.9 }, { re: -1.9, im: 1.9 }, { re: -1.2, im: -1.2 }, { re: 1.5, im: 1.5 }]) {
    await dragHandle(page, Z, zz);
    await settle(page, 3);
    if (await argBlockClear(page, assert, `${tag} 6d exp at ${zz.re}, ${zz.im}`)) checked++;
    await axesClear(page, assert, `${tag} 6d exp at ${zz.re}, ${zz.im}`);
    assert(await wCentreError(page) < 1e-9, `${tag}: 6d the view stays centred on f(z₀) at ${zz.re}, ${zz.im}`);
  }
  await clickChip(page, 'cauchy-riemann-fn-sq-plus-z');
  for (const zz of [{ re: 0.5, im: 0.8 }, { re: -1.5, im: 0.2 }, { re: 0.3, im: -0.9 }, { re: -0.5, im: 0 }]) {
    await dragHandle(page, Z, zz);
    await settle(page, 3);
    if (await argBlockClear(page, assert, `${tag} 6d z^2 + z at ${zz.re}, ${zz.im}`)) checked++;
  }
  assert(checked >= 8, `${tag}: 6d the sweep reached at least 8 states with an arc (got ${checked})`);
  await clickChip(page, 'cauchy-riemann-fn-exp');
  await dragHandle(page, Z, { re: 0.5, im: 0.8 });

  // 7. A3: |z|^2 at 1 + i
  await clickChip(page, 'cauchy-riemann-fn-abs2');
  let z = await dragHandle(page, Z, { re: 1, im: 1 });
  assert(z.re === 1 && z.im === 1, `${tag}: drag lands exactly on 1 + i (got ${z.re}, ${z.im})`);
  r = await readText(page, '#cauchy-riemann-readout');
  assert(r === "A = 1 - i; |B| = 1.414; CR holds: no; f′ does not exist here", `${tag}: A3 readout for |z|^2 at 1 + i (got "${r}")`);
  assert(r.includes('A = 1 - i') && r.includes('|B| = 1.414') && r.includes('does not exist'), `${tag}: readout has the three pieces`);
  assert(await page.evaluate(() => document.querySelectorAll('[data-holds="no"]').length) === 2, `${tag}: both CR lines fail for |z|^2 at 1 + i`);
  p = await page.evaluate(() => window.__mv.cauchyRiemann.parts());
  assert(maxDist(p.B, p.B.map(() => p.fz0)) > 0.1, `${tag}: the B part is not collapsed`);
  assert((await textOf(page, '#cauchy-riemann-key')).includes('B part'), `${tag}: the key lists the B part`);
  assert(await isHidden(page, '#cauchy-riemann-problem'), `${tag}: no problem callout for |z|^2 (3.1.2 belongs to the derivative station)`);

  // 8. A3: |z|^2 at 0
  await dragHandle(page, Z, { re: 0, im: 0 });
  r = await readText(page, '#cauchy-riemann-readout');
  assert(r === "A = 0; |B| = 0.000; CR holds: yes; f′(z₀) = 0 (u_x + i v_x)", `${tag}: A3 readout for |z|^2 at 0 (got "${r}")`);
  assert(r.includes('|B| = 0.000') && r.includes("f′(z₀) = 0"), `${tag}: readout has |B| = 0.000 and f′(z₀) = 0`);
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

  // 13b. a negative imaginary part puts the u axis near the top edge: the numbers and names are still clear of the axes, the view still centred
  await dragHandle(page, Z, { re: 0.5, im: -0.8 });
  assert(await wCentreError(page) < 1e-9, `${tag}: 13b with z₀ = 0.5 - 0.8i the view is centred on f(z₀)`);
  await axesClear(page, assert, `${tag} 13b`);
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
  assert(Math.abs(z.re - 0.6) < 1e-9, `${tag}: ArrowRight moves z₀ by 0.1 exactly (got ${z.re})`);
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
  const R_XY = "A = 0.5 + 0.5i; |B| = 0.707; CR holds: no; f′ does not exist here";
  const R_3 = "A = 0; |B| = 0.000; CR holds: yes; f′(z₀) = 0 (u_x + i v_x)";
  const R_X2 = "A = 0.5i; |B| = 0.500; CR holds: no; f′ does not exist here";
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

  // 4b. a v that is real-looking but not real at every point (no i typed) gets its own message, not "Remove the i"
  await page.fill('#cauchy-riemann-v', 'sqrt(x)');
  await settle(page, 2);
  const m2 = await readText(page, '#cauchy-riemann-v-error');
  assert(m2.includes('complex number at some points') && !m2.includes('Remove the i'), `${tag}: 4b sqrt(x) is refused without telling the student to remove an i (got "${m2}")`);
  assert(await readText(page, '#cauchy-riemann-readout') === R_3, `${tag}: 4b the readout is unchanged`);
  // 4c. an empty box is not a parser error in z
  await page.fill('#cauchy-riemann-v', '');
  await settle(page, 2);
  const m3 = await readText(page, '#cauchy-riemann-v-error');
  assert(m3 === 'Type a real formula in x and y, such as x + y.', `${tag}: 4c the empty box says what to type (got "${m3}")`);
  assert(!(await page.evaluate(() => !!document.querySelector('#cauchy-riemann-v-error pre.cr-caret'))), `${tag}: 4c no caret line for an empty box`);
  // 4d. i typed as 2i or inside a function is still named
  await page.fill('#cauchy-riemann-v', 'x + 2i');
  await settle(page, 2);
  assert((await readText(page, '#cauchy-riemann-v-error')).includes('Remove the i'), `${tag}: 4d "x + 2i" has an i to remove`);
  await page.fill('#cauchy-riemann-v', '3');
  await settle(page, 2);

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
  assert(await readText(page, '#cauchy-riemann-readout') === "A = undefined; |B| = undefined; CR holds: no; f′ does not exist here", `${tag}: the undefined readout (got "${await readText(page, '#cauchy-riemann-readout')}")`);
  await until(page, () => cell(page, 'cauchy-riemann-ab-A-polar'), (cc) => !!cc && cc.tex.includes('undefined'));
  for (const id of ['cauchy-riemann-ab-A-cart', 'cauchy-riemann-ab-A-polar', 'cauchy-riemann-ab-B-cart', 'cauchy-riemann-ab-B-polar', 'cauchy-riemann-ab-fprime-polar']) {
    const cc = await cell(page, id);
    assert(cc && (cc.tex.includes('undefined') || cc.tex.includes('doesnotexist') || cc.tex.includes('\\text{doesnotexist}')), `${tag}: ${id} says undefined or does not exist (got ${JSON.stringify(cc)})`);
    assert(!/NaN|undefinede|e\^\{i/.test(cc.tex + cc.text), `${tag}: ${id} does not print a polar form of NaN (got ${JSON.stringify(cc)})`);
  }
  const sameText = await readText(page, '#cauchy-riemann-ab-same');
  assert(!/NaN|undefined\s*e/.test(sameText) && sameText.startsWith('same point: not checked'), `${tag}: the A footer says not checked, with no garbage (got "${sameText}")`);
  // 7a. the key lists only what is drawn: with no value for f at z0 nothing of the square is drawn, and the key says so
  const keyText = await readText(page, '#cauchy-riemann-key');
  assert(keyText === 'Nothing is drawn: f has no value at z\u2080.' && await page.evaluate(() => document.querySelectorAll('#cauchy-riemann-key .cr-swatch').length) === 0, `${tag}: 7a the key says nothing is drawn when f is undefined at z₀ (got "${keyText}")`);
  await page.check('#cauchy-riemann-true');
  await settle(page, 2);
  assert((await readText(page, '#cauchy-riemann-key')).includes('really sends') && !(await readText(page, '#cauchy-riemann-key')).includes('square as it was'), `${tag}: 7a with the true image on, only that line is listed`);
  await page.uncheck('#cauchy-riemann-true');
  await clickChip(page, 'cauchy-riemann-vpreset-xy');
  await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0.5, im: 0.8 });
  assert(await readText(page, '#cauchy-riemann-readout') === R_XY, `${tag}: back to a defined v`);
  const keyBack = await readText(page, '#cauchy-riemann-key');
  assert(keyBack.includes('The square as it was') && keyBack.includes('Image of the square'), `${tag}: 7a the key lists the square and its image again (got "${keyBack}")`);

  // 7b. a typed v that is huge but finite (exp(30 * x) at x = 1.9 gives 5.7e24): |B| prints in exponent form, never as 17 digits, and the
  // caption says f(z0) is off the scale, because the plane clamps its view at 1e6 units and f(z0) is nowhere near it
  await page.fill('#cauchy-riemann-v', 'exp(30*x)');
  await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 1.9, im: 0.5 });
  await settle(page, 3);
  const big = await readText(page, '#cauchy-riemann-readout');
  assert(/\|B\| = \d\.\d{1,3}×10²[⁰-⁹];/.test(big) && !/\d{9,}/.test(big.replace(/×10[¹²³⁰-⁹⁻]+/g, '')), `${tag}: 7b |B| is in exponent form (got "${big}")`);
  assert(/residual \d\.\d{1,3}×10[¹²³⁰-⁹]/.test(await readText(page, '#cauchy-riemann-cr1') + await readText(page, '#cauchy-riemann-cr2')), `${tag}: 7b a residual is in exponent form too`);
  const bigCap = await readText(page, '#cauchy-riemann-wcap');
  assert(bigCap.includes('Off the scale') && !bigCap.includes('One grid square'), `${tag}: 7b the caption says off the scale (got "${bigCap}")`);
  await page.fill('#cauchy-riemann-v', 'x + y');
  await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0.5, im: 0.8 });
  const okCap = await readText(page, '#cauchy-riemann-wcap');
  assert(!okCap.includes('Off the scale') && okCap.includes('One grid square'), `${tag}: 7b back to a visible picture, the caption is the normal one (got "${okCap}")`);

  await shot('end');
  log('i1-station-mappings-cr: P7 suite ok');
}
