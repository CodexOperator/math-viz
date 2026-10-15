import { clickChip, settle, readText } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  await settle(page, 6); await page.waitForTimeout(800);
  const t = await page.evaluate(() => document.querySelector('#view').innerText.replace(/\n{2,}/g, '\n').replace(/[\u{1D400}-\u{1D7FF}]/gu, '').slice(0, 6000));
  ctx.log('\n' + t);
}
