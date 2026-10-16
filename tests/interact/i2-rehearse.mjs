// tests/interact/i2-rehearse.mjs: the Rehearsal Room, driven with real pointer events (acceptance A1, A2, A6 of i2-rehearse).
//   node tools/smoke.mjs --route rehearse-1-4-2-s7 --script tests/interact/i2-rehearse.mjs --dark --out docs/review/iter-2/i2-rehearse
//   node tools/smoke.mjs --route rehearse-2-5-1-s3,rehearse-P5-s1,rehearse,rehearse-nonsense --script tests/interact/i2-rehearse.mjs --dark --no-shots
// One default export that dispatches on ctx.route. A fresh browser context per run means a fresh store.
//   rehearse-1-4-2-s7   set up, guess (four drags), reveal, the verdict, the answer, the explainer, open the station, a wrong Address, the keyboard
//   rehearse-2-5-1-s3   reveal without a guess, open the Lab (predict first)
//   rehearse-P5-s1      a choice card: radio chips, scores and ticks persist, Another gives a new seed
//   rehearse            the default card is the type you need most; a type chip
//   rehearse-nonsense   the default card and a note, never the under-construction panel; the note goes once the student moves on
//   rehearse-2-1-3-s3   the image line: the explainer's closest point is the foot of the perpendicular from 0
//   rehearse-1-5-2-s1   a 320 px phone: no horizontal overflow before or after Reveal

import { dragHandle, clickChip, settle, readText } from './_helpers.mjs';

export const expectedErrors = [];

export default async function (page, ctx) {
  const { assert, log, viewport } = ctx;
  const phone = viewport.width < 600;
  const q = (id) => `[id="${id}"]`;
  const attr = (sel, name) => page.evaluate(([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null; }, [sel, name]);
  const visible = (sel) => page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e || e.hidden) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }, sel);
  const exists = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  const noOverflow = async (what) => {
    const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    assert(w.sw <= w.iw + 1, `${what}: no horizontal overflow (${w.sw} > ${w.iw})`);
  };
  const getCard = (id, seed) => page.evaluate(({ id, seed }) => import('./js/data/generators.js').then((m) => m.generate(id, seed)), { id, seed });
  const waitCard = (id, seed) => page.waitForSelector(`#rehearse-card[data-problem="${id}"][data-seed="${seed}"]`, { timeout: 5000 });
  const go = async (route) => { await page.evaluate((r) => { location.hash = r; }, route); await page.waitForTimeout(500); await settle(page, 2); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const stored = (key) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem('mv:' + k)); } catch (e) { return null; } }, key);
  const readout = () => readText(page, '#rehearse-readout');

  // ======================================================================== A1: the pinned 1.4.2 card
  if (ctx.route === 'rehearse-1-4-2-s7') {
    await waitCard('1.4.2', 7);
    assert((await attr('#rehearse-card', 'data-revealed')) === 'false', 'A1 the card starts unrevealed');
    assert(!(await visible('#rehearse-place')), 'A1 the place is hidden before Reveal (predict first)');
    const r0 = await readout();
    assert(r0.includes('type 1.4.2; seed 7') && r0.includes('revealed: no') && r0.includes('decisions: not set; guess: none'), `A1 readout before any action: "${r0}"`);
    for (let k = 0; k < 4; k++) assert(await exists(q(`rehearse-plane-g${k}`)), `A1 handle g${k} exists`);
    assert(!(await exists(q('rehearse-plane-g4'))), 'A1 there is no fifth handle');
    assert(!(await visible('#rehearse-choice')), 'A1 a roots card has no choice chips');
    await noOverflow('A1 before Reveal');
    assert((await attr('#rehearse-card', 'data-tone')) === null, 'A1 the top bar does not name the place before Reveal (no data-tone)');
    assert(await visible('#rehearse-reveal-hint'), 'A1 the instruction under Reveal shows before Reveal');
    const card = await getCard('1.4.2', 7);
    assert(same(card.given, { c: { re: -81, im: 0 }, n: 4 }), `A1 the card is the 4th roots of -81: ${JSON.stringify(card.given)}`);
    await clickChip(page, 'rehearse-decisions-address-p-c');
    await clickChip(page, 'rehearse-decisions-names-all');
    assert((await readout()).includes('decisions: P→C / all'), `A1 readout after the two chips: "${await readout()}"`);
    for (let k = 0; k < 4; k++) await dragHandle(page, `rehearse-plane-g${k}`, card.answer.values.roots[k]);
    const r1 = await readout();
    assert(r1.includes('guess: 4 points') && r1.includes('decisions: P→C / all'), `A1 readout after four drags: "${r1}"`);
    await ctx.shot('guessed');
    await clickChip(page, 'rehearse-reveal');
    const V = '#rehearse-verdict';
    assert((await attr(V, 'data-address')) === 'right' && (await attr(V, 'data-names')) === 'right' && (await attr(V, 'data-guess')) === 'right' && (await attr(V, 'data-right')) === 'true',
      `A1 the verdict: ${await attr(V, 'data-address')}/${await attr(V, 'data-names')}/${await attr(V, 'data-guess')}/${await attr(V, 'data-right')}`);
    assert((await readText(page, '#rehearse-answer-text')) === card.answer.text, 'A1 the ASCII answer is the card\'s answer.text');
    assert((await visible('#rehearse-place')) && (await readText(page, '#rehearse-place')).includes('Roots'), `A1 the place names Roots: "${await readText(page, '#rehearse-place')}"`);
    assert((await attr('#rehearse-ex-same', 'data-agree')) === 'true', 'A1 the two routes agree');
    assert((await visible('#rehearse-open-station')) && (await readText(page, '#rehearse-open-station')).includes('Roots'), 'A1 the open button names Roots');
    assert((await page.locator('#rehearse-steps li').count()) === 4, 'A1 four step rows');
    assert(!(await exists(q('rehearse-plane-g0'))), 'A1 the guess handles are gone');
    assert(await page.evaluate(() => !!window.__mv.planes.get('rehearse-plane')), 'A1 the picture plane has the same id');
    const sc = await page.evaluate(() => { const e = document.getElementById('rehearse-score-1-4-2'); return { t: e.dataset.tried, r: e.dataset.right }; });
    assert(sc.t === '1' && sc.r === '1', `A1 the score cell: ${JSON.stringify(sc)}`);
    assert((await stored('progress'))['1.4.2'] === true, 'A1 a right card ticks the problem');
    assert((await stored('rehearse.scores'))['1.4.2'].right === 1, 'A1 the score is stored');
    for (const side of ['cart', 'polar']) {
      const t = await attr(q(`rehearse-ex-radius-${side}`), 'data-tex');
      assert(/= 3$/.test(t), `A1 the radius cell in ${side} ends = 3: "${t}"`);
    }
    assert(['cart', 'polar', 'accent'].includes(await attr('#rehearse-card', 'data-tone')), 'A1 the top bar takes its tone at Reveal');
    assert(!(await visible('#rehearse-reveal-hint')), 'A1 the "set both decisions" instruction is gone after Reveal');
    assert((await readText(page, '#rehearse-aha')).startsWith("The aha, on the handout's numbers."), `A1 the aha says whose numbers it quotes: "${await readText(page, '#rehearse-aha')}"`);
    assert(!/ <= | >= /.test(await readText(page, '#rehearse-worked-cart')), 'A1 no ASCII comparison in the worked route');
    assert((await readout()).includes('revealed: yes'), 'A1 readout says revealed');
    assert((await attr('#rehearse-readout', 'aria-live')) === 'polite', 'A1 the readout is polite after Reveal');
    assert((await page.evaluate(() => document.activeElement && document.activeElement.id)) === 'rehearse-verdict', 'A1 the verdict takes focus');
    const dup = await page.evaluate(() => { const seen = new Map(); for (const e of document.querySelectorAll('[id]')) seen.set(e.id, (seen.get(e.id) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([k]) => k); });
    assert(dup.length === 0, `A1 no duplicate ids: ${dup.join(', ')}`);
    await noOverflow('A1 after Reveal');
    await ctx.shot('revealed');
    log('A1 set up, guessed and revealed');

    // the station with these numbers
    await clickChip(page, 'rehearse-open-station');
    await page.waitForFunction(() => location.hash === '#roots', null, { timeout: 800 });
    await page.waitForFunction(() => window.__mv.app.state() === 'ready' && window.__mv.app.preset() !== null, null, { timeout: 3000 });   // the router sets the preset once the module has loaded
    const preset = await page.evaluate(() => window.__mv.app.preset());
    assert(same(preset, { kind: 'values', station: 'roots', problem: '1.4.2', family: '1.4.2', values: card.values }), `A1 the station is given the numbers: ${JSON.stringify(preset)}`);
    log('A1 the station opens with the numbers');

    // a wrong Address
    await go('rehearse-1-4-2-s7');
    await waitCard('1.4.2', 7);
    assert((await attr('#rehearse-card', 'data-revealed')) === 'false', 'A1 coming back gives the same card, unrevealed');
    await clickChip(page, 'rehearse-decisions-address-c');
    await clickChip(page, 'rehearse-reveal');
    assert((await attr(V, 'data-address')) === 'wrong' && (await attr(V, 'data-names')) === 'skipped' && (await attr(V, 'data-guess')) === 'skipped' && (await attr(V, 'data-right')) === 'false', 'A1 a wrong Address is wrong, the rest skipped');
    assert((await readText(page, '#rehearse-decisions-status')).includes('Address: wrong'), `A1 the picker says Address: wrong: "${await readText(page, '#rehearse-decisions-status')}"`);
    const sc2 = await page.evaluate(() => { const e = document.getElementById('rehearse-score-1-4-2'); return { t: e.dataset.tried, r: e.dataset.right }; });
    assert(sc2.t === '2' && sc2.r === '1', `A1 the second card is tried, not right: ${JSON.stringify(sc2)}`);
    log('A1 a wrong Address is marked wrong');

    // the keyboard moves a handle
    await go('rehearse-1-4-1-s2');
    const c141 = await getCard('1.4.1', 2);
    await waitCard('1.4.1', 2);
    await page.focus('#rehearse-plane-g0');
    const re0 = Number(await attr('#rehearse-plane-g0', 'data-re'));
    await page.keyboard.press('ArrowRight');
    await settle(page);
    const re1 = Number(await attr('#rehearse-plane-g0', 'data-re'));
    assert(re1 > re0, `A1 ArrowRight moves a focused handle (${re0} to ${re1})`);
    assert((await readout()).includes(`guess: ${c141.sketch.n} points`), `A1 a nudge makes a guess: "${await readout()}"`);
    const step = re1 - re0;
    await page.focus('#rehearse-plane-g1');
    const b0 = Number(await attr('#rehearse-plane-g1', 'data-im'));
    await page.keyboard.press('Shift+ArrowUp');
    await settle(page);
    const b1 = Number(await attr('#rehearse-plane-g1', 'data-im'));
    assert(Math.abs((b1 - b0) - 10 * step) < 1e-6, `A1 Shift moves ten times as far (${b1 - b0} against ${10 * step})`);
    log('A1 the keyboard moves a handle');
  }

  // ======================================================================== A2: the Lab, with predict first
  if (ctx.route === 'rehearse-2-5-1-s3') {
    await waitCard('2.5.1', 3);
    await clickChip(page, 'rehearse-decisions-address-p');
    await clickChip(page, 'rehearse-decisions-names-any');
    await clickChip(page, 'rehearse-reveal');
    const V = '#rehearse-verdict';
    assert((await attr(V, 'data-guess')) === 'skipped' && (await attr(V, 'data-address')) === 'right' && (await attr(V, 'data-names')) === 'right' && (await attr(V, 'data-right')) === 'true',
      `A2 reveal without a guess: ${await attr(V, 'data-address')}/${await attr(V, 'data-names')}/${await attr(V, 'data-guess')}/${await attr(V, 'data-right')}`);
    assert(await visible('#rehearse-open-lab'), 'A2 the Lab button shows for an image type');
    assert((await attr('#rehearse-ex-same', 'data-agree')) === 'true', 'A2 the two routes agree');
    assert((await readText(page, '#rehearse-place')).includes('1/z and the Sphere'), `A2 the place: "${await readText(page, '#rehearse-place')}"`);
    await noOverflow('A2 after Reveal');
    await ctx.shot('revealed');
    await clickChip(page, 'rehearse-open-lab');
    await page.waitForFunction(() => location.hash === '#lab', null, { timeout: 1500 });
    await page.waitForFunction(() => window.__mv.lab && window.__mv.lab.fn().id === 'recip' && window.__mv.lab.answerHidden() === true, null, { timeout: 1500 });
    log('A2 the Lab opens with 1/z and the image hidden (predict first)');
  }

  // ======================================================================== A2: a choice card, scores, Another
  if (ctx.route === 'rehearse-P5-s1') {
    await waitCard('P5', 1);
    for (let k = 0; k < 4; k++) assert((await attr(q(`rehearse-choice-${k}`), 'role')) === 'radio', `A2 choice chip ${k} is a radio`);
    assert(!(await visible('#rehearse-plane-host')) && !(await exists(q('rehearse-plane-g0'))), 'A2 a choice card has no plane before Reveal');
    const card = await getCard('P5', 1);
    const right = card.sketch.correct;
    assert(right === 3, `A2 the pinned card's correct index is 3, got ${right}`);
    await clickChip(page, `rehearse-choice-${right}`);
    assert((await attr(q(`rehearse-choice-${right}`), 'aria-checked')) === 'true', 'A2 the chosen chip is checked');
    for (let k = 0; k < 4; k++) if (k !== right) assert((await attr(q(`rehearse-choice-${k}`), 'aria-checked')) === 'false', `A2 chip ${k} is not checked`);
    await clickChip(page, 'rehearse-decisions-address-p');
    await clickChip(page, 'rehearse-decisions-names-any');
    assert((await readout()).includes('guess: choice 3'), `A2 readout: "${await readout()}"`);
    await clickChip(page, 'rehearse-reveal');
    const V = '#rehearse-verdict';
    assert((await attr(V, 'data-address')) === 'right' && (await attr(V, 'data-names')) === 'right' && (await attr(V, 'data-guess')) === 'right', 'A2 all three right');
    assert((await attr(q('rehearse-score-P5'), 'data-right')) === '1' && (await attr(q('rehearse-score-P5'), 'data-tried')) === '1', 'A2 the P5 score cell');
    assert((await stored('rehearse.scores')).P5.right === 1 && (await stored('progress')).P5 === true, 'A2 the score and the tick are stored');
    assert((await attr(q(`rehearse-choice-${right}`), 'data-mark')) === 'right', 'A2 the correct chip is marked');
    assert(await visible('#rehearse-plane-host'), 'A2 the picture plane appears at Reveal');
    await noOverflow('A2 P5 after Reveal');
    await ctx.shot('revealed');
    await clickChip(page, 'rehearse-another');
    assert((await attr('#rehearse-card', 'data-seed')) !== '1' && (await attr('#rehearse-card', 'data-revealed')) === 'false', 'A2 Another gives a new seed and an unrevealed card');
    assert(!(await visible(V)), 'A2 the verdict is gone');
    assert((await attr(q('rehearse-decisions-address-p'), 'aria-pressed')) === 'false', 'A2 the picker is cleared');
    const hash = await page.evaluate(() => location.hash);
    assert(/^#rehearse-P5-s\d+$/.test(hash), `A2 the address bar follows the card: ${hash}`);
    const dup = await page.evaluate(() => { const seen = new Map(); for (const e of document.querySelectorAll('[id]')) seen.set(e.id, (seen.get(e.id) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([k]) => k); });
    assert(dup.length === 0, `A2 no duplicate ids after Another: ${dup.join(', ')}`);
    // a wrong pick: the pick and the answer stay in the tab order, the others leave it
    {
      const c2 = await page.evaluate(() => window.__mv.rehearse.card().sketch.correct);
      const wrong = (c2 + 1) % 4;
      await clickChip(page, `rehearse-choice-${wrong}`);
      await clickChip(page, 'rehearse-reveal');
      const tabs = await page.evaluate(() => [0, 1, 2, 3].map((k) => document.getElementById('rehearse-choice-' + k).tabIndex));
      const want = [0, 1, 2, 3].map((k) => (k === c2 || k === wrong ? 0 : -1));
      assert(same(tabs, want), `A2 after a wrong pick the chosen and the correct chip are tab stops: ${JSON.stringify(tabs)} wanted ${JSON.stringify(want)}`);
      assert((await attr(q(`rehearse-choice-${wrong}`), 'data-mark')) === 'wrong' && (await attr(q(`rehearse-choice-${c2}`), 'data-mark')) === 'right', 'A2 the pick is marked wrong and the answer right');
      await clickChip(page, 'rehearse-another');
    }
    // keyboard on the radio group: ArrowDown moves the selection
    await page.focus('#rehearse-choice-0');
    await page.keyboard.press('ArrowDown');
    await settle(page);
    assert((await attr(q('rehearse-choice-1'), 'aria-checked')) === 'true', 'A2 ArrowDown selects the next answer');
    log('A2 a choice card, its scores and Another');
  }

  // ======================================================================== A2: the default card
  if (ctx.route === 'rehearse') {
    await page.waitForSelector('#rehearse-card[data-problem="1.1.1"]', { timeout: 5000 });
    assert((await attr('#rehearse-type-1-1-1', 'aria-pressed')) === 'true', 'A2 the 1.1.1 chip is pressed');
    assert((await readText(page, '#rehearse-score-line')) === 'Nothing rehearsed yet. The first card is the type you need most.', 'A2 the score line of a fresh store');
    assert((await readText(page, '#rehearse-next-type')).includes('1.1.1'), 'A2 the next type is 1.1.1');
    assert(/^#rehearse-1-1-1-s\d+$/.test(await page.evaluate(() => location.hash)), 'A2 the bar is rewritten to a pinned seed');
    await clickChip(page, 'rehearse-type-2-4-1');
    assert((await attr('#rehearse-card', 'data-problem')) === '2.4.1' && /^#rehearse-2-4-1-s\d+$/.test(await page.evaluate(() => location.hash)), 'A2 a type chip opens a card of that type');
    assert((await attr('#rehearse-card', 'data-kind')) === 'choice' && !(await exists(q('rehearse-plane-g0'))), 'A2 2.4.1 is a choice card with no handles');
    assert(await exists('#rehearse-decisions'), 'A2 the picker is there');
    await noOverflow('A2 default card');
    await ctx.shot('card');
    log('A2 the default card is the type you need most');
  }

  // ======================================================================== A5: an unknown token
  if (ctx.route === 'rehearse-nonsense') {
    await page.waitForSelector('#rehearse-card', { timeout: 5000 });
    assert(await visible('#rehearse-note'), 'A5 the unknown token shows a note');
    assert((await readText(page, '#rehearse-note')).includes('There is no card called "nonsense"'), `A5 the note: "${await readText(page, '#rehearse-note')}"`);
    assert(!(await exists('[data-station-error]')), 'A5 never the under-construction panel');
    await clickChip(page, 'rehearse-another');
    assert(!(await visible('#rehearse-note')), 'A5 the note is gone once the student moves to another card');
    log('A5 an unknown token gives the default card and a note');
  }

  // ======================================================================== the image line of 2.1.3: the closest point to 0 is the foot
  if (ctx.route === 'rehearse-2-1-3-s3') {
    await waitCard('2.1.3', 3);
    await clickChip(page, 'rehearse-reveal');
    const label = await page.evaluate(() => { const e = document.querySelector('#rehearse-ex-host tr[data-row="point"] .ex-label'); return e ? e.textContent.trim() : null; });
    assert(label === 'closest point to 0', `2.1.3 the row label: "${label}"`);
    const want = await page.evaluate(async () => {
      const [G, CX] = await Promise.all([import('./js/data/generators.js'), import('./js/core/complex.js')]);
      const T = G.generate('2.1.3', 3).answer.values.target;
      const t = -(T.point.re * T.dir.re + T.point.im * T.dir.im);               // project 0 onto the line through T.point along T.dir
      const foot = { re: T.point.re + t * T.dir.re, im: T.point.im + t * T.dir.im };
      const clean = (x) => (Math.abs(x) < 1e-9 ? 0 : x);
      return { tex: CX.texCart({ re: clean(foot.re), im: clean(foot.im) }), foot, point: T.point };
    });
    const got = await attr(q('rehearse-ex-point-cart'), 'data-tex');
    assert(got === want.tex, `2.1.3 the closest point is the foot: ${got} wanted ${want.tex} (the card's own point on the line is ${JSON.stringify(want.point)})`);
    assert(Math.abs(want.foot.re + 3.5) < 1e-9 && Math.abs(want.foot.im + 3.5) < 1e-9, `2.1.3 seed 3 has the foot -3.5 - 3.5i: ${JSON.stringify(want.foot)}`);
    assert((await attr('#rehearse-ex-same', 'data-agree')) === 'true', '2.1.3 the two routes agree');
    await noOverflow('2.1.3 after Reveal');
    await ctx.shot('revealed');
    log('2.1.3 the closest point is the foot of the perpendicular');
  }

  // ======================================================================== a 320 px phone
  if (ctx.route === 'rehearse-1-5-2-s1') {
    const was = page.viewportSize();
    await page.setViewportSize({ width: 320, height: 800 });
    await page.waitForTimeout(400);
    await settle(page, 2);
    await waitCard('1.5.2', 1);
    await noOverflow('1.5.2 at 320 px before Reveal');
    await clickChip(page, 'rehearse-reveal');
    await settle(page, 2);
    await noOverflow('1.5.2 at 320 px after Reveal');
    await ctx.shot('320');
    await page.setViewportSize(was);
    log('1.5.2 fits a 320 px phone');
  }

  log('i2-rehearse: all steps passed');
}
