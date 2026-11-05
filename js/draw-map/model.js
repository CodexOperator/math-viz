// js/draw-map/model.js
// The ink a student draws, and its image under f, as data.
//
// Pure module: no DOM. A complex number is { re, im }.
// A cell is one square of the drawing grid. Its image is the four values f takes at its
// corners, so a check can recompute f and demand the same points. A quad whose image
// jumps (a branch cut, a pole) is kept as data and flagged broken, and is not a fill.
//
// Citations, Howell & Mathews, Complex Analysis, 202 Updated Edition:
//   z^2 doubling a sector: Chapter 2, section 2.2, Figure 2.12, printed p. 56.
//   e^z and the fundamental strip: Chapter 5, section 5.1, Figure 5.2, printed p. 133.
//   Log and a sector: Chapter 5, section 5.2, Figure 5.4, printed p. 140.
//   The derivative as a limit: Chapter 3, section 3.1, Equation (3.1), printed p. 79.

import { compile, ParseError } from '../core/parse.js';
import {
  Arg, abs, add, sub, mul, exp, log, pow, localLinear,
} from '../core/complex.js';

export { ParseError };

export const CELL = 0.12;
export const Z_HALF = 3.5;
export const SQUARE_SIDE = 0.36;
export const MAX_CELLS = 1800;
const TAU = 2 * Math.PI;

export const MAPS = Object.freeze([
  Object.freeze({ id: 'sq', label: 'z\u00b2', src: 'z^2' }),
  Object.freeze({ id: 'exp', label: 'e^z', src: 'e^z' }),
  Object.freeze({ id: 'log', label: 'Log z', src: 'log(z)' }),
]);

const ALIASES = Object.freeze({
  'z^2': 'sq',
  'e^z': 'exp',
  'exp(z)': 'exp',
  'log(z)': 'log',
  'ln(z)': 'log',
});

function isFin(z) {
  return !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
}

function dist(a, b) {
  return Math.hypot(a.re - b.re, a.im - b.im);
}

function hypot(z) {
  return Math.hypot(z.re, z.im);
}

export function adaptFormula(src) {
  return String(src == null ? '' : src).replace(/\bln\s*\(/g, 'log(');
}

export function canonFormula(src) {
  return adaptFormula(src).replace(/\s+/g, '');
}

export function mapByFormula(src) {
  const adapted = adaptFormula(src);
  let compiled;
  try {
    compiled = compile(adapted);
  } catch (err) {
    const message = err && err.message ? err.message : 'That formula did not parse.';
    return { ok: false, message, position: err && err.position };
  }
  const id = ALIASES[canonFormula(adapted)] || 'custom';
  const known = MAPS.find((m) => m.id === id);
  return {
    ok: true,
    id,
    src: compiled.src,
    tex: compiled.tex,
    f: compiled.f,
    label: known ? known.label : compiled.src,
  };
}

export function cellCenter(cell, cellSize = CELL) {
  return { re: (cell.i + 0.5) * cellSize, im: (cell.j + 0.5) * cellSize };
}

export function cellCorners(cell, cellSize = CELL) {
  const x0 = cell.i * cellSize;
  const y0 = cell.j * cellSize;
  const x1 = x0 + cellSize;
  const y1 = y0 + cellSize;
  return [
    { re: x0, im: y0 },
    { re: x1, im: y0 },
    { re: x1, im: y1 },
    { re: x0, im: y1 },
  ];
}

export function squareCorners(z, side = SQUARE_SIDE) {
  const h = side / 2;
  return [
    { re: z.re - h, im: z.im - h },
    { re: z.re + h, im: z.im - h },
    { re: z.re + h, im: z.im + h },
    { re: z.re - h, im: z.im + h },
  ];
}

function ev(f, z) {
  try {
    const w = f({ re: z.re, im: z.im });
    if (!w || typeof w !== 'object') return { re: NaN, im: NaN };
    return { re: w.re, im: w.im };
  } catch {
    return { re: NaN, im: NaN };
  }
}

function withT(points) {
  const out = points.map((p) => ({ re: p.re, im: p.im, t: 0 }));
  let total = 0;
  const cum = [0];
  for (let i = 1; i < out.length; i++) {
    total += dist(out[i], out[i - 1]);
    cum.push(total);
  }
  for (let i = 0; i < out.length; i++) out[i].t = total > 0 ? cum[i] / total : 0;
  return out;
}

function arc(r, t0, t1, n) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = t0 + (t1 - t0) * (k / n);
    pts.push({ re: r * Math.cos(t), im: r * Math.sin(t) });
  }
  return pts;
}

function sectorOutline(r0, r1, t0, t1, n) {
  const outer = arc(r1, t0, t1, n);
  const back = arc(r0, t1, t0, n);
  return withT([...outer, ...back]);
}

// The opening picture: a sector 0.55 <= r <= 1.25, 0 <= arg z <= pi/4.
// Under z^2 it opens to twice the angle. Under Log it becomes a rectangle.
function cellInside(i, j, cellSize, test) {
  return cellCorners({ i, j }, cellSize).every(test);
}

export function starterInk(cellSize = CELL) {
  // Large enough to read on a window that also shows Im z = pi, and still inside the strip.
  const r0 = 0.7;
  const r1 = 2.15;
  const t0 = 0;
  const t1 = Math.PI / 4;
  const cells = [];
  const i0 = Math.floor(r0 * Math.cos(t1) / cellSize) - 1;
  const i1 = Math.floor(r1 / cellSize) + 1;
  const j0 = -1;
  const j1 = Math.floor(r1 * Math.sin(t1) / cellSize) + 1;
  let k = 0;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const inside = cellInside(i, j, cellSize, (c) => {
        const r = Math.hypot(c.re, c.im);
        const th = Math.atan2(c.im, c.re);
        return r >= r0 && r <= r1 && th >= t0 - 1e-9 && th <= t1 + 1e-9;
      });
      if (!inside) continue;
      cells.push({ i, j, k });
      k += 1;
    }
  }
  const outline = sectorOutline(r0, r1, t0, t1, 48);
  const path = withT(arc(r1, t0, t1, 48));
  return {
    cells,
    path,
    outline,
    closed: true,
    capped: false,
    cell: cellSize,
    shape: 'sector',
  };
}

function shoelace(points) {
  let a = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    a += points[j].re * points[i].im - points[i].re * points[j].im;
  }
  return Math.abs(a) / 2;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i].im;
    const yj = poly[j].im;
    const xi = poly[i].re;
    const xj = poly[j].re;
    const hit = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function cellsAlong(points, cellSize) {
  const keys = [];
  const seen = new Set();
  const step = cellSize * 0.35;
  function mark(x, y) {
    const i = Math.floor(x / cellSize);
    const j = Math.floor(y / cellSize);
    const key = i + ',' + j;
    if (seen.has(key)) return;
    seen.add(key);
    keys.push({ i, j });
  }
  if (!points.length) return keys;
  mark(points[0].re, points[0].im);
  for (let s = 0; s + 1 < points.length; s++) {
    const a = points[s];
    const b = points[s + 1];
    const len = dist(a, b);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 1; k <= n; k++) {
      const u = k / n;
      mark(a.re + (b.re - a.re) * u, a.im + (b.im - a.im) * u);
    }
  }
  return keys;
}

// points: [{re, im}]. A loop that ends near its start shades the inside (even-odd).
export function inkFromStroke(points, options = {}) {
  const cellSize = options.cell || CELL;
  const closeRadius = Number.isFinite(options.closeRadius) ? options.closeRadius : 0.28;
  const maxCells = options.maxCells || MAX_CELLS;
  const raw = (Array.isArray(points) ? points : []).filter((p) => isFin(p));
  if (raw.length === 0) return starterInk(cellSize);
  const path = withT(raw.length === 1 ? [raw[0], { re: raw[0].re + 1e-4, im: raw[0].im }] : raw);
  let length = 0;
  for (let i = 1; i < path.length; i++) length += dist(path[i], path[i - 1]);
  const near = dist(path[0], path[path.length - 1]);
  const closed = path.length >= 8 && length > 0.7 && near <= closeRadius && shoelace(path) > 0.12;
  const strip = cellsAlong(path, cellSize);
  const cells = [];
  const seen = new Set();
  let capped = false;
  function push(entry) {
    if (cells.length >= maxCells) {
      capped = true;
      return false;
    }
    const key = entry.i + ',' + entry.j;
    if (seen.has(key)) return true;
    seen.add(key);
    cells.push({ i: entry.i, j: entry.j, k: cells.length });
    return true;
  }
  for (const entry of strip) {
    if (!push(entry)) break;
  }
  if (closed && !capped) {
    let i0 = Infinity;
    let i1 = -Infinity;
    let j0 = Infinity;
    let j1 = -Infinity;
    for (const p of path) {
      i0 = Math.min(i0, Math.floor(p.re / cellSize));
      i1 = Math.max(i1, Math.floor(p.re / cellSize));
      j0 = Math.min(j0, Math.floor(p.im / cellSize));
      j1 = Math.max(j1, Math.floor(p.im / cellSize));
    }
    for (let j = j0; j <= j1 && !capped; j++) {
      for (let i = i0; i <= i1; i++) {
        const c = cellCenter({ i, j }, cellSize);
        if (!pointInPoly(c.re, c.im, path)) continue;
        if (!push({ i, j })) break;
      }
    }
  }
  return {
    cells,
    path,
    outline: path,
    closed,
    capped,
    cell: cellSize,
    shape: closed ? 'region' : 'path',
  };
}

function quadJumps(ws) {
  if (ws.some((w) => !isFin(w))) return true;
  const edges = [];
  for (let k = 0; k < 4; k++) edges.push(dist(ws[k], ws[(k + 1) % 4]));
  edges.sort((a, b) => a - b);
  const med = edges[1];
  const longest = edges[3];
  return longest > 1.15 && longest > 6 * Math.max(med, 1e-6);
}

function sameC(a, b, tol) {
  const aFin = isFin(a);
  const bFin = isFin(b);
  if (aFin !== bFin) return false;
  if (!aFin) {
    const reOk = a.re === b.re || (Number.isNaN(a.re) && Number.isNaN(b.re));
    const imOk = a.im === b.im || (Number.isNaN(a.im) && Number.isNaN(b.im));
    return reOk && imOk;
  }
  return dist(a, b) <= tol * Math.max(1, hypot(b));
}

function recordMatch(rec, f, tol) {
  for (let k = 0; k < rec.z.length; k++) {
    if (!sameC(rec.w[k], ev(f, rec.z[k]), tol)) return false;
  }
  return true;
}

export function imageOfCells(cells, f, cellSize = CELL) {
  const quads = [];
  const broken = [];
  for (const cell of cells) {
    const z = cellCorners(cell, cellSize);
    const w = z.map((corner) => ev(f, corner));
    const rec = { i: cell.i, j: cell.j, k: cell.k, z, w, center: cellCenter(cell, cellSize) };
    if (quadJumps(w)) broken.push(rec);
    else quads.push(rec);
  }
  return { quads, broken };
}

function midP(a, b) {
  return { re: (a.re + b.re) / 2, im: (a.im + b.im) / 2, t: ((a.t || 0) + (b.t || 0)) / 2 };
}

// Image of a polyline. Vertices are exactly f of the input samples. A jump is a gap, not a line.
export function curvePieces(points, f) {
  if (!Array.isArray(points) || points.length < 2) return [];
  let items = points.map((p) => ({ p: { re: p.re, im: p.im, t: p.t || 0 }, depth: 0 }));
  for (let pass = 0; pass < 5; pass++) {
    if (items.length > 2200) break;
    const next = [items[0]];
    let grew = false;
    for (let i = 0; i + 1 < items.length; i++) {
      const a = items[i];
      const b = items[i + 1];
      const wa = ev(f, a.p);
      const wb = ev(f, b.p);
      const step = isFin(wa) && isFin(wb) ? dist(wa, wb) : Infinity;
      const depth = Math.min(a.depth, b.depth);
      if (step > 0.32 && step < 6 && depth < 4 && next.length < 2200) {
        const mid = midP(a.p, b.p);
        const wm = ev(f, mid);
        if (isFin(wm)) {
          const via = dist(wa, wm) + dist(wm, wb);
          if (via < 1.25 * step + 0.05) {
            next.push({ p: mid, depth: depth + 1 });
            grew = true;
          }
        }
      }
      next.push(b);
    }
    items = next;
    if (!grew) break;
  }
  const samples = items.map((item) => ({ z: { re: item.p.re, im: item.p.im }, t: item.p.t || 0, w: ev(f, item.p) }));
  const steps = [];
  for (let i = 0; i + 1 < samples.length; i++) {
    if (isFin(samples[i].w) && isFin(samples[i + 1].w)) steps.push(dist(samples[i].w, samples[i + 1].w));
  }
  steps.sort((a, b) => a - b);
  const med = steps.length ? steps[Math.floor(steps.length / 2)] : 0;
  const limit = Math.max(1.25, 6 * med);
  const pieces = [];
  let cur = [];
  function flush() {
    if (cur.length >= 2) pieces.push(cur);
    cur = [];
  }
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!isFin(s.w)) {
      flush();
      continue;
    }
    if (cur.length) {
      const prev = cur[cur.length - 1];
      if (dist(prev.w, s.w) > limit) {
        flush();
      }
    }
    cur.push(s);
  }
  flush();
  return pieces;
}

export function mapInk(ink, f) {
  const cellSize = ink.cell || CELL;
  const { quads, broken } = imageOfCells(ink.cells, f, cellSize);
  const guide = ink.outline && ink.outline.length > 1 ? ink.outline : ink.path;
  const curve = curvePieces(guide, f);
  const tol = 1e-8;
  let exact = true;
  for (const rec of quads) if (!recordMatch(rec, f, tol)) exact = false;
  for (const rec of broken) if (!recordMatch(rec, f, tol)) exact = false;
  for (const piece of curve) {
    for (const s of piece) {
      if (!sameC(s.w, ev(f, s.z), tol)) exact = false;
    }
  }
  return { quads, broken, curve, exact };
}

export function probeAt(path, u) {
  if (!path || !path.length) return null;
  const t = Math.min(1, Math.max(0, Number(u) || 0));
  if (path.length === 1 || t <= 0) return { re: path[0].re, im: path[0].im };
  if (t >= 1) return { re: path[path.length - 1].re, im: path[path.length - 1].im };
  let lo = 0;
  let hi = path.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((path[mid].t || 0) <= t) lo = mid;
    else hi = mid;
  }
  const a = path[lo];
  const b = path[hi];
  const span = (b.t || 0) - (a.t || 0);
  const s = span > 0 ? (t - (a.t || 0)) / span : 0;
  return { re: a.re + (b.re - a.re) * s, im: a.im + (b.im - a.im) * s };
}

// The little square against the derivative: f(z0) + A (z - z0), with A from the local linear form.
// Agreement fails when A is 0, when the square is large next to a pole, or when a cut makes B nonzero.
export function squareReport(z, f, side = SQUARE_SIDE) {
  const corners = squareCorners(z, side);
  const image = corners.map((c) => ev(f, c));
  const w0 = ev(f, z);
  let A = { re: NaN, im: NaN };
  let B = { re: NaN, im: NaN };
  try {
    const lin = localLinear(f, z, 1e-5);
    A = lin.A;
    B = lin.B;
  } catch { /* a bad step is a failure of the square, not a throw */ }
  const pure = corners.map((c) => {
    const d = { re: c.re - z.re, im: c.im - z.im };
    return add(w0, mul(A, d));
  });
  let err = 0;
  for (let k = 0; k < 4; k++) {
    if (!isFin(image[k]) || !isFin(pure[k])) err = Infinity;
    else err = Math.max(err, dist(image[k], pure[k]));
  }
  const aAbs = hypot(A);
  const bAbs = hypot(B);
  const scale = Math.max(aAbs * side, 1e-4);
  const ratio = err / scale;
  const agrees = isFin(w0) && image.every(isFin) && isFin(A) && ratio <= 0.4 && bAbs <= 0.25 * Math.max(aAbs, 1e-6);
  return { corners, image, pure, err, ratio, agrees, A, B };
}

function angleReport(kind, z) {
  const r = hypot(z);
  const theta = Arg(z);
  if (kind === 'sq') {
    if (r < 1e-4) return { ok: false, reason: 'zero' };
    const twice = 2 * theta;
    const argw = Arg(mul(z, z));
    const home = twice > -Math.PI + 1e-8 && twice <= Math.PI + 1e-8;
    const match = Math.abs(argw - twice) < 1e-6;
    return { ok: home && match, reason: home ? 'match' : 'left-home', theta, argw, twice };
  }
  if (kind === 'exp') {
    const y = z.im;
    const inStrip = y > -Math.PI + 1e-8 && y <= Math.PI + 1e-8;
    const argw = Arg(exp(z));
    const match = Math.abs(argw - y) < 1e-6;
    return { ok: inStrip && match, reason: inStrip ? 'match' : 'outside-strip', y, argw };
  }
  if (kind === 'log') {
    if (r < 1e-6) return { ok: false, reason: 'zero' };
    const w = log(z);
    const match = isFin(w) && Math.abs(w.im - theta) < 1e-6;
    return { ok: match, reason: match ? 'match' : 'cut', theta, height: w.im };
  }
  return { ok: null, reason: 'custom' };
}

export function describeProbe(kind, z, f, side = SQUARE_SIDE) {
  const square = squareReport(z, f, side);
  const angle = angleReport(kind, z);
  let ok = false;
  let text = '';
  let blank = { prompt: '', filled: '', ok: false };
  if (kind === 'sq') {
    blank = { prompt: 'Arg(z^2) = ___ Arg z', filled: '2', ok: false };
    if (hypot(z) < 1e-4) {
      text = 'At 0 the little square collapses. There is no angle to double.';
      blank.filled = 'no angle';
    } else if (!angle.ok) {
      text = 'Twice this angle has left the home step. Arg(z^2) is not twice Arg z.';
      blank.filled = 'not 2';
    } else if (!square.agrees) {
      text = 'The purple angle is twice the green angle, but this little square is not only a turn and a stretch.';
      blank.ok = true;
      ok = false;
    } else {
      text = 'The purple angle is twice the green angle, and the little square only turned and stretched.';
      blank.ok = true;
      ok = true;
    }
  } else if (kind === 'exp') {
    blank = { prompt: 'Arg(e^z) = ___', filled: 'y', ok: false };
    if (!angle.ok) {
      text = 'This point sits outside the fundamental strip. The purple angle is not the height.';
      blank.filled = 'not y';
    } else if (!square.agrees) {
      text = 'The purple angle equals the green height, but this little square is not only a turn and a stretch.';
    } else {
      text = 'The purple angle equals the green height, and the little square only turned and stretched.';
      blank.ok = true;
      ok = true;
    }
  } else if (kind === 'log') {
    blank = { prompt: 'Im(Log z) = ___', filled: 'Arg z', ok: false };
    if (hypot(z) < 1e-6) {
      text = 'Log has nowhere to send 0.';
      blank.filled = 'nowhere';
    } else if (!square.agrees) {
      text = 'The little square meets the cut, or it is too big to be only a turn and a stretch.';
      blank.filled = 'the cut';
    } else if (!angle.ok) {
      text = 'The height of Log z is not the angle of this point.';
    } else {
      text = 'The purple height equals the green angle, and the little square only turned and stretched.';
      blank.ok = true;
      ok = true;
    }
  } else if (!isFin(ev(f, z)) || !square.agrees) {
    text = 'The little square did not stay a turned square.';
    blank = { prompt: 'The little square under f', filled: 'not a turn and a stretch', ok: false };
  } else {
    text = 'The little square only turned and stretched.';
    blank = { prompt: 'The little square under f', filled: 'a turn and a stretch', ok: true };
    ok = true;
  }
  return { ok, text, blank, square, angle };
}

function segmentCutsSeam(a, b) {
  if (a.re <= 1e-9 && Math.abs(a.im) <= 1e-9) return true;
  if (b.re <= 1e-9 && Math.abs(b.im) <= 1e-9) return true;
  if (a.im === 0 && a.re <= 0) return true;
  if (b.im === 0 && b.re <= 0) return true;
  if (a.im * b.im < 0) {
    const t = a.im / (a.im - b.im);
    const x = a.re + t * (b.re - a.re);
    if (x <= 1e-9) return true;
  }
  return false;
}

export function pathMeetsCut(points) {
  if (!points || points.length < 2) return false;
  for (let i = 0; i + 1 < points.length; i++) {
    if (segmentCutsSeam(points[i], points[i + 1])) return true;
  }
  return false;
}

function atArc(points, s) {
  let total = 0;
  const seg = [];
  for (let i = 1; i < points.length; i++) {
    const len = dist(points[i], points[i - 1]);
    seg.push(len);
    total += len;
  }
  if (!(total > 0)) return { re: points[0].re, im: points[0].im };
  let need = Math.min(1, Math.max(0, s)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (need <= seg[i] || i === seg.length - 1) {
      const u = seg[i] > 0 ? need / seg[i] : 0;
      const a = points[i];
      const b = points[i + 1];
      return { re: a.re + (b.re - a.re) * u, im: a.im + (b.im - a.im) * u };
    }
    need -= seg[i];
  }
  const last = points[points.length - 1];
  return { re: last.re, im: last.im };
}

// Midpoint sum of f(z) Delta z along the polyline. This is the contour integral's Riemann sum.
export function contourSum(points, f, n = 160) {
  if (!points || points.length < 2) return null;
  const steps = Math.max(8, n | 0);
  let sum = { re: 0, im: 0 };
  let prev = atArc(points, 0);
  for (let k = 1; k <= steps; k++) {
    const next = atArc(points, k / steps);
    const mid = { re: (prev.re + next.re) / 2, im: (prev.im + next.im) / 2 };
    const dz = { re: next.re - prev.re, im: next.im - prev.im };
    const w = ev(f, mid);
    if (!isFin(w)) return null;
    const bit = mul(w, dz);
    sum = { re: sum.re + bit.re, im: sum.im + bit.im };
    prev = next;
  }
  return sum;
}

function logAnti(z) {
  if (hypot(z) < 1e-8) return null;
  const w = log(z);
  if (!isFin(w)) return null;
  return sub(mul(z, w), z);
}

export function antiderivDelta(points, kind) {
  if (!points || points.length < 2) return null;
  const a = points[0];
  const b = points[points.length - 1];
  if (kind === 'sq') return sub(mul(pow(b, 3), { re: 1 / 3, im: 0 }), mul(pow(a, 3), { re: 1 / 3, im: 0 }));
  if (kind === 'exp') return sub(exp(b), exp(a));
  if (kind === 'log') {
    if (pathMeetsCut(points)) return null;
    const A = logAnti(a);
    const B = logAnti(b);
    if (!A || !B) return null;
    return sub(B, A);
  }
  return null;
}

export function contourReport(path, f, kind) {
  const sum = contourSum(path, f, 200);
  const anti = antiderivDelta(path, kind);
  let gap = null;
  if (sum && anti && isFin(sum) && isFin(anti)) gap = dist(sum, anti);
  return { sum, anti, gap };
}

// Figure 5.1: exp(z + 2 pi i k) is one point. The copy one period down.
export function periodImage(z, f) {
  const w = ev(f, z);
  const twin = { re: z.re, im: z.im - TAU };
  const wt = ev(f, twin);
  if (!isFin(w) || !isFin(wt)) return { twin, w, wt, gap: null, same: false };
  const gap = dist(w, wt);
  const same = gap <= 1e-6 * Math.max(1, hypot(w));
  return { twin, w, wt, gap, same };
}

export function frameHalf(values, options = {}) {
  const minHalf = options.minHalf == null ? 1.6 : options.minHalf;
  const maxHalf = options.maxHalf == null ? 14 : options.maxHalf;
  const pad = options.pad == null ? 1.22 : options.pad;
  let m = 0;
  for (const w of values) {
    if (!isFin(w)) continue;
    m = Math.max(m, Math.abs(w.re), Math.abs(w.im));
  }
  if (!(m > 0)) return minHalf;
  return Math.min(maxHalf, Math.max(minHalf, m * pad));
}

export function orangeNote(kind) {
  if (kind === 'sq') return 'Orange rays are Arg z = \u00b1pi/2. Doubling past them leaves the home step.';
  if (kind === 'exp') return 'Orange lines are the edges of the fundamental strip, Im z = \u00b1pi.';
  if (kind === 'log') return 'Orange is the branch cut: the negative real axis.';
  return 'Orange is off. This formula has no guide of its own.';
}
