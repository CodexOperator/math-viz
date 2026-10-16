// js/core/station-kit.js: the pieces every station shares: the header, the problem card, the "where next" links, the
// neighbour lookup, the values-preset reader and the title span.
// Pure: neighbours, valuesOf, freshNote. DOM (browser only): header, problemCard, links, titleSpan.
//
// Imports (ARCHITECTURE section 1, Iteration 2 allows ./katex.js, ./decisions.js, ./moveglyph.js, ../data/problems.js, ../registry.js;
// nothing in the kit draws a glyph, so ./moveglyph.js is not imported).
// Colours are tokens only. No DOM access at import time.
// Design: docs/designs/iter-2/i2-decisions-kit.md sections 4.3 and 5.3.

import { tex, prose, plainProse } from './katex.js';
import { chips as decisionChips } from './decisions.js';
import { problemById, problemsForStation, statementParts, addressTones } from '../data/problems.js';
import { THREADS, threadLabel, threadLinkPrefix } from '../registry.js';

// ---------------------------------------------------------------- pure

export function neighbours(ctx) {
  const stations = ctx && Array.isArray(ctx.stations) ? ctx.stations : [];
  const list = stations.slice().sort((a, b) => a.order - b.order);
  const cur = ctx && ctx.station;
  const i = cur ? list.findIndex((s) => s.id === cur.id) : -1;
  if (i < 0) return { prev: null, next: null, threads: [] };
  const prev = list[i - 1] || null;
  const next = list[i + 1] || null;
  const story = new Set([prev && prev.id, next && next.id].filter(Boolean));
  const threads = [];
  for (const thread of list[i].threads || []) {
    const members = list.filter((s) => (s.threads || []).includes(thread));
    const j = members.findIndex((s) => s.id === cur.id);
    const tp = members[j - 1] || null;
    const tn = members[j + 1] || null;
    if ((tp && !story.has(tp.id)) || (tn && !story.has(tn.id))) threads.push({ thread, prev: tp, next: tn });
  }
  return { prev, next, threads };
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function valuesOf(preset, shape) {
  if (!preset || typeof preset !== 'object' || preset.kind !== 'values') return null;
  const out = {};
  const given = preset.values && typeof preset.values === 'object' && !Array.isArray(preset.values) ? preset.values : {};
  const spec = shape && typeof shape === 'object' ? shape : {};
  for (const key of Object.keys(spec)) {
    if (UNSAFE_KEYS.has(key) || !Object.prototype.hasOwnProperty.call(given, key)) continue;
    const v = given[key];
    const kind = spec[key];
    let clean;
    if (kind === 'complex') clean = v && typeof v === 'object' && Number.isFinite(v.re) && Number.isFinite(v.im) ? { re: v.re + 0, im: v.im + 0 } : undefined;
    else if (kind === 'real') clean = typeof v === 'number' && Number.isFinite(v) ? v + 0 : undefined;
    else if (kind === 'int') clean = Number.isInteger(v) ? v + 0 : undefined;
    else if (kind === 'bool') clean = typeof v === 'boolean' ? v : undefined;
    else if (kind === 'string') clean = typeof v === 'string' ? v : undefined;
    else if (Array.isArray(kind)) clean = typeof v === 'string' && kind.includes(v) ? v : undefined;
    else if (typeof kind === 'function') {
      try { clean = kind(v); } catch (err) { clean = undefined; }
    }
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

export function freshNote(problem, preset) {
  if (!problem || typeof problem !== 'object' || typeof problem.id !== 'string') return '';
  if (!preset || typeof preset !== 'object' || preset.kind !== 'values' || preset.problem !== problem.id) return '';
  const text = problem.answer && typeof problem.answer.text === 'string' ? problem.answer.text : '';
  return `Fresh numbers from the Rehearsal Room. The handout's own answer: ${text}`;
}

// ---------------------------------------------------------------- DOM (browser only)

const STYLE = `
.station-header .thread-badges { margin-bottom: var(--space-2); }
.station-header .chips { margin-bottom: var(--space-1); }
.problem-card { display: grid; gap: var(--space-2); min-width: 0; background: var(--surface); }
.problem-card > * { min-width: 0; margin: 0; }
.problem-card .pk-title { font-size: 1.1rem; }
.problem-card .pk-statement { font-size: 1.05rem; overflow-wrap: anywhere; }
.problem-card .pk-note { color: var(--text-muted); }
.problem-card .pk-note:empty, .problem-card .pk-slot:empty { display: none; }
.problem-card .pk-decisions { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-2); }
.problem-card .pk-why, .problem-card .pk-aha { color: var(--text-muted); font-size: 0.95rem; line-height: 1.45; }
.problem-card .pk-lead { color: var(--text); font-weight: 700; }
.problem-card .pk-answer { display: block; }
.problem-card .pk-answer > summary { display: flex; align-items: center; gap: var(--space-2); min-height: var(--tap); cursor: pointer; font-weight: 600; list-style: none; }
.problem-card .pk-answer > summary::-webkit-details-marker { display: none; }
.problem-card .pk-answer > summary::before { content: "\\25B8"; display: inline-block; color: var(--text-muted); }
.problem-card .pk-answer[open] > summary::before { transform: rotate(90deg); }
.problem-card .pk-answer-body { display: grid; gap: var(--space-2); min-width: 0; }
.problem-card .pk-final { padding: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); }
.problem-card .pk-final .katex-display { max-width: none; margin: 0.4em 0; overflow: visible; }
.problem-card .pk-hint { color: var(--text-muted); font-size: 0.9rem; }
.problem-card .pk-routes { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
.problem-card .pk-route { min-width: 0; padding-left: var(--space-2); border-left: 4px solid var(--tone, var(--border-strong)); }
.problem-card .pk-route h3 { margin: 0 0 var(--space-1); font-size: 0.95rem; }
.problem-card .pk-route p { margin: 0; }
.problem-card[data-empty="true"] { padding-block: var(--space-2); }
.pk-alias { display: contents; }
.station-links .station-link { text-align: left; }
`;

function needDocument(who) {
  if (typeof document === 'undefined') throw new TypeError(`${who} needs a document`);
}

function ensureStyle() {
  const head = document.head;
  if (!head || head.querySelector('style[data-for="station-kit"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'station-kit');
  s.textContent = STYLE;
  head.appendChild(s);
}

function h(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) node.append(kid);
  return node;
}

const idKey = (id) => String(id).replace(/\./g, '-');
const safeId = (text) => String(text).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
const PREFIX_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function titleSpan(text) {
  needDocument('titleSpan');
  const span = document.createElement('span');
  prose(span, String(text === null || text === undefined ? '' : text));
  return span;
}

export function header(ctx, { lede = '', active = null, chips = true } = {}) {
  needDocument('header');
  ensureStyle();
  const st = ctx && ctx.station;
  if (!st || typeof st.id !== 'string') throw new TypeError('header needs ctx.station');
  const threads = Array.isArray(ctx.threads) ? ctx.threads : THREADS;
  const root = h('header', { class: 'station-header', id: `${st.id}-header` });
  const title = h('h1', { id: `${st.id}-title` });
  prose(title, st.title);
  root.append(title);
  if (lede) root.append(h('p', { class: 'station-lede', id: `${st.id}-lede` }, lede));
  const badges = h('ul', { class: 'thread-badges', id: `${st.id}-threads` });
  for (const t of st.threads || []) {
    const th = threads.find((x) => x.id === t);
    const badge = h('span', { class: 'thread-badge', 'data-thread': t, title: th ? `${th.title}. ${th.summary}` : null }, threadLabel(th || t));
    badges.append(h('li', null, badge));
  }
  if (badges.childNodes.length) root.append(badges);
  if (chips) {
    const mine = problemsForStation(st.id).map((p) => p.id);
    if (mine.length) {
      const row = h('div', { class: 'chips', id: `${st.id}-problem-chips`, role: 'group', 'aria-label': 'Problems on this page' });
      for (const id of mine) {
        const p = problemById(id);
        const a = h('a', {
          class: 'chip problem-chip', id: `${st.id}-problem-chip-${idKey(id)}`, href: `#problem-${idKey(id)}`, 'aria-label': `Problem ${id}`,
          title: p ? plainProse(p.aha) : null, 'aria-current': active === id ? 'true' : null,
        }, id);
        row.append(a);
      }
      root.append(row);
    }
  }
  return root;
}

export function links(ctx, { extras = [], lab = null, label = 'Where next' } = {}) {
  needDocument('links');
  ensureStyle();
  const st = ctx && ctx.station;
  if (!st || typeof st.id !== 'string') throw new TypeError('links needs ctx.station');
  if (lab && !(ctx.store && typeof ctx.store.set === 'function' && typeof ctx.navigate === 'function')) throw new TypeError('links: a lab request needs ctx.store.set and ctx.navigate');
  const nav = h('nav', { class: 'station-links', id: `${st.id}-links`, 'aria-label': label });
  const shown = new Set();
  const add = (href, text, extra) => {
    const target = safeId(String(href).replace(/^#/, ''));
    if (!target || shown.has(target)) return;
    shown.add(target);
    const a = h('a', { class: 'station-link', id: `${st.id}-link-${target}`, href, 'data-dir': extra.dir || null, 'data-thread': extra.thread || null, title: extra.title || null });
    const span = document.createElement('span');
    prose(span, text);
    a.append(span);
    nav.append(a);
  };
  const nb = neighbours(ctx);
  if (nb.prev) add(`#${nb.prev.id}`, nb.prev.title, { dir: 'prev' });
  if (nb.next) add(`#${nb.next.id}`, nb.next.title, { dir: 'next' });
  for (const t of nb.threads) {
    if (t.prev) add(`#${t.prev.id}`, threadLinkPrefix(t.thread, 'prev') + t.prev.title, { dir: 'prev', thread: t.thread, title: `Previous on thread ${t.thread}` });
    if (t.next) add(`#${t.next.id}`, threadLinkPrefix(t.thread, 'next') + t.next.title, { dir: 'next', thread: t.thread, title: `Next on thread ${t.thread}` });
  }
  for (const x of Array.isArray(extras) ? extras : []) {
    if (!x || typeof x.href !== 'string' || typeof x.text !== 'string') continue;
    add(x.href, (x.prefix || '') + x.text, { dir: x.dir || null, thread: x.thread || null });
  }
  if (lab) {
    const btn = h('button', { type: 'button', class: 'btn', id: `${st.id}-open-lab` }, 'Open in the Lab');
    btn.addEventListener('click', () => {
      ctx.store.set('lab.request', lab, { persist: false });
      ctx.navigate('lab');
    });
    nav.append(btn);
  }
  if (!nav.childNodes.length) nav.hidden = true;
  return nav;
}

// The statement of a problem as text and typeset maths. The punctuation that opens the text after a maths part stays with
// that part in one non-wrapping run, exactly as js/stations/problems.js appendStatement does (a test compares the two).
const TAIL = /^[.,;:!?)\]]+/;
function statementNodes(parts) {
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

function appendStatement(host, parts) {
  for (const node of statementNodes(parts)) {
    if (!node.math) { host.append(document.createTextNode(node.text)); continue; }
    const m = document.createElement('span');
    tex(m, node.text);
    if (!node.tail) { host.append(m); continue; }
    const run = document.createElement('span');
    run.style.whiteSpace = 'nowrap';
    run.append(m, document.createTextNode(node.tail));
    host.append(run);
  }
}

function toneFor(problem) {
  const tones = [...new Set(addressTones(problem.address).map((t) => t.replace(/^--/, '')))];
  return tones.length === 1 ? tones[0] : 'accent';
}

export function problemCard(ctx, problem, options = {}) {
  needDocument('problemCard');
  ensureStyle();
  const opt = options && typeof options === 'object' ? options : {};
  const stationId = ctx && ctx.station && ctx.station.id;
  const id = opt.id !== undefined ? opt.id : stationId ? `${stationId}-problem` : undefined;
  if (typeof id !== 'string' || !PREFIX_RE.test(id)) throw new TypeError('problemCard needs ctx.station.id or options.id (letters, digits, - and _, starting with a letter)');
  const answerMode = ['reveal', 'open', 'none'].includes(opt.answer) ? opt.answer : 'reveal';
  const withWhy = opt.why !== false;
  const withRoutes = opt.routes === true;
  const aliases = opt.aliases && typeof opt.aliases === 'object' ? opt.aliases : {};
  let destroyed = false;
  let observer = null;
  let current = null;
  const fixedTone = ['cart', 'polar', 'accent'].includes(opt.tone) ? opt.tone : null;

  const els = {
    title: h('h2', { class: 'panel-title pk-title', id: `${id}-title` }),
    statement: h('p', { class: 'pk-statement', id: `${id}-statement` }),
    note: h('p', { class: 'pk-note', id: `${id}-note` }),
    decisions: h('div', { class: 'pk-decisions', id: `${id}-decisions` }),
    why: withWhy ? h('p', { class: 'pk-why', id: `${id}-why` }) : null,
    answer: null, answerTex: null, answerText: null, routeCart: null, routePolar: null,
    slot: h('div', { class: 'pk-slot', id: `${id}-slot` }),
  };
  let summary = null;
  let aha = null;
  let hint = null;
  let scroller = null;
  let routesBox = null;

  const body = answerMode === 'none' ? null : h('div', { class: 'pk-answer-body' });
  if (answerMode !== 'none') {
    aha = h('p', { class: 'pk-aha', id: `${id}-aha` });
    scroller = h('div', {
      class: 'tex-scroll pk-final', tabindex: '0', role: 'group', 'aria-label': 'Answer, scrolls sideways if it is wide',
      id: aliases.answer ? String(aliases.answer) : `${id}-answer-tex`,
    });
    hint = h('p', { class: 'pk-hint', id: `${id}-answer-hint`, hidden: true }, 'Scroll sideways to see the rest.');
    els.answerText = h('p', { class: 'muted mono', id: `${id}-answer-text` });
    els.answerTex = scroller;
    if (aliases.answer) body.append(aha, h('div', { id: `${id}-answer-tex` }, scroller, hint), els.answerText);
    else body.append(aha, scroller, hint, els.answerText);
  }
  if (withRoutes) {
    routesBox = h('div', { class: 'pk-routes' });
    els.routeCart = h('section', { class: 'pk-route', id: `${id}-route-cart`, 'data-tone': 'cart' }, h('h3', null, 'In Cartesian (slide)'), h('p'));
    els.routePolar = h('section', { class: 'pk-route', id: `${id}-route-polar`, 'data-tone': 'polar' }, h('h3', null, 'In polar (spin and stretch)'), h('p'));
    routesBox.append(els.routeCart, els.routePolar);
  }
  if (answerMode === 'reveal') {
    summary = h('summary', { id: `${id}-answer-toggle` }, 'Show the answer');
    els.answer = h('details', { class: 'pk-answer', id: `${id}-answer` }, summary, body);
    if (routesBox) body.append(routesBox);
  } else if (answerMode === 'open') {
    els.answer = h('div', { class: 'pk-answer', id: `${id}-answer` }, body);
    if (routesBox) body.append(routesBox);
  }

  const root = h('aside', { class: 'callout problem-card', id, 'aria-labelledby': `${id}-title` });
  root.append(els.title, els.statement, els.note, els.decisions);
  if (els.why) root.append(els.why);
  if (els.answer) root.append(els.answer);
  else if (routesBox) root.append(routesBox);
  root.append(els.slot);
  let outer = root;
  if (aliases.card) {
    outer = h('div', { class: 'pk-alias', id: String(aliases.card) });
    outer.append(root);
  }

  const refreshHint = () => { if (hint && scroller) hint.hidden = !(scroller.scrollWidth > scroller.clientWidth + 1); };
  if (scroller) {
    try {
      if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(refreshHint); observer.observe(scroller); }
    } catch (err) { observer = null; }
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshHint, () => {}); } catch (err) { /* the observer is enough */ }
  }

  function lead(text, prefix) {
    const strong = h('span', { class: 'pk-lead' }, prefix);
    const rest = document.createElement('span');
    prose(rest, text);
    return [strong, rest];
  }

  function render(p, noteText) {
    const real = p && typeof p === 'object' && typeof p.id === 'string';
    current = real ? p : null;
    els.statement.replaceChildren();
    els.decisions.replaceChildren();
    if (els.why) els.why.replaceChildren();
    if (els.answer) els.answer.hidden = !real;
    if (!real) {
      root.removeAttribute('data-problem');
      root.dataset.empty = 'true';
      root.dataset.tone = fixedTone || 'accent';
      els.title.textContent = '';
      els.title.hidden = true;
      if (aha) aha.replaceChildren();
      if (scroller) scroller.replaceChildren();
      if (els.answerText) els.answerText.textContent = '';
      if (els.routeCart) { els.routeCart.querySelector('p').replaceChildren(); els.routePolar.querySelector('p').replaceChildren(); }
      els.note.textContent = noteText ? noteText : 'Your own numbers.';
      return;
    }
    root.dataset.problem = p.id;
    root.removeAttribute('data-empty');
    root.dataset.tone = fixedTone || toneFor(p);
    els.title.hidden = false;
    els.title.textContent = opt.title ? String(opt.title) : `Problem ${p.id}`;
    appendStatement(els.statement, statementParts(p.statement));
    els.note.textContent = noteText !== undefined && noteText !== null ? noteText : (typeof opt.note === 'string' ? opt.note : '');
    els.decisions.append(decisionChips(p, { idPrefix: id }));
    if (els.why) els.why.append(...lead(p.addressWhy, 'Why this address. '));
    if (aha) aha.replaceChildren(...lead(p.aha, 'The aha. '));
    if (scroller && p.answer) { tex(scroller, p.answer.tex, { display: true }); if (els.answerText) els.answerText.textContent = p.answer.text; }
    if (els.routeCart && p.routes) { prose(els.routeCart.querySelector('p'), p.routes.cart); prose(els.routePolar.querySelector('p'), p.routes.polar); }
    refreshHint();
  }
  render(problem, undefined);

  return {
    el: outer,
    els,
    setProblem(next, { note } = {}) { if (!destroyed) render(next, note); },
    setNote(text) { if (!destroyed) els.note.textContent = text === null || text === undefined ? '' : String(text); },
    setAnswerOpen(on) {
      if (destroyed || answerMode !== 'reveal') return;
      els.answer.open = !!on;
      refreshHint();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (observer) { try { observer.disconnect(); } catch (err) { /* gone already */ } observer = null; }
      outer.remove();
    },
  };
}
