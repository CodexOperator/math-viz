// Router and shell. index.html calls start() once.
// parseRoute is pure and can be imported from Node.

import {
  STATIONS, SITE, MAPS, PARTS, COLOUR_KEYS, MAP_STORAGE_KEY,
  stationById, stationForProblem, stationForTopic, stationsForMap, threadsForMap,
  threadsOn, stationPart, normalizeMapId, mapOf, threadById, threadByToken, threadsToDraw,
} from './registry.js';
import { getTheme, setTheme, onThemeChange, prefersReducedMotion, initTheme } from './core/theme.js';
import { filmsFor } from './data/films.js';
import { createStore } from './core/store.js';
import { watchIds } from './core/ids.js';
import { h } from './core/dom.js';
import { titleFrag } from './components/chrome.js';
import { mapForcedByRoute as mapForcedByRouteBody } from './core/map-route.js';

const TOKEN_RE = /^[A-Za-z0-9._~-]+$/;
const MAX_TOKEN = 160;

export function documentTitle(label) {
  return label ? `${label} · ${SITE.title}` : SITE.title;
}

export function parseRoute(hash) {
  let raw = typeof hash === 'string' ? hash : '';
  if (raw.charAt(0) === '#') raw = raw.slice(1);
  if (raw === '') return { station: 'home', preset: null, raw: '' };
  const miss = { station: null, preset: null, raw };
  if (raw.length > MAX_TOKEN || !TOKEN_RE.test(raw)) return miss;
  const lower = raw.toLowerCase();

  if (lower.startsWith('problem-')) {
    const dotted = raw.slice('problem-'.length).replace(/-/g, '.');
    for (const id of [dotted, dotted.toUpperCase()]) {
      const st = stationForProblem(id);
      if (st) return { station: st.id, preset: { kind: 'problem', id }, raw };
    }
    return miss;
  }
  if (lower.startsWith('topic-')) {
    const dotted = raw.slice('topic-'.length).replace(/-/g, '.');
    for (const id of [dotted, dotted.toUpperCase()]) {
      const st = stationForTopic(id);
      if (st) return { station: st.id, preset: { kind: 'topic', id }, raw };
    }
    return miss;
  }
  const exact = stationById(lower);
  if (exact) return { station: exact.id, preset: null, raw };
  let best = null;
  for (const st of STATIONS) {
    if (lower.length > st.id.length + 1 && lower.startsWith(`${st.id}-`) && (!best || st.id.length > best.id.length)) best = st;
  }
  if (best) return { station: best.id, preset: { kind: 'token', token: raw.slice(best.id.length + 1) }, raw };
  return miss;
}

// A station owned by one map forces that map. Home does not, except a thread
// token such as #home-T2, which opens the map that thread belongs to.
// The rule itself lives in core/map-route.js. This wrapper only passes the registry.
export function mapForcedByRoute(station, route) {
  return mapForcedByRouteBody(station, route, { mapOf, threadByToken, normalizeMapId });
}

function filmBook() {
  const book = SITE.textbook || {};
  const authors = Array.isArray(book.authors) ? book.authors.filter(Boolean).join(' and ') : (book.authors || '');
  return {
    short: authors || book.title || '',
    title: book.title || '',
    licence: book.licence || '',
    href: book.htmlUrl || book.url || '',
  };
}

let running = null;

export function start() {
  if (running) return running.stop;
  const view = document.getElementById('view');
  const nav = document.getElementById('site-nav');
  const navToggle = document.getElementById('nav-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  const skipLink = document.getElementById('skip-link');
  const footer = document.getElementById('site-footer');
  const routeStatus = document.getElementById('route-status');
  const titleEl = document.getElementById('site-title-text');
  if (!view || !nav) throw new Error('index.html must contain #view and #site-nav');

  if (titleEl) titleEl.textContent = SITE.title;
  const store = createStore(SITE.storagePrefix || 'study:');
  const state = { seq: 0, current: null, first: true, stopIds: null };
  const cleanups = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  let activeMap = normalizeMapId(readMap());

  function readMap() {
    try { return normalizeMapId(store.get(MAP_STORAGE_KEY, '')); }
    catch { return normalizeMapId(''); }
  }

  function chooseMap(id) {
    const next = normalizeMapId(id);
    if (next === activeMap && location.hash.replace(/^#/, '') === 'home') return;
    try { store.set(MAP_STORAGE_KEY, next); } catch { /* this visit still switches */ }
    activeMap = next;
    navigate('home');
  }

  function syncFooter(mapId) {
    const note = document.getElementById('site-footer-note');
    if (!note) return;
    const byMap = SITE.footerByMap || {};
    note.textContent = byMap[mapId] || SITE.footer || '';
  }

  function syncColourKey(mapId) {
    const list = document.getElementById('colour-key-list');
    if (!list) return;
    const rows = COLOUR_KEYS[mapId] || COLOUR_KEYS[normalizeMapId(mapId)] || [];
    list.replaceChildren();
    for (const row of rows) {
      list.append(h('li', {},
        h('span', { class: 'key-swatch', 'data-key': row.role || 'cart', 'aria-hidden': 'true' }),
        h('span', { text: row.text || '' })));
    }
  }

  function buildNav(mapId) {
    nav.replaceChildren();
    if (MAPS.length > 1) {
      const switchRow = h('div', { class: 'map-switch', id: 'nav-map-switch', role: 'group', 'aria-label': 'Which map' });
      for (const m of MAPS) {
        const b = h('button', {
          type: 'button',
          class: 'chip',
          id: `nav-map-${m.id}`,
          title: m.note || '',
          'aria-pressed': m.id === mapId ? 'true' : 'false',
          'data-map': m.id,
        }, m.title);
        b.addEventListener('click', () => chooseMap(m.id));
        switchRow.append(b);
      }
      nav.append(h('div', { class: 'map-switch-block nav-map' },
        h('p', { class: 'map-switch-label', text: 'Which map' }),
        switchRow));
    }
    const stations = [...stationsForMap(mapId)].sort((a, b) => a.order - b.order);
    const threads = threadsForMap(mapId);
    const drawn = new Set(threadsToDraw(threads, stations, mapId).map((t) => t.id));
    let lastPart = null;
    let list = null;
    for (const st of stations) {
      const part = stationPart(st, mapId) || '·';
      if (part !== lastPart) {
        lastPart = part;
        const meta = PARTS[part] || { title: part, note: '' };
        const titleId = `nav-part-${part}`;
        list = h('ul', { class: 'nav-list', 'aria-labelledby': titleId });
        nav.append(h('section', { class: 'nav-part', 'data-part': part },
          h('p', { class: 'nav-part-title', id: titleId },
            h('span', { class: 'nav-part-roman', text: part }),
            h('span', { class: 'nav-part-name', text: meta.title || '' }),
            h('span', { class: 'nav-part-note', text: meta.note || '' })),
          list));
      }
      const dots = h('span', { class: 'nav-threads', 'aria-hidden': 'true' });
      for (const tid of threadsOn(st, mapId)) {
        if (!drawn.has(tid)) continue;
        const t = threadById(tid);
        dots.append(h('i', {
          class: 'thread-dot',
          'data-thread': tid,
          'data-tone': t ? t.tone : 'accent',
          'data-mark': t ? (t.mark || 'disc') : 'disc',
        }));
      }
      const title = h('span', { class: 'nav-title' });
      title.append(titleFrag(st.title));
      const kids = [
        h('span', { class: 'nav-num', 'aria-hidden': 'true', text: st.order === 0 ? '·' : String(st.order) }),
        title,
      ];
      if (dots.childElementCount) kids.push(dots);
      list.append(h('li', {}, h('a', { class: 'nav-link', href: `#${st.id}`, 'data-station': st.id }, kids)));
    }
  }

  function markCurrent(id) {
    for (const a of nav.querySelectorAll('a.nav-link')) {
      if (a.dataset.station === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  }

  function navIsOpen() { return document.body.dataset.navOpen === 'true'; }

  function setNavOpen(open) {
    document.body.dataset.navOpen = String(open);
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('title', open ? 'Hide the places' : 'Show the places');
    }
    for (const node of [view, footer]) if (node) node.toggleAttribute('inert', open);
  }

  function navigate(token) {
    const hash = `#${String(token).replace(/^#/, '')}`;
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function makeCtx(route, st, mapId) {
    return Object.freeze({
      navigate,
      chooseMap,
      route: route.raw || 'home',
      station: st,
      map: mapId,
      stations: stationsForMap(mapId),
      threads: threadsForMap(mapId),
      siteMaps: MAPS,
      preset: route.preset,
      store,
      theme: { getTheme, setTheme, onThemeChange, prefersReducedMotion },
    });
  }

  function teardown() {
    const cur = state.current;
    state.current = null;
    if (state.stopIds) { state.stopIds(); state.stopIds = null; }
    if (cur && typeof cur.unmount === 'function') {
      try { cur.unmount(); } catch (err) { console.error('[study] unmount threw', err); }
    }
  }

  async function render() {
    const seq = ++state.seq;
    teardown();
    const first = state.first;
    state.first = false;
    const route = parseRoute(location.hash);
    const st = route.station ? stationById(route.station) : null;
    const forced = mapForcedByRoute(st, route);
    const mapId = forced || readMap();
    if (forced) {
      try { store.set(MAP_STORAGE_KEY, mapId); } catch { /* memory */ }
    }
    activeMap = mapId;
    document.body.dataset.map = mapId;
    syncFooter(mapId);
    syncColourKey(mapId);
    buildNav(mapId);
    setNavOpen(false);
    view.replaceChildren();
    view.dataset.route = route.raw || 'home';
    view.dataset.station = st ? st.id : '';
    view.dataset.map = mapId;
    view.dataset.state = 'loading';
    window.scrollTo(0, 0);
    markCurrent(st ? st.id : null);

    if (!st) {
      view.dataset.state = 'nosuchplace';
      document.title = documentTitle('No such place');
      const list = h('ul', { class: 'place-list' });
      for (const place of [...stationsForMap(activeMap)].sort((a, b) => a.order - b.order)) {
        list.append(h('li', {}, h('a', { class: 'place-link', href: `#${place.id}` }, place.title)));
      }
      view.append(h('div', { class: 'panel no-such-place', id: 'no-such-place' },
        h('h1', { class: 'panel-title', text: 'No such place' }),
        h('p', { class: 'lede' }, 'Nothing lives at ', h('code', { class: 'route-token', text: `#${route.raw}` }), '.'),
        h('p', {}, h('a', { class: 'btn btn-primary', href: '#home' }, 'Back to the map')),
        list));
      if (routeStatus) routeStatus.textContent = 'No such place';
      if (!first) view.focus({ preventScroll: true });
      return;
    }

    document.title = documentTitle(st.title);
    const section = h('section', { class: 'station', id: `station-${st.id}`, 'data-station': st.id });
    view.append(section);
    state.stopIds = watchIds(section, st.id);
    try {
      const mod = await import(st.module);
      if (seq !== state.seq) return;
      if (typeof mod.mount !== 'function') throw new Error(`${st.module} has no mount()`);
      const ctx = makeCtx(route, st, mapId);
      const unmount = await mod.mount(section, ctx);
      if (seq !== state.seq) {
        if (typeof unmount === 'function') unmount();
        return;
      }
      // A station can carry one film. The panel owns its clock. A film that fails does not take the station down.
      let unFilms = null;
      const films = filmsFor(st.id);
      if (films.length) {
        try {
          const { mountFilms } = await import('./core/film.js');
          if (seq !== state.seq) {
            if (typeof unmount === 'function') unmount();
            return;
          }
          unFilms = mountFilms(section, films, ctx, { book: filmBook() });
        } catch (err) {
          console.error(`[study] films for "${st.id}" failed to load`, err);
        }
      }
      if (seq !== state.seq) {
        if (typeof unFilms === 'function') unFilms();
        if (typeof unmount === 'function') unmount();
        return;
      }
      const both = (typeof unmount === 'function' || typeof unFilms === 'function')
        ? () => {
          if (typeof unFilms === 'function') {
            try { unFilms(); } catch (err) { console.error('[study] film unmount threw', err); }
          }
          if (typeof unmount === 'function') unmount();
        }
        : null;
      state.current = { id: st.id, unmount: both };
      view.dataset.state = 'ready';
      if (routeStatus) routeStatus.textContent = st.title;
      if (!first) view.focus({ preventScroll: true });
    } catch (err) {
      if (seq !== state.seq) return;
      console.error(`[study] station "${st.id}" failed to load`, err);
      section.replaceChildren(h('div', { class: 'panel under-construction', 'data-station-error': st.id },
        h('h1', { class: 'panel-title', text: st.title }),
        h('p', { class: 'lede', text: 'This station did not load. The rest of the map still works.' }),
        h('a', { class: 'btn btn-primary', href: '#home' }, 'Back to the map')));
      view.dataset.state = 'error';
    }
  }

  const disposeTheme = initTheme();
  if (themeToggle) {
    const syncToggle = () => themeToggle.setAttribute('aria-pressed', String(getTheme() === 'dark'));
    syncToggle();
    listen(themeToggle, 'click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
    cleanups.push(onThemeChange(syncToggle));
  }
  if (navToggle) listen(navToggle, 'click', () => setNavOpen(!navIsOpen()));
  listen(nav, 'click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a.nav-link') : null;
    if (link) setNavOpen(false);
  });
  listen(document, 'keydown', (e) => { if (e.key === 'Escape' && navIsOpen()) setNavOpen(false); });
  if (skipLink) {
    listen(skipLink, 'click', (e) => {
      e.preventDefault();
      setNavOpen(false);
      view.focus();
    });
  }
  listen(window, 'hashchange', render);

  function stop() {
    for (const fn of cleanups.splice(0)) fn();
    state.seq += 1;
    teardown();
    setNavOpen(false);
    disposeTheme();
    running = null;
  }
  running = { stop };
  render();
  return stop;
}
