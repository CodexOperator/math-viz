// Both parts of sin(x+iy). Identity (5.35), page 150.
// The parts are exact expressions in the seeded integers, not decimals.

import { mulberry32, pickInt } from '../seed.js';

export const id = 'sin-parts';

function trig(name, n) {
  if (n === 0) return name === 'cos' ? '1' : '0';
  const tex = name === 'sin' ? '\\sin' : '\\cos';
  if (n < 0) return `-${tex} ${-n}`;
  return `${tex} ${n}`;
}

function hyp(name, n) {
  if (n === 0) return name === 'cosh' ? '1' : '0';
  const tex = name === 'sinh' ? '\\sinh' : '\\cosh';
  if (n < 0 && name === 'sinh') return `-${tex} ${-n}`;
  if (n < 0) return `${tex} ${-n}`;
  return `${tex} ${n}`;
}

function product(left, right) {
  if (left === '0' || right === '0') return '0';
  let sign = '';
  let a = left;
  let b = right;
  if (a.startsWith('-')) { sign = sign ? '' : '-'; a = a.slice(1); }
  if (b.startsWith('-')) { sign = sign ? '' : '-'; b = b.slice(1); }
  let body = a;
  if (a === '1') body = b;
  else if (b !== '1') body = `${a}${b}`;
  return sign ? `-${body}` : body;
}

function zTex(x, y) {
  if (y === 0) return String(x);
  if (x === 0) return y === 1 ? 'i' : y === -1 ? '-i' : `${y}i`;
  const imag = y === 1 ? 'i' : y === -1 ? '-i' : `${y}i`;
  if (imag.startsWith('-')) return `${x}${imag}`;
  return `${x}+${imag}`;
}

export function parts(x, y) {
  return {
    real: product(trig('sin', x), hyp('cosh', y)),
    imag: product(trig('cos', x), hyp('sinh', y)),
  };
}

export function generate(seed) {
  const rand = mulberry32(seed);
  const x = pickInt(rand, -2, 2);
  const y = pickInt(rand, -2, 2);
  const { real, imag } = parts(x, y);
  return {
    prompt: `Write $\\sin(${zTex(x, y)})$ as $u+iv$. Identity (5.35), page 150.`,
    steps: [
      {
        text: 'The real part is ___.',
        answer: `$${real}$`,
        accept: [real],
        why: `$\\sin(x+iy)=\\sin x\\cosh y+i\\cos x\\sinh y$. The real part is $\\sin x\\cosh y$. Identity (5.35), page 150.`,
        hints: ['Use $\\sin x\\cosh y$.', 'A factor of $0$ or $1$ drops out.'],
      },
      {
        text: 'The imaginary part is ___.',
        answer: `$${imag}$`,
        accept: [imag],
        why: 'The imaginary part is $\\cos x\\sinh y$. Identity (5.35), page 150.',
        hints: ['Use $\\cos x\\sinh y$.', '$\\sinh 0=0$ and $\\cosh 0=1$.'],
      },
    ],
    witness: { x, y, real, imag },
  };
}
