import { settle, setSlider, clickChip } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  await settle(page, 4);
  for (const n of [3, 6]) {
    await setSlider(page, 'powermap-n', n);
    await page.evaluate(() => window.__mv.planes.get('powermap-wplane').canvas.scrollIntoView({ block: 'center' }));
    await settle(page, 3);
    await ctx.shot('line-n' + n);
  }
  await clickChip(page, 'powermap-grid-polar');
  await ctx.shot('line-n6-polar');
}
