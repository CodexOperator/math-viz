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

function addMap(a, b, scale = 1) {
  const out = new Map(a);
  for (const [k, v] of b) {
    const next = (out.get(k) || 0) + scale * v;
    if (next === 0) out.delete(k);
    else out.set(k, next);
  }
  return out;
}

function scaleMap(map, s) {
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

function partialX(map) {
  const out = new Map();
  for (const [k, c] of map) {
    const [i, j] = k.split(',').map(Number);
    if (!i) continue;
    const next = c * i;
    if (next) out.set(key(i - 1, j), next);
  }
  return out;
}

function partialY(map) {
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

// params: { coef: [lo, hi], deg: [min, max] }. seed is an integer.
export function generate(params, seed) {
  const rng = lcg(seed);
  const coeffs = pickCoeffs(params, rng);
  const { u, v } = expand(coeffs);
  if (!crHolds(u, v)) throw new Error('cr-poly built a polynomial in z that fails Cauchy-Riemann');
  const fp = derivativeCoeffs(coeffs);
  const answer = fmtZ(fp);
  const missed = fmtZ(coeffs.slice(1).map((c) => ({ re: c.re, im: c.im })));
  const conjugated = fmtZ(fp.map((c) => ({ re: c.re, im: -c.im })));
  const itself = fmtZ(coeffs);
  const choices = shuffle(rng, padChoices(answer, [missed, conjugated, itself, '0']));
  const uTex = fmtPoly(u);
  const vTex = fmtPoly(v);
  return {
    prompt: `Let \\(u = ${uTex}\\) and \\(v = ${vTex}\\). Check the Cauchy-Riemann equations and find \\(f'(z)\\).`,
    steps: [
      {
        text: 'The Cauchy-Riemann equations for this polynomial',
        answer: 'hold at every point',
        choices: shuffle(rng, ['hold at every point', 'fail at every point', 'hold only at 0', 'hold only on the axes']),
        why: `\\(u_x = v_y\\) and \\(u_y = -v_x\\). Both partials are polynomials, so they are continuous. Theorem 3.4, page 89.`,
      },
      {
        text: "So \\(f'(z)\\) equals",
        answer,
        choices,
        why: `\\(f'(z) = u_x + i v_x = ${answer}\\). Equation (3.14), page 86.`,
      },
    ],
    memory: "Polynomial in z: the Cauchy-Riemann equations hold, and f' is the usual derivative.",
  };
}

export function selfCheck() {
  for (let seed = 1; seed <= 40; seed += 1) {
    const item = generate({ coef: [-2, 2], deg: [1, 3] }, seed);
    if (!item.steps[1].choices.includes(item.steps[1].answer)) return false;
    if (item.steps[1].choices.length < 3 || item.steps[1].choices.length > 4) return false;
  }
  const classic = expand([{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 0 }]);
  const fp = fmtZ(derivativeCoeffs([{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 0 }]));
  return crHolds(classic.u, classic.v) && fmtPoly(classic.u) === 'x^{2} - y^{2} + x' && fmtPoly(classic.v) === '2xy + y' && fp === '2z + 1';
}
