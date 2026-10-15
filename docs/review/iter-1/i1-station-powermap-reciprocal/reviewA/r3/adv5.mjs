import { dragHandle, clickChip, setSlider, settle, handleZ } from '/home/user/math-viz/tests/interact/_helpers.mjs';
const out = [];
const check = (ctx, name, cond, detail = '') => { out.push(cond); ctx.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${detail}`); };
const txt = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? e.textContent.trim() : null; }, id);
const attr = (page, id, a) => page.evaluate(([i, a]) => { const e = document.getElementById(i); return e ? e.getAttribute(a) : null; }, [id, a]);
const hid = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? e.hidden : null; }, id);
const hash = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(700); };

export default async function (page, ctx) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await settle(page, 4);
  if (ctx.route === 'problem-2-1-2') {
    check(ctx, 'w handle aria-label', /^Image w: w = 3 \+ 4i; \|w\| = 5$/.test(await attr(page, 'powermap-wplane-q', 'aria-label')), await attr(page, 'powermap-wplane-q', 'aria-label'));
    ctx.log('z probe label: ' + await attr(page, 'powermap-zplane-p', 'aria-label'));
    // keyboard on the line handle
    await page.focus('#powermap-zplane-line');
    await page.keyboard.press('ArrowRight');
    await settle(page, 3);
    let r = await txt(page, 'powermap-readout');
    check(ctx, 'ArrowRight moves c by 0.1', r.startsWith('x = 2.1'), r);
    await page.keyboard.press('Shift+ArrowLeft');
    await settle(page, 3);
    r = await txt(page, 'powermap-readout');
    check(ctx, 'Shift+ArrowLeft moves c by 1', r.startsWith('x = 1.1'), r);
    // probe keyboard
    await page.focus('#powermap-zplane-p');
    await page.keyboard.press('ArrowUp');
    await settle(page, 3);
    ctx.log('t-out after probe ArrowUp: ' + await txt(page, 'powermap-t-out'));
    // slider keys
    await page.focus('#powermap-n');
    await page.keyboard.press('End');
    await settle(page, 3);
    check(ctx, 'End on n slider gives 6', (await txt(page, 'powermap-n-out')) === '6', await txt(page, 'powermap-n-out'));
    await page.keyboard.press('Home');
    await settle(page, 3);
    check(ctx, 'n valuetext', (await attr(page, 'powermap-n', 'aria-valuetext')) === 'n = 2', await attr(page, 'powermap-n', 'aria-valuetext'));
    // sector keyboard
    await clickChip(page, 'powermap-input-sector');
    await page.focus('#powermap-zplane-s1');
    await page.keyboard.press('ArrowUp');
    await settle(page, 3);
    r = await txt(page, 'powermap-readout');
    ctx.log('sector after s1 ArrowUp: ' + r);
    await setSlider(page, 'powermap-n', 6);
    r = await txt(page, 'powermap-fact');
    ctx.log('fact n=6 sector: ' + r);
    await setSlider(page, 'powermap-t', 0);
    ctx.log('q label at z=0: ' + await attr(page, 'powermap-wplane-q', 'aria-label'));
    // lab hand-off with n=4 sector
    await setSlider(page, 'powermap-n', 4);
    await setSlider(page, 'powermap-t', 0.5);
    await clickChip(page, 'powermap-open-lab');
    await page.waitForTimeout(900);
    ctx.log('after lab click hash ' + await page.evaluate(() => location.hash));
    const labTxt = await page.evaluate(() => (document.querySelector('#view') || document.body).innerText.slice(0, 400));
    ctx.log('lab text: ' + labTxt.replace(/\n+/g, ' | ').slice(0, 300));
    ctx.log('planes in lab: ' + (await page.evaluate(() => [...window.__mv.planes.keys()])).join(','));
    await hash(page, '#problem-2-1-2');
    await clickChip(page, 'powermap-open-lab');
    await page.waitForTimeout(900);
    ctx.log('lab2 planes: ' + (await page.evaluate(() => [...window.__mv.planes.keys()])).join(','));
  } else if (ctx.route === 'problem-2-5-1') {
    check(ctx, 'q aria-label', /^Image 1\/p: 1\/p = 0\.5 - 0\.5i; \|1\/p\| = 0\.707$/.test(await attr(page, 'reciprocal-wplane-q', 'aria-label')), await attr(page, 'reciprocal-wplane-q', 'aria-label'));
    check(ctx, 'gap hidden for circle1', (await hid(page, 'reciprocal-gap')) === true);
    await clickChip(page, 'reciprocal-preset-line');
    check(ctx, 'gap visible for line', (await hid(page, 'reciprocal-gap')) === false, await txt(page, 'reciprocal-gap'));
    await clickChip(page, 'reciprocal-stage-invert');
    check(ctx, 'gap visible for line (invert stage)', (await hid(page, 'reciprocal-gap')) === false);
    ctx.log('line in invert stage readout: ' + await txt(page, 'reciprocal-readout'));
    await ctx.shot('line-invert');
    await clickChip(page, 'reciprocal-stage-both');
    await ctx.shot('line-both');
    await clickChip(page, 'reciprocal-preset-circle0');
    check(ctx, 'gap hidden for circle0', (await hid(page, 'reciprocal-gap')) === true);
    await clickChip(page, 'reciprocal-preset-line');
    await dragHandle(page, 'reciprocal-zplane-a', { re: 0, im: -1.5 });
    await dragHandle(page, 'reciprocal-zplane-b', { re: 0, im: 1.5 });
    ctx.log('line through 0: ' + await txt(page, 'reciprocal-readout') + ' gap hidden=' + await hid(page, 'reciprocal-gap'));
    await clickChip(page, 'reciprocal-preset-circle1');
    await page.focus('#reciprocal-zplane-p');
    await page.keyboard.press('ArrowRight');
    await settle(page, 3);
    ctx.log('after probe ArrowRight: ' + await txt(page, 'reciprocal-readout'));
    await clickChip(page, 'reciprocal-open-lab');
    await page.waitForTimeout(900);
    ctx.log('after lab click hash ' + await page.evaluate(() => location.hash));
    ctx.log('lab planes: ' + (await page.evaluate(() => [...window.__mv.planes.keys()])).join(','));
    await hash(page, '#problem-2-5-1');
    await clickChip(page, 'reciprocal-play');
    await page.waitForTimeout(300);
    await clickChip(page, 'reciprocal-stage-mirror');
    ctx.log('play btn after stage click: ' + await txt(page, 'reciprocal-play'));
    await setSlider(page, 'reciprocal-morph', 0.5);
    await clickChip(page, 'reciprocal-preset-unit');
    ctx.log('unit mirror morph .5 readout: ' + await txt(page, 'reciprocal-readout'));
    await page.evaluate(() => { const p = window.__mv.planes.get('reciprocal-wplane'); p.setView({ center: { re: 0, im: 0 }, unitsAcross: 400 }); });
    await settle(page, 6);
    ctx.log('stage mirror morph .5 pieces after zoom-out: ' + (await page.evaluate(() => window.__mv.reciprocalMorph.pieces.length)));
    await page.evaluate(() => { const p = window.__mv.planes.get('reciprocal-wplane'); p.setView({ center: { re: 0, im: 0 }, unitsAcross: 0.5 }); });
    await settle(page, 6);
    ctx.log('zoom-in view ok, wnote hidden=' + await hid(page, 'reciprocal-wnote'));
  }
  ctx.log('CONSOLE ' + JSON.stringify(errs));
  ctx.log('SUMMARY ' + out.filter((x) => !x).length + ' fails of ' + out.length);
}
