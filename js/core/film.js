// js/core/film.js — a film panel any station can carry.
//
// A film is a HyperFrames page in films/: one paused GSAP timeline on window.__tl, 1280 x 720 design px.
// The page has no play button and no ticker of its own. This panel owns the clock:
//   * one clock: createMotion from anim.js. Each animation frame of the site seeks the page's timeline
//     (same origin, so the seek is a direct call, not a message). GSAP never plays, so its ticker never runs;
//   * Pause freezes the film where it is. The next click continues from there. A finished film plays
//     again from the start. A hidden tab moves nothing, and a gap longer than a frame does not either;
//   * a paused or hidden film draws nothing: no seek, no frame;
//   * reduced motion steps from one finished frame to the next (the page's beats), and that button does
//     not say Pause;
//   * the panel opens on the last frame, which is a finished picture. The scrubber seeks in 1/30 s steps;
//   * the numbers the page computes (its [data-readout] lines) are copied under the film as page text,
//     so a phone reader gets them at the site's own type size, and a screen reader gets them at all.
//
// createFilmPlayer is the clock and the labels, with no DOM, so Node can test it (tools/film-smoke.mjs).
// mountFilm builds the panel. mountFilms puts every film a station carries above its links.

import { createMotion, prefersReducedMotion } from './anim.js';

const END_EPS = 1e-3;
const FPS = 30;

// The finished frames a reduced-motion reader steps through: just before each beat after the first, then the end.
export function filmStops(duration, beats) {
  const D = Math.max(0, Number(duration) || 0);
  const b = (Array.isArray(beats) ? beats : []).map(Number).filter((x) => Number.isFinite(x) && x > 0.1 && x < D - 0.1).sort((x, y) => x - y);
  const stops = b.map((x) => Math.max(0, x - 0.05));
  stops.push(D);
  return [...new Set(stops.map((x) => Math.round(x * 1000) / 1000))];
}

// env: { duration, beats, seek(t), onChange(state), reduced(), motion } (motion defaults to createMotion()).
export function createFilmPlayer(env) {
  const D = Math.max(0.001, Number(env.duration) || 0.001);
  const motion = env.motion || createMotion();
  const reduced = typeof env.reduced === 'function' ? env.reduced : prefersReducedMotion;
  const stops = filmStops(D, env.beats);
  let t = D;               // a film opens on its last, finished frame
  let playing = false;
  let watched = false;     // false until the reader has started it once
  let dead = false;

  const atEnd = () => t >= D - END_EPS;
  function emit() {
    if (typeof env.onChange === 'function') env.onChange(state());
  }
  function put(v) {
    t = Math.min(D, Math.max(0, v));
    if (typeof env.seek === 'function') env.seek(t);
  }
  function label() {
    if (reduced()) return atEnd() && watched ? 'Start again' : 'Next step';
    if (playing) return 'Pause';
    if (atEnd()) return watched ? 'Play again' : 'Play';
    return 'Play';
  }
  function state() {
    return { t, duration: D, playing, watched, atEnd: atEnd(), label: label(), reduced: !!reduced() };
  }
  function pause() {
    if (!playing) return;
    motion.cancel();
    playing = false;
    emit();
  }
  function play() {
    if (dead) return;
    const from = atEnd() ? 0 : t;
    watched = true;
    playing = true;
    put(from);
    const span = D - from;
    motion.run(span * 1000, (u) => {
      put(from + u * span);
      emit();
    }, () => {
      playing = false;
      put(D);
      emit();
    });
    emit();
  }
  function step() {
    if (dead) return;
    motion.cancel();
    playing = false;
    if (!watched || atEnd()) {
      watched = true;
      put(stops[0]);
    } else {
      const next = stops.find((s) => s > t + END_EPS);
      put(next === undefined ? D : next);
    }
    emit();
  }
  function toggle() {
    if (reduced()) return step();
    if (playing) return pause();
    return play();
  }
  function scrub(v) {
    if (dead) return;
    if (playing) {
      motion.cancel();
      playing = false;
    }
    watched = true;
    put(v);
    emit();
  }
  function destroy() {
    dead = true;
    motion.cancel();
    playing = false;
  }
  return { toggle, play, pause, step, scrub, destroy, state, stops, get t() { return t; }, get playing() { return playing; } };
}

// ---------------------------------------------------------------- the panel (browser only)

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) n.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return n;
}

function fmtTime(t) {
  return `${t.toFixed(1)} s`;
}

// film: an entry of js/data/films.js. ctx: the station ctx (theme, threads). opts.book: { short, title, licence }.
export function mountFilm(host, film, ctx, opts = {}) {
  const book = opts.book || { short: 'Howell & Mathews', title: 'Complex Analysis', licence: 'CC BY 4.0' };
  const id = `film-${film.id}`;
  const cleanups = [];
  let player = null;
  let win = null;
  let D = 0;
  let lastReadout = '';

  const stage = el('div', { class: 'film-stage', id: `${id}-stage` });
  const frame = el('iframe', {
    class: 'film-frame', id: `${id}-frame`, title: `Film: ${film.title}`, loading: 'lazy',
    width: '1280', height: '720', tabindex: '-1', 'aria-hidden': 'true',
  });
  const wait = el('p', { class: 'film-wait', id: `${id}-wait` }, 'Film loading.');
  stage.append(frame, wait);
  const btn = el('button', { type: 'button', class: 'btn film-play', id: `${id}-play`, disabled: true }, 'Play');
  const range = el('input', { type: 'range', id: `${id}-scrub`, min: '0', max: '0', step: '1', value: '0', 'aria-label': 'Film time', disabled: true });
  const out = el('output', { id: `${id}-time`, for: `${id}-scrub` }, '');
  const controls = el('div', { class: 'film-controls slider-row' }, btn, range, out);
  const readout = el('div', { class: 'film-readout readout', id: `${id}-readout`, 'aria-live': 'off' });

  const head = el('h2', { class: 'panel-title', id: `${id}-title` }, `Watch it move: ${film.title}`);
  const lede = el('p', { class: 'film-lede', id: `${id}-lede` }, film.lede);
  const badges = el('ul', { class: 'thread-badges', 'aria-label': 'Story threads this film walks' });
  const known = (ctx && ctx.threads) || [];
  for (const tid of film.threads || []) {
    const th = known.find((x) => x.id === tid);
    badges.append(el('li', null, el('span', { class: 'thread-badge', 'data-thread': tid, title: th ? th.summary : '' },
      th ? `${th.id} \u00b7 ${String(th.title).split(/[:;]/)[0].trim()}` : tid)));
  }
  const cites = (film.cites || []).map((c) => {
    const p = el('p', { class: 'source-tag' }, `${book.short}, ${book.title}, `);
    p.append(el('a', { href: c.href, target: '_blank', rel: 'noopener noreferrer' }, c.pin), `. ${book.licence}.`);
    return p;
  });
  const chips = el('div', { class: 'chips', id: `${id}-links` });
  for (const [href, label] of film.links || []) chips.append(el('a', { class: 'chip', href, id: `${id}-link-${String(href).replace(/^#/, '')}` }, label));
  const links = (film.links || []).length
    ? el('div', { class: 'film-links' }, el('p', { class: 'muted' }, 'The same move, elsewhere on the map:'), chips)
    : null;

  const panel = el('section', { class: 'panel film', id, 'data-film': film.id, 'aria-labelledby': `${id}-title` },
    head, badges.childElementCount ? badges : null, lede, stage, controls, readout, ...cites, links);
  host.append(panel);

  // fit the 1280 x 720 page to the stage: a CSS scale of a vector page, re-rasterised by the browser, so it stays sharp
  function fit() {
    const w = stage.clientWidth || 0;
    if (w > 0) frame.style.transform = `scale(${w / 1280})`;
  }
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    cleanups.push(() => ro.disconnect());
  } else {
    addEventListener('resize', fit);
    cleanups.push(() => removeEventListener('resize', fit));
  }
  fit();

  function theme() {
    try {
      const t = ctx && ctx.theme && ctx.theme.getTheme ? ctx.theme.getTheme() : document.documentElement.getAttribute('data-theme');
      if (win && win.document) win.document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
    } catch { /* the page is gone */ }
  }
  if (ctx && ctx.theme && typeof ctx.theme.onThemeChange === 'function') cleanups.push(ctx.theme.onThemeChange(theme));

  function mirror(final) {
    if (!win) return;
    let lines = [];
    try {
      lines = [...win.document.querySelectorAll('[data-readout]')]
        .filter((n) => n.textContent.trim() && parseFloat(n.style.opacity || '1') > 0.5)
        .map((n) => n.textContent.trim());
    } catch { return; }
    const text = lines.join('\n');
    if (text !== lastReadout) {
      lastReadout = text;
      readout.replaceChildren(...lines.map((s) => el('div', null, s)));
    }
    readout.setAttribute('aria-live', final ? 'polite' : 'off');
  }

  // A seek renders the page synchronously. GSAP wakes its own ticker when a timeline renders, and that
  // ticker would then ask for a frame 60 times a second forever, paused or not. Put it back to sleep:
  // this panel's motion is the only clock.
  function seek(t) {
    try {
      win.__tl.progress(D > 0 ? t / D : 1);
      if (win.gsap && win.gsap.ticker && typeof win.gsap.ticker.sleep === 'function') win.gsap.ticker.sleep();
    } catch { /* unloaded */ }
  }

  function sync(s) {
    btn.textContent = s.label;
    range.value = String(Math.round(s.t * FPS));
    out.textContent = `${fmtTime(s.t)} / ${fmtTime(s.duration)}`;
    panel.dataset.state = s.playing ? 'playing' : (s.atEnd ? 'end' : 'paused');
    mirror(!s.playing);
  }

  function ready() {
    try {
      win = frame.contentWindow;
      const tl = win && win.__tl;
      if (!tl || typeof tl.progress !== 'function') throw new Error('no timeline');
      D = tl.duration();
    } catch {
      wait.textContent = 'The film did not load. The numbers it shows are in the text above.';
      return;
    }
    theme();
    const beats = Array.isArray(win.__beats) ? win.__beats : [];
    player = createFilmPlayer({ duration: D, beats, seek, onChange: sync, reduced: () => !!(ctx && ctx.theme && ctx.theme.prefersReducedMotion ? ctx.theme.prefersReducedMotion() : prefersReducedMotion()) });
    range.max = String(Math.round(D * FPS));
    btn.disabled = false;
    range.disabled = false;
    wait.remove();
    stage.dataset.ready = 'true';
    seek(D);
    sync(player.state());
  }
  const onLoad = () => ready();
  frame.addEventListener('load', onLoad);
  cleanups.push(() => frame.removeEventListener('load', onLoad));
  const onClick = () => { if (player) player.toggle(); };
  const onInput = () => { if (player) player.scrub(Number(range.value) / FPS); };
  btn.addEventListener('click', onClick);
  range.addEventListener('input', onInput);
  cleanups.push(() => btn.removeEventListener('click', onClick), () => range.removeEventListener('input', onInput));
  frame.src = film.src;

  return function unmount() {
    if (player) player.destroy();
    player = null;
    for (const fn of cleanups.splice(0)) {
      try { fn(); } catch { /* keep going */ }
    }
    win = null;
    try { frame.src = 'about:blank'; } catch { /* gone */ }
    panel.remove();
  };
}

// Every film a station carries, in one block above the station's links (or at the end when it has none).
export function mountFilms(section, films, ctx, opts) {
  if (!section || !films || !films.length) return () => {};
  const block = el('div', { class: 'film-block', id: 'films' });
  const nav = section.querySelector('nav.station-links');
  if (nav && nav.parentNode) nav.parentNode.insertBefore(block, nav);
  else section.append(block);
  const offs = films.map((f) => mountFilm(block, f, ctx, opts));
  return () => {
    for (const off of offs) off();
    block.remove();
  };
}
