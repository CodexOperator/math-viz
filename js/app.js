// js/app.js
// The router and the shell behaviour. index.html calls start() once.
// No top-level DOM access: parseRoute, groupStations and documentTitle are pure and are
// imported by the unit tests in Node.
//
// Imports are limited to the registry and the three shell helpers (theme, store, ids) on purpose.

import { STATIONS, THREADS, stationById, stationForProblem, stationForTopic } from './registry.js';
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
};

const TOKEN_RE = /^[A-Za-z0-9._~-]+$/;
const MAX_TOKEN = 120;
const LOADING_DELAY_MS = 150;

// ---------------------------------------------------------------- pure helpers

export function documentTitle(label) {
  return label ? `${label} · ${SITE_TITLE}` : SITE_TITLE;
}

// Stations grouped by registry part, in Story Map order.
export function groupStations(stations = STATIONS) {
  const sorted = [...stations].sort((a, b) => a.order - b.order);
  const groups = [];
  for (const st of sorted) {
    let g = groups.find((x) => x.part === st.part);
    if (!g) {
      const meta = PART_TITLES[st.part] || { title: `Part ${st.part}`, note: '' };
      g = { part: st.part, title: meta.title, note: meta.note, stations: [] };
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

  function buildNav() {
    nav.replaceChildren();
    const groups = groupStations(STATIONS);
    if (groups.length === 0) {
      nav.append(el('p', { class: 'muted' }, 'No places are registered.'));
      return;
    }
    for (const g of groups) {
      const titleId = `nav-part-${g.part}`;
      const list = el('ul', { class: 'nav-list', 'aria-labelledby': titleId });
      for (const st of g.stations) {
        const dots = el('span', { class: 'nav-threads', 'aria-hidden': 'true' });
        for (const t of st.threads || []) dots.append(el('i', { class: 'thread-dot', 'data-thread': t }));
        const link = el('a', { class: 'nav-link', id: `nav-${st.id}`, href: `#${st.id}`, 'data-station': st.id }, [
          el('span', { class: 'nav-num', 'aria-hidden': 'true' }, st.order === 0 ? '·' : String(st.order)),
          el('span', { class: 'nav-title' }, titleNodes(st.title)),
          dots,
        ]);
        list.append(el('li', {}, link));
      }
      nav.append(
        el('section', { class: 'nav-part', 'data-part': g.part }, [
          el('p', { class: 'nav-part-title', id: titleId }, [
            el('span', { class: 'nav-part-roman' }, g.part),
            el('span', { class: 'nav-part-name' }, g.title),
            el('span', { class: 'nav-part-note' }, g.note),
          ]),
          list,
        ]),
      );
    }
  }

  function revealActive() {
    const a = nav.querySelector('a[aria-current="page"]');
    if (!a || nav.scrollHeight <= nav.clientHeight) return;
    const nr = nav.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    if (ar.top < nr.top || ar.bottom > nr.bottom) nav.scrollTop += ar.top - nr.top - (nr.height - ar.height) / 2;
  }

  function markCurrent(id) {
    for (const a of nav.querySelectorAll('a.nav-link')) {
      if (a.dataset.station === id) a.setAttribute('aria-current', 'page');
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
    for (const st of [...STATIONS].sort((a, b) => a.order - b.order)) {
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
      el('p', {}, 'The link may be mistyped or from an older version. Pick a place below, or go back to the map.'),
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

  function makeCtx(route, st) {
    return Object.freeze({
      navigate,
      route: route.raw || 'home',
      station: st,
      stations: STATIONS,
      threads: THREADS,
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

  async function render() {
    const seq = ++state.seq;
    clearTimeout(state.loadingTimer);
    teardown();
    const first = state.first;
    state.first = false;

    const route = parseRoute(location.hash);
    const st = route.station ? stationById(route.station) : null;

    setNavOpen(false);
    view.replaceChildren();
    view.dataset.route = route.raw || 'home';
    view.dataset.station = st ? st.id : '';
    window.scrollTo(0, 0);
    markCurrent(st ? st.id : null);

    if (!st) {
      view.dataset.state = 'nosuchplace';
      document.title = documentTitle('No such place');
      view.append(buildNoSuchPlace(route.raw));
      finish(first, 'No such place');
      return;
    }

    view.dataset.state = 'loading';
    document.title = documentTitle(st.title);
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
      const unmount = await mod.mount(section, makeCtx(route, st));
      if (seq !== state.seq) {
        runUnmount(st.id, unmount);
        return;
      }
      state.current = { id: st.id, unmount: typeof unmount === 'function' ? unmount : null };
      view.dataset.state = 'ready';
      finish(first, st.title);
    } catch (err) {
      // A superseded navigation must not touch the timer: it now belongs to the newer one.
      if (seq !== state.seq) return;
      clearTimeout(state.loadingTimer);
      console.error(`[mv] station "${st.id}" failed to load: ${err && err.message ? err.message : err}`, err);
      section.replaceChildren(buildUnderConstruction(st, err));
      view.dataset.state = 'error';
      finish(first, `${st.title}: under construction`);
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

  buildNav();
  listen(window, 'hashchange', render);

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
