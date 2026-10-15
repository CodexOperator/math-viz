import { settle, readText, clickChip } from '../../../../../tests/interact/_helpers.mjs';
async function typeChange(page, id, text) {
  await page.evaluate(({ id, text }) => { const el = document.getElementById(id); el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, { id, text });
  await settle(page, 4);
}
export default async function (page, ctx) {
  const { route, log, assert, shot } = ctx;
  if (route !== 'arithmetic') return;
  await settle(page, 6);
  await clickChip(page, 'arithmetic-mode-mul');
  await typeChange(page, 'arithmetic-z1-input', '-1 + 4i');
  await typeChange(page, 'arithmetic-z2-input', '-1 + 4i');
  await settle(page, 8);
  const t = (id) => page.evaluate((i) => { const el = document.getElementById(i); return el ? (el.dataset.tex || el.textContent.trim()).replace(/−/g, '-') : null; }, id);
  log('readout: ' + (await readText(page, '#arithmetic-readout')));
  log('wrap note: ' + (await readText(page, '#arithmetic-wrap-note')));
  log('angle polar: ' + (await t('arithmetic-ex-angle-polar')));
  log('point cart: ' + (await t('arithmetic-ex-point-cart')));
  log('why: ' + (await readText(page, '#arithmetic-why')));
  const ro = await readText(page, '#arithmetic-readout');
  assert(ro.startsWith('result = -15 - 8i') && ro.includes('Arg = -2.652'), 'z2^2 = -15 - 8i, Arg -2.652: ' + ro);
  await shot('wrap');
  // div where theta difference wraps below -pi: z1 = -1 - 4i (Arg -1.816), z2 = -1 + 4i (Arg 1.816): diff = -3.632
  await clickChip(page, 'arithmetic-mode-div');
  await typeChange(page, 'arithmetic-z1-input', '-1 - 4i');
  await settle(page, 6);
  log('div readout: ' + (await readText(page, '#arithmetic-readout')) + ' | wrap: ' + (await readText(page, '#arithmetic-wrap-note')));
  // expected: (-1-4i)/(-1+4i) = (-1-4i)(-1-4i)/17 = (1+8i+16i^2)/17 = (-15+8i)/17; Arg = pi - atan(8/15)=2.6516
  assert((await readText(page, '#arithmetic-readout')).includes('-0.882 + 0.471i'), 'div wrap value');
  await shot('wrap-div');
}
