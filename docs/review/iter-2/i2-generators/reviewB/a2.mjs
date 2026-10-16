import * as m from '../../../../../js/data/generators.js';
const STATION = { '1.1.1': 'arithmetic', '1.1.2': 'arithmetic', '1.2.1': 'distance', '1.2.2': 'distance', '1.3.1': 'addresses', '1.3.2': 'powers', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'roots', '1.5.1': 'curves', '1.5.2': 'sets', '2.1.1': 'mappings', '2.1.2': 'powermap', '2.1.3': 'linear', '2.2.1': 'powermap', '2.2.2': 'principal-root', '2.3.1': 'limits', '2.4.1': 'branches', '2.5.1': 'reciprocal', '3.1.1': 'derivative', '3.1.2': 'derivative', '3.2.1': 'cauchy-riemann', P1: 'arithmetic', P2: 'arithmetic', P3: 'linear', P4: 'linear', P5: 'limits', P6: 'derivative', P7: 'cauchy-riemann' };
const KINDS = new Set(['point', 'roots', 'circle', 'line', 'sector', 'choice', 'none']);
const bad = []; let n = 0;
const near = (a, b) => Math.abs(a.re - b.re) < 1e-9 && Math.abs(a.im - b.im) < 1e-9;
for (const id of m.FAMILIES) {
  let diff = 0;
  for (let s = 1; s <= 50; s++) {
    const c = m.generate(id, s), d = m.generate(id, s), e = m.generate(id, s + 1); n++;
    if (c.id !== id || c.seed !== s || c.station !== STATION[id]) bad.push(`${id}#${s} id/seed/station ${c.station}`);
    if ((c.statement.match(/\$/g) || []).length % 2) bad.push(`${id}#${s} odd $`);
    if (/[^\x00-\x7f]/.test(c.statementText)) bad.push(`${id}#${s} non-ascii statementText`);
    if (/[^\x00-\x7f]/.test(c.answer.text)) bad.push(`${id}#${s} non-ascii answer.text`);
    if (!KINDS.has(c.sketch.kind)) bad.push(`${id}#${s} sketch kind`);
    if (!c.worked.cart || !c.worked.polar) bad.push(`${id}#${s} worked empty`);
    if (JSON.stringify(c) !== JSON.stringify(d)) bad.push(`${id}#${s} not deterministic`);
    if (JSON.stringify(c.given) !== JSON.stringify(e.given)) diff++;
  }
  if (diff < 45) bad.push(`${id}: only ${diff}/50 pairs differ`);
  console.log(id.padEnd(6), 'pairs differing', diff + '/50');
}
// handout avoidance over seeds 1..3000
const H = {
  '1.1.1': (g) => near(g.z1, { re: 3, im: -2 }) && near(g.z2, { re: -1, im: 4 }),
  '1.1.2': (g) => near(g.z1, { re: 3, im: -2 }) && near(g.z2, { re: -1, im: 4 }) && g.op === '-' && g.part === 'Im',
  '1.2.1': (g) => near(g.a, { re: 1, im: 2 }) && g.R === 3 && g.rel === '=',
  '1.2.2': (g) => (near(g.z1, { re: 4, im: 3 }) && near(g.z2, { re: -1, im: 1 })) || (near(g.z2, { re: 4, im: 3 }) && near(g.z1, { re: -1, im: 1 })),
  '1.3.1': (g) => near(g.z, { re: -1, im: Math.sqrt(3) }),
  '1.3.2': (g) => near(g.z, { re: Math.sqrt(3), im: 1 }) && g.n === 10,
  '1.4.1': (g) => g.n === 5,
  '1.4.2': (g) => near(g.c, { re: -16, im: 0 }) && g.n === 4,
  '1.4.3': (g) => g.p === 2 && g.q === 3,
  '1.5.1': (g) => near(g.a, { re: 2, im: 1 }) && near(g.b, { re: -3, im: -3 }),
  '1.5.2': (g) => near(g.a, { re: 0, im: -1 }) && g.r0 === 1 && g.r1 === 3 && g.innerStrict && !g.outerStrict,
  '2.1.1': (g) => /^z\^2 \+ iz$/.test(g.fn),
  '2.1.2': (g) => g.axis === 'x' && g.c === 2,
  '2.1.3': (g) => near(g.a, { re: 0, im: 1 }) && near(g.b, { re: 0, im: -2 }) && g.line.axis === 'x' && g.line.c === 2,
  '2.2.1': (g) => Math.abs(g.alpha - Math.PI / 4) < 1e-9 && g.n === 3,
  '2.2.2': (g) => near(g.w, { re: 0, im: 2 }) && g.n === 2,
  '2.3.1': (g) => g.path.kind === 'parabola',
  '2.4.1': (g) => g.n === 3 && g.ray === 'negative-real',
  '2.5.1': (g) => g.circle && near(g.circle.a, { re: 1, im: 0 }),
  '3.1.1': (g) => g.a === 1 && g.b === 1 && g.c === 0,
  '3.1.2': (g) => g.fn === '|z|^2',
  '3.2.1': (g) => /^e\^x\(cos y \+ i sin y\)$/.test(g.fn),
  P1: () => false, P2: () => false,
  P3: () => false,
  P4: (g) => near(g.a, { re: 1, im: 1 }) && g.R === 1,
  P5: () => false,
  P6: (g) => g.fn === 'Re z',
  P7: () => false,
};
for (const id of m.FAMILIES) { let hit = 0; for (let s = 1; s <= 3000; s++) { const c = m.generate(id, s); if (H[id](c.given)) hit++; } if (hit) bad.push(`${id}: ${hit} handout hits in 3000 seeds`); }
console.log(n, 'cards; problems:', bad.length); bad.slice(0, 30).forEach((b) => console.log(b));
// what do the handout givens look like for 3.1.1, 2.1.1, 3.1.2, 3.2.1, 2.5.1 (to confirm my handout table matches how the generator names them)
for (const id of ['2.1.1', '3.1.2', '3.2.1', '2.5.1', '2.4.1']) { const seen = new Set(); for (let s = 1; s <= 600; s++) seen.add(JSON.stringify(m.generate(id, s).given)); console.log(id, [...seen].slice(0, 14).join(' | ')); }
