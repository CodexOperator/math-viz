// Pure model for the two-plane picture of w = f(z).
//
// No DOM, no three.js, no timers. A function is (z) => { re, im } | null.
// The vertical gap is not a coordinate of z or of w. It is the space the strings cross.
//
// Citations are Howell & Mathews, Complex Analysis, 202 Updated Edition.

import { fmtCart } from '../core/complex.js';

const PI = Math.PI;

function freezeWin(x0, x1, y0, y1) {
  return Object.freeze({ x: Object.freeze([x0, x1]), y: Object.freeze([y0, y1]) });
}

export const PRESETS = Object.freeze([
  Object.freeze({
    id: 'sq',
    label: 'z\u00b2',
    src: 'z^2',
    input: freezeWin(-1.35, 1.35, -1.35, 1.35),
    output: freezeWin(-2.2, 2.2, -4.2, 4.2),
    cite: 'Howell & Mathews, Complex Analysis, Chapter 2, \u00a72, page 55. The mapping w = z^n. The purple sheet is covered twice.',
  }),
  Object.freeze({
    id: 'exp',
    label: 'e^z',
    src: 'exp(z)',
    input: freezeWin(-1.15, 1.05, -PI, PI),
    output: freezeWin(-3.2, 3.2, -3.2, 3.2),
    cite: 'Howell & Mathews, Complex Analysis, Chapter 5, \u00a71, pages 132\u2013134. Identity (5.1) and Figures 5.1, 5.2, and 5.3. The series is Definition 5.1, page 130.',
  }),
  Object.freeze({
    id: 'log',
    label: 'ln z',
    src: 'log(z)',
    input: freezeWin(-2, 2, -2, 2),
    output: freezeWin(-1.55, 1.25, -3.6, 3.6),
    cite: 'Howell & Mathews, Complex Analysis, Chapter 5, \u00a72, pages 137\u2013141. Definition 5.2. Figure 5.5, page 141, is the Riemann surface this one branch is cut from.',
  }),
]);

const BY_SRC = new Map(PRESETS.map((p) => [p.src, p]));

export function presetForSrc(src) {
  return BY_SRC.get(String(src || '').trim()) || null;
}

export function finite(w) {
  return !!w && Number.isFinite(w.re) && Number.isFinite(w.im);
}

export function ev(f, z) {
  try {
    const w = f(z);
    return finite(w) ? w : null;
  } catch {
    return null;
  }
}

function dist(a, b) {
  if (!a || !b) return Infinity;
  return Math.hypot(a.re - b.re, a.im - b.im);
}

function looksLikeExp(f) {
  const ys = PI / 2;
  const args = [];
  const mods = [];
  for (const x of [-1, -0.5, 0, 0.5, 1]) {
    const w = ev(f, { re: x, im: ys });
    if (!w) return false;
    args.push(Math.atan2(w.im, w.re));
    mods.push(Math.hypot(w.re, w.im));
  }
  if (!args.every((a) => Math.abs(a - ys) < 0.2)) return false;
  for (let i = 1; i < mods.length; i++) {
    if (!(mods[i] > mods[i - 1] * 1.2)) return false;
  }
  for (const y of [-2, -1, 0, 1, 2]) {
    const w = ev(f, { re: 0, im: y });
    if (!w || Math.abs(Math.hypot(w.re, w.im) - 1) > 0.08) return false;
  }
  let min = Infinity;
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 5; i++) {
      const w = ev(f, { re: -1 + i * 0.5, im: -1.2 + j * 0.6 });
      if (!w) continue;
      min = Math.min(min, Math.hypot(w.re, w.im));
    }
  }
  return min > 0.15;
}

const WITNESS = Object.freeze({ re: 0.6, im: 0.8 });

/** What this f does to the negative axis, to a point and its opposite, and to the exponential strip. */
export function measure(f) {
  const above = ev(f, { re: -1, im: 0.08 });
  const below = ev(f, { re: -1, im: -0.08 });
  const calmA = ev(f, { re: 1, im: 0.08 });
  const calmB = ev(f, { re: 1, im: -0.08 });
  const gap = dist(above, below);
  const calm = dist(calmA, calmB);
  const cut = gap > Math.max(0.6, 8 * (Number.isFinite(calm) ? calm : 0));
  const z = WITNESS;
  const mz = { re: -z.re, im: -z.im };
  const fz = ev(f, z);
  const fmz = ev(f, mz);
  const doubleCover = !!fz && !!fmz && dist(fz, fmz) < 0.05 && dist(z, mz) > 0.2;
  const expShape = !cut && !doubleCover && looksLikeExp(f);
  return { cut, gap, calm, above, below, doubleCover, expShape, z, mz, fz, fmz, holds: cut };
}

function fmt(w) {
  return w ? fmtCart(w, 2) : 'nowhere';
}

/** The sentence under the picture. holds is "the negative axis is a branch cut". */
export function describe(f) {
  const m = measure(f);
  let text;
  if (m.cut && m.gap > 4) {
    text = 'The orange ray is a branch cut. The two sides land at ' + fmt(m.above) + ' and ' + fmt(m.below) + ', about a full turn apart.';
  } else if (m.cut) {
    text = 'The orange ray is a branch cut. The two sides land at ' + fmt(m.above) + ' and ' + fmt(m.below) + ', and those landings do not meet.';
  } else if (m.doubleCover) {
    text = 'There is no cut. ' + fmt(m.z) + ' and ' + fmt(m.mz) + ' are different points on the green sheet, and both strings land at ' + fmt(m.fz) + '.';
  } else if (m.expShape) {
    text = 'There is no cut. The top and bottom of the green strip land on the same ray, vertical lines become circles, and no string lands on 0.';
  } else {
    text = 'There is no cut on the negative axis. The two sides land at ' + fmt(m.above) + ' and ' + fmt(m.below) + '.';
  }
  return { ...m, text };
}

export function density(cssWidth) {
  const narrow = !(cssWidth >= 700);
  return { strings: narrow ? 36 : 56, texture: narrow ? 160 : 256, guides: 7 };
}

/** How far apart the sheets sit, in the same units as the windows. Not a value of f. */
export function lift(input, output) {
  const a = Math.max(input.x[1] - input.x[0], input.y[1] - input.y[0]);
  const b = Math.max(output.x[1] - output.x[0], output.y[1] - output.y[0]);
  return Math.max(2.6, 0.46 * Math.max(a, b));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** A window that holds the middle of the image and drops the spikes (a pole, log near 0). */
export function frameOutput(f, input) {
  const re = [];
  const im = [];
  const n = 25;
  for (let j = 0; j < n; j++) {
    const y = lerp(input.y[0], input.y[1], j / (n - 1));
    for (let i = 0; i < n; i++) {
      const x = lerp(input.x[0], input.x[1], i / (n - 1));
      const w = ev(f, { re: x, im: y });
      if (!w || Math.hypot(w.re, w.im) > 12) continue;
      re.push(w.re);
      im.push(w.im);
    }
  }
  if (re.length < 8) return freezeWin(-2, 2, -2, 2);
  let x0 = Math.min(...re);
  let x1 = Math.max(...re);
  let y0 = Math.min(...im);
  let y1 = Math.max(...im);
  const padX = Math.max(0.25, (x1 - x0) * 0.1);
  const padY = Math.max(0.25, (y1 - y0) * 0.1);
  x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
  if (x1 - x0 < 1) { const c = (x0 + x1) / 2; x0 = c - 0.5; x1 = c + 0.5; }
  if (y1 - y0 < 1) { const c = (y0 + y1) / 2; y0 = c - 0.5; y1 = c + 0.5; }
  return { x: [x0, x1], y: [y0, y1] };
}

function inside(w, output) {
  if (!w) return false;
  const padX = (output.x[1] - output.x[0]) * 0.04;
  const padY = (output.y[1] - output.y[0]) * 0.04;
  return w.re >= output.x[0] - padX && w.re <= output.x[1] + padX
    && w.im >= output.y[0] - padY && w.im <= output.y[1] + padY;
}

function jumpLimit(output) {
  return 0.34 * Math.min(output.x[1] - output.x[0], output.y[1] - output.y[0]);
}

function polylines(points, output, jump) {
  const parts = [];
  let cur = [];
  const push = () => {
    if (cur.length > 2) parts.push(Float32Array.from(cur));
    cur = [];
  };
  let prev = null;
  for (const w of points) {
    if (!inside(w, output)) { push(); prev = null; continue; }
    if (prev && Math.hypot(w.re - prev.re, w.im - prev.im) > jump) push();
    cur.push(w.re, w.im);
    prev = w;
  }
  push();
  return parts;
}

function lineSamples(f, fixed, vary0, vary1, horizontal, samples) {
  const pts = [];
  for (let i = 0; i < samples; i++) {
    const t = lerp(vary0, vary1, i / (samples - 1));
    const z = horizontal ? { re: t, im: fixed } : { re: fixed, im: t };
    pts.push(ev(f, z));
  }
  return pts;
}

/**
 * Strings from the input grid to its image, the blue guide grid's image, and the two
 * sides of the negative axis. A segment that jumps (a cut, a pole) is not drawn.
 */
export function buildForest(f, input, output, n, guides = 7) {
  const strings = new Float32Array(n * n * 4);
  let count = 0;
  for (let j = 0; j < n; j++) {
    const y = lerp(input.y[0], input.y[1], n === 1 ? 0 : j / (n - 1));
    for (let i = 0; i < n; i++) {
      const x = lerp(input.x[0], input.x[1], n === 1 ? 0 : i / (n - 1));
      const w = ev(f, { re: x, im: y });
      if (!inside(w, output)) continue;
      const k = count * 4;
      strings[k] = x;
      strings[k + 1] = y;
      strings[k + 2] = w.re;
      strings[k + 3] = w.im;
      count += 1;
    }
  }
  const jump = jumpLimit(output);
  const samples = 72;
  const grid = [];
  for (let g = 0; g < guides; g++) {
    const t = guides === 1 ? 0.5 : g / (guides - 1);
    const x = lerp(input.x[0], input.x[1], t);
    const y = lerp(input.y[0], input.y[1], t);
    grid.push({
      axis: 'y',
      at: x,
      source: Float32Array.of(x, input.y[0], x, input.y[1]),
      parts: polylines(lineSamples(f, x, input.y[0], input.y[1], false, samples), output, jump),
    });
    grid.push({
      axis: 'x',
      at: y,
      source: Float32Array.of(input.x[0], y, input.x[1], y),
      parts: polylines(lineSamples(f, y, input.x[0], input.x[1], true, samples), output, jump),
    });
  }
  const left = Math.min(input.x[0], -0.05);
  const right = -0.04;
  const upper = [];
  const lower = [];
  if (left < right) {
    const m = 64;
    for (let i = 0; i < m; i++) {
      const x = lerp(left, right, i / (m - 1));
      upper.push(ev(f, { re: x, im: 0.02 }));
      lower.push(ev(f, { re: x, im: -0.02 }));
    }
  }
  return {
    strings,
    count,
    grid,
    cut: {
      upper: polylines(upper, output, jump),
      lower: polylines(lower, output, jump),
    },
  };
}
