// A2 and A3 exactly as the goal text says (no extra clicks), at both viewports. Collect pass/fail instead of throwing at the first failure.
import { launch } from './lib.mjs';
import { dragHandle, dragHandleAround, setSlider } from '/home/user/math-viz/tests/interact/_helpers.mjs';
const results = [];
const L = await launch();
for (const vp of [{ name: 'desktop', width: 1280, height: 860 }, { name: 'phone', width: 390, height: 844 }]) {
  const ctx = await L.browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  const rec = (id, ok, ev) => { results.push({ vp: vp.name, id, ok, ev }); console.log(vp.name, ok ? 'PASS' : 'FAIL', id, ok ? '' : ev); };
  const txt = async (s) => ((await page.textContent(s)) || '').trim();
  const attr = (s, n) => page.getAttribute(s, n);
  const hash = () => page.evaluate(() => location.hash);
  const waitView = (r) => page.waitForFunction((r) => { const v = document.querySelector('#view'); return v && v.dataset.route === r && v.dataset.state === 'ready'; }, r, { timeout: 8000 });
  const dotDone = async (k, ms = 1500) => { try { await page.waitForSelector(`li.walk-dot[data-stop="${k}"][data-done="true"]`, { timeout: ms }); return true; } catch { return false; } };
  await page.goto(L.base + '#home'); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready');
  rec('off bar', (await attr('#walk-bar', 'data-walk')) === 'off' && (await txt('#walk-start')).startsWith('Start the Walk'), await txt('#walk-start'));
  await page.click('#walk-start');
  rec('start on', (await page.evaluate(() => document.body.dataset.walk)) === 'on' && (await hash()) === '#home', await hash());
  rec('label 1', (await txt('#walk-stop-label')) === 'Stop 1 of 22 · The Map', await txt('#walk-stop-label'));
  rec('say 1', (await txt('#walk-say')).includes('A complex number is a move: turn, then stretch.'), await txt('#walk-say'));
  rec('problem hidden', await page.evaluate(() => document.getElementById('walk-problem').hidden) , 'not hidden');
  rec('22 dots', (await page.locator('#walk-progress li.walk-dot').count()) === 22, 'count');
  await dragHandleAround(page, 'home-demo-plane-z', { center: { re: 0, im: 0 }, radius: 1.5, turns: 1 });
  await page.waitForTimeout(400);
  rec('dot0 done + Done', (await dotDone(0)) && (await txt('#walk-status')).includes('Done'), await txt('#walk-status'));
  await page.click('#walk-next'); await waitView('addresses');
  rec('stop2', (await hash()) === '#addresses' && (await txt('#walk-stop-label')) === 'Stop 2 of 22 · One Point, Two Addresses' && (await attr('#walk-problem', 'href')) === '#problem-1-3-1', `${await hash()} ${await txt('#walk-stop-label')} ${await attr('#walk-problem','href')}`);
  await page.fill('#addresses-x', '1'); await page.fill('#addresses-y', '1');
  rec('dot1 done', await dotDone(1), 'dot 1');
  await page.click('#walk-next'); await waitView('problem-1-1-1');
  rec('hash problem-1-1-1', (await hash()) === '#problem-1-1-1', await hash());
  await page.click('#arithmetic-animate');
  rec('dot2 done', await dotDone(2), 'dot 2');
  await page.click('#walk-next'); await waitView('distance');
  rec('hash distance', (await hash()) === '#distance', await hash());
  // LITERAL: drag distance-plane-a with no mode click
  let dragErr = null;
  try { await dragHandle(page, 'distance-plane-a', { re: 1.5, im: 2 }); } catch (e) { dragErr = e.message; }
  rec('literal drag of distance-plane-a (no mode click)', dragErr === null && (await dotDone(3)), dragErr || 'dot 3 not done');
  const visibleHandles = await page.evaluate(() => [...document.querySelectorAll('[id^="distance-plane-"]')].map((e) => ({ id: e.id, hidden: e.hidden || getComputedStyle(e).display === 'none' || e.offsetParent === null })));
  console.log(vp.name, 'distance handles', JSON.stringify(visibleHandles));
  console.log(vp.name, 'distance walk-do:', await txt('#walk-do'));
  await page.screenshot({ path: `/home/user/math-viz/docs/review/iter-2/i2-walk-shell/reviewB/crops/distance-opened-by-walk--${vp.name}.png` });
  if (!(await dotDone(3, 100))) {
    // continue the flow with the builder's workaround so later steps can be checked
    await page.click('#distance-mode-circle');
    await dragHandle(page, 'distance-plane-a', { re: 1.5, im: 2 });
    rec('dot3 done after clicking circle mode (workaround)', await dotDone(3), 'dot 3');
  }
  await page.click('#walk-next'); await waitView('staircase');
  rec('hash staircase', (await hash()) === '#staircase', await hash());
  await dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, turns: 1 });
  rec('laps', (await page.evaluate(() => window.__mv.staircase.state().laps)) !== 0, 'laps');
  rec('dot4 done', await dotDone(4), 'dot 4');
  const clr = await page.evaluate(() => { const c = document.getElementById('staircase-plane-canvas'); c.scrollIntoView({ block: 'end' }); const b = document.getElementById('walk-bar'); return { bottom: c.getBoundingClientRect().bottom, top: b.getBoundingClientRect().top, pad: parseFloat(getComputedStyle(document.getElementById('view')).paddingBottom), h: b.offsetHeight }; });
  rec('bar never covers plane', clr.bottom <= clr.top + 0.5 && clr.pad >= clr.h, JSON.stringify(clr));
  await page.click('#walk-next'); await waitView('problem-1-3-2');
  rec('hash problem-1-3-2', (await hash()) === '#problem-1-3-2', await hash());
  await setSlider(page, 'powers-n', 10);
  rec('dot5 done', await dotDone(5), 'dot 5');
  await page.reload(); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready'); await page.waitForSelector('#walk-bar[data-walk="on"]');
  const nDone = await page.evaluate(() => document.querySelectorAll('li.walk-dot[data-done="true"]').length);
  rec('reload keeps', (await txt('#walk-stop-label')) === 'Stop 6 of 22 · Powers: Spin n Times' && nDone === 6, `${await txt('#walk-stop-label')} done=${nDone}`);
  await page.click('#walk-leave');
  const startTxt = await txt('#walk-start');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mv:walk.done')));
  rec('leave', (await page.evaluate(() => document.body.dataset.walk)) === 'off' && startTxt.includes('Resume the Walk') && startTxt.includes('6 of 22') && ['home','addresses','arithmetic','distance','staircase','powers'].every((k) => stored[k] === true), `${startTxt} ${JSON.stringify(stored)}`);
  rec('no console errors', errors.length === 0, errors.join(' | '));
  // A3 from fresh state
  await page.evaluate(() => localStorage.clear());
  await page.goto(L.base + '#home'); await page.reload(); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready');
  await page.click('#walk-start');
  await page.evaluate(() => { location.hash = '#roots-m16'; });
  await waitView('roots-m16');
  await page.waitForSelector('#walk-bar[data-walk="on"][data-here="false"]');
  rec('A3 goto', (await page.isVisible('#walk-goto')) && (await attr('#walk-goto', 'href')) === '#home' && (await txt('#walk-goto')).includes('Go to'), await txt('#walk-goto'));
  rec('A3 do text', (await txt('#walk-do')).includes('click step k = 1'), await txt('#walk-do'));
  await page.click('#roots-stairs-k1-row');
  rec('A3 roots dot done', await dotDone(6), 'dot 6');
  rec('A3 status', (await txt('#walk-status')).length > 0 && /ahead/.test(await txt('#walk-status')), await txt('#walk-status'));
  rec('no overflow', (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'overflow');
  rec('no console errors (A3)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
await L.close();
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} pass`);
for (const b of bad) console.log('FAIL', b.vp, b.id, '->', b.ev);
