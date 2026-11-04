// Deterministic polynomials u + iv. The derivative is computed, not typed.
// A seed picks small integer coefficients of a polynomial in z, expands u and v,
// and checks the Cauchy-Riemann equations by exact integer arithmetic.

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

export function addMap(a, b, scale = 1) {
  const out = new Map(a);
  for (const [k, v] of b) {
    const next = (out.get(k) || 0) + scale * v;
    if (next === 0) out.delete(k);
    else out.set(k, next);
  }
  return out;
}

export function scaleMap(map, s) {
  const out = new Map();
  if (s === 0) return out;
  for (const [k, v] of map) out.set(k, v * s);
  return out;
}

function mulZ(re, im) {
  const re2 = new Map();
  const im2 = new Map();
  const put = (map, k, v) => {
    const next = (map.get(k) || 0) + v;
    if (next === 0) map.delete(k);
    else map.set(k, next);
  };
  for (const [k, c] of re) {
    const [i, j] = k.split(',').map(Number);
    put(re2, key(i + 1, j), c);
    put(im2, key(i, j + 1), c);
  }
  for (const [k, c] of im) {
    const [i, j] = k.split(',').map(Number);
    put(re2, key(i, j + 1), -c);
    put(im2, key(i + 1, j), c);
  }
  return { re: re2, im: im2 };
}

export function partialX(map) {
  const out = new Map();
  for (const [k, c] of map) {
    const [i, j] = k.split(',').map(Number);
    if (!i) continue;
    const next = c * i;
    if (next) out.set(key(i - 1, j), next);
  }
  return out;
}

export function partialY(map) {
  const out = new Map();
  for (const [k, c] of map) {
    const [i, j] = k.split(',').map(Number);
    if (!j) continue;
    const next = c * j;
    if (next) out.set(key(i, j - 1), next);
  }
  return out;
}

function mapsEqual(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) if ((a.get(k) || 0) !== (b.get(k) || 0)) return false;
  return true;
}

export function expand(coeffs) {
  let ure = new Map();
  let vim = new Map();
  let powRe = new Map([[key(0, 0), 1]]);
  let powIm = new Map();
  for (let k = 0; k < coeffs.length; k += 1) {
    const a = coeffs[k].re;
    const b = coeffs[k].im;
    ure = addMap(ure, scaleMap(powRe, a));
    ure = addMap(ure, scaleMap(powIm, -b));
    vim = addMap(vim, scaleMap(powRe, b));
    vim = addMap(vim, scaleMap(powIm, a));
    const next = mulZ(powRe, powIm);
    powRe = next.re;
    powIm = next.im;
  }
  return { u: ure, v: vim };
}

export function derivativeCoeffs(coeffs) {
  const out = [];
  for (let k = 1; k < coeffs.length; k += 1) {
    out.push({ re: k * coeffs[k].re, im: k * coeffs[k].im });
  }
  return out;
}

export function crHolds(u, v) {
  return mapsEqual(partialX(u), partialY(v)) && mapsEqual(partialY(u), scaleMap(partialX(v), -1));
}

export function fmtPoly(map) {
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

function fmtComplex(re, im) {
  if (re === 0 && im === 0) return '0';
  if (im === 0) return String(re);
  const iPart = Math.abs(im) === 1 ? 'i' : `${Math.abs(im)}i`;
  if (re === 0) return im < 0 ? `-${iPart}` : iPart;
  return `${re} ${im < 0 ? '-' : '+'} ${iPart}`;
}

export function fmtZ(coeffs) {
  const parts = [];
  for (let k = coeffs.length - 1; k >= 0; k -= 1) {
    const { re, im } = coeffs[k];
    if (!re && !im) continue;
    const c = fmtComplex(re, im);
    const z = k === 0 ? '' : k === 1 ? 'z' : `z^{${k}}`;
    if (!z) {
      parts.push(c);
      continue;
    }
    if (c === '1') parts.push(z);
    else if (c === '-1') parts.push(`-${z}`);
    else if (c === 'i') parts.push(`i${z}`);
    else if (c === '-i') parts.push(`-i${z}`);
    else if (/[+-]/.test(c.slice(1))) parts.push(`(${c.replace(/ /g, '')})${z}`);
    else parts.push(`${c}${z}`);
  }
  if (!parts.length) return '0';
  return parts.join(' + ').replace(/\+ -/g, '- ');
}

function nonempty(coeffs) {
  return coeffs.some((c) => c.re !== 0 || c.im !== 0);
}

function pickCoeffs(params, rng) {
  const coef = params && params.coef;
  const deg = params && params.deg;
  const lo = Array.isArray(coef) ? coef[0] : -2;
  const hi = Array.isArray(coef) ? coef[1] : 2;
  const d0 = Array.isArray(deg) ? deg[0] : 1;
  const d1 = Array.isArray(deg) ? deg[1] : 3;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const n = randint(rng, Math.max(1, d0), Math.max(d0, d1));
    const coeffs = [];
    for (let k = 0; k <= n; k += 1) coeffs.push({ re: randint(rng, lo, hi), im: randint(rng, lo, hi) });
    if ((coeffs[n].re || coeffs[n].im) && nonempty(coeffs)) return coeffs;
  }
  return [{ re: 0, im: 0 }, { re: 1, im: 0 }];
}

function unique(list) {
  const out = [];
  for (const item of list) if (item && !out.includes(item)) out.push(item);
  return out;
}

function padChoices(correct, extras) {
  const pool = unique([correct, ...extras, '0', '1', 'z', '2z', 'i']);
  return pool.slice(0, 4);
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

const CR_WHERE = ['hold at every point', 'fail at every point', 'hold only at 0', 'hold only on the real axis'];

function mono(i, j, c) {
  const map = new Map();
  if (c) map.set(key(i, j), c);
  return map;
}

function pairPrompt(u, v) {
  return `Let \\(u = ${fmtPoly(u)}\\) and \\(v = ${fmtPoly(v)}\\). Check the Cauchy-Riemann equations and find \\(f'(z)\\).`;
}

function whereStep(rng, answer, why) {
  return {
    text: 'The Cauchy-Riemann equations for this polynomial',
    answer,
    choices: shuffle(rng, CR_WHERE),
    why,
  };
}

// generate(seed, params). params is { coef: [lo, hi], deg: [min, max] }.
// Most seeds are polynomials in z. Some fail everywhere, and some hold only
// on the real axis, the pattern of §3.2 Exercise 1(g).
export function generate(seed, params) {
  const rng = lcg(seed);
  const mode = Math.abs(seed % 5);
  if (mode === 4) return failEverywhere(rng);
  if (mode === 3) return realAxisOnly(rng, params);
  return analytic(rng, params);
}

function analytic(rng, params) {
  const coeffs = pickCoeffs(params, rng);
  const { u, v } = expand(coeffs);
  if (!crHolds(u, v)) throw new Error('cr-poly built a polynomial in z that fails Cauchy-Riemann');
  const fp = derivativeCoeffs(coeffs);
  const answer = fmtZ(fp);
  const missed = fmtZ(coeffs.slice(1).map((c) => ({ re: c.re, im: c.im })));
  const conjugated = fmtZ(fp.map((c) => ({ re: c.re, im: -c.im })));
  const itself = fmtZ(coeffs);
  return {
    prompt: pairPrompt(u, v),
    steps: [
      whereStep(rng, 'hold at every point', '\\(u_x = v_y\\) and \\(u_y = -v_x\\) at every point, and the partials are continuous. Theorem 3.4, page 89.'),
      {
        text: "So \\(f'(z)\\) equals",
        answer,
        choices: shuffle(rng, padChoices(answer, [missed, conjugated, itself, '0'])),
        why: `\\(f'(z) = u_x + i v_x = ${answer}\\). Equation (3.14), page 86.`,
      },
    ],
    memory: "A polynomial in z passes Cauchy-Riemann. f' is the calculus derivative.",
  };
}

function realAxisOnly(rng, params) {
  let a = randint(rng, 1, 2);
  if (params && Array.isArray(params.coef)) a = Math.max(1, Math.min(2, Math.abs(randint(rng, params.coef[0], params.coef[1])) || 1));
  const u = addMap(mono(2, 0, a), mono(0, 2, a));
  const v = mono(1, 1, 2 * a);
  const onAxis = a === 1 ? '2x, only on the real axis' : `${2 * a}x, only on the real axis`;
  return {
    prompt: pairPrompt(u, v),
    steps: [
      whereStep(rng, 'hold only on the real axis', `\\(u_y + v_x = ${4 * a}y\\), so the equations hold only when \\(y = 0\\). This is the pattern of §3.2 Exercise 1(g).`),
      {
        text: "So \\(f'(z)\\) equals",
        answer: onAxis,
        choices: shuffle(rng, [onAxis, '2z everywhere', 'does not exist anywhere', '0']),
        why: `On the real axis, \\(f' = u_x + i v_x = ${a === 1 ? '2x' : `${2 * a}x`}\\). Off that axis the derivative does not exist.`,
      },
    ],
    memory: 'If the equations hold only on a line, there is no disk, so the function is nowhere analytic.',
  };
}

function failEverywhere(rng) {
  const u = mono(1, 0, 1);
  const v = new Map();
  return {
    prompt: pairPrompt(u, v),
    steps: [
      whereStep(rng, 'fail at every point', '\\(u_x = 1\\) and \\(v_y = 0\\). Theorem 3.3 says the derivative does not exist at any point.'),
      {
        text: "So \\(f'(z)\\) equals",
        answer: 'does not exist',
        choices: shuffle(rng, ['does not exist', '1', '0', '2x']),
        why: 'The equations fail everywhere, so there is no derivative. This is \\(f(z) = x\\).',
      },
    ],
    memory: 'One failed Cauchy-Riemann equation, at every point, means no derivative.',
  };
}

export function selfCheck() {
  let everywhere = 0;
  let line = 0;
  let failed = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const item = generate(seed, { coef: [-2, 2], deg: [1, 3] });
    for (const step of item.steps) {
      if (!step.choices.includes(step.answer)) return false;
      if (step.choices.length < 3 || step.choices.length > 4) return false;
    }
    const where = item.steps[0].answer;
    if (where === 'hold at every point') everywhere += 1;
    else if (where === 'hold only on the real axis') line += 1;
    else if (where === 'fail at every point') failed += 1;
    else return false;
  }
  const classic = expand([{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 0 }]);
  const fp = fmtZ(derivativeCoeffs([{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 0 }]));
  return everywhere > 0 && line > 0 && failed > 0
    && crHolds(classic.u, classic.v)
    && fmtPoly(classic.u) === 'x^{2} - y^{2} + x'
    && fmtPoly(classic.v) === '2xy + y'
    && fp === '2z + 1';
}
