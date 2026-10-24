// playground.js — MX playground assembler, reference module (pg/1). Mirrors MX cells viz/playground-pick,
// study/c-path, study/orbit-settle byte-for-byte in behaviour; test_vectors.json is the contract. No deps, no DOM.
export const AX = {map: ["julia", "poly", "mandel", "newton"], view: ["plane", "split-param", "sphere", "split-sphere", "height", "chordal", "split-chordal", "slice", "split-slice", "excess", "bend", "unity", "split-unity", "diary", "split-diary", "twins", "bulbs", "cascade", "rays"],
  colour: ["smooth", "escape", "trap", "basin", "curvature"], gesture: ["nudge", "drag-c", "scrub", "pinch-zoom", "ar-place"],
  reveal: ["roll", "trace", "verdict"], path: ["none", "c", "z0"]};
const A = Object.keys(AX);
export const LEVELS = [{map: ["julia"], view: ["plane"], colour: ["smooth"], gesture: ["nudge"], reveal: ["roll"], path: ["none"]},
  {colour: ["escape"], gesture: ["drag-c"], reveal: ["trace"]},
  {map: ["mandel"], view: ["split-param"], gesture: ["scrub"], reveal: ["verdict"], path: ["c"], preset: ["circle", "cardioid", "bulb2"]},
  {map: ["poly"], colour: ["trap"], gesture: ["pinch-zoom"], preset: ["segment", "figure8"]},
  {map: ["newton"], view: ["sphere", "split-sphere"], colour: ["basin"]},
  {view: ["height"], colour: ["curvature"], gesture: ["ar-place"], path: ["z0"], preset: ["expr"]},
  {view: ["chordal", "split-chordal"]},
  {view: ["slice", "split-slice"]},
  {view: ["excess", "bend"]},
  {view: ["unity", "split-unity"]},
  {view: ["diary", "split-diary"]},
  {view: ["twins"]},
  {view: ["bulbs"]},
  {view: ["cascade"]},
  {view: ["rays"]}];
export const UNLOCK = [["any", {taps: 1, dwell_s: 20}], ["all", {drags: 3, traces: 1}], ["all", {scrubs: 2, verdicts: 2}],
  ["any", {pinches: 3, max_zoom: 1000}], ["all", {sessions: 2, history: 12}], ["all", {flashes: 1, history: 16}],
  ["all", {metrics: 2, flashes: 3, history: 20}], ["all", {slices: 2, history: 24}], ["all", {bends: 2, history: 28}],
  ["all", {roots: 2, history: 32}], ["all", {writes: 2, history: 36}], ["all", {twins: 2, history: 40}],
  ["all", {doubles: 2, history: 44}], ["all", {lands: 2, history: 48}]];
// L6: one flash, the void has answered. History 16 keeps the shape chapter ahead of the metric. Four flashes was a count.
// L7: the distance has been read twice, the void has answered three times, and twenty pictures are behind.
// L8: the slice plane has been turned twice, and twenty-four pictures are behind. The bend cannot open first.
// L9: a corner has been moved twice, and twenty-eight pictures are behind. The roots cannot open first.
// L10: the roots have been read twice, and the remembered list is full (32). The index of Julia sets cannot open first.
// L11: the diary has written a Julia set back twice, and 36 pictures are remembered. The twin cannot open first.
// L12: the twin and the copy have both been opened, and 40 pictures are remembered. The bulbs cannot open first.
// L13: the real periods have doubled twice, and 44 pictures are remembered. The cascade cannot open first.
// L14: both real ends have been visited, cusp and tip, and the change between them has been counted twice.
// 48 pictures are remembered. The rays cannot open first.
// The page keeps 56 pictures so 48 is reachable. pick() still scores only the last 32.
const HC = ["julia", "poly", "newton"], has = (a, v) => a.includes(v);
export const RULES = [
  ["R1", (k) => (k.colour === "basin" && k.map !== "newton") || (k.map === "newton" && !has(["basin", "trap"], k.colour))],
  ["R2", (k) => k.view === "height" && !has(["smooth", "curvature", "trap"], k.colour)],
  ["R3", (k) => k.view === "split-param" && !has(["julia", "poly"], k.map)],
  ["R4", (k) => k.gesture === "drag-c" && !has(HC, k.map)],
  ["R5", (k) => k.gesture === "pinch-zoom" && has(["sphere", "height", "chordal", "excess", "bend"], k.view)],
  ["R6", (k) => (k.gesture === "scrub") !== (k.path !== "none")],
  ["R7", (k) => k.path === "c" && !has(HC, k.map)],
  ["R8", (k) => k.path === "z0" && k.reveal === "roll"],
  ["R9", (k, x) => k.gesture === "ar-place" && (!has(["sphere", "height", "chordal"], k.view) || !x.xr)],
  ["R10", (k, x) => ((k.view === "height" || k.view === "chordal") && (!x.webgl2 || (x.gpu ?? 1) < 1)) || (k.view.startsWith("split") && (x.gpu ?? 1) < 1)],
  ["R11", (k) => has(["slice", "split-slice"], k.view) && !has(["julia", "poly"], k.map)],
  ["R12", (k) => has(["slice", "split-slice", "excess", "bend"], k.view) && k.colour === "curvature"],
  ["R13", (k) => has(["unity", "split-unity"], k.view) && k.map !== "newton"],
  ["R14", (k) => has(["diary", "split-diary"], k.view) && k.map !== "julia"],
  ["R15", (k) => has(["diary", "split-diary"], k.view) && has(["basin", "curvature"], k.colour)],
  ["R16", (k) => k.view === "twins" && k.map !== "julia"],
  ["R17", (k) => k.view === "twins" && has(["basin", "curvature"], k.colour)],
  ["R18", (k) => k.view === "bulbs" && k.map !== "julia"],
  ["R19", (k) => k.view === "bulbs" && has(["basin", "curvature"], k.colour)],
  ["R20", (k) => k.view === "cascade" && k.map !== "julia"],
  ["R21", (k) => k.view === "cascade" && has(["basin", "curvature"], k.colour)],
  ["R22", (k) => k.view === "rays" && k.map !== "julia"],
  ["R23", (k) => k.view === "rays" && has(["basin", "curvature"], k.colour)]];
// The seahorse valley. The neighborhood of this c resembles the Julia set at this c.
// The page owns the period-3 copy. This constant is only the opening picture.
export const TWIN_C = [-0.743643887037151, 0.13182590420533];
export const TWIN_SPAN = 0.045;
// The Julia pane opens on the whole set. A neighborhood tighter than the seahorse
// tightens that pane around the critical point, and never past this floor.
export const TWIN_JULIA_SPAN = 2.6;
export const TWIN_JULIA_FLOOR = 0.2;
export function twinJuliaSpan(mandelSpan) {
  if (!(mandelSpan > 0) || mandelSpan >= TWIN_SPAN) return TWIN_JULIA_SPAN;
  return Math.max(TWIN_JULIA_FLOOR, TWIN_JULIA_SPAN * (mandelSpan / TWIN_SPAN));
}
// The period-3 bulb above the cardioid. L12 opens here, so three places are already lighting.
export const BULB_OPEN = [-0.1225611668766537, 0.7448617666197442];
// The real cascade. c runs from the tip to the cusp. The opening is the
// superattracting period-2 centre, so two places are already apart.
// The accumulation point is a numerical landmark. The book does not number it.
export const CASCADE_LO = -2;
export const CASCADE_HI = 0.25;
export const CASCADE_OPEN = [-1, 0];
export const FEIGENBAUM = -1.4011551890920506;
// Superattracting centres. p/q is the internal angle on the main cardioid.
// The real row is the period-doubling cascade, not a cardioid angle.
export const BULB_MARKS = [
  {p: 1, q: 1, re: 0, im: 0, cascade: true},
  {p: 1, q: 2, re: -1, im: 0, cascade: true},
  {p: 1, q: 4, re: -1.3107026413368328, im: 0, cascade: true},
  {p: 1, q: 8, re: -1.3815474844320617, im: 0, cascade: true},
  {p: 1, q: 3, re: -0.1225611668766537, im: 0.7448617666197442},
  {p: 2, q: 3, re: -0.1225611668766537, im: -0.7448617666197442},
  {p: 1, q: 4, re: 0.2822713907669139, im: 0.5300606175785253},
  {p: 3, q: 4, re: 0.2822713907669139, im: -0.5300606175785253},
  {p: 1, q: 5, re: 0.3795135880159237, im: 0.3349323055974975},
  {p: 2, q: 5, re: -0.504340175446244, im: 0.562765761452982},
  {p: 3, q: 5, re: -0.504340175446244, im: -0.562765761452982},
  {p: 4, q: 5, re: 0.3795135880159237, im: -0.3349323055974975},
];
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
  const unity = m === "newton" && (k.view === "unity" || k.view === "split-unity");
  const c = {v: "pg/1", key: kk, level: L, seed, map: {kind: m, c: CL[m][f("c", CL[m].length)], d: m === "poly" || unity ? 3 + f("d", 3) : 2},
    view: {kind: k.view, window: {cx: w[0], cy: w[1], span: w[2]}}, colour: k.colour, gesture: k.gesture, reveal: k.reveal, path: null,
    settle: {escape_r: m === "newton" ? null : 2, K: 5, r_px: 4, max_points: null},
    budget: {px_scale: [0.5, 0.75, 1][g], max_iter: [128, 256, 512][g], fps_floor: 30, xr: !!x.xr}};
  if (k.path !== "none") { const pr = u.preset.filter((p) => p !== "expr" || L >= 5); c.path = {of: k.path, preset: pr[f("p", pr.length)], period_s: 12}; }
  if (k.view === "slice" || k.view === "split-slice") c.view.theta = f("th", 5) / 4;
  // The diary draws the set of c. The Julia window is centred on 0; this window frames the set.
  if (k.view === "diary" || k.view === "split-diary") c.view.window = {cx: -0.6, cy: 0, span: 3.2};
  // Twins opens on the seahorse. The window is that neighborhood, and its centre is c.
  // The Julia pane is a page window. It is not an assembler field, so older picks stay byte-identical.
  if (k.view === "twins") {
    c.map.c = [TWIN_C[0], TWIN_C[1]];
    c.view.window = {cx: TWIN_C[0], cy: TWIN_C[1], span: TWIN_SPAN};
  }
  // Bulbs frames the set of c and opens on the period-3 bulb. The Julia pane
  // is a page window, centre 0, span 2.6, so this fill does not emit it.
  if (k.view === "bulbs") {
    c.map.c = [BULB_OPEN[0], BULB_OPEN[1]];
    c.view.window = {cx: -0.6, cy: 0, span: 3.2};
  }
  // The cascade frames the real axis from the tip to the cusp and opens at
  // c = -1. The Julia pane is a page window, centre 0, span 2.6, so this fill
  // does not emit it. Older picks stay byte-identical.
  if (k.view === "cascade") {
    c.map.c = [CASCADE_OPEN[0], CASCADE_OPEN[1]];
    c.view.window = {cx: (CASCADE_LO + CASCADE_HI) / 2, cy: 0, span: CASCADE_HI - CASCADE_LO};
  }
  // The rays frame the set of c and open on the cusp, where angle 0 lands.
  // The Julia pane is a page window, centre 0, span 2.6, so this fill does not emit it.
  if (k.view === "rays") {
    c.map.c = [0.25, 0];
    c.view.window = {cx: -0.6, cy: 0, span: 3.2};
  }
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
  // L10 closes the loop. The touch is a c, and the answer is that c's Julia set.
  if (Lv >= 10) {
    return {v: "pg/1", key: "julia/plane/smooth/nudge/roll/none", level: Lv, seed: h,
      map: {kind: "julia", c, d: 2},
      view: {kind: "plane", window: {cx: 0, cy: 0, span: 3.2}}, colour: "smooth", gesture: "nudge", reveal: "roll", path: null,
      settle: {escape_r: 2, K: 5, r_px: 4, max_points: null},
      budget: {px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false}};
  }
  // L9's Newton answer is the basins of z^d − 1, not the cubic on a smooth plane.
  const unity = Lv >= 9 && kind === "newton";
  const view = unity ? "unity" : "plane";
  const colour = unity ? "basin" : "smooth";
  return {v: "pg/1", key: `${kind}/${view}/${colour}/nudge/roll/none`, level: Lv, seed: h,
    map: {kind, c, d: kind === "poly" || unity ? 3 + (fnv(`${Lv}|${qre}|${qim}|d`) % 3) : 2},
    view: {kind: view, window: {cx: 0, cy: 0, span: unity ? 3 : 3.2}}, colour, gesture: "nudge", reveal: "roll", path: null,
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
// The attracting cycle of the critical orbit, or the parabolic landing at c = 1/4.
// period 0 means the orbit left. null means it stayed and no cycle of length <= 32 closed.
export function attractingCycle(c, it = 512) {
  const re = Array.isArray(c) ? +c[0] : 0;
  const im = Array.isArray(c) ? +c[1] : 0;
  const done = (period, points, parabolic, bounded) => ({period, points, parabolic: !!parabolic, bounded: !!bounded});
  if (Math.abs(im) <= 1e-12 && Math.abs(re - 0.25) <= 1e-12) return done(1, [[0.5, 0]], true, true);
  // The root of the period-2 bulb. The fixed point is -1/2 and the multiplier is -1.
  // A short probe looks like a 2-cycle that has not arrived. It is parabolic, not Settles.
  if (Math.abs(im) <= 1e-12 && Math.abs(re + 0.75) <= 1e-12) return done(1, [[-0.5, 0]], true, true);
  let z = [0, 0];
  const pts = [];
  const steps = Math.max(64, it | 0);
  for (let n = 0; n < steps; n++) {
    const nr = z[0] * z[0] - z[1] * z[1] + re;
    const ni = 2 * z[0] * z[1] + im;
    if (!isFinite(nr) || !isFinite(ni) || nr * nr + ni * ni > 4) return done(0, [], false, false);
    z = [nr, ni];
    pts.push([z[0], z[1]]);
  }
  if (re > 0.25 && Math.abs(im) <= 1e-12) return done(0, [], false, false);
  const last = pts[pts.length - 1];
  let period = 0;
  for (let p = 1; p <= Math.min(32, pts.length - 1); p++) {
    if (dist(last, pts[pts.length - 1 - p]) < 1e-3) { period = p; break; }
  }
  if (!period) return done(null, [], false, true);
  const points = [];
  let lam = 1;
  for (let j = period - 1; j >= 0; j--) {
    const q = pts[pts.length - 1 - j];
    points.push([q[0], q[1]]);
    lam *= 2 * Math.hypot(q[0], q[1]);
  }
  return done(period, points, lam >= 0.999, true);
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
  // c = -0.75. The critical orbit alternates on its way into the fixed point
  // -1/2. A short return reads period 2. The landing is that one point.
  if (Math.abs(c[0] + 0.75) <= 1e-12 && Math.abs(c[1]) <= 1e-12) return 1;
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
    const v = {verdict: why === "cluster" ? "Settles" : why === "parabolic" ? "Parabolic" : why === "cap" || why === "repeller" ? "Stays" : "Leaves", reason: why, n, period: p || null,
      critical_period: crit, orbit: pts.slice(0, keep)};
    if (ds) { v.disks = ds; v.overlap = ds.some((a, i) => ds.slice(i + 1).some((b) => dist(a[0], b[0]) < 3 * R)); }
    return v;
  };
  for (let n = 0; n < cap; n++) {
    if (nw && d >= 3) {   // p(z) = z^d - 1. The cubic (z-1)(z^2+z+c) stays the d = 2 walk.
      const zm = powu(z, d - 1), dp = [d * zm[0], d * zm[1]];
      if (Math.hypot(dp[0], dp[1]) < 1e-300) return out("escape", n);
      const zd = mul(zm, z), pz = [zd[0] - 1, zd[1]], q = div(pz, dp);
      z = [z[0] - q[0], z[1] - q[1]];
    } else if (nw) { const t3 = mul(mul([3, 0], z), z), dp = [t3[0] + (c[0] - 1), t3[1] + c[1]];   // p(z) = (z-1)(z^2+z+c)
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
      // c = -1. The critical orbit is the superattracting 2-cycle {0, -1}.
      // A disk wide enough to hold both places tries p = 1 first and either
      // stays there or calls them one fixed point. They are a unit apart.
      // The cycle is period 2, multiplier 0. Skip the false fixed point.
      if (p === 1 && basilicaPair(pts, c)) continue;
      const ds = disks(pts, p, K, R);
      if (ds) {
        // c = 1/4, real start, z^2 + c. The disk can close on the way to 1/2.
        // The multiplier is 1, so the landing is parabolic, not an attracting cycle.
        // The station walk and the diary badge use the same word.
        if (!nw && d === 2 && realParabolicPoint(pts, c)) return out("parabolic", n + 1, ds, p);
        // c = -0.75. The period-2 bulb meets the cardioid. The fixed point is
        // -1/2 and the multiplier is -1. A screen disk closes while the two
        // places are still walking into that one point. That is parabolic,
        // period 1, not Settles period 2. The repelling point 3/2 is not this.
        if (!nw && d === 2 && parabolicBulb2(pts, c)) return out("parabolic", n + 1, ds, 1);
        // c = -0.75, z0 = 3/2. The orbit sits on the repelling fixed point.
        // A screen disk closes there. The point does not attract, so this is
        // Stays, not Settles. The parabolic root -1/2 is the branch above.
        if (!nw && d === 2 && realRepeller32(pts, c)) return out("repeller", n + 1, ds, 1);
        // c = -2. The critical orbit lands on the repelling fixed point 2.
        // A screen disk closes there. The multiplier is 4, so the point does
        // not attract. This is Stays, not Settles, the same reading as 3/2.
        if (!nw && d === 2 && realRepellerTip(pts, c)) return out("repeller", n + 1, ds, 1);
        // The page's walk (orbit-settle) keeps a near-1 window going. A real
        // climb under z^2 + c, with c past 1/4, leaves: f(x) - x is at least
        // c - 1/4 for every real x. The start does not have to be 0.
        // The basilica is not this climb, so it still settles at this disk.
        if (!nw && d === 2 && quadLam(pts, p) >= 0.93 && quadLam(pts, p) < 1 && realClimb(pts)) {
          const held = pts.length;
          const hop = hopCusp(pts, c, er, w, n, 40000);
          if (hop.left) return out(hop.why, hop.n);
          const watched = pts.length - 1;
          const outside = hop.exhausted && realCuspOutside(pts, c);
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
function realRepeller32(pts, c) {
  if (!c || Math.abs(c[0] + 0.75) > 1e-12 || Math.abs(c[1]) > 1e-12) return false;
  if (!pts || pts.length < 3) return false;
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (Math.abs(last[1]) > 1e-8 || Math.abs(prev[1]) > 1e-8) return false;
  if (Math.abs(last[0] - 1.5) > 1e-6 || Math.abs(prev[0] - 1.5) > 1e-6) return false;
  return true;
}
function realRepellerTip(pts, c) {
  if (!c || Math.abs(c[0] + 2) > 1e-12 || Math.abs(c[1]) > 1e-12) return false;
  if (!pts || pts.length < 3) return false;
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (Math.abs(last[1]) > 1e-8 || Math.abs(prev[1]) > 1e-8) return false;
  if (Math.abs(last[0] - 2) > 1e-6 || Math.abs(prev[0] - 2) > 1e-6) return false;
  return true;
}
function parabolicBulb2(pts, c) {
  if (!c || Math.abs(c[0] + 0.75) > 1e-12 || Math.abs(c[1]) > 1e-12) return false;
  if (!pts || pts.length < 3) return false;
  const z0 = pts[0], z1 = pts[1];
  const re1 = z0[0] * z0[0] - z0[1] * z0[1] + c[0];
  const im1 = 2 * z0[0] * z0[1] + c[1];
  if (dist(z1, [re1, im1]) > 1e-9) return false;
  const z2 = pts[2];
  const re2 = z1[0] * z1[0] - z1[1] * z1[1] + c[0];
  const im2 = 2 * z1[0] * z1[1] + c[1];
  if (dist(z2, [re2, im2]) > 1e-9) return false;
  const last = pts[pts.length - 1];
  if (Math.hypot(last[0] - 1.5, last[1]) < 0.2) return false;
  return true;
}
// The superattracting 2-cycle of z^2 - 1. The two places are near 0 and -1,
// in either order. A wide disk is still that cycle, not a fixed point.
function basilicaPair(pts, c) {
  if (!c || !pts || pts.length < 4) return false;
  if (Math.abs(c[0] + 1) > 1e-9 || Math.abs(c[1]) > 1e-9) return false;
  const a = pts[pts.length - 1], b = pts[pts.length - 2];
  const near = (p, q) => dist(p, q) <= 0.05;
  return (near(a, [0, 0]) && near(b, [-1, 0])) || (near(a, [-1, 0]) && near(b, [0, 0]));
}
function realParabolicPoint(pts, c) {
  if (!pts || pts.length < 3 || !c) return false;
  if (Math.abs(c[0] - 0.25) > 1e-12 || Math.abs(c[1]) > 1e-12) return false;
  const z0 = pts[0];
  if (Math.abs(z0[1]) > 1e-12) return false;
  const z1 = pts[1];
  const re1 = z0[0] * z0[0] - z0[1] * z0[1] + c[0];
  const im1 = 2 * z0[0] * z0[1] + c[1];
  if (dist(z1, [re1, im1]) > 1e-9) return false;
  const z2 = pts[2];
  const re2 = z1[0] * z1[0] - z1[1] * z1[1] + c[0];
  const im2 = 2 * z1[0] * z1[1] + c[1];
  return dist(z2, [re2, im2]) <= 1e-9;
}
function realCuspOutside(pts, c) {
  if (!pts || pts.length < 3 || !c) return false;
  if (!(c[0] > 0.25) || Math.abs(c[1]) > 1e-12) return false;
  const z0 = pts[0];
  if (Math.abs(z0[1]) > 1e-12) return false;
  const z1 = pts[1];
  const re1 = z0[0] * z0[0] - z0[1] * z0[1] + c[0];
  const im1 = 2 * z0[0] * z0[1] + c[1];
  if (dist(z1, [re1, im1]) > 1e-9) return false;
  const z2 = pts[2];
  const re2 = z1[0] * z1[0] - z1[1] * z1[1] + c[0];
  const im2 = 2 * z1[0] * z1[1] + c[1];
  return dist(z2, [re2, im2]) <= 1e-9;
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
