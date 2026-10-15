import { dragHandle, clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, assert, log } = ctx;
  if (route !== 'problem-P7') return;
  await settle(page, 4);
  const typeV = async (t) => { await page.fill('#cauchy-riemann-v', t); await settle(page, 3); await page.waitForTimeout(300); };
  const status = () => readText(page, '#cauchy-riemann-const-status');
  const err = async () => page.evaluate(() => { const e = document.getElementById('cauchy-riemann-v-error'); return e.hidden ? null : e.textContent; });
  const cells = async () => page.evaluate(() => ({
    ab: [...document.querySelectorAll('#cauchy-riemann-ab [data-tex], #cauchy-riemann-ab-same-polar')].length,
    readout: document.getElementById('cauchy-riemann-readout').textContent,
    proof: [...document.querySelectorAll('#cauchy-riemann-proof li')].map((l) => l.dataset.ok).join(','),
  }));
  log('default status: ' + await status());
  for (const t of ['3', 'y', 'x^2', 'x*y', '1/x', 'ln(x)', 'sqrt(x)', 'i*x', 'x +', 'foo', 'x^2 + y^2', '']) {
    await typeV(t);
    const e = await err();
    log(`v="${t}" -> err=${e ? JSON.stringify(e.slice(0, 90)) : 'none'} | status=${(await status()).slice(0, 120)}`);
  }
  await typeV('1/x');
  await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0, im: 1 });
  let c = await cells();
  log('1/x at x=0: ' + JSON.stringify(c));
  const tex = async (id) => page.evaluate((id) => (document.getElementById(id) || {}).dataset?.tex || null, id);
  for (const id of ['cauchy-riemann-ab-A-polar', 'cauchy-riemann-ab-B-polar', 'cauchy-riemann-ab-fprime-polar', 'cauchy-riemann-ab-same-polar']) log(id + ': ' + await tex(id));
  log('status: ' + await status());
  log('jac ux: ' + await page.evaluate(() => document.getElementById('cauchy-riemann-ux').dataset.value));
  await page.screenshot({ path: '/home/user/math-viz/docs/review/iter-1/i1-station-mappings-cr/reviewB/p7-undefined-' + ctx.label + '.png', fullPage: true });
  // the 3 preset: constant -> everywhere
  await clickChip(page, 'cauchy-riemann-vpreset-3');
  await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 1, im: 1 });
  log('v=3 status: ' + await status());
  log('v=3 proof: ' + (await cells()).proof);
  log('v=3 readout: ' + (await cells()).readout);
  await clickChip(page, 'cauchy-riemann-vpreset-y');
  log('v=y status: ' + await status());
  log('v=y proof: ' + (await cells()).proof);
}
