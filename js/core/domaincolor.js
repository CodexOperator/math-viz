// js/core/domaincolor.js - domain colouring: paint a function f onto pixels.
//
//   hue        = Arg w / 2pi (mod 1), so every step theta + 2 pi k has the same colour
//   lightness  = 1 - 1/(1 + sqrt|w|), with faint rings at |w| = 2^k
//
// The top level of this module is pure (it imports cleanly in Node). It touches the DOM and timers
// only inside createDomainColoring and drawColorWheel. No imports, no window or document listeners.
//
// Design: docs/designs/iter-1/i1-core-mapping.md (sections 4.3 and 5.3).

const TAU = 2 * Math.PI;

export const DOMAIN_LEGEND = Object.freeze({
  title: 'Colour key',
  short: 'Colour is the angle of w. Brightness is the size of w.',
  plane: 'Each point z is painted with the colour of f(z).',
  aria: 'Colour key for domain colouring. The colour is the angle of w: red along the positive real axis, then yellow-green at i, cyan at -1 and violet at -i, going counter-clockwise. The brightness is the size of w: black at 0, medium at 1, white far away.',
  details: Object.freeze([
    'Colour = the angle of w (arg w). Red is the positive real axis. Going counter-clockwise you pass yellow-green (i), cyan (-1) and violet (-i).',
    'Every step of the staircase, θ + 2πk, has the same colour. So the colour shows arg w as a whole set, and the plain function w = z has no seam.',
    'Brightness = the size of w (|w|). Black is w = 0, medium is |w| = 1, white is very large. Faint rings mark |w| = 1/4, 1/2, 1, 2, 4, 8 ...',
    'Black spots are zeros of f. White spots are poles.',
    'A sharp jump in colour (not just in brightness) is a seam: the angle of w jumps there. The principal square root has one along the negative real axis.',
  ]),
  noFunction: 'Pick a function to colour the plane.',
  refining: 'Sharpening the picture...',
  canvasLabel: 'Domain colouring of f. Colour shows the angle of w = f(z), brightness shows its size.',
});

// ----- pure colour --------------------------------------------------------

function parts(w) {
  if (typeof w === 'number') return [w, 0];
  if (w && typeof w === 'object') return [+w.re, +w.im];
  return [NaN, NaN];
}

export function hueOf(w) {
  const [x, y] = parts(w);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  let h = Math.atan2(y, x) / TAU;
  if (h < 0) h += 1;
  if (h >= 1) h = 0; // a tiny negative angle plus 1 rounds to exactly 1
  return h;
}

export function lightnessOf(w) {
  const [x, y] = parts(w);
  const m = Math.hypot(x, y); // NaN stays NaN, Infinity gives 1
  return 1 - 1 / (1 + Math.sqrt(m));
}

// Same as colorOf with no object needed (this is the hot loop).
export function colorXY(x, y, out = [0, 0, 0], rings = true) {
  if (!out || typeof out !== 'object') out = [0, 0, 0];
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    out[0] = 128; out[1] = 128; out[2] = 128;
    return out;
  }
  const m2 = x * x + y * y;
  if (m2 === 0) {
    out[0] = 0; out[1] = 0; out[2] = 0;
    return out;
  }
  // x*x + y*y overflows above about 1.3e154: take the scaled hypot then (huge modulus is white)
  const m = Number.isFinite(m2) ? Math.sqrt(m2) : Math.hypot(x, y);
  let l = 1 - 1 / (1 + Math.sqrt(m));
  if (rings) {
    const lg = Math.log2(m);
    if (Number.isFinite(lg)) l *= 0.88 + 0.12 * (lg - Math.floor(lg)); // an infinite modulus has ring factor 1
  }
  let h = Math.atan2(y, x) / TAU;
  if (h < 0) h += 1;
  if (h >= 1) h = 0;
  const a = 0.8 * Math.min(l, 1 - l);
  const h12 = h * 12;
  let k = h12 % 12;
  out[0] = Math.floor(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) + 0.5);
  k = (8 + h12) % 12;
  out[1] = Math.floor(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) + 0.5);
  k = (4 + h12) % 12;
  out[2] = Math.floor(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) + 0.5);
  return out;
}

export function colorOf(w, out = [0, 0, 0], rings = true) {
  const [x, y] = parts(w);
  return colorXY(x, y, out, rings);
}

// {center, scale} (scale = pixels per unit) and the CSS size of the plane -> square-unit ranges.
// A missing or unusable view gives centre 0 and 8 units across (x from -4 to 4), as the DC default.
export function rangesFromView(view, widthCss, heightCss) {
  const v = view && typeof view === 'object' ? view : {};
  const c0 = typeof v.center === 'number' ? { re: v.center, im: 0 } : (v.center || { re: 0, im: 0 });
  const c = { re: Number.isFinite(c0.re) ? c0.re : 0, im: Number.isFinite(c0.im) ? c0.im : 0 };
  const w = Number.isFinite(widthCss) && widthCss > 0 ? widthCss : 1;
  const h = Number.isFinite(heightCss) && heightCss > 0 ? heightCss : w;
  const scale = Number.isFinite(v.scale) && v.scale > 0 ? v.scale : w / 8;
  return {
    xRange: [c.re - w / (2 * scale), c.re + w / (2 * scale)],
    yRange: [c.im - h / (2 * scale), c.im + h / (2 * scale)],
  };
}

// ----- the canvas layer ---------------------------------------------------

function sortedRange(r, dflt) {
  if (!Array.isArray(r)) return dflt.slice();
  const a = +r[0];
  const b = +r[1];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return dflt.slice();
  return a <= b ? [a, b] : [b, a];
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function createDomainColoring(canvas, options) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new TypeError('createDomainColoring needs a canvas element');
  }
  const {
    f, xRange, yRange,
    quality = { idle: 1, drag: 0.3 }, rings = true,
    maxPixels = { idle: 1.5e6, drag: 1.2e5 },
  } = options && typeof options === 'object' ? options : {};
  const q = { idle: 1, drag: 0.3, ...(quality || {}) };
  const cap = { idle: 1.5e6, drag: 1.2e5, ...(maxPixels || {}) };
  let fn = f;
  let [xmin, xmax] = sortedRange(xRange, [-4, 4]);
  let [ymin, ymax] = sortedRange(yRange, [-4, 4]);
  let current = 'idle';
  let timer = null;
  let rafId = 0;
  let job = null;
  let destroyed = false;
  let renders = 0;
  let lastW = 0;
  let lastH = 0;
  let state = 'ready';
  let off = null;
  let offCtx = null;
  let img = null;
  const tmp = [0, 0, 0];

  const setState = (s) => {
    state = s;
    if (canvas.dataset) canvas.dataset.dcState = s;
  };
  const hasAttr = (n) => typeof canvas.hasAttribute === 'function' && canvas.hasAttribute(n);
  if (!hasAttr('aria-label') && !hasAttr('aria-hidden') && typeof canvas.setAttribute === 'function') {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', DOMAIN_LEGEND.canvasLabel);
  }
  setState('ready');

  function targetSize(mode) {
    const cw = canvas.width;
    const ch = canvas.height;
    if (!(cw >= 1) || !(ch >= 1)) return null;
    const qv = Number(q[mode]);
    const qm = clamp(Number.isFinite(qv) ? qv : 1, 0.05, 1);
    const qe = Math.min(qm, Math.sqrt(cap[mode] / (cw * ch)));
    return { W: Math.max(1, Math.ceil(cw * qe)), H: Math.max(1, Math.ceil(ch * qe)) };
  }

  function ensureBuffers(W, H) {
    if (off && off.width === W && off.height === H && img) return;
    off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    offCtx = off.getContext('2d');
    img = offCtx.createImageData(W, H);
  }

  // Everything fillRows reads is in p, so a view or function change in mid-refine cannot garble a frame.
  function frameParams() {
    return { fn, xmin, xmax, ymin, ymax, rings };
  }

  function fillRows(p, W, H, r0, r1) {
    const dx = (p.xmax - p.xmin) / W;
    const dy = (p.ymax - p.ymin) / H;
    const zin = { re: 0, im: 0 };
    const data = img.data;
    const f2 = p.fn;
    for (let j = r0; j < r1; j++) {
      zin.im = p.ymax - (j + 0.5) * dy; // row 0 is the top, y points up
      for (let i = 0; i < W; i++) {
        zin.re = p.xmin + (i + 0.5) * dx;
        let wr = NaN;
        let wi = NaN;
        try {
          const w = f2(zin);
          if (typeof w === 'number') { wr = w; wi = 0; } else if (w) { wr = w.re; wi = w.im; }
        } catch (e) { /* the pixel stays grey */ }
        colorXY(wr, wi, tmp, p.rings);
        const o = (j * W + i) * 4;
        data[o] = tmp[0];
        data[o + 1] = tmp[1];
        data[o + 2] = tmp[2];
        data[o + 3] = 255;
      }
    }
  }

  function blit(W, H) {
    const ctx = canvas.getContext('2d');
    if (!ctx) { setState('no-context'); return; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = W < canvas.width || H < canvas.height;
    ctx.imageSmoothingQuality = 'low';
    offCtx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, W, H, 0, 0, canvas.width, canvas.height);
    lastW = W;
    lastH = H;
    renders++;
    setState('ready');
  }

  function finish() {
    job = null;
    rafId = 0;
    if (canvas.dataset) delete canvas.dataset.dcPending;
  }

  let visOff = null;
  function cancelRefine() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    if (rafId) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
      else clearTimeout(rafId);
      rafId = 0;
    }
    if (visOff) { visOff(); visOff = null; }
    job = null;
    if (canvas.dataset) delete canvas.dataset.dcPending;
  }

  const nextFrame = (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 16));
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  function stepJob() {
    if (!job || destroyed) return;
    if (typeof document !== 'undefined' && document.hidden) {
      job = null;
      rafId = 0;
      if (!visOff && typeof document.addEventListener === 'function') {
        const on = () => {
          if (document.hidden) return;
          document.removeEventListener('visibilitychange', on);
          visOff = null;
          if (!destroyed) startRefine();
        };
        visOff = () => document.removeEventListener('visibilitychange', on);
        document.addEventListener('visibilitychange', on);
      }
      return;
    }
    const t0 = now();
    do {
      const r1 = Math.min(job.H, job.row + 16);
      fillRows(job.p, job.W, job.H, job.row, r1);
      job.row = r1;
    } while (job.row < job.H && now() - t0 < 8);
    if (job.row >= job.H) {
      blit(job.W, job.H);
      finish();
    } else {
      rafId = nextFrame(stepJob);
    }
  }

  function startRefine() {
    timer = null;
    if (destroyed) return;
    current = 'idle';
    const size = targetSize('idle');
    if (!size || typeof fn !== 'function') { // nothing to sharpen: clear the flag armRefine set
      finish();
      return;
    }
    ensureBuffers(size.W, size.H);
    if (canvas.dataset) canvas.dataset.dcPending = '1';
    const p = frameParams();
    if (typeof document !== 'undefined' && document.hidden) {
      // A hidden tab does not paint. The sharp picture is drawn when the tab is visible again.
      if (!visOff && typeof document.addEventListener === 'function') {
        const on = () => {
          if (document.hidden) return;
          document.removeEventListener('visibilitychange', on);
          visOff = null;
          if (!destroyed) startRefine();
        };
        visOff = () => document.removeEventListener('visibilitychange', on);
        document.addEventListener('visibilitychange', on);
      }
      return;
    }
    job = { row: 0, W: size.W, H: size.H, p };
    rafId = nextFrame(stepJob);
  }

  function armRefine() {
    timer = setTimeout(startRefine, 120);
    if (canvas.dataset) canvas.dataset.dcPending = '1';
  }

  function render(mode) {
    if (destroyed) return false;
    if (mode === 'idle' || mode === 'drag') current = mode;
    cancelRefine(); // an explicit render supersedes a pending or unfinished refine
    const ctx = canvas.getContext('2d');
    if (!ctx) { setState('no-context'); return false; }
    if (!(canvas.width >= 1) || !(canvas.height >= 1)) { setState('hidden'); return false; }
    if (typeof fn !== 'function') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgb(128,128,128)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setState('no-function');
      return true;
    }
    const { W, H } = targetSize(current);
    ensureBuffers(W, H);
    fillRows(frameParams(), W, H, 0, H);
    blit(W, H);
    if (current === 'drag') armRefine();
    return true;
  }

  return {
    setFunction(g) { fn = g; },
    setView(v) {
      const view = v || {};
      [xmin, xmax] = sortedRange(view.xRange, [xmin, xmax]);
      [ymin, ymax] = sortedRange(view.yRange, [ymin, ymax]);
    },
    setQuality(mode) {
      if (mode !== 'idle' && mode !== 'drag') return;
      current = mode;
      if (mode === 'idle') cancelRefine();
    },
    render,
    info() {
      return { mode: current, width: lastW, height: lastH, pending: timer !== null || job !== null, destroyed, renders, state };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelRefine();
      off = null;
      offCtx = null;
      img = null;
      setState('destroyed');
    },
  };
}

// ----- the colour wheel legend -------------------------------------------

export function drawColorWheel(canvas, options) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new TypeError('drawColorWheel needs a canvas element');
  }
  const { size = 96 } = options && typeof options === 'object' ? options : {};
  const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  const px = Math.round(size * dpr);
  canvas.width = px;
  canvas.height = px;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const R = px / 2;
  const Rw = R - 1.5 * dpr;
  const img = ctx.createImageData(px, px);
  const data = img.data;
  const tmp = [0, 0, 0];
  for (let j = 0; j < px; j++) {
    const dy = R - (j + 0.5); // y points up
    for (let i = 0; i < px; i++) {
      const dx = i + 0.5 - R;
      const d = Math.sqrt(dx * dx + dy * dy);
      const alpha = clamp(Rw + 0.5 - d, 0, 1);
      if (alpha === 0) continue;
      const rho = Math.min(d / Rw, 1 - 1e-9);
      const ang = Math.atan2(dy, dx);
      const m = (rho / (1 - rho)) * (rho / (1 - rho)); // lightnessOf(m) = rho exactly
      colorXY(m * Math.cos(ang), m * Math.sin(ang), tmp, true);
      const o = (j * px + i) * 4;
      data[o] = tmp[0];
      data[o + 1] = tmp[1];
      data[o + 2] = tmp[2];
      data[o + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  let border = '';
  try {
    border = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
  } catch (e) { /* no document */ }
  ctx.beginPath();
  ctx.arc(R, R, Rw, 0, TAU);
  ctx.lineWidth = dpr;
  ctx.strokeStyle = border || '#888888';
  ctx.stroke();
  const has = (n) => typeof canvas.hasAttribute === 'function' && canvas.hasAttribute(n);
  if (!has('aria-label') && !has('aria-hidden') && typeof canvas.setAttribute === 'function') {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', DOMAIN_LEGEND.aria);
  }
  return canvas;
}
