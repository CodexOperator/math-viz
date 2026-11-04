// Answer checking for practice steps.
// Equivalence is whitespace, light TeX, and exact numeric agreement.
// A symbolic exponential stays symbolic: e^{2} matches \exp(2), not 7.389.

const SPACING = /\\(?:left|right|displaystyle|textstyle|bigl|bigr|Bigl|Bigr|,|;|:|!| |quad|qquad)/g;
const FRAC = /\\(?:dfrac|tfrac|frac)\s*\{([^{}]*)\}\{([^{}]*)\}/g;

export function canon(value) {
  let t = String(value == null ? '' : value).trim();
  if (!t) return '';
  t = t.replace(/^\$(.*)\$$/s, '$1').trim();
  t = t.replace(/^\\\((.*)\\\)$/s, '$1').trim();
  t = t.replace(/^\\\[(.*)\\\]$/s, '$1').trim();
  t = t.replace(/[−–]/g, '-');
  t = t.replace(/π/g, '\\pi');
  t = t.replace(SPACING, '');
  t = t.replace(/\\,/g, '');
  for (let i = 0; i < 6; i++) {
    const next = t.replace(FRAC, '($1)/($2)');
    if (next === t) break;
    t = next;
  }
  t = t.replace(/\\exp/g, 'exp');
  t = t.replace(/e\^\{([^{}]+)\}/g, 'exp($1)');
  t = t.replace(/e\^([A-Za-z0-9]+)/g, 'exp($1)');
  t = t.replace(/\\sqrt\{(\d+)\}/g, (_, n) => {
    const r = Math.sqrt(Number(n));
    return Number.isInteger(r) ? String(r) : `sqrt(${n})`;
  });
  t = t.replace(/\\operatorname\{([^{}]+)\}/g, '$1');
  t = t.replace(/\\(?:cdot|times)/g, '*');
  t = t.replace(/\\pi/g, 'pi');
  t = t.replace(/\\geq|\\ge/g, '>=');
  t = t.replace(/\\leq|\\le/g, '<=');
  t = t.replace(/\\infty/g, 'infinity');
  t = t.replace(/[{}]/g, '');
  t = t.replace(/\s+/g, '');
  t = t.toLowerCase();
  // (pi)/(4) and (3)/(2) lose their parentheses. A numerator with a plus stays grouped.
  t = t.replace(/\((-?[a-z0-9]+)\)\/\((-?[a-z0-9]+)\)/g, '$1/$2');
  t = t.replace(/\+\+/g, '+');
  return t;
}

function insertMul(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const prev = out[out.length - 1];
    if (prev && /[0-9)iπ]/.test(prev) && /[iπ(]/.test(c)) out += '*';
    out += c;
  }
  return out;
}

// A complex value, or null when the string is not a plain complex expression.
export function parseComplex(value) {
  let s = canon(value);
  if (!s) return null;
  if (s.includes('exp') || s.includes('infinity')) return null;
  s = s.replace(/pi/g, 'π');
  if (!/^[0-9+\-*/().iπ]+$/.test(s)) return null;
  s = insertMul(s);
  let i = 0;
  function peek() { return s[i]; }
  function eat(ch) {
    if (s[i] !== ch) throw new Error('eat');
    i += 1;
  }
  function parseExpr() {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = peek();
      i += 1;
      const r = parseTerm();
      v = op === '+' ? add(v, r) : sub(v, r);
    }
    return v;
  }
  function parseTerm() {
    let v = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = peek();
      i += 1;
      const r = parseFactor();
      if (op === '*') v = mul(v, r);
      else {
        const den = r.re * r.re + r.im * r.im;
        if (den === 0) throw new Error('zero');
        v = mul(v, { re: r.re / den, im: -r.im / den });
      }
    }
    return v;
  }
  function parseFactor() {
    if (peek() === '+') { i += 1; return parseFactor(); }
    if (peek() === '-') { i += 1; return scale(parseFactor(), -1); }
    if (peek() === '(') {
      eat('(');
      const v = parseExpr();
      eat(')');
      return v;
    }
    if (peek() === 'i') { i += 1; return { re: 0, im: 1 }; }
    if (peek() === 'π') { i += 1; return { re: Math.PI, im: 0 }; }
    const start = i;
    if (peek() && /[0-9.]/.test(peek())) {
      i += 1;
      while (peek() && /[0-9.]/.test(peek())) i += 1;
      const n = Number(s.slice(start, i));
      if (!Number.isFinite(n)) throw new Error('num');
      return { re: n, im: 0 };
    }
    throw new Error('token');
  }
  try {
    const v = parseExpr();
    if (i !== s.length) return null;
    if (!Number.isFinite(v.re) || !Number.isFinite(v.im)) return null;
    return v;
  } catch {
    return null;
  }
}

function add(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
function sub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
function scale(a, k) { return { re: a.re * k, im: a.im * k }; }
function mul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function closeComplex(a, b) {
  return Math.abs(a.re - b.re) <= 1e-6 && Math.abs(a.im - b.im) <= 1e-6;
}

export function answersMatch(input, expected, accept) {
  const got = canon(input);
  if (!got) return false;
  const opts = [expected];
  if (Array.isArray(accept)) opts.push(...accept);
  const gotN = parseComplex(got);
  for (const opt of opts) {
    const want = canon(opt);
    if (!want) continue;
    if (got === want) return true;
    if (gotN) {
      const wantN = parseComplex(want);
      if (wantN && closeComplex(gotN, wantN)) return true;
    }
  }
  return false;
}
