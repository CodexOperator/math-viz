// A pre-rendered Manim film next to the live loop.
//
// Live is the station's JS picture. Rendered plays one film. A station with
// more than one film keeps the same Live / Rendered switch and adds a Film
// picker. One player is on screen. A page film (the worked example) takes
// the video's place. It is not a second stack under the mp4.
// The portrait cut is the source whose media query matches a window under
// 600px. The landscape cut is the other source. preload is none, so the file
// waits for Play. The poster is the still, and it matches the cut. There is
// no autoplay. The video is muted, has controls, and plays inline.
//
// One clock. A hidden tab pauses the video. If it was playing, it continues
// when the tab is visible again, from the same frame. Unmount pauses it and
// drops the listener. Switching back to Live pauses the video. If it had
// moved, the frame log gives that frame so the live picture can open there.
// A logged width is the deep-zoom window. A frame past maxK is the clock's
// extra tick and is ignored.

import { citationText } from '../data/textbook.js';

export const FILM_PORTRAIT_MQ = '(max-width: 599px)';

function el(tag, attrs, ...kids) {
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

export function parseFrameLog(text, opts = {}) {
  const maxK = Number.isFinite(opts.maxK) ? opts.maxK : Infinity;
  const frames = [];
  for (const line of String(text).split('\n')) {
    const s = line.trim();
    if (!s) continue;
    let row;
    try { row = JSON.parse(s); } catch { continue; }
    if (!row || !Number.isFinite(row.t) || !Number.isFinite(row.re) || !Number.isFinite(row.im)) continue;
    if (Number.isFinite(row.k) && row.k > maxK) continue;
    const frame = { t: row.t, re: row.re, im: row.im, k: row.k };
    if (Number.isFinite(row.width) && row.width > 0) frame.width = row.width;
    frames.push(frame);
  }
  return frames;
}

// The logged c nearest to this time. Frames are in time order.
export function frameAt(frames, time) {
  if (!frames || !frames.length) return null;
  const t = Number(time);
  if (!Number.isFinite(t)) return frames[0];
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const b = frames[lo];
  const a = frames[Math.max(0, lo - 1)];
  return Math.abs(a.t - t) <= Math.abs(b.t - t) ? a : b;
}

function csqrt(re, im) {
  if (im === 0 && re < 0) return { re: 0, im: Math.sqrt(-re) };
  const m = Math.hypot(re, im);
  const s = im < 0 ? -1 : 1;
  return { re: Math.sqrt((m + re) / 2), im: s * Math.sqrt((m - re) / 2) };
}

// Turn fraction t in [0, 1) for c = e^{iθ}/2 − e^{2iθ}/4, θ = 2π t.
// Null when c is not on that curve.
export function cardioidTurn(c) {
  if (!c || !Number.isFinite(c.re) || !Number.isFinite(c.im)) return null;
  const s = csqrt(1 - 4 * c.re, -4 * c.im);
  const a = { re: 1 + s.re, im: s.im };
  const b = { re: 1 - s.re, im: -s.im };
  const la = Math.hypot(a.re, a.im);
  const lb = Math.hypot(b.re, b.im);
  const lam = Math.abs(la - 1) <= Math.abs(lb - 1) ? a : b;
  const mod = Math.hypot(lam.re, lam.im);
  if (!(mod > 1e-8) || Math.abs(mod - 1) > 0.04) return null;
  let t = Math.atan2(lam.im, lam.re) / (2 * Math.PI);
  if (t < 0) t += 1;
  if (t >= 1) t = 0;
  return t;
}

function filmList(spec) {
  if (Array.isArray(spec.films) && spec.films.length) {
    return spec.films.map((film) => ({
      id: film.id,
      label: film.label,
      kind: film.kind === 'page' ? 'page' : 'video',
      caption: film.caption || '',
      landscape: film.landscape,
      portrait: film.portrait,
      posterLand: film.posterLand,
      posterPort: film.posterPort,
      framesUrl: film.frames,
      maxK: film.maxK,
      source: film.source || spec.source,
      cite: film.cite || null,
    }));
  }
  return [{
    id: 'main',
    label: 'Rendered film',
    kind: 'video',
    caption: spec.caption || '',
    landscape: spec.landscape,
    portrait: spec.portrait,
    posterLand: spec.posterLand,
    posterPort: spec.posterPort,
    framesUrl: spec.framesUrl,
    maxK: spec.maxK,
    source: spec.source,
    cite: spec.cite || null,
  }];
}

export function mountRenderedFilm(host, spec) {
  const id = spec.id;
  const films = filmList(spec);
  const mq = typeof matchMedia === 'function' ? matchMedia(FILM_PORTRAIT_MQ) : null;
  let mode = 'live';
  let filmIndex = 0;
  let played = false;
  let resume = false;
  let dead = false;
  let cutToken = 0;
  const frameCache = new Map();
  const frameTasks = new Map();

  const liveInput = el('input', {
    type: 'radio', name: `${id}-picture`, id: `${id}-picture-live`, value: 'live', checked: true,
  });
  const filmInput = el('input', {
    type: 'radio', name: `${id}-picture`, id: `${id}-picture-rendered`, value: 'rendered',
  });
  const liveLabel = el('label', { class: 'chip', for: `${id}-picture-live` }, liveInput, 'Live');
  const filmLabel = el('label', { class: 'chip', for: `${id}-picture-rendered` }, filmInput, 'Rendered film');
  const row = el('div', { class: 'film-mode-row' }, liveLabel, filmLabel);
  const field = el('fieldset', { class: 'film-mode', id: `${id}-film-mode` },
    el('legend', null, 'Picture'),
    row);

  const pickLabels = [];
  const pickInputs = [];
  let pick = null;
  if (films.length > 1) {
    films.forEach((film, i) => {
      const input = el('input', {
        type: 'radio',
        name: `${id}-film`,
        id: `${id}-film-${film.id}`,
        value: film.id,
        checked: i === 0,
      });
      const label = el('label', { class: 'chip', for: `${id}-film-${film.id}` }, input, film.label);
      pickInputs.push(input);
      pickLabels.push(label);
      input.addEventListener('change', () => { if (input.checked) selectFilm(i); });
    });
    pick = el('fieldset', { class: 'film-mode film-pick', id: `${id}-film-pick`, hidden: true },
      el('legend', null, 'Film'),
      el('div', { class: 'film-mode-row' }, ...pickLabels));
  }

  const first = films[0];
  const portrait = el('source', {
    media: FILM_PORTRAIT_MQ,
    src: first.portrait,
    type: 'video/mp4',
  });
  const landscape = el('source', {
    src: first.landscape,
    type: 'video/mp4',
  });
  const video = el('video', {
    id: `${id}-rendered-video`,
    muted: true,
    controls: true,
    playsinline: true,
    preload: 'none',
  });
  video.muted = true;
  video.defaultMuted = true;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'none';
  video.autoplay = false;
  video.append(portrait, landscape);

  const credit = el('p', { class: 'source-tag', id: `${id}-rendered-credit` });

  const figure = el('figure', { class: 'rendered-film', id: `${id}-rendered`, hidden: true }, video, credit);
  const root = el('div', { id: `${id}-rendered-switch` }, field, pick, figure);
  if (spec.before && spec.before.parentElement) spec.before.parentElement.insertBefore(root, spec.before);
  else if (host) host.append(root);

  function currentFilm() {
    return films[filmIndex];
  }

  function paintCredit(film) {
    credit.replaceChildren();
    if (film.kind === 'page') return;
    credit.append('Rendered with Manim. ');
    if (film.cite && film.cite.text) {
      const href = typeof film.cite.url === 'string' ? film.cite.url : '';
      if (href) {
        credit.append(el('a', {
          href,
          id: `${id}-rendered-cite`,
          target: '_blank',
          rel: 'noopener noreferrer',
        }, film.cite.text), '.');
      } else {
        credit.append(`${film.cite.text}.`);
      }
      if (film.cite.note) credit.append(` ${film.cite.note}`);
      return;
    }
    const source = film.source || spec.source;
    const cite = citationText(source);
    const url = source && typeof source.url === 'string' ? source.url : '';
    if (cite && url) {
      credit.append(el('a', {
        href: url,
        id: `${id}-rendered-cite`,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, cite), '.');
    } else if (cite) {
      credit.append(`${cite}.`);
    }
  }

  function syncFilmLabels() {
    pickLabels.forEach((label, i) => {
      label.classList.toggle('is-active', i === filmIndex);
      if (pickInputs[i]) pickInputs[i].checked = i === filmIndex;
    });
  }

  function cutName() {
    return mq && mq.matches ? 'portrait' : 'landscape';
  }

  function notifyFilm() {
    if (typeof spec.onFilm === 'function') spec.onFilm(currentFilm(), mode);
  }

  function showFigure() {
    const rendered = mode === 'rendered';
    figure.hidden = !rendered || currentFilm().kind === 'page';
    if (pick) pick.hidden = !rendered;
  }

  function applyCut({ force = false, keepPlaying = true } = {}) {
    const film = currentFilm();
    if (!film || film.kind === 'page') return;
    const portraitCut = cutName() === 'portrait';
    const next = portraitCut ? 'portrait' : 'landscape';
    const want = portraitCut ? film.portrait : film.landscape;
    const filmChanged = !!video.dataset.film && video.dataset.film !== film.id;
    // The poster follows the window. A <source media> is chosen once, when the
    // element first picks a file, and Play keeps that pick. Point src at the
    // cut for this window when the pick is already wrong. A different film
    // always retargets, and it waits for Play.
    const changed = force || filmChanged || (!!video.dataset.cut && video.dataset.cut !== next);
    video.poster = portraitCut ? film.posterPort : film.posterLand;
    video.dataset.cut = next;
    video.dataset.film = film.id;
    portrait.src = film.portrait;
    landscape.src = film.landscape;
    if (!changed) return;
    // The first pick can stay on <source>. A later pick names the file here.
    if (!force && !video.currentSrc) return;
    if (video.currentSrc && video.currentSrc.endsWith(want)) return;
    const buffered = video.readyState > 0;
    const carry = keepPlaying && !filmChanged;
    const t = carry ? video.currentTime : 0;
    const wasPlaying = carry && buffered && mode === 'rendered' && !video.paused && !video.ended;
    const token = ++cutToken;
    if (!buffered || !carry) {
      // Name the file. preload none, so this waits for Play.
      video.preload = 'none';
      try { video.pause(); } catch { /* not playing */ }
      video.src = want;
      return;
    }
    const onMeta = () => {
      video.removeEventListener('loadedmetadata', onMeta);
      if (token !== cutToken || dead || mode !== 'rendered') return;
      const go = () => {
        if (!wasPlaying || token !== cutToken || dead || mode !== 'rendered') return;
        const pending = video.play();
        if (pending && typeof pending.catch === 'function') pending.catch(() => {});
      };
      if (t > 0.02 && Number.isFinite(video.duration) && t < video.duration) {
        const onSeek = () => { video.removeEventListener('seeked', onSeek); go(); };
        video.addEventListener('seeked', onSeek);
        try { video.currentTime = t; } catch { go(); }
      } else go();
    };
    video.addEventListener('loadedmetadata', onMeta);
    // preload none would name the file and then not fetch it. This file was
    // already playing, so the other cut has to arrive.
    video.preload = 'auto';
    video.src = want;
  }

  function selectFilm(index) {
    if (dead || index === filmIndex || index < 0 || index >= films.length) return;
    filmIndex = index;
    played = false;
    resume = false;
    syncFilmLabels();
    paintCredit(currentFilm());
    showFigure();
    if (currentFilm().kind === 'page') {
      try { video.pause(); } catch { /* not playing */ }
    } else if (mode === 'rendered') {
      applyCut({ force: true, keepPlaying: false });
      loadFrames();
    }
    notifyFilm();
  }

  function loadFrames() {
    const film = currentFilm();
    const key = film.id;
    if (frameCache.has(key)) return Promise.resolve(frameCache.get(key));
    if (frameTasks.has(key)) return frameTasks.get(key);
    if (!film.framesUrl) {
      const empty = [];
      frameCache.set(key, empty);
      return Promise.resolve(empty);
    }
    const task = fetch(film.framesUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`frame log ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const rows = parseFrameLog(text, { maxK: film.maxK });
        frameCache.set(key, rows);
        return rows;
      })
      .catch(() => {
        const empty = [];
        frameCache.set(key, empty);
        return empty;
      });
    frameTasks.set(key, task);
    task.finally(() => { frameTasks.delete(key); });
    return task;
  }

  function onVisible() {
    if (dead) return;
    if (typeof document !== 'undefined' && document.hidden) {
      if (mode === 'rendered' && !video.paused && !video.ended) {
        resume = true;
        video.pause();
      }
      return;
    }
    if (resume && mode === 'rendered') {
      resume = false;
      const pending = video.play();
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    }
  }

  function setMode(next) {
    if (dead) return;
    mode = next === 'rendered' ? 'rendered' : 'live';
    const rendered = mode === 'rendered';
    liveInput.checked = !rendered;
    filmInput.checked = rendered;
    liveLabel.classList.toggle('is-active', !rendered);
    filmLabel.classList.toggle('is-active', rendered);
    showFigure();
    if (rendered && currentFilm().kind !== 'page') {
      applyCut();
      loadFrames();
    } else if (rendered) {
      resume = false;
      try { video.pause(); } catch { /* page film */ }
    } else {
      resume = false;
      const watched = played && video.currentTime > 0.02;
      const t = video.currentTime;
      video.pause();
      if (watched && typeof spec.onSeed === 'function') {
        loadFrames().then((rows) => {
          if (dead || mode !== 'live') return;
          const row = frameAt(rows, t);
          if (!row) return;
          const seed = { re: row.re, im: row.im, t: row.t };
          if (Number.isFinite(row.width)) seed.width = row.width;
          spec.onSeed(seed);
        });
      }
    }
    if (typeof spec.onMode === 'function') spec.onMode(mode);
    notifyFilm();
  }

  liveInput.addEventListener('change', () => { if (liveInput.checked) setMode('live'); });
  filmInput.addEventListener('change', () => { if (filmInput.checked) setMode('rendered'); });
  video.addEventListener('play', () => { played = true; });
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', onVisible);
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', applyCut);
  paintCredit(currentFilm());
  syncFilmLabels();
  applyCut();
  liveLabel.classList.add('is-active');
  notifyFilm();

  return {
    root,
    video,
    destroy() {
      dead = true;
      resume = false;
      mode = 'live';
      video.pause();
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', onVisible);
      }
      if (mq && mq.removeEventListener) mq.removeEventListener('change', applyCut);
      video.removeAttribute('src');
      portrait.remove();
      landscape.remove();
      try { video.load(); } catch { /* already gone */ }
    },
  };
}
