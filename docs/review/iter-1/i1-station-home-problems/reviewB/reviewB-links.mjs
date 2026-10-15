// Review B: follow every problem-card link and topic start button through the real router (no stubs).
export default async function (page, ctx) {
  if (ctx.route !== 'problems' || ctx.viewport.width < 1000) return;
  const { log, assert } = ctx;
  await page.waitForSelector('.problem-card');
  const links = await page.evaluate(() => [
    ...[...document.querySelectorAll('.problem-card')].map((c) => ({ kind: 'problem', id: c.dataset.problem, href: c.querySelector('a[href^="#problem-"]').getAttribute('href'), st: c.dataset.station })),
    ...[...document.querySelectorAll('.topic-card')].map((c) => ({ kind: 'topic', id: c.dataset.topic, href: c.querySelector('a.btn[href^="#topic-"]').getAttribute('href') })),
  ]);
  const bad = [];
  for (const l of links) {
    await page.evaluate((h) => { location.hash = h; }, l.href);
    await page.waitForTimeout(250);
    await page.waitForFunction(() => document.getElementById('view') && document.getElementById('view').dataset.station && document.getElementById('view').dataset.station !== 'problems', null, { timeout: 6000 }).catch(() => {});
    const r = await page.evaluate(() => ({ st: document.getElementById('view').dataset.station, h1: (document.querySelector('#view h1') || {}).textContent || '', panel: !!document.querySelector('#view .under-construction, #view .route-error, #view .station-error') }));
    if (l.kind === 'problem' && (r.st !== l.st || r.panel)) bad.push([l.id, l.st, r.st, r.panel]);
    if (l.kind === 'topic' && (!r.st || r.st === 'problems' || r.panel)) bad.push([l.id, r.st, r.panel]);
    await page.evaluate(() => { location.hash = '#problems'; });
    await page.waitForSelector('.problem-card', { timeout: 6000 });
  }
  log(`followed ${links.length} links; bad: ${JSON.stringify(bad)}`);
  assert(bad.length === 0, `every card link lands on its owning station: ${JSON.stringify(bad)}`);
}
