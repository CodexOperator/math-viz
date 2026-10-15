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
  const want = [['= 1.414 + 1.414i', 'pi/4'], ['= -1.414 + 1.414i', '3pi/4'], ['= -1.414 - 1.414i', '5pi/4'], ['= 1.414 - 1.414i', '7pi/4']];
  want.forEach(([z, a], k) => assert(li[k].includes(z) && li[k].includes(a), `root ${k}: ${li[k]}`));
  for (let k = 0; k < 4; k++) assert(await page.$(`#roots-root-${k}`), `#roots-root-${k} exists`);
  assert(primitives(li) === 0, 'no primitive badge unless c = 1');
  assert((await page.$eval('#roots-zplane-r0 .plane-handle-label', (e) => e.textContent)) === 'k = 0, 4', 'root 0 carries both names, step 0 and step n');
  await shot('start');

  await clickChip(page, 'roots-pick-2');                   // the arg versus Arg lesson
  const note = await readText(page, '#roots-pick-note');
  assert(note.includes('Step k = 2') && note.includes('5pi/4') && note.includes('-3pi/4'), `pick note: ${note}`);
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
  assert(rr.includes('z^4 = -16') && rr.includes('= c'), `raise readout: ${rr}`);
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
  for (const s of ['(z - 2)^2 = -9', '3i', '2 + 3i', '2 - 3i']) assert(q.includes(s), `"${s}" in "${q}"`);
  const order = await page.$$eval('#view .station > *', (els) => els.map((e) => e.id));
  assert(order.includes('roots-quadratic') && order.indexOf('roots-quadratic') < order.indexOf('roots-controls'), `quadratic panel first: ${order}`);
  assert((await readText(page, '#roots-quadratic-story')).includes('Slide them right by 2'), 'the story says slide by 2');
  await shot('quadratic');
  await setSlider(page, 'roots-qc', 8);
  q = await readText(page, '#roots-quadratic-readout');
  assert(q.includes('(z - 2)^2 = -4') && q.includes('2 + 2i'), `c = 8: ${q}`);
  await setSlider(page, 'roots-qa', 0);                    // error path: a message, not an exception
  q = await readText(page, '#roots-quadratic-readout');
  assert(q.includes('not a quadratic'), `a = 0: ${q}`);
  await setSlider(page, 'roots-qa', 1);
  await page.evaluate(() => { const e = document.getElementById('roots-qb'); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
  assert((await readText(page, '#roots-quadratic-error')).includes('Type numbers for a, b and c'), 'an empty field gets an error line');
  assert((await readText(page, '#roots-quadratic-readout')).includes('(z - 2)^2'), 'and the last good result stays');
  await setSlider(page, 'roots-qb', -4);
  assert((await readText(page, '#roots-quadratic-error')) === '', 'the error clears');
  await clickChip(page, 'roots-quadratic-load');           // d = -4: the n = 2 machine in the big picture
  const ro = await readText(page, '#roots-readout');
  assert(ro.includes('c = -4') && ro.includes('n = 2') && ro.includes('|c|^(1/n) = 2'), `loaded: ${ro}`);
  const li = await items(page);
  assert(li.length === 2 && li[0].includes('= 2i') && li[1].includes('= -2i'), `square roots of -4: ${li}`);
  await setSlider(page, 'roots-qc', 13);
  assert((await readText(page, '#roots-quadratic-readout')).includes('2 + 3i'), 'back to 13');
  await setSlider(page, 'roots-qc', 4);                    // a double root: one filled dot, no crash
  assert((await readText(page, '#roots-quadratic-readout')).includes('sqrt: 0'), 'double root');
  await setSlider(page, 'roots-qc', 13);
}

async function principal222(page, { assert, shot }) {
  await page.waitForSelector('#principal-root-readout');
  const r = await readText(page, '#principal-root-readout');
  for (const s of ['w = 2i', 'Arg w = 1.571', 'pi/4', '= 1 + i']) assert(r.includes(s), `"${s}" in "${r}"`);
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
  assert(sw.includes('jumps') && sw.includes('Arg w = pi') && sw.includes('Crossings so far: 1'), `sweep readout: ${sw}`);
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
  assert(ro.includes('c = -1 + i') && ro.includes('Arg c = 3pi/4'), `readout after the drag: ${ro}`);
  li = await items(page);
  assert(primitives(li) === 0, 'no primitive badges away from c = 1');
  assert((await readText(page, '#roots-primitive-note')).includes('defined for c = 1'), 'the note says why');
  await shot('dragged');
  await clickChip(page, 'roots-preset-1');
  assert(primitives(await items(page)) === 4, 'back to c = 1: four primitive roots');
  await setSlider(page, 'roots-n', 12);
  li = await items(page);
  assert(li.length === 12 && primitives(li) === 4, `n = 12: ${li.length} lines, ${primitives(li)} primitive`);
  assert((await page.$eval('#roots-zplane-r0 .plane-handle-label', (e) => e.textContent)) === '0, 12', 'n = 12 labels are numbers only');
  await setSlider(page, 'roots-n', 3);
  assert((await page.$('#roots-stairs-k3')) && !(await page.$('#roots-stairs-k4')), 'the staircase has rows 0..n');
  await clickChip(page, 'roots-preset-i');
  assert((await readText(page, '#roots-readout')).startsWith('c = i; n = 3;'), 'c = i chip');

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
  await page.fill('#roots-c-im', '0');                     // leaving the field restores the clamped value
  assert((await page.$eval('#roots-c-re', (e) => e.value)) === '100', 'the field shows the value in use');

  // c = 0: no staircase to divide, no crash
  await page.fill('#roots-c-re', '0'); await page.fill('#roots-c-im', '0');
  await settle(page);
  assert((await readText(page, '#roots-readout')).includes('every root is 0'), 'c = 0 readout');
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
  assert((await readText(page, '#roots-raise-readout')).startsWith('z^2 = '), 'first step is z^2');
  for (let i = 0; i < 2; i++) await clickChip(page, 'roots-raise');
  assert((await page.$eval('#roots-raise', (e) => e.dataset.state)) === 'done', 'n - 1 clicks reach power n');
  assert((await readText(page, '#roots-raise-readout')).includes('z^4 = -16'), 'and the root lands on c');
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
  await shot('trap');
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
