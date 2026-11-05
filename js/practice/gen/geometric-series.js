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
        misses: [
          {
            match: 'z<1',
            accept: ['z < 1', 'w<1', 'w < 1', 'z<1'],
            why: 'That compares the complex number to 1. The test is $|z|<1$, the modulus. Theorem 4.12, page 118.',
          },
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
        misses: converges ? [
          {
            match: '0',
            why: 'A denominator written as $0$ treats the conjugate product as $0$. A conjugate product is $|z|^2$, which is positive.',
          },
        ] : [],
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
        why: `Theorem 4.16, page 125: dividing by $(${coeff})^n$ makes the radius $|${coeff}|$.`,
        hints: [
          'The centre $\\alpha$ does not appear in the radius.',
          'For $\\sum (z-\\alpha)^n/c^n$ the radius is $|c|$.',
        ],
        misses: radiusMisses(cx, cy, centre, coeff, rho),
      },
    ],
    witness: { kind: 'radius', p, q, rho, cx, cy },
  };
}

const CENTRE_ZERO = 'The centre is not the radius. Write $R=0$ only when the series converges only at the centre.';
const GOES = 'Write $R=\\infty$. The radius does not go to $\\infty$.';
const COEFF = 'That is the coefficient alone. The radius is the modulus of the coefficient.';
const CENTRE = 'The centre is not the radius.';

function radiusMisses(cx, cy, centre, coeff, rho) {
  const misses = [
    {
      match: '0',
      accept: ['R=0', 'R = 0'],
      why: CENTRE_ZERO,
    },
    {
      match: 'goes to infinity',
      accept: ['R goes to \\infty', 'R goes to infinity', 'goes to \\infty', '\\infty'],
      why: GOES,
    },
  ];
  if (coeff !== String(rho)) {
    misses.push({
      match: coeff,
      accept: [coeff.replace(/[{}]/g, '')],
      why: COEFF,
    });
  }
  const centreAccept = [centre];
  if (String(cx) !== '0') centreAccept.push(String(cx));
  if (String(cy) !== '0' && String(cy) !== String(cx)) centreAccept.push(String(cy));
  misses.push({ match: centre, accept: centreAccept, why: CENTRE });
  return misses;
}

function zMinus(a, b) {
  if (a === 0 && b === 0) return 'z';
  if (a === 0 && b === 1) return 'z-i';
  if (a === 0 && b === -1) return 'z+i';
  if (a === 0 && b > 1) return `z-${b}i`;
  if (a === 0 && b < -1) return `z+${-b}i`;
  if (b === 0 && a > 0) return `z-${a}`;
  if (b === 0 && a < 0) return `z+${-a}`;
  return `z-(${texComplex(a, b)})`;
}

function shiftedItem(rand) {
  let a = 0;
  let b = -1;
  let radius = 2;
  let p = 1;
  let q = 1;
  let den = 3;
  for (let n = 0; n < 20; n++) {
    a = pickInt(rand, -2, 2);
    b = pickInt(rand, -2, 2);
    radius = pickInt(rand, 2, 4);
    p = pickInt(rand, -2, 2);
    q = pickInt(rand, -2, 2);
    den = pickInt(rand, 2, 5);
    if (p === 0 && q === 0) continue;
    if (p * p + q * q < den * den) break;
  }
  if (p * p + q * q >= den * den) {
    p = 1;
    q = 1;
    den = 3;
  }
  const inside = zMinus(a, b);
  const disk = `|${inside}|<${radius}`;
  const ratio = texRatio(p, q, den);
  const sum = geometricSum(p, q, den);
  return {
    prompt: `Where does $\\sum_{n=0}^{\\infty}\\left(\\dfrac{${inside}}{${radius}}\\right)^n$ converge, and what is the sum when that ratio equals $${ratio}$?`,
    steps: [
      {
        text: 'The series converges when ___.',
        answer: `$${disk}$`,
        accept: [disk, disk.replace(/\|/g, '|')],
        why: `Set $w=(${inside})/${radius}$. Theorem 4.12, page 118, needs $|w|<1$, which is $${disk}$.`,
        hints: [
          'Convergence needs $|w|<1$.',
          `Multiply that inequality by ${radius}.`,
        ],
        misses: [
          {
            match: `(${inside})/${radius}<1`,
            accept: [`${inside}/${radius}<1`, 'w<1', 'w < 1'],
            why: 'That compares the complex ratio to $1$. The test is $|w|<1$, the modulus. Theorem 4.12, page 118.',
          },
          {
            match: `|${inside}|<1`,
            why: `That forgot the rescale. $|w|<1$ with $w=(${inside})/${radius}$ is $${disk}$.`,
          },
          {
            match: `|(${inside})/${radius}|<${radius}`,
            accept: [`|${inside}/${radius}|<${radius}`],
            why: `${radius} bounds $|${inside}|$, not $|w|$. The threshold on $|w|$ is $1$.`,
          },
        ],
      },
      {
        text: 'The sum is ___.',
        answer: sum,
        accept: [sum.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/, '($1)/($2)')],
        why: `The modulus of the ratio is less than $1$, so Theorem 4.12, page 118, gives $1/(1-w)$.`,
        hints: [
          'The closed form is $1/(1-w)$.',
          'Clear the denominator, then multiply by the conjugate.',
        ],
        misses: [
          {
            match: '0',
            why: 'A denominator written as $0$ treats the conjugate product as $0$. A conjugate product is $|z|^2$, which is positive.',
          },
        ],
      },
    ],
    witness: { kind: 'shifted', a, b, radius, p, q, den },
  };
}

export function generate(seed, params = {}) {
  const rand = mulberry32(seed);
  if (params.kind === 'radius') return radiusItem(rand);
  if (params.kind === 'shifted') return shiftedItem(rand);
  return sumItem(rand, Number(seed) || 1);
}
