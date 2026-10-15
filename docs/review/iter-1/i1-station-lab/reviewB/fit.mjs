import { clickChip } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { log, shot } = ctx;
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} location.hash = '#lab-2-2-1'; });
  await page.waitForTimeout(900);
  const info = async (what) => {
    const r = await page.evaluate(() => {
      const L = window.__mv.lab; const pcs = L.images();
      const pts = pcs.flatMap((p) => p.points).filter((p) => Number.isFinite(p.re) && Number.isFinite(p.im));
      const bb = { x0: Math.min(...pts.map((p) => p.re)), x1: Math.max(...pts.map((p) => p.re)), y0: Math.min(...pts.map((p) => p.im)), y1: Math.max(...pts.map((p) => p.im)) };
      const v = window.__mv.planes.get('lab-wplane').getView(); const s = window.__mv.planes.get('lab-wplane').getSize();
      const hw = v.unitsAcross / 2, hh = hw * s.h / s.w;
      const vis = { x0: v.center.re - hw, x1: v.center.re + hw, y0: v.center.im - hh, y1: v.center.im + hh };
      return { bb, vis, n: pts.length };
    });
    log(what + ' ' + JSON.stringify(r));
    return r;
  };
  await clickChip(page, 'lab-preset-segment');
  await clickChip(page, 'lab-fn-cube');
  await page.waitForTimeout(500);
  await info('segment under z^3, side');
  await shot('segment-cube-side');
  await clickChip(page, 'lab-fn-sq');
  await page.waitForTimeout(500);
  await info('segment under z^2, side');
}
