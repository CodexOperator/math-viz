// Independent reviewer check of A1, A2, A3, A6. Throwaway.
import fs from 'node:fs';
import { STATIONS } from '../../../../../js/registry.js';
const R = '/home/user/math-viz/';
const out = [];
const ok = (c, m) => { out.push((c ? 'PASS ' : 'FAIL ') + m); };

// A1
const css = fs.readFileSync(R + 'css/theme.css', 'utf8');
const i = css.indexOf(':root[data-theme="dark"] {');
const blk = css.slice(i, css.indexOf('}', i));
const dark = {};
for (const m of blk.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) dark[m[1]] = m[2].trim().toLowerCase();
const py = fs.readFileSync(R + 'videos/lib/palette.py', 'utf8');
const pal = {};
for (const m of py.matchAll(/^([A-Z][A-Z0-9_]*)\s*=\s*"(#[0-9a-fA-F]{6})"/gm)) pal[m[1]] = m[2].toLowerCase();
const map = { BG: ['--bg', '#0d121c'], SURFACE: ['--surface', '#151c2b'], INK: ['--text', '#e9edf5'], MUTED: ['--text-muted', '#a6b0c3'], CART: ['--cart', '#62adf2'], POLAR: ['--polar', '#ff9d5c'], INPUT: ['--input', '#3fd0a0'], OUTPUT: ['--output', '#e48fd2'], SEAM: ['--seam', '#8e99b0'], T0: ['--t0', '#5c7498'], T1: ['--t1', '#f3f6fb'], WARN: ['--danger', '#ff8178'], OK: ['--ok', '#63d08a'] };
for (const [n, [t, lit]] of Object.entries(map)) ok(pal[n] === lit && dark[t] === lit, `A1 ${n} ${pal[n]} == ${t} ${dark[t]} == ${lit}`);

// A2
const files = ['home', 'staircase', 'roots', 'derivative', 'lab', 'walk'];
const words = (s) => s.trim().split(/\s+/).length;
const J = {};
for (const f of files) {
  let j; try { j = JSON.parse(fs.readFileSync(R + `media/narration/site/${f}.json`, 'utf8')); ok(true, `A2 ${f} parses`); } catch (e) { ok(false, `A2 ${f} parse ${e.message}`); continue; }
  J[f] = j;
  ok(j.id === f, `A2 ${f} id`); ok(typeof j.title === 'string' && j.title.trim(), `A2 ${f} title "${j.title}"`);
  const segs = j.segments; const ids = new Set(segs.map(s => s.id));
  ok(ids.size === segs.length, `A2 ${f} unique ids`);
  ok(segs.every(s => /^[a-z0-9-]+$/.test(s.id)), `A2 ${f} id charset`);
  ok(segs.every(s => !/[$\\]/.test(s.text)), `A2 ${f} no $ or backslash`);
  const joined = segs.map(s => s.text).join(' ');
  ok(/Cartesian/.test(joined) && /polar/.test(joined), `A2 ${f} Cartesian + polar`);
  if (f !== 'walk') {
    ok(segs.length >= 4 && segs.length <= 6, `A2 ${f} count ${segs.length}`);
    for (const s of segs) { const w = words(s.text); ok(w >= 8 && w <= 70, `A2 ${f}/${s.id} words ${w}`); }
  } else {
    ok(segs.length === 22, 'A2 walk 22 segs');
    ok(JSON.stringify(segs.map(s => s.id)) === JSON.stringify(STATIONS.map(s => s.id)), 'A2 walk ids == STATIONS ids in order (STATIONS len ' + STATIONS.length + ')');
    STATIONS.forEach((s, k) => ok(segs[k] && segs[k].text === s.walk.say, `A2 walk text ${s.id} equals walk.say`));
  }
}
const hj = J.home.segments.map(s => s.text).join(' ');
for (const p of ['A complex number is a move', 'A turn has many names', 'A function moves every point at once', 'Differentiable means']) ok(hj.includes(p), `A2 home has "${p}"`);
const sj = J.staircase.segments.map(s => s.text).join(' ');
ok(/\barg z\b/.test(sj) && /\bArg z\b/.test(sj), 'A2 staircase uses arg z and Arg z');
console.log(out.join('\n'));
console.log(out.filter(x => x.startsWith('FAIL')).length + ' failures of ' + out.length);
