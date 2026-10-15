// tests/interact/i1-station-distance-sets.mjs
// Interaction script for the stations "distance" and "sets" (goal i1-station-distance-sets).
//
//   node tools/smoke.mjs --route problem-1-2-2 --script tests/interact/i1-station-distance-sets.mjs --out <dir>      (steps D0 to D14)
//   node tools/smoke.mjs --route problem-1-5-2 --script tests/interact/i1-station-distance-sets.mjs --out <dir>      (steps S0 to S14)
//
// One file, two routes: it branches on ctx.route; any other route only logs (the load itself is the check). The stations
// snap pointer drags (whole numbers in distance, onto an edge in sets), so exact values are asserted where the snap makes
// them exact, and numbers that depend on pixels carry a tolerance. Nothing is weakened to pass.

import { dragHandle, clickChip, readText, setSlider, settle, handleZ, planePixel } from './_helpers.mjs';

// ---- the words on a plane ------------------------------------------------------------------------------------------------
// A spy on CanvasRenderingContext2D.fillText keeps the words of the LAST frame of every canvas (clearRect from 0, 0 starts a frame);
// the words of the handles are DOM, read from their rectangles. Together they are everything a student can read on the plane.
async function installWordSpy(page) {
  await page.evaluate(() => {
    if (window.__wordSpy) return;
    const proto = CanvasRenderingContext2D.prototype, spy = (window.__wordSpy = new WeakMap());
    const frame = (cv) => { let f = spy.get(cv); if (!f) { f = { words: [] }; spy.set(cv, f); } return f; };
    const clear = proto.clearRect, fill = proto.fillText;
    proto.clearRect = function (x, y, w, h) { if (x === 0 && y === 0) frame(this.canvas).words = []; return clear.call(this, x, y, w, h); };
    proto.fillText = function (t, x, y, ...rest) {
      frame(this.canvas).words.push({ text: String(t), x, y, w: this.measureText(String(t)).width, align: this.textAlign, base: this.textBaseline, size: parseFloat(this.font) });
      return fill.call(this, t, x, y, ...rest);
    };
  });
}
// every word of the last frame of a plane as boxes in canvas pixels: { w, h, canvas: [{ text, size, x0, y0, x1, y1 }], handles: [the DOM words], dots: [the handle dots] }
async function readWords(page, planeId) {
  await installWordSpy(page);
  await page.evaluate((id) => window.__mv.planes.get(id).requestDraw(), planeId);
  await settle(page, 3);
  return page.evaluate((id) => {
    const pl = window.__mv.planes.get(id), f = window.__wordSpy.get(pl.canvas), rect = pl.canvas.getBoundingClientRect();
    const canvas = (f ? f.words : []).map((q) => {
      const x0 = q.align === 'left' || q.align === 'start' ? q.x : q.align === 'right' || q.align === 'end' ? q.x - q.w : q.x - q.w / 2;
      const y0 = q.base === 'middle' ? q.y - q.size / 2 - 2 : q.y - q.size + 1, y1 = q.base === 'middle' ? q.y + q.size / 2 + 2 : q.y + 4;
      return { text: q.text, size: q.size, x0, y0, x1: x0 + q.w, y1 };
    });
    const handles = [...pl.el.querySelectorAll('.plane-handle-label')].filter((el) => el.getClientRects().length > 0).map((el) => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent, size: 13, x0: r.left - rect.left, y0: r.top - rect.top, x1: r.right - rect.left, y1: r.bottom - rect.top };
    });
    const dots = [...pl.el.querySelectorAll('.plane-handle')].filter((el) => el.getClientRects().length > 0).map((el) => {
      const r = (el.querySelector('.plane-handle-dot') || el).getBoundingClientRect();
      return { text: `the dot of ${el.dataset.handleId}`, size: 13, x0: r.left - rect.left, y0: r.top - rect.top, x1: r.right - rect.left, y1: r.bottom - rect.top };
    });
    return { w: rect.width, h: rect.height, canvas, handles, dots };
  }, planeId);
}
const boxHit = (a, b, d = 1) => a.x0 + d < b.x1 && b.x0 + d < a.x1 && a.y0 + d < b.y1 && b.y0 + d < a.y1;
// no two words of the plane touch, none leaves the canvas, none sits on a tick number (unless `ticks: false`: the busiest states may
// have to cross one, never a word), and the words in `expect` are there (a prefix each)
function assertWordsClear(assert, W, when, expect = [], { ticks: checkTicks = true } = {}) {
  const ticks = W.canvas.filter((q) => q.size < 11.5), words = [...W.canvas.filter((q) => q.size >= 11.5), ...W.handles];
  for (let i = 0; i < words.length; i++) {
    const a = words[i];
    assert(a.x0 >= -1 && a.x1 <= W.w + 1 && a.y0 >= -1 && a.y1 <= W.h + 1, `${when}: "${a.text}" leaves the canvas (${JSON.stringify([a.x0, a.y0, a.x1, a.y1].map(Math.round))} in ${Math.round(W.w)} x ${Math.round(W.h)})`);
    for (let j = i + 1; j < words.length; j++) assert(!boxHit(a, words[j]), `${when}: "${a.text}" overlaps "${words[j].text}"`);
    for (const d of W.dots) assert(!boxHit(a, d), `${when}: "${a.text}" sits on ${d.text}`);
    if (checkTicks) for (const t of ticks) assert(!boxHit(a, t), `${when}: "${a.text}" sits on the tick number ${t.text}`);
  }
  for (const want of expect) assert(words.some((q) => q.text.startsWith(want)), `${when}: the word "${want}" is on the plane (have ${words.map((q) => q.text).join(' | ')})`);
}

export default async function (page, ctx) {
  const { route, log, assert, shot } = ctx;
  const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: expected ${b} (+-${tol}), got ${a}`);
  const text = (sel) => readText(page, sel);
  const attr = (sel, name) => page.evaluate(([s, n]) => { const el = document.querySelector(s); return el ? el.getAttribute(n) : null; }, [sel, name]);
  const noOverflow = async (when) => assert(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1, `horizontal overflow ${when}`);
  const slackOf = (t) => Number(/slack = (-?[\d.]+)/.exec(t)[1]);
  const draws = (id) => page.evaluate((pid) => window.__mv.planes.get(pid).getStats().draws, id);
  const goto = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(600); };
  const pressed = (id) => attr(`#${id}`, 'aria-pressed');
  // the TeX answer line in a callout must wrap, not run off it: open the <details>, then the scroll box must not scroll sideways
  const answerFits = async (detailsId, when) => {
    await page.evaluate((id) => { document.getElementById(id).open = true; }, detailsId);
    await page.waitForTimeout(100);
    const m = await page.evaluate((id) => {
      const box = document.getElementById(id).querySelector('.tex-scroll');
      if (!box) return null;
      const boxes = [box, ...box.querySelectorAll('.katex-display')];                   // display math scrolls inside its own box, so look there too
      const worst = boxes.reduce((a, el) => (el.scrollWidth - el.clientWidth > a.sw - a.cw ? { sw: el.scrollWidth, cw: el.clientWidth } : a), { sw: 0, cw: 0 });
      return { ...worst, hidden: box.hidden, katex: !!box.querySelector('.katex') };
    }, detailsId);
    assert(m && m.katex && !m.hidden, `${when}: the TeX answer line is rendered`);
    assert(m.sw <= m.cw + 1, `${when}: the TeX answer line is not clipped (scrollWidth ${m.sw} vs clientWidth ${m.cw})`);
    await page.evaluate((id) => { document.getElementById(id).open = false; }, detailsId);
  };
  const isHidden = (sel) => page.evaluate((s) => { const el = document.querySelector(s); return !el || el.hidden || el.getClientRects().length === 0; }, sel);

  if (route === 'problem-1-2-2') return distanceSteps();
  if (route === 'problem-1-5-2') return setsSteps();
  return log(`no interaction steps for route ${route}`);

  // ---------------------------------------------------------------------------------------------------------------
  async function distanceSteps() {
    // D0 the route opens two points (problem 1.2.2), the gauge is not shown
    await page.waitForSelector('#distance-plane-z1', { state: 'visible', timeout: 5000 });
    assert(await pressed('distance-mode-two') === 'true', 'D0: two-points chip is pressed');
    assert(await pressed('distance-mode-circle') === 'false' && await pressed('distance-mode-triangle') === 'false', 'D0: the other chips are not pressed');
    assert(await isHidden('#distance-gauge'), 'D0: the gauge is hidden outside triangle mode');
    assert((await text('#distance-problem')).includes('1.2.2'), 'D0: the problem callout names 1.2.2');
    assert(await text('#distance-status') === '', `D0: the polite live region stays silent while the page loads, got "${await text('#distance-status')}"`);
    await answerFits('distance-answer', 'D0 (1.2.2)');

    // D1 the readout of problem 1.2.2
    const r1 = await text('#distance-readout');
    assert(r1 === 'd = 5.385; z\u2081 \u2212 z\u2082 = 5 + 2i', `D1: readout is "d = 5.385; z\u2081 \u2212 z\u2082 = 5 + 2i", got "${r1}"`);

    // D1b the words of every mode, in the default state: none touches another, a handle's word, a tick number or the canvas edge;
    // the polar words are on from the first look on a plane 420 px wide or more and off below that (the checkbox is one tap away)
    const wide = await page.evaluate(() => document.getElementById('distance-plane-host').clientWidth >= 420);
    assert(await page.isChecked('#distance-polar') === wide, `D1b: the angle words start ${wide ? 'on' : 'off'} on this plane in two-point mode`);
    assertWordsClear(assert, await readWords(page, 'distance-plane'), 'D1b two points', ['d = 5.385', ...(wide ? ['r = 5', 'Arg z₁ = ', 'Arg z₂ = '] : [])]);
    assert((await text('#distance-ex-same')).startsWith('same distance:'), `D1b: the footer compares a distance, got "${await text('#distance-ex-same')}"`);
    await clickChip(page, 'distance-mode-circle');
    assertWordsClear(assert, await readWords(page, 'distance-plane'), 'D1b circle', ['R = 3', 'Arg(z − a) = π/2']);
    assert((await text('#distance-ex-same')).startsWith('same radius:'), `D1b: the footer compares a radius, got "${await text('#distance-ex-same')}"`);
    await clickChip(page, 'distance-mode-triangle');
    assert(await page.isChecked('#distance-polar') === wide, `D1b: the angle words start ${wide ? 'on' : 'off'} on this plane in triangle mode`);
    assertWordsClear(assert, await readWords(page, 'distance-plane'), 'D1b triangle', ['|z₁ + z₂| = 5', '|z₁| = 3.162', '|z₂| = 2.236', 'z₁ + z₂', ...(wide ? ['Arg z₁ = ', 'Arg z₂ = '] : [])]);
    const ringWords = (await readWords(page, 'distance-plane')).canvas.filter((q) => ['longest', 'max', 'shortest', 'min'].includes(q.text)).map((q) => q.text);
    assert(ringWords.length === 1 && ['longest', 'max'].includes(ringWords[0]), `D1b: the ring of the longest sum is named (${ringWords})`);
    assert((await text('#distance-ex-same')).startsWith('same length:'), `D1b: the footer compares a length, got "${await text('#distance-ex-same')}"`);
    await clickChip(page, 'distance-mode-two');

    // D2 the default points
    const z1 = await handleZ(page, 'distance-plane-z1'), z2 = await handleZ(page, 'distance-plane-z2');
    near(z1.re, 4, 1e-9, 'D2 z1.re'); near(z1.im, 3, 1e-9, 'D2 z1.im'); near(z2.re, -1, 1e-9, 'D2 z2.re'); near(z2.im, 1, 1e-9, 'D2 z2.im');

    // D3 the explainer works the distance in both addresses and the footer agrees
    const dc = await attr('#distance-ex-dist-cart', 'data-tex'), dp = await attr('#distance-ex-dist-polar', 'data-tex');
    assert(dc.includes('\\sqrt{29}') && dc.includes('5.385'), `D3: Cartesian distance cell shows sqrt(29) and 5.385: ${dc}`);
    assert(dp.includes('5.385') && dp.includes('\\cos'), `D3: polar distance cell shows the law of cosines and 5.385: ${dp}`);
    assert(await attr('#distance-ex-same', 'data-agree') === 'true', 'D3: the footer says the two addresses agree');
    for (const id of ['slide-cart', 'z1-cart', 'z2-cart', 'dist-cart', 'slide-polar', 'z1-polar', 'z2-polar', 'dist-polar']) {
      assert(await attr(`#distance-ex-${id}`, 'data-col') !== null, `D3: explainer cell #distance-ex-${id} exists`);
    }
    const polarSlide = await attr('#distance-ex-slide-polar', 'data-tex');
    assert(polarSlide.includes('0.381'), `D3: the slide's own polar address Arg(5 + 2i) = 0.381: ${polarSlide}`);
    // arg z is written as a list with Arg (the home value) in bold, for both points
    const argsText = await text('#distance-args');
    assert(argsText.includes('arg z₁ = { …') && argsText.includes('arg z₂ = { …'), 'D3: arg z1 and arg z2 are shown as lists');
    assert(await page.evaluate(() => document.querySelectorAll('#distance-args strong.dist-home').length) === 2, 'D3: one home value (Arg) is bold in each list');

    // D3b the token deep links change the mode of a mounted station
    for (const [hash, mode, readoutStart, rowId] of [['#distance-triangle', 'triangle', '|z\u2081| + |z\u2082|', 'cross'], ['#distance-circle', 'circle', 'circle:', 'set'], ['#distance-two', 'two', 'd =', 'slide']]) {
      await goto(hash);
      for (const m of ['two', 'circle', 'triangle']) assert(await pressed(`distance-mode-${m}`) === String(m === mode), `D3b ${hash}: chip ${m} pressed state`);
      assert((await text('#distance-readout')).startsWith(readoutStart), `D3b ${hash}: readout starts with "${readoutStart}"`);
      assert(await attr(`#distance-ex-${rowId}-cart`, 'data-col') !== null, `D3b ${hash}: the explainer has the rows of ${mode}`);
    }

    // D4 problem 1.2.1: the circle about 1 + 2i with radius 3
    await goto('#problem-1-2-1');
    assert(await pressed('distance-mode-circle') === 'true', 'D4: circle chip pressed');
    const r4 = await text('#distance-readout');
    assert(r4 === 'circle: center 1 + 2i, radius 3', `D4: readout, got "${r4}"`);
    assert(await isHidden('#distance-plane-z1'), 'D4: the two-point handles are hidden in circle mode');
    const setCart = await attr('#distance-ex-set-cart', 'data-tex');
    assert(setCart.includes('(x - 1)^2 + (y - 2)^2 = 3^2 = 9'), `D4: the Cartesian check of the circle: ${setCart}`);
    assert((await text('#distance-args')).includes('π/2'), 'D4: arg(z - a) lists Arg = pi/2 for the dot straight above a');
    await answerFits('distance-answer', 'D4 (1.2.1)');

    // D5 dragging the dot to 1 + 6i makes the radius 4 (a whole-number snap makes it exact)
    const dz = await dragHandle(page, 'distance-plane-R', { re: 1, im: 6 });
    near(dz.re, 1, 1e-9, 'D5 dot.re'); near(dz.im, 6, 1e-9, 'D5 dot.im');
    const r5 = await text('#distance-readout');
    assert(r5 === 'circle: center 1 + 2i, radius 4', `D5: readout, got "${r5}"`);

    // D6 screenshot of the circle
    await shot('circle');

    // D7 triangle inequality: the default numbers
    await clickChip(page, 'distance-mode-triangle');
    const r7 = await text('#distance-readout');
    assert(r7 === '|z\u2081| + |z\u2082| = 5.398; |z\u2081 + z\u2082| = 5; slack = 0.398; lower bound ||z\u2081| \u2212 |z\u2082|| = 0.926', `D7: readout, got "${r7}"`);
    assert(!await isHidden('#distance-gauge'), 'D7: the gauge is visible');
    assert(await attr('#distance-gauge', 'data-slack') === '0.398', 'D7: gauge data-slack');
    assert(await attr('#distance-aligned', 'data-agree') === 'no', 'D7: the arguments differ');
    assert((await attr('#distance-ex-cross-polar', 'data-tex')).includes('= 5'), 'D7: the polar cross term equals c = 5');
    const fp = await attr('#distance-ex-same-polar', 'data-tex'), fc = await attr('#distance-ex-same-cart', 'data-tex');
    assert(fp.includes('|z_1 + z_2| = 5') && fc.includes('|z_1 + z_2| = 5'), `D7: both footer cells say |z1 + z2| = 5 (polar: ${fp}; cartesian: ${fc})`);
    assert((await text('#distance-status')).includes('slack = 0.398'), 'D7: a mode change is announced in the live region');

    // D8 line the two points up: the slack closes exactly
    await dragHandle(page, 'distance-plane-z1', { re: 1, im: 1 });
    const zb = await dragHandle(page, 'distance-plane-z2', { re: 2, im: 2 });
    near(zb.re, 2, 1e-9, 'D8 z2.re'); near(zb.im, 2, 1e-9, 'D8 z2.im');
    const r8 = await text('#distance-readout'), s8 = slackOf(r8);
    assert(s8 < 0.02, `D8: slack < 0.02, got ${s8} in "${r8}"`);
    assert(s8 === 0, `D8: the snap makes the slack exactly 0, got ${s8}`);
    assert(await attr('#distance-aligned', 'data-agree') === 'exact', 'D8: the arguments are the same set');
    assert((await text('#distance-aligned')).startsWith('Same direction'), 'D8: the verdict says same direction');
    const sets = await page.evaluate(() => [...document.querySelectorAll('#distance-args .dist-set')].map((p) => p.textContent.replace(/^[^=]*=\s*/, '')));
    assert(sets.length === 2 && sets[0] === sets[1], `D8: the two lists of angles are the same set: ${JSON.stringify(sets)}`);
    assertWordsClear(assert, await readWords(page, 'distance-plane'), 'D8 aligned triangle', ['|z₁ + z₂| = 4.243', '|z₁| = 1.414', '|z₂| = 2.828', 'z₁ + z₂ (longest)']);
    await shot('triangle-aligned');

    // D9 turn z2 away: slack opens
    await dragHandle(page, 'distance-plane-z2', { re: -2, im: 2 });
    const r9 = await text('#distance-readout');
    assert(slackOf(r9) > 1, `D9: slack > 1, got "${r9}"`);
    assert(await attr('#distance-aligned', 'data-agree') === 'no', 'D9: the arguments differ again');
    near(Number(await attr('#distance-gauge', 'data-slack')), 1.08, 0.001, 'D9 gauge slack');

    // D10 a keyboard move is not snapped
    await page.focus('#distance-plane-z2');
    await page.keyboard.press('ArrowRight');
    await settle(page);
    const zk = await handleZ(page, 'distance-plane-z2');
    near(zk.re, -1.9, 1e-9, 'D10 z2.re after ArrowRight'); near(zk.im, 2, 1e-9, 'D10 z2.im');
    assert(await text('#distance-readout') !== r9, 'D10: the readout changed with the key press');

    // D11 the polar checkbox redraws the plane and is remembered per mode (it starts on a plane 420 px wide or more, off on a narrower one)
    const on0 = await page.isChecked('#distance-polar');
    assert(on0 === wide, `D11: the angle checkbox starts ${wide ? 'on' : 'off'} in triangle mode on this plane`);
    const d0 = await draws('distance-plane');
    await page.setChecked('#distance-polar', !on0); await settle(page, 3);
    const d1 = await draws('distance-plane');
    assert(d1 > d0, `D11: ticking the box redraws the plane (${d0} -> ${d1})`);
    assert(await page.evaluate(() => window.__mv.distance.state().polar.triangle) === !on0, 'D11: state follows the box');
    await page.setChecked('#distance-polar', on0); await settle(page, 3);
    assert(await draws('distance-plane') > d1, 'D11: ticking it back redraws the plane');
    assert(await page.evaluate(() => window.__mv.distance.state().polar.triangle) === on0, 'D11: state follows the box again');
    // with the angle words on, the busiest state still has no two words touching
    await page.setChecked('#distance-polar', true); await settle(page, 3);
    assertWordsClear(assert, await readWords(page, 'distance-plane'), 'D11 triangle with the angle words on', ['Arg z₁ = ', 'Arg z₂ = '], { ticks: false });
    await page.setChecked('#distance-polar', on0); await settle(page, 3);

    // D12 back to two points: that mode kept its own points
    await clickChip(page, 'distance-mode-two');
    const zt1 = await handleZ(page, 'distance-plane-z1');
    near(zt1.re, 4, 1e-9, 'D12 z1.re'); near(zt1.im, 3, 1e-9, 'D12 z1.im');
    assert(await text('#distance-readout') === 'd = 5.385; z\u2081 \u2212 z\u2082 = 5 + 2i', 'D12: readout of the two-point mode');
    assert(await attr('#distance-ex-dist-cart', 'data-col') !== null && await attr('#distance-ex-cross-cart', 'data-col') === null, 'D12: the explainer has the two-point rows again');

    // D12b degenerate states: the points on top of each other, and a point at 0. The words move clear (screenshots for the review).
    await dragHandle(page, 'distance-plane-z1', { re: -1, im: 1 });
    assert(await text('#distance-readout') === 'd = 0; z\u2081 \u2212 z\u2082 = 0', `D12b: z1 on z2 reads d = 0, got "${await text('#distance-readout')}"`);
    assertWordsClear(assert, await readWords(page, 'distance-plane'), 'D12b points on each other', ['d = 0']);
    await shot('same-point');
    await dragHandle(page, 'distance-plane-z1', { re: 0, im: 0 });
    assert((await text('#distance-readout')).startsWith('d = 1.414'), `D12b: z1 at 0 and z2 at -1 + i, got "${await text('#distance-readout')}"`);
    assertWordsClear(assert, await readWords(page, 'distance-plane'), 'D12b z1 at 0', ['d = 1.414']);
    await shot('z1-zero');
    await dragHandle(page, 'distance-plane-z1', { re: 4, im: 3 });

    // D13 whole-number snap can be turned off: the slide then reads decimals
    await page.uncheck('#distance-snap');
    const zf = await dragHandle(page, 'distance-plane-z2', { re: 0.5, im: 0.5 });
    near(zf.re, 0.5, 0.06, 'D13 z2.re with the snap off'); near(zf.im, 0.5, 0.06, 'D13 z2.im with the snap off');
    assert(Math.abs(zf.re - Math.round(zf.re)) > 0.01, `D13: with the snap off z2.re is not a whole number (${zf.re})`);
    await page.check('#distance-snap');

    // D14 no overflow, and leaving the station removes its hook and its plane
    await noOverflow('after all distance steps');
    await goto('#home');
    assert(await page.evaluate(() => window.__mv.distance === undefined && !window.__mv.planes.has('distance-plane')), 'D14: unmount removes window.__mv.distance and the plane');
  }

  // ---------------------------------------------------------------------------------------------------------------
  async function setsSteps() {
    // S0 the defaults are problem 1.5.2: the six answers are computed
    await page.waitForSelector('#sets-plane-p', { state: 'visible', timeout: 5000 });
    const answers = async () => Promise.all(['open', 'closed', 'bounded', 'connected', 'domain', 'region'].map((k) => attr(`#sets-${k}`, 'data-answer')));
    assert(JSON.stringify(await answers()) === JSON.stringify(['no', 'no', 'yes', 'yes', 'no', 'yes']), `S0: answers ${JSON.stringify(await answers())}`);
    assert(await attr('#sets-setline', 'data-text') === '1 < |z + i| <= 3', 'S0: set line');
    assert(await pressed('sets-preset-annulus') === 'true', 'S0: annulus preset pressed');
    const b0 = await text('#sets-boundary');
    assert(b0.includes('|z + i| = 1') && b0.includes('|z + i| = 3'), `S0: both circles are named as boundary: ${b0}`);
    assert(await page.isChecked('#sets-inner-strict') && !await page.isChecked('#sets-outer-strict'), 'S0: inner circle left out, outer circle kept');
    assert((await text('#sets-readout')) === 'probe: interior; \u03b5 = 0.5', `S0: default readout, got "${await text('#sets-readout')}"`);
    assert(!/eps|<=|>=/.test(await text('#sets-readout') + await text('#sets-bounded-reason')), 'S0: no code-like text (eps, <=) in the readout or the reasons');
    assertWordsClear(assert, await readWords(page, 'sets-plane'), 'S0 default', ['all in S', 'ρ = 2.236', 'c = -i']);
    assert((await text('#sets-ex-same')).startsWith('room around p:'), `S0: the footer names the room around p, got "${await text('#sets-ex-same')}"`);
    const where0 = await attr('#sets-ex-where-polar', 'data-tex');
    assert(where0.includes('\\varphi\\text{ is free: only }\\rho\\text{ decides)}'), `S0: the where row says phi is free: ${where0}`);
    assert((await text('#sets-problem')).includes('1.5.2'), 'S0: the problem callout names 1.5.2');
    assert(await text('#sets-status') === '', `S0: the polite live region stays silent while the page loads, got "${await text('#sets-status')}"`);
    await answerFits('sets-answer', 'S0 (1.5.2)');
    for (const k of ['open', 'closed', 'bounded', 'connected', 'domain', 'region']) {
      assert((await text(`#sets-${k}-reason`)).length > 20, `S0: chip ${k} has a reason sentence`);
    }

    // S1 the probe on the inner circle: boundary, snapped exactly onto the circle
    const p1 = await dragHandle(page, 'sets-plane-p', { re: 0, im: 0 });
    assert((await text('#sets-readout')).includes('probe: boundary'), `S1: readout, got "${await text('#sets-readout')}"`);
    near(Math.hypot(p1.re, p1.im + 1), 1, 1e-9, 'S1 on the inner circle');
    const d1 = await text('#sets-probe-detail');
    assert(d1.includes('p itself is not in S') && d1.includes('|z + i| = 1'), `S1: the sentence names the circle and says p is not in S: ${d1}`);
    assert((await attr('#sets-ex-test-cart', 'data-tex')).includes('\\text{not in S}'), 'S1: the explainer says not in S');
    // the footer says 0 on both sides (no 4.4e-16 left by the snap), and the where row names pi/2 for p - c = i
    for (const col of ['cart', 'polar']) {
      const f = await attr(`#sets-ex-same-${col}`, 'data-tex');
      assert(/\\varepsilon_\{\\max\} = 0\}$/.test(f), `S1: the ${col} footer says 0, got ${f}`);
    }
    assert(await attr('#sets-ex-same', 'data-agree') === 'true', 'S1: the footer agrees');
    assert((await attr('#sets-ex-where-polar', 'data-tex')).includes('\\frac{\\pi}{2}'), 'S1: the where row names Arg(p - c) = pi/2');
    await shot('probe-inner');

    // S2 the probe on the outer circle: boundary, and in S
    const p2 = await dragHandle(page, 'sets-plane-p', { re: 0, im: 2 });
    assert((await text('#sets-readout')).includes('probe: boundary'), `S2: readout, got "${await text('#sets-readout')}"`);
    near(Math.hypot(p2.re, p2.im + 1), 3, 1e-9, 'S2 on the outer circle');
    assert((await text('#sets-probe-detail')).includes('p itself is in S'), 'S2: p itself is in S');
    for (const col of ['cart', 'polar']) {
      const f = await attr(`#sets-ex-same-${col}`, 'data-tex');
      assert(/\\varepsilon_\{\\max\} = 0\}$/.test(f), `S2: the ${col} footer says 0, got ${f}`);
    }
    assert((await attr('#sets-ex-where-polar', 'data-tex')).includes('\\frac{\\pi}{2}'), 'S2: the where row names Arg(p - c) = pi/2 for p - c = 3i');
    await shot('probe-outer');

    // S3 interior and exterior
    await dragHandle(page, 'sets-plane-p', { re: 0, im: 1 });
    const ri = await text('#sets-readout');
    assert(ri.includes('probe: interior') && !ri.includes('exterior') && !ri.includes('boundary'), `S3: interior, got "${ri}"`);
    await dragHandle(page, 'sets-plane-p', { re: 3, im: 3 });
    const re = await text('#sets-readout');
    assert(re.includes('probe: exterior') && !re.includes('interior') && !re.includes('boundary'), `S3: exterior, got "${re}"`);

    // S4 leave out the outer circle: the open annulus is open and a domain
    await page.check('#sets-outer-strict'); await settle(page);
    assert(JSON.stringify(await answers()) === JSON.stringify(['yes', 'no', 'yes', 'yes', 'yes', 'yes']), `S4: answers ${JSON.stringify(await answers())}`);
    assert(await attr('#sets-setline', 'data-text') === '1 < |z + i| < 3', 'S4: set line');
    for (const id of ['annulus', 'closed', 'punctured', 'halfplane', 'twodisks']) assert(await pressed(`sets-preset-${id}`) === 'false', `S4: no preset chip pressed (${id})`);
    assert((await text('#sets-problem')).includes('You changed the set'), 'S4: the handout statement gives way to "You changed the set"');

    // S5 take it back: the 1.5.2 answers return
    await page.uncheck('#sets-outer-strict'); await settle(page);
    assert(JSON.stringify(await answers()) === JSON.stringify(['no', 'no', 'yes', 'yes', 'no', 'yes']), 'S5: the answers return');
    assert(await pressed('sets-preset-annulus') === 'true', 'S5: annulus preset pressed again');
    await page.uncheck('#sets-inner-strict'); await settle(page);
    assert(await pressed('sets-preset-closed') === 'true', 'S5: un-ticking the inner box as well gives the closed annulus');
    await page.check('#sets-inner-strict'); await settle(page);

    // S6 the other presets, computed
    await clickChip(page, 'sets-preset-closed');
    assert((await text('#sets-status')).includes('Closed annulus. 1 ≤ |z + i| ≤ 3.'), `S6: the live region reads the real signs, got "${await text('#sets-status')}"`);
    let a = await answers();
    assert(a[1] === 'yes' && a[0] === 'no', `S6 closed annulus: closed yes, open no: ${JSON.stringify(a)}`);
    await clickChip(page, 'sets-preset-punctured');
    a = await answers();
    assert(a[0] === 'yes' && a[4] === 'yes', `S6 punctured disk: open yes, domain yes: ${JSON.stringify(a)}`);
    assert((await text('#sets-boundary')).includes('the point z = -i'), 'S6 punctured: the centre is a boundary point');
    await dragHandle(page, 'sets-plane-p', { re: 0, im: -1 });
    assert((await text('#sets-readout')).includes('probe: boundary'), `S6 punctured: p on the puncture is a boundary point, got "${await text('#sets-readout')}"`);
    await shot('punctured-probe-at-centre');
    await dragHandle(page, 'sets-plane-p', { re: 2, im: 0 });
    await clickChip(page, 'sets-preset-halfplane');
    a = await answers();
    assert(a[2] === 'no' && a[4] === 'yes', `S6 half plane: bounded no, domain yes: ${JSON.stringify(a)}`);
    assert(await page.isDisabled('#sets-inner-strict'), 'S6 half plane: the inner box is disabled');
    assert((await text('#sets-inner-strict-label')).includes('No inner edge'), 'S6 half plane: the inner box says why');
    await shot('halfplane');
    await clickChip(page, 'sets-preset-twodisks');
    a = await answers();
    assert(a[3] === 'no' && a[4] === 'no' && a[5] === 'no' && a[0] === 'yes', `S6 two disks: connected no, domain no, region no, open yes: ${JSON.stringify(a)}`);
    assert((await text('#sets-connected-reason')).includes('2 separate pieces'), 'S6 two disks: two pieces');
    await shot('twodisks-probe-at-centre');                                  // p = 2 is the centre of the right disk: the words go clear of the probe disk
    assertWordsClear(assert, await readWords(page, 'sets-plane'), 'S6 two disks, probe at a centre', ['all in S', 'c = 2']);
    await clickChip(page, 'sets-connected');                                 // the piece words print after the probe's words and keep clear of them
    assertWordsClear(assert, await readWords(page, 'sets-plane'), 'S6 two disks with the piece words', ['piece 1', 'piece 2', 'all in S']);
    await shot('twodisks-pieces');
    await page.fill('#sets-eps', '0.5').catch(() => {});
    await clickChip(page, 'sets-connected');
    await clickChip(page, 'sets-preset-annulus');
    assert(JSON.stringify(await answers()) === JSON.stringify(['no', 'no', 'yes', 'yes', 'no', 'yes']), 'S6: annulus restores S0');

    // S7 the disk radius slider
    const took = await setSlider(page, 'sets-eps', 1.5);
    near(took, 1.5, 1e-9, 'S7 slider value');
    assert((await text('#sets-readout')).includes('\u03b5 = 1.5'), `S7: readout, got "${await text('#sets-readout')}"`);
    assert(await text('#sets-eps-value') === '1.5', 'S7: the value beside the slider');
    await setSlider(page, 'sets-eps', 0.5);

    // S8 a tap on empty canvas puts the probe there
    const tap = await planePixel(page, 'sets-plane', { re: 1, im: -2 });
    await page.mouse.click(tap.x, tap.y);
    await settle(page);
    const pt = await handleZ(page, 'sets-plane-p');
    near(pt.re, 1, 0.05, 'S8 tap.re'); near(pt.im, -2, 0.05, 'S8 tap.im');
    assert((await text('#sets-readout')).includes('probe: interior'), `S8: readout, got "${await text('#sets-readout')}"`);

    // S9 an answer chip highlights the edges that decide it
    await clickChip(page, 'sets-bounded');
    assert(await pressed('sets-bounded') === 'true', 'S9: bounded chip pressed');
    assert(await page.evaluate(() => window.__mv.sets.highlight()) === 'bounded', 'S9: highlight is bounded');
    await shot('highlight-bounded');

    // S9b the Bounded chip is the STORY's bounding disk: a handle on the negative real axis sets its radius, and the sentence says whether
    // the disk |z| <= R holds S. It starts short of the answer (R = 2), snaps onto the true radius 4, and stays on the real axis.
    const bound = () => page.evaluate(() => window.__mv.sets.state().bound);
    let bs = await bound();
    assert(bs.active && bs.R === 2 && bs.contains === false, `S9b: the disk starts at 2 and does not hold S: ${JSON.stringify(bs)}`);
    assert(!await isHidden('#sets-plane-bound'), 'S9b: the radius handle is visible on the Bounded chip');
    const bh0 = await handleZ(page, 'sets-plane-bound');
    near(bh0.re, -2, 1e-9, 'S9b handle.re'); near(bh0.im, 0, 1e-9, 'S9b handle.im');
    let bn = await text('#sets-bound-verdict');
    assert(bn.includes('|z| ≤ 2') && bn.includes('too small') && bn.includes('|z| = 4') && await attr('#sets-bound-verdict', 'data-contains') === 'false', `S9b: the sentence says the disk is too small: ${bn}`);
    assertWordsClear(assert, await readWords(page, 'sets-plane'), 'S9b the disk of radius 2', ['|z| ≤ 2']);
    await shot('bound-short');
    const b3 = await dragHandle(page, 'sets-plane-bound', { re: -3, im: 1.5 });         // off the axis: the handle stays on it, the radius is the distance from 0
    near(b3.im, 0, 1e-9, 'S9b the handle stays on the real axis'); assert(b3.re <= -3 && b3.re > -3.6, `S9b: dragged out to about 3 (${b3.re})`);
    bs = await bound(); assert(bs.contains === false && bs.R > 3 && bs.R < 3.6, `S9b: a disk of radius ${bs.R} still does not hold S`);
    const b4 = await dragHandle(page, 'sets-plane-bound', { re: -4, im: 0 });           // within a few pixels of 4: snaps onto it exactly
    near(b4.re, -4, 1e-9, 'S9b snapped onto the true radius');
    bs = await bound(); assert(bs.R === 4 && bs.contains === true, `S9b: radius 4 holds S: ${JSON.stringify(bs)}`);
    bn = await text('#sets-bound-verdict');
    assert(bn.includes('holds all of S') && bn.includes('smallest such disk centred at 0 is |z| ≤ 4') && await attr('#sets-bound-verdict', 'data-contains') === 'true', `S9b: the sentence says it holds S: ${bn}`);
    assertWordsClear(assert, await readWords(page, 'sets-plane'), 'S9b the disk of radius 4', ['|z| ≤ 4']);
    await shot('bound-holds');
    await dragHandle(page, 'sets-plane-bound', { re: -4.5, im: 0 });
    bs = await bound(); assert(bs.contains === true && bs.R > 4.2 && bs.R < 4.8, `S9b: a bigger disk holds S too (${bs.R})`);
    await page.focus('#sets-plane-bound');                                              // the keyboard: Left grows the disk, Right shrinks it, 0.1 a press
    const r0 = (await bound()).R;
    await page.keyboard.press('ArrowRight'); await settle(page);
    near((await bound()).R, r0 - 0.1, 1e-9, 'S9b ArrowRight shrinks the disk by 0.1');
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
    await settle(page);
    bs = await bound(); assert(bs.contains === false && bs.R < 4, `S9b: shrunk below 4 the disk no longer holds S (${bs.R})`);
    assert((await text('#sets-status')).includes('too small'), `S9b: the end of a keyboard move is announced, got "${await text('#sets-status')}"`);
    assert((await page.evaluate(() => document.getElementById('sets-plane-bound').getAttribute('aria-label'))).includes('S sticks out'), 'S9b: the handle says in words whether S sticks out');
    // an unbounded set has no disk: the handle is gone and the sentence says why; the annulus brings it back at its start
    await clickChip(page, 'sets-preset-halfplane');
    assert(await isHidden('#sets-plane-bound'), 'S9b: no radius handle for a half plane');
    assert((await text('#sets-bound-verdict')).includes('runs off to infinity'), `S9b: the half plane says no disk holds it, got "${await text('#sets-bound-verdict')}"`);
    await clickChip(page, 'sets-preset-annulus');
    bs = await bound(); assert(bs.active && bs.R === 2, `S9b: the annulus starts the disk again at 2: ${JSON.stringify(bs)}`);
    await clickChip(page, 'sets-bounded');
    assert(await page.evaluate(() => window.__mv.sets.highlight()) === null, 'S9: clicking again clears it');
    assert(await isHidden('#sets-plane-bound') && await isHidden('#sets-bound-verdict'), 'S9b: with the chip off the handle and the sentence go');

    // S10 the snap is a choice, not a limit
    await dragHandle(page, 'sets-plane-p', { re: 0, im: 0.1 });
    const s10a = await handleZ(page, 'sets-plane-p');
    assert((await text('#sets-readout')).includes('probe: boundary'), `S10: with the snap on, 0.1 above the circle snaps onto it, got "${await text('#sets-readout')}"`);
    near(Math.hypot(s10a.re, s10a.im + 1), 1, 1e-9, 'S10 snapped onto the circle');
    await page.uncheck('#sets-snap');
    await dragHandle(page, 'sets-plane-p', { re: 0, im: 0.1 });
    const s10b = await handleZ(page, 'sets-plane-p');
    assert((await text('#sets-readout')).includes('probe: interior'), `S10: with the snap off the probe stays interior, got "${await text('#sets-readout')}"`);
    const c10 = await page.evaluate(([re, im]) => window.__mv.sets.classify(re, im), [s10b.re, s10b.im]);
    assert(c10.kind === 'interior' && c10.epsMax > 0.05 && c10.epsMax < 0.15, `S10: classify says interior with a small eps_max, got ${JSON.stringify(c10)}`);
    await page.check('#sets-snap');

    // S11 the hook classifies exactly
    const c11 = await page.evaluate(() => window.__mv.sets.classify(0, 0));
    assert(c11.kind === 'boundary' && c11.inS === false && c11.epsMax === 0, `S11: classify(0, 0) ${JSON.stringify(c11)}`);
    const c11b = await page.evaluate(() => window.__mv.sets.classify(0, 2));
    assert(c11b.kind === 'boundary' && c11b.inS === true, `S11: classify(0, 2) ${JSON.stringify(c11b)}`);
    const st11 = await page.evaluate(() => window.__mv.sets.state());
    assert(st11.preset === 'annulus' && st11.flags.innerStrict === true && st11.flags.outerStrict === false, `S11: state() preset and flags ${JSON.stringify(st11.flags)}`);
    assert(st11.analysis.open === false && st11.analysis.domain === false && st11.analysis.region === true && st11.analysis.boundingRadius === 4, 'S11: state().analysis is the computed 1.5.2 analysis');
    assert(st11.kind === (await text('#sets-readout')).replace(/^probe: (\w+);.*$/, '$1'), `S11: state().kind matches the readout, got ${st11.kind}`);

    // S12 the token deep links change the preset of a mounted station
    const tokens = [['twodisks', '|z + 2| < 1 or |z - 2| < 1'], ['halfplane', 'Im z > 0'], ['punctured', '0 < |z + i| < 3'], ['closed', '1 <= |z + i| <= 3'], ['annulus', '1 < |z + i| <= 3']];
    for (const [id, data] of tokens) {
      await goto(`#sets-${id}`);
      for (const other of ['annulus', 'closed', 'punctured', 'halfplane', 'twodisks']) assert(await pressed(`sets-preset-${other}`) === String(other === id), `S12 #sets-${id}: chip ${other}`);
      assert(await attr('#sets-connected', 'data-answer') === (id === 'twodisks' ? 'no' : 'yes'), `S12 #sets-${id}: connected`);
      assert(await attr('#sets-setline', 'data-text') === data, `S12 #sets-${id}: set line`);
    }

    // S13 no overflow
    await noOverflow('after all sets steps');

    // S14 leaving the station removes its hook and its plane
    await goto('#home');
    assert(await page.evaluate(() => window.__mv.sets === undefined && !window.__mv.planes.has('sets-plane')), 'S14: unmount removes window.__mv.sets and the plane');
  }
}
