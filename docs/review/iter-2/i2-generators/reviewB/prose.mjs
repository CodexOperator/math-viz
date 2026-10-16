import * as m from '../../../../../js/data/generators.js';
import { Z, add, sub, mul, div, cj, ab, arg, near, evalExpr, tryEval } from './calc.mjs';
let checks = 0; const fails = [];
const ok = (c, id, s, msg) => { checks++; if (!c) fails.push(`${id}#${s}: ${msg}`); return c; };
const sq = (s) => s.replace(/√(\d+)/g, 'sqrt($1)').replace(/·/g, '*').replace(/−/g, '-').replace(/₁|₂/g, '');
const zr = (s) => evalExpr(s.replace(/−/g, '-').replace(/√(\d+)/g, 'sqrt($1)'));
const N = Number(process.argv[2] || 300);
for (let s = 1; s <= N; s++) {
  { const id = '1.1.1'; const c = m.generate(id, s); const P = c.worked.polar; const g = c.given;
    const a = /the lengths multiply, (.*?), and a name θ₁ = Arg z₁ (?:=|≈) (-?[\d.π/]+) adds to a name θ₂ = Arg z₂ (?:=|≈) (-?[\d.π/]+)\. The point (.*?) has r = (.*?), so the polar column/.exec(P);
    if (ok(a, id, s, 'shape ' + P)) { const L0 = ab(mul(g.z1, g.z2)); const chain = a[1].split(/ = | ≈ /); for (const piece of chain) { const v = evalExpr(sq(piece.replace(/(\d) √/g, '$1*√'))).re; ok(Math.abs(v - L0) < (/\./.test(piece) ? 5e-4 : 1e-9), id, s, 'length piece ' + piece + ' = ' + v + ' vs ' + L0); }
      const rd = (x) => evalExpr(x.replace(/\.$/, '').replace(/π/g, 'pi')).re; ok(Math.abs(rd(a[2]) - arg(g.z1)) < 5e-4 && Math.abs(rd(a[3]) - arg(g.z2)) < 5e-4, id, s, 'args ' + a[2] + ' ' + a[3]);
      ok(near(zr(a[4]), mul(g.z1, g.z2), 1e-9) && Math.abs(evalExpr(sq(a[5])).re - L0) < 1e-9, id, s, 'point ' + a[4] + ' r=' + a[5]); } }
  { const id = '1.1.2'; const c = m.generate(id, s); const P = c.worked.polar; const g = c.given; const w = g.op === '+' ? add(g.z1, g.z2) : sub(g.z1, g.z2);
    const a = /^z₁ [+−] z₂ = (.*?) has r = √(\d+) and Arg (?:=|≈) (-?[\d.π/]+)\. The conjugate is a mirror: it keeps the length and negates every name θ of arg, so its Arg (?:=|≈) (-?[\d.π/]+)\./.exec(P) || /^z₁ [+−] z₂ = (.*?) has r = (\d+) and Arg (?:=|≈) (-?[\d.π/]+)\. The conjugate is a mirror: it keeps the length and negates every name θ of arg, so its Arg (?:=|≈) (-?[\d.π/]+)\./.exec(P);
    if (ok(a, id, s, 'shape ' + P)) { ok(near(zr(a[1]), w), id, s, 'w ' + a[1]); const rr = Number(a[2]); ok(Math.abs(Math.sqrt(rr) - ab(w)) < 1e-9 || Math.abs(rr - ab(w)) < 1e-9, id, s, 'r'); const rd = (x) => evalExpr(x.replace(/\.$/, '').replace(/π/g, 'pi')).re; let A = arg(w); ok(Math.abs(rd(a[3]) - A) < 5e-4, id, s, 'Arg ' + a[3] + ' vs ' + A); const cA = arg(cj(w)); const cAexp = (Math.abs(Math.abs(A) - Math.PI) < 1e-12) ? Math.PI : -A; ok(Math.abs(rd(a[4]) - cAexp) < 5e-4, id, s, 'conj Arg ' + a[4] + ' vs ' + cAexp + ' ' + P); } }
  for (const id of ['1.2.2', '1.5.1']) { const c = m.generate(id, s); const P = c.worked.polar; const g = c.given; const d = id === '1.2.2' ? sub(g.z1, g.z2) : sub(g.b, g.a);
    const a = /(?:The slide|The direction) (.*?) has polar address r = √(\d+) and θ = Arg (?:=|≈) (-?[\d.π/]+)/.exec(P) || /(?:The slide|The direction) (.*?) has polar address r = (\d+) and θ = Arg (?:=|≈) (-?[\d.π/]+)/.exec(P);
    if (ok(a, id, s, 'shape ' + P)) { ok(near(zr(a[1]), d), id, s, 'd ' + a[1]); const rr = Number(a[2]); ok(Math.abs(Math.sqrt(rr) - ab(d)) < 1e-9 || Math.abs(rr - ab(d)) < 1e-9, id, s, 'r'); const rd = (x) => evalExpr(x.replace(/\.$/, '').replace(/π/g, 'pi')).re; ok(Math.abs(rd(a[3]) - arg(d)) < 5e-4, id, s, 'Arg ' + a[3] + ' vs ' + arg(d)); } }
  { const id = '2.3.1'; const c = m.generate(id, s); const P = c.worked.polar; const mm = /Arg z = atan\((.*?)\) ≈ (-?[\d.]+) on one side/.exec(P); if (mm) { ok(Math.abs(Math.atan(evalExpr(mm[1]).re) - Number(mm[2])) < 5e-4 && Math.abs(Math.atan(c.given.path.m) - Number(mm[2])) < 5e-4, id, s, 'atan ' + P); } }
  { const id = '3.1.2'; const c = m.generate(id, s); const P = c.worked.polar; const mm = /radius \|B\| ≈ ([\d.]+) about A = (.*?) at z = (.*?),/.exec(P); if (mm) { ok(Math.abs(Number(mm[1]) - c.answer.values.circleRadiusAt.radius) < 5e-4, id, s, 'radius ' + P); ok(near(zr(mm[2]), c.answer.values.circleRadiusAt.center, 1e-9) && near(zr(mm[3]), c.answer.values.circleRadiusAt.z), id, s, 'A at z ' + mm[2] + ' / ' + mm[3]); } }
  { const id = 'P3'; const c = m.generate(id, s); const P = c.worked.polar; const g = c.given; const mm = /\(here Arg a (?:=|≈) (-?[\d.π/]+), Arg c (?:=|≈) (-?[\d.π/]+), r = \|a\| = (.*?) and \|c\| = (.*?)\)/.exec(P);
    if (ok(mm, id, s, 'shape ' + P)) { const rd = (x) => evalExpr(x.replace(/\.$/, '').replace(/π/g, 'pi')).re; ok(Math.abs(rd(mm[1]) - arg(g.a)) < 5e-4 && Math.abs(rd(mm[2]) - arg(g.c)) < 5e-4, id, s, 'args ' + mm[1] + ' ' + mm[2]); ok(Math.abs(zr(mm[3]).re - ab(g.a)) < 5e-4 && Math.abs(zr(mm[4]).re - ab(g.c)) < 5e-4, id, s, 'moduli ' + mm[3] + ' ' + mm[4]); } }
}
console.log('checks', checks, 'fails', fails.length); for (const f of fails.slice(0, 20)) console.log(f);
