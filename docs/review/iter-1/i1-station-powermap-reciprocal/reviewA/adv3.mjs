import { settle, clickChip } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  await settle(page, 4);
  await clickChip(page, 'powermap-input-sector');
  await page.evaluate(() => { const p = window.__mv.planes.get('powermap-wplane'); p.setView({ center: { re: 30, im: 0 }, unitsAcross: 4 }); });
  await settle(page, 5);
  const wn = await page.evaluate(() => { const e = document.getElementById('powermap-wnote'); return { vis: e && !e.hidden, text: e && e.textContent, view: window.__mv.planes.get('powermap-wplane').getView() }; });
  ctx.log('wnote ' + JSON.stringify(wn));
  const wn2 = await page.evaluate(() => { const p = window.__mv.planes.get('powermap-wplane'); p.setView({ center: { re: 1000, im: 1000 }, unitsAcross: 4 }); return null; });
  await settle(page, 8);
  const v2 = await page.evaluate(() => ({ view: window.__mv.planes.get('powermap-wplane').getView(), vis: !document.getElementById('powermap-wnote').hidden }));
  ctx.log('after far pan ' + JSON.stringify(v2));
}
