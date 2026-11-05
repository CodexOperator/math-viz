// A linear map w = az + b with real a and b, the special case of w = Az + B in §2.1.
// Howell & Mathews, page 50. The image is computed here.

import { mulberry32, pickInt } from '../seed.js';
import { texComplex } from './geometric-series.js';

export const id = 'ch2-maps';

export function image(a, b, x, y) {
  return { re: a * x + b, im: a * y };
}

export function generate(seed) {
  const rand = mulberry32(seed);
  let a = 0;
  while (a === 0) a = pickInt(rand, -3, 3);
  const b = pickInt(rand, -4, 4);
  const x = pickInt(rand, -4, 4);
  const y = pickInt(rand, -4, 4);
  const w = image(a, b, x, y);
  const zTex = texComplex(x, y);
  const answer = texComplex(w.re, w.im);
  const bTex = b < 0 ? `-${-b}` : (b === 0 ? '' : `+${b}`);
  return {
    prompt: `The map is $w=${a}z${bTex}$. Find $w$ when $z=${zTex}$.`,
    steps: [
      {
        text: '$w=$ ___',
        answer,
        accept: [answer.replace(/i$/, '*i')],
        why: `$w=az+b$ with real $a$ and $b$ sends $x+iy$ to $ax+b$ and $ay$. The general map $w=Az+B$ is Section 2.1, page 50.`,
        hints: [
          'Multiply the real part and the imaginary part by $a$, then add $b$ to the real part.',
          `The real part is $${a}\\cdot ${x}${b < 0 ? b : `+${b}`}$.`,
        ],
      },
    ],
    witness: { kind: 'map', a, b, x, y, re: w.re, im: w.im },
  };
}
