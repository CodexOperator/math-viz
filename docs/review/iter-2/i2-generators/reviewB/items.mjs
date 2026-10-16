import * as m from '../../../../../js/data/generators.js';
const C = (re, im = 0) => ({ re, im });
// item 5: every pair in -5..5 (z2 != 0) prints an exact quotient
let n = 0, rounded = 0, ex = null;
for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) for (let c = -5; c <= 5; c++) for (let d = -5; d <= 5; d++) { if (c === 0 && d === 0) continue; if (a === 0 && b === 0) continue; n++; const card = m.solve('1.1.1', { z1: C(a, b), z2: C(c, d) }); if (/~|approx|about/.test(card.answer.text + card.answer.tex + card.worked.cart)) { rounded++; ex ||= card.answer.text; } }
console.log('1.1.1 pairs', n, 'with any rounded marker', rounded, ex || '');
// item 4: quadrant words
const SQ = (x) => Math.sqrt(x);
let bad = 0, tot = 0;
for (let s = 1; s <= 600; s++) { const c = m.generate('1.3.1', s); const z = c.given.z; const P = c.worked.polar; tot++;
  const q = /(first|second|third|fourth) quadrant/.exec(P); const axis = Math.abs(z.re) < 1e-9 || Math.abs(z.im) < 1e-9;
  const want = z.re > 0 && z.im > 0 ? 'first' : z.re < 0 && z.im > 0 ? 'second' : z.re < 0 && z.im < 0 ? 'third' : z.re > 0 && z.im < 0 ? 'fourth' : null;
  if (axis ? q : (!q || q[1] !== want)) { bad++; if (bad < 5) console.log('quadrant issue', JSON.stringify(z), P); }
  if (axis) { const axisWord = z.im === 0 ? (z.re > 0 ? 'positive real' : 'negative real') : (z.im > 0 ? 'positive imaginary' : 'negative imaginary'); if (!P.includes('on the ' + axisWord + ' axis')) { bad++; if (bad < 5) console.log('axis word issue', JSON.stringify(z), P); } }
}
console.log('1.3.1 quadrant/axis words', tot, 'bad', bad);
console.log(m.solve('1.3.1', { z: C(-1, 0) }).worked.polar);
console.log(m.solve('1.3.1', { z: C(0, -2) }).worked.polar);
// item 9: 2.1.2 never x = -2 ... and 3.1.1 never a = b = 1
const seen212 = new Set(), s311 = new Set(); for (let s = 1; s <= 3000; s++) { const g = m.generate('2.1.2', s).given; seen212.add(g.axis + g.c); const h = m.generate('3.1.1', s).given; if (h.a === 1 && h.b === 1) s311.add(JSON.stringify(h)); }
console.log('2.1.2 variants', [...seen212].sort().join(' '), '| 3.1.1 with a=b=1:', [...s311].join(' '));
// item 11 spelling
let centre = 0; for (const id of m.FAMILIES) for (let s = 1; s <= 200; s++) { const c = m.generate(id, s); const all = [c.statement, c.statementText, c.answer.tex, c.answer.text, c.worked.cart, c.worked.polar, c.sketch.prompt || ''].join(' '); if (/centre/i.test(all)) centre++; }
console.log('"centre" occurrences in cards:', centre);
// rootWord
const words = new Set(); for (let s = 1; s <= 400; s++) { for (const id of ['1.4.2', '2.2.2', '2.4.1']) { const t = m.generate(id, s).statementText; const w = /the (\w+) roots? of|the (\w+) root of/.exec(t); if (w) words.add((w[1] || w[2])); } }
console.log('root words:', [...words].join(' '));
