import { clickChip, readText, settle, handleZ } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  if (route !== 'cauchy-riemann') return;
  await settle(page, 3);
  await page.focus('#cauchy-riemann-zplane-z0');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowRight');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowUp');
  await settle(page, 3);
  const z = await handleZ(page, 'cauchy-riemann-zplane-z0');
  log('z0 after keys: ' + JSON.stringify(z));
  for (const fn of ['exp', 'sq-plus-z', 'abs2', 'conj', 'const-u']) {
    await clickChip(page, 'cauchy-riemann-fn-' + fn);
    await page.waitForTimeout(250);
    const v = await page.evaluate(() => { const p = window.__mv.planes.get('cauchy-riemann-wplane'); const o = p.toPixel({ re: 0, im: 0 }); const s = p.getSize(); return { view: p.getView(), size: s, origin: o }; });
    log(`${fn}: readout=${(await readText(page, '#cauchy-riemann-readout')).slice(0, 110)} | unitsAcross=${v.view.unitsAcross.toPrecision(4)}`);
  }
  await clickChip(page, 'cauchy-riemann-fn-exp');
  await page.screenshot({ path: '/home/user/math-viz/docs/review/iter-1/i1-station-mappings-cr/reviewB/extreme-exp66-' + ctx.label + '.png', fullPage: false });
  // shrink h to min and max
  for (const h of [0.05, 0.5]) { await page.evaluate((h) => { const e = document.getElementById('cauchy-riemann-h'); e.value = h; e.dispatchEvent(new Event('input', { bubbles: true })); }, h); await settle(page, 3); log('h=' + h + ' : ' + (await readText(page, '#cauchy-riemann-readout')).slice(0, 80)); }
}
