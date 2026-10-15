import fs from 'node:fs';
import { clickChip, dragHandle, readText, setSlider } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.viewport?.name && ctx.viewport.name !== 'desktop') return;
  const out = [];
  const cases = [['sq-plus-z', 1, 1], ['abs2', 1, 1], ['abs2', 0, 0], ['conj', 1, 1], ['re', 0.3, -0.7], ['cube', 1, 1], ['exp', 1, 1], ['recip', 1, 1], ['recip', 0, 0], ['recip', 0.5, 0]];
  for (const [fn, re, im] of cases) {
    await clickChip(page, `derivative-fn-${fn}`);
    await dragHandle(page, 'derivative-zplane-z0', { re, im });
    await page.waitForTimeout(250);
    const ro = await readText(page, '#derivative-readout');
    const v = await readText(page, '#derivative-verdict');
    const prob = await readText(page, '#derivative-problem');
    const note = await page.evaluate(() => [...document.querySelectorAll('#view p[id], #view div[id]')].filter((e) => /note|hint|fn-/.test(e.id) && !/plane|viewport|ex-/.test(e.id)).map((e) => e.id + ': ' + e.innerText.slice(0, 300)).join(' // '));
    out.push(`## ${fn} at ${re},${im}\nREADOUT: ${ro}\nVERDICT: ${v}\nPROBLEM: ${prob.slice(0, 160)}\nNOTES: ${note}\n`);
  }
  fs.writeFileSync('/home/user/math-viz/docs/review/iter-1/i1-station-limits-derivative/reviewB/verdicts.txt', out.join('\n'));
}
