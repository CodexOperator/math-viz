import { launch } from './lib.mjs';
import { dragHandle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
const L = await launch();
const ctx = await L.browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
await page.goto(L.base + '#problem-1-2-1'); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready', null, { timeout: 90000 });
await page.evaluate(() => { localStorage.clear(); });
await page.reload(); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready', null, { timeout: 90000 });
await page.click('#walk-start'); // opens home, then jump to distance stop via its alt route
await page.evaluate(() => { location.hash = '#problem-1-2-1'; });
await page.waitForFunction(() => document.querySelector('#view')?.dataset.route === 'problem-1-2-1' && document.querySelector('#view').dataset.state === 'ready');
const vis = await page.evaluate(() => ['distance-plane-a', 'distance-plane-R'].map((id) => { const e = document.getElementById(id); return [id, !!e && !e.hidden && e.offsetParent !== null]; }));
console.log('handles visible at #problem-1-2-1:', JSON.stringify(vis));
await dragHandle(page, 'distance-plane-a', { re: 1.5, im: 2 });
await page.waitForTimeout(700);
console.log('distance ticked via the alternate route:', await page.evaluate(() => window.__mv.walk.state().done.includes('distance')));
await ctx.close(); await L.close();
