import * as m from '../../../../../js/data/generators.js';
const bad = []; let n = 0;
const has = (t, re) => (re instanceof RegExp ? re.test(t) : t.includes(re));
const WALK = ['1.3.1', '1.1.1', '1.2.1', '1.3.2', '1.4.2', '1.5.1', '1.5.2', '2.1.1', '2.1.3', '2.1.2', '2.2.2', '2.4.1', '2.5.1', '2.3.1', '3.1.2', '3.2.1'];
for (const id of m.FAMILIES) for (let s = 1; s <= 100; s++) {
  const c = m.generate(id, s); const P = c.worked.polar, Cc = c.worked.cart; n++;
  const need = (cond, msg) => { if (!cond) bad.push(`${id}#${s}: ${msg}`); };
  if (['1.4.1', '1.4.2', '1.4.3'].includes(id)) need(has(P, /every name|staircase/), 'all-names phrase');
  if (['1.4.1', '1.4.2'].includes(id)) need(has(P, `(Arg c + 2πk)/${c.given.n}`), 'literal (Arg c + 2pi k)/n with n=' + c.given.n);
  if (['1.3.1', '2.2.2'].includes(id)) need(has(P, 'home step'), 'home step');
  if (id === '2.4.1') need(has(P, 'continuous') && has(P, 'seam'), 'continuous+seam');
  if (['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4'].includes(id)) need(has(Cc, /push forward|Push forward|eliminate|Eliminate/), 'push forward/eliminate in cart');
  if (['3.1.1', '3.1.2', '3.2.1', 'P6', 'P7'].includes(id)) need(has(P, 'mirror'), 'mirror');
  if (['1.1.1', 'P1', 'P2'].includes(id)) need(has(P, /turn and stretch|spin and stretch|turn, then stretch|turn and the stretch/) , 'turn and stretch');
  need(/[xy]/.test(Cc), 'cart mentions x or y'); need(/[rθ]/.test(P), 'polar mentions r or theta');
  need(!/[^\x00-\x7f]/.test(c.answer.text), 'answer ascii');
  if (WALK.includes(id) && s <= 10) need(c.values !== null || c.labRequest !== null, 'walk stop needs values or lab');
}
console.log(n, 'cards,', bad.length, 'problems'); [...new Set(bad.map((b) => b.replace(/#\d+/, '')))].slice(0, 20).forEach((b) => console.log(b));
