// Review B: element-level screenshots of the plane in many states (throwaway).
import { dragHandle, clickChip, setSlider, settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
const OUT = '/home/user/math-viz/docs/review/iter-1/i1-station-distance-sets/reviewB/states/';
export default async function (page, ctx) {
  const { route, label, log } = ctx;
  const snap = async (host, name) => { await settle(page, 3); await page.waitForTimeout(150); await page.locator(host).screenshot({ path: `${OUT}${route}-${label}-${name}.png` }); };
  if (route === 'problem-1-2-2') {
    await page.waitForSelector('#distance-plane-z1', { state: 'visible' });
    const H = '#distance-plane-host';
    await snap(H, 'two-default');
    await page.check('#distance-polar'); await snap(H, 'two-polar');
    await page.uncheck('#distance-polar');
    await dragHandle(page, 'distance-plane-z1', { re: -1, im: 1 }); await snap(H, 'two-same');
    await dragHandle(page, 'distance-plane-z1', { re: 0, im: 0 }); await snap(H, 'two-z1zero');
    await dragHandle(page, 'distance-plane-z1', { re: -3, im: -2 }); await snap(H, 'two-third-quadrant');
    await dragHandle(page, 'distance-plane-z1', { re: 4, im: 3 });
    await dragHandle(page, 'distance-plane-z2', { re: 4, im: 1 }); await snap(H, 'two-vertical');  // dx = 0
    await dragHandle(page, 'distance-plane-z2', { re: 0, im: 3 }); await snap(H, 'two-horizontal');  // dy = 0
    await page.evaluate(() => { location.hash = '#problem-1-2-1'; }); await page.waitForTimeout(700);
    await snap(H, 'circle-default');
    await dragHandle(page, 'distance-plane-R', { re: 1, im: 6 }); await snap(H, 'circle-r4');
    await dragHandle(page, 'distance-plane-a', { re: 0, im: 0 }); await snap(H, 'circle-a0');
    await page.uncheck('#distance-polar'); await snap(H, 'circle-nopolar');
    await page.check('#distance-polar');
    await clickChip(page, 'distance-mode-triangle'); await snap(H, 'tri-default');
    await dragHandle(page, 'distance-plane-z1', { re: 1, im: 1 }); await dragHandle(page, 'distance-plane-z2', { re: 2, im: 2 }); await snap(H, 'tri-aligned');
    await dragHandle(page, 'distance-plane-z2', { re: -1, im: -1 }); await snap(H, 'tri-opposite');
    await dragHandle(page, 'distance-plane-z2', { re: -2, im: 2 }); await snap(H, 'tri-obtuse');
    await dragHandle(page, 'distance-plane-z1', { re: 0, im: 0 }); await snap(H, 'tri-z1zero');
    await page.screenshot({ path: `${OUT}${route}-${label}-triangle-fullpage.png`, fullPage: true });
  } else if (route === 'problem-1-5-2') {
    await page.waitForSelector('#sets-plane-p', { state: 'visible' });
    const H = '#sets-plane-host';
    await snap(H, 'default');
    await dragHandle(page, 'sets-plane-p', { re: 0, im: 2 }); await snap(H, 'outer');
    await dragHandle(page, 'sets-plane-p', { re: 3, im: 3 }); await snap(H, 'exterior');
    await dragHandle(page, 'sets-plane-p', { re: 0, im: -1 }); await snap(H, 'at-centre');
    await dragHandle(page, 'sets-plane-p', { re: 0, im: 0 });
    await setSlider(page, 'sets-eps', 1.5); await snap(H, 'eps15');
    await setSlider(page, 'sets-eps', 0.1); await snap(H, 'eps01');
    await setSlider(page, 'sets-eps', 0.5);
    await clickChip(page, 'sets-open'); await snap(H, 'chip-open');
    await clickChip(page, 'sets-closed'); await snap(H, 'chip-closed');
    await clickChip(page, 'sets-bounded'); await snap(H, 'chip-bounded');
    await clickChip(page, 'sets-bounded');
    await clickChip(page, 'sets-preset-halfplane'); await snap(H, 'halfplane');
    await dragHandle(page, 'sets-plane-p', { re: 2, im: 0 }); await snap(H, 'halfplane-boundary');
    await clickChip(page, 'sets-preset-twodisks'); await snap(H, 'twodisks');
    await clickChip(page, 'sets-connected'); await snap(H, 'twodisks-connected');
    await clickChip(page, 'sets-preset-punctured'); await snap(H, 'punctured');
    await clickChip(page, 'sets-preset-closed'); await snap(H, 'closedannulus');
  }
}
