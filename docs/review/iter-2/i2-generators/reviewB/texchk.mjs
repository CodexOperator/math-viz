import * as m from '../../../../../js/data/generators.js';
import { Z, near, evalExpr, tryEval, texToAscii, ab, arg } from './calc.mjs';
function split(str) { const out = []; let d = 0, cur = ''; for (let i = 0; i < str.length; i++) { const c = str[i]; if (c === '(' || c === '{') d++; if (c === ')' || c === '}') d--; if (d === 0 && (c === '=' || c === '§' || c === ';' || c === ',' || c === '~')) { out.push(cur); cur = ''; continue; } cur += c; } out.push(cur); return out.map((x) => x.trim()).filter(Boolean); }
const clean = (t) => texToAscii(t.replace(/\\text\{[^{}]*\}/g, ' § ').replace(/\\q+uad/g, ' § ').replace(/\\ /g, ' § ').replace(/\\dfrac|\\tfrac/g, '\\frac').replace(/\\big|\\Big/g, '').replace(/\\approx/g, ' ~ ').replace(/\\operatorname\{Arg\}/g, ' § ').replace(/\\operatorname\{[^}]*\}/g, ' § ').replace(/\\,/g, ' ').replace(/\\left|\\right/g, '').replace(/\\mathbb\{[A-Z]\}|\\in|\\arg|\\cup|\\partial/g, ' § '));
const vals = (tex) => split(clean(tex)).map((p) => ({ p, v: tryEval(p.replace(/^[^=]*:\s*/, '')) })).filter((x) => x.v);
let bad = 0, tot = 0; const fail = (msg) => { bad++; if (bad < 15) console.log(msg); };
const has = (V, want, tol = 5e-4) => V.some((x) => near(x.v, want, tol));
for (let s = 1; s <= 400; s++) {
  { const c = m.generate('1.4.2', s); const V = vals(c.answer.tex); const R = c.answer.values.roots; R.forEach((r, k) => { tot += 2; if (!has(V, r)) fail(`1.4.2#${s} tex cart root ${k} missing ${c.answer.tex.slice(0, 200)}`); const ex = Z(c.answer.values.radius * Math.cos(c.answer.values.angles[k]), c.answer.values.radius * Math.sin(c.answer.values.angles[k])); if (!has(V, ex)) fail(`1.4.2#${s} tex exp root ${k}`); }); }
  { const c = m.generate('1.3.2', s); const V = vals(c.answer.tex); tot++; if (!has(V, c.answer.values.result, 1e-6 * Math.max(1, ab(c.answer.values.result)) + 5e-4)) fail(`1.3.2#${s} tex result missing ${c.answer.tex}`); }
  { const c = m.generate('1.3.1', s); const V = vals(c.answer.tex); tot++; if (!has(V, c.given.z) && !(Math.abs(c.given.z.im) < 1e-12)) { /* polar form value in tex is r e^{..} = z? */ } const ex = c.answer.values; tot++; if (!has(V, Z(ex.r * Math.cos(ex.Arg), ex.r * Math.sin(ex.Arg)))) fail(`1.3.1#${s} tex exp form missing ${c.answer.tex}`); }
  { const c = m.generate('2.2.2', s); const V = vals(c.answer.tex); tot++; if (!has(V, c.answer.values.root)) fail(`2.2.2#${s} tex root missing ${c.answer.tex}`); tot++; for (const o of c.answer.values.others) if (!has(V, o)) fail(`2.2.2#${s} tex other root missing ${c.answer.tex}`); }
  { const c = m.generate('2.4.1', s); const V = vals(c.answer.tex); tot++; if (!has(V, c.answer.values.atRay)) fail(`2.4.1#${s} tex f(ray point) missing ${c.answer.tex}`); }
  { const c = m.generate('1.4.3', s); const V = vals(c.answer.tex); tot++; if (!has(V, c.answer.values.roots[0]) || !has(V, c.answer.values.roots[1])) fail(`1.4.3#${s} tex roots ${c.answer.tex}`); }
  { const c = m.generate('P4', s); const t = c.answer.tex; tot++; const mm = /= (.*?)\\cdot ?(\d+) = (.*)$/.exec(t); }
}
console.log('tex checks', tot, 'bad', bad);
