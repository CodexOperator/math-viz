// tests/interact/i2-lab-diary.mjs: the Lab as a diary (acceptance criteria A1 and A5 of goal i2-lab-diary).
//   node tools/smoke.mjs --route lab --script tests/interact/i2-lab-diary.mjs --dark --out docs/review/iter-2/i2-lab-diary
// Design: docs/designs/iter-2/i2-lab-diary.md, section 7.3. Runs at desktop (1280), phone (390) and dark desktop.

import { clickChip, planePixel, readText, setSlider, settle } from './_helpers.mjs';

const pause = (page, ms) => page.waitForTimeout(ms);
const lab = (page, name) => page.evaluate((n) => window.__mv.lab[n](), name);
const nowhere = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);
// After a reload: wait for the Lab's hook (a fixed pause is too short on a busy machine) and for the pages to be read from the store.
const labReady = (page) => page.waitForFunction(() => window.__mv && window.__mv.lab && typeof window.__mv.lab.pages === 'function', null, { timeout: 15000 });

// A <details> disclosure (#lab-more, #lab-pages) opens by a click on its summary (#<id>-toggle).
async function openDetails(page, id) {
  if (!(await page.evaluate((i) => document.getElementById(i).open, id))) await page.click(`#${id}-toggle`);
  await settle(page, 2);
}

// Press on one plane point, move to another in `steps`, and (unless hold) release. The pointer is left down when hold is true.
async function stroke(page, planeId, a, b, { steps = 8, hold = false } = {}) {
  const p = await planePixel(page, planeId, a);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  const q = await planePixel(page, planeId, b);
  await page.mouse.move(q.x, q.y, { steps });
  if (!hold) { await page.mouse.up(); await settle(page, 3); }
}

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  const phone = page.viewportSize().width < 600;

  // ---------------- A1 (1) and (2): a first visit, planes first, the line off the axis ----------------
  await page.waitForFunction(() => window.__mv && window.__mv.lab, null, { timeout: 8000 });     // every module has loaded: the reload below aborts nothing
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.reload({ waitUntil: 'load' });
  await pause(page, 900);
  await labReady(page);
  await page.waitForFunction(() => window.__mv.lab && window.__mv.lab.frame().w.unitsAcross < 6, null, { timeout: 8000 });     // the w-plane has been framed
  const layout = await page.evaluate(() => {
    const top = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.top + window.scrollY; };
    const z = document.getElementById('lab-zplane-viewport'), after = (id) => !!(z.compareDocumentPosition(document.getElementById(id)) & Node.DOCUMENT_POSITION_FOLLOWING);
    const zc = document.getElementById('lab-zplane-canvas').getBoundingClientRect(), wc = document.getElementById('lab-wplane-canvas').getBoundingClientRect();
    return { zTop: top('lab-zplane-canvas'), toolbarTop: top('lab-toolbar'), fns: after('lab-fns'), more: after('lab-more'), pages: after('lab-pages'),
      zH: zc.height, zW: zc.width, bothInOneScreen: wc.bottom - zc.top };
  });
  assert(layout.zTop <= (phone ? 640 : 480), `A1(1): the z-plane canvas starts at ${layout.zTop.toFixed(0)} px`);
  assert(layout.toolbarTop < layout.zTop && layout.fns && layout.more && layout.pages, `A1(1): the toolbar, then the planes, then f, pages and More: ${JSON.stringify(layout)}`);
  if (phone) assert(layout.zH / layout.zW < 0.85 && layout.bothInOneScreen <= 720, `phone: 5:4 planes, so both fit one screen (${layout.bothInOneScreen.toFixed(0)} px): ${JSON.stringify(layout)}`);
  else assert(Math.abs(layout.zH - layout.zW) < 2, 'desktop: square planes');
  const fr = await page.evaluate(() => { const w = window.__mv.planes.get('lab-wplane'); return { gap: Math.abs(w.toPixel({ re: 0.5, im: 0 }).x - w.toPixel({ re: 0, im: 0 }).x), ua: w.getView().unitsAcross, centre: w.getView().center, size: w.getSize() }; });
  assert(fr.gap >= (phone ? 40 : 60), `A1(2): the line Re w = 1/2 is ${fr.gap.toFixed(1)} px from the v-axis`);
  assert(fr.ua <= 8, `A1(2): the w-plane is ${fr.ua.toFixed(2)} units across`);
  assert(Math.abs((await lab(page, 'frame')).w.unitsAcross - fr.ua) < 1e-12, 'frame() reports the w-plane view');
  log(`first picture: the line is ${fr.gap.toFixed(1)} px from the axis, ${fr.ua.toFixed(3)} units across, z canvas at ${layout.zTop.toFixed(0)} px`);
  await shot('first-visit');

  // ---------------- A1 (3): live ink while the stroke is drawn ----------------
  await clickChip(page, 'lab-tool-brush');
  const n0 = (await lab(page, 'shapes')).length;
  const ink0 = (await lab(page, 'stats')).inkFrames;
  await stroke(page, 'lab-zplane', { re: -1, im: 1 }, { re: 1, im: 1 }, { hold: true });
  await settle(page, 3);
  const d = await lab(page, 'draft');
  assert(d.active && d.tool === 'brush' && d.out >= 1 && d.inked === true, `A1(3): live ink mid-stroke: ${JSON.stringify(d)}`);
  await page.waitForFunction((n) => window.__mv.lab.stats().inkFrames > n, ink0, { timeout: 4000 });
  assert((await lab(page, 'stats')).inkFrames > ink0, 'A1(3): the ink was painted on the w-plane');
  assert(await page.evaluate(() => document.getElementById('lab-replay').disabled), 'Replay waits while a stroke is being drawn');
  await shot('live-ink');
  await page.mouse.up();
  await settle(page, 3);
  assert((await lab(page, 'shapes')).length === n0 + 1, 'A1(3): the stroke is kept');
  const d2 = await lab(page, 'draft');
  assert(!d2.active && d2.out === 0 && d2.inked === false, `after the release the draft is gone: ${JSON.stringify(d2)}`);

  // ---------------- A1 (4): Replay on one clock, a cursor on both planes ----------------
  const t0 = await lab(page, 't');
  await clickChip(page, 'lab-replay');
  await pause(page, 150);
  const r1 = await lab(page, 'replay');
  assert(r1.on && r1.t > 0 && r1.t < 1 && r1.cursor.z && r1.cursor.w, `A1(4): replaying: ${JSON.stringify(r1)}`);
  await pause(page, 250);
  const r2 = await lab(page, 'replay');
  assert(r2.on && r2.t > r1.t, `A1(4): the replay moves on: ${r1.t} to ${r2.t}`);
  assert(Math.abs((await lab(page, 't')) - r2.t) < 0.2, 'the clock follows the replay');
  await shot('replay');
  await page.waitForFunction(() => !window.__mv.lab.replay().on, null, { timeout: 4000 });
  const r3 = await lab(page, 'replay');
  assert(!r3.on && r3.cursor.z === null && r3.cursor.w === null && Math.abs((await lab(page, 't')) - t0) < 1e-9, `the replay ends at rest and gives the clock back: ${JSON.stringify(r3)}`);

  // the scrubber: a paused replay at a time of the student's choosing
  await setSlider(page, 'lab-replay-t', 0.5);
  const sc = await lab(page, 'replay');
  assert(!sc.on && Math.abs(sc.t - 0.5) < 1e-9 && sc.cursor.z && sc.cursor.w, `the scrubber pauses the replay at 0.5: ${JSON.stringify(sc)}`);
  assert(Math.abs((await lab(page, 't')) - 0.5) < 1e-9, 'and the clock goes with it');
  await setSlider(page, 'lab-replay-t', 1);
  const sc1 = await lab(page, 'replay');
  assert(!sc1.on && sc1.cursor.z === null && Math.abs((await lab(page, 't')) - t0) < 1e-9, 'the scrubber at 1 is rest again');

  // reduced motion: a stepper
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.getElementById('lab-replay').textContent === 'Step the replay', null, { timeout: 4000 });
  assert((await readText(page, '#lab-replay')) === 'Step the replay', 'reduced motion: the label says it steps');
  await clickChip(page, 'lab-replay');
  const s1 = await lab(page, 'replay');
  assert(!s1.on && Math.abs(s1.t - 0.1) < 1e-9 && s1.cursor.z && s1.cursor.w, `reduced motion: one press, one step: ${JSON.stringify(s1)}`);
  await clickChip(page, 'lab-replay');
  assert(Math.abs((await lab(page, 'replay')).t - 0.2) < 1e-9, 'reduced motion: the next press is the next step');
  for (let i = 0; i < 8; i++) await clickChip(page, 'lab-replay');
  const sEnd = await lab(page, 'replay');
  assert(!sEnd.on && sEnd.t === 1 && sEnd.cursor.z === null, `reduced motion: the tenth press ends the replay: ${JSON.stringify(sEnd)}`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.getElementById('lab-replay').textContent === 'Replay my stroke', null, { timeout: 4000 });
  assert((await readText(page, '#lab-replay')) === 'Replay my stroke', 'the label comes back');

  // Escape stops a replay from anywhere and gives the clock back; the button says why it waits
  await clickChip(page, 'lab-replay');
  await pause(page, 200);
  await page.keyboard.press('Escape');
  const esc = await lab(page, 'replay');
  assert(!esc.on && esc.cursor.z === null && Math.abs((await lab(page, 't')) - t0) < 1e-9, `Escape ends the replay: ${JSON.stringify(esc)}`);
  assert((await page.getAttribute('#lab-replay', 'title')).startsWith('Draw the last shape'), 'the Replay button explains itself');

  // a replay is dropped by Play, by the clock and by an edit
  await clickChip(page, 'lab-replay');
  await pause(page, 200);
  await clickChip(page, 'lab-play');
  assert(!(await lab(page, 'replay')).on, 'Play ends the replay');
  await clickChip(page, 'lab-play');
  await clickChip(page, 'lab-replay');
  await pause(page, 200);
  await setSlider(page, 'lab-t', 0.7);
  assert(!(await lab(page, 'replay')).on && Math.abs((await lab(page, 't')) - 0.7) < 1e-9, 'the Time t slider ends the replay and keeps its own value');
  await setSlider(page, 'lab-t', 0.4);
  // a new f, a new gesture or an edit that ends a replay gives the clock back as well (review issue 7): t is not left wherever the replay was
  await setSlider(page, 'lab-t', 0.3);
  await clickChip(page, 'lab-replay');
  await pause(page, 300);
  const midT = await lab(page, 't');
  assert((await lab(page, 'replay')).on && Math.abs(midT - 0.3) > 0.02, `the clock follows the replay (t = ${midT})`);
  await clickChip(page, 'lab-fn-sq');
  const afterFn = await lab(page, 'replay');
  assert(!afterFn.on && afterFn.cursor.z === null && Math.abs((await lab(page, 't')) - 0.3) < 1e-9, `a new f ends the replay and the clock goes back to 0.3: ${JSON.stringify(afterFn)}, t = ${await lab(page, 't')}`);
  await clickChip(page, 'lab-fn-recip');
  await clickChip(page, 'lab-replay');
  await pause(page, 300);
  assert((await lab(page, 'replay')).on, 'a second replay is running');
  await stroke(page, 'lab-zplane', { re: -2, im: -2 }, { re: -1.5, im: -2 }, { steps: 3 });
  const afterDraw = await lab(page, 'replay');
  assert(!afterDraw.on && Math.abs((await lab(page, 't')) - 0.3) < 1e-9, `a new stroke ends the replay and the clock goes back to 0.3: ${JSON.stringify(afterDraw)}, t = ${await lab(page, 't')}`);
  await setSlider(page, 'lab-t', 0.4);

  // ---------------- A1 (5): pages ----------------
  const savedCount = (await lab(page, 'shapes')).length;
  await page.fill('#lab-page-name', 'my stroke');
  await page.click('#lab-page-save');
  await settle(page, 2);
  assert((await readText(page, '#lab-page-open-0')).includes('my stroke'), 'A1(5): the page is listed');
  const pg = JSON.parse(await stored(page, 'mv:lab.pages'));
  assert(pg.length === 1 && pg[0].shapes.length >= 1 && pg[0].name === 'my stroke' && pg[0].fn.id === 'recip', `A1(5): stored once: ${JSON.stringify(pg).slice(0, 160)}`);
  assert((await readText(page, '#lab-pages-toggle')) === 'Pages (1)' && (await lab(page, 'pages')).length === 1, 'the summary counts the pages and pages() reports them');
  await clickChip(page, 'lab-clear');
  assert((await lab(page, 'shapes')).length === 0, 'A1(5): cleared');
  assert(await page.evaluate(() => document.getElementById('lab-page-save').disabled) && !(await page.isEnabled('#lab-replay')), 'with nothing drawn, Save and Replay wait');
  assert((await page.getAttribute('#lab-replay', 'title')) === 'Draw something first.', 'and Replay says what it waits for');
  await clickChip(page, 'lab-page-open-0');
  assert((await lab(page, 'shapes')).length === savedCount && (await lab(page, 'fn')).id === 'recip', 'A1(5): the page comes back, with its function');
  await clickChip(page, 'lab-undo');
  assert((await lab(page, 'shapes')).length === 0, 'Undo takes the opened page away again');
  // a second page, newest first, a typed function and the 20-page limit
  await clickChip(page, 'lab-page-open-0');
  await page.fill('#lab-fn-src', 'z^2 + iz');
  await page.click('#lab-fn-apply');
  await page.fill('#lab-page-name', '  second   page ');
  await page.press('#lab-page-name', 'Enter');
  await settle(page, 2);
  assert((await readText(page, '#lab-page-open-0')).includes('second page') && (await readText(page, '#lab-page-open-1')).includes('my stroke'), 'newest first, the name tidied');
  await clickChip(page, 'lab-page-delete-1');
  assert((await page.evaluate(() => document.getElementById('lab-page-list').children.length)) === 1 && await page.isVisible('#lab-page-restore'), 'a page is deleted and can be put back');
  await clickChip(page, 'lab-page-restore');
  assert((await page.evaluate(() => document.getElementById('lab-page-list').children.length)) === 2, 'Put it back');
  await clickChip(page, 'lab-page-open-0');
  assert((await lab(page, 'fn')).src === 'z^2 + iz', 'a typed function is kept by a page');
  await page.evaluate(() => {
    const mk = (i) => ({ name: 'p' + i, savedAt: i + 1, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'verticalLine', x: 1 }] });
    localStorage.setItem('mv:lab.pages', JSON.stringify(Array.from({ length: 20 }, (_, i) => mk(i))));
  });
  await page.reload({ waitUntil: 'load' });
  await pause(page, 900);
  await labReady(page);
  assert((await lab(page, 'pages')).length === 20, 'twenty stored pages are read back');
  await page.fill('#lab-page-name', 'one too many');
  await page.click('#lab-page-save');
  assert((await readText(page, '#lab-page-status')).includes('20 pages is the limit') && (await lab(page, 'pages')).length === 20, 'the 21st page is refused and says why');
  for (let i = 0; i < 20; i++) await page.click('#lab-page-delete-0');
  assert((await page.evaluate(() => document.getElementById('lab-page-list').children.length)) === 0 && await page.isVisible('#lab-page-empty'), 'A1(5): the list is empty');
  assert(JSON.parse(await stored(page, 'mv:lab.pages')).length === 0, 'and the store agrees');
  // a damaged store entry is simply no pages
  await page.evaluate(() => localStorage.setItem('mv:lab.pages', '{"not":"an array"}'));
  await page.reload({ waitUntil: 'load' });
  await pause(page, 900);
  await labReady(page);
  assert((await lab(page, 'pages')).length === 0, 'a damaged page store is no pages, and no error');

  // ---------------- A1 (6): the problem panel carries the two decisions ----------------
  await openDetails(page, 'lab-more');
  await clickChip(page, 'lab-preset-circle1-load');
  const ch = await page.evaluate(() => ({ shown: !document.getElementById('lab-problem').hidden,
    names: !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="names"][data-value="any"]'),
    address: !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="address"][data-value="P"]'),
    ids: [document.getElementById('lab-problem-address') && 1, document.getElementById('lab-problem-names') && 1] }));
  assert(ch.shown && ch.names && ch.address && ch.ids.every(Boolean), `A1(6): the two decision chips: ${JSON.stringify(ch)}`);
  await clickChip(page, 'lab-problem-names');
  assert((await readText(page, '#lab-problem-meaning')).startsWith('Any name of the angle works'), 'tapping the Names chip says what it means');
  await clickChip(page, 'lab-preset-x2-load');
  assert(await page.evaluate(() => document.getElementById('lab-problem').dataset.problem === '2.1.2' && !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="address"][data-value="C"]') && !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="names"][data-value="none"]')), 'the chips follow the problem (2.1.2: Cartesian, names none)');

  // ---------------- the break in the image, said in words, while the replay passes it ----------------
  await clickChip(page, 'lab-preset-circle1-load');
  await setSlider(page, 'lab-replay-t', 0.25);
  assert((await readText(page, '#lab-replay-note')) === '', 'before the break there is nothing to explain');
  await setSlider(page, 'lab-replay-t', 0.8);
  assert((await readText(page, '#lab-replay-note')).startsWith('The image has a break.'), 'after the break the replay says why there is one');
  const gapR = await lab(page, 'replay');
  assert(gapR.cursor.z && gapR.cursor.w, 'at 0.8 both cursors are on');
  await setSlider(page, 'lab-replay-t', 0.5);
  const inGap = await lab(page, 'replay');
  assert(inGap.cursor.z && inGap.cursor.w === null, `at t = 1/2, z = 0 and w is nowhere: ${JSON.stringify(inGap)}`);
  await setSlider(page, 'lab-replay-t', 1);

  // ---------------- live ink in the other views and for other tools ----------------
  await clickChip(page, 'lab-clear');
  await clickChip(page, 'lab-tool-rect');
  await stroke(page, 'lab-zplane', { re: -1, im: 0.5 }, { re: 0.5, im: 1.5 }, { hold: true });
  await settle(page, 3);
  const dr = await lab(page, 'draft');
  assert(dr.active && dr.tool === 'rect' && dr.out >= 1 && dr.inked, `a rectangle being dragged out is inked on the w-plane too: ${JSON.stringify(dr)}`);
  await page.mouse.up();
  await settle(page, 3);
  await clickChip(page, 'lab-undo');
  await clickChip(page, 'lab-view-morph');
  await stroke(page, 'lab-zplane', { re: -1, im: 0.5 }, { re: 0.5, im: 1.5 }, { hold: true });
  await settle(page, 3);
  const dm = await lab(page, 'draft');
  assert(dm.active && dm.out >= 1 && dm.inked, `in the morph view the draft image is inked on the morph plane: ${JSON.stringify(dm)}`);
  await page.mouse.up();
  await settle(page, 3);
  // Replay in the morph view slides the plane, then gives the slider back
  await setSlider(page, 'lab-s', 0.25);
  await clickChip(page, 'lab-replay');
  await page.waitForFunction(() => { const s = window.__mv.lab.s(); return s > 0.05 && s < 0.99; }, null, { timeout: 3000 });
  const sMid = await lab(page, 's');
  assert(sMid > 0.05 && sMid < 0.99, `the morph slides while the stroke replays: s = ${sMid}`);
  await page.waitForFunction(() => !window.__mv.lab.replay().on, null, { timeout: 4000 });
  assert(Math.abs((await lab(page, 's')) - 0.25) < 1e-9, 'and the slider is given back');
  // leaving the morph view in the middle of a replay: the slider is given back all the same (review issue 7)
  await clickChip(page, 'lab-replay');
  await page.waitForFunction(() => { const s = window.__mv.lab.s(); return s > 0.05 && s < 0.99; }, null, { timeout: 3000 });
  await clickChip(page, 'lab-view-side');
  await page.waitForFunction(() => !window.__mv.lab.replay().on, null, { timeout: 4000 });
  assert(Math.abs((await lab(page, 's')) - 0.25) < 1e-9, `the Morph s slider comes back although the replay ended in the side view: s = ${await lab(page, 's')}`);
  await clickChip(page, 'lab-view-side');
  // predict first: no ink, no replay, nothing of the image
  await clickChip(page, 'lab-predict');
  const dp0 = await lab(page, 'draft');
  await stroke(page, 'lab-zplane', { re: -1, im: 0.5 }, { re: 0.5, im: 1.5 }, { hold: true });
  await settle(page, 3);
  const dp = await lab(page, 'draft');
  assert(dp.active && dp.out === 0 && dp.inked === false, `while predicting the image is not inked: ${JSON.stringify(dp)} (before ${JSON.stringify(dp0)})`);
  await page.mouse.up();
  await settle(page, 3);
  assert(await page.evaluate(() => document.getElementById('lab-replay').disabled), 'while predicting Replay waits');
  await clickChip(page, 'lab-predict');
  assert(await page.isEnabled('#lab-replay'), 'and is back when Predict first is off');
  // the 3D views: the replay clock moves the markers (the scrubber is the deterministic way: WebGL frames are slow in the harness) and gives the clock back
  await clickChip(page, 'lab-view-landscape');
  const tb = await lab(page, 't');
  await setSlider(page, 'lab-replay-t', 0.7);
  const r3d = await lab(page, 'replay');
  assert(!r3d.on && Math.abs((await lab(page, 't')) - 0.7) < 1e-9 && r3d.cursor.z, `the landscape markers follow the replay clock: ${JSON.stringify(r3d)}`);
  await setSlider(page, 'lab-replay-t', 1);
  assert(Math.abs((await lab(page, 't')) - tb) < 1e-9, 'and the clock comes back');
  await clickChip(page, 'lab-view-side');

  // ---------------- a finite picture near a pole is shown whole (review issue 1) ----------------
  // Drawn at a quarter-unit from the origin (the snap grid makes this an ordinary gesture), each of these is a finite circle a few units across under 1/z.
  // The frame of a picture that runs to infinity crops to 3.2 units; these must not be cropped: every finite image point is inside the auto-framed view.
  await clickChip(page, 'lab-fn-recip');
  assert((await lab(page, 'fn')).id === 'recip', 'f is 1/z');
  const offScreen = () => page.evaluate(() => {
    const w = window.__mv.planes.get('lab-wplane'), v = w.getView(), sz = w.getSize(), halfW = v.unitsAcross / 2, halfH = halfW * sz.h / sz.w;
    let n = 0, out = 0;
    for (const pc of window.__mv.lab.images()) for (const p of pc.points) {
      if (!Number.isFinite(p.re) || !Number.isFinite(p.im)) continue;
      n++;
      if (Math.abs(p.re - v.center.re) > halfW + 1e-9 || Math.abs(p.im - v.center.im) > halfH + 1e-9) out++;
    }
    return { n, out, ua: v.unitsAcross, shapes: window.__mv.lab.shapes().length };
  });
  const near = [
    ['the line x = 1/4', 'lab-tool-line', { re: 0.25, im: -3 }, { re: 0.25, im: 3 }],
    ['the circle of centre 1, radius 3/4', 'lab-tool-circle', { re: 1, im: 0 }, { re: 1.75, im: 0 }],
    ['the rectangle 1/4 to 5/4 by -1/2 to 1/2', 'lab-tool-rect', { re: 0.25, im: -0.5 }, { re: 1.25, im: 0.5 }],
  ];
  for (const [name, tool, a, b] of near) {
    await clickChip(page, 'lab-clear');
    await clickChip(page, tool);
    await stroke(page, 'lab-zplane', a, b, { steps: 6 });
    await pause(page, 200);
    await settle(page, 4);
    const o = await offScreen();
    assert(o.shapes === 1 && o.n >= 100 && o.out === 0, `${name} under 1/z: ${o.out} of ${o.n} image points are off the w-plane (${o.ua.toFixed(2)} units across)`);
    log(`${name}: all ${o.n} image points inside the w-plane, ${o.ua.toFixed(2)} units across`);
  }
  await shot('near-pole-finite');
  await clickChip(page, 'lab-clear');
  await clickChip(page, 'lab-preset-circle1-load');            // and the circle through the pole is still framed on its bulk
  await settle(page, 4);
  const through = await offScreen();
  assert(through.ua <= 8 && through.out > 0, `the circle through 0 keeps the pole frame: ${JSON.stringify(through)}`);

  // ---------------- the rest of the page ----------------
  assert((await nowhere(page)) <= 1, 'no horizontal overflow');
  assert(await page.evaluate(() => !!document.getElementById('lab-toolbar') && document.getElementById('lab-tools').closest('#lab-toolbar') !== null), '#lab-toolbar holds the tools');
  log('lab diary checks passed');
}
