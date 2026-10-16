import * as m from '../../../../../js/data/generators.js';
const shape = (s) => s.replace(/\d+/g, '#');
for (const id of m.FAMILIES) {
  const sig = new Map();
  for (let s = 1; s <= 400; s++) { const c = m.generate(id, s); const k = shape(c.statementText); if (!sig.has(k)) sig.set(k, c.statementText); }
  console.log('=====', id, sig.size);
  let n = 0; for (const [k, v] of sig) { if (n++ < 14) console.log('  ', v.slice(0, 260)); }
}
