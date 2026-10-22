// Portrait stack for a 1280×720 film. No clock and no timers.
// The trunk's fit.js (v0.4.4) is the scale-down rule. These pages declare
// data-layout="stacked", so fit.js never scales them. This file is the reflow
// that declaration points at. It writes data-stack, never data-layout, so the
// trunk rule stays off.
// Under 835 CSS px the plane fills the width and the staircase or the lines sit below it.
// 835 is ceil(15/23*1280). The cite and the section label are 23px, and a landscape
// scale below that draws them under 15px. The sizes in this stack are 16px and 15px.
// Live numbers are the host clock's job (v0.4.5 setParams). This file has no param hook.
(function () {
  const CSS = [
    'html[data-stack=portrait],html[data-stack=portrait] body{width:100%;height:auto;overflow:visible}',
    'html[data-stack=portrait] #root{position:relative;width:100%;height:auto;min-height:0;overflow:visible;display:flex;flex-direction:column}',
    'html[data-stack=portrait] .chrome-label{position:relative;left:auto;top:auto;order:0;margin:12px 12px 0;max-width:calc(100% - 24px);flex-wrap:wrap}',
    '#plane-box{position:absolute;left:0;top:0;width:1280px;height:720px}',
    'html[data-stack=portrait] #plane-box{position:relative;left:auto;top:auto;width:100%;height:auto;order:1}',
    'html[data-stack=portrait] svg.plane{position:relative;left:auto;top:auto;width:100%;height:auto;display:block}',
    'html[data-stack=portrait] .lbl{position:absolute;z-index:1}',
    'html[data-stack=portrait] .lbl.off{display:none}',
    'html[data-stack=portrait] .ln2{position:relative;left:auto!important;top:auto!important;width:auto!important;max-width:100%;min-width:0;white-space:normal;font-size:16px;line-height:1.35;margin:2px 12px;order:3}',
    'html[data-stack=portrait] .ln2.off{display:none}',
    'html[data-stack=portrait] [data-xfade]{position:relative;min-height:1.45em;margin:2px 12px;order:3;min-width:0;max-width:100%}',
    'html[data-stack=portrait] [data-xfade]>.ln2{position:absolute!important;left:0!important;top:0!important;margin:0;width:100%!important;max-width:100%}',
    'html[data-stack=portrait] [data-xfade]>.ln2.off{display:block;visibility:hidden}',
    'html[data-stack=portrait] #stairs{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:flex-end;order:2;width:100%;max-width:100%;box-sizing:border-box;padding:8px 12px 2px}',
    'html[data-stack=portrait] #stairs .ln2{position:relative!important;display:inline-block;width:auto!important;max-width:none;margin:0;white-space:nowrap;font-size:15px;order:0}',
    'html[data-stack=portrait] #stairs .ln2.off{display:none}',
    'html[data-stack=portrait] .cite{position:relative;left:auto;top:auto;width:auto;max-width:calc(100% - 24px);margin:10px 12px 14px;white-space:normal;overflow:visible;order:4}',
  ].join('');

  function ensure() {
    if (document.getElementById('film-fit-css')) return;
    const s = document.createElement('style');
    s.id = 'film-fit-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function group() {
    const svg = document.querySelector('svg.plane');
    if (svg && !document.getElementById('plane-box')) {
      const box = document.createElement('div');
      box.id = 'plane-box';
      svg.before(box);
      box.appendChild(svg);
      document.querySelectorAll('.lbl').forEach((n) => box.appendChild(n));
    }
    if (!document.getElementById('stairs')) {
      const steps = [...document.querySelectorAll('[id^="st"]')].filter((n) => /^st\d+$/.test(n.id));
      if (steps.length) {
        const box = document.createElement('div');
        box.id = 'stairs';
        steps[0].before(box);
        steps.forEach((n) => box.appendChild(n));
      }
    }
  }

  window.__filmFit = function (PL) {
    ensure();
    group();
    const svg = document.querySelector('svg.plane');
    // innerWidth follows the 1280px root when that root is wider than the
    // viewport (a phone with no room to grow). clientWidth is the viewport.
    // The narrower one is the width the reader actually has.
    function width() {
      const iw = window.innerWidth || 0;
      const cw = document.documentElement.clientWidth || 0;
      if (iw < 2) return cw;
      if (cw < 2) return iw;
      return Math.min(iw, cw);
    }
    function apply() {
      const w = width();
      if (w < 2) return;
      const narrow = w < 835;
      document.documentElement.dataset.stack = narrow ? 'portrait' : 'wide';
      if (svg && PL && PL.w) {
        if (narrow) {
          const pad = { vx: PL.x0 - 40, vy: PL.y0 - 28, vw: PL.w + 80, vh: PL.h + 64 };
          window.__planePad = pad;
          svg.setAttribute('viewBox', pad.vx + ' ' + pad.vy + ' ' + pad.vw + ' ' + pad.vh);
        } else {
          window.__planePad = null;
          svg.setAttribute('viewBox', '0 0 1280 720');
        }
      }
      if (typeof window.__redraw === 'function') window.__redraw();
    }
    window.__fit = apply;
    window.addEventListener('resize', apply);
    // The first call can run before the viewport is the real one (a phone
    // width applied by the host, or a direct open). Run again once the
    // document has its size. These are not a clock: each call returns.
    document.addEventListener('DOMContentLoaded', apply);
    window.addEventListener('load', apply);
    apply();
  };
})();
