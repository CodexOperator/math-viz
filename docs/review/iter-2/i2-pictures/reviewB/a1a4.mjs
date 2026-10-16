// Review B: A1 and A4 as the spec words them, written independently (throwaway).
import assert from 'node:assert/strict';
const T = await import('../../../../../js/core/three-view.js');
const AR = await import('../../../../../js/stations/arithmetic.js');
const { THREE, argHelix, helixPoint, fromScene, HELIX_PITCH } = T;
const near = (a, b, e, m = '') => assert.ok(Math.abs(a - b) <= e, `${m} expected ${b} got ${a}`);
let n = 0; const ok = (m) => { n++; console.log('ok', m); };

// ---- A1 ----
const h = argHelix({ z: { re: 1, im: 1 }, turns: 2 });
const u = h.group.userData;
assert.ok(u.ribbon instanceof THREE.Mesh); ok('ribbon is a THREE.Mesh');
assert.equal(u.fibre, undefined); ok('fibre undefined');
assert.ok(u.riser); ok('riser exists');
assert.equal(u.beads.length, 5);
const r = Math.SQRT2;
for (let k = -2; k <= 2; k++) {
  const b = u.beads[k + 2];
  const p = fromScene([b.position.x, b.position.y, b.position.z]);
  const want = helixPoint(r, Math.PI / 4 + 2 * Math.PI * k);
  for (let i = 0; i < 3; i++) near(p[i], want[i], 1e-6, `bead ${k} coord ${i}`);
}
ok('beads k=-2..2 within 1e-6 of helixPoint(sqrt2, pi/4+2pi k)');
h.update({ re: -1, im: 0 });
{
  const b = u.beads[2];
  const p = fromScene([b.position.x, b.position.y, b.position.z]);
  const want = helixPoint(1, Math.PI);
  for (let i = 0; i < 3; i++) near(p[i], want[i], 1e-6, `after update bead0 coord ${i}`);
}
ok('after update(-1): k=0 bead at helixPoint(1, pi)');
near(helixPoint(1, 2 * Math.PI)[2], HELIX_PITCH, 1e-12, 'pitch'); ok('helixPoint(1,2pi)[2] = HELIX_PITCH');
{
  const rp = fromScene([u.riser.position.x, u.riser.position.y, u.riser.position.z]);
  console.log('riser position (maths frame)', rp);
  // "the riser's position angle equals the seam (-pi by default: its x is negative, |y| < 1e-9)"
  // The riser may be a group at origin with a child; compute world position of the riser's bounding centre
  u.riser.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(u.riser);
  const c = new THREE.Vector3(); box.getCenter(c);
  const cm = fromScene([c.x, c.y, c.z]);
  console.log('riser bbox centre (maths frame)', cm, 'type', u.riser.type);
  assert.ok(cm[0] < 0, 'x negative'); assert.ok(Math.abs(cm[1]) < 1e-9, '|y|<1e-9');
}
ok('riser at seam -pi: x negative, |y|<1e-9');
// ribbon: all vertex angles / counts
const vc = u.ribbon.geometry.attributes.position.count;
console.log('ribbon vertex count (turns 2):', vc, 'budget 2*48*(2*2+1)+2 =', 2 * 48 * 5 + 2);
assert.ok(vc <= 2 * 48 * 5 + 2); ok('A7 vertex budget');
// the seam argument at other seams: beads inside ribbon y range
for (const seam of [-Math.PI, 0, Math.PI / 2, -Math.PI / 2]) {
  const hh = argHelix({ z: { re: 2, im: -1.5 }, turns: 2, seam });
  hh.update({ re: 2, im: -1.5 }, seam);
  const ys = hh.group.userData.ribbon.geometry.attributes.position.array;
  let lo = Infinity, hi = -Infinity; for (let i = 1; i < ys.length; i += 3) { lo = Math.min(lo, ys[i]); hi = Math.max(hi, ys[i]); }
  for (const b of hh.group.userData.beads) { assert.ok(b.position.y >= lo - 1e-6 && b.position.y <= hi + 1e-6, `seam ${seam} bead y ${b.position.y} outside [${lo},${hi}]`); }
}
ok('beads inside ribbon y-range at 4 seams');

// ---- A4 ----
const z1 = { re: 3, im: -2 }, z2 = { re: -1, im: 4 };
let p = AR.rulerPlan(z1, z2, 'mul');
near(p.result, Math.sqrt(221), 1e-9); ok('mul result sqrt221');
console.log('mul plan', JSON.stringify(p));
const lo = Math.min(Math.hypot(3, 2), Math.hypot(1, 4), p.result) / 2, hi = 2 * Math.max(Math.hypot(3, 2), Math.hypot(1, 4), p.result);
console.log('coverage', lo, hi);
assert.ok(p.rings.length > 0 && p.rings[0] <= lo && p.rings[p.rings.length - 1] >= hi, 'rings cover [lo,hi]');
// powers of 2 or 10
assert.ok(p.rings.every((x) => Number.isInteger(Math.log2(x))) || p.rings.every((x) => Number.isInteger(Math.log10(x)))); ok('rings powers of 2 or 10');
assert.ok(p.marks.length > 0 && p.marks.every((m) => typeof m.label === 'string' && m.label.length > 0 && typeof m.r === 'number')); ok('marks have labels');
const d = AR.rulerPlan(z1, z2, 'div');
near(d.result, Math.sqrt(13 / 17), 1e-9); ok('div result sqrt(13/17)');
console.log('div plan', JSON.stringify(d));
const d0 = AR.rulerPlan(z1, { re: 0, im: 0 }, 'div');
assert.ok(Number.isNaN(d0.result)); assert.deepEqual(d0.marks, []); ok('div by 0: NaN and marks []');
const d0b = AR.rulerPlan(z1, 0, 'div'); // spec literally says rulerPlan(z1, 0, 'div')
console.log('rulerPlan(z1, 0, div) literal ->', JSON.stringify(d0b));
assert.ok(Number.isNaN(d0b.result)); assert.deepEqual(d0b.marks, []); ok('div by literal 0: NaN and marks []');
// fit helper
const S = (mode) => ({ mode, z1, z2, conjResult: false });
const res = AR.applyMode('mul', z1, z2, {}).result;
const fitMul = AR.fitPoints({ mode: 'mul', z1, z2, conjResult: false });
const fitAdd = AR.fitPoints({ mode: 'add', z1, z2, conjResult: false });
console.log('fit mul', JSON.stringify(fitMul), 'fit add', JSON.stringify(fitAdd));
const has = (pts, q) => pts.some((a) => Math.abs(a.re - q.re) < 1e-9 && Math.abs(a.im - q.im) < 1e-9);
assert.ok(!has(fitMul, res)); ok('fit mul excludes result');
assert.ok(has(fitAdd, AR.applyMode('add', z1, z2, {}).result)); ok('fit add includes result');
const fitDiv = AR.fitPoints({ mode: 'div', z1, z2, conjResult: false });
assert.ok(!has(fitDiv, AR.applyMode('div', z1, z2, {}).result)); ok('fit div excludes result');
console.log('all', n, 'checks passed');
