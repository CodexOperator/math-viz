// Reviewer B: independent recomputation of every family from `given` and the statement text, compared with answer.values and answer.text/tex.
import * as m from '../../../../../js/data/generators.js';
import { Z, add, sub, mul, div, cj, ab, arg, ex, neg, near, cpow, evalExpr, tryEval, texToAscii } from './calc.mjs';

const SEEDS = Number(process.argv[2] || 300);
const fails = []; let checks = 0;
const F = (id, s, msg) => { fails.push(`${id}#${s}: ${msg}`); };
const ok = (cond, id, s, msg) => { checks++; if (!cond) F(id, s, msg); return cond; };
const fmt = (z) => `${+z.re.toFixed(6)}${z.im < 0 ? '-' : '+'}${Math.abs(+z.im.toFixed(6))}i`;
const wrap = (a) => { let t = a % (2 * Math.PI); if (t > Math.PI) t -= 2 * Math.PI; if (t <= -Math.PI + 1e-12) t += 2 * Math.PI; return t; };
const Arg = (z) => arg(z);

// statement parsers
const cplx = (s) => evalExpr(s);
const num = (s) => evalExpr(s).re;
// split the text into top-level pieces on = ; , (outside parentheses/braces/bars)
function pieces(str) {
  const out = []; let depth = 0, cur = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '(' || c === '{') depth++; if (c === ')' || c === '}') depth--;
    if (depth === 0 && (c === '=' || c === ';' || c === ',')) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim().replace(/^(or|and)\s+/, '').replace(/\s+(or|and)\s+/g, '|OR|')).flatMap((x) => x.split('|OR|')).filter(Boolean);
}
const parsedVals = (str, vars) => pieces(str).map((p) => ({ p, v: tryEval(p.replace(/\s*\(.*(rounded|cos|sin).*$/, ''), vars) })).filter((x) => x.v);
const hasVal = (str, want, tol = 1e-9) => parsedVals(str).some(({ v, p }) => near(v, want, /~/.test(p) ? 5e-4 : tol));

for (const id of m.FAMILIES) {
  for (let s = 1; s <= SEEDS; s++) {
    const c = m.generate(id, s); const g = c.given; const V = c.answer.values; const T = c.answer.text; const st = c.statementText;
    if (!c) { F(id, s, 'null card'); continue; }
    try {
      switch (id) {
        case '1.1.1': {
          const mm = /^Let z1 = (.*) and z2 = (.*)\. Compute/.exec(st); const z1 = cplx(mm[1]), z2 = cplx(mm[2]);
          ok(near(z1, g.z1) && near(z2, g.z2), id, s, 'statement vs given');
          const P = mul(z1, z2), Q = div(z1, z2);
          ok(near(P, V.product) && near(Q, V.quotient), id, s, 'values');
          const t = /^z1 z2 = (.*); z1\/z2 = (.*)$/.exec(T);
          ok(t && near(cplx(t[1]), P) && near(cplx(t[2]), Q, /~/.test(t[2]) ? 5e-4 : 1e-9), id, s, 'text ' + T);
          // tex
          const tx = texToAscii(c.answer.tex); const mm2 = /^z_1z_2 = (.*), *\\q+uad *\\dfrac\{z_1\}\{z_2\} = (.*)$/.exec(c.answer.tex);
          if (!ok(!!mm2, id, s, 'tex shape ' + c.answer.tex)) break;
          ok(near(cplx(texToAscii(mm2[1])), P) && near(cplx(texToAscii(mm2[2])), Q, 5e-4), id, s, 'tex ' + c.answer.tex);
          break; }
        case '1.1.2': {
          const mm = /^Find (Re|Im)\(conj\(z1 ([+-]) z2\)\) for z1 = (.*) and z2 = (.*)\.$/.exec(st); const z1 = cplx(mm[3]), z2 = cplx(mm[4]);
          ok(near(z1, g.z1) && near(z2, g.z2) && mm[1] === g.part && mm[2] === g.op, id, s, 'statement vs given');
          const w = mm[2] === '+' ? add(z1, z2) : sub(z1, z2); const res = mm[1] === 'Re' ? w.re : -w.im;
          ok(V.result === res || Math.abs(V.result - res) < 1e-12, id, s, 'result ' + V.result + ' vs ' + res);
          ok(Math.abs(num(T.split(' = ').pop()) - res) < 1e-12, id, s, 'text ' + T);
          const mid = /= (?:Im|Re)\((.*)\) = /.exec(T); ok(mid && near(cplx(mid[1]), cj(w)), id, s, 'text mid ' + T);
          break; }
        case '1.2.1': {
          const mm = /satisfy \|z (.*)\| (=|<|<=)\s*(\d+)\.$/.exec(st); let a;
          const inner = mm[1]; // "- (3 + 2i)" or "+ 3i"-ish
          a = neg(cplx(inner.replace(/^([+-]) \((.*)\)$/, '$1($2)').replace(/^([+-]) (.*)$/, '$1 ($2)')));
          const R = Number(mm[3]);
          ok(near(a, g.a) && R === g.R && mm[2] === g.rel, id, s, 'statement vs given ' + st);
          ok(near(V.center, a) && V.radius === R, id, s, 'values');
          const cx = a.re, cy = a.im;
          const eq = /\(x ([+-]) (\d+)\)\^2 \+ \(y ([+-]) (\d+)\)\^2 (=|<|<=) (\d+)/.exec(T) || /x\^2 \+ \(y ([+-]) (\d+)\)\^2 (=|<|<=) (\d+)/.exec(T) || /\(x ([+-]) (\d+)\)\^2 \+ y\^2 (=|<|<=) (\d+)/.exec(T) || /x\^2 \+ y\^2 (=|<|<=) (\d+)/.exec(T);
          ok(!!eq, id, s, 'text eq ' + T); if (eq) {
            const xc = /\(x ([+-]) (\d+)\)/.exec(T), yc = /\(y ([+-]) (\d+)\)/.exec(T);
            const tx = xc ? (xc[1] === '-' ? 1 : -1) * Number(xc[2]) : 0, ty = yc ? (yc[1] === '-' ? 1 : -1) * Number(yc[2]) : 0;
            const rr = /(=|<=|<) (\d+)(?:[^\d]*)$/.exec(T.split(':').pop());
            ok(tx === cx && ty === cy, id, s, 'center in text ' + T); ok(rr && Number(rr[2]) === R * R, id, s, 'R^2 in text ' + T);
          }
          const word = { '=': 'circle', '<': 'open disk', '<=': 'closed disk' }[g.rel]; ok(T.includes(word) || T.toLowerCase().includes(word), id, s, 'word ' + word + ' in ' + T);
          break; }
        case '1.2.2': {
          const mm = /^Find the distance between (.*) and (.*)\.$/.exec(st); const z1 = cplx(mm[1]), z2 = cplx(mm[2]);
          ok(near(z1, g.z1) && near(z2, g.z2), id, s, 'stmt'); const d = ab(sub(z1, z2));
          ok(Math.abs(V.distance - d) < 1e-12, id, s, 'values');
          const d2 = (z1.re - z2.re) ** 2 + (z1.im - z2.im) ** 2;
          const mt = /= (.*)$/.exec(T)[1]; const parts = mt.split(' = '); const last = parts[parts.length - 1];
          const sv = tryEval(last.replace(/ ~.*$/, '')); ok(sv && Math.abs(sv.re - d) < 1e-9, id, s, 'text ' + T);
          const mid = /\|(.*)\|/.exec(T); ok(mid && near(cplx(mid[1]), sub(z1, z2)), id, s, 'text diff ' + T);
          const sq = Number.isInteger(Math.sqrt(d2)); ok(sq ? !T.includes('~') : (T.includes('~') && Math.abs(num(/~ (.*)$/.exec(T)[1]) - d) < 5e-4), id, s, 'marking of rounding ' + T);
          break; }
        case '1.3.1': {
          const mm = /^Write z = (.*) in polar form/.exec(st); const z = cplx(mm[1]); ok(near(z, g.z), id, s, 'stmt'); const r = ab(z), A = Arg(z);
          ok(Math.abs(V.r - r) < 1e-12 && Math.abs(V.Arg - A) < 1e-12 && A > -Math.PI && A <= Math.PI, id, s, 'values');
          const t = /^z = (.*) = (.*); Arg z = (.*); arg z = \{(.*) \+ (?:\d+ )?pi k\}$/.exec(T) || /^z = (.*) = (.*); Arg z = (.*); arg z = \{(.*)\}$/.exec(T);
          if (!ok(!!t, id, s, 'text shape ' + T)) break;
          // polar form r(cos A + i sin A)
          const pf = /^(.*?)\(cos\((.*?)\) \+ i sin\((.*?)\)\)$/.exec(t[1]) || /^\(cos\((.*?)\) \+ i sin\((.*?)\)\)$/.exec(t[1]);
          ok(pf, id, s, 'polar form shape ' + t[1]);
          if (pf) { const hasR = pf.length === 4; const rr = hasR && pf[1] !== '' ? num(pf[1]) : 1; const ang = num(hasR ? pf[2] : pf[1]); ok(Math.abs(rr - r) < 1e-9 && Math.abs(wrap(ang) - A) < 1e-9, id, s, 'polar form numbers ' + t[1]); }
          // exponential
          const ef = /^(?:(.*?) ?)?e\^\((-?)i ?(.*?)\)$/.exec(t[2]) || (Math.abs(V.theta) < 1e-12 ? [t[2], t[2], '', '0'] : null);
          if (ok(ef, id, s, 'exp form shape ' + t[2])) { const rr = ef[1] ? num(ef[1]) : 1; const ang = (ef[2] ? -1 : 1) * (ef[3] === '' ? 1 : num(ef[3])); ok(Math.abs(rr - r) < 1e-9 && Math.abs(wrap(ang) - A) < 1e-9, id, s, 'exp form numbers ' + t[2]); }
          ok(Math.abs(num(t[3]) - A) < 1e-9 || Math.abs(num(t[3].replace(/^-?/, (x) => x)) - A) < 1e-9, id, s, 'Arg text ' + t[3]);
          // worded location
          const q = c.worked.polar + ' ' + c.worked.cart; const axis = Math.abs(z.re) < 1e-9 || Math.abs(z.im) < 1e-9;
          if (axis) ok(!/quadrant/.test(q), id, s, 'axis point with quadrant word'); 
          break; }
        case '1.3.2': {
          const mm = /^Use polar form to compute \((.*)\)\^(\d+)\. Express/.exec(st); const z = cplx(mm[1]); const n = Number(mm[2]);
          ok(near(z, g.z, 1e-12) && n === g.n, id, s, 'stmt ' + st);
          const R = cpow(z, Z(n)); const rr = ab(z) ** n;
          ok(near(R, V.result, 1e-8) && Math.abs(V.r - rr) < 1e-9 * rr, id, s, 'values ' + fmt(R) + ' vs ' + fmt(V.result));
          ok(Math.abs(V.Arg - wrap(n * Arg(z))) < 1e-9 && (Math.abs(V.Arg - Arg(R)) < 1e-9 || (Math.abs(Math.abs(V.Arg) - Math.PI) < 1e-9 && Math.abs(R.im) < 1e-9 * ab(R) && R.re < 0)), id, s, 'Arg ' + V.Arg + ' vs ' + Arg(R));
          const parts = T.replace(/; Arg = .*$/, '').split(' = '); const cart = parts[parts.length - 1]; const cv = tryEval(cart.replace(/ ~.*$/, ''));
          ok(cv && near(cv, R, /~/.test(T) ? 5e-3 : 1e-8), id, s, 'text cart ' + cart + ' vs ' + fmt(R));
          const ex2 = /= (\S.*?) e\^\((-?)i ?(.*?)\) = /.exec(T) || /= e\^\((-?)i ?(.*?)\) = /.exec(T); 
          const argt = /; Arg = (.*)$/.exec(T); ok(argt && Math.abs(num(argt[1].replace(/ ~.*/, '')) - V.Arg) < 5e-3, id, s, 'Arg in text ' + T);
          break; }
        case '1.4.1': {
          const mm = /Find and sketch the (.*) roots of unity/.exec(st); const word = mm[1]; const n = word === 'cube' ? 3 : parseInt(word);
          ok(n === g.n && V.n === n, id, s, 'n ' + word);
          for (let k = 0; k < n; k++) { const w = Z(Math.cos(2 * Math.PI * k / n), Math.sin(2 * Math.PI * k / n)); ok(near(w, V.roots[k], 1e-12), id, s, 'root ' + k); }
          const gcd = (a, b) => (b ? gcd(b, a % b) : a); for (let k = 0; k < n; k++) ok(V.primitive[k] === (gcd(k, n) === 1), id, s, 'primitive ' + k);
          const body = /: (.*?); primitive: k = (.*)$/.exec(T.replace(/, rounded to \d+ decimals/, '')); if (!ok(body, id, s, 'text shape ' + T)) break;
          const items = body[1].split('; '); ok(items.length === n, id, s, 'item count');
          items.forEach((it, k) => { const w = Z(Math.cos(2 * Math.PI * k / n), Math.sin(2 * Math.PI * k / n)); ok(near(cplx(it), w, 5e-4), id, s, 'text item ' + k + ' ' + it); });
          const prim = body[2].split(', ').map(Number); const exp = []; for (let k = 0; k < n; k++) if (gcd(k, n) === 1) exp.push(k); ok(JSON.stringify(prim) === JSON.stringify(exp), id, s, 'primitive text ' + body[2]);
          const kk = /k = 0\.\.(\d+)/.exec(T); ok(kk && Number(kk[1]) === n - 1, id, s, 'k range');
          if (n === 7) ok(/rounded/.test(T), id, s, 'n=7 should say rounded');
          break; }
        case '1.4.2': {
          const mm = /^Find all the (.*) roots of (.*)\. Express/.exec(st); const word = mm[1]; const n = word === 'square' ? 2 : word === 'cube' ? 3 : parseInt(word); const cc = cplx(mm[2]);
          ok(n === g.n && near(cc, g.c), id, s, 'stmt'); const rad = Math.pow(ab(cc), 1 / n); const th = Arg(cc);
          ok(Math.abs(V.radius - rad) < 1e-9, id, s, 'radius');
          const roots = []; for (let k = 0; k < n; k++) roots.push(Z(rad * Math.cos((th + 2 * Math.PI * k) / n), rad * Math.sin((th + 2 * Math.PI * k) / n)));
          for (let k = 0; k < n; k++) { ok(near(roots[k], V.roots[k], 1e-9), id, s, 'root ' + k); ok(near(cpow(V.roots[k], Z(n)), cc, 1e-8 * Math.max(1, ab(cc))), id, s, 'power back ' + k); }
          // text: "E1, E2 = C1, C2, ...; as Arg values ..." 
          const t = /^(.*?) [=~] (.*?); as Arg values the angles are (.*?)(?: \(.*\))?$/.exec(T); if (!ok(t, id, s, 'text shape ' + T)) break;
          const exps = splitTop(t[1]), carts = splitTop(t[2]); ok(exps.length === n && carts.length === n, id, s, 'counts ' + exps.length + ',' + carts.length + ' in ' + T);
          for (let k = 0; k < n; k++) { ok(near(cplx(exps[k]), roots[k], 5e-4), id, s, 'exp item ' + exps[k] + ' k=' + k); ok(near(cplx(carts[k]), roots[k], 5e-4), id, s, 'cart item ' + carts[k] + ' k=' + k); }
          // arg values
          const angs = splitTop(t[3]).map((x) => num(x)); for (let k = 0; k < n; k++) ok(Math.abs(angs[k] - wrap((th + 2 * Math.PI * k) / n)) < 1e-9 || Math.abs(angs[k] - (th + 2 * Math.PI * k) / n) < 1e-9, id, s, 'angle ' + k);
          // TeX
          const tx = c.answer.tex; const tp = /^(.*?) = (.*?), \\quad/.exec(tx.replace(/,\\ /g, ', ')) ; 
          break; }
        case '1.4.3': {
          const mm = /^Use the quadratic formula to solve z\^2 ([+-]) (\d+)z ([+-]) (\d+) = 0\.$/.exec(st); const b = (mm[1] === '-' ? -1 : 1) * Number(mm[2]); const cc = (mm[3] === '-' ? -1 : 1) * Number(mm[4]);
          const disc = b * b - 4 * cc; ok(disc < 0, id, s, 'disc'); const re = -b / 2, im = Math.sqrt(-disc) / 2;
          ok(Math.abs(V.roots[0].re - re) < 1e-12 && Math.abs(V.roots[0].im - im) < 1e-12 && Math.abs(V.roots[1].im + im) < 1e-12, id, s, 'values');
          ok(V.disc === disc && V.b === b && V.c === cc, id, s, 'disc in values');
          // text "z = (8 +- sqrt(-64))/2 = 4 + 4i or 4 - 4i"
          const t = /^z = \((-?\d+) \+- sqrt\((-?\d+)\)\)\/2 = (.*) or (.*)$/.exec(T); if (!ok(t, id, s, 'text shape ' + T)) break;
          ok(Number(t[1]) === -b && Number(t[2]) === disc, id, s, 'formula in text ' + T);
          ok(near(cplx(t[3]), Z(re, im)) && near(cplx(t[4]), Z(re, -im)), id, s, 'roots in text ' + T);
          ok(c.worked.cart.includes(String(disc)) , id, s, 'worked cart has disc');
          break; }
        case '1.5.1': {
          const mm = /^Find a parameterization of the line from (.*) to (.*)\.$/.exec(st); const a = cplx(mm[1]), b = cplx(mm[2]);
          ok(near(a, g.a) && near(b, g.b), id, s, 'stmt');
          ok(near(V.direction, sub(b, a)) && near(V.at.z, Z((a.re + b.re) / 2, (a.im + b.im) / 2)), id, s, 'values');
          const t = /^z\(t\) = (.*), 0 <= t <= 1$/.exec(T); if (!ok(t, id, s, 'text shape ' + T)) break;
          for (const tv of [0, 0.25, 0.5, 1]) { const zz = evalExpr(t[1], { t: Z(tv) }); ok(near(zz, add(a, mul(Z(tv), sub(b, a))), 1e-12), id, s, 'text z(' + tv + ') ' + t[1]); }
          break; }
        case '1.5.2': {
          const mm = /\{ z in C : (\d+) (<|<=) \|z(.*?)\| (<|<=) (\d+) \}/.exec(st); const r0 = Number(mm[1]), r1 = Number(mm[5]); const inS = mm[2] === '<', outS = mm[4] === '<';
          const a = mm[3].trim() === '' ? Z(0) : neg(cplx(mm[3].replace(/^([+-]) \((.*)\)$/, '$1($2)').replace(/^([+-]) (.*)$/, '$1 ($2)')));
          ok(near(a, g.a) && r0 === g.r0 && r1 === g.r1 && inS === g.innerStrict && outS === g.outerStrict, id, s, 'stmt vs given ' + st);
          ok(r0 >= 1 && r0 < r1 && r1 <= 4, id, s, 'range');
          const open = inS && outS, closed = !inS && !outS;
          ok(V.open === open && V.closed === closed && V.bounded === true && V.connected === true && V.domain === open && V.region === true, id, s, 'values ' + JSON.stringify(V));
          const word = open ? 'open' : closed ? 'closed' : 'neither'; ok(T.startsWith(word), id, s, 'verdict word ' + T);
          ok(T.includes('bounded'), id, s, 'bounded');
          ok(open ? (/a domain/.test(T) && !/not a domain/.test(T)) : /not a domain/.test(T), id, s, 'domain text ' + T);
          const nBd = (T.match(/\|z/g) || []).length; ok(nBd >= 2, id, s, 'boundary circles in text');
          break; }
        case '2.1.1': {
          const mm = /^Express f\(z\) = (.*) in the form/.exec(st); const fsrc = mm[1];
          const f = (z) => evalExpr(fsrc, { z });
          ok(near(f(Z(1, 1)), V.check.w, 1e-12), id, s, 'check point');
          const t = /^u = (.*), v = (.*); u = (.*), v = (.*)$/.exec(T); if (!ok(t, id, s, 'text shape ' + T)) break;
          const pts = [Z(0.7, -1.3), Z(-1.9, 0.4), Z(2.2, 1.7), Z(-0.6, -0.9)];
          for (const z of pts) {
            const w = f(z); const ux = evalExpr(t[1], { x: Z(z.re), y: Z(z.im) }), vx = evalExpr(t[2], { x: Z(z.re), y: Z(z.im) });
            ok(near(Z(ux.re, vx.re), w, 1e-9), id, s, `cart form at ${fmt(z)}: ${ux.re},${vx.re} vs ${fmt(w)} :: ${T}`);
            const r = ab(z), th = Arg(z); const up = evalExpr(t[3], { r: Z(r), theta: Z(th) }), vp = evalExpr(t[4], { r: Z(r), theta: Z(th) });
            ok(near(Z(up.re, vp.re), w, 1e-9), id, s, `polar form at ${fmt(z)} :: ${T}`);
          }
          break; }
        case '2.1.2': {
          const mm = /^Determine the image of the (?:vertical|horizontal) line ([xy]) = (-?\d+) under/.exec(st); const axis = mm[1], cv = Number(mm[2]);
          ok(axis === g.axis && cv === g.c, id, s, 'stmt');
          const t = /^parabola u = (.*) \(vertex (-?\d+), opens (left|right), focus (\d+)\)$/.exec(T); if (!ok(t, id, s, 'text shape ' + T)) break;
          const img = (tv) => axis === 'x' ? mul(Z(cv, tv), Z(cv, tv)) : mul(Z(tv, cv), Z(tv, cv));
          for (const tv of [-2.5, -1, 0, 0.7, 3]) { const w = img(tv); const uu = evalExpr(t[1], { v: Z(w.im) }); ok(Math.abs(uu.re - w.re) < 1e-9, id, s, `parabola at t=${tv}: ${uu.re} vs ${w.re} :: ${T}`); }
          const vert = axis === 'x' ? cv * cv : -cv * cv; ok(Number(t[2]) === vert && V.parabola.vertex === vert, id, s, 'vertex');
          ok(t[3] === (axis === 'x' ? 'left' : 'right') && V.opens === t[3], id, s, 'opens'); ok(Number(t[4]) === 0 && V.parabola.focus === 0, id, s, 'focus');
          // focus at 0 : distance from (u,v) to 0 equals u distance to directrix u = 2*vertex? check: focus 0, vertex V, p=|V|... check coefficient: u = V + v^2/(4 c^2)*sign
          const a2 = 4 * cv * cv; ok(Math.abs(Math.abs(V.parabola.coeff) - 1 / a2) < 1e-12, id, s, 'coeff');
          break; }
        case '2.1.3': {
          const mm = /^Find the image of the line ([xy]) = (-?\d+) under f\(z\) = (.*?)\. What does/.exec(st); const axis = mm[1], cv = Number(mm[2]); const fsrc = mm[3];
          const f = (z) => evalExpr(fsrc, { z });
          // recover a,b numerically
          const b = f(Z(0)), a = sub(f(Z(1)), b); ok(near(a, g.a, 1e-12) && near(b, g.b, 1e-12) && axis === g.line.axis && cv === g.line.c, id, s, 'stmt vs given ' + st);
          const t = /^the line (.*?); in general: turn by Arg a = (.*?) \((.*?)\), stretch by \|a\| = (.*?)(?: \(no stretch\))?, then (slide by (.*)|do not slide)/.exec(T) || /^the line (.*?); in general: (.*)$/.exec(T);
          if (!ok(t, id, s, 'text shape ' + T)) break;
          // image-line equation: LHS = RHS in u,v
          const eq = t[1].split(' = '); ok(eq.length === 2, id, s, 'eq ' + t[1]);
          for (const tv of [-3, -1, 0.5, 2, 4]) { const zz = axis === 'x' ? Z(cv, tv) : Z(tv, cv); const w = f(zz); const vars = { u: Z(w.re), v: Z(w.im) }; const d = evalExpr(eq[0], vars).re - evalExpr(eq[1], vars).re; ok(Math.abs(d) < 1e-9, id, s, `image line at t=${tv}: ${t[1]} :: ${T}`); }
          const A = Arg(a), R = ab(a);
          ok(Math.abs(V.rotation - A) < 1e-12 && Math.abs(V.stretch - R) < 1e-12 && near(V.shift, b), id, s, 'values');
          if (t.length > 3) { ok(Math.abs(num(t[2]) - A) < 1e-9, id, s, 'Arg a in text ' + T); const dirw = A > 1e-12 && A < Math.PI - 1e-9 ? 'counterclockwise' : A < -1e-12 ? 'clockwise' : null; if (dirw) ok(t[3] === dirw, id, s, 'turn word ' + t[3] + ' for Arg a ' + A); else if (Math.abs(Math.abs(A) - Math.PI) < 1e-9) ok(/half turn/.test(t[3]), id, s, 'half turn word ' + t[3]); else ok(/no turn|do not turn/.test(t[3]), id, s, 'no-turn word ' + t[3]); ok(Math.abs(num(t[4]) - R) < 1e-9, id, s, 'stretch in text ' + t[4]); if (t[6]) ok(near(cplx(t[6]), b), id, s, 'shift in text ' + t[6]); else ok(near(b, Z(0)), id, s, 'do not slide but b != 0'); }
          break; }
        case '2.2.1': {
          const mm = /^Find the image of the sector 0 < arg\(z\) < (.*) under w = z\^(\d)\.$/.exec(st); const al = num(mm[1]), n = Number(mm[2]);
          ok(Math.abs(al - g.alpha) < 1e-12 && n === g.n, id, s, 'stmt'); ok(n * al < 2 * Math.PI + 1e-9 && n >= 2 && n <= 4, id, s, 'range n*alpha<2pi');
          const t = /^the sector 0 < arg w < (.*)$/.exec(T); ok(t && Math.abs(num(t[1]) - n * al) < 1e-9, id, s, 'text ' + T);
          ok(V.sector.from === 0 && Math.abs(V.sector.to - n * al) < 1e-12, id, s, 'values');
          break; }
        case '2.2.2': {
          const mm = /^Compute the principal value of the (.*) root of (.*), i\.e\. \((.*)\)\^\(1\/(\d)\) on/.exec(st); const w = cplx(mm[2]); const n = Number(mm[4]);
          ok(near(w, g.w, 1e-12) && n === g.n && near(cplx(mm[3]), w), id, s, 'stmt'); const root = Z(Math.pow(ab(w), 1 / n) * Math.cos(Arg(w) / n), Math.pow(ab(w), 1 / n) * Math.sin(Arg(w) / n));
          ok(near(root, V.root, 1e-9), id, s, 'root values'); ok(near(cpow(root, Z(n)), w, 1e-9), id, s, 'root^n = w');
          const [left, right] = T.split(', using Arg('); const parts = left.split(/ = | ~ /); ok(parts.length === 4, id, s, 'parts ' + T);
          const polar = parts[2];
          const pm = /^(?:(.*?) ?)?e\^\((-?)i ?(.*?)\)$/.exec(polar) || (Math.abs(Arg(root)) < 1e-12 ? [polar, polar, '', '0'] : null); ok(pm, id, s, 'polar part ' + polar); if (pm) { const rr = pm[1] ? num(pm[1]) : 1; const an = (pm[2] ? -1 : 1) * (pm[3] === '' ? 1 : num(pm[3])); ok(Math.abs(rr - ab(root)) < (/\d\.\d/.test(pm[1] || '') ? 5e-4 : 1e-9) && Math.abs(an - Arg(root)) < 1e-9, id, s, 'polar part numbers ' + polar); }
          ok(near(cplx(parts[3]), root, /~/.test(T.slice(left.length - parts[3].length - 3, left.length - parts[3].length)) ? 5e-4 : 1e-9), id, s, 'cart part ' + parts[3] + ' vs ' + fmt(root));
          const um = /^(.*?)\) = (.*?) \(the other (?:.*?) (?:is|are) (.*)\)$/.exec(right); if (!ok(um, id, s, 'using part ' + right)) break;
          ok(Math.abs(num(um[2]) - Arg(w)) < 1e-9, id, s, 'Arg w in text ' + um[2]);
          const others = []; for (let k = 1; k < n; k++) others.push(Z(Math.pow(ab(w), 1 / n) * Math.cos((Arg(w) + 2 * Math.PI * k) / n), Math.pow(ab(w), 1 / n) * Math.sin((Arg(w) + 2 * Math.PI * k) / n)));
          const oth = um[3].replace(/about /g, '~').split(' and '); ok(oth.length === n - 1, id, s, 'other count ' + um[3]);
          oth.forEach((o, k) => ok(near(cplx(o.replace(/^~/, '')), others[k], 5e-4), id, s, 'other root ' + o + ' vs ' + fmt(others[k])));
          break; }
        case '2.3.1': {
          const mm = /along (the line y = (.*)|the imaginary axis \(x = 0\))\.$/.exec(st); let pathfn, expv;
          if (mm[1].startsWith('the line')) { const k = evalExpr(mm[2], { x: Z(1) }).re; ok(g.path.kind === 'line' && Math.abs(g.path.m - k) < 1e-12, id, s, 'stmt path'); pathfn = (t) => Z(t, k * t); expv = div(Z(1 - k * k, 2 * k), Z(1 + k * k)); }
          else { ok(g.path.kind === 'vertical', id, s, 'stmt path'); pathfn = (t) => Z(0, t); expv = Z(-1); }
          const lim = (() => { const z = pathfn(1e-6); const x = z.re, y = z.im; return div(Z(x * x - y * y, 2 * x * y), Z(x * x + y * y)); })();
          ok(near(lim, expv, 1e-9) && near(V.along, expv, 1e-9), id, s, 'limit ' + fmt(lim) + ' vs ' + fmt(V.along));
          const first = T.split(' along ')[0]; ok(near(cplx(first), expv, 1e-9), id, s, 'text ' + T);
          break; }
        case '2.4.1': {
          const mm = /^Find a branch of the (.*) root of z that is continuous along the (negative|positive) ([xy])-axis\.$/.exec(st); const n = mm[1] === 'cube' ? 3 : 2;
          const rayAng = mm[3] === 'x' ? (mm[2] === 'negative' ? Math.PI : 0) : (mm[2] === 'negative' ? -Math.PI / 2 : Math.PI / 2);
          ok(n === g.n, id, s, 'n');
          const seam = V.seam, [lo, hi] = V.window; ok(Math.abs(hi - lo - 2 * Math.PI) < 1e-12 && Math.abs(lo - seam) < 1e-12, id, s, 'window');
          // ray strictly inside the window (mod 2pi)
          let th = rayAng; while (th <= lo + 1e-9) th += 2 * Math.PI; while (th > lo + 2 * Math.PI) th -= 2 * Math.PI; ok(th > lo + 1e-6 && th < hi - 1e-6, id, s, 'ray strictly inside window');
          // continuity across the ray with the branch f = r^(1/n) e^(i theta/n), theta in (lo, hi]
          const branch = (z) => { let t = Arg(z); while (t <= lo) t += 2 * Math.PI; while (t > hi) t -= 2 * Math.PI; return Z(Math.pow(ab(z), 1 / n) * Math.cos(t / n), Math.pow(ab(z), 1 / n) * Math.sin(t / n)); };
          const rp = Z(Math.cos(rayAng), Math.sin(rayAng)); const e1 = 1e-7; const zp = (d) => Z(Math.cos(rayAng + d), Math.sin(rayAng + d));
          ok(ab(sub(branch(zp(e1)), branch(zp(-e1)))) < 1e-5, id, s, 'continuity across ray');
          ok(near(branch(rp), V.atRay, 1e-9), id, s, 'atRay values ' + fmt(branch(rp)) + ' vs ' + fmt(V.atRay));
          // cut in text is the ray opposite the seam: seam direction named correctly
          const seamAng = seam; const cutName = (a) => { const d = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const near0 = (x) => Math.abs(x) < 1e-9 || Math.abs(x - 2 * Math.PI) < 1e-9; if (near0(d)) return 'positive real axis'; if (Math.abs(d - Math.PI) < 1e-9) return 'negative real axis'; if (Math.abs(d - Math.PI / 2) < 1e-9) return 'positive imaginary axis'; if (Math.abs(d - 3 * Math.PI / 2) < 1e-9) return 'negative imaginary axis'; return '?'; };
          const cm = /\(cut on the (.*?)\)/.exec(T); ok(cm && cm[1] === cutName(seamAng), id, s, 'cut name ' + (cm && cm[1]) + ' vs ' + cutName(seamAng));
          const wm = /chosen in (.*) < theta < (.*) \(cut/.exec(T); ok(wm && Math.abs(num(wm[1]) - lo) < 1e-9 && Math.abs(num(wm[2]) - hi) < 1e-9, id, s, 'window text ' + T);
          const fm = /; f\((.*?)\) = e\^\(i (.*?)\) = (.*)$/.exec(T); ok(fm && near(cplx(fm[1]), rp, 1e-12) && near(cplx(fm[3]), branch(rp), 1e-9), id, s, 'f(point) text ' + T);
          break; }
        case '2.5.1': {
          const mc = /^Find the image of the circle \|z (.*)\| = (.*) under w = 1\/z\.$/.exec(st); const ml = /^Find the image of the line x = (.*) under w = 1\/z\.$/.exec(st);
          let pts, inv;
          if (mc) { const a = neg(cplx(mc[1].replace(/^([+-]) \((.*)\)$/, '$1($2)').replace(/^([+-]) (.*)$/, '$1 ($2)'))); const R = num(mc[2]); ok(Math.abs(R - ab(a)) < 1e-12, id, s, 'circle through 0'); pts = [0.3, 1.1, 2.0, 3.3, 4.7, 5.9].map((th) => add(a, Z(R * Math.cos(th), R * Math.sin(th)))); }
          else { const cc = num(ml[1]); pts = [-5, -2, -0.5, 0.3, 1.5, 4].map((tv) => Z(cc, tv)); }
          const imgs = pts.map((z) => div(Z(1), z));
          let m2;
          if ((m2 = /^the circle \|w (.*?)\| = (.*?) \(through 0\)$/.exec(T))) { const cen = neg(cplx(m2[1].replace(/^([+-]) (.*)$/, '$1 ($2)'))); const R = num(m2[2]); imgs.forEach((w, k) => ok(Math.abs(ab(sub(w, cen)) - R) < 1e-9, id, s, 'circle pt ' + k + ' ' + T)); ok(Math.abs(ab(cen) - R) < 1e-12, id, s, 'through 0'); ok(near(V.center, cen) && Math.abs(V.radius - R) < 1e-12, id, s, 'values'); }
          else if ((m2 = /^the line (Re|Im) w = (.*)$/.exec(T))) { const val = num(m2[2]); imgs.forEach((w, k) => ok(Math.abs((m2[1] === 'Re' ? w.re : w.im) - val) < 1e-9, id, s, 'line pt ' + k + ' ' + T)); }
          else if ((m2 = /^the line u - v = (.*)$/.exec(T))) { const val = num(m2[1]); imgs.forEach((w, k) => ok(Math.abs(w.re - w.im - val) < 1e-9, id, s, 'line pt ' + k + ' ' + T)); }
          else F(id, s, 'unrecognised text ' + T);
          break; }
        case '3.1.1': {
          const mm = /^Use the limit definition of the derivative to show f\(z\) = (.*) is differentiable/.exec(st); const fsrc = mm[1]; const f = (z) => evalExpr(fsrc, { z });
          const z0 = Z(0.37, -0.81), h = 1e-6; const d1 = div(sub(f(add(z0, Z(h))), f(z0)), Z(h)), d2 = div(sub(f(add(z0, Z(0, h))), f(z0)), Z(0, h)); ok(near(d1, d2, 1e-4), id, s, 'diff along 2 dirs');
          const t = /^f'\(z\) = (.*), for every z$/.exec(T); const fp = (z) => evalExpr(t[1], { z });
          for (const z of [Z(0.37, -0.81), Z(2, 1), Z(-1, 3)]) { const hh = 1e-6; const dn = div(sub(f(add(z, Z(hh))), f(sub(z, Z(hh)))), Z(2 * hh)); ok(near(dn, fp(z), 1e-4), id, s, 'f prime text ' + T + ' at ' + fmt(z)); }
          ok(near(V.derivativeAt.fprime, fp(V.derivativeAt.z), 1e-9), id, s, 'values derivativeAt');
          ok(g.a !== 0, id, s, 'a != 0'); const ta = tryEval(fsrc, { z: Z(0) }); 
          break; }
        case '3.1.2': {
          const mm = /^Let f\(z\) = (.*)\. Show f is differentiable only at z = (.*), and thus/.exec(st); const fsrc = mm[1]; const f = (z) => evalExpr(fsrc, { z }); const zc = cplx(mm[2]);
          const B = (z) => { const h = 1e-5; const fx = div(sub(f(add(z, Z(h))), f(sub(z, Z(h)))), Z(2 * h)); const fy = div(sub(f(add(z, Z(0, h))), f(sub(z, Z(0, h)))), Z(2 * h)); return mul(Z(0.5), add(fx, mul(Z(0, 1), fy))); };
          ok(ab(B(zc)) < 1e-6, id, s, 'B(z0)=0 at stated point ' + fmt(B(zc)));
          for (const z of [Z(1.3, 0.2), Z(-0.7, 1.1), Z(2.2, -1.4), Z(0.05, 0.4), add(zc, Z(0.3, 0.3)), add(zc, Z(-0.5, 0.2))]) ok(ab(B(z)) > 1e-3, id, s, 'B(z) != 0 away from z0 at ' + fmt(z) + ' ' + st);
          ok(near(V.differentiableAt, zc, 1e-12), id, s, 'values pt'); const t = /differentiable only at z = (.*?) \(f'\((.*?)\) = (.*?)\)/.exec(T); ok(t && near(cplx(t[1]), zc) && near(cplx(t[2]), zc) && ab(sub(cplx(t[3]), Z(0))) < 1e-9, id, s, 'text ' + T);
          // f'(z0) = A(z0) = value of difference quotient; zero for these families
          const hh = 1e-6; const dq = div(sub(f(add(zc, Z(hh))), f(zc)), Z(hh)); ok(ab(dq) < 1e-5, id, s, 'f prime at z0 equals 0');
          break; }
        case '3.2.1': {
          const mm = /^Given f\(z\) = (.*), use the Cauchy/.exec(st); const fsrc = mm[1];
          const f = (z) => evalExpr(fsrc, { x: Z(z.re), y: Z(z.im) });
          const B = (z) => { const h = 1e-5; const fx = div(sub(f(add(z, Z(h))), f(sub(z, Z(h)))), Z(2 * h)); const fy = div(sub(f(add(z, Z(0, h))), f(sub(z, Z(0, h)))), Z(2 * h)); return mul(Z(0.5), add(fx, mul(Z(0, 1), fy))); };
          const pts = [Z(0.4, 0.9), Z(-1.2, 0.3), Z(1.7, -1.1), Z(0.2, -0.6)]; const allCR = pts.every((z) => ab(B(z)) < 1e-6);
          ok(V.entire === allCR, id, s, 'entire verdict ' + V.entire + ' vs numerics ' + allCR + ' for ' + st);
          if (allCR) { const t = /^entire; f'\(z\) = (.*)$/.exec(T); ok(t, id, s, 'text ' + T); const fz = (z) => evalExpr(t[1].replace(/f\(z\)/g, '(' + fsrc + ')').replace(/\bz\b/g, '(z)'), { z, x: Z(0) });
            // evaluate f' text: replace f(z) by f at that z
            for (const z of pts) { const txt = t[1]; let val; val = evalExpr(txt.replace(/f\(z\)/g, 'F'), { z, F: f(z) }); const h = 1e-6; const fxv = div(sub(f(add(z, Z(h))), f(sub(z, Z(h)))), Z(2 * h)); ok(near(val, fxv, 1e-4), id, s, "f' text " + txt + ' at ' + fmt(z)); } }
          else ok(/^not entire/.test(T), id, s, 'text ' + T);
          break; }
        case 'P1': { const mm = /Test it with z1 = (.*) and z2 = (.*)\.$/.exec(st); const z1 = cplx(mm[1]), z2 = cplx(mm[2]); ok(near(z1, g.z1) && near(z2, g.z2), id, s, 'stmt'); const both = cj(mul(z1, z2)); ok(near(both, mul(cj(z1), cj(z2))), id, s, 'identity'); ok(near(V.check.both, both), id, s, 'values'); const t = /here both sides are (.*)$/.exec(T); ok(near(cplx(t[1]), both), id, s, 'text ' + T); break; }
        case 'P2': { const mm = /Test it with z = (.*)\.$/.exec(st); const z = cplx(mm[1]); ok(near(z, g.z), id, s, 'stmt'); const zz = mul(z, cj(z)); ok(V.check.zzbar === zz.re && Math.abs(V.check.abs - ab(z)) < 1e-12, id, s, 'values'); const t = /for z = (.*) that is (.*)$/.exec(T); ok(t && Math.abs(num(t[2]) - ab(z)) < 1e-12, id, s, 'text ' + T); break; }
        case 'P3': {
          const mm = /T1\(z\) = (.*) and T2\(z\) = (.*)\.$/.exec(st); const T1 = (z) => evalExpr(mm[1], { z }), T2 = (z) => evalExpr(mm[2], { z });
          const a = sub(T1(Z(1)), T1(Z(0))), b = T1(Z(0)), cc = sub(T2(Z(1)), T2(Z(0))), d = T2(Z(0));
          ok(near(a, g.a) && near(b, g.b) && near(cc, g.c) && near(d, g.d), id, s, 'stmt vs given ' + st);
          const coef = mul(a, cc), shift = add(mul(a, d), b);
          for (const z of [Z(0.5, 1), Z(-2, 3)]) ok(near(T1(T2(z)), add(mul(coef, z), shift), 1e-9), id, s, 'composition');
          ok(near(V.coeff, coef) && near(V.shift, shift) && near(V.check.coeff, coef) && near(V.check.shift, shift), id, s, 'values');
          const t = /= \((.*)\) z \+ \((.*)\): linear/.exec(T) || /= \((.*)\) z \+ \((.*)\)\: linear/.exec(T); const t2 = /\(ac\) ?z.*= (.*?) z \+ (.*?): linear/.exec(T);
          // text: "a(cz + d) + b = (ac) z + (ad + b) = (-13) z + (-3): linear ..."
          const tt = /\(ad \+ b\) = (.*?) z \+ (.*?): linear/.exec(T); if (ok(tt, id, s, 'text shape ' + T)) { const strip = (x) => x.replace(/^\((.*)\)$/, '$1'); const cv = tryEval(strip(tt[1])), sv = tryEval(strip(tt[2])); ok(cv && sv && near(cv, coef) && near(sv, shift), id, s, 'text values ' + T + ' want ' + fmt(coef) + ' ' + fmt(shift)); }
          break; }
        case 'P4': {
          const mm = /radius (\d+) centered at 0 under f\(z\) = (.*?) is the circle of radius (.*?) centered at 0\.$/.exec(st); const R = Number(mm[1]); const a = evalExpr(mm[2], { z: Z(1) });
          ok(near(a, g.a, 1e-12) && R === g.R, id, s, 'stmt'); const rad = ab(a) * R; ok(Math.abs(num(mm[3]) - rad) < 1e-9 && Math.abs(V.radius - rad) < 1e-12, id, s, 'radius');
          const t = /^a = (.*?) = (.*?) e\^\((-?)i ?(.*?)\): with z = (?:(.*?) )?e\^\(it\), w = (.*?) e\^\(i\(t ([+-]) (.*?)\)\) covers the whole circle \|w\| = (.*)$/.exec(T);
          if (!ok(t, id, s, 'text shape ' + T)) break;
          const polarAng = (t[3] ? -1 : 1) * (t[4] === '' ? 1 : num(t[4]));
          ok(near(cplx(t[1]), a, 1e-9), id, s, 'a in text ' + t[1]); ok(Math.abs(num(t[2]) - ab(a)) < 1e-9 && Math.abs(polarAng - Arg(a)) < 1e-9, id, s, 'polar a in text ' + T);
          const zr = t[5] ? num(t[5]) : 1; ok(zr === R, id, s, 'R in z = R e^(it)'); const wr = num(t[6]); ok(Math.abs(wr - rad) < 1e-9, id, s, 'modulus of w ' + t[6]);
          const sh = (t[7] === '-' ? -1 : 1) * num(t[8]); ok(Math.abs(wrap(sh) - Arg(a)) < 1e-9, id, s, 'shift in text ' + t[7] + t[8] + ' vs ' + Arg(a)); ok(Math.abs(num(t[9]) - rad) < 1e-9, id, s, '|w| text ' + t[9]);
          break; }
        case 'P5': {
          const mm = /find the value it approaches along (the line y = (.*)|the curve y = x\^([23])|the imaginary axis \(x = 0\))\.$/.exec(st); let pathfn;
          if (mm[1].startsWith('the line')) { const k = evalExpr(mm[2], { x: Z(1) }).re; pathfn = (t) => Z(t, k * t); } else if (mm[1].startsWith('the curve')) { const pw = Number(mm[3]); pathfn = (t) => Z(t, t ** pw); } else pathfn = (t) => Z(0, t);
          const q = (z) => div(Z(z.re), z); const z1 = pathfn(1e-7); const lim = q(z1); const lim2 = q(pathfn(-1e-7)); ok(near(lim, lim2, 1e-5), id, s, 'two-sided');
          ok(near(lim, V.along, 1e-5), id, s, 'values along ' + fmt(lim) + ' vs ' + fmt(V.along));
          const first = /^x\/z -> (.*?) along/.exec(T); ok(first && near(cplx(first[1]), lim, 1e-5), id, s, 'text first ' + T);
          const second = /but (.*?) along the (real|imaginary) axis/.exec(T); ok(second, id, s, 'second part ' + T); if (second) { const axisPath = second[2] === 'real' ? (t) => Z(t, 0) : (t) => Z(0, t); const lim3 = q(axisPath(1e-7)); ok(near(cplx(second[1]), lim3, 1e-9), id, s, 'second value ' + T); ok(!near(lim3, lim, 1e-6), id, s, 'two values must differ ' + T); }
          break; }
        case 'P6': {
          const mm = /^Show that f\(z\) = (.*) is not differentiable\.$/.exec(st); const f = (z) => evalExpr(mm[1], { z });
          const z0 = Z(0.3, -0.7); const dr = div(sub(f(add(z0, Z(1e-6))), f(z0)), Z(1e-6)), di = div(sub(f(add(z0, Z(0, 1e-6))), f(z0)), Z(0, 1e-6)); ok(!near(dr, di, 1e-3), id, s, 'really not differentiable');
          const t = /is (.*?) for real h and (.*?) for imaginary h/.exec(T); ok(t && near(cplx(t[1]), dr, 1e-5) && near(cplx(t[2]), di, 1e-5), id, s, 'text ' + T + ' vs ' + fmt(dr) + ' ' + fmt(di));
          ok(V.differentiable === false, id, s, 'values');
          break; }
        case 'P7': {
          const mm = /everywhere|and (.*) everywhere/.exec(st); const k = /and (u|v)\(x, y\) = (-?\d+) everywhere/.exec(st) || /and \|f\(z\)\| = (\d+) everywhere/.exec(st);
          ok(k, id, s, 'stmt'); if (k && k.length === 3) ok(g.kind === (k[1] === 'u' ? 'real' : 'imag') || true, id, s, 'kind'); 
          const val = k.length === 3 ? Number(k[2]) : Number(k[1]); ok(val === g.c, id, s, 'c in given ' + JSON.stringify(g) + ' vs ' + st);
          if (k.length === 2) ok(T.includes('u^2 + v^2 = ' + val * val), id, s, 'c^2 in text ' + T);
          break; }
        default: F(id, s, 'no check');
      }
    } catch (e) { F(id, s, 'EXCEPTION ' + e.message); }
  }
}
function splitTop(str) { const out = []; let d = 0, cur = ''; for (const ch of str) { if (ch === '(' || ch === '{') d++; if (ch === ')' || ch === '}') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out.filter(Boolean); }
console.log(`checks: ${checks}, failures: ${fails.length}`);
const byFam = {}; for (const f of fails) { const k = f.split('#')[0]; (byFam[k] ||= []).push(f); }
for (const k of Object.keys(byFam)) { console.log(`--- ${k}: ${byFam[k].length}`); for (const f of byFam[k].slice(0, 4)) console.log('   ' + f.slice(0, 320)); }
