// Review B throwaway: independent recomputation of every number the curves station shows.
import { clickChip, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
const TAU = 2 * Math.PI;
const defaults = { segment: [[2, 1], [-3, -3]], circle: [[1, 1], [3, 1]], eight: [[0, 0], [3, 0]], square: [[0, 0], [1.5, 1.5]], arc: [[0, 0], [3, 0]] };
const cm = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
// my own formulas, from the problem text (not from the module)
function z(preset, rev, t) {
  const [A, B] = defaults[preset]; const D = [B[0] - A[0], B[1] - A[1]];
  const s = rev ? 1 - t : t;               // reversal = walk the same points backwards: z_rev(t) = z(1 - t)
  let L;
  if (preset === 'segment') L = [s, 0];
  else if (preset === 'circle') L = [Math.cos(TAU * s), Math.sin(TAU * s)];
  else if (preset === 'arc') L = [Math.cos(Math.PI * s), Math.sin(Math.PI * s)];
  else if (preset === 'eight') { const th = TAU * s, d = 1 + Math.sin(th) ** 2; L = [Math.cos(th) / d, Math.sin(th) * Math.cos(th) / d]; }
  else { const V = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 0]]; const k = Math.min(3, Math.floor(4 * s + 1e-12)), f = 4 * s - k; L = [V[k][0] + f * (V[k + 1][0] - V[k][0]), V[k][1] + f * (V[k + 1][1] - V[k][1])]; }
  const w = cm(D, L); return [A[0] + w[0], A[1] + w[1]];
}
const truth = {
  segment: { smooth: 'yes', piecewise: 'yes', closed: 'no', simple: 'yes', positive: 'no' },
  circle: { smooth: 'yes', piecewise: 'yes', closed: 'yes', simple: 'yes', positive: 'yes' },
  eight: { smooth: 'yes', piecewise: 'yes', closed: 'yes', simple: 'no', positive: 'no' },
  square: { smooth: 'no', piecewise: 'yes', closed: 'yes', simple: 'yes', positive: 'yes' },
  arc: { smooth: 'yes', piecewise: 'yes', closed: 'no', simple: 'yes', positive: 'no' },
};
const num = (s) => Number(s);
export default async function (page, ctx) {
  let bad = 0;
  for (const preset of Object.keys(defaults)) {
    await clickChip(page, 'curves-preset-' + preset);
    for (const rev of [false, true]) {
      const pressed = await page.getAttribute('#curves-reverse', 'aria-pressed');
      if ((pressed === 'true') !== rev) await clickChip(page, 'curves-reverse');
      await settle(page, 3);
      for (const t of [0, 0.12, 0.25, 0.3, 0.5, 0.75, 0.9, 1]) {
        await setSlider(page, 'curves-t', t); await settle(page, 3);
        const r = await page.evaluate(() => document.getElementById('curves-readout').textContent);
        const m = /t = ([-\d.]+); z\(t\) = (.*); x\(t\) = ([-\d.]+); y\(t\) = ([-\d.]+)/.exec(r);
        const [ex, ey] = z(preset, rev, t);
        if (!m) { ctx.assert(false, 'cannot parse ' + r); continue; }
        const x = num(m[3]), y = num(m[4]);
        // displayed values are rounded to 3 decimals
        if (Math.abs(x - ex) > 6e-4 || Math.abs(y - ey) > 6e-4) { bad++; ctx.log(`MISMATCH ${preset} rev=${rev} t=${t}: shown (${x}, ${y}) expected (${ex.toFixed(4)}, ${ey.toFixed(4)})`); }
        // the cart explainer 'now' row and the polar 'now' row
        const now = await page.evaluate(() => ({ c: document.getElementById('curves-ex-now-cart')?.dataset.tex, p: document.getElementById('curves-ex-now-polar')?.dataset.tex, v: document.getElementById('curves-ex-vel-cart')?.dataset.tex, vp: document.getElementById('curves-ex-vel-polar')?.dataset.tex }));
        const rr = Math.hypot(ex, ey), th = Math.atan2(ey, ex);
        if (rr > 1e-9) {
          const mp = /r = ([-\d.]+),\\ \\Arg z = ([-\d.]+)/.exec(now.p || '');
          if (!mp) { bad++; ctx.log(`no polar now ${preset} ${rev} ${t}: ${now.p}`); }
          else {
            const dth = Math.abs(Math.atan2(Math.sin(num(mp[2]) - th), Math.cos(num(mp[2]) - th)));
            if (Math.abs(num(mp[1]) - rr) > 6e-4 || dth > 6e-4) { bad++; ctx.log(`polar mismatch ${preset} rev=${rev} t=${t}: shown r=${mp[1]} Arg=${mp[2]} expected r=${rr.toFixed(4)} Arg=${th.toFixed(4)}`); }
            if (num(mp[2]) <= -Math.PI || num(mp[2]) > Math.PI + 6e-4) { bad++; ctx.log(`Arg out of (-pi, pi]: ${mp[2]}`); }
          }
        }
        // numerical velocity
        const h = 1e-5, tp = Math.min(1, t + h), tm = Math.max(0, t - h);
        const zp = z(preset, rev, tp), zm = z(preset, rev, tm);
        const vx = (zp[0] - zm[0]) / (tp - tm), vy = (zp[1] - zm[1]) / (tp - tm);
        const vs = ((now.v || '').replace(/\s+/g, '').replace(/^z'\(t\)=/, ''));
        const parseZ = (q) => { let m = /^([-\d.]+)([+-])([\d.]*)i$/.exec(q); if (m) return [Number(m[1]), (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : Number(m[3]))]; m = /^(-?)([\d.]*)i$/.exec(q); if (m) return [0, (m[1] ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]))]; m = /^[-\d.]+$/.exec(q); if (m) return [Number(q), 0]; return null; };
        const mv = parseZ(vs);
        const corner = preset === 'square' && Math.abs(t * 4 - Math.round(t * 4)) < 1e-6;
        if (!corner && t > 0 && t < 1) {
          if (!mv) { bad++; ctx.log(`vel parse ${now.v}`); }
          else {
            const [sx, sy] = mv;
            if (Math.abs(sx - vx) > 2e-3 + 1e-3 * Math.abs(vx) || Math.abs(sy - vy) > 2e-3 + 1e-3 * Math.abs(vy)) { bad++; ctx.log(`velocity mismatch ${preset} rev=${rev} t=${t}: shown (${sx}, ${sy}) expected (${vx.toFixed(4)}, ${vy.toFixed(4)})`); }
          }
        }
      }
      // classification
      const cls = {};
      for (const k of ['smooth', 'piecewise', 'closed', 'simple', 'positive']) cls[k] = await page.getAttribute('#curves-' + k, 'data-answer');
      const exp = { ...truth[preset] };
      if (rev && preset !== 'segment' && preset !== 'arc' && (preset === 'circle' || preset === 'square')) exp.positive = 'no';
      for (const k of Object.keys(exp)) if (cls[k] !== exp[k]) { bad++; ctx.log(`CLASS MISMATCH ${preset} rev=${rev} ${k}: shown ${cls[k]} expected ${exp[k]}`); }
      ctx.log(`${preset} rev=${rev}: ${JSON.stringify(cls)}`);
    }
    // reset reverse
    if ((await page.getAttribute('#curves-reverse', 'aria-pressed')) === 'true') await clickChip(page, 'curves-reverse');
  }
  ctx.assert(bad === 0, `${bad} mismatches`);
}
