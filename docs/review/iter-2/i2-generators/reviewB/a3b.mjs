import * as m from '../../../../../js/data/generators.js';
import { parse } from '../../../../../js/core/parse.js';
const fin = (x) => typeof x === 'number' && Number.isFinite(x);
const isC = (z) => z && typeof z === 'object' && fin(z.re) && fin(z.im) && Object.keys(z).length === 2;
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const PIE = Math.PI;
const V = {
  arithmetic: (v) => isC(v.z1) && isC(v.z2) && ['add', 'sub', 'mul', 'div', 'conj', 'inv'].includes(v.mode) && (v.conjResult === undefined || typeof v.conjResult === 'boolean'),
  distance: (v) => (v.mode === 'two' && isC(v.z1) && isC(v.z2)) || (v.mode === 'circle' && isC(v.a) && fin(v.R) && v.R > 0),
  addresses: (v) => isC(v.z),
  powers: (v) => isC(v.z) && int(v.n, 1, 12),
  roots: (v) => (v.quadratic ? ['a', 'b', 'c'].every((k) => fin(v.quadratic[k])) && Object.keys(v).length === 1 : isC(v.c) && int(v.n, 2, 12)),
  curves: (v) => isC(v.a) && isC(v.b),
  sets: (v) => isC(v.center) && fin(v.r0) && fin(v.r1) && 1 <= v.r0 && v.r0 < v.r1 && v.r1 <= 4 && typeof v.innerStrict === 'boolean' && typeof v.outerStrict === 'boolean',
  mappings: (v) => (typeof v.fn === 'string' || (v.fn && typeof v.fn.src === 'string')) && (v.z === undefined || isC(v.z)),
  linear: (v) => isC(v.a) && isC(v.b) && (v.input === 'x2' || v.input === 'unit' || (v.input && ((v.input.kind === 'verticalLine' && fin(v.input.x)) || (v.input.kind === 'horizontalLine' && fin(v.input.y)) || (v.input.kind === 'circle' && isC(v.input.center) && fin(v.input.r))))) && (v.compose === undefined || (isC(v.compose.c) && isC(v.compose.d))),
  powermap: (v) => int(v.n, 2, 6) && ((v.line && ['x', 'y'].includes(v.line.axis) && fin(v.line.c)) || (v.sector && fin(v.sector.theta0) && fin(v.sector.theta1))),
  'principal-root': (v) => isC(v.w) && int(v.n, 2, 6),
  branches: (v) => int(v.n, 2, 5) && fin(v.seam) && v.seam > -PIE - 1e-12 && v.seam <= PIE + 1e-12 && [null, 'along', 'across'].includes(v.walk),
  reciprocal: (v) => v.shape && ((v.shape.kind === 'circle' && isC(v.shape.center) && fin(v.shape.r)) || (v.shape.kind === 'line' && isC(v.shape.a) && isC(v.shape.b))),
  limits: (v) => ['dir', 'x-over-z'].includes(v.fn) && ['line', 'vertical', 'parabola', 'spiral'].includes(v.path) && (v.m === undefined || fin(v.m)),
  derivative: (v) => (typeof v.fn === 'string' || (v.fn && typeof v.fn.src === 'string')) && isC(v.z0),
  'cauchy-riemann': (v) => (typeof v.fn === 'string' || (v.fn && typeof v.fn.src === 'string')) && isC(v.z0),
};
const bad = []; let n = 0;
const FUNCTIONS_IDS = null;
for (const id of m.FAMILIES) for (let s = 1; s <= 300; s++) {
  const c = m.generate(id, s); n++;
  if (c.values !== null) { if (!V[c.station](c.values)) bad.push(`${id}#${s} values ${JSON.stringify(c.values).slice(0, 160)}`);
    // fn src must compile with parse.js
    for (const f of [c.values.fn && c.values.fn.src]) if (f) { try { const r = parse(f); if (!r || (r.error)) bad.push(`${id}#${s} src does not compile: ${f}`); } catch (e) { bad.push(`${id}#${s} src throws: ${f} ${e.message}`); } } }
  else if (!(id === 'P5' || id === '2.3.1')) bad.push(`${id}#${s} unexpected null values`);
  const LABIDS = new Set(['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']);
  if (!!c.labRequest !== LABIDS.has(id)) bad.push(`${id}#${s} labRequest presence`);
}
console.log(n, 'cards,', bad.length, 'problems'); bad.slice(0, 20).forEach((b) => console.log(b));
// show a lab request for each lab family and the 2.3.1/P5 fn
for (const id of ['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']) console.log(id, JSON.stringify(m.generate(id, 3).labRequest));
console.log('2.3.1', JSON.stringify(m.generate('2.3.1', 3).values), 'P5', JSON.stringify(m.generate('P5', 3).values));
