import { generate } from '../../../../../js/data/generators.js';
import * as ad from '../../../../../js/stations/addresses.js';
import * as di from '../../../../../js/stations/distance.js';
import * as po from '../../../../../js/stations/powers.js';
import * as ro from '../../../../../js/stations/roots.js';
import * as cu from '../../../../../js/stations/curves.js';
const st = { '1.3.1': ad, '1.2.1': di, '1.2.2': di, '1.3.2': po, '1.4.1': ro, '1.4.2': ro, '1.4.3': ro, '1.5.1': cu };
const bad = {};
let n = 0;
for (const id of Object.keys(st)) {
  for (let seed = 1; seed <= 400; seed++) {
    const card = generate(id, seed);
    if (!card) { bad[id + ' null'] = (bad[id + ' null'] || 0) + 1; continue; }
    n++;
    if (!card.values) { bad[id + ' no values'] = (bad[id + ' no values'] || 0) + 1; continue; }
    if (card.station !== (id === '1.3.1' ? 'addresses' : id.startsWith('1.2') ? 'distance' : id === '1.3.2' ? 'powers' : id.startsWith('1.4') ? 'roots' : 'curves')) bad[id + ' station ' + card.station] = 1;
    const preset = { kind: 'values', station: card.station, problem: id, family: id, values: card.values };
    const s = st[id].valuesStart(preset);
    if (!s) { bad[id + ' valuesStart null'] = (bad[id + ' valuesStart null'] || 0) + 1; if (bad[id + ' valuesStart null'] < 3) console.log(id, seed, JSON.stringify(card.values)); continue; }
    // every key accepted?
    const kept = JSON.stringify(Object.keys(card.values).sort());
    // compare accepted values to the generated ones
    const check = (cond, msg) => { if (!cond) { bad[id + ' ' + msg] = (bad[id + ' ' + msg] || 0) + 1; if (bad[id + ' ' + msg] < 3) console.log(id, seed, msg, JSON.stringify(card.values), JSON.stringify(s)); } };
    const v = card.values;
    if (st[id] === ad) check(s.z.re === v.z.re && s.z.im === v.z.im, 'z changed');
    if (st[id] === po) check(s.z.re === v.z.re && s.z.im === v.z.im && s.n === v.n, 'z/n changed');
    if (st[id] === ro && v.c) check(s.state.c.re === v.c.re && s.state.c.im === v.c.im && s.state.n === v.n, 'c/n changed');
    if (st[id] === ro && v.quadratic) check(s.kind === 'quadratic', 'quad not accepted');
    if (st[id] === cu) check(s.a.re === v.a.re && s.a.im === v.a.im, 'a changed');
    if (st[id] === di) { for (const k of ['z1','z2','a']) if (v[k]) { const m = s.mode; const t = s[m]; const got = k === 'a' ? t.a : t[k]; check(got && got.re === v[k].re && got.im === v[k].im, k + ' changed'); } }
    if (st[id] === cu) check(Math.hypot(s.b.re - v.b.re, s.b.im - v.b.im) < 1e-12, 'b changed (pushed)');
  }
}
console.log('cards', n, 'issues', JSON.stringify(bad));
const sample = (id) => JSON.stringify(generate(id, 7).values);
for (const id of Object.keys(st)) console.log(id, sample(id));
