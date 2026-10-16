import { launch } from './lib.mjs';
const out = '/home/user/math-viz/docs/review/iter-2/i2-walk-shell/reviewB/crops';
import fs from 'node:fs'; fs.mkdirSync(out, { recursive: true });
const L = await launch();
const cfgs = [
  { name: 'desktop', vp: { width: 1280, height: 860 }, scheme: 'light' },
  { name: 'phone', vp: { width: 390, height: 844 }, scheme: 'light' },
  { name: 'desktop-dark', vp: { width: 1280, height: 860 }, scheme: 'dark' },
  { name: 'phone-dark', vp: { width: 390, height: 844 }, scheme: 'dark' },
];
for (const c of cfgs) {
  const ctx = await L.browser.newContext({ viewport: c.vp, colorScheme: c.scheme, deviceScaleFactor: 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(L.base + '#home'); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/home-top--${c.name}.png` });
  // header only
  await page.screenshot({ path: `${out}/header--${c.name}.png`, clip: { x: 0, y: 0, width: c.vp.width, height: 70 } });
  // map panel
  const panel = await page.$('#home-map-panel');
  if (panel) { await panel.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await panel.screenshot({ path: `${out}/mappanel--${c.name}.png` }); }
  // staircase header
  await page.goto(L.base + '#staircase'); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/staircase-top--${c.name}.png` });
  const badges = await page.$$eval('.thread-badge', (els) => els.map((e) => ({ t: e.dataset.thread, text: e.textContent.trim() })));
  console.log(c.name, JSON.stringify(badges), 'errors', errs.length);
  await ctx.close();
}
await L.close();
