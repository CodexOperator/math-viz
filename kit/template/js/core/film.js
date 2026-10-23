// js/core/film.js — a film panel any station can carry.
//
// A film is a HyperFrames page in films/: one paused GSAP timeline on window.__tl, 1280 x 720 design px,
// in host-clock mode M0.2j (manim-hyperframes-matrix v0.4.6). The page has no play bar. This panel owns the clock:
//   * one clock: createMotion from anim.js. Each animation frame seeks window.__hostclock (same origin,
//     a direct call, not a message). hostclock.js sleeps GSAP after that seek. This panel does not sleep it again.
//     A page with no __hostclock is still driven here: seek __tl, then sleep the ticker. None of this site's films
//     take that path. Their param hook does not fight the seek, so they all moved.
//   * Pause freezes the film where it is. The next click continues from there. A finished film plays
//     again from the start. A hidden tab moves nothing, and a gap longer than a frame does not either;
//   * a paused or hidden film draws nothing: no seek, no frame. The iframe's GSAP ticker stays asleep.
//   * reduced motion steps from one finished frame to the next (the page's beats), and that button does
//     not say Pause. Turning reduced motion on while a film is playing freezes it. The scrubber then
//     lands on a finished frame, not on a frame between beats;
//   * the panel opens on the last frame, which is a finished picture. The iframe stays hidden until
//     that seek has run. The scrubber seeks in 1/30 s steps when motion is allowed;
//   * the numbers the page computes are copied with __hostclock.readouts() under the film as page text,
//     so a phone reader gets them at the site's own type size, and a screen reader gets them at all.
//   * the smallest glyph in the crop is 23px (the cite and the section label). Scaling the 1280
//     page by stageWidth/1280 keeps that glyph at 15px or more only when the stage is at least 835px.
//     Below 835 the page stacks (films/shared/stack.js). The page declares data-layout="stacked", so the
//     trunk's fit.js never scales it. The plane fills the width, and the staircase or the lines sit
//     below it, at 15px or more. Nothing scrolls sideways.
//   * live numbers go through window.__hostclock.setParams. The page defines window.__onParams.
//     The parent passes a plain object straight through. v0.4.6 rebuilds it in the page realm.
//     An Array subclass is refused, so any array in the payload is copied into a plain array first.
//     A refusal is console.error only. The panel does not keep a second param channel.
//   * a cite whose pdf field is null says the PDF number was not checked. It is not invented.
//
// createFilmPlayer is the clock and the labels, with no DOM, so Node can test it (tools/film-smoke.mjs).
// mountFilm builds the panel. mountFilms puts the panel in [data-film-slot] when the station marked
// where the worked example belongs, and otherwise just before the station links.

import { createMotion, prefersReducedMotion } from './anim.js';
import { mountStepControl } from './stepper.js';

const END_EPS = 1e-3;
const FPS = 30;
const DESIGN_W = 1280;
const CROP_H = 600;
const PORTRAIT_W = 835; // ceil(15/23*1280). Below this the page stacks; stack.js uses the same cut.

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

// v0.4.6 refuses an Array subclass. Copy every array into a plain [] in this realm
// before the parent calls iframe.contentWindow.__hostclock.setParams.
function plainParams(value) {
  if (Array.isArray(value)) {
    const out = [];
    for (let i = 0; i < value.length; i += 1) out.push(plainParams(value[i]));
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) out[key] = plainParams(value[key]);
    return out;
  }
  return value;
}

// A station calls this when its inputs change. The open film reads the numbers
// on the next seek, and redraws immediately if it is already loaded.
export function publishFilmParams(section, filmId, params) {
  if (!section) return;
  const box = section.__mvFilms || (section.__mvFilms = {});
  box[filmId] = params && typeof params === 'object' && !Array.isArray(params) ? plainParams(params) : {};
  try {
    section.dispatchEvent(new CustomEvent('mv-film-params', { bubbles: true, detail: { filmId } }));
  } catch { /* no document */ }
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
      // A null pdf is an unchecked number. Leave it off the pin and say so, rather than guess one.
      if (!c.pdf) p.append(el('span', { class: 'source-tag-note' }, ' PDF number not checked.'));
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
  const btn = el('button', { type: 'button', class: 'btn film-play', id: `${id}-play`, disabled: true }, 'Play');
  const range = el('input', { type: 'range', id: `${id}-scrub`, min: '0', max: '0', step: '1', value: '0', 'aria-label': 'Film time', disabled: true });
  const out = el('output', { id: `${id}-time`, for: `${id}-scrub` }, '');
  const controls = el('div', { class: 'film-controls slider-row' }, btn, range, out);
  const readout = el('div', { class: 'film-readout readout', id: `${id}-readout`, 'aria-live': 'off' });
  let stepControl = null;
  let panelExtras = null;
  if (film.step) {
    const stepHost = el('div', { id: `${id}-step-host` });
    stepControl = mountStepControl(stepHost, {
      id: `${id}-step`,
      min: film.step.min,
      max: film.step.max,
      value: film.step.value,
      legend: film.step.legend || 'Step',
      label: film.step.label || 'Step size',
      onChange: () => pushParams(),
    });
    panelExtras = stepHost;
  }

  const head = el('h2', { class: 'panel-title', id: `${id}-title` }, `${film.kicker || "The book's example"}: ${film.title}`);
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
  // Same row the stations use: a Story Map link, then the places this move comes back to.
  // Thread badges above use the same "T1 · title" cut as threadLabel. A label that names
  // Test 1 or Test 2 is the chip that switches the map.
  const links = el('nav', { class: 'station-links', id: `${id}-links`, 'aria-label': 'Story Map and the same move' });
  const linkNote = el('p', { class: 'muted', id: `${id}-links-note` }, 'Story Map is the whole course. A link that names Test 1 or Test 2 switches the map. The switch at the top brings you back.');
  if (!linkEntries.some((link) => link.href === '#home')) {
    links.append(el('a', { class: 'station-link', href: '#home', id: `${id}-story`, 'data-dir': 'prev' }, 'Story Map'));
  }
  for (const link of linkEntries) {
    links.append(el('a', { class: 'station-link', href: link.href, id: `${id}-link-${String(link.href).replace(/^#/, '')}` }, link.label));
  }

  const panel = el('section', { class: 'panel film', id, 'data-film': film.id, 'aria-labelledby': `${id}-title` },
    head, badges.childElementCount ? badges : null, lede, stage, controls, panelExtras || null, readout, ...cites, linkNote, links);
  host.append(panel);

  // Wide: scale the 1280×720 page to the stage. Narrow: the page stacks (stack.js) and the
  // stage is exactly as tall as that stack. The page's own fit.js does not scale a stacked layout.
  // Neither one scrolls sideways.
  let fittedW = -1;
  let fittedMode = '';
  let fittedH = -1;
  function pageHeight() {
    try {
      if (win && typeof win.__fit === 'function') win.__fit();
      const root = win && win.document && win.document.getElementById('root');
      const h = root ? root.scrollHeight : 0;
      return h > 40 ? h + 8 : 0;
    } catch { return 0; }
  }
  function fit() {
    const w = stage.clientWidth || 0;
    if (w < 2) return;
    const portrait = w < PORTRAIT_W;
    if (portrait) {
      const widthChanged = fittedMode !== 'portrait' || Math.abs(w - fittedW) >= 1;
      if (widthChanged) {
        frame.style.width = '100%';
        frame.style.transform = 'none';
        scaler.style.width = '100%';
        stage.style.aspectRatio = 'auto';
      }
      let h = 0;
      if (widthChanged || fittedH < 0) h = pageHeight();
      else {
        try {
          const root = win && win.document && win.document.getElementById('root');
          h = root && root.scrollHeight > 40 ? root.scrollHeight + 8 : 0;
        } catch { h = 0; }
      }
      if (!h) h = Math.round(w * 1.45);
      if (!widthChanged && Math.abs(h - fittedH) < 2) return;
      fittedW = w;
      fittedMode = 'portrait';
      fittedH = h;
      const px = `${h}px`;
      frame.style.height = px;
      scaler.style.height = px;
      stage.style.height = px;
      if (win && player) mirror(!player.playing);
      return;
    }
    if (fittedMode === 'wide' && Math.abs(w - fittedW) < 1) return;
    fittedW = w;
    fittedMode = 'wide';
    fittedH = -1;
    const scale = w / DESIGN_W;
    const scaledW = DESIGN_W * scale;
    const scaledH = CROP_H * scale;
    frame.style.width = '1280px';
    frame.style.height = '720px';
    frame.style.transform = `scale(${scale})`;
    scaler.style.width = `${scaledW}px`;
    scaler.style.height = `${scaledH}px`;
    stage.style.aspectRatio = 'auto';
    stage.style.height = `${scaledH}px`;
    try { if (win && typeof win.__fit === 'function') win.__fit(); } catch { /* unloaded */ }
    if (win && player) mirror(!player.playing);
  }
  // fit() writes the stage height. Observing the stage makes Chromium report
  // "ResizeObserver loop completed with undelivered notifications" on that write.
  // This strip is only as wide as the stage, and fit() never changes its box.
  const widthProbe = el('div', { 'aria-hidden': 'true' });
  widthProbe.style.cssText = 'position:absolute;left:0;right:0;top:0;height:0;overflow:hidden;pointer-events:none';
  stage.append(widthProbe);
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(fit);
    ro.observe(widthProbe);
    cleanups.push(() => ro.disconnect());
  } else {
    addEventListener('resize', fit);
    cleanups.push(() => removeEventListener('resize', fit));
  }
  fit();

  // A station hides the slot when this move is not the one on screen. Pause, and draw nothing.
  const slot = host.closest('[data-film-slot]') || host;
  if (typeof MutationObserver === 'function') {
    const buried = () => !!(slot.hidden || (typeof slot.closest === 'function' && slot.closest('[hidden]')));
    const onSlot = () => {
      if (buried()) { if (player && player.playing) player.pause(); }
      else fit();
    };
    const mo = new MutationObserver(onSlot);
    mo.observe(slot, { attributes: true, attributeFilter: ['hidden'] });
    cleanups.push(() => mo.disconnect());
  }

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
      // M0.2j already knows which readout lines are on screen. A page that is not on the host
      // clock still publishes [data-readout], and those lines are copied the same way.
      const hc = win.__hostclock;
      if (hc && typeof hc.readouts === 'function') lines = hc.readouts();
      else {
        lines = [...win.document.querySelectorAll('[data-readout]')]
          .filter((n) => n.textContent.trim() && parseFloat(n.style.opacity || '1') > 0.5)
          .map((n) => n.textContent.trim());
      }
    } catch { return; }
    const text = lines.join('\n');
    if (text !== lastReadout) {
      lastReadout = text;
      readout.replaceChildren(...lines.map((s) => el('div', null, s)));
    }
    readout.setAttribute('aria-live', final ? 'polite' : 'off');
  }

  // A seek renders the page synchronously. On M0.2j, __hostclock.seek sleeps GSAP before it returns,
  // so this panel does not sleep the ticker a second time. A page that is not on the host clock still
  // gets the old glue: progress the timeline, then sleep. createMotion remains the only clock.
  function seek(t) {
    try {
      const hc = win.__hostclock;
      if (hc && typeof hc.seek === 'function') {
        hc.seek(t);
        return;
      }
      win.__tl.progress(D > 0 ? t / D : 1);
      if (win.gsap && win.gsap.ticker && typeof win.gsap.ticker.sleep === 'function') win.gsap.ticker.sleep();
    } catch { /* unloaded */ }
  }

  // The station's current numbers, plus this panel's step. setParams renders that frame and sleeps.
  // The object is built in the parent and handed straight to the iframe clock.
  function pushParams() {
    if (!win) return;
    const hc = win.__hostclock;
    if (!hc || typeof hc.setParams !== 'function') return;
    const section = host.closest('section.station') || host.closest('#view') || host;
    const box = (section && section.__mvFilms) || {};
    const fromStation = box[film.id] || {};
    const params = plainParams(fromStation);
    if (stepControl) params.step = stepControl.get();
    let res = null;
    try { res = hc.setParams(params); } catch (err) { console.error(err && err.message ? err.message : 'film params'); return; }
    if (!res || res.ok !== true) console.error(res && res.error ? res.error : 'film params');
    if (player) mirror(!player.playing);
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
    pushParams();
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
      fit();
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
  const onParams = (ev) => {
    if (ev && ev.detail && ev.detail.filmId && ev.detail.filmId !== film.id) return;
    pushParams();
  };
  const paramRoot = host.closest('section.station') || host;
  paramRoot.addEventListener('mv-film-params', onParams);
  cleanups.push(() => paramRoot.removeEventListener('mv-film-params', onParams));
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

// Every film a station carries. [data-film-slot] is where that station wants the worked example.
// With no slot, the block sits just before the station links.
export function mountFilms(section, films, ctx, opts) {
  if (!section || !films || !films.length) return () => {};
  const block = el('div', { class: 'film-block', id: 'films' });
  const slot = section.querySelector('[data-film-slot]');
  if (slot) slot.append(block);
  else {
    const nav = section.querySelector('nav.station-links');
    if (nav && nav.parentNode) nav.parentNode.insertBefore(block, nav);
    else section.append(block);
  }
  const offs = films.map((f) => mountFilm(block, f, ctx, opts));
  return () => {
    for (const off of offs) off();
    block.remove();
  };
}
