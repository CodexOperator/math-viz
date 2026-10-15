// Interaction script for the stations `roots` and `principal-root` (goal i1-station-roots-principal).
// Run as:  node tools/smoke.mjs --route <route> --script tests/interact/i1-station-roots-principal.mjs
// with <route> one of problem-1-4-1, problem-1-4-2, problem-1-4-3, problem-2-2-2, roots, principal-root.
// It covers acceptance A2 (exact roots, primitive badges), A3 (the quadratic panel), A5 (the principal root and the seam jump)
// and the default states: keyboard selection, drag with snap, the n slider, the zero case, a bad typed number, reduced motion.

import { readText, setSlider, clickChip, settle, dragHandle, dragHandleAround, handleZ, parseCart } from './_helpers.mjs';

const items = (page) => page.$$eval('#roots-list > li', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
const reduced = (page) => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
const primitives = (li) => li.filter((t) => t.includes('primitive')).length;
const dataTex = (page, id) => page.$eval('#' + id, (e) => e.dataset.tex || '');
const planeSel = (id) => `.plane[data-plane-id="${id}"]`;
const half = (page, id) => page.$eval(planeSel(id), (e) => Number(e.dataset.unitsAcross) / 2);          // the half-width the plane shows now
// The student zooms in twice and pans left, with the keyboard (the root planes have no zoom buttons).
async function zoomAndPan(page, id) {
  await page.focus(planeSel(id));
  await page.keyboard.press('+'); await page.keyboard.press('+'); await page.keyboard.press('ArrowLeft');
  await settle(page);
}
// Top of an element in document coordinates (stable while the page scrolls).
const pageTop = (page, sel) => page.$eval(sel, (e) => e.getBoundingClientRect().top + window.scrollY);

// What a plane draws in one frame: every fillText of its canvas with the box it covers (css px of the canvas), so a script can check that a word
// the station placed is not on top of something. The plane is asked to draw once with fillText wrapped, then the wrapper is removed.
async function drawnTexts(page, planeId) {
  return page.evaluate(async (id) => {
    const plane = window.__mv.planes.get(id), ctx = plane.canvas.getContext('2d'), log = [], orig = ctx.fillText;
    ctx.fillText = function (text, x, y, ...rest) {
      const w = this.measureText(text).width, fs = parseFloat(this.font) || 13, a = this.textAlign;
      const x0 = a === 'right' || a === 'end' ? x - w : a === 'center' ? x - w / 2 : x;
      const mid = this.textBaseline === 'middle';
      log.push({ text: String(text), x0, x1: x0 + w, y0: mid ? y - fs / 2 : y - fs * 0.8, y1: mid ? y + fs / 2 : y + fs * 0.25 });
      return orig.call(this, text, x, y, ...rest);
    };
    plane.requestDraw();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    ctx.fillText = orig;
    return log;
  }, planeId);
}
// The box of a part of a handle ('.plane-handle-dot' or '.plane-handle-label') in the canvas's css px; null when it is not there.
const handlePart = (page, planeId, pointId, part) => page.evaluate(({ planeId, pointId, part }) => {
  const c = window.__mv.planes.get(planeId).canvas.getBoundingClientRect();
  const el = document.querySelector(`[id="${planeId}-${pointId}"] ${part}`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x0: r.left - c.left, x1: r.right - c.left, y0: r.top - c.top, y1: r.bottom - c.top };
}, { planeId, pointId, part });
const planePx = (page, planeId, z) => page.evaluate(({ planeId, z }) => window.__mv.planes.get(planeId).toPixel(z), { planeId, z });
const boxesOverlap = (a, b, pad = 0) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
const hitsSeg = (a, b, box) => {                       // does the segment a-b pass through the box? (Liang-Barsky)
  let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - box.x0], [dx, box.x1 - a.x], [-dy, a.y - box.y0], [dy, box.y1 - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
};

// The explainer renders once per frame; wait until a cell carries the TeX we expect instead of guessing frames.
async function waitTex(page, id, needle) {
  await page.waitForFunction(({ id, needle }) => { const e = document.getElementById(id); return !!e && (e.dataset.tex || '').includes(needle); }, { id, needle }, { timeout: 4000 });
}

export default async function (page, ctx) {
  const { route } = ctx;
  if (route === 'problem-1-4-2') return roots142(page, ctx);
  if (route === 'problem-1-4-1') return roots141(page, ctx);
  if (route === 'problem-1-4-3') return roots143(page, ctx);
  if (route === 'problem-2-2-2') return principal222(page, ctx);
  if (route === 'roots') return rootsDefault(page, ctx);
  if (route === 'principal-root') return principalDefault(page, ctx);
  ctx.log(`no interaction script for route ${route}`);
}

async function raise(page, powers) {                      // returns the raise readout once the root has landed on c
  if (await reduced(page)) { for (let i = 0; i < powers; i++) await clickChip(page, 'roots-raise'); }
  else {
    await clickChip(page, 'roots-raise');
    await page.waitForFunction(() => document.querySelector('#roots-raise').dataset.state === 'done', null, { timeout: 9000 });
  }
  return readText(page, '#roots-raise-readout');
}

async function roots141(page, { assert, shot }) {
  await page.waitForSelector('#roots-list > li');
  const li = await items(page);
  assert(li.length === 5, `five roots of unity, got ${li.length}`);
  assert(li[1].includes('0.309 + 0.951i') && li[2].includes('-0.809 + 0.588i'), `unity roots: ${li[1]} | ${li[2]}`);
  assert(primitives(li) === 4, `four primitive roots, got ${primitives(li)}`);
  assert(li[0].includes('order 1') && !li[0].includes('primitive'), `root 0 is order 1 and not primitive: ${li[0]}`);
  assert((await readText(page, '#roots-problem')).includes('5th roots of unity'), 'the problem callout names 1.4.1');
  assert((await page.$$('#roots-problem [data-tone="polar"], #roots-problem .badge[data-tone="polar"]')).length > 0, 'the callout is tagged polar');
  assert((await page.$eval('a.problem-chip[href="#problem-1-4-1"]', (e) => e.getAttribute('aria-current'))) === 'true', 'the 1.4.1 chip is marked current');
  await shot('unity');
}

async function roots142(page, { assert, shot }) {
  await page.waitForSelector('#roots-list > li');
  const ro = await readText(page, '#roots-readout');
  assert(ro.includes('c = -16') && ro.includes('|c|^(1/n) = 2'), `readout: ${ro}`);
  let li = await items(page);
  assert(li.length === 4, `four roots, got ${li.length}`);
  const want = [['= 1.414 + 1.414i', 'π/4'], ['= -1.414 + 1.414i', '3π/4'], ['= -1.414 - 1.414i', '5π/4'], ['= 1.414 - 1.414i', '7π/4']];
  want.forEach(([z, a], k) => assert(li[k].includes(z) && li[k].includes(a), `root ${k}: ${li[k]}`));
  for (let k = 0; k < 4; k++) assert(await page.$(`#roots-root-${k}`), `#roots-root-${k} exists`);
  assert(primitives(li) === 0, 'no primitive badge unless c = 1');
  assert((await page.$eval('#roots-zplane-r0 .plane-handle-label', (e) => e.textContent)) === 'k = 0, 4', 'root 0 carries both names, step 0 and step n');
  const tags = await page.$$eval('#roots-stairs-host li[data-k] .stair-k', (els) => els.map((e) => e.textContent));
  assert(tags.length === 5 && tags.includes('k = 0') && tags.includes('k = 4'), `every staircase row carries its k (the widget's showK): ${tags}`);
  assert((await page.$eval('#roots-stairs-k2 .stair-k', (e) => e.textContent)) === 'k = 2', 'the k tag of row 2 says k = 2');
  assert((await page.$$('#roots-stairs-host .rt-krow')).length === 0, 'the station no longer injects its own k tags into the widget');
  await shot('start');

  // The callout never moves the planes: the first drag away from the preset swaps it for the neutral line in a slot of the same height.
  const top0 = await pageTop(page, '.plane[data-plane-id="roots-plane"]');
  assert((await readText(page, '#roots-problem')).includes('4th roots of'), 'the callout names 1.4.2');
  await dragHandle(page, 'roots-plane-c', { re: -8, im: 8 });
  const top1 = await pageTop(page, '.plane[data-plane-id="roots-plane"]');
  assert(Math.abs(top1 - top0) < 1, `the c plane did not move when the callout changed: ${top0} -> ${top1}`);
  assert((await readText(page, '#roots-problem')).startsWith('Your own numbers.'), `the neutral callout after the drag: ${await readText(page, '#roots-problem')}`);
  await clickChip(page, 'roots-preset-m16');
  assert(Math.abs((await pageTop(page, '.plane[data-plane-id="roots-plane"]')) - top0) < 1, 'and the plane is still in place when the preset brings the callout back');
  assert((await readText(page, '#roots-problem')).includes('4th roots of'), 'the 1.4.2 callout is back');

  await clickChip(page, 'roots-pick-2');                   // the arg versus Arg lesson
  const note = await readText(page, '#roots-pick-note');
  assert(note.includes('Step k = 2') && note.includes('5π/4') && note.includes('-3π/4'), `pick note: ${note}`);
  assert(await page.$eval('#roots-stairs-k2', (e) => e.classList.contains('is-picked')), 'staircase row 2 is marked');
  await waitTex(page, 'roots-ex-angle-polar', '5\\pi');
  assert((await dataTex(page, 'roots-ex-angle-polar')).includes('5\\pi'), 'explainer angle cell names 5pi/4');
  await page.waitForFunction(() => document.querySelector('#roots-ex-same').textContent.startsWith('same point: agree'), null, { timeout: 4000 });
  const same = await readText(page, '#roots-ex-same');
  assert(same.startsWith('same point: agree'), `same point row: ${same}`);
  assert((await readText(page, '#roots-ex-heading')).includes('step k = 2'), 'the explainer heading follows the selection');
  await shot('root-2-selected');

  await page.click('#roots-stairs-k4 button');             // the ghost step: the same direction as step 0
  await settle(page);
  assert((await readText(page, '#roots-pick-note')).includes('no new root'), 'the ghost step says there is no new root');
  assert(await page.$eval('#roots-pick-0', (e) => e.getAttribute('aria-pressed') === 'true'), 'root 0 is pressed while the ghost step is selected');
  await clickChip(page, 'roots-pick-2');

  const rr = await raise(page, 3);                         // n - 1 = 3 powers (z^2, z^3, z^4)
  assert(rr.includes('z⁴ = -16') && rr.includes('= c'), `raise readout: ${rr}`);
  {                                                        // the last power lands ON c: its word "z^4 = c" steps off c's own dot and word "c"
    const lab = (await drawnTexts(page, 'roots-plane')).find((t) => t.text === 'z⁴ = c');
    assert(!!lab, 'the raise names its last power "z^4 = c"');
    const cWord = await handlePart(page, 'roots-plane', 'c', '.plane-handle-label'), cDot = await handlePart(page, 'roots-plane', 'c', '.plane-handle-dot');
    assert(cWord && cDot && !boxesOverlap(lab, cWord, 1) && !boxesOverlap(lab, cDot, 1), `"z^4 = c" is clear of the handle c and its word: ${JSON.stringify({ lab, cWord, cDot })}`);
  }
  await shot('raised');

  await page.evaluate(() => { location.hash = '#problem-1-4-1'; });     // second half of A2
  await page.waitForTimeout(600);
  li = await items(page);
  assert(li.length === 5, `five roots of unity, got ${li.length}`);
  assert(li[1].includes('0.309 + 0.951i') && li[2].includes('-0.809 + 0.588i'), `unity roots: ${li[1]} | ${li[2]}`);
  assert(primitives(li) === 4, `four primitive roots, got ${primitives(li)}`);
  await setSlider(page, 'roots-n', 6);
  li = await items(page);
  assert(li.length === 6 && primitives(li) === 2, `n = 6: ${li.length} lines, ${primitives(li)} primitive`);
}

async function roots143(page, { assert, shot }) {
  await page.waitForSelector('#roots-quadratic-readout');
  let q = await readText(page, '#roots-quadratic-readout');
  for (const s of ['(z - 2)² = -9', '3i', '2 + 3i', '2 - 3i']) assert(q.includes(s), `"${s}" in "${q}"`);
  const order = await page.$$eval('#view .station > *', (els) => els.map((e) => e.id));
  assert(order.includes('roots-quadratic') && order.indexOf('roots-quadratic') < order.indexOf('roots-controls'), `quadratic panel first: ${order}`);
  assert((await readText(page, '#roots-quadratic-story')).includes('Slide them right by 2'), 'the story says slide by 2');
  assert((await page.$eval('a.problem-chip[href="#problem-1-4-3"]', (e) => e.getAttribute('aria-current'))) === 'true', 'the 1.4.3 chip is marked current on its own page');
  // c = -9 is d of the quadratic above: the callout says so, instead of telling the student that the numbers match nothing
  const callout = await readText(page, '#roots-problem');
  assert(callout.startsWith('From the quadratic.') && callout.includes('c = -9 is d') && !callout.includes('No review problem matches'), `the 1.4.3 deep link callout: ${callout}`);
  // the check row puts the SAME root back into the equation, once in x and y and once as h + rho e^(i phi); both roots are checked
  await waitTex(page, 'roots-qex-same-polar', 'e^{i');
  assert((await readText(page, '#roots-qex-same')).startsWith('same root: agree'), `quadratic check row: ${await readText(page, '#roots-qex-same')}`);
  const sc = await dataTex(page, 'roots-qex-same-cart'), sp = await dataTex(page, 'roots-qex-same-polar');
  assert(sc.includes('(2 + 3i)^{2}') && sp.includes('(2 + 3\\,e^{i\\pi/2})^{2}') && sc.endsWith('= 0}') && sp.endsWith('= 0}'), `same root in two addresses:\n${sc}\n${sp}`);
  // a typed decimal prints as a decimal in every cell, like the readout; whole numbers keep fractions and radicals
  await page.fill('#roots-qa', '0.5'); await page.fill('#roots-qb', '-3.7'); await page.fill('#roots-qc', '12.25');
  await waitTex(page, 'roots-qex-disc-cart', '12.25');
  const dcell = await dataTex(page, 'roots-qex-disc-cart'), rcell = await dataTex(page, 'roots-qex-roots-cart');
  assert(dcell.includes('(-3.7)^{2} - 4(0.5)(12.25) = -10.81') && !dcell.includes('frac') && !rcell.includes('frac{37'), `decimal coefficients, decimal cells: ${dcell} | ${rcell}`);
  assert(rcell.includes('3.7 + 3.288i') && !/\\frac\{3\}\{10\}|\\frac\{37/.test(rcell), `the roots cell: ${rcell}`);
  assert((await readText(page, '#roots-problem')).startsWith('Your own numbers.'), 'c = -9 is no longer d of the edited quadratic: the neutral callout');
  await setSlider(page, 'roots-qa', 1); await setSlider(page, 'roots-qb', -4); await setSlider(page, 'roots-qc', 13);
  await waitTex(page, 'roots-qex-disc-cart', '= -36');
  assert((await dataTex(page, 'roots-qex-disc-cart')).includes('(-4)^{2} - 4(1)(13) = -36'), 'whole numbers keep the exact cells');
  assert((await readText(page, '#roots-problem')).startsWith('From the quadratic.'), 'and the callout is back once c is d again');
  {                                                        // "slide by 2" sits beside its arrow, not on it, and clear of the dots and their words
    const texts = await drawnTexts(page, 'roots-qplane'), slide = texts.find((t) => t.text === 'slide by 2');
    assert(!!slide, 'the arrow is named "slide by 2"');
    const s0 = await planePx(page, 'roots-qplane', { re: 0, im: 3 }), s1 = await planePx(page, 'roots-qplane', { re: 2, im: 3 });
    assert(!hitsSeg(s0, s1, { x0: slide.x0 - 1, x1: slide.x1 + 1, y0: slide.y0 - 1, y1: slide.y1 + 1 }), `"slide by 2" is off the arrow: ${JSON.stringify({ slide, s0, s1 })}`);
    for (const t of texts) if (t !== slide) assert(!boxesOverlap(slide, t, 1), `"slide by 2" does not overprint "${t.text}"`);
  }
  await shot('quadratic');
  await setSlider(page, 'roots-qc', 8);
  q = await readText(page, '#roots-quadratic-readout');
  assert(q.includes('(z - 2)² = -4') && q.includes('2 + 2i'), `c = 8: ${q}`);
  await setSlider(page, 'roots-qa', 0);                    // error path: a message, not an exception
  q = await readText(page, '#roots-quadratic-readout');
  assert(q.includes('not a quadratic'), `a = 0: ${q}`);
  assert(await page.$eval('#roots-quadratic-load', (e) => e.disabled), 'a = 0: the load button is disabled (there is no d to show)');
  await setSlider(page, 'roots-qa', 1);
  assert(!(await page.$eval('#roots-quadratic-load', (e) => e.disabled)), 'a = 1: the load button works again');
  await page.evaluate(() => { const e = document.getElementById('roots-qb'); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
  assert((await readText(page, '#roots-quadratic-error')).includes('Type numbers for a, b and c'), 'an empty field gets an error line');
  assert((await readText(page, '#roots-quadratic-readout')).includes('(z - 2)²'), 'and the last good result stays');
  await setSlider(page, 'roots-qb', -4);
  assert((await readText(page, '#roots-quadratic-error')) === '', 'the error clears');
  await clickChip(page, 'roots-quadratic-load');           // d = -4: the n = 2 machine in the big picture
  const ro = await readText(page, '#roots-readout');
  assert(ro.includes('c = -4') && ro.includes('n = 2') && ro.includes('|c|^(1/n) = 2'), `loaded: ${ro}`);
  assert((await readText(page, '#roots-problem')).startsWith('From the quadratic.') && (await readText(page, '#roots-problem')).includes('c = -4 is d'), 'after "Show the square roots of d" the callout says where c comes from');
  const li = await items(page);
  assert(li.length === 2 && li[0].includes('= 2i') && li[1].includes('= -2i'), `square roots of -4: ${li}`);
  await setSlider(page, 'roots-qc', 13);
  assert((await readText(page, '#roots-quadratic-readout')).includes('2 + 3i'), 'back to 13');
  await setSlider(page, 'roots-qc', 4);                    // a double root: one filled dot, no crash
  assert((await readText(page, '#roots-quadratic-readout')).includes('square roots: 0'), 'double root');
  await setSlider(page, 'roots-qc', 13);
}

async function principal222(page, { assert, shot }) {
  await page.waitForSelector('#principal-root-readout');
  const r = await readText(page, '#principal-root-readout');
  for (const s of ['w = 2i', 'Arg w = 1.571', 'π/4', '= 1 + i']) assert(r.includes(s), `"${s}" in "${r}"`);
  await page.waitForFunction(() => document.querySelector('#principal-root-ex-same').textContent.startsWith('same point: agree'), null, { timeout: 4000 });
  assert((await readText(page, '#principal-root-ex-same')).startsWith('same point: agree'), 'same point row agrees');
  await shot('start');
  await clickChip(page, 'principal-root-plane-r1');        // the ghost root, from step k = 1
  assert((await readText(page, '#principal-root-pick-note')).includes('step k = 1'), 'ghost root names its step');
  assert(await page.$eval('#principal-root-stairs-k1', (e) => e.classList.contains('is-picked')), 'staircase row 1 is marked');
  await clickChip(page, 'principal-root-plane-r0');
  assert((await readText(page, '#principal-root-pick-note')).includes('step k = 0'), 'the solid root is step 0');
  await clickChip(page, 'principal-root-plane-r1');

  const samples = [];                                      // drag w once around |w| = 2, recording what the readout says
  await dragHandleAround(page, 'principal-root-plane-w', { radius: 2, startAngle: Math.PI / 2, turns: 1, steps: 48 }, async (pg, angle, i) => {
    const t = await readText(pg, '#principal-root-readout');
    samples.push({ i, arg: Number(/Arg w = (-?\d+(?:\.\d+)?)/.exec(t)[1]), root: parseCart(t.split(' = ').pop()) });
  });
  assert(samples.length === 49, `49 samples, got ${samples.length}`);
  let jumps = 0, other = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = Math.hypot(samples[i].root.re - samples[i - 1].root.re, samples[i].root.im - samples[i - 1].root.im);
    if (d > 1.5) jumps++; else other = Math.max(other, d);
  }
  assert(jumps === 1 && other < 0.4, `one jump (got ${jumps}), all other steps small (max ${other.toFixed(3)})`);
  const near = (a) => samples.filter((s) => Math.abs(s.arg - a) < 0.15);
  assert(near(-3).length > 0 && near(-3).every((s) => s.root.im < 0), 'near Arg w = -3 the root is below the axis');
  assert(near(3).length > 0 && near(3).every((s) => s.root.im > 0), 'near Arg w = +3 the root is above the axis');
  assert((await readText(page, '#principal-root-sweep-readout')).includes('jumps'), 'dragging across the seam is reported');
  await shot('after-drag');

  const start = await handleZ(page, 'principal-root-plane-w');
  if (await reduced(page)) {
    for (let i = 0; i < 12; i++) await clickChip(page, 'principal-root-sweep');
  } else {
    await clickChip(page, 'principal-root-sweep');
    assert(!(await readText(page, '#principal-root-sweep-readout')).includes('jumps'), 'starting a sweep clears the earlier jump');
    assert((await page.$eval('#principal-root-sweep', (e) => e.dataset.state)) === 'playing', 'button says playing');
    await page.waitForFunction(() => document.querySelector('#principal-root-sweep-readout').textContent.includes('jumps'), null, { timeout: 9000 });
    await shot('sweep-jumped');
    await page.waitForFunction(() => document.querySelector('#principal-root-sweep').dataset.state === 'idle', null, { timeout: 9000 });
  }
  const sw = await readText(page, '#principal-root-sweep-readout');
  assert(sw.includes('jumps') && sw.includes('Arg w = π') && sw.includes('Crossings so far: 1'), `sweep readout: ${sw}`);
  const end = await handleZ(page, 'principal-root-plane-w');
  assert(Math.hypot(end.re - start.re, end.im - start.im) < 0.05, 'the sweep brought w back to where it started');
}

async function rootsDefault(page, { assert, shot }) {
  await page.waitForSelector('#roots-list > li');
  assert((await readText(page, '#roots-readout')).startsWith('c = 1; n = 5;'), 'default is 1.4.1');
  let li = await items(page);
  assert(li.length === 5 && primitives(li) === 4, 'five roots, four primitive');
  await page.focus('#roots-zplane-r3');                    // keyboard: Enter selects the root under focus
  await page.keyboard.press('Enter');
  await settle(page);
  assert((await readText(page, '#roots-pick-note')).includes('Step k = 3'), 'Enter selected step 3');
  const z = await dragHandle(page, 'roots-plane-c', { re: -1, im: 1 });
  assert(Math.abs(z.re + 1) < 1e-6 && Math.abs(z.im - 1) < 1e-6, `c snapped to -1 + i, got ${z.re}, ${z.im}`);
  const ro = await readText(page, '#roots-readout');
  assert(ro.includes('c = -1 + i') && ro.includes('Arg c = 3π/4'), `readout after the drag: ${ro}`);
  li = await items(page);
  assert(primitives(li) === 0, 'no primitive badges away from c = 1');
  assert((await readText(page, '#roots-primitive-note')).includes('defined for c = 1'), 'the note says why');
  await shot('dragged');
  await clickChip(page, 'roots-preset-1');
  assert(primitives(await items(page)) === 4, 'back to c = 1: four primitive roots');

  // Autofit: a pan or zoom turns it off; a preset, a new n or a typed value turns it back on, even when the fitted half-width would not change.
  const hz0 = await half(page, 'roots-zplane'), hc0 = await half(page, 'roots-plane');
  assert(hz0 === 1.5 && hc0 === 2, `fitted half-widths at c = 1, n = 5: c ${hc0}, z ${hz0}`);
  await zoomAndPan(page, 'roots-zplane');
  const hzz = await half(page, 'roots-zplane');
  assert(hzz < hz0, `the keyboard zoomed the root plane: ${hzz}`);
  assert((await page.evaluate(() => window.__mv.roots.state().view.z)) === hzz, 'state().view reports the half-width the plane shows');
  await clickChip(page, 'roots-preset-1');
  assert((await half(page, 'roots-zplane')) === hz0, 'the same preset again restores the fitted root plane');
  await zoomAndPan(page, 'roots-zplane');
  await setSlider(page, 'roots-n', 6);
  assert((await half(page, 'roots-zplane')) === hz0, 'a new n restores the fitted root plane');
  await zoomAndPan(page, 'roots-plane');
  assert((await half(page, 'roots-plane')) < hc0, 'the c plane zoomed too');
  await clickChip(page, 'roots-preset-1');
  assert((await half(page, 'roots-plane')) === hc0 && (await half(page, 'roots-zplane')) === hz0, 'a preset restores both planes');
  await zoomAndPan(page, 'roots-plane');
  await zoomAndPan(page, 'roots-zplane');
  await page.fill('#roots-c-re', '1.5'); await page.fill('#roots-c-im', '0');      // |c| = 1.5 fits the same ladder rung as c = 1
  await settle(page);
  assert((await half(page, 'roots-plane')) === hc0 && (await half(page, 'roots-zplane')) === hz0, 'a typed value restores both planes');
  await clickChip(page, 'roots-preset-1');
  await page.evaluate(() => window.__mv.roots.setC(0.001, 0)); await setSlider(page, 'roots-n', 3);      // a tiny |c|: the roots fill the root plane
  assert((await half(page, 'roots-zplane')) === 0.2, `c = 0.001, n = 3: the root plane is fitted to the roots at 0.1: ${await half(page, 'roots-zplane')}`);
  await shot('tiny-c');
  await clickChip(page, 'roots-preset-1');

  // One house style per view: a typed decimal prints as a decimal in the explainer (like the readout), and a power's base is bracketed.
  await page.evaluate(() => window.__mv.roots.setC(0.3, -0.7)); await settle(page, 3);
  await waitTex(page, 'roots-ex-eq-cart', '0.3');
  const eqc = await dataTex(page, 'roots-ex-eq-cart');
  assert(eqc.includes('0.3 - 0.7i') && !eqc.includes('\\frac{3}{10}'), `the equation row shows c as typed: ${eqc}`);
  assert((await readText(page, '#roots-readout')).startsWith('c = 0.3 - 0.7i;'), 'and so does the readout');
  await page.evaluate(() => { window.__mv.roots.setC(-1, 1); window.__mv.roots.setN(5); }); await settle(page, 3);
  await waitTex(page, 'roots-ex-length-polar', 'sqrt');
  assert((await dataTex(page, 'roots-ex-length-polar')).includes('\\left(\\sqrt{2}\\right)^{1/5}'), 'the radical base carries its exponent in brackets');
  await clickChip(page, 'roots-preset-1');
  // the Arg block of the selected root never sits across y = 0 (the axis through "Arg z3 = 3.029" read as a minus sign), at 7 roots of -1 + i
  await page.evaluate(() => { const h = window.__mv.roots; h.setC(-1, 1); h.setN(7); h.select(3); });
  await settle(page, 3);
  {
    const texts = await drawnTexts(page, 'roots-zplane'), O = await planePx(page, 'roots-zplane', { re: 0, im: 0 });
    const block = texts.filter((t) => /^Arg z|^also /.test(t.text));
    const w = await page.evaluate(() => window.__mv.planes.get('roots-zplane').getSize().w);
    assert(block.length === 2, `at 7 roots the Arg block is "Arg z" and one "also" line (the negative winding is drawn for n <= 6 only): ${block.map((t) => t.text)}`);
    assert(block[0].text.startsWith('Arg z') && block.every((t) => !(t.y0 < O.y && O.y < t.y1)), `no line of the Arg block is cut by the real axis (y = ${O.y}): ${JSON.stringify(block)}`);
  }
  await page.evaluate(() => { const h = window.__mv.roots; h.setC(-1, 1); h.setN(5); h.select(2); });          // n <= 6: one winding below as well, but not on a phone
  await settle(page, 3);
  {
    const block = (await drawnTexts(page, 'roots-zplane')).filter((t) => /^Arg z|^also /.test(t.text)), w = await page.evaluate(() => window.__mv.planes.get('roots-zplane').getSize().w);
    assert(block.length === (w >= 420 ? 3 : 2), `n = 5: the Arg block has ${w >= 420 ? 'three lines' : 'two lines on a phone (plane ' + w + ' px)'}: ${block.map((t) => t.text)}`);
  }
  await page.evaluate(() => { const h = window.__mv.roots; h.setC(0.3, -0.7); h.setN(12); h.select(0); });      // 12 roots: r stays inside the plane, x is off the word "0, 12"
  await settle(page, 3);
  {
    const texts = await drawnTexts(page, 'roots-zplane'), w = await page.evaluate(() => window.__mv.planes.get('roots-zplane').getSize());
    const r = texts.find((t) => t.text.startsWith('r = ')), x = texts.find((t) => t.text.startsWith('x = ')), word = await handlePart(page, 'roots-zplane', 'r0', '.plane-handle-label');
    assert(r && r.x0 >= 0 && r.x1 <= w.w, `the r label is whole: ${JSON.stringify(r)}`);
    assert(x && word && !boxesOverlap(x, word), `the x label is off the word "0, 12": ${JSON.stringify({ x, word })}`);
  }
  await clickChip(page, 'roots-preset-1');
  await setSlider(page, 'roots-n', 12);
  li = await items(page);
  assert(li.length === 12 && primitives(li) === 4, `n = 12: ${li.length} lines, ${primitives(li)} primitive`);
  // from 8 roots on the staircase is compact (no decimal column), so its rows are not cut off in a half-width column; below that it is the full form
  assert((await page.$eval('#roots-stairs-host .staircase-wrap', (e) => e.dataset.compact)) === 'true', 'n = 12: compact staircase');
  assert((await page.$$eval('#roots-stairs-host .stair-dec', (els) => els.every((e) => getComputedStyle(e).display === 'none'))), 'compact hides the decimal column');
  await setSlider(page, 'roots-n', 7);
  assert((await page.$eval('#roots-stairs-host .staircase-wrap', (e) => e.dataset.compact)) === undefined, 'n = 7: the full staircase');
  await setSlider(page, 'roots-n', 12);
  assert((await page.$eval('#roots-zplane-r0 .plane-handle-label', (e) => e.textContent)) === '0, 12', 'n = 12 labels are numbers only');
  await setSlider(page, 'roots-n', 3);
  assert((await page.$('#roots-stairs-k3')) && !(await page.$('#roots-stairs-k4')), 'the staircase has rows 0..n');
  await clickChip(page, 'roots-preset-i');
  assert((await readText(page, '#roots-readout')).startsWith('c = i; n = 3;'), 'c = i chip');
  // the list of k in the polar equation is written out for n = 2 and 3 ("k = 0, 1, ..., 1" read like a typo) and abbreviated from n = 4
  await waitTex(page, 'roots-ex-eq-polar', 'k = 0, 1, 2');
  assert(!(await dataTex(page, 'roots-ex-eq-polar')).includes('dots'), `n = 3 lists k: ${await dataTex(page, 'roots-ex-eq-polar')}`);
  await clickChip(page, 'roots-preset-2i');
  await waitTex(page, 'roots-ex-eq-polar', 'k = 0, 1}');
  assert(!(await dataTex(page, 'roots-ex-eq-polar')).includes('dots'), `n = 2 lists k: ${await dataTex(page, 'roots-ex-eq-polar')}`);
  await clickChip(page, 'roots-preset-m16');
  await waitTex(page, 'roots-ex-eq-polar', 'dots, 3');
  // the footer writes a negative angle as e^{-i ...}, like every other cell (not "e^{i -2.356}")
  await page.evaluate(() => { window.__mv.roots.setC(-1, -1); window.__mv.roots.setN(5); window.__mv.roots.select(0); });
  await waitTex(page, 'roots-ex-same-polar', 'e^{-i');
  assert(!/e\^\{i\\?,?\s*-/.test(await dataTex(page, 'roots-ex-same-polar')), `signed exponent: ${await dataTex(page, 'roots-ex-same-polar')}`);
  await clickChip(page, 'roots-preset-i');

  // typed numbers: a good one moves c, a bad one gets a message and the last good value stays
  await page.fill('#roots-c-re', '-4'); await page.fill('#roots-c-im', '0');
  await settle(page);
  assert((await readText(page, '#roots-readout')).startsWith('c = -4;'), 'typing Re c and Im c moves c');
  await page.evaluate(() => { const e = document.getElementById('roots-c-re'); e.value = ''; e.dispatchEvent(new Event('change', { bubbles: true })); });
  assert((await readText(page, '#roots-c-error')).includes('Type a number'), 'a bad number gets an error line');
  assert((await readText(page, '#roots-readout')).startsWith('c = -4;'), 'and c stays');
  await page.fill('#roots-c-re', '1e3');
  await settle(page);
  assert((await readText(page, '#roots-readout')).startsWith('c = 100;'), 'a huge c is kept at 100');
  assert((await readText(page, '#roots-c-error')).includes('100'), 'and says so');
  await page.focus('#roots-c-im'); await page.fill('#roots-c-im', '0');        // leaving the field restores the clamped value
  assert((await page.$eval('#roots-c-re', (e) => e.value)) === '100', 'the field shows the value in use');
  assert((await readText(page, '#roots-c-error')).includes('100'), 'the big-number message survives the move to the other field (c did not change)');
  await page.fill('#roots-c-re', '5'); await settle(page);
  assert((await readText(page, '#roots-c-error')) === '', 'and goes at the first edit that really changes c');
  await page.fill('#roots-c-re', '1e3'); await settle(page);
  assert((await readText(page, '#roots-c-error')).includes('100'), 'it comes back for the next big number');
  await clickChip(page, 'roots-preset-1');
  assert((await readText(page, '#roots-c-error')) === '', 'a preset clears it');

  // c = 0: no staircase to divide, no crash
  await page.fill('#roots-c-re', '0'); await page.fill('#roots-c-im', '0');
  await settle(page);
  assert((await readText(page, '#roots-readout')).includes('every root is 0'), 'c = 0 readout');
  assert((await readText(page, '#roots-ex-heading')) === 'Both addresses', `c = 0: a neutral heading, not a stale k: ${await readText(page, '#roots-ex-heading')}`);
  assert(!(await page.$eval('#roots-zero-note', (e) => e.hidden)), 'the zero note is shown');
  assert((await page.$$('#roots-list > li')).length === 0, 'no list for c = 0');
  await shot('zero');
  await clickChip(page, 'roots-preset-m16');
  assert((await items(page)).length === 4, 'back to -16');

  // reduced motion turns the raise into a stepper
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clickChip(page, 'roots-raise');
  assert((await page.$eval('#roots-raise', (e) => e.dataset.state)) === 'stepping', 'reduced motion: the raise steps');
  assert((await readText(page, '#roots-raise')).includes('Next power'), 'reduced motion: the button says Next power');
  assert((await readText(page, '#roots-raise-readout')).startsWith('z² = '), 'first step is z²');
  for (let i = 0; i < 2; i++) await clickChip(page, 'roots-raise');
  assert((await page.$eval('#roots-raise', (e) => e.dataset.state)) === 'done', 'n - 1 clicks reach power n');
  assert((await readText(page, '#roots-raise-readout')).includes('z⁴ = -16'), 'and the root lands on c');
  assert((await readText(page, '#roots-raise')).includes('Start again'), 'the button then says Start again');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}

async function principalDefault(page, { assert, shot }) {
  await page.waitForSelector('#principal-root-readout');
  assert((await readText(page, '#principal-root-readout')).startsWith('w = 2i; n = 2;'), 'default is 2.2.2');
  await setSlider(page, 'principal-root-n', 3);
  assert((await page.$('#principal-root-stairs-k2')) && !(await page.$('#principal-root-stairs-k3')), 'three staircase rows for n = 3');
  await clickChip(page, 'principal-root-preset-m1cube');
  assert((await readText(page, '#principal-root-trap')).includes('not the principal one'), 'the real cube root is not the principal root');
  assert((await readText(page, '#principal-root-readout')).includes('= 0.5 + 0.866i'), 'principal cube root of -1');
  {                                                        // w sits exactly on its real cube root (root k = 1): their two words "w" and "k = 1" are side by side, not overprinted
    const ww = await handlePart(page, 'principal-root-plane', 'w', '.plane-handle-label'), kw = await handlePart(page, 'principal-root-plane', 'r1', '.plane-handle-label');
    assert(ww && kw && !boxesOverlap(ww, kw), `the words "w" and "k = 1" do not overlap: ${JSON.stringify({ ww, kw })}`);
  }
  await shot('trap');

  // The callout never moves the plane; autofit comes back with a preset, a new n or a typed value; "Zoom in on the roots" fits the roots alone.
  await clickChip(page, 'principal-root-preset-2i');
  const top0 = await pageTop(page, planeSel('principal-root-plane'));
  assert((await readText(page, '#principal-root-problem')).includes('2.2.2'), 'the callout names 2.2.2');
  {                                                        // at w = 2i the "r = 2" label is not on a tick number (it sat on the "1" of the imaginary axis)
    const texts = await drawnTexts(page, 'principal-root-plane'), rl = texts.find((t) => t.text === 'r = 2');
    assert(rl, 'w = 2i has an r label');
    const hit = texts.filter((t) => /^-?\d+(\.\d+)?$/.test(t.text) && boxesOverlap(rl, t));
    assert(hit.length === 0, `"r = 2" is clear of the tick numbers: ${JSON.stringify(hit)}`);
  }
  await dragHandle(page, 'principal-root-plane-w', { re: 1, im: 1 });
  assert(Math.abs((await pageTop(page, planeSel('principal-root-plane'))) - top0) < 1, 'the plane did not move when the callout changed');
  assert((await readText(page, '#principal-root-problem')).startsWith('Your own numbers.'), 'the neutral callout after the drag');
  await clickChip(page, 'principal-root-preset-2i');
  assert(Math.abs((await pageTop(page, planeSel('principal-root-plane'))) - top0) < 1, 'and still in place when the preset brings the callout back');
  const tags = await page.$$eval('#principal-root-stairs-host li[data-k] .stair-k', (els) => els.map((e) => e.textContent));
  assert(tags.join('|') === 'k = 1|k = 0', `rows carry their k (n = 2): ${tags}`);
  const h0 = await half(page, 'principal-root-plane');
  assert(h0 === 3.2, `fitted half-width at w = 2i: ${h0}`);
  await zoomAndPan(page, 'principal-root-plane');
  const hz = await half(page, 'principal-root-plane');
  assert(hz < h0 && (await page.evaluate(() => window.__mv.principalRoot.state().view)) === hz, `zoomed to ${hz}, and state().view says so`);
  await clickChip(page, 'principal-root-preset-2i');
  assert((await half(page, 'principal-root-plane')) === h0, 'the same preset again restores the fitted view');
  await zoomAndPan(page, 'principal-root-plane');
  await setSlider(page, 'principal-root-n', 3);
  assert((await half(page, 'principal-root-plane')) === h0 && (await page.evaluate(() => window.__mv.principalRoot.state().view)) === h0, 'a new n restores the fitted view (w = 2i: 3.2 for n = 2 and for n = 3)');
  await zoomAndPan(page, 'principal-root-plane');
  await page.fill('#principal-root-w-re', '0'); await page.fill('#principal-root-w-im', '2.4');       // |w| = 2.4 fits the same rung (3.2)
  await settle(page);
  assert((await half(page, 'principal-root-plane')) === h0, 'a typed value restores the fitted view');
  await page.fill('#principal-root-w-re', '40'); await page.fill('#principal-root-w-im', '0');          // a far w: its roots shrink to a cluster
  await setSlider(page, 'principal-root-n', 3);
  assert((await half(page, 'principal-root-plane')) === 52, 'w = 40 needs the whole plane');
  await shot('far-w');
  await clickChip(page, 'principal-root-zoom');
  assert((await half(page, 'principal-root-plane')) === 5 && (await readText(page, '#principal-root-zoom')) === 'Show w again', 'Zoom in on the roots fits the roots alone');
  await shot('far-w-roots');
  await clickChip(page, 'principal-root-zoom');
  assert((await half(page, 'principal-root-plane')) === 52 && (await readText(page, '#principal-root-zoom')) === 'Zoom in on the roots', 'and the button brings w back');
  await clickChip(page, 'principal-root-zoom');
  // six roots of a far w sit closer than 12 px: the words of the ghost roots are dropped (they overprinted into "k=2 1"), the word "principal" stays,
  // and in the roots-only view the address labels of the far w (x = 40, r = 40) are not drawn at the edge of the plane
  await setSlider(page, 'principal-root-n', 6);
  assert((await half(page, 'principal-root-plane')) === 52, 'w = 40, n = 6 needs the whole plane');
  assert((await handlePart(page, 'principal-root-plane', 'r0', '.plane-handle-label')) && !(await handlePart(page, 'principal-root-plane', 'r1', '.plane-handle-label'))
    && !(await handlePart(page, 'principal-root-plane', 'r5', '.plane-handle-label')), 'crowded roots: "principal" has its word, the ghost roots have none');
  {
    const texts = (await drawnTexts(page, 'principal-root-plane')).map((t) => t.text);
    assert(texts.some((t) => /^x = 3\d/.test(t)) && texts.some((t) => /^r = 3\d/.test(t)), `with w in the picture its address labels are drawn: ${texts} (w ${JSON.stringify(await page.evaluate(() => window.__mv.principalRoot.state().w))})`);
  }
  await clickChip(page, 'principal-root-zoom');
  for (let k = 1; k < 6; k++) assert(await handlePart(page, 'principal-root-plane', 'r' + k, '.plane-handle-label'), `zoomed in on the roots, root ${k} has its word again`);
  {
    const texts = (await drawnTexts(page, 'principal-root-plane')).map((t) => t.text);
    assert(!texts.some((t) => /^x = |^r = |^Arg w = |^also /.test(t)) && texts.some((t) => t.startsWith('angle Arg w / 6')), `roots-only view: no address labels of the far w, the angle label stays: ${texts}`);
  }
  await shot('far-w-six');
  await clickChip(page, 'principal-root-zoom');
  await clickChip(page, 'principal-root-preset-2i');
  assert((await half(page, 'principal-root-plane')) === h0 && (await readText(page, '#principal-root-zoom')) === 'Zoom in on the roots', 'a preset leaves the roots-only view');
  // w near its own principal root (the end of a sweep): "angle Arg w / 3 = ..." is not half hidden under w
  await setSlider(page, 'principal-root-n', 3);
  await page.evaluate(() => window.__mv.principalRoot.setW(1.97, -0.34)); await settle(page, 3);
  {
    const lab = (await drawnTexts(page, 'principal-root-plane')).find((t) => t.text.startsWith('angle Arg w / 3'));
    const wDot = await handlePart(page, 'principal-root-plane', 'w', '.plane-handle-dot'), pDot = await handlePart(page, 'principal-root-plane', 'r0', '.plane-handle-dot');
    assert(lab && wDot && pDot && !boxesOverlap(lab, wDot, 3) && !boxesOverlap(lab, pDot, 3), `the angle label is clear of w and of the principal root: ${JSON.stringify({ lab, wDot, pDot })}`);
  }
  // the footer writes a negative angle as e^{-i ...}
  await page.evaluate(() => window.__mv.principalRoot.setW(1, -2)); await settle(page, 3);
  await waitTex(page, 'principal-root-ex-same-polar', 'e^{-i');
  assert(!/e\^\{i\\?,?\s*-/.test(await dataTex(page, 'principal-root-ex-same-polar')), `signed exponent: ${await dataTex(page, 'principal-root-ex-same-polar')}`);
  // the big-number message stays while the student moves to the other field, and goes at the first real change
  await page.fill('#principal-root-w-im', '0'); await page.fill('#principal-root-w-re', '400'); await settle(page);
  assert((await readText(page, '#principal-root-w-error')).includes('40'), 'a huge w is kept at 40 and says so');
  await page.focus('#principal-root-w-im');
  await page.evaluate(() => document.getElementById('principal-root-w-im').dispatchEvent(new Event('input', { bubbles: true }))); await settle(page);      // an input event in the other field that leaves w as it is
  assert((await readText(page, '#principal-root-w-error')).includes('40'), 'the message survives the move to the other field');
  await page.fill('#principal-root-w-re', '3'); await settle(page);
  assert((await readText(page, '#principal-root-w-error')) === '', 'and goes at the first edit that changes w');
  await clickChip(page, 'principal-root-preset-m1cube');          // back to the state the keyboard check below expects

  await page.focus('#principal-root-plane-w');             // keyboard across the seam: (-1, 0.1) then (-1, 0) then (-1, -0.1)
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await settle(page);
  assert((await readText(page, '#principal-root-sweep-readout')).includes('jumps'), 'a keyboard crossing of the seam is detected');
  await clickChip(page, 'principal-root-preset-2i');       // a preset is a teleport, never a crossing
  assert(!(await readText(page, '#principal-root-sweep-readout')).includes('jumps'), 'a preset clears the jump');
  await page.fill('#principal-root-w-re', '-3'); await page.fill('#principal-root-w-im', '-4');
  await settle(page);
  assert((await readText(page, '#principal-root-readout')).includes('w = -3 - 4i'), 'typing Re w and Im w moves w');
  assert(!(await readText(page, '#principal-root-sweep-readout')).includes('jumps'), 'a typed value is a teleport, never a crossing');
  await page.fill('#principal-root-w-re', '0'); await page.fill('#principal-root-w-im', '0');
  await settle(page);
  assert((await readText(page, '#principal-root-readout')).includes('every root is 0'), 'w = 0 readout');
  assert(await page.$eval('#principal-root-sweep', (e) => e.disabled), 'the sweep is disabled at w = 0');
  {                                                        // "0: every root" is beside the origin, not on the w handle or its word
    const lab = (await drawnTexts(page, 'principal-root-plane')).find((t) => t.text === '0: every root');
    const dot = await handlePart(page, 'principal-root-plane', 'w', '.plane-handle-dot'), word = await handlePart(page, 'principal-root-plane', 'w', '.plane-handle-label');
    assert(lab && dot && word && !boxesOverlap(lab, dot, 1) && !boxesOverlap(lab, word, 1), `"0: every root" is clear of w and its word: ${JSON.stringify({ lab, dot, word })}`);
  }
  await shot('zero');
  await clickChip(page, 'principal-root-preset-2i');

  // reduced motion turns the sweep into a stepper of 12 steps with one crossing
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clickChip(page, 'principal-root-sweep');
  assert((await page.$eval('#principal-root-sweep', (e) => e.dataset.state)) === 'stepping', 'reduced motion: the sweep steps');
  assert((await readText(page, '#principal-root-sweep')).includes('Step w around (2 of 12)'), 'the button counts the steps');
  for (let i = 0; i < 11; i++) await clickChip(page, 'principal-root-sweep');
  assert((await page.$eval('#principal-root-sweep', (e) => e.dataset.state)) === 'idle', '12 clicks end the sweep');
  const sw = await readText(page, '#principal-root-sweep-readout');
  assert(sw.includes('jumps') && sw.includes('Crossings so far: 1'), `one crossing in the stepped lap: ${sw}`);
  assert((await readText(page, '#principal-root-sweep')).includes('Sweep again'), 'the button then says Sweep again');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}
