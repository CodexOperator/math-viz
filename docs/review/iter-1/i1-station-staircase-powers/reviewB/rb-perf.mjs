import { dragHandleAround, settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const pid = ctx.route === 'staircase' ? 'staircase-plane' : 'powers-plane';
  await page.evaluate(() => { window.__rbFrames = []; let last = performance.now(); const f = (t) => { window.__rbFrames.push(t - last); last = t; window.__rbRaf = requestAnimationFrame(f); }; window.__rbRaf = requestAnimationFrame(f); });
  await dragHandleAround(page, pid + '-z', { radius: 1.5, startAngle: 0.2, turns: 1, steps: 96 });
  const r = await page.evaluate((pid) => {
    cancelAnimationFrame(window.__rbRaf);
    const f = window.__rbFrames.slice(5).sort((a, b) => a - b);
    const p = window.__mv.planes.get(pid);
    return { frames: f.length, medianMs: +f[Math.floor(f.length / 2)].toFixed(1), p95Ms: +f[Math.floor(f.length * 0.95)].toFixed(1), lastDrawMs: p.stats && p.stats.lastDrawMs };
  }, pid);
  ctx.log(JSON.stringify(r));
}
