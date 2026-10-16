// Reviewer B: render all 29 problem cards (answers open) at the smoke viewport; check overflow, KaTeX errors, ids, chips.
export default async function (page, ctx) {
  const { assert, log } = ctx;
  const res = await page.evaluate(async () => {
    const K = await import('./js/core/station-kit.js'); const P = await import('./js/data/problems.js');
    const R = await import('./js/registry.js'); const S = await import('./js/core/store.js');
    const host = document.createElement('div'); host.id = 'rb-cards'; document.getElementById('view').append(host);
    const out = { cards: 0, errors: [], overflow: [], katexErr: 0, dupIds: [], missing: [] };
    for (const p of P.PROBLEMS) {
      const st = R.stationById(p.station);
      const c = Object.freeze({ station: st, stations: R.STATIONS, threads: R.THREADS, store: S.createStore('rb:'), navigate() {}, preset: null });
      const card = K.problemCard(c, p, { id: 'c-' + p.id.replace(/\./g, '-'), routes: true });
      host.append(card.el); card.setAnswerOpen(true); out.cards++;
      const id = 'c-' + p.id.replace(/\./g, '-');
      for (const suf of ['title', 'statement', 'decisions', 'why', 'answer', 'answer-toggle', 'answer-tex', 'answer-text', 'note', 'slot', 'route-cart', 'route-polar', 'aha']) if (!document.getElementById(`${id}-${suf}`)) out.missing.push(`${id}-${suf}`);
      if (card.el.dataset.problem !== p.id) out.errors.push('data-problem ' + p.id);
    }
    await new Promise((r) => setTimeout(r, 400));
    out.katexErr = host.querySelectorAll('.katex-error').length;
    const vw = document.documentElement.clientWidth;
    out.docOverflow = document.documentElement.scrollWidth - vw;
    for (const el of host.querySelectorAll('.problem-card')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) out.overflow.push(el.id + ' rect ' + Math.round(r.left) + '..' + Math.round(r.right));
      for (const ch of el.querySelectorAll('*')) {
        if (ch.closest('.tex-scroll') || ch.closest('.katex')) continue;
        const cr = ch.getBoundingClientRect();
        if (cr.width > 0 && cr.right > vw + 1) { out.overflow.push(el.id + ' child ' + ch.tagName + '.' + ch.className + ' right ' + Math.round(cr.right)); break; }
      }
    }
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); out.dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
    out.vw = vw;
    return out;
  });
  log(JSON.stringify(res));
  assert(res.cards === 29 && res.katexErr === 0 && res.missing.length === 0 && res.overflow.length === 0 && res.docOverflow <= 0 && res.dupIds.length === 0 && res.errors.length === 0, JSON.stringify(res));
  await page.locator('#rb-cards').scrollIntoViewIfNeeded();
}
