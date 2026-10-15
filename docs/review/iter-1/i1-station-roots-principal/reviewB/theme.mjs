import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  const id = route === 'problem-2-2-2' ? 'principal-root-ex-w-cart' : 'roots-ex-eq-cart';
  const quad = route === 'problem-1-4-3';
  const tex = () => page.$eval('#' + (quad ? 'roots-quadratic-readout' : id), (e) => e.dataset.tex || e.textContent);
  const canvasSig = () => page.evaluate((rt) => { const p = window.__mv.planes.get(rt === 'problem-2-2-2' ? 'principal-root-plane' : 'roots-plane'); const c = p.canvas; const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 17) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } return [r / n, gg / n, b / n].map((x) => Math.round(x)); }, route);
  if (quad) return;
  const t0 = await tex(), s0 = await canvasSig();
  await page.evaluate(() => { document.getElementById('theme-toggle').click(); });
  await settle(page, 6); await page.waitForTimeout(300);
  const t1 = await tex(), s1 = await canvasSig();
  const th = await page.evaluate(() => document.documentElement.dataset.theme + '|' + matchMedia('(prefers-color-scheme: dark)').matches);
  log(`theme=${th}  tex changed=${t0 !== t1}  canvas sig ${s0} -> ${s1}`);
  log(t0.slice(0, 80)); log(t1.slice(0, 80));
  assert(t0 !== t1, 'explainer re-tinted on theme change');
  assert(JSON.stringify(s0) !== JSON.stringify(s1), 'canvas redrawn with new tokens');
}
