import * as m from '../../../../../js/data/generators.js';
import { Z, add, sub, mul, div, near, ab, arg, evalExpr, tryEval } from './calc.mjs';
let tot = 0, bad = 0; const F = (msg) => { bad++; if (bad < 25) console.log(msg); }; const ok = (c, msg) => { tot++; if (!c) F(msg); return c; };
const A = (s) => s.replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√(\d+)/g, 'sqrt($1)').replace(/·/g, '*').replace(/π/g, 'pi').replace(/θ/g, 'theta');
const N = Number(process.argv[2] || 500);
for (let s = 1; s <= N; s++) {
  { const c = m.generate('2.1.2', s), g = c.given; const P = A(c.worked.cart); const mm = /Parametrize the line ([xy]) = (-?\d+): z = (.*?) with [xy] real\. Push forward: z\^2 = (.*?), so u = (.*?) and v = (.*?)\. Eliminate [xy] = (.*?): u = (.*?), a parabola with vertex (-?\d+) opening (left|right)\. At [xy] = (-?\d+) the point (.*?) goes to (.*?)\.$/.exec(P);
    if (!ok(mm, `2.1.2#${s} shape ${P}`)) continue; const par = g.axis === 'x' ? 'y' : 'x';
    for (const t of [-2, 0.5, 3]) { const z = g.axis === 'x' ? Z(g.c, t) : Z(t, g.c); const w = mul(z, z); const vars = { [par]: Z(t) };
      ok(near(evalExpr(mm[3], vars), z, 1e-9), `2.1.2#${s} z param ${mm[3]}`); ok(near(evalExpr(mm[4], vars), w, 1e-9), `2.1.2#${s} z^2 ${mm[4]}`); ok(Math.abs(evalExpr(mm[5], vars).re - w.re) < 1e-9 && Math.abs(evalExpr(mm[6], vars).re - w.im) < 1e-9, `2.1.2#${s} u,v ${mm[5]} ${mm[6]}`); ok(Math.abs(evalExpr(mm[8], { v: Z(w.im) }).re - w.re) < 1e-9, `2.1.2#${s} eliminated ${mm[8]}`); ok(Math.abs(evalExpr(mm[7], { v: Z(w.im) }).re - t) < 1e-9, `2.1.2#${s} elimination step ${mm[7]}`); }
    const pt = evalExpr(mm[12]); const z1 = Z(mm[11] === '1' ? 1 : Number(mm[11]), 0); const zz = g.axis === 'x' ? Z(g.c, Number(mm[11])) : Z(Number(mm[11]), g.c); ok(near(pt, zz) && near(evalExpr(mm[13]), mul(zz, zz)), `2.1.2#${s} sample point ${mm[12]} -> ${mm[13]}`); }
  { const c = m.generate('2.1.3', s), g = c.given; const P = A(c.worked.cart); const f = (z) => add(mul(g.a, z), g.b);
    const mm = /Parametrize the line ([xy]) = (-?\d+): z = (.*?) with t real\. Push forward: az \+ b = (.*?), so (.*)$/.exec(P); if (!ok(mm, `2.1.3#${s} shape ${P}`)) continue;
    for (const t of [-2, 0.5, 3]) { const z = g.line.axis === 'x' ? Z(g.line.c, t) : Z(t, g.line.c); const w = f(z); ok(near(evalExpr(mm[3], { t: Z(t) }), z, 1e-9), `2.1.3#${s} z(t) ${mm[3]}`); ok(near(evalExpr(mm[4], { t: Z(t) }), w, 1e-9), `2.1.3#${s} az+b ${mm[4]} at t=${t} want ${w.re},${w.im}`);
      const uv = /^u = (.*?) and v = (.*?)\. /.exec(mm[5]); if (ok(uv, `2.1.3#${s} u,v shape ${mm[5]}`)) { ok(Math.abs(evalExpr(uv[1], { t: Z(t) }).re - w.re) < 1e-9 && Math.abs(evalExpr(uv[2], { t: Z(t) }).re - w.im) < 1e-9, `2.1.3#${s} u,v ${uv[1]} ${uv[2]}`); } } }
  { const c = m.generate('2.2.1', s), g = c.given; const P = A(c.worked.cart + ' || ' + c.worked.polar); const n = g.n; const al = g.alpha;
    const mm = /image is the sector 0 < arg w < (.*?): /.exec(P) || /The image is the sector 0 < arg w < (.*?):/.exec(P); ok(mm && Math.abs(evalExpr(mm[1]).re - n * al) < 1e-9, `2.2.1#${s} sector in prose ${P}`); }
}
console.log('prose2 checks', tot, 'bad', bad);
