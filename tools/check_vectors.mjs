// node check_vectors.mjs [test_vectors.json]: playground.js must reproduce the MX step scripts' vectors. Exit 0 = all match.
import {readFileSync} from "node:fs";
import {level, pick, check, cPath, settle, flashPick, attractingCycle, twinJuliaSpan} from "./playground.js";
import { sliceLift } from "../js/playground/family.js";
import { sphereTriangle, OCTANT } from "../js/playground/bend.js";
import { unityRoots, sampleUnity } from "../js/playground/field.js";
const V = JSON.parse(readFileSync(process.argv[2] || new URL("./test_vectors.json", import.meta.url), "utf8"));
let bad = 0, n = 0;
const close = (a, b) => JSON.stringify(a, (k, v) => (typeof v === "number" ? Math.round(v * 1e9) / 1e9 + 0 : v)) ===
  JSON.stringify(b, (k, v) => (typeof v === "number" ? Math.round(v * 1e9) / 1e9 + 0 : v));
const eq = (what, got, want) => { n++; if (!close(got, want)) { bad++; console.error("MISMATCH", what, JSON.stringify(got), "want", JSON.stringify(want)); } };
V.level.forEach((x, i) => eq(`level ${i}`, level(x.state), x.level));
V.pick.forEach((x, i) => eq(`pick ${i}`, pick(x.state, x.seed), x.comp));
V.check.forEach((x, i) => eq(`check ${i}`, [...new Set(check(x.propose, x.state).map((r) => r.split(/[:=]/)[0]))].sort(), x.reasons));
V.path.forEach((x, i) => {
  let got; try { const r = cPath(x.spec, x.n); got = {samples: r.samples, vars: r.vars}; } catch (e) { got = {error: true}; }
  eq(`path ${i}`, got, x.error ? {error: true} : {samples: x.samples, vars: x.vars});
});
V.settle.forEach((x, i) => {
  let got; try { const r = settle(x.spec); got = [r.verdict, r.reason, r.n, r.period, r.critical_period]; } catch (e) { got = "error"; }
  eq(`settle ${i}`, got, x.error ? "error" : [x.verdict, x.reason, x.n, x.period, x.critical_period]);
});
(V.flash || []).forEach((x, i) => eq(`flash ${i}`, flashPick(x.point, x.level), x.comp));
(V.family || []).forEach((x, i) => {
  const got = sliceLift(x.w, x.t, x.pin);
  eq(`family ${i}`, { z: got.z, c: got.c }, { z: x.z, c: x.c });
});
(V.bend || []).forEach((x, i) => {
  const got = sphereTriangle(x.tri);
  eq(`bend ${i}`, {
    degenerate: !!got.degenerate,
    excess: got.excess,
    area: got.area,
    curvature: got.curvature,
  }, x.expect);
});
(V.cycle || []).forEach((x, i) => eq(`cycle ${i}`, attractingCycle(x.c), x.expect));
(V.juliaSpan || []).forEach((x, i) => eq(`juliaSpan ${i}`, twinJuliaSpan(x.span), x.expect));
(V.unity || []).forEach((x, i) => {
  const roots = unityRoots(x.d);
  const got = sampleUnity(x.at, x.d, x.maxIter || 40);
  eq(`unity ${i}`, {
    root0: roots[0],
    n: got.n,
    root: got.root,
    degree: got.degree,
  }, { root0: x.root0, n: x.n, root: x.root, degree: x.degree });
});
if (!V.bend) {
  const oct = sphereTriangle(OCTANT);
  eq('bend octant', [oct.degenerate, Math.round(oct.curvature * 1e9) / 1e9], [false, 4]);
}
V.path_settle.forEach((x, i) => {
  const p = cPath(x.path, x.n), of = x.path.of || "c";
  eq(`path_settle ${i}`, p.samples.map((w) => { const r = settle(x.spec, of === "c" ? w : null, of === "z0" ? w : null); return [r.verdict, r.n, r.period, r.critical_period]; }), x.rows);
});
console.log(`${n - bad}/${n} vectors match`); process.exit(bad ? 1 : 0);
