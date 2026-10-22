// Vendored from manim-hyperframes-matrix trunk v0.4.4, cell M0.2j (shared/hostclock.js).
// Do not edit. The site seeks window.__hostclock. Live numbers stay on window.__setFilmParams
// in stack.js: this mode has no param channel.
// hostclock.js: HOST-CLOCK page mode for a HyperFrames page embedded in a site that owns the play clock (cell M0.2j).
// Include it AFTER the page's own script (hfkit.page(..., host_clock=True) or hfkit.with_host_clock(html)). No play
// bar, no autoplay, no wall clock: the HOST seeks window.__tl, and the page never animates on its own.
//   * render mode (window.__HF_RENDER / html[data-render], set by render_hf.js): does NOTHING, like M0.2i, so the same
//     page renders byte-identically.
//   * opens PAUSED on the END frame (a finished picture), or ?t=<s>. The page's own progress line (.bar) is hidden.
//   * TICKER: GSAP's ticker is put to sleep whenever no animation is active. Any seek re-renders synchronously and wakes
//     the ticker; one listener sends it back to sleep on the next frame, so a paused or idle page asks for no frames.
//     Hosts can also seek through window.__hostclock.seek(t), which sleeps the ticker immediately.
//   * window.__hostclock = { duration, beats[], stops[], reduced, seek(t), progress(p), step(), state(), readouts() }:
//       beats = window.__beats if the page set it, else the timeline labels (tl.addLabel), in seconds;
//       stops = the finished frames a reduced-motion reader steps through (just before each beat, then the end;
//               a page with no beats steps in quarters);
//       reduced = prefers-reduced-motion: reduce (live); a host should then call step() instead of animating;
//       readouts() = the text of every shown [data-readout] element, so the host can copy the numbers into its own
//       page text (legible on a phone at the site's type size; read by screen readers).
//   * postMessage {hf: 'seek', t} | {hf: 'progress', p} | {hf: 'step'} | {hf: 'state'}; the page answers the sender with
//     {hf: 'state', t, duration, progress, atEnd, reduced, beats, stops, readouts}. 0.4.1: only SAME-ORIGIN messages are
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
    const api = { duration: D, beats: beats.slice(), stops: stops.slice(), get reduced() { return reduced(); }, seek,
      progress: p => seek(D * Math.min(1, Math.max(0, +p || 0))),
      step: () => { const t = tl.time(), end = tl.progress() >= 1 - 1e-6; const nx = end ? stops[0] : stops.find(s => s > t + 1e-3);
        return seek(nx === undefined ? D : nx); }, state, readouts };
    Object.defineProperty(window, '__hostclock', { value: Object.freeze(api), writable: false, configurable: false });
    // 0.4.2: listed origins are normalised the way the browser reports e.origin (lowercase, no default port, no '/')
    const norm = o => { if (o === '*') return o; try { const u = new URL(o); return /^https?:$/.test(u.protocol) ? u.origin : null; } catch (e) { return null; } };
    const allow = (de.getAttribute('data-hostclock-origins') || '').split(/\s+/).filter(Boolean).map(norm).filter(Boolean);
    const trusted = o => (o === location.origin && o !== 'null') || allow.includes('*') || allow.includes(o);
    addEventListener('message', e => { const m = e.data; if (!m || typeof m !== 'object' || typeof m.hf !== 'string') return;
      if (!trusted(e.origin)) return;                                 // 0.4.1: same origin only, unless the page opts in
      let s; if (m.hf === 'seek') s = seek(m.t); else if (m.hf === 'progress') s = api.progress(m.p); else if (m.hf === 'step') s = api.step();
      else if (m.hf === 'state') s = state(); else return;
      if (e.source && e.source.postMessage) e.source.postMessage(Object.assign({ hf: 'state' }, s), e.origin && e.origin !== 'null' ? e.origin : '*'); });
    if (window.__hfFit) window.__hfFit.install();                    // THE fit rule (shared/fit.js, loaded before this file)
    const t0 = parseFloat(q.get('t')); seek(isFinite(t0) ? t0 : D);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
