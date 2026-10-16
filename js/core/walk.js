// js/core/walk.js
// The Walk: one guided path through the 22 stops of the site, with a persistent bar that always shows the stop of the page you
// are on (the one thing to do, the one sentence to say, the one problem), ticks the stop by itself when the station reports the
// interaction, remembers progress in the store, and never covers a plane.
//
// Imports only ./listen.js (the Listen control for the "say" sentence). Nothing runs at import: no DOM access, timer, listener or
// fetch, so the pure functions below import in Node. The DOM is only touched inside createWalk().
//
//   WALK_KEYS                      frozen { on, stop, done }: the three store keys (a fourth, walk.min, is private to this module)
//   walkStops(stations)            pure: the stations that have a `walk` entry, in `order`, as Stop objects
//   stopFor(stations, stationId)   pure: one Stop or null
//   evaluateCheck(check, snapshot) pure: the Check vocabulary (docs/ARCHITECTURE.md 11.5) against a Snapshot; an invalid check is false
//   validateCheck(check)           pure: null when well formed, else a one-line reason
//   emptySnapshot()                pure: { events: [], handles: {}, hooks: {}, texts: {} }
//   stopLabel(stop, total = 22)    pure: 'Stop 5 of 22 · The Staircase: z, arg z, Arg z'
//   createWalk(ctx)                ctx is { stations, store, navigate }; builds #walk-bar once and returns the Walk
//
// The bar shows the "shown" stop (the station on screen); Back and Next move from it; the Walk's saved position is the "current"
// stop. Only the bar's own controls change the current stop, so visiting a stop's route by hand never moves the Walk.

import { listenControl } from './listen.js';

export const WALK_KEYS = Object.freeze({ on: 'walk.on', stop: 'walk.stop', done: 'walk.done' });

const MIN_KEY = 'walk.min';              // the Hide/Show choice of the phone fold; private, not part of WALK_KEYS
const SHORT_SCREEN_PX = 600;             // a window shorter than this opens the bar folded until the student chooses (an open bar is 270 to 315 px: half of a 568 px screen)
const POLL_MS = 250;                     // the checker's poll for things that change without an event
const SETTLE_MS = 220;                   // after a detach, how long a page may take to attach before the bar shows the away state
const PENDING_MS = 5000;                 // the longest the bar shows a stop the Walk itself is navigating to
const JUST_MS = 700;                     // how long a freshly ticked dot keeps its pop mark
const EVENT_TYPES = ['click', 'input', 'change', 'pointerup'];
const OPS = ['>=', '<=', '==', '!=', 'abs>=', 'increase', 'change'];
const MAX_DEPTH = 4;

// ---------------------------------------------------------------- private pure helpers

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonEmptyString = (x) => typeof x === 'string' && x !== '';
const idList = (x) => Array.isArray(x) && x.length > 0 && x.every(nonEmptyString);
const own = (o, k) => (isObj(o) && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const problemHref = (p) => '#problem-' + String(p).replace(/\./g, '-');       // '1.3.1' -> '#problem-1-3-1'; 'P3' -> '#problem-P3'
const routeHref = (r) => '#' + r;
const sameRoute = (hash, route) => (String(hash).replace(/^#/, '').toLowerCase() || 'home') === String(route).toLowerCase();

// Half-open quadrants that partition the plane minus 0 (index 0..3 counter-clockwise from the positive real axis); -1 only at the origin.
function quadrantOf(re, im) {
  if (re > 0 && im >= 0) return 0;
  if (re <= 0 && im > 0) return 1;
  if (re < 0 && im <= 0) return 2;
  if (re >= 0 && im < 0) return 3;
  return -1;
}

// A hook value as the checker stores it: numbers, strings and booleans stay, NaN and functions are "missing", objects become JSON text.
function plain(v) {
  if (v === undefined || v === null) return v;
  if (typeof v === 'number') return Number.isNaN(v) ? undefined : v;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'function') return undefined;
  try { return JSON.stringify(v); } catch { return undefined; }
}

// A station title may write an exponent the handout way, z^n. The label sets it as a superscript, the way the menu does.
// walk.js may import only listen.js, so this is the same rule as app.js, copied: a '^' after a non-space character takes {...}, (...) or one signed number or letter.
const EXPONENT = /(?<=\S)\^(?:\{([^{}]*)\}|\(([^()]*)\)|([+\-\u2212]?(?:\d+(?:\.\d+)?|[A-Za-z\u0370-\u03ff])))/g;

function labelNodes(text) {
  const out = [];
  let at = 0;
  for (const m of String(text).matchAll(EXPONENT)) {
    const inner = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3];
    if (inner === '') continue;
    if (m.index > at) out.push(String(text).slice(at, m.index));
    const sup = document.createElement('sup');
    sup.className = 'prose-sup';
    sup.textContent = inner;
    out.push(sup);
    at = m.index + m[0].length;
  }
  if (at < String(text).length) out.push(String(text).slice(at));
  return out;
}

// ---------------------------------------------------------------- pure stop helpers

export function walkStops(stations) {
  if (!Array.isArray(stations)) return [];
  const list = stations.filter((s) => isObj(s) && typeof s.id === 'string' && isObj(s.walk)
    && typeof s.walk.route === 'string' && typeof s.walk.do === 'string' && typeof s.walk.say === 'string' && isObj(s.walk.check));
  list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));       // a stable sort: stations with the same order keep their registry order
  return list.map((s, index) => ({
    index,
    station: s.id,
    title: String(s.title),
    route: s.walk.route,
    do: s.walk.do,
    say: s.walk.say,
    problem: typeof s.walk.problem === 'string' && s.walk.problem !== '' ? s.walk.problem : null,
    check: s.walk.check,
  }));
}

export function stopFor(stations, stationId) {
  return walkStops(stations).find((s) => s.station === stationId) || null;
}

export function stopLabel(stop, total = 22) {
  return 'Stop ' + (stop.index + 1) + ' of ' + total + ' \u00b7 ' + stop.title;
}

export function emptySnapshot() {
  return { events: [], handles: {}, hooks: {}, texts: {} };
}

// ---------------------------------------------------------------- checks (pure)

function validate(check, depth) {
  if (depth > MAX_DEPTH) return 'checks are nested too deeply';
  if (!isObj(check)) return 'a check must be an object';
  switch (check.kind) {
    case 'event': {
      if (!EVENT_TYPES.includes(check.event)) return 'event: "event" must be click, input, change or pointerup';
      const hasIds = idList(check.ids);
      const hasPre = nonEmptyString(check.idPrefix);
      if (check.ids !== undefined && !hasIds) return 'event: "ids" must be a non-empty array of ids';
      if (check.idPrefix !== undefined && !hasPre) return 'event: "idPrefix" must be a non-empty string';
      if (!hasIds && !hasPre) return 'event: give "ids" or "idPrefix"';
      if (check.atLeast !== undefined) {
        if (!Number.isInteger(check.atLeast) || check.atLeast < 1) return 'event: "atLeast" must be an integer of 1 or more';
        if (!hasPre && check.atLeast > check.ids.length) return 'event: "atLeast" is larger than the number of ids';
      }
      return null;
    }
    case 'handle': {
      if (!idList(check.ids)) return 'handle: "ids" must be a non-empty array of ids';
      if (check.quadrants !== undefined && !(Number.isInteger(check.quadrants) && check.quadrants >= 1 && check.quadrants <= 4)) return 'handle: "quadrants" must be 1, 2, 3 or 4';
      return null;
    }
    case 'hook': {
      if (typeof check.hook !== 'string' || !/^[A-Za-z][\w-]*$/.test(check.hook)) return 'hook: "hook" must be a name under window.__mv';
      if (typeof check.path !== 'string' || !/^[A-Za-z_$][\w$]*(\(\))?(\.[A-Za-z_$][\w$]*(\(\))?)*$/.test(check.path)) return 'hook: "path" must be names and empty calls joined by dots, like state().laps';
      if (!OPS.includes(check.op)) return 'hook: unknown "op"';
      if (check.value !== undefined && !(typeof check.value === 'number' || typeof check.value === 'string' || typeof check.value === 'boolean')) return 'hook: "value" must be a number, string or boolean';
      if ((check.op === '==' || check.op === '!=' || check.op === '<=') && check.value === undefined) return 'hook: this "op" needs a "value"';
      return null;
    }
    case 'text': {
      if (!nonEmptyString(check.id)) return 'text: "id" must be an element id';
      if (!nonEmptyString(check.includes)) return 'text: "includes" must be a non-empty string';
      return null;
    }
    case 'all':
    case 'any': {
      if (!Array.isArray(check.of) || check.of.length === 0) return check.kind + ': "of" must be a non-empty array of checks';
      for (const m of check.of) {
        const r = validate(m, depth + 1);
        if (r !== null) return r;
      }
      return null;
    }
    default:
      return 'unknown kind "' + String(check.kind) + '"';
  }
}

export function validateCheck(check) {
  return validate(check, 0);
}

function normaliseSnapshot(snapshot) {
  const s = isObj(snapshot) ? snapshot : {};
  return {
    events: Array.isArray(s.events) ? s.events.filter((e) => typeof e === 'string') : [],
    handles: isObj(s.handles) ? s.handles : {},
    hooks: isObj(s.hooks) ? s.hooks : {},
    texts: isObj(s.texts) ? s.texts : {},
  };
}

function ev(c, s) {
  switch (c.kind) {
    case 'event': {
      const need = c.atLeast === undefined ? 1 : c.atLeast;
      const seen = new Set();
      for (const e of s.events) {
        const i = e.indexOf(':');
        if (i < 1) continue;
        if (e.slice(0, i) !== c.event) continue;
        const id = e.slice(i + 1);
        if ((c.ids && c.ids.includes(id)) || (c.idPrefix && id.startsWith(c.idPrefix))) seen.add(id);
      }
      return seen.size >= need;
    }
    case 'handle':
      return c.ids.some((id) => {
        const h = own(s.handles, id);
        return isObj(h) && h.moved === true && (c.quadrants === undefined || Number(h.quadrants) >= c.quadrants);
      });
    case 'hook': {
      const e = own(s.hooks, c.hook + '.' + c.path);
      if (!isObj(e)) return false;
      const v = c.value === undefined ? 1 : c.value;                 // the default is only reachable for '>=' and 'abs>='
      switch (c.op) {
        case '>=': return typeof e.now === 'number' && e.now >= v;
        case 'abs>=': return typeof e.now === 'number' && Math.abs(e.now) >= v;
        case '<=': return typeof e.now === 'number' && e.now <= v;
        case '==': return e.now !== undefined && e.now === v;
        case '!=': return e.now !== undefined && e.now !== v;
        case 'increase': return typeof e.now === 'number' && typeof e.first === 'number' && e.now > e.first;
        case 'change': return e.first !== undefined && e.now !== undefined && e.now !== e.first;
        default: return false;
      }
    }
    case 'text': {
      const t = own(s.texts, c.id);
      return typeof t === 'string' && t.includes(c.includes);
    }
    case 'all': return c.of.every((m) => ev(m, s));
    case 'any': return c.of.some((m) => ev(m, s));
    default: return false;
  }
}

export function evaluateCheck(check, snapshot) {
  if (validate(check, 0) !== null) return false;                     // an invalid check never passes
  return ev(check, normaliseSnapshot(snapshot));
}

// What a check needs the checker to sample: handle ids, hook reads and text ids (events are always captured).
function collectNeeds(check, out = { handleIds: new Set(), hooks: new Map(), textIds: new Set() }) {
  if (!isObj(check)) return out;
  if (check.kind === 'handle') for (const id of check.ids) out.handleIds.add(id);
  else if (check.kind === 'hook') out.hooks.set(check.hook + '.' + check.path, { hook: check.hook, path: check.path });
  else if (check.kind === 'text') out.textIds.add(check.id);
  else if (check.kind === 'all' || check.kind === 'any') for (const m of check.of) collectNeeds(m, out);
  return out;
}

// window.__mv[hook] then the path: property reads and zero-argument calls, left to right; a missing step is undefined.
function readHook(hook, path) {
  let cur = window.__mv && window.__mv[hook];
  for (const seg of path.split('.')) {
    const m = /^([A-Za-z_$][\w$]*)(\(\))?$/.exec(seg);
    if (!m || cur === null || cur === undefined || m[1] === '__proto__' || m[1] === 'constructor' || m[1] === 'prototype') return undefined;
    let v = cur[m[1]];
    if (m[2]) {
      if (typeof v !== 'function') return undefined;
      try { v = v.call(cur); } catch { return undefined; }
    }
    cur = v;
  }
  return cur;
}

// The nearest ancestor-or-self of the event target that has an id, below the station section ('' when none).
function nearestId(target, section) {
  let n = target instanceof Element ? target : target && target.parentElement;
  while (n && n !== section) {
    if (n.id !== '') return n.id;
    n = n.parentElement;
  }
  return '';
}

// ---------------------------------------------------------------- the Walk

function h(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  for (const c of [].concat(children === undefined ? [] : children)) node.append(c);
  return node;
}

export function createWalk(ctx) {
  if (!isObj(ctx) || !Array.isArray(ctx.stations)) throw new TypeError('createWalk: ctx.stations must be an array');
  if (!isObj(ctx.store) || typeof ctx.store.get !== 'function' || typeof ctx.store.set !== 'function') throw new TypeError('createWalk: ctx.store needs get and set');
  if (typeof ctx.navigate !== 'function') throw new TypeError('createWalk: ctx.navigate must be a function');
  if (typeof document === 'undefined' || !document.body) throw new TypeError('createWalk: there is no document');

  const { store } = ctx;
  const stops = walkStops(ctx.stations);
  const N = stops.length;
  const entry = new Map(ctx.stations.filter((s) => isObj(s) && typeof s.id === 'string').map((s) => [s.id, s]));
  const body = document.body;
  const root = document.documentElement;
  const clampStop = (i) => Math.min(N - 1, Math.max(0, Math.trunc(i)));

  // ---- the saved state (reading never writes; a value that fails its check is ignored, not repaired)
  let on = store.get(WALK_KEYS.on, false) === true;
  const savedStop = store.get(WALK_KEYS.stop, 0);
  let current = Number.isInteger(savedStop) && savedStop >= 0 && savedStop < N ? savedStop : 0;
  let done = {};
  const savedDone = store.get(WALK_KEYS.done, {});
  if (isObj(savedDone)) for (const s of stops) if (savedDone[s.station] === true) done[s.station] = true;
  const savedMin = store.get(MIN_KEY, null);                                 // a boolean once the student has used the fold; anything else is 'no choice yet'
  let min = typeof savedMin === 'boolean' ? savedMin : window.innerHeight > 0 && window.innerHeight < SHORT_SCREEN_PX;

  // ---- the DOM (built once, updated in place, never replaced, so focus survives a stop change)
  const startBtn = h('button', { type: 'button', id: 'walk-start', class: 'btn btn-primary walk-start', title: 'A guided path through all 22 places, one thing to do at each.' }, 'Start the Walk');
  const backBtn = h('button', { type: 'button', id: 'walk-back', class: 'btn walk-step', 'aria-label': 'Back to the previous stop' }, 'Back');
  const labelEl = h('p', { id: 'walk-stop-label', class: 'walk-label' });
  const nextBtn = h('button', { type: 'button', id: 'walk-next', class: 'btn btn-primary walk-step', 'aria-label': 'Next stop' }, 'Next');
  const foldBtn = h('button', { type: 'button', id: 'walk-fold', class: 'btn walk-fold', 'aria-controls': 'walk-body', 'aria-expanded': 'true', 'aria-label': 'Hide the steps' });
  const offpathEl = h('p', { id: 'walk-offpath', class: 'walk-offpath' });
  const gotoLink = h('a', { id: 'walk-goto', class: 'btn btn-primary', href: '#home' }, 'Go to stop 1');
  const awayEl = h('div', { id: 'walk-away', class: 'walk-away' }, [offpathEl, gotoLink]);
  const statusEl = h('p', { id: 'walk-status', class: 'walk-status', role: 'status', 'aria-live': 'polite' });
  const noteEl = h('p', { id: 'walk-note', class: 'walk-note' }, 'Your ticks are not saved in this browser. They last until you close this page.');
  const doEl = h('span', { id: 'walk-do', class: 'walk-line-text' });
  const sayEl = h('span', { id: 'walk-say', class: 'walk-line-text' });
  const listenHost = h('span', { id: 'walk-listen', class: 'walk-listen' });
  const problemChip = h('a', { id: 'walk-problem', class: 'chip problem-chip', href: '#home' });
  const doneBtn = h('button', { type: 'button', id: 'walk-done', class: 'btn walk-done' }, 'Mark done');
  const leaveBtn = h('button', { type: 'button', id: 'walk-leave', class: 'btn btn-quiet', title: 'Close the guide. Your ticks are kept.' }, 'Leave the Walk');
  const bodyEl = h('div', { id: 'walk-body', class: 'walk-body' }, [
    h('div', { class: 'walk-text' }, [
      h('p', { class: 'walk-line walk-line-do' }, [h('span', { class: 'badge walk-tag' }, 'Do'), doEl]),
      h('p', { class: 'walk-line walk-line-say' }, [h('span', { class: 'badge walk-tag' }, 'Say'), sayEl, listenHost]),
    ]),
    h('div', { class: 'walk-tools' }, [problemChip, doneBtn, leaveBtn]),
  ]);
  const dots = stops.map((s, k) => {
    const link = h('a', { id: 'walk-dot-' + k, class: 'walk-dot-link', href: routeHref(s.route), 'data-stop': k, tabindex: '-1' });
    return { li: h('li', { class: 'walk-dot', 'data-stop': k, 'data-done': 'false' }, link), link };
  });
  const progressEl = h('ol', { id: 'walk-progress', class: 'walk-progress' }, dots.map((d) => d.li));
  const countEl = h('span', { id: 'walk-count', class: 'walk-count' });
  const panel = h('div', { id: 'walk-panel', class: 'walk-panel' }, [
    h('div', { class: 'walk-head' }, [backBtn, labelEl, nextBtn, foldBtn]),
    awayEl,
    statusEl,
    noteEl,
    bodyEl,
    h('div', { class: 'walk-progress-row' }, [progressEl, countEl]),
  ]);
  const bar = h('div', { id: 'walk-bar', class: 'walk-bar', role: 'region', 'aria-label': 'The Walk', 'data-walk': 'off' }, [startBtn, panel]);
  panel.hidden = true;
  noteEl.hidden = true;
  awayEl.hidden = true;
  body.append(bar);
  body.dataset.walk = on ? 'on' : 'off';

  // ---- state that is not stored
  let page = null;                   // { section, stationId, index } while a station is attached; index is null for a station with no stop
  let pendingTo = null;              // the stop the Walk itself is navigating to: the bar shows it before the page has loaded
  let status = '';
  let saveFailed = false;
  let checker = null;
  let listen = null;
  let listenFor = '';
  let listenSeq = 0;
  let settleTimer = 0;
  let pendingTimer = 0;
  let lastH = -1;
  let roving = current;
  let destroyed = false;
  let measureRaf = 0;
  let ro = null;
  const justTimers = new Map();

  // ---- view model
  const shownIndex = () => {
    if (pendingTo !== null) return pendingTo;
    if (page !== null && page.index !== null) return page.index;
    return current;
  };
  const isHere = () => {
    if (pendingTo !== null) return pendingTo === current;
    return page !== null && page.index === current;
  };
  const doneCount = () => Object.keys(done).length;
  const resumable = () => current > 0 || doneCount() > 0;

  const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };

  // 'Stop 11 of 22 · Linear Maps' is one text (the title attribute, the accessible name, textContent). The prefix is wrapped so a
  // narrow bar can show it as '11/22' (css/components.css .walk-k-long): the words stay in the DOM, the CSS only makes them small.
  const PREFIX = /^(Stop )(\d+)( of (\d+))( \u00b7 )([^]*)$/;

  function labelContent(text) {
    const m = PREFIX.exec(text);
    if (m === null) return labelNodes(text);
    const span = (cls, t, extra) => { const e = document.createElement('span'); e.className = cls; e.textContent = t; if (extra) e.dataset.total = extra; return e; };
    const k = document.createElement('span');
    k.className = 'walk-k';
    k.append(span('walk-k-long', m[1]), m[2], span('walk-k-long walk-k-total', m[3], m[4]), m[5]);
    return [k, ...labelNodes(m[6])];
  }

  function setLabel(st) {
    const text = stopLabel(st, N);
    if (labelEl.dataset.text !== text) {
      labelEl.dataset.text = text;
      labelEl.replaceChildren(...labelContent(text));
    }
    if (labelEl.title !== text) labelEl.title = text;
  }

  function applyRoving() {
    for (let k = 0; k < dots.length; k++) dots[k].link.tabIndex = k === roving ? 0 : -1;
  }

  // The bar's own height, as an integer, on <html> as --walk-h (0 and removed while off). #view, the footer and the scroll padding read it.
  function measure() {
    if (destroyed) return;
    const hgt = on ? Math.ceil(bar.getBoundingClientRect().height) : 0;
    if (hgt === lastH) return;
    lastH = hgt;
    if (hgt > 0) root.style.setProperty('--walk-h', hgt + 'px');
    else root.style.removeProperty('--walk-h');
  }

  function scheduleMeasure() {
    if (measureRaf !== 0 || destroyed) return;
    measureRaf = requestAnimationFrame(() => { measureRaf = 0; measure(); });
  }

  function syncListen(stationId) {
    if (listenFor === stationId) return;
    listenFor = stationId;
    const seq = ++listenSeq;
    if (listen) { listen.destroy(); listen = null; }
    listenHost.replaceChildren();
    listenControl(listenHost, 'walk', { id: 'walk-listen-btn', segment: stationId })
      .then((l) => {
        if (destroyed || seq !== listenSeq) { if (l) l.destroy(); return; }
        listen = l;                                       // null: the host stays empty and the CSS hides it (:empty)
      })
      .catch(() => {});
  }

  function render() {
    if (destroyed) return;
    if (N === 0) { bar.hidden = true; body.dataset.walk = 'off'; return; }
    const shown = shownIndex();
    const here = isHere();
    const st = stops[shown];
    const cur = stops[current];
    const state = on ? 'on' : 'off';
    bar.dataset.walk = state;
    body.dataset.walk = state;
    startBtn.hidden = on;
    panel.hidden = !on;
    setText(startBtn, resumable() ? 'Resume the Walk: stop ' + (current + 1) + ' of ' + N : 'Start the Walk');
    if (!on) { measure(); return; }

    bar.dataset.stop = String(current);
    bar.dataset.shown = String(shown);
    bar.dataset.here = String(here);
    bar.dataset.done = String(done[st.station] === true);
    bar.dataset.min = String(min);
    const threads = entry.get(st.station) && entry.get(st.station).threads;
    bar.dataset.thread = (Array.isArray(threads) && threads[0]) || '';       // an empty value matches no [data-thread] rule, so the top rule falls back to --accent
    setLabel(st);
    setText(doEl, st.do);
    setText(sayEl, '\u201c' + st.say + '\u201d');
    problemChip.hidden = st.problem === null;
    if (st.problem !== null) {
      problemChip.setAttribute('href', problemHref(st.problem));
      setText(problemChip, st.problem);
      problemChip.setAttribute('aria-label', 'Problem ' + st.problem);
    }
    backBtn.disabled = shown <= 0;
    nextBtn.disabled = shown >= N - 1;
    nextBtn.title = nextBtn.disabled ? 'That is the last stop.' : '';
    const awayHadFocus = here && awayEl.contains(document.activeElement);     // 'Go to stop N' was just used: the row is about to hide, so focus must move on (design 2.4)
    awayEl.hidden = here;
    if (!here) {
      setText(offpathEl, (page !== null && page.index !== null ? '' : 'This page is not one of the stops. ') + 'The Walk is at stop ' + (current + 1) + ' of ' + N + ': ' + cur.title + '.');
      gotoLink.setAttribute('href', routeHref(cur.route));
      setText(gotoLink, 'Go to stop ' + (current + 1) + ': ' + cur.title);
    }
    const canMark = pendingTo !== null || (page !== null && page.index !== null);      // not on an error panel or a page that is not a stop
    doneBtn.hidden = done[st.station] === true || !canMark;
    setText(statusEl, status);
    noteEl.hidden = !saveFailed;
    foldBtn.setAttribute('aria-expanded', String(!min));
    foldBtn.setAttribute('aria-label', min ? 'Show the steps' : 'Hide the steps');
    bodyEl.hidden = min;
    for (let k = 0; k < dots.length; k++) {
      const { li, link } = dots[k];
      const isDone = done[stops[k].station] === true;
      li.dataset.done = String(isDone);
      li.dataset.shown = k === shown ? 'true' : 'false';
      if (k === current) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
      link.setAttribute('aria-label', 'Stop ' + (k + 1) + ': ' + stops[k].title + (isDone ? ' (done)' : ''));
    }
    applyRoving();
    progressEl.setAttribute('aria-label', 'Progress: ' + doneCount() + ' of ' + N + ' stops done');
    setText(countEl, doneCount() + ' of ' + N + ' done');
    syncListen(st.station);
    measure();
    if (awayHadFocus) (nextBtn.disabled ? backBtn : nextBtn).focus({ preventScroll: true });
  }

  // ---- state transitions
  function persist(key, value) {
    const ok = store.set(key, value);
    if (ok === false) saveFailed = true;                  // blocked or full storage: the Walk still works for this page view
  }

  function armPending() {
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => { pendingTimer = 0; pendingTo = null; render(); }, PENDING_MS);
  }

  function clearPending() {
    clearTimeout(pendingTimer);
    pendingTimer = 0;
  }

  // Make `index` the current stop and bring the page to it.
  function open(index) {
    current = index;
    roving = index;
    persist(WALK_KEYS.stop, index);
    status = '';
    const stop = stops[index];
    if (page !== null && page.index === index && sameRoute(location.hash, stop.route)) {   // already there: no remount, so the station keeps its state
      pendingTo = null;
      clearPending();
      render();
      activate();
      return;
    }
    pendingTo = index;
    armPending();
    render();
    ctx.navigate(stop.route);                             // the router detaches the old page, mounts the new one and calls attach
  }

  function start() {
    if (N === 0) return false;
    on = true;
    persist(WALK_KEYS.on, true);
    open(0);
    return true;
  }

  function resume() {
    if (N === 0) return false;
    on = true;
    persist(WALK_KEYS.on, true);
    open(current);
    return true;
  }

  function goTo(i) {
    if (N === 0 || !Number.isFinite(i)) return false;
    on = true;
    persist(WALK_KEYS.on, true);
    open(clampStop(i));
    return true;
  }

  const next = () => (on && N > 0 ? goTo(shownIndex() + 1) : false);
  const back = () => (on && N > 0 ? goTo(shownIndex() - 1) : false);

  function leave() {
    on = false;
    persist(WALK_KEYS.on, false);
    stopChecker();
    status = '';
    pendingTo = null;
    clearPending();
    const hadFocus = panel.contains(document.activeElement);
    render();
    if (hadFocus) startBtn.focus({ preventScroll: true });
  }

  function tickMessage(idx) {
    const n = idx + 1;
    const c = current;
    let text = idx > c ? 'Done: stop ' + n + ' ticked, ahead of the Walk (it is at stop ' + (c + 1) + ').'
      : idx < c ? 'Done: stop ' + n + ' ticked (an earlier stop).'
      : 'Done: stop ' + n + ' ticked.';
    if (doneCount() === N) text += ' That is all ' + N + ' stops: the whole path is walked.';
    return text;
  }

  function markDone(stationId) {
    const id = stationId === undefined || stationId === null ? (stops[shownIndex()] || {}).station : stationId;
    const idx = stops.findIndex((s) => s.station === id);
    if (idx < 0 || done[id] === true) return false;
    done = Object.assign({}, done, { [id]: true });
    persist(WALK_KEYS.done, done);
    status = tickMessage(idx);
    const dot = dots[idx];
    dot.li.dataset.just = 'true';
    clearTimeout(justTimers.get(idx));
    justTimers.set(idx, setTimeout(() => { justTimers.delete(idx); dot.li.removeAttribute('data-just'); }, JUST_MS));
    if (page !== null && page.index === idx) stopChecker();
    const hadFocus = document.activeElement === doneBtn;
    render();
    if (hadFocus) nextBtn.focus({ preventScroll: true });
    return true;
  }

  function toggleFold() {
    min = !min;
    persist(MIN_KEY, min);
    render();
  }

  // ---- attach and detach (called by the router)
  function attach(section, stationEntry) {
    if (destroyed) return;
    clearTimeout(settleTimer);
    settleTimer = 0;
    pendingTo = null;
    clearPending();
    const idx = stops.findIndex((s) => s.station === stationEntry.id);                // -1 for a station with no stop
    page = { section, stationId: stationEntry.id, index: idx >= 0 ? idx : null };
    status = idx >= 0 && done[stationEntry.id] === true ? 'Done: stop ' + (idx + 1) + ' is already ticked.' : '';
    render();
    activate();
  }

  function detach() {
    if (destroyed) return;
    stopChecker();
    page = null;
    clearTimeout(settleTimer);
    // A page that attaches within SETTLE_MS (the normal case) renders itself; a route with no attach (an error panel, no such place) settles to the away state.
    // A station that is still loading (the router marks #view data-state="loading") is waited for, so a slow module never flashes "not one of the stops".
    const settle = () => {
      settleTimer = 0;
      if (pendingTo !== null || destroyed) return;
      const view = document.getElementById('view');
      if (view && view.dataset.state === 'loading') { settleTimer = setTimeout(settle, SETTLE_MS); return; }
      render();
    };
    settleTimer = setTimeout(settle, SETTLE_MS);
  }

  // Start the checker for the page's own stop (not the current one: doing a later stop early counts), when there is something to check.
  function activate() {
    if (!on || page === null || page.index === null) return;
    const st = stops[page.index];
    if (done[st.station] === true) return;
    startChecker(page, st);
  }

  // ---- the checker: capture listeners, rAF-coalesced samples and a 250 ms poll feed evaluateCheck
  function startChecker(pg, stop) {
    stopChecker();
    const run = { pg, stop, needs: collectNeeds(stop.check), events: new Set(), base: {}, moved: {}, quads: {}, snap: emptySnapshot(),
      armed: false, raf: 0, timer: 0, off: [], warned: false };
    for (const type of EVENT_TYPES) {
      const fn = (e) => {
        const id = nearestId(e.target, pg.section);
        if (id !== '') run.events.add(type + ':' + id);
        schedule(run);
      };
      pg.section.addEventListener(type, fn, { capture: true, passive: true });
      run.off.push(() => pg.section.removeEventListener(type, fn, { capture: true }));
    }
    for (const type of ['pointermove', 'keydown', 'keyup']) {
      const fn = () => schedule(run);                     // bubble phase: the target's own handler has already moved the handle
      pg.section.addEventListener(type, fn, { passive: true });
      run.off.push(() => pg.section.removeEventListener(type, fn));
    }
    run.timer = setInterval(() => step(run), POLL_MS);
    checker = run;
    step(run);                                            // the first sample is the baseline
  }

  function stopChecker() {
    if (!checker) return;
    const run = checker;
    checker = null;
    clearInterval(run.timer);
    if (run.raf !== 0) cancelAnimationFrame(run.raf);
    run.raf = 0;
    for (const off of run.off) off();
  }

  function schedule(run) {
    if (run !== checker || run.raf !== 0) return;
    run.raf = requestAnimationFrame(() => { run.raf = 0; step(run); });
  }

  function sample(run) {
    run.snap.events = Array.from(run.events);
    for (const id of run.needs.handleIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const re = Number(el.dataset.re);
      const im = Number(el.dataset.im);
      if (!Number.isFinite(re) || !Number.isFinite(im)) continue;
      const b = run.base[id] || (run.base[id] = { re, im });
      run.moved[id] = run.moved[id] === true || Math.abs(re - b.re) > 1e-6 || Math.abs(im - b.im) > 1e-6;
      const q = quadrantOf(re, im);
      if (q >= 0) (run.quads[id] || (run.quads[id] = new Set())).add(q);
      run.snap.handles[id] = { moved: run.moved[id], quadrants: run.quads[id] ? run.quads[id].size : 0 };
    }
    for (const { hook, path } of run.needs.hooks.values()) {
      const v = plain(readHook(hook, path));
      const key = hook + '.' + path;
      const e = run.snap.hooks[key] || (run.snap.hooks[key] = { now: undefined, first: undefined });
      e.now = v;
      if (e.first === undefined && v !== undefined) e.first = v;
    }
    for (const id of run.needs.textIds) {
      const el = document.getElementById(id);
      run.snap.texts[id] = el ? el.textContent : '';
    }
  }

  function step(run) {
    if (run !== checker || document.hidden) return;
    try {
      sample(run);
      const ok = evaluateCheck(run.stop.check, run.snap);
      if (!run.armed) {                                   // a check that is true at the very first look must go false once before it can tick
        if (!ok) run.armed = true;
        return;
      }
      if (ok) markDone(run.pg.stationId);                 // stops this checker: the page's stop is now done
    } catch (err) {
      if (!run.warned) { run.warned = true; console.warn('[mv] the Walk checker failed on "' + run.pg.stationId + '"', err); }
    }
  }

  // ---- controls
  const bind = (node, type, fn) => node.addEventListener(type, fn);
  bind(startBtn, 'click', () => { if (resumable()) resume(); else start(); });
  bind(backBtn, 'click', () => { back(); });
  bind(nextBtn, 'click', () => { next(); });
  bind(foldBtn, 'click', toggleFold);
  bind(doneBtn, 'click', () => { markDone(); });
  bind(leaveBtn, 'click', leave);

  // The progress strip: a plain left click goes to the stop through the Walk (one navigation); a modified or middle click follows the link.
  bind(progressEl, 'click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a.walk-dot-link') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    goTo(Number(a.dataset.stop));
  });
  bind(progressEl, 'keydown', (e) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const a = e.target instanceof Element ? e.target.closest('a') : null;
    const k = a ? Number(a.dataset.stop) : NaN;
    if (!Number.isFinite(k)) return;
    const k2 = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? Math.min(N - 1, k + 1) : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? Math.max(0, k - 1) : e.key === 'Home' ? 0 : N - 1;
    e.preventDefault();
    roving = k2;
    applyRoving();
    dots[k2].link.focus();
  });
  bind(progressEl, 'focusin', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a') : null;
    const k = a ? Number(a.dataset.stop) : NaN;
    if (!Number.isFinite(k) || k === roving) return;
    roving = k;
    applyRoving();
  });

  // ---- size: one ResizeObserver on the bar, coalesced to one rAF; a window resize listener when there is none
  let onResize = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(scheduleMeasure);
    ro.observe(bar);
  } else {
    onResize = scheduleMeasure;
    window.addEventListener('resize', onResize);
  }

  function state() {
    const shown = shownIndex();
    const st = stops[shown];
    return { on, stop: current, done: stops.filter((s) => done[s.station] === true).map((s) => s.station), here: isHere(), ticked: !!st && done[st.station] === true, shown };
  }

  function destroy() {
    if (destroyed) return;
    stopChecker();
    destroyed = true;
    clearTimeout(settleTimer);
    clearTimeout(pendingTimer);
    for (const t of justTimers.values()) clearTimeout(t);
    justTimers.clear();
    if (measureRaf !== 0) cancelAnimationFrame(measureRaf);
    measureRaf = 0;
    if (ro) { ro.disconnect(); ro = null; }
    if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
    listenSeq++;
    if (listen) { listen.destroy(); listen = null; }
    bar.remove();
    delete body.dataset.walk;
    root.style.removeProperty('--walk-h');
    if (window.__mv && window.__mv.walk === hook) delete window.__mv.walk;
  }

  // ---- the test hook: window.__mv.walk
  const hook = {
    state, start, resume, leave, next, back, goTo, markDone,
    snapshot() {                                          // a deep copy of the running checker's snapshot after a fresh sample
      if (!checker) return emptySnapshot();
      sample(checker);
      const snap = checker.snap;
      const each = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, isObj(v) ? { ...v } : v]));
      return { events: [...snap.events], handles: each(snap.handles), hooks: each(snap.hooks), texts: { ...snap.texts } };
    },
    check() {
      if (!checker) return false;
      sample(checker);
      return evaluateCheck(checker.stop.check, checker.snap);
    },
  };
  window.__mv = window.__mv || {};
  window.__mv.walk = hook;

  // The bar shows the saved stop at once when the Walk was on; the first attach clears the pending state.
  if (on && N > 0) { pendingTo = current; armPending(); }
  render();

  return Object.freeze({ attach, detach, start, resume, leave, next, back, goTo, markDone, state, destroy });
}
