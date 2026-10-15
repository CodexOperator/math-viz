// tests/interact/i1-station-limits-derivative.mjs
// Acceptance A1 to A4 of goal i1-station-limits-derivative (docs/designs/iter-1/i1-station-limits-derivative.md section 7.2).
//   node tools/smoke.mjs --route problem-2-3-1 --script tests/interact/i1-station-limits-derivative.mjs --dark
//   node tools/smoke.mjs --route problem-P5    --script tests/interact/i1-station-limits-derivative.mjs --dark
//   node tools/smoke.mjs --route problem-3-1-1 --script tests/interact/i1-station-limits-derivative.mjs --dark
//   node tools/smoke.mjs --route problem-3-1-2 --script tests/interact/i1-station-limits-derivative.mjs --dark
//   node tools/smoke.mjs --route problem-P6    --script tests/interact/i1-station-limits-derivative.mjs --dark
// One default export that branches on ctx.route (limits and derivative run the same steps as their first problem).
// Iteration 1 cleanup (residue S6) added: every word on the planes sits clear of what the plane knows (the stations expose which
// words did through window.__mv.<station>.state().words), z0 stays in view when the z-plane zooms, the copy never says left or right
// (the planes are stacked on a phone), and the station stylesheet goes when the station does.

import { clickChip, dragHandle, readText, setSlider, parseCart, settle, readHandleLabel } from './_helpers.mjs';
import { segmentHitsBox } from '../../js/core/plane.js';
import * as LIM from '../../js/stations/limits.js';
import * as DER from '../../js/stations/derivative.js';

const stationOf = (page) => page.evaluate(() => document.querySelector('#view').dataset.station);
const viewState = (page) => page.evaluate(() => document.querySelector('#view').dataset.state);
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const planeIds = (page) => page.evaluate(() => [...window.__mv.planes.keys()]);

// Every word a station printed in the last frame: { plane: { text: true when it sat clear } }. Returns the ones that did not, minus `allow`.
async function uncleanWords(page, station, allow = []) {
  await settle(page, 4);
  const words = await page.evaluate((st) => window.__mv[st].state().words, station);
  return Object.entries(words).flatMap(([pl, o]) => Object.entries(o).filter(([t, ok]) => !ok && !allow.some((re) => re.test(t))).map(([t]) => `${pl}: ${t}`));
}
// ---- where the words really are: every fillText of the planes' canvases is recorded, and the box of each word is held against the
// curves it is meant to keep off (the stations only report that a word "sat clear" of what they registered; this checks the registration).
async function recordWords(page) {
  await page.evaluate(() => {
    if (window.__words) return;
    window.__words = [];
    const f = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, x, y, ...r) {
      try { window.__words.push({ t: String(t), x, y, align: this.textAlign, base: this.textBaseline, w: this.measureText(String(t)).width, fs: parseFloat(this.font) || 13, canvas: this.canvas && this.canvas.id }); } catch (e) { /* recording only */ }
      return f.call(this, t, x, y, ...r);
    };
  });
}
// The words of one plane's last frame as boxes in canvas pixels (the same rectangle plane.js records for a word).
async function wordBoxes(page, planeId) {
  await page.evaluate((id) => { window.__words.length = 0; window.__mv.planes.get(id).requestDraw(); }, planeId);
  await settle(page, 4);
  const ws = await page.evaluate((id) => window.__words.filter((w) => w.canvas === id + '-canvas'), planeId);
  return ws.map((w) => {
    const x0 = w.align === 'left' ? w.x : w.align === 'center' ? w.x - w.w / 2 : w.x - w.w;
    const mid = w.base === 'middle';
    return { text: w.t, x0, x1: x0 + w.w, y0: mid ? w.y - w.fs / 2 - 2 : w.y - w.fs + 1, y1: mid ? w.y + w.fs / 2 + 2 : w.y + 4 };
  });
}
const toPixels = (page, planeId, pts) => page.evaluate(([id, list]) => list.map((z) => window.__mv.planes.get(id).toPixel(z)), [planeId, pts]);
// The first chord of any of the polylines that runs through the box, or null.
function crossing(box, polylines) {
  for (const [name, pts] of Object.entries(polylines)) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      if (Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(b.x) && Number.isFinite(b.y) && segmentHitsBox(a, b, box, 0)) return `${name} chord ${i}`;
    }
  }
  return null;
}
// For every word of `texts` (a RegExp) in the plane's last frame: no curve runs through it. `curves` is { name: [plane points] }.
async function assertWordsOffCurves(page, ctx, planeId, texts, curves, where) {
  const px = {};
  for (const [name, pts] of Object.entries(curves)) px[name] = await toPixels(page, planeId, pts);
  const boxes = (await wordBoxes(page, planeId)).filter((b) => texts.test(b.text));
  ctx.assert(boxes.length > 0, `${where}: found the words ${texts} on ${planeId}`);
  for (const b of boxes) {
    const hit = crossing(b, px);
    ctx.assert(!hit, `${where}: "${b.text}" on ${planeId} has ${hit} running through it`);
  }
}

const ang = (t, r = 1) => ({ re: r * Math.cos(t), im: r * Math.sin(t) });
const circlePts = (center, r, n = 128) => Array.from({ length: n + 1 }, (_, k) => ({ re: center.re + r * Math.cos((2 * Math.PI * k) / n), im: center.im + r * Math.sin((2 * Math.PI * k) / n) }));

// Limits: the words of the z-plane keep off the path and the two rays, those of the w-plane off the trace and the circle of values.
async function limitsWordsOffCurves(page, ctx, where) {
  await recordWords(page);
  const S = await page.evaluate(() => window.__mv.limits.state());
  const pathPts = LIM.pathCurve(S.path, { m: S.m }), f = DER.compiledFn(S.fnId);
  const theta = Math.atan2(S.z.im, S.z.re), O = { re: 0, im: 0 };
  const rays = { argRay: [O, ang(theta, 40)] };
  if (S.alphaStar !== null) rays.guide = [O, ang(S.alphaStar, 40)];
  if (Object.values(S.words.z).every(Boolean)) await assertWordsOffCurves(page, ctx, 'limits-zplane', /^(g undefined|undefined|Arg z)/, { path: pathPts, ...rays }, where);
  const circle = LIM.directionalCircle(S.fnId).values.map((v) => v.w);
  if (Object.values(S.words.w).every(Boolean)) {
    await assertWordsOffCurves(page, ctx, 'limits-wplane', /^(limit|centre)/, { trace: LIM.imageCurve(f, pathPts), circle: [...circle, circle[0]] }, where);
  }
}
// The epsilon-delta planes: the target's name and "touches here" keep off the image of the delta-circle and the target's own circle;
// the puncture's word and "z0 = 1" off the delta-disk's circle.
async function edWordsOffCurves(page, ctx, where) {
  await recordWords(page);
  const S = await page.evaluate(() => window.__mv.limits.state());
  const sq = S.edMode === 'sq', r = sq ? LIM.epsDelta('sq', S.eps).delta : 0.4;
  const image = Array.from({ length: 129 }, (_, k) => {
    const h = ang((2 * Math.PI * k) / 128, r);
    return sq ? { re: (1 + h.re) ** 2 - h.im ** 2, im: 2 * (1 + h.re) * h.im } : ang(2 * Math.atan2(h.im, h.re));
  });
  if (Object.values(S.words.edW).every(Boolean)) {
    await assertWordsOffCurves(page, ctx, 'limits-ed-wplane', /^(ε-disk|touches here)/, { image, target: circlePts({ re: 1, im: 0 }, S.eps) }, where);
  }
  if (Object.values(S.words.edZ).every(Boolean)) {
    await assertWordsOffCurves(page, ctx, 'limits-ed-zplane', /^(g undefined|undefined|z₀ = 1)/, { disk: circlePts(sq ? { re: 1, im: 0 } : { re: 0, im: 0 }, r) }, where);
  }
}
// Derivative: z0 and Arg h keep off the ring; the spin and f(z0) off the image ring and its spokes; the two special values and f' off the dots.
async function derivativeWordsOffCurves(page, ctx, where) {
  await recordWords(page);
  const S = await page.evaluate(() => window.__mv.derivative.state());
  if (!S.defined || !(S.rhoEff > 0)) return;
  const f = DER.compiledFn(S.fnId);
  const ring = Array.from({ length: 97 }, (_, k) => ({ re: S.z0.re + S.rhoEff * Math.cos((2 * Math.PI * k) / 96), im: S.z0.im + S.rhoEff * Math.sin((2 * Math.PI * k) / 96) }));
  const image = ring.map((z) => f(z));
  const spokesZ = {}, spokesW = {};
  for (let j = 0; j < 12; j++) { spokesZ['spoke' + j] = [S.z0, ring[8 * j]]; spokesW['spoke' + j] = [f(S.z0), image[8 * j]]; }
  if (Object.values(S.words.z).every(Boolean)) await assertWordsOffCurves(page, ctx, 'derivative-zplane', /^(z0$|Arg h =)/, { ring, ...spokesZ }, where);
  if (Object.values(S.words.w).every(Boolean)) await assertWordsOffCurves(page, ctx, 'derivative-wplane', /^(spin Arg|f\(z₀\))/, { image, ...spokesW }, where);
  const q = DER.microscope(S.fnId, S.z0, S.rho).quotients.map((k) => k.q);
  const dc = Object.entries(S.words.dc).filter(([t, ok]) => ok && /^(h real|h imaginary|f′\(z₀\))/.test(t));
  if (dc.length) await assertWordsOffCurves(page, ctx, 'derivative-dcplane', /^(h real|h imaginary|f′\(z₀\))/, { dots: [...q, q[0]] }, where);
}

const noLeftRight = /\b(on the (left|right)|(left|right) (plane|one)|the (left|right) (plane|one))\b/i;
const styleCount = (page) => page.evaluate(() => document.head.querySelectorAll('style[data-for="station-limits-derivative"]').length);

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
  assert((await styleCount(page)) === 1, 'one station stylesheet while limits is mounted');
  const lede = await readText(page, '.station-header');
  assert(!noLeftRight.test(await bodyText(page)), 'the copy does not say left or right (the planes are stacked on a phone)');
  assert(lede.includes('watch g(z) in the w-plane'), 'the lede names the w-plane: ' + lede.slice(0, 160));
  const u0 = await uncleanWords(page, 'limits');
  assert(u0.length === 0, 'every word of the limits planes sits clear at the default: ' + u0.join(' | '));
  await limitsWordsOffCurves(page, ctx, 'limits default');

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
    return Number(/largest δ = ([0-9.]+)/.exec(await readText(page, '#limits-epsdelta'))[1]);
  };
  const d1 = await d(0.5), d2 = await d(0.1);
  assert(d2 > 0 && d2 < d1, `delta shrinks with epsilon: ${d1} then ${d2}`);
  assert(Math.abs(d1 - 0.225) < 0.001 && Math.abs(d2 - 0.049) < 0.001, `delta values ${d1}, ${d2}`);
  assert((await readText(page, '#limits-epsdelta')).includes('ε = 0.1; largest δ = 0.049'), 'readout text for eps 0.1');
  await clickChip(page, 'limits-ed-fn-dir');
  assert((await readText(page, '#limits-epsdelta')).includes('no δ works'), 'dir mode: no delta works');
  await clickChip(page, 'limits-ed-fn-sq');
  await setSlider(page, 'limits-eps', 0.5);
  assert((await readText(page, '#limits-epsdelta')).includes('ε = 0.5; largest δ = 0.225'), 'readout text for eps 0.5');
  // the words of the two epsilon-delta planes (the target's name, "touches here", the puncture's) clear of the red image and the disks
  for (const chip of ['limits-ed-fn-sq', 'limits-ed-fn-dir']) {
    await clickChip(page, chip);
    for (const e of [0.05, 0.5, 1.5]) {
      await setSlider(page, 'limits-eps', e);
      const u = await uncleanWords(page, 'limits');
      assert(u.length === 0, `epsilon-delta words clear (${chip}, eps ${e}): ${u.join(' | ')}`);
      await edWordsOffCurves(page, ctx, `${chip} eps ${e}`);
    }
  }
  await clickChip(page, 'limits-ed-fn-sq');
  await setSlider(page, 'limits-eps', 0.5);

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
  // every way in at three distances, for both functions: the puncture's word and Arg z on the z-plane, the limit and the centre on the w-plane
  for (const fn of ['limits-fn-dir', 'limits-fn-x-over-z']) {
    await clickChip(page, fn);
    for (const way of ['line', 'vertical', 'parabola', 'spiral']) {
      await clickChip(page, 'limits-path-' + way);
      for (const t of [1, 0.45, 0.05]) {
        await setSlider(page, 'limits-t', t);
        const u = await uncleanWords(page, 'limits');
        assert(u.length === 0, `limits words clear on ${fn} ${way} t = ${t}: ${u.join(' | ')}`);
        await limitsWordsOffCurves(page, ctx, `${fn} ${way} t = ${t}`);
      }
    }
  }
  await shot('limits-p5');

  // 8. lifecycle
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => !window.__mv.limits && ![...window.__mv.planes.keys()].some((k) => k.startsWith('limits-'))), 'limits hooks and planes are gone after unmount');
  assert((await styleCount(page)) === 0, 'the station stylesheet is gone after unmount');
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

// Where the z0 dot is inside the z-plane's canvas, in CSS pixels, and the canvas size.
const z0InPlane = (page) => page.evaluate(() => {
  const h = document.getElementById('derivative-zplane-z0').getBoundingClientRect(), v = document.getElementById('derivative-zplane-viewport').getBoundingClientRect();
  return { x: h.x + h.width / 2 - v.x, y: h.y + h.height / 2 - v.y, w: v.width, h: v.height };
});

// The + button (and the + key) zooms about the centre of the canvas and the default view is shifted, so z0 used to leave the canvas
// after a few clicks, which undid the idea of a microscope. z0 now stays where it is on screen; the wheel and a pinch zoom about the
// pointer, and z0 is then held inside the canvas (a 40 px inset).
async function zoomKeepsZ0(page, ctx) {
  const { assert } = ctx;
  const state = () => page.evaluate(() => window.__mv.derivative.state());
  const inside = (p, inset, where) => assert(p.x >= inset - 1 && p.x <= p.w - inset + 1 && p.y >= inset - 1 && p.y <= p.h - inset + 1, `${where}: z₀ at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) in ${p.w} x ${p.h}`);
  const start = await z0InPlane(page);
  for (let k = 0; k < 8; k++) await clickChip(page, 'derivative-zplane-zoom-in');
  let s = await state();
  assert(s.zUnits < 0.75, 'eight clicks of + zoom in: ' + s.zUnits);
  assert(Math.abs(s.zUnits - s.wUnits) < 1e-9, 'the w-plane follows the zoom');
  let p = await z0InPlane(page);
  assert(Math.hypot(p.x - start.x, p.y - start.y) < 2, `z₀ stays where it was on screen: (${start.x.toFixed(1)}, ${start.y.toFixed(1)}) then (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
  assert((await readText(page, '#derivative-readout')).includes('z₀ = 1 + i'), 'zooming does not move z₀');
  for (let k = 0; k < 8; k++) await clickChip(page, 'derivative-zplane-zoom-out');
  s = await state();
  assert(Math.abs(s.zUnits - 4) < 1e-6, 'eight clicks of - undo it: ' + s.zUnits);
  p = await z0InPlane(page);
  assert(Math.hypot(p.x - start.x, p.y - start.y) < 2, 'and z₀ is where it was');
  // the keyboard: + and - on the focused plane do the same
  await page.focus('#derivative-zplane-viewport');
  for (let k = 0; k < 6; k++) await page.keyboard.press('+');
  await settle(page, 3);
  p = await z0InPlane(page);
  assert(Math.hypot(p.x - start.x, p.y - start.y) < 2, 'the + key keeps z₀ in place too');
  await clickChip(page, 'derivative-zplane-zoom-reset');
  s = await state();
  assert(Math.abs(s.zUnits - 4) < 1e-9, 'Reset returns to the starting view');
  // z0 somewhere else: low on the left (more than the 40 px inset from the edge on a phone too)
  await dragHandle(page, 'derivative-zplane-z0', { re: -1, im: -1.2 });
  const start2 = await z0InPlane(page);
  for (let k = 0; k < 7; k++) await clickChip(page, 'derivative-zplane-zoom-in');
  p = await z0InPlane(page);
  assert(Math.hypot(p.x - start2.x, p.y - start2.y) < 2, 'z₀ low on the left stays in place');
  inside(p, 40, 'z₀ low on the left after +');
  await clickChip(page, 'derivative-zplane-zoom-reset');
  // the wheel over a far corner of the canvas zooms about that point; z0 is held inside the canvas
  await page.focus('#derivative-zplane-viewport');
  const box = await page.locator('#derivative-zplane-viewport').boundingBox();
  await page.mouse.move(box.x + 24, box.y + box.height - 24);
  for (let k = 0; k < 10; k++) { await page.mouse.wheel(0, -300); await settle(page, 2); }
  s = await state();
  assert(s.zUnits < 1, 'the wheel zoomed in: ' + s.zUnits);
  p = await z0InPlane(page);
  inside(p, 40, 'z₀ after the wheel over the far corner');
  assert(Math.abs(s.zUnits - s.wUnits) < 1e-9, 'the w-plane follows the wheel zoom');
  await clickChip(page, 'derivative-zplane-zoom-reset');
  // "Move z0 to 0" while the view is zoomed on something else: 0 is brought into view
  await dragHandle(page, 'derivative-zplane-z0', { re: 1, im: 1 });
  await page.focus('#derivative-zplane-viewport');
  for (let k = 0; k < 8; k++) await page.keyboard.press('+');
  await settle(page, 3);
  await clickChip(page, 'derivative-z0-origin');
  await settle(page, 3);
  inside(await z0InPlane(page), 40, 'z₀ after Move z₀ to 0 in a zoomed view');
  await clickChip(page, 'derivative-zplane-zoom-reset');
  await dragHandle(page, 'derivative-zplane-z0', { re: 1, im: 1 });
  s = await state();
  assert(s.z0.re === 1 && s.z0.im === 1 && Math.abs(s.zUnits - 4) < 1e-9, 'back to the default z₀ and view');
}

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
  assert(r.includes('A = 3 + 2i') && r.includes('|B| = 0.000') && r.includes("f′(z₀) = 3 + 2i"), 'default readout: ' + r);
  let s = await state();
  assert(s.exists === true && s.kind === 'ring' && s.dcHalf === 6 && s.spokes === 12, 'default state: ' + JSON.stringify({ e: s.exists, k: s.kind, h: s.dcHalf, sp: s.spokes }));
  assert(Math.abs(s.fit.re - 3) < 1e-6 && Math.abs(s.fit.im - 2) < 1e-6, 'the ring fits 3 + 2i: ' + JSON.stringify(s.fit));
  assert(Math.abs(s.zUnits - s.wUnits) < 1e-9, 'both planes share one scale');
  assert((await readText(page, '#derivative-verdict')).startsWith('Every direction gives the same number'), 'verdict for a differentiable point');
  assert((await styleCount(page)) === 1, 'one station stylesheet while derivative is mounted');
  assert(!noLeftRight.test(await bodyText(page)), 'the copy does not say left or right (the planes are stacked on a phone)');
  const lede = await readText(page, '.station-header');
  assert(lede.includes('ring in the z-plane into a ring in the w-plane'), 'the lede names the planes: ' + lede.slice(0, 200));
  assert((await readText(page, '#derivative-whost + .ld-caption')).startsWith('Same scale as the z-plane'), 'the w-plane caption names the z-plane');
  // the word beside z0 is drawn on the canvas, so the handle keeps its name for the screen reader but has no DOM word
  assert((await readHandleLabel(page, 'derivative-zplane-z0')).startsWith('z₀ = 1 + 1i; r = 1.414'), 'z₀ keeps its announcement: ' + (await readHandleLabel(page, 'derivative-zplane-z0')));
  assert(await page.evaluate(() => !document.querySelector('#derivative-zplane-viewport .plane-handle-label')), 'no DOM word beside the handle');
  const u0 = await uncleanWords(page, 'derivative');
  assert(u0.length === 0, 'every word of the three planes sits clear at the default (z₀, Arg h, spin, f(z₀), r, Arg, f\'): ' + u0.join(' | '));
  const words = await page.evaluate(() => window.__mv.derivative.state().words);
  assert(words.z['z₀'] === true && words.w['spin Arg f′ = 33.69°'] === true && words.dc['f′(z₀)'] === true, 'the named words are there: ' + JSON.stringify(words));
  await derivativeWordsOffCurves(page, ctx, 'derivative default');
  await zoomKeepsZ0(page, ctx);

  // 2. drag z0
  await drag({ re: 0.5, im: -1 });
  assert((await ro()).includes("f′(z₀) = 2 - 2i"), 'f at 0.5 - i: ' + (await ro()));

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
  assert(r.includes('|B| = 0.000') && r.includes("f′(z₀) = 0"), '|z|^2 at 0: ' + r);

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
  assert((await ro()).includes("f′(z₀) = 1"), 'e^z at 0: ' + (await ro()));

  // 9. 1/z: a pole, no NaN anywhere
  await clickChip(page, 'derivative-fn-recip');
  r = await ro();
  assert(r.includes('undefined'), '1/z at 0 is undefined: ' + r);
  await noBadNumbers(page, assert, 'derivative at the pole');
  assert((await page.evaluate(() => document.querySelector('#derivative-verdict').dataset.exists)) === 'undefined', 'verdict data-exists is undefined');
  await drag({ re: 0.5, im: 0 });
  r = await ro();
  assert(r.includes("f′(z₀) = -4"), '1/z at 0.5: ' + r);
  await noBadNumbers(page, assert, 'derivative near the pole');

  // the words stay clear for every function at three places (the quotient circle encloses its own ray for |z|^2 and Re z, so the "r =" word of
  // the polar address of A may have to sit over a line there: it is the one word allowed to)
  await setSlider(page, 'derivative-rho', 0.2);
  for (const fn of ['sq-plus-z', 'abs2', 'conj', 're', 'cube', 'exp', 'recip']) {
    await clickChip(page, 'derivative-fn-' + fn);
    for (const z of [{ re: 1, im: 1 }, { re: 0.3, im: -0.7 }, { re: -1, im: 1.5 }]) {
      await drag(z);
      // a ring that fills the w-plane (3z^2 at -1 + 1.5i stretches by 9.75: radius 1.95 of 2 units) leaves its two words no room
      const big = await state().then((m) => (Math.hypot(m.A.re, m.A.im) + m.absB) * m.rhoEff > 1.1);
      const u = await uncleanWords(page, 'derivative', big ? [/^r = /, /^spin Arg/, /^f\(z₀\)/] : [/^r = /]);
      assert(u.length === 0, `derivative words clear for ${fn} at ${z.re} ${z.im >= 0 ? '+' : '-'} ${Math.abs(z.im)}i: ${u.join(' | ')}`);
      await derivativeWordsOffCurves(page, ctx, `${fn} at ${z.re} ${z.im}`);
    }
  }
  await drag({ re: 0.5, im: 0 });                                 // back to where step 9 left it: 1/z near its pole

  // 10. extras
  await setSlider(page, 'derivative-rho', 0.5);
  s = await state();
  assert(Math.abs(s.rhoEff - 0.25) < 1e-9, 'rho is clipped to 0.25 at the pole: ' + s.rhoEff);
  assert((await readText(page, '#derivative-rho-out')).includes('clipped'), 'the rho output says clipped');
  await setSlider(page, 'derivative-rho', 0.15);
  await clickChip(page, 'derivative-fn-sq-plus-z');
  await drag({ re: 1, im: 1 });
  await setSlider(page, 'derivative-phi', 90);
  assert((await readText(page, '#derivative-phi-out')) === 'Arg h = 90° (π/2)', 'phi output: ' + (await readText(page, '#derivative-phi-out')));
  await page.waitForTimeout(350);
  const tex = await page.evaluate(() => document.getElementById('derivative-ex-quotient-cart').dataset.tex);
  assert(tex.includes('3 + 2.15i'), 'explainer shows q(90°) = 3 + 2.15i: ' + tex);
  await setSlider(page, 'derivative-phi', -180);
  assert((await readText(page, '#derivative-phi-out')) === 'Arg h = 180° (π)', 'the seam shows Arg h = 180°: ' + (await readText(page, '#derivative-phi-out')));
  await setSlider(page, 'derivative-phi', 0);
  assert((await readText(page, '#derivative-phi-out')) === 'Arg h = 0°', 'no "(0)" after Arg h = 0°: ' + (await readText(page, '#derivative-phi-out')));
  await clickChip(page, 'derivative-z0-origin');
  assert((await ro()).includes('z₀ = 0'), 'Move z₀ to 0');
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
  assert((await styleCount(page)) === 0, 'the station stylesheet is gone after unmount');
  // one stylesheet across a hop from one station to the other, and none once both are gone
  await page.evaluate(() => { location.hash = '#limits'; });
  await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = '#derivative'; });
  await page.waitForTimeout(500);
  assert((await styleCount(page)) === 1, 'limits then derivative: one stylesheet, not two');
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForTimeout(400);
  assert((await styleCount(page)) === 0, 'the stylesheet is gone again');
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
  assert((await ro()).includes("f′(z₀) = 0"), 'at 0: ' + (await ro()));
  await dragHandle(page, 'derivative-zplane-z0', { re: 1, im: 1 });
  assert((await readText(page, '#derivative-verdict')).includes('differentiable only at 0'), 'verdict after dragging back');
  await noBadNumbers(page, assert, '3.1.2');
  await dragHandle(page, 'derivative-zplane-z0', { re: 1, im: 1 });
  const u = await uncleanWords(page, 'derivative', [/^r = /]);
  assert(u.length === 0, '3.1.2: every word sits clear except r (the circle encloses the ray): ' + u.join(' | '));
  await derivativeWordsOffCurves(page, ctx, '3.1.2');
  const w = await page.evaluate(() => window.__mv.derivative.state().words.dc);
  assert(w['h real: 2'] === true && w['h imaginary: -2i'] === true, '3.1.2: the two special values are named clear of their diamonds: ' + JSON.stringify(w));
  assert(Object.keys(w).some((k) => /^Arg A = -pi\/4|^Arg A = -π\/4/.test(k) && /also 7π\/4, -9π\/4/.test(k)), '3.1.2: Arg A and the other names of arg A in one word: ' + Object.keys(w).join(' | '));
}

async function derivativeP6(page, ctx) {
  const { assert } = ctx;
  const ro = () => readText(page, '#derivative-readout');
  assert((await stationOf(page)) === 'derivative', 'station is derivative');
  let r = await ro();
  assert(r.startsWith('z₀ = 0.3 - 0.7i; A = 0.5; |B| = 0.500'), 'P6 readout: ' + r);
  assert(r.includes('does not exist'), 'P6 does not exist');
  assert(await page.evaluate(() => document.getElementById('derivative-fn-re').getAttribute('aria-pressed') === 'true'), 're chip pressed');
  await dragHandle(page, 'derivative-zplane-z0', { re: 1, im: 1 });
  r = await ro();
  assert(r.includes('A = 0.5') && r.includes('|B| = 0.500'), 'the circle is the same at every z₀: ' + r);
  assert((await readText(page, '#derivative-verdict')).includes('problem P5'), 'verdict links P6 to P5');
  assert((await readText(page, '#derivative-problem')).includes('Problem P6'), 'problem card P6');
  await noBadNumbers(page, assert, 'P6');
  await dragHandle(page, 'derivative-zplane-z0', { re: 0.3, im: -0.7 });
  const u = await uncleanWords(page, 'derivative', [/^r = /]);
  assert(u.length === 0, 'P6: every word sits clear except r (the circle encloses the ray): ' + u.join(' | '));
  await derivativeWordsOffCurves(page, ctx, 'P6');
  const words = await page.evaluate(() => window.__mv.derivative.state().words);
  assert(words.z['Arg h = 0°'] === true && words.z['z₀'] === true, 'P6: z₀ and Arg h clear of the ring and the y tick labels: ' + JSON.stringify(words.z));
  assert(words.dc['h real: 1'] === true && words.dc['h imaginary: 0'] === true, 'P6: h imaginary: 0 is off the origin diamond and the 0 tick: ' + JSON.stringify(words.dc));
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

