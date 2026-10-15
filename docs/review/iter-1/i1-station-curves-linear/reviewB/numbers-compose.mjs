import { settle, dragHandle } from '../../../../../tests/interact/_helpers.mjs';
const cm = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
const fmt = (x) => { const r = Math.round(x * 1000) / 1000; return Object.is(r, -0) ? '0' : String(r); };
function fz(z) { const re = fmt(z[0]), im = fmt(z[1]); const ims = im === '1' ? 'i' : im === '-1' ? '-i' : im + 'i'; if (im === '0') return re; if (re === '0') return ims; return `${re} ${z[1] < 0 ? '-' : '+'} ${ims.replace(/^-/, '')}`; }
const P = { '1+i': [1, 1], '2': [2, 0], '-1-2i': [-1, -2], i: [0, 1], '-1': [-1, 0], '0.5+0.25i': [0.5, 0.25], '1': [1, 0], '3i': [0, 3], '-i': [0, -1], '123.456+78.9i': [123.456, 78.9], '0': [0, 0] };
export default async function (page, ctx) {
  let bad = 0;
  for (const h of ['#problem-2-1-3', '#problem-P3', '#problem-P4']) {
    await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(600);
    for (const [c, d] of [['1+i', '1'], ['2', '3i'], ['-1-2i', '0.5+0.25i'], ['i', 'i'], ['-1', '-i'], ['123.456+78.9i', '0'], ['0', '1']]) {
      await page.fill('#linear-compose-c', c); await page.fill('#linear-compose-d', d); await settle(page, 4);
      const st = await page.evaluate(() => window.__mv.linear.state());
      const A = [st.a.re, st.a.im], B = [st.b.re, st.b.im], C = P[c], D = P[d];
      const ac = cm(A, C), w = cm(A, D), adb = [w[0] + B[0], w[1] + B[1]];
      const r = await page.evaluate(() => document.getElementById('linear-compose-readout').textContent);
      const want = `ac = ${fz(ac)}; ad + b = ${fz(adb)}`;
      const motion = await page.evaluate(() => document.getElementById('linear-comp-ex-coeff-motion')?.textContent || '');
      const ok = r === want;
      if (!ok) bad++;
      ctx.log(`${h} a=${A} b=${B} c=${c} d=${d}: "${r}" ${ok ? 'OK' : 'WANT ' + want} | ${motion.slice(0, 200)}`);
      // the check row: lhs == rhs at the followed point
      const chk = await page.evaluate(() => document.getElementById('linear-comp-ex-check-cart')?.dataset.tex);
      ctx.log('   check: ' + chk);
    }
  }
  ctx.assert(bad === 0, bad + ' compose mismatches');
}
