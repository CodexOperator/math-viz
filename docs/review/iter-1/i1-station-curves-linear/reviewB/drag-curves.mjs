import { settle, dragHandle, handleZ, clickChip, setSlider } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const st = () => page.evaluate(() => window.__mv.curves.state());
  const ro = () => page.evaluate(() => document.getElementById('curves-readout').textContent);
  // segment: drag b
  let z = await dragHandle(page, 'curves-plane-b', { re: 0, im: 3 });
  ctx.log('segment b -> ' + JSON.stringify(z));
  await setSlider(page, 'curves-t', 1); await settle(page, 3);
  ctx.log('t=1: ' + await ro());
  ctx.assert(/z\(t\) = 3i|z\(t\) = 3i;/.test(await ro()), 't=1 is b = 3i');
  // keyboard on b
  await page.focus('#curves-plane-b'); await page.keyboard.press('ArrowRight'); await settle(page, 3);
  ctx.log('after ArrowRight: ' + JSON.stringify((await st()).b) + ' | ' + await ro());
  ctx.assert(Math.abs((await st()).b.re - 0.5) < 1e-9, 'arrow key moves b by 0.5');
  // b on top of a: clamps
  const a = (await st()).a;
  z = await dragHandle(page, 'curves-plane-b', a);
  ctx.log('b dropped on a -> ' + JSON.stringify(z) + ' size ' + Math.hypot(z.re - a.re, z.im - a.im));
  ctx.assert(Math.hypot(z.re - a.re, z.im - a.im) >= 0.2 - 1e-9, 'minimum size');
  // circle: drag centre
  await clickChip(page, 'curves-preset-circle');
  const before = await st();
  z = await dragHandle(page, 'curves-plane-a', { re: -1, im: -1 });
  const after = await st();
  ctx.log(`circle centre ${JSON.stringify(before.a)}->${JSON.stringify(after.a)}; b ${JSON.stringify(before.b)}->${JSON.stringify(after.b)}`);
  ctx.assert(Math.abs((after.b.re - after.a.re) - (before.b.re - before.a.re)) < 1e-9, 'b keeps its offset');
  await setSlider(page, 'curves-t', 0); await settle(page, 3);
  const r0 = await ro(); ctx.log('circle t=0 ' + r0);
  // square: reverse then drag start: classification stays
  await clickChip(page, 'curves-preset-square');
  await clickChip(page, 'curves-orient'); 
  await dragHandle(page, 'curves-plane-b', { re: 2.5, im: 0.5 }); await settle(page, 3);
  const cls = await page.evaluate(() => window.__mv.curves.classification());
  ctx.log('square reversed after drag: ' + JSON.stringify(cls));
  ctx.assert(cls.orientation === -1 && cls.closed && cls.simple, 'square stays negative');
  // preset memory: segment keeps the moved b
  await clickChip(page, 'curves-preset-segment');
  ctx.log('segment after returning: ' + JSON.stringify((await st()).b));
  // plane view reset etc.
  await clickChip(page, 'curves-preset-eight');
  const ex = await page.evaluate(() => document.getElementById('curves-ex-z-polar')?.dataset.tex);
  ctx.log('eight polar row: ' + ex);
}
