import { dragHandle, clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, assert, log } = ctx;
  if (route !== 'mappings') return;
  const nav = async (h) => { await page.evaluate((h) => { location.hash = h; }, h); await page.waitForTimeout(700); };
  const keys = () => page.evaluate(() => ({ mv: Object.keys(window.__mv || {}), planes: [...(window.__mv.planes ? window.__mv.planes.keys() : [])] }));
  log('start ' + JSON.stringify(await keys()));
  for (let i = 0; i < 3; i++) { await nav('cauchy-riemann'); await nav('mappings'); }
  await nav('home');
  const k = await keys();
  log('after home ' + JSON.stringify(k));
  assert(!k.mv.includes('mappings') && !k.mv.includes('mappingsMorph') && !k.mv.includes('cauchyRiemann'), 'hooks removed after unmount');
  assert(!k.planes.some((p) => /mappings|cauchy/.test(p)), 'planes removed');
  const styles = await page.evaluate(() => document.querySelectorAll('style[data-for^="station-"]').length);
  log('station styles left: ' + styles);
  // mounted again -> Lab hand-off
  await nav('mappings'); await settle(page, 4);
  await setSlider(page, 'mappings-morph', 0.3);
  await clickChip(page, 'mappings-fn-recip');
  await page.click('#mappings-open-lab'); await page.waitForTimeout(1500);
  const hash = await page.evaluate(() => location.hash);
  log('after lab click hash=' + hash);
  assert(hash === '#lab', 'navigated to lab');
  const ro = await readText(page, '#lab-readout').catch(() => '');
  log('lab readout: ' + ro);
  await page.screenshot({ path: '/home/user/math-viz/docs/review/iter-1/i1-station-mappings-cr/reviewB/lab-handoff-' + ctx.label + '.png', fullPage: false });
  // Play and reduced-motion on mappings
  await nav('mappings'); await settle(page, 4);
  await page.click('#mappings-play'); await page.waitForTimeout(300);
  const mid = await page.evaluate(() => window.__mv.mappingsMorph);
  await page.waitForTimeout(3000);
  const end = await page.evaluate(() => window.__mv.mappingsMorph);
  log(`play: mid=${mid} end=${end}`);
  assert(end === 1, 'play ends at 1');
}
