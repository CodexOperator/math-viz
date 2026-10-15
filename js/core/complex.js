// js/core/complex.js - complex arithmetic, the two addresses of a point (Cartesian x + iy and
// polar r e^{i theta}), the number Arg z, the set arg z, powers, roots, branches, numeric
// calculus (the A/B local linear form) and exact-form formatting.
//
// Pure module: no imports, no DOM, no timers, no randomness, no locale, no state.
// A complex number is a plain object { re, im }. Wherever a complex argument is expected a bare
// real number n is read as { re: n, im: 0 } (so rootsOf(-16, 4) and Arg(-1) work as written).
// Nothing is mutated; every result is a fresh object. Angles are radians; Arg is in (-pi, pi].
// Mathematically undefined input (division by zero, inv(0), pow(0, -1)) returns NaN parts and
// never throws; only invalid programmer arguments (n, h, rho, m, argSet span) throw RangeError.
// Both source files are pure ASCII: non-ASCII characters are written as \uXXXX escapes.
//
// Design: docs/designs/iter-1/i1-core-math.md

// ----- private constants --------------------------------------------------------------------

const PI = Math.PI;
const TWO_PI = 2 * Math.PI;
const SEAM_SNAP = 1e-12;     // wrapArg: a reduced angle within this of -pi becomes +pi
const ANGLE_EPS = 1e-9;      // exactAngle: absolute tolerance for theta = p pi / q
const EXACT_REL = 1e-10;     // texNumber: relative tolerance for fraction, surd and pi detection
const EXACT_MAX = 1e6;       // texNumber: exact forms are only tried up to this size
const FRAC_QMAX = 24;
const SURD_QMAX = 4;
const PI_DENOMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18];   // exactAngle, texNumber: p pi / q for these q (18 gives the 10-degree steps)
const PI_PMAX = 120;
const ARGSET_MAX_SPAN = 10000;
const DIGITS_MAX = 12;

// ----- private helpers ----------------------------------------------------------------------

/** Read a bare real number as { re, im: 0 }; objects pass through untouched. */
function cx(v) {
  return typeof v === 'number' ? { re: v, im: 0 } : v;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

function needN(n, who) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(who + ': n must be a positive integer');
}

function needStep(h, who) {
  if (!(h > 0) || !Number.isFinite(h)) throw new RangeError(who + ': step must be a positive finite number');
}

// ----- constants and constructor ------------------------------------------------------------

/** Build a complex number { re, im } (im defaults to 0). */
export const C = (re, im = 0) => ({ re, im });
/** The number 0, frozen. */
export const ZERO = Object.freeze({ re: 0, im: 0 });
/** The number 1, frozen. */
export const ONE = Object.freeze({ re: 1, im: 0 });
/** The number i, frozen. */
export const I = Object.freeze({ re: 0, im: 1 });

// ----- the two addresses, Arg, wrapArg, argSet ----------------------------------------------

/** Polar address to Cartesian: { re: r cos theta, im: r sin theta }. */
export function fromPolar(r, theta) {
  return { re: r * Math.cos(theta), im: r * Math.sin(theta) };
}

/** Cartesian address to polar: { r: |z|, theta: Arg z }. */
export function toPolar(z) {
  z = cx(z);
  return { r: Math.hypot(z.re, z.im), theta: Arg(z) };
}

/** The principal argument Arg z in (-pi, pi]; Arg(negative real) = pi, Arg(0) = 0, never -pi or -0. */
export function Arg(a) {
  a = cx(a);
  if (a.im === 0) return a.re < 0 ? PI : (a.re !== a.re ? NaN : 0);
  const t = Math.atan2(a.im, a.re);
  return t <= -PI ? PI : t + 0;     // + 0: atan2 can underflow to -0 for a tiny im next to a huge re
}

/** Put any angle back on the home step (-pi, pi]; NaN when theta is not finite. */
export function wrapArg(theta) {
  if (!Number.isFinite(theta)) return NaN;
  if (theta > -PI && theta <= PI) return theta + 0;
  let t = theta - TWO_PI * Math.ceil((theta - PI) / TWO_PI);
  if (t > PI) t -= TWO_PI;
  else if (t <= -PI) t += TWO_PI;
  if (Math.abs(t + PI) < SEAM_SNAP) t = PI;
  return t;
}

/** The staircase arg z as [{ k, theta }] with theta = Arg z + 2 pi k, ascending k; k = 0 is Arg z. */
export function argSet(z, { kMin = -2, kMax = 2 } = {}) {
  z = cx(z);
  const lo = Math.ceil(kMin) + 0;
  const hi = Math.floor(kMax) + 0;
  if (hi < lo) return [];
  if (hi - lo > ARGSET_MAX_SPAN) throw new RangeError('argSet: too many steps');
  const base = Arg(z);
  const out = [];
  for (let k = lo; k <= hi; k++) out.push({ k, theta: base + TWO_PI * k });
  return out;
}

/** The unit point at angle theta: { re: cos theta, im: sin theta }. */
export function expi(theta) {
  return fromPolar(1, theta);
}

// ----- arithmetic ---------------------------------------------------------------------------

/** a + b. */
export function add(a, b) {
  a = cx(a); b = cx(b);
  return { re: a.re + b.re, im: a.im + b.im };
}

/** a - b. */
export function sub(a, b) {
  a = cx(a); b = cx(b);
  return { re: a.re - b.re, im: a.im - b.im };
}

/** a * b = (x1 x2 - y1 y2) + i (x1 y2 + x2 y1). */
export function mul(a, b) {
  a = cx(a); b = cx(b);
  return { re: a.re * b.re - a.im * b.im + 0, im: a.re * b.im + a.im * b.re + 0 };   // + 0 turns -0 into 0
}

/** a / b by conjugate over modulus squared; division by 0 gives { NaN, NaN }. */
export function div(a, b) {
  a = cx(a); b = cx(b);
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return { re: NaN, im: NaN };
  return { re: (a.re * b.re + a.im * b.im) / d + 0, im: (a.im * b.re - a.re * b.im) / d + 0 };   // + 0 turns -0 into 0
}

/** -a (never returns negative zero parts for a zero input). */
export function neg(a) {
  a = cx(a);
  return { re: 0 - a.re, im: 0 - a.im };
}

/** The conjugate x - iy. */
export function conj(a) {
  a = cx(a);
  return { re: a.re + 0, im: 0 - a.im };
}

/** 1 / a = conj a / |a|^2; inv(0) gives { NaN, NaN }. */
export function inv(a) {
  a = cx(a);
  const d = a.re * a.re + a.im * a.im;
  if (d === 0) return { re: NaN, im: NaN };
  return { re: a.re / d + 0, im: (0 - a.im) / d + 0 };   // + 0: a tiny im over a huge d underflows to -0
}

/** a * k for a real number k. */
export function scale(a, k) {
  a = cx(a);
  return { re: a.re * k, im: a.im * k };
}

/** The modulus |a| = sqrt(x^2 + y^2) (a number). */
export function abs(a) {
  a = cx(a);
  return Math.hypot(a.re, a.im);
}

/** The squared modulus x^2 + y^2 (a number). */
export function abs2(a) {
  a = cx(a);
  return a.re * a.re + a.im * a.im;
}

// ----- elementary functions (principal values) ----------------------------------------------

/** e^a = e^x (cos y + i sin y). */
export function exp(a) {
  a = cx(a);
  const m = Math.exp(a.re);
  return { re: m * Math.cos(a.im), im: m * Math.sin(a.im) };
}

/** Principal logarithm ln|a| + i Arg a; log(0) = { -Infinity, 0 }. */
export function log(a) {
  a = cx(a);
  return { re: Math.log(Math.hypot(a.re, a.im)), im: Arg(a) };
}

/** Principal square root, computed without trigonometry; exact on the axes. */
export function sqrt(a) {
  a = cx(a);
  const r = Math.hypot(a.re, a.im);
  if (r === 0) return { re: 0, im: 0 };
  const t = Math.sqrt((r + Math.abs(a.re)) / 2);
  if (a.re >= 0) return { re: t, im: a.im / (2 * t) + 0 };
  return { re: Math.abs(a.im) / (2 * t), im: a.im < 0 ? -t : t };
}

/** sin(x + iy) = sin x cosh y + i cos x sinh y. */
export function sin(a) {
  a = cx(a);
  return { re: Math.sin(a.re) * Math.cosh(a.im), im: Math.cos(a.re) * Math.sinh(a.im) };
}

/** cos(x + iy) = cos x cosh y - i sin x sinh y. */
export function cos(a) {
  a = cx(a);
  return { re: Math.cos(a.re) * Math.cosh(a.im), im: -(Math.sin(a.re) * Math.sinh(a.im)) };
}

// ----- powers and roots ---------------------------------------------------------------------

/** a^n for integer n (any sign) by squaring, the same value as de Moivre; non-integer n goes to powc. */
export function pow(a, n) {
  a = cx(a);
  if (!Number.isInteger(n)) return powc(a, { re: n, im: 0 });
  if (n === 0) return { re: 1, im: 0 };
  if (n < 0) return inv(pow(a, -n));
  let result = { re: 1, im: 0 };
  let base = { re: a.re, im: a.im };
  let e = n;
  while (e > 0) {
    if (e % 2 === 1) result = mul(result, base);
    e = Math.floor(e / 2);
    if (e > 0) base = mul(base, base);
  }
  return result;
}

/** Principal complex power exp(w log a); powc(0, w) is 0 for Re w > 0, 1 for w = 0, else NaN. */
export function powc(a, w) {
  a = cx(a); w = cx(w);
  if (a.re === 0 && a.im === 0) {
    if (w.re === 0 && w.im === 0) return { re: 1, im: 0 };
    if (w.re > 0) return { re: 0, im: 0 };
    return { re: NaN, im: NaN };
  }
  return exp(mul(w, log(a)));
}

/** All n roots of c: |c|^(1/n) e^{i (Arg c + 2 pi k)/n}, k = 0..n-1, in k order; rootsOf(0, n) is n zeros. */
export function rootsOf(c, n) {
  needN(n, 'rootsOf');
  c = cx(c);
  const r = Math.hypot(c.re, c.im);
  const out = [];
  if (r === 0) {
    for (let k = 0; k < n; k++) out.push({ re: 0, im: 0 });
    return out;
  }
  const rho = Math.pow(r, 1 / n);
  const theta = Arg(c);
  for (let k = 0; k < n; k++) out.push(fromPolar(rho, (theta + TWO_PI * k) / n));
  return out;
}

/** The n-th roots of unity e^{2 pi i k / n}, k = 0..n-1. */
export function rootsOfUnity(n) {
  return rootsOf(ONE, n);
}

/** The principal n-th root |c|^(1/n) e^{i Arg(c)/n} (the first of rootsOf). */
export function principalRoot(c, n) {
  needN(n, 'principalRoot');
  c = cx(c);
  const r = Math.hypot(c.re, c.im);
  if (r === 0) return { re: 0, im: 0 };
  return fromPolar(Math.pow(r, 1 / n), Arg(c) / n);
}

/** The unique angle t = Arg z + 2 pi k with seam < t <= seam + 2 pi; seam -pi is the principal branch. */
export function branchArg(z, seam = -PI) {
  z = cx(z);
  const base = Arg(z);
  let t = base + TWO_PI * (Math.floor((seam - base) / TWO_PI) + 1);
  if (t <= seam) t += TWO_PI;
  else if (t > seam + TWO_PI) t -= TWO_PI;
  return t;
}

/** The branch of the n-th root that uses the step in (seam, seam + 2 pi]: |c|^(1/n) e^{i branchArg/n}. */
export function branchRoot(c, n, seam = -PI) {
  c = cx(c);
  const r = Math.hypot(c.re, c.im);
  if (r === 0) return { re: 0, im: 0 };
  return fromPolar(Math.pow(r, 1 / n), branchArg(c, seam) / n);
}

/** True when the k-th n-th root of unity is primitive, that is gcd(k mod n, n) = 1. */
export function isPrimitiveRoot(k, n) {
  if (!Number.isInteger(k) || !Number.isInteger(n) || n < 1) return false;
  return gcd(((k % n) + n) % n, n) === 1;
}

/** Both roots of a z^2 + b z + c = 0 as [(-b + s)/2a, (-b - s)/2a], s = sqrt(b^2 - 4ac). */
export function quadraticRoots(a, b, c) {
  a = cx(a); b = cx(b); c = cx(c);
  if (a.re === 0 && a.im === 0) return [{ re: NaN, im: NaN }, { re: NaN, im: NaN }];
  const disc = sub(mul(b, b), scale(mul(a, c), 4));
  const s = sqrt(disc);
  const den = scale(a, 2);
  const nb = neg(b);
  return [div(add(nb, s), den), div(sub(nb, s), den)];
}

/** True when |a - b| <= eps (false if any part is NaN). */
export function eq(a, b, eps = 1e-9) {
  a = cx(a); b = cx(b);
  return Math.hypot(a.re - b.re, a.im - b.im) <= eps;
}

/** True when both parts are finite numbers. */
export function isFiniteC(a) {
  a = cx(a);
  return Number.isFinite(a.re) && Number.isFinite(a.im);
}

// ----- numeric calculus (central differences) -----------------------------------------------

/** The partial derivatives { fx, fy } of f at z0 (fy = df/dy, so fy = i f' for analytic f). */
export function numericPartials(f, z0, h = 1e-5) {
  needStep(h, 'numericPartials');
  z0 = cx(z0);
  const k = 1 / (2 * h);
  const xp = cx(f({ re: z0.re + h, im: z0.im }));
  const xm = cx(f({ re: z0.re - h, im: z0.im }));
  const yp = cx(f({ re: z0.re, im: z0.im + h }));
  const ym = cx(f({ re: z0.re, im: z0.im - h }));
  return {
    fx: { re: (xp.re - xm.re) * k, im: (xp.im - xm.im) * k },
    fy: { re: (yp.re - ym.re) * k, im: (yp.im - ym.im) * k },
  };
}

/** The real Jacobian { ux, uy, vx, vy } of f = u + iv at z0. */
export function jacobian(f, z0, h = 1e-5) {
  const { fx, fy } = numericPartials(f, z0, h);
  return { ux: fx.re, uy: fy.re, vx: fx.im, vy: fy.im };
}

/** The local linear form f(z0 + dz) ~ f(z0) + A dz + B conj(dz): { A, B } = ((fx - i fy)/2, (fx + i fy)/2). */
export function localLinear(f, z0, h = 1e-5) {
  const { fx, fy } = numericPartials(f, z0, h);
  return {
    A: { re: (fx.re + fy.im) / 2, im: (fx.im - fy.re) / 2 },
    B: { re: (fx.re - fy.im) / 2, im: (fx.im + fy.re) / 2 },
  };
}

/** The difference quotients (f(z0 + rho e^{i phi}) - f(z0)) / (rho e^{i phi}) for phi = 2 pi j / m: a circle A + B e^{-2 i phi}. */
export function directionalQuotients(f, z0, rho = 1e-3, m = 72) {
  needStep(rho, 'directionalQuotients');
  if (!Number.isInteger(m) || m < 1) throw new RangeError('directionalQuotients: m must be a positive integer');
  z0 = cx(z0);
  const f0 = cx(f({ re: z0.re, im: z0.im }));
  const out = [];
  for (let j = 0; j < m; j++) {
    const phi = TWO_PI * j / m;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const fz = cx(f({ re: z0.re + rho * c, im: z0.im + rho * s }));
    const dre = fz.re - f0.re;
    const dim = fz.im - f0.im;
    out.push({ phi, q: { re: (dre * c + dim * s) / rho, im: (dim * c - dre * s) / rho } });
  }
  return out;
}

// ----- plain-text formatting (ASCII) --------------------------------------------------------

function stripZeros(s) {
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

/** A number with at most `digits` decimals, trailing zeros trimmed, ASCII minus; NaN is "undefined", infinity "inf". */
export function fmtNum(x, digits = 3) {
  if (x !== x) return 'undefined';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  const d = Math.min(DIGITS_MAX, Math.max(0, Math.round(digits)));
  if (Math.abs(x) >= 1e15) {
    const parts = x.toExponential(d).split('e');
    return stripZeros(parts[0]) + 'e' + parts[1];
  }
  return stripZeros(x.toFixed(d));
}

function nonFinite(z) {
  if (z.re !== z.re || z.im !== z.im) return 'undefined';
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return 'inf';
  return null;
}

/** Cartesian text such as "3 - 2i", "i", "-i", "2 + 0.5i", "0". */
export function fmtCart(z, digits = 3) {
  z = cx(z);
  const bad = nonFinite(z);
  if (bad) return bad;
  const R = fmtNum(z.re, digits);
  const M = fmtNum(z.im, digits);
  if (M === '0') return R;
  const neg = M[0] === '-';
  const absM = neg ? M.slice(1) : M;
  const coef = absM === '1' ? '' : absM;
  if (R === '0') return (neg ? '-' : '') + coef + 'i';
  return R + (neg ? ' - ' : ' + ') + coef + 'i';
}

/** Polar text such as "2 e^(i 2.094)", "3.606 e^(-i 0.588)", "e^(i 1.571)", "2", "0". */
export function fmtPolar(z, digits = 3) {
  z = cx(z);
  const bad = nonFinite(z);
  if (bad) return bad;
  const p = toPolar(z);
  const R = fmtNum(p.r, digits);
  if (R === '0') return '0';
  const T = fmtNum(p.theta, digits);
  if (T === '0') return R;
  const neg = T[0] === '-';
  const e = 'e^(' + (neg ? '-' : '') + 'i ' + (neg ? T.slice(1) : T) + ')';
  return R === '1' ? e : R + ' ' + e;
}

/** theta = p pi / q in lowest terms (q in 1..12 or 18, |p| <= 120, within 1e-9) as { p, q }, else null. */
export function exactAngle(theta) {
  if (!Number.isFinite(theta)) return null;
  for (const q of PI_DENOMS) {
    const p = Math.round(theta * q / PI) + 0;
    if (Math.abs(p) <= PI_PMAX && Math.abs(theta - p * PI / q) < ANGLE_EPS) return { p, q };
  }
  return null;
}

/** An angle as "2pi/3", "-pi/3", "pi" when it has an exact form, else a decimal; unicode: true writes the pi sign. */
export function fmtAngle(theta, { digits = 3, pi = true, unicode = false } = {}) {
  if (theta !== theta) return 'undefined';
  if (pi) {
    const f = exactAngle(theta);
    if (f) {
      if (f.p === 0) return '0';
      const PIs = unicode ? '\u03c0' : 'pi';
      const a = Math.abs(f.p);
      const num = a === 1 ? PIs : a + PIs;
      const sign = f.p < 0 ? '-' : '';
      return f.q === 1 ? sign + num : sign + num + '/' + f.q;
    }
  }
  return fmtNum(theta, digits);
}

// ----- TeX formatting -----------------------------------------------------------------------

function tol(x) {
  return EXACT_REL * Math.max(1, Math.abs(x));
}

function asFraction(x) {
  for (let q = 1; q <= FRAC_QMAX; q++) {
    const p = Math.round(x * q) + 0;
    if (Math.abs(x - p / q) <= tol(x)) return { p, q };
  }
  return null;
}

function asSurd(x) {
  const radicands = [2, 3];
  for (let i = 0; i < radicands.length; i++) {
    const s = radicands[i];
    const root = Math.sqrt(s);
    for (let q = 1; q <= SURD_QMAX; q++) {
      const p = Math.round(x * q / root) + 0;
      if (p !== 0 && Math.abs(x - p * root / q) <= tol(x)) return { p, q, s };
    }
  }
  return null;
}

function asPiMultiple(x) {
  for (const q of PI_DENOMS) {
    const p = Math.round(x * q / PI) + 0;
    if (p !== 0 && Math.abs(p) <= PI_PMAX && Math.abs(x - p * PI / q) <= tol(x)) return { p, q };
  }
  return null;
}

function texFrac(sign, num, q) {
  return q === 1 ? sign + num : sign + '\\frac{' + num + '}{' + q + '}';
}

function texPiForm(p, q) {
  const a = Math.abs(p);
  return texFrac(p < 0 ? '-' : '', (a === 1 ? '' : a) + '\\pi', q);
}

/** A number as TeX, trying integer or fraction, then p sqrt2 / q and p sqrt3 / q, then p pi / q, then a decimal. */
export function texNumber(x, digits = 3) {
  if (x !== x) return '\\text{undefined}';
  if (x === Infinity) return '\\infty';
  if (x === -Infinity) return '-\\infty';
  if (Math.abs(x) <= EXACT_MAX) {
    const f = asFraction(x);
    if (f) {
      if (f.p === 0) return '0';
      return texFrac(f.p < 0 ? '-' : '', Math.abs(f.p), f.q);
    }
    const s = asSurd(x);
    if (s) {
      const a = Math.abs(s.p);
      return texFrac(s.p < 0 ? '-' : '', (a === 1 ? '' : a) + '\\sqrt{' + s.s + '}', s.q);
    }
    const m = asPiMultiple(x);
    if (m) return texPiForm(m.p, m.q);
  }
  return fmtNum(x, digits);
}

/** An angle as TeX: "\frac{2\pi}{3}", "-\frac{\pi}{3}", or a decimal when it has no exact form. */
export function texAngle(theta, digits = 3) {
  if (theta !== theta) return '\\text{undefined}';
  if (!Number.isFinite(theta)) return texNumber(theta, digits);
  const f = exactAngle(theta);
  if (f) return f.p === 0 ? '0' : texPiForm(f.p, f.q);
  return fmtNum(theta, digits);
}

const SURD_OR_PI_END = /(\\sqrt\{\d\}|\\pi)$/;

/** Cartesian TeX such as "3 - 2i", "\sqrt{2} + \sqrt{2}\,i", "-\frac{11}{17} - \frac{10}{17}i". */
export function texCart(z, digits = 3) {
  z = cx(z);
  if (z.re !== z.re || z.im !== z.im) return '\\text{undefined}';
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return '\\infty';
  const R = texNumber(z.re, digits);
  const M = texNumber(z.im, digits);
  if (M === '0') return R;
  const neg = M[0] === '-';
  const absM = neg ? M.slice(1) : M;
  const coef = absM === '1' ? '' : absM;
  const im = coef + (SURD_OR_PI_END.test(coef) ? '\\,i' : 'i');
  if (R === '0') return (neg ? '-' : '') + im;
  return R + (neg ? ' - ' : ' + ') + im;
}

/** Polar TeX such as "2\,e^{i\frac{2\pi}{3}}", "e^{-i\frac{\pi}{3}}", "3.606\,e^{-i\,0.588}". */
export function texPolar(z, digits = 3) {
  z = cx(z);
  if (z.re !== z.re || z.im !== z.im) return '\\text{undefined}';
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return '\\infty';
  const p = toPolar(z);
  const R = texNumber(p.r, digits);
  if (R === '0') return '0';
  const T = texAngle(p.theta, digits);
  if (T === '0') return R;
  const neg = T[0] === '-';
  const absT = neg ? T.slice(1) : T;
  const sp = /^\d/.test(absT) ? '\\,' : '';
  const e = 'e^{' + (neg ? '-' : '') + 'i' + sp + absT + '}';
  return R === '1' ? e : R + '\\,' + e;
}
