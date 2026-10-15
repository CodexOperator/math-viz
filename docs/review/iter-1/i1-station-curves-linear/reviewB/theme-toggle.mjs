import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const probe = () => page.evaluate(() => {
    const colorOf = (sel) => { const e = document.querySelector(sel); if (!e) return null; const k = e.querySelector('.katex [style*="color"]') || e.querySelector('.katex'); return k ? getComputedStyle(k).color : getComputedStyle(e).color; };
    const theme = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const plane = window.__mv.planes.get(window.__mv.curves ? 'curves-plane' : 'linear-wplane');
    const cv = plane.canvas, g = cv.getContext('2d');
    const pts = window.__mv.curves ? window.__mv.curves.points() : window.__mv.linearImage; const q = plane.toPixel(pts[Math.floor(pts.length * 0.2)]); const r = cv.width / cv.clientWidth; const dd = g.getImageData(Math.round(q.x * r) - 3, Math.round(q.y * r) - 3, 7, 7).data; let best = [0, 0, 0, 0]; for (let k = 0; k < dd.length; k += 4) if (dd[k + 3] > best[3]) best = [dd[k], dd[k + 1], dd[k + 2], dd[k + 3]]; const bg = best;
    return { theme, cart: colorOf('[id$="-ex-z-cart"], [id$="-ex-a-cart"]'), polar: colorOf('[id$="-ex-z-polar"], [id$="-ex-a-polar"]'), bg: [...bg].slice(0, 3).join(','), body: getComputedStyle(document.body).backgroundColor };
  });
  const before = await probe();
  await page.click('#theme-toggle, button[aria-label*="theme" i], header button');
  await page.waitForTimeout(500); await settle(page, 4);
  const after = await probe();
  ctx.log('before ' + JSON.stringify(before));
  ctx.log('after  ' + JSON.stringify(after));
  ctx.assert(before.theme !== after.theme, 'theme toggled');
  ctx.assert(before.cart !== after.cart || before.polar !== after.polar, 'explainer tint recoloured');
  ctx.assert(before.bg !== after.bg, 'canvas background recoloured');
}
