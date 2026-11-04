// A harmonic conjugate of Re(f), for f a polynomial in z with small integer coefficients.
// v = Im(f) is computed from the same coefficients. The constant is free.

import { expand, fmtZ } from './cr-poly.js';

function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randint(rng, lo, hi) {
  const a = Math.ceil(lo);
  const b = Math.floor(hi);
  return a + Math.floor(rng() * (b - a + 1));
}

function key(i, j) {
  return `${i},${j}`;
}

function fmtPoly(map) {
  const terms = [...map.entries()].map(([k, c]) => {
    const [i, j] = k.split(',').map(Number);
    return { i, j, c };
  }).filter((t) => t.c !== 0);
  terms.sort((p, q) => (q.i + q.j) - (p.i + p.j) || q.i - p.i || q.j - p.j);
  if (!terms.length) return '0';
  let s = '';
  terms.forEach((t, n) => {
    const mag = Math.abs(t.c);
    const bare = (t.i || t.j) && mag === 1 ? '' : String(mag);
    let body = bare;
    if (t.i === 1) body += 'x';
    else if (t.i > 1) body += `x^{${t.i}}`;
    if (t.j === 1) body += 'y';
    else if (t.j > 1) body += `y^{${t.j}}`;
    if (!t.i && !t.j) body = String(mag);
    if (n === 0) s += (t.c < 0 ? '-' : '') + body;
    else s += t.c < 0 ? ` - ${body}` : ` + ${body}`;
  });
  return s;
}

function negMap(map) {
  const out = new Map();
  for (const [k, v] of map) out.set(k, -v);
  return out;
}

function flipLeading(map) {
  let best = null;
  let bestDeg = -1;
  for (const [k, c] of map) {
    const [i, j] = k.split(',').map(Number);
    const deg = i + j;
    if (deg > bestDeg) {
      bestDeg = deg;
      best = k;
    }
  }
  const out = new Map(map);
  if (best) out.set(best, -out.get(best));
  return out;
}

function withC(tex) {
  if (tex === '0') return 'C';
  return `${tex} + C`;
}

function unique(list) {
  const out = [];
  for (const item of list) if (item && !out.includes(item)) out.push(item);
  return out;
}

function shuffle(rng, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = a[i];
    a[i] = a[j];
    a[j] = swap;
  }
  return a;
}

function pickCoeffs(params, rng) {
  const coef = params && params.coef;
  const deg = params && params.deg;
  const lo = Array.isArray(coef) ? coef[0] : -2;
  const hi = Array.isArray(coef) ? coef[1] : 2;
  const d0 = Array.isArray(deg) ? Math.max(2, deg[0]) : 2;
  const d1 = Array.isArray(deg) ? Math.max(d0, deg[1]) : 3;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const n = randint(rng, d0, d1);
    const coeffs = [];
    for (let k = 0; k <= n; k += 1) coeffs.push({ re: 0, im: 0 });
    coeffs[n] = { re: randint(rng, lo, hi), im: randint(rng, lo, hi) };
    if (n > 1 && rng() < 0.5) coeffs[n - 1] = { re: randint(rng, lo, hi), im: randint(rng, lo, hi) };
    if (coeffs[n].re || coeffs[n].im) return coeffs;
  }
  return [{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 1, im: 0 }];
}

export function generate(params, seed) {
  const rng = lcg(seed);
  const coeffs = pickCoeffs(params, rng);
  const { u, v } = expand(coeffs);
  const uTex = fmtPoly(u);
  const vTex = withC(fmtPoly(v));
  const wrongSign = withC(fmtPoly(negMap(v)));
  const swapped = withC(fmtPoly(u));
  const flipped = withC(fmtPoly(flipLeading(v)));
  const choices = unique([vTex, wrongSign, swapped, flipped]).slice(0, 4);
  while (choices.length < 3) choices.push(choices.length === 1 ? 'C' : 'x + C');
  const ordered = shuffle(rng, choices);
  const fTex = fmtZ(coeffs);
  return {
    prompt: `\\(u = ${uTex}\\) is the real part of a polynomial in \\(z\\). Find a harmonic conjugate \\(v\\).`,
    steps: [
      {
        text: '\\(u_{xx} + u_{yy}\\) equals',
        answer: '0',
        choices: shuffle(rng, ['0', '2', '4', '2x']),
        why: `\\(u = \\operatorname{Re}(${fTex})\\), so Laplace's equation holds. Theorem 3.8, page 95.`,
      },
      {
        text: 'A harmonic conjugate is',
        answer: vTex,
        choices: ordered.includes(vTex) ? ordered : [vTex, ...ordered].slice(0, 4),
        why: `\\(v = \\operatorname{Im}(${fTex}) + C = ${vTex}\\). The constant is free. Theorem 3.9, page 97.`,
      },
    ],
    memory: 'Integrate u_x in y, then fix C(x) by v_x = -u_y. Up to a constant, v is the imaginary part.',
  };
}

export function selfCheck() {
  const book = expand([{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 1 }]);
  const u = fmtPoly(book.u);
  const v = fmtPoly(book.v);
  if (u !== 'y^{3} - 3x^{2}y' && u !== '-3x^{2}y + y^{3}') return false;
  if (v !== 'x^{3} - 3xy^{2}') return false;
  for (let seed = 1; seed <= 30; seed += 1) {
    const item = generate({ coef: [-2, 2], deg: [2, 3] }, seed);
    if (!item.steps[1].choices.includes(item.steps[1].answer)) return false;
    if (!item.steps[0].choices.includes('0')) return false;
  }
  return true;
}
