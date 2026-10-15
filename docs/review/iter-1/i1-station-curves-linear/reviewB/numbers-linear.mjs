// Review B throwaway: independent recomputation of the numbers the linear station shows.
import { dragHandle, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
const cm = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
const ab = (p) => Math.hypot(p[0], p[1]);
const cases = [
  { a: [0, 1], b: [0, -2] }, { a: [1, 1], b: [0, 0] }, { a: [2, 0], b: [1, 1] }, { a: [-1, 0], b: [0, 0] },
  { a: [0.5, -1.5], b: [-2, 1.5] }, { a: [-1.5, 1], b: [1, 2] }, { a: [0, 0], b: [1.5, -1] },
];
const fmt = (x) => { const r = Math.round(x * 1000) / 1000; return Object.is(r, -0) ? '0' : String(r); };
export default async function (page, ctx) {
  let bad = 0; const L = (m) => { bad++; ctx.log('MISMATCH ' + m); };
  for (const cs of cases) {
    await dragHandle(page, 'linear-ab-a', { re: cs.a[0], im: cs.a[1] });
    await dragHandle(page, 'linear-ab-b', { re: cs.b[0], im: cs.b[1] });
    const st = await page.evaluate(() => window.__mv.linear.state());
    const A = [st.a.re, st.a.im], B = [st.b.re, st.b.im];
    if (Math.hypot(A[0] - cs.a[0], A[1] - cs.a[1]) > 1e-6 || Math.hypot(B[0] - cs.b[0], B[1] - cs.b[1]) > 1e-6) { ctx.log(`handles landed at a=${A} b=${B} (wanted ${cs.a} ${cs.b})`); }
    const mag = ab(A), alpha = ab(A) < 1e-9 ? 0 : Math.atan2(A[1], A[0]);
    const read = await page.evaluate(() => document.getElementById('linear-readout').textContent);
    const m = /spin (-?[\d.]+)°, stretch ([\d.]+)/.exec(read);
    if (!m) L('readout parse ' + read);
    else {
      if (Math.abs(Number(m[1]) - alpha * 180 / Math.PI) > 0.06) L(`spin ${m[1]} vs ${alpha * 180 / Math.PI} for a=${A}`);
      if (Math.abs(Number(m[2]) - mag) > 6e-4) L(`stretch ${m[2]} vs ${mag}`);
    }
    // image points at stages
    for (const s of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
      await setSlider(page, 'linear-stage', s); await settle(page, 3);
      const pts = await page.evaluate(() => window.__mv.linearImage.map((p) => ({ re: p.re, im: p.im, t: p.t })));
      let map;
      if (s <= 1) { const c = Math.cos(alpha * s), si = Math.sin(alpha * s); map = (z) => cm([c, si], z); }
      else if (s <= 2) { const k = 1 + (s - 1) * (mag - 1); map = (z) => cm([k * Math.cos(alpha), k * Math.sin(alpha)], z); }
      else map = (z) => { const w = cm(A, z); return [w[0] + (s - 2) * B[0], w[1] + (s - 2) * B[1]]; };
      let worst = 0, n = 0;
      for (const p of pts) { const z = [2, -4 + 8 * p.t]; const w = map(z); worst = Math.max(worst, Math.hypot(w[0] - p.re, w[1] - p.im)); n++; }
      if (n < 5 && !(mag < 1e-9 && s >= 2)) ctx.log(`few points ${n} at stage ${s}`);
      if (worst > 1e-6) L(`image at stage ${s} a=${A} b=${B}: worst ${worst}`);
    }
    // explainer: fixed point and the followed point
    const ex = await page.evaluate(() => { const g = (id) => document.getElementById(id)?.dataset.tex; return { fixed: g('linear-ex-fixed-cart'), fp: g('linear-ex-fixed-polar'), zt: g('linear-ex-zt-cart'), wt: g('linear-ex-wt-cart'), wp: g('linear-ex-wt-polar'), f: g('linear-ex-f-cart'), fpolar: g('linear-ex-f-polar'), a: g('linear-ex-a-cart'), ap: g('linear-ex-a-polar') }; });
    ctx.log(`a=${A} b=${B}: ` + JSON.stringify(ex));
    const t = st.t, zt = [2, -4 + 8 * t], wt = (() => { const w = cm(A, zt); return [w[0] + B[0], w[1] + B[1]]; })();
    const mw = /w = az \+ b = (.*)$/.exec(ex.wt || '');
    ctx.log('  expected w(t)=' + fmt(wt[0]) + ',' + fmt(wt[1]) + '; shown ' + (mw && mw[1]));
    // fixed point
    if (mag > 1e-9 && ab([1 - A[0], -A[1]]) > 1e-9) {
      const den = (1 - A[0]) ** 2 + A[1] ** 2, num = cm(B, [1 - A[0], A[1]]);   // b / (1 - a) = b * conj(1-a) / |1-a|^2
      ctx.log('  expected p=' + fmt(num[0] / den) + ',' + fmt(num[1] / den) + '; shown ' + ex.fixed);
    }
  }
  // composition on this route
  for (const [c, d] of [['1+i', '1'], ['2', '3i'], ['-1-2i', '0.5+0.25i'], ['i', 'i']]) {
    await page.fill('#linear-compose-c', c); await page.fill('#linear-compose-d', d); await settle(page, 3);
    const st = await page.evaluate(() => window.__mv.linear.state());
    const ca = { '1+i': [1, 1], '2': [2, 0], '-1-2i': [-1, -2], i: [0, 1] }[c], dd = { '1': [1, 0], '3i': [0, 3], '0.5+0.25i': [0.5, 0.25], i: [0, 1] }[d];
    const A = [st.a.re, st.a.im], B = [st.b.re, st.b.im];
    const ac = cm(A, ca), adb = (() => { const w = cm(A, dd); return [w[0] + B[0], w[1] + B[1]]; })();
    const r = await page.evaluate(() => document.getElementById('linear-compose-readout').textContent);
    const want = `ac = ${fz(ac)}; ad + b = ${fz(adb)}`;
    ctx.log(`compose a=${A} b=${B} c=${c} d=${d}: shown "${r}" want "${want}"`);
    if (r !== want) L(`compose: "${r}" vs "${want}"`);
  }
  ctx.assert(bad === 0, `${bad} mismatches`);
}
function fz(z) {
  const re = fmt(z[0]), im = fmt(z[1]);
  const ims = im === '1' ? 'i' : im === '-1' ? '-i' : im + 'i';
  if (im === '0') return re;
  if (re === '0') return ims;
  return `${re} ${z[1] < 0 ? '-' : '+'} ${ims.replace(/^-/, '')}`;
}
