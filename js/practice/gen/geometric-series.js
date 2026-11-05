// Geometric sum, and the radius of a geometric power series.
// Answers are exact rational numbers computed here, not typed by hand.
// Theorem 4.12, page 118. Theorem 4.16, page 125.

import { mulberry32, pickInt } from '../seed.js';

export const id = 'geometric-series';

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

export function texComplex(re, im) {
  if (im === 0) return String(re);
  const imPart = im === 1 ? 'i' : im === -1 ? '-i' : `${im}i`;
  if (re === 0) return imPart;
  return `${re}${im < 0 ? '' : '+'}${imPart}`;
}

function texFrac(num, den) {
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  const n = num / g;
  const d = den / g;
  if (d === 1) return String(n);
  if (n < 0) return `-\\frac{${-n}}{${d}}`;
  return `\\frac{${n}}{${d}}`;
}

function texRatio(re, im, den) {
  const body = texComplex(re, im);
  if (den === 1) return body;
  return `\\frac{${body}}{${den}}`;
}

// 1 / (1 - (a+bi)/den) = den / ((den-a) - bi), then rationalize.
export function geometricSum(a, b, den) {
  const reNum = den * (den - a);
  const imNum = den * b;
  const den2 = (den - a) * (den - a) + b * b;
  const g = gcd(gcd(Math.abs(reNum), Math.abs(imNum)), den2);
  const re = reNum / g;
  const im = imNum / g;
  const d = den2 / g;
  if (d === 1) return texComplex(re, im);
  const body = texComplex(re, im);
  if (re < 0 && im === 0) return `-\\frac{${-re}}{${d}}`;
  return `\\frac{${body}}{${d}}`;
}

const RADIUS_PAIRS = [
  [3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5],
  [8, 15], [7, 24], [20, 21], [9, 12], [0, 2], [0, 3],
  [2, 0], [3, 0], [5, 0], [4, 0], [0, 5], [1, 0],
];

function sumItem(rand, seed) {
  const inside = seed % 2 === 1;
  let a = 1;
  let b = 1;
  let den = 3;
  for (let n = 0; n < 40; n++) {
    a = pickInt(rand, -4, 4);
    b = pickInt(rand, -4, 4);
    den = pickInt(rand, 2, 6);
    if (a === 0 && b === 0) continue;
    const mag2 = a * a + b * b;
    const d2 = den * den;
    if (inside && mag2 < d2) break;
    if (!inside && mag2 >= d2) break;
  }
  const mag2 = a * a + b * b;
  const ok = inside ? mag2 < den * den && mag2 > 0 : mag2 >= den * den;
  if (!ok) {
    if (inside) { a = 1; b = 1; den = 3; }
    else { a = 3; b = 4; den = 2; }
  }
  const ratio = texRatio(a, b, den);
  const converges = a * a + b * b < den * den;
  const sum = converges ? geometricSum(a, b, den) : 'diverges';
  const whySum = converges
    ? `The modulus is less than 1, so Theorem 4.12, page 118, gives $1/(1-z)$.`
    : `The modulus is at least 1, so Theorem 4.12, page 118, says the series diverges.`;
  return {
    prompt: `Evaluate $\\sum_{n=0}^{\\infty} z^n$ for $z=${ratio}$.`,
    steps: [
      {
        text: 'Does the series converge? ___',
        answer: converges ? 'yes' : 'no',
        accept: converges ? ['converges', 'it converges'] : ['diverges', 'no it diverges'],
        why: converges
          ? `$|z|<1$, which is the hypothesis of Theorem 4.12, page 118.`
          : `$|z|\\ge 1$, so Theorem 4.12, page 118, says the series diverges.`,
        hints: [
          'Compare $|z|$ with 1.',
          converges ? 'The square of the modulus is smaller than 1.' : 'The square of the modulus is at least 1.',
        ],
      },
      {
        text: 'The sum is ___.',
        answer: sum,
        accept: converges ? [sum.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/, '($1)/($2)')] : ['divergent', 'the series diverges'],
        why: whySum,
        hints: converges
          ? ['The closed form is $1/(1-z)$.', 'Clear the denominator of $z$ before you simplify.']
          : ['There is no finite sum on or outside the unit circle.', 'The word the theorem uses is diverges.'],
      },
    ],
    witness: { kind: 'sum', a, b, den, converges },
  };
}

function radiusItem(rand) {
  const pair = RADIUS_PAIRS[pickInt(rand, 0, RADIUS_PAIRS.length - 1)];
  const p = pair[0] * (rand() < 0.5 ? -1 : 1);
  const q = pair[1] * (rand() < 0.5 ? -1 : 1);
  const rho = Math.hypot(pair[0], pair[1]);
  const cx = pickInt(rand, -2, 2);
  const cy = pickInt(rand, -2, 2);
  const centre = texComplex(cx, cy);
  const coeff = texComplex(p, q);
  return {
    prompt: `Find the radius of convergence of $\\sum_{n=0}^{\\infty} \\dfrac{(z-(${centre}))^n}{(${coeff})^n}$.`,
    steps: [
      {
        text: 'The radius is ___.',
        answer: String(rho),
        accept: [`\\sqrt{${pair[0] * pair[0] + pair[1] * pair[1]}}`],
        why: `Theorem 4.16, page 125: dividing by $(${coeff})^n$ makes the radius $|${coeff}|$. The centre does not change it. $|${coeff}| = ${rho}$.`,
        hints: [
          'The centre $\\alpha$ does not appear in the radius.',
          'For $\\sum (z-\\alpha)^n/c^n$ the radius is $|c|$.',
        ],
      },
    ],
    witness: { kind: 'radius', p, q, rho, cx, cy },
  };
}

export function generate(seed, params = {}) {
  const rand = mulberry32(seed);
  const kind = params.kind === 'radius' ? 'radius' : 'sum';
  return kind === 'radius' ? radiusItem(rand) : sumItem(rand, Number(seed) || 1);
}
