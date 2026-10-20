// js/core/fractal-station.js — the one page Julia and Newton share.
//
// One picture. The thing you change is a handle on that picture, drawn by the
// plane (the same dot, the same off-centre grab). Chips, the readout, the
// textbook line, and the links back to the map sit in the same places on both
// stations. The iteration stays in fractal.js. Each station fills the sentences
// and the math.

import { MAP_STORAGE_KEY, stationById, threadLabel, threadLinkPrefix, threadsOn } from '../registry.js';
import { citationText } from '../data/textbook.js';
import { prose } from './katex.js';

const CSS = `
.fractal-layout {
  display: grid;
  gap: var(--space-4);
  align-items: start;
  grid-template-columns: minmax(0, 1fr);
}
.fractal-layout > * { min-width: 0; }
@media (min-width: 52rem) {
  .fractal-layout { grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem); }
}
.fractal-formula { margin: 0 0 var(--space-2); max-width: 100%; overflow-x: auto; }
.fractal-note { margin: var(--space-2) 0 0; }
.fractal-chips { margin-top: var(--space-3); }
.fractal-fields { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-3); }
.fractal-fields .field input { width: 7.5rem; }
.fractal-stage { position: relative; }
.fractal-anim-status {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 0.65rem;
  margin: 0;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  transform: translateX(-50%);
  pointer-events: none;
}
.fractal-step {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.fractal-step p { margin: 0; }
.fractal-anim-status[hidden],
.fractal-replay[hidden] { display: none; }
.fractal-earlier h2 { margin: 0 0 var(--space-2); }
.fractal-earlier > p { margin: 0 0 var(--space-3); max-width: 62ch; }
.fractal-earlier .card h3 { margin: 0; font-size: 1.05rem; }
.fractal-earlier .card p { margin: 0; }
.fractal-earlier .card a { color: inherit; }
.fractal-earlier .station-source { margin: 0 0 var(--space-3); }
.fractal-earlier .card .station-source { margin: 0; }
.fractal-earlier .station-links { margin-top: var(--space-3); }
`;

let styleUsers = 0;

function ensureStyle() {
  styleUsers += 1;
  if (!document.head.querySelector('style[data-for="fractal-station"]')) {
    const style = document.createElement('style');
    style.setAttribute('data-for', 'fractal-station');
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  return function releaseStyle() {
    styleUsers -= 1;
    if (styleUsers > 0) return;
    styleUsers = 0;
    const node = document.head.querySelector('style[data-for="fractal-station"]');
    if (node) node.remove();
  };
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

// Writes the textbook line. An empty citation hides the line, and the element stays.
// A url becomes the citation itself, opened in a new tab so the picture stays put.
export function applySource(el, source) {
  const text = citationText(source);
  el.replaceChildren();
  el.dataset.slot = 'textbook';
  el.dataset.filled = text ? 'true' : 'false';
  for (const key of ['book', 'chapter', 'section']) {
    const raw = source && source[key] != null ? String(source[key]).trim() : '';
    if (text && raw) el.dataset[key] = raw;
    else delete el.dataset[key];
  }
  const url = source && typeof source.url === 'string' ? source.url.trim() : '';
  if (text && url) el.dataset.url = url;
  else delete el.dataset.url;
  if (!text) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  if (!url) {
    el.textContent = `Textbook: ${text}.`;
    return;
  }
  const link = h('a', {
    href: url,
    id: el.id ? `${el.id}-link` : null,
    target: '_blank',
    rel: 'noopener noreferrer',
  }, text, h('span', { class: 'sr-only' }, ' (opens in a new tab)'));
  el.append('Textbook: ', link, '.');
}

function mountLinks(ctx) {
  const me = ctx.station;
  const id = me.id;
  const list = [...(ctx.stations || [])].sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)));
  const mapId = ctx.map || 'test2';
  const mine = threadsOn(me, mapId);
  const here = list.findIndex((s) => s.id === id);
  const nav = h('nav', { class: 'station-links', id: `${id}-links`, 'aria-label': 'Neighbouring places' });
  const seen = new Set();

  const onThread = (st) => {
    if (!st) return null;
    const theirs = threadsOn(st, mapId);
    return mine.find((t) => theirs.includes(t)) || null;
  };

  const add = (st, dir, thread, linkId) => {
    if (!st || st.id === id || seen.has(st.id)) return;
    seen.add(st.id);
    const a = h('a', { class: 'station-link', href: `#${st.id}`, 'data-dir': dir, id: linkId });
    if (thread) a.dataset.thread = thread;
    a.textContent = (thread ? threadLinkPrefix(thread, dir) : '') + st.title;
    nav.append(a);
  };

  if (here > 0) add(list[here - 1], 'prev', onThread(list[here - 1]), `${id}-link-prev`);
  if (here >= 0 && here + 1 < list.length) add(list[here + 1], 'next', onThread(list[here + 1]), `${id}-link-next`);
  for (const t of mine) {
    let before = null;
    let after = null;
    for (const s of list) {
      if (s.id === id || !threadsOn(s, mapId).includes(t)) continue;
      if (s.order < me.order) before = s;
      else if (!after) after = s;
    }
    if (before) add(before, 'prev', t, `${id}-link-${t}-prev`);
    if (after) add(after, 'next', t, `${id}-link-${t}-next`);
  }
  add(list.find((s) => s.id === 'home') || null, 'prev', null, `${id}-link-home`);
  return nav;
}

// A plane handle, with drag split into a move, a release, and a jump (keyboard or API).
// The plane keeps the grab: a press away from the centre does not move the point.
export function addDragHandle(plane, spec, hooks = {}) {
  const { onStart, onMove, onRelease, onCommit } = hooks;
  return plane.addPoint({
    ...spec,
    onDragStart(z) {
      if (onStart) onStart(z);
    },
    onDrag(z, info) {
      if (info && info.source === 'pointer' && !info.final) {
        if (onMove) onMove(z, info);
        return;
      }
      if (info && info.source === 'pointer' && info.final) {
        if (onRelease) onRelease(z, info);
        return;
      }
      if (onCommit) onCommit(z, info);
    },
  });
}

// One card per earlier idea, in the same card the problem index uses, with the
// teaching colour of that idea on the left edge. The Story Map link switches
// back to Test 1. The Map link in the neighbour row stays on this test, which
// is where the Test 2 map is mounted.
function mountEarlier(ctx, spec) {
  const earlier = spec.earlier;
  if (!earlier) return null;
  const id = spec.id;
  const section = h('section', {
    class: 'panel fractal-earlier',
    id: `${id}-earlier`,
    'aria-labelledby': `${id}-earlier-title`,
  }, h('h2', { id: `${id}-earlier-title` }, 'Earlier on the map'));
  const intro = h('p', { id: `${id}-earlier-text` });
  prose(intro, earlier.text || '');
  section.append(intro);
  if (earlier.noteSource) {
    const note = h('p', { class: 'station-source', id: `${id}-earlier-source` });
    applySource(note, earlier.noteSource);
    section.append(note);
  }
  const grid = h('div', { class: 'card-grid', id: `${id}-earlier-cards` });
  for (const idea of earlier.ideas || []) {
    const st = stationById(idea.station);
    const card = h('article', {
      class: 'card',
      id: `${id}-earlier-${idea.station}`,
      'data-tone': idea.tone || null,
    });
    const title = h('h3');
    const href = idea.token ? `#${idea.station}-${idea.token}` : `#${idea.station}`;
    title.append(h('a', { href, id: `${id}-earlier-link-${idea.station}` }, st ? st.title : idea.station));
    const body = h('p');
    prose(body, idea.text || '');
    card.append(title, body);
    (idea.sources || []).forEach((source, i) => {
      const line = h('p', { class: 'station-source', id: `${id}-earlier-${idea.station}-source-${i}` });
      applySource(line, source);
      card.append(line);
    });
    grid.append(card);
  }
  section.append(grid);
  const maps = h('nav', { class: 'station-links', id: `${id}-maps`, 'aria-label': 'Maps' });
  const story = h('a', {
    class: 'station-link',
    href: '#home',
    id: `${id}-link-story`,
    'data-dir': 'prev',
    'data-map': 'test1',
  }, 'Story Map');
  story.addEventListener('click', () => {
    if (ctx && ctx.store) ctx.store.set(MAP_STORAGE_KEY, 'test1');
  });
  maps.append(story);
  section.append(maps);
  return section;
}

export function mountFractalPage(el, ctx, spec) {
  const releaseStyle = ensureStyle();
  const id = spec.id;
  const station = ctx.station;
  const mapId = ctx.map || 'test2';

  const lede = h('p', { class: 'station-lede', id: `${id}-lede` }, spec.lede || '');
  const source = h('p', { class: 'station-source', id: `${id}-source` });
  applySource(source, spec.source);
  const badges = h('ul', { class: 'thread-badges', id: `${id}-threads`, 'aria-label': 'Story thread' });
  for (const tid of threadsOn(station, mapId)) {
    const th = (ctx.threads || []).find((t) => t.id === tid) || { id: tid, title: tid, summary: '' };
    badges.append(h('li', null, h('span', {
      class: 'thread-badge',
      'data-thread': tid,
      title: th.summary || '',
    }, threadLabel(th))));
  }
  const header = h('header', { class: 'station-header' },
    h('h1', null, station && station.title ? station.title : spec.title || ''),
    lede,
    source,
    badges);

  const formula = h('div', { class: 'fractal-formula', id: `${id}-rule` });
  const poly = spec.polynomial ? h('div', { class: 'fractal-formula', id: `${id}-poly` }) : null;
  const chips = h('div', { class: 'chips fractal-chips', id: `${id}-presets`, role: 'group', 'aria-label': spec.chipLabel || 'Examples' });
  const fields = spec.fields ? h('div', { class: 'fractal-fields', id: `${id}-fields` }) : null;
  let step = null;
  if (spec.step) {
    const down = h('button', { type: 'button', class: 'btn', id: `${id}-step-down`, 'aria-label': 'Smaller move between frames' }, '−');
    const readout = h('p', { id: `${id}-step-readout` });
    const up = h('button', { type: 'button', class: 'btn', id: `${id}-step-up`, 'aria-label': 'Larger move between frames' }, '+');
    step = { down, readout, up, row: h('div', { class: 'fractal-step', id: `${id}-step` }, down, readout, up) };
  }
  const rule = h('section', { class: 'panel', id: `${id}-rule-panel`, 'aria-labelledby': `${id}-rule-title` },
    h('h2', { id: `${id}-rule-title` }, spec.ruleTitle),
    h('p', { id: `${id}-rule-text` }, spec.ruleText || ''),
    poly,
    formula,
    chips,
    fields,
    step ? step.row : null);

  const planeHost = h('div', { id: `${id}-plane-host` });
  let animStatus = null;
  const stageKids = [planeHost];
  if (spec.film) {
    animStatus = h('p', {
      id: `${id}-anim-status`,
      class: 'fractal-anim-status',
      hidden: '',
      role: 'status',
      'aria-live': 'polite',
    });
    stageKids.push(animStatus);
  }
  const stage = h('div', { id: `${id}-stage`, class: 'fractal-stage' }, ...stageKids);
  if (spec.film) stage.dataset.anim = 'idle';
  const drawStatus = h('p', { class: 'muted fractal-note', id: `${id}-draw-status` });
  const readout = h('div', { class: 'readout', id: `${id}-readout` });
  const replay = spec.film
    ? h('button', { type: 'button', class: 'btn fractal-replay', id: `${id}-replay`, hidden: '' }, 'Play again')
    : null;
  const picture = h('section', { class: 'panel', id: `${id}-picture`, 'aria-labelledby': `${id}-picture-title` },
    h('h2', { id: `${id}-picture-title` }, spec.pictureTitle),
    h('p', { class: 'muted', id: `${id}-picture-caption` }, spec.pictureCaption || ''),
    stage,
    drawStatus,
    readout,
    replay);

  const earlier = mountEarlier(ctx, spec);
  const layout = h('div', { class: 'fractal-layout', id: `${id}-layout` }, picture, rule);
  el.append(header, layout);
  if (earlier) el.append(earlier);
  el.append(mountLinks(ctx));

  return {
    lede, source, formula, poly, chips, fields, step, planeHost, stage, animStatus, drawStatus, readout, replay,
    releaseStyle,
  };
}
