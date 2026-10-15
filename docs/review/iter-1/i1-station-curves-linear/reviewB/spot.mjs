import { settle, clickChip, dragHandle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const titles = await page.evaluate(() => [...document.querySelectorAll('.problem-chip')].map((a) => a.textContent + ' => ' + a.title));
  ctx.log('chip titles: ' + JSON.stringify(titles));
  ctx.assert(!titles.some((t) => /[{}\\]/.test(t)), 'no TeX braces in titles');
  if (ctx.route === 'curves') {
    ctx.log('orient aria-pressed on segment: ' + (await page.getAttribute('#curves-orient', 'aria-pressed')) + ' disabled=' + await page.evaluate(() => document.getElementById('curves-orient').disabled));
    ctx.assert((await page.getAttribute('#curves-orient', 'aria-pressed')) === null, 'no aria-pressed while disabled');
    await clickChip(page, 'curves-preset-circle');
    ctx.log('orient aria-pressed on circle: ' + (await page.getAttribute('#curves-orient', 'aria-pressed')));
    await clickChip(page, 'curves-orient');
    ctx.log('after flip: ' + (await page.getAttribute('#curves-orient', 'aria-pressed')) + ' reverse=' + await page.getAttribute('#curves-reverse', 'aria-pressed'));
  }
}
