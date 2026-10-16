// js/stations/problems.js
// The Problem Index: all 29 review problems and proofs as cards in handout order, the 12 syllabus topics as a
// checklist, filters, persisted ticks, a predict-first mode and the address-balance strip.
//
// This module is also the leaf of the home station: the pure helpers that both stations need (shortTitle,
// sanitizeProgress, stationNeighbours, ...) live here and home.js imports them.
//
// No top-level DOM access, so every pure helper imports in Node. Every text goes through textContent, createTextNode,
// prose() or tex(); there is no innerHTML in this file.
// Design: docs/designs/iter-1/i1-station-home-problems.md (sections 2, 4.2, 5.1, 5.10, 5.11).

import { STATIONS, THREADS, stationById, threadLabel, threadLinkPrefix } from '../registry.js';
import {
  PROBLEMS, TOPICS, problemById, topicById, problemsForTopic, routeFor, topicRoute, statementParts, addressLabel, addressTones,
} from '../data/problems.js';
import { tex, prose } from '../core/katex.js';

export const PROGRESS_KEY = 'progress';          // { [problemId or topicId]: true }, persisted
export const PREDICT_KEY = 'problems.predict';   // boolean, persisted
export const FILTER_KEY = 'problems.filter';     // { chapter: 'all' | '1' | '2' | '3' | 'P', todo: boolean }, memory only
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
// typesetTitle writes it with Unicode superscripts ("z\u207f"); in HTML titleSpan sets the title with prose() inside ONE span, because the
// chips and station links are inline-flex and a bare text, <sup>, text would be three flex items (ARCHITECTURE 10.4.8).
const SUPER = { 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079', n: '\u207f', '-': '\u207b', '+': '\u207a' };
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

// The route token after "problems-": '3', 'p', 'todo', 'all'. Anything else is "show everything".
export function parseProblemsToken(token) {
  const t = String(token == null ? '' : token).toLowerCase();
  const r = { chapter: 'all', todo: false };
  if (t === '1' || t === '2' || t === '3') r.chapter = t;
  else if (t === 'p') r.chapter = 'P';
  else if (t === 'todo') r.todo = true;
  return r;
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

const CSS = `
.problems-group h2 { margin: var(--space-4) 0 var(--space-2); }
.problems-deck .card-grid { align-items: start; }
.problems-tools { display: grid; gap: var(--space-3); }
.problems-progress-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.problems-progress-row progress { flex: 1 1 10rem; min-width: 8rem; height: 0.9rem; accent-color: var(--ok); }
.problems-progress-row p { margin: 0; font-weight: 700; }
.problems-tools .check { min-width: 0; }
.problems-balance-note { margin: var(--space-2) 0 0; }
.pc-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.pc-title { flex: 1 1 12rem; min-width: 0; margin: 0; font-size: 1rem; font-family: var(--font); line-height: 1.35; }
.pc-id { font-family: var(--font-mono); font-weight: 700; margin-right: var(--space-1); }
.pc-section { color: var(--text-muted); font-weight: 500; }
.pc-statement { max-width: 100%; overflow-x: auto; overflow-wrap: anywhere; }
.pc-hint { display: grid; gap: var(--space-2); }
.pc-hint p { margin: 0; }
.pc-also { margin-left: var(--space-2); }
.pc-also::before { content: '\\00b7'; margin-right: var(--space-2); color: var(--text-muted); }
.pc-place .chip, .pc-also .chip { margin: 0 var(--space-1); min-height: 2rem; font-family: var(--font-mono); font-size: 0.88rem; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .pc-hint { display: none; }
.pc-predict-note { display: none; margin: 0; color: var(--text-muted); font-style: italic; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .pc-predict-note { display: block; }
.addr { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; margin-right: var(--space-2); }
.addr-dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--tone, var(--text-muted)); flex: none; }
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
.problems-topics .card-grid { align-items: start; }
.topic-card { display: flex; flex-direction: column; gap: var(--space-2); border-top: 4px solid var(--tone, var(--border-strong)); }
.topic-card h3 { margin: 0; font-size: 1.05rem; }
.topic-card p { margin: 0; }
.topic-card ul { margin: 0; padding-left: 1.2rem; }
.topic-card .tc-label { margin: 0; font-weight: 700; font-size: 0.9rem; color: var(--text-muted); }
.topic-card .chips .chip { min-height: 2rem; font-size: 0.88rem; }
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
  const filter = { chapter: 'all', todo: false };
  const storedFilter = safeGet(FILTER_KEY, null);
  if (storedFilter && typeof storedFilter === 'object' && CHAPTER_KEYS.includes(storedFilter.chapter)) {
    filter.chapter = storedFilter.chapter;
    filter.todo = storedFilter.todo === true;
  }
  if (ctx.preset && ctx.preset.kind === 'token') {
    const f = parseProblemsToken(ctx.preset.token);
    filter.chapter = f.chapter;
    filter.todo = f.todo;
  }
  const total = PROBLEMS.length;
  const counts = filterCounts();
  const cards = new Map();        // problem id -> { card, answer, btn, tick, built, problem }
  const groups = new Map();       // chapter key -> section
  const openIds = new Set();      // problems whose answer is open
  let armed = false;
  let armTimer = 0;
  let resizeRaf = 0;
  let relayoutHooked = false;

  // ---- header
  const header = h('header', { class: 'station-header' },
    h('h1', null, self.title),
    h('p', { class: 'station-lede' },
      'Every problem and proof from the handout is a card. Read the question, say the place, the address and the aha out loud, then reveal the answer. Tick a card when it feels easy.'));
  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'Story threads that pass through this place' });
  for (const tid of self.threads || []) {
    const th = threadOf(tid);
    if (!th) continue;
    badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': tid, title: th.summary }, threadLabel(th))));
  }
  header.append(badges);

  // ---- tools: progress, filters, predict, hide-all
  const progressText = h('p', { id: 'problems-progress', role: 'status' });
  const progressBar = h('progress', { id: 'problems-progress-bar', max: String(total), value: '0', 'aria-labelledby': 'problems-progress' });
  const clearBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-clear' }, 'Clear all ticks');
  const filterBox = h('div', { class: 'chips', id: 'problems-filters', role: 'group', 'aria-label': 'Show' });
  const chapterChips = new Map();
  const chipDefs = [
    ['all', `All (${counts.all})`],
    ['1', `Chapter 1 (${counts['1']})`],
    ['2', `Chapter 2 (${counts['2']})`],
    ['3', `Chapter 3 (${counts['3']})`],
    ['P', `Proofs (${counts.P})`],
  ];
  for (const [key, label] of chipDefs) {
    const chip = h('button', { type: 'button', class: 'chip', id: `problems-filter-${key}`, 'aria-pressed': 'false', 'data-filter': key }, label);
    chip.addEventListener('click', () => {
      filter.chapter = key;
      applyFilters();
    });
    chapterChips.set(key, chip);
    filterBox.append(chip);
  }
  const todoChip = h('button', { type: 'button', class: 'chip', id: 'problems-filter-todo', 'aria-pressed': 'false' }, `Not ticked yet (${total})`);
  todoChip.addEventListener('click', () => {
    filter.todo = !filter.todo;
    applyFilters();
  });
  filterBox.append(todoChip);

  const predictBox = h('input', { type: 'checkbox', id: 'problems-predict' });
  predictBox.checked = predict;
  const predictLabel = h('label', { class: 'check', for: 'problems-predict' }, predictBox,
    h('span', null, 'Predict first: hide the place, the address and the aha until I reveal'));
  const hideAllBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-hide-all', disabled: true }, 'Hide all answers');
  const countText = h('p', { id: 'problems-count', role: 'status', class: 'muted' });
  const tools = h('section', { class: 'panel problems-tools', id: 'problems-tools', 'aria-label': 'Progress and filters' },
    h('div', { class: 'problems-progress-row' }, progressBar, progressText, clearBtn),
    filterBox,
    h('div', { class: 'row' }, predictLabel, hideAllBtn),
    countText);

  // ---- address balance
  const balanceCells = h('div', { class: 'pb-grid', id: 'problems-balance', role: 'img' });
  const balanceNote = h('p', { class: 'muted problems-balance-note' });
  const balancePanel = h('section', { class: 'panel', id: 'problems-balance-panel' },
    h('h2', { class: 'panel-title' }, 'Which address makes each question easy?'),
    balanceCells, balanceNote);

  // ---- deck
  const deck = h('div', { class: 'problems-deck', id: 'problems-deck', 'data-predict': String(predict) });
  const showAllBtn = h('button', { type: 'button', class: 'btn', id: 'problems-show-all' }, 'Show all');
  const emptyMsg = h('p', { class: 'callout', id: 'problems-empty', hidden: true }, 'No cards match these filters. ', showAllBtn);
  showAllBtn.addEventListener('click', () => {
    filter.chapter = 'all';
    filter.todo = false;
    applyFilters();
  });

  // ---- card
  function buildCard(p) {
    const k = idKey(p.id);
    const titleId = `problems-card-${k}-title`;
    const card = h('article', {
      class: 'card problem-card', id: `problems-card-${k}`, 'data-problem': p.id, 'data-chapter': p.chapter, 'data-kind': p.kind,
      'data-thread': p.thread, 'data-address': p.address, 'data-station': p.station, 'data-revealed': 'false', 'aria-labelledby': titleId,
    });
    const tick = h('input', { type: 'checkbox', id: `problems-tick-${k}` });
    tick.checked = progress[p.id] === true;
    const tickLabel = h('label', { class: 'check', for: `problems-tick-${k}` }, tick,
      h('span', null, 'Got it'), h('span', { class: 'sr-only' }, ` (problem ${p.id})`));
    const head = h('div', { class: 'pc-head' },
      h('h3', { class: 'pc-title', id: titleId }, h('span', { class: 'badge pc-id' }, p.id), h('span', { class: 'pc-section' }, p.section)),
      h('span', { class: 'thread-badge', 'data-thread': p.thread }, p.thread),
      tickLabel);

    const statement = h('div', { class: 'pc-statement' });
    appendStatement(statement, statementParts(p.statement), 'pc-math');

    // place line: exactly one link with the problem route, whose text is the station id
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
    const aha = h('span', null);
    prose(aha, p.aha);
    const ahaLine = h('p', { class: 'pc-aha' }, h('strong', null, 'The aha. '), aha);
    const hint = h('div', { class: 'pc-hint' }, place, addrLine, ahaLine);
    const predictNote = h('p', { class: 'pc-predict-note' }, 'Say it first: which place, which address, what is the aha?');

    const answer = h('div', { class: 'answer', id: `problems-answer-${k}`, hidden: true, 'data-answer-for': p.id });
    const btn = h('button', {
      type: 'button', class: 'btn reveal', id: `problems-reveal-${k}`, 'aria-expanded': 'false', 'aria-controls': `problems-answer-${k}`,
    }, 'Show the answer');
    card.append(head, statement, hint, predictNote, h('div', { class: 'pc-reveal-row' }, btn), answer);

    const rec = { card, answer, btn, tick, built: false, problem: p };
    tick.addEventListener('change', () => setTick(p.id, tick.checked));
    btn.addEventListener('click', () => toggleReveal(rec));
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
    const hint = answer.querySelector('.pc-scroll-hint');
    if (!final || !hint) return;
    hint.hidden = !(final.scrollWidth > final.clientWidth + 1);
  }

  function updateHideAll() {
    hideAllBtn.disabled = openIds.size === 0;
  }

  function setOpen(rec, open) {
    const p = rec.problem;
    if (open) {
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
      openIds.add(p.id);
      updateScrollHint(rec.answer);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (openIds.has(p.id)) updateScrollHint(rec.answer); }, () => {});
    } else {
      rec.answer.hidden = true;
      rec.card.dataset.revealed = 'false';
      rec.btn.setAttribute('aria-expanded', 'false');
      rec.btn.textContent = 'Show the answer';
      openIds.delete(p.id);
    }
    updateHideAll();
  }

  function toggleReveal(rec) {
    setOpen(rec, rec.answer.hidden);
  }

  hideAllBtn.addEventListener('click', () => {
    for (const id of [...openIds]) setOpen(cards.get(id), false);
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
    for (const rec of cards.values()) rec.tick.checked = false;
    for (const box of topicTicks.values()) box.checked = false;
    renderProgress();
    disarm();
  });

  // ---- filters
  function filterName() {
    const bits = [];
    if (filter.chapter === 'P') bits.push('Proofs');
    else if (filter.chapter !== 'all') bits.push(`Chapter ${filter.chapter}`);
    if (filter.todo) bits.push('not ticked yet');
    return bits.join(', ');
  }

  function applyFilters() {
    let visible = 0;
    for (const rec of cards.values()) {
      const p = rec.problem;
      const show = filterMatches(p, filter.chapter) && (!filter.todo || progress[p.id] !== true);
      rec.card.hidden = !show;
      if (show) visible++;
    }
    for (const section of groups.values()) {
      section.hidden = !section.querySelector('.problem-card:not([hidden])');
    }
    const name = filterName();
    countText.textContent = `Showing ${visible} of ${total}${name ? `: ${name}` : ''}.`;
    emptyMsg.hidden = visible > 0;
    for (const [key, chip] of chapterChips) chip.setAttribute('aria-pressed', String(key === filter.chapter));
    todoChip.setAttribute('aria-pressed', String(filter.todo));
    safeSet(FILTER_KEY, { chapter: filter.chapter, todo: filter.todo }, { persist: false });
  }

  predictBox.addEventListener('change', () => {
    predict = predictBox.checked;
    deck.dataset.predict = String(predict);
    safeSet(PREDICT_KEY, predict);
  });

  // ---- deck groups
  const groupDefs = [['1', 'Chapter 1'], ['2', 'Chapter 2'], ['3', 'Chapter 3'], ['P', 'Proof examples']];
  for (const [key, heading] of groupDefs) {
    const grid = h('div', { class: 'card-grid' });
    for (const p of PROBLEMS) if (filterMatches(p, key)) grid.append(buildCard(p));
    const section = h('section', { class: 'problems-group', id: `problems-group-${key}`, 'aria-label': heading }, h('h2', null, heading), grid);
    groups.set(key, section);
    deck.append(section);
  }
  deck.append(emptyMsg);

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

  // ---- topics
  const topicTicks = new Map();
  function buildTopicCard(t) {
    const k = idKey(t.id);
    const tick = h('input', { type: 'checkbox', id: `problems-topic-tick-${k}` });
    tick.checked = progress[t.id] === true;
    tick.addEventListener('change', () => setTick(t.id, tick.checked));
    topicTicks.set(t.id, tick);
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
    const probs = h('div', { class: 'chips' });
    for (const p of problemsForTopic(t.id)) probs.append(h('a', { class: 'chip problem-chip', href: `#${routeFor(p.id)}` }, p.id));
    const first = stationById(t.stations[0]);
    const start = h('a', { class: 'btn', href: `#${topicRoute(t.id)}`, id: `problems-topic-start-${k}` }, titleSpan(`Start at ${first ? first.title : t.title}`));
    return h('article', { class: 'panel topic-card', id: `problems-topic-${k}`, 'data-topic': t.id, 'data-thread': t.thread },
      h('h3', null, `${t.id} · ${t.title}`),
      h('span', { class: 'thread-badge', 'data-thread': t.thread }, t.thread),
      summary, covers,
      h('p', { class: 'tc-label' }, 'Where to learn it'), where,
      probs.childNodes.length ? h('p', { class: 'tc-label' }, 'Problems') : null, probs.childNodes.length ? probs : null,
      start,
      h('label', { class: 'check', for: `problems-topic-tick-${k}` }, tick, h('span', null, 'I can explain this')));
  }
  const topicGrid = h('div', { class: 'card-grid' });
  for (const t of TOPICS) topicGrid.append(buildTopicCard(t));
  const topicsSection = h('section', { class: 'problems-topics', id: 'problems-topics', 'aria-labelledby': 'problems-topics-title' },
    h('h2', { id: 'problems-topics-title' }, 'Topics: the syllabus checklist'),
    h('p', { class: 'muted' }, 'Tick a topic when you could explain it to a friend without looking.'),
    topicGrid);

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

  // ---- assemble
  el.append(header, tools, balancePanel, deck, topicsSection, links);
  applyFilters();
  renderBalance();
  renderProgress();
  const mountMs = performance.now() - t0;

  // ---- hooks and the one window listener (attached last)
  const mv = (window.__mv = window.__mv || {});
  const hook = {
    visible: () => [...cards.values()].filter((r) => !r.card.hidden).map((r) => r.problem.id),
    progress: () => ({ ...progress }),
    filter: () => ({ chapter: filter.chapter, todo: filter.todo }),
    mountMs,
  };
  mv.problems = hook;

  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      for (const id of openIds) updateScrollHint(cards.get(id).answer);
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
