import { clickChip, dragHandle, readText, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { log, assert, shot } = ctx;
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} location.hash = '#lab'; });
  await page.waitForTimeout(900);
  await clickChip(page, 'lab-fn-sq');
  await clickChip(page, 'lab-tool-probe');
  const cases = [[{ re: -1, im: 1 }, '-2i', 'wrapped'], [{ re: -2, im: 0 }, '4', 'wrapped'], [{ re: 0, im: -1 }, '-1', 'wrapped']];
  for (const [z, w, kind] of cases) {
    const got = await dragHandle(page, 'lab-zplane-probe', z);
    await settle(page, 4);
    const ro = await readText(page, '#lab-readout');
    const story = await readText(page, '#lab-angle-story');
    log(JSON.stringify(got) + ' | ' + ro.replace(/\n/g, ' / ') + ' | ' + story);
    assert(ro.includes('-> w = ' + w), `probe w for ${JSON.stringify(z)}: ${ro}`);
  }
  await shot('probe-wrap');
  await clickChip(page, 'lab-fn-recip');
  const got = await dragHandle(page, 'lab-zplane-probe', { re: -1, im: 0 });
  await settle(page, 4);
  log('recip at -1: ' + (await readText(page, '#lab-readout')).replace(/\n/g, ' / ') + ' | ' + (await readText(page, '#lab-angle-story')));
  await clickChip(page, 'lab-fn-sqrt');
  await dragHandle(page, 'lab-zplane-probe', { re: -1, im: 0.01 });
  await settle(page, 4);
  log('sqrt at -1+0.01i: ' + (await readText(page, '#lab-readout')).replace(/\n/g, ' / ') + ' | ' + (await readText(page, '#lab-angle-story')));
}
