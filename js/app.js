// js/app.js
// The router and the shell behaviour. index.html calls start() once.
// No top-level DOM access: parseRoute, groupStations and documentTitle are pure and are
// imported by the unit tests in Node.
//
// Imports are the registry, the three shell helpers (theme, store, ids), two pure data
// files (films, book), and the route-to-map rule in ./core/map-route.js. The film panel
// itself (js/core/film.js) is imported only when a station carries a film.
// This file does not keep a second copy of that rule. The kit template keeps the same
// helper for sites it scaffolds. This router does not import it from kit/: Cloudflare
// Pages strips that folder, and a missing module stops the page before start().

import { STATIONS, stationById, stationForProblem, stationForTopic, MAP_STORAGE_KEY, stationsForMap, threadsForMap, stationPart, normalizeMapId, mapOf, threadByToken } from './registry.js';
import { mapForcedByRoute as mapForcedByRouteBody } from './core/map-route.js';
import { filmsFor } from './data/films.js';
import { BOOK } from './data/book.js';
import { parseBookRoute } from './book/route.js';
import { CHAPTER_MODULES } from './book/registry.js';
import { shellChapters, bookChapter } from './data/book-path.js';
import { walkSections } from './book/continue.js';
import { cssVar, getTheme, setTheme, onThemeChange, prefersReducedMotion, initTheme } from './core/theme.js';
import { createStore } from './core/store.js';
import { watchIds } from './core/ids.js';

export const SITE_TITLE = 'One Point, Two Addresses';

// The registry only carries the part letters; the names live here.
export const PART_TITLES = {
  I: { title: 'The point', note: 'Chapter 1' },
  II: { title: 'Curves and sets', note: 'Chapter 1' },
  III: { title: 'Motions', note: 'Chapter 2' },
  IV: { title: 'Zoom', note: 'Chapter 3' },
  V: { title: 'The diary and the index', note: 'Lab, 4D, problems' },
  VI: { title: 'Circuit and phase', note: 'Section 5.4, and a Chapter 1 tease' },
  A: { title: 'Sequences', note: 'Section 4.1' },
  B: { title: 'One step', note: 'Section 4.2' },
  C: { title: 'Julia', note: 'Section 4.2' },
  D: { title: 'Newton', note: 'Section 4.2' },
  E: { title: 'Which c', note: 'Section 4.2' },
  F: { title: 'Likely: series', note: 'Sections 4.3 to 4.4' },
  G: { title: 'Possible: harmonic', note: 'Section 3.3' },
  H: { title: 'The index', note: 'Exercises, then the paper' },
  J: { title: 'After the paper', note: 'Unnumbered rooms. Not the exam clock.' },
};

const TOKEN_RE = /^[A-Za-z0-9._~-]+$/;
const MAX_TOKEN = 120;
const LOADING_DELAY_MS = 150;

// ---------------------------------------------------------------- pure helpers

export function documentTitle(label) {
  return label ? `${label} · ${SITE_TITLE}` : SITE_TITLE;
}

// Stations grouped by registry part, in Story Map order.
export function groupStations(stations = STATIONS, mapId = 'test1') {
  const sorted = [...stations].sort((a, b) => a.order - b.order);
  const groups = [];
  for (const st of sorted) {
    const part = stationPart(st, mapId);
    let g = groups.find((x) => x.part === part);
    if (!g) {
      const meta = PART_TITLES[part] || { title: `Part ${part}`, note: '' };
      g = { part, title: meta.title, note: meta.note, stations: [] };
      groups.push(g);
    }
    g.stations.push(st);
  }
  return groups;
}

// hash is location.hash ('#roots'), or any string with or without the leading '#'.
export function parseRoute(hash) {
  let raw = typeof hash === 'string' ? hash : '';
  if (raw.charAt(0) === '#') raw = raw.slice(1);
  if (raw === '') return { station: 'home', preset: null, raw: '' };
  const miss = { station: null, preset: null, raw };
  if (raw.length > MAX_TOKEN || !TOKEN_RE.test(raw)) return miss;

  const lower = raw.toLowerCase();

  // problem-1-4-2 -> 1.4.2 ; problem-P3 -> P3
  if (lower.startsWith('problem-')) {
    const dotted = raw.slice('problem-'.length).replace(/-/g, '.');
    for (const id of [dotted, dotted.toUpperCase()]) {
      const st = stationForProblem(id);
      if (st) return { station: st.id, preset: { kind: 'problem', id }, raw };
    }
    return miss;
  }

  // topic-T2-4 -> T2.4
  if (lower.startsWith('topic-')) {
    const dotted = raw.slice('topic-'.length).replace(/-/g, '.');
    for (const id of [dotted, dotted.toUpperCase()]) {
      const st = stationForTopic(id);
      if (st) return { station: st.id, preset: { kind: 'topic', id }, raw };
    }
    return miss;
  }

  // #book and #chapter-N are a third route family. They are not stations, so they
  // do not switch the remembered test and they do not appear on either map.
  const book = parseBookRoute(raw);
  if (book) return { station: null, preset: null, raw, book };

  const exact = stationById(lower);
  if (exact) return { station: exact.id, preset: null, raw };

  // <station-id>-<rest>: the longest station id that is a prefix followed by '-'
  let best = null;
  for (const st of STATIONS) {
    if (lower.length > st.id.length + 1 && lower.startsWith(st.id + '-') && (!best || st.id.length > best.id.length)) best = st;
  }
  if (best) return { station: best.id, preset: { kind: 'token', token: raw.slice(best.id.length + 1) }, raw };

  return miss;
}

// The page for a book route. A chapter listed in js/book/registry.js loads that
// module. The path is relative to this file, the same way a station module is.
// The roadmap and Test prep stay on the book page.
export function bookModuleFor(spec) {
  if (spec && spec.kind === 'chapter') {
    const path = CHAPTER_MODULES[spec.chapter];
    if (typeof path === 'string' && path) return path;
  }
  return './stations/book.js';
}

// Which map this route forces, or null to keep the map already remembered.
// A place owned by one test forces that test (#julia, #topic-J1, #addresses).
// Home is shared, except a thread token. #home-t2 is Test 1. #home-f2 is Test 2.
// An unknown hash forces nothing, so a typo does not wipe the remembered map.
// The rule lives in js/core/map-route.js. The threads here list their maps, so this
// course does not keep a second copy of the token test. The wrapper only passes the registry.
export function mapForcedByRoute(station, route) {
  return mapForcedByRouteBody(station, route, { mapOf, threadByToken, normalizeMapId });
}

// ---------------------------------------------------------------- DOM helpers (browser only)

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  for (const c of [].concat(children === undefined ? [] : children)) node.append(c);
  return node;
}

function shorten(text, max) {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

// A station title may write an exponent the handout way, z^n. The menu sets it as a superscript, the way the station's
// own page does with prose() from katex.js. app.js imports no other core module (ARCHITECTURE section 1), so this is
// the same rule in miniature: a '^' after a non-space character takes {...}, (...) or one signed number or letter.
const EXPONENT = /(?<=\S)\^(?:\{([^{}]*)\}|\(([^()]*)\)|([+\-\u2212]?(?:\d+(?:\.\d+)?|[A-Za-z\u0370-\u03ff])))/g;

function titleNodes(title) {
  const text = String(title);
  const out = [];
  let at = 0;
  for (const m of text.matchAll(EXPONENT)) {
    const inner = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3];
    if (inner === '') continue;
    if (m.index > at) out.push(text.slice(at, m.index));
    out.push(el('sup', { class: 'prose-sup' }, inner));
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

const THEME_API = Object.freeze({ cssVar, getTheme, setTheme, onThemeChange, prefersReducedMotion });

let running = null;
const scrollMem = new Map();
let lastHash = '';
let restoreScroll = false;
let pendingScroll = null;

export function start() {
  if (running) return running.stop;

  const view = document.getElementById('view');
  const nav = document.getElementById('site-nav');
  const navToggle = document.getElementById('nav-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  const skipLink = document.getElementById('skip-link');
  const footer = document.getElementById('site-footer');
  const routeStatus = document.getElementById('route-status');
  if (!view || !nav) throw new Error('index.html must contain #view and #site-nav');

  const store = createStore('mv:');
  const state = { seq: 0, current: null, first: true, loadingTimer: 0, stopIds: null };
  const cleanups = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  try {
    history.scrollRestoration = 'manual';
  } catch {
    /* not available */
  }

  // ------------------------------------------------------------ navigation list

  let activeMap = 'test1';

  function readMap() {
    try {
      return normalizeMapId(store.get(MAP_STORAGE_KEY, 'test1'));
    } catch {
      return 'test1';
    }
  }

  function syncFooter() {
    const note = document.getElementById('site-footer-note');
    if (!note) return;
    note.textContent = 'Chapters 1 to 7 for MAT 412. Chapters 4 and 5 are open. It runs in your browser and works offline.';
  }

  // The drawer is the same list on every page: Chapters 1–7, then Test prep.
  // shellChapters stops at 7. A chapter with no section on this branch is text.
  function buildShellNav() {
    nav.replaceChildren();
    const open = new Set(walkSections().map((s) => s.chapter));
    const list = el('ul', { class: 'nav-list', id: 'nav-chapters', 'aria-label': 'Chapters' });
    for (const ch of shellChapters()) {
      const kids = [
        el('span', { class: 'nav-num', 'aria-hidden': 'true' }, String(ch.n)),
        el('span', { class: 'nav-title' }, ch.title),
      ];
      const row = open.has(ch.n)
        ? el('a', {
          class: 'nav-link', id: `nav-chapter-${ch.n}`, href: `#chapter-${ch.n}`, 'data-chapter': String(ch.n),
          'aria-label': `${ch.n} ${ch.title}`,
        }, kids)
        : el('span', {
          class: 'nav-link nav-closed', id: `nav-chapter-${ch.n}`,
          'aria-label': `${ch.n} ${ch.title}, closed`,
        }, kids);
      list.append(el('li', {}, row));
    }
    list.append(el('li', {}, el('a', {
      class: 'nav-link', id: 'nav-test-prep', href: '#test-prep', 'aria-label': 'Test prep',
    }, [
      el('span', { class: 'nav-title' }, 'Test prep'),
    ])));
    nav.append(list);
  }

  function whereText(route, st) {
    if (route.book) {
      if (route.book.kind === 'prep') return 'Test prep';
      if (route.book.kind === 'chapter') {
        const ch = bookChapter(route.book.chapter);
        return ch ? `Chapter ${ch.n} · ${ch.title}` : `Chapter ${route.book.chapter}`;
      }
      return 'The book · Chapters 1–7';
    }
    if (!st || st.id === 'home') return 'The book · Chapters 1–7';
    if (st.id === 'problems') return 'Test prep · Test 1';
    if (st.id === 'index') return 'Test prep · Test 2';
    if (st.chapter) {
      const ch = bookChapter(st.chapter);
      const name = ch ? ch.title : st.title;
      return `Chapter ${st.chapter} · ${name}`;
    }
    return st.title;
  }

  function placeWhere(root, text) {
    if (!root || !text || root.querySelector('.where-line')) return;
    const h1 = root.querySelector('h1');
    if (!h1) return;
    const line = el('p', { class: 'where-line', id: 'where-line' }, text);
    h1.insertAdjacentElement('afterend', line);
  }

  function revealActive() {
    const a = nav.querySelector('a[aria-current="page"]');
    if (!a || nav.scrollHeight <= nav.clientHeight) return;
    const nr = nav.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    if (ar.top < nr.top || ar.bottom > nr.bottom) nav.scrollTop += ar.top - nr.top - (nr.height - ar.height) / 2;
  }

  function markCurrent(id, bookRoute, station) {
    let chapter = '';
    let prep = false;
    if (bookRoute && bookRoute.kind === 'chapter') chapter = String(bookRoute.chapter);
    else if ((bookRoute && bookRoute.kind === 'prep') || id === 'problems' || id === 'index') prep = true;
    else if (station && station.chapter && station.chapter <= 7) chapter = String(station.chapter);
    for (const a of nav.querySelectorAll('a.nav-link')) {
      const on = prep ? a.id === 'nav-test-prep' : (chapter !== '' && a.dataset.chapter === chapter);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    revealActive();
  }

  function navIsOpen() {
    return document.body.dataset.navOpen === 'true';
  }

  function setNavOpen(open, { restoreFocus = false } = {}) {
    if (open === navIsOpen()) return;
    const hadFocus = nav.contains(document.activeElement);
    document.body.dataset.navOpen = String(open);
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('title', open ? 'Hide the places' : 'Show the places');
    }
    // While the phone drawer covers the page, the page behind it must not take Tab stops
    // (the CSS also stops it scrolling). The header and the drawer stay live.
    for (const node of [view, footer]) if (node) node.toggleAttribute('inert', open);
    if (open) revealActive();
    else if (restoreFocus && navToggle && hadFocus) navToggle.focus();
  }

  // ------------------------------------------------------------ router panels

  function buildNoSuchPlace(raw) {
    const list = el('ol', { class: 'place-list', id: 'no-such-place-list' });
    const places = stationsForMap(activeMap);
    for (const st of [...places].sort((a, b) => a.order - b.order)) {
      list.append(
        el('li', {}, [
          el('a', { class: 'place-link', href: `#${st.id}` }, [
            el('span', { class: 'place-num' }, st.order === 0 ? '·' : String(st.order)),
            el('span', { class: 'place-title' }, st.title),
          ]),
          el('span', { class: 'place-summary' }, st.summary || ''),
        ]),
      );
    }
    return el('div', { class: 'panel no-such-place', id: 'no-such-place' }, [
      el('h1', { class: 'panel-title' }, 'No such place'),
      el('p', { class: 'lede' }, ['Nothing lives at ', el('code', { class: 'route-token' }, `#${shorten(raw, 60)}`), '.']),
      el('p', {}, `The link may be mistyped or from an older version. These are the places on ${activeMap === 'test2' ? 'Test 2' : 'Test 1'}. Pick one, or go back to the map.`),
      el('p', { class: 'muted' }, [
        'Problem links look like ',
        el('code', {}, '#problem-1-4-2'),
        ' or ',
        el('code', {}, '#problem-P3'),
        '. Topic links look like ',
        el('code', {}, '#topic-T2-4'),
        '.',
      ]),
      el('div', { class: 'row' }, el('a', { class: 'btn btn-primary', id: 'no-such-place-home', href: '#home' }, 'Back to the map')),
      el('h2', { class: 'panel-subtitle' }, 'All the places'),
      list,
    ]);
  }

  function buildUnderConstruction(st, err) {
    // A reload, not a second import(): Chromium keeps a failed module, and a failed module that
    // the station itself imports, in its module map for the life of the page, so only a fresh
    // page can recover from a dropped connection. The hash stays, so the same place comes back.
    const retry = el('button', { type: 'button', class: 'btn', id: 'under-construction-retry' }, 'Reload the page');
    retry.addEventListener('click', () => location.reload());
    // No role="status" here: the router already announces this state through #route-status.
    return el('div', { class: 'panel under-construction', 'data-station-error': st.id }, [
      el('h1', { class: 'panel-title' }, st.title),
      el('p', { class: 'lede' }, 'This station is under construction.'),
      el('p', {}, 'It did not load. If your connection dropped, reload the page. If not, there is nothing to draw here yet. The rest of the map still works.'),
      el('div', { class: 'row' }, [el('a', { class: 'btn btn-primary', id: 'under-construction-home', href: '#home' }, 'Back to the map'), retry]),
      el('details', { class: 'error-details' }, [
        el('summary', {}, 'What went wrong'),
        el('pre', { id: 'under-construction-detail' }, String(err && err.message ? err.message : err)),
      ]),
    ]);
  }

  // ------------------------------------------------------------ mounting

  function navigate(token) {
    const hash = `#${String(token).replace(/^#/, '')}`;
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function makeCtx(route, st, mapId) {
    return Object.freeze({
      navigate,
      route: route.raw || 'home',
      station: st,
      map: mapId,
      stations: stationsForMap(mapId),
      threads: threadsForMap(mapId),
      preset: route.preset,
      store,
      theme: THEME_API,
    });
  }

  function runUnmount(id, fn) {
    if (typeof fn !== 'function') return;
    try {
      fn();
    } catch (err) {
      console.error(`[mv] unmount of station "${id}" threw`, err);
    }
  }

  function teardown() {
    const cur = state.current;
    state.current = null;
    if (state.stopIds) { state.stopIds(); state.stopIds = null; }
    if (cur) runUnmount(cur.id, cur.unmount);
  }

  function finish(first, label) {
    if (routeStatus) routeStatus.textContent = label;
    if (!first) view.focus({ preventScroll: true });
  }

  async function renderBook(seq, route, first) {
    const spec = route.book;
    const label = spec.kind === 'chapter' ? `Chapter ${spec.chapter}` : spec.kind === 'prep' ? 'Test prep' : 'The Book';
    view.dataset.state = 'loading';
    document.title = documentTitle(label);
    const section = el('section', {
      class: 'station', id: 'station-book', 'data-station': 'book', 'data-book': spec.kind,
    });
    view.append(section);
    state.stopIds = watchIds(section, 'book');
    try {
      const mod = await import(bookModuleFor(spec));
      if (seq !== state.seq) return;
      if (typeof mod.mount !== 'function') throw new Error('book page has no mount() export');
      section.replaceChildren();
      const unmount = await mod.mount(section, Object.freeze({
        navigate,
        store,
        book: spec,
        map: activeMap,
      }));
      if (seq !== state.seq) {
        runUnmount('book', unmount);
        return;
      }
      state.current = { id: 'book', unmount: typeof unmount === 'function' ? unmount : null };
      placeWhere(section, whereText(route, null));
      view.dataset.state = 'ready';
      if (pendingScroll != null) window.scrollTo(0, pendingScroll);
      else if (!(spec.kind === 'roadmap' && spec.chapter)) window.scrollTo(0, 0);
      finish(first, label);
    } catch (err) {
      if (seq !== state.seq) return;
      console.error(`[mv] the book page failed to load: ${err && err.message ? err.message : err}`, err);
      section.replaceChildren(buildUnderConstruction({ id: 'book', title: label }, err));
      view.dataset.state = 'error';
      finish(first, `${label}: under construction`);
    }
  }

  async function render() {
    const seq = ++state.seq;
    clearTimeout(state.loadingTimer);
    teardown();
    const first = state.first;
    state.first = false;

    const route = parseRoute(location.hash);
    const nowHash = location.hash || '#home';
    if (lastHash && lastHash !== nowHash) scrollMem.set(lastHash, window.scrollY);
    pendingScroll = restoreScroll ? (scrollMem.get(nowHash) ?? null) : null;
    restoreScroll = false;
    lastHash = nowHash;
    const st = route.station ? stationById(route.station) : null;
    const forced = mapForcedByRoute(st, route);
    const mapId = forced || readMap();
    if (forced) {
      try {
        if (store.get(MAP_STORAGE_KEY, 'test1') !== mapId) store.set(MAP_STORAGE_KEY, mapId);
      } catch { /* memory only */ }
    }
    activeMap = mapId;
    document.body.dataset.map = mapId;
    document.body.dataset.book = route.book ? 'true' : 'false';
    document.body.dataset.station = st ? st.id : '';
    syncFooter();
    buildShellNav();

    setNavOpen(false);
    view.replaceChildren();
    view.dataset.route = route.raw || 'home';
    view.dataset.station = st ? st.id : '';
    view.dataset.map = mapId;
    if (pendingScroll == null) window.scrollTo(0, 0);
    markCurrent(st ? st.id : null, route.book, st);

    if (route.book) {
      await renderBook(seq, route, first);
      return;
    }

    if (!st) {
      view.dataset.state = 'nosuchplace';
      document.title = documentTitle('No such place');
      view.append(buildNoSuchPlace(route.raw));
      finish(first, 'No such place');
      return;
    }

    view.dataset.state = 'loading';
    const bookLanding = st.id === 'home' && !(route.preset && route.preset.kind === 'token');
    const pageLabel = bookLanding ? 'The Book' : st.title;
    document.title = documentTitle(pageLabel);
    const section = el('section', { class: 'station', id: `station-${st.id}`, 'data-station': st.id });
    view.append(section);
    state.stopIds = watchIds(section, st.id);          // every link and tab stop the station builds gets a stable id (js/core/ids.js)
    let placeholder = null;
    state.loadingTimer = setTimeout(() => {
      if (seq !== state.seq || view.dataset.state !== 'loading') return;
      placeholder = el('div', { class: 'loading', role: 'status' }, [el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Loading...']);
      section.append(placeholder);
    }, LOADING_DELAY_MS);

    try {
      const mod = await import(st.module);
      if (seq !== state.seq) return;
      if (typeof mod.mount !== 'function') throw new Error(`station module ${st.module} has no mount() export`);
      clearTimeout(state.loadingTimer);
      if (placeholder) placeholder.remove();
      section.replaceChildren();
      const ctx = makeCtx(route, st, mapId);
      const unmount = await mod.mount(section, ctx);
      if (seq !== state.seq) {
        runUnmount(st.id, unmount);
        return;
      }
      // A station can carry films (js/data/films.js). The film panel owns its own unmount; a film that
      // fails to load never takes the station down with it.
      let unFilms = null;
      const films = filmsFor(st.id);
      if (films.length) {
        try {
          const { mountFilms } = await import('./core/film.js');
          if (seq !== state.seq) {
            runUnmount(st.id, unmount);
            return;
          }
          unFilms = mountFilms(section, films, ctx, { book: BOOK });
        } catch (err) {
          console.error(`[mv] films for "${st.id}" failed to load`, err);
        }
      }
      const both = (typeof unmount === 'function' || unFilms)
        ? () => { if (unFilms) runUnmount(`${st.id} films`, unFilms); if (typeof unmount === 'function') unmount(); }
        : null;
      state.current = { id: st.id, unmount: both };
      placeWhere(section, whereText(route, st));
      view.dataset.state = 'ready';
      if (pendingScroll != null) window.scrollTo(0, pendingScroll);
      finish(first, pageLabel);
    } catch (err) {
      // A superseded navigation must not touch the timer: it now belongs to the newer one.
      if (seq !== state.seq) return;
      clearTimeout(state.loadingTimer);
      console.error(`[mv] station "${st.id}" failed to load: ${err && err.message ? err.message : err}`, err);
      section.replaceChildren(buildUnderConstruction(st, err));
      view.dataset.state = 'error';
      finish(first, `${pageLabel}: under construction`);
    }
  }

  // ------------------------------------------------------------ wiring

  const disposeTheme = initTheme();

  if (themeToggle) {
    const syncToggle = () => themeToggle.setAttribute('aria-pressed', String(getTheme() === 'dark'));
    syncToggle();
    listen(themeToggle, 'click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
    cleanups.push(onThemeChange(syncToggle));
  }

  if (navToggle) {
    listen(navToggle, 'click', () => setNavOpen(!navIsOpen()));
  }
  // Choosing a place closes the drawer. The router closes it on every navigation, but a link to
  // the place already showing fires no hashchange, so close it here too. In that case nothing
  // re-renders, so put focus on the page rather than leave it on a link that just disappeared.
  listen(nav, 'click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a.nav-link') : null;
    if (!link) return;
    const staysHere = link.getAttribute('href') === location.hash;
    setNavOpen(false);
    if (staysHere) view.focus({ preventScroll: true });
  });
  listen(document, 'keydown', (e) => {
    if (e.key === 'Escape' && navIsOpen()) setNavOpen(false, { restoreFocus: true });
  });
  listen(document, 'pointerdown', (e) => {
    if (navIsOpen() && !nav.contains(e.target) && !(navToggle && navToggle.contains(e.target))) setNavOpen(false);
  });
  try {
    const wide = matchMedia('(min-width: 56.25rem)');
    const onWide = (e) => {
      if (e.matches) setNavOpen(false);
    };
    if (wide.addEventListener) {
      wide.addEventListener('change', onWide);
      cleanups.push(() => wide.removeEventListener('change', onWide));
    }
  } catch {
    /* no matchMedia */
  }

  // The skip link must not leave '#view' in the address bar: every '#token' is a route.
  if (skipLink) {
    listen(skipLink, 'click', (e) => {
      e.preventDefault();
      setNavOpen(false);
      view.focus();
    });
  }

  listen(window, 'popstate', () => { restoreScroll = true; });
  listen(window, 'hashchange', render);

  function syncHeaderHeight() {
    const header = document.getElementById('site-header');
    if (!header) return;
    document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  }
  syncHeaderHeight();
  listen(window, 'resize', syncHeaderHeight);

  const mv = (window.__mv = window.__mv || { planes: new Map() });
  if (!mv.planes) mv.planes = new Map();
  mv.app = { render, navigate, state: () => view.dataset.state };

  function stop() {
    for (const fn of cleanups.splice(0)) fn();
    clearTimeout(state.loadingTimer);
    state.seq++;
    teardown();
    setNavOpen(false);
    disposeTheme();
    if (window.__mv && window.__mv.app) delete window.__mv.app;
    running = null;
  }

  running = { stop };
  render();
  return stop;
}
