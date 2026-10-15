import { powerModel, cartesianChain, powersReadout, wrapNote, logRuler } from '/home/user/math-viz/js/stations/powers.js';
import { stairModel, sumModel, sumReadoutText, readoutText, createLapTracker } from '/home/user/math-viz/js/stations/staircase.js';
const PI = Math.PI, TAU = 2 * PI;
// independent: principal angle in (-pi, pi] by rounding, no atan2 on the product
const principal = (t) => { let k = Math.ceil((t - PI) / TAU); let v = t - k * TAU; if (v <= -PI + 1e-12) v += TAU; return v; };
let bad = 0, checked = 0;
const near = (a, b, tol = 1e-7) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
// 1. powers: 4000 random (z, n)
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
for (let i = 0; i < 4000; i++) {
  const r = 0.2 + rnd() * 3, th = (rnd() * 2 - 1) * PI * 0.999, n = 1 + Math.floor(rnd() * 12);
  const z = { re: r * Math.cos(th), im: r * Math.sin(th) };
  const m = powerModel(z, n);
  const rn = Math.pow(r, n);
  const want = { re: rn * Math.cos(n * th), im: rn * Math.sin(n * th) };
  const hs = principal(n * th);
  checked++;
  if (!near(m.zn.re, want.re, 1e-6) || !near(m.zn.im, want.im, 1e-6) || !near(m.rn, rn, 1e-9) || Math.abs(m.home - hs) > 1e-6 || !(m.home > -PI && m.home <= PI) || !m.agree) { bad++; if (bad < 5) console.log('BAD powers', z, n, m.zn, want, m.home, hs); }
  // turns bookkeeping: ntheta - home = turns * 2pi
  if (Math.abs(m.ntheta - m.home - m.turns * TAU) > 1e-9) { bad++; console.log('BAD turns', z, n, m.turns); }
}
// 2. the review problem exact values
const m = powerModel({ re: Math.sqrt(3), im: 1 }, 10);
const exp = { re: 512, im: -512 * Math.sqrt(3) };
console.log('1.3.2:', powersReadout(m), '| expected 512 - 886.81i, |z|^10 = 1024, 10*pi/6 = 5.236, home -pi/3 = -1.047');
console.log('  zn error', Math.hypot(m.zn.re - exp.re, m.zn.im - exp.im), 'turns', m.turns, '| wrap:', wrapNote(m));
if (Math.hypot(m.zn.re - exp.re, m.zn.im - exp.im) > 1e-9 || !near(m.home, -PI / 3, 1e-12) || !near(m.ntheta, 5 * PI / 3, 1e-12) || m.turns !== 1) { bad++; console.log('BAD 1.3.2'); }
// chain: 9 lines, last = answer; each line equals independent (sqrt3+i)^k
const ch = cartesianChain({ re: Math.sqrt(3), im: 1 }, 10);
if (ch.length !== 9) bad++;
ch.forEach((l) => { const w = { re: Math.pow(2, l.k) * Math.cos(l.k * PI / 6), im: Math.pow(2, l.k) * Math.sin(l.k * PI / 6) }; if (!near(l.value.re, w.re, 1e-9) || !near(l.value.im, w.im, 1e-9)) { bad++; console.log('BAD chain', l.k); } });
// 3. 1.3.1: -1 + i sqrt3
const s = stairModel({ re: -1, im: Math.sqrt(3) });
console.log('1.3.1 steps:', s.steps.map((x) => x.k + ':' + x.theta.toFixed(3)).join(' '), 'expected k*2pi + 2pi/3:', [-3, -2, -1, 0, 1, 2, 3].map((k) => (2 * PI / 3 + k * TAU).toFixed(3)).join(' '));
s.steps.forEach((x) => { if (!near(x.theta, 2 * PI / 3 + x.k * TAU, 1e-12)) { bad++; console.log('BAD step', x); } });
// every step lands on the same point (independent check)
s.steps.forEach((x) => { const p = { re: 2 * Math.cos(x.theta), im: 2 * Math.sin(x.theta) }; if (!near(p.re, -1, 1e-9) || !near(p.im, Math.sqrt(3), 1e-9)) { bad++; console.log('BAD same point', x); } });
// 4. seam moves: home in (seam, seam+2pi], same point, all rows shift consistently
for (const seam of [-PI, -PI / 2, 0, PI / 3, PI / 2 + 0.01]) {
  for (let i = 0; i < 300; i++) {
    const th = (rnd() * 2 - 1) * PI, z = { re: 1.7 * Math.cos(th), im: 1.7 * Math.sin(th) };
    const sm = stairModel(z, seam);
    checked++;
    if (!(sm.home > seam - 1e-12 && sm.home <= seam + TAU + 1e-12)) { bad++; console.log('BAD window', seam, th, sm.home); }
    if (Math.abs(Math.sin(sm.home - th)) > 1e-9 || Math.cos(sm.home - th) < 0.999999) { bad++; console.log('BAD congruence', seam, th, sm.home); }
    const row0 = sm.steps.find((x) => x.k === 0).theta; if (Math.abs(row0 - sm.home) > 1e-12) { bad++; console.log('BAD row0'); }
  }
}
// 5. sum: Thm 1.4.14 -- Arg z1 + Arg z2 is a name of z1 z2 (differs from Arg(z1z2) by whole turns), j integer
for (let i = 0; i < 3000; i++) {
  const z1 = { re: (rnd() - .5) * 6, im: (rnd() - .5) * 6 }, z2 = { re: (rnd() - .5) * 6, im: (rnd() - .5) * 6 };
  if (Math.hypot(z1.re, z1.im) < .1 || Math.hypot(z2.re, z2.im) < .1) continue;
  const sm = sumModel(z1, z2), a = Math.atan2(z1.im, z1.re), b = Math.atan2(z2.im, z2.re);
  const prod = { re: z1.re * z2.re - z1.im * z2.im, im: z1.re * z2.im + z1.im * z2.re };
  const c = Math.atan2(prod.im, prod.re);
  checked++;
  if (Math.abs(sm.c - c) > 1e-9 && !(Math.abs(Math.abs(c) - PI) < 1e-9)) { bad++; console.log('BAD sum c', z1, z2, sm.c, c); }
  const j = (a + b - c) / TAU;
  if (Math.abs(sm.j - Math.round(j)) > 0 || Math.abs(j - Math.round(j)) > 1e-9) { bad++; console.log('BAD j', j, sm.j); }
}
console.log('A3 readout z1=z2=-1+i:', sumReadoutText(sumModel({ re: -1, im: 1 }, { re: -1, im: 1 })));
// 6. lap tracker: a full ccw circle at 1000 steps from random start gives laps +1 exactly; cw gives -1; wiggle across the seam gives 0
for (let i = 0; i < 200; i++) {
  const start = (rnd() * 2 - 1) * PI, steps = 20 + Math.floor(rnd() * 200), seam = [-PI, 0, PI / 2][i % 3];
  for (const dir of [1, -1]) {
    const t = createLapTracker(); t.begin(Math.atan2(Math.sin(start), Math.cos(start)));
    for (let k = 1; k <= steps; k++) { const a = start + dir * TAU * k / steps; t.update(Math.atan2(Math.sin(a), Math.cos(a)), seam); }
    checked++;
    if (t.laps !== dir) { bad++; console.log('BAD laps', start, steps, seam, dir, t.laps); }
  }
}
const t = createLapTracker(); t.begin(3.0); t.update(-3.0, -PI); t.update(3.0, -PI); t.update(-3.0, -PI); t.update(3.0, -PI);
console.log('wiggle across the seam laps (expect 0):', t.laps); if (t.laps !== 0) bad++;
console.log(`checked ${checked}, bad ${bad}`);
process.exit(bad ? 1 : 0);
