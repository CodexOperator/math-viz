import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.label === 'phone') return;
  const sel = ctx.route === 'graph4d' ? '#graph4d-ex-z-cart' : '#branches-ex-z-cart';
  await page.waitForSelector(sel); await settle(page, 6);
  const get = () => page.evaluate((s) => document.querySelector(s).dataset.tex.slice(0, 40), sel);
  ctx.log(ctx.label + ' initial: ' + await get());
  await page.click('#theme-toggle'); await page.waitForTimeout(800);
  ctx.log(ctx.label + ' after toggle: ' + await get() + ' data-theme=' + await page.evaluate(() => document.documentElement.dataset.theme));
  await page.click('#theme-toggle'); await page.waitForTimeout(800);
  ctx.log(ctx.label + ' after toggle back: ' + await get());
}
