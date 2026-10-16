// Review B throwaway script: acceptance A1, A2, A3 for goal i2-decisions-everywhere-a, written from the goal text (not from the builder's script).
//   node tools/smoke.mjs --route addresses --script docs/review/iter-2/i2-decisions-everywhere-a/reviewB/reviewB-script.mjs --dark --out <dir>
import { settle, dragHandle, setSlider, clickChip } from '../../../../../tests/interact/_helpers.mjs';
import { problemById } from '../../../../../js/data/problems.js';
import { namesMeaning, addressMeaning } from '../../../../../js/core/decisions.js';

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const attr = (sel, a) => page.evaluate(([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null; }, [sel, a]);
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror ' + e.message));

  // set the hash exactly as the goal says, then wait for #view[data-state=ready] on that route
  const hash = async (route) => {
    await page.evaluate((r) => { location.hash = r; }, route);
    await page.waitForFunction((r) => { const v = document.getElementById('view'); return !!v && v.dataset.state === 'ready' && v.dataset.route === r; }, route, { timeout: 20000 });
    await settle(page, 4);
  };

  // ---- A1 (goal text, literal expected values; cross-checked against problems.js)
  const A1 = [['problem-1-3-1', 'addresses', '1.3.1', 'C->P', 'home'], ['problem-1-2-1', 'distance', '1.2.1', 'P', 'none'], ['problem-1-3-2', 'powers', '1.3.2', 'C->P->C', 'any'],
    ['problem-1-4-2', 'roots', '1.4.2', 'P->C', 'all'], ['problem-1-5-1', 'curves', '1.5.1', 'C', 'none']];
  for (const [route, st, id, addr, names] of A1) {
    await hash(route);
    const p = problemById(id);
    assert(p.address === addr && p.names === names, `data for ${id} is ${p.address}/${p.names}, goal says ${addr}/${names}`);
    assert((await attr(`#${st}-problem-address`, 'data-value')) === addr, `A1 ${route} address chip`);
    assert((await attr(`#${st}-problem-names`, 'data-value')) === names, `A1 ${route} names chip`);
    await page.click(`#${st}-problem-names`);
    assert((await text(`#${st}-problem-meaning`)) === namesMeaning(names), `A1 ${route} meaning on tap: ${await text(`#${st}-problem-meaning`)}`);
    log(`A1 ${route}: chips ${addr} / ${names}; meaning "${await text(`#${st}-problem-meaning`)}"`);
    await ctx.shot(`a1-${st}-meaning`);
    await page.click(`#${st}-problem-names`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `A1 ${route}: overflow ${over}`);
  }
  await hash('problem-1-4-2');
  await clickChip(page, 'roots-preset-1');
  assert((await attr('#roots-problem-names', 'data-value')) === 'all', 'A1 roots preset 1.4.1 keeps names all');
  assert((await attr('#roots-problem-address', 'data-value')) === 'P', 'A1 roots preset 1.4.1 address P');
  log('A1 roots preset-1 -> P / all');

  // ---- A2
  await hash('problem-1-3-1');
  const rd = await text('#addresses-readout');
  assert((await attr('#addresses-glyph', 'aria-label')) === 'move: turn 120°, stretch 2', 'A2 addresses glyph ' + await attr('#addresses-glyph', 'aria-label'));
  assert(rd === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)', 'A2 readout ' + rd);
  await dragHandle(page, 'addresses-plane-z', { re: 2, im: 0 });
  assert((await attr('#addresses-glyph', 'aria-label')) === 'move: turn 0°, stretch 2', 'A2 after drag ' + await attr('#addresses-glyph', 'aria-label'));
  await hash('problem-1-3-2');
  assert((await attr('#powers-glyph', 'aria-label')) === 'move: turn -60°, stretch 1024', 'A2 powers ' + await attr('#powers-glyph', 'aria-label'));
  log('A2 glyphs ok');

  // ---- A3: window.__mv.app.request(...) then the hash of the bare station route
  const fresh = async (station, problem, values) => {
    await hash('home');
    await page.evaluate((req) => window.__mv.app.request(req), { station, problem, family: problem, values });
    await hash(station);
  };
  const A3 = [
    ['addresses', '1.3.1', { z: { re: 0, im: 2 } }, async () => {
      const z = await page.evaluate(() => window.__mv.addresses.state().z); assert(z.re === 0 && z.im === 2, 'z ' + JSON.stringify(z));
      assert((await text('#addresses-readout')).includes('Arg z = 1.571 (π/2)'), 'readout ' + await text('#addresses-readout')); }],
    ['distance', '1.2.2', { mode: 'two', z1: { re: 1, im: 5 }, z2: { re: -2, im: 1 } }, async () => assert((await text('#distance-readout')).includes('d = 5'), 'readout ' + await text('#distance-readout'))],
    ['powers', '1.3.2', { z: { re: Math.SQRT2, im: Math.SQRT2 }, n: 4 }, async () => assert(/zⁿ = -16\b/.test(await text('#powers-readout')), 'readout ' + await text('#powers-readout'))],
    ['roots', '1.4.2', { c: { re: -81, im: 0 }, n: 4 }, async () => assert((await text('#roots-readout')).includes('c = -81; n = 4; |c|^(1/n) = 3'), 'readout ' + await text('#roots-readout'))],
    ['curves', '1.5.1', { a: { re: 1, im: 2 }, b: { re: -1, im: -2 } }, async () => { await setSlider(page, 'curves-t', 0.5); assert((await text('#curves-readout')).includes('z(t) = 0'), 'readout ' + await text('#curves-readout')); }],
  ];
  for (const [st, pid, values, check] of A3) {
    await fresh(st, pid, values);
    await check();
    const note = await text(`#${st}-problem-note`);
    assert(note && note.includes('Fresh numbers'), `A3 ${st} note "${note}"`);
    log(`A3 ${st} note: "${note}"`);
    await ctx.shot(`a3-${st}`);
  }
  // malformed
  consoleErrors.length = 0;
  await hash('home');
  await page.evaluate(() => window.__mv.app.request({ station: 'roots', values: { c: 'x', n: 99 } }));
  await hash('roots');
  const rs = await page.evaluate(() => window.__mv.roots.state());
  assert(rs.c.re === 1 && rs.c.im === 0 && rs.n === 5, 'A3 malformed ' + JSON.stringify(rs));
  assert(consoleErrors.length === 0, 'console errors ' + consoleErrors.join(' | '));
  log('A3 malformed ok; roots readout: ' + await text('#roots-readout') + ' note="' + await text('#roots-problem-note') + '"');
  assert(consoleErrors.length === 0, 'console errors at end: ' + consoleErrors.join(' | '));
}
