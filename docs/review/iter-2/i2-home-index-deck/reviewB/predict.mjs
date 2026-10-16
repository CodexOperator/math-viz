export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  await page.waitForSelector('article.problem-card', { state: 'attached' });
  await page.click('#problems-predict'); await page.waitForTimeout(150);
  await page.evaluate(() => document.getElementById('problems-open-1-4-2').scrollIntoView({ block: 'center' }));
  await page.click('#problems-open-1-4-2'); await page.waitForTimeout(200);
  const el = await page.$('#problems-card-1-4-2');
  await page.evaluate(() => window.scrollBy(0, -300));
  await page.screenshot({ path: 'docs/review/iter-2/i2-home-index-deck/reviewB/predict-open.png' });
  await page.evaluate(() => { document.getElementById('problems-predict').checked && document.getElementById('problems-predict').click(); });
}
