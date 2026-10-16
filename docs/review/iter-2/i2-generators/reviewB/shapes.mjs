import * as m from '../../../../../js/data/generators.js';
const norm = (t) => t.replace(/-?\d+(\.\d+)?/g, 'N').replace(/√N/g, 'R').replace(/N π\/N|Nπ\/N|π\/N|Nπ/g, 'ANG');
for (const id of process.argv.slice(2)) {
  for (const f of ['cart', 'polar']) {
    const map = new Map();
    for (let s = 1; s <= 600; s++) { const c = m.generate(id, s); const k = norm(c.worked[f]); if (!map.has(k)) map.set(k, [c.worked[f], s, 0]); map.get(k)[2]++; }
    console.log(`=== ${id} ${f}: ${map.size} shapes`);
    [...map.values()].sort((a, b) => b[2] - a[2]).slice(0, 5).forEach(([ex, s, n]) => console.log(`  [${n}x seed ${s}] ${ex}`));
  }
}
