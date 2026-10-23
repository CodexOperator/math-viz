// Keep walking until the orbit decides.
//
// It leaves (escapes, or goes off the screen), or the last K points sit inside
// a disk of radius R. Those three endings are the site's sentence: leaves,
// settles, or stays. K is 5 unless the learner sets it, never under 2, never
// over 64. R is 0.001. The disk is the average of those points, so a glob on
// the picture can be named as separate points crowded together.

export const ORBIT_K_MIN = 2;
export const ORBIT_K_MAX = 64;
export const ORBIT_K_DEFAULT = 5;
export const ORBIT_R_DEFAULT = 0.001;

export function clusterDisk(points, R) {
  if (!points || points.length < 2 || !(R > 0)) return null;
  let cx = 0;
  let cy = 0;
  for (const p of points) { cx += p.re; cy += p.im; }
  cx /= points.length;
  cy /= points.length;
  let max = 0;
  for (const p of points) max = Math.max(max, Math.hypot(p.re - cx, p.im - cy));
  if (max <= R) return { re: cx, im: cy, radius: R, spread: max };
  return null;
}

// step(z) -> next z. escapes(z) and offScreen(z) are optional predicates.
export function orbitUntil(start, step, opts = {}) {
  const asked = opts.K == null ? ORBIT_K_DEFAULT : opts.K | 0;
  const K = Math.min(ORBIT_K_MAX, Math.max(ORBIT_K_MIN, asked));
  const R = Number.isFinite(opts.R) && opts.R > 0 ? opts.R : ORBIT_R_DEFAULT;
  const cap = Math.max(K + 1, opts.maxPoints == null ? 800 : opts.maxPoints | 0);
  if (!start || !Number.isFinite(start.re) || !Number.isFinite(start.im)) {
    return { points: [], reason: 'escape', steps: 0, disk: null, K, R };
  }
  const points = [{ re: start.re, im: start.im }];
  const recent = [points[0]];
  for (let n = 0; n < cap; n++) {
    const z = step(points[points.length - 1]);
    if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) {
      return { points, reason: 'escape', steps: n, disk: null, K, R };
    }
    points.push(z);
    if (opts.escapes && opts.escapes(z)) {
      return { points, reason: 'escape', steps: n + 1, disk: null, K, R };
    }
    if (opts.offScreen && opts.offScreen(z)) {
      return { points, reason: 'screen', steps: n + 1, disk: null, K, R };
    }
    recent.push(z);
    if (recent.length > K) recent.shift();
    if (recent.length >= K) {
      const disk = clusterDisk(recent, R);
      if (disk) return { points, reason: 'cluster', steps: n + 1, disk, K, R };
    }
  }
  return { points, reason: 'cap', steps: cap, disk: null, K, R };
}

export function orbitSentence(result) {
  if (!result) return '';
  const K = result.K;
  const R = result.R;
  if (result.reason === 'escape') return `Leaves. The walk escaped on step ${result.steps}.`;
  if (result.reason === 'screen') return `Leaves. It left the screen on step ${result.steps}, before a disk of radius ${trim(R)} could hold the last ${K} points.`;
  if (result.reason === 'cluster') return `Settles. The last ${K} points sit inside a disk of radius ${trim(R)}. They can look like one mark.`;
  return `Stays. Stopped after ${result.steps} steps. It has not escaped, and the last ${K} points are not inside a disk of radius ${trim(R)}.`;
}

function trim(x) {
  if (!Number.isFinite(x)) return '0';
  const n = Math.round(x * 1e8) / 1e8;
  return String(Object.is(n, -0) ? 0 : n);
}

// Period of the orbit of 0 for z² + c, once it has settled into a short cycle.
// 0 means the orbit escaped. null means it stayed but no cycle of length ≤ 32
// showed up within 0.001. A slow approach, such as c = −0.75, still counts.
export function criticalPeriod(c, opts = {}) {
  const maxIter = opts.maxIter == null ? 240 : opts.maxIter | 0;
  const tol = Number.isFinite(opts.tol) && opts.tol > 0 ? opts.tol : 1e-3;
  let x = 0;
  let y = 0;
  const pts = [];
  for (let n = 0; n < maxIter; n++) {
    const nx = x * x - y * y + c.re;
    const ny = 2 * x * y + c.im;
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || nx * nx + ny * ny > 4) {
      return { bounded: false, period: 0, steps: n + 1 };
    }
    x = nx;
    y = ny;
    pts.push({ re: x, im: y });
  }
  const last = pts[pts.length - 1];
  const pMax = Math.min(32, pts.length - 1);
  for (let p = 1; p <= pMax; p++) {
    const prev = pts[pts.length - 1 - p];
    if (Math.hypot(last.re - prev.re, last.im - prev.im) < tol) {
      return { bounded: true, period: p, steps: pts.length };
    }
  }
  return { bounded: true, period: null, steps: pts.length };
}
