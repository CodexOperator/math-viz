import { launch } from './lib.mjs';
const out = '/home/user/math-viz/docs/review/iter-2/i2-walk-shell/reviewB/crops';
const L = await launch();
for (const cfg of [{ n: 'desktop', w: 1280, h: 860, s: 'light' }, { n: 'desktop-dark', w: 1280, h: 860, s: 'dark' }, { n: 'phone', w: 390, h: 844, s: 'light' }, { n: 'phone-dark', w: 390, h: 844, s: 'dark' }]) {
  const ctx = await L.browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, colorScheme: cfg.s, deviceScaleFactor: 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(L.base + '#home'); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready');
  await page.click('#walk-start'); await page.waitForTimeout(600);
  await page.evaluate(() => window.__mv.walk.goTo(6)); await page.waitForTimeout(1200);
  const r = await page.evaluate(() => { const b = document.getElementById('walk-bar').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await page.screenshot({ path: `${out}/bar-roots--${cfg.n}.png`, clip: { x: r.x, y: r.y - 6, width: r.w, height: r.h + 6 } });
  // Listen
  if (cfg.n === 'desktop') {
    const lb = await page.$('#walk-listen-btn');
    const info = await page.evaluate(() => { const b = document.getElementById('walk-listen-btn'); const cs = getComputedStyle(b); const r = b.getBoundingClientRect(); return { text: b.textContent, border: cs.borderTopWidth + ' ' + cs.borderTopColor, bg: cs.backgroundColor, h: r.height, w: r.width, aria: b.getAttribute('aria-pressed') }; });
    console.log('listen button', JSON.stringify(info));
    await lb.click(); await page.waitForTimeout(800);
    console.log('after click', await page.evaluate(() => ({ pressed: document.getElementById('walk-listen-btn').getAttribute('aria-pressed'), audio: (() => { const a = document.getElementById('walk-listen-btn-audio'); return a ? { src: a.currentSrc || a.getAttribute('src'), paused: a.paused, err: a.error && a.error.code } : null; })(), status: document.getElementById('walk-status').textContent })));
    // go to the next stop while playing: should stop audio
    await page.click('#walk-next'); await page.waitForTimeout(800);
    console.log('after next', await page.evaluate(() => ({ btn: document.getElementById('walk-listen-btn') && document.getElementById('walk-listen-btn').getAttribute('aria-pressed'), audios: [...document.querySelectorAll('audio')].map((a) => ({ id: a.id, paused: a.paused })) })));
  }
  console.log(cfg.n, 'errors', errors.length, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await L.close();
