// Review B: independent verification of goal i1-data, written from the goal spec (not from the builder's test).
// Run from repo root: node docs/review/iter-1/i1-data/reviewB/verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/math-viz';
const P = await import(pathToFileURL(path.join(ROOT, 'js/data/problems.js')).href);
const F = await import(pathToFileURL(path.join(ROOT, 'js/data/functions.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'js/registry.js')).href);

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log('FAIL: ' + msg); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const nearC = (z, w, e = 1e-9) => near(z.re, w.re, e) && near(z.im, w.im, e);
const S2 = Math.sqrt(2), S3 = Math.sqrt(3), PI = Math.PI;

// ---------------------------------------------------------------- A1
const IDS = ['1.1.1','1.1.2','1.2.1','1.2.2','1.3.1','1.3.2','1.4.1','1.4.2','1.4.3','1.5.1','1.5.2',
  '2.1.1','2.1.2','2.1.3','2.2.1','2.2.2','2.3.1','2.4.1','2.5.1','3.1.1','3.1.2','3.2.1','P1','P2','P3','P4','P5','P6','P7'];
ok(P.PROBLEMS.length === 29, 'PROBLEMS.length 29');
ok(JSON.stringify(P.PROBLEMS.map((p) => p.id)) === JSON.stringify(IDS), 'ids and handout order exact');
ok(P.TOPICS.length === 12, 'TOPICS.length 12');
ok(JSON.stringify(P.TOPICS.map((t) => t.id)) === JSON.stringify(['T1.1','T1.2','T1.3','T1.4','T1.5','T2.1','T2.2','T2.3','T2.4','T2.5','T3.1','T3.2']), 'topic ids');
const ADDR = ['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both'];
for (const p of P.PROBLEMS) {
  ok(R.stationForProblem(p.id) && p.station === R.stationForProblem(p.id).id, `${p.id} station matches registry (${p.station})`);
  ok(p.statement.length > 20, `${p.id} statement length`);
  ok(p.aha.length > 10, `${p.id} aha length`);
  ok(ADDR.includes(p.address), `${p.id} address ${p.address}`);
  ok(['T1', 'T2', 'T3'].includes(p.thread), `${p.id} thread`);
  ok(Array.isArray(p.topics) && p.topics.length >= 1 && p.topics.every((t) => P.TOPICS.some((x) => x.id === t)), `${p.id} topics valid`);
  ok(typeof p.addressWhy === 'string' && p.addressWhy.length > 20, `${p.id} addressWhy`);
  ok(p.answer && typeof p.answer.tex === 'string' && typeof p.answer.text === 'string' && typeof p.answer.values === 'object', `${p.id} answer shape`);
  // Registry cross-checks beyond the spec: station problems lists include this problem; topics agree.
  const st = R.STATIONS.find((s) => s.id === p.station);
  ok(st.problems.includes(p.id), `${p.id} listed by its station in registry`);
  for (const a of p.alsoAt) ok(R.STATIONS.find((s) => s.id === a)?.problems.includes(p.id), `${p.id} alsoAt ${a} is in registry list`);
  // chapter parity with id
  if (p.kind === 'problem') ok(p.chapter === Number(p.id[0]), `${p.id} chapter`);
}
for (const t of P.TOPICS) {
  for (const s of t.stations) {
    const st = R.STATIONS.find((x) => x.id === s);
    ok(!!st, `topic ${t.id} station ${s} exists`);
    ok(st && st.topics.includes(t.id), `topic ${t.id} listed by station ${s} in registry`);
  }
  ok(t.title && t.summary && t.summary.length > 20, `${t.id} copy`);
}
// reverse: every station that lists a topic is in the topic's stations
for (const st of R.STATIONS) for (const tid of st.topics) {
  if (st.id === 'problems') continue; // the index lists everything by design
  const t = P.TOPICS.find((x) => x.id === tid);
  ok(t && t.stations.includes(st.id), `registry ${st.id} lists ${tid}; topic lists station`);
}
// per-station problems equal registry lists as sets
for (const st of R.STATIONS) {
  const mine = P.problemsForStation(st.id).map((p) => p.id).sort().join(',');
  const theirs = [...st.problems].sort().join(',');
  ok(mine === theirs, `problemsForStation(${st.id}) equals registry problems: [${mine}] vs [${theirs}]`);
}
ok(P.routeFor('1.4.2') === 'problem-1-4-2', 'routeFor 1.4.2');
ok(P.routeFor('P3') === 'problem-P3', 'routeFor P3');
ok(P.idFromRoute('problem-1-4-2') === '1.4.2', 'idFromRoute 1.4.2');
ok(P.idFromRoute('problem-P3') === 'P3', 'idFromRoute P3');
ok(P.idFromRoute('roots') === null, 'idFromRoute roots');
ok(P.topicRoute('T1.4') === 'topic-T1-4', 'topicRoute');
ok(P.topicFromRoute('topic-T1-4') === 'T1.4', 'topicFromRoute');
for (const bad of [undefined, null, 5, '', 'problem-', 'problem-9-9-9', 'problem-1-4', 'problem-P', 'problem-P99', 'topic-T1-4', 'problem-1-4-2-3', 'problem-1.4.2', '#problem-1-4-2'])
  ok(P.idFromRoute(bad) === null, `idFromRoute(${String(bad)}) null`);
for (const bad of [undefined, null, 'topic-', 'topic-T9-9', 'topic-T1-4-1', 'problem-P3', 'T1-4'])
  ok(P.topicFromRoute(bad) === null, `topicFromRoute(${String(bad)}) null`);
for (const p of P.PROBLEMS) {
  const r = P.routeFor(p.id);
  ok(/^[A-Za-z0-9._~-]+$/.test(r), `route chars ${r}`);
  ok(P.idFromRoute(r) === p.id, `round trip ${p.id}`);
}
ok(P.problemById('nope') === null && P.problemById('1.4.2').id === '1.4.2', 'problemById');
ok(P.routeFor('nope') === null, 'routeFor unknown null');

// ---------------------------------------------------------------- A2 (values)
const v = (id) => P.problemById(id).answer.values;
// independent complex arithmetic (mine)
const mul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; };
const powz = (a, n) => { let r = { re: 1, im: 0 }; for (let i = 0; i < n; i++) r = mul(r, a); return r; };
const z1 = { re: 3, im: -2 }, z2 = { re: -1, im: 4 };
ok(nearC(v('1.1.1').product, mul(z1, z2)) && nearC(v('1.1.1').product, { re: 5, im: 14 }), '1.1.1 product');
ok(nearC(v('1.1.1').quotient, div(z1, z2)) && nearC(v('1.1.1').quotient, { re: -11 / 17, im: -10 / 17 }), '1.1.1 quotient');
ok(near(v('1.1.1').productAbs, Math.hypot(5, 14)) && near(Math.hypot(5, 14), Math.sqrt(221)), '1.1.1 productAbs');
ok(near(Math.hypot(3, 2) * Math.hypot(1, 4), Math.sqrt(221)), 'sqrt13*sqrt17=sqrt221');
ok(v('1.1.2').im === 6 && nearC(v('1.1.2').difference, { re: 4, im: -6 }), '1.1.2');
ok(near(v('1.2.2').distance, Math.hypot(5, 2)) && near(v('1.2.2').distance, Math.sqrt(29)), '1.2.2');
ok(nearC(v('1.2.1').center, { re: 1, im: 2 }) && v('1.2.1').radius === 3, '1.2.1');
ok(near(v('1.3.1').r, Math.hypot(-1, S3)) && near(v('1.3.1').theta, Math.atan2(S3, -1)) && near(v('1.3.1').theta, 2 * PI / 3) && near(v('1.3.1').Arg, 2 * PI / 3), '1.3.1');
{
  const r = powz({ re: S3, im: 1 }, 10);
  ok(near(v('1.3.2').result.re, r.re, 1e-6) && near(v('1.3.2').result.im, r.im, 1e-6), '1.3.2 result vs 10 multiplications');
  ok(near(v('1.3.2').result.re, 512, 1e-6) && near(v('1.3.2').result.im, -512 * S3, 1e-6), '1.3.2 result vs closed form');
  ok(near(Math.atan2(r.im, r.re), -PI / 3, 1e-9) && near(v('1.3.2').Arg, -PI / 3), '1.3.2 Arg');
  ok(near(v('1.3.2').r, Math.hypot(r.re, r.im), 1e-6) && v('1.3.2').n === 10, '1.3.2 r, n');
}
for (let k = 0; k < 5; k++) {
  const rk = v('1.4.1').roots[k];
  ok(near(rk.re, Math.cos(2 * PI * k / 5)) && near(rk.im, Math.sin(2 * PI * k / 5)), `1.4.1 root ${k}`);
  const p5 = powz(rk, 5); ok(near(p5.re, 1, 1e-9) && near(p5.im, 0, 1e-9), `1.4.1 root ${k}^5 = 1`);
  // primitive: smallest m>=1 with z^m = 1 equals 5
  let m = 1, zz = rk; while (!(near(zz.re, 1, 1e-9) && near(zz.im, 0, 1e-9)) && m < 20) { zz = mul(zz, rk); m++; }
  ok((m === 5) === v('1.4.1').primitive[k], `1.4.1 primitive[${k}] computed (${m})`);
}
ok(JSON.stringify(v('1.4.1').primitive) === JSON.stringify([false, true, true, true, true]), '1.4.1 primitive literal');
ok(v('1.4.2').radius === 2 && v('1.4.2').angles.length === 4, '1.4.2 radius');
[PI / 4, 3 * PI / 4, 5 * PI / 4, 7 * PI / 4].forEach((a, k) => {
  ok(near(v('1.4.2').angles[k], a), `1.4.2 angle ${k}`);
  const root = v('1.4.2').roots[k];
  ok(near(root.re, 2 * Math.cos(a)) && near(root.im, 2 * Math.sin(a)), `1.4.2 root ${k} from angle`);
  const p4 = powz(root, 4); ok(near(p4.re, -16, 1e-9) && near(p4.im, 0, 1e-9), `1.4.2 root ${k}^4 = -16`);
});
ok(nearC(v('1.4.2').roots[0], { re: S2, im: S2 }) && nearC(v('1.4.2').roots[1], { re: -S2, im: S2 }) && nearC(v('1.4.2').roots[2], { re: -S2, im: -S2 }) && nearC(v('1.4.2').roots[3], { re: S2, im: -S2 }), '1.4.2 roots order');
v('1.4.3').roots.forEach((z, i) => {
  const q = mul(z, z); const val = { re: q.re - 4 * z.re + 13, im: q.im - 4 * z.im };
  ok(near(val.re, 0) && near(val.im, 0), `1.4.3 root ${i} satisfies z^2-4z+13`);
});
ok(nearC(v('1.4.3').roots[0], { re: 2, im: 3 }) && nearC(v('1.4.3').roots[1], { re: 2, im: -3 }), '1.4.3 roots');
ok(v('1.4.3').completed.shift === 2 && v('1.4.3').completed.square === -9, '1.4.3 completed');
ok(nearC(v('1.5.1').at.z, { re: 2 + 0.5 * -5, im: 1 + 0.5 * -4 }) && nearC(v('1.5.1').at.z, { re: -0.5, im: -1 }) && v('1.5.1').at.t === 0.5, '1.5.1 at');
ok(nearC(v('1.5.1').direction, { re: -5, im: -4 }) && nearC(v('1.5.1').start, { re: 2, im: 1 }) && nearC(v('1.5.1').end, { re: -3, im: -3 }), '1.5.1 dir/start/end');
{ const w = v('1.5.2'); ok(w.open === false && w.closed === false && w.bounded === true && w.connected === true && w.domain === false && w.region === true && w.inner === 1 && w.outer === 3 && w.innerIncluded === false && w.outerIncluded === true && nearC(w.center, { re: 0, im: -1 }), '1.5.2 booleans'); }
{
  // 2.1.1: check by direct computation f = z^2 + iz at 1+i
  const z = { re: 1, im: 1 }; const w = { re: mul(z, z).re + (-z.im), im: mul(z, z).im + z.re };
  ok(nearC(v('2.1.1').check.w, w) && nearC(w, { re: -1, im: 3 }), '2.1.1 check.w');
  ok(v('2.1.1').check.u === -1 && v('2.1.1').check.v === 3, '2.1.1 u v');
  // u = x^2 - y^2 - y at (1,1) = -1; v = 2xy + x = 3
  ok(1 - 1 - 1 === -1 && 2 + 1 === 3, '2.1.1 formulas at 1+i');
  // polar check at r=sqrt2, theta=pi/4
  const r = S2, th = PI / 4;
  ok(near(r * r * Math.cos(2 * th) - r * Math.sin(th), -1) && near(r * r * Math.sin(2 * th) + r * Math.cos(th), 3), '2.1.1 polar formulas at r=sqrt2, pi/4');
  // random check of both address forms against z^2+iz
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 6 - 3, y = Math.random() * 6 - 3; const zz = { re: x, im: y }; const ff = mul(zz, zz); ff.re += -y; ff.im += x;
    ok(near(ff.re, x * x - y * y - y, 1e-9) && near(ff.im, 2 * x * y + x, 1e-9), '2.1.1 cart formulas random');
    const rr = Math.hypot(x, y), tt = Math.atan2(y, x);
    ok(near(ff.re, rr * rr * Math.cos(2 * tt) - rr * Math.sin(tt), 1e-9) && near(ff.im, rr * rr * Math.sin(2 * tt) + rr * Math.cos(tt), 1e-9), '2.1.1 polar formulas random');
  }
}
{
  const pb = v('2.1.2').parabola; ok(pb.vertex === 4 && near(pb.coeff, -1 / 16) && pb.focus === 0, '2.1.2 parabola');
  // image of x=2 under z^2 satisfies u = 4 - v^2/16, focus at 0: sqrt(u^2+v^2) = 4 - u ... check
  for (let y = -5; y <= 5; y += 0.37) { const w = mul({ re: 2, im: y }, { re: 2, im: y }); ok(near(w.re, 4 - w.im * w.im / 16, 1e-9), '2.1.2 image on parabola'); ok(near(Math.hypot(w.re, w.im), 4 + y * y, 1e-9) && near(Math.hypot(w.re, w.im), 8 - w.re, 1e-9), '2.1.2 focus-directrix: |w| = 8 - u'); }
  const s = v('2.1.2').sample; ok(s.y === 1 && nearC(s.w, mul({ re: 2, im: 1 }, { re: 2, im: 1 })) && nearC(s.w, { re: 3, im: 4 }), '2.1.2 sample');
}
{
  const s = v('2.1.3').sample; const fz = (z) => { const iz = mul({ re: 0, im: 1 }, z); return { re: iz.re, im: iz.im - 2 }; };
  ok(nearC(fz(s.z), s.w) && nearC(s.w, { re: -3, im: 0 }), '2.1.3 sample');
  for (let y = -4; y <= 4; y += 0.5) ok(near(fz({ re: 2, im: y }).im, 0, 1e-12) && near(fz({ re: 2, im: y }).re, -y), '2.1.3 line to real axis, w = -y');
  ok(near(v('2.1.3').rotation, PI / 2) && nearC(v('2.1.3').shift, { re: 0, im: -2 }) && v('2.1.3').imageLine === 'v = 0', '2.1.3 rest');
}
ok(near(v('2.2.1').sector.from, 0) && near(v('2.2.1').sector.to, 3 * PI / 4) && v('2.2.1').n === 3, '2.2.1');
{
  // principal sqrt(2i)
  const w = { re: 0, im: 2 }; const r = Math.hypot(w.re, w.im), arg = Math.atan2(w.im, w.re);
  const root = { re: Math.sqrt(r) * Math.cos(arg / 2), im: Math.sqrt(r) * Math.sin(arg / 2) };
  ok(nearC(v('2.2.2').root, root) && nearC(root, { re: 1, im: 1 }), '2.2.2 root');
  ok(near(v('2.2.2').r, Math.sqrt(r)) && near(v('2.2.2').Arg, arg / 2), '2.2.2 r, Arg');
  ok(nearC(v('2.2.2').other, { re: -1, im: -1 }), '2.2.2 other');
  const sq = mul(v('2.2.2').root, v('2.2.2').root); ok(near(sq.re, 0) && near(sq.im, 2), '2.2.2 root^2 = 2i');
}
{
  // 2.3.1 along y=x^2
  const g = (x, y) => ({ re: (x * x - y * y) / (x * x + y * y), im: 2 * x * y / (x * x + y * y) });
  const x = 1e-5; const gv = g(x, x * x); ok(near(gv.re, 1, 1e-8) && near(gv.im, 0, 1e-4), '2.3.1 numeric along parabola');
  ok(v('2.3.1').alongParabola === 1 && v('2.3.1').exists === false, '2.3.1');
  ok(nearC(v('2.3.1').alongRealAxis, g(1e-3, 0)) && nearC(v('2.3.1').alongImagAxis, g(0, 1e-3)) && nearC(v('2.3.1').alongImagAxis, { re: -1, im: 0 }), '2.3.1 axes');
}
{
  ok(v('2.4.1').seam === 0 && near(v('2.4.1').window[0], 0) && near(v('2.4.1').window[1], 2 * PI) && v('2.4.1').principalJumps === true, '2.4.1');
  ok(nearC(v('2.4.1').atMinusOne, { re: Math.cos(PI / 3), im: Math.sin(PI / 3) }) && nearC(v('2.4.1').atMinusOne, { re: 0.5, im: S3 / 2 }), '2.4.1 atMinusOne');
  const cube = powz(v('2.4.1').atMinusOne, 3); ok(near(cube.re, -1) && near(cube.im, 0, 1e-12), '2.4.1 atMinusOne^3 = -1');
}
{
  ok(v('2.5.1').re === 0.5 && v('2.5.1').imageLine === 'Re w = 1/2', '2.5.1');
  const s = v('2.5.1').sample; const w = div({ re: 1, im: 0 }, s.z); ok(nearC(s.w, w) && nearC(w, { re: 0.5, im: -0.5 }), '2.5.1 sample');
  for (let t = -1.4; t <= 1.4; t += 0.1) { const z = { re: 1 + Math.cos(t * 2.1), im: Math.sin(t * 2.1) }; if (Math.hypot(z.re, z.im) < 1e-3) continue; const ww = div({ re: 1, im: 0 }, z); ok(near(ww.re, 0.5, 1e-9), '2.5.1 image on Re w=1/2'); }
}
{
  // 3.1.1 difference quotient numerical
  const f = (z) => { const s = mul(z, z); return { re: s.re + z.re, im: s.im + z.im }; };
  const z0 = { re: 1, im: 1 };
  for (const phi of [0, 0.7, 1.9, 3.3, -2]) { const h = { re: 1e-7 * Math.cos(phi), im: 1e-7 * Math.sin(phi) }; const q = div({ re: f({ re: z0.re + h.re, im: z0.im + h.im }).re - f(z0).re, im: f({ re: z0.re + h.re, im: z0.im + h.im }).im - f(z0).im }, h); ok(nearC(q, v('3.1.1').derivativeAt.fprime, 1e-5), '3.1.1 difference quotient from direction ' + phi); }
  ok(nearC(v('3.1.1').derivativeAt.fprime, { re: 3, im: 2 }) && nearC(v('3.1.1').derivativeAt.z, z0) && v('3.1.1').Babs === 0, '3.1.1');
}
{
  // 3.1.2: |z|^2 quotient circle at z0=1+i: center conj z0, radius |z0|
  const f = (z) => ({ re: z.re * z.re + z.im * z.im, im: 0 }); const z0 = { re: 1, im: 1 }; const rho = 1e-7; const pts = [];
  for (let k = 0; k < 8; k++) { const phi = k * PI / 4 + 0.1; const h = { re: rho * Math.cos(phi), im: rho * Math.sin(phi) }; const fz = f({ re: z0.re + h.re, im: z0.im + h.im }); const q = div({ re: fz.re - f(z0).re, im: fz.im - f(z0).im }, h); pts.push(q); const c0 = v('3.1.2').circleRadiusAt.center; ok(near(Math.hypot(q.re - c0.re, q.im - c0.im), v('3.1.2').circleRadiusAt.radius, 1e-4), '3.1.2 quotient on the circle (center,radius) at dir ' + k); }
  ok(near(v('3.1.2').circleRadiusAt.radius, S2) && nearC(v('3.1.2').circleRadiusAt.center, { re: 1, im: -1 }) && nearC(v('3.1.2').fprime0, { re: 0, im: 0 }) && nearC(v('3.1.2').differentiableAt, { re: 0, im: 0 }), '3.1.2');
}
{
  ok(near(v('3.2.1').fprimeAt0.re, 1) && near(v('3.2.1').fprimeAt0.im, 0), '3.2.1 fprimeAt0 = e^0');
  const z = v('3.2.1').check.z; const w = { re: Math.exp(z.re) * Math.cos(z.im), im: Math.exp(z.re) * Math.sin(z.im) };
  ok(nearC(w, v('3.2.1').check.w) && nearC(w, { re: 0, im: 1 }) && v('3.2.1').entire === true, '3.2.1');
}
{
  const c1 = (z) => ({ re: z.re, im: -z.im });
  const c = v('P1').check; ok(nearC(mul(c1(c.z1), c1(c.z2)), c.both) && nearC(c1(mul(c.z1, c.z2)), c.both) && nearC(c.both, { re: 5, im: -14 }), 'P1');
  const z = v('P2').check.z; ok(near(mul(z, c1(z)).re, v('P2').check.zzbar) && v('P2').check.zzbar === 13 && near(v('P2').check.abs, Math.hypot(z.re, z.im)), 'P2');
  const p3 = v('P3').check; const a = p3.a, b = p3.b, cc = p3.c, d = p3.d;
  const coeff = mul(a, cc); const shift = { re: mul(a, d).re + b.re, im: mul(a, d).im + b.im };
  ok(nearC(coeff, p3.coeff) && nearC(shift, p3.shift) && nearC(coeff, { re: -1, im: 1 }) && nearC(shift, { re: 0, im: -1 }), 'P3 coefficient and shift');
  for (let i = 0; i < 10; i++) { const zz = { re: Math.random() * 4 - 2, im: Math.random() * 4 - 2 }; const lhs = (() => { const t = mul(cc, zz); const u = { re: t.re + d.re, im: t.im + d.im }; const w2 = mul(a, u); return { re: w2.re + b.re, im: w2.im + b.im }; })(); const rhs = (() => { const t = mul(coeff, zz); return { re: t.re + shift.re, im: t.im + shift.im }; })(); ok(nearC(lhs, rhs), 'P3 composition identity'); }
  ok(near(v('P4').radius, S2) && nearC(v('P4').factor, { re: 1, im: 1 }) && near(v('P4').factorAbs, Math.hypot(1, 1)) && near(v('P4').factorArg, Math.atan2(1, 1)), 'P4');
  ok(nearC(v('P5').alongRealAxis, { re: 1, im: 0 }) && nearC(v('P5').alongImagAxis, { re: 0, im: 0 }) && v('P5').exists === false, 'P5');
  ok(nearC(v('P6').A, { re: 0.5, im: 0 }) && nearC(v('P6').B, { re: 0.5, im: 0 }) && v('P6').differentiable === false, 'P6');
  ok(nearC(v('P7').fprime, { re: 0, im: 0 }) && v('P7').constant === true, 'P7');
}
// no -0 / NaN anywhere in values
(function walk(o, p) { if (typeof o === 'number') { ok(Number.isFinite(o) && !Object.is(o, -0), `value ${p} finite and not -0`); } else if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], p + '.' + k); })(P.PROBLEMS.map((q) => q.answer.values), 'values');

// ---------------------------------------------------------------- A3
const ARCH_SRC = { sq: 'z^2', cube: 'z^3', recip: '1/z', 'linear-i': 'iz - 2i', 'linear-1i': '(1+i)z', 'sq-plus-iz': 'z^2 + iz', 'sq-plus-z': 'z^2 + z', exp: 'exp(z)', conj: 'conj(z)', re: 'Re(z)', abs2: 'abs(z)^2', dir: 'z^2/abs(z)^2', sqrt: 'sqrt(z)', cbrt: 'z^(1/3)', 'x-over-z': '(Re(1+z) - 1)/z' };
ok(F.FUNCTIONS.length === 15, '15 functions');
ok(JSON.stringify(F.FUNCTIONS.map((f) => f.id).sort()) === JSON.stringify(Object.keys(ARCH_SRC).sort()), 'function ids exact');
const ws = (s) => s.replace(/\s+/g, '');
for (const f of F.FUNCTIONS) {
  ok(ws(f.src) === ws(ARCH_SRC[f.id]), `${f.id} src ${f.src} vs ARCH ${ARCH_SRC[f.id]}`);
  const nonAn = ['conj', 're', 'abs2', 'dir', 'x-over-z'].includes(f.id);
  ok(f.analytic === !nonAn, `${f.id} analytic ${f.analytic}`);
  const hasPole = ['recip', 'dir', 'x-over-z'].includes(f.id);
  ok(hasPole ? (f.poles.length === 1 && f.poles[0].re === 0 && f.poles[0].im === 0) : f.poles.length === 0, `${f.id} poles`);
  ok(typeof f.label === 'string' && typeof f.tex === 'string' && typeof f.note === 'string' && f.note.length > 10, `${f.id} text fields`);
  ok(Array.isArray(f.problems) && Array.isArray(f.stations) && f.stations.length >= 1, `${f.id} arrays`);
  for (const pid of f.problems) ok(!!P.problemById(pid), `${f.id} problem ${pid} exists`);
  for (const sid of f.stations) ok(R.STATIONS.some((s) => s.id === sid), `${f.id} station ${sid} exists`);
  ok((f.analytic) === (f.derivativeTex !== null), `${f.id} derivativeTex iff analytic`);
  ok(Object.isFrozen(f), `${f.id} frozen`);
}
ok(F.fnById('recip').problems.includes('2.5.1'), 'recip includes 2.5.1');
ok(F.fnById('sq').cart.u === 'x^2 - y^2' && F.fnById('sq').cart.v === '2xy', 'sq.cart');
ok(F.fnById('nope') === null && F.fnById('constructor') === null && F.fnById('toString') === null, 'fnById unknown/proto null');
ok(P.problemById('constructor') === null && P.problemById('__proto__') === null, 'problemById proto null');

// Independent reference functions and hand-transcribed cart/polar/derivative forms (from the TeX strings, read by me)
const cx = (re, im) => ({ re, im });
const REF = {
  sq: { f: (z) => mul(z, z), cart: (x, y) => cx(x * x - y * y, 2 * x * y), polar: (r, t) => cx(r * r * Math.cos(2 * t), r * r * Math.sin(2 * t)), d: (z) => mul(cx(2, 0), z) },
  cube: { f: (z) => powz(z, 3), cart: (x, y) => cx(x ** 3 - 3 * x * y * y, 3 * x * x * y - y ** 3), polar: (r, t) => cx(r ** 3 * Math.cos(3 * t), r ** 3 * Math.sin(3 * t)), d: (z) => mul(cx(3, 0), mul(z, z)) },
  recip: { f: (z) => div(cx(1, 0), z), cart: (x, y) => cx(x / (x * x + y * y), -y / (x * x + y * y)), polar: (r, t) => cx(Math.cos(t) / r, -Math.sin(t) / r), d: (z) => { const q = mul(z, z); const i = div(cx(1, 0), q); return cx(-i.re, -i.im); } },
  'linear-i': { f: (z) => cx(-z.im, z.re - 2), cart: (x, y) => cx(-y, x - 2), polar: (r, t) => cx(-r * Math.sin(t), r * Math.cos(t) - 2), d: () => cx(0, 1) },
  'linear-1i': { f: (z) => mul(cx(1, 1), z), cart: (x, y) => cx(x - y, x + y), polar: (r, t) => cx(S2 * r * Math.cos(t + PI / 4), S2 * r * Math.sin(t + PI / 4)), d: () => cx(1, 1) },
  'sq-plus-iz': { f: (z) => { const s = mul(z, z); return cx(s.re - z.im, s.im + z.re); }, cart: (x, y) => cx(x * x - y * y - y, 2 * x * y + x), polar: (r, t) => cx(r * r * Math.cos(2 * t) - r * Math.sin(t), r * r * Math.sin(2 * t) + r * Math.cos(t)), d: (z) => cx(2 * z.re, 2 * z.im + 1) },
  'sq-plus-z': { f: (z) => { const s = mul(z, z); return cx(s.re + z.re, s.im + z.im); }, cart: (x, y) => cx(x * x - y * y + x, 2 * x * y + y), polar: (r, t) => cx(r * r * Math.cos(2 * t) + r * Math.cos(t), r * r * Math.sin(2 * t) + r * Math.sin(t)), d: (z) => cx(2 * z.re + 1, 2 * z.im) },
  exp: { f: (z) => cx(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im)), cart: (x, y) => cx(Math.exp(x) * Math.cos(y), Math.exp(x) * Math.sin(y)), polar: (r, t) => cx(Math.exp(r * Math.cos(t)) * Math.cos(r * Math.sin(t)), Math.exp(r * Math.cos(t)) * Math.sin(r * Math.sin(t))), d: (z) => cx(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im)) },
  conj: { f: (z) => cx(z.re, -z.im), cart: (x, y) => cx(x, -y), polar: (r, t) => cx(r * Math.cos(t), -r * Math.sin(t)), d: null },
  re: { f: (z) => cx(z.re, 0), cart: (x) => cx(x, 0), polar: (r, t) => cx(r * Math.cos(t), 0), d: null },
  abs2: { f: (z) => cx(z.re * z.re + z.im * z.im, 0), cart: (x, y) => cx(x * x + y * y, 0), polar: (r) => cx(r * r, 0), d: null },
  dir: { f: (z) => { const d = z.re * z.re + z.im * z.im; const s = mul(z, z); return cx(s.re / d, s.im / d); }, cart: (x, y) => cx((x * x - y * y) / (x * x + y * y), 2 * x * y / (x * x + y * y)), polar: (r, t) => cx(Math.cos(2 * t), Math.sin(2 * t)), d: null },
  sqrt: { f: (z) => { const r = Math.hypot(z.re, z.im), t = Math.atan2(z.im, z.re); return cx(Math.sqrt(r) * Math.cos(t / 2), Math.sqrt(r) * Math.sin(t / 2)); }, cart: null, polar: (r, t) => cx(Math.sqrt(r) * Math.cos(t / 2), Math.sqrt(r) * Math.sin(t / 2)), d: (z) => { const r = Math.hypot(z.re, z.im), t = Math.atan2(z.im, z.re); const s = cx(Math.sqrt(r) * Math.cos(t / 2), Math.sin(t / 2) * Math.sqrt(r)); const q = div(cx(1, 0), mul(cx(2, 0), s)); return q; } },
  cbrt: { f: (z) => { const r = Math.hypot(z.re, z.im), t = Math.atan2(z.im, z.re); return cx(Math.cbrt(r) * Math.cos(t / 3), Math.cbrt(r) * Math.sin(t / 3)); }, cart: null, polar: (r, t) => cx(Math.cbrt(r) * Math.cos(t / 3), Math.cbrt(r) * Math.sin(t / 3)), d: (z) => { const r = Math.hypot(z.re, z.im), t = Math.atan2(z.im, z.re); /* (1/3) z^(-2/3) = (1/3) r^(-2/3) e^{-2it/3} */ return cx(Math.pow(r, -2 / 3) * Math.cos(-2 * t / 3) / 3, Math.pow(r, -2 / 3) * Math.sin(-2 * t / 3) / 3); } },
  'x-over-z': { f: (z) => div(cx(z.re, 0), z), cart: (x, y) => cx(x * x / (x * x + y * y), -x * y / (x * x + y * y)), polar: (r, t) => cx(Math.cos(t) ** 2, -Math.cos(t) * Math.sin(t)), d: null },
};
// Compile with the real parse.js and compare to reference
const parse = await import(pathToFileURL(path.join(ROOT, 'js/core/parse.js')).href);
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
for (const f of F.FUNCTIONS) {
  const ref = REF[f.id];
  let compiled = null; try { compiled = parse.compile(f.src); } catch (e) { ok(false, `${f.id} src does not compile: ${e.message}`); }
  for (let i = 0; i < 30; i++) {
    const x = rnd() * 6 - 3, y = rnd() * 6 - 3; if (Math.hypot(x, y) < 0.2) continue;
    const z = cx(x, y); const r = Math.hypot(x, y), t = Math.atan2(y, x);
    const want = ref.f(z);
    if (compiled) { const got = compiled.f(z); ok(nearC(got, want, 1e-9), `${f.id} parse.js(src) vs reference at ${x.toFixed(2)},${y.toFixed(2)}`); }
    if (ref.cart) ok(nearC(ref.cart(x, y), want, 1e-9), `${f.id} cart formulas`);
    else ok(f.cart === null, `${f.id} cart null`);
    ok(nearC(ref.polar(r, t), want, 1e-9), `${f.id} polar formulas`);
    if (ref.d) { const h = 1e-6; const num = div({ re: ref.f(cx(x + h, y)).re - want.re, im: ref.f(cx(x + h, y)).im - want.im }, cx(h, 0)); ok(nearC(ref.d(z), num, 1e-4 * Math.max(1, Math.hypot(num.re, num.im))), `${f.id} derivative form vs finite difference`); }
  }
  // cart TeX presence
  if (ref.cart) ok(f.cart && typeof f.cart.u === 'string' && typeof f.cart.v === 'string', `${f.id} cart strings`);
  ok(f.polar && typeof f.polar.u === 'string' && typeof f.polar.v === 'string', `${f.id} polar strings`);
}
// analytic flags vs Cauchy-Riemann numerically (off the cut / pole), an independent semantic check
for (const f of F.FUNCTIONS) {
  const ref = REF[f.id]; const z = cx(0.9, 1.3); const h = 1e-6;
  const fx = (a) => ref.f(a);
  const ux = (fx(cx(z.re + h, z.im)).re - fx(cx(z.re - h, z.im)).re) / (2 * h);
  const vy = (fx(cx(z.re, z.im + h)).im - fx(cx(z.re, z.im - h)).im) / (2 * h);
  const uy = (fx(cx(z.re, z.im + h)).re - fx(cx(z.re, z.im - h)).re) / (2 * h);
  const vx = (fx(cx(z.re + h, z.im)).im - fx(cx(z.re - h, z.im)).im) / (2 * h);
  const cr = near(ux, vy, 1e-4) && near(uy, -vx, 1e-4);
  ok(cr === f.analytic, `${f.id} CR numerically ${cr} agrees with analytic flag ${f.analytic}`);
}

// ---------------------------------------------------------------- A4 (static)
const src = { prob: fs.readFileSync(path.join(ROOT, 'js/data/problems.js'), 'utf8'), fn: fs.readFileSync(path.join(ROOT, 'js/data/functions.js'), 'utf8') };
for (const [k, s] of Object.entries(src)) {
  const code = s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    .replace(/String\.raw`(?:[^`\\]|\\.)*`/g, '``').replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  ok(!/^\s*import\s/m.test(code) && !/\bimport\s*\(/.test(code) && !/\brequire\s*\(/.test(code), `${k}: no imports`);
  ok(!/\b(document|globalThis|localStorage|navigator|fetch|XMLHttpRequest|alert|confirm|prompt)\b/.test(code) && !/\bwindow\b(?!\s*:)/.test(code), `${k}: no document/window/etc. in code (strings and comments stripped)`);
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(code) && !/\b(rgb|hsl)a?\(/.test(code), `${k}: no literal colours`);
  ok(!/Math\.random|Date\.now|new Date/.test(code), `${k}: deterministic`);
  ok(/^export /m.test(code), `${k}: has exports`);
}
// Statements verbatim against ASSIGNMENT section 2 (parse the md, normalise)
const md = fs.readFileSync(path.join(ROOT, 'docs/ASSIGNMENT.md'), 'utf8');
const sec2 = md.slice(md.indexOf('## 2. Test 1 review problems'), md.indexOf('## 3. Test 1 topics'));
const handout = {};
for (const line of sec2.split('\n')) { const m = line.match(/^- (\d\.\d\.\d|P\d)\s+(.*)$/); if (m) handout[m[1]] = m[2]; }
// 1.5.2 continues on the next line
handout['1.5.2'] += ' ' + sec2.split('\n').find((l) => l.startsWith('  What are the boundary')).trim();
ok(Object.keys(handout).length === 29, 'parsed 29 handout statements, got ' + Object.keys(handout).length);
const SUP = { '²': '^2', '³': '^3', '⁴': '^4' };
const norm = (s) => s.replace(/[²³⁴]/g, (m) => SUP[m]).replace(/[()]/g, '')
  .replace(/\\operatorname\{Re\}/g, 'Re').replace(/\\operatorname\{Im\}/g, 'Im').replace(/\\operatorname\{Arg\}/g, 'Arg')
  .replace(/\\overline\{([^}]*)\}/g, 'conj($1)').replace(/\\big|\\left|\\right/g, '')
  .replace(/\\dfrac|\\frac/g, 'frac').replace(/\\sqrt\{([^}]*)\}/g, '√$1').replace(/\\mathbb\{C\}/g, 'ℂ')
  .replace(/\\lim_\{z\\to 0\}/g, 'lim_{z→0}').replace(/\\to/g, '→').replace(/\\in/g, '∈').replace(/\\le\b/g, '≤')
  .replace(/\\cos/g, 'cos').replace(/\\sin/g, 'sin').replace(/\\pi/g, 'π').replace(/\\theta/g, 'θ').replace(/\\cdot/g, '·')
  .replace(/\\arg/g, 'arg').replace(/\\/g, '').replace(/[{}$]/g, '').replace(/_(\d)/g, (m, d) => '₀₁₂₃₄₅₆₇₈₉'[d])
  .replace(/−/g, '-').replace(/[\s ]+/g, '').replace(/\*/g, '').replace(/√\(?2\)?/g, '√2').replace(/√\(?3\)?/g, '√3')
  .replace(/′/g, "'").replace(/ℂ/g, 'C').replace(/z₁/g, 'z1').replace(/z₂/g, 'z2').replace(/_1/g, '1').replace(/_2/g, '2')
  .replace(/frac/g, '').replace(/lim_z→0/g, 'limz→0');
for (const p of P.PROBLEMS) {
  const a = norm(p.statement), b = norm(handout[p.id]);
  if (a !== b) { console.log(`STATEMENT DIFF ${p.id}\n  data:    ${a}\n  handout: ${b}`); }
}

// KaTeX rendering of every TeX string using the vendored build
import vm from 'node:vm';
const kctx = { self: {}, console };
kctx.self = kctx; vm.createContext(kctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'vendor/katex/katex.min.js'), 'utf8'), kctx);
const katex = kctx.katex;
ok(!!katex && typeof katex.renderToString === 'function', 'vendored katex loads');
let rendered = 0;
const tryR = (label, s) => { try { katex.renderToString(s, { throwOnError: true, strict: 'error' }); rendered++; } catch (e) { ok(false, `${label}: ${e.message}`); } };
for (const p of P.PROBLEMS) { for (const part of P.statementParts(p.statement)) if (part.math) tryR(p.id + ' stmt', part.text); tryR(p.id + ' answer.tex', p.answer.tex); }
for (const f of F.FUNCTIONS) { tryR(f.id + ' tex', f.tex); for (const s of [f.cart?.u, f.cart?.v, f.polar?.u, f.polar?.v, f.derivativeTex]) if (s) tryR(f.id + ' formula', s); }
console.log(`KaTeX rendered ${rendered} strings`);

// frozen / purity
ok(Object.isFrozen(P.PROBLEMS) && Object.isFrozen(P.TOPICS) && Object.isFrozen(F.FUNCTIONS), 'exports frozen');
ok(P.problemsForStation('problems').length === 29 && P.problemsForStation('home').length === 0, 'problemsForStation index/home');
const a1 = P.problemsForStation('roots'); a1.push(1); ok(P.problemsForStation('roots').length === 3, 'problemsForStation returns fresh array');
ok(P.addressLabel('constructor') === '' && P.addressTones('toString').length === 0 && P.addressTones('C->P->C').join() === '--cart,--polar,--cart', 'address helpers');
console.log(`${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
