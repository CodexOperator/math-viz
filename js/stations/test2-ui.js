// Shared pieces for Test 2 stops: a source tag, a scope banner, the walk list, the prev/next links.
// No innerHTML except through tex(), which escapes. Statements use $...$ the way Test 1 does.

import { stationsForMap, threadsOn, stationPart, stationById, threadLinkPrefix, mapOf } from '../registry.js';
import { stationNeighbours } from './problems.js';
import { statementParts } from '../data/problems.js';
import { tex } from '../core/katex.js';
import { BOOK } from '../data/book.js';

export function h(tag, attrs, ...kids) {
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

export function appendRich(el, text) {
  const parts = statementParts(text);
  for (const part of parts) {
    if (!part.math) el.append(document.createTextNode(part.text));
    else {
      const s = document.createElement('span');
      tex(s, part.text, { display: false });
      el.append(s);
    }
  }
}

export function richP(text, attrs) {
  const p = h('p', attrs || null);
  appendRich(p, text);
  return p;
}

// cite: { href, pin } pin is the visible section and item, already including any PDF number.
export function sourceTag(cite) {
  const p = h('p', { class: 'source-tag' });
  p.append(document.createTextNode(`${BOOK.short}, ${BOOK.title}, `));
  const a = h('a', { href: cite.href, target: '_blank', rel: 'noopener noreferrer' });
  a.textContent = cite.pin;
  p.append(a);
  p.append(document.createTextNode(`. ${BOOK.licence}.`));
  return p;
}

export function scopeBanner(scope) {
  if (scope === 'likely') {
    return h('p', { class: 'scope-banner', 'data-scope': 'likely' },
      'Likely. Sections 4.3 and 4.4 are the rest of Chapter 4. Drop this stop if your syllabus stops at the pictures.');
  }
  if (scope === 'possible') {
    return h('p', { class: 'scope-banner', 'data-scope': 'possible' },
      'Possible. Section 3.3 was not on Test 1. Drop this stop if Test 2 starts at Chapter 4.');
  }
  return null;
}

export function walkList(points, limit = 8) {
  const ol = h('ol', { class: 'walk-list', start: '0' });
  const n = Math.min(points.length, limit);
  for (let i = 0; i < n; i++) {
    const li = h('li');
    appendRich(li, points[i]);
    ol.append(li);
  }
  return ol;
}

// The stops this page continues. A Test 1 chip switches the map; the switch in the menu brings the student back.
export function storyLinks(id, pairs) {
  if (!pairs || !pairs.length) return null;
  const box = h('div', { class: 'chips', id });
  let leaves = false;
  for (const [href, label, chipId] of pairs) {
    const st = stationById(String(href).replace(/^#/, ''));
    if (st && mapOf(st) === 'test1') leaves = true;
    box.append(h('a', { class: 'chip', id: chipId, href }, label));
  }
  const note = leaves
    ? 'These are the stops this one is built from. A chip that says Test 1 switches the map. The switch at the top brings you back.'
    : 'These are the stops this one is built from.';
  return h('section', { class: 'panel', id: `${id}-panel`, 'aria-labelledby': `${id}-title` },
    h('h2', { id: `${id}-title` }, 'The same story'),
    h('p', null, note),
    box);
}

// Section 3.3 stays on the map and in the menu. It is not a Next stop:
// the radius opens the index, and the index opens the flat paper.
const OFF_NEXT = new Set(['harmonic']);

export function test2LinkList() {
  return stationsForMap('test2').filter((s) => !OFF_NEXT.has(s.id)).map((s) => ({
    ...s,
    threads: threadsOn(s, 'test2'),
    part: stationPart(s, 'test2'),
  }));
}

export function placeLinks(stationId) {
  const list = test2LinkList();
  const self = list.find((s) => s.id === stationId);
  const nb = stationNeighbours(list, stationId);
  const nav = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  const shown = new Set();
  const add = (targetId, attrs, prefix) => {
    const st = targetId ? stationById(targetId) : null;
    if (!st || shown.has(targetId)) return;
    shown.add(targetId);
    nav.append(h('a', { class: 'station-link', href: `#${targetId}`, ...attrs }, (prefix || '') + st.title));
  };
  add(nb.prev, { 'data-dir': 'prev', id: `${stationId}-link-prev` });
  add(nb.next, { 'data-dir': 'next', id: `${stationId}-link-next` });
  if (!self && OFF_NEXT.has(stationId)) {
    add('index', { id: `${stationId}-link-index` });
    add('paper', { id: `${stationId}-link-paper` });
    return nav;
  }
  for (const t of (self && self.threads) || []) {
    const n = nb.thread[t];
    if (!n) continue;
    add(n.prev, { 'data-thread': t, 'data-dir': 'prev', id: `${stationId}-link-${t}-prev` }, threadLinkPrefix(t, 'prev'));
    add(n.next, { 'data-thread': t, 'data-dir': 'next', id: `${stationId}-link-${t}-next` }, threadLinkPrefix(t, 'next'));
  }
  add('index', { id: `${stationId}-link-index` });
  return nav;
}

export function chipButton(id, label, pressed, onClick) {
  const b = h('button', { type: 'button', class: 'chip', id, 'aria-pressed': pressed ? 'true' : 'false' }, label);
  b.addEventListener('click', onClick);
  return b;
}
