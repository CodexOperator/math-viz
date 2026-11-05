// Laurent series of 1/((z-a)(z-b)) in the annulus |a| < |z| < |b|.
// Coefficients are computed from partial fractions and the geometric series.
// seed is an integer. The same seed and params always return the same problem.
// data/practice/ch7.json stores seed 1 with the default params.
// generate(seed, params): the seed is the first argument.

export const id = 'laurent-annulus';

function lcg(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return function next() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickInt(rng, lo, hi) {
  const a = Math.round(Number(lo));
  const b = Math.round(Number(hi));
  const span = Math.max(0, b - a);
  return a + Math.floor(rng() * (span + 1));
}

function gcd(m, n) {
  let a = Math.abs(m | 0);
  let b = Math.abs(n | 0);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

export function formatRational(num, den) {
  let n = Math.round(num);
  let d = Math.round(den);
  if (d === 0) return '0';
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  if (d === 1) return String(n);
  if (n < 0) return `-\\frac{${-n}}{${d}}`;
  return `\\frac{${n}}{${d}}`;
}

function cmul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function cinv(z) {
  const m = z.re * z.re + z.im * z.im;
  return { re: z.re / m, im: -z.im / m };
}

export function exactValue(a, b, z) {
  const d1 = { re: z.re - a, im: z.im };
  const d2 = { re: z.re - b, im: z.im };
  return cinv(cmul(d1, d2));
}

// Annulus |a| < |z| < |b|: 1/(z-a) = sum a^k z^{-k-1}, 1/(z-b) = -sum z^n / b^{n+1}.
export function annulusPartial(a, b, z, N) {
  const terms = Math.max(1, N | 0);
  const A = 1 / (a - b);
  const B = 1 / (b - a);
  let re = 0;
  let im = 0;
  const inv = cinv(z);
  let invPow = { re: inv.re, im: inv.im };
  let aPow = 1;
  for (let k = 0; k < terms; k += 1) {
    re += A * aPow * invPow.re;
    im += A * aPow * invPow.im;
    aPow *= a;
    invPow = cmul(invPow, inv);
  }
  let zpow = { re: 1, im: 0 };
  let bpow = b;
  for (let n = 0; n < terms; n += 1) {
    const c = -B / bpow;
    re += c * zpow.re;
    im += c * zpow.im;
    zpow = cmul(zpow, z);
    bpow *= b;
  }
  return { re, im };
}

function lin(root) {
  if (root < 0) return `z+${-root}`;
  if (root === 0) return 'z';
  return `z-${root}`;
}

function plainRational(num, den) {
  let n = Math.round(num);
  let d = Math.round(den);
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

function choosePoles(seed, params) {
  const rng = lcg(seed);
  const aRange = params && Array.isArray(params.a) ? params.a : [-4, -1];
  const bRange = params && Array.isArray(params.b) ? params.b : [2, 6];
  let a = -1;
  let b = 2;
  for (let i = 0; i < 40; i += 1) {
    const nextA = pickInt(rng, aRange[0], aRange[1]);
    const nextB = pickInt(rng, bRange[0], bRange[1]);
    if (nextA !== 0 && nextB !== 0 && Math.abs(nextA) < Math.abs(nextB) && nextA !== nextB) {
      a = nextA;
      b = nextB;
      break;
    }
  }
  return { a, b };
}

export function generate(seed, params) {
  const { a, b } = choosePoles(seed, params);
  const inner = Math.abs(a);
  const outer = Math.abs(b);
  const coeffInner = formatRational(1, a - b);
  const constant = formatRational(-1, (b - a) * b);
  const acceptInner = [coeffInner, plainRational(1, a - b)];
  const acceptConstant = [constant, plainRational(-1, (b - a) * b)];
  return {
    seed: Number(seed) || 1,
    a,
    b,
    inner,
    outer,
    coeffInner,
    constant,
    prompt: `Find the Laurent series of $f(z)=1/((${lin(a)})(${lin(b)}))$ in the annulus $${inner}<|z|<${outer}$.`,
    steps: [
      {
        text: `Partial fractions, then the geometric series. The coefficient of $1/(${lin(a)})$ is ___`,
        answer: coeffInner,
        accept: acceptInner,
        why: `Cover the factor $(${lin(a)})$. The value is $1/(${a}-${b < 0 ? `(${b})` : b})$.`,
      },
      {
        text: 'In this annulus the constant term is ___',
        answer: constant,
        accept: acceptConstant,
        why: `The outer pole contributes $-1/((${b}-${a < 0 ? `(${a})` : a})\\cdot ${b})$. The inner pole contributes only negative powers.`,
      },
    ],
    memory: 'Partial fractions, then a geometric series in $z$ inside the outer pole and in $1/z$ outside the inner pole.',
  };
}

export function sampleAgrees(seed, params, N = 24) {
  const spec = generate(seed, params);
  const mid = (spec.inner + spec.outer) / 2;
  const z = { re: mid, im: 0.15 };
  const got = annulusPartial(spec.a, spec.b, z, N);
  const want = exactValue(spec.a, spec.b, z);
  return Math.hypot(got.re - want.re, got.im - want.im);
}
