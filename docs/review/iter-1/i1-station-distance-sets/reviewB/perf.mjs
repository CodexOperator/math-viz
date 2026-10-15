// Review B: draw cost during a continuous real drag at 4x CPU throttle.
import { planePixel, settle, clickChip } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, label, log } = ctx;
  if (label === 'desktop-dark') return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const run = async (name, planeId, handleId, path) => {
    const samples = [];
    await page.evaluate((pid) => { const p = window.__mv.planes.get(pid); window.__perf = []; const f = () => { window.__perf.push(p.getStats().lastDrawMs); window.__perfRaf = requestAnimationFrame(f); }; f(); }, planeId);
    const loc = page.locator(`[id="${handleId}"]`); await loc.waitFor({ state: 'visible' });
    const pts = []; for (const z of path) pts.push(await planePixel(page, planeId, z));
    const box = await loc.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    for (const p of pts) await page.mouse.move(p.x, p.y, { steps: 25 });
    await page.mouse.up(); await settle(page);
    const arr = await page.evaluate(() => { cancelAnimationFrame(window.__perfRaf); return window.__perf; });
    // keep only frames where lastDrawMs changed (a real draw)
    const draws = []; arr.forEach((v, i) => { if (i === 0 || v !== arr[i - 1]) draws.push(v); });
    draws.sort((a, b) => a - b);
    const q = (f) => draws[Math.min(draws.length - 1, Math.floor(f * draws.length))].toFixed(1);
    log(`${name}: ${draws.length} draws, median ${q(0.5)} ms, p90 ${q(0.9)} ms, max ${draws[draws.length - 1].toFixed(1)} ms`);
  };
  if (route === 'problem-1-2-2') {
    await page.waitForSelector('#distance-plane-z1', { state: 'visible' });
    await run('distance two (z1 sweep)', 'distance-plane', 'distance-plane-z1', [{ re: 6, im: 7 }, { re: 0, im: 5 }, { re: 3, im: 1 }, { re: 4, im: 3 }]);
    await clickChip(page, 'distance-mode-triangle');
    await page.check('#distance-polar');
    await run('distance triangle polar on (z1 sweep)', 'distance-plane', 'distance-plane-z1', [{ re: 3, im: 6 }, { re: -2, im: 2 }, { re: 1, im: 1 }, { re: 3, im: 1 }]);
  } else if (route === 'problem-1-5-2') {
    await page.waitForSelector('#sets-plane-p', { state: 'visible' });
    await run('sets annulus (p sweep)', 'sets-plane', 'sets-plane-p', [{ re: 0, im: 2.2 }, { re: -2, im: -1 }, { re: 1, im: 0 }, { re: 2, im: 0 }]);
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
}
