// Review B: recompute the five checked set-ups from the handout with my own formulas (no lab.js helper for the maths), then ask checkProblem.
import * as lab from '../../../../../js/stations/lab.js';
const { LAB_PRESETS, cleanSpec, specToCurves, makeFn, computeImages, checkProblem, detectProblem } = lab;
const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const own = {
  '2.1.2': (z) => cmul(z, z),                                      // z^2
  '2.1.3': (z) => { const t = cmul({ re: 0, im: 1 }, z); return { re: t.re, im: t.im - 2 }; },   // iz - 2i
  '2.2.1': (z) => cmul(z, cmul(z, z)),                              // z^3
  '2.5.1': (z) => { const d = z.re * z.re + z.im * z.im; return { re: z.re / d, im: -z.im / d }; }, // 1/z
  P4: (z) => cmul({ re: 1, im: 1 }, z),                              // (1+i) z
};
const expect = {                                                    // the handout answers, derived by hand
  '2.1.2': (w) => Math.abs(w.re - (4 - w.im * w.im / 16)),          // x = 2: u = 4 - y^2, v = 4y
  '2.1.3': (w) => Math.abs(w.im),                                   // iz - 2i = -y: the real axis
  '2.2.1': (w) => { const a = Math.atan2(w.im, w.re); return Math.max(-a, a - 3 * Math.PI / 4, 0); },
  '2.5.1': (w) => Math.abs(w.re - 0.5),
  P4: (w) => Math.abs(Math.hypot(w.re, w.im) - Math.SQRT2),
};
let bad = 0;
for (const p of LAB_PRESETS.filter((q) => q.fn)) {
  const id = p.problem === '2.1.2' ? '2.1.2' : p.problem;
  const fn = makeFn({ id: p.fn });
  const curves = specToCurves(cleanSpec(p.spec), 'c').curves;
  // the Lab's own f against mine at 200 sample points
  let dmax = 0, n = 0, emax = 0;
  for (const c of curves) for (const z of c.points) {
    const a = fn.f(z), b = own[id](z);
    if (!isFinite(a.re) || !isFinite(a.im) || Math.hypot(b.re, b.im) > 1e6) continue;
    dmax = Math.max(dmax, Math.hypot(a.re - b.re, a.im - b.im) / Math.max(1, Math.hypot(b.re, b.im))); n++;
    emax = Math.max(emax, expect[id](own[id](z)));
  }
  const chk = checkProblem(id, computeImages(curves, fn.f, { clampRadius: 40 }));
  const det = detectProblem([cleanSpec(p.spec)], fn);
  console.log(id.padEnd(6), 'f agrees with mine to', dmax.toExponential(1), 'on', n, 'pts; my own answer-formula error', emax.toExponential(1), '| detect:', det, '| check ok:', chk.ok, '|', chk.text.slice(0, 90));
  if (dmax > 1e-9 || emax > 1e-6 || !chk.ok || det !== id) bad++;
}
// 2.1.3 / 2.1.2 with the other f of the pair
const fn213 = makeFn({ id: 'linear-i' });
const c = specToCurves(cleanSpec({ kind: 'verticalLine', x: 2 }), 'c').curves;
const chk = checkProblem('2.1.3', computeImages(c, fn213.f, { clampRadius: 40 }));
console.log('2.1.3', 'check ok:', chk.ok, detectProblem([cleanSpec({ kind: 'verticalLine', x: 2 })], fn213), chk.text.slice(0, 80));
if (!chk.ok) bad++;
console.log(bad ? 'MISMATCH' : 'all numbers agree');
process.exit(bad ? 1 : 0);
