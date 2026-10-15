import { dragHandle, clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
const PI = Math.PI;
const log = [];
export default async function (page, ctx) {
  const { assert } = ctx;
  if (ctx.route === 'branches') {
    const R = '#branches-readout', S = '#branches-walk-status';
    await page.waitForSelector('#branches-zplane-z');
    log.push(['load', await readText(page, R)]);
    const t0 = Date.now();
    await clickChip(page, 'branches-walk-across');
    await page.waitForFunction(() => /jumps/.test(document.querySelector('#branches-walk-status').textContent), null, { timeout: 3000 });
    ctx.log('jump status after ' + (Date.now() - t0) + ' ms: ' + await readText(page, S));
    await clickChip(page, 'branches-seam-positive');
    let r = await readText(page, R); ctx.log('positive readout: ' + r);
    assert(r.includes('window (0, 6.283]') || r.includes('(0, 2pi]'), 'positive window text');
    await clickChip(page, 'branches-walk-across');
    await page.waitForFunction(() => /continuous/.test(document.querySelector('#branches-walk-status').textContent), null, { timeout: 3000 });
    ctx.log('across seam0: ' + await readText(page, S));
    await clickChip(page, 'branches-walk-along');
    await page.waitForFunction(() => /continuous/.test(document.querySelector('#branches-walk-status').textContent), null, { timeout: 3000 });
    ctx.log('along seam0: ' + await readText(page, S));
    await dragHandle(page, 'branches-zplane-z', { re: -1, im: 0 });
    r = await readText(page, R); ctx.log('z=-1 seam0: ' + r);
    assert(r.includes('0.5 + 0.866i') && r.includes('pi/3'), 'f(-1) text');
    await clickChip(page, 'branches-seam-principal');
    r = await readText(page, R); ctx.log('z=-1 principal: ' + r);
    assert(r.includes('0.5 + 0.866i'), 'still 0.5+0.866i');
    await dragHandle(page, 'branches-zplane-z', { re: -1, im: -0.05 });
    r = await readText(page, R); ctx.log('z=-1-0.05i principal: ' + r);
    ctx.log('literal "0.5 - 0.8" present: ' + r.includes('0.5 - 0.8'));
    // independent numeric check
    const th = Math.atan2(-0.05, -1), rr = Math.hypot(1, 0.05) ** (1 / 3);
    ctx.log('expected value: ' + (rr * Math.cos(th / 3)).toFixed(4) + ' ' + (rr * Math.sin(th / 3)).toFixed(4));
    // seam 0 for the same point
    await clickChip(page, 'branches-seam-positive');
    r = await readText(page, R); ctx.log('z=-1-0.05i seam0: ' + r);
  } else if (ctx.route === 'graph4d') {
    const R = '#graph4d-readout';
    await page.waitForFunction(() => !!window.__mv && !!window.__mv.graph4d);
    let r = await readText(page, R); ctx.log('load: ' + r);
    assert(r.includes('(x, y, u)') && r.includes('v as colour'), 'load readout');
    await setSlider(page, 'graph4d-uv', PI / 2);
    r = await readText(page, R); ctx.log('uv=90: ' + r);
    assert((r.includes('(x, y, v)') || r.includes('(x, y, -v)')) && r.includes('u as colour'), 'uv 90');
    await clickChip(page, 'graph4d-fn-sq');
    const a = await page.evaluate(() => window.__mv.graph4d.vertexCount);
    await clickChip(page, 'graph4d-fn-cbrt-all');
    const b = await page.evaluate(() => window.__mv.graph4d.vertexCount);
    ctx.log(`sq ${a} cbrt-all ${b} ratio ${(b / a).toFixed(2)}`);
    assert(b >= 3 * a, 'count >= 3x');
    await page.click('#graph4d-landscape');
    r = await readText(page, R); ctx.log('landscape: ' + r);
    assert(r.includes('|w|'), 'landscape |w|');
  }
}
