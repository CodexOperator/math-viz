import { settle, setSlider } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  await settle(page, 4);
  const el = page.locator('#reciprocal-sphere');
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const vp = ctx.viewport && ctx.viewport.name ? ctx.viewport.name : ctx.viewport && ctx.viewport.width;
  const tag = String(vp || 'x') + (ctx.dark ? '-dark' : '');
  const dir = '/home/user/math-viz/docs/review/iter-1/i1-station-powermap-reciprocal/reviewA/r3/sph/';
  await page.screenshot({ path: dir + 'sph-' + tag + '-0.png', clip: await el.boundingBox() });
  await setSlider(page, 'reciprocal-sphere-turn', 1);
  await page.waitForTimeout(500);
  await page.screenshot({ path: dir + 'sph-' + tag + '-1.png', clip: await el.boundingBox() });
  const info = await page.evaluate(() => {
    const e = document.getElementById('reciprocal-sphere');
    const r = e.getBoundingClientRect();
    return { w: r.width, h: r.height, style: e.getAttribute('style') };
  });
  ctx.log('sphere box ' + JSON.stringify(info) + ' ' + JSON.stringify(ctx.viewport));
}
