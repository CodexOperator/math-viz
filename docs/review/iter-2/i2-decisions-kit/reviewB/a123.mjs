import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as P from '../../../../../js/data/problems.js';
import * as D from '../../../../../js/core/decisions.js';
import * as G from '../../../../../js/core/moveglyph.js';
import * as K from '../../../../../js/core/station-kit.js';
import { STATIONS, stationById } from '../../../../../js/registry.js';

let fails = 0;
const ok = (name, fn) => { try { fn(); console.log('ok  ', name); } catch (e) { fails++; console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0,4).join('\n    ')); } };
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `expected ${b} got ${a}`);

// A1 independent: STORY table parse (own parser, last column word)
ok('A1 own parse of STORY last column', () => {
  const md = fs.readFileSync('docs/STORY.md', 'utf8');
  const sec = md.split(/^## 3\. /m)[1].split(/^## 4\. /m)[0];
  const rows = sec.split('\n').filter(l => /^\| (\d\.\d\.\d|P\d) /.test(l));
  assert.equal(rows.length, 29);
  for (const l of rows) {
    const cells = l.replace(/\\\|/g, '\u0001').split('|').map(c => c.replace(/\u0001/g, '|').trim());
    // leading '' and trailing ''
    const id = cells[1].split(/\s+/)[0];
    const last = cells[cells.length - 2];
    const word = last.match(/^[a-z]+/)[0];
    assert.equal(P.problemById(id).names, word, id);
  }
  const lit = {none:'1.1.1 1.1.2 1.2.1 1.2.2 1.5.1 1.5.2 2.1.2 3.1.1 3.2.1 P3 P7'.split(' '), any:'1.3.2 2.1.1 2.1.3 2.2.1 2.3.1 2.5.1 3.1.2 P1 P2 P4 P5 P6'.split(' '), all:['1.4.1','1.4.2','1.4.3'], home:['1.3.1','2.2.2'], continuous:['2.4.1']};
  for (const [k, ids] of Object.entries(lit)) for (const id of ids) assert.equal(P.problemById(id).names, k, id);
  const counts = {}; for (const p of P.PROBLEMS) counts[p.names] = (counts[p.names]||0)+1;
  assert.deepEqual(counts, {none:11, any:12, all:3, home:2, continuous:1});
});
ok('A1 names in NAMES_CODES, export list', () => {
  for (const p of P.PROBLEMS) assert.ok(D.NAMES_CODES.includes(p.names));
  assert.equal(Object.keys(P).length, 15);
  assert.equal(P.problemsForStation('rehearse').length, 29);
  assert.equal(P.topicsForStation('rehearse').length, 12);
  assert.deepEqual(P.problemsForStation('rehearse').map(p=>p.id), P.PROBLEMS.map(p=>p.id));
});

// A2
ok('A2 slug', () => { assert.equal(D.slug('C->P->C'),'c-p-c'); assert.equal(D.slug('P->C'),'p-c'); assert.equal(D.slug('both'),'both'); });
ok('A2 namesLabel', () => { assert.equal(D.namesLabel('all'),'names: all'); assert.equal(D.namesLabel('x'),''); });
ok('A2 namesMeaning', () => assert.ok(D.namesMeaning('all').startsWith('Every name gives a different answer')));
ok('A2 grade', () => {
  assert.deepEqual(D.grade({address:'P',names:'all'},{address:'P',names:'all'}),{address:true,names:true,all:true});
  assert.deepEqual(D.grade({address:null,names:'any'},{address:'P',names:'all'}),{address:null,names:false,all:false});
});
ok('A2 glyphGeometry(-1+i√3)', () => {
  const g = G.glyphGeometry({re:-1, im:Math.sqrt(3)});
  near(g.r,2,1e-12); near(g.theta,2*Math.PI/3,1e-12); assert.equal(g.unitR,6);
  near(g.rayEnd.x,6,1e-6); near(g.rayEnd.y, 12-6*Math.sqrt(3),1e-9);
  console.log('     rayEnd', g.rayEnd, 'vs literal (6,1.6077) diff', Math.abs(g.rayEnd.y-1.6077));
  assert.ok(g.arc); assert.deepEqual(g.arc.start,{x:18,y:12}); assert.equal(g.arc.sweep,0); assert.equal(g.clipped,false);
});
ok('A2 glyphGeometry(1)', () => { const g=G.glyphGeometry(1); assert.deepEqual(g.rayEnd,{x:18,y:12}); assert.equal(g.arc,null); });
ok('A2 glyphGeometry(0)', () => { const g=G.glyphGeometry(0); assert.deepEqual(g.rayEnd,{x:12,y:12}); assert.equal(g.arc,null); });
ok('A2 glyphGeometry(3)', () => { const g=G.glyphGeometry(3); assert.deepEqual(g.rayEnd,{x:24,y:12}); assert.equal(g.clipped,true); });
ok('A2 glyphText', () => {
  assert.equal(G.glyphText({re:-1,im:Math.sqrt(3)}),'move: turn 120°, stretch 2');
  assert.equal(G.glyphText(0),'no move: 0');
  assert.equal(G.glyphText({re:0,im:-2}),'move: turn -90°, stretch 2');
});

// A3
ok('A3 valuesOf', () => {
  const inp = {kind:'values', values:{ z:{re:1,im:2}, n:4.7, mode:'mul', junk:1 }};
  const out = K.valuesOf(inp, { z:'complex', n:'int', mode:['add','mul'] });
  assert.deepEqual(out, {z:{re:1,im:2}, mode:'mul'});
  assert.notEqual(out.z, inp.values.z);
  assert.equal(K.valuesOf({kind:'problem', id:'1.4.2'}, {z:'complex'}), null);
  assert.equal(K.valuesOf(null, {}), null);
  assert.deepEqual(K.valuesOf({kind:'values', values:{z:{re:NaN,im:0}}},{z:'complex'}), {});
});
ok('A3 neighbours roots', () => {
  const ctx = { stations: STATIONS, station: stationById('roots') };
  const n = K.neighbours(ctx);
  const ids = (e) => e && e.id;
  console.log('     roots:', ids(n.prev), ids(n.next), JSON.stringify(n.threads.map(t=>[t.thread, ids(t.prev), ids(t.next)])));
  assert.equal(ids(n.prev),'powers'); assert.equal(ids(n.next),'curves');
  assert.deepEqual(n.threads.map(t=>({thread:t.thread, prev:ids(t.prev), next:ids(t.next)})), [{thread:'T2',prev:'powers',next:'powermap'},{thread:'T1',prev:'powers',next:'sets'}]);
});
ok('A3 neighbours graph4d/problems', () => {
  assert.equal(K.neighbours({stations:STATIONS, station:stationById('graph4d')}).next.id,'rehearse');
  assert.equal(K.neighbours({stations:STATIONS, station:stationById('problems')}).prev.id,'rehearse');
});
console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails?1:0);
