// js/core/decisions.js: the two decisions that settle every review problem, as chips.
//   Address: which address makes the question native (Cartesian slide, polar move, or a conversion)?
//   Names:   if an angle is involved, which names of it do you need (none, any, all, home, continuous)?
// chips(problem) shows both as read-only chips with a one-line meaning on tap; picker() lets the student set both
// (the Rehearsal Room) and marks them right or wrong. The pure helpers (labels, meanings, slug, grade) import in Node.
//
// Imports: ../data/problems.js only. Colours are tokens only. No DOM access at import time.
// Design: docs/designs/iter-2/i2-decisions-kit.md sections 4.1 and 5.1.

import { ADDRESS_CODES, addressLabel, addressTones } from '../data/problems.js';

export const NAMES_CODES = Object.freeze(['none', 'any', 'all', 'home', 'continuous']);

export const NAMES_MEANING = Object.freeze({
  none: 'No angle in the question.',
  any: 'Any name of the angle works: powers, products, directions, cos and sin.',
  all: 'Every name gives a different answer: roots take all n steps.',
  home: 'The home step only: Arg z in (−π, π], and principal values.',
  continuous: 'A choice of name that never jumps: a branch, with a seam where it must.',
});

export const ADDRESS_MEANING = Object.freeze({
  'C': 'A slide question: add or compare the x and y parts.',
  'P': 'A move question: turn by the angle, stretch by the length.',
  'C->P': 'Read the polar address of the given point, then work there.',
  'P->C': 'Work in polar, then write the answer as x + iy.',
  'C->P->C': 'Convert to polar, do the move, convert back.',
  'both': 'Both addresses say something; write the formula in each.',
});

const hasKey = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
const isAddress = (code) => typeof code === 'string' && ADDRESS_CODES.includes(code);
const isNames = (code) => typeof code === 'string' && NAMES_CODES.includes(code);

export function namesLabel(code) {
  return isNames(code) ? `names: ${code}` : '';
}

export function namesMeaning(code) {
  return hasKey(NAMES_MEANING, code) ? NAMES_MEANING[code] : '';
}

export function addressMeaning(code) {
  return hasKey(ADDRESS_MEANING, code) ? ADDRESS_MEANING[code] : '';
}

export function slug(code) {
  return String(code === null || code === undefined ? '' : code).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function grade(picked, expected) {
  const p = picked && typeof picked === 'object' ? picked : {};
  const e = expected && typeof expected === 'object' ? expected : {};
  const one = (key) => (p[key] === null || p[key] === undefined ? null : p[key] === e[key]);
  const address = one('address');
  const names = one('names');
  return { address, names, all: address === true && names === true };
}

// ---------------------------------------------------------------- DOM (browser only)

const STYLE = `
.decisions { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); max-width: 100%; vertical-align: top; }
.decision-chip { max-width: 100%; text-align: left; font-size: 0.9rem; }
.decision-chip .addr-dots { display: inline-flex; gap: 3px; flex: none; }
.decision-chip .addr-dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--text-muted); }
.decision-chip .addr-dot[data-tone="cart"] { background: var(--cart); }
.decision-chip .addr-dot[data-tone="polar"] { background: var(--polar); }
.decision-chip .names-mark { width: 1rem; height: 1rem; flex: none; overflow: visible; }
.decision-chip .names-mark .ns { fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; }
.decision-chip .names-mark .ns-solid { fill: currentColor; }
.decision-chip .names-mark .ns-seam { stroke: currentColor; stroke-width: 1.4; stroke-dasharray: 2 2; fill: none; }
.decision-chip .names-mark .ns-dash { stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; fill: none; }
.decisions .decision-chip[data-decision="names"][data-value="none"] { --tone: var(--border-strong); color: var(--text-muted); }
.decisions .decision-chip[data-decision="names"][data-value="any"] { --tone: var(--polar); }
.decisions .decision-chip[data-decision="names"][data-value="all"] { --tone: var(--polar); background: var(--polar); color: var(--on-accent); font-weight: 700; }
.decisions .decision-chip[data-decision="names"][data-value="home"] { --tone: var(--polar); background: var(--surface-2); }
.decisions .decision-chip[data-decision="names"][data-value="continuous"] { --tone: var(--polar); border-style: dashed; }
@supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
  .decisions .decision-chip[data-decision="names"][data-value="home"] { background: color-mix(in srgb, var(--polar) 16%, var(--surface)); }
}
.decisions .decision-chip[data-decision="names"][data-value="all"]:hover { background: var(--polar); filter: brightness(1.1); }
.decisions .decision-chip[aria-expanded="true"] { box-shadow: 0 0 0 2px var(--tone, var(--accent)); }
span.decision-chip { cursor: default; }
.decision-meaning { flex: 1 1 100%; box-sizing: border-box; padding: var(--space-1) var(--space-2); border-left: 3px solid var(--polar); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; background: var(--surface-2); color: var(--text); font-size: 0.92rem; line-height: 1.4; }
.decision-meaning[hidden] { display: none; }
.decisions-picker { display: grid; gap: var(--space-3); min-width: 0; margin: 0; padding: 0; border: 0; }
.decisions-picker .dp-legend { padding: 0; margin-bottom: var(--space-2); font-weight: 700; }
.dp-row { display: grid; gap: var(--space-1); min-width: 0; padding-left: var(--space-2); border-left: 4px solid var(--border); }
.dp-row[data-mark="right"] { border-left-color: var(--ok); }
.dp-row[data-mark="wrong"] { border-left-color: var(--danger); border-left-style: dashed; }
.dp-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-2); }
.dp-label { font-weight: 700; }
.dp-hint { color: var(--text-muted); font-size: 0.88rem; }
.dp-row[data-mark="right"] .dp-label::after { content: " \\2713 right"; color: var(--ok); font-weight: 600; }
.dp-row[data-mark="wrong"] .dp-label::after { content: " \\2717 wrong"; color: var(--danger); font-weight: 600; }
.dp-opts { display: flex; flex-wrap: wrap; gap: var(--space-2); min-width: 0; }
.dp-opt { max-width: 100%; text-align: left; }
.dp-opt[data-expected="true"] { box-shadow: 0 0 0 2px var(--ok); }
.dp-row[data-mark="wrong"] .dp-opt[aria-pressed="true"] { border-color: var(--danger); border-style: dashed; }
.dp-opt[disabled] { cursor: default; opacity: 0.75; }
.dp-status { margin: 0; min-height: 1.4em; color: var(--text); font-size: 0.95rem; line-height: 1.4; }
`;

function needDocument(who) {
  if (typeof document === 'undefined') throw new TypeError(`${who} needs a document`);
}

function ensureStyle() {
  const head = document.head;
  if (!head || head.querySelector('style[data-for="decisions"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'decisions');
  s.textContent = STYLE;
  head.appendChild(s);
}

function checkPrefix(who, idPrefix) {
  if (typeof idPrefix !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(idPrefix)) {
    throw new TypeError(`${who}: idPrefix is required (letters, digits, - and _, starting with a letter)`);
  }
}

function h(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) node.append(kid);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

// A three-step staircase (the names of an angle). none: a dash (no steps). any: three outlined steps (any one will do).
// all: three solid steps. home: the middle step solid (the home window). continuous: outlined steps cut by a dashed seam.
function namesMark(code) {
  const svg = svgNode('svg', { class: 'names-mark', viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' });
  if (code === 'none') {
    svg.append(svgNode('line', { class: 'ns-dash', x1: 3, y1: 8, x2: 13, y2: 8 }));
    return svg;
  }
  const steps = [[1, 10, 4, 5], [6, 6, 4, 9], [11, 2, 4, 13]];
  steps.forEach(([x, y, w, hh], i) => {
    const solid = code === 'all' || (code === 'home' && i === 1);
    svg.append(svgNode('rect', { class: solid ? 'ns ns-solid' : 'ns', x, y, width: w, height: hh, rx: 0.6 }));
  });
  if (code === 'continuous') svg.append(svgNode('line', { class: 'ns-seam', x1: 8, y1: 0, x2: 8, y2: 16 }));
  return svg;
}

function addressDots(code) {
  const dots = h('span', { class: 'addr-dots', 'aria-hidden': 'true' });
  for (const token of addressTones(code)) dots.append(h('span', { class: 'addr-dot', 'data-tone': token.replace(/^--/, '') }));
  return dots;
}

function singleTone(code) {
  const tones = [...new Set(addressTones(code).map((t) => t.replace(/^--/, '')))];
  return tones.length === 1 ? tones[0] : null;
}

function addressContent(code) {
  return [addressDots(code), document.createTextNode(addressLabel(code))];
}

function namesContent(code) {
  return [namesMark(code), document.createTextNode(namesLabel(code))];
}

export function chips(problem, { idPrefix, meaning = true } = {}) {
  checkPrefix('chips', idPrefix);
  needDocument('chips');
  ensureStyle();
  const p = problem && typeof problem === 'object' ? problem : {};
  const host = h('span', { class: 'decisions', 'data-problem': typeof p.id === 'string' ? p.id : null });
  const tag = meaning ? 'button' : 'span';
  const make = (decision, code, tip, content, tone) => {
    const chip = h(tag, {
      class: 'chip decision-chip', id: `${idPrefix}-${decision}`, 'data-decision': decision, 'data-value': code, title: tip, 'data-tone': tone,
      type: meaning ? 'button' : null, 'aria-expanded': meaning ? 'false' : null, 'aria-controls': meaning ? `${idPrefix}-meaning` : null,
    });
    chip.append(...content);
    return chip;
  };
  if (isAddress(p.address)) host.append(make('address', p.address, addressMeaning(p.address), addressContent(p.address), singleTone(p.address)));
  if (isNames(p.names)) host.append(make('names', p.names, namesMeaning(p.names), namesContent(p.names), null));
  if (!meaning) return host;

  const note = h('span', { class: 'decision-meaning', id: `${idPrefix}-meaning`, role: 'status', hidden: true });
  host.append(note);
  const buttons = () => [...host.querySelectorAll('button.decision-chip')];
  const close = () => {
    for (const b of buttons()) b.setAttribute('aria-expanded', 'false');
    note.hidden = true;
    note.textContent = '';
    note.removeAttribute('data-for');
  };
  host.addEventListener('click', (e) => {
    const chip = e.target instanceof Element ? e.target.closest('button.decision-chip') : null;
    if (!chip || !host.contains(chip)) return;
    const wasOpen = chip.getAttribute('aria-expanded') === 'true';
    close();
    if (wasOpen) return;
    const which = chip.dataset.decision;
    note.textContent = which === 'address' ? addressMeaning(chip.dataset.value) : namesMeaning(chip.dataset.value);
    note.dataset.for = which;
    chip.setAttribute('aria-expanded', 'true');
    note.hidden = false;
  });
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !note.hidden) close();
  });
  return host;
}

// What the picker says under the rows once marked: "Address: right. Names: wrong. It is all. Every name gives ...".
function statusText(marks, expected) {
  const parts = [];
  for (const decision of ['address', 'names']) {
    const m = marks[decision];
    if (m === null || m === undefined) continue;
    const name = decision === 'address' ? 'Address' : 'Names';
    if (m === true) { parts.push(`${name}: right.`); continue; }
    const want = expected && typeof expected === 'object' ? expected[decision] : undefined;
    const label = decision === 'address' ? addressLabel(want) : (isNames(want) ? want : '');
    const mean = decision === 'address' ? addressMeaning(want) : namesMeaning(want);
    parts.push(label ? `${name}: wrong. It is "${label}". ${mean}` : `${name}: wrong.`);
  }
  return parts.join(' ');
}

export function picker({ idPrefix, onPick = null, address = null, names = null } = {}) {
  checkPrefix('picker', idPrefix);
  needDocument('picker');
  ensureStyle();
  const state = { address: isAddress(address) ? address : null, names: isNames(names) ? names : null };
  let destroyed = false;
  let disabled = false;

  const rows = {};
  const opts = { address: [], names: [] };
  const buildRow = (decision, label, hint, codes) => {
    const labelId = `${idPrefix}-${decision}-label`;
    const box = h('div', { class: 'dp-opts' });
    for (const code of codes) {
      const names = decision === 'names';
      const btn = h('button', {
        type: 'button', class: 'chip decision-chip dp-opt', id: `${idPrefix}-${decision}-${slug(code)}`, 'data-decision': decision, 'data-value': code,
        'aria-pressed': 'false', title: names ? namesMeaning(code) : addressMeaning(code), 'data-tone': names ? null : singleTone(code),
      });
      btn.append(...(names ? [namesMark(code), document.createTextNode(code)] : [addressDots(code), document.createTextNode(addressLabel(code))]));
      opts[decision].push(btn);
      box.append(btn);
    }
    const row = h('div', { class: 'dp-row', id: `${idPrefix}-${decision}-row`, role: 'group', 'aria-labelledby': labelId, 'data-decision': decision },
      h('div', { class: 'dp-head' }, h('span', { class: 'dp-label', id: labelId }, label), h('span', { class: 'dp-hint' }, hint)), box);
    rows[decision] = row;
    return row;
  };
  const status = h('p', { class: 'dp-status', id: `${idPrefix}-status`, role: 'status' });
  const el = h('fieldset', { class: 'decisions-picker', id: idPrefix },
    h('legend', { class: 'dp-legend' }, 'The two decisions'),
    buildRow('address', 'Address', 'Which address makes this easy?', ADDRESS_CODES),
    buildRow('names', 'Names', 'Which names of the angle does it need?', NAMES_CODES),
    status);

  const paint = () => {
    for (const decision of ['address', 'names']) for (const btn of opts[decision]) btn.setAttribute('aria-pressed', String(state[decision] === btn.dataset.value));
  };
  const clearMark = (decision) => {
    rows[decision].removeAttribute('data-mark');
    rows[decision].removeAttribute('aria-invalid');
    for (const btn of opts[decision]) btn.removeAttribute('data-expected');
    status.textContent = '';
  };
  paint();

  el.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('.dp-opt') : null;
    if (!btn || destroyed || disabled || !el.contains(btn)) return;
    const decision = btn.dataset.decision;
    state[decision] = state[decision] === btn.dataset.value ? null : btn.dataset.value;
    paint();
    clearMark(decision);
    if (typeof onPick === 'function') {
      try { onPick(decision, state[decision]); } catch (err) { console.error('[decisions] onPick threw', err); }
    }
  });
  el.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const btn = e.target instanceof Element ? e.target.closest('.dp-opt') : null;
    if (!btn) return;
    const list = opts[btn.dataset.decision];
    const i = list.indexOf(btn);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    e.preventDefault();
    list[j].focus();
  });

  return {
    el,
    get: () => ({ address: state.address, names: state.names }),
    set(next) {
      if (destroyed || !next || typeof next !== 'object') return;
      if ('address' in next && (next.address === null || isAddress(next.address))) state.address = next.address;
      if ('names' in next && (next.names === null || isNames(next.names))) state.names = next.names;
      paint();
    },
    mark(result) {
      if (destroyed) return;
      const r = result && typeof result === 'object' ? result : {};
      for (const decision of ['address', 'names']) {
        const m = r[decision];
        clearMark(decision);
        if (m === true || m === false) {
          rows[decision].setAttribute('data-mark', m ? 'right' : 'wrong');
          if (!m) rows[decision].setAttribute('aria-invalid', 'true');
          const want = r.expected && typeof r.expected === 'object' ? r.expected[decision] : undefined;
          if (!m) for (const btn of opts[decision]) if (btn.dataset.value === want) btn.setAttribute('data-expected', 'true');
        }
      }
      status.textContent = statusText({ address: r.address, names: r.names }, r.expected);
    },
    reset() {
      if (destroyed) return;
      state.address = null;
      state.names = null;
      paint();
      clearMark('address');
      clearMark('names');
    },
    disable(on) {
      if (destroyed) return;
      disabled = !!on;
      el.disabled = disabled;
      for (const decision of ['address', 'names']) for (const btn of opts[decision]) btn.disabled = disabled;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      el.remove();
    },
  };
}
