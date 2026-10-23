// A pre-rendered Manim film next to the live loop.
//
// Live is the station's JS picture. Rendered plays one mp4. The portrait cut
// is the source whose media query matches a window under 600px. The landscape
// cut is the other source. preload is none, so the file waits for Play. The
// poster is the still, and it matches the cut. There is no autoplay. The
// video is muted, has controls, and plays inline.
//
// One clock. A hidden tab pauses the video. If it was playing, it continues
// when the tab is visible again, from the same frame. Unmount pauses it and
// drops the listener. Switching back to Live pauses the video. If it had
// moved, the frame log gives the c on that frame so the live picture can open there.

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

export function parseFrameLog(text) {
  const frames = [];
  for (const line of String(text).split('\n')) {
    const s = line.trim();
    if (!s) continue;
    let row;
    try { row = JSON.parse(s); } catch { continue; }
    if (!row || !Number.isFinite(row.t) || !Number.isFinite(row.re) || !Number.isFinite(row.im)) continue;
    frames.push({ t: row.t, re: row.re, im: row.im, k: row.k });
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

export function mountRenderedFilm(host, spec) {
  const id = spec.id;
  const mq = typeof matchMedia === 'function' ? matchMedia(FILM_PORTRAIT_MQ) : null;
  let mode = 'live';
  let played = false;
  let resume = false;
  let frames = null;
  let framesTask = null;
  let dead = false;

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

  const portrait = el('source', {
    media: FILM_PORTRAIT_MQ,
    src: spec.portrait,
    type: 'video/mp4',
  });
  const landscape = el('source', {
    src: spec.landscape,
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
  const cite = citationText(spec.source);
  const url = spec.source && typeof spec.source.url === 'string' ? spec.source.url : '';
  credit.append('Rendered with Manim. ');
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

  const figure = el('figure', { class: 'rendered-film', id: `${id}-rendered`, hidden: true }, video, credit);
  const root = el('div', { id: `${id}-rendered-switch` }, field, figure);
  if (spec.before && spec.before.parentElement) spec.before.parentElement.insertBefore(root, spec.before);
  else if (host) host.append(root);

  function cutName() {
    return mq && mq.matches ? 'portrait' : 'landscape';
  }

  function applyCut() {
    const portraitCut = cutName() === 'portrait';
    const next = portraitCut ? 'portrait' : 'landscape';
    const want = portraitCut ? spec.portrait : spec.landscape;
    // The poster follows the window. A <source media> is chosen once, when the
    // element first picks a file, and Play keeps that pick. Point src at the
    // cut for this window when the pick is already wrong.
    const changed = !!video.dataset.cut && video.dataset.cut !== next;
    video.poster = portraitCut ? spec.posterPort : spec.posterLand;
    video.dataset.cut = next;
    if (!changed || !video.currentSrc || video.currentSrc.endsWith(want)) return;
    const buffered = video.readyState > 0;
    const t = video.currentTime;
    const wasPlaying = buffered && mode === 'rendered' && !video.paused && !video.ended;
    if (!buffered) {
      // Name the file. preload none, so this waits for Play.
      video.preload = 'none';
      video.src = want;
      return;
    }
    const onMeta = () => {
      video.removeEventListener('loadedmetadata', onMeta);
      if (dead || mode !== 'rendered') return;
      const go = () => {
        if (!wasPlaying || dead || mode !== 'rendered') return;
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

  function loadFrames() {
    if (frames) return Promise.resolve(frames);
    if (framesTask) return framesTask;
    if (!spec.framesUrl) return Promise.resolve([]);
    framesTask = fetch(spec.framesUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`frame log ${res.status}`);
        return res.text();
      })
      .then((text) => {
        frames = parseFrameLog(text);
        return frames;
      })
      .catch(() => {
        frames = [];
        return frames;
      });
    return framesTask;
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
    figure.hidden = !rendered;
    if (rendered) {
      applyCut();
      loadFrames();
    } else {
      resume = false;
      const watched = played && video.currentTime > 0.02;
      const t = video.currentTime;
      video.pause();
      if (watched && typeof spec.onSeed === 'function') {
        loadFrames().then((rows) => {
          if (dead || mode !== 'live') return;
          const row = frameAt(rows, t);
          if (row) spec.onSeed({ re: row.re, im: row.im, t: row.t });
        });
      }
    }
    if (typeof spec.onMode === 'function') spec.onMode(mode);
  }

  liveInput.addEventListener('change', () => { if (liveInput.checked) setMode('live'); });
  filmInput.addEventListener('change', () => { if (filmInput.checked) setMode('rendered'); });
  video.addEventListener('play', () => { played = true; });
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', onVisible);
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', applyCut);
  applyCut();
  liveLabel.classList.add('is-active');

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
