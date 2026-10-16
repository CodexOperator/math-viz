// tests/interact/i1-shell.mjs
// Run: node tools/smoke.mjs --route nosuchplace --dark --script tests/interact/i1-shell.mjs
// The harness runs this once per viewport (desktop 1280x860, phone 390x844, desktop-dark).
//
// This script provokes router failures on purpose (including a forced 404 for the distance station
// in section 3e). The harness reports their console errors as problems, so the script declares them in
// `expectedErrors` below (wave-0 sync: tools/smoke.mjs gained that hook after this script was written) and
// the command exits 0 when nothing else goes wrong. Any other problem line, and any "interaction script
// failed" line, still fails it. See "Expected harness output" in docs/designs/iter-1/i1-shell.md.
import { STATIONS } from '../../js/registry.js';

// Exactly the kinds of line the script provokes: the forced 404 of js/stations/distance.js (a plain HTTP 404, the failed
// request, the browser's own "Failed to load resource" line, which names no URL) and the router's "failed to load" log for
// the distance station and the three stub stations that throw. A 404 for any other file still fails the run.
export const expectedErrors = [
  /^HTTP 404: \S+\/js\/stations\/distance\.js$/,
  /^request failed: \S+\/js\/stations\/distance\.js$/,
  /^console\.error: Failed to load resource: the server responded with a status of 404 \(Not Found\)$/,
  /^console\.error: \[mv\] station "(?:distance|zz-throw|zz-mount|zz-nomount)" failed to load: /,
];

const SUFFIX = ' · One Point, Two Addresses';

export default async function (page, ctx) {
  const { viewport, log, assert, shot } = ctx;
  const phone = viewport.width < 900;
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const routerErrors = (re) => errors.filter((e) => re.test(e)).length;
  const attr = (sel, name) => page.getAttribute(sel, name);
  const count = (sel) => page.locator(sel).count();
  const text = async (sel) => (await page.textContent(sel)) || '';
  const noOverflow = async (when) => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `horizontal overflow of ${over}px ${when}`);
  };
  // Set the hash, then wait until the router has finished that navigation.
  const go = async (token) => {
    await page.evaluate((t) => { location.hash = '#' + t; }, token);
    await page.waitForFunction((t) => {
      const v = document.querySelector('#view');
      return v && v.dataset.route === (t || 'home') && v.dataset.state && v.dataset.state !== 'loading';
    }, token, { timeout: 8000 });
  };
  const openNav = async () => {
    if (!phone) return;
    if ((await attr('#nav-toggle', 'aria-expanded')) !== 'true') await page.click('#nav-toggle');
    assert((await attr('#nav-toggle', 'aria-expanded')) === 'true', 'nav toggle did not open the drawer');
  };

  // ---------------------------------------------------------------- 1. the page at load
  assert((await attr('#view', 'data-state')) === 'nosuchplace', 'run this script with --route nosuchplace (the start route must be the No-such-place panel)');
  assert((await page.title()) === 'No such place' + SUFFIX, `title: ${await page.title()}`);
  assert((await attr('#site-title', 'href')) === '#home', 'title link goes to #home');
  assert((await count('[data-station-error]')) === 0, 'No-such-place panel must not carry data-station-error');
  assert((await text('#no-such-place h1')) === 'No such place', 'panel heading');
  assert((await text('#no-such-place .route-token')) === '#nosuchplace', 'panel shows the token');
  const places = await page.$$eval('#no-such-place-list a', (as) => as.map((a) => ({ href: a.getAttribute('href'), title: a.querySelector('.place-title').textContent })));
  assert(places.length === STATIONS.length && STATIONS.length === 22, `place list has ${places.length} links`);
  const sorted = [...STATIONS].sort((a, b) => a.order - b.order);
  sorted.forEach((s, i) => assert(places[i].href === '#' + s.id && places[i].title === s.title, `place ${i}: ${places[i].title}`));

  const navLinks = await page.$$eval('#site-nav a.nav-link', (as) => as.map((a) => a.getAttribute('href')));
  assert(JSON.stringify(navLinks) === JSON.stringify(sorted.map((s) => '#' + s.id)), 'nav links follow the registry order');
  assert((await count('#site-nav .nav-part')) === 5, 'five parts in the nav');
  assert((await count('#site-nav a[aria-current="page"]')) === 0, 'no current nav item on an unknown route');

  assert((await page.isVisible('#site-nav')) === !phone, 'nav is a sidebar on desktop and a closed drawer on phone');
  assert((await page.isVisible('#nav-toggle')) === phone, 'nav toggle only on phone');
  assert((await page.isVisible('#theme-toggle')) === true, 'theme toggle visible');
  await noOverflow('at load');

  // keyboard order: skip link, title, theme toggle, then the nav toggle (phone) or the first nav link (desktop)
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement.id)) === 'skip-link', 'first Tab stops on the skip link');
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement.id)) === 'site-title', 'then the title link');
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement.id)) === 'theme-toggle', 'then the theme toggle');
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement.id)) === (phone ? 'nav-toggle' : 'nav-home'), 'then the nav toggle (phone) or nav link (desktop)');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert(ring !== 'none', 'focused control shows an outline');

  // skip link: moves focus to #view and leaves the hash alone
  await page.focus('#skip-link');
  await page.keyboard.press('Enter');
  assert((await page.evaluate(() => document.activeElement.id)) === 'view', 'skip link focuses #view');
  assert((await page.evaluate(() => location.hash)) === '#nosuchplace', 'skip link must not change the hash');

  // phone drawer: open, fits the screen, Escape closes and returns focus to the toggle
  if (phone) {
    assert((await attr('#nav-toggle', 'title')) === 'Show the places', 'the closed drawer toggle says Show the places');
    await openNav();
    assert((await attr('#nav-toggle', 'title')) === 'Hide the places', 'the open drawer toggle says Hide the places');
    assert(await page.isVisible('#site-nav'), 'drawer visible when open');
    // the page behind the drawer cannot scroll and cannot take a Tab stop
    const behind = () => page.evaluate(() => ({
      view: document.querySelector('#view').inert, footer: document.querySelector('#site-footer').inert, overflow: getComputedStyle(document.body).overflow,
    }));
    const locked = await behind();
    assert(locked.view && locked.footer && locked.overflow === 'hidden', `page behind the open drawer: ${JSON.stringify(locked)}`);
    await (await page.$$('#site-nav a.nav-link')).at(-1).focus();
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => !document.querySelector('#view').contains(document.activeElement) && !document.querySelector('#site-footer').contains(document.activeElement)), 'Tab after the last nav link must not enter the page hidden behind the drawer');
    const box = await page.locator('#site-nav').boundingBox();
    assert(box.x >= 0 && box.x + box.width <= viewport.width + 0.5, 'drawer fits the viewport width');
    await noOverflow('with the drawer open');
    await shot('nav-open');
    await page.focus('#site-nav a.nav-link');
    await page.keyboard.press('Escape');
    assert((await attr('#nav-toggle', 'aria-expanded')) === 'false' && !(await page.isVisible('#site-nav')), 'Escape closes the drawer');
    assert((await attr('#nav-toggle', 'title')) === 'Show the places', 'and the tooltip is back to Show the places');
    const freed = await behind();
    assert(!freed.view && !freed.footer && freed.overflow !== 'hidden', `page after the drawer closes: ${JSON.stringify(freed)}`);
    assert((await page.evaluate(() => document.activeElement.id)) === 'nav-toggle', 'focus returns to the toggle');
    await openNav();
    await page.locator('.brand').dispatchEvent('pointerdown');
    assert((await attr('#nav-toggle', 'aria-expanded')) === 'false', 'a press outside the drawer closes it');
  }

  // thread marks: three shapes, not two (residue 1), and the menu sets an exponent as a superscript (residue: sidebar caret)
  const dotShapes = await page.evaluate(() => Object.fromEntries(['T1', 'T2', 'T3'].map((t) => { const d = document.querySelector(`#site-nav .thread-dot[data-thread="${t}"]`); const c = d && getComputedStyle(d); return [t, c ? { transform: c.transform, style: c.borderStyle, radius: c.borderRadius } : null]; })));
  assert(dotShapes.T1 && dotShapes.T2 && dotShapes.T3, `thread dots exist in the menu: ${JSON.stringify(dotShapes)}`);
  // on a phone the closed drawer is display:none, where the computed transform reads 'none', so the corner radius carries the check there
  assert(dotShapes.T1.radius === '50%' && dotShapes.T2.radius === '50%' && dotShapes.T2.style.startsWith('dashed') && dotShapes.T3.radius !== '50%' && (phone || (dotShapes.T1.transform === 'none' && dotShapes.T3.transform !== 'none')),
    `T1 disc, T2 dashed ring, T3 rotated square: ${JSON.stringify(dotShapes)}`);
  const sup = await page.evaluate(() => { const t = document.querySelector('#nav-powermap .nav-title'); const u = t && t.querySelector('sup.prose-sup'); return t && u ? { text: t.textContent, sup: u.textContent, sups: t.querySelectorAll('sup').length, size: parseFloat(getComputedStyle(u).fontSize) / parseFloat(getComputedStyle(t).fontSize), lh: getComputedStyle(u).lineHeight } : null; });
  assert(sup && sup.sups === 1 && sup.sup === 'n' && sup.text === 'zn: Fans and Parabolas' && sup.size < 0.9 && sup.lh === '0px', `the menu shows z with a superscript n, no caret: ${JSON.stringify(sup)}`);
  assert((await count('#site-nav .nav-title sup')) === 1, 'only that one title carries an exponent');
  assert(await page.evaluate(() => ![...document.querySelectorAll('#site-nav .nav-title')].some((t) => t.textContent.includes('^'))), 'no caret is left in any menu label');

  // colour key
  await page.click('#colour-key summary');
  assert(await page.evaluate(() => document.querySelector('#colour-key').open), 'colour key opens');
  assert((await count('#colour-key .colour-key-list li')) === 9, 'nine colour key entries');
  assert((await count('#colour-key .arg-ghost')) === 1 && (await count('#colour-key .arg-ghost ~ .arg-home')) === 1, 'the ghost swatch draws the solid Arg arc on top of the faint arcs');
  const keyText = await text('#colour-key');
  assert(keyText.includes('other members of arg z') && keyText.includes('the solid arc is Arg z') && keyText.includes('T3 a purple diamond (dotted line)'), 'the key says the solid arc is one member of arg z, and names the three thread marks');
  await noOverflow('with the colour key open');
  await shot('colour-key');
  await page.click('#colour-key summary');

  // ---------------------------------------------------------------- 2. A3: a place that may be missing
  await openNav();
  await page.click('#nav-distance');
  await page.waitForFunction(() => { const v = document.querySelector('#view'); return v.dataset.route === 'distance' && v.dataset.state !== 'loading'; }, null, { timeout: 8000 });
  const errPanels = await count('[data-station-error]');
  const kids = await page.evaluate(() => { const s = document.querySelector('#station-distance'); return s ? s.children.length : -1; });
  assert(errPanels === 1 || kids > 0, '#distance shows the under-construction panel or the station itself');
  assert((await attr('#nav-distance', 'aria-current')) === 'page', 'nav marks the current place');
  assert((await page.title()) === 'Length, Distance, Circles' + SUFFIX, 'title follows the place');
  assert((await page.evaluate(() => document.activeElement.id)) === 'view', 'focus moves to #view after a navigation');
  if (errPanels === 1) {
    assert(routerErrors(/^\[mv\] station "distance" failed to load/) === 1, 'the failed import was reported once with console.error');
    assert((await text('.under-construction')).includes('This station is under construction.'), 'copy');
    assert((await attr('#under-construction-home', 'href')) === '#home', 'link home');
    assert((await attr('.under-construction', 'data-station-error')) === 'distance', 'error attribute names the station');
    assert((await page.evaluate(() => document.querySelector('#station-distance') !== null)), 'section still exists');
    await noOverflow('on the under-construction panel');
    await shot('under-construction');
    log('A3 literal: #distance gave the under-construction panel');
  } else {
    log('A3 literal: #distance mounted a real station (it exists now); see section 3 for the error path');
  }
  // Choosing the place that is already showing fires no hashchange, but must still close the drawer.
  await openNav();
  await page.click('#nav-distance');
  assert((await page.evaluate(() => document.body.dataset.navOpen)) !== 'true' && (await attr('#nav-toggle', 'aria-expanded')) === 'false', 'tapping the current place in the open drawer closes it');
  assert(!phone || !(await page.isVisible('#site-nav')), 'the drawer is gone from the screen');
  assert((await page.evaluate(() => location.hash)) === '#distance', 'the hash is unchanged');
  assert((await page.evaluate(() => document.activeElement.id)) === 'view', 'focus goes to the page, not to the hidden link');
  assert((await attr('#view', 'data-state')) !== 'loading', 'tapping the current place does not remount it');
  await go('nosuchplace');
  assert((await count('[data-station-error]')) === 0, 'no error panel after going back');
  assert((await count('#no-such-place')) === 1, 'No-such-place panel is back');
  assert((await attr('#view', 'data-state')) === 'nosuchplace', 'state');
  assert((await count('#site-nav a[aria-current="page"]')) === 0, 'nav current mark cleared');

  // ---------------------------------------------------------------- 3. router paths with injected stations (data: modules, no network)
  const SRC = {
    ok: "export function mount(el, ctx) { window.__zzCtx = ctx; window.__zzMounts = (window.__zzMounts || 0) + 1; el.textContent = 'zz-ok'; return function () { window.__zzUnmounts = (window.__zzUnmounts || 0) + 1; }; }",
    throws: "throw new Error('boom-import');",
    mountThrows: "export function mount() { throw new Error('boom-mount'); }",
    noMount: 'export const x = 1;',
    slow: "await new Promise((r) => setTimeout(r, 1200)); export function mount(el) { window.__zzSlow = (window.__zzSlow || 0) + 1; el.textContent = 'zz-slow'; }",
    // fails only when the page opens window.__zzOpen(), so a test decides exactly when
    late: "await window.__zzGate; throw new Error('boom-late');",
    slow2: "await new Promise((r) => setTimeout(r, 1300)); export function mount(el) { el.textContent = 'zz-slow2'; }",
  };
  await page.evaluate(async (src) => {
    const { STATIONS } = await import('./js/registry.js');
    const make = (id, title, code, extra) => ({ id, title, chapter: 9, part: 'V', order: 90, module: 'data:text/javascript,' + encodeURIComponent(code), problems: [], topics: [], threads: [], summary: 'test', ...extra });
    STATIONS.push(
      make('zz-ok', 'ZZ OK', src.ok, { problems: ['ZZ.1'], topics: ['ZZ.T1'] }),
      make('zz-throw', 'ZZ throw', src.throws),
      make('zz-mount', 'ZZ mount', src.mountThrows),
      make('zz-nomount', 'ZZ nomount', src.noMount),
      make('zz-slow', 'ZZ slow', src.slow),
      make('zz-late', 'ZZ late', src.late),
      make('zz-slow2', 'ZZ slow two', src.slow2),
    );
  }, SRC);
  const zz = (name) => page.evaluate((n) => window[n] || 0, name);

  // 3a. a good station: ctx shape, presets from problem, topic and token routes
  await go('problem-ZZ-1');
  assert((await attr('#view', 'data-state')) === 'ready', 'zz-ok ready');
  assert((await text('#station-zz-ok')) === 'zz-ok', 'zz-ok mounted into its section');
  assert((await page.title()) === 'ZZ OK' + SUFFIX, 'title for a mounted station');
  const shape = await page.evaluate(() => {
    const c = window.__zzCtx;
    return {
      keys: Object.keys(c).sort(), themeKeys: Object.keys(c.theme).sort(), frozen: Object.isFrozen(c),
      route: c.route, station: c.station.id, preset: c.preset, threads: c.threads.map((t) => t.id), hasStore: typeof c.store.get === 'function',
      sameRegistry: null,
    };
  });
  assert(JSON.stringify(shape.keys) === JSON.stringify(['navigate', 'preset', 'route', 'station', 'stations', 'store', 'theme', 'threads']), `ctx keys: ${shape.keys}`);
  assert(JSON.stringify(shape.themeKeys) === JSON.stringify(['cssVar', 'getTheme', 'onThemeChange', 'prefersReducedMotion', 'setTheme']), `ctx.theme keys: ${shape.themeKeys}`);
  assert(shape.frozen && shape.route === 'problem-ZZ-1' && shape.station === 'zz-ok' && shape.hasStore, 'ctx values');
  assert(JSON.stringify(shape.preset) === JSON.stringify({ kind: 'problem', id: 'ZZ.1' }), 'problem preset');
  assert(JSON.stringify(shape.threads) === '["T1","T2","T3"]', 'threads');
  assert(await page.evaluate(async () => (await import('./js/registry.js')).STATIONS === window.__zzCtx.stations), 'ctx.stations is the registry array');
  assert((await zz('__zzUnmounts')) === 0, 'not unmounted yet');

  await go('topic-ZZ-T1');
  assert(JSON.stringify(await page.evaluate(() => window.__zzCtx.preset)) === JSON.stringify({ kind: 'topic', id: 'ZZ.T1' }), 'topic preset');
  assert((await zz('__zzUnmounts')) === 1, 'the previous mount was unmounted exactly once');
  await go('zz-ok-hello');
  assert(JSON.stringify(await page.evaluate(() => window.__zzCtx.preset)) === JSON.stringify({ kind: 'token', token: 'hello' }), 'token preset');
  assert((await zz('__zzUnmounts')) === 2 && (await zz('__zzMounts')) === 3, 'mount and unmount counts');

  // 3b. ctx.navigate and the shared store
  await page.evaluate(() => window.__zzCtx.store.set('zz.k', { a: [1, 2] }, { persist: false }));
  await page.evaluate(() => window.__zzCtx.navigate('nosuchplace'));
  await page.waitForFunction(() => document.querySelector('#view').dataset.state === 'nosuchplace');
  assert((await zz('__zzUnmounts')) === 3, 'navigate away unmounts');
  await go('zz-ok');
  assert(JSON.stringify(await page.evaluate(() => window.__zzCtx.store.get('zz.k'))) === '{"a":[1,2]}', 'one store is shared across stations');
  const before = await zz('__zzMounts');
  await page.evaluate(() => window.__zzCtx.navigate('zz-ok'));
  await page.waitForFunction((n) => window.__zzMounts === n + 1, before);
  assert((await zz('__zzMounts')) === before + 1, 'navigate to the current hash remounts');

  // 3c. failures: import throws, mount throws, no mount export, and a retry
  await go('zz-throw');
  assert((await attr('#view', 'data-state')) === 'error', 'import failure -> error state');
  assert((await count('[data-station-error="zz-throw"]')) === 1 && (await count('[data-station-error]')) === 1, 'one error panel');
  assert((await text('.under-construction')).includes('ZZ throw') && (await text('.under-construction')).includes('under construction'), 'panel names the place');
  assert((await text('#under-construction-detail')).includes('boom-import'), 'detail has the message');
  assert((await attr('.under-construction', 'role')) === null, 'the panel has no live-region role: #route-status already announces it');
  assert((await text('#under-construction-retry')) === 'Reload the page', 'the button says what it does');
  await go('zz-mount');
  assert((await text('#under-construction-detail')).includes('boom-mount'), 'mount failure detail');
  assert((await count('#station-zz-mount')) === 1, 'section kept around the panel');
  await go('zz-nomount');
  assert((await text('#under-construction-detail')).includes('has no mount() export'), 'missing export detail');
  assert(routerErrors(/^\[mv\] station "zz-throw" failed to load: boom-import/) === 1, 'zz-throw reported once');
  assert(routerErrors(/^\[mv\] station "zz-mount" failed to load: boom-mount/) === 1, 'zz-mount reported once');
  assert(routerErrors(/^\[mv\] station "zz-nomount" failed to load: station module .* has no mount\(\) export/) === 1, 'zz-nomount reported once');
  await noOverflow('on the under-construction panel');
  await go('zz-ok');
  assert((await attr('#view', 'data-state')) === 'ready' && (await count('[data-station-error]')) === 0, 'a failure does not poison later routes');

  // 3d. loading placeholder, and a navigation that is superseded while a module loads
  await page.evaluate(() => { location.hash = '#zz-slow'; });
  await page.waitForSelector('#station-zz-slow .loading', { timeout: 4000 });
  assert((await text('#station-zz-slow .loading')).includes('Loading...'), 'loading placeholder after 150 ms');
  assert((await attr('#view', 'data-state')) === 'loading', 'state while loading');
  await page.evaluate(() => { location.hash = '#nosuchplace'; });
  await page.waitForTimeout(1500);
  assert((await zz('__zzSlow')) === 0, 'a superseded navigation never mounts');
  assert((await attr('#view', 'data-state')) === 'nosuchplace' && (await count('#station-zz-slow')) === 0, 'the newer route won');
  await go('zz-slow');
  assert((await zz('__zzSlow')) === 1 && (await attr('#view', 'data-state')) === 'ready', 'the cached module mounts on a later visit');

  // 3e. a navigation that FAILS after a newer one has started must not cancel the newer one's loading timer
  await page.evaluate(() => { window.__zzGate = new Promise((r) => { window.__zzOpen = r; }); location.hash = '#zz-late'; });
  await page.waitForFunction(() => document.querySelector('#view').dataset.route === 'zz-late');
  await page.evaluate(() => { location.hash = '#zz-slow2'; });
  await page.waitForFunction(() => document.querySelector('#view').dataset.route === 'zz-slow2');
  await page.evaluate(() => window.__zzOpen());   // zz-late now fails, while zz-slow2 is still importing
  await page.waitForSelector('#station-zz-slow2 .loading', { timeout: 1000 });
  assert((await attr('#view', 'data-state')) === 'loading', 'zz-slow2 is still loading, with its placeholder');
  await go('zz-slow2');
  assert((await text('#station-zz-slow2')) === 'zz-slow2' && (await count('[data-station-error]')) === 0, 'zz-slow2 mounted; the stale failure left no panel');
  assert(routerErrors(/zz-late/) === 0, 'a superseded navigation that fails is not reported');

  // 3f. the button on the under-construction panel reloads the page. A failed module (or one of its
  // imports) stays failed in the browser's module map, so only a fresh page can recover. Here the
  // distance station's file fails once, then loads. The reload also drops every injected zz- station.
  await page.reload();
  await page.waitForSelector('#view[data-state]');
  let flaky = true;
  const STUB = "export function mount(el) { el.textContent = 'distance-stub'; }";
  const flakyRoute = (route) => (flaky ? route.fulfill({ status: 404, body: 'gone' }) : route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await page.route('**/js/stations/distance.js', flakyRoute);
  await go('distance');
  assert((await attr('#view', 'data-state')) === 'error' && (await count('[data-station-error="distance"]')) === 1, 'the failed fetch gives the panel');
  flaky = false;
  await Promise.all([page.waitForEvent('load'), page.click('#under-construction-retry')]);
  await page.waitForFunction(() => { const v = document.querySelector('#view'); return v.dataset.state === 'ready'; }, null, { timeout: 8000 });
  assert((await page.evaluate(() => location.hash)) === '#distance', 'the reload keeps the place');
  assert((await text('#station-distance')) === 'distance-stub' && (await count('[data-station-error]')) === 0, 'after the reload the station mounts');
  await page.unroute('**/js/stations/distance.js', flakyRoute);
  await go('nosuchplace');
  assert((await count('[data-station-error]')) === 0, 'clean state after the fault tests');
  assert((await page.evaluate(async () => (await import('./js/registry.js')).STATIONS.some((s) => s.id.startsWith('zz-')))) === false, 'the injected stations are gone');
  log(`router errors provoked on purpose: ${errors.filter((e) => e.startsWith('[mv] station')).length}`);

  // ---------------------------------------------------------------- 4. A4: the theme toggle
  const effective = () => page.evaluate(() => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const stored = () => page.evaluate(() => { try { return localStorage.getItem('mv:theme'); } catch { return 'unavailable'; } });
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  const arm = () => page.evaluate(() => { window.__themeEvents = 0; document.addEventListener('themechange', () => { window.__themeEvents++; }); });

  const start = await effective();
  const flipped = start === 'dark' ? 'light' : 'dark';
  const bgStart = await bodyBg();
  assert((await attr('#theme-toggle', 'aria-pressed')) === String(start === 'dark'), 'aria-pressed starts in step with the theme');
  await arm();
  await page.click('#theme-toggle');
  let now = await page.evaluate(() => ({ attr: document.documentElement.dataset.theme, events: window.__themeEvents }));
  assert(now.attr === flipped, `data-theme should be ${flipped}, got ${now.attr}`);
  assert(now.events === 1, `themechange fired ${now.events} times`);
  const s1 = await stored();
  assert(s1 === flipped || s1 === 'unavailable', `stored theme ${s1}`);
  assert((await bodyBg()) !== bgStart, 'the page background actually changed');
  assert((await attr('#theme-toggle', 'aria-pressed')) === String(flipped === 'dark'), 'aria-pressed follows');
  const chromeColours = await page.$$eval('meta[name="theme-color"]', (ms) => ms.map((m) => m.getAttribute('content')));
  assert(chromeColours.length === 2 && chromeColours.every((c) => c === chromeColours[0]), `both theme-color metas carry one colour once the page runs: ${JSON.stringify(chromeColours)}`);
  assert(chromeColours[0] === (await bg()), 'browser chrome colour follows --bg');
  await shot('theme-flipped');

  await page.reload();
  await page.waitForSelector('#view[data-state]');
  assert((await page.evaluate(() => document.documentElement.dataset.theme)) === (s1 === 'unavailable' ? undefined : flipped), 'the choice survives a reload (set before first paint)');
  await arm();
  await page.click('#theme-toggle');
  now = await page.evaluate(() => ({ attr: document.documentElement.dataset.theme, events: window.__themeEvents }));
  assert(now.attr === start && now.events === 1, `second click flips back: ${now.attr}, ${now.events} event(s)`);
  assert((await bodyBg()) === bgStart, 'background is back');
  const s2 = await stored();
  assert(s2 === start || s2 === 'unavailable', `stored theme ${s2}`);

  await page.evaluate(async () => { (await import('./js/core/theme.js')).setTheme('auto'); });
  assert((await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))) === false, "'auto' removes data-theme");
  assert((await stored()) === null || (await stored()) === 'unavailable', "'auto' clears the stored choice");
  assert((await effective()) === start, 'effective theme is the OS preference again');
  await noOverflow('at the end');
  log(`viewport ${viewport.width}: shell checks passed`);
}
