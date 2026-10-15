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

test('A3 graph4D: the wire overlay shares the positions and its cached bounds follow setAngles', () => {
  const g = graph4D({ f: z2, xRange: [-2, 2], yRange: [-2, 2], nx: 17, ny: 17, clamp: 10 });
  const wire = g.mesh.getObjectByName('wire');
  assert.ok(wire && wire.isLineSegments);
  assert.equal(wire.geometry.attributes.position, g.mesh.geometry.attributes.position, 'shared positions');
  new THREE.Box3().setFromObject(g.mesh);                     // what the first fitTo does: it caches the wire bounds
  const before = wire.geometry.boundingBox.clone();
  g.setAngles({ uv: 0.6, yv: 0.9 });
  const meshBox = g.mesh.geometry.boundingBox, wireBox = wire.geometry.boundingBox;
  assert.ok(!before.equals(meshBox), 'the rotation moved the bounds (otherwise this test proves nothing)');
  nearVec(wireBox.min.toArray(), meshBox.min.toArray(), 1e-6, 'wire min follows the mesh');
  nearVec(wireBox.max.toArray(), meshBox.max.toArray(), 1e-6, 'wire max follows the mesh');
  const union = new THREE.Box3().setFromObject(g.mesh);
  nearVec(union.min.toArray(), meshBox.min.toArray(), 1e-6, 'a later fitTo (Box3.setFromObject) is not widened by a stale wire box');
  nearVec(union.max.toArray(), meshBox.max.toArray(), 1e-6);
  near(wire.geometry.boundingSphere.radius, g.mesh.geometry.boundingSphere.radius, 1e-4, 'wire sphere follows too');
  g.setFunction((z) => ({ re: 3 * z.re, im: 3 * z.im }));
  nearVec(wire.geometry.boundingBox.max.toArray(), g.mesh.geometry.boundingBox.max.toArray(), 1e-6, 'setFunction as well');
  const bare = graph4D({ f: z2, wire: false, nx: 4, ny: 4 });
  assert.doesNotThrow(() => bare.setAngles({ uv: 1 }), 'no wire, no problem');
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

test('A3 argHelix: the point z is drawn after the sheets and after every bead (two-address colour code)', () => {
  // An opaque material is drawn in the opaque pass, before the translucent sheets, which then blend over it: the dot
  // turned brown above the real axis and blue below it. Pin the draw-order contract in Node.
  const u = argHelix({ z: C(-1, Math.sqrt(3)), turns: 3 }).group.userData;
  const fp = u.floorPoint;
  assert.equal(fp.material.transparent, true, 'transparent pass, so renderOrder sorts it after the sheets');
  assert.equal(fp.material.opacity, 1, 'but fully opaque');
  assert.equal(fp.material.depthTest, false, 'never swallowed by the larger home bead when Arg z is near 0');
  const others = [u.homeSheet, u.ghostSheet, u.seamRay, ...u.beads];
  for (const o of others) assert.ok(fp.renderOrder > o.renderOrder, `${o.name} (renderOrder ${o.renderOrder}) is drawn before the point (${fp.renderOrder})`);
  for (const b of u.beads) assert.equal(b.material.transparent, true, 'beads are in the transparent pass too');
  for (const sheet of [u.homeSheet, u.ghostSheet]) assert.equal(sheet.material.transparent, true);
  // the colour stays the Cartesian token (theme refresh keeps it), and createMarker follows the same rule
  const mk = createMarker({ color: '--cart' });
  assert.equal(mk.material.transparent, true);
  assert.equal(mk.material.opacity, 1);
  assert.equal(mk.renderOrder, 3);
  assert.equal(riemannSphere().group.getObjectByName('sphere-infinity').children[0].material.transparent, true);
});

test('A3 argHelix: the seam is a flat dashed strip that lifts clear of the axis line and moves in place', () => {
  const h = argHelix({ z: C(1, 1), turns: 2, rMax: 3, seam: -Math.PI });
  const ray = h.group.userData.seamRay;
  assert.equal(ray.isMesh, true, 'a strip, not a 1 px line (a line along -x is hidden under the axis line)');
  assert.equal(ray.name, 'helix-seam');
  const pos = ray.geometry.attributes.position;
  const nDash = Math.ceil(3 / 0.2);
  assert.equal(pos.count, 4 * nDash);
  assert.equal(ray.geometry.index.count, 6 * nDash);
  const xs = [], ys = [], zs = [];
  for (let k = 0; k < pos.count; k++) { const p = vtx(ray, k); xs.push(p[0]); ys.push(p[1]); zs.push(p[2]); }
  // seam -pi: the strip runs along the negative real axis (scene -x), centred on it, a hair above the floor
  assert.ok(Math.max(...xs) <= 1e-6 && Math.min(...xs) >= -3 - 1e-6, 'x in [-rMax, 0]');
  near(Math.min(...xs), -2.92, 1e-6, 'the last dash (2.8 to 2.92) ends in the gap before rMax');
  near(Math.max(...zs), 0.06, 1e-6, 'half width 0.06 either side of the axis');
  near(Math.min(...zs), -0.06, 1e-6);
  assert.ok(ys.every((y) => y > 0 && y < 0.02), 'lifted a hair above the floor');
  assert.equal(ray.material.transparent, true);
  assert.equal(ray.material.depthWrite, false);
  assert.equal(ray.material.polygonOffset, true);
  // a dash is 0.12 long with a 0.08 gap: the first two dashes start at 0 and 0.2 along the ray
  near(Math.abs(vtx(ray, 0)[0]), 0, 1e-6); near(Math.abs(vtx(ray, 2)[0]), 0.12, 1e-6); near(Math.abs(vtx(ray, 4)[0]), 0.2, 1e-6);
  // moving the seam rewrites the same attribute in place, to the new direction, and refreshes the cached bounds
  new THREE.Box3().setFromObject(h.group);                    // the first fitTo caches the strip's bounds
  h.update(C(1, 1), Math.PI / 2);
  assert.equal(ray.geometry.attributes.position, pos, 'same attribute instance');
  const q = []; for (let k = 0; k < pos.count; k++) q.push(vtx(ray, k));
  assert.ok(q.every((p) => Math.abs(p[0]) <= 0.06 + 1e-6), 'seam pi/2 is the +y axis, scene -z');
  near(Math.min(...q.map((p) => p[2])), -2.92, 1e-6);
  assert.equal(h.group.userData.seam, Math.PI / 2);
  const box = new THREE.Box3().setFromObject(ray);            // reads the cached bounds: they must have been refreshed
  near(box.min.z, -2.92, 1e-6, 'cached bounds follow the seam (min z)');
  near(box.min.x, -0.06, 1e-6, 'cached bounds follow the seam (min x)');
  near(box.max.x, 0.06, 1e-6, 'cached bounds follow the seam (max x)');
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

// ------------------------------------------------------------------------------------------------
// Iteration 1 residue (group C2): frameLabels, sphere curve options, tubes, hiddenScale, domainSphere, tightFrame
// ------------------------------------------------------------------------------------------------

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const mixc = (a, b, k) => a.map((v, i) => v * (1 - k) + b[i] * k);
// the colour a sphere stroke of token `base` has at time t with ramp weight w (Node has no DOM: the light fallback tokens are used)
const rampAt = (base, t, w = 0.4) => mixc(hexRgb(base), mixc(hexRgb('#1e293b'), hexRgb('#d97706'), t), w);
const colAt = (obj, k) => vcol(obj, k);
const stroke = (n = 41) => Array.from({ length: n }, (_, k) => { const a = 2 * Math.PI * k / (n - 1); return { re: 1 + Math.cos(a), im: Math.sin(a), t: k / (n - 1) }; });

test('C2 riemannSphere frameLabels: the default frame radius is the ball, true frames the labels as well', () => {
  assert.equal(riemannSphere().group.userData.frameRadius, 1, 'default unchanged');
  assert.equal(riemannSphere({ radius: 2 }).group.userData.frameRadius, 2);
  assert.equal(riemannSphere({ frameLabels: false }).group.userData.frameRadius, 1);
  const f = riemannSphere({ frameLabels: true });
  near(f.group.userData.frameRadius, 1.2, 1e-12);
  near(riemannSphere({ radius: 2.5, frameLabels: true }).group.userData.frameRadius, 3, 1e-12);
  assert.equal(f.group.userData.radius, 1, 'the radius itself does not change');
  assert.equal(f.group.userData.frame, true);
  // the labels sit at 1.14 R: inside the 1.2 R ball that is framed (their text is drawn by sprites in the browser, see the interaction script)
  assert.ok(1.14 < f.group.userData.frameRadius);
});

test('C2 sphere addCurve: no options means exactly the old stroke; rampWeight is opt-in', () => {
  const s = riemannSphere();
  const pts = stroke();
  const dflt = s.addCurve(pts, '--polar');
  assert.equal(dflt.isLineSegments, true);
  assert.equal(dflt.userData.lineWidth, 0);
  assert.equal(dflt.userData.rampWeight, 0.4);
  for (const junk of [null, undefined, 3, 'x', [], {}, { rampWeight: NaN }, { rampWeight: 'a' }, { lineWidth: NaN }, { lineWidth: -1 }, { lineWidth: 0 }]) {
    const same = s.addCurve(pts, '--polar', junk);
    assert.deepEqual(Array.from(same.geometry.attributes.color.array), Array.from(dflt.geometry.attributes.color.array), `options ${JSON.stringify(junk)}`);
    assert.deepEqual(Array.from(same.geometry.attributes.position.array), Array.from(dflt.geometry.attributes.position.array));
    assert.equal(same.isLineSegments, true);
  }
  // the old formula, pinned: the first vertex is t = 0, the last t = 1
  const n = dflt.geometry.attributes.color.count;
  nearVec(colAt(dflt, 0), rampAt('#c2410c', 0), 1e-6, 'default t = 0');
  nearVec(colAt(dflt, n - 1), rampAt('#c2410c', 1), 1e-6, 'default t = 1');

  const flat = s.addCurve(pts, '--polar', { rampWeight: 0 });
  for (let k = 0; k < n; k++) nearVec(colAt(flat, k), hexRgb('#c2410c'), 1e-6, `rampWeight 0, vertex ${k}`);
  const bare = s.addCurve(pts, '--polar', { rampWeight: 1 });
  nearVec(colAt(bare, 0), hexRgb('#1e293b'), 1e-6, 'rampWeight 1 is the bare ramp: --t0 at t = 0');
  nearVec(colAt(bare, n - 1), hexRgb('#d97706'), 1e-6, 'and --t1 at t = 1');
  nearVec(colAt(s.addCurve(pts, '--polar', { rampWeight: 7 }), 0), colAt(bare, 0), 1e-12, 'clamped to 1');
  nearVec(colAt(s.addCurve(pts, '--polar', { rampWeight: -3 }), 0), colAt(flat, 0), 1e-12, 'clamped to 0');

  // the point of the request: with a lighter weight the polar orange stays orange at t = 0 (closer to --polar than the default is)
  const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const light = s.addCurve(pts, '--polar', { rampWeight: 0.15 });
  nearVec(colAt(light, 0), rampAt('#c2410c', 0, 0.15), 1e-6);
  assert.ok(dist(colAt(light, 0), hexRgb('#c2410c')) < 0.5 * dist(colAt(dflt, 0), hexRgb('#c2410c')), 'lighter ramp keeps the family colour');
  // the dots follow the same weight
  const dc = light.userData.dots.geometry.attributes.color;
  nearVec([dc.getX(0), dc.getY(0), dc.getZ(0)].map(linearToSrgb), rampAt('#c2410c', 0, 0.15), 1e-6, 'dot at t = 0');
  // a curve without t has no ramp, so the weight has nothing to do
  const noT = s.addCurve([C(1, 0), C(0, 1)], '--polar', { rampWeight: 1 });
  nearVec(colAt(noT, 3), hexRgb('#c2410c'), 1e-6);
});

test('C2 sphere addCurve lineWidth: a tube of constant world width carries the time ramp', () => {
  const s = riemannSphere();
  const pts = stroke(33);
  const thin = s.addCurve(pts, '--input');
  const tube = s.addCurve(pts, '--input', { lineWidth: 0.04 });
  assert.equal(tube.isMesh, true);
  assert.equal(tube.isLineSegments, undefined);
  assert.equal(tube.material.vertexColors, true);
  assert.equal(tube.userData.kind, 'sphere-curve');
  assert.equal(tube.userData.lineWidth, 0.04);
  assert.equal(s.curves.children.includes(tube), true);
  const pos = tube.geometry.attributes.position;
  const V = pos.count;
  assert.equal(V % 6, 0, 'six corners per ring');
  assert.equal(tube.geometry.index.count, 36 * (V / 6 - 1), 'six quads of two triangles between each pair of rings, one run');
  assert.equal(tube.geometry.attributes.color.count, V);
  // the cross-section holds the radial direction: every corner is within the tube radius of the lifted sphere
  const L = 1.004, r = 0.02;
  for (let i = 0; i < V; i++) {
    const d = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i));
    assert.ok(d <= L + r + 1e-6 && d >= L - r - 1e-6, `vertex ${i} at ${d}`);
  }
  // each ring is a regular hexagon of radius r around a point of the stroke: centre = the mean of its six corners
  for (const k of [0, 5, V / 6 - 1]) {
    const c = [0, 1, 2].map((a) => { let m = 0; for (let j = 0; j < 6; j++) m += [pos.getX, pos.getY, pos.getZ][a].call(pos, 6 * k + j); return m / 6; });
    near(Math.hypot(...c), L, 2e-4, `ring ${k} lies on the lifted sphere`);
    for (let j = 0; j < 6; j++) near(Math.hypot(pos.getX(6 * k + j) - c[0], pos.getY(6 * k + j) - c[1], pos.getZ(6 * k + j) - c[2]), r, 1e-6, `ring ${k} corner ${j}`);
  }
  // the ramp: first ring is t = 0, last ring t = 1, and a ring has one colour
  nearVec(colAt(tube, 0), rampAt('#0f766e', 0), 1e-6);
  nearVec(colAt(tube, 5), rampAt('#0f766e', 0), 1e-6, 'a ring has one colour');
  nearVec(colAt(tube, V - 1), rampAt('#0f766e', 1), 1e-6);
  nearVec(colAt(thin, 0), colAt(tube, 0), 1e-6, 'the same colour as the thin stroke');
  assert.ok(tube.userData.dots, 'the time dots are still there');
  // the ramp weight applies to tubes too, and theme refresh repaints
  const flat = s.addCurve(pts, '--input', { lineWidth: 0.04, rampWeight: 0 });
  nearVec(colAt(flat, V - 1), hexRgb('#0f766e'), 1e-6);
  flat.userData.themeRefresh();
  nearVec(colAt(flat, 0), hexRgb('#0f766e'), 1e-6);
  // never wider than half the radius, and a bigger sphere scales the cap
  assert.equal(s.addCurve(pts, '--input', { lineWidth: 50 }).userData.lineWidth, 0.5);
  assert.equal(riemannSphere({ radius: 4 }).addCurve(pts, '--input', { lineWidth: 50 }).userData.lineWidth, 2);
  // a curve without t is one flat colour
  const noT = s.addCurve([C(1, 0), C(0, 1), C(-1, 0)], '--output', { lineWidth: 0.04 });
  nearVec(colAt(noT, 7), hexRgb('#7c3aed'), 1e-6);
  assert.equal(noT.userData.dots, null);
  // half-turn: the tube is in the curves group, which turns
  s.setHalfTurn(Math.PI);
  assert.equal(tube.parent, s.curves);
  near(s.curves.rotation.x, Math.PI, 0);
});

test('C2 sphere tubes: a gap in the stroke is a gap in the tube; empty and degenerate input draws nothing', () => {
  const s = riemannSphere();
  const ab = [C(1, 0), C(0, 1)], cd = [C(-1, 0), C(0, -1)];
  const w = { lineWidth: 0.03 };
  const one = s.addCurve(ab, '--input', w), two = s.addCurve(cd, '--input', w);
  const gap = s.addCurve([...ab, C(NaN, 0), ...cd], '--input', w);
  assert.equal(gap.geometry.attributes.position.count, one.geometry.attributes.position.count + two.geometry.attributes.position.count);
  assert.equal(gap.geometry.index.count, one.geometry.index.count + two.geometry.index.count, 'no triangle bridges the gap');
  const idx = gap.geometry.index.array, first = one.geometry.attributes.position.count;
  for (let i = 0; i < idx.length; i += 3) {
    const lo = idx[i] < first, a = idx[i + 1] < first, b = idx[i + 2] < first;
    assert.ok(lo === a && a === b, 'every triangle stays inside one run');
  }
  for (const bad of [[], [C(1, 0)], [C(0, 0), C(Infinity, 0)], [C(1, 0), C(1, 0), C(1, 0)], null]) {
    const t = s.addCurve(bad, '--input', w);
    assert.equal(t.geometry.attributes.position.count, 0, JSON.stringify(bad));
    assert.equal(t.geometry.index.count, 0);
  }
  // a stroke of 20000 points is still one cheap tube
  const big = Array.from({ length: 20001 }, (_, k) => ({ re: 1 + Math.cos(k / 3000), im: Math.sin(k / 3000), t: k / 20000 }));
  const t0 = Date.now();
  const tb = s.addCurve(big, '--input', w);
  assert.ok(Date.now() - t0 < 3000);
  assert.ok(tb.geometry.attributes.position.count > 65535, 'beyond 16-bit indices');
  assert.equal(tb.geometry.index.array.constructor, Uint32Array);
  assert.ok(Array.from(tb.geometry.attributes.position.array).every(Number.isFinite));
});

test('C2 curveToLine lineWidth: opt-in tube, one-pixel line otherwise', () => {
  const pts = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]];
  const plain = curveToLine(pts, '--cart');
  assert.equal(plain.isLineSegments, true);
  assert.equal(plain.userData.lineWidth, 0);
  for (const junk of [undefined, null, 4, 'x', {}, { lineWidth: 0 }, { lineWidth: -2 }, { lineWidth: NaN }, { lineWidth: 'wide' }, { lineWidth: Infinity }]) {
    const l = curveToLine(pts, '--cart', junk);
    assert.equal(l.isLineSegments, true, JSON.stringify(junk));
    assert.deepEqual(Array.from(l.geometry.index.array), Array.from(plain.geometry.index.array));
  }
  const t = curveToLine(pts, '--cart', { lineWidth: 0.1 });
  assert.equal(t.isMesh, true);
  assert.equal(t.material.isMeshBasicMaterial, true);
  assert.equal(t.userData.kind, 'line');
  assert.equal(t.userData.lineWidth, 0.1);
  assert.equal(t.frustumCulled, false);
  const pos = t.geometry.attributes.position;
  assert.equal(pos.count, 24);
  assert.equal(t.geometry.index.count, 3 * 36);
  // along the maths x axis (scene x): every corner is half the width from the axis, and the rings sit at x = 0, 1, 2, 3
  for (let i = 0; i < 24; i++) {
    near(Math.hypot(pos.getY(i), pos.getZ(i)), 0.05, 1e-6, `corner ${i}`);
    near(pos.getX(i), Math.floor(i / 6), 1e-6);
  }
  // along the maths y axis it is the scene -z axis: the frame convention holds for tubes
  const ty = curveToLine([[0, 0, 0], [0, 2, 0]], '--cart', { lineWidth: 0.1 });
  const py = ty.geometry.attributes.position;
  near(py.getZ(0), -0, 0.06); near(py.getZ(6), -2, 0.06);
  for (let i = 0; i < 12; i++) near(Math.hypot(py.getX(i), py.getY(i)), 0.05, 1e-6);
  // a height (maths h) is the scene y axis
  const th = curveToLine([[0, 0, 0], [0, 0, 3]], '--cart', { lineWidth: 0.1 });
  near(th.geometry.attributes.position.getY(6), 3, 0.06);
  // a non-finite point splits the tube, and nothing connects the two runs
  const broken = curveToLine([[0, 0, 0], [1, 0, 0], [NaN, 0, 0], [2, 0, 0], [3, 0, 0]], '--cart', { lineWidth: 0.1 });
  assert.equal(broken.geometry.attributes.position.count, 24);
  assert.equal(broken.geometry.index.count, 2 * 36);
  assert.ok(Array.from(broken.geometry.attributes.position.array).every(Number.isFinite));
  for (let i = 0; i < broken.geometry.index.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((o) => broken.geometry.index.array[i + o] < 12);
    assert.ok(a === b && b === c);
  }
  // update in place: the same size keeps the attribute objects, a new size replaces them
  const a0 = t.geometry.attributes.position, i0 = t.geometry.index;
  t.userData.update([[5, 5, 5], [6, 5, 5], [7, 5, 5], [8, 5, 5]]);
  assert.equal(t.geometry.attributes.position, a0);
  assert.equal(t.geometry.index, i0);
  for (let i = 0; i < 6; i++) { near(a0.getX(i), 5, 1e-6); near(Math.hypot(a0.getY(i) - 5, a0.getZ(i) + 5), 0.05, 1e-6, 'maths [5, 5, 5] is scene (5, 5, -5)'); }
  let freed = 0;
  t.geometry.addEventListener('dispose', () => freed++);
  t.userData.update([[0, 0, 0], [1, 1, 1]]);
  assert.notEqual(t.geometry.attributes.position, a0);
  assert.equal(t.geometry.attributes.position.count, 12);
  assert.equal(freed, 1, 'the replaced GL buffers are freed');
  t.userData.update([]);
  assert.equal(t.geometry.attributes.position.count, 0);
  assert.equal(t.geometry.index.count, 0);
  t.userData.update([[0, 0, 0], [0, 0, 0]]);                  // a duplicate point is not a segment
  assert.equal(t.geometry.index.count, 0);
  // theme refresh and auto redraw
  let redraws = 0;
  t.userData.__render = new Set([() => redraws++]);
  t.userData.update([[0, 0, 0], [1, 1, 1]]);
  assert.equal(redraws, 1);
  t.material.color.set(0);
  t.userData.themeRefresh();
  assert.ok(t.material.color.r > 0 || t.material.color.g > 0 || t.material.color.b > 0);
  assert.doesNotThrow(() => disposeObject(t));
  // a sharp corner and a 180 degree reversal still give finite geometry
  const sharp = curveToLine([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0], [0.5, 0, 0]], '--cart', { lineWidth: 0.05 });
  assert.ok(Array.from(sharp.geometry.attributes.position.array).every(Number.isFinite));
});

test('C2 graph4D hiddenScale: automatic by default, a fixed ramp range on request', () => {
  const mk = (extra = {}) => graph4D({ f: (z) => ({ re: z.re, im: z.im }), xRange: [-1, 1], yRange: [-1, 1], nx: 5, ny: 5, ...extra });
  const auto = mk();
  const bound = auto.mesh.userData.boundRadius;
  near(bound, Math.sqrt(1 + 1 + 1 + 1), 1e-9, 'norm bound of (x, y, u, v) = (x, y, x, y) at the corner');
  assert.equal(auto.mesh.userData.hiddenScale, bound, 'by default the colour scale is the bound (nothing changes for old callers)');
  for (const junk of [undefined, null, 0, -1, NaN, Infinity, 'x', '2', {}, []]) {
    assert.deepEqual(Array.from(mk({ hiddenScale: junk }).mesh.geometry.attributes.color.array), Array.from(auto.mesh.geometry.attributes.color.array), `hiddenScale ${JSON.stringify(junk)} is automatic`);
  }
  // f = z: the hidden value of a vertex (after uv = pi/2) is v = y; the corner y = 1 reaches 1 against the bound 2
  const quarter = { uv: Math.PI / 2, yv: 0 };
  const a = mk({ angles: quarter });
  const f = mk({ angles: quarter, hiddenScale: 1 });
  assert.equal(f.mesh.userData.hiddenScale, 1);
  assert.equal(f.mesh.userData.boundRadius, a.mesh.userData.boundRadius, 'the framing radius does not depend on the colour scale');
  const topRight = 24;
  nearVec(vcol(f.mesh, topRight), hiddenRamp(1), 1e-6, 'the hidden value 1 is the top of the ramp when the scale is 1');
  nearVec(vcol(a.mesh, topRight), hiddenRamp(0.5 + 0.5 * 1 / 2), 1e-6, 'and only three quarters of the way with the automatic scale 2');
  nearVec(vcol(f.mesh, 0), hiddenRamp(0), 1e-6, 'the hidden value -1 is the bottom');
  // beyond the scale the colour stops at the end of the ramp
  nearVec(vcol(mk({ angles: quarter, hiddenScale: 0.25 }).mesh, topRight), hiddenRamp(1), 1e-6);
  // positions do not depend on the scale
  assert.deepEqual(Array.from(f.mesh.geometry.attributes.position.array), Array.from(a.mesh.geometry.attributes.position.array));
  // the scale survives setAngles and setFunction
  f.setAngles({ uv: 0, yv: 0.3 });
  assert.equal(f.mesh.userData.hiddenScale, 1);
  f.setFunction((z) => ({ re: 3 * z.re, im: 3 * z.im }));
  assert.equal(f.mesh.userData.hiddenScale, 1);
  assert.ok(f.mesh.userData.boundRadius > 3, 'the bound follows the new function');
  // setHiddenScale: change, invalid and back to automatic
  const g = mk({ angles: quarter });
  g.setHiddenScale(1);
  assert.equal(g.mesh.userData.hiddenScale, 1);
  nearVec(vcol(g.mesh, topRight), hiddenRamp(1), 1e-6);
  g.setHiddenScale(NaN);
  assert.equal(g.mesh.userData.hiddenScale, a.mesh.userData.boundRadius, 'an invalid scale means automatic');
  assert.deepEqual(Array.from(g.mesh.geometry.attributes.color.array), Array.from(a.mesh.geometry.attributes.color.array));
  g.setHiddenScale(0.5); g.setHiddenScale(null);
  assert.deepEqual(Array.from(g.mesh.geometry.attributes.color.array), Array.from(a.mesh.geometry.attributes.color.array));
  // an in-place change bumps the version so a host can see it
  const v0 = g.mesh.userData.version;
  g.setHiddenScale(1);
  assert.ok(g.mesh.userData.version > v0);
  // clamped vertices keep their grey mix with a fixed scale
  const cl = graph4D({ f: (z) => ({ re: 100 * z.re, im: 0 }), xRange: [-1, 1], yRange: [-1, 1], nx: 3, ny: 3, clamp: 2, hiddenScale: 1 });
  assert.ok(cl.mesh.userData.hiddenScale === 1);
});

test('C2 riemannSurfaceRoot hiddenScale', () => {
  const base = riemannSurfaceRoot({ n: 2, rMax: 4, nr: 4, nTheta: 8 });
  near(base.userData.hiddenScale, 2, 1e-12, 'the default is the largest |part|, rMax^(1/n)');
  const same = riemannSurfaceRoot({ n: 2, rMax: 4, nr: 4, nTheta: 8, hiddenScale: 2 });
  assert.deepEqual(Array.from(same.geometry.attributes.color.array), Array.from(base.geometry.attributes.color.array));
  for (const junk of [0, -2, NaN, Infinity, 'x', null]) {
    assert.deepEqual(Array.from(riemannSurfaceRoot({ n: 2, rMax: 4, nr: 4, nTheta: 8, hiddenScale: junk }).geometry.attributes.color.array), Array.from(base.geometry.attributes.color.array));
  }
  const tight = riemannSurfaceRoot({ n: 2, rMax: 4, nr: 4, nTheta: 8, hiddenScale: 0.5 });
  assert.equal(tight.userData.hiddenScale, 0.5);
  assert.deepEqual(Array.from(tight.geometry.attributes.position.array), Array.from(base.geometry.attributes.position.array));
  // with scale 0.5 every value beyond +-0.5 takes an end colour: the set of colours has more end-colour vertices than with the full scale
  const ends = (m) => { let n = 0; for (let k = 0; k < m.geometry.attributes.color.count; k++) { const c = vcol(m, k); if (Math.hypot(c[0] - 68 / 255, c[1] - 1 / 255, c[2] - 84 / 255) < 1e-3 || Math.hypot(c[0] - 253 / 255, c[1] - 231 / 255, c[2] - 37 / 255) < 1e-3) n++; } return n; };
  assert.ok(ends(tight) > ends(base), `${ends(tight)} end-coloured vertices with scale 0.5 against ${ends(base)}`);
});

test('C2 domainSphere: the sphere painted with f', async () => {
  const { colorOf } = await import('../../js/core/domaincolor.js');
  const { domainSphere } = T;
  assert.equal(typeof domainSphere, 'function');
  const f = (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im });
  const d = domainSphere({ f });
  assert.equal(d.mesh.name, 'domain-sphere');
  assert.equal(d.mesh.userData.vertexCount, 97 * 65);
  assert.equal(d.mesh.geometry.attributes.position.count, 97 * 65);
  assert.equal(d.mesh.parent, d.group);
  assert.equal(d.group.getObjectByName('sphere-body').visible, false, 'the pale body gives way to the painted mesh');
  assert.ok(d.group.getObjectByName('sphere-equator'), 'the graticule stays');
  nearVec([d.mesh.scale.x, d.mesh.scale.y, d.mesh.scale.z], [0.996, 0.996, 0.996], 1e-12);
  assert.equal(d.group.userData.frameRadius, 1);
  assert.equal(typeof d.addCurve, 'function');
  nearVec(d.project(C(1, 0)).toArray(), [1, 0, 0]);
  // colour = domaincolor.js colorOf(w, out, false) at the z the vertex stands for (to the 8-bit rounding of colorOf)
  const pos = d.mesh.geometry.attributes.position, col = d.mesh.geometry.attributes.color;
  const out = [0, 0, 0];
  let checked = 0;
  for (let i = 0; i < pos.count; i += 37) {
    const X = pos.getX(i), Y = -pos.getZ(i), Zp = pos.getY(i);
    const z = inverseStereographic([X, Y, Zp]);
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) continue;
    colorOf(f(z), out, false);
    const got = [col.getX(i), col.getY(i), col.getZ(i)].map(linearToSrgb);
    for (let c = 0; c < 3; c++) near(got[c], out[c] / 255, 1.5 / 255, `vertex ${i} channel ${c}`);
    checked++;
  }
  assert.ok(checked > 100);
  // the north pole is z = infinity: grey; the south pole is z = 0, where f = 0: black
  const north = pos.count > 0 && Array.from({ length: pos.count }, (_, i) => i).find((i) => pos.getY(i) > 0.9999);
  nearVec([col.getX(north), col.getY(north), col.getZ(north)].map(linearToSrgb), [128 / 255, 128 / 255, 128 / 255], 1.5 / 255);
  const south = Array.from({ length: pos.count }, (_, i) => i).find((i) => pos.getY(i) < -0.9999);
  nearVec([col.getX(south), col.getY(south), col.getZ(south)].map(linearToSrgb), [0, 0, 0], 1.5 / 255);
  // setFunction recolours in place and asks the views for a redraw
  const before = Array.from(col.array);
  let redraws = 0;
  d.group.userData.__render = new Set([() => redraws++]);
  d.setFunction((z) => ({ re: z.re, im: z.im }));
  assert.equal(d.mesh.geometry.attributes.color, col, 'same attribute');
  assert.notDeepEqual(Array.from(col.array), before);
  assert.equal(redraws, 1);
  d.setFunction(() => { throw new Error('boom'); });
  for (let i = 0; i < pos.count; i += 101) nearVec([col.getX(i), col.getY(i), col.getZ(i)].map(linearToSrgb), [128 / 255, 128 / 255, 128 / 255], 1.5 / 255, 'a function that throws is grey');
  d.setFunction();
  assert.ok(Array.from(col.array).every(Number.isFinite));
  // options: a colour callback, bad callbacks, divisions, radius, frameLabels
  const red = domainSphere({ f, color: () => [1, 0, 0] });
  for (let i = 0; i < 50; i++) nearVec([red.mesh.geometry.attributes.color.getX(i), red.mesh.geometry.attributes.color.getY(i), red.mesh.geometry.attributes.color.getZ(i)], [1, 0, 0], 1e-6);
  let seen = null;
  domainSphere({ f, nLon: 4, nLat: 3, color: (w, z) => { if (!seen && Number.isFinite(w.re)) seen = { w, z }; return [0, 0, 0]; } });
  assert.ok(seen && Number.isFinite(seen.w.re) && Number.isFinite(seen.z.re), 'color(w, z) gets both');
  const bad = domainSphere({ f, nLon: 4, nLat: 3, color: () => { throw new Error('x'); } });
  assert.ok(Array.from(bad.mesh.geometry.attributes.color.array).every((v) => Math.abs(v - srgbToLinear(0.5)) < 1e-6), 'a throwing colour callback gives neutral grey');
  const junk = domainSphere({ f, nLon: 4, nLat: 3, color: () => 'red' });
  assert.ok(Array.from(junk.mesh.geometry.attributes.color.array).every((v) => Math.abs(v - srgbToLinear(0.5)) < 1e-6));
  assert.equal(domainSphere({ f, nLon: 1, nLat: 1 }).mesh.userData.vertexCount, 4 * 3, 'clamped to 3 by 2 divisions');
  assert.equal(domainSphere({ f, nLon: 1e9, nLat: 1e9 }).mesh.userData.vertexCount, 257 * 257);
  assert.equal(domainSphere({ f, nLon: NaN, nLat: 'x' }).mesh.userData.vertexCount, 97 * 65);
  const big = domainSphere({ f, radius: 2, frameLabels: true });
  near(big.group.userData.frameRadius, 2.4, 1e-12);
  nearVec([big.mesh.scale.x, big.mesh.scale.y, big.mesh.scale.z], [1.992, 1.992, 1.992], 1e-12);
  assert.doesNotThrow(() => disposeObject(big.group));
  assert.doesNotThrow(() => domainSphere());
  assert.doesNotThrow(() => domainSphere({}));
});

test('C2 argHelix tightFrame', () => {
  assert.equal(argHelix({}).group.userData.frameRadius, undefined, 'default: framed by its box, as before');
  assert.equal(argHelix({ tightFrame: false }).group.userData.frameRadius, undefined);
  const t = argHelix({ tightFrame: true });
  near(t.group.userData.frameRadius, Math.hypot(3, HELIX_PITCH * 2.5), 1e-12);
  near(argHelix({ tightFrame: true, turns: 3, rMax: 4 }).group.userData.frameRadius, Math.hypot(4, HELIX_PITCH * 3.5), 1e-12);
  // it really bounds the helix cylinder, and it is tighter than the half-diagonal of the box
  const box = new THREE.Box3().setFromObject(t.group);
  const half = box.getSize(new THREE.Vector3()).length() / 2;
  assert.ok(t.group.userData.frameRadius < half, `${t.group.userData.frameRadius} < ${half}`);
  assert.ok(t.group.userData.frameRadius >= Math.hypot(3, HELIX_PITCH * 2.5) - 1e-9);
  assert.equal(t.group.userData.frame, true);
});
