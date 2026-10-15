// Review B adversarial checks: lifecycle, reduced motion, sector corner label, theme switch, gap-sentence order, links, deep links.
import { dragHandle, clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  const { assert, log, shot, label } = ctx;
  const mvKeys = () => page.evaluate(() => Object.keys(window.__mv || {}).sort());
  const stationPlanes = () => page.evaluate(() => [...window.__mv.planes.keys()]);
  const go = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(700); };
  await page.waitForTimeout(500);

  // 1. lifecycle: reciprocal -> home -> reciprocal -> powermap -> home
  await go('#reciprocal');
  let keys = await mvKeys();
  log('keys on reciprocal: ' + keys.join(','));
  await go('#home');
  keys = await mvKeys();
  log('keys on home: ' + keys.join(','));
  assert(!keys.some((k) => /reciprocal|powermap/.test(k)), 'unmount leaves no reciprocal/powermap hook (' + keys + ')');
  const planesHome = await stationPlanes();
  assert(!planesHome.some((p) => /reciprocal|powermap/.test(p)), 'unmount destroyed planes (' + planesHome + ')');
  const views = await page.evaluate(() => [...window.__mv.views3d.keys()]);
  assert(views.length === 0, '3D views disposed (' + views + ')');
  for (let i = 0; i < 4; i++) { await go('#reciprocal'); await go('#powermap'); }
  await go('#home');
  const planesAfter = await stationPlanes();
  assert(planesAfter.length === planesHome.length, 'no leaked planes after 4 remount cycles (' + planesAfter + ')');

  // 2. reduced motion: Play / Run become steppers
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go('#problem-2-5-1');
  const runBefore = await readText(page, '#reciprocal-play');
  log('run button text (reduced motion): ' + runBefore);
  await clickChip(page, 'reciprocal-play');
  await settle(page, 4);
  log('readout after one run click: ' + (await readText(page, '#reciprocal-readout')));
  await go('#problem-2-1-2');
  log('powermap play text (reduced motion): ' + (await readText(page, '#powermap-play')));
  await clickChip(page, 'powermap-play');
  await settle(page, 4);
  log('powermap t-out after click: ' + (await readText(page, '#powermap-t-out')));
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // 3. the sector corner label
  await go('#problem-2-2-1');
  await setSlider(page, 'powermap-t', 0);
  await settle(page, 6);
  const ql = await page.evaluate(() => document.getElementById('powermap-wplane-q').getAttribute('aria-label'));
  log('w handle label at corner: ' + ql);
  assert(ql === 'Image w: w = 0', 'corner label');

  // 4. theme switch while on a route; no console errors (harness counts them)
  await go('#problem-2-5-1');
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); document.dispatchEvent(new Event('themechange')); });
  await settle(page, 6);
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); document.dispatchEvent(new Event('themechange')); });
  await settle(page, 6);

  // 5. order of controls and the gap sentence at the phone width
  await clickChip(page, 'reciprocal-preset-line');
  await settle(page, 6);
  const geo = await page.evaluate(() => {
    const r = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), left: Math.round(b.left), right: Math.round(b.right) }; };
    return { note: r('reciprocal-stage-note'), play: r('reciprocal-play'), gap: r('reciprocal-gap'), vw: innerWidth };
  });
  log('geometry: ' + JSON.stringify(geo));
  assert(geo.gap.top >= geo.play.bottom - 1, 'gap sentence below Run');
  assert(geo.gap.right <= geo.vw && geo.play.right <= geo.vw, 'gap/play inside viewport');
  await shot('line-gap');

  // 6. all anchors in the station are routes
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.getAttribute('href')));
  log('hrefs: ' + [...new Set(hrefs)].join(' '));
  assert(hrefs.every((h) => /^#[A-Za-z0-9._~-]+$/.test(h)), 'every href is a bare-token route');

  // 7. inline-flex link label: is the sup a flex item (renders unraised)?
  await go('#problem-2-5-1');
  const sup = await page.evaluate(() => {
    const a = [...document.querySelectorAll('#view a.station-link')].find((x) => x.querySelector('sup'));
    if (!a) return null;
    const s = a.querySelector('sup');
    const cs = getComputedStyle(a);
    const sb = s.getBoundingClientRect();
    const ab = a.getBoundingClientRect();
    const prev = s.previousSibling;
    return { display: cs.display, gap: cs.columnGap, parentOfSup: s.parentElement.tagName + '.' + s.parentElement.className, supTop: Math.round(sb.top - ab.top), supBottom: Math.round(sb.bottom - ab.top), anchorH: Math.round(ab.height), supOffset: getComputedStyle(s).verticalAlign, kids: [...a.childNodes].map((n) => n.nodeName).join(',') };
  });
  log('link sup: ' + JSON.stringify(sup));
}
