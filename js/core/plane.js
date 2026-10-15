// js/core/plane.js
// The complex-plane canvas: the one surface the whole site is drawn on.
//
//   createPlane(container, options) -> Plane      grids, axes, draggable handles (real <button>s),
//                                                 layers, time-coloured curves, pan and zoom
//   drawCartAddress / drawPolarAddress            the two addresses of one point (Thread 1)
//   drawSeam, drawCircle, drawRay, drawSegment, drawArc, drawTimedCurve, drawDot, drawLabel, drawPolygonFill
//   makeTransform, mixColor, niceGridStep         pure helpers (import-safe in Node)
//
// No imports. No window/document access at module top level, so this file imports cleanly in Node
// and the drawing helpers can be tested with a recording fake 2d context.
// Colours are CSS custom properties, read at draw time and refreshed on `themechange`.
// Design: docs/designs/iter-1/i1-core-plane.md. Interface: docs/ARCHITECTURE.md 3.5.

// ---------------------------------------------------------------------------------------------
// 1. Constants and the injected stylesheet
// ---------------------------------------------------------------------------------------------

const RAMP_WEIGHT = 0.65, RAMP_BINS = 32;                 // time ramp
const GHOST_STEP_PX = 7, MAX_GHOSTS = 6, ARC_STEP_PX = 3; // arg-as-a-set windings, arc polyline density
const ZOOM_STEP = 1.25, WHEEL_K = 0.0015, WHEEL_K_CTRL = 0.01, PAN_FRAC = 0.1, PAN_FRAC_BIG = 0.5, PAN_THRESHOLD_PX = 3;
const LABEL_THROTTLE_MS = 150, ANNOUNCE_DEBOUNCE_MS = 300; // aria-label refresh while dragging; live-region debounce
const MAX_DPR = 3, MAX_CANVAS_PIXELS = 16e6, NOMINAL_W = 400, MAX_COORD_PX = 1e6, HANDLE_COORD_PX = 1e5;
const HANDLE_RADIUS = 7, HIT_MIN_PX = 32, HIT_PAD_PX = 18;
const GRID_ALPHA = { cart: [0.16, 0.24], polar: [0.20, 0.28] }; // [light, dark]
const ALSO_TEXT_ALPHA = 0.8;                              // the "also ..." words stay readable; only the arcs are faint

export const DASH = Object.freeze({
  cart: Object.freeze([5, 4]),
  excluded: Object.freeze([6, 5]),
  seam: Object.freeze([8, 5]),
  guide: Object.freeze([3, 4]),
});

const MSG_NO_CANVAS = 'This picture needs canvas drawing, and your browser has it switched off. The numbers beside it still work.';
const MSG_LAYER_FAILED = 'Part of this picture could not be drawn. The numbers beside it are still right.';
const MSG_AT_MIN = 'That is as far in as it goes.';
const MSG_AT_MAX = 'That is as far out as it goes.';
const MSG_HANDLE_HINT = 'Drag this point, or use the arrow keys. Shift moves 10 times as far, Alt a tenth as far.';
const MSG_KEYS = 'Arrow keys pan, plus and minus zoom, zero resets the view.';

// Tokens only: every colour below is var(--token, system-colour keyword).
const PLANE_CSS = `
.plane{position:relative;display:block;box-sizing:border-box;width:100%;min-width:0;max-width:var(--plane-max-width,640px);
  aspect-ratio:var(--plane-aspect,1);margin-inline:auto;border:1px solid var(--border,currentColor);
  border-radius:var(--radius,8px);background:var(--plane-bg,var(--surface,Canvas));overflow:hidden;
  user-select:none;-webkit-user-select:none;touch-action:pan-x pan-y}
.plane:focus-visible{outline:3px solid var(--focus,Highlight);outline-offset:2px}
.plane.is-pointer-focus:focus-visible{outline:none}
.plane-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:pan-x pan-y}
.plane.is-panning .plane-canvas{cursor:grabbing}
.plane.is-drawing .plane-canvas{cursor:crosshair;touch-action:none}
.plane.is-static .plane-canvas{cursor:default;touch-action:auto}
.plane-handles{position:absolute;inset:0;pointer-events:none}
.plane-handle{--hit-eff:max(var(--hit,32px),var(--hit-min,32px));
  --handle-halo:color-mix(in srgb,var(--handle-color,currentColor) 30%,transparent);
  position:absolute;left:0;top:0;width:var(--hit-eff);height:var(--hit-eff);
  margin:calc(var(--hit-eff)/-2) 0 0 calc(var(--hit-eff)/-2);padding:0;border:0;border-radius:50%;background:none;
  color:var(--text,CanvasText);font:inherit;display:flex;align-items:center;justify-content:center;
  pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;cursor:default;z-index:1}
.plane-handle.is-draggable{cursor:grab}
.plane-handle.is-dragging{cursor:grabbing}
.plane-handle:focus,.plane-handle.is-dragging{z-index:3}
.plane-handle-dot{box-sizing:border-box;width:var(--dot,14px);height:var(--dot,14px);border-radius:50%;
  background:var(--handle-color,var(--input,currentColor));box-shadow:0 0 0 2px var(--surface,Canvas)}
.plane-handle.is-draggable .plane-handle-dot{box-shadow:0 0 0 2px var(--surface,Canvas),0 0 0 6px var(--handle-halo,transparent)}
.plane-handle:hover .plane-handle-dot,.plane-handle.is-dragging .plane-handle-dot{transform:scale(1.15)}
.plane-handle:focus-visible{outline:none}
.plane-handle:focus-visible .plane-handle-dot{outline:3px solid var(--focus,Highlight);outline-offset:3px}
.plane-handle.is-pointer-focus:focus-visible .plane-handle-dot{outline:none}
.plane-handle-label{position:absolute;left:calc(50% + var(--dot,14px)/2 + 4px);top:calc(50% - var(--dot,14px)/2 - 16px);
  font:600 13px/1 var(--font,system-ui,sans-serif);color:var(--text,CanvasText);white-space:nowrap;pointer-events:none;
  text-shadow:0 0 3px var(--surface,Canvas),0 0 3px var(--surface,Canvas),0 0 3px var(--surface,Canvas)}
.plane-handle[hidden],.plane-controls[hidden],.plane-note[hidden]{display:none!important}
.plane-controls{position:absolute;top:8px;right:8px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;
  pointer-events:none;z-index:4}
.plane-btn{pointer-events:auto;min-width:32px;height:32px;padding:0 8px;box-sizing:border-box;cursor:pointer;opacity:.9;
  border:1px solid var(--border,currentColor);border-radius:var(--radius,8px);background:var(--surface,Canvas);
  color:var(--text,CanvasText);font:600 14px/1 var(--font,system-ui,sans-serif)}
.plane-btn:hover{opacity:1;background:var(--surface-2,var(--surface,Canvas))}
.plane-btn:focus-visible{outline:3px solid var(--focus,Highlight);outline-offset:2px;opacity:1}
.plane-btn[aria-disabled="true"]{opacity:.45;cursor:default}
.plane-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.plane-note{position:absolute;left:8px;right:8px;bottom:8px;padding:6px 8px;border:1px solid var(--border,currentColor);
  border-radius:var(--radius,8px);background:var(--surface,Canvas);color:var(--text,CanvasText);
  font:500 12px/1.3 var(--font,system-ui,sans-serif);z-index:5}
@media (pointer:coarse){.plane-handle{--hit-min:var(--tap,44px)}.plane-btn{min-width:40px;height:40px}}
@media (prefers-reduced-motion:no-preference){.plane-handle-dot{transition:transform 80ms}}
`;

// ---------------------------------------------------------------------------------------------
// 2. Pure functions (Node-safe; acceptance A1)
// ---------------------------------------------------------------------------------------------

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const copyZ = (z) => ({ re: z.re, im: z.im });
const finiteZ = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
const round6 = (x) => Number(x.toFixed(6));
const round9 = (x) => Math.round(x * 1e9) / 1e9;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// unitsAcross is the number of units across the canvas WIDTH; scale = w / unitsAcross (px per unit).
export function makeTransform({ center, unitsAcross }, w, h) {
  const scale = w / unitsAcross;
  const toPixel = (z) => ({ x: w / 2 + (z.re - center.re) * scale, y: h / 2 - (z.im - center.im) * scale });
  const fromPixel = (x, y) => {
    if (x !== null && typeof x === 'object') { y = x.y; x = x.x; }
    return { re: center.re + (x - w / 2) / scale, im: center.im - (y - h / 2) / scale };
  };
  return { toPixel, fromPixel, scale };
}

// About 8 grid lines across the width, on a 1-2-5 ladder.
// Guarantee: 5.6 <= unitsAcross / niceGridStep(unitsAcross) <= 14, and the step never decreases as units grow.
export function niceGridStep(unitsAcross) {
  const raw = unitsAcross / 8;
  const e = Math.floor(Math.log10(raw) + 1e-12);
  const p = Math.pow(10, e);
  const m = raw / p;                                          // 1 <= m < 10
  const nice = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return Number((nice * p).toPrecision(12));                  // removes 0.30000000000000004 style noise
}

// -> {r, g, b, a} (r,g,b 0..255, a 0..1) or null. Hex 3/4/6/8, rgb()/rgba() with commas or spaces, hsl()/hsla().
function parseColor(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim().toLowerCase();
  let m;
  if ((m = /^#([0-9a-f]{3,8})$/.exec(s))) {
    let hx = m[1];
    if (hx.length === 3 || hx.length === 4) hx = hx.split('').map((c) => c + c).join('');
    if (hx.length !== 6 && hx.length !== 8) return null;
    return { r: parseInt(hx.slice(0, 2), 16), g: parseInt(hx.slice(2, 4), 16), b: parseInt(hx.slice(4, 6), 16),
             a: hx.length === 8 ? parseInt(hx.slice(6, 8), 16) / 255 : 1 };
  }
  if ((m = /^rgba?\(\s*([^)]+)\)$/.exec(s))) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const ch = (p) => (p.endsWith('%') ? parseFloat(p) * 2.55 : parseFloat(p));
    const a = parts.length > 3 ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
    const out = { r: ch(parts[0]), g: ch(parts[1]), b: ch(parts[2]), a };
    return [out.r, out.g, out.b, out.a].every(Number.isFinite) ? out : null;
  }
  if ((m = /^hsla?\(\s*([^)]+)\)$/.exec(s))) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const hh = ((parseFloat(parts[0]) % 360) + 360) % 360, ss = parseFloat(parts[1]) / 100, ll = parseFloat(parts[2]) / 100;
    const a = parts.length > 3 ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
    const f = (n) => { const k = (n + hh / 30) % 12; return ll - ss * Math.min(ll, 1 - ll) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    const out = { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
    return [out.r, out.g, out.b, out.a].every(Number.isFinite) ? out : null;
  }
  return null;                                                // named colours, oklch(), color-mix(): resolved by the browser probe
}

// The only place that builds colour strings.
function formatRGBA(r, g, b, a = 1) {
  const c = (v) => clamp(Math.round(v), 0, 255);
  return a >= 1 ? `rgb(${c(r)}, ${c(g)}, ${c(b)})` : `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${Number(a.toFixed(3))})`;
}

// sRGB linear mix; t clamped to [0, 1]; a non-finite t counts as 0.
export function mixColor(a, b, t) {
  const A = toRGBA(a), B = toRGBA(b);
  const k = clamp(Number.isFinite(t) ? t : 0, 0, 1);
  return formatRGBA(A.r + (B.r - A.r) * k, A.g + (B.g - A.g) * k, A.b + (B.b - A.b) * k, A.a + (B.a - A.a) * k);
}

// The pure ramp colour: (1 - w) * base + w * mix(c0, c1, t). Each channel is linear in t, so luma is monotone in t.
function rampMix(base, c0, c1, t, weight = RAMP_WEIGHT) {
  const k = clamp(t, 0, 1), B = toRGBA(base), C0 = toRGBA(c0), C1 = toRGBA(c1);
  const mixc = (x0, x1) => x0 + (x1 - x0) * k;
  return formatRGBA(B.r * (1 - weight) + mixc(C0.r, C1.r) * weight,
                    B.g * (1 - weight) + mixc(C0.g, C1.g) * weight,
                    B.b * (1 - weight) + mixc(C0.b, C1.b) * weight, 1);
}

// 2 -> "2"; -0 -> "0"; 1.7320508 -> "1.732"; 1e-7 -> "0"; NaN -> "NaN". ASCII minus.
function formatNumber(x, digits = 3) {
  if (!Number.isFinite(x)) return String(x);
  const n = Number(x.toFixed(digits));
  return n === 0 ? '0' : String(n);                           // n === 0 is also true for -0
}

// Exact p*pi/q (q <= 12, |p| <= 24) when it exists, else a 3-decimal number.
function formatAngle(theta) {
  if (!Number.isFinite(theta)) return String(theta);
  const ratio = theta / Math.PI;
  if (Math.abs(ratio) < 1e-9) return '0';
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(ratio * q);
    if (p !== 0 && Math.abs(p) <= 24 && Math.abs(ratio * q - p) < 1e-9) {
      const g = gcd(Math.abs(p), q), pp = p / g, qq = q / g;
      const num = Math.abs(pp) === 1 ? 'π' : `${Math.abs(pp)}π`;
      return (pp < 0 ? '-' : '') + (qq === 1 ? num : `${num}/${qq}`);
    }
  }
  return formatNumber(theta, 3);
}

// { r, theta } with theta = Arg z in (-pi, pi]. Arg 0 = 0 by convention.
function polarOf(z) {
  const r = Math.hypot(z.re, z.im);
  if (r === 0) return { r: 0, theta: 0 };
  let theta = Math.atan2(z.im, z.re);
  // Negative real axis, rounding noise included: Arg = +pi, never -pi (atan2(-0, -1) is -pi in JS).
  if (z.re < 0 && Math.abs(z.im) <= 1e-12 * r) theta = Math.PI;
  return { r, theta };
}

function visibleBounds(view, w, h) {
  const s = w / view.unitsAcross, hx = w / 2 / s, hy = h / 2 / s;
  return { xMin: view.center.re - hx, xMax: view.center.re + hx, yMin: view.center.im - hy, yMax: view.center.im + hy };
}

// Keeps the complex point under pixel (px, py) fixed; factor > 1 zooms in.
function zoomView(view, w, h, factor, px, py, { minUnitsAcross = 0.5, maxUnitsAcross = 200 } = {}) {
  const s0 = w / view.unitsAcross;
  const zr = view.center.re + (px - w / 2) / s0, zi = view.center.im - (py - h / 2) / s0;
  const u1 = clamp(view.unitsAcross / factor, minUnitsAcross, maxUnitsAcross), s1 = w / u1;
  return { center: { re: zr - (px - w / 2) / s1, im: zi + (py - h / 2) / s1 }, unitsAcross: u1 };
}

// Bounding box of the finite points, spans floored at 2 units, padded; null when there is nothing finite.
function fitView(points, w, h, padding = 0.15, { minUnitsAcross = 0.5, maxUnitsAcross = 200 } = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of points) {
    if (!p || !Number.isFinite(p.re) || !Number.isFinite(p.im)) continue;
    x0 = Math.min(x0, p.re); x1 = Math.max(x1, p.re); y0 = Math.min(y0, p.im); y1 = Math.max(y1, p.im);
  }
  if (x0 === Infinity) return null;
  const ex = Math.max(x1 - x0, 2), ey = Math.max(y1 - y0, 2);
  const wantX = ex * (1 + 2 * padding), wantY = ey * (1 + 2 * padding);
  return { center: { re: (x0 + x1) / 2, im: (y0 + y1) / 2 },
           unitsAcross: clamp(Math.max(wantX, wantY * w / h), minUnitsAcross, maxUnitsAcross) };
}

// Alpha of the k-th extra winding (k = 1, 2, ...); never above 0.35, fading 20% per winding to a floor of 40%.
function ghostAlpha(k, base = 0.3) {
  const a = Math.min(0.35, Number.isFinite(base) ? Math.max(0, base) : 0.3);
  return a * Math.max(0.4, 1 - 0.2 * (k - 1));
}

// {re, im} on the polyline at parameter t, or null. First segment with t_i <= t <= t_{i+1}.
function pointAtT(points, t) {
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1];
    if (!(a.t <= t && t <= b.t) || !Number.isFinite(a.re + a.im + b.re + b.im)) continue;
    const d = b.t - a.t, u = d > 0 ? (t - a.t) / d : 0;
    return { re: a.re + (b.re - a.re) * u, im: a.im + (b.im - a.im) * u };
  }
  return null;
}

// Pixel polyline of a circle arc. Angles are MATH angles (counter-clockwise, y up); screen y is down.
function arcPoints(cx, cy, R, from, to, stepPx = ARC_STEP_PX) {
  const n = clamp(Math.ceil(Math.abs(to - from) * R / stepPx), 4, 720), out = [];
  for (let j = 0; j <= n; j++) {
    const phi = from + (to - from) * j / n;
    out.push({ x: cx + R * Math.cos(phi), y: cy - R * Math.sin(phi) });
  }
  return out;
}

function cartText(z) {
  const re = formatNumber(z.re), imR = Number(formatNumber(z.im));
  return `${re} ${imR < 0 ? '-' : '+'} ${formatNumber(Math.abs(imR))}i`;
}

// "[name: ]z = <re> <+|-> <|im|>i; r = <r>, θ = <θ> (Arg)", with the exact p*pi/q form when there is one.
function handleAriaLabel(z, name = '') {
  const { r, theta } = polarOf(z);
  const dec = formatNumber(theta), exact = formatAngle(theta);
  const angle = exact !== dec ? `${dec} (${exact}, Arg)` : `${dec} (Arg)`;
  return `${name && name !== 'z' ? name + ': ' : ''}z = ${cartText(z)}; r = ${formatNumber(r)}, θ = ${angle}`;
}

// ---------------------------------------------------------------------------------------------
// 3. Token and colour resolution (browser; in Node every helper degrades to the identity)
// ---------------------------------------------------------------------------------------------

const hasDOM = () => typeof document !== 'undefined' && !!document.documentElement && typeof getComputedStyle === 'function';
const colorCache = new Map();        // token -> resolved string; cleared at the start of every frame and on any theme signal
const warned = new Set();
const SURFACE_LIKE = new Set(['--surface', '--surface-2', '--bg']);

function beginFrame() { colorCache.clear(); }

// '--cart' -> the computed value of the custom property; any other string is returned as is.
export function cssColor(x) {
  if (typeof x !== 'string') return String(x);
  let s = x.trim();
  const v = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(s);
  if (v) s = v[1];
  if (!s.startsWith('--')) return x;
  if (!hasDOM()) return s;
  if (colorCache.has(s)) return colorCache.get(s);
  let val = getComputedStyle(document.documentElement).getPropertyValue(s).trim();
  if (!val) {
    val = SURFACE_LIKE.has(s) ? 'transparent' : getComputedStyle(document.documentElement).color;
    if (!warned.has(s)) { warned.add(s); console.warn(`plane.js: token ${s} is not defined`); }
  }
  colorCache.set(s, val);
  return val;
}

function tokenNumber(name, fallback) {
  if (!hasDOM()) return fallback;
  const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(n) ? n : fallback;
}

function fontFamily() {
  if (!hasDOM()) return 'sans-serif';
  return getComputedStyle(document.documentElement).getPropertyValue('--font').trim() || 'system-ui, sans-serif';
}

let probeCtx = null;
const probeCache = new Map();
// Any CSS colour the browser understands -> {r, g, b, a} or null (browser only).
function probe(str) {
  if (!hasDOM()) return null;
  if (probeCache.has(str)) return probeCache.get(str);
  let out = null;
  try {
    if (!probeCtx) {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      probeCtx = c.getContext('2d', { willReadFrequently: true });
    }
    probeCtx.fillStyle = 'transparent';
    const sentinel = probeCtx.fillStyle;
    probeCtx.fillStyle = str;
    if (probeCtx.fillStyle !== sentinel || String(str).trim().toLowerCase() === 'transparent') {   // an invalid string is ignored
      probeCtx.clearRect(0, 0, 1, 1);
      probeCtx.fillRect(0, 0, 1, 1);
      const d = probeCtx.getImageData(0, 0, 1, 1).data;
      out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
  } catch (e) { out = null; }
  if (probeCache.size > 64) probeCache.clear();
  probeCache.set(str, out);
  return out;
}

function toRGBA(str) {
  const c = parseColor(str) || probe(str);
  if (c) return c;
  if (hasDOM()) {
    const t = getComputedStyle(document.documentElement).color;
    const fb = parseColor(t) || probe(t);
    if (fb) return fb;
  }
  throw new TypeError(`plane.js: cannot parse colour "${str}"`);
}

// base mixed toward --t0 at t = 0 and --t1 at t = 1 (weight 0.65); monotone lightness.
export function rampColor(baseColor, t, weight = RAMP_WEIGHT) {
  const base = cssColor(baseColor);
  if (!hasDOM()) return base;
  const k = Math.round(clamp(Number.isFinite(t) ? t : 0, 0, 1) * 64) / 64;     // quantised so the per-frame cache is effective
  const key = `ramp|${base}|${k}|${weight}`;
  if (colorCache.has(key)) return colorCache.get(key);
  const out = rampMix(base, cssColor('--t0'), cssColor('--t1'), k, weight);
  colorCache.set(key, out);
  return out;
}

function surfaceIsDark() {
  if (!hasDOM()) return false;
  try {
    const c = toRGBA(cssColor('--surface'));
    return c.a > 0 && 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 128;
  } catch (e) { return false; }
}

// Called before EVERY stroke, so a previous dashed stroke can never leak into a solid one.
function applyStroke(ctx, { color, width, dash, alpha = 1 }) {
  ctx.strokeStyle = cssColor(color);
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.setLineDash(dash ? Array.from(dash) : []);
}

export const internals = Object.freeze({ parseColor, rampMix, visibleBounds, zoomView, fitView, polarOf,
  formatNumber, formatAngle, ghostAlpha, pointAtT, arcPoints, handleAriaLabel, formatRGBA });

// ---------------------------------------------------------------------------------------------
// 4. Drawing helpers (standalone exports; ctx is the 2d context in CSS pixels)
//
// Every helper leaves the context state as it found it (save/restore), sets every stroke property
// explicitly before every stroke, and talks to the plane only through toPixel, getSize and getView,
// so a stub plane and a recording fake ctx are enough to test it.
// ---------------------------------------------------------------------------------------------

const TWO_PI = Math.PI * 2;
const okPt = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

function labelFont(w) { return `${w < 420 ? 12 : 13}px ${fontFamily()}`; }

// Text with a 3-px --surface halo underneath so it stays legible over grid lines and curves.
function haloText(ctx, text, x, y, { color, alpha = 1 }) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = cssColor('--surface');
  ctx.globalAlpha = alpha;
  ctx.setLineDash([]);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = cssColor(color);
  ctx.globalAlpha = alpha;
  ctx.fillText(text, x, y);
}

// Draws one label at pixel (x, y); with clamp the whole label stays inside the canvas.
function drawText(ctx, plane, text, x, y, { color = '--text', font, align = 'left', baseline = 'alphabetic', alpha = 1, clamp: doClamp = true, knockout = false } = {}) {
  const { w, h } = plane.getSize();
  ctx.font = font || labelFont(w);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const wd = doClamp || knockout ? ctx.measureText(text).width : 0;
  if (doClamp) {
    const lo = align === 'left' ? 4 : align === 'center' ? 4 + wd / 2 : 4 + wd;
    const hi = align === 'left' ? w - 4 - wd : align === 'center' ? w - 4 - wd / 2 : w - 4;
    x = clamp(x, lo, Math.max(lo, hi));
    y = clamp(y, 14, h - 4);
  }
  if (knockout) {
    // A --surface backing so the label stays readable over a tick label that sits at the same spot.
    const fs = w < 420 ? 12 : 13;
    const x0 = align === 'left' ? x : align === 'center' ? x - wd / 2 : x - wd;
    const top = baseline === 'middle' ? y - fs / 2 - 2 : y - fs + 1, bottom = baseline === 'middle' ? y + fs / 2 + 2 : y + 4;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = cssColor('--surface');
    ctx.fillRect(x0 - 3, top, wd + 6, bottom - top);
  }
  haloText(ctx, text, x, y, { color, alpha });
}

// tip: arrow tip in pixels; u: unit direction in SCREEN space; L: length; W: width.
function arrowHead(ctx, tip, u, L, W, color) {
  const bx = tip.x - L * u.x, by = tip.y - L * u.y, nx = -u.y, ny = u.x;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(bx + (W / 2) * nx, by + (W / 2) * ny);
  ctx.lineTo(bx - (W / 2) * nx, by - (W / 2) * ny);
  ctx.closePath();
  ctx.fillStyle = cssColor(color);
  ctx.globalAlpha = 1;
  ctx.fill();
}

function strokePolyline(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

const withCtx = (ctx, fn) => { ctx.save(); try { fn(); } finally { ctx.restore(); } };

export function drawLabel(ctx, plane, z, text, { color = '--text', dx = 8, dy = -8, font, align = 'left', clamp: doClamp = true } = {}) {
  const p = plane.toPixel(z);
  if (!okPt(p)) return;
  withCtx(ctx, () => drawText(ctx, plane, String(text), p.x + dx, p.y + dy, { color, font, align, clamp: doClamp }));
}

export function drawDot(ctx, plane, z, { color = '--text', radius = 5, label, labelOffset = { dx: 8, dy: -8 }, halo = true } = {}) {
  const p = plane.toPixel(z);
  if (!okPt(p)) return;
  withCtx(ctx, () => {
    ctx.globalAlpha = 1;
    if (halo) {
      ctx.beginPath(); ctx.arc(p.x, p.y, radius + 1.5, 0, TWO_PI);
      ctx.fillStyle = cssColor('--surface'); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, TWO_PI);
    ctx.fillStyle = cssColor(color); ctx.fill();
  });
  if (label) drawLabel(ctx, plane, z, label, { dx: (labelOffset && labelOffset.dx) ?? 8, dy: (labelOffset && labelOffset.dy) ?? -8 });
}

export function drawSegment(ctx, plane, a, b, { color = '--text', dash = null, arrow = false, width = 2 } = {}) {
  const A = plane.toPixel(a), B = plane.toPixel(b);
  if (!okPt(A) || !okPt(B)) return;
  withCtx(ctx, () => {
    applyStroke(ctx, { color, width, dash });
    ctx.lineCap = 'round';
    strokePolyline(ctx, [A, B]);
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    if (arrow && len >= 6) arrowHead(ctx, B, { x: (B.x - A.x) / len, y: (B.y - A.y) / len }, 9 + 1.5 * width, 6 + 1.2 * width, color);
  });
}

// A long ray from `from` (default 0) at a math angle (counter-clockwise), clipped by the canvas.
export function drawRay(ctx, plane, angle, { color = '--polar', dash = null, width = 1.5, from = { re: 0, im: 0 } } = {}) {
  const O = plane.toPixel(from);
  if (!okPt(O)) return;
  const { w, h } = plane.getSize();
  const L = 2 * (w + h) + Math.hypot(O.x, O.y);
  withCtx(ctx, () => {
    applyStroke(ctx, { color, width, dash });
    strokePolyline(ctx, [O, { x: O.x + L * Math.cos(angle), y: O.y - L * Math.sin(angle) }]);
  });
}

export function drawCircle(ctx, plane, center, radius, { color = '--polar', dash = null, fill = null, fillAlpha = 0.12, width = 2, alpha = 1, innerRadius = null } = {}) {
  const C = plane.toPixel(center);
  const R = radius * plane.getView().scale;
  if (!okPt(C) || !Number.isFinite(R) || R > 1e6 || R < 0) return;
  withCtx(ctx, () => {
    if (fill) {
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle = cssColor(fill === true ? color : fill);
      ctx.beginPath();
      ctx.arc(C.x, C.y, R, 0, TWO_PI);
      if (innerRadius != null && Number.isFinite(innerRadius)) {
        const ri = innerRadius * plane.getView().scale;
        ctx.moveTo(C.x + ri, C.y);
        ctx.arc(C.x, C.y, ri, 0, TWO_PI);
        ctx.fill('evenodd');
      } else {
        ctx.fill();
      }
    }
    applyStroke(ctx, { color, width, dash, alpha });          // the outline is the OUTER circle only
    ctx.beginPath();
    ctx.arc(C.x, C.y, R, 0, TWO_PI);
    ctx.stroke();
  });
}

// radius in units; from/to are math angles in radians (counter-clockwise).
export function drawArc(ctx, plane, center, radius, from, to, { color = '--polar', arrow = false, width = 2 } = {}) {
  const C = plane.toPixel(center);
  const R = radius * plane.getView().scale;
  if (!okPt(C) || !Number.isFinite(R) || R > 1e6 || !Number.isFinite(from) || !Number.isFinite(to)) return;
  withCtx(ctx, () => {
    const pts = arcPoints(C.x, C.y, R, from, to);
    applyStroke(ctx, { color, width, dash: null });
    strokePolyline(ctx, pts);
    if (arrow && Math.abs(to - from) * R >= 12) {
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      arrowHead(ctx, b, { x: (b.x - a.x) / len, y: (b.y - a.y) / len }, 7, 5, color);
    }
  });
}

export function drawPolygonFill(ctx, plane, points, { color = '--input', alpha = 0.12 } = {}) {
  const P = (points || []).map((z) => plane.toPixel(z)).filter(okPt);
  if (P.length < 3) return;
  withCtx(ctx, () => {
    ctx.beginPath();
    P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = cssColor(color);
    ctx.fill();
  });
}

// The cut: a dashed ray from 0 where Arg jumps (default the negative real axis).
export function drawSeam(ctx, plane, angle = Math.PI, { color = '--seam', width = 2, dash = DASH.seam, label = 'seam' } = {}) {
  const O = plane.toPixel({ re: 0, im: 0 });
  if (!okPt(O)) return;
  const { w, h } = plane.getSize();
  const L = 2 * (w + h) + Math.hypot(O.x, O.y);
  withCtx(ctx, () => {
    applyStroke(ctx, { color, width, dash, alpha: 0.9 });
    strokePolyline(ctx, [O, { x: O.x + L * Math.cos(angle), y: O.y - L * Math.sin(angle) }]);
    if (label) {
      // 64 px along the seam, nudged 10 px to its clockwise side (above the negative real axis).
      const px = O.x + 64 * Math.cos(angle) + 10 * Math.sin(angle);
      const py = O.y - 64 * Math.sin(angle) + 10 * Math.cos(angle);
      if (px >= 0 && px <= w && py >= 0 && py <= h) drawText(ctx, plane, label, px, py, { color, align: 'center' });
    }
  });
}

// Thread 1, the Cartesian address: dashed drop lines to both axes with x and y labels (colour --cart, dashed so it
// is not colour alone). "Slide x along the real axis, then y up."
export function drawCartAddress(ctx, plane, z, { color = '--cart', labels = true } = {}) {
  if (!finiteZ(z)) return;
  const Z = plane.toPixel(z), Fx = plane.toPixel({ re: z.re, im: 0 }), Fy = plane.toPixel({ re: 0, im: z.im });
  if (!okPt(Z) || !okPt(Fx) || !okPt(Fy)) return;
  const dFx = Math.hypot(Z.x - Fx.x, Z.y - Fx.y), dFy = Math.hypot(Z.x - Fy.x, Z.y - Fy.y);
  withCtx(ctx, () => {
    ctx.lineCap = 'butt';
    if (dFx >= 2) { applyStroke(ctx, { color, width: 1.5, dash: DASH.cart, alpha: 1 }); strokePolyline(ctx, [Z, Fx]); }
    if (dFy >= 2) { applyStroke(ctx, { color, width: 1.5, dash: DASH.cart, alpha: 1 }); strokePolyline(ctx, [Z, Fy]); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = cssColor(color);
    if (dFx >= 2) { ctx.beginPath(); ctx.arc(Fx.x, Fx.y, 3, 0, TWO_PI); ctx.fill(); }
    if (dFy >= 2) { ctx.beginPath(); ctx.arc(Fy.x, Fy.y, 3, 0, TWO_PI); ctx.fill(); }
    if (labels) {
      if (Math.abs(z.re) >= 5e-4) {
        drawText(ctx, plane, `x = ${formatNumber(z.re)}`, Fx.x, z.im >= 0 ? Fx.y + 14 : Fx.y - 8, { color, align: 'center', knockout: true });
      }
      if (Math.abs(z.im) >= 5e-4) {
        drawText(ctx, plane, `y = ${formatNumber(z.im)}`, z.re >= 0 ? Fy.x - 8 : Fy.x + 8, Fy.y,
          { color, align: z.re >= 0 ? 'right' : 'left', baseline: 'middle', knockout: true });
      }
    }
  });
}

// Thread 1 and Thread 2, the polar address: the ray 0 -> z labelled r, a solid arc from the positive real axis to
// the ray labelled Arg z, and `ghosts` fainter extra windings (theta + 2 pi k) labelled "also ..." so arg z reads as
// a SET while the point itself is drawn once. ghostsNeg draws windings below (theta - 2 pi k).
// Every line, arc and ghost is a polyline (never ctx.arc), so the geometry can be asserted in tests.
export function drawPolarAddress(ctx, plane, z, { color = '--polar', labels = true, ghosts = 0, ghostsNeg = 0, arcRadiusPx = 28, name = 'z' } = {}) {
  if (!finiteZ(z)) return;
  const O = plane.toPixel({ re: 0, im: 0 }), Z = plane.toPixel(z);
  if (!okPt(O) || !okPt(Z)) return;
  const { r, theta } = polarOf(z);
  const rayPx = Math.hypot(Z.x - O.x, Z.y - O.y);
  if (rayPx < 6) return;                                       // z is (nearly) 0: nothing meaningful to draw
  const R = Math.min(arcRadiusPx, Math.max(8, 0.6 * rayPx));
  const nPos = clamp(Math.floor(Number(ghosts) || 0), 0, MAX_GHOSTS), nNeg = clamp(Math.floor(Number(ghostsNeg) || 0), 0, MAX_GHOSTS);
  const base = tokenNumber('--ghost-alpha', 0.3);
  withCtx(ctx, () => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 1. the ghosts first, so the solid arc ends on top of them
    const ghostList = [];
    for (let j = 1; j <= nPos; j++) ghostList.push({ radius: R + GHOST_STEP_PX * j, end: theta + TWO_PI * j, text: `also ${formatAngle(theta + TWO_PI * j)}`, alpha: ghostAlpha(j, base) });
    for (let j = 1; j <= nNeg; j++) ghostList.push({ radius: R + GHOST_STEP_PX * (nPos + j), end: theta - TWO_PI * j, text: `also ${formatAngle(theta - TWO_PI * j)}`, alpha: ghostAlpha(j, base) });
    for (const g of ghostList) {
      applyStroke(ctx, { color, width: 1.5, dash: null, alpha: g.alpha });
      strokePolyline(ctx, arcPoints(O.x, O.y, g.radius, 0, g.end));
    }
    // 2. the ray: "walk r"
    applyStroke(ctx, { color, width: 2, dash: null, alpha: 1 });
    strokePolyline(ctx, [O, Z]);
    // 3. the Arg arc: the one highlighted step
    if (Math.abs(theta) * R >= 3) {
      const pts = arcPoints(O.x, O.y, R, 0, theta);
      applyStroke(ctx, { color, width: 2.5, dash: null, alpha: 1 });
      strokePolyline(ctx, pts);
      if (Math.abs(theta) * R >= 12) {
        const sgn = theta >= 0 ? 1 : -1;
        arrowHead(ctx, pts[pts.length - 1], { x: -sgn * Math.sin(theta), y: -sgn * Math.cos(theta) }, 7, 5, color);
      }
    }
    // 4. labels
    if (labels) {
      const sgn = theta >= 0 ? 1 : -1;
      const mx = (O.x + Z.x) / 2 + 11 * sgn * -Math.sin(theta), my = (O.y + Z.y) / 2 + 11 * sgn * -Math.cos(theta);
      drawText(ctx, plane, `r = ${formatNumber(r)}`, mx, my, { color, align: 'center' });
      const dist = R + GHOST_STEP_PX * (nPos + nNeg) + 14;
      const ax = O.x + dist * Math.cos(theta / 2), ay = O.y - dist * Math.sin(theta / 2);
      const align = Math.cos(theta / 2) >= 0 ? 'left' : 'right';
      drawText(ctx, plane, `Arg ${name} = ${formatAngle(theta)}`, ax, ay, { color, align });
      ghostList.slice(0, 3).forEach((g, i) => drawText(ctx, plane, g.text, ax, ay + 14 * (i + 1), { color, align, alpha: ALSO_TEXT_ALPHA }));
    }
  });
}

// Thread 3, time: the stroke is drawn in 32 colour bins from the base colour mixed toward --t0 (start) to --t1 (end),
// with dots at t = 0, 1/4, 1/2, 3/4, an arrowhead at t = 1 and an optional cursor ring at t = cursor.
// Lightness (not hue) carries time, so it also reads in grey scale.
export function drawTimedCurve(ctx, plane, points, { color = '--input', width = 2, dots = true, arrow = true, closed = false, ramp = true, dash = null, alpha = 1, cursor = null } = {}) {
  const n = points ? points.length : 0;
  if (n === 0) return;
  const P = new Array(n);
  for (let i = 0; i < n; i++) {
    const q = plane.toPixel(points[i]);
    const t = Number.isFinite(points[i].t) ? points[i].t : (n > 1 ? i / (n - 1) : 0);
    P[i] = { x: q.x, y: q.y, t, ok: okPt(q) && Math.abs(q.x) < MAX_COORD_PX && Math.abs(q.y) < MAX_COORD_PX };
  }
  const base = cssColor(color);
  if (n === 1) { if (P[0].ok) drawDot(ctx, plane, points[0], { color, radius: 4.5 }); return; }
  const bins = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = P[i], b = P[(i + 1) % n];
    if (!(a.ok && b.ok)) continue;
    const tm = closed && i === n - 1 ? 1 : (a.t + b.t) / 2;
    const bin = ramp ? Math.min(RAMP_BINS - 1, Math.floor(clamp(tm, 0, 1) * RAMP_BINS)) : 0;
    (bins[bin] || (bins[bin] = [])).push({ a, b });
  }
  const tvals = points.every((p) => Number.isFinite(p.t)) ? points : points.map((p, i) => ({ re: p.re, im: p.im, t: P[i].t }));
  withCtx(ctx, () => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let k = 0; k < bins.length; k++) {
      const segs = bins[k];
      if (!segs) continue;
      applyStroke(ctx, { color: ramp ? rampColor(base, (k + 0.5) / RAMP_BINS) : base, width, dash, alpha });
      ctx.beginPath();
      let prev = null;
      for (const s of segs) {
        if (prev !== s.a) ctx.moveTo(s.a.x, s.a.y);
        ctx.lineTo(s.b.x, s.b.y);
        prev = s.b;
      }
      ctx.stroke();
    }
    if (dots) {
      for (const tk of [0, 0.25, 0.5, 0.75]) {
        const z = pointAtT(tvals, tk);
        if (!z) continue;
        const p = plane.toPixel(z);
        if (!okPt(p)) continue;
        const rad = tk === 0 ? 4.5 : 3.2;
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad + 1.5, 0, TWO_PI);
        ctx.fillStyle = cssColor('--surface'); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, TWO_PI);
        ctx.fillStyle = ramp ? rampColor(base, tk) : base; ctx.fill();
      }
    }
    if (arrow) {
      let tip = null;
      for (let i = last - 1; i >= 0; i--) {
        const a = P[i], b = P[(i + 1) % n];
        if (!(a.ok && b.ok)) continue;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len >= 1) { tip = { b, u: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } }; break; }
      }
      if (tip) arrowHead(ctx, tip.b, tip.u, 9 + 1.5 * width, 6 + 1.2 * width, ramp ? rampColor(base, 1) : base);
    }
    if (cursor != null && Number.isFinite(cursor)) {
      const z = pointAtT(tvals, clamp(cursor, 0, 1));
      const p = z && plane.toPixel(z);
      if (okPt(p)) {
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, TWO_PI);
        ctx.fillStyle = cssColor('--surface'); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TWO_PI);
        ctx.fillStyle = ramp ? rampColor(base, clamp(cursor, 0, 1)) : base; ctx.fill();
        applyStroke(ctx, { color: '--text', width: 2, dash: null, alpha: 1 });
        ctx.stroke();
      }
    }
  });
}

// ---------------------------------------------------------------------------------------------
// 5. The shared theme hub: ONE document-level listener set for all planes
// ---------------------------------------------------------------------------------------------

const hub = { planes: new Set(), attached: false, mo: null, mq: null };

function hubSignal() {
  colorCache.clear();
  probeCache.clear();
  for (const p of [...hub.planes]) p.requestDraw();
}

function hubAttach() {
  if (hub.attached || !hasDOM()) return;
  hub.attached = true;
  document.addEventListener('themechange', hubSignal);
  try {
    hub.mo = new MutationObserver(hubSignal);
    hub.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  } catch (e) { hub.mo = null; }
  try {
    hub.mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    if (hub.mq) { if (hub.mq.addEventListener) hub.mq.addEventListener('change', hubSignal); else if (hub.mq.addListener) hub.mq.addListener(hubSignal); }
  } catch (e) { hub.mq = null; }
}

function hubDetach() {
  if (!hub.attached) return;
  hub.attached = false;
  document.removeEventListener('themechange', hubSignal);
  if (hub.mo) { hub.mo.disconnect(); hub.mo = null; }
  if (hub.mq) {
    if (hub.mq.removeEventListener) hub.mq.removeEventListener('change', hubSignal); else if (hub.mq.removeListener) hub.mq.removeListener(hubSignal);
    hub.mq = null;
  }
}

function hubJoin(plane) { hub.planes.add(plane); hubAttach(); }
function hubLeave(plane) { hub.planes.delete(plane); if (!hub.planes.size) hubDetach(); }

function ensureStyle() {
  if (!hasDOM() || !document.head) return;
  if (document.head.querySelector('style[data-for="plane"]')) return;
  const st = document.createElement('style');
  st.setAttribute('data-for', 'plane');
  st.textContent = PLANE_CSS;
  document.head.appendChild(st);
}

function mkButton(className, id, text, name, title) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.id = id;
  b.textContent = text;
  b.setAttribute('aria-label', name);
  if (title) b.title = title;
  return b;
}

const ARROW_DIRS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

// ---------------------------------------------------------------------------------------------
// 6. createPlane
// ---------------------------------------------------------------------------------------------

export function createPlane(container, options) {
  if (!container || container.nodeType !== 1) throw new TypeError('createPlane: container must be an Element');
  const o = options && typeof options === 'object' ? options : {};
  const id = o.id;
  if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) throw new TypeError('createPlane: options.id is required (letters, digits, - and _)');
  const opt = (k, d) => (o[k] === undefined ? d : o[k]);
  const okRange = (r) => Array.isArray(r) && r.length === 2 && Number.isFinite(r[0]) && Number.isFinite(r[1]) && r[0] < r[1];
  const xRange = opt('xRange', [-4, 4]), yRange = opt('yRange', [-4, 4]);
  if (!okRange(xRange)) throw new RangeError('createPlane: xRange must be [min, max] with min < max');
  if (!okRange(yRange)) throw new RangeError('createPlane: yRange must be [min, max] with min < max');
  const GRIDS = ['cart', 'polar', 'both', 'none'];
  let grid = opt('grid', 'cart');
  if (!GRIDS.includes(grid)) throw new TypeError(`createPlane: grid must be one of ${GRIDS.join(', ')}`);

  const showAxes = !!opt('axes', true);
  const axisLabels = Array.isArray(o.axisLabels) && o.axisLabels.length >= 2 ? [String(o.axisLabels[0]), String(o.axisLabels[1])] : ['Re', 'Im'];
  const interactive = !!opt('interactive', true);
  const limits = {
    minUnitsAcross: Number.isFinite(o.minUnitsAcross) && o.minUnitsAcross > 0 ? o.minUnitsAcross : 0.5,
    maxUnitsAcross: Number.isFinite(o.maxUnitsAcross) && o.maxUnitsAcross > 0 ? o.maxUnitsAcross : 200,
  };
  const showControls = interactive && !!opt('controls', true);
  const showLegend = !!opt('legend', true);
  const showTickLabels = !!opt('tickLabels', true);
  const wheelMode = ['focus', 'always', 'ctrl', 'off'].includes(o.wheel) ? o.wheel : 'focus';
  const ariaLabel = String(opt('ariaLabel', 'Complex plane'));
  const xSpan = xRange[1] - xRange[0], ySpan = yRange[1] - yRange[0];
  const aspect = Number.isFinite(o.aspect) && o.aspect > 0 ? o.aspect : xSpan / ySpan;

  ensureStyle();

  // ---- state ----
  let center = { re: (xRange[0] + xRange[1]) / 2, im: (yRange[0] + yRange[1]) / 2 };
  let unitsAcross = clamp(Math.max(xSpan, ySpan * aspect), limits.minUnitsAcross, limits.maxUnitsAcross);
  let home = { center: copyZ(center), unitsAcross };
  let w = 0, h = 0, dpr = 1, measured = false, drawMode = false, destroyed = false, noCanvas = false;
  let T = null;
  const layers = [];
  let layerSeq = 0, layersDirty = true;
  const handles = new Map();
  const listeners = { pointerdown: new Set(), pointermove: new Set(), pointerup: new Set(), pointercancel: new Set(), viewchange: new Set() };
  let dirty = false, rafId = 0, announceTimer = 0;
  const stats = { draws: 0, lastDrawMs: 0, resizes: 0, destroyed: false };

  // ---- DOM ----
  const el = document.createElement('div');
  el.className = 'plane' + (interactive ? '' : ' is-static');
  el.id = `${id}-viewport`;
  el.dataset.planeId = id;
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', interactive ? `${ariaLabel}. ${MSG_KEYS}` : ariaLabel);
  if (interactive) el.tabIndex = 0;
  el.style.setProperty('--plane-aspect', String(aspect));
  const mw = opt('maxWidth', 640);
  el.style.setProperty('--plane-max-width', typeof mw === 'number' ? `${mw}px` : String(mw));
  const bg = String(opt('background', '--surface')).trim();
  if (bg !== '--surface') el.style.setProperty('--plane-bg', bg.startsWith('--') ? `var(${bg})` : bg);

  const canvas = document.createElement('canvas');
  canvas.className = 'plane-canvas';
  canvas.id = `${id}-canvas`;
  canvas.setAttribute('aria-hidden', 'true');
  const handlesLayer = document.createElement('div');
  handlesLayer.className = 'plane-handles';
  const status = document.createElement('div');
  status.className = 'plane-sr';
  status.id = `${id}-status`;
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const note = document.createElement('div');
  note.className = 'plane-note';
  note.setAttribute('role', 'status');
  note.hidden = true;
  el.append(canvas, handlesLayer);

  let btnIn = null, btnOut = null, btnReset = null;
  if (showControls) {
    const controls = document.createElement('div');
    controls.className = 'plane-controls';
    btnIn = mkButton('plane-btn', `${id}-zoom-in`, '+', 'Zoom in', 'Zoom in (+)');
    btnOut = mkButton('plane-btn', `${id}-zoom-out`, '−', 'Zoom out', 'Zoom out (-)');
    btnReset = mkButton('plane-btn', `${id}-zoom-reset`, 'Reset', 'Reset view', 'Back to the starting view (0)');
    controls.append(btnIn, btnOut, btnReset);
    el.append(controls);
  }
  el.append(status, note);
  container.appendChild(el);

  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) { noCanvas = true; note.textContent = MSG_NO_CANVAS; note.hidden = false; }

  // ---- geometry ----
  const size = () => (measured ? { w, h } : { w: NOMINAL_W, h: NOMINAL_W / aspect });
  function refreshTransform() { const s = size(); T = makeTransform({ center, unitsAcross }, s.w, s.h); }
  refreshTransform();
  const toPixel = (z) => T.toPixel(z);
  const fromPixel = (x, y) => T.fromPixel(x, y);
  const getView = () => ({ center: copyZ(center), unitsAcross, scale: T.scale });

  function syncDataAttrs() {
    el.dataset.centerRe = String(round6(center.re));
    el.dataset.centerIm = String(round6(center.im));
    el.dataset.scale = T.scale.toFixed(4);
    el.dataset.unitsAcross = String(round6(unitsAcross));
  }
  function refreshZoomButtons() {
    if (!btnIn) return;
    btnIn.setAttribute('aria-disabled', unitsAcross <= limits.minUnitsAcross + 1e-9 ? 'true' : 'false');
    btnOut.setAttribute('aria-disabled', unitsAcross >= limits.maxUnitsAcross - 1e-9 ? 'true' : 'false');
  }
  function emit(type, payload) {
    for (const cb of [...listeners[type]]) {
      try { cb(payload); } catch (err) { console.error(`plane "${id}": ${type} listener threw`, err); }
    }
  }
  function announce(text) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { status.textContent = ''; status.textContent = text; }, ANNOUNCE_DEBOUNCE_MS);
  }
  const announceView = () => announce(`View: centre ${cartText(center)}, ${formatNumber(unitsAcross)} units across.`);

  // The ONLY writer of center and unitsAcross.
  function setViewInternal(next, reason) {
    const c = next.center ?? center, u0 = next.unitsAcross ?? unitsAcross;
    if (!c || !Number.isFinite(c.re) || !Number.isFinite(c.im) || !Number.isFinite(u0)) return false;
    const u = clamp(u0, limits.minUnitsAcross, limits.maxUnitsAcross);
    const cc = { re: clamp(c.re, -1e6, 1e6), im: clamp(c.im, -1e6, 1e6) };
    if (Math.abs(cc.re - center.re) < 1e-12 && Math.abs(cc.im - center.im) < 1e-12 && Math.abs(u - unitsAcross) < 1e-12 * Math.max(1, u)) return false;
    center = cc;
    unitsAcross = u;
    refreshTransform(); syncDataAttrs(); positionHandles(); refreshZoomButtons(); requestDraw();
    emit('viewchange', { ...getView(), reason });
    return true;
  }
  function zoomAbout(factor, px, py, reason) {
    const s = size();
    const changed = setViewInternal(zoomView(getView(), s.w, s.h, factor, px, py, limits), reason);
    if (!changed && factor !== 1) announce(factor > 1 ? MSG_AT_MIN : MSG_AT_MAX);
    return changed;
  }
  const panByPixels = (dx, dy) => setViewInternal({ center: { re: center.re - dx / T.scale, im: center.im + dy / T.scale } }, 'pan');
  function fitTo(points, padding = 0.15) {
    if (destroyed) return;
    const s = size();
    const v = fitView(Array.isArray(points) ? points : [], s.w, s.h, padding, limits);
    if (!v) return;
    setViewInternal(v, 'fit');
    home = { center: copyZ(center), unitsAcross };
  }
  const resetView = () => { if (!destroyed) setViewInternal(home, 'reset'); };

  // ---- resize and draw loop ----
  function resize() {
    if (destroyed || noCanvas) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw < 2 || ch < 2) {                                   // hidden or zero-size: draw nothing, keep the view
      if (measured) { measured = false; refreshTransform(); positionHandles(); }
      return;
    }
    let ratio = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, MAX_DPR);
    if (cw * ratio * (ch * ratio) > MAX_CANVAS_PIXELS) ratio = Math.max(1, Math.sqrt(MAX_CANVAS_PIXELS / (cw * ch)));
    if (measured && cw === w && ch === h && ratio === dpr) return;
    w = cw; h = ch; dpr = ratio; measured = true;
    canvas.width = Math.round(cw * dpr);                     // resets the context state
    canvas.height = Math.round(ch * dpr);
    refreshTransform(); syncDataAttrs(); positionHandles(); requestDraw();
    stats.resizes++;
    emit('viewchange', { ...getView(), reason: 'resize' });
  }
  function requestDraw() {
    if (destroyed || dirty) return;
    dirty = true;
    rafId = requestAnimationFrame(draw);
  }
  const crisp = (v, lw) => { const lwDev = Math.round(lw * dpr); const off = lwDev % 2 === 1 ? 0.5 : 0; return (Math.round(v * dpr - off) + off) / dpr; };

  function draw() {
    rafId = 0; dirty = false;
    if (destroyed || noCanvas || !measured) return;
    const t0 = performance.now();
    beginFrame();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);                                // transparent canvas: CSS paints the surface
    ctx.save(); try { paintGrid(); paintAxes(); } finally { ctx.restore(); }
    if (layersDirty) { layers.sort((a, b) => a.order - b.order || a.seq - b.seq); layersDirty = false; }
    for (const L of layers.slice()) {
      if (L.hidden || L.failed) continue;
      ctx.save();
      try { L.draw(ctx, plane); }
      catch (err) { L.failed = true; console.error(`plane "${id}": layer failed`, err); note.textContent = MSG_LAYER_FAILED; note.hidden = false; }
      finally { ctx.restore(); }
    }
    ctx.save(); try { paintLegend(); } finally { ctx.restore(); }
    stats.draws++;
    stats.lastDrawMs = performance.now() - t0;
  }

  function paintGrid() {
    if (grid === 'none') return;
    const B = visibleBounds({ center, unitsAcross }, w, h);
    const step = niceGridStep(unitsAcross), scale = T.scale, O = T.toPixel({ re: 0, im: 0 }), dark = surfaceIsDark();
    if (grid === 'cart' || grid === 'both') {
      applyStroke(ctx, { color: '--cart', width: 1, alpha: GRID_ALPHA.cart[dark ? 1 : 0] });
      ctx.beginPath();
      for (let k = Math.ceil(B.xMin / step - 1e-9), k1 = Math.floor(B.xMax / step + 1e-9); k <= k1; k++) {
        const x = crisp(T.toPixel({ re: k * step, im: 0 }).x, 1); ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let k = Math.ceil(B.yMin / step - 1e-9), k1 = Math.floor(B.yMax / step + 1e-9); k <= k1; k++) {
        const y = crisp(T.toPixel({ re: 0, im: k * step }).y, 1); ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
    if (grid === 'polar' || grid === 'both') {
      const dx = Math.max(B.xMin, 0, -B.xMax), dy = Math.max(B.yMin, 0, -B.yMax), rMin = Math.hypot(dx, dy);   // nearest point of the view to 0
      const rMax = Math.max(Math.hypot(B.xMin, B.yMin), Math.hypot(B.xMin, B.yMax), Math.hypot(B.xMax, B.yMin), Math.hypot(B.xMax, B.yMax));
      const kLo = Math.max(1, Math.ceil(rMin / step - 1e-9)), kHi = Math.min(Math.floor(rMax / step + 1e-9), kLo + 200);
      const a = GRID_ALPHA.polar[dark ? 1 : 0];
      applyStroke(ctx, { color: '--polar', width: 1, alpha: a });
      ctx.beginPath();
      for (let k = kLo; k <= kHi; k++) {
        const r = k * step * scale;
        if (!(r < 5e6)) break;
        ctx.moveTo(O.x + r, O.y); ctx.arc(O.x, O.y, r, 0, TWO_PI);
      }
      const L = 2 * (w + h) + Math.hypot(O.x, O.y);
      for (let j = 0; j < 12; j++) { const t = j * Math.PI / 6; ctx.moveTo(O.x, O.y); ctx.lineTo(O.x + L * Math.cos(t), O.y - L * Math.sin(t)); }
      ctx.stroke();
      if (scale >= 6) {                                       // the unit circle, a little stronger
        applyStroke(ctx, { color: '--polar', width: 1.5, alpha: Math.min(0.6, a * 1.8) });
        ctx.beginPath(); ctx.arc(O.x, O.y, scale, 0, TWO_PI); ctx.stroke();
      }
    }
  }

  function tickLabel(v, step) {
    const d = clamp(-Math.floor(Math.log10(step) + 1e-9), 0, 6);
    return String(Number(v.toFixed(d)));
  }

  function paintAxes() {
    if (!showAxes) return;
    const B = visibleBounds({ center, unitsAcross }, w, h);
    const step = niceGridStep(unitsAcross), scale = T.scale, O = T.toPixel({ re: 0, im: 0 }), sp = step * scale;
    const xVis = O.y >= 0 && O.y <= h, yVis = O.x >= 0 && O.x <= w;
    const kx0 = Math.ceil(B.xMin / step - 1e-9), kx1 = Math.floor(B.xMax / step + 1e-9);
    const ky0 = Math.ceil(B.yMin / step - 1e-9), ky1 = Math.floor(B.yMax / step + 1e-9);
    applyStroke(ctx, { color: '--cart', width: 1.5, alpha: 0.75 });
    ctx.beginPath();
    if (xVis) {
      const y = crisp(O.y, 1.5);
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      for (let k = kx0; k <= kx1; k++) { if (k === 0) continue; const x = crisp(T.toPixel({ re: k * step, im: 0 }).x, 1.5); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); }
    }
    if (yVis) {
      const x = crisp(O.x, 1.5);
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      for (let k = ky0; k <= ky1; k++) { if (k === 0) continue; const y = crisp(T.toPixel({ re: 0, im: k * step }).y, 1.5); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); }
    }
    ctx.stroke();
    const fam = fontFamily();
    if (showTickLabels && sp > 0) {
      ctx.font = `11px ${fam}`;
      const every = sp >= 38 ? 1 : sp >= 19 ? 2 : 5;
      const rowY = clamp(O.y + 14, 12, h - 4), colX = clamp(O.x - 6, 28, w - 4);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      for (let k = kx0; k <= kx1; k++) {
        if (k === 0 || k % every) continue;
        const x = T.toPixel({ re: k * step, im: 0 }).x;
        if (x < 12 || x > w - 12) continue;                    // a label cut by the edge would read as a different number
        haloText(ctx, tickLabel(k * step, step), x, rowY, { color: '--text-muted' });
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let k = ky0; k <= ky1; k++) {
        if (k === 0 || k % every) continue;
        const y = T.toPixel({ re: 0, im: k * step }).y;
        if (Math.abs(y - rowY) < 8 || y < 8 || y > h - 8) continue;
        haloText(ctx, tickLabel(k * step, step), colX, y, { color: '--text-muted' });
      }
      if (xVis && yVis) { ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; haloText(ctx, '0', O.x - 6, O.y + 14, { color: '--text-muted' }); }
    }
    ctx.font = `12px ${fam}`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    haloText(ctx, axisLabels[0], w - 8, clamp(O.y - 8, 14, h - 6), { color: '--text' });
    ctx.textAlign = 'left';
    haloText(ctx, axisLabels[1], clamp(O.x + 8, 8, w - 28), 14, { color: '--text' });
  }

  function paintLegend() {
    if (!showLegend) return;
    let C = null;
    for (const L of layers) if (L.curve && !L.hidden && !L.failed && L.curve.ramp && L.curve.points.length > 1) { C = L.curve; break; }
    if (!C) return;
    const base = cssColor(C.color), fam = fontFamily();
    ctx.font = `11px ${fam}`;
    const ws = ctx.measureText('start').width, we = ctx.measureText('end').width;
    const barW = 64, barH = 6, padX = 8, gap = 6, pillH = 20, x = 12, y = h - 22;
    const pillW = padX + ws + gap + barW + gap + we + padX, r = pillH / 2;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = cssColor('--surface');
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + pillW, y, x + pillW, y + pillH, r); ctx.arcTo(x + pillW, y + pillH, x, y + pillH, r);
    ctx.arcTo(x, y + pillH, x, y, r); ctx.arcTo(x, y, x + pillW, y, r); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = cssColor('--text-muted');
    ctx.fillText('start', x + padX, y + pillH / 2 + 0.5);
    const bx = x + padX + ws + gap;
    const g = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    for (const s of [0, 0.25, 0.5, 0.75, 1]) g.addColorStop(s, rampColor(base, s));
    ctx.fillStyle = g;
    ctx.fillRect(bx, y + (pillH - barH) / 2, barW, barH);
    ctx.fillStyle = cssColor('--text-muted');
    ctx.fillText('end', bx + barW + gap, y + pillH / 2 + 0.5);
  }

  // ---- layers and curves ----
  function addLayerRec(draw, order) {
    const rec = { draw, order: Number.isFinite(order) ? order : 0, seq: layerSeq++, hidden: false, failed: false, curve: null };
    layers.push(rec); layersDirty = true; requestDraw();
    return rec;
  }
  // The public Layer object: live `order` and `hidden` accessors plus remove(); `extra` adds more members (curves).
  function layerApi(rec, extra) {
    const api = {
      remove() { const i = layers.indexOf(rec); if (i >= 0) layers.splice(i, 1); layersDirty = true; requestDraw(); },
    };
    Object.defineProperty(api, 'order', { enumerable: true, get: () => rec.order, set: (v) => { rec.order = Number(v) || 0; layersDirty = true; requestDraw(); } });
    Object.defineProperty(api, 'hidden', { enumerable: true, get: () => rec.hidden, set: (v) => { rec.hidden = !!v; requestDraw(); } });
    if (extra) Object.defineProperties(api, Object.getOwnPropertyDescriptors(extra));
    return api;
  }
  function addLayer(draw, { order = 0 } = {}) {
    if (typeof draw !== 'function') throw new TypeError(`plane "${id}": addLayer needs a draw function`);
    if (destroyed) return { order, hidden: false, remove() {} };
    return layerApi(addLayerRec(draw, order));
  }
  function addCurve(spec) {
    const s = spec || {};
    const cur = { points: Array.isArray(s.points) ? s.points : [], color: s.color ?? '--input', ramp: s.ramp !== false, width: s.width ?? 2,
                  dots: s.dots !== false, arrow: s.arrow !== false, closed: !!s.closed, dash: s.dash ?? null, alpha: s.alpha ?? 1, cursor: s.cursor ?? null };
    if (destroyed) {
      return { id: s.id, get points() { return cur.points; }, update() {}, setColor() {}, setCursor() {}, set() {}, remove() {}, hidden: false, order: 0 };
    }
    const rec = addLayerRec((c, p) => drawTimedCurve(c, p, cur.points, cur), s.order ?? 100);
    rec.curve = cur;
    return layerApi(rec, {
      id: s.id,
      get points() { return cur.points; },
      update(points) { cur.points = Array.isArray(points) ? points : []; requestDraw(); },
      setColor(c) { cur.color = c; requestDraw(); },
      setCursor(t) { cur.cursor = t == null ? null : t; requestDraw(); },
      set(patch) { if (patch) { for (const k of Object.keys(patch)) if (k in cur) cur[k] = patch[k]; } requestDraw(); },
    });
  }

  // ---- handles ----
  function placeHandle(hd) {
    const p = T.toPixel(hd.z);
    hd.el.style.transform = `translate(${clamp(p.x, -HANDLE_COORD_PX, HANDLE_COORD_PX)}px, ${clamp(p.y, -HANDLE_COORD_PX, HANDLE_COORD_PX)}px)`;
  }
  function positionHandles() { for (const hd of handles.values()) placeHandle(hd); }
  function applyZ(hd, z, withLabel) {
    hd.z = z;
    placeHandle(hd);
    hd.el.dataset.re = String(round6(z.re));
    hd.el.dataset.im = String(round6(z.im));
    if (withLabel) { hd.el.setAttribute('aria-label', handleAriaLabel(z, hd.s.name)); hd.lastLabelAt = performance.now(); }
    requestDraw();
  }
  function ensureVisible(hd) {
    const p = T.toPixel(hd.z), s = size(), margin = 12;
    const ddx = p.x < margin ? p.x - margin : p.x > s.w - margin ? p.x - (s.w - margin) : 0;
    const ddy = p.y < margin ? p.y - margin : p.y > s.h - margin ? p.y - (s.h - margin) : 0;
    if (ddx || ddy) setViewInternal({ center: { re: center.re + ddx / T.scale, im: center.im - ddy / T.scale } }, 'pan');
  }
  function callDrag(hd, z, info) {
    if (!hd.s.onDrag) return;
    hd.inCallback = true;
    try { hd.s.onDrag(copyZ(z), info); }
    catch (err) { console.error(`plane "${id}": onDrag of "${hd.s.id}" threw`, err); }
    finally { hd.inCallback = false; }
  }
  function endDrag(hd, byEscape) {
    if (!hd.drag) return;
    try { hd.el.releasePointerCapture(hd.drag.id); } catch (e) { /* already released */ }
    hd.el.classList.remove('is-dragging');
    applyZ(hd, byEscape ? hd.drag.start : hd.z, true);
    hd.drag = null;
    callDrag(hd, hd.z, { final: true, source: 'pointer' });
    announce(hd.el.getAttribute('aria-label'));
  }

  function addPoint(spec) {
    const sp = spec || {};
    if (destroyed) {
      return { id: sp.id, z: { re: 0, im: 0 }, el: document.createElement('button'), set() {}, remove() {}, hidden: true };
    }
    if (typeof sp.id !== 'string' || !sp.id) throw new TypeError(`plane "${id}": addPoint needs a spec.id string`);
    if (handles.has(sp.id)) throw new Error(`plane "${id}": duplicate point id "${sp.id}"`);
    const s = {
      id: sp.id, z: sp.z, draggable: sp.draggable !== false, color: String(sp.color ?? '--input').trim(), label: sp.label ?? '',
      radius: Number.isFinite(sp.radius) && sp.radius > 0 ? sp.radius : HANDLE_RADIUS,
      step: Number.isFinite(sp.step) && sp.step > 0 ? sp.step : 0.1,
      snap: typeof sp.snap === 'function' ? sp.snap : null, onDrag: typeof sp.onDrag === 'function' ? sp.onDrag : null,
      onFocus: typeof sp.onFocus === 'function' ? sp.onFocus : null, onDragStart: typeof sp.onDragStart === 'function' ? sp.onDragStart : null,
      focusable: sp.focusable !== false,
    };
    s.name = sp.name ?? s.label;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'plane-handle' + (s.draggable ? ' is-draggable' : '');
    btn.id = `${id}-${s.id}`;
    btn.dataset.planeId = id;
    btn.dataset.handleId = s.id;
    if (s.draggable) btn.title = MSG_HANDLE_HINT;
    btn.tabIndex = s.focusable ? 0 : -1;
    btn.style.setProperty('--hit', `${Math.max(2 * s.radius + HIT_PAD_PX, HIT_MIN_PX)}px`);
    btn.style.setProperty('--dot', `${2 * s.radius}px`);
    btn.style.setProperty('--handle-color', s.color.startsWith('--') ? `var(${s.color})` : s.color);
    const dot = document.createElement('span');
    dot.className = 'plane-handle-dot';
    dot.setAttribute('aria-hidden', 'true');
    btn.appendChild(dot);
    if (s.label) {
      const lab = document.createElement('span');
      lab.className = 'plane-handle-label';
      lab.setAttribute('aria-hidden', 'true');
      lab.textContent = String(s.label);
      btn.appendChild(lab);
    }
    const ok = finiteZ(s.z);
    const hd = { s, el: btn, z: ok ? copyZ(s.z) : { re: 0, im: 0 }, nonFinite: !ok, userHidden: false, drag: null, inCallback: false, lastLabelAt: 0, pressing: false, removed: false };
    btn.hidden = hd.nonFinite;

    const on = (type, fn, o2) => btn.addEventListener(type, fn, o2);
    on('pointerdown', (e) => {
      if (destroyed || !s.draggable || (e.pointerType === 'mouse' && e.button !== 0)) return;
      hd.pressing = true;
      btn.classList.add('is-pointer-focus');                  // pointer focus draws no ring; a key press brings it back
      try { btn.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
      hd.pressing = false;
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      const rect = canvas.getBoundingClientRect(), sz = size(), kx = rect.width ? sz.w / rect.width : 1, ky = rect.height ? sz.h / rect.height : 1;
      const c = T.toPixel(hd.z);
      hd.drag = { id: e.pointerId, start: copyZ(hd.z), grab: { dx: (e.clientX - rect.left) * kx - c.x, dy: (e.clientY - rect.top) * ky - c.y } };
      btn.classList.add('is-dragging');
      if (s.onDragStart) { try { s.onDragStart(copyZ(hd.z)); } catch (err) { console.error(`plane "${id}": onDragStart threw`, err); } }
    });
    on('pointermove', (e) => {
      if (!hd.drag || e.pointerId !== hd.drag.id) return;
      const rect = canvas.getBoundingClientRect(), sz = size(), kx = rect.width ? sz.w / rect.width : 1, ky = rect.height ? sz.h / rect.height : 1;
      const qx = clamp((e.clientX - rect.left) * kx - hd.drag.grab.dx, 0, sz.w), qy = clamp((e.clientY - rect.top) * ky - hd.drag.grab.dy, 0, sz.h);
      let z = T.fromPixel(qx, qy);
      if (s.snap) { const z2 = s.snap(z); if (finiteZ(z2)) z = copyZ(z2); }
      applyZ(hd, z, performance.now() - hd.lastLabelAt > LABEL_THROTTLE_MS);
      callDrag(hd, z, { final: false, source: 'pointer' });
    });
    const finish = (e) => { if (hd.drag && (e.pointerId === undefined || e.pointerId === hd.drag.id)) endDrag(hd, false); };
    on('pointerup', finish);
    on('pointercancel', finish);
    on('lostpointercapture', finish);
    on('dragstart', (e) => e.preventDefault());
    on('blur', () => btn.classList.remove('is-pointer-focus'));
    on('focus', () => {
      if (s.onFocus) { try { s.onFocus(); } catch (err) { console.error(`plane "${id}": onFocus threw`, err); } }
      if (!hd.pressing && !hd.drag) ensureVisible(hd);
    });
    on('keydown', (e) => {
      if (e.key === 'Escape' && hd.drag) { e.preventDefault(); e.stopPropagation(); endDrag(hd, true); return; }
      const dir = ARROW_DIRS[e.key];
      if (!dir || !s.draggable || e.ctrlKey || e.metaKey) return;
      e.preventDefault(); e.stopPropagation();
      const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      let z = { re: round9(hd.z.re + dir[0] * s.step * mult), im: round9(hd.z.im + dir[1] * s.step * mult) };
      if (s.snap) { const z2 = s.snap(z); if (finiteZ(z2)) z = copyZ(z2); }
      applyZ(hd, z, true);
      callDrag(hd, z, { final: true, source: 'keyboard' });
      announce(btn.getAttribute('aria-label'));
    });

    applyZ(hd, hd.z, true);
    handlesLayer.appendChild(btn);
    handles.set(s.id, hd);

    hd.api = {
      id: s.id,
      el: btn,
      get z() { return copyZ(hd.z); },
      get hidden() { return hd.userHidden; },
      set hidden(v) { hd.userHidden = !!v; btn.hidden = hd.userHidden || hd.nonFinite; },
      set(z, { silent = false } = {}) {
        if (hd.removed || destroyed) return;
        if (!finiteZ(z)) { hd.nonFinite = true; btn.hidden = true; return; }       // a pole: hide, keep the last finite z
        hd.nonFinite = false; btn.hidden = hd.userHidden;
        applyZ(hd, copyZ(z), true);
        if (!silent && !hd.inCallback) callDrag(hd, z, { final: true, source: 'api' });
      },
      remove() {
        if (hd.removed) return;
        hd.removed = true;
        const hadFocus = typeof document !== 'undefined' && document.activeElement === btn;
        btn.remove();
        handles.delete(s.id);
        if (hadFocus && interactive && !destroyed) { try { el.focus({ preventScroll: true }); } catch (err) { /* ignore */ } }
        requestDraw();
      },
    };
    return hd.api;
  }

  // ---- pointer, pan and pinch on the canvas ----
  const active = new Map();                 // pointerId -> { x, y, type } for pointers that went down on empty canvas
  let pan = null, gesture = null;
  function canvasXY(e) {
    const r = canvas.getBoundingClientRect(), s = size();
    return { px: (e.clientX - r.left) * (r.width ? s.w / r.width : 1), py: (e.clientY - r.top) * (r.height ? s.h / r.height : 1) };
  }
  const ev = (kind, e, px, py, dragging) => ({ type: kind, z: T.fromPixel(px, py), px, py, pointerType: e.pointerType, pointerId: e.pointerId, isPrimary: e.isPrimary, dragging, originalEvent: e });
  const touches = () => [...active.values()].filter((p) => p.type === 'touch');

  function onCanvasDown(e) {
    if (destroyed || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const { px, py } = canvasXY(e);
    if (interactive) { el.classList.add('is-pointer-focus'); try { el.focus({ preventScroll: true }); } catch (err) { /* ignore */ } }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    active.set(e.pointerId, { x: px, y: py, type: e.pointerType });
    emit('pointerdown', ev('pointerdown', e, px, py, true));
    if (drawMode || !interactive) return;
    if (e.pointerType !== 'touch' && active.size === 1) {
      pan = { id: e.pointerId, x0: px, y0: py, center0: copyZ(center), moved: false };
    } else if (e.pointerType === 'touch' && touches().length === 2) {
      const [a, b] = touches();
      gesture = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view0: getView() };
      pan = null;
    }
  }
  function onCanvasMove(e) {
    if (destroyed) return;
    const { px, py } = canvasXY(e), p = active.get(e.pointerId);
    if (p) { p.x = px; p.y = py; }
    if (gesture && p && touches().length === 2) {
      const [a, b] = touches(), f = (Math.hypot(a.x - b.x, a.y - b.y) || 1) / gesture.d0, mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = size();
      const v = zoomView(gesture.view0, s.w, s.h, f, gesture.mid0.x, gesture.mid0.y, limits);       // zoom about the ORIGINAL midpoint
      const sc = s.w / v.unitsAcross;
      setViewInternal({ center: { re: v.center.re - (mid.x - gesture.mid0.x) / sc, im: v.center.im + (mid.y - gesture.mid0.y) / sc }, unitsAcross: v.unitsAcross }, 'zoom');
    } else if (pan && e.pointerId === pan.id) {
      const dx = px - pan.x0, dy = py - pan.y0;
      if (pan.moved || Math.hypot(dx, dy) >= PAN_THRESHOLD_PX) {
        pan.moved = true;
        el.classList.add('is-panning');
        setViewInternal({ center: { re: pan.center0.re - dx / T.scale, im: pan.center0.im + dy / T.scale } }, 'pan');
      }
    }
    if (p || listeners.pointermove.size) emit('pointermove', ev('pointermove', e, px, py, !!p));
  }
  function onCanvasEnd(e) {
    if (destroyed) return;
    const p = active.get(e.pointerId);
    if (!p) return;                                           // the press did not start on empty canvas, or it already ended
    const { px, py } = canvasXY(e);
    active.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (pan && pan.id === e.pointerId) { pan = null; el.classList.remove('is-panning'); }
    if (gesture && touches().length < 2) gesture = null;
    const kind = e.type === 'pointerup' ? 'pointerup' : 'pointercancel';
    emit(kind, ev(kind, e, px, py, false));
  }
  canvas.addEventListener('pointerdown', onCanvasDown);
  canvas.addEventListener('pointermove', onCanvasMove);
  canvas.addEventListener('pointerup', onCanvasEnd);
  canvas.addEventListener('pointercancel', onCanvasEnd);
  canvas.addEventListener('lostpointercapture', onCanvasEnd);

  // ---- wheel and keyboard on the plane ----
  function onWheel(e) {
    if (destroyed || !interactive || (e.target && e.target.closest && e.target.closest('.plane-controls'))) return;
    const allowed = wheelMode === 'always' || (wheelMode !== 'off' && (e.ctrlKey || e.metaKey || (wheelMode === 'focus' && el.contains(document.activeElement))));
    if (!allowed) return;                                     // do NOT preventDefault: the page scrolls as usual
    e.preventDefault();
    const dy = clamp(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1), -400, 400);
    const { px, py } = canvasXY(e);
    zoomAbout(Math.exp(-dy * (e.ctrlKey ? WHEEL_K_CTRL : WHEEL_K)), px, py, 'zoom');
  }
  function onKey(e) {
    if (destroyed || !interactive || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    const s = size(), onPlane = e.target === el;
    switch (e.key) {
      case '+': case '=': if (zoomAbout(ZOOM_STEP, s.w / 2, s.h / 2, 'zoom')) announceView(); break;
      case '-': case '_': if (zoomAbout(1 / ZOOM_STEP, s.w / 2, s.h / 2, 'zoom')) announceView(); break;
      case '0': case 'Home': resetView(); announceView(); break;
      default: {
        const dir = ARROW_DIRS[e.key];
        if (!dir || !onPlane) return;
        const f = e.shiftKey ? PAN_FRAC_BIG : PAN_FRAC;
        const dRe = f * unitsAcross, dIm = f * unitsAcross * s.h / s.w;
        if (setViewInternal({ center: { re: center.re + dir[0] * dRe, im: center.im + dir[1] * dIm } }, 'pan')) announceView();
      }
    }
    if (['+', '=', '-', '_', '0', 'Home'].includes(e.key) || (ARROW_DIRS[e.key] && onPlane)) e.preventDefault();
  }
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('keydown', onKey);
  const clearPointerFocus = (e) => { el.classList.remove('is-pointer-focus'); if (e.target && e.target.classList) e.target.classList.remove('is-pointer-focus'); };
  el.addEventListener('keydown', clearPointerFocus, true);
  el.addEventListener('focusout', (e) => { if (e.target === el) el.classList.remove('is-pointer-focus'); });
  if (btnIn) {
    btnIn.addEventListener('click', () => { const s = size(); if (zoomAbout(ZOOM_STEP, s.w / 2, s.h / 2, 'zoom')) announceView(); });
    btnOut.addEventListener('click', () => { const s = size(); if (zoomAbout(1 / ZOOM_STEP, s.w / 2, s.h / 2, 'zoom')) announceView(); });
    btnReset.addEventListener('click', () => { resetView(); announceView(); });
  }
  const onWinResize = () => resize();
  if (typeof window !== 'undefined') window.addEventListener('resize', onWinResize);
  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(() => resize()); resizeObserver.observe(el); }

  // ---- the Plane ----
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    clearTimeout(announceTimer);
    if (resizeObserver) resizeObserver.disconnect();
    if (typeof window !== 'undefined') window.removeEventListener('resize', onWinResize);
    for (const hd of [...handles.values()]) hd.api.remove();
    canvas.removeEventListener('pointerdown', onCanvasDown);
    canvas.removeEventListener('pointermove', onCanvasMove);
    canvas.removeEventListener('pointerup', onCanvasEnd);
    canvas.removeEventListener('pointercancel', onCanvasEnd);
    canvas.removeEventListener('lostpointercapture', onCanvasEnd);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('keydown', onKey);
    el.removeEventListener('keydown', clearPointerFocus, true);
    layers.length = 0;
    for (const k of Object.keys(listeners)) listeners[k].clear();
    active.clear(); pan = null; gesture = null;
    hubLeave(plane);
    el.remove();
    const reg = typeof window !== 'undefined' && window.__mv && window.__mv.planes;
    if (reg && reg.get(id) === plane) reg.delete(id);
    stats.destroyed = true;
  }

  const plane = {
    id, el, canvas,
    toPixel, fromPixel, getView,
    getSize: () => size(),
    setView(v) { if (!destroyed && v) setViewInternal({ center: v.center, unitsAcross: v.unitsAcross }, 'set'); },
    fitTo,
    resetView,
    setHome() { if (!destroyed) home = { center: copyZ(center), unitsAcross }; },
    setGrid(g) {
      if (!GRIDS.includes(g)) throw new TypeError(`plane.setGrid: unknown grid "${g}"`);
      grid = g; requestDraw();
    },
    addPoint,
    getHandle: (hid) => { const hd = handles.get(hid); return hd ? hd.api : null; },
    handles: () => [...handles.values()].map((hd) => hd.api),
    addLayer,
    addCurve,
    on(type, cb) {
      if (!Object.prototype.hasOwnProperty.call(listeners, type)) throw new TypeError(`plane.on: unknown event "${type}"`);
      if (destroyed || typeof cb !== 'function') return () => {};
      listeners[type].add(cb);
      return () => listeners[type].delete(cb);
    },
    setDrawMode(on) {
      if (destroyed) return;
      drawMode = !!on;
      el.classList.toggle('is-drawing', drawMode);
      if (drawMode) { pan = null; gesture = null; el.classList.remove('is-panning'); }
    },
    isDrawMode: () => drawMode,
    requestDraw, resize, destroy,
    getStats: () => ({ draws: stats.draws, lastDrawMs: stats.lastDrawMs, resizes: stats.resizes, layers: layers.length, handles: handles.size, destroyed: stats.destroyed }),
  };

  // The registry that interaction scripts read (tests/interact/_helpers.mjs): window.__mv.planes.get(id).toPixel(...)
  window.__mv = window.__mv || {};
  window.__mv.planes = window.__mv.planes || new Map();
  window.__mv.planes.set(id, plane);

  syncDataAttrs();
  refreshZoomButtons();
  hubJoin(plane);
  resize();
  requestDraw();
  return plane;
}
