// Review B throwaway: A2 and A4 executed as written in the goal.
import { clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';

const T = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
const has = (ctx, text, ...parts) => { for (const p of parts) ctx.assert(String(text).includes(p), `expected "${p}" in "${text}"`); };

export default async function (page, ctx) {
  if (ctx.route === 'problem-1-5-1') {
    await page.waitForSelector('#curves-readout');
    await settle(page, 4);
    let r = await T(page, '#curves-readout');
    ctx.log('t=0 readout: ' + r);
    ctx.assert(r.includes('2 + i') || r.includes('2 + 1i'), 'A2 t=0: "2 + i" in ' + r);
    await setSlider(page, 'curves-t', 0.5); await settle(page, 4);
    r = await T(page, '#curves-readout');
    ctx.log('t=.5 readout: ' + r);
    ctx.assert(r.includes('-0.5 - i') || r.includes('-0.5 - 1i'), 'A2 t=.5 z: ' + r);
    has(ctx, r, 'x(t) = -0.5', 'y(t) = -1');
    // explainer cart cell
    const cartCell = await page.evaluate(() => { const e = document.getElementById('curves-ex-z-cart'); return e ? { text: e.textContent, tex: e.dataset.tex || '' } : null; });
    ctx.log('curves-ex-z-cart: ' + JSON.stringify(cartCell));
    ctx.assert(cartCell, 'curves-ex-z-cart exists');
    has(ctx, cartCell.text, '2', '5', 't');
    // reverse
    await clickChip(page, 'curves-reverse');
    await setSlider(page, 'curves-t', 0); await settle(page, 4);
    r = await T(page, '#curves-readout');
    ctx.log('reversed t=0 readout: ' + r);
    ctx.assert(r.includes('-3 - 3i'), 'A2 reversed t=0: ' + r);
    await clickChip(page, 'curves-reverse');          // back
    await setSlider(page, 'curves-t', 0); await settle(page, 4);
    r = await T(page, '#curves-readout');
    ctx.assert(r.includes('2 + i'), 'back to forward ' + r);
    // eight
    await clickChip(page, 'curves-preset-eight'); await settle(page, 4);
    let s = await T(page, '#curves-simple'), c = await T(page, '#curves-closed');
    ctx.log('eight: ' + s + ' | ' + c);
    has(ctx, s, 'no'); has(ctx, c, 'yes');
    ctx.assert((await page.getAttribute('#curves-simple', 'data-answer')) === 'no', 'eight simple data-answer');
    ctx.assert((await page.getAttribute('#curves-closed', 'data-answer')) === 'yes', 'eight closed data-answer');
    // square
    await clickChip(page, 'curves-preset-square'); await settle(page, 4);
    const sm = await T(page, '#curves-smooth'), pw = await T(page, '#curves-piecewise'), pos = await T(page, '#curves-positive');
    ctx.log('square: ' + [sm, pw, pos].join(' | '));
    has(ctx, sm, 'no'); has(ctx, pw, 'yes'); has(ctx, pos, 'yes');
    await clickChip(page, 'curves-orient'); await settle(page, 4);
    const pos2 = await T(page, '#curves-positive');
    ctx.log('square after orient: ' + pos2);
    has(ctx, pos2, 'no');
    ctx.assert((await page.getAttribute('#curves-positive', 'data-answer')) === 'no', 'positive data-answer no after flip');
    // the console must stay clean (smoke reports)
  } else if (ctx.route === 'problem-2-1-3') {
    await settle(page, 4);
    let r = await T(page, '#linear-readout');
    ctx.log('2.1.3 readout: ' + r);
    has(ctx, r, 'a = i', 'b = -2i', 'spin 90', 'stretch 1');
    const img = () => page.evaluate(() => window.__mv.linearImage.map((p) => ({ re: p.re, im: p.im, t: p.t })));
    let pts = await img();
    ctx.log(`stage3: n=${pts.length} maxIm=${Math.max(...pts.map(p => Math.abs(p.im)))} reMin=${Math.min(...pts.map(p=>p.re))} reMax=${Math.max(...pts.map(p=>p.re))}`);
    ctx.assert(pts.length > 10, 'image points exist');
    ctx.assert(pts.every((p) => Math.abs(p.im) < 1e-6), 'stage3 all |im|<1e-6');
    ctx.assert(Math.min(...pts.map((p) => p.re)) < -2 && Math.max(...pts.map((p) => p.re)) > 2, 're spans -2..2');
    await setSlider(page, 'linear-stage', 1); await settle(page, 4);
    pts = await img();
    ctx.log(`stage1: im range ${Math.min(...pts.map(p=>p.im))}..${Math.max(...pts.map(p=>p.im))}`);
    ctx.assert(pts.every((p) => Math.abs(p.im - 2) < 1e-6), 'stage1 all im ~ 2');
    await setSlider(page, 'linear-stage', 3); await settle(page, 4);
    pts = await img();
    ctx.assert(pts.every((p) => Math.abs(p.im) < 1e-6), 'stage3 again im ~ 0');
    // P4
    await page.evaluate(() => { location.hash = '#problem-P4'; });
    await page.waitForTimeout(600); await settle(page, 4);
    r = await T(page, '#linear-readout');
    ctx.log('P4 readout: ' + r);
    has(ctx, r, 'stretch 1.414', 'spin 45');
    pts = await img();
    const dev = Math.max(...pts.map((p) => Math.abs(Math.hypot(p.re, p.im) - 1.414)));
    ctx.log(`P4 n=${pts.length} max | |w| - 1.414 | = ${dev}`);
    ctx.assert(pts.length > 10 && dev < 1e-3, 'P4 radius ~1.414: ' + dev);
    // P3 composition: a = i, b = -2i is the preset
    await page.evaluate(() => { location.hash = '#problem-P3'; });
    await page.waitForTimeout(600); await settle(page, 4);
    const st = await page.evaluate(() => window.__mv.linear.state());
    ctx.log('P3 state: ' + JSON.stringify(st));
    await page.fill('#linear-compose-c', '2');
    await page.fill('#linear-compose-d', '5');
    await settle(page, 4);
    ctx.log('scratch compose: ' + await T(page, '#linear-compose-readout'));
    await page.fill('#linear-compose-c', '1+i');
    await page.fill('#linear-compose-d', '1');
    await settle(page, 4);
    r = await T(page, '#linear-compose-readout');
    ctx.log('compose readout: ' + r);
    has(ctx, r, 'ac = -1 + i', 'ad + b = -i');
  }
}
