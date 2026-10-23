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
//
// A quadratic walk also leaves at |z| > 2 before any disk is considered, and
// a disk is Settles only when the multiplier of the last p steps is below 1.
// That product is |2z| at each of those points. A repelling cycle can sit
// still inside the disk; it does not attract, so the sentence says Stays.
// Newton uses the same disks and |N'(z)|. It is a root only when |p(z)| is small.
//
// A product that is below 1 but still at least PARABOLIC_LAM has not landed.
// Just outside the cusp the point is short of 1/2, so the window product is
// under 1 while the disk has already closed, and the orbit leaves later.
// The walk keeps the first such disk and continues until the orbit escapes
// or PARABOLIC_EXTRA further steps pass. A later window whose product reaches
// 1 is the approach passing |z| = 1/2, not a Stays verdict. The basilica stays
// under 1 and never leaves, so it is still Settles at the step the disk first closed.

export const ORBIT_K_MIN = 2;
export const ORBIT_K_MAX = 64;
export const ORBIT_K_DEFAULT = 5;
export const ORBIT_R_PX = 4;
export const ORBIT_PERIOD_MAX = 32;
// |z| > 2 is escape for z² + c when |c| ≤ 2. Callers with a larger |c| pass
// their own escapes test (max(2, |c|)) and this default is not applied on top.
export const QUADRATIC_ESCAPE = 2;
export const NEWTON_ROOT_TOL = 1e-4;
// A window this close to 1 is a crawl, not a landing. On the station's
// companion the disk is about 0.07, and c = 1/4 + 1e-5 first closes there
// with a product near 0.95. The threshold sits under that. The basilica's
// product is higher, and it never escapes, so the same walk still says Settles.
export const PARABOLIC_LAM = 0.93;
// Enough that c = 1/4 + 1e-7 still reaches |z| > 2 (step 9933). The basilica
// never escapes, so this shorter continuation is the one it pays.
export const PARABOLIC_EXTRA = 12000;
// c = 1/4 + ε climbs along the real axis toward 1/2 and only then leaves.
// ε = 1e-8 leaves on step 31414, past PARABOLIC_EXTRA. A real climb gets this
// longer lookahead. If it escapes, the verdict is Leaves. If the look runs out
// and the orbit is 0 under z² + c for a real c greater than 1/4, Exercise 8
// already says that c is not in the set. The sentence is Leaves, and the closed
// disk is not Settles. c = 1/4 itself is the parabolic point. It never leaves,
// and the first disk stands. The basilica is not this climb.
export const CUSP_EXTRA = 40000;
// The seeds chip for c = 1/2 says the same opening. The last clause is only
// the exhausted probe: a finite watch did not see |z| > 2, and that is not a landing.
export const CUSP_OUTSIDE_SENTENCE = 'Leaves. Exercise 8. A real c bigger than 1/4 is not in the set. Each step grows by at least c − 1/4. The probe stopped while the walk was still climbing, so this is not Settles.';

// The orbit of 0 just outside the cusp is real and still climbing toward 1/2.
function realClimb(points) {
  if (!points || points.length < 6) return false;
  const a = points[points.length - 6];
  const b = points[points.length - 1];
  if (Math.abs(a.im) > 1e-8 || Math.abs(b.im) > 1e-8) return false;
  return b.re > a.re + 1e-15 && b.re > 0.2 && b.re < 2;
}

// Exercise 8 is the orbit of 0 under z² + c. The first three points are
// 0, c, c² + c. A higher power, Newton, and a start that is not 0 are not this test.
function realCuspOutside(points) {
  if (!points || points.length < 3) return false;
  const z0 = points[0];
  if (Math.hypot(z0.re, z0.im) > 1e-12) return false;
  const c = points[1];
  if (!(c.re > 0.25) || Math.abs(c.im) > 1e-12) return false;
  const z2 = points[2];
  const re = c.re * c.re - c.im * c.im + c.re;
  const im = 2 * c.re * c.im + c.im;
  return Math.hypot(z2.re - re, z2.im - im) <= 1e-9;
}

function pastRealCusp(c) {
  return !!(c && c.re > 0.25 && Math.abs(c.im) <= 1e-12);
}

// Look ahead along a real climb without the disk test. Escape ends the walk.
// A climb that flattens, or that lasts CUSP_EXTRA steps without leaving, is
// not an escape: the caller rewinds to the disk it was holding, unless Exercise 8
// already says this critical orbit leaves.
function hopClimb(points, step, opts, n, extra) {
  const cap = n + 1 + extra;
  for (let s = n + 1; s < cap; s++) {
    const w = step(points[points.length - 1]);
    if (!w || !Number.isFinite(w.re) || !Number.isFinite(w.im)) {
      return { done: true, reason: 'escape', steps: s };
    }
    points.push(w);
    if (opts.escapes && opts.escapes(w)) return { done: true, reason: 'escape', steps: s + 1 };
    if (leftQuadratic(w, opts)) return { done: true, reason: 'escape', steps: s + 1 };
    if (opts.offScreen && opts.offScreen(w)) return { done: true, reason: 'screen', steps: s + 1 };
    if (!realClimb(points)) return { done: false };
  }
  return { done: false, exhausted: true };
}

export function quadraticAbsDeriv(z) {
  return 2 * Math.hypot(z.re, z.im);
}

// |N'(z)| for N(z) = z − p(z)/p'(z), from the roots of a monic p.
// At a root, within the station's snap, the multiplier of a simple root is 0.
export function newtonAbsDeriv(z, roots, tol2 = NEWTON_ROOT_TOL) {
  if (!z || !roots || !roots.length) return Infinity;
  let s1x = 0;
  let s1y = 0;
  let s2x = 0;
  let s2y = 0;
  for (const r of roots) {
    const dx = z.re - r.re;
    const dy = z.im - r.im;
    const d2 = dx * dx + dy * dy;
    if (d2 <= tol2) return 0;
    const invx = dx / d2;
    const invy = -dy / d2;
    s1x += invx;
    s1y += invy;
    s2x += invx * invx - invy * invy;
    s2y += 2 * invx * invy;
  }
  const denx = s1x * s1x - s1y * s1y;
  const deny = 2 * s1x * s1y;
  const den2 = denx * denx + deny * deny;
  if (!(den2 > 0)) return Infinity;
  const qx = (s2x * denx + s2y * deny) / den2;
  const qy = (s2y * denx - s2x * deny) / den2;
  return Math.hypot(1 - qx, -qy);
}

// |p(z)| for monic p with the given roots. A point already inside the station's
// root snap counts as 0: the step has stopped on that root, and |p| there is
// the rounding of a landed root, not a separate cycle.
export function newtonPolyAbs(z, roots, tol2 = NEWTON_ROOT_TOL) {
  if (!z || !roots || !roots.length) return Infinity;
  let x = 1;
  let y = 0;
  for (const r of roots) {
    const dx = z.re - r.re;
    const dy = z.im - r.im;
    if (dx * dx + dy * dy <= tol2) return 0;
    const nx = x * dx - y * dy;
    const ny = x * dy + y * dx;
    x = nx;
    y = ny;
  }
  return Math.hypot(x, y);
}

// The disk can say Settles before anyone asks |f'|. The stations pass absDeriv
// into orbitUntil, so the walk itself refuses a repelling cycle. A page that
// already walked with the disk — the playground, which must not teach that
// rule to the assembler — calls this on the result it is about to show.
// Same points, same step, same disks. The word changes when the product is
// not below 1. Newton can also set the root flag the sentence already reads.
export function applyDisplayedGuard(result, opts = {}) {
  if (!result || result.reason !== 'cluster' || !(result.period >= 1)) return result;
  const lam = multiplierProduct(result.points, result.period, opts.absDeriv);
  if (lam == null) return result;
  const next = { ...result, multiplier: lam };
  if (!(lam < 1)) {
    next.reason = 'closed';
    next.root = null;
    return next;
  }
  if (typeof opts.polyAbs === 'function' && result.points && result.points.length) {
    const mag = opts.polyAbs(result.points[result.points.length - 1]);
    const tol = Number.isFinite(opts.polyTol) && opts.polyTol > 0 ? opts.polyTol : NEWTON_ROOT_TOL;
    next.root = Number.isFinite(mag) && mag <= tol;
  }
  return next;
}

// Product of |f'| over the last p points. Infinity if a factor is not a number.
export function multiplierProduct(points, p, absDeriv) {
  if (typeof absDeriv !== 'function' || !points || p < 1) return null;
  let lam = 1;
  const n = points.length;
  for (let j = 0; j < p; j++) {
    const z = points[n - 1 - j];
    const a = absDeriv(z);
    if (!(a >= 0) || !Number.isFinite(a)) return Infinity;
    lam *= a;
  }
  return lam;
}

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

function leftQuadratic(z, opts) {
  if (!opts.quadratic || typeof opts.escapes === 'function') return false;
  const R = Number.isFinite(opts.escapeRadius) && opts.escapeRadius > 0 ? opts.escapeRadius : QUADRATIC_ESCAPE;
  return z.re * z.re + z.im * z.im > R * R;
}

function rootFlag(points, opts) {
  if (typeof opts.polyAbs !== 'function' || !points.length) return null;
  const mag = opts.polyAbs(points[points.length - 1]);
  const tol = Number.isFinite(opts.polyTol) && opts.polyTol > 0 ? opts.polyTol : NEWTON_ROOT_TOL;
  return Number.isFinite(mag) && mag <= tol;
}

// step(z) -> next z. escapes(z) and offScreen(z) are optional predicates.
// quadratic: if the caller did not pass escapes, |z| > 2 (or escapeRadius) is escape, and it is checked before any disk.
// absDeriv(z): |f'(z)|. A disk is Settles only when the product over the last p steps is < 1.
//   Otherwise the walk has closed on screen and the sentence says Stays.
// polyAbs(z): |p(z)| for Newton. A Settles landing is a root only when that value is small.
export function orbitUntil(start, step, opts = {}) {
  const asked = opts.K == null ? ORBIT_K_DEFAULT : opts.K | 0;
  const K = Math.min(ORBIT_K_MAX, Math.max(ORBIT_K_MIN, asked));
  const R = Number.isFinite(opts.R) && opts.R > 0 ? opts.R : null;
  const need = ORBIT_PERIOD_MAX * K;
  const cap = Math.max(K + 1, opts.maxPoints == null ? Math.max(800, need) : opts.maxPoints | 0);
  const empty = {
    points: [], reason: 'escape', steps: 0, disk: null, disks: [], period: null, K, R,
    multiplier: null, root: null,
  };
  if (!start || !Number.isFinite(start.re) || !Number.isFinite(start.im)) return empty;
  const points = [{ re: start.re, im: start.im }];
  const finish = (reason, steps, disks, period, multiplier) => {
    const list = disks || [];
    const attracted = reason === 'cluster';
    return {
      points, reason, steps, disk: frameDisk(list), disks: list,
      period: period || null, K, R,
      multiplier: Number.isFinite(multiplier) ? multiplier : null,
      root: attracted ? rootFlag(points, opts) : null,
    };
  };
  // The first near-1 disk. A landing that survives the continuation is this
  // one, so the basilica still reports the step where the disk closed.
  // A later window whose product reaches 1 is the approach passing |z| = 1/2.
  // It is not a verdict. Escape is the verdict. The basilica never escapes.
  let held = null;
  let limit = cap;
  for (let n = 0; n < limit; n++) {
    const z = step(points[points.length - 1]);
    if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) {
      return finish('escape', n, null, null, null);
    }
    points.push(z);
    // Escape before any disk. A slow pass near a parabolic point is not a landing.
    if (opts.escapes && opts.escapes(z)) return finish('escape', n + 1, null, null, null);
    if (leftQuadratic(z, opts)) return finish('escape', n + 1, null, null, null);
    if (opts.offScreen && opts.offScreen(z)) return finish('screen', n + 1, null, null, null);
    if (!(R > 0) || points.length < K) continue;
    const pMax = Math.min(ORBIT_PERIOD_MAX, Math.floor(points.length / K));
    for (let p = 1; p <= pMax; p++) {
      const prev = points[points.length - 1 - p];
      if (Math.hypot(z.re - prev.re, z.im - prev.im) > R) continue;
      const disks = residueDisks(points, p, K, R);
      if (!disks) break;
      const lam = multiplierProduct(points, p, opts.absDeriv);
      if (lam != null && lam >= PARABOLIC_LAM && lam < 1) {
        if (!held) {
          held = { steps: n + 1, disks, period: p, multiplier: lam, length: points.length };
          limit = Math.max(limit, n + 1 + PARABOLIC_EXTRA);
          if (realClimb(points)) {
            const hopped = hopClimb(points, step, opts, n, CUSP_EXTRA);
            if (hopped.done) return finish(hopped.reason, hopped.steps, null, null, null);
            const outside = hopped.exhausted && realCuspOutside(points);
            const watched = points.length - 1;
            points.length = held.length;
            if (outside) return finish('cusp', watched, null, null, null);
            if (hopped.exhausted) return finish('cluster', held.steps, held.disks, held.period, held.multiplier);
          }
        }
        break;
      }
      if (lam != null && !(lam < 1)) {
        if (held) break;
        return finish('closed', n + 1, disks, p, lam);
      }
      return finish('cluster', n + 1, disks, p, lam);
    }
  }
  if (held) {
    points.length = held.length;
    return finish('cluster', held.steps, held.disks, held.period, held.multiplier);
  }
  return finish('cap', cap, null, R > 0 ? closingPeriod(points, R) : 0, null);
}

export function orbitSentence(result) {
  if (!result) return '';
  const K = result.K;
  const R = trim(result.R);
  const p = result.period;
  if (result.reason === 'cusp') return CUSP_OUTSIDE_SENTENCE;
  if (result.reason === 'escape') return `Leaves. The walk escaped on step ${result.steps}.`;
  if (result.reason === 'screen') {
    return `Leaves. It left the screen on step ${result.steps}, before ${K} points of each place in a cycle could sit in a disk of radius ${R}.`;
  }
  if (result.reason === 'closed') {
    const place = p === 1
      ? `The last ${K} points sit inside a disk of radius ${R}`
      : `The last ${K} points of each place sit inside a disk of radius ${R}`;
    return `Stays. Period ${p}. ${place}, and the multiplier is not below 1, so the cycle does not attract.`;
  }
  if (result.reason === 'cluster') {
    const rootNote = result.root === false ? ' |p(z)| is not small, so this is a cycle, not a root.' : '';
    if (p === 1) return `Settles. Period 1. The last ${K} points sit inside a disk of radius ${R}. On this screen they can look like one mark.${rootNote}`;
    const crowded = placesOverlap(result.disks, result.R);
    const tail = crowded
      ? ' On this screen those places overlap. Zoom to the clusters, and they separate.'
      : '';
    return `Settles. Period ${p}. The last ${K} points of each place sit inside a disk of radius ${R}.${tail}${rootNote}`;
  }
  if (p) {
    return `Stays. A return of ${p} steps fits in the disk of radius ${R}, but the last ${K} points of each place are not inside it. The probe stops at ${ORBIT_PERIOD_MAX}, so this return is not the attracting period. Stopped after ${result.steps} steps.`;
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
  const periodMax = opts.periodMax == null ? 32 : opts.periodMax | 0;
  const pMax = Math.min(Math.max(1, periodMax), pts.length - 1);
  for (let p = 1; p <= pMax; p++) {
    const prev = pts[pts.length - 1 - p];
    if (Math.hypot(last.re - prev.re, last.im - prev.im) < tol) {
      // A real c past 1/4 can sit inside the tolerance while it is still climbing.
      // Exercise 8 says that orbit leaves. Period 1 here would be the false landing.
      if (pastRealCusp(c)) return { bounded: false, period: 0, steps: pts.length };
      return { bounded: true, period: p, steps: pts.length };
    }
  }
  if (pastRealCusp(c)) return { bounded: false, period: 0, steps: pts.length };
  return { bounded: true, period: null, steps: pts.length };
}
