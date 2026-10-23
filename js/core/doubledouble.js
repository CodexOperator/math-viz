// Two doubles, one number. About 31 decimal digits.
//
// A pixel at width 1e-20 cannot be added to a centre near 0.25 in one double:
// the sum is the centre again. The low word keeps the difference. Past width
// 1e-28 even this pair runs out, and the picture says so.

const SPLIT = 134217729; // 2^27 + 1

export function fromDouble(x) {
  if (!Number.isFinite(x)) return { hi: 0, lo: 0 };
  return { hi: x, lo: 0 };
}

export function twoSum(a, b) {
  const s = a + b;
  const v = s - a;
  return { hi: s, lo: (a - (s - v)) + (b - v) };
}

export function quickTwoSum(a, b) {
  const s = a + b;
  return { hi: s, lo: b - (s - a) };
}

function split(a) {
  const c = SPLIT * a;
  const hi = c - (c - a);
  return { hi, lo: a - hi };
}

export function twoProd(a, b) {
  const p = a * b;
  const aa = split(a);
  const bb = split(b);
  const lo = ((aa.hi * bb.hi - p) + aa.hi * bb.lo + aa.lo * bb.hi) + aa.lo * bb.lo;
  return { hi: p, lo };
}

export function ddAdd(a, b) {
  const s = twoSum(a.hi, b.hi);
  const t = twoSum(a.lo, b.lo);
  const c = quickTwoSum(s.hi, s.lo + t.hi);
  return quickTwoSum(c.hi, c.lo + t.lo);
}

export function ddSub(a, b) {
  return ddAdd(a, { hi: -b.hi, lo: -b.lo });
}

export function ddMul(a, b) {
  const p = twoProd(a.hi, b.hi);
  return quickTwoSum(p.hi, p.lo + a.hi * b.lo + a.lo * b.hi);
}

export function ddSqr(a) {
  return ddMul(a, a);
}

export function ddDiv(a, b) {
  const q1 = a.hi / b.hi;
  const r = ddSub(a, ddMul(b, fromDouble(q1)));
  return quickTwoSum(q1, (r.hi + r.lo) / b.hi);
}

export function ddAbs(a) {
  if (a.hi < 0 || (a.hi === 0 && a.lo < 0)) return { hi: -a.hi, lo: -a.lo };
  return { hi: a.hi, lo: a.lo };
}

export function ddPow10(n) {
  const e = n | 0;
  if (e === 0) return fromDouble(1);
  const neg = e < 0;
  let k = Math.abs(e);
  let r = fromDouble(1);
  let b = fromDouble(10);
  while (k > 0) {
    if (k & 1) r = ddMul(r, b);
    k >>= 1;
    if (k) b = ddMul(b, b);
  }
  return neg ? ddDiv(fromDouble(1), r) : r;
}

// A decimal the learner typed, including digits past one double.
export function ddFromDecimal(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim().replace(/\u2212/g, '-').replace(/^\+/, '');
  const m = /^(-)?(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(s);
  if (!m) return null;
  const frac = m[3] || '';
  const exp = (m[4] ? parseInt(m[4], 10) : 0) - frac.length;
  if (!Number.isFinite(exp) || Math.abs(exp) > 400) return null;
  const digits = (m[2] + frac).replace(/^0+/, '') || '0';
  if (digits.length > 40) return null;
  let acc = fromDouble(0);
  for (let i = 0; i < digits.length; i++) {
    acc = ddMul(acc, fromDouble(10));
    acc = ddAdd(acc, fromDouble(digits.charCodeAt(i) - 48));
  }
  acc = ddMul(acc, ddPow10(exp));
  if (m[1]) acc = { hi: -acc.hi, lo: -acc.lo };
  if (!Number.isFinite(acc.hi) || !Number.isFinite(acc.lo)) return null;
  return acc;
}

// digits after the leading figure, enough to show a centre at a tiny width.
export function ddToDecimal(a, digits = 16) {
  if (!a || !Number.isFinite(a.hi)) return '';
  if (a.hi === 0 && a.lo === 0) return '0';
  const sign = a.hi < 0 || (a.hi === 0 && a.lo < 0) ? '-' : '';
  let x = ddAbs(a);
  let exp = Math.floor(Math.log10(Math.abs(x.hi)));
  if (!Number.isFinite(exp)) return '0';
  let y = ddMul(x, ddPow10(-exp));
  // Keep the significand in [1, 10).
  if (y.hi >= 10) { y = ddMul(y, fromDouble(0.1)); exp += 1; }
  if (y.hi < 1) { y = ddMul(y, fromDouble(10)); exp -= 1; }
  const n = Math.max(1, Math.min(32, digits | 0));
  const chars = [];
  for (let i = 0; i < n + 1; i++) {
    let d = Math.floor(y.hi + 1e-10);
    if (d > 9) d = 9;
    if (d < 0) d = 0;
    chars.push(d);
    y = ddMul(ddSub(y, fromDouble(d)), fromDouble(10));
  }
  const roundUp = chars[n] >= 5;
  chars.length = n;
  if (roundUp) {
    for (let i = chars.length - 1; i >= 0; i--) {
      chars[i] += 1;
      if (chars[i] < 10) break;
      chars[i] = 0;
      if (i === 0) { chars.unshift(1); exp += 1; }
    }
  }
  let body = String(chars[0] || 0);
  const rest = chars.slice(1).join('').replace(/0+$/, '');
  if (rest) body += '.' + rest;
  if (exp === 0) return sign + body;
  if (exp > 0 && exp < 6) {
    // plain digits when the number is ordinary
    const plain = ddToFixed(a, Math.min(12, n));
    if (plain) return plain;
  }
  return sign + body + 'e' + (exp < 0 ? '' : '+') + exp;
}

export function ddToFixed(a, digits = 6) {
  if (!a || !Number.isFinite(a.hi)) return '';
  const n = Math.max(0, Math.min(24, digits | 0));
  const scale = ddPow10(n);
  const y = ddMul(a, scale);
  let r = Math.round(y.hi + y.lo);
  if (!Number.isFinite(r)) return '';
  const sign = r < 0 ? '-' : '';
  r = Math.abs(r);
  let s = String(r).padStart(n + 1, '0');
  if (n === 0) return sign + s;
  s = s.slice(0, -n) + '.' + s.slice(-n);
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return sign + s;
}

export function ddEq(a, b, tolHi = 0, tolLo = 0) {
  return Math.abs(a.hi - b.hi) <= tolHi && Math.abs(a.lo - b.lo) <= tolLo;
}
