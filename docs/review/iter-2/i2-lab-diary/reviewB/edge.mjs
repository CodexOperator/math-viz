// Review B edge probes (not in the builder's script). Run:
//   node tools/smoke.mjs --route lab --script docs/review/iter-2/i2-lab-diary/reviewB/edge.mjs --out docs/review/iter-2/i2-lab-diary/reviewB/edge
// Any console error, page error or failed request in the harness fails the run as well.
import { clickChip, planePixel, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';

const lab = (page, n) => page.evaluate((k) => window.__mv.lab[k](), n);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function drag(page, a, b, steps = 8) {
  const p = await planePixel(page, 'lab-zplane', a);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  const q = await planePixel(page, 'lab-zplane', b);
  await page.mouse.move(q.x, q.y, { steps }); await page.mouse.up();
  await settle(page, 3);
}
async function clearIfAny(page) { if (await page.isEnabled('#lab-clear')) await clearIfAny(page); }
async function openMore(page) { if (!(await page.evaluate(() => document.getElementById('lab-more').open))) await page.click('#lab-more-toggle'); }

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = page.viewportSize().width < 600;
  await page.waitForFunction(() => window.__mv && window.__mv.lab && window.__mv.planes.get('lab-wplane'), null, { timeout: 15000 });
  await page.waitForTimeout(1000);

  // 1. Replay in every tool and every view
  const tools = [['lab-tool-rect', { re: -1.5, im: -1 }, { re: 0.5, im: 1 }], ['lab-tool-circle', { re: 0, im: 0 }, { re: 1.5, im: 0 }], ['lab-tool-line', { re: -2, im: -1 }, { re: 2, im: 1 }], ['lab-tool-segment', null], ['lab-tool-polargrid', { re: 0.5, im: 0.5 }, { re: 2, im: 2 }], ['lab-tool-sector', { re: 0, im: 0 }, { re: 2, im: 1.5 }]];
  for (const [id, a, b] of tools) {
    if (!a || !(await page.$('#' + id))) continue;
    await clearIfAny(page);
    await clickChip(page, id);
    await drag(page, a, b);
    if ((await lab(page, 'shapes')).length === 0) { log(`${id}: nothing drawn (tool may need more than a drag), skipped`); continue; }
    await clickChip(page, 'lab-replay');
    await page.waitForTimeout(200);
    const r = await lab(page, 'replay');
    assert(r.on || r.t > 0, `${id}: replay ran ${JSON.stringify(r)}`);
    await page.waitForFunction(() => !window.__mv.lab.replay().on, null, { timeout: 5000 });
    log(`${id}: replay ran and ended`);
  }
  // a polygon (several clicks, then close)
  await clearIfAny(page);
  await clickChip(page, 'lab-tool-polygon');
  for (const z of [{ re: -1, im: -1 }, { re: 1, im: -1 }, { re: 1, im: 1 }]) { const p = await planePixel(page, 'lab-zplane', z); await page.mouse.click(p.x, p.y); await settle(page, 2); }
  const dd = await lab(page, 'draft');
  assert(dd.active && dd.corners === 3, `polygon draft ${JSON.stringify(dd)}`);
  assert(await page.evaluate(() => document.getElementById('lab-replay').disabled), 'Replay waits during a half-drawn polygon');
  await clickChip(page, 'lab-polygon-close');
  await settle(page, 3);
  assert((await lab(page, 'shapes')).length === 1, 'polygon closed');

  for (const v of ['morph', 'domain', 'landscape', 'sphere', 'graph4d', 'side']) {
    await clickChip(page, 'lab-view-' + v);
    await page.waitForTimeout(300);
    await setSlider(page, 'lab-replay-t', 0.5);
    const r = await lab(page, 'replay');
    assert(!r.on && Math.abs(r.t - 0.5) < 1e-9, `view ${v}: scrub ${JSON.stringify(r)}`);
    await clickChip(page, 'lab-replay');
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    const e = await lab(page, 'replay');
    assert(!e.on && e.cursor.z === null, `view ${v}: escape ${JSON.stringify(e)}`);
    await setSlider(page, 'lab-replay-t', 1);
    log(`view ${v}: scrub, replay and Escape fine`);
  }

  // 2. mid-replay unmount: navigate away while the replay runs (rAF cancelled, no page error afterwards)
  await clickChip(page, 'lab-replay');
  await page.waitForTimeout(200);
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForTimeout(1200);
  const gone = await page.evaluate(() => !document.getElementById('lab-replay'));
  assert(gone, 'the Lab is unmounted');
  await page.evaluate(() => { location.hash = '#lab'; });
  await page.waitForFunction(() => window.__mv && window.__mv.lab && document.getElementById('lab-replay'), null, { timeout: 15000 });
  log('unmount mid-replay and re-mount: ok');

  // 3. a window rotation / resize keeps the line off the axis (first visit frame follows the size)
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* */ } });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__mv && window.__mv.lab && window.__mv.lab.frame().w.unitsAcross < 6, null, { timeout: 15000 });
  const gapAt = () => page.evaluate(() => { const w = window.__mv.planes.get('lab-wplane'); return Math.abs(w.toPixel({ re: 0.5, im: 0 }).x - w.toPixel({ re: 0, im: 0 }).x); });
  const g0 = await gapAt();
  await page.setViewportSize({ width: phone ? 1280 : 390, height: 844 });
  await page.waitForTimeout(900);
  const g1 = await gapAt();
  log(`gap before resize ${g0.toFixed(1)} px, after resize ${g1.toFixed(1)} px`);
  assert(g1 >= (phone ? 60 : 40), `after the resize the line is ${g1} px from the axis`);
  await page.setViewportSize(page.viewportSize().width < 600 ? { width: 390, height: 844 } : { width: 1280, height: 860 });
  await page.waitForTimeout(500);

  // 4. phone/desktop overflow with More open, a long page name and the problem panel
  await openMore(page);
  await page.fill('#lab-page-name', 'a very long page name that is forty ch');
  await page.click('#lab-page-save');
  await page.waitForTimeout(200);
  const ov = await overflow(page);
  assert(ov <= 1, `no horizontal overflow with More open and a long page name: ${ov}`);
  const nm = await page.evaluate(() => document.getElementById('lab-page-open-0').textContent);
  log(`saved name text: ${nm}`);

  // 5. localStorage throws: the page still works, says so, and nothing is thrown
  await page.context().addInitScript(() => {
    const boom = () => { throw new DOMException('blocked', 'SecurityError'); };
    try { Object.defineProperty(window, 'localStorage', { get: boom, configurable: true }); } catch (e) { /* */ }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__mv && window.__mv.lab && typeof window.__mv.lab.pages === 'function', null, { timeout: 15000 });
  await page.waitForTimeout(500);
  const throws = await page.evaluate(() => { try { void window.localStorage; return false; } catch (e) { return true; } });
  assert(throws, 'localStorage is blocked for this check');
  await page.fill('#lab-page-name', 'no storage');
  await page.click('#lab-page-save');
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => ({ status: document.getElementById('lab-page-status').textContent, listed: !!document.getElementById('lab-page-open-0'), n: window.__mv.lab.pages().length }));
  log(`blocked storage: ${JSON.stringify(st)}`);
  assert(st.listed && st.n === 1, 'the page is kept in memory when storage is blocked');
  assert(/blocks storage/.test(st.status), `it says storage is blocked: ${st.status}`);
  await drag(page, { re: -1, im: 0 }, { re: 1, im: 0 });
  await clickChip(page, 'lab-replay');
  await page.waitForTimeout(300);
  assert((await lab(page, 'replay')).on, 'replay works with blocked storage');
  log('edge probes passed');
}
