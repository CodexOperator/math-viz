export default async function (page, ctx) {
  const { assert, log } = ctx;
  const t = await page.$('#nav-toggle');
  if (t && await t.isVisible() && await t.getAttribute('aria-expanded') !== 'true') await t.click();
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const nav = document.getElementById('site-nav');
    const items = [...nav.querySelectorAll('li, a')].length;
    const vw = document.documentElement.clientWidth;
    const bad = [...nav.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > vw + 1).map((e) => e.tagName + ':' + (e.textContent || '').slice(0, 30));
    return { open: !nav.hidden, items, vw, sw: document.documentElement.scrollWidth, bad, notes: [...nav.querySelectorAll('.nav-part-note, [class*=note]')].map((e) => e.textContent) , text: nav.innerText.slice(-400) };
  });
  log(JSON.stringify(info));
  assert(info.sw <= info.vw && info.bad.length === 0, JSON.stringify(info));
  await page.screenshot({ path: `docs/review/iter-2/i2-decisions-kit/reviewB/menu/menu-${ctx.label}.png`, fullPage: false });
}
