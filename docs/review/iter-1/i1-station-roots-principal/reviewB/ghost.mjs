import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log } = ctx;
  if (route !== 'problem-1-4-2' || ctx.viewport.width < 600) return;
  await page.evaluate(() => window.__mv.roots.select(4)); await settle(page, 6); await page.waitForTimeout(150);
  const d = await page.evaluate(() => ({ sel: window.__mv.roots.state().sel, h: document.getElementById('roots-ex-heading')?.textContent, note: document.getElementById('roots-pick-note')?.textContent, ang: document.getElementById('roots-ex-angle-polar')?.dataset.tex, same: document.getElementById('roots-ex-same')?.textContent.slice(0, 50), nan: /NaN|undefined|Infinity/.test(document.getElementById('view').innerText) }));
  log(JSON.stringify(d, null, 1));
}
