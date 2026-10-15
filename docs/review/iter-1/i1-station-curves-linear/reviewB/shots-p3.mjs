import { settle } from '../../../../../tests/interact/_helpers.mjs';
import path from 'node:path';
const OUT = path.resolve('docs/review/iter-1/i1-station-curves-linear/reviewB/shots');
export default async function (page, ctx) {
  const vp = ctx.viewport?.width < 600 ? 'phone' : 'desktop';
  const theme = await page.evaluate(() => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const tag = `${ctx.route}--${vp}--${theme}`;
  await page.evaluate(() => { document.getElementById('linear-problem-working').open = true; document.getElementById('linear-problem-answer').open = true; });
  await page.waitForTimeout(400); await settle(page, 3);
  await page.evaluate(() => document.getElementById('linear-problem').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await settle(page, 3); await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${tag}--card-open.png` });
  await page.evaluate(() => document.getElementById('linear-compose').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await settle(page, 3); await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${tag}--compose.png` });
}
