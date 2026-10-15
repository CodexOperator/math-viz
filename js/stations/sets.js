// js/stations/sets.js - "Disks, Annuli, Boundaries" (Thread 1 and 3: a set is understood one tiny disk at a time).
//
// One plane shows a set S (default 1 < |z + i| <= 3, problem 1.5.2) with a draggable probe p and an epsilon-disk around
// it. The disk is green when all of it is in S, grey when none of it is, and two-tone with an amber ring when the edge of S
// runs through it ("in and out"). The six answers (open, closed, bounded, connected, domain, region) are COMPUTED from a
// small model of S, never looked up per preset: a set is a list of cells (a ring or a half plane) whose strict / non-strict
// flags give its edges; open, closed, bounded, connected, domain and region are exact pure functions of that model, and the
// two "leave out" checkboxes re-run the analysis.
//
// Design: docs/designs/iter-1/i1-station-distance-sets.md (sections 2 to 6). No DOM access at import time: the pure
// model below is imported by tests/unit/i1-station-distance-sets.test.mjs in Node.

import { createPlane, drawSegment, drawCircle, drawLabel, drawPolygonFill, DASH, cssColor, niceGridStep } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose, cart, polar } from '../core/katex.js';
import { C, add, sub, scale, abs, Arg, fromPolar, fmtNum, fmtCart, exactAngle, texAngle } from '../core/complex.js';
import { problemById, problemsForStation, statementParts, routeFor } from '../data/problems.js';

export const TOL = 1e-9;                                                  // a point this close to an edge is ON it
export const VIEW = Object.freeze({ xRange: Object.freeze([-5, 5]), yRange: Object.freeze([-5, 5]) });
export const PRESET_IDS = Object.freeze(['annulus', 'closed', 'punctured', 'halfplane', 'twodisks']);
export const CHIP_IDS = Object.freeze(['open', 'closed', 'bounded', 'connected', 'domain', 'region']);
export const SNAP_PX = 6;

// ---------------------------------------------------------------------------------------------------------------
// 5.1 shared helpers
// ---------------------------------------------------------------------------------------------------------------

const T = String.raw;
const n = (x) => fmtNum(x, 3);
// A probe put there by a pointer is never exactly on a nice angle (an edge snap keeps its direction, and a pixel is not a
// multiple of pi/q), so an angle within 1e-6 rad of p pi / q (q <= 12) is shown as that exact angle: far below what three
// decimals can show, and it keeps rounding noise from turning pi/2 into a bare 1.571.
const niceAngle = (t) => {
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(t * q / Math.PI);
    if (Math.abs(p) <= 120 && Math.abs(t - p * Math.PI / q) < 1e-6) return p * Math.PI / q + 0;
  }
  return t;
};
const ang = (t) => { t = niceAngle(t); const e = exactAngle(t); return e && e.p !== 0 ? T`${texAngle(t)} \approx ${n(t)}` : n(t); };
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const shift = (v, c) => (Math.abs(c) < 5e-10 ? v : c > 0 ? `(${v} - ${n(c)})` : `(${v} + ${n(-c)})`);   // shift('y', -1) is "(y + 1)"
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const copyZ = (z) => ({ re: z.re, im: z.im });

function h(tag, attrs = {}, kids = []) {                                  // tiny DOM builder; text goes through textContent, never innerHTML
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v; else if (k === 'text') node.textContent = v; else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(kids)) if (c != null) node.append(c.nodeType ? c : document.createTextNode(String(c)));
  return node;
}

// ---------------------------------------------------------------------------------------------------------------
// 5.8 the set model (the part acceptance A5 inspects)
// ---------------------------------------------------------------------------------------------------------------
// Set  = { preset, flags: { innerStrict, outerStrict }, innerApplies, outerApplies, cells: Cell[] }
// Cell = { kind: 'ring', c, lo, hi, loStrict, hiStrict }   lo (<|<=) |z - c| (<|<=) hi
//      | { kind: 'half', point, normal /* unit */, strict } (z - point) . normal (>|>=) 0
// Edge = { kind: 'circle', c, r, included, role, cell } | { kind: 'point', c, included: false, role: 'inner', cell } | { kind: 'line', point, dir, normal, included, role: 'outer', cell }

const ring = (c, lo, hi, loStrict, hiStrict) => ({ kind: 'ring', c, lo, hi, loStrict, hiStrict });
const half = (point, normal, strict) => ({ kind: 'half', point, normal, strict });
const DEFS = {
  annulus: { cells: (f) => [ring(C(0, -1), 1, 3, f.innerStrict, f.outerStrict)], flags: { innerStrict: true, outerStrict: false }, innerApplies: true },
  closed: { cells: (f) => [ring(C(0, -1), 1, 3, f.innerStrict, f.outerStrict)], flags: { innerStrict: false, outerStrict: false }, innerApplies: true },
  punctured: { cells: (f) => [ring(C(0, -1), 0, 3, f.innerStrict, f.outerStrict)], flags: { innerStrict: true, outerStrict: true }, innerApplies: true },
  halfplane: { cells: (f) => [half(C(0, 0), C(0, 1), f.outerStrict)], flags: { innerStrict: false, outerStrict: true }, innerApplies: false },
  twodisks: { cells: (f) => [ring(C(-2, 0), 0, 1, false, f.outerStrict), ring(C(2, 0), 0, 1, false, f.outerStrict)], flags: { innerStrict: false, outerStrict: true }, innerApplies: false },
};

/** Build a set from a preset id and the two strictness flags (an unknown id gives the annulus; missing flags take the preset's defaults). */
export function buildSet(id, flags = {}) {
  const def = DEFS[id] || DEFS.annulus, preset = DEFS[id] ? id : 'annulus';
  const f = {
    innerStrict: def.innerApplies ? (flags.innerStrict ?? def.flags.innerStrict) : def.flags.innerStrict,
    outerStrict: flags.outerStrict ?? def.flags.outerStrict,
  };
  return { preset, flags: f, innerApplies: def.innerApplies, outerApplies: true, cells: def.cells(f) };
}

/** The default flags of a preset (a fresh object). */
export function defaultFlags(id) { return { ...(DEFS[id] || DEFS.annulus).flags }; }

/** Every edge of S, cell by cell, inner before outer. */
export function edgesOf(set) {
  const out = [];
  set.cells.forEach((cell, i) => {
    if (cell.kind === 'ring') {
      if (cell.lo > 0) out.push({ kind: 'circle', c: cell.c, r: cell.lo, included: !cell.loStrict, role: 'inner', cell: i });
      else if (cell.loStrict) out.push({ kind: 'point', c: cell.c, included: false, role: 'inner', cell: i });         // 0 < |z - c|: the puncture
      if (Number.isFinite(cell.hi)) out.push({ kind: 'circle', c: cell.c, r: cell.hi, included: !cell.hiStrict, role: 'outer', cell: i });
    } else {
      out.push({ kind: 'line', point: cell.point, dir: C(-cell.normal.im, cell.normal.re), normal: cell.normal, included: !cell.strict, role: 'outer', cell: i });
    }
  });
  return out;
}

/** Is z in S? A point within TOL of an edge counts as that edge: its `included` flag decides. */
export function contains(set, z) {
  return set.cells.some((cell) => {
    if (cell.kind === 'ring') {
      const d = Math.hypot(z.re - cell.c.re, z.im - cell.c.im);
      return (cell.loStrict ? d > cell.lo + TOL : d >= cell.lo - TOL) && (cell.hiStrict ? d < cell.hi - TOL : d <= cell.hi + TOL);
    }
    const s = (z.re - cell.point.re) * cell.normal.re + (z.im - cell.point.im) * cell.normal.im;
    return cell.strict ? s > TOL : s >= -TOL;
  });
}

const edgeDist = (e, z) =>
  e.kind === 'circle' ? Math.abs(Math.hypot(z.re - e.c.re, z.im - e.c.im) - e.r)
    : e.kind === 'point' ? Math.hypot(z.re - e.c.re, z.im - e.c.im)
      : Math.abs((z.re - e.point.re) * e.normal.re + (z.im - e.point.im) * e.normal.im);

/** The edge nearest to z and its distance, or null when S has no edges. */
export function nearestEdge(set, z) {
  let best = null;
  for (const e of edgesOf(set)) { const d = edgeDist(e, z); if (!best || d < best.dist) best = { edge: e, dist: d }; }
  return best;
}

/** The closest point of the edge to z. */
export function projectToEdge(e, z) {
  if (e.kind === 'point') return { re: e.c.re, im: e.c.im };
  if (e.kind === 'circle') {
    const vx = z.re - e.c.re, vy = z.im - e.c.im, L = Math.hypot(vx, vy);
    return L < 1e-12 ? { re: e.c.re + e.r, im: e.c.im } : { re: e.c.re + vx * e.r / L, im: e.c.im + vy * e.r / L };
  }
  const t = (z.re - e.point.re) * e.dir.re + (z.im - e.point.im) * e.dir.im;
  return { re: e.point.re + e.dir.re * t, im: e.point.im + e.dir.im * t };
}

/** interior / exterior / boundary, whether z is in S, and the largest eps for which the open disk D_eps(z) stays on one side. */
export function classifyPoint(set, z) {
  const ne = nearestEdge(set, z), inS = contains(set, z);
  if (!ne) return { kind: inS ? 'interior' : 'exterior', inS, edge: null, dist: Infinity, epsMax: Infinity };
  if (ne.dist <= TOL) return { kind: 'boundary', inS: ne.edge.included, edge: ne.edge, dist: ne.dist, epsMax: 0 };
  return { kind: inS ? 'interior' : 'exterior', inS, edge: ne.edge, dist: ne.dist, epsMax: ne.dist };
}

/** What the disk of radius eps around z holds: 'in' (all in S), 'out' (none), 'both'. */
export function diskStatus(set, z, eps) {
  const c = classifyPoint(set, z);
  if (c.kind === 'boundary') return 'both';
  return eps <= c.epsMax + 1e-12 ? (c.inS ? 'in' : 'out') : 'both';
}

/** The point of the nearest edge when z is within tol of it, else null. */
export function snapToEdge(set, z, tol) { const ne = nearestEdge(set, z); return ne && ne.dist <= tol ? projectToEdge(ne.edge, z) : null; }

/** The six answers, derived from the model only (no preset id appears here). */
export function analyse(set) {
  const edges = edgesOf(set), included = edges.filter((e) => e.included), excluded = edges.filter((e) => !e.included);
  const pieces = set.cells.length, bounded = set.cells.every((c) => c.kind === 'ring' && Number.isFinite(c.hi));
  const open = included.length === 0, closed = excluded.length === 0, connected = pieces === 1;
  return {
    open, closed, bounded, connected, domain: open && connected, region: connected, pieces, edges, included, excluded,
    boundingRadius: bounded ? Math.max(...set.cells.map((c) => Math.hypot(c.c.re, c.c.im) + c.hi)) : null,
  };
}

/** "|z|", "|z + i|", "|z - 2|", "|z - (1 + 2i)|": the distance from c, written the way a student would. */
export function absZMinus(c) {
  const z0 = (x) => Math.abs(x) < 1e-12;
  if (z0(c.re) && z0(c.im)) return '|z|';
  if (z0(c.im)) return c.re > 0 ? `|z - ${fmtNum(c.re)}|` : `|z + ${fmtNum(-c.re)}|`;
  if (z0(c.re)) { const k = fmtNum(Math.abs(c.im)), t = k === '1' ? 'i' : `${k}i`; return c.im > 0 ? `|z - ${t}|` : `|z + ${t}|`; }
  return `|z - (${fmtCart(c)})|`;
}

/** The set as an inequality: { ascii, tex }. */
export function describeSet(set) {
  const parts = set.cells.map((cell) => {
    if (cell.kind === 'ring') {
      const zc = absZMinus(cell.c), loOp = cell.loStrict ? '<' : '<=', hiOp = cell.hiStrict ? '<' : '<=';
      return cell.lo === 0 && !cell.loStrict ? `${zc} ${hiOp} ${fmtNum(cell.hi)}` : `${fmtNum(cell.lo)} ${loOp} ${zc} ${hiOp} ${fmtNum(cell.hi)}`;
    }
    return `Im z ${cell.strict ? '>' : '>='} ${fmtNum(cell.point.im)}`;           // the half-plane preset (normal i)
  });
  const ascii = parts.join(' or ');
  return { ascii, tex: ascii.replace(/<=/g, '\\le').replace(/>=/g, '\\ge').replace(/Im z/g, '\\operatorname{Im} z').replace(/ or /g, '\\ \\text{or}\\ ') };
}

/** The interior of S as a set: every edge leaves S, a centre that is in S stays. */
export function interiorOf(set) {
  return { ...set, cells: set.cells.map((c) => (c.kind === 'ring' ? { ...c, loStrict: c.lo > 0 ? true : c.loStrict, hiStrict: true } : { ...c, strict: true })) };
}

/** "the circle |z + i| = 3", "the point z = -i", "the line Im z = 0". */
export function edgeText(e) {
  if (e.kind === 'circle') return `the circle ${absZMinus(e.c)} = ${fmtNum(e.r)}`;
  if (e.kind === 'point') return `the point z = ${fmtCart(e.c)}`;
  return `the line Im z = ${fmtNum(e.point.im)}`;
}

/** The #sets-boundary sentence. */
export function boundaryText(set) {
  const es = edgesOf(set);
  return es.length ? `Boundary points: ${es.map((e) => `${edgeText(e)} (${e.included ? 'in S' : 'not in S'})`).join('; ')}.` : 'S has no boundary points.';
}

/** The reason sentences of 2.5.8 for the six answers. */
export function reasons(set, an) {
  const list = (es) => es.map(edgeText).join(' and '), one = (es) => es.length === 1;
  return {
    open: an.open ? 'No boundary point is in S, so every point of S has a small disk around it that stays inside S.'
      : `${list(an.included)} ${one(an.included) ? 'belongs' : 'belong'} to S, but every disk around a point there sticks out of S. So S is not open.`,
    closed: an.closed ? 'S contains every one of its boundary points.'
      : `${list(an.excluded)} ${one(an.excluded) ? 'is a boundary of S that is not in S' : 'are boundaries of S that are not in S'}. So S is not closed.`,
    bounded: an.bounded ? `S fits inside the disk |z| <= ${fmtNum(an.boundingRadius)}.` : 'S runs off to infinity: no disk contains it.',
    connected: an.connected ? 'S is one piece: you can walk between any two of its points without leaving S.'
      : `S is ${an.pieces} separate pieces. A path from one to the other must leave S.`,
    domain: `A domain is open and connected. S is ${an.open ? 'open' : 'not open'} and ${an.connected ? 'connected' : 'not connected'}, so it ${an.domain ? 'is' : 'is not'} a domain.`,
    region: an.region
      ? `A region is a domain plus some, none or all of its boundary points. S is the domain ${describeSet(interiorOf(set)).ascii} plus ${an.included.length === 0 ? 'none' : an.excluded.length === 0 ? 'all' : 'some'} of its boundary.`
      : `A region is one connected piece. S is ${an.pieces} pieces, so it is not a region.`,
  };
}

/** A radius for text: three decimals, exponent form below 0.001, and 0 for anything under TOL (rounding noise on an edge point is a 0). */
export const fmtEps = (x) => (Math.abs(x) < TOL ? '0' : x < 0.001 ? x.toExponential(1) : fmtNum(x, 3));

/** The answer's TeX with every \text{...} phrase cut into words, so it can wrap at any width instead of running off the callout. */
export function wrapAnswerTex(src) {
  return String(src).replace(/\\text\{([^{}]*)\}/g, (_, body) => body.split(/(\s+)/).map((t) => (/^\s+$/.test(t) ? '\\ \\allowbreak ' : t ? `\\text{${t}}` : '')).join(''));
}

/** The preset a route asks for: problem 1.5.2 or a token naming a preset; everything else is the annulus. */
export function presetFromContext(p) {
  if (p && p.kind === 'problem' && p.id === '1.5.2') return { id: 'annulus' };
  if (p && p.kind === 'token' && PRESET_IDS.includes(p.token)) return { id: p.token };
  return { id: 'annulus' };
}

const sameSet = (a, b) => JSON.stringify(a.cells) === JSON.stringify(b.cells);       // Infinity serialises the same on both sides

// ---------------------------------------------------------------------------------------------------------------
// 5.10 explainer rows
// ---------------------------------------------------------------------------------------------------------------

const OR = T`\ \text{or}\ `;
function ringFrag(cell, p, i, many) {                                         // one ring cell, evaluated at the probe p
  const dx = p.re - cell.c.re, dy = p.im - cell.c.im, D = dx * dx + dy * dy, rho = Math.sqrt(D);
  const loOp = cell.loStrict ? '<' : '\\le', hiOp = cell.hiStrict ? '<' : '\\le', hasLo = !(cell.lo === 0 && !cell.loStrict);
  const rn = many ? `\\rho_${i + 1}` : '\\rho';
  const lo2 = hasLo ? `${n(cell.lo * cell.lo)} ${loOp} ` : '', lo1 = hasLo ? `${n(cell.lo)} ${loOp} ` : '';
  return {
    D, rho, off: sub(p, cell.c), name: many ? `c_${i + 1}` : 'c',
    sym: `${lo2}${shift('x', cell.c.re)}^2 + ${shift('y', cell.c.im)}^2 ${hiOp} ${n(cell.hi * cell.hi)}`,        // Cartesian inequality, symbols
    num: `${lo2}${n(D)} ${hiOp} ${n(cell.hi * cell.hi)}`,                                                        // ... with the probe's numbers
    psym: `${lo1}${rn} ${hiOp} ${n(cell.hi)}`,                                                                   // polar inequality, symbols
    pnum: `${lo1}${n(rho)} ${hiOp} ${n(cell.hi)}`,                                                               // ... with the probe's numbers
  };
}
const frags = (s) => s.set.cells.map((c, i) => ringFrag(c, s.p, i, s.set.cells.length > 1));
const verdict = (s) => T`\Rightarrow\ \text{${contains(s.set, s.p) ? 'in S' : 'not in S'}}`;
const nearestCell = (s) => (s.cls.edge ? s.cls.edge.cell : 0);               // the cell that owns the nearest edge
const gapTerms = (s) => {                                                     // |rho - r| for every edge of that cell (a puncture counts as r = 0)
  const ci = nearestCell(s), f = frags(s)[ci];
  return edgesOf(s.set).filter((e) => e.cell === ci).map((e) => T`|${n(f.rho)} - ${n(e.kind === 'point' ? 0 : e.r)}|`).join(T`,\ `);
};

const onRing = (fn) => (s) => (s.set.cells[0].kind === 'ring' ? fn(s) : null);        // a stale call with the other shape gets an empty cell
const onHalf = (fn) => (s) => (s.set.cells[0].kind === 'half' ? fn(s) : null);

function ringRows() {
  return [
    { id: 'where', label: 'where is p?',
      cart: onRing((s) => cart(T`p = ${fmtCart(s.p)}`)),
      polar: onRing((s) => polar(frags(s).map((f, i) => (f.rho < 1e-9
        ? T`\text{p is }${f.name}\text{: no direction}`
        : T`${f.name} = ${fmtCart(s.set.cells[i].c)}:\ p - ${f.name} = ${fmtCart(f.off)} = ${n(f.rho)}\,e^{i\varphi},\ \Arg(p - ${f.name}) = ${ang(Arg(f.off))}`)).join(T`;\ `))) },
    { id: 'test', label: 'is p in S?', native: 'polar',
      cart: onRing((s) => { const f = frags(s); return cart(`${f.map((x) => x.sym).join(OR)}:\\ ${f.map((x) => x.num).join(OR)}\\ ${verdict(s)}`); }),
      polar: onRing((s) => { const f = frags(s); return polar(`${f.map((x) => x.psym).join(OR)}:\\ ${f.map((x) => x.pnum).join(OR)}\\ ${verdict(s)}`); }) },
    { id: 'gap', label: 'room around p', native: 'polar',
      cart: onRing((s) => { const f = frags(s)[nearestCell(s)]; return cart(T`\rho = \sqrt{${n(f.D)}} = ${n(f.rho)};\ \varepsilon_{\max} = \min(${gapTerms(s)}) = ${fmtEps(s.cls.epsMax)}`); }),
      polar: onRing((s) => polar(T`\varepsilon_{\max} = \min(${gapTerms(s)}) = ${fmtEps(s.cls.epsMax)}`)) },
  ];
}

function halfRows() {
  return [
    { id: 'where', label: 'where is p?',
      cart: onHalf((s) => cart(T`p = ${fmtCart(s.p)}`)),
      polar: onHalf((s) => (Math.hypot(s.p.re, s.p.im) < 1e-9 ? polar(T`\text{p is the origin: no direction}`) : polar(T`r = ${n(Math.hypot(s.p.re, s.p.im))},\ \Arg p = ${ang(Arg(s.p))}`))) },
    { id: 'test', label: 'is p in S?', native: 'cart',
      cart: onHalf((s) => { const op = s.set.cells[0].strict ? '>' : '\\ge'; return cart(T`y ${op} 0:\ ${n(s.p.im)} ${op} 0\ ${verdict(s)}`); }),
      polar: onHalf((s) => {
        const op = s.set.cells[0].strict ? '>' : '\\ge', r = Math.hypot(s.p.re, s.p.im), th = Arg(s.p);
        return polar(T`r\sin\theta ${op} 0:\ ${n(r)}\sin(${n(th)}) = ${n(s.p.im)} ${op} 0\ ${verdict(s)}`);
      }) },
    { id: 'gap', label: 'room around p', native: 'cart',
      cart: onHalf((s) => cart(T`\varepsilon_{\max} = |y| = ${n(Math.abs(s.p.im))}`)),
      polar: onHalf((s) => { const r = Math.hypot(s.p.re, s.p.im), th = Arg(s.p); return polar(T`\varepsilon_{\max} = r\,|\sin\theta| = ${n(r)}\cdot|\sin(${n(th)})| = ${n(Math.abs(r * Math.sin(th)))}`); }) },
  ];
}

/** Explainer rows for the shape of the set (ring cells or the half plane); every cell function returns null for the other shape. */
export function rowsFor(set) { return set.cells[0].kind === 'ring' ? ringRows() : halfRows(); }

/**
 * The footer row: the room around p by the Cartesian route and by the polar route, with a real agree check. Both values are
 * cleaned of rounding noise first (a probe snapped onto an edge is 4.4e-16 from it, not 0, and the footer must say 0 as the
 * readout and the gap row do), and both must also match the classification the readout reports (cls.epsMax).
 */
export function explainerSame(s) {
  const clean = (x) => (Math.abs(x) < TOL ? 0 : x);
  let eC, eP;
  if (s.set.cells[0].kind === 'half') {
    const r = Math.hypot(s.p.re, s.p.im), th = Arg(s.p);
    eC = Math.abs(s.p.im);                                                    // |y|
    eP = Math.abs(r * Math.sin(th));                                          // r |sin theta|
  } else {
    const ci = nearestCell(s), f = frags(s)[ci];
    const radii = edgesOf(s.set).filter((e) => e.cell === ci).map((e) => (e.kind === 'point' ? 0 : e.r));
    eC = Math.min(...radii.map((r) => Math.abs(Math.sqrt(f.D) - r)));          // Cartesian route: sqrt(D) first
    eP = Math.min(...radii.map((r) => Math.abs(abs(f.off) - r)));              // polar route: rho is the modulus of p - c
  }
  eC = clean(eC); eP = clean(eP);
  const known = s.cls && Number.isFinite(s.cls.epsMax) ? clean(s.cls.epsMax) : eC;   // what the readout and the gap row say
  return { cart: cart(T`\varepsilon_{\max} = ${fmtEps(eC)}`), polar: polar(T`\varepsilon_{\max} = ${fmtEps(eP)}`), agree: close(eC, eP) && close(eC, known) };
}

// ---------------------------------------------------------------------------------------------------------------
// copy (2.5)
// ---------------------------------------------------------------------------------------------------------------

const LEDE = 'A set is understood one point at a time. Put a tiny disk around a point. All of the disk in S: interior point. None of it: exterior point. Every disk, however small, has both: boundary point. Open, closed, bounded, connected and domain are all sentences about those disks.';
const HINT = 'Drag the probe p, or tap anywhere to put it there. Change the disk radius ε. Drag p onto a circle: it snaps to the edge, and then no disk is small enough, however small you make it.';
const PRESET_LABEL = { annulus: 'Annulus (1.5.2)', closed: 'Closed annulus', punctured: 'Punctured disk', halfplane: 'Half plane', twodisks: 'Two disks' };
const CHIP_LABEL = { open: 'Open', closed: 'Closed', bounded: 'Bounded', connected: 'Connected', domain: 'Domain', region: 'Region' };
const BOX_LABELS = {
  annulus: ['Leave out the inner circle', 'Leave out the outer circle'],
  closed: ['Leave out the inner circle', 'Leave out the outer circle'],
  punctured: ['Leave out the centre point', 'Leave out the outer circle'],
  halfplane: [null, 'Leave out the edge line'],
  twodisks: [null, 'Leave out the circles'],
};
const KEY_ITEMS = [
  ['solid', 'Solid edge: the edge is in S.'],
  ['dashed', 'Dashed edge: the edge is not in S.'],
  ['in', 'Green disk: all of it is in S.'],
  ['out', 'Grey disk: none of it is in S.'],
  ['both', 'Amber ring, two tones: the edge of S runs through the disk.'],
];
const DISK_WORD = { in: 'all in S', out: 'none in S', both: 'in and out' };
const DISK_TOKEN = { in: '--ok', out: '--seam', both: '--warn' };

/** The #sets-probe-detail sentence (2.5.7). */
export function probeSentence({ set, p, eps, cls }) {
  const P = fmtCart(p), E = fmtEps(cls.epsMax), e = fmtNum(eps, 3), status = diskStatus(set, p, eps);
  if (cls.kind === 'boundary') {
    return `p = ${P} is on ${edgeText(cls.edge)}. Every disk around p, however small, contains points of S and points not in S. That is what a boundary point is. p itself ${cls.inS ? 'is in S' : 'is not in S'}.`;
  }
  if (cls.kind === 'interior') {
    const head = `p = ${P} is in S. The largest disk around it that stays inside S has radius ${E}.`;
    return status === 'in' ? `${head} Your disk (ε = ${e}) fits.` : `${head} Your disk (ε = ${e}) is too big: it sticks out of S. Make it no bigger than ${E} and it fits.`;
  }
  const head = `p = ${P} is not in S. The largest disk around it that misses S has radius ${E}.`;
  return status === 'out' ? `${head} Your disk (ε = ${e}) misses S.` : `${head} Your disk (ε = ${e}) is too big: it reaches S. Make it no bigger than ${E} and it misses.`;
}

// ---------------------------------------------------------------------------------------------------------------
// the CSS this station injects (tokens only)
// ---------------------------------------------------------------------------------------------------------------

const STYLE = `
.sets-layout{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));align-items:start}
.sets-layout>*{min-width:0}
.sets-side{display:flex;flex-direction:column;gap:var(--space-3)}
.sets-side>*{margin:0}
.sets-explainer h2,.sets-answers h2{margin-bottom:var(--space-2)}
.sets-problem{display:block}
.sets-problem details{margin-top:var(--space-2)}
.sets-problem summary{cursor:pointer}
.sets-answer-tex{white-space:normal;margin-top:var(--space-2)}
.sets-setline{font-size:1.05rem}
.sets-answer-list{display:grid;gap:var(--space-2);margin:0;padding:0;list-style:none}
.sets-answer-list li{display:grid;grid-template-columns:minmax(9rem,11rem) minmax(0,1fr);gap:var(--space-1) var(--space-3);align-items:start}
@media (max-width:36rem){.sets-answer-list li{grid-template-columns:minmax(0,1fr)}}
.sets-answer-list .chip{justify-self:start}
.sets-reason{color:var(--text);font-size:.97rem}
.sets-key{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));gap:var(--space-1) var(--space-3);margin:0;padding:0;list-style:none;font-size:.9rem}
.sets-sw{display:inline-block;width:1.6rem;height:.9rem;margin-right:.4rem;vertical-align:-.1em;box-sizing:border-box}
.sets-sw[data-k="solid"]{height:0;border-top:3px solid var(--polar)}
.sets-sw[data-k="dashed"]{height:0;border-top:3px dashed var(--polar)}
.sets-sw[data-k="in"]{border:2px solid var(--ok);border-radius:50%;width:.9rem}
.sets-sw[data-k="out"]{border:2px solid var(--seam);border-radius:50%;width:.9rem}
.sets-sw[data-k="both"]{border:3px solid var(--warn);border-radius:50%;width:.9rem;background:linear-gradient(90deg,var(--ok) 50%,var(--seam) 50%)}
.sets-noinner{font-size:.88rem}
`;

function ensureStyle() {
  if (document.head.querySelector('style[data-for="sets"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'sets');
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------------------------------------------
// label placement (pure geometry in canvas pixels, plus a thin wrapper over drawLabel)
// ---------------------------------------------------------------------------------------------------------------

// Liang-Barsky clipping, written without per-call arrays: the placer runs it thousands of times per frame.
let lbT0 = 0, lbT1 = 1;
function lbClip(p, q) {
  if (p === 0) return q >= 0;
  const r = q / p;
  if (p < 0) { if (r > lbT1) return false; if (r > lbT0) lbT0 = r; } else { if (r < lbT0) return false; if (r < lbT1) lbT1 = r; }
  return true;
}

/** Does the segment A-B (points {x, y}) pass through the box {x0, y0, x1, y1}? */
export function segmentHitsBox(A, B, box) {
  if (Math.max(A.x, B.x) < box.x0 || Math.min(A.x, B.x) > box.x1 || Math.max(A.y, B.y) < box.y0 || Math.min(A.y, B.y) > box.y1) return false;   // bounding boxes apart
  lbT0 = 0; lbT1 = 1;
  const dx = B.x - A.x, dy = B.y - A.y;
  return lbClip(-dx, A.x - box.x0) && lbClip(dx, box.x1 - A.x) && lbClip(-dy, A.y - box.y0) && lbClip(dy, box.y1 - A.y);
}
const boxesHit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const growBox = (b, d) => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });

const widthCache = new Map();                                              // `${font}|${text}` -> measured px: most words repeat from frame to frame
function textWidth(ctx2, font, text) {
  const k = `${font}|${text}`;
  let v = widthCache.get(k);
  if (v === undefined) {
    ctx2.save(); ctx2.font = font; v = ctx2.measureText(text).width; ctx2.restore();
    if (widthCache.size > 500) widthCache.clear();
    widthCache.set(k, v);
  }
  return v;
}

let famCache = '';
/** The font drawLabel draws with (the site font token at 12 px on a narrow plane, else 13 px); the placer measures with this very string. */
function labelFontCss(w) {
  if (!famCache) {                                                          // the token never changes while the page lives, so read it once
    try { famCache = getComputedStyle(document.documentElement).getPropertyValue('--font').trim(); } catch (e) { /* no DOM: the fallback below */ }
  }
  return `${w < 420 ? 12 : 13}px ${famCache || 'system-ui, sans-serif'}`;
}

/** Where the plane's own tick numbers sit (mirrors plane.js paintAxes), as boxes a word should not be printed over. */
let tickCache = null;
function tickBoxes(pl) {                                                      // { boxes, row, col }: depends on the view and the size only, so a drag reuses it
  const v = pl.getView(), { w, h: hh } = pl.getSize(), key = `${v.center.re},${v.center.im},${v.unitsAcross},${w},${hh}`;
  if (tickCache && tickCache.key === key) return tickCache;
  const boxes = [], O = pl.toPixel({ re: 0, im: 0 }), step = niceGridStep(v.unitsAcross), sp = step * v.scale;
  const rowY = Math.min(Math.max(O.y + 14, 12), hh - 4), colX = Math.min(Math.max(O.x - 6, 28), w - 4);
  tickCache = { key, boxes, row: { x0: -1e9, x1: 1e9, y0: rowY - 10, y1: rowY + 17 }, col: { x0: colX - 60, x1: colX, y0: -1e9, y1: 1e9 } };   // the strips the numbers sit in
  if (!(sp > 0)) return tickCache;
  const lo = pl.fromPixel(0, hh), hi = pl.fromPixel(w, 0), every = sp >= 38 ? 1 : sp >= 19 ? 2 : 5;
  const digits = Math.min(6, Math.max(0, -Math.floor(Math.log10(step) + 1e-9))), len = (k) => String(Number((k * step).toFixed(digits))).length * 6.4 + 4;
  for (let k = Math.ceil(lo.re / step - 1e-9); k <= Math.floor(hi.re / step + 1e-9); k++) {
    if (k === 0 || k % every) continue;
    const x = pl.toPixel({ re: k * step, im: 0 }).x;
    if (x >= 12 && x <= w - 12) boxes.push({ x0: x - len(k) / 2, y0: rowY - 10, x1: x + len(k) / 2, y1: rowY + 3 });
  }
  for (let k = Math.ceil(lo.im / step - 1e-9); k <= Math.floor(hi.im / step + 1e-9); k++) {
    if (k === 0 || k % every) continue;
    const y = pl.toPixel({ re: 0, im: k * step }).y;
    if (Math.abs(y - rowY) >= 8 && y >= 8 && y <= hh - 8) boxes.push({ x0: colX - len(k), y0: y - 7, x1: colX, y1: y + 7 });
  }
  boxes.push({ x0: O.x - 16, y0: O.y + 4, x1: O.x - 6, y1: O.y + 17 });                      // the 0 at the origin
  return tickCache;
}

/**
 * A label placer for one frame. `boxes` are rectangles to keep clear of (the probe, the zoom buttons), `segs` are drawn lines
 * ({ A, B } in pixels). put(text, cands, style, { optional }) takes the first candidate { z, dx, dy, align } whose text box is
 * inside the canvas (the same margins plane.js clamps to, so drawLabel never has to move it) and touches no box, no line and no
 * earlier label (each kept 2 px apart). When none is free it takes the least bad one, or, for an `optional` word, draws nothing
 * and returns false: a secondary word that cannot be placed cleanly is better left to the readout than struck through.
 */
export function makePlacer(ctx2, pl, { boxes = [], segs = [] } = {}) {
  const { w, h: hh } = pl.getSize(), fs = w < 420 ? 12 : 13, font = labelFontCss(w), taken = [...boxes], T = tickBoxes(pl);
  for (const sg of segs) if (sg.x0 === undefined) { sg.x0 = Math.min(sg.A.x, sg.B.x); sg.x1 = Math.max(sg.A.x, sg.B.x); sg.y0 = Math.min(sg.A.y, sg.B.y); sg.y1 = Math.max(sg.A.y, sg.B.y); }   // each line's own box, once
  return function put(text, cands, style, { optional = false, maxCost = optional ? 0 : Infinity } = {}) {
    const wd = textWidth(ctx2, font, text) + 2;
    let best = null;
    for (const c of cands) {
      const P = pl.toPixel(c.z), x = P.x + c.dx, y = P.y + c.dy;
      const x0 = c.align === 'left' ? x : c.align === 'right' ? x - wd : x - wd / 2;
      const box = { x0: x0 - 2, y0: y - fs, x1: x0 + wd + 2, y1: y + 4 };
      const lim = best ? best.cost : Infinity;                                  // a candidate that cannot beat the best so far is dropped as soon as it cannot
      let cost = 0;
      if (x0 < 4 || x0 + wd - 2 > w - 4 || y < 14 || y > hh - 4) cost += 20;
      for (let i = 0; i < taken.length && cost < lim; i++) if (boxesHit(box, taken[i])) cost += 4;
      if (cost < lim && (boxesHit(box, T.row) || boxesHit(box, T.col))) for (let i = 0; i < T.boxes.length && cost < lim; i++) if (boxesHit(box, T.boxes[i])) cost += 2;
      for (let i = 0; i < segs.length && cost < lim; i++) {
        const sg = segs[i];
        if (sg.x1 >= box.x0 && sg.x0 <= box.x1 && sg.y1 >= box.y0 && sg.y0 <= box.y1 && segmentHitsBox(sg.A, sg.B, box)) cost += 1;
      }
      if (cost < lim) best = { c, box, cost };
      if (cost === 0) break;
    }
    if (!best || best.cost > maxCost) return false;
    taken.push(growBox(best.box, 2));
    drawLabel(ctx2, pl, best.c.z, text, { ...style, font, dx: best.c.dx, dy: best.c.dy, align: best.c.align });
    return true;
  };
}

/** Candidate spots beside the segment a -> b: five places along it, both sides, two distances and then a far one; the first side is along `prefer` (a screen direction). */
export function sideCands(pl, a, b, prefer) {
  const fs = pl.getSize().w < 420 ? 12 : 13, A = pl.toPixel(a), B = pl.toPixel(b), len = Math.hypot(B.x - A.x, B.y - A.y);
  if (len < 1) return around(a, [[10, 18, 'left'], [10, -8, 'left'], [-10, 18, 'right'], [26, 28, 'left'], [-26, 28, 'right'], [0, 38, 'center'], [0, -34, 'center'], [38, 4, 'left'], [-38, 4, 'right']]);   // a zero-length segment: spots around its point
  let nrm = { x: -(B.y - A.y) / len, y: (B.x - A.x) / len };
  if (prefer && nrm.x * prefer.x + nrm.y * prefer.y < 0) nrm = { x: -nrm.x, y: -nrm.y };
  const out = [];
  for (const offs of [[12, 24], [40]]) for (const side of [1, -1]) for (const t of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const off of offs) {   // the far spots (40 px) only after every near one
    const nx = side * nrm.x, ny = side * nrm.y;
    out.push({ z: C(a.re + t * (b.re - a.re), a.im + t * (b.im - a.im)), dx: off * nx, dy: off * ny + 0.35 * fs, align: nx > 0.35 ? 'left' : nx < -0.35 ? 'right' : 'center' });
  }
  return out;
}
const around = (z, list) => list.map(([dx, dy, align]) => ({ z, dx, dy, align }));       // candidates around one point
/** Spots on a ring of radius R (pixels) around z, nearest the screen directions listed first: for a word that must sit outside a disk. */
const ringSpots = (z, R) => around(z, [[1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]].map(([ux, uy]) => {
  const L = Math.hypot(ux, uy), x = R * ux / L, y = R * uy / L;
  return [x, y + (uy > 0 ? 12 : 4), ux > 0.2 ? 'left' : ux < -0.2 ? 'right' : 'center'];
}));

// ---------------------------------------------------------------------------------------------------------------
// 4.3 header and links
// ---------------------------------------------------------------------------------------------------------------

function buildHeader(ctx, lede) {
  const header = h('header', { class: 'station-header' });
  header.append(h('h1', { text: ctx.station.title }), h('p', { class: 'station-lede', text: lede }));
  const ul = h('ul', { class: 'thread-badges' });
  for (const id of ctx.station.threads || []) {
    const t = (ctx.threads || []).find((x) => x.id === id);
    if (!t) continue;
    ul.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': id, title: t.summary, text: `${id} ${t.title}` })));
  }
  header.append(ul);
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Problems in this station' });
  for (const p of problemsForStation(ctx.station.id)) {
    chips.append(h('a', { class: 'chip problem-chip', href: '#' + routeFor(p.id), title: p.aha, text: p.id }));
  }
  header.append(chips);
  return header;
}

function buildLinks(ctx, extras) {
  const nav = h('nav', { class: 'station-links', 'aria-label': 'Where next' });
  const list = [...(ctx.stations || [])].sort((a, b) => a.order - b.order);
  const me = ctx.station, i = list.findIndex((s) => s.id === me.id);
  const shown = new Set([me.id]);
  const link = (st, attrs) => { shown.add(st.id); nav.append(h('a', { class: 'station-link', href: '#' + st.id, text: st.title, ...attrs })); };
  if (i > 0) link(list[i - 1], { 'data-dir': 'prev' });
  if (i >= 0 && i < list.length - 1) link(list[i + 1], { 'data-dir': 'next' });
  for (const t of me.threads || []) {
    const mine = list.filter((s) => (s.threads || []).includes(t));
    const j = mine.findIndex((s) => s.id === me.id);
    for (const st of [mine[j - 1], mine[j + 1]]) if (st && !shown.has(st.id)) link(st, { 'data-thread': t });
  }
  for (const x of extras || []) nav.append(h('a', { class: 'station-link', href: x.href, text: x.text }));
  return nav;
}

// ---------------------------------------------------------------------------------------------------------------
// the station
// ---------------------------------------------------------------------------------------------------------------

export function mount(el, ctx) {
  ensureStyle();
  const cleanups = [];
  const listen = (target, type, fn) => { target.addEventListener(type, fn); cleanups.push(() => target.removeEventListener(type, fn)); };

  // ---- state (5.11 step 1)
  const { id: startId } = presetFromContext(ctx.preset);
  const state = { presetId: startId, flags: defaultFlags(startId), set: null, an: null, p: C(2, 0), eps: 0.5, snap: true, chip: null, cls: null };
  state.set = buildSet(state.presetId, state.flags);
  state.an = analyse(state.set);
  state.cls = classifyPoint(state.set, state.p);

  // ---- DOM
  const header = buildHeader(ctx, LEDE);
  const problemBox = h('div', { id: 'sets-problem', class: 'callout sets-problem', 'data-tone': 'polar' });
  const presetBox = h('div', { id: 'sets-presets', class: 'chips', role: 'group', 'aria-label': 'Which set' });
  const presetEls = {};
  for (const id of PRESET_IDS) {
    presetEls[id] = h('button', { id: `sets-preset-${id}`, class: 'chip', type: 'button', 'aria-pressed': 'false', text: PRESET_LABEL[id] });
    presetBox.append(presetEls[id]);
  }
  const setline = h('div', { id: 'sets-setline', class: 'tex-scroll sets-setline' });
  const planeHost = h('div', { id: 'sets-plane-host' });
  const readout = h('div', { id: 'sets-readout', class: 'readout' });
  const detail = h('p', { id: 'sets-probe-detail' });
  const epsInput = h('input', { type: 'range', id: 'sets-eps', min: '0.05', max: '2', step: '0.05', value: '0.5' });
  const epsOut = h('output', { id: 'sets-eps-value', for: 'sets-eps', text: '0.5' });
  const sliderRow = h('div', { class: 'slider-row', 'data-tone': 'polar' }, [h('label', { for: 'sets-eps', text: 'Disk radius ε' }), epsInput, epsOut]);
  const snapBox = h('input', { type: 'checkbox', id: 'sets-snap' }); snapBox.checked = true;
  const innerBox = h('input', { type: 'checkbox', id: 'sets-inner-strict' });
  const outerBox = h('input', { type: 'checkbox', id: 'sets-outer-strict' });
  const innerLabel = h('span', { id: 'sets-inner-strict-label' });
  const outerLabel = h('span', { id: 'sets-outer-strict-label' });
  const boundary = h('p', { id: 'sets-boundary' });
  const key = h('div', { id: 'sets-key' }, [h('ul', { class: 'sets-key' }, KEY_ITEMS.map(([k, t]) => h('li', null, [h('span', { class: 'sets-sw', 'data-k': k }), t])))]);
  const hint = h('p', { id: 'sets-hint', class: 'muted', text: HINT });
  const side = h('div', { class: 'sets-side' }, [
    readout, detail, hint, sliderRow,
    h('label', { class: 'check', for: 'sets-snap' }, [snapBox, h('span', { text: 'Snap the probe onto an edge when it is close' })]),
    h('label', { class: 'check', for: 'sets-inner-strict' }, [innerBox, innerLabel]),
    h('label', { class: 'check', for: 'sets-outer-strict' }, [outerBox, outerLabel]),
    boundary, key,
  ]);
  const layout = h('div', { class: 'sets-layout' }, [planeHost, side]);

  const chipEls = {}, reasonEls = {}, answerList = h('ul', { class: 'sets-answer-list' });
  for (const id of CHIP_IDS) {
    reasonEls[id] = h('span', { id: `sets-${id}-reason`, class: 'sets-reason' });
    chipEls[id] = h('button', { id: `sets-${id}`, class: 'chip', type: 'button', 'aria-pressed': 'false', 'aria-describedby': `sets-${id}-reason` });
    answerList.append(h('li', null, [chipEls[id], reasonEls[id]]));
  }
  const answers = h('section', { id: 'sets-answers', class: 'sets-answers', 'aria-labelledby': 'sets-answers-title' }, [
    h('h2', { id: 'sets-answers-title', text: 'Answers for this set' }),
    h('p', { class: 'muted', text: 'These are worked out from the set on the plane. Try them yourself first, then click an answer to see which edges decide it.' }),
    answerList,
  ]);
  const exHost = h('div', { id: 'sets-ex-host' });
  const explainerBox = h('section', { class: 'sets-explainer', 'aria-labelledby': 'sets-ex-title' }, [h('h2', { id: 'sets-ex-title', text: 'Where is p, and is it in S?' }), exHost]);
  const why = h('div', { id: 'sets-why', class: 'callout', 'data-tone': 'polar' });
  const status = h('div', { id: 'sets-status', class: 'sr-only', 'aria-live': 'polite' });
  const links = buildLinks(ctx, [
    { href: '#distance-circle', text: 'The circle again: |z − a| = R' },
    { href: '#limits', text: 'The same tiny disks come back as epsilon and delta' },
  ]);
  el.append(header, problemBox, presetBox, setline, layout, answers, explainerBox, why, links, status);

  // ---- plane, probe, layers
  const plane = createPlane(planeHost, {
    id: 'sets-plane', xRange: [...VIEW.xRange], yRange: [...VIEW.yRange], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'],
    maxWidth: 560, wheel: 'focus', ariaLabel: 'Complex plane with a set and a probe point',
  });

  function applyProbe(z, info) {                                              // info: { final, source: 'pointer' | 'keyboard' | 'tap' | 'api' }
    if ((info.source === 'pointer' || info.source === 'tap') && state.snap) {
      const q = snapToEdge(state.set, z, SNAP_PX / plane.getView().scale);
      if (q) z = q;
    }
    if (z.re !== hp.z.re || z.im !== hp.z.im) hp.set(z, { silent: true });
    state.p = { re: z.re, im: z.im };
    recompute({ set: false });
    if (info.final) status.textContent = readout.textContent + '. ' + detail.textContent;
  }
  function onProbe(z, info) { applyProbe(z, info); }                         // a declaration, so it exists when addPoint({ onDrag: onProbe }) runs
  const hp = plane.addPoint({ id: 'p', z: state.p, color: '--input', label: 'p', name: 'probe p', step: 0.05, onDrag: onProbe });

  function visibleRect() {                                                    // the canvas rectangle in plane coordinates, grown by 20 px
    const { w, h: hh } = plane.getSize(), m = 20;
    return [plane.fromPixel(-m, -m), plane.fromPixel(w + m, -m), plane.fromPixel(w + m, hh + m), plane.fromPixel(-m, hh + m)];
  }
  function clipRectHalf(rect, q0, nrm) {                                      // Sutherland-Hodgman against one half plane (z - q0) . nrm >= 0
    const side2 = (z) => (z.re - q0.re) * nrm.re + (z.im - q0.im) * nrm.im, out = [];
    for (let i = 0; i < 4; i++) {
      const A = rect[i], B = rect[(i + 1) % 4], sa = side2(A), sb = side2(B);
      if (sa >= 0) out.push(A);
      if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push({ re: A.re + t * (B.re - A.re), im: A.im + t * (B.im - A.im) }); }
    }
    return out;
  }

  // an edge as a stroke; shared by the highlight and the edges layers (drawSegment has no alpha)
  function strokeEdge(ctx2, pl, e, { color, width, alpha = 1, dash = null }) {
    if (e.kind === 'circle') { drawCircle(ctx2, pl, e.c, e.r, { color, width, alpha, dash }); return; }
    ctx2.save();
    ctx2.globalAlpha = alpha; ctx2.lineWidth = width; ctx2.strokeStyle = cssColor(color); ctx2.setLineDash(dash ? Array.from(dash) : []); ctx2.lineCap = 'butt';
    if (e.kind === 'line') {
      const v = pl.getView(), L = 4 * v.unitsAcross;
      const t0 = (v.center.re - e.point.re) * e.dir.re + (v.center.im - e.point.im) * e.dir.im;          // foot of the view centre on the line
      const base = add(e.point, scale(e.dir, t0));
      const A = pl.toPixel(add(base, scale(e.dir, L))), B = pl.toPixel(add(base, scale(e.dir, -L)));
      ctx2.beginPath(); ctx2.moveTo(A.x, A.y); ctx2.lineTo(B.x, B.y); ctx2.stroke();
    } else {
      const P = pl.toPixel(e.c);
      ctx2.beginPath(); ctx2.arc(P.x, P.y, 9, 0, 2 * Math.PI); ctx2.stroke();
    }
    ctx2.restore();
  }

  function regionPath(pl, sc) {                                               // S as a Path2D in pixels; even-odd gives rings; cells are disjoint so the union is right
    const path = new Path2D();
    for (const cell of state.set.cells) {
      if (cell.kind === 'ring') {
        const C0 = pl.toPixel(cell.c), ro = cell.hi * sc, ri = cell.lo * sc;
        path.moveTo(C0.x + ro, C0.y); path.arc(C0.x, C0.y, ro, 0, 2 * Math.PI);
        if (cell.lo > 0) { path.moveTo(C0.x + ri, C0.y); path.arc(C0.x, C0.y, ri, 0, 2 * Math.PI); }
      } else {
        clipRectHalf(visibleRect(), cell.point, cell.normal).forEach((z, i) => { const q = pl.toPixel(z); if (i) path.lineTo(q.x, q.y); else path.moveTo(q.x, q.y); });
        path.closePath();
      }
    }
    return path;
  }
  function complementPath(pl, sc) { const { w, h: hh } = pl.getSize(), path = new Path2D(); path.rect(-10, -10, w + 20, hh + 20); path.addPath(regionPath(pl, sc)); return path; }
  function fillDisk(ctx2, P, R, token, alpha) { ctx2.globalAlpha = alpha; ctx2.fillStyle = cssColor(token); ctx2.beginPath(); ctx2.arc(P.x, P.y, R, 0, 2 * Math.PI); ctx2.fill(); }
  function ringDisk(ctx2, P, R, token, width) { ctx2.globalAlpha = 1; ctx2.lineWidth = width; ctx2.strokeStyle = cssColor(token); ctx2.setLineDash([]); ctx2.beginPath(); ctx2.arc(P.x, P.y, R, 0, 2 * Math.PI); ctx2.stroke(); }

  // 10: S shaded
  plane.addLayer((ctx2, pl) => {
    for (const cell of state.set.cells) {
      if (cell.kind === 'ring') {
        drawCircle(ctx2, pl, cell.c, cell.hi, { color: '--polar', fill: true, fillAlpha: 0.16, innerRadius: cell.lo > 0 ? cell.lo : null, alpha: 0 });
      } else {
        drawPolygonFill(ctx2, pl, clipRectHalf(visibleRect(), cell.point, cell.normal), { color: '--polar', alpha: 0.16 });
      }
    }
  }, { order: 10 });

  // 20: the highlight of the selected chip
  plane.addLayer((ctx2, pl) => {
    const an = state.an, c = state.chip;
    const es = c === 'open' || c === 'domain' ? an.included : c === 'closed' ? an.excluded : [];
    for (const e of es) strokeEdge(ctx2, pl, e, { color: '--warn', width: e.kind === 'point' ? 5 : 8, alpha: 0.30 });
  }, { order: 20 });

  // 30: the bounding disk
  plane.addLayer((ctx2, pl) => {
    const an = state.an;
    if (state.chip !== 'bounded' || !an.bounded) return;
    drawCircle(ctx2, pl, C(0, 0), an.boundingRadius, { color: '--seam', dash: DASH.guide, width: 2 });
    drawLabel(ctx2, pl, fromPolar(an.boundingRadius, 3 * Math.PI / 4), '|z| ≤ ' + fmtNum(an.boundingRadius), { color: '--seam', dx: -6, dy: -6, align: 'right' });
  }, { order: 30 });

  // 40: every edge, solid when in S and dashed when not
  plane.addLayer((ctx2, pl) => {
    const sc = pl.getView().scale;
    for (const e of state.an.edges) {
      if (e.kind === 'point') drawCircle(ctx2, pl, e.c, 5 / sc, { color: '--polar', width: 2.5, fill: e.included ? '--polar' : '--surface', fillAlpha: 1 });
      else strokeEdge(ctx2, pl, e, { color: '--polar', width: 2.5, dash: e.included ? null : DASH.excluded });
    }
  }, { order: 40 });

  // 50: the radius ray and the centre marker (ring sets), or the drop line (half plane); their words are placed in layer 60
  const nearestCentre = () => {
    let ci = 0, best = Infinity;
    state.set.cells.forEach((cell, i) => { const d = Math.hypot(state.p.re - cell.c.re, state.p.im - cell.c.im); if (d < best - 1e-12) { best = d; ci = i; } });
    return state.set.cells[ci].c;
  };
  plane.addLayer((ctx2, pl) => {
    const sc = pl.getView().scale, p = state.p, set = state.set;
    if (set.cells[0].kind === 'ring') {
      const c = nearestCentre(), rho = abs(sub(p, c));
      if (rho * sc >= 8) drawSegment(ctx2, pl, c, p, { color: '--polar', width: 1.5 });
      const P0 = pl.toPixel(c);
      ctx2.save(); ctx2.strokeStyle = cssColor('--polar'); ctx2.lineWidth = 2; ctx2.setLineDash([]); ctx2.globalAlpha = 1;
      ctx2.beginPath(); ctx2.moveTo(P0.x - 5, P0.y); ctx2.lineTo(P0.x + 5, P0.y); ctx2.moveTo(P0.x, P0.y - 5); ctx2.lineTo(P0.x, P0.y + 5); ctx2.stroke(); ctx2.restore();
    } else if (Math.abs(p.im) * sc >= 10) {
      drawSegment(ctx2, pl, p, C(p.re, 0), { color: '--cart', dash: DASH.cart, width: 1.5 });
    }
  }, { order: 50 });

  // the drawn edges as pixel polylines, so a label can keep off them (a circle is 48 chords, a line one long chord).
  // They depend on the set and the view only, so a drag (probe moves, view stays) reuses them.
  let segCache = null;
  function edgeSegs(pl) {
    const v = pl.getView(), { w, h: hh } = pl.getSize(), key = `${v.center.re},${v.center.im},${v.unitsAcross},${w},${hh}`;
    if (segCache && segCache.an === state.an && segCache.key === key) return segCache.segs;
    const out = [];
    for (const e of state.an.edges) {
      if (e.kind === 'circle') {
        for (let i = 0; i < 48; i++) {
          const a0 = 2 * Math.PI * i / 48, a1 = 2 * Math.PI * (i + 1) / 48;
          out.push({ A: pl.toPixel(add(e.c, fromPolar(e.r, a0))), B: pl.toPixel(add(e.c, fromPolar(e.r, a1))) });
        }
      } else if (e.kind === 'line') {
        const L = 4 * v.unitsAcross;
        out.push({ A: pl.toPixel(add(e.point, scale(e.dir, L))), B: pl.toPixel(add(e.point, scale(e.dir, -L))) });
      }
    }
    segCache = { an: state.an, key, segs: out };
    return out;
  }

  // 60: the epsilon-disk, then every word near the probe (the disk word, rho, the centre, y), each in the first free spot
  plane.addLayer((ctx2, pl) => {
    const sc = pl.getView().scale, set = state.set, p = state.p, status2 = diskStatus(set, p, state.eps);
    const P = pl.toPixel(p), Rpx = state.eps * sc, { w } = pl.getSize();
    ctx2.save();
    if (status2 === 'in') { fillDisk(ctx2, P, Rpx, '--ok', 0.28); ringDisk(ctx2, P, Rpx, '--ok', 2); }
    else if (status2 === 'out') { fillDisk(ctx2, P, Rpx, '--seam', 0.22); ringDisk(ctx2, P, Rpx, '--seam', 2); }
    else {
      ctx2.save(); ctx2.clip(regionPath(pl, sc), 'evenodd'); fillDisk(ctx2, P, Rpx, '--ok', 0.32); ctx2.restore();
      ctx2.save(); ctx2.clip(complementPath(pl, sc), 'evenodd'); fillDisk(ctx2, P, Rpx, '--seam', 0.30); ctx2.restore();
      ringDisk(ctx2, P, Rpx, '--warn', 3);
    }
    ctx2.restore();

    const isRing = set.cells[0].kind === 'ring', c = isRing ? nearestCentre() : null, rho = isRing ? abs(sub(p, c)) : 0;
    const segs = edgeSegs(pl).slice();
    if (isRing && rho * sc >= 8) segs.push({ A: pl.toPixel(c), B: P });
    else if (!isRing && Math.abs(p.im) * sc >= 10) segs.push({ A: P, B: pl.toPixel(C(p.re, 0)) });
    const put = makePlacer(ctx2, pl, { boxes: [{ x0: w - 72, x1: w, y0: 0, y1: 124 }, { x0: P.x - 13, x1: P.x + 24, y0: P.y - 24, y1: P.y + 13 }], segs });
    const k = 0.72 * Rpx + 8, far = Math.max(k, 30);
    put(DISK_WORD[status2], around(p, [[k, -k, 'left'], [-k, -k, 'right'], [k, k + 12, 'left'], [-k, k + 12, 'right'], [far, -10, 'left'], [-far, -10, 'right'], [0, -Rpx - 8, 'center'], [0, Rpx + 18, 'center']]), { color: DISK_TOKEN[status2] });
    if (isRing) {
      const cPx = pl.toPixel(c);
      if (rho * sc >= 12) {                                                     // a radius under 12 px is not worth a word: the probe sentence says it
        const A = cPx, L = Math.hypot(P.x - A.x, P.y - A.y) || 1;
        put('ρ = ' + fmtNum(rho), sideCands(pl, c, p, { x: -(P.y - A.y) / L, y: (P.x - A.x) / L }), { color: '--polar' }, { optional: true });
      }
      // the centre's word: beside the centre, or, when the probe disk sits on the centre, just outside that disk
      const inDisk = Math.hypot(cPx.x - P.x, cPx.y - P.y) < Rpx + 4;
      put('c = ' + fmtCart(c), inDisk ? ringSpots(p, Rpx + 8) : [...around(c, [[8, 18, 'left'], [-8, 18, 'right'], [8, -8, 'left'], [-8, -8, 'right']]), ...ringSpots(c, 26)], { color: '--polar' }, { maxCost: inDisk ? 3 : Infinity });
    } else if (Math.abs(p.im) * sc >= 10) {
      put('y = ' + fmtNum(p.im), sideCands(pl, p, C(p.re, 0), { x: 1, y: 0 }), { color: '--cart' }, { optional: true });
    }
  }, { order: 60 });

  // 70: piece labels, each in the first free spot of its piece (clear of the probe, its disk and the edges)
  plane.addLayer((ctx2, pl) => {
    if (!['connected', 'domain', 'region'].includes(state.chip)) return;
    const an = state.an, sc = pl.getView().scale, { w } = pl.getSize(), P = pl.toPixel(state.p), R = state.eps * sc + 4;
    const put = makePlacer(ctx2, pl, { boxes: [{ x0: w - 72, x1: w, y0: 0, y1: 124 }, { x0: P.x - R, x1: P.x + R, y0: P.y - R - 12, y1: P.y + R }], segs: edgeSegs(pl) });
    state.set.cells.forEach((cell, i) => {
      const spots = cell.kind === 'ring'
        ? [3, 5, 2, 4, 7, 1, 6, 0].map((k) => add(cell.c, fromPolar(cell.lo > 0 ? (cell.lo + cell.hi) / 2 : cell.hi / 2, k * Math.PI / 4)))
        : [[2.5, 2.5], [1.2, 3.5], [3.8, 1.5], [3.8, 3.5], [3.8, -1], [2.5, -3.2]].map(([a, b]) => add(cell.point, add(scale(cell.normal, a), scale(C(-cell.normal.im, cell.normal.re), b))));
      put(an.pieces === 1 ? 'one piece' : 'piece ' + (i + 1), spots.map((z) => ({ z, dx: 0, dy: 4, align: 'center' })), { color: '--text' });
    });
  }, { order: 70 });

  // ---- explainer
  const explainer = createExplainer(exHost, {
    id: 'sets-ex',
    columns: [{ key: 'cart', heading: 'Cartesian (x, y)', tone: '--cart' }, { key: 'polar', heading: 'Polar (distance ρ from the centre)', tone: '--polar' }],
    rows: rowsFor(state.set), same: explainerSame,
  });

  // ---- 5.11 the pipeline
  function updateSetline() {
    const d = describeSet(state.set);
    setline.dataset.text = d.ascii;
    tex(setline, T`S = \{\, z \in \mathbb{C} : ${d.tex} \,\}`);
  }
  function updateChips() {
    const rs = reasons(state.set, state.an);
    for (const id of CHIP_IDS) {
      const yes = !!state.an[id];
      chipEls[id].dataset.answer = yes ? 'yes' : 'no';
      setText(chipEls[id], `${CHIP_LABEL[id]}? ${yes ? 'yes' : 'no'}`);
      setText(reasonEls[id], rs[id]);
      chipEls[id].setAttribute('aria-pressed', String(state.chip === id));
    }
  }
  function updateBoundary() { setText(boundary, boundaryText(state.set)); }
  function updateCheckboxes() {
    const [li, lo] = BOX_LABELS[state.presetId] || BOX_LABELS.annulus;
    const innerOff = li == null || !state.set.innerApplies;
    innerBox.checked = innerOff ? false : state.flags.innerStrict;
    innerBox.disabled = innerOff;
    if (innerOff) innerBox.setAttribute('aria-disabled', 'true'); else innerBox.removeAttribute('aria-disabled');
    setText(innerLabel, innerOff ? 'No inner edge in this set' : li);
    outerBox.checked = state.flags.outerStrict;
    setText(outerLabel, lo);
  }
  function updatePresetPressed() {
    for (const id of PRESET_IDS) presetEls[id].setAttribute('aria-pressed', String(sameSet(state.set, buildSet(id))));
  }
  function renderProblem() {
    problemBox.replaceChildren();
    try {
      const p = problemById('1.5.2');
      if (!p) return;
      if (!sameSet(state.set, buildSet('annulus'))) {                         // the student changed the set: say so, show no handout statement
        problemBox.dataset.tone = 'accent';
        problemBox.append(h('span', { class: 'badge', 'data-tone': 'accent', text: 'Your set' }), ' You changed the set. The six answers below follow your set, not the handout\'s.');
        return;
      }
      problemBox.dataset.tone = 'polar';
      const stmt = h('span');
      for (const part of statementParts(p.statement)) { if (part.math) { const m = h('span'); tex(m, part.text); stmt.append(m); } else stmt.append(part.text); }
      const eq = h('div', { class: 'tex-scroll sets-answer-tex' }); tex(eq, wrapAnswerTex(p.answer.tex));           // inline mode: KaTeX may break the line, display mode never does
      if (eq.classList.contains('tex-error')) eq.hidden = true;                 // no KaTeX: the plain line below carries the answer
      problemBox.append(h('span', { class: 'badge', 'data-tone': 'polar', text: 'Problem 1.5.2' }), ' ', stmt,
        h('details', { id: 'sets-answer' }, [h('summary', { text: 'Show the answer' }), eq, h('p', { class: 'muted mono', text: p.answer.text })]));
    } catch (e) { problemBox.replaceChildren(); }
  }
  function renderWhy() {
    const isHalf = state.set.cells[0].kind === 'half', tone = isHalf ? 'cart' : 'polar', p = problemById('1.5.2');
    why.replaceChildren(); why.dataset.tone = tone;
    const body = h('span');
    if (isHalf) body.textContent = 'Im z > 0 is one condition on y, so Cartesian is the easy address here. Polar about any centre would be the long way round.';
    else if (p) prose(body, p.addressWhy);
    why.append(h('span', { class: 'badge', 'data-tone': tone, text: isHalf ? 'easy in Cartesian' : 'easy in Polar' }), ' ', body, isHalf ? '' : ' Try the half plane: there the roles swap.');
  }

  // the order matters: the explainer rows read state.cls, so it is computed before anything renders
  function recompute({ set }) {
    if (set) state.an = analyse(state.set);
    state.cls = classifyPoint(state.set, state.p);
    if (set) {
      updateSetline(); updateChips(); updateBoundary(); updateCheckboxes(); updatePresetPressed(); renderProblem(); renderWhy();
      explainer.update(state);
      explainer.setRows(rowsFor(state.set));
    }
    setText(readout, 'probe: ' + state.cls.kind + '; eps = ' + fmtNum(state.eps, 3));
    readout.dataset.kind = state.cls.kind;
    setText(detail, probeSentence(state));
    explainer.update(state);
    plane.requestDraw();
  }

  function loadPreset(id) {
    state.presetId = id;
    state.flags = defaultFlags(id);
    state.set = buildSet(id, state.flags);
    recompute({ set: true });
    status.textContent = `${PRESET_LABEL[id]}. ${describeSet(state.set).ascii}. ${readout.textContent}`;
  }
  function onStrict() {
    state.flags.innerStrict = innerBox.disabled ? state.flags.innerStrict : innerBox.checked;
    state.flags.outerStrict = outerBox.checked;
    state.set = buildSet(state.presetId, state.flags);
    recompute({ set: true });
    status.textContent = `${describeSet(state.set).ascii}. ${readout.textContent}`;
  }

  for (const id of PRESET_IDS) listen(presetEls[id], 'click', () => loadPreset(id));
  listen(innerBox, 'change', onStrict);
  listen(outerBox, 'change', onStrict);
  listen(snapBox, 'change', () => { state.snap = snapBox.checked; });
  listen(epsInput, 'input', () => {
    state.eps = Number(epsInput.value);
    setText(epsOut, fmtNum(state.eps, 3));
    recompute({ set: false });
  });
  for (const id of CHIP_IDS) {
    listen(chipEls[id], 'click', () => {
      state.chip = state.chip === id ? null : id;
      for (const k of CHIP_IDS) chipEls[k].setAttribute('aria-pressed', String(k === state.chip));
      plane.requestDraw();
    });
  }

  // tap on empty canvas puts the probe there (press and release within 3 px and 500 ms)
  let down = null;
  cleanups.push(plane.on('pointerdown', (e) => { down = e.isPrimary ? { id: e.pointerId, px: e.px, py: e.py, t: performance.now() } : null; }));
  cleanups.push(plane.on('pointerup', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const moved = Math.hypot(e.px - down.px, e.py - down.py), dt = performance.now() - down.t;
    down = null;
    if (moved <= 3 && dt < 500) applyProbe(e.z, { final: true, source: 'tap' });
  }));
  cleanups.push(plane.on('pointercancel', () => { down = null; }));

  recompute({ set: true });

  // ---- test hook (read-only), 4.2
  const mv = (window.__mv = window.__mv || {});
  const hook = {
    state: () => structuredClone({ preset: state.presetId, flags: state.flags, p: state.p, eps: state.eps, kind: state.cls.kind, cls: state.cls, analysis: state.an }),
    classify: (re, im) => structuredClone(classifyPoint(state.set, { re, im })),
    highlight: () => state.chip,
  };
  mv.sets = hook;

  return function unmount() {
    cleanups.splice(0).forEach((fn) => fn());
    try { explainer.destroy(); } catch (e) { /* already gone */ }
    try { plane.destroy(); } catch (e) { /* already gone */ }
    if (window.__mv && window.__mv.sets === hook) delete window.__mv.sets;
  };
}
