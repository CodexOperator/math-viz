// tests/interact/i1-station-powermap-reciprocal.mjs
// Interaction script for the stations `powermap` and `reciprocal` (goal i1-station-powermap-reciprocal).
// Run:  node tools/smoke.mjs --route problem-2-1-2 --script tests/interact/i1-station-powermap-reciprocal.mjs --dark
//       node tools/smoke.mjs --route problem-2-2-1 --script tests/interact/i1-station-powermap-reciprocal.mjs
//       node tools/smoke.mjs --route problem-2-5-1 --script tests/interact/i1-station-powermap-reciprocal.mjs --dark
// One file serves all routes and branches on ctx.route: powermap or problem-2-1-2 runs P1 to P11, problem-2-2-1 runs P7 to P10,
// reciprocal or problem-2-5-1 runs R1 to R10. A2 to A5 of the goal are the steps marked below.
// Fix round 1 adds: P1b (morph help has a real superscript), P6b (play runs 6 s), P6c (n = 6, x = 3 refits on release),
// P7b (the sector lede does not mention the line), R4b (preset chips after a drag), R4c (the sr sentence after a centre drag),
// R5b (the Invert stage draws solid, whatever stage came before), R8b (the sphere curves are tubes in --input and --output).
// Fix round 2 adds: P3b (the w-plane drop lines are named u and v, the w handle says w, the explainer row has a superscript n),
// P3c (no inline style on the route headings), R4d (the gap note shows for a line only), R5c (the stage captions), R5d (the image
// handle says 1/p), R8c (the sphere sits beside its controls on a wide screen), R9b (no inline style in the links and routes).

import { dragHandle, clickChip, readText, setSlider, settle, handleZ } from './_helpers.mjs';

export default async function (page, ctx) {
  const { route } = ctx;
  if (route === 'powermap' || route === 'problem-2-1-2') return powermapFull(page, ctx);
  if (route === 'problem-2-2-1') return powermapSector(page, ctx, false);
  if (route === 'reciprocal' || route === 'problem-2-5-1') return reciprocalSuite(page, ctx);
  throw new Error(`i1-station-powermap-reciprocal: no suite for route ${route}`);
}

// ---- helpers ---------------------------------------------------------------

// window.__mv[name] as plain data: { pts: [[re, im]], pieces: [[[re, im]]] } (the arrays carry a `pieces` property).
const image = (page, name) => page.evaluate((nm) => {
  const a = window.__mv && window.__mv[nm];
  if (!a) return null;
  return { pts: Array.from(a, (p) => [p.re, p.im]), pieces: (a.pieces || []).map((pc) => pc.map((p) => [p.re, p.im])) };
}, name);

const attr = (page, sel, a) => page.evaluate(([s, nm]) => { const e = document.querySelector(s); return e ? e.getAttribute(nm) : null; }, [sel, a]);
const dataTex = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? (e.dataset.tex || '') : ''; }, id);

// poll until a predicate holds (planes and explainers update once per frame; the explainer refines 220 ms later)
async function until(page, read, pred, tries = 30) {
  let v;
  for (let i = 0; i < tries; i++) {
    v = await read();
    if (pred(v)) return v;
    await settle(page, 2);
  }
  return v;
}
const readoutHas = (page, id, ...parts) => until(page, () => readText(page, id), (t) => parts.every((p) => (p instanceof RegExp ? p.test(t) : t.includes(p))));
const texHas = (page, id, part) => until(page, () => dataTex(page, id), (t) => t.includes(part));

async function commonChecks(page, ctx, tag) {
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id));
  ctx.assert(new Set(ids).size === ids.length, `${tag}: no duplicate element ids (${ids.filter((x, i) => ids.indexOf(x) !== i).join(', ')})`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ctx.assert(over <= 1, `${tag}: no horizontal overflow (${over}px)`);
}

// The aria-pressed flags of the four shape presets, in order circle1, line, circle0, unit.
const presetFlags = (page) => page.evaluate(() => ['circle1', 'line', 'circle0', 'unit'].map((k) => document.getElementById(`reciprocal-preset-${k}`).getAttribute('aria-pressed')));

// Redraw a plane once and record every text it draws (fillText), so a label that is canvas-only can still be asserted.
const recordTexts = (page, planeId) => page.evaluate((id) => new Promise((resolve) => {
  const plane = window.__mv.planes.get(id);
  const c = plane.canvas.getContext('2d');
  const seen = [];
  const fill = c.fillText;
  c.fillText = function (t, ...a) { seen.push(String(t)); return fill.call(c, t, ...a); };
  plane.requestDraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { delete c.fillText; resolve(seen); }));
}), planeId);

// Redraw the w-plane once and record every stroke() it makes: { width, dash } (the dash that was set when the stroke ran).
// A curve of the station is drawn at its own width (3 for the full curve), so the dash of THAT width is the dash of the curve.
const recordStrokes = (page, planeId = 'reciprocal-wplane') => page.evaluate((id) => new Promise((resolve) => {
  const plane = window.__mv.planes.get(id);
  const c = plane.canvas.getContext('2d');
  const seen = [];
  const stroke = c.stroke;
  c.stroke = function (...a) { seen.push({ width: c.lineWidth, dash: c.getLineDash().slice(), alpha: c.globalAlpha }); return stroke.apply(c, a); };
  plane.requestDraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { delete c.stroke; resolve(seen); }));
}), planeId);

// The 3D view only draws while it is on screen, so scroll the sphere into view and let it draw before a screenshot.
const showSphere = async (page) => {
  await page.evaluate(() => document.getElementById('reciprocal-sphere').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(450);
};

const SQ = '²';
const hasParabola = (t, c2, d) => new RegExp(`u = ${c2} - v(${SQ}|\\^2)/${d}`).test(t);

// ---- powermap --------------------------------------------------------------

async function powermapFull(page, ctx) {
  const { assert, log, shot } = ctx;
  const tag = 'powermap';

  // P1 (A2): the default readout is problem 2.1.2
  await settle(page, 4);
  let readout = await readoutHas(page, '#powermap-readout', 'x = 2', 'focus 0', 'vertex 4');
  assert(readout.includes('x = 2'), `${tag}: P1 readout has "x = 2" (got "${readout}")`);
  assert(hasParabola(readout, '4', '16'), `${tag}: P1 readout has u = 4 - v^2/16 (got "${readout}")`);
  assert(readout.includes('focus 0') && readout.includes('vertex 4'), `${tag}: P1 readout has focus 0 and vertex 4`);
  assert(await readText(page, '#powermap-n-out') === '2', `${tag}: P1 n output is 2`);
  assert(await attr(page, '#powermap-input-line', 'aria-pressed') === 'true', `${tag}: P1 the line input is pressed`);
  assert(await attr(page, '#powermap-grid-cart', 'aria-pressed') === 'true', `${tag}: P1 the Cartesian grid is pressed`);

  // P1b: the morph help writes the exponent as a superscript, not a caret; the lede is about the line
  const help = await page.evaluate(() => { const e = document.getElementById('powermap-morph-help'); const sup = e.querySelector('sup'); return { text: e.textContent, sup: sup ? sup.textContent : null }; });
  assert(!help.text.includes('^') && help.sup === '2' && help.text.includes('w = z2'), `${tag}: P1b the morph help shows z with a superscript 2 (got ${JSON.stringify(help)})`);
  assert((await readText(page, '#powermap-lede')).includes('x = 2 bends into a parabola'), `${tag}: P1b the lede names the line x = 2`);

  // P2 (A2): every point of the image of the line is on u = 4 - v^2/16
  let img = await image(page, 'powermapImage');
  assert(img && img.pts.length >= 100, `${tag}: P2 the image has at least 100 points (got ${img && img.pts.length})`);
  assert(img.pts.every(([u, v]) => Number.isFinite(u) && Number.isFinite(v)), `${tag}: P2 every image point is finite`);
  let worst = Math.max(...img.pts.map(([u, v]) => Math.abs(u - (4 - v * v / 16))));
  assert(worst < 1e-6, `${tag}: P2 every point has |u - (4 - v^2/16)| < 1e-6 (worst ${worst})`);
  assert(img.pieces.length === 1, `${tag}: P2 exactly one piece (got ${img.pieces.length})`);
  assert(Math.abs(img.pts[0][0] + 12) < 1e-9 && Math.abs(img.pts[0][1] + 16) < 1e-9, `${tag}: P2 the first point is (-12, -16) (got ${img.pts[0]})`);
  const last = img.pts[img.pts.length - 1];
  assert(Math.abs(last[0] + 12) < 1e-9 && Math.abs(last[1] - 16) < 1e-9, `${tag}: P2 the last point is (-12, 16) (got ${last})`);

  // P3: the explainer, the staircase
  assert((await texHas(page, 'powermap-ex-w-cart', '3 + 4i')).includes('3 + 4i'), `${tag}: P3 w (Cartesian) cell has 3 + 4i`);
  assert((await texHas(page, 'powermap-ex-argw-polar', '0.927')).includes('0.927'), `${tag}: P3 arg w (polar) cell has 0.927`);
  assert(await until(page, () => attr(page, '#powermap-ex-same', 'data-agree'), (v) => v === 'true') === 'true', `${tag}: P3 the same-point row agrees`);
  assert((await until(page, () => readText(page, '#powermap-stairs-arg'), (t) => t.includes('0.927'))).includes('0.927'), `${tag}: P3 the staircase shows Arg w = 0.927`);

  // P3b: on the w-plane the drop lines are named u and v (not x and y), the w handle says w, the explainer row has a superscript n
  const wTexts = await recordTexts(page, 'powermap-wplane');
  assert(wTexts.includes('u = 3') && wTexts.includes('v = 4'), `${tag}: P3b the w-plane drop lines read "u = 3" and "v = 4" (got ${JSON.stringify(wTexts.filter((t) => /^[uvxy] =/.test(t)))})`);
  assert(!wTexts.some((t) => /^[xy] = /.test(t)), `${tag}: P3b no "x = " or "y = " label on the w-plane`);
  const zTexts = await recordTexts(page, 'powermap-zplane');
  assert(zTexts.some((t) => t.startsWith('x = ')) && zTexts.some((t) => t.startsWith('y = ')), `${tag}: P3b the z-plane keeps "x = " and "y = "`);
  const wLabel = await attr(page, '#powermap-wplane-q', 'aria-label');
  assert(wLabel && wLabel.startsWith('Image w: w = 3 + 4i') && !wLabel.includes('z ='), `${tag}: P3b the w handle announces w = 3 + 4i, not z (got "${wLabel}")`);
  const rowLabel = await page.evaluate(() => [...document.querySelectorAll('#powermap-ex .ex-label')].map((e) => e.textContent).find((t) => t.startsWith('w =')));
  assert(rowLabel === 'w = z\u207f', `${tag}: P3b the explainer row reads w = zⁿ (got "${rowLabel}")`);
  // P3c: the route headings are <strong>, not an inline font-weight
  const heads = await page.evaluate(() => ['powermap-route-cart', 'powermap-route-polar'].map((i) => { const p = document.querySelector(`#${i} > p`); return { strong: !!p.querySelector('strong'), style: p.getAttribute('style') }; }));
  assert(heads.every((h) => h.strong && !h.style), `${tag}: P3c the route headings use <strong> and no inline style (${JSON.stringify(heads)})`);
  const linkStyles = await page.evaluate(() => [...document.querySelectorAll('#powermap-links [style]')].length);
  assert(linkStyles === 0, `${tag}: P3c no inline style inside the neighbour links (${linkStyles})`);

  // P4 (A2): drag the line to x = 1
  await dragHandle(page, 'powermap-zplane-line', { re: 1, im: 0 });
  readout = await readoutHas(page, '#powermap-readout', 'x = 1;');
  assert(readout.includes('x = 1') && hasParabola(readout, '1', '4'), `${tag}: P4 after the drag the readout has x = 1 and u = 1 - v^2/4 (got "${readout}")`);
  const hz = await handleZ(page, 'powermap-zplane-line');
  assert(Math.abs(hz.re - 1) < 1e-9 && Math.abs(hz.im) < 1e-9, `${tag}: P4 the line handle sits at (1, 0) (got ${hz.re}, ${hz.im})`);
  img = await image(page, 'powermapImage');
  worst = Math.max(...img.pts.map(([u, v]) => Math.abs(u - (1 - v * v / 4))));
  assert(worst < 1e-6, `${tag}: P4 every image point is on u = 1 - v^2/4 (worst ${worst})`);
  await dragHandle(page, 'powermap-zplane-line', { re: 2, im: 0 });
  readout = await readoutHas(page, '#powermap-readout', 'x = 2;');
  assert(readout.includes('x = 2'), `${tag}: P4 back to x = 2 (got "${readout}")`);

  // P5 (A3): the two grids
  await clickChip(page, 'powermap-grid-cart');
  assert(/bends/.test(await readText(page, '#powermap-gridnote')), `${tag}: P5 the Cartesian note says it bends`);
  let gp = await page.evaluate(() => window.__mv.powermapGridImage.pieces.length);
  assert(gp === 26, `${tag}: P5 the Cartesian grid has 26 pieces at n = 2 (got ${gp})`);
  await shot('cart');
  await clickChip(page, 'powermap-grid-polar');
  assert(/survives/.test(await readText(page, '#powermap-gridnote')), `${tag}: P5 the polar note says it survives`);
  gp = await page.evaluate(() => window.__mv.powermapGridImage.pieces.length);
  assert(gp === 18, `${tag}: P5 the polar grid has 18 pieces at n = 2 (got ${gp})`);
  await shot('polar');
  await clickChip(page, 'powermap-grid-cart');

  // P6: time, morph, play
  await setSlider(page, 'powermap-t', 0.75);
  const tOut = await until(page, () => readText(page, '#powermap-t-out'), (t) => t.includes('y = 2'));
  assert(tOut.includes('y = 2'), `${tag}: P6 the time output says y = 2 (got "${tOut}")`);
  assert((await texHas(page, 'powermap-ex-w-cart', '8i')).includes('8i'), `${tag}: P6 w (Cartesian) cell has 8i`);
  await setSlider(page, 'powermap-morph', 0);
  const m0 = await until(page, () => page.evaluate(() => window.__mv.powermapMorph && { s: window.__mv.powermapMorph.s, p: window.__mv.powermapMorph.pieces[0] && window.__mv.powermapMorph.pieces[0].points[0] }), (v) => v && v.s === 0);
  assert(m0 && m0.s === 0, `${tag}: P6 powermapMorph.s is 0 at the left end`);
  assert(m0.p && Math.abs(m0.p.re - 2) < 1e-9 && Math.abs(m0.p.im + 4) < 1e-9, `${tag}: P6 at s = 0 the first point is the unmapped (2, -4) (got ${JSON.stringify(m0.p)})`);
  await setSlider(page, 'powermap-morph', 1);
  const m1 = await until(page, () => page.evaluate(() => window.__mv.powermapMorph.s), (v) => v === 1);
  assert(m1 === 1, `${tag}: P6 powermapMorph.s is back to 1`);
  await clickChip(page, 'powermap-play');
  assert(await readText(page, '#powermap-play') === 'Pause', `${tag}: P6 Play reads Pause while running`);
  await clickChip(page, 'powermap-play');
  assert(await readText(page, '#powermap-play') === 'Play', `${tag}: P6 Play reads Play again after a second click`);
  await setSlider(page, 'powermap-t', 0.625);

  // P6b: Play takes 6 s of wall time from wherever t is (at 0.5 that is half of the bar in 6 s, about 8 percent a second)
  await setSlider(page, 'powermap-t', 0.5);
  const clock0 = await page.evaluate(() => performance.now());
  await clickChip(page, 'powermap-play');
  await page.waitForTimeout(1200);
  const tPlay = Number(await page.evaluate(() => document.getElementById('powermap-t').value));
  const clock1 = await page.evaluate(() => performance.now());
  await clickChip(page, 'powermap-play');
  const slowest = 0.5 + 0.5 * (clock1 - clock0) / 6000 + 0.015;
  assert(tPlay > 0.54 && tPlay <= slowest, `${tag}: P6b after ~1.2 s of Play t is ${tPlay} (between 0.54 and ${slowest.toFixed(3)} at 6 s; the old 3 s run would be past 0.65)`);
  await setSlider(page, 'powermap-t', 0.625);

  // P6c: n = 6 and x dragged from 2 to 3: on letting go the w-plane refits so the picture is on the plane, not a corner sliver
  await setSlider(page, 'powermap-n', 6);
  await dragHandle(page, 'powermap-zplane-line', { re: 3, im: 0 });
  readout = await readoutHas(page, '#powermap-readout', 'x = 3');
  const fit6 = await until(page, () => page.evaluate(() => {
    const v = window.__mv.planes.get('powermap-wplane').getView();
    const pts = window.__mv.powermapImage;
    return { half: v.unitsAcross / 2, cx: v.center.re, cy: v.center.im, nearest: Math.min(...Array.from(pts, (p) => Math.hypot(p.re - v.center.re, p.im - v.center.im))), hidden: document.getElementById('powermap-wnote').hidden };
  }), (r) => r.half > 729);
  log(`powermap: n = 6, x = 3: view half ${fit6.half.toFixed(0)}, nearest image point ${fit6.nearest.toFixed(1)}`);
  assert(Math.abs(fit6.nearest - 729) < 1e-6, `${tag}: P6c the nearest image point of x = 3 under z^6 is 729 (got ${fit6.nearest})`);
  assert(fit6.half >= 729 / 0.9 && fit6.hidden, `${tag}: P6c after the drag the view reaches past 729 with room (half ${fit6.half}), and the off-plane note is hidden`);
  await shot('pm-n6-c3');
  await setSlider(page, 'powermap-n', 2);
  await dragHandle(page, 'powermap-zplane-line', { re: 2, im: 0 });

  // P7 to P10 on the sector (the hash change comes first here)
  await commonChecks(page, ctx, `${tag} (line)`);
  return powermapSector(page, ctx, true);
}

async function powermapSector(page, ctx, changeHash) {
  const { assert, shot } = ctx;
  const tag = 'powermap sector';

  // P7 (A2): problem 2.2.1
  if (changeHash) {
    await page.evaluate(() => { location.hash = '#problem-2-2-1'; });
    await page.waitForTimeout(600);
  } else {
    await settle(page, 4);
  }
  let readout = await readoutHas(page, '#powermap-readout', '0 < arg z < 0.785', '0 < arg w < 2.356');
  assert(readout.includes('0 < arg z < 0.785') && readout.includes('0 < arg w < 2.356'), `${tag}: P7 readout (got "${readout}")`);
  assert(await attr(page, '#powermap-input-sector', 'aria-pressed') === 'true', `${tag}: P7 the sector input is pressed`);
  const lede = await readText(page, '#powermap-lede');
  assert(lede.includes('sector') && !lede.includes('parabola'), `${tag}: P7b the sector lede talks about the sector, not the parabola (got "${lede}")`);
  assert(await attr(page, '#powermap-grid-polar', 'aria-pressed') === 'true', `${tag}: P7 the polar grid is pressed`);
  const img = await image(page, 'powermapImage');
  const args = img.pts.map(([u, v]) => (u === 0 && v === 0 ? 0 : Math.atan2(v, u)));
  assert(args.every((a) => a >= -1e-6 && a <= 3 * Math.PI / 4 + 1e-6), `${tag}: P7 every image point has Arg in [0, 3pi/4] (range ${Math.min(...args)} to ${Math.max(...args)})`);
  assert(img.pieces.length === 8, `${tag}: P7 the sector image has 8 pieces (got ${img.pieces.length})`);

  // P8 (A2): raise n to 6
  await setSlider(page, 'powermap-n', 6);
  readout = await readoutHas(page, '#powermap-readout', '4.712');
  assert(readout.includes('4.712') && !readout.includes('(overlaps'), `${tag}: P8 n = 6 gives 4.712 and no overlap (got "${readout}")`);
  const fact = await readoutHas(page, '#powermap-fact', '6 times wider');
  assert(fact.includes('6 times wider'), `${tag}: P8 the fact line says 6 times wider (got "${fact}")`);

  // P9 (A2): drag the upper edge to 90 degrees
  await dragHandle(page, 'powermap-zplane-s1', { re: 0, im: 2 });
  readout = await readoutHas(page, '#powermap-readout', '(overlaps itself)');
  assert(readout.includes('(overlaps itself)') && readout.includes('1.571'), `${tag}: P9 the fan overlaps itself (got "${readout}")`);
  const s1 = await handleZ(page, 'powermap-zplane-s1');
  assert(Math.abs(s1.re) < 1e-6 && Math.abs(s1.im - 2.5) < 1e-6, `${tag}: P9 the b handle rests at (0, 2.5) (got ${s1.re}, ${s1.im})`);
  await shot('overlap');

  // P10: reset goes back to the problem
  assert(await readText(page, '#powermap-reset') === 'Reset to problem 2.2.1', `${tag}: P10 the reset button names problem 2.2.1`);
  await clickChip(page, 'powermap-reset');
  await page.waitForTimeout(600);
  readout = await readoutHas(page, '#powermap-readout', '0 < arg w < 2.356');
  assert(readout.includes('0 < arg w < 2.356') && !readout.includes('overlaps'), `${tag}: P10 reset restores problem 2.2.1 (got "${readout}")`);
  await commonChecks(page, ctx, tag);

  if (!changeHash) return;

  // P11: unmount (the other station of this goal)
  await page.evaluate(() => { location.hash = '#reciprocal'; });
  await page.waitForTimeout(600);
  const gone = await page.evaluate(() => ({
    image: window.__mv.powermapImage === undefined,
    z: window.__mv.planes.has('powermap-zplane'),
    w: window.__mv.planes.has('powermap-wplane'),
  }));
  assert(gone.image && !gone.z && !gone.w, `${tag}: P11 unmount removed the hook and the planes (${JSON.stringify(gone)})`);
  await commonChecks(page, ctx, 'after unmount');
}

// ---- reciprocal ------------------------------------------------------------

const R1 = 'shape: circle |z - 1| = 1; image: line Re w = 0.5; p = 1 + i; 1/p = 0.5 - 0.5i; |1/p| = 0.707';

async function reciprocalSuite(page, ctx) {
  const { assert, log, shot } = ctx;
  const tag = 'reciprocal';

  // R1 (A4): the default readout
  await settle(page, 4);
  let readout = await readText(page, '#reciprocal-readout');
  assert(readout === R1, `${tag}: R1 readout is "${R1}" (got "${readout}")`);
  assert(await attr(page, '#reciprocal-stage-both', 'aria-pressed') === 'true', `${tag}: R1 the Both stage is pressed`);

  // R2 (A4): the image is the line Re w = 1/2, with no segment through infinity
  let img = await image(page, 'reciprocalImage');
  assert(img.pieces.length === 2, `${tag}: R2 two pieces (got ${img.pieces.length})`);
  const finite = img.pts.filter(([u, v]) => Number.isFinite(u) && Number.isFinite(v));
  assert(finite.every(([u]) => Math.abs(u - 0.5) < 1e-6), `${tag}: R2 every finite point has |Re w - 0.5| < 1e-6`);
  let maxStep = 0;
  for (const pc of img.pieces) for (let i = 1; i < pc.length; i++) maxStep = Math.max(maxStep, Math.hypot(pc[i][0] - pc[i - 1][0], pc[i][1] - pc[i - 1][1]));
  log(`reciprocal: largest step inside a piece ${maxStep.toFixed(3)}`);
  assert(maxStep <= 5, `${tag}: R2 no step inside a piece is longer than 5 (largest ${maxStep})`);
  assert(finite.every(([u, v]) => Math.hypot(u, v) <= 64 + 1e-9), `${tag}: R2 no point has |w| > 64`);
  const seps = img.pts.filter(([u]) => !Number.isFinite(u)).length;
  assert(seps === 1, `${tag}: R2 exactly one separator (got ${seps})`);
  assert(img.pieces.reduce((s, pc) => s + pc.length, 0) === img.pts.length - 1, `${tag}: R2 the piece sizes add up to the flat array minus the separator`);

  // R3 (A4): drag the probe
  await dragHandle(page, 'reciprocal-zplane-p', { re: 2, im: 0 });
  readout = await readoutHas(page, '#reciprocal-readout', 'p = 2;');
  assert(readout.includes('p = 2') && readout.includes('1/p = 0.5;'), `${tag}: R3 p = 2 gives 1/p = 0.5 (got "${readout}")`);
  await dragHandle(page, 'reciprocal-zplane-p', { re: 1, im: 1 });
  readout = await readoutHas(page, '#reciprocal-readout', '1/p = 0.5 - 0.5i');
  assert(readout.includes('1/p = 0.5 - 0.5i'), `${tag}: R3 p = 1 + i gives 1/p = 0.5 - 0.5i (got "${readout}")`);
  await dragHandle(page, 'reciprocal-zplane-p', { re: 0.02, im: 0.2 });
  readout = await readoutHas(page, '#reciprocal-readout', /\|1\/p\| = 4\./);
  const big = Number(/\|1\/p\| = ([0-9.]+)/.exec(readout)[1]);
  assert(big > 4, `${tag}: R3 near 0 the length of 1/p is above 4 (got ${big})`);
  assert(await page.evaluate(() => document.getElementById('reciprocal-wnote').hidden), `${tag}: R3 the plane note stays hidden (the line is on the plane)`);
  await shot('near-zero');

  // R4 (A4): the presets
  await clickChip(page, 'reciprocal-preset-line');
  readout = await readoutHas(page, '#reciprocal-readout', 'image: circle through 0, center 0.5, radius 0.5');
  assert(readout.includes('circle') && readout.includes('through 0') && readout.includes('image: circle through 0, center 0.5, radius 0.5'), `${tag}: R4 line preset (got "${readout}")`);
  img = await image(page, 'reciprocalImage');
  assert(img.pieces.length === 1, `${tag}: R4 the line preset has one piece (got ${img.pieces.length})`);
  assert(img.pts.every(([u, v]) => Math.abs(Math.hypot(u - 0.5, v) - 0.5) < 1e-6), `${tag}: R4 every point is on |w - 0.5| = 0.5`);
  // R4d: the image circle of a line has one missing point, at 0; a sentence says so, only for a line
  const gap = () => page.evaluate(() => { const g = document.getElementById('reciprocal-gap'); return { hidden: g.hidden, text: g.textContent }; });
  let g = await gap();
  assert(!g.hidden && g.text.includes('image of the point at infinity') && g.text.includes('gap at 0'), `${tag}: R4d the line preset explains the gap at 0 (got ${JSON.stringify(g)})`);
  await clickChip(page, 'reciprocal-preset-circle0');
  readout = await readoutHas(page, '#reciprocal-readout', 'image: circle center 0.75, radius 0.25');
  assert((await gap()).hidden, `${tag}: R4d a circle has no gap note`);
  assert(readout.includes('image: circle center 0.75, radius 0.25'), `${tag}: R4 circle0 preset (got "${readout}")`);
  await clickChip(page, 'reciprocal-preset-unit');
  readout = await readoutHas(page, '#reciprocal-readout', 'image: circle |w| = 1');
  assert(readout.includes('image: circle |w| = 1'), `${tag}: R4 unit preset (got "${readout}")`);
  await clickChip(page, 'reciprocal-preset-circle1');
  readout = await readoutHas(page, '#reciprocal-readout', R1);
  assert(readout === R1, `${tag}: R4 back to the default (got "${readout}")`);

  // R4b: dragging a shape handle leaves no preset pressed (the shape is "custom"); a preset chip presses itself again when chosen
  assert((await presetFlags(page)).join() === 'true,false,false,false', `${tag}: R4b the default presses |z - 1| = 1`);
  await dragHandle(page, 'reciprocal-zplane-c', { re: 1.5, im: 0.5 });
  readout = await readoutHas(page, '#reciprocal-readout', 'circle |z - (1.5 + 0.5i)| = 1');
  assert(readout.includes('circle |z - (1.5 + 0.5i)| = 1'), `${tag}: R4b the centre is at 1.5 + 0.5i (got "${readout}")`);
  assert((await presetFlags(page)).join() === 'false,false,false,false', `${tag}: R4b after a centre drag no preset chip is pressed (got ${await presetFlags(page)})`);
  assert((await readText(page, '#reciprocal-problem-note')).includes('You changed the shape'), `${tag}: R4b the problem note says the shape changed`);
  // R4c: the sentence for screen readers follows a centre drag (the final drag event schedules it)
  await dragHandle(page, 'reciprocal-zplane-c', { re: 1.1, im: 0 });
  const sr = await until(page, () => readText(page, '#reciprocal-sr'), (t) => t.includes('|z - 1.1| = 1'), 40);
  assert(sr.includes('|z - 1.1| = 1'), `${tag}: R4c the screen-reader sentence follows the centre drag (got "${sr}")`);
  await dragHandle(page, 'reciprocal-zplane-r', { re: 2.6, im: 0 });
  assert((await presetFlags(page)).join() === 'false,false,false,false', `${tag}: R4b after a radius drag no preset chip is pressed`);
  await clickChip(page, 'reciprocal-preset-line');
  assert((await presetFlags(page)).join() === 'false,true,false,false', `${tag}: R4b the line preset presses its own chip (got ${await presetFlags(page)})`);
  await dragHandle(page, 'reciprocal-zplane-a', { re: 1, im: -2 });
  assert((await presetFlags(page)).join() === 'false,false,false,false', `${tag}: R4b after moving a line end no preset chip is pressed (got ${await presetFlags(page)})`);
  await clickChip(page, 'reciprocal-preset-circle1');
  assert((await presetFlags(page)).join() === 'true,false,false,false', `${tag}: R4b back to the default presses |z - 1| = 1`);
  readout = await readoutHas(page, '#reciprocal-readout', R1);

  // R5 (A5): the two stages
  await clickChip(page, 'reciprocal-stage-invert');
  await shot('invert');
  // R5b: "1. Invert" draws the stage-1 image SOLID at width 3 (the dashed ghost of the Both view must not leak into it),
  // whether we came from Both (the default), from Mirror, or via a drag.
  const solid3 = (seen) => { const w3 = seen.filter((x) => x.width === 3); return w3.length > 0 && w3.every((x) => x.dash.length === 0); };
  let seen = await recordStrokes(page);
  assert(solid3(seen), `${tag}: R5b Both -> Invert draws the stage-1 curve solid (${JSON.stringify(seen.filter((x) => x.width === 3).slice(0, 3))})`);
  assert(seen.some((x) => x.dash.length > 0), `${tag}: R5b the unit circle of inversion is still dashed`);
  await clickChip(page, 'reciprocal-stage-both');
  seen = await recordStrokes(page);
  assert(seen.some((x) => x.width === 1.5 && x.dash.length > 0), `${tag}: R5b in Both the stage-1 ghost is the dashed width-1.5 curve`);
  assert(solid3(seen), `${tag}: R5b in Both the result is drawn solid at width 3`);
  await clickChip(page, 'reciprocal-stage-mirror');
  await clickChip(page, 'reciprocal-stage-invert');
  seen = await recordStrokes(page);
  assert(solid3(seen), `${tag}: R5b Mirror -> Invert draws the stage-1 curve solid`);
  await clickChip(page, 'reciprocal-stage-both');
  await clickChip(page, 'reciprocal-stage-invert');
  seen = await recordStrokes(page);
  assert(solid3(seen), `${tag}: R5b Both -> Invert (second time) draws the stage-1 curve solid`);
  await shot('invert-after-both');
  const st = await page.evaluate(() => {
    const s = window.__mv.reciprocalStages;
    const f = (pc) => pc.points.slice(0, 2).map((p) => [p.re, p.im]);
    return { stage: s.stage, inverted: f(s.inverted[0]), final: f(s.final[0]) };
  });
  assert(st.stage === 'invert', `${tag}: R5 reciprocalStages.stage is invert`);
  assert(Math.abs(st.inverted[0][0] - 0.5) < 1e-9 && Math.abs(st.inverted[0][1]) < 1e-9, `${tag}: R5 stage 1 starts at (0.5, 0) (got ${st.inverted[0]})`);
  assert(st.inverted[1][1] > st.inverted[0][1], `${tag}: R5 stage 1 runs upward`);
  assert(st.final[1][1] < st.final[0][1], `${tag}: R5 1/z runs downward`);
  assert((await readText(page, '#reciprocal-stage-note')).includes('Stage 1'), `${tag}: R5 the note says Stage 1`);
  assert(await readText(page, '#reciprocal-wcap') === 'w-plane after stage 1 (invert)', `${tag}: R5c the invert caption has no colon (got "${await readText(page, '#reciprocal-wcap')}")`);
  await clickChip(page, 'reciprocal-stage-mirror');
  assert((await readText(page, '#reciprocal-stage-note')).includes('Stage 2'), `${tag}: R5 the note says Stage 2`);
  assert(await readText(page, '#reciprocal-wcap') === 'w-plane after stage 2 (mirror)', `${tag}: R5c the mirror caption has no colon (got "${await readText(page, '#reciprocal-wcap')}")`);
  const qLabel = await attr(page, '#reciprocal-wplane-q', 'aria-label');
  assert(qLabel && qLabel.startsWith('Image 1/p: 1/p = 0.5 - 0.5i') && !qLabel.includes('z ='), `${tag}: R5d the image handle announces 1/p, not z (got "${qLabel}")`);
  await shot('mirror');
  await clickChip(page, 'reciprocal-stage-both');
  assert(await readText(page, '#reciprocal-wcap') === 'w-plane: w = 1/z', `${tag}: R5c the Both caption keeps its colon (got "${await readText(page, '#reciprocal-wcap')}")`);
  await shot('both');

  // R6: the explainer
  assert((await texHas(page, 'reciprocal-ex-w-cart', '0.5 - 0.5i')).includes('0.5 - 0.5i'), `${tag}: R6 1/p (Cartesian) cell has 0.5 - 0.5i`);
  assert((await texHas(page, 'reciprocal-ex-inv-cart', '0.5 + 0.5i')).includes('0.5 + 0.5i'), `${tag}: R6 stage 1 (Cartesian) cell has 0.5 + 0.5i`);
  assert((await texHas(page, 'reciprocal-ex-img-polar', '0.5')).includes('0.5'), `${tag}: R6 the image row (polar) has 0.5`);
  assert(await until(page, () => attr(page, '#reciprocal-ex-same', 'data-agree'), (v) => v === 'true') === 'true', `${tag}: R6 the same-point row agrees`);

  // R7: the morph
  const firstPoint = () => page.evaluate(() => { const m = window.__mv.reciprocalMorph; const p = m.pieces[0] && m.pieces[0].points[0]; return { s: m.s, stage: m.stage, p: p && [p.re, p.im] }; });
  await setSlider(page, 'reciprocal-morph', 0);
  let fp = await until(page, firstPoint, (v) => v.s === 0);
  assert(fp.s === 0 && fp.p && Math.abs(fp.p[0] - 2) < 1e-9 && Math.abs(fp.p[1]) < 1e-9, `${tag}: R7 at s = 0 the first point is (2, 0) (got ${JSON.stringify(fp)})`);
  await setSlider(page, 'reciprocal-morph', 0.5);
  fp = await until(page, firstPoint, (v) => v.s === 0.5);
  assert(await readText(page, '#reciprocal-morph-out') === 's = 0.5', `${tag}: R7 the morph output reads s = 0.5`);
  assert(fp.p && Math.abs(fp.p[0] - 1.25) < 1e-9 && Math.abs(fp.p[1]) < 1e-9, `${tag}: R7 at s = 0.5 the first point is (1.25, 0) (got ${JSON.stringify(fp)})`);
  await shot('morph');
  await clickChip(page, 'reciprocal-stage-mirror');
  await setSlider(page, 'reciprocal-morph', 0);
  fp = await until(page, firstPoint, (v) => v.s === 0 && v.stage === 'mirror');
  assert(fp.p && Math.abs(fp.p[0] - 0.5) < 1e-9 && Math.abs(fp.p[1]) < 1e-9, `${tag}: R7 the mirror stage at s = 0 starts at the stage-1 image (0.5, 0) (got ${JSON.stringify(fp)})`);
  await setSlider(page, 'reciprocal-morph', 1);
  await clickChip(page, 'reciprocal-stage-both');
  await until(page, firstPoint, (v) => v.s === 1 && v.stage === 'both');

  // R8: the sphere
  const available = await page.evaluate(() => window.__mv.reciprocalSphere && window.__mv.reciprocalSphere.available);
  if (!available) {
    assert(await page.evaluate(() => document.getElementById('reciprocal-sphere-turn').disabled), `${tag}: R8 without WebGL the turn slider is disabled`);
  } else {
    await setSlider(page, 'reciprocal-sphere-turn', 1);
    assert(await readText(page, '#reciprocal-sphere-turn-out') === '180 degrees', `${tag}: R8 turn 1 reads 180 degrees`);
    assert(await page.evaluate(() => window.__mv.reciprocalSphere.turn === 1), `${tag}: R8 reciprocalSphere.turn is 1`);
    await showSphere(page);
    await shot('sphere');
    // R8b: the input and the turned copy are tubes (WebGL lines are 1 px), flat green and flat purple, and the turned one is not near black
    const tubes = await page.evaluate(() => {
      const v = window.__mv.views3d.get('reciprocal-sphere');
      const out = [];
      v.scene.traverse((o) => {
        if (o.userData && o.userData.kind === 'sphere-tube') {
          let visible = true, p = o; while (p) { if (!p.visible) visible = false; p = p.parent; }
          const m = o.children[0] && o.children[0].material;
          out.push({ token: o.userData.token, meshes: o.children.length, visible, rgb: m ? [m.color.r, m.color.g, m.color.b] : null });
        }
      });
      return out;
    });
    assert(tubes.length === 2 && tubes.every((t) => t.meshes >= 1 && t.visible), `${tag}: R8b two visible tube groups on the sphere (got ${JSON.stringify(tubes)})`);
    const turned = tubes.find((t) => t.token === '--output'), fixed = tubes.find((t) => t.token === '--input');
    assert(turned && fixed, `${tag}: R8b one tube per token`);
    assert(Math.max(...turned.rgb) > 0.1 && Math.max(...fixed.rgb) > 0.1, `${tag}: R8b neither curve is near black (linear rgb, turned ${turned.rgb}, input ${fixed.rgb})`);
    await setSlider(page, 'reciprocal-sphere-turn', 0.5);
    await showSphere(page);
    await shot('sphere-90');
    await setSlider(page, 'reciprocal-sphere-turn', 1);
    await setSlider(page, 'reciprocal-sphere-turn', 0);
    assert(await readText(page, '#reciprocal-sphere-turn-out') === '0 degrees', `${tag}: R8 turn 0 reads 0 degrees`);
    const views = await page.evaluate(() => [...window.__mv.views3d.keys()]);
    assert(views.length === 1 && views[0] === 'reciprocal-sphere', `${tag}: R8 one 3D view with id reciprocal-sphere (got ${views})`);
  }

  // R8c: on a wide screen the sphere and its controls sit side by side (no max-width box with empty space beside it); on a phone they stack
  const lay = await page.evaluate(() => {
    const a = document.getElementById('reciprocal-sphere').getBoundingClientRect(), b = document.getElementById('reciprocal-sphere-turn').getBoundingClientRect();
    return { sphereW: a.width, beside: b.left >= a.right - 1 && b.top < a.bottom, vw: window.innerWidth };
  });
  if (lay.vw >= 900) assert(lay.beside && lay.sphereW > 300, `${tag}: R8c wide screen: the turn slider is beside the sphere (${JSON.stringify(lay)})`);
  else assert(!lay.beside, `${tag}: R8c phone: the turn slider is under the sphere (${JSON.stringify(lay)})`);
  const sphereStyle = await attr(page, '#reciprocal-sphere', 'style');
  assert(!sphereStyle || /^aspect-ratio:[^;]*;?\s*$/.test(sphereStyle), `${tag}: R8c the sphere box has no inline style but the phone aspect-ratio (got "${sphereStyle}")`);

  // R9b: the shell classes do the layout: no inline style in the links or on the route headings
  const inl = await page.evaluate(() => ({ links: document.querySelectorAll('#reciprocal-links [style]').length, heads: document.querySelectorAll('#reciprocal-route-cart > p[style], #reciprocal-route-polar > p[style]').length,
    strong: document.querySelectorAll('#reciprocal-route-cart > p > strong, #reciprocal-route-polar > p > strong').length }));
  assert(inl.links === 0 && inl.heads === 0 && inl.strong === 2, `${tag}: R9b no inline style on the links or route headings (${JSON.stringify(inl)})`);

  // R9: play twice, then reset
  await clickChip(page, 'reciprocal-play');
  assert(await readText(page, '#reciprocal-play') === 'Pause', `${tag}: R9 the play button reads Pause while running`);
  await clickChip(page, 'reciprocal-play');
  await clickChip(page, 'reciprocal-reset');
  await page.waitForTimeout(600);
  readout = await readoutHas(page, '#reciprocal-readout', R1);
  assert(readout === R1, `${tag}: R9 reset restores the default readout (got "${readout}")`);
  await commonChecks(page, ctx, tag);

  // R10: unmount (the other station of this goal)
  await page.evaluate(() => { location.hash = '#powermap'; });
  await page.waitForTimeout(600);
  const gone = await page.evaluate(() => ({
    image: window.__mv.reciprocalImage === undefined,
    stages: window.__mv.reciprocalStages === undefined,
    morph: window.__mv.reciprocalMorph === undefined,
    z: window.__mv.planes.has('reciprocal-zplane'),
    views: window.__mv.views3d ? window.__mv.views3d.size : 0,
  }));
  assert(gone.image && gone.stages && gone.morph && !gone.z && gone.views === 0, `${tag}: R10 unmount removed hooks, plane and 3D view (${JSON.stringify(gone)})`);
  await commonChecks(page, ctx, 'after unmount');
}
