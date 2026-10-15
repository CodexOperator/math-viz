import { settle, clickChip, setSlider, dragHandle, readText } from '/home/user/math-viz/tests/interact/_helpers.mjs';
const half = (page, id) => page.$eval(`.plane[data-plane-id="${id}"]`, (e) => Number(e.dataset.unitsAcross) / 2);
const top = (page, sel) => page.$eval(sel, (e) => e.getBoundingClientRect().top + window.scrollY);
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  if (ctx.viewport.width < 600 && route !== 'problem-1-4-2') { /* still run on phone for layout check */ }
  if (route === 'roots') {
    const h0 = await half(page, 'roots-plane'), z0 = await half(page, 'roots-zplane');
    log(`fitted c=${h0} z=${z0}`);
    // zoom c plane with + button twice
    const plus = page.locator('.plane[data-plane-id="roots-plane"] button', { hasText: '+' }).first();
    await plus.scrollIntoViewIfNeeded(); await plus.click(); await plus.click(); await settle(page);
    const h1 = await half(page, 'roots-plane');
    log('after + + : ' + h1);
    assert(h1 < h0, 'zoomed');
    // dragging c while zoomed must not re-fit (user view is respected)
    await dragHandle(page, 'roots-plane-c', { re: 1, im: 1 });
    const h2 = await half(page, 'roots-plane');
    log('after drag while zoomed: ' + h2);
    // preset c=1 again
    await clickChip(page, 'roots-preset-1');
    const h3 = await half(page, 'roots-plane');
    log('after same preset: ' + h3);
    assert(h3 === h0, 'preset restores fit');
    // zoom via wheel on the root plane
    await page.locator('.plane[data-plane-id="roots-zplane"]').scrollIntoViewIfNeeded(); await settle(page);
    const box = await page.locator('.plane[data-plane-id="roots-zplane"] canvas').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down('Control'); await page.mouse.wheel(0, -400); await page.keyboard.up('Control'); await settle(page, 4);
    const z1 = await half(page, 'roots-zplane'); log('z after wheel: ' + z1);
    assert(z1 < z0, 'wheel zoomed');
    await setSlider(page, 'roots-n', 5);   // same n
    log('after same n=5: ' + await half(page, 'roots-zplane'));
    await setSlider(page, 'roots-n', 7);
    const z2 = await half(page, 'roots-zplane'); log('z after n=7: ' + z2);
    assert(z2 === z0, 'new n restores z plane fit');
    // Reset button on c plane
    await plus.click(); await plus.click(); await settle(page);
    const reset = page.locator('.plane[data-plane-id="roots-plane"] button', { hasText: 'Reset' }).first();
    await reset.click(); await settle(page);
    const h4 = await half(page, 'roots-plane'); log('after Reset: ' + h4);
    assert(h4 === h0, 'Reset returns to fit');
    // state().view agrees
    const v = await page.evaluate(() => window.__mv.roots.state().view);
    assert(v.c === (await half(page, 'roots-plane')) && v.z === (await half(page, 'roots-zplane')), 'state().view equals shown');
    // Callout slot: no layout jump at phone/desktop
    await clickChip(page, 'roots-preset-m16');
    const t0 = await top(page, '.plane[data-plane-id="roots-plane"]');
    await dragHandle(page, 'roots-plane-c', { re: -3, im: 5 });
    const t1 = await top(page, '.plane[data-plane-id="roots-plane"]');
    await clickChip(page, 'roots-preset-1');
    const t2 = await top(page, '.plane[data-plane-id="roots-plane"]');
    await clickChip(page, 'roots-preset-m16');
    const t3 = await top(page, '.plane[data-plane-id="roots-plane"]');
    log(`plane tops ${t0} ${t1} ${t2} ${t3}`);
    assert(Math.abs(t1 - t0) < 1 && Math.abs(t2 - t0) < 1 && Math.abs(t3 - t0) < 1, 'no layout jump');
    // slot does not take keyboard focus/AT: hidden copies inert
    const inertCount = await page.evaluate(() => [...document.querySelectorAll('#roots-problem-slot [inert]')].length);
    log('inert copies: ' + inertCount);
    const callouts = await page.evaluate(() => [...document.querySelectorAll('#roots-problem-slot *')].filter((e) => e.getAttribute('aria-hidden') === 'true').length);
    log('aria-hidden nodes in slot: ' + callouts);
  }
  if (route === 'principal-root') {
    const h0 = await half(page, 'principal-root-plane');
    const zoom = async () => { const b = await page.locator('.plane[data-plane-id="principal-root-plane"] canvas').boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.keyboard.down('Control'); await page.mouse.wheel(0, -500); await page.keyboard.up('Control'); await settle(page, 4); };
    await page.locator('.plane[data-plane-id="principal-root-plane"]').scrollIntoViewIfNeeded(); await zoom();
    const h1 = await half(page, 'principal-root-plane'); assert(h1 < h0, 'zoomed');
    await clickChip(page, 'principal-root-preset-2i');
    assert((await half(page, 'principal-root-plane')) === h0, 'preset restores');
    await zoom();
    await setSlider(page, 'principal-root-n', 4);
    assert((await half(page, 'principal-root-plane')) === h0, 'new n restores');
    // rest consistency: staircase vs readout vs plane label
    await dragHandle(page, 'principal-root-plane-w', { re: -1.5, im: -0.8 });
    await settle(page, 4);
    const ro = await readText(page, '#principal-root-readout');
    const st = await page.evaluate(() => document.querySelector('#principal-root-stairs-host')?.textContent.replace(/\s+/g, ' '));
    log('readout: ' + ro); log('stairs: ' + st.slice(0, 120));
    const argR = /Arg w = (-?\d+\.\d+)/.exec(ro)[1];
    assert(st.includes('Arg w = ') && st.includes(argR) , 'staircase agrees with readout: ' + argR);
  }
}
