// tests/interact/i1-station-home-problems.mjs
// Run:  node tools/smoke.mjs --route home,problems --script tests/interact/i1-station-home-problems.mjs --dark
// One script for both routes (it branches on ctx.route). Every other station module is stubbed with page.route, so the
// navigation checks never depend on a station that another goal has not built yet.
// Design: docs/designs/iter-1/i1-station-home-problems.md, section 7 (acceptance A2, A3, A4).

import { dragHandle, handleZ, readHandleLabel, readText, settle } from './_helpers.mjs';

const STUB = 'export function mount(el){ el.textContent = "stub"; return function(){}; }';

async function installStubs(page) {
  await page.route('**/js/stations/*.js', (route) => (/\/(home|problems)\.js(\?|$)/.test(route.request().url())
    ? route.fallback()
    : route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB })));
}

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
  const attr = (sel, a) => page.evaluate(([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null; }, [sel, a]);
  const hash = () => page.evaluate(() => location.hash);
  const origin = () => new URL(page.url()).origin;
  const isVisible = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.offsetParent !== null && !e.hidden; }, sel);
  const visibleCards = () => page.evaluate(() => [...document.querySelectorAll('.problem-card')].filter((c) => c.offsetParent !== null).map((c) => c.dataset.problem));
  const ls = (key) => page.evaluate((k) => localStorage.getItem(k), key);
  const waitFor = (sel) => page.waitForSelector(sel, { timeout: 8000 });

  await installStubs(page);
  await page.reload({ waitUntil: 'load' });

  if (ctx.route === 'home') await homeBlock();
  else if (ctx.route === 'problems') await problemsBlock();
  else throw new Error(`this script knows the routes home and problems, not ${ctx.route}`);

  // ============================================================ home
  async function homeBlock() {
    await waitFor('#home-map a.map-station');
    // ---- A2: the map
    const ids = await page.evaluate(async () => (await import('./js/registry.js')).STATIONS.map((s) => s.id));
    assert(ids.length === 21, `the registry lists 21 stations, got ${ids.length}`);
    assert((await count('#home-map a.map-station')) === 21, 'the map has 21 a.map-station');
    const dataIds = await page.evaluate(() => [...document.querySelectorAll('#home-map a.map-station')].map((a) => a.getAttribute('data-station')));
    assert(JSON.stringify(dataIds) === JSON.stringify(ids), `map stations are the registry ids in order: ${dataIds.join(',')}`);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('#home-map a.map-station')].every((a) => a.getAttribute('href') === '#' + a.getAttribute('data-station')));
    assert(hrefs, 'every station anchor links to its own route');
    assert((await count('#home-map path.thread-line')) === 3, 'exactly three path.thread-line');
    assert((await count('path.thread-line')) === 3, 'three path.thread-line on the whole page');
    const lines = await page.evaluate(() => [...document.querySelectorAll('#home-map path.thread-line')].map((p) => ({
      thread: p.getAttribute('data-thread'), dash: p.getAttribute('stroke-dasharray'), css: getComputedStyle(p).strokeDasharray, d: p.getAttribute('d'), stroke: getComputedStyle(p).stroke })));
    assert(lines.map((l) => l.thread).join() === 'T1,T2,T3', 'thread lines are T1, T2, T3');
    assert(lines[1].dash && lines[1].dash !== 'none' && lines[1].css !== 'none', `the T2 path is dashed (${lines[1].dash} / ${lines[1].css})`);
    assert(lines[0].dash === null && lines[2].dash === null, 'T1 and T3 are solid');
    assert(lines.every((l) => /^M/.test(l.d)), 'every strand has path data');
    assert(new Set(lines.map((l) => l.stroke)).size === 3, `the three strands have three colours: ${lines.map((l) => l.stroke).join(' | ')}`);
    for (const [t, n] of [['T1', 15], ['T2', 11], ['T3', 13]]) {
      assert((await count(`#home-map circle.stop[data-thread="${t}"]`)) === n, `${t} has ${n} stops`);
    }
    assert((await count('#home-map circle.pdot')) === 29, '29 problem dots');
    const host = await page.evaluate(() => document.getElementById('home-map-host').clientWidth);
    const layout = await page.evaluate(() => window.__mv.home.layout());
    const wideMin = await page.evaluate(async () => (await import('./js/stations/home.js')).WIDE_MIN);
    assert(wideMin === 712, `WIDE_MIN is 712, got ${wideMin}`);
    assert(layout === (host >= wideMin ? 'wide' : 'narrow'), `layout ${layout} at host width ${host}`);
    log(`map: ${layout}, host ${host}px`);

    // ---- A2: the finder
    await page.fill('#home-finder', '1.4.2');
    assert((await count('#home-finder-results a[href="#problem-1-4-2"]')) === 1, 'exactly one result link to #problem-1-4-2');
    const linkText = await readText(page, '#home-finder-results a[href="#problem-1-4-2"]');
    assert(linkText.includes('roots'), `the link text includes roots: ${linkText}`);
    assert((await readText(page, '#home-finder-status')) === '1 match', 'status says 1 match');
    const found = await page.evaluate(() => window.__mv.home.search('1.4.2'));
    assert(JSON.stringify(found) === JSON.stringify(['1.4.2']), `search hook: ${JSON.stringify(found)}`);
    await page.click('#home-finder-results a[href="#problem-1-4-2"]');
    await page.waitForFunction(() => location.hash === '#problem-1-4-2');
    assert((await hash()) === '#problem-1-4-2', 'the finder link goes to #problem-1-4-2');
    await page.waitForFunction(() => document.getElementById('view').dataset.station === 'roots', null, { timeout: 8000 });
    assert((await page.evaluate(() => document.getElementById('view').dataset.station)) === 'roots', 'the route mounts the owning station (roots)');
    await page.goBack();
    await waitFor('#home-map a.map-station');
    assert((await count('#home-map a.map-station')) === 21, 'a fresh mount after Back');

    await page.fill('#home-finder', 'p3');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#problem-P3');
    assert((await hash()) === '#problem-P3', 'Enter follows the first result');
    await page.goBack();
    await waitFor('#home-finder');
    await page.fill('#home-finder', 'zzzz');
    assert((await count('#home-finder-results a')) === 0, 'no result links for zzzz');
    assert((await readText(page, '#home-finder-results .finder-empty')).includes('Nothing matches'), 'the no-match sentence');
    // a long junk query (a pasted URL) neither widens the page nor is echoed whole
    const junk = 'x'.repeat(300);
    await page.fill('#home-finder', junk);
    const empty = await page.evaluate(() => { const e = document.querySelector('#home-finder-results .finder-empty'); const r = e.getBoundingClientRect();
      return { text: e.textContent, right: r.right, vw: document.documentElement.clientWidth, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    assert(empty.over <= 1 && empty.right <= empty.vw + 1, `a 300-character query does not widen the page (${empty.over}px over, right edge ${empty.right} of ${empty.vw})`);
    assert(empty.text.includes('x'.repeat(40) + '…') && !empty.text.includes('x'.repeat(41)), `the sentence echoes the first 40 characters: ${empty.text.slice(0, 80)}`);
    // '142' is 1.4.2, and a word that only the routes use finds the problems that say it
    await page.fill('#home-finder', '142');
    assert((await count('#home-finder-results a[href="#problem-1-4-2"]')) === 1 && (await readText(page, '#home-finder-status')) === '1 match', "'142' finds problem 1.4.2");
    await page.fill('#home-finder', 'conjugate');
    const conj = await page.evaluate(() => [...document.querySelectorAll('#home-finder-results li')].map((li) => li.dataset.id));
    assert(conj.includes('1.1.2') && conj.includes('P1') && conj.includes('T1.1'), `'conjugate' finds 1.1.2, P1 and the topic: ${conj.join(',')}`);
    await page.fill('#home-finder', 'zzzz');
    await page.focus('#home-finder');
    await page.keyboard.press('Escape');
    assert((await page.inputValue('#home-finder')) === '', 'Escape clears the field');
    assert(await isVisible('#home-finder-hint'), 'the hint is back');
    await page.fill('#home-finder', 'roots');
    assert((await readText(page, '#home-finder-status')) === '8 matches', 'roots has 8 matches');
    await page.keyboard.press('ArrowDown');
    assert((await page.evaluate(() => document.activeElement.closest('li.finder-result') !== null)) === true, 'ArrowDown moves into the results');
    await page.keyboard.press('ArrowUp');
    assert((await page.evaluate(() => document.activeElement.id)) === 'home-finder', 'ArrowUp on the first result returns to the field');
    await page.fill('#home-finder', '');

    // ---- the legend
    await page.click('#home-thread-T2');
    assert((await attr('#home-map', 'data-focus')) === 'T2', 'the map is focused on T2');
    assert((await attr('#home-thread-T2', 'aria-pressed')) === 'true', 'the T2 button is pressed');
    assert((await count('#home-map a.map-station.is-dim')) === 10, 'T2 dims the 10 stations that are not on it');
    assert((await count('#home-map path.thread-line.is-dim')) === 2, 'T2 dims 2 strands');
    await page.click('#home-thread-T2');
    assert((await attr('#home-map', 'data-focus')) === null, 'a second press clears the focus');
    assert((await count('#home-map .is-dim')) === 0, 'nothing is dimmed');

    // ---- a station click
    await page.click('a.map-station[data-station="roots"]');
    await page.waitForFunction(() => location.hash === '#roots');
    assert((await hash()) === '#roots', 'a station on the map goes to its route');
    await page.goBack();
    await waitFor('#home-map a.map-station');

    // ---- progress dots come from the store
    await page.evaluate(() => localStorage.setItem('mv:progress', JSON.stringify({ '1.1.1': true, P3: true, 'T1.4': true, bogus: true })));
    await page.reload({ waitUntil: 'load' });
    await waitFor('#home-map a.map-station');
    assert((await count('#home-map circle.pdot.is-done')) === 2, 'two ticked problems fill two dots');
    assert((await readText(page, '#home-progress')).includes('2 of 29'), `progress line: ${await readText(page, '#home-progress')}`);
    await page.evaluate(() => localStorage.removeItem('mv:progress'));
    await page.reload({ waitUntil: 'load' });                      // the page's store keeps its own copy until it is reloaded
    await waitFor('#home-map a.map-station');
    assert((await count('#home-map circle.pdot.is-done')) === 0, 'with no ticks stored, no dot is filled');

    // ---- relayout (desktop width only)
    if (ctx.viewport.width >= 1000) {
      await page.setViewportSize({ width: 700, height: 860 });
      await settle(page, 4);
      assert((await page.evaluate(() => window.__mv.home.layout())) === 'narrow', 'a 700 px window gives the narrow map');
      assert((await count('#home-map a.map-station')) === 21 && (await count('#home-map path.thread-line')) === 3, 'the narrow map still has 21 places and 3 strands');
      await shot('home-narrow');
      await page.setViewportSize({ width: ctx.viewport.width, height: ctx.viewport.height });
      await settle(page, 4);
      assert((await page.evaluate(() => window.__mv.home.layout())) === 'wide', 'back to the wide map');
    }

    // ---- preset tokens
    await page.goto(`${origin()}/index.html#home-T2`);
    await waitFor('#home-map[data-focus="T2"]');
    assert((await attr('#home-thread-T2', 'aria-pressed')) === 'true', '#home-T2 lights thread T2');
    await page.goto(`${origin()}/index.html#home`);
    await waitFor('#home-map a.map-station');
    assert((await attr('#home-map', 'data-focus')) === null, '#home shows all three threads');

    // ---- A3: the demo
    await homeDemo();

    // ---- layout sanity: nothing wider than the page
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `no horizontal overflow (${overflow}px)`);
    await shot('home-final');
  }

  async function homeDemo() {
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    // ---- the story thread is on the page: both addresses, arg as a set, Arg highlighted
    const cap = await page.evaluate(() => { const c = document.getElementById('home-demo-caption'); const cs = (n) => n && getComputedStyle(n).color;
      return { text: c.textContent, cart: cs(c.querySelector('.tone-cart')), polar: cs(c.querySelector('.tone-polar')), cartTok: getComputedStyle(document.documentElement).getPropertyValue('--cart').trim() }; });
    assert(/Cartesian address/.test(cap.text) && /polar address/.test(cap.text) && /set arg z/.test(cap.text) && /solid arc is Arg z/.test(cap.text), `the caption names both addresses, the set arg z and Arg z: ${cap.text}`);
    assert(!/\b(Blue|Orange|grey)\b/i.test(cap.text), `the caption does not name colours in words: ${cap.text}`);
    assert(cap.cart && cap.polar && cap.cart !== cap.polar, 'the two address names are tinted differently, by the tokens');
    const line = await readText(page, '#home-demo-problem');
    assert(line.startsWith('The starting dot is problem 1.3.1: -1 + 1.732i. Its polar address is r = 2, Arg z = 2π/3.'), `the problem line: ${line}`);
    const ids = await page.evaluate(() => ['home-demo-plane', 'home-demo-ex', 'home-demo-stairs'].map((i) => document.querySelectorAll('#' + i).length));
    assert(ids.join() === '1,1,1', `the three demo hosts carry their widget ids once: ${ids}`);
    assert((await page.evaluate(() => { const all = [...document.querySelectorAll('[id]')].map((e) => e.id); return all.length - new Set(all).size; })) === 0, 'no duplicate ids on the home page');
    const lbl = await page.evaluate(() => document.getElementById('home-demo-plane-viewport').getAttribute('aria-label'));
    assert(!lbl.includes('..') && lbl.startsWith('Demo plane for the point z. Drag the dot or use the arrow keys.'), `the plane's name has no double full stop: ${lbl}`);
    const conv = await attr('#home-demo-ex-convert-cart', 'data-tex');
    assert(conv.includes('\\Arg z') && !conv.includes('\\theta'), `the Cartesian conversion cell names Arg z, not a bare theta: ${conv}`);
    let z = await dragHandle(page, 'home-demo-plane-z', { re: 2, im: 1 });
    assert(near(z.re, 2) && near(z.im, 1), `the drag snaps to (2, 1): ${JSON.stringify(z)}`);
    const t = await readText(page, '#home-readout');
    for (const want of ['2.236', '0.464', 'r = 2.236', '2 + i']) assert(t.includes(want), `readout has ${want}: ${t}`);
    assert(!t.includes('NaN'), 'no NaN in the readout');
    assert(t.split('\n')[1].includes('arg z = {'), 'the second line writes the set arg z');
    const cartTex = await attr('#home-demo-ex-address-cart', 'data-tex');
    const polarTex = await attr('#home-demo-ex-address-polar', 'data-tex');
    assert(cartTex && cartTex.includes('2') && cartTex.includes('1'), `explainer cartesian address: ${cartTex}`);
    assert(polarTex && polarTex.includes('2.236') && polarTex.includes('0.464'), `explainer polar address: ${polarTex}`);
    assert((await attr('#home-demo-ex-same', 'data-agree')) === 'true', 'the two addresses agree');
    assert((await readText(page, '#home-demo-stairs-arg')) === 'Arg z = 0.464', `staircase Arg line: ${await readText(page, '#home-demo-stairs-arg')}`);
    assert((await readText(page, '#home-demo-stairs-set')).includes('arg z'), 'the staircase writes the set arg z');
    assert(await page.evaluate(() => document.getElementById('home-demo-stairs-k0').classList.contains('is-home')), 'row k = 0 is the home step');
    assert((await count('#home-demo-stairs-list li')) === 3, 'three staircase rows');
    const label = await readHandleLabel(page, 'home-demo-plane-z');
    assert(label.includes('r = 2.236'), `the handle announces both addresses: ${label}`);

    await page.click('#home-demo-preset-neg2');
    await settle(page);
    assert((await readText(page, '#home-readout')).includes('Arg z = 3.142 (π)'), 'preset -2: Arg z = π, not -π');
    assert((await attr('#home-demo-preset-neg2', 'aria-pressed')) === 'true', 'the preset is pressed while z equals it');
    await page.click('#home-demo-preset-m1-sqrt3i');
    await settle(page);
    const r2 = await readText(page, '#home-readout');
    assert(r2.includes('2.094 (2π/3)') && r2.includes('-1 + 1.732i'), `preset -1 + i sqrt3: ${r2}`);
    assert((await readText(page, '#home-demo-stairs-k1')).includes('8π/3'), `the step above is 8pi/3: ${await readText(page, '#home-demo-stairs-k1')}`);

    await page.focus('#home-demo-plane-z');
    await page.keyboard.press('ArrowRight');
    await settle(page);
    z = await handleZ(page, 'home-demo-plane-z');
    assert(near(z.re, -0.9) && near(z.im, 1.75), `ArrowRight then the 0.05 snap: ${JSON.stringify(z)}`);
    assert((await readText(page, '#home-readout')).split('\n')[0] === 'z = -0.9 + 1.75i; r = 1.968; Arg z = 2.046', `readout after ArrowRight: ${await readText(page, '#home-readout')}`);
    await page.keyboard.press('ArrowUp');
    await settle(page);
    z = await handleZ(page, 'home-demo-plane-z');
    assert(near(z.re, -0.9) && near(z.im, 1.85), `ArrowUp: ${JSON.stringify(z)}`);
    assert((await readText(page, '#home-readout')).split('\n')[0] === 'z = -0.9 + 1.85i; r = 2.057; Arg z = 2.024', 'readout after ArrowUp');

    await dragHandle(page, 'home-demo-plane-z', { re: 0, im: 0 });
    const t0 = await readText(page, '#home-readout');
    assert(t0.includes('no angle at 0') && !t0.includes('NaN'), `the origin: ${t0}`);
    assert((await readText(page, '#home-demo-stairs-arg')) === 'Arg z: no angle at 0', 'the staircase at 0');
    assert((await count('#home-demo-ex-same')) === 1, 'the same-point row survives z = 0');
    await page.click('#home-demo-preset-m1-sqrt3i');
    await settle(page);
    assert((await readText(page, '#home-readout')).includes('2.094 (2π/3)'), 'the first preset restores the start');
    assert((await page.evaluate(() => { const d = window.__mv.home.demo(); return Math.abs(d.re + 1) < 1e-9 && Math.abs(d.im - Math.sqrt(3)) < 1e-9; })) === true, 'the demo hook follows the dot');
  }

  // ============================================================ problems
  async function problemsBlock() {
    await waitFor('.problem-card');
    const phone = ctx.viewport.width < 600;
    // ---- counts and order
    assert((await count('.problem-card')) === 29, '29 .problem-card');
    assert((await count('.topic-card')) === 12, '12 .topic-card');
    const shape = await page.evaluate(() => [...document.querySelectorAll('.problem-card')].map((c) => ({
      id: c.dataset.problem, boxes: c.querySelectorAll('input[type=checkbox]').length,
      links: c.querySelectorAll(`a[href="#problem-${c.dataset.problem.replace(/\./g, '-')}"]`).length })));
    assert(shape.every((s) => s.boxes === 1 && s.links === 1), 'each card has one checkbox and exactly one link to its problem route');
    assert(shape[0].id === '1.1.1' && shape[28].id === 'P7', 'handout order, 1.1.1 first and P7 last');
    assert((await page.evaluate(() => window.__mv.problems.visible().length)) === 29, 'the hook lists 29 visible cards');

    // ---- the hidden answer
    assert((await isVisible('#problems-answer-1-4-2')) === false, 'the answer starts hidden');
    assert((await attr('#problems-reveal-1-4-2', 'aria-expanded')) === 'false', 'aria-expanded starts false');
    await page.click('#problems-reveal-1-4-2');
    assert(await isVisible('#problems-answer-1-4-2'), 'the answer is visible after the click');
    assert((await attr('#problems-reveal-1-4-2', 'aria-expanded')) === 'true', 'aria-expanded is true');
    assert((await readText(page, '#problems-reveal-1-4-2')) === 'Hide the answer', 'the button now says Hide the answer');
    const ans = await readText(page, '#problems-answer-1-4-2');
    assert(ans.includes('2') && (ans.includes('π') || ans.includes('pi')) && (ans.includes('√2') || ans.includes('sqrt')), `the answer text: ${ans.slice(0, 120)}`);
    assert((await count('#problems-answer-1-4-2 .pc-route[data-route="cart"]')) === 1 && (await count('#problems-answer-1-4-2 .pc-route[data-route="polar"]')) === 1, 'both routes are shown');
    assert((await count('#problems-answer-1-4-2 .badge')) === 0, '1.4.2 uses both addresses, so no route is marked easy');
    await page.click('#problems-reveal-1-4-3');
    assert((await count('#problems-answer-1-4-3 .badge')) === 1 && (await count('#problems-answer-1-4-3 .pc-route[data-route="cart"] .badge')) === 1, '1.4.3: the Cartesian route is marked easy here');
    await page.click('#problems-reveal-2-2-1');
    assert((await count('#problems-answer-2-2-1 .badge')) === 1 && (await count('#problems-answer-2-2-1 .pc-route[data-route="polar"] .badge')) === 1, '2.2.1: the polar route is marked easy here');
    assert((await readText(page, '#problems-card-1-4-2 a[href="#problem-1-4-2"]')).includes('roots'), 'the card link text includes roots');
    assert((await count('#problems-card-1-4-2 .pc-also')) === 0, '1.4.2 has no Also at');
    assert((await count('#problems-card-1-3-1 .pc-also a[href="#staircase"]')) === 1, '1.3.1 is also at the staircase');

    // ---- the plain-text version is marked as a control: a chevron, the word "wraps", and it opens
    const plain = await page.evaluate(() => { const sm = document.querySelector('#problems-answer-1-4-2 .pc-plain summary'); const b = getComputedStyle(sm, '::before');
      const d = sm.parentElement; const before = { content: b.content, w: parseFloat(b.width), shown: d.open, transform: b.transform };
      sm.click(); return { before, after: { shown: d.open, transform: getComputedStyle(sm, '::before').transform }, text: sm.textContent }; });
    assert(plain.before.content !== 'none' && plain.before.w > 4, `the plain-text summary draws a chevron: ${JSON.stringify(plain.before)}`);
    assert(plain.text === 'Plain text version (wraps to fit)', `the summary says it wraps: ${plain.text}`);
    assert(plain.after.shown && plain.after.transform !== plain.before.transform, 'opening it turns the chevron');
    await page.evaluate(() => { document.querySelector('#problems-answer-1-4-2 .pc-plain summary').click(); });
    // the closing full stop stays with the last maths part of a statement on every line it wraps to
    const dots = await page.evaluate(() => ['1.1.1', '1.1.2', '1.2.1', '1.3.2', '1.4.2', '1.4.3', '1.5.1'].map((id) => {
      const st = document.querySelector(`#problems-card-${id.replace(/\./g, '-')} .pc-statement`);
      const runs = [...st.children].filter((c) => c.style.whiteSpace === 'nowrap');
      const last = st.lastElementChild;
      const lone = runs.filter((r) => { const k = r.querySelector('.pc-math').getBoundingClientRect(); const t = document.createRange(); t.setStart(r.lastChild, 0); t.setEnd(r.lastChild, r.lastChild.length);
        const q = t.getBoundingClientRect(); return q.top > k.bottom - 4; });
      return { id, runs: runs.length, lone: lone.length, endsInRun: last && last.style.whiteSpace === 'nowrap' && /^[.?]$/.test(last.lastChild.textContent) };
    }));
    assert(dots.every((d) => d.runs >= 1 && d.lone === 0), `no closing punctuation on a line of its own: ${JSON.stringify(dots)}`);
    assert(dots.find((d) => d.id === '1.1.2').endsInRun && dots.find((d) => d.id === '1.4.3').endsInRun, '1.1.2 and 1.4.3 end with the maths and its full stop in one run');

    // ---- no page overflow with the widest answers open
    await page.click('#problems-reveal-1-5-2');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `no horizontal overflow with answers open (${overflow}px)`);
    if (phone) assert(await isVisible('#problems-answer-1-4-2 .pc-scroll-hint'), 'a phone shows the scroll hint under the wide 1.4.2 answer');
    await page.click('#problems-reveal-1-4-2');
    assert((await isVisible('#problems-answer-1-4-2')) === false, 'the second press hides the answer');

    // ---- hide all
    assert((await page.evaluate(() => !document.getElementById('problems-hide-all').disabled)) === true, 'Hide all answers is enabled with answers open');
    await page.click('#problems-hide-all');
    assert((await page.evaluate(() => document.getElementById('problems-hide-all').disabled)) === true, 'and disabled once none is open');
    assert((await page.evaluate(() => [...document.querySelectorAll('.answer')].every((a) => a.hidden))) === true, 'every answer is hidden');

    // ---- filters
    await page.click('#problems-filter-3');
    const ch3 = await visibleCards();
    assert(JSON.stringify(ch3) === JSON.stringify(['3.1.1', '3.1.2', '3.2.1']), `Chapter 3: ${ch3.join(',')}`);
    assert((await isVisible('#problems-group-3')) && !(await isVisible('#problems-group-1')), 'only the Chapter 3 group is visible');
    assert((await readText(page, '#problems-count')) === 'Showing 3 of 29: Chapter 3.', `count text: ${await readText(page, '#problems-count')}`);
    assert((await attr('#problems-filter-3', 'aria-pressed')) === 'true' && (await attr('#problems-filter-all', 'aria-pressed')) === 'false', 'pressed states');
    for (const [key, n] of [['P', 7], ['1', 11], ['2', 8], ['all', 29]]) {
      await page.click(`#problems-filter-${key}`);
      assert((await visibleCards()).length === n, `filter ${key} shows ${n}`);
    }

    // ---- ticks persist
    await page.click('#problems-filter-all');
    await page.check('#problems-tick-1-1-1');
    assert(await page.isChecked('#problems-tick-1-1-1'), '1.1.1 is ticked');
    assert((await readText(page, '#problems-progress')) === '1 of 29 ticked', 'progress text');
    assert(JSON.stringify(JSON.parse(await ls('mv:progress'))) === JSON.stringify({ '1.1.1': true }), 'the tick is in localStorage');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(800);
    assert(await page.isChecked('#problems-tick-1-1-1'), 'the tick survives a reload');
    assert((await readText(page, '#problems-progress')) === '1 of 29 ticked', 'progress survives a reload');

    // ---- not ticked yet
    await page.click('#problems-filter-todo');
    assert((await visibleCards()).length === 28 && !(await visibleCards()).includes('1.1.1'), 'Not ticked yet hides the ticked card');
    assert((await readText(page, '#problems-filter-todo')) === 'Not ticked yet (28)', 'chip label says 28');
    await page.click('#problems-filter-todo');
    assert((await visibleCards()).length === 29, 'toggling it off shows all 29');
    await page.click('#problems-filter-todo');
    await page.check('#problems-tick-1-1-2');
    assert(await isVisible('#problems-card-1-1-2'), 'ticking under the filter does not hide the card at once');
    assert((await readText(page, '#problems-filter-todo')) === 'Not ticked yet (27)', 'the chip label follows the tick');
    await page.click('#problems-filter-todo');

    // ---- predict first
    await page.check('#problems-predict');
    assert((await isVisible('#problems-card-1-4-2 .pc-hint')) === false && (await isVisible('#problems-card-1-4-2 .pc-predict-note')), 'predict hides the hint and shows the note');
    await page.click('#problems-reveal-1-4-2');
    assert(await isVisible('#problems-card-1-4-2 .pc-hint'), 'revealing brings the hint back');
    await page.click('#problems-reveal-1-4-2');
    await page.uncheck('#problems-predict');
    assert(await isVisible('#problems-card-1-4-2 .pc-hint'), 'predict off shows the hint on a closed card');
    await page.check('#problems-predict');
    await page.reload({ waitUntil: 'load' });
    await waitFor('.problem-card');
    assert(await page.isChecked('#problems-predict'), 'predict survives a reload');
    assert((await ls('mv:problems.predict')) === 'true', 'predict is stored');
    await page.uncheck('#problems-predict');
    assert((await ls('mv:problems.predict')) === 'false', 'predict off is stored');

    // ---- clear all ticks (two presses, no confirm)
    await page.click('#problems-clear');
    assert((await readText(page, '#problems-clear')) === 'Click again to clear all ticks', 'the first press arms the button');
    await page.waitForTimeout(4200);
    assert((await readText(page, '#problems-clear')) === 'Clear all ticks', 'the button disarms after 4 seconds');
    assert((await readText(page, '#problems-progress')) !== '0 of 29 ticked', 'nothing was cleared yet');
    await page.click('#problems-clear');
    await page.click('#problems-clear');
    assert((await readText(page, '#problems-progress')) === '0 of 29 ticked', 'two presses clear the ticks');
    assert((await ls('mv:progress')) === null, 'the stored ticks are gone');
    assert((await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].some((b) => b.checked && b.id !== 'problems-predict'))) === false, 'no tick is left checked');

    // ---- route tokens
    await page.evaluate(() => { location.hash = '#problems-3'; });
    await page.waitForFunction(() => document.getElementById('problems-filter-3') && document.getElementById('problems-filter-3').getAttribute('aria-pressed') === 'true');
    assert((await visibleCards()).length === 3, '#problems-3 shows Chapter 3');
    await page.evaluate(() => { location.hash = '#problems-P'; });
    await page.waitForFunction(() => document.getElementById('problems-filter-P') && document.getElementById('problems-filter-P').getAttribute('aria-pressed') === 'true');
    assert((await visibleCards()).length === 7, '#problems-P shows the 7 proofs');
    await page.evaluate(() => { location.hash = '#problems-todo'; });
    await page.waitForFunction(() => document.getElementById('problems-filter-todo') && document.getElementById('problems-filter-todo').getAttribute('aria-pressed') === 'true');
    assert((await attr('#problems-filter-all', 'aria-pressed')) === 'true', '#problems-todo leaves All pressed');

    // ---- statements, topics, balance
    await page.click('#problems-filter-todo');
    assert((await count('#problems-card-1-5-2 .pc-statement .katex')) >= 1, '1.5.2 statement has typeset maths');
    const st152 = await readText(page, '#problems-card-1-5-2 .pc-statement');
    assert(st152.includes('bounded') && !st152.includes('$'), `1.5.2 statement: ${st152.slice(0, 80)}`);
    assert((await count('#problems-card-1-1-1 .pc-statement .katex')) === 5, '1.1.1 has five maths parts');
    for (const href of ['#powers', '#roots', '#problem-1-4-2']) assert((await count(`#problems-topic-T1-4 a[href="${href}"]`)) === 1, `topic T1.4 links ${href}`);
    assert((await readText(page, '#problems-topic-T1-4 a[href="#topic-T1-4"]')).toLowerCase().includes('powers'), 'the topic start button names the first place');
    await page.check('#problems-topic-tick-T1-4');
    assert(JSON.stringify(JSON.parse(await ls('mv:progress'))) === JSON.stringify({ 'T1.4': true }), 'a topic tick persists under its id');
    assert((await readText(page, '#problems-progress')) === '0 of 29 ticked', 'a topic tick does not count as a problem');
    await page.click('#problems-clear');
    await page.click('#problems-clear');
    const cells = await page.evaluate(() => ({
      all: document.querySelectorAll('#problems-balance .pb-cell').length,
      cart: document.querySelectorAll('#problems-balance .pb-cell[data-kind="cart"]').length,
      polar: document.querySelectorAll('#problems-balance .pb-cell[data-kind="polar"]').length,
      both: document.querySelectorAll('#problems-balance .pb-cell[data-kind="both"]').length,
      label: document.getElementById('problems-balance').getAttribute('aria-label') }));
    assert(cells.all === 29 && cells.cart === 10 && cells.polar === 12 && cells.both === 7, `balance cells ${JSON.stringify(cells)}`);
    assert(cells.label.includes('10 easiest in Cartesian'), `balance label: ${cells.label}`);

    // ---- a screenshot with two answers open
    await page.click('#problems-reveal-1-4-2');
    await page.click('#problems-reveal-2-1-2');
    const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow2 <= 1, `no horizontal overflow (${overflow2}px)`);
    await shot('problems-final');
  }
}
