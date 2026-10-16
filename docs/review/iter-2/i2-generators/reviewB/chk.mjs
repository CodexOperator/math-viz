import * as m from '../../../../../js/data/generators.js';
const rot = (z, a) => ({ re: z.re * Math.cos(a) - z.im * Math.sin(a), im: z.re * Math.sin(a) + z.im * Math.cos(a) });
const res = {};
const bump = (k, ok) => { res[k] ||= [0, 0]; res[k][ok ? 0 : 1]++; };
for (const id of m.FAMILIES) for (let s = 1; s <= 60; s++) {
  const c = m.generate(id, s); const sk = c.sketch.kind; const V = c.answer.values;
  let guess;
  if (sk === 'roots') { guess = V.roots; bump(id + ' roots exact ok:true', m.check(c, guess).ok === true); bump(id + ' roots rotated10 ok:false', m.check(c, guess.map((z) => rot(z, 10 * Math.PI / 180))).ok === false); bump(id + ' roots shuffled ok:true', m.check(c, [...guess].reverse()).ok === true); bump(id + ' roots wrong count', m.check(c, guess.slice(0, -1)).ok !== true); }
  else if (sk === 'point') { guess = V.target.points; bump(id + ' point exact', m.check(c, guess).ok === true); bump(id + ' point shift0.3 false', m.check(c, guess.map((z) => ({ re: z.re + 0.3, im: z.im }))).ok === false); }
  else if (sk === 'choice') { bump(id + ' choice correct', m.check(c, c.sketch.correct).ok === true); const wrong = c.sketch.options.map((_, i) => i).filter((i) => i !== c.sketch.correct); bump(id + ' choice wrong', wrong.every((w) => m.check(c, w).ok === false)); bump(id + ' choice len>=2', c.sketch.options.length >= 2 && c.sketch.correct >= 0 && c.sketch.correct < c.sketch.options.length); bump(id + ' options unique', new Set(c.sketch.options).size === c.sketch.options.length); }
  else if (sk === 'none') bump(id + ' none null', m.check(c, 'anything').ok === null);
  else bump(id + ' ' + sk + ' (see below)', true);
}
for (const [k, [a, b]] of Object.entries(res)) if (b) console.log('PROBLEM', k, a, b);
console.log(Object.keys(res).length, 'groups checked');
const kinds = {}; for (const id of m.FAMILIES) kinds[id] = new Set(); for (const id of m.FAMILIES) for (let s = 1; s <= 200; s++) kinds[id].add(m.generate(id, s).sketch.kind);
console.log(Object.entries(kinds).map(([k, v]) => k + ':' + [...v].join('/')).join('  '));
