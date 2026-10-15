// Interaction script for the stations "branches" and "graph4d" (goal i1-station-branches-graph4d).
//   node tools/smoke.mjs --route branches --script tests/interact/i1-station-branches-graph4d.mjs [--dark]
//   node tools/smoke.mjs --route graph4d --script tests/interact/i1-station-branches-graph4d.mjs [--dark]
//   node tools/smoke.mjs --route problem-2-4-1 --script tests/interact/i1-station-branches-graph4d.mjs --dark
// One default export that dispatches on ctx.route. Passes at 1280x860 (light and dark) and at 390x844.
// Design: docs/designs/iter-1/i1-station-branches-graph4d.md, section 7.3.

import { dragHandle, clickChip, readText, setSlider, settle, parseCart } from './_helpers.mjs';

const PI = Math.PI;

async function waitText(page, selector, re, timeout = 3000) {
  await page.waitForFunction(({ selector, src }) => {
    const el = document.querySelector(selector);
    return !!el && new RegExp(src).test(el.textContent);
  }, { selector, src: re.source }, { timeout });
  return readText(page, selector);
}

const includes = (assert, text, part, what) => assert(text.includes(part), `${what}: expected "${part}" in "${text}"`);

async function branches(page, ctx) {
  const { assert } = ctx;
  const R = '#branches-readout', S = '#branches-walk-status';
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  // 1. the principal seam on load
  await page.waitForSelector('#branches-zplane-z');
  let r = await readText(page, R);
  includes(assert, r, 'seam = -pi', 'load readout');
  includes(assert, r, 'window (-pi, pi]', 'load readout');
  includes(assert, r, 'z = -1 + 0.5i', 'load readout');
  assert(await page.evaluate(() => window.__mv.branches.state().seam) === -PI, 'state().seam is exactly -pi');

  // 2. A2: the principal seam jumps across the negative real axis
  await clickChip(page, 'branches-walk-across');
  if (!reduced) {
    const st = await readText(page, S);
    assert(/walking|jumps/.test(st), `status right after the click is "walking..." (got "${st}")`);
  }
  const jumped = await waitText(page, S, /jumps/);
  includes(assert, jumped, 'jumps at the negative real axis', 'principal across');
  assert(await page.getAttribute(S, 'data-state') === 'jumps', 'data-state is jumps');
  const w1 = await page.evaluate(() => window.__mv.branches.state().walk);
  assert(w1.maxStep > 1.5, `maxStep of the principal across-walk is ${w1.maxStep}, expected > 1.5`);
  await ctx.shot('principal-jumps');

  // 3. seam to the positive real axis: the walk is cleared, the window moves
  await clickChip(page, 'branches-seam-positive');
  r = await readText(page, R);
  includes(assert, r, 'window (0, 2pi]', 'positive seam readout');
  includes(assert, r, 'seam = 0', 'positive seam readout');
  assert(await page.getAttribute('#branches-seam-positive', 'aria-pressed') === 'true', 'positive chip is pressed');
  assert((await readText(page, S)).startsWith('No walk yet.'), 'a seam change clears the walk');

  // 4. A2: the same walk is continuous
  await clickChip(page, 'branches-walk-across');
  await waitText(page, S, /continuous/);
  const w2 = await page.evaluate(() => window.__mv.branches.state().walk);
  assert(w2.maxStep < 0.05, `maxStep of the seam-0 across-walk is ${w2.maxStep}, expected < 0.05`);

  // 5. A2: along the axis it is continuous too
  await clickChip(page, 'branches-walk-along');
  await waitText(page, S, /continuous/);
  await ctx.shot('after-walk');

  // 6. A2: f(-1) = e^(i pi/3) on the seam-0 branch (the answer to 2.4.1)
  let z = await dragHandle(page, 'branches-zplane-z', { re: -1, im: 0 });
  assert(z.re === -1 && z.im === 0, `the magnet lands z exactly on -1 (got ${z.re}, ${z.im})`);
  r = await readText(page, R);
  includes(assert, r, '0.5 + 0.866i', 'f(-1) readout');
  includes(assert, r, 'pi/3', 'f(-1) readout');

  // 7. A2: the principal seam gives the same value AT -1 (it is the closed end of the window)
  await clickChip(page, 'branches-seam-principal');
  r = await readText(page, R);
  includes(assert, r, '0.5 + 0.866i', 'f(-1) on the principal seam');
  includes(assert, r, 'seam = -pi', 'principal readout');

  // 8. A2: just below the axis the principal branch has jumped to the other side
  z = await dragHandle(page, 'branches-zplane-z', { re: -1, im: -0.05 });
  assert(z.re === -1 && z.im === -0.05, `the magnet lands z on -1 - 0.05i (got ${z.re}, ${z.im})`);
  r = await readText(page, R);
  assert(/0\.5\d* - 0\.8\d*i/.test(r), `readout shows 0.5.. - 0.8..i at -1 - 0.05i: "${r}"`);
  const m = r.match(/= (-?[\d.]+ [+-] [\d.]+i); chosen theta/);
  assert(!!m, 'the readout has the value before "chosen theta"');
  const w = parseCart(m[1]);
  assert(w.re > 0.51 && w.re < 0.52 && w.im > -0.86 && w.im < -0.85, `value ${m[1]} is about 0.515 - 0.858i`);

  // 9. extras that guard the design
  await setSlider(page, 'branches-seam', -PI / 2);
  r = await readText(page, R);
  includes(assert, r, 'seam = -pi/2', 'slider to -pi/2');
  includes(assert, r, 'window (-pi/2, 3pi/2]', 'slider to -pi/2');
  assert(await page.getAttribute('#branches-seam-negimag', 'aria-pressed') === 'true', 'negimag chip is pressed');
  assert(await page.evaluate(() => window.__mv.branches.state().seam) === -PI / 2, 'the slider snapped to the exact -pi/2');

  await setSlider(page, 'branches-n', 4);
  r = await readText(page, R);
  includes(assert, r, 'z^(1/4)', 'n = 4');
  const ex4 = await page.evaluate(() => document.querySelector('#branches-ex-roots-cart')?.dataset.tex || '');
  assert(ex4.split(';').length === 4, `the explainer lists 4 roots at n = 4 ("${ex4}")`);
  await setSlider(page, 'branches-n', 3);

  // the lede, the captions and the panel title follow the root: n = 2 says "square root" and "two"
  await setSlider(page, 'branches-n', 2);
  includes(assert, await readText(page, '.station-lede'), 'The square root has two values at every point.', 'lede at n = 2');
  includes(assert, await readText(page, '#branches-surface-panel h2'), 'square root', 'surface title at n = 2');
  const cap2 = await readText(page, '#branches-wcap');
  includes(assert, cap2, 'Grey dot: the other root of z.', 'w-plane caption at n = 2');
  assert(!/1 roots/.test(cap2), `no "1 roots" at n = 2 ("${cap2}")`);
  await setSlider(page, 'branches-n', 3);
  includes(assert, await readText(page, '.station-lede'), 'The cube root has three values at every point.', 'lede back at n = 3');
  includes(assert, await readText(page, '#branches-wcap'), 'Grey dots: the other 2 roots of z.', 'w-plane caption back at n = 3');

  // the staircase names the SET arg z whatever the seam; its home row says theta when the window is not (-pi, pi]
  let setLine = await readText(page, '#branches-stairs-set');
  assert(/^arg z = \{/.test(setLine), `the set line at seam -pi/2 starts with "arg z = {" (got "${setLine}")`);
  includes(assert, await readText(page, '#branches-stairs-list'), 'θ = ', 'home row at seam -pi/2');
  await clickChip(page, 'branches-seam-principal');
  setLine = await readText(page, '#branches-stairs-set');
  assert(/^arg z = \{/.test(setLine), `the set line at the principal seam starts with "arg z = {" (got "${setLine}")`);
  includes(assert, await readText(page, '#branches-stairs-list'), 'Arg z = ', 'home row at the principal seam');
  await setSlider(page, 'branches-seam', -PI / 2);

  await clickChip(page, 'branches-stairs-k1');
  const pick = await readText(page, '#branches-pick');
  assert(/Step k = 1/.test(pick), `pick text after clicking k = 1: "${pick}"`);

  await dragHandle(page, 'branches-zplane-z', { re: 0, im: 0 });
  r = await readText(page, R);
  includes(assert, r, 'the branch point', 'z = 0');

  const surf = await page.evaluate(() => {
    const v = window.__mv.views3d && window.__mv.views3d.get('branches-surface');
    return v ? { unavailable: !!v.unavailable, has: !!v.scene.getObjectByName('riemann-root') } : null;
  });
  assert(!!surf, 'the 3D view is registered in window.__mv.views3d');
  assert(surf.unavailable || surf.has, 'the Riemann surface is in the scene');
  // everything laid over the opaque surface is drawn without a depth test, so the other beads and both window edges show
  const over = await page.evaluate(() => {
    const v = window.__mv.views3d && window.__mv.views3d.get('branches-surface');
    if (!v || v.unavailable) return null;
    const get = (n) => v.scene.getObjectByName(n);
    const flat = (o) => { const out = []; o.traverse((c) => { if (c.material) out.push(c); }); return out; };
    const names = ['branches-bead-0', 'branches-bead-1', 'branches-bead-2', 'branches-floor-marker', 'branches-fibre', 'branches-seam-edge-lo', 'branches-seam-edge-hi', 'branches-seam-floor'];
    const r = {};
    for (const n of names) { const o = get(n); r[n] = o ? flat(o).every((c) => c.material.depthTest === false && c.renderOrder >= 2) : false; }
    r.loDashes = get('branches-seam-edge-lo') ? get('branches-seam-edge-lo').children.length : 0;
    r.hiPieces = get('branches-seam-edge-hi') ? get('branches-seam-edge-hi').children.length : 0;
    return r;
  });
  if (over) {
    for (const [k, v] of Object.entries(over)) if (typeof v === 'boolean') assert(v, `${k} is drawn on top of the surface (no depth test)`);
    assert(over.loDashes >= 3, `the start edge is dashed (${over.loDashes} pieces)`);
    assert(over.hiPieces === 1, `the end edge is one solid piece (${over.hiPieces})`);
  }

  // predict first: the two routes state the window and f(-1), so they are behind "Show the answer", not above it
  const routesBefore = await page.evaluate(() => {
    const panel = document.getElementById('branches-problem');
    const bars = [...panel.querySelectorAll('.callout')];
    return { n: bars.length, visible: bars.filter((b) => b.offsetParent !== null).length, panelText: panel.innerText };
  });
  assert(routesBefore.visible === 0, `the route bars are hidden before "Show the answer" (${routesBefore.visible} visible)`);
  assert(!/0 < θ < 2π|e\^\{iπ\/3\}/.test(routesBefore.panelText), 'the visible problem text does not give the window or f(-1) away');

  // the chosen-angle label keeps clear of the dot, the ray and the seam label near the origin (screenshots for the reviewer;
  // the unit test T14 pins the geometry)
  await clickChip(page, 'branches-seam-positive');
  await dragHandle(page, 'branches-zplane-z', { re: 0.2, im: 0.15 });
  await settle(page, 3);
  await ctx.shot('label-seam0-small');
  await dragHandle(page, 'branches-zplane-z', { re: 1, im: 0.05 });
  await settle(page, 3);
  await ctx.shot('label-seam0-right');
  await setSlider(page, 'branches-seam', -PI / 2);

  await clickChip(page, 'branches-load-2-4-1');
  r = await readText(page, R);
  includes(assert, r, 'seam = 0', 'problem button');
  includes(assert, r, 'z = -1', 'problem button');
  await clickChip(page, 'branches-answer-toggle');
  assert(await page.evaluate(() => !document.getElementById('branches-answer').hidden), 'the answer is shown after the toggle');
  const routesAfter = await page.evaluate(() => [...document.querySelectorAll('#branches-answer .callout')].filter((b) => b.offsetParent !== null).map((b) => b.dataset.tone));
  assert(routesAfter.join() === 'cart,polar', `both route bars appear with the answer (${routesAfter.join()})`);
  await settle(page);
  await ctx.shot('end');
}

async function graph4d(page, ctx) {
  const { assert } = ctx;
  const R = '#graph4d-readout';
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  await page.waitForSelector('#graph4d-readout');
  await page.waitForFunction(() => !!window.__mv && !!window.__mv.graph4d);

  // A4: the readout names the shown coordinates
  let r = await readText(page, R);
  includes(assert, r, '(x, y, u)', 'load readout');
  includes(assert, r, 'v as colour', 'load readout');

  // A4: uv = 90 degrees swaps Re and Im
  await setSlider(page, 'graph4d-uv', PI / 2);
  r = await readText(page, R);
  assert(/\(x, y, -?v\)/.test(r), `readout at uv = 90: "${r}"`);
  includes(assert, r, 'u as colour', 'uv = 90 readout');
  includes(assert, r, 'uv = 90°', 'uv = 90 readout');

  // A4: presets, and the all-roots preset has at least 3 times the vertices
  await clickChip(page, 'graph4d-fn-sq');
  const n1 = await page.evaluate(() => window.__mv.graph4d.vertexCount);
  assert(n1 === 2401, `z^2 has 2401 vertices (got ${n1})`);
  await clickChip(page, 'graph4d-fn-cbrt-all');
  const n3 = await page.evaluate(() => window.__mv.graph4d.vertexCount);
  assert(n3 === 7350, `z^(1/3), all roots has 7350 vertices (got ${n3})`);
  assert(n3 >= 3 * n1, `${n3} is at least 3 times ${n1}`);
  r = await readText(page, R);
  includes(assert, r, 'uv = 90°', 'cbrt-all preset angle');
  await ctx.shot('cbrt-all-uv90');

  // every preset after every other one: the explainer redraws its new rows at once, and no row may meet the old model
  const errors = [];
  const onConsole = (msg) => { if (msg.type() === 'error') errors.push(msg.text()); };
  page.on('console', onConsole);
  for (const id of ['sq', 'exp', 'recip', 'sqrt-all', 'cbrt-all', 'recip', 'cbrt-all', 'sq', 'cbrt-all']) {
    await clickChip(page, 'graph4d-fn-' + id);
    await settle(page, 3);
  }
  page.off('console', onConsole);
  assert(errors.length === 0, `no console error while switching presets (got ${JSON.stringify(errors)})`);
  await page.waitForFunction(() => /u \+ iv = /.test(document.getElementById('graph4d-ex-w-cart')?.dataset.tex || ''), null, { timeout: 3000 });
  const exW = await page.evaluate(() => document.getElementById('graph4d-ex-w-cart')?.dataset.tex || '');
  assert(/u \+ iv = /.test(exW), `the cube root row shows u + iv after the switches ("${exW}")`);
  const exWp = await page.evaluate(() => document.getElementById('graph4d-ex-w-polar')?.dataset.tex || '');
  assert(/Arg\} z \/ 3/.test(exWp), `the cube root polar cell names phi = Arg z / 3 ("${exWp}")`);

  // the chips set the exponents inline: the sup of "e^z" is raised, it is not a flex item of its own
  const sup = await page.evaluate(() => {
    const chip = document.getElementById('graph4d-fn-exp'), s = chip.querySelector('sup');
    const label = s.parentElement, lr = label.getBoundingClientRect(), sr = s.getBoundingClientRect();
    return { align: getComputedStyle(s).verticalAlign, inLabel: label.tagName === 'SPAN' && label.parentElement === chip, raise: (lr.top + lr.height / 2) - (sr.top + sr.height / 2) };
  });
  assert(sup.inLabel && sup.align === 'super' && sup.raise > 1.5, `the e^z chip's exponent is raised and inline (${JSON.stringify(sup)})`);
  const gap = await page.evaluate(() => {
    const b = document.getElementById('graph4d-fn-cbrt-all'), s = b.querySelector('sup');
    const sr = s.getBoundingClientRect(), next = document.createRange();
    next.setStart(s.nextSibling, 0); next.setEnd(s.nextSibling, 1);
    return next.getBoundingClientRect().left - sr.right;              // from the exponent to the comma
  });
  assert(gap < 3, `no gap between the exponent 1/3 and the comma (${gap.toFixed(1)} px)`);

  // every bead of the probe is drawn on top of the opaque sheets (no depth test) and is big enough to see: the "other roots"
  // row of the explainer has something to point at in the 3D picture
  const beadReport = () => page.evaluate(() => {
    const v = window.__mv.views3d && window.__mv.views3d.get('graph4d-view');
    if (!v || v.unavailable) return null;
    const H = v.canvas.clientHeight, tan = Math.tan(v.camera.fov * Math.PI / 360);
    const out = [];
    for (let k = 0; k < 4; k++) {
      const b = v.scene.getObjectByName('graph4d-probe-' + k);
      if (!b) continue;
      const d = v.camera.position.distanceTo(b.position);
      out.push({ k, visible: b.visible, depthTest: b.material.depthTest, depthWrite: b.material.depthWrite, order: b.renderOrder, px: b.scale.x / (2 * d * tan / H) });
    }
    return out;
  });
  let beads = await beadReport();
  if (beads) {
    assert(beads.length === 3, `z^(1/3), all roots has 3 beads (got ${beads.length})`);
    for (const b of beads) {
      assert(b.depthTest === false && b.depthWrite === false, `bead ${b.k} has no depth test and no depth write (${JSON.stringify(b)})`);
      assert(b.visible && b.order >= 5, `bead ${b.k} is visible and drawn after the meshes (${JSON.stringify(b)})`);
      assert(b.px >= 4, `bead ${b.k} is at least 4 px in radius (${b.px.toFixed(1)})`);
    }
  }
  await ctx.shot('cbrt-beads');
  await clickChip(page, 'graph4d-sphere');                                    // the default probe has Im > 0: its bead is on the back of the sphere
  beads = await beadReport();
  if (beads) {
    assert(beads.length === 3 && beads[0].visible && beads.every((b) => b.depthTest === false), `sphere mode keeps the beads on top (${JSON.stringify(beads)})`);
  }
  await ctx.shot('sphere-beads');
  await clickChip(page, 'graph4d-sphere');                                    // back to the graph

  // A4: the modulus landscape
  await clickChip(page, 'graph4d-landscape');
  r = await readText(page, R);
  includes(assert, r, '|w|', 'landscape readout');
  assert(await page.getAttribute('#graph4d-landscape', 'aria-pressed') === 'true', 'landscape chip is pressed');
  assert(await page.evaluate(() => window.__mv.graph4d.mode) === 'landscape', 'mode is landscape');
  await ctx.shot('landscape');

  // extras: the sphere, the mode switch by slider, reset, spin, the probe, the strokes
  await clickChip(page, 'graph4d-sphere');
  r = await readText(page, R);
  includes(assert, r, 'Riemann sphere', 'sphere readout');
  const hs = await page.evaluate(() => ({ mode: window.__mv.graph4d.mode, shown: window.__mv.graph4d.shownVertexCount, all: window.__mv.graph4d.vertexCount }));
  assert(hs.mode === 'sphere' && hs.shown === 6305 && hs.all === 7350, `sphere: ${JSON.stringify(hs)}`);
  assert(await page.getAttribute('#graph4d-landscape', 'aria-pressed') === 'false', 'the landscape chip is released');
  await ctx.shot('sphere');

  await setSlider(page, 'graph4d-yv', PI / 2);
  r = await readText(page, R);
  includes(assert, r, 'uv = 90°, yv = 90°', 'yv slider');
  assert(await page.evaluate(() => window.__mv.graph4d.mode) === 'graph', 'moving a slider goes back to the 4D graph');
  await clickChip(page, 'graph4d-angles-reset');
  r = await readText(page, R);
  includes(assert, r, 'uv = 0°, yv = 0°', 'angles reset');

  if (!reduced) {
    await clickChip(page, 'graph4d-spin');
    await page.waitForTimeout(400);
    const uv = Number(await page.inputValue('#graph4d-uv'));
    assert(uv > 0.05, `spin moved the uv slider (value ${uv})`);
    await clickChip(page, 'graph4d-spin');
    assert(await page.evaluate(() => window.__mv.graph4d.spinning) === false, 'a second press stops the spin');
  }

  await dragHandle(page, 'graph4d-plane-z', { re: 0.5, im: 0.5 });
  await page.waitForFunction(() => document.getElementById('graph4d-ex-same')?.dataset.agree === 'true', null, { timeout: 3000 });
  const probe = await page.evaluate(() => window.__mv.graph4d.probe);
  assert(Math.abs(probe.z.re - 0.5) < 0.2 && Math.abs(probe.z.im - 0.5) < 0.2, `probe moved near 0.5 + 0.5i (${probe.z.re}, ${probe.z.im})`);

  assert(await page.getAttribute('#graph4d-legend-wheel', 'aria-hidden') === 'true', 'the decorative legend wheel is aria-hidden');

  // the Lab's own store format: an array of clean specs, one per shape
  const reload = async () => {
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('#graph4d-readout');
    await page.waitForFunction(() => !!window.__mv && !!window.__mv.graph4d);
  };
  const store = (specs) => page.evaluate((v) => localStorage.setItem('mv:lab.strokes', JSON.stringify(v)), specs);
  await store([{ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }]);
  await reload();
  assert(await page.evaluate(() => window.__mv.graph4d.strokeCount) === 1, 'one Lab circle is one curve');
  includes(assert, await readText(page, '#graph4d-strokes'), 'The Lab has 1 shape.', 'strokes panel, one circle');
  // one sector and one annulus are TWO shapes (8 + 12 curves), and a circle after them is not lost; a grid is named, not lifted
  await store([{ kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: PI / 4 }, { kind: 'annulus', center: { re: 0, im: -1 }, r0: 1, r1: 3 },
    { kind: 'circle', center: { re: 0, im: 0 }, r: 1 }, { kind: 'cartGrid', xRange: [-1, 1], yRange: [-1, 1], step: 0.5 }]);
  await reload();
  const hk = await page.evaluate(() => ({ shapes: window.__mv.graph4d.shapeCount, lifted: window.__mv.graph4d.liftedShapeCount, curves: window.__mv.graph4d.strokeCount }));
  assert(hk.shapes === 4 && hk.lifted === 3 && hk.curves === 21, `Lab sector + annulus + circle + grid: ${JSON.stringify(hk)}`);
  const panel = await readText(page, '#graph4d-strokes');
  includes(assert, panel, 'The Lab has 4 shapes.', 'strokes panel, four shapes');
  includes(assert, panel, '3 of them are drawn', 'strokes panel, four shapes');
  includes(assert, panel, 'Left out: 1 grid', 'strokes panel, four shapes');
  await page.evaluate(() => localStorage.removeItem('mv:lab.strokes'));
  await settle(page);
}

async function problem241(page, ctx) {
  const { assert } = ctx;
  await page.waitForSelector('#branches-readout');
  const r = await readText(page, '#branches-readout');
  for (const part of ['seam = 0', 'window (0, 2pi]', 'z = -1', '0.5 + 0.866i', 'pi/3']) includes(assert, r, part, '#problem-2-4-1 readout');
  const st = await page.evaluate(() => window.__mv.branches.state());
  assert(st.seam === 0 && st.n === 3, `the 2.4.1 preset is seam 0, n 3 (got ${st.seam}, ${st.n})`);
  assert(await page.getAttribute('.problem-chip', 'aria-current') === 'true', 'the 2.4.1 chip is marked current');
  await settle(page, 4);
  await ctx.shot('a3');
}

export default async function (page, ctx) {
  if (ctx.route === 'branches') return branches(page, ctx);
  if (ctx.route === 'graph4d') return graph4d(page, ctx);
  if (ctx.route === 'problem-2-4-1') return problem241(page, ctx);
  ctx.log(`no checks for route "${ctx.route}"`);
}
