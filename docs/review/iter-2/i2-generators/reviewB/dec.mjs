import * as m from '../../../../../js/data/generators.js';
for (const id of m.FAMILIES) {
  let cnt = 0; const ex = [];
  for (let s = 1; s <= 300; s++) { const c = m.generate(id, s); for (const f of ['cart', 'polar']) { const t = c.worked[f]; const dec = t.match(/-?\d+\.\d+/g); if (dec) { cnt += dec.length; if (ex.length < 3) ex.push(...dec.slice(0, 2)); } } }
  console.log(id, cnt, ex.join(' '));
}
