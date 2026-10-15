import * as X from '../../../../../js/core/complex.js';
import * as P from '../../../../../js/core/parse.js';
const near = (a, b, e = 1e-9) => Math.hypot(a.re - b.re, a.im - b.im) <= e;
let bad = 0; const chk = (n, c, x = '') => { if (!c) { bad++; console.log('FAIL', n, x); } };
// 2.3.1 along y = x^2
for (const x of [0.1, 0.01, 0.001, -0.01]) {
  const v = P.evaluate('(x^2 - y^2 + 2ixy)/(x^2 + y^2)', { re: x, im: x * x });
  const w = { re: (1 - x * x) / (1 + x * x), im: 2 * x / (1 + x * x) };
  chk('2.3.1 y=x^2 ' + x, near(v, w, 1e-9), JSON.stringify([v, w]));
}
for (const m of [0.5, 1, -2, 3]) for (const x of [0.1, 0.001]) { const v = P.evaluate('(x^2 - y^2 + 2ixy)/(x^2 + y^2)', { re: x, im: m * x }); const w = X.expi(2 * Math.atan(m)); chk('y=mx', near(v, w, 1e-9)); }
// 2.5.1 1/z of |z-1|=1: Re w = 1/2
for (let k = 1; k < 360; k++) { const t = k * Math.PI / 180; const z = { re: 1 + Math.cos(t), im: Math.sin(t) }; const w = P.evaluate('1/z', z); chk('1/z circle', Math.abs(w.re - 0.5) < 1e-12, k); }
// 2.1.2 x = c under z^2: u = c^2 - v^2/(4c^2)
for (const c of [2, 1, -1.5]) for (let y = -3; y <= 3; y += .25) { const w = P.evaluate('z^2', { re: c, im: y }); chk('x=c z^2', Math.abs(w.re - (c * c - w.im * w.im / (4 * c * c))) < 1e-9); }
// 2.1.3 iz-2i on x=2 : line x=2 -> w = i(2+iy) - 2i = -y + 0i  (since i*2 - y*... ) check
{ const w = P.evaluate('iz - 2i', { re: 2, im: 1.5 }); chk('iz-2i', near(w, { re: -1.5, im: 0 })); }
chk('(1+i)^2=2i', near(X.pow({ re: 1, im: 1 }, 2), { re: 0, im: 2 }));
// 3.2.1 e^x(cos y + i sin y) == exp(z)
for (const z of [{ re: .3, im: 1.2 }, { re: -1, im: -2.5 }]) chk('3.2.1', near(P.evaluate('exp(x)(cos(y) + i sin(y))', z), X.exp(z), 1e-12));
// P4: |(1+i) z| = sqrt2 on unit circle
for (let k = 0; k < 360; k += 7) { const z = X.expi(k * Math.PI / 180); chk('P4', Math.abs(X.abs(P.evaluate('(1+i)z', z)) - Math.SQRT2) < 1e-12); }
// 2.2.1 sector 0<arg<pi/4 under z^3 -> 0 < arg < 3pi/4
for (const a of [.01, .3, Math.PI / 4 - .01]) { const w = P.evaluate('z^3', X.fromPolar(2, a)); chk('z^3 sector', Math.abs(X.Arg(w) - 3 * a) < 1e-12 && Math.abs(X.abs(w) - 8) < 1e-12); }
// 1.5.1 line 2+i to -3-3i: not in this goal. 
// Staircase: argSet vs Arg vs the point
const z = { re: -1, im: Math.sqrt(3) };
const set = X.argSet(z, { kMin: -2, kMax: 2 });
chk('every step reaches the same point', set.every(s => near(X.fromPolar(2, s.theta), z, 1e-12)));
chk('k=0 is Arg', set.find(s => s.k === 0).theta === X.Arg(z));
// root fan from staircase: divide by n
const rs = X.rootsOf(z, 3); chk('cube roots', rs.every(r => near(X.pow(r, 3), z, 1e-12)));
// consumers: do all formulas in data compile?
import * as F from '../../../../../js/data/functions.js';
import * as D from '../../../../../js/data/problems.js';
const strings = new Set();
(function walk(o, path) { if (typeof o === 'string') { return; } if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (typeof o[k] === 'string' && /^(src|formula|expr|f|fz|fs)$/.test(k)) strings.add(o[k]); walk(o[k]); } })(F);
(function walk(o) { if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (typeof o[k] === 'string' && /^(src|formula|expr|f|fz|fs)$/.test(k)) strings.add(o[k]); walk(o[k]); } })(D);
console.log('data formula strings found:', strings.size, [...strings].slice(0, 30));
let cb = 0; for (const s of strings) { try { P.compile(s); } catch (e) { cb++; console.log('  data formula does not compile:', JSON.stringify(s), e.message); } }
console.log('uncompilable data formulas:', cb, 'bad:', bad);
