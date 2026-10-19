// js/core/fractal.js — Julia and Newton pictures as numbers, not pixels.
//
//   fillJulia / fillNewton     write one float per sample into a Float32Array
//   paintJulia / paintNewton   turn those floats into RGBA, from colours the caller resolved
//   juliaWalk / newtonWalk     the steps of ONE starting point (the green or purple walk)
//   monicCoeffs                p(z) = product (z − root), coefficients of z^0, z^1, ...
//
// No DOM, no imports. A float field is the picture; the station turns it into colours
// from the theme tokens, so a theme change repaints without iterating again.
//
// Julia float: −1 if the walk was still inside the escape circle, otherwise the smooth
// escape time (higher means it lasted longer).
// Newton float: 0 if it did not settle, otherwise (rootIndex + 1) + 0.999 * (steps / maxIter).
// The fraction is how late it settled: 0 is immediate, almost 1 is the last step we allowed.

const LN2 = Math.LN2;

// A turn sharper than this is a corner the film has to land on. Shallower bends
// are already followed by the arc-length samples.
const CORNER_TURN = 0.6;

function turnAngle(a, b, c) {
  const ux = b.re - a.re;
  const uy = b.im - a.im;
  const vx = c.re - b.re;
  const vy = c.im - b.im;
  const lu = Math.hypot(ux, uy);
  const lv = Math.hypot(vx, vy);
  if (lu < 1e-9 || lv < 1e-9) return 0;
  const dot = (ux * vx + uy * vy) / (lu * lv);
  return Math.acos(Math.min(1, Math.max(-1, dot)));
}

function pointAlong(pts, cum, dist) {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < dist) i += 1;
  const span = cum[i] - cum[i - 1];
  const t = span > 1e-12 ? (dist - cum[i - 1]) / span : 0;
  return {
    re: pts[i - 1].re + (pts[i].re - pts[i - 1].re) * t,
    im: pts[i - 1].im + (pts[i].im - pts[i - 1].im) * t,
    dist,
  };
}

// Uniform samples can fall either side of a sharp bend and chord across it.
// Put each corner on the nearest free sample. If the step left only the two
// ends, insert the corner instead of dropping it. Then play in arc-length order.
function pinCorners(pts, cum, out, cap) {
  const corners = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const ang = turnAngle(pts[i - 1], pts[i], pts[i + 1]);
    if (ang >= CORNER_TURN) corners.push({ re: pts[i].re, im: pts[i].im, dist: cum[i], ang });
  }
  corners.sort((a, b) => b.ang - a.ang);
  const limit = Math.max(out.length, cap | 0);
  const pinned = new Set([0, out.length - 1]);
  for (const c of corners) {
    let near = -1;
    for (let k = 0; k < out.length; k++) {
      if (Math.hypot(out[k].re - c.re, out[k].im - c.im) < 1e-4) { near = k; break; }
    }
    if (near >= 0) { pinned.add(near); continue; }
    let best = -1;
    let bestD = Infinity;
    for (let k = 0; k < out.length; k++) {
      if (pinned.has(k)) continue;
      const d = Math.abs(out[k].dist - c.dist);
      if (d < bestD) { bestD = d; best = k; }
    }
    if (best < 0) {
      if (out.length >= limit) break;
      out.push({ re: c.re, im: c.im, dist: c.dist });
      pinned.add(out.length - 1);
      continue;
    }
    out[best] = { re: c.re, im: c.im, dist: c.dist };
    pinned.add(best);
  }
  out.sort((a, b) => a.dist - b.dist);
}

// One frame every `step` units of arc length, plus the end if it falls between steps.
// A path shorter than minLength is a click: one point, and no film.
// Past maxFrames the step widens so the film still runs from start to finish.
// A turn sharper than about 34° (CORNER_TURN) is always one of those frames.
export function samplePath(points, { step = 0.08, maxFrames = 96, minLength = 0.04 } = {}) {
  const pts = [];
  for (const p of points || []) {
    if (!p || !Number.isFinite(p.re) || !Number.isFinite(p.im)) continue;
    const prev = pts[pts.length - 1];
    if (prev && Math.hypot(p.re - prev.re, p.im - prev.im) < 1e-6) continue;
    pts.push({ re: p.re, im: p.im });
  }
  if (pts.length === 0) return [];
  if (pts.length === 1) return [{ re: pts[0].re, im: pts[0].im }];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].re - pts[i - 1].re, pts[i].im - pts[i - 1].im));
  const total = cum[cum.length - 1];
  if (!(total >= minLength)) return [{ re: pts[pts.length - 1].re, im: pts[pts.length - 1].im }];
  let spacing = Number.isFinite(step) && step > 0 ? step : 0.08;
  const cap = Math.max(2, maxFrames | 0);
  let nSteps = Math.floor(total / spacing + 1e-9);
  if (nSteps < 1) nSteps = 1;
  let count = nSteps + 1;
  if (total - nSteps * spacing > 1e-6) count += 1;
  if (count > cap) {
    nSteps = cap - 1;
    spacing = total / nSteps;
    count = cap;
  }
  const out = [];
  for (let k = 0; k < count; k++) {
    const dist = k === count - 1 ? total : Math.min(total, k * spacing);
    out.push(pointAlong(pts, cum, dist));
  }
  if (out.length >= 2) pinCorners(pts, cum, out, cap);
  const frames = out.map((p) => ({ re: p.re, im: p.im }));
  // `spacing` is the step the frames actually use. It is wider than `step` when the cap applies.
  frames.spacing = spacing;
  frames.asked = Number.isFinite(step) && step > 0 ? step : 0.08;
  return frames;
}

export function effectiveEscape(c, escapeR) {
  const r = Math.hypot(c.re, c.im);
  const ask = Number.isFinite(escapeR) && escapeR > 0 ? escapeR : 2;
  return Math.max(ask, r, 2);
}

// Rows [y0, y1) of a w×h sample grid. `view` is the plane: centre and how many units across the width.
export function fillJulia(out, w, h, y0, y1, view, c, maxIter, escape2) {
  const scale = w / view.unitsAcross;
  const cx = c.re;
  const cy = c.im;
  const iter = maxIter | 0;
  for (let py = y0; py < y1; py++) {
    const im0 = view.centerIm - (py + 0.5 - h / 2) / scale;
    const row = py * w;
    for (let px = 0; px < w; px++) {
      let x = view.centerRe + (px + 0.5 - w / 2) / scale;
      let y = im0;
      let n = 0;
      for (; n < iter; n++) {
        const x2 = x * x;
        const y2 = y * y;
        if (x2 + y2 > escape2) break;
        const nx = x2 - y2 + cx;
        y = 2 * x * y + cy;
        x = nx;
        if (!Number.isFinite(x) || !Number.isFinite(y)) { n = 0; x = 1e9; y = 0; break; }
      }
      if (n >= iter) {
        out[row + px] = -1;
      } else {
        const r2 = x * x + y * y;
        let nu = n;
        if (r2 > 1) {
          const logZn = 0.5 * Math.log(r2);
          const smooth = n + 1 - Math.log(logZn / LN2) / LN2;
          if (Number.isFinite(smooth)) nu = smooth;
        }
        out[row + px] = nu < 0 ? 0 : nu;
      }
    }
  }
}

// roots: array of { re, im }. tol2 is the squared distance that counts as "arrived".
export function fillNewton(out, w, h, y0, y1, view, roots, maxIter, tol2) {
  const nRoots = roots.length;
  const rr = new Float64Array(nRoots * 2);
  for (let k = 0; k < nRoots; k++) { rr[k * 2] = roots[k].re; rr[k * 2 + 1] = roots[k].im; }
  const scale = w / view.unitsAcross;
  const iter = maxIter | 0;
  for (let py = y0; py < y1; py++) {
    const im0 = view.centerIm - (py + 0.5 - h / 2) / scale;
    const row = py * w;
    for (let px = 0; px < w; px++) {
      let x = view.centerRe + (px + 0.5 - w / 2) / scale;
      let y = im0;
      let found = -1;
      let steps = iter;
      for (let n = 0; n < iter; n++) {
        let sx = 0;
        let sy = 0;
        let hit = -1;
        for (let k = 0; k < nRoots; k++) {
          const dx = x - rr[k * 2];
          const dy = y - rr[k * 2 + 1];
          const d2 = dx * dx + dy * dy;
          if (d2 <= tol2) { hit = k; break; }
          sx += dx / d2;
          sy += -dy / d2;
        }
        if (hit >= 0) { found = hit; steps = n; break; }
        const s2 = sx * sx + sy * sy;
        if (!(s2 > 1e-18) || !Number.isFinite(s2)) break;
        const nx = x - sx / s2;
        const ny = y + sy / s2;
        // A step near a flat tangent can land far out and still walk back to a root.
        // Stop only when the numbers themselves break. A distance cutoff paints those
        // starts as "did not settle" while the single-guess walk still finds a root.
        if (!Number.isFinite(nx) || !Number.isFinite(ny)) break;
        x = nx;
        y = ny;
      }
      out[row + px] = found < 0 ? 0 : (found + 1) + (steps / iter) * 0.999;
    }
  }
}

function writeRgb(data, o, rgb) {
  data[o] = rgb.r;
  data[o + 1] = rgb.g;
  data[o + 2] = rgb.b;
  data[o + 3] = 255;
}

function mix(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

// inside: stayed. slow: escaped late (near the set). fast: escaped at once.
export function paintJulia(data, field, w, h, y0, y1, maxIter, inside, slow, fast) {
  const iter = maxIter || 1;
  const end = y1 * w;
  for (let i = y0 * w; i < end; i++) {
    const v = field[i];
    const o = i * 4;
    if (v < 0) writeRgb(data, o, inside);
    else {
      let t = v / iter;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      t = Math.sqrt(t);
      writeRgb(data, o, mix(fast, slow, t));
    }
  }
}

// colours.basins is one {r,g,b} per root, in order. colours.none is "did not settle".
// A late arrival is pulled toward `none`, so the boundary between basins goes dark.
export function paintNewton(data, field, w, h, y0, y1, colours) {
  const basins = colours.basins;
  const none = colours.none;
  const end = y1 * w;
  for (let i = y0 * w; i < end; i++) {
    const v = field[i];
    const o = i * 4;
    if (!(v > 0)) { writeRgb(data, o, none); continue; }
    const index = Math.floor(v) - 1;
    const t = (v - Math.floor(v)) / 0.999;
    const basin = basins[index] || none;
    writeRgb(data, o, mix(basin, none, Math.min(1, Math.max(0, t)) * 0.82));
  }
}

export function juliaWalk(z, c, maxSteps, escape2) {
  const points = [{ re: z.re, im: z.im }];
  let x = z.re;
  let y = z.im;
  const cap = maxSteps | 0;
  for (let n = 0; n < cap; n++) {
    const nx = x * x - y * y + c.re;
    const ny = 2 * x * y + c.im;
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
      return { points, escaped: true, steps: n + 1 };
    }
    x = nx;
    y = ny;
    points.push({ re: x, im: y });
    if (x * x + y * y > escape2) return { points, escaped: true, steps: n + 1 };
  }
  return { points, escaped: false, steps: cap };
}

export function newtonWalk(z, roots, maxSteps, tol2) {
  const points = [{ re: z.re, im: z.im }];
  let x = z.re;
  let y = z.im;
  const cap = maxSteps | 0;
  const nRoots = roots.length;
  for (let n = 0; n < cap; n++) {
    let sx = 0;
    let sy = 0;
    let hit = -1;
    for (let k = 0; k < nRoots; k++) {
      const dx = x - roots[k].re;
      const dy = y - roots[k].im;
      const d2 = dx * dx + dy * dy;
      if (d2 <= tol2) { hit = k; break; }
      sx += dx / d2;
      sy += -dy / d2;
    }
    if (hit >= 0) return { points, root: hit, steps: n };
    const s2 = sx * sx + sy * sy;
    if (!(s2 > 1e-18) || !Number.isFinite(s2)) return { points, root: -1, steps: n };
    const nx = x - sx / s2;
    const ny = y + sy / s2;
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return { points, root: -1, steps: n };
    x = nx;
    y = ny;
    points.push({ re: x, im: y });
  }
  let best = -1;
  let bestD = Infinity;
  for (let k = 0; k < nRoots; k++) {
    const dx = x - roots[k].re;
    const dy = y - roots[k].im;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD) { bestD = d2; best = k; }
  }
  if (bestD <= tol2) return { points, root: best, steps: cap };
  return { points, root: -1, steps: cap };
}

// Coefficients of the monic polynomial with these roots, constant term first.
// (z − r)(z − s) = z^2 − (r+s)z + rs, so index 0 is the constant term.
export function monicCoeffs(roots) {
  let c = [{ re: 1, im: 0 }];
  for (const r of roots) {
    const next = [];
    for (let k = 0; k <= c.length; k++) next.push({ re: 0, im: 0 });
    for (let k = 0; k < c.length; k++) {
      next[k + 1].re += c[k].re;
      next[k + 1].im += c[k].im;
      next[k].re += -r.re * c[k].re + r.im * c[k].im;
      next[k].im += -r.re * c[k].im - r.im * c[k].re;
    }
    c = next;
  }
  return c;
}

// '#0b63ad', 'rgb(11, 99, 173)', 'rgba(11, 99, 173, 0.5)' → {r,g,b} or null.
export function parseCssColor(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let hx = m[1];
    if (hx.length === 3 || hx.length === 4) hx = hx.split('').map((ch) => ch + ch).join('');
    if (hx.length !== 6 && hx.length !== 8) return null;
    return { r: parseInt(hx.slice(0, 2), 16), g: parseInt(hx.slice(2, 4), 16), b: parseInt(hx.slice(4, 6), 16) };
  }
  m = /^rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)/i.exec(s);
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  return null;
}
