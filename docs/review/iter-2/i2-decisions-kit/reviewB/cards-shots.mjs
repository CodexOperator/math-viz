export default async function (page, ctx) {
  await page.evaluate(async () => {
    const K = await import('./js/core/station-kit.js'); const P = await import('./js/data/problems.js');
    const R = await import('./js/registry.js'); const S = await import('./js/core/store.js');
    const host = document.createElement('div'); host.id = 'rb-cards'; host.style.cssText = 'display:grid;gap:14px'; document.getElementById('view').append(host);
    for (const id of ['1.4.2', '2.4.1', '1.5.2', '1.3.2']) {
      const p = P.problemById(id); const st = R.stationById(p.station);
      const c = Object.freeze({ station: st, stations: R.STATIONS, threads: R.THREADS, store: S.createStore('rb:'), navigate() {}, preset: null });
      const card = K.problemCard(c, p, { id: 'c-' + id.replace(/\./g, '-'), routes: true });
      host.append(card.el); card.setAnswerOpen(true);
      if (id === '1.3.2') { const g = (await import('./js/core/moveglyph.js')); const s = g.moveGlyph({ re: 512, im: -512 * Math.sqrt(3) }, { scale: 2 }); card.els.slot.append('a = ', s, ' ', g.moveGlyph({ re: -1, im: Math.sqrt(3) })); }
    }
  });
  await page.waitForTimeout(500);
  await page.locator('#rb-cards').screenshot({ path: `${ctx.out || 'docs/review/iter-2/i2-decisions-kit/reviewB/cards2'}/cards-${ctx.label}.png` });
}
