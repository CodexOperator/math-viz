// CPU picture of one composition. The same colour rules as the shader.
// JavaScript numbers are float64, so this is also the deep-zoom tier.

export function mix(a, b, t) {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

function smooth(e0, e1, x) {
  if (e0 === e1) return x < e0 ? 0 : 1;
  const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
}

export function palette(ink, t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  // The void is already navy, so the first ink is blue, then orange, then purple.
  let c = mix(ink.cart, ink.polar, smooth(0, 0.48, x));
  c = mix(c, ink.output, smooth(0.32, 0.88, x));
  return c;
}

export function csqrt(re, im) {
  if (re === 0 && im === 0) return [0, 0];
  const m = Math.hypot(re, im);
  return [Math.sqrt((m + re) / 2), (im < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (m - re) / 2))];
}

export function newtonRoots(c) {
  const s = csqrt(1 - 4 * c[0], -4 * c[1]);
  return [[1, 0], [(-1 + s[0]) / 2, s[1] / 2], [(-1 - s[0]) / 2, (-s[1]) / 2]];
}

function cmul(a, b) {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function cpow(z, n) {
  let r = [1, 0];
  const k = n | 0;
  for (let i = 0; i < k; i++) r = cmul(r, z);
  return r;
}

export function newtonStep(z, c) {
  const z2 = cmul(z, z);
  const z3 = cmul(z2, z);
  const cm1 = [c[0] - 1, c[1]];
  const dp = [3 * z2[0] + cm1[0], 3 * z2[1] + cm1[1]];
  if (Math.hypot(dp[0], dp[1]) < 1e-300) return null;
  const p = cmul(cm1, z);
  const pz = [z3[0] + p[0] - c[0], z3[1] + p[1] - c[1]];
  const mag = dp[0] * dp[0] + dp[1] * dp[1];
  const q = [(pz[0] * dp[0] + pz[1] * dp[1]) / mag, (pz[1] * dp[0] - pz[0] * dp[1]) / mag];
  return [z[0] - q[0], z[1] - q[1]];
}

function nearestRoot(z, roots) {
  let best = -1;
  let bestD = Infinity;
  for (let k = 0; k < roots.length; k++) {
    const d = (z[0] - roots[k][0]) ** 2 + (z[1] - roots[k][1]) ** 2;
    if (d < bestD) { bestD = d; best = k; }
  }
  return { index: best, d2: bestD };
}

// One orbit. colour picks the bailout: escape uses 2, smooth / curvature / height use 256.
export function samplePoint(kind, z0, c, d, maxIter, colour) {
  const newton = kind === 'newton';
  const bail = newton ? Infinity : colour === 'escape' ? 2 : colour === 'trap' ? 64 : 256;
  const roots = newton ? newtonRoots(c) : null;
  let z = kind === 'mandel' ? [0, 0] : [z0[0], z0[1]];
  const cc = kind === 'mandel' ? [z0[0], z0[1]] : c;
  const deg = d | 0 || 2;
  let trap = Math.min(Math.hypot(z[0], z[1]), Math.abs(z[0]), Math.abs(z[1]));
  const mx = maxIter | 0;
  for (let n = 1; n <= mx; n++) {
    if (newton) {
      const next = newtonStep(z, cc);
      if (!next || !isFinite(next[0]) || !isFinite(next[1])) {
        return finish(n, z, deg, trap, -1, false);
      }
      z = next;
      trap = Math.min(trap, Math.hypot(z[0], z[1]), Math.abs(z[0]), Math.abs(z[1]));
      const hit = nearestRoot(z, roots);
      if (hit.d2 < 1e-12) return finish(n, z, deg, trap, hit.index, false);
    } else {
      const zd = deg === 2 ? cmul(z, z) : cpow(z, deg);
      z = [zd[0] + cc[0], zd[1] + cc[1]];
      if (!isFinite(z[0]) || !isFinite(z[1])) return finish(n, z, deg, trap, -1, true);
      trap = Math.min(trap, Math.hypot(z[0], z[1]), Math.abs(z[0]), Math.abs(z[1]));
      if (Math.hypot(z[0], z[1]) > bail) return finish(n, z, deg, trap, -1, true);
    }
  }
  const root = roots ? nearestRoot(z, roots).index : -1;
  return finish(mx, z, deg, trap, root, false);
}

function finish(n, z, d, trap, root, escaped) {
  const mag = Math.hypot(z[0] || 0, z[1] || 0);
  let nu = n;
  let G = 0;
  if (mag > 1 && isFinite(mag)) {
    const logm = Math.log(mag);
    const ll = Math.log(logm);
    if (escaped && isFinite(ll)) nu = n + 1 - ll / Math.log(d);
    G = logm / (d ** n);
    if (!isFinite(G)) G = 0;
  }
  return { n, nu, G: isFinite(G) ? G : 0, trap: isFinite(trap) ? trap : 1, root, escaped };
}

export function colourOf(s, colour, ink) {
  if (colour === 'basin') {
    const hue = s.root === 0 ? ink.cart : s.root === 1 ? ink.polar : s.root === 2 ? ink.output : ink.navy;
    const v = Math.min(1, Math.max(0, 1 - s.n / 40));
    return mix(ink.navy, hue, 0.28 + 0.72 * v);
  }
  if (colour === 'trap') {
    return mix(ink.navy, ink.input, Math.exp(-8 * Math.min(s.trap, 8)));
  }
  if (!s.escaped) return mix(ink.navy, ink.cart, 0.82);
  if (colour === 'escape') return palette(ink, (s.n % 16) / 16);
  return palette(ink, Math.min(1, Math.max(0, s.nu / 32)));
}

function byte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

// RGBA8. Alpha holds diaryN (low escape times first), not n/maxIter, so the roll does not blink.
export function bakeImage(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const comp = opts.comp;
  const ink = opts.ink;
  const maxIter = opts.maxIter | 0;
  const rgba = opts.rgba || new Uint8ClampedArray(w * h * 4);
  const y0 = opts.y0 | 0;
  const y1 = opts.y1 == null ? h : opts.y1 | 0;
  const x0 = opts.x0 | 0;
  const x1 = opts.x1 == null ? w : opts.x1 | 0;
  const kind = comp.map.kind;
  const d = comp.map.d | 0;
  const colour = comp.colour === 'curvature' ? 'smooth' : comp.colour;
  const split = comp.view.kind === 'split-param';
  const win = comp.view.window;
  const right = { cx: -0.6, cy: 0, span: 3.2 };
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const rightPane = split && x >= w / 2;
      const pw = split ? w / 2 : w;
      const px = rightPane ? x - w / 2 : x;
      const ww = rightPane ? right : win;
      const kindHere = rightPane ? 'mandel' : kind;
      const aspect = pw / h;
      const re = ww.cx + ((px + 0.5) / pw - 0.5) * ww.span * aspect;
      const im = ww.cy + (0.5 - (y + 0.5) / h) * ww.span;
      let s = samplePoint(kindHere, [re, im], comp.map.c, rightPane ? d : d, maxIter, colour);
      let rgb = colourOf(s, colour, ink);
      if (rightPane) {
        const dx = (re - comp.map.c[0]) / (ww.span * aspect) * pw;
        const dy = (im - comp.map.c[1]) / ww.span * h;
        const dist = Math.hypot(dx, dy);
        if (dist > 5 && dist < 9) {
          rgb = ink.polar;
          s = { n: 0, nu: 0, G: 0, trap: 0, root: -1, escaped: true };
        }
      }
      const i = (y * w + x) * 4;
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = byte(Math.round(255 * diaryN(s.n)));
    }
  }
  return { rgba, w, h };
}

// Latitude-longitude bake of the same field, inverse stereographic from the north pole.
// Row 0 is the bottom of the bitmap, which is the south pole, matching a WebGL readPixels.
export function bakeLatLong(opts) {
  const w = opts.w | 0;
  const h = opts.h | 0;
  const rgba = new Uint8Array(w * h * 4);
  const comp = opts.comp;
  const kind = comp.map.kind;
  const colour = comp.colour === 'curvature' ? 'smooth' : comp.colour;
  const maxIter = opts.maxIter | 0;
  for (let y = 0; y < h; y++) {
    const py = (y + 0.5) / h;
    const phi = (1 - py) * Math.PI;
    const ys = Math.cos(phi);
    const s = Math.sin(phi);
    const den = 1 - ys;
    for (let x = 0; x < w; x++) {
      const theta = ((x + 0.5) / w) * Math.PI * 2 - Math.PI;
      const re = den > 1e-4 ? (s * Math.cos(theta)) / den : 1e6;
      const im = den > 1e-4 ? (s * Math.sin(theta)) / den : 0;
      const sample = samplePoint(kind, [re, im], comp.map.c, comp.map.d, maxIter, colour);
      const rgb = colourOf(sample, colour, opts.ink);
      const i = (y * w + x) * 4;
      rgba[i] = byte(rgb[0]);
      rgba[i + 1] = byte(rgb[1]);
      rgba[i + 2] = byte(rgb[2]);
      rgba[i + 3] = byte(Math.round(255 * diaryN(sample.n)));
    }
  }
  return { data: rgba, w, h };
}

// Chordal distance on the Riemann sphere. χ(z, a) = |z − a| / (√(1+|z|²) √(1+|a|²)).
// It is the straight-line distance between the two stereographic lifts, scaled by 1/2
// is the usual chord; this form is the one that is 0 at a and at most 1.
export function chordal(z, a) {
  const dz = Math.hypot(z[0] - a[0], z[1] - a[1]);
  const nz = Math.hypot(1, Math.hypot(z[0], z[1]));
  const na = Math.hypot(1, Math.hypot(a[0], a[1]));
  return nz > 0 && na > 0 ? dz / (nz * na) : 0;
}

// Height is the chordal distance from c. Colour is the same field as the plane beside it.
export function bakeChordal(comp, n, maxIter, ink) {
  const grid = bakeGrid(comp, n, maxIter, ink);
  const focus = comp.map.c || [0, 0];
  const win = comp.view.window;
  const w = grid.w;
  const h = grid.h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const re = win.cx + ((x + 0.5) / w - 0.5) * win.span;
      const im = win.cy + (0.5 - (y + 0.5) / h) * win.span;
      const i = y * w + x;
      grid.G[i] = chordal([re, im], focus) * 1.35;
    }
  }
  if (comp.colour === 'curvature') {
    const pot = bakeGrid(comp, n, maxIter, ink);
    grid.curv = curvatureOf(pot.G, pot.w, pot.h);
  }
  grid.chordal = true;
  grid.window = { cx: win.cx, cy: win.cy, span: win.span };
  return grid;
}

// A square grid of the potential, for the height field and for curvature.
export function bakeGrid(comp, n, maxIter, ink) {
  const w = n | 0;
  const h = n | 0;
  const G = new Float32Array(w * h);
  const nNorm = new Float32Array(w * h);
  const rgb = new Uint8ClampedArray(w * h * 3);
  const win = comp.view.window;
  const kind = comp.map.kind;
  const colour = comp.colour === 'curvature' ? 'smooth' : comp.colour;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const re = win.cx + ((x + 0.5) / w - 0.5) * win.span;
      const im = win.cy + (0.5 - (y + 0.5) / h) * win.span;
      const s = samplePoint(kind, [re, im], comp.map.c, comp.map.d, maxIter, 'smooth');
      const i = y * w + x;
      G[i] = s.G;
      nNorm[i] = diaryN(s.n);
      const col = colourOf(s, colour, ink);
      rgb[i * 3] = col[0];
      rgb[i * 3 + 1] = col[1];
      rgb[i * 3 + 2] = col[2];
    }
  }
  return { G, nNorm, rgb, w, h };
}

// Mean curvature of the graph h = G. Signed. The 95th percentile of |H| is the clamp.
export function curvatureOf(G, w, h) {
  const H = new Float32Array(w * h);
  const abs = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const hx = (G[i + 1] - G[i - 1]) * 0.5;
      const hy = (G[i + w] - G[i - w]) * 0.5;
      const hxx = G[i + 1] - 2 * G[i] + G[i - 1];
      const hyy = G[i + w] - 2 * G[i] + G[i - w];
      const hxy = (G[i + w + 1] - G[i + w - 1] - G[i - w + 1] + G[i - w - 1]) * 0.25;
      const num = (1 + hy * hy) * hxx - 2 * hx * hy * hxy + (1 + hx * hx) * hyy;
      const den = 2 * (1 + hx * hx + hy * hy) ** 1.5;
      const v = den > 1e-8 && isFinite(num) ? num / den : 0;
      H[i] = v;
      abs.push(Math.abs(v));
    }
  }
  abs.sort((a, b) => a - b);
  const p = abs.length ? abs[Math.min(abs.length - 1, Math.floor(abs.length * 0.95))] : 1;
  return { H, clamp: p > 1e-8 ? p : 1 };
}

export function curvatureInk(v, clamp, ink) {
  const t = Math.max(-1, Math.min(1, v / clamp));
  if (t < 0) return mix(ink.navy, ink.cart, -t);
  return mix(ink.navy, ink.polar, t);
}

// Escape time is steep: almost every pixel outside the set leaves in a handful of
// steps, so n/maxIter turns the picture on in one blink. Counting from the first
// step, 1 - e^{-(n-1)/8} keeps low n first and spends the 2.4 s on those steps.
export function diaryN(n) {
  const k = Math.max(0, (Number(n) || 0) - 1);
  return 1 - Math.exp(-k / 8);
}

// Paint a baked RGBA (alpha = diaryN) into a display buffer at this reveal.
// Low escape times lead. The window is 0.22 wide so each band takes about half a second.
export function revealBuffer(src, dst, u, reduced) {
  const n = src.length;
  for (let i = 0; i < n; i += 4) {
    const nn = src[i + 3] / 255;
    let a;
    if (reduced) a = u <= 0 ? 0 : u >= 1 ? 1 : u;
    else if (u <= 0) a = 0;
    else a = smooth(nn * 0.72, nn * 0.72 + 0.22, u);
    dst[i] = byte(src[i] * a);
    dst[i + 1] = byte(src[i + 1] * a);
    dst[i + 2] = byte(src[i + 2] * a);
    dst[i + 3] = byte(a * 255);
  }
  return dst;
}
