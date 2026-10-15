import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
const cases = [[1,-4,13],[1,-3,2],[1,2,5],[2,4,10],[1,0,0],[1,0,4],[1,-6,10],[3,-2,1],[1,1,1],[-1,2,-5],[0.5,-3.7,12.25],[1,4,4]];
export default async function (page, ctx) {
  if (ctx.viewport.width < 600) return;
  const out = [];
  for (const [a,b,c] of cases) {
    await page.fill('#roots-qa', String(a)); await page.fill('#roots-qb', String(b)); await page.fill('#roots-qc', String(c)); await settle(page, 5); await page.waitForTimeout(100);
    out.push({ a, b, c, readout: await page.$eval('#roots-quadratic-readout', (e) => e.textContent), story: await page.$eval('#roots-quadratic-story', (e) => e.textContent), cells: await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#roots-quadratic [data-tex]')].map((e) => [e.id, e.dataset.tex]))) });
  }
  (await import('node:fs')).writeFileSync('/home/user/math-viz/docs/review/iter-1/i1-station-roots-principal/reviewB/quad.json', JSON.stringify(out, null, 1));
}
