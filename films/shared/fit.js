// Vendored from manim-hyperframes-matrix trunk v0.4.4 (shared/fit.js, the fit rule used by M0.2j).
// Do not edit. These pages declare data-layout="stacked", so this file never scales them.
// The portrait stack that keeps type at 15px lives in stack.js.
// fit.js: THE fit rule for every HyperFrames page mode (0.4.1: one function, used by fit-only pages, M0.2i controls.js
// and M0.2j hostclock.js). Rule: scale the 1280x720 #root DOWN to the viewport (letterboxed, centred) when the viewport is
// smaller than 1280x720 in either direction, or always with ?fit=1 / <html data-fit> (which may also scale up);
// ?fit=0 turns it off. A page with data-layout="stacked" is never scaled (it re-flows itself) unless ?fit=1. Never in render mode (window.__HF_RENDER / html[data-render]). It does not touch the timeline or
// GSAP's ticker. Text scales with the page: a 390-px phone shows 1280-px design text at x0.30 (see M0.2j, readouts()).
// API: window.__hfFit.install(cb) applies the rule now and on resize and calls cb(s, want) (s = the scale, 1 when not
// fitted); window.__hfFit.want() / scale() report it. hfkit.set_mode() always loads this file BEFORE controls.js or
// hostclock.js; on a page without either it installs itself.
(function () {
  if (window.__hfFit) return;
  const de = document.documentElement, fq = new URLSearchParams(location.search).get('fit');
  const off = () => !!(window.__HF_RENDER || de.hasAttribute('data-render'));
  // 0.4.1: a page that declares data-layout="stacked" (on <html> or the film root #root) lays itself out at narrow widths
  // (its own CSS stacks the blocks), so it is never scaled unless ?fit=1 asks for it
  const stacked = () => de.getAttribute('data-layout') === 'stacked' || ((document.getElementById('root') || {}).dataset || {}).layout === 'stacked';
  const want = () => !off() && (fq === '1' || (fq !== '0' && !stacked() && (de.hasAttribute('data-fit') || innerWidth < 1280 || innerHeight < 720)));
  const scale = () => want() ? Math.min(innerWidth / 1280, innerHeight / 720) : 1;
  let cbs = [], styled = false;
  function apply() {
    const root = document.getElementById('root'); if (!root || off()) return;
    if (!styled) { const st = document.createElement('style'); styled = true;
      st.textContent = 'html[data-fitted],html[data-fitted] body{width:100vw;height:100vh;overflow:hidden}html[data-fitted] #root{position:absolute;left:0;top:0;transform-origin:0 0}';
      document.head.appendChild(st); }
    const w = want(), s = scale();
    if (w) { de.setAttribute('data-fitted', ''); root.style.transform = 'translate(' + ((innerWidth - 1280 * s) / 2) + 'px,' + ((innerHeight - 720 * s) / 2) + 'px) scale(' + s + ')'; }
    else { de.removeAttribute('data-fitted'); root.style.transform = ''; }
    cbs.forEach(f => f(s, w));
  }
  let on = false;
  window.__hfFit = Object.freeze({ want, scale, apply,
    install(cb) { if (off()) return; if (cb) cbs.push(cb); if (!on) { on = true; addEventListener('resize', apply); de.setAttribute('data-fit-js', ''); } apply(); } });
  const mode = () => document.querySelector('script[src$="controls.js"],script[src$="hostclock.js"]');
  function init() { if (!off() && !mode()) window.__hfFit.install(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
