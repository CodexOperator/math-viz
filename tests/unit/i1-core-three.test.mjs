// Unit tests for js/core/three-view.js (goal i1-core-three). Node only: no document, no WebGL.
// Expected values come from docs/designs/iter-1/i1-core-three.md section 7.2 and Appendix A.
// Geometry positions and colours are Float32 attributes, so values read back from a BufferAttribute
// are compared at 1e-6 (float32 rounding is about 6e-8); values computed in doubles use tighter bounds.

import test from 'node:test';
import assert from 'node:assert/strict';

assert.equal(typeof document, 'undefined', 'this file must run without a DOM');
const T = await import('../../js/core/three-view.js');
const {
  THREE, stereographic, inverseStereographic, rotate4, project4to3, toScene, fromScene, srgbToLinear, hslToRgb,
  argColor, hiddenRamp, HIDDEN_RAMP_STOPS, hiddenRampCss, riemannPoint, HELIX_PITCH, surfaceFromFunction,
  modulusLandscape, reImSurface, graph4D, riemannSurfaceRoot, argHelix, riemannSphere, curveToLine, createMarker,
  disposeObject, createView3D,
} = T;

const near = (a, b, eps = 1e-12, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a} (eps ${eps})`);
const nearVec = (a, b, eps = 1e-12, msg = '') => {
  assert.equal(a.length, b.length, `${msg} length`);
  a.forEach((v, i) => near(v, b[i], eps, `${msg}[${i}]`));
};
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const C = (re, im = 0) => ({ re, im });
const vtx = (mesh, k) => { const p = mesh.geometry.attributes.position.array; return [p[3 * k], p[3 * k + 1], p[3 * k + 2]]; };
const vcol = (mesh, k) => { const c = mesh.geometry.attributes.color.array; return [c[3 * k], c[3 * k + 1], c[3 * k + 2]].map(linearToSrgb); };
const z2 = (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im });
const recip = (z) => { const s = z.re * z.re + z.im * z.im; return { re: z.re / s, im: -z.im / s }; };

// ------------------------------------------------------------------------------------------------
// module import
// ------------------------------------------------------------------------------------------------

test('module imports in Node and exports the documented API', () => {
  for (const name of ['stereographic', 'inverseStereographic', 'rotate4', 'project4to3', 'createView3D', 'surfaceFromFunction',
    'modulusLandscape', 'reImSurface', 'graph4D', 'riemannSurfaceRoot', 'argHelix', 'riemannSphere', 'curveToLine', 'disposeObject',
    'toScene', 'fromScene', 'srgbToLinear', 'hslToRgb', 'argColor', 'hiddenRamp', 'hiddenRampCss', 'riemannPoint', 'createMarker']) {
    assert.equal(typeof T[name], 'function', name);
  }
  assert.equal(THREE.REVISION, '160');
  assert.equal(HELIX_PITCH, 1.2);
  assert.ok(Array.isArray(HIDDEN_RAMP_STOPS) && HIDDEN_RAMP_STOPS.length === 5);
  assert.throws(() => createView3D(), TypeError);
  assert.throws(() => createView3D({}), TypeError);
  assert.throws(() => createView3D(null), TypeError);
  assert.equal(typeof document, 'undefined');
});

// ------------------------------------------------------------------------------------------------
// A1: stereographic projection is exact and 1/z is the half-turn
// ------------------------------------------------------------------------------------------------

test('A1 stereographic: special points', () => {
  nearVec(stereographic(C(0, 0)), [0, 0, -1]);
  nearVec(stereographic(C(1, 0)), [1, 0, 0]);
  nearVec(stereographic(C(0, 1)), [0, 1, 0]);
  nearVec(stereographic(C(-1, 0)), [-1, 0, 0]);
  nearVec(stereographic(C(0, -1)), [0, -1, 0]);
  nearVec(stereographic(C(2, 0)), [0.8, 0, 0.6]);
  nearVec(stereographic(C(0.5, 0)), [0.8, 0, -0.6]);
  nearVec(stereographic(C(2, 1)), [2 / 3, 1 / 3, 2 / 3]);
  nearVec(stereographic(C(1, 1)), [2 / 3, 2 / 3, 1 / 3]);
  nearVec(stereographic(C(0.4, -0.2)), [2 / 3, -1 / 3, -2 / 3]);
  nearVec(stereographic(C(0.5, -0.5)), [2 / 3, -2 / 3, -1 / 3]);
  nearVec(stereographic(C(-1, Math.sqrt(3))), [-0.4, 0.6928203230275509, 0.6]);
});

test('A1 stereographic: infinity, NaN, plain numbers, overflow safety', () => {
  const far = stereographic(C(1e9, 0));
  nearVec(far, [0, 0, 1], 1e-8);
  near(far[0], 2e-9, 1e-15);
  assert.deepEqual(stereographic(C(Infinity, 0)), [0, 0, 1]);
  assert.deepEqual(stereographic(C(0, -Infinity)), [0, 0, 1]);
  assert.ok(stereographic(C(NaN, 0)).every(Number.isNaN));
  assert.ok(stereographic(C(0, NaN)).every(Number.isNaN));
  nearVec(stereographic(2), stereographic(C(2, 0)));
  for (const z of [C(0, 0), C(1e-3, 0), C(0.4, -0.2), C(2, 1), C(-3, 0.5), C(1e3, 0), C(1e9, 0), C(1e200, 1e200)]) {
    const s = stereographic(z);
    near(Math.hypot(...s), 1, 1e-12, `unit length at ${z.re},${z.im}`);
  }
});

test('A1 inverseStereographic', () => {
  const r = inverseStereographic(stereographic(C(2, 1)));
  near(r.re, 2); near(r.im, 1);
  const q = inverseStereographic(stereographic(C(-1, Math.sqrt(3))));
  near(q.re, -1); near(q.im, 1.7320508075688772);
  const inf = inverseStereographic([0, 0, 1]);
  assert.equal(inf.re, Infinity); assert.equal(inf.im, Infinity);
  const o = inverseStereographic([0, 0, -1]);
  assert.ok(Math.abs(o.re) < 1e-15 && Math.abs(o.im) < 1e-15);
});

test('A1 1/z is the half-turn (X, Y, Z) -> (X, -Y, -Z)', () => {
  for (const z of [C(2, 1), C(1, 1), C(1, -1), C(-3, 0.5), C(0.2, 7)]) {
    const s = z.re * z.re + z.im * z.im;
    const winv = C(z.re / s, -z.im / s);
    const s1 = stereographic(z), s2 = stereographic(winv);
    nearVec(s2, [s1[0], -s1[1], -s1[2]], 1e-12, `z=${z.re}+${z.im}i`);
  }
  const w = recip(C(2, 1));
  near(w.re, 0.4); near(w.im, -0.2);
});

test('A1 circle |z-1| = 1 is the plane 2X - Z = 1 and its image Re w = 1/2 is 2X + Z = 1', () => {
  for (let k = 0; k < 50; k++) {
    const t = -1.5 + 3 * k / 49;
    const z = C(2 * Math.cos(t) * Math.cos(t), 2 * Math.cos(t) * Math.sin(t));
    const [X, , Z] = stereographic(z);
    near(2 * X - Z - 1, 0, 1e-12, `circle t=${t}`);
    const line = stereographic(C(0.5, -0.5 * Math.tan(t)));
    near(2 * line[0] + line[2] - 1, 0, 1e-12, `line t=${t}`);
  }
});

test('A1 riemannSphere: the half-turn applied to a stroke of |z-1| = 1 lands on Re w = 1/2', () => {
  const sph = riemannSphere();
  const pts = [];
  for (let k = 0; k < 100; k++) {
    const t = -1.2 + 2.4 * k / 99;
    pts.push({ re: 2 * Math.cos(t) * Math.cos(t), im: 2 * Math.cos(t) * Math.sin(t), t: k / 99 });
  }
  const line = sph.addCurve(pts, '--input');
  assert.equal(line.isLine, true);
  const readPlane = (applyMatrix) => {
    const pos = line.geometry.attributes.position;
    return Array.from({ length: pos.count }, (_, i) => {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      if (applyMatrix) v.applyMatrix4(line.matrixWorld);
      const [X, Y, Z] = fromScene([v.x, v.y, v.z]).map((c) => c / 1.004);
      return [X, Y, Z];
    });
  };
  // positions are Float32 (about 6e-8 resolution), hence 1e-6
  sph.setHalfTurn(0);
  sph.group.updateMatrixWorld(true);
  for (const [X, , Z] of readPlane(true)) near(2 * X - Z - 1, 0, 1e-6, 'half-turn 0');
  sph.setHalfTurn(Math.PI);
  sph.group.updateMatrixWorld(true);
  for (const [X, , Z] of readPlane(true)) near(2 * X + Z - 1, 0, 1e-6, 'half-turn pi');
});

// ------------------------------------------------------------------------------------------------
// A2: 4D rotation
// ------------------------------------------------------------------------------------------------

test('A2 rotate4 conventions and order', () => {
  const h = Math.PI / 2;
  nearVec(rotate4([1, 2, 3, 4], { uv: h }), [1, 2, -4, 3]);
  nearVec(rotate4([1, 2, 3, 4], { yv: h }), [1, -4, 3, 2]);
  nearVec(rotate4([1, 2, 3, 4], { uv: h, yv: h }), [1, -3, -4, 2]);
  nearVec(rotate4([1, 1, 0, 2], { uv: h, yv: h }), [1, 0, -2, 1]);
  const p = [0.3, -1.2, 2.5, 0.8];
  for (const a of [{}, { uv: 0, yv: 0 }, undefined]) {
    const r = a === undefined ? rotate4(p) : rotate4(p, a);
    assert.deepEqual(r, p);
    assert.notEqual(r, p, 'returns a new array');
  }
  const q = rotate4(p, { uv: 0.7, yv: -1.3 });
  nearVec(q, [0.3, 1.8204304301, 1.3967313184, 1.7507640256], 1e-9);
  near(Math.hypot(...q), Math.hypot(...p), 1e-12);
  near(Math.hypot(...q), 2.9017236257, 1e-9);
  nearVec(rotate4(rotate4(p, { uv: 0.9 }), { uv: -0.9 }), p);
  assert.deepEqual(project4to3([1, 2, 3, 4]), [1, 2, 3]);
  near(rotate4([0, 0, 1.5, -0.5], { uv: 0.9 })[2], 1.5 * Math.cos(0.9) + 0.5 * Math.sin(0.9));
});

test('A2 the uv rotation multiplies the output by e^{ia} (Re surface -> Im surface)', () => {
  // f(1+i) = 2i for z^2. With uv = pi/2 the shown height is Re(i f) = -Im f = -2.
  nearVec(rotate4([1, 1, 0, 2], { uv: Math.PI / 2 }), [1, 1, -2, 0]);
});

// ------------------------------------------------------------------------------------------------
// A3: pure helpers
// ------------------------------------------------------------------------------------------------

test('A3 srgbToLinear, argColor, hslToRgb, hiddenRamp', () => {
  near(srgbToLinear(0), 0); near(srgbToLinear(1), 1);
  near(srgbToLinear(0.5), 0.21404114048, 1e-10);
  near(srgbToLinear(0.9), 0.78741228940, 1e-10);
  near(srgbToLinear(0.1), 0.01002282557, 1e-10);
  near(srgbToLinear(0.8), 0.60382733886, 1e-10);
  near(srgbToLinear(0.04), 0.04 / 12.92);
  nearVec(argColor(C(1, 0)), [0.9, 0.1, 0.1], 1e-9);
  nearVec(argColor(C(0, 1)), [0.5, 0.9, 0.1], 1e-9);
  nearVec(argColor(C(-1, 0)), [0.1, 0.9, 0.9], 1e-9);
  nearVec(argColor(C(0, -1)), [0.5, 0.1, 0.9], 1e-9);
  nearVec(argColor(C(-1, -0)), [0.1, 0.9, 0.9], 1e-9, 'no seam in colour');
  nearVec(argColor(C(-1, 1e-300)), argColor(C(-1, -1e-300)), 1e-9);
  nearVec(hslToRgb(-0.25, 0.8, 0.5), [0.5, 0.1, 0.9], 1e-12);
  nearVec(hslToRgb(1.25, 0.8, 0.5), [0.5, 0.9, 0.1], 1e-12);
  const stops = [[0, [68, 1, 84]], [0.25, [59, 82, 139]], [0.5, [33, 145, 140]], [0.75, [94, 201, 98]], [1, [253, 231, 37]]];
  for (const [t, rgb] of stops) nearVec(hiddenRamp(t), rgb.map((c) => c / 255), 1e-12, `t=${t}`);
  nearVec(hiddenRamp(0.125), [0.2490196078, 0.1627450980, 0.4372549020], 1e-9);
  nearVec(hiddenRamp(NaN), hiddenRamp(0.5));
  nearVec(hiddenRamp(-3), hiddenRamp(0));
  nearVec(hiddenRamp(7), hiddenRamp(1));
  assert.equal(hiddenRampCss(), 'linear-gradient(90deg, #440154, #3b528b, #21918c, #5ec962, #fde725)');
});

test('A3 toScene / fromScene', () => {
  assert.deepEqual(toScene([1, 2, 3]), [1, 3, -2]);
  nearVec(fromScene(toScene([1.5, -2, 0.25])), [1.5, -2, 0.25]);
});

test('A3 riemannPoint', () => {
  const a = riemannPoint({ n: 3, part: 'im' }, 1, Math.PI);
  nearVec([a[0], a[2], a[3]], [-1, 0.8660254038, 0.5], 1e-9);
  near(a[1], 0, 1e-9);
  const b = riemannPoint({ n: 3, part: 'im' }, 1, 3 * Math.PI);
  nearVec([b[0], b[2], b[3]], [-1, 0, -1], 1e-9);
  const c = riemannPoint({ n: 3, part: 'im' }, 1, 5 * Math.PI);
  nearVec([c[0], c[2], c[3]], [-1, -0.8660254038, 0.5], 1e-9);
  const d = riemannPoint({ n: 2, part: 'im' }, 2, Math.PI / 2);
  nearVec([d[0], d[1], d[2], d[3]], [0, 2, 1, 1], 1e-9);
  const e = riemannPoint({ n: 2, part: 'im' }, 2, 5 * Math.PI / 2);
  nearVec([e[0], e[1], e[2], e[3]], [0, 2, -1, -1], 1e-9);
  const f = riemannPoint({ n: 3, part: 're' }, 1, Math.PI);
  nearVec([f[2], f[3]], [0.5, 0.8660254038], 1e-9);
});

// ------------------------------------------------------------------------------------------------
// A3: surfaces
// ------------------------------------------------------------------------------------------------

test('A3 surfaceFromFunction topology, material and wire', () => {
  const mesh = surfaceFromFunction({ f: (z) => z, nx: 7, ny: 5 });
  assert.ok(mesh instanceof THREE.Mesh);
  const g = mesh.geometry;
  assert.equal(g.attributes.position.count, 35);
  assert.equal(g.attributes.color.count, 35);
  assert.equal(g.attributes.position.itemSize, 3);
  assert.ok(g.attributes.position.array instanceof Float32Array);
  assert.ok(g.attributes.normal);
  assert.equal(g.index.count, 144);
  assert.equal(g.index.count / 3, (7 - 1) * (5 - 1) * 2);
  for (const i of g.index.array) assert.ok(i < 35);
  assert.equal(mesh.material.vertexColors, true);
  assert.equal(mesh.material.side, THREE.DoubleSide);
  assert.ok(mesh.material instanceof THREE.MeshLambertMaterial);
  assert.equal(mesh.material.polygonOffset, true);
  assert.equal(mesh.userData.vertexCount, 35);
  assert.equal(mesh.userData.kind, 'surface');
  assert.equal(mesh.userData.frame, true);
  assert.equal(mesh.userData.flags.length, 35);
  const wire = mesh.getObjectByName('wire');
  assert.ok(wire instanceof THREE.LineSegments);
  assert.equal(wire.geometry.attributes.position, mesh.geometry.attributes.position, 'wire shares the position attribute');
  const sq = surfaceFromFunction({ f: (z) => z, nx: 5, ny: 5 });
  assert.equal(sq.getObjectByName('wire').geometry.index.count, 80, '40 segments');
  const bare = surfaceFromFunction({ f: (z) => z, nx: 5, ny: 5, wire: false });
  assert.equal(bare.getObjectByName('wire'), undefined);
});

test('A3 surfaceFromFunction sanitises its inputs and survives a hostile f', () => {
  const m = surfaceFromFunction({ f: (z) => z, nx: 1, ny: 9999, xRange: [NaN, 3], yRange: 'no', clamp: -2 });
  assert.equal(m.userData.nx, 2);
  assert.equal(m.userData.ny, 512);
  assert.deepEqual(m.userData.xRange, [-2, 2]);
  assert.deepEqual(m.userData.yRange, [-2, 2]);
  assert.equal(m.userData.clamp, 6);
  assert.ok(m.geometry.index.array instanceof Uint16Array === (2 * 512 <= 65535));
  const hostile = surfaceFromFunction({
    f: (z) => { if (z.re > 0) throw new Error('boom'); if (z.im > 0) return 5; return { re: NaN, im: 0 }; }, nx: 4, ny: 4,
  });
  assert.equal(hostile.userData.nonFiniteCount, 16);
  assert.equal(hostile.userData.flaggedCount, 16);
  assert.ok(Array.from(hostile.geometry.attributes.position.array).every(Number.isFinite));
  const big = surfaceFromFunction({ f: (z) => z, nx: 300, ny: 300, wire: false });
  assert.ok(big.geometry.index.array instanceof Uint32Array, '90000 vertices need Uint32 indices');
  const flat = surfaceFromFunction({ f: (z) => z, xRange: [1, 1], nx: 3, ny: 3 });
  assert.equal(flat.userData.vertexCount, 9);
});

test('A3 modulus landscape of z^2: scene positions and hue colours', () => {
  const m = modulusLandscape({ f: z2, xRange: [-1, 1], yRange: [0, 1], nx: 3, ny: 2 });
  assert.equal(m.name, 'modulus-landscape');
  assert.equal(m.userData.kind, 'modulus-landscape');
  const want = [[-1, 1, 0], [0, 0, 0], [1, 1, 0], [-1, 2, -1], [0, 1, -1], [1, 2, -1]];
  want.forEach((p, k) => nearVec(vtx(m, k), p, 1e-12, `vertex ${k}`));
  const cols = [[0.9, 0.1, 0.1], [0.9, 0.1, 0.1], [0.9, 0.1, 0.1], [0.5, 0.1, 0.9], [0.1, 0.9, 0.9], [0.5, 0.9, 0.1]];
  cols.forEach((c, k) => nearVec(vcol(m, k), c, 1e-6, `colour ${k}`));
  nearVec(Array.from(m.geometry.attributes.color.array.slice(9, 12)), [0.21404114, 0.01002283, 0.78741229], 1e-7);
});

test('A3 clamp and non-finite flags (1/z, clamp 1.5)', () => {
  const m = modulusLandscape({ f: recip, xRange: [-1, 1], yRange: [-1, 1], nx: 5, ny: 5, clamp: 1.5 });
  const fl = m.userData.flags;
  assert.equal(fl[12], 2);
  near(vtx(m, 12)[1], 0, 0);
  nearVec(vcol(m, 12), [0.5, 0.5, 0.5], 1e-6);
  near(m.geometry.attributes.color.array[36], 0.21404114, 1e-7);
  for (const k of [7, 11, 13, 17]) { assert.equal(fl[k], 1, `vertex ${k}`); near(vtx(m, k)[1], 1.5, 1e-6); }
  assert.equal(m.userData.clampedCount, 4);
  assert.equal(m.userData.nonFiniteCount, 1);
  assert.equal(m.userData.flaggedCount, 5);
  nearVec(vcol(m, 13), [0.66, 0.34, 0.34], 1e-6);
  for (let k = 0; k < 25; k++) assert.ok(Math.abs(vtx(m, k)[1]) <= 1.5 + 1e-6);
});

test('A3 winding: a constant surface has upward normals', () => {
  const m = surfaceFromFunction({ f: () => ({ re: 1, im: 0 }), nx: 3, ny: 3 });
  const n = m.geometry.attributes.normal.array;
  for (let k = 0; k < 9; k++) { assert.ok(n[3 * k + 1] > 0.999, `normal ${k}`); near(vtx(m, k)[1], 1, 1e-12); }
});

test('A3 reImSurface of z^2', () => {
  const im = reImSurface({ f: z2, part: 'im', xRange: [-1, 1], yRange: [-1, 1], nx: 3, ny: 3 });
  assert.equal(im.name, 'im-surface');
  nearVec(vtx(im, 8), [1, 2, -1], 1e-12);
  nearVec(vcol(im, 8), [33 / 255, 145 / 255, 140 / 255], 1e-6);
  nearVec(vtx(im, 5), [1, 0, 0], 1e-12);
  nearVec(vcol(im, 5), [253 / 255, 231 / 255, 37 / 255], 1e-6);
  const re = reImSurface({ f: z2, part: 're', xRange: [-1, 1], yRange: [-1, 1], nx: 3, ny: 3 });
  assert.equal(re.name, 're-surface');
  nearVec(vtx(re, 8), [1, 0, -1], 1e-12);
  nearVec(vcol(re, 8), [253 / 255, 231 / 255, 37 / 255], 1e-6);
  nearVec(vtx(re, 5), [1, 1, 0], 1e-12);
  nearVec(vcol(re, 5), [33 / 255, 145 / 255, 140 / 255], 1e-6);
});

test('A3 riemannSurfaceRoot', () => {
  const d = riemannSurfaceRoot();
  assert.equal(d.geometry.attributes.position.count, 3625);
  assert.equal(d.geometry.index.count, 20736);
  assert.equal(d.name, 'riemann-root');
  assert.equal(d.userData.frame, true);
  const m = riemannSurfaceRoot({ n: 2, rMax: 1, nr: 2, nTheta: 4, part: 'im' });
  assert.equal(m.geometry.attributes.position.count, 27);
  assert.equal(m.geometry.index.count, 96);
  const at = (i, j) => i + 9 * j;
  nearVec(vtx(m, at(1, 2)), [0, 0.7071067812, -1], 1e-6);
  nearVec(vtx(m, at(5, 2)), [0, -0.7071067812, -1], 1e-6);
  nearVec(vtx(m, at(8, 2)), vtx(m, at(0, 2)), 1e-12, 'the surface closes after n turns');
  nearVec(vtx(m, at(0, 2)), [1, 0, 0], 1e-6);
  nearVec(vcol(m, at(1, 2)), [0.6269017899, 0.8369663015, 0.2852273439], 1e-6);
  // the seam normals match
  const nrm = m.geometry.attributes.normal.array;
  for (let j = 0; j < 3; j++) for (let c = 0; c < 3; c++) near(nrm[3 * at(0, j) + c], nrm[3 * at(8, j) + c], 1e-12);
  // the branch point is the origin and all the sheets meet there
  nearVec(vtx(m, at(3, 0)), [0, 0, 0], 1e-12);
  const re3 = riemannSurfaceRoot({ n: 3, part: 're', wire: false });
  assert.equal(re3.getObjectByName('wire'), undefined);
});

test('A3 graph4D: scene positions, colours, in-place updates', () => {
  const g = graph4D({ f: (z) => z, xRange: [-1, 1], yRange: [-1, 1], nx: 3, ny: 3, angles: { uv: Math.PI / 2 } });
  assert.equal(g.mesh.geometry.attributes.position.count, 9);
  assert.equal(g.mesh.name, 'graph4d');
  assert.equal(g.mesh.userData.vertexCount, 9);
  nearVec(vtx(g.mesh, 8), [1, -1, -1], 1e-6);
  nearVec(vcol(g.mesh, 8), [94 / 255, 201 / 255, 98 / 255], 1e-6);
  const posBefore = g.mesh.geometry.attributes.position;
  const colBefore = g.mesh.geometry.attributes.color;
  const v0 = g.mesh.userData.version;
  g.setAngles({ uv: 0, yv: Math.PI / 2 });
  assert.equal(g.mesh.geometry.attributes.position, posBefore, 'same attribute instance');
  assert.equal(g.mesh.geometry.attributes.color, colBefore);
  assert.ok(g.mesh.userData.version > v0);
  nearVec(vtx(g.mesh, 8), [1, 1, 1], 1e-6);
  nearVec(vcol(g.mesh, 8), [94 / 255, 201 / 255, 98 / 255], 1e-6);
  assert.deepEqual(g.mesh.userData.angles, { uv: 0, yv: Math.PI / 2 });
  g.setAngles({ uv: 0.4 });                                   // missing keys keep their value
  assert.deepEqual(g.mesh.userData.angles, { uv: 0.4, yv: Math.PI / 2 });
  g.setAngles({ uv: NaN });
  assert.equal(g.mesh.userData.angles.uv, 0.4);

  const sq = graph4D({ f: z2, xRange: [-1, 1], yRange: [-1, 1], nx: 3, ny: 3 });
  sq.setAngles({ uv: Math.PI / 2, yv: Math.PI / 2 });
  nearVec(vtx(sq.mesh, 8), [1, -2, 0], 1e-6);                 // maths [1, 0, -2]
  assert.ok(Math.abs(vtx(sq.mesh, 8)[2]) < 1e-6);
});

test('A3 graph4D equals toScene(project4to3(rotate4(...))) for random angles', () => {
  const angles = { uv: 0.7, yv: -1.3 };
  // clamp 10 so that no value of z^2 on [-2,2]^2 (largest component 8) is clamped before the rotation
  const g = graph4D({ f: z2, xRange: [-2, 2], yRange: [-2, 2], nx: 9, ny: 9, angles, clamp: 10 });
  for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
    const x = -2 + 4 * i / 8, y = -2 + 4 * j / 8, w = z2(C(x, y));
    const want = toScene(project4to3(rotate4([x, y, w.re, w.im], angles)));
    nearVec(vtx(g.mesh, i + 9 * j), want, 1e-5, `vertex ${i},${j}`);
  }
  // with the default clamp (6) the base u and v are clamped BEFORE the rotation: z^2 at -2-2i is 8i, drawn as 6i
  const c6 = graph4D({ f: z2, xRange: [-2, 2], yRange: [-2, 2], nx: 9, ny: 9, angles: { uv: 0, yv: 0 } });
  nearVec(vtx(c6.mesh, 0), toScene([-2, -2, 0]), 1e-6, 'u = 0 is not clamped');
  c6.setAngles({ uv: Math.PI / 2 });
  nearVec(vtx(c6.mesh, 0), toScene([-2, -2, -6]), 1e-6, 'v = 8 is clamped to 6, then rotated into the height');
  // setFunction re-fills and keeps the angles
  g.setFunction((z) => z);
  assert.deepEqual(g.mesh.userData.angles, angles);
  const want = toScene(project4to3(rotate4([2, 2, 2, 2], angles)));
  nearVec(vtx(g.mesh, 80), want, 1e-5);
  // dispose detaches the mesh and fires dispose events
  const parent = new THREE.Group();
  parent.add(g.mesh);
  let fired = 0;
  g.mesh.geometry.addEventListener('dispose', () => fired++);
  g.dispose();
  assert.equal(g.mesh.parent, null);
  assert.equal(fired, 1);
});

test('A3 graph4D flags non-finite and clamped vertices as grey', () => {
  const g = graph4D({ f: recip, xRange: [-1, 1], yRange: [-1, 1], nx: 5, ny: 5, clamp: 1.5 });
  nearVec(vcol(g.mesh, 12), [0.5, 0.5, 0.5], 1e-6);
  assert.ok(Array.from(g.mesh.geometry.attributes.position.array).every(Number.isFinite));
});

// ------------------------------------------------------------------------------------------------
// A3: helix
// ------------------------------------------------------------------------------------------------

test('A3 argHelix beads and the jump at the seam', () => {
  const h = argHelix({ z: C(-1, Math.sqrt(3)) });
  const u = h.group.userData;
  assert.equal(u.beads.length, 5);
  nearVec(u.beads.map((b) => b.position.y), [-2.0, -0.8, 0.4, 1.6, 2.8], 1e-6);
  nearVec(u.beads[2].position.toArray(), [-1, 0.4, -1.7320508], 1e-6);
  nearVec(u.floorPoint.position.toArray(), [-1, 0, -1.7320508], 1e-6);
  assert.ok(u.beads[2].scale.x > u.beads[1].scale.x, 'home bead is larger');
  assert.equal(u.pitch, HELIX_PITCH);

  h.update(C(1, 0));
  nearVec(u.beads.map((b) => b.position.y), [-2.4, -1.2, 0, 1.2, 2.4], 1e-6);
  h.update(C(-1, 0));
  nearVec(u.beads.map((b) => b.position.y), [-1.8, -0.6, 0.6, 1.8, 3.0], 1e-6);
  h.update(C(-1, 1e-9));
  near(u.beads[2].position.y, 0.6, 1e-6);
  h.update(C(-1, -1e-9));
  near(u.beads[2].position.y, -0.6, 1e-6);
  nearVec(u.beads.map((b) => b.position.y), [-3.0, -1.8, -0.6, 0.6, 1.8], 1e-6);

  h.update(C(1, 1e-9), 0);
  near(u.beads[2].position.y, 0, 1e-6);
  assert.equal(u.seam, 0);
  h.update(C(1, -1e-9), 0);
  near(u.beads[2].position.y, 1.2, 1e-6);

  h.update(C(NaN, 0));
  assert.ok(u.beads.every((b) => !b.visible));
  assert.equal(u.fibre.visible, false);
  assert.equal(u.floorPoint.visible, false);
  h.update(C(1, 1));
  assert.ok(u.beads.every((b) => b.visible));
  h.update(C(0, 0), -Math.PI);
  nearVec(u.beads.map((b) => b.position.y), [-2.4, -1.2, 0, 1.2, 2.4], 1e-6);
});

test('A3 argHelix: the home sheet moves with the seam and the ribbon covers every bead', () => {
  const h = argHelix({ z: C(1, 1), turns: 3, seam: -Math.PI });
  const home = h.group.userData.homeSheet.geometry.attributes.position;
  const y0 = Array.from(home.array).filter((_, i) => i % 3 === 1);
  near(Math.min(...y0), HELIX_PITCH * -0.5, 1e-6);
  near(Math.max(...y0), HELIX_PITCH * 0.5, 1e-6);
  h.update(C(1, 1), 0);
  const y1 = Array.from(home.array).filter((_, i) => i % 3 === 1);
  near(Math.min(...y1), 0, 1e-6);
  near(Math.max(...y1), HELIX_PITCH, 1e-6);
  const ghost = h.group.userData.ghostSheet.geometry.attributes.position;
  const gy = Array.from(ghost.array).filter((_, i) => i % 3 === 1);
  near(Math.max(...gy), HELIX_PITCH * 3.5, 1e-5);          // (2*turns+1) pi / 2 pi = turns + 1/2 turns of height
  assert.equal(h.group.userData.beads.length, 7);
});

// ------------------------------------------------------------------------------------------------
// A3: sphere
// ------------------------------------------------------------------------------------------------

test('A3 riemannSphere projections and body', () => {
  const s = riemannSphere();
  const p = (z) => s.project(z).toArray();
  nearVec(p(C(1, 0)), [1, 0, 0]);
  nearVec(p(C(0, 0)), [0, -1, 0]);
  nearVec(p(C(0, 1)), [0, 0, -1]);
  nearVec(p(C(2, 0)), [0.8, 0.6, 0]);
  nearVec(p(C(Infinity, 0)), [0, 1, 0]);
  nearVec(riemannSphere({ radius: 2 }).project(C(0, 1)).toArray(), [0, 0, -2]);
  const body = s.group.getObjectByName('sphere-body');
  assert.equal(body.geometry.attributes.position.count, 3185);
  assert.equal(s.group.userData.kind, 'riemann-sphere');
  assert.equal(s.curves.parent, s.group);
  assert.ok(s.group.getObjectByName('sphere-equator'));
  assert.ok(s.group.getObjectByName('sphere-real-axis') && s.group.getObjectByName('sphere-imag-axis'));
  assert.equal(s.group.userData.axisLine.visible, false);
  s.showAxis(true);
  assert.equal(s.group.userData.axisLine.visible, true);
  s.markInfinity(false);
  assert.equal(s.group.userData.infinityMarker.visible, false);
  s.markInfinity(true);
  assert.equal(s.group.userData.infinityMarker.visible, true);
  s.markInfinity();
  assert.equal(s.group.userData.infinityMarker.visible, true, 'defaults to on');
});

test('A3 sphere curves: slerp subdivision, infinity, gaps, time ramp, clear', () => {
  const s = riemannSphere();
  const line = s.addCurve([C(1, 0), C(0, 1)], '--input');
  assert.equal(line.isLine, true);
  assert.equal(s.curves.children.length, 1);
  assert.equal(line.geometry.attributes.position.count, 40, '20 segments');
  const pos = line.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) near(Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)), 1.004, 1e-6, `vertex ${i}`);
  let fired = 0;
  line.geometry.addEventListener('dispose', () => fired++);
  s.clearCurves();
  assert.equal(s.curves.children.length, 0);
  assert.equal(fired, 1);

  const inf = s.addCurve([C(1e6, 0), C(Infinity, 0), C(-1e6, 0)], '--input');
  const ip = inf.geometry.attributes.position;
  assert.ok(Array.from(ip.array).every(Number.isFinite));
  nearVec([ip.getX(1), ip.getY(1), ip.getZ(1)], [0, 1.004, 0], 1e-5);

  const gap = s.addCurve([C(1, 0), C(NaN, 0), C(0, 1), C(-1, 0)], '--input');
  assert.equal(gap.geometry.attributes.position.count, 40, 'only the arc from i to -1');
  for (let i = 0; i < 40; i++) assert.ok(gap.geometry.attributes.position.getX(i) <= 1e-6, 'nothing bridges the gap or reaches 1');

  const timed = s.addCurve([{ re: 1, im: 0, t: 0 }, { re: 0, im: 1, t: 1 }], '--input');
  const c = timed.geometry.attributes.color;
  const first = [c.getX(0), c.getY(0), c.getZ(0)], last = [c.getX(c.count - 1), c.getY(c.count - 1), c.getZ(c.count - 1)];
  assert.notDeepEqual(first, last, 'time ramp changes the colour along the stroke');
  assert.ok(timed.userData.dots, 'time dots');
  const flat = s.addCurve([C(1, 0), C(0, 1)], '--input');
  const fc = flat.geometry.attributes.color;
  for (let i = 1; i < fc.count; i++) assert.deepEqual([fc.getX(i), fc.getY(i), fc.getZ(i)], [fc.getX(0), fc.getY(0), fc.getZ(0)]);
  assert.equal(flat.userData.dots, null);

  // antipodal segment: broken, not drawn through the centre
  const anti = s.addCurve([C(0, 0), C(Infinity, 0)], '--input');
  assert.equal(anti.geometry.attributes.position.count, 0);
  const emptyOk = s.addCurve([], '--input');
  assert.equal(emptyOk.geometry.attributes.position.count, 0);
});

// ------------------------------------------------------------------------------------------------
// A3: lines, markers, dispose, auto redraw
// ------------------------------------------------------------------------------------------------

test('A3 curveToLine', () => {
  const l = curveToLine([[0, 0, 0], [1, 2, 3]], '--cart');
  assert.equal(l.isLine, true);
  nearVec(vtx(l, 0), [0, 0, 0], 0); nearVec(vtx(l, 1), [1, 3, -2], 1e-12);
  assert.equal(l.geometry.index.count, 2);
  const broken = curveToLine([[0, 0, 0], [1, 0, 0], [NaN, 0, 0], [2, 0, 0], [3, 0, 0]], '--output');
  assert.deepEqual(Array.from(broken.geometry.index.array), [0, 1, 3, 4], 'the NaN point breaks the line');
  assert.ok(Array.from(broken.geometry.attributes.position.array).every(Number.isFinite));
  const four = curveToLine([[0, 0, 0], [1, 0, 0], [NaN, 0, 0], [3, 0, 0]]);
  assert.deepEqual(Array.from(four.geometry.index.array), [0, 1], 'only the first pair survives');
  const lastPair = curveToLine([[0, 0, 0], [NaN, 0, 0], [2, 0, 0], [3, 0, 0]]);
  assert.deepEqual(Array.from(lastPair.geometry.index.array), [2, 3], 'only the last pair is a segment');
  const attr = l.geometry.attributes.position;
  l.userData.update([[5, 5, 5], [6, 6, 6]]);
  assert.equal(l.geometry.attributes.position, attr, 'same count keeps the attribute object');
  nearVec(vtx(l, 0), [5, 5, -5], 1e-12);
  l.userData.update([[0, 0, 0], [1, 1, 1], [2, 2, 2]]);
  assert.notEqual(l.geometry.attributes.position, attr);
  assert.equal(l.geometry.attributes.position.count, 3);
  assert.equal(curveToLine([]).geometry.index.count, 0);
  assert.equal(curveToLine([[NaN, 0, 0]]).geometry.index.count, 0);
});

test('A3 createMarker', () => {
  const m = createMarker({ position: [1, 2, 3] });
  nearVec(m.position.toArray(), [1, 3, -2], 1e-12);
  m.userData.setPosition([0, 0, 1]);
  nearVec(m.position.toArray(), [0, 1, 0], 1e-12);
  m.userData.setPosition([NaN, 0, 0]);
  nearVec(m.position.toArray(), [0, 1, 0], 1e-12, 'a bad position is ignored');
});

test('A3 disposeObject is complete, idempotent and null-safe', () => {
  const parent = new THREE.Group();
  const group = new THREE.Group();
  parent.add(group);
  const tex = new THREE.DataTexture(new Uint8Array([1, 2, 3, 255]), 1, 1);
  const geom = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  group.add(new THREE.Mesh(geom, mat));
  const events = [];
  geom.addEventListener('dispose', () => events.push('geometry'));
  mat.addEventListener('dispose', () => events.push('material'));
  tex.addEventListener('dispose', () => events.push('texture'));
  disposeObject(group);
  assert.deepEqual(events.sort(), ['geometry', 'material', 'texture']);
  assert.equal(group.parent, null);
  assert.doesNotThrow(() => disposeObject(group));
  assert.doesNotThrow(() => disposeObject(null));
  assert.doesNotThrow(() => disposeObject(undefined));
  // arrays of materials
  const a = new THREE.MeshBasicMaterial(), b = new THREE.MeshBasicMaterial();
  let n = 0;
  a.addEventListener('dispose', () => n++); b.addEventListener('dispose', () => n++);
  disposeObject(new THREE.Mesh(new THREE.BufferGeometry(), [a, b]));
  assert.equal(n, 2);
});

test('A3 mutators notify the views an object was added to (auto redraw)', () => {
  const g = graph4D({ f: (z) => z, nx: 4, ny: 4 });
  let calls = 0;
  const fn = () => calls++;
  const root = new THREE.Group();
  root.add(g.mesh);
  root.userData.__render = new Set([fn]);              // what view.add registers on its root
  g.setAngles({ uv: 0.3 });
  assert.equal(calls, 1);
  g.setFunction((z) => z);
  assert.equal(calls, 2);

  const sph = riemannSphere();
  let sc = 0;
  sph.group.userData.__render = new Set([() => sc++]);
  sph.addCurve([C(1, 0), C(0, 1)]); sph.setHalfTurn(1); sph.showAxis(true); sph.markInfinity(false); sph.clearCurves();
  assert.equal(sc, 5);

  const marker = createMarker();
  let mc = 0;
  marker.userData.__render = new Set([() => mc++]);
  marker.userData.setPosition([1, 1, 1]);
  assert.equal(mc, 1);

  const line = curveToLine([[0, 0, 0], [1, 1, 1]]);
  let lc = 0;
  line.userData.__render = new Set([() => lc++]);
  line.userData.update([[0, 0, 0], [2, 2, 2]]);
  assert.equal(lc, 1);

  const h = argHelix({});
  let hc = 0;
  h.group.userData.__render = new Set([() => hc++]);
  h.update(C(1, 1));
  assert.equal(hc, 1);
});

test('A3 builders never log to the console on the happy path', () => {
  const orig = { log: console.log, warn: console.warn, error: console.error };
  const seen = [];
  console.log = console.warn = console.error = (...a) => seen.push(a.join(' '));
  try {
    modulusLandscape({ f: z2, nx: 12, ny: 12 });
    reImSurface({ f: z2, part: 'im', nx: 12, ny: 12 });
    riemannSurfaceRoot({ n: 3 });
    graph4D({ f: z2, nx: 12, ny: 12 }).setAngles({ uv: 1 });
    argHelix({}).update(C(2, 1));
    const s = riemannSphere();
    s.addCurve([C(1, 0), C(0, 1)]);
    curveToLine([[0, 0, 0], [1, 1, 1]]);
  } finally { Object.assign(console, orig); }
  assert.deepEqual(seen, []);
});
