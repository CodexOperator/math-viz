import { clickChip, settle, readText, setSlider, dragHandle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  const R = '#branches-readout';
  await page.waitForSelector(R);
  const rd = async (tag) => { await settle(page, 4); ctx.log(tag + ' :: ' + await readText(page, R) + ' || walk: ' + await readText(page, '#branches-walk-status') + ' || set: ' + await readText(page, '#branches-stairs-set')); };
  await setSlider(page, 'branches-seam', 1.0); await rd('seam=1.0 z=-1+0.5i');
  await dragHandle(page, 'branches-zplane-z', { re: 1, im: 0 }); await clickChip(page, 'branches-seam-positive'); await rd('seam=0 z=1 (on the seam)');
  await clickChip(page, 'branches-seam-principal'); await rd('principal z=1');
  await setSlider(page, 'branches-seam', Math.PI); await dragHandle(page, 'branches-zplane-z', { re: -1, im: 0 }); await rd('seam=pi z=-1');
  await clickChip(page, 'branches-walk-across'); await page.waitForTimeout(2500); await rd('seam=pi across');
  await setSlider(page, 'branches-seam', -PI2()); await rd('seam=-pi/2 walk cleared');
  await clickChip(page, 'branches-walk-across'); await page.waitForTimeout(2500); await rd('seam=-pi/2 across');
  await clickChip(page, 'branches-walk-along'); await page.waitForTimeout(2500); await rd('seam=-pi/2 along');
  // seam = pi/2 : the positive imaginary axis; walk across does not touch it
  await setSlider(page, 'branches-seam', PI2()); await clickChip(page, 'branches-walk-across'); await page.waitForTimeout(2500); await rd('seam=pi/2 across');
  // n changes mid walk
  await clickChip(page, 'branches-walk-across'); await setSlider(page, 'branches-n', 4); await page.waitForTimeout(2500); await rd('n=4 after change mid-walk');
  // 3D: orbit by drag and wheel zoom
  const box = await page.locator('#branches-surface canvas').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 40, { steps: 8 }); await page.mouse.up();
  await settle(page, 5);
  const dist = await page.evaluate(() => { const v = window.__mv.views3d.get('branches-surface'); return v.camera.position.length(); });
  ctx.log('camera distance after orbit: ' + dist);
}
function PI2() { return Math.PI / 2; }
