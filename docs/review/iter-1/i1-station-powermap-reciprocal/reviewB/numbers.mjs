// Review B: independent recomputation of powermap numbers for several n, c, sector settings.
import { dragHandle, setSlider, readText, settle } from '../../../../../tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  const { assert, log } = ctx;
  if (ctx.label !== 'desktop') return;
  await page.waitForTimeout(500);
  const img = () => page.evaluate(() => Array.from(window.__mv.powermapImage, (p) => [p.re, p.im]));
  const poll = async (pred) => { let t; for (let i = 0; i < 40; i++) { t = await readText(page, '#powermap-readout'); if (pred(t)) return t; await settle(page, 2); } return t; };

  // line x = c under z^n: every image point has some n-th root with real part c
  for (const n of [2, 3, 4, 5, 6]) {
    await setSlider(page, 'powermap-n', n);
    for (const c of [1, 2, 3]) {
      await dragHandle(page, 'powermap-zplane-line', { re: c, im: 0 });
      const t = await poll((s) => s.includes(`x = ${c}`) && (n === 2 ? s.includes('u =') : s.includes(`z^${n}`) || s.includes(`z${n}`) || s.includes('under')));
      const pts = await img();
      let worst = 0;
      for (const [u, v] of pts) {
        if (!Number.isFinite(u)) continue;
        const r = Math.hypot(u, v), a = Math.atan2(v, u);
        let best = Infinity;
        for (let k = -n; k <= n; k++) {
          const th = (a + 2 * Math.PI * k) / n;
          best = Math.min(best, Math.abs(Math.pow(r, 1 / n) * Math.cos(th) - c));
        }
        worst = Math.max(worst, best / Math.max(1, Math.pow(r, 1 / n)));
      }
      log(`n=${n} c=${c} readout "${t}" | pts ${pts.length} worst rel dev from Re z = c: ${worst.toExponential(2)}`);
      assert(worst < 1e-6, `n=${n} c=${c}: image consistent with x = c`);
    }
    await dragHandle(page, 'powermap-zplane-line', { re: 2, im: 0 });
  }
  // n = 2 formula for c = 3: u = 9 - v^2/36
  await setSlider(page, 'powermap-n', 2);
  await dragHandle(page, 'powermap-zplane-line', { re: 3, im: 0 });
  const t3 = await poll((s) => s.includes('x = 3'));
  log('c=3 n=2: ' + t3);
  assert(/u = 9 - v(²|\^2)\/36/.test(t3) && t3.includes('vertex 9'), 'x = 3 gives u = 9 - v²/36 vertex 9');
  const p3 = await img();
  assert(Math.max(...p3.map(([u, v]) => Math.abs(u - (9 - v * v / 36)))) < 1e-6, 'x=3 image points on u = 9 - v²/36');

  // Sector: a<arg z<b under z^n has image n·a < arg w < n·b
  await page.evaluate(() => { location.hash = '#problem-2-2-1'; });
  await page.waitForTimeout(700);
  for (const n of [2, 3, 4, 5, 6]) {
    await setSlider(page, 'powermap-n', n);
    const t = await poll((s) => s.includes(`${(n * Math.PI / 4).toFixed(3)}`));
    log(`sector n=${n}: ${t}`);
    assert(t.includes((n * Math.PI / 4).toFixed(3)), `sector n=${n} upper bound ${(n * Math.PI / 4).toFixed(3)}`);
    const over = n * Math.PI / 4 > 2 * Math.PI;
    assert(t.includes('overlaps') === over, `sector n=${n} overlap flag ${over}`);
  }
  // explainer: z^3 at the probe for n=3
  await setSlider(page, 'powermap-n', 3);
  await settle(page, 8);
  const tex = await page.evaluate(() => ({ z: document.getElementById('powermap-ex-z-cart')?.dataset.tex, w: document.getElementById('powermap-ex-w-cart')?.dataset.tex, wp: document.getElementById('powermap-ex-w-polar')?.dataset.tex, rd: document.getElementById('powermap-readout').textContent }));
  log('n=3 sector explainer: ' + JSON.stringify(tex));
}
