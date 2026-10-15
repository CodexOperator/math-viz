import { settle, clickChip, setSlider } from '/home/user/math-viz/tests/interact/_helpers.mjs';
async function overflow(page, tag, log, assert) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const e of document.querySelectorAll('#view *')) {
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.right > vw + 1 || b.left < -1) {
        // ignore if inside an element that scrolls
        let p = e.parentElement, scrolls = false;
        while (p && p.id !== 'view') { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth) { scrolls = true; break; } p = p.parentElement; }
        if (!scrolls) out.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${(e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 30)} right=${Math.round(b.right)}`);
      }
    }
    return { sw: document.documentElement.scrollWidth - vw, out: out.slice(0, 6) };
  });
  log(`${tag}: pageOverflow=${r.sw} offenders=${JSON.stringify(r.out)}`);
  assert(r.sw <= 1, `${tag}: horizontal page overflow ${r.sw}`);
}
export default async function (page, ctx) {
  const { route, log, assert, shot } = ctx;
  const phone = ctx.viewport.width < 600;
  await overflow(page, 'load', log, assert);
  if (route === 'roots') {
    const api = (f, ...a) => page.evaluate(([f, a]) => window.__mv.roots[f](...a), [f, a]);
    await api('setC', 0.3, -0.7); await api('setN', 12); await settle(page, 6); await overflow(page, 'n12 decimal', log, assert); await shot('n12-decimal');
    await api('setC', 0.001, 0); await api('setN', 3); await settle(page, 6); await overflow(page, 'tiny', log, assert);
    await api('setC', -1, 1); await api('setN', 7); await api('select', 5); await settle(page, 6); await overflow(page, 'c=-1+i n7 k5', log, assert); await shot('m1i-n7');
    await api('setC', 0, 0); await settle(page, 6); await overflow(page, 'c=0', log, assert);
    await api('setC', 100, 0); await api('setN', 11); await settle(page, 6); await overflow(page, 'c=100 n=11', log, assert); await shot('c100-n11');
  } else if (route === 'principal-root') {
    const api = (f, ...a) => page.evaluate(([f, a]) => window.__mv.principalRoot[f](...a), [f, a]);
    await api('setW', 40, 0); await api('setN', 6); await settle(page, 6); await overflow(page, 'far w n6', log, assert); await shot('far-n6');
    await clickChip(page, 'principal-root-zoom'); await settle(page, 6); await overflow(page, 'zoom roots', log, assert); await shot('far-n6-zoomed');
    await api('setW', -1, 0); await api('setN', 3); await settle(page, 6); await overflow(page, 'trap', log, assert);
    await api('setW', 0, 0); await settle(page, 6); await overflow(page, 'w=0', log, assert);
  } else if (route === 'problem-1-4-3') {
    await page.fill('#roots-qa', '0.5'); await page.fill('#roots-qb', '-3.7'); await page.fill('#roots-qc', '12.25'); await settle(page, 6);
    log('quad: ' + await page.evaluate(() => document.querySelector('#roots-quadratic-readout').textContent));
    await overflow(page, 'quad decimals', log, assert); await shot('quad-decimals');
  }
}
