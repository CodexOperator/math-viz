import { setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
import path from 'node:path';
const OUT = path.resolve('docs/review/iter-1/i1-station-curves-linear/reviewB/shots');
export default async function (page, ctx) {
  const vp = ctx.viewport && ctx.viewport.name ? ctx.viewport.name : (ctx.viewport?.width < 600 ? 'phone' : 'desktop');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const tag = `${ctx.route}--${vp}--${theme}`;
  const snap = async (name) => { await settle(page, 4); await page.waitForTimeout(150); await page.screenshot({ path: `${OUT}/${tag}--${name}.png` }); };
  await page.evaluate(() => { const el = document.querySelector('.two-planes'); el.scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, -20); });
  await settle(page, 3);
  for (const s of [3, 1, 2, 0]) { await setSlider(page, 'linear-stage', s); await snap('stage' + s); }
  await setSlider(page, 'linear-stage', 2.5); await snap('stage2.5');
}
