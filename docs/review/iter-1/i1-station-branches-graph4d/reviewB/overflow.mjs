import { dragHandle, clickChip, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.label !== 'phone') return;
  const check = async (tag) => {
    await settle(page, 4); await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      for (const el of document.querySelectorAll('#view *')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if (b.right > vw + 1 || b.left < -1) {
          // is it inside a scroll container?
          let p = el.parentElement, scrolled = false;
          while (p && p.id !== 'view') { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { scrolled = true; break; } p = p.parentElement; }
          if (!scrolled) bad.push(el.tagName + '#' + el.id + '.' + el.className + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
        }
      }
      return { over: document.documentElement.scrollWidth - vw, bad: bad.slice(0, 8) };
    });
    ctx.log(tag + ' ' + JSON.stringify(r));
    ctx.assert(r.over <= 1, 'page overflow ' + r.over);
  };
  if (ctx.route === 'branches') {
    await page.waitForSelector('#branches-readout');
    await check('default');
    await clickChip(page, 'branches-walk-across'); await page.waitForFunction(() => /jumps/.test(document.querySelector('#branches-walk-status').textContent), null, { timeout: 4000 }); await check('jump');
    await clickChip(page, 'branches-seam-positive'); await check('seam0');
    await setSlider(page, 'branches-n', 5); await check('n5');
    await setSlider(page, 'branches-n', 2); await check('n2');
    await dragHandle(page, 'branches-zplane-z', { re: -1, im: 0 }); await check('z-1');
    await dragHandle(page, 'branches-zplane-z', { re: 0, im: 0 }); await check('z0');
    await clickChip(page, 'branches-answer-toggle'); await check('answer');
  } else if (ctx.route === 'graph4d') {
    await page.waitForFunction(() => !!window.__mv && !!window.__mv.graph4d);
    await check('default');
    await clickChip(page, 'graph4d-fn-cbrt-all'); await check('cbrt');
    await clickChip(page, 'graph4d-landscape'); await check('land');
    await clickChip(page, 'graph4d-sphere'); await check('sphere');
    await clickChip(page, 'graph4d-fn-recip'); await check('recip');
    await clickChip(page, 'graph4d-fn-exp'); await check('exp');
  } else if (ctx.route === 'problem-2-4-1') {
    await page.waitForSelector('#branches-readout'); await check('2.4.1');
    await clickChip(page, 'branches-answer-toggle'); await check('2.4.1 answer');
  }
}
