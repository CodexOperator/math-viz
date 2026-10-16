export default async function (page, ctx) {
  await page.waitForSelector('#home-decisions');
  const d = await page.evaluate(() => { const e = document.getElementById('home-decision-names'); return { len: e.textContent.length, t: e.textContent.replace(/\s+/g,' ').slice(0, 900), hasAny: /\bany\b/.test(e.textContent), hasAll: /\ball\b/.test(e.textContent), hasHome: /\bhome\b/.test(e.textContent), hasCont: /\bcontinuous\b/.test(e.textContent) }; });
  console.log('NAMESBLOCK', ctx.label, JSON.stringify(d));
}
