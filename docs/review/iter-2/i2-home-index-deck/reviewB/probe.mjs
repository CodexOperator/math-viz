export default async function (page, ctx) {
  if (ctx.route === 'home') {
    await page.waitForSelector('#home-decisions');
    const t = await page.evaluate(() => document.getElementById('home-decisions').outerHTML);
    console.log('HOME-DECISIONS', ctx.label, t.slice(0, 6000));
  }
  if (ctx.route === 'problems') {
    await page.waitForSelector('article.problem-card', { state: 'attached' });
    await page.evaluate(() => document.getElementById('problems-open-1-4-2').click());
    await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('problems-reveal-1-4-2') && document.getElementById('problems-reveal-1-4-2').click());
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => document.getElementById('problems-card-1-4-2').outerHTML);
    console.log('CARD', ctx.label, t.slice(0, 7000));
  }
}
