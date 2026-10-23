// Keep walking until the orbit decides, at the size the screen can show.
//
// It leaves (escapes, or goes off the screen), or it settles. Settling is the
// smallest period p, from 1 to 32, such that the newest point lies within R of
// the point p steps back, and the K newest points of every residue mod p sit
// inside a disk of radius R. The center of that window has moved by at most a
// quarter of a screen pixel (R/16, because R is 4 pixels) since the previous
// K points of the same residue, so a crawl that is still walking has not
// landed. A fixed point is one disk. A p-cycle is p disks. Consecutive points
// of a 2-cycle do not share a disk, and that is not Stays.
//
// K is 5 unless the learner sets it, never under 2, never over 64. R is not a
// fixed world length. On a picture it is ORBIT_R_PX screen pixels, in world
// units, and it changes with the window until the learner types a radius.
// The disks are the disks that were tested, so a glob can be checked by eye.

export const ORBIT_K_MIN = 2;
export const ORBIT_K_MAX = 64;
export const ORBIT_K_DEFAULT = 5;
export const ORBIT_R_PX = 4;
export const ORBIT_PERIOD_MAX = 32;

// World-unit radius of `px` screen pixels. Width is the view, in world units.
export function radiusInWorld(unitsAcross, widthPx, px = ORBIT_R_PX) {
  const units = Number(unitsAcross);
  const width = Number(widthPx);
  const pixels = Number(px);
  if (!(units > 0) || !(width > 0) || !(pixels > 0)) return null;
  return (pixels * units) / width;
}

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

// One disk that contains every cluster disk. Zoom frames this.
export function frameDisk(disks) {
  if (!disks || !disks.length) return null;
  let re = 0;
  let im = 0;
  for (const d of disks) { re += d.re; im += d.im; }
  re /= disks.length;
  im /= disks.length;
  let radius = 0;
  for (const d of disks) radius = Math.max(radius, Math.hypot(d.re - re, d.im - im) + d.radius);
  return { re, im, radius };
}

function residueDisks(points, p, K, R) {
  // Two windows of K, so the center has to have stopped moving on the screen.
  if (points.length < p * K * 2) return null;
  const pixel = R / ORBIT_R_PX;
  const disks = [];
  for (let r = 0; r < p; r++) {
    const group = [];
    for (let i = points.length - 1 - r; i >= 0 && group.length < K; i -= p) group.push(points[i]);
    if (group.length < K) return null;
    const disk = clusterDisk(group, R);
    if (!disk) return null;
    const older = [];
    for (let i = points.length - 1 - r - p * K; i >= 0 && older.length < K; i -= p) older.push(points[i]);
    if (older.length < K) return null;
    let ox = 0;
    let oy = 0;
    for (const q of older) { ox += q.re; oy += q.im; }
    ox /= older.length;
    oy /= older.length;
    if (Math.hypot(disk.re - ox, disk.im - oy) > pixel / 4) return null;
    disks.push(disk);
  }
  return disks;
}

// Smallest p whose return lands inside R. 0 if none does.
export function closingPeriod(points, R) {
  if (!points || points.length < 2 || !(R > 0)) return 0;
  const last = points[points.length - 1];
  const pMax = Math.min(ORBIT_PERIOD_MAX, points.length - 1);
  for (let p = 1; p <= pMax; p++) {
    const prev = points[points.length - 1 - p];
    if (Math.hypot(last.re - prev.re, last.im - prev.im) <= R) return p;
  }
  return 0;
}

// step(z) -> next z. escapes(z) and offScreen(z) are optional predicates.
export function orbitUntil(start, step, opts = {}) {
  const asked = opts.K == null ? ORBIT_K_DEFAULT : opts.K | 0;
  const K = Math.min(ORBIT_K_MAX, Math.max(ORBIT_K_MIN, asked));
  const R = Number.isFinite(opts.R) && opts.R > 0 ? opts.R : null;
  const need = ORBIT_PERIOD_MAX * K;
  const cap = Math.max(K + 1, opts.maxPoints == null ? Math.max(800, need) : opts.maxPoints | 0);
  const empty = { points: [], reason: 'escape', steps: 0, disk: null, disks: [], period: null, K, R };
  if (!start || !Number.isFinite(start.re) || !Number.isFinite(start.im)) return empty;
  const points = [{ re: start.re, im: start.im }];
  const finish = (reason, steps, disks, period) => {
    const list = disks || [];
    return {
      points, reason, steps, disk: frameDisk(list), disks: list,
      period: period || null, K, R,
    };
  };
  for (let n = 0; n < cap; n++) {
    const z = step(points[points.length - 1]);
    if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) {
      return finish('escape', n, null, null);
    }
    points.push(z);
    if (opts.escapes && opts.escapes(z)) return finish('escape', n + 1, null, null);
    if (opts.offScreen && opts.offScreen(z)) return finish('screen', n + 1, null, null);
    if (!(R > 0) || points.length < K) continue;
    const pMax = Math.min(ORBIT_PERIOD_MAX, Math.floor(points.length / K));
    for (let p = 1; p <= pMax; p++) {
      const prev = points[points.length - 1 - p];
      if (Math.hypot(z.re - prev.re, z.im - prev.im) > R) continue;
      const disks = residueDisks(points, p, K, R);
      if (disks) return finish('cluster', n + 1, disks, p);
      break;
    }
  }
  return finish('cap', cap, null, R > 0 ? closingPeriod(points, R) : 0);
}

export function orbitSentence(result) {
  if (!result) return '';
  const K = result.K;
  const R = trim(result.R);
  const p = result.period;
  if (result.reason === 'escape') return `Leaves. The walk escaped on step ${result.steps}.`;
  if (result.reason === 'screen') {
    return `Leaves. It left the screen on step ${result.steps}, before ${K} points of each place in a cycle could sit in a disk of radius ${R}.`;
  }
  if (result.reason === 'cluster') {
    if (p === 1) return `Settles. Period 1. The last ${K} points sit inside a disk of radius ${R}. On this screen they can look like one mark.`;
    const crowded = placesOverlap(result.disks, result.R);
    const tail = crowded
      ? ' On this screen those places overlap. Zoom to the clusters, and they separate.'
      : '';
    return `Settles. Period ${p}. The last ${K} points of each place sit inside a disk of radius ${R}.${tail}`;
  }
  if (p) {
    return `Stays. Period ${p} has closed, but the last ${K} points of each place are not inside a disk of radius ${R}. Stopped after ${result.steps} steps.`;
  }
  return `Stays. Stopped after ${result.steps} steps. It has not escaped, and no cycle of length ${ORBIT_PERIOD_MAX} or less has ${K} points of each place inside a disk of radius ${R}.`;
}

function placesOverlap(disks, R) {
  if (!disks || disks.length < 2 || !(R > 0)) return false;
  for (let i = 0; i < disks.length; i++) {
    for (let j = i + 1; j < disks.length; j++) {
      const d = Math.hypot(disks[i].re - disks[j].re, disks[i].im - disks[j].im);
      if (d < 3 * R) return true;
    }
  }
  return false;
}

function trim(x) {
  if (!Number.isFinite(x)) return '0';
  const a = Math.abs(x);
  if (a !== 0 && (a < 1e-4 || a >= 1e6)) {
    return x.toExponential(2).replace('e+', 'e');
  }
  const n = Math.round(x * 1e8) / 1e8;
  return String(Object.is(n, -0) ? 0 : n);
}

// Period of the orbit of 0 for z² + c, once it has settled into a short cycle.
// 0 means the orbit escaped. null means it stayed but no cycle of length ≤ 32
// showed up within 0.001. A slow approach, such as c = −0.75, still counts.
// This is the theorem's cycle, not the on-screen disk test.
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
