import fs from 'node:fs'; import vm from 'node:vm';
import * as m from '../../../../../js/data/generators.js';
const sb = { self: {}, console }; vm.runInNewContext(fs.readFileSync('../../../../../vendor/katex/katex.min.js', 'utf8'), sb); const katex = sb.self.katex;
let tot = 0, bad = 0;
const F = (x) => { bad++; if (bad < 15) console.log(x); };
const parts = (s) => { const out = []; const re = /\$([^$]+)\$/g; let mm; while ((mm = re.exec(s))) out.push(mm[1]); return out; };
for (const id of m.FAMILIES) for (let s = 1; s <= 120; s++) {
  const c = m.generate(id, s);
  for (const t of parts(c.statement)) { tot++; try { katex.renderToString(t, { throwOnError: true, strict: 'error' }); } catch (e) { F(`${id}#${s} statement: ${t} -> ${e.message.slice(0, 120)}`); } }
  tot++; try { katex.renderToString(c.answer.tex, { throwOnError: true, strict: 'error' }); } catch (e) { F(`${id}#${s} answer.tex: ${c.answer.tex.slice(0, 100)} -> ${e.message.slice(0, 160)}`); }
  // statement outside $: no stray TeX commands
  const outside = c.statement.replace(/\$[^$]+\$/g, ''); if (/[\\^_{}]/.test(outside)) F(`${id}#${s} stray TeX outside math: ${outside}`);
}
console.log('katex renders', tot, 'bad', bad);
