import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { log, shot } = ctx;
  await page.evaluate(() => { location.hash = '#lab'; });
  await page.waitForTimeout(900);
  const srcs = ['z^', '((((', 'sqrt(', 'zzz', '<img src=x onerror=alert(1)>', 'z^2'.repeat(60), 'z +'.repeat(30), 'abcdefghijklmnopqrstuvwxyz'.repeat(5)];
  for (const src of srcs) {
    await page.fill('#lab-fn-src', src);
    await page.click('#lab-fn-apply');
    await settle(page, 3);
    const r = await page.evaluate(() => {
      const ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const vw = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('#view *')].filter((e) => e.getBoundingClientRect().right > vw + 1 && e.offsetParent !== null).slice(0, 4).map((e) => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().right));
      return { ov, vw, wide, err: document.getElementById('lab-fn-error').textContent.length, echo: document.getElementById('lab-fn-echo').textContent.length };
    });
    log(JSON.stringify(src.slice(0, 18)) + ' ' + JSON.stringify(r));
  }
  await shot('long-src');
}
