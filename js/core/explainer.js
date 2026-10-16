// js/core/explainer.js
// The two-column live numeric explainer: the same quantity worked in Cartesian (left, --cart) and
// polar (right, --polar), numbers updating as the student drags, closed by a "same point" row that
// says whether the two addresses agree (spec.sameLabel renames "same point" when the quantity is not a point). An optional "easy in <address>" badge on a row says which
// address the question is native to (pick the address where it is easy, do it there, translate back).
//
//   const ex = createExplainer(host, { id, title?, columns?, rows, same?, sameLabel? });
//   ex.update(state);   // call as often as you like (every pointer move); renders are coalesced
//   ex.destroy();       // in unmount
//
// sameLabel: the words before the verdict in the footer, default 'same point'. A string, or a function of the
// state that returns one ('same distance', 'same radius', 'room around p'); anything else falls back to the default.
// Cells are rendered through katex.js, so TeX strings may carry cart()/polar() tints. A cell function
// returns a TeX string, null (empty cell) or { text: 'plain prose' }.
// Imports only ./katex.js (same-goal exception). No top-level DOM access, so it imports in Node.
// Design: docs/designs/iter-1/i1-core-widgets.md, sections 2.1, 3, 4.2, 5.2.

import { tex } from './katex.js';

const STREAM_MS = 200; // updates closer together than this count as a drag
const REFINE_MS = 220; // one full-quality (MathML) pass this long after the last update
const MAX_GAP_MS = 100; // the adaptive throttle never waits longer than this between renders
const NARROW_PX = 560; // stacked layout at or below this width
const EM_DASH = '—';
const ELLIPSIS = '…';
const TONE_RE = /^--[A-Za-z0-9_-]+$/;
const SAME_LABEL = 'same point';

// ---------------------------------------------------------------- pure helpers

export function sanitizeId(s) {
  return String(s == null ? '' : s).replace(/[^A-Za-z0-9_-]/g, '-');
}

// 'Cartesian (slide)' -> 'Cartesian'; a heading that is only a parenthesis is kept whole.
export function shortHeading(heading) {
  const h = String(heading == null ? '' : heading);
  const s = h.replace(/\s*\([^)]*\)\s*$/, '');
  return s === '' ? h : s;
}

const DEFAULT_COLUMNS = [
  { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart' },
  { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar' },
];

function normaliseColumns(cols) {
  const src = Array.isArray(cols) && cols.length > 0 ? cols.slice(0, 3) : DEFAULT_COLUMNS;
  const out = [];
  const seen = new Set();
  for (const c of src) {
    if (!c || typeof c.key !== 'string' || c.key === '') continue;
    const key = sanitizeId(c.key);
    if (seen.has(key)) {
      console.warn(`[explainer] duplicate column key "${key}" skipped`);
      continue;
    }
    seen.add(key);
    const heading = String(c.heading == null ? c.key : c.heading);
    out.push({
      key,
      rawKey: c.key,
      heading,
      tone: typeof c.tone === 'string' && TONE_RE.test(c.tone) ? c.tone : '--text',
      tint: !!c.tint,
      short: c.short ? String(c.short) : shortHeading(heading),
    });
  }
  return out.length > 0 ? out : normaliseColumns(null);
}

// ---------------------------------------------------------------- styles

const stack = (p) => `
  ${p} .explainer, ${p} .explainer tbody, ${p} .explainer tfoot, ${p} .explainer tr, ${p} .explainer th, ${p} .explainer td { display: block; }
  ${p} .explainer caption { display: block; width: 100%; }
  ${p} .explainer thead { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  ${p} .explainer thead tr { display: block; }
  ${p} .explainer thead th { display: inline; }
  ${p} .explainer .ex-rowlabel { width: auto; padding-bottom: 0; }
  ${p} .explainer tr.ex-row { border-top: 1px solid var(--border, GrayText); }
  ${p} .explainer tr.ex-row > * { border-top: 0; }
  ${p} .explainer td.ex-cell::before { content: attr(data-heading); display: block; margin-bottom: .125rem; font-family: var(--font, inherit); font-size: .72rem; font-weight: 700; letter-spacing: .03em; color: var(--ex-tone, inherit); }
  ${p} .explainer tfoot tr { border-top: 2px solid var(--border, GrayText); }
  ${p} .explainer tfoot > tr > * { border-top: 0; }
  ${p} .explainer .ex-same-label { display: inline; }
  ${p} .explainer tfoot th { padding-right: var(--space-3, .75rem); }
`;

const CSS = `
.explainer-wrap { position: relative; max-width: 100%; background: var(--surface, Canvas); border: 1px solid var(--border, GrayText); border-radius: var(--radius, 8px); overflow: hidden; }
.explainer { width: 100%; max-width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0;
  font-family: var(--font, inherit); font-size: 1rem; color: var(--text, CanvasText); }
.explainer caption { caption-side: top; text-align: left; font-weight: 700; padding: var(--space-2, .5rem) var(--space-3, .75rem);
  background: var(--surface-2, Canvas); border-bottom: 1px solid var(--border, GrayText); }
.explainer th, .explainer td { padding: var(--space-2, .5rem) var(--space-3, .75rem); text-align: left; vertical-align: top;
  border-top: 1px solid var(--border, GrayText); min-width: 0; overflow-wrap: anywhere; }
.explainer thead th { border-top: 0; font-size: .85rem; font-weight: 700; letter-spacing: .02em; color: var(--ex-tone, var(--text, CanvasText));
  border-bottom: 3px solid var(--ex-tone, var(--border, GrayText)); background: var(--surface-2, Canvas); }
.explainer thead th.ex-corner { width: 8rem; border-bottom-color: var(--border, GrayText); color: transparent; }
.explainer .ex-rowlabel { width: 8rem; font-size: .9rem; font-weight: 600; color: var(--text-muted, GrayText); }
.explainer .ex-native { display: block; margin-top: .125rem; font-size: .72rem; font-weight: 700; letter-spacing: .03em; color: var(--ex-tone, var(--text, CanvasText)); }
.explainer .ex-native[hidden] { display: none; }
.explainer td.ex-cell { position: relative; isolation: isolate; box-shadow: inset 3px 0 0 var(--ex-tone, var(--border, GrayText)); }
.explainer td.ex-cell::after { content: ''; position: absolute; inset: 0; z-index: -1; background: var(--ex-tone, transparent); opacity: 0; pointer-events: none; }
.explainer td.ex-cell[data-native="true"]::after { opacity: .09; }
.explainer td.ex-cell[data-native="true"] { font-weight: 600; }
.explainer td.ex-cell.ex-tinted, .explainer tfoot td.ex-cell { color: var(--ex-tone, inherit); }
.explainer td.ex-cell.is-empty { color: var(--text-muted, GrayText); }
.explainer td.tex-error { color: var(--danger, CanvasText); font-family: var(--font-mono, monospace); font-size: .85rem; }
.explainer .katex { font-size: 1.05em; }
.explainer[data-state="idle"] td.ex-cell { color: var(--text-muted, GrayText); }
.explainer tfoot th, .explainer tfoot td { background: var(--surface-2, Canvas); border-top: 2px solid var(--border, GrayText); }
.explainer tfoot th { padding-right: var(--space-1, .25rem); }
.explainer .ex-same-label { display: block; }
.explainer .ex-same-verdict { display: inline-flex; align-items: center; gap: .25rem; font-weight: 700; white-space: nowrap; }
.explainer .ex-same-verdict::before { content: ''; width: .65rem; height: .65rem; border-radius: 50%; background: var(--text-muted, GrayText); flex: none; }
.explainer tr.ex-same[data-agree="true"] .ex-same-verdict { color: var(--ok, inherit); }
.explainer tr.ex-same[data-agree="true"] .ex-same-verdict::before { background: var(--ok, currentColor); }
.explainer tr.ex-same[data-agree="false"] .ex-same-verdict { color: var(--warn, inherit); }
.explainer tr.ex-same[data-agree="false"] .ex-same-verdict::before { background: var(--warn, currentColor); border-radius: 2px; }
@media (max-width: ${NARROW_PX}px) { ${stack('')} }
${stack('.explainer-wrap[data-narrow="true"]')}
`;

function ensureStyle() {
  const doc = globalThis.document;
  if (!doc || !doc.head || typeof doc.createElement !== 'function') return;
  if (doc.head.querySelector('style[data-for="explainer"]')) return;
  const s = doc.createElement('style');
  s.setAttribute('data-for', 'explainer');
  s.textContent = CSS;
  doc.head.appendChild(s);
}

// ---------------------------------------------------------------- timing helpers (Node-safe)

const now = () => (globalThis.performance && typeof globalThis.performance.now === 'function' ? globalThis.performance.now() : Date.now());

function requestFrame(fn) {
  if (typeof globalThis.requestAnimationFrame === 'function') return { id: globalThis.requestAnimationFrame(fn), timer: false };
  return { id: setTimeout(fn, 16), timer: true };
}
function cancelFrame(h) {
  if (!h) return;
  if (h.timer) clearTimeout(h.id);
  else if (typeof globalThis.cancelAnimationFrame === 'function') globalThis.cancelAnimationFrame(h.id);
}

// ---------------------------------------------------------------- cell values

// A cell value is a TeX string, null/false/'' (empty), or { text } (prose, no KaTeX).
function classify(v) {
  if (v == null || v === false || v === '') return ['empty', ''];
  if (typeof v === 'object') return typeof v.text === 'string' && v.text !== '' ? ['text', v.text] : ['empty', ''];
  return ['tex', String(v)];
}

// ---------------------------------------------------------------- the widget

export function createExplainer(container, spec) {
  if (!container || typeof container.appendChild !== 'function') throw new TypeError('createExplainer: a container element is required');
  if (!spec || typeof spec.id !== 'string' || spec.id.trim() === '') throw new TypeError('createExplainer: spec.id is required');
  ensureStyle();
  const doc = container.ownerDocument || globalThis.document;
  const id = sanitizeId(spec.id);
  const columns = normaliseColumns(spec.columns);
  const colBy = new Map();
  for (const c of columns) {
    colBy.set(c.key, c);
    colBy.set(c.rawKey, c);
  }
  const hasSame = typeof spec.same === 'function';
  const stats = { renders: 0, refines: 0, cellWrites: 0 };

  const mk = (tag, cls, attrs) => {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
    return n;
  };
  const tone = (node, col) => node.style.setProperty('--ex-tone', `var(${col.tone})`);

  // ---- static DOM
  const wrap = mk('div', 'explainer-wrap', { 'data-explainer': id });
  const table = mk('table', 'explainer', { id: `${id}-table`, role: 'table', 'data-state': 'idle' });
  if (spec.title) {
    const cap = mk('caption', 'ex-title');
    cap.textContent = String(spec.title);
    table.appendChild(cap);
  } else {
    table.setAttribute('aria-label', 'Cartesian and polar working');
  }
  const thead = mk('thead', '', { role: 'rowgroup' });
  const headRow = mk('tr', '', { role: 'row' });
  const corner = mk('th', 'ex-corner', { scope: 'col', role: 'columnheader' });
  corner.textContent = 'Quantity';
  headRow.appendChild(corner);
  for (const col of columns) {
    const th = mk('th', '', { scope: 'col', role: 'columnheader', 'data-col': col.key });
    tone(th, col);
    th.textContent = col.heading;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  const tbody = mk('tbody', '', { role: 'rowgroup' });
  table.append(thead, tbody);

  let sameRow = null;
  let sameVerdict = null;
  let sameLab = null;
  const sameTds = new Map();
  if (hasSame) {
    const tfoot = mk('tfoot', '', { role: 'rowgroup' });
    sameRow = mk('tr', 'ex-same', { id: `${id}-same`, role: 'row', 'data-agree': '' });
    const th = mk('th', 'ex-rowlabel', { scope: 'row', role: 'rowheader' });
    const lab = mk('span', 'ex-same-label');
    sameLab = lab;
    lab.textContent = SAME_LABEL + ': ';
    sameVerdict = mk('span', 'ex-same-verdict');
    sameVerdict.textContent = 'not checked';
    th.append(lab, sameVerdict);
    sameRow.appendChild(th);
    for (const col of columns) {
      const td = mk('td', 'ex-cell', { id: `${id}-same-${col.key}`, role: 'cell', 'data-col': col.key, 'data-heading': col.heading });
      tone(td, col);
      td.textContent = ELLIPSIS;
      sameTds.set(col.key, td);
      sameRow.appendChild(td);
    }
    tfoot.appendChild(sameRow);
    table.appendChild(tfoot);
  }
  wrap.appendChild(table);

  // ---- state
  const rowRecs = new Map(); // rid -> { row, tr, nat, tds: Map(colKey -> td), native }
  const lastKey = new Map(); // td -> key of the content last written
  const reported = new Set(); // console.error de-duplication
  let lastState;
  let hasState = false;
  let rendered = false;
  let fast = false; // true while updates stream in: cells render without the MathML half
  let lastUpdateAt = -Infinity;
  let lastRenderEnd = -Infinity;
  let lastRenderMs = 0;
  let frame = null;
  let idleTimer = 0;
  let destroyed = false;
  let lastVerdict = null;
  const cleanups = [];

  function logOnce(who, msg) {
    const k = `${who}\u0000${msg}`;
    if (reported.has(k)) return;
    reported.add(k);
    console.error(`[explainer ${id}] ${who}: ${msg}`);
  }

  // The footer words for this state: spec.sameLabel as a string or a function of the state; the default on anything else.
  function sameLabelFor(state) {
    let v = spec.sameLabel;
    if (typeof v === 'function') {
      try {
        v = v(state);
      } catch (e) {
        logOnce('sameLabel', e && e.message ? e.message : String(e));
        v = null;
      }
    }
    v = typeof v === 'string' ? v.replace(/\s*:\s*$/, '').trim() : '';
    return v === '' ? SAME_LABEL : v;
  }

  function buildRows(list) {
    for (const rec of rowRecs.values()) for (const td of rec.tds.values()) lastKey.delete(td);
    rowRecs.clear();
    tbody.textContent = '';
    for (const row of Array.isArray(list) ? list : []) {
      if (!row || row.id == null || row.id === '') continue;
      const rid = sanitizeId(row.id);
      if (rowRecs.has(rid)) {
        console.warn(`[explainer ${id}] duplicate row id "${rid}" skipped`);
        continue;
      }
      const tr = mk('tr', 'ex-row', { role: 'row', 'data-row': rid });
      const th = mk('th', 'ex-rowlabel', { scope: 'row', role: 'rowheader' });
      const lab = mk('span', 'ex-label');
      lab.textContent = row.label == null ? '' : String(row.label);
      const nat = mk('span', 'ex-native');
      nat.hidden = true;
      th.append(lab, nat);
      tr.appendChild(th);
      const tds = new Map();
      for (const col of columns) {
        const td = mk('td', col.tint ? 'ex-cell ex-tinted' : 'ex-cell', {
          id: `${id}-${rid}-${col.key}`,
          role: 'cell',
          'data-col': col.key,
          'data-heading': col.heading,
          'data-native': 'false',
          'data-tex': '',
        });
        tone(td, col);
        td.textContent = ELLIPSIS;
        tds.set(col.key, td);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      rowRecs.set(rid, { row, tr, nat, tds, native: null });
    }
  }

  function cellFor(fnOrValue, state, who) {
    let v;
    try {
      v = typeof fnOrValue === 'function' ? fnOrValue(state) : typeof fnOrValue === 'string' ? fnOrValue : null;
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      logOnce(who, msg);
      return ['error', `Could not compute: ${msg}`];
    }
    return classify(v);
  }

  function writeCell(td, kind, payload) {
    let key;
    if (kind === 'tex') {
      key = payload + (fast ? '\u0000H' : '\u0000M');
      const cur = lastKey.get(td);
      if (cur === key) return;
      if (fast && cur === payload + '\u0000M') return; // already at full quality: do not downgrade a static cell
    } else {
      key = `${kind}\u0000${payload}`;
      if (lastKey.get(td) === key) return;
    }
    lastKey.set(td, key);
    stats.cellWrites++;
    td.classList.remove('is-empty');
    if (kind === 'empty') {
      td.classList.remove('tex-error');
      td.removeAttribute('title');
      td.textContent = EM_DASH;
      td.classList.add('is-empty');
      td.dataset.tex = '';
    } else if (kind === 'text') {
      td.classList.remove('tex-error');
      td.removeAttribute('title');
      td.textContent = payload;
      td.dataset.tex = '';
    } else if (kind === 'error') {
      td.textContent = 'n/a';
      td.classList.add('tex-error');
      td.setAttribute('title', payload);
      td.dataset.tex = '';
    } else {
      tex(td, payload, { display: false, mathml: !fast }); // inline mode, so formulas can wrap
      td.dataset.tex = payload;
    }
  }

  function applyNative(rec, nk) {
    if (rec.native === nk) return;
    rec.native = nk;
    for (const col of columns) rec.tds.get(col.key).setAttribute('data-native', String(col.key === nk));
    const col = nk ? colBy.get(nk) : null;
    if (col) {
      rec.nat.textContent = `easy in ${col.short}`;
      tone(rec.nat, col);
      rec.nat.hidden = false;
    } else {
      rec.nat.textContent = '';
      rec.nat.style.removeProperty('--ex-tone');
      rec.nat.hidden = true;
    }
  }

  function render(kind) {
    if (destroyed) return;
    const t0 = now();
    if (kind === 'refine') stats.refines++;
    else stats.renders++;
    if (!rendered) {
      rendered = true;
      table.removeAttribute('data-state');
    }
    const state = lastState;
    for (const [rid, rec] of rowRecs) {
      for (const col of columns) {
        const fn = rec.row[col.rawKey] !== undefined ? rec.row[col.rawKey] : rec.row[col.key];
        const [k, p] = cellFor(fn, state, `${rid}/${col.key}`);
        writeCell(rec.tds.get(col.key), k, p);
      }
      let nk = null;
      try {
        nk = typeof rec.row.native === 'function' ? rec.row.native(state) : rec.row.native;
      } catch (e) {
        nk = null;
      }
      const ncol = typeof nk === 'string' ? colBy.get(nk) : null;
      applyNative(rec, ncol ? ncol.key : null);
    }
    if (hasSame) {
      let obj = null;
      let failed = false;
      try {
        const r = spec.same(state);
        obj = r && typeof r === 'object' ? r : null;
      } catch (e) {
        failed = true;
        logOnce('same', e && e.message ? e.message : String(e));
      }
      const labelText = sameLabelFor(state) + ': ';
      if (sameLab.textContent !== labelText) sameLab.textContent = labelText;
      const agree = obj && obj.agree === true ? 'true' : obj && obj.agree === false ? 'false' : '';
      const verdict = agree === 'true' ? 'agree' : agree === 'false' ? 'differ' : 'not checked';
      if (lastVerdict !== verdict) {
        lastVerdict = verdict;
        sameRow.setAttribute('data-agree', agree);
        sameVerdict.textContent = verdict;
      }
      for (const col of columns) {
        const td = sameTds.get(col.key);
        if (failed) writeCell(td, 'error', 'Could not compute the same-point row');
        else if (!obj) writeCell(td, 'empty', '');
        else writeCell(td, ...classify(obj[col.rawKey] !== undefined ? obj[col.rawKey] : obj[col.key]));
      }
    }
    lastRenderEnd = now();
    lastRenderMs = lastRenderEnd - t0;
  }

  function schedule() {
    if (destroyed || frame) return;
    frame = requestFrame(tick);
  }

  // Adaptive throttle: once a render costs 8 ms or more, wait up to twice that between renders, so a
  // slow explainer never uses more than about half of the main thread.
  function tick() {
    frame = null;
    if (destroyed) return;
    const gap = lastRenderMs < 8 ? 0 : Math.min(MAX_GAP_MS, 2 * lastRenderMs);
    if (now() - lastRenderEnd < gap) {
      schedule();
      return;
    }
    render('tick');
  }

  function refine() {
    idleTimer = 0;
    if (destroyed || !hasState) return;
    fast = false;
    render('refine');
  }

  function update(state) {
    if (destroyed) return;
    try {
      lastState = state;
      hasState = true;
      const t = now();
      fast = t - lastUpdateAt < STREAM_MS;
      lastUpdateAt = t;
      if (fast) {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(refine, REFINE_MS);
      }
      if (!rendered) {
        render('tick'); // the table is never seen empty
        return;
      }
      schedule();
    } catch (e) {
      console.error(`[explainer ${id}] update failed`, e);
    }
  }

  function flush() {
    if (destroyed || !hasState) return;
    cancelFrame(frame);
    frame = null;
    clearTimeout(idleTimer);
    idleTimer = 0;
    fast = false;
    render('tick');
  }

  function setRows(list) {
    if (destroyed) return;
    cancelFrame(frame);
    frame = null;
    buildRows(list);
    if (hasState) {
      fast = false;
      render('tick');
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelFrame(frame);
    frame = null;
    clearTimeout(idleTimer);
    idleTimer = 0;
    for (const fn of cleanups.splice(0)) {
      try {
        fn();
      } catch (e) {
        /* ignore */
      }
    }
    wrap.remove();
    rowRecs.clear();
    lastKey.clear();
    sameTds.clear();
  }

  // ---- narrow (stacked) layout: viewport media query in CSS, plus the widget's own width here
  function setNarrow(w) {
    if (w > 0) wrap.dataset.narrow = String(w <= NARROW_PX);
  }

  // ---- go
  buildRows(spec.rows);
  container.appendChild(wrap);
  try {
    setNarrow(wrap.clientWidth);
  } catch (e) {
    /* detached or exotic container */
  }
  if (typeof globalThis.ResizeObserver === 'function') {
    // setNarrow changes the observed element's height, so it runs in the next frame, not inside the callback:
    // writing inside it makes Chromium report "ResizeObserver loop completed with undelivered notifications".
    let roWidth = 0;
    let roFrame = null;
    const ro = new globalThis.ResizeObserver((entries) => {
      if (destroyed) return;
      for (const en of entries) roWidth = en.contentRect.width;
      if (roFrame) return;
      roFrame = requestFrame(() => {
        roFrame = null;
        if (!destroyed) setNarrow(roWidth);
      });
    });
    ro.observe(wrap);
    cleanups.push(() => {
      cancelFrame(roFrame);
      roFrame = null;
      ro.disconnect();
    });
  }

  // Theme: baked tints are re-created by the row functions, so exactly the cells whose TeX string
  // changes re-render; the key comparison skips the rest.
  const onTheme = () => {
    if (destroyed || !hasState) return;
    fast = false;
    schedule();
  };
  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('themechange', onTheme);
    cleanups.push(() => doc.removeEventListener('themechange', onTheme));
  }
  if (typeof globalThis.matchMedia === 'function') {
    try {
      const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
      if (mq && typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', onTheme);
        cleanups.push(() => mq.removeEventListener('change', onTheme));
      }
    } catch (e) {
      /* no media query support */
    }
  }
  if (typeof globalThis.MutationObserver === 'function' && doc && doc.documentElement) {
    const mo = new globalThis.MutationObserver(onTheme);
    mo.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    cleanups.push(() => mo.disconnect());
  }

  return { el: container, update, flush, setRows, destroy, stats };
}
