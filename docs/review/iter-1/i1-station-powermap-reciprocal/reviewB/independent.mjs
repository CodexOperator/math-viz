// Review B independent check of A2 and A4, written from the goal text (not from the builder's script).
import { dragHandle, clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';

const mv = (page, name) => page.evaluate((n) => {
  const a = window.__mv[n];
  return a ? { pts: Array.from(a, (p) => [p.re, p.im]), pieces: (a.pieces || []).map((pc) => pc.map((p) => [p.re, p.im])) } : null;
}, name);

export default async function (page, ctx) {
  const { route, assert, log, shot } = ctx;
  const R = (id) => readText(page, id);
  const poll = async (id, pred) => { let t; for (let i = 0; i < 40; i++) { t = await R(id); if (pred(t)) return t; await settle(page, 2); } return t; };
  await page.waitForTimeout(500);

  if (route === 'problem-2-1-2') {
    let t = await poll('#powermap-readout', (s) => s.includes('x = 2'));
    log('readout: ' + t);
    assert(t.includes('x = 2'), 'A2 x = 2');
    assert(/u = 4 - v(²|\^2)\/16/.test(t), 'A2 u = 4 - v²/16');
    assert(t.includes('focus 0'), 'A2 focus 0');
    const img = await mv(page, 'powermapImage');
    const worst = Math.max(...img.pts.map(([u, v]) => Math.abs(u - (4 - v * v / 16))));
    log('n pts ' + img.pts.length + ' worst ' + worst);
    assert(worst < 1e-6, 'A2 image points on parabola');
    // independent: image of z = 2 + iy under z^2 is (4 - y^2) + 4iy  -> check ordering of param
    await dragHandle(page, 'powermap-zplane-line', { re: 1, im: 0 });
    t = await poll('#powermap-readout', (s) => s.includes('x = 1'));
    log('readout: ' + t);
    assert(t.includes('x = 1') && /u = 1 - v(²|\^2)\/4/.test(t), 'A2 x = 1 -> u = 1 - v²/4');
    const img1 = await mv(page, 'powermapImage');
    assert(Math.max(...img1.pts.map(([u, v]) => Math.abs(u - (1 - v * v / 4)))) < 1e-6, 'A2 image on x=1 parabola');
    await dragHandle(page, 'powermap-zplane-line', { re: 2, im: 0 });
    // A3 shots
    await clickChip(page, 'powermap-grid-cart'); await settle(page, 4); await shot('cart');
    await clickChip(page, 'powermap-grid-polar'); await settle(page, 4); await shot('polar');
    // hash to 2-2-1
    await page.evaluate(() => { location.hash = '#problem-2-2-1'; });
    await page.waitForTimeout(600);
  }
  if (route === 'problem-2-1-2' || route === 'problem-2-2-1') {
    let t = await poll('#powermap-readout', (s) => s.includes('0 < arg z < 0.785'));
    log('sector readout: ' + t);
    assert(t.includes('0 < arg z < 0.785') && t.includes('0 < arg w < 2.356'), 'A2 sector readout');
    const img = await mv(page, 'powermapImage');
    const args = img.pts.map(([u, v]) => Math.atan2(v, u));
    log('Arg range ' + Math.min(...args) + ' .. ' + Math.max(...args));
    assert(args.every((a) => a >= -1e-6 && a <= 3 * Math.PI / 4 + 1e-6), 'A2 Arg in [0, 3π/4]');
    await setSlider(page, 'powermap-n', 6);
    t = await poll('#powermap-readout', (s) => s.includes('4.712'));
    log('n=6 readout: ' + t);
    assert(t.includes('4.712') && !t.includes('(overlaps'), 'A2 n=6');
    await dragHandle(page, 'powermap-zplane-s1', { re: 0, im: 2 });
    t = await poll('#powermap-readout', (s) => s.includes('(overlaps itself)'));
    log('overlap readout: ' + t);
    assert(t.includes('(overlaps itself)'), 'A2 overlaps itself');
  }

  if (route === 'problem-2-5-1') {
    let t = await R('#reciprocal-readout');
    log('readout: ' + t);
    assert(t.includes('line Re w = 0.5'), 'A4 line Re w = 0.5');
    const img = await mv(page, 'reciprocalImage');
    const fin = img.pts.filter(([u, v]) => Number.isFinite(u) && Number.isFinite(v));
    assert(fin.every(([u]) => Math.abs(u - 0.5) < 1e-6), 'A4 |Re w - 0.5| < 1e-6');
    let maxStep = 0;
    for (const pc of img.pieces) for (let i = 1; i < pc.length; i++) maxStep = Math.max(maxStep, Math.hypot(pc[i][0] - pc[i - 1][0], pc[i][1] - pc[i - 1][1]));
    log('pieces ' + img.pieces.length + ' maxStep ' + maxStep + ' finite ' + fin.length + ' of ' + img.pts.length);
    assert(maxStep <= 5, 'A4 no step > 5');
    // independent: every image point equals 1/z for z on |z-1|=1, i.e. |1/w - 1| = 1
    assert(fin.every(([u, v]) => { const d = u * u + v * v; return Math.abs(Math.hypot(u / d - 1, -v / d) - 1) < 1e-6; }), 'A4 each finite w has |1/w - 1| = 1 (it came from the circle)');
    await dragHandle(page, 'reciprocal-zplane-p', { re: 2, im: 0 });
    t = await poll('#reciprocal-readout', (s) => s.includes('p = 2;'));
    log(t); assert(t.includes('p = 2') && t.includes('1/p = 0.5'), 'A4 p=2');
    await dragHandle(page, 'reciprocal-zplane-p', { re: 1, im: 1 });
    t = await poll('#reciprocal-readout', (s) => s.includes('1/p = 0.5 - 0.5i'));
    log(t); assert(t.includes('1/p = 0.5 - 0.5i'), 'A4 p=1+i');
    await dragHandle(page, 'reciprocal-zplane-p', { re: 0.02, im: 0.2 });
    t = await poll('#reciprocal-readout', (s) => /\|1\/p\| = [0-9.]+/.test(s));
    log(t);
    const m = Number(/\|1\/p\| = ([0-9.]+)/.exec(t)[1]);
    assert(m > 4, 'A4 |1/p| > 4 near 0 (got ' + m + ')');
    await clickChip(page, 'reciprocal-preset-line');
    await settle(page, 4);
    t = await R('#reciprocal-readout');
    log(t);
    assert(t.includes('circle') && t.includes('through 0'), 'A4 line preset image circle through 0');
    await clickChip(page, 'reciprocal-preset-unit');
    await settle(page, 4);
    t = await R('#reciprocal-readout');
    log(t);
    assert(t.includes('image: circle |w| = 1'), 'A4 unit preset');
    await clickChip(page, 'reciprocal-preset-circle1');
    await settle(page, 4);
    await clickChip(page, 'reciprocal-stage-invert'); await settle(page, 6); await shot('invert');
    await clickChip(page, 'reciprocal-stage-both'); await settle(page, 6); await shot('both');
  }
}
