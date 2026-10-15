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

// ---- words drawn on a canvas: where they are, so a script can say "no two overlap" --------------------------------------------
// The plane's words (the stations' own through createLabelPlacer, the address labels, the tick numbers) are canvas text, not DOM. This
// records the fillText calls of one forced redraw of a plane (and the arcs: the dots) and returns their boxes in CSS pixels, so a check
// can say that no word of a station sits on another word or on a dot. Tick numbers (11 px) and the axis names are returned too, marked.
const AXIS_NAMES = new Set(['x', 'y', 'u', 'v', 'Re', 'Im']);

export async function canvasWords(page, planeId) {
  return page.evaluate(async (id) => {
    const plane = window.__mv.planes.get(id), g = plane.canvas.getContext('2d');
    const words = [], dots = [];
    const text0 = g.fillText, arc0 = g.arc;
    g.fillText = function (t, x, y) {
      const fs = Number((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 12])[1]), w = this.measureText(String(t)).width, a = this.textAlign, mid = this.textBaseline === 'middle';
      const x0 = a === 'center' ? x - w / 2 : a === 'right' || a === 'end' ? x - w : x;
      words.push({ text: String(t), fs, x0, x1: x0 + w, y0: mid ? y - fs * 0.4 : y - fs * 0.75, y1: mid ? y + fs * 0.4 : y + fs * 0.2 });
      return text0.apply(this, arguments);
    };
    g.arc = function (x, y, r) { if (r >= 2.5 && r <= 9) dots.push({ x, y, r }); return arc0.apply(this, arguments); };
    try {
      plane.requestDraw();
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    } finally { delete g.fillText; delete g.arc; }
    return { words, dots, size: plane.getSize() };
  }, planeId);
}

const boxesTouch = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
const boxHitsCircle = (b, c, pad = 0) => {
  const dx = Math.max(b.x0 - c.x, 0, c.x - b.x1), dy = Math.max(b.y0 - c.y, 0, c.y - b.y1);
  return Math.hypot(dx, dy) < c.r + pad;
};

// No two station words overlap, and none sits on one of the given dots (pixel centres, radius 4 to 5). Tick numbers (11 px) and axis names
// are not station words; the words of the plane's own address labels are (they are 12 or 13 px).
export function assertWordsClear(ctx, name, rec, dots = []) {
  const mine = rec.words.filter((w) => w.fs >= 12 && !AXIS_NAMES.has(w.text));
  for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) {
    ctx.assert(!boxesTouch(mine[i], mine[j]), `${name}: the words "${mine[i].text}" and "${mine[j].text}" print on top of each other`);
  }
  for (const w of mine) for (const d of dots) {
    ctx.assert(!boxHitsCircle(w, { x: d.x, y: d.y, r: d.r ?? 4 }), `${name}: the word "${w.text}" prints on a dot at (${d.x.toFixed(0)}, ${d.y.toFixed(0)})`);
  }
  return mine;
}

// No { or } in anything a student reads: the text nodes of the page outside the TeX, the title and aria-label attributes. (The printable
// answer text is data from js/data and is not looked at: a set may be written with braces there. A set-builder "{ x : ... }" is a set.)
async function noBraces(page, ctx, name) {
  const bad = await page.evaluate(() => {
    const out = [], root = document.querySelector('#view');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (el.closest('.katex, script, style') || el.matches('p.mono') || el.closest('[id$="-problem-answer"]')) continue;
      const t = n.textContent.replace(/\{[^{}]* : [^{}]*\}/g, '');                 // the set "arg a = { π/2 + 2πk : k is any integer }" is a set, braces and all
      if (/[{}]/.test(t)) out.push(n.textContent.trim().slice(0, 90));
    }
    for (const e of root.querySelectorAll('[title], [aria-label]')) for (const a of ['title', 'aria-label']) {
      const v = e.getAttribute(a);
      if (v && /[{}]/.test(v)) out.push(`${a}: ${v.slice(0, 90)}`);
    }
    return out;
  });
  ctx.assert(bad.length === 0, `${name}: literal braces on the page: ${JSON.stringify(bad)}`);
}

// The words on the two curve handles, and where the handles are.
const handleWords = (page) => page.evaluate(() => {
  const read = (id) => {
    const e = document.getElementById(id), l = e && e.querySelector('.plane-handle-label');
    return { word: l ? l.textContent : null, re: e ? Number(e.dataset.re) : NaN, im: e ? Number(e.dataset.im) : NaN };
  };
  return { a: read('curves-plane-a'), b: read('curves-plane-b') };
});

// The handle words must not print on top of each other, and the orientation label (when there is one) must sit inside the curve,
// clear of the handle words and the curve itself (the cursor ring only costs a little): window.__mv.curves.orient() is what the layer drew, in canvas pixels.
async function planeTidy(page, ctx, name, { orient, offCurve = true }) {
  await settle(page, 4);
  const r = await page.evaluate(() => {
    const plane = window.__mv.planes.get('curves-plane'), cr = plane.canvas.getBoundingClientRect();
    const words = [...document.querySelectorAll('[id="curves-plane-a"] .plane-handle-label, [id="curves-plane-b"] .plane-handle-label')].map((l) => {
      const b = l.getBoundingClientRect();
      return { w: l.textContent, x0: b.left - cr.left, y0: b.top - cr.top, x1: b.right - cr.left, y1: b.bottom - cr.top };
    });
    const pts = window.__mv.curves.points().map((p) => plane.toPixel(p));
    return { words, orient: window.__mv.curves.orient(), pts, size: plane.getSize() };
  });
  const hit = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
  for (let i = 0; i < r.words.length; i++) for (let j = i + 1; j < r.words.length; j++) {
    ctx.assert(!hit(r.words[i], r.words[j]), `${name}: the handle words "${r.words[i].w}" and "${r.words[j].w}" print on top of each other`);
  }
  // a handle word never sits on the curve ('end' on the segment at (-3, -3) used to: its default side is above and to the right)
  for (const w of offCurve ? r.words : []) {       // (not on the figure eight: its centre dot is where the curve crosses itself, so its word is on the curve whatever the side)
    const box = { x0: w.x0 + 1, y0: w.y0 + 1, x1: w.x1 - 1, y1: w.y1 - 1 };
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const p = r.pts[i], q = r.pts[i + 1];
      for (let k = 0; k <= 4; k++) {
        const x = p.x + (q.x - p.x) * k / 4, y = p.y + (q.y - p.y) * k / 4;
        ctx.assert(!(x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1), `${name}: the curve runs through the handle word "${w.w}" at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      }
    }
  }
  if (!orient) { ctx.assert(r.orient === null, `${name}: no orientation label expected, got ${JSON.stringify(r.orient)}`); return; }
  const o = r.orient;
  ctx.assert(o, `${name}: the orientation label was not drawn`);
  const box = { x0: o.box.x0 + 2, y0: o.box.y0 + 1, x1: o.box.x1 - 2, y1: o.box.y1 - 1 };       // the width is an estimate: judge the inner part
  ctx.assert(o.cost < 40, `${name}: the orientation label costs ${o.cost.toFixed(1)}: it touches a handle, the curve or the outside`);
  // and it is next to its arrow: its nearest edge is within 41 px of the tip (the width is an estimate, so a little slack)
  const gap = Math.hypot(Math.max(o.box.x0 - o.tip.x, 0, o.tip.x - o.box.x1), Math.max(o.box.y0 - o.tip.y, 0, o.tip.y - o.box.y1));
  ctx.assert(gap <= 44, `${name}: the orientation label is ${gap.toFixed(0)} px from the tip of its arrow`);
  for (const w of r.words) ctx.assert(!hit(box, w), `${name}: the orientation label touches the handle word "${w.w}"`);
  ctx.assert(box.x0 >= 0 && box.y0 >= 0 && box.x1 <= r.size.w && box.y1 <= r.size.h, `${name}: the orientation label leaves the plane`);
  for (let i = 0; i + 1 < r.pts.length; i++) {                                                       // no piece of the curve runs through the words
    const p = r.pts[i], q = r.pts[i + 1], n = 4;
    for (let k = 0; k <= n; k++) {
      const x = p.x + (q.x - p.x) * k / n, y = p.y + (q.y - p.y) * k / n;
      ctx.assert(!(x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1), `${name}: the curve runs through the orientation label at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }
  }
  ctx.log(`${name}: label at t = ${o.t}, cost ${o.cost.toFixed(1)}, ${gap.toFixed(0)} px from the tip`);
}

// The answer box of the problem card: a keyboard-focusable scroller, and its hint shows exactly while the TeX is wider than the box.
async function answerHint(page, ctx, prefix) {
  await page.evaluate((p) => { document.getElementById(p + '-problem-answer').open = true; }, prefix);
  await page.waitForTimeout(350);
  const r = await page.evaluate((p) => {
    const box = document.querySelector(`[id="${p}-problem-answer"] .tex-scroll`), hint = box && box.nextElementSibling;
    return box ? { id: box.id, tabindex: box.getAttribute('tabindex'), role: box.getAttribute('role'), label: box.getAttribute('aria-label'), over: box.scrollWidth > box.clientWidth + 1, hintHidden: hint.hidden, hintText: hint.textContent } : null;
  }, prefix);
  ctx.assert(r && r.tabindex === '0' && r.role === 'group' && /scrolls sideways/.test(r.label), `${prefix}: the answer scroller must be focusable and named: ${JSON.stringify(r)}`);
  ctx.assert(r.id === `${prefix}-problem-answer-box`, `${prefix}: the answer scroller needs a stable id (CONSTRAINTS), got "${r.id}"`);
  ctx.assert(r.hintText === 'Scroll sideways to see the rest.', `${prefix}: hint text ${r.hintText}`);
  ctx.assert(r.hintHidden === !r.over, `${prefix}: the scroll hint must show exactly while the answer is wider than its box (wider: ${r.over}, hint hidden: ${r.hintHidden})`);
  if (r.over) {                                                                     // the keyboard can scroll it (smooth scrolling: wait for it)
    await page.focus(`[id="${prefix}-problem-answer"] .tex-scroll`);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(600);
    const sl = await page.evaluate((p) => document.querySelector(`[id="${p}-problem-answer"] .tex-scroll`).scrollLeft, prefix);
    ctx.assert(sl > 0, `${prefix}: ArrowRight on the focused answer box must scroll it (scrollLeft ${sl})`);
  }
  ctx.log(`${prefix} answer box: ${r.over ? 'scrolls, hint shown, arrow keys scroll it' : 'fits, no hint'}`);
  await page.evaluate((p) => { document.getElementById(p + '-problem-answer').open = false; }, prefix);
}

// With the addresses overlay on: the plane's x, y, r and Arg words, the handle words and the orientation label do not print on top of each
// other, and the orientation label keeps off the cursor ring (it used to pass over it with the overlay on at t = 0.4 on a phone).
async function addressesTidy(page, ctx, name) {
  await settle(page, 4);
  const rec = await canvasWords(page, 'curves-plane');
  const dom = await page.evaluate(() => {
    const plane = window.__mv.planes.get('curves-plane'), cr = plane.canvas.getBoundingClientRect();
    const words = [...document.querySelectorAll('[id="curves-plane-a"] .plane-handle-label, [id="curves-plane-b"] .plane-handle-label')].map((l) => {
      const b = l.getBoundingClientRect();
      return { text: l.textContent, x0: b.left - cr.left, y0: b.top - cr.top, x1: b.right - cr.left, y1: b.bottom - cr.top };
    });
    const m = /z\(t\) = ([^;]*);/.exec(document.getElementById('curves-readout').textContent);
    return { words, text: m ? m[1] : '', orient: window.__mv.curves.orient(), toPixel: null };
  });
  const z = parseCart(dom.text);
  const ring = z ? await page.evaluate((zz) => window.__mv.planes.get('curves-plane').toPixel(zz), z) : null;
  const mine = rec.words.filter((w) => w.fs >= 12 && !AXIS_NAMES.has(w.text));
  for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) {
    ctx.assert(!boxesTouch(mine[i], mine[j]), `${name}: the words "${mine[i].text}" and "${mine[j].text}" print on top of each other`);
  }
  for (const w of mine) for (const d of dom.words) ctx.assert(!boxesTouch({ x0: w.x0 + 1, y0: w.y0 + 1, x1: w.x1 - 1, y1: w.y1 - 1 }, d), `${name}: the word "${w.text}" prints on the handle word "${d.text}"`);
  if (dom.orient && ring) {
    const b = { x0: dom.orient.box.x0 + 2, y0: dom.orient.box.y0 + 1, x1: dom.orient.box.x1 - 2, y1: dom.orient.box.y1 - 1 };
    ctx.assert(!boxesTouch(b, { x0: ring.x - 12, y0: ring.y - 12, x1: ring.x + 12, y1: ring.y + 12 }), `${name}: the orientation label sits on the cursor ring`);
  }
  ctx.log(`${name}: ${mine.length} words clear of each other and of the handle words`);
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
  await planeTidy(page, ctx, 'segment', { orient: false });
  await noBraces(page, ctx, 'curves: segment');
  await answerHint(page, ctx, 'curves');
  const chipTitles = await page.evaluate(() => [...document.querySelectorAll('.problem-chip')].map((a) => a.title));
  ctx.assert(chipTitles.every((t) => !/[{}]/.test(t)), `a problem chip title has literal braces: ${JSON.stringify(chipTitles)}`);

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

  // 5. reverse: the picture, the readout and the handle words agree (the review's key interaction, -C)
  let hw = await handleWords(page);
  ctx.assert(hw.a.word === 'start' && hw.b.word === 'end', `segment handle words before Reverse: ${JSON.stringify(hw)}`);
  await clickChip(page, 'curves-reverse');
  await setSlider(page, 'curves-t', 0);
  has(await readText(page, '#curves-readout'), '-3 - 3i');
  hw = await handleWords(page);
  ctx.assert(hw.a.word === 'end' && hw.b.word === 'start', `Reverse must swap the handle words: ${JSON.stringify(hw)}`);
  ctx.assert(Math.hypot(hw.b.re + 3, hw.b.im + 3) < 1e-6 && Math.hypot(hw.a.re - 2, hw.a.im - 1) < 1e-6, 'the handles themselves do not move when the curve is reversed');
  const start0 = await readText(page, '#curves-readout');
  const z0 = parseCart((/z\(t\) = ([^;]*);/.exec(start0) || [])[1] || '');
  ctx.assert(z0 && Math.hypot(z0.re - hw.b.re, z0.im - hw.b.im) < 1e-6, `the handle called start must sit at z(0): readout ${start0}, handle (${hw.b.re}, ${hw.b.im})`);
  await setSlider(page, 'curves-t', 1);
  const z1 = parseCart((/z\(t\) = ([^;]*);/.exec(await readText(page, '#curves-readout')) || [])[1] || '');
  ctx.assert(z1 && Math.hypot(z1.re - hw.a.re, z1.im - hw.a.im) < 1e-6, 'the handle called end must sit at z(1)');
  await ctx.shot('reversed');
  await setSlider(page, 'curves-t', 0);
  await clickChip(page, 'curves-reverse');
  hw = await handleWords(page);
  ctx.assert(hw.a.word === 'start' && hw.b.word === 'end', `the words must come back: ${JSON.stringify(hw)}`);
  await setSlider(page, 'curves-t', 0);
  has(await readText(page, '#curves-readout'), '2 + i');

  // 6. the figure eight crosses itself
  await clickChip(page, 'curves-preset-eight');
  await planeTidy(page, ctx, 'eight', { orient: false, offCurve: false });
  await noBraces(page, ctx, 'curves: eight');
  ctx.assert((await page.getAttribute('#curves-orient', 'aria-pressed')) === null, 'a disabled #curves-orient must not carry aria-pressed');
  let a = await ans('curves-simple');
  ctx.assert(a.answer === 'no' && /no/.test(a.text), `eight simple: ${JSON.stringify(a)}`);
  a = await ans('curves-closed');
  ctx.assert(a.answer === 'yes', `eight closed: ${JSON.stringify(a)}`);
  ctx.assert(await page.isDisabled('#curves-orient'), 'the orientation button must be disabled for the eight');
  await ctx.shot('eight');

  // 7. the square has corners; orientation flips
  await clickChip(page, 'curves-preset-square');
  await noBraces(page, ctx, 'curves: square');
  const sq = { smooth: 'no', piecewise: 'yes', positive: 'yes', closed: 'yes', simple: 'yes' };
  for (const [k, v] of Object.entries(sq)) { a = await ans('curves-' + k); ctx.assert(a.answer === v, `square ${k}: ${JSON.stringify(a)}`); }
  await ctx.shot('square');
  await planeTidy(page, ctx, 'square forward', { orient: true });
  ctx.assert((await page.getAttribute('#curves-orient', 'aria-pressed')) === 'false', 'an enabled #curves-orient is a toggle: aria-pressed false before the flip');
  await clickChip(page, 'curves-orient');
  a = await ans('curves-positive');
  ctx.assert(a.answer === 'no', `square after orient: ${JSON.stringify(a)}`);
  ctx.assert((await page.getAttribute('#curves-orient', 'aria-pressed')) === 'true', 'aria-pressed true after the flip');
  await planeTidy(page, ctx, 'square reversed', { orient: true });
  await ctx.shot('square-reversed');
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
  await noBraces(page, ctx, 'curves: circle');
  const tk = await page.evaluate(() => { const t = document.getElementById('curves-takeaway'), sup = t.querySelector('sup.prose-sup'); return { text: t.textContent, sup: sup ? sup.textContent : null }; });
  ctx.assert(tk.sup === 'i(\u03C6 + 2\u03C0t)' && /centre \+ R e/.test(tk.text), `the circle takeaway must show its exponent as a superscript: ${JSON.stringify(tk)}`);
  await planeTidy(page, ctx, 'circle forward', { orient: true });
  await ctx.shot('circle');
  await clickChip(page, 'curves-reverse');
  await planeTidy(page, ctx, 'circle reversed', { orient: true });
  ctx.assert((await page.getAttribute('#curves-orient', 'aria-pressed')) === 'true', 'reversed circle: #curves-orient is pressed');
  await ctx.shot('circle-reversed');
  await clickChip(page, 'curves-reverse');
  await clickChip(page, 'curves-preset-arc');
  await planeTidy(page, ctx, 'half circle', { orient: false });
  await noBraces(page, ctx, 'curves: half circle');
  const arc = { closed: 'no', simple: 'yes', smooth: 'yes', positive: 'no' };
  for (const [k, v] of Object.entries(arc)) { a = await ans('curves-' + k); ctx.assert(a.answer === v, `arc ${k}: ${JSON.stringify(a)}`); }
  ctx.assert(await page.isDisabled('#curves-orient'), 'the orientation button must be disabled for the half circle');
  hw = await handleWords(page);
  ctx.assert(hw.a.word === 'centre' && hw.b.word === 'start', `half circle words: ${JSON.stringify(hw)}`);
  await clickChip(page, 'curves-reverse');
  hw = await handleWords(page);                                        // reversed it starts at 2a - b, where there is no handle, and ends at b
  ctx.assert(hw.a.word === 'centre' && hw.b.word === 'end', `reversed half circle words: ${JSON.stringify(hw)}`);
  await setSlider(page, 'curves-t', 1);
  const arcEnd = parseCart((/z\(t\) = ([^;]*);/.exec(await readText(page, '#curves-readout')) || [])[1] || '');
  ctx.assert(arcEnd && Math.hypot(arcEnd.re - hw.b.re, arcEnd.im - hw.b.im) < 1e-6, 'the reversed half circle ends at the handle called end');
  await ctx.shot('arc-reversed');
  await setSlider(page, 'curves-t', 0);
  await clickChip(page, 'curves-reverse');
  await clickChip(page, 'curves-preset-circle');
  hw = await handleWords(page);
  await clickChip(page, 'curves-reverse');                             // a closed curve starts and ends at b either way round: the words stay
  const hw2 = await handleWords(page);
  ctx.assert(hw.b.word === 'start' && hw2.b.word === 'start' && hw2.a.word === 'centre', `closed curve words after Reverse: ${JSON.stringify(hw2)}`);
  await clickChip(page, 'curves-reverse');
  await clickChip(page, 'curves-preset-arc');

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

  // 10b. b dropped on top of a (0.2 apart): the handle just let go of goes underneath, so a can still be picked up with the pointer
  await dragHandle(page, 'curves-plane-b', { re: 2, im: 1.2 });
  await settle(page, 3);
  const top = await page.evaluate(() => {
    const a = document.getElementById('curves-plane-a'), r = a.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const h = hit && hit.closest('.plane-handle');
    return { hit: h ? h.id : null, dist: Math.hypot(Number(a.dataset.re) - Number(document.getElementById('curves-plane-b').dataset.re), Number(a.dataset.im) - Number(document.getElementById('curves-plane-b').dataset.im)) };
  });
  ctx.assert(top.dist < 0.35, `b was not dropped near a: ${top.dist}`);
  ctx.assert(top.hit === 'curves-plane-a', `with b dropped on a, a must be the handle under the pointer (got ${top.hit})`);
  await dragHandle(page, 'curves-plane-a', { re: 1, im: 0 });                        // pick a up: it is the one on top; b is free now
  await dragHandle(page, 'curves-plane-b', { re: -3, im: -3 });
  await dragHandle(page, 'curves-plane-a', { re: 2, im: 1 });

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
  await addressesTidy(page, ctx, 'segment with the addresses on');
  await clickChip(page, 'curves-preset-circle');                       // the review's case: the circle, t = 0.4, addresses on, on a phone
  await setSlider(page, 'curves-t', 0.4);
  await addressesTidy(page, ctx, 'circle at t = 0.4 with the addresses on');
  await ctx.shot('circle-addresses');
  await clickChip(page, 'curves-preset-square');
  await setSlider(page, 'curves-t', 0.3);
  await addressesTidy(page, ctx, 'square at t = 0.3 with the addresses on');
  await clickChip(page, 'curves-preset-segment');
  await setSlider(page, 'curves-t', 0.5);
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

// ---- linear: layout (review issues 2, 3, 6) ------------------------------------------------------------------------

// Nothing above the control plane may change height while a or b is dragged: its top stays put and the handle stays under the pointer.
// One mouse press, the way a hand does it: the pointer visits fixed screen pixels worked out from the layout at the start, goes
// through a = 0 (where the "squashes everything" note appears), out to a far corner (where the image leaves the w-plane and the
// "off the plane" note appears) and back. Chromium's scroll anchoring would hide a shift and Safari has none, so it is switched off.
// strictDoc: also require the plane's place in the DOCUMENT to be fixed (nothing above it moved at all). At P3 the composition
// table sits above the plane and is retypeset after every step, so there the page must scroll to keep the plane still. For b with
// decimal values on a phone the sticky bar's caption ("slid by b = -0.347 - 2.347i. This is f(z) = az + b.") used to wrap to three
// lines for some values and two for others (the bar went from 101 px to 125 px and the page was scrolled to compensate); the caption no
// longer prints b (it is in the readout), every string fits two lines at the page's own font size and the bar reserves them, so nothing
// moves and `strictDoc` holds for b too. captionSweep checks the bar at every phone width from 320 to 390.
async function planeStaysPut(page, ctx, { strictDoc = true, offscreen = false, which = 'a' } = {}) {
  await page.evaluate(() => { document.documentElement.style.overflowAnchor = 'none'; });
  const home = (await page.evaluate(() => window.__mv.linear.state()))[which];
  const o = await planePixel(page, 'linear-ab', { re: 0, im: 0 });
  const u = await planePixel(page, 'linear-ab', { re: 1, im: 0 });
  const k = u.x - o.x, px = (z) => ({ x: o.x + k * z.re, y: o.y - k * z.im });
  const tops = () => page.evaluate(() => { const r = window.__mv.planes.get('linear-ab').canvas.getBoundingClientRect(); return { view: r.top, doc: r.top + window.scrollY }; });
  const base = await tops();
  const box = await page.locator(byId('linear-ab-' + which)).boundingBox();
  const path = which === 'a'
    ? [home, { re: 0, im: 0.35 }, { re: 0, im: 0 }, { re: -0.35, im: -0.35 }, { re: -1, im: -1 }, { re: 0, im: 0 }, { re: 0.35, im: 0.35 }, { re: 3, im: 3 }, { re: 4, im: -4 }, home]
    : [home, { re: 0.347, im: -1.653 }, { re: 1.234, im: -3.456 }, { re: -2.345, im: -1.234 }, { re: 3.456, im: -4.123 }, { re: -1.111, im: 2.222 }, { re: 0.05, im: -2.05 }, home];
  let worstView = 0, worstDoc = 0, worstJump = 0, sawZero = false, sawOff = false, lineCounts = new Set();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    for (let i = 1; i < path.length; i++) {
      for (let j = 1; j <= 8; j++) {
        const z = { re: path[i - 1].re + (path[i].re - path[i - 1].re) * j / 8, im: path[i - 1].im + (path[i].im - path[i - 1].im) * j / 8 };
        const q = px(z);
        await page.mouse.move(q.x, q.y);
        await settle(page, 2);
        const t = await tops(), h = await handleZ(page, 'linear-ab-' + which);
        worstView = Math.max(worstView, Math.abs(t.view - base.view));
        worstDoc = Math.max(worstDoc, Math.abs(t.doc - base.doc));
        worstJump = Math.max(worstJump, Math.hypot(h.re - z.re, h.im - z.im));
        if (which === 'a' && Math.abs(z.re) < 1e-9 && Math.abs(z.im) < 1e-9) sawZero = sawZero || (await page.isVisible('#linear-note'));
        if (which === 'a' && offscreen && z.re > 3.9 && z.im < -3.9) sawOff = sawOff || (await page.isVisible('#linear-offscreen'));
        if (which === 'b') lineCounts.add(await page.evaluate(() => { const c = document.getElementById('linear-stage-caption'); return Math.round(c.getBoundingClientRect().height / parseFloat(getComputedStyle(c).lineHeight)); }));
      }
    }
  } finally {
    await page.mouse.up();
  }
  await page.waitForTimeout(450);                                      // the explainers are retypeset a moment after the last step
  const end = await tops();
  worstView = Math.max(worstView, Math.abs(end.view - base.view));
  worstDoc = Math.max(worstDoc, Math.abs(end.doc - base.doc));
  ctx.log(`drag ${which}: plane top moved at most ${worstView.toFixed(2)} px in the viewport and ${worstDoc.toFixed(2)} px in the page; the handle was off the pointer by at most ${worstJump.toFixed(2)}${which === 'b' ? `; the stage caption had ${[...lineCounts].sort().join(' and ')} lines` : ''}`);
  ctx.assert(worstView <= 1, `the control plane moved ${worstView.toFixed(1)} px in the viewport during a drag of ${which} (content above it changed height)`);
  if (strictDoc) ctx.assert(worstDoc <= 1, `content above the control plane changed height by ${worstDoc.toFixed(1)} px during a drag of ${which}`);
  ctx.assert(worstJump < 0.25, `the handle left the pointer by ${worstJump.toFixed(2)} units`);
  if (which === 'b' && !isWide(page)) ctx.assert(lineCounts.size === 1, `the stage caption must keep one height while b is dragged on a phone (line counts ${[...lineCounts]})`);
  if (which === 'a') ctx.assert(sawZero, 'at a = 0 the note #linear-note must show');
  if (offscreen && which === 'a') ctx.assert(sawOff, 'with the image far outside the w-plane the note #linear-offscreen must show');
  await page.evaluate(() => { document.documentElement.style.overflowAnchor = ''; });
  const back = (await page.evaluate(() => window.__mv.linear.state()))[which];
  ctx.assert(Math.hypot(back.re - home.re, back.im - home.im) < 1e-6, `the drag must end where it began: ${which} = ${JSON.stringify(back)}`);
}

// The notes are laid out so that none of them can push the control plane: #linear-note is not above it, #linear-offscreen floats over
// the w-plane, #linear-compose-note is always present (only its emphasis changes).
async function noteLayout(page, ctx) {
  const r = await page.evaluate(() => {
    const ab = document.getElementById('linear-ab-viewport'), note = document.getElementById('linear-note');
    const off = document.getElementById('linear-offscreen'), cn = document.getElementById('linear-compose-note');
    return {
      noteAfterPlane: !!(ab && note && (ab.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING)),
      offPos: off ? getComputedStyle(off).position : null, offInWrap: !!(off && off.closest('.ln-wwrap')),
      composeNoteHidden: cn ? cn.hidden : null, composeNoteActive: cn ? cn.dataset.active : null,
    };
  });
  ctx.assert(r.noteAfterPlane, '#linear-note must come after the control plane in the page');
  ctx.assert(r.offPos === 'absolute' && r.offInWrap, `#linear-offscreen must float over the w-plane (position ${r.offPos})`);
  ctx.assert(r.composeNoteHidden === false && r.composeNoteActive === 'false', `#linear-compose-note must always be there: ${JSON.stringify(r)}`);
}

// Phone (design D7): both planes and the stage bar fit one screen once the block sits under the header; the bar covers nothing.
async function stageFits(page, ctx) {
  if ((page.viewportSize() || { width: 1280 }).width > 480) return;
  const r = await page.evaluate(async () => {
    const hb = document.querySelector('header').getBoundingClientRect().bottom;
    const fig = document.getElementById('linear-zplane-viewport').closest('figure');
    window.scrollTo({ top: fig.getBoundingClientRect().top + window.scrollY - (hb + 16), behavior: 'instant' });
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const w = window.__mv.planes.get('linear-wplane').canvas.getBoundingClientRect(), bar = document.getElementById('linear-stage-bar').getBoundingClientRect();
    return { wBottom: w.bottom, barTop: bar.top };
  });
  ctx.assert(r.wBottom <= r.barTop + 0.5, `the stage bar covers ${(r.wBottom - r.barTop).toFixed(1)} px of the w-plane on a phone`);
  ctx.log(`phone: the w-plane ends ${(r.barTop - r.wBottom).toFixed(1)} px above the stage bar`);
}

// The words under the stage slider sit under its positions 0, 1, 2 and 3 (design D7; they are hidden on a phone).
async function tickPlaces(page, ctx) {
  const r = await page.evaluate(() => {
    const ticks = document.querySelector('#linear-stage-bar .ln-ticks'), s = document.getElementById('linear-stage');
    if (!ticks || ticks.offsetParent === null) return null;
    const sr = s.getBoundingClientRect(), half = 8;
    return [...ticks.children].map((e, k) => { const b = e.getBoundingClientRect(); return { word: e.textContent, off: (b.left + b.width / 2) - (sr.left + half + (sr.width - 2 * half) * k / 3) }; });
  });
  if (!r) return;
  ctx.assert(r.map((e) => e.word).join(' ') === 'start spin stretch slide', `tick words: ${JSON.stringify(r)}`);
  for (const e of r) ctx.assert(Math.abs(e.off) <= 6, `the word "${e.word}" is ${e.off.toFixed(1)} px from the slider position it names`);
}

const isWide = (page) => (page.viewportSize() || { width: 1280 }).width > 480;

// The one-line readout of the composition must not scroll inside its box, however long the numbers: it breaks at the semicolon on a
// phone (always, so its height does not change while a is dragged) and stays on one line on a wide screen.
async function composeReadoutFits(page, ctx) {
  const mine = await page.inputValue('#linear-compose-c'), mineD = await page.inputValue('#linear-compose-d');
  await page.fill('#linear-compose-c', '123.456+78.9i');
  await page.fill('#linear-compose-d', '4.5678-9.1234i');
  await settle(page, 3);
  const r = await page.evaluate(() => {
    const el = document.getElementById('linear-compose-readout'), halves = [...el.querySelectorAll('.ln-nw')].map((e) => e.getBoundingClientRect());
    return { text: el.textContent, sw: el.scrollWidth, cw: el.clientWidth, sameLine: halves.length === 2 && Math.abs(halves[0].top - halves[1].top) < 2, halves: halves.length };
  });
  ctx.assert(/^ac = .*; ad \+ b = .*$/.test(r.text) && r.halves === 2, `compose readout text: ${r.text}`);
  ctx.assert(r.sw <= r.cw + 1, `the composition readout scrolls inside its box (${r.sw} against ${r.cw}): ${r.text}`);
  if (isWide(page)) ctx.assert(r.sameLine, 'on a wide screen the composition readout stays on one line');
  else ctx.assert(!r.sameLine, 'on a phone the composition readout breaks at the semicolon');
  ctx.log(`compose readout with long values: ${r.text} (${r.sw} in ${r.cw})`);
  await page.fill('#linear-compose-c', mine);
  await page.fill('#linear-compose-d', mineD);
  await settle(page, 3);
}

// ---- linear: the words on the two stage planes -------------------------------------------------------------------------

// f(0), f(1), the fixed point 'p' and the 0, 1 of the z-plane: no word on another word or on a dot, at the current stage. (At 2.1.3 on a
// phone f(0) and f(1) are 29.8 px apart, so their one merged label 'f(0), f(1)' used to sit under the word 'p' of the fixed point.)
async function stageWords(page, ctx, name) {
  await settle(page, 3);
  const info = await page.evaluate(async () => {
    const L = await import(location.origin + '/js/stations/linear.js');
    const st = window.__mv.linear.state(), f = L.stageMap(st.a, st.b, st.stage), fp = L.fixedPoint(st.a, st.b);
    const z = window.__mv.planes.get('linear-zplane'), w = window.__mv.planes.get('linear-wplane');
    const O = { re: 0, im: 0 }, one = { re: 1, im: 0 }, px = (pl, q) => (q ? pl.toPixel(q) : null);
    return { z: [px(z, O), px(z, one), px(z, fp)].filter(Boolean), w: [px(w, f(O)), px(w, f(one)), st.stage >= 3 - 1e-9 ? px(w, fp) : null].filter(Boolean) };
  });
  let n = 0;
  for (const [plane, dots] of [['linear-zplane', info.z], ['linear-wplane', info.w]]) {
    const rec = await canvasWords(page, plane);
    n += assertWordsClear(ctx, `${name}, ${plane}`, rec, dots).length;
  }
  ctx.log(`${name}: ${n} words on the two planes, none on another word or on a dot`);
}

// The bar under the planes keeps one height while the stage slider moves and a and b change, at every phone width from 320 to 390: the
// caption beside the Play button has two lines (three at 320, where the longest strings need them) and never changes, so a thumb on the
// slider is never moved by the caption. The strings do not carry the digits of b.
async function captionSweep(page, ctx) {
  if (isWide(page)) return;
  const start = page.viewportSize();
  const make = (a, b) => page.evaluate(({ a, b }) => {
    const pl = window.__mv.planes.get('linear-ab');
    pl.getHandle('a').set(a); pl.getHandle('b').set(b);
  }, { a, b });
  try {
    for (const width of [320, 340, 360, 375, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await settle(page, 3);
      const heights = new Set(), lines = new Set();
      const bs = [{ re: 0, im: -2 }, { re: -0.347, im: -2.347 }, { re: 3.456, im: -4.123 }];
      const as = [{ re: 0, im: 1 }, { re: -4.4, im: -0.05 }, { re: 4.4, im: 4.4 }, { re: 0.35, im: 0.35 }];
      for (const a of as) for (const b of bs) {
        await make(a, b);
        for (const stage of [0, 0.4, 1, 1.5, 1.999, 2, 2.6, 3]) {
          await setSlider(page, 'linear-stage', stage);
          const r = await page.evaluate(() => {
            const c = document.getElementById('linear-stage-caption'), bar = document.getElementById('linear-stage-bar');
            return { bar: Math.round(bar.getBoundingClientRect().height * 10) / 10, lines: Math.round(c.getBoundingClientRect().height / parseFloat(getComputedStyle(c).lineHeight)), text: c.textContent, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          heights.add(r.bar); lines.add(r.lines);
          ctx.assert(r.over <= 1, `${width} px: horizontal overflow ${r.over}px at stage ${stage}`);
          ctx.assert(r.lines <= (width < 336 ? 3 : 2), `${width} px: the caption "${r.text}" needs ${r.lines} lines`);
        }
      }
      ctx.assert(heights.size === 1, `${width} px: the stage bar changed height: ${[...heights]} px (caption lines ${[...lines]})`);
      ctx.assert(lines.size === 1, `${width} px: the caption changed its number of lines: ${[...lines]}`);
      ctx.log(`${width} px: the stage bar is ${[...heights][0]} px high at every stage and for every a and b (caption ${[...lines][0]} lines)`);
    }
  } finally {
    await page.setViewportSize(start);
    await settle(page, 3);
    await make({ re: 0, im: 1 }, { re: 0, im: -2 });
    await setSlider(page, 'linear-stage', 3);
  }
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
  await planeStaysPut(page, ctx, { strictDoc: true });
  await planeStaysPut(page, ctx, { strictDoc: true, which: 'b' });
  await stageWords(page, ctx, 'P4');
  await setSlider(page, 'linear-stage', 0.5);
  await stageWords(page, ctx, 'P4 at stage 0.5');
  await setSlider(page, 'linear-stage', 3);
  await noBraces(page, ctx, 'P4');
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
  ctx.assert((await page.getAttribute('#linear-compose-note', 'data-active')) === 'true', 'the note for c = 0 must be emphasised (data-active)');
  await page.fill('#linear-compose-c', '1+i');
  await page.fill('#linear-compose-d', '1');
  await settle(page, 3);
  ctx.assert((await page.getAttribute('#linear-compose-note', 'data-active')) === 'false', 'the note must go quiet again');
  await noteLayout(page, ctx);
  await composeReadoutFits(page, ctx);
  await planeStaysPut(page, ctx, { strictDoc: false, offscreen: true });
  await planeStaysPut(page, ctx, { strictDoc: false, which: 'b' });
  await stageWords(page, ctx, 'P3');
  await noBraces(page, ctx, 'P3');
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
  await stageWords(page, ctx, '2.1.3');
  await noBraces(page, ctx, '2.1.3');
  // the next station is "z^n: Fans and Parabolas": its link shows the exponent as a superscript, not a caret
  const nav = await page.evaluate(() => [...document.querySelectorAll('#station-linear .station-link')].map((a) => ({ text: a.textContent, sup: [...a.querySelectorAll('sup.prose-sup')].map((x) => x.textContent) })));
  ctx.assert(nav.length >= 3 && nav.every((a) => !a.text.includes('^') && !/[{}]/.test(a.text)), `a link shows a literal caret or brace: ${JSON.stringify(nav)}`);
  ctx.assert(nav.some((a) => a.sup.includes('n')), `the link to "z^n: Fans and Parabolas" must show the n as a superscript: ${JSON.stringify(nav)}`);
  await noteLayout(page, ctx);
  await tickPlaces(page, ctx);
  await stageFits(page, ctx);
  await planeStaysPut(page, ctx, { strictDoc: true, offscreen: true });
  await planeStaysPut(page, ctx, { strictDoc: true, which: 'b' });
  const chipTitles = await page.evaluate(() => [...document.querySelectorAll('.problem-chip')].map((a) => a.title));
  ctx.assert(chipTitles.length >= 3 && chipTitles.every((t) => !/[{}]/.test(t)), `a problem chip title has literal braces: ${JSON.stringify(chipTitles)}`);
  ctx.assert(chipTitles.some((t) => t.includes('\u221A2e^(i\u03C0/4)')), `the P4 chip title must read the exponent as e^(i\u03C0/4): ${JSON.stringify(chipTitles)}`);
  has(await readText(page, '#station-linear aside.callout'), 'The time ramp, darker early and lighter late, comes from Curves and time.');
  await answerHint(page, ctx, 'linear');

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
  for (const st of [0, 1, 2.5]) { await setSlider(page, 'linear-stage', st); await stageWords(page, ctx, `2.1.3 at stage ${st}`); }
  await setSlider(page, 'linear-stage', 3);

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
  await dragHandle(page, 'linear-ab-a', { re: 0, im: 0 });                     // a = 0: f(0) and f(1) are the same point, one label for both
  ctx.assert(Math.hypot(...Object.values(await handleZ(page, 'linear-ab-a'))) < 1e-6, 'a must be 0');
  await settle(page, 3);
  await stageWords(page, ctx, 'a = 0');
  await ctx.shot('a-zero');
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
  await captionSweep(page, ctx);
}

export default async function (page, ctx) {
  const r = ctx.route;
  if (r === 'curves' || r === 'problem-1-5-1') return curvesChecks(page, ctx);
  if (r === 'linear' || r === 'problem-2-1-3') return linearChecks(page, ctx);
  if (r === 'problem-P4') return p4Checks(page, ctx);
  if (r === 'problem-P3') return p3Checks(page, ctx);
  throw new Error(`no checks written for route ${r}`);
}
