// tests/interact/i1-station-curves-linear.mjs
// Interaction script for the stations "curves" and "linear" (goal i1-station-curves-linear, design section 7.3 and 7.4).
//
//   node tools/smoke.mjs --route problem-1-5-1,curves --script tests/interact/i1-station-curves-linear.mjs --dark
//   node tools/smoke.mjs --route problem-2-1-3,problem-P3,problem-P4,linear --script tests/interact/i1-station-curves-linear.mjs --dark
//
// Runs unchanged at desktop, phone and desktop-dark. Branches on ctx.route.

import { clickChip, readText, setSlider, settle, dragHandle, handleZ, planePixel, parseCart } from './_helpers.mjs';

const byId = (id) => `[id="${id}"]`;

async function go(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(600);
}

function makeHelpers(page, ctx) {
  const has = (text, ...parts) => {
    for (const p of parts) ctx.assert(String(text).includes(p), `expected "${p}" in "${text}"`);
  };
  // the chip answer and text of a classification chip
  const ans = (id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? { answer: e.dataset.answer, text: e.textContent.trim() } : null; }, id);
  // the image points of the main input at the current stage (window.__mv.linearImage), as plain objects
  const img = () => page.evaluate(() => {
    const v = window.__mv.linearImage;
    return Array.isArray(v) ? v.map((p) => ({ re: p.re, im: p.im, t: p.t })) : (v && v.points) || [];
  });
  const cell = (id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? { tex: e.dataset.tex || '', text: e.textContent } : { tex: '', text: '' }; }, id);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return { has, ans, img, cell, overflow };
}

// ---- A3: sample real pixels of the ramp -------------------------------------------------------------------------

function parseRgb(s) {
  s = String(s).trim();
  let m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return [...m[1]].map((h) => parseInt(h + h, 16));
  return null;
}
const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

async function rampCheck(page, ctx, planeId, which) {
  const r = await page.evaluate(async ({ planeId, which }) => {
    const plane = window.__mv.planes.get(planeId);
    const cv = plane.canvas, g = cv.getContext('2d');
    const ratio = cv.width / cv.clientWidth;
    const pts = which === 'curves' ? window.__mv.curves.points() : window.__mv.linearImage;
    const at = (t) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        if (pts[i].t <= t && t <= pts[i + 1].t) {
          const u = (t - pts[i].t) / (pts[i + 1].t - pts[i].t);
          return { re: pts[i].re + u * (pts[i + 1].re - pts[i].re), im: pts[i].im + u * (pts[i + 1].im - pts[i].im) };
        }
      }
      return null;
    };
    const sample = (t) => {
      const q = plane.toPixel(at(t)), cx = Math.round(q.x * ratio), cy = Math.round(q.y * ratio);
      const d = g.getImageData(cx - 4, cy - 4, 9, 9).data;
      let best = null;
      for (let k = 0; k < d.length; k += 4) if (!best || d[k + 3] > best[3]) best = [d[k], d[k + 1], d[k + 2], d[k + 3]];
      return best;
    };
    const m = await import(location.origin + '/js/core/plane.js');
    const base = which === 'curves' ? '--input' : '--output';
    const want = (t) => m.rampColor(base, (Math.floor(t * 32) + 0.5) / 32);          // the bin the stroke is drawn in
    return { lo: sample(0.1), hi: sample(0.9), wantLo: want(0.1), wantHi: want(0.9), surface: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() };
  }, { planeId, which });
  const surface = parseRgb(r.surface);
  ctx.assert(surface, `could not read --surface: ${r.surface}`);
  const over = (px) => { const a = px[3] / 255; return [0, 1, 2].map((k) => px[k] * a + surface[k] * (1 - a)); };
  ctx.assert(r.lo[3] >= 200 && r.hi[3] >= 200, `ramp samples missed the stroke (alpha ${r.lo[3]}, ${r.hi[3]})`);
  const lo = over(r.lo), hi = over(r.hi), wLo = parseRgb(r.wantLo), wHi = parseRgb(r.wantHi);
  for (let k = 0; k < 3; k++) {
    ctx.assert(Math.abs(lo[k] - wLo[k]) <= 14, `ramp t = 0.1 channel ${k}: got ${lo[k].toFixed(0)}, wanted ${wLo[k]} (${r.wantLo})`);
    ctx.assert(Math.abs(hi[k] - wHi[k]) <= 14, `ramp t = 0.9 channel ${k}: got ${hi[k].toFixed(0)}, wanted ${wHi[k]} (${r.wantHi})`);
  }
  ctx.assert(lum(hi) > lum(lo) + 0.04, `the ramp is not brighter at t = 0.9 (${lum(lo).toFixed(3)} -> ${lum(hi).toFixed(3)})`);
  ctx.assert(contrast(lo, surface) >= 3 && contrast(hi, surface) >= 3, `ramp contrast ${contrast(lo, surface).toFixed(2)} / ${contrast(hi, surface).toFixed(2)} below 3:1`);
  ctx.log(`ramp ok on ${planeId}: t=0.1 rgb(${lo.map(Math.round)}) contrast ${contrast(lo, surface).toFixed(2)}, t=0.9 rgb(${hi.map(Math.round)}) contrast ${contrast(hi, surface).toFixed(2)}`);
}

// ---- curves (goal A2, A3) -----------------------------------------------------------------------------------------

async function curvesChecks(page, ctx) {
  const { has, ans, cell, overflow } = makeHelpers(page, ctx);
  await page.waitForSelector('#curves-ex-z-cart');
  await settle(page, 3);

  // 1. the default state is problem 1.5.1
  let readout = await readText(page, '#curves-readout');
  ctx.assert(/t = 0;/.test(readout) && /(2 \+ i|2 \+ 1i)/.test(readout), `readout at load: ${readout}`);
  ctx.log('load: ' + readout);
  await ctx.shot('segment-t0');

  // 2. the scrubber follows the line
  await setSlider(page, 'curves-t', 0.5);
  readout = await readText(page, '#curves-readout');
  ctx.assert(/(-0\.5 - i|-0\.5 - 1i)/.test(readout), `readout at t = 0.5: ${readout}`);
  has(readout, 'x(t) = -0.5', 'y(t) = -1');

  // 3. the explainer builds the segment two ways
  await page.waitForTimeout(350);
  const zc = await cell('curves-ex-z-cart');
  has(zc.tex, '2', '5', 't', '(2 - 5t) + i(1 - 4t)');
  has(zc.text, '2', '5', 't');
  has((await cell('curves-ex-z-polar')).tex, '6.403');
  has((await cell('curves-ex-now-cart')).tex, 'x(t) = -0.5');
  const same = await page.evaluate(() => document.getElementById('curves-ex-same').dataset.agree);
  ctx.assert(same === 'true', 'the same-point row of the curves explainer does not agree');

  // 4. A3: the ramp is dark early and bright late, in both themes
  await rampCheck(page, ctx, 'curves-plane', 'curves');

  // 5. reverse
  await clickChip(page, 'curves-reverse');
  await setSlider(page, 'curves-t', 0);
  has(await readText(page, '#curves-readout'), '-3 - 3i');
  await clickChip(page, 'curves-reverse');
  await setSlider(page, 'curves-t', 0);
  has(await readText(page, '#curves-readout'), '2 + i');

  // 6. the figure eight crosses itself
  await clickChip(page, 'curves-preset-eight');
  let a = await ans('curves-simple');
  ctx.assert(a.answer === 'no' && /no/.test(a.text), `eight simple: ${JSON.stringify(a)}`);
  a = await ans('curves-closed');
  ctx.assert(a.answer === 'yes', `eight closed: ${JSON.stringify(a)}`);
  ctx.assert(await page.isDisabled('#curves-orient'), 'the orientation button must be disabled for the eight');
  await ctx.shot('eight');

  // 7. the square has corners; orientation flips
  await clickChip(page, 'curves-preset-square');
  const sq = { smooth: 'no', piecewise: 'yes', positive: 'yes', closed: 'yes', simple: 'yes' };
  for (const [k, v] of Object.entries(sq)) { a = await ans('curves-' + k); ctx.assert(a.answer === v, `square ${k}: ${JSON.stringify(a)}`); }
  await ctx.shot('square');
  await clickChip(page, 'curves-orient');
  a = await ans('curves-positive');
  ctx.assert(a.answer === 'no', `square after orient: ${JSON.stringify(a)}`);
  await clickChip(page, 'curves-orient');
  a = await ans('curves-positive');
  ctx.assert(a.answer === 'yes', `square after orient twice: ${JSON.stringify(a)}`);
  await clickChip(page, 'curves-reverse');
  a = await ans('curves-positive');
  ctx.assert(a.answer === 'no', `square after reverse: ${JSON.stringify(a)}`);
  await clickChip(page, 'curves-reverse');

  // 8. circle and half circle
  await clickChip(page, 'curves-preset-circle');
  for (const k of ['smooth', 'piecewise', 'closed', 'simple', 'positive']) { a = await ans('curves-' + k); ctx.assert(a.answer === 'yes', `circle ${k}: ${JSON.stringify(a)}`); }
  await clickChip(page, 'curves-preset-arc');
  const arc = { closed: 'no', simple: 'yes', smooth: 'yes', positive: 'no' };
  for (const [k, v] of Object.entries(arc)) { a = await ans('curves-' + k); ctx.assert(a.answer === v, `arc ${k}: ${JSON.stringify(a)}`); }
  ctx.assert(await page.isDisabled('#curves-orient'), 'the orientation button must be disabled for the half circle');

  // 9. a preset starts un-reversed
  await clickChip(page, 'curves-preset-segment');
  await clickChip(page, 'curves-reverse');
  await clickChip(page, 'curves-preset-square');
  a = await ans('curves-positive');
  ctx.assert(a.answer === 'yes', `a preset must start un-reversed: ${JSON.stringify(a)}`);
  await clickChip(page, 'curves-preset-segment');

  // 10. drag the end handle; the readout follows it
  const z = await dragHandle(page, 'curves-plane-b', { re: 1, im: -2 });
  ctx.assert(Math.hypot(z.re - 1, z.im + 2) < 0.2, `dragged b landed at (${z.re}, ${z.im})`);
  await setSlider(page, 'curves-t', 1);
  readout = await readText(page, '#curves-readout');
  const m = /z\(t\) = ([^;]*);/.exec(readout);
  const rz = parseCart(m ? m[1] : '');
  const hb = await handleZ(page, 'curves-plane-b');
  ctx.assert(rz && Math.hypot(rz.re - hb.re, rz.im - hb.im) < 0.01, `readout ${readout} does not follow the handle (${hb.re}, ${hb.im})`);
  await dragHandle(page, 'curves-plane-b', { re: -3, im: -3 });

  // 11. keyboard: arrow keys move a focused handle by 0.5
  await page.focus(byId('curves-plane-a'));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await settle(page);
  const ha = await handleZ(page, 'curves-plane-a');
  ctx.assert(Math.abs(ha.re - 3) < 1e-6 && Math.abs(ha.im - 1) < 1e-6, `keyboard moved a to (${ha.re}, ${ha.im}), wanted (3, 1)`);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await settle(page);

  // 12. the address overlay
  await setSlider(page, 'curves-t', 0.5);
  await page.check('#curves-addresses');
  await settle(page, 3);
  await ctx.shot('addresses-on');
  await page.uncheck('#curves-addresses');

  // 13. tokens and reduced motion
  await go(page, '#curves-circle');
  a = await ans('curves-closed');
  ctx.assert(a && a.answer === 'yes', 'token #curves-circle must show a closed curve');
  has(await readText(page, '#curves-readout'), 't = 0;', '3 + i');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go(page, '#curves');
  has(await readText(page, '#curves-play'), 'Step');
  await setSlider(page, 'curves-t', 0);
  await clickChip(page, 'curves-play');
  has(await readText(page, '#curves-readout'), 't = 0.25');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await go(page, '#curves-nonsense');
  has(await readText(page, '#curves-note'), 'I do not know a curve called');
  has(await readText(page, '#curves-readout'), '2 + i');
  await go(page, '#problem-1-5-1');

  // 14. performance: a long drag keeps the plane responsive
  await dragHandle(page, 'curves-plane-b', { re: 1, im: -2 }, { steps: 60 });
  const ms = await page.evaluate(() => window.__mv.planes.get('curves-plane').getStats().lastDrawMs);
  ctx.assert(ms < 25, `last draw took ${ms} ms`);
  await dragHandle(page, 'curves-plane-b', { re: -3, im: -3 });

  // 15. no horizontal overflow after all that
  const ov = await overflow();
  ctx.assert(ov <= 1, `horizontal overflow of ${ov}px`);
}

// ---- linear (goal A4) ---------------------------------------------------------------------------------------------

async function p4Checks(page, ctx) {
  const { has, img } = makeHelpers(page, ctx);
  await page.waitForSelector('#linear-readout');
  await settle(page, 3);
  has(await readText(page, '#linear-problem-title'), 'P4');
  const readout = await readText(page, '#linear-readout');
  has(readout, 'a = 1 + i', 'stretch 1.414', 'spin 45', 'b = 0');
  let pts = await img();
  ctx.assert(pts.length === 129, `P4 image has ${pts.length} points`);
  for (const p of pts) {
    const d = Math.abs(Math.hypot(p.re, p.im) - 1.414);
    ctx.assert(d < 1e-3, `| |w| - 1.414 | = ${d}`);
    ctx.assert(Math.abs(Math.hypot(p.re, p.im) - Math.SQRT2) < 1e-9, '|w| is not sqrt 2 to 1e-9');
  }
  ctx.assert(Math.hypot(pts[0].re - 1, pts[0].im - 1) < 1e-6, 'the t = 0 point must be (1, 1)');
  await setSlider(page, 'linear-stage', 1);
  pts = await img();
  for (const p of pts) ctx.assert(Math.abs(Math.hypot(p.re, p.im) - 1) < 1e-9, '| |w| - 1 | at stage 1');
  ctx.assert(Math.hypot(pts[0].re - 0.7071, pts[0].im - 0.7071) < 1e-3, `t = 0 point at stage 1 is (${pts[0].re}, ${pts[0].im})`);
  await setSlider(page, 'linear-stage', 3);
  const pressed = await page.getAttribute('#linear-preset-P4', 'aria-pressed');
  ctx.assert(pressed === 'true', '#linear-preset-P4 must be pressed');
  ctx.log('P4 ok: ' + readout);
  await ctx.shot('p4');
}

async function p3Checks(page, ctx) {
  const { has, cell } = makeHelpers(page, ctx);
  await page.waitForSelector('#linear-readout');
  await settle(page, 3);
  has(await readText(page, '#linear-problem-title'), 'P3');
  const order = await page.evaluate(() => {
    const c = document.getElementById('linear-compose'), z = document.getElementById('linear-zplane-viewport');
    return !!(c && z && (c.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  ctx.assert(order, 'at P3 the composition panel must come before the planes');
  await page.fill('#linear-compose-c', '1+i');
  await page.fill('#linear-compose-d', '1');
  await settle(page, 3);
  has(await readText(page, '#linear-compose-readout'), 'ac = -1 + i', 'ad + b = -i');
  await page.waitForTimeout(350);
  has((await cell('linear-comp-ex-coeff-cart')).tex, '-1 + i');
  const same = await page.evaluate(() => document.getElementById('linear-comp-ex-same').dataset.agree);
  ctx.assert(same === 'true', 'the composition check row must agree');
  // a mistake: the message is shown, the last good value is kept
  await page.fill('#linear-compose-c', '1+');
  await settle(page, 3);
  has(await readText(page, '#linear-compose-error'), 'stops too early');
  ctx.assert((await page.getAttribute('#linear-compose-c', 'aria-invalid')) === 'true', 'c must be aria-invalid');
  has(await readText(page, '#linear-compose-readout'), 'ac = -1 + i');
  await page.fill('#linear-compose-c', '1+i');
  await settle(page, 3);
  ctx.assert((await readText(page, '#linear-compose-error')) === '', 'the error must clear');
  ctx.assert((await page.getAttribute('#linear-compose-c', 'aria-invalid')) === null, 'aria-invalid must clear');
  await page.fill('#linear-compose-c', 'i');
  await page.fill('#linear-compose-d', '0');
  await settle(page, 3);
  has(await readText(page, '#linear-compose-readout'), 'ac = -1; ad + b = -2i');
  await page.fill('#linear-compose-c', '0');
  await settle(page, 3);
  ctx.assert(await page.isVisible('#linear-compose-note'), 'the note for c = 0 must show');
  await page.fill('#linear-compose-c', '1+i');
  await page.fill('#linear-compose-d', '1');
  await settle(page, 3);
  await ctx.shot('p3');
}

async function linearChecks(page, ctx) {
  const { has, img, cell, overflow } = makeHelpers(page, ctx);
  await page.waitForSelector('#linear-readout');
  await settle(page, 3);
  const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

  // 1. the readout of problem 2.1.3
  const readout = await readText(page, '#linear-readout');
  has(readout, 'a = i', 'b = -2i', 'spin 90', 'stretch 1');
  ctx.log('load: ' + readout);

  // 2. at stage 3 the image is the real axis, and every point keeps its t
  let pts = await img();
  ctx.assert(pts.length === 129, `image has ${pts.length} points`);
  ctx.assert(pts.every((p) => Math.abs(p.im) < 1e-6), 'stage 3: every image point must be on the real axis');
  ctx.assert(Math.min(...pts.map((p) => p.re)) < -2 && Math.max(...pts.map((p) => p.re)) > 2, 'the image must span below -2 and above 2');
  ctx.assert(pts[0].t === 0 && pts[128].t === 1, 'the image must keep t = 0 and t = 1 at its ends');
  ctx.assert(pts.every((p, k) => near(p.t, k / 128, 1e-9) && (k === 0 || p.t > pts[k - 1].t)), 'the image must keep the t of its input points');
  ctx.assert(near(pts[112].re, -3) && near(pts[112].im, 0), `point at t = 0.875 is (${pts[112].re}, ${pts[112].im})`);
  const viaPoints = await page.evaluate(() => { const v = window.__mv.linearImage; return Array.isArray(v.points) && v.points.length === v.length; });
  ctx.assert(viaPoints, 'window.__mv.linearImage.points must alias the array');
  await ctx.shot('stage-3-first');

  // 3. stage 1: spin only, the line x = 2 becomes y = 2
  await setSlider(page, 'linear-stage', 1);
  pts = await img();
  ctx.assert(pts.every((p) => near(p.im, 2)), 'stage 1: every image point must have im = 2');
  ctx.assert(Math.min(...pts.map((p) => p.re)) < -3.9 && Math.max(...pts.map((p) => p.re)) > 3.9, 'stage 1: re still spans -4 to 4');
  has(await readText(page, '#linear-stage-caption'), 'Stage 1 of 3 done');
  await ctx.shot('stage-1');

  // 4. the other stages
  await setSlider(page, 'linear-stage', 2);
  pts = await img();
  ctx.assert(pts.every((p) => near(p.im, 2)), 'stage 2: im = 2');
  await setSlider(page, 'linear-stage', 2.5);
  pts = await img();
  ctx.assert(pts.every((p) => near(p.im, 1)), 'stage 2.5: im = 1');
  await setSlider(page, 'linear-stage', 3);
  pts = await img();
  ctx.assert(pts.every((p) => near(p.im, 0)), 'stage 3: im = 0');
  await setSlider(page, 'linear-stage', 0);
  pts = await img();
  ctx.assert(pts.every((p) => near(p.re, 2)), 'stage 0: re = 2');
  await setSlider(page, 'linear-stage', 3);
  await ctx.shot('stage-3');

  // 5. the followed point and the explainer
  await setSlider(page, 'linear-t', 0.875);
  await page.waitForTimeout(350);
  has((await cell('linear-ex-zt-cart')).tex, '2 + 3i');
  has((await cell('linear-ex-wt-cart')).tex, '-3');
  const same = await page.evaluate(() => document.getElementById('linear-ex-same').dataset.agree);
  ctx.assert(same === 'true', 'the same-point row of the linear explainer must agree');
  has((await cell('linear-ex-a-polar')).tex, '\\frac{\\pi}{2}');
  has((await cell('linear-ex-fixed-cart')).tex, '1 - i');

  // 6. the ramp on the w-plane (the cursor ring is moved away from t = 0.1 and 0.9 first)
  await setSlider(page, 'linear-t', 0.5);
  await rampCheck(page, ctx, 'linear-wplane', 'linear');
  await setSlider(page, 'linear-t', 0.875);

  // 7. drag a and b on the control plane
  await dragHandle(page, 'linear-ab-a', { re: 1, im: 1 });
  has(await readText(page, '#linear-readout'), 'a = 1 + i', 'spin 45');
  pts = await img();
  ctx.assert(near(pts[0].re, 6) && near(pts[0].im, -4), `after a = 1 + i, the t = 0 point is (${pts[0].re}, ${pts[0].im}), wanted (6, -4)`);
  ctx.assert(near(pts[112].re, -1) && near(pts[112].im, 3), `after a = 1 + i, the t = 0.875 point is (${pts[112].re}, ${pts[112].im}), wanted (-1, 3)`);
  ctx.assert(!pts.every((p) => Math.abs(p.im) < 1e-6), 'the image must no longer be on the real axis');
  await dragHandle(page, 'linear-ab-a', { re: 0, im: 1 });
  has(await readText(page, '#linear-readout'), 'a = i');
  let hb = await handleZ(page, 'linear-ab-b');
  ctx.assert(near(hb.re, 0) && near(hb.im, -2), `dragging a moved b to (${hb.re}, ${hb.im})`);
  await page.focus(byId('linear-ab-b'));
  await page.keyboard.press('ArrowDown');
  await settle(page);
  hb = await handleZ(page, 'linear-ab-b');
  ctx.assert(near(hb.im, -2.5), `b after ArrowDown is (${hb.re}, ${hb.im})`);
  await page.keyboard.press('ArrowUp');
  await settle(page);
  hb = await handleZ(page, 'linear-ab-b');
  ctx.assert(near(hb.im, -2), `b after ArrowUp is (${hb.re}, ${hb.im})`);

  // 8. the grid chips do not change the image
  for (const g of ['polar', 'off', 'cart']) {
    await clickChip(page, 'linear-grid-' + g);
    ctx.assert((await page.getAttribute('#linear-grid-' + g, 'aria-pressed')) === 'true', `grid ${g} must be pressed`);
    ctx.assert((await img()).length === 129, `the image changed with the grid ${g}`);
  }

  // 9. draw my own stroke
  await clickChip(page, 'linear-input-stroke');
  pts = await img();
  ctx.assert(pts.length === 0, 'stroke mode before drawing: the image must be empty');
  ctx.assert(await page.isDisabled('#linear-t'), '#linear-t must be disabled with no stroke');
  ctx.assert((await readText(page, '#linear-stroke-hint')) !== '', 'the stroke hint must say what to do');
  const p0 = await planePixel(page, 'linear-zplane', { re: -2, im: -2 });
  const p1 = await planePixel(page, 'linear-zplane', { re: 0, im: 1 });
  const p2 = await planePixel(page, 'linear-zplane', { re: 2, im: -1 });
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(p1.x, p1.y, { steps: 12 });
  await page.mouse.move(p2.x, p2.y, { steps: 12 });
  await page.mouse.up();
  await settle(page, 3);
  pts = await img();
  ctx.assert(pts.length >= 10, `the stroke image has ${pts.length} points`);
  const st = await page.evaluate(() => window.__mv.linear.stroke());
  ctx.assert(st && st.length === pts.length, 'the stroke and its image must have the same number of points');
  const f = (z) => ({ re: -z.im, im: z.re - 2 });
  const first = f(st[0]), last = f(st[st.length - 1]);
  ctx.assert(Math.hypot(pts[0].re - first.re, pts[0].im - first.im) < 1e-9, 'the first image point must be f(first stroke point)');
  ctx.assert(Math.hypot(pts[pts.length - 1].re - last.re, pts[pts.length - 1].im - last.im) < 1e-9, 'the last image point must be f(last stroke point)');
  ctx.assert(pts[0].t === 0 && pts[pts.length - 1].t === 1, 'the stroke image keeps t = 0 and t = 1');
  await ctx.shot('stroke');
  await clickChip(page, 'linear-stroke-clear');
  ctx.assert((await img()).length === 0, 'clearing the stroke must empty the image');
  // a tap is not a stroke (the page may have scrolled since p0 was measured, so measure again)
  const tap = await planePixel(page, 'linear-zplane', { re: -2, im: -2 });
  await page.mouse.move(tap.x, tap.y);
  await page.mouse.down();
  await page.mouse.up();
  await settle(page, 3);
  ctx.assert((await img()).length === 0, 'a tap must not make a stroke');
  has(await readText(page, '#linear-stroke-hint'), 'That was too short to be a stroke.');
  await clickChip(page, 'linear-input-x2');
  ctx.assert((await img()).length === 129, 'back to the line: 129 points');

  // 10. fit both planes
  await clickChip(page, 'linear-fit');
  const views = await page.evaluate(() => ['linear-zplane-viewport', 'linear-wplane-viewport'].map((id) => {
    const e = document.getElementById(id);
    return { u: Number(e.dataset.unitsAcross), re: Number(e.dataset.centerRe), im: Number(e.dataset.centerIm) };
  }));
  ctx.assert(near(views[0].u, views[1].u) && near(views[0].re, views[1].re) && near(views[0].im, views[1].im), `fit both: ${JSON.stringify(views)}`);
  await page.evaluate(() => document.getElementById('linear-wplane-zoom-in').click());
  await settle(page);
  await page.evaluate(() => document.getElementById('linear-wplane-zoom-reset').click());
  await settle(page);
  const after = await page.evaluate(() => { const e = document.getElementById('linear-wplane-viewport'); return { u: Number(e.dataset.unitsAcross), re: Number(e.dataset.centerRe), im: Number(e.dataset.centerIm) }; });
  ctx.assert(near(after.u, views[1].u, 1e-4) && near(after.re, views[1].re, 1e-4) && near(after.im, views[1].im, 1e-4), `Reset must return to the fitted view: ${JSON.stringify(after)} vs ${JSON.stringify(views[1])}`);

  // 11. P4, then P3, through their routes
  await go(page, '#problem-P4');
  await p4Checks(page, ctx);
  await go(page, '#problem-P3');
  await p3Checks(page, ctx);

  // 12. back at 2.1.3 the composition panel follows the explainer
  await go(page, '#problem-2-1-3');
  await page.waitForSelector('#linear-readout');
  const order = await page.evaluate(() => {
    const c = document.getElementById('linear-compose'), t = document.getElementById('linear-ex-table');
    return !!(c && t && (t.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  ctx.assert(order, 'at 2.1.3 the composition panel must follow the explainer');
  const ov = await overflow();
  ctx.assert(ov <= 1, `horizontal overflow of ${ov}px`);
}

export default async function (page, ctx) {
  const r = ctx.route;
  if (r === 'curves' || r === 'problem-1-5-1') return curvesChecks(page, ctx);
  if (r === 'linear' || r === 'problem-2-1-3') return linearChecks(page, ctx);
  if (r === 'problem-P4') return p4Checks(page, ctx);
  if (r === 'problem-P3') return p3Checks(page, ctx);
  throw new Error(`no checks written for route ${r}`);
}
