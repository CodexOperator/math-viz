// js/core/listen.js
// The media layer: the generated manifest, a video panel and a Listen control. Both pieces are optional and absent
// until the files exist; a station must work fully without them. No static import (the one load is a dynamic import of the
// generated manifest, inside readManifest), no CSS injection, nothing runs at import (no DOM access, no timer, no listener, no fetch),
// so the module imports cleanly in Node.
//
//   loadManifest()                     Promise<Manifest>, one cached, normalised promise; an absent or malformed manifest gives an
//                                      empty manifest and one console.warn
//   videoFor(manifest, id)             pure: the video entry or null
//   clipsFor(manifest, station)        pure: a copy of the station's clips ([] when none)
//   videoPanel(container, videoId, opts)     Promise<section#video-<id> | null>: built only when the manifest has the video
//   listenControl(container, station, opts)  Promise<Listen | null>: built only when clips exist for the station (or the segment)
//   resetManifestCache()               tests only
//
// Listen = { el, audio, clips, play(segmentId = null), stop(), destroy(), playing }. State is on the button: aria-pressed (the
// accessible name never changes), data-state = idle | loading | playing | error, data-clip, and a visible mark (loading, playing, error).
// Events on the button, bubbling: listen:play { station, segment, index, count } and listen:stop { station, reason, index } with
// reason in ended | stopped | preempted | error | destroyed.

const VIDEO_ERROR_TEXT = 'The video did not load. Everything else on this page works without it.';
const LISTEN_ERROR_TEXT = 'The audio did not load. Press Listen to try again, or read the page instead.';
const LISTEN_REFUSED_TEXT = 'Your browser would not start the sound. Press Listen again.';
const GLYPHS = { idle: '', loading: '…', playing: '■', error: '!' };

let manifestPromise = null;     // the cached promise
let stopActive = null;          // the halt function of the Listen that is playing: one voice at a time

// ---------- private helpers ----------

const emptyManifest = () => ({ VIDEOS: [], SITE_AUDIO: {} });
const isRecord = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonEmpty = (x) => typeof x === 'string' && x !== '';
const text = (x, fallback) => (typeof x === 'string' ? x : fallback);
const own = (obj, key) => (isRecord(obj) && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined);
const keyOf = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '-');

function assertElement(c) {
  if (!c || c.nodeType !== 1 || !c.ownerDocument) throw new TypeError('listen.js: container must be an Element');
}

function mediaType(src) {
  if (/\.mp4(?:[?#]|$)/i.test(src)) return 'video/mp4';
  if (/\.webm(?:[?#]|$)/i.test(src)) return 'video/webm';
  return '';
}

// ---------- the manifest ----------

// Not an async function: callers (and the tests) rely on getting the same promise object every time.
export function loadManifest() {
  if (manifestPromise === null) manifestPromise = readManifest();
  return manifestPromise;
}

async function readManifest() {                 // never rejects
  try {
    const mod = await import('../../media/manifest.js');
    return normalise(mod);
  } catch (err) {
    console.warn('[mv] media/manifest.js could not be loaded: ' + (err && err.message ? err.message : String(err)) + '. Videos and narration stay off.');
    return emptyManifest();
  }
}

// Drops what a generated (or hand-edited) file got wrong, fills defaults, counts what it dropped. Never throws on shape problems.
function normalise(mod) {
  let dropped = 0;
  const out = emptyManifest();

  const videos = mod ? mod.VIDEOS : undefined;
  if (videos !== undefined && !Array.isArray(videos)) dropped++;
  for (const v of Array.isArray(videos) ? videos : []) {
    if (!isRecord(v) || !nonEmpty(v.id) || !nonEmpty(v.src)) { dropped++; continue; }
    if (out.VIDEOS.some((x) => x.id === v.id)) { dropped++; continue; }         // a duplicate id: the first wins
    out.VIDEOS.push({
      id: v.id,
      title: nonEmpty(v.title) ? v.title : v.id,
      summary: text(v.summary, ''),
      station: nonEmpty(v.station) ? v.station : null,
      src: v.src,
      captions: nonEmpty(v.captions) ? v.captions : null,
      seconds: Number.isFinite(v.seconds) && v.seconds > 0 ? Math.round(v.seconds) : 0,
      narrated: v.narrated === true,
      music: v.music === true,
    });
  }

  const site = mod ? mod.SITE_AUDIO : undefined;
  if (site !== undefined && !isRecord(site)) dropped++;
  for (const key of Object.keys(isRecord(site) ? site : {})) {
    if (key === '__proto__') { dropped++; continue; }
    const entry = site[key];
    if (!isRecord(entry)) { dropped++; continue; }
    if (entry.clips !== undefined && !Array.isArray(entry.clips)) dropped++;
    const clips = [];
    for (const c of Array.isArray(entry.clips) ? entry.clips : []) {
      if (!isRecord(c) || !nonEmpty(c.id) || !nonEmpty(c.src)) { dropped++; continue; }
      clips.push({ id: c.id, text: text(c.text, ''), src: c.src });
    }
    out.SITE_AUDIO[key] = { title: nonEmpty(entry.title) ? entry.title : key, clips };
  }

  if (dropped > 0) console.warn('[mv] media/manifest.js: ignored ' + dropped + (dropped === 1 ? ' malformed entry.' : ' malformed entries.'));
  return out;
}

export function resetManifestCache() {
  manifestPromise = null;
}

// Pure and lenient: they look up, they do not validate, and they tolerate garbage.
export function videoFor(manifest, id) {
  const list = own(manifest, 'VIDEOS');
  if (!Array.isArray(list)) return null;
  for (const v of list) if (isRecord(v) && v.id === id) return v;
  return null;
}

export function clipsFor(manifest, station) {
  const entry = own(own(manifest, 'SITE_AUDIO'), station);
  return isRecord(entry) && Array.isArray(entry.clips) ? entry.clips.slice() : [];
}

// ---------- the video panel ----------

export async function videoPanel(container, videoId, { title = 'Watch (2–3 min)', manifest = null } = {}) {
  assertElement(container);
  if (!nonEmpty(videoId)) return null;
  const m = isRecord(manifest) ? manifest : await loadManifest();
  const v = videoFor(m, videoId);
  if (!v || !nonEmpty(v.src)) return null;

  const panelId = 'video-' + keyOf(videoId);
  for (const child of container.children) if (child.id === panelId) return child;      // idempotent

  const doc = container.ownerDocument;
  const headline = [title, text(v.title, '')].filter(nonEmpty).join(': ') || 'Video';
  const voice = v.narrated === true
    ? (nonEmpty(v.captions) ? 'With voice and captions' : 'With voice')
    : (nonEmpty(v.captions) ? 'Silent, with captions' : 'Silent');
  const seconds = Number.isFinite(v.seconds) && v.seconds > 0 ? Math.round(v.seconds) + ' s' : '';
  const summary = [text(v.summary, ''), seconds, voice].filter(nonEmpty).join(' · ');

  const section = doc.createElement('section');
  section.id = panelId;
  section.className = 'panel video-panel';
  section.setAttribute('data-video', videoId);
  section.setAttribute('data-tone', 'accent');
  section.setAttribute('data-narrated', String(v.narrated === true));
  section.setAttribute('data-state', 'loading');
  section.setAttribute('aria-labelledby', panelId + '-title');

  const h2 = doc.createElement('h2');
  h2.id = panelId + '-title';
  h2.className = 'panel-title';
  h2.textContent = headline;

  const sum = doc.createElement('p');
  sum.id = panelId + '-summary';
  sum.className = 'muted';
  sum.textContent = summary;

  const video = doc.createElement('video');
  video.id = panelId + '-player';
  video.setAttribute('controls', '');
  video.setAttribute('playsinline', '');
  video.playsInline = true;
  video.setAttribute('preload', 'metadata');
  video.setAttribute('aria-describedby', panelId + '-summary');
  video.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;border-radius:var(--radius-sm);background:var(--surface-2)';

  const source = doc.createElement('source');
  source.setAttribute('src', v.src);
  const type = mediaType(v.src);
  if (type) source.setAttribute('type', type);
  video.appendChild(source);

  if (nonEmpty(v.captions)) {
    const track = doc.createElement('track');
    track.setAttribute('kind', 'captions');
    track.setAttribute('src', v.captions);
    track.setAttribute('srclang', 'en');
    track.setAttribute('label', 'English');
    track.setAttribute('default', '');
    video.appendChild(track);
  }
  video.appendChild(doc.createTextNode('Your browser cannot play this video.'));

  const errorEl = doc.createElement('p');
  errorEl.id = panelId + '-error';
  errorEl.className = 'muted video-error';
  errorEl.setAttribute('role', 'alert');
  errorEl.hidden = true;
  errorEl.textContent = VIDEO_ERROR_TEXT;

  section.append(h2, sum, video, errorEl);

  // Listeners on elements this call created, so there is nothing to remove.
  const onFail = () => { errorEl.hidden = false; video.style.display = 'none'; section.setAttribute('data-state', 'error'); };
  const onReady = () => { errorEl.hidden = true; video.style.display = 'block'; section.setAttribute('data-state', 'ready'); };
  source.addEventListener('error', onFail);
  video.addEventListener('error', onFail);
  video.addEventListener('loadedmetadata', onReady);

  container.appendChild(section);
  return section;
}

// ---------- the Listen control ----------

export async function listenControl(container, station, { id = `${station}-listen`, segment = null, label = 'Listen', manifest = null } = {}) {
  assertElement(container);
  if (!nonEmpty(station)) return null;
  const m = isRecord(manifest) ? manifest : await loadManifest();
  const usable = clipsFor(m, station)
    .filter((c) => isRecord(c) && nonEmpty(c.id) && nonEmpty(c.src))
    .map((c) => Object.freeze({ id: c.id, text: text(c.text, ''), src: c.src }));
  const clips = segment === null ? usable : usable.filter((c) => c.id === segment);
  if (clips.length === 0) return null;

  const ctlId = nonEmpty(id) ? id : station + '-listen';
  const name = nonEmpty(label) ? label : 'Listen';
  const single = segment !== null;
  const doc = container.ownerDocument;

  const button = doc.createElement('button');
  button.type = 'button';
  button.id = ctlId;
  button.className = 'btn btn-quiet listen';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('data-state', 'idle');
  button.setAttribute('data-station', station);
  const mark = doc.createElement('span');
  mark.className = 'listen-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.hidden = true;
  button.append(doc.createTextNode(name), mark);

  const audio = doc.createElement('audio');
  audio.id = ctlId + '-audio';
  audio.setAttribute('preload', 'none');
  container.append(button, audio);

  let state = 'idle';
  let queue = [];
  let index = 0;
  let run = 0;                   // a token: every pending play() promise from an earlier run is stale
  let destroyed = false;
  let caption = null;
  let errorEl = null;

  const active = () => state === 'loading' || state === 'playing';

  function setState(next) {
    state = next;
    button.setAttribute('data-state', next);
    button.setAttribute('aria-pressed', active() ? 'true' : 'false');
    const glyph = GLYPHS[next];
    mark.textContent = glyph;
    mark.hidden = glyph === '';
    if (active()) button.setAttribute('data-clip', String(index));
    else button.removeAttribute('data-clip');
  }

  function dispatch(type, detail) {
    try { button.dispatchEvent(new CustomEvent(type, { bubbles: true, detail })); } catch (_) { /* no CustomEvent: nobody listens */ }
  }

  function showCaption(clip, i) {
    if (single) return;
    if (!caption) {
      caption = doc.createElement('p');
      caption.id = ctlId + '-caption';
      caption.className = 'listen-caption muted';
      audio.after(caption);
    }
    caption.textContent = queue.length > 1 ? (i + 1) + ' of ' + queue.length + ' · ' + clip.text : clip.text;
    caption.hidden = false;
  }

  function hideCaption() {
    if (caption) { caption.hidden = true; caption.textContent = ''; }
  }

  function clearError() {
    if (errorEl) { errorEl.remove(); errorEl = null; }
  }

  function showError(message) {
    clearError();
    errorEl = doc.createElement('p');
    errorEl.id = ctlId + '-error';
    errorEl.className = 'listen-error';
    errorEl.setAttribute('role', 'alert');
    errorEl.textContent = message;
    audio.after(errorEl);
  }

  // The one way out of an active state.
  function settle(next, reason) {
    const was = active();
    const at = index;
    run += 1;                                             // every pending play() promise is now stale
    try { audio.pause(); } catch (_) { /* nothing to pause */ }
    audio.removeAttribute('src');
    try { audio.load(); } catch (_) { /* releases the network where load() exists */ }
    if (stopActive === halt) stopActive = null;
    hideCaption();
    setState(next);
    if (was) dispatch('listen:stop', { station, reason, index: at });
  }

  function halt(reason) { settle('idle', reason); }

  function started() {
    setState('playing');
    dispatch('listen:play', { station, segment: queue[index].id, index, count: queue.length });
  }

  function fail(err) {
    settle('error', 'error');
    showError(err && err.name === 'NotAllowedError' ? LISTEN_REFUSED_TEXT : LISTEN_ERROR_TEXT);
  }

  function startClip(i, token) {
    index = i;
    const clip = queue[i];
    setState('loading');
    showCaption(clip, i);
    audio.setAttribute('src', clip.src);
    let p;
    try { p = audio.play(); } catch (err) { if (token === run) fail(err); return Promise.resolve(false); }
    if (!p || typeof p.then !== 'function') { if (token === run) started(); return Promise.resolve(true); }     // very old browsers
    return p.then(
      () => { if (token !== run) return false; started(); return true; },
      (err) => { if (token !== run) return false; fail(err); return false; }           // a stale AbortError is ignored
    );
  }

  function play(segmentId = null) {
    if (destroyed) return Promise.resolve(false);
    const q = segmentId === null ? clips : clips.filter((c) => c.id === segmentId);
    if (q.length === 0) return Promise.resolve(false);
    if (stopActive !== null && stopActive !== halt) stopActive('preempted');          // one voice at a time
    if (active()) settle('idle', 'stopped');                                          // restarting
    clearError();
    queue = q;
    run += 1;
    stopActive = halt;
    return startClip(0, run);
  }

  function stop() {
    if (active()) settle('idle', 'stopped');
    else if (state === 'error') { clearError(); setState('idle'); }
  }

  function onClick() {
    if (active()) settle('idle', 'stopped');
    else play();                                          // idle or error: (re)start
  }

  function onEnded() {
    if (!active()) return;
    if (index + 1 < queue.length) { run += 1; startClip(index + 1, run); }            // no gap, no tap: same element, new src
    else settle('idle', 'ended');
  }

  function onAudioError() {
    if (!active() || destroyed) return;
    fail(audio.error);
  }

  function onPause() {                                    // a hardware or OS pause; the natural end also fires pause, hence audio.ended
    if (audio.ended || state !== 'playing') return;
    settle('idle', 'stopped');
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    settle('idle', 'destroyed');                          // fires listen:stop once, only if it was active
    button.removeEventListener('click', onClick);
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('error', onAudioError);
    audio.removeEventListener('pause', onPause);
    button.remove();
    audio.remove();
    if (caption) caption.remove();
    clearError();
  }

  button.addEventListener('click', onClick);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', onAudioError);
  audio.addEventListener('pause', onPause);

  return {
    el: button,
    audio,
    clips: Object.freeze(clips.slice()),
    play,
    stop,
    destroy,
    get playing() { return active(); },
  };
}
