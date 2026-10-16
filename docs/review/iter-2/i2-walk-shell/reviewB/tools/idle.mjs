import { launch } from './lib.mjs';
const L = await launch();
const ctx = await L.browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
const errors = []; page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
await page.goto(L.base + '#home'); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready');
await page.click('#walk-start');
for (let k = 0; k < 22; k++) {
  await page.evaluate((k) => window.__mv.walk.goTo(k), k);
  await page.waitForTimeout(1500);
}
const st = await page.evaluate(() => window.__mv.walk.state());
console.log('idle visit of all 22 stops -> ticked:', JSON.stringify(st.done), 'errors', errors.length, errors.slice(0, 3));
// then keyboard tick on home: arrow keys on the handle for four quadrants
await page.evaluate(() => window.__mv.walk.goTo(0)); await page.waitForTimeout(600);
await ctx.close(); await L.close();
