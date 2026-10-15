import { readText, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  if (route !== 'mappings') return;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { location.hash = 'home'; }); await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = 'mappings'; }); await page.waitForTimeout(900);
  log('play label: ' + await readText(page, '#mappings-play'));
  const seq = [];
  for (let i = 0; i < 6; i++) { await page.click('#mappings-play'); await settle(page, 2); seq.push(await page.evaluate(() => window.__mv.mappingsMorph)); }
  log('steps: ' + seq.join(', '));
  assert(seq.join() === '0,0.25,0.5,0.75,1,0', 'stepper sequence');
}
