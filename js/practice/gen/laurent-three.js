// Three Laurent series of 1/((z-a)(z-b)), |a| < |b|.
// Seed 1 is §7.3 Exercise 10, page 230: (z^2-5z+6)^{-1}, poles at 2 and 3.
// Coefficients are the partial-fraction formulas, not typed answers.
// generate(seed, params): params.mode is "blank" or "mc".

import { formatRational } from './laurent-annulus.js';

export const id = 'laurent-three';

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
  return a + Math.floor(rng() * (Math.max(0, b - a) + 1));
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

function plain(num, den) {
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

export function choosePoles(seed, params) {
  const n = Number(seed) || 1;
  if (n === 1) return { a: 2, b: 3 };
  const rng = lcg(n);
  const aRange = params && Array.isArray(params.a) ? params.a : [1, 4];
  const bRange = params && Array.isArray(params.b) ? params.b : [3, 8];
  let a = 2;
  let b = 3;
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

// 1/((z-a)(z-b)) = A/(z-a) + B/(z-b).
export function split(a, b) {
  return { A: 1 / (a - b), B: 1 / (b - a) };
}

function exactAt(a, b, z) {
  const d1 = { re: z.re - a, im: z.im };
  const d2 = { re: z.re - b, im: z.im };
  const den = {
    re: d1.re * d2.re - d1.im * d2.im,
    im: d1.re * d2.im + d1.im * d2.re,
  };
  const m = den.re * den.re + den.im * den.im;
  return { re: den.re / m, im: -den.im / m };
}

function cpow(z, n) {
  let p = { re: 1, im: 0 };
  const k = Math.abs(n | 0);
  for (let i = 0; i < k; i += 1) {
    p = { re: p.re * z.re - p.im * z.im, im: p.re * z.im + p.im * z.re };
  }
  if (n < 0) {
    const m = p.re * p.re + p.im * p.im;
    return { re: p.re / m, im: -p.im / m };
  }
  return p;
}

// Partial sum through N powers. region is "in", "mid", or "out".
export function regionPartial(a, b, z, N, region) {
  const terms = Math.max(1, N | 0);
  const { A, B } = split(a, b);
  let re = 0;
  let im = 0;
  if (region === 'in') {
    for (let n = 0; n < terms; n += 1) {
      const c = -A / a ** (n + 1) - B / b ** (n + 1);
      const p = cpow(z, n);
      re += c * p.re;
      im += c * p.im;
    }
    return { re, im };
  }
  if (region === 'out') {
    for (let k = 0; k < terms; k += 1) {
      const c = A * a ** k + B * b ** k;
      const p = cpow(z, -(k + 1));
      re += c * p.re;
      im += c * p.im;
    }
    return { re, im };
  }
  for (let k = 0; k < terms; k += 1) {
    const p = cpow(z, -(k + 1));
    re += A * a ** k * p.re;
    im += A * a ** k * p.im;
  }
  for (let n = 0; n < terms; n += 1) {
    const c = -B / b ** (n + 1);
    const p = cpow(z, n);
    re += c * p.re;
    im += c * p.im;
  }
  return { re, im };
}

function lin(root) {
  if (root < 0) return `z+${-root}`;
  if (root === 0) return 'z';
  return `z-${root}`;
}

function forms(num, den) {
  const tex = formatRational(num, den);
  const text = plain(num, den);
  return tex === text ? [tex] : [tex, text];
}

export function generate(seed, params) {
  const { a, b } = choosePoles(seed, params);
  const inner = Math.abs(a);
  const outer = Math.abs(b);
  const mode = params && params.mode === 'mc' ? 'mc' : 'blank';
  const frac = forms(1, a - b);
  const constant = forms(1, a * b);
  const cubic = forms(a + b, 1);
  const named = a === 2 && b === 3;
  const where = `in $|z|<${inner}$, $${inner}<|z|<${outer}$, and $|z|>${outer}$`;
  const prompt = named
    ? `Exercise 10 of §7.3, page 230. The Laurent series of $1/((${lin(a)})(${lin(b)}))$ centered at $0$, ${where}.`
    : `The same three regions, for a new pair of poles. The Laurent series of $1/((${lin(a)})(${lin(b)}))$ centered at $0$, ${where}.`;
  if (mode === 'mc') {
    const right = `negative powers from the pole at $${a}$, and non-negative powers from the pole at $${b}$`;
    const bothIn = 'non-negative powers from both poles';
    const bothOut = 'negative powers from both poles';
    const swapped = `negative powers from the pole at $${b}$, and non-negative powers from the pole at $${a}$`;
    return {
      seed: Number(seed) || 1,
      a,
      b,
      prompt,
      steps: [
        {
          text: `For $${inner}<|z|<${outer}$, the series uses`,
          answer: right,
          choices: [right, bothIn, bothOut, swapped],
          choiceWhy: [
            `The pole at $${a}$ is inside this annulus, so it is expanded in $1/z$. The pole at $${b}$ is outside, so it is expanded in $z$.`,
            `Non-negative powers from both poles is the series for $|z|<${inner}$.`,
            `Negative powers from both poles is the series for $|z|>${outer}$.`,
            `That swap puts the inner pole's series on the outside of the annulus.`,
          ],
          why: `Partial fractions, then one geometric series per pole. Inside the outer pole, powers of $z$. Outside the inner pole, powers of $1/z$.`,
        },
      ],
      memory: 'Name the annulus first. Each pole is expanded in $z$ when you are inside it, and in $1/z$ when you are outside it.',
    };
  }
  return {
    seed: Number(seed) || 1,
    a,
    b,
    prompt,
    steps: [
      {
        text: `Partial fractions. The coefficient of $1/(${lin(a)})$ is ___`,
        answer: frac[0],
        accept: frac,
        why: `Cover $(${lin(a)})$. The value is $1/(${a}-${b < 0 ? `(${b})` : b})$.`,
      },
      {
        text: `In $|z|<${inner}$ the constant term is ___`,
        answer: constant[0],
        accept: constant,
        why: `Both poles are outside this disk, so $f(0)=1/(${a}\\cdot ${b < 0 ? `(${b})` : b})$.`,
      },
      {
        text: `In $|z|>${outer}$ the coefficient of $z^{-3}$ is ___`,
        answer: cubic[0],
        accept: cubic,
        why: `Both poles are inside. The coefficient of $z^{-k-1}$ is $a^k/(a-b)+b^k/(b-a)$. For $k=2$ that is $${a}+${b < 0 ? `(${b})` : b}$.`,
      },
    ],
    memory: 'Partial fractions, then a geometric series aimed at the region: $z$ inside a pole, $1/z$ outside it.',
  };
}

export function sampleAgrees(seed, params, N = 24) {
  const { a, b } = choosePoles(seed, params);
  const spots = [
    [{ re: innerProbe(a, b, 'in'), im: 0.05 }, 'in'],
    [{ re: innerProbe(a, b, 'mid'), im: 0.08 }, 'mid'],
    [{ re: innerProbe(a, b, 'out'), im: 0.2 }, 'out'],
  ];
  let worst = 0;
  for (const [z, region] of spots) {
    const got = regionPartial(a, b, z, N, region);
    const want = exactAt(a, b, z);
    worst = Math.max(worst, Math.hypot(got.re - want.re, got.im - want.im));
  }
  return worst;
}

function innerProbe(a, b, region) {
  const inner = Math.abs(a);
  const outer = Math.abs(b);
  if (region === 'in') return inner * 0.45 || 0.2;
  if (region === 'mid') return (inner + outer) / 2;
  return outer + 1.5;
}
