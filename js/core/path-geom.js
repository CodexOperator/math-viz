// Preset loops, and a hand-drawn loop turned into constant speed.
//
// Every preset is a formula. The editor loads that formula, so the learner
// can change the names. A drawing is resampled by arc length and closed.

import { parsePath } from './path-expr.js';

export const PATH_PRESETS = Object.freeze([
  Object.freeze({
    id: 'circle',
    label: 'Circle',
    formula: 'cx + cy*i + r*exp(2*pi*i*t)',
    values: Object.freeze({ cx: 0, cy: 0, r: 0.7885 }),
  }),
  Object.freeze({
    id: 'cardioid',
    label: 'Cardioid',
    formula: 's*(exp(2*pi*i*t)/2 - exp(4*pi*i*t)/4)',
    values: Object.freeze({ s: 1 }),
  }),
  Object.freeze({
    id: 'ellipse',
    label: 'Ellipse',
    formula: 'cx + cy*i + a*cos(2*pi*t) + b*i*sin(2*pi*t)',
    values: Object.freeze({ cx: -0.1, cy: 0, a: 0.7, b: 0.4 }),
  }),
  Object.freeze({
    id: 'eight',
    label: 'Figure-8',
    formula: 'a*sin(2*pi*t) + b*i*sin(4*pi*t)',
    values: Object.freeze({ a: 0.6, b: 0.35 }),
  }),
  Object.freeze({
    id: 'segment',
    label: 'Segment',
    formula: 'x0+(x1-x0)*(1-abs(2*t-1))+(y0+(y1-y0)*(1-abs(2*t-1)))*i',
    values: Object.freeze({ x0: -0.75, y0: 0, x1: 0.35, y1: 0.15 }),
  }),
  Object.freeze({
    id: 'rose',
    label: 'Rose',
    formula: 'a*cos(k*2*pi*t)*exp(2*pi*i*t)',
    values: Object.freeze({ a: 0.75, k: 2 }),
  }),
  Object.freeze({
    id: 'spiral',
    label: 'Spiral',
    formula: '(r0+(r1-r0)*sin(pi*t))*exp(2*pi*n*i*t)',
    values: Object.freeze({ r0: 0.15, r1: 0.85, n: 2 }),
  }),
]);

export function presetById(id) {
  return PATH_PRESETS.find((p) => p.id === id) || null;
}

function chaikin(pts, closed) {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const out = [];
  const m = closed ? n : n - 1;
  if (!closed) out.push(pts[0]);
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push({ re: 0.75 * a.re + 0.25 * b.re, im: 0.75 * a.im + 0.25 * b.im });
    out.push({ re: 0.25 * a.re + 0.75 * b.re, im: 0.25 * a.im + 0.75 * b.im });
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

function dedupe(pts) {
  const out = [];
  for (const p of pts) {
    if (!p || !Number.isFinite(p.re) || !Number.isFinite(p.im)) continue;
    const prev = out[out.length - 1];
    if (prev && Math.hypot(p.re - prev.re, p.im - prev.im) < 1e-6) continue;
    out.push({ re: p.re, im: p.im });
  }
  return out;
}

// Smooth, close, and space the samples so equal t is equal distance.
export function smoothLoop(points, samples = 128) {
  let pts = dedupe(points);
  if (pts.length < 2) return pts;
  const ends = Math.hypot(pts[0].re - pts[pts.length - 1].re, pts[0].im - pts[pts.length - 1].im);
  let closed = ends < 0.08;
  if (!closed) pts = pts.concat([{ re: pts[0].re, im: pts[0].im }]);
  closed = true;
  if (pts.length > 2 && Math.hypot(pts[0].re - pts[pts.length - 1].re, pts[0].im - pts[pts.length - 1].im) < 1e-6) {
    pts = pts.slice(0, -1);
  }
  for (let k = 0; k < 3; k++) pts = chaikin(pts, true);
  pts = dedupe(pts);
  if (pts.length < 2) return pts;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].re - pts[i - 1].re, pts[i].im - pts[i - 1].im));
  const close = Math.hypot(pts[0].re - pts[pts.length - 1].re, pts[0].im - pts[pts.length - 1].im);
  const total = cum[cum.length - 1] + close;
  if (!(total > 1e-6)) return [pts[0]];
  const n = Math.max(8, samples | 0);
  const out = [];
  const ring = pts.concat([pts[0]]);
  const dist = cum.concat([total]);
  for (let k = 0; k < n; k++) {
    const d = (total * k) / n;
    let i = 1;
    while (i < dist.length - 1 && dist[i] < d) i += 1;
    const span = dist[i] - dist[i - 1];
    const u = span > 1e-12 ? (d - dist[i - 1]) / span : 0;
    const a = ring[i - 1];
    const b = ring[i];
    out.push({ re: a.re + (b.re - a.re) * u, im: a.im + (b.im - a.im) * u });
  }
  out.total = total;
  return out;
}

export function pointOnLoop(points, t) {
  const pts = points || [];
  if (!pts.length) return { re: 0, im: 0 };
  if (pts.length === 1) return { re: pts[0].re, im: pts[0].im };
  let u = Number(t) || 0;
  u -= Math.floor(u);
  const n = pts.length;
  const x = u * n;
  const i = Math.floor(x) % n;
  const f = x - Math.floor(x);
  const a = pts[i];
  const b = pts[(i + 1) % n];
  return { re: a.re + (b.re - a.re) * f, im: a.im + (b.im - a.im) * f };
}

// Compile a formula once. values fill any name the preset named and the learner has not set.
export function compileFormula(formula, values) {
  const parsed = parsePath(formula);
  if (!parsed.ok) return parsed;
  const env = {};
  for (const name of parsed.vars) {
    const v = values && Number.isFinite(values[name]) ? values[name] : 0;
    env[name] = v;
  }
  return { ok: true, ast: parsed.ast, vars: parsed.vars, env, hint: '' };
}
