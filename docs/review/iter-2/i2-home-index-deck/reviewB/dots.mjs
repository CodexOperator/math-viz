export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  await page.evaluate(() => {
    localStorage.setItem('mv:rehearse.scores', JSON.stringify({ '1.4.2': { tried: 3, right: 2, last: 1 }, '1.4.1': { tried: 1, right: 0, last: 1 }, '1.1.1': { tried: 2, right: 1, last: 1 } }));
    localStorage.setItem('mv:progress', JSON.stringify({ '1.4.2': true, '1.4.3': true }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('circle.pdot');
  const info = await page.evaluate(() => [...document.querySelectorAll('circle.pdot')].filter((c) => /1\.4\.|1\.1\.1/.test(c.dataset.problem)).map((c) => ({ p: c.dataset.problem, cls: c.getAttribute('class'), r: c.getAttribute('r') })));
  console.log('DOTS', JSON.stringify(info));
  const text = await page.evaluate(() => document.getElementById('home-progress') ? document.getElementById('home-progress').textContent : null);
  console.log('PROGRESS', text);
  const aria = await page.evaluate(() => [...document.querySelectorAll('a.map-station')].filter((a) => ['roots','arithmetic'].includes(a.dataset.station)).map((a) => a.getAttribute('aria-label')));
  console.log('ARIA', JSON.stringify(aria));
  const el = await page.$('#home-map-host');
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: 'docs/review/iter-2/i2-home-index-deck/reviewB/map-rehearsed.png' });
  await page.evaluate(() => { localStorage.removeItem('mv:rehearse.scores'); localStorage.removeItem('mv:progress'); });
}
