// js/stations/linear.js: station "Linear Maps: Spin, Stretch, Slide" (problems 2.1.3, P3, P4; topic T2.1).
//
// f(z) = az + b treats the whole plane the same way: spin by Arg a, stretch by |a|, slide by b. A continuous stage s in [0, 3]
// plays those three moves; every point of the input, the carried grid and the dots goes through the same stage map. The image
// of the shape is built with pushForward, so every image point keeps the t of the input point it came from (the time ramp
// is the same on both planes: "when" matches "where").
//
// The pure maths and text helpers are named exports and the module has no top-level DOM access, so tests/unit imports it in
// Node. Design: docs/designs/iter-1/i1-station-curves-linear.md.

import { createPlane, drawCartAddress, drawPolarAddress, drawTimedCurve, drawSegment, drawDot, createLabelPlacer, registerObstacle, DASH } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, prose, proseParts } from '../core/katex.js';
import { verticalLine, circle, freehand, cartGrid, polarGrid, pointAt, curveLength } from '../core/shapes.js';
import { pushForward, pushForwardAll } from '../core/mapping.js';
import { compile, ParseError } from '../core/parse.js';
import { add, sub, mul, div, scale, abs, Arg, expi, wrapArg, eq, fromPolar, fmtNum, fmtCart, fmtPolar, exactAngle, texAngle, ZERO, I } from '../core/complex.js';
import { THREADS, threadLabel, threadLinkPrefix } from '../registry.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';

// ---------------------------------------------------------------- constants

const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};

export const PRESETS = deepFreeze({
  '2.1.3': { a: { re: 0, im: 1 }, b: { re: 0, im: -2 }, input: 'x2', grid: 'cart', t: 0.875, card: '2.1.3' },
  P3: { a: { re: 0, im: 1 }, b: { re: 0, im: -2 }, input: 'x2', grid: 'cart', t: 0.875, card: 'P3' },
  P4: { a: { re: 1, im: 1 }, b: { re: 0, im: 0 }, input: 'unit', grid: 'polar', t: 0.125, card: 'P4' },
});
export const STAGE_SECONDS = 1.2;                         // per stage when playing
export const LINE_Y_RANGE = Object.freeze([-4, 4]);
export const COMPOSE_DEFAULTS = deepFreeze({ c: { re: 1, im: 1 }, d: { re: 1, im: 0 }, cText: '1+i', dText: '1' });

const C = (re, im) => ({ re, im });
const copyZ = (z) => ({ re: z.re, im: z.im });
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const T = String.raw;
const dec = (x) => fmtNum(x, 3);
const RAD2DEG = 180 / Math.PI;
const NARROW_PLANE = 400;                                     // plane width in px below which the crowded marks lose their labels
const CLOSE_DOTS = 36;                                         // px: the dots f(0) and f(1) closer than this share one label
// Spots for a word beside a dot, nearest first, as createLabelPlacer candidates ({ z, dx, dy, align }): the dot's own default (above and
// right), then the other three corners, then straight above and below. `below` starts with the lower corners (the fixed-point word).
const AROUND = Object.freeze([[8, -8, 'left'], [8, 16, 'left'], [-8, -8, 'right'], [-8, 16, 'right'], [0, -14, 'center'], [0, 24, 'center'], [18, 4, 'left'], [-18, 4, 'right']]);
const BELOW = Object.freeze([[8, 18, 'left'], [-8, 18, 'right'], [8, -8, 'left'], [-8, -8, 'right'], [0, 28, 'center'], [0, -14, 'center'], [18, 4, 'left'], [-18, 4, 'right']]);
const PAIR = Object.freeze([[14, 4, 'left'], [-14, 4, 'right'], [14, -14, 'left'], [-14, -14, 'right'], [14, 22, 'left'], [-14, 22, 'right']]);   // beside the middle of two close dots
const ARROW_WORD = Object.freeze([[6, -6, 'left'], [6, 14, 'left'], [-6, -6, 'right'], [-6, 14, 'right'], [14, 4, 'left'], [-14, 4, 'right']]);   // beside an arrow
export const spotsAround = (z, list = AROUND) => list.map(([dx, dy, align]) => ({ z, dx, dy, align }));

// ---------------------------------------------------------------- pure maths

// The stage s in [0, 3]: which move, how far along it, and whether it is a whole stage.
export function stageInfo(s) {
  const v = clamp(Number.isFinite(s) ? s : 0, 0, 3);
  if (v <= 1e-9) return { stage: 0, phase: 'start', fraction: 0, done: true };
  const phase = v <= 1 ? 'spin' : v <= 2 ? 'stretch' : 'slide';
  const fraction = phase === 'spin' ? v : phase === 'stretch' ? v - 1 : v - 2;
  return { stage: phase === 'spin' ? 1 : phase === 'stretch' ? 2 : 3, phase, fraction, done: Math.abs(v - Math.round(v)) < 1e-9 };
}

// The whole plane at stage s: a spin (0..1), then a stretch from 1 to |a| (1..2), then a slide from 0 to b (2..3). At s = 3 it is az + b exactly.
export function stageMap(a, b, s) {
  const v = clamp(Number.isFinite(s) ? s : 0, 0, 3);
  const alpha = Arg(a), mag = abs(a);
  if (v <= 1) { const rot = expi(alpha * v); return (z) => mul(rot, z); }
  if (v <= 2) { const k = 1 + (v - 1) * (mag - 1), rs = scale(expi(alpha), k); return (z) => mul(rs, z); }
  const ub = scale(b, v - 2);
  return (z) => add(mul(a, z), ub);
}

// z* = b / (1 - a): the one point the map leaves alone. null for a = 1 (a pure slide) and for a = 0 (everything goes to b).
export function fixedPoint(a, b) {
  if (!(abs(sub(C(1, 0), a)) >= 1e-9) || !(abs(a) >= 1e-9)) return null;
  const p = div(b, sub(C(1, 0), a));
  return C(p.re + 0, p.im + 0);
}

export function describeLinear(a, b) {
  const isZero = !(abs(a) >= 1e-9);
  const alpha = isZero ? 0 : Arg(a);
  return { alpha, spinDeg: alpha * RAD2DEG, stretch: abs(a), isZero };
}

// a(cz + d) + b = (ac) z + (ad + b): spins add, stretches multiply.
export function compose(a, b, c, d) {
  const A = mul(a, c), B = add(mul(a, d), b);
  const argA = Arg(a), argC = Arg(c), sum = argA + argC;
  return { A, B, argA, argC, spinSumRad: sum, spinSumDeg: sum * RAD2DEG, stretchProduct: abs(a) * abs(c), wrapped: Math.abs(wrapArg(sum) - sum) > 1e-9 };
}

const TOKEN_PRESETS = { '2-1-3': ['2.1.3', 'x2'], x2: ['2.1.3', 'x2'], p3: ['P3', 'x2'], compose: ['P3', 'x2'], p4: ['P4', 'unit'], unit: ['P4', 'unit'], stroke: ['2.1.3', 'stroke'] };

// ctx.preset -> { key, input, unknown }: unknown is the token text of a token the station does not know, else null.
export function resolvePreset(ctxPreset) {
  if (ctxPreset && ctxPreset.kind === 'problem' && Object.prototype.hasOwnProperty.call(PRESETS, ctxPreset.id)) {
    return { key: ctxPreset.id, input: PRESETS[ctxPreset.id].input, unknown: null };
  }
  if (ctxPreset && ctxPreset.kind === 'token') {
    const token = String(ctxPreset.token == null ? '' : ctxPreset.token);
    const lower = token.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TOKEN_PRESETS, lower)) return { key: TOKEN_PRESETS[lower][0], input: TOKEN_PRESETS[lower][1], unknown: null };
    return { key: '2.1.3', input: 'x2', unknown: token };
  }
  return { key: '2.1.3', input: 'x2', unknown: null };
}

// How far from 0 a w value may be before the mapping engine cuts the curve: about three times the larger half-extent of the
// w-plane view plus the distance of the view centre from 0, never below 40.
export function clampRadiusFor(view, size) {
  const halfW = view.unitsAcross / 2;
  const halfH = size && size.w > 0 ? halfW * size.h / size.w : halfW;
  const c = view.center || { re: 0, im: 0 };
  return Math.max(40, 3 * Math.max(halfW, halfH) + Math.hypot(c.re, c.im));
}

// ---------------------------------------------------------------- inputs, grids, images

export function inputCurve(kind) {
  if (kind === 'x2') return verticalLine(2, { yRange: LINE_Y_RANGE, n: 128 });
  if (kind === 'unit') return circle(C(0, 0), 1, { n: 128 });
  return null;
}

export function gridCurves(kind) {
  if (kind === 'cart') return cartGrid({ xRange: [-4, 4], yRange: [-4, 4], step: 1, n: 48 });
  if (kind === 'polar') return polarGrid({ rMax: 4, rings: 4, rays: 12, n: 96 });
  return [];
}

// The image of a curve at stage s: the pieces pushForward returns, each point keeping the t of the point it came from.
export function imagePieces(curve, a, b, s, clampRadius = 40) {
  return curve ? pushForward(curve, stageMap(a, b, s), { clampRadius }) : [];
}

// ---------------------------------------------------------------- text

// The caption under the stage slider. It is the line that must keep one height while a or b is dragged and while the slider moves, so
// its length does not depend on the digits of b (b is in the readout above it) and every string is short enough for two lines in the
// 190 px beside the Play button of a 340 px phone, at the page's own font size.
export function stageCaption(a, b, s) {
  const info = stageInfo(s), d = describeLinear(a, b);
  const deg = fmtNum(d.spinDeg, 1), mag = fmtNum(d.stretch), x = Math.round(info.fraction * 100);
  if (info.stage === 0) return 'Stage 0 of 3: the plane as you drew it.';
  if (info.stage === 1) {
    return info.done ? `Stage 1 of 3 done: spun by Arg a = ${deg}°.`
      : `Stage 1 of 3, spinning: ${x}% of ${deg}°.`;
  }
  if (info.stage === 2) {
    return info.done ? `Stage 2 of 3 done: stretched by |a| = ${mag}.`
      : `Stage 2 of 3, stretching: ${x}% of the way to ${mag}.`;
  }
  if (info.done) {
    return abs(b) < 1e-9 ? 'Stage 3 of 3 done: no slide, b = 0. So f(z) = az.'
      : 'Stage 3 of 3 done: slid by b. So f(z) = az + b.';
  }
  return `Stage 3 of 3, sliding: ${x}% of the way along b.`;
}

// a = i = e^(i 1.571); b = -2i; spin 90°, stretch 1, slide -2i
export function readoutText(a, b) {
  const info = describeLinear(a, b);
  const aCart = fmtCart(a), aPolar = fmtPolar(a);
  const aText = info.isZero ? '0 (squashes the plane to b)' : aCart === aPolar ? aCart : aCart + ' = ' + aPolar;     // a = 2 is not "2 = 2"
  return `a = ${aText}; b = ${fmtCart(b)}; spin ${fmtNum(info.spinDeg, 1)}°, stretch ${fmtNum(info.stretch)}, slide ${fmtCart(b)}`;
}

// The two halves of the composition readout, split where the semicolon is so the page can break the line there on a phone.
export function composeReadoutParts(a, b, c, d) {
  const k = compose(a, b, c, d);
  return [`ac = ${fmtCart(k.A)};`, `ad + b = ${fmtCart(k.B)}`];
}

export function composeReadout(a, b, c, d) {
  return composeReadoutParts(a, b, c, d).join(' ');
}

// The words on the dots at f(0) and f(1) (the empty string draws no label). When the two dots are on top of each other, or close
// enough for their words to overprint, one label does for both: at a = 0 f sends everything to b, so f(0) = f(1) = b.
export function dotWords({ done, same, close }) {
  const [w0, w1] = done ? ['f(0)', 'f(1)'] : ['0', '1'];
  if (same) return [done ? 'f(0) = f(1) = b' : '0 = 1', ''];
  if (close) return [`${w0}, ${w1}`, ''];
  return [w0, w1];
}

// A number typed into c or d: the parse.js sentence for a mistake, verbatim, or the value.
export function parseConstant(src) {
  const s = String(src == null ? '' : src);
  if (s.trim() === '') return { ok: false, message: 'Type a number, for example 1+i.' };
  let c;
  try { c = compile(s); } catch (e) {
    return { ok: false, message: e instanceof ParseError ? e.message : 'I could not read that. Try something like 1+i.' };
  }
  if (c.uses.size > 0) return { ok: false, message: 'Use a number here, not z, x or y. For example 1+i or -2i.' };
  const z = c.f(C(0, 0));
  if (!(Number.isFinite(z.re) && Number.isFinite(z.im))) return { ok: false, message: 'That is not a finite number. Try something like 1+i.' };
  return { ok: true, z: C(z.re, z.im) };
}

// The hand-off to the Lab (ARCHITECTURE 4, LabRequest). A freehand stroke is never handed over: the Lab has no such shape kind.
export function labRequest({ a, b, input }) {
  const fn = eq(a, I) && eq(b, C(0, -2)) ? 'linear-i'
    : eq(a, C(1, 1)) && eq(b, ZERO) ? 'linear-1i'
    : { src: `(${fmtCart(a)})*z + (${fmtCart(b)})` };
  const shapes = input === 'x2' ? [{ kind: 'verticalLine', x: 2 }]
    : input === 'unit' ? [{ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }] : [];
  const problem = (input === 'x2' && fn === 'linear-i') ? '2.1.3' : (input === 'unit' && fn === 'linear-1i') ? 'P4' : null;
  return { fn, shapes, view: 'side', problem, predictFirst: false };
}

// [[coef, 'x'], [coef, 'y'], [coef, '']] -> 'x - y', '-y', 'x - 2', '0'
export function texTerms(terms) {
  let out = '';
  for (const [coef, v] of terms) {
    if (!(Math.abs(coef) >= 1e-9)) continue;
    const mag = Math.abs(coef), body = (Math.abs(mag - 1) < 1e-9 && v !== '' ? '' : dec(mag)) + v;
    out += out === '' ? (coef < 0 ? '-' : '') + body : (coef < 0 ? ' - ' : ' + ') + body;
  }
  return out === '' ? '0' : out;
}

// r e^{i theta} with decimals: 'r\,e^{i\,theta}'.
export function texPolarDec(z) {
  const r = abs(z);
  if (!(r >= 1e-9)) return '0';
  const th = Arg(z), mag = Math.abs(r - 1) < 1e-9 ? '' : dec(r) + '\\,';
  if (Math.abs(th) < 1e-12) return mag === '' ? '1' : dec(r);
  return th < 0 ? `${mag}e^{-i\\,${dec(-th)}}` : `${mag}e^{i\\,${dec(th)}}`;
}

export function texAngleDual(theta) {
  if (Math.abs(theta) < 1e-12) return '0';
  return exactAngle(theta) ? dec(theta) + ' = ' + texAngle(theta) : dec(theta);
}

const texParen = (z) => '(' + fmtCart(z, 3) + ')';
const finiteZ = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);

// ---- the main explainer: a, b, f, the centre of the move, the followed point and where f sends it

export function explainerState(a, b, z) {
  const zz = finiteZ(z) ? z : null;
  return { a, b, z: zz, w: zz ? add(mul(a, zz), b) : null, p: fixedPoint(a, b), info: describeLinear(a, b) };
}

export function explainerRows() {
  const polarOf = (lead, z) => (abs(z) < 1e-9 ? `${lead} = 0` : T`|${lead}| = ${dec(abs(z))},\ \Arg ${lead} = ${texAngleDual(Arg(z))}`);
  return [
    { id: 'a', label: 'a: the multiplier', native: 'polar',
      cart: (s) => `a = ${fmtCart(s.a)}`,
      polar: (s) => (s.info.isZero ? 'a = 0' : polarOf('a', s.a)),
      motion: (s) => ({ text: s.info.isZero ? 'squash everything onto b' : `spin by Arg a = ${fmtNum(s.info.spinDeg, 1)} degrees, stretch by |a| = ${fmtNum(abs(s.a))}` }) },
    { id: 'b', label: 'b: the shift', native: 'cart',
      cart: (s) => `b = ${fmtCart(s.b)}`,
      polar: (s) => polarOf('b', s.b),
      motion: (s) => ({ text: abs(s.b) < 1e-9 ? 'no slide (b = 0)' : `slide by ${fmtCart(s.b)}` }) },
    { id: 'f', label: 'f(z) = az + b',
      cart: (s) => {
        const p = s.a.re, q = s.a.im, r = s.b.re, t = s.b.im;
        return T`u = ${texTerms([[p, 'x'], [-q, 'y'], [r, '']])},\ v = ${texTerms([[q, 'x'], [p, 'y'], [t, '']])}`;
      },
      polar: (s) => {
        if (s.info.isZero) return T`f(re^{i\theta}) = ${texParen(s.b)}`;
        const m = Math.abs(abs(s.a) - 1) < 1e-9 ? '' : dec(abs(s.a)) + '\\,';
        const al = Arg(s.a);
        const ang = Math.abs(al) < 1e-9 ? T`\theta` : T`(\theta ${al < 0 ? '-' : '+'} ${dec(Math.abs(al))})`;
        return T`f(re^{i\theta}) = ${m}r\,e^{i${ang}}${abs(s.b) < 1e-9 ? '' : ' + ' + texParen(s.b)}`;
      },
      motion: (s) => ({ text: `turn by ${fmtNum(s.info.spinDeg, 1)} degrees, scale by ${fmtNum(abs(s.a))}` + (abs(s.b) < 1e-9 ? ', no slide' : `, then slide by ${fmtCart(s.b)}`) }) },
    { id: 'fixed', label: 'centre of the move',
      cart: (s) => (s.p ? T`p = b/(1 - a) = ${fmtCart(s.p)}` : s.info.isZero ? T`\text{every point goes to } b` : T`\text{none: a = 1 is a pure slide}`),
      polar: (s) => (s.p ? (abs(s.p) < 1e-9 ? 'p = 0' : T`|p| = ${dec(abs(s.p))},\ \Arg p = ${texAngleDual(Arg(s.p))}`) : null),
      motion: (s) => ({ text: s.p ? 'the point that does not move: the centre of the spin and the stretch' : '' }) },
    { id: 'zt', label: 'followed point z(t)',
      cart: (s) => (s.z ? `z = ${fmtCart(s.z)}` : null),
      polar: (s) => (s.z ? polarOf('z', s.z) : null),
      motion: (s) => (s.z ? { text: 'the dot before the move' } : null) },
    { id: 'wt', label: 'where f sends it',
      cart: (s) => (s.w ? `w = az + b = ${fmtCart(s.w)}` : null),
      polar: (s) => (s.w ? polarOf('w', s.w) : null),
      motion: (s) => (s.w ? { text: 'the same dot after the move' } : null) },
  ];
}

export function explainerSame(s) {
  return s.z ? { cart: fmtCart(s.w), polar: texPolarDec(s.w), agree: eq(fromPolar(abs(s.w), Arg(s.w)), s.w, 1e-9) } : null;
}

// ---- the composition explainer (P3)

export function composeState(a, b, c, d, z) {
  const zz = finiteZ(z) ? z : C(1, 0);
  const A = mul(a, c), B = add(mul(a, d), b);
  return { a, b, c, d, z: zz, A, B, info: compose(a, b, c, d),
           lhs: add(mul(a, add(mul(c, zz), d)), b), rhs: add(mul(A, zz), B) };
}

export function composeRows() {
  const degOf = (x) => fmtNum(Arg(x) * RAD2DEG, 1);
  const mag = (x) => fmtNum(abs(x));
  return [
    { id: 'coeff', label: 'ac: the new multiplier', native: 'polar',
      cart: (s) => T`a c = ${texParen(s.a)}${texParen(s.c)} = ${fmtCart(s.A)}`,
      polar: (s) => (abs(s.a) < 1e-9 || abs(s.c) < 1e-9 ? null
        : T`|a||c|\,e^{i(\Arg a + \Arg c)} = ${dec(abs(s.a))}\cdot ${dec(abs(s.c))}\,e^{i(${dec(Arg(s.a))} + ${dec(Arg(s.c))})}`),
      motion: (s) => {
        const k = s.info;
        let text = `spins add: ${degOf(s.a)} and ${degOf(s.c)} give ${fmtNum(k.spinSumDeg, 1)} degrees. Stretches multiply: ${mag(s.a)} x ${mag(s.c)} = ${mag(s.A)}.`;
        if (k.wrapped) {
          const sum = k.spinSumRad, seam = Math.abs(sum + Math.PI) < 1e-9;           // exactly -π is not "past" -π: it is on the seam, outside (-π, π]
          text += ` ${dec(sum)} ${seam ? 'is not in (-π, π]' : `is past ${sum > 0 ? 'π' : '-π'}`}, so the home step is Arg(ac) = ${dec(wrapArg(sum))}.`;
        }
        return { text };
      } },
    { id: 'shift', label: 'ad + b: the new shift', native: 'cart',
      cart: (s) => T`a d + b = ${texParen(s.a)}${texParen(s.d)} + ${texParen(s.b)} = ${fmtCart(s.B)}`,
      polar: (s) => (abs(s.B) < 1e-9 ? 'ad + b = 0' : T`|ad + b| = ${dec(abs(s.B))},\ \Arg(ad + b) = ${texAngleDual(Arg(s.B))}`),
      motion: () => ({ text: 'Spin and stretch d by a, then slide by b.' }) },
    { id: 'check', label: 'check at one point',
      cart: (s) => T`\text{at } z = ${fmtCart(s.z)}:\ a(cz + d) + b = ${fmtCart(s.lhs)},\ \ (ac)z + (ad + b) = ${fmtCart(s.rhs)}`,
      polar: (s) => T`${texPolarDec(s.lhs)}\ \text{and}\ ${texPolarDec(s.rhs)}`,
      motion: () => ({ text: 'Two moves in a row are one move.' }) },
  ];
}

export function composeSame(s) {
  return { cart: fmtCart(s.lhs), polar: texPolarDec(s.lhs), agree: abs(sub(s.lhs, s.rhs)) < 1e-9 };
}

// ---------------------------------------------------------------- copy

export const COPY = Object.freeze({
  lede: 'f(z) = az + b treats the whole plane the same way, in three moves. Spin by the angle of a. Stretch by the length of a. Slide by b. Drag the stage slider and watch your shape do it.',
  vectorsHint: 'Orange arrow: where the step from 0 to 1 goes. That is a. Blue arrow: where 0 goes. That is b. The black dot marked fixed point, or just p on a narrow plane, is the one point that does not move.',
  abHint: 'Drag the orange a: the ray from 0 is its polar address (length and angle). Drag the blue b: the dashed lines are its Cartesian address (across and up).',
  stairsNote: 'Turning by Arg a, or by Arg a plus any number of full turns, moves the plane exactly the same way. arg a is every one of those names. Arg a is the one we write down.',
  composeIntro: 'Let g(z) = cz + d, then apply f(z) = az + b. Is the result still a linear map? Type c and d.',
  composeNote: 'A linear map needs a ≠ 0. If a or c is 0, the result squashes the whole plane onto one point, so it is not a linear transformation.',
  strokeHint: 'Press and drag on the left plane to draw. Your stroke moves with the plane on the right. (Drawing needs a mouse, finger or pen; the line and the circle work with the keyboard.)',
  strokePhone: 'Drawing is on: touch outside the left plane to scroll the page.',
  strokeShort: 'That was too short to be a stroke. Press, drag, then let go.',
  zeroNote: 'a = 0 squashes every point onto b, so this is not a one-to-one map. Move a away from 0.',
  offscreen: 'The image is off the plane. Press Fit both planes, or zoom out with the minus button.',
});

// ---------------------------------------------------------------- DOM helpers (only called from mount)

function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

const STYLE = `
.ln-fig{margin:0;min-width:0}
.ln-fig figcaption{margin:0 0 var(--space-1);font-weight:600}
.ln-fig figcaption .muted{font-weight:400}
.ln-stage{display:flex;flex-direction:column;gap:var(--space-3)}
.ln-bar{position:sticky;bottom:0;z-index:5;display:grid;gap:var(--space-1);padding:var(--space-2) var(--space-3);border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow)}
.ln-slider{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:0 var(--space-2);align-items:start}
.ln-slider>label,.ln-slider>output{line-height:var(--tap)}
.ln-slider>label{font-weight:600}
.ln-slider input[type=range]{display:block;width:100%;min-width:0;height:var(--tap);margin:0;accent-color:var(--accent);cursor:pointer}
.ln-slider output{min-width:2.5em;color:var(--text-muted);font-family:var(--font-mono);font-size:.92rem;text-align:right}
.ln-track{min-width:0}
.ln-ticks{position:relative;height:1.1rem;margin:-.35rem .5rem 0;color:var(--text-muted);font-size:.8rem;line-height:1.1rem}
.ln-ticks span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.ln-bar-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2) var(--space-3);align-items:center}
.ln-wwrap{position:relative}
.ln-offscreen{position:absolute;left:var(--space-2);right:var(--space-2);bottom:var(--space-2);margin:0;padding:var(--space-1) var(--space-2);border:1px solid var(--border-strong);border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow);font-size:.9rem;line-height:1.35;pointer-events:none}
#linear-compose-readout{overflow-x:auto}
#linear-compose-readout .ln-nw{white-space:nowrap}
.ln-compose-note{margin:var(--space-2) 0;color:var(--text-muted);font-size:.95rem}
.ln-compose-note[data-active="true"]{color:var(--danger);font-weight:600}
.ln-caption{margin:0;font-size:.95rem}
.ln-controls{display:grid;gap:var(--space-3)}
.ln-group{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2) var(--space-3)}
.ln-ab{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));align-items:start}
.ln-ab>*{min-width:0}
.ln-inputs{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:end}
.ln-inputs .field{flex:1 1 9rem}
.ln-inputs .field input{width:100%;min-height:var(--tap)}
.ln-error{margin:0;color:var(--danger);font-weight:600}
.ln-error:empty{display:none}
.ln-compose[data-active="true"]{outline:3px solid var(--accent);outline-offset:3px}
.ln-statement{font-size:1.05rem}
.ln-two{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))}
.ln-two>div{padding-left:var(--space-2);border-left:4px solid var(--tone,var(--border-strong))}
.ln-two h3{margin:0 0 var(--space-1)}
.ln-hint{margin:var(--space-1) 0 0;color:var(--text-muted);font-size:.9rem}
.ln-badges{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2)}
#station-linear .ln-final{padding:var(--space-1);border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2)}
#station-linear .ln-final .katex-display{max-width:none;overflow:visible;margin:.4em 0}
#station-linear details{margin-top:var(--space-2)}
#station-linear summary{padding:.6rem 0;cursor:pointer;font-weight:600}
#station-linear .ln-links-lab{margin-left:auto}
@media (max-width:30rem){
.ln-ticks{display:none}
#linear-compose-readout .ln-nw{display:block}
#station-linear .ln-caption{min-height:3.2em}
#station-linear .ln-fig{padding:var(--space-2)}
#station-linear .two-planes,#station-linear .ln-stage{gap:var(--space-2)}
#station-linear .ln-fig figcaption{font-size:1rem}
#station-linear .ln-bar{gap:0;padding:var(--space-1) var(--space-3)}
}
@media (max-width:21rem){#station-linear .ln-caption{min-height:4.8em}}
`;

function ensureStyle() {
  const head = document.head;
  if (head.querySelector('style[data-for="linear"]')) return;
  const s = mk('style');
  s.setAttribute('data-for', 'linear');
  s.textContent = STYLE;
  head.appendChild(s);
}

// Prose with exponents (e^{i pi/4}) as plain text for a title attribute: a caret, and brackets unless the exponent is one number or
// one letter, so e^{i pi/4} reads e^(i pi/4) and 2^10 stays 2^10.
export function plainProse(text) {
  const atom = /^[+\-\u2212]?(?:\d+(?:\.\d+)?|[A-Za-z\u0370-\u03ff])$/;
  return proseParts(text).map((q) => (q.sup ? '^' + (atom.test(q.text) ? q.text : '(' + q.text + ')') : q.text)).join('');
}

function threadBadges(ctx) {
  const ul = mk('ul', 'thread-badges');
  for (const tid of (ctx.station && ctx.station.threads) || []) {
    const th = (ctx.threads || THREADS).find((x) => x.id === tid);
    const li = mk('li', 'thread-badge', null, threadLabel(th || tid));
    li.dataset.thread = tid;
    if (th) li.title = `${th.title}. ${th.summary}`;
    ul.appendChild(li);
  }
  return ul;
}

function buildHeader(ctx) {
  const header = mk('header', 'station-header');
  header.appendChild(mk('h1', '', null, ctx.station.title));
  header.appendChild(mk('p', 'station-lede', null, COPY.lede));
  header.appendChild(threadBadges(ctx));
  const chips = mk('div', 'chips', { 'aria-label': 'Problems on this page' });
  for (const p of problemsForStation(ctx.station.id)) {
    chips.appendChild(mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: plainProse(p.aha) }, p.id));
  }
  header.appendChild(chips);
  return header;
}

// The answer: the TeX in a keyboard-focusable scroller, a hint that shows only while the TeX is wider than its box (21 of the 29
// answers are wider than a phone), and the printable text, which wraps, below it. The same pattern as problems.js (ARCHITECTURE 10.4.2).
// The box sits in a closed <details>, so its width is 0 until it is opened: a ResizeObserver on the box notices the opening, a resize
// and a font arriving late; no window listener.
function answerBox(answer) {
  const box = mk('div', 'tex-scroll ln-final', { id: 'linear-problem-answer-box', tabindex: '0', role: 'group', 'aria-label': 'Answer, scrolls sideways if it is wide' });
  tex(box, answer.tex, { display: true });
  const hint = mk('p', 'ln-hint', null, 'Scroll sideways to see the rest.');
  hint.hidden = true;
  const refresh = () => { hint.hidden = !(box.scrollWidth > box.clientWidth + 1); };
  let watch = null;
  try { if (typeof ResizeObserver === 'function') { watch = new ResizeObserver(refresh); watch.observe(box); } } catch (e) { watch = null; }
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh, () => {}); } catch (e) { /* no font events: the observer is enough */ }
  return { nodes: [box, hint, mk('p', 'muted mono', null, answer.text)], dispose() { if (watch) { try { watch.disconnect(); } catch (e) { /* already gone */ } watch = null; } } };
}

// The problem card of 2.9: statement, address badges, the working in both addresses, the answer. Both details start closed.
// Returns the function that stops watching the answer box (a no-op when there is no card).
function renderProblemCard(host, problemId) {
  host.textContent = '';
  const p = problemById(problemId);
  if (!p) { host.hidden = true; return () => {}; }
  host.hidden = false;
  host.appendChild(mk('h2', 'panel-title', { id: 'linear-problem-title' }, 'On the test: ' + p.id));
  const st = mk('p', 'ln-statement');
  for (const part of statementParts(p.statement)) {
    const span = mk('span');
    if (part.math) tex(span, part.text); else span.textContent = part.text;
    st.appendChild(span);
  }
  host.appendChild(st);
  const why = mk('p', 'muted ln-badges');
  const words = { '--cart': 'Cartesian', '--polar': 'Polar' };
  for (const tone of addressTones(p.address)) {
    const key = tone.replace(/^--/, '');
    const badge = mk('span', 'badge', null, words[tone] || key);
    badge.dataset.tone = key;
    why.appendChild(badge);
  }
  why.appendChild(mk('span', '', null, 'Easiest in: ' + addressLabel(p.address) + '.'));
  const whySpan = mk('span', '', { id: 'linear-problem-why' });
  prose(whySpan, p.addressWhy);
  why.appendChild(whySpan);
  host.appendChild(why);

  const working = mk('details', '', { id: 'linear-problem-working' });
  working.appendChild(mk('summary', '', null, 'Show the working both ways'));
  const two = mk('div', 'ln-two');
  for (const [key, title] of [['cart', 'Cartesian'], ['polar', 'Polar']]) {
    const col = mk('div');
    col.dataset.tone = key;
    col.appendChild(mk('h3', '', null, title));
    const para = mk('p');
    prose(para, p.routes[key]);
    col.appendChild(para);
    two.appendChild(col);
  }
  working.appendChild(two);
  host.appendChild(working);

  const answer = mk('details', '', { id: 'linear-problem-answer' });
  answer.appendChild(mk('summary', '', null, 'Show the answer'));
  const ab = answerBox(p.answer);
  answer.append(...ab.nodes);
  host.appendChild(answer);
  return ab.dispose;
}

// Previous and next station, then the neighbours along each thread of this station.
function buildLinks(ctx) {
  const cur = ctx.station, list = ctx.stations || [];
  const nav = mk('nav', 'station-links', { 'aria-label': 'Other places' });
  const items = [];
  const prev = list.find((s) => s.order === cur.order - 1), next = list.find((s) => s.order === cur.order + 1);
  if (prev) items.push({ s: prev, dir: 'prev', thread: null });
  if (next) items.push({ s: next, dir: 'next', thread: null });
  for (const th of cur.threads || []) {
    const before = list.filter((s) => s.order < cur.order && (s.threads || []).includes(th)).pop();
    const after = list.find((s) => s.order > cur.order && (s.threads || []).includes(th));
    if (before && !items.some((i) => i.s.id === before.id)) items.push({ s: before, dir: 'prev', thread: th });
    if (after && !items.some((i) => i.s.id === after.id)) items.push({ s: after, dir: 'next', thread: th });
  }
  for (const it of items) {
    const a = mk('a', 'station-link', { href: '#' + it.s.id });
    const label = mk('span');                                       // one text item for the flex anchor; prose() turns "z^n" into a superscript
    prose(label, (it.thread ? threadLinkPrefix(it.thread, it.dir) : '') + it.s.title);
    a.appendChild(label);
    a.dataset.dir = it.dir;
    if (it.thread) { a.dataset.thread = it.thread; a.title = (it.dir === 'prev' ? 'Previous' : 'Next') + ' on thread ' + it.thread; }
    nav.appendChild(a);
  }
  return nav;
}

function chipRow(id, label, items, labelId) {
  const wrap = mk('div', 'ln-group');
  wrap.appendChild(mk('span', 'field-label', { id: labelId }, label));
  const chips = mk('div', 'chips', { id, role: 'group', 'aria-labelledby': labelId });
  const buttons = new Map();
  for (const [key, id2, text] of items) {
    const b = mk('button', 'chip', { type: 'button', id: id2, 'aria-pressed': 'false' }, text);
    buttons.set(key, b);
    chips.appendChild(b);
  }
  wrap.appendChild(chips);
  return { wrap, buttons };
}

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  ensureStyle();
  const mv = (window.__mv = window.__mv || {});
  const { key: startKey, input: startInput, unknown } = resolvePreset(ctx.preset);
  const reduced = () => { try { return !!(ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion()); } catch (e) { return false; } };
  let destroyed = false;
  const P0 = PRESETS[startKey];

  // ---- state
  const S = {
    preset: startKey, a: copyZ(P0.a), b: copyZ(P0.b), c: copyZ(COMPOSE_DEFAULTS.c), d: copyZ(COMPOSE_DEFAULTS.d),
    cOk: true, dOk: true, input: startInput, stroke: null, drawing: null, grid: P0.grid,
    stage: 3, clock: startInput === 'stroke' ? 0.5 : P0.t, playing: false, vectors: true,
    inCurve: null, pieces: [], gridZ: [], gridW: [],
  };

  // ---- DOM
  const header = buildHeader(ctx);
  const card = mk('section', 'panel', { id: 'linear-problem', 'aria-labelledby': 'linear-problem-title' });
  card.dataset.tone = 'accent';
  let disposeCard = renderProblemCard(card, P0.card);

  const presetPanel = mk('section', 'panel', { 'aria-labelledby': 'linear-presets-title' });
  presetPanel.appendChild(mk('h2', 'panel-subtitle', { id: 'linear-presets-title' }, 'Choose a problem'));
  presetPanel.lastChild.style.marginTop = '0';
  const presetList = mk('div', 'chips', { id: 'linear-presets', role: 'group', 'aria-labelledby': 'linear-presets-title' });
  const presetButtons = new Map();
  for (const [k, id, text] of [['2.1.3', 'linear-preset-2-1-3', '2.1.3: the line x = 2'], ['P3', 'linear-preset-P3', 'P3: two maps in a row'], ['P4', 'linear-preset-P4', 'P4: the unit circle']]) {
    const b = mk('button', 'chip', { type: 'button', id, 'aria-pressed': 'false' }, text);
    presetButtons.set(k, b);
    presetList.appendChild(b);
  }
  presetPanel.appendChild(presetList);
  if (unknown !== null) {
    const nt = mk('p', 'muted', { id: 'linear-note-token', role: 'status' });
    nt.textContent = `I do not know a setting called "${String(unknown).slice(0, 40)}". Showing problem 2.1.3.`;
    presetPanel.appendChild(nt);
  }

  // the stage block: two planes and the sticky stage bar
  const zHost = mk('div'), wHost = mk('div');
  const zFig = mk('figure', 'panel ln-fig');
  const zCap = mk('figcaption');
  zCap.append('z-plane (input) ', mk('span', 'muted', null, 'z = x + iy'));
  zFig.append(zCap, zHost);
  const wFig = mk('figure', 'panel ln-fig');
  const wCap = mk('figcaption');
  wCap.append('w-plane (output) ', mk('span', 'muted', null, 'w = u + iv'));
  // The off-screen note is laid over the bottom of the w-plane, not placed under it: nothing above the control plane may grow or
  // shrink while a handle is being dragged, or the plane moves out from under the pointer.
  const offscreen = mk('p', 'ln-offscreen', { id: 'linear-offscreen', role: 'status' }, COPY.offscreen);
  offscreen.hidden = true;
  const wWrap = mk('div', 'ln-wwrap');
  wWrap.append(wHost, offscreen);
  wFig.append(wCap, wWrap);
  const twoPlanes = mk('div', 'two-planes');
  twoPlanes.append(zFig, wFig);

  const bar = mk('div', 'ln-bar', { id: 'linear-stage-bar' });
  const sliderRow = mk('div', 'ln-slider');
  const stageSlider = mk('input', '', { type: 'range', id: 'linear-stage', min: '0', max: '3', step: '0.01', value: '3' });
  const stageOut = mk('output', '', { id: 'linear-stage-out', for: 'linear-stage' }, '3');
  const ticks = mk('p', 'ln-ticks', { 'aria-hidden': 'true' });
  ['start', 'spin', 'stretch', 'slide'].forEach((w, k) => { const sp = mk('span', '', null, w); sp.style.left = (k * 100 / 3) + '%'; ticks.appendChild(sp); });   // under stages 0, 1, 2, 3
  const track = mk('div', 'ln-track');
  track.append(stageSlider, ticks);
  sliderRow.append(mk('label', '', { for: 'linear-stage' }, 'Stage'), track, stageOut);
  const barRow = mk('div', 'ln-bar-row');
  const playBtn = mk('button', 'btn', { type: 'button', id: 'linear-play', title: 'Play the three moves, one after another' }, reduced() ? 'Next stage' : 'Play');
  const stageCap = mk('p', 'ln-caption', { id: 'linear-stage-caption', 'aria-live': 'off' });
  barRow.append(playBtn, stageCap);
  bar.append(sliderRow, barRow);
  const stageBlock = mk('div', 'ln-stage');
  stageBlock.append(twoPlanes, bar);

  // controls
  const controls = mk('section', 'panel ln-controls', { 'aria-label': 'What to move and what to carry along' });
  const inputsRow = chipRow('linear-inputs', 'Shape to move', [['x2', 'linear-input-x2', 'The line x = 2'], ['unit', 'linear-input-unit', 'The unit circle'], ['stroke', 'linear-input-stroke', 'Draw my own stroke']], 'linear-inputs-label');
  const clearBtn = mk('button', 'btn', { type: 'button', id: 'linear-stroke-clear' }, 'Clear the stroke');
  clearBtn.disabled = true;
  inputsRow.wrap.appendChild(clearBtn);
  const strokeHint = mk('p', 'muted', { id: 'linear-stroke-hint', role: 'status' });
  strokeHint.hidden = true;
  const gridRow = chipRow('linear-grids', 'Grid to carry along', [['cart', 'linear-grid-cart', 'Square grid'], ['polar', 'linear-grid-polar', 'Polar grid'], ['off', 'linear-grid-off', 'No grid']], 'linear-grids-label');
  const vecLabel = mk('label', 'check');
  const vecBox = mk('input', '', { type: 'checkbox', id: 'linear-vectors' });
  vecBox.checked = true;
  vecLabel.append(vecBox, 'Show the arrows for a and b');
  gridRow.wrap.appendChild(vecLabel);
  const vecHint = mk('p', 'ln-hint', null, COPY.vectorsHint);
  const followRow = mk('div', 'ln-group');
  const tSliderRow = mk('div', 'slider-row');
  tSliderRow.style.flex = '1 1 18rem';
  const tSlider = mk('input', '', { type: 'range', id: 'linear-t', min: '0', max: '1', step: '0.005', value: String(S.clock) });
  const tOut = mk('output', '', { id: 'linear-t-out', for: 'linear-t' }, '');
  tSliderRow.append(mk('label', '', { for: 'linear-t' }, 'Follow one point (time t)'), tSlider, tOut);
  const fitBtn = mk('button', 'btn', { type: 'button', id: 'linear-fit' }, 'Fit both planes');
  followRow.append(tSliderRow, fitBtn);
  controls.append(inputsRow.wrap, strokeHint, gridRow.wrap, vecHint, followRow);

  // choose a and b, the readout, the staircase of arg a
  const abPlaneHost = mk('div'), stairsHost = mk('div');
  const abPanel = mk('section', 'panel', { 'aria-labelledby': 'linear-ab-title' });
  abPanel.append(mk('h2', 'panel-title', { id: 'linear-ab-title' }, 'Choose a and b'), abPlaneHost, mk('p', 'ln-hint', null, COPY.abHint));
  const readout = mk('div', 'readout', { id: 'linear-readout' });
  const readPanel = mk('section', 'panel', { 'aria-label': 'The numbers' });
  const stairsNote = mk('p', 'ln-hint', null, COPY.stairsNote);
  const zeroNote = mk('p', 'ln-error', { id: 'linear-note', role: 'status' }, COPY.zeroNote);        // beside the plane (below it on a phone), never above it
  zeroNote.hidden = true;
  readPanel.append(readout, zeroNote, stairsHost, stairsNote);
  readPanel.style.display = 'flex';
  readPanel.style.flexDirection = 'column';
  readPanel.style.gap = 'var(--space-3)';
  const abGrid = mk('div', 'ln-ab');
  abGrid.append(abPanel, readPanel);

  // the main explainer
  const exPanel = mk('section', 'panel', { 'aria-labelledby': 'linear-ex-title' });
  exPanel.appendChild(mk('h2', 'panel-title', { id: 'linear-ex-title' }, 'One point, followed through f'));
  const exHost = mk('div');
  exPanel.appendChild(exHost);

  // the composition panel (P3)
  const composePanel = mk('section', 'panel ln-compose', { id: 'linear-compose', 'aria-labelledby': 'linear-compose-title' });
  composePanel.dataset.tone = 'cart';
  composePanel.appendChild(mk('h2', 'panel-title', { id: 'linear-compose-title' }, 'P3: one map after another'));
  composePanel.appendChild(mk('p', '', null, COPY.composeIntro));
  const cInput = mk('input', '', { type: 'text', inputmode: 'text', autocomplete: 'off', spellcheck: 'false', id: 'linear-compose-c', value: COMPOSE_DEFAULTS.cText });
  const dInput = mk('input', '', { type: 'text', inputmode: 'text', autocomplete: 'off', spellcheck: 'false', id: 'linear-compose-d', value: COMPOSE_DEFAULTS.dText });
  const inputsBox = mk('div', 'ln-inputs');
  const fieldC = mk('div', 'field'), fieldD = mk('div', 'field');
  fieldC.append(mk('label', '', { for: 'linear-compose-c' }, 'c'), cInput);
  fieldD.append(mk('label', '', { for: 'linear-compose-d' }, 'd'), dInput);
  inputsBox.append(fieldC, fieldD);
  const composeError = mk('p', 'ln-error', { id: 'linear-compose-error', role: 'alert' });
  const composeReadoutEl = mk('div', 'readout', { id: 'linear-compose-readout' });
  const composeHalf = [mk('span', 'ln-nw'), mk('span', 'ln-nw')];
  composeReadoutEl.append(composeHalf[0], composeHalf[1]);                       // the text stays 'ac = ...; ad + b = ...' (the space ends the first half)
  const composeNote = mk('p', 'ln-compose-note', { id: 'linear-compose-note', 'data-active': 'false' }, COPY.composeNote);     // always there, so no height changes while a is dragged
  const compHost = mk('div');
  composePanel.append(inputsBox, composeError, composeReadoutEl, composeNote, compHost);

  const back = mk('aside', 'callout');
  back.dataset.tone = 'output';
  const backP = mk('p');
  backP.append('The time ramp, darker early and lighter late, comes from ', mk('a', '', { href: '#curves' }, 'Curves and time'), '.');
  back.appendChild(backP);
  const status = mk('div', 'sr-only', { id: 'linear-status', role: 'status', 'aria-live': 'polite' });
  const links = buildLinks(ctx);
  const labBtn = mk('button', 'btn ln-links-lab', { type: 'button', id: 'linear-open-lab' }, 'Open in the Lab');
  links.appendChild(labBtn);

  const parts = [header, card];
  if (startKey === 'P3') parts.push(composePanel);
  parts.push(presetPanel, stageBlock, controls, abGrid, exPanel);
  if (startKey !== 'P3') parts.push(composePanel);
  parts.push(back, status, links);
  el.append(...parts);

  // ---- planes
  const stageOpts = { xRange: [-5.4, 5.4], yRange: [-4.5, 4.5], grid: 'none', axes: true, interactive: true, maxWidth: 560, legend: true };
  const zplane = createPlane(zHost, { ...stageOpts, id: 'linear-zplane', axisLabels: ['x', 'y'], ariaLabel: 'z-plane: the input shape' });
  const wplane = createPlane(wHost, { ...stageOpts, id: 'linear-wplane', axisLabels: ['u', 'v'], ariaLabel: 'w-plane: the image under f' });
  const abPlane = createPlane(abPlaneHost, {
    id: 'linear-ab', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'both', axes: true, axisLabels: ['x', 'y'],
    interactive: true, maxWidth: 360, legend: false, ariaLabel: 'Choose a and b',
  });

  // ---- keep the control plane still. Nothing above it may change height while a or b moves; the notes are placed beside or over
  // things for that reason. What cannot be fixed at the source is retypeset text: at P3 the composition table sits above the plane
  // and is rewritten a moment after every step. Chromium's scroll anchoring hides that, Safari has none, so do it by hand: while a
  // or b has moved in the last 1.5 s, a size change above the plane scrolls the page by the same amount.
  let anchorUntil = 0, anchorTop = null, ownY = null;
  const planeTop = () => abPlaneHost.getBoundingClientRect().top;
  const holdAnchor = () => {
    const now = performance.now();
    if (now >= anchorUntil || anchorTop === null) anchorTop = planeTop();      // the place to hold: the plane's top when the movement began
    anchorUntil = now + 1500;
  };
  const onPageScroll = () => { if (ownY === null || Math.abs(window.scrollY - ownY) >= 0.5) anchorTop = planeTop(); };    // someone else scrolled: hold the new place
  const onResize = () => {
    if (destroyed || anchorTop === null || performance.now() >= anchorUntil) return;
    const off = planeTop() - anchorTop;                                          // measured against the place held, so rounding cannot add up
    if (Math.abs(off) <= 0.5) return;
    try { window.scrollBy({ top: off, left: 0, behavior: 'instant' }); } catch (e) { window.scrollBy(0, off); }
    ownY = window.scrollY;
  };
  let sizeWatch = null;                                                          // started at the very end of mount, with the window listener

  // pointer drags are pulled to the 0.5 lattice; keyboard nudges are not (Alt + arrow can leave a lattice point)
  const magnet = (z) => {
    const m = C(Math.round(2 * z.re) / 2 + 0, Math.round(2 * z.im) / 2 + 0);
    return Math.hypot(z.re - m.re, z.im - m.im) < 0.12 ? m : C(z.re, z.im);
  };
  let ptr = false;
  const snapAB = (z) => (ptr ? magnet(z) : copyZ(z));
  const aHandle = abPlane.addPoint({ id: 'a', z: S.a, color: '--polar', label: 'a', name: 'a', step: 0.5, snap: snapAB,
    onDragStart: () => { ptr = true; holdAnchor(); },
    onDrag: (z, info) => { if (destroyed) return; holdAnchor(); if (info && info.final) ptr = false; S.a = copyZ(z); scheduleFlush({ image: true, compose: true }); } });
  const bHandle = abPlane.addPoint({ id: 'b', z: S.b, color: '--cart', label: 'b', name: 'b', step: 0.5, snap: snapAB,
    onDragStart: () => { ptr = true; holdAnchor(); },
    onDrag: (z, info) => { if (destroyed) return; holdAnchor(); if (info && info.final) ptr = false; S.b = copyZ(z); scheduleFlush({ image: true, compose: true }); } });

  // control-plane layers: b is a slide (dashed drop lines), a is a spin and a stretch (ray, arc, ghost windings)
  abPlane.addLayer((c, p) => {
    if (abs(S.b) > 1e-9) {
      drawSegment(c, p, ZERO, S.b, { color: '--cart', arrow: true, width: 2, obstacle: true });
      drawCartAddress(c, p, S.b, { color: '--cart', labels: true });
    }
    if (abs(S.a) >= 1e-9) drawPolarAddress(c, p, S.a, { color: '--polar', labels: true, ghosts: 2, ghostsNeg: 1, name: 'a' });
  }, { order: 0 });

  // the carried grid is drawn by the station, so the w-plane shows only the grid that moved
  const gridLayer = (plane, getCurves) => plane.addLayer((c, p) => {
    const alpha = ctx.theme.getTheme() === 'dark' ? 0.5 : 0.4;
    for (const cu of getCurves()) {
      drawTimedCurve(c, p, cu.points, { color: cu.family === 'cart' ? '--cart' : cu.family === 'polar' ? '--polar' : '--text-muted',
        ramp: false, dots: false, arrow: false, width: 1, alpha });
    }
  }, { order: 10 });
  gridLayer(zplane, () => S.gridZ);
  gridLayer(wplane, () => S.gridW);
  const zCurve = zplane.addCurve({ id: 'input', points: [], color: '--input', ramp: true, width: 3, dots: true, arrow: true, closed: false, order: 100, obstacle: true });
  const ghost = wplane.addCurve({ id: 'ghost', points: [], color: '--input', ramp: false, width: 2, dots: false, arrow: false, dash: DASH.guide, alpha: 0.45, order: 50 });
  const imageLayers = [];
  zplane.addLayer((c, p) => {                                    // the stroke being drawn (raw samples, before the release)
    if (!S.drawing || S.drawing.samples.length < 2) return;
    drawTimedCurve(c, p, S.drawing.samples.map((z) => ({ re: z.re, im: z.im })), { color: '--input', width: 2.5, dots: false, arrow: false, ramp: false });
  }, { order: 120 });

  const mid = (u, v) => C((u.re + v.re) / 2, (u.im + v.im) / 2);
  const fixedWord = (p) => (p.getSize().w < NARROW_PLANE ? 'p' : 'fixed point');      // 'fixed point' is wider than the gap to the input line on a phone
  const DOT_BOX = 7;                                              // px: the box around a dot that no word may sit on
  // Every word on these two planes goes through the plane's label placer: it knows the tick numbers, the axes, the arrows and curves
  // drawn with `obstacle`, the dots registered below and every word placed before it in the frame, so two words never print over each
  // other (the merged "f(0), f(1)" and the fixed-point word used to, on a phone). The most important word goes first.
  zplane.addLayer((c, p) => {                                    // marks: the unit step 0 to 1, the dots at 0 and 1, the fixed point
    const put = createLabelPlacer(c, p);
    const fp = fixedPoint(S.a, S.b), one = C(1, 0);
    if (S.vectors) drawSegment(c, p, ZERO, one, { color: '--text-muted', arrow: true, width: 2, obstacle: true });
    drawDot(c, p, ZERO, { color: '--text', radius: 4 });
    drawDot(c, p, one, { color: '--text', radius: 4 });
    registerObstacle(p, { at: ZERO, radius: DOT_BOX });
    registerObstacle(p, { at: one, radius: DOT_BOX });
    if (fp) { drawDot(c, p, fp, { color: '--text', radius: 5 }); registerObstacle(p, { at: fp, radius: DOT_BOX + 1 }); }
    put('0', spotsAround(ZERO));
    put('1', spotsAround(one));
    if (fp) put(fixedWord(p), spotsAround(fp, BELOW));
  }, { order: 150 });
  wplane.addLayer((c, p) => {                                    // marks: the arrows for a and b, f(0), f(1), the fixed point
    const put = createLabelPlacer(c, p);
    const fp = fixedPoint(S.a, S.b), f = stageMap(S.a, S.b, S.stage), info = stageInfo(S.stage);
    const w0 = f(ZERO), w1 = f(C(1, 0)), done3 = info.stage === 3 && info.done;
    const narrow = p.getSize().w < NARROW_PLANE;                  // on a phone the labels a, b, f(0), f(1) would sit on top of each other
    if (S.vectors) {
      if (abs(w0) > 1e-9) drawSegment(c, p, ZERO, w0, { color: '--cart', dash: DASH.cart, arrow: true, width: 2.5, obstacle: true });
      if (abs(sub(w1, w0)) > 1e-9) drawSegment(c, p, w0, w1, { color: '--polar', arrow: true, width: 2.5, obstacle: true });
    }
    const q0 = p.toPixel(w0), q1 = p.toPixel(w1);
    const same = abs(sub(w1, w0)) < 1e-9, close = Math.hypot(q0.x - q1.x, q0.y - q1.y) < CLOSE_DOTS;
    const [word0, word1] = dotWords({ done: done3, same, close });
    drawDot(c, p, w0, { color: '--text', radius: 4 });
    drawDot(c, p, w1, { color: '--text', radius: 4 });
    registerObstacle(p, { at: w0, radius: DOT_BOX });
    registerObstacle(p, { at: w1, radius: DOT_BOX });
    if (fp && done3) { drawDot(c, p, fp, { color: '--text', radius: 5 }); registerObstacle(p, { at: fp, radius: DOT_BOX + 1 }); }
    // f(0) and f(1): one word for two dots close together goes beside the pair, level with its middle, not beside one of them
    if (word0) put(word0, close && !same ? spotsAround(mid(w0, w1), PAIR) : spotsAround(w0));
    if (word1) put(word1, spotsAround(w1));
    if (fp && done3) put(fixedWord(p), spotsAround(fp));
    if (S.vectors && done3 && !narrow) {
      put('a', spotsAround(mid(w0, w1), ARROW_WORD), { color: '--polar' });
      if (abs(w0) > 1e-9) put('b', spotsAround(scale(w0, 0.3), ARROW_WORD), { color: '--cart' });          // 30% along, not in the middle: at 2.1.3 the middle of the b arrow is the dot f(1)
    }
  }, { order: 150 });

  // ---- explainers and the staircase
  const threeCols = [
    { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true },
    { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true },
    { key: 'motion', heading: 'As a motion', tone: '--output', short: 'motion' },
  ];
  const exMain = createExplainer(exHost, { id: 'linear-ex', columns: threeCols, rows: explainerRows(), same: explainerSame });
  const exComp = createExplainer(compHost, { id: 'linear-comp-ex', columns: threeCols, rows: composeRows(), same: composeSame });
  const stairs = createStaircase(stairsHost, { id: 'linear-stairs', label: 'arg a', kMin: -1, kMax: 1 });

  // ---- status line for screen readers (debounced)
  let statusTimer = 0;
  function say(text) {
    if (destroyed) return;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusTimer = 0; if (!destroyed) status.textContent = text; }, 400);
  }

  // ---- flush: one recompute per animation frame, only what changed
  const pending = { input: false, grid: false, image: false, cursor: false, compose: false };
  let rafFlush = 0;
  function scheduleFlush(flags) {
    if (flags) for (const k of Object.keys(flags)) if (flags[k]) pending[k] = true;
    if (!rafFlush && !destroyed) rafFlush = requestAnimationFrame(flush);
  }
  function flushNow() {
    if (rafFlush) { cancelAnimationFrame(rafFlush); rafFlush = 0; }
    flush();
  }

  let published = null;
  function publishImage(pieces) {
    const points = pieces.flatMap((pc) => pc.points.map((p) => ({ re: p.re, im: p.im, t: p.t })));
    Object.defineProperty(points, 'points', { value: points, enumerable: false });
    published = points;
    mv.linearImage = points;                                       // a new array every time, never mutated
  }
  function syncImageLayers(pieces) {
    for (let i = 0; i < pieces.length; i++) {
      if (imageLayers[i]) imageLayers[i].update(pieces[i].points);
      else imageLayers.push(wplane.addCurve({ id: 'image' + i, points: pieces[i].points, color: '--output', ramp: true, width: 3, dots: true, arrow: true, closed: false, order: 100, obstacle: true }));
    }
    while (imageLayers.length > pieces.length) imageLayers.pop().remove();
  }
  function noPointInView(pieces, plane) {
    const v = plane.getView(), sz = plane.getSize(), halfW = v.unitsAcross / 2, halfH = sz.w > 0 ? halfW * sz.h / sz.w : halfW;
    return pieces.every((pc) => pc.points.every((p) => Math.abs(p.re - v.center.re) > halfW || Math.abs(p.im - v.center.im) > halfH));
  }
  let strokeOverride = '';
  function setStrokeHint() {
    let text = '';
    if (S.input === 'stroke') {
      if (strokeOverride) text = strokeOverride;
      else if (!S.stroke) text = COPY.strokeHint;
      let phone = false;
      try { phone = !!window.matchMedia('(max-width: 30rem)').matches; } catch (e) { phone = false; }
      if (phone) text = text ? text + ' ' + COPY.strokePhone : COPY.strokePhone;
    }
    strokeHint.textContent = text;
    strokeHint.hidden = !text;
  }

  function flush() {
    rafFlush = 0;
    if (destroyed) return;
    if (pending.input) {
      S.inCurve = S.input === 'stroke' ? S.stroke : inputCurve(S.input);
      const pts = S.inCurve ? S.inCurve.points : [];
      zCurve.update(pts);
      ghost.update(pts);
      tSlider.disabled = !S.inCurve;
      clearBtn.disabled = !(S.input === 'stroke' && S.stroke);
      setStrokeHint();
      pending.image = true;
    }
    if (pending.grid) { S.gridZ = gridCurves(S.grid); pending.image = true; }
    if (pending.image) {
      const clampRadius = clampRadiusFor(wplane.getView(), wplane.getSize()), f = stageMap(S.a, S.b, S.stage);
      S.pieces = imagePieces(S.inCurve, S.a, S.b, S.stage, clampRadius);
      syncImageLayers(S.pieces);
      S.gridW = pushForwardAll(S.gridZ, f, { clampRadius });
      publishImage(S.pieces);
      offscreen.hidden = !(S.inCurve && (S.pieces.length === 0 || noPointInView(S.pieces, wplane)));    // nothing to show, or nothing in view
    }
    zCurve.setCursor(S.inCurve ? S.clock : null);
    for (const l of imageLayers) l.setCursor(S.inCurve ? S.clock : null);
    const caption = stageCaption(S.a, S.b, S.stage), zero = abs(S.a) < 1e-9;
    prose(readout, readoutText(S.a, S.b));                         // e^(i 1.571) as a superscript; the text is what readoutText returns
    stageCap.textContent = caption;
    stageOut.textContent = fmtNum(S.stage, 2);
    stageSlider.setAttribute('aria-valuetext', caption);
    if (Number(stageSlider.value) !== S.stage) stageSlider.value = String(S.stage);
    if (Number(tSlider.value) !== S.clock) tSlider.value = String(S.clock);
    tOut.textContent = fmtNum(S.clock, 3);
    zeroNote.hidden = !zero;
    stairs.update(zero ? null : Arg(S.a));
    const zt = S.inCurve ? pointAt(S.inCurve, S.clock) : null;
    exMain.update(explainerState(S.a, S.b, zt));
    if (pending.compose || pending.image || pending.cursor) exComp.update(composeState(S.a, S.b, S.c, S.d, zt));
    const half = composeReadoutParts(S.a, S.b, S.c, S.d);
    composeHalf[0].textContent = half[0] + ' '; composeHalf[1].textContent = half[1];
    composeNote.dataset.active = String(zero || abs(S.c) < 1e-9);
    for (const k of Object.keys(pending)) pending[k] = false;
    zplane.requestDraw(); wplane.requestDraw(); abPlane.requestDraw();
  }

  // ---- presets, inputs, grids, vectors, fit
  function setChips() {
    for (const [k, b] of presetButtons) b.setAttribute('aria-pressed', String(k === S.preset));
    for (const [k, b] of inputsRow.buttons) b.setAttribute('aria-pressed', String(k === S.input));
    for (const [k, b] of gridRow.buttons) b.setAttribute('aria-pressed', String(k === S.grid));
    composePanel.dataset.active = String(S.preset === 'P3');
  }
  function setInput(kind) {
    S.input = kind;
    zplane.setDrawMode(kind === 'stroke');
    strokeOverride = '';
    setChips();
    scheduleFlush({ input: true });
  }
  function loadPreset(key, fromChip = false) {
    const p = PRESETS[key];
    S.preset = key; S.a = copyZ(p.a); S.b = copyZ(p.b); S.input = p.input; S.grid = p.grid; S.stage = 3; S.clock = p.t;
    S.c = copyZ(COMPOSE_DEFAULTS.c); S.d = copyZ(COMPOSE_DEFAULTS.d);
    cInput.value = COMPOSE_DEFAULTS.cText; dInput.value = COMPOSE_DEFAULTS.dText;
    cInput.removeAttribute('aria-invalid'); dInput.removeAttribute('aria-invalid');
    composeError.textContent = '';
    S.cOk = true; S.dOk = true;
    aHandle.set(S.a, { silent: true }); bHandle.set(S.b, { silent: true });
    strokeOverride = '';
    setChips();
    disposeCard();
    disposeCard = renderProblemCard(card, p.card);
    zplane.setDrawMode(false);
    scheduleFlush({ input: true, grid: true, image: true, cursor: true, compose: true });
    say(stageCaption(S.a, S.b, S.stage));
    if (key === 'P3' && fromChip) composePanel.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
  }
  function fitBoth() {
    const pts = [ZERO, C(1, 0), copyZ(S.b), add(S.a, S.b)];
    if (S.inCurve) for (let k = 0; k < S.inCurve.points.length; k += 4) { const z = S.inCurve.points[k]; pts.push(z, add(mul(S.a, z), S.b)); }
    zplane.fitTo(pts, 0.12);
    wplane.setView(zplane.getView());
    wplane.setHome();
    scheduleFlush({ image: true });
  }

  // ---- stage play
  let rafPlay = 0, lastTs = null;
  const nextWhole = (s) => { const k = Math.floor(s + 1e-9) + 1; return k > 3 ? 0 : k; };
  function setPlayLabel(label) { playBtn.textContent = label; }
  function stopPlay(label = 'Play') {
    S.playing = false;
    if (rafPlay) cancelAnimationFrame(rafPlay);
    rafPlay = 0;
    setPlayLabel(reduced() ? 'Next stage' : label);
  }
  function tick(ts) {
    rafPlay = 0;
    if (!S.playing || destroyed) return;
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    S.stage = Math.min(3, S.stage + dt / STAGE_SECONDS);
    scheduleFlush({ image: true });
    if (S.stage >= 3) { stopPlay('Replay'); return; }
    rafPlay = requestAnimationFrame(tick);
  }
  function startPlay() {
    if (destroyed) return;
    if (reduced()) { if (S.playing) stopPlay(); S.stage = nextWhole(S.stage); scheduleFlush({ image: true }); say(stageCaption(S.a, S.b, S.stage)); return; }
    if (S.playing) { stopPlay('Play'); return; }                  // a second press pauses
    if (S.stage >= 3 - 1e-9) S.stage = 0;
    S.playing = true;
    lastTs = null;
    setPlayLabel('Pause');
    rafPlay = requestAnimationFrame(tick);
  }

  // ---- stroke drawing (only acts in draw mode)
  const offDown = zplane.on('pointerdown', (e) => {
    if (destroyed || S.input !== 'stroke' || !e.isPrimary || S.drawing) return;
    S.drawing = { id: e.pointerId, samples: [e.z] };
    strokeOverride = '';
    setStrokeHint();
    zplane.requestDraw();
  });
  const offMove = zplane.on('pointermove', (e) => {
    if (destroyed || !S.drawing || e.pointerId !== S.drawing.id) return;
    const last = S.drawing.samples[S.drawing.samples.length - 1];
    if (S.drawing.samples.length < 3000 && Math.hypot(e.z.re - last.re, e.z.im - last.im) >= 0.5 / zplane.getView().scale) S.drawing.samples.push(e.z);
    zplane.requestDraw();
  });
  const endStroke = (e) => {
    if (destroyed || !S.drawing || e.pointerId !== S.drawing.id) return;
    let raw = S.drawing.samples;
    if (e.z) raw = raw.concat([e.z]);
    S.drawing = null;
    const c = freehand(raw, { minDist: 0.03 });
    if (c.points.length < 2 || curveLength(c) < 0.2) {
      strokeOverride = COPY.strokeShort;
      setStrokeHint();
      zplane.requestDraw();
      return;
    }
    S.stroke = c;
    scheduleFlush({ input: true });
    say('Stroke drawn. It moves with the plane on the right.');
  };
  const offUp = zplane.on('pointerup', endStroke);
  const offCancel = zplane.on('pointercancel', endStroke);

  // ---- events
  for (const [k, b] of presetButtons) b.addEventListener('click', () => { if (!destroyed) loadPreset(k, true); });
  for (const [k, b] of inputsRow.buttons) b.addEventListener('click', () => { if (!destroyed) setInput(k); });
  for (const [k, b] of gridRow.buttons) b.addEventListener('click', () => { if (destroyed) return; S.grid = k; setChips(); scheduleFlush({ grid: true }); });
  clearBtn.addEventListener('click', () => { if (destroyed) return; S.stroke = null; strokeOverride = ''; scheduleFlush({ input: true }); });
  vecBox.addEventListener('change', () => { S.vectors = vecBox.checked; zplane.requestDraw(); wplane.requestDraw(); });
  fitBtn.addEventListener('click', () => { if (!destroyed) fitBoth(); });
  stageSlider.addEventListener('input', () => {
    if (destroyed) return;
    stopPlay();
    S.stage = clamp(Number(stageSlider.value), 0, 3);
    scheduleFlush({ image: true });
    say(stageCaption(S.a, S.b, S.stage));
  });
  playBtn.addEventListener('click', startPlay);
  tSlider.addEventListener('input', () => {
    if (destroyed) return;
    S.clock = clamp(Number(tSlider.value), 0, 1);
    scheduleFlush({ cursor: true });
  });
  const onCompose = (which, input) => () => {
    if (destroyed) return;
    const r = parseConstant(input.value);
    if (!r.ok) { input.setAttribute('aria-invalid', 'true'); S[which + 'Ok'] = false; S[which + 'Err'] = r.message; }
    else { input.removeAttribute('aria-invalid'); S[which] = r.z; S[which + 'Ok'] = true; S[which + 'Err'] = ''; }
    composeError.textContent = !S.cOk ? S.cErr : !S.dOk ? S.dErr : '';           // the first message, c before d
    scheduleFlush({ compose: true });
  };
  cInput.addEventListener('input', onCompose('c', cInput));
  dInput.addEventListener('input', onCompose('d', dInput));
  labBtn.addEventListener('click', () => {
    if (destroyed) return;
    ctx.store.set('lab.request', labRequest({ a: S.a, b: S.b, input: S.input }), { persist: false });
    ctx.navigate('lab');
  });

  // ---- first render (synchronous, so the readout, the explainers and linearImage exist at once), then the hooks
  setChips();
  zplane.setDrawMode(S.input === 'stroke');
  for (const k of Object.keys(pending)) pending[k] = true;
  flushNow();

  const hook = {
    state() { return { preset: S.preset, a: copyZ(S.a), b: copyZ(S.b), c: copyZ(S.c), d: copyZ(S.d), input: S.input, grid: S.grid, stage: S.stage, t: S.clock, playing: S.playing }; },
    stroke() { return S.stroke ? S.stroke.points.map((p) => ({ re: p.re, im: p.im, t: p.t })) : null; },
    pieces() { return S.pieces.map((pc) => ({ ...pc, points: pc.points.map((p) => ({ re: p.re, im: p.im, t: p.t })) })); },
  };
  mv.linear = hook;
  const offView = wplane.on('viewchange', () => { scheduleFlush({ image: true }); });       // attached last: the clamp radius follows the view
  // The page-level pieces of the plane keeper go last (ARCHITECTURE 10.1.4): a throw above leaves nothing attached to the window.
  try { if (typeof ResizeObserver === 'function') { sizeWatch = new ResizeObserver(onResize); for (const child of el.children) sizeWatch.observe(child); } } catch (e) { sizeWatch = null; }
  window.addEventListener('scroll', onPageScroll, { passive: true });

  return function unmount() {
    if (destroyed) return;
    destroyed = true;
    if (rafPlay) cancelAnimationFrame(rafPlay);
    if (rafFlush) cancelAnimationFrame(rafFlush);
    rafPlay = 0; rafFlush = 0;
    clearTimeout(statusTimer);
    for (const off of [offView, offDown, offMove, offUp, offCancel]) { try { off(); } catch (e) { /* already gone */ } }
    window.removeEventListener('scroll', onPageScroll);
    if (sizeWatch) { try { sizeWatch.disconnect(); } catch (e) { /* already gone */ } }
    disposeCard();
    for (const part of [zplane, wplane, abPlane, exMain, exComp, stairs]) { try { part.destroy(); } catch (e) { /* already gone */ } }
    if (mv.linear === hook) delete mv.linear;
    if (published && mv.linearImage === published) delete mv.linearImage;
  };
}
