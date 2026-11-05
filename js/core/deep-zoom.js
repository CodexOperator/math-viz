// Deep zoom for z² + c.
//
// A pixel at width 1e-16 cannot be added to a centre near −0.75 in one double:
// the sum is the centre again. Two doubles run out near 1e-28. This file keeps
// the centre as a decimal integer (a BigInt times a power of ten) and iterates
// that reference orbit at full precision. Every other pixel stores only the
// difference from the reference, which is a float64 the size of the pixel.
//
// The difference δ obeys a short recurrence (perturbation). A cubic series in
// the pixel offset skips the early steps while the whole window still agrees
// with that polynomial. A pixel whose difference grows until it no longer
// tracks the reference is a glitch: that one pixel is iterated directly.
//
// Mandelbrot: z starts at 0, c is the pixel, the reference c is the centre.
//   δ₀ = 0,  δ ← 2 X δ + δ² + ε
// Julia: c is fixed, z starts at the pixel, the reference starts at the centre.
//   δ₀ = ε,  δ ← 2 X δ + δ²

import { DOUBLE_EDGE, WIDTH_FLOOR } from './deep-fill.js';

export { DOUBLE_EDGE, WIDTH_FLOOR };

const ESCAPE2 = 4;
const SERIES_TOL = 1e-3;
const GLITCH_RATIO = 1e-4;

function divRound(numer, denom) {
  const neg = numer < 0n;
  const a = neg ? -numer : numer;
  const q = (a + denom / 2n) / denom;
  return neg ? -q : q;
}

export function parseToScaled(str, scale) {
  if (typeof str !== 'string' && typeof str !== 'number') return null;
  const s = String(str).trim().replace(/\u2212/g, '-').replace(/^\+/, '');
  const m = /^(-)?(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(s);
  if (!m) return null;
  const frac = m[3] || '';
  const exp = (m[4] ? parseInt(m[4], 10) : 0) - frac.length;
  if (!Number.isFinite(exp)) return null;
  const digits = (m[2] + frac).replace(/^0+/, '') || '0';
  if (digits.length > 800) return null;
  const sc = scale | 0;
  if (sc < 0 || sc > 800) return null;
  let bi = BigInt(digits);
  const pow = exp + sc;
  if (pow >= 800 || pow <= -800) return null;
  if (pow >= 0) bi *= 10n ** BigInt(pow);
  else bi = divRound(bi, 10n ** BigInt(-pow));
  if (m[1]) bi = -bi;
  return bi;
}

export function scaledToDecimal(bi, scale) {
  if (bi == null) return '';
  if (bi === 0n) return '0';
  const neg = bi < 0n;
  const sc = scale | 0;
  let digits = (neg ? -bi : bi).toString();
  let body;
  if (sc <= 0) body = digits + '0'.repeat(-sc);
  else {
    if (digits.length <= sc) digits = digits.padStart(sc + 1, '0');
    const cut = digits.length - sc;
    const whole = digits.slice(0, cut);
    const frac = digits.slice(cut).replace(/0+$/, '');
    body = frac ? `${whole}.${frac}` : whole;
  }
  return neg ? `-${body}` : body;
}

function scaledToFloat(bi, scale) {
  if (bi === 0n) return 0;
  const neg = bi < 0n;
  const digits = (neg ? -bi : bi).toString();
  const lead = Number(digits.slice(0, 17));
  const exp10 = digits.length - 17 - (scale | 0);
  const v = lead * 10 ** exp10;
  if (!Number.isFinite(v)) return neg ? -Infinity : Infinity;
  return neg ? -v : v;
}

// round(10^exp) as an integer. exp may be fractional. Relative error is one
// double, which is a fraction of a pixel: the width, not the centre, is the
// quantity being converted.
function pow10Big(exp) {
  if (!Number.isFinite(exp)) return 0n;
  const ip = Math.floor(exp);
  const frac = exp - ip;
  const digits = 15;
  const mant = Math.pow(10, frac);
  const mantInt = BigInt(Math.round(mant * 10 ** (digits - 1)));
  const shift = ip - (digits - 1);
  if (shift >= 0) return mantInt * (10n ** BigInt(shift));
  if (-shift > 800) return 0n;
  return divRound(mantInt, 10n ** BigInt(-shift));
}

export function scaleFor(log10Width) {
  const depth = Math.max(0, -(Number(log10Width) || 0));
  return Math.max(24, Math.min(360, Math.ceil(depth + 20)));
}

export function iterForZoom(log10Width, draft) {
  const depth = Math.max(0, -(Number(log10Width) || 0));
  const full = Math.round(80 + depth * 42);
  const n = Math.max(64, Math.min(6000, full));
  if (!draft) return n;
  return Math.max(48, Math.min(n, Math.round(n * 0.5)));
}

export function advanceWidth(log10Width, factorPerSec, dtMs) {
  const f = Number(factorPerSec);
  const factor = Number.isFinite(f) && f > 1 ? f : 2;
  const dt = Math.max(0, Number(dtMs) || 0);
  return (Number(log10Width) || 0) - Math.log10(factor) * (dt / 1000);
}

export function widthIsBlindToFloat64(log10Width, grid = 32) {
  const w = Number(log10Width);
  const g = Math.max(2, grid | 0);
  if (!Number.isFinite(w)) return false;
  const pixel = 10 ** (w - Math.log10(g));
  const centre = -0.75;
  return pixel > 0 && (centre + pixel) === centre;
}

function cadd(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}
function cmul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function cscale(a, s) {
  return { re: a.re * s, im: a.im * s };
}
function cabs(a) {
  return Math.hypot(a.re, a.im);
}

function stepScaled(x, y, cx, cy, div) {
  const re = divRound(x * x - y * y, div) + cx;
  const im = divRound(2n * x * y, div) + cy;
  return { re, im };
}

function escapedScaled(x, y, four) {
  return x * x + y * y > four;
}

function pixelOffset(px, py, w, h, log10Width, scale) {
  const width = pow10Big(log10Width + scale);
  const dx = divRound(BigInt(2 * px + 1 - w) * width, BigInt(2 * w));
  const dy = divRound(BigInt(h - 1 - 2 * py) * width, BigInt(2 * h));
  return { dx, dy };
}

function loadCentre(spec, scale) {
  const re = parseToScaled(spec.re, scale);
  const im = parseToScaled(spec.im, scale);
  if (re == null || im == null) return null;
  const julia = spec.kind === 'julia';
  const cRe = julia ? parseToScaled(spec.cRe == null ? '0' : String(spec.cRe), scale) : re;
  const cIm = julia ? parseToScaled(spec.cIm == null ? '0' : String(spec.cIm), scale) : im;
  if (cRe == null || cIm == null) return null;
  const zRe = julia ? re : 0n;
  const zIm = julia ? im : 0n;
  return { re, im, cRe, cIm, zRe, zIm, julia };
}

function referenceOrbit(centre, scale, maxIter) {
  const div = 10n ** BigInt(scale);
  const four = 4n * (10n ** BigInt(scale * 2));
  const X = new Array(maxIter + 1);
  let x = centre.zRe;
  let y = centre.zIm;
  let escapedAt = -1;
  for (let n = 0; n <= maxIter; n++) {
    X[n] = { re: scaledToFloat(x, scale), im: scaledToFloat(y, scale) };
    if (n === maxIter) break;
    if (escapedScaled(x, y, four)) {
      escapedAt = n;
      X.length = n + 1;
      break;
    }
    const s = stepScaled(x, y, centre.cRe, centre.cIm, div);
    x = s.re;
    y = s.im;
  }
  return { X, escapedAt, scale };
}

function seriesTable(ref, julia) {
  const n = ref.X.length;
  const A = new Array(n);
  const B = new Array(n);
  const C = new Array(n);
  A[0] = julia ? { re: 1, im: 0 } : { re: 0, im: 0 };
  B[0] = { re: 0, im: 0 };
  C[0] = { re: 0, im: 0 };
  const one = { re: 1, im: 0 };
  for (let k = 0; k < n - 1; k++) {
    const X = ref.X[k];
    const twoX = { re: 2 * X.re, im: 2 * X.im };
    const a2 = cmul(A[k], A[k]);
    const nextA = cmul(twoX, A[k]);
    A[k + 1] = julia ? nextA : cadd(nextA, one);
    B[k + 1] = cadd(cmul(twoX, B[k]), a2);
    C[k + 1] = cadd(cmul(twoX, C[k]), cscale(cmul(A[k], B[k]), 2));
    if (!Number.isFinite(A[k + 1].re) || !Number.isFinite(B[k + 1].re) || !Number.isFinite(C[k + 1].re)
      || cabs(A[k + 1]) > 1e200) {
      A.length = k + 1;
      B.length = k + 1;
      C.length = k + 1;
      break;
    }
  }
  return { A, B, C };
}

function skipCount(series, ref, epsMax) {
  const e = Math.max(0, Number(epsMax) || 0);
  const e2 = e * e;
  const e3 = e2 * e;
  let skip = 0;
  const n = Math.min(series.A.length, ref.X.length);
  for (let k = 0; k < n; k++) {
    const lead = cabs(series.A[k]) * e;
    const err = cabs(series.B[k]) * e2 + cabs(series.C[k]) * e3;
    // While |X| + |δ| stays under the escape radius, no pixel in the window
    // can have left, so the polynomial is a safe place to start.
    if (cabs(ref.X[k]) + lead + err > 1.99) break;
    if (!(err <= SERIES_TOL * Math.max(lead, 1e-30))) break;
    skip = k;
  }
  return skip;
}

function seriesDelta(series, k, er, ei) {
  const e = { re: er, im: ei };
  const e2 = cmul(e, e);
  const e3 = cmul(e2, e);
  return cadd(cadd(cmul(series.A[k], e), cmul(series.B[k], e2)), cmul(series.C[k], e3));
}

function perturbFrom(ref, series, skip, er, ei, maxIter, julia) {
  let dr = 0;
  let di = 0;
  let k0 = 0;
  if (skip > 0 && skip < series.A.length) {
    const d = seriesDelta(series, skip, er, ei);
    dr = d.re;
    di = d.im;
    k0 = skip;
  } else if (julia) {
    dr = er;
    di = ei;
  }
  const last = Math.min(maxIter, ref.X.length - 1);
  for (let k = k0; k <= last; k++) {
    const X = ref.X[k];
    const zr = X.re + dr;
    const zi = X.im + di;
    const z2 = zr * zr + zi * zi;
    if (z2 > ESCAPE2) return { n: k, glitch: false };
    const x2 = X.re * X.re + X.im * X.im;
    if (k > 4 && x2 > 1e-8 && z2 < x2 * GLITCH_RATIO) return { n: k, glitch: true };
    if (k === last) break;
    const tr = 2 * (X.re * dr - X.im * di) + (dr * dr - di * di);
    const ti = 2 * (X.re * di + X.im * dr) + 2 * dr * di;
    dr = tr + (julia ? 0 : er);
    di = ti + (julia ? 0 : ei);
    if (!Number.isFinite(dr) || !Number.isFinite(di)) return { n: k, glitch: true };
  }
  if (ref.escapedAt >= 0) return { n: -1, glitch: true };
  return { n: -1, glitch: false };
}

function directEscape(centre, scale, dx, dy, maxIter) {
  const div = 10n ** BigInt(scale);
  const four = 4n * (10n ** BigInt(scale * 2));
  let x = centre.zRe + dx;
  let y = centre.zIm + dy;
  const cx = centre.julia ? centre.cRe : centre.re + dx;
  const cy = centre.julia ? centre.cIm : centre.im + dy;
  if (!centre.julia) {
    x = 0n;
    y = 0n;
  }
  for (let n = 0; n < maxIter; n++) {
    if (escapedScaled(x, y, four)) return n;
    const s = stepScaled(x, y, cx, cy, div);
    x = s.re;
    y = s.im;
  }
  return -1;
}

function epsOf(log10Width, w, h) {
  const width = 10 ** log10Width;
  const hx = width / 2;
  const hy = width * (h / Math.max(1, w)) / 2;
  return Math.hypot(hx, hy);
}

function floatEps(dx, dy, scale) {
  return { er: scaledToFloat(dx, scale), ei: scaledToFloat(dy, scale) };
}

export function startPass(spec) {
  const w = spec.w | 0;
  const h = spec.h | 0;
  if (w < 1 || h < 1) return null;
  const log10Width = Number(spec.log10Width);
  if (!Number.isFinite(log10Width)) return null;
  const scale = spec.scale | 0 || scaleFor(log10Width);
  const centre = loadCentre(spec, scale);
  if (!centre) return null;
  const draft = !!spec.draft;
  const maxIter = spec.maxIter | 0 || iterForZoom(log10Width, draft);
  const ref = referenceOrbit(centre, scale, maxIter);
  const series = seriesTable(ref, centre.julia);
  const skip = spec.series === false ? 0 : skipCount(series, ref, epsOf(log10Width, w, h));
  const field = new Float64Array(w * h);
  field.fill(-2);
  return {
    spec, w, h, scale, centre, ref, series, skip, maxIter, field,
    glitches: [],
    glitchCount: 0,
    digits: scale,
  };
}

export function renderBand(pass, y0, y1) {
  const { w, h, scale, centre, ref, series, skip, maxIter, field } = pass;
  const log10Width = Number(pass.spec.log10Width);
  const julia = centre.julia;
  const yStart = Math.max(0, y0 | 0);
  const yEnd = Math.min(h, y1 | 0);
  for (let py = yStart; py < yEnd; py++) {
    for (let px = 0; px < w; px++) {
      const off = pixelOffset(px, py, w, h, log10Width, scale);
      const { er, ei } = floatEps(off.dx, off.dy, scale);
      const hit = perturbFrom(ref, series, skip, er, ei, maxIter, julia);
      const i = py * w + px;
      if (hit.glitch) {
        pass.glitchCount += 1;
        pass.glitches.push({ px, py, i, dx: off.dx, dy: off.dy });
        field[i] = -2;
      } else {
        field[i] = hit.n < 0 ? -1 : hit.n;
      }
    }
  }
}

export function finishPass(pass) {
  const budget = pass.spec.directBudget == null ? 64 : pass.spec.directBudget | 0;
  let fixed = 0;
  const todo = pass.glitches;
  for (let g = 0; g < todo.length; g++) {
    const item = todo[g];
    if (fixed >= budget) break;
    const n = directEscape(pass.centre, pass.scale, item.dx, item.dy, pass.maxIter);
    pass.field[item.i] = n < 0 ? -1 : n;
    fixed += 1;
  }
  let left = 0;
  for (let g = fixed; g < todo.length; g++) {
    if (pass.field[todo[g].i] === -2) {
      // Not known. Do not call it inside.
      pass.field[todo[g].i] = 0;
      left += 1;
    }
  }
  return {
    field: pass.field,
    w: pass.w,
    h: pass.h,
    maxIter: pass.maxIter,
    skipped: pass.skip,
    glitches: pass.glitchCount,
    glitchFixed: fixed,
    glitchLeft: left,
    digits: pass.digits,
    log10Width: Number(pass.spec.log10Width),
  };
}

export function renderField(spec) {
  const pass = startPass(spec);
  if (!pass) return null;
  renderBand(pass, 0, pass.h);
  return finishPass(pass);
}

// The picture's own perturbation, with no direct fallback, against a direct orbit.
export function comparePixel(spec, px, py, w, h) {
  const pass = startPass({ ...spec, w, h, series: spec.series !== false, directBudget: 0 });
  if (!pass) return null;
  const off = pixelOffset(px, py, w, h, Number(spec.log10Width), pass.scale);
  const { er, ei } = floatEps(off.dx, off.dy, pass.scale);
  const hit = perturbFrom(pass.ref, pass.series, pass.skip, er, ei, pass.maxIter, pass.centre.julia);
  const direct = directEscape(pass.centre, pass.scale, off.dx, off.dy, pass.maxIter);
  const perturb = hit.glitch ? null : hit.n;
  return {
    perturb,
    direct,
    glitch: hit.glitch,
    match: !hit.glitch && perturb === direct,
    skipped: pass.skip,
    digits: pass.digits,
    maxIter: pass.maxIter,
    log10Width: Number(spec.log10Width),
  };
}

export function auditGrid(spec, grid = 3) {
  const g = Math.max(2, grid | 0);
  const body = { ...spec, w: g, h: g, directBudget: 0, series: true };
  const rendered = renderField({ ...body, directBudget: g * g });
  let matched = 0;
  let checked = 0;
  let glitched = 0;
  const samples = [];
  for (let py = 0; py < g; py++) {
    for (let px = 0; px < g; px++) {
      const cmp = comparePixel(spec, px, py, g, g);
      if (!cmp) continue;
      checked += 1;
      if (cmp.glitch) glitched += 1;
      else if (cmp.match) matched += 1;
      samples.push(cmp);
    }
  }
  let inside = 0;
  let outside = 0;
  if (rendered) {
    for (let i = 0; i < rendered.field.length; i++) {
      if (rendered.field[i] < 0) inside += 1;
      else outside += 1;
    }
  }
  return {
    matched,
    checked,
    glitched,
    inside,
    outside,
    mixed: inside > 0 && outside > 0,
    digits: samples[0] ? samples[0].digits : 0,
    maxIter: samples[0] ? samples[0].maxIter : 0,
    skipped: samples[0] ? samples[0].skipped : 0,
    blind: widthIsBlindToFloat64(Number(spec.log10Width), 32),
    pastDouble: Number(spec.log10Width) < Math.log10(WIDTH_FLOOR),
    log10Width: Number(spec.log10Width),
    samples,
    field: rendered ? rendered.field : null,
  };
}

function pixelCentreString(re, im, log10Width, px, py, w, h) {
  const scale = scaleFor(log10Width);
  const cre = parseToScaled(re, scale);
  const cim = parseToScaled(im, scale);
  const off = pixelOffset(px, py, w, h, log10Width, scale);
  return {
    re: scaledToDecimal(cre + off.dx, scale),
    im: scaledToDecimal(cim + off.dy, scale),
  };
}

function choosePixel(field, w, h) {
  const inside = [];
  const outside = [];
  for (let i = 0; i < field.length; i++) {
    if (field[i] < 0) inside.push(i);
    else outside.push(i);
  }
  const at = (i) => ({ px: i % w, py: (i / w) | 0 });
  let best = null;
  const midX = (w - 1) / 2;
  const midY = (h - 1) / 2;
  for (const i of inside) {
    const x = i % w;
    const y = (i / w) | 0;
    let touch = 0;
    if (x > 0 && field[i - 1] >= 0) touch += 1;
    if (x + 1 < w && field[i + 1] >= 0) touch += 1;
    if (y > 0 && field[i - w] >= 0) touch += 1;
    if (y + 1 < h && field[i + w] >= 0) touch += 1;
    if (!touch) continue;
    const dist = Math.hypot(x - midX, y - midY);
    const score = dist + (touch === 1 ? 0 : 3);
    if (!best || score < best.score) best = { px: x, py: y, score, touch };
  }
  if (best) {
    return { px: best.px, py: best.py, mixed: true, frac: inside.length / field.length };
  }
  if (inside.length && !outside.length) {
    return { px: (w / 2) | 0, py: (h / 2) | 0, mixed: false, allInside: true, frac: 1 };
  }
  let slowAt = outside[0] ?? 0;
  let slow = -1;
  for (const i of outside) {
    if (field[i] > slow) { slow = field[i]; slowAt = i; }
  }
  return { ...at(slowAt), mixed: false, frac: inside.length / field.length };
}

// Walk toward a place where the window holds both fates, then shrink.
// `levels` is how many shrinks to take. The returned centre is a decimal.
export function seekEdge(spec, opts = {}) {
  const levels = opts.levels ?? 18;
  const shrink = opts.shrink ?? 0.45;
  const grid = opts.grid ?? 7;
  const stop = opts.stop == null ? -48 : Number(opts.stop);
  let re = spec.re;
  let im = spec.im;
  let log10Width = Number(spec.log10Width);
  let mixedAt = null;
  for (let level = 0; level < levels; level++) {
    if (log10Width <= stop) break;
    const shot = renderField({
      ...spec, re, im, log10Width, w: grid, h: grid, draft: false, directBudget: grid * grid, series: true,
    });
    if (!shot) break;
    const pick = choosePixel(shot.field, grid, grid);
    const next = pixelCentreString(re, im, log10Width, pick.px, pick.py, grid, grid);
    re = next.re;
    im = next.im;
    if (opts.onStep) opts.onStep({ level, log10Width, frac: pick.frac, mixed: !!pick.mixed, glitches: shot.glitches });
    if (pick.mixed && pick.frac > 0.05 && pick.frac < 0.8) {
      mixedAt = { re, im, log10Width, frac: pick.frac };
      log10Width += Math.log10(shrink);
    } else if (pick.mixed) {
      mixedAt = { re, im, log10Width, frac: pick.frac };
      log10Width += Math.log10(0.72);
    } else if (pick.allInside) {
      log10Width += Math.log10(0.9);
    } else {
      log10Width += Math.log10(0.8);
    }
  }
  return {
    kind: spec.kind || 'mandelbrot',
    re, im, log10Width,
    cRe: spec.cRe, cIm: spec.cIm,
    mixedAt,
  };
}

// Windows whose pixels were checked against a direct high-precision orbit.
// Width 10^log10. Both sit past the two-double floor (about 10^−28).
export const PLACES = Object.freeze({
  mandelbrot: Object.freeze({
    kind: 'mandelbrot',
    re: '-0.743715441920450111505458064200848798041202499899618210789',
    im: '0.1317472588555236696796149858144648931977593554532777723',
    log10Width: -36.86795085653739,
    wideRe: '-0.75',
    wideIm: '0',
    wideLog10: Math.log10(3.2),
  }),
  julia: Object.freeze({
    kind: 'julia',
    re: '0.0919616396482451504027442776259177314471087334889689443',
    im: '0.6150117043364538463685627745086790717967411169245788912',
    cRe: '-0.75',
    cIm: '0',
    log10Width: -34.74464673469043,
    wideRe: '0',
    wideIm: '0',
    wideLog10: Math.log10(3.2),
  }),
});
