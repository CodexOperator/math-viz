import { clickChip, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.route !== 'problem-2-4-1' || ctx.label !== 'desktop') return;
  await page.waitForSelector('#branches-readout');
  ctx.log('BEFORE: ' + (await page.evaluate(() => document.getElementById('branches-problem').innerText)));
  await clickChip(page, 'branches-answer-toggle');
  await settle(page, 6); await page.waitForTimeout(500);
  ctx.log('AFTER: ' + (await page.evaluate(() => document.getElementById('branches-problem').innerText)));
  ctx.log('ANSWER tex: ' + (await page.evaluate(() => [...document.querySelectorAll('#branches-answer [data-tex]')].map(e=>e.dataset.tex).join(' | '))));
  ctx.log('title: ' + await page.title() + ' ; h1s: ' + await page.evaluate(() => document.querySelectorAll('h1').length));
  const loc = page.locator('#branches-problem'); await loc.scrollIntoViewIfNeeded(); await loc.screenshot({ path: 'docs/review/iter-1/i1-station-branches-graph4d/reviewB/problem-panel-after.png' });
}
