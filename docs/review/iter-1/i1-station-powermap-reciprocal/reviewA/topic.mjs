import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  await settle(page, 4);
  for (const h of ['#topic-T2-2', '#topic-T2-1', '#topic-T2-5', '#powermap-sector', '#reciprocal-line', '#reciprocal-mirror', '#powermap-bogus']) {
    await page.evaluate((x) => { location.hash = x; }, h);
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({ pm: document.getElementById('powermap-readout') && document.getElementById('powermap-readout').textContent.slice(0, 50), rc: document.getElementById('reciprocal-readout') && document.getElementById('reciprocal-readout').textContent.slice(0, 60), panel: (document.querySelector('.under-construction, [data-router-error]') || {}).textContent }));
    ctx.log(h + ' -> ' + JSON.stringify(r));
  }
}
