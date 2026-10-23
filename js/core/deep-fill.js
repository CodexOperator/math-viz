// Julia, Mandelbrot, and Newton past one double.
//
// Below width 1e-13 a pixel offset added to the centre is lost in one double.
// The centre is kept as two doubles, and each step is two doubles. The picture
// stops at width 1e-28: a third double would be a different program, and this
// page says that limit out loud.

import { fromDouble, ddAdd, ddSub, ddMul, ddSqr, ddDiv } from './doubledouble.js';
import { fillJulia, fillNewton } from './fractal.js';

export { ddFromDecimal, ddToDecimal } from './doubledouble.js';

export const DOUBLE_EDGE = 1e-13;
export const WIDTH_FLOOR = 1e-28;

export function needsDeep(view) {
  if (!view || !(view.unitsAcross > 0)) return false;
  if (view.unitsAcross < DOUBLE_EDGE) return true;
  const lo = Math.hypot(view.centerReLo || 0, view.centerImLo || 0);
  return lo > view.unitsAcross * 1e-6;
}

export function iterForWidth(width, base = 48) {
  const w = Number(width);
  if (!(w > 0) || w >= 1e-4) return base;
  const extra = Math.log10(4 / Math.max(w, WIDTH_FLOOR));
  return Math.max(base, Math.min(480, Math.round(base + extra * 16)));
}

function centerOf(view) {
  return {
    re: { hi: view.centerRe || 0, lo: view.centerReLo || 0 },
    im: { hi: view.centerIm || 0, lo: view.centerImLo || 0 },
  };
}

function pixelOffset(px, py, w, h, view) {
  const scale = w / view.unitsAcross;
  return {
    re: fromDouble((px + 0.5 - w / 2) / scale),
    im: fromDouble(-(py + 0.5 - h / 2) / scale),
  };
}

function escaped(re, im, escape2) {
  const a = re.hi;
  const b = im.hi;
  return a * a + b * b > escape2;
}

// z^2 + c, both pairs of doubles.
function juliaStep(x, y, cx, cy) {
  const xx = ddSqr(x);
  const yy = ddSqr(y);
  const xy = ddMul(x, y);
  return {
    re: ddAdd(ddSub(xx, yy), cx),
    im: ddAdd(ddAdd(xy, xy), cy),
  };
}

export function fillJuliaDeep(out, w, h, y0, y1, view, c, maxIter, escape2) {
  const ctr = centerOf(view);
  const cx = fromDouble(c.re);
  const cy = fromDouble(c.im);
  const iter = maxIter | 0;
  for (let py = y0; py < y1; py++) {
    const row = py * w;
    for (let px = 0; px < w; px++) {
      const off = pixelOffset(px, py, w, h, view);
      let x = ddAdd(ctr.re, off.re);
      let y = ddAdd(ctr.im, off.im);
      let n = 0;
      for (; n < iter; n++) {
        if (escaped(x, y, escape2)) break;
        const s = juliaStep(x, y, cx, cy);
        if (!Number.isFinite(s.re.hi) || !Number.isFinite(s.im.hi)) { n = 0; x = fromDouble(1e9); break; }
        x = s.re;
        y = s.im;
      }
      out[row + px] = n >= iter ? -1 : n;
    }
  }
}

// Mandelbrot: z starts at 0, c is the pixel.
export function fillMandelbrot(out, w, h, y0, y1, view, maxIter, escape2) {
  const scale = w / view.unitsAcross;
  const iter = maxIter | 0;
  const e2 = escape2 > 0 ? escape2 : 4;
  for (let py = y0; py < y1; py++) {
    const im0 = view.centerIm - (py + 0.5 - h / 2) / scale;
    const row = py * w;
    for (let px = 0; px < w; px++) {
      const cx = view.centerRe + (px + 0.5 - w / 2) / scale;
      const cy = im0;
      let x = 0;
      let y = 0;
      let n = 0;
      for (; n < iter; n++) {
        const x2 = x * x;
        const y2 = y * y;
        if (x2 + y2 > e2) break;
        const nx = x2 - y2 + cx;
        y = 2 * x * y + cy;
        x = nx;
        if (!Number.isFinite(x) || !Number.isFinite(y)) { n = 0; x = 1e9; break; }
      }
      out[row + px] = n >= iter ? -1 : n;
    }
  }
}

export function fillMandelbrotDeep(out, w, h, y0, y1, view, maxIter, escape2) {
  const ctr = centerOf(view);
  const iter = maxIter | 0;
  const e2 = escape2 > 0 ? escape2 : 4;
  const zero = fromDouble(0);
  for (let py = y0; py < y1; py++) {
    const row = py * w;
    for (let px = 0; px < w; px++) {
      const off = pixelOffset(px, py, w, h, view);
      const cx = ddAdd(ctr.re, off.re);
      const cy = ddAdd(ctr.im, off.im);
      let x = zero;
      let y = zero;
      let n = 0;
      for (; n < iter; n++) {
        if (escaped(x, y, e2)) break;
        const s = juliaStep(x, y, cx, cy);
        if (!Number.isFinite(s.re.hi) || !Number.isFinite(s.im.hi)) { n = 0; x = fromDouble(1e9); break; }
        x = s.re;
        y = s.im;
      }
      out[row + px] = n >= iter ? -1 : n;
    }
  }
}

function ddRecipSum(x, y, roots) {
  // sum 1/(z − r) as a double-double pair.
  let sx = fromDouble(0);
  let sy = fromDouble(0);
  for (let k = 0; k < roots.length; k++) {
    const dx = ddSub(x, fromDouble(roots[k].re));
    const dy = ddSub(y, fromDouble(roots[k].im));
    const d2 = ddAdd(ddSqr(dx), ddSqr(dy));
    if (!(d2.hi > 0)) return null;
    // 1/(dx + i dy) = (dx − i dy) / |d|², in two doubles, not just the high word.
    const inv = ddDiv(fromDouble(1), d2);
    sx = ddAdd(sx, ddMul(dx, inv));
    sy = ddSub(sy, ddMul(dy, inv));
  }
  return { re: sx, im: sy };
}

export function fillNewtonDeep(out, w, h, y0, y1, view, roots, maxIter, tol2) {
  const ctr = centerOf(view);
  const iter = maxIter | 0;
  const nRoots = roots.length;
  for (let py = y0; py < y1; py++) {
    const row = py * w;
    for (let px = 0; px < w; px++) {
      const off = pixelOffset(px, py, w, h, view);
      let x = ddAdd(ctr.re, off.re);
      let y = ddAdd(ctr.im, off.im);
      let found = -1;
      let steps = iter;
      for (let n = 0; n < iter; n++) {
        let hit = -1;
        const hx = x.hi;
        const hy = y.hi;
        for (let k = 0; k < nRoots; k++) {
          const dx = hx - roots[k].re;
          const dy = hy - roots[k].im;
          if (dx * dx + dy * dy <= tol2) { hit = k; break; }
        }
        if (hit >= 0) { found = hit; steps = n; break; }
        const s = ddRecipSum(x, y, roots);
        if (!s) break;
        const s2 = ddAdd(ddSqr(s.re), ddSqr(s.im));
        if (!(s2.hi > 1e-18)) break;
        // z − 1/sum, with 1/sum = (sx − i sy) / |s|².
        const inv = ddDiv(fromDouble(1), s2);
        const nx = ddSub(x, ddMul(s.re, inv));
        const ny = ddAdd(y, ddMul(s.im, inv));
        if (!Number.isFinite(nx.hi) || !Number.isFinite(ny.hi)) break;
        x = nx;
        y = ny;
      }
      out[row + px] = found < 0 ? 0 : (found + 1) + (steps / iter) * 0.999;
    }
  }
}

export function fillAutoJulia(out, w, h, y0, y1, view, c, maxIter, escape2) {
  if (needsDeep(view)) fillJuliaDeep(out, w, h, y0, y1, view, c, maxIter, escape2);
  else fillJulia(out, w, h, y0, y1, view, c, maxIter, escape2);
}

export function fillAutoMandelbrot(out, w, h, y0, y1, view, maxIter, escape2) {
  if (needsDeep(view)) fillMandelbrotDeep(out, w, h, y0, y1, view, maxIter, escape2);
  else fillMandelbrot(out, w, h, y0, y1, view, maxIter, escape2);
}

export function fillAutoNewton(out, w, h, y0, y1, view, roots, maxIter, tol2) {
  if (needsDeep(view)) fillNewtonDeep(out, w, h, y0, y1, view, roots, maxIter, tol2);
  else fillNewton(out, w, h, y0, y1, view, roots, maxIter, tol2);
}
