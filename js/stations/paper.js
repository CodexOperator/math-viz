// The flat paper. One plant, three formulas, four fate words.
// Council round 1: reframes/COUNCIL.md. The gesture is dragging the plant.
// Again applies the formula once. The slide c is a square in the ink of the page.

import { createPlane, drawCircle, drawSegment, drawDot, drawLabel, cssColor } from '../core/plane.js';
import { juliaWalk, newtonWalk, effectiveEscape } from '../core/fractal.js';
import { fmtCart, fmtNum } from '../core/complex.js';
import { tex } from '../core/katex.js';
import { sectionHref } from '../data/book.js';
import { h, sourceTag, placeLinks, storyLinks } from './test2-ui.js';

export const PAPER_CAP = 8;

// Distance 0.01, stored as a square. The Newton picture uses this same number.
// Landed is this test. Settles is Definition 4.1.1, every disk, and no finite step is that.
export const LANDED_TOL2 = 1e-4;

const EIGHTH = Object.freeze({ re: Math.SQRT1_2, im: Math.SQRT1_2 });
const INSIDE = Object.freeze({ re: 0.5, im: 0.25 });
const OUTSIDE = Object.freeze({ re: 1.5, im: 0 });
const GREEN = Object.freeze({ re: 0.45, im: 0.2 });
const BOOK = Object.freeze({ re: 0.25, im: 0.25 });
const GUESS = Object.freeze({ re: 0.35, im: 0.45 });
const HALF = Object.freeze({ re: 0.5, im: 0.5 });
const I = Object.freeze({ re: 0, im: 1 });
const MI = Object.freeze({ re: 0, im: -1 });
const ONE = Object.freeze({ re: 1, im: 0 });
const SQRT3 = Math.sqrt(3);
const CUBE = Object.freeze([
  Object.freeze({ re: 1, im: 0 }),
  Object.freeze({ re: -0.5, im: SQRT3 / 2 }),
  Object.freeze({ re: -0.5, im: -SQRT3 / 2 }),
]);
const PAIR = Object.freeze([I, MI]);

const CSS = `
.paper-formula { margin: 0 0 var(--space-2); min-width: 0; overflow-wrap: anywhere; }
.paper-fates { margin: var(--space-3) 0 0; display: grid; gap: var(--space-2); }
.paper-fate { margin: 0; font-weight: 700; overflow-wrap: anywhere; }
.paper-fate[data-token="cart"] { color: var(--cart); }
.paper-fate[data-token="polar"] { color: var(--polar); }
.paper-fate[data-token="output"] { color: var(--output); }
.paper-fate[data-token="text"] { color: var(--text); }
.paper-readout { margin: 0; overflow-wrap: anywhere; }
.paper-aside { margin: var(--space-2) 0 0; }
.paper-steps { margin: var(--space-2) 0 0; }
`;

function finite(z) {
  return !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
}
function cabs(z) { return Math.hypot(z.re, z.im); }
function cadd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
function cmul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if (!(d > 0)) return null;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function cpow(z, n) {
  let r = { re: 1, im: 0 };
  for (let i = 0; i < n; i++) r = cmul(r, z);
  return r;
}
function near(a, b, eps = 1e-8) {
  return Math.hypot(a.re - b.re, a.im - b.im) <= eps;
}
function clampSteps(n) {
  const k = n | 0;
  if (k < 0) return 0;
  if (k > PAPER_CAP) return PAPER_CAP;
  return k;
}
function fmtMod(x) {
  if (x === 0) return '0';
  if (!Number.isFinite(x)) return 'larger than a million';
  if (x > 1e6) return 'larger than a million';
  return fmtNum(x, x >= 20 ? 1 : 3);
}
function logSum(mods) {
  let log = 0;
  for (const m of mods) {
    if (!(m > 0)) return m === 0 ? 0 : NaN;
    log += Math.log(m);
  }
  if (log > 40) return Infinity;
  return Math.exp(log);
}

function powerFate(z) {
  const r = cabs(z);
  if (r < 1 - 1e-9) return 'settles';
  if (r > 1 + 1e-9) return 'leaves';
  if (near(z, ONE)) return 'settles';
  return 'stays';
}

function squareFate(z) {
  const r = cabs(z);
  if (r < 1 - 1e-9) return 'settles';
  if (r > 1 + 1e-9) return 'leaves';
  let p = { re: z.re, im: z.im };
  for (let i = 0; i < 12; i++) {
    if (near(p, ONE, 1e-6)) return 'settles';
    p = { re: p.re * p.re - p.im * p.im, im: 2 * p.re * p.im };
  }
  return 'stays';
}

function orbitFate(z, c) {
  const R = effectiveEscape(c, 2);
  const w = juliaWalk(z, c, 48, R * R);
  if (w.escaped) return 'leaves';
  const tail = w.points.slice(-6);
  let diam = 0;
  for (let i = 0; i < tail.length; i++) {
    for (let j = i + 1; j < tail.length; j++) {
      diam = Math.max(diam, Math.hypot(tail[i].re - tail[j].re, tail[i].im - tail[j].im));
    }
  }
  return diam < 0.05 ? 'settles' : 'stays';
}

// N'(z) = 1 + L'/L^2, L = Σ 1/(z − root). At a simple root this is 0.
// Null means the logarithmic derivative vanished away from the roots.
export function newtonFactor(z, roots) {
  for (const r of roots) if (near(z, r, 1e-8)) return { re: 0, im: 0 };
  let L = { re: 0, im: 0 };
  let Lp = { re: 0, im: 0 };
  for (const r of roots) {
    const inv = cdiv(ONE, { re: z.re - r.re, im: z.im - r.im });
    if (!inv) return { re: 0, im: 0 };
    L = cadd(L, inv);
    const inv2 = cmul(inv, inv);
    Lp = { re: Lp.re - inv2.re, im: Lp.im - inv2.im };
  }
  const L2 = cmul(L, L);
  if (cabs(L2) < 1e-18) return null;
  const quot = cdiv(Lp, L2);
  if (!quot) return null;
  return { re: 1 + quot.re, im: quot.im };
}

function productAlong(points, factorAt) {
  if (points.length < 2) return { value: 1, empty: true, undefined: false };
  const mods = [];
  for (let i = 0; i < points.length - 1; i++) {
    const f = factorAt(points[i]);
    if (!f) return { value: NaN, empty: false, undefined: true };
    const m = cabs(f);
    if (!Number.isFinite(m)) return { value: NaN, empty: false, undefined: true };
    mods.push(m);
  }
  return { value: logSum(mods), empty: false, undefined: false };
}

function seriesFate(z) {
  const r = cabs(z);
  if (r < 1 - 1e-9) return { bags: 'settles', pile: 'settles', bagsAt: 'zero' };
  if (near(z, ONE)) return { bags: 'settles', pile: 'leaves', bagsAt: 'one' };
  if (r > 1 + 1e-9) return { bags: 'leaves', pile: 'leaves', bagsAt: 'out' };
  return { bags: 'stays', pile: 'stays', bagsAt: 'circle' };
}

function tokenOf(word, rootToken) {
  if (word === 'which') return rootToken || 'text';
  if (word === 'leaves') return 'polar';
  if (word === 'settles' || word === 'stays') return 'cart';
  return 'text';
}

function twistTexts(z, c, steps, powersWord, squaresWord, orbitWord) {
  const fates = [];
  const pure = cabs(c) < 1e-12;
  if (pure) {
    fates.push({
      id: 'powers', word: powersWord, token: tokenOf(powersWord),
      text: powersWord === 'settles'
        ? 'Powers: settles at 0. The modulus is under 1, so the powers go to 0. Definition 4.1.1.'
        : powersWord === 'leaves'
          ? 'Powers: leaves. The modulus is over 1, so the powers run off every disk.'
          : 'Powers: stays. The modulus is 1, so the list never leaves the unit circle, and it does not sit down at one point. Definition 4.1.1. Theorem 4.1.8 says a list that settles is bounded. This one is the converse failing.',
    });
    fates.push({
      id: 'squares', word: squaresWord, token: tokenOf(squaresWord),
      text: squaresWord === 'settles' && cabs(z) < 1 - 1e-9
        ? 'Squares: settles at 0. Inside the unit circle, squaring sends the plant to 0. Example 4.2.8. The two trails share this fate.'
        : squaresWord === 'settles'
          ? 'Squares: settles at 1. Squaring doubles the angle, and this plant lands on 1. On the unit circle the two trails part.'
          : squaresWord === 'leaves'
            ? 'Squares: leaves. Outside the unit circle, squaring runs the modulus off every disk. Example 4.2.8.'
            : 'Squares: stays on the unit circle. The angle doubles and the plant does not sit down. Example 4.2.8: that circle is the edge. On the circle the two trails part.',
    });
  } else {
    fates.push({
      id: 'orbit', word: orbitWord, token: tokenOf(orbitWord),
      text: orbitWord === 'settles'
        ? 'Settles. The landings of z² + c crowd at one point. The notch is off 0, so this is no longer the disk of Example 4.2.8.'
        : orbitWord === 'leaves'
          ? 'Leaves. The landings of z² + c are headed off every disk. The square labeled c is the slide that did this. It is not an orange point.'
          : 'Stays. The landings of z² + c remain in some disk and do not sit down at one point.',
    });
  }
  return fates;
}

// The first footprint within 0.01 of a root, or null. Index 0 is the plant.
function firstLanding(points, roots) {
  for (let i = 0; i < points.length; i++) {
    for (let k = 0; k < roots.length; k++) {
      const dx = points[i].re - roots[k].re;
      const dy = points[i].im - roots[k].im;
      if (dx * dx + dy * dy <= LANDED_TOL2) return { index: i, root: k };
    }
  }
  return null;
}

function newtonTexts(name, token, landedAt, stepsShown, realWall, undefinedAt) {
  if (undefinedAt) {
    return [{
      id: 'newton', word: 'none', token: 'text',
      text: 'No fate. p′(z) is 0 here, so z − p(z)/p′(z) has no value. There is no landing and no root to name.',
    }];
  }
  if (realWall) {
    return [{
      id: 'newton', word: 'leaves', token: 'polar',
      text: 'Leaves, and every landing stays real, so the walk never answers which root. Example 4.2.4. The real axis is a wall the formula forces. The seam where Arg jumps is a choice of name, on the staircase, not this wall.',
    }];
  }
  const landed = landedAt == null
    ? (stepsShown < 1
      ? 'Not landed. No step yet. Landed means within 0.01, the same test as the Newton picture. The fate of the walk is still that root.'
      : 'Not landed. These steps are still farther than 0.01 from that root. Landed means within 0.01, the same test as the Newton picture. The fate of the walk is still that root.')
    : `Landed at step ${landedAt}. That step is within 0.01 of the root, the same test as the Newton picture.`;
  return [{
    id: 'newton', word: 'which', token,
    text: `Which root: ${name}. ${landed}`,
  }];
}

function seriesTexts(kind) {
  const bags = kind.bags === 'settles' && kind.bagsAt === 'one'
    ? 'Bags: settles at 1, not at 0. The terms do not go to 0, so the pile cannot settle. Theorem 4.1.17.'
    : kind.bags === 'settles'
      ? 'Bags: settles at 0. The terms go to 0. Theorem 4.1.17 says that much is necessary. It does not say it is enough.'
      : kind.bags === 'leaves'
        ? 'Bags: leaves. The terms run off, so the pile cannot settle. Theorem 4.1.17.'
        : 'Bags: stays on the unit circle. They do not go to 0, so the pile cannot settle. Theorem 4.1.17.';
  const pile = kind.pile === 'settles'
    ? 'Pile: settles at 1/(1 − z). Theorem 4.3.1, marked likely. The partial sums are the other mark.'
    : kind.pile === 'leaves'
      ? 'Pile: leaves. The partial sums run off every disk.'
      : 'Pile: stays. The partial sums remain in a disk and do not sit down.';
  return [
    { id: 'bags', word: kind.bags, token: tokenOf(kind.bags), text: bags },
    { id: 'pile', word: kind.pile, token: tokenOf(kind.pile), text: pile },
  ];
}

function copyPoints(pts) {
  return pts.map((p) => ({ re: p.re, im: p.im }));
}

// The picture and the words for one plant, one formula, and the steps Again has applied.
export function describePaper(input) {
  const src = input || {};
  const grip = src.grip === 'newton2' || src.grip === 'newton3' || src.grip === 'stack' ? src.grip : 'twist';
  const z = finite(src.z) ? { re: src.z.re, im: src.z.im } : { re: 0, im: 0 };
  const c = finite(src.c) ? { re: src.c.re, im: src.c.im } : { re: 0, im: 0 };
  const steps = clampSteps(src.steps);
  const place = cabs(z);
  const trails = [];
  const pins = [];
  let notch = null;
  let formulaTex = 'z^2+c';
  let fates = [];
  let readouts = [];
  let aside = '';
  let oneStep = null;
  let product = null;

  if (grip === 'twist') {
    formulaTex = 'z^2+c';
    notch = { re: c.re, im: c.im };
    const pure = cabs(c) < 1e-12;
    const drawn = juliaWalk(z, c, steps, 1e12);
    const orbitPts = copyPoints(drawn.points);
    oneStep = 2 * place;
    const prod = productAlong(orbitPts, (p) => ({ re: 2 * p.re, im: 2 * p.im }));
    product = prod.undefined ? null : prod.value;
    if (pure) {
      const powers = [];
      for (let n = 1; n <= steps; n++) powers.push(cpow(z, n));
      if (powers.length) trails.push({ id: 'powers', points: powers, token: tokenOf(powerFate(z)), dash: true, shape: 'dot' });
      trails.push({ id: 'squares', points: orbitPts, token: tokenOf(squareFate(z)), dash: false, shape: 'dot' });
      fates = twistTexts(z, c, steps, powerFate(z), squareFate(z), null);
    } else {
      const word = orbitFate(z, c);
      trails.push({ id: 'orbit', points: orbitPts, token: tokenOf(word), dash: false, shape: 'dot' });
      fates = twistTexts(z, c, steps, null, null, word);
    }
    const prodText = prod.empty
      ? 'No step yet, so the product has no factor. The empty product is 1, and that 1 is not |z|.'
      : `Product of the derivatives along the ${prod.empty ? 0 : orbitPts.length - 1} step${orbitPts.length - 1 === 1 ? '' : 's'} shown: ${fmtMod(product)}.`;
    readouts = [
      { id: 'place', text: `|z| = ${fmtMod(place)}.` },
      { id: 'pinch', text: `|f′(z)| = |2z| = ${fmtMod(oneStep)}. The derivative is Equation 3.1.1. For z² + c it is 2z, so this number does not know c.` },
      { id: 'product', text: `${prodText} Equation 3.1.10, the chain rule, multiplies those factors.` },
    ];
    aside = 'Three different numbers. |z| < 1 is the disk of Example 4.2.8. |f′(z₀)| < 1 is Definition 4.2.18 and Theorem 4.2.20, and for a fixed point of z² + c it is the cardioid c = λ/2 − λ²/4. Exercise 12 asks for the chain rule on a cycle. The product of the two derivatives is the check added on the index, not a formula the book prints. This page does not draw the set of c.';
  } else if (grip === 'newton2' || grip === 'newton3') {
    const roots = grip === 'newton2' ? PAIR : CUBE;
    const names = grip === 'newton2'
      ? ['i, the blue pin', '−i, the orange pin']
      : ['1, the blue pin', 'the upper cube root of 1, the orange pin', 'the lower cube root of 1, the purple pin'];
    const tokens = grip === 'newton2' ? ['cart', 'polar'] : ['cart', 'polar', 'output'];
    formulaTex = grip === 'newton2' ? 'z-(z^2+1)/(2z)' : 'z-(z^3-1)/(3z^2)';
    roots.forEach((r, i) => pins.push({ re: r.re, im: r.im, token: tokens[i], name: names[i] }));
    const p0 = newtonFactor(z, roots);
    const undefinedAt = !p0;
    // A negative tolerance draws every requested step. Landing is a sentence about
    // those steps, not a reason to drop the book's last iterate.
    const walk = undefinedAt
      ? { points: [{ re: z.re, im: z.im }], root: -1, steps: 0 }
      : newtonWalk(z, roots, steps, -1);
    const pts = copyPoints(walk.points);
    const hit = undefinedAt ? null : firstLanding(pts, roots);
    const realWall = grip === 'newton2' && !undefinedAt && Math.abs(z.im) <= 1e-10 && !hit;
    let namedRoot = -1;
    let rootToken = null;
    if (!undefinedAt && !realWall && hit) {
      namedRoot = hit.root;
      rootToken = tokens[hit.root];
    } else if (!undefinedAt && !realWall) {
      const long = newtonWalk(z, roots, 24, LANDED_TOL2);
      if (long.root >= 0) {
        namedRoot = long.root;
        rootToken = tokens[long.root];
      }
    }
    const word = undefinedAt ? 'none' : realWall ? 'leaves' : 'which';
    trails.push({
      id: 'newton', points: pts,
      token: word === 'which' ? 'text' : tokenOf(word),
      dash: false, shape: 'dot',
    });
    const name = namedRoot >= 0 ? names[namedRoot] : 'a root';
    fates = newtonTexts(name, rootToken || 'text', hit ? hit.index : null, steps, realWall, undefinedAt);
    const prod = undefinedAt
      ? { value: null, empty: true, undefined: true }
      : productAlong(pts, (p) => newtonFactor(p, roots));
    product = prod.undefined ? null : prod.value;
    oneStep = p0 ? cabs(p0) : null;
    readouts = [
      { id: 'root-mult', text: 'At a simple root the multiplier of this correction is 0.' },
      {
        id: 'product',
        text: undefinedAt
          ? 'The correction is undefined at this plant, so there is no product.'
          : prod.empty
            ? 'No step yet. The empty product is 1. The multiplier at a root is a different number, 0.'
            : prod.undefined
              ? 'A factor along these steps is undefined.'
              : `Product of the multipliers along the ${pts.length - 1} step${pts.length - 1 === 1 ? '' : 's'} shown: ${fmtMod(product)}.`,
      },
    ];
    aside = grip === 'newton2'
      ? 'The formula is z − p(z)/p′(z) for p(z) = z² + 1. Example 4.2.1 prints five steps from 1/4 + i/4. Landed, within 0.01, is the fourth of those steps. The fifth is the iterate the book prints on i. Orange on a pin is the root −i. It is not a point that escaped, and it is not c.'
      : 'The formula is z − p(z)/p′(z) for p(z) = z³ − 1. The guess 0.35 + 0.45i is the one the Newton picture opens on. Landed, within 0.01, is its fifth step, on the purple root. The book colours z³ + 1 in Figures 4.2.5 and 4.2.6 [PDF Figure 4.3]. These three pins are the cube roots of 1. Orange is the upper one. Purple is the lower one.';
  } else {
    formulaTex = 'z^n';
    const kind = seriesFate(z);
    const bags = [];
    let sum = { re: 0, im: 0 };
    const pile = [];
    let term = { re: 1, im: 0 };
    for (let n = 0; n < steps; n++) {
      bags.push({ re: term.re, im: term.im });
      sum = cadd(sum, term);
      pile.push({ re: sum.re, im: sum.im });
      term = cmul(term, z);
    }
    if (bags.length) trails.push({ id: 'bags', points: bags, token: tokenOf(kind.bags), dash: false, shape: 'square' });
    if (pile.length) trails.push({ id: 'pile', points: pile, token: tokenOf(kind.pile), dash: false, shape: 'dot' });
    fates = seriesTexts(kind);
    let sumText = '';
    if (kind.pile === 'settles') {
      const closed = cdiv(ONE, { re: 1 - z.re, im: -z.im });
      if (closed) sumText = ` The sum is ${fmtCart(closed, 3)}.`;
    }
    if (sumText) fates[1] = { ...fates[1], text: fates[1].text.replace('1/(1 − z).', `1/(1 − z).${sumText}`) };
    readouts = [
      { id: 'ratio', text: `|z| = ${fmtMod(place)}. This number is the ratio of the bags, not a derivative.` },
    ];
    aside = 'Two marks. The squares are the bags, the terms. The dots are the pile, the partial sums. Theorem 4.1.17 is one direction. Theorem 4.3.1, marked likely, is this series inside the unit circle. The circle is the same wall as c = 0, read this time as the bags shrinking.';
    oneStep = null;
    product = null;
  }

  return {
    grip, steps, formulaTex, notch, pins, trails, fates, readouts, aside,
    place, oneStep, product,
  };
}

const CITES = [
  { pin: '§4.1, Definition 4.1.1 [PDF Definition 4.1]', href: sectionHref('sec_sequences-series.html', 'Seq_Lim_Def') },
  { pin: '§4.1, Definition 4.1.7 and Theorem 4.1.8 [PDF Definition 4.2 and Theorem 4.2]', href: sectionHref('sec_sequences-series.html', 'Bounded_Def') },
  { pin: '§4.1, Theorem 4.1.17 [PDF Theorem 4.5]', href: sectionHref('sec_sequences-series.html', 'Conv_terms_go_to_0') },
  { pin: '§4.2, Example 4.2.8 [PDF Example 4.9]', href: sectionHref('sec_julia-mandelbrot.html', 'K-0') },
  { pin: '§4.2, f_c(z) = z² + c', href: sectionHref('sec_julia-mandelbrot.html', 'K-0') },
  { pin: '§4.2, Example 4.2.1 [PDF Example 4.7]', href: sectionHref('sec_julia-mandelbrot.html', 'Newton_s_Method_Ex') },
  { pin: '§4.2, Example 4.2.4 [PDF Example 4.8]', href: sectionHref('sec_julia-mandelbrot.html', 'ex_4_8') },
  { pin: '§4.2, Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Theorem 4.2.20 [PDF Theorem 4.11]', href: sectionHref('sec_julia-mandelbrot.html', 'Fixed_point_Def') },
  { pin: '§4.2, Exercise 12', href: sectionHref('sec_julia-mandelbrot.html', 'x4_2_12') },
  { pin: '§4.2, Figures 4.2.5 and 4.2.6 [PDF Figure 4.3]', href: sectionHref('sec_julia-mandelbrot.html', 'fig_ch-04-cp-1') },
  { pin: '§4.3, Theorem 4.3.1 [PDF Theorem 4.12]', href: sectionHref('sec_convergence-theorems.html', 'Geometric_Series') },
  { pin: '§3.1, Equation 3.1.1, the derivative', href: sectionHref('sec_diff-analytic.html', 'Deriv_Def_1') },
  { pin: '§3.1, Equation 3.1.10, the chain rule', href: sectionHref('sec_diff-analytic.html', 'sec_diff-analytic-14-5') },
];

function drawSquare(ctx, plane, z, token, size) {
  const p = plane.toPixel(z);
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
  if (Math.abs(p.x) > 8000 || Math.abs(p.y) > 8000) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x - size, p.y - size, size * 2, size * 2);
  ctx.fillStyle = cssColor('--surface');
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = cssColor(token === 'ink' ? '--text' : `--${token}`);
  ctx.stroke();
  ctx.restore();
}

function drawDiamond(ctx, plane, z, token) {
  const p = plane.toPixel(z);
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
  const s = 7;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - s);
  ctx.lineTo(p.x + s, p.y);
  ctx.lineTo(p.x, p.y + s);
  ctx.lineTo(p.x - s, p.y);
  ctx.closePath();
  ctx.fillStyle = cssColor(`--${token}`);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = cssColor('--surface');
  ctx.stroke();
  ctx.restore();
}

function onPaper(p) {
  return cabs(p) < 8;
}

export function mount(el, ctx) {
  const style = document.createElement('style');
  style.setAttribute('data-for', 'paper');
  style.textContent = CSS;
  document.head.appendChild(style);

  const state = {
    grip: 'twist',
    z: { re: EIGHTH.re, im: EIGHTH.im },
    c: { re: 0, im: 0 },
    steps: PAPER_CAP,
    example: 'eighth',
  };

  const formula = h('p', { class: 'paper-formula', id: 'paper-formula' });
  const fateHost = h('div', { class: 'paper-fates', id: 'paper-fates', 'aria-live': 'polite' });
  const readoutHost = h('div', { id: 'paper-readouts' });
  const aside = h('p', { class: 'paper-aside', id: 'paper-aside' });
  const stepsLine = h('p', { class: 'paper-steps', id: 'paper-steps' });
  const again = h('button', { type: 'button', class: 'btn', id: 'paper-again' }, 'Again');
  const planeHost = h('div', { id: 'paper-plane-host' });

  const gripDefs = [
    { id: 'twist', label: 'Twist, z² + c' },
    { id: 'newton2', label: 'Correction, z² + 1' },
    { id: 'newton3', label: 'Correction, z³ − 1' },
    { id: 'stack', label: 'Stack, the bags zⁿ' },
  ];
  const exampleDefs = [
    { id: 'eighth', grip: 'twist', label: '(1+i)/√2, c = 0', z: EIGHTH, c: { re: 0, im: 0 }, steps: 8 },
    { id: 'inside', grip: 'twist', label: '1/2 + i/4, c = 0', z: INSIDE, c: { re: 0, im: 0 }, steps: 8 },
    { id: 'outside', grip: 'twist', label: '3/2, c = 0', z: OUTSIDE, c: { re: 0, im: 0 }, steps: 6 },
    { id: 'c0', grip: 'twist', label: 'c = 0', keepZ: true, c: { re: 0, im: 0 }, steps: 8 },
    { id: 'cm75', grip: 'twist', label: 'c = −0.75', z: GREEN, c: { re: -0.75, im: 0 }, steps: 8 },
    { id: 'ci', grip: 'twist', label: 'c = i', z: GREEN, c: { re: 0, im: 1 }, steps: 8 },
    { id: 'book', grip: 'newton2', label: '1/4 + i/4', z: BOOK, steps: 5 },
    { id: 'real', grip: 'newton2', label: 'real 1/2', z: { re: 0.5, im: 0 }, steps: 8 },
    { id: 'guess', grip: 'newton3', label: '0.35 + 0.45i', z: GUESS, steps: 5 },
    { id: 'near1', grip: 'newton3', label: 'near 1', z: { re: 0.8, im: 0.1 }, steps: 5 },
    { id: 'geom', grip: 'stack', label: '(1+i)/2', z: HALF, steps: 8 },
    { id: 'belt', grip: 'stack', label: '(1+i)/√2', z: EIGHTH, steps: 8 },
    { id: 'run', grip: 'stack', label: '6/5', z: { re: 1.2, im: 0 }, steps: 6 },
  ];

  const gripButtons = [];
  const exampleButtons = [];
  const gripRow = h('div', { class: 'chips', id: 'paper-grips', role: 'group', 'aria-label': 'Which formula' });
  const exampleRow = h('div', { class: 'chips', id: 'paper-examples', role: 'group', 'aria-label': 'A planted example' });

  function applyExample(ex) {
    state.grip = ex.grip;
    if (!ex.keepZ) state.z = { re: ex.z.re, im: ex.z.im };
    if (ex.c) state.c = { re: ex.c.re, im: ex.c.im };
    state.steps = ex.steps;
    state.example = ex.id;
    const handle = plane && plane.getHandle('plant');
    if (handle) handle.set(state.z, { silent: true });
    render();
  }

  function pressRow(buttons, id) {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pick === id)));
  }

  gripDefs.forEach((g) => {
    const b = h('button', { type: 'button', class: 'chip', id: `paper-grip-${g.id}`, 'data-pick': g.id, 'aria-pressed': 'false' }, g.label);
    b.addEventListener('click', () => {
      const first = exampleDefs.find((ex) => ex.grip === g.id && !ex.keepZ);
      applyExample(first);
    });
    gripButtons.push(b);
    gripRow.append(b);
  });
  exampleDefs.forEach((ex) => {
    const b = h('button', { type: 'button', class: 'chip', id: `paper-ex-${ex.id}`, 'data-pick': ex.id, 'data-grip': ex.grip, 'aria-pressed': 'false' }, ex.label);
    b.addEventListener('click', () => applyExample(ex));
    exampleButtons.push(b);
    exampleRow.append(b);
  });

  again.addEventListener('click', () => {
    if (state.steps >= PAPER_CAP) return;
    state.steps += 1;
    state.example = '';
    render();
  });

  let plane = null;
  plane = createPlane(planeHost, {
    id: 'paper-plane',
    xRange: [-2.2, 2.2],
    yRange: [-2.2, 2.2],
    grid: 'cart',
    axes: true,
    axisLabels: ['Re', 'Im'],
    interactive: false,
    controls: false,
    ariaLabel: 'The exam paper. Drag the green plant.',
  });
  plane.addLayer((ctx, pl) => {
    drawCircle(ctx, pl, { re: 0, im: 0 }, 1, { color: '--text', width: 1.5, alpha: 0.9, fill: null });
    drawLabel(ctx, pl, { re: 0.02, im: 1.12 }, 'unit circle', { color: '--text', dx: 0, dy: 0 });
    const view = describePaper(state);
    for (const trail of view.trails) {
      const pts = trail.points.filter(onPaper);
      for (let i = 1; i < pts.length; i++) {
        drawSegment(ctx, pl, pts[i - 1], pts[i], {
          color: `--${trail.token}`,
          width: trail.dash ? 1.5 : 2.25,
          dash: trail.dash ? [4, 4] : null,
          alpha: 0.95,
        });
      }
      pts.forEach((p, i) => {
        if (i === 0 && trail.id !== 'bags') return;
        if (trail.shape === 'square') drawSquare(ctx, pl, p, trail.token, 4);
        else drawDot(ctx, pl, p, { color: `--${trail.token}`, radius: 3.5, halo: true });
      });
    }
    if (view.notch) {
      drawSquare(ctx, pl, view.notch, 'ink', 8);
      drawLabel(ctx, pl, view.notch, 'c', { color: '--text', dx: 12, dy: 14 });
    }
    for (const pin of view.pins) drawDiamond(ctx, pl, pin, pin.token);
  });
  plane.addPoint({
    id: 'plant',
    z: state.z,
    color: '--input',
    draggable: true,
    label: 'z',
    symbol: 'z',
    name: 'the plant',
    step: 0.05,
    onDrag(z2) {
      state.z = { re: z2.re, im: z2.im };
      state.steps = 0;
      state.example = '';
      render({ redraw: false });
    },
  });

  function render({ redraw = true } = {}) {
    const view = describePaper(state);
    tex(formula, view.formulaTex, { display: false });
    fateHost.replaceChildren();
    for (const fate of view.fates) {
      fateHost.append(h('p', {
        class: 'paper-fate',
        id: `paper-fate-${fate.id}`,
        'data-fate': fate.word,
        'data-token': fate.token,
      }, fate.text));
    }
    readoutHost.replaceChildren();
    for (const row of view.readouts) {
      readoutHost.append(h('p', { class: 'paper-readout', id: `paper-readout-${row.id}` }, row.text));
    }
    aside.textContent = view.aside;
    stepsLine.textContent = state.steps === 0
      ? 'Planted. Press Again to apply the formula once.'
      : `Steps shown: ${state.steps} of ${PAPER_CAP}.`;
    again.disabled = state.steps >= PAPER_CAP;
    again.textContent = state.steps >= PAPER_CAP ? 'Eight steps shown' : 'Again';
    pressRow(gripButtons, state.grip);
    pressRow(exampleButtons, state.example);
    exampleButtons.forEach((b) => { b.hidden = b.dataset.grip !== state.grip; });
    if (redraw) {
      const handle = plane.getHandle('plant');
      if (handle) handle.set(state.z, { silent: true });
    }
  }

  const stops = h('section', { class: 'panel', id: 'paper-stops', 'aria-labelledby': 'paper-stops-title' },
    h('h2', { id: 'paper-stops-title' }, 'Where the stops sit'),
    h('p', null, 'This paper does not replace them. The sharp picture, the quotation, and the worked exercise stay on their own stops.'),
    h('p', null, 'Twist, powers and squares at c = 0: the sequence, the disk, Julia, the orbit of 0, and on Test 1 the powers and the roots. The notch is Julia’s slide. Which c keep the orbit of 0 bounded is stated on the seeds stop, and that set is not drawn here.'),
    h('p', null, 'Correction: one Newton step, the Newton picture, the real line as a wall, and on Test 1 the derivative.'),
    h('p', null, 'Stack: the terms that must go to 0, and the geometric series, marked likely.'),
    h('p', null, 'When the sentence is about Arg, open the staircase. When it is about the point at infinity, open 1/z and the sphere. Harmonic functions stay off this page.'));

  const citeBlock = h('section', { class: 'panel', id: 'paper-cites', 'aria-labelledby': 'paper-cites-title' },
    h('h2', { id: 'paper-cites-title' }, 'In the book'),
    ...CITES.map((c) => sourceTag(c)));

  el.append(
    h('header', { class: 'station-header' },
      h('h1', null, ctx.station.title),
      h('p', { class: 'station-lede', id: 'paper-lede' },
        'This sits after the index. One plant on the flat paper. Drag it. Again applies the formula once, and it stops at eight. The formula is the grip: a twist, a correction, or a stack. The words are settles, stays, leaves, or which root. The unit circle is the wall, and c is a hollow square.')),
    h('section', { class: 'panel', id: 'paper-stage', 'aria-labelledby': 'paper-stage-title' },
      h('h2', { id: 'paper-stage-title' }, 'The formula, then the plant'),
      h('p', { id: 'paper-colour' },
        'Blue on a landing means the walk stayed. The word then says settles or stays. Orange on a landing means it left. On a correction, orange is the orange root and purple is the third root. Green is the plant. The square labeled c is the slide, drawn in the ink of the page.'),
      gripRow,
      formula,
      planeHost,
      exampleRow,
      again,
      stepsLine,
      fateHost,
      readoutHost,
      aside),
    stops,
    citeBlock,
    storyLinks('paper-story', [
      ['#sequence', 'Sequences'],
      ['#series', 'Terms and the pile'],
      ['#disk', 'The disk at c = 0'],
      ['#julia', 'Julia'],
      ['#zero', 'The orbit of 0'],
      ['#seeds', 'Which c'],
      ['#newton-step', 'One Newton step'],
      ['#newton', 'Which root'],
      ['#half', 'The real line'],
      ['#geometric', 'Geometric series'],
      ['#powers', 'Powers, Test 1'],
      ['#roots', 'Roots, Test 1'],
      ['#derivative', 'The derivative, Test 1'],
      ['#staircase', 'The staircase, Test 1'],
      ['#reciprocal', '1/z and the sphere, Test 1'],
    ]),
    placeLinks('paper'),
  );

  render();

  return function unmount() {
    style.remove();
    if (plane) plane.destroy();
    plane = null;
  };
}
