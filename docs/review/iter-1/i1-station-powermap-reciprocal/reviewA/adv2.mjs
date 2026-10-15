// Reviewer A adversarial script 2: keyboard, presets screenshots, phone wnote etc.
import { dragHandle, clickChip, readText, setSlider, settle, handleZ } from '/home/user/math-viz/tests/interact/_helpers.mjs';

const txt = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? e.textContent.trim() : null; }, id);
const check = (ctx, name, cond, detail = '') => ctx.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${detail}`);
const hash = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(700); };

export default async function (page, ctx) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  if (ctx.route === 'problem-2-1-2') {
    await settle(page, 4);
    // keyboard on the line handle
    await page.focus('[id="powermap-zplane-line"]');
    await page.keyboard.press('ArrowLeft');
    await settle(page, 3);
    let r = await txt(page, 'powermap-readout');
    check(ctx, 'ArrowLeft c=1.9', /^x = 1\.9; image: u = 3\.61 - v²\/14\.44/.test(r), r);
    await page.keyboard.press('Shift+ArrowLeft');
    await settle(page, 3);
    r = await txt(page, 'powermap-readout');
    ctx.log('after Shift+Left: ' + r);
    await hash(page, '#problem-2-1-2');
    // sector keyboard
    await clickChip(page, 'powermap-input-sector');
    await page.focus('[id="powermap-zplane-s1"]');
    const before = await handleZ(page, 'powermap-zplane-s1');
    await page.keyboard.press('ArrowUp');
    await settle(page, 3);
    r = await txt(page, 'powermap-readout');
    ctx.log('sector after ArrowUp on s1 (from ' + JSON.stringify(before) + '): ' + r);
    await page.keyboard.press('ArrowLeft');
    await settle(page, 3);
    r = await txt(page, 'powermap-readout');
    ctx.log('sector after ArrowLeft on s1: ' + r);
    // probe keyboard on sector
    await page.focus('[id="powermap-zplane-p"]');
    await page.keyboard.press('ArrowUp');
    await settle(page, 3);
    r = await txt(page, 'powermap-t-out');
    ctx.log('probe after ArrowUp: ' + r);
    // wnote at huge n and zoom out: zoom w plane far in
    await page.evaluate(() => { const p = window.__mv.planes.get('powermap-wplane'); p.setView({ center: { re: 1000, im: 1000 }, unitsAcross: 4 }); });
    await settle(page, 5);
    const wn = await page.evaluate(() => { const e = document.getElementById('powermap-wnote'); return e && !e.hidden; });
    check(ctx, 'wnote visible when view elsewhere', wn === true, String(wn));
    const clampOK = await page.evaluate(() => Array.isArray(window.__mv.powermapImage) && window.__mv.powermapImage.length);
    ctx.log('image still has points ' + clampOK);
    await shot(page, ctx, 'wnote');
    // large unitsAcross zoom out
    await page.evaluate(() => { const p = window.__mv.planes.get('powermap-wplane'); p.setView({ center: { re: 0, im: 0 }, unitsAcross: 4000 }); });
    await settle(page, 5);
    const len2 = await page.evaluate(() => window.__mv.powermapImage.length);
    ctx.log('image points after zoom to 4000: ' + len2);
    await shot(page, ctx, 'zoomed-out');
    await clickChip(page, 'powermap-reset');
    await page.waitForTimeout(600);
  } else if (ctx.route === 'problem-2-5-1') {
    await settle(page, 4);
    for (const key of ['line', 'circle0', 'unit']) {
      await clickChip(page, `reciprocal-preset-${key}`);
      await shot(page, ctx, `preset-${key}`);
      const r = await txt(page, 'reciprocal-readout');
      ctx.log(key + ': ' + r);
    }
    // keyboard on p
    await clickChip(page, 'reciprocal-preset-circle1');
    await page.focus('[id="reciprocal-zplane-p"]');
    await page.keyboard.press('ArrowLeft');
    await settle(page, 3);
    let r = await txt(page, 'reciprocal-readout');
    ctx.log('p after ArrowLeft: ' + r);
    // zoom out w plane
    await page.evaluate(() => { const p = window.__mv.planes.get('reciprocal-wplane'); p.setView({ center: { re: 0, im: 0 }, unitsAcross: 300 }); });
    await settle(page, 5);
    const ln = await page.evaluate(() => window.__mv.reciprocalImage.length);
    ctx.log('reciprocalImage after wide zoom: ' + ln);
    await shot(page, ctx, 'wide');
    await page.evaluate(() => { const p = window.__mv.planes.get('reciprocal-wplane'); p.setView({ center: { re: 100, im: 100 }, unitsAcross: 3 }); });
    await settle(page, 5);
    const wn = await page.evaluate(() => { const e = document.getElementById('reciprocal-wnote'); return e && !e.hidden; });
    check(ctx, 'wnote visible', wn === true, String(wn));
    // URL tokens
    for (const tok of ['mirror', 'invert']) { /* not routes */ }
  }
  ctx.log('ERRORS: ' + JSON.stringify(errs));
}
const shot = async (page, ctx, n) => { try { await ctx.shot(n); } catch (e) { ctx.log('shot fail ' + e.message); } };
