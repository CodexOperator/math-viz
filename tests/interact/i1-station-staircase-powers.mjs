// Interaction script for goal i1-station-staircase-powers (run by tools/smoke.mjs --script).
//   node tools/smoke.mjs --route staircase --script tests/interact/i1-station-staircase-powers.mjs --dark
//   node tools/smoke.mjs --route powers,problem-1-3-2 --script tests/interact/i1-station-staircase-powers.mjs --dark
//   node tools/smoke.mjs --route topic-T2-4 --script tests/interact/i1-station-staircase-powers.mjs --dark
// One dispatcher on ctx.route: `staircase` runs S1 to S11 (acceptance A2 and A3), `powers` and `problem-1-3-2` run P1 to P10 (A4),
// `topic-T2-4` runs T1 to T3. Any other route does nothing. The script provokes no errors, so it exports no expectedErrors.
import { dragHandle, dragHandleAround, clickChip, readText, setSlider, settle, parseCart } from './_helpers.mjs';

const PI = Math.PI;
const parse = (t) => ({
  z: parseCart(/z = ([^;]+);/.exec(t)[1]),
  arg: Number(/Arg z = (-?\d+(?:\.\d+)?)/.exec(t)[1]),
  laps: Number(/laps = (-?\d+)/.exec(t)[1]),
});
const readout = (page) => readText(page, '#staircase-readout');

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
  assert(t === 'Arg z1 + Arg z2 = 4.712 (3π/2); Arg(z1 z2) = -1.571 (-π/2); differ by 1·2π', `S7 sum readout: "${t}"`);
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
  for (const want of ['512 - 886.81', '|z|^n = 1024', 'n*theta = 5.236', 'home step = -1.047']) assert(t.includes(want), `P1 readout lacks "${want}": "${t}"`);
  assert((await readText(page, '#powers-ex-same')).startsWith('same point: agree'), `P1 same-point row: "${await readText(page, '#powers-ex-same')}"`);
  const have = await page.evaluate(() => [...window.__mv.planes.keys()]);
  assert(have.includes('powers-plane') && have.includes('powers-spiral'), `P1 both planes registered (${have})`);
  assert(!(await page.evaluate(() => document.body.innerText)).includes('null'), 'P1 no stray "null" text on the page');
  await ctx.shot('start');

  // P2 the report chips (A4)
  await clickChip(page, 'powers-report-home');
  t = await readText(page, '#powers-angle');
  assert(t.includes('-pi/3') && t.includes('1 full turn removed'), `P2 home chip text: "${t}"`);
  assert((await page.getAttribute('#powers-report-home', 'aria-pressed')) === 'true', 'P2 the home chip is pressed');
  await clickChip(page, 'powers-report-cart');
  t = await readText(page, '#powers-angle');
  assert(t.includes('(512, -886.81)'), `P2 point chip text: "${t}"`);
  await clickChip(page, 'powers-report-ntheta');
  assert((await readText(page, '#powers-angle')).includes('5pi/3'), 'P2 n*theta chip text');

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
  assert(lines[0] === 'z^2 = (1.732 + i)(1.732 + i) = 2 + 3.464i', `P4 first line "${lines[0]}"`);
  assert(lines[8].endsWith('= 512 - 886.81i'), `P4 last line "${lines[8]}"`);
  assert((await page.getAttribute('#powers-cartesian-toggle', 'aria-expanded')) === 'true', 'P4 aria-expanded');
  assert((await readText(page, '#powers-cartesian-toggle')) === 'Hide the Cartesian working', 'P4 toggle text');
  await ctx.shot('chain');
  await clickChip(page, 'powers-cartesian-toggle');
  assert(await page.locator('#powers-cartesian').isHidden(), 'P4 the chain panel closes');

  // P5 on the seam
  await setSlider(page, 'powers-n', 6);
  t = await readoutP();
  assert(t.includes('z^n = -64') && t.includes('home step = 3.142 (π)') && !t.includes('-3.142'), `P5 readout at n = 6: "${t}"`);
  await setSlider(page, 'powers-n', 10);

  // P6 drag
  await dragHandle(page, 'powers-plane-z', { re: 1, im: 1 });
  await settle(page, 3);
  t = await readoutP();
  assert(t === 'z^n = 32i; |z|^n = 32; n*theta = 7.854 (5π/2); home step = 1.571 (π/2)', `P6 readout after the drag: "${t}"`);
  assert((await page.getAttribute('#powers-ex-same', 'data-agree')) === 'true', 'P6 the same-point row agrees');

  // P7 presets
  await clickChip(page, 'powers-preset-1-3-2');
  t = await readoutP();
  assert(t === 'z^n = 512 - 886.81i; |z|^n = 1024; n*theta = 5.236 (5π/3); home step = -1.047 (-π/3)', `P7 preset 1.3.2: "${t}"`);
  assert((await readText(page, '#powers-n-output')) === 'n = 10', 'P7 n back to 10');
  await clickChip(page, 'powers-preset-1i');
  t = await readoutP();
  assert(t === 'z^n = 16; |z|^n = 16; n*theta = 6.283 (2π); home step = 0', `P7 preset 1 + i: "${t}"`);
  await clickChip(page, 'powers-preset-i');
  assert((await readoutP()).startsWith('z^n = 1;'), `P7 preset i: "${await readoutP()}"`);
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
  assert((await readoutP()) === 'z^n = 0; |z|^n = 0; n*theta = undefined; home step = undefined', `P9 readout at 0: "${await readoutP()}"`);
  assert((await readText(page, '#powers-spiral-desc')) === 'z is 0, so every power is 0.', 'P9 spiral description at 0');
  await clickChip(page, 'powers-preset-1-3-2');

  // P10 shots and log
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
