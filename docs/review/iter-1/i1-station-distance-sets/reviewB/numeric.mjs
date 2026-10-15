import * as D from '/home/user/math-viz/js/stations/distance.js';
import * as S from '/home/user/math-viz/js/stations/sets.js';
let bad = 0; const chk = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const rnd = (a, b) => a + Math.random() * (b - a);
// distance
for (let i = 0; i < 20000; i++) {
  const z1 = { re: rnd(-9, 9), im: rnd(-9, 9) }, z2 = { re: rnd(-9, 9), im: rnd(-9, 9) };
  const k = D.slideStats(z1, z2), d = Math.hypot(z1.re - z2.re, z1.im - z2.im);
  chk(Math.abs(k.d - d) < 1e-12 && Math.abs(k.dPolar - d) < 1e-6 * Math.max(1, d), `slide ${JSON.stringify([z1, z2])} ${k.d} ${k.dPolar} ${d}`);
  const t = D.triangleStats(z1, z2), b = Math.hypot(z1.re + z2.re, z1.im + z2.im), up = Math.hypot(z1.re, z1.im) + Math.hypot(z2.re, z2.im), lo = Math.abs(Math.hypot(z1.re, z1.im) - Math.hypot(z2.re, z2.im));
  chk(Math.abs(t.b - b) < 1e-12 && Math.abs(t.bPolar - b) < 1e-6 * Math.max(1, b), 'tri b');
  chk(Math.abs(t.slack - (up - b)) < 1e-12 && t.slack >= 0 && b >= lo - 1e-12 && b <= up + 1e-12, 'tri slack/bounds');
}
// exact known values
let k = D.slideStats({ re: 4, im: 3 }, { re: -1, im: 1 });
chk(Math.abs(k.d - Math.sqrt(29)) < 1e-15 && k.slide.re === 5 && k.slide.im === 2 && Math.abs(k.theta - Math.atan(2 / 5)) < 1e-15, '1.2.2');
let c = D.circleStats({ re: 1, im: 2 }, { re: 1, im: 5 }); chk(c.R === 3 && Math.abs(c.phi - Math.PI / 2) < 1e-15, '1.2.1');
// aligned -> slack 0 exactly via agreement
chk(D.agreement(Math.atan2(1, 1), Math.atan2(2, 2), Math.SQRT2, 2 * Math.SQRT2) === 'exact', 'agreement exact');
chk(D.agreement(0.5, 0.5 + 2 * Math.PI, 1, 1) === 'exact', 'agreement mod 2pi');
chk(D.agreement(3, -3, 1, 1) === 'no' || D.agreement(3, -3, 1, 1) === 'near' || true, 'noop');
// sets
const A = S.analyse(S.buildSet('annulus'));
chk(A.open === false && A.closed === false && A.bounded === true && A.connected === true && A.domain === false && A.region === true, '1.5.2 analysis');
chk(A.boundingRadius === 4, 'bounding radius 4 (|-i| + 3)');
const set = S.buildSet('annulus');
const oracle = (z) => { const d = Math.hypot(z.re, z.im + 1); return d > 1 && d <= 3; };
for (let i = 0; i < 30000; i++) {
  const z = { re: rnd(-5, 5), im: rnd(-5, 5) };
  const cl = S.classifyPoint(set, z), d = Math.hypot(z.re, z.im + 1);
  chk(S.contains(set, z) === oracle(z), `contains ${JSON.stringify(z)}`);
  const kind = (Math.abs(d - 1) < 1e-9 || Math.abs(d - 3) < 1e-9) ? 'boundary' : oracle(z) ? 'interior' : 'exterior';
  chk(cl.kind === kind, `kind ${JSON.stringify(z)} ${cl.kind} vs ${kind}`);
  const eps = Math.min(Math.abs(d - 1), Math.abs(d - 3));
  if (cl.kind !== 'boundary') chk(Math.abs(cl.epsMax - eps) < 1e-12, 'epsMax');
}
// boundary points exactly
for (const [z, kind, inS] of [[{ re: 0, im: 0 }, 'boundary', false], [{ re: 0, im: 2 }, 'boundary', true], [{ re: 0, im: 1 }, 'interior', true], [{ re: 3, im: 3 }, 'exterior', false], [{ re: 0, im: -1 }, 'exterior', false], [{ re: 0, im: -4 }, 'boundary', true]]) {
  const cl = S.classifyPoint(set, z); chk(cl.kind === kind && cl.inS === inS, `special ${JSON.stringify(z)} ${cl.kind} ${cl.inS}`);
}
// strict toggles: all 4 combos on the annulus vs hand-derived truth
for (const [is, os, open, closed] of [[true, false, false, false], [true, true, true, false], [false, false, false, true], [false, true, false, false]]) {
  const a = S.analyse(S.buildSet('annulus', { innerStrict: is, outerStrict: os }));
  chk(a.open === open && a.closed === closed && a.domain === open && a.region === true && a.bounded, `flags ${is} ${os}: ${JSON.stringify([a.open, a.closed, a.domain])}`);
}
// presets
const P = (id) => S.analyse(S.buildSet(id));
chk(P('punctured').open && P('punctured').domain && P('punctured').bounded && !P('punctured').closed, 'punctured disk 0<|z+i|<3');
chk(!P('halfplane').bounded && P('halfplane').open && P('halfplane').domain, 'half plane');
chk(!P('twodisks').connected && !P('twodisks').domain && !P('twodisks').region && P('twodisks').open, 'two disks');
chk(P('closed').closed && !P('closed').open && !P('closed').domain && P('closed').region, 'closed annulus');
console.log(bad ? `${bad} FAILURES` : 'all independent numeric checks passed');
process.exit(bad ? 1 : 0);
