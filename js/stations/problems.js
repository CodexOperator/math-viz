// js/stations/problems.js
// The Problem Index as a deck: all 29 review problems and proofs as one-line cards in handout order (number, the start of the
// statement, the two decision chips, a Rehearse link, the tick), opened one at a time or several at once; the 12 syllabus topics as
// one-line cards too; filters by chapter, by the Names decision and by what is not ticked; persisted ticks; predict-first; the
// address-balance strip.
//
// This module is also the leaf of the home station: the pure helpers that both stations need (shortTitle, sanitizeProgress,
// stationNeighbours, namesCounts, sanitizeScores, ...) live here and home.js imports them.
//
// No top-level DOM access, so every pure helper imports in Node. Every text goes through textContent, createTextNode, prose() or tex();
// there is no innerHTML in this file.
// Design: docs/designs/iter-2/i2-home-index-deck.md (this file is its Appendix A); docs/designs/iter-1/i1-station-home-problems.md for the parts it keeps.

import { STATIONS, THREADS, stationById, threadLabel, threadLinkPrefix } from '../registry.js';
import {
  PROBLEMS, TOPICS, problemById, topicById, problemsForTopic, routeFor, topicRoute, statementParts, addressLabel, addressTones,
} from '../data/problems.js';
import { tex, prose } from '../core/katex.js';
import { chips as decisionChips, NAMES_CODES, namesMeaning } from '../core/decisions.js';

export const PROGRESS_KEY = 'progress';          // { [problemId or topicId]: true }, persisted
export const PREDICT_KEY = 'problems.predict';   // boolean, persisted
export const FILTER_KEY = 'problems.filter';     // { chapter: 'all' | '1' | '2' | '3' | 'P', todo: boolean, names: NAMES_FILTERS[number] }, memory only
export const DECK_KEY = 'problems.deck';         // { open: string[], mode: 'one' | 'all' }, memory only
export const SCORES_KEY = 'rehearse.scores';     // { [problemId]: { tried, right, last } }, persisted; written by the Rehearsal Room, only read here
export const NAMES_FILTERS = Object.freeze(['all-names', ...NAMES_CODES]);   // 'all-names' is "no filter"
const CHAPTER_KEYS = ['all', '1', '2', '3', 'P'];
const ARM_MS = 4000;

// ---------------------------------------------------------------- pure helpers

export const idKey = (id) => String(id).replace(/\./g, '-');

// Text before the first ':' (trimmed); the whole title when there is none; '' for a non-string.
export const shortTitle = (t) => {
  const s = typeof t === 'string' ? t : '';
  const i = s.indexOf(':');
  return (i > 0 ? s.slice(0, i) : s).trim();
};

// A station title may write the exponent the handout way ("z^n: Fans and Parabolas"). In SVG text and in attributes, where no <sup> can go,
// typesetTitle writes it with Unicode superscripts ("zⁿ"); in HTML titleSpan sets the title with prose() inside ONE span, because the
// chips and station links are inline-flex and a bare text, <sup>, text would be three flex items (ARCHITECTURE 10.4.8).
const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', n: 'ⁿ', '-': '⁻', '+': '⁺' };
export function typesetTitle(t) {
  return String(t == null ? '' : t).replace(/\^(?:\{([0-9n+-]+)\}|([0-9n+-]+))/g, (m, braced, bare) => [...(braced || bare)].map((ch) => SUPER[ch]).join(''));
}

// Text before the first ':' or ';' (thread badges and legend chips).
export function shortThreadTitle(t) {
  return String(t).split(/[:;]/)[0].trim();
}

// -> { [id]: true } keeping only known problem or topic ids with a true value. An array of ids is accepted too.
export function sanitizeProgress(raw) {
  const out = {};
  const put = (k) => {
    if (typeof k === 'string' && (problemById(k) || topicById(k))) out[k] = true;
  };
  if (Array.isArray(raw)) raw.forEach(put);
  else if (raw && typeof raw === 'object') for (const k of Object.keys(raw)) if (raw[k] === true) put(k);
  return out;
}

// How many problems (not topics) are ticked.
export const countTicked = (progress, problems = PROBLEMS) => problems.filter((p) => progress && progress[p.id] === true).length;

// A new, sanitised object with id added (on) or removed; an unknown id changes nothing.
export function setTicked(progress, id, on) {
  const o = { ...sanitizeProgress(progress) };
  if (!(problemById(id) || topicById(id))) return o;
  if (on) o[id] = true;
  else delete o[id];
  return o;
}

// 'all' is every problem; 'P' the proof examples; '1' | '2' | '3' by handout chapter.
export function filterMatches(p, key) {
  if (key === 'all') return true;
  if (key === 'P') return p.chapter === 0 || p.kind === 'proof';
  return String(p.chapter) === key;
}

export function filterCounts(problems = PROBLEMS) {
  const c = { all: problems.length, '1': 0, '2': 0, '3': 0, P: 0 };
  for (const p of problems) for (const k of ['1', '2', '3', 'P']) if (filterMatches(p, k)) c[k]++;
  return c;
}

// The Names filter: 'all-names' (and anything that is not a Names code) lets every problem through; otherwise the problem's own names value.
export function namesFilterMatches(p, names) {
  if (!p || typeof p !== 'object') return false;
  if (!NAMES_CODES.includes(names)) return true;
  return p.names === names;
}

// How many problems each Names value settles: { none: 11, any: 12, all: 3, home: 2, continuous: 1 }.
export function namesCounts(problems = PROBLEMS) {
  const c = {};
  for (const code of NAMES_CODES) c[code] = 0;
  for (const p of problems) if (NAMES_CODES.includes(p.names)) c[p.names]++;
  return c;
}

// '1 problem', '11 problems', '0 problems': the count beside a Names choice and a topic.
export const problemCount = (n) => (n === 1 ? '1 problem' : `${n} problems`);

// -> { chapter, todo, names } with every field valid; anything else is the default (show everything).
export function normalizeFilter(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    chapter: CHAPTER_KEYS.includes(r.chapter) ? r.chapter : 'all',
    todo: r.todo === true,
    names: NAMES_FILTERS.includes(r.names) ? r.names : 'all-names',
  };
}

// The ids that pass the three filters, in handout order.
export function visibleIds(filter, progress, problems = PROBLEMS) {
  const f = normalizeFilter(filter);
  return problems
    .filter((p) => filterMatches(p, f.chapter) && namesFilterMatches(p, f.names) && (!f.todo || !(progress && progress[p.id] === true)))
    .map((p) => p.id);
}

// 'Chapter 1, names: any, not ticked yet' ('' when nothing is filtered): the words after "Showing 3 of 29:".
export function filterLabel(filter) {
  const f = normalizeFilter(filter);
  const bits = [];
  if (f.chapter === 'P') bits.push('Proofs');
  else if (f.chapter !== 'all') bits.push(`Chapter ${f.chapter}`);
  if (f.names !== 'all-names') bits.push(`names: ${f.names}`);
  if (f.todo) bits.push('not ticked yet');
  return bits.join(', ');
}

// The route token after "problems-": '3', 'p', 'todo', 'names-all', 'all'. Anything else is "show everything". The names key is present only for a names token.
export function parseProblemsToken(token) {
  const t = String(token == null ? '' : token).toLowerCase();
  const r = { chapter: 'all', todo: false };
  if (t === '1' || t === '2' || t === '3') r.chapter = t;
  else if (t === 'p') r.chapter = 'P';
  else if (t === 'todo') r.todo = true;
  else {
    const m = /^names-(all-names|none|any|all|home|continuous)$/.exec(t);
    if (m) r.names = m[1];
  }
  return r;
}

// The deck's own state from whatever the store holds: { open: ids in the order they were opened, mode }. In mode 'one' at most the last one stays open.
export function deckState(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const mode = r.mode === 'all' ? 'all' : 'one';
  const seen = new Set();
  const open = [];
  for (const id of Array.isArray(r.open) ? r.open : []) {
    if (typeof id === 'string' && problemById(id) && !seen.has(id)) {
      seen.add(id);
      open.push(id);
    }
  }
  return { open: mode === 'one' ? open.slice(-1) : open, mode };
}

// rehearse.scores from the store -> { [problemId]: { tried, right, last } } for known problems only; counts are whole numbers >= 0 and tried >= right.
export function sanitizeScores(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const count = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  for (const id of Object.keys(raw)) {
    const v = raw[id];
    if (!problemById(id) || !v || typeof v !== 'object') continue;
    const right = count(v.right);
    out[id] = { tried: Math.max(count(v.tried), right), right, last: typeof v.last === 'number' && Number.isFinite(v.last) && v.last > 0 ? v.last : 0 };
  }
  return out;
}

// The problems rehearsed right at least once, in handout order.
export function rehearsedIds(scores, problems = PROBLEMS) {
  const s = sanitizeScores(scores);
  return problems.filter((p) => s[p.id] && s[p.id].right >= 1).map((p) => p.id);
}

// How many of the problems are easiest in Cartesian, in polar, or use both (by the set of address tones).
export function addressBalance(problems = PROBLEMS) {
  const b = { cart: 0, polar: 0, both: 0 };
  for (const p of problems) {
    const s = new Set(addressTones(p.address));
    if (s.size >= 2) b.both++;
    else if (s.has('--cart')) b.cart++;
    else if (s.has('--polar')) b.polar++;
  }
  return b;
}

// { prev, next, thread: { T1: { prev, next }, ... } } as station ids (null at an end). Unknown id: all empty.
export function stationNeighbours(stations, id) {
  const list = stations.slice().sort((a, b) => a.order - b.order);
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { prev: null, next: null, thread: {} };
  const out = { prev: i > 0 ? list[i - 1].id : null, next: i + 1 < list.length ? list[i + 1].id : null, thread: {} };
  for (const t of list[i].threads) {
    const members = list.filter((s) => s.threads.includes(t));
    const j = members.findIndex((s) => s.id === id);
    out.thread[t] = { prev: j > 0 ? members[j - 1].id : null, next: j + 1 < members.length ? members[j + 1].id : null };
  }
  return out;
}

// Native routes of a problem: the set of address tones mapped to 'cart' / 'polar'.
const nativeRoutes = (p) => [...new Set(addressTones(p.address).map((t) => t.replace(/^--/, '')))];

// The statement parts of statementParts(), with any closing punctuation that opens the text part after a maths part moved onto that
// maths part: [{ math: false, text } | { math: true, text, tail }]. The caller keeps a maths part and its tail on one line, so the
// full stop of "... = z_2." never wraps onto a line of its own. Pure; a part that is only punctuation disappears into the tail.
const TAIL = /^[.,;:!?)\]]+/;
export function statementNodes(parts) {
  const out = [];
  for (const part of Array.isArray(parts) ? parts : []) {
    const last = out[out.length - 1];
    if (!part.math) {
      const m = last && last.math && last.tail === '' ? TAIL.exec(part.text) : null;
      if (m) {
        last.tail = m[0];
        if (part.text.length > m[0].length) out.push({ math: false, text: part.text.slice(m[0].length) });
        continue;
      }
      out.push({ math: false, text: part.text });
    } else out.push({ math: true, text: part.text, tail: '' });
  }
  return out;
}

// Browser only. Renders statementParts(...) into host: text through createTextNode, maths through tex() into a span of mathClass;
// a maths part with a tail goes into a nowrap span together with it.
export function appendStatement(host, parts, mathClass = '') {
  for (const node of statementNodes(parts)) {
    if (!node.math) { host.append(document.createTextNode(node.text)); continue; }
    const m = document.createElement('span');
    if (mathClass) m.className = mathClass;
    tex(m, node.text);
    if (!node.tail) { host.append(m); continue; }
    const run = document.createElement('span');
    run.style.whiteSpace = 'nowrap';
    run.append(m, document.createTextNode(node.tail));
    host.append(run);
  }
}

// ---------------------------------------------------------------- station CSS (tokens only; every rule prefixed)
// Every deck rule starts with .problems-deck or .problems-topics so that the shared station-kit rules for `.problem-card` (injected by
// whichever station was visited first and never removed) cannot reach the index.

const CSS = `
.problems-tools { display: grid; gap: var(--space-2); }
.problems-progress-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.problems-progress-row progress { flex: 1 1 10rem; min-width: 8rem; height: 0.9rem; accent-color: var(--ok); }
.problems-progress-row p { margin: 0; font-weight: 700; }
.problems-tools .check { min-width: 0; }
.pf-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); min-width: 0; }
.pf-label { flex: none; min-width: 3.4rem; color: var(--text-muted); font-size: 0.88rem; font-weight: 700; }
.pf-row .chip, .pf-row .btn { min-height: 2.25rem; padding-block: 0; font-size: 0.9rem; }
.problems-key { margin: 0; color: var(--text-muted); font-size: 0.88rem; line-height: 1.45; }
.problems-count { margin: 0; }
.problems-balance-note { margin: var(--space-2) 0 0; }
.problems-balance-panel h2 { font-size: 1.15rem; }
.problems-group h2 { margin: var(--space-3) 0 var(--space-2); font-size: 1.3rem; }
.problems-deck .pc-list, .problems-topics .pc-list { display: grid; gap: 6px; margin: 0; padding: 0; }
.problems-deck .problem-card, .problems-topics .topic-card {
  position: relative; display: block; min-width: 0; margin: 0; padding: 4px var(--space-2) 4px 14px;
  border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); box-shadow: none;
}
.problems-deck .problem-card > *, .problems-topics .topic-card > * { margin: 0; }
.problems-deck .problem-card::before, .problems-topics .topic-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: var(--radius) 0 0 var(--radius); background: var(--tone, var(--border-strong));
}
.problems-deck .problem-card { --tone: var(--border-strong); }
.problems-deck .problem-card[data-tone="cart"] { --tone: var(--cart); }
.problems-deck .problem-card[data-tone="polar"] { --tone: var(--polar); }
.problems-deck .problem-card[data-tone="both"]::before { background: linear-gradient(to bottom, var(--cart) 50%, var(--polar) 50%); }
.problems-topics .topic-card[data-thread="T1"] { --tone: var(--cart); }
.problems-topics .topic-card[data-thread="T2"] { --tone: var(--polar); }
.problems-topics .topic-card[data-thread="T3"] { --tone: var(--output); }
.pc-row, .tc-row {
  display: grid; grid-template-columns: 2.5rem auto minmax(0, 1fr) auto; grid-template-areas: "open title line actions";
  align-items: center; column-gap: var(--space-2); min-height: 2.5rem;
}
.pc-open { grid-area: open; display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; padding: 0;
  border: 1.5px solid transparent; border-radius: var(--radius-sm); background: transparent; color: var(--text); cursor: pointer; }
.pc-open:hover { background: var(--surface-2); border-color: var(--border-strong); }
.pc-chevron { width: 0.55em; height: 0.55em; border-right: 2px solid currentcolor; border-bottom: 2px solid currentcolor; transform: rotate(-45deg); }
.pc-open[aria-expanded="true"] .pc-chevron { transform: rotate(45deg); }
.pc-title, .tc-title { grid-area: title; display: flex; align-items: baseline; gap: var(--space-2); margin: 0; font-family: var(--font); font-size: 1rem; line-height: 1.3; }
.pc-title { min-width: 3.6rem; }
.pc-id { font-family: var(--font-mono); font-weight: 700; }
.problems-deck .problem-card[data-done="true"] .pc-id { border-color: var(--ok); }
.pc-section { display: none; color: var(--text-muted); font-weight: 500; }
.problem-card[data-open="true"] .pc-section { display: inline; }
.pc-statement { position: relative; grid-area: line; min-width: 0; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: clip; cursor: pointer;
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 1.6rem), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 1.6rem), transparent); }
.pc-actions, .tc-actions { grid-area: actions; display: flex; align-items: center; gap: 6px; min-width: 0; }
.problems-deck .decisions { flex-wrap: nowrap; gap: 6px; }
.problems-deck .decisions .decision-chip { min-height: 1.75rem; padding: 0 0.55rem; font-size: 0.82rem; white-space: nowrap; }
.pc-rehearse { --tone: var(--border-strong); min-height: 1.75rem; padding: 0 0.65rem; font-size: 0.85rem; white-space: nowrap; }
.pc-rehearse[data-rehearsed="true"] { border-color: var(--polar); }
.pc-tick { min-height: 2.25rem; gap: 6px; font-size: 0.88rem; white-space: nowrap; }
.tc-row { grid-template-areas: "open title title actions"; }
.problem-card[data-open="true"] .pc-row { grid-template-areas: "open title title actions" ". line line line"; row-gap: var(--space-1); }
.problem-card[data-open="true"] .pc-statement { white-space: normal; overflow: visible; overflow-x: auto; -webkit-mask-image: none; mask-image: none; overflow-wrap: anywhere; cursor: auto; padding: 0 0 var(--space-1); }
.pc-body { padding: var(--space-1) 0 var(--space-2) calc(2.5rem + var(--space-2)); display: grid; gap: var(--space-2); min-width: 0; }
.pc-hint { display: grid; gap: var(--space-2); }
.pc-hint p, .pc-body p { margin: 0; }
.pc-also { margin-left: var(--space-2); }
.pc-also::before { content: '\\00b7'; margin-right: var(--space-2); color: var(--text-muted); }
.pc-place .chip, .pc-also .chip { margin: 0 var(--space-1); min-height: 2rem; font-family: var(--font-mono); font-size: 0.88rem; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .pc-hint { display: none; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .decisions { display: none; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) { --tone: var(--border-strong); }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"])::before { background: var(--border-strong); }
.pc-predict-note { display: none; margin: 0; color: var(--text-muted); font-style: italic; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .pc-predict-note { display: block; }
.addr { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; margin-right: var(--space-2); }
.addr-dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--tone, var(--text-muted)); flex: none; }
.addr-dot[data-tone="cart"] { --tone: var(--cart); }
.addr-dot[data-tone="polar"] { --tone: var(--polar); }
.pc-reveal-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.pc-label { margin: 0 0 var(--space-1); }
.answer { display: grid; gap: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--border); }
.pc-final { overflow-x: auto; max-width: 100%; padding: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); }
.pc-final .katex-display { margin: 0.4em 0; max-width: none; overflow: visible; }
.pc-scroll-hint { margin: 0; font-size: 0.88rem; }
.pc-plain summary { min-height: var(--tap); display: flex; align-items: center; cursor: pointer; font-weight: 600; }
/* display:flex removes the browser's triangle, so draw the chevron the shell uses for the colour key */
.pc-plain summary::before { content: ""; flex: none; width: 0.5em; height: 0.5em; margin-right: 0.7em; border-right: 2px solid currentcolor;
  border-bottom: 2px solid currentcolor; transform: rotate(-45deg); }
.pc-plain[open] > summary::before { transform: rotate(45deg); }
.pc-plain p { margin: 0 0 var(--space-2); }
.pc-routes { display: grid; gap: var(--space-2); grid-template-columns: 1fr; }
.pc-route { padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3); border-left: 4px solid var(--tone, var(--border-strong)); }
.pc-route[data-route="cart"] { --tone: var(--cart); }
.pc-route[data-route="polar"] { --tone: var(--polar); }
.pc-route h4 { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0 0 var(--space-1); color: var(--tone); }
.pc-route p { margin: 0; }
.pb-grid { display: flex; flex-wrap: wrap; gap: 4px; }
.pb-cell { width: 1.1rem; height: 1.1rem; border-radius: 3px; background: var(--tone, var(--text-muted)); }
.pb-cell[data-kind="cart"] { --tone: var(--cart); }
.pb-cell[data-kind="polar"] { --tone: var(--polar); }
.pb-cell[data-kind="both"] { background: linear-gradient(90deg, var(--cart) 50%, var(--polar) 50%); }
.problems-topics h2 { margin: 0 0 var(--space-1); }
.problems-topics > p { margin: 0 0 var(--space-2); }
.tc-count { color: var(--text-muted); font-size: 0.88rem; white-space: nowrap; }
.tc-body { display: grid; gap: var(--space-2); padding: var(--space-1) 0 var(--space-2) calc(2.5rem + var(--space-2)); min-width: 0; }
.tc-body p, .tc-body ul { margin: 0; }
.tc-body ul { padding-left: 1.2rem; }
.tc-body .tc-label { font-weight: 700; font-size: 0.9rem; color: var(--text-muted); }
.tc-body .chips .chip { min-height: 2rem; font-size: 0.88rem; }
.tc-body .btn { justify-self: start; }
@media (max-width: 40rem) {
  .pc-row, .tc-row { grid-template-columns: 2.75rem auto minmax(0, 1fr); grid-template-areas: "open title line" ". actions actions"; row-gap: 2px; }
  .pc-open { width: 2.75rem; height: 2.75rem; }
  .problem-card[data-open="true"] .pc-row { grid-template-areas: "open title title" ". line line" ". actions actions"; }
  .tc-row { grid-template-areas: "open title title" ". actions actions"; }
  .pc-actions, .tc-actions { flex-wrap: wrap; gap: 4px; }
  .problems-deck .decisions { gap: 4px; }
  .problems-deck .decisions .decision-chip { padding: 0 0.4rem; font-size: 0.78rem; }
  .pc-rehearse { min-height: 2.25rem; padding: 0 0.5rem; font-size: 0.8rem; }
  .pc-tick { min-height: var(--tap); }
  .pc-tick-text { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .pc-body, .tc-body { padding-left: var(--space-2); }
}
`;

// ---------------------------------------------------------------- DOM helpers (browser only; called from mount)

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}

// The title of a station as one <span>, the exponent raised (see typesetTitle).
export function titleSpan(text) {
  const span = document.createElement('span');
  prose(span, String(text == null ? '' : text));
  return span;
}

function injectStyle(name, css) {
  const s = document.createElement('style');
  s.setAttribute('data-for', name);
  s.textContent = css;
  document.head.appendChild(s);
  return s;
}

function toneName(token) {
  return String(token).replace(/^--/, '');
}

const threadOf = (id) => THREADS.find((t) => t.id === id) || null;

// The row's chips: the decisions.js chips (so the marks and tints are the site's one vocabulary), with the text cut to the short form that
// fits a one-line row: "C→P→C" for the address, the bare value for the names; the full words stay in the title and in screen-reader text.
function compactChips(host, p) {
  const swap = (chip, visible, hidden) => {
    if (!chip) return;
    let text = null;
    for (const n of chip.childNodes) if (n.nodeType === 3) text = n;
    if (!text) return;
    text.textContent = visible;
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = hidden;
    if (hidden.startsWith(', ')) chip.append(sr);
    else chip.insertBefore(sr, text);
  };
  swap(host.querySelector('[data-decision="address"]'), addressLabel(p.address, { short: true }), `, ${addressLabel(p.address)}`);
  swap(host.querySelector('[data-decision="names"]'), p.names, 'Names: ');
}

// ---------------------------------------------------------------- mount

export function mount(el, ctx) {
  const t0 = performance.now();
  const store = ctx.store;
  const here = ctx.station && ctx.station.id ? ctx.station.id : 'problems';
  const self = stationById(here) || stationById('problems');
  const style = injectStyle('problems', CSS);

  const safeGet = (key, fallback) => {
    try { return store.get(key, fallback); } catch { return fallback; }
  };
  const safeSet = (key, value, opts) => {
    try { store.set(key, value, opts); } catch { /* the store is memory-first; nothing to do */ }
  };
  const safeRemove = (key) => {
    try { store.remove(key); } catch { /* ignore */ }
  };

  // ---- state
  let progress = sanitizeProgress(safeGet(PROGRESS_KEY, {}));
  let predict = safeGet(PREDICT_KEY, false) === true;
  const scores = sanitizeScores(safeGet(SCORES_KEY, {}));
  const filter = normalizeFilter(safeGet(FILTER_KEY, null));
  if (ctx.preset && ctx.preset.kind === 'token') {
    const f = parseProblemsToken(ctx.preset.token);
    filter.chapter = f.chapter;
    filter.todo = f.todo;
    filter.names = f.names || 'all-names';
  }
  const deck = deckState(safeGet(DECK_KEY, null));
  const revealed = new Set();     // problems whose answer is showing
  const total = PROBLEMS.length;
  const counts = filterCounts();
  const nCounts = namesCounts();
  const cards = new Map();        // problem id -> { card, answer, btn, openBtn, body, tick, rehearse, built, problem }
  const groups = new Map();       // chapter key -> section
  const topics = new Map();       // topic id -> { card, openBtn, body, tick }
  let armed = false;
  let armTimer = 0;
  let resizeRaf = 0;
  let relayoutHooked = false;

  // ---- header
  const header = h('header', { class: 'station-header' },
    h('h1', null, self.title),
    h('p', { class: 'station-lede' },
      'All 29 problems, one line each. Open a row to see where it lives, which address and which names it needs, and the one-sentence aha. Press Rehearse for the same problem with fresh numbers.'));
  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'Story threads that pass through this place' });
  for (const tid of self.threads || []) {
    const th = threadOf(tid);
    if (!th) continue;
    badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': tid, title: th.summary }, threadLabel(th))));
  }
  header.append(badges);

  // ---- tools: progress, filters, deck controls, predict
  const progressText = h('p', { id: 'problems-progress', role: 'status' });
  const progressBar = h('progress', { id: 'problems-progress-bar', max: String(total), value: '0', 'aria-labelledby': 'problems-progress' });
  const clearBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-clear' }, 'Clear all ticks');

  const filterBox = h('div', { class: 'pf-row chips', id: 'problems-filters', role: 'group', 'aria-label': 'Show' }, h('span', { class: 'pf-label' }, 'Show'));
  const chapterChips = new Map();
  for (const [key, label] of [['all', `All (${counts.all})`], ['1', `Chapter 1 (${counts['1']})`], ['2', `Chapter 2 (${counts['2']})`],
    ['3', `Chapter 3 (${counts['3']})`], ['P', `Proofs (${counts.P})`]]) {
    const chip = h('button', { type: 'button', class: 'chip', id: `problems-filter-${key}`, 'aria-pressed': 'false', 'data-filter': key }, label);
    chapterChips.set(key, chip);
    filterBox.append(chip);
  }
  const todoChip = h('button', { type: 'button', class: 'chip', id: 'problems-filter-todo', 'aria-pressed': 'false' }, `Not ticked yet (${total})`);
  filterBox.append(todoChip);

  const namesBox = h('div', { class: 'pf-row chips', id: 'problems-filters-names', role: 'group', 'aria-label': 'Names decision' }, h('span', { class: 'pf-label' }, 'Names'));
  const namesChips = new Map();
  for (const key of NAMES_FILTERS) {
    const label = key === 'all-names' ? `No filter (${total})` : `${key} (${nCounts[key]})`;
    const chip = h('button', {
      type: 'button', class: 'chip', id: `problems-filter-names-${key}`, 'aria-pressed': 'false', 'data-names': key, title: key === 'all-names' ? 'Show every problem' : namesMeaning(key),
    }, label);
    namesChips.set(key, chip);
    namesBox.append(chip);
  }

  const modeOne = h('button', { type: 'button', class: 'chip', id: 'problems-mode-one', 'aria-pressed': 'true' }, 'One at a time');
  const modeAll = h('button', { type: 'button', class: 'chip', id: 'problems-mode-all', 'aria-pressed': 'false' }, 'Keep several open');
  const openAllBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-open-all' }, 'Open all shown');
  const collapseAllBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-collapse-all', disabled: true }, 'Collapse all');
  const hideAllBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-hide-all', disabled: true }, 'Hide all answers');
  const deckBox = h('div', { class: 'pf-row chips', id: 'problems-deck-controls', role: 'group', 'aria-label': 'Open and close rows' },
    h('span', { class: 'pf-label' }, 'Rows'), modeOne, modeAll, openAllBtn, collapseAllBtn, hideAllBtn);

  const predictBox = h('input', { type: 'checkbox', id: 'problems-predict' });
  predictBox.checked = predict;
  const predictLabel = h('label', { class: 'check', for: 'problems-predict' }, predictBox,
    h('span', null, 'Predict first: hide the place, the two chips and the aha until I reveal'));
  const countText = h('p', { id: 'problems-count', role: 'status', class: 'muted problems-count' });
  const deckStatus = h('p', { id: 'problems-deck-status', class: 'sr-only', role: 'status' });
  const keyLine = h('p', { class: 'problems-key', id: 'problems-key' },
    'In a row, the first chip is the address (C is Cartesian, a slide; P is polar, a move; an arrow means convert) and the second is the names decision (none, any, all, home or continuous). Open a row for the words.');
  const tools = h('section', { class: 'panel problems-tools', id: 'problems-tools', 'aria-label': 'Progress and filters' },
    h('div', { class: 'problems-progress-row' }, progressBar, progressText, clearBtn),
    filterBox, namesBox, deckBox, h('div', { class: 'row' }, predictLabel), countText, keyLine, deckStatus);

  // ---- address balance
  const balanceCells = h('div', { class: 'pb-grid', id: 'problems-balance', role: 'img' });
  const balanceNote = h('p', { class: 'muted problems-balance-note' });
  const balancePanel = h('section', { class: 'panel problems-balance-panel', id: 'problems-balance-panel' },
    h('h2', { class: 'panel-title' }, 'Which address makes each question easy?'),
    balanceCells, balanceNote);

  // ---- deck
  const deckEl = h('div', { class: 'problems-deck', id: 'problems-deck', 'data-predict': String(predict) });
  const showAllBtn = h('button', { type: 'button', class: 'btn', id: 'problems-show-all' }, 'Show all');
  const emptyMsg = h('p', { class: 'callout', id: 'problems-empty', hidden: true }, 'No cards match these filters. ', showAllBtn);

  // ---- card
  function buildCard(p) {
    const k = idKey(p.id);
    const titleId = `problems-card-${k}-title`;
    const tones = new Set(addressTones(p.address));
    const card = h('article', {
      class: 'problem-card', id: `problems-card-${k}`, 'data-problem': p.id, 'data-chapter': p.chapter, 'data-kind': p.kind, 'data-thread': p.thread,
      'data-address': p.address, 'data-names': p.names, 'data-station': p.station, 'data-tone': tones.size >= 2 ? 'both' : tones.has('--cart') ? 'cart' : 'polar',
      'data-open': 'false', 'data-revealed': 'false', 'data-done': String(progress[p.id] === true), 'aria-labelledby': titleId,
    });

    // the one-line row: toggle, number (section when open), statement, [address chip, names chip, Rehearse, tick]
    const openBtn = h('button', { type: 'button', class: 'pc-open', id: `problems-open-${k}`, 'aria-expanded': 'false', 'aria-label': `Details of problem ${p.id}` },
      h('span', { class: 'pc-chevron', 'aria-hidden': 'true' }));
    const title = h('h3', { class: 'pc-title', id: titleId }, h('span', { class: 'badge pc-id' }, p.id), h('span', { class: 'pc-section' }, p.section));
    const statement = h('div', { class: 'pc-statement' });
    appendStatement(statement, statementParts(p.statement), 'pc-math');
    let decisions;
    try {
      decisions = decisionChips(p, { idPrefix: `problems-card-${k}`, meaning: false });
      compactChips(decisions, p);
    } catch (err) {
      console.error(`[problems] the chips of ${p.id} could not be drawn`, err);
      decisions = h('span', { class: 'decisions' }, `${addressLabel(p.address, { short: true })} · ${p.names}`);
    }
    const rehearse = h('a', {
      class: 'chip pc-rehearse', id: `problems-rehearse-${k}`, href: `#rehearse-${k}`, 'data-rehearsed': 'false',
      title: 'The same problem with fresh numbers', 'aria-label': `Rehearse problem ${p.id} with fresh numbers`,
    }, 'Rehearse');
    const tick = h('input', { type: 'checkbox', id: `problems-tick-${k}` });
    tick.checked = progress[p.id] === true;
    const tickLabel = h('label', { class: 'check pc-tick', for: `problems-tick-${k}` }, tick,
      h('span', { class: 'pc-tick-text' }, 'Got it'), h('span', { class: 'sr-only' }, ` (problem ${p.id})`));
    const row = h('div', { class: 'pc-row' }, openBtn, title, statement, h('div', { class: 'pc-actions' }, decisions, rehearse, tickLabel));

    // the body: place (the one link to the owner), address and names in words, the aha, then Reveal and the answer
    const st = stationById(p.station);
    const place = h('p', { class: 'pc-place' }, 'Lives at ',
      h('a', { class: 'chip station-chip', href: `#${routeFor(p.id)}`, 'data-station': p.station, title: st ? typesetTitle(st.title) : '' }, p.station),
      st ? h('span', { class: 'muted' }, titleSpan(st.title)) : null);
    if (p.alsoAt && p.alsoAt.length) {
      const also = h('span', { class: 'pc-also' }, 'Also at');
      for (const sid of p.alsoAt) also.append(h('a', { class: 'chip', href: `#${sid}`, 'data-station': sid }, sid));
      place.append(also);
    }
    const addr = h('span', { class: 'addr', 'data-code': p.address });
    for (const tone of addressTones(p.address)) addr.append(h('span', { class: 'addr-dot', 'data-tone': toneName(tone), 'aria-hidden': 'true' }));
    addr.append(document.createTextNode(addressLabel(p.address)));
    const why = h('span', null);
    prose(why, p.addressWhy);
    const addrLine = h('p', { class: 'pc-address' }, addr, why);
    const namesLine = h('p', { class: 'pc-names' }, h('strong', null, `Names: ${p.names}. `), document.createTextNode(namesMeaning(p.names)));
    const aha = h('span', null);
    prose(aha, p.aha);
    const ahaLine = h('p', { class: 'pc-aha' }, h('strong', null, 'The aha. '), aha);
    const hint = h('div', { class: 'pc-hint' }, place, addrLine, namesLine, ahaLine);
    const predictNote = h('p', { class: 'pc-predict-note' }, 'Say it first: which place, which address, which names, and what is the aha?');
    const answer = h('div', { class: 'answer', id: `problems-answer-${k}`, hidden: true, 'data-answer-for': p.id });
    const btn = h('button', {
      type: 'button', class: 'btn reveal', id: `problems-reveal-${k}`, 'aria-expanded': 'false', 'aria-controls': `problems-answer-${k}`,
    }, 'Show the answer');
    const body = h('div', { class: 'pc-body', hidden: true }, hint, predictNote, h('div', { class: 'pc-reveal-row' }, btn), answer);
    card.append(row, body);

    const rec = { card, answer, btn, openBtn, body, tick, rehearse, built: false, problem: p };
    tick.addEventListener('change', () => setTick(p.id, tick.checked));
    cards.set(p.id, rec);
    return card;
  }

  function buildAnswer(p, box) {
    const texHost = h('div');
    tex(texHost, p.answer.tex, { display: true });
    const final = h('div', { class: 'tex-scroll pc-final', id: `${box.id}-final`, tabindex: '0', role: 'group', 'aria-label': 'Answer, scrolls sideways if it is wide' }, texHost);
    const hintEl = h('p', { class: 'pc-scroll-hint muted', hidden: true }, 'Scroll sideways to see the rest.');
    const plain = h('details', { class: 'pc-plain', id: `${box.id}-plain` }, h('summary', { id: `${box.id}-plain-toggle` }, 'Plain text version (wraps to fit)'), h('p', { class: 'mono' }, p.answer.text));
    const native = nativeRoutes(p);
    const badgeFor = (route) => (native.length === 1 && native[0] === route ? h('span', { class: 'badge', 'data-tone': route }, 'easy here') : null);
    const cartText = h('p');
    prose(cartText, p.routes.cart);
    const polarText = h('p');
    prose(polarText, p.routes.polar);
    const routes = h('div', { class: 'pc-routes' },
      h('section', { class: 'pc-route', 'data-route': 'cart' }, h('h4', null, 'In Cartesian (slide)', badgeFor('cart')), cartText),
      h('section', { class: 'pc-route', 'data-route': 'polar' }, h('h4', null, 'In polar (spin and stretch)', badgeFor('polar')), polarText));
    box.replaceChildren(h('h4', { class: 'pc-label' }, 'Answer'), final, hintEl, plain, routes);
  }

  function updateScrollHint(answer) {
    const final = answer.querySelector('.pc-final');
    const hintEl = answer.querySelector('.pc-scroll-hint');
    if (!final || !hintEl) return;
    hintEl.hidden = !(final.scrollWidth > final.clientWidth + 1);
  }

  // ---- open, collapse, reveal
  const announce = (text) => { deckStatus.textContent = text; };

  function updateDeckButtons() {
    modeOne.setAttribute('aria-pressed', String(deck.mode === 'one'));
    modeAll.setAttribute('aria-pressed', String(deck.mode === 'all'));
    collapseAllBtn.disabled = deck.open.length === 0;
    hideAllBtn.disabled = revealed.size === 0;
  }

  function saveDeck() {
    safeSet(DECK_KEY, { open: [...deck.open], mode: deck.mode }, { persist: false });
    updateDeckButtons();
  }

  function setRevealed(id, on) {
    const rec = cards.get(id);
    if (!rec) return;
    const p = rec.problem;
    if (on) {
      if (!rec.built) {
        rec.built = true;
        try {
          buildAnswer(p, rec.answer);
        } catch (err) {
          console.error(`[problems] the answer of ${p.id} could not be drawn`, err);
          rec.answer.replaceChildren(h('p', { class: 'callout' }, `This answer could not be drawn. Plain text: ${p.answer.text}`));
        }
      }
      rec.answer.hidden = false;
      rec.card.dataset.revealed = 'true';
      rec.btn.setAttribute('aria-expanded', 'true');
      rec.btn.textContent = 'Hide the answer';
      revealed.add(id);
      updateScrollHint(rec.answer);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (revealed.has(id)) updateScrollHint(rec.answer); }, () => {});
    } else {
      rec.answer.hidden = true;
      rec.card.dataset.revealed = 'false';
      rec.btn.setAttribute('aria-expanded', 'false');
      rec.btn.textContent = 'Show the answer';
      revealed.delete(id);
    }
    updateDeckButtons();
  }

  function collapse(id) {
    const rec = cards.get(id);
    if (!rec) return;
    setRevealed(id, false);
    rec.card.dataset.open = 'false';
    rec.openBtn.setAttribute('aria-expanded', 'false');
    rec.body.hidden = true;
    const i = deck.open.indexOf(id);
    if (i >= 0) deck.open.splice(i, 1);
  }

  function expand(id) {
    const rec = cards.get(id);
    if (!rec) return;
    if (deck.mode === 'one') for (const other of [...deck.open]) if (other !== id) collapse(other);
    if (!deck.open.includes(id)) deck.open.push(id);
    rec.card.dataset.open = 'true';
    rec.openBtn.setAttribute('aria-expanded', 'true');
    rec.body.hidden = false;
  }

  function setOpen(id, on, { say = true, scroll = false } = {}) {
    if (!cards.has(id)) return;
    if (on) expand(id);
    else collapse(id);
    saveDeck();
    if (say) announce(`${on ? 'Opened' : 'Collapsed'} problem ${id}.`);
    if (on && scroll) cards.get(id).card.scrollIntoView({ block: 'nearest' });
  }

  function toggleReveal(id) {
    const rec = cards.get(id);
    if (!rec) return;
    if (rec.card.dataset.open !== 'true') setOpen(id, true, { say: false });
    setRevealed(id, rec.answer.hidden);
  }

  function setMode(mode) {
    deck.mode = mode === 'all' ? 'all' : 'one';
    if (deck.mode === 'one') for (const id of deck.open.slice(0, -1)) collapse(id);   // switching back to one keeps the last row opened
    saveDeck();
  }

  function openAllShown() {
    deck.mode = 'all';
    let n = 0;
    for (const rec of cards.values()) {
      if (rec.card.hidden) continue;
      expand(rec.problem.id);
      n++;
    }
    saveDeck();
    announce(`Opened ${n} problems.`);
  }

  function collapseAll() {
    for (const id of [...deck.open]) collapse(id);
    saveDeck();
    announce('Collapsed all rows.');
  }

  hideAllBtn.addEventListener('click', () => {
    for (const id of [...revealed]) setRevealed(id, false);
    announce('Answers hidden.');
  });
  modeOne.addEventListener('click', () => setMode('one'));
  modeAll.addEventListener('click', () => setMode('all'));
  openAllBtn.addEventListener('click', openAllShown);
  collapseAllBtn.addEventListener('click', collapseAll);

  // one delegated listener for every row of the deck
  deckEl.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const card = t ? t.closest('.problem-card') : null;
    if (!t || !card) return;
    const id = card.dataset.problem;
    if (t.closest('.reveal')) toggleReveal(id);
    else if (t.closest('.pc-open')) setOpen(id, card.dataset.open !== 'true', { scroll: true });
    else if (card.dataset.open !== 'true' && t.closest('.pc-statement, .pc-title') && !t.closest('a, button, label, input')) setOpen(id, true, { scroll: true });
  });
  deckEl.addEventListener('keydown', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const card = t ? t.closest('.problem-card') : null;
    if (!t || !card) return;
    if (e.key === 'Escape' && card.dataset.open === 'true') {
      e.preventDefault();
      setOpen(card.dataset.problem, false);
      cards.get(card.dataset.problem).openBtn.focus();
      return;
    }
    if (!t.classList.contains('pc-open') || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const btns = [...deckEl.querySelectorAll('.problem-card:not([hidden]) .pc-open')];
    const i = btns.indexOf(t);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : Math.max(0, Math.min(btns.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
    e.preventDefault();
    if (btns[j]) btns[j].focus();
  });

  // ---- ticks, progress
  function writeProgress() {
    if (Object.keys(progress).length) safeSet(PROGRESS_KEY, progress);
    else safeRemove(PROGRESS_KEY);
  }

  function renderProgress() {
    const n = countTicked(progress);
    progressText.textContent = `${n} of ${total} ticked`;
    progressBar.value = n;
    todoChip.textContent = `Not ticked yet (${total - n})`;
  }

  // The card is not re-filtered here: ticking under "Not ticked yet" must not make the card vanish under the pointer.
  function setTick(id, on) {
    progress = setTicked(progress, id, on);
    const rec = cards.get(id);
    if (rec) rec.card.dataset.done = String(on);
    writeProgress();
    renderProgress();
  }

  function disarm() {
    armed = false;
    clearTimeout(armTimer);
    armTimer = 0;
    clearBtn.textContent = 'Clear all ticks';
  }

  clearBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      clearBtn.textContent = 'Click again to clear all ticks';
      armTimer = setTimeout(disarm, ARM_MS);
      return;
    }
    progress = {};
    safeRemove(PROGRESS_KEY);
    for (const rec of cards.values()) { rec.tick.checked = false; rec.card.dataset.done = 'false'; }
    for (const t of topics.values()) t.tick.checked = false;
    renderProgress();
    disarm();
  });

  // ---- filters
  function applyFilters() {
    const show = new Set(visibleIds(filter, progress));
    for (const rec of cards.values()) rec.card.hidden = !show.has(rec.problem.id);
    for (const section of groups.values()) section.hidden = !section.querySelector('.problem-card:not([hidden])');
    const name = filterLabel(filter);
    countText.textContent = `Showing ${show.size} of ${total}${name ? `: ${name}` : ''}.`;
    emptyMsg.hidden = show.size > 0;
    for (const [k, chip] of chapterChips) chip.setAttribute('aria-pressed', String(k === filter.chapter));
    for (const [k, chip] of namesChips) chip.setAttribute('aria-pressed', String(k === filter.names));
    todoChip.setAttribute('aria-pressed', String(filter.todo));
    safeSet(FILTER_KEY, { chapter: filter.chapter, todo: filter.todo, names: filter.names }, { persist: false });
  }

  for (const [k, chip] of chapterChips) chip.addEventListener('click', () => { filter.chapter = k; applyFilters(); });
  for (const [k, chip] of namesChips) chip.addEventListener('click', () => { filter.names = k; applyFilters(); });
  todoChip.addEventListener('click', () => { filter.todo = !filter.todo; applyFilters(); });
  showAllBtn.addEventListener('click', () => {
    filter.chapter = 'all';
    filter.todo = false;
    filter.names = 'all-names';
    applyFilters();
  });
  predictBox.addEventListener('change', () => {
    predict = predictBox.checked;
    deckEl.dataset.predict = String(predict);
    balancePanel.hidden = predict;
    safeSet(PREDICT_KEY, predict);
  });

  // ---- deck groups
  for (const [gk, heading] of [['1', 'Chapter 1'], ['2', 'Chapter 2'], ['3', 'Chapter 3'], ['P', 'Proof examples']]) {
    const list = h('div', { class: 'pc-list' });
    for (const p of PROBLEMS) if (filterMatches(p, gk)) list.append(buildCard(p));
    const section = h('section', { class: 'problems-group', id: `problems-group-${gk}`, 'aria-label': heading }, h('h2', null, heading), list);
    groups.set(gk, section);
    deckEl.append(section);
  }
  deckEl.append(emptyMsg);

  // ---- rehearsed marks on the Rehearse links
  function paintRehearsed() {
    for (const id of rehearsedIds(scores)) {
      const rec = cards.get(id);
      if (!rec) continue;
      rec.rehearse.dataset.rehearsed = 'true';
      rec.rehearse.textContent = 'Rehearse again';
      rec.rehearse.title = 'You got this one right once. Try fresh numbers again.';
    }
  }

  // ---- balance
  function renderBalance() {
    const b = addressBalance(PROBLEMS);
    balanceCells.replaceChildren();
    for (const p of PROBLEMS) {
      const tones = new Set(addressTones(p.address));
      const kind = tones.size >= 2 ? 'both' : tones.has('--cart') ? 'cart' : 'polar';
      balanceCells.append(h('span', { class: 'pb-cell', 'data-kind': kind, title: `${p.id}: ${addressLabel(p.address)}` }));
    }
    balanceCells.setAttribute('aria-label', `${total} problems in handout order: ${b.cart} easiest in Cartesian, ${b.polar} in polar, ${b.both} use both.`);
    balanceNote.textContent = `Blue: Cartesian is easiest (${b.cart}). Orange: polar is easiest (${b.polar}). Split: you use both (${b.both}).`;
  }

  // ---- topics: one-line cards too
  function buildTopicCard(t) {
    const k = idKey(t.id);
    const tick = h('input', { type: 'checkbox', id: `problems-topic-tick-${k}` });
    tick.checked = progress[t.id] === true;
    tick.addEventListener('change', () => setTick(t.id, tick.checked));
    const summary = h('p');
    prose(summary, t.summary);
    const covers = h('ul');
    for (const c of t.covers) {
      const li = h('li');
      prose(li, c);
      covers.append(li);
    }
    const where = h('div', { class: 'chips' });
    for (const sid of t.stations) {
      const s = stationById(sid);
      if (s) where.append(h('a', { class: 'chip', href: `#${sid}`, 'data-station': sid }, titleSpan(shortTitle(s.title))));
    }
    const probList = problemsForTopic(t.id);
    const probs = h('div', { class: 'chips' });
    for (const p of probList) probs.append(h('a', { class: 'chip problem-chip', href: `#${routeFor(p.id)}` }, p.id));
    const first = stationById(t.stations[0]);
    const start = h('a', { class: 'btn', href: `#${topicRoute(t.id)}`, id: `problems-topic-start-${k}` }, titleSpan(`Start at ${first ? first.title : t.title}`));
    const openBtn = h('button', { type: 'button', class: 'pc-open', id: `problems-topic-open-${k}`, 'aria-expanded': 'false', 'aria-label': `Details of topic ${t.id}` },
      h('span', { class: 'pc-chevron', 'aria-hidden': 'true' }));
    const title = h('h3', { class: 'tc-title' }, h('span', { class: 'badge pc-id' }, t.id), h('span', null, t.title));
    const body = h('div', { class: 'tc-body', hidden: true }, summary, covers,
      h('p', { class: 'tc-label' }, 'Where to learn it'), where,
      probList.length ? h('p', { class: 'tc-label' }, 'Problems') : null, probList.length ? probs : null, start);
    const card = h('article', { class: 'panel topic-card', id: `problems-topic-${k}`, 'data-topic': t.id, 'data-thread': t.thread, 'data-open': 'false' },
      h('div', { class: 'tc-row' }, openBtn, title,
        h('div', { class: 'tc-actions' },
          h('span', { class: 'thread-badge', 'data-thread': t.thread }, t.thread),
          h('span', { class: 'tc-count' }, problemCount(probList.length)),
          h('label', { class: 'check pc-tick', for: `problems-topic-tick-${k}` }, tick, h('span', { class: 'pc-tick-text' }, 'I can explain this')))),
      body);
    openBtn.addEventListener('click', () => {
      const on = card.dataset.open !== 'true';
      card.dataset.open = String(on);
      openBtn.setAttribute('aria-expanded', String(on));
      body.hidden = !on;
    });
    topics.set(t.id, { card, openBtn, body, tick });
    return card;
  }
  const topicList = h('div', { class: 'pc-list' });
  for (const t of TOPICS) topicList.append(buildTopicCard(t));
  const topicsSection = h('section', { class: 'problems-topics', id: 'problems-topics', 'aria-labelledby': 'problems-topics-title' },
    h('h2', { id: 'problems-topics-title' }, 'Topics: the syllabus checklist'),
    h('p', { class: 'muted' }, 'Tick a topic when you could explain it to a friend without looking. Open a row for what it covers and where to learn it.'),
    topicList);

  // ---- station links
  const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  {
    const nb = stationNeighbours(STATIONS, self.id);
    const shown = new Set();
    const add = (targetId, attrs, prefix) => {
      const s = targetId ? stationById(targetId) : null;
      if (!s || shown.has(targetId)) return;
      shown.add(targetId);
      links.append(h('a', { class: 'station-link', href: `#${targetId}`, ...attrs }, titleSpan((prefix || '') + s.title)));
    };
    add(nb.prev, { 'data-dir': 'prev', id: `${self.id}-link-prev` });
    add(nb.next, { 'data-dir': 'next', id: `${self.id}-link-next` });
    for (const t of self.threads || []) {
      const n = nb.thread[t];
      if (!n) continue;
      add(n.prev, { 'data-thread': t, 'data-dir': 'prev', id: `${self.id}-link-thread-${t}` }, threadLinkPrefix(t, 'prev'));
      add(n.next, { 'data-thread': t, 'data-dir': 'next', id: `${self.id}-link-thread-${t}` }, threadLinkPrefix(t, 'next'));
    }
    add('home', { id: `${self.id}-link-home` });
  }

  // ---- assemble, restore the deck, paint
  el.append(header, tools, balancePanel, deckEl, topicsSection, links);
  for (const id of deck.open) {
    const rec = cards.get(id);
    if (!rec) continue;
    rec.card.dataset.open = 'true';
    rec.openBtn.setAttribute('aria-expanded', 'true');
    rec.body.hidden = false;
  }
  applyFilters();
  renderBalance();
  balancePanel.hidden = predict;
  renderProgress();
  paintRehearsed();
  updateDeckButtons();
  const mountMs = performance.now() - t0;

  // ---- hooks and the one window listener (attached last)
  const mv = (window.__mv = window.__mv || {});
  const hook = {
    visible: () => [...cards.values()].filter((r) => !r.card.hidden).map((r) => r.problem.id),
    progress: () => ({ ...progress }),
    filter: () => ({ chapter: filter.chapter, todo: filter.todo, names: filter.names }),
    deck: () => ({ open: [...deck.open], mode: deck.mode }),
    revealed: () => [...revealed],
    mountMs,
  };
  mv.problems = hook;

  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      for (const id of revealed) updateScrollHint(cards.get(id).answer);
    });
  };
  window.addEventListener('resize', onResize);
  relayoutHooked = true;

  return function unmount() {
    if (relayoutHooked) window.removeEventListener('resize', onResize);
    relayoutHooked = false;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = 0;
    clearTimeout(armTimer);
    armTimer = 0;
    style.remove();
    if (window.__mv && window.__mv.problems === hook) delete window.__mv.problems;
  };
}
