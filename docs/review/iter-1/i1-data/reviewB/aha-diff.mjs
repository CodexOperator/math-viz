import fs from 'node:fs';
import * as P from '/home/user/math-viz/js/data/problems.js';
const md = fs.readFileSync('/home/user/math-viz/docs/STORY.md', 'utf8');
const sec3 = md.slice(md.indexOf('## 3. Every review problem'), md.indexOf('### Topics pinned'));
const rows = {};
for (const line of sec3.split('\n')) {
  if (!line.startsWith('| ')) continue;
  const cells = line.replace(/\\\|/g, '\u0001').split('|').map((c) => c.trim().replace(/\u0001/g, '|'));
  // cells: ['', problem, place, addr, aha, answer, '']
  const m = cells[1] && cells[1].match(/^(\d\.\d\.\d|P\d)\b/);
  if (m) rows[m[1]] = { place: cells[2].replace(/`/g, ''), addr: cells[3], aha: cells[4], answer: cells[5] };
}
console.log('rows', Object.keys(rows).length);
const norm = (s) => s.replace(/`/g, '').replace(/\s+/g, ' ').trim();
let diffs = 0;
for (const p of P.PROBLEMS) {
  const r = rows[p.id];
  if (!r) { console.log('NO ROW', p.id); diffs++; continue; }
  const placeOk = r.place.startsWith(p.station) || r.place.includes(p.station) ;
  if (!placeOk) console.log('PLACE DIFF', p.id, r.place, p.station);
  // address letter check: STORY addr cell begins with C, P, C→P→C, both, etc.
  const a = r.addr.split(' ')[0].replace(/,$/, '');
  const mapped = { 'C': 'C', 'P': 'P', 'C→P': 'C->P', 'P→C': 'P->C', 'C→P→C': 'C->P->C', 'both': 'both', 'either;': 'both', 'C or P': 'both' }[a] ?? ('?' + a);
  if (mapped !== p.address) console.log('ADDRESS?', p.id, 'story:', r.addr, '| data:', p.address);
  if (norm(r.aha) !== norm(p.aha)) { diffs++; console.log('AHA DIFF', p.id, '\n  story:', norm(r.aha), '\n  data: ', norm(p.aha)); }
}
console.log('aha diffs', diffs);
