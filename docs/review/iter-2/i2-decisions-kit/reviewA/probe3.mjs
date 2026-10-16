// Review A probe 3: the card's scroll hint, the answer reveal, the label copy, focus order.
export default async function (page, ctx) {
  const { log, viewport } = ctx;
  const r = await page.evaluate(async () => {
    const R = {};
    const pr = await import('./js/data/problems.js');
    const kit = await import('./js/core/station-kit.js');
    const reg = await import('./js/registry.js');
    const host = document.createElement('div');
    host.id = 'rv3';
    host.style.maxWidth = '100%';
    document.querySelector('#view').append(host);
    const c = { station: reg.stationById('sets'), stations: reg.STATIONS, threads: reg.THREADS, store: { set() {} }, navigate() {} };
    const card = kit.problemCard(c, pr.problemById('1.5.2'), { id: 'wide' });
    host.append(card.el);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(100);
    const hint = card.el.querySelector('#wide-answer-hint');
    R.closed = { hintHidden: hint.hidden, open: card.els.answer.open };
    card.els.answer.querySelector('summary').click();
    await sleep(250);
    const sc = card.els.answerTex;
    R.opened = { open: card.els.answer.open, hintHidden: hint.hidden, sw: sc.scrollWidth, cw: sc.clientWidth, label: card.el.querySelector('summary').textContent };
    // narrow it
    host.style.width = '260px';
    await sleep(250);
    R.narrow = { hintHidden: hint.hidden, sw: sc.scrollWidth, cw: sc.clientWidth, overflowPage: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    host.style.width = '';
    await sleep(250);
    R.wide = { hintHidden: hint.hidden, sw: sc.scrollWidth, cw: sc.clientWidth };
    // short answer never shows the hint
    const c2 = kit.problemCard(c, pr.problemById('1.1.2'), { id: 'short', answer: 'open' });
    host.append(c2.el);
    await sleep(150);
    R.short = { hintHidden: c2.el.querySelector('#short-answer-hint').hidden };
    // focus order inside a card (tab sequence)
    const seq = [];
    host.querySelectorAll('button, summary, [tabindex="0"], a').forEach((e) => { if (host.contains(e) && e.closest('#wide')) seq.push(e.id || e.tagName); });
    R.focusables = seq;
    // switching problems keeps answer open state and clears hint properly
    card.setProblem(pr.problemById('1.1.1'));
    await sleep(100);
    R.after = { open: card.els.answer.open, hintHidden: hint.hidden, title: card.els.title.textContent, tone: card.el.dataset.tone, chips: card.el.querySelectorAll('.decision-chip').length, meaningHidden: card.el.querySelector('#wide-meaning').hidden };
    // open a meaning then switch problem: meaning gone (fresh chips)
    card.el.querySelector('#wide-names').click();
    const openNow = !card.el.querySelector('#wide-meaning').hidden;
    card.setProblem(pr.problemById('1.4.1'));
    R.meaningReset = { openNow, hiddenAfter: card.el.querySelector('#wide-meaning').hidden, count: card.el.querySelectorAll('[id="wide-meaning"]').length };
    // duplicate ids across the whole document?
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    R.dupIds = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
    card.destroy();
    R.destroyed = { still: !!document.querySelector('#wide') };
    host.remove();
    return R;
  });
  log(JSON.stringify(r));
}
