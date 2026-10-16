// Unit tests for goal i2-pictures (docs/designs/iter-2/i2-pictures.md section 7, A1 and A4, plus the pure parts of the staircase and 4D stations).
// Node only: no document, no WebGL. Expected values are the ones the design worked by hand and checked a second way.
//   A1  the helix is one ribbon with the beads on it (three-view.js argHelix, helixPoint)
//   A4  the ruler plan, the fit plan, exitPoint and the values presets (arithmetic.js), the staircase values preset, the five shadows (graph4d.js)
//   A7  resources: vertex counts, canvas size, no literal colours in the three stations

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

assert.equal(typeof document, 'undefined', 'this file must run without a DOM');
const T = await import('../../js/core/three-view.js');
const AR = await import('../../js/stations/arithmetic.js');
const ST = await import('../../js/stations/staircase.js');
const G4 = await import('../../js/stations/graph4d.js');
const { internals } = await import('../../js/core/plane.js');
const { THREE, argHelix, helixPoint, fromScene, HELIX_PITCH } = T;

const near = (a, b, eps = 1e-12, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a} (eps ${eps})`);
const nearVec = (a, b, eps = 1e-12, msg = '') => {
  assert.equal(a.length, b.length, `${msg} length`);
  a.forEach((v, i) => near(v, b[i], eps, `${msg}[${i}]`));
};
const C = (re, im = 0) => ({ re, im });
const PI = Math.PI;
const src = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const vtx = (mesh, k) => { const p = mesh.geometry.attributes.position.array; return [p[3 * k], p[3 * k + 1], p[3 * k + 2]]; };
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const vcol = (mesh, k) => { const c = mesh.geometry.attributes.color.array; return [c[3 * k], c[3 * k + 1], c[3 * k + 2]].map(linearToSrgb); };

// ================================================================================================
// A1: the helix is a ribbon with the beads on it
// ================================================================================================

test('A1.1 the helix has a ribbon, a riser and a floor, and no fibre', () => {
  const h = argHelix({ z: C(1, 1), turns: 2 });
  const u = h.group.userData;
  assert.equal(u.ribbon.isMesh, true);
  assert.equal(u.ribbon.name, 'helix-ribbon');
  assert.equal(u.fibre, undefined, 'the dashed fibre is gone: the beads ride the ribbon');
  assert.equal(u.riser.isMesh, true);
  assert.equal(u.riser.name, 'helix-riser');
  assert.equal(u.riser.children.length, 1, 'the riser has its outline');
  assert.equal(u.riser.children[0].isLineLoop, true);
  assert.equal(u.ghostSheet, u.ribbon, 'ghostSheet is the ribbon (the iteration-1 pins keep working)');
  assert.equal(u.homeSheet.isMesh, true);
  assert.equal(u.homeSheet.name, 'helix-home');
  assert.ok(u.floor, 'the faint polar floor');
  assert.equal(u.floor.name, 'helix-floor');
  assert.equal(u.beads.length, 5);
  assert.equal(h.group.getObjectByName('helix-fibre'), undefined);
});

test('A1.2 each bead rides the ribbon at the radius of z: fromScene(bead_k) = helixPoint(|z|, Arg z + 2 pi k)', () => {
  const h = argHelix({ z: C(1, 1), turns: 2 });
  const u = h.group.userData;
  for (let k = -2; k <= 2; k++) {
    const p = fromScene(u.beads[k + 2].position.toArray());
    nearVec(p, helixPoint(Math.SQRT2, PI / 4 + 2 * PI * k), 1e-6, `bead ${k}`);
    nearVec(p, [1, 1, 0.15 + 1.2 * k], 1e-6, `bead ${k} (design value)`);
  }
  near(u.ribbonRadius, Math.SQRT2, 1e-12);
  const z131 = argHelix({ z: C(-1, Math.sqrt(3)) });
  nearVec(z131.group.userData.beads.map((b) => b.position.y), [-2.0, -0.8, 0.4, 1.6, 2.8], 1e-6, '1.3.1 bead heights');
  near(z131.group.userData.ribbonRadius, 2, 1e-12);
});

test('A1.3 z = -1 sits at the top of the window: bead 0 at helixPoint(1, pi), heights 0.6 + 1.2k', () => {
  const h = argHelix({ z: C(1, 1), turns: 2 });
  const u = h.group.userData;
  h.update(C(-1, 0));
  nearVec(fromScene(u.beads[2].position.toArray()), helixPoint(1, PI), 1e-6);
  nearVec(fromScene(u.beads[2].position.toArray()), [-1, 1.2e-16, 0.6], 1e-6);
  nearVec(u.beads.map((b) => b.position.y), [-1.8, -0.6, 0.6, 1.8, 3.0], 1e-6);
  near(u.ribbonRadius, 1, 1e-12);
});

test('A1.4 helixPoint: one full turn adds the pitch', () => {
  near(Math.abs(helixPoint(1, 2 * PI)[2] - HELIX_PITCH), 0, 1e-12);
  near(helixPoint(1, 2 * PI)[2], 1.2, 1e-12);
  nearVec(helixPoint(2, 0), [2, 0, 0], 1e-12);
  const q = helixPoint(1, PI / 2);
  near(q[0], 0, 1e-12); near(q[1], 1, 1e-12); near(q[2], 0.3, 1e-12);
  assert.equal(helixPoint.length, 2, 'the pitch is a default parameter');
  nearVec(helixPoint(3, PI, 2), [-3, 3 * Math.sin(PI), 1], 1e-12, 'a pitch of 2');
});

test('A1.5 the riser stands at the seam, one winding tall', () => {
  const h = argHelix({ z: C(1, 1), turns: 2 });
  const u = h.group.userData;
  h.update(C(-1, 0));
  const p = fromScene(u.riser.position.toArray());
  assert.ok(p[0] < 0, 'x is negative: the seam is the negative real axis');
  assert.ok(Math.abs(p[1]) < 1e-9, '|y| < 1e-9');
  near(p[2], 0, 1e-9, 'centre height for seam -pi (foot -0.6, top 0.6)');
  assert.equal(u.riser.rotation.y, -PI);
  h.update(C(1, 1), PI / 2);
  const q = fromScene(u.riser.position.toArray());
  near(q[0], 0, 1e-9); near(q[1], Math.SQRT2, 1e-9); near(q[2], 0.9, 1e-9);
  assert.equal(u.riser.rotation.y, PI / 2);
  assert.equal(u.seam, PI / 2);
  // the wall is a pitch tall (height -0.6 .. 0.6 about its centre) and as wide as the home strip
  const g = u.riser.geometry.attributes.position;
  const ys = Array.from(g.array).filter((_, i) => i % 3 === 1);
  near(Math.max(...ys) - Math.min(...ys), HELIX_PITCH, 1e-6);
  near(u.riser.scale.x, Math.min(0.35, 0.8 * Math.SQRT2), 1e-12);
});

test('A1.6 counts: 2 * 48 * (2 * turns + 1) + 2 ribbon vertices, a 98-vertex home strip, 792 floor vertices', () => {
  const u = argHelix({ z: C(1, 1), turns: 2 }).group.userData;
  assert.equal(u.ribbon.geometry.attributes.position.count, 482);
  assert.equal(u.ribbon.geometry.attributes.color.count, 482);
  assert.equal(u.ribbon.geometry.index.count, 1440);
  assert.equal(u.homeSheet.geometry.attributes.position.count, 98);
  assert.equal(u.homeSheet.geometry.index.count, 288);
  assert.equal(u.floor.geometry.attributes.position.count, 792);
  const u3 = argHelix({ z: C(1, 1), turns: 3 }).group.userData;
  assert.equal(u3.ribbon.geometry.attributes.position.count, 2 * 48 * 7 + 2);
  assert.equal(u3.ribbon.geometry.attributes.position.count, 674);
  assert.equal(argHelix({ turns: 8 }).group.userData.ribbon.geometry.attributes.position.count, 2 * 48 * 17 + 2);
});

test('A1.7 the ribbon lies on the helix: the middle of every vertex pair is helixPoint(|z|, phi) and the strip is thin', () => {
  const h = argHelix({ z: C(1, 1), turns: 2 });
  const u = h.group.userData;
  const r = Math.SQRT2;
  for (let j = 0; j <= 240; j++) {
    const a = fromScene(vtx(u.ribbon, 2 * j)), b = fromScene(vtx(u.ribbon, 2 * j + 1));
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    nearVec(mid, helixPoint(r, -5 * PI + j * 2 * PI / 48), 1e-5, `sample ${j}`);
  }
  const n = u.ribbon.geometry.attributes.position.count;
  for (let k = 0; k < n; k++) {
    const p = vtx(u.ribbon, k);
    const rad = Math.hypot(p[0], p[2]);
    assert.ok(rad >= r - 0.28 - 1e-5 && rad <= r + 0.28 + 1e-5, `vertex ${k} radius ${rad}`);
  }
  // the half-width is min(0.28, 0.6 r): a small |z| gives a narrower strip that never crosses the axis
  const small = argHelix({ z: C(0.2, 0) }).group.userData.ribbon;
  const rad = (k) => Math.hypot(vtx(small, k)[0], vtx(small, k)[2]);
  near(rad(1) - rad(0), 2 * 0.6 * 0.2, 1e-5);
  const big = argHelix({ z: C(2, 0) }).group.userData.ribbon;
  near(Math.hypot(vtx(big, 1)[0], vtx(big, 1)[2]) - Math.hypot(vtx(big, 0)[0], vtx(big, 0)[2]), 0.56, 1e-5);
});

test('A1.8 the iteration-1 y pins still hold: home strip and ribbon heights', () => {
  const h = argHelix({ z: C(1, 1), turns: 3, seam: -PI });
  const home = h.group.userData.homeSheet.geometry.attributes.position;
  const ys = () => Array.from(home.array).filter((_, i) => i % 3 === 1);
  near(Math.min(...ys()), -0.6, 1e-6); near(Math.max(...ys()), 0.6, 1e-6);
  h.update(C(1, 1), 0);
  assert.equal(h.group.userData.homeSheet.geometry.attributes.position, home, 'same attribute instance');
  near(Math.min(...ys()), 0, 1e-6); near(Math.max(...ys()), HELIX_PITCH, 1e-6);
  const gy = Array.from(h.group.userData.ghostSheet.geometry.attributes.position.array).filter((_, i) => i % 3 === 1);
  near(Math.max(...gy), HELIX_PITCH * 3.5, 1e-5);
  near(Math.min(...gy), -HELIX_PITCH * 3.5, 1e-5);
});

test('A1.9 hidden cases: a non-finite z hides everything but the point it cannot place; z = 0 keeps the floor point', () => {
  const h = argHelix({ z: C(1, 1), turns: 2 });
  const u = h.group.userData;
  h.update(C(NaN, 0));
  for (const o of [...u.beads, u.ribbon, u.riser, u.homeSheet, u.floorPoint]) assert.equal(o.visible, false, o.name);
  h.update(C(0, 0));
  for (const o of [...u.beads, u.ribbon, u.riser, u.homeSheet]) assert.equal(o.visible, false, o.name);
  assert.equal(u.floorPoint.visible, true, 'the floor point stays at 0');
  nearVec(u.beads.map((b) => b.position.y), [-2.4, -1.2, 0, 1.2, 2.4], 1e-6, 'bead heights at the origin (seam -pi)');
  near(u.ribbonRadius, Math.SQRT2, 1e-12, 'the last defined radius is kept');
  h.update(C(1, 1));
  for (const o of [...u.beads, u.ribbon, u.riser, u.homeSheet, u.floorPoint]) assert.equal(o.visible, true, o.name);
  h.update(C(0, 0), 0);                                                      // a seam change while z is undefined still moves the geometry
  assert.equal(u.seam, 0);
  assert.equal(u.riser.rotation.y, 0);
});

test('A1.10 update notifies the views exactly once', () => {
  const h = argHelix({});
  let hc = 0;
  h.group.userData.__render = new Set([() => hc++]);
  h.update(C(1, 1));
  assert.equal(hc, 1);
  h.update(C(1, 1), PI / 3);
  assert.equal(hc, 2);
});

// the contrast of two display sRGB triples (0..1)
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const mix = (a, b, k) => a.map((v, i) => v * (1 - k) + b[i] * k);

test('A1.11 colour: the dim ghost windings clear 3:1 against the surface in both themes, with the real tokens and with the Node fallback', () => {
  const css = src('css/theme.css');
  const block = (re) => { const m = re.exec(css); assert.ok(m, String(re)); return m[1]; };
  const tok = (b, name) => hex(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(b)[1]);
  const light = block(/:root \{([\s\S]*?)\n\}/);
  const dark = block(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/);
  for (const [name, b, want] of [['light', light, 3.36], ['dark', dark, 4.68]]) {
    const ghostIn = mix(tok(b, '--polar'), tok(b, '--surface'), 0.30);
    const c = contrast(ghostIn, tok(b, '--surface'));
    assert.ok(c >= 3.0, `${name}: ghost inner edge ${c.toFixed(2)}:1 against the surface`);
    near(c, want, 0.02, `${name} contrast`);
    const homeIn = contrast(tok(b, '--polar'), tok(b, '--surface'));
    assert.ok(homeIn >= 6, `${name}: the home strip ${homeIn.toFixed(2)}:1`);
    assert.ok(homeIn > c, 'the home winding is brighter than the ghost ones');
  }
  // the vertex colours the module writes (Node has no DOM: the light fallback tokens): inner = polar mixed 30 percent toward the surface, outer = 25 percent toward the text
  const polar = hex('#c2410c'), surf = hex('#ffffff'), text = hex('#111827');
  const u = argHelix({ z: C(1, 1) }).group.userData;
  nearVec(vcol(u.ribbon, 0), mix(polar, surf, 0.30), 1e-5, 'ribbon inner');
  nearVec(vcol(u.ribbon, 1), mix(polar, text, 0.25), 1e-5, 'ribbon outer');
  nearVec(vcol(u.homeSheet, 0), polar, 1e-5, 'home inner');
  nearVec(vcol(u.homeSheet, 1), mix(polar, text, 0.45), 1e-5, 'home outer');
  assert.ok(contrast(mix(polar, surf, 0.30), surf) >= 3.0, 'fallback ghost edge >= 3:1');
  // materials: the ribbon and the strip are transparent, do not write depth and draw before the beads and the floor point
  assert.equal(u.ribbon.material.vertexColors, true);
  assert.equal(u.ribbon.material.transparent, true); assert.equal(u.ribbon.material.depthWrite, false);
  assert.equal(u.homeSheet.material.opacity, 1);
  assert.ok(u.floor.renderOrder < u.ribbon.renderOrder && u.ribbon.renderOrder < u.homeSheet.renderOrder && u.homeSheet.renderOrder < u.riser.renderOrder);
  assert.ok(u.riser.renderOrder < u.beads[0].renderOrder && u.beads[0].renderOrder < u.floorPoint.renderOrder);
});

test('A1.12 argHelix keeps its signature and tightFrame radius', () => {
  assert.equal(typeof argHelix, 'function');
  const h = argHelix();
  assert.ok(h.group && typeof h.update === 'function');
  assert.equal(h.group.userData.frameRadius, undefined);
  near(argHelix({ tightFrame: true }).group.userData.frameRadius, Math.hypot(3, HELIX_PITCH * 2.5), 1e-12);
  near(argHelix({ tightFrame: true }).group.userData.frameRadius, 4.2426, 1e-4);
  assert.equal(h.group.userData.kind, 'arg-helix');
});

test('A1.13 disposing the group frees the ribbon, the riser (and its outline) and the floor', () => {
  const h = argHelix({ z: C(1, 1) });
  const geoms = [];
  h.group.traverse((o) => { if (o.geometry) geoms.push(o.geometry); });
  const kinds = new Set();
  h.group.traverse((o) => kinds.add(o.name));
  for (const n of ['helix-ribbon', 'helix-home', 'helix-riser', 'helix-riser-outline', 'helix-floor', 'helix-axis', 'helix-seam', 'helix-point']) assert.ok(kinds.has(n), n);
  let disposed = 0;
  for (const g of geoms) g.addEventListener('dispose', () => disposed++);
  T.disposeObject(h.group);
  assert.equal(disposed, geoms.length, 'every geometry of the group is disposed');
});

// ================================================================================================
// A4: the ruler plan, the fit plan, exitPoint, the values preset
// ================================================================================================

const Z1 = C(3, -2), Z2 = C(-1, 4);
const S111 = (mode, extra = {}) => ({ mode, z1: Z1, z2: Z2, conjResult: false, ...extra });

test('A4.1 rulerPlan, 1.1.1 multiply: |z1 z2| = sqrt 221 between the 8 ring and the 16 ring', () => {
  const R = AR.rulerPlan(Z1, Z2, 'mul');
  near(R.result, Math.sqrt(221), 1e-9);
  assert.deepEqual(R.rings, [1, 2, 4, 8, 16, 32]);
  assert.equal(R.base, 2);
  const r1 = Math.hypot(3, 2), r2 = Math.sqrt(17);
  assert.ok(R.rings[0] <= Math.min(r1, r2, R.result) / 2 && R.rings.at(-1) >= 2 * Math.max(r1, r2, R.result));
  assert.deepEqual(R.marks.filter((m) => m.kind === 'ring').map((m) => m.label), ['1', '2', '4', '8', '16', '32']);
  assert.deepEqual(R.marks.filter((m) => m.kind === 'value').map((m) => m.label), ['|z₁| = 3.606', '|z₂| = 4.123', '|z₁z₂| = 14.866']);
  assert.deepEqual(R.marks.filter((m) => m.kind === 'value').map((m) => m.id), ['z1', 'z2', 'result']);
  assert.equal(R.ok, true);
  assert.equal(R.lo, 1); assert.equal(R.hi, 32);
  assert.deepEqual(JSON.parse(JSON.stringify(R)), R, 'plain data: it survives JSON');
});

test('A4.2 rulerPlan, 1.1.1 divide: |z1 / z2| = sqrt(13/17), seven rings', () => {
  const R = AR.rulerPlan(Z1, Z2, 'div');
  near(R.result, Math.sqrt(13 / 17), 1e-9);
  near(R.result, 0.8744746, 1e-7);
  assert.deepEqual(R.rings, [0.25, 0.5, 1, 2, 4, 8, 16]);
  assert.deepEqual(R.marks.filter((m) => m.kind === 'ring').map((m) => m.label), ['0.25', '0.5', '1', '2', '4', '8', '16']);
  assert.equal(R.marks.at(-1).label, '|z₁/z₂| = 0.874');
});

test('A4.3 rulerPlan edge cases: a zero factor, division by 0, another mode', () => {
  const div0 = AR.rulerPlan(Z1, C(0, 0), 'div');
  assert.ok(Number.isNaN(div0.result)); assert.deepEqual(div0.marks, []); assert.deepEqual(div0.rings, []); assert.equal(div0.ok, false);
  const mul0 = AR.rulerPlan(C(0, 0), Z2, 'mul');
  assert.equal(mul0.result, 0); assert.deepEqual(mul0.rings, []); assert.deepEqual(mul0.marks, []); assert.equal(mul0.ok, false);
  const add = AR.rulerPlan(Z1, Z2, 'add');
  assert.ok(Number.isNaN(add.result)); assert.equal(add.ok, false);
  for (const mode of ['sub', 'conj', 'inv']) assert.equal(AR.rulerPlan(Z1, Z2, mode).ok, false, mode);
  assert.equal(AR.rulerPlan(C(0, 0), Z2, 'div').result, 0, '0 / z2 is 0: not drawable');
});

test('A4.4 rulerPlan uses powers of ten when more than 8 powers of 2 would be needed', () => {
  const R = AR.rulerPlan(C(0.001, 0), C(100, 0), 'mul');
  assert.equal(R.base, 10);
  assert.deepEqual(R.rings, [1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100, 1000]);
  near(R.result, 0.1, 1e-12);
  assert.ok(R.marks.filter((m) => m.kind === 'ring').every((m) => typeof m.label === 'string' && m.label.length > 0));
  assert.match(AR.rulerIntro(R, 'mul'), /ten times/);
  assert.equal(AR.rulerPlan(C(2, 0), C(2, 0), 'mul').base, 2);
});

test('A4.5 a result on a ring is described as on the ring', () => {
  const S = { mode: 'mul', z1: C(2, 0), z2: C(2, 0) };
  const R = AR.rulerPlan(S.z1, S.z2, 'mul');
  assert.equal(R.result, 4);
  assert.deepEqual(R.rings, [1, 2, 4, 8]);
  assert.match(AR.rulerDescription(R, S), /on the 4 ring/);
});

test('A4.6 rulerRho: a product of lengths is a sum of ruler distances', () => {
  const R = AR.rulerPlan(Z1, Z2, 'mul');
  near(AR.rulerRho(1, R.rings), 0.12, 1e-12);
  near(AR.rulerRho(32, R.rings), 0.92, 1e-12);
  near(AR.rulerRho(Math.sqrt(13), R.rings), 0.41604, 1e-4);
  near(AR.rulerRho(Math.sqrt(17), R.rings), 0.44700, 1e-4);
  near(AR.rulerRho(R.result, R.rings), 0.74303, 1e-4);
  near(AR.rulerRho(R.result, R.rings) - 0.12, (AR.rulerRho(Math.sqrt(13), R.rings) - 0.12) + (AR.rulerRho(Math.sqrt(17), R.rings) - 0.12), 1e-12);
  const D = AR.rulerPlan(Z1, Z2, 'div');
  near(AR.rulerRho(D.result, D.rings), 0.36087, 1e-4);
  for (const r of D.rings) assert.ok(AR.rulerRho(r, D.rings) >= 0.12 - 1e-12 && AR.rulerRho(r, D.rings) <= 0.92 + 1e-12);
});

test('A4.7 the ruler texts: the intro and the description are the strings of the design', () => {
  const mul = AR.rulerPlan(Z1, Z2, 'mul'), div = AR.rulerPlan(Z1, Z2, 'div');
  assert.equal(AR.rulerDescription(mul, S111('mul')),
    'Rings at 1, 2, 4, 8, 16, 32. |z₁| = 3.606 and |z₂| = 4.123, so |z₁z₂| = 3.606 × 4.123 = 14.866: between the 8 ring and the 16 ring, in direction 70.3°.');
  assert.equal(AR.rulerDescription(div, S111('div')),
    'Rings at 0.25, 0.5, 1, 2, 4, 8, 16. |z₁| = 3.606 and |z₂| = 4.123, so |z₁/z₂| = 3.606 ÷ 4.123 = 0.874: between the 0.5 ring and the 1 ring, in direction -137.7°.');
  assert.equal(AR.rulerIntro(mul, 'mul'), 'Distance from 0 is drawn on a log scale: each ring is twice the one inside it, so multiplying is a step outward of the same size from anywhere. Directions are true.');
  assert.equal(AR.rulerIntro(div, 'div'), 'Distance from 0 is drawn on a log scale: each ring is twice the one inside it, so dividing is a step inward of the same size from anywhere. Directions are true.');
  assert.match(AR.rulerIntro(mul, 'mul'), /^Distance from 0 is drawn on a log scale: each ring is twice/);
  assert.equal(AR.rulerDescription(AR.rulerPlan(C(0, 0), Z2, 'mul'), { mode: 'mul', z1: C(0, 0), z2: Z2 }), 'The result is 0, and 0 is not on a log ruler.');
  assert.equal(AR.rulerDescription(AR.rulerPlan(Z1, C(0, 0), 'div'), { mode: 'div', z1: Z1, z2: C(0, 0) }), 'z₂ is 0, so the quotient is undefined.');
});

test('A4.8 fitPoints: the two moves near 0, never the product; the other modes frame their result', () => {
  const near2 = (p, re, im, eps = 1e-6) => Math.hypot(p.re - re, p.im - im) < eps;
  const mul = AR.fitPoints(S111('mul'));
  assert.ok(!mul.some((p) => near2(p, 5, 14, 1e-9)), 'the product (5, 14) is not framed');
  for (const [re, im] of [[0, 0], [3, -2], [-1, 4], [1.2126781, 3.3954988], [1, 0], [-1, 0], [0, 1], [0, -1]]) assert.ok(mul.some((p) => near2(p, re, im)), `(${re}, ${im})`);
  const div = AR.fitPoints(S111('div'));
  assert.ok(div.some((p) => near2(p, -2.6679, -2.4254, 1e-4)), 'the spun point of the quotient');
  const add = AR.fitPoints(S111('add'));
  assert.ok(add.some((p) => near2(p, 2, 2, 1e-9)), 'the sum (2, 2) is framed');
  const mirror = AR.fitPoints(S111('sub', { conjResult: true }));
  assert.ok(mirror.some((p) => near2(p, 4, 6, 1e-9)) && mirror.some((p) => near2(p, 4, -6, 1e-9)), 'the mirrored difference and its mirror');
  for (const mode of AR.MODES) {
    const S = S111(mode);
    assert.deepEqual(AR.scenePlan(S, 20).fit, AR.fitPoints(S), `scenePlan(S).fit is fitPoints for ${mode}`);
  }
  assert.deepEqual(AR.scenePlan({ ...S111('div'), z2: C(0, 0) }, 20).fit, AR.fitPoints({ ...S111('div'), z2: C(0, 0) }));
  assert.ok(AR.fitPoints({ ...S111('div'), z2: C(0, 0) }).some((p) => p.re === 0 && p.im === 0), 'division by 0 still frames the origin');
  const fit = (S) => internals.fitView(AR.fitPoints(S), 400, 400, 0.18, {});
  const m = fit(S111('mul'));
  near(m.center.re, 1, 1e-3); near(m.center.im, 1, 1e-3); near(m.unitsAcross, 8.160, 1e-3);
  const d = fit(S111('div'));
  near(d.center.re, 0.166, 1e-3); near(d.center.im, 0.787, 1e-3); near(d.unitsAcross, 8.738, 1e-3);
  const a = fit(S111('add'));
  near(a.center.re, 1, 1e-3); near(a.center.im, 1, 1e-3); near(a.unitsAcross, 8.160, 1e-3);
  // on a 400 px canvas the product's pixel row is above the frame: the arcs keep their size
  const sc = 400 / m.unitsAcross;
  assert.ok(200 - (14 - m.center.im) * sc < 0, 'the product is above the canvas');
  assert.ok(m.unitsAcross <= 12);
});

test('A4.9 exitPoint: where a segment leaves the canvas', () => {
  const e = AR.exitPoint({ x: 100, y: 100 }, { x: 100, y: -500 }, 200, 200, 12);
  near(e.x, 100, 1e-6); near(e.y, 12, 1e-6); near(e.t, 0.146667, 1e-6); assert.equal(e.clipped, true);
  const inside = AR.exitPoint({ x: 100, y: 100 }, { x: 150, y: 120 }, 200, 200, 12);
  assert.equal(inside.t, 1); assert.equal(inside.clipped, false); near(inside.x, 150, 1e-12);
  assert.equal(AR.exitPoint({ x: 5, y: 100 }, { x: 100, y: 100 }, 200, 200, 12), null, 'a start outside gives null');
  const diag = AR.exitPoint({ x: 100, y: 100 }, { x: 400, y: 400 }, 200, 200, 12);
  near(diag.x, 188, 1e-6); near(diag.y, 188, 1e-6); assert.equal(diag.clipped, true);
  const left = AR.exitPoint({ x: 100, y: 100 }, { x: -100, y: 100 }, 200, 200);
  near(left.x, 12, 1e-9);
});

const preset = (values, problem = '1.1.1') => ({ kind: 'values', station: 'arithmetic', problem, family: problem, values });

test('A4.10 parseArithmeticValues', () => {
  const v = AR.parseArithmeticValues(preset({ z1: C(1, 2), z2: C(2, -1), mode: 'mul' }));
  assert.deepEqual(v.z1, C(1, 2)); assert.deepEqual(v.z2, C(2, -1)); assert.equal(v.mode, 'mul');
  assert.equal(v.conjResult, false); assert.equal(v.lockConj, false); assert.equal(v.hint, '1.1.1'); assert.equal(v.problem, '1.1.1');
  const dz = AR.parseArithmeticValues(preset({ mode: 'div', z2: C(0, 0) }));
  assert.deepEqual(dz.z2, C(-1, 4), 'a division by 0 falls back to the default z2');
  assert.deepEqual(AR.parseArithmeticValues(preset({ mode: 'inv', z1: C(0, 0) })).z1, C(3, -2));
  const mir = AR.parseArithmeticValues(preset({ mode: 'sub', conjResult: true }, '1.1.2'));
  assert.equal(mir.conjResult, true); assert.equal(mir.hint, null); assert.equal(mir.problem, '1.1.2');
  assert.equal(AR.parseArithmeticValues(preset({ mode: 'conj', conjResult: true }, 'P1')).conjResult, false, 'conj is not binary: no mirror');
  assert.deepEqual(AR.parseArithmeticValues(preset({ z1: C(101, 0) })).z1, C(3, -2), 'a part beyond 100 falls back');
  assert.deepEqual(AR.parseArithmeticValues(preset({ z1: C(100, -100) })).z1, C(100, -100));
  assert.equal(AR.parseArithmeticValues({ kind: 'problem', id: '1.1.1' }), null);
  assert.equal(AR.parseArithmeticValues(null), null);
  assert.equal(AR.parseArithmeticValues({ kind: 'token', token: 'mul' }), null);
  const p2 = AR.parseArithmeticValues(preset({ z1: C(3, -2), z2: C(3, 2), mode: 'mul' }, 'P2'));
  assert.equal(p2.lockConj, true); assert.equal(p2.hint, null);
  assert.equal(AR.parseArithmeticValues(preset({ z1: C(3, -2), z2: C(1, 1), mode: 'mul' }, 'P2')).lockConj, false);
  const bad = AR.parseArithmeticValues(preset({ z1: 'x', z2: C(NaN, 0), mode: 'pow', conjResult: 'yes' }, 'nonsense'));
  assert.deepEqual(bad.z1, C(3, -2)); assert.deepEqual(bad.z2, C(-1, 4)); assert.equal(bad.mode, 'mul'); assert.equal(bad.problem, null);
});

test('A4.11 the fresh-numbers case (1 + 2i)(2 - i) = 4 + 3i', () => {
  const M = AR.arithmeticModel({ mode: 'mul', z1: C(1, 2), z2: C(2, -1), conjResult: false });
  near(M.result.re, 4, 1e-12); near(M.result.im, 3, 1e-12);
  assert.equal(AR.arithmeticReadout(M), 'result = 4 + 3i; |result| = 5; Arg = 0.644');
  near(M.a.theta + M.b.theta, 0.6435011, 1e-6);
});

test('A4.12 the worked 1.1.1, 1.1.2, P1, P2 values behind the glyph strings', async () => {
  const { glyphText } = await import('../../js/core/moveglyph.js');
  const model = (S) => AR.arithmeticModel(S);
  const prod = model(S111('mul')).result;
  near(prod.re, 5, 1e-12); near(prod.im, 14, 1e-12);
  assert.equal(glyphText(prod), 'move: turn 70.3°, stretch 14.866');
  near(Math.atan2(14, 5), 1.2277724, 1e-7);
  near(Math.atan2(-2, 3) + (PI - Math.atan(4)), 1.2277724, 1e-7, 'theta1 + theta2');
  const quo = model(S111('div')).result;
  near(quo.re, -11 / 17, 1e-12); near(quo.im, -10 / 17, 1e-12);
  assert.equal(glyphText(quo), 'move: turn -137.7°, stretch 0.874');
  near(Math.hypot(quo.re, quo.im), Math.sqrt(13 / 17), 1e-12);
  near(Math.atan2(-2, 3) - (PI - Math.atan(4)), -2.4037776, 1e-7);
  const sub = model(S111('sub', { conjResult: true }));
  near(sub.value.re, 4, 1e-12); near(sub.value.im, -6, 1e-12); near(sub.result.im, 6, 1e-12);
  assert.equal(glyphText(sub.result), 'move: turn 56.3°, stretch 7.211');
  near(Math.hypot(4, 6), 7.2111026, 1e-7);
  const zzbar = model({ mode: 'mul', z1: Z1, z2: C(3, 2), conjResult: false }).result;
  near(zzbar.re, 13, 1e-12); near(zzbar.im, 0, 1e-12);
  assert.equal(glyphText(zzbar), 'move: turn 0°, stretch 13');
  const p1 = model({ mode: 'mul', z1: C(3, 2), z2: C(-1, -4), conjResult: false }).result;
  near(p1.re, 5, 1e-12); near(p1.im, -14, 1e-12);
  assert.equal(glyphText(C(4, 3)), 'move: turn 36.9°, stretch 5');
});

test('A4.13 the U24 sweep still holds: scenePlan and fitPoints never throw and always give finite fit points when defined', () => {
  const vals = [0, 1, -2, 0.5];
  for (const mode of AR.MODES) {
    for (const a of vals) for (const b of vals) for (const c of vals) for (const d of vals) {
      const S = { mode, z1: C(a, b), z2: C(c, d), conjResult: a > 0 };
      const plan = AR.scenePlan(S, 20);
      const M = AR.arithmeticModel(S);
      if (!M.undefinedResult) assert.ok(plan.fit.every((p) => Number.isFinite(p.re) && Number.isFinite(p.im)), JSON.stringify(S));
      const R = AR.rulerPlan(S.z1, S.z2, mode);
      assert.ok(R.ok === (R.rings.length > 0));
      if (R.ok) for (const r of R.rings) { const rho = AR.rulerRho(r, R.rings); assert.ok(rho >= 0.12 - 1e-9 && rho <= 0.92 + 1e-9); }
    }
  }
});

// ================================================================================================
// the staircase values preset
// ================================================================================================

test('A4.14 parseStaircaseValues', () => {
  const vp = (values, problem = '1.3.1') => ({ kind: 'values', station: 'staircase', problem, family: problem, values });
  const ok = ST.parseStaircaseValues(vp({ z: C(0, 2), seam: -PI / 2 }));
  assert.deepEqual(ok.z, C(0, 2)); near(ok.seam, -PI / 2, 1e-12);
  const dflt = { re: -1, im: Math.sqrt(3) };
  for (const z of [C(9, 0), C(0, 0), C(0.1, 0), C(2.95, 0), C(NaN, 1), 'z', null]) {
    const v = ST.parseStaircaseValues(vp({ z }));
    near(v.z.re, dflt.re, 1e-12, JSON.stringify(z)); near(v.z.im, dflt.im, 1e-12, JSON.stringify(z));
  }
  assert.deepEqual(ST.parseStaircaseValues(vp({ z: C(2.9, -2.9) })).z, C(2.9, -2.9));
  assert.equal(ST.parseStaircaseValues(vp({ z: C(1, 1), seam: NaN })).seam, -PI);
  assert.equal(ST.parseStaircaseValues(vp({ z: C(1, 1), seam: PI })).seam, -PI, 'a seam of pi is the seam at -pi (normSeam)');
  assert.equal(ST.parseStaircaseValues(vp({ z: C(1, 1) })).seam, -PI);
  assert.equal(ST.parseStaircaseValues({ kind: 'problem', id: '1.3.1' }), null);
  assert.equal(ST.parseStaircaseValues(undefined), null);
});

// ================================================================================================
// the five shadows of graph4d
// ================================================================================================

test('A4.15 shadowActive: the lit windows of the Re and Im shadows', () => {
  const g = (uv, yv = 0, mode = 'graph') => G4.shadowActive({ uv, yv, mode });
  assert.equal(g(0), 're');
  assert.equal(g(PI / 2), 'im');
  assert.equal(g(3 * PI / 2), 'im');
  assert.equal(g(PI), null, 'uv = 180 degrees is the Re surface upside down: not one of the five');
  assert.equal(g(0.1745), 're');
  assert.equal(g(0.18), null);
  assert.equal(g(0, 0.2), null);
  assert.equal(g(2 * PI - 0.1), 're');
  assert.equal(g(5, 5, 'landscape'), 'landscape');
  assert.equal(g(0, 0, 'sphere'), null);
  assert.equal(g(PI / 2 + 0.17), 'im'); assert.equal(g(PI / 2 + 0.18), null);
  assert.equal(g(0, 2 * PI - 0.1), 're', 'yv is measured to the nearest multiple of 2 pi too');
  assert.equal(G4.shadowActive({ uv: 0, yv: 0 }), 're', 'the mode defaults to graph');
});

test('A4.16 shadowAngles, SHADOW_IDS, shadowCaption', () => {
  assert.deepEqual(G4.shadowAngles('re'), { uv: 0, yv: 0 });
  assert.deepEqual(G4.shadowAngles('im'), { uv: PI / 2, yv: 0 });
  assert.equal(G4.shadowAngles('side'), null); assert.equal(G4.shadowAngles('domain'), null); assert.equal(G4.shadowAngles('landscape'), null);
  assert.deepEqual([...G4.SHADOW_IDS], ['side', 'domain', 're', 'im', 'landscape']);
  assert.ok(Object.isFrozen(G4.SHADOW_IDS));
  assert.deepEqual(G4.shadowCaption('re'), { title: 'Re surface', line: 'Height is u. Colour is v.' });
  assert.deepEqual(G4.shadowCaption('im'), { title: 'Im surface', line: 'Height is v. Colour is u.' });
  assert.deepEqual(G4.shadowCaption('landscape'), { title: 'Modulus landscape', line: 'Height is |w|. Colour is the angle of w.' });
  assert.equal(G4.shadowCaption('side').title, 'Side by side');
  assert.equal(G4.shadowCaption('domain').title, 'Domain colouring');
  // each shadow's angles light that shadow (the tap and the lit state agree)
  for (const id of ['re', 'im']) assert.equal(G4.shadowActive({ ...G4.shadowAngles(id), mode: 'graph' }), id);
});

test('A4.17 shadowSquare and shadowWExtent', () => {
  const sq = G4.shadowSquare(G4.FUNCS.sq);
  assert.deepEqual(sq.xRange, [-1, 1]); assert.deepEqual(sq.yRange, [-1, 1]);
  const ex = G4.shadowSquare(G4.FUNCS.exp);
  near(ex.xRange[0], -3.7916, 1e-3); near(ex.xRange[1], 2.4916, 1e-3);
  near(ex.yRange[0], -PI, 1e-9); near(ex.yRange[1], PI, 1e-9);
  const sr = G4.shadowSquare(G4.FUNCS['sqrt-all']);
  assert.deepEqual(sr.xRange, [-2, 2]);
  const want = { sq: 3, 'sqrt-all': 2, 'cbrt-all': 2, recip: 4, exp: 4 };
  for (const [id, e] of Object.entries(want)) assert.equal(G4.shadowWExtent(G4.FUNCS[id]), e, id);
});

test('A4.18 the worked z^2 point: w = -0.28 + 0.96i, |w| = 1, Arg w = 2 Arg z', () => {
  const z = C(0.6, 0.8);
  const v = G4.probeValues('sq', z);
  near(v.w.re, -0.28, 1e-12); near(v.w.im, 0.96, 1e-12);
  near(Math.hypot(v.w.re, v.w.im), 1, 1e-12);
  near(Math.atan2(v.w.im, v.w.re), 1.8545904, 1e-6);
  near(Math.atan2(v.w.im, v.w.re), 2 * Math.atan2(0.8, 0.6), 1e-12);
  // at uv = pi/2 the big view shows height -v and colour u: the Im surface upside down
  const lifted = G4.liftPoint(G4.FUNCS.sq.f, z, PI / 2, 0, 6);
  near(lifted[2], -0.96, 1e-12);
});

// ================================================================================================
// A7: resources stay bounded (code inspection)
// ================================================================================================

test('A7 graph4d: at most three small 3D views of 24 x 24, no autoRotate, disposed on unmount; the domain canvas is at most 160 px', () => {
  const code = src('js/stations/graph4d.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.equal((code.match(/createView3D\(/g) || []).length, 2, 'the big view and one loop for the three small ones');
  assert.ok(/for \(const id of \['re', 'im', 'landscape'\]\) \{\s*const v = createView3D\(shadowHosts\[id\], \{ grid: false, axes: false, hint: false,/.test(code));
  assert.ok(!/autoRotate/.test(code), 'no autoRotate anywhere in the station');
  assert.ok(/const SMALL_N = 24/.test(code));
  for (const call of code.match(/(?:reImSurface|modulusLandscape)\(\{[^}]*\}\)/g) || []) {
    if (/SMALL_N/.test(call)) assert.ok(/nx: SMALL_N, ny: SMALL_N/.test(call), call);
  }
  assert.ok(((code.match(/nx: SMALL_N, ny: SMALL_N/g) || []).length) === 3, 're, im and landscape');
  assert.ok(/Math\.min\(160, cv\.clientWidth \|\| 160\)/.test(code), 'the domain canvas is at most 160 CSS px');
  assert.ok(/maxPixels: \{ idle: 25600, drag: 25600 \}/.test(code));
  assert.ok(/maxWidth: 160/.test(code), 'the two small planes are at most 160 px');
  const un = code.slice(code.indexOf('return function unmount()'));
  for (const what of ['dc.destroy()', 'shadowZ.destroy()', 'shadowW.destroy()', 'dcWatch.disconnect()', 'v.dispose()', 'disposeShadowMeshes()']) assert.ok(un.includes(what), `unmount calls ${what}`);
});

test('A7 no literal colours in the three stations (tokens only) and the ribbon vertex budget is named', () => {
  for (const f of ['js/stations/staircase.js', 'js/stations/arithmetic.js', 'js/stations/graph4d.js']) {
    const code = src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.ok(!/(^|[^A-Za-z0-9_-])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b(?![-_])/.test(code.replace(/#(?:graph4d|staircase|arithmetic|station|video)[-\w]*/g, '')), `${f}: a hex colour`);
    assert.ok(!/\brgba?\(/.test(code), `${f}: an rgb() colour`);
  }
  const tv = src('js/core/three-view.js');
  assert.ok(/const RIBBON_PER_TURN = 48/.test(tv));
  assert.ok(/const nR = RIBBON_PER_TURN \* \(2 \* K \+ 1\)/.test(tv), 'the ribbon has 2 * (nR + 1) = 2 * 48 * (2K + 1) + 2 vertices');
});

test('staircase.js keeps the source pins of iteration 1 (the helix call, the view grid and the aspect rule) and takes the video and the card', () => {
  const code = src('js/stations/staircase.js');
  assert.match(code, /argHelix\(\{[^}]*tightFrame: true[^}]*\}\)/);
  assert.match(code, /#staircase-helix \{ aspect-ratio: 5 \/ 6; \}/);
  assert.match(code, /grid: false, gridSize: 6, cameraPosition: \[4\.6, 2\.4, 5\.6\]/, 'the floor is the helix\'s own; the camera is raised to 18 degrees');
  assert.match(code, /videoPanel\(videoHost, 'staircase-roots'\)/);
  assert.match(code, /problemCard\(ctx, problem, \{ id: 'staircase-problem', tone: 'polar', answer: 'reveal' \}\)/);
  const a = src('js/stations/arithmetic.js');
  assert.match(a, /id: 'arithmetic-ruler'/);
  assert.match(a, /moveGlyph\(arithmeticModel\(S\)\.result, \{ id: 'arithmetic-glyph' \}\)/);
  const g = src('js/stations/graph4d.js');
  assert.match(g, /videoPanel\(videoHost, 'shadows-4d'\)/);
});
