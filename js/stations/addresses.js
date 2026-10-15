// js/stations/addresses.js - "One Point, Two Addresses" (Thread 1 at first contact, Thread 2 begins).
//
// One draggable dot, drawn once. Its Cartesian address (dashed --cart drop lines to the axes) and its
// polar address (a --polar ray, a solid arc for Arg z, fainter windings for the rest of the set arg z,
// the seam on the negative real axis) are drawn together. Beside the plane: boxes where you type either
// address, the shared two-column converter (explainer), the shared staircase list, the two forms problem
// 1.3.1 asks for, and Euler's formula as the dictionary.
//
// Pure helpers (texNum, snapPoint, addressCells, ...) are exported for the unit tests; nothing here touches
// the DOM at import time. Design: docs/designs/iter-1/i1-station-addresses-arithmetic.md (sections 4.1, 5.1, 5.2).

import { createPlane, drawCartAddress, drawPolarAddress, drawSeam } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, prose, plainProse } from '../core/katex.js';
import { Arg, fromPolar, wrapArg, fmtNum, fmtCart, fmtAngle, exactAngle, texAngle, eq } from '../core/complex.js';
import { compile } from '../core/parse.js';
import { problemById, problemsForStation, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { threadLabel, threadLinkPrefix } from '../registry.js';

export const ZERO_EPS = 1e-9;                                  // |z| below this is the origin
const TWO_PI = 2 * Math.PI;

export const PRESETS = Object.freeze([
  Object.freeze({ id: 'm1-sqrt3i', label: '−1 + i√3', z: Object.freeze({ re: -1, im: Math.sqrt(3) }) }),
  Object.freeze({ id: 'sqrt3-i', label: '√3 + i', z: Object.freeze({ re: Math.sqrt(3), im: 1 }) }),
  Object.freeze({ id: '2i', label: '2i', z: Object.freeze({ re: 0, im: 2 }) }),
  Object.freeze({ id: 'm16', label: '−16', z: Object.freeze({ re: -16, im: 0 }) }),
  Object.freeze({ id: '1-i', label: '1 + i', z: Object.freeze({ re: 1, im: 1 }) }),
]);

// ---------------------------------------------------------------------------------------------
// 5.1 Shared pure helpers (copied into arithmetic.js on purpose: one goal owns both files, D11)
// ---------------------------------------------------------------------------------------------

const near = (a, b) => Math.abs(a - b) < 1e-9;
const isSurd = (t) => t.includes('\\sqrt');

/** A number as TeX, never a fraction: an integer, k sqrt(3), k sqrt(2), or a 3-decimal number. */
export function texNum(x) {
  if (x !== x) return '\\text{undefined}';
  if (x === Infinity) return '\\infty';
  if (x === -Infinity) return '-\\infty';
  const n = Math.round(x);
  if (near(x, n)) return String(n + 0);
  for (const [s, root] of [[3, Math.sqrt(3)], [2, Math.SQRT2]]) {
    const k = Math.round(x / root);
    if (k !== 0 && Math.abs(k) <= 20 && near(x, k * root)) return (k === 1 ? '' : k === -1 ? '-' : String(k)) + '\\sqrt{' + s + '}';
  }
  if (Math.abs(x) >= 1e-3) return fmtNum(x, 3);
  const [m, e] = x.toExponential(2).split('e');                          // not noise (near() caught that) but under the last decimal: it must not print as 0 or as a lone 0.001
  return String(Number(m)) + '\\times 10^{' + Number(e) + '}';
}

// The decimal beside a radical: " \approx 1.732" after "\sqrt{3}", nothing after a plain number.
const approx = (x) => (isSurd(texNum(x)) ? ' \\approx ' + fmtNum(x, 3) : '');
// Square a TeX number: (-1)^2, (\sqrt{3})^2, 2^2.
const sq = (t) => (t.startsWith('-') || isSurd(t) ? '(' + t + ')^2' : t + '^2');

export { plainProse };                                 // the one shared tooltip text (js/core/katex.js): e^{i pi/4} reads e^(i pi/4), never a brace

/** A trig argument: the TeX itself, or in brackets when it starts with a minus sign. */
export function trigArg(T) {
  return T.startsWith('-') ? '\\left(' + T + '\\right)' : T;
}

/** x + iy as TeX: "-1 + \sqrt{3}\,i", "2i", "-i", "3", "1.5 - 0.5i". */
export function texCartPair(x, y) {
  const re = texNum(x);
  const ya = texNum(Math.abs(y));
  const neg = y < 0;
  const coef = ya === '1' ? '' : ya;
  const i = coef + (/\}$/.test(coef) ? '\\,i' : 'i');
  if (y === 0) return re;
  if (x === 0) return (neg ? '-' : '') + i;
  return re + ' ' + (neg ? '-' : '+') + ' ' + i;
}

/** e^{i theta} as TeX with the sign moved in front of the i: "e^{i\,\frac{2\pi}{3}}", "e^{-i\,0.322}". */
export function expTex(theta) {
  const T = texAngle(theta);
  const neg = T.startsWith('-');
  return 'e^{' + (neg ? '-' : '') + 'i\\,' + (neg ? T.slice(1) : T) + '}';
}

/** r e^{i theta} as TeX; "0" at the origin; r dropped when it is 1; the exponential dropped when theta = 0. */
export function polarTeX(z) {
  const r = Math.hypot(z.re, z.im);
  if (r < ZERO_EPS) return '0';
  const th = Arg(z);
  const R = texNum(r);
  return th === 0 ? R : (R === '1' ? '' : R + '\\,') + expTex(th);
}

/** "2.094 (2pi/3)", "3.142 (pi)", "0.464", "undefined"; unicode: true writes the pi sign. */
export function angleText(theta, { unicode = false } = {}) {
  if (theta === null || theta === undefined || theta !== theta) return 'undefined';
  const d = fmtNum(theta, 3);
  const e = exactAngle(theta) ? fmtAngle(theta, { unicode }) : null;
  return e && e !== d ? d + ' (' + e + ')' : d;
}

/** The live hint beside the theta box: "= 2π/3 = 120°", "= 26.6°". */
export function thetaHint(theta) {
  const deg = fmtNum((theta * 180) / Math.PI, 1) + '°';
  const e = exactAngle(theta) ? fmtAngle(theta, { unicode: true }) : null;
  return e && e !== fmtNum(theta, 3) ? '= ' + e + ' = ' + deg : '= ' + deg;
}

/** The soft-snap lattice step for a view this many units across. */
export function latticeStep(unitsAcross) {
  return unitsAcross <= 4 ? 0.25 : unitsAcross <= 12 ? 0.5 : unitsAcross <= 48 ? 1 : 5;
}

/** Pull each coordinate onto the lattice when it is within min(tolPx, 0.3 steps) of a lattice value. Never -0. */
export function snapPoint(z, unitsAcross, widthPx, tolPx = 5) {
  const step = latticeStep(unitsAcross);
  const scale = widthPx / unitsAcross;                                 // px per unit
  const tol = Math.min(tolPx, 0.3 * step * scale) / scale;             // in plane units
  const one = (v) => {
    const n = Math.round(v / step) * step;
    return Math.abs(v - n) <= tol ? n + 0 : v;
  };
  return { re: one(z.re), im: one(z.im) };
}

const LADDER = [8, 10, 12, 16, 20, 24, 32, 40, 50, 64, 80, 100, 128, 160, 200, 250];

/** The smallest ladder value at least 2.5 m: the span (units across) that shows a point of size m comfortably. */
export function viewSpanFor(m) {
  const found = LADDER.find((u) => u >= 2.5 * m);
  return found === undefined ? 250 : found;
}

/** z with components below 1e-12 * max(1, r) set to 0, and no negative zero. */
export function cleanZ(z, r) {
  const t = 1e-12 * Math.max(1, r);
  return { re: Math.abs(z.re) < t ? 0 : z.re + 0, im: Math.abs(z.im) < t ? 0 : z.im + 0 };
}

const fail = (message) => ({ ok: false, message });

/** Parse a typed real number ("-16", "sqrt(3)", "2pi/3") with parse.js. Messages are exact sentences. */
export function parseRealField(src, { max = 100 } = {}) {
  const s = String(src === null || src === undefined ? '' : src).trim();
  if (s === '') return fail('Type a number, like -1 or 1.732 or sqrt(3).');
  let c;
  try { c = compile(s); } catch (e) { return fail((e && e.message) || 'I could not read that.'); }
  if (c.uses.size > 0) return fail('Use numbers only here, without z, x or y.');
  const v = c.f({ re: 0, im: 0 });
  if (!Number.isFinite(v.re) || !Number.isFinite(v.im)) return fail('That is not a finite number.');
  if (Math.abs(v.im) > 1e-12 * Math.max(1, Math.abs(v.re))) return fail('That has an i in it. This box takes a real number.');
  if (Math.abs(v.re) > max) return fail('Keep it between -' + max + ' and ' + max + ' so the picture stays readable.');
  return { ok: true, value: v.re + 0 };
}

/** How many extra windings of arg z to draw for a ray this many pixels long. */
export function ghostCounts(rayPx, enabled = true) {
  if (!enabled) return { pos: 0, neg: 0 };
  return { pos: rayPx >= 70 ? 2 : rayPx >= 14 ? 1 : 0, neg: rayPx >= 100 ? 1 : 0 };
}

// ---------------------------------------------------------------------------------------------
// 5.2 Model and text (pure)
// ---------------------------------------------------------------------------------------------

const isZero = (z) => Math.hypot(z.re, z.im) < ZERO_EPS;
const NO_ANGLE = 'no angle at 0';

/** { z, x, y, r, theta, isZero }; theta = Arg z, or null at the origin. */
export function addressModel(z) {
  const x = z.re + 0;
  const y = z.im + 0;
  const r = Math.hypot(x, y);
  if (r < ZERO_EPS) return { z: { re: 0, im: 0 }, x: 0, y: 0, r: 0, theta: null, isZero: true };
  return { z: { re: x, im: y }, x, y, r, theta: Arg({ re: x, im: y }), isZero: false };
}

/** "z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)"; at the origin "z = 0; |z| = 0; Arg z: no angle at 0" (the wording every station uses). */
export function addressReadout(m) {
  if (m.isZero) return 'z = 0; |z| = 0; Arg z: ' + NO_ANGLE;
  return 'z = ' + fmtCart(m.z, 3, { tiny: true }) + '; |z| = ' + fmtNum(m.r, 3, { tiny: true }) + '; Arg z = ' + angleText(m.theta, { unicode: true });
}

// "=" when the angle has an exact form, else the approximate sign; and the decimal beside an exact angle.
const relOf = (theta) => (exactAngle(theta) ? '=' : '\\approx');
const angTailOf = (theta) => (exactAngle(theta) && theta !== 0 ? ' \\approx ' + fmtNum(theta, 3) : '');

/** The explainer cells for x, y, r, theta in both columns, and the same-point row (untinted TeX). */
export function addressCells(m) {
  if (m.isZero) {
    return {
      x: { cart: 'x = 0', polar: 'x = r\\cos\\theta = 0\\cdot\\cos\\theta = 0' },
      y: { cart: 'y = 0', polar: 'y = r\\sin\\theta = 0\\cdot\\sin\\theta = 0' },
      r: { cart: 'r = \\sqrt{x^2+y^2} = \\sqrt{0^2 + 0^2} = 0', polar: 'r = 0' },
      theta: { cart: '\\theta = \\operatorname{atan2}(0, 0):\\ \\text{no angle at } 0', polar: '\\text{every angle reaches } 0' },
      same: { cart: 'z = 0', polar: 'z = 0', agree: undefined },
    };
  }
  const X = texNum(m.x);
  const Y = texNum(m.y);
  const R = texNum(m.r);
  const T = texAngle(m.theta);
  const Q = m.x * m.x + m.y * m.y;
  const exactAng = exactAngle(m.theta) !== null;
  const J = (near(m.r, Math.round(m.r)) || isSurd(R)) && exactAng ? '=' : '\\approx';     // is the substituted line exact?
  const rTail = near(m.r, Math.round(m.r)) ? '= ' + Math.round(m.r) : '\\approx ' + fmtNum(m.r, 3);
  const rel = relOf(m.theta);
  const angTail = angTailOf(m.theta);
  return {
    x: {
      cart: 'x = ' + X + approx(m.x),
      polar: 'x = r\\cos\\theta = ' + R + '\\cos\\,' + trigArg(T) + ' ' + J + ' ' + X + approx(m.x),
    },
    y: {
      cart: 'y = ' + Y + approx(m.y),
      polar: 'y = r\\sin\\theta = ' + R + '\\sin\\,' + trigArg(T) + ' ' + J + ' ' + Y + approx(m.y),
    },
    r: {
      cart: 'r = \\sqrt{x^2+y^2} = \\sqrt{' + sq(X) + ' + ' + sq(Y) + '} = \\sqrt{' + texNum(Q) + '} ' + rTail,
      polar: 'r = ' + R + approx(m.r),
    },
    theta: {
      cart: '\\theta = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(' + Y + ', ' + X + ') ' + rel + ' ' + T + angTail,
      polar: '\\theta = \\operatorname{Arg} z ' + rel + ' ' + T + angTail,
    },
    same: {
      cart: 'z = ' + texCartPair(m.x, m.y),
      polar: 'z = ' + polarTeX(m.z),
      agree: eq(fromPolar(m.r, m.theta), m.z, 1e-9 * Math.max(1, m.r)),
    },
  };
}

/** The forms the test asks for: Cartesian, polar, exponential, Arg z, arg z (TeX); null at the origin. */
export function addressForms(m) {
  if (m.isZero) return null;
  const R = texNum(m.r);
  const T = texAngle(m.theta);
  const Rp = R === '1' ? '' : R;
  const trig = '\\cos\\,' + trigArg(T) + ' + i\\sin\\,' + trigArg(T);
  return {
    cart: 'z = ' + texCartPair(m.x, m.y),
    polar: Rp ? 'z = ' + Rp + '\\left(' + trig + '\\right)' : 'z = ' + trig,
    exp: 'z = ' + (Rp ? Rp + '\\,' : '') + expTex(m.theta),
    argHome: '\\operatorname{Arg} z ' + relOf(m.theta) + ' ' + T + angTailOf(m.theta),
    argSet: '\\arg z = \\left\\{ ' + T + ' + 2\\pi k : k \\in \\mathbb{Z} \\right\\}',
  };
}

/** The live Euler line: e^{i theta} = cos theta + i sin theta, then the unit point as numbers; '' at the origin. */
export function eulerLine(m) {
  if (m.isZero) return '';
  return 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta \\approx ' + texCartPair(m.x / m.r, m.y / m.r);
}

// ---------------------------------------------------------------------------------------------
// DOM helpers (called only from mount)
// ---------------------------------------------------------------------------------------------

function h(tag, attrs, ...children) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'text') n.textContent = String(v);
      else n.setAttribute(k === 'cls' ? 'class' : k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'object' && c.nodeType ? c : document.createTextNode(String(c)));
  }
  return n;
}

const STYLE = `
.ax-main { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 70rem) { .ax-main { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); } }
.ax-left, .ax-right { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.ax-toolbar { display: flex; flex-direction: column; gap: var(--space-2); }
.ax-group-label { font-size: 0.88rem; font-weight: 600; color: var(--text-muted); }
.ax-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2) var(--space-3); }
.ax-fields .field { min-width: 0; width: 100%; }
.ax-fields input.num { width: 100%; min-width: 0; }
.ax-fields .ax-theta-line { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.ax-theta-hint { min-height: 1.3em; font-family: var(--font-mono); font-size: 0.88rem; color: var(--text-muted); overflow-wrap: anywhere; }
.ax-hint { margin: 0; font-size: 0.92rem; color: var(--text-muted); }
.ax-note { margin: 0; min-height: 1.5em; font-size: 0.95rem; }
.ax-problem-statement { margin: 0 0 var(--space-2); }
.ax-problem details { margin-top: var(--space-2); }
.ax-problem summary { cursor: pointer; font-weight: 600; }
.ax-problem details > .tex-scroll { margin-top: var(--space-2); }
.ax-forms dl { display: grid; grid-template-columns: minmax(0, 11rem) minmax(0, 1fr); gap: var(--space-2) var(--space-3); margin: 0; }
@media (max-width: 36rem) { .ax-forms dl { grid-template-columns: minmax(0, 1fr); } }
.ax-forms dt { font-weight: 600; color: var(--text-muted); }
.ax-forms dd { margin: 0; max-width: 100%; overflow-x: auto; }
.ax-bottom { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 62rem) { .ax-bottom { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); } }
.ax-explain > h2 { margin-bottom: var(--space-2); }
`;

function ensureStyle() {
  if (document.head.querySelector('style[data-for="station-addresses"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'station-addresses');
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// previous and next station in registry order, then the thread neighbours (5.2.12)
function stationLinks(ctx, navId) {
  const list = ctx.stations || [];
  const me = ctx.station;
  const nav = h('nav', { cls: 'station-links', id: navId, 'aria-label': 'More places' });
  const out = [];
  const link = (dir, st, thread) => ({ dir, st, thread, id: st.id });
  const prev = list.find((s) => s.order === me.order - 1);
  const next = list.find((s) => s.order === me.order + 1);
  if (prev) out.push(link('prev', prev));
  if (next) out.push(link('next', next));
  for (const t of me.threads || []) {
    let pt = null;
    let nt = null;
    for (const s of list) {
      if (!(s.threads || []).includes(t)) continue;
      if (s.order < me.order) pt = s;
      else if (s.order > me.order && !nt) nt = s;
    }
    if (nt && !out.some((l) => l.id === nt.id)) out.push(link('next', nt, t));
    if (pt && !out.some((l) => l.id === pt.id)) out.push(link('prev', pt, t));
  }
  for (const l of out) {
    const a = h('a', { cls: 'station-link', href: '#' + l.st.id, 'data-dir': l.dir, 'data-thread': l.thread || null });
    a.textContent = (l.thread ? threadLinkPrefix(l.thread, l.dir) : '') + l.st.title;
    nav.append(a);
  }
  return nav;
}

function stationHeader(ctx, lede, problems) {
  const header = h('header', { cls: 'station-header' });
  header.append(h('h1', { text: ctx.station.title }), h('p', { cls: 'station-lede', text: lede }));
  const ul = h('ul', { cls: 'thread-badges' });
  for (const id of ctx.station.threads || []) {
    const t = (ctx.threads || []).find((x) => x.id === id);
    if (!t) continue;
    ul.append(h('li', null, h('span', { cls: 'thread-badge', 'data-thread': id, title: t.summary, text: threadLabel(t) })));
  }
  header.append(ul);
  const chips = h('div', { cls: 'chips' });
  for (const p of problems) {
    chips.append(h('a', { cls: 'chip problem-chip', href: '#problem-' + p.id.replace(/\./g, '-'), title: plainProse(p.aha), id: 'addresses-problem-chip-' + p.id.replace(/\./g, '-'), text: p.id }));
  }
  header.append(chips);
  return header;
}

// the problem strip: statement, the sentence on which address is native, the handout answer behind a closed details
function problemStrip(prefix, p) {
  const tone = (addressTones(p.address)[0] || '--cart').replace(/^--/, '');
  const titleId = prefix + '-problem-title';
  const statement = h('p', { cls: 'ax-problem-statement', id: prefix + '-problem-statement' });
  for (const part of statementParts(p.statement)) {
    if (part.math) { const sp = h('span'); tex(sp, part.text); statement.append(sp); } else statement.append(document.createTextNode(part.text));
  }
  const why = h('span', { id: prefix + '-problem-why' });
  prose(why, p.addressWhy);
  const texBox = h('div', { cls: 'tex-scroll', id: prefix + '-answer-tex' });
  const textEl = h('p', { cls: 'muted mono', id: prefix + '-answer-text' });
  const details = h('details', { id: prefix + '-answer' }, h('summary', { id: prefix + '-answer-toggle', text: 'Show the handout answer' }), texBox, textEl);
  let shown = false;
  details.addEventListener('toggle', () => {
    if (!details.open || shown) return;
    shown = true;
    tex(texBox, p.answer.tex, { display: true });
    textEl.textContent = p.answer.text;
  });
  return h('section', { cls: 'panel ax-problem', 'data-tone': tone, id: prefix + '-problem', 'aria-labelledby': titleId },
    h('h2', { cls: 'panel-title', id: titleId, text: 'Problem ' + p.id }),
    statement,
    h('p', null, h('span', { cls: 'badge', 'data-tone': tone, text: addressLabel(p.address) }), ' ', why),
    details);
}

// ---------------------------------------------------------------------------------------------
// mount
// ---------------------------------------------------------------------------------------------

function initialZ(preset) {
  if (preset && preset.kind === 'token') {
    const p = PRESETS.find((q) => q.id === preset.token);
    if (p) return { re: p.z.re, im: p.z.im };
  }
  return { re: PRESETS[0].z.re, im: PRESETS[0].z.im };       // problem 1.3.1, any other problem or topic, or no preset
}

export function mount(el, ctx) {
  const disposers = [];
  const mine = {};
  let formsRaf = 0;
  let lastModel = null;
  let lastGhosts = { pos: 0, neg: 0 };
  let noteIsError = false;                                    // is the sentence under the fields a rejection (it goes when its field is rewritten)
  const lastWritten = new Map();                              // element -> last TeX written (skip unchanged KaTeX passes)

  try {
    ensureStyle();

    // ---- state ----
    const S = {
      z: initialZ(ctx.preset),
      lastTheta: (2 * Math.PI) / 3,
      grid: 'cart',
      ghosts: true,
      snap: true,
      userView: false,
    };
    if (!isZero(S.z)) S.lastTheta = Arg(S.z);

    // ---- DOM ----
    const problem = problemById('1.3.1');
    el.dataset.grid = S.grid;
    el.append(stationHeader(ctx,
      'One dot, two ways to say where it is. The Cartesian address says how far across and how far up. The polar address says which way to turn and how far to walk. Drag the dot and watch both change. The dot never moves because of how you describe it.',
      problemsForStation(ctx.station.id)));
    if (problem) el.append(problemStrip('addresses', problem));

    const mkInput = (id) => h('input', { cls: 'num', id, type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' });
    const mkField = (id, label) => {
      const input = mkInput(id);
      return { input, wrap: h('div', { cls: 'field' }, h('label', { for: id, text: label }), input) };
    };
    const fx = mkField('addresses-x', 'x (across)');
    const fy = mkField('addresses-y', 'y (up)');
    const fr = mkField('addresses-r', 'r (walk)');
    const ft = { input: mkInput('addresses-theta') };                       // its label and wrapper (with the live hint) are built just below
    const hintEl = h('span', { cls: 'ax-theta-hint', id: 'addresses-theta-hint' });
    const thetaWrap = h('div', { cls: 'field' }, h('label', { for: 'addresses-theta', text: 'θ in radians (turn)' }),
      h('div', { cls: 'ax-theta-line' }, ft.input, hintEl));

    const presetBtns = new Map();
    const presetRow = h('div', { cls: 'chips', role: 'group', 'aria-label': 'Try a point', id: 'addresses-presets' });
    for (const p of PRESETS) {
      const b = h('button', { cls: 'chip', type: 'button', id: 'addresses-preset-' + p.id, 'aria-pressed': 'false', text: p.label });
      presetBtns.set(p.id, b);
      presetRow.append(b);
    }
    const gridBtns = new Map();
    const gridRow = h('div', { cls: 'chips', role: 'group', 'aria-label': 'Grid', id: 'addresses-grid' });
    for (const [id, label] of [['cart', 'Cartesian lines'], ['polar', 'Polar circles and rays'], ['both', 'Both']]) {
      const b = h('button', { cls: 'chip', type: 'button', id: 'addresses-grid-' + id, 'aria-pressed': String(id === S.grid), text: label });
      gridBtns.set(id, b);
      gridRow.append(b);
    }
    const ghostBox = h('input', { type: 'checkbox', id: 'addresses-ghosts', checked: true });
    ghostBox.checked = true;
    const snapBox = h('input', { type: 'checkbox', id: 'addresses-snap', checked: true });
    snapBox.checked = true;
    const planeHost = h('div', { id: 'addresses-plane-host' });
    const noteEl = h('p', { cls: 'ax-note', id: 'addresses-note', 'aria-live': 'polite' });
    const readoutEl = h('div', { cls: 'readout', id: 'addresses-readout' });
    const stairsHost = h('div', { id: 'addresses-stairs-host' });
    const toStair = h('a', { cls: 'chip', id: 'addresses-to-staircase', href: '#staircase', text: 'See it walk around the origin' });
    const exHost = h('div', { id: 'addresses-ex-host' });

    const mkPanel = (tone, title, line, ...rest) => {
      const tid = 'addresses-' + title.toLowerCase().replace(/[^a-z]+/g, '-') + '-title';
      return h('section', { cls: 'panel', 'data-tone': tone, 'aria-labelledby': tid },
        h('h2', { cls: 'panel-title', id: tid, text: title }), line ? h('p', { cls: 'muted', text: line }) : null, ...rest);
    };

    el.append(h('div', { cls: 'ax-main' },
      h('div', { cls: 'ax-left' },
        h('div', { cls: 'ax-toolbar' },
          h('div', { cls: 'row' }, h('span', { cls: 'ax-group-label', text: 'Try a point' }), presetRow),
          h('div', { cls: 'row' }, h('span', { cls: 'ax-group-label', text: 'Grid' }), gridRow),
          h('p', { cls: 'ax-hint', text: 'Cartesian grid: the lines x = c and y = c. Polar grid: the circles r = c and the rays θ = c. Each address finds its own shapes natural.' }),
          h('div', { cls: 'row' },
            h('label', { cls: 'check' }, ghostBox, 'Show other names of the angle'),
            h('label', { cls: 'check' }, snapBox, 'Snap to nice values'))),
        planeHost,
        h('p', { cls: 'ax-hint', id: 'addresses-hint', text: 'Drag the dot, or Tab to it and use the arrow keys (Shift moves 10 times as far). Snap helps you land on round numbers; turn it off to move freely. The dashed grey ray is the seam: cross it and Arg jumps from π to −π.' })),
      h('div', { cls: 'ax-right' },
        mkPanel('cart', 'Cartesian address', 'x across, y up. The dashed blue lines.', h('div', { cls: 'ax-fields' }, fx.wrap, fy.wrap)),
        mkPanel('polar', 'Polar address', 'Turn by θ, walk r. The orange ray and arc.', h('div', { cls: 'ax-fields' }, fr.wrap, thetaWrap)),
        noteEl,
        readoutEl,
        mkPanel('polar', 'The angle has many names',
          'arg z is every angle that reaches the dot: θ + 2πk. Arg z is the one name inside (−π, π]. The dot is the same for all of them.',
          stairsHost, h('p', null, toStair)))));

    el.append(h('section', { cls: 'ax-explain', 'aria-labelledby': 'addresses-explain-title' },
      h('h2', { id: 'addresses-explain-title', text: 'The same point, worked both ways' }),
      h('p', { cls: 'muted', text: 'Each number is read off the picture in its own address and computed from the other one. “Easy in Cartesian” means you just read it off; “easy in Polar” the same.' }),
      exHost,
      h('p', { cls: 'muted', text: 'atan2(y, x) is the angle of the point (x, y), with the quadrant taken into account. It always lands in (−π, π], so it is Arg z.' })));

    const formEls = {};
    const formsDl = h('dl');
    for (const [key, label, tone] of [['cart', 'Cartesian form', 'cart'], ['polar', 'Polar form r(cos θ + i sin θ)', 'polar'], ['exp', 'Exponential form re^{iθ}', 'polar'],
      ['arg-home', 'Arg z, the home step', 'polar'], ['arg-set', 'arg z, every name', 'polar']]) {
      const dd = h('dd', { cls: 'tex-scroll tone-' + tone, id: 'addresses-form-' + key });
      formEls[key] = dd;
      const dt = h('dt');
      prose(dt, label);
      formsDl.append(dt, dd);
    }
    const formsEmpty = h('p', { cls: 'muted', hidden: true, text: 'z = 0 has no polar form: r is 0 and every angle gives the same point.' });
    const eulerLive = h('div', { cls: 'tex-scroll', id: 'addresses-euler-live' });
    const eulerP = h('p');
    prose(eulerP, 'e^{iθ} = cos θ + i sin θ is the point on the unit circle at angle θ. Multiply it by r and you reach z.');   // the exponent reads as a superscript
    el.append(h('div', { cls: 'ax-bottom' },
      h('section', { cls: 'panel ax-forms', id: 'addresses-forms', 'aria-labelledby': 'addresses-forms-title' },
        h('h2', { cls: 'panel-title', id: 'addresses-forms-title', text: 'The forms the test asks for' }), formsDl, formsEmpty),
      h('aside', { cls: 'callout', id: 'addresses-euler', 'data-tone': 'accent' },
        h('h3', { text: 'Euler’s formula is the dictionary' }),
        eulerP, eulerLive)));
    el.append(stationLinks(ctx, 'addresses-links'));

    // ---- widgets ----
    const plane = createPlane(planeHost, {
      id: 'addresses-plane', xRange: [-4, 4], yRange: [-4, 4], grid: 'cart', axisLabels: ['Re', 'Im'],
      maxWidth: 520, maxUnitsAcross: 300, ariaLabel: 'The complex plane with the point z',
    });
    disposers.push(() => plane.destroy());
    // Reset view returns to the 8-unit home; a dot that is out there (typed -16, or dragged after a zoom-out) must stay on the picture
    plane.on('viewchange', (v) => {
      if (v.reason === 'pan' || v.reason === 'zoom') S.userView = true;
      else if (v.reason === 'reset') { S.userView = false; ensureVisible(S.z); }
    });

    // Writing a number into a field that still shows rejected text also takes the rejection (aria-invalid and the sentence under
    // the fields) away: both belong to what was typed, and the dot, a preset or a sibling field has just replaced it.
    const setField = (input, text, skip) => {
      if (input === skip) return;
      if (input.value !== text) input.value = text;
      if (input.hasAttribute('aria-invalid')) {
        setInvalid(input, false);
        if (noteIsError && !el.querySelector('input[aria-invalid="true"]')) note('');
      }
    };

    const ensureVisible = (z, { reset = false } = {}) => {
      const m = Math.max(Math.abs(z.re), Math.abs(z.im));
      const u = plane.getView().unitsAcross;
      const want = viewSpanFor(m);
      if (reset) {
        plane.setView({ center: { re: 0, im: 0 }, unitsAcross: want });
        plane.setHome();
        S.userView = false;
        return;
      }
      if (m > 0.425 * u) plane.setView({ center: { re: 0, im: 0 }, unitsAcross: want });                 // zoom out, origin centred
      else if (!S.userView && u > want) plane.setView({ center: { re: 0, im: 0 }, unitsAcross: want });   // zoom back in after an automatic zoom-out
    };

    plane.addLayer((c, pl) => {
      const z = S.z;
      drawSeam(c, pl, Math.PI);
      drawCartAddress(c, pl, z);
      const rayPx = Math.hypot(z.re, z.im) * pl.getView().scale;
      const g = ghostCounts(rayPx, S.ghosts);
      lastGhosts = g;
      drawPolarAddress(c, pl, z, { ghosts: g.pos, ghostsNeg: g.neg });
    }, { order: 10 });

    const zHandle = plane.addPoint({
      id: 'z', z: S.z, label: 'z', name: 'z', color: '--text', radius: 7, step: 0.1,
      onDrag(z, info) {
        if (info.source === 'pointer' && S.snap) {
          const v = plane.getView();
          const zs = snapPoint(z, v.unitsAcross, plane.getSize().w);
          if (zs.re !== z.re || zs.im !== z.im) { zHandle.set(zs, { silent: true }); z = zs; }
        }
        S.z = { re: z.re + 0, im: z.im + 0 };
        render();
        if (info.final && info.source !== 'pointer') ensureVisible(S.z, {});     // a keyboard nudge past the edge zooms out; a pointer drag never moves the view
      },
    });

    const colTints = [
      { key: 'cart', heading: 'Cartesian (across, then up)', tone: '--cart', tint: true },
      { key: 'polar', heading: 'Polar (turn, then walk)', tone: '--polar', tint: true },
    ];
    const row = (id, label, native) => ({ id, label, native, cart: (s) => s.c[id].cart, polar: (s) => s.c[id].polar });
    const ex = createExplainer(exHost, {
      id: 'addresses-ex', title: 'Convert in either direction', columns: colTints,
      rows: [row('x', 'x = Re z', 'cart'), row('y', 'y = Im z', 'cart'), row('r', 'r = |z|', 'polar'), row('theta', 'θ = Arg z', 'polar')],
      same: (s) => s.c.same,
    });
    disposers.push(() => ex.destroy());

    const stairs = createStaircase(stairsHost, { id: 'addresses-stairs', kMin: -2, kMax: 2, label: 'arg z' });
    disposers.push(() => stairs.destroy());

    // ---- render: the only place state turns into screen ----
    function writeTex(node, src) {
      if (lastWritten.get(node) === src) return;
      lastWritten.set(node, src);
      tex(node, src);
    }
    function flushForms() {
      formsRaf = 0;
      const m = lastModel;
      if (!m) return;
      const f = addressForms(m);
      formsEmpty.hidden = f !== null;
      for (const [key, node] of Object.entries(formEls)) {
        const src = f ? f[key === 'arg-home' ? 'argHome' : key === 'arg-set' ? 'argSet' : key] : '';
        node.hidden = f === null;
        if (src === '') { if (lastWritten.get(node) !== '') { lastWritten.set(node, ''); node.textContent = ''; } } else writeTex(node, src);
      }
      writeTex(eulerLive, eulerLine(m));
    }
    function render({ skipField = null } = {}) {
      const m = addressModel(S.z);
      lastModel = m;
      readoutEl.textContent = addressReadout(m);
      setField(fx.input, fmtNum(m.x, 3), skipField);
      setField(fy.input, fmtNum(m.y, 3), skipField);
      setField(fr.input, fmtNum(m.r, 3), skipField);
      setField(ft.input, fmtNum(m.isZero ? S.lastTheta : m.theta, 3), skipField);
      hintEl.textContent = m.isZero ? '' : thetaHint(m.theta);
      stairs.update(m.theta);
      ex.update({ m, c: addressCells(m) });
      if (!formsRaf) formsRaf = requestAnimationFrame(flushForms);
      for (const p of PRESETS) presetBtns.get(p.id).setAttribute('aria-pressed', String(!m.isZero && eq(m.z, p.z, 1e-9)));
      if (!m.isZero) S.lastTheta = m.theta;
      plane.requestDraw();
    }

    const note = (text, isError = false) => { noteEl.textContent = text; noteIsError = isError; };
    const setInvalid = (input, bad) => {
      if (bad) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', 'addresses-note'); }
      else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    };
    const angleU = (t) => (exactAngle(t) ? fmtAngle(t, { unicode: true }) : fmtNum(t, 3));

    function finishTyped(o, msg = '') {
      zHandle.set(S.z, { silent: true });
      ensureVisible(S.z, {});
      render({ skipField: o.live ? o.source : null });
      note(o.live ? '' : msg);
    }
    function reject(o, msg) { setInvalid(o.source, true); note(msg, true); }
    const applyX = (v, o) => { S.z = cleanZ({ re: v, im: S.z.im }, Math.hypot(v, S.z.im)); finishTyped(o); };
    const applyY = (v, o) => { S.z = cleanZ({ re: S.z.re, im: v }, Math.hypot(S.z.re, v)); finishTyped(o); };
    function applyR(v, o) {
      if (v < 0) return reject(o, 'A length cannot be negative. To reach the opposite side, keep r positive and add π to θ.');
      const th = isZero(S.z) ? S.lastTheta : Arg(S.z);
      S.z = v < ZERO_EPS ? { re: 0, im: 0 } : cleanZ(fromPolar(v, th), v);
      return finishTyped(o);
    }
    function applyTheta(v, o) {
      const r = Math.hypot(S.z.re, S.z.im);
      if (r < ZERO_EPS) {
        S.lastTheta = wrapArg(v);
        render({ skipField: o.live ? o.source : null });
        note(o.live ? '' : 'r is 0, so every angle gives the same point. The angle is kept for when you raise r.');
        return;
      }
      S.z = cleanZ(fromPolar(r, v), r);
      const home = wrapArg(v);
      let msg = '';
      if (!o.live && Math.abs(home - v) > 1e-9) {
        const k = Math.round((v - home) / TWO_PI);
        msg = 'You typed θ = ' + fmtNum(v, 3) + '. That is one name for this direction (' + angleU(home) + (k > 0 ? ' + ' : ' - ') + 2 * Math.abs(k) + 'π). The home step is Arg z = ' + angleText(home, { unicode: true }) + '.';
      }
      finishTyped(o, msg);
    }

    // ---- listeners (last) ----
    const bindField = (input, parse, apply) => {
      input.addEventListener('input', () => {
        const r = parse(input.value);
        if (r.ok) { setInvalid(input, false); apply(r.value, { live: true, source: input }); }
        // a parse failure here is silent: "-", "1." and "sqrt(" must not flash an error
      });
      input.addEventListener('change', () => {
        const r = parse(input.value);
        if (r.ok) { setInvalid(input, false); apply(r.value, { live: false, source: input }); }
        else { setInvalid(input, true); note(r.message, true); }                 // the state does not change
      });
    };
    bindField(fx.input, parseRealField, applyX);
    bindField(fy.input, parseRealField, applyY);
    bindField(fr.input, parseRealField, applyR);
    bindField(ft.input, parseRealField, applyTheta);

    for (const p of PRESETS) {
      presetBtns.get(p.id).addEventListener('click', () => {
        S.z = { re: p.z.re, im: p.z.im };
        zHandle.set(S.z, { silent: true });
        ensureVisible(S.z, { reset: true });
        for (const f of [fx, fy, fr, ft]) setInvalid(f.input, false);
        render();
        note('Loaded ' + p.label + '.');
      });
    }
    for (const [id, b] of gridBtns) {
      b.addEventListener('click', () => {
        S.grid = id;
        plane.setGrid(id);
        for (const [gid, gb] of gridBtns) gb.setAttribute('aria-pressed', String(gid === id));
        el.dataset.grid = id;
      });
    }
    ghostBox.addEventListener('change', () => { S.ghosts = ghostBox.checked; plane.requestDraw(); });
    snapBox.addEventListener('change', () => { S.snap = snapBox.checked; });

    // ---- first paint ----
    ensureVisible(S.z, { reset: true });
    render();
    const mv = (window.__mv = window.__mv || {});
    mine.hook = {
      state: () => ({ z: { re: S.z.re, im: S.z.im }, r: Math.hypot(S.z.re, S.z.im), theta: isZero(S.z) ? null : Arg(S.z), grid: S.grid, ghosts: S.ghosts, snap: S.snap, userView: S.userView }),
      drawn: () => ({ pos: lastGhosts.pos, neg: lastGhosts.neg }),
    };
    mv.addresses = mine.hook;
  } catch (err) {
    cleanup();
    throw err;
  }

  function cleanup() {
    if (formsRaf) cancelAnimationFrame(formsRaf);
    formsRaf = 0;
    for (const d of disposers.splice(0).reverse()) { try { d(); } catch (e) { /* already gone */ } }
    if (typeof window !== 'undefined' && window.__mv && mine.hook && window.__mv.addresses === mine.hook) delete window.__mv.addresses;
  }
  return function unmount() { cleanup(); };
}
