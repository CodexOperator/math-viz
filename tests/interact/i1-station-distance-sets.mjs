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
    assert(r1 === 'd = 5.385; z1 - z2 = 5 + 2i', `D1: readout is "d = 5.385; z1 - z2 = 5 + 2i", got "${r1}"`);

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
    for (const [hash, mode, readoutStart, rowId] of [['#distance-triangle', 'triangle', '|z1| + |z2|', 'cross'], ['#distance-circle', 'circle', 'circle:', 'set'], ['#distance-two', 'two', 'd =', 'slide']]) {
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
    assert(r7 === '|z1| + |z2| = 5.398; |z1 + z2| = 5; slack = 0.398; lower bound ||z1| - |z2|| = 0.926', `D7: readout, got "${r7}"`);
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

    // D11 the polar checkbox redraws the plane and is remembered per mode
    assert(await page.isChecked('#distance-polar'), 'D11: the angle checkbox is on by default in triangle mode');
    const d0 = await draws('distance-plane');
    await page.uncheck('#distance-polar'); await settle(page, 3);
    const d1 = await draws('distance-plane');
    assert(d1 > d0, `D11: unchecking redraws the plane (${d0} -> ${d1})`);
    assert(await page.evaluate(() => window.__mv.distance.state().polar.triangle) === false, 'D11: state follows the box (off)');
    await page.check('#distance-polar'); await settle(page, 3);
    assert(await draws('distance-plane') > d1, 'D11: checking redraws the plane');
    assert(await page.evaluate(() => window.__mv.distance.state().polar.triangle) === true, 'D11: state follows the box (on)');

    // D12 back to two points: that mode kept its own points
    await clickChip(page, 'distance-mode-two');
    const zt1 = await handleZ(page, 'distance-plane-z1');
    near(zt1.re, 4, 1e-9, 'D12 z1.re'); near(zt1.im, 3, 1e-9, 'D12 z1.im');
    assert(await text('#distance-readout') === 'd = 5.385; z1 - z2 = 5 + 2i', 'D12: readout of the two-point mode');
    assert(await attr('#distance-ex-dist-cart', 'data-col') !== null && await attr('#distance-ex-cross-cart', 'data-col') === null, 'D12: the explainer has the two-point rows again');

    // D12b degenerate states: the points on top of each other, and a point at 0. The words move clear (screenshots for the review).
    await dragHandle(page, 'distance-plane-z1', { re: -1, im: 1 });
    assert(await text('#distance-readout') === 'd = 0; z1 - z2 = 0', `D12b: z1 on z2 reads d = 0, got "${await text('#distance-readout')}"`);
    await shot('same-point');
    await dragHandle(page, 'distance-plane-z1', { re: 0, im: 0 });
    assert((await text('#distance-readout')).startsWith('d = 1.414'), `D12b: z1 at 0 and z2 at -1 + i, got "${await text('#distance-readout')}"`);
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
    assert((await text('#sets-readout')) === 'probe: interior; eps = 0.5', `S0: default readout, got "${await text('#sets-readout')}"`);
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
    await clickChip(page, 'sets-preset-annulus');
    assert(JSON.stringify(await answers()) === JSON.stringify(['no', 'no', 'yes', 'yes', 'no', 'yes']), 'S6: annulus restores S0');

    // S7 the disk radius slider
    const took = await setSlider(page, 'sets-eps', 1.5);
    near(took, 1.5, 1e-9, 'S7 slider value');
    assert((await text('#sets-readout')).includes('eps = 1.5'), `S7: readout, got "${await text('#sets-readout')}"`);
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
    await clickChip(page, 'sets-bounded');
    assert(await page.evaluate(() => window.__mv.sets.highlight()) === null, 'S9: clicking again clears it');

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
