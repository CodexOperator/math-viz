// Interaction script for goal i1-station-staircase-powers (run by tools/smoke.mjs --script).
//   node tools/smoke.mjs --route staircase --script tests/interact/i1-station-staircase-powers.mjs --dark
//   node tools/smoke.mjs --route powers,problem-1-3-2 --script tests/interact/i1-station-staircase-powers.mjs --dark
//   node tools/smoke.mjs --route topic-T2-4 --script tests/interact/i1-station-staircase-powers.mjs --dark
// One dispatcher on ctx.route: `staircase` runs S1 to S11 (acceptance A2 and A3), `powers` and `problem-1-3-2` run P1 to P10 (A4),
// `topic-T2-4` runs T1 to T3. Any other route does nothing. The script provokes no errors, so it exports no expectedErrors.
import { dragHandle, dragHandleAround, clickChip, readText, setSlider, settle, parseCart, handleZ } from './_helpers.mjs';
import { canvasWords, assertWordsClear } from './i1-station-curves-linear.mjs';

const PI = Math.PI;
const parse = (t) => ({
  z: parseCart(/z = ([^;]+);/.exec(t)[1]),
  arg: Number(/Arg z = (-?\d+(?:\.\d+)?)/.exec(t)[1]),
  laps: Number(/laps = (-?\d+)/.exec(t)[1]),
});
const readout = (page) => readText(page, '#staircase-readout');
const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

// The words of a plane: the canvas words (placer, address labels, the arcs' Arg block), pairwise clear of each other, clear of the handle
// words (DOM) and of the given dots. `extra(rec)` can add checks that need the boxes. Returns the canvas words that are station words.
async function wordsOnPlane(page, ctx, planeId, name, { dots = [], ticks = false, extra } = {}) {
  await settle(page, 3);
  const rec = await canvasWords(page, planeId);
  const dom = await page.evaluate((id) => {
    const cr = window.__mv.planes.get(id).canvas.getBoundingClientRect();
    return [...document.querySelectorAll(`.plane-handle[data-plane-id="${id}"] .plane-handle-label`)].map((l) => {
      const b = l.getBoundingClientRect();
      return { text: l.textContent, x0: b.left - cr.left, y0: b.top - cr.top, x1: b.right - cr.left, y1: b.bottom - cr.top };
    });
  }, planeId);
  const mine = assertWordsClear(ctx, name, rec, dots);
  for (const w of mine) for (const d of dom) ctx.assert(!hit({ x0: w.x0 + 1, y0: w.y0 + 1, x1: w.x1 - 1, y1: w.y1 - 1 }, d), `${name}: the word "${w.text}" prints on the handle word "${d.text}"`);
  if (ticks) {                                                       // no word of the station sits on a tick number of the plane
    const nums = rec.words.filter((w) => w.fs === 11 && /^-?\d+(\.\d+)?$/.test(w.text));
    for (const w of mine) for (const t of nums) ctx.assert(!hit({ x0: w.x0 + 1, y0: w.y0 + 1, x1: w.x1 - 1, y1: w.y1 - 1 }, t), `${name}: the word "${w.text}" prints on the tick number ${t.text}`);
  }
  if (extra) extra(rec, mine);
  ctx.log(`${name}: ${mine.length} words, none on another word, a handle word or a dot`);
  return mine;
}
const pixelOf = (page, planeId, z) => page.evaluate(({ id, z }) => window.__mv.planes.get(id).toPixel(z), { id: planeId, z });
const setHandle = (page, planeId, handleId, z) => page.evaluate(({ planeId, handleId, z }) => window.__mv.planes.get(planeId).getHandle(handleId).set(z), { planeId, handleId, z });

// Arrow keys move a focused handle by its step (0.1) at any width: the magnet that pulls a drag to nice points is for the pointer only.
// (On a phone the magnet, 4 px, was 0.11 units: the point snapped straight back and plain arrows did nothing.)
async function arrowsMove(page, ctx, handleId, name) {
  const before = await handleZ(page, handleId);
  await page.focus(`[id="${handleId}"]`);
  for (const [key, dre, dim] of [['ArrowRight', 0.1, 0], ['ArrowUp', 0, 0.1], ['ArrowLeft', -0.1, 0], ['ArrowDown', 0, -0.1]]) {
    const z0 = await handleZ(page, handleId);
    await page.keyboard.press(key);
    await settle(page, 2);
    const z1 = await handleZ(page, handleId);
    ctx.assert(Math.abs(z1.re - z0.re - dre) < 1e-6 && Math.abs(z1.im - z0.im - dim) < 1e-6, `${name}: ${key} moved the point from (${z0.re}, ${z0.im}) to (${z1.re}, ${z1.im}), wanted a step of (${dre}, ${dim})`);
  }
  const after = await handleZ(page, handleId);
  ctx.assert(Math.hypot(after.re - before.re, after.im - before.im) < 1e-6, `${name}: four arrows in a circle must come back`);
  ctx.log(`${name}: the four arrow keys each move the point by 0.1`);
}

// No horizontal scroll of the page at 320 px (the staircase page scrolled by 12 px: the implicit grid track of .stair-col took the
// minimum width of the explainer).
async function narrowFits(page, ctx, name) {
  const start = page.viewportSize();
  try {
    for (const width of [320, 340]) {
      await page.setViewportSize({ width, height: 800 });
      await settle(page, 4);
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth, wide = [];
        for (const e of document.querySelectorAll('#view *')) {
          if (e.closest('.katex') || e instanceof SVGElement) continue;
          const b = e.getBoundingClientRect();
          if (b.right > vw + 1 && b.width > 0) wide.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} right ${Math.round(b.right)}`);
        }
        return { over: document.documentElement.scrollWidth - vw, wide: wide.slice(0, 6) };
      });
      ctx.assert(r.over <= 1, `${name}: the page scrolls sideways by ${r.over}px at ${width} px (wide elements: ${r.wide.join('; ')})`);
    }
  } finally {
    await page.setViewportSize(start);
    await settle(page, 3);
  }
  ctx.log(`${name}: no horizontal scroll at 320 and 340 px`);
}

export default async function (page, ctx) {
  if (ctx.route === 'staircase') return staircase(page, ctx);
  if (ctx.route === 'powers' || ctx.route === 'problem-1-3-2') return powers(page, ctx);
  if (ctx.route === 'topic-T2-4') return topic(page, ctx);
  return undefined;
}

async function staircase(page, ctx) {
  const { assert } = ctx;
  // S1 start
  await page.waitForSelector('#staircase-plane-z');
  await settle(page, 3);
  let t = await readout(page);
  assert(/^z = -1 \+ 1\.732i; Arg z = 2\.094 \(2π\/3\); laps = 0$/.test(t), `S1 readout at start: "${t}"`);
  assert((await readText(page, '#staircase-window')).startsWith('Home window: (-π, π]'), 'S1 window text');
  assert(await page.locator('#staircase-cut-note').isHidden(), 'S1 the cut note is hidden at the principal seam');
  assert((await page.locator('#staircase-topic-note').count()) === 0, 'S1 no topic note on the plain route');
  assert(!(await page.evaluate(() => document.body.innerText)).includes('null'), 'S1 no stray "null" text on the page');
  await ctx.shot('start');

  // S2 one lap (A2): Arg jumps exactly once, the point never jumps, laps goes 0 -> 1
  const rec = [];
  await dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, startAngle: 0, turns: 1, steps: 48 }, async () => rec.push(parse(await readout(page))));
  assert(rec.length === 49, `S2 recorded ${rec.length} readouts, wanted 49`);
  assert(Math.abs(rec[0].arg) < 0.05, `S2 starts near Arg 0 (${rec[0].arg})`);
  assert(Math.max(...rec.map((r) => r.arg)) > 3.0, 'S2 Arg rises past 3.0');
  assert(Math.min(...rec.map((r) => r.arg)) < -3.0, 'S2 Arg drops below -3.0');
  const jumps = [];
  for (let i = 1; i < rec.length; i++) if (Math.abs(rec[i].arg - rec[i - 1].arg) > PI) jumps.push(i);
  assert(jumps.length === 1, `S2 exactly one |delta Arg| > pi, got ${jumps.length} at ${jumps}`);
  const j = jumps[0];
  assert(rec[j - 1].arg > 3.0 && rec[j].arg < -3.0, `S2 the jump goes from ${rec[j - 1]?.arg} to ${rec[j]?.arg}`);
  for (let i = 1; i < rec.length; i++) {
    if (i !== j) assert(Math.abs(rec[i].arg - rec[i - 1].arg) < 0.4, `S2 step ${i} changed Arg by ${rec[i].arg - rec[i - 1].arg}`);
    const dz = Math.hypot(rec[i].z.re - rec[i - 1].z.re, rec[i].z.im - rec[i - 1].z.im);
    assert(dz < 0.3, `S2 the point jumped by ${dz} at step ${i}`);
  }
  assert(rec[j - 1].laps === 0 && rec[j].laps === 1, `S2 laps goes ${rec[j - 1].laps} -> ${rec[j].laps} at the jump`);
  t = await readout(page);
  assert(t.includes('laps = 1'), `S2 laps = 1 after the lap: "${t}"`);
  const widgetJumps = await page.evaluate(() => document.querySelector('#staircase-stairs .staircase-wrap').dataset.jumps);
  assert(widgetJumps === '1', `S2 the list widget counted ${widgetJumps} seam crossings`);
  await ctx.shot('after-lap');

  // S3 walk (A2): laps goes to 2, the button says Walk one lap again
  await clickChip(page, 'staircase-walk');
  await page.waitForFunction(() => /laps = 2/.test(document.getElementById('staircase-readout').textContent), null, { timeout: 12000 });
  // laps ticks over when the walk crosses the seam, half way round: wait for the lap itself to finish
  await page.waitForFunction(() => document.getElementById('staircase-walk').textContent === 'Walk one lap', null, { timeout: 12000 });
  await settle(page);
  assert((await readText(page, '#staircase-walk')) === 'Walk one lap', `S3 the button reads "${await readText(page, '#staircase-walk')}" after the walk`);
  assert((await readText(page, '#staircase-walk-status')).includes('One lap done'), 'S3 walk status');

  // S4 reduced-motion stepper
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clickChip(page, 'staircase-walk');
  assert((await readText(page, '#staircase-walk')) === 'Step 30° counterclockwise', `S4 the button reads "${await readText(page, '#staircase-walk')}"`);
  assert((await readText(page, '#staircase-walk-status')) === 'Step 1 of 12.', `S4 status "${await readText(page, '#staircase-walk-status')}"`);
  for (let i = 0; i < 11; i++) await clickChip(page, 'staircase-walk');
  t = await readout(page);
  assert(t.includes('laps = 3'), `S4 laps = 3 after twelve steps: "${t}"`);
  assert((await readText(page, '#staircase-walk-status')).includes('One lap done'), 'S4 status after 12 steps');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // S5 the seam moves the jump (A2)
  await setSlider(page, 'staircase-seam', 0);
  assert((await readText(page, '#staircase-window')).includes('(0, 2π]'), `S5 window "${await readText(page, '#staircase-window')}"`);
  assert(await page.locator('#staircase-cut-note').isVisible(), 'S5 the cut note shows');
  assert((await readText(page, '#staircase-seam-output')) === '0°, the positive real axis', `S5 seam output "${await readText(page, '#staircase-seam-output')}"`);
  const rec2 = [];
  await dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, startAngle: -0.5, turns: 1 / (2 * PI), steps: 48 }, async () => rec2.push(parse(await readout(page))));
  const big = [];
  for (let i = 1; i < rec2.length; i++) if (Math.abs(rec2[i].arg - rec2[i - 1].arg) > 5) big.push(i);
  assert(big.length === 1, `S5 exactly one |delta| > 5 with the seam at 0, got ${big.length} (${rec2.map((r) => r.arg)})`);
  assert(rec2[big[0] - 1].arg > 5.5 && rec2[big[0]].arg < 1, `S5 the jump goes from ${rec2[big[0] - 1].arg} to ${rec2[big[0]].arg}`);
  await ctx.shot('seam-0');

  // S6 the list (A3)
  await setSlider(page, 'staircase-seam', -PI);
  assert((await readText(page, '#staircase-window')).startsWith('Home window: (-π, π]'), 'S6 window is back to (-π, π]');
  await dragHandle(page, 'staircase-plane-z', { re: -1, im: 1.7320508 });
  await settle(page, 3);
  const list = await page.evaluate(() => ({
    n: document.querySelectorAll('#staircase-stairs li').length,
    home: [...document.querySelectorAll('#staircase-stairs li.is-home')].map((e) => e.textContent),
    k1: document.querySelector('#staircase-stairs li[data-k="1"]').textContent,
    km1: document.querySelector('#staircase-stairs li[data-k="-1"]').textContent,
    arg: document.getElementById('staircase-stairs-arg').textContent,
  }));
  assert(list.n === 7, `S6 the list has ${list.n} rows`);
  assert(list.home.length === 1 && list.home[0].includes('2π/3') && list.home[0].includes('Arg'), `S6 home row: ${JSON.stringify(list.home)}`);
  assert(list.k1.includes('8π/3'), `S6 row k = 1: "${list.k1}"`);
  assert(list.km1.includes('-4π/3'), `S6 row k = -1: "${list.km1}"`);
  assert(/Arg z = 2\.094/.test(list.arg), `S6 list Arg line: "${list.arg}"`);
  assert(/Arg z = 2\.094 \(2π\/3\)/.test(await readout(page)), 'S6 readout shows 2.094 (2π/3)');

  // S7 the sum (A3)
  await dragHandle(page, 'staircase-sumplane-z1', { re: 1, im: 1 });
  await dragHandle(page, 'staircase-sumplane-z1', { re: -1, im: 1 });
  await dragHandle(page, 'staircase-sumplane-z2', { re: -1, im: 1 });
  await settle(page, 3);
  t = await readText(page, '#staircase-sum-readout');
  assert(t === 'Arg z₁ + Arg z₂ = 4.712 (3π/2); Arg(z₁z₂) = -1.571 (-π/2); differ by 1·2π', `S7 sum readout: "${t}"`);
  assert((await page.getAttribute('#staircase-sum-ex-same', 'data-agree')) === 'true', 'S7 the product row agrees');
  const picked = await readText(page, '#staircase-s12 li.is-picked');
  assert(picked.includes('3π/2'), `S7 the outlined row of the third list: "${picked}"`);
  await ctx.shot('sum');

  // S8 pick a step
  await page.locator('#staircase-stairs li[data-k="1"] button').click();
  await settle(page, 2);
  assert(await page.evaluate(() => document.querySelector('#staircase-stairs li[data-k="1"]').classList.contains('is-picked')), 'S8 row k = 1 is picked');
  await page.evaluate(() => window.__mv.staircase.state());
  await page.waitForFunction(() => /k = 1/.test(document.getElementById('staircase-ex-name-polar').dataset.tex), null, { timeout: 3000 });
  assert((await page.getAttribute('#staircase-ex-same', 'data-agree')) === 'true', 'S8 the picked name lands on the same point');
  await page.locator('#staircase-stairs li[data-k="1"] button').click();
  await settle(page, 2);
  assert(!(await page.evaluate(() => document.querySelector('#staircase-stairs li[data-k="1"]').classList.contains('is-picked'))), 'S8 clicking again clears the pick');

  // S9 the helix
  const helix = await page.evaluate(() => {
    const v = window.__mv.views3d && window.__mv.views3d.get('staircase-helix');
    if (!v) return null;
    const g = v.scene.getObjectByName('arg-helix');
    return { unavailable: !!v.unavailable, beads: g ? g.userData.beads.length : -1, canvas: !!document.querySelector('#staircase-helix canvas') };
  });
  assert(helix, 'S9 the helix view is registered in window.__mv.views3d');
  if (helix.unavailable) assert(await page.locator('#staircase-helix-fallback').isVisible(), 'S9 the fallback shows without WebGL');
  else assert(helix.canvas, 'S9 the helix has a canvas');
  assert(helix.beads === 5, `S9 the helix has ${helix.beads} beads`);
  if (!helix.unavailable) {
    // how big the beads are on the screen: tightFrame frames the ball round the helix (4.24) instead of the box (5.20), and a phone gets a
    // taller canvas, so the five beads span about 150 px of a 322 px wide view (they spanned 110) and the home bead is 15 px across (it was 8)
    const m = await page.evaluate(() => {
      const v = window.__mv.views3d.get('staircase-helix');
      v.renderNow();
      const g = v.scene.getObjectByName('arg-helix'), cw = v.canvas.clientWidth, ch = v.canvas.clientHeight, tmp = v.camera.position.clone();
      const ys = g.userData.beads.map((b) => { b.getWorldPosition(tmp); return (1 - tmp.clone().project(v.camera).y) / 2 * ch; });
      const b = g.userData.beads[2]; b.getWorldPosition(tmp);
      const edge = tmp.clone(); edge.x += b.geometry.parameters.radius * b.scale.x;                   // the home bead is drawn 1.7 times (1.5 more on a phone) its radius
      return { cw, ch, spanY: Math.max(...ys) - Math.min(...ys), beadR: Math.abs(edge.project(v.camera).x - tmp.clone().project(v.camera).x) / 2 * cw, frame: g.userData.frameRadius };
    });
    assert(Math.abs(m.frame - Math.hypot(3, 3)) < 1e-9, `S9 the helix is built with tightFrame: frameRadius ${m.frame}`);
    ctx.log(`S9 helix: canvas ${m.cw} x ${m.ch}, the beads span ${m.spanY.toFixed(0)} px, the home bead is ${(2 * m.beadR).toFixed(1)} px across`);
    if (m.cw < 400) assert(m.spanY >= 140 && 2 * m.beadR >= 13, `S9 on a phone the helix is too small: the beads span ${m.spanY.toFixed(0)} px and the home bead is ${(2 * m.beadR).toFixed(1)} px across`);
    else assert(m.spanY >= 250, `S9 the helix spans ${m.spanY.toFixed(0)} px`);
  }

  // S10 z = 0
  await page.evaluate(() => window.__mv.planes.get('staircase-plane').getHandle('z').set({ re: 0, im: 0 }));
  await settle(page, 3);
  t = await readout(page);
  assert(/^z = 0; Arg z = undefined; laps = \d+$/.test(t), `S10 readout at 0: "${t}"`);
  assert((await readText(page, '#staircase-stairs-arg')).includes('undefined'), 'S10 the list says undefined');
  await clickChip(page, 'staircase-walk');
  assert((await readText(page, '#staircase-walk-status')) === 'Move z away from 0 first, then walk.', `S10 walk status "${await readText(page, '#staircase-walk-status')}"`);

  // S11 start over
  await clickChip(page, 'staircase-reset');
  t = await readout(page);
  assert(/laps = 0$/.test(t) && t.startsWith('z = -1 + 1.732i'), `S11 readout after Start over: "${t}"`);
  assert((await readText(page, '#staircase-seam-output')) === '180°, the negative real axis', 'S11 the seam is back');

  // S12 the words of the main plane: none on another word, the handle word, the dot or a tick number, in the states that used to collide
  const dotOf = async (z) => ({ ...(await pixelOf(page, 'staircase-plane', z)), r: 9 });
  await wordsOnPlane(page, ctx, 'staircase-plane', 'S12 default', { dots: [await dotOf({ re: -1, im: Math.sqrt(3) })], ticks: true });
  await clickChip(page, 'staircase-preset-neg');
  await wordsOnPlane(page, ctx, 'staircase-plane', 'S12 z = -2 on the seam', { dots: [await dotOf({ re: -2, im: 0 })], ticks: true });
  await clickChip(page, 'staircase-preset-1i');
  await wordsOnPlane(page, ctx, 'staircase-plane', 'S12 z = 1 + i', { dots: [await dotOf({ re: 1, im: 1 })], ticks: true });
  await setSlider(page, 'staircase-seam', 3 * PI / 4);
  await wordsOnPlane(page, ctx, 'staircase-plane', 'S12 seam at 135 degrees', { dots: [await dotOf({ re: 1, im: 1 })], ticks: true });
  await setSlider(page, 'staircase-seam', -PI);
  await setHandle(page, 'staircase-plane', 'z', { re: 0, im: 0 });             // z = 0: 'z = 0 has no angle' beside the handle word 'z', not under it
  await wordsOnPlane(page, ctx, 'staircase-plane', 'S12 z = 0', {
    extra: (rec, mine) => ctx.assert(mine.some((w) => w.text === 'z = 0 has no angle'), 'S12 the z = 0 sentence is drawn'),
  });
  await ctx.shot('z-zero');
  await clickChip(page, 'staircase-reset');
  // the product off the plane: its sentence is not struck through by the real axis
  await setHandle(page, 'staircase-sumplane', 'z1', { re: -2.5, im: 2 });
  await setHandle(page, 'staircase-sumplane', 'z2', { re: 2.4, im: 2.4 });
  const sumO = await pixelOf(page, 'staircase-sumplane', { re: 0, im: 0 });
  await wordsOnPlane(page, ctx, 'staircase-sumplane', 'S12 the product off the plane', {
    extra: (rec, mine) => {
      const off = mine.find((w) => w.text.startsWith('z₁z₂ is off the plane'));
      ctx.assert(off, 'S12 the off-plane sentence is drawn');
      ctx.assert(!(off.y0 < sumO.y && sumO.y < off.y1), `S12 the off-plane sentence is struck through by the real axis (box ${off.y0.toFixed(0)} to ${off.y1.toFixed(0)}, axis at ${sumO.y.toFixed(0)})`);
    },
  });
  await ctx.shot('sum-off-plane');
  await setHandle(page, 'staircase-sumplane', 'z1', { re: -1, im: 1 });
  await setHandle(page, 'staircase-sumplane', 'z2', { re: 0, im: 1.5 });

  // S13 the arrow keys move the point by 0.1 on every width (they did nothing on a phone: the magnet was larger than the step)
  await clickChip(page, 'staircase-preset-131');
  await arrowsMove(page, ctx, 'staircase-plane-z', 'S13 main plane');
  await arrowsMove(page, ctx, 'staircase-sumplane-z1', 'S13 sum plane');

  // S14 a preset while the Walk runs stops the walk: the dot used to jump for a frame, then the walk went on round its old circle, and
  // the lap count came out as two for one lap
  await clickChip(page, 'staircase-reset');
  await clickChip(page, 'staircase-walk');
  await page.waitForTimeout(800);
  assert((await page.evaluate(() => window.__mv.staircase.state().walking)) === true, 'S14 the walk is running');
  await clickChip(page, 'staircase-preset-neg');
  assert((await page.evaluate(() => window.__mv.staircase.state().walking)) === false, 'S14 a preset must stop the walk');
  assert((await readText(page, '#staircase-walk')) === 'Walk one lap', 'S14 the Walk button is back to "Walk one lap"');
  const stopped = await readout(page);
  assert(stopped.startsWith('z = -2; Arg z = 3.142 (π); laps ='), `S14 the preset is where the dot is: "${stopped}"`);
  await page.waitForTimeout(4300);
  assert((await readout(page)) === stopped, `S14 the readout moved after the preset: "${stopped}" -> "${await readout(page)}"`);
  await clickChip(page, 'staircase-preset-131');
  await clickChip(page, 'staircase-reset');

  // S15 no horizontal scroll at 320 and 340 px
  await narrowFits(page, ctx, 'S15 staircase');
  await ctx.shot('end');
  ctx.log('A2 ok');
  ctx.log('A3 ok');
}

async function powers(page, ctx) {
  const { assert } = ctx;
  const readoutP = () => readText(page, '#powers-readout');
  // P1 default (A4)
  await page.waitForSelector('#powers-plane-z');
  await settle(page, 3);
  let t = await readoutP();
  for (const want of ['512 - 886.81', '|z|ⁿ = 1024', 'nθ = 5.236', 'home step = -1.047']) assert(t.includes(want), `P1 readout lacks "${want}": "${t}"`);
  assert((await readText(page, '#powers-ex-same')).startsWith('same point: agree'), `P1 same-point row: "${await readText(page, '#powers-ex-same')}"`);
  const have = await page.evaluate(() => [...window.__mv.planes.keys()]);
  assert(have.includes('powers-plane') && have.includes('powers-spiral'), `P1 both planes registered (${have})`);
  assert(!(await page.evaluate(() => document.body.innerText)).includes('null'), 'P1 no stray "null" text on the page');
  await ctx.shot('start');

  // P2 the report chips (A4)
  await clickChip(page, 'powers-report-home');
  t = await readText(page, '#powers-angle');
  assert(t.includes('-π/3') && t.includes('1 full turn removed'), `P2 home chip text: "${t}"`);
  assert((await page.getAttribute('#powers-report-home', 'aria-pressed')) === 'true', 'P2 the home chip is pressed');
  await clickChip(page, 'powers-report-cart');
  t = await readText(page, '#powers-angle');
  assert(t.includes('(512, -886.81)'), `P2 point chip text: "${t}"`);
  await clickChip(page, 'powers-report-ntheta');
  assert((await readText(page, '#powers-angle')).includes('5π/3'), 'P2 nθ chip text');

  // P3 n = 2
  await setSlider(page, 'powers-n', 2);
  assert((await readoutP()).includes('2 + 3.464i'), `P3 readout at n = 2: "${await readoutP()}"`);
  assert((await readText(page, '#powers-wrapnote')).includes('nothing to wrap'), 'P3 wrap note at n = 2');
  assert((await readText(page, '#powers-n-output')) === 'n = 2', 'P3 n output');

  // P4 the Cartesian chain
  await setSlider(page, 'powers-n', 10);
  await clickChip(page, 'powers-cartesian-toggle');
  assert(await page.locator('#powers-cartesian').isVisible(), 'P4 the chain panel opens');
  const lines = await page.evaluate(() => [...document.querySelectorAll('#powers-cartesian li')].map((e) => e.textContent));
  assert(lines.length === 9, `P4 the chain has ${lines.length} lines`);
  assert(lines[0] === 'z² = (1.732 + i)(1.732 + i) = 2 + 3.464i', `P4 first line "${lines[0]}"`);
  assert(lines[8].endsWith('= 512 - 886.81i'), `P4 last line "${lines[8]}"`);
  assert((await page.getAttribute('#powers-cartesian-toggle', 'aria-expanded')) === 'true', 'P4 aria-expanded');
  assert((await readText(page, '#powers-cartesian-toggle')) === 'Hide the Cartesian working', 'P4 toggle text');
  await ctx.shot('chain');
  await clickChip(page, 'powers-cartesian-toggle');
  assert(await page.locator('#powers-cartesian').isHidden(), 'P4 the chain panel closes');

  // P5 on the seam
  await setSlider(page, 'powers-n', 6);
  t = await readoutP();
  assert(t.includes('zⁿ = -64') && t.includes('home step = 3.142 (π)') && !t.includes('-3.142'), `P5 readout at n = 6: "${t}"`);
  await setSlider(page, 'powers-n', 10);

  // P6 drag
  await dragHandle(page, 'powers-plane-z', { re: 1, im: 1 });
  await settle(page, 3);
  t = await readoutP();
  assert(t === 'zⁿ = 32i; |z|ⁿ = 32; nθ = 7.854 (5π/2); home step = 1.571 (π/2)', `P6 readout after the drag: "${t}"`);
  assert((await page.getAttribute('#powers-ex-same', 'data-agree')) === 'true', 'P6 the same-point row agrees');

  // P7 presets
  await clickChip(page, 'powers-preset-1-3-2');
  t = await readoutP();
  assert(t === 'zⁿ = 512 - 886.81i; |z|ⁿ = 1024; nθ = 5.236 (5π/3); home step = -1.047 (-π/3)', `P7 preset 1.3.2: "${t}"`);
  assert((await readText(page, '#powers-n-output')) === 'n = 10', 'P7 n back to 10');
  await clickChip(page, 'powers-preset-1i');
  t = await readoutP();
  assert(t === 'zⁿ = 16; |z|ⁿ = 16; nθ = 6.283 (2π); home step = 0', `P7 preset 1 + i: "${t}"`);
  await clickChip(page, 'powers-preset-i');
  assert((await readoutP()).startsWith('zⁿ = 1;'), `P7 preset i: "${await readoutP()}"`);
  await clickChip(page, 'powers-preset-1-3-2');

  // P8 stairs
  const st = await page.evaluate(() => ({
    home: document.querySelector('#powers-stairs li.is-home').textContent,
    picked: document.querySelector('#powers-stairs li.is-picked').textContent,
    n: document.querySelectorAll('#powers-stairs li').length,
  }));
  assert(st.home.includes('Arg(zⁿ)') && st.home.includes('-π/3'), `P8 home row "${st.home}"`);
  assert(st.picked.includes('5π/3'), `P8 outlined row "${st.picked}"`);
  assert(st.n === 5, `P8 ${st.n} rows`);

  // P9 z = 0
  await page.evaluate(() => window.__mv.planes.get('powers-plane').getHandle('z').set({ re: 0, im: 0 }));
  await settle(page, 3);
  assert((await readoutP()) === 'zⁿ = 0; |z|ⁿ = 0; nθ = undefined; home step = undefined', `P9 readout at 0: "${await readoutP()}"`);
  assert((await readText(page, '#powers-spiral-desc')) === 'z is 0, so every power is 0.', 'P9 spiral description at 0');
  await clickChip(page, 'powers-preset-1-3-2');

  // P10 the words, in the states that used to collide
  const PW = '#powers-plane';
  const dotsOf = async () => {
    const R = await page.evaluate(() => window.__mv.powers.ruler());
    const out = [];
    for (const d of R.dots) out.push({ ...(await pixelOf(page, 'powers-spiral', d.p)), r: 5 });
    return out;
  };
  const ring1 = async () => {                                         // the label of ring 1 is |z|, the true distance of dot 1
    const z = await page.evaluate(() => window.__mv.powers.state().z);
    const r = Math.hypot(z.re, z.im);
    return Number(r.toFixed(3)).toString();
  };
  const spiral = async (name, z, n, { flat = false } = {}) => {
    await setHandle(page, 'powers-plane', 'z', z);
    await setSlider(page, 'powers-n', n);
    await wordsOnPlane(page, ctx, 'powers-spiral', name, {
      dots: await dotsOf(),
      extra: async (rec, mine) => {
        ctx.assert(rec.words.filter((w) => w.fs === 11).length === 0, `${name}: the ruler plane must show no tick numbers (it has no linear scale)`);
        // and no tick marks either: the plane's own axes put a 8 px mark every 0.25 units on both axes, a linear scale this plane does not have
        const marks = await page.evaluate(() => {
          const pl = window.__mv.planes.get('powers-spiral'), g = pl.canvas.getContext('2d'), O = pl.toPixel({ re: 0, im: 0 }), step = pl.getSize().w / 8;
          const px = (x, y) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data).join(',');
          const out = [];
          for (const k of [1, 2, 3]) for (const sgn of [1, -1]) {
            const x = O.x + sgn * k * step;                              // where a tick would stand on the real axis; four px above the axis
            out.push({ tick: px(x, O.y - 3), between: px(x + step / 2, O.y - 3) });
          }
          return out;
        });
        for (const m of marks) ctx.assert(m.tick === m.between, `${name}: a tick mark stands on the ruler plane's real axis (${m.tick} against ${m.between})`);
        if (flat) ctx.assert(mine.some((w) => w.text === '|z| = 1'), `${name}: the flat ruler is labelled |z| = 1`);
        else ctx.assert(mine.some((w) => w.text === ring1v), `${name}: ring 1 must be labelled with |z| = ${ring1v}`);
      },
    });
  };
  let ring1v = '';
  const states = [
    ['P10 default z = sqrt3 + i, n = 10', { re: Math.sqrt(3), im: 1 }, 10, {}],
    ['P10 flat ruler, |z| = 1, n = 9', { re: 0.6, im: 0.8 }, 9, { flat: true }],
    ['P10 |z| < 1, n = 12', { re: 0.5, im: 0.2 }, 12, {}],
    ['P10 |z| < 1 on the real axis, n = 12', { re: 0.5, im: 0 }, 12, {}],
    ['P10 large z, n = 12', { re: 3.1, im: 2.2 }, 12, {}],
    ['P10 n = 1', { re: 1.5, im: -1 }, 1, {}],
    ['P10 n = 2', { re: -1.2, im: 0.4 }, 2, {}],
  ];
  for (const [name, z, n, o] of states) {
    ring1v = n >= 1 && !o.flat ? Number(Math.hypot(z.re, z.im).toFixed(3)).toString() : '';
    await spiral(name, z, n, o);
  }
  await ctx.shot('spiral-edge');
  // the left plane: no word on a tick number, the handle word or a dot; the r label keeps off the dashed unit circle
  const leftDots = async () => {
    const st = await page.evaluate(() => window.__mv.powers.state());
    const out = [{ ...(await pixelOf(page, 'powers-plane', st.z)), r: 9 }];
    const pw = await page.evaluate(() => window.__mv.powers.state().model);
    for (let k = 2; k <= st.n; k++) {
      const zk = pw.defined ? { re: Math.pow(Math.hypot(st.z.re, st.z.im), k) * Math.cos(k * Math.atan2(st.z.im, st.z.re)), im: Math.pow(Math.hypot(st.z.re, st.z.im), k) * Math.sin(k * Math.atan2(st.z.im, st.z.re)) } : null;
      if (zk && Math.abs(zk.re) <= 4.2 && Math.abs(zk.im) <= 4.2) out.push({ ...(await pixelOf(page, 'powers-plane', zk)), r: 5 });
    }
    return out;
  };
  for (const [name, z, n] of [['P10 left plane, default', { re: Math.sqrt(3), im: 1 }, 10], ['P10 left plane, z = 1 + i', { re: 1, im: 1 }, 8], ['P10 left plane, z = -1.5', { re: -1.5, im: 0 }, 2]]) {
    await setHandle(page, 'powers-plane', 'z', z);
    await setSlider(page, 'powers-n', n);
    const O = await pixelOf(page, 'powers-plane', { re: 0, im: 0 }), one = await pixelOf(page, 'powers-plane', { re: 1, im: 0 });
    await wordsOnPlane(page, ctx, 'powers-plane', name, {
      dots: await leftDots(), ticks: true,
      extra: (rec, mine) => {
        const rho = one.x - O.x, rw = mine.find((w) => w.text.startsWith('r = '));
        if (!rw) return;
        for (let k = 0; k < 360; k += 2) {                              // the r label is not struck by the dashed unit circle
          const x = O.x + rho * Math.cos(k * PI / 180), y = O.y - rho * Math.sin(k * PI / 180);
          assert(!(x > rw.x0 + 1 && x < rw.x1 - 1 && y > rw.y0 + 1 && y < rw.y1 - 1), `${name}: the dashed unit circle runs through "${rw.text}" at (${x.toFixed(0)}, ${y.toFixed(0)})`);
        }
      },
    });
  }
  await setHandle(page, 'powers-plane', 'z', { re: 0, im: 0 });
  await wordsOnPlane(page, ctx, 'powers-plane', 'P10 left plane, z = 0', { extra: (rec, mine) => assert(mine.some((w) => w.text === 'z = 0 has no angle'), 'P10 the z = 0 sentence is drawn') });
  await clickChip(page, 'powers-preset-1-3-2');

  // P11 the same number to the same digits in the readout and in the explainer: 0.5^12 = 2.44140625e-4
  await setHandle(page, 'powers-plane', 'z', { re: 0.5, im: 0 });
  await setSlider(page, 'powers-n', 12);
  await page.waitForTimeout(350);
  t = await readoutP();
  assert(t === 'zⁿ = 0; |z|ⁿ = 2.441×10⁻⁴; nθ = 0; home step = 0', `P11 readout for 0.5^12: "${t}"`);
  const rnTex = await page.evaluate(() => document.getElementById('powers-ex-rn-polar').dataset.tex);
  assert(rnTex.includes('2.441\\times 10^{-4}'), `P11 the explainer shows the same digits: ${rnTex}`);
  await clickChip(page, 'powers-preset-1-3-2');

  // P12 arrow keys move the point by 0.1 on every width
  await arrowsMove(page, ctx, 'powers-plane-z', 'P12 powers plane');

  // P13 no horizontal scroll at 320 and 340 px
  await narrowFits(page, ctx, 'P13 powers');

  // P14 no caret or brace in a link, no brace in a chip title (the superscript itself is checked on the linear page, whose neighbour is z^n)
  const nav = await page.evaluate(() => [...document.querySelectorAll('#powers-links a')].map((a) => ({ text: a.textContent, sup: !!a.querySelector('sup.prose-sup') })));
  assert(nav.length >= 4 && nav.every((a) => !a.text.includes('^') && !/[{}]/.test(a.text)), `P14 a link shows a literal caret or brace: ${JSON.stringify(nav)}`);
  const chips = await page.evaluate(() => [...document.querySelectorAll('.problem-chip')].map((a) => a.title));
  assert(chips.length >= 1 && chips.every((t) => !/[{}]/.test(t)), `P14 a problem chip title has literal braces: ${JSON.stringify(chips)}`);

  // P15 shots and log
  await ctx.shot('end');
  ctx.log('A4 ok');
}

async function topic(page, ctx) {
  const { assert } = ctx;
  await page.waitForSelector('#staircase-plane-z');
  await settle(page, 3);
  // T1 the topic note and the start point on the seam
  assert(await page.locator('#staircase-topic-note').isVisible(), 'T1 the topic note shows');
  assert((await readText(page, '#staircase-topic-note')).includes('Topic T2.4'), 'T1 the note names the topic');
  let t = await readout(page);
  assert(t === 'z = -2; Arg z = 3.142 (π); laps = 0', `T1 readout: "${t}"`);
  // the Arg block "Arg z = π / also 3π / also -π" of this default state sat on the tick number 1
  await wordsOnPlane(page, ctx, 'staircase-plane', 'T1 z = -2 on the seam', { dots: [{ ...(await pixelOf(page, 'staircase-plane', { re: -2, im: 0 })), r: 9 }], ticks: true });
  await ctx.shot('start');
  // T2 the jump on the negative real axis with the usual seam
  await dragHandle(page, 'staircase-plane-z', { re: -2, im: 0.5 });
  const a = parse(await readout(page)).arg;
  await dragHandle(page, 'staircase-plane-z', { re: -2, im: -0.5 });
  const b = parse(await readout(page)).arg;
  assert(Math.abs(a - 2.897) < 0.002 && Math.abs(b + 2.897) < 0.002, `T2 Arg above and below the axis: ${a}, ${b}`);
  assert(Math.abs(a - b) > 5, `T2 the jump is ${a - b}`);
  // T3 the cut moved: continuous across the negative real axis
  await setSlider(page, 'staircase-seam', 0);
  await dragHandle(page, 'staircase-plane-z', { re: -2, im: 0.5 });
  const c = parse(await readout(page)).arg;
  await dragHandle(page, 'staircase-plane-z', { re: -2, im: -0.5 });
  const d = parse(await readout(page)).arg;
  assert(Math.abs(c - 2.897) < 0.002 && Math.abs(d - 3.387) < 0.002, `T3 Arg with the seam at 0: ${c}, ${d}`);
  assert(Math.abs(d - c - 0.49) < 0.005, `T3 no jump: the change is ${d - c}`);
  await ctx.shot('end');
  ctx.log('T2.4 ok');
}
