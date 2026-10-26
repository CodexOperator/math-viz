// js/stations/home-test2.js — the Test 2 front page.
// Same kind of page as Test 1: topics, a finder, one live example, a four-line spine,
// the SVG map, and a night-before plan. The example is one Julia walk, not a second picture.
//
// layoutMap is imported from home.js. That import is a cycle (home.js loads this file).
// Nothing here calls layoutMap until mount, after both modules have finished loading.

import {
  stationsForMap, threadsOn, stationPart, FRACTAL_THREADS, threadLabel, stationById, stationForTopic,
} from '../registry.js';
import { TEST2_TOPICS, TEST2_PART_LABELS } from '../data/test2.js';
import { TEST2_PROBLEMS, test2ProblemById } from '../data/test2-problems.js';
import { BOOK, sectionHref } from '../data/book.js';
import { statementParts } from '../data/problems.js';
import { shortTitle, typesetTitle, stationNeighbours } from './problems.js';
import { layoutMap, searchItems, FINDER_ECHO_MAX } from './home.js';
import { juliaWalk } from '../core/fractal.js';
import { fmtCart } from '../core/complex.js';
import { mapSwitch } from './map-switch.js';
import { h, sourceTag, walkList, placeLinks, chipButton, appendRich } from './test2-ui.js';
import { mountMatrixBoard } from './matrix-board.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const TICK_KEY = 'progress.test2';
const START = { re: 0.45, im: 0.2 };

const CSS = `
.home-thesis { color: var(--text); font-family: var(--font-display); font-size: 1.35rem; line-height: 1.35; max-width: 38rem; }
.home-epigraph p { margin: 0 0 var(--space-1); font-family: var(--font-display); font-size: 1.2rem; }
.home-epigraph .tone-cart, .home-epigraph .tone-polar, .home-epigraph .tone-input, .home-epigraph .tone-output { font-weight: 700; }
.home-orbit-fate[data-fate="settles"],
.home-orbit-fate[data-fate="stays"] { color: var(--cart); font-weight: 700; }
.home-orbit-fate[data-fate="leaves"] { color: var(--polar); font-weight: 700; }
.home-paper-grips { margin: var(--space-2) 0; padding-left: 1.2rem; }
.home-paper-grips li { margin: 0.2rem 0; }
.home-notch { display: inline-block; vertical-align: -0.35em; color: var(--text); }
.home-spine-list { margin: var(--space-3) 0 0; padding: 0; list-style: none; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
.home-spine-list li { padding-left: var(--space-3); border-left: 4px solid var(--tone, var(--border-strong)); min-width: 0; }
.home-spine-list h3 { margin: 0 0 var(--space-1); }
.home-spine-list p { margin: 0 0 var(--space-2); }
.home-spine-num { margin-right: var(--space-1); font-family: var(--font-mono); color: var(--tone); }
.home-spine-list .chips .chip { min-height: 2rem; font-size: 0.88rem; }
.home-caption { margin: 0 0 var(--space-3); color: var(--text-muted); font-size: 0.95rem; }
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
.home-map .stop[data-thread="F2"] { fill: var(--surface); stroke: var(--tone); stroke-width: 2.5; }
.home-map .pdot { fill: none; stroke: var(--text-muted); stroke-width: 1.4; }
.home-map .pdot.is-done { fill: var(--ok); stroke: var(--ok); }
.home-map .map-num { fill: var(--text-muted); font: 600 11px var(--font-mono); }
.home-map .map-label { fill: var(--text); font: 600 12.5px var(--font); }
.home-map[data-mode="narrow"] .map-label { font-size: 13.5px; }
.home-map .map-part { fill: var(--text-muted); font: 700 12px var(--font); }
.home-map .is-dim { opacity: 0.3; }
.home-map .thread-line.is-dim { opacity: 0.18; }
.home-map[data-focus="F1"] .stop:not([data-thread="F1"]),
.home-map[data-focus="F2"] .stop:not([data-thread="F2"]),
.home-map[data-focus="F3"] .stop:not([data-thread="F3"]) { opacity: 0.25; }
.home-swatch { flex: none; }
.home-swatch .swatch-line { stroke: var(--tone); stroke-width: 3; stroke-linecap: round; }
.home-legend { margin: var(--space-3) 0 var(--space-1); }
.home-thread-note { margin: 0 0 var(--space-3); min-height: 1.4em; color: var(--text-muted); font-size: 0.95rem; }
.home-progress { margin: var(--space-3) 0 0; }
.home-plan { margin: 0; padding-left: 1.4rem; display: grid; gap: var(--space-3); }
.home-plan .chips { margin-top: var(--space-1); }
.home-plan .chips .chip { min-height: 2rem; font-size: 0.88rem; }
.home-header-actions { margin-top: var(--space-2); }
.home-topic-list { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--space-3); }
.home-topic-list li { min-width: 0; }
.home-topic-list .source-tag { margin: 0.15rem 0 0; }
.home-scope-mark { margin-left: var(--space-2); font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--warn, var(--text-muted)); }
.home-scope-mark[data-scope="possible"] { color: var(--text-muted); }
.home-orbit-fate { margin: var(--space-2) 0 0; }
`;

const ORBIT_CHIPS = [
  {
    id: 'home-c-0', label: 'c = 0', c: { re: 0, im: 0 },
    note: 'Inside the unit disk the walk goes to 0. Blue, because the landing stayed. That disk is Example 4.2.8 [PDF Example 4.9].',
  },
  {
    id: 'home-c-m75', label: 'c = −0.75', c: { re: -0.75, im: 0 },
    note: 'The same start is still inside, and it does not sit down at 0. Blue, because it stayed. The disk has pinched.',
  },
  {
    id: 'home-c-i', label: 'c = i', c: { re: 0, im: 1 },
    note: 'Orange, because the walk left. On a landing, orange means left.',
  },
];

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

function plainStatement(statement) {
  return statementParts(statement).map((x) => x.text).join(' ').replace(/[\\{}^_$]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

// Search records in the shape home.js searchItems already scores.
export function buildTest2SearchItems(problems = TEST2_PROBLEMS, stations = stationsForMap('test2'), topics = TEST2_TOPICS) {
  const items = [];
  problems.forEach((p, i) => {
    const st = stationById(p.station);
    items.push({
      kind: 'problem', id: p.id, key: p.id.toLowerCase(),
      route: `problem-${p.id.replace(/\./g, '-')}`, rank: i, station: p.station,
      f: {
        section: `${p.id} ${p.pin} ${p.section}`.toLowerCase(),
        text: plainStatement(p.statement),
        aha: '',
        why: '',
        where: `${p.station} ${st ? st.title : ''}`.toLowerCase(),
        topic: '',
        detail: `${p.scope} ${p.group} ${p.kind}`.toLowerCase(),
      },
    });
  });
  stations.forEach((s, i) => items.push({
    kind: 'station', id: s.id, key: s.id, route: s.id, rank: i, station: s.id,
    f: { id: s.id, title: s.title.toLowerCase(), summary: (s.summary || '').toLowerCase() },
  }));
  topics.forEach((t, i) => items.push({
    kind: 'topic', id: t.id, key: t.id.toLowerCase(), route: `topic-${t.id}`, rank: i,
    f: {
      title: `${t.id} ${t.title} ${t.source.pin}`.toLowerCase(),
      summary: t.summary.toLowerCase(),
      covers: `${t.scope} ${t.source.section}`.toLowerCase(),
    },
  }));
  return items;
}

function loadTicks(store) {
  let raw = {};
  try { raw = store.get(TICK_KEY, {}) || {}; } catch { raw = {}; }
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of Object.keys(raw)) if (raw[id] === true && test2ProblemById(id)) out[id] = true;
  }
  return out;
}

export function mountTest2Home(el, ctx) {
  const style = document.createElement('style');
  style.setAttribute('data-for', 'home-test2');
  style.textContent = CSS;
  document.head.appendChild(style);

  const mapStations = stationsForMap('test2').map((s) => ({
    ...s,
    threads: threadsOn(s, 'test2'),
    part: stationPart(s, 'test2'),
  }));
  const byId = new Map(mapStations.map((s) => [s.id, s]));
  const store = ctx.store;
  let ticks = loadTicks(store);
  let focusThread = null;
  if (ctx.preset && ctx.preset.kind === 'token' && /^f[123]$/i.test(String(ctx.preset.token))) {
    focusThread = String(ctx.preset.token).toUpperCase();
  }
  let geom = null;
  let lastW = 0;
  let relayoutRaf = 0;
  let observer = null;
  let winResize = null;

  const titleOf = (id) => {
    const st = byId.get(id) || stationById(id);
    return st ? st.title : id;
  };
  const stationChip = (id) => h('a', { class: 'chip', href: `#${id}`, 'data-station': id }, shortTitle(titleOf(id)));

  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'The three story threads' });
  for (const th of FRACTAL_THREADS) {
    badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': th.id, title: th.summary }, threadLabel(th))));
  }

  const header = h('header', { class: 'station-header' },
    mapSwitch(ctx, 'home-which'),
    h('h1', null, 'The Map'),
    h('p', { class: 'station-lede home-thesis', id: 'home-thesis' },
      'A colour is the fate of repeating one motion. Test 1 taught that motion: multiplying spins and stretches, a power does it again, the roots of unity sit on a circle, and the derivative is that move seen up close. Test 2 starts at a point and does the motion again. The colour is where the walk ends.'),
    sourceTag({
      pin: 'Chapter 4, Sequences, series, and fractals',
      href: sectionHref('ch_seq-series-fractals.html'),
    }),
    badges,
    h('div', { class: 'row home-header-actions' },
      h('a', { class: 'btn btn-primary', id: 'home-open-paper', href: '#paper' }, 'Open the flat paper'),
      h('a', { class: 'btn', id: 'home-start', href: '#sequence' }, 'Start with a sequence'),
      h('a', { class: 'btn', id: 'home-open-index', href: '#index' }, 'Open the problem index'),
      h('a', { class: 'btn', id: 'home-open-playground', href: 'playground.html' }, 'Playground')));

  function fillTopics(list, topics) {
    for (const t of topics) {
      const row = h('li', { id: `home-topic-${t.id}` });
      row.append(h('a', { class: 'chip', href: `#topic-${t.id}` }, `${t.id} ${t.title}`));
      if (t.scope === 'likely') row.append(h('span', { class: 'home-scope-mark', 'data-scope': 'likely' }, 'Likely'));
      if (t.scope === 'possible') row.append(h('span', { class: 'home-scope-mark', 'data-scope': 'possible' }, 'Possible'));
      row.append(sourceTag(t.source));
      list.append(row);
    }
  }
  const topicList = h('ol', { class: 'home-topic-list', id: 'home-topics' });
  fillTopics(topicList, TEST2_TOPICS.filter((t) => t.scope === 'core'));
  const topicPanel = h('section', { class: 'panel', id: 'home-topics-panel', 'aria-labelledby': 'home-topics-title' },
    h('h2', { id: 'home-topics-title' }, 'Pick a topic'),
    h('p', { class: 'muted' },
      'Each name is a section in Howell & Mathews. These are the stops the night-before plan walks. The set of c is the Mandelbrot stop.'),
    topicList);
  const laterList = h('ol', { class: 'home-topic-list', id: 'home-later-topics' });
  fillTopics(laterList, TEST2_TOPICS.filter((t) => t.scope !== 'core'));
  const laterPanel = h('section', { class: 'panel', id: 'home-later', 'aria-labelledby': 'home-later-title' },
    h('h2', { id: 'home-later-title' }, 'Only if the syllabus names them'),
    h('p', { class: 'muted', id: 'home-scope' },
      'Sections 4.3 and 4.4 are the rest of Chapter 4. A series settles inside its disk and leaves outside it. The unit circle is that wall. Stays is the list that remains on the circle and does not sit down. They sit on the map before the index. Section 3.3 is harmonic functions, from the chapter Test 1 already left. It is marked possible, and Next does not stop there. Skip all three unless the syllabus names them.'),
    laterList);

  const items = buildTest2SearchItems(TEST2_PROBLEMS, mapStations, TEST2_TOPICS);
  const finderInput = h('input', {
    type: 'search', id: 'home-finder', placeholder: '4.2.4, orbit, Mandelbrot', autocomplete: 'off', spellcheck: 'false', 'aria-controls': 'home-finder-results',
  });
  const finderResults = h('ul', { class: 'finder-results', id: 'home-finder-results' });
  const finderHint = h('p', { class: 'muted home-finder-hint', id: 'home-finder-hint' }, 'Try 4.2.4, or a word from the question.');
  const finderStatus = h('p', { class: 'home-finder-status', id: 'home-finder-status', role: 'status' });
  const finderMore = h('a', { href: '#index', id: 'home-finder-more', hidden: true });
  const tryChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Examples to try' });
  for (const label of ['4.2.4', '4.1.1', 'orbit', 'Mandelbrot']) {
    const chip = h('button', { type: 'button', class: 'chip', id: `home-finder-try-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}` }, label);
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
      return;
    }
    finderHint.hidden = true;
    if (res.total === 0) {
      finderStatus.textContent = '';
      const typed = String(value).trim();
      const shown = typed.length > FINDER_ECHO_MAX ? `${typed.slice(0, FINDER_ECHO_MAX)}…` : typed;
      finderResults.append(h('li', { class: 'finder-empty' }, `Nothing matches "${shown}". Try 4.2.4, or a word such as orbit.`));
      return;
    }
    for (const r of res.results) {
      const text = h('span', { class: 'fr-text' });
      let idText = r.id;
      let where = '';
      if (r.kind === 'problem') {
        const p = test2ProblemById(r.id);
        if (p) appendRich(text, p.statement);
        where = shortTitle(titleOf(p ? p.station : ''));
      } else if (r.kind === 'station') {
        text.append(document.createTextNode(titleOf(r.id)));
        idText = 'place';
        where = r.id;
      } else {
        const t = TEST2_TOPICS.find((x) => x.id === r.id);
        text.append(document.createTextNode(t ? t.title : r.id));
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
  }

  finderInput.addEventListener('input', () => renderFinder(finderInput.value));
  finderInput.addEventListener('keydown', (e) => {
    const links = [...finderResults.querySelectorAll('a')];
    if (e.key === 'ArrowDown' && links.length) {
      e.preventDefault();
      links[0].focus();
    } else if (e.key === 'Enter' && links.length && ctx.navigate) {
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

  const orbitHost = h('div', { id: 'home-orbit' });
  const orbitFate = h('p', { class: 'home-orbit-fate', id: 'home-orbit-fate' });
  const orbitChips = h('div', { class: 'chips', id: 'home-orbit-chips', role: 'group', 'aria-label': 'The slide c' });
  let orbit = ORBIT_CHIPS[0];
  const orbitButtons = [];
  function drawOrbit() {
    const w = juliaWalk(START, orbit.c, 8, 4);
    const lines = w.points.slice(0, 6).map((p, i) => `${i}: ${fmtCart(p)}`);
    orbitHost.replaceChildren(walkList(lines));
    const word = w.escaped ? 'Leaves' : (orbit.id === 'home-c-0' ? 'Settles' : 'Stays');
    orbitFate.dataset.fate = word.toLowerCase();
    orbitFate.textContent = `${word}. ${orbit.note}`;
    orbitButtons.forEach((btn, i) => btn.setAttribute('aria-pressed', String(ORBIT_CHIPS[i] === orbit)));
  }
  ORBIT_CHIPS.forEach((sample) => {
    const b = chipButton(sample.id, sample.label, sample === orbit, () => {
      orbit = sample;
      drawOrbit();
    });
    orbitButtons.push(b);
    orbitChips.append(b);
  });
  const notch = sv('svg', {
    class: 'home-notch', id: 'home-notch', viewBox: '0 0 28 28', width: 28, height: 28, 'aria-hidden': 'true', focusable: 'false',
  }, sv('rect', { x: 4, y: 4, width: 20, height: 20, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }));
  const paperPanel = h('section', { class: 'panel home-paper', id: 'home-paper', 'aria-labelledby': 'home-paper-title' },
    h('h2', { id: 'home-paper-title' }, 'The flat paper'),
    h('p', { id: 'home-paper-words' },
      'One plant, three formulas. The words are settles, stays, leaves, or which root. Settles and stays are blue. Leaves is orange. Which root is the colour of the pin: blue, orange, or purple. Green is the plant. There is no fifth colour.'),
    h('p', { id: 'home-paper-notch' }, notch, ' c is this hollow square, in the ink of the page. It is not a colour. On the Julia picture the handle for c is still orange. That handle belongs to that picture. This square is the paper’s.'),
    h('ul', { class: 'home-paper-grips', id: 'home-paper-grips' },
      h('li', { id: 'home-paper-twist' }, 'Twist: z² + c. Square, then slide.'),
      h('li', { id: 'home-paper-correction' }, 'Correction: z − p(z)/p′(z). Five steps from 1/4 + i/4, then which root.'),
      h('li', { id: 'home-paper-stack' }, 'Stack: the bags and the pile. The geometric series is marked likely.')),
    sourceTag({ pin: '§4.1, Definition 4.1.1 [PDF Definition 4.1]', href: sectionHref('sec_sequences-series.html', 'Seq_Lim_Def') }),
    sourceTag({ pin: '§4.2, f_c(z) = z² + c', href: sectionHref('sec_julia-mandelbrot.html', 'K-0') }),
    sourceTag({ pin: '§4.2, Example 4.2.1 [PDF Example 4.7]', href: sectionHref('sec_julia-mandelbrot.html', 'Newton_s_Method_Ex') }),
    sourceTag({ pin: '§4.3, Theorem 4.3.1 [PDF Theorem 4.12]', href: sectionHref('sec_convergence-theorems.html', 'Geometric_Series') }));
  const hero = h('section', { class: 'panel', id: 'home-hero', 'aria-labelledby': 'home-hero-title' },
    h('h2', { id: 'home-hero-title' }, 'One twist, three slides'),
    h('p', { class: 'home-caption', id: 'home-hero-caption' },
      'The same start as the green plant, 0.45 + 0.2i. The formula is the twist, z² + c. Settles and stays are blue. Leaves is orange. The correction and the stack are on the flat paper.'),
    orbitChips, orbitFate, orbitHost,
    h('p', null, h('a', { class: 'btn', id: 'home-open-julia', href: '#julia' }, 'Open the Julia picture')));

  const spineItems = [
    {
      thread: 'F1', head: 'A sequence has a fate', stations: ['powers', 'roots', 'sequence', 'series'],
      text: 'Do one motion again and the list is a sequence. ((1+i)/√2)^n is the eighth roots of unity from Roots. It stays on the circle, so it does not settle. (1/2 + i/4)^n is the same kind of power, and the length goes to 0. Section 4.1 is that sentence, before any picture.',
    },
    {
      thread: 'F2', head: 'Square, then slide', stations: ['powers', 'arithmetic', 'disk', 'julia', 'zero'],
      text: 'Squaring is Powers: spin and stretch, twice. Adding c is the slide from Arithmetic. At c = 0 the walks that stay fill a disk, and the edge is the circle the roots of unity sit on. Move c and the disk stops being a disk. The orbit of 0 says whether the edge is one piece.',
    },
    {
      thread: 'F3', head: 'Which root the walk finds', stations: ['roots', 'derivative', 'newton-step', 'newton', 'half'],
      text: 'The Newton picture opens on the cube roots of 1. One step is a guess minus p(z) over p′(z). The derivative is the zoom from Test 1. Repeat the step. The colour is which root you reach. A real seed for z² + 1 never leaves the real line.',
    },
    {
      thread: 'F2', head: 'The set of c', stations: ['derivative', 'mandelbrot', 'bulbs', 'seeds', 'pg-twin', 'pg-bulbs', 'pg-cascade', 'pg-rays', 'pg-pole', 'pg-join', 'pg-climb', 'pg-fall', 'pg-lean'],
      text: 'Which c keep the orbit of 0 bounded is the question. The Mandelbrot stop draws that set, with the Julia set of the chosen c beside it. A fixed point with |f′(z₀)| < 1 is the cardioid on the next stop. The exercises stay on the seeds stop. After the paper, Next opens nine rooms the book does not number: the twin, the bulbs, the cascade, the rays, the pole, the join, the climb, the fall, and the lean. A ray is the other address of one landing: the angle, beside c. On the pole, angles 1/3 and 2/3 both leave the north pole, one point, and land together. Angle 0 and angle 1/2 each leave it once. The join draws both addresses on the set of c: dashed lines for how far across and how far up, and the angle from the positive real axis, Figure 1.4.1. The Julia set of that point sits beside them. At 0 there is no angle. Pair is the shared landing, and Arg π is not the rays. The climb draws the orbit of 0 on the book’s sphere. It reaches the north pole when it leaves, and the Julia set is dust. It stays off that pole when it is bounded, and the Julia set is one piece. Theorem 4.2.11. The Julia set is the door, not a third pane. Figure 2.5.2 and Exercise 14 are the coordinates. The book does not number the sphere as the place a leaving orbit arrives. The fall is the eighth room. It colours the basins of z^d − 1, Equation 1.5.5, and lifts that same walk onto the book’s sphere. Figures 4.2.5 and 4.2.6 colour z³ + 1. This picture colours z^d − 1. The north pole is infinity, and it is not a root. The book does not number Newton’s walk on this sphere. The lean is the ninth room. It takes the cubic (z−1)(z²+z+c) and leans those roots off equal spacing, then sets that walk on the same sphere. At c = 1 the polynomial is z³ − 1 and the roots are equally spaced, Equation 1.5.5. At c = 1/2 they lean. The north pole is still not a root. The book does not number this cubic. The nine rooms are not the exam clock.',
    },
  ];
  const spineList = h('ol', { class: 'home-spine-list', id: 'home-spine-list' });
  spineItems.forEach((it, i) => {
    const chips = h('div', { class: 'chips' });
    for (const sid of it.stations) chips.append(stationChip(sid));
    spineList.append(h('li', { id: `home-spine-${i + 1}`, 'data-thread': it.thread },
      h('h3', null, h('span', { class: 'home-spine-num' }, String(i + 1)), it.head),
      h('p', null, it.text), chips));
  });
  const spinePanel = h('section', { class: 'panel', id: 'home-spine', 'aria-labelledby': 'home-spine-title' },
    h('h2', { id: 'home-spine-title' }, 'The whole test in four lines'),
    h('div', { class: 'home-epigraph', id: 'home-spine-line' },
      h('p', null,
        h('span', { class: 'tone-cart' }, 'Settles'), ' and ',
        h('span', { class: 'tone-cart' }, 'stays'), ' are blue. ',
        h('span', { class: 'tone-polar' }, 'Leaves'), ' is orange. ',
        'Which root is the pin: ',
        h('span', { class: 'tone-cart' }, 'blue'), ', ',
        h('span', { class: 'tone-polar' }, 'orange'), ', or ',
        h('span', { class: 'tone-output' }, 'purple'), '. ',
        h('span', { class: 'tone-input' }, 'Green'), ' is the plant.'),
      h('p', null, 'Test 1 taught the motion: spin and stretch, a root of unity, a derivative. Test 2 repeats it from every start. Those four words are pressed on the flat paper.')),
    h('p', { class: 'muted', id: 'home-spine-colours' },
      'Orange on a landing means the walk left. Orange on a pin means that root. c is a hollow square, not a colour. The bars on the four lines are the threads: purple is F1, blue is F2, green is F3. There is no fifth colour.'),
    h('p', { class: 'muted', id: 'home-spine-switch' }, 'A chip that names a Test 1 place switches the map. The switch at the top brings you back.'),
    spineList);

  const legend = h('div', { class: 'chips home-legend', id: 'home-legend', role: 'group', 'aria-label': 'Story threads' });
  const legendBtns = new Map();
  for (const th of FRACTAL_THREADS) {
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
    h('a', { href: '#index', id: 'home-progress-link' }, 'Open the problem index'));
  const matrixPanel = mountMatrixBoard(stationsForMap('test2'), 'test2');
  const mapPanel = h('section', { class: 'panel', id: 'home-map-panel', 'aria-labelledby': 'home-map-title' },
    h('h2', { id: 'home-map-title' }, 'The map'),
    h('p', { class: 'muted' },
      'Each place is a stop. F1 asks whether a sequence settles. The dashed line is F2, square then slide. F3 is which root. The small circles are exercises. Next from the radius opens the index, and Next from the index opens the flat paper. Next from the paper opens the twin, then the bulbs, the cascade, the rays, the pole, the join, the climb, the fall, and the lean. The book does not number those nine rooms. The fall asks which root of z^d − 1, on the sphere the climb just used. The lean asks which root once the roots of (z−1)(z²+z+c) leave that equal spacing. At c = 1 the polynomial is z³ − 1. At c = 1/2 the roots lean. The north pole is still not a root. Section 3.3 sits on the map, marked possible, and it is not a Next stop. The playground assembler is not a Next stop.'),
    legend, threadNote, mapHost, fallbackHost, progressLine);

  const ownedIds = (id) => TEST2_PROBLEMS.filter((p) => p.station === id).map((p) => p.id);
  function stationLabel(st) {
    const ids = ownedIds(st.id);
    const done = ids.filter((id) => ticks[id] === true).length;
    const probs = ids.length ? `${ids.join(', ')}${done ? `, ${done} of ${ids.length} ticked` : ''}` : 'none';
    return `${typesetTitle(st.title)}. Place ${st.order}. Problems: ${probs}. Threads: ${st.threads.join(', ') || 'none'}.`;
  }

  function showFallback(err) {
    console.error('[home-test2] the map could not be drawn', err);
    svg.setAttribute('hidden', '');
    if (fallbackHost.childNodes.length) return;
    const list = h('ul', { class: 'place-list', id: 'home-map-fallback' });
    for (const st of mapStations) {
      list.append(h('li', null, h('a', { class: 'place-link', href: `#${st.id}` },
        h('span', { class: 'place-num' }, st.order === 0 ? '·' : String(st.order)),
        h('span', { class: 'place-title' }, shortTitle(st.title)))));
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
        const st = byId.get(n.id);
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
    ticks = loadTicks(store);
    for (const c of svg.querySelectorAll('circle.pdot')) c.classList.toggle('is-done', ticks[c.getAttribute('data-problem')] === true);
    const tickedN = TEST2_PROBLEMS.filter((p) => ticks[p.id]).length;
    progressText.textContent = `Ticked ${tickedN} of ${TEST2_PROBLEMS.length} problems.`;
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
    const th = focusThread ? FRACTAL_THREADS.find((x) => x.id === focusThread) : null;
    threadNote.textContent = th ? th.summary : threadHint;
  }

  function setFocus(t) {
    focusThread = t === focusThread ? null : t;
    applyFocus();
  }

  function relayout() {
    relayoutRaf = 0;
    let w = Math.round(mapHost.clientWidth);
    if (w < 1) w = 360;
    if (w === lastW && geom) return;
    lastW = w;
    geom = layoutMap(mapStations, w, FRACTAL_THREADS, TEST2_PROBLEMS, TEST2_PART_LABELS);
    renderMap(geom);
  }

  function scheduleRelayout() {
    if (relayoutRaf) return;
    relayoutRaf = requestAnimationFrame(relayout);
  }

  const plan = h('ol', { class: 'home-plan', id: 'home-plan-list' });
  const planStep = (n, text, chips) => {
    const box = h('div', { class: 'chips' });
    for (const c of chips || []) box.append(c);
    plan.append(h('li', { id: `home-plan-${n}` }, h('span', null, text), chips && chips.length ? box : null));
  };
  planStep(1, 'Open the flat paper and say the four words: settles, stays, leaves, which root. Blue is a landing that stayed. Orange on a landing means it left. Orange on a pin means that root. Green is the plant. c is a hollow square. The bars under the four lines are the threads, not those colours. (5 min)',
    [stationChip('paper')]);
  planStep(2, 'On the Test 1 map, open Powers and Roots. Square a point, and name a non-real cube root of 1. The switch brings you back. Then walk the sequences and say whether each one settles. The cycle is the eighth roots of unity. (15 min)',
    [stationChip('powers'), stationChip('roots'), stationChip('sequence'), stationChip('series')]);
  planStep(3, 'Walk the Julia rule, starting from that square. At c = 0 the set is a disk. Move c, then check the orbit of 0. (25 min)',
    [stationChip('disk'), stationChip('julia'), stationChip('zero')]);
  planStep(4, 'Open the Derivative on Test 1, then walk Newton. The picture opens on the cube roots of 1. Do the five steps from the book, then keep a real seed on the real line. (25 min)',
    [stationChip('derivative'), stationChip('newton-step'), stationChip('newton'), stationChip('half')]);
  planStep(5, 'Open the Mandelbrot set, then the cardioid. Drag c and watch the Julia set beside it. The period is the cycle the orbit of 0 falls into. The exercises stay on the next stop and in the index. (10 min)',
    [stationChip('mandelbrot'), stationChip('bulbs'), stationChip('seeds')]);
  planStep(6, 'Open the index. It starts on Core, in the same order as this map: sequences, then Julia, then Newton, then the set of c. For each card, open what the book prints and the check added for this site as two different things, then tick it. (30 min)',
    [stationChip('index')]);
  planStep(7, 'Morning of the test: open the Julia picture at c = 0, then at c = i. Blue stayed. Orange left. (10 min)',
    [stationChip('julia')]);
  const planPanel = h('section', { class: 'panel', id: 'home-plan', 'aria-labelledby': 'home-plan-title' },
    h('h2', { id: 'home-plan-title' }, 'A night-before plan (about two hours)'),
    h('p', { class: 'muted' }, `${BOOK.attribution} The HTML edition is the numbering on this page. Sections 4.3, 4.4, and 3.3 are not on this clock.`),
    plan);

  const nb = stationNeighbours(mapStations, 'home');
  el.append(header, paperPanel, hero, spinePanel, mapPanel, matrixPanel, planPanel, topicPanel, finderPanel, laterPanel, placeLinks('home'));

  drawOrbit();
  renderFinder('');
  relayout();

  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(scheduleRelayout);
    observer.observe(mapHost);
  } else if (typeof window !== 'undefined') {
    winResize = scheduleRelayout;
    window.addEventListener('resize', winResize);
  }

  const mv = (window.__mv = window.__mv || {});
  mv.test2home = {
    layout: () => (geom ? geom.mode : 'narrow'),
    next: nb.next,
    stations: mapStations.map((s) => s.id),
  };

  return function unmount() {
    if (observer) observer.disconnect();
    if (winResize) window.removeEventListener('resize', winResize);
    if (relayoutRaf) cancelAnimationFrame(relayoutRaf);
    style.remove();
    if (mv.test2home) delete mv.test2home;
  };
}
