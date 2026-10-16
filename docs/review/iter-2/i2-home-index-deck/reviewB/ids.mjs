export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  await page.waitForSelector(ctx.route === 'home' ? 'a.map-station' : 'article.problem-card', { state: 'attached' });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const els = [...document.querySelectorAll('#view ' + sel)];
    const noId = els.filter((e) => !e.id).map((e) => e.tagName + '.' + (e.className && e.className.baseVal === undefined ? e.className : '') + ' ' + (e.getAttribute('href') || e.textContent.slice(0, 30)));
    const noLabel = els.filter((e) => {
      const n = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || '').trim();
      const lab = e.labels && e.labels.length;
      return !n && !lab && !e.getAttribute('aria-labelledby');
    }).map((e) => e.id || e.tagName);
    const ids = {}; document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
    const dups = Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k);
    const tiny = els.filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.height < 24 || b.width < 24) && e.type !== 'checkbox'; }).map((e) => (e.id || e.tagName) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
    return { total: els.length, noId: noId.slice(0, 10), noIdCount: noId.length, noLabel, dups, tiny: tiny.slice(0, 10) };
  });
  console.log('IDS', ctx.route, JSON.stringify(r));
}
