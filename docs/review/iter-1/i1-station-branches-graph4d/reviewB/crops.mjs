import fs from 'node:fs';
import path from 'node:path';
import { dragHandle, clickChip, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
const OUT = path.resolve('docs/review/iter-1/i1-station-branches-graph4d/reviewB/crops');
fs.mkdirSync(OUT, { recursive: true });
const shotEl = async (page, sel, name, ctx) => {
  const loc = page.locator(sel).first();
  await loc.scrollIntoViewIfNeeded();
  await settle(page, 3);
  await loc.screenshot({ path: path.join(OUT, `${ctx.route}--${ctx.label}--${name}.png`) });
};
export default async function (page, ctx) {
  if (ctx.route === 'problem-2-4-1') {
    await page.waitForSelector('#branches-readout');
    await settle(page, 6);
    await shotEl(page, '[data-plane-id="branches-zplane"]', 'zplane', ctx);
    await shotEl(page, '[data-plane-id="branches-wplane"]', 'wplane', ctx);
    await shotEl(page, '#branches-surface', 'surface', ctx);
  }
  if (ctx.route === 'branches') {
    await page.waitForSelector('#branches-readout');
    await settle(page, 6);
    await shotEl(page, '[data-plane-id="branches-zplane"]', 'zplane-default', ctx);
    await shotEl(page, '[data-plane-id="branches-wplane"]', 'wplane-default', ctx);
    await shotEl(page, '#branches-surface', 'surface-default', ctx);
    await clickChip(page, 'branches-walk-across');
    await page.waitForFunction(() => /jumps/.test(document.querySelector('#branches-walk-status').textContent), null, { timeout: 4000 });
    await shotEl(page, '[data-plane-id="branches-zplane"]', 'zplane-jump', ctx);
    await shotEl(page, '[data-plane-id="branches-wplane"]', 'wplane-jump', ctx);
    await clickChip(page, 'branches-seam-positive');
    await dragHandle(page, 'branches-zplane-z', { re: 0.2, im: 0.15 });
    await shotEl(page, '[data-plane-id="branches-zplane"]', 'zplane-small', ctx);
    await dragHandle(page, 'branches-zplane-z', { re: 1, im: 0.05 });
    await shotEl(page, '[data-plane-id="branches-zplane"]', 'zplane-right', ctx);
    await dragHandle(page, 'branches-zplane-z', { re: 1, im: -0.05 });
    await shotEl(page, '[data-plane-id="branches-zplane"]', 'zplane-right-below', ctx);
  }
}
