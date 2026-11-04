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

export function turnPhase(T) {
  const u = wrapTurn(T);
  if (u < 0.12 || TWO_PI - u < 0.12) return 'full';
  if (Math.abs(u - PI) < 0.12) return 'half';
  return 'move';
}

export function claim61(T) {
  const phase = turnPhase(T);
  if (phase === 'full') return { holds: true, phase, text: 'A full turn brings the integral back to $0$.' };
  if (phase === 'half') return { holds: false, phase, text: 'Half a turn leaves the integral at $2i$.' };
  return { holds: false, phase, text: 'The integral has left $0$. The real part and the imaginary part are still separate.' };
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
    return { holds: true, steps: 8, sum, text: `Eight steps sit on $${sum}$, beside $\\exp(2+i\\pi/4)-1$.` };
  }
  return { holds: false, steps: n, sum, text: `The sum has used ${n} of 8 steps.` };
}

// Green circle of radius 1, centre on the real axis. Purple circle stays at radius 2.
export const DEFORM_RADIUS = 1;
export const DEFORM_OUT = 1.55;

export function deformState(cx) {
  const x = Number(cx);
  const d = Math.abs(x);
  if (Math.abs(d - DEFORM_RADIUS) <= 0.06) return 'edge';
  return d < DEFORM_RADIUS ? 'inside' : 'outside';
}

export function claim63(cx) {
  const where = deformState(cx);
  if (where === 'inside') {
    return { holds: true, where, text: 'The pole stays inside both circles, so both integrals are $2\\pi i$.' };
  }
  if (where === 'edge') {
    return { holds: false, where, text: 'The pole is on the green circle. The integral stops being defined.' };
  }
  return { holds: false, where, text: 'The green circle has dropped the pole. Its integral is $0$. The purple circle is still $2\\pi i$.' };
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
  if (onSegment(pole, start, end)) return null;
  if (start.re === end.re && start.im === end.im) return null;
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
  if (a.re.n === 0 && a.im.n === 0) return null;
  if (b.re.n === 0 && b.im.n === 0) return null;
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

export function generateCircle(params, seed) {
  const rng = mulberry32(seed);
  const nR = params.n || [-4, 4];
  const rR = params.r || [1, 3];
  const aR = params.a || [-2, 2];
  const cR = params.c || [-1, 1];
  let center = { re: 0, im: 0 };
  let radius = 1;
  let pole = { re: 0, im: 0 };
  let n = 0;
  let value = null;
  for (let guard = 0; guard < 40 && !value; guard++) {
    center = { re: irand(rng, cR[0], cR[1]), im: irand(rng, cR[0], cR[1]) };
    radius = irand(rng, rR[0], rR[1]);
    pole = { re: irand(rng, aR[0], aR[1]), im: irand(rng, aR[0], aR[1]) };
    n = irand(rng, nR[0], nR[1]);
    if (radius <= 0) continue;
    value = circleIntegral(center, radius, pole, n);
  }
  if (!value) value = circleIntegral({ re: 0, im: 0 }, 2, { re: 0, im: 0 }, -1);
  const cTex = fmtPole(center.re, center.im);
  const circle = center.re === 0 && center.im === 0 ? `|z|=${radius}` : `|z-(${cTex})|=${radius}`;
  const integrand = powerTex(pole.re, pole.im, n);
  const why = value.tex === '2\\pi i'
    ? 'Corollary 6.1, page 188: the pole is inside and the power is $-1$, so the integral is $2\\pi i$.'
    : (n === -1
      ? 'The pole is outside the circle. Theorem 6.5, page 183, says the integral is $0$.'
      : 'Corollary 6.1, page 188: every integer power other than $-1$ integrates to $0$ when the pole is off the circle. A polynomial is the same fact from Theorem 6.5.');
  return {
    prompt: `Let $C$ be the circle $${circle}$, positively oriented.`,
    steps: [{
      text: `The integral of $${integrand}$ over $C$ equals ___.`,
      answer: `$${value.tex}$`,
      accept: value.tex === '0'
        ? ['0', '0+0i', '$0$']
        : ['2\\pi i', '2πi', '2pi i', '$2\\pi i$'],
      why,
    }],
    memory: 'Power $-1$ and the pole inside: $2\\pi i$. Any other integer power, or the pole outside: $0$.',
    values: { re: value.re, im: value.im, n, radius, cx: center.re, cy: center.im, ax: pole.re, ay: pole.im },
  };
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

export function generateSegment(params, seed) {
  const rng = mulberry32(seed);
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
  return segmentCard({ re: 0, im: 0 }, { re: 1, im: 1 }, { re: 0, im: 0 }, 2, fallback.tex, fallback);
}

function segmentCard(start, end, pole, n, tex, value) {
  const integrand = powerTex(pole.re, pole.im, n);
  const why = n === -1
    ? 'On a straight segment the integral of $1/(z-a)$ is the change in $\\log|z-a|$ plus $i$ times the change in argument.'
    : `The antiderivative of $(z-a)^{${n}}$ is $(z-a)^{${n + 1}}/${n + 1}$. Theorem 6.1, page 172, lets you evaluate it at the ends.`;
  return {
    prompt: `Let $C$ be the segment from $${fmtPole(start.re, start.im)}$ to $${fmtPole(end.re, end.im)}$.`,
    steps: [{
      text: `The integral of $${integrand}$ along $C$ equals ___.`,
      answer: `$${tex}$`,
      accept: [tex, `$${tex}$`, tex.replace(/\\/g, '')],
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
