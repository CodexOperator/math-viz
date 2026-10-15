// js/stations/principal-root.js: station "Principal Roots: Stand on the Home Step" (problem 2.2.2).
//
// The same picture as `roots`, for one number w: every step of the staircase of w divided by n is a root, but the PRINCIPAL
// root uses only the home step, Arg w. It is drawn solid; the other n - 1 roots are ghosts from the steps above. A sweep takes
// w once around the origin: the principal root turns at 1/n of the speed and jumps when w crosses the seam (the negative real
// axis), where Arg w drops from pi to -pi.
//
// Every root comes from complex.js (rootsOf, principalRoot). The pure helpers below are named exports and the module has no
// top-level DOM access, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-roots-principal.md.

import { Arg, wrapArg, abs as cabs, pow as cpow, fromPolar, rootsOf, principalRoot, eq,
         fmtNum, fmtCart, fmtAngle, texNumber, texAngle, texCart } from '../core/complex.js';
import { createPlane, drawCircle, drawLabel, drawSegment, drawSeam, drawCartAddress, drawPolarAddress, createLabelPlacer, cssColor, niceGridStep, DASH } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase, seamJump } from '../core/staircase.js';
import { tex, cart, polar, prose, plainProse } from '../core/katex.js';
import { circle } from '../core/shapes.js';
import { pushForward } from '../core/mapping.js';
import { problemsForStation, problemById, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { threadLabel, threadLinkPrefix } from '../registry.js';

// ---------------------------------------------------------------- constants

export const N_MIN = 2, N_MAX = 6, W_MAX = 40, SWEEP_MS = 5000, SWEEP_STEPS = 12;

const ZERO = Object.freeze({ re: 0, im: 0 });
const TWO_PI = 2 * Math.PI;
const BIG_MSG = 'That is a big number. Keeping |w| at 40 or less so the picture stays readable.';
const P_LADDER = Object.freeze([2, 3.2, 5, 8, 13, 20, 32, 52]);
const ROOT_LADDER = Object.freeze([0.2, 0.4, 0.75, 1.5, 2, 3.2, 5, 8, 13, 20, 32, 52]);     // "Zoom in on the roots": fitted to the roots alone
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const A = (x) => fmtAngle(x, { unicode: true });   // angles in readouts and notes, with the π typeset
const TINY = { tiny: true };                                            // a typed c or w near 0 (but not 0) prints as m×10ⁿ, never as 0 beside an angle
const Z = (z) => fmtCart(z, 3, TINY);
const N = (x) => fmtNum(x, 3, TINY);

export const PRESETS = Object.freeze({
  '2i': Object.freeze({ w: Object.freeze({ re: 0, im: 2 }), n: 2, sel: 1, label: 'w = 2i, n = 2', problem: '2.2.2' }),
  'm1': Object.freeze({ w: Object.freeze({ re: -1, im: 0 }), n: 2, sel: 1, label: 'w = -1, n = 2', problem: null }),
  'm1cube': Object.freeze({ w: Object.freeze({ re: -1, im: 0 }), n: 3, sel: 1, label: 'w = -1, n = 3', problem: null }),
});
const PRESET_IDS = Object.freeze({ '2i': 'principal-root-preset-2i', 'm1': 'principal-root-preset-m1', 'm1cube': 'principal-root-preset-m1cube' });

// ---------------------------------------------------------------- the model (pure)

// w, its n roots (one per step of the staircase) and the principal one (step 0 only).
export function principalModel(w, n) {
  const nn = clamp(Math.round(Number.isFinite(n) ? n : N_MIN), N_MIN, N_MAX);
  const wz = { re: Number(w && w.re), im: Number(w && w.im) };
  const mod = cabs(wz);
  const zero = !Number.isFinite(mod) || mod < 1e-9;
  const jumpDistanceOf = (rho) => 2 * rho * Math.sin(Math.PI / nn);
  if (zero) {
    return {
      w: { re: Number.isFinite(wz.re) ? wz.re : 0, im: Number.isFinite(wz.im) ? wz.im : 0 }, n: nn, zero: true, exact: true, mod: 0, rho: 0, Theta: null, P: { re: 0, im: 0 },
      steps: Array.from({ length: nn }, (_, k) => ({ k, raw: null, point: { re: 0, im: 0 }, argPoint: null })),
      jumpDistance: 0, isNegReal: false, realRoot: null,
    };
  }
  const Theta = Arg(wz);
  const rho = Math.pow(mod, 1 / nn);
  const P = principalRoot(wz, nn);
  const all = rootsOf(wz, nn);
  const steps = all.map((point, k) => ({ k, raw: (Theta + TWO_PI * k) / nn, point, argPoint: wrapArg(Arg(point)) }));
  const isNegReal = wz.re < 0 && Math.abs(wz.im) <= 1e-12 * mod;
  // exact: both parts of w are whole numbers. Only then does the explainer use fractions and radicals; a typed decimal prints as a
  // decimal there too, like the readout (ARCHITECTURE 10.4.5).
  const exact = Number.isInteger(wz.re) && Number.isInteger(wz.im);
  return { w: wz, n: nn, zero: false, exact, mod, rho, Theta, P, steps, jumpDistance: jumpDistanceOf(rho), isNegReal, realRoot: isNegReal && nn % 2 === 1 ? -rho : null };
}

// "2 e^(i 5pi/4)", "e^(i 0)", "e^(-i pi/4)": the polar form (coefficient 1 dropped) with the angle kept as given.
export function polarText(rho, theta) {
  const R = fmtNum(rho), a = fmtAngle(theta, { unicode: true });
  const neg = a.startsWith('-');
  const body = `e^(${neg ? '-' : ''}i ${neg ? a.slice(1) : a})`;
  return R === '1' ? body : `${R} ${body}`;
}

export function principalReadout(P) {
  if (P.zero) return `w = 0; n = ${P.n}; every root is 0; Arg w: no angle at 0`;
  const dec = N(P.Theta), exact = A(P.Theta);
  const arg = exact === dec ? `Arg w = ${dec}` : `Arg w = ${dec} (${exact})`;
  return `w = ${Z(P.w)}; n = ${P.n}; |w| = ${N(P.mod)}; ${arg}; w^(1/n) = ${polarText(P.rho, P.Theta / P.n)} = ${Z(P.P)}`;
}

// What the selected step gives. k = 0 is the principal root.
export function pickNote(P, k) {
  if (P.zero) return '';
  const kk = clamp(Math.round(k), 0, P.n - 1);
  const st = P.steps[kk];
  if (kk === 0) return `The principal root comes from step k = 0, the home step: angle Arg w / ${P.n} = ${A(P.Theta / P.n)}. It lands on ${Z(P.P)}.`;
  return `This root comes from step k = ${kk}: the angle is (Arg w + ${2 * kk}π)/${P.n} = ${A(st.raw)}. It lands on ${Z(st.point)}. It is a root of w, but it is not the principal root.`;
}

// The warning for a negative real w and odd n: the real root is not the principal one. '' when it does not apply.
export function trapNote(P) {
  if (P.zero || !P.isNegReal || P.n % 2 === 0) return '';
  return `${Z(P.w)} is a negative real number and n = ${P.n} is odd, so it has a real root, ${N(-P.rho)}. That root is not the principal one. The principal root uses Arg w = π and lands at angle π/${P.n}: ${Z(P.P)}.`;
}

// dir +1: w crossed the seam counterclockwise (the root goes from angle pi/n to -pi/n); -1: clockwise.
export function jumpReadout({ n, rho, count, dir }) {
  const from = dir > 0 ? Math.PI / n : -Math.PI / n;
  return `The root jumps at Arg w = π: its angle went from ${A(from)} to ${A(-from)} (a jump of ${N(2 * rho * Math.sin(Math.PI / n))}). Crossings so far: ${count}.`;
}

// w once around the circle of the given radius from angle phi0, N steps; root = the principal root at each step.
export function sweepTrace(radius, phi0, n, steps = 48) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const w = fromPolar(radius, phi0 + TWO_PI * i / steps);
    out.push({ i, u: i / steps, w, arg: Arg(w), root: principalRoot(w, n) });
  }
  return out;
}

// ---------------------------------------------------------------- views and snapping (pure)

export function ladderCeil(x, ladder) {
  for (const v of ladder) if (v >= x - 1e-12) return v;
  return ladder[ladder.length - 1];
}

// The half-width of the plane. By default w and its roots both fit. focusRoots fits the roots alone (w may then lie outside the
// picture): the way back from a far w, where the roots would otherwise shrink into a cluster at the origin.
export function viewHalfWidth(P, focusRoots = false) {
  if (focusRoots && !P.zero) return ladderCeil(1.3 * P.rho, ROOT_LADDER);
  return ladderCeil(1.3 * Math.max(P.mod, P.rho, 1), P_LADDER);
}

// Each coordinate to the nearest multiple of step when within tol; rounded to 9 decimals, never -0.
export function snapToGrid(z, step, tol) {
  const f = (v) => { const m = Math.round(v / step) * step; return Math.abs(v - m) < tol ? Number(m.toFixed(9)) + 0 : v; };
  return { re: f(z.re), im: f(z.im) };
}

// ---------------------------------------------------------------- TeX helpers (pure)

const dust = (x) => (Math.abs(x) < 1e-12 ? 0 : x) + 0;
const tidyC = (z) => ({ re: dust(z.re), im: dust(z.im) });

// texAngle with every \frac{p}{q} written p/q, for angles that sit in an exponent.
export function texSlash(theta) {
  return texAngle(theta).replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
}

// rho e^{i theta} with the raw angle kept. numFn types rho: texNumber (exact forms) or a decimal.
export function texExp(rho, theta, numFn = texNumber) {
  const R = numFn(rho), Tt = texSlash(theta);
  const neg = Tt.startsWith('-');
  const body = neg ? Tt.slice(1) : Tt;
  const sp = /^\d/.test(body) ? '\\,' : '';
  const e = `e^{${neg ? '-' : ''}i${sp}${body}}`;
  return R === '1' ? e : `${R}\\,${e}`;
}

// One house style per view: whole-number w gets exact forms (fractions, radicals), a typed decimal gets decimals everywhere.
const decNum = (x) => fmtNum(x);
const decCart = (z) => fmtCart(z);
export const numOf = (P) => (P.exact ? texNumber : decNum);
export const cartOf = (P) => (P.exact ? texCart : decCart);
// A base that carries an exponent: a bare fraction or radical would read as the exponent applying to its last symbol.
export const powBase = (t) => (/^-?[\d.]+$/.test(t) ? t : `\\left(${t}\\right)`);

function lines(...ls) {
  const l = ls.filter(Boolean);
  return l.length === 1 ? l[0] : `\\begin{array}{l}${l.join(' \\\\ ')}\\end{array}`;
}

const thetaTex = (Theta) => (Theta === 0 ? '2\\pi k' : `${texAngle(Theta)} + 2\\pi k`);

// Explainer rows. state = { P, k }; every cell is null when w = 0.
export function principalRows() {
  const live = (s) => s && s.P && !s.P.zero;
  return [
    { id: 'w', label: 'w', native: null,
      cart: (s) => (live(s) ? cart(`w = a + bi = ${cartOf(s.P)(s.P.w)}`) : null),
      polar: (s) => (live(s) ? polar(`w = |w|\\,e^{i\\operatorname{Arg}w} = ${texExp(s.P.mod, s.P.Theta, numOf(s.P))}`) : null) },
    { id: 'eq', label: 'solve zⁿ = w', native: 'polar',
      cart: (s) => {
        if (!live(s)) return null;
        const P = s.P, n = P.n;
        return n === 2
          ? lines(cart(`(a+bi)^{2} = ${cartOf(P)(P.w)}`), cart(`a^{2} - b^{2} = ${numOf(P)(P.w.re)},\\ 2ab = ${numOf(P)(P.w.im)}`), cart(`a + bi = \\pm(${cartOf(P)(tidyC(P.P))})`))
          : lines(cart(`(a+bi)^{${n}} = ${cartOf(P)(P.w)}`), cart(`\\text{two equations of degree } ${n}`));
      },
      polar: (s) => (live(s) ? lines(polar(`r^{${s.P.n}} = |w| = ${numOf(s.P)(s.P.mod)}`), polar(`${s.P.n}\\theta = \\operatorname{Arg}w + 2\\pi k = ${thetaTex(s.P.Theta)}`)) : null) },
    { id: 'length', label: 'length of the root', native: null,
      cart: (s) => (live(s) ? cart(`\\sqrt{a^{2}+b^{2}} = \\sqrt{(${N(s.P.P.re)})^{2} + (${N(s.P.P.im)})^{2}} = ${N(s.P.rho)}`) : null),
      polar: (s) => (live(s) ? polar(`|w|^{1/${s.P.n}} = ${powBase(numOf(s.P)(s.P.mod))}^{1/${s.P.n}} = ${N(s.P.rho)}`) : null) },
    { id: 'angle', label: 'angle of the root', native: 'polar',
      cart: (s) => (live(s) ? cart(`\\operatorname{atan2}(b, a) = ${texAngle(wrapArg(Arg(s.P.P)))}`) : null),
      polar: (s) => (live(s) ? polar(`\\frac{1}{n}\\operatorname{Arg}w = \\frac{1}{${s.P.n}}\\left(${texAngle(s.P.Theta)}\\right) = ${texAngle(s.P.Theta / s.P.n)}`) : null) },
    { id: 'other', label: 'root from step k', native: null,
      cart: (s) => (live(s) ? cart(`${cartOf(s.P)(tidyC(s.P.steps[clamp(s.k, 0, s.P.n - 1)].point))}`) : null),
      polar: (s) => {
        if (!live(s)) return null;
        const P = s.P, k = clamp(s.k, 0, P.n - 1), st = P.steps[k];
        return lines(polar(`\\theta_{${k}} = \\frac{1}{${P.n}}\\left(${texAngle(P.Theta)} + 2\\pi\\cdot ${k}\\right) = ${texAngle(st.raw)}`),
          polar(`\\Rightarrow\\ ${texExp(P.rho, st.raw, numOf(P))}`));
      } },
  ];
}

// The footer: the principal root to the n-th power, in each address, must come back to w.
export function principalSame(s) {
  if (!s || !s.P || s.P.zero) return { cart: null, polar: null, agree: null };
  const P = s.P, n = P.n;
  const powC = cpow(P.P, n);
  const powP = fromPolar(Math.pow(P.rho, n), P.Theta);
  const tol = 1e-9 * Math.max(1, P.mod);
  return {
    cart: cart(`(${cartOf(P)(tidyC(P.P))})^{${n}} = ${cartOf(P)(tidyC(powC))}`),
    polar: polar(`(${numOf(P)(P.rho)})^{${n}}\\,${texExp(1, P.Theta)} = ${cartOf(P)(tidyC(powP))}`),
    agree: eq(powC, P.w, tol) && eq(powP, P.w, tol),
  };
}

// What the state of a fresh mount is, from the router's preset.
export function initialState(preset) {
  let key = '2i';
  if (preset && preset.kind === 'token' && Object.prototype.hasOwnProperty.call(PRESETS, preset.token)) key = preset.token;
  const p = PRESETS[key];
  return { w: { re: p.w.re, im: p.w.im }, n: p.n, sel: p.sel };
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

const STYLE = `
.rt-two { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); align-items: start; }
.rt-two > * { min-width: 0; }
.rt-badges { display: inline-flex; flex-wrap: wrap; gap: .25rem; }
.plane-handle.rt-ghost .plane-handle-dot { opacity: .5; }
.plane-handle.rt-pickable { cursor: pointer; }
.rt-note { margin: 0; min-height: 1.4em; overflow-wrap: anywhere; }
.rt-fields { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-2) var(--space-3); margin-top: var(--space-2); }
.rt-fields input.num { width: 5.75rem; }
.rt-cap { margin: var(--space-2) 0 0; font-size: .92rem; color: var(--text-muted); overflow-wrap: anywhere; }
.rt-stack { display: grid; gap: var(--space-2); }
.rt-stack > * { min-width: 0; margin-top: 0; margin-bottom: 0; }
.rt-sub { margin: 0 0 var(--space-1); font-size: 1rem; }
.rt-err { margin: var(--space-1) 0 0; min-height: 1.2em; color: var(--danger); font-size: .92rem; }
.rt-why { margin: var(--space-1) 0 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .5rem; }
.rt-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.rt-actions .btn { align-self: flex-start; }
.rt-sweep-title { margin-top: var(--space-3); }
.rt-slot { display: grid; }
.rt-slot > * { grid-area: 1 / 1; min-width: 0; align-self: start; }
.rt-slot > .rt-slot-ghost { visibility: hidden; pointer-events: none; }
.rt-readout { position: relative; }
.rt-readout::before { content: attr(data-sizer); display: block; visibility: hidden; }
.rt-readout .rt-live { position: absolute; top: var(--space-2); left: var(--space-3); right: var(--space-3); }
.rt-controls .slider-row { margin-top: var(--space-2); }
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
    const a = mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: plainProse(p.aha) }, p.id);
    chipById.set(p.id, a);
    chips.appendChild(a);
  }
  header.append(badges, chips);
  return { header, chipById };
}

// The callout is never hidden: it shows problem 2.2.2 when w and n match it, or a neutral line. Its slot (mountSlot) is always as tall
// as the tallest of them, so nothing below it ever moves when it changes.
const NEUTRAL_TEXT = 'No review problem matches these numbers. The chip "w = 2i, n = 2" under "Pick w and n" is problem 2.2.2.';

function renderProblem(host, p, neutral) {
  host.textContent = '';
  if (!p) {
    delete host.dataset.tone;
    const head = mk('p');
    head.append(mk('strong', '', null, 'Your own numbers.'), ' ', neutral || '');
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
// at any width, so the plane below keeps its place when the numbers change (a drag away from 2i used to move it 141 px).
function mountSlot(slot, live, variants, neutral) {
  for (const v of variants) {
    const ghost = mk('div', 'callout rt-slot-ghost', { 'aria-hidden': 'true', inert: '' });
    renderProblem(ghost, v, neutral);
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

// A readout whose box is as tall as the longest text it can show, so a drag never moves the plane below it when the text wraps
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
  S.userView = false;
  S.fitted = NaN;
  S.focusRoots = false;           // "Zoom in on the roots": the view is fitted to the roots alone
  S.sweep = { mode: 'idle', u: 0, phi0: 0, radius: 0, startW: null, step: 0, startedAt: 0, trace: null, done: false };
  S.lastArg = null;
  S.jumps = 0;
  S.lastJump = null;
  let P = principalModel(S.w, S.n);
  let destroyed = false;
  let loopId = 0, statusTimer = 0, startRaf = 0;
  let stairsN = -1;
  let lastProblemId = undefined;
  const disposables = [];
  const reduced = () => {
    try { if (ctx && ctx.theme && ctx.theme.prefersReducedMotion) return !!ctx.theme.prefersReducedMotion(); } catch (e) { /* fall through */ }
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  };

  const styleEl = injectStyle('station-principal-root', STYLE);

  // ---- DOM blocks
  const { header, chipById } = buildHeader(ctx, 'Every number w has n n-th roots, one for each step of its staircase. The principal root uses only the home step: Arg w, the angle in (−π, π]. Drag w. The solid dot is the principal root. The faint dots come from the other steps. Sweep w once around the origin and watch the solid dot jump when w crosses the seam.');
  const problemBox = mk('div', 'callout', { id: 'principal-root-problem' });
  const problemSlot = mk('div', 'rt-slot', { id: 'principal-root-problem-slot' });
  mountSlot(problemSlot, problemBox, [problemById('2.2.2'), null], NEUTRAL_TEXT);

  const controls = mk('section', 'panel rt-controls', { id: 'principal-root-controls' });
  controls.appendChild(mk('h2', 'panel-title', null, 'Pick w and n'));
  const chips = mk('div', 'chips', { role: 'group', 'aria-label': 'Presets' });
  const presetBtns = new Map();
  for (const key of Object.keys(PRESETS)) {
    const b = mk('button', 'chip', { type: 'button', id: PRESET_IDS[key], 'aria-pressed': 'false' }, PRESETS[key].label);
    presetBtns.set(key, b);
    chips.appendChild(b);
  }
  const sliderRow = mk('div', 'slider-row');
  const nSlider = mk('input', '', { type: 'range', id: 'principal-root-n', min: String(N_MIN), max: String(N_MAX), step: '1', value: String(S.n) });
  const nOut = mk('output', '', { id: 'principal-root-n-out', for: 'principal-root-n' }, String(S.n));
  sliderRow.append(mk('label', '', { for: 'principal-root-n' }, 'n (which root)'), nSlider, nOut);
  const fields = mk('div', 'rt-fields');
  const reField = mk('div', 'field'), imField = mk('div', 'field');
  const reInput = mk('input', 'num', { type: 'number', step: 'any', id: 'principal-root-w-re' });
  const imInput = mk('input', 'num', { type: 'number', step: 'any', id: 'principal-root-w-im' });
  reField.append(mk('label', '', { for: 'principal-root-w-re' }, 'Re w'), reInput);
  imField.append(mk('label', '', { for: 'principal-root-w-im' }, 'Im w'), imInput);
  fields.append(reField, imField);
  const wError = mk('p', 'rt-err', { id: 'principal-root-w-error', 'aria-live': 'polite' });
  const readoutBox = mkReadout('principal-root-readout', 'w = -28.284 - 28.284i; n = 6; |w| = 40; Arg w = -2.356 (-3π/4); w^(1/n) = 1.849 e^(-i 0.393) = 1.708 - 0.708i');
  const readout = readoutBox.live;
  const status = mk('div', 'sr-only', { id: 'principal-root-status', role: 'status' });
  controls.append(chips, sliderRow, fields, wError, readoutBox.box, status);

  const two = mk('div', 'rt-two');
  const planePanel = mk('section', 'panel');
  planePanel.appendChild(mk('h2', 'panel-title', null, 'w and its roots'));
  const planeHost = mk('div');
  const zoomRow = mk('div', 'rt-actions');
  const zoomBtn = mk('button', 'btn', { type: 'button', id: 'principal-root-zoom', 'data-state': 'all' }, 'Zoom in on the roots');
  zoomRow.appendChild(zoomBtn);
  const planeCaption = mk('p', 'rt-cap', { id: 'principal-root-caption' });
  prose(planeCaption, 'Drag w. Solid dot: the principal root, made from Arg w only. Faint dots: the other roots, from the steps above it. Dashed grey ray: the seam, the negative real axis, where Arg w jumps from π to −π. The green dashed circle has radius |w|; the purple one has radius |w|^(1/n), and every root sits on it.');
  planePanel.append(planeHost, zoomRow, planeCaption);

  const sidePanel = mk('section', 'panel');
  const sideStack = mk('div', 'rt-stack');
  sideStack.appendChild(mk('h2', 'panel-title', null, 'The steps of arg w'));
  const stairsHost = mk('div', '', { id: 'principal-root-stairs-host' });
  const pickNoteEl = mk('p', 'rt-note', { id: 'principal-root-pick-note' });
  const trapEl = mk('div', 'callout', { id: 'principal-root-trap' });
  trapEl.hidden = true;
  const sweepTitle = mk('h3', 'rt-sub rt-sweep-title', null, 'Sweep w once around');
  const sweepText = mk('p', 'rt-note', { id: 'principal-root-sweep-text' });
  const sweepRow = mk('div', 'rt-actions');
  const sweepBtn = mk('button', 'btn', { type: 'button', id: 'principal-root-sweep', 'data-state': 'idle' }, 'Sweep w once around the origin');
  sweepRow.appendChild(sweepBtn);
  const sweepOut = mk('p', 'rt-note', { id: 'principal-root-sweep-readout', 'aria-live': 'polite' });
  sideStack.append(stairsHost, pickNoteEl, trapEl, sweepTitle, sweepText, sweepRow, sweepOut);
  sidePanel.appendChild(sideStack);
  two.append(planePanel, sidePanel);

  const explain = mk('section', 'panel', { id: 'principal-root-explain' });
  explain.appendChild(mk('h2', 'panel-title', null, 'Both addresses'));
  const exHost = mk('div', '', { id: 'principal-root-ex-host' });
  explain.appendChild(exHost);

  const nav = buildNav(ctx);
  el.append(header, problemSlot, controls, two, explain, nav);

  // ---- the plane, its handles, the widgets
  const plane = createPlane(planeHost, { id: 'principal-root-plane', xRange: [-3.2, 3.2], yRange: [-3.2, 3.2], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], interactive: true, controls: false,
    minUnitsAcross: 0.2, maxUnitsAcross: 110, aspect: 1, maxWidth: 560, wheel: 'focus', ariaLabel: 'The number w and its n-th roots' });
  disposables.push(() => plane.destroy());
  const wHandle = plane.addPoint({ id: 'w', z: S.w, color: '--input', label: 'w', radius: 8, step: 0.1, name: 'w',
    onDragStart: () => { if (!destroyed) { stopSweep(); hideTrace(); } },
    onDrag: (z, info) => onWDrag(z, info) });
  const rootHandles = [];
  for (let k = 0; k < N_MAX; k++) {
    const h = plane.addPoint({ id: 'r' + k, z: ZERO, draggable: false, focusable: true, color: '--output', radius: k === 0 ? 8 : 6, label: k === 0 ? 'principal' : 'k = ' + k, name: 'root ' + k });
    h.el.classList.add('rt-pickable');
    h.el.addEventListener('click', () => select(k));
    rootHandles.push(h);
  }
  // The staircase widget prints "k = n" in front of every row (showK), which ties row k to the root from step k.
  const stairsOf = () => createStaircase(stairsHost, { id: 'principal-root-stairs', kMin: 0, kMax: S.n - 1, label: 'arg w', showK: true, onPick: (k) => { if (!destroyed) select(k); } });
  let stairs = stairsOf();
  stairsN = S.n;
  disposables.push(() => stairs.destroy());
  const explainer = createExplainer(exHost, { id: 'principal-root-ex', rows: principalRows(), same: principalSame });
  disposables.push(() => explainer.destroy());

  // ---- the layer
  // Is z inside the picture (with a margin)? A far w is outside it in the roots-only view, and its address labels would then be drawn at the edge.
  const inPicture = (pl, z, margin = 10) => {
    const p = pl.toPixel(z), sz = pl.getSize();
    return Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= margin && p.x <= sz.w - margin && p.y >= margin && p.y <= sz.h - margin;
  };
  plane.addLayer((c2, pl) => {
    drawSeam(c2, pl, Math.PI, { label: false });
    // The word "seam" sits above the seam, centred between the larger circle and the edge of the plane, never among the tick labels below the axis.
    { const O = pl.toPixel(ZERO), room = O.x - (P.zero ? 0 : Math.abs(pl.toPixel({ re: Math.max(P.mod, P.rho), im: 0 }).x - O.x));
      drawLabel(c2, pl, pl.fromPixel(Math.max(8, room / 2 - 15), O.y - 8), 'seam', { color: '--seam', dx: 0, dy: 0, align: 'left', clamp: false }); }
    if (P.zero) {
      ringPx(c2, pl, ZERO, 5, { color: '--output', width: 2 });
      // The word goes beside the origin; the w handle sits on 0 with its own word "w", so the placer steps around both.
      const at = (dx, dy, align) => ({ z: ZERO, dx, dy, align });
      createLabelPlacer(c2, pl)('0: every root', [at(14, -10, 'left'), at(14, 22, 'left'), at(14, 42, 'left'), at(-14, 42, 'right'), at(-14, -10, 'right'), at(-14, 22, 'right'), at(0, 62, 'center')], { color: '--output' });
      return;
    }
    // The two guide circles are named in the top right corner (nothing else lives there), not on the circles: a label on the circle
    // collided with the principal root's own label whenever the root sat near the bottom of its circle.
    const sz = pl.getSize(), corner = (y) => pl.fromPixel(sz.w - 8, y);
    drawCircle(c2, pl, ZERO, P.mod, { color: '--input', width: 1.5, alpha: 0.45, dash: DASH.guide });
    drawLabel(c2, pl, corner(20), `|w| = ${N(P.mod)}`, { dx: 0, dy: 0, color: '--input', align: 'right' });
    drawCircle(c2, pl, ZERO, P.rho, { color: '--output', width: 1.5, alpha: 0.45, dash: DASH.guide });
    drawLabel(c2, pl, corner(38), `|w|^(1/${P.n}) = ${N(P.rho)}`, { dx: 0, dy: 0, color: '--output', align: 'right' });
    for (let k = 1; k < P.n; k++) drawSegment(c2, pl, ZERO, P.steps[k].point, { color: '--polar', width: 1.5, alpha: 0.5, dash: DASH.guide, obstacle: true });
    drawSegment(c2, pl, ZERO, P.P, { color: '--polar', width: 3 });
    drawPolarAddress(c2, pl, P.P, { labels: false, arcRadiusPx: 16 });
    // "angle Arg w / n = ..." goes beside the principal root, on the side where nothing is: w's ring, the principal root's own word and the rays are
    // obstacles of the placer. When w sits close to its principal root (the end of a sweep) the label moves to the other side of the root.
    {
      const at = (dx, dy, align) => ({ z: P.P, dx, dy, align });
      createLabelPlacer(c2, pl)(`angle Arg w / ${P.n} = ${fmtAngle(P.Theta / P.n, { unicode: true })}`,
        [at(12, 27, 'left'), at(-12, 27, 'right'), at(12, 44, 'left'), at(-12, 44, 'right'), at(12, -34, 'left'), at(-12, -34, 'right'), at(0, 62, 'center'), at(0, -52, 'center')], { color: '--polar' });
    }
    // In the roots-only view a far w is outside the picture; its address labels would be drawn at the edge, so they are skipped there.
    if (!S.focusRoots || inPicture(pl, S.w)) {
      drawCartAddress(c2, pl, S.w);
      drawPolarAddress(c2, pl, S.w, { ghosts: 2, ghostsNeg: 1, arcRadiusPx: 30, name: 'w' });
    }
    const selK = clamp(S.sel, 0, P.n - 1);
    ringPx(c2, pl, P.steps[selK].point, (selK === 0 ? 8 : 6) + 6, { color: '--text', width: 2.5 });      // dot radius + 6: clear of the dot's own label
  }, { order: 10 });

  // ---- views
  function setHalf(H) {
    plane.setView({ center: ZERO, unitsAcross: 2 * H });
    plane.setHome();
    S.fitted = H;
  }
  // Hand the plane back to the autofit: forget the user's pan and zoom AND the half-width last fitted, so the next fit always calls
  // setHalf (a pan or zoom changes the view but not `fitted`, so comparing the wanted half-width with `fitted` alone would skip the refit).
  function releaseFit() { S.userView = false; S.fitted = NaN; }
  function fitView(source) {
    if (S.userView || source === 'drag') return;
    const H = viewHalfWidth(P, S.focusRoots);
    if (H !== S.fitted) setHalf(H);
  }
  // The words beside the root dots: "principal" and "k = 1", "k = 2", ... When the roots are closer than about 12 px (a far w shrinks them to a
  // cluster at the origin) the words of the ghost roots would overprint each other, so they are dropped until the picture is zoomed in.
  const CROWD_PX = 12;
  const crowded = () => !P.zero && 2 * P.rho * Math.sin(Math.PI / P.n) * plane.getView().scale < CROWD_PX;
  function syncWords() {
    const gone = crowded();
    for (let k = 0; k < N_MAX; k++) rootHandles[k].setLabel(k === 0 ? 'principal' : gone ? '' : `k = ${k}`);
  }
  const offView = plane.on('viewchange', (v) => {
    if (destroyed) return;
    syncWords();
    if (v.reason === 'pan' || v.reason === 'zoom') S.userView = true;
    else if (v.reason === 'reset') { releaseFit(); fitView('reset'); }
  });

  // ---- the sweep trace (plane curves, created lazily)
  let sweepW = null;
  const sweepRoots = [];
  function curveFor(existing, spec, points) {
    if (existing) { existing.update(points); existing.hidden = false; return existing; }
    return plane.addCurve({ ...spec, points, ramp: true, dots: true, arrow: true, order: 45 });
  }
  function hideTrace() {
    if (sweepW) sweepW.hidden = true;
    for (const c of sweepRoots) if (c) c.hidden = true;
    S.sweep.trace = null;
    S.sweep.done = false;
    plane.requestDraw();
  }
  function showTrace(tr) {
    sweepW = curveFor(sweepW, { id: 'sweep-w', color: '--input', width: 2 }, tr.wCurve.points);
    tr.pieces.slice(0, 3).forEach((pc, i) => { sweepRoots[i] = curveFor(sweepRoots[i], { id: 'sweep-root-' + i, color: '--output', width: 2.5 }, pc.points); });
    for (let i = tr.pieces.length; i < sweepRoots.length; i++) if (sweepRoots[i]) sweepRoots[i].hidden = true;
    plane.requestDraw();
  }
  function buildTrace(Pm) {
    const wCurve = circle(ZERO, Pm.mod, { from: Pm.Theta, to: Pm.Theta + TWO_PI, n: 192 });
    const pieces = pushForward(wCurve, (z) => principalRoot(z, Pm.n));
    return { wCurve, pieces };
  }
  function setCursors(u) {
    if (sweepW) sweepW.setCursor(u);
    const tr = S.sweep.trace;
    if (!tr) return;
    tr.pieces.slice(0, 3).forEach((pc, i) => {
      const pts = pc.points;
      const inside = u !== null && pts.length > 1 && u >= pts[0].t - 1e-9 && u <= pts[pts.length - 1].t + 1e-9;
      if (sweepRoots[i]) sweepRoots[i].setCursor(inside ? u : null);
    });
  }

  // ---- text and widgets
  const wLabel = (m) => `w: ${Z(m.w)}; |w| = ${N(m.mod)}, ${m.zero ? 'Arg w: no angle at 0' : 'Arg w = ' + A(m.Theta)}. Arrow keys move it, Shift moves 10 times as far.`;

  // A field shows either what the student typed or a display the program wrote (three decimals). Typing in one field must never re-read the other
  // field's display text: that rounds the number (0.0004 reads 0) and drops a tiny part. `shown` is the text the program last wrote into each field;
  // while a field still holds exactly that text it stands for the model's exact part, and any other text is a number the student typed.
  const shown = { re: '', im: '' };
  const partOf = (input, key) => (shown[key] !== null && input.value === shown[key] ? S.w[key] : parseField(input));   // null: the student has typed in it since
  function syncField(input, key, force) {
    if (!force && document.activeElement === input) return;
    if (parseField(input) === P.w[key]) return;           // the text already says exactly this number (it was typed): keep it as typed
    const v = fmtNum(P.w[key]);
    if (input.value !== v) input.value = v;
    shown[key] = v;
  }
  function syncFields(force) {
    syncField(reInput, 're', force);
    syncField(imInput, 'im', force);
  }

  function activeProblem() {
    return eq(S.w, { re: 0, im: 2 }) && S.n === 2 ? problemById('2.2.2') : null;
  }

  function announce(text) {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { if (!destroyed) { status.textContent = ''; status.textContent = text; } }, 400);
  }

  function sweepLabel() {
    if (reduced()) return S.sweep.done && S.sweep.mode === 'idle' ? 'Sweep again' : `Step w around (${S.sweep.mode === 'stepping' ? S.sweep.step + 1 : 1} of ${SWEEP_STEPS})`;
    return S.sweep.mode === 'playing' ? 'Stop the sweep' : 'Sweep w once around the origin';
  }
  function sweepReadoutText() {
    if (P.zero) return 'w = 0: every n-th root of 0 is 0, and 0 has no angle. Move w away from 0.';
    if (S.lastJump) return jumpReadout({ ...S.lastJump, count: S.jumps });
    if (S.sweep.mode === 'playing') return `Sweeping. The root turns at 1/${P.n} of the speed of w. No jump yet.`;
    return 'No jump yet. Sweep w once around, or drag it across the negative real axis.';
  }
  function renderSweepUi() {
    setText(sweepBtn, sweepLabel());
    sweepBtn.dataset.state = S.sweep.mode;
    sweepBtn.disabled = P.zero;
    setText(sweepOut, sweepReadoutText());
    setText(sweepText, P.zero ? '' : `w goes once around the circle |w| = ${N(P.mod)}. The principal root goes ${P.n === 2 ? 'half a turn' : '1/' + P.n + ' of a turn'} and then jumps back, because Arg w drops from π to −π at the seam.`);
  }

  // The callout follows the numbers at once (its slot keeps the height, so nothing moves). During a sweep it holds problem 2.2.2, which
  // the sweep is demonstrating, and is refreshed when the sweep ends.
  function refreshProblem() {
    if (S.sweep.mode !== 'idle') return;
    const prob = activeProblem();
    const pid = prob ? prob.id : null;
    if (pid === lastProblemId) return;
    lastProblemId = pid;
    renderProblem(problemBox, prob, NEUTRAL_TEXT);
    for (const [id, chip] of chipById) { if (id === pid) chip.setAttribute('aria-current', 'true'); else chip.removeAttribute('aria-current'); }
  }

  function update(source) {
    if (destroyed) return;
    P = principalModel(S.w, S.n);
    S.sel = clamp(S.sel, 0, S.n - 1);
    // the w handle
    if (source !== 'drag') wHandle.set(P.w, { silent: true });
    wHandle.el.setAttribute('aria-label', wLabel(P));
    // root handles
    const hadFocus = rootHandles.findIndex((h) => document.activeElement === h.el);
    for (let k = 0; k < N_MAX; k++) {
      const h = rootHandles[k];
      if (P.zero || k >= S.n) { h.hidden = true; continue; }
      h.hidden = false;
      h.set(P.steps[k].point, { silent: true });
      h.el.classList.toggle('rt-ghost', k > 0);
      h.el.setAttribute('aria-label', k === 0 ? `Principal root: ${Z(P.steps[0].point)}. Press Enter to select it.` : `Root from step k = ${k}: ${Z(P.steps[k].point)}. Press Enter to select it.`);
    }
    syncWords();
    if (hadFocus >= S.n) { try { rootHandles[S.n - 1].el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    fitView(source);
    // seam crossings: a drag or a sweep step moves w a little; a preset, a typed value or a new n is a teleport and is never counted
    if ((source === 'drag' || source === 'sweep') && !P.zero && S.lastArg !== null) {
      const dir = seamJump(S.lastArg, P.Theta);
      if (dir !== 0) { S.jumps += 1; S.lastJump = { dir, n: P.n, rho: P.rho }; }
    }
    S.lastArg = P.zero ? null : P.Theta;
    if (source === 'preset' || source === 'n' || source === 'input' || source === 'mount') { S.jumps = 0; S.lastJump = null; }
    // text
    setText(readout, principalReadout(P));
    setText(nOut, String(S.n));
    if (Number(nSlider.value) !== S.n) nSlider.value = String(S.n);
    for (const [key, b] of presetBtns) b.setAttribute('aria-pressed', String(eq(S.w, PRESETS[key].w, 1e-9) && S.n === PRESETS[key].n));
    syncFields(false);
    refreshProblem();
    const trap = trapNote(P);
    setText(trapEl, trap);
    trapEl.hidden = trap === '';
    setText(pickNoteEl, P.zero ? '' : pickNote(P, S.sel));
    renderSweepUi();
    setText(zoomBtn, S.focusRoots ? 'Show w again' : 'Zoom in on the roots');
    zoomBtn.dataset.state = S.focusRoots ? 'roots' : 'all';
    zoomBtn.disabled = P.zero;
    // the staircase
    if (stairsN !== S.n) {
      stairs.destroy();
      stairsHost.textContent = '';
      stairs = stairsOf();
      stairsN = S.n;
    }
    stairs.update(P.zero ? null : P.Theta);
    stairs.setPicked(P.zero ? null : S.sel);
    explainer.update({ P, k: S.sel });
    plane.requestDraw();
    if (source === 'preset' || source === 'n' || source === 'input') {
      announce(P.zero ? 'w is 0: every root is 0.' : `Principal root of ${Z(P.w)} for n = ${P.n}: ${Z(P.P)}.`);
    } else if (source === 'select') {
      announce(pickNoteEl.textContent);
    }
  }

  // ---- state changes
  function setNumber(z, source) {
    let zz = { re: z.re, im: z.im };
    const m = cabs(zz);
    if (m > W_MAX) { zz = { re: zz.re * W_MAX / m, im: zz.im * W_MAX / m }; setText(wError, BIG_MSG); }
    // The message stays while the student only moves to the other field (the corrected value is written back to the first field when it loses
    // focus, and the next input event re-reads that same value); it goes at the first edit that really changes w.
    else if (!(source === 'input' && wError.textContent === BIG_MSG && eq(zz, S.w, 1e-12))) setText(wError, '');
    stopSweep();
    hideTrace();
    S.w = zz;
    S.focusRoots = false;
    releaseFit();
    update(source);
  }
  function setN(n) {
    const nn = clamp(Math.round(Number(n)), N_MIN, N_MAX);
    if (!Number.isFinite(nn)) return;
    stopSweep();
    hideTrace();
    S.n = nn;
    S.focusRoots = false;
    releaseFit();                    // the plane has no Reset button: a new n is its way back to the fitted view
    update('n');
  }
  function select(k) {
    if (destroyed) return;
    S.sel = clamp(Math.round(k), 0, S.n - 1);
    update('select');
  }
  function applyPreset(key) {
    const p = PRESETS[key];
    stopSweep();
    hideTrace();
    S.w = { re: p.w.re, im: p.w.im };
    S.n = p.n;
    S.sel = p.sel;
    S.focusRoots = false;
    releaseFit();
    setText(wError, '');
    update('preset');
  }
  function onWDrag(z, info) {
    if (destroyed) return;
    let zz = { re: z.re, im: z.im };
    const m = cabs(zz);
    let moved = false;
    if (m > W_MAX) { zz = { re: zz.re * W_MAX / m, im: zz.im * W_MAX / m }; moved = true; }
    else if (wError.textContent === BIG_MSG) setText(wError, '');          // a drag back into range ends the old message
    if (info && info.final && info.source === 'pointer') {
      const v = plane.getView();
      const z2 = snapToGrid(zz, niceGridStep(v.unitsAcross), 6 / v.scale);
      if (z2.re !== zz.re || z2.im !== zz.im) { zz = z2; moved = true; }
    }
    if (moved) wHandle.set(zz, { silent: true });
    if (S.sweep.mode !== 'idle' && !(info && info.source === 'api')) { stopSweep(); hideTrace(); }
    S.w = zz;
    update('drag');
  }
  function setW(z, source) {
    S.w = { re: z.re, im: z.im };
    wHandle.set(S.w, { silent: true });
    update(source);
  }

  // ---- the sweep
  function beginSweep(mode) {
    S.sweep = { mode, phi0: P.Theta, radius: P.mod, startW: { re: S.w.re, im: S.w.im }, startedAt: 0, u: 0, step: 0, trace: buildTrace(P), done: false };
    S.jumps = 0;
    S.lastJump = null;
    S.lastArg = P.Theta;
    showTrace(S.sweep.trace);
    setCursors(0);
  }
  function endSweepUi() { renderSweepUi(); refreshProblem(); plane.requestDraw(); }
  function tickSweep(now) {
    loopId = 0;
    if (destroyed || S.sweep.mode !== 'playing') return;
    const uRaw = clamp((now - S.sweep.startedAt) / SWEEP_MS, 0, 1);
    const u = Math.min(uRaw, S.sweep.u + 0.05);              // a hidden tab never skips the seam: at most 5% of the lap per frame
    S.sweep.u = u;
    const z = u >= 1 ? S.sweep.startW : fromPolar(S.sweep.radius, S.sweep.phi0 + TWO_PI * u);
    setW(z, 'sweep');
    setCursors(u);
    if (u < 1) loopId = requestAnimationFrame(tickSweep);
    else { S.sweep.mode = 'idle'; setCursors(null); endSweepUi(); announce(sweepOut.textContent); }
  }
  function stopSweep() {
    if (loopId) cancelAnimationFrame(loopId);
    loopId = 0;
    if (S.sweep.mode === 'playing' || S.sweep.mode === 'stepping') {
      S.sweep.mode = 'idle';
      setCursors(null);
      if (!destroyed) endSweepUi();
    }
  }
  function stepSweep() {
    if (P.zero) return;
    if (S.sweep.mode !== 'stepping') beginSweep('stepping');
    S.sweep.step += 1;
    const u = S.sweep.step / SWEEP_STEPS;
    S.sweep.u = u;
    const z = S.sweep.step >= SWEEP_STEPS ? S.sweep.startW : fromPolar(S.sweep.radius, S.sweep.phi0 + TWO_PI * u);
    setW(z, 'sweep');
    setCursors(u);
    if (S.sweep.step >= SWEEP_STEPS) { S.sweep.mode = 'idle'; S.sweep.done = true; setCursors(null); announce(sweepOut.textContent); }
    endSweepUi();
  }
  function startSweep() {
    if (destroyed || P.zero) return;
    if (reduced()) { stepSweep(); return; }
    if (S.sweep.mode === 'playing') { stopSweep(); return; }
    beginSweep('playing');
    S.sweep.startedAt = performance.now();
    renderSweepUi();
    loopId = requestAnimationFrame(tickSweep);
  }

  // ---- controls
  for (const [key, b] of presetBtns) b.addEventListener('click', () => { if (!destroyed) applyPreset(key); });
  nSlider.addEventListener('input', () => { if (!destroyed) setN(Number(nSlider.value)); });
  const readW = () => {
    const re = partOf(reInput, 're'), im = partOf(imInput, 'im');
    return Number.isFinite(re) && Number.isFinite(im) ? { re, im } : null;
  };
  const onWField = () => { const z = readW(); if (z && !destroyed) { reInput.removeAttribute('aria-invalid'); imInput.removeAttribute('aria-invalid'); setNumber(z, 'input'); } };
  const onWChange = () => {
    if (destroyed) return;
    const z = readW();
    if (!z) {
      reInput.setAttribute('aria-invalid', String(!Number.isFinite(parseField(reInput))));
      imInput.setAttribute('aria-invalid', String(!Number.isFinite(parseField(imInput))));
      setText(wError, 'Type a number, like 2 or -0.5.');
      syncFields(true);
      return;
    }
    reInput.removeAttribute('aria-invalid'); imInput.removeAttribute('aria-invalid');
    syncFields(true);
  };
  reInput.addEventListener('input', () => { shown.re = null; onWField(); }); imInput.addEventListener('input', () => { shown.im = null; onWField(); });
  reInput.addEventListener('change', onWChange); imInput.addEventListener('change', onWChange);
  sweepBtn.addEventListener('click', startSweep);
  zoomBtn.addEventListener('click', () => {
    if (destroyed || P.zero) return;
    S.focusRoots = !S.focusRoots;
    releaseFit();
    fitView('view');
    setText(zoomBtn, S.focusRoots ? 'Show w again' : 'Zoom in on the roots');
    zoomBtn.dataset.state = S.focusRoots ? 'roots' : 'all';
    plane.requestDraw();
    announce(S.focusRoots ? 'Zoomed in on the roots. w may be outside the picture.' : 'The picture shows w and its roots again.');
  });

  // ---- first render (synchronous)
  update('mount');
  clearTimeout(statusTimer);

  mv.principalRoot = {
    state() {
      return {
        w: { re: P.w.re, im: P.w.im }, n: S.n, sel: S.sel, rho: P.rho, Theta: P.Theta, root: { re: P.P.re, im: P.P.im },
        jumps: S.jumps, sweep: { mode: S.sweep.mode, u: S.sweep.u }, view: plane.getView().unitsAcross / 2,
      };
    },
    setW(re, im) { setNumber({ re: Number(re), im: Number(im) }, 'input'); },
    setN(n) { setN(n); },
    select(k) { select(k); },
  };
  const hook = mv.principalRoot;

  if (preset && preset.kind === 'token' && preset.token === 'sweep') {
    startRaf = requestAnimationFrame(() => { startRaf = 0; if (!destroyed) startSweep(); });
  }

  return function unmount() {
    if (destroyed) return;
    destroyed = true;
    if (loopId) cancelAnimationFrame(loopId);
    if (startRaf) cancelAnimationFrame(startRaf);
    loopId = 0; startRaf = 0;
    clearTimeout(statusTimer);
    try { offView(); } catch (e) { /* already gone */ }
    for (const d of disposables) { try { d(); } catch (e) { /* already gone */ } }
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    if (mv.principalRoot === hook) delete mv.principalRoot;
  };
}
