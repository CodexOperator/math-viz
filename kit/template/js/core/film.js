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
//     not say Pause. Turning reduced motion on while a film is playing freezes it. The scrubber then
//     lands on a finished frame, not on a frame between beats;
//   * the panel opens on the last frame, which is a finished picture. The iframe stays hidden until
//     that seek has run. The scrubber seeks in 1/30 s steps when motion is allowed;
//   * the numbers the page computes (its [data-readout] lines) are copied under the film as page text,
//     so a phone reader gets them at the site's own type size, and a screen reader gets them at all.
//     When the stage is too narrow for the page's 26px lines to stay at 15px, the picture scrolls
//     sideways inside the stage (the page does not) and every visible line is copied under it.
//
// createFilmPlayer is the clock and the labels, with no DOM, so Node can test it (tools/film-smoke.mjs).
// mountFilm builds the panel. mountFilms puts every film a station carries above its links.

import { createMotion, prefersReducedMotion } from './anim.js';

const END_EPS = 1e-3;
const FPS = 30;
const DESIGN_W = 1280;
const CROP_H = 600;
const LINE_PX = 26;   // .ln2, the teaching lines on the page
const MIN_LINE = 15;  // CSS px. Narrower than this, the stage scrolls sideways instead of shrinking the type.

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
  function nearestStop(v) {
    let best = stops.length ? stops[stops.length - 1] : D;
    let bestD = Infinity;
    for (const s of stops) {
      const d = Math.abs(s - v);
      if (d < bestD) { best = s; bestD = d; }
    }
    return best;
  }
  function scrub(v) {
    if (dead) return;
    if (playing) {
      motion.cancel();
      playing = false;
    }
    watched = true;
    put(reduced() ? nearestStop(Number(v)) : v);
    emit();
  }
  // The OS motion setting can change while the panel is open. A film that was playing stops where it is.
  function noteMotion() {
    if (dead) return;
    if (reduced() && playing) {
      motion.cancel();
      playing = false;
    }
    emit();
  }
  function destroy() {
    dead = true;
    motion.cancel();
    playing = false;
  }
  return { toggle, play, pause, step, scrub, noteMotion, destroy, state, stops, get t() { return t; }, get playing() { return playing; } };
}

function filmLinkEntries(film) {
  const out = [];
  for (const item of film.links || []) {
    if (Array.isArray(item) && item.length >= 2) out.push({ href: String(item[0]), label: String(item[1]) });
    else if (item && typeof item.station === 'string') out.push({ href: `#${item.station}`, label: String(item.label || item.station) });
    else if (item && typeof item.href === 'string') out.push({ href: item.href, label: String(item.label || item.href) });
  }
  return out;
}

function filmCitations(film, book) {
  if (Array.isArray(film.cites) && film.cites.length) {
    return film.cites.map((c) => {
      const p = el('p', { class: 'source-tag' }, `${book.short}, ${book.title}, `);
      p.append(el('a', { href: c.href, target: '_blank', rel: 'noopener noreferrer' }, c.pin), `. ${book.licence}.`);
      return p;
    });
  }
  const source = film.source;
  if (!source) return [];
  const parts = [];
  if (book.title) parts.push(book.title);
  if (source.chapter != null && source.chapter !== '') parts.push(`Chapter ${source.chapter}`);
  if (source.section) parts.push(`§${source.section}${source.sectionTitle ? ` ${source.sectionTitle}` : ''}`);
  if (source.exercise) {
    const exercise = String(source.exercise);
    parts.push(/^exercise\b/i.test(exercise) ? exercise : `Exercise ${exercise}`);
  }
  const p = el('p', { class: 'source-tag' });
  const href = source.url || book.href || book.html || '';
  const label = parts.join(', ') || 'Source';
  if (href) p.append(el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label));
  else p.append(label);
  if (book.licence) p.append(`. ${book.licence}.`);
  if (source.note) p.append(el('span', { class: 'source-tag-note' }, ` ${source.note}`));
  return [p];
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
  // 1.45.toFixed(1) is "1.4" in IEEE. Round in tenths first so a beat reads as itself.
  const tenths = Math.round(Number(t) * 10 + 1e-6);
  return `${(tenths / 10).toFixed(1)} s`;
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
  const scaler = el('div', { class: 'film-scaler' });
  const frame = el('iframe', {
    class: 'film-frame', id: `${id}-frame`, title: `Film: ${film.title}`,
    width: '1280', height: '720', tabindex: '-1', 'aria-hidden': 'true',
  });
  // Hidden until the end frame has been sought, so the first picture is a finished one.
  frame.style.visibility = 'hidden';
  const wait = el('p', { class: 'film-wait', id: `${id}-wait` }, 'Film loading.');
  scaler.append(frame);
  stage.append(scaler, wait);
  const panHint = el('p', { class: 'film-pan-hint muted', id: `${id}-pan`, hidden: true }, 'Scroll the picture sideways for the lines beside the plane.');
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
  const cites = filmCitations(film, book);
  const linkEntries = filmLinkEntries(film);
  const chips = el('div', { class: 'chips', id: `${id}-links` });
  for (const link of linkEntries) {
    chips.append(el('a', { class: 'chip', href: link.href, id: `${id}-link-${String(link.href).replace(/^#/, '')}` }, link.label));
  }
  const links = linkEntries.length
    ? el('div', { class: 'film-links' }, el('p', { class: 'muted' }, 'The same move, elsewhere on the map:'), chips)
    : null;

  const panel = el('section', { class: 'panel film', id, 'data-film': film.id, 'aria-labelledby': `${id}-title` },
    head, badges.childElementCount ? badges : null, lede, stage, panHint, controls, readout, ...cites, links);
  host.append(panel);

  // Fit the 1280 x 720 page to the stage. A CSS scale of a vector page stays sharp.
  // The teaching lines are 26px on the page. Below 15px on screen the stage scrolls sideways
  // instead of shrinking further, and the page itself does not.
  let fittedW = -1;
  function fit() {
    const w = stage.clientWidth || 0;
    // Setting the stage height notifies the observer again. A second pass with the same width stops there.
    if (w <= 0 || Math.abs(w - fittedW) < 1) return;
    fittedW = w;
    const scale = Math.max(w / DESIGN_W, MIN_LINE / LINE_PX);
    const scaledW = DESIGN_W * scale;
    const scaledH = CROP_H * scale;
    frame.style.transform = `scale(${scale})`;
    scaler.style.width = `${scaledW}px`;
    scaler.style.height = `${scaledH}px`;
    stage.style.aspectRatio = 'auto';
    stage.style.height = `${scaledH}px`;
    const pan = scaledW > w + 1;
    stage.classList.toggle('film-stage-pan', pan);
    panHint.hidden = !pan;
    if (pan) {
      stage.tabIndex = 0;
      stage.setAttribute('aria-label', 'Film picture. Scroll sideways for the lines beside the plane.');
    } else {
      stage.removeAttribute('tabindex');
      stage.removeAttribute('aria-label');
    }
    if (win && player) mirror(!player.playing);
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

  let motionMedia = null;
  try { motionMedia = matchMedia('(prefers-reduced-motion: reduce)'); } catch { motionMedia = null; }
  if (motionMedia) {
    const onMotion = () => { if (player) player.noteMotion(); };
    if (typeof motionMedia.addEventListener === 'function') motionMedia.addEventListener('change', onMotion);
    else if (typeof motionMedia.addListener === 'function') motionMedia.addListener(onMotion);
    cleanups.push(() => {
      if (typeof motionMedia.removeEventListener === 'function') motionMedia.removeEventListener('change', onMotion);
      else if (typeof motionMedia.removeListener === 'function') motionMedia.removeListener(onMotion);
    });
  }

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
      // Wide: the page's own type is readable, so only the computed numbers are repeated.
      // Narrow: the lines beside the plane are a sideways scroll away, so every visible line is copied.
      // .ln2 is the teaching column. A generated page may publish only [data-readout], so keep that too.
      const sel = stage.classList.contains('film-stage-pan') ? '.ln2, [data-readout]' : '[data-readout]';
      lines = [...win.document.querySelectorAll(sel)]
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
      if (!win || !win.location || win.location.href === 'about:blank') return;
      const tl = win.__tl;
      if (!tl || typeof tl.progress !== 'function') throw new Error('no timeline');
      D = tl.duration();
    } catch {
      wait.textContent = 'The film did not load. The numbers it shows are in the text above.';
      return;
    }
    if (player) player.destroy();
    theme();
    const beats = Array.isArray(win.__beats) ? win.__beats : [];
    player = createFilmPlayer({ duration: D, beats, seek, onChange: sync, reduced: () => !!(ctx && ctx.theme && ctx.theme.prefersReducedMotion ? ctx.theme.prefersReducedMotion() : prefersReducedMotion()) });
    range.max = String(Math.round(D * FPS));
    btn.disabled = false;
    range.disabled = false;
    stage.dataset.ready = 'true';
    fit();
    seek(D);
    sync(player.state());
    // The first picture the reader sees is the finished frame in the real face.
    // A page with no webfonts is already 'loaded', so this stays synchronous.
    // A face that is still fetching holds the iframe for at most a moment, then shows anyway.
    let shown = false;
    const showFrame = () => {
      if (shown || !player) return;
      shown = true;
      frame.style.visibility = 'visible';
      if (wait.isConnected) wait.remove();
    };
    let fonts = null;
    try { fonts = win.document.fonts; } catch { fonts = null; }
    if (fonts && fonts.status !== 'loaded' && fonts.ready && typeof fonts.ready.then === 'function') {
      fonts.ready.then(showFrame, showFrame);
      const timer = setTimeout(showFrame, 1500);
      cleanups.push(() => clearTimeout(timer));
    } else showFrame();
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
