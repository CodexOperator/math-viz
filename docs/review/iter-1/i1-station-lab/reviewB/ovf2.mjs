import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { log } = ctx;
  await page.evaluate(() => { location.hash = '#lab'; });
  await page.waitForTimeout(900);
  const base = 'z^4 + 3z^3 - 2z^2 + z - 7';
  for (const n of [1, 2, 3, 4, 5]) {
    const src = Array.from({ length: n }, () => '(' + base + ')').join(' + ');
    await page.fill('#lab-fn-src', src);
    await page.click('#lab-fn-apply');
    await settle(page, 3);
    const r = await page.evaluate(() => ({ ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, vw: document.documentElement.clientWidth }));
    log(src.length + ' chars ' + JSON.stringify(r));
  }
}
