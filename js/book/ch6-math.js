// Chapter 6 arithmetic. Answers are computed here. The pictures and the
// practice generators both call these functions. No DOM.

const PI = Math.PI;
const TWO_PI = 2 * PI;

export function mulberry32(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function irand(rng, lo, hi) {
  const a = Math.ceil(Number(lo));
  const b = Math.floor(Number(hi));
  if (b < a) return a;
  return a + Math.floor(rng() * (b - a + 1));
}

function rgcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

export function rat(n, d = 1) {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) return null;
  let nn = n;
  let dd = d;
  if (dd < 0) { nn = -nn; dd = -dd; }
  const g = rgcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

function radd(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
function rsub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
function rmul(a, b) { return rat(a.n * b.n, a.d * b.d); }
function rdiv(a, b) { return rat(a.n * b.d, a.d * b.n); }

function C(re, im = 0) { return { re: rat(re, 1), im: rat(im, 1) }; }
function cadd(a, b) { return { re: radd(a.re, b.re), im: radd(a.im, b.im) }; }
function csub(a, b) { return { re: rsub(a.re, b.re), im: rsub(a.im, b.im) }; }
function cmul(a, b) {
  return {
    re: rsub(rmul(a.re, b.re), rmul(a.im, b.im)),
    im: radd(rmul(a.re, b.im), rmul(a.im, b.re)),
  };
}
function cdiv(a, b) {
  const den = radd(rmul(b.re, b.re), rmul(b.im, b.im));
  return {
    re: rdiv(radd(rmul(a.re, b.re), rmul(a.im, b.im)), den),
    im: rdiv(rsub(rmul(a.im, b.re), rmul(a.re, b.im)), den),
  };
}
function cpow(z, n) {
  if (n === 0) return C(1, 0);
  if (n < 0) return cpow(cdiv(C(1, 0), z), -n);
  let r = C(1, 0);
  for (let i = 0; i < n; i++) r = cmul(r, z);
  return r;
}
function cscale(z, k) { return { re: rmul(z.re, k), im: rmul(z.im, k) }; }

function rtex(q) {
  if (!q) return '0';
  if (q.d === 1) return String(q.n);
  return `${q.n}/${q.d}`;
}

function imBody(q) {
  const absN = Math.abs(q.n);
  if (q.d === 1 && absN === 1) return 'i';
  if (q.d === 1) return `${absN}i`;
  return `(${absN}/${q.d})i`;
}

export function ctex(z) {
  if (!z) return '0';
  const re0 = z.re.n === 0;
  const im0 = z.im.n === 0;
  if (re0 && im0) return '0';
  const signedIm = z.im.n < 0 ? `-${imBody(z.im)}` : imBody(z.im);
  if (re0) return signedIm;
  if (im0) return rtex(z.re);
  return `${rtex(z.re)}${z.im.n < 0 ? '' : '+'}${signedIm}`;
}

export function cnum(z) {
  return { re: z.re.n / z.re.d, im: z.im.n / z.im.d };
}

// Two written answers are the same complex value when both parse.
// A phrase that is not a value stays null, and the card compares text.
export function sameComplex(a, b) {
  const x = readComplex(a);
  const y = readComplex(b);
  if (!x || !y) return false;
  return Math.abs(x.re - y.re) < 1e-6 && Math.abs(x.im - y.im) < 1e-6;
}

function readComplex(src) {
  const s = prepComplex(src);
  if (!s) return null;
  const tokens = lexComplex(s);
  if (!tokens) return null;
  const parsed = parseComplex(tokens);
  return parsed && parsed.pos === tokens.length ? parsed.value : null;
}

function prepComplex(src) {
  let s = String(src || '');
  s = s.replace(/\\\(|\\\)/g, '').replace(/\$/g, '');
  s = s.replace(/\\,/g, '').replace(/\\ /g, '').replace(/\\!/g, '');
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
  s = s.replace(/\\exp/g, 'exp');
  s = s.replace(/\\pi/g, 'pi').replace(/π/g, 'pi');
  let prev;
  do {
    prev = s;
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  } while (s !== prev);
  s = liftExp(s, 'e^');
  if (s == null) return null;
  s = liftExp(s, 'exp^');
  if (s == null) return null;
  s = s.replace(/[{}]/g, '');
  return s;
}

function liftExp(s, head) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const at = s.indexOf(head, i);
    if (at < 0) return out + s.slice(i);
    out += s.slice(i, at);
    let j = at + head.length;
    while (j < s.length && /\s/.test(s[j])) j += 1;
    if (s[j] !== '{') {
      out += head;
      i = at + head.length;
      continue;
    }
    let depth = 0;
    const start = j;
    for (; j < s.length; j += 1) {
      if (s[j] === '{') depth += 1;
      else if (s[j] === '}') {
        depth -= 1;
        if (depth === 0) { j += 1; break; }
      }
    }
    if (depth !== 0) return null;
    out += `exp(${s.slice(start + 1, j - 1)})`;
    i = j;
  }
  return out;
}

function lexComplex(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if ('+-*/^()'.includes(c)) { tokens.push(c); i += 1; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j += 1;
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      const words = takeWords(s, i);
      if (!words) return null;
      tokens.push(...words.tokens);
      i = words.i;
      continue;
    }
    return null;
  }
  const withTimes = [];
  for (const tok of tokens) {
    const prevTok = withTimes[withTimes.length - 1];
    if (prevTok && juxtapose(prevTok, tok)) withTimes.push('*');
    withTimes.push(tok);
  }
  return withTimes;
}

function takeWords(s, i) {
  const tokens = [];
  while (i < s.length && /[a-zA-Z]/.test(s[i])) {
    const rest = s.slice(i).toLowerCase();
    const word = ['exp', 'pi', 'i', 'e'].find((name) => rest.startsWith(name));
    if (!word) return null;
    tokens.push(word);
    i += word.length;
  }
  return { tokens, i };
}

function juxtapose(left, right) {
  const atom = (t) => t === 'pi' || t === 'i' || t === 'e' || /^[0-9.]+$/.test(t);
  const leftOk = atom(left) || left === ')';
  const rightOk = atom(right) || right === '(' || right === 'exp';
  return leftOk && rightOk;
}

function parseComplex(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  function eat(t) {
    if (tokens[pos] !== t) return false;
    pos += 1;
    return true;
  }
  function expr() {
    let left = term();
    if (!left) return null;
    while (peek() === '+' || peek() === '-') {
      const op = tokens[pos];
      pos += 1;
      const right = term();
      if (!right) return null;
      left = op === '+'
        ? { re: left.re + right.re, im: left.im + right.im }
        : { re: left.re - right.re, im: left.im - right.im };
    }
    return left;
  }
  function term() {
    let left = factor();
    if (!left) return null;
    while (peek() === '*' || peek() === '/') {
      const op = tokens[pos];
      pos += 1;
      const right = factor();
      if (!right) return null;
      if (op === '*') left = { re: left.re * right.re - left.im * right.im, im: left.re * right.im + left.im * right.re };
      else {
        const d = right.re * right.re + right.im * right.im;
        if (d === 0) return null;
        left = { re: (left.re * right.re + left.im * right.im) / d, im: (left.im * right.re - left.re * right.im) / d };
      }
    }
    return left;
  }
  function factor() {
    if (eat('+')) return factor();
    if (eat('-')) {
      const v = factor();
      return v && { re: -v.re, im: -v.im };
    }
    let base = primary();
    if (!base) return null;
    if (eat('^')) {
      const expn = factor();
      if (!expn || Math.abs(expn.im) > 1e-9) return null;
      const n = Math.round(expn.re);
      if (Math.abs(n - expn.re) > 1e-9 || Math.abs(n) > 12) return null;
      let r = { re: 1, im: 0 };
      const steps = Math.abs(n);
      for (let k = 0; k < steps; k += 1) {
        const re = r.re * base.re - r.im * base.im;
        const im = r.re * base.im + r.im * base.re;
        r = { re, im };
      }
      if (n < 0) {
        const d = r.re * r.re + r.im * r.im;
        if (d === 0) return null;
        r = { re: r.re / d, im: -r.im / d };
      }
      base = r;
    }
    return base;
  }
  function primary() {
    const t = peek();
    if (t == null) return null;
    if (t === '(') {
      pos += 1;
      const v = expr();
      if (!v || !eat(')')) return null;
      return v;
    }
    if (t === 'exp') {
      pos += 1;
      if (!eat('(')) return null;
      const v = expr();
      if (!v || !eat(')')) return null;
      const e = Math.exp(v.re);
      return { re: e * Math.cos(v.im), im: e * Math.sin(v.im) };
    }
    if (t === 'e') {
      pos += 1;
      if (eat('^')) {
        const v = factor();
        if (!v) return null;
        const e = Math.exp(v.re);
        return { re: e * Math.cos(v.im), im: e * Math.sin(v.im) };
      }
      return { re: Math.E, im: 0 };
    }
    if (t === 'pi') { pos += 1; return { re: Math.PI, im: 0 }; }
    if (t === 'i') { pos += 1; return { re: 0, im: 1 }; }
    if (/^[0-9.]+$/.test(t)) {
      pos += 1;
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      return { re: n, im: 0 };
    }
    return null;
  }
  const value = expr();
  return value ? { value, pos } : null;
}

function fadd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
function fmul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function fpow(z, n) {
  if (n === 0) return { re: 1, im: 0 };
  if (n < 0) {
    const p = fpow(z, -n);
    const d = p.re * p.re + p.im * p.im;
    if (d === 0) return { re: NaN, im: NaN };
    return { re: p.re / d, im: -p.im / d };
  }
  let r = { re: 1, im: 0 };
  for (let i = 0; i < n; i++) r = fmul(r, z);
  return r;
}

// ∫_0^T e^{it} dt = sin T + i(1 − cos T).
export function realIntegral(T) {
  const t = Number(T) || 0;
  return { re: Math.sin(t), im: 1 - Math.cos(t) };
}

export function wrapTurn(T) {
  const t = Number(T) || 0;
  let u = t % TWO_PI;
  if (u < 0) u += TWO_PI;
  return u;
}

// The label is the value, not a wide angle. At 0.12 rad off π the integral is
// still about −0.12 + 1.99i, so that edge must not read 2i.
const TURN_TOL = 0.01;

// A thumb on the phone square, along the orange circle: about 44px of chord
// when the stage is ~284px. The half-turn line latches inside this window.
export const HALF_THUMB = 0.8;

export function nearHalfTurn(T) {
  const u = wrapTurn(T);
  return Math.abs(u - Math.PI) <= HALF_THUMB;
}

export function turnPhase(T) {
  const raw = Number(T) || 0;
  let u = raw % TWO_PI;
  if (u < 0) u += TWO_PI;
  // A completed turn lands on 2π. The positive real start, parameter 0, has not passed π.
  if (raw > Math.PI && u <= 1e-12) u = TWO_PI;
  const w = realIntegral(u);
  const passed = u > Math.PI;
  if (passed && Math.hypot(w.re, w.im) <= TURN_TOL) return 'full';
  if (!passed && Math.hypot(w.re, w.im) <= TURN_TOL) return 'start';
  if (Math.hypot(w.re, w.im - 2) <= TURN_TOL) return 'half';
  return 'move';
}

export function claim61(T) {
  const phase = turnPhase(T);
  const near = nearHalfTurn(T);
  // The full-turn value is the blank. The claim says where the point is.
  // Home is only after the parameter has passed π, so the start is not already home.
  if (phase === 'full') return { holds: true, phase, near, text: 'A full turn brings the point home.' };
  if (phase === 'start') return { holds: false, phase, near, text: 'The point is at the start.' };
  return { holds: false, phase, near, text: 'The total has left $0$.' };
}

// Example 6.6. Midpoint Riemann sum for exp along 0 to 2 + iπ/4, n = 8.
export const SEGMENT_END = Object.freeze({ re: 2, im: PI / 4 });

export function expC(z) {
  const e = Math.exp(z.re);
  return { re: e * Math.cos(z.im), im: e * Math.sin(z.im) };
}

export function riemannTerm(k) {
  const c = { re: (2 * k - 1) / 8, im: (PI * (2 * k - 1)) / 64 };
  const dz = { re: SEGMENT_END.re / 8, im: SEGMENT_END.im / 8 };
  return fmul(expC(c), dz);
}

export function riemannPartial(k) {
  const n = Math.max(0, Math.min(8, k | 0));
  let s = { re: 0, im: 0 };
  for (let i = 1; i <= n; i++) s = fadd(s, riemannTerm(i));
  return s;
}

export function exactSegmentExp() {
  return fadd(expC(SEGMENT_END), { re: -1, im: 0 });
}

export function fixed2(x) {
  const n = Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  return n.toFixed(2);
}

export function claim62(k) {
  const n = Math.max(0, Math.min(8, k | 0));
  const s = riemannPartial(n);
  const im = fixed2(s.im);
  const sum = Number(im) < 0 ? `${fixed2(s.re)}${im}i` : `${fixed2(s.re)}+${im}i`;
  if (n === 8) {
    return { holds: true, steps: 8, sum, text: 'Eight pieces are on the path. The exact value stays in the blank.' };
  }
  return { holds: false, steps: n, sum, text: `The sum has used ${n} of 8 steps.` };
}

// Green circle of radius 1, centre on the real axis. Purple circle stays at radius 2.
export const DEFORM_RADIUS = 1;
export const DEFORM_OUT = 1.55;

// Exactly on the circle the integral of 1/z is undefined. A hair inside is
// still 2πi. The old band was one pixel of this plane, so 0.99 read as "on it".
export const DEFORM_EDGE = 1e-6;

export function deformEdgeU() {
  return 1 - DEFORM_RADIUS / DEFORM_OUT;
}

export function deformState(cx) {
  const x = Number(cx);
  const d = Math.abs(x);
  if (Math.abs(d - DEFORM_RADIUS) <= DEFORM_EDGE) return 'edge';
  return d < DEFORM_RADIUS ? 'inside' : 'outside';
}

// Both circles are positively oriented and the integrand is 1/z.
// Inside: Corollary 6.1, page 188. Outside the green circle: Theorem 6.5, page 183.
export function claim63(cx) {
  const where = deformState(cx);
  if (where === 'inside') {
    return { holds: true, where, text: 'The pole of $1/z$ stays inside the green circle.' };
  }
  if (where === 'edge') {
    return { holds: false, where, text: 'The pole of $1/z$ is on the green circle. The integral over that circle is not defined.' };
  }
  return { holds: false, where, text: 'The green circle has dropped the pole of $1/z$. The purple circle still encloses it.' };
}

// Theorem 6.9. Ends fixed, integrand z, so every path gives the same value.
export const BEND_A = Object.freeze({ re: -1, im: -1 });
export const BEND_B = Object.freeze({ re: 3, im: 1 });
export const BEND_EDGE = 6.5 / 480;

export function bendValue() {
  return { re: 4, im: 2, tex: '4+2i' };
}

export function distToSegment(p, a, b) {
  const dx = b.re - a.re;
  const dy = b.im - a.im;
  const len2 = dx * dx + dy * dy;
  let t = ((p.re - a.re) * dx + (p.im - a.im) * dy) / len2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  return Math.hypot(p.re - (a.re + t * dx), p.im - (a.im + t * dy));
}

export function bendStraight(p) {
  return distToSegment(p, BEND_A, BEND_B) <= BEND_EDGE;
}

export function claim64(p) {
  if (bendStraight(p)) {
    return { holds: false, bent: false, text: 'The path is the straight segment. Bend the green point.' };
  }
  return { holds: true, bent: true, text: 'The path has bent. The integral is the same as on the straight segment.' };
}

// Theorem 6.10 for f(z)=z on the unit circle.
// Inside, the claim stops before the blank. The student writes the green point.
export const CAUCHY_EDGE = 3.4 / 480;

export function cauchyWhere(z) {
  const d = Math.hypot(z.re, z.im);
  if (Math.abs(d - 1) <= CAUCHY_EDGE) return 'edge';
  return d < 1 ? 'inside' : 'outside';
}

export function claim65(z) {
  const where = cauchyWhere(z);
  if (where === 'inside') {
    return { holds: true, where, text: 'Inside, the formula applies.' };
  }
  if (where === 'edge') {
    return { holds: false, where, text: 'The green point is on the circle. The formula stops.' };
  }
  return { holds: false, where, text: 'Outside, the formula does not apply.' };
}

// Liouville via Cauchy's estimate |f'| ≤ M/R with M = 1.
// One radius is one circle. holds is true only after every circle in the picture.
export const LIOUVILLE_M = 1;

export function liouvilleEstimate(radius) {
  const R = Math.max(0.4, Number(radius) || 0);
  return LIOUVILLE_M / R;
}

function boundFrac(n, d) {
  const g = rgcd(n, d);
  const nn = n / g;
  const dd = d / g;
  return dd === 1 ? String(nn) : `${nn}/${dd}`;
}

// A hundredth ceiling is a true upper bound and is looser than 1/R
// (|f'| ≤ 1.00 when the estimate is 1/1.006). Print the sharp quotient.
function sharpBound(R) {
  const target = 1 / R;
  let loN = 0;
  let loD = 1;
  let hiN = Math.max(1, Math.ceil(target));
  let hiD = 1;
  if (Math.abs(hiN / hiD - target) <= 1e-12) return boundFrac(hiN, hiD);
  for (let i = 0; i < 40; i++) {
    const n = loN + hiN;
    const d = loD + hiD;
    if (d > 20000) break;
    const v = n / d;
    if (Math.abs(v - target) <= 1e-10 * Math.max(1, target)) return boundFrac(n, d);
    if (v < target) {
      loN = n;
      loD = d;
    } else {
      hiN = n;
      hiD = d;
    }
  }
  return boundFrac(hiN, hiD);
}

export function liouvilleBoundTex(radius) {
  const R = Math.max(0.4, Number(radius) || 0);
  const quarters = Math.round(R * 4);
  if (Math.abs(R * 4 - quarters) < 1e-6 && quarters > 0) return boundFrac(4, quarters);
  const milli = Math.round(R * 1000);
  if (milli > 0 && Math.abs(R * 1000 - milli) < 1e-6 && 1000 / milli + 1e-12 >= 1 / R) {
    return boundFrac(1000, milli);
  }
  return sharpBound(R);
}

export function claim66(radius, every) {
  const R = Math.max(0.4, Number(radius) || 0);
  const bound = liouvilleBoundTex(R);
  if (every) {
    return {
      holds: true,
      collapsed: false,
      every: true,
      radius: R,
      text: 'The purple mark is still $1/R$ on this circle. These circles do not send the derivative to $0$.',
    };
  }
  return {
    holds: false,
    collapsed: false,
    every: false,
    radius: R,
    text: `On this circle $|f'|\\le ${bound}$. That is one circle.`,
  };
}

export function onSegment(pole, start, end) {
  const dx = end.re - start.re;
  const dy = end.im - start.im;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return pole.re === start.re && pole.im === start.im;
  const t = ((pole.re - start.re) * dx + (pole.im - start.im) * dy) / len2;
  if (t < -1e-9 || t > 1 + 1e-9) return false;
  const ox = start.re + t * dx - pole.re;
  const oy = start.im + t * dy - pole.im;
  return ox * ox + oy * oy <= 1e-12;
}

// ∫_start^end (z − pole)^n dz, n an integer other than a point on the segment.
// n = −1 uses the straight-segment logarithm. Every other n uses the antiderivative.
export function segmentIntegral(start, end, pole, n) {
  if (start.re === end.re && start.im === end.im) return null;
  // A non-negative power is a polynomial, so the sample point may lie on the segment.
  if (n < 0 && onSegment(pole, start, end)) return null;
  if (n === -1) {
    const u = { re: start.re - pole.re, im: start.im - pole.im };
    const v = { re: end.re - pole.re, im: end.im - pole.im };
    const ru = Math.hypot(u.re, u.im);
    const rv = Math.hypot(v.re, v.im);
    if (ru === 0 || rv === 0) return null;
    const cross = u.re * v.im - u.im * v.re;
    const dot = u.re * v.re + u.im * v.im;
    return { re: Math.log(rv) - Math.log(ru), im: Math.atan2(cross, dot), exact: false };
  }
  const a = csub(C(start.re, start.im), C(pole.re, pole.im));
  const b = csub(C(end.re, end.im), C(pole.re, pole.im));
  if (n < 0 && a.re.n === 0 && a.im.n === 0) return null;
  if (n < 0 && b.re.n === 0 && b.im.n === 0) return null;
  const k = rat(1, n + 1);
  const val = csub(cscale(cpow(b, n + 1), k), cscale(cpow(a, n + 1), k));
  const num = cnum(val);
  return { re: num.re, im: num.im, exact: true, tex: ctex(val) };
}

export function quadSegment(start, end, pole, n, N = 2400) {
  const dz = { re: (end.re - start.re) / N, im: (end.im - start.im) / N };
  let s = { re: 0, im: 0 };
  for (let k = 0; k < N; k++) {
    const t = (k + 0.5) / N;
    const z = {
      re: start.re + t * (end.re - start.re) - pole.re,
      im: start.im + t * (end.im - start.im) - pole.im,
    };
    const f = fpow(z, n);
    s = fadd(s, fmul(f, dz));
  }
  return s;
}

function hypotInt(re, im) {
  return Math.hypot(re, im);
}

function fmtPole(re, im) {
  if (re === 0 && im === 0) return '0';
  if (im === 0) return String(re);
  if (re === 0) return im === 1 ? 'i' : (im === -1 ? '-i' : `${im}i`);
  const imPart = im === 1 ? 'i' : (im === -1 ? '-i' : (im < 0 ? `${im}i` : `+${im === 1 ? '' : im}i`));
  if (im > 0) return `${re}+${im === 1 ? '' : im}i`;
  return `${re}${imPart}`;
}

function powerTex(poleRe, poleIm, n) {
  const base = (poleRe === 0 && poleIm === 0) ? 'z' : `(z-(${fmtPole(poleRe, poleIm)}))`;
  if (n === 1) return base === 'z' ? 'z' : base;
  return `${base}^{${n}}`;
}

export function circleIntegral(center, radius, pole, n) {
  const d = hypotInt(pole.re - center.re, pole.im - center.im);
  if (Math.abs(d - radius) < 1e-9) return null;
  const inside = d < radius;
  if (n === -1 && inside) return { re: 0, im: TWO_PI, tex: '2\\pi i', inside: true };
  return { re: 0, im: 0, tex: '0', inside };
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i += 1) r *= i;
  return r;
}

// Theorem 6.12 for f(z)=e^z: ∫ e^z/(z−z0)^{n+1} dz = 2πi e^{z0} / n!.
export function cifExpIntegral(order, z0) {
  const n = order | 0;
  const scale = Math.exp(z0) / factorial(n);
  const den = factorial(n);
  const g = rgcd(2, den);
  const num = 2 / g;
  const d = den / g;
  let tex = '\\pi i';
  if (z0 === 0) {
    if (d === 1) tex = num === 1 ? '\\pi i' : `${num}\\pi i`;
    else if (num === 1) tex = `\\frac{\\pi i}{${d}}`;
    else tex = `\\frac{${num}\\pi i}{${d}}`;
  } else {
    tex = `\\frac{2\\pi i\\, e^{${z0}}}{${den}}`;
  }
  return { re: 0, im: TWO_PI * scale, tex, order: n, z0 };
}

function circleLabel(center, radius) {
  if (center.re === 0 && center.im === 0) return `|z|=${radius}`;
  return `|z-(${fmtPole(center.re, center.im)})|=${radius}`;
}

function powerCard(center, radius, pole, n, value) {
  const integrand = powerTex(pole.re, pole.im, n);
  const lines = circleLines(n, value.inside, value.tex);
  return {
    prompt: `Let $C$ be the circle $${circleLabel(center, radius)}$, positively oriented.`,
    steps: [{
      text: `The integral of $${integrand}$ over $C$ equals ___.`,
      answer: `$${value.tex}$`,
      accept: value.tex === '0'
        ? ['0', '0+0i', '$0$']
        : ['2\\pi i', '2πi', '2pi i', '$2\\pi i$'],
      why: lines.why,
      miss: lines.miss,
    }],
    memory: 'Power $-1$ and the pole inside: $2\\pi i$. Any other integer power of $1/(z-a)$, or the pole outside: $0$.',
    cite: lines.cite,
    values: {
      kind: 'power', re: value.re, im: value.im, n, radius,
      cx: center.re, cy: center.im, ax: pole.re, ay: pole.im,
    },
  };
}

function circleLines(n, inside, tex) {
  if (n === -1 && inside) {
    return {
      cite: { ref: 'Corollary 6.1', page: 188 },
      miss: 'The pole is inside and the power is $-1$. Quote Corollary 6.1, page 188. The value stays covered.',
      why: `Corollary 6.1, page 188: the pole is inside and the power is $-1$, so the integral is $${tex}$.`,
    };
  }
  if (n < 0 && inside) {
    return {
      cite: { ref: 'Corollary 6.1', page: 188 },
      miss: 'The pole is inside, and the integer power is not $-1$. Corollary 6.1, page 188, is the result. The value stays covered.',
      why: `Corollary 6.1, page 188: $z_0$ is inside and the integer power is not $-1$, so the integral is $${tex}$.`,
    };
  }
  if (n >= 0) {
    return {
      cite: { ref: 'Theorem 6.5', page: 183 },
      miss: 'A non-negative power is entire. Theorem 6.5, page 183, applies to this circle. The value stays covered.',
      why: `A non-negative power is entire. Theorem 6.5, page 183, says the integral over this circle is $${tex}$.`,
    };
  }
  return {
    cite: { ref: 'Theorem 6.5', page: 183 },
    miss: 'The pole is outside the circle, so the integrand is analytic in a simply connected domain that contains this simple closed contour. Theorem 6.5, page 183, applies. The value stays covered.',
    why: `The pole is outside the circle. Theorem 6.5, page 183, says the integral is $${tex}$.`,
  };
}

function cifCard(order, radius) {
  const z0 = 0;
  const value = cifExpIntegral(order, z0);
  const power = order + 1;
  return {
    prompt: `Let $C$ be the circle $|z|=${radius}$, positively oriented, and let $f(z)=e^{z}$.`,
    steps: [{
      text: `The integral of $e^{z}/z^{${power}}$ over $C$ equals ___.`,
      answer: `$${value.tex}$`,
      accept: [value.tex, `$${value.tex}$`],
      miss: `The power in the denominator is ${power}, so $n=${order}$, and you divide by ${order}!. The value stays covered.`,
      why: `Theorem 6.12, page 199, equation (6.48), with $f(z)=e^{z}$ and $n=${order}$ gives $${value.tex}$.`,
    }],
    memory: 'Denominator power $n+1$: multiply $f^{(n)}(z_0)$ by $2\\pi i$ and divide by $n!$.',
    cite: { ref: 'Theorem 6.12', page: 199 },
    values: {
      kind: 'cif', re: value.re, im: value.im, n: -(order + 1), order,
      radius, cx: 0, cy: 0, ax: z0, ay: 0,
    },
  };
}

// Half the seeds are power −1 with the pole inside. A quarter use a higher
// denominator power, and that answer is the Theorem 6.12 value. The rest are 0.
export function generateCircle(seed, params) {
  const rng = mulberry32(seed);
  params = params || {};
  const rR = params.r || [1, 3];
  const cR = params.c || [-1, 1];
  const bucket = Math.abs(seed | 0) % 4;
  const center = { re: irand(rng, cR[0], cR[1]), im: irand(rng, cR[0], cR[1]) };
  let radius = irand(rng, rR[0], rR[1]);
  if (radius <= 0) radius = 1;
  if (bucket === 2) {
    const order = 1 + (Math.abs(seed | 0) % 3);
    return cifCard(order, Math.max(radius, 1));
  }
  if (bucket === 0 || bucket === 1) {
    const pole = { re: center.re, im: center.im };
    const value = circleIntegral(center, radius, pole, -1);
    return powerCard(center, radius, pole, -1, value);
  }
  if (Math.abs(seed | 0) % 8 === 3) {
    const n = -2 - (Math.abs(seed | 0) % 3);
    const pole = { re: center.re, im: center.im };
    const value = circleIntegral(center, radius, pole, n);
    return powerCard(center, radius, pole, n, value);
  }
  const pole = { re: center.re + radius + 1, im: center.im };
  const value = circleIntegral(center, radius, pole, -1);
  return powerCard(center, radius, pole, -1, value);
}

export function generateCif(seed) {
  const order = 1 + (Math.abs(seed | 0) % 3);
  const radius = 1 + (Math.abs(seed | 0) % 3);
  return cifCard(order, radius);
}

function cleanLog(start, end, pole) {
  const value = segmentIntegral(start, end, pole, -1);
  if (!value || Math.abs(value.re) > 1e-8) return null;
  const q = value.im / PI;
  for (let d = 1; d <= 4; d++) {
    const num = Math.round(q * d);
    if (Math.abs(num / d - q) > 1e-8) continue;
    if (num === 0) return { tex: '0', re: 0, im: 0 };
    const sign = num < 0 ? '-' : '';
    const p = Math.abs(num);
    const body = d === 1 ? `${sign}${p}\\pi i` : `${sign}\\frac{${p}\\pi}{${d}}i`;
    // p/d π i, and the fraction form already includes i at the end. For d=1, "π i".
    const tex = d === 1
      ? (p === 1 ? `${sign}\\pi i` : `${sign}${p}\\pi i`)
      : (p === 1 ? `${sign}\\frac{\\pi}{${d}}i` : body);
    return { tex, re: 0, im: value.im };
  }
  return null;
}

export function generateSegment(seed, params) {
  const rng = mulberry32(seed);
  params = params || {};
  const nR = params.n || [-3, 3];
  const box = params.box || [-2, 2];
  for (let guard = 0; guard < 50; guard++) {
    const n = irand(rng, nR[0], nR[1]);
    const start = { re: irand(rng, box[0], box[1]), im: irand(rng, box[0], box[1]) };
    const end = { re: irand(rng, box[0], box[1]), im: irand(rng, box[0], box[1]) };
    const pole = { re: irand(rng, box[0], box[1]), im: irand(rng, box[0], box[1]) };
    if (start.re === end.re && start.im === end.im) continue;
    if (n === -1) {
      const nice = cleanLog(start, end, pole);
      if (!nice) continue;
      return segmentCard(start, end, pole, n, nice.tex, nice);
    }
    const value = segmentIntegral(start, end, pole, n);
    if (!value || !value.exact) continue;
    return segmentCard(start, end, pole, n, value.tex, value);
  }
  const fallback = segmentIntegral({ re: 0, im: 0 }, { re: 1, im: 1 }, { re: 0, im: 0 }, 2);
  if (!fallback) {
    return segmentCard({ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 0, im: 0 }, 1, '1/2', { re: 0.5, im: 0 });
  }
  return segmentCard({ re: 0, im: 0 }, { re: 1, im: 1 }, { re: 0, im: 0 }, 2, fallback.tex, fallback);
}

function segmentCard(start, end, pole, n, tex, value) {
  const integrand = powerTex(pole.re, pole.im, n);
  const why = n === -1
    ? 'On a straight segment the integral of $1/(z-a)$ is the change in $\\log|z-a|$ plus $i$ times the change in argument.'
    : `Theorem 6.1, page 172, writes the contour integral as an ordinary integral in $t$. Theorem 6.9, page 194, evaluates the antiderivative $(z-a)^{${n + 1}}/${n + 1}$ at the two ends.`;
  return {
    prompt: `Let $C$ be the segment from $${fmtPole(start.re, start.im)}$ to $${fmtPole(end.re, end.im)}$.`,
    steps: [{
      text: `The integral of $${integrand}$ along $C$ equals ___.`,
      answer: `$${tex}$`,
      accept: [tex, `$${tex}$`, tex.replace(/\\/g, '')],
      miss: n === -1
        ? 'On a straight segment the integral of $1/(z-a)$ is the change in $\\log|z-a|$ plus $i$ times the change in argument. The value stays covered.'
        : `The antiderivative of $(z-a)^{${n}}$ is $(z-a)^{${n + 1}}/${n + 1}$. Evaluate it at the two ends. The value stays covered.`,
      why,
    }],
    memory: 'Parametrize $z(t)$, multiply by $z\'(t)$, and integrate in $t$. Off a pole, $(z-a)^{n}$ has antiderivative $(z-a)^{n+1}/(n+1)$ when $n\\ne -1$.',
    values: { re: value.re, im: value.im, n, sx: start.re, sy: start.im, ex: end.re, ey: end.im, ax: pole.re, ay: pole.im },
  };
}

// §6.2 Exercise 3(b): z^2 on the upper unit semicircle, t from 0 to π.
// z = e^{it}, dz = i e^{it} dt, so the integrand is i e^{3it}. The integral is −2/3.
export function upperSemicircleZ2() {
  const N = 4000;
  let s = { re: 0, im: 0 };
  for (let k = 0; k < N; k++) {
    const t = (PI * (k + 0.5)) / N;
    const dt = PI / N;
    const z = { re: Math.cos(t), im: Math.sin(t) };
    const dz = { re: -Math.sin(t) * dt, im: Math.cos(t) * dt };
    const f = fmul(z, z);
    s = fadd(s, fmul(f, dz));
  }
  return s;
}

// Example 6.9: ∫ z dz from −1−i to 3+i equals 4+2i on either path in the book.
export function example69() {
  return segmentIntegral({ re: -1, im: -1 }, { re: 3, im: 1 }, { re: 0, im: 0 }, 1);
}
