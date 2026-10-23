// playground.js — MX playground assembler, reference module (pg/1). Mirrors MX cells viz/playground-pick,
// study/c-path, study/orbit-settle byte-for-byte in behaviour; test_vectors.json is the contract. No deps, no DOM.
export const AX = {map: ["julia", "poly", "mandel", "newton"], view: ["plane", "split-param", "sphere", "split-sphere", "height"],
  colour: ["smooth", "escape", "trap", "basin", "curvature"], gesture: ["nudge", "drag-c", "scrub", "pinch-zoom", "ar-place"],
  reveal: ["roll", "trace", "verdict"], path: ["none", "c", "z0"]};
const A = Object.keys(AX);
export const LEVELS = [{map: ["julia"], view: ["plane"], colour: ["smooth"], gesture: ["nudge"], reveal: ["roll"], path: ["none"]},
  {colour: ["escape"], gesture: ["drag-c"], reveal: ["trace"]},
  {map: ["mandel"], view: ["split-param"], gesture: ["scrub"], reveal: ["verdict"], path: ["c"], preset: ["circle", "cardioid", "bulb2"]},
  {map: ["poly"], colour: ["trap"], gesture: ["pinch-zoom"], preset: ["segment", "figure8"]},
  {map: ["newton"], view: ["sphere", "split-sphere"], colour: ["basin"]},
  {view: ["height"], colour: ["curvature"], gesture: ["ar-place"], path: ["z0"], preset: ["expr"]}];
export const UNLOCK = [["any", {taps: 1, dwell_s: 20}], ["all", {drags: 3, traces: 1}], ["all", {scrubs: 2, verdicts: 2}],
  ["any", {pinches: 3, max_zoom: 1000}], ["all", {sessions: 2, history: 12}]];
const HC = ["julia", "poly", "newton"], has = (a, v) => a.includes(v);
export const RULES = [
  ["R1", (k) => (k.colour === "basin" && k.map !== "newton") || (k.map === "newton" && !has(["basin", "trap"], k.colour))],
  ["R2", (k) => k.view === "height" && !has(["smooth", "curvature", "trap"], k.colour)],
  ["R3", (k) => k.view === "split-param" && !has(["julia", "poly"], k.map)],
  ["R4", (k) => k.gesture === "drag-c" && !has(HC, k.map)],
  ["R5", (k) => k.gesture === "pinch-zoom" && has(["sphere", "height"], k.view)],
  ["R6", (k) => (k.gesture === "scrub") !== (k.path !== "none")],
  ["R7", (k) => k.path === "c" && !has(HC, k.map)],
  ["R8", (k) => k.path === "z0" && k.reveal === "roll"],
  ["R9", (k, x) => k.gesture === "ar-place" && (!has(["sphere", "height"], k.view) || !x.xr)],
  ["R10", (k, x) => (k.view === "height" && (!x.webgl2 || (x.gpu ?? 1) < 1)) || (k.view.startsWith("split") && (x.gpu ?? 1) < 1)]];
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
    settle: {max_iter: 500, escape_r: m === "newton" ? null : 2, K: 2, R: 0.001},
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
// ---- study/orbit-settle: escape, or K points inside the disk of radius R around the newest point, or undecided
export function settle(s, cOver, z0Over, keep = 0) {
  const m = s.map, nw = m === "newton", d = s.d ?? (m === "poly" ? 3 : 2), K = s.K ?? 2, R = s.R ?? 1e-3, mx = s.max_iter ?? 500;
  const er = "escape_r" in s ? s.escape_r : nw ? null : 2;
  let c = cOver || s.c || (nw ? [1, 0] : [-1, 0]), z = z0Over || s.z0 || [0, 0];
  if (m === "mandel") { c = z0Over || c; z = [0, 0]; }
  const orb = [z], R2 = R * R;
  for (let n = 1; n <= mx; n++) {
    if (nw) { const t3 = mul(mul([3, 0], z), z), dp = [t3[0] + (c[0] - 1), t3[1] + c[1]];   // p(z) = (z-1)(z^2+z+c)
      if (Math.hypot(dp[0], dp[1]) < 1e-300) return {verdict: "undecided", n, period: null, why: "critical point or overflow", orbit: orb.slice(0, keep)};
      const cm1 = [c[0] - 1, c[1]], p = mul(cm1, z), z3 = powu(z, 3), pz = [z3[0] + p[0] - c[0], z3[1] + p[1] - c[1]], q = div(pz, dp);
      z = [z[0] - q[0], z[1] - q[1]];
    } else { const zd = d === 2 ? mul(z, z) : powu(z, d); z = [zd[0] + c[0], zd[1] + c[1]]; }
    if (!isFinite(z[0]) || !isFinite(z[1])) return {verdict: "undecided", n, period: null, why: "critical point or overflow", orbit: orb.slice(0, keep)};
    if (er !== null && Math.hypot(z[0], z[1]) > er) return {verdict: "escape", n, period: null, orbit: [...orb, z].slice(0, keep)};
    let cnt = 0, last = -1;
    for (let j = 0; j < orb.length; j++) if ((orb[j][0] - z[0]) ** 2 + (orb[j][1] - z[1]) ** 2 < R2) { cnt++; last = j; }
    orb.push(z);
    if (cnt + 1 >= K) return {verdict: "settle", n, period: n - last, orbit: orb.slice(0, keep)};
  }
  return {verdict: "undecided", n: mx, period: null, orbit: orb.slice(0, keep)};
}
