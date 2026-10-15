// Review B throwaway: adversarial checks for i1-station-lab (handoffs, lifecycle, predict leaks, clock across views, phone).
import { clickChip, planePixel, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';

const pause = (page, ms) => page.waitForTimeout(ms);
const lab = (page, n) => page.evaluate((k) => window.__mv.lab[k](), n);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

export default async function (page, ctx) {
  const { assert, log, shot, viewport } = ctx;
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const go = async (h, ms = 800) => { await page.evaluate((x) => { location.hash = x; }, h); await pause(page, ms); };
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  // ---------- handoffs from the four stations that have an Open in the Lab button ----------
  const hand = async (route, btn, want) => {
    await go('#' + route, 1000);
    const b = await page.$('#' + btn);
    assert(!!b, `${route}: #${btn} exists`);
    await clickChip(page, btn);
    await pause(page, 1300);
    const st = await page.evaluate(() => ({ hash: location.hash, view: window.__mv.lab && window.__mv.lab.view(), n: window.__mv.lab && window.__mv.lab.shapes().length, ro: document.getElementById('lab-readout').textContent,
      prob: document.getElementById('lab-problem') && !document.getElementById('lab-problem').hidden ? document.getElementById('lab-problem').dataset.problem : null,
      req: localStorage.getItem('mv:lab.request') }));
    log(`${route} -> ${JSON.stringify(st)}`);
    assert(st.hash === '#lab' && st.view === want.view && st.n === want.n && st.ro.includes(want.fn) && st.req === null, `${route} handoff: ${JSON.stringify(st)}`);
    assert((await overflow(page)) <= 1, `${route} handoff no overflow`);
    return st;
  };
  await hand('reciprocal', 'reciprocal-open-lab', { view: 'side', n: 1, fn: '1/z' });
  await hand('powermap', 'powermap-open-lab', { view: 'side', n: 1, fn: 'z^2' });
  await hand('linear', 'linear-open-lab', { view: 'side', n: 1, fn: '' });
  await hand('mappings', 'mappings-open-lab', { view: 'morph', n: 2, fn: 'z^2 + iz' });
  await shot('mappings-handoff');

  // ---------- predict-first: nothing on the whole page states the answer ----------
  const leak = async (what) => page.evaluate(async () => {
    const { problemById } = await import('./js/data/problems.js');
    const id = document.getElementById('lab-problem') && !document.getElementById('lab-problem').hidden ? document.getElementById('lab-problem').dataset.problem : null;
    if (!id) return { id: null };
    const p = problemById(id);
    const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
    const body = norm(document.body.innerText);
    const attrs = [];
    for (const e of document.querySelectorAll('#view *')) for (const a of ['title', 'aria-label', 'alt', 'data-answer']) { const v = e.getAttribute && e.getAttribute(a); if (v) attrs.push(norm(v)); }
    const frag = (s) => norm(s).slice(0, 28);
    const needles = { aha: frag(p.aha), ans: frag(p.answer.text), cart: frag(p.routes.cart), polar: frag(p.routes.polar) };
    const hit = {};
    for (const [k, nd] of Object.entries(needles)) {
      hit[k] = { body: body.includes(nd), attr: attrs.some((a) => a.includes(nd)) };
    }
    const hidden = { why: !!(document.getElementById('lab-problem-why') && document.getElementById('lab-problem-why').offsetParent), ans: !!(document.getElementById('lab-problem-answer') && document.getElementById('lab-problem-answer').offsetParent) };
    return { id, hit, hidden, needles };
  });
  await go('#lab', 900);
  await clickChip(page, 'lab-predict');
  for (const k of ['x2', 'circle1', 'unit', 'sector', 'annulus', 'segment']) {
    await clickChip(page, `lab-preset-${k}`);
    await pause(page, 100);
    const r = await leak();
    const bad = Object.entries(r.hit).filter(([, v]) => v.body || v.attr).map(([n]) => n);
    assert(bad.length === 0 && !r.hidden.why && !r.hidden.ans, `predict leak on ${k}: ${JSON.stringify(r)}`);
  }
  // tokens with predict on from a request
  await page.evaluate(() => {
    localStorage.setItem('mv:lab.request', JSON.stringify({ fn: 'recip', shapes: [{ kind: 'circle', center: { re: 1, im: 0 }, r: 1 }], view: 'landscape', problem: '2.5.1', predictFirst: true }));
    location.hash = '#home';
  });
  await pause(page, 400); await go('#lab', 1200);
  assert(await lab(page, 'answerHidden'), 'request with predictFirst hides the answer');
  assert(await page.isVisible('#lab-reveal'), 'reveal visible after predictFirst request');
  assert((await page.evaluate(() => window.__mv.views3d ? window.__mv.views3d.size : 0)) === 0, 'no 3D view built while the answer is hidden');
  const r2 = await leak();
  assert(Object.values(r2.hit).every((v) => !v.body && !v.attr), 'predictFirst request leak: ' + JSON.stringify(r2));
  await clickChip(page, 'lab-reveal'); await pause(page, 700);
  assert((await page.evaluate(() => window.__mv.views3d.size)) === 1, '3D view built after reveal');

  // ---------- the clock is global across the six views ----------
  await go('#lab-2-1-2', 900);
  await clickChip(page, 'lab-view-side');
  await setSlider(page, 'lab-t', 0.7);
  for (const v of ['morph', 'domain', 'landscape', 'sphere', 'graph4d', 'side']) {
    await clickChip(page, 'lab-view-' + v); await pause(page, 400);
    const ro = await readText(page, '#lab-readout');
    assert(ro.includes('t = 0.7'), `clock stays 0.7 in ${v}: ${ro}`);
    assert(Math.abs((await lab(page, 't')) - 0.7) < 1e-9, `t hook in ${v}`);
  }
  // w(t) equals f(z(t)) on the image curve at t = 0.7: x = 2 under z^2: z = 2 + iy, y = -4 + 8*0.7 = 1.6
  const wt = await page.evaluate(() => {
    const pcs = window.__mv.lab.images();
    let best = null;
    for (const pc of pcs) for (const p of pc.points) if (!best || Math.abs(p.t - 0.7) < Math.abs(best.t - 0.7)) best = p;
    return best;
  });
  const y = -4 + 8 * wt.t; // line parameter: independent of pointAt
  assert(Math.abs(wt.re - (4 - y * y)) < 1e-6 && Math.abs(wt.im - 4 * y) < 1e-6, `w(t) = (2 + iy)^2 at t=${wt.t}: ${JSON.stringify(wt)}`);

  // ---------- lifecycle: leave and come back, nothing leaks ----------
  for (const v of ['landscape', 'sphere', 'graph4d', 'domain']) {
    await clickChip(page, 'lab-view-' + v); await pause(page, 350);
    await go('#home', 350);
    const after = await page.evaluate(() => ({ hook: !!(window.__mv && window.__mv.lab), v3: window.__mv.views3d ? window.__mv.views3d.size : 0, planes: [...window.__mv.planes.keys()].filter((k) => k.startsWith('lab-')), canv: document.querySelectorAll('canvas.lab-dc').length, style: !!document.head.querySelector('style[data-for="lab"]') }));
    assert(!after.hook && after.v3 === 0 && after.planes.length === 0 && after.canv === 0 && !after.style, `lifecycle after leaving from ${v}: ${JSON.stringify(after)}`);
    await go('#lab', 700);
  }
  // quick-fire: switch every view without waiting; then leave while a play is running
  await clickChip(page, 'lab-play');
  for (let i = 0; i < 3; i++) for (const v of ['landscape', 'sphere', 'graph4d', 'domain', 'morph', 'side']) await page.click('#lab-view-' + v);
  await go('#home', 300);
  await go('#lab', 700);
  assert((await page.evaluate(() => window.__mv.views3d.size)) === 0, 'back on the lab, side view, no stray 3D view');

  // ---------- phone/desktop overflow with every preset in every view ----------
  for (const k of ['x2', 'circle1', 'unit', 'sector', 'annulus', 'segment']) {
    await clickChip(page, `lab-preset-${k}`);
    for (const v of ['side', 'morph', 'domain', 'landscape', 'sphere', 'graph4d']) {
      await clickChip(page, 'lab-view-' + v); await pause(page, 250);
      const o = await overflow(page);
      assert(o <= 1, `overflow ${o} for preset ${k} in ${v}`);
    }
  }
  await clickChip(page, 'lab-view-morph'); await pause(page, 400);
  await shot('morph-segment');
  await clickChip(page, 'lab-view-side');

  // ---------- typed function: hostile input ----------
  for (const src of ['', '   ', 'z^', '((((', 'sqrt(', 'zzz', '1/0', 'z^1000', 'log(0)', 'exp(1000 z)', '<img src=x onerror=alert(1)>', 'z^2 + '.repeat(40) + '1']) {
    await page.fill('#lab-fn-src', src);
    await page.click('#lab-fn-apply');
    await settle(page, 3);
    const ro = await readText(page, '#lab-readout');
    assert(!ro.includes('NaN'), `typed ${JSON.stringify(src.slice(0, 20))} leaves no NaN in readout: ${ro.slice(0, 80)}`);
  }
  assert((await page.evaluate(() => !document.querySelector('#lab-fn-echo img'))), 'no HTML injection through the echo');
  assert((await overflow(page)) <= 1, 'no overflow after hostile input');
  await page.fill('#lab-fn-src', 'z^2'); await page.click('#lab-fn-apply');
  // hostile LabRequests
  const reqs = [
    { fn: { src: 'z +' }, shapes: [{ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }], view: 'sphere' },
    { fn: 'nonsense', shapes: [{ kind: 'circle', center: { re: 'x', im: 0 }, r: -1 }, { kind: 'polygon', vertices: [[1, 2]] }, null, 5, { kind: 'rect', a: { re: 1, im: 1 }, b: { re: 1, im: 1 } }], view: 'nowhere', problem: 'zz' },
    'a string', 5, [], { shapes: 'no' },
    { fn: 'recip', shapes: [{ kind: 'circle', center: { re: 1e12, im: -1e12 }, r: 1e300 }], view: 'graph4d' },
  ];
  for (const rq of reqs) {
    await page.evaluate((r) => { localStorage.setItem('mv:lab.request', JSON.stringify(r)); location.hash = '#home'; }, rq);
    await pause(page, 350); await go('#lab', 1000);
    assert(!!(await page.evaluate(() => window.__mv.lab)), 'lab mounted for hostile request ' + JSON.stringify(rq).slice(0, 60));
    assert(!(await readText(page, '#lab-readout')).includes('NaN'), 'no NaN for hostile request ' + JSON.stringify(rq).slice(0, 60));
  }
  assert(errs.length === 0, 'errors: ' + errs.slice(0, 5).join(' | '));
  log('adv passed');
}
