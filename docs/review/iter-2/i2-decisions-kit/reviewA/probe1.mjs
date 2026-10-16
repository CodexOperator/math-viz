// Review A probe for i2-decisions-kit: independent adversarial checks (not the builder's script).
// node tools/smoke.mjs --route home --script docs/review/iter-2/i2-decisions-kit/reviewA/probe1.mjs --out docs/review/iter-2/i2-decisions-kit/reviewA/probe
export default async function (page, ctx) {
  const { log, viewport } = ctx;
  const out = {};

  // ---- the menu: part V note (nav screenshot)
  if (viewport.width < 600) {
    await page.click('#nav-toggle');
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => document.querySelector('#nav-part-V')?.scrollIntoView({ block: 'center' }));
  const partV = await page.evaluate(() => {
    const t = document.querySelector('#nav-part-V');
    if (!t) return null;
    const r = t.getBoundingClientRect();
    const kids = [...t.children].map((c) => ({ cls: c.className, text: c.textContent, h: Math.round(c.getBoundingClientRect().height), w: Math.round(c.getBoundingClientRect().width) }));
    return { h: Math.round(r.height), w: Math.round(r.width), text: t.textContent, kids, navW: document.querySelector('#site-nav').getBoundingClientRect().width };
  });
  log('part V ' + JSON.stringify(partV));
  const navEl = await page.$('#site-nav');
  if (navEl) await navEl.screenshot({ path: `docs/review/iter-2/i2-decisions-kit/reviewA/probe/nav-${ctx.label}.png` });
  if (viewport.width < 600) { await page.click('#nav-toggle'); await page.waitForTimeout(200); }

  // ---- kit probes in the page
  const res = await page.evaluate(async () => {
    const R = {};
    const dec = await import('./js/core/decisions.js');
    const pr = await import('./js/data/problems.js');
    const kit = await import('./js/core/station-kit.js');
    const mg = await import('./js/core/moveglyph.js');
    const reg = await import('./js/registry.js');
    const host = document.createElement('div');
    host.id = 'rv-host';
    document.querySelector('#view').append(host);
    const ctxFor = (id) => ({ station: reg.stationById(id), stations: reg.STATIONS, threads: reg.THREADS, store: { set() {} }, navigate() {} });

    // P1: every problem card renders: tex errors, tone, chips, hidden answer
    const cards = [];
    for (const p of pr.PROBLEMS) {
      const card = kit.problemCard(ctxFor('roots'), p, { id: 'c' + p.id.replace(/\./g, '-'), routes: true });
      host.append(card.el);
      cards.push({ id: p.id, err: card.el.querySelectorAll('.tex-error').length, tone: card.el.dataset.tone, chips: card.el.querySelectorAll('.decision-chip').length,
        stmt: card.els.statement.textContent.length, ansText: card.els.answerText.textContent === p.answer.text, hasKatex: !!card.els.answerTex.querySelector('.katex'),
        route: card.els.routeCart.querySelector('p').textContent.length > 0 });
    }
    R.cards = { total: cards.length, errs: cards.filter((c) => c.err).map((c) => c.id), noKatex: cards.filter((c) => !c.hasKatex).map((c) => c.id), badAns: cards.filter((c) => !c.ansText).map((c) => c.id),
      chips2: cards.every((c) => c.chips === 2), noRoute: cards.filter((c) => !c.route).map((c) => c.id), tones: Object.fromEntries(['cart', 'polar', 'accent'].map((t) => [t, cards.filter((c) => c.tone === t).map((c) => c.id)])) };

    // P2: empty card is visually neutral
    const e = kit.problemCard(ctxFor('roots'), null, { id: 'empty1' });
    host.append(e.el);
    const cs = (el) => getComputedStyle(el);
    R.empty = { answerDisplay: cs(e.els.answer).display, titleDisplay: cs(e.els.title).display, note: e.els.note.textContent, noteDisplay: cs(e.els.note).display, slotDisplay: cs(e.els.slot).display, h: Math.round(e.el.getBoundingClientRect().height) };

    // P3: address chip border for multi-tone inside a card (design says --border-strong for 2-3 tones)
    const p142 = pr.problemById('1.4.2');
    const card142 = kit.problemCard(ctxFor('roots'), p142, { id: 'c142x' });
    host.append(card142.el);
    const rootCS = cs(document.documentElement);
    const addr = card142.el.querySelector('#c142x-address');
    R.addrChip = { border: cs(addr).borderTopColor, borderStrong: rootCS.getPropertyValue('--border-strong').trim(), accent: rootCS.getPropertyValue('--accent').trim(), style: cs(addr).borderTopStyle, cardTone: card142.el.dataset.tone };
    // and the same chip outside any card
    const bare = dec.chips(p142, { idPrefix: 'bare1' });
    host.append(bare);
    R.addrChipBare = { border: cs(bare.querySelector('#bare1-address')).borderTopColor };
    // one-tone address chip inside a card of the other tone (P-address on a 'cart' card is cart): P1 polar? use 1.1.1 (C)
    const p111 = pr.problemById('1.1.1');
    const c111 = kit.problemCard(ctxFor('arithmetic'), p111, { id: 'c111x' });
    host.append(c111.el);
    R.cartCard = { cardTone: c111.el.dataset.tone, addrBorder: cs(c111.el.querySelector('#c111x-address')).borderTopColor, namesBorder: cs(c111.el.querySelector('#c111x-names')).borderTopColor, cart: rootCS.getPropertyValue('--cart').trim() };

    // P4: names chip for every code: border/background/dash
    const probe = {};
    for (const code of dec.NAMES_CODES) {
      const h = dec.chips({ id: 'x', address: 'C', names: code }, { idPrefix: 'n' + code });
      host.append(h);
      const c = h.querySelector('#n' + code + '-names');
      probe[code] = { border: cs(c).borderTopColor, style: cs(c).borderTopStyle, bg: cs(c).backgroundColor, color: cs(c).color, solid: c.querySelectorAll('.ns-solid').length, rects: c.querySelectorAll('rect').length, seam: c.querySelectorAll('.ns-seam').length, dash: c.querySelectorAll('.ns-dash').length };
    }
    R.names = probe;

    // P5: glyph stress: 1000 updates keep one arc, same node
    const g = mg.moveGlyph({ re: 1, im: 1 });
    host.append(g);
    const arc0 = g.querySelector('.glyph-arc');
    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) mg.updateGlyph(g, { re: Math.cos(i / 10) * 1.5, im: Math.sin(i / 10) * 1.5 });
    R.glyphStress = { ms: Math.round(performance.now() - t0), arcs: g.querySelectorAll('.glyph-arc').length, children: g.children.length, same: g.querySelector('.glyph-arc') === arc0 };
    // origin crossing and back
    mg.updateGlyph(g, 0); const noArc = g.querySelectorAll('.glyph-arc').length; mg.updateGlyph(g, { re: 0, im: 1 });
    R.glyphOrigin = { noArc, backArc: g.querySelectorAll('.glyph-arc').length, label: g.getAttribute('aria-label'), d: g.querySelector('.glyph-arc').getAttribute('d') };
    // Arg exactly pi, -pi*, tiny negative imaginary on negative real
    R.glyphPi = ['-1', '-1-0'].map((s) => 0).length;
    const gg = (z) => mg.glyphGeometry(z);
    R.theta = { neg: gg({ re: -1, im: 0 }).theta, negNZ: gg({ re: -1, im: -0 }).theta, tiny: gg({ re: -1, im: -1e-12 }).theta, tinyPos: gg({ re: -1, im: 1e-12 }).theta };
    R.textTiny = [mg.glyphText({ re: -1, im: -1e-12 }), mg.glyphText({ re: 1e-5, im: 0 }), mg.glyphText({ re: 2.0005, im: 0 }), mg.glyphText({ re: 0.0004, im: 0.0003 })];

    // P6: neighbours across all stations: no self, no duplicates in prev/next, links unique ids
    const idsDup = [];
    const nbBad = [];
    for (const s of reg.STATIONS) {
      const nav = kit.links(ctxFor(s.id));
      const ids = [...nav.querySelectorAll('a')].map((a) => a.id);
      if (new Set(ids).size !== ids.length) idsDup.push(s.id);
      const hrefs = [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'));
      if (hrefs.includes('#' + s.id)) nbBad.push(s.id);
      for (const a of nav.querySelectorAll('a')) if (a.children.length !== 1 || a.firstElementChild.tagName !== 'SPAN') nbBad.push(s.id + ':span');
    }
    R.links = { idsDup, nbBad, counts: reg.STATIONS.map((s) => kit.links(ctxFor(s.id)).querySelectorAll('a').length).join(',') };

    // P7: header for every station: h1 text, chips count equals problems; link targets resolvable
    const hdr = [];
    for (const s of reg.STATIONS) {
      const h = kit.header(ctxFor(s.id), { lede: 'lede' });
      const chips = [...h.querySelectorAll('a.problem-chip')];
      const want = pr.problemsForStation(s.id).length;
      hdr.push({ id: s.id, ok: chips.length === want && h.querySelector('h1').textContent.replace(/\s/g, '').length > 0 });
    }
    R.header = hdr.filter((x) => !x.ok).map((x) => x.id);
    const rh = kit.header(ctxFor('rehearse'), {});
    R.rehearseChips = rh.querySelectorAll('a.problem-chip').length;
    R.rehearseBadges = rh.querySelectorAll('.thread-badge').length;

    host.remove();
    return R;
  });
  log(JSON.stringify(res, null, 1));
  ctx.res = res;
}
