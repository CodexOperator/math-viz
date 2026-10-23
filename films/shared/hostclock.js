// hostclock.js: HOST-CLOCK page mode for a HyperFrames page embedded in a site that owns the play clock (cell M0.2j).
// Include it AFTER the page's own script (hfkit.page(..., host_clock=True) or hfkit.with_host_clock(html)). No play
// bar, no autoplay, no wall clock: the HOST seeks window.__tl, and the page never animates on its own.
//   * render mode (window.__HF_RENDER / html[data-render], set by render_hf.js): does NOTHING, like M0.2i, so the same
//     page renders byte-identically.
//   * opens PAUSED on the END frame (a finished picture), or ?t=<s>. The page's own progress line (.bar) is hidden.
//   * TICKER: GSAP's ticker is put to sleep whenever no animation is active. Any seek re-renders synchronously and wakes
//     the ticker; one listener sends it back to sleep on the next frame, so a paused or idle page asks for no frames.
//     Hosts can also seek through window.__hostclock.seek(t), which sleeps the ticker immediately.
//   * window.__hostclock = { duration, beats[], stops[], reduced, seek(t), progress(p), step(), state(), readouts(), setParams(o) }:
//       beats = window.__beats if the page set it, else the timeline labels (tl.addLabel), in seconds;
//       stops = the finished frames a reduced-motion reader steps through (just before each beat, then the end;
//               a page with no beats steps in quarters);
//       reduced = prefers-reduced-motion: reduce (live); a host should then call step() instead of animating;
//       readouts() = the text of every shown [data-readout] element, so the host can copy the numbers into its own
//       page text (legible on a phone at the site's type size; read by screen readers).
//   * postMessage {hf: 'seek', t} | {hf: 'progress', p} | {hf: 'step'} | {hf: 'state'} | {hf: 'params', params} (0.4.5); the page answers the sender with
//     {hf: 'state', t, duration, progress, atEnd, reduced, beats, stops, readouts}. 0.4.1: only SAME-ORIGIN messages are
//     accepted by default; a cross-origin host must be listed: <html data-hostclock-origins="https://site.example">
//     (space-separated; '*' = any origin, an explicit opt-in: the page then answers anyone with its readouts()).
//   * FIT without a bar: shared/fit.js, THE rule of every mode (smaller than 1280x720, or ?fit=1 / <html data-fit>;
//     ?fit=0 off). Scaled text shrinks with the page: a 1280-px design shown
//     390 px wide is x0.30, so the 20 px floor becomes ~6 px. Mirror readouts() into host text for phones, and QA the
//     page at the target width (render_hf.js --target-width 390; see M0.6h).
//   * ?theme=light|dark|auto sets html[data-theme] (house.css light tokens).
//   * 0.4.5 PARAMETERS: window.__hostclock.setParams(obj) | postMessage {hf: 'params', params}: re-seed the film from the
//     host's live numbers. The params must be a plain JSON object (<= 4096 chars as JSON, depth <= 4, <= 64 keys or items
//     per level, <= 256 values, strings <= 256 chars, finite numbers; no functions, accessors, '__proto__' /
//     'constructor' / 'prototype' keys). The page's hook window.__onParams(params, t) applies a frozen deep copy (it
//     may change the DOM, the tween values, or clear() and rebuild window.__tl's children, keeping its duration); then
//     the CURRENT t is re-rendered synchronously (no seek, no ticker wake-up left on, no frame requested). Reply / return
//     = the seek state plus ok, params (the applied copy) and, on refusal, error: no hook, a bad payload, the hook threw
//     (the frame is still re-rendered), or a call made from inside the hook. Same origin rules as seek. 0.4.6: plain objects
//     and arrays from ANOTHER same-origin realm (a parent frame calling iframe.contentWindow.__hostclock.setParams) count.
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
    // 0.4.5: the parameter channel (M0.2j): a validated, frozen copy goes to the page hook; the current t is re-rendered
    const LIM = { chars: 4096, depth: 4, keys: 64, nodes: 256, str: 256 }, BAD = new Set(['__proto__', 'constructor', 'prototype']);
    // 0.4.6: a same-origin parent's objects come from ITS realm (iframe.contentWindow.__hostclock.setParams(obj)). A realm's
    // Object.prototype is recognised by shape, read through data descriptors only (no getter runs): no prototype of its
    // own, and own data properties hasOwnProperty / isPrototypeOf (functions) and constructor = a NATIVE function named
    // 'Object' whose own 'prototype' is this object. A class prototype, an Object.create(null) stand-in or a spoofed
    // Symbol.toStringTag fails it; exotic objects (Date, Map, typed arrays, boxed primitives) fail the toString tag. The
    // hook only ever gets the copy rebuilt here, in the page realm, deep-frozen.
    const dv = (o, k) => { const d = Object.getOwnPropertyDescriptor(o, k); return d && 'value' in d ? d.value : undefined; };
    const objProto = p => { if (p === Object.prototype) return true;
      if (p === null || typeof p !== 'object' || Object.getPrototypeOf(p) !== null) return false;
      const c = dv(p, 'constructor');
      return typeof dv(p, 'hasOwnProperty') === 'function' && typeof dv(p, 'isPrototypeOf') === 'function' && typeof c === 'function'
        && dv(c, 'name') === 'Object' && dv(c, 'prototype') === p && /\{\s*\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(c)); };
    const clean = x => { let n = 0;
      const walk = (v, d) => { if (++n > LIM.nodes) throw 'more than ' + LIM.nodes + ' values';
        if (v === null || typeof v === 'boolean') return v;
        if (typeof v === 'number') { if (!isFinite(v)) throw 'a number must be finite'; return v; }
        if (typeof v === 'string') { if (v.length > LIM.str) throw 'a string over ' + LIM.str + ' chars'; return v; }
        if (typeof v !== 'object') throw 'a ' + typeof v + ' is not JSON';
        if (d >= LIM.depth) throw 'nested deeper than ' + LIM.depth;
        const pr = Object.getPrototypeOf(v), arr = Array.isArray(v), tag = Object.prototype.toString.call(v);   // 0.4.6: REALM-AGNOSTIC
        if (arr ? !(tag === '[object Array]' && pr !== null && Array.isArray(pr) && objProto(Object.getPrototypeOf(pr)))    // any realm's Array.prototype
                : !(tag === '[object Object]' && (pr === null || objProto(pr)))) throw 'only plain objects and arrays';       // any realm's Object.prototype
        const ks = Reflect.ownKeys(v).filter(k => !(arr && k === 'length'));
        if (ks.length > LIM.keys) throw 'more than ' + LIM.keys + ' keys or items';
        const o = arr ? [] : {};
        for (const k of ks) { if (typeof k !== 'string') throw 'a symbol key';
          if (BAD.has(k)) throw 'key ' + JSON.stringify(k) + ' is not allowed';
          if (k.length > LIM.str) throw 'a key over ' + LIM.str + ' chars';
          const ds = Object.getOwnPropertyDescriptor(v, k); if (!ds || !('value' in ds)) throw 'key ' + JSON.stringify(k) + ' is an accessor';
          if (arr && !/^(0|[1-9][0-9]*)$/.test(k)) throw 'an array with extra keys';
          o[k] = walk(ds.value, d + 1); }
        if (arr) { const ld = Object.getOwnPropertyDescriptor(v, 'length'); if (!ld || !('value' in ld) || ks.length !== ld.value) throw 'a sparse array'; }
        return Object.freeze(o); };
      if (x === null || typeof x !== 'object' || Array.isArray(x)) throw 'params must be a plain JSON object';
      const c = walk(x, 0); if (JSON.stringify(c).length > LIM.chars) throw 'over ' + LIM.chars + ' chars as JSON'; return c; };
    let busy = false;
    api.setParams = obj => { const t = tl.time(), no = e => Object.assign(state(), { ok: false, error: e });
      if (busy) return no('setParams called from inside __onParams');
      if (typeof window.__onParams !== 'function') return no('this page has no window.__onParams hook: it takes no parameters');
      let c; try { c = clean(obj); } catch (e) { return no('bad params: ' + (typeof e === 'string' ? e : 'not plain JSON')); }
      let err = null; busy = true;
      try { window.__onParams(c, t); } catch (e) { err = '__onParams threw: ' + String(e && e.message || e).slice(0, 200); } finally { busy = false; }
      tl.pause(); tl.render(Math.min(t, tl.duration()), false, true); sleep();          // redraw THIS t: no seek, no frame
      return Object.assign(state(), err ? { ok: false, error: err } : { ok: true, params: c }); };
    Object.defineProperty(window, '__hostclock', { value: Object.freeze(api), writable: false, configurable: false });
    // 0.4.2: listed origins are normalised the way the browser reports e.origin (lowercase, no default port, no '/')
    const norm = o => { if (o === '*') return o; try { const u = new URL(o); return /^https?:$/.test(u.protocol) ? u.origin : null; } catch (e) { return null; } };
    const allow = (de.getAttribute('data-hostclock-origins') || '').split(/\s+/).filter(Boolean).map(norm).filter(Boolean);
    const trusted = o => (o === location.origin && o !== 'null') || allow.includes('*') || allow.includes(o);
    addEventListener('message', e => { const m = e.data; if (!m || typeof m !== 'object' || typeof m.hf !== 'string') return;
      if (!trusted(e.origin)) return;                                 // 0.4.1: same origin only, unless the page opts in
      let s; if (m.hf === 'seek') s = seek(m.t); else if (m.hf === 'progress') s = api.progress(m.p); else if (m.hf === 'step') s = api.step();
      else if (m.hf === 'state') s = state(); else if (m.hf === 'params') s = api.setParams(m.params); else return;
      if (e.source && e.source.postMessage) e.source.postMessage(Object.assign({ hf: 'state' }, s), e.origin && e.origin !== 'null' ? e.origin : '*'); });
    if (window.__hfFit) window.__hfFit.install();                    // THE fit rule (shared/fit.js, loaded before this file)
    const t0 = parseFloat(q.get('t')); seek(isFinite(t0) ? t0 : D);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
