// CPU picture of one composition. The same colour rules as the shader.
// JavaScript numbers are float64, so this is also the deep-zoom tier.

import { clamp01, sliceCenter, sliceLift } from './family.js';

export function mix(a, b, t) {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

function smooth(e0, e1, x) {
  if (e0 === e1) return x < e0 ? 0 : 1;
  const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
}

export function palette(ink, t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  // The void is already navy, so the first ink is blue, then orange, then purple.
  let c = mix(ink.cart, ink.polar, smooth(0, 0.48, x));
  c = mix(c, ink.output, smooth(0.32, 0.88, x));
  return c;
}

export function csqrt(re, im) {
  if (re === 0 && im === 0) return [0, 0];
  const m = Math.hypot(re, im);
  return [Math.sqrt((m + re) / 2), (im < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (m - re) / 2))];
}

export function newtonRoots(c) {
  const s = csqrt(1 - 4 * c[0], -4 * c[1]);
  return [[1, 0], [(-1 + s[0]) / 2, s[1] / 2], [(-1 - s[0]) / 2, (-s[1]) / 2]];
}

function cmul(a, b) {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function cpow(z, n) {
  let r = [1, 0];
  const k = n | 0;
  for (let i = 0; i < k; i++) r = cmul(r, z);
  return r;
}

// The d-th roots of 1. Equation 1.5.5. Degree stays in 3, 4, or 5.
export function unityDegree(d) {
  const n = d | 0;
  return n < 3 ? 3 : n > 5 ? 5 : n;
}

export function unityRoots(d) {
  const n = unityDegree(d);
  const roots = [];
  for (let k = 0; k < n; k++) {
    const th = (2 * Math.PI * k) / n;
    roots.push([Math.cos(th), Math.sin(th)]);
  }
  return roots;
}

// Newton on p(z) = z^d − 1. N(z) = ((d−1)/d) z + 1/(d z^{d−1}).
export function unityStep(z, d) {
  const n = unityDegree(d);
  const zm = cpow(z, n - 1);
  const dp0 = n * zm[0];
  const dp1 = n * zm[1];
  const mag = dp0 * dp0 + dp1 * dp1;
  if (mag < 1e-300) return null;
  const zd = cmul(zm, z);
  const q0 = ((zd[0] - 1) * dp0 + zd[1] * dp1) / mag;
  const q1 = (zd[1] * dp0 - (zd[0] - 1) * dp1) / mag;
  return [z[0] - q0, z[1] - q1];
}

export function sampleUnity(z0, d, maxIter) {
  const n = unityDegree(d);
  const roots = unityRoots(n);
  let z = [z0[0], z0[1]];
  let trap = Math.min(Math.hypot(z[0], z[1]), Math.abs(z[0]), Math.abs(z[1]));
  const mx = maxIter | 0;
  for (let k = 1; k <= mx; k++) {
    const next = unityStep(z, n);
    if (!next || !isFinite(next[0]) || !isFinite(next[1])) return finish(k, z, n, trap, -1, false);
    z = next;
    trap = Math.min(trap, Math.hypot(z[0], z[1]), Math.abs(z[0]), Math.abs(z[1]));
    const hit = nearestRoot(z, roots);
    if (hit.d2 < 1e-12) return finish(k, z, n, trap, hit.index, false);
  }
  return finish(mx, z, n, trap, nearestRoot(z, roots).index, false);
}

// The set of c for z^d + c sits in a tighter window than the quadratic.
export const POWER_WINDOW = { cx: 0, cy: 0, span: 2.4 };

export function unityFrames(w, h, kind, stacked) {
  if (kind !== 'split-unity') {
    return { basins: { x: 0, y: 0, w, h }, power: null, stacked: false };
  }
  if (stacked) {
    const pane = Math.max(1, h >> 1);
    return {
      basins: { x: 0, y: 0, w, h: pane },
      power: { x: 0, y: pane, w, h: h - pane },
      stacked: true,
    };
  }
  const pane = Math.max(1, w >> 1);
  return {
    basins: { x: 0, y: 0, w: pane, h },
    power: { x: pane, y: 0, w: w - pane, h },
    stacked: false,
  };
}

// The set of c, and beside it the Julia set of the marked c. The Julia pane starts at this window and follows a pinch.
export const JULIA_WINDOW = { cx: 0, cy: 0, span: 3.2 };

// Angle 0 lands at 1/4. Angle 1/2 lands at −2. A tail past each landing
// is what makes the stroke a ray. A wide pane already holds both. A tall
// phone pane, on the stored span, clips the tip and leaves angle 0 a stub.
const RAY_LO = -2;
const RAY_HI = 0.25;
const RAY_TAIL = 0.5;

export function raysIndexWindow(paneW, paneH, stored) {
  const cx = Number(stored && stored.cx);
  const cy = Number(stored && stored.cy);
  const span = Number(stored && stored.span);
  const win = {
    cx: Number.isFinite(cx) ? cx : -0.6,
    cy: Number.isFinite(cy) ? cy : 0,
    span: span > 0 ? span : 3.2,
  };
  const aspect = Math.max(1, paneW) / Math.max(1, paneH);
  const half = win.span * aspect * 0.5;
  const lo = RAY_LO - RAY_TAIL;
  const hi = RAY_HI + RAY_TAIL;
  if (win.cx - half <= lo && win.cx + half >= hi) return win;
  return { cx: (RAY_LO + RAY_HI) / 2, cy: 0, span: (hi - lo) / aspect };
}

// At the tip the Julia set is the segment [-2, 2]. A tall phone pane, on the
// stored span 2.6, reaches only about ±0.8 on the real axis, so z = 2 is
// off the glass. This widens the picture. It does not rewrite the stored span.
// The set of c, and the polar point −1 + i√3, in one frame. The window does
// not follow a drag: the point moves, and both addresses stay on the glass.
export function joinIndexWindow(paneW, paneH) {
  const aspect = Math.max(1, paneW) / Math.max(1, paneH);
  const loRe = -2.2;
  const hiRe = 0.7;
  const loIm = -1.5;
  const hiIm = 2.15;
  const needV = hiIm - loIm;
  const needH = (hiRe - loRe) / aspect;
  const span = Math.max(needV, needH);
  return { cx: (loRe + hiRe) / 2, cy: (loIm + hiIm) / 2, span };
}

export function tipJuliaWindow(paneW, paneH, c, stored) {
  const span0 = stored && stored.span > 0 ? stored.span : 2.6;
  const base = { cx: 0, cy: 0, span: span0 };
  const re = Array.isArray(c) ? +c[0] : +c;
  if (!(Math.abs(re + 2) <= 1e-4)) return base;
  const aspect = Math.max(1, paneW) / Math.max(1, paneH);
  const half = base.span * aspect * 0.5;
  const lo = -2 - 0.18;
  const hi = 2 + 0.18;
  if (base.cx - half <= lo && base.cx + half >= hi) return base;
  return { cx: 0, cy: 0, span: (hi - lo) / aspect };
}

// The roots and a far guess, in one frame. The assembler window stays span 3.
// This window is the picture, so 2.2 + 1.1i still sits on the glass.
export function fallBasinWindow(paneW, paneH) {
  const aspect = Math.max(1, paneW) / Math.max(1, paneH);
  const reach = 2.75;
  const span = Math.max(reach * 2, (reach * 2) / aspect);
  return { cx: 0, cy: 0, span };
}

export function diaryFrames(w, h, kind, stacked) {
  const side = kind === 'twins' || kind === 'bulbs' || kind === 'cascade' || kind === 'rays' || kind === 'pole' || kind === 'join' || kind === 'climb' || kind === 'fall' || kind === 'lean';
  if (kind !== 'split-diary' && !side) {
    return { index: { x: 0, y: 0, w, h }, julia: null, stacked: false };
  }
  // Twins and bulbs stay side by side. A phone is short, and a stack would
  // spend the height the pictures need.
  if (stacked && !side) {
    const pane = Math.max(1, h >> 1);
    return {
      index: { x: 0, y: 0, w, h: pane },
      julia: { x: 0, y: pane, w, h: h - pane },
      stacked: true,
    };
  }
  const pane = Math.max(1, w >> 1);
  return {
    index: { x: 0, y: 0, w: pane, h },
    julia: { x: pane, y: 0, w: w - pane, h },
    stacked: false,
  };
}

function paneHolds(frame, x, y) {
  return frame && x >= frame.x && y >= frame.y && x < frame.x + frame.w && y < frame.y + frame.h;
}

// Left, or the whole picture: basins of z^d − 1. Right: the set of c for z^d + c.
export function bakeUnityImage(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const rgba = opts.rgba || new Uint8ClampedArray(w * h * 4);
  const comp = opts.comp;
  const ink = opts.ink;
  const maxIter = opts.maxIter | 0;
  const y0 = opts.y0 | 0;
  const y1 = opts.y1 == null ? h : opts.y1 | 0;
  const d = unityDegree(comp.map.d);
  const frames = unityFrames(w, h, comp.view.kind, !!opts.stacked);
  const colour = comp.colour === 'trap' ? 'trap' : 'basin';
  const basinWin = comp.view.window || { cx: 0, cy: 0, span: 3 };
  const powerWin = comp.view.power || POWER_WINDOW;
  const focus = comp.map.c || [0, 0];
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const power = paneHolds(frames.power, x, y);
      const frame = power ? frames.power : frames.basins;
      if (!paneHolds(frame, x, y)) continue;
      const u = (x + 0.5 - frame.x) / Math.max(1, frame.w);
      const v = (y + 0.5 - frame.y) / Math.max(1, frame.h);
      const win = power ? powerWin : basinWin;
      const aspect = frame.w / Math.max(1, frame.h);
      const re = win.cx + (u - 0.5) * win.span * aspect;
      const im = win.cy + (0.5 - v) * win.span;
      let s;
      let rgb;
      if (power) {
        s = samplePoint('poly', [0, 0], [re, im], d, maxIter, 'smooth');
        rgb = colourOf(s, 'smooth', ink);
        const dx = (re - focus[0]) / (win.span * aspect) * frame.w;
        const dy = (im - focus[1]) / win.span * frame.h;
        const dist = Math.hypot(dx, dy);
        if (dist > 5 && dist < 9) {
          rgb = ink.polar;
          s = { n: 0, nu: 0, G: 0, trap: 0, root: -1, escaped: true, degree: d };
        }
      } else {
        s = sampleUnity([re, im], d, maxIter);
        // Wide bands survive the scale-up. A 45% blend of two inks is a new colour.
        const period = Math.max(8, Math.round(Math.min(frame.w, frame.h) / 8));
        const phase = Math.floor((x + y) / period) & 1;
        rgb = colourOf(s, colour, ink, phase);
      }
      const i = (y * w + x) * 4;
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = byte(Math.round(255 * diaryN(s.n)));
    }
  }
  return { rgba, w, h, frames };
}

// Left: basins of z^d − 1. Right: the book's sphere, painted by the overlay.
export function bakeFallImage(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const rgba = opts.rgba || new Uint8ClampedArray(w * h * 4);
  const comp = opts.comp;
  const ink = opts.ink;
  const maxIter = opts.maxIter | 0;
  const y0 = opts.y0 | 0;
  const y1 = opts.y1 == null ? h : opts.y1 | 0;
  const d = unityDegree(comp.map.d);
  const frames = diaryFrames(w, h, 'fall', false);
  const basinWin = fallBasinWindow(frames.index.w, frames.index.h);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const right = paneHolds(frames.julia, x, y);
      const frame = right ? frames.julia : frames.index;
      if (!paneHolds(frame, x, y)) continue;
      const i = (y * w + x) * 4;
      if (right) {
        rgba[i] = byte(ink.navy[0]);
        rgba[i + 1] = byte(ink.navy[1]);
        rgba[i + 2] = byte(ink.navy[2]);
        rgba[i + 3] = 255;
        continue;
      }
      const u = (x + 0.5 - frame.x) / Math.max(1, frame.w);
      const v = (y + 0.5 - frame.y) / Math.max(1, frame.h);
      const aspect = frame.w / Math.max(1, frame.h);
      const re = basinWin.cx + (u - 0.5) * basinWin.span * aspect;
      const im = basinWin.cy + (0.5 - v) * basinWin.span;
      const s = sampleUnity([re, im], d, maxIter);
      const period = Math.max(8, Math.round(Math.min(frame.w, frame.h) / 8));
      const phase = Math.floor((x + y) / period) & 1;
      const rgb = colourOf(s, 'basin', ink, phase);
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = 255;
    }
  }
  return { rgba, w, h, frames };
}

// Left: basins of (z−1)(z²+z+c). Right: the book's sphere, painted by the overlay.
// Degree 2 keeps this cubic off the z^d − 1 draw. Three roots still take three inks.
export function bakeLeanImage(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const rgba = opts.rgba || new Uint8ClampedArray(w * h * 4);
  const comp = opts.comp;
  const ink = opts.ink;
  const maxIter = opts.maxIter | 0;
  const y0 = opts.y0 | 0;
  const y1 = opts.y1 == null ? h : opts.y1 | 0;
  const c = comp.map.c || [0.5, 0];
  const frames = diaryFrames(w, h, 'lean', false);
  const basinWin = fallBasinWindow(frames.index.w, frames.index.h);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const right = paneHolds(frames.julia, x, y);
      const frame = right ? frames.julia : frames.index;
      if (!paneHolds(frame, x, y)) continue;
      const i = (y * w + x) * 4;
      if (right) {
        rgba[i] = byte(ink.navy[0]);
        rgba[i + 1] = byte(ink.navy[1]);
        rgba[i + 2] = byte(ink.navy[2]);
        rgba[i + 3] = 255;
        continue;
      }
      const u = (x + 0.5 - frame.x) / Math.max(1, frame.w);
      const v = (y + 0.5 - frame.y) / Math.max(1, frame.h);
      const aspect = frame.w / Math.max(1, frame.h);
      const re = basinWin.cx + (u - 0.5) * basinWin.span * aspect;
      const im = basinWin.cy + (0.5 - v) * basinWin.span;
      const s = samplePoint('newton', [re, im], c, 2, maxIter, 'basin');
      const period = Math.max(8, Math.round(Math.min(frame.w, frame.h) / 8));
      const phase = Math.floor((x + y) / period) & 1;
      const rgb = colourOf(s, 'basin', ink, phase);
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = 255;
    }
  }
  return { rgba, w, h, frames };
}

// CPU fallback for the diary. The index is the orbit of 0. The other pane is z² + c.
export function bakeDiaryImage(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const rgba = opts.rgba || new Uint8ClampedArray(w * h * 4);
  const comp = opts.comp;
  const ink = opts.ink;
  const maxIter = opts.maxIter | 0;
  const juliaIter = (opts.maxIterJulia | 0) || maxIter;
  const y0 = opts.y0 | 0;
  const y1 = opts.y1 == null ? h : opts.y1 | 0;
  const colour = comp.colour === 'escape' ? 'escape' : comp.colour === 'trap' ? 'trap' : 'smooth';
  const frames = diaryFrames(w, h, comp.view.kind, !!opts.stacked);
  const focus = comp.map.c || [0, 0];
  const storedWin = comp.view.window || { cx: -0.6, cy: 0, span: 3.2 };
  const kind = comp.view.kind;
  const indexWin = kind === 'rays'
    ? raysIndexWindow(frames.index.w, frames.index.h, storedWin)
    : (kind === 'join' || kind === 'climb')
      ? joinIndexWindow(frames.index.w, frames.index.h)
      : storedWin;
  const whole = kind === 'twins' || kind === 'bulbs' || kind === 'cascade' || kind === 'rays' || kind === 'pole' || kind === 'join' || kind === 'climb';
  const storedJulia = comp.view.julia || (whole ? { cx: 0, cy: 0, span: 2.6 } : JULIA_WINDOW);
  const juliaWin = (kind === 'rays' || kind === 'cascade' || kind === 'pole' || kind === 'join')
    ? tipJuliaWindow(frames.julia ? frames.julia.w : w, frames.julia ? frames.julia.h : h, focus, storedJulia)
    : storedJulia;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const juliaPane = paneHolds(frames.julia, x, y);
      const frame = juliaPane ? frames.julia : frames.index;
      if (!paneHolds(frame, x, y)) continue;
      const i = (y * w + x) * 4;
      // The cascade draws the real orbit on the overlay. The field stays a
      // still ground so the diagram is not a second fractal of c.
      // The climb's right pane is the book's sphere, drawn by the overlay.
      if (juliaPane && comp.view.kind === 'climb') {
        rgba[i] = byte(ink.navy[0]);
        rgba[i + 1] = byte(ink.navy[1]);
        rgba[i + 2] = byte(ink.navy[2]);
        rgba[i + 3] = 255;
        continue;
      }
      if (!juliaPane && (comp.view.kind === 'cascade' || comp.view.kind === 'pole')) {
        rgba[i] = byte(ink.navy[0]);
        rgba[i + 1] = byte(ink.navy[1]);
        rgba[i + 2] = byte(ink.navy[2]);
        rgba[i + 3] = 255;
        continue;
      }
      const u = (x + 0.5 - frame.x) / Math.max(1, frame.w);
      const v = (y + 0.5 - frame.y) / Math.max(1, frame.h);
      const win = juliaPane ? juliaWin : indexWin;
      const aspect = frame.w / Math.max(1, frame.h);
      const re = win.cx + (u - 0.5) * win.span * aspect;
      const im = win.cy + (0.5 - v) * win.span;
      const s = juliaPane
        ? samplePoint('julia', [re, im], focus, 2, juliaIter, colour)
        : samplePoint('mandel', [re, im], focus, 2, maxIter, colour);
      let rgb = colourOf(s, colour, ink);
      // Bulbs and the cascade draw their own marks on the overlay.
      if (!juliaPane && comp.view.kind !== 'bulbs' && comp.view.kind !== 'cascade' && comp.view.kind !== 'rays' && comp.view.kind !== 'pole' && comp.view.kind !== 'join' && comp.view.kind !== 'climb') {
        const dx = (re - focus[0]) / (win.span * aspect) * frame.w;
        const dy = (im - focus[1]) / win.span * frame.h;
        const dist = Math.hypot(dx, dy);
        if (dist > 5 && dist < 9) {
          rgb = ink.polar;
          s.n = 0;
        }
      }
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = byte(Math.round(255 * diaryN(s.n)));
    }
  }
  return { rgba, w, h, frames };
}

export function newtonStep(z, c) {
  const z2 = cmul(z, z);
  const z3 = cmul(z2, z);
  const cm1 = [c[0] - 1, c[1]];
  const dp = [3 * z2[0] + cm1[0], 3 * z2[1] + cm1[1]];
  if (Math.hypot(dp[0], dp[1]) < 1e-300) return null;
  const p = cmul(cm1, z);
  const pz = [z3[0] + p[0] - c[0], z3[1] + p[1] - c[1]];
  const mag = dp[0] * dp[0] + dp[1] * dp[1];
  const q = [(pz[0] * dp[0] + pz[1] * dp[1]) / mag, (pz[1] * dp[0] - pz[0] * dp[1]) / mag];
  return [z[0] - q[0], z[1] - q[1]];
}

function nearestRoot(z, roots) {
  let best = -1;
  let bestD = Infinity;
  for (let k = 0; k < roots.length; k++) {
    const d = (z[0] - roots[k][0]) ** 2 + (z[1] - roots[k][1]) ** 2;
    if (d < bestD) { bestD = d; best = k; }
  }
  return { index: best, d2: bestD };
}

// One orbit. colour picks the bailout: escape uses 2, smooth / curvature / height use 256.
export function samplePoint(kind, z0, c, d, maxIter, colour) {
  const newton = kind === 'newton';
  const bail = newton ? Infinity : colour === 'escape' ? 2 : colour === 'trap' ? 64 : 256;
  const roots = newton ? newtonRoots(c) : null;
  let z = kind === 'mandel' ? [0, 0] : [z0[0], z0[1]];
  const cc = kind === 'mandel' ? [z0[0], z0[1]] : c;
  const deg = d | 0 || 2;
  let trap = Math.min(Math.hypot(z[0], z[1]), Math.abs(z[0]), Math.abs(z[1]));
  const mx = maxIter | 0;
  for (let n = 1; n <= mx; n++) {
    if (newton) {
      const next = newtonStep(z, cc);
      if (!next || !isFinite(next[0]) || !isFinite(next[1])) {
        return finish(n, z, deg, trap, -1, false);
      }
      z = next;
      trap = Math.min(trap, Math.hypot(z[0], z[1]), Math.abs(z[0]), Math.abs(z[1]));
      const hit = nearestRoot(z, roots);
      if (hit.d2 < 1e-12) return finish(n, z, deg, trap, hit.index, false);
    } else {
      const zd = deg === 2 ? cmul(z, z) : cpow(z, deg);
      z = [zd[0] + cc[0], zd[1] + cc[1]];
      if (!isFinite(z[0]) || !isFinite(z[1])) return finish(n, z, deg, trap, -1, true);
      trap = Math.min(trap, Math.hypot(z[0], z[1]), Math.abs(z[0]), Math.abs(z[1]));
      if (Math.hypot(z[0], z[1]) > bail) return finish(n, z, deg, trap, -1, true);
    }
  }
  const root = roots ? nearestRoot(z, roots).index : -1;
  return finish(mx, z, deg, trap, root, false);
}

function finish(n, z, d, trap, root, escaped) {
  const mag = Math.hypot(z[0] || 0, z[1] || 0);
  let nu = n;
  let G = 0;
  if (mag > 1 && isFinite(mag)) {
    const logm = Math.log(mag);
    const ll = Math.log(logm);
    if (escaped && isFinite(ll)) nu = n + 1 - ll / Math.log(d);
    G = logm / (d ** n);
    if (!isFinite(G)) G = 0;
  }
  return { n, nu, G: isFinite(G) ? G : 0, trap: isFinite(trap) ? trap : 1, root, escaped, degree: d };
}

// Three teaching inks for three roots. A fourth root is one root in two inks,
// blue and orange in turns. A fifth is orange and purple in turns. A blend of
// two inks is a new colour, so the stripe keeps both. The count of roots is
// the degree. Green stays the guess, not a root.
export function basinHue(index, degree, ink, phase) {
  const stops = [ink.cart, ink.polar, ink.output];
  if (index == null || index < 0) return ink.navy;
  if (!((degree | 0) > 3) || index < 3) return stops[index] || ink.navy;
  const pair = index === 3 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  return pair[(phase | 0) & 1];
}

export function colourOf(s, colour, ink, phase) {
  if (colour === 'basin') {
    const hue = basinHue(s.root, s.degree || 3, ink, phase);
    const v = Math.min(1, Math.max(0, 1 - s.n / 40));
    return mix(ink.navy, hue, 0.28 + 0.72 * v);
  }
  if (colour === 'trap') {
    return mix(ink.navy, ink.input, Math.exp(-8 * Math.min(s.trap, 8)));
  }
  if (!s.escaped) return mix(ink.navy, ink.cart, 0.82);
  if (colour === 'escape') return palette(ink, (s.n % 16) / 16);
  return palette(ink, Math.min(1, Math.max(0, s.nu / 32)));
}

function byte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

// RGBA8. Alpha holds diaryN (low escape times first), not n/maxIter, so the roll does not blink.
export function bakeImage(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const comp = opts.comp;
  const ink = opts.ink;
  const maxIter = opts.maxIter | 0;
  const rgba = opts.rgba || new Uint8ClampedArray(w * h * 4);
  const y0 = opts.y0 | 0;
  const y1 = opts.y1 == null ? h : opts.y1 | 0;
  const x0 = opts.x0 | 0;
  const x1 = opts.x1 == null ? w : opts.x1 | 0;
  const kind = comp.map.kind;
  const d = comp.map.d | 0;
  const colour = comp.colour === 'curvature' ? 'smooth' : comp.colour;
  const split = comp.view.kind === 'split-param';
  const win = comp.view.window;
  const right = { cx: -0.6, cy: 0, span: 3.2 };
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const rightPane = split && x >= w / 2;
      const pw = split ? w / 2 : w;
      const px = rightPane ? x - w / 2 : x;
      const ww = rightPane ? right : win;
      const kindHere = rightPane ? 'mandel' : kind;
      const aspect = pw / h;
      const re = ww.cx + ((px + 0.5) / pw - 0.5) * ww.span * aspect;
      const im = ww.cy + (0.5 - (y + 0.5) / h) * ww.span;
      let s = samplePoint(kindHere, [re, im], comp.map.c, rightPane ? d : d, maxIter, colour);
      let rgb = colourOf(s, colour, ink);
      if (rightPane) {
        const dx = (re - comp.map.c[0]) / (ww.span * aspect) * pw;
        const dy = (im - comp.map.c[1]) / ww.span * h;
        const dist = Math.hypot(dx, dy);
        if (dist > 5 && dist < 9) {
          rgb = ink.polar;
          s = { n: 0, nu: 0, G: 0, trap: 0, root: -1, escaped: true };
        }
      }
      const i = (y * w + x) * 4;
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = byte(Math.round(255 * diaryN(s.n)));
    }
  }
  return { rgba, w, h };
}

// Latitude-longitude bake of the same field, inverse stereographic from the north pole.
// Row 0 is the bottom of the bitmap, which is the south pole, matching a WebGL readPixels.
export function bakeLatLong(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const rgba = new Uint8Array(w * h * 4);
  const comp = opts.comp;
  const kind = comp.map.kind;
  const colour = comp.colour === 'curvature' ? 'smooth' : comp.colour;
  const maxIter = opts.maxIter | 0;
  for (let y = 0; y < h; y++) {
    const py = (y + 0.5) / h;
    const phi = (1 - py) * Math.PI;
    const ys = Math.cos(phi);
    const s = Math.sin(phi);
    const den = 1 - ys;
    for (let x = 0; x < w; x++) {
      const theta = ((x + 0.5) / w) * Math.PI * 2 - Math.PI;
      const re = den > 1e-4 ? (s * Math.cos(theta)) / den : 1e6;
      const im = den > 1e-4 ? (s * Math.sin(theta)) / den : 0;
      const sample = samplePoint(kind, [re, im], comp.map.c, comp.map.d, maxIter, colour);
      const rgb = colourOf(sample, colour, opts.ink);
      const i = (y * w + x) * 4;
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = byte(Math.round(255 * diaryN(sample.n)));
    }
  }
  return { data: rgba, w, h };
}

// Distance on the book's sphere of diameter 1, between the Exercise 14 lifts of z and a.
// The page does not print a letter for it. The book never writes one. It is 0 at a and at most 1.
export function chordal(z, a) {
  const dz = Math.hypot(z[0] - a[0], z[1] - a[1]);
  const nz = Math.hypot(1, Math.hypot(z[0], z[1]));
  const na = Math.hypot(1, Math.hypot(a[0], a[1]));
  return nz > 0 && na > 0 ? dz / (nz * na) : 0;
}

// Distance from c to the point at infinity. Finite. It is the height of the orange corners.
export function poleDistance(c) {
  const a = Math.hypot((c && c[0]) || 0, (c && c[1]) || 0);
  return 1 / Math.sqrt(1 + a * a);
}

function chartSpan(comp) {
  const span = comp && comp.view && comp.view.window && comp.view.window.span;
  return span > 1e-12 ? span : 3.2;
}

// nu, nv are [-1, 1] across the pane. Inside the inscribed circle, z runs out as
// span * ρ / (1 − ρ). On that circle, and in the corners outside it, every point
// is the same point: infinity. Pinch changes span. The corners stay.
export function chartPoint(nu, nv, span) {
  const rho = Math.hypot(nu, nv);
  if (!(rho < 1)) return { pole: true, re: Infinity, im: 0 };
  const S = span > 1e-12 ? span : 3.2;
  const t = (S * rho) / (1 - rho);
  const th = Math.atan2(nv, nu);
  return { pole: false, re: t * Math.cos(th), im: t * Math.sin(th) };
}

// Inverse of chartPoint. A point that has already left sits on the circle.
export function chartOf(re, im, span) {
  if (!isFinite(re) || !isFinite(im)) return { nu: 0, nv: 0, rho: 1 };
  const t = Math.hypot(re, im);
  const S = span > 1e-12 ? span : 3.2;
  if (!(t > 0)) return { nu: 0, nv: 0, rho: 0 };
  const rho = t / (S + t);
  return { nu: (re / t) * rho, nv: (im / t) * rho, rho };
}

function chartSample(comp, ink, maxIter, nu, nv) {
  const focus = comp.map.c || [0, 0];
  const hit = chartPoint(nu, nv, chartSpan(comp));
  if (hit.pole) return { pole: true, G: poleDistance(focus) * 1.35, nNorm: 0, col: ink.polar };
  const colour = comp.colour === 'curvature' ? 'smooth' : comp.colour;
  const sample = samplePoint(comp.map.kind, [hit.re, hit.im], focus, comp.map.d, maxIter, colour);
  return {
    pole: false,
    G: chordal([hit.re, hit.im], focus) * 1.35,
    nNorm: diaryN(sample.n),
    col: colourOf(sample, colour, ink),
  };
}

// The sheet is the extended plane, not a crop of the window. The orange corners
// are one point, at one finite height. aspect still matches the pane, so the
// rectangle fills it and the corners are the part outside the inscribed circle.
export function bakeChordal(comp, n, maxIter, ink, aspect = 1) {
  const w = n | 0;
  const h = n | 0;
  const G = new Float32Array(w * h);
  const nNorm = new Float32Array(w * h);
  const rgb = new Uint8ClampedArray(w * h * 3);
  const pole = new Uint8Array(w * h);
  const denom = Math.max(1, w - 1);
  for (let y = 0; y < h; y++) {
    const nv = (0.5 - y / denom) * 2;
    for (let x = 0; x < w; x++) {
      const nu = (x / denom - 0.5) * 2;
      const s = chartSample(comp, ink, maxIter, nu, nv);
      const i = y * w + x;
      G[i] = s.G;
      nNorm[i] = s.nNorm;
      pole[i] = s.pole ? 1 : 0;
      rgb[i * 3] = byte(s.col[0]);
      rgb[i * 3 + 1] = byte(s.col[1]);
      rgb[i * 3 + 2] = byte(s.col[2]);
    }
  }
  const a = Number.isFinite(aspect) && aspect > 0.05 ? aspect : 1;
  const span = chartSpan(comp);
  const grid = { G, nNorm, rgb, pole, w, h, aspect: a, chordal: true, span, window: { cx: 0, cy: 0, span } };
  if (comp.colour === 'curvature') grid.curv = curvatureOf(G, w, h);
  return grid;
}

// The plane beside the sheet. Same chart, so a tap is the same point, and the
// corners are the same orange. Alpha is the diary key: the corners lead.
export function bakeChartImage(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const rgba = opts.rgba || new Uint8ClampedArray(w * h * 4);
  const y0 = opts.y0 | 0;
  const y1 = opts.y1 == null ? h : opts.y1 | 0;
  const comp = opts.comp;
  const ink = opts.ink;
  const maxIter = opts.maxIter | 0;
  for (let y = y0; y < y1; y++) {
    const nv = (0.5 - (y + 0.5) / h) * 2;
    for (let x = 0; x < w; x++) {
      const nu = ((x + 0.5) / w - 0.5) * 2;
      const s = chartSample(comp, ink, maxIter, nu, nv);
      const i = (y * w + x) * 4;
      rgba[i] = byte(s.col[0]);
      rgba[i + 1] = byte(s.col[1]);
      rgba[i + 2] = byte(s.col[2]);
      rgba[i + 3] = byte(Math.round(255 * s.nNorm));
    }
  }
  return { data: rgba, w, h };
}

// A square grid of the potential, for the height field and for curvature.
export function bakeGrid(comp, n, maxIter, ink) {
  const w = n | 0;
  const h = n | 0;
  const G = new Float32Array(w * h);
  const nNorm = new Float32Array(w * h);
  const rgb = new Uint8ClampedArray(w * h * 3);
  const win = comp.view.window;
  const kind = comp.map.kind;
  const colour = comp.colour === 'curvature' ? 'smooth' : comp.colour;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const re = win.cx + ((x + 0.5) / w - 0.5) * win.span;
      const im = win.cy + (0.5 - (y + 0.5) / h) * win.span;
      const s = samplePoint(kind, [re, im], comp.map.c, comp.map.d, maxIter, 'smooth');
      const i = y * w + x;
      G[i] = s.G;
      nNorm[i] = diaryN(s.n);
      const col = colourOf(s, colour, ink);
      rgb[i * 3] = col[0];
      rgb[i * 3 + 1] = col[1];
      rgb[i * 3 + 2] = col[2];
    }
  }
  return { G, nNorm, rgb, w, h };
}

// Mean curvature of the graph h = G. Signed. The 95th percentile of |H| is the clamp.
export function curvatureOf(G, w, h) {
  const H = new Float32Array(w * h);
  const abs = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const hx = (G[i + 1] - G[i - 1]) * 0.5;
      const hy = (G[i + w] - G[i - w]) * 0.5;
      const hxx = G[i + 1] - 2 * G[i] + G[i - 1];
      const hyy = G[i + w] - 2 * G[i] + G[i - w];
      const hxy = (G[i + w + 1] - G[i + w - 1] - G[i - w + 1] + G[i - w - 1]) * 0.25;
      const num = (1 + hy * hy) * hxx - 2 * hx * hy * hxy + (1 + hx * hx) * hyy;
      const den = 2 * (1 + hx * hx + hy * hy) ** 1.5;
      const v = den > 1e-8 && isFinite(num) ? num / den : 0;
      H[i] = v;
      abs.push(Math.abs(v));
    }
  }
  abs.sort((a, b) => a - b);
  const p = abs.length ? abs[Math.min(abs.length - 1, Math.floor(abs.length * 0.95))] : 1;
  return { H, clamp: p > 1e-8 ? p : 1 };
}

export function curvatureInk(v, clamp, ink) {
  const t = Math.max(-1, Math.min(1, v / clamp));
  if (t < 0) return mix(ink.navy, ink.cart, -t);
  return mix(ink.navy, ink.polar, t);
}

// One slice of (z, c). The pixel is w. t = 0 starts at 0 and the pixel is c.
// t = 1 holds c and the pixel is z. Rows yield, the same way the plane does.
export function bakeSliceImage(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const comp = opts.comp;
  const ink = opts.ink;
  const maxIter = opts.maxIter | 0;
  const rgba = opts.rgba || new Uint8ClampedArray(w * h * 4);
  const y0 = opts.y0 | 0;
  const y1 = opts.y1 == null ? h : opts.y1 | 0;
  const t = clamp01(comp.view && comp.view.theta);
  const colour = comp.colour === 'curvature' ? 'smooth' : comp.colour;
  const kind = comp.map.kind === 'poly' ? 'poly' : 'julia';
  const d = comp.map.d | 0 || 2;
  const win = comp.view.window || { cx: 0, cy: 0, span: 3.2 };
  const center = sliceCenter(win, t);
  const aspect = w / Math.max(1, h);
  const span = win.span > 1e-12 ? win.span : 3.2;
  for (let y = y0; y < y1; y++) {
    const im = center.cy + (0.5 - (y + 0.5) / h) * span;
    for (let x = 0; x < w; x++) {
      const re = center.cx + ((x + 0.5) / w - 0.5) * span * aspect;
      const hit = sliceLift([re, im], t, comp.map.c);
      const s = samplePoint(kind, hit.z, hit.c, d, maxIter, colour);
      const rgb = colourOf(s, colour, ink);
      const i = (y * w + x) * 4;
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = byte(Math.round(255 * diaryN(s.n)));
    }
  }
  return { rgba, w, h };
}

// Escape time is steep: almost every pixel outside the set leaves in a handful of
// steps, so n/maxIter turns the picture on in one blink. Counting from the first
// step, 1 - e^{-(n-1)/8} keeps low n first and spends the 2.4 s on those steps.
export function diaryN(n) {
  const k = Math.max(0, (Number(n) || 0) - 1);
  return 1 - Math.exp(-k / 8);
}

// Paint a baked RGBA (alpha = diaryN) into a display buffer at this reveal.
// Low escape times lead. The window is 0.22 wide so each band takes about half a second.
export function revealBuffer(src, dst, u, reduced) {
  const n = src.length;
  for (let i = 0; i < n; i += 4) {
    const nn = src[i + 3] / 255;
    let a;
    if (reduced) a = u <= 0 ? 0 : u >= 1 ? 1 : u;
    else if (u <= 0) a = 0;
    else a = smooth(nn * 0.72, nn * 0.72 + 0.22, u);
    dst[i] = byte(src[i] * a);
    dst[i + 1] = byte(src[i + 1] * a);
    dst[i + 2] = byte(src[i + 2] * a);
    dst[i + 3] = byte(a * 255);
  }
  return dst;
}
