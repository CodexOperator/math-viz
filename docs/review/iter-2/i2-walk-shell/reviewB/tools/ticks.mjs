import { launch } from './lib.mjs';
import { dragHandle, setSlider } from '/home/user/math-viz/tests/interact/_helpers.mjs';
const L = await launch();
const ctx = await L.browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
const errors = []; page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
await page.goto(L.base + '#home'); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready');
await page.click('#walk-start');
const ready = (r) => page.waitForFunction((r) => { const v = document.querySelector('#view'); return v && v.dataset.route === r && v.dataset.state === 'ready'; }, r, { timeout: 10000 });
const isDone = (id) => page.evaluate((id) => window.__mv.walk.state().done.includes(id), id);
const res = [];
async function stop(k, id, route, fn) {
  await page.evaluate((k) => window.__mv.walk.goTo(k), k); await ready(route); await page.waitForTimeout(500);
  const before = await isDone(id);
  let err = null; try { await fn(); } catch (e) { err = e.message.split('\n')[0]; }
  await page.waitForTimeout(900);
  const after = await isDone(id);
  res.push({ k: k + 1, id, before, after, err });
  console.log(k + 1, id, 'before', before, 'after', after, err || '');
}
await stop(7, 'curves', 'problem-1-5-1', () => setSlider(page, 'curves-t', 0.5));
await stop(9, 'mappings', 'mappings', () => page.click('#mappings-play'));
await stop(10, 'linear', 'problem-2-1-3', () => setSlider(page, 'linear-stage', 1));
await stop(11, 'powermap', 'problem-2-1-2', () => page.click('#powermap-play'));
await stop(12, 'principal-root', 'problem-2-2-2', () => page.click('#principal-root-sweep'));
await stop(13, 'branches', 'problem-2-4-1', async () => { await page.click('#branches-seam-positive'); await page.click('#branches-walk-across'); await page.waitForTimeout(1500); });
await stop(14, 'reciprocal', 'problem-2-5-1', () => page.click('#reciprocal-play'));
await stop(15, 'limits', 'problem-2-3-1', () => page.click('#limits-path-line'));
await stop(16, 'derivative', 'problem-3-1-2', async () => { await page.click('#derivative-fn-abs2').catch(() => {}); const b = await page.$('#derivative-move-zero, #derivative-zero, button:has-text("Move z0 to 0"), button:has-text("Move z₀ to 0")'); if (b) await b.click(); else throw new Error('no move-to-zero button'); await page.waitForTimeout(800); });
await stop(17, 'cauchy-riemann', 'problem-3-2-1', () => page.click('#cauchy-riemann-fn-conj'));
await stop(19, 'graph4d', 'graph4d', () => setSlider(page, 'graph4d-uv', 45));
await stop(21, 'problems', 'problems-todo', async () => { const b = await page.$('[id^="problems-tick-"]'); if (!b) throw new Error('no tick button'); await b.click(); });
console.log('errors', errors.length, errors.slice(0, 3));
await ctx.close(); await L.close();
