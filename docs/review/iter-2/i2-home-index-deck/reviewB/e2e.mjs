export default async function (page, ctx) {
  const { assert, log } = ctx;
  if (ctx.route === 'problems') {
    await page.waitForSelector('article.problem-card', { state: 'attached' });
    await page.evaluate(() => document.getElementById('problems-rehearse-1-4-2').scrollIntoView({ block: 'center' }));
    await page.click('#problems-rehearse-1-4-2'); await page.waitForTimeout(900);
    const h = await page.evaluate(() => location.hash);
    const card = await page.evaluate(() => { const c = document.getElementById('rehearse-card'); return c ? { p: c.dataset.problem, seed: c.dataset.seed } : null; });
    log(`hash=${h} card=${JSON.stringify(card)}`);
    assert(h === '#rehearse-1-4-2', 'hash is #rehearse-1-4-2');
    assert(card && card.p === '1.4.2', 'the Rehearsal Room opened a 1.4.2 card');
  } else {
    await page.waitForSelector('a.map-station[data-station="rehearse"]');
    await page.evaluate(() => document.querySelector('a.map-station[data-station="rehearse"]').scrollIntoView({ block: 'center' }));
    await page.click('a.map-station[data-station="rehearse"]'); await page.waitForTimeout(700);
    const h = await page.evaluate(() => location.hash);
    assert(h === '#rehearse', 'map click goes to #rehearse: ' + h);
    assert(await page.evaluate(() => !!document.getElementById('rehearse-card')), 'rehearse card rendered');
    log('map rehearse stop opens the room');
  }
}
