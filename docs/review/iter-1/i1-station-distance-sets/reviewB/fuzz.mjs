// Review B: fuzz the visible text for NaN / Infinity / undefined / float noise after many real drags.
import { dragHandle, clickChip, setSlider, settle, handleZ } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  const BAD = /NaN|Infinity|undefined|null|\[object|e-1\d|e-9|\be-\d/;
  const scan = async (where) => {
    const t = await page.evaluate(() => {
      const out = [];
      for (const sel of ['#distance-readout', '#sets-readout', '#distance-args', '#distance-aligned', '#sets-probe-detail', '#sets-boundary', '#distance-status', '#sets-status']) { const e = document.querySelector(sel); if (e) out.push(sel + ': ' + e.textContent); }
      for (const e of document.querySelectorAll('[id^="distance-ex-"][data-tex], [id^="sets-ex-"][data-tex]')) out.push(e.id + ': ' + e.getAttribute('data-tex'));
      for (const e of document.querySelectorAll('.sets-reason')) out.push(e.id + ': ' + e.textContent);
      return out;
    });
    for (const line of t) { if (BAD.test(line)) { assert(false, `${where}: suspicious text -> ${line}`); } }
    return t;
  };
  let n = 0;
  const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
  if (route === 'problem-1-2-2') {
    await page.waitForSelector('#distance-plane-z1', { state: 'visible' });
    assert((await page.evaluate(() => document.getElementById('distance-status').textContent)) === '', 'live region silent at load');
    for (const snap of [true, false]) {
      if (!snap) await page.uncheck('#distance-snap');
      for (const mode of ['two', 'triangle']) {
        await clickChip(page, `distance-mode-${mode}`);
        for (let i = 0; i < 12; i++) {
          await dragHandle(page, 'distance-plane-z1', { re: rnd(-3, 7), im: rnd(-2, 8) });
          await dragHandle(page, 'distance-plane-z2', { re: rnd(-3, 7), im: rnd(-2, 8) });
          await scan(`dist ${mode} snap=${snap} #${i}`); n++;
        }
      }
      await clickChip(page, 'distance-mode-circle');
      for (let i = 0; i < 10; i++) {
        await dragHandle(page, 'distance-plane-R', { re: rnd(-3, 7), im: rnd(-2, 8) });
        await dragHandle(page, 'distance-plane-a', { re: rnd(0, 5), im: rnd(0, 6) });
        await scan(`dist circle snap=${snap} #${i}`); n++;
      }
      await clickChip(page, 'distance-mode-two');
    }
    // edge cases: both at the origin, and a point exactly at -1 + 0i (Arg = pi, on the seam)
    await page.check('#distance-snap');
    await clickChip(page, 'distance-mode-triangle');
    await dragHandle(page, 'distance-plane-z1', { re: -2, im: 0 }); await dragHandle(page, 'distance-plane-z2', { re: -3, im: 0 });
    const t = await scan('seam'); log(t.filter((s) => s.startsWith('distance-readout') || s.includes('lens-polar') || s.includes('distance-args')).join(' | '));
    await dragHandle(page, 'distance-plane-z1', { re: 0, im: 0 }); await dragHandle(page, 'distance-plane-z2', { re: 0, im: 0 });
    const t2 = await scan('both zero'); log(t2.filter((s) => s.startsWith('distance-readout') || s.startsWith('distance-ex-')).join(' | '));
  } else if (route === 'problem-1-5-2') {
    await page.waitForSelector('#sets-plane-p', { state: 'visible' });
    assert((await page.evaluate(() => document.getElementById('sets-status').textContent)) === '', 'live region silent at load');
    for (const preset of ['annulus', 'closed', 'punctured', 'halfplane', 'twodisks']) {
      await clickChip(page, `sets-preset-${preset}`);
      for (const snap of [true, false]) {
        if (snap) await page.check('#sets-snap'); else await page.uncheck('#sets-snap');
        for (let i = 0; i < 10; i++) {
          await dragHandle(page, 'sets-plane-p', { re: rnd(-4.2, 4.2), im: rnd(-4.2, 4.2) });
          await scan(`sets ${preset} snap=${snap} #${i}`); n++;
        }
      }
      // the special places: every centre, every edge crossing on the axes
      for (const z of [{ re: 0, im: 0 }, { re: 0, im: -1 }, { re: 2, im: 0 }, { re: -2, im: 0 }, { re: 0, im: -4 }, { re: 3, im: -1 }, { re: 0, im: 2 }]) {
        await dragHandle(page, 'sets-plane-p', z); await scan(`sets ${preset} at ${JSON.stringify(z)}`); n++;
      }
      for (const box of ['sets-inner-strict', 'sets-outer-strict']) {
        if (await page.isDisabled(`#${box}`)) continue;
        await page.click(`#${box}`); await settle(page); await scan(`sets ${preset} toggle ${box}`); n++;
        await page.click(`#${box}`); await settle(page);
      }
    }
    await page.check('#sets-snap');
  }
  log(`scanned ${n} states`);
}
