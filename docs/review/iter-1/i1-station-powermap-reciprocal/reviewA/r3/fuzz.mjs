import { dragHandle, clickChip, setSlider, settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const R = (a, b) => a + (b - a) * rnd();

export default async function (page, ctx) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await settle(page, 4);
  const pm = ctx.route === 'problem-2-1-2';
  const steps = 70;
  let fails = 0;
  for (let i = 0; i < steps; i++) {
    const a = Math.floor(rnd() * 9);
    try {
      if (pm) {
        if (a === 0) await clickChip(page, pick(['powermap-input-line', 'powermap-input-sector']));
        else if (a === 1) await setSlider(page, 'powermap-n', 2 + Math.floor(rnd() * 5));
        else if (a === 2) await clickChip(page, pick(['powermap-grid-cart', 'powermap-grid-polar', 'powermap-grid-none']));
        else if (a === 3) await setSlider(page, 'powermap-t', Math.round(rnd() * 200) / 200);
        else if (a === 4) await setSlider(page, 'powermap-morph', Math.round(rnd() * 100) / 100);
        else if (a === 5) {
          const sector = await page.evaluate(() => document.getElementById('powermap-input-sector').getAttribute('aria-pressed') === 'true');
          if (sector) await dragHandle(page, pick(['powermap-zplane-s0', 'powermap-zplane-s1']), { re: R(-3, 3), im: R(-3, 3) });
          else await dragHandle(page, 'powermap-zplane-line', { re: R(-3, 3), im: 0 });
        } else if (a === 6) {
          await page.evaluate(() => { const p = window.__mv.planes.get('powermap-wplane'); const v = p.getView(); p.setView({ center: { re: v.center.re + (Math.random() - 0.5) * v.unitsAcross, im: v.center.im + (Math.random() - 0.5) * v.unitsAcross }, unitsAcross: v.unitsAcross * (0.5 + Math.random() * 1.5) }); });
        } else if (a === 7) await clickChip(page, 'powermap-play');
        else await dragHandle(page, 'powermap-zplane-p', { re: R(-3, 3), im: R(-3, 3) });
      } else {
        if (a === 0) await clickChip(page, pick(['reciprocal-preset-circle1', 'reciprocal-preset-line', 'reciprocal-preset-circle0', 'reciprocal-preset-unit']));
        else if (a === 1) await clickChip(page, pick(['reciprocal-stage-invert', 'reciprocal-stage-mirror', 'reciprocal-stage-both']));
        else if (a === 2) await setSlider(page, 'reciprocal-morph', Math.round(rnd() * 100) / 100);
        else if (a === 3) await setSlider(page, 'reciprocal-sphere-turn', Math.round(rnd() * 100) / 100);
        else if (a === 4) {
          const circle = await page.evaluate(() => !document.getElementById('reciprocal-zplane-c').hidden);
          if (circle) await dragHandle(page, pick(['reciprocal-zplane-c', 'reciprocal-zplane-r']), { re: R(-2.8, 2.8), im: R(-2.8, 2.8) });
          else await dragHandle(page, pick(['reciprocal-zplane-a', 'reciprocal-zplane-b']), { re: R(-2.8, 2.8), im: R(-2.8, 2.8) });
        } else if (a === 5) {
          await page.evaluate(() => { const p = window.__mv.planes.get('reciprocal-wplane'); const v = p.getView(); p.setView({ center: { re: v.center.re + (Math.random() - 0.5) * v.unitsAcross, im: v.center.im + (Math.random() - 0.5) * v.unitsAcross }, unitsAcross: Math.max(0.2, v.unitsAcross * (0.4 + Math.random() * 2)) }); });
        } else if (a === 6) await clickChip(page, pick(['reciprocal-play', 'reciprocal-sphere-play']));
        else await dragHandle(page, 'reciprocal-zplane-p', { re: R(-2.8, 2.8), im: R(-2.8, 2.8) });
      }
    } catch (e) {
      ctx.log('step ' + i + ' action ' + a + ' threw ' + String(e.message).slice(0, 160));
      fails++;
    }
    await settle(page, 2);
    const bad = await page.evaluate((pm) => {
      const err = document.getElementById(pm ? 'powermap-error' : 'reciprocal-error');
      const ro = document.getElementById(pm ? 'powermap-readout' : 'reciprocal-readout').textContent;
      return { err: err && !err.hidden, nan: /NaN|undefined|Infinity/.test(ro), ro };
    }, pm);
    if (bad.err || bad.nan) { ctx.log('STEP ' + i + ' BAD ' + JSON.stringify(bad)); fails++; }
  }
  ctx.log('CONSOLE ' + JSON.stringify(errs.slice(0, 5)));
  ctx.log('FUZZ fails ' + fails + ' of ' + steps);
  await ctx.shot('after-fuzz');
}
