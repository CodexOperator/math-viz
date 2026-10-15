import { setSlider, settle, dragHandle } from '../../../../../tests/interact/_helpers.mjs';
import path from 'node:path';
const OUT = path.resolve('docs/review/iter-1/i1-station-curves-linear/reviewB/shots');
export default async function (page, ctx) {
  const vp = ctx.viewport?.width < 600 ? 'phone' : 'desktop';
  const theme = await page.evaluate(() => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const tag = `${ctx.route}--${vp}--${theme}`;
  await dragHandle(page, 'linear-ab-a', { re: 0, im: 0 });
  await settle(page, 4);
  await page.evaluate(() => { const el = document.querySelector('.two-planes'); el.scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, -20); });
  await settle(page, 4); await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${tag}--a0-planes.png` });
  await page.evaluate(() => { document.getElementById('linear-ab-a').scrollIntoView({ block: 'center', behavior: 'instant' }); });
  await settle(page, 4); await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${tag}--a0-ab.png` });
  ctx.log('note: ' + await page.evaluate(() => document.getElementById('linear-note').textContent + ' hidden=' + document.getElementById('linear-note').hidden));
  ctx.log('readout: ' + await page.evaluate(() => document.getElementById('linear-readout').textContent));
}
