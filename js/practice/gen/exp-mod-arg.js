// |e^z| and the principal argument of e^z for z = x + iy.
// Identity (5.1), page 132. Equations (5.6) and (5.7), page 133.
// y is a multiple of π/4 so the reduced argument is an exact angle.

import { mulberry32, pickInt } from '../seed.js';

export const id = 'exp-mod-arg';

const XS = [-2, -1, 0, 1, 2, 3];
const KS = [-8, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 8];

export function principalQuarters(k) {
  let m = ((k % 8) + 8) % 8;
  if (m > 4) m -= 8;
  return m;
}

export function texQuarters(k) {
  if (k === 0) return '0';
  const sign = k < 0 ? '-' : '';
  const n = Math.abs(k);
  if (n % 4 === 0) {
    const m = n / 4;
    return m === 1 ? `${sign}\\pi` : `${sign}${m}\\pi`;
  }
  if (n % 2 === 0) {
    const m = n / 2;
    return m === 1 ? `${sign}\\frac{\\pi}{2}` : `${sign}\\frac{${m}\\pi}{2}`;
  }
  if (n === 1) return `${sign}\\frac{\\pi}{4}`;
  return `${sign}\\frac{${n}\\pi}{4}`;
}

function zTex(x, yTex) {
  if (yTex === '0') return String(x);
  const imag = `${yTex}\\,i`;
  if (x === 0) return imag;
  if (yTex.startsWith('-')) return `${x}${imag}`;
  return `${x}+${imag}`;
}

function modulusOf(x) {
  if (x === 0) return { answer: '1', accept: ['e^{0}', 'e^0', '\\exp(0)'] };
  if (x === 1) return { answer: 'e', accept: ['e^{1}', 'e^1', '\\exp(1)'] };
  if (x === -1) return { answer: 'e^{-1}', accept: ['\\frac{1}{e}', '1/e', '\\exp(-1)'] };
  if (x < 0) {
    return {
      answer: `e^{${x}}`,
      accept: [`\\exp(${x})`, `\\frac{1}{e^{${-x}}}`, `1/e^{${-x}}`],
    };
  }
  return { answer: `e^{${x}}`, accept: [`e^${x}`, `\\exp(${x})`] };
}

function argumentOf(k) {
  const m = principalQuarters(k);
  const answer = texQuarters(m);
  const accept = new Set([answer, '0']);
  if (m !== 0) {
    const sign = m < 0 ? '-' : '';
    const n = Math.abs(m);
    accept.add(`${sign}${n}\\pi/4`);
    accept.add(`${sign}${n}pi/4`);
    if (n % 2 === 0) accept.add(`${sign}${n / 2}pi/2`);
    if (n % 4 === 0) accept.add(m > 0 ? `${n / 4}pi` : `-${n / 4}pi`);
  }
  accept.delete('0');
  if (m === 0) accept.add('0');
  return { answer, accept: [...accept], quarters: m };
}

export function generate(seed) {
  const rand = mulberry32(seed);
  const x = XS[pickInt(rand, 0, XS.length - 1)];
  const k = KS[pickInt(rand, 0, KS.length - 1)];
  const mod = modulusOf(x);
  const arg = argumentOf(k);
  const yTex = texQuarters(k);
  return {
    prompt: `Let $z=${zTex(x, yTex)}$. Find $|e^{z}|$ and the principal value $\\operatorname{Arg}(e^{z})$.`,
    steps: [
      {
        text: '$|e^{z}|=$ ___',
        answer: mod.answer,
        accept: mod.accept,
        why: `$|e^{x+iy}|=e^{x}$. Identity (5.1), page 132, and Equation (5.6), page 133.`,
        hints: [
          'The modulus does not use $y$.',
          'It is the real exponential of the real part.',
        ],
      },
      {
        text: '$\\operatorname{Arg}(e^{z})=$ ___',
        answer: arg.answer,
        accept: arg.accept,
        why: `Reduce $y$ into $(-\\pi,\\pi]$. Equation (5.7), page 133. The principal value at $\\pm\\pi$ is $\\pi$.`,
        hints: [
          'The argument of $e^{x+iy}$ starts as $y$.',
          'Subtract $2\\pi$ until the angle sits in $(-\\pi,\\pi]$.',
        ],
      },
    ],
    witness: { kind: 'exp', x, k, quarters: arg.quarters },
  };
}
