// Vendored from manim-hyperframes-matrix trunk v0.4.5, cell M0.2j (shared/hostclock.js).
// Do not edit. The site seeks window.__hostclock and pushes live numbers through
// window.__hostclock.setParams. The page answers with window.__onParams.
// hostclock.js: HOST-CLOCK page mode for a HyperFrames page embedded in a site that owns the play clock (cell M0.2j).
// Include it AFTER the page's own script (hfkit.page(..., host_clock=True) or hfkit.with_host_clock(html)). No play
// bar, no autoplay, no wall clock: the HOST seeks window.__tl, and the page never animates on its own.
//   * render mode (window.__HF_RENDER / html[data-render], set by render_hf.js): does NOTHING, like M0.2i, so the same
//     page renders byte-identically.
//   * opens PAUSED on the END frame (a finished picture), or ?t=<s>. The page's own progress line (.bar) is hidden.
//   * TICKER: GSAP's ticker is put to sleep whenever no animation is active. Any seek re-renders synchronously and wakes
//     the ticker; one listener sends it back to sleep on the next frame, so a paused or idle page asks for no frames.
//     Hosts can also seek through window.__hostclock.seek(t), which sleeps the ticker immediately.
//   * window.__hostclock = { duration, beats[], stops[], reduced, seek(t), progress(p), step(), state(), readouts(),
//       setParams(params) }: setParams deep-freezes a plain-JSON copy and calls window.__onParams(params, t), looked
//       up at call time. The page may update the DOM or replace tweens in __tl; it keeps the duration. hostclock then
//       pauses __tl and calls tl.render(t, false, true). No seek. The ticker is asleep before setParams returns, and
//       the call schedules no frame and no timer. The return is the state plus ok:true and params, or ok:false and
//       error ('no hook' | 'bad params' | '__onParams threw' | 'called from inside the hook'). Plain JSON only:
//       depth 4, 64 keys per level, 256 values, 4096 characters, finite numbers, and no __proto__/constructor/prototype.
//       beats = window.__beats if the page set it, else the timeline labels (tl.addLabel), in seconds;
//       stops = the finished frames a reduced-motion reader steps through (just before each beat, then the end;
//               a page with no beats steps in quarters);
//       reduced = prefers-reduced-motion: reduce (live); a host should then call step() instead of animating;
//       readouts() = the text of every shown [data-readout] element, so the host can copy the numbers into its own
//       page text (legible on a phone at the site's type size; read by screen readers).
//   * postMessage {hf: 'seek', t} | {hf: 'progress', p} | {hf: 'step'} | {hf: 'state'} | {hf: 'params', params}; the page
//     answers the sender with {hf: 'state', t, duration, progress, atEnd, reduced, beats, stops, readouts}. A params
//     answer also carries ok and params, or ok:false and error. 0.4.1: only SAME-ORIGIN messages are
//     accepted by default; a cross-origin host must be listed: <html data-hostclock-origins="https://site.example">
//     (space-separated; '*' = any origin, an explicit opt-in: the page then answers anyone with its readouts()).
//   * FIT without a bar: shared/fit.js, THE rule of every mode (smaller than 1280x720, or ?fit=1 / <html data-fit>;
//     ?fit=0 off). Scaled text shrinks with the page: a 1280-px design shown
//     390 px wide is x0.30, so the 20 px floor becomes ~6 px. Mirror readouts() into host text for phones, and QA the
//     page at the target width (render_hf.js --target-width 390; see M0.6h).
//   * ?theme=light|dark|auto sets html[data-theme] (house.css light tokens).
(function () {
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function init() {
    if (window.__HF_RENDER || document.documentElement.hasAttribute('data-render')) return;
    const tl = window.__tl; if (!tl || window.__hostclock) return;
    const de = document.documentElement, D = tl.duration(), q = new URLSearchParams(location.search), th = q.get('theme');
    if (th === 'light' || th === 'dark' || th === 'auto') de.setAttribute('data-theme', th);
    de.setAttribute('data-hostclock', '');
    const st = document.createElement('style');
    st.textContent = '#root .bar{display:none}';
    document.head.appendChild(st);
    const beats = (Array.isArray(window.__beats) ? window.__beats : Object.values(tl.labels || {})).map(Number)
      .filter(x => isFinite(x) && x >= 0 && x <= D).sort((a, b) => a - b);
    const inner = beats.filter(x => x > 0.1 && x < D - 0.1), qs = inner.length ? inner : [0.25, 0.5, 0.75].map(f => f * D);   // no beats: quarters
    const stops = [...new Set(qs.map(x => Math.round(Math.max(0, x - 0.05) * 1000) / 1000).concat([D]))];
    const idle = () => !gsap.globalTimeline.getChildren(false, true, true).some(a => a.isActive());
    const sleep = () => { if (idle()) gsap.ticker.sleep(); };
    gsap.ticker.add(sleep);                                   // runs only while awake: one frame after any wake-up
    const clamp = t => Math.min(D, Math.max(0, +t || 0));
    const readouts = () => [...document.querySelectorAll('#root [data-readout]')].filter(e => {
      for (let x = e; x && x.id !== 'root'; x = x.parentElement) { const s = getComputedStyle(x);
        if (parseFloat(s.opacity) < 0.5 || s.visibility === 'hidden' || s.display === 'none') return false; } return !!e.textContent.trim(); })
      .map(e => e.textContent.trim());
    const state = () => ({ t: tl.time(), duration: D, progress: tl.progress(), atEnd: tl.progress() >= 1 - 1e-6, reduced: reduced(),
      beats: beats.slice(), stops: stops.slice(), readouts: readouts() });
    const seek = t => { tl.pause(); tl.seek(clamp(t), false); sleep(); return state(); };
    // 0.4.5: a plain-JSON copy. Depth 4 counts the root. 64 keys at one object or array. 256 values in the whole
    // tree. 4096 characters across keys and strings. Finite numbers. The three prototype names are refused.
    const banned = k => k === '__proto__' || k === 'constructor' || k === 'prototype';
    const copyParams = (v, depth, acc) => {
      if (acc.n >= 256) throw 0;
      if (v === null) { acc.n++; return null; }
      const ty = typeof v;
      if (ty === 'boolean') { acc.n++; return v; }
      if (ty === 'number') { if (!isFinite(v)) throw 0; acc.n++; return v; }
      if (ty === 'string') { acc.chars += v.length; if (acc.chars > 4096) throw 0; acc.n++; return v; }
      if (ty !== 'object' || depth > 4) throw 0;
      acc.n++;
      if (Array.isArray(v)) {
        if (v.length > 64) throw 0;
        const out = [];
        for (let i = 0; i < v.length; i++) out.push(copyParams(v[i], depth + 1, acc));
        return out;
      }
      // The host's object lives in the parent realm. Its prototype is not this
      // window's Object.prototype, so a realm check would refuse every call.
      // [object Object] is a plain JSON object in either realm. Dates and maps are not.
      if (Object.prototype.toString.call(v) !== '[object Object]') throw 0;
      const keys = Object.keys(v);
      if (keys.length > 64) throw 0;
      const out = {};
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (banned(k)) throw 0;
        acc.chars += k.length;
        if (acc.chars > 4096) throw 0;
        out[k] = copyParams(v[k], depth + 1, acc);
      }
      return out;
    };
    const freeze = v => {
      if (!v || typeof v !== 'object' || Object.isFrozen(v)) return v;
      Object.freeze(v);
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) freeze(v[i]); }
      else Object.keys(v).forEach(k => freeze(v[k]));
      return v;
    };
    let inHook = false, held = null;
    const failed = error => Object.assign(state(), { ok: false, error, params: held });
    const setParams = params => {
      if (inHook) return failed('called from inside the hook');
      if (typeof window.__onParams !== 'function') return failed('no hook');
      let copy;
      try { copy = freeze(copyParams(params, 1, { n: 0, chars: 0 })); }
      catch (e) { return failed('bad params'); }
      const t = tl.time();
      inHook = true;
      try { window.__onParams(copy, t); }
      catch (e) { inHook = false; return failed('__onParams threw'); }
      inHook = false;
      held = copy;
      tl.pause();
      tl.render(t, false, true);                               // no seek: the time stays, the frame is forced
      sleep();
      return Object.assign(state(), { ok: true, params: copy });
    };
    const api = { duration: D, beats: beats.slice(), stops: stops.slice(), get reduced() { return reduced(); }, seek,
      progress: p => seek(D * Math.min(1, Math.max(0, +p || 0))),
      step: () => { const t = tl.time(), end = tl.progress() >= 1 - 1e-6; const nx = end ? stops[0] : stops.find(s => s > t + 1e-3);
        return seek(nx === undefined ? D : nx); }, state, readouts, setParams };
    Object.defineProperty(window, '__hostclock', { value: Object.freeze(api), writable: false, configurable: false });
    // 0.4.2: listed origins are normalised the way the browser reports e.origin (lowercase, no default port, no '/')
    const norm = o => { if (o === '*') return o; try { const u = new URL(o); return /^https?:$/.test(u.protocol) ? u.origin : null; } catch (e) { return null; } };
    const allow = (de.getAttribute('data-hostclock-origins') || '').split(/\s+/).filter(Boolean).map(norm).filter(Boolean);
    const trusted = o => (o === location.origin && o !== 'null') || allow.includes('*') || allow.includes(o);
    addEventListener('message', e => { const m = e.data; if (!m || typeof m !== 'object' || typeof m.hf !== 'string') return;
      if (!trusted(e.origin)) return;                                 // 0.4.1: same origin only, unless the page opts in
      let s; if (m.hf === 'seek') s = seek(m.t); else if (m.hf === 'progress') s = api.progress(m.p); else if (m.hf === 'step') s = api.step();
      else if (m.hf === 'state') s = state(); else if (m.hf === 'params') s = setParams(m.params); else return;
      if (e.source && e.source.postMessage) e.source.postMessage(Object.assign({ hf: 'state' }, s), e.origin && e.origin !== 'null' ? e.origin : '*'); });
    if (window.__hfFit) window.__hfFit.install();                    // THE fit rule (shared/fit.js, loaded before this file)
    const t0 = parseFloat(q.get('t')); seek(isFinite(t0) ? t0 : D);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
