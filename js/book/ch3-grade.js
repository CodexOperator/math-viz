// Exam-form checker for Chapter 3 blanks. Spaces and the order of a sum do not
// matter. A product of factors can be written in either order. A chain of
// equalities can be written with the sides swapped. A star is juxtaposition,
// except between two digits, where it keeps the exponent from gluing to the
// next factor: (z^2-iz+9)^4*5 is the same product as 5(z^2-iz+9)^4.

const DOT = '\u00b7';

function canon(s) {
  const raw = String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[−–]/g, '-')
    .replace(/θ/g, 'theta')
    .replace(/\\theta/g, 'theta')
    .replace(/\\cos/g, 'cos')
    .replace(/\\sin/g, 'sin')
    .replace(/\(theta\)/g, 'theta')
    .replace(/\s+/g, '')
    .replace(/\\,/g, '')
    .replace(/\\(left|right)/g, '')
    .replace(/[{}]/g, '')
    .replace(/_/g, '');
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    if (c !== '*') {
      out += c;
      continue;
    }
    const prev = out[out.length - 1];
    const next = raw[i + 1];
    if (prev && /[0-9]/.test(prev) && next && /[0-9]/.test(next)) out += DOT;
  }
  // Drop the point on a partial, so u_x(x_0, y_0) matches u_x. Leave C(x)
  // alone: on the conjugate, C(x) is still a function and C is a constant.
  return out.replace(/([uv](?:x|y)?)\((?:x0|y0|x|y|z0|z)(?:,(?:x0|y0|x|y))*\)/g, '$1');
}

function splitSum(s) {
  const terms = [];
  let depth = 0;
  let sign = '+';
  let buf = '';
  function flush() {
    if (!buf) return;
    const body = buf;
    buf = '';
    terms.push(sign === '-' ? `-${body}` : body);
    sign = '+';
  }
  for (const c of s) {
    if (c === '(') {
      depth += 1;
      buf += c;
    } else if (c === ')') {
      depth = Math.max(0, depth - 1);
      buf += c;
    } else if (depth === 0 && (c === '+' || c === '-') && buf) {
      flush();
      sign = c;
    } else if (depth === 0 && (c === '+' || c === '-') && !buf) {
      sign = c === '-' ? '-' : '+';
    } else {
      buf += c;
    }
  }
  flush();
  return terms;
}

function sumKey(s) {
  const terms = splitSum(s);
  if (terms.length < 2) return null;
  return terms.map((t) => (t.startsWith('-') ? t : `+${t}`)).sort().join('&');
}

function eqKey(s) {
  if (!s.includes('=')) return null;
  const parts = s.split('=').filter(Boolean);
  if (parts.length < 2) return null;
  return parts.map((p) => sumKey(p) || p).sort().join('=');
}

function partKey(part) {
  const labeled = part.match(/^(u|v)=(.+)$/);
  const body = labeled ? labeled[2] : part;
  return eqKey(body) || sumKey(body) || body;
}

function andParts(s) {
  if (!s.includes('and')) return null;
  return s.split('and').map(partKey);
}

// Two equations joined by "and" are a set: either order is the same system.
// Two expressions joined by "and" keep the order the sentence asked for.
// ∂x/∂θ and ∂y/∂θ are not the same pair written backwards.
function andKey(s) {
  const parts = andParts(s);
  if (!parts) return null;
  return parts.join('&&');
}

function andKeySorted(s) {
  const parts = andParts(s);
  if (!parts) return null;
  return parts.slice().sort().join('&&');
}

function equationList(s) {
  return s.split('and').every((part) => part.includes('='));
}

function constValue(token) {
  let t = token;
  if (t.startsWith('(') && t.endsWith(')')) t = t.slice(1, -1);
  if (t === 'i') return { re: 0, im: 1 };
  if (t === '-i') return { re: 0, im: -1 };
  if (/^-?\d+$/.test(t)) return { re: Number(t), im: 0 };
  const m = t.match(/^(-?)(\d*)i$/);
  if (!m) return null;
  return { re: 0, im: (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2])) };
}

function constProduct(s) {
  const fac = factorKey(s);
  const parts = fac ? fac.split('*') : [s];
  let re = 1;
  let im = 0;
  for (const part of parts) {
    const v = constValue(part);
    if (!v) return null;
    const nr = re * v.re - im * v.im;
    const ni = re * v.im + im * v.re;
    re = nr;
    im = ni;
  }
  return `${re},${im}`;
}

function factorNorm(fac) {
  const wrapped = fac.match(/^\((.*)\)(\^[0-9]+)?$/);
  if (!wrapped) return fac;
  const inner = sumKey(wrapped[1]) || wrapped[1];
  return `(${inner})${wrapped[2] || ''}`;
}

function factorKey(s) {
  if (s.includes('and')) return null;
  const factors = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '(') {
      let depth = 1;
      let j = i + 1;
      while (j < s.length && depth) {
        if (s[j] === '(') depth += 1;
        else if (s[j] === ')') depth -= 1;
        j += 1;
      }
      let fac = s.slice(i, j);
      if (s[j] === '^') {
        let k = j + 1;
        while (k < s.length && /[0-9]/.test(s[k])) k += 1;
        fac += s.slice(j, k);
        j = k;
      }
      factors.push(factorNorm(fac));
      i = j;
    } else if (s[i] === DOT) {
      i += 1;
    } else {
      let j = i + 1;
      while (j < s.length && s[j] !== '(' && s[j] !== DOT) j += 1;
      const chunk = s.slice(i, j);
      if (chunk) factors.push(chunk);
      i = j;
    }
  }
  if (factors.length < 2) return null;
  return factors.sort().join('*');
}

function cnum(re, im) {
  return { re, im };
}

function polyAdd(a, b) {
  const out = new Map(a);
  for (const [d, c] of b) {
    const prev = out.get(d) || cnum(0, 0);
    const re = prev.re + c.re;
    const im = prev.im + c.im;
    if (re === 0 && im === 0) out.delete(d);
    else out.set(d, cnum(re, im));
  }
  return out;
}

function polyScale(poly, s) {
  if (s === 1) return poly;
  const out = new Map();
  for (const [d, c] of poly) {
    const re = c.re * s;
    const im = c.im * s;
    if (re || im) out.set(d, cnum(re, im));
  }
  return out;
}

function polyMul(a, b) {
  const out = new Map();
  for (const [d1, c1] of a) {
    for (const [d2, c2] of b) {
      const d = d1 + d2;
      if (d > 16) return null;
      const prev = out.get(d) || cnum(0, 0);
      const re = prev.re + c1.re * c2.re - c1.im * c2.im;
      const im = prev.im + c1.re * c2.im + c1.im * c2.re;
      if (re === 0 && im === 0) out.delete(d);
      else out.set(d, cnum(re, im));
    }
  }
  return out;
}

function polyPow(poly, n) {
  if (n === 0) return new Map([[0, cnum(1, 0)]]);
  let out = new Map([[0, cnum(1, 0)]]);
  let base = poly;
  let e = n;
  while (e) {
    if (e & 1) {
      out = polyMul(out, base);
      if (!out) return null;
    }
    e >>= 1;
    if (e) {
      base = polyMul(base, base);
      if (!base) return null;
    }
  }
  return out;
}

function polyKeyOf(poly) {
  const degs = [...poly.keys()].sort((a, b) => a - b);
  if (!degs.length) return '0';
  return degs.map((d) => {
    const c = poly.get(d);
    return `${d}:${c.re},${c.im}`;
  }).join('|');
}

// A polynomial in z with Gaussian-integer coefficients. -(i-2z) and 2z-i
// are the same value. Letters other than i and z, and a huge power, do not parse.
function polyKey(s) {
  const parsed = parseExpr(s, 0);
  if (!parsed || parsed.i !== s.length || !parsed.poly) return null;
  return polyKeyOf(parsed.poly);
}

function parseDigits(s, i) {
  let j = i;
  while (j < s.length && s.charCodeAt(j) >= 48 && s.charCodeAt(j) <= 57) j += 1;
  if (j === i) return null;
  return { n: Number(s.slice(i, j)), i: j };
}

function parsePow(s, i) {
  if (s[i] !== '^') return { n: 1, i };
  const num = parseDigits(s, i + 1);
  if (!num || num.n > 8) return null;
  return { n: num.n, i: num.i };
}

function factorStart(s, i) {
  const c = s[i];
  return c === '(' || c === 'i' || c === 'z' || (c >= '0' && c <= '9');
}

function parseFactor(s, i) {
  const c = s[i];
  if (c >= '0' && c <= '9') {
    const num = parseDigits(s, i);
    return { poly: new Map([[0, cnum(num.n, 0)]]), i: num.i };
  }
  if (c === 'i') return { poly: new Map([[0, cnum(0, 1)]]), i: i + 1 };
  if (c === 'z') {
    const pow = parsePow(s, i + 1);
    if (!pow) return null;
    return { poly: new Map([[pow.n, cnum(1, 0)]]), i: pow.i };
  }
  if (c === '(') {
    const inner = parseExpr(s, i + 1);
    if (!inner || s[inner.i] !== ')') return null;
    const pow = parsePow(s, inner.i + 1);
    if (!pow) return null;
    const poly = polyPow(inner.poly, pow.n);
    if (!poly) return null;
    return { poly, i: pow.i };
  }
  return null;
}

function parseTerm(s, i) {
  const first = parseFactor(s, i);
  if (!first) return null;
  let poly = first.poly;
  i = first.i;
  while (factorStart(s, i)) {
    const next = parseFactor(s, i);
    if (!next) return null;
    poly = polyMul(poly, next.poly);
    if (!poly) return null;
    i = next.i;
  }
  return { poly, i };
}

function parseExpr(s, i) {
  let sign = 1;
  if (s[i] === '+') i += 1;
  else if (s[i] === '-') {
    sign = -1;
    i += 1;
  }
  const first = parseTerm(s, i);
  if (!first) return null;
  let poly = polyScale(first.poly, sign);
  i = first.i;
  while (s[i] === '+' || s[i] === '-') {
    const nextSign = s[i] === '-' ? -1 : 1;
    const term = parseTerm(s, i + 1);
    if (!term) return null;
    poly = polyAdd(poly, polyScale(term.poly, nextSign));
    i = term.i;
  }
  return { poly, i };
}

function same(a, b) {
  const left = canon(a);
  const right = canon(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const eqL = eqKey(left);
  const eqR = eqKey(right);
  if (eqL && eqL === eqR) return true;
  const sumL = sumKey(left);
  const sumR = sumKey(right);
  if (sumL && sumL === sumR) return true;
  const andL = andKey(left);
  const andR = andKey(right);
  if (andL && andL === andR) return true;
  if (andL && andR && equationList(left) && equationList(right) && andKeySorted(left) === andKeySorted(right)) return true;
  const facL = factorKey(left);
  const facR = factorKey(right);
  if (facL && facL === facR) return true;
  const cL = constProduct(left);
  const cR = constProduct(right);
  if (cL && cL === cR) return true;
  const pL = polyKey(left);
  const pR = polyKey(right);
  return !!(pL && pL === pR);
}

export function answersMatch(answer, accept, given) {
  const wants = [answer, ...(accept || [])];
  return wants.some((want) => same(want, given));
}
