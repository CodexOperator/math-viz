// Deterministic problems for Chapter 1 arithmetic, modulus, argument, and polar form.
// The practice engine loads this by template id "ch1-arithmetic".
// Answers are computed here. Nothing is drawn, and nothing is random.

const PI = Math.PI;

const TRIPLES = Object.freeze([
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 12, 15],
  [6, 8, 10],
  [12, 16, 20],
]);

// Points whose argument is an exact multiple of pi/4. Scale is applied later.
const EXACT = Object.freeze([
  { re: 1, im: 0, p: 0, q: 1 },
  { re: 0, im: 1, p: 1, q: 2 },
  { re: -1, im: 0, p: 1, q: 1 },
  { re: 0, im: -1, p: -1, q: 2 },
  { re: 1, im: 1, p: 1, q: 4 },
  { re: -1, im: 1, p: 3, q: 4 },
  { re: -1, im: -1, p: -3, q: 4 },
  { re: 1, im: -1, p: -1, q: 4 },
]);

export const TEMPLATE_ID = 'ch1-arithmetic';

function rngOf(seed) {
  let s = (Number(seed) >>> 0) || 1;
  // Mix first. The raw LCG moves by a hair when the seed grows by 1, so
  // "Another" kept redrawing the same angle.
  s = Math.imul(s ^ (s >>> 16), 0x7feb352d) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x846ca68b) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  if (s === 0) s = 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function irand(next, lo, hi) {
  const a = Math.trunc(Number(lo));
  const b = Math.trunc(Number(hi));
  const n = Math.max(1, b - a + 1);
  return a + Math.floor(next() * n);
}

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

function fracTex(n, d) {
  if (d < 0) { n = -n; d = -d; }
  if (d === 0) return '0';
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return String(n);
  if (n < 0) return `-\\frac{${-n}}{${d}}`;
  return `\\frac{${n}}{${d}}`;
}

export function fmtCart(re, im) {
  const r = Math.round(re);
  const j = Math.round(im);
  if (Number.isFinite(re) && Number.isFinite(im) && Math.abs(re - r) < 1e-9 && Math.abs(im - j) < 1e-9) {
    return fmtInt(r, j);
  }
  return fmtInt(re, im);
}

function fmtInt(re, im) {
  if (im === 0) return String(re);
  const imag = im === 1 ? 'i' : im === -1 ? '-i' : `${im}i`;
  if (re === 0) return imag;
  if (im < 0) return `${re}${im === -1 ? '-i' : `${im}i`}`;
  return `${re}+${imag}`;
}

function fmtParts(reN, imN, d) {
  const re = fracTex(reN, d);
  const imAbs = fracTex(Math.abs(imN), d);
  const imag = imAbs === '1' ? 'i' : imAbs === '0' ? '0' : `${imAbs}i`;
  if (imN === 0) return re;
  if (reN === 0) return imN < 0 ? (imag === 'i' ? '-i' : `-${imag}`) : imag;
  return imN < 0 ? `${re}-${imag}` : `${re}+${imag}`;
}

function angleTex(p, q) {
  if (p === 0) return '0';
  const g = gcd(p, q);
  const pp = p / g;
  const qq = q / g;
  const sign = pp < 0 ? '-' : '';
  const ap = Math.abs(pp);
  if (qq === 1) return `${sign}\\pi`;
  if (ap === 1) return `${sign}\\pi/${qq}`;
  return `${sign}${ap}\\pi/${qq}`;
}

function rTex(re, im) {
  const r2 = re * re + im * im;
  const n = Math.round(Math.sqrt(r2));
  if (n * n === r2) return { tex: String(n), accept: [String(n)], real: n };
  for (let k = 1; k <= 12; k++) {
    if (k * k * 2 === r2) {
      const tex = k === 1 ? '\\sqrt{2}' : `${k}\\sqrt{2}`;
      const accept = k === 1 ? ['\\sqrt{2}', 'sqrt(2)', '√2'] : [`${k}\\sqrt{2}`, `${k}sqrt(2)`, `${k}√2`];
      return { tex, accept, real: k * Math.SQRT2 };
    }
  }
  const r = Math.hypot(re, im);
  const tex = r.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return { tex, accept: [tex], real: r };
}

function pair(next, rangeRe, rangeIm) {
  return { re: irand(next, rangeRe[0], rangeRe[1]), im: irand(next, rangeIm[0], rangeIm[1]) };
}

function bounds(params, key, fallback) {
  const v = params && params[key];
  if (Array.isArray(v) && v.length === 2 && Number.isFinite(Number(v[0])) && Number.isFinite(Number(v[1]))) {
    return [Number(v[0]), Number(v[1])];
  }
  return fallback;
}

function step(text, answer, accept, why, value) {
  return { text, answer, accept, why, value };
}

function arith(mode, a, b) {
  if (mode === 'add') return { re: a.re + b.re, im: a.im + b.im };
  if (mode === 'sub') return { re: a.re - b.re, im: a.im - b.im };
  if (mode === 'mul') return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
  const d = b.re * b.re + b.im * b.im;
  return {
    reN: a.re * b.re + a.im * b.im,
    imN: a.im * b.re - a.re * b.im,
    d,
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
}

function word(mode) {
  if (mode === 'add') return 'sum';
  if (mode === 'sub') return 'difference';
  if (mode === 'mul') return 'product';
  return 'quotient';
}

function citeWhy(mode) {
  if (mode === 'add') return 'Definition 1.1 adds the pairs, page 10.';
  if (mode === 'sub') return 'Definition 1.2 subtracts the pairs, page 10.';
  if (mode === 'mul') return 'Definition 1.3, page 10. Replace $i^2$ with $-1$.';
  return 'Definition 1.4 multiplies by the conjugate, page 11.';
}

export function generate(seed, params) {
  const mode = params && params.mode;
  const next = rngOf(seed);
  if (mode === 'add' || mode === 'sub' || mode === 'mul' || mode === 'div') {
    const reR = bounds(params, 're', [-5, 5]);
    const imR = bounds(params, 'im', [-5, 5]);
    const a = pair(next, reR, imR);
    let b = pair(next, reR, imR);
    if (mode === 'div' && b.re === 0 && b.im === 0) b = { re: 1, im: 0 };
    const w = arith(mode, a, b);
    const op = mode === 'add' ? '+' : mode === 'sub' ? '-' : mode === 'mul' ? '\\cdot' : '/';
    const prompt = mode === 'div'
      ? `Write $(${fmtCart(a.re, a.im)}) / (${fmtCart(b.re, b.im)})$ in the form $a+bi$.`
      : `Write $(${fmtCart(a.re, a.im)}) ${op} (${fmtCart(b.re, b.im)})$ in the form $a+bi$.`;
    let answer;
    let accept;
    if (mode === 'div') {
      answer = fmtParts(w.reN, w.imN, w.d);
      const whole = w.d !== 0 && w.reN % w.d === 0 && w.imN % w.d === 0;
      accept = [answer, fmtCart(w.re, w.im)];
      if (!whole) accept.push(`(${fmtInt(w.reN, w.imN)})/${w.d}`);
    } else {
      answer = fmtCart(w.re, w.im);
      accept = [answer];
    }
    return {
      prompt,
      steps: [step(`The ${word(mode)} is ___`, answer, accept, citeWhy(mode), { re: w.re, im: w.im })],
    };
  }
  if (mode === 'mod') {
    const t = TRIPLES[irand(next, 0, TRIPLES.length - 1)];
    const swap = next() < 0.5;
    let x = swap ? t[1] : t[0];
    let y = swap ? t[0] : t[1];
    if (next() < 0.5) x = -x;
    if (next() < 0.5) y = -y;
    if (x === 0 || y === 0) { x = t[0]; y = t[1]; }
    const answer = String(t[2]);
    return {
      prompt: `Find $|${fmtCart(x, y)}|$.`,
      steps: [step('The modulus is ___', answer, [answer], 'Definition 1.8, page 17: $\\sqrt{x^2+y^2}$.', { real: t[2] })],
    };
  }
  if (mode === 'arg' || mode === 'polar') {
    const spot = EXACT[irand(next, 0, EXACT.length - 1)];
    const k = irand(next, 1, 3);
    const re = spot.re * k;
    const im = spot.im * k;
    const ang = angleTex(spot.p, spot.q);
    const theta = (spot.p / spot.q) * PI;
    const r = rTex(re, im);
    if (mode === 'arg') {
      return {
        prompt: `Find $\\operatorname{Arg}(${fmtCart(re, im)})$, in $(-\\pi,\\pi]$.`,
        steps: [step('The argument is ___', ang, [ang, ang.replace(/\\/g, '')], 'Definition 1.11, page 23. The angle is measured from the positive real axis.', { angle: theta })],
      };
    }
    const form = r.tex === '1' && theta !== 0 ? `e^{i${ang.startsWith('-') ? `(${ang})` : ang}}` : (theta === 0 ? r.tex : `${r.tex}\\,e^{i${ang.startsWith('-') ? `(${ang})` : ang}}`);
    return {
      prompt: `Write $${fmtCart(re, im)}$ in polar form $re^{i\\theta}$.`,
      steps: [
        step('The modulus is ___', r.tex, r.accept, 'Definition 1.8, page 17.', { real: r.real }),
        step('The argument is ___', ang, [ang], 'Definition 1.11, page 23.', { angle: theta }),
        step('The polar form is ___', form, [form, `${r.tex}e^{i${ang}}`, `${r.tex} cis ${ang}`], 'Definition 1.9, page 22, is $r(\\cos\\theta+i\\sin\\theta)$, and Euler writes that as $re^{i\\theta}$.', null),
      ],
    };
  }
  throw new Error(`ch1-arithmetic: unknown mode "${mode}"`);
}

export function normMath(raw) {
  let s = String(raw == null ? '' : raw).trim().toLowerCase();
  s = s.replace(/\u2212/g, '-').replace(/\u03c0/g, 'pi').replace(/\$/g, '');
  s = s.replace(/\\frac\s*\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)');
  s = s.replace(/\\left|\\right|\\,|\\!|\\;|\\:/g, '');
  s = s.replace(/\\operatorname\{arg\}|\\arg/g, 'arg');
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\\cdot|\\times|\*/g, '');
  s = s.replace(/\s+/g, '');
  return s;
}

function splitDiv(s) {
  let depth = 0;
  let at = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (c === '/' && depth === 0) {
      if (at >= 0) return null;
      at = i;
    }
  }
  if (at <= 0 || at === s.length - 1) return null;
  return [s.slice(0, at), s.slice(at + 1)];
}

function parseReal(s) {
  if (s == null) return null;
  let t = String(s).trim();
  if (t === '') return null;
  if (t[0] === '+') return parseReal(t.slice(1));
  if (t[0] === '-' && t.length > 1) {
    const rest = parseReal(t.slice(1));
    if (rest != null) return -rest;
  }
  const div = splitDiv(t);
  if (div) {
    const n = parseReal(div[0]);
    const d = parseReal(div[1]);
    if (n == null || d == null || d === 0) return null;
    return n / d;
  }
  if (t === 'pi') return PI;
  if (t === '-pi') return -PI;
  const signed = t.match(/^(-?)(\d*)pi(?:\/(\d+))?$/);
  if (signed && (signed[2] !== '' || t.includes('pi'))) {
    const n = signed[2] === '' ? 1 : Number(signed[2]);
    const d = signed[3] ? Number(signed[3]) : 1;
    return (signed[1] ? -1 : 1) * n * PI / d;
  }
  const sq = t.match(/^(-?)(\d+)?sqrt\((\d+)\)$/);
  if (sq) {
    const k = sq[2] ? Number(sq[2]) : 1;
    return (sq[1] ? -1 : 1) * k * Math.sqrt(Number(sq[3]));
  }
  const paren = t.match(/^\((.+)\)$/);
  if (paren) return parseReal(paren[1]);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return null;
}

function imagCoef(term) {
  const lead = term.match(/^([+-])?i\/(.+)$/);
  if (lead) {
    const d = parseReal(lead[2]);
    if (d == null || d === 0) return null;
    return (lead[1] === '-' ? -1 : 1) / d;
  }
  const coef = term.replace('i', '');
  if (coef === '' || coef === '+') return 1;
  if (coef === '-') return -1;
  return parseReal(coef);
}

function splitTerms(s) {
  const terms = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    if (depth === 0 && (c === '+' || c === '-') && cur !== '' && cur !== '(') {
      terms.push(cur);
      cur = c;
    } else cur += c;
  }
  if (cur) terms.push(cur);
  return terms;
}

export function parseComplex(raw) {
  let s = normMath(raw).replace(/\\/g, '');
  if (!s) return null;
  const over = s.match(/^\((.+)\)\/(-?\d+)$/);
  if (over) {
    const inner = parseComplex(over[1]);
    const d = Number(over[2]);
    if (!inner || !d) return null;
    return { re: inner.re / d, im: inner.im / d };
  }
  if (!s.includes('i')) {
    const re = parseReal(s);
    return re == null ? null : { re, im: 0 };
  }
  const terms = splitTerms(s);
  let re = 0;
  let im = 0;
  for (const term of terms) {
    if (term.includes('i')) {
      const v = imagCoef(term);
      if (v == null) return null;
      im += v;
    } else {
      const v = parseReal(term);
      if (v == null) return null;
      re += v;
    }
  }
  return { re, im };
}

function close(a, b) {
  return Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(b));
}

export function matches(input, spec) {
  if (!spec) return false;
  const got = normMath(input);
  if (!got) return false;
  const want = [spec.answer, ...(spec.accept || [])];
  if (want.some((item) => item && normMath(item) === got)) return true;
  const v = spec.value;
  if (!v) return false;
  if (typeof v.real === 'number') {
    const n = parseReal(got.replace(/\\/g, ''));
    return n != null && close(n, v.real);
  }
  if (typeof v.angle === 'number') {
    const n = parseReal(got.replace(/\\/g, ''));
    // Definition 1.11, page 23: Arg is the one value in (−π, π]. A 2π shift is a different name.
    if (n == null) return false;
    return Math.abs(n - v.angle) <= 1e-3;
  }
  if (typeof v.re === 'number' && typeof v.im === 'number') {
    const z = parseComplex(input);
    return !!z && close(z.re, v.re) && close(z.im, v.im);
  }
  return false;
}
