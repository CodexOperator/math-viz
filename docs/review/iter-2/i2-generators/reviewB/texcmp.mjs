import * as m from '../../../../../js/data/generators.js';
import { Z, near, evalExpr, tryEval, texToAscii } from './calc.mjs';
function pieces(str) { const out = []; let d = 0, cur = ''; for (let i = 0; i < str.length; i++) { const c = str[i]; if (c === '(' || c === '{') d++; if (c === ')' || c === '}') d--; if (d === 0 && (c === '=' || c === ';' || c === ',' || c === '~' || c === ':')) { out.push(cur); cur = ''; continue; } cur += c; } out.push(cur); return out.map((x) => x.trim()).filter(Boolean); }
const vals = (s) => pieces(s).map((p) => tryEval(p.replace(/\s*\(.*$/, ''))).filter(Boolean);
const cleanTex = (t) => texToAscii(t.replace(/\\text\{[^{}]*\}/g, ' ; ').replace(/\\q+uad|\\ /g, ' ; ').replace(/\\dfrac/g, '\\frac').replace(/\\big|\\Big/g, '').replace(/\\left\\\{|\\right\\\}/g, ' ; ').replace(/\\approx/g, ' ~ ').replace(/\\pm/g, ' ; ').replace(/\\operatorname\{[^}]*\}/g, ' ; ').replace(/\\arg|\\in|\\mathbb\{[A-Z]\}|\\cup|\\partial|\\lim|\\to|\\Rightarrow|\\equiv|\\le|\\ge|\\ne|\\dots|\\ell/g, ' ; ').replace(/\\,/g, ' '));
const res = {}; const ex = {};
for (const id of m.FAMILIES) for (let s = 1; s <= 200; s++) {
  const c = m.generate(id, s); const A = vals(c.answer.text), T = vals(cleanTex(c.answer.tex));
  const miss = A.filter((a) => !T.some((t) => near(a, t, 5e-4))); const miss2 = T.filter((t) => !A.some((a) => near(a, t, 5e-4)));
  if (miss.length || miss2.length) { res[id] = (res[id] || 0) + 1; if (!ex[id]) ex[id] = `#${s} ascii-only: ${miss.map((z) => z.re.toFixed(3) + (z.im >= 0 ? '+' : '') + z.im.toFixed(3) + 'i').join(' ')} | tex-only: ${miss2.map((z) => z.re.toFixed(3) + (z.im >= 0 ? '+' : '') + z.im.toFixed(3) + 'i').join(' ')} :: ${c.answer.tex.slice(0, 150)} :: ${c.answer.text.slice(0, 120)}`; }
}
console.log(Object.keys(res).length ? '' : 'all value sets agree between answer.text and answer.tex');
for (const k of Object.keys(res)) console.log(k, res[k], ex[k]);
