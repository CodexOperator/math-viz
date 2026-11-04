// Pure pictures for Chapter 7. No DOM. The page and the smoke test share these.
// Colours live in the station: blue axes, orange the wall or the band, green the
// point you drag, purple the series.

export const UNIFORM_EPS = 0.35;
export const TAYLOR_SETTLE = 0.08;
export const LAURENT_SETTLE = 0.08;

export function cadd(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function cmul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function cabs(z) {
  return Math.hypot(z.re, z.im);
}

export function cdist(a, b) {
  return Math.hypot(a.re - b.re, a.im - b.im);
}

export function cinv(z) {
  const m = z.re * z.re + z.im * z.im;
  if (m < 1e-18) return { re: 0, im: 0 };
  return { re: z.re / m, im: -z.im / m };
}

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

// Geometric partial sum of n terms, z^0 through z^{n-1}. |S_n - 1/(1-x)| = |x|^n / |1-x|.
export function geometricPartial(x, n) {
  const terms = Math.max(0, n | 0);
  if (terms === 0) return 0;
  if (Math.abs(1 - x) < 1e-12) return terms;
  return (1 - Math.pow(x, terms)) / (1 - x);
}

export function geometricLimit(x) {
  return 1 / (1 - x);
}

export function uniformGap(x, n) {
  return Math.abs(geometricPartial(x, n) - geometricLimit(x));
}

export function placeUniform(x) {
  const v = Number(x);
  return clamp(Number.isFinite(v) ? v : 0.4, -0.9, 0.92);
}

// True while the green point sits inside the orange band. False once it leaves.
// A point near 1. Small n leaves it outside the band. A larger n brings it back.
export function bandHoldsNearOne(n) {
  return uniformGap(0.7, n) < UNIFORM_EPS;
}

export function uniformClaim(x, n) {
  const px = placeUniform(x);
  const gap = uniformGap(px, n);
  const holds = gap < UNIFORM_EPS;
  const broughtBack = bandHoldsNearOne(n);
  let text;
  if (!holds) text = 'At this x, the same partial sum has left the band.';
  else if (!broughtBack) text = 'At this x, the partial sum sits inside the band. Near 1, this n still leaves it.';
  else text = 'At this x, the partial sum sits inside the band. A larger n has brought the curve back.';
  return { holds, x: px, n: n | 0, gap, broughtBack, text };
}

// 1/(1+z^2) = sum_{k=0}^{n} (-1)^k z^{2k}, inside the disk out to ±i.
export function taylorPartial(z, n) {
  const last = Math.max(0, n | 0);
  let sum = { re: 0, im: 0 };
  let p = { re: 1, im: 0 };
  const z2 = cmul(z, z);
  for (let k = 0; k <= last; k += 1) {
    const sign = k % 2 === 0 ? 1 : -1;
    sum = cadd(sum, { re: sign * p.re, im: sign * p.im });
    p = cmul(p, z2);
  }
  return sum;
}

export function taylorValue(z) {
  const z2 = cmul(z, z);
  return cinv({ re: 1 + z2.re, im: z2.im });
}

export function taylorError(z, n) {
  return cdist(taylorPartial(z, n), taylorValue(z));
}

export const TAYLOR_WINDOW = 1.65;
const TAYLOR_SNAP = 0.06;

export function placeTaylor(re, im) {
  let x = Number(re);
  let y = Number(im);
  if (!Number.isFinite(x)) x = 0.25;
  if (!Number.isFinite(y)) y = 0;
  x = clamp(x, -TAYLOR_WINDOW, TAYLOR_WINDOW);
  y = clamp(y, -TAYLOR_WINDOW, TAYLOR_WINDOW);
  const mod = Math.hypot(x, y);
  if (mod > 1e-9 && Math.abs(mod - 1) <= TAYLOR_SNAP) {
    return { re: x / mod, im: y / mod, snapped: true, mod: 1 };
  }
  return { re: x, im: y, snapped: false, mod };
}

export function taylorClaim(re, im, n, revealed = true) {
  const z = placeTaylor(re, im);
  const err = z.snapped ? Infinity : taylorError(z, n);
  const outside = z.snapped || z.mod >= 1 - 1e-9;
  let text;
  let holds;
  if (!revealed && !outside) {
    text = 'This partial sum agrees with the function.';
    holds = err < TAYLOR_SETTLE;
  } else if (outside) {
    text = 'The agreement stops at the circle through $\\pm i$.';
    holds = false;
  } else if (err < TAYLOR_SETTLE) {
    text = 'This partial sum agrees with the function. The agreement stops at the circle through $\\pm i$.';
    holds = true;
  } else {
    text = 'Inside the disk, this partial sum has not caught the value yet.';
    holds = false;
  }
  return { holds, text, err, n: n | 0, re: z.re, im: z.im, mod: z.mod, snapped: z.snapped, outside };
}

// Example 7.7, page 228. f(z) = 3/(2+z-z^2), poles at -1 and 2.
export function example77(z) {
  const d = { re: 2 + z.re - (z.re * z.re - z.im * z.im), im: z.im - 2 * z.re * z.im };
  return cmul({ re: 3, im: 0 }, cinv(d));
}

export function example77Partial(z, n, region) {
  const N = Math.max(1, n | 0);
  let sum = { re: 0, im: 0 };
  if (region === 'disk') {
    let p = { re: 1, im: 0 };
    for (let k = 0; k < N; k += 1) {
      const c = ((k % 2 === 0) ? 1 : -1) + 1 / 2 ** (k + 1);
      sum = cadd(sum, { re: c * p.re, im: c * p.im });
      p = cmul(p, z);
    }
    return sum;
  }
  if (region === 'out') {
    let inv = cinv(z);
    let p = { re: inv.re, im: inv.im };
    for (let k = 1; k <= N; k += 1) {
      const c = ((k % 2 === 0) ? -1 : 1) - 2 ** (k - 1);
      sum = cadd(sum, { re: c * p.re, im: c * p.im });
      p = cmul(p, inv);
    }
    return sum;
  }
  let inv = cinv(z);
  let neg = { re: inv.re, im: inv.im };
  for (let k = 1; k <= N; k += 1) {
    const c = (k % 2 === 0) ? -1 : 1;
    sum = cadd(sum, { re: c * neg.re, im: c * neg.im });
    neg = cmul(neg, inv);
  }
  let p = { re: 1, im: 0 };
  for (let k = 0; k < N; k += 1) {
    const c = 1 / 2 ** (k + 1);
    sum = cadd(sum, { re: c * p.re, im: c * p.im });
    p = cmul(p, z);
  }
  return sum;
}

export const LAURENT_WINDOW = 3.2;
const LAURENT_SNAP = 0.07;

export function laurentRegion(mod) {
  if (Math.abs(mod - 1) <= 1e-9 || Math.abs(mod - 2) <= 1e-9) return 'wall';
  if (mod < 1) return 'disk';
  if (mod > 2) return 'out';
  return 'annulus';
}

export function placeLaurent(re, im) {
  let x = Number(re);
  let y = Number(im);
  if (!Number.isFinite(x)) x = 1.4;
  if (!Number.isFinite(y)) y = 0.2;
  x = clamp(x, -LAURENT_WINDOW, LAURENT_WINDOW);
  y = clamp(y, -LAURENT_WINDOW, LAURENT_WINDOW);
  let mod = Math.hypot(x, y);
  const near1 = Math.abs(mod - 1);
  const near2 = Math.abs(mod - 2);
  const snap = near1 <= LAURENT_SNAP || near2 <= LAURENT_SNAP;
  if (snap && mod > 1e-9) {
    const radius = near1 <= near2 ? 1 : 2;
    x = (x / mod) * radius;
    y = (y / mod) * radius;
    mod = radius;
  }
  return { re: x, im: y, mod, snapped: snap && (mod === 1 || mod === 2), region: laurentRegion(mod) };
}

export function laurentError(z, n) {
  const region = laurentRegion(cabs(z));
  if (region === 'wall') return Infinity;
  return cdist(example77Partial(z, n, region), example77(z));
}

export function laurentClaim(re, im, n, revealed = true) {
  const z = placeLaurent(re, im);
  const err = z.region === 'wall' ? Infinity : laurentError(z, n);
  let text;
  if (!revealed && z.region === 'annulus') text = 'You are between the two orange circles.';
  else if (z.region === 'wall') text = 'The point sits on a circle through a pole.';
  else if (z.region === 'disk') text = 'Inside both poles, every power in this series is non-negative.';
  else if (z.region === 'out') text = 'Outside both poles, every power in this series is negative.';
  else text = 'Between the poles, the series uses negative powers from the inner pole and non-negative powers from the outer one.';
  return {
    holds: z.region !== 'wall',
    text,
    err,
    n: n | 0,
    re: z.re,
    im: z.im,
    mod: z.mod,
    region: z.region,
    settled: z.region !== 'wall' && err < LAURENT_SETTLE,
  };
}

// z^2 on the unit circle. One full turn of the green point winds the image twice.
export function windingFrame(theta, travel) {
  const t = Number(theta) || 0;
  const walked = Math.max(0, Number(travel) || 0);
  const z = { re: Math.cos(t), im: Math.sin(t) };
  const w = { re: Math.cos(2 * t), im: Math.sin(2 * t) };
  const revealed = walked >= 2 * Math.PI - 0.05;
  return {
    z,
    w,
    theta: t,
    travel: walked,
    revealed,
    text: revealed
      ? 'The purple image went around twice. The zero has order 2.'
      : 'The green point walks a circle about the zero.',
    holds: revealed,
  };
}

// sin(x)/x on the real axis. The limit at 0 is 1, so the singularity is removable.
export function sinc(x) {
  if (Math.abs(x) < 1e-4) return 1;
  return Math.sin(x) / x;
}

export function placeReal(x) {
  const v = Number(x);
  return clamp(Number.isFinite(v) ? v : 1.4, -2.2, 2.2);
}

export function removableClaim(x) {
  const px = placeReal(x);
  const value = sinc(px);
  const near = Math.abs(px) <= 0.45;
  return {
    x: px,
    value,
    near,
    holds: near,
    text: near
      ? 'The values stay near 1. The singularity at 0 is removable.'
      : 'Away from 0, $\\sin(z)/z$ is analytic.',
  };
}

export function normAnswer(raw) {
  return String(raw == null ? '' : raw)
    .trim()
    .toLowerCase()
    .replace(/\$/g, '')
    .replace(/\\,/g, '')
    .replace(/ε|\\varepsilon|\\epsilon/g, 'epsilon')
    .replace(/∞|\\infty/g, 'infty')
    .replace(/\s+/g, '');
}

export function answerMatches(given, step) {
  const g = normAnswer(given);
  if (!g || !step) return false;
  const opts = [step.answer].concat(Array.isArray(step.accept) ? step.accept : []);
  return opts.some((a) => normAnswer(a) === g);
}
