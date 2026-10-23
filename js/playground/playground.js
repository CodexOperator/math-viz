// playground.js — MX playground assembler, reference module (pg/1). Mirrors MX cells viz/playground-pick,
// study/c-path, study/orbit-settle byte-for-byte in behaviour; test_vectors.json is the contract. No deps, no DOM.
export const AX = {map: ["julia", "poly", "mandel", "newton"], view: ["plane", "split-param", "sphere", "split-sphere", "height", "chordal", "split-chordal"],
  colour: ["smooth", "escape", "trap", "basin", "curvature"], gesture: ["nudge", "drag-c", "scrub", "pinch-zoom", "ar-place"],
  reveal: ["roll", "trace", "verdict"], path: ["none", "c", "z0"]};
const A = Object.keys(AX);
export const LEVELS = [{map: ["julia"], view: ["plane"], colour: ["smooth"], gesture: ["nudge"], reveal: ["roll"], path: ["none"]},
  {colour: ["escape"], gesture: ["drag-c"], reveal: ["trace"]},
  {map: ["mandel"], view: ["split-param"], gesture: ["scrub"], reveal: ["verdict"], path: ["c"], preset: ["circle", "cardioid", "bulb2"]},
  {map: ["poly"], colour: ["trap"], gesture: ["pinch-zoom"], preset: ["segment", "figure8"]},
  {map: ["newton"], view: ["sphere", "split-sphere"], colour: ["basin"]},
  {view: ["height"], colour: ["curvature"], gesture: ["ar-place"], path: ["z0"], preset: ["expr"]},
  {view: ["chordal", "split-chordal"]}];
export const UNLOCK = [["any", {taps: 1, dwell_s: 20}], ["all", {drags: 3, traces: 1}], ["all", {scrubs: 2, verdicts: 2}],
  ["any", {pinches: 3, max_zoom: 1000}], ["all", {sessions: 2, history: 12}], ["all", {flashes: 4, history: 16}]];
const HC = ["julia", "poly", "newton"], has = (a, v) => a.includes(v);
export const RULES = [
  ["R1", (k) => (k.colour === "basin" && k.map !== "newton") || (k.map === "newton" && !has(["basin", "trap"], k.colour))],
  ["R2", (k) => k.view === "height" && !has(["smooth", "curvature", "trap"], k.colour)],
  ["R3", (k) => k.view === "split-param" && !has(["julia", "poly"], k.map)],
  ["R4", (k) => k.gesture === "drag-c" && !has(HC, k.map)],
  ["R5", (k) => k.gesture === "pinch-zoom" && has(["sphere", "height", "chordal"], k.view)],
  ["R6", (k) => (k.gesture === "scrub") !== (k.path !== "none")],
  ["R7", (k) => k.path === "c" && !has(HC, k.map)],
  ["R8", (k) => k.path === "z0" && k.reveal === "roll"],
  ["R9", (k, x) => k.gesture === "ar-place" && (!has(["sphere", "height", "chordal"], k.view) || !x.xr)],
  ["R10", (k, x) => ((k.view === "height" || k.view === "chordal") && (!x.webgl2 || (x.gpu ?? 1) < 1)) || (k.view.startsWith("split") && (x.gpu ?? 1) < 1)]];
const CL = {julia: [[-1, 0], [-0.123, 0.745], [-0.8, 0.156], [0.285, 0.01], [-0.4, 0.6], [-0.7269, 0.1889]],
  poly: [[0.2, 0.1], [-0.5, 0.55], [0.45, 0.3]], newton: [[1, 0], [0.5, 0.6], [0.3, -0.4]], mandel: [[-0.75, 0.1]]};
const WIN = {julia: [0, 0, 3.2], poly: [0, 0, 3], mandel: [-0.6, 0, 3.2], newton: [0, 0, 3]};
export function fnv(s) { let h = 2166136261; for (const b of new TextEncoder().encode(s)) h = Math.imul(h ^ b, 16777619) >>> 0; return h; }
export const broken = (k, x) => RULES.filter(([, f]) => f(k, x)).map(([r]) => r);
export const key = (k) => A.map((a) => k[a]).join("/");
const parts = (kk) => kk.split("/").map((v, i) => A[i] + ":" + v).filter((p) => !p.startsWith("path:"));
export function level(st) {
  const s = {...(st.signals || {}), history: (st.history || []).length}; let L = 0;
  while (L < UNLOCK.length && Object.entries(UNLOCK[L][1])[UNLOCK[L][0] === "any" ? "some" : "every"](([k, v]) => (s[k] || 0) >= v)) L++;
  return L;
}
export function unlocked(L) {
  const u = Object.fromEntries([...A, "preset"].map((a) => [a, []]));
  for (const lv of LEVELS.slice(0, L + 1)) for (const [a, v] of Object.entries(lv)) u[a].push(...v);
  return u;
}
export function combos(u, x) {
  let out = [{}];
  for (const a of A) out = out.flatMap((k) => AX[a].filter((v) => u[a].includes(v)).map((v) => ({...k, [a]: v})));
  return out.filter((k) => !broken(k, x).length);
}
function fill(k, L, u, seed, x) {
  const kk = key(k), m = k.map, w = WIN[m], g = x.gpu ?? 1, f = (s, n) => fnv(`${seed}|${kk}|${s}`) % n;
  const c = {v: "pg/1", key: kk, level: L, seed, map: {kind: m, c: CL[m][f("c", CL[m].length)], d: m === "poly" ? 3 + f("d", 3) : 2},
    view: {kind: k.view, window: {cx: w[0], cy: w[1], span: w[2]}}, colour: k.colour, gesture: k.gesture, reveal: k.reveal, path: null,
    settle: {escape_r: m === "newton" ? null : 2, K: 5, r_px: 4, max_points: null},
    budget: {px_scale: [0.5, 0.75, 1][g], max_iter: [128, 256, 512][g], fps_floor: 30, xr: !!x.xr}};
  if (k.path !== "none") { const pr = u.preset.filter((p) => p !== "expr" || L >= 5); c.path = {of: k.path, preset: pr[f("p", pr.length)], period_s: 12}; }
  return c;
}
export function pick(st, seed = 0) {
  const x = st.caps || {}, L = level(st), u = unlocked(L), hist = (st.history || []).slice(-32);
  const seen = new Set(hist.flatMap(parts)), recent = new Set(hist.slice(-8).flatMap(parts)), last3 = hist.slice(-3);
  let best = null, bs = null;
  for (const k of combos(u, x)) {
    const kk = key(k), ps = parts(kk), nw = ps.filter((p) => !seen.has(p)).length;
    const s = (nw === 1 ? 10 : nw === 0 ? 0 : -5 * (nw - 1)) + 2 * ps.filter((p) => !recent.has(p)).length - (last3.includes(kk) ? 20 : 0);
    const sc = [-s, fnv(`${seed}|${kk}`), kk];
    if (!bs || sc[0] < bs[0] || (sc[0] === bs[0] && (sc[1] < bs[1] || (sc[1] === bs[1] && sc[2] < bs[2])))) { best = k; bs = sc; }
  }
  return fill(best, L, u, seed, x);
}
// The diary's answer. The touch point is c, and the level picks which map may answer.
// Same point and level always return the same composition. No clock and no model.
export function flashPick(point, L = 0) {
  const Lv = Math.max(0, Math.min(UNLOCK.length, L | 0));
  const u = unlocked(Lv);
  const re = Array.isArray(point) ? +point[0] : 0;
  const im = Array.isArray(point) ? +point[1] : 0;
  const qre = Math.round((Number.isFinite(re) ? re : 0) * 1e6) / 1e6;
  const qim = Math.round((Number.isFinite(im) ? im : 0) * 1e6) / 1e6;
  const h = fnv(`${Lv}|${qre}|${qim}`);
  const kind = u.map[h % u.map.length];
  const span = 1.6;
  const c = [Math.max(-span, Math.min(span, qre)), Math.max(-span, Math.min(span, qim))];
  return {v: "pg/1", key: `${kind}/plane/smooth/nudge/roll/none`, level: Lv, seed: h,
    map: {kind, c, d: kind === "poly" ? 3 + (fnv(`${Lv}|${qre}|${qim}|d`) % 3) : 2},
    view: {kind: "plane", window: {cx: 0, cy: 0, span: 3.2}}, colour: "smooth", gesture: "nudge", reveal: "roll", path: null,
    settle: {escape_r: kind === "newton" ? null : 2, K: 5, r_px: 4, max_points: null},
    budget: {px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false}};
}
export function check(c, st) {   // [] = valid; else reasons. Use this to constrain a tiny model's proposal.
  const x = st.caps || {}, L = level(st), u = unlocked(L); let k;
  try { k = Object.fromEntries(A.map((a) => [a, a === "map" || a === "view" ? c[a].kind : a === "path" ? (c.path ? c.path.of : "none") : c[a]])); }
  catch { return ["shape"]; }
  const bad = A.filter((a) => !u[a].includes(k[a])).map((a) => `${a}=${k[a]} is ${AX[a].includes(k[a]) ? "locked at level " + L : "not in the grammar"}`);
  return bad.length ? bad : broken(k, x);
}
// ---- complex helpers (CPython-identical mul/div/powu so vectors match to the bit)
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
function div(a, b) {
  const ar = Math.abs(b[0]), ai = Math.abs(b[1]);
  if (ar >= ai) { if (ar === 0) return [Infinity, Infinity]; const r = b[1] / b[0], d = b[0] + b[1] * r; return [(a[0] + a[1] * r) / d, (a[1] - a[0] * r) / d]; }
  const r = b[0] / b[1], d = b[0] * r + b[1]; return [(a[0] * r + a[1]) / d, (a[1] * r - a[0]) / d];
}
function powu(x, n) { let r = [1, 0], p = x, m = 1; while (m > 0 && n >= m) { if (n & m) r = mul(r, p); m <<= 1; p = mul(p, p); } return r; }
// ---- study/c-path: presets are editable expressions; every free name becomes a slider
export const PRESETS = {circle: ["x + i*y + r*cis(2*pi*t)", {x: [0, -2, 2], y: [0, -2, 2], r: [0.7885, 0, 2]}],
  cardioid: ["s*(cis(2*pi*t)/2 - cis(4*pi*t)/4)", {s: [0.98, 0.5, 1.2]}], bulb2: ["-1 + r*cis(2*pi*t)", {r: [0.24, 0, 0.5]}],
  segment: ["x0 + i*y0 + (x1 - x0 + i*(y1 - y0))*(1 - cos(2*pi*t))/2", {x0: [-0.75, -2, 2], y0: [0.1, -2, 2], x1: [-0.75, -2, 2], y1: [0.6, -2, 2]}],
  figure8: ["x + r*sin(2*pi*t) + i*(y + r*sin(4*pi*t)/2)", {x: [-0.5, -2, 2], y: [0, -2, 2], r: [0.6, 0, 2]}]};
const cexp = (z) => { const e = Math.exp(z[0]); return [e * Math.cos(z[1]), e * Math.sin(z[1])]; };
const FN = {sin: (z) => [Math.sin(z[0]) * Math.cosh(z[1]), Math.cos(z[0]) * Math.sinh(z[1])],
  cos: (z) => [Math.cos(z[0]) * Math.cosh(z[1]), -Math.sin(z[0]) * Math.sinh(z[1])], exp: cexp, cis: (z) => cexp([-z[1], z[0]]),
  conj: (z) => [z[0], -z[1]], abs: (z) => [Math.hypot(z[0], z[1]), 0], re: (z) => [z[0], 0], im: (z) => [z[1], 0]};
const CONST = {i: [0, 1], pi: [Math.PI, 0], e: [Math.E, 0]};
export function parse(src) {   // -> {ast, free}; throws Error with a position
  if (typeof src !== "string" || !src.trim() || src.length > 120) throw Error("expr must be 1..120 characters");
  const re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+)|([a-z][a-z0-9_]*)|(\S))/y, T = []; let m;
  while (re.lastIndex < src.length && (m = re.exec(src))) { const v = m[1] ?? m[2] ?? m[3]; if (v === undefined) break; T.push([m[1] ? "num" : m[2] ? "id" : "op", v, m.index + m[0].length - v.length]); }
  T.push(["end", "", src.length]); let i = 0; const free = [];
  const peek = () => T[i], take = (v) => { const t = T[i]; if (v !== undefined && t[1] !== v) throw Error(`expected '${v}' at ${t[2]}`); i++; return t; };
  const expr = () => { let a = term(); while (peek()[0] === "op" && "+-".includes(peek()[1])) a = [take()[1], a, term()]; return a; };
  const term = () => { let a = unary(); while (peek()[0] === "op" && "*/".includes(peek()[1])) a = [take()[1], a, unary()]; return a; };
  const unary = () => { if (peek()[0] === "op" && "+-".includes(peek()[1])) return take()[1] === "-" ? ["neg", unary()] : unary();
    const a = atom(); if (peek()[1] === "^") { take(); return ["^", a, unary()]; } return a; };
  const atom = () => { const [ty, v, at] = take();
    if (ty === "num") return ["n", [parseFloat(v), 0]];
    if (ty === "op" && v === "(") { const a = expr(); take(")"); return a; }
    if (ty === "id") { if (FN[v]) { take("("); const a = expr(); take(")"); return ["f", v, a]; }
      if (v === "t") return ["t"]; if (CONST[v]) return ["n", CONST[v]];
      if (v.length > 8) throw Error(`name ${v} at ${at} is over 8 characters`); if (!free.includes(v)) free.push(v); return ["v", v]; }
    throw Error(`unexpected '${v || "end"}' at ${at}`); };
  const ast = expr(); if (peek()[0] !== "end") throw Error(`unexpected '${peek()[1]}' at ${peek()[2]} (multiply with *: 2*t)`);
  if (free.length > 6) throw Error(`${free.length} free variables; at most 6 sliders`);
  return {ast, free};
}
export function ev(a, t, V) {
  switch (a[0]) {
    case "n": return a[1]; case "t": return [t, 0]; case "v": return [V[a[1]], 0]; case "f": return FN[a[1]](ev(a[2], t, V));
    case "neg": { const z = ev(a[1], t, V); return [-z[0], -z[1]]; }
  }
  const x = ev(a[1], t, V), y = ev(a[2], t, V);
  if (a[0] === "+") return [x[0] + y[0], x[1] + y[1]]; if (a[0] === "-") return [x[0] - y[0], x[1] - y[1]];
  if (a[0] === "*") return mul(x, y); if (a[0] === "/") return y[0] || y[1] ? div(x, y) : [Infinity, 0];
  if (y[1] === 0 && Number.isInteger(y[0]) && Math.abs(y[0]) <= 16) { let r = [1, 0]; for (let j = 0; j < Math.abs(y[0]); j++) r = mul(r, x); return y[0] < 0 ? div([1, 0], r) : r; }
  if (!x[0] && !x[1]) return [0, 0];
  const lg = [Math.log(Math.hypot(x[0], x[1])), Math.atan2(x[1], x[0])]; return cexp(mul(y, lg));
}
export function cPath(spec, n = 64) {   // = study/c-path's value
  const pre = spec.preset, [src, dflt] = pre ? PRESETS[pre] : [spec.expr, {}], {ast, free} = parse(src), vars = {}, V = {};
  for (const v of free) { const [d, lo, hi] = dflt[v] || [0.5, -2, 2], val = (spec.vars || {})[v] ?? d;
    vars[v] = {value: val, min: Math.min(lo, val), max: Math.max(hi, val), step: 0.01}; V[v] = val; }
  const r12 = (x) => Math.round(x * 1e12) / 1e12 + 0;
  const samples = Array.from({length: n}, (_, j) => ev(ast, j / n, V).map(r12));
  return {of: spec.of || "c", preset: pre || "expr", expr: src, vars, n, samples, period_s: spec.period_s ?? 12, at: (t) => ev(ast, t, V)};
}
// ---- study/orbit-settle (= math-viz js/core/orbit-settle.js, PR #10): Leaves (escape, or off the window), Settles (the
// smallest p <= 32 whose return is within R, with the K newest points of every residue mod p in a disk of radius R whose
// centre moved <= R/16 since the K before), Stays (cap max(800, 32K)). R defaults to 4 px of the window; R <= 0 or null:
// no clustering. Distances are sqrt(dx*dx+dy*dy) (not Math.hypot) so Python and JS agree to the bit.
const dist = (a, b) => { const x = a[0] - b[0], y = a[1] - b[1]; return Math.sqrt(x * x + y * y); };
const mean = (g) => { let x = 0, y = 0; for (const q of g) { x += q[0]; y += q[1]; } return [x / g.length, y / g.length]; };
function disks(pts, p, K, R) {
  const L = pts.length, out = [];
  if (L < 2 * p * K) return null;
  for (let r = 0; r < p; r++) {
    const g = [], h = [];
    for (let i = 0; i < K; i++) { g.push(pts[L - 1 - r - p * i]); h.push(pts[L - 1 - r - p * K - p * i]); }
    const o = mean(g); let sp = 0; for (const q of g) sp = Math.max(sp, dist(q, o));
    if (sp > R || dist(o, mean(h)) > R / 16) return null;
    out.push([o, sp]);
  }
  return out;
}
function back(pts, t, le) {
  for (let p = 1; p <= Math.min(32, pts.length - 1); p++) { const e = dist(pts[pts.length - 1], pts[pts.length - 1 - p]); if (e < t || (le && e === t)) return p; }
  return null;
}
export function criticalPeriod(c, it = 240, tol = 1e-3) {   // the theorem line: 0 escaped, null no cycle <= 32
  let z = [0, 0]; const pts = [];
  for (let n = 0; n < it; n++) {
    const q = mul(z, z); z = [q[0] + c[0], q[1] + c[1]];
    if (!isFinite(z[0]) || !isFinite(z[1]) || z[0] * z[0] + z[1] * z[1] > 4) return 0;
    pts.push(z);
  }
  // Exercise 8: a real c past 1/4 is not in the set. A short probe can sit inside
  // the tolerance while the orbit is still climbing. That is not period 1.
  if (c[0] > 0.25 && Math.abs(c[1]) <= 1e-12) return 0;
  return back(pts, tol, false);
}
export const SETTLE_WINDOW = {center: [0, 0], units_across: 4, width_px: 640};   // the site's plane (height = width)
export function settleRule(s) {
  const K = s.K ?? 5;
  if (!Number.isInteger(K) || K < 2 || K > 64) throw new Error("K must be an integer in [2, 64]");
  const w0 = s.window === undefined ? {} : s.window, w = w0 && {center: w0.center ?? [0, 0], u: w0.units_across ?? 4, w: w0.width_px ?? 640,
    h: w0.height_px ?? w0.width_px ?? 640};
  let R = s.R != null ? s.R : (s.R === null || !w) ? null : 4 * w.u / w.w;   // undefined = left out
  if (R !== null && typeof R !== "number") throw new Error("R must be a number");
  return {K, R: R > 0 ? R : null, w, cap: Math.max(K + 1, s.max_points ?? Math.max(800, 32 * K))};
}
export function settle(s, cOver, z0Over, keep = 0) {
  const m = s.map, nw = m === "newton", d = s.d ?? (m === "poly" ? 3 : 2), {K, R, w, cap} = settleRule(s);
  const er = "escape_r" in s ? s.escape_r : nw ? null : 2;
  let c = cOver || s.c || (nw ? [1, 0] : [-1, 0]), z = z0Over || s.z0 || [0, 0];
  if (m === "mandel") { c = z0Over || c; z = [0, 0]; }
  const pts = [z], crit = m === "julia" || m === "mandel" || (m === "poly" && d === 2) ? criticalPeriod(c) : null;
  const out = (why, n, ds = null, p = null) => {
    const v = {verdict: why === "cluster" ? "Settles" : why === "cap" ? "Stays" : "Leaves", reason: why, n, period: p || null,
      critical_period: crit, orbit: pts.slice(0, keep)};
    if (ds) { v.disks = ds; v.overlap = ds.some((a, i) => ds.slice(i + 1).some((b) => dist(a[0], b[0]) < 3 * R)); }
    return v;
  };
  for (let n = 0; n < cap; n++) {
    if (nw) { const t3 = mul(mul([3, 0], z), z), dp = [t3[0] + (c[0] - 1), t3[1] + c[1]];   // p(z) = (z-1)(z^2+z+c)
      if (Math.hypot(dp[0], dp[1]) < 1e-300) return out("escape", n);
      const cm1 = [c[0] - 1, c[1]], p = mul(cm1, z), z3 = powu(z, 3), pz = [z3[0] + p[0] - c[0], z3[1] + p[1] - c[1]], q = div(pz, dp);
      z = [z[0] - q[0], z[1] - q[1]];
    } else { const zd = d === 2 ? mul(z, z) : powu(z, d); z = [zd[0] + c[0], zd[1] + c[1]]; }
    if (!isFinite(z[0]) || !isFinite(z[1])) return out("escape", n);
    pts.push(z);
    if (er !== null && z[0] * z[0] + z[1] * z[1] > er * er) return out("escape", n + 1);
    if (w && (Math.abs(z[0] - w.center[0]) > w.u / 2 * 1.05 || Math.abs(z[1] - w.center[1]) > w.u / 2 * (w.h / w.w) * 1.05)) return out("screen", n + 1);
    if (R === null || pts.length < K) continue;
    for (let p = 1; p <= Math.min(32, Math.floor(pts.length / K)); p++) {
      if (dist(z, pts[pts.length - 1 - p]) > R) continue;
      const ds = disks(pts, p, K, R);
      if (ds) {
        // The page's walk (orbit-settle) keeps a near-1 window going. A real
        // climb of 0 under z^2 + c, with c past 1/4, is Exercise 8: it leaves.
        // c = 1/4 itself is the parabolic point and the first disk still stands.
        // The basilica is not this climb, so it still settles at this disk.
        if (!nw && d === 2 && quadLam(pts, p) >= 0.93 && quadLam(pts, p) < 1 && realClimb(pts)) {
          const held = pts.length;
          const hop = hopCusp(pts, c, er, w, n, 40000);
          if (hop.left) return out(hop.why, hop.n);
          const watched = pts.length - 1;
          const outside = hop.exhausted && realCuspOutside(pts);
          pts.length = held;
          if (outside) return out("cusp", watched);
        }
        return out("cluster", n + 1, ds, p);
      }
      break;
    }
  }
  return out("cap", cap, null, R && back(pts, R, true));
}
function quadLam(pts, p) {
  let lam = 1;
  const n = pts.length;
  for (let j = 0; j < p; j++) { const q = pts[n - 1 - j]; lam *= 2 * Math.sqrt(q[0] * q[0] + q[1] * q[1]); }
  return lam;
}
function realClimb(pts) {
  if (pts.length < 6) return false;
  const a = pts[pts.length - 6], b = pts[pts.length - 1];
  if (Math.abs(a[1]) > 1e-8 || Math.abs(b[1]) > 1e-8) return false;
  return b[0] > a[0] + 1e-15 && b[0] > 0.2 && b[0] < 2;
}
function realCuspOutside(pts) {
  if (pts.length < 3) return false;
  const z0 = pts[0];
  if (Math.hypot(z0[0], z0[1]) > 1e-12) return false;
  const c = pts[1];
  if (!(c[0] > 0.25) || Math.abs(c[1]) > 1e-12) return false;
  const z2 = pts[2];
  const re = c[0] * c[0] - c[1] * c[1] + c[0], im = 2 * c[0] * c[1] + c[1];
  return Math.hypot(z2[0] - re, z2[1] - im) <= 1e-9;
}
function hopCusp(pts, c, er, w, n, extra) {
  const cap = n + 1 + extra;
  let z = pts[pts.length - 1];
  for (let s = n + 1; s < cap; s++) {
    const zd = mul(z, z); z = [zd[0] + c[0], zd[1] + c[1]];
    if (!isFinite(z[0]) || !isFinite(z[1])) return {left: true, why: "escape", n: s};
    pts.push(z);
    if (er !== null && z[0] * z[0] + z[1] * z[1] > er * er) return {left: true, why: "escape", n: s + 1};
    if (w && (Math.abs(z[0] - w.center[0]) > w.u / 2 * 1.05 || Math.abs(z[1] - w.center[1]) > w.u / 2 * (w.h / w.w) * 1.05)) return {left: true, why: "screen", n: s + 1};
    if (!realClimb(pts)) return {left: false, exhausted: false, n: pts.length - 1};
  }
  return {left: false, exhausted: true, n: pts.length - 1};
}
