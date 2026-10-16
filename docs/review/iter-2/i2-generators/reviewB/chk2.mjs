import * as m from '../../../../../js/data/generators.js';
const res = {}; const bump = (k, ok) => { res[k] ||= [0, 0]; res[k][ok ? 0 : 1]++; };
const rot = (z, a) => ({ re: z.re * Math.cos(a) - z.im * Math.sin(a), im: z.re * Math.sin(a) + z.im * Math.cos(a) });
for (const id of ['1.2.1', 'P4', '2.5.1', '2.1.3', '2.2.1']) for (let s = 1; s <= 200; s++) {
  const c = m.generate(id, s); const T = c.sketch.target; const hw = c.sketch.fit.halfWidth;
  if (c.sketch.kind === 'circle') {
    bump(id + ' circle exact true', m.check(c, { center: T.center, radius: T.radius }).ok === true);
    bump(id + ' circle as [centre, rim] pair true', m.check(c, [T.center, { re: T.center.re + T.radius, im: T.center.im }]).ok === true);
    bump(id + ' circle centre +0.3 false', m.check(c, { center: { re: T.center.re + 0.3, im: T.center.im }, radius: T.radius }).ok === false);
    bump(id + ' circle radius x1.3 false', m.check(c, { center: T.center, radius: T.radius * 1.3 }).ok === false);
    bump(id + ' circle radius x1.08 true', m.check(c, { center: T.center, radius: T.radius * 1.08 }).ok === true);
  } else if (c.sketch.kind === 'line') {
    const p = T.point, d = T.dir; const a = { re: p.re - 2 * d.re, im: p.im - 2 * d.im }, b = { re: p.re + 2 * d.re, im: p.im + 2 * d.im };
    bump(id + ' line exact true', m.check(c, [a, b]).ok === true);
    bump(id + ' line shifted 0.3 normal false', m.check(c, [{ re: a.re - 0.3 * d.im, im: a.im + 0.3 * d.re }, { re: b.re - 0.3 * d.im, im: b.im + 0.3 * d.re }]).ok === false);
    bump(id + ' line rotated 10deg about the point false', m.check(c, [rot({ re: a.re - p.re, im: a.im - p.im }, 0.1745), rot({ re: b.re - p.re, im: b.im - p.im }, 0.1745)].map((q) => ({ re: q.re + p.re, im: q.im + p.im }))).ok === false);
  } else if (c.sketch.kind === 'sector') {
    const f = (a, r = 1.5) => ({ re: r * Math.cos(a), im: r * Math.sin(a) });
    bump(id + ' sector exact true', m.check(c, [f(T.from), f(T.to)]).ok === true);
    bump(id + ' sector swapped true', m.check(c, [f(T.to, 2), f(T.from, 0.7)]).ok === true);
    bump(id + ' sector 10deg off false', m.check(c, [f(T.from + 0.1745), f(T.to)]).ok === false);
  }
}
for (const [k, [a, b]] of Object.entries(res)) console.log(b ? 'PROBLEM' : 'ok     ', k.padEnd(48), a, b);
