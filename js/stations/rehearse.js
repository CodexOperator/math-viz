// js/stations/rehearse.js
// The Rehearsal Room: a fresh variant of any of the 29 review problems. The student says the two decisions (Address, Names) first,
// makes a guess (drag handles on a plane, or pick one of four answers), presses Reveal, and sees the verdict, the answer, the same
// numbers worked in both addresses, the picture the station would draw with these numbers, and two exits: the station and the Lab.
// "Same place, new numbers."
//
// Everything above `mount` is pure (no DOM, no clock, no store), so Node imports it: tokens, scores, verdicts, the start positions of
// the handles, the view and the items of every picture, the rows of every explainer, the step list. The numbers all come from the
// card (generators.js); nothing here computes an answer, it re-derives each one by the named address's own method and says whether the
// two routes agree.
//
// Design: docs/designs/iter-2/i2-rehearse.md. The numbers in the comments (5.4, 5.7, ...) are that file's sections.

import { generate, check, FAMILIES } from '../data/generators.js';
import { PROBLEMS, problemById, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { picker } from '../core/decisions.js';
import { header, links, titleSpan } from '../core/station-kit.js';
import {
  createPlane, drawCartAddress, drawPolarAddress, drawCircle, drawRay, drawSegment, drawArc, drawDot, drawSeam, drawPolygonFill,
  createLabelPlacer, sideCands, cssColor, DASH,
} from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose } from '../core/katex.js';
import { segment } from '../core/shapes.js';
import { compile } from '../core/parse.js';
import {
  Arg, wrapArg, abs, add, sub, mul, div, conj, fromPolar, rootsOf, branchArg, localLinear, jacobian, eq,
  fmtNum, fmtCart, fmtAngle, texNumber, texAngle, texCart, texPolar,
} from '../core/complex.js';
import { idKey, sanitizeProgress, setTicked, appendStatement, shortTitle } from './problems.js';

const PI = Math.PI;
const TAU = 2 * Math.PI;
const ZERO = Object.freeze({ re: 0, im: 0 });

export const SCORES_KEY = 'rehearse.scores';                 // store key, persisted: { [id]: { tried, right, last } }
export const TYPE_ORDER = Object.freeze(PROBLEMS.map((p) => p.id));   // the 29 ids in handout order (= FAMILIES order)

// ================================================================== small helpers

const round3 = (x) => Math.round(x * 1000) / 1000 + 0;
const finiteZ = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
const C = (re, im = 0) => ({ re: re + 0, im: im + 0 });
const clean = (z) => ({ re: Math.abs(z.re) < 1e-9 ? 0 : z.re + 0, im: Math.abs(z.im) < 1e-9 ? 0 : z.im + 0 });
const isTiny = (z) => abs(z) < 1e-9;
const nn = (x) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
const shorten = (s, n) => (s.length > n ? s.slice(0, n - 3) + '...' : s);

// ================================================================== 5.1 parseToken

// 'rehearse-1-4-2-s7' arrives as '1-4-2-s7'. -> { id, seed | null } | null
export function parseToken(token) {
  if (typeof token !== 'string') return null;
  const t = token.trim();
  if (t === '' || t.length > 40) return null;
  const m = /^(.+?)(?:-[sS](\d{1,10}))?$/.exec(t);
  if (!m) return null;
  const dotted = m[1].replace(/-/g, '.');
  const found = [dotted, dotted.toUpperCase()].map(problemById).find(Boolean);
  if (!found) return null;
  const seed = m[2] === undefined ? null : Number(m[2]);
  if (seed !== null && seed > 4294967295) return null;
  return { id: found.id, seed };
}

// ================================================================== 5.2 scores, pickType, groups

export function sanitizeScores(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of TYPE_ORDER) {
    const e = raw[id];
    if (!e || typeof e !== 'object') continue;
    const tried = nn(e.tried);
    if (tried === 0) continue;                                 // right > 0 with tried 0 is damage
    const right = Math.min(nn(e.right), tried);
    const last = Number.isFinite(e.last) && e.last >= 0 ? e.last : 0;
    out[id] = { tried, right, last };
  }
  return out;
}

export function recordScore(scores, id, right, now = 0) {
  const s = sanitizeScores(scores);
  if (!TYPE_ORDER.includes(id)) return s;
  const e = s[id] || { tried: 0, right: 0, last: 0 };
  s[id] = { tried: e.tried + 1, right: e.right + (right ? 1 : 0), last: Number.isFinite(now) ? now : 0 };
  return s;
}

export function pickType(scores) {
  const s = sanitizeScores(scores);
  let best = TYPE_ORDER[0];
  let low = s[best] ? s[best].right : 0;
  for (const id of TYPE_ORDER) {
    const r = s[id] ? s[id].right : 0;
    if (r < low) { best = id; low = r; }                       // strict <: ties keep the earlier id
  }
  return best;
}

export function scoreSummary(scores) {
  const s = sanitizeScores(scores);
  let typesRight = 0;
  let tried = 0;
  for (const id of TYPE_ORDER) if (s[id]) { if (s[id].right >= 1) typesRight++; tried += s[id].tried; }
  return { typesRight, tried, total: TYPE_ORDER.length };
}

export function typeGroups() {
  const groups = [
    { key: '1', title: 'Chapter 1', ids: [] }, { key: '2', title: 'Chapter 2', ids: [] },
    { key: '3', title: 'Chapter 3', ids: [] }, { key: 'P', title: 'Proofs', ids: [] },
  ];
  for (const p of PROBLEMS) {
    const g = groups.find((x) => x.key === (p.chapter === 0 || p.kind === 'proof' ? 'P' : String(p.chapter)));
    if (g) g.ids.push(p.id);
  }
  return groups;
}

// ================================================================== 5.4 seeds and the next card

export function freshSeed(now, counter) {
  return ((now >>> 0) ^ Math.imul(counter + 1, 0x9E3779B1)) >>> 0;
}

export function nextCard(id, prev, now, counter) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const seed = freshSeed(now + attempt, counter + attempt);
    if (prev && seed === prev.seed) continue;
    const card = generate(id, seed);
    if (!card) return null;
    if (!prev || card.statement !== prev.statement || attempt === 11) return card;
  }
  return generate(id, ((prev ? prev.seed : 0) + 1) >>> 0);       // every attempt hit prev.seed: practically never
}

// ================================================================== the two hand-offs

export function requestFor(card) {
  if (!card || !card.values || typeof card.values !== 'object' || typeof card.station !== 'string') return null;
  return { station: card.station, problem: card.id, family: card.id, values: card.values };
}

export function labRequestFor(card) {
  if (!card || !card.labRequest || typeof card.labRequest !== 'object') return null;
  return { ...card.labRequest, predictFirst: true };
}

// ================================================================== 5.7 verdict

function guessResult(card, guess) {
  if (guess === null || guess === undefined) return null;
  if (Array.isArray(guess) && guess.length === 0) return null;
  if (!card || !card.sketch || card.sketch.kind === 'none') return null;
  const r = check(card, guess);
  return r.ok === null ? null : r.ok === true;
}

// -> { address, names, guess, right }: address, names, guess are true (right), false (wrong) or null (not set / skipped).
export function verdict(card, picks, guess) {
  const p = card ? problemById(card.id) : null;
  if (!p) return { address: null, names: null, guess: null, right: false };
  const pk = picks && typeof picks === 'object' ? picks : {};
  const address = pk.address === null || pk.address === undefined ? null : pk.address === p.address;
  const names = pk.names === null || pk.names === undefined ? null : pk.names === p.names;
  const g = guessResult(card, guess);
  return { address, names, guess: g, right: address === true && names === true && g !== false };
}

const listJoin = (parts) => (parts.length <= 1 ? parts.join('') : parts.length === 2 ? parts.join(' and ') : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]);

export function verdictSentence(v, kind) {
  const x = v && typeof v === 'object' ? v : {};
  const right = x.address === true && x.names === true && x.guess !== false;
  if (right) {
    if (x.guess === true) return 'Right. Both decisions and your guess are correct.';
    return kind === 'none' ? 'Right on both decisions.' : 'Right on both decisions. You skipped the guess.';
  }
  let s = 'Not yet.';
  const wrong = [];
  if (x.address === false) wrong.push('the Address');
  if (x.names === false) wrong.push('the Names');
  if (x.guess === false) wrong.push('your guess');
  if (wrong.length) s += ' Check ' + listJoin(wrong) + '.';
  const a = x.address === null || x.address === undefined;
  const n = x.names === null || x.names === undefined;
  if (a && n) s += ' You did not set the Address or the Names.';
  else if (a) s += ' You did not set the Address.';
  else if (n) s += ' You did not set the Names.';
  return s + ' The picture and both worked routes are below.';
}

// ================================================================== 5.15 typeset

// ASCII problem notation to typeset symbols: sqrt(50) to the radical, pi to the pi sign, z1 to z with a subscript, and so on.
// Applied to prompts, check details and the four options; never to answer.text (the typeable twin stays ASCII on purpose).
export function typeset(text) {
  let s = String(text === null || text === undefined ? '' : text);
  s = s.replace(/sqrt\(([^()]+)\)/g, (m, a) => (/^\d+$/.test(a) ? '√' + a : '√(' + a + ')'));
  s = s.replace(/\b(\d*)pi\b/g, '$1π');
  s = s.replace(/\btheta\b/g, 'θ');
  s = s.replace(/ <= /g, ' ≤ ').replace(/ >= /g, ' ≥ ').replace(/ \+- /g, ' ± ').replace(/ -> /g, ' → ');
  s = s.replace(/(\d)\s?degrees?\b/g, '$1°');
  s = s.replace(/(?<![A-Za-z0-9_])([zw])([012])(?![A-Za-z0-9_(])/g, (m, v, d) => v + '₀₁₂'[Number(d)]);
  return s;
}

// ================================================================== 5.8.1 fitView, 5.10 matchGuesses

export function fitView(points, extra = 0) {
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;                          // the origin is always held
  for (const p of Array.isArray(points) ? points : []) {
    if (!finiteZ(p)) continue;
    x0 = Math.min(x0, p.re - extra); x1 = Math.max(x1, p.re + extra);
    y0 = Math.min(y0, p.im - extra); y1 = Math.max(y1, p.im + extra);
  }
  const half = Math.max((x1 - x0) / 2, (y1 - y0) / 2);
  return { center: { re: round3((x0 + x1) / 2), im: round3((y0 + y1) / 2) }, halfWidth: Math.max(1.5, Math.round((1.35 * half + 0.6) * 100) / 100) };
}

// The same greedy nearest matching check() does it, so a pair drawn "within tolerance" is exactly what check accepts.
export function matchGuesses(targets, guesses) {
  const used = new Set();
  const out = [];
  for (const t of targets) {
    let best = -1;
    let bd = Infinity;
    guesses.forEach((g, i) => {
      if (used.has(i)) return;
      const d = Math.hypot(t.re - g.re, t.im - g.im);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) used.add(best);
    out.push({ target: t, guess: best >= 0 ? guesses[best] : null, dist: best >= 0 ? bd : Infinity });
  }
  return out;
}

// ================================================================== 5.5 start positions of the handles

const GUESS_KINDS = ['roots', 'point', 'circle', 'line', 'sector'];
const guessHalf = (card) => (card.sketch && card.sketch.fit && Number.isFinite(card.sketch.fit.halfWidth) ? card.sketch.fit.halfWidth : 3);
const guessCenter = (card) => (card.sketch && card.sketch.fit && finiteZ(card.sketch.fit.center) ? card.sketch.fit.center : ZERO);

export function startGuess(card) {
  if (!card || !card.sketch || !GUESS_KINDS.includes(card.sketch.kind)) return [];
  const kind = card.sketch.kind;
  const hw = guessHalf(card);
  const c0 = guessCenter(card);
  const at = (fx, fy) => ({ re: round3(c0.re + fx * hw), im: round3(c0.im + fy * hw) });
  const spec = (id, z, label, name) => ({ id, z, label, name });
  if (kind === 'roots' || kind === 'point') {
    const n = kind === 'roots' ? card.sketch.n : card.sketch.count;
    const targets = card.sketch.target.points;
    const slots = (m, fy) => (m === 1 ? [at(0, fy)] : Array.from({ length: m }, (_, i) => at(-0.72 + (1.44 * i) / (m - 1), fy)));
    const cands = [slots(n, -0.8), slots(n, 0.8)];
    if (n >= 2) {
      const split = [...slots(Math.ceil(n / 2), -0.8), ...slots(Math.floor(n / 2), -0.55)];
      const halves = [...slots(Math.ceil(n / 2), -0.8), ...slots(Math.floor(n / 2), 0.8)];     // a bottom tray and a top tray
      if (n > 8) cands.unshift(halves, split);                 // more than eight dots do not fit one row of a phone-sized plane
      else cands.push(split, halves);
    }
    const ok = (pts) => {
      let minT = Infinity;
      for (const s of pts) for (const t of targets) minT = Math.min(minT, Math.hypot(s.re - t.re, s.im - t.im));
      let minS = Infinity;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) minS = Math.min(minS, Math.hypot(pts[i].re - pts[j].re, pts[i].im - pts[j].im));
      return minT >= 0.15 * hw && minS >= 0.12 * hw && check(card, pts).ok !== true;
    };
    const pts = cands.find(ok) || cands[0];
    return pts.map((z, k) => spec('g' + k, z, '', kind === 'roots' ? `Root guess ${k + 1} of ${n}` : n === 1 ? 'Your point' : `Point guess ${k + 1} of ${n}`));
  }
  if (kind === 'circle') {
    const T = card.sketch.target;
    const cands = [[-0.5, -0.45, -0.1, -0.45], [0.5, -0.45, 0.1, -0.45], [-0.5, 0.45, -0.1, 0.45], [0.5, 0.45, 0.1, 0.45]].map(([a, b, c, d]) => [at(a, b), at(c, d)]);
    const ok = (p) => check(card, p).ok !== true && Math.hypot(p[0].re - T.center.re, p[0].im - T.center.im) >= 0.3 * hw;
    const p = cands.find(ok) || cands[0];
    return [spec('c', p[0], 'centre', 'Centre of your circle'), spec('r', p[1], 'rim', 'Rim point of your circle')];
  }
  if (kind === 'line') {
    const T = card.sketch.target;
    const cands = [
      [-0.6, -0.6, 0.6, -0.6], [-0.6, 0.6, 0.6, 0.6], [-0.6, -0.6, -0.6, 0.6], [0.6, -0.6, 0.6, 0.6],
      [-0.7, -0.2, 0.7, -0.2], [-0.7, 0.2, 0.7, 0.2], [-0.2, -0.7, -0.2, 0.7], [0.2, -0.7, 0.2, 0.7],
      [-0.6, -0.6, 0.6, 0.6], [-0.6, 0.6, 0.6, -0.6],
    ].map(([a, b, c, d]) => [at(a, b), at(c, d)]);
    const off = (p) => Math.abs((p.re - T.point.re) * T.dir.im - (p.im - T.point.im) * T.dir.re);
    const ok = (p) => check(card, p).ok !== true && off(p[0]) >= 0.2 * hw && off(p[1]) >= 0.2 * hw;
    const p = cands.find(ok) || cands[0];
    return [spec('a', p[0], 'point 1', 'First point on your line'), spec('b', p[1], 'point 2', 'Second point on your line')];
  }
  // sector: radius 0.6 hw about the ORIGIN, angles that miss both target edges by more than 20 degrees
  const T = card.sketch.target;
  const rad = (d) => (d * PI) / 180;
  const far = (a) => Math.abs(wrapArg(rad(a) - T.from)) > rad(22) && Math.abs(wrapArg(rad(a) - T.to)) > rad(22);   // 22, so rounding the point to 3 decimals never costs the 20 degrees
  const pairs = [[60, 160], [-50, 110], [120, 250], [200, 300]];
  for (let a = -180; a < 180; a += 15) pairs.push([a, a + 90]);                // a grid of fallbacks, so some pair always clears both edges
  const pair = pairs.find(([a, b]) => far(a) && far(b) && Math.abs(wrapArg(rad(a) - rad(b))) > rad(25)) || pairs[0];
  const pt = (d) => ({ re: round3(0.6 * hw * Math.cos(rad(d))), im: round3(0.6 * hw * Math.sin(rad(d))) });
  return [spec('s0', pt(pair[0]), 'edge 1', 'First edge of your sector'), spec('s1', pt(pair[1]), 'edge 2', 'Second edge of your sector')];
}

// ================================================================== 5.8.3 stepList

export function stepList(card) {
  if (!card || !['1.4.1', '1.4.2', '2.2.2'].includes(card.id)) return null;
  const g = card.given || {};
  const c = card.id === '1.4.1' ? C(1, 0) : card.id === '1.4.2' ? g.c : g.w;
  const n = g.n;
  if (!finiteZ(c) || !Number.isInteger(n) || n < 1) return null;
  const base = card.id === '1.4.1' ? 0 : Arg(c);
  const name = card.id === '2.2.2' ? 'w' : 'c';
  const A = fmtAngle(base, { unicode: true });
  const rows = [];
  for (let k = 0; k < n; k++) {
    const theta = (base + TAU * k) / n;                        // a NAME of an angle, not wrapped
    let text = `k = ${k}: (${A} + ${k === 0 ? '0' : 2 * k + 'π'})/${n} = ${fmtAngle(theta, { unicode: true })} (${fmtNum((theta * 180) / PI, 3)}°)`;
    if (card.id === '2.2.2') text += k === 0 ? ' (the principal root: the home step only)' : ' (another root)';
    rows.push({ k, text, home: k === 0 });
  }
  return {
    title: card.id === '2.2.2' ? `The names of arg ${name}, each divided by ${n}` : `The steps of arg ${name}, each divided by ${n}`,
    rows,
    footer: `k = ${n} is k = 0 again.`,
  };
}

// ================================================================== 5.14 readoutText

export function readoutText(state) {
  const s = state || {};
  const picks = s.picks || {};
  const dec = (picks.address === null || picks.address === undefined) && (picks.names === null || picks.names === undefined)
    ? 'not set'
    : `${picks.address === null || picks.address === undefined ? '?' : addressLabel(picks.address, { short: true })} / ${picks.names === null || picks.names === undefined ? '?' : picks.names}`;
  const count = Number.isFinite(s.count) ? s.count : 0;
  const g = s.choice !== null && s.choice !== undefined ? `choice ${s.choice}` : s.touched && count > 0 ? `${count} point${count === 1 ? '' : 's'}` : 'none';
  return `type ${s.id}; seed ${s.seed}; decisions: ${dec}; guess: ${g}; revealed: ${s.revealed ? 'yes' : 'no'}`;
}

// ================================================================== 5.8 the picture (Appendix A)

const sup = (n) => [...String(n)].map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('');
const ang = (t) => fmtAngle(t, { unicode: true });
const num = (x) => fmtNum(x, 3);
const cz = (z) => C(z.re, z.im);
const mulN = (z, n) => { let acc = C(1, 0); for (let i = 0; i < n; i++) acc = mul(acc, z); return acc; };   // the n-fold product, never a power formula

// Item constructors (plain, JSON-safe data; the vocabulary is in the design, 4.3).
const dot = (z, tone, label, size = 5, ring = false) => {
  const o = { k: 'dot', z: cz(z), tone, size };
  if (label) o.label = label;
  if (ring) o.ring = true;
  return o;
};
const ring = (z, tone, label) => dot(z, tone, label, 5, true);
const circleItem = (center, r, tone, dash, label) => {
  const o = { k: 'circle', center: cz(center), r, tone };
  if (dash) o.dash = dash;
  if (label) o.label = label;
  return o;
};
const rayItem = (angle, tone, { dash = null, alpha = null, label = null } = {}) => {
  const o = { k: 'ray', angle, tone };
  if (dash) o.dash = dash;
  if (alpha !== null) o.alpha = alpha;
  if (label) o.label = label;
  return o;
};
const seamItem = (angle, label, muted = false) => {
  const o = { k: 'seam', angle };
  if (label !== undefined) o.label = label;
  if (muted) o.muted = true;
  return o;
};
const segItem = (a, b, tone, { arrow = false, dash = null, alpha = null, label = null } = {}) => {
  const o = { k: 'segment', a: cz(a), b: cz(b), tone };
  if (arrow) o.arrow = true;
  if (dash) o.dash = dash;
  if (alpha !== null) o.alpha = alpha;
  if (label) o.label = label;
  return o;
};
const lineItem = (point, dir, tone, label) => {
  const o = { k: 'line', point: cz(point), dir: cz(dir), tone };
  if (label) o.label = label;
  return o;
};
const arcItem = (center, r, from, to, tone, arrow = false, label = null) => {
  const o = { k: 'arc', center: cz(center), r, from, to, tone };
  if (arrow) o.arrow = true;
  if (label) o.label = label;
  return o;
};
const cartAddr = (z, names = null) => (names ? { k: 'cartAddr', z: cz(z), names } : { k: 'cartAddr', z: cz(z) });
const polarAddr = (z, name = 'z', ghosts = 0, ghostsNeg = 0) => ({ k: 'polarAddr', z: cz(z), name, ghosts, ghostsNeg });

// Far points (5.8.2): while the view is wider than 9 and a flexible point remains, the flexible point of largest modulus leaves the fit.
function fitWithFar(anchors, flex, extra = 0, baseline = []) {
  const live = flex.slice();
  const far = new Set();
  const make = () => fitView([...anchors, ...live.map((f) => f.z), ...baseline], extra);
  let view = make();
  while (view.halfWidth > 9 && live.length) {
    let bi = 0;
    live.forEach((f, i) => { if (abs(f.z) > abs(live[bi].z)) bi = i; });
    far.add(live[bi].key);
    live.splice(bi, 1);
    view = make();
  }
  return { view, far };
}

// A far point is a ray from 0 at its Arg and an Arg arc, both labelled; the word says it is off the picture.
function farItems(name, z, tone, hw) {
  const a = Arg(z);
  return [
    rayItem(a, tone, { label: `${name} is off this picture: length ${num(abs(z))}` }),
    arcItem(ZERO, 0.5 * hw, 0, a, 'polar', true, `Arg = ${ang(a)}`),
  ];
}

const extremes = (c, r) => [C(c.re + r, c.im), C(c.re - r, c.im), C(c.re, c.im + r), C(c.re, c.im - r)];

export function pictureOf(card) {
  const id = card.id;
  const v = card.answer.values;
  const g = card.given;
  const sk = card.sketch;
  const T = sk.target || v.target;
  const items = [];
  let view;
  let caption = '';
  const fit = () => ({ center: cz(sk.fit.center), halfWidth: sk.fit.halfWidth });
  switch (id) {
    case '1.4.1': case '1.4.2': {
      view = fit();
      const n = sk.n;
      const rho = v.radius === undefined ? 1 : v.radius;
      const pts = T.points;
      items.push(seamItem(PI), circleItem(ZERO, rho, 'polar', false, null), { k: 'polygon', points: pts.map(cz), tone: 'polar', dash: true, alpha: 0.5 });
      for (let k = 1; k < n; k++) items.push(rayItem(Arg(pts[k]), 'polar', { alpha: 0.35 }));
      items.push(polarAddr(pts[0], 'z'));
      pts.forEach((p, k) => items.push(dot(p, 'polar', 'k = ' + k, k === 0 ? 6 : 5)));
      caption = `The ${n} roots sit on one circle of radius ${num(rho)}, ${fmtNum(360 / n, 2)}° apart. The root with the Arg arc is the step k = 0.`;
      break;
    }
    case '1.4.3': {
      view = fit();
      const p = v.completed.shift;
      const P = C(p, 0);
      const [r1, r2] = v.roots;
      items.push(lineItem(P, C(0, 1), 'seam', 'axis of the pair'), segItem(P, r1, 'polar', { arrow: true }), segItem(P, r2, 'polar', { arrow: true }), cartAddr(r1),
        dot(P, 'cart', 'p = ' + num(p)), dot(r1, 'polar', 'z = ' + fmtCart(r1)), dot(r2, 'polar', 'z = ' + fmtCart(r2)));
      caption = 'Complete the square: slide by p, then go up or down by q. The two roots are a mirror pair across the real axis.';
      break;
    }
    case '2.2.2': {
      view = fit();
      items.push(seamItem(PI), segItem(ZERO, g.w, 'input', { alpha: 0.6 }), dot(g.w, 'input', 'w'));
      for (const o of v.others) items.push(ring(o, 'muted', ''));
      items.push(polarAddr(v.root, 'z'), dot(v.root, 'polar', 'principal root', 6));
      caption = 'Principal means the home step only: halve Arg w. The faint rings are the other roots, from the other steps.';
      break;
    }
    case '2.3.1': {
      view = fit();
      items.push(circleItem(ZERO, 1, 'polar', true, 'every direction'), ring(C(1, 0), 'muted', 'real axis: 1'), ring(C(-1, 0), 'muted', 'imaginary axis: -1'),
        cartAddr(v.along), polarAddr(v.along, 'w'), dot(v.along, 'polar', 'this path', 6));
      caption = 'The fraction equals e^(2iθ): it remembers only the direction, not the distance. Each way in lands on the unit circle at twice the angle.';
      break;
    }
    case '1.2.1': {
      view = fit();
      if (v.rel !== '=') items.push({ k: 'disk', center: cz(v.center), r: v.radius, tone: 'polar', alpha: 0.12 });
      items.push(circleItem(v.center, v.radius, 'polar', v.rel === '<' ? 'excluded' : false, null),
        segItem(v.center, C(v.center.re + v.radius, v.center.im), 'polar', { arrow: true, label: 'R = ' + num(v.radius) }),
        cartAddr(v.center), dot(v.center, 'cart', 'a'));
      caption = v.rel === '=' ? 'The set is every point one stretch R from the centre a: a circle, with no algebra.'
        : v.rel === '<' ? 'The set is every point one stretch R from the centre a: a circle, with no algebra. Dashed means the circle itself is left out.'
          : 'The set is every point one stretch R from the centre a: a circle, with no algebra. The solid circle is part of the set.';
      break;
    }
    case 'P4': {
      view = fit();
      const aR = mul(g.a, C(g.R, 0));
      items.push(circleItem(ZERO, g.R, 'input', true, '|z| = ' + num(g.R)), circleItem(ZERO, v.radius, 'output', false, '|w| = ' + num(v.radius)),
        dot(C(g.R, 0), 'input', 'z'), polarAddr(aR, 'w'), dot(aR, 'output', 'w', 6));
      caption = 'Multiplying by a stretches every length by the modulus of a and turns every name by Arg a. The dashed circle is the input; the solid one is the image.';
      break;
    }
    case '2.5.1': {
      view = fit();
      if (sk.kind === 'circle') {
        items.push(circleItem(T.center, T.radius, 'output', false, 'image'), dot(T.center, 'cart', 'centre'), ring(ZERO, 'muted', '0 = 1/∞'), dot(v.sample.w, 'output', 'w'));
        caption = 'A line that misses 0 closes into a circle through 0, because ∞ goes to 0.';
      } else {
        items.push(lineItem(T.point, T.dir, 'output', v.imageLine), segItem(ZERO, T.point, 'polar', { dash: true, label: 'distance ' + num(abs(T.point)) }), ring(ZERO, 'muted', '0'), dot(v.sample.w, 'output', 'w'));
        caption = 'A circle through 0 opens into a line, because 0 goes to ∞. The dashed segment is the distance from 0 to the line.';
      }
      break;
    }
    case '2.1.3': {
      view = fit();
      items.push(lineItem(T.point, T.dir, 'output', v.imageLine));
      if (abs(T.point) > 1e-9) items.push(segItem(ZERO, T.point, 'polar', { dash: true, label: 'distance ' + num(abs(T.point)) }));
      if (!isTiny(v.shift)) items.push(segItem(ZERO, v.shift, 'cart', { arrow: true, label: 'slide b' }), dot(v.shift, 'cart', 'b = f(0)'));
      items.push(dot(v.sample.w, 'output', 'w'));
      caption = 'A line goes to a line: turn by Arg a, stretch by the modulus of a, slide by b. The dashed segment is the distance from 0 to the image line.';
      break;
    }
    case '2.2.1': {
      view = fit();
      const hw = view.halfWidth;
      const to = v.sector.to;
      items.push({ k: 'wedge', from: 0, to, rMax: 0.9 * hw, tone: 'polar', alpha: 0.12 }, rayItem(0, 'polar', { label: 'arg w = 0' }), rayItem(to, 'polar', { label: 'arg w = ' + ang(to) }),
        arcItem(ZERO, 0.55 * hw, 0, to, 'polar', true, `${g.n}α`),
        { k: 'wedge', from: 0, to: g.alpha, rMax: 0.55 * hw, tone: 'input', alpha: 0.08 }, rayItem(g.alpha, 'input', { dash: true, label: 'arg z = ' + ang(g.alpha) }));
      caption = `Every name of arg z is multiplied by ${g.n}, so the fan opens ${g.n} times wider: from ${ang(g.alpha)} to ${ang(to)}.`;
      break;
    }
    case '1.1.1': {
      const F = fitWithFar([g.z1, g.z2, v.quotient], [{ key: 'p', z: v.product }], 0.4);
      view = F.view;
      items.push(dot(g.z1, 'input', 'z₁'), dot(g.z2, 'input', 'z₂'), dot(v.quotient, 'polar', 'z₁/z₂'));
      if (F.far.has('p')) items.push(...farItems('z₁z₂', v.product, 'cart', view.halfWidth));
      else items.push(cartAddr(v.product), polarAddr(v.product, 'z₁z₂'), dot(v.product, 'cart', 'z₁z₂', 6));
      caption = 'The product z₁z₂ has length r₁r₂ and turns by both names added. The quotient z₁/z₂ undoes z₂: lengths divide, names subtract.';
      break;
    }
    case '1.1.2': {
      const F = fitWithFar([g.z1, g.z2], [{ key: 'w', z: v.w }, { key: 'c', z: v.conjW }], 0.4);
      view = F.view;
      const op = v.op === '-' ? '-' : '+';
      items.push(dot(g.z1, 'input', 'z₁'), dot(g.z2, 'input', 'z₂'));
      if (F.far.has('w')) items.push(...farItems(`z₁ ${op} z₂`, v.w, 'cart', view.halfWidth)); else items.push(dot(v.w, 'cart', `z₁ ${op} z₂`));
      if (F.far.has('c')) items.push(...farItems('conjugate', v.conjW, 'polar', view.halfWidth)); else items.push(dot(v.conjW, 'polar', 'conjugate'));
      if (!F.far.has('w') && !F.far.has('c')) items.push(segItem(v.w, v.conjW, 'seam', { dash: true, label: 'mirror' }), cartAddr(v.conjW));
      caption = 'Two slides, then a mirror across the real axis: the imaginary part changes sign, the length does not.';
      break;
    }
    case '1.2.2': {
      view = fitView([g.z1, g.z2], 0.5);
      const corner = C(g.z1.re, g.z2.im);
      items.push(segItem(g.z2, g.z1, 'cart', { arrow: true, label: num(v.distance) }), segItem(g.z2, corner, 'cart', { dash: true }), segItem(corner, g.z1, 'cart', { dash: true }),
        dot(g.z1, 'input', 'z₁'), dot(g.z2, 'input', 'z₂'));
      caption = 'The distance is the length of one slide: across Δx, up Δy, then the straight line between the two points.';
      break;
    }
    case '1.3.1': {
      const r = v.r;
      view = fitView([v.z, C(1.1 * r, 0), C(-1.1 * r, 0), C(0, 1.1 * r), C(0, -1.1 * r)], 0.3);
      items.push(seamItem(PI), cartAddr(v.z), polarAddr(v.z, 'z', 1, 1), dot(v.z, 'polar', 'z', 6));
      caption = 'z is one dot. The ray and the solid arc are its polar address, Arg z, the home step; the faint arcs are other names in arg z.';
      break;
    }
    case '1.3.2': {
      const r = abs(v.base);
      view = fitView([v.base, C(1.3 * r, 0), C(-1.3 * r, 0), C(0, 1.3 * r), C(0, -1.3 * r)], 0.3);
      const n = v.n;
      items.push(seamItem(PI));
      for (let k = 2; k < n; k++) items.push(rayItem(wrapArg(k * Arg(v.base)), 'polar', { alpha: 0.35 }));
      items.push(rayItem(v.Arg, 'polar', { label: `z${sup(n)}: Arg = ${ang(v.Arg)}` }), arcItem(ZERO, 0.6 * view.halfWidth, 0, v.Arg, 'polar', true), polarAddr(v.base, 'z'), dot(v.base, 'input', 'z', 6));
      const unit = Math.abs(v.r - 1) < 1e-9;
      if (unit) items.push(dot(v.result, 'cart', `z${sup(n)}`));
      caption = unit ? `Each power turns by the same Arg again and the length stays 1. The solid ray is z${sup(n)}: wrap its angle onto the home step.`
        : `Each power turns by the same Arg again. The solid ray is z${sup(n)}: wrap its angle onto the home step. Its length r${sup(n)} = ${num(v.r)} is far outside this picture.`;
      break;
    }
    case '1.5.1': {
      view = fitView([v.start, v.end], 0.5);
      items.push({ k: 'curve', points: segment(v.start, v.end, { n: 64 }).points.map((q) => ({ re: q.re, im: q.im, t: q.t })), tone: 'cart', ramp: true },
        dot(v.start, 'input', 't = 0'), dot(v.end, 'output', 't = 1'), dot(v.at.z, 'polar', 't = ½'));
      caption = 'z(t) is the start plus t times the step: a slide that grows with time. Dark is t = 0, light is t = 1.';
      break;
    }
    case '1.5.2': {
      view = fitView(extremes(v.center, v.outer), 0.3);
      items.push({ k: 'annulus', center: cz(v.center), r0: v.inner, r1: v.outer, innerIncluded: v.innerIncluded, outerIncluded: v.outerIncluded, tone: 'polar' }, dot(v.center, 'cart', 'a'));
      caption = 'A solid circle belongs to the set and a dashed one does not. Open needs both circles dashed; closed needs both solid.';
      break;
    }
    case '2.1.1': {
      const ck = v.check;
      view = fitView([ck.z, ck.w], 0.5);
      items.push(dot(ck.z, 'input', 'z'), segItem(ck.z, ck.w, 'output', { dash: true, arrow: true }), cartAddr(ck.w, ['u', 'v']), polarAddr(ck.w, 'w'), dot(ck.w, 'output', 'w', 6));
      caption = 'The check point z goes to w = f(z). Both formulas give the same u and v there.';
      break;
    }
    case '2.1.2': {
      const c = v.c;
      const D = 4 * c * c;
      const curve = [];
      for (let i = 0; i <= 128; i++) {
        const t = i / 128;
        const vv = -4 + 8 * t;
        curve.push({ re: v.axis === 'x' ? c * c - (vv * vv) / D : (vv * vv) / D - c * c, im: vv, t });
      }
      const us = curve.map((q) => q.re);
      view = fitView([C(Math.min(...us), 0), C(Math.max(...us), 0), C(0, 4), C(0, -4), v.sample.w], 0.4);
      items.push({ k: 'curve', points: curve, tone: 'output', ramp: true }, ring(ZERO, 'muted', 'focus 0'), dot(C(v.parabola.vertex, 0), 'cart', 'vertex ' + num(v.parabola.vertex)), dot(v.sample.w, 'output', 'w'));
      caption = 'Push the line forward with the clock t, then eliminate t: the image is a parabola, and its focus is 0.';
      break;
    }
    case '2.4.1': {
      view = { center: cz(ZERO), halfWidth: 1.8 };
      if (Math.abs(wrapArg(v.seam - PI)) > 1e-9) items.push(seamItem(PI, 'principal cut', true));
      items.push(seamItem(v.seam, 'cut'), rayItem(Arg(v.rayPoint), 'polar', { label: 'the ray' }), arcItem(ZERO, 0.75, v.seam, v.seam + TAU - 0.05, 'polar', true, 'window of names'), dot(v.rayPoint, 'polar', 'z'));
      caption = 'The window of names runs once round, starting just after the cut. The ray lies inside the window, so the branch does not jump there; the principal cut would.';
      break;
    }
    case '3.1.1': {
      const fp = v.derivativeAt.fprime;
      view = fitView([fp], 0.4);
      items.push(cartAddr(fp), polarAddr(fp, 'f′'), dot(fp, 'polar', 'f′(z₀)', 6));
      caption = "f′(z₀) is one complex number. Its length is the local stretch and its Arg is the local turn. The circle of directions is a single point.";
      break;
    }
    case '3.1.2': case 'P6': case '3.2.1': {
      let A, B;
      if (id === '3.1.2') { A = v.localAt.A; B = v.localAt.B; }
      else if (id === 'P6') { A = v.A; B = v.B; }
      else { const L = localLinear(compile(v.src).f, card.values.z0); A = L.A; B = L.B; }
      const rad = abs(B);
      const entire = id === '3.2.1' && rad < 1e-6;
      view = fitView([add(A, B), sub(A, B), C(A.re + rad, A.im), C(A.re - rad, A.im), C(A.re, A.im + rad), C(A.re, A.im - rad), A], 0.3);
      if (entire) {
        items.push(cartAddr(A), polarAddr(A, 'f′'), dot(A, 'polar', 'f′(z₀)', 6));
        caption = 'No mirror part: the circle of directions is the single point f′(z₀) = A, a move with its own turn and stretch.';
      } else {
        items.push(circleItem(A, rad, 'polar', false, 'radius ' + num(rad)), segItem(add(A, B), sub(A, B), 'cart', { dash: true }), dot(A, 'cart', 'A'),
          dot(add(A, B), 'cart', 'real h'), dot(sub(A, B), 'cart', 'imaginary h'), ring(ZERO, 'muted', ''));
        caption = id === '3.2.1' ? 'A mirror part: the circle of directions has radius |B|, so there is no single f′.'
          : 'As the direction of h turns, the quotient runs round this circle. A point would mean differentiable; a circle means a mirror part, so f is not differentiable here.';
      }
      break;
    }
    case 'P1': {
      const prod = mul(g.z1, g.z2);
      const both = v.check.both;
      const F = fitWithFar([], [{ key: 'p', z: prod }, { key: 'b', z: both }], 0.4, [C(1.2, 0), C(-1.2, 0), C(0, 1.2), C(0, -1.2)]);
      view = F.view;
      const near = !F.far.has('p') && !F.far.has('b');
      if (F.far.has('p')) items.push(...farItems('z₁z₂', prod, 'cart', view.halfWidth)); else items.push(dot(prod, 'cart', 'z₁z₂'));
      if (F.far.has('b')) items.push(...farItems('conj z₁ · conj z₂', both, 'polar', view.halfWidth)); else items.push(dot(both, 'polar', 'conj z₁ · conj z₂'));
      if (near) items.push(segItem(prod, both, 'seam', { dash: true, label: 'mirror' }), polarAddr(prod, 'z₁z₂'), polarAddr(both, 'mirror'));
      caption = 'Mirror then multiply lands on the mirror of the product: the two dots are reflections across the real axis, with opposite Args.';
      break;
    }
    case 'P2': {
      const N = v.check.zzbar;
      const P = C(N, 0);
      const F = fitWithFar([v.check.z], [{ key: 'n', z: P }], 0.4);
      view = F.view;
      items.push(polarAddr(v.check.z, 'z'), dot(v.check.z, 'input', 'z'));
      if (F.far.has('n')) items.push(...farItems('z conj z = ' + num(N), P, 'polar', view.halfWidth));
      else items.push(segItem(ZERO, P, 'polar', { arrow: true }), dot(P, 'polar', 'z conj z = ' + num(N)));
      caption = 'Turn by Arg z, then turn back: the angles cancel and r · r is left, on the positive real axis. That is the modulus squared.';
      break;
    }
    case 'P3': {
      const ch = v.check;
      const F = fitWithFar([g.a, g.c], [{ key: 'c', z: v.coeff }, { key: 's', z: v.shift }], 0.4);
      view = F.view;
      items.push(segItem(ZERO, g.a, 'polar', { label: 'a' }), segItem(ZERO, g.c, 'polar', { label: 'c' }), dot(g.a, 'input', 'a'), dot(g.c, 'input', 'c'));
      if (F.far.has('c')) items.push(...farItems('ac', v.coeff, 'polar', view.halfWidth)); else items.push(segItem(ZERO, v.coeff, 'polar', { arrow: true, label: 'ac' }), dot(v.coeff, 'polar', 'ac', 6));
      if (F.far.has('s')) items.push(...farItems('ad + b', v.shift, 'cart', view.halfWidth)); else items.push(dot(v.shift, 'cart', 'ad + b'));
      void ch;
      caption = 'Compose two moves and you get one move: the stretches multiply and the names add. The slide is ad + b.';
      break;
    }
    case 'P5': {
      view = fitView([v.along, C(1, 0), C(0, 0), C(0.5, 0.5), C(0.5, -0.5)], 0.2);
      items.push(circleItem(C(0.5, 0), 0.5, 'polar', true, 'every direction'), ring(C(1, 0), 'muted', 'real axis: 1'), ring(C(0, 0), 'muted', 'imaginary axis: 0'), cartAddr(v.along), dot(v.along, 'polar', 'this path', 6));
      caption = 'x/z is cos θ times e^(−iθ): it depends on the direction θ. This circle holds every value, and each path picks one point of it. Different paths, different values: no limit.';
      break;
    }
    case 'P7': {
      const c = v.c;
      const ext = v.kind === 'modulus' ? extremes(ZERO, c) : [C(c, 0), C(-c, 0), C(0, c), C(0, -c)];
      view = fitView(ext, 1.0);
      if (v.kind === 'u') items.push(lineItem(C(c, 0), C(0, 1), 'output', 'Re w = ' + num(c)));
      else if (v.kind === 'v') items.push(lineItem(C(0, c), C(1, 0), 'output', 'Im w = ' + num(c)));
      else items.push(circleItem(ZERO, c, 'output', false, '|w| = ' + num(c)));
      items.push(ring(ZERO, 'muted', '0'));
      caption = 'Every value of f lies on this line (or circle). An entire map with a nonzero f′ would fill a small disk, so f′ = 0 and f is constant.';
      break;
    }
    default: {
      view = fitView([], 0);
      items.push(ring(ZERO, 'muted', '0'));
      caption = 'The origin of the plane.';
    }
  }
  if (GUESS_KINDS.includes(sk.kind)) view = containView(view, items);
  return { view, items, caption, alt: caption, station: card.station };
}

// The guess plane and the picture share the generator's view, so the student's rings sit where they were put. A picture that also shows
// a check point or another root can need more room than that view gives it: grow the view about the same centre, never shrink it.
function containView(view, items) {
  const pts = [];
  for (const it of items) {
    if (it.k === 'dot' || it.k === 'cartAddr' || it.k === 'polarAddr') pts.push(it.z);
    else if (it.k === 'circle' || it.k === 'disk') pts.push(...extremes(it.center, it.r));
    else if (it.k === 'segment') pts.push(it.a, it.b);
  }
  let need = 0;
  for (const p of pts) need = Math.max(need, Math.abs(p.re - view.center.re), Math.abs(p.im - view.center.im));
  const hw = need > 0.93 * view.halfWidth ? Math.ceil((need / 0.93) * 100) / 100 : view.halfWidth;
  return { center: view.center, halfWidth: hw };
}

// ================================================================== 5.9 explainerData (Appendix B)

const tn = (x) => texNumber(Math.abs(x) < 1e-9 ? 0 : x);
const ta = (x) => texAngle(x);
const tc = (z) => texCart(clean(z));
const tp = (z) => (isTiny(z) ? '0\\ (\\text{no angle at } 0)' : texPolar(clean(z)));
const tcOrN = (z) => (Math.abs(z.im) < 1e-12 ? tn(clean(z).re) : tc(z));
const par = (s) => '\\left(' + s + '\\right)';
const sq = (x) => { const s = tn(x); return x < 0 || /\\frac|\\sqrt|\\times/.test(s) ? par(s) + '^2' : s + '^2'; };
const shifted = (name, v) => (Math.abs(v) < 1e-12 ? name : par(name + (v < 0 ? ' + ' : ' - ') + tn(Math.abs(v))));       // (x - 2), (y + 3), x
const texExp = (r, theta) => {
  const body = Math.abs(theta) < 1e-9 ? '' : 'e^{' + (theta < 0 ? '-' : '') + 'i\\,' + ta(Math.abs(theta)) + '}';
  if (body === '') return tn(r);
  return (Math.abs(r - 1) < 1e-9 ? '' : tn(r) + '\\,') + body;
};
const texAscii = (s) => String(s).replace(/\bcos\b/g, '\\cos').replace(/\bsin\b/g, '\\sin');

const mkRow = (id, label, cart, polar, native, numv = null) => ({ id, label, cart, polar, native, num: numv });
const ptRow = (id, label, z, native) => mkRow(id, label, tc(z), tp(z), native, cz(z));
const lenRow = (id, label, z, native) => mkRow(id, label, `\\sqrt{${sq(z.re)} + ${sq(z.im)}} = ${tn(abs(z))}`, `r = ${tn(abs(z))}`, native, abs(z));
const angRow = (id, label, z, native) => (isTiny(z)
  ? mkRow(id, label, '\\text{no angle at } 0', '\\text{no angle at } 0', native, null)
  : mkRow(id, label, `\\operatorname{atan2}(${tn(z.im)},\\ ${tn(z.re)}) = ${ta(Arg(z))}`, `\\operatorname{Arg} = ${ta(Arg(z))}`, native, Arg(z)));

// The footer: the value reached by the Cartesian route and the value reached by the polar route, computed apart, and whether they agree.
function sameOf(cartZ, polarZ, target, extraOk = true) {
  const tolOf = (z) => 1e-8 * Math.max(1, abs(z));
  const agree = extraOk && eq(cartZ, polarZ, tolOf(cartZ)) && (target === undefined || eq(cartZ, target, tolOf(target)));
  return { cart: tcOrN(cartZ), polar: tcOrN(polarZ), agree };
}

// The equation nu u + nv v = k with a coefficient of 1 written bare and a zero term left out ('u = 1/2', 'v = 0', '-u + v = 1').
function texLinear(nu, nv, k) {
  const term = (c, name) => { const m = Math.abs(c); return (Math.abs(m - 1) < 1e-9 ? '' : tn(m)) + name; };
  const parts = [];
  if (Math.abs(nu) > 1e-9) parts.push({ neg: nu < 0, body: term(nu, 'u') });
  if (Math.abs(nv) > 1e-9) parts.push({ neg: nv < 0, body: term(nv, 'v') });
  let s = '';
  parts.forEach((p, i) => { s += (i === 0 ? (p.neg ? '-' : '') : p.neg ? ' - ' : ' + ') + p.body; });
  return `${s} = ${tn(k)}`;
}

// nu u + nv v = k with k >= 0 (when k = 0: nv > 0, or nv = 0 and nu > 0), and alpha = Arg(nu + i nv).
function normLine(le) {
  let { nu, nv, k } = le;
  const flip = k < -1e-9 || (Math.abs(k) <= 1e-9 && (nv < -1e-9 || (Math.abs(nv) <= 1e-9 && nu < 0)));
  if (flip) { nu = -nu; nv = -nv; k = -k; }
  if (Math.abs(k) <= 1e-9) k = 0;
  return { nu, nv, k, alpha: Arg(C(nu, nv)) };
}

// cos(theta - alpha), with the shift left out when alpha is 0 and written as a plus when alpha is negative.
const cosShift = (alpha) => (Math.abs(alpha) < 1e-9 ? '\\cos\\theta' : '\\cos' + par(alpha > 0 ? `\\theta - ${ta(alpha)}` : `\\theta + ${ta(-alpha)}`));

const pathAngle = (path) => (path.kind === 'line' ? Math.atan(path.m) : path.kind === 'vertical' ? PI / 2 : 0);
const evalCartTerms = (list, x, y) => list.reduce((s, [c, xp, yp]) => s + c * Math.pow(x, xp) * Math.pow(y, yp), 0);
const evalPolarTerms = (list, r, th) => list.reduce((s, [c, k, trig]) => s + (trig === null ? c : c * Math.pow(r, k) * (trig === 'cos' ? Math.cos(k * th) : Math.sin(k * th))), 0);
function polarTermsTex(list) {
  let out = '';
  list.forEach(([c, k, trig], i) => {
    const m = Math.abs(c);
    const coef = Math.abs(m - 1) < 1e-9 ? '' : tn(m);
    const body = trig === null ? tn(m) : coef + (k === 0 ? '' : k === 1 ? 'r' : `r^{${k}}`) + (trig === 'cos' ? '\\cos' : '\\sin') + (k === 1 ? '\\theta' : ` ${k}\\theta`);
    out += (i === 0 ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + ') + body;
  });
  return out === '' ? '0' : out;
}

export function explainerData(card) {
  const id = card.id;
  const v = card.answer.values;
  const g = card.given;
  const rows = [];
  let same;
  let sameLabel = 'same point';
  switch (id) {
    case '1.1.1': {
      sameLabel = 'same product';
      const { z1, z2 } = g;
      rows.push(
        mkRow('product', 'z₁z₂', `${par(tc(z1))}${par(tc(z2))} = ${tc(v.product)}`, tp(v.product), 'cart', cz(v.product)),
        mkRow('quotient', 'z₁/z₂', `\\dfrac{${tc(z1)}}{${tc(z2)}} = ${tc(v.quotient)}`, tp(v.quotient), 'cart', cz(v.quotient)),
        mkRow('length', 'length of z₁z₂', `\\sqrt{${sq(v.product.re)} + ${sq(v.product.im)}} = ${tn(v.productAbs)}`,
          `r_1 r_2 = ${tn(abs(z1))}\\cdot ${tn(abs(z2))} = ${tn(v.productAbs)}`, 'polar', v.productAbs));
      same = sameOf(C(z1.re * z2.re - z1.im * z2.im, z1.re * z2.im + z2.re * z1.im), fromPolar(abs(z1) * abs(z2), Arg(z1) + Arg(z2)), v.product);
      break;
    }
    case '1.1.2': {
      sameLabel = 'same conjugate';
      const op = g.op === '-' ? '-' : '+';
      const isRe = g.part === 'Re';
      rows.push(
        ptRow('w', `z₁ ${op} z₂`, v.w, 'cart'),
        mkRow('mirror', 'its conjugate', `\\overline{${tc(v.w)}} = ${tc(v.conjW)}`, tp(v.conjW), 'cart', cz(v.conjW)),
        mkRow('part', `${isRe ? 'Re' : 'Im'} of the conjugate`, `\\operatorname{${isRe ? 'Re' : 'Im'}}${par(tc(v.conjW))} = ${tn(v.result)}`,
          `r${isRe ? '\\cos' : '\\sin'}\\theta = ${tn(abs(v.w))}${isRe ? '\\cos' : '\\sin'}${par(ta(Arg(v.conjW)))} = ${tn(v.result)}`, 'cart', v.result));
      same = sameOf(C(v.w.re, -v.w.im), fromPolar(abs(v.w), -Arg(v.w)), v.conjW);
      break;
    }
    case '1.2.1': {
      sameLabel = 'same circle';
      const a = v.center;
      const R = v.radius;
      const REL = v.rel === '<' ? '<' : v.rel === '<=' ? '\\le' : '=';
      const ra = abs(a);
      rows.push(
        ptRow('centre', 'centre a', a, null),
        mkRow('radius', 'radius R', `\\sqrt{${shifted('x', a.re)}^2 + ${shifted('y', a.im)}^2} = ${tn(R)}`, `\\left|z - ${par(tc(a))}\\right| = ${tn(R)}`, 'polar', R),
        mkRow('equation', 'the relation', `${shifted('x', a.re)}^2 + ${shifted('y', a.im)}^2 ${REL} ${tn(R * R)}`,
          ra < 1e-9 ? `r ${REL} ${tn(R)}` : `r^2 - 2r\\cdot ${tn(ra)}${cosShift(Arg(a))} + ${tn(ra * ra)} ${REL} ${tn(R * R)}`, 'polar', null));
      const p = C(a.re + R, a.im);
      const rp = abs(p);
      const thp = Arg(p);
      same = sameOf(C((p.re - a.re) ** 2 + (p.im - a.im) ** 2, 0), C(rp * rp - 2 * rp * ra * Math.cos(thp - Arg(a)) + ra * ra, 0), C(R * R, 0));
      break;
    }
    case '1.2.2': {
      sameLabel = 'same distance';
      rows.push(ptRow('slide', 'z₁ − z₂', v.difference, 'cart'), lenRow('length', 'distance', v.difference, 'cart'));
      rows[1].num = v.distance;
      same = sameOf(C(Math.sqrt((g.z1.re - g.z2.re) ** 2 + (g.z1.im - g.z2.im) ** 2), 0), C(abs(v.difference), 0), C(v.distance, 0));
      break;
    }
    case '1.3.1': {
      sameLabel = 'same point';
      const z = v.z;
      rows.push(
        ptRow('point', 'z', z, null),
        lenRow('length', 'r', z, 'polar'),
        angRow('arg', 'Arg z (the home step)', z, 'polar'),
        mkRow('set', 'arg z (the set)', null, `\\arg z = \\left\\{ ${ta(v.theta)} + 2\\pi k : k \\in \\mathbb{Z} \\right\\}`, 'polar', null));
      same = sameOf(z, fromPolar(v.r, v.theta), z);
      break;
    }
    case '1.3.2': {
      sameLabel = 'same power';
      const n = v.n;
      const base = v.base;
      rows.push(
        ptRow('base', 'z', base, null),
        mkRow('power', 'zⁿ', `${par(tc(base))}^{${n}} = ${tc(v.result)}`, `${tn(abs(base))}^{${n}}\\,e^{i\\,${n}\\cdot ${ta(Arg(base))}} = ${texExp(v.r, v.rawAngle)}`, 'polar', cz(v.result)),
        mkRow('wrap', 'angle, wrapped onto the home step', null, `${n}\\theta = ${ta(v.rawAngle)} \;\\to\; \\operatorname{Arg} = ${ta(v.Arg)}`, 'polar', v.Arg));
      same = sameOf(mulN(base, n), fromPolar(Math.pow(abs(base), n), n * Arg(base)), v.result);
      break;
    }
    case '1.4.1': case '1.4.2': {
      sameLabel = 'same c';
      const c = id === '1.4.1' ? C(1, 0) : g.c;
      const n = g.n;
      const r = v.radius === undefined ? 1 : v.radius;
      const A = Arg(c);
      const roots = v.roots;
      rows.push(
        mkRow('radius', 'radius', `${par(`\\sqrt{${sq(c.re)} + ${sq(c.im)}}`)}^{1/${n}} = ${tn(r)}`, `\\left|c\\right|^{1/${n}} = ${tn(abs(c))}^{1/${n}} = ${tn(r)}`, 'polar', r),
        mkRow('arg', 'Arg c (the home step)', `\\operatorname{atan2}(${tn(c.im)},\\ ${tn(c.re)}) = ${ta(A)}`, `\\operatorname{Arg}\\,c = ${ta(A)}`, 'polar', A),
        mkRow('first', 'first root, k = 0', tc(roots[0]), texExp(r, A / n), 'polar', cz(roots[0])),
        mkRow('all', `all ${n} roots`, roots.map(tc).join(',\\ '), roots.map((_, k) => texExp(r, (A + TAU * k) / n)).join(',\\ '), 'polar', null),
        mkRow('check', `each root to the power ${n}`, `${par(tc(roots[0]))}^{${n}} = ${tc(c)}`, `${tn(r)}^{${n}}\\,e^{i\\,${n}\\cdot ${ta(A / n)}} = ${tc(c)}`, null, cz(c)));
      const allOk = roots.every((z, k) => eq(mulN(z, n), c, 1e-9 * Math.max(1, abs(c))) && eq(z, fromPolar(r, (A + TAU * k) / n), 1e-9));
      same = sameOf(mulN(roots[0], n), fromPolar(Math.pow(r, n), n * (A / n)), c, allOk);
      break;
    }
    case '1.4.3': {
      sameLabel = 'same value of the polynomial';
      const { a, b, c: cc0, disc } = v;
      const q = g.q;
      const [r1, r2] = v.roots;
      rows.push(
        mkRow('disc', 'discriminant', `${sq(b)} - 4\\cdot ${tn(a)}\\cdot ${tn(cc0)} = ${tn(disc)}`, `${tn(disc)} = ${tn(-disc)}\\,e^{i\\pi}`, 'cart', disc),
        mkRow('sqrt', 'square roots of the discriminant', `\\pm\\sqrt{${tn(disc)}} = \\pm ${tn(2 * q)}\\,i`, `${tn(2 * q)}\\,e^{i\\frac{\\pi}{2}},\\ ${tn(2 * q)}\\,e^{i\\frac{3\\pi}{2}}`, 'polar', C(0, 2 * q)),
        ptRow('root1', 'z = (−b + √disc)/2', r1, 'cart'),
        ptRow('root2', 'z = (−b − √disc)/2', r2, 'cart'));
      const rr = abs(r1);
      const th = Arg(r1);
      const sq2 = fromPolar(rr * rr, 2 * th);
      const lin = fromPolar(Math.abs(b) * rr, th + (b < 0 ? PI : 0));
      same = sameOf(add(add(mul(r1, r1), C(b * r1.re, b * r1.im)), C(cc0, 0)), add(add(sq2, lin), C(cc0, 0)), C(0, 0));
      break;
    }
    case '1.5.1': {
      sameLabel = 'same endpoint';
      rows.push(ptRow('start', 'start', v.start, 'cart'), ptRow('step', 'step = end − start', v.direction, 'cart'), ptRow('mid', 'z(½)', v.at.z, 'cart'));
      same = sameOf(add(v.start, v.direction), add(v.start, fromPolar(abs(v.direction), Arg(v.direction))), v.end);
      break;
    }
    case '1.5.2': {
      sameLabel = 'same ring';
      const a = v.center;
      const LI = v.innerIncluded ? '\\le' : '<';
      const LO = v.outerIncluded ? '\\le' : '<';
      const word = v.open ? 'open' : v.closed ? 'closed' : 'neither open nor closed';
      rows.push(
        ptRow('centre', 'centre a', a, null),
        mkRow('radii', 'the two circles', `${tn(v.inner * v.inner)} ${LI} ${shifted('x', a.re)}^2 + ${shifted('y', a.im)}^2 ${LO} ${tn(v.outer * v.outer)}`, `${tn(v.inner)} ${LI} \\rho ${LO} ${tn(v.outer)}`, 'polar', null),
        mkRow('verdict', 'open, closed, domain', `\\text{${word}; ${v.domain ? 'a domain' : 'not a domain'}; ${v.bounded ? 'bounded' : 'unbounded'}}`,
          `\\partial S = \\{\\rho = ${tn(v.inner)}\\} \\cup \\{\\rho = ${tn(v.outer)}\\}`, 'polar', null));
      const p = C(a.re + (v.inner + v.outer) / 2, a.im);
      const x2 = (p.re - a.re) ** 2 + (p.im - a.im) ** 2;
      const rho = Math.hypot(p.re - a.re, p.im - a.im);
      const inC = (v.innerIncluded ? x2 >= v.inner ** 2 : x2 > v.inner ** 2) && (v.outerIncluded ? x2 <= v.outer ** 2 : x2 < v.outer ** 2);
      const inP = (v.innerIncluded ? rho >= v.inner : rho > v.inner) && (v.outerIncluded ? rho <= v.outer : rho < v.outer);
      same = { cart: inC ? '\\text{inside}' : '\\text{outside}', polar: inP ? '\\text{inside}' : '\\text{outside}', agree: inC && inP };
      break;
    }
    case '2.1.1': {
      sameLabel = 'same w';
      const ck = v.check;
      rows.push(
        ptRow('z', 'check point z', ck.z, null),
        ptRow('w', 'w = f(z)', ck.w, null),
        mkRow('u', 'u', `u = ${v.uCart} = ${tn(ck.u)}`, `u = ${polarTermsTex(v.polarTerms.u)} = ${tn(ck.u)}`, null, ck.u),
        mkRow('v', 'v', `v = ${v.vCart} = ${tn(ck.v)}`, `v = ${polarTermsTex(v.polarTerms.v)} = ${tn(ck.v)}`, null, ck.v));
      const th = Arg(ck.z);
      const r = abs(ck.z);
      same = sameOf(C(evalCartTerms(v.cartTerms.u, ck.z.re, ck.z.im), evalCartTerms(v.cartTerms.v, ck.z.re, ck.z.im)),
        C(evalPolarTerms(v.polarTerms.u, r, th), evalPolarTerms(v.polarTerms.v, r, th)), ck.w);
      break;
    }
    case '2.1.2': {
      sameLabel = 'same w';
      const c = v.c;
      const X = v.axis === 'x';
      const D = 4 * c * c;
      rows.push(
        mkRow('curve', 'image curve', `u = ${tn(v.parabola.vertex)} ${X ? '-' : '+'} \\dfrac{v^2}{${tn(D)}}`, `\\rho\\,${par(`1 ${X ? '+' : '-'} \\cos\\varphi`)} = ${tn(2 * c * c)}`, 'cart', v.parabola.vertex),
        mkRow('sample', 'a point goes to', `${par(tc(v.sample.z))}^2 = ${tc(v.sample.w)}`, `${tp(v.sample.z)} \\mapsto r^2 e^{i\\,2\\theta} = ${tp(v.sample.w)}`, 'cart', cz(v.sample.w)),
        mkRow('focus', 'focus', `${par('0,\\ 0')}`, '\\rho = 0\\ (\\text{the pole})', null, 0));
      const z = v.sample.z;
      same = sameOf(C(z.re * z.re - z.im * z.im, 2 * z.re * z.im), fromPolar(abs(z) ** 2, 2 * Arg(z)), v.sample.w);
      break;
    }
    case '2.1.3': {
      sameLabel = 'same w';
      const T = v.target;
      const L = normLine(v.lineEq);
      const { a, b } = g;
      rows.push(
        ptRow('point', 'foot of the perpendicular from 0', T.point, null),
        ptRow('direction', 'direction of the line', T.dir, null),
        mkRow('equation', 'the line', texLinear(L.nu, L.nv, L.k),
          L.k > 1e-9 ? `r${cosShift(L.alpha)} = ${tn(L.k)}` : `\\theta = ${ta(Arg(T.dir))}\\ \\text{or}\\ ${ta(wrapArg(Arg(T.dir) + PI))}`, 'cart', L.k),
        mkRow('map', 'a and b', `a = ${tc(a)},\\ b = ${tc(b)}`, `a = ${tp(a)},\\ \\text{slide } b = ${tc(b)}`, 'polar', null));
      const z = v.sample.z;
      same = sameOf(C(a.re * z.re - a.im * z.im + b.re, a.re * z.im + a.im * z.re + b.im), add(fromPolar(abs(a) * abs(z), Arg(a) + Arg(z)), b), v.sample.w);
      break;
    }
    case '2.2.1': {
      sameLabel = 'same edge';
      const n = g.n;
      const alpha = g.alpha;
      const to = v.sector.to;
      const e = fromPolar(1, alpha);
      const w1 = mulN(e, n);
      rows.push(
        mkRow('edge0', 'edge arg z = 0', `\\text{the ray } y = 0,\\ x > 0 \;\\mapsto\; x^{${n}} > 0`, `\\arg z = 0 \;\\mapsto\; \\arg w = ${n}\\cdot 0 = 0`, 'polar', 0),
        mkRow('edge1', 'edge arg z = α', `${par(`\\cos ${ta(alpha)} + i\\sin ${ta(alpha)}`)}^{${n}} = ${tc(w1)}`, `1^{${n}}\\,e^{i\\,${n}\\cdot ${ta(alpha)}} = e^{i\\,${ta(to)}}`, 'polar', to),
        mkRow('opening', 'opening of the fan', `\\operatorname{Arg}\\,w_1 = ${ta(wrapArg(to))}\\ \\text{(the home step only)}`, `${n}\\alpha = ${ta(to)}\\ \\text{(a name for arg } w\\text{)}`, 'polar', to));
      same = sameOf(w1, fromPolar(1, n * alpha), fromPolar(1, to), Math.abs(wrapArg(to - Arg(w1))) < 1e-9);
      break;
    }
    case '2.2.2': {
      sameLabel = 'same w';
      const w = g.w;
      const n = g.n;
      rows.push(
        ptRow('w', 'w', w, null),
        ptRow('root', 'principal root', v.root, 'polar'),
        mkRow('step', 'Arg w ÷ n (the home step, divided)', null, `\\dfrac{\\operatorname{Arg} w}{${n}} = \\dfrac{${ta(Arg(w))}}{${n}} = ${ta(Arg(w) / n)}`, 'polar', v.Arg),
        mkRow('others', 'the other roots (steps k ≥ 1)', v.others.map(tc).join(',\\ '), v.others.map(tp).join(',\\ '), 'polar', cz(v.others[0])));
      const pr = fromPolar(Math.pow(abs(w), 1 / n), Arg(w) / n);
      same = sameOf(mulN(v.root, n), mulN(pr, n), w, eq(v.root, pr, 1e-9));
      break;
    }
    case '2.3.1': {
      sameLabel = 'same value';
      const path = g.path;
      const th = pathAngle(path);
      let cartCell;
      let cartZ;
      if (path.kind === 'line') {
        const m = path.m;
        cartCell = `\\dfrac{${tc(C(1 - m * m, 2 * m))}}{${tn(1 + m * m)}} = ${tc(v.along)}`;
        cartZ = C(((1 - m * m) / (1 + m * m)), (2 * m) / (1 + m * m));
      } else if (path.kind === 'vertical') { cartCell = '\\dfrac{-y^2}{y^2} = -1'; cartZ = C(-1, 0); } else { cartCell = '\\lim_{x \\to 0}\\dfrac{z}{\\overline{z}} = 1'; cartZ = C(1, 0); }
      rows.push(
        mkRow('along', 'value along this path', cartCell, `e^{2i\\theta} = e^{i\\,${ta(2 * th)}} = ${tc(v.along)}`, 'polar', cz(v.along)),
        mkRow('real', 'along the real axis', '1', 'e^{i\\,0} = 1', 'polar', 1),
        mkRow('imag', 'along the imaginary axis', '-1', 'e^{i\\pi} = -1', 'polar', -1));
      same = sameOf(cartZ, fromPolar(1, 2 * th), v.along);
      break;
    }
    case '2.4.1': {
      sameLabel = 'same value';
      const s0 = v.seam;
      const n = v.n;
      const rp = v.rayPoint;
      const phi = branchArg(rp, s0);
      rows.push(
        mkRow('window', 'window of names for arg z', null, `${ta(s0)} < \\theta < ${ta(s0 + TAU)}`, 'polar', null),
        mkRow('ray', 'the ray', `z = ${tc(rp)}`, `\\theta = ${ta(phi)}\\ \\text{(inside the window)}`, 'polar', phi),
        mkRow('value', 'f on the ray', tc(v.atRay), `${texExp(Math.pow(abs(rp), 1 / n), phi / n)} = ${tc(v.atRay)}`, 'polar', cz(v.atRay)));
      const lo = s0 / n;
      const inWedge = rootsOf(rp, n).filter((z) => {
        let a = Arg(z);
        a -= TAU * Math.ceil((a - lo) / TAU - 1e-12);
        if (a <= lo + 1e-12) a += TAU;
        return a <= lo + TAU / n + 1e-9;
      });
      same = sameOf(inWedge[0] || C(NaN, NaN), fromPolar(Math.pow(abs(rp), 1 / n), phi / n), v.atRay, inWedge.length === 1);
      break;
    }
    case '2.5.1': {
      sameLabel = 'same w';
      const T = v.target;
      const z = v.sample.z;
      const w = v.sample.w;
      const sampleRow = mkRow('sample', 'a point goes to', `\\dfrac{1}{${tc(z)}} = ${tc(w)}`, `\\dfrac{1}{${tp(z)}} = ${tp(w)}`, 'polar', cz(w));
      if (card.sketch.kind === 'line') {
        const L = normLine(v.lineEq);
        rows.push(ptRow('point', 'foot of the perpendicular from 0', T.point, null), ptRow('direction', 'direction of the line', T.dir, null),
          mkRow('equation', 'the line', texLinear(L.nu, L.nv, L.k), `r${cosShift(L.alpha)} = ${tn(L.k)}`, 'polar', L.k), sampleRow);
      } else {
        rows.push(ptRow('centre', 'centre of the image circle', T.center, null),
          mkRow('radius', 'radius', `\\dfrac{1}{2\\left|${tn(v.c)}\\right|} = ${tn(T.radius)}`, `\\rho = ${tn(T.radius)}`, 'polar', T.radius),
          mkRow('equation', 'the circle', `${shifted('u', T.center.re)}^2 + v^2 = ${tn(T.radius * T.radius)}`, `r = ${tn(2 * T.radius)}${cosShift(Arg(T.center))}`, 'polar', null), sampleRow);
      }
      const r2 = z.re * z.re + z.im * z.im;
      same = sameOf(C(z.re / r2, -z.im / r2), fromPolar(1 / abs(z), -Arg(z)), w);
      break;
    }
    case '3.1.1': {
      sameLabel = 'same f′';
      const z0 = v.derivativeAt.z;
      const fp = v.derivativeAt.fprime;
      const L = localLinear(compile(v.src).f, z0);
      rows.push(
        mkRow('formula', 'f′(z)', `f'(z) = ${v.fprimeTex}`, 'A + B\\,e^{-2i\\varphi}\\ \\text{with}\\ B = 0', 'cart', null),
        ptRow('value', `f′(z₀) at z₀ = ${fmtCart(z0)}`, fp, 'cart'),
        mkRow('circle', 'circle of directions', '\\text{radius } \\left|B\\right| = 0', `\\text{one point: } A = ${tp(fp)}`, 'polar', 0));
      same = sameOf(fp, L.A, fp, abs(L.B) < 1e-6);
      break;
    }
    case '3.1.2': case 'P6': {
      sameLabel = 'same radius';
      const z0 = id === '3.1.2' ? v.localAt.z : card.values.z0;
      const L = localLinear(compile(v.src).f, z0);
      const A = id === '3.1.2' ? v.localAt.A : v.A;
      const B = id === '3.1.2' ? v.localAt.B : v.B;
      const rad = abs(B);
      const target = id === '3.1.2' ? v.circleRadiusAt.radius : v.circle.radius;
      if (id === '3.1.2') {
        rows.push(
          ptRow('A', 'A, the move', A, 'polar'), ptRow('B', 'B, the mirror part', B, 'polar'),
          mkRow('two', 'real h and imaginary h', `${tc(add(A, B))}\\ \\text{ and }\\ ${tc(sub(A, B))}`, 'A + B\\,e^{-2i\\varphi}\\ \\text{at}\\ \\varphi = 0\\ \\text{and}\\ \\tfrac{\\pi}{2}', null, null));
      } else {
        rows.push(
          ptRow('A', 'A', A, null), ptRow('B', 'B', B, null),
          mkRow('real', 'real h', `A + B = ${tc(add(A, B))}`, `A + B\\,e^{0} = ${tp(add(A, B))}`, null, cz(add(A, B))),
          mkRow('imag', 'imaginary h', `A - B = ${tc(sub(A, B))}`, `A + B\\,e^{-i\\pi} = ${tp(sub(A, B))}`, null, cz(sub(A, B))));
      }
      rows.push(mkRow('radius', 'radius of the circle of directions', `\\tfrac{1}{2}\\left|(A + B) - (A - B)\\right| = ${tn(rad)}`, `\\left|B\\right| = ${tn(rad)}`, 'polar', rad));
      same = sameOf(C(abs(sub(add(A, B), sub(A, B))) / 2, 0), C(rad, 0), C(target, 0), eq(L.A, A, 1e-6) && eq(L.B, B, 1e-6));
      break;
    }
    case '3.2.1': {
      sameLabel = 'same verdict';
      const z0 = card.values.z0;
      const f = compile(v.src).f;
      const J = jacobian(f, z0);
      const L = localLinear(f, z0);
      const crCart = Math.abs(J.ux - J.vy) + Math.abs(J.uy + J.vx);
      const crPolar = abs(L.B);
      const holds = crCart < 1e-6;
      rows.push(
        mkRow('partials', 'partials at z₀', `u_x = ${texAscii(v.cr.ux)},\\ v_y = ${texAscii(v.cr.vy)};\\ u_y = ${texAscii(v.cr.uy)},\\ v_x = ${texAscii(v.cr.vx)}`, `A = ${tp(L.A)},\\ \\left|B\\right| = ${tn(crPolar)}`, 'cart', null),
        ptRow('A', 'A, the move, at z₀', L.A, null),
        mkRow('verdict', 'u_x = v_y and u_y = −v_x?', `\\text{${holds ? 'holds' : 'fails'}}: \\left|u_x - v_y\\right| + \\left|u_y + v_x\\right| = ${tn(crCart)}`,
          `\\left|B\\right| = ${tn(crPolar)}\\ \\text{so there is ${v.entire ? 'no' : 'a'} mirror part}`, 'cart', null),
        v.entire ? mkRow('fprime', 'f′(z₀)', `f'(z) = ${v.fprimeTex}`, tp(L.A), 'cart', cz(L.A)) : mkRow('fprime', 'f′(z₀)', '\\text{no } f\'', '\\text{no single move}', 'cart', null));
      same = { cart: tn(crCart), polar: tn(crPolar), agree: holds === (crPolar < 1e-6) && holds === !!v.entire };
      break;
    }
    case 'P1': {
      sameLabel = 'same number';
      const { z1, z2 } = g;
      const prod = mul(z1, z2);
      const both = v.check.both;
      rows.push(
        ptRow('prod', 'z₁z₂', prod, null),
        ptRow('mirror', 'conj(z₁z₂)', conj(prod), 'polar'),
        mkRow('both', 'conj z₁ · conj z₂', `${par(tc(conj(z1)))}${par(tc(conj(z2)))} = ${tc(both)}`, `${tp(conj(z1))}\\cdot ${tp(conj(z2))} = ${tp(both)}`, 'polar', cz(both)));
      same = sameOf(C(z1.re * z2.re - z1.im * z2.im, -(z1.re * z2.im + z2.re * z1.im)), fromPolar(abs(z1) * abs(z2), -(Arg(z1) + Arg(z2))), both);
      break;
    }
    case 'P2': {
      sameLabel = 'same number';
      const z = v.check.z;
      const N = v.check.zzbar;
      rows.push(
        ptRow('z', 'z', z, null),
        mkRow('zzbar', 'z · conj z', `${par(tc(z))}${par(tc(conj(z)))} = x^2 + y^2 = ${tn(N)}`, `r e^{i\\theta}\\cdot r e^{-i\\theta} = r^2 = ${tn(N)}`, 'polar', N),
        lenRow('abs', 'the modulus', z, 'polar'));
      same = sameOf(C(z.re * z.re + z.im * z.im, 0), C(abs(z) ** 2, 0), C(N, 0));
      break;
    }
    case 'P3': {
      sameLabel = 'same value';
      const { a, b, c, d, coeff, shift } = v.check;
      rows.push(
        ptRow('a', 'a', a, null), ptRow('c', 'c', c, null),
        mkRow('coeff', 'ac', `${par(tc(a))}${par(tc(c))} = ${tc(coeff)}`, `${tp(a)}\\cdot ${tp(c)} = ${tp(coeff)}`, 'cart', cz(coeff)),
        mkRow('shift', 'ad + b', `${par(tc(a))}${par(tc(d))}${isTiny(b) ? '' : ' + ' + par(tc(b))} = ${tc(shift)}`, tp(shift), 'cart', cz(shift)));
      const cin = add(mul(a, add(mul(c, C(1, 0)), d)), b);
      same = sameOf(cin, add(coeff, shift), add(coeff, shift));
      break;
    }
    case 'P4': {
      sameLabel = 'same w';
      const a = g.a;
      const R = g.R;
      const aR = mul(a, C(R, 0));
      rows.push(
        ptRow('a', 'a', a, null),
        mkRow('radius', 'radius of the image', `\\sqrt{${tn(abs(a) ** 2)}\\cdot ${tn(R * R)}} = ${tn(v.radius)}`, `\\left|a\\right| R = ${tn(abs(a))}\\cdot ${tn(R)} = ${tn(v.radius)}`, 'polar', v.radius),
        mkRow('turn', 'Arg a (the turn)', null, `\\operatorname{Arg}\\,a = ${ta(Arg(a))}`, 'polar', Arg(a)),
        mkRow('sample', 'z = R goes to aR', `${tn(R)} \\mapsto ${par(tc(a))}${tn(R)} = ${tc(aR)}`, `${tn(R)} \\mapsto ${texExp(abs(a) * R, Arg(a))}`, 'polar', cz(aR)));
      same = sameOf(C(a.re * R, a.im * R), fromPolar(abs(a) * R, Arg(a)), aR);
      break;
    }
    case 'P5': {
      sameLabel = 'same value';
      const path = g.path;
      const th = pathAngle(path);
      const thc = v.contrast.axis === 'imaginary' || v.contrast.axis === 'imag' ? PI / 2 : 0;
      let cartCell;
      let cartZ;
      if (path.kind === 'line') { cartCell = `\\dfrac{1}{${tc(C(1, path.m))}} = ${tc(v.along)}`; cartZ = div(C(1, 0), C(1, path.m)); } else if (path.kind === 'vertical') { cartCell = '0'; cartZ = C(0, 0); } else { cartCell = '\\lim_{x \\to 0}\\dfrac{1}{1 + ix} = 1'; cartZ = C(1, 0); }
      rows.push(
        mkRow('along', 'value along this path', cartCell, `\\cos ${ta(th)}\\,e^{-i\\,${ta(th)}} = ${tc(v.along)}`, 'polar', cz(v.along)),
        mkRow('contrast', 'value along the other axis', tc(v.contrast.value), `\\cos ${ta(thc)}\\,e^{-i\\,${ta(thc)}} = ${tc(v.contrast.value)}`, 'polar', cz(v.contrast.value)),
        mkRow('circle', 'every direction', '\\left|w - \\tfrac{1}{2}\\right| = \\tfrac{1}{2}', '\\tfrac{1}{2} + \\tfrac{1}{2}\\,e^{-2i\\theta}', 'polar', null));
      same = sameOf(cartZ, fromPolar(Math.cos(th), -th), v.along);
      break;
    }
    case 'P7': {
      sameLabel = 'same f′';
      const c = v.c;
      const kindRow = v.kind === 'u' ? mkRow('kind', 'what is constant', `u(x, y) = ${tn(c)}`, `\\operatorname{Re}\\,w = ${tn(c)}\\ \\text{(a vertical line)}`, null, c)
        : v.kind === 'v' ? mkRow('kind', 'what is constant', `v(x, y) = ${tn(c)}`, `\\operatorname{Im}\\,w = ${tn(c)}\\ \\text{(a horizontal line)}`, null, c)
          : mkRow('kind', 'what is constant', `u^2 + v^2 = ${tn(c * c)}`, `\\left|w\\right| = ${tn(c)}\\ \\text{(a circle)}`, null, c);
      rows.push(kindRow, mkRow('fprime', 'f′ = u_x + i v_x', 'u_x + i\\,v_x = 0 + 0\\,i = 0', '\\left|f\'\\right| = 0:\\ \\text{no stretch, no turn}', 'cart', 0));
      same = sameOf(C(0, 0), C(0, 0), C(0, 0));              // the proof's conclusion, not a computation: agree by construction
      break;
    }
    default: {
      rows.push(ptRow('point', 'the point', ZERO, null));
      same = sameOf(ZERO, ZERO, ZERO);
    }
  }
  return { rows, same, sameLabel };
}

// ================================================================== the DOM (browser only; everything below is called from mount)

const LEDE = "The test will not use the handout's numbers, and it does not matter. Same place, new numbers: say the two decisions, make your guess, then see the worked answer in both addresses.";
const REVEAL_HINT = 'Set both decisions before you touch the plane. A card counts as right when both decisions are right and your guess is right or skipped.';
const TONES = { cart: '--cart', polar: '--polar', input: '--input', output: '--output', seam: '--seam', ok: '--ok', warn: '--warn', danger: '--danger', text: '--text', muted: '--text-muted' };
const tok = (t) => TONES[t] || '--text';
const dashOf = (d) => (d === 'excluded' ? DASH.excluded : d === 'seam' ? DASH.seam : d ? DASH.guide : null);
const AXIS_UV = ['2.1.1', '2.1.2', '2.1.3', '2.2.1', '2.3.1', '2.5.1', '3.1.1', '3.1.2', '3.2.1', 'P4', 'P5', 'P6', 'P7'];
const axisFor = (id) => (AXIS_UV.includes(id) ? ['u', 'v'] : ['Re', 'Im']);
const gridFor = (p) => { const t = new Set(addressTones(p.address)); return t.size === 2 ? 'both' : t.has('--polar') ? 'polar' : 'cart'; };
const toneOf = (p) => { const t = [...new Set(addressTones(p.address).map((x) => x.replace(/^--/, '')))]; return t.length === 1 ? t[0] : 'accent'; };
const niceStep = (hw) => [0.5, 0.25, 0.1, 0.05].find((s) => s <= hw / 16) || 0.05;
const word = (x) => (x === true ? 'right' : x === false ? 'wrong' : 'skipped');

const CSS = `
.rh-layout, .rh-card, .rh-task, .rh-guess, .rh-result, .rh-worked, .rh-open { min-width: 0; }
.rh-layout { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); }
.rh-card { display: grid; gap: var(--space-3); border-top: 4px solid var(--tone, var(--border-strong)); }
.rh-card[data-tone="cart"] { --tone: var(--cart); }
.rh-card[data-tone="polar"] { --tone: var(--polar); }
.rh-card > * { min-width: 0; margin: 0; }
.rh-statement { font-size: 1.1rem; overflow-wrap: anywhere; }
.rh-statement:focus { outline: none; }
.rh-task { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); grid-template-areas: "decide" "guess" "reveal"; align-items: start; }
.rh-decide { grid-area: decide; display: grid; gap: var(--space-2); min-width: 0; }
.rh-guess { grid-area: guess; display: grid; gap: var(--space-2); justify-items: start; }
.rh-reveal-row { grid-area: reveal; display: grid; gap: var(--space-2); justify-items: start; }
@media (min-width: 70rem) {
  .rh-task { grid-template-columns: minmax(0, 24rem) minmax(0, 1fr); grid-template-areas: "decide guess" "reveal guess"; grid-template-rows: auto 1fr; }
}
#rehearse-plane-host { width: 100%; max-width: 460px; }
#rehearse-plane-host[hidden], #rehearse-choice[hidden], #rehearse-handle-hint[hidden], #rehearse-place[hidden], #rehearse-result[hidden], #rehearse-verdict[hidden] { display: none; }
.rh-choice { display: grid; gap: var(--space-2); width: 100%; max-width: 32rem; }
.rh-choice .chip { justify-content: flex-start; text-align: left; white-space: normal; min-height: var(--tap); }
.rh-choice .chip > span { min-width: 0; overflow-wrap: anywhere; }
.rh-choice .chip[aria-checked="true"] { border-color: var(--input); box-shadow: 0 0 0 2px var(--input); }
.rh-choice .chip[aria-checked="true"]::before { content: "\\25CF\\00a0"; color: var(--input); }
.rh-choice .chip[data-mark="right"] { border-color: var(--ok); box-shadow: 0 0 0 2px var(--ok); }
.rh-choice .chip[data-mark="right"]::after { content: "\\00a0\\2713 correct"; color: var(--ok); font-weight: 600; }
.rh-choice .chip[data-mark="wrong"] { border-color: var(--danger); border-style: dashed; }
.rh-choice .chip[data-mark="wrong"]::after { content: "\\00a0\\2717 your pick"; color: var(--danger); font-weight: 600; }
.rh-verdict { padding: var(--space-2) var(--space-3); border-left: 4px solid var(--border-strong); background: var(--surface-2); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.rh-verdict:focus { outline: none; }
.rh-verdict:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.rh-verdict[data-right="true"] { border-left-color: var(--ok); }
.rh-verdict[data-right="false"] { border-left-color: var(--danger); border-left-style: dashed; }
.rh-verdict p { margin: 0 0 var(--space-1); }
.rh-verdict-head { font-weight: 700; }
.rh-result { display: grid; gap: var(--space-3); }
.rh-result > * { min-width: 0; margin: 0; }
.rh-result h3 { margin: 0 0 var(--space-1); font-size: 1.05rem; }
.rh-aha, .rh-same { overflow-wrap: anywhere; }
.rh-worked { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
.rh-route { padding-left: var(--space-2); border-left: 4px solid var(--tone, var(--border-strong)); }
.rh-route[data-tone="cart"] { --tone: var(--cart); }
.rh-route[data-tone="polar"] { --tone: var(--polar); }
.rh-route h3 { margin: 0 0 var(--space-1); font-size: 0.95rem; }
.rh-route p { margin: 0; overflow-wrap: anywhere; }
.rh-steps { margin: 0; padding-left: 0; list-style: none; display: grid; gap: var(--space-1); }
.rh-steps li { overflow-wrap: anywhere; }
.rh-steps li[data-home="true"] { font-weight: 700; color: var(--polar); }
.rh-steps-footer { margin: var(--space-1) 0 0; color: var(--text-muted); }
.rh-answer { padding: var(--space-1) var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); }
.rh-answer .katex-display { margin: 0.4em 0; }
.rh-answer-text { overflow-wrap: anywhere; margin: var(--space-1) 0 0; }
.rh-open { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
.rh-after { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rh-types { display: grid; gap: var(--space-2); grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr)); }
.rh-group { display: grid; gap: var(--space-1); margin-top: var(--space-2); }
.rh-group h3 { margin: 0; font-size: 0.95rem; color: var(--text-muted); }
.rh-type { flex-direction: column; align-items: center; gap: 0; padding-block: var(--space-1); }
.rh-type .rh-count { font-size: 0.78rem; color: var(--text-muted); }
.rh-type[aria-pressed="true"] .rh-count { color: inherit; }
.rh-score-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.rh-score-row progress { flex: 1 1 10rem; min-width: 8rem; height: 0.9rem; accent-color: var(--ok); }
.rh-cells { display: flex; flex-wrap: wrap; gap: 4px; margin-top: var(--space-2); }
.rh-cell { width: 0.9rem; height: 0.9rem; border: 2px solid var(--border-strong); border-radius: 3px; display: inline-block; }
.rh-cell:not([data-tried="0"]) { border-color: var(--polar); }
.rh-cell:not([data-right="0"]) { background: var(--ok); border-color: var(--ok); }
@media (prefers-reduced-motion: no-preference) {
  .rh-steps li { animation: rh-in 240ms ease both; animation-delay: calc(var(--k, 0) * 90ms); }
  @keyframes rh-in { from { opacity: 0; transform: translateY(4px); } }
}
`;

function injectStyle() {
  if (document.head.querySelector('style[data-for="rehearse"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'rehearse');
  s.textContent = CSS;
  document.head.appendChild(s);
}

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const k of Object.keys(attrs || {})) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}

// ---------------------------------------------------------------- drawing (5.8.4)

function wedgePoints(from, to, rMax) {
  const steps = Math.max(8, Math.ceil((Math.abs(to - from) / PI) * 24));
  const pts = [ZERO];
  for (let i = 0; i <= steps; i++) pts.push(fromPolar(rMax, from + ((to - from) * i) / steps));
  return pts;
}

// How far along `angle` from `from` the view's edge lies (plane units).
function edgeDistance(view, from, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const c = view.center;
  const hw = view.halfWidth;
  let t = Infinity;
  if (Math.abs(dx) > 1e-9) t = Math.min(t, ((dx > 0 ? c.re + hw : c.re - hw) - from.re) / dx);
  if (Math.abs(dy) > 1e-9) t = Math.min(t, ((dy > 0 ? c.im + hw : c.im - hw) - from.im) / dy);
  return Number.isFinite(t) && t > 0 ? t : hw;
}

function strokeRing(ctx, plane, z, radius, color, width = 2) {
  const p = plane.toPixel(z);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, TAU);
  ctx.lineWidth = width;
  ctx.strokeStyle = cssColor(color);
  ctx.stroke();
  ctx.restore();
}

// Where a word may go beside a dot, a circle, a ray, a line or an arc (preference order; the placer takes the first free spot).
function dotCands(z) {
  return [{ z, dx: 8, dy: -8, align: 'left' }, { z, dx: -8, dy: -8, align: 'right' }, { z, dx: 8, dy: 16, align: 'left' }, { z, dx: -8, dy: 16, align: 'right' }];
}
function circleCands(c, r) {
  return [45, 135, 225, 315].map((deg) => {
    const a = (deg * PI) / 180;
    return { z: add(c, fromPolar(r, a)), dx: 8 * Math.cos(a), dy: -8 * Math.sin(a), align: Math.cos(a) >= 0 ? 'left' : 'right' };
  });
}
function alongCands(view, from, angle) {
  const t = edgeDistance(view, from, angle);
  const out = [];
  for (const f of [0.75, 0.55, 0.9, 0.35]) {
    const z = add(from, fromPolar(f * t, angle));
    for (const side of [1, -1]) out.push({ z, dx: side * 10 * Math.sin(angle), dy: side * 10 * Math.cos(angle), align: side * Math.sin(angle) >= 0 ? 'left' : 'right' });
  }
  return out;
}

// Pass A fills, B lines (every one an obstacle for the words), C the two addresses, D dots, E words (last, so they see every line).
function drawPicture(ctx, plane, pic) {
  const view = pic.view;
  const hw = view.halfWidth;
  const items = pic.items;
  for (const it of items) {                                                           // A
    if (it.k === 'disk') drawCircle(ctx, plane, it.center, it.r, { color: tok(it.tone), fill: tok(it.tone), fillAlpha: it.alpha === undefined ? 0.12 : it.alpha, alpha: 0 });
    else if (it.k === 'wedge') drawPolygonFill(ctx, plane, wedgePoints(it.from, it.to, it.rMax), { color: tok(it.tone), alpha: it.alpha === undefined ? 0.12 : it.alpha });
    else if (it.k === 'annulus') {
      drawCircle(ctx, plane, it.center, it.r1, { color: tok(it.tone), fill: tok(it.tone), fillAlpha: 0.12, innerRadius: it.r0, dash: it.outerIncluded ? null : DASH.excluded });
      drawCircle(ctx, plane, it.center, it.r0, { color: tok(it.tone), dash: it.innerIncluded ? null : DASH.excluded });
    }
  }
  for (const it of items) {                                                           // B
    const color = tok(it.tone);
    const alpha = it.alpha === undefined ? 1 : it.alpha;
    if (it.k === 'circle') drawCircle(ctx, plane, it.center, it.r, { color, dash: dashOf(it.dash), obstacle: true });
    else if (it.k === 'ray') drawRay(ctx, plane, it.angle, { color, from: it.from || ZERO, alpha, dash: dashOf(it.dash), obstacle: true });
    else if (it.k === 'seam') {
      if (it.muted) drawRay(ctx, plane, it.angle, { color: '--seam', dash: DASH.seam, alpha: 0.55, width: 1.5, obstacle: true });
      else drawSeam(ctx, plane, it.angle, { label: it.label === undefined ? 'seam' : it.label });
    } else if (it.k === 'segment') drawSegment(ctx, plane, it.a, it.b, { color, dash: dashOf(it.dash), arrow: !!it.arrow, alpha, obstacle: true });
    else if (it.k === 'line') {
      const len = abs(it.dir) || 1;
      const span = (8 * hw + abs(it.point)) / len;
      drawSegment(ctx, plane, sub(it.point, { re: it.dir.re * span, im: it.dir.im * span }), add(it.point, { re: it.dir.re * span, im: it.dir.im * span }), { color, dash: dashOf(it.dash), obstacle: true });
    } else if (it.k === 'arc') drawArc(ctx, plane, it.center, it.r, it.from, it.to, { color, arrow: !!it.arrow, obstacle: true });
    else if (it.k === 'polygon') {
      const n = it.points.length;
      for (let i = 0; i < n; i++) drawSegment(ctx, plane, it.points[i], it.points[(i + 1) % n], { color, dash: dashOf(it.dash), alpha, obstacle: true });
    }
  }
  for (const it of items) {                                                           // C
    if (it.k === 'cartAddr') drawCartAddress(ctx, plane, it.z, { color: '--cart', names: it.names || null });
    else if (it.k === 'polarAddr') drawPolarAddress(ctx, plane, it.z, { color: '--polar', name: it.name || 'z', ghosts: it.ghosts || 0, ghostsNeg: it.ghostsNeg || 0 });
  }
  for (const it of items) {                                                           // D
    if (it.k !== 'dot') continue;
    if (it.ring) strokeRing(ctx, plane, it.z, (it.size || 5) + 1, tok(it.tone));
    else drawDot(ctx, plane, it.z, { color: tok(it.tone), radius: it.size || 5 });
  }
  const put = createLabelPlacer(ctx, plane);                                          // E
  for (const it of items) {
    if (!it.label) continue;
    const style = { color: tok(it.tone), knockout: true };
    const text = typeset(it.label);
    if (it.k === 'dot') put(text, dotCands(it.z), style);
    else if (it.k === 'circle') put(text, circleCands(it.center, it.r), style);
    else if (it.k === 'segment') put(text, sideCands(plane, it.a, it.b), style);
    else if (it.k === 'ray') put(text, alongCands(view, it.from || ZERO, it.angle), style);
    else if (it.k === 'line') put(text, alongCands(view, it.point, Math.atan2(it.dir.im, it.dir.re)), style);
    else if (it.k === 'arc') {
      const a = (it.from + it.to) / 2;
      put(text, [{ z: add(it.center, fromPolar(it.r, a)), dx: 8 * Math.cos(a), dy: -8 * Math.sin(a), align: Math.cos(a) >= 0 ? 'left' : 'right' }], style);
    } else if (it.k === 'seam' && it.muted && it.label) put(text, alongCands(view, ZERO, it.angle), { color: '--seam', knockout: true });
  }
}

// The student's guess over the answer: rings, the dashed miss connectors, the student's own circle, line or rays.
function drawGuessRings(ctx, plane, info) {
  const { kind, guess, target, tol } = info;
  if (!guess) return;
  if (kind === 'roots' || kind === 'point') {
    for (const pair of matchGuesses(target.points, guess)) {
      if (pair.guess) drawSegment(ctx, plane, pair.target, pair.guess, { color: pair.dist <= tol ? '--ok' : '--warn', dash: DASH.guide, width: 1.5 });
    }
    for (const z of guess) strokeRing(ctx, plane, z, 8, '--input');
  } else if (kind === 'circle') {
    drawCircle(ctx, plane, guess[0], abs(sub(guess[1], guess[0])), { color: '--input', dash: DASH.guide, width: 2 });
    for (const z of guess) strokeRing(ctx, plane, z, 8, '--input');
  } else if (kind === 'line') {
    const d = sub(guess[1], guess[0]);
    const len = abs(d);
    if (len > 1e-9) {
      const k = (8 * info.halfWidth) / len;
      drawSegment(ctx, plane, sub(guess[0], { re: d.re * k, im: d.im * k }), add(guess[1], { re: d.re * k, im: d.im * k }), { color: '--input', dash: DASH.guide, width: 1.5 });
    }
    for (const z of guess) strokeRing(ctx, plane, z, 8, '--input');
  } else if (kind === 'sector') {
    for (const z of guess) { if (abs(z) > 1e-6) drawRay(ctx, plane, Arg(z), { color: '--input', dash: DASH.guide, width: 1.5 }); strokeRing(ctx, plane, z, 8, '--input'); }
  }
}

// The live layer while the student drags: the circle through the rim, the line through the two points, the two rays.
function drawGuessLive(ctx, plane, kind, handles, halfWidth) {
  const pts = handles.map((hd) => hd.z);
  if (kind === 'circle') {
    drawCircle(ctx, plane, pts[0], abs(sub(pts[1], pts[0])), { color: '--input', dash: DASH.guide, fill: '--input', fillAlpha: 0.06, width: 2 });
    drawSegment(ctx, plane, pts[0], pts[1], { color: '--input', dash: DASH.guide, width: 1.5 });
  } else if (kind === 'line') {
    const d = sub(pts[1], pts[0]);
    const len = abs(d);
    if (len > 1e-9) {
      const k = (8 * halfWidth) / len;
      drawSegment(ctx, plane, sub(pts[0], { re: d.re * k, im: d.im * k }), add(pts[1], { re: d.re * k, im: d.im * k }), { color: '--input', dash: DASH.guide, width: 1.5 });
    }
  } else if (kind === 'sector') {
    for (const p of pts) if (abs(p) > 1e-6) drawRay(ctx, plane, Arg(p), { color: '--input', width: 1.5 });
  }
}

// The tolerance the generators' check() uses for a point or a root, so the connector colour agrees with it.
function pointTolerance(card) {
  const hw = guessHalf(card);
  const base = card.sketch.kind === 'roots' ? Math.min(0.2, 0.12 * abs(card.sketch.target.points[0])) : 0.15;
  return Math.min(0.25, Math.max(base, 0.04 * hw));
}

// ================================================================== mount

export function mount(el, ctx) {
  const t0 = performance.now();
  let disposed = false;
  let counter = 0;
  const store = ctx.store;
  const sget = (k, d) => { try { return store.get(k, d); } catch (e) { return d; } };
  const sset = (k, v, o) => { try { return store.set(k, v, o); } catch (e) { return false; } };
  let scores = sanitizeScores(sget(SCORES_KEY, {}));
  injectStyle();

  // ---- state of the card on screen
  let state = null;                     // { id, seed, card, picks, guess, touched, choice, revealed, verdict, detail, count }
  let plane = null;
  let handles = [];
  let explainer = null;
  let observer = null;
  let offTheme = null;
  let mountMs = 0;

  // ---- static DOM (section 2.2)
  const headerEl = header(ctx, { lede: LEDE, chips: false });
  const noteEl = h('div', { class: 'callout', id: 'rehearse-note', hidden: true });
  const errorEl = h('div', { class: 'callout', id: 'rehearse-error', role: 'alert', hidden: true });
  const titleEl = h('h2', { class: 'panel-title', id: 'rehearse-card-title' });
  const statementEl = h('p', { class: 'rh-statement', id: 'rehearse-statement', tabindex: '-1' });
  const placeEl = h('p', { id: 'rehearse-place', hidden: true });
  const promptEl = h('p', { class: 'muted', id: 'rehearse-prompt' });
  const hostEl = h('div', { id: 'rehearse-plane-host', hidden: true });
  const handleHintEl = h('p', { class: 'muted', id: 'rehearse-handle-hint', hidden: true });
  const choiceEl = h('div', { class: 'rh-choice', id: 'rehearse-choice', role: 'radiogroup', 'aria-labelledby': 'rehearse-prompt', hidden: true });
  const captionEl = h('p', { class: 'muted', id: 'rehearse-picture-caption' });
  const revealBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'rehearse-reveal' }, 'Reveal');
  const revealHint = h('p', { class: 'muted', id: 'rehearse-reveal-hint' }, REVEAL_HINT);

  const pickerInstance = picker({
    idPrefix: 'rehearse-decisions',
    onPick: (decision, value) => { if (!state) return; state.picks[decision] = value; refreshReadout(); },
  });

  const verdictHead = h('p', { class: 'rh-verdict-head', id: 'rehearse-verdict-head' });
  const verdictGuess = h('p', { id: 'rehearse-verdict-guess' });
  const scoreNote = h('p', { class: 'muted', id: 'rehearse-score-note' });
  const verdictEl = h('div', { class: 'rh-verdict', id: 'rehearse-verdict', role: 'status', tabindex: '-1', hidden: true }, verdictHead, verdictGuess, scoreNote);
  const samePlaceEl = h('p', { class: 'rh-same', id: 'rehearse-same-place' });
  const ahaEl = h('p', { class: 'rh-aha', id: 'rehearse-aha' });
  const answerBox = h('div', { class: 'tex-scroll rh-answer', id: 'rehearse-answer', tabindex: '0', role: 'group', 'aria-label': 'Answer, scrolls sideways if it is wide' });
  const answerHint = h('p', { class: 'muted', id: 'rehearse-answer-hint', hidden: true }, 'Scroll sideways to see the rest.');
  const answerText = h('p', { class: 'muted mono rh-answer-text', id: 'rehearse-answer-text' });
  const stepsTitle = h('h3', { id: 'rehearse-steps-title' });
  const stepsList = h('ol', { class: 'rh-steps', id: 'rehearse-steps' });
  const stepsFooter = h('p', { class: 'rh-steps-footer', id: 'rehearse-steps-footer' });
  const stepsWrap = h('div', { id: 'rehearse-steps-wrap', hidden: true }, stepsTitle, stepsList, stepsFooter);
  const exHost = h('div', { id: 'rehearse-ex-host' });
  const workedCartP = h('p');
  const workedPolarP = h('p');
  const workedCart = h('section', { class: 'rh-route', id: 'rehearse-worked-cart', 'data-tone': 'cart' }, h('h3', null, 'In Cartesian (slide)'), workedCartP);
  const workedPolar = h('section', { class: 'rh-route', id: 'rehearse-worked-polar', 'data-tone': 'polar' }, h('h3', null, 'In polar (spin and stretch)'), workedPolarP);
  const openStation = h('button', { type: 'button', class: 'btn', id: 'rehearse-open-station' }, 'Open at the station with these numbers');
  const openNote = h('p', { class: 'muted', id: 'rehearse-open-note', hidden: true });
  const openLab = h('button', { type: 'button', class: 'btn', id: 'rehearse-open-lab' }, 'Open in the Lab (predict first)');
  const resultEl = h('section', { class: 'rh-result', id: 'rehearse-result', 'aria-label': 'The worked answer', hidden: true },
    verdictEl, samePlaceEl, ahaEl,
    h('div', null, h('h3', null, 'The answer'), answerBox, answerHint, answerText),
    stepsWrap, exHost,
    h('div', { class: 'rh-worked' }, workedCart, workedPolar),
    h('div', { class: 'rh-open' }, openStation, openLab), openNote);

  const cardEl = h('article', { class: 'panel rh-card', id: 'rehearse-card', 'aria-labelledby': 'rehearse-card-title', 'data-revealed': 'false' },
    titleEl, statementEl, placeEl,
    h('div', { class: 'rh-task' },
      h('div', { class: 'rh-decide' }, pickerInstance.el),
      h('div', { class: 'rh-guess' }, promptEl, choiceEl, hostEl, handleHintEl, captionEl),
      h('div', { class: 'rh-reveal-row' }, revealBtn, revealHint)),
    resultEl);

  const anotherBtn = h('button', { type: 'button', class: 'btn', id: 'rehearse-another' }, 'Another one like it');
  const nextBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'rehearse-next-type' });
  const readoutEl = h('div', { class: 'readout', id: 'rehearse-readout', role: 'status', 'aria-live': 'off' });

  const typesHost = h('div', { id: 'rehearse-types' });
  const typesPanel = h('section', { class: 'panel', id: 'rehearse-types-panel', 'aria-labelledby': 'rehearse-types-title' }, h('h2', { class: 'panel-title', id: 'rehearse-types-title' }, 'Pick a type'), typesHost);
  const scoreLine = h('p', { id: 'rehearse-score-line' });
  const scoreBar = h('progress', { id: 'rehearse-score-bar', max: String(TYPE_ORDER.length), value: '0', 'aria-label': 'Types answered right at least once' });
  const cellsHost = h('div', { class: 'rh-cells' });
  const storageNote = h('p', { class: 'muted', id: 'rehearse-score-storage', hidden: true }, 'Scores last until you close this page: your browser is not keeping them.');
  const scoresPanel = h('section', { class: 'panel', id: 'rehearse-scores', 'aria-labelledby': 'rehearse-scores-title' },
    h('h2', { class: 'panel-title', id: 'rehearse-scores-title' }, 'Your score'), h('div', { class: 'rh-score-row' }, scoreLine, scoreBar), cellsHost, storageNote);
  const linksEl = links(ctx);

  el.append(headerEl, noteEl, errorEl, h('div', { class: 'rh-layout' }, cardEl, h('div', { class: 'rh-after' }, anotherBtn, nextBtn), readoutEl), typesPanel, scoresPanel, linksEl);

  // ---- the types and the scores (5.11)
  const typeChips = new Map();
  const cells = new Map();
  for (const g of typeGroups()) {
    const row = h('div', { class: 'rh-types' });
    for (const id of g.ids) {
      const countSpan = h('span', { class: 'rh-count' });
      const chip = h('button', { type: 'button', class: 'chip rh-type', id: `rehearse-type-${idKey(id)}` }, h('span', null, id), countSpan);
      chip.addEventListener('click', () => showCard(nextCard(id, null, Date.now(), counter++), { focus: true }));
      typeChips.set(id, { chip, countSpan });
      row.append(chip);
      const cell = h('span', { class: 'rh-cell', id: `rehearse-score-${idKey(id)}`, role: 'img', 'data-tried': '0', 'data-right': '0' });
      cells.set(id, cell);
      cellsHost.append(cell);
    }
    typesHost.append(h('div', { class: 'rh-group', id: `rehearse-group-${g.key}`, role: 'group', 'aria-labelledby': `rehearse-group-${g.key}-title` }, h('h3', { id: `rehearse-group-${g.key}-title` }, g.title), row));
  }

  function refreshTypes() {
    for (const [id, { chip, countSpan }] of typeChips) {
      const e = scores[id] || { tried: 0, right: 0 };
      chip.dataset.tried = String(e.tried);
      chip.dataset.right = String(e.right);
      countSpan.textContent = `${e.right}/${e.tried}`;
      chip.setAttribute('aria-label', `Type ${id}: ${e.right} right of ${e.tried} tried`);
      chip.setAttribute('aria-pressed', String(!!state && state.id === id));
    }
  }
  function refreshScores() {
    const s = scoreSummary(scores);
    scoreLine.textContent = s.tried === 0 ? 'Nothing rehearsed yet. The first card is the type you need most.' : `Right at least once: ${s.typesRight} of ${s.total} types. Cards tried: ${s.tried}.`;
    scoreBar.value = s.typesRight;
    for (const [id, cell] of cells) {
      const e = scores[id] || { tried: 0, right: 0 };
      cell.dataset.tried = String(e.tried);
      cell.dataset.right = String(e.right);
      const text = `${id}: ${e.right} right of ${e.tried} tried`;
      cell.setAttribute('aria-label', text);
      cell.title = text;
    }
  }
  const refreshNext = () => { nextBtn.textContent = `The type I need most: ${pickType(scores)}`; };
  function refreshReadout() {
    if (!state) return;
    readoutEl.textContent = readoutText({ id: state.id, seed: state.seed, picks: state.picks, count: state.count, touched: state.touched, choice: state.choice, revealed: state.revealed });
  }
  function refreshAnswerHint() { answerHint.hidden = !(answerBox.scrollWidth > answerBox.clientWidth + 1); }

  // ---- the card (5.4)
  function teardownCard() {
    if (plane) { plane.destroy(); plane = null; }
    handles = [];
    if (explainer) { explainer.destroy(); explainer = null; }
    pickerInstance.reset();
    pickerInstance.disable(false);
    choiceEl.replaceChildren();
    hostEl.replaceChildren();
    stepsList.replaceChildren();
    answerBox.replaceChildren();
    exHost.replaceChildren();
    workedCartP.replaceChildren();
    workedPolarP.replaceChildren();
  }

  function syncUrl(card) {
    const hash = `#rehearse-${idKey(card.id)}-s${card.seed}`;
    try { if (location.hash !== hash) history.replaceState(history.state, '', hash); } catch (e) { /* sandboxed: leave the bar alone */ }
  }

  function showCard(card, { focus = false } = {}) {
    if (disposed) return;
    if (!card) {
      errorEl.textContent = `I could not make a card for type ${state ? state.id : ''}. Press Another one like it.`;
      errorEl.hidden = false;
      return;
    }
    teardownCard();
    const p = problemById(card.id);
    const kind = card.sketch.kind;
    state = { id: card.id, seed: card.seed, card, picks: { address: null, names: null }, guess: null, touched: false, choice: null, revealed: false, verdict: null, detail: '', count: 0 };
    cardEl.dataset.problem = card.id;
    cardEl.dataset.seed = String(card.seed);
    cardEl.dataset.revealed = 'false';
    cardEl.dataset.kind = kind;
    cardEl.dataset.station = card.station;
    cardEl.dataset.tone = toneOf(p);
    titleEl.textContent = `Card for type ${card.id}`;
    statementEl.replaceChildren();
    appendStatement(statementEl, statementParts(card.statement));
    placeEl.hidden = true;
    placeEl.replaceChildren();
    resultEl.hidden = true;
    verdictEl.hidden = true;
    for (const a of ['data-address', 'data-names', 'data-guess', 'data-right']) verdictEl.removeAttribute(a);
    openNote.hidden = true;
    captionEl.textContent = '';
    promptEl.textContent = typeset(card.sketch.prompt);
    buildGuessUi(card, p);
    revealBtn.disabled = false;
    revealBtn.textContent = 'Reveal';
    readoutEl.setAttribute('aria-live', 'off');
    refreshTypes();
    refreshNext();
    refreshReadout();
    syncUrl(card);
    if (focus) statementEl.focus();
  }

  // ---- the guess plane (5.5) and the choice group (5.6)
  function buildGuessUi(card, p) {
    const kind = card.sketch.kind;
    choiceEl.hidden = true;
    hostEl.hidden = true;
    handleHintEl.hidden = true;
    if (GUESS_KINDS.includes(kind)) {
      const hw = guessHalf(card);
      const c0 = guessCenter(card);
      hostEl.hidden = false;
      plane = createPlane(hostEl, {
        id: 'rehearse-plane', xRange: [c0.re - hw, c0.re + hw], yRange: [c0.im - hw, c0.im + hw], grid: gridFor(p), axes: true, axisLabels: axisFor(card.id),
        interactive: false, controls: false, legend: false, aspect: 1, maxWidth: 460, tickLabels: true, ariaLabel: typeset(card.sketch.prompt),
      });
      const step = niceStep(hw);
      const specs = startGuess(card);
      state.count = specs.length;
      for (const spec of specs) {
        handles.push(plane.addPoint({
          id: spec.id, z: spec.z, color: '--input', label: spec.label, name: spec.name, radius: 8, step, draggable: true,
          onDrag: () => { if (!state || state.revealed) return; state.touched = true; refreshReadout(); if (plane) plane.requestDraw(); },
        }));
      }
      const live = handles;
      plane.addLayer((c, pl) => drawGuessLive(c, pl, kind, live, hw), { order: 20 });
      handleHintEl.hidden = false;
      handleHintEl.textContent = `Arrow keys move a focused dot by ${step}. Shift is ten times that, Alt is a tenth.`;
    } else if (kind === 'choice') {
      buildChoice(card.sketch.options);
      choiceEl.hidden = false;
    }
  }

  function selectChoice(chips, k) {
    state.choice = k;
    chips.forEach((chip, i) => { chip.setAttribute('aria-checked', String(i === k)); chip.tabIndex = i === k ? 0 : -1; });
    refreshReadout();
  }

  function buildChoice(options) {
    const chips = options.map((opt, k) => {
      const span = h('span');
      prose(span, typeset(opt));
      return h('button', { type: 'button', class: 'chip', id: `rehearse-choice-${k}`, role: 'radio', 'aria-checked': 'false', tabindex: k === 0 ? '0' : '-1' }, span);
    });
    chips.forEach((chip, k) => {
      chip.addEventListener('click', () => { if (!state.revealed) selectChoice(chips, k); });
      chip.addEventListener('keydown', (e) => {
        if (state.revealed) return;
        const n = chips.length;
        let j = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (k + 1) % n;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (k + n - 1) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectChoice(chips, k); return; }
        if (j === null) return;
        e.preventDefault();
        chips[j].focus();
        selectChoice(chips, j);
      });
      choiceEl.append(chip);
    });
  }

  const guessNow = () => handles.map((hd) => ({ re: hd.z.re, im: hd.z.im }));

  // ---- Reveal (5.7)
  function reveal() {
    if (disposed || !state || state.revealed) return;
    const card = state.card;
    const p = problemById(card.id);
    const kind = card.sketch.kind;
    let guess = null;
    if (GUESS_KINDS.includes(kind)) guess = state.touched ? guessNow() : null;
    else if (kind === 'choice') guess = state.choice;
    const v = verdict(card, state.picks, guess);
    const detail = guess === null ? '' : typeset(check(card, guess).detail);
    state.revealed = true;
    state.guess = guess;
    state.verdict = v;
    state.detail = detail;

    // scoring
    const fresh = sanitizeScores(sget(SCORES_KEY, {}));
    scores = recordScore(fresh, card.id, v.right, Date.now());
    const wrote = sset(SCORES_KEY, scores);
    if (v.right) sset('progress', setTicked(sanitizeProgress(sget('progress', {})), card.id, true));
    if (wrote === false) storageNote.hidden = false;

    pickerInstance.mark({ address: v.address, names: v.names, expected: { address: p.address, names: p.names } });
    pickerInstance.disable(true);
    cardEl.dataset.revealed = 'true';
    revealBtn.textContent = 'Revealed';
    revealBtn.disabled = true;

    verdictEl.dataset.address = word(v.address);
    verdictEl.dataset.names = word(v.names);
    verdictEl.dataset.guess = word(v.guess);
    verdictEl.dataset.right = String(v.right);
    verdictEl.hidden = false;
    verdictHead.textContent = verdictSentence(v, kind);
    if (kind === 'none') { verdictGuess.hidden = true; verdictGuess.textContent = ''; } else {
      verdictGuess.hidden = false;
      let line = guess === null ? 'Guess: skipped.' : 'Guess: ' + detail;
      if (kind === 'choice' && v.guess === false) line += ' The answer is: ' + typeset(card.sketch.options[card.sketch.correct]) + '.';
      verdictGuess.textContent = line;
    }
    const sc = scores[card.id];
    scoreNote.textContent = `Score for ${card.id}: ${sc.right} right of ${sc.tried} tried.`;

    // where it lives, and the same-place sentence
    const st = ctx.stations.find((s) => s.id === card.station);
    const placeLink = h('a', { id: 'rehearse-place-link', href: `#${card.station}` }, titleSpan(st ? st.title : card.station));
    const handoutLink = h('a', { id: 'rehearse-handout-link', href: `#problem-${idKey(card.id)}` }, `problem ${card.id}`);
    placeEl.replaceChildren('This card lives at ', placeLink, ". The handout's version is ", handoutLink, '.');
    placeEl.hidden = false;
    samePlaceEl.textContent = `Same place, new numbers. The handout's ${card.id} is settled the same way: Address ${addressLabel(p.address)}. Names ${p.names}.`;
    ahaEl.replaceChildren(h('strong', null, 'The aha. '));
    const ahaSpan = h('span');
    prose(ahaSpan, p.aha);
    ahaEl.append(ahaSpan);
    if (kind === 'choice') {
      const chips = [...choiceEl.querySelectorAll('button')];
      chips.forEach((chip, i) => {
        chip.setAttribute('aria-disabled', 'true');
        chip.tabIndex = -1;
        if (i === card.sketch.correct) chip.dataset.mark = 'right';
        else if (i === state.choice) chip.dataset.mark = 'wrong';
      });
    }

    // the picture
    if (plane) { plane.destroy(); plane = null; handles = []; }
    handleHintEl.hidden = true;
    hostEl.replaceChildren();
    hostEl.hidden = false;
    drawPictureNow(card, p, guess);

    // the steps
    const steps = stepList(card);
    stepsList.replaceChildren();
    stepsWrap.hidden = !steps;
    if (steps) {
      stepsTitle.textContent = steps.title;
      steps.rows.forEach((r) => {
        const li = h('li', { id: `rehearse-step-${r.k}`, 'data-k': String(r.k), 'data-home': String(r.home) }, r.text);
        li.style.setProperty('--k', String(r.k));
        stepsList.append(li);
      });
      stepsFooter.textContent = steps.footer;
    }

    // the answer
    tex(answerBox, card.answer.tex, { display: true });
    answerText.textContent = card.answer.text;
    refreshAnswerHint();

    // the explainer
    const data = explainerData(card);
    explainer = createExplainer(exHost, {
      id: 'rehearse-ex', title: 'The same numbers in both addresses',
      columns: [
        { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true, short: 'Cartesian' },
        { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true, short: 'Polar' },
      ],
      rows: data.rows.map((r) => ({ id: r.id, label: r.label, cart: r.cart, polar: r.polar, native: r.native })),
      same: () => data.same, sameLabel: data.sameLabel,
    });
    explainer.update(card);

    // the two routes in words
    prose(workedCartP, card.worked.cart);
    prose(workedPolarP, card.worked.polar);

    // the exits
    const req = requestFor(card);
    openStation.hidden = !req;
    openNote.hidden = !!req;
    if (req) {
      const span = h('span');
      prose(span, `Open at ${shortTitle(st ? st.title : card.station)} with these numbers`);
      openStation.replaceChildren(span);
    } else openNote.textContent = 'The station cannot draw this variant, so there is no button. The picture above is what it would show.';
    openLab.hidden = !labRequestFor(card);

    resultEl.hidden = false;
    readoutEl.setAttribute('aria-live', 'polite');
    refreshReadout();
    refreshTypes();
    refreshScores();
    refreshNext();
    verdictEl.focus();
  }

  // The picture plane (5.8.4): the same id and options as the guess plane, so the card does not jump.
  function drawPictureNow(card, p, guess) {
    const pic = pictureOf(card);
    const view = pic.view;
    const hasCurve = pic.items.some((i) => i.k === 'curve');
    plane = createPlane(hostEl, {
      id: 'rehearse-plane', xRange: [view.center.re - view.halfWidth, view.center.re + view.halfWidth], yRange: [view.center.im - view.halfWidth, view.center.im + view.halfWidth],
      grid: gridFor(p), axes: true, axisLabels: axisFor(card.id), interactive: false, controls: false, legend: hasCurve, aspect: 1, maxWidth: 460, tickLabels: true, ariaLabel: pic.alt,
    });
    pic.items.forEach((it, i) => {
      if (it.k === 'curve') plane.addCurve({ id: `rehearse-curve-${i}`, points: it.points, color: tok(it.tone), ramp: it.ramp !== false, arrow: true, dots: true, order: 5 });
    });
    plane.addLayer((c, pl) => drawPicture(c, pl, pic), { order: 10 });
    const kind = card.sketch.kind;
    if (guess && GUESS_KINDS.includes(kind)) {
      const info = { kind, guess, target: card.sketch.target, tol: pointTolerance(card), halfWidth: view.halfWidth };
      plane.addLayer((c, pl) => drawGuessRings(c, pl, info), { order: 20 });
    }
    captionEl.textContent = pic.caption;
  }

  // ---- events (4.5)
  revealBtn.addEventListener('click', reveal);
  anotherBtn.addEventListener('click', () => { if (state) showCard(nextCard(state.id, state.card, Date.now(), counter++), { focus: true }); });
  nextBtn.addEventListener('click', () => showCard(nextCard(pickType(scores), null, Date.now(), counter++), { focus: true }));
  openStation.addEventListener('click', () => {
    const req = state && requestFor(state.card);
    if (!req) return;
    sset('station.request', req, { persist: false });
    ctx.navigate(state.card.station);
  });
  openLab.addEventListener('click', () => {
    const lab = state && labRequestFor(state.card);
    if (!lab) return;
    sset('lab.request', lab, { persist: false });
    ctx.navigate('lab');
  });

  // ---- the opening card (5.3)
  const tokenStr = ctx.preset && ctx.preset.kind === 'token' ? ctx.preset.token : null;
  const parsed = tokenStr === null ? null : parseToken(tokenStr);
  const unknown = tokenStr !== null && parsed === null;
  const openId = parsed ? parsed.id : pickType(scores);
  let first = parsed && parsed.seed !== null ? generate(openId, parsed.seed) : nextCard(openId, null, Date.now(), counter++);
  if (!first) {
    for (let i = 1; i <= TYPE_ORDER.length && !first; i++) first = nextCard(TYPE_ORDER[(TYPE_ORDER.indexOf(openId) + i) % TYPE_ORDER.length], null, Date.now(), counter++);
    errorEl.textContent = `I could not make a card for type ${openId}. Press Another one like it.`;
    errorEl.hidden = false;
    console.warn('[rehearse] no card for', openId);
  }
  showCard(first, { focus: false });
  if (unknown) {
    noteEl.textContent = `There is no card called "${shorten(tokenStr, 24)}". Here is the type you need most.`;
    noteEl.hidden = false;
  }
  refreshTypes();
  refreshScores();
  refreshNext();

  // ---- observers, theme, hook (last), unmount (4.8)
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(() => refreshAnswerHint());
    observer.observe(answerBox);
  }
  if (ctx.theme && typeof ctx.theme.onThemeChange === 'function') offTheme = ctx.theme.onThemeChange(() => { if (plane) plane.requestDraw(); });

  const mv = (window.__mv = window.__mv || {});
  mountMs = performance.now() - t0;
  mv.rehearse = {
    card: () => state && state.card,
    state: () => ({
      id: state.id, seed: state.seed, picks: { address: state.picks.address, names: state.picks.names },
      guess: state.revealed ? (state.guess === null ? null : JSON.parse(JSON.stringify(state.guess))) : state.touched && handles.length ? guessNow() : null,
      revealed: state.revealed,
    }),
    generate: (id, seed) => generate(id, seed),
    scores: () => sanitizeScores(sget(SCORES_KEY, {})),
    mountMs,
  };

  return function unmount() {
    if (disposed) return;
    disposed = true;
    if (plane) { plane.destroy(); plane = null; }
    if (explainer) { explainer.destroy(); explainer = null; }
    pickerInstance.destroy();
    if (observer) { observer.disconnect(); observer = null; }
    if (offTheme) { try { offTheme(); } catch (e) { /* gone already */ } offTheme = null; }
    if (window.__mv && window.__mv.rehearse) delete window.__mv.rehearse;
  };
}
