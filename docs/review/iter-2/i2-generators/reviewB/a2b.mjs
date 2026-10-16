import * as m from '../../../../../js/data/generators.js';
const C = (re, im = 0) => ({ re, im }); const S3 = Math.sqrt(3), PI = Math.PI;
const HG = {
  '1.1.1': { z1: C(3, -2), z2: C(-1, 4) }, '1.1.2': { z1: C(3, -2), z2: C(-1, 4), op: '-', part: 'Im' }, '1.2.1': { a: C(1, 2), R: 3, rel: '=' }, '1.2.2': { z1: C(4, 3), z2: C(-1, 1) },
  '1.3.1': { z: C(-1, S3) }, '1.3.2': { z: C(S3, 1), n: 10 }, '1.4.1': { n: 5 }, '1.4.2': { c: C(-16, 0), n: 4 }, '1.4.3': { p: 2, q: 3 }, '1.5.1': { a: C(2, 1), b: C(-3, -3) },
  '1.5.2': { a: C(0, -1), r0: 1, r1: 3, innerStrict: true, outerStrict: false }, '2.1.1': { fn: 'z^2 + iz' }, '2.1.2': { axis: 'x', c: 2 }, '2.1.3': { a: C(0, 1), b: C(0, -2), line: { axis: 'x', c: 2 } },
  '2.2.1': { alpha: PI / 4, n: 3 }, '2.2.2': { w: C(0, 2), n: 2 }, '2.3.1': { path: { kind: 'parabola' } }, '2.4.1': { n: 3, ray: 'negative-real' }, '2.5.1': { circle: { a: C(1, 0) } },
  '3.1.1': { a: 1, b: 1, c: 0 }, '3.1.2': { fn: '|z|^2' }, '3.2.1': { fn: 'e^x(cos y + i sin y)' }, P1: { z1: C(3, -2), z2: C(-1, 4) }, P2: { z: C(3, -2) }, P3: { a: C(1, 0), b: C(0, 0), c: C(1, 0), d: C(0, 0) },
  P4: { a: C(1, 1), R: 1 }, P5: { path: { kind: 'parabola' } }, P6: { fn: 'Re z' }, P7: { kind: 'real', c: 1 },
};
for (const id of m.FAMILIES) {
  let hc; try { hc = m.solve(id, HG[id]); } catch (e) { console.log(id, 'handout solve threw', e.message); continue; }
  let sameText = 0, sameStatement = 0, n = 0; const ex = new Set();
  for (let s = 1; s <= 2000; s++) { const c = m.generate(id, s); n++; if (c.answer.text === hc.answer.text) { sameText++; ex.add(c.answer.text.slice(0, 70)); } if (c.statementText === hc.statementText) sameStatement++; }
  console.log(id.padEnd(6), 'same answer.text as handout:', sameText + '/' + n, ' same statement:', sameStatement, [...ex].slice(0, 1).join(''));
}
