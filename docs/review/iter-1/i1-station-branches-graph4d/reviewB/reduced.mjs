import { clickChip, settle, readText } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'load' });
  if (ctx.route === 'branches') {
    await page.waitForSelector('#branches-readout');
    ctx.log('reduced? ' + await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
    await clickChip(page, 'branches-walk-across');
    await settle(page, 3);
    ctx.log('status immediately: ' + await readText(page, '#branches-walk-status'));
    const btns = await page.evaluate(() => [...document.querySelectorAll('#branches-problem, #branches-walk-status, .panel')].length);
    ctx.log('walk controls: ' + await page.evaluate(() => [...document.querySelectorAll('button')].filter(b=>/step|next|walk/i.test(b.textContent)||/walk|step/.test(b.id)).map(b => b.id + ':' + b.textContent.trim()).join(' | ')));
    // rapid double click
    await clickChip(page, 'branches-walk-along');
    await clickChip(page, 'branches-walk-across');
    await page.waitForTimeout(600);
    ctx.log('after rapid clicks: ' + await readText(page, '#branches-walk-status'));
  } else {
    await page.waitForFunction(() => !!window.__mv && !!window.__mv.graph4d);
    const before = await page.evaluate(() => window.__mv.graph4d.spinning);
    const spin = await page.evaluate(() => !!document.getElementById('graph4d-spin'));
    ctx.log('spin button exists: ' + spin);
    if (spin) { await clickChip(page, 'graph4d-spin'); await page.waitForTimeout(500); ctx.log('spinning under reduced motion: ' + await page.evaluate(() => window.__mv.graph4d.spinning) + ' uv=' + await page.inputValue('#graph4d-uv')); }
  }
}
