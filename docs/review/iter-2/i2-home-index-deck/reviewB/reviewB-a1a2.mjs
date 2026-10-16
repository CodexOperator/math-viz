// Review B throwaway: A1 and A2 of i2-home-index-deck, implemented literally from docs/goals/iter-2.json.
// Run: node tools/smoke.mjs --route home,home-T2,problems,problems-names-all --script docs/review/iter-2/i2-home-index-deck/reviewB/reviewB-a1a2.mjs --no-shots
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const wide = ctx.viewport.width >= 1000;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const visible = () => ev(() => window.__mv.problems.visible());
  const attr = (sel, a) => ev(([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null; }, [sel, a]);
  const isShown = (sel) => ev((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return !e.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; }, sel);
  const click = async (sel) => { await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await page.click(sel); await page.waitForTimeout(120); };
  const openIds = () => ev(() => [...document.querySelectorAll('article.problem-card[data-open="true"]')].map((c) => c.dataset.problem));

  if (ctx.route === 'problems-names-all') {
    await page.waitForSelector('article.problem-card', { state: 'attached' });
    assert(eq(await visible(), ['1.4.1', '1.4.2', '1.4.3']), `names-all visible = ${await visible()}`);
    assert((await attr('#problems-filter-names-all', 'aria-pressed')) === 'true', 'filter-names-all aria-pressed true');
    log('names-all route ok');
    return;
  }

  if (ctx.route === 'home' || ctx.route === 'home-T2') {
    await page.waitForSelector('a.map-station');
    const stations = await ev(() => [...document.querySelectorAll('a.map-station')].map((a) => a.dataset.station));
    const reg = await ev(async () => (await import('./js/registry.js')).STATIONS.map((s) => s.id));
    assert(stations.length === 22, `22 a.map-station, got ${stations.length}`);
    assert(eq(stations, reg), `registry order: ${stations.join(',')}`);
    const iR = stations.indexOf('rehearse'), iP = stations.indexOf('problems');
    assert(iR >= 0 && iP === iR + 1, 'rehearse directly before problems');
    if (ctx.route === 'home-T2') {
      const dim = await ev(() => document.querySelectorAll('#home-map a.map-station.is-dim').length);
      assert(dim === 10, `home-T2: is-dim count 10, got ${dim}`);
      log('home-T2 dim=10 ok');
      return;
    }
    const dec = await ev(() => {
      const d = document.getElementById('home-decisions');
      return d ? { has: true, addr: !!d.querySelector('#home-decision-address'), names: !!d.querySelector('#home-decision-names'),
        addrText: (d.querySelector('#home-decision-address') || {}).textContent || '', namesText: (d.querySelector('#home-decision-names') || {}).textContent || '' } : { has: false };
    });
    assert(dec.has && dec.addr && dec.names, 'home-decisions contains both blocks');
    assert(/Cartesian/.test(dec.addrText) && /polar/i.test(dec.addrText), `address block mentions Cartesian and polar: ${dec.addrText.slice(0, 120)}`);
    for (const w of ['any', 'all', 'home', 'continuous']) assert(dec.namesText.includes(w), `names block mentions ${w}`);
    // is-rehearsed
    await page.evaluate(() => localStorage.setItem('mv:rehearse.scores', JSON.stringify({ '1.4.2': { tried: 1, right: 1, last: 1 } })));
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('circle.pdot');
    const dots = await ev(() => [...document.querySelectorAll('circle.pdot')].map((c) => ({ p: c.getAttribute('data-problem'), r: c.classList.contains('is-rehearsed') })));
    const reh = dots.filter((d) => d.r).map((d) => d.p);
    assert(eq(reh, ['1.4.2']), `only 1.4.2 is-rehearsed: ${reh}; total dots ${dots.length}`);
    assert(dots.length === 29, `29 problem dots, got ${dots.length}`);
    // layout and rows
    const lay = await ev(() => window.__mv.home.layout());
    if (wide) {
      assert(lay === 'wide', `layout wide at 1280, got ${lay}`);
      const ys = await ev(() => { const s = new Set(); document.querySelectorAll('#home-map a.map-station').forEach((a) => { const r = a.getBoundingClientRect(); s.add(Math.round((r.top + r.bottom) / 2 / 6)); }); return [...s].sort((a, b) => a - b); });
      assert(ys.length === 3, `3 distinct y values for pills (bucketed): ${ys}`);
      const rows = await ev(() => { const m = {}; document.querySelectorAll('#home-map a.map-station').forEach((a) => { const r = a.getBoundingClientRect(); const k = Math.round((r.top + r.bottom) / 2 / 6); m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort((a, b) => a - b).map((k) => m[k]); });
      assert(eq(rows, [8, 8, 6]), `rows 8,8,6: ${rows}`);
    } else {
      assert(lay === 'narrow', `layout narrow at phone, got ${lay}`);
    }
    // overflow
    const ov = await ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(ov <= 0, `horizontal overflow ${ov}`);
    // exact stored state cleanup
    await page.evaluate(() => localStorage.removeItem('mv:rehearse.scores'));
    log('home A2 ok');
    return;
  }

  // ---- problems
  await page.waitForSelector('article.problem-card');
  const cards = await ev(() => [...document.querySelectorAll('article.problem-card')].map((c) => c.getAttribute('data-open')));
  assert(cards.length === 29 && cards.every((v) => v === 'false'), `29 collapsed cards: ${cards.length}`);
  const h = await ev(() => document.documentElement.scrollHeight);
  assert(h < (wide ? 4000 : 7500), `height ${h}`);
  const bad = await ev(async () => {
    const { PROBLEMS } = await import('./js/data/problems.js');
    const out = [];
    for (const p of PROBLEMS) {
      const k = p.id.replace(/\./g, '-');
      const a = document.getElementById(`problems-card-${k}-address`);
      const n = document.getElementById(`problems-card-${k}-names`);
      const r = document.querySelector(`a#problems-rehearse-${k}[href="#rehearse-${k}"]`);
      if (!a || !a.classList.contains('decision-chip')) out.push(`${p.id} addr`);
      if (!n || !n.classList.contains('decision-chip')) out.push(`${p.id} names`);
      if (!r) out.push(`${p.id} rehearse`);
    }
    return out;
  });
  assert(bad.length === 0, `chips and rehearse: ${bad}`);
  assert((await attr('#problems-card-1-4-2-names', 'data-value')) === 'all', '1.4.2 names all');

  await click('#problems-open-1-4-2');
  assert((await attr('article[data-problem="1.4.2"]', 'data-open')) === 'true', '1.4.2 open true');
  assert((await attr('#problems-open-1-4-2', 'aria-expanded')) === 'true', 'aria-expanded true');
  // predict is off at this point? the reveal button must be visible
  assert(await isShown('#problems-reveal-1-4-2'), '#problems-reveal-1-4-2 visible after opening');
  await click('#problems-open-1-4-1');
  assert(eq(await openIds(), ['1.4.1']), `mode one: open = ${await openIds()}`);
  assert((await attr('article[data-problem="1.4.2"]', 'data-open')) === 'false', '1.4.2 collapsed in mode one');
  await click('#problems-mode-all');
  await click('#problems-open-1-4-2');
  const both = await openIds();
  assert(both.includes('1.4.1') && both.includes('1.4.2') && both.length === 2, `mode all: both open: ${both}`);
  await click('#problems-collapse-all');
  assert((await openIds()).length === 0, 'collapse-all: none open');

  const T = { all: ['1.4.1', '1.4.2', '1.4.3'], home: ['1.3.1', '2.2.2'], continuous: ['2.4.1'],
    none: ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.5.1', '1.5.2', '2.1.2', '3.1.1', '3.2.1', 'P3', 'P7'] };
  for (const k of ['all', 'home', 'continuous', 'none']) {
    await click(`#problems-filter-names-${k}`);
    const v = await visible();
    assert(eq([...v].sort(), [...T[k]].sort()), `names ${k}: ${v}`);
    if (k === 'none') assert(v.length === 11, 'none has 11');
  }
  await click('#problems-filter-names-all-names');
  assert((await visible()).length === 29, 'all-names 29');
  // chapter filter combination: filter 1 + names any -> 1.3.2 only
  await click('#problems-filter-1');
  await click('#problems-filter-names-any');
  assert(eq(await visible(), ['1.3.2']), `chapter 1 + any: ${await visible()}`);
  await click('#problems-filter-names-all-names');
  await click('#problems-filter-all');
  assert((await visible()).length === 29, 'back to 29');

  // predict first
  const pred = await ev(() => document.getElementById('problems-predict').checked);
  if (!pred) await click('#problems-predict');
  await click('#problems-open-1-4-2');
  const sel = 'article[data-problem="1.4.2"]';
  const decShown = await isShown(`${sel} .decisions`);
  const stationLink = await ev(() => { const c = document.querySelector('article[data-problem="1.4.2"]'); const a = [...c.querySelectorAll('a[href^="#"]')].filter((x) => !/rehearse/.test(x.id) && !/^#problem-/.test(x.getAttribute('href'))); return a.map((x) => x.id + '|' + x.getAttribute('href')); });
  log(`predict on: decisions shown=${decShown}; station-ish links: ${stationLink.join(' ; ')}`);
  // the chips on the collapsed line stay? The criterion says "its .decisions ... hidden until reveal"
  const decVis = await ev(() => [...document.querySelectorAll('article[data-problem="1.4.2"] .decisions')].map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { hidden: e.hidden, display: cs.display, vis: cs.visibility, w: r.width, h: r.height, inDetail: !!e.closest('[hidden]') }; }));
  log(`decisions elements: ${JSON.stringify(decVis)}`);
  assert(decVis.every((d) => d.hidden || d.display === 'none' || d.w === 0 || d.inDetail), `.decisions hidden before reveal: ${JSON.stringify(decVis)}`);
  const stationVis = await ev(() => { const c = document.querySelector('article[data-problem="1.4.2"]'); const a = c.querySelector('a.station-chip'); if (!a) return null; const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { id: a.id, hidden: a.hidden || !!a.closest('[hidden]'), display: cs.display, w: r.width }; });
  log(`station link: ${JSON.stringify(stationVis)}`);
  assert(stationVis === null || stationVis.hidden || stationVis.display === 'none' || stationVis.w === 0, `station link hidden before reveal: ${JSON.stringify(stationVis)}`);
  await click('#problems-reveal-1-4-2');
  const decAfter = await ev(() => [...document.querySelectorAll('article[data-problem="1.4.2"] .decisions')].map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return !e.hidden && cs.display !== 'none' && r.width > 0 && !e.closest('[hidden]'); }));
  assert(decAfter.some(Boolean), `.decisions shown after reveal: ${decAfter}`);
  const stationAfter = await ev(() => { const c = document.querySelector('article[data-problem="1.4.2"]'); const a = c.querySelector('a.station-chip'); if (!a) return 'absent'; const r = a.getBoundingClientRect(); return !a.hidden && !a.closest('[hidden]') && r.width > 0; });
  log(`station link after reveal: ${stationAfter}`);
  assert(stationAfter === true, `station link shown after reveal: ${stationAfter}`);
  log('problems A1 ok at ' + ctx.label);
}
