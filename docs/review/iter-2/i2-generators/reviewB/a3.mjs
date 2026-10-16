import * as m from '../../../../../js/data/generators.js';
const keysOf = (o) => JSON.stringify(Object.keys(o).sort());
for (const id of m.FAMILIES) {
  const shapes = new Map(); let nullv = 0, lab = 0, N = 400;
  for (let s = 1; s <= N; s++) { const c = m.generate(id, s); if (c.values === null) nullv++; else { const k = c.station + ' ' + keysOf(c.values) + (c.values.mode ? ' mode=' + c.values.mode : '') + (c.values.fn !== undefined ? ' fn:' + (typeof c.values.fn === 'string' ? 'id' : keysOf(c.values.fn)) : '') + (c.values.input ? ' input:' + (typeof c.values.input === 'string' ? c.values.input : c.values.input.kind) : '') + (c.values.shape ? ' shape:' + c.values.shape.kind : '') + (c.values.path ? ' path:' + c.values.path : ''); shapes.set(k, (shapes.get(k) || 0) + 1); } if (c.labRequest) lab++; }
  console.log(id.padEnd(6), 'null:', nullv, 'lab:', lab); for (const [k, n] of shapes) console.log('     ', n, k);
}
