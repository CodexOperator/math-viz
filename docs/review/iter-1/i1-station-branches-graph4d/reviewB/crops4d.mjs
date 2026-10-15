import fs from 'node:fs';
import path from 'node:path';
import { dragHandle, clickChip, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
const OUT = path.resolve('docs/review/iter-1/i1-station-branches-graph4d/reviewB/crops4d');
fs.mkdirSync(OUT, { recursive: true });
export default async function (page, ctx) {
  if (ctx.route !== 'graph4d') return;
  await page.waitForFunction(() => !!window.__mv && !!window.__mv.graph4d);
  const shot = async (name) => {
    await settle(page, 8); await page.waitForTimeout(500);
    const loc = page.locator('#graph4d-view');
    await loc.scrollIntoViewIfNeeded();
    await loc.screenshot({ path: path.join(OUT, `${ctx.label}--${name}.png`) });
  };
  await shot('default-sq');
  await clickChip(page, 'graph4d-fn-sqrt-all'); await shot('sqrt-all');
  await clickChip(page, 'graph4d-fn-cbrt-all'); await shot('cbrt-all');
  await setSlider(page, 'graph4d-uv', Math.PI / 2); await shot('cbrt-all-uv90');
  await setSlider(page, 'graph4d-uv', 0);
  await clickChip(page, 'graph4d-fn-recip'); await shot('recip');
  await clickChip(page, 'graph4d-fn-exp'); await shot('exp');
  await clickChip(page, 'graph4d-fn-cbrt-all');
  await clickChip(page, 'graph4d-landscape'); await shot('landscape');
  await clickChip(page, 'graph4d-sphere'); await shot('sphere');
  // overflow after all that
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ctx.log('overflow after interactions: ' + ov);
  const full = page.locator('#view');
  await page.evaluate(() => window.scrollTo(0, 0));
}
