import { launch } from './lib.mjs';
const out = '/home/user/math-viz/docs/review/iter-2/i2-walk-shell/reviewB/crops';
const L = await launch();
for (const scheme of ['light', 'dark']) {
  const ctx = await L.browser.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: scheme, deviceScaleFactor: 3 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(L.base + '#lab'); await page.waitForTimeout(1500);
  const els = await page.$$('.thread-badge');
  console.log(scheme, 'badges on lab:', els.length);
  const box = await page.evaluate(() => { const b = [...document.querySelectorAll('.thread-badge')]; const r0 = b[0].getBoundingClientRect(), r1 = b[b.length-1].getBoundingClientRect(); return { x: r0.left - 10, y: r0.top - 10, w: r1.right - r0.left + 20, h: Math.max(r0.height, r1.height) + 20 }; });
  await page.screenshot({ path: `${out}/badges-lab--${scheme}.png`, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
  await ctx.close();
}
await L.close();
