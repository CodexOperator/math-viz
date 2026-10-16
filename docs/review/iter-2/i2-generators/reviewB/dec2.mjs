import * as m from '../../../../../js/data/generators.js';
for (const id of ['1.1.1','1.1.2','1.2.2','1.5.1','2.3.1','3.1.2','P3','2.2.2']) {
  const seen = new Set(); 
  for (let s = 1; s <= 300; s++) { const c = m.generate(id, s); for (const f of ['cart', 'polar']) { const t = c.worked[f]; const re = /.{0,45}-?\d+\.\d+.{0,12}/g; let mm; while ((mm = re.exec(t))) { const k = mm[0].replace(/-?\d+\.\d+/g, '#').replace(/\d+/g,'N'); if (!seen.has(k)) { seen.add(k); if (seen.size <= 7) console.log(id, f, '|', mm[0]); } } } }
}
