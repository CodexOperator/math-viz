// A harmonic conjugate of Re(f), for f a polynomial in z with small integer coefficients.
// v = Im(f) is computed from the same coefficients. The constant is free.

import { addMap, expand, fmtPoly, fmtZ, partialX, partialY, scaleMap } from './cr-poly.js';

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

function negMap(map) {
  const out = new Map();
  for (const [k, v] of map) out.set(k, -v);
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

function integrateY(map) {
  const out = new Map();
  for (const [k, c] of map) {
    const [i, j] = k.split(',').map(Number);
    const den = j + 1;
    if (c % den !== 0) throw new Error('harmonic conjugate integral left the integers');
    const next = c / den;
    if (next) out.set(`${i},${j + 1}`, next);
  }
  return out;
}

function mono(i, j, c) {
  const map = new Map();
  if (c) map.set(`${i},${j}`, c);
  return map;
}

function laplace(u) {
  return addMap(partialX(partialX(u)), partialY(partialY(u)));
}

function cPrimeOf(u) {
  const integrated = integrateY(partialX(u));
  const got = partialX(integrated);
  return addMap(scaleMap(partialY(u), -1), scaleMap(got, -1));
}

function yOnly(map) {
  for (const k of map.keys()) {
    const j = Number(k.split(',')[1]);
    if (j) return false;
  }
  return true;
}

// generate(seed, params). params is { coef: [lo, hi], deg: [min, max] }.
export function generate(seed, params) {
  const rng = lcg(seed);
  if (Math.abs(seed % 4) === 0) return failing(seed);
  return passing(params, rng);
}

function failing(seed) {
  const rng = lcg(seed + 17);
  const cubic = Math.abs(seed / 4) % 2 === 1;
  const u = cubic ? addMap(mono(3, 0, 1), mono(0, 3, 1)) : addMap(mono(2, 0, 1), mono(0, 2, 1));
  const answer = fmtPoly(laplace(u));
  return {
    prompt: `\\(u = ${fmtPoly(u)}\\). Is there a harmonic conjugate?`,
    steps: [
      {
        text: '\\(u_{xx} + u_{yy}\\) equals',
        answer,
        choices: shuffle(rng, unique([answer, '0', '2', '4'])),
        why: `Laplace's equation fails: the sum is \\(${answer}\\). A harmonic conjugate needs a harmonic \\(u\\).`,
      },
      {
        text: 'A harmonic conjugate',
        answer: 'does not exist',
        choices: shuffle(rng, ['does not exist', 'x + C', 'y + C', 'C']),
        why: cubic
          ? 'This is the shape of §3.3 Exercise 2. \\(x^3 + y^3\\) is not harmonic, so no analytic \\(f\\) has it as a part.'
          : '\\(x^2 + y^2\\) has Laplacian 4, so it is not the real part of an analytic function.',
      },
    ],
    memory: 'If Laplace fails, there is no harmonic conjugate.',
  };
}

function passing(params, rng) {
  const coeffs = pickCoeffs(params, rng);
  const { u, v } = expand(coeffs);
  const integrated = integrateY(partialX(u));
  const cprime = cPrimeOf(u);
  if (!yOnly(cprime)) throw new Error('harmonic conjugate left C\' depending on y');
  const integral = `${fmtPoly(integrated)} + C(x)`;
  const cTex = fmtPoly(cprime);
  const vTex = withC(fmtPoly(v));
  const fTex = fmtZ(coeffs);
  const wrongIntegral = `${fmtPoly(negMap(integrated))} + C(x)`;
  const verdict = `C'(x) = ${cTex} and v = ${vTex}`;
  return {
    prompt: `\\(u = ${fmtPoly(u)}\\). Find a harmonic conjugate \\(v\\).`,
    steps: [
      {
        text: '\\(u_{xx} + u_{yy}\\) equals',
        answer: '0',
        choices: shuffle(rng, ['0', '2', '4', '2x']),
        why: `\\(u = \\operatorname{Re}(${fTex})\\), so Laplace's equation holds. Theorem 3.8, page 95.`,
      },
      {
        text: 'Integrating \\(u_x\\) with respect to \\(y\\) gives',
        answer: integral,
        choices: shuffle(rng, unique([integral, wrongIntegral, `${fmtPoly(u)} + C(x)`, 'C(x)'])),
        why: `\\(\\int u_x\\,dy = ${integral}\\). Equation (3.27), page 97.`,
      },
      {
        text: "Matching \\(v_x\\) to \\(-u_y\\) fixes \\(C'(x)\\), and a conjugate is",
        answer: verdict,
        choices: shuffle(rng, unique([
          verdict,
          `C'(x) = ${cTex} and v = ${withC(fmtPoly(negMap(v)))}`,
          `C'(x) = 1 and v = ${vTex}`,
          `C'(x) = ${cTex} and v = ${withC(fmtPoly(u))}`,
        ])),
        why: `\\(C'(x) = ${cTex}\\), so \\(v = ${vTex}\\). The same moves as §3.3 Exercise 5(a).`,
      },
    ],
    memory: 'Integrate u_x in y, then fix C(x) by v_x = -u_y.',
  };
}

export function selfCheck() {
  const book = expand([{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 1 }]);
  const u = fmtPoly(book.u);
  const v = fmtPoly(book.v);
  if (u !== 'y^{3} - 3x^{2}y' && u !== '-3x^{2}y + y^{3}') return false;
  if (v !== 'x^{3} - 3xy^{2}') return false;
  let failed = 0;
  let passed = 0;
  for (let seed = 1; seed <= 30; seed += 1) {
    const item = generate(seed, { coef: [-2, 2], deg: [2, 3] });
    for (const step of item.steps) {
      if (!step.choices.includes(step.answer)) return false;
    }
    if (item.steps[0].answer === '0') {
      passed += 1;
      if (item.steps.length !== 3) return false;
      if (!item.steps[1].answer.includes('C(x)')) return false;
      if (!item.steps[2].answer.includes("C'(x)")) return false;
    } else {
      failed += 1;
      if (item.steps[1].answer !== 'does not exist') return false;
    }
  }
  return failed > 0 && passed > 0;
}
