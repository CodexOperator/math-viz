// Two distances to the centre. Theorem 4.15, page 124.
// Exercise 4.4.6, page 129, is the same comparison with 4-i and 2+3i.

import { mulberry32, pickInt } from '../seed.js';
import { texComplex } from './geometric-series.js';

export const id = 'two-moduli';

function modTex(re, im) {
  const n = re * re + im * im;
  const r = Math.sqrt(n);
  if (Number.isInteger(r)) return { tex: String(r), n };
  return { tex: `\\sqrt{${n}}`, n };
}

export function generate(seed) {
  const rand = mulberry32(seed);
  let a = { re: 4, im: -1 };
  let b = { re: 2, im: 3 };
  for (let n = 0; n < 30; n++) {
    a = { re: pickInt(rand, -4, 4), im: pickInt(rand, -4, 4) };
    b = { re: pickInt(rand, -4, 4), im: pickInt(rand, -4, 4) };
    if (a.re === 0 && a.im === 0) continue;
    if (b.re === 0 && b.im === 0) continue;
    if (a.re * a.re + a.im * a.im !== b.re * b.re + b.im * b.im) break;
  }
  const ma = modTex(a.re, a.im);
  const mb = modTex(b.re, b.im);
  if (ma.n === mb.n) {
    a = { re: 4, im: -1 };
    b = { re: 2, im: 3 };
  }
  const left = modTex(a.re, a.im);
  const right = modTex(b.re, b.im);
  const closer = right.n < left.n;
  const za = texComplex(a.re, a.im);
  const zb = texComplex(b.re, b.im);
  const conclusion = closer ? 'converges at both' : 'does not force convergence at the farther point';
  const relation = closer ? 'closer' : 'farther';
  return {
    prompt: `A power series $\\sum c_n z^n$ converges at $${za}$. What does Theorem 4.15, page 124, say about $${zb}$?`,
    steps: [
      {
        text: `$|${za}|$ equals ___.`,
        answer: `$${left.tex}$`,
        accept: [left.tex, `sqrt(${left.n})`],
        why: `$${za}$ has modulus $\\sqrt{${a.re * a.re + a.im * a.im}}$.`,
        hints: ['Square the real part and the imaginary part, then add.', 'The modulus is the square root of that sum.'],
      },
      {
        text: `$|${zb}|$ equals ___.`,
        answer: `$${right.tex}$`,
        accept: [right.tex, `sqrt(${right.n})`],
        why: `$${zb}$ has modulus $\\sqrt{${b.re * b.re + b.im * b.im}}$.`,
        hints: ['Same two squares.', 'Compare this number with the first modulus.'],
      },
      {
        text: 'Theorem 4.15 says the series ___.',
        answer: conclusion,
        accept: closer ? ['converges at both points', 'both converge'] : ['does not force it', 'does not force convergence'],
        why: closer
          ? `$${zb}$ is closer to the centre than $${za}$. Convergence at the farther point spreads inward. Theorem 4.15, page 124.`
          : `$${zb}$ is farther from the centre. Theorem 4.15 spreads convergence only to points closer to the centre.`,
        hints: [
          'The theorem moves convergence toward the centre.',
          closer ? 'The second point is the closer one.' : 'The second point is not the closer one.',
        ],
        misses: [
          {
            match: 'diverges at the closer point',
            accept: ['diverges', 'diverges at both'],
            why: 'Theorem 4.15, page 124, spreads convergence to every point closer to the centre. It does not turn a closer point into a divergence.',
          },
          {
            match: 'goes to infinity',
            accept: ['R goes to \\infty', 'R goes to infinity', 'R=\\infty'],
            why: 'The radius does not go to $\\infty$. Theorem 4.15 compares the two distances to the centre.',
          },
          ...(closer ? [] : [{
            match: 'converges at both',
            why: 'The theorem spreads convergence only to points closer to the centre. This point is farther, so the theorem does not force convergence there.',
          }]),
        ],
      },
      {
        text: `$${zb}$ is ___ to the centre than $${za}$.`,
        answer: relation,
        accept: closer ? ['closer to', 'nearer', 'nearer to'] : ['further', 'not closer'],
        why: closer
          ? `$${right.tex}$ is smaller than $${left.tex}$. The word in Theorem 4.15, page 124, is closer.`
          : `$${right.tex}$ is larger than $${left.tex}$. Theorem 4.15, page 124, uses closer for the point the convergence spreads to.`,
        hints: ['Compare the two moduli.', 'Closer means the smaller distance to the centre.'],
        misses: [
          {
            match: closer ? 'farther' : 'closer',
            accept: closer ? ['further', 'outside'] : ['closer to', 'nearer'],
            why: 'Compare the moduli first. Theorem 4.15, page 124, calls the smaller distance closer.',
          },
        ],
      },
    ],
    witness: { a, b, left: left.n, right: right.n, closer },
  };
}
