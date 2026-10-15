import { dragHandle, clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
import fs from 'node:fs';
const OUT = '/home/user/math-viz/docs/review/iter-1/i1-station-mappings-cr/reviewB/el';
fs.mkdirSync(OUT, { recursive: true });
export default async function (page, ctx) {
  const { route, label, log } = ctx;
  const el = async (sel, name) => { const l = page.locator(sel); await l.scrollIntoViewIfNeeded(); await settle(page, 3); await page.waitForTimeout(300); await l.screenshot({ path: `${OUT}/${route}-${label}-${name}.png` }); };
  if (route === 'mappings') {
    await settle(page, 4);
    await el('[data-plane-id="mappings-wplane"]', 'w-1+i');
    await el('.plane[data-plane-id="mappings-zplane"]', 'z-1+i');
    await dragHandle(page, 'mappings-zplane-z', { re: -0.3, im: 0.2 });
    await el('[data-plane-id="mappings-wplane"]', 'w-near0');
    await dragHandle(page, 'mappings-zplane-z', { re: -1.5, im: 0 });
    await el('[data-plane-id="mappings-wplane"]', 'w-neg-real');
    await el('.plane[data-plane-id="mappings-zplane"]', 'z-neg-real');
    await dragHandle(page, 'mappings-zplane-z', { re: 1, im: 1 });
    await clickChip(page, 'mappings-grid-polar');
    await setSlider(page, 'mappings-morph', 0.5);
    await page.waitForTimeout(400);
    await el('[data-plane-id="mappings-wplane"]', 'w-both-s05');
    await clickChip(page, 'mappings-fn-recip');
    await setSlider(page, 'mappings-morph', 1);
    await page.waitForTimeout(400);
    await el('[data-plane-id="mappings-wplane"]', 'w-recip');
    await dragHandle(page, 'mappings-zplane-z', { re: 0, im: 0 });
    await el('[data-plane-id="mappings-wplane"]', 'w-recip-pole');
    await page.screenshot({ path: `${OUT}/${route}-${label}-recip-pole-full.png`, fullPage: true });
  }
  if (route === 'cauchy-riemann') {
    await settle(page, 4);
    await el('[data-plane-id="cauchy-riemann-wplane"]', 'w-exp');
    await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0.5, im: -0.8 });
    await el('[data-plane-id="cauchy-riemann-wplane"]', 'w-exp-neg');
    await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 1.9, im: 0.1 });
    await el('[data-plane-id="cauchy-riemann-wplane"]', 'w-exp-1.9');
    await clickChip(page, 'cauchy-riemann-fn-abs2');
    await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 1, im: 1 });
    await el('[data-plane-id="cauchy-riemann-wplane"]', 'w-abs2');
    await page.screenshot({ path: `${OUT}/${route}-${label}-abs2-full.png`, fullPage: true });
    await clickChip(page, 'cauchy-riemann-fn-conj');
    await el('[data-plane-id="cauchy-riemann-wplane"]', 'w-conj');
    await clickChip(page, 'cauchy-riemann-fn-re');
    await el('[data-plane-id="cauchy-riemann-wplane"]', 'w-re');
    await clickChip(page, 'cauchy-riemann-fn-const-u');
    await page.screenshot({ path: `${OUT}/${route}-${label}-constu-full.png`, fullPage: true });
    await page.click('#cauchy-riemann-paths'); await settle(page, 3); await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${route}-${label}-constu-paths-full.png`, fullPage: true });
    await clickChip(page, 'cauchy-riemann-fn-sq-plus-z');
    await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: -1, im: 0.5 });
    await setSlider(page, 'cauchy-riemann-h', 0.5);
    await page.click('#cauchy-riemann-true'); await settle(page, 3);
    await el('[data-plane-id="cauchy-riemann-wplane"]', 'w-sqz-h05-true');
  }
}
