// Ratio-test radii. Answers are the simplified factorial ratio and R = infinity.
// Theorem 4.16, page 125. The ratio uses the full term, Theorem 4.13, page 120.

import { mulberry32, pickInt } from '../seed.js';
import { texComplex } from './geometric-series.js';

export const id = 'ratio-radius';

const CENTRE_ZERO = 'The centre is not the radius. Write $R=0$ only when the series converges only at the centre.';
const GOES = 'Write $R=\\infty$. The radius does not go to $\\infty$.';
const COEFF = 'That is the coefficient $a_n$ alone. The ratio test uses the full term $a_n z^n$.';

function radiusStep(cx, cy) {
  const centre = texComplex(cx, cy);
  const centreAccept = [centre];
  if (cx !== 0) centreAccept.push(String(cx));
  if (cy !== 0 && cy !== cx) centreAccept.push(String(cy));
  return {
    text: 'The radius is ___.',
    answer: '$R=\\infty$',
    accept: ['\\infty', 'infinity', 'R=\\infty', 'R = \\infty'],
    why: 'The factorial ratio goes to $0$, so Theorem 4.16, page 125, gives $R=\\infty$.',
    hints: [
      'A ratio that goes to $0$ is not a radius that goes to $\\infty$.',
      'Write $R=\\infty$. The centre is not the radius, and $R=0$ is only the series that converges at the centre alone.',
    ],
    misses: [
      { match: '0', accept: ['R=0', 'R = 0'], why: CENTRE_ZERO },
      {
        match: 'goes to infinity',
        accept: ['R goes to \\infty', 'R goes to infinity', 'goes to \\infty'],
        why: GOES,
      },
      { match: centre, accept: centreAccept, why: 'The centre is not the radius.' },
    ],
  };
}

function evenFactorial(cx, cy) {
  return {
    prompt: 'Use the ratio test on $\\sum_{n=0}^{\\infty} z^n/(2n)!$. Theorem 4.16, page 125.',
    steps: [
      {
        text: '$(2n)!/(2n+2)!$ simplifies to ___.',
        answer: '$\\dfrac{1}{(2n+1)(2n+2)}$',
        accept: ['1/((2n+1)(2n+2))', '1/(2n+1)(2n+2)'],
        why: '$(2n+2)!=(2n+2)(2n+1)(2n)!$, so the ratio is $1/((2n+1)(2n+2))$.',
        hints: ['Keep the $2n$ in the factorial.', 'Cancel $(2n)!$ and leave the two new factors.'],
        misses: [
          {
            match: '$\\dfrac{n!}{(n+2)!}$',
            accept: ['n!/(n+2)!', '1/((n+1)(n+2))'],
            why: 'That replaces $(2n)!$ with $n!$. The factorial ratio keeps the $2n$.',
          },
        ],
      },
      {
        text: 'The ratio test reads the modulus of ___.',
        answer: '$\\left|\\dfrac{a_{n+1} z^{n+1}}{a_n z^n}\\right|$',
        accept: ['|a_{n+1} z^{n+1}/(a_n z^n)|', '|a_{n+1}z^{n+1}/(a_n z^n)|'],
        why: 'The test reads the full term $a_n z^n$, then takes the modulus. Theorem 4.13, page 120.',
        hints: ['Include the power of $z$, not only $a_n$.', 'The comparison is a modulus.'],
        misses: [
          {
            match: '$\\left|\\dfrac{a_{n+1}}{a_n}\\right|$',
            accept: ['|a_{n+1}/a_n|', '|a_{n+1}/a_n|'],
            why: COEFF,
          },
        ],
      },
      radiusStep(cx, cy),
    ],
    witness: { kind: 'even', cx, cy },
  };
}

function shiftedFactorial(cx, cy) {
  const centre = texComplex(cx, cy);
  return {
    prompt: `Use the ratio test on $\\sum_{n=0}^{\\infty} (z-(${centre}))^n/(n+1)!$. Theorem 4.16, page 125.`,
    steps: [
      {
        text: '$(n+1)!/(n+2)!$ simplifies to ___.',
        answer: '$\\dfrac{1}{n+2}$',
        accept: ['1/(n+2)'],
        why: '$(n+2)!=(n+2)(n+1)!$, so the ratio is $1/(n+2)$.',
        hints: ['Cancel $(n+1)!$.', 'One factor is left in the denominator.'],
        misses: [
          {
            match: '$\\dfrac{n!}{(n+2)!}$',
            accept: ['n!/(n+2)!'],
            why: 'That replaces $(n+1)!$ with $n!$. Cancel $(n+1)!$ against $(n+2)!$.',
          },
        ],
      },
      {
        text: 'The ratio test reads the modulus of ___.',
        answer: '$\\left|\\dfrac{a_{n+1} z^{n+1}}{a_n z^n}\\right|$',
        accept: ['|a_{n+1} z^{n+1}/(a_n z^n)|'],
        why: 'The test reads the full term $a_n z^n$, then takes the modulus. Theorem 4.13, page 120.',
        hints: ['Include the power of $z$, not only $a_n$.'],
        misses: [
          {
            match: '$\\left|\\dfrac{a_{n+1}}{a_n}\\right|$',
            accept: ['|a_{n+1}/a_n|'],
            why: COEFF,
          },
        ],
      },
      radiusStep(cx, cy),
    ],
    witness: { kind: 'shift', cx, cy },
  };
}

export function generate(seed) {
  const rand = mulberry32(seed);
  const even = seed % 2 === 1;
  const cx = even ? 0 : pickInt(rand, -2, 2);
  const cy = even ? 0 : pickInt(rand, -2, 2);
  return even ? evenFactorial(cx, cy) : shiftedFactorial(cx, cy);
}
