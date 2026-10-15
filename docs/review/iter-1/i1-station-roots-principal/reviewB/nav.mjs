import { settle, clickChip } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  if (route !== 'roots') return;
  const go = async (h, ms = 250) => { await page.evaluate((h) => { location.hash = h; }, h); await page.waitForTimeout(ms); };
  // start raise, leave mid-animation
  await clickChip(page, 'roots-preset-m16');
  await page.evaluate(() => document.getElementById('roots-raise').click());
  await page.waitForTimeout(300);
  await go('#principal-root');
  log('hooks after leaving roots: ' + JSON.stringify(await page.evaluate(() => Object.keys(window.__mv))));
  await page.evaluate(() => document.getElementById('principal-root-sweep').click());
  await page.waitForTimeout(300);
  await go('#roots');
  await go('#problem-1-4-3', 100); await go('#problem-2-2-2', 100); await go('#problem-1-4-1', 100); await go('#home', 100); await go('#roots', 100); await go('#principal-root', 100); await go('#roots', 600);
  const planes = await page.evaluate(() => [...window.__mv.planes.keys()]);
  log('planes registered now: ' + JSON.stringify(planes));
  assert(!planes.includes('principal-root-plane'), 'principal-root plane unregistered after leaving');
  assert(new Set(planes).size === planes.length, 'no duplicate planes');
  // back-forward
  await page.goBack(); await page.waitForTimeout(300); await page.goBack(); await page.waitForTimeout(300);
  log('hash now ' + (await page.evaluate(() => location.hash)));
}
