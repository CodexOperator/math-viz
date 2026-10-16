import * as m from '../../../../../js/data/generators.js';
let bad = 0, tot = 0; const F = (x) => { bad++; if (bad < 20) console.log(x); };
const hist = {};
for (const id of m.FAMILIES) for (let s = 1; s <= 400; s++) {
  const c = m.generate(id, s); const sk = c.sketch; if (!sk.fit) { if (!['choice', 'none'].includes(sk.kind)) F(`${id}#${s} no fit for ${sk.kind}`); continue; }
  const { center, halfWidth } = sk.fit; tot++;
  if (!(halfWidth > 0 && Number.isFinite(halfWidth) && Number.isFinite(center.re) && Number.isFinite(center.im))) { F(`${id}#${s} fit not finite`); continue; }
  const inside = (p, margin = 0.05) => Math.abs(p.re - center.re) <= halfWidth * (1 - margin) && Math.abs(p.im - center.im) <= halfWidth * (1 - margin);
  const T = sk.target;
  if (sk.kind === 'point' || sk.kind === 'roots') for (const p of T.points) if (!inside(p)) F(`${id}#${s} point outside fit ${JSON.stringify(p)} fit ${JSON.stringify(sk.fit)}`);
  if (sk.kind === 'circle') { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inside({ re: T.center.re + dx * T.radius, im: T.center.im + dy * T.radius }, 0)) F(`${id}#${s} circle extent outside fit ${JSON.stringify(T)} ${JSON.stringify(sk.fit)}`); }
  if (sk.kind === 'line') { // a line must cross the window with the foot of the origin or the given point inside
    const p = T.point; const d = T.dir; // distance from center to the line
    const off = Math.abs((center.re - p.re) * -d.im + (center.im - p.im) * d.re); if (off > halfWidth * 0.9) F(`${id}#${s} line far from window center: ${off.toFixed(2)} vs hw ${halfWidth}`); }
  if (sk.kind === 'sector') { /* rays from the origin must be reachable: the window contains points away from 0 on both rays */ for (const a of [T.from, T.to]) { const q = { re: 1.5 * Math.cos(a), im: 1.5 * Math.sin(a) }; if (!inside(q, 0)) F(`${id}#${s} ray point (r=1.5) outside fit`); } }
  const key = id + ' hw=' + halfWidth; hist[key] = (hist[key] || 0) + 1;
}
console.log('fit checks', tot, 'bad', bad);
console.log(Object.entries(hist).filter(([k]) => /^(1.4|2.1.3|2.5|P4|1.2.1|2.3|2.2)/.test(k)).slice(0, 40).map(([k, v]) => k + ':' + v).join('  '));
// smallest tolerance in px for a 350px plane
let worst = 1e9, wid = '';
for (const id of m.FAMILIES) for (let s = 1; s <= 400; s++) { const c = m.generate(id, s); const sk = c.sketch; if (!sk.fit) continue; const hw = sk.fit.halfWidth; const tolOf = (base) => Math.min(0.25, Math.max(base, 0.04 * hw)); const tol = sk.kind === 'roots' ? tolOf(Math.min(0.2, 0.12 * Math.hypot(sk.target.points[0].re, sk.target.points[0].im))) : sk.kind === 'point' ? tolOf(0.15) : sk.kind === 'circle' ? tolOf(0.2) : sk.kind === 'line' ? tolOf(0.15) : 0; if (tol) { const px = tol / (2 * hw) * 350; if (px < worst) { worst = px; wid = id + '#' + s + ' ' + sk.kind + ' hw=' + hw; } } }
console.log('smallest tolerance on a 350px plane: ', worst.toFixed(1), 'px at', wid);
