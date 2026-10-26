// Shared chrome for the circuit thread. The picture stays in each station.
// No kit/ import: the live router loads these modules, and Cloudflare strips kit/.

import { stationsForMap, stationById, threadLabel, threadLinkPrefix, threadsOn } from '../registry.js';
import { stationNeighbours } from './problems.js';
import { BOOK } from '../data/book.js';
import { tex } from '../core/katex.js';

const STYLE = `
.circuit-formula { margin: var(--space-2) 0 0; overflow-x: auto; }
.circuit-note { margin: var(--space-2) 0 0; }
.circuit-claim {
  margin: var(--space-3) 0 0;
  padding-left: var(--space-3);
  border-left: 4px solid var(--polar);
}
.circuit-claim[data-holds="true"] { border-left-color: var(--output); }
.circuit-readout { margin: var(--space-2) 0 0; overflow-wrap: anywhere; }
`;

function ensureStyle() {
  if (document.head.querySelector('style[data-for="station-circuit"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'station-circuit');
  s.textContent = STYLE;
  document.head.appendChild(s);
}

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

export function sourceTag(pin, href) {
  const p = h('p', { class: 'source-tag' });
  p.append(document.createTextNode(`${BOOK.short}, ${BOOK.title}, `));
  p.append(h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, pin));
  p.append(document.createTextNode(`. ${BOOK.licence}.`));
  return p;
}

export function placeLinks(stationId) {
  const list = stationsForMap('test1');
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
  for (const t of (self && threadsOn(self, 'test1')) || []) {
    const n = nb.thread[t];
    if (!n) continue;
    add(n.prev, { 'data-thread': t, 'data-dir': 'prev', id: `${stationId}-link-${t}-prev` }, threadLinkPrefix(t, 'prev'));
    add(n.next, { 'data-thread': t, 'data-dir': 'next', id: `${stationId}-link-${t}-next` }, threadLinkPrefix(t, 'next'));
  }
  return nav;
}

export function mountChrome(section, spec) {
  ensureStyle();
  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'Story threads' });
  for (const id of spec.threads || []) {
    const t = (spec.threadList || []).find((x) => x.id === id);
    if (!t) continue;
    badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': id, title: t.summary }, threadLabel(t))));
  }
  const formula = h('p', { class: 'circuit-formula', id: `${spec.id}-formula` });
  tex(formula, spec.formula);
  const claim = h('p', { class: 'circuit-claim', id: `${spec.id}-claim`, role: 'status', 'data-holds': 'false' });
  const readout = h('p', { class: 'circuit-readout mono', id: `${spec.id}-readout` });
  const chips = h('div', { class: 'chips', id: `${spec.id}-chips`, role: 'group', 'aria-label': spec.chipLabel });
  const planeHost = h('div', { id: `${spec.id}-plane` });
  const header = h('header', { class: 'station-header' },
    h('h1', null, spec.title),
    h('p', { class: 'station-lede' }, spec.lede),
    badges,
    sourceTag(spec.pin, spec.href));
  section.append(
    header,
    h('p', { id: `${spec.id}-observe` }, spec.observe),
    formula,
    spec.note ? h('p', { class: 'muted circuit-note', id: `${spec.id}-note` }, spec.note) : null,
    planeHost,
    chips,
    claim,
    readout,
    spec.exercise ? h('p', { class: 'muted', id: `${spec.id}-exercise` }, spec.exercise) : null,
    placeLinks(spec.id),
  );
  return { chips, claim, readout, planeHost };
}

export function setClaim(el, claim) {
  el.dataset.holds = claim.holds ? 'true' : 'false';
  el.textContent = claim.text;
}

export function chipButton(id, label, onClick) {
  const b = h('button', { type: 'button', class: 'chip', id, 'aria-pressed': 'false' }, label);
  b.addEventListener('click', onClick);
  return b;
}

export function syncChips(buttons, pressed) {
  for (const b of buttons) b.setAttribute('aria-pressed', pressed(b) ? 'true' : 'false');
}
