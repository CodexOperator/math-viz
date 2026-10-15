// Review B throwaway: keyboard stepping on the powers/staircase handles at the viewport sizes of the smoke runner.
import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const id = ctx.route === 'staircase' ? 'staircase-plane-z' : 'powers-plane-z';
  const get = () => page.evaluate((id) => { const b = document.getElementById(id); return { re: +Number(b.dataset.re).toFixed(3), im: +Number(b.dataset.im).toFixed(3) }; }, id);
  const scale = await page.evaluate((id) => { const p = window.__mv.planes.get(id.replace(/-z$/, '')); return p.getView().scale; }, id);
  const out = { scale: +scale.toFixed(1), start: await get() };
  await page.focus('#' + id);
  for (const key of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
    const a = await get();
    for (let i = 0; i < 3; i++) await page.keyboard.press(key);
    await settle(page, 2);
    out[key] = { moved: JSON.stringify(a) !== JSON.stringify(await get()), now: await get() };
  }
  const a = await get();
  await page.keyboard.press('Shift+ArrowRight');
  await settle(page, 2);
  out.shiftRight = { before: a, after: await get() };
  ctx.log(JSON.stringify(out));
}
