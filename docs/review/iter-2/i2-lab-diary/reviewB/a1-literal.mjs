// Review B: A1 verbatim from docs/goals/iter-2.json, written independently of tests/interact/i2-lab-diary.mjs.
// Run (a fresh browser context is a first visit; nothing is cleared or reloaded here):
//   node tools/smoke.mjs --route lab --script docs/review/iter-2/i2-lab-diary/reviewB/a1-literal.mjs --dark --out docs/review/iter-2/i2-lab-diary/reviewB/a1lit
import { clickChip, planePixel } from '../../../../../tests/interact/_helpers.mjs';

const lab = (page, n) => page.evaluate((k) => window.__mv.lab[k](), n);

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = page.viewportSize().width < 600;
  await page.waitForFunction(() => window.__mv && window.__mv.lab && window.__mv.planes.get('lab-wplane'), null, { timeout: 15000 });
  await page.waitForTimeout(1500);

  // (1)
  const L = await page.evaluate(() => {
    const zc = document.getElementById('lab-zplane-canvas').getBoundingClientRect();
    const zv = document.getElementById('lab-zplane-viewport');
    const fol = (id) => !!(zv.compareDocumentPosition(document.getElementById(id)) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { top: zc.top + window.scrollY, fns: fol('lab-fns'), more: fol('lab-more') };
  });
  log(`(1) z canvas top ${L.top.toFixed(0)} fns-after ${L.fns} more-after ${L.more}`);
  assert(L.top <= (phone ? 640 : 480), `(1) z canvas top ${L.top}`);
  assert(L.fns && L.more, '(1) document order');

  // (2)
  const f = await page.evaluate(() => {
    const w = window.__mv.planes.get('lab-wplane');
    return { gap: Math.abs(w.toPixel({ re: 0.5, im: 0 }).x - w.toPixel({ re: 0, im: 0 }).x), ua: w.getView().unitsAcross };
  });
  log(`(2) gap ${f.gap.toFixed(2)} px, unitsAcross ${f.ua.toFixed(3)}`);
  assert(f.gap >= (phone ? 40 : 60), `(2) gap ${f.gap}`);
  assert(f.ua <= 8, `(2) unitsAcross ${f.ua}`);

  // (3)
  await clickChip(page, 'lab-tool-brush');
  const n0 = (await lab(page, 'shapes')).length;
  const p = await planePixel(page, 'lab-zplane', { re: -1, im: 1 });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  const q = await planePixel(page, 'lab-zplane', { re: 1, im: 1 });
  await page.mouse.move(q.x, q.y, { steps: 8 });
  const d = await lab(page, 'draft');
  log(`(3) draft mid-stroke ${JSON.stringify(d)}`);
  assert(d.active === true && d.tool === 'brush' && d.out >= 1 && d.inked === true, `(3) draft ${JSON.stringify(d)}`);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const n1 = (await lab(page, 'shapes')).length;
  assert(n1 === n0 + 1, `(3) shapes ${n0} -> ${n1}`);

  // (4)
  await page.click('#lab-replay');
  await page.waitForTimeout(150);
  const r1 = await lab(page, 'replay');
  log(`(4) r1 ${JSON.stringify(r1)}`);
  assert(r1.on === true && r1.t > 0 && r1.t < 1 && r1.cursor.z && r1.cursor.w, `(4) r1 ${JSON.stringify(r1)}`);
  await page.waitForTimeout(250);
  const r2 = await lab(page, 'replay');
  log(`(4) r2 ${JSON.stringify(r2)}`);
  assert(r2.t > r1.t, `(4) r2.t ${r2.t} > r1.t ${r1.t}`);
  const t0 = Date.now();
  await page.waitForFunction(() => window.__mv.lab.replay().on === false, null, { timeout: 4000 });
  log(`(4) ended after a further ${Date.now() - t0} ms`);

  // (5)
  if (!(await page.evaluate(() => document.getElementById('lab-pages').open))) await page.click('#lab-pages-toggle');
  await page.fill('#lab-page-name', 'my stroke');
  await page.click('#lab-page-save');
  await page.waitForTimeout(200);
  const txt = await page.evaluate(() => (document.getElementById('lab-page-open-0') || {}).textContent);
  assert(txt && txt.includes('my stroke'), `(5) list text ${txt}`);
  const stored = JSON.parse(await page.evaluate(() => localStorage.getItem('mv:lab.pages')));
  assert(stored.length === 1 && stored[0].shapes.length >= 1, `(5) stored ${JSON.stringify(stored).slice(0, 200)}`);
  const savedCount = (await lab(page, 'shapes')).length;
  await page.click('#lab-clear');
  assert((await lab(page, 'shapes')).length === 0, '(5) cleared');
  await page.click('#lab-page-open-0');
  assert((await lab(page, 'shapes')).length === savedCount, '(5) reopen count');
  assert((await lab(page, 'fn')).id === 'recip', '(5) fn id');
  await page.click('#lab-page-delete-0');
  await page.waitForTimeout(200);
  const listLen = await page.evaluate(() => document.getElementById('lab-page-list').children.length);
  const hasOpen0 = await page.evaluate(() => !!document.getElementById('lab-page-open-0'));
  log(`(5) after delete: list children ${listLen}, open-0 present ${hasOpen0}`);
  assert(!hasOpen0, '(5) list empty');

  // (6)
  if (!(await page.evaluate(() => document.getElementById('lab-more').open))) await page.click('#lab-more-toggle');
  await page.click('#lab-preset-circle1-load');
  await page.waitForTimeout(300);
  const v = await page.evaluate(() => ({
    vis: !!document.getElementById('lab-problem') && !document.getElementById('lab-problem').hidden && document.getElementById('lab-problem').getBoundingClientRect().height > 0,
    names: !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="names"][data-value="any"]'),
    addr: !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="address"][data-value="P"]'),
  }));
  log(`(6) ${JSON.stringify(v)}`);
  assert(v.vis && v.names && v.addr, `(6) ${JSON.stringify(v)}`);
  log('A1 literal: all six steps pass');
}
