// js/stations/roots.js: station "Roots: Divide the Staircase" (problems 1.4.1, 1.4.2, 1.4.3).
//
// The student gives a number c and a count n. The station draws c once with its staircase of angles (the set arg c, with
// Arg c highlighted), divides every step by n, and shows the n roots as the vertices of a regular n-gon on the circle of
// radius |c|^(1/n). Step n lands back on step 0 (drawn ghosted), which is why there are exactly n roots. For c = 1 the
// primitive roots are marked. A raise animation spirals a chosen root back to c. A separate panel solves the quadratic
// formula as "complete the square, take a square root of d, slide by h".
//
// Every root comes from complex.js (rootsOf, quadraticRoots); primitive badges only exist when c = 1 (isOne). The pure
// helpers below are named exports and the module has no top-level DOM access, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-roots-principal.md.

import { Arg, wrapArg, abs as cabs, sub, add, mul, pow as cpow, sqrt as csqrt, fromPolar, rootsOf, isPrimitiveRoot, quadraticRoots, eq,
         fmtNum, fmtCart, fmtAngle, texNumber, texAngle, texCart } from '../core/complex.js';
import { createPlane, drawCircle, drawSegment, drawLabel, drawDot, drawSeam, drawCartAddress, drawPolarAddress,
         registerObstacle, createLabelPlacer, sideCands, cssColor, niceGridStep, DASH } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, cart, polar, prose } from '../core/katex.js';
import { problemsForStation, problemById, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { threadLabel, threadLinkPrefix } from '../registry.js';

// ---------------------------------------------------------------- constants

export const N_MIN = 2, N_MAX = 12, C_MAX = 100, COMPACT_FROM_N = 8;

const ZERO = Object.freeze({ re: 0, im: 0 });
const ONE = Object.freeze({ re: 1, im: 0 });
const TWO_PI = 2 * Math.PI;
const BIG_MSG = 'That is a big number. Keeping |c| at 100 or less so the picture stays readable.';
const C_LADDER = Object.freeze([2, 3, 4, 6, 8, 12, 20, 32, 50, 80, 125]);
// The root plane is fitted to the roots only (never to c). The small rungs keep the n-gon readable for a tiny |c|; 1.5 is the floor for 1 and for c = 0.
const Z_LADDER = Object.freeze([0.05, 0.1, 0.2, 0.4, 0.75, 1.5, 2, 3, 4, 6, 8, 12, 16]);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };   // gcd(0, n) = n
const A = (x) => fmtAngle(x, { unicode: true });   // angles in readouts and notes, with the π typeset
const Z = (z) => fmtCart(z);
const N = (x) => fmtNum(x);

export const PRESETS = Object.freeze({
  '1': Object.freeze({ c: Object.freeze({ re: 1, im: 0 }), n: 5, label: 'c = 1, n = 5', problem: '1.4.1' }),
  'm16': Object.freeze({ c: Object.freeze({ re: -16, im: 0 }), n: 4, label: 'c = -16, n = 4', problem: '1.4.2' }),
  'i': Object.freeze({ c: Object.freeze({ re: 0, im: 1 }), n: 3, label: 'c = i, n = 3', problem: null }),
  '2i': Object.freeze({ c: Object.freeze({ re: 0, im: 2 }), n: 2, label: 'c = 2i, n = 2', problem: null }),
});
const PRESET_IDS = Object.freeze({ '1': 'roots-preset-1', 'm16': 'roots-preset-m16', 'i': 'roots-preset-i', '2i': 'roots-preset-2i' });
const TOKEN_KEYS = Object.freeze({ unity: '1', m16: 'm16', i: 'i', '2i': '2i' });

// ---------------------------------------------------------------- the model (pure)

// The n-th roots of c and everything the picture and the list need.
export function rootsModel(c, n) {
  const nn = clamp(Math.round(Number.isFinite(n) ? n : N_MIN), N_MIN, N_MAX);
  const cz = { re: Number(c && c.re), im: Number(c && c.im) };
  const mod = cabs(cz);
  const zero = !Number.isFinite(mod) || mod < 1e-9;
  if (zero) {
    const roots = Array.from({ length: nn }, () => ({ re: 0, im: 0 }));
    return {
      c: { re: Number.isFinite(cz.re) ? cz.re : 0, im: Number.isFinite(cz.im) ? cz.im : 0 }, n: nn, zero: true, exact: true, mod: 0, rho: 0, Theta: null, roots,
      steps: Array.from({ length: nn + 1 }, (_, k) => ({ k, j: k % nn, raw: null, point: { re: 0, im: 0 }, argPoint: null, ghost: k === nn })),
      isOne: false, primitive: new Array(nn).fill(false), order: new Array(nn).fill(null), primitiveCount: 0,
    };
  }
  const Theta = Arg(cz);
  const rho = Math.pow(mod, 1 / nn);
  const roots = rootsOf(cz, nn);
  const steps = [];
  for (let k = 0; k <= nn; k++) {
    const point = roots[k % nn];
    steps.push({ k, j: k % nn, raw: (Theta + TWO_PI * k) / nn, point, argPoint: wrapArg(Arg(point)), ghost: k === nn });
  }
  const isOne = cabs(sub(cz, ONE)) < 1e-9;
  const primitive = Array.from({ length: nn }, (_, k) => isOne && isPrimitiveRoot(k, nn));
  const order = Array.from({ length: nn }, (_, k) => (isOne ? nn / gcd(k, nn) : null));
  // exact: both parts of c are whole numbers (the presets, -9, ...). Only then does the explainer use fractions and radicals; a typed
  // decimal such as 0.3 - 0.7i prints as a decimal there too, like the readout (ARCHITECTURE 10.4.5: one form per quantity per view).
  const exact = Number.isInteger(cz.re) && Number.isInteger(cz.im);
  return { c: cz, n: nn, zero: false, exact, mod, rho, Theta, roots, steps, isOne, primitive, order, primitiveCount: primitive.filter(Boolean).length };
}

// "2 e^(i 5pi/4)", "e^(i 0)", "e^(-i pi/4)": the polar form (coefficient 1 dropped) with the angle kept as given.
export function polarText(rho, theta) {
  const R = fmtNum(rho), a = fmtAngle(theta, { unicode: true });
  const neg = a.startsWith('-');
  const body = `e^(${neg ? '-' : ''}i ${neg ? a.slice(1) : a})`;
  return R === '1' ? body : `${R} ${body}`;
}

// One line of the list: "k = 2: 2 e^(i 5pi/4) = <x + iy> (Arg -3pi/4)" plus badges (c = 1 only). The word "primitive"
// is only ever in `badges`, never in `text`.
export function rootLine(M, k) {
  const st = M.steps[k];
  const polarPart = polarText(M.rho, st.raw);
  const cartPart = Z(st.point);
  const argText = `(Arg ${A(st.argPoint)})`;
  const j = k % M.n;
  const badges = M.isOne ? (M.primitive[j] ? ['primitive', `order ${M.order[j]}`] : [`order ${M.order[j]}`]) : [];
  return {
    k, text: `k = ${k}: ${polarPart} = ${cartPart} ${argText}`, polar: polarPart, cart: cartPart, argText, badges,
    primitive: M.isOne && M.primitive[j], order: M.isOne ? M.order[j] : null,
  };
}

export function rootsReadout(M) {
  if (M.zero) return `c = 0; n = ${M.n}; every root is 0 and Arg c is not defined`;
  return `c = ${Z(M.c)}; n = ${M.n}; |c|^(1/n) = ${N(M.rho)}; Arg c = ${A(M.Theta)}; roots at (Arg c + 2πk)/n; k = 0..${M.n - 1}`;
}

export function wrapNote(M) {
  const n = M.n;
  return `Step ${n} gives (Arg c + ${2 * n}π)/${n} = Arg c/${n} + 2π, the same ray as step 0. That is why there are exactly ${n} roots.`;
}

export function primitiveNote(M) {
  if (M.zero) return '';
  if (!M.isOne) return 'Primitive roots are defined for c = 1 (the roots of unity). Click the c = 1 chip to see them.';
  const count = M.primitiveCount;
  const tail = count === 1 ? 'There is 1 primitive root.' : `There are ${count} primitive roots.`;
  return `A root is primitive when the smallest power m with z^m = 1 is m = ${M.n}. Order d means z^d = 1 first happens at d. ${tail}`;
}

// What the selected step gives. k = 0..n; k = n is the ghost step.
export function pickNote(M, k) {
  if (M.zero) return '';
  const n = M.n;
  const kk = clamp(Math.round(k), 0, n);
  const st = M.steps[kk];
  if (kk === 0) {
    return `Step k = 0 is the home step of c. It gives the angle ${A(st.raw)} and lands on ${Z(st.point)}. This root is the principal root of c; as a point its Arg is ${A(st.argPoint)}.`;
  }
  if (kk === n) {
    const s0 = M.steps[0];
    return `Step k = ${n} gives the angle ${A(st.raw)}, which is ${A(s0.argPoint)} + 2π: the same direction as step 0. It lands on ${Z(s0.point)} again, so there is no new root.`;
  }
  const head = `Step k = ${kk} gives the angle ${A(st.raw)} and lands on ${Z(st.point)}.`;
  if (Math.abs(st.raw - st.argPoint) < 1e-9) {
    return `${head} As a point this root has Arg ${A(st.argPoint)}: the name from step ${kk} is also its home step.`;
  }
  return `${head} As a point this root has Arg ${A(st.argPoint)}. So ${A(st.raw)} and ${A(st.argPoint)} are two names for one direction: ${A(st.raw)} is one of the angles in arg z, ${A(st.argPoint)} is Arg z.`;
}

// ---------------------------------------------------------------- the quadratic (pure)

// Float dust (1e-15 where the maths says 0) is zeroed before a number is typeset; real parts keep every digit so texNumber still finds sqrt(2).
const dust = (x, eps) => (Math.abs(x) < eps ? 0 : x) + 0;
const tidyC = (z, eps = 1e-12) => ({ re: dust(z.re, eps), im: dust(z.im, eps) });

// a z^2 + b z + c = 0  <=>  (z - h)^2 = d, with h = -b/2a and d = (b^2 - 4ac)/(4a^2). The roots are h plus each square root of d.
export function quadraticModel(a, b, c) {
  if (!(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c))) return { ok: false, reason: 'bad' };
  if (a === 0) return { ok: false, reason: 'a-zero' };
  const disc = b * b - 4 * a * c;
  const h = -b / (2 * a) + 0;
  const d = disc / (4 * a * a) + 0;
  const s = csqrt({ re: d, im: 0 });
  const roots = quadraticRoots(a, b, c);
  const rootsOfD = rootsOf({ re: d, im: 0 }, 2);
  // exact: a, b and c are whole numbers. Only then do the explainer cells use fractions and radicals; a typed 0.5, -3.7 or 12.25
  // prints as a decimal there too, like the readout (ARCHITECTURE 10.4.5: one form per quantity per view). Same rule as rootsModel.
  const exact = Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c);
  return { ok: true, reason: null, a, b, c, disc, h, d, s, roots, rootsOfD, double: disc === 0, exact };
}

const shiftOf = (h) => (h > 0 ? `(z - ${N(h)})` : h < 0 ? `(z + ${N(-h)})` : 'z');        // the expression whose square is d, with the brackets
const zMinusOf = (h) => (h > 0 ? `z - ${N(h)}` : h < 0 ? `z + ${N(-h)}` : 'z');
const negC = (z) => ({ re: -z.re + 0, im: -z.im + 0 });

export function quadraticReadout(Q) {
  if (!Q || !Q.ok) return Q && Q.reason === 'a-zero' ? 'a = 0: not a quadratic (the equation is linear)' : '';
  const sq = `${shiftOf(Q.h)}^2 = ${N(Q.d)}`;
  const sqrtPart = Q.d === 0 ? 'sqrt: 0' : `sqrt: +-${Z(Q.s)}`;
  return `${sq}; ${sqrtPart}; roots: ${Z(Q.roots[0])}, ${Z(Q.roots[1])}`;
}

export function quadraticStory(Q) {
  if (!Q || !Q.ok) return '';
  const shift = `${shiftOf(Q.h)}^2`, zm = zMinusOf(Q.h);
  const r1 = Z(Q.roots[0]), r2 = Z(Q.roots[1]);
  if (Q.d === 0) return `Completing the square: ${shift} = 0. So ${zm} = 0 and there is only one root, ${r1}, counted twice.`;
  const tail = Q.h > 0 ? `Slide them right by ${N(Q.h)} to get ${r1} and ${r2}.`
    : Q.h < 0 ? `Slide them left by ${N(-Q.h)} to get ${r1} and ${r2}.` : 'They are the roots.';
  if (Q.d < 0) {
    return `Completing the square: ${shift} = ${N(Q.d)}. So ${zm} is a square root of ${N(Q.d)}. Those are ${Z(Q.s)} and ${Z(negC(Q.s))}: two points on the circle of radius ${N(cabs(Q.s))}. ${tail}`;
  }
  return `Completing the square: ${shift} = ${N(Q.d)}. So ${zm} is one of the two square roots of ${N(Q.d)}: ${Z(Q.s)} and ${Z(negC(Q.s))}, two real numbers. ${tail}`;
}

// ---------------------------------------------------------------- TeX helpers (pure)


// texAngle with every \frac{p}{q} written p/q, for angles that sit in an exponent (e^{i 5\pi/4}, not a tiny stacked fraction).
export function texSlash(theta) {
  return texAngle(theta).replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
}

// rho e^{i theta} with the raw angle kept (5pi/4 stays 5pi/4). numFn types rho: texNumber (exact forms) or a decimal.
export function texExp(rho, theta, numFn = texNumber) {
  const R = numFn(rho), Tt = texSlash(theta);
  const neg = Tt.startsWith('-');
  const body = neg ? Tt.slice(1) : Tt;
  const sp = /^\d/.test(body) ? '\\,' : '';
  const e = `e^{${neg ? '-' : ''}i${sp}${body}}`;
  return R === '1' ? e : `${R}\\,${e}`;
}

// One house style per view: whole-number c gets exact forms (fractions, radicals), a typed decimal gets decimals everywhere
// (M.exact, see rootsModel). numOf / cartOf return the TeX typesetters for a model.
const decNum = (x) => fmtNum(x);
const decCart = (z) => fmtCart(z);
export const numOf = (M) => (M.exact ? texNumber : decNum);
export const cartOf = (M) => (M.exact ? texCart : decCart);
// A base that carries an exponent: a bare fraction or radical would read as the exponent applying to its last symbol.
export const powBase = (t) => (/^-?[\d.]+$/.test(t) ? t : `\\left(${t}\\right)`);

// Short left-aligned lines instead of one long formula: nothing overflows at 390 px.
function lines(...ls) {
  const l = ls.filter(Boolean);
  return l.length === 1 ? l[0] : `\\begin{array}{l}${l.join(' \\\\ ')}\\end{array}`;
}

function eqLines(n, Ar, Br) {
  if (n === 2) return [`x^{2} - y^{2} = ${Ar}`, `2xy = ${Br}`];
  if (n === 3) return [`x^{3} - 3xy^{2} = ${Ar}`, `3x^{2}y - y^{3} = ${Br}`];
  if (n === 4) return [`x^{4} - 6x^{2}y^{2} + y^{4} = ${Ar}`, `4x^{3}y - 4xy^{3} = ${Br}`];
  return [`\\text{two equations of degree } ${n} \\text{ in } x \\text{ and } y`];
}

const thetaTex = (Theta) => (Theta === 0 ? '2\\pi k' : `${texAngle(Theta)} + 2\\pi k`);

// The list of k in the polar equation: written out for n <= 3 ("k = 0, 1" reads better than "k = 0, 1, ..., 1"), else "0, 1, ..., n - 1".
export function kListTex(n) {
  return n <= 3 ? Array.from({ length: n }, (_, k) => String(k)).join(', ') : `0, 1, \\dots, ${n - 1}`;
}

// Explainer rows for the main picture. state = { M, k }; every cell is null when c = 0.
export function rootsRows() {
  const live = (s) => s && s.M && !s.M.zero;
  return [
    { id: 'eq', label: 'the equation', native: 'polar',
      cart: (s) => (live(s) ? lines(cart(`(x+iy)^{${s.M.n}} = ${cartOf(s.M)(s.M.c)}`), ...eqLines(s.M.n, numOf(s.M)(s.M.c.re), numOf(s.M)(s.M.c.im)).map(cart)) : null),
      polar: (s) => (live(s) ? lines(polar(`r^{${s.M.n}} = |c| = ${numOf(s.M)(s.M.mod)}`), polar(`${s.M.n}\\theta = ${thetaTex(s.M.Theta)},\\ k = ${kListTex(s.M.n)}`)) : null) },
    { id: 'length', label: 'length r', native: null,
      cart: (s) => (live(s) ? cart(`r = \\sqrt{x^{2}+y^{2}} = \\sqrt{(${N(s.M.steps[s.k].point.re)})^{2} + (${N(s.M.steps[s.k].point.im)})^{2}} = ${N(cabs(s.M.steps[s.k].point))}`) : null),
      polar: (s) => (live(s) ? polar(`r = |c|^{1/${s.M.n}} = ${powBase(numOf(s.M)(s.M.mod))}^{1/${s.M.n}} = ${N(s.M.rho)}`) : null) },
    { id: 'angle', label: 'angle', native: 'polar',
      cart: (s) => (live(s) ? cart(`\\operatorname{Arg} z_{${s.M.steps[s.k].j}} = \\operatorname{atan2}(y, x) = ${texAngle(s.M.steps[s.k].argPoint)}`) : null),
      polar: (s) => {
        if (!live(s)) return null;
        const M = s.M, st = M.steps[s.k], turns = Math.round((st.raw - st.argPoint) / TWO_PI);
        return lines(polar(`\\theta_{${s.k}} = \\frac{1}{n}\\left(\\operatorname{Arg}c + 2\\pi k\\right)`),
          polar(`= \\frac{1}{${M.n}}\\left(${texAngle(M.Theta)} + 2\\pi\\cdot ${s.k}\\right) = ${texAngle(st.raw)}`),
          turns >= 1 ? polar(`= ${texAngle(st.argPoint)} + ${turns === 1 ? '' : turns + '\\cdot '}2\\pi`) : null);
      } },
    { id: 'point', label: 'the root', native: 'polar',
      cart: (s) => (live(s) ? cart(`z_{${s.M.steps[s.k].j}} = x + iy = ${cartOf(s.M)(tidyC(s.M.steps[s.k].point))}`) : null),
      polar: (s) => (live(s) ? polar(`z_{${s.M.steps[s.k].j}} = r\\,e^{i\\theta_{${s.k}}} = ${texExp(s.M.rho, s.M.steps[s.k].raw, numOf(s.M))}`) : null) },
  ];
}

// The footer: the root to the n-th power, in each address, must come back to c.
export function rootsSame(s) {
  if (!s || !s.M || s.M.zero) return { cart: null, polar: null, agree: null };
  const M = s.M, st = M.steps[s.k], n = M.n;
  const powC = cpow(st.point, n);
  const powP = fromPolar(Math.pow(M.rho, n), n * st.raw);
  const tol = 1e-9 * Math.max(1, M.mod);
  return {
    cart: cart(`(${cartOf(M)(tidyC(st.point))})^{${n}} = ${cartOf(M)(tidyC(powC))}`),
    polar: polar(`(${numOf(M)(M.rho)})^{${n}}\\,${texExp(1, n * st.raw)} = ${cartOf(M)(tidyC(powP))}`),
    agree: eq(powC, M.c, tol) && eq(powP, M.c, tol),
  };
}

const sqrtDisc = (Q) => csqrt({ re: Q.disc, im: 0 });
const resOf = (Q, r) => add(add(mul({ re: Q.a, im: 0 }, mul(r, r)), mul({ re: Q.b, im: 0 }, r)), { re: Q.c, im: 0 });

// Explainer rows for the quadratic panel. state = QModel; cells are null unless Q.ok. Whole-number a, b, c get exact forms (fractions and
// radicals); a typed decimal prints as a decimal in every cell, like the readout (Q.exact, see quadraticModel).
export function quadRows() {
  const live = (Q) => Q && Q.ok;
  return [
    { id: 'disc', label: 'discriminant', native: null,
      cart: (Q) => (live(Q) ? cart(`b^{2} - 4ac = (${numOf(Q)(Q.b)})^{2} - 4(${numOf(Q)(Q.a)})(${numOf(Q)(Q.c)}) = ${numOf(Q)(Q.disc)}`) : null),
      polar: (Q) => (live(Q) ? polar(Q.disc === 0 ? '0 = 0' : `${numOf(Q)(Q.disc)} = ${texExp(Math.abs(Q.disc), Arg(Q.disc), numOf(Q))}`) : null) },
    { id: 'sqrt', label: 'its square root', native: 'polar',
      cart: (Q) => {
        if (!live(Q)) return null;
        const S = sqrtDisc(Q), nf = numOf(Q), cf = cartOf(Q);
        return cart(Q.disc < 0 ? `\\sqrt{${nf(Q.disc)}} = i\\sqrt{${nf(-Q.disc)}} = ${cf(tidyC(S))}` : `\\sqrt{${nf(Q.disc)}} = ${cf(tidyC(S))}`);
      },
      polar: (Q) => {
        if (!live(Q)) return null;
        const S = sqrtDisc(Q);
        return polar(Q.disc === 0 ? '\\sqrt{0} = 0' : `\\sqrt{${numOf(Q)(Math.abs(Q.disc))}}\\,${texExp(1, Arg(Q.disc) / 2)} = ${cartOf(Q)(tidyC(S))}`);
      } },
    { id: 'roots', label: 'the roots', native: 'cart',
      cart: (Q) => {
        if (!live(Q)) return null;
        const S = sqrtDisc(Q), nf = numOf(Q), cf = cartOf(Q);
        return cart(`z = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{${nf(-Q.b)} \\pm ${cf(tidyC(S))}}{${nf(2 * Q.a)}} = ${cf(tidyC(Q.roots[0]))}\\ \\text{or}\\ ${cf(tidyC(Q.roots[1]))}`);
      },
      polar: (Q) => {
        if (!live(Q)) return null;
        if (Q.double) return polar(`z = ${numOf(Q)(Q.h)}`);
        const th = Arg({ re: Q.d, im: 0 }), rr = Math.sqrt(Math.abs(Q.d)), nf = numOf(Q);
        const shiftTex = Q.h === 0 ? '' : `${nf(Q.h)} + `;
        return polar(`z = ${shiftTex}${texExp(rr, th / 2, nf)}\\ \\text{or}\\ ${shiftTex}${texExp(rr, (th + TWO_PI) / 2, nf)}`);
      } },
  ];
}

// The footer of the quadratic panel: the SAME root put back into a z^2 + b z + c, once with the root written in x and y and once with the same
// root written as h + rho e^{i phi} (the polar form of the 'the roots' row). The verdict covers both roots.
export function quadSame(Q) {
  if (!Q || !Q.ok) return { cart: null, polar: null, agree: null };
  const [r1, r2] = Q.roots, nf = numOf(Q), cf = cartOf(Q);
  const put = (t, res) => `(${nf(Q.a)})(${t})^{2} + (${nf(Q.b)})(${t}) + (${nf(Q.c)}) = ${cf(tidyC(res, 1e-9))}`;
  const th = Arg({ re: Q.d, im: 0 }), rr = Math.sqrt(Math.abs(Q.d));
  // h + rho e^{i phi} with phi = Arg(d)/2 or Arg(d)/2 + pi (the two square roots of d): the one that IS the root r1 of the Cartesian column
  // (for a < 0 the formula's first root is h minus the principal square root, so it is the second angle)
  const phi = [th / 2, (th + TWO_PI) / 2].find((p) => cabs(sub(add({ re: Q.h, im: 0 }, fromPolar(rr, p)), r1)) <= 1e-9 * Math.max(1, rr)) ?? th / 2;
  const polarRoot = Q.double ? nf(Q.h) : `${Q.h === 0 ? '' : `${nf(Q.h)} + `}${texExp(rr, phi, nf)}`;
  const res1 = resOf(Q, r1);
  const tol = (r) => 1e-9 * Math.max(1, Math.abs(Q.a) * cabs(r) ** 2 + Math.abs(Q.b) * cabs(r) + Math.abs(Q.c));
  return { cart: cart(put(cf(tidyC(r1)), res1)), polar: polar(put(polarRoot, res1)), agree: cabs(res1) <= tol(r1) && cabs(resOf(Q, r2)) <= tol(r2) };
}

// ---------------------------------------------------------------- views, snapping, the raise path (pure)

export function ladderCeil(x, ladder) {
  for (const v of ladder) if (v >= x - 1e-12) return v;
  return ladder[ladder.length - 1];
}

// The half-width of the c-plane and of the root plane for a model.
export function viewHalfWidths(M) {
  return { c: ladderCeil(1.2 * Math.max(M.mod, 1), C_LADDER), z: M.zero ? 1.5 : ladderCeil(1.3 * M.rho, Z_LADDER) };
}

// Each coordinate to the nearest multiple of step when within tol; rounded to 9 decimals, never -0.
export function snapToGrid(z, step, tol) {
  const f = (v) => { const m = Math.round(v / step) * step; return Math.abs(v - m) < tol ? Number(m.toFixed(9)) + 0 : v; };
  return { re: f(z.re), im: f(z.im) };
}

export function raiseDurationMs(n) { return clamp(1200 + 700 * (n - 1), 2000, 6000); }

// The path z_k^s = rho^s e^(i s raw_k), s from 1 to tEnd; t = (s - 1)/(n - 1) in [0, 1].
export function raiseSamples(M, k, tEnd, perPower = 32) {
  const st = M.steps[k], n = M.n;
  const count = tEnd <= 1 ? 1 : Math.max(2, Math.round((tEnd - 1) * perPower) + 1);
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = count === 1 ? 1 : 1 + i * (tEnd - 1) / (count - 1);
    const r = Math.pow(M.rho, s);
    out.push({ re: r * Math.cos(s * st.raw), im: r * Math.sin(s * st.raw), t: (s - 1) / (n - 1), s });
  }
  return out;
}

// What the state of a fresh mount is, from the router's preset.
export function initialState(preset) {
  const S = { c: { re: 1, im: 0 }, n: 5, sel: 0, quad: { a: 1, b: -4, c: 13 }, quadFirst: false };
  let key = null;
  if (preset && preset.kind === 'problem') {
    key = { '1.4.1': '1', '1.4.2': 'm16' }[preset.id] || null;
    if (preset.id === '1.4.3') { S.quadFirst = true; S.c = { re: quadraticModel(1, -4, 13).d, im: 0 }; S.n = 2; }
  }
  if (preset && preset.kind === 'token') {
    key = Object.prototype.hasOwnProperty.call(TOKEN_KEYS, preset.token) ? TOKEN_KEYS[preset.token] : null;
    if (preset.token === 'quadratic') { S.quadFirst = true; S.c = { re: quadraticModel(1, -4, 13).d, im: 0 }; S.n = 2; }
  }
  if (key) { S.c = { re: PRESETS[key].c.re, im: PRESETS[key].c.im }; S.n = PRESETS[key].n; }
  return S;
}

// ---------------------------------------------------------------- DOM helpers (only called from mount)

function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const subs = (k) => String(k).split('').map((d) => String.fromCharCode(0x2080 + Number(d))).join('');

const STYLE = `
.rt-two { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); align-items: start; }
.rt-two > * { min-width: 0; }
.rt-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-1); }
.rt-pick { display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .5rem; width: 100%; min-height: var(--tap);
  padding: .35rem .75rem; text-align: left; font: inherit; color: var(--text); background: var(--surface);
  border: 1.5px solid var(--border-strong); border-radius: var(--radius-sm); cursor: pointer; }
.rt-pick:hover { background: var(--surface-2); }
.rt-pick[aria-pressed="true"] { border-color: var(--polar); box-shadow: inset 0 0 0 2px var(--polar); background: var(--surface-2); }
.rt-pick:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.rt-text { font-family: var(--font-mono); font-size: .9rem; min-width: 0; overflow-wrap: anywhere; }
.rt-polar { color: var(--polar); }
.rt-cart { color: var(--cart); }
.rt-badges { display: inline-flex; flex-wrap: wrap; gap: .25rem; }
.plane-handle.rt-ghost .plane-handle-dot { opacity: .5; }
.plane-handle.rt-pickable { cursor: pointer; }
.rt-note { margin: 0; min-height: 1.4em; overflow-wrap: anywhere; }
.rt-try { margin: 0; padding-left: 1.25rem; }
.rt-try li + li { margin-top: var(--space-1); }
.rt-fields { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-2) var(--space-3); margin-top: var(--space-2); }
.rt-fields input.num { width: 5.75rem; }
.rt-quad { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); align-items: start; margin-top: var(--space-3); }
.rt-quad > * { min-width: 0; }
.rt-cap { margin: var(--space-2) 0 0; font-size: .92rem; color: var(--text-muted); overflow-wrap: anywhere; }
.rt-stack { display: grid; gap: var(--space-2); }
.rt-stack > * { min-width: 0; margin-top: 0; margin-bottom: 0; }
.rt-sub { margin: 0 0 var(--space-1); font-size: 1rem; }
.rt-err { margin: var(--space-1) 0 0; min-height: 1.2em; color: var(--danger); font-size: .92rem; }
.rt-why { margin: var(--space-1) 0 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .5rem; }
.rt-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.rt-actions .btn { align-self: flex-start; }
.rt-actions { margin-top: var(--space-1); }
.rt-links { margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); }
.rt-controls .slider-row { margin-top: var(--space-2); }
.rt-slot { display: grid; }
.rt-slot > * { grid-area: 1 / 1; min-width: 0; align-self: start; }
.rt-slot > .rt-slot-ghost { visibility: hidden; pointer-events: none; }
.rt-readout { position: relative; }
.rt-readout::before { content: attr(data-sizer); display: block; visibility: hidden; }
.rt-readout .rt-live { position: absolute; top: var(--space-2); left: var(--space-3); right: var(--space-3); }
`;

function injectStyle(forName, css) {
  const head = document.head;
  if (head.querySelector('style[data-for="' + forName + '"]')) return null;
  const s = mk('style');
  s.setAttribute('data-for', forName);
  s.textContent = css;
  head.appendChild(s);
  return s;
}

function buildHeader(ctx, ledeText) {
  const header = mk('header', 'station-header');
  header.appendChild(mk('h1', '', null, ctx.station.title));
  header.appendChild(mk('p', 'station-lede', null, ledeText));
  const badges = mk('ul', 'thread-badges');
  for (const tid of ctx.station.threads || []) {
    const th = (ctx.threads || []).find((t) => t.id === tid);
    const li = mk('li', 'thread-badge', null, threadLabel(th || tid));
    li.dataset.thread = tid;
    badges.appendChild(li);
  }
  const chips = mk('div', 'chips', { 'aria-label': 'Problems on this page' });
  const chipById = new Map();
  for (const p of problemsForStation(ctx.station.id)) {
    const a = mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: String(p.aha || '').replace(/\^\{([^{}]*)\}/g, '^($1)') }, p.id);
    chipById.set(p.id, a);
    chips.appendChild(a);
  }
  header.append(badges, chips);
  return { header, chipById };
}

// The callout is never hidden: it shows the review problem that matches c and n, or a neutral line. Its slot (mountSlot) is always as
// tall as the tallest of them, so nothing below it ever moves when it changes.
const NEUTRAL_TEXT = 'No review problem matches these numbers. The chips under "Pick c and n" put c and n on problem 1.4.1 (c = 1, n = 5) or problem 1.4.2 (c = -16, n = 4).';
const NEUTRAL_LEAD = 'Your own numbers.';

// When c is d from the quadratic panel (the deep link of problem 1.4.3 opens like this, and so does "Show the square roots of d in the big picture")
// the callout says so, instead of telling the student that the numbers match nothing.
export const QUAD_LEAD = 'From the quadratic.';
export function quadNeutralText(d) {
  return `c = ${fmtNum(d)} is d, the number from the quadratic panel whose square roots the formula takes, and n = 2. This picture shows those two square roots. Problem 1.4.3 itself is solved in that panel.`;
}

function renderProblem(host, p, neutral, lead = NEUTRAL_LEAD) {
  host.textContent = '';
  if (!p) {
    delete host.dataset.tone;
    const head = mk('p');
    head.append(mk('strong', '', null, lead), ' ', neutral || '');
    host.appendChild(head);
    return;
  }
  const tones = addressTones(p.address);
  host.dataset.tone = (tones[0] || '--polar').replace(/^--/, '');
  const head = mk('p');
  head.append(mk('strong', '', null, p.id), ' ');
  for (const part of statementParts(p.statement)) {
    const span = mk('span');
    if (part.math) tex(span, part.text); else span.textContent = part.text;
    head.appendChild(span);
  }
  const why = mk('p', 'muted rt-why');
  why.append('Easy in:');
  const group = mk('span', 'rt-badges', { role: 'group', 'aria-label': addressLabel(p.address) });
  const seen = new Set();
  for (const t of tones) {
    if (seen.has(t)) continue;
    seen.add(t);
    const b = mk('span', 'badge', null, t === '--cart' ? 'Cartesian' : 'Polar');
    b.dataset.tone = t.replace(/^--/, '');
    group.appendChild(b);
  }
  const reason = mk('span');
  prose(reason, p.addressWhy);
  why.append(group, reason);
  host.append(head, why);
}

// A grid cell that holds the live callout on top of an invisible copy of every callout it can show: the cell is as tall as the tallest,
// at any width, so the planes below keep their place when the numbers change (a drag away from a preset used to move them 167 px).
function mountSlot(slot, live, variants) {
  for (const v of variants) {
    const ghost = mk('div', 'callout rt-slot-ghost', { 'aria-hidden': 'true', inert: '' });
    renderProblem(ghost, v.p, v.neutral, v.lead);
    slot.appendChild(ghost);
  }
  slot.appendChild(live);
}

function buildNav(ctx) {
  const list = ctx.stations || [];
  const i = list.findIndex((s) => s.id === ctx.station.id);
  const nav = mk('nav', 'station-links', { 'aria-label': 'Neighbouring places' });
  const seen = new Set();
  const add1 = (st, dir, thread, text) => {
    if (!st || st.id === 'problems' || seen.has(st.id)) return;
    seen.add(st.id);
    const a = mk('a', 'station-link', { href: '#' + st.id });
    const label = mk('span');                                  // one span: the link is inline-flex, and the exponent of "z^n" needs its raise (10.4.8)
    prose(label, text || st.title);
    a.appendChild(label);
    a.dataset.dir = dir;
    if (thread) a.dataset.thread = thread;
    nav.appendChild(a);
  };
  add1(list[i - 1], 'prev');
  add1(list[i + 1], 'next');
  for (const t of ctx.station.threads || []) {
    let before = null, after = null;
    for (let j = i - 1; j >= 0 && !before; j--) if ((list[j].threads || []).includes(t) && list[j].id !== 'problems') before = list[j];
    for (let j = i + 1; j < list.length && !after; j++) if ((list[j].threads || []).includes(t) && list[j].id !== 'problems') after = list[j];
    if (before) add1(before, 'prev', t, threadLinkPrefix(t, 'prev') + before.title);
    if (after) add1(after, 'next', t, threadLinkPrefix(t, 'next') + after.title);
  }
  return nav;
}

// A ring of a fixed pixel radius around a plane point (hit areas, primitive and selected marks).
function ringPx(ctx2, plane, z, rPx, { color, width, alpha = 1, dash = null }) {
  const p = plane.toPixel(z);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
  ctx2.save();
  ctx2.globalAlpha = alpha;
  ctx2.strokeStyle = cssColor(color);
  ctx2.lineWidth = width;
  ctx2.setLineDash(dash || []);
  ctx2.beginPath();
  ctx2.arc(p.x, p.y, rPx, 0, 2 * Math.PI);
  ctx2.stroke();
  ctx2.restore();
}

function hollowDot(ctx2, plane, z, rPx = 6) {
  const p = plane.toPixel(z);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
  ctx2.save();
  ctx2.fillStyle = cssColor('--surface');
  ctx2.strokeStyle = cssColor('--polar');
  ctx2.lineWidth = 2;
  ctx2.beginPath();
  ctx2.arc(p.x, p.y, rPx, 0, 2 * Math.PI);
  ctx2.fill();
  ctx2.stroke();
  ctx2.restore();
}

// A readout whose box is as tall as the longest text it can show, so a drag never moves the planes below it when the text wraps
// onto another line (the live text sits on top of an invisible copy of the worst case; textContent is the live text only).
function mkReadout(id, sizer) {
  const box = mk('div', 'readout rt-readout', { id, 'data-sizer': sizer });
  const live = mk('span', 'rt-live');
  box.appendChild(live);
  return { box, live };
}

function parseField(input) {
  const s = String(input.value).trim();
  if (s === '') return NaN;
  const v = Number(s);
  return Number.isFinite(v) ? v : NaN;
}

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  const mv = (window.__mv = window.__mv || {});
  const preset = ctx && ctx.preset ? ctx.preset : null;
  const S = initialState(preset);
  S.userView = { c: false, z: false };
  S.fitted = { c: NaN, z: NaN };
  S.raise = { mode: 'idle', t: 1, m: 1, k: 0, startedAt: 0 };
  let M = rootsModel(S.c, S.n);
  let Q = quadraticModel(S.quad.a, S.quad.b, S.quad.c);
  let destroyed = false;
  let loopId = 0, statusTimer = 0, lastM = 0;
  let listN = -1, stairsN = -1;
  let lastCallout = undefined;
  const disposables = [];
  const reduced = () => {
    try { if (ctx && ctx.theme && ctx.theme.prefersReducedMotion) return !!ctx.theme.prefersReducedMotion(); } catch (e) { /* fall through */ }
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  };

  const styleEl = injectStyle('station-roots', STYLE);

  // ---- DOM blocks (built first, attached in the order of the design)
  const { header, chipById } = buildHeader(ctx, 'A number c has a whole staircase of angles: Arg c, Arg c + 2π, Arg c + 4π, and so on. To find its n-th roots, divide every step by n. The first n steps land on n different points. Step n lands on step 0 again, so the roots stop there.');
  const problemBox = mk('div', 'callout', { id: 'roots-problem' });
  const problemSlot = mk('div', 'rt-slot', { id: 'roots-problem-slot' });
  mountSlot(problemSlot, problemBox, [{ p: problemById('1.4.1') }, { p: problemById('1.4.2') }, { p: null, neutral: NEUTRAL_TEXT },
    { p: null, neutral: quadNeutralText(-1234.567), lead: QUAD_LEAD }]);

  const tryBox = mk('aside', 'callout', { id: 'roots-try-box' });
  const tryHead = mk('p');
  tryHead.appendChild(mk('strong', '', null, 'Three things to try'));
  tryBox.appendChild(tryHead);
  const tryList = mk('ol', 'rt-try', { id: 'roots-try' });
  [
    'Drag c once around the origin. The roots turn too, but only 1/n as fast.',
    'Click root k = 2. It has two names for its direction: the angle from its step, and its own Arg. They differ by a whole number of turns.',
    'Press "Raise". The root spirals out and lands on c. Roots from higher steps wind around more times first.',
  ].forEach((t) => tryList.appendChild(mk('li', '', null, t)));
  tryBox.appendChild(tryList);

  // controls
  const controls = mk('section', 'panel rt-controls', { id: 'roots-controls' });
  controls.appendChild(mk('h2', 'panel-title', null, 'Pick c and n'));
  const chips = mk('div', 'chips', { role: 'group', 'aria-label': 'Presets' });
  const presetBtns = new Map();
  for (const key of Object.keys(PRESETS)) {
    const b = mk('button', 'chip', { type: 'button', id: PRESET_IDS[key], 'aria-pressed': 'false' }, PRESETS[key].label);
    presetBtns.set(key, b);
    chips.appendChild(b);
  }
  const sliderRow = mk('div', 'slider-row');
  const nSlider = mk('input', '', { type: 'range', id: 'roots-n', min: String(N_MIN), max: String(N_MAX), step: '1', value: String(S.n) });
  const nOut = mk('output', '', { id: 'roots-n-out', for: 'roots-n' }, String(S.n));
  sliderRow.append(mk('label', '', { for: 'roots-n' }, 'n (how many roots)'), nSlider, nOut);
  const fields = mk('div', 'rt-fields');
  const reField = mk('div', 'field'), imField = mk('div', 'field');
  const reInput = mk('input', 'num', { type: 'number', step: 'any', id: 'roots-c-re' });
  const imInput = mk('input', 'num', { type: 'number', step: 'any', id: 'roots-c-im' });
  reField.append(mk('label', '', { for: 'roots-c-re' }, 'Re c'), reInput);
  imField.append(mk('label', '', { for: 'roots-c-im' }, 'Im c'), imInput);
  fields.append(reField, imField);
  const cError = mk('p', 'rt-err', { id: 'roots-c-error', 'aria-live': 'polite' });
  const readoutBox = mkReadout('roots-readout', 'c = -70.711 - 70.711i; n = 12; |c|^(1/n) = 1.468; Arg c = -2.356; roots at (Arg c + 2πk)/n; k = 0..11');
  const readout = readoutBox.live;
  const status = mk('div', 'sr-only', { id: 'roots-status', role: 'status' });
  controls.append(chips, sliderRow, fields, cError, readoutBox.box, status);

  // the two planes
  const twoPlanes = mk('div', 'two-planes');
  const cPanel = mk('section', 'panel');
  cPanel.appendChild(mk('h2', 'panel-title', null, 'c, the number you give'));
  const cHost = mk('div');
  const cCaption = mk('p', 'rt-cap', { id: 'roots-c-caption' }, 'Drag c. The point is drawn once. The solid arc is Arg c. The faint arcs are the other angles in arg c: Arg c + 2π, Arg c + 4π, and so on. The dashed grey ray is the seam, where Arg jumps from π to −π. Cross it and every label k shifts by one, because Arg c drops by 2π.');
  cPanel.append(cHost, cCaption);
  const zPanel = mk('section', 'panel');
  zPanel.appendChild(mk('h2', 'panel-title', null, 'The n roots of c'));
  const zHost = mk('div');
  const zCaption = mk('p', 'rt-cap', { id: 'roots-z-caption' }, 'Each ray is one step of the staircase divided by n. The numbers are k. The dashed ray is step n, which is step 0 again, so root 0 is labelled with both. Click a root to look at it.');
  zPanel.append(zHost, zCaption);
  twoPlanes.append(cPanel, zPanel);

  // divide the staircase
  const divide = mk('section', 'panel', { id: 'roots-divide' });
  divide.appendChild(mk('h2', 'panel-title', null, 'Divide the staircase'));
  const divGrid = mk('div', 'rt-two');
  const leftCol = mk('div', 'rt-stack');
  leftCol.appendChild(mk('h3', 'rt-sub', null, 'The steps of arg c'));
  const stairsHost = mk('div', '', { id: 'roots-stairs-host' });
  const stairLinkP = mk('p', 'rt-links');
  stairLinkP.appendChild(mk('a', '', { href: '#staircase' }, 'What is arg z, and what is Arg z? The Staircase'));
  leftCol.append(stairsHost, stairLinkP);
  const rightCol = mk('div', 'rt-stack');
  rightCol.appendChild(mk('h3', 'rt-sub', null, '...divided by n: the roots'));
  const listEl = mk('ol', 'rt-list', { id: 'roots-list', 'aria-label': 'The n roots' });
  const wrapNoteEl = mk('p', 'rt-note', { id: 'roots-wrap-note' });
  const primNoteEl = mk('p', 'rt-note', { id: 'roots-primitive-note' });
  const zeroNoteEl = mk('p', 'rt-note', { id: 'roots-zero-note' }, 'c = 0: every n-th root of 0 is 0, and 0 has no angle, so there is no staircase to divide. Move c away from 0.');
  zeroNoteEl.hidden = true;
  const pickNoteEl = mk('p', 'rt-note', { id: 'roots-pick-note' });
  const raiseRow = mk('div', 'rt-actions');
  const raiseBtn = mk('button', 'btn', { type: 'button', id: 'roots-raise', 'data-state': 'idle' }, 'Raise root 0 to the power 5');
  raiseRow.appendChild(raiseBtn);
  const raiseOut = mk('div', 'readout', { id: 'roots-raise-readout' });
  const principalLinkP = mk('p', 'rt-links');
  principalLinkP.appendChild(mk('a', '', { href: '#principal-root' }, 'Step 0 gives the principal root. Principal Roots'));
  rightCol.append(listEl, wrapNoteEl, primNoteEl, zeroNoteEl, pickNoteEl, raiseRow, raiseOut, principalLinkP);
  divGrid.append(leftCol, rightCol);
  divide.appendChild(divGrid);

  // both addresses
  const explain = mk('section', 'panel', { id: 'roots-explain' });
  const exHeading = mk('h2', 'panel-title', { id: 'roots-ex-heading' }, 'Both addresses, for step k = 0');
  const exHost = mk('div', '', { id: 'roots-ex-host' });
  explain.append(exHeading, exHost);

  // the quadratic panel
  const quadPanel = mk('section', 'panel', { id: 'roots-quadratic', 'data-tone': 'cart' });
  quadPanel.appendChild(mk('h2', 'panel-title', null, '1.4.3 The quadratic formula hides a square root'));
  const quadProblem = mk('div', 'callout', { id: 'roots-quadratic-problem' });
  renderProblem(quadProblem, problemById('1.4.3'));
  const quadLede = mk('p', '', null, 'Complete the square and the quadratic turns into a square root. That is the same staircase machine with n = 2, then a slide.');
  const qFields = mk('div', 'rt-fields');
  const qInputs = {};
  for (const key of ['a', 'b', 'c']) {
    const f = mk('div', 'field');
    const inp = mk('input', 'num', { type: 'number', step: 'any', id: 'roots-q' + key, value: String(S.quad[key]), 'aria-describedby': 'roots-quadratic-hint' });
    qInputs[key] = inp;
    f.append(mk('label', '', { for: 'roots-q' + key }, key), inp);
    qFields.appendChild(f);
  }
  const quadHint = mk('p', 'muted rt-cap', { id: 'roots-quadratic-hint' }, 'For a z^2 + b z + c = 0.');
  const quadError = mk('p', 'rt-err', { id: 'roots-quadratic-error', 'aria-live': 'polite' });
  const quadReadout = mk('div', 'readout', { id: 'roots-quadratic-readout' });
  const quadGrid = mk('div', 'rt-quad');
  const quadLeft = mk('div', 'rt-stack');
  const quadStory = mk('p', 'rt-note', { id: 'roots-quadratic-story' });
  const qexHost = mk('div', '', { id: 'roots-qex-host' });
  const quadLoad = mk('button', 'btn', { type: 'button', id: 'roots-quadratic-load' }, 'Show the square roots of d in the big picture');
  const quadLoadRow = mk('div', 'rt-actions');
  quadLoadRow.appendChild(quadLoad);
  quadLeft.append(quadStory, qexHost, quadLoadRow);
  const quadRight = mk('div');
  const qHost = mk('div');
  const qCaption = mk('p', 'rt-cap', { id: 'roots-qplane-caption' }, 'Hollow dots: the square roots of d. Dashed arrows: the slide by h. Filled dots: the roots of the quadratic.');
  quadRight.append(qHost, qCaption);
  quadGrid.append(quadLeft, quadRight);
  quadError.style.minHeight = '0';
  const quadStack = mk('div', 'rt-stack');
  quadStack.append(quadProblem, quadLede, qFields, quadHint, quadError, quadReadout, quadGrid);
  quadPanel.appendChild(quadStack);

  const nav = buildNav(ctx);

  // quadratic first for problem 1.4.3, otherwise last (decided by the order of appending, no CSS order)
  if (S.quadFirst) el.append(header, tryBox, quadPanel, problemSlot, controls, twoPlanes, divide, explain, nav);
  else el.append(header, problemSlot, tryBox, controls, twoPlanes, divide, explain, quadPanel, nav);

  // ---- planes, handles, widgets
  const cPlane = createPlane(cHost, { id: 'roots-plane', xRange: [-2, 2], yRange: [-2, 2], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], interactive: true,
    minUnitsAcross: 1, maxUnitsAcross: 400, aspect: 1, maxWidth: 520, wheel: 'focus', ariaLabel: 'The complex number c' });
  const zPlane = createPlane(zHost, { id: 'roots-zplane', xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], interactive: true, controls: false,
    minUnitsAcross: 0.05, maxUnitsAcross: 100, aspect: 1, maxWidth: 520, wheel: 'focus', ariaLabel: 'The n-th roots of c' });
  const qPlane = createPlane(qHost, { id: 'roots-qplane', grid: 'cart', interactive: false, aspect: 1, maxWidth: 360, ariaLabel: 'Square roots of d, slid by h' });
  disposables.push(() => cPlane.destroy(), () => zPlane.destroy(), () => qPlane.destroy());

  const cHandle = cPlane.addPoint({ id: 'c', z: S.c, color: '--input', label: 'c', radius: 8, step: 0.1, name: 'c',
    onDragStart: () => { if (!destroyed) cancelRaise(); },
    onDrag: (z, info) => onCDrag(z, info) });
  const zHandles = [];
  for (let k = 0; k < N_MAX; k++) {
    const h = zPlane.addPoint({ id: 'r' + k, z: ZERO, draggable: false, focusable: true, color: '--output', radius: 7, label: k === 0 ? 'k = 0, 12' : 'k = ' + k, name: 'root ' + k });
    h.el.classList.add('rt-pickable');
    h.el.addEventListener('click', () => select(k));
    zHandles.push(h);
  }

  // The staircase widget prints "k = n" in front of every row (showK), which ties row k to ray k and to list row k.
  // From 8 roots on (a list of 9 to 13 rows beside the list of roots) the compact form drops the decimal column, which the list of roots repeats,
  // so the row "-3pi/4 + 24pi = 93pi/4" is not cut off in a half-width column.
  const stairsOf = () => createStaircase(stairsHost, { id: 'roots-stairs', kMin: 0, kMax: S.n, label: 'arg c', showK: true, compact: S.n >= COMPACT_FROM_N, onPick: (k) => { if (!destroyed) select(k); } });
  let stairs = stairsOf();
  stairsN = S.n;
  disposables.push(() => stairs.destroy());
  const explainer = createExplainer(exHost, { id: 'roots-ex', rows: rootsRows(), same: rootsSame });
  const qexplainer = createExplainer(qexHost, { id: 'roots-qex', rows: quadRows(), same: quadSame, sameLabel: 'same root' });
  disposables.push(() => explainer.destroy(), () => qexplainer.destroy());

  // ---- layers
  cPlane.addLayer((c2, pl) => {
    drawSeam(c2, pl, Math.PI, { label: false });
    if (M.zero) return;
    drawCartAddress(c2, pl, M.c);
    drawPolarAddress(c2, pl, M.c, { ghosts: Math.min(S.n, 6), name: 'c' });
  }, { order: 10 });
  let raiseCurve = null;
  cPlane.addLayer((c2, pl) => {                                    // the dots at whole powers of the raised root
    if (S.raise.mode === 'idle' || M.zero) return;
    const st = M.steps[Math.min(S.raise.k, M.n)];
    const last = Math.floor(S.raise.t + 1e-9);
    const put = createLabelPlacer(c2, pl);
    for (let m = 1; m <= last; m++) {
      const p = fromPolar(Math.pow(M.rho, m), m * st.raw);
      drawDot(c2, pl, p, { color: '--polar', radius: 4 });
      // The word goes where nothing is: the last power lands ON c, whose own handle and word "c" are there, so z^n = c steps aside.
      const at = (dx, dy, align) => ({ z: p, dx, dy, align });
      put(m === S.n ? `z^${m} = c` : m === 1 ? 'z' : `z^${m}`, [at(6, -6, 'left'), at(6, 14, 'left'), at(-6, -6, 'right'), at(-6, 14, 'right'),
        at(16, -22, 'left'), at(16, 26, 'left'), at(-16, -22, 'right'), at(-16, 26, 'right')], { color: '--text' });
    }
  }, { order: 50 });

  zPlane.addLayer((c2, pl) => {
    drawSeam(c2, pl, Math.PI, { label: false });
    if (M.zero) {
      // The word goes beside the origin where the w-less plane has room: the plane's own handle words are obstacles of the placer.
      drawDot(c2, pl, ZERO, { color: '--output', radius: 5 });
      createLabelPlacer(c2, pl)('0: every root', [{ z: ZERO, dx: 12, dy: -10, align: 'left' }, { z: ZERO, dx: 12, dy: 18, align: 'left' }, { z: ZERO, dx: -12, dy: -10, align: 'right' }, { z: ZERO, dx: -12, dy: 18, align: 'right' }], { color: '--text' });
      return;
    }
    const n = M.n, j = S.sel % n, roots = M.roots;
    // The word "seam" sits above the seam, centred between the circle and the edge of the plane, never among the tick labels below the axis.
    const O = pl.toPixel(ZERO), room = O.x - Math.abs(pl.toPixel({ re: M.rho, im: 0 }).x - O.x), size = pl.getSize();
    drawLabel(c2, pl, pl.fromPixel(Math.max(8, room / 2 - 15), O.y - 8), 'seam', { color: '--seam', dx: 0, dy: 0, align: 'left', clamp: false });
    // Everything drawn here is told to the plane's label placer, so the Arg and r labels of the selected root stay off it: the circle, the n-gon,
    // the rays, the dashed step-n ray and the real axis. The axis costs 90 here (the plane's own is 6; a word is 100): a block across y = 0 reads
    // "Arg z3 = 3.029" as a minus sign, which is worse than a ray through a word, so the block crosses up to three rays before it crosses the axis.
    registerObstacle(pl, { a: pl.fromPixel(0, O.y), b: pl.fromPixel(size.w, O.y), cost: 90 });
    drawCircle(c2, pl, ZERO, M.rho, { color: '--polar', width: 2, alpha: 0.9, obstacle: true });
    if (n === 2) drawSegment(c2, pl, roots[0], roots[1], { color: '--polar', width: 1.5, alpha: 0.35, dash: DASH.guide });             // the diameter lies on the two rays
    else {
      for (let k = 0; k < n; k++) drawSegment(c2, pl, roots[k], roots[(k + 1) % n], { color: '--polar', width: 1.5, alpha: 0.35, dash: DASH.guide });   // the n-gon
      registerObstacle(pl, { points: roots, closed: true });
    }
    // Step n is step 0 again: a pale sleeve along the whole of ray 0 and a dashed ray beyond root 0 to the edge of the plane
    const dir = fromPolar(1, M.steps[n].raw), tip = { re: dir.re * 3 * Math.max(M.rho, 1e-9), im: dir.im * 3 * Math.max(M.rho, 1e-9) };
    drawSegment(c2, pl, ZERO, roots[0], { color: '--polar', width: 9, alpha: 0.22 });
    drawSegment(c2, pl, roots[0], tip, { color: '--polar', width: 3, alpha: 0.85, dash: [9, 6], obstacle: true });
    ringPx(c2, pl, roots[0], 12, { color: '--polar', width: 1.5, alpha: 0.8, dash: DASH.guide });
    // The rays of the other roots are obstacles (no labels, no arc); the selected root's own ray is registered by drawPolarAddress below.
    for (let k = 0; k < n; k++) {
      if (k === j) drawSegment(c2, pl, ZERO, roots[k], { color: '--polar', width: 3.5 });
      else drawSegment(c2, pl, ZERO, roots[k], { color: '--polar', width: 2, obstacle: true });
    }
    if (M.isOne) for (let k = 0; k < n; k++) if (M.primitive[k]) ringPx(c2, pl, roots[k], 10.5, { color: '--text', width: 1.5 });
    ringPx(c2, pl, roots[j], 13, { color: '--text', width: 2.5 });          // 13 + 1.25 stays clear of the dot's label (box corner at about (11, -10))
    drawCartAddress(c2, pl, roots[j]);
    // The Arg block is "Arg z = ..." plus one "also ..." line for each winding drawn. On a plane narrower than 420 px (a phone) it keeps one winding
    // below and one above only when n <= 6 and the plane is wide enough: a third line at 390 px was crossed by the circle and the rays.
    drawPolarAddress(c2, pl, roots[j], { ghosts: 1, ghostsNeg: n <= 6 && size.w >= 420 ? 1 : 0, name: 'z' + subs(j) });
  }, { order: 10 });

  qPlane.addLayer((c2, pl) => {
    if (!Q || !Q.ok) return;
    const s = Q.s, ms = negC(Q.s), h = { re: Q.h, im: 0 };
    const rad = cabs(s);
    if (rad > 1e-9) drawCircle(c2, pl, ZERO, rad, { color: '--polar', width: 1.5, dash: DASH.guide, obstacle: true });
    hollowDot(c2, pl, s); if (rad > 1e-9) hollowDot(c2, pl, ms);
    let slide = null;
    if (Q.h !== 0) {
      const ends = rad > 1e-9 ? [s, ms] : [s];
      ends.forEach((q, i) => {
        const to = add(q, h);
        drawSegment(c2, pl, q, to, { arrow: true, dash: DASH.cart, color: '--cart', width: 2, obstacle: true });
        if (i === 0) slide = [q, to];
      });
    }
    const shown = Q.double ? [Q.roots[0]] : Q.roots;
    shown.forEach((r) => drawDot(c2, pl, r, { color: '--output', radius: 6, label: Z(tidyC(r)) }));
    // "slide by h" goes beside its arrow, on the side that is free (the circle, the other arrow, the dots and their words are obstacles)
    if (slide) {
      for (const z of [s, ms, ...shown]) registerObstacle(pl, { at: z, radius: 9 });
      createLabelPlacer(c2, pl)(`slide by ${N(Q.h)}`, sideCands(pl, slide[0], slide[1], { prefer: { x: 0, y: 1 } }), { color: '--cart' });
    }
  }, { order: 10 });

  // ---- views
  function setHalf(plane, key, H) {
    plane.setView({ center: ZERO, unitsAcross: 2 * H });
    plane.setHome();
    S.fitted[key] = H;
  }
  // Hand a plane back to the autofit: forget the user's pan and zoom AND the half-width last fitted, so the next fit always calls setHalf
  // (a pan or zoom changes the view but not `fitted`, so comparing the wanted half-width with `fitted` alone would skip the refit).
  function releaseFit(...keys) { for (const k of keys) { S.userView[k] = false; S.fitted[k] = NaN; } }
  function fitViews(source) {
    const { c: Hc, z: Hz } = viewHalfWidths(M);
    if (!S.userView.c && source !== 'drag' && Hc !== S.fitted.c) setHalf(cPlane, 'c', Hc);
    if (!S.userView.z && Hz !== S.fitted.z) setHalf(zPlane, 'z', Hz);
  }
  const onView = (key, plane) => plane.on('viewchange', (v) => {
    if (destroyed) return;
    if (v.reason === 'pan' || v.reason === 'zoom') S.userView[key] = true;
    else if (v.reason === 'reset') { S.userView[key] = false; S.fitted[key] = NaN; fitViews('reset'); }
  });

  // ---- text and widgets
  const cLabel = (m) => `c: ${Z(m.c)}; |c| = ${N(m.mod)}, Arg c = ${m.zero ? 'not defined' : A(m.Theta)}. Arrow keys move it, Shift moves 10 times as far.`;
  const listRows = [];
  function buildList() {
    listEl.textContent = '';
    listRows.length = 0;
    for (let k = 0; k < S.n; k++) {
      const li = mk('li', '', { id: 'roots-root-' + k });
      const btn = mk('button', 'rt-pick', { type: 'button', id: 'roots-pick-' + k, 'aria-pressed': 'false' });
      const text = mk('span', 'rt-text');
      const kEl = mk('span'), pEl = mk('span', 'rt-polar'), eqEl = mk('span', '', null, ' = '), cEl = mk('span', 'rt-cart'), aEl = mk('span');
      text.append(kEl, pEl, eqEl, cEl, aEl);
      const badges = mk('span', 'rt-badges');
      btn.append(text, badges);
      btn.addEventListener('click', () => select(k));
      li.appendChild(btn);
      listEl.appendChild(li);
      listRows.push({ li, btn, kEl, pEl, cEl, aEl, badges, sig: '' });
    }
    listN = S.n;
  }
  function patchList() {
    if (M.zero) { listEl.textContent = ''; listRows.length = 0; listEl.hidden = true; listN = -1; return; }
    listEl.hidden = false;
    if (listN !== S.n || listRows.length !== S.n) buildList();
    const pressed = S.sel % S.n;
    for (let k = 0; k < S.n; k++) {
      const r = listRows[k], line = rootLine(M, k);
      setText(r.kEl, `k = ${k}: `); setText(r.pEl, line.polar); setText(r.cEl, line.cart); setText(r.aEl, ' ' + line.argText);
      const sig = line.badges.join('|');
      if (sig !== r.sig) {
        r.sig = sig;
        r.badges.textContent = '';
        for (const b of line.badges) {
          const span = mk('span', 'badge', null, b);
          if (b === 'primitive') span.dataset.tone = 'polar';
          r.badges.appendChild(span);
        }
      }
      r.btn.setAttribute('aria-pressed', String(k === pressed));
    }
  }

  function syncFields(force) {
    if (force || document.activeElement !== reInput) { const v = fmtNum(M.c.re); if (reInput.value !== v) reInput.value = v; }
    if (force || document.activeElement !== imInput) { const v = fmtNum(M.c.im); if (imInput.value !== v) imInput.value = v; }
  }

  function activeProblem() {
    if (eq(S.c, ONE) && S.n === 5) return problemById('1.4.1');
    if (eq(S.c, { re: -16, im: 0 }) && S.n === 4) return problemById('1.4.2');
    return null;
  }

  // What the callout shows: a review problem, "c is d from the quadratic above", or the neutral line.
  function calloutNow() {
    const prob = activeProblem();
    if (prob) return { key: prob.id, prob, neutral: NEUTRAL_TEXT, lead: NEUTRAL_LEAD };
    if (Q && Q.ok && S.n === 2 && !M.zero && eq(S.c, { re: Q.d, im: 0 }, 1e-9)) return { key: 'quad ' + fmtNum(Q.d), prob: null, neutral: quadNeutralText(Q.d), lead: QUAD_LEAD };
    return { key: null, prob: null, neutral: NEUTRAL_TEXT, lead: NEUTRAL_LEAD };
  }
  function refreshCallout() {              // the callout follows the numbers at once; its slot is as tall as the tallest callout, so nothing moves
    const now = calloutNow();
    if (now.key === lastCallout) return;
    lastCallout = now.key;
    renderProblem(problemBox, now.prob, now.neutral, now.lead);
    const cur = now.prob ? now.prob.id : (S.quadFirst ? '1.4.3' : null);      // on the 1.4.3 deep link the 1.4.3 chip stays current while c and n match no review problem
    for (const [id, chip] of chipById) { if (id === cur) chip.setAttribute('aria-current', 'true'); else chip.removeAttribute('aria-current'); }
  }

  function announce(text) {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { if (!destroyed) { status.textContent = ''; status.textContent = text; } }, 400);
  }

  function raiseLabel() {
    const j = S.sel % S.n;
    if (reduced()) return S.raise.mode === 'done' ? 'Start again' : 'Next power';
    return S.raise.mode === 'playing' ? 'Skip to the end' : `Raise root ${j} to the power ${S.n}`;
  }

  function update(source) {
    if (destroyed) return;
    M = rootsModel(S.c, S.n);
    S.sel = clamp(S.sel, 0, S.n);
    // 2. the c handle
    if (source !== 'drag') cHandle.set(M.c, { silent: true });
    cHandle.el.setAttribute('aria-label', cLabel(M));
    // 3. root handles
    const hadFocus = zHandles.findIndex((h) => document.activeElement === h.el);
    for (let k = 0; k < N_MAX; k++) {
      const h = zHandles[k];
      if (M.zero || k >= S.n) { h.hidden = true; continue; }
      h.hidden = false;
      h.set(M.roots[k], { silent: true });
      h.el.setAttribute('aria-label', `Root ${k} of ${S.n}, from step k = ${k}: ${Z(M.roots[k])}. Press Enter to select it.`);
      h.setLabel(k === 0 ? (S.n <= 6 ? `k = 0, ${S.n}` : `0, ${S.n}`) : (S.n <= 6 ? `k = ${k}` : `${k}`));
    }
    if (hadFocus >= S.n && S.n > 0) { try { zHandles[S.n - 1].el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    // 4. views
    fitViews(source);
    // 5. text
    setText(readout, rootsReadout(M));
    setText(nOut, String(S.n));
    if (Number(nSlider.value) !== S.n) nSlider.value = String(S.n);
    for (const [key, b] of presetBtns) b.setAttribute('aria-pressed', String(eq(S.c, PRESETS[key].c, 1e-9) && S.n === PRESETS[key].n));
    setText(wrapNoteEl, M.zero ? '' : wrapNote(M));
    setText(primNoteEl, primitiveNote(M));
    primNoteEl.hidden = M.zero;
    zeroNoteEl.hidden = !M.zero;
    wrapNoteEl.hidden = M.zero;
    syncFields(false);
    refreshCallout();
    // 6. list
    patchList();
    // 7. staircase
    if (stairsN !== S.n) {
      stairs.destroy();
      stairsHost.textContent = '';
      stairs = stairsOf();
      stairsN = S.n;
    }
    stairs.update(M.zero ? null : M.Theta);
    stairs.setPicked(M.zero ? null : S.sel);
    // 8. notes and explainer
    setText(pickNoteEl, M.zero ? '' : pickNote(M, S.sel));
    setText(exHeading, M.zero ? 'Both addresses' : `Both addresses, for step k = ${S.sel}`);
    explainer.update({ M, k: S.sel });
    // 9. the raise button
    setText(raiseBtn, raiseLabel());
    raiseBtn.dataset.state = S.raise.mode;
    raiseBtn.disabled = M.zero;
    // 10. redraw
    cPlane.requestDraw();
    zPlane.requestDraw();
    // 11. spoken summary
    if (source === 'preset' || source === 'n' || source === 'input' || source === 'load') {
      announce(M.zero ? 'c is 0: every root is 0.' : `${S.n} roots of ${Z(M.c)}: each ${N(M.rho)} from 0, ${fmtNum(360 / S.n, 1)} degrees apart.`);
    } else if (source === 'select') {
      announce(pickNoteEl.textContent);
    }
  }

  // ---- state changes
  function showCError(msg) { setText(cError, msg); }
  function setNumber(z, source) {
    let zz = { re: z.re, im: z.im };
    const m = cabs(zz);
    if (m > C_MAX) { zz = { re: zz.re * C_MAX / m, im: zz.im * C_MAX / m }; showCError(BIG_MSG); }
    // The big-number message stays while the student only moves to the other field: the corrected value is written back to the first field when
    // it loses focus, and the next input event re-reads that same in-range value. It goes at the first edit that really changes c.
    else if (!(source === 'input' && cError.textContent === BIG_MSG && eq(zz, S.c, 1e-12))) showCError('');
    S.c = zz;
    releaseFit('c', 'z');
    cancelRaise();
    update(source);
  }
  function setN(n) {
    const nn = clamp(Math.round(Number(n)), N_MIN, N_MAX);
    if (!Number.isFinite(nn)) return;
    S.n = nn;
    releaseFit('z');                 // the root planes have no Reset button: a new n is their way back to the fitted view
    cancelRaise();
    update('n');
  }
  function select(k) {
    if (destroyed) return;
    const kk = clamp(Math.round(k), 0, S.n);
    if (S.raise.mode !== 'idle' && S.raise.k !== kk) cancelRaise();
    S.sel = kk;
    update('select');
  }
  function applyPreset(key) {
    const p = PRESETS[key];
    S.c = { re: p.c.re, im: p.c.im };
    S.n = p.n;
    S.sel = 0;
    releaseFit('c', 'z');
    showCError('');
    cancelRaise();
    update('preset');
  }
  function onCDrag(z, info) {
    if (destroyed) return;
    let zz = { re: z.re, im: z.im };
    const m = cabs(zz);
    let moved = false;
    if (m > C_MAX) { zz = { re: zz.re * C_MAX / m, im: zz.im * C_MAX / m }; moved = true; }
    else if (cError.textContent === BIG_MSG) showCError('');          // a drag back into range ends the old message
    if (info && info.final && info.source === 'pointer') {
      const v = cPlane.getView();
      const z2 = snapToGrid(zz, niceGridStep(v.unitsAcross), 6 / v.scale);
      if (z2.re !== zz.re || z2.im !== zz.im) { zz = z2; moved = true; }
    }
    if (moved) cHandle.set(zz, { silent: true });
    S.c = zz;
    if (S.raise.mode !== 'idle') cancelRaise();
    update('drag');
  }

  // ---- the raise
  const RAISE_IDLE = 'Pick a step, then raise its root to the power n to see it land on c.';
  setText(raiseOut, RAISE_IDLE);
  function raiseLine(m) {
    const st = M.steps[Math.min(S.raise.k, M.n)];
    const p = fromPolar(Math.pow(M.rho, m), m * st.raw);
    let line = `z^${m} = ${Z(tidyC(p))} (length ${N(Math.pow(M.rho, m))}, angle ${A(m * st.raw)})`;
    if (m === M.n) {
      line += ' = c';
      if (M.isOne) { const ord = M.order[st.j]; line += `. This root has order ${ord}: z^${ord} = 1 first.`; }
    }
    return line;
  }
  function applyRaise(t) {
    S.raise.t = t;
    const pts = raiseSamples(M, Math.min(S.raise.k, M.n), t);
    if (!raiseCurve && pts.length >= 2) {
      raiseCurve = cPlane.addCurve({ id: 'raise', points: pts, color: '--polar', ramp: true, dots: true, arrow: true, width: 2.5, order: 40 });
    }
    if (raiseCurve) {
      raiseCurve.update(pts);
      raiseCurve.hidden = pts.length < 2;
      raiseCurve.setCursor(pts[pts.length - 1].t);
    }
    const m = Math.floor(t + 1e-9);
    if (m !== lastM) { lastM = m; setText(raiseOut, raiseLine(m)); }
    cPlane.requestDraw();
  }
  function setRaiseUi() { setText(raiseBtn, raiseLabel()); raiseBtn.dataset.state = S.raise.mode; }
  function tick(now) {
    loopId = 0;
    if (destroyed || S.raise.mode !== 'playing') return;
    const u = clamp((now - S.raise.startedAt) / raiseDurationMs(M.n), 0, 1);
    applyRaise(1 + (M.n - 1) * u);
    if (u < 1) loopId = requestAnimationFrame(tick);
    else { S.raise.mode = 'done'; setRaiseUi(); announce(raiseOut.textContent); }
  }
  function finishRaise() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = 0;
    applyRaise(M.n);
    S.raise.mode = 'done';
    setRaiseUi();
    announce(raiseOut.textContent);
  }
  function stepRaise() {
    if (M.zero) return;
    if (S.raise.mode !== 'stepping') { S.raise = { mode: 'stepping', k: S.sel, m: 1, t: 1, startedAt: 0 }; lastM = 0; }
    S.raise.m += 1;
    applyRaise(S.raise.m);
    if (S.raise.m >= M.n) { S.raise.mode = 'done'; announce(raiseOut.textContent); }
    setRaiseUi();
  }
  function startRaise() {
    if (destroyed || M.zero) return;
    if (reduced()) {
      if (S.raise.mode === 'done') S.raise = { mode: 'idle', t: 1, m: 1, k: S.sel, startedAt: 0 };
      stepRaise();
      return;
    }
    if (S.raise.mode === 'playing') { finishRaise(); return; }
    if (loopId) cancelAnimationFrame(loopId);
    S.raise = { mode: 'playing', k: S.sel, t: 1, m: 1, startedAt: performance.now() };
    lastM = 0;
    applyRaise(1);
    setRaiseUi();
    loopId = requestAnimationFrame(tick);
  }
  function cancelRaise() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = 0;
    const was = S.raise.mode;
    S.raise = { mode: 'idle', t: 1, m: 1, k: S.raise.k, startedAt: 0 };
    lastM = 0;
    if (raiseCurve) raiseCurve.hidden = true;
    setText(raiseOut, RAISE_IDLE);
    if (was !== 'idle') { setRaiseUi(); cPlane.requestDraw(); }
  }

  // ---- the quadratic panel
  function updateQuadratic() {
    if (destroyed) return;
    const a = parseField(qInputs.a), b = parseField(qInputs.b), c = parseField(qInputs.c);
    if (![a, b, c].every(Number.isFinite)) { setText(quadError, 'Type numbers for a, b and c.'); return; }
    setText(quadError, '');
    S.quad = { a, b, c };
    Q = quadraticModel(a, b, c);
    setText(quadReadout, quadraticReadout(Q));
    setText(quadStory, quadraticStory(Q));
    qexplainer.update(Q);
    quadLoad.disabled = !Q.ok;       // a = 0 has no square roots of d to show
    refreshCallout();                // c may or may not be d of this quadratic any more
    if (Q.ok) qPlane.fitTo([Q.rootsOfD[0], Q.rootsOfD[1], Q.roots[0], Q.roots[1], ZERO], 0.3);
    qPlane.requestDraw();
    announce(Q.ok ? `Roots: ${Z(Q.roots[0])}, ${Z(Q.roots[1])}.` : quadraticReadout(Q));
  }

  // ---- controls
  for (const [key, b] of presetBtns) b.addEventListener('click', () => { if (!destroyed) applyPreset(key); });
  nSlider.addEventListener('input', () => { if (!destroyed) setN(Number(nSlider.value)); });
  const readC = () => {
    const re = parseField(reInput), im = parseField(imInput);
    return Number.isFinite(re) && Number.isFinite(im) ? { re, im } : null;
  };
  const onCField = () => { const z = readC(); if (z && !destroyed) { reInput.removeAttribute('aria-invalid'); imInput.removeAttribute('aria-invalid'); setNumber(z, 'input'); } };
  const onCChange = () => {
    if (destroyed) return;
    const z = readC();
    if (!z) {
      reInput.setAttribute('aria-invalid', String(!Number.isFinite(parseField(reInput))));
      imInput.setAttribute('aria-invalid', String(!Number.isFinite(parseField(imInput))));
      showCError('Type a number, like -16 or 0.5.');
      syncFields(true);
      return;
    }
    reInput.removeAttribute('aria-invalid'); imInput.removeAttribute('aria-invalid');
    syncFields(true);
  };
  reInput.addEventListener('input', onCField); imInput.addEventListener('input', onCField);
  reInput.addEventListener('change', onCChange); imInput.addEventListener('change', onCChange);
  raiseBtn.addEventListener('click', startRaise);
  for (const key of ['a', 'b', 'c']) { qInputs[key].addEventListener('input', updateQuadratic); qInputs[key].addEventListener('change', updateQuadratic); }
  quadLoad.addEventListener('click', () => {
    if (destroyed || !Q || !Q.ok) return;
    S.n = 2;
    S.sel = 0;
    setNumber({ re: Q.d, im: 0 }, 'load');
    announce(`The big picture now shows the square roots of ${N(Q.d)}.`);
  });
  const offViews = [onView('c', cPlane), onView('z', zPlane)];

  // ---- first render (synchronous): everything is filled before the first frame
  buildList();
  update('mount');
  updateQuadratic();
  clearTimeout(statusTimer);

  mv.roots = {
    state() {
      return {
        c: { re: M.c.re, im: M.c.im }, n: S.n, sel: S.sel, rho: M.rho, Theta: M.Theta,
        roots: M.roots.map((r) => ({ re: r.re, im: r.im })), raw: M.steps.map((st) => st.raw),
        raise: { mode: S.raise.mode, m: S.raise.mode === 'stepping' ? S.raise.m : Math.floor(S.raise.t + 1e-9) },
        view: { c: cPlane.getView().unitsAcross / 2, z: zPlane.getView().unitsAcross / 2 },      // the half-widths the planes show now
      };
    },
    setC(re, im) { setNumber({ re: Number(re), im: Number(im) }, 'input'); },
    setN(n) { setN(n); },
    select(k) { select(k); },
    quadratic() { return Q; },
  };
  const hook = mv.roots;

  return function unmount() {
    if (destroyed) return;
    destroyed = true;
    if (loopId) cancelAnimationFrame(loopId);
    loopId = 0;
    clearTimeout(statusTimer);
    for (const off of offViews) { try { off(); } catch (e) { /* already gone */ } }
    for (const d of disposables) { try { d(); } catch (e) { /* already gone */ } }
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    if (mv.roots === hook) delete mv.roots;
  };
}
