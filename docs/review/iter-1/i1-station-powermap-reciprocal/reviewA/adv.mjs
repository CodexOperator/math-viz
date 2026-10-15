// Reviewer A adversarial script (does not edit code). Run through tools/smoke.mjs --script.
import { dragHandle, clickChip, readText, setSlider, settle, handleZ } from '/home/user/math-viz/tests/interact/_helpers.mjs';

const out = [];
const check = (ctx, name, cond, detail = '') => { out.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${detail}`); ctx.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${detail}`); };
const img = (page, nm) => page.evaluate((n) => { const a = window.__mv && window.__mv[n]; return a ? { pts: Array.from(a, (p) => [p.re, p.im]), pieces: (a.pieces || []).map((pc) => pc.map((p) => [p.re, p.im])) } : null; }, nm);
const dtex = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? (e.dataset.tex || e.textContent || '') : null; }, id);
const txt = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? e.textContent.trim() : null; }, id);
const shot = async (page, ctx, name) => { try { await ctx.shot(name); } catch (e) { ctx.log('shot fail ' + e.message); } };
const hash = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(700); };

export default async function (page, ctx) {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

  if (ctx.route === 'problem-2-1-2') {
    await settle(page, 4);
    // c = 0
    await dragHandle(page, 'powermap-zplane-line', { re: 0, im: 0 });
    let r = await txt(page, 'powermap-readout');
    check(ctx, 'c=0 readout', /x = 0; image: the negative real axis/.test(r), r);
    const im0 = await img(page, 'powermapImage');
    check(ctx, 'c=0 image on negative real axis', im0.pts.every(([u, v]) => Math.abs(v) < 1e-9 && u <= 1e-9), JSON.stringify(im0.pts.slice(0, 2)));
    let ex = await dtex(page, 'powermap-ex-test-cart');
    check(ctx, 'c=0 test row text', /collapsed/.test(ex || ''), ex);
    // c=-2
    await dragHandle(page, 'powermap-zplane-line', { re: -2, im: 0 });
    r = await txt(page, 'powermap-readout');
    check(ctx, 'c=-2 readout', r === 'x = -2; image: u = 4 - v²/16; focus 0; vertex 4', r);
    // n=3 / fact
    await setSlider(page, 'powermap-n', 3);
    r = await txt(page, 'powermap-readout');
    check(ctx, 'n=3 readout', r === 'image of x = -2 under z^3', r);
    let f = await txt(page, 'powermap-fact');
    check(ctx, 'n=3 fact', f === 'Nearest point of the image to 0: -8, where y = 0.', f);
    // verify the image of x=-2 under z^3: u = x^3-3xy^2, v = 3x^2 y - y^3, nearest -8
    const im3 = await img(page, 'powermapImage');
    const closest = Math.min(...im3.pts.map(([u, v]) => Math.hypot(u, v)));
    check(ctx, 'n=3 nearest to 0 is 8', Math.abs(closest - 8) < 0.2, String(closest));
    const wv = await page.evaluate(() => { const p = window.__mv.planes.get('powermap-wplane').getView(); return p.unitsAcross; });
    check(ctx, 'n=3 w view fitted', wv > 20 && wv < 60, String(wv));
    // c with n=3 expansions
    await setSlider(page, 'powermap-n', 4);
    const u4 = await dtex(page, 'powermap-ex-u-cart');
    check(ctx, 'n=4 u expansion', /x\^4 - 6x\^2y\^2 \+ y\^4/.test(u4 || ''), u4);
    await setSlider(page, 'powermap-n', 2);
    await dragHandle(page, 'powermap-zplane-line', { re: 2, im: 0 });
    // probe drag along line
    await dragHandle(page, 'powermap-zplane-p', { re: 2, im: 3 });
    r = await txt(page, 'powermap-t-out');
    check(ctx, 'probe drag t-out', r === 't = 0.875 (y = 3)', r);
    const wcart = await dtex(page, 'powermap-ex-w-cart');
    check(ctx, 'w for y=3: -5+12i', /-5 \+ 12i/.test(wcart || ''), wcart);
    const argrow = await dtex(page, 'powermap-ex-argw-polar');
    ctx.log('argw polar ' + argrow);
    // probe at y=-4..: Arg w wraps
    await setSlider(page, 'powermap-t', 0);
    const sr0 = await dtex(page, 'powermap-ex-argw-polar');
    ctx.log('t=0 argw ' + sr0);
    // morph
    await setSlider(page, 'powermap-morph', 0.5);
    const mm = await page.evaluate(() => ({ s: window.__mv.powermapMorph.s, n: window.__mv.powermapMorph.pieces.length, first: window.__mv.powermapMorph.pieces[0] && window.__mv.powermapMorph.pieces[0].points[0] }));
    check(ctx, 'morph 0.5 first point (c=2, y=-4): 0.5*(2-4i)+0.5*(-12-16i) = -5-10i', Math.abs(mm.first.re + 5) < 1e-6 && Math.abs(mm.first.im + 10) < 1e-6, JSON.stringify(mm));
    await shot(page, ctx, 'morph05');
    const mh = await txt(page, 'powermap-morph-help');
    check(ctx, 'morph help at 0.5', mh === 'Slide to 1 to see w.', mh);
    await setSlider(page, 'powermap-morph', 1);
    // theme toggle while mounted
    await page.evaluate(() => { const b = document.querySelector('[data-theme-toggle], #theme-toggle, button[aria-label*="theme" i]'); if (b) b.click(); });
    await settle(page, 4);
    await shot(page, ctx, 'themetoggled');
    // reduced motion: play becomes Step
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await hash(page, '#problem-2-2-1');
    await hash(page, '#problem-2-1-2');
    const pl = await txt(page, 'powermap-play');
    check(ctx, 'reduced motion play label', pl === 'Step', pl);
    await setSlider(page, 'powermap-t', 0.5);
    await clickChip(page, 'powermap-play');
    const t1 = await txt(page, 'powermap-t-out');
    check(ctx, 'reduced step t +0.125', t1.startsWith('t = 0.625'), t1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // sector probe at t=0 (z = 0)
    await hash(page, '#problem-2-2-1');
    await setSlider(page, 'powermap-t', 0);
    r = await txt(page, 'powermap-t-out');
    check(ctx, 'sector t=0 out', r.startsWith('t = 0') && /edge a/.test(r), r);
    const zr = await dtex(page, 'powermap-ex-argw-polar');
    check(ctx, 'z=0 no angle', /no angle/.test(zr || ''), zr);
    const st = await txt(page, 'powermap-stairs');
    ctx.log('stairs at z=0: ' + st.slice(0, 160));
    await shot(page, ctx, 'sector-zero');
    // sector edge across the negative real axis
    await setSlider(page, 'powermap-t', 0.5);
    await dragHandle(page, 'powermap-zplane-s1', { re: -2.4, im: 0.4 });
    r = await txt(page, 'powermap-readout');
    check(ctx, 'sector b to 170deg', /0 < arg z < 2\.967/.test(r), r);
    await dragHandle(page, 'powermap-zplane-s0', { re: -2.4, im: -0.4 });
    r = await txt(page, 'powermap-readout');
    ctx.log('after a past -x: ' + r);
    // a reaches -170 deg (step -34) with b=34 steps: width 68 steps -> ok
    const imS = await img(page, 'powermapImage');
    check(ctx, 'sector images finite', imS.pts.every(([u, v]) => Number.isFinite(u) && Number.isFinite(v)));
    await shot(page, ctx, 'sector-wide');
    // reset sector
    await clickChip(page, 'powermap-reset');
    await page.waitForTimeout(600);
    // n slider while sector, n=2 refit
    await setSlider(page, 'powermap-n', 2);
    r = await txt(page, 'powermap-readout');
    check(ctx, 'sector n=2 readout', r === 'sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 1.571 (pi/2)', r);
    const fy = await txt(page, 'powermap-fact');
    ctx.log('fact ' + fy);
    // input switch back to line
    await clickChip(page, 'powermap-input-line');
    const lede = await txt(page, 'powermap-lede');
    ctx.log('lede line ' + lede);
    const pn = await txt(page, 'powermap-problem-note');
    check(ctx, 'problem note after switching to line n=2', /problem 2\.1\.2 exactly/.test(pn || '') || /changed/.test(pn || ''), pn);
    // Lab button
    await clickChip(page, 'powermap-open-lab');
    await page.waitForTimeout(600);
    const hh = await page.evaluate(() => location.hash);
    check(ctx, 'lab hand-off navigates to #lab', hh === '#lab', hh);
    const labReq = await page.evaluate(() => { try { return JSON.stringify(window.__mv && window.__mv.labRequest || null); } catch (e) { return String(e); } });
    ctx.log('lab hash ' + hh);
    await hash(page, '#problem-2-1-2');
    // repeated mount/unmount
    for (let i = 0; i < 4; i++) { await hash(page, '#reciprocal'); await hash(page, '#powermap'); }
    const leak = await page.evaluate(() => ({ planes: [...window.__mv.planes.keys()], views: window.__mv.views3d ? window.__mv.views3d.size : 'n/a' }));
    check(ctx, 'after 4 round trips only powermap planes', leak.planes.every((k) => k.startsWith('powermap')) && leak.planes.length === 2, JSON.stringify(leak));
  } else if (ctx.route === 'problem-2-5-1') {
    await settle(page, 4);
    // p to 0
    await dragHandle(page, 'reciprocal-zplane-p', { re: 0, im: 0 });
    let r = await txt(page, 'reciprocal-readout');
    check(ctx, 'p=0 readout', /p = 0; 1\/p = inf; \|1\/p\| = inf/.test(r), r);
    const e0 = await dtex(page, 'reciprocal-ex-inv-cart');
    check(ctx, 'p=0 explainer NOINF', /point at infinity/.test(e0 || ''), e0);
    const same = await page.evaluate(() => { const e = document.getElementById('reciprocal-ex-same'); return e ? e.dataset.agree + '|' + e.textContent.trim().slice(0, 80) : null; });
    ctx.log('same at p=0: ' + same);
    const qh = await page.evaluate(() => { const e = document.getElementById('reciprocal-wplane-q'); return e ? (e.hidden || getComputedStyle(e).display === 'none' || e.getAttribute('aria-hidden')) : 'missing'; });
    ctx.log('q hidden at p=0: ' + qh);
    await shot(page, ctx, 'p-zero');
    await setSlider(page, 'reciprocal-sphere-turn', 1);
    await shot(page, ctx, 'p-zero-turn');
    await setSlider(page, 'reciprocal-sphere-turn', 0);
    // restore p
    await dragHandle(page, 'reciprocal-zplane-p', { re: 1, im: 1 });
    // center drag to make through-0 circle: c=(0.6,0.8) r=1
    await dragHandle(page, 'reciprocal-zplane-c', { re: 0.6, im: 0.8 });
    r = await txt(page, 'reciprocal-readout');
    ctx.log('after c drag: ' + r);
    const rr = await handleZ(page, 'reciprocal-zplane-r');
    ctx.log('r handle ' + JSON.stringify(rr));
    const flags = await page.evaluate(() => ['circle1', 'line', 'circle0', 'unit'].map((k) => document.getElementById('reciprocal-preset-' + k).getAttribute('aria-pressed')));
    check(ctx, 'no preset pressed after drag', flags.every((x) => x === 'false'), flags.join(','));
    // set r to 1 exactly via radius handle: current r handle at c + r e^{i bearing}
    await dragHandle(page, 'reciprocal-zplane-r', { re: 0.6 + Math.cos(-Math.PI / 4), im: 0.8 + Math.sin(-Math.PI / 4) });
    r = await txt(page, 'reciprocal-readout');
    ctx.log('after r drag: ' + r);
    const fin = await img(page, 'reciprocalImage');
    // image residual: line 0.6u - 0.8v = 0.5 when through 0
    if (/image: line/.test(r)) {
      const maxres = Math.max(...fin.pts.filter(([u]) => Number.isFinite(u)).map(([u, v]) => Math.abs(0.6 * u - 0.8 * v - 0.5)));
      check(ctx, 'through-0 circle image on line 0.6u-0.8v=0.5', maxres < 1e-6, String(maxres));
    } else check(ctx, 'through-0 circle shows line', false, r);
    const steps = fin.pieces.map((pc) => Math.max(0, ...pc.slice(1).map((p, i) => Math.hypot(p[0] - pc[i][0], p[1] - pc[i][1]))));
    check(ctx, 'pieces step <= 5', steps.every((s) => s <= 5), steps.join(','));
    await shot(page, ctx, 'custom-circle');
    // near hint
    await dragHandle(page, 'reciprocal-zplane-c', { re: 1.1, im: 0 });
    await dragHandle(page, 'reciprocal-zplane-r', { re: 1.1 + Math.cos(-Math.PI / 4), im: Math.sin(-Math.PI / 4) });
    r = await txt(page, 'reciprocal-readout');
    ctx.log('near: ' + r);
    const near = await page.evaluate(() => { const e = document.getElementById('reciprocal-near'); return e && !e.hidden; });
    ctx.log('near hint visible: ' + near);
    const wnote = await page.evaluate(() => { const e = document.getElementById('reciprocal-wnote'); return e && !e.hidden; });
    ctx.log('wnote visible: ' + wnote);
    await shot(page, ctx, 'near-hint');
    // big circle at the edge
    await dragHandle(page, 'reciprocal-zplane-c', { re: 3, im: 3 });
    r = await txt(page, 'reciprocal-readout');
    ctx.log('c=(3,3): ' + r);
    await shot(page, ctx, 'edge-circle');
    // line preset: drag a == b refusal
    await clickChip(page, 'reciprocal-preset-line');
    await dragHandle(page, 'reciprocal-zplane-a', { re: 1, im: 1.5 });
    r = await txt(page, 'reciprocal-readout');
    ctx.log('line a=b attempt: ' + r);
    const a = await handleZ(page, 'reciprocal-zplane-a');
    check(ctx, 'a=b refused (a springs back)', Math.abs(a.im - -1.5) < 1e-6, JSON.stringify(a));
    // line through 0: a = (-1,-1), b = (1,1)
    await dragHandle(page, 'reciprocal-zplane-a', { re: -1, im: -1 });
    await dragHandle(page, 'reciprocal-zplane-b', { re: 1, im: 1 });
    r = await txt(page, 'reciprocal-readout');
    ctx.log('line through 0: ' + r);
    const f2 = await img(page, 'reciprocalImage');
    const f2max = Math.max(...f2.pts.filter(([u]) => Number.isFinite(u)).map(([u, v]) => Math.abs(u + v)));
    check(ctx, 'image of y=x is y=-x', f2max < 1e-6, String(f2max));
    await shot(page, ctx, 'line0');
    // stage mirror morph states
    await clickChip(page, 'reciprocal-preset-unit');
    await clickChip(page, 'reciprocal-stage-mirror');
    await setSlider(page, 'reciprocal-morph', 0.5);
    await shot(page, ctx, 'unit-mirror-morph');
    const mp = await page.evaluate(() => window.__mv.reciprocalMorph);
    ctx.log('mirror morph pieces ' + mp.pieces.length);
    await setSlider(page, 'reciprocal-morph', 1);
    await clickChip(page, 'reciprocal-stage-invert');
    await shot(page, ctx, 'unit-invert');
    await clickChip(page, 'reciprocal-stage-both');
    // play
    await clickChip(page, 'reciprocal-play');
    await page.waitForTimeout(1500);
    const ph = await txt(page, 'reciprocal-readout');
    ctx.log('during play: ' + ph);
    const pb = await txt(page, 'reciprocal-play');
    check(ctx, 'play label Pause while running', pb === 'Pause', pb);
    await clickChip(page, 'reciprocal-preset-circle1');
    const pb2 = await txt(page, 'reciprocal-play');
    check(ctx, 'play stopped by preset', pb2 === 'Run p along the shape', pb2);
    // reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await hash(page, '#powermap');
    await hash(page, '#problem-2-5-1');
    const rp = await txt(page, 'reciprocal-play'), rt = await txt(page, 'reciprocal-sphere-play');
    check(ctx, 'reduced-motion labels', rp === 'Step p' && rt === 'Jump', rp + '|' + rt);
    await clickChip(page, 'reciprocal-sphere-play');
    const tt = await txt(page, 'reciprocal-sphere-turn-out');
    check(ctx, 'jump turns to 180', tt === '180 degrees', tt);
    await clickChip(page, 'reciprocal-play');
    r = await txt(page, 'reciprocal-readout');
    ctx.log('step p: ' + r);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // sphere play (not reduced)
    await hash(page, '#powermap');
    await hash(page, '#problem-2-5-1');
    await clickChip(page, 'reciprocal-sphere-play');
    await page.waitForTimeout(1200);
    const mid = await txt(page, 'reciprocal-sphere-turn-out');
    ctx.log('sphere turn mid-play: ' + mid);
    await page.waitForTimeout(2300);
    const end = await txt(page, 'reciprocal-sphere-turn-out');
    check(ctx, 'sphere turn ends at 180', end === '180 degrees', end);
    // theme toggle
    await page.evaluate(() => { const b = document.querySelector('[data-theme-toggle], #theme-toggle, button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]'); if (b) b.click(); });
    await settle(page, 4);
    await shot(page, ctx, 'theme-toggled-sphere180');
    // deep link tokens
    for (const tok of ['reciprocal-line', 'reciprocal-mirror']) { /* tokens are not routes; skip */ }
    // many round trips: leaks
    for (let i = 0; i < 4; i++) { await hash(page, '#powermap'); await hash(page, '#reciprocal'); }
    const leak = await page.evaluate(() => ({ planes: [...window.__mv.planes.keys()], views: window.__mv.views3d ? window.__mv.views3d.size : 'n/a' }));
    check(ctx, 'after round trips only reciprocal planes + 1 view', leak.planes.every((k) => k.startsWith('reciprocal')) && leak.planes.length === 2 && leak.views === 1, JSON.stringify(leak));
  }
  ctx.log('CONSOLE: ' + JSON.stringify(errs));
  ctx.log('SUMMARY ' + out.filter((l) => l.startsWith('FAIL')).length + ' fails of ' + out.length);
}
