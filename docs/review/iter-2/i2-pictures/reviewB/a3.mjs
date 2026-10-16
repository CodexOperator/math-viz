// Review B, independent execution of acceptance A3 exactly as the spec words it (throwaway).
//   node tools/smoke.mjs --route problem-1-1-1,graph4d,staircase --script docs/review/iter-2/i2-pictures/reviewB/a3.mjs --dark --out docs/review/iter-2/i2-pictures/reviewB/a3
import { clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';

export const expectedErrors = [/request failed: .*\/media\/video\/[\w-]+\.mp4/];
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const near = (a, b, e) => Math.abs(a - b) <= e;

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 500;
  if (ctx.route === 'problem-1-1-1') {
    // ruler host visible
    const vis = await ev(page, () => { const e = document.getElementById('arithmetic-ruler-host'); if (!e) return 'missing'; const r = e.getBoundingClientRect(); return (r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.hidden) ? 'visible' : 'hidden'; });
    assert(vis === 'visible', `#arithmetic-ruler-host ${vis}`);
    const res = await ev(page, () => window.__mv.arithmetic.plan().ruler.result);
    assert(near(res, Math.sqrt(221), 1e-6), `ruler.result ${res}`);
    const pl = await ev(page, () => { const p = window.__mv.planes.get('arithmetic-plane'); const s = p.getSize(); return { ua: p.getView().unitsAcross, prod: p.toPixel({ re: 5, im: 14 }), w: s.w, h: s.h }; });
    assert(pl.ua <= 12, `unitsAcross ${pl.ua}`);
    assert(pl.prod.y < 0, `product pixel y ${pl.prod.y}`);
    // the state is exactly 1.1.1
    const st = await ev(page, () => window.__mv.arithmetic.state());
    log('state ' + JSON.stringify(st));
    assert(near(st.z1.re, 3, 1e-9) && near(st.z1.im, -2, 1e-9) && near(st.z2.re, -1, 1e-9) && near(st.z2.im, 4, 1e-9) && st.mode === 'mul', 'state is 1.1.1 mul');
    const lab = await ev(page, () => window.__mv.arithmetic.labels());
    log('labels ' + JSON.stringify(lab));
    assert(lab['l-theta1'] === true && lab['l-theta2'] === true, 'both theta labels placed');
    const g = await ev(page, () => document.getElementById('arithmetic-glyph').getAttribute('aria-label'));
    assert(g === 'move: turn 70.3°, stretch 14.866', `glyph ${g}`);
    assert(await ev(page, () => !!document.querySelector('#arithmetic-problem-decisions .decision-chip[data-decision="names"][data-value="none"]')), 'names none chip');
    await ctx.shot('A3-mul');
    // add mode
    await clickChip(page, 'arithmetic-mode-add');
    const after = await ev(page, () => {
      const e = document.getElementById('arithmetic-ruler-host'); const r = e.getBoundingClientRect();
      const p = window.__mv.planes.get('arithmetic-plane'); const s = p.getSize(); const q = p.toPixel({ re: 2, im: 2 });
      return { hiddenAttr: e.hidden, w: r.width, h: r.height, disp: getComputedStyle(e).display, vis: getComputedStyle(e).visibility, q, sw: s.w, sh: s.h };
    });
    log('after add ' + JSON.stringify(after));
    assert(after.hiddenAttr || after.w === 0 || after.disp === 'none' || after.vis === 'hidden', 'ruler host hidden in add');
    assert(after.q.x >= 0 && after.q.x <= after.sw && after.q.y >= 0 && after.q.y <= after.sh, 'sum 2+2i inside the canvas');
    await ctx.shot('A3-add');
    // arithmetic preset request
    await ev(page, () => { location.hash = '#home'; });
    await page.waitForFunction(() => !!document.querySelector('#view [data-station="home"]'), null, { timeout: 5000 });
    await ev(page, () => window.__mv.app.request({ station: 'arithmetic', problem: '1.1.1', family: '1.1.1', values: { z1: { re: 1, im: 2 }, z2: { re: 2, im: -1 }, mode: 'mul' } }));
    await ev(page, () => { location.hash = '#arithmetic'; });
    await page.waitForTimeout(600);
    const st2 = await ev(page, () => window.__mv.arithmetic.state());
    log('preset state ' + JSON.stringify(st2));
    assert(near(st2.z1.re, 1, 1e-9) && near(st2.z1.im, 2, 1e-9), 'z1 = 1 + 2i');
    const ro = await ev(page, () => { const e = document.getElementById('arithmetic-readout'); return e ? e.textContent : document.body.textContent; });
    assert(ro.includes('result = 4 + 3i'), `readout: ${ro.slice(0, 300)}`);
    const note = await ev(page, () => { const e = document.getElementById('arithmetic-problem-note'); return e ? e.textContent : null; });
    log('arith note ' + note);
    await ctx.shot('A3-arith-preset');
  }
  if (ctx.route === 'graph4d') {
    const shapes = await ev(page, () => [...document.querySelectorAll('#graph4d-shadows figure[data-shadow]')].map((f) => f.dataset.shadow));
    assert(JSON.stringify(shapes) === JSON.stringify(['side', 'domain', 're', 'im', 'landscape']), `figures ${shapes}`);
    const act = (id) => ev(page, (i) => document.getElementById(i).dataset.active, id);
    assert(await act('graph4d-shadow-re') === 'true' && await act('graph4d-shadow-im') === 'false', 'start: re active, im not');
    await setSlider(page, 'graph4d-uv', Math.PI / 2);
    assert(await act('graph4d-shadow-im') === 'true' && await act('graph4d-shadow-re') !== 'true', 'uv=pi/2: im active');
    assert(await ev(page, () => window.__mv.graph4d.shadows().active) === 'im', 'hook active im');
    await ctx.shot('A3-im');
    // tap re
    await ev(page, () => document.getElementById('graph4d-shadow-re').scrollIntoView({ block: 'center' }));
    await page.locator('#graph4d-shadow-re').click();
    await settle(page, 3);
    const uv = await ev(page, () => Number(document.getElementById('graph4d-uv').value));
    assert(Math.abs(uv) <= 0.02, `uv after tap ${uv}`);
    assert(await act('graph4d-shadow-re') === 'true', 're active again');
    // overflow
    const ov = await ev(page, () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(ov <= 1, `overflow ${ov}`);
    await ctx.shot('A3-re-again');
  }
  if (ctx.route === 'staircase') {
    assert(await ev(page, () => !!document.querySelector('#staircase-problem-decisions .decision-chip[data-decision="names"][data-value="home"]')), 'names home chip');
    const vid = await ev(page, async () => {
      const m = await import(new URL('./media/manifest.js', location.href).href);
      return { inManifest: m.VIDEOS.some((v) => v.id === 'staircase-roots'), present: !!document.getElementById('video-staircase-roots') };
    });
    log('video ' + JSON.stringify(vid));
    assert(vid.inManifest === vid.present, `video panel presence ${JSON.stringify(vid)} (must equal manifest membership)`);
    await ev(page, () => { location.hash = '#home'; });
    await page.waitForFunction(() => !!document.querySelector('#view [data-station="home"]'), null, { timeout: 5000 });
    await ev(page, () => window.__mv.app.request({ station: 'staircase', problem: '1.3.1', family: '1.3.1', values: { z: { re: 0, im: 2 } } }));
    await ev(page, () => { location.hash = '#staircase'; });
    await page.waitForTimeout(600);
    const st = await ev(page, () => window.__mv.staircase.state());
    log('staircase state ' + JSON.stringify(st));
    assert(near(st.z.re, 0, 1e-9) && near(st.z.im, 2, 1e-9), 'z = 2i');
    const note = await readText(page, '#staircase-problem-note');
    assert(note.includes('Fresh numbers'), `note: ${note}`);
    await ctx.shot('A3-preset');
  }
}
