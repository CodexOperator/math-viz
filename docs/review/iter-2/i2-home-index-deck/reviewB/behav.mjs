const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  const { assert, log } = ctx;
  await page.waitForSelector('article.problem-card', { state: 'attached' });
  // keyboard: focus open button and press Enter / Space
  await page.focus('#problems-open-1-4-3');
  await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  assert((await page.getAttribute('#problems-open-1-4-3', 'aria-expanded')) === 'true', 'Enter opens a card');
  await page.keyboard.press('Space'); await page.waitForTimeout(120);
  assert((await page.getAttribute('#problems-open-1-4-3', 'aria-expanded')) === 'false', 'Space toggles it closed');
  // Names filter hash tokens and URL stays a bare token
  await page.evaluate(() => { location.hash = '#problems-names-home'; }); await page.waitForTimeout(250);
  assert(eq(await page.evaluate(() => window.__mv.problems.visible()), ['1.3.1', '2.2.2']), 'hash names-home');
  await page.evaluate(() => { location.hash = '#problems-names-continuous'; }); await page.waitForTimeout(250);
  assert(eq(await page.evaluate(() => window.__mv.problems.visible()), ['2.4.1']), 'hash names-continuous');
  await page.evaluate(() => { location.hash = '#problems-all'; }); await page.waitForTimeout(250);
  const f = await page.evaluate(() => window.__mv.problems.filter());
  log('after #problems-all filter=' + JSON.stringify(f));
  assert((await page.evaluate(() => window.__mv.problems.visible().length)) === 29, '#problems-all shows 29 again');
  // not-ticked filter + names
  await page.click('#problems-tick-1-4-2'); await page.waitForTimeout(100);
  await page.click('#problems-filter-todo'); await page.waitForTimeout(100);
  await page.click('#problems-filter-names-all'); await page.waitForTimeout(100);
  assert(eq(await page.evaluate(() => window.__mv.problems.visible()), ['1.4.1', '1.4.3']), 'todo + names all excludes the ticked 1.4.2: ' + await page.evaluate(() => window.__mv.problems.visible()));
  // empty state
  await page.click('#problems-filter-names-continuous'); await page.waitForTimeout(100);
  await page.click('#problems-tick-2-4-1').catch(() => {});
  // deck persists across station round trip (open 1.4.1, go home, come back)
  await page.click('#problems-filter-names-all-names'); await page.click('#problems-filter-all');
  await page.evaluate(() => document.getElementById('problems-open-1-4-1').scrollIntoView({ block: 'center' }));
  await page.click('#problems-open-1-4-1'); await page.waitForTimeout(100);
  await page.evaluate(() => { location.hash = '#home'; }); await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = '#problems'; }); await page.waitForTimeout(500);
  const deck = await page.evaluate(() => window.__mv.problems.deck());
  log('deck after round trip ' + JSON.stringify(deck));
  assert(eq(deck.open, ['1.4.1']), 'deck keeps 1.4.1 open across the round trip');
  // reload resets memory-only filter/deck
  await page.evaluate(() => { localStorage.removeItem('mv:progress'); });
  await page.reload({ waitUntil: 'load' }); await page.waitForSelector('article.problem-card', { state: 'attached' });
  const deck2 = await page.evaluate(() => window.__mv.problems.deck());
  assert(eq(deck2, { open: [], mode: 'one' }), 'a reload collapses everything (memory only): ' + JSON.stringify(deck2));
  log('behaviour ok');
}
