// node check_vectors.mjs [test_vectors.json]: playground.js must reproduce the MX step scripts' vectors. Exit 0 = all match.
import {readFileSync} from "node:fs";
import {level, pick, check, cPath, settle} from "./playground.js";
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
  let got; try { const r = settle(x.spec); got = [r.verdict, r.n, r.period]; } catch (e) { got = "error"; }
  eq(`settle ${i}`, got, x.error ? "error" : [x.verdict, x.n, x.period]);
});
V.path_settle.forEach((x, i) => {
  const p = cPath(x.path, x.n), of = x.path.of || "c";
  eq(`path_settle ${i}`, p.samples.map((w) => { const r = settle(x.spec, of === "c" ? w : null, of === "z0" ? w : null); return [r.verdict, r.n, r.period]; }), x.rows);
});
console.log(`${n - bad}/${n} vectors match`); process.exit(bad ? 1 : 0);
