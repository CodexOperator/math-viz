// Review B: localStorage and sessionStorage throw on every access; both pages must still work with no console errors.
import { dragHandle, readText, settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { assert, log } = ctx;
  await page.addInitScript(() => {
    const boom = () => { throw new DOMException('blocked', 'SecurityError'); };
    for (const name of ['localStorage', 'sessionStorage']) {
      try { Object.defineProperty(window, name, { get: boom, configurable: true }); } catch (e) {}
    }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  const thrown = await page.evaluate(() => { try { localStorage.getItem('x'); return false; } catch (e) { return true; } });
  assert(thrown, 'the init script makes localStorage throw');
  if (ctx.route === 'home') {
    await page.waitForSelector('#home-map a.map-station');
    const z = await dragHandle(page, 'home-demo-plane-z', { re: 2, im: 1 });
    await settle(page, 3);
    const t = await readText(page, '#home-readout');
    assert(t.includes('2.236') && t.includes('0.464'), `demo works without storage: ${t}`);
    assert((await page.evaluate(() => document.querySelectorAll('#home-map a.map-station').length)) === 21, 'map renders');
    assert((await readText(page, '#home-progress')).includes('0 of 29'), 'progress line renders');
  } else {
    await page.waitForSelector('.problem-card');
    await page.check('#problems-tick-1-1-1');
    assert(await page.isChecked('#problems-tick-1-1-1'), 'tick works in memory');
    assert((await readText(page, '#problems-progress')) === '1 of 29 ticked', 'progress counts in memory');
    await page.check('#problems-predict');
    await page.click('#problems-reveal-1-4-2');
    await page.click('#problems-filter-2');
    const n = await page.evaluate(() => [...document.querySelectorAll('.problem-card')].filter((c) => c.offsetParent !== null).length);
    assert(n === 8, `filter 2 gives 8 (${n})`);
  }
  log('ok without storage');
}
