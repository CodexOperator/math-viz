// tests/interact/i2-home-index-deck.mjs
// Run:  node tools/smoke.mjs --route home,home-T2,problems,problems-names-all --script tests/interact/i2-home-index-deck.mjs --dark
// One script for the routes home, home-T2, problems, problems-names-all and problems-todo (it branches on ctx.route). Acceptance A1 (the deck) and A2 (the map).
// Only the stations this script navigates to without testing them (rehearse, roots) are stubbed with page.route.
// Design: docs/designs/iter-2/i2-home-index-deck.md section 7.4.

import { readText } from './_helpers.mjs';

const STUB = 'export function mount(el){ el.textContent = "stub"; return function(){}; }';

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  const wide = ctx.viewport.width >= 1000;
  const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
  const attr = (sel, a) => page.evaluate(([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null; }, [sel, a]);
  const isVisible = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.offsetParent !== null && !e.hidden; }, sel);
  const origin = () => new URL(page.url()).origin;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const waitFor = (sel) => page.waitForSelector(sel, { state: 'attached', timeout: 8000 });
  const visible = () => page.evaluate(() => window.__mv.problems.visible());
  const deckHook = () => page.evaluate(() => window.__mv.problems.deck());
  const openIds = () => page.evaluate(() => [...document.querySelectorAll('article.problem-card[data-open="true"]')].map((c) => c.dataset.problem));

  await page.route('**/js/stations/*.js', (route) => (/\/(rehearse|roots)\.js(\?|$)/.test(route.request().url())
    ? route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB })
    : route.fallback()));
  await page.reload({ waitUntil: 'load' });

  if (ctx.route === 'home' || ctx.route === 'home-T2') await homeBlock();
  else if (/^problems/.test(ctx.route)) await problemsBlock();
  else throw new Error(`this script knows the routes home, home-T2 and problems*, not ${ctx.route}`);

  // ============================================================ A1: the deck
  async function problemsBlock() {
    await waitFor('article.problem-card');
    const NAMES = {
      none: ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.5.1', '1.5.2', '2.1.2', '3.1.1', '3.2.1', 'P3', 'P7'],
      all: ['1.4.1', '1.4.2', '1.4.3'], home: ['1.3.1', '2.2.2'], continuous: ['2.4.1'],
    };

    if (ctx.route === 'problems-names-all') {
      assert(same(await visible(), NAMES.all), `#problems-names-all shows the three roots problems: ${await visible()}`);
      assert((await attr('#problems-filter-names-all', 'aria-pressed')) === 'true' && (await attr('#problems-filter-names-all-names', 'aria-pressed')) === 'false', 'the all chip is pressed');
      assert((await readText(page, '#problems-count')) === 'Showing 3 of 29: names: all.', `count text: ${await readText(page, '#problems-count')}`);
      assert((await page.evaluate(() => window.__mv.problems.filter().names)) === 'all', 'the filter hook says names: all');
      log('(a) #problems-names-all');
      await shot('problems-names-all');
      return;
    }
    if (ctx.route === 'problems-todo') {
      assert((await page.evaluate(() => window.__mv.problems.filter().todo)) === true, '#problems-todo sets the not-ticked filter');
      return;
    }

    // ---- collapsed cards, height, the chips and the Rehearse links
    assert((await count('article.problem-card')) === 29, '29 article.problem-card');
    assert((await page.evaluate(() => [...document.querySelectorAll('article.problem-card')].every((c) => c.getAttribute('data-open') === 'false'))) === true, 'every card starts collapsed (data-open false)');
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    assert(h < (wide ? 4000 : 7500), `the whole page is ${h} px, under ${wide ? 4000 : 7500}`);
    log(`page height ${h}px`);
    const missing = await page.evaluate(async () => {
      const { PROBLEMS } = await import('./js/data/problems.js');
      const bad = [];
      for (const p of PROBLEMS) {
        const k = p.id.replace(/\./g, '-');
        const a = document.getElementById(`problems-card-${k}-address`);
        const n = document.getElementById(`problems-card-${k}-names`);
        const r = document.querySelector(`a#problems-rehearse-${k}[href="#rehearse-${k}"]`);
        if (!a || !a.classList.contains('decision-chip') || a.getAttribute('data-value') !== p.address) bad.push(`${p.id} address`);
        if (!n || !n.classList.contains('decision-chip') || n.getAttribute('data-value') !== p.names) bad.push(`${p.id} names`);
        if (!r) bad.push(`${p.id} rehearse`);
        if (!document.getElementById(`problems-tick-${k}`) || !document.getElementById(`problems-open-${k}`)) bad.push(`${p.id} tick or open`);
      }
      return bad;
    });
    assert(missing.length === 0, `every card has its two chips, its Rehearse link, its tick and its open button: ${missing.slice(0, 5).join(', ')}`);
    assert((await attr('#problems-card-1-4-2-names', 'data-value')) === 'all', '1.4.2 is names: all');
    assert((await attr('#problems-card-1-4-2-address', 'data-value')) === 'P->C', '1.4.2 is address P->C');
    log('(a) 29 collapsed cards with chips, Rehearse links, ticks');

    // ---- open one at a time, several at once, collapse all
    await page.click('#problems-open-1-4-2');
    assert((await attr('#problems-card-1-4-2', 'data-open')) === 'true' && (await attr('#problems-open-1-4-2', 'aria-expanded')) === 'true', '1.4.2 opens');
    assert(await isVisible('#problems-reveal-1-4-2'), 'its Reveal button is visible');
    await page.click('#problems-open-1-4-1');
    assert(same(await openIds(), ['1.4.1']), `mode one: opening 1.4.1 collapses 1.4.2 (open: ${await openIds()})`);
    assert((await attr('#problems-open-1-4-2', 'aria-expanded')) === 'false' && (await attr('#problems-card-1-4-2', 'data-open')) === 'false', '1.4.2 is collapsed');
    assert(same(await deckHook(), { open: ['1.4.1'], mode: 'one' }), `deck hook: ${JSON.stringify(await deckHook())}`);
    await page.click('#problems-mode-all');
    assert((await attr('#problems-mode-all', 'aria-pressed')) === 'true' && (await attr('#problems-mode-one', 'aria-pressed')) === 'false', 'mode all is pressed');
    await page.click('#problems-open-1-4-2');
    assert(same(await openIds(), ['1.4.1', '1.4.2']), `mode all: both stay open (${await openIds()})`);
    assert(same(await deckHook(), { open: ['1.4.1', '1.4.2'], mode: 'all' }), `deck hook: ${JSON.stringify(await deckHook())}`);
    await page.click('#problems-collapse-all');
    assert((await openIds()).length === 0 && same(await deckHook(), { open: [], mode: 'all' }), 'Collapse all closes every card');
    await page.click('#problems-open-1-1-1');
    await page.click('#problems-open-1-1-2');
    assert(same(await openIds(), ['1.1.1', '1.1.2']), `mode all keeps two open (${await openIds()})`);
    await page.click('#problems-mode-one');
    assert(same(await openIds(), ['1.1.2']) && same(await deckHook(), { open: ['1.1.2'], mode: 'one' }), `back to one at a time keeps the last row opened (${await openIds()})`);
    await page.click('#problems-collapse-all');
    await page.click('#problems-mode-all');
    await page.click('#problems-open-all');
    assert((await openIds()).length === 29, 'Open all shown opens the 29 cards');
    await page.click('#problems-collapse-all');
    await page.click('#problems-mode-one');
    log('(b) open one, several, all, collapse all');

    // ---- the Names filter, with the chapter filter and the empty state
    for (const [code, want] of [['all', NAMES.all], ['home', NAMES.home], ['continuous', NAMES.continuous], ['none', NAMES.none]]) {
      await page.click(`#problems-filter-names-${code}`);
      const v = await visible();
      assert(same(v, want), `names ${code}: ${v.join(',')}`);
      assert((await attr(`#problems-filter-names-${code}`, 'aria-pressed')) === 'true', `names ${code} chip is pressed`);
    }
    assert((await visible()).length === 11, 'none is 11 problems');
    await page.click('#problems-filter-names-any');
    assert((await visible()).length === 12, 'any is 12 problems');
    await page.click('#problems-filter-names-all-names');
    assert((await visible()).length === 29, 'No filter is 29');
    await page.click('#problems-filter-1');
    await page.click('#problems-filter-names-any');
    assert(same(await visible(), ['1.3.2']), `chapter 1 and names any: ${await visible()}`);
    assert((await readText(page, '#problems-count')) === 'Showing 1 of 29: Chapter 1, names: any.', `count text: ${await readText(page, '#problems-count')}`);
    await page.click('#problems-filter-3');
    await page.click('#problems-filter-names-home');
    assert((await visible()).length === 0 && (await isVisible('#problems-empty')), 'chapter 3 and names home match nothing, and the empty message shows');
    await page.click('#problems-show-all');
    assert((await visible()).length === 29 && (await attr('#problems-filter-names-all-names', 'aria-pressed')) === 'true' && (await attr('#problems-filter-all', 'aria-pressed')) === 'true', 'Show all resets all three filters');
    log('(c) names filter, chapter combination, empty state');

    // ---- predict first: the chips and the place wait for the reveal
    await page.check('#problems-predict');
    await page.click('#problems-open-1-4-2');
    assert((await isVisible('#problems-card-1-4-2 .decisions')) === false, 'predict hides the chips of the open card');
    assert((await isVisible('#problems-card-1-4-2 a[href="#problem-1-4-2"]')) === false, 'predict hides the station link');
    assert((await isVisible('#problems-card-1-1-1 .decisions')) === false, 'predict hides the chips of a collapsed row too');
    assert((await isVisible('#problems-balance-panel')) === false, 'predict hides the address balance, which would give the addresses away');
    assert(await isVisible('#problems-rehearse-1-4-2'), 'the Rehearse link stays');
    await page.click('#problems-reveal-1-4-2');
    assert((await isVisible('#problems-card-1-4-2 .decisions')) && (await isVisible('#problems-card-1-4-2 a[href="#problem-1-4-2"]')), 'Reveal shows the chips and the station link');
    await page.click('#problems-collapse-all');
    assert((await isVisible('#problems-card-1-4-2 .decisions')) === false, 'collapsing re-hides the answer and the chips');
    await page.uncheck('#problems-predict');
    assert((await isVisible('#problems-card-1-4-2 .decisions')) && (await isVisible('#problems-balance-panel')), 'predict off shows them again');
    log('(d) predict first');

    // ---- keyboard: arrows between rows, Enter opens, Escape closes
    await page.focus('#problems-open-1-1-1');
    await page.keyboard.press('ArrowDown');
    assert((await page.evaluate(() => document.activeElement.id)) === 'problems-open-1-1-2', 'ArrowDown moves to the next row');
    await page.keyboard.press('End');
    assert((await page.evaluate(() => document.activeElement.id)) === 'problems-open-P7', 'End goes to the last row');
    await page.keyboard.press('Home');
    assert((await page.evaluate(() => document.activeElement.id)) === 'problems-open-1-1-1', 'Home goes to the first row');
    await page.keyboard.press('Enter');
    assert((await attr('#problems-card-1-1-1', 'data-open')) === 'true', 'Enter opens the row');
    await page.keyboard.press('Escape');
    assert((await attr('#problems-card-1-1-1', 'data-open')) === 'false' && (await page.evaluate(() => document.activeElement.id)) === 'problems-open-1-1-1', 'Escape closes it and keeps focus on its button');
    await page.click('#problems-card-1-2-2 .pc-statement');
    assert((await attr('#problems-card-1-2-2', 'data-open')) === 'true', 'a click on the statement opens a collapsed row');
    await page.click('#problems-collapse-all');
    log('(e) keyboard and pointer');

    // ---- the Rehearse link, ticks on the row, topics as rows
    await page.click('#problems-rehearse-1-4-2');
    await page.waitForFunction(() => location.hash === '#rehearse-1-4-2');
    await page.goBack();
    await waitFor('article.problem-card');
    await page.check('#problems-tick-1-1-1');
    assert((await readText(page, '#problems-progress')) === '1 of 29 ticked' && (await attr('#problems-card-1-1-1', 'data-done')) === 'true', 'a tick on the one-line row counts');
    await page.uncheck('#problems-tick-1-1-1');
    assert((await count('article.topic-card')) === 12 && (await page.evaluate(() => [...document.querySelectorAll('article.topic-card')].every((c) => c.dataset.open === 'false'))), '12 collapsed topic rows');
    assert((await isVisible('#problems-topic-T1-4 a[href="#powers"]')) === false, 'a collapsed topic hides its links');
    await page.click('#problems-topic-open-T1-4');
    assert(await isVisible('#problems-topic-T1-4 a[href="#powers"]') && (await attr('#problems-topic-open-T1-4', 'aria-expanded')) === 'true', 'opening a topic shows where to learn it');
    log('(f) Rehearse link, tick, topics');

    // ---- the deck survives a round trip to a station
    await page.click('#problems-open-1-4-2');
    await page.click('#problems-card-1-4-2 a[href="#problem-1-4-2"]');
    await page.waitForFunction(() => location.hash === '#problem-1-4-2');
    await page.goBack();
    await waitFor('article.problem-card');
    assert(same(await openIds(), ['1.4.2']), `Back from the station restores the open card (${await openIds()})`);
    log('(g) the deck after a station round trip');

    // ---- rehearsed links come from the store
    await page.evaluate(() => localStorage.setItem('mv:rehearse.scores', JSON.stringify({ '1.4.2': { tried: 1, right: 1, last: 1 } })));
    await page.reload({ waitUntil: 'load' });
    await waitFor('article.problem-card');
    assert((await attr('#problems-rehearse-1-4-2', 'data-rehearsed')) === 'true' && (await readText(page, '#problems-rehearse-1-4-2')) === 'Rehearse again', 'a rehearsed problem says Rehearse again');
    assert((await readText(page, '#problems-rehearse-1-4-1')) === 'Rehearse', 'the others say Rehearse');
    await page.evaluate(() => localStorage.removeItem('mv:rehearse.scores'));

    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `no horizontal overflow (${over}px)`);
    await shot('problems-deck');
    await page.click('#problems-mode-all');
    await page.click('#problems-open-1-4-2');
    await page.click('#problems-reveal-1-4-2');
    await page.click('#problems-open-1-3-1');
    assert((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'no horizontal overflow with two cards open');
    await shot('problems-deck-open');
    log('i2-home-index-deck: problems steps passed');
  }

  // ============================================================ A2: the map
  async function homeBlock() {
    await waitFor('#home-map a.map-station');
    const ids = await page.evaluate(async () => (await import('./js/registry.js')).STATIONS.map((s) => s.id));
    assert(ids.length === 22, `the registry lists 22 stations, got ${ids.length}`);
    const dataIds = await page.evaluate(() => [...document.querySelectorAll('#home-map a.map-station')].map((a) => a.getAttribute('data-station')));
    assert(same(dataIds, ids), `22 a.map-station in registry order: ${dataIds.join(',')}`);
    assert(dataIds.indexOf('graph4d') + 1 === dataIds.indexOf('rehearse') && dataIds.indexOf('rehearse') + 1 === dataIds.indexOf('problems'), 'rehearse sits between graph4d and problems');
    assert(await page.evaluate(() => { const r = document.querySelector('a.map-station[data-station="rehearse"]'); const p = document.querySelector('a.map-station[data-station="problems"]'); return !!(r.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'rehearse comes before problems in the document');
    for (const [t, n] of [['T1', 16], ['T2', 12], ['T3', 14]]) assert((await count(`#home-map circle.stop[data-thread="${t}"]`)) === n, `${t} has ${n} stops`);
    assert((await count('#home-map circle.pdot')) === 29, '29 problem dots');

    if (ctx.route === 'home-T2') {
      assert((await count('#home-map a.map-station.is-dim')) === 10, 'T2 dims 10 places');
      assert((await attr('#home-thread-T2', 'aria-pressed')) === 'true', 'the T2 legend button is pressed');
      return;
    }

    // ---- the two decisions
    assert((await count('#home-decisions #home-decision-address')) === 1 && (await count('#home-decisions #home-decision-names')) === 1, '#home-decisions holds the address and names blocks');
    const addrText = await readText(page, '#home-decision-address');
    const namesText = await readText(page, '#home-decision-names');
    assert(addrText.includes('Cartesian') && addrText.includes('polar'), `the address block says Cartesian and polar: ${addrText.slice(0, 80)}`);
    for (const w of ['any', 'all', 'home', 'continuous']) assert(namesText.includes(w), `the names block says ${w}`);
    assert((await count('#home-decision-address-list li')) === 6, 'six address choices');
    for (const code of ['none', 'any', 'all', 'home', 'continuous']) assert((await attr(`#home-decision-names-link-${code}`, 'href')) === `#problems-names-${code}`, `the ${code} choice links to the index filter`);
    assert((await readText(page, '#home-decision-names-link-all')).includes('3 problems') && (await readText(page, '#home-decision-names-link-continuous')).includes('1 problem'), 'the counts are 3 and 1');
    assert(await page.evaluate(() => { const a = document.getElementById('home-decisions').getBoundingClientRect().top; const b = document.getElementById('home-spine').getBoundingClientRect().top; const c = document.getElementById('home-map-panel').getBoundingClientRect().top; return a > b && a < c; }), 'the decisions block sits under the spine and above the map');
    assert((await readText(page, '#home-spine-line')).includes('A turn has many names.'), 'the spine carries the four lines');
    assert((await count('#home-spine-list li')) === 4, 'four spine items');
    await page.click('#home-decision-names-link-all');
    await page.waitForFunction(() => location.hash === '#problems-names-all');
    await waitFor('article.problem-card');
    assert(same(await visible(), ['1.4.1', '1.4.2', '1.4.3']), 'the link lands on the three roots problems');
    await page.goBack();
    await waitFor('#home-map a.map-station');
    log('(a) 22 stops, the decisions block, its links');

    // ---- rehearsed dots come from the store
    await page.evaluate(() => localStorage.setItem('mv:rehearse.scores', JSON.stringify({ '1.4.2': { tried: 1, right: 1, last: 1 } })));
    await page.reload({ waitUntil: 'load' });
    await waitFor('#home-map a.map-station');
    assert((await count('circle.pdot[data-problem="1.4.2"].is-rehearsed')) === 1 && (await count('circle.pdot.is-rehearsed')) === 1, 'only the dot of 1.4.2 is rehearsed');
    assert(same(await page.evaluate(() => window.__mv.home.rehearsed()), ['1.4.2']), 'the hook lists 1.4.2');
    assert((await readText(page, '#home-progress')).includes('Rehearsed 1 of 29'), `progress line: ${await readText(page, '#home-progress')}`);
    assert((await attr('a.map-station[data-station="roots"]', 'aria-label')).includes('1 rehearsed'), 'the roots place says 1 rehearsed');
    const ring = await page.evaluate(() => [getComputedStyle(document.querySelector('circle.pdot[data-problem="1.4.2"]')).strokeWidth, getComputedStyle(document.querySelector('circle.pdot[data-problem="1.4.1"]')).strokeWidth]);
    assert(parseFloat(ring[0]) > parseFloat(ring[1]), `a rehearsed dot has a heavier ring: ${ring.join(' | ')}`);
    await page.evaluate(() => localStorage.removeItem('mv:rehearse.scores'));
    await page.reload({ waitUntil: 'load' });
    await waitFor('#home-map a.map-station');
    assert((await count('circle.pdot.is-rehearsed')) === 0, 'with no scores stored no dot is rehearsed');
    log('(b) rehearsed dots');

    // ---- the layout: three rows of 8, 8 and 6 at desktop; no label touches another
    const layout = await page.evaluate(() => window.__mv.home.layout());
    if (wide) {
      assert(layout === 'wide', `1280 px gives the wide map, got ${layout}`);
      const ys = await page.evaluate(() => [...document.querySelectorAll('#home-map rect.node-pill')].map((r) => r.getAttribute('y')));
      const rows = [...new Set(ys)];
      assert(rows.length === 3, `three rows (${rows.join(',')})`);
      assert(same(rows.map((y) => ys.filter((v) => v === y).length), [8, 8, 6]), 'rows of 8, 8 and 6');
      const hits = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll('#home-map .map-label, #home-map .map-num, #home-map .map-part')].map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 24), x0: r.left, x1: r.right, y0: r.top, y1: r.bottom }; });
        const svg = document.getElementById('home-map').getBoundingClientRect();
        const bad = [];
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i];
          if (a.x0 < svg.left - 1 || a.x1 > svg.right + 1) bad.push(`outside: ${a.t}`);
          for (let j = i + 1; j < boxes.length; j++) { const b = boxes[j]; if (a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1) bad.push(`${a.t} / ${b.t}`); }
        }
        return { n: boxes.length, bad };
      });
      assert(hits.n >= 22 * 2 + 5 && hits.bad.length === 0, `no label, number or caption touches another (${hits.n} boxes): ${hits.bad.slice(0, 4).join(' | ')}`);
    } else {
      assert(layout === 'narrow', `a phone gets the narrow map, got ${layout}`);
      assert((await count('#home-map a.map-station')) === 22, 'the narrow map has 22 places');
    }
    log(`(c) layout ${layout}`);

    // ---- the thread focus on the 22-place map
    await page.goto(`${origin()}/index.html#home-T2`);
    await waitFor('#home-map[data-focus="T2"]');
    assert((await count('#home-map a.map-station.is-dim')) === 10, '#home-T2 dims 10 of the 22 places');
    await page.goto(`${origin()}/index.html#home`);
    await waitFor('#home-map a.map-station');

    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `no horizontal overflow (${over}px)`);
    await shot('home-map');
    log('i2-home-index-deck: home steps passed');
  }
}
