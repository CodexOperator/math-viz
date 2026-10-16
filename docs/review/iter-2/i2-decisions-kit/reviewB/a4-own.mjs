// Reviewer B's own A4 script, written from the goal's "how" text (not from the builder's script).
export default async function (page, ctx) {
  const { assert, log } = ctx;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { const h = document.createElement('div'); h.id = 'rb-host'; document.getElementById('view').append(h); });

  // (a)
  const a = await ev(async () => {
    const D = await import('./js/core/decisions.js'); const P = await import('./js/data/problems.js');
    document.getElementById('rb-host').append(D.chips(P.problemById('1.4.2'), { idPrefix: 't' }));
    const q = (s) => document.querySelector(s);
    return { addrText: q('#t-address').textContent, label: P.addressLabel('P->C'), namesText: q('#t-names').textContent, namesVal: q('#t-names').dataset.value, hidden: q('#t-meaning').hidden };
  });
  assert(a.addrText === a.label && a.addrText === 'Polar, then Cartesian', 'address text ' + a.addrText);
  assert(a.namesText === 'names: all' && a.namesVal === 'all' && a.hidden === true, JSON.stringify(a));
  await page.click('#t-names');
  let m = await ev(() => ({ h: document.querySelector('#t-meaning').hidden, t: document.querySelector('#t-meaning').textContent, e: document.querySelector('#t-names').getAttribute('aria-expanded') }));
  assert(!m.h && m.t.includes('Every name gives a different answer') && m.e === 'true', JSON.stringify(m));
  await page.click('#t-names');
  m = await ev(() => ({ h: document.querySelector('#t-meaning').hidden, e: document.querySelector('#t-names').getAttribute('aria-expanded') }));
  assert(m.h === true && m.e === 'false', 'second click hides ' + JSON.stringify(m));
  log('(a) ok');

  // (b)
  await ev(async () => { const D = await import('./js/core/decisions.js'); window.__rb = D.picker({ idPrefix: 'p' }); document.getElementById('rb-host').append(window.__rb.el); });
  await page.click('#p-address-p'); await page.click('#p-names-all');
  const g = await ev(() => window.__rb.get());
  assert(g.address === 'P' && g.names === 'all', JSON.stringify(g));
  await ev(() => window.__rb.mark({ address: true, names: false, expected: { address: 'P', names: 'any' } }));
  const mk = await ev(() => ({ nm: document.querySelector('#p-names-row').dataset.mark, ni: document.querySelector('#p-names-row').getAttribute('aria-invalid'), am: document.querySelector('#p-address-row').dataset.mark, st: document.querySelector('#p-status').textContent }));
  assert(mk.nm === 'wrong' && mk.ni === 'true' && mk.am === 'right' && mk.st.includes('Names: wrong'), JSON.stringify(mk));
  log('(b) ok ' + mk.st);

  // (c)
  const c = await ev(async () => {
    const G = await import('./js/core/moveglyph.js');
    const svg = G.moveGlyph({ re: -1, im: Math.sqrt(3) });
    document.getElementById('rb-host').append(svg);
    const first = { tag: svg.tagName, cls: svg.getAttribute('class'), label: svg.getAttribute('aria-label'), arcs: svg.querySelectorAll('path.glyph-arc').length, ray: !!svg.querySelector('line.glyph-ray'), r: svg.getAttribute('data-r') };
    G.updateGlyph(svg, 0);
    return { first, label0: svg.getAttribute('aria-label'), arcs0: svg.querySelectorAll('path.glyph-arc').length };
  });
  assert(c.first.cls.includes('move-glyph') && c.first.label === 'move: turn 120°, stretch 2' && c.first.arcs === 1 && c.first.ray && c.first.r === '2', JSON.stringify(c));
  assert(c.label0 === 'no move: 0' && c.arcs0 === 0, JSON.stringify(c));
  log('(c) ok');

  // (d)
  const d = await ev(async () => {
    const K = await import('./js/core/station-kit.js'); const P = await import('./js/data/problems.js');
    const R = await import('./js/registry.js'); const S = await import('./js/core/store.js');
    const ctx = Object.freeze({ station: R.stationById('roots'), stations: R.STATIONS, threads: R.THREADS, store: S.createStore('rb:'), navigate() {}, preset: null });
    const hd = K.header(ctx, { lede: 'x', active: '1.4.2' });
    document.getElementById('rb-host').append(hd);
    const card = K.problemCard(ctx, P.problemById('1.4.2'), { id: 't-problem' });
    document.getElementById('rb-host').append(card.el);
    const nav = K.links(ctx);
    document.getElementById('rb-host').append(nav);
    const q = (s) => document.querySelector(s);
    const anchors = [...nav.querySelectorAll('a')];
    return {
      h1: hd.querySelector('h1').textContent, chips: [...hd.querySelectorAll('a.problem-chip')].map((x) => [x.id, x.getAttribute('aria-current')]), badges: hd.querySelectorAll('span.thread-badge').length,
      stmt: q('#t-problem-statement').textContent, decChips: q('#t-problem-decisions').querySelectorAll('.decision-chip').length,
      toggle: q('#t-problem-answer-toggle').textContent, ansText: q('#t-problem-answer-text').textContent, expect: P.problemById('1.4.2').answer.text,
      prev: q('#roots-link-powers') && q('#roots-link-powers').dataset.dir, next: q('#roots-link-curves') && q('#roots-link-curves').dataset.dir,
      t2: q('#roots-link-powermap') && q('#roots-link-powermap').dataset.thread, t1: q('#roots-link-sets') && q('#roots-link-sets').dataset.thread,
      oneSpan: anchors.every((a) => a.children.length === 1 && a.children[0].tagName === 'SPAN' && a.childNodes.length === 1), nAnchors: anchors.length,
      cardAttrs: { tone: card.el.dataset.tone, problem: card.el.dataset.problem },
    };
  });
  assert(d.h1 === 'Roots: Divide the Staircase', 'h1 ' + d.h1);
  assert(JSON.stringify(d.chips) === JSON.stringify([['roots-problem-chip-1-4-1', null], ['roots-problem-chip-1-4-2', 'true'], ['roots-problem-chip-1-4-3', null]]), JSON.stringify(d.chips));
  assert(d.badges === 2, 'badges ' + d.badges);
  assert(d.stmt.includes('roots of') && d.decChips === 2 && d.toggle === 'Show the answer' && d.ansText === d.expect, JSON.stringify(d));
  assert(d.prev === 'prev' && d.next === 'next' && d.t2 === 'T2' && d.t1 === 'T1' && d.oneSpan, JSON.stringify(d));
  log('(d) ok ' + JSON.stringify({ stmt: d.stmt, ans: d.ansText, anchors: d.nAnchors }));

  // (e)
  await ev(() => window.__mv.app.request({ station: 'roots', problem: '1.4.2', family: '1.4.2', values: { c: { re: -81, im: 0 }, n: 4 } }));
  await ev(() => { location.hash = '#roots'; });
  await page.waitForTimeout(600);
  const p1 = await ev(() => window.__mv.app.preset());
  assert(JSON.stringify(p1) === JSON.stringify({ kind: 'values', station: 'roots', problem: '1.4.2', family: '1.4.2', values: { c: { re: -81, im: 0 }, n: 4 } }), JSON.stringify(p1));
  await ev(() => { location.hash = '#home'; }); await page.waitForTimeout(600);
  await ev(() => { location.hash = '#roots'; }); await page.waitForTimeout(600);
  const p2 = await ev(() => window.__mv.app.preset());
  assert(p2 === null, 'consumed once; got ' + JSON.stringify(p2));
  log('(e) ok');
  await ev(() => { location.hash = '#' + (window.__rbRoute || 'home'); });
}
