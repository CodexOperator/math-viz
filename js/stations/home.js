// js/stations/home.js
// The Map: the first screen of the site. A finder, one draggable dot with both of its addresses and all of its names,
// the four-line spine of the test, an SVG map of the 21 places with the three story threads, and a night-before plan.
//
// Pure helpers (layoutMap, the finder, the readout) have no DOM and import in Node. All DOM work happens inside mount.
// Every text goes through textContent, createTextNode, prose() or appendStatement() (tex() in problems.js); there is no innerHTML in this file.
// Design: docs/designs/iter-1/i1-station-home-problems.md (sections 2 to 5 and Appendix A).

import { STATIONS, THREADS, stationById, stationForTopic, threadLabel, threadLinkPrefix, stationsForMap } from '../registry.js';
import { PROBLEMS, TOPICS, problemById, routeFor, topicRoute, statementParts } from '../data/problems.js';
import { createPlane, drawCartAddress, drawPolarAddress, drawSeam } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { cart as tintCart, polar as tintPolar, prose } from '../core/katex.js';
import { C, Arg, abs, eq, fromPolar, fmtCart, fmtNum, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
import { sanitizeProgress, countTicked, stationNeighbours, shortTitle, shortThreadTitle, typesetTitle, titleSpan, appendStatement, PROGRESS_KEY } from './problems.js';
import { mapSwitch } from './map-switch.js';
import { mountTest2Home } from './home-test2.js';
import { mountMatrixBoard } from './matrix-board.js';

export { shortTitle, shortThreadTitle };

const SVGNS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------- constants

// The narrowest host that gets the serpentine map. 712 is where the part captions (the longest words on the map) still clear each other
// in the collision sweep of the unit tests (U6); below it a caption pair overlaps, so the tall single column takes over.
export const WIDE_MIN = 712;
// The five part names. app.js keeps its own copy (PART_TITLES); a unit test checks that they still agree.
export const PART_LABELS = { I: 'R21 · the point', II: 'R14 · curves', III: 'R2, R11 · motions', IV: 'R11 · the zoom', V: 'Diary and index' };
export const GEOM = Object.freeze({
  PADX: 24, COLS: 7, TOP: 64, PITCH: 156, BOTTOM: 100, LANE: 9, PILL_W: 26, PILL_H: 40, CHAR_W: 6.6,
  N_AXIS: 32, N_PITCH: 48, N_PART_H: 30, N_TOP: 8, N_BOTTOM: 12,
});

// ---------------------------------------------------------------- pure helpers: labels and the map

// Greedy word wrap that also breaks after a hyphen; an ellipsis on the last line when the text is cut.
export function wrapLabel(text, maxChars, maxLines = 3) {
  const pieces = [];
  for (const w of String(text ?? '').trim().split(/\s+/).filter(Boolean)) {
    (w.match(/[^-]+-|[^-]+$|-/g) || [w]).forEach((t, i) => pieces.push({ t, join: i > 0 }));
  }
  const lines = [];
  let cur = '';
  for (const p of pieces) {
    const cand = cur === '' ? p.t : cur + (p.join ? '' : ' ') + p.t;
    if (cand.length <= maxChars || cur === '') cur = cand;
    else {
      lines.push(cur);
      cur = p.t;
    }
  }
  if (cur !== '') lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines);
    keep[maxLines - 1] = keep[maxLines - 1].slice(0, Math.max(1, maxChars - 1)).replace(/[\s-]+$/, '') + '…';
    return keep;
  }
  return lines;
}

// Station ids, in map order, whose thread list includes threadId.
export function threadStops(stations, threadId) {
  return stations.slice().sort((a, b) => a.order - b.order).filter((s) => s.threads.includes(threadId)).map((s) => s.id);
}

// Pure geometry of the map for a container width. Wide (>= WIDE_MIN): 3 serpentine rows of 7. Narrow: one vertical track.
export function layoutMap(stations = STATIONS, width = 360, threads = THREADS, problems = PROBLEMS, partLabels = PART_LABELS) {
  const K = GEOM;
  const list = stations.slice().sort((a, b) => a.order - b.order);
  const W = Math.max(280, Math.round(Number(width) || 360));
  const mode = W >= WIDE_MIN ? 'wide' : 'narrow';
  const laneOf = (k) => ((threads.length - 1) / 2 - k) * K.LANE;
  const owned = (id) => problems.filter((p) => p.station === id).map((p) => p.id);
  const nodes = [];
  const parts = [];
  let height;
  let colW = null;
  let rows;
  if (mode === 'wide') {
    colW = (W - 2 * K.PADX) / K.COLS;
    const maxChars = Math.floor((colW - 12) / K.CHAR_W);
    list.forEach((s, i) => {
      const row = Math.floor(i / K.COLS);
      const c = i % K.COLS;
      const dir = row % 2 === 0 ? 1 : -1;
      const col = dir > 0 ? c : K.COLS - 1 - c;
      const x = K.PADX + colW * (col + 0.5);
      const y = K.TOP + K.PITCH * row;
      const turn = c === K.COLS - 1 && i + 1 < list.length;
      const ids = owned(s.id);
      nodes.push({
        id: s.id, order: s.order, part: s.part, row, col, dir, x, y,
        pill: { x: x - K.PILL_W / 2, y: y - K.PILL_H / 2, w: K.PILL_W, h: K.PILL_H },
        num: { x, y: y - 27, anchor: 'middle', text: String(s.order) },
        label: { x, y: y + 36, anchor: 'middle', lines: wrapLabel(typesetTitle(shortTitle(s.title)), turn ? Math.min(maxChars - 4, 14) : maxChars) },
        dots: ids.map((pid, j) => ({ problem: pid, x: x + (j - (ids.length - 1) / 2) * 10, y: y + 84 })),
        hit: { x: x - colW / 2, y: y - 34, w: colW, h: 126 },
      });
      const first = i === 0 || list[i - 1].part !== s.part;
      if (first || c === 0) {
        parts.push({
          part: s.part, text: `${s.part} · ${partLabels[s.part] || s.part}` + (first ? '' : ' cont.'), cont: !first,
          x: x - dir * 12, y: y - 44, anchor: dir > 0 ? 'start' : 'end', node: s.id,
        });
      }
    });
    rows = Math.ceil(list.length / K.COLS);
    height = K.TOP + K.PITCH * (rows - 1) + K.BOTTOM;
  } else {
    let y = K.N_TOP;
    rows = list.length;
    list.forEach((s, i) => {
      if (i === 0 || list[i - 1].part !== s.part) {
        parts.push({ part: s.part, text: `${s.part} · ${partLabels[s.part] || s.part}`, cont: false, x: 78, y: y + 20, anchor: 'start', node: s.id });
        y += K.N_PART_H;
      }
      const cy = y + K.N_PITCH / 2;
      const ids = owned(s.id);
      nodes.push({
        id: s.id, order: s.order, part: s.part, row: i, col: 0, dir: 1, x: K.N_AXIS, y: cy,
        pill: { x: K.N_AXIS - 16, y: cy - 17, w: 32, h: 34 },
        num: { x: 70, y: cy - 4, anchor: 'end', text: String(s.order) },
        label: { x: 78, y: cy - 4, anchor: 'start', lines: [typesetTitle(shortTitle(s.title))] },
        dots: ids.map((pid, j) => ({ problem: pid, x: 82 + j * 10, y: cy + 12 })),
        hit: { x: 0, y: cy - K.N_PITCH / 2, w: W, h: K.N_PITCH },
      });
      y += K.N_PITCH;
    });
    height = y + K.N_BOTTOM;
  }
  const f = (v) => Number(v.toFixed(2));
  const out = threads.map((t, k) => {
    const s = laneOf(k);
    const members = list.filter((st) => st.threads.includes(t.id));
    if (!members.length) return { id: t.id, d: '', dash: !!t.dash, stops: [], first: null, last: null, lane: s };
    const first = members[0].order;
    const last = members[members.length - 1].order;
    const lanePt = (n) => (mode === 'wide' ? { x: n.x, y: n.y - n.dir * s } : { x: n.x - s, y: n.y });
    const seq = nodes.filter((n) => n.order >= first && n.order <= last);
    let d = '';
    seq.forEach((n, idx) => {
      const p = lanePt(n);
      d += (idx === 0 ? 'M' : 'L') + `${f(p.x)} ${f(p.y)}`;
      const nxt = seq[idx + 1];
      if (mode === 'wide' && nxt && nxt.row !== n.row) {
        const right = n.row % 2 === 0;
        const xT = n.x + n.dir * (K.PILL_W / 2 + 6);
        const sign = right ? 1 : -1;
        const rx = colW / 2 - 8 + sign * s;
        const ry = K.PITCH / 2 + sign * s;
        d += `L${f(xT)} ${f(n.y - n.dir * s)}A${f(rx)} ${f(ry)} 0 0 ${right ? 1 : 0} ${f(xT)} ${f(nxt.y - nxt.dir * s)}`;
      }
    });
    return {
      id: t.id, d, dash: !!t.dash, first, last, lane: s,
      stops: members.map((st) => {
        const p = lanePt(nodes.find((n) => n.id === st.id));
        return { station: st.id, x: p.x, y: p.y };
      }),
    };
  });
  return { mode, width: W, height, rows, colW, nodes, parts, threads: out };
}

// ---------------------------------------------------------------- pure helpers: the finder

const ALIASES = { cr: 'cauchy riemann' };
export const FINDER_ECHO_MAX = 40;

// '  Problem 1.4.2 ', '#problem-1-4-2', '1 4 2' -> '1.4.2'; 'p 3' -> 'p3'; 'CR' -> 'cauchy riemann'.
export function normalizeQuery(q) {
  let s = String(q ?? '').toLowerCase();
  s = s.replace(/[−–—]/g, '-');
  s = s.replace(/^\s*#/, '');
  s = s.replace(/^\s*(?:problems?|prob)[\s\-_.:#]*(?=[0-9pt])/, '');
  s = s.replace(/[\\{}^_$]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (/^[0-9][0-9\s,._-]*$/.test(s)) {
    s = s.replace(/[\s,._-]+/g, '.').replace(/^\./, '');
    if (/^[0-9]{3}$/.test(s)) s = `${s[0]}.${s[1]}.${s[2]}`;      // '142' is '1.4.2': every problem number is three single digits
  }
  else if (/^[pt][\s._-]*[0-9][0-9\s,._-]*$/.test(s)) s = s[0] + s.slice(1).replace(/[\s,_-]+/g, '.').replace(/^\.+/, '');
  if (Object.prototype.hasOwnProperty.call(ALIASES, s)) s = ALIASES[s];
  return s;
}

const ID_Q = /^(?:\d+(?:\.\d+){0,2}\.?|p\d*|t\d*(?:\.\d*)?)$/;
const plain = (st) => statementParts(st).map((x) => x.text).join(' ').replace(/[\\{}^_$]/g, ' ').replace(/\s+/g, ' ').toLowerCase();

// One searchable record per problem, station and topic.
export function buildSearchItems(problems = PROBLEMS, stations = STATIONS, topics = TOPICS) {
  const items = [];
  problems.forEach((p, i) => {
    const st = stationById(p.station);
    items.push({
      kind: 'problem', id: p.id, key: p.id.toLowerCase(), route: routeFor(p.id), rank: i, station: p.station,
      f: {
        section: p.section.toLowerCase(), text: plain(p.statement), aha: p.aha.toLowerCase(), why: p.addressWhy.toLowerCase(),
        where: (st.id + ' ' + st.title).toLowerCase(),
        topic: p.topics.map((t) => (topics.find((x) => x.id === t) || { title: '' }).title.toLowerCase()).join(' '),
        detail: [p.routes.cart, p.routes.polar, p.answer.text].join(' ').toLowerCase(),
      },
    });
  });
  stations.forEach((s, i) => items.push({
    kind: 'station', id: s.id, key: s.id, route: s.id, rank: i, station: s.id,
    f: { id: s.id, title: s.title.toLowerCase(), summary: s.summary.toLowerCase() },
  }));
  topics.forEach((t, i) => items.push({
    kind: 'topic', id: t.id, key: t.id.toLowerCase(), route: topicRoute(t.id), rank: i,
    f: { title: t.title.toLowerCase(), summary: t.summary.toLowerCase(), covers: t.covers.join(' ').toLowerCase() },
  }));
  return items;
}

const FIELD_WEIGHT = {
  problem: { where: 30, section: 20, text: 15, topic: 12, aha: 10, why: 5, detail: 3 },
  station: { id: 50, title: 40, summary: 8 },
  topic: { title: 40, summary: 8, covers: 8 },
};
const KIND_ORDER = { problem: 0, station: 1, topic: 2 };
const alnum = (c) => /[a-z0-9]/.test(c);

// 'detail' (the two routes and the plain answer, which hold words such as "conjugate" that the TeX statements do not) counts only for a
// whole word start of three letters or more, and ranks below every other field: it adds matches at the end, it never reorders the rest.
const WORD_ONLY = new Set(['detail']);

function fieldScore(v, tk, w, isId, field) {
  let idx = v.indexOf(tk);
  if (WORD_ONLY.has(field)) {
    while (idx > 0 && alnum(v.charAt(idx - 1))) idx = v.indexOf(tk, idx + 1);
    if (idx < 0 || tk.length < 3) return 0;
  }
  if (idx < 0) return 0;
  const wordStart = idx === 0 || !alnum(v.charAt(idx - 1));
  if (tk.length <= 2 && !wordStart) return 0;
  if (isId && v === tk) return w + 50;
  return wordStart ? w + 5 : w;
}

// -> { query, total, results: [{ kind, id, route, score }] }, best first. An id query (1.4, p3, t1.4) matches ids only.
export function searchItems(query, items, { limit = 8 } = {}) {
  const q = normalizeQuery(String(query ?? '').slice(0, 80));
  if (!q) return { query: q, total: 0, results: [] };
  const scored = [];
  if (ID_Q.test(q)) {
    const bare = q.replace(/\.$/, '');
    for (const it of items) {
      if (it.kind === 'station') continue;
      let s = 0;
      if (it.key === bare) s = 1000;
      else if (it.key.startsWith(q) && (q.endsWith('.') || /^[pt]\d*$/.test(q) || it.key.charAt(q.length) === '.')) s = 800;
      if (s) scored.push({ it, s });
    }
  } else {
    const toks = q.split(' ').filter((t) => /[a-z0-9]/.test(t));
    if (toks.length) {
      for (const it of items) {
        let total = 0;
        let ok = true;
        for (const tk of toks) {
          let best = 0;
          for (const [k, w] of Object.entries(FIELD_WEIGHT[it.kind])) if (it.f[k]) best = Math.max(best, fieldScore(it.f[k], tk, w, k === 'id', k));
          if (!best) { ok = false; break; }
          total += best;
        }
        if (ok) scored.push({ it, s: total });
      }
    }
  }
  scored.sort((a, b) => b.s - a.s || KIND_ORDER[a.it.kind] - KIND_ORDER[b.it.kind] || a.it.rank - b.it.rank);
  return { query: q, total: scored.length, results: scored.slice(0, limit).map((x) => ({ kind: x.it.kind, id: x.it.id, route: x.it.route, score: x.s })) };
}

// ---------------------------------------------------------------- pure helpers: the demo

// Round both parts to the nearest 1/perUnit (a 0.05 grid by default); never -0.
export const snapToGrid = (z, perUnit = 20) => {
  const f = (v) => {
    const r = Math.round(v * perUnit) / perUnit;
    return r === 0 ? 0 : r;
  };
  return { re: f(z.re), im: f(z.im) };
};

// '2.094 (2π/3)', '3.142 (π)', '0.464', '0'.
export function angleText(theta) {
  const d = fmtNum(theta);
  const a = fmtAngle(theta, { unicode: true });
  return a !== d ? `${d} (${a})` : d;
}

// The two-line plain-text readout of the demo dot.
export function homeReadout(z) {
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return 'z is not set';
  const r = abs(z);
  if (r < 1e-9) return 'z = 0; r = 0; Arg z: no angle at 0\narg z: no angle at 0';
  const th = Arg(z);
  return `z = ${fmtCart(z)}; r = ${fmtNum(r)}; Arg z = ${angleText(th)}\narg z = { ${fmtNum(th)} + 2πk : k an integer }`;
}

// ---------------------------------------------------------------- station CSS (tokens only; every rule prefixed)

const CSS = `
.home-epigraph p { margin: 0 0 var(--space-1); font-family: var(--font-display); font-size: 1.2rem; }
.home-epigraph .tone-cart { color: var(--cart); font-weight: 700; }
.home-epigraph .tone-polar { color: var(--polar); font-weight: 700; }
.home-spine-list { margin: var(--space-3) 0 0; padding: 0; list-style: none; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
.home-spine-list li { padding-left: var(--space-3); border-left: 4px solid var(--tone, var(--border-strong)); min-width: 0; }
.home-spine-list h3 { margin: 0 0 var(--space-1); }
.home-spine-list p { margin: 0 0 var(--space-2); }
.home-spine-num { margin-right: var(--space-1); font-family: var(--font-mono); color: var(--tone); }
.home-spine-list .chips .chip { min-height: 2rem; font-size: 0.88rem; }
.home-hero { align-items: start; }
.home-hero h2 { margin-bottom: var(--space-2); }
.home-caption { margin: 0 0 var(--space-3); color: var(--text-muted); font-size: 0.95rem; }
.home-caption .tone-cart { color: var(--cart); font-weight: 700; }
.home-caption .tone-polar { color: var(--polar); font-weight: 700; }
.home-presets { margin-top: var(--space-3); }
.home-presets .home-presets-label { font-weight: 700; }
.home-names .readout { margin-bottom: var(--space-3); }
.home-names p { margin: var(--space-2) 0 0; }
.home-demo-fallback { margin: 0; }
.home-finder-row { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: end; }
.home-finder-row .field { flex: 1 1 18rem; }
.home-finder-row input { width: 100%; }
.home-finder-hint { margin: var(--space-2) 0 var(--space-1); }
.home-finder-status { margin: var(--space-2) 0 0; color: var(--text-muted); font-size: 0.92rem; }
.home-finder-status:empty { margin: 0; }
.finder-results:empty { margin: 0; }
.finder-results { margin: var(--space-2) 0 0; padding: 0; list-style: none; display: grid; gap: var(--space-1); }
.finder-result a { display: grid; grid-template-columns: 4.5rem minmax(0, 1fr) auto; gap: var(--space-2); align-items: center; min-height: var(--tap);
  padding: var(--space-1) var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface);
  color: var(--text); text-decoration: none; }
.finder-result a:hover { background: var(--surface-2); }
.finder-result .fr-id { font-family: var(--font-mono); font-weight: 700; }
.finder-result .fr-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.finder-result .fr-where { font-family: var(--font-mono); color: var(--text-muted); }
.finder-empty { min-width: 0; padding: var(--space-2); color: var(--text-muted); overflow-wrap: anywhere; }
@media (max-width: 30rem) { .finder-result a { grid-template-columns: 3.5rem minmax(0, 1fr); } .finder-result .fr-where { grid-column: 2; } }
.home-map-host { width: 100%; min-width: 0; }
.home-map { display: block; width: 100%; height: auto; overflow: hidden; }
.home-map .thread-line { fill: none; stroke: var(--tone); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
.home-map .thread-line[stroke-dasharray] { stroke-linecap: butt; }
.home-map .node-pill { fill: var(--surface); stroke: var(--border-strong); stroke-width: 1.5; }
.home-map a.map-station:hover .node-pill { fill: var(--surface-2); }
.home-map a.map-station[aria-current="page"] .node-pill { stroke: var(--text); stroke-width: 3; }
.home-map a.map-station { cursor: pointer; outline: none; }
.home-map a.map-station .hit { fill: transparent; stroke: none; }
.home-map a.map-station:focus-visible .hit { stroke: var(--focus); stroke-width: 2.5; }
.home-map .stop { fill: var(--tone); stroke: var(--surface); stroke-width: 1.5; }
.home-map .stop[data-thread="T2"] { fill: var(--surface); stroke: var(--tone); stroke-width: 2.5; }
.home-map .pdot { fill: none; stroke: var(--text-muted); stroke-width: 1.4; }
.home-map .pdot.is-done { fill: var(--ok); stroke: var(--ok); }
.home-map .map-num { fill: var(--text-muted); font: 600 11px var(--font-mono); }
.home-map .map-label { fill: var(--text); font: 600 12.5px var(--font); }
.home-map[data-mode="narrow"] .map-label { font-size: 13.5px; }
.home-map .map-part { fill: var(--text-muted); font: 700 12px var(--font); }
.home-map .is-dim { opacity: 0.3; }
.home-map .thread-line.is-dim { opacity: 0.18; }
.home-map[data-focus="T1"] .stop:not([data-thread="T1"]), .home-map[data-focus="T2"] .stop:not([data-thread="T2"]),
.home-map[data-focus="T3"] .stop:not([data-thread="T3"]) { opacity: 0.25; }
.home-swatch { flex: none; }
.home-swatch .swatch-line { stroke: var(--tone); stroke-width: 3; stroke-linecap: round; }
.home-legend { margin: var(--space-3) 0 var(--space-1); }
.home-thread-note { margin: 0 0 var(--space-3); min-height: 1.4em; color: var(--text-muted); font-size: 0.95rem; }
.home-progress { margin: var(--space-3) 0 0; }
.home-plan { margin: 0; padding-left: 1.4rem; display: grid; gap: var(--space-3); }
.home-plan .chips { margin-top: var(--space-1); }
.home-plan .chips .chip { min-height: 2rem; font-size: 0.88rem; }
.home-header-actions { margin-top: var(--space-2); }
.home-topics .chip { max-width: 100%; }
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

function sv(tag, attrs, ...kids) {
  const n = document.createElementNS(SVGNS, tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      n.setAttribute(k, String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}

function proseEl(tag, attrs, text) {
  const n = h(tag, attrs);
  prose(n, text);
  return n;
}

// ---------------------------------------------------------------- mount

export function mount(el, ctx) {
  if (ctx && ctx.map === 'test2') return mountTest2Home(el, ctx);
  const mapStations = stationsForMap('test1');
  const t0 = performance.now();
  const store = ctx.store;
  const style = document.createElement('style');
  style.setAttribute('data-for', 'home');
  style.textContent = CSS;
  document.head.appendChild(style);

  const safeGet = (key, fallback) => {
    try { return store.get(key, fallback); } catch { return fallback; }
  };
  const title = (id) => {
    const st = stationById(id);
    return st ? st.title : id;
  };
  const stationChip = (id, text) => h('a', { class: 'chip', href: `#${id}`, 'data-station': id }, text || titleSpan(shortTitle(title(id))));

  let progress = sanitizeProgress(safeGet(PROGRESS_KEY, {}));
  let focusThread = null;
  if (ctx.preset && ctx.preset.kind === 'token' && /^t[123]$/i.test(String(ctx.preset.token))) focusThread = String(ctx.preset.token).toUpperCase();
  let geom = null;
  let lastW = 0;
  let relayoutRaf = 0;
  let observer = null;
  let winResize = null;
  const parts = { plane: null, handle: null, stairs: null, ex: null };
  const demo = { z: { re: -1, im: Math.sqrt(3) } };
  {
    const p131 = problemById('1.3.1');
    if (p131 && p131.answer && p131.answer.values && p131.answer.values.z) demo.z = { re: p131.answer.values.z.re, im: p131.answer.values.z.im };
  }
  const START = { re: demo.z.re, im: demo.z.im };

  // ---- header
  const self = ctx.station && ctx.station.id ? stationById(ctx.station.id) || stationById('home') : stationById('home');
  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'The three story threads' });
  for (const th of THREADS) {
    badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': th.id, title: th.summary }, threadLabel(th))));
  }
  const header = h('header', { class: 'station-header' },
    mapSwitch(ctx, 'home-which'),
    h('h1', null, self.title),
    h('p', { class: 'station-lede' },
      `Test 1 is not ${PROBLEMS.length} recipes. It is one picture, seen from different sides. Drag the dot, read the four lines, then find your problem on the map.`),
    badges,
    h('div', { class: 'row home-header-actions' },
      h('a', { class: 'btn btn-primary', id: 'home-start', href: '#addresses' }, `Start with ${title('addresses')}`),
      h('a', { class: 'btn', id: 'home-open-problems', href: '#problems' }, 'Open the problem index')));

  // ---- finder
  const items = buildSearchItems(PROBLEMS, mapStations, TOPICS);
  const finderInput = h('input', {
    type: 'search', id: 'home-finder', placeholder: '1.4.2, P3, circle, roots of unity', autocomplete: 'off', spellcheck: 'false', 'aria-controls': 'home-finder-results',
  });
  const finderResults = h('ul', { class: 'finder-results', id: 'home-finder-results' });
  const finderHint = h('p', { class: 'muted home-finder-hint', id: 'home-finder-hint' }, 'Try a number like 1.4.2 or P3, or a word from the question.');
  const finderStatus = h('p', { class: 'home-finder-status', id: 'home-finder-status', role: 'status' });
  const finderMore = h('a', { href: '#problems', id: 'home-finder-more', hidden: true });
  const tryChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Examples to try' });
  for (const [key, label] of [['1-4-2', '1.4.2'], ['p3', 'P3'], ['circle', 'circle'], ['branch', 'branch']]) {
    const chip = h('button', { type: 'button', class: 'chip', id: `home-finder-try-${key}` }, label);
    chip.addEventListener('click', () => {
      finderInput.value = label;
      renderFinder(label);
      finderInput.focus();
    });
    tryChips.append(chip);
  }
  const finderPanel = h('section', { class: 'panel', id: 'home-finder-panel', 'aria-labelledby': 'home-finder-title' },
    h('h2', { id: 'home-finder-title' }, 'Where is that problem?'),
    h('div', { class: 'home-finder-row' },
      h('div', { class: 'field' }, h('label', { for: 'home-finder' }, 'Type a problem number or a word'), finderInput)),
    finderHint, tryChips, finderStatus, finderResults, finderMore);

  function renderFinder(value) {
    const res = searchItems(value, items, { limit: 8 });
    finderResults.replaceChildren();
    finderMore.hidden = true;
    if (!res.query) {
      finderHint.hidden = false;
      finderStatus.textContent = '';
      return res;
    }
    finderHint.hidden = true;
    if (res.total === 0) {
      finderStatus.textContent = '';
      const typed = String(value).trim();
      const shown = typed.length > FINDER_ECHO_MAX ? typed.slice(0, FINDER_ECHO_MAX) + '…' : typed;      // the search reads 80, the sentence echoes 40
      finderResults.append(h('li', { class: 'finder-empty' }, `Nothing matches "${shown}". Try a problem number such as 2.5.1 or P4, or a word from the question.`));
      return res;
    }
    const byKey = new Map(items.map((it) => [`${it.kind}:${it.id}`, it]));
    for (const r of res.results) {
      const it = byKey.get(`${r.kind}:${r.id}`);
      const text = h('span', { class: 'fr-text' });
      let idText;
      let where;
      if (r.kind === 'problem') {
        const p = problemById(r.id);
        appendStatement(text, statementParts(p.statement));
        idText = r.id;
        where = it.station;
      } else if (r.kind === 'station') {
        text.append(document.createTextNode(title(r.id)));
        idText = 'place';
        where = r.id;
      } else {
        const t = TOPICS.find((x) => x.id === r.id);
        text.append(document.createTextNode(t ? t.title : r.id));
        idText = r.id;
        const st = stationForTopic(r.id);
        where = st ? st.id : '';
      }
      finderResults.append(h('li', { class: 'finder-result', 'data-kind': r.kind, 'data-id': r.id },
        h('a', { href: `#${r.route}` }, h('span', { class: 'fr-id' }, idText), text, h('span', { class: 'fr-where' }, where))));
    }
    finderStatus.textContent = res.total === 1 ? '1 match' : res.total > res.results.length ? `Showing ${res.results.length} of ${res.total} matches` : `${res.total} matches`;
    if (res.total > res.results.length) {
      finderMore.textContent = `${res.total - res.results.length} more are not shown. Browse them all in the problem index.`;
      finderMore.hidden = false;
    }
    return res;
  }

  finderInput.addEventListener('input', () => renderFinder(finderInput.value));
  finderInput.addEventListener('keydown', (e) => {
    const links = [...finderResults.querySelectorAll('a')];
    if (e.key === 'ArrowDown' && links.length) {
      e.preventDefault();
      links[0].focus();
    } else if (e.key === 'Enter' && links.length) {
      e.preventDefault();
      ctx.navigate(links[0].getAttribute('href').slice(1));
    } else if (e.key === 'Escape') {
      finderInput.value = '';
      renderFinder('');
    }
  });
  finderResults.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = [...finderResults.querySelectorAll('a')];
    const i = links.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    if (e.key === 'ArrowDown') links[Math.min(i + 1, links.length - 1)].focus();
    else (i <= 0 ? finderInput : links[i - 1]).focus();
  });

  // ---- hero: the demo dot (left) and its names (right)
  const planeHost = h('div', { class: 'home-plane-host', id: 'home-demo-plane' });
  const presetBox = h('div', { class: 'row home-presets', role: 'group', 'aria-label': 'Example points' }, h('span', { class: 'home-presets-label' }, 'Try:'));
  const presets = [
    { id: 'home-demo-preset-m1-sqrt3i', label: '−1 + i√3', z: { re: -1, im: Math.sqrt(3) } },
    { id: 'home-demo-preset-1-i', label: '1 + i', z: { re: 1, im: 1 } },
    { id: 'home-demo-preset-neg2', label: '−2 (on the seam)', z: { re: -2, im: 0 } },
  ];
  const presetBtns = presets.map((pr) => {
    const b = h('button', { type: 'button', class: 'chip', id: pr.id, 'aria-pressed': 'false' }, pr.label);
    b.addEventListener('click', () => {
      if (parts.handle) parts.handle.set({ re: pr.z.re, im: pr.z.im });
    });
    presetBox.append(b);
    return b;
  });
  const demoPanel = h('section', { class: 'panel', id: 'home-demo', 'aria-labelledby': 'home-demo-title' },
    h('h2', { id: 'home-demo-title' }, 'Drag the dot'),
    h('p', { class: 'home-caption', id: 'home-demo-caption' },
      'One point. Its ', h('span', { class: 'tone-cart' }, 'Cartesian address'), ' says where it sits: across by x, then up by y. Its ',
      h('span', { class: 'tone-polar' }, 'polar address'), ' says how to reach it: turn, then walk r. The solid arc is Arg z. The faint arcs are other names for the same turn; together they are the set arg z. The dashed seam line is where Arg z jumps.'),
    planeHost, presetBox);

  const readout = h('div', { class: 'readout', id: 'home-readout' });
  const stairsHost = h('div', { class: 'home-stairs-host', id: 'home-demo-stairs' });
  const stairsNote = h('p', { class: 'muted', id: 'home-stairs-note' }, 'Climbing a step changes the name of the angle, not the dot. Arg z is the one name in (−π, π].');
  const problemLine = h('p', { class: 'muted', id: 'home-demo-problem' });
  const namesPanel = h('section', { class: 'panel home-names', id: 'home-names', 'aria-labelledby': 'home-names-title' },
    h('h2', { id: 'home-names-title' }, 'Its two addresses, and all its names'), readout, stairsHost, stairsNote, problemLine);

  {
    const v = problemById('1.3.1').answer.values;
    problemLine.append(
      document.createTextNode('The starting dot is problem '),
      h('a', { class: 'chip problem-chip', id: 'home-demo-link-1-3-1', href: `#${routeFor('1.3.1')}` }, '1.3.1'),
      document.createTextNode(`: ${fmtCart(v.z)}. Its polar address is r = ${fmtNum(v.r)}, Arg z = ${fmtAngle(v.Arg, { unicode: true })}.`));
  }

  // ---- working: the same dot written both ways
  const exHost = h('div', { class: 'home-ex-host', id: 'home-demo-ex' });
  const workingPanel = h('section', { class: 'panel', id: 'home-working', 'aria-labelledby': 'home-working-title' },
    h('h2', { id: 'home-working-title' }, 'The same dot, written both ways'), exHost);

  // ---- spine
  const spineItems = [
    { thread: 'T1', head: 'Place and move', stations: ['addresses', 'arithmetic'],
      text: 'A point has a place (slide x across, then y up) and a move (turn by θ, then stretch by r). Adding composes places; multiplying composes moves. Pick the address where the question is easy.' },
    { thread: 'T2', head: 'The staircase', stations: ['staircase', 'roots'],
      text: 'A move has many names: θ, θ + 2π, θ − 2π, and so on. That whole set is arg z. Arg z is the one name in (−π, π]. The point z itself never changes.' },
    { thread: 'T3', head: 'Motion and time', stations: ['mappings', 'powermap', 'lab'],
      text: 'A function picks up every point and puts it down somewhere. A stroke is carried along on one clock. z^n, z^(1/n) and 1/z work directly on the polar address.' },
    { thread: 'T3', head: 'Zoom', stations: ['derivative', 'cauchy-riemann'],
      text: 'Up close, a differentiable map is a single spin-and-stretch. Cauchy–Riemann says there is no mirror part. conj z, Re z and |z|² fail because they flip or squash.' },
  ];
  const spineList = h('ol', { class: 'home-spine-list', id: 'home-spine-list' });
  spineItems.forEach((it, i) => {
    const chips = h('div', { class: 'chips' });
    for (const sid of it.stations) chips.append(stationChip(sid));
    spineList.append(h('li', { id: `home-spine-${i + 1}`, 'data-thread': it.thread },
      h('h3', null, h('span', { class: 'home-spine-num' }, String(i + 1)), it.head),
      proseEl('p', null, it.text), chips));
  });
  const epigraph = h('div', { class: 'home-epigraph', id: 'home-spine-line' },
    h('p', null, 'A complex number is a ', h('span', { class: 'tone-cart' }, 'place'), ' and a ', h('span', { class: 'tone-polar' }, 'move'), '.'),
    h('p', null, 'A function is a motion of the whole plane.'),
    h('p', null, 'The derivative is the move you see when you zoom into the motion.'));
  const spinePanel = h('section', { class: 'panel', id: 'home-spine', 'aria-labelledby': 'home-spine-title' },
    h('h2', { id: 'home-spine-title' }, 'The whole test in four lines'), epigraph, spineList);

  // ---- map
  const legend = h('div', { class: 'chips home-legend', id: 'home-legend', role: 'group', 'aria-label': 'Story threads' });
  const legendBtns = new Map();
  for (const th of THREADS) {
    const swatch = sv('svg', { class: 'home-swatch', viewBox: '0 0 36 10', width: 36, height: 10, 'aria-hidden': 'true', focusable: 'false' },
      sv('line', { class: 'swatch-line', x1: 1, y1: 5, x2: 35, y2: 5, 'stroke-dasharray': th.dash ? '6 4' : null }));
    const b = h('button', { type: 'button', class: 'chip', id: `home-thread-${th.id}`, 'data-thread': th.id, 'aria-pressed': 'false', title: th.summary },
      swatch, h('span', null, threadLabel(th)));
    b.addEventListener('click', () => setFocus(th.id));
    legend.append(b);
    legendBtns.set(th.id, b);
  }
  const threadHint = 'Tap a thread to light up its stops. Tap it again to see them all.';
  const threadNote = h('p', { class: 'home-thread-note', id: 'home-thread-note', role: 'status' }, threadHint);
  const svg = sv('svg', { class: 'home-map', id: 'home-map', role: 'group' });
  const mapHost = h('div', { class: 'home-map-host', id: 'home-map-host' }, svg);
  const fallbackHost = h('div', { id: 'home-map-fallback-host' });
  const progressText = h('span', { id: 'home-progress-text' });
  const progressLine = h('p', { class: 'home-progress', id: 'home-progress' }, progressText, document.createTextNode(' '),
    h('a', { href: '#problems', id: 'home-progress-link' }, 'Open the problem index'));
  const matrixPanel = mountMatrixBoard(mapStations, 'test1');
  const mapPanel = h('section', { class: 'panel', id: 'home-map-panel', 'aria-labelledby': 'home-map-title' },
    h('h2', { id: 'home-map-title' }, 'The map'),
    h('p', { class: 'muted' },
      'Each place is a stop. The three lines are the story threads: a dot on a line means that thread stops there. The small circles under a place are its review problems; they fill in when you tick them in the problem index.'),
    legend, threadNote, mapHost, fallbackHost, progressLine);

  const ownedIds = (id) => PROBLEMS.filter((p) => p.station === id).map((p) => p.id);
  function stationLabel(st) {
    const ids = ownedIds(st.id);
    const done = ids.filter((id) => progress[id] === true).length;
    const probs = ids.length ? `${ids.join(', ')}${done ? `, ${done} of ${ids.length} ticked` : ''}` : 'none';
    return `${typesetTitle(st.title)}. Place ${st.order}. Problems: ${probs}. Threads: ${st.threads.join(', ')}.`;
  }

  function showFallback(err) {
    console.error('[home] the map could not be drawn', err);
    svg.setAttribute('hidden', '');
    if (fallbackHost.childNodes.length) return;
    const list = h('ul', { class: 'place-list', id: 'home-map-fallback' });
    for (const st of [...mapStations].sort((a, b) => a.order - b.order)) {
      list.append(h('li', null, h('a', { class: 'place-link', href: `#${st.id}` },
        h('span', { class: 'place-num' }, st.order === 0 ? '·' : String(st.order)), h('span', { class: 'place-title' }, titleSpan(st.title)))));
    }
    fallbackHost.append(h('p', { class: 'callout' }, 'The picture of the map could not be drawn. Here are the places as a list.'), list);
  }

  function renderMap(g) {
    try {
      const active = document.activeElement;
      const focusedStation = active && svg.contains(active) ? active.getAttribute('data-station') : null;
      svg.replaceChildren();
      svg.removeAttribute('hidden');
      svg.setAttribute('viewBox', `0 0 ${g.width} ${g.height}`);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('data-mode', g.mode);
      svg.setAttribute('aria-label', `Map of the ${mapStations.length} places in story order, with three story threads.`);
      const gParts = sv('g', { class: 'map-parts' });
      for (const p of g.parts) gParts.append(sv('text', { class: 'map-part', x: p.x, y: p.y, 'text-anchor': p.anchor }, p.text));
      const gStrands = sv('g', { class: 'map-strands' });
      for (const t of g.threads) {
        gStrands.append(sv('path', { class: 'thread-line', 'data-thread': t.id, d: t.d, 'stroke-dasharray': t.dash ? '8 6' : null }));
      }
      const stopsOf = new Map();
      for (const t of g.threads) for (const stp of t.stops) {
        if (!stopsOf.has(stp.station)) stopsOf.set(stp.station, []);
        stopsOf.get(stp.station).push({ thread: t.id, x: stp.x, y: stp.y });
      }
      const gStations = sv('g', { class: 'map-stations' });
      for (const n of g.nodes) {
        const st = stationById(n.id);
        const label = stationLabel(st);
        const a = sv('a', {
          class: 'map-station', 'data-station': n.id, 'data-threads': st.threads.join(' '), href: `#${n.id}`, role: 'link', tabindex: '0',
          'aria-label': label, 'aria-current': n.id === 'home' ? 'page' : null,
        });
        a.append(
          sv('title', null, label),
          sv('rect', { class: 'hit', x: n.hit.x, y: n.hit.y, width: n.hit.w, height: n.hit.h, rx: 8 }),
          sv('rect', { class: 'node-pill', x: n.pill.x, y: n.pill.y, width: n.pill.w, height: n.pill.h, rx: 12 }));
        for (const stp of stopsOf.get(n.id) || []) a.append(sv('circle', { class: 'stop', 'data-thread': stp.thread, cx: stp.x, cy: stp.y, r: 4.5 }));
        a.append(sv('text', { class: 'map-num', x: n.num.x, y: n.num.y, 'text-anchor': n.num.anchor }, n.num.text));
        const text = sv('text', { class: 'map-label', x: n.label.x, y: n.label.y, 'text-anchor': n.label.anchor });
        n.label.lines.forEach((line, i) => text.append(sv('tspan', i === 0 ? { x: n.label.x, y: n.label.y } : { x: n.label.x, dy: 14.5 }, line)));
        if (g.mode === 'narrow') {
          const est = n.label.lines[0].length * 7.2;
          const room = g.width - 78 - 8;
          if (est > room) {
            text.setAttribute('textLength', String(room));
            text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
          }
        }
        a.append(text);
        for (const d of n.dots) a.append(sv('circle', { class: 'pdot', 'data-problem': d.problem, cx: d.x, cy: d.y, r: 3.2, 'aria-hidden': 'true' }));
        gStations.append(a);
      }
      svg.append(gParts, gStrands, gStations);
      if (focusedStation) {
        const back = svg.querySelector(`a.map-station[data-station="${focusedStation}"]`);
        if (back) back.focus({ preventScroll: true });
      }
      applyFocus();
      paintProgress();
    } catch (err) {
      showFallback(err);
    }
  }

  function paintProgress() {
    progress = sanitizeProgress(safeGet(PROGRESS_KEY, {}));
    for (const c of svg.querySelectorAll('circle.pdot')) c.classList.toggle('is-done', progress[c.getAttribute('data-problem')] === true);
    for (const a of svg.querySelectorAll('a.map-station')) {
      const st = stationById(a.getAttribute('data-station'));
      if (!st) continue;
      const label = stationLabel(st);
      a.setAttribute('aria-label', label);
      const t = a.querySelector('title');
      if (t) t.textContent = label;
    }
    progressText.textContent = `Ticked ${countTicked(progress)} of ${PROBLEMS.length} problems.`;
  }

  function applyFocus() {
    if (focusThread) svg.setAttribute('data-focus', focusThread);
    else svg.removeAttribute('data-focus');
    for (const a of svg.querySelectorAll('a.map-station')) {
      const dim = !!focusThread && !a.getAttribute('data-threads').split(' ').includes(focusThread);
      a.classList.toggle('is-dim', dim);
    }
    for (const p of svg.querySelectorAll('path.thread-line')) p.classList.toggle('is-dim', !!focusThread && p.getAttribute('data-thread') !== focusThread);
    for (const [id, b] of legendBtns) b.setAttribute('aria-pressed', String(id === focusThread));
    const th = focusThread ? THREADS.find((x) => x.id === focusThread) : null;
    if (th) prose(threadNote, th.summary);
    else threadNote.textContent = threadHint;
  }

  function setFocus(t) {
    focusThread = t === focusThread ? null : t;
    applyFocus();
  }

  function relayout() {
    relayoutRaf = 0;
    let w = Math.round(mapHost.clientWidth);
    if (w < 1) w = 360;
    if (w === lastW) return;
    lastW = w;
    geom = layoutMap(mapStations, w);
    renderMap(geom);
  }

  function scheduleRelayout() {
    if (relayoutRaf) return;
    relayoutRaf = requestAnimationFrame(relayout);
  }

  // ---- plan
  const plan = h('ol', { class: 'home-plan', id: 'home-plan-list' });
  const planStep = (n, text, chips) => {
    const box = h('div', { class: 'chips' });
    for (const c of chips || []) box.append(c);
    plan.append(h('li', { id: `home-plan-${n}` }, h('span', null, text), chips && chips.length ? box : null));
  };
  const sh = (id) => shortTitle(title(id));
  planStep(1, 'Read the four lines above and say them out loud. (5 min)');
  planStep(2, `Walk Part I, from ${sh('addresses')} to ${sh('roots')}. At each place do the one thing it asks, then say which address made the problem easy. (30 min)`,
    ['addresses', 'arithmetic', 'distance', 'staircase', 'powers', 'roots'].map((id) => stationChip(id)));
  planStep(3, `Walk Parts II to IV, from ${sh('curves')} to ${sh('cauchy-riemann')}. At ${sh('limits')} and ${sh('derivative')}, make the direction circle shrink to a point by hand: that is all of Chapter 3. (45 min)`,
    ['curves', 'sets', 'mappings', 'linear', 'powermap', 'principal-root', 'branches', 'reciprocal', 'limits', 'derivative', 'cauchy-riemann'].map((id) => stationChip(id)));
  planStep(4, 'Predict in the Lab. Load a preset such as x = 2 under z², draw your guess on the w-plane, then reveal. (20 min)',
    [stationChip('lab'), ...[['2-1-2', '2.1.2'], ['2-2-1', '2.2.1'], ['2-5-1', '2.5.1'], ['P4', 'P4']].map(([tok, text]) => h('a', { class: 'chip problem-chip', href: `#lab-${tok}` }, text))]);
  planStep(5, 'Do the problem index pass. For each card say the place, the address and the aha, then reveal the answer and tick it. Anything that is not instant, go back and touch it. (20 min)',
    [stationChip('problems')]);
  planStep(6, `Morning of the test: read the four lines again, then open ${sh('staircase')} and drag the point around the origin until the jump in Arg z feels obvious. (10 min)`,
    [stationChip('staircase')]);
  const planPanel = h('section', { class: 'panel', id: 'home-plan', 'aria-labelledby': 'home-plan-title' },
    h('h2', { id: 'home-plan-title' }, 'A night-before plan (about two hours)'), plan);

  // ---- station links
  const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  {
    const nb = stationNeighbours(mapStations, self.id);
    const shown = new Set();
    const add = (targetId, attrs, prefix) => {
      const st = targetId ? stationById(targetId) : null;
      if (!st || shown.has(targetId)) return;
      shown.add(targetId);
      links.append(h('a', { class: 'station-link', href: `#${targetId}`, ...attrs }, titleSpan((prefix || '') + st.title)));
    };
    add(nb.prev, { 'data-dir': 'prev', id: `${self.id}-link-prev` });
    add(nb.next, { 'data-dir': 'next', id: `${self.id}-link-next` });
    for (const t of self.threads || []) {
      const n = nb.thread[t];
      if (!n) continue;
      add(n.prev, { 'data-thread': t, 'data-dir': 'prev', id: `${self.id}-link-thread-${t}` }, threadLinkPrefix(t, 'prev'));
      add(n.next, { 'data-thread': t, 'data-dir': 'next', id: `${self.id}-link-thread-${t}` }, threadLinkPrefix(t, 'next'));
    }
    add('problems', { id: `${self.id}-link-problems` });
  }

  const topicChips = h('div', { class: 'chips home-topics', id: 'home-topics', role: 'group', 'aria-label': 'Topics on Test 1' });
  for (const t of TOPICS) {
    topicChips.append(h('a', {
      class: 'chip', href: `#${topicRoute(t.id)}`, id: `home-topic-${t.id.replace(/\./g, '-')}`, title: t.summary,
    }, `${t.id} ${t.title}`));
  }
  const topicPanel = h('section', { class: 'panel', id: 'home-topics-panel', 'aria-labelledby': 'home-topics-title' },
    h('h2', { id: 'home-topics-title' }, 'Pick a topic'),
    h('p', { class: 'muted' }, 'These are the Test 1 topics. Choose one to open the place that teaches it.'),
    topicChips);

  el.append(header, topicPanel, finderPanel, h('div', { class: 'two-planes home-hero', id: 'home-hero' }, demoPanel, namesPanel),
    workingPanel, spinePanel, mapPanel, matrixPanel, planPanel, links);

  // ---- the demo: plane, handle, staircase, explainer
  function setDemoZ(z) {
    demo.z = { re: z.re, im: z.im };
    readout.textContent = homeReadout(demo.z);
    if (parts.stairs) parts.stairs.update(abs(demo.z) < 1e-9 ? null : Arg(demo.z));
    if (parts.ex) parts.ex.update({ z: demo.z });
    presets.forEach((pr, i) => presetBtns[i].setAttribute('aria-pressed', String(eq(demo.z, pr.z, 1e-9))));
    if (parts.plane) parts.plane.requestDraw();
  }

  try {
    const plane = createPlane(planeHost, {
      id: 'home-demo-plane', xRange: [-3.5, 3.5], yRange: [-3.5, 3.5], grid: 'both', axisLabels: ['Re', 'Im'], maxWidth: 460,
      ariaLabel: 'Demo plane for the point z. Drag the dot or use the arrow keys',
    });
    parts.plane = plane;
    parts.handle = plane.addPoint({
      id: 'z', z: START, label: 'z', color: '--text', radius: 8, step: 0.1,
      snap: (z) => snapToGrid(z, 20), onDrag: (z) => setDemoZ(z),
    });
    plane.addLayer((c2d, p) => {
      const z = parts.handle.z;
      drawSeam(c2d, p, Math.PI);
      drawCartAddress(c2d, p, z);
      drawPolarAddress(c2d, p, z, { ghosts: 1, ghostsNeg: 1, name: 'z' });
    });
  } catch (err) {
    console.error('[home] the demo plane could not start', err);
    parts.plane = null;
    parts.handle = null;
    planeHost.replaceChildren(h('p', { class: 'callout home-demo-fallback' }, 'The demo could not start in this browser. The rest of the page still works.'));
    presetBox.hidden = true;
  }
  try {
    parts.stairs = createStaircase(stairsHost, { id: 'home-demo-stairs', kMin: -1, kMax: 1, label: 'arg z' });
  } catch (err) {
    console.error('[home] the staircase could not start', err);
    parts.stairs = null;
  }
  try {
    const n = (v) => fmtNum(v, 3);
    parts.ex = createExplainer(exHost, {
      id: 'home-demo-ex',
      rows: [
        {
          id: 'address', label: 'The address', native: null,
          cart: ({ z }) => tintCart('(x,\\ y) = (' + n(z.re) + ',\\ ' + n(z.im) + ')'),
          polar: ({ z }) => {
            const r = abs(z);
            if (r < 1e-9) return { text: 'Arg z: no angle at 0' };
            const th = Arg(z);
            const exact = exactAngle(th) && fmtAngle(th) !== n(th) ? '\\ \\left(' + texAngle(th) + '\\right)' : '';
            return tintPolar('(r,\\ \\Arg z) = (' + n(r) + ',\\ ' + n(th) + ')' + exact);
          },
        },
        {
          id: 'convert', label: 'Get it from the other', native: null,
          cart: ({ z }) => (abs(z) < 1e-9
            ? tintCart('x = 0,\\ y = 0')
            : tintCart('\\begin{array}{l} x = r\\cos(\\Arg z) = ' + n(z.re) + ' \\\\ y = r\\sin(\\Arg z) = ' + n(z.im) + ' \\end{array}')),
          polar: ({ z }) => {
            const r = abs(z);
            if (r < 1e-9) return { text: 'r = 0; Arg z: no angle at 0' };
            return tintPolar('\\begin{array}{l} r = \\sqrt{x^2 + y^2} = ' + n(r) + ' \\\\ \\Arg z = \\operatorname{atan2}(y,\\ x) = ' + n(Arg(z)) + ' \\end{array}');
          },
        },
      ],
      same: ({ z }) => {
        const r = abs(z);
        const zero = r < 1e-9;
        const th = zero ? 0 : Arg(z);
        return {
          cart: tintCart('z = ' + fmtCart(z)),
          polar: zero ? tintPolar('z = 0') : tintPolar('z = ' + n(r) + '\\,e^{i\\,' + n(th) + '}'),
          agree: eq(z, zero ? C(0, 0) : fromPolar(r, th), 1e-9),
        };
      },
    });
  } catch (err) {
    console.error('[home] the explainer could not start', err);
    parts.ex = null;
  }
  setDemoZ(START);

  // ---- finder hint, map, preset
  renderFinder('');
  relayout();
  const mountMs = performance.now() - t0;

  const mv = (window.__mv = window.__mv || {});
  const hook = {
    layout: () => (geom ? geom.mode : 'narrow'),
    demo: () => ({ re: demo.z.re, im: demo.z.im }),
    search: (q) => searchItems(q, items, { limit: 8 }).results.map((r) => r.id),
    mountMs,
  };
  mv.home = hook;

  // the observer (or its fallback) is created last
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(scheduleRelayout);
    observer.observe(mapHost);
  } else {
    winResize = scheduleRelayout;
    window.addEventListener('resize', winResize);
  }

  return function unmount() {
    if (observer) observer.disconnect();
    observer = null;
    if (winResize) window.removeEventListener('resize', winResize);
    winResize = null;
    if (relayoutRaf) cancelAnimationFrame(relayoutRaf);
    relayoutRaf = 0;
    if (parts.plane) parts.plane.destroy();
    if (parts.ex) parts.ex.destroy();
    if (parts.stairs) parts.stairs.destroy();
    style.remove();
    if (window.__mv && window.__mv.home === hook) delete window.__mv.home;
  };
}
