import { settle, handleZ, readText, dragHandle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, label, log, assert, shot } = ctx;
  if (label !== 'desktop') return;
  const btn = await page.$('#theme-toggle, button[aria-label*="theme" i], header button');
  const cellId = route === 'problem-1-2-2' ? '#distance-ex-dist-cart' : '#sets-ex-test-cart';
  if (route === 'problem-1-2-2') await page.waitForSelector('#distance-plane-z1', { state: 'visible' }); else await page.waitForSelector('#sets-plane-p', { state: 'visible' });
  const before = await page.getAttribute(cellId, 'data-tex');
  const colBefore = /#[0-9a-f]{6}/i.exec(before)?.[0];
  const canvasBefore = await page.evaluate(() => { const c = document.querySelector('.plane canvas'); const g = c.getContext('2d'); return Array.from(g.getImageData(10, 10, 1, 1).data).join(','); });
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); window.dispatchEvent(new Event('themechange')); document.dispatchEvent(new Event('themechange')); });
  await page.waitForTimeout(600);
  const after = await page.getAttribute(cellId, 'data-tex');
  const colAfter = /#[0-9a-f]{6}/i.exec(after)?.[0];
  log(`explainer colour light ${colBefore} -> dark ${colAfter}`);
  // what does the app's own toggle do? find it
  log('toggle button: ' + (btn ? await btn.evaluate((e) => e.id + '|' + e.getAttribute('aria-label')) : 'none'));
  await shot('theme-switched');
  if (route === 'problem-1-5-2') {
    // keyboard on the probe
    await page.focus('#sets-plane-p');
    const z0 = await handleZ(page, 'sets-plane-p');
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await settle(page);
    const z1 = await handleZ(page, 'sets-plane-p');
    log(`keyboard: ${JSON.stringify(z0)} -> ${JSON.stringify(z1)}; readout ${await readText(page, '#sets-readout')}; status "${await readText(page, '#sets-status')}"`);
    assert(z1.im > z0.im, 'ArrowUp moves the probe up');
  } else {
    log(`status after load "${await readText(page, '#distance-status')}"`);
  }
}
