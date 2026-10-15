import { readText, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  if (!['mappings', 'cauchy-riemann'].includes(route)) return;
  const cellId = route === 'mappings' ? 'mappings-ex-u-cart' : 'cauchy-riemann-ab-A-cart';
  const grab = async () => page.evaluate((id) => ({ tex: (document.getElementById(id) || {}).dataset?.tex || '', theme: document.documentElement.dataset.theme || '(none)', bg: getComputedStyle(document.body).backgroundColor }), cellId);
  await page.waitForTimeout(700);
  const a = await grab();
  const btn = page.locator('header button').last();
  const toggle = page.locator('#theme-toggle');
  if (await toggle.count()) await toggle.click(); else await btn.click();
  await page.waitForTimeout(900);
  const b = await grab();
  log(`before: ${a.theme} ${a.bg} ${a.tex.match(/#[0-9a-f]{6}/i)}`);
  log(`after : ${b.theme} ${b.bg} ${b.tex.match(/#[0-9a-f]{6}/i)}`);
  assert(a.bg !== b.bg, 'theme changed');
  assert(String(a.tex.match(/#[0-9a-f]{6}/i)) !== String(b.tex.match(/#[0-9a-f]{6}/i)), 'explainer re-tinted');
  await page.screenshot({ path: `/home/user/math-viz/docs/review/iter-1/i1-station-mappings-cr/reviewB/theme-${route}-${ctx.label}.png`, fullPage: false });
}
