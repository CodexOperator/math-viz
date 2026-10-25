// External rays of z² + c. The book does not number them, and it does not
// number where a ray lands. Angle 0 is the real half-line past the cusp.
// Angle 1/2 is the real half-line before the tip. Angles 1/3 and 2/3 are
// one landing: both meet the period-2 bulb root at c = −3/4.

const TAU = Math.PI * 2;

// The argument of the Böttcher coordinate, in turns. The divisor is 2^n
// with n the escape index that starts at 0. A later power lands on 1/4
// of the true angle.
export function external(cre, cim) {
  let zre = 0;
  let zim = 0;
  let theta = 0;
  const bail = 1e6;
  for (let n = 0; n < 280; n++) {
    const nre = zre * zre - zim * zim + cre;
    const nim = 2 * zre * zim + cim;
    const a = Math.atan2(nim, nre);
    const k = Math.round((2 * theta - a) / TAU);
    theta = a + TAU * k;
    zre = nre;
    zim = nim;
    if (zre * zre + zim * zim > bail) {
      let turns = (theta / 2 ** n) / TAU;
      turns -= Math.floor(turns);
      if (turns < 0) turns += 1;
      return turns;
    }
  }
  return null;
}

function angDiff(got, target) {
  let d = got - target;
  d -= Math.round(d);
  return d;
}

function angleError(R, ang, turns) {
  const got = external(R * Math.cos(ang), R * Math.sin(ang));
  if (got == null) return null;
  return angDiff(got, turns);
}

// Newton on the argument, at a fixed radius, then a smaller radius.
// The last sample is the landing itself.
export function traceRay(turns, landing) {
  const pts = [];
  let ang = turns * TAU;
  let R = 8;
  for (let step = 0; step < 64; step++) {
    for (let k = 0; k < 16; k++) {
      const e0 = angleError(R, ang, turns);
      const e1 = angleError(R, ang + 1e-4, turns);
      if (e0 == null || e1 == null) break;
      const deriv = (e1 - e0) / 1e-4;
      if (!(Math.abs(deriv) > 1e-8)) break;
      const move = Math.max(-0.35, Math.min(0.35, e0 / deriv));
      ang -= move;
      if (Math.abs(move) < 1e-5) break;
    }
    const re = R * Math.cos(ang);
    const im = R * Math.sin(ang);
    const got = external(re, im);
    if (got != null && Math.abs(angDiff(got, turns)) < 0.015) pts.push([re, im]);
    const dist = Math.hypot(re - landing[0], im - landing[1]);
    if (dist < 0.045) break;
    R *= dist < 0.4 ? 0.94 : 0.9;
    if (R < 0.05) break;
  }
  pts.push([landing[0], landing[1]]);
  return pts;
}

export const LAND_CUSP = [0.25, 0];
export const LAND_TIP = [-2, 0];
export const LAND_PAIR = [-0.75, 0];

function realSamples(landing, outward, n = 28) {
  const pts = [];
  for (let i = n; i >= 1; i--) {
    const t = i / n;
    const reach = 8 * t;
    pts.push([landing[0] + outward * reach, 0]);
  }
  pts.push([landing[0], landing[1]]);
  return pts;
}

let cache = null;
export function rayCurves() {
  if (cache) return cache;
  cache = [
    { angle: 0, label: '0', name: 'cusp', landing: LAND_CUSP, complex: false, samples: realSamples(LAND_CUSP, 1) },
    { angle: 0.5, label: '1/2', name: 'tip', landing: LAND_TIP, complex: false, samples: realSamples(LAND_TIP, -1) },
    { angle: 1 / 3, label: '1/3', name: 'pair', landing: LAND_PAIR, complex: true, samples: traceRay(1 / 3, LAND_PAIR) },
    { angle: 2 / 3, label: '2/3', name: 'pair', landing: LAND_PAIR, complex: true, samples: traceRay(2 / 3, LAND_PAIR) },
  ];
  return cache;
}
