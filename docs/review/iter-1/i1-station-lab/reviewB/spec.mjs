// Review B throwaway: the acceptance criteria of i1-station-lab run as written in the goal, with independent maths.
import { clickChip, planePixel, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';

const pause = (page, ms) => page.waitForTimeout(ms);
const lab = (page, n) => page.evaluate((k) => window.__mv.lab[k](), n);

async function drag(page, planeId, a, b, steps = 10) {
  const p = await planePixel(page, planeId, a), q = await planePixel(page, planeId, b);
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps }); await page.mouse.up();
  await settle(page, 3);
}

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));

  // ---------- A2 ----------
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} location.hash = '#home'; });
  await pause(page, 400);
  await page.evaluate(() => { location.hash = '#lab'; });
  await pause(page, 900);
  await clickChip(page, 'lab-tool-rect');
  await drag(page, 'lab-zplane', { re: 0.5, im: 0.5 }, { re: 1.5, im: 1.5 });
  const sh = await page.evaluate(() => { const s = window.__mv.lab.shapes(); return { n: s.length, pts: s[0].points.map((p) => ({ re: p.re, im: p.im, t: p.t })) }; });
  assert(sh.n === 1, 'A2 one shape');
  const dev = Math.max(...sh.pts.map((p) => Math.abs(Math.max(Math.abs(p.re - 1), Math.abs(p.im - 1)) - 0.5)));
  assert(dev < 1e-6, 'A2 rect points on the square boundary, dev=' + dev);
  const ts = sh.pts.map((p) => p.t);
  assert(Math.min(...ts) === 0 && Math.max(...ts) === 1, 'A2 t spans 0..1 min ' + Math.min(...ts) + ' max ' + Math.max(...ts));
  // independent image check: every image point w must be z^2 for some z on the boundary (take both square roots)
  await clickChip(page, 'lab-fn-sq');
  const imgs = await page.evaluate(() => window.__mv.lab.images().flatMap((pc) => pc.points.map((p) => ({ re: p.re, im: p.im, t: p.t }))));
  assert(imgs.length > 0, 'A2 images exist');
  let worstInd = 0;
  for (const w of imgs) {
    const r = Math.hypot(w.re, w.im), th = Math.atan2(w.im, w.re);
    const z = { re: Math.sqrt(r) * Math.cos(th / 2), im: Math.sqrt(r) * Math.sin(th / 2) };
    const d1 = Math.abs(Math.max(Math.abs(z.re - 1), Math.abs(z.im - 1)) - 0.5);
    const d2 = Math.abs(Math.max(Math.abs(-z.re - 1), Math.abs(-z.im - 1)) - 0.5);
    worstInd = Math.max(worstInd, Math.min(d1, d2));
  }
  assert(worstInd < 1e-6, 'A2 images are squares of boundary points (independent), worst ' + worstInd);
  // pointAt based check as the criterion says
  const pa = await page.evaluate(async () => {
    const { pointAt } = await import('./js/core/shapes.js');
    const L = window.__mv.lab; const s = L.shapes()[0]; let worst = 0, n = 0;
    for (const pc of L.images()) for (const p of pc.points) { const z = pointAt(s, p.t); worst = Math.max(worst, Math.hypot(z.re * z.re - z.im * z.im - p.re, 2 * z.re * z.im - p.im)); n++; }
    return { worst, n };
  });
  assert(pa.n > 0 && pa.worst < 1e-6, 'A2 pointAt^2 equals image: ' + JSON.stringify(pa));
  // the clock: image dot at t=0.5 equals z(0.5)^2
  for (const v of ['side', 'morph', 'domain', 'landscape', 'sphere', 'graph4d']) {
    await clickChip(page, 'lab-view-' + v);
    await pause(page, 400);
    assert((await lab(page, 'view')) === v, 'A2 view ' + v);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(ov <= 1, 'no overflow in ' + v + ' ' + ov);
  }
  await clickChip(page, 'lab-view-side');
  await setSlider(page, 'lab-t', 0.5);
  assert((await readText(page, '#lab-readout')).includes('t = 0.5'), 'A2 readout t = 0.5: ' + (await readText(page, '#lab-readout')));
  await clickChip(page, 'lab-undo');
  assert((await lab(page, 'shapes')).length === 0, 'A2 undo');
  await drag(page, 'lab-zplane', { re: 0.5, im: 0.5 }, { re: 1.5, im: 1.5 });
  assert((await lab(page, 'shapes')).length === 1, 'A2 draw again');
  await clickChip(page, 'lab-clear');
  assert((await lab(page, 'shapes')).length === 0, 'A2 clear');

  // ---------- A3 independent maths ----------
  const go = async (h, ms = 800) => { await page.evaluate((x) => { location.hash = x; }, h); await pause(page, ms); };
  const pts = () => page.evaluate(() => window.__mv.lab.images().flatMap((pc) => pc.points.map((p) => ({ re: p.re, im: p.im }))));
  await go('#lab-2-5-1');
  let ro = await readText(page, '#lab-readout');
  assert(ro.includes('1/z') && ro.includes('shapes: 1'), 'A3 2.5.1 readout ' + ro);
  let P = (await pts()).filter((p) => Number.isFinite(p.re) && Number.isFinite(p.im));
  assert(P.length > 20 && P.every((p) => Math.abs(p.re - 0.5) < 1e-6), 'A3 2.5.1 Re w = 1/2; n=' + P.length);
  // independent: every image point inverts back onto |z-1| = 1
  assert(P.every((w) => { const d = w.re * w.re + w.im * w.im; const z = { re: w.re / d, im: -w.im / d }; return Math.abs(Math.hypot(z.re - 1, z.im) - 1) < 1e-6; }), 'A3 2.5.1 inverse lies on circle');
  await go('#lab-2-1-2');
  ro = await readText(page, '#lab-readout'); assert(ro.includes('z^2'), 'A3 2.1.2 readout ' + ro);
  P = await pts(); assert(P.length > 0 && P.every((p) => Math.abs(p.re - (4 - p.im * p.im / 16)) < 1e-6), 'A3 2.1.2 parabola');
  assert(P.every((p) => { const y = p.im / 4; return Math.abs(p.re - (4 - y * y)) < 1e-6; }), 'A3 2.1.2 u = 4 - y^2, v = 4y');
  await go('#lab-2-2-1');
  ro = await readText(page, '#lab-readout'); assert(ro.includes('z^3'), 'A3 2.2.1 readout ' + ro);
  P = await pts(); const A = P.filter((p) => Math.hypot(p.re, p.im) > 1e-9).map((p) => Math.atan2(p.im, p.re));
  assert(A.length > 0 && A.every((a) => a >= -1e-6 && a <= 3 * Math.PI / 4 + 1e-6), 'A3 2.2.1 arg range [' + Math.min(...A) + ', ' + Math.max(...A) + ']');
  assert(Math.max(...A) > 3 * Math.PI / 4 - 0.05 && Math.min(...A) < 0.05, 'A3 2.2.1 range is filled (not just a subset)');
  await go('#lab-P4');
  ro = await readText(page, '#lab-readout'); assert(ro.includes('(1+i)z'), 'A3 P4 readout ' + ro);
  P = await pts(); assert(P.length > 0 && P.every((p) => Math.abs(Math.hypot(p.re, p.im) - Math.SQRT2) < 1e-6), 'A3 P4 |w| = sqrt 2');
  await page.fill('#lab-fn-src', 'z^2 + iz'); await page.click('#lab-fn-apply'); await settle(page, 3);
  assert((await readText(page, '#lab-readout')).includes('z^2 + iz'), 'A3 typed fn readout');
  assert((await readText(page, '#lab-fn-error')) === '', 'A3 no error');
  await page.fill('#lab-fn-src', 'z +'); await page.click('#lab-fn-apply'); await settle(page, 3);
  assert((await readText(page, '#lab-fn-error')) !== '', 'A3 error non-empty: ' + (await readText(page, '#lab-fn-error')));
  assert((await readText(page, '#lab-readout')).includes('z^2 + iz'), 'A3 readout still z^2 + iz');
  const chip = await page.evaluate(() => { const e = document.getElementById('lab-preset-circle1'); return { p: e.getAttribute('data-problem'), href: [...e.querySelectorAll('a')].map((a) => a.getAttribute('href')) }; });
  assert(chip.p === '2.5.1' && chip.href.includes('#problem-2-5-1'), 'A3 preset chip ' + JSON.stringify(chip));

  // ---------- A4 ----------
  await go('#lab', 900);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await go('#home', 300); await go('#lab', 900);
  await clickChip(page, 'lab-predict');
  await clickChip(page, 'lab-preset-unit');
  const w = await page.evaluate(() => { const e = document.getElementById('lab-wplane-wrap'); return { off: e.offsetParent === null, aria: e.getAttribute('aria-hidden'), hidden: e.hidden }; });
  assert(w.off || w.aria === 'true', 'A4 w-plane hidden ' + JSON.stringify(w));
  assert(await page.isVisible('#lab-reveal'), 'A4 reveal visible');
  // the other w-plane copies must be hidden too (morph, 3D, domain), and no w-plane canvas reachable
  const anyW = await page.evaluate(() => [...document.querySelectorAll('#lab-wplane-wrap, #lab-morph-wrap, #lab-view3d-wrap')].map((e) => [e.id, e.offsetParent !== null]));
  assert(anyW.every(([, v]) => !v), 'A4 no output wrapper visible while predicting: ' + JSON.stringify(anyW));
  // predicting: change view to every tab and check the answer never appears
  for (const v of ['morph', 'domain', 'landscape', 'sphere', 'graph4d', 'side']) {
    await clickChip(page, 'lab-view-' + v); await pause(page, 250);
    const vis = await page.evaluate(() => [...document.querySelectorAll('#lab-wplane-wrap, #lab-morph-wrap, #lab-view3d-wrap, #lab-wheel-row, #lab-zplane-dc')].filter((e) => e.offsetParent !== null).map((e) => e.id));
    assert(vis.length === 0, 'A4 while predicting, view ' + v + ' shows ' + JSON.stringify(vis));
  }
  await clickChip(page, 'lab-reveal');
  assert(await page.isVisible('#lab-wplane-wrap'), 'A4 revealed visible');
  await page.evaluate(() => {
    localStorage.setItem('mv:lab.request', JSON.stringify({ fn: 'recip', shapes: [{ kind: 'circle', center: { re: 1, im: 0 }, r: 1 }], view: 'sphere', problem: '2.5.1', predictFirst: false }));
    location.hash = '#home';
  });
  await pause(page, 500);
  await page.evaluate(() => { location.hash = '#lab'; });
  await pause(page, 1200);
  assert((await lab(page, 'view')) === 'sphere', 'A4 view sphere');
  assert((await lab(page, 'shapes')).length === 1, 'A4 shapes 1');
  assert((await readText(page, '#lab-readout')).includes('1/z'), 'A4 readout 1/z');
  assert((await page.evaluate(() => localStorage.getItem('mv:lab.request'))) === null, 'A4 request consumed');
  await shot('sphere-spec');

  // A5 domain colouring with f = z^2 and the unit circle
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await go('#home', 300); await go('#lab', 800);
  if ((await lab(page, 'shapes')).length) await clickChip(page, 'lab-clear');
  await clickChip(page, 'lab-tool-circle');
  await drag(page, 'lab-zplane', { re: 0, im: 0 }, { re: 1, im: 0 });
  await clickChip(page, 'lab-fn-sq');
  await clickChip(page, 'lab-view-domain');
  await page.waitForFunction(() => { const c = document.getElementById('lab-zplane-dc'); return c && c.dataset.dcState === 'ready' && !c.dataset.dcPending; }, null, { timeout: 10000 });
  await pause(page, 400);
  await shot('domain-spec');
  const unit = await lab(page, 'shapes');
  assert(unit.length === 1 && unit[0].spec.kind === 'circle' && unit[0].spec.r === 1, 'A5 unit circle drawn by the tool: ' + JSON.stringify(unit[0] && unit[0].spec));
  assert(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  log('spec script passed');
}
