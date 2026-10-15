// js/core/three-view.js
//
// The one module that touches three.js. It provides
//   1. exact pure maths: stereographic projection, 4D rotation, projection R^4 -> R^3,
//   2. builders for the surfaces the stories need (modulus landscape, Re/Im surfaces, the 4D
//      graph, the Riemann surface of z^(1/n), the helix of arg, the Riemann sphere),
//   3. createView3D(): a self-managing three.js view (render on demand, resize, themed chrome,
//      keyboard and touch, no-WebGL fallback, clean disposal).
//
// Frame convention: a maths point (x, y, h) (plane position, height) is drawn at scene
// (x, h, -y). That is a proper rotation, so counterclockwise stays counterclockwise.
// Every object built here is already in scene space; curveToLine, toScene and a marker's
// setPosition take maths triples.
//
// Colour convention: colour callbacks and ramps work in display sRGB (0..1); vertex colour
// attributes hold LINEAR values (srgbToLinear) so that, with the lighting below, a face seen
// straight on renders at exactly its sRGB colour.
//
// The top level touches no DOM and no WebGL: the file imports in Node and the pure maths and the
// geometry builders are unit-tested there. Design: docs/designs/iter-1/i1-core-three.md.

import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';

export { THREE };

// ---------------------------------------------------------------------------------------------
// 5.0 Constants
// ---------------------------------------------------------------------------------------------

const TAU = 2 * Math.PI;
const HAS_DOM = typeof document !== 'undefined';
const NEUTRAL = [0.5, 0.5, 0.5];           // display sRGB
const CLAMP_MIX = 0.6;                     // clamped colours: c*(1-0.6) + NEUTRAL*0.6
const LIGHT = { ambient: 0.5 * Math.PI, head: 0.5 * Math.PI };
const SLERP_STEP = 0.08;                   // radians, sphere curve subdivision
const SPHERE_LIFT = 1.004;                 // curves sit 0.4 percent above the sphere
const PIXEL_BUDGET = 2.1e6;
const PR_MAX = 2;
const IDLE_FRAMES = 45;                    // frames the loop stays awake after the last change (damping)

export const HELIX_PITCH = 1.2;            // height gained per full turn on the helix

const FALLBACK_TOKENS = {                  // used only when a token is missing or there is no DOM
  light: { '--surface': '#ffffff', '--surface-2': '#f3f4f6', '--text': '#111827', '--text-muted': '#4b5563',
           '--border': '#d1d5db', '--focus': '#2563eb', '--cart': '#2563eb', '--polar': '#c2410c',
           '--input': '#0f766e', '--output': '#7c3aed', '--seam': '#6b7280', '--t0': '#1e293b', '--t1': '#d97706' },
  dark:  { '--surface': '#111827', '--surface-2': '#1f2937', '--text': '#f3f4f6', '--text-muted': '#9ca3af',
           '--border': '#374151', '--focus': '#60a5fa', '--cart': '#60a5fa', '--polar': '#fb923c',
           '--input': '#2dd4bf', '--output': '#a78bfa', '--seam': '#9ca3af', '--t0': '#64748b', '--t1': '#fde68a' },
};

const TEXT_UNAVAILABLE = 'This 3D view needs WebGL and your browser has it switched off. The flat pictures on this page show the same thing.';
const TEXT_CONTEXT_LOST = 'The 3D view paused because the graphics card reset. It should come back on its own. If it does not, reload the page.';
const TEXT_HINT_FINE = 'Drag to turn. Click the view, then scroll to zoom. Arrow keys turn, + and - zoom, 0 resets.';
const TEXT_HINT_COARSE = 'Swipe sideways to turn. Pinch to zoom. Swipe up or down to scroll the page.';

// ---------------------------------------------------------------------------------------------
// 4.1 / 5.5 Pure maths (no three.js objects)
// ---------------------------------------------------------------------------------------------

/** Stereographic projection of the plane onto the unit sphere (plane frame, not scene frame). */
export function stereographic(z) {
  if (typeof z === 'number') z = { re: z, im: 0 };
  if (!z) return [NaN, NaN, NaN];
  const x = z.re, y = z.im;
  if (Number.isNaN(x) || Number.isNaN(y)) return [NaN, NaN, NaN];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [0, 0, 1];
  const h = Math.hypot(x, y);
  if (h > 1e7) {                                  // overflow-safe form: no h*h near 1e154
    const q = 1 / h;
    const d = 1 + q * q;
    return [2 * (x / h) * q / d, 2 * (y / h) * q / d, (1 - q * q) / d];
  }
  const s = x * x + y * y;
  return [2 * x / (s + 1), 2 * y / (s + 1), (s - 1) / (s + 1)];
}

/** Inverse stereographic projection (does not renormalise). Z >= 1 is the point at infinity. */
export function inverseStereographic(p) {
  const X = p[0], Y = p[1], Z = p[2];
  const d = 1 - Z;
  if (!(d > 0)) return { re: Infinity, im: Infinity };
  return { re: X / d, im: Y / d };
}

/** Rotate in the u-v plane by `uv`, then in the y-v plane by `yv`. Always returns a new array. */
export function rotate4(p, { uv = 0, yv = 0 } = {}) {
  let x = p[0], y = p[1], u = p[2], v = p[3];
  if (uv !== 0) {
    const c = Math.cos(uv), s = Math.sin(uv);
    const u1 = u * c - v * s;
    v = u * s + v * c;
    u = u1;
  }
  if (yv !== 0) {
    const c = Math.cos(yv), s = Math.sin(yv);
    const y1 = y * c - v * s;
    v = y * s + v * c;
    y = y1;
  }
  return [x, y, u, v];
}

/** Drop the last coordinate (the hidden value). */
export function project4to3(p4) { return [p4[0], p4[1], p4[2]]; }

/** Maths frame (x, y, h) -> three.js scene frame (x, h, -y). */
export function toScene(p) { return [p[0], p[2], -p[1]]; }
/** Scene frame -> maths frame. */
export function fromScene(p) { return [p[0], -p[2], p[1]]; }

/** A point of the Riemann surface of z^(1/n): maths frame [x, y, h, other]. theta is unwrapped. */
export function riemannPoint({ n = 3, part = 'im' } = {}, r, theta) {
  const rho = Math.pow(r, 1 / n);
  const a = theta / n;
  const re = rho * Math.cos(a), im = rho * Math.sin(a);
  return [r * Math.cos(theta), r * Math.sin(theta), part === 're' ? re : im, part === 're' ? im : re];
}

// ---------------------------------------------------------------------------------------------
// 5.1 Colour helpers
// ---------------------------------------------------------------------------------------------

const clamp01 = (c) => Math.min(1, Math.max(0, c));

export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function hslToRgb(h, s, l) {
  h = h - Math.floor(h);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const h6 = h * 6;
  const x = c * (1 - Math.abs((h6 % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  switch (Math.floor(h6) % 6) {
    case 0: r = c; g = x; b = 0; break;
    case 1: r = x; g = c; b = 0; break;
    case 2: r = 0; g = c; b = x; break;
    case 3: r = 0; g = x; b = c; break;
    case 4: r = x; g = 0; b = c; break;
    default: r = c; g = 0; b = x; break;
  }
  return [r + m, g + m, b + m];
}

/** Hue wheel: hue = Arg w, HSL(hue, 0.8, 0.5), display sRGB. Same colour at Arg +pi and -pi. */
export function argColor(w) {
  const a = Math.atan2(w.im, w.re);
  return hslToRgb(a / TAU, 0.8, 0.5);
}

const deepFreeze = (a) => { a.forEach((e) => Array.isArray(e) && deepFreeze(e)); return Object.freeze(a); };
export const HIDDEN_RAMP_STOPS = deepFreeze([
  [0, [68, 1, 84]], [0.25, [59, 82, 139]], [0.5, [33, 145, 140]], [0.75, [94, 201, 98]], [1, [253, 231, 37]],
]);

/** Hidden-coordinate ramp (five-stop viridis). t in [0,1] (clamped); t = 0.5 means the value 0. */
export function hiddenRamp(t) {
  t = Number.isNaN(t) ? 0.5 : clamp01(t);
  const s = 4 * t;
  const i = Math.min(3, Math.floor(s));
  const f = s - i;
  const a = HIDDEN_RAMP_STOPS[i][1], b = HIDDEN_RAMP_STOPS[i + 1][1];
  return [(a[0] + (b[0] - a[0]) * f) / 255, (a[1] + (b[1] - a[1]) * f) / 255, (a[2] + (b[2] - a[2]) * f) / 255];
}

/** CSS gradient for a legend of the hidden-coordinate ramp. */
export function hiddenRampCss() {
  return 'linear-gradient(90deg, #440154, #3b528b, #21918c, #5ec962, #fde725)';
}

const mixRgb = (a, b, k) => [a[0] * (1 - k) + b[0] * k, a[1] * (1 - k) + b[1] * k, a[2] * (1 - k) + b[2] * k];
const rampRgb = (base, t0, t1, t) => mixRgb(base, mixRgb(t0, t1, t), 0.65);
const writeLinear = (arr, k, rgb) => {
  arr[3 * k] = srgbToLinear(clamp01(rgb[0]));
  arr[3 * k + 1] = srgbToLinear(clamp01(rgb[1]));
  arr[3 * k + 2] = srgbToLinear(clamp01(rgb[2]));
};
const validRgb = (c) => Array.isArray(c) && c.length >= 3 && Number.isFinite(c[0]) && Number.isFinite(c[1]) && Number.isFinite(c[2]);

// ---------------------------------------------------------------------------------------------
// 5.4 Tokens and colour resolution
// ---------------------------------------------------------------------------------------------

const tokenCache = new Map();
let sharedCtx = null;

function isDark() {
  if (!HAS_DOM) return false;
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return true;
  if (t === 'light') return false;
  try { return !!(typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches); } catch { return false; }
}

function parseHex(css) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(css).trim());
  if (!m) return NEUTRAL.slice();
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

function parseCssColor(css) {
  if (HAS_DOM) {
    try {
      if (!sharedCtx) {
        const c = document.createElement('canvas');
        c.width = c.height = 1;
        sharedCtx = c.getContext('2d', { willReadFrequently: true });
      }
      const ctx = sharedCtx;
      if (ctx) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#010203';
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        if (d[0] === 1 && d[1] === 2 && d[2] === 3 && css.toLowerCase().replace(/\s/g, '') !== '#010203') return NEUTRAL.slice();
        return [d[0] / 255, d[1] / 255, d[2] / 255];
      }
    } catch { /* fall through to the hand parser */ }
  }
  return parseHex(css);
}

/** A token ('--cart') or any CSS colour -> display sRGB [r, g, b] in 0..1. Never throws. */
function resolveColor(spec, fallbackToken = '--text') {
  if (typeof spec !== 'string') return resolveColor(fallbackToken);
  const s = spec.trim();
  let css = s;
  if (s.startsWith('--')) {
    css = '';
    if (HAS_DOM) {
      try { css = getComputedStyle(document.documentElement).getPropertyValue(s).trim(); } catch { css = ''; }
    }
    if (css === '') {
      const table = FALLBACK_TOKENS[isDark() ? 'dark' : 'light'];
      css = table[s] ?? table['--text'];
    }
  }
  const cached = tokenCache.get(css);
  if (cached) return cached;
  const rgb = parseCssColor(css);
  tokenCache.set(css, rgb);
  return rgb;
}

/** THREE.Color in the linear working space from a token or CSS colour. */
function tokenColor(spec) {
  const [r, g, b] = resolveColor(spec);
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}

// ---------------------------------------------------------------------------------------------
// 5.11 Auto redraw: every mutator notifies the views the object was added to
// ---------------------------------------------------------------------------------------------

function attachRender(root, fn) {
  if (!root.userData) root.userData = {};
  (root.userData.__render || (root.userData.__render = new Set())).add(fn);
}
function detachRender(root, fn) {
  root.userData?.__render?.delete(fn);
}
function notify(obj) {
  for (let o = obj; o; o = o.parent) {
    const set = o.userData?.__render;
    if (set) set.forEach((fn) => fn());
  }
}

// ---------------------------------------------------------------------------------------------
// 5.3 Grid indices, wire
// ---------------------------------------------------------------------------------------------

const clampInt = (v, lo, hi, dflt) => {
  v = Math.round(Number(v));
  if (!Number.isFinite(v)) v = dflt === undefined ? lo : dflt;
  return Math.min(hi, Math.max(lo, v));
};
const goodRange = (r) => (Array.isArray(r) && r.length >= 2 && Number.isFinite(r[0]) && Number.isFinite(r[1]) ? [r[0], r[1]] : [-2, 2]);

function buildGridIndex(nu, nv) {
  const tris = (nu - 1) * (nv - 1) * 2;
  const idx = nu * nv <= 65535 ? new Uint16Array(tris * 3) : new Uint32Array(tris * 3);
  let p = 0;
  for (let j = 0; j < nv - 1; j++) {
    for (let i = 0; i < nu - 1; i++) {
      const a = i + j * nu, b = a + 1, c = a + nu, d = c + 1;
      idx[p++] = a; idx[p++] = b; idx[p++] = c;
      idx[p++] = b; idx[p++] = d; idx[p++] = c;
    }
  }
  return idx;
}

function buildWireIndex(nu, nv, stepU, stepV) {
  const pairs = [];
  for (let j = 0; j < nv; j++) {
    if (j % stepV !== 0 && j !== nv - 1) continue;
    for (let i = 0; i < nu - 1; i++) pairs.push(i + j * nu, i + 1 + j * nu);
  }
  for (let i = 0; i < nu; i++) {
    if (i % stepU !== 0 && i !== nu - 1) continue;
    for (let j = 0; j < nv - 1; j++) pairs.push(i + j * nu, i + (j + 1) * nu);
  }
  return (nu * nv <= 65535 ? new Uint16Array(pairs) : new Uint32Array(pairs));
}

const wireSteps = (n) => Math.max(1, Math.round((n - 1) / 16));
const wireOpacity = () => (isDark() ? 0.35 : 0.30);

/** Mesh-line overlay sharing the mesh's position attribute (so in-place updates reach it). */
function addWire(mesh, nu, nv, stepU, stepV) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', mesh.geometry.getAttribute('position'));
  g.setIndex(new THREE.BufferAttribute(buildWireIndex(nu, nv, stepU, stepV), 1));
  const m = new THREE.LineBasicMaterial({ color: tokenColor('--text-muted'), transparent: true, opacity: wireOpacity() });
  const wire = new THREE.LineSegments(g, m);
  wire.name = 'wire';
  wire.renderOrder = 1;
  wire.frustumCulled = false;
  mesh.add(wire);
  mesh.userData.themeRefresh = () => {
    m.color.copy(tokenColor('--text-muted'));
    m.opacity = wireOpacity();
  };
  return wire;
}

function surfaceMaterial() {
  return new THREE.MeshLambertMaterial({
    vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
}

function safeEval(f, z) {
  let r;
  try { r = f(z); } catch { r = null; }
  if (r && typeof r === 'object' && typeof r.re === 'number' && typeof r.im === 'number') return r;
  return { re: NaN, im: NaN };
}

// ---------------------------------------------------------------------------------------------
// 5.6 surfaceFromFunction and the surfaces built on it
// ---------------------------------------------------------------------------------------------

/**
 * Height field over a grid with vertex colours. Vertex k = i + j*nx is at
 * x = x0 + (x1-x0) i/(nx-1), y = y0 + (y1-y0) j/(ny-1). Flag 0 ok, 1 clamped, 2 non-finite.
 */
export function surfaceFromFunction({
  f, xRange = [-2, 2], yRange = [-2, 2], nx = 96, ny = 96,
  height = (w) => Math.hypot(w.re, w.im), color = (w) => argColor(w), clamp = 6, wire = true,
} = {}) {
  nx = clampInt(nx, 2, 512, 96);
  ny = clampInt(ny, 2, 512, 96);
  const [x0, x1] = goodRange(xRange), [y0, y1] = goodRange(yRange);
  clamp = clamp > 0 ? clamp : 6;
  const N = nx * ny;
  const P = new Float32Array(3 * N), C = new Float32Array(3 * N), flags = new Uint8Array(N);
  let clampedCount = 0, nonFiniteCount = 0;

  for (let j = 0; j < ny; j++) {
    const y = y0 + (y1 - y0) * j / (ny - 1);
    for (let i = 0; i < nx; i++) {
      const x = x0 + (x1 - x0) * i / (nx - 1);
      const k = i + j * nx;
      const z = { re: x, im: y };
      const w = safeEval(f, z);
      const wFinite = Number.isFinite(w.re) && Number.isFinite(w.im);
      let h; try { h = Number(height(w, z)); } catch { h = NaN; }
      let rgb; try { rgb = color(w, z); } catch { rgb = null; }
      if (!validRgb(rgb)) rgb = NEUTRAL;
      let hh, flag;
      if (h === Infinity) { hh = clamp; flag = 2; }
      else if (h === -Infinity) { hh = -clamp; flag = 2; }
      else if (Number.isNaN(h)) { hh = 0; flag = 2; }
      else if (Math.abs(h) > clamp) { hh = Math.sign(h) * clamp; flag = 1; }
      else { hh = h; flag = 0; }
      if (!wFinite) { flag = 2; rgb = NEUTRAL; }
      if (flag === 1) rgb = mixRgb(rgb, NEUTRAL, CLAMP_MIX);
      if (flag === 2) rgb = NEUTRAL;
      P[3 * k] = x; P[3 * k + 1] = hh; P[3 * k + 2] = -y;
      writeLinear(C, k, rgb);
      flags[k] = flag;
      if (flag === 1) clampedCount++; else if (flag === 2) nonFiniteCount++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(C, 3));
  geometry.setIndex(new THREE.BufferAttribute(buildGridIndex(nx, ny), 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, surfaceMaterial());
  mesh.userData = {
    kind: 'surface', nx, ny, xRange: [x0, x1], yRange: [y0, y1], clamp, frame: true, flags,
    flaggedCount: clampedCount + nonFiniteCount, clampedCount, nonFiniteCount, vertexCount: N,
  };
  if (wire) addWire(mesh, nx, ny, wireSteps(nx), wireSteps(ny));
  return mesh;
}

/** (x, y, |w|) with hue = Arg w: the domain colouring lifted into 3D. */
export function modulusLandscape({ f, xRange, yRange, nx, ny, clamp = 6, wire = true } = {}) {
  const mesh = surfaceFromFunction({
    f, xRange, yRange, nx, ny, clamp, wire,
    height: (w) => Math.hypot(w.re, w.im), color: (w) => argColor(w),
  });
  mesh.name = 'modulus-landscape';
  mesh.userData.kind = 'modulus-landscape';
  return mesh;
}

/** (x, y, Re w) or (x, y, Im w), coloured by the other part on the hidden-coordinate ramp. */
export function reImSurface({ f, xRange, yRange, nx, ny, part = 're', clamp = 6, wire = true } = {}) {
  part = part === 'im' ? 'im' : 're';
  const cl = clamp > 0 ? clamp : 6;
  const NX = clampInt(nx, 2, 512, 96), NY = clampInt(ny, 2, 512, 96);
  const [x0, x1] = goodRange(xRange), [y0, y1] = goodRange(yRange);
  const other = (w) => (part === 're' ? w.im : w.re);
  let S = 0;                                           // pass 1: largest finite |other part|
  for (let j = 0; j < NY; j++) {
    const y = y0 + (y1 - y0) * j / (NY - 1);
    for (let i = 0; i < NX; i++) {
      const w = safeEval(f, { re: x0 + (x1 - x0) * i / (NX - 1), im: y });
      const o = other(w);
      if (Number.isFinite(w.re) && Number.isFinite(w.im) && Math.abs(o) > S) S = Math.abs(o);
    }
  }
  S = Math.max(1e-9, Math.min(cl, S));
  const mesh = surfaceFromFunction({                   // pass 2
    f, xRange, yRange, nx, ny, clamp, wire,
    height: (w) => (part === 're' ? w.re : w.im),
    color: (w) => hiddenRamp(0.5 + 0.5 * other(w) / S),
  });
  mesh.name = part === 're' ? 're-surface' : 'im-surface';
  mesh.userData.kind = mesh.name;
  mesh.userData.part = part;
  mesh.userData.hiddenScale = S;
  return mesh;
}

// ---------------------------------------------------------------------------------------------
// 5.7 graph4D
// ---------------------------------------------------------------------------------------------

/**
 * The graph {(x, y, u, v)} of w = f(z), rotated in R^4 by two angles and dropped to 3D. The
 * dropped coordinate is painted on the hidden-coordinate ramp. setAngles updates in place.
 */
export function graph4D({
  f, xRange = [-2, 2], yRange = [-2, 2], nx = 64, ny = 64, angles = { uv: 0, yv: 0 }, clamp = 6, wire = true,
} = {}) {
  nx = clampInt(nx, 2, 512, 64);
  ny = clampInt(ny, 2, 512, 64);
  const [x0, x1] = goodRange(xRange), [y0, y1] = goodRange(yRange);
  clamp = clamp > 0 ? clamp : 6;
  const N = nx * ny;
  const base = new Float64Array(4 * N);                // x, y, u, v with u and v already clamped
  const baseFlag = new Uint8Array(N);
  const P = new Float32Array(3 * N), C = new Float32Array(3 * N);
  let S = 1e-9;
  let cur = { uv: Number.isFinite(angles?.uv) ? angles.uv : 0, yv: Number.isFinite(angles?.yv) ? angles.yv : 0 };

  function fill(g) {
    let S2 = 0;
    for (let j = 0; j < ny; j++) {
      const y = y0 + (y1 - y0) * j / (ny - 1);
      for (let i = 0; i < nx; i++) {
        const x = x0 + (x1 - x0) * i / (nx - 1);
        const k = i + j * nx;
        const w = safeEval(g, { re: x, im: y });
        let u, v, flag;
        if (!Number.isFinite(w.re) || !Number.isFinite(w.im)) { u = 0; v = 0; flag = 2; }
        else {
          u = w.re; v = w.im; flag = 0;
          if (Math.abs(u) > clamp) { u = Math.sign(u) * clamp; flag = 1; }
          if (Math.abs(v) > clamp) { v = Math.sign(v) * clamp; flag = 1; }
        }
        base[4 * k] = x; base[4 * k + 1] = y; base[4 * k + 2] = u; base[4 * k + 3] = v;
        baseFlag[k] = flag;
        const n2 = x * x + y * y + u * u + v * v;
        if (n2 > S2) S2 = n2;
      }
    }
    S = Math.max(1e-9, Math.sqrt(S2));                 // |hidden| <= norm <= S after any rotation
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(P, 3), colAttr = new THREE.BufferAttribute(C, 3);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('color', colAttr);
  geometry.setIndex(new THREE.BufferAttribute(buildGridIndex(nx, ny), 1));
  const mesh = new THREE.Mesh(geometry, surfaceMaterial());
  mesh.name = 'graph4d';
  mesh.frustumCulled = false;
  mesh.userData = {
    kind: 'graph4d', nx, ny, vertexCount: N, angles: { ...cur }, hiddenScale: S, version: 0, frame: true,
  };
  if (wire) addWire(mesh, nx, ny, wireSteps(nx), wireSteps(ny));

  function apply(a) {
    const cu = Math.cos(a.uv), su = Math.sin(a.uv), cy = Math.cos(a.yv), sy = Math.sin(a.yv);
    const rotUV = a.uv !== 0, rotYV = a.yv !== 0;
    for (let k = 0; k < N; k++) {
      const x = base[4 * k], y = base[4 * k + 1];
      let u = base[4 * k + 2], v = base[4 * k + 3], y1 = y;
      if (rotUV) { const u1 = u * cu - v * su; v = u * su + v * cu; u = u1; }
      if (rotYV) { const yy = y * cy - v * sy; v = y * sy + v * cy; y1 = yy; }
      P[3 * k] = x; P[3 * k + 1] = u; P[3 * k + 2] = -y1;
      let rgb = hiddenRamp(0.5 + 0.5 * v / S);
      const fl = baseFlag[k];
      if (fl === 1) rgb = mixRgb(rgb, NEUTRAL, CLAMP_MIX);
      else if (fl === 2) rgb = NEUTRAL;
      writeLinear(C, k, rgb);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    mesh.userData.version++;
    mesh.userData.angles = { uv: a.uv, yv: a.yv };
    mesh.userData.hiddenScale = S;
    notify(mesh);
  }

  fill(f);
  apply(cur);

  return {
    mesh,
    setAngles(a) {
      cur = {
        uv: Number.isFinite(a?.uv) ? a.uv : cur.uv,
        yv: Number.isFinite(a?.yv) ? a.yv : cur.yv,
      };
      apply(cur);
    },
    setFunction(g) { fill(g); apply(cur); },
    dispose() { mesh.removeFromParent(); disposeObject(mesh); },
  };
}

// ---------------------------------------------------------------------------------------------
// 5.8 riemannSurfaceRoot
// ---------------------------------------------------------------------------------------------

/** All n roots of z^(1/n) at once: n sheets joined after n turns, coloured by the other part. */
export function riemannSurfaceRoot({ n = 3, rMax = 2, nr = 24, nTheta = 48, part = 'im', wire = true } = {}) {
  n = clampInt(n, 1, 12, 3);
  nr = clampInt(nr, 2, 200, 24);
  nTheta = clampInt(nTheta, 2, 400, 48);
  rMax = rMax > 0 ? rMax : 2;
  part = part === 're' ? 're' : 'im';
  const cols = nTheta * n, nu = cols + 1, nv = nr + 1;     // vertex (i, j) = i + j*nu; i along theta, j along r
  const N = nu * nv;
  const S = Math.pow(rMax, 1 / n);                          // largest possible |part|
  const P = new Float32Array(3 * N), C = new Float32Array(3 * N);
  for (let j = 0; j < nv; j++) {
    const r = rMax * Math.pow(j / nr, 2);                   // quadratic spacing: denser near the branch point
    for (let i = 0; i < nu; i++) {
      const theta = TAU * n * i / cols;
      const k = i + j * nu;
      const q = riemannPoint({ n, part }, r, theta);
      P[3 * k] = q[0]; P[3 * k + 1] = q[2]; P[3 * k + 2] = -q[1];
      writeLinear(C, k, hiddenRamp(0.5 + 0.5 * q[3] / S));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(C, 3));
  geometry.setIndex(new THREE.BufferAttribute(buildGridIndex(nu, nv), 1));
  geometry.computeVertexNormals();
  // The surface closes after n turns (positions coincide): average the seam normals so no crease shows.
  const nrm = geometry.getAttribute('normal').array;
  for (let j = 0; j < nv; j++) {
    const a = 3 * (0 + j * nu), b = 3 * (cols + j * nu);
    let nx_ = nrm[a] + nrm[b], ny_ = nrm[a + 1] + nrm[b + 1], nz_ = nrm[a + 2] + nrm[b + 2];
    const len = Math.hypot(nx_, ny_, nz_) || 1;
    nx_ /= len; ny_ /= len; nz_ /= len;
    nrm[a] = nrm[b] = nx_; nrm[a + 1] = nrm[b + 1] = ny_; nrm[a + 2] = nrm[b + 2] = nz_;
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, surfaceMaterial());
  mesh.name = 'riemann-root';
  mesh.userData = { kind: 'riemann-root', n, rMax, nr, nTheta, part, frame: true, vertexCount: N };
  if (wire) addWire(mesh, nu, nv, Math.max(1, Math.round(nTheta / 12)), Math.max(1, Math.round(nr / 8)));
  return mesh;
}

// ---------------------------------------------------------------------------------------------
// 5.11 Lines, markers, dispose
// ---------------------------------------------------------------------------------------------

const TEXTURE_KEYS = ['map', 'alphaMap', 'emissiveMap'];

function disposeOne(o) {
  if (o.geometry && typeof o.geometry.dispose === 'function') o.geometry.dispose();
  const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
  for (const m of mats) {
    for (const key of TEXTURE_KEYS) if (m[key] && typeof m[key].dispose === 'function') m[key].dispose();
    if (typeof m.dispose === 'function') m.dispose();
  }
  if (o.userData) delete o.userData.__render;
}

/** Dispose geometry, materials and material textures of obj and every descendant, then detach it. Null-safe, idempotent. */
export function disposeObject(obj) {
  if (!obj) return;
  if (typeof obj.traverse === 'function') obj.traverse(disposeOne);
  if (typeof obj.removeFromParent === 'function') obj.removeFromParent();
}

const finite3 = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]);

/** A polyline in the maths frame. A non-finite point breaks the line. userData.update(points3) edits in place. */
export function curveToLine(points3, color = '--output') {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ color: tokenColor(color) });
  const line = new THREE.LineSegments(geometry, material);
  line.frustumCulled = false;

  function build(p3) {
    const pts = Array.isArray(p3) ? p3 : [];
    const n = pts.length;
    const arr = new Float32Array(3 * Math.max(n, 1));
    const ok = pts.map(finite3);
    let lastGood = null;
    for (let k = 0; k < n; k++) {                          // non-finite points take the previous finite position
      const p = ok[k] ? pts[k] : lastGood;
      if (ok[k]) lastGood = p;
      if (p) { arr[3 * k] = p[0]; arr[3 * k + 1] = p[2]; arr[3 * k + 2] = -p[1]; }
    }
    if (lastGood) {                                        // leading non-finite points take the first finite one
      const first = pts[ok.indexOf(true)];
      for (let k = 0; k < n && !ok[k]; k++) { arr[3 * k] = first[0]; arr[3 * k + 1] = first[2]; arr[3 * k + 2] = -first[1]; }
    }
    const pairs = [];
    for (let k = 0; k + 1 < n; k++) if (ok[k] && ok[k + 1]) pairs.push(k, k + 1);
    return { arr, pairs, n };
  }

  function apply(p3) {
    const { arr, pairs, n } = build(p3);
    const nn = Math.max(n, 1);
    const oldPos = geometry.getAttribute('position');
    const oldIdx = geometry.getIndex();
    const Ctor = nn <= 65535 ? Uint16Array : Uint32Array;
    const samePos = !!oldPos && oldPos.count === nn;
    const sameIdx = !!oldIdx && oldIdx.count === pairs.length && oldIdx.array instanceof Ctor;
    if (samePos) { oldPos.array.set(arr); oldPos.needsUpdate = true; }
    if (sameIdx) { oldIdx.array.set(pairs); oldIdx.needsUpdate = true; }
    if (!samePos || !sameIdx) {
      if (oldPos || oldIdx) geometry.dispose();             // frees the replaced GL buffers; re-registered on the next render
      if (!samePos) geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      if (!sameIdx) geometry.setIndex(new THREE.BufferAttribute(new Ctor(pairs), 1));
    }
    notify(line);
  }

  apply(points3);
  line.userData = {
    kind: 'line', color,
    update(p3) { apply(p3); },
    themeRefresh() { material.color.copy(tokenColor(line.userData.color)); },
  };
  return line;
}

/** A small sphere. userData.setPosition([x, y, h]) takes a maths triple. */
export function createMarker({ color = '--text', radius = 0.06, position = [0, 0, 0] } = {}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), new THREE.MeshLambertMaterial({ color: tokenColor(color) }));
  mesh.renderOrder = 3;
  const setPosition = (p) => {
    if (!finite3(p)) return;
    mesh.position.set(p[0], p[2], -p[1]);
    mesh.updateMatrix();
    notify(mesh);
  };
  mesh.userData = { kind: 'marker', color, setPosition, themeRefresh() { mesh.material.color.copy(tokenColor(color)); } };
  setPosition(position);
  return mesh;
}

// ---------------------------------------------------------------------------------------------
// Text sprites (browser only)
// ---------------------------------------------------------------------------------------------

function fontStack() {
  let f = '';
  if (HAS_DOM) { try { f = getComputedStyle(document.documentElement).getPropertyValue('--font').trim(); } catch { f = ''; } }
  return f || 'system-ui, sans-serif';
}

/**
 * A label drawn on a canvas texture. Returns null without a DOM. The sprite does not attenuate with distance and
 * its size is set from the view height (applyLabelScales), so the text stays about `fontPx` CSS pixels tall
 * however far the auto-framing puts the camera.
 */
function makeLabelSprite(text, token, fontPx = 14) {
  if (!HAS_DOM || text === '' || text == null) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 128, 64);
    const [r, g, b] = resolveColor(token);
    ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    let size = 40;
    ctx.font = `600 ${size}px ${fontStack()}`;
    const w = ctx.measureText(String(text)).width;
    if (w > 120) { size = Math.max(14, Math.floor(size * 120 / w)); ctx.font = `600 ${size}px ${fontStack()}`; }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), 64, 34);
    texture.needsUpdate = true;
  };
  draw();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: false }));
  sprite.scale.set(0.14, 0.07, 1);                         // replaced by applyLabelScales once a view knows its height
  sprite.renderOrder = 5;
  sprite.userData = { kind: 'label', text: String(text), screenFontPx: fontPx, themeRefresh: draw };
  return sprite;
}

/** Size every label under root so its text is about screenFontPx tall in a view of the given CSS height. */
function applyLabelScales(root, viewHeight, fovDeg) {
  if (!root || !(viewHeight > 0)) return;
  const k = Math.min(1.15, Math.max(0.85, viewHeight / 420));
  const tanHalf = Math.tan(fovDeg * Math.PI / 360);
  root.traverse((o) => {
    const px = o.userData && o.userData.screenFontPx;
    if (!px) return;
    const spritePx = px * k * 64 / 40;                      // the text is 40 px of the 64 px canvas height
    const sy = spritePx * 2 * tanHalf / viewHeight;
    o.scale.set(2 * sy, sy, 1);
  });
}

// ---------------------------------------------------------------------------------------------
// 5.9 argHelix
// ---------------------------------------------------------------------------------------------

function dashedMaterial(token) {
  return new THREE.LineDashedMaterial({ color: tokenColor(token), dashSize: 0.08, gapSize: 0.06 });
}
function dashedSegment(token, a, b) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...a, ...b]), 3));
  const line = new THREE.LineSegments(g, dashedMaterial(token));
  line.computeLineDistances();
  line.frustumCulled = false;
  return line;
}

/** Writes the helicoid (rho cos phi, h, -rho sin phi) with h = HELIX_PITCH phi/2pi into an attribute array. */
function writeHelicoid(P, phi0, phi1, nPhi, nRho, rMax) {
  for (let j = 0; j <= nRho; j++) {
    const rho = rMax * j / nRho;
    for (let i = 0; i <= nPhi; i++) {
      const phi = phi0 + (phi1 - phi0) * i / nPhi;
      const k = i + j * (nPhi + 1);
      P[3 * k] = rho * Math.cos(phi);
      P[3 * k + 1] = HELIX_PITCH * phi / TAU;
      P[3 * k + 2] = -rho * Math.sin(phi);
    }
  }
}

/**
 * The staircase of arg z made solid: a helicoid over the plane, the point z on the floor, a dashed fibre
 * above it with one bead per step theta + 2 pi k, the home bead larger. update(z, seam) moves the point and,
 * optionally, the seam (the edge of the home window (seam, seam + 2 pi]).
 */
export function argHelix({ z = { re: 1, im: 1 }, turns = 2, rMax = 3, seam = -Math.PI } = {}) {
  const K = clampInt(turns, 1, 8, 2);
  rMax = rMax > 0 ? rMax : 3;
  let curSeam = Number.isFinite(seam) ? seam : -Math.PI;
  const phiMax = (2 * K + 1) * Math.PI;
  const H = HELIX_PITCH * (K + 0.5);
  const group = new THREE.Group();
  group.name = 'arg-helix';

  const sheetGeom = (phi0, phi1, nPhi, nRho) => {
    const P = new Float32Array(3 * (nPhi + 1) * (nRho + 1));
    writeHelicoid(P, phi0, phi1, nPhi, nRho, rMax);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setIndex(new THREE.BufferAttribute(buildGridIndex(nPhi + 1, nRho + 1), 1));
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  };
  const sheetMat = (opacity) => new THREE.MeshLambertMaterial({
    color: tokenColor('--polar'), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  });

  const ghostSheet = new THREE.Mesh(sheetGeom(-phiMax, phiMax, (2 * K + 1) * 48, 8), sheetMat(0.18));
  ghostSheet.name = 'helix-ghost';
  const homeSheet = new THREE.Mesh(sheetGeom(curSeam, curSeam + TAU, 48, 8), sheetMat(0.50));
  homeSheet.name = 'helix-home';
  homeSheet.renderOrder = 1;

  const axis = dashedSegment('--text-muted', [0, -H, 0], [0, H, 0]);
  axis.name = 'helix-axis';
  const seamEnd = (s) => [rMax * Math.cos(s), 0, -rMax * Math.sin(s)];
  const seamRay = dashedSegment('--seam', [0, 0, 0], seamEnd(curSeam));
  seamRay.name = 'helix-seam';

  const floorPoint = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshLambertMaterial({ color: tokenColor('--cart') }));
  floorPoint.name = 'helix-point';
  floorPoint.renderOrder = 3;
  const fibre = dashedSegment('--text-muted', [0, -H, 0], [0, H, 0]);
  fibre.name = 'helix-fibre';

  const beads = [];
  for (let k = -K; k <= K; k++) {
    const home = k === 0;
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 10),
      new THREE.MeshLambertMaterial({ color: tokenColor('--polar'), transparent: true, opacity: home ? 1 : 0.55 }),
    );
    bead.scale.setScalar(home ? 1.7 : 1);
    bead.renderOrder = 3;
    bead.name = home ? 'helix-bead-home' : `helix-bead-${k}`;
    beads.push(bead);
  }
  group.add(ghostSheet, homeSheet, axis, seamRay, fibre, floorPoint, ...beads);

  group.userData = {
    kind: 'arg-helix', frame: true, turns: K, rMax, pitch: HELIX_PITCH, seam: curSeam,
    beads, floorPoint, fibre, homeSheet, ghostSheet, seamRay, axis,
    themeRefresh() {
      ghostSheet.material.color.copy(tokenColor('--polar'));
      homeSheet.material.color.copy(tokenColor('--polar'));
      axis.material.color.copy(tokenColor('--text-muted'));
      fibre.material.color.copy(tokenColor('--text-muted'));
      seamRay.material.color.copy(tokenColor('--seam'));
      floorPoint.material.color.copy(tokenColor('--cart'));
      for (const b of beads) b.material.color.copy(tokenColor('--polar'));
    },
  };

  function setSeam(s) {
    curSeam = s;
    group.userData.seam = s;
    const pa = homeSheet.geometry.getAttribute('position');
    writeHelicoid(pa.array, s, s + TAU, 48, 8, rMax);
    pa.needsUpdate = true;
    homeSheet.geometry.computeVertexNormals();
    homeSheet.geometry.computeBoundingBox();
    homeSheet.geometry.computeBoundingSphere();
    const ra = seamRay.geometry.getAttribute('position');
    const e = seamEnd(s);
    ra.setXYZ(0, 0, 0, 0); ra.setXYZ(1, e[0], e[1], e[2]);
    ra.needsUpdate = true;
    seamRay.computeLineDistances();
  }

  function update(zz, newSeam) {
    if (Number.isFinite(newSeam) && newSeam !== curSeam) setSeam(newSeam);
    const ok = zz && Number.isFinite(zz.re) && Number.isFinite(zz.im);
    floorPoint.visible = fibre.visible = ok;
    for (const b of beads) b.visible = ok;
    if (!ok) { notify(group); return; }
    const a = Math.atan2(zz.im, zz.re);                    // Arg, in (-pi, pi]
    let t = a - curSeam;
    t -= TAU * Math.floor(t / TAU);
    if (t === 0) t = TAU;
    const thetaHome = curSeam + t;                         // the unique angle in (seam, seam + 2 pi]
    for (let k = -K; k <= K; k++) {
      const h = HELIX_PITCH * (thetaHome + TAU * k) / TAU;
      beads[k + K].position.set(zz.re, h, -zz.im);
    }
    floorPoint.position.set(zz.re, 0, -zz.im);
    const fa = fibre.geometry.getAttribute('position');
    fa.setXYZ(0, zz.re, -H, -zz.im); fa.setXYZ(1, zz.re, H, -zz.im);
    fa.needsUpdate = true;
    fibre.computeLineDistances();
    notify(group);
  }

  update(z, curSeam);
  return { group, update };
}

// ---------------------------------------------------------------------------------------------
// 5.10 riemannSphere
// ---------------------------------------------------------------------------------------------

/**
 * The Riemann sphere: infinity is the north pole, the polar grid is latitude and longitude, 1/z is a
 * half-turn about the axis through 1 and -1 (curves.rotation.x = pi).
 */
export function riemannSphere({ radius = 1 } = {}) {
  const R = radius > 0 ? radius : 1;
  const group = new THREE.Group();
  group.name = 'riemann-sphere';
  const themed = [];                                          // { mat, token, alpha }
  const lineMat = (token, alpha) => {
    const mat = new THREE.LineBasicMaterial({ color: tokenColor(token), transparent: true, opacity: alpha });
    themed.push({ mat, token, alpha });
    return mat;
  };
  // plane frame (X, Y, Z) -> scene (R X, R Z, -R Y)
  const sc = (X, Y, Z, s = R) => [s * X, s * Z, -s * Y];

  const bodyMat = new THREE.MeshLambertMaterial({
    color: tokenColor('--surface-2'), transparent: true, opacity: isDark() ? 0.24 : 0.18, depthWrite: false, side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), bodyMat);
  body.name = 'sphere-body';
  group.add(body);

  const poly = (pts, mat, loop) => {
    const arr = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { arr[3 * i] = p[0]; arr[3 * i + 1] = p[1]; arr[3 * i + 2] = p[2]; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const line = loop ? new THREE.LineLoop(g, mat) : new THREE.Line(g, mat);
    line.frustumCulled = false;
    return line;
  };

  // graticule = the polar grid: parallels |z| = r and meridians arg z = theta
  for (const r of [0.25, 0.5, 1, 2, 4]) {
    const Z = (r * r - 1) / (r * r + 1), rho = 2 * r / (r * r + 1);
    const pts = [];
    for (let i = 0; i < 128; i++) { const a = TAU * i / 128; pts.push(sc(rho * Math.cos(a), rho * Math.sin(a), Z)); }
    const line = poly(pts, lineMat('--polar', r === 1 ? 0.9 : 0.45), true);
    line.name = r === 1 ? 'sphere-equator' : `sphere-parallel-${r}`;
    group.add(line);
  }
  for (let m = 0; m < 12; m++) {
    const th = TAU * m / 12;
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const b = Math.PI * i / 64, rho = Math.sin(b);
      pts.push(sc(rho * Math.cos(th), rho * Math.sin(th), -Math.cos(b)));
    }
    const line = poly(pts, lineMat('--polar', 0.45), false);
    line.name = `sphere-meridian-${m * 30}`;
    group.add(line);
  }
  // the real and imaginary axes as great circles
  const gc = (fn, name) => {
    const pts = [];
    for (let i = 0; i < 128; i++) pts.push(fn(TAU * i / 128));
    const line = poly(pts, lineMat('--cart', 0.9), true);
    line.name = name;
    group.add(line);
  };
  gc((a) => sc(Math.cos(a), 0, Math.sin(a)), 'sphere-real-axis');
  gc((a) => sc(0, Math.cos(a), Math.sin(a)), 'sphere-imag-axis');

  // infinity marker and labels
  const infinityMarker = new THREE.Group();
  infinityMarker.name = 'sphere-infinity';
  const pole = new THREE.Mesh(new THREE.SphereGeometry(0.05 * R, 16, 12), new THREE.MeshLambertMaterial({ color: tokenColor('--text') }));
  pole.position.set(0, R, 0);
  pole.renderOrder = 3;
  infinityMarker.add(pole);
  const labels = [];
  const addLabel = (text, token, X, Y, Z, parent) => {
    const s = makeLabelSprite(text, token, 12);
    if (!s) return null;
    const p = sc(X, Y, Z, 1.14 * R);
    s.position.set(p[0], p[1], p[2]);
    (parent || group).add(s);
    labels.push(s);
    return s;
  };
  addLabel('∞', '--text', 0, 0, 1, infinityMarker);
  group.add(infinityMarker);
  addLabel('0', '--text-muted', 0, 0, -1);
  addLabel('1', '--text-muted', 1, 0, 0);
  addLabel('-1', '--text-muted', -1, 0, 0);
  addLabel('i', '--text-muted', 0, 1, 0);
  addLabel('-i', '--text-muted', 0, -1, 0);

  // the axis of the half-turn: the line through the plane points 1 and -1 (the scene X axis)
  const axisLine = dashedSegment('--text-muted', [-1.5 * R, 0, 0], [1.5 * R, 0, 0]);
  axisLine.name = 'sphere-axis';
  axisLine.visible = false;
  group.add(axisLine);

  const curves = new THREE.Group();
  curves.name = 'sphere-curves';
  group.add(curves);

  group.userData = {
    kind: 'riemann-sphere', frame: true, frameRadius: R, radius: R, infinityMarker, axisLine, labels, curves,
    themeRefresh() {
      bodyMat.color.copy(tokenColor('--surface-2'));
      bodyMat.opacity = isDark() ? 0.24 : 0.18;
      for (const t of themed) t.mat.color.copy(tokenColor(t.token));
      pole.material.color.copy(tokenColor('--text'));
      axisLine.material.color.copy(tokenColor('--text-muted'));
    },
  };

  const project = (z) => {
    const s = stereographic(z);
    return new THREE.Vector3(R * s[0], R * s[2], -R * s[1]);
  };

  // great-circle subdivision keeps every sample at exactly R * SPHERE_LIFT from the centre
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const slerp = (u, v, s, ang) => {
    if (ang < 1e-9) return u;
    const k0 = Math.sin((1 - s) * ang) / Math.sin(ang), k1 = Math.sin(s * ang) / Math.sin(ang);
    return [k0 * u[0] + k1 * v[0], k0 * u[1] + k1 * v[1], k0 * u[2] + k1 * v[2]];
  };
  function subdivide(a, b, segs) {
    const ang = Math.acos(Math.min(1, Math.max(-1, dot3(a.v, b.v))));
    if (ang > Math.PI - 1e-6) return;                       // antipodal: break the line rather than draw through the centre
    const n = Math.max(1, Math.ceil(ang / SLERP_STEP));
    for (let m = 0; m < n; m++) {
      const s0 = m / n, s1 = (m + 1) / n;
      segs.push({ p0: slerp(a.v, b.v, s0, ang), p1: slerp(a.v, b.v, s1, ang), t0: a.t + (b.t - a.t) * s0, t1: a.t + (b.t - a.t) * s1 });
    }
  }

  function timeEnds() { return [resolveColor('--t0'), resolveColor('--t1')]; }

  function paint(line) {
    const u = line.userData;
    const base = resolveColor(u.color);
    const [c0, c1] = timeEnds();
    const col = line.geometry.getAttribute('color');
    const vt = u.vertexT;
    for (let i = 0; i < vt.length; i++) writeLinear(col.array, i, u.hasT ? rampRgb(base, c0, c1, vt[i]) : base);
    col.needsUpdate = true;
    if (u.dots) {
      const dc = u.dots.geometry.getAttribute('color');
      u.dotT.forEach((tk, i) => writeLinear(dc.array, i, rampRgb(base, c0, c1, tk)));
      dc.needsUpdate = true;
    }
  }

  function addCurve(points, color = '--input') {
    const pts = Array.isArray(points) ? points : [];
    const hasT = pts.length > 0 && pts.every((p) => p && Number.isFinite(p.t));
    const segs = [];
    let prev = null;
    for (const p of pts) {
      if (!p) { prev = null; continue; }
      const s = stereographic(p);                            // an infinite component goes to the north pole
      if (Number.isNaN(s[0]) || Number.isNaN(s[1]) || Number.isNaN(s[2])) { prev = null; continue; }
      const cur = { v: s, t: hasT ? p.t : 0 };
      if (prev) subdivide(prev, cur, segs);
      prev = cur;
    }
    const L = R * SPHERE_LIFT;
    const P = new Float32Array(segs.length * 6), vt = new Float32Array(segs.length * 2);
    segs.forEach((sg, i) => {
      P[6 * i] = L * sg.p0[0]; P[6 * i + 1] = L * sg.p0[2]; P[6 * i + 2] = -L * sg.p0[1];
      P[6 * i + 3] = L * sg.p1[0]; P[6 * i + 4] = L * sg.p1[2]; P[6 * i + 5] = -L * sg.p1[1];
      vt[2 * i] = sg.t0; vt[2 * i + 1] = sg.t1;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(segs.length * 6), 3));
    const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true }));
    line.renderOrder = 2;
    line.frustumCulled = false;
    line.userData = { kind: 'sphere-curve', points: pts, color, hasT, vertexT: vt, dots: null, dotT: [] };

    if (hasT) {                                             // dots at t = 0, 1/4, 1/2, 3/4, 1
      const dp = [], dt = [];
      for (const tk of [0, 0.25, 0.5, 0.75, 1]) {
        for (let i = 0; i + 1 < pts.length; i++) {
          const a = pts[i], b = pts[i + 1];
          if (![a.re, a.im, b.re, b.im].every(Number.isFinite)) continue;
          const lo = Math.min(a.t, b.t), hi = Math.max(a.t, b.t);
          if (tk < lo || tk > hi) continue;
          const f = hi === lo ? 0 : (tk - a.t) / (b.t - a.t);
          const q = project({ re: a.re + (b.re - a.re) * f, im: a.im + (b.im - a.im) * f });
          dp.push(q.x * SPHERE_LIFT, q.y * SPHERE_LIFT, q.z * SPHERE_LIFT);
          dt.push(tk);
          break;
        }
      }
      if (dt.length) {
        const dg = new THREE.BufferGeometry();
        dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dp), 3));
        dg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dp.length), 3));
        const dots = new THREE.Points(dg, new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true }));
        dots.renderOrder = 3;
        dots.frustumCulled = false;
        line.add(dots);
        line.userData.dots = dots;
        line.userData.dotT = dt;
      }
    }
    line.userData.themeRefresh = () => paint(line);
    paint(line);
    curves.add(line);
    notify(group);
    return line;
  }

  return {
    group, curves, project, addCurve,
    clearCurves() {
      for (const c of [...curves.children]) disposeObject(c);
      notify(group);
    },
    markInfinity(on = true) { infinityMarker.visible = !!on; notify(group); },
    setHalfTurn(angle) {
      curves.rotation.x = Number.isFinite(angle) ? angle : 0;
      curves.updateMatrix();
      notify(group);
    },
    showAxis(on = true) { axisLine.visible = !!on; notify(group); },
  };
}

// ---------------------------------------------------------------------------------------------
// 5.13 Injected style (once per page; tokens only)
// ---------------------------------------------------------------------------------------------

const VIEW_CSS = `
.three-view { position: relative; width: 100%; aspect-ratio: 4 / 3; min-height: 220px; overflow: hidden;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius, 10px); box-sizing: border-box; }
.three-view:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.three-view > canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; }
.three-view > canvas:active { cursor: grabbing; }
.three-hint { position: absolute; left: 8px; bottom: 8px; max-width: calc(100% - 16px); padding: 4px 8px;
  font: 12px/1.35 var(--font, system-ui, sans-serif); color: var(--text-muted); background: var(--surface); border-radius: 6px;
  opacity: 0.92; pointer-events: none; transition: opacity 0.4s; box-sizing: border-box; }
.three-hint[data-hidden="true"] { opacity: 0; }
.three-reset { position: absolute; top: 8px; right: 8px; min-height: 36px; padding: 0 12px;
  font: 600 13px var(--font, system-ui, sans-serif);
  color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
.three-reset:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
@media (pointer: coarse) { .three-reset { min-height: 40px; } }
.three-status { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px;
  text-align: center; font: 14px/1.4 var(--font, system-ui, sans-serif); color: var(--text); background: var(--surface-2);
  box-sizing: border-box; }
@media (prefers-reduced-motion: reduce) { .three-hint { transition: none; } }
`;

function injectStyleOnce() {
  if (!HAS_DOM) return;
  if (document.querySelector('style[data-for="three-view"]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-for', 'three-view');
  style.textContent = VIEW_CSS;
  (document.head || document.documentElement).appendChild(style);
}

// ---------------------------------------------------------------------------------------------
// 5.12 createView3D
// ---------------------------------------------------------------------------------------------

let viewSeq = 0;
let webglKnownGood = false;

function webglOk() {
  if (webglKnownGood) return true;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
    webglKnownGood = true;
    return true;
  } catch { return false; }
}

function viewRegistry() {
  if (typeof window === 'undefined') return new Map();
  const mv = (window.__mv = window.__mv || {});
  if (!mv.views3d) mv.views3d = new Map();
  if (!mv.planes) mv.planes = new Map();                    // plane.js expects it; harmless if it adds its own first
  return mv.views3d;
}

export function createView3D(container, {
  background = '--surface', cameraPosition = [3, 3, 4], grid = true, autoRotate = false,
  axes = true, axisLabels = ['x', 'y', 'h'], gridSize = 8, autoFrame = true, label = '3D view',
  target = [0, 0, 0], hint = true, forceUnavailable = false,
} = {}) {
  if (!container || typeof container !== 'object' || container.nodeType !== 1) {
    throw new TypeError('createView3D: container must be a DOM element');
  }
  const uid = container.id || 'three-view-' + (++viewSeq);
  injectStyleOnce();

  // --- container attributes (restored on dispose)
  const attrNames = ['role', 'aria-label', 'aria-roledescription', 'aria-describedby', 'tabindex'];
  const prevAttrs = {};
  for (const a of attrNames) prevAttrs[a] = container.getAttribute(a);
  const hadClass = container.classList.contains('three-view');
  const hadClassAttr = container.hasAttribute('class');
  container.classList.add('three-view');
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', String(label));
  container.setAttribute('aria-roledescription', '3D view');
  if (prevAttrs.tabindex === null) container.setAttribute('tabindex', '0');

  const mm = (q) => { try { return typeof matchMedia === 'function' ? matchMedia(q) : null; } catch { return null; } };
  const reduced = mm('(prefers-reduced-motion: reduce)');
  const coarse = !!mm('(pointer: coarse)')?.matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 4 / 3, 0.05, 200);
  camera.position.set(...cameraPosition);
  const opts = { background, grid, axes, axisLabels, gridSize, autoFrame, target };

  const frameCbs = new Set();
  const framed = new Set();
  let disposed = false;

  const view = {
    scene, camera, renderer: null, controls: null, canvas: null, container, id: uid, unavailable: false,
  };

  // --- registry
  const registry = viewRegistry();
  const finishDispose = () => {
    if (registry.get(uid) === view) registry.delete(uid);
  };

  // ======================================================================================
  // WebGL unavailable (probe before any three.js renderer exists, so three never logs an error)
  // ======================================================================================
  function buildUnavailable() {
    view.unavailable = true;
    const status = HAS_DOM ? document.createElement('div') : null;
    if (status) {
      status.className = 'three-status';
      status.id = uid + '-status';
      status.setAttribute('role', 'status');
      status.textContent = TEXT_UNAVAILABLE;
      container.appendChild(status);
    }
    registry.set(uid, view);
    const noop = () => {};
    Object.assign(view, {
      add(obj) { if (!disposed && obj) scene.add(obj); return obj; },
      remove(obj) { if (obj) scene.remove(obj); return obj; },
      onFrame() { return noop; },
      start: noop, stop: noop, requestRender: noop, renderNow: noop, resize: noop, fitTo: noop,
      resetCamera: noop, setBackgroundFromTheme: noop,
      dispose() {
        if (disposed) return;
        disposed = true;
        scene.traverse((o) => { if (o !== scene) disposeOne(o); });
        scene.clear();
        status?.remove();
        restoreContainer();
        finishDispose();
        const dead = () => (undefined);
        Object.assign(view, { add: (o) => o, remove: (o) => o, onFrame: () => noop, fitTo: dead, resetCamera: dead });
      },
    });
    return view;
  }

  function restoreContainer() {
    for (const a of attrNames) {
      if (prevAttrs[a] === null) container.removeAttribute(a);
      else container.setAttribute(a, prevAttrs[a]);
    }
    if (!hadClass) {
      container.classList.remove('three-view');
      if (!hadClassAttr && container.getAttribute('class') === '') container.removeAttribute('class');
    }
  }

  if (!HAS_DOM || forceUnavailable || !webglOk()) return buildUnavailable();

  // ======================================================================================
  // Renderer, controls, lights
  // ======================================================================================
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    return buildUnavailable();
  }
  const canvas = renderer.domElement;
  canvas.id = uid + '-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.insertBefore(canvas, container.firstChild);
  view.renderer = renderer;
  view.canvas = canvas;

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...target);
  controls.enableDamping = !(reduced && reduced.matches);
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.9;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 0.6;
  controls.maxDistance = 60;
  controls.screenSpacePanning = true;
  controls.autoRotate = !!autoRotate && !(reduced && reduced.matches);
  controls.autoRotateSpeed = 1.0;
  canvas.style.touchAction = coarse ? 'pan-y' : 'none';   // the constructor wrote 'none'
  view.controls = controls;

  const ambient = new THREE.AmbientLight(0xffffff, LIGHT.ambient);
  const head = new THREE.DirectionalLight(0xffffff, LIGHT.head);
  scene.add(ambient, head, head.target);

  // ======================================================================================
  // Furniture: grid, axes, labels (never framed)
  // ======================================================================================
  const furniture = new THREE.Group();
  furniture.name = 'furniture';
  scene.add(furniture);
  const themedChrome = [];                                 // { mat, token, alphaLight, alphaDark }
  const chromeMat = (token, aLight, aDark = aLight, extra = {}) => {
    const mat = new THREE.LineBasicMaterial({ color: tokenColor(token), transparent: true, opacity: isDark() ? aDark : aLight, ...extra });
    themedChrome.push({ mat, token, aLight, aDark });
    return mat;
  };
  const segmentsObject = (pairs, mat, order) => {
    const arr = new Float32Array(pairs.length * 3);
    pairs.forEach((p, i) => { arr[3 * i] = p[0]; arr[3 * i + 1] = p[2]; arr[3 * i + 2] = -p[1]; });   // maths -> scene
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(g, mat);
    l.renderOrder = order;
    l.frustumCulled = false;
    return l;
  };
  const gridMode = grid === true ? 'cart' : grid;
  const L = (Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 8) / 2;
  if (gridMode === 'cart' || gridMode === 'both') {
    const pairs = [];
    for (let k = -Math.floor(L); k <= Math.floor(L); k++) {
      pairs.push([k, -L, 0], [k, L, 0], [-L, k, 0], [L, k, 0]);
    }
    const g = segmentsObject(pairs, chromeMat('--cart', 0.30, 0.26, { depthWrite: false }), -1);
    g.name = 'grid-cart';
    furniture.add(g);
  }
  if (gridMode === 'polar' || gridMode === 'both') {
    const pairs = [];
    for (let r = 1; r <= Math.floor(L); r++) {
      for (let i = 0; i < 128; i++) {
        const a0 = TAU * i / 128, a1 = TAU * (i + 1) / 128;
        pairs.push([r * Math.cos(a0), r * Math.sin(a0), 0], [r * Math.cos(a1), r * Math.sin(a1), 0]);
      }
    }
    for (let m = 0; m < 12; m++) {
      const a = TAU * m / 12;
      pairs.push([0, 0, 0], [L * Math.cos(a), L * Math.sin(a), 0]);
    }
    const g = segmentsObject(pairs, chromeMat('--polar', 0.30, 0.26, { depthWrite: false }), -1);
    g.name = 'grid-polar';
    furniture.add(g);
  }
  if (axes) {
    const ax = segmentsObject([[-L, 0, 0], [L, 0, 0]], chromeMat('--cart', 0.9), 0);
    const ay = segmentsObject([[0, -L, 0], [0, L, 0]], chromeMat('--cart', 0.9), 0);
    const ah = segmentsObject([[0, 0, 0], [0, 0, L]], chromeMat('--text-muted', 0.9), 0);
    ax.name = 'axis-x'; ay.name = 'axis-y'; ah.name = 'axis-h';
    furniture.add(ax, ay, ah);
    const names = Array.isArray(axisLabels) ? axisLabels : ['x', 'y', 'h'];
    [[names[0], '--cart', [L + 0.35, 0, 0]], [names[1], '--cart', [0, L + 0.35, 0]], [names[2], '--text-muted', [0, 0, L + 0.35]]]
      .forEach(([text, token, p]) => {
        const s = makeLabelSprite(text, token);
        if (!s) return;
        s.position.set(p[0], p[2], -p[1]);
        furniture.add(s);
      });
  }
  furniture.userData.themeRefresh = () => {
    for (const t of themedChrome) { t.mat.color.copy(tokenColor(t.token)); t.mat.opacity = isDark() ? t.aDark : t.aLight; }
  };

  // ======================================================================================
  // Overlays: hint, reset button
  // ======================================================================================
  let hintEl = null;
  if (hint) {
    hintEl = document.createElement('div');
    hintEl.className = 'three-hint';
    hintEl.id = uid + '-hint';
    hintEl.textContent = coarse ? TEXT_HINT_COARSE : TEXT_HINT_FINE;
    container.setAttribute('aria-describedby', hintEl.id);
  }
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'three-reset';
  resetBtn.id = uid + '-reset';
  resetBtn.textContent = 'Reset view';
  resetBtn.setAttribute('aria-label', 'Reset the 3D view to its starting angle');
  container.appendChild(resetBtn);
  if (hintEl) container.appendChild(hintEl);
  const hideHint = () => { if (hintEl) hintEl.setAttribute('data-hidden', 'true'); };

  // ======================================================================================
  // Render loop (on demand)
  // ======================================================================================
  let running = false, visible = true, needsRender = true, rafId = 0, idle = 0, last = 0, userMoved = false;
  let autoFramed = false, contextLost = false, statusEl = null;
  let lastW = 0, lastH = 0, lastPR = 0, resizeRaf = 0, themeRaf = 0;

  function schedule() {
    if (!rafId && running && visible && !disposed) rafId = requestAnimationFrame(loop);
  }
  function requestRender() {
    if (disposed) return;
    needsRender = true; idle = 0; schedule();
  }
  function start() {
    if (disposed) return;
    running = true; resize(); requestRender();
  }
  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }
  function renderNow() {
    if (disposed || !renderer || contextLost) return;
    head.position.copy(camera.position);
    head.target.position.copy(controls.target);
    renderer.render(scene, camera);
    needsRender = false;
  }
  function loop(now) {
    rafId = 0;
    if (!running || disposed) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const changed = controls.update();                     // applies damping and autoRotate; true if the camera moved
    if (changed) { needsRender = true; idle = 0; } else idle++;
    for (const cb of Array.from(frameCbs)) {
      try { cb(dt, now / 1000, view); }
      catch (err) { console.error('three-view: onFrame callback threw', err); frameCbs.delete(cb); }
    }
    if (needsRender) renderNow();
    if (frameCbs.size > 0 || needsRender || controls.autoRotate || idle < IDLE_FRAMES) schedule();
  }

  function resize() {
    if (disposed || !renderer) return;
    const w = container.clientWidth, h = container.clientHeight;
    if (w < 2 || h < 2) return;
    const pr = Math.min(window.devicePixelRatio || 1, PR_MAX, Math.max(1, Math.sqrt(PIXEL_BUDGET / (w * h))));
    if (w === lastW && h === lastH && pr === lastPR) return;
    lastW = w; lastH = h; lastPR = pr;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);                         // false: do not write canvas.style
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyLabelScales(scene, h, camera.fov);
    requestRender();
  }

  // ======================================================================================
  // Framing
  // ======================================================================================
  // A ball-like object may set userData.frameRadius: it is then framed by that radius around its position instead
  // of by the half-diagonal of its box (which over-pads a sphere by about 1.7). Everything else frames by its box.
  const mergeSpheres = (a, b) => {
    if (!a) return b;
    const d = a.c.distanceTo(b.c);
    if (d + b.r <= a.r) return a;
    if (d + a.r <= b.r) return b;
    const r = (d + a.r + b.r) / 2;
    return { c: a.c.clone().lerp(b.c, (r - a.r) / d), r };
  };
  function fitTo(obj, { padding = 1.25 } = {}) {
    if (disposed || !controls) return;
    const targets = obj ? [obj] : Array.from(framed);
    const box = new THREE.Box3();
    let sphere = null;
    for (const t of targets) {
      if (t.userData && t.userData.frameRadius > 0) {
        t.updateWorldMatrix(true, false);
        sphere = mergeSpheres(sphere, { c: t.getWorldPosition(new THREE.Vector3()), r: t.userData.frameRadius });
      } else box.expandByObject(t);
    }
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      sphere = mergeSpheres(sphere, { c: box.getCenter(new THREE.Vector3()), r: size.length() / 2 });
    }
    if (!sphere) return;
    const c = sphere.c;
    if (![c.x, c.y, c.z, sphere.r].every(Number.isFinite)) return;
    const R = Math.max(0.5, sphere.r);
    const vFov = camera.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = R * padding / Math.sin(Math.min(vFov, hFov) / 2);
    const dir = camera.position.clone().sub(controls.target);
    if (dir.length() < 1e-6) dir.set(0.55, 0.5, 0.67);
    dir.normalize();
    controls.target.copy(c);
    camera.position.copy(c).addScaledVector(dir, dist);
    camera.near = Math.max(0.02, dist / 200);
    camera.far = dist * 20 + 4 * R;
    camera.updateProjectionMatrix();
    controls.minDistance = dist / 25;
    controls.maxDistance = dist * 4;
    controls.update();
    controls.saveState();
    requestRender();
  }

  function resetCamera() {
    if (disposed || !controls) return;
    controls.reset();
    requestRender();
  }

  // ======================================================================================
  // Theme
  // ======================================================================================
  function setBackgroundFromTheme() {
    if (disposed) return;
    tokenCache.clear();
    scene.background = tokenColor(opts.background);
    scene.traverse((o) => { if (o.userData && typeof o.userData.themeRefresh === 'function') o.userData.themeRefresh(o); });
    renderer.setClearColor(scene.background);
    requestRender();
  }
  const themeSoon = () => {
    if (themeRaf || disposed) return;
    themeRaf = requestAnimationFrame(() => { themeRaf = 0; setBackgroundFromTheme(); });
  };

  // ======================================================================================
  // Listeners
  // ======================================================================================
  const _off = new THREE.Vector3(), _sph = new THREE.Spherical();
  function orbitBy(dTheta, dPhi) {
    _off.copy(camera.position).sub(controls.target);
    _sph.setFromVector3(_off);
    _sph.theta += dTheta;
    if (dPhi !== 0) _sph.phi = Math.min(Math.PI - 0.05, Math.max(0.05, _sph.phi + dPhi));   // tilt stays off the poles
    _off.setFromSpherical(_sph);
    camera.position.copy(controls.target).add(_off);
    userMoved = true;
    controls.update();
    requestRender();
  }
  function zoomBy(factor) {
    _off.copy(camera.position).sub(controls.target);
    const len = Math.min(controls.maxDistance, Math.max(controls.minDistance, _off.length() * factor));
    _off.setLength(len);
    camera.position.copy(controls.target).add(_off);
    userMoved = true;
    controls.update();
    requestRender();
  }
  function onKeyDown(e) {
    if (disposed || e.target !== container) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    hideHint();
    const step = 0.12 * (e.shiftKey ? 3 : 1);
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft': orbitBy(-step, 0); break;
      case 'ArrowRight': orbitBy(step, 0); break;
      case 'ArrowUp': orbitBy(0, -step); break;
      case 'ArrowDown': orbitBy(0, step); break;
      case '+': case '=': zoomBy(0.88); break;
      case '-': case '_': zoomBy(1.14); break;
      case '0': case 'Home': resetCamera(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  }
  function onWheelCapture(e) {
    hideHint();
    if (document.activeElement !== container && !e.ctrlKey && !e.metaKey) e.stopPropagation();   // let the page scroll
  }
  const onPointerDown = () => hideHint();
  const onControlsStart = () => { userMoved = true; hideHint(); };
  const onResetClick = () => resetCamera();
  const onContextLost = (e) => {
    e.preventDefault();
    contextLost = true;
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'three-status';
      statusEl.id = uid + '-status';
      statusEl.setAttribute('role', 'status');
      statusEl.textContent = TEXT_CONTEXT_LOST;
      container.appendChild(statusEl);
    }
  };
  const onContextRestored = () => {
    contextLost = false;
    if (statusEl) { statusEl.remove(); statusEl = null; }
    requestRender();
  };
  const onReducedChange = () => {
    const m = !!(reduced && reduced.matches);
    controls.enableDamping = !m;
    controls.autoRotate = !!autoRotate && !m;
    requestRender();
  };

  container.addEventListener('keydown', onKeyDown);
  container.addEventListener('wheel', onWheelCapture, { capture: true, passive: true });
  container.addEventListener('pointerdown', onPointerDown);
  resetBtn.addEventListener('click', onResetClick);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', onControlsStart);

  let resizeObs = null, intersectObs = null, mutationObs = null;
  if (typeof ResizeObserver === 'function') {
    resizeObs = new ResizeObserver(() => {
      if (resizeRaf || disposed) return;
      resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; resize(); });
    });
    resizeObs.observe(container);
  }
  if (typeof IntersectionObserver === 'function') {
    intersectObs = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      visible = entry.isIntersecting;
      if (visible) requestRender();
    });
    intersectObs.observe(container);
  }
  document.addEventListener('themechange', themeSoon);
  if (typeof MutationObserver === 'function') {
    mutationObs = new MutationObserver(themeSoon);
    mutationObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  }
  const darkMQ = mm('(prefers-color-scheme: dark)');
  darkMQ?.addEventListener?.('change', themeSoon);
  reduced?.addEventListener?.('change', onReducedChange);

  // ======================================================================================
  // Public API
  // ======================================================================================
  Object.assign(view, {
    add(obj) {
      if (disposed || !obj) return obj;
      scene.add(obj);
      attachRender(obj, requestRender);
      applyLabelScales(obj, lastH, camera.fov);
      if (obj.userData && obj.userData.frame) {
        framed.add(obj);
        if (autoFrame && !userMoved && !autoFramed) { autoFramed = true; fitTo(obj); }
      }
      requestRender();
      return obj;
    },
    remove(obj) {
      if (!obj) return obj;
      scene.remove(obj);
      detachRender(obj, requestRender);
      framed.delete(obj);
      if (!disposed) requestRender();
      return obj;
    },
    onFrame(cb) {
      if (typeof cb !== 'function' || disposed) return () => {};
      frameCbs.add(cb);
      schedule();
      return () => frameCbs.delete(cb);
    },
    start, stop, requestRender, renderNow, resize, fitTo, resetCamera, setBackgroundFromTheme,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      if (themeRaf) cancelAnimationFrame(themeRaf);
      resizeObs?.disconnect();
      intersectObs?.disconnect();
      mutationObs?.disconnect();
      document.removeEventListener('themechange', themeSoon);
      darkMQ?.removeEventListener?.('change', themeSoon);
      reduced?.removeEventListener?.('change', onReducedChange);
      container.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('wheel', onWheelCapture, { capture: true });
      container.removeEventListener('pointerdown', onPointerDown);
      resetBtn.removeEventListener('click', onResetClick);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      controls.removeEventListener('change', requestRender);
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      frameCbs.clear();
      framed.clear();
      // dispose geometry, materials and textures while the renderer can still free them
      const all = [];
      scene.traverse((o) => { if (o !== scene) all.push(o); });
      for (const o of all) disposeOne(o);
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();                          // plain dispose() leaves the GL context alive
      canvas.remove();
      hintEl?.remove();
      resetBtn.remove();
      statusEl?.remove();
      restoreContainer();
      finishDispose();
      const noop = () => {};
      Object.assign(view, {
        add: (o) => o, remove: (o) => o, onFrame: () => noop, start: noop, stop: noop, requestRender: noop,
        renderNow: noop, resize: noop, fitTo: noop, resetCamera: noop, setBackgroundFromTheme: noop,
      });
      view.renderer = null; view.controls = null; view.canvas = null;
    },
  });

  registry.set(uid, view);
  setBackgroundFromTheme();
  resize();
  controls.saveState();
  start();
  return view;
}
