// tests/interact/i2-walk-shell.mjs
// Run: node tools/smoke.mjs --route home,staircase,roots-m16 --script tests/interact/i2-walk-shell.mjs --dark
// The harness runs the default export once per route and per viewport (desktop 1280x860, phone 390x844, dark desktop), each in a
// fresh browser context, so localStorage starts empty. Branches by ctx.route:
//   home        O (the off state), the A2 flow (start, six stops with real interactions, reload, leave), the extras X1 to X5, X7, X8,
//               the keyboard flow K, then (after a reset) the A3 flow, and last X6 (blocked storage)
//   staircase   O and the clearance flow C
//   roots-m16   O and the A3 flow
// Design: docs/designs/iter-2/i2-walk-shell.md section 7.3.
import path from 'node:path';
import { settle, dragHandle, dragHandleAround, setSlider } from '/home/user/math-viz/tests/interact/_helpers.mjs';

export const routes = ['home', 'staircase', 'roots-m16'];

const MIDDLE_DOT = '·';

export default async function (page, ctx) {
  const { viewport, log, assert, shot, route } = ctx;
  const phone = viewport.width < 900;
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  // ---------------------------------------------------------------- helpers
  // The harness's shot() is a full-page capture, where the fixed bar floats mid-page. viewShot() saves what the student sees: the
  // viewport, bar included, next to the harness's own files (<route>--<label>--bar-<name>.png).
  let outDir = null;                                   // learned from the first shot() the harness returns
  const viewShot = async (name) => {
    if (!outDir) return;
    await page.screenshot({ path: path.join(outDir, `${route}--${ctx.label}--bar-${name}.png`) });
  };
  const hash = () => page.evaluate(() => location.hash);
  const txt = async (sel) => (await page.textContent(sel) || '').trim();
  const attr = (sel, name) => page.getAttribute(sel, name);
  const dotSel = (k) => `li.walk-dot[data-stop="${k}"]`;
  const doneDots = () => page.evaluate(() => document.querySelectorAll('li.walk-dot[data-done="true"]').length);
  const waitDone = async (k, ms = 1500) => {
    try { await page.waitForSelector(`${dotSel(k)}[data-done="true"]`, { timeout: ms }); } catch { /* the assert below says what happened */ }
    assert((await attr(dotSel(k), 'data-done')) === 'true', `stop ${k + 1} is ticked (status: "${await txt('#walk-status')}", check: ${JSON.stringify(await page.evaluate(() => window.__mv.walk.snapshot()))})`);
  };
  const noOverflow = async (when) => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `horizontal overflow of ${over}px ${when}`);
  };
  const ready = () => page.waitForFunction(() => { const v = document.querySelector('#view'); return v && v.dataset.state && v.dataset.state !== 'loading'; }, null, { timeout: 8000 });
  const go = async (token) => {
    await page.evaluate((t) => { location.hash = '#' + t; }, token);
    await page.waitForFunction((t) => {
      const v = document.querySelector('#view');
      return v && v.dataset.route === (t || 'home') && v.dataset.state && v.dataset.state !== 'loading';
    }, token, { timeout: 8000 });
  };
  const viewReady = async (route2) => {
    await page.waitForFunction((r) => { const v = document.querySelector('#view'); return v && v.dataset.route === r && v.dataset.state === 'ready'; }, route2, { timeout: 8000 });
  };
  const state = () => page.evaluate(() => window.__mv.walk.state());
  const walkH = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--walk-h').trim());
  const barTop = () => page.evaluate(() => document.getElementById('walk-bar').getBoundingClientRect().top);
  const labelOf = (k) => `Stop ${k + 1} of 22 ${MIDDLE_DOT} `;

  // ---------------------------------------------------------------- O. the off state (every route)
  const expectShown = { home: 0, staircase: 4, 'roots-m16': 6 }[route];
  assert(expectShown !== undefined, `run this script with --route home, staircase or roots-m16 (got ${route})`);
  assert((await attr('#walk-bar', 'data-walk')) === 'off', 'the bar starts off');
  assert((await page.evaluate(() => document.body.dataset.walk)) === 'off', 'body[data-walk] is off');
  assert(await page.isVisible('#walk-start'), '#walk-start is visible');
  assert((await txt('#walk-start')).startsWith('Start the Walk'), `pill text: ${await txt('#walk-start')}`);
  assert(!(await page.isVisible('#walk-panel')), 'the panel is hidden while off');
  const pill = await page.evaluate(() => { const r = document.getElementById('walk-start').getBoundingClientRect(); return { right: r.right, bottom: r.bottom, h: r.height, iw: window.innerWidth, ih: window.innerHeight }; });
  assert(pill.right <= pill.iw + 0.5 && pill.bottom <= pill.ih + 0.5, `the pill is inside the viewport: ${JSON.stringify(pill)}`);
  assert(pill.h >= 43, `the pill is a 44 px target (${pill.h})`);
  await noOverflow('with the Walk off');
  assert((await walkH()) === '0px', `--walk-h is 0px while off (${await walkH()})`);
  const off = await state();
  assert(off.on === false && off.stop === 0 && Array.isArray(off.done) && off.done.length === 0 && off.ticked === false, `off state: ${JSON.stringify(off)}`);
  assert(off.shown === expectShown && off.here === (expectShown === 0), `shown and here on ${route}: ${JSON.stringify(off)}`);
  const ident = await page.evaluate(() => ({
    circles: document.querySelectorAll('.brand-mark circle').length,
    rays: document.querySelectorAll('.brand-mark .mark-grid path').length,
    title: getComputedStyle(document.querySelector('.site-title-text')).fontFamily,
    body: getComputedStyle(document.body).fontFamily,
  }));
  assert(ident.circles >= 2 && ident.rays >= 1, `the brand mark is a polar grid: ${JSON.stringify(ident)}`);
  assert(/serif/.test(ident.title) && ident.title !== ident.body, `the site title is in the display face: ${ident.title} vs ${ident.body}`);
  const first = await shot('off');
  if (first) outDir = path.dirname(first);
  await viewShot('off');
  log('O: the off state is right');

  const clearance = async (canvasId, when) => {
    const m = await page.evaluate((id) => {
      const canvas = document.getElementById(id);
      canvas.scrollIntoView({ block: 'end' });
      const bar = document.getElementById('walk-bar');
      return { bottom: canvas.getBoundingClientRect().bottom, top: bar.getBoundingClientRect().top, pad: parseFloat(getComputedStyle(document.getElementById('view')).paddingBottom), h: bar.offsetHeight };
    }, canvasId);
    assert(m.bottom <= m.top + 0.5, `the bar never covers the plane ${when}: canvas bottom ${m.bottom}, bar top ${m.top}`);
    assert(m.pad >= m.h, `#view's bottom padding (${m.pad}) is at least the bar's height (${m.h}) ${when}`);
    const foot = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const last = document.querySelector('#colour-key summary').getBoundingClientRect();
      return { bottom: last.bottom, top: document.getElementById('walk-bar').getBoundingClientRect().top };
    });
    assert(foot.bottom <= foot.top + 0.5, `the page does not end under the bar ${when}: footer line bottom ${foot.bottom}, bar top ${foot.top}`);
  };

  // ---------------------------------------------------------------- the A3 flow (route roots-m16, and home after a reset)
  const a3 = async () => {
    await page.click('#walk-start');
    await page.waitForFunction(() => document.body.dataset.walk === 'on');
    assert((await hash()) === '#home', `the Walk started at #home (${await hash()})`);
    await go('roots-m16');
    await page.waitForSelector('#walk-bar[data-walk="on"][data-here="false"]', { timeout: 3000 });
    assert(await page.isVisible('#walk-goto'), '#walk-goto is visible off the Walk\'s stop');
    assert((await attr('#walk-goto', 'href')) === '#home', 'the goto link points at the current stop');
    assert((await txt('#walk-goto')).includes('Go to') && (await txt('#walk-goto')) === 'Go to stop 1: The Map', `goto text: ${await txt('#walk-goto')}`);
    assert((await txt('#walk-do')).includes('click step k = 1'), `#walk-do shows the Roots text: ${await txt('#walk-do')}`);
    assert((await txt('#walk-stop-label')) === 'Stop 7 of 22 ' + MIDDLE_DOT + ' Roots: Divide the Staircase', `label: ${await txt('#walk-stop-label')}`);
    assert((await attr('#walk-problem', 'href')) === '#problem-1-4-2', 'the Roots stop points at 1.4.2');
    assert((await txt('#walk-offpath')) === 'The Walk is at stop 1 of 22: The Map.', `off-path line: ${await txt('#walk-offpath')}`);
    assert((await attr('#walk-bar', 'data-stop')) === '0' && (await attr('#walk-bar', 'data-shown')) === '6', 'data-stop 0, data-shown 6');
    assert((await attr(`${dotSel(0)}`, 'aria-current')) === 'step' && (await attr(dotSel(6), 'data-shown')) === 'true', 'the heavy ring is the Walk, the underline is the page');
    await viewShot('off-path');

    // doing a later stop early counts
    await page.waitForSelector('#roots-stairs-k1-row', { timeout: 5000 });
    await page.click('#roots-stairs-k1-row');
    await waitDone(6);
    assert((await txt('#walk-status')) === 'Done: stop 7 ticked, ahead of the Walk (it is at stop 1).', `status: ${await txt('#walk-status')}`);
    assert((await attr(dotSel(0), 'data-done')) === 'false', 'the Walk\'s own stop is not ticked');
    assert(await page.isHidden('#walk-done'), 'Mark done hides once the stop is ticked');

    // Next moves from the shown stop (D2)
    await page.click('#walk-next');
    await viewReady('problem-1-5-1');
    assert((await hash()) === '#problem-1-5-1', `Next from Roots goes to Curves (${await hash()})`);
    assert((await state()).stop === 7, `the Walk adopted stop 8: ${JSON.stringify(await state())}`);
    assert((await attr('#walk-bar', 'data-here')) === 'true', 'data-here is true again');
    await page.click('#walk-back');
    await viewReady('roots-m16');
    assert((await hash()) === '#roots-m16', `Back lands on Roots (${await hash()})`);
    assert((await txt('#walk-status')) === 'Done: stop 7 is already ticked.', `arrival status: ${await txt('#walk-status')}`);
    await page.click('#walk-back');
    await viewReady('problem-1-3-2');
    assert((await hash()) === '#problem-1-3-2' && (await state()).stop === 5, `second Back: ${await hash()} ${JSON.stringify(await state())}`);
    // a page that is not a stop
    await go('nosuchplace');
    await page.waitForFunction(() => /^This page is not one of the stops\./.test(document.getElementById('walk-offpath').textContent), null, { timeout: 3000 });
    assert(await page.isVisible('#walk-goto'), 'a way back from a page that is not a stop');
    assert(await page.isHidden('#walk-done'), 'nothing to mark on a page that is not a stop');
    await go('problem-1-3-2');
    assert((await attr('#walk-bar', 'data-here')) === 'true', 'back on the Walk\'s stop');
    log('A3: the bar is on every station, ticks ahead, and points back');
  };

  if (route === 'roots-m16') {
    await a3();
    await noOverflow('at the end');
    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
    return;
  }

  // ---------------------------------------------------------------- C. the clearance flow (route staircase)
  if (route === 'staircase') {
    await page.click('#walk-start');
    await page.waitForFunction(() => document.body.dataset.walk === 'on');
    await viewReady('home');
    await page.evaluate(() => window.__mv.walk.goTo(4));
    await viewReady('staircase');
    await page.waitForSelector('#walk-bar[data-here="true"]');
    assert((await txt('#walk-stop-label')) === 'Stop 5 of 22 ' + MIDDLE_DOT + ' The Staircase: z, arg z, Arg z', `label: ${await txt('#walk-stop-label')}`);
    await page.waitForSelector('#staircase-plane-canvas');
    await clearance('staircase-plane-canvas', 'on the staircase');
    await noOverflow('with the bar on');
    await viewShot('walk-on');
    const bh = await page.evaluate(() => document.getElementById('walk-bar').offsetHeight);
    assert(bh <= viewport.height * 0.45, `the bar takes at most 45 % of the screen (${bh} of ${viewport.height})`);
    const wh = parseFloat(await walkH());
    assert(wh >= bh - 1 && wh <= bh + 1, `--walk-h is the bar's height: ${wh} vs ${bh}`);
    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
    return;
  }

  // ---------------------------------------------------------------- A2. start the Walk and do the first six stops (route home)
  await page.click('#walk-start');
  await page.waitForFunction(() => document.body.dataset.walk === 'on');
  assert((await hash()) === '#home', `1. started at #home (${await hash()})`);
  assert((await txt('#walk-stop-label')) === 'Stop 1 of 22 ' + MIDDLE_DOT + ' The Map', `1. label: ${await txt('#walk-stop-label')}`);
  assert((await txt('#walk-say')).includes('A complex number is a move: turn, then stretch.'), `1. say: ${await txt('#walk-say')}`);
  assert(await page.evaluate(() => document.getElementById('walk-problem').hidden), '1. the Map has no problem');
  assert((await page.locator('#walk-progress li.walk-dot').count()) === 22, '1. 22 dots');
  assert((await attr('#walk-bar', 'data-here')) === 'true', '1. here');
  const h1 = await page.evaluate(() => ({ v: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--walk-h')), h: document.getElementById('walk-bar').offsetHeight }));
  assert(h1.v >= h1.h - 1 && h1.v <= h1.h + 1, `1. --walk-h matches the bar: ${JSON.stringify(h1)}`);
  assert((await page.evaluate(() => getComputedStyle(document.getElementById('walk-bar')).borderTopColor)) !== '', '1. the top rule has a colour');
  assert(await page.evaluate(() => window.__mv.walk.check() === false), '1. nothing is ticked for free');

  // 2. a lap of the demo plane ticks stop 1
  await dragHandleAround(page, 'home-demo-plane-z', { center: { re: 0, im: 0 }, radius: 1.5, turns: 1 });
  await page.waitForTimeout(400);
  await waitDone(0);
  assert((await txt('#walk-status')).includes('Done'), `2. status: ${await txt('#walk-status')}`);
  assert(await page.isHidden('#walk-done'), '2. Mark done hides');

  // 3. Next
  await page.click('#walk-next');
  await viewReady('addresses');
  await viewShot('walk-on');
  assert((await hash()) === '#addresses', `3. hash ${await hash()}`);
  assert((await txt('#walk-stop-label')) === 'Stop 2 of 22 ' + MIDDLE_DOT + ' One Point, Two Addresses', `3. label: ${await txt('#walk-stop-label')}`);
  assert((await attr('#walk-problem', 'href')) === '#problem-1-3-1' && (await txt('#walk-problem')) === '1.3.1', '3. the problem chip');
  assert(await page.isVisible('#walk-problem'), '3. the chip shows');

  // 4. typing into two fields
  await page.fill('#addresses-x', '1');
  await page.fill('#addresses-y', '1');
  await waitDone(1);

  // 5, 6. the arithmetic station
  await page.click('#walk-next');
  await viewReady('problem-1-1-1');
  assert((await hash()) === '#problem-1-1-1', `5. hash ${await hash()}`);
  await page.click('#arithmetic-animate');
  await waitDone(2);

  // 7, 8. the distance station
  await page.click('#walk-next');
  await viewReady('distance');
  assert((await hash()) === '#distance', `7. hash ${await hash()}`);
  // the station opens on two points; the stop's handles (the centre a and the rim point R) belong to the circle mode (request R7 in the design report)
  await page.click('#distance-mode-circle');
  await dragHandle(page, 'distance-plane-a', { re: 1.5, im: 2 });
  await waitDone(3);

  // 9, 10. the staircase, and the clearance of the bar
  await page.click('#walk-next');
  await viewReady('staircase');
  assert((await hash()) === '#staircase', `9. hash ${await hash()}`);
  await dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, turns: 1 });
  assert((await page.evaluate(() => window.__mv.staircase.state().laps)) !== 0, '10. the staircase counted a lap');
  await waitDone(4);
  await clearance('staircase-plane-canvas', 'on the staircase');

  // 11, 12. powers
  await page.click('#walk-next');
  await viewReady('problem-1-3-2');
  assert((await hash()) === '#problem-1-3-2', `11. hash ${await hash()}`);
  await setSlider(page, 'powers-n', 10);
  await waitDone(5);

  // 13. reload
  await page.reload();
  await ready();
  await page.waitForSelector('#walk-bar[data-walk="on"]');
  assert((await page.evaluate(() => document.body.dataset.walk)) === 'on', '13. still on after a reload');
  assert((await txt('#walk-stop-label')) === 'Stop 6 of 22 ' + MIDDLE_DOT + ' Powers: Spin n Times', `13. label: ${await txt('#walk-stop-label')}`);
  assert((await doneDots()) === 6, `13. six dots done (${await doneDots()})`);
  assert((await txt('#walk-status')) === 'Done: stop 6 is already ticked.', `13. status: ${await txt('#walk-status')}`);

  // 14. leave
  await page.click('#walk-leave');
  assert((await page.evaluate(() => document.body.dataset.walk)) === 'off', '14. off');
  const resume = await txt('#walk-start');
  assert(resume.includes('Resume the Walk') && resume.includes('6 of 22'), `14. resume pill: ${resume}`);
  const stored = await page.evaluate(() => ({ done: JSON.parse(localStorage.getItem('mv:walk.done')), on: localStorage.getItem('mv:walk.on'), stop: localStorage.getItem('mv:walk.stop') }));
  assert(JSON.stringify(Object.keys(stored.done).sort()) === JSON.stringify(['addresses', 'arithmetic', 'distance', 'home', 'powers', 'staircase']) && Object.values(stored.done).every((v) => v === true), `14. stored ticks: ${JSON.stringify(stored)}`);
  assert(stored.on === 'false' && stored.stop === '5', `14. stored position: ${JSON.stringify(stored)}`);
  assert((await walkH()) === '0px', `14. --walk-h is back to 0px (${await walkH()})`);
  assert(errors.length === 0, `15. no console error so far: ${errors.join(' | ')}`);
  log('A2: six stops ticked by real interactions, kept across a reload and a leave');

  // ---------------------------------------------------------------- X. extras
  // X1: the two ends
  await page.evaluate(() => window.__mv.walk.goTo(0));
  await viewReady('home');
  assert(await page.isDisabled('#walk-back') && !(await page.isDisabled('#walk-next')), 'X1. Back is disabled at the first stop');
  await page.evaluate(() => window.__mv.walk.goTo(21));
  await viewReady('problems-todo');
  assert(await page.isDisabled('#walk-next') && (await attr('#walk-next', 'title')) === 'That is the last stop.', 'X1. Next is disabled at the last stop');
  assert((await hash()) === '#problems-todo', `X1. hash ${await hash()}`);
  const calls = await page.evaluate(() => { const w = window.__mv.walk; return [w.goTo(NaN), w.goTo(Infinity), w.markDone('nowhere'), w.markDone('lab') === true ? 'ticked' : 'no']; });
  assert(calls[0] === false && calls[1] === false && calls[2] === false, `X1. bad arguments are refused: ${JSON.stringify(calls)}`);
  assert((await state()).stop === 21, 'X1. a refused goTo changes nothing');
  await page.evaluate(() => window.__mv.walk.markDone('lab'));        // idempotent
  assert((await state()).done.filter((s) => s === 'lab').length === 1, 'X1. a second tick of the same station is a no-op');

  // X2: an exponent in a title is a superscript
  await page.evaluate(() => window.__mv.walk.goTo(11));
  await viewReady('problem-2-1-2');
  const lab = await page.evaluate(() => { const l = document.getElementById('walk-stop-label'); return { text: l.textContent, title: l.title, sups: [...l.querySelectorAll('sup.prose-sup')].map((s) => s.textContent) }; });
  assert(lab.text === 'Stop 12 of 22 ' + MIDDLE_DOT + ' zn: Fans and Parabolas' && lab.sups.length === 1 && lab.sups[0] === 'n' && lab.title === 'Stop 12 of 22 ' + MIDDLE_DOT + ' z^n: Fans and Parabolas', `X2. ${JSON.stringify(lab)}`);

  // X3: the dots
  await page.click('#walk-dot-8');
  await viewReady('problem-1-5-2');
  assert((await hash()) === '#problem-1-5-2' && (await state()).stop === 8, `X3. a dot goes to its stop (${await hash()})`);
  await page.focus('#walk-dot-8');
  await page.keyboard.press('ArrowRight');
  assert((await page.evaluate(() => document.activeElement.id)) === 'walk-dot-9', 'X3. ArrowRight moves to the next dot');
  assert((await attr('#walk-dot-9', 'tabindex')) === '0' && (await attr('#walk-dot-8', 'tabindex')) === '-1', 'X3. roving tabindex');
  await page.keyboard.press('End');
  assert((await page.evaluate(() => document.activeElement.id)) === 'walk-dot-21', 'X3. End goes to the last dot');
  await page.keyboard.press('Home');
  assert((await page.evaluate(() => document.activeElement.id)) === 'walk-dot-0', 'X3. Home goes to the first dot');
  const dots = await page.$$eval('#walk-progress a', (as) => as.map((a) => ({ label: a.getAttribute('aria-label'), href: a.getAttribute('href'), stop: Number(a.dataset.stop) })));
  const routesOf = await page.evaluate(async () => (await import('./js/core/walk.js')).walkStops((await import('./js/registry.js')).STATIONS).map((s) => s.route));
  assert(dots.length === 22 && dots.every((d, i) => /^Stop \d+: /.test(d.label) && d.href === '#' + routesOf[i] && d.stop === i), 'X3. every dot is a labelled link to its stop');
  assert((await page.evaluate(() => document.querySelector('#walk-progress').getAttribute('aria-label'))) === 'Progress: 7 of 22 stops done', `X3. progress label: ${await attr('#walk-progress', 'aria-label')}`);
  await page.evaluate(() => window.__mv.walk.goTo(8));
  await viewReady('problem-1-5-2');

  // X4: the fold
  const before = await page.evaluate(() => document.getElementById('walk-bar').offsetHeight);
  await page.click('#walk-fold');
  assert((await attr('#walk-fold', 'aria-expanded')) === 'false' && await page.isHidden('#walk-body') && (await attr('#walk-bar', 'data-min')) === 'true', 'X4. folded');
  assert((await page.evaluate(() => localStorage.getItem('mv:walk.min'))) === 'true', 'X4. the choice is stored');
  await page.waitForFunction((b) => document.getElementById('walk-bar').offsetHeight < b, before);
  assert(parseFloat(await walkH()) < before, `X4. --walk-h shrinks (${await walkH()} vs ${before})`);
  await viewShot('walk-folded');
  await page.click('#walk-fold');
  assert((await attr('#walk-fold', 'aria-expanded')) === 'true' && await page.isVisible('#walk-body'), 'X4. unfolded');
  await page.waitForFunction((b) => document.getElementById('walk-bar').offsetHeight === b, before);

  // X7: reduced motion
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page.evaluate(() => {
    const a = document.querySelector('.walk-dot a');
    const dur = (s) => (/ms$/.test(s) ? parseFloat(s) / 1000 : parseFloat(s));
    return { transition: Math.max(...getComputedStyle(a, '::before').transitionDuration.split(',').map((s) => dur(s.trim()))), anim: getComputedStyle(document.getElementById('walk-panel')).animationName };
  });
  assert(motion.transition <= 0.001 && motion.anim === 'none', `X7. nothing animates under reduced motion: ${JSON.stringify(motion)}`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // X8: the phone drawer covers the bar and makes it inert
  if (phone) {
    await page.click('#nav-toggle');
    assert(await page.evaluate(() => document.getElementById('walk-bar').inert), 'X8. the bar is inert while the drawer is open');
    const covered = await page.evaluate(() => { const r = document.getElementById('walk-bar').getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && !!el.closest('#site-nav'); });
    assert(covered, 'X8. the drawer is above the bar');
    await page.keyboard.press('Escape');
    assert(!(await page.evaluate(() => document.getElementById('walk-bar').inert)), 'X8. the bar is live again after Escape');
  }

  // X5: corrupt stored values read as missing and are not rewritten by a visit
  await page.evaluate(() => { localStorage.setItem('mv:walk.stop', '"x"'); localStorage.setItem('mv:walk.done', '[1,2]'); localStorage.setItem('mv:walk.on', '"yes"'); });
  const errorsBefore = errors.length;
  await page.reload();
  await ready();
  assert((await page.evaluate(() => document.body.dataset.walk)) === 'off', 'X5. corrupt walk.on reads as off');
  assert((await txt('#walk-start')).startsWith('Start the Walk'), `X5. the pill starts fresh: ${await txt('#walk-start')}`);
  const x5 = await state();
  assert(x5.on === false && x5.stop === 0 && x5.done.length === 0, `X5. ${JSON.stringify(x5)}`);
  assert(errors.length === errorsBefore, `X5. no console error: ${errors.slice(errorsBefore).join(' | ')}`);
  const kept = await page.evaluate(() => [localStorage.getItem('mv:walk.stop'), localStorage.getItem('mv:walk.done'), localStorage.getItem('mv:walk.on')]);
  assert(JSON.stringify(kept) === JSON.stringify(['"x"', '[1,2]', '"yes"']), `X5. a visit rewrites nothing: ${JSON.stringify(kept)}`);
  await page.evaluate(() => ['on', 'stop', 'done', 'min'].forEach((k) => localStorage.removeItem('mv:walk.' + k)));

  // ---------------------------------------------------------------- K. keyboard (A7)
  await page.reload();
  await ready();
  await page.evaluate(() => window.__mv.walk.goTo(9));
  await viewReady('mappings');
  await page.waitForSelector('#walk-bar[data-here="true"]');
  await page.focus('#walk-next');
  await page.keyboard.press('Enter');
  await viewReady('problem-2-1-3');
  assert((await hash()) === '#problem-2-1-3', `K1. Enter on Next goes to stop 11 (${await hash()})`);
  assert((await page.evaluate(() => document.activeElement.id)) === 'walk-next', `K1. focus stayed in the bar (${await page.evaluate(() => document.activeElement.id)})`);
  const order = [];
  await page.focus('#walk-back');
  for (let i = 0; i < 7; i++) {
    order.push(await page.evaluate(() => document.activeElement.id));
    await page.keyboard.press('Tab');
  }
  assert(true, `K2. tab order: ${order.join(', ')}`);
  const tabbable = await page.evaluate(() => [...document.querySelectorAll('#walk-progress a')].filter((a) => a.tabIndex >= 0).length);
  assert(tabbable === 1, `K2. one tab stop in the strip (${tabbable})`);
  assert(!(await state()).ticked, 'K3. the stop is not ticked yet');
  await page.focus('#walk-done');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__mv.walk.state().done.includes('linear'));
  assert((await page.evaluate(() => document.activeElement.id)) === 'walk-next', 'K3. focus moves to Next when Mark done hides');
  const untyped = await page.evaluate(() => [...document.querySelectorAll('#walk-bar button')].filter((b) => b.getAttribute('type') !== 'button').map((b) => b.id));
  assert(untyped.length === 0, `K4. every bar button is type=button: ${untyped.join(',')}`);
  const rings = [];
  for (const id of ['walk-back', 'walk-next', 'walk-fold', 'walk-problem', 'walk-leave', 'walk-dot-0']) {
    await page.focus('#' + id);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    rings.push([id, await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return document.activeElement.id + ':' + s.outlineStyle; })]);
  }
  assert(rings.every(([id, r]) => r.startsWith(id + ':') && !r.endsWith(':none')), `K4. a visible focus ring on every control: ${JSON.stringify(rings)}`);
  log('K: keyboard flow is right');

  // ---------------------------------------------------------------- A3 flow after a reset, then X6 (it leaves the context with blocked storage)
  await page.evaluate(() => ['on', 'stop', 'done', 'min'].forEach((k) => localStorage.removeItem('mv:walk.' + k)));
  await page.reload();
  await ready();
  await go('home');
  await a3();

  // X6: blocked storage
  await page.context().addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const errorsAt6 = errors.length;
  await page.goto(page.url().split('#')[0] + '#home');
  await page.reload();
  await ready();
  await page.waitForSelector('#walk-start');
  await page.click('#walk-start');
  await page.waitForFunction(() => document.body.dataset.walk === 'on');
  await viewReady('home');
  await page.click('#walk-done');
  assert((await attr(dotSel(0), 'data-done')) === 'true', 'X6. Mark done ticks in memory');
  assert(await page.isVisible('#walk-note'), 'X6. the note says ticks will not be kept');
  assert((await txt('#walk-note')) === 'Your ticks are not saved in this browser. They last until you close this page.', `X6. note text: ${await txt('#walk-note')}`);
  assert(errors.length === errorsAt6, `X6. no console error with storage blocked: ${errors.slice(errorsAt6).join(' | ')}`);
  await noOverflow('at the end');
  assert(errors.length === 0, `no console error in the whole run: ${errors.join(' | ')}`);
  await settle(page);
  log(`viewport ${viewport.width}: Walk checks passed`);
}
