import { launch } from './lib.mjs';
const L = await launch();
for (const w of [320, 360, 600, 899, 900, 1024, 1440]) {
  const ctx = await L.browser.newContext({ viewport: { width: w, height: w < 600 ? 700 : 800 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(L.base + '#home'); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready', null, { timeout: 120000 });
  const off = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, pill: (() => { const r = document.getElementById('walk-start').getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; })() }));
  await page.click('#walk-start');
  await page.evaluate(() => window.__mv.walk.goTo(15)); // limits: long title
  await page.waitForFunction(() => document.querySelector('#view')?.dataset.route === 'problem-2-3-1' && document.querySelector('#view').dataset.state === 'ready', null, { timeout: 120000 });
  await page.waitForTimeout(500);
  const on = await page.evaluate(() => {
    const bar = document.getElementById('walk-bar'); const r = bar.getBoundingClientRect(); const lab = document.getElementById('walk-stop-label');
    const nav = document.getElementById('site-nav').getBoundingClientRect();
    const overflowX = [...bar.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && e.offsetParent !== null).map((e) => e.id || e.className).slice(0, 4);
    return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, barL: Math.round(r.left), barR: Math.round(r.right), barH: Math.round(r.height), vh: window.innerHeight, labelClipped: lab.scrollHeight > lab.clientHeight + 1, navR: Math.round(nav.right), navVisible: nav.right > 0 && getComputedStyle(document.getElementById('site-nav')).visibility !== 'hidden', overflowX };
  });
  console.log(w, JSON.stringify({ off, on }), 'errors', errors.length);
  await page.screenshot({ path: `/home/user/math-viz/docs/review/iter-2/i2-walk-shell/reviewB/crops/w${w}-limits.png` });
  await ctx.close();
}
await L.close();
