import * as m from '../../../../../js/data/generators.js';
const shape = (s) => s.replace(/\d+/g, '#');
for (const id of m.FAMILIES) {
  const sig = new Map(); const gv = new Set();
  for (let s = 1; s <= 400; s++) { const c = m.generate(id, s); const k = shape(c.answer.text); sig.set(k, (sig.get(k) || 0) + 1); gv.add(JSON.stringify(c.given)); }
  console.log('=====', id, 'distinct givens in 400 seeds:', gv.size, ' answer-text shapes:', sig.size);
  if (sig.size <= 12) for (const [k, n] of sig) console.log('  ', n, k.slice(0, 200));
}
