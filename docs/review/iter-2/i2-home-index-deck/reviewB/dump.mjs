import fs from 'node:fs';
export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  await page.waitForSelector('article.problem-card', { state: 'attached' });
  await page.evaluate(() => { document.getElementById('problems-open-all').click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelectorAll('button.reveal').forEach((b) => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); }); });
  await page.waitForTimeout(500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('article.problem-card[data-problem]')].map((c) => {
    const ans = c.querySelector('.answer');
    const ann = ans ? [...ans.querySelectorAll('annotation')].map((a) => a.textContent) : [];
    return { id: c.dataset.problem, address: c.dataset.address, names: c.dataset.names, station: c.dataset.station, open: c.dataset.open,
      statement: (c.querySelector('.pc-statement') || {}).textContent, ann, answerText: ans ? ans.textContent.replace(/\s+/g, ' ').slice(0, 600) : null,
      aha: ((c.querySelector('.pc-aha span') || {}).textContent) };
  }));
  fs.writeFileSync('docs/review/iter-2/i2-home-index-deck/reviewB/dump.json', JSON.stringify(rows, null, 1));
  console.log('DUMPED', rows.length);
}
