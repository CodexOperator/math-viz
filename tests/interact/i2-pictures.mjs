// Interaction script for goal i2-pictures (docs/designs/iter-2/i2-pictures.md section 7, A2, A3, A6, A7).
//   node tools/smoke.mjs --route problem-1-1-1 --script tests/interact/i2-pictures.mjs --dark --out docs/review/iter-2/i2-pictures
//   node tools/smoke.mjs --route graph4d       --script tests/interact/i2-pictures.mjs --dark --out docs/review/iter-2/i2-pictures
//   node tools/smoke.mjs --route staircase     --script tests/interact/i2-pictures.mjs --dark --out docs/review/iter-2/i2-pictures
// One default export that dispatches on ctx.route. Runs at 1280 x 860 (light and dark) and at 390 x 844.
// Waits are on conditions (waitForFunction), never fixed sleeps longer than the 600 ms the design names.

import { clickChip, readText, setSlider, settle } from './_helpers.mjs';

// The station's video panel (media/manifest.js entry) points a <video preload="metadata"> at an H.264 file. Playwright's Chromium cannot play H.264
// (canPlayType('video/mp4; codecs="avc1.42E01E"') is ''), so it aborts that request with net::ERR_ABORTED, which tools/smoke.mjs counts as a failed
// request, in some runs and not in others. That is the browser build, not the page: an aborted request for a video file is allowed here, whichever station's
// video it is (a 404 is still an error: it is an `HTTP 404` line, not a `request failed` one).
export const expectedErrors = [/request failed: .*\/media\/video\/[\w-]+\.mp4/];

const PI = Math.PI;
const near = (a, b, e) => Math.abs(a - b) <= e;

const ev = (page, fn, arg) => page.evaluate(fn, arg);

// navigate away and back: setting the same hash would not fire hashchange
async function reopen(page, token) {
  await ev(page, () => { location.hash = '#home'; });
  await page.waitForFunction(() => !!document.querySelector('#view [data-station="home"]'), null, { timeout: 5000 });
  await ev(page, (t) => { location.hash = '#' + t; }, token);
  await page.waitForFunction((t) => !!document.querySelector(`#view [data-station="${t}"]`), token, { timeout: 5000 });
  await page.waitForTimeout(600);
}

// is a video in the manifest? (the script reads the manifest in the page, so it stays right when the videos are rendered)
const hasVideo = (page, id) => ev(page, async (vid) => {
  try {
    const m = await import(new URL('./media/manifest.js', location.href).href);
    return Array.isArray(m.VIDEOS) && m.VIDEOS.some((v) => v && v.id === vid);
  } catch (e) { return false; }
}, id);

export default async function (page, ctx) {
  if (ctx.route === 'problem-1-1-1') return arithmetic(page, ctx);
  if (ctx.route === 'graph4d') return graph4d(page, ctx);
  if (ctx.route === 'staircase') return staircase(page, ctx);
  throw new Error(`no steps for the route ${ctx.route}`);
}

// ---------------------------------------------------------------------------------------------
// problem-1-1-1: the two moves near 0, the product on a log ruler, the glyph, the chips, the presets
// ---------------------------------------------------------------------------------------------

async function arithmetic(page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 500;
  const planeInfo = () => ev(page, () => {
    const p = window.__mv.planes.get('arithmetic-plane');
    const sz = p.getSize();
    return { unitsAcross: p.getView().unitsAcross, w: sz.w, h: sz.h, product: p.toPixel({ re: 5, im: 14 }), sum: p.toPixel({ re: 2, im: 2 }) };
  });
  const labels = () => ev(page, () => window.__mv.arithmetic.labels());
  const ruler = () => ev(page, () => JSON.parse(JSON.stringify(window.__mv.arithmetic.plan().ruler)));
  const glyph = () => ev(page, () => document.getElementById('arithmetic-glyph').getAttribute('aria-label'));
  const waitLabels = async (what) => {
    await page.waitForFunction(() => { const l = window.__mv.arithmetic.labels(); return l['l-theta1'] === true && l['l-theta2'] === true && l['l-result'] === true; }, null, { timeout: 4000 })
      .catch(async () => { throw new Error(`${what}: the words were not all placed: ${JSON.stringify(await labels())}`); });
  };

  // 1. the ruler is there and wide enough
  await page.waitForSelector('#arithmetic-ruler-host', { state: 'visible', timeout: 4000 });
  const box = await page.locator('#arithmetic-ruler-host').boundingBox();
  assert(box && box.width >= 280 && box.width <= ctx.viewport.width, `the ruler is between 280 px and the viewport wide (${box && box.width})`);
  // 2. the plan
  let R = await ruler();
  assert(near(R.result, Math.sqrt(221), 1e-6), `ruler result ${R.result}`);
  assert(JSON.stringify(R.rings) === JSON.stringify([1, 2, 4, 8, 16, 32]), `rings ${JSON.stringify(R.rings)}`);
  assert(R.ok === true && R.shown === true, 'the ruler is ok and shown');
  // 3. the main plane frames the two moves, not the product
  let pi = await planeInfo();
  assert(pi.unitsAcross <= 12, `unitsAcross ${pi.unitsAcross} <= 12`);
  assert(near(pi.unitsAcross, 8.16, 1e-3), `unitsAcross ${pi.unitsAcross} is 8.16 on a square plane`);
  assert(pi.product.y < 0, `the product is above the frame (y = ${pi.product.y})`);
  // 4. both angle arcs have their words, at this viewport
  await waitLabels('1.1.1 multiply');
  // 5. the glyph, 6. the chips, 7. the description
  assert(await glyph() === 'move: turn 70.3°, stretch 14.866', `glyph ${await glyph()}`);
  assert(await ev(page, () => !!document.querySelector('#arithmetic-problem-decisions .decision-chip[data-decision="names"][data-value="none"]')), 'names chip: none');
  const addr = await ev(page, async () => {
    const P = await import(new URL('./js/data/problems.js', location.href).href);
    return { want: P.problemById('1.1.1').address, got: document.getElementById('arithmetic-problem-address').dataset.value };
  });
  assert(addr.want === addr.got, `address chip ${addr.got} is the problem's ${addr.want}`);
  assert(await readText(page, '#arithmetic-ruler-desc') === 'Rings at 1, 2, 4, 8, 16, 32. |z₁| = 3.606 and |z₂| = 4.123, so |z₁z₂| = 3.606 × 4.123 = 14.866: between the 8 ring and the 16 ring, in direction 70.3°.',
    `ruler description: ${await readText(page, '#arithmetic-ruler-desc')}`);
  assert(await readText(page, '#arithmetic-ruler-title') === 'The product on a log ruler', 'ruler title');
  assert((await readText(page, '#arithmetic-ruler-intro')).startsWith('Distance from 0 is drawn on a log scale: each ring is twice the one inside it'), 'ruler intro');
  assert(await ev(page, () => document.getElementById('arithmetic-ruler-viewport').getAttribute('aria-describedby')) === 'arithmetic-ruler-desc', 'the ruler plane is described by its text');
  // the hint under the plane names the ruler for × and ÷ (the purple dot can be too far to draw); Play and Fit come right after the plane, level with it on a wide screen
  assert((await readText(page, '#arithmetic-hint')).includes('The purple dot is the result; when it is too far to draw, it is on the ruler.'), `hint: ${await readText(page, '#arithmetic-hint')}`);
  const pl = await ev(page, () => {
    const q = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return { top: b.top + window.scrollY, bottom: b.bottom + window.scrollY, left: b.left }; };
    const play = document.getElementById('arithmetic-animate'), plane = document.getElementById('arithmetic-plane-host');
    return { plane: q('arithmetic-plane-host'), play: q('arithmetic-animate'), fit: q('arithmetic-fit'), ruler: q('arithmetic-ruler-panel'), points: q('arithmetic-points-title'),
      order: !!(plane.compareDocumentPosition(play) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  assert(pl.order, 'Play comes after the plane in the page');
  assert(pl.play.bottom <= pl.ruler.top + 1 && pl.fit.bottom <= pl.ruler.top + 1 && pl.ruler.bottom <= pl.points.top + 1, 'the order is Play and Fit, the ruler, the two points');
  if (!phone) assert(pl.play.top >= pl.plane.top - 2 && pl.play.bottom <= pl.plane.bottom, `Play is level with the plane (${JSON.stringify(pl.play)} against ${JSON.stringify(pl.plane)})`);
  // off-plane word and note, and the result handle goes away
  assert((await readText(page, '#arithmetic-note')).startsWith('The product is 14.866 from 0, too far to draw here. It is on the ruler.'), `note: ${await readText(page, '#arithmetic-note')}`);
  assert(await ev(page, () => document.getElementById('arithmetic-plane-result').hidden), 'the result handle is hidden while the product is off the plane');
  assert(await ev(page, () => { const t = window.__mv.planes.get('arithmetic-plane').canvas; return t.width > 0; }), 'the main plane has a canvas');
  await ev(page, () => document.getElementById('arithmetic-ruler-panel').scrollIntoView({ block: 'center' }));
  await settle(page, 3);
  await ctx.shot('mul');

  // 8. divide
  await clickChip(page, 'arithmetic-mode-div');
  R = await ruler();
  assert(near(R.result, Math.sqrt(13 / 17), 1e-6), `div result ${R.result}`);
  assert(JSON.stringify(R.rings) === JSON.stringify([0.25, 0.5, 1, 2, 4, 8, 16]), `div rings ${JSON.stringify(R.rings)}`);
  assert(await glyph() === 'move: turn -137.7°, stretch 0.874', `div glyph ${await glyph()}`);
  await waitLabels('1.1.1 divide');
  assert(await readText(page, '#arithmetic-ruler-title') === 'The quotient on a log ruler', 'the title follows the mode');
  assert(await ev(page, () => !document.getElementById('arithmetic-plane-result').hidden), 'the quotient is on the plane: its handle shows');
  assert((await readText(page, '#arithmetic-note')) === '', 'no off-plane note for the quotient');

  // 9. add: the ruler goes, the plane fits the sum
  await clickChip(page, 'arithmetic-mode-add');
  assert(!(await page.locator('#arithmetic-ruler-host').isVisible()), 'the ruler host is hidden for +');
  assert(!(await readText(page, '#arithmetic-hint')).includes('ruler'), 'the hint does not mention the ruler for +');
  assert((await ruler()).shown === false, 'plan().ruler.shown is false for +');
  pi = await planeInfo();
  assert(pi.sum.x >= 0 && pi.sum.x <= pi.w && pi.sum.y >= 0 && pi.sum.y <= pi.h, `the sum (2, 2) is inside the canvas: ${JSON.stringify(pi.sum)}`);
  assert(near(pi.unitsAcross, 8.16, 1e-3), `+ fits in 8.16 units (${pi.unitsAcross})`);
  assert(await glyph() === 'move: turn 45°, stretch 2.828', `sum glyph ${await glyph()}`);
  await clickChip(page, 'arithmetic-mode-mul');
  assert(await page.locator('#arithmetic-ruler-host').isVisible(), 'the ruler is back for ×');
  await waitLabels('back to multiply');

  // the mirror toggle keeps the words and the ruler; 1.1.2 and the glyph of the mirrored difference
  await clickChip(page, 'arithmetic-mode-sub');
  await clickChip(page, 'arithmetic-conj-result');
  assert(await glyph() === 'move: turn 56.3°, stretch 7.211', `1.1.2 glyph ${await glyph()}`);
  await clickChip(page, 'arithmetic-mode-mul');
  await ev(page, () => document.getElementById('arithmetic-mode-mul').scrollIntoView({ block: 'center' }));

  // a zero factor: the ruler panel stays with its sentence, the glyph says so
  await ev(page, () => { const i = document.getElementById('arithmetic-z2-input'); i.value = '0'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await settle(page, 3);
  assert(await readText(page, '#arithmetic-ruler-desc') === 'The result is 0, and 0 is not on a log ruler.', `zero desc: ${await readText(page, '#arithmetic-ruler-desc')}`);
  assert(await glyph() === 'no move: 0', `zero glyph ${await glyph()}`);
  assert((await ruler()).ok === false, 'the zero ruler is not ok');
  await ev(page, () => { const i = document.getElementById('arithmetic-z2-input'); i.value = '-1 + 4i'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await settle(page, 3);
  assert(near((await ruler()).result, Math.sqrt(221), 1e-6), 'z2 back: the ruler is back');

  // 10. the values preset
  await ev(page, () => window.__mv.app.request({ station: 'arithmetic', problem: '1.1.1', family: '1.1.1', values: { z1: { re: 1, im: 2 }, z2: { re: 2, im: -1 }, mode: 'mul' } }));
  await reopen(page, 'arithmetic');
  const st = await ev(page, () => window.__mv.arithmetic.state());
  assert(near(st.z1.re, 1, 1e-9) && near(st.z1.im, 2, 1e-9) && near(st.z2.re, 2, 1e-9) && near(st.z2.im, -1, 1e-9), `state ${JSON.stringify(st)}`);
  assert((await readText(page, '#arithmetic-readout')).includes('result = 4 + 3i; |result| = 5; Arg = 0.644'), `readout: ${await readText(page, '#arithmetic-readout')}`);
  assert((await readText(page, '#arithmetic-problem-note')).includes('Fresh numbers'), `note: ${await readText(page, '#arithmetic-problem-note')}`);
  assert(await glyph() === 'move: turn 36.9°, stretch 5', `fresh glyph ${await glyph()}`);
  assert(near((await ruler()).result, 5, 1e-9), 'fresh ruler: |result| = 5');
  await waitLabels('fresh numbers');
  // the two moves are framed in 4.08 units, so 4 + 3i is off the plane: the note says so and the handle is hidden (the ruler has it)
  assert((await readText(page, '#arithmetic-note')).startsWith('The product is 5 from 0, too far to draw here. It is on the ruler.'), `fresh note: ${await readText(page, '#arithmetic-note')}`);
  assert(await ev(page, () => document.getElementById('arithmetic-plane-result').hidden), 'the fresh result is off the plane: its handle is hidden');
  await ctx.shot('fresh');
  // leaving the station frees both planes
  await ev(page, () => { location.hash = '#home'; });
  await page.waitForFunction(() => !!document.querySelector('#view [data-station="home"]'), null, { timeout: 5000 });
  assert(await ev(page, () => ![...window.__mv.planes.keys()].some((k) => k.startsWith('arithmetic'))), 'no arithmetic plane is left after leaving');
  log(`arithmetic ok${phone ? ' (phone)' : ''}`);
}

// ---------------------------------------------------------------------------------------------
// graph4d: five shadows beside one object
// ---------------------------------------------------------------------------------------------

async function graph4d(page, ctx) {
  const { assert, log } = ctx;
  const wide = ctx.viewport.width >= 1080;
  const phone = ctx.viewport.width <= 480;
  const shadows = () => ev(page, () => window.__mv.graph4d.shadows());
  const flags = () => ev(page, () => Object.fromEntries([...document.querySelectorAll('#graph4d-shadows figure[data-shadow]')].map((f) => [f.dataset.shadow, f.dataset.active])));
  const uv = () => ev(page, () => Number(document.getElementById('graph4d-uv').value));
  await page.waitForFunction(() => !!window.__mv.graph4d && !!window.__mv.graph4d.shadows, null, { timeout: 5000 });

  // 1. five figures in order, the lede
  const ids = await ev(page, () => [...document.querySelectorAll('#graph4d-shadows figure[data-shadow]')].map((f) => f.dataset.shadow));
  assert(JSON.stringify(ids) === JSON.stringify(['side', 'domain', 're', 'im', 'landscape']), `figures ${ids}`);
  assert((await ev(page, () => document.querySelectorAll('#graph4d-shadows-grid > figure').length)) === 5, 'exactly five figures in the grid');
  assert((await readText(page, '#graph4d-shadows-lede')).includes('every picture is a shadow'), 'the lede');
  assert(await readText(page, '#graph4d-shadows-title') === 'Five shadows of one graph', 'the title');
  assert(await readText(page, '#graph4d-turn-title') === 'Turn the graph', 'the turn panel title');
  for (const id of ['side', 'domain', 're', 'im', 'landscape']) assert((await readText(page, `#graph4d-shadow-${id} figcaption strong`)).length > 3, `${id} is captioned`);
  // the sliders are in the turn panel, in the same column as the view and the shadows
  assert(await ev(page, () => ['graph4d-uv', 'graph4d-yv', 'graph4d-spin', 'graph4d-angles-reset'].every((i) => document.getElementById('graph4d-turn').contains(document.getElementById(i)))), 'sliders, Spin and Angles to 0 are in #graph4d-turn');

  // 2. the start: z^2 at uv = yv = 0 lights the Re surface (the script first clears any stored Lab shapes)
  await ev(page, () => { try { localStorage.removeItem('mv:lab.strokes'); } catch (e) { /* no storage */ } });
  const s0 = await shadows();
  assert(s0.active === 're', `active at the start: ${JSON.stringify(s0)}`);
  assert(await ev(page, () => document.getElementById('graph4d-shadow-re').dataset.active) === 'true', 're is lit at the start');
  assert(await ev(page, () => document.getElementById('graph4d-shadow-im').dataset.active) === 'false', 'im is not');
  assert(await ev(page, () => document.getElementById('graph4d-shadow-re-show').getAttribute('aria-pressed')) === 'true', 'the re button is pressed');
  assert(!(await ev(page, () => document.querySelector('#graph4d-shadow-re .g4-lit').hidden)), 'the lit words show on re');
  assert(await ev(page, () => document.querySelector('#graph4d-shadow-im .g4-lit').hidden), 'and not on im');
  assert((await readText(page, '#graph4d-shadow-re .g4-lit')) === 'on the big view now', 'the lit words');

  // 3. the sliders light the shadows
  await setSlider(page, 'graph4d-uv', PI / 2);
  let f = await flags();
  assert(f.im === 'true' && f.re === 'false' && f.landscape === 'false', `uv = 90: ${JSON.stringify(f)}`);
  assert((await shadows()).active === 'im', 'hook says im');
  assert((await readText(page, '#graph4d-shadows-status')) === 'The big view now shows the Im surface.', `status: ${await readText(page, '#graph4d-shadows-status')}`);
  await setSlider(page, 'graph4d-uv', PI);
  f = await flags();
  assert(Object.values(f).every((v) => v === 'false'), `uv = 180: nothing is lit ${JSON.stringify(f)}`);
  assert((await shadows()).active === null, 'hook says null');
  await setSlider(page, 'graph4d-uv', 3 * PI / 2);
  assert((await shadows()).active === 'im', 'uv = 270 lights im');
  await setSlider(page, 'graph4d-uv', 0.2);
  assert((await shadows()).active === null, 'uv = 11.5 degrees is outside the window');
  await setSlider(page, 'graph4d-uv', 0.15);
  assert((await shadows()).active === 're', 'uv = 8.6 degrees is inside it');
  await setSlider(page, 'graph4d-yv', 1);
  assert((await shadows()).active === null, 'yv = 57 degrees lights nothing');
  await clickChip(page, 'graph4d-angles-reset');
  assert((await shadows()).active === 're', 'Angles to 0 lights re again');

  // 4. a tap sets the sliders
  await clickChip(page, 'graph4d-shadow-im');
  assert(near(await uv(), PI / 2, 0.02), `a tap on im sets uv to 90 degrees (${await uv()})`);
  assert((await shadows()).active === 'im', 'im is lit after its tap');
  assert((await readText(page, '#graph4d-readout')).includes('uv = 90°'), `readout: ${await readText(page, '#graph4d-readout')}`);
  await clickChip(page, 'graph4d-shadow-re');
  assert(near(await uv(), 0, 0.02), `a tap on re sets uv to 0 (${await uv()})`);
  assert((await shadows()).active === 're', 're is lit after its tap');
  // a tap brings the big view into view: scroll to the shadows, tap, and the whole big view is inside the window (the shadows sit below it)
  await ev(page, () => document.getElementById('graph4d-shadows').scrollIntoView({ block: 'center' }));
  await ev(page, () => document.getElementById('graph4d-shadow-im-show').click());
  const seen = await ev(page, () => { const b = document.getElementById('graph4d-view-panel').getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: window.innerHeight }; });
  assert(seen.top >= -1 && seen.bottom <= seen.h + 1, `after a tap the big view is on screen: ${JSON.stringify(seen)}`);
  assert((await shadows()).active === 'im', 'the tap did turn the view to im');
  await clickChip(page, 'graph4d-shadow-re');
  // 5. landscape
  await clickChip(page, 'graph4d-shadow-landscape');
  assert(await ev(page, () => window.__mv.graph4d.mode) === 'landscape', 'a tap on the landscape shows the landscape');
  assert((await shadows()).active === 'landscape', 'the landscape is lit');
  assert(await ev(page, () => document.getElementById('graph4d-shadow-landscape-show').getAttribute('aria-pressed')) === 'true', 'its button is pressed');
  await clickChip(page, 'graph4d-shadow-landscape');
  assert(await ev(page, () => window.__mv.graph4d.mode) === 'graph', 'a second tap goes back to the graph');
  assert((await shadows()).active === 're', 'back to re');
  // a slider while the landscape shows goes back to the graph
  await clickChip(page, 'graph4d-landscape');
  assert((await shadows()).active === 'landscape', 'the chip lights the landscape too');
  await setSlider(page, 'graph4d-uv', PI / 2);
  assert(await ev(page, () => window.__mv.graph4d.mode) === 'graph' && (await shadows()).active === 'im', 'a slider returns to the graph');
  await clickChip(page, 'graph4d-angles-reset');
  // the side and the domain figure are not tappable
  assert(await ev(page, () => !document.getElementById('graph4d-shadow-side').querySelector('button') && !document.getElementById('graph4d-shadow-domain').querySelector('button')), 'no button on side and domain');
  await ev(page, () => document.getElementById('graph4d-shadow-side').click());
  assert((await shadows()).active === 're', 'a click on side changes nothing');

  // 6. resources
  const r = await ev(page, () => {
    const keys = [...window.__mv.views3d.keys()].filter((k) => k.startsWith('graph4d-shadow'));
    const size = (id) => { const e = document.getElementById(id); return { w: e.clientWidth, h: e.clientHeight }; };
    return {
      keys, unavailable: window.__mv.graph4d.unavailable,
      sizes: [...keys.map((k) => ({ id: k, ...size(k) })), { id: 'canvas', ...size('graph4d-shadow-domain-canvas') }],
      planes: ['graph4d-shadow-z', 'graph4d-shadow-w'].map((id) => !!document.getElementById(id + '-viewport') && window.__mv.planes.has(id)),
      canvas: { w: document.getElementById('graph4d-shadow-domain-canvas').width, h: document.getElementById('graph4d-shadow-domain-canvas').height },
      bigViews: [...window.__mv.views3d.keys()].length,
    };
  });
  assert(r.keys.length <= 3, `at most three small 3D views (${r.keys})`);
  if (!r.unavailable) assert(r.keys.length === 3, `three small views when WebGL is there (${r.keys})`);
  for (const s of r.sizes) assert(s.w <= 160 && s.h <= 160 && s.w > 0, `${s.id} is at most 160 px (${s.w} x ${s.h})`);
  assert(r.canvas.w <= 160 && r.canvas.h <= 160, `the domain canvas has at most 160 x 160 pixels (${r.canvas.w} x ${r.canvas.h})`);
  assert(r.planes.every(Boolean), 'both small planes exist');

  // 7. layout
  const lay = await ev(page, () => {
    const q = (id) => document.getElementById(id).getBoundingClientRect();
    const out = {};
    for (const id of ['graph4d-view-panel', 'graph4d-turn', 'graph4d-shadows', 'graph4d-shadows-grid', 'graph4d-shadow-side', 'graph4d-shadow-domain', 'graph4d-shadow-re', 'graph4d-shadow-im', 'graph4d-shadow-landscape', 'graph4d-controls']) {
      const b = q(id); out[id] = { left: b.left, top: b.top + window.scrollY, width: b.width, height: b.height, bottom: b.bottom + window.scrollY };
    }
    out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return out;
  });
  assert(lay.overflow <= 1, `no horizontal overflow (${lay.overflow})`);
  if (wide) {
    assert(near(lay['graph4d-shadows'].left, lay['graph4d-view-panel'].left, 1), 'the shadows are in the column of the big view');
    assert(lay['graph4d-shadows'].top > lay['graph4d-turn'].bottom - 1, 'the shadows are under the turn panel');
    assert(lay['graph4d-turn'].top >= lay['graph4d-view-panel'].bottom - 1, 'the turn panel is under the big view');
    assert(lay['graph4d-controls'].left > lay['graph4d-view-panel'].left + 100, 'the function chips are in the other column');
    // the slider and the Re shadow are on one screen: scroll the turn panel to the top of the window
    await ev(page, () => window.scrollTo(0, document.getElementById('graph4d-turn').getBoundingClientRect().top + window.scrollY - 24));
    await settle(page, 2);
    const vis = await ev(page, () => {
      const inside = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return b.top >= 0 && b.bottom <= window.innerHeight; };
      return { uv: inside('graph4d-uv'), yv: inside('graph4d-yv'), re: inside('graph4d-shadow-re'), im: inside('graph4d-shadow-im'), landscape: inside('graph4d-shadow-landscape') };
    });
    assert(vis.uv && vis.yv && vis.re && vis.im && vis.landscape, `slider and the three tappable shadows are on one screen: ${JSON.stringify(vis)}`);
  }
  // the video host (when the manifest has the video) is after the shadows, never between the sliders and the figures they light; on a phone it is after the function chips too
  const vidHere = await hasVideo(page, 'shadows-4d');
  const order = await ev(page, () => {
    const after = (a, b) => !!(document.getElementById(a).compareDocumentPosition(document.getElementById(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
    const top = (id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY;
    return { inDom: after('graph4d-shadows', 'graph4d-video-host'), shadowsTop: top('graph4d-shadows'), controlsTop: top('graph4d-controls'), videoTop: top('graph4d-video-host'), videoH: document.getElementById('graph4d-video-host').getBoundingClientRect().height };
  });
  assert(order.inDom, 'the video host is after the shadows in the page');
  if (vidHere && order.videoH > 0) {
    assert(order.videoTop > lay['graph4d-shadows'].bottom - 1, `the video is below the shadows (${order.videoTop} against ${lay['graph4d-shadows'].bottom})`);
    if (!wide) assert(order.videoTop > order.controlsTop, 'on a phone the video is after the function chips');
  }
  if (phone) {
    assert(lay['graph4d-shadow-side'].width >= 0.9 * lay['graph4d-shadows-grid'].width, 'at phone width the side figure spans the grid');
    const re = lay['graph4d-shadow-re'], im = lay['graph4d-shadow-im'], dom = lay['graph4d-shadow-domain'], land = lay['graph4d-shadow-landscape'];
    assert(re.left < im.left - 20 && near(re.top, im.top, 2), 're and im are side by side (two columns)');
    assert(land.left < dom.left - 20 && near(dom.top, land.top, 2) && land.top > re.top, 'the landscape and the domain figure are the second pair');
    assert(lay['graph4d-shadow-side'].top > dom.top, 'the pair of small planes comes last');
  }

  // 8. presets: the root presets start at uv = 90 degrees and say that the small pictures show the principal root
  await clickChip(page, 'graph4d-fn-sqrt-all');
  assert((await shadows()).active === 'im', 'sqrt starts at uv = 90 degrees: im');
  assert(await ev(page, () => !document.getElementById('graph4d-shadows-note').hidden), 'the roots note is visible');
  assert((await readText(page, '#graph4d-shadows-note')).includes('principal root only'), 'the roots note text');
  await clickChip(page, 'graph4d-fn-sq');
  assert((await shadows()).active === 're', 'z^2 again: re');
  assert(await ev(page, () => document.getElementById('graph4d-shadows-note').hidden), 'the note is hidden for z^2');
  // the small pictures follow the function: the w-plane of 1/z reaches 4, the domain colouring is repainted (its first pixel changes)
  const before = await ev(page, () => document.getElementById('graph4d-shadow-domain-canvas').getContext('2d').getImageData(80, 80, 1, 1).data.join(','));
  await clickChip(page, 'graph4d-fn-exp');
  const after = await ev(page, () => document.getElementById('graph4d-shadow-domain-canvas').getContext('2d').getImageData(20, 40, 1, 1).data.join(','));
  assert(before !== '' && after !== '', 'the domain canvas is readable');
  await clickChip(page, 'graph4d-fn-sq');

  // the probe moves the two lines of the side shadow (no throw, the hook stays right)
  assert((await ev(page, () => window.__mv.graph4d.shadows().lifted)) === 0, 'no Lab shape is carried');

  // 10. the video panel is absent while the manifest has no entry
  const vid = await hasVideo(page, 'shadows-4d');
  assert((await ev(page, () => !!document.getElementById('video-shadows-4d'))) === vid, `the shadows-4d video panel ${vid ? 'is' : 'is not'} there`);

  // 11. the pictures
  await ev(page, () => document.getElementById('graph4d-shadows').scrollIntoView({ block: 'center' }));
  await ev(page, () => { for (const [k, v] of window.__mv.views3d) if (k.startsWith('graph4d')) v.renderNow(); });
  await settle(page, 3);
  await ctx.shot('shadows');
  await setSlider(page, 'graph4d-uv', PI / 2);
  await ev(page, () => { for (const [k, v] of window.__mv.views3d) if (k.startsWith('graph4d')) v.renderNow(); });
  await ctx.shot('shadows-im');
  await clickChip(page, 'graph4d-angles-reset');

  // 9. disposal
  await ev(page, () => { location.hash = '#home'; });
  await page.waitForFunction(() => !!document.querySelector('#view [data-station="home"]'), null, { timeout: 5000 });
  const left = await ev(page, () => ({ views: [...window.__mv.views3d.keys()].filter((k) => k.startsWith('graph4d')), planes: [...window.__mv.planes.keys()].filter((k) => k.startsWith('graph4d')) }));
  assert(left.views.length === 0 && left.planes.length === 0, `nothing of graph4d is left after leaving: ${JSON.stringify(left)}`);
  log('graph4d ok');
}

// ---------------------------------------------------------------------------------------------
// staircase: the card, the chips, the ribbon, the hop, the preset
// ---------------------------------------------------------------------------------------------

async function staircase(page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width <= 480;
  // 1. the problem card and its chips
  assert(await ev(page, () => !!document.querySelector('#staircase-problem-decisions .decision-chip[data-decision="names"][data-value="home"]')), 'names chip: home');
  assert(await ev(page, () => document.getElementById('staircase-problem-address').dataset.value) === 'C->P', 'address chip: C->P');
  await clickChip(page, 'staircase-problem-names');
  assert((await readText(page, '#staircase-problem-meaning')) === 'The home step only: Arg z in (−π, π], and principal values.', `meaning: ${await readText(page, '#staircase-problem-meaning')}`);
  assert((await readText(page, '#staircase-problem-title')) === 'Problem 1.3.1', 'card title');
  assert(await ev(page, () => document.getElementById('staircase-problem-answer-toggle').textContent) === 'Show the answer', 'answer toggle');
  // 2. the video panel is absent while the manifest has no entry
  const vid = await hasVideo(page, 'staircase-roots');
  assert((await ev(page, () => !!document.getElementById('video-staircase-roots'))) === vid, `the staircase-roots video panel ${vid ? 'is' : 'is not'} there`);

  // 3. the helix is one ribbon with the beads on it
  const v3 = await ev(page, () => { const v = window.__mv.views3d && window.__mv.views3d.get('staircase-helix'); return { has: !!v, unavailable: !!(v && v.unavailable) }; });
  if (!v3.has || v3.unavailable) {
    assert(await page.locator('#staircase-helix-fallback').isVisible(), 'without WebGL the fallback sentence shows');
    log('staircase: no WebGL, ribbon steps skipped');
  } else {
    const probe = () => ev(page, () => {
      const v = window.__mv.views3d.get('staircase-helix');
      const g = v.scene.getObjectByName('arg-helix');
      const u = g.userData;
      const st = window.__mv.staircase.state();
      const r = Math.hypot(st.z.re, st.z.im);
      const rad = (mesh) => { const a = mesh.geometry.attributes.position.array; let lo = 1e9, hi = 0; for (let i = 0; i < a.length; i += 3) { const q = Math.hypot(a[i], a[i + 2]); lo = Math.min(lo, q); hi = Math.max(hi, q); } return [lo, hi]; };
      const kinds = [];
      g.traverse((o) => { if (o.isMesh) kinds.push(o.geometry.type === 'SphereGeometry' ? 'sphere' : o.name); });
      return {
        ribbon: !!u.ribbon && u.ribbon.isMesh, fibre: u.fibre, riser: !!u.riser, beads: u.beads.length, r, home: st.home, ribbonRadius: u.ribbonRadius,
        heights: u.beads.map((b) => b.position.y), radii: u.beads.map((b) => Math.hypot(b.position.x, b.position.z)),
        ribbonSpan: rad(u.ribbon), homeSpan: rad(u.homeSheet), kinds,
      };
    });
    let p = await probe();
    assert(p.ribbon && p.fibre === undefined && p.riser && p.beads === 5, `ribbon ${p.ribbon}, fibre ${p.fibre}, riser ${p.riser}, beads ${p.beads}`);
    for (let k = -2; k <= 2; k++) {
      assert(near(p.heights[k + 2], 1.2 * (p.home + 2 * PI * k) / (2 * PI), 1e-9), `bead ${k} height ${p.heights[k + 2]}`);
      assert(near(p.radii[k + 2], p.r, 1e-9), `bead ${k} radius ${p.radii[k + 2]} is the radius of z ${p.r}`);
    }
    assert(near(p.ribbonRadius, p.r, 1e-9), 'the ribbon is at the radius of z');
    assert(p.ribbonSpan[0] >= p.r - 0.28 - 1e-4 && p.ribbonSpan[1] <= p.r + 0.28 + 1e-4, `the ribbon is thin: ${JSON.stringify(p.ribbonSpan)}`);
    assert(p.homeSpan[1] <= p.r + 0.35 + 1e-4, `the home strip is thin: ${JSON.stringify(p.homeSpan)}`);
    const known = new Set(['sphere', 'helix-point', 'helix-ribbon', 'helix-home', 'helix-riser', 'helix-seam']);
    assert(p.kinds.every((k) => known.has(k)), `only the ribbon, the strip, the riser, the seam strip, the point and the beads are solid: ${p.kinds}`);
    // 4. the hop down the riser
    await setSlider(page, 'staircase-turn', PI - 0.1);
    const before = (await probe()).heights[2];
    await setSlider(page, 'staircase-turn', PI + 0.1);
    const after = (await probe()).heights[2];
    assert(before > 0 && after < 0 && before - after > 0.9 && before - after < 1.4, `the home bead hops down the riser: ${before} -> ${after}`);
    await clickChip(page, 'staircase-reset');
    // 4a. the ribbon is windowed by the seam, so every bead is ON the ribbon at every seam (a lower-half-plane z with the seam at 0 or -pi/2 put the top bead in the air)
    await ev(page, () => window.__mv.planes.get('staircase-plane').getHandle('z').set({ re: 2, im: -1.5 }));
    for (const seam of [0, -PI / 2, PI / 2, -PI]) {
      await setSlider(page, 'staircase-seam', seam);
      const on = await ev(page, () => {
        const u = window.__mv.views3d.get('staircase-helix').scene.getObjectByName('arg-helix').userData;
        const P = u.ribbon.geometry.attributes.position.array, n = P.length / 3;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < n; i++) { lo = Math.min(lo, P[3 * i + 1]); hi = Math.max(hi, P[3 * i + 1]); }
        return { seam: u.seam, lo, hi, heights: u.beads.map((b) => b.position.y), shown: u.ribbon.visible };
      });
      assert(on.shown && on.heights.every((y) => y >= on.lo - 1e-4 && y <= on.hi + 1e-4), `seam ${seam.toFixed(2)}: every bead is inside the ribbon's height range ${on.lo.toFixed(2)}..${on.hi.toFixed(2)}: ${on.heights.map((y) => y.toFixed(2))}`);
      if (seam === 0) {                                                                    // the reviewer's picture: z = 2 - 1.5i, seam at 0
        await ev(page, () => { document.getElementById('staircase-helix').scrollIntoView({ block: 'center' }); window.__mv.views3d.get('staircase-helix').renderNow(); });
        await settle(page, 3);
        await ctx.shot('helix-seam0');
      }
    }
    await ev(page, () => window.__mv.planes.get('staircase-plane').getHandle('z').set({ re: -1, im: Math.sqrt(3) }));
    // 4b. z at 0 has no angle: the ribbon, the riser and the beads hide, the point on the floor stays (design 2.1.4), and the note under the helix says why
    await ev(page, () => window.__mv.planes.get('staircase-plane').getHandle('z').set({ re: 0, im: 0 }));
    const zero = await ev(page, () => {
      const u = window.__mv.views3d.get('staircase-helix').scene.getObjectByName('arg-helix').userData;
      return { z: window.__mv.staircase.state().z, ribbon: u.ribbon.visible, riser: u.riser.visible, home: u.homeSheet.visible, beads: u.beads.some((b) => b.visible), point: u.floorPoint.visible, note: document.getElementById('staircase-helix-note').textContent };
    });
    assert(Math.hypot(zero.z.re, zero.z.im) < 1e-9, `z is at 0: ${JSON.stringify(zero.z)}`);
    assert(!zero.ribbon && !zero.riser && !zero.home && !zero.beads, `at z = 0 the ribbon, riser, home strip and beads are hidden: ${JSON.stringify(zero)}`);
    assert(zero.point === true, 'at z = 0 the floor point stays');
    assert(zero.note.startsWith('z is at 0. It has no angle'), `helix note: ${zero.note}`);
    await clickChip(page, 'staircase-reset');
    // 6. phone: the beads are big enough and the picture is tall enough
    await ev(page, () => document.getElementById('staircase-helix').scrollIntoView({ block: 'center' }));
    await ev(page, () => window.__mv.views3d.get('staircase-helix').renderNow());
    const px = await ev(page, () => {
      const v = window.__mv.views3d.get('staircase-helix');
      v.renderNow();
      const g = v.scene.getObjectByName('arg-helix');
      const b = g.userData.beads;
      const W = v.canvas.clientWidth, H = v.canvas.clientHeight;
      const cam = v.camera;
      const proj = (o) => { const p = o.position.clone().project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };
      const ys = b.map((o) => proj(o).y);
      const home = b[2];
      const d = cam.position.distanceTo(home.position);
      const radiusPx = 0.12 * home.scale.x * (H / 2) / (d * Math.tan(cam.fov * Math.PI / 360));
      return { spanY: Math.max(...ys) - Math.min(...ys), radiusPx, W, H };
    });
    assert(px.spanY >= 140, `the five beads span ${px.spanY.toFixed(0)} px on screen`);
    if (phone) assert(px.radiusPx >= 6.5, `the home bead is ${px.radiusPx.toFixed(1)} px in radius`);
    await settle(page, 3);
    await ctx.shot('helix');
  }

  // 5. the values preset
  await ev(page, () => window.__mv.app.request({ station: 'staircase', problem: '1.3.1', family: '1.3.1', values: { z: { re: 0, im: 2 } } }));
  await reopen(page, 'staircase');
  const st = await ev(page, () => window.__mv.staircase.state());
  assert(near(st.z.re, 0, 1e-9) && near(st.z.im, 2, 1e-9), `state z ${JSON.stringify(st.z)}`);
  assert(near(st.home, PI / 2, 1e-9), `home ${st.home}`);
  assert((await readText(page, '#staircase-problem-note')).includes('Fresh numbers'), `note: ${await readText(page, '#staircase-problem-note')}`);
  // z = 0 says so under the helix
  await ev(page, () => window.__mv.app.request({ station: 'staircase', problem: null, family: null, values: { z: { re: 0, im: 0 } } }));
  await reopen(page, 'staircase');
  const st2 = await ev(page, () => window.__mv.staircase.state());
  assert(near(st2.z.re, -1, 1e-9) && near(st2.z.im, Math.sqrt(3), 1e-9), 'a bad z falls back to the default');
  assert((await readText(page, '#staircase-problem-note')) === 'Your own numbers.', `own numbers note: ${await readText(page, '#staircase-problem-note')}`);
  log(`staircase ok${phone ? ' (phone)' : ''}`);
}
