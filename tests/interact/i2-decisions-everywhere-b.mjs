// tests/interact/i2-decisions-everywhere-b.mjs: the two decisions, the move glyph, fresh numbers and the video panel on sets, mappings, linear, powermap, principal-root.
//   node tools/smoke.mjs --route sets --script tests/interact/i2-decisions-everywhere-b.mjs --dark
// The script runs once per viewport on the route `sets` and visits the other stations through the router (window.__mv.app).
// Steps: A1 (both chips on every card, with the meaning on tap), A1b (the chips follow the active problem), A2 (the move glyph of linear),
// A3 / A3b / A3c (fresh numbers from a StationRequest, the note, and the note going when the student changes the thing),
// M (malformed requests), V1 / V2 (the video host and the motion-time panel), U (unmount leaves nothing behind).
// Design: docs/designs/iter-2/i2-decisions-everywhere-b.md section 7.2.

import { settle, dragHandle, clickChip, handleZ } from './_helpers.mjs';
import { problemById, addressLabel } from '../../js/data/problems.js';
import { namesMeaning, addressMeaning, namesLabel } from '../../js/core/decisions.js';

// The only line this script can provoke on purpose: step V2 routes an empty video file.
export const expectedErrors = [/motion-time/];

// The goal's own table of the two chips (A1). The script reads the data, as the goal says, and only logs a difference.
const GOAL_TABLE = {
  '1.5.2': ['P', 'none'], '2.1.1': ['both', 'any'], '2.1.3': ['P', 'any'], '2.1.2': ['C', 'none'], '2.2.2': ['P', 'home'],
};

export default async function (page, ctx) {
  if (ctx.route !== 'sets') return;
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 600;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const near = (a, b, eps) => Math.abs(a - b) <= eps;

  // ---------------------------------------------------------------- helpers
  // Navigate through the router and wait until the new section is mounted and ready (a same-hash navigation re-mounts, so the section's identity is what we wait on).
  async function go(route, station) {
    await ev((r) => { window.__oldSection = document.querySelector('#view > section'); window.__mv.app.navigate(r); }, route);
    await page.waitForFunction((st) => {
      const v = document.querySelector('#view'), sec = v.querySelector(':scope > section');
      return !!sec && sec !== window.__oldSection && v.dataset.state === 'ready' && v.dataset.station === st;
    }, station, { timeout: 12000 });
    await page.waitForTimeout(350);
    await settle(page, 3);
  }
  async function sendFresh(req) {
    await ev((r) => { window.__oldSection = document.querySelector('#view > section'); window.__mv.app.request(r); window.__mv.app.navigate(r.station); }, req);
    await page.waitForFunction((st) => {
      const v = document.querySelector('#view'), sec = v.querySelector(':scope > section');
      const p = window.__mv.app.preset();
      return !!sec && sec !== window.__oldSection && v.dataset.state === 'ready' && v.dataset.station === st && !!p && p.kind === 'values';
    }, req.station, { timeout: 12000 });
    await page.waitForTimeout(450);
    await settle(page, 3);
  }
  const read = (id) => ev((i) => {
    const e = document.getElementById(i);
    return e ? {
      text: e.textContent, hidden: e.hidden, value: e.dataset.value, expanded: e.getAttribute('aria-expanded'), pressed: e.getAttribute('aria-pressed'),
      fresh: e.dataset.fresh, answer: e.dataset.answer, label: e.getAttribute('aria-label'), title: e.getAttribute('title'), tag: e.tagName, tex: e.dataset.tex,
      r: e.getAttribute('data-r'), theta: e.getAttribute('data-theta'),
    } : null;
  }, id);
  const text = async (id) => { const r = await read(id); return r ? r.text : null; };
  const exists = (id) => ev((i) => !!document.getElementById(i), id);
  const noOverflow = async (tag) => assert(await ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1), `${tag}: no horizontal overflow at ${ctx.viewport.width} px`);
  const planeTop = (id) => ev((i) => { const r = document.getElementById(i).getBoundingClientRect(); return r.top + window.scrollY; }, id);
  const chipsOf = async (s) => ({ address: (await read(`${s}-problem-address`)), names: (await read(`${s}-problem-names`)) });
  const expectChips = async (s, id, tag) => {
    const p = problemById(id), c = await chipsOf(s);
    assert(c.address && c.names, `${tag}: both chips exist on the ${s} card`);
    assert(c.address.value === p.address && c.names.value === p.names, `${tag}: chips of ${id} are ${p.address} / ${p.names}, got ${c.address.value} / ${c.names.value}`);
  };

  // ================================================================ A1: both chips on every card
  for (const [route, station, id] of [['problem-1-5-2', 'sets', '1.5.2'], ['problem-2-1-1', 'mappings', '2.1.1'], ['problem-2-1-3', 'linear', '2.1.3'],
    ['problem-2-1-2', 'powermap', '2.1.2'], ['problem-2-2-2', 'principal-root', '2.2.2']]) {
    await go(route, station);
    const p = problemById(id), want = GOAL_TABLE[id], s = station;
    if (want[0] !== p.address || want[1] !== p.names) log(`A1 note: the goal's table says ${id} is ${want[0]} / ${want[1]}; js/data/problems.js says ${p.address} / ${p.names}. The chips follow the data.`);
    const a = await read(`${s}-problem-address`), n = await read(`${s}-problem-names`);
    assert(a && n, `A1 ${s}: both chips exist`);
    assert(a.value === p.address && n.value === p.names, `A1 ${s}: data-values ${a.value} / ${n.value}, expected ${p.address} / ${p.names}`);
    assert(a.text === addressLabel(p.address) && n.text === namesLabel(p.names), `A1 ${s}: chip words "${a.text}" / "${n.text}"`);
    assert(a.tag === 'BUTTON' && n.tag === 'BUTTON' && a.expanded === 'false' && n.expanded === 'false', `A1 ${s}: the chips are buttons, closed`);
    assert(await ev((x) => {
      const d = document.getElementById(`${x}-problem-decisions`), card = document.getElementById(`${x}-problem`), ro = document.getElementById(`${x}-readout`);
      return !!d && !!card && card.contains(d) && d.contains(document.getElementById(`${x}-problem-address`)) && d.contains(document.getElementById(`${x}-problem-names`)) && !(ro && ro.contains(d));
    }, s), `A1 ${s}: the chips are in #${s}-problem-decisions inside #${s}-problem, outside the readout`);
    assert((await read(`${s}-problem-meaning`)).hidden === true, `A1 ${s}: the meaning starts hidden`);
    await clickChip(page, `${s}-problem-names`);
    let m = await read(`${s}-problem-meaning`);
    assert(m.hidden === false && m.text === namesMeaning(p.names), `A1 ${s}: names meaning "${m.text}"`);
    assert((await read(`${s}-problem-names`)).expanded === 'true', `A1 ${s}: aria-expanded on the names chip`);
    await clickChip(page, `${s}-problem-names`);
    assert((await read(`${s}-problem-meaning`)).hidden === true, `A1 ${s}: a second tap hides the meaning`);
    await clickChip(page, `${s}-problem-address`);
    m = await read(`${s}-problem-meaning`);
    assert(m.hidden === false && m.text === addressMeaning(p.address), `A1 ${s}: address meaning "${m.text}"`);
    await clickChip(page, `${s}-problem-address`);
    if (phone) assert(await ev((x) => { const d = document.getElementById(`${x}-problem-decisions`); return d.scrollWidth <= d.clientWidth + 1; }, s), `A1 ${s}: the chips row wraps on a phone`);
    await noOverflow(`A1 ${s}`);
  }
  log('A1: both chips with the right values and their meaning on tap, on the five cards');

  // ================================================================ A1b: the chips follow the active problem
  await go('problem-2-1-3', 'linear');
  await clickChip(page, 'linear-preset-P3');
  await expectChips('linear', 'P3', 'A1b linear P3');
  assert((await text('linear-problem-title')).includes('P3'), 'A1b linear: the title names P3');
  await clickChip(page, 'linear-preset-P4');
  await expectChips('linear', 'P4', 'A1b linear P4');
  assert((await text('linear-problem-title')).includes('P4'), 'A1b linear: the title names P4');
  await clickChip(page, 'linear-preset-2-1-3');
  await expectChips('linear', '2.1.3', 'A1b linear 2.1.3');
  assert((await read('linear-problem-note')).hidden === true && (await read('linear-problem')).fresh === 'false', 'A1b linear: no note without a request');

  await go('problem-2-1-2', 'powermap');
  await clickChip(page, 'powermap-input-sector');
  await expectChips('powermap', '2.2.1', 'A1b powermap sector');
  await clickChip(page, 'powermap-input-line');
  await expectChips('powermap', '2.1.2', 'A1b powermap line');

  await go('problem-2-1-1', 'mappings');
  await clickChip(page, 'mappings-fn-sq');
  assert((await read('mappings-problem')).hidden === true, 'A1b mappings: the card is hidden on z^2');
  await clickChip(page, 'mappings-fn-sq-plus-iz');
  assert((await read('mappings-problem')).hidden === false, 'A1b mappings: the card is back on z^2 + iz');
  await expectChips('mappings', '2.1.1', 'A1b mappings');

  await go('problem-1-5-2', 'sets');
  await ev(() => document.getElementById('sets-outer-strict').scrollIntoView({ block: 'center' }));
  await page.check('#sets-outer-strict');
  await settle(page, 3);
  assert((await text('sets-problem')).includes('You changed the set'), 'A1b sets: the card says the set was changed');
  assert(!(await exists('sets-problem-address')) && !(await exists('sets-problem-names')), 'A1b sets: no chips on a changed set');
  await page.uncheck('#sets-outer-strict');
  await settle(page, 3);
  await expectChips('sets', '1.5.2', 'A1b sets back');
  assert(!(await text('sets-problem')).includes('You changed the set'), 'A1b sets: the handout card is back');

  await go('problem-2-2-2', 'principal-root');
  const topAt2i = await planeTop('principal-root-plane-viewport');
  await ev(() => window.__mv.principalRoot.setW(1, 1));
  await settle(page, 4);
  assert((await text('principal-root-problem')).startsWith('Your own numbers.'), `A1b principal-root: the neutral line, got "${(await text('principal-root-problem')).slice(0, 40)}"`);
  assert(!(await exists('principal-root-problem-address')), 'A1b principal-root: no chips on the neutral line');
  const topAway = await planeTop('principal-root-plane-viewport');
  assert(near(topAway, topAt2i, 1), `A1b principal-root: the plane did not move (${topAt2i} -> ${topAway})`);
  await ev(() => window.__mv.principalRoot.setW(0, 2));
  await settle(page, 4);
  await expectChips('principal-root', '2.2.2', 'A1b principal-root back');
  assert(near(await planeTop('principal-root-plane-viewport'), topAt2i, 1), 'A1b principal-root: the plane is where it was');
  if (phone) assert(await ev(() => [...document.querySelectorAll('.rt-slot-ghost')].every((g) => g.getAttribute('aria-hidden') === 'true' && g.hasAttribute('inert'))), 'A1b principal-root: the ghost cards are aria-hidden and inert');
  assert(await ev(() => [...document.querySelectorAll('.rt-slot-ghost button')].length === 0), 'A1b principal-root: the ghost chips are not buttons');
  log('A1b: the chips follow the active problem (linear, powermap, mappings, sets, principal-root)');

  // ================================================================ A2: the move glyph of linear
  await go('problem-2-1-3', 'linear');
  let g = await read('linear-glyph');
  assert(g && g.label === 'move: turn 90°, stretch 1', `A2: glyph label "${g && g.label}"`);
  assert(await ev(() => {
    const gl = document.getElementById('linear-glyph'), ro = document.getElementById('linear-readout');
    return gl.tagName.toLowerCase() === 'svg' && gl.getAttribute('role') === 'img' && gl.parentElement === ro.parentElement && !ro.contains(gl) && ro.parentElement.id === 'linear-readrow';
  }), 'A2: the glyph is an svg role=img, a sibling of the readout in #linear-readrow');
  const ro0 = await text('linear-readout');
  assert(ro0.startsWith('a = i') && ro0.includes('spin 90°, stretch 1, slide -2i'), `A2: the readout is iteration 1's: "${ro0}"`);
  await dragHandle(page, 'linear-ab-a', { re: 1, im: 1 });
  await settle(page, 4);
  g = await read('linear-glyph');
  assert(g.label === 'move: turn 45°, stretch 1.414' && g.r === '1.414' && g.theta === '0.785', `A2: dragged to 1 + i: ${JSON.stringify(g)}`);
  assert((await text('linear-readout')).includes('spin 45°, stretch 1.414'), 'A2: the readout follows');
  await ev(() => window.__mv.planes.get('linear-ab').getHandle('a').set({ re: 0, im: 0 }));
  await settle(page, 4);
  assert((await read('linear-glyph')).label === 'no move: 0' && (await read('linear-note')).hidden === false, 'A2: a = 0 reads "no move: 0" and shows the zero note');
  await clickChip(page, 'linear-preset-P4');
  assert((await read('linear-glyph')).label === 'move: turn 45°, stretch 1.414', 'A2: P4 is 1 + i');
  await clickChip(page, 'linear-preset-P3');
  assert((await read('linear-glyph')).label === 'move: turn 90°, stretch 1', 'A2: P3 is i');
  assert(await ev(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--polar)';
    document.body.append(probe);
    const want = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(document.getElementById('linear-glyph')).color === want;
  }), 'A2: the glyph is the --polar colour');
  if (phone) {
    assert(await ev(() => {
      const gl = document.getElementById('linear-glyph').getBoundingClientRect(), ro = document.getElementById('linear-readout').getBoundingClientRect(), row = document.getElementById('linear-readrow');
      return gl.right <= ro.left + 1 && row.scrollWidth <= row.clientWidth + 1;
    }), 'A2: on a phone the glyph is left of the readout and the row does not overflow');
  }
  await noOverflow('A2');
  log('A2: the glyph beside a reads the move and follows a');

  // ================================================================ A3: fresh numbers from a StationRequest, and the note
  const note = async (s) => (await text(`${s}-problem-note`)) || '';
  const expectFreshNote = async (s, tag) => {
    const t = await note(s);
    assert(t.includes('Fresh numbers') && t.includes('This page opened on'), `${tag}: the note says so: "${t}"`);
    assert((await read(`${s}-problem`)).fresh === 'true', `${tag}: data-fresh on the card`);
    assert((await read(`${s}-problem-note`)).hidden === false, `${tag}: the note is visible`);
  };

  // sets
  await sendFresh({ station: 'sets', problem: '1.5.2', family: '1.5.2', values: { center: { re: 1, im: -1 }, r0: 1, r1: 3, innerStrict: false, outerStrict: false } });
  await expectFreshNote('sets', 'A3 sets');
  await expectChips('sets', '1.5.2', 'A3 sets');
  assert((await read('sets-closed')).answer === 'yes' && (await read('sets-open')).answer === 'no', 'A3 sets: closed yes, open no');
  let st = await ev(() => window.__mv.sets.state());
  assert(st.card === 'fresh' && same(st.p, { re: 3, im: -1 }) && st.flags.innerStrict === false && st.flags.outerStrict === false && st.half === 5, `A3 sets: ${JSON.stringify({ card: st.card, p: st.p, flags: st.flags, half: st.half })}`);
  assert((await ev(() => document.getElementById('sets-setline').dataset.text)) === '1 <= |z - (1 - i)| <= 3', 'A3 sets: the set line');
  assert((await text('sets-boundary')) === 'Boundary points: the circle |z - (1 - i)| = 1 (in S); the circle |z - (1 - i)| = 3 (in S).', 'A3 sets: the boundary sentence');
  assert((await text('sets-readout')) === 'probe: interior; ε = 0.5' && st.cls.epsMax === 1, 'A3 sets: the probe starts inside with room 1');
  assert((await read('sets-domain')).answer === 'no' && (await read('sets-bounded')).answer === 'yes' && (await read('sets-region')).answer === 'yes', 'A3 sets: bounded, a region, not a domain');
  await noOverflow('A3 sets');
  await ctx.shot('fresh-sets');

  // mappings
  await sendFresh({ station: 'mappings', problem: '2.1.1', family: '2.1.1', values: { fn: { src: 'z^2 - iz' }, z: { re: 1, im: 1 } } });
  await expectFreshNote('mappings', 'A3 mappings');
  await expectChips('mappings', '2.1.1', 'A3 mappings');
  assert((await text('mappings-readout')).includes('w = 1 + i'), 'A3 mappings: w = 1 + i');
  let cu = await read('mappings-fn-custom');
  assert(cu && cu.pressed === 'true' && cu.title === 'z^2 - iz', `A3 mappings: the custom chip ${JSON.stringify(cu)}`);
  assert(await ev(() => [...document.querySelectorAll('#mappings-fn-chips button')].every((b) => (b.id === 'mappings-fn-custom') === (b.getAttribute('aria-pressed') === 'true'))), 'A3 mappings: only the custom chip is pressed');
  assert((await read('mappings-ex-u-cart')).tex.includes('x^{2} - y^{2} + y') && (await read('mappings-ex-v-cart')).tex.includes('2xy - x'), 'A3 mappings: u and v in x and y');
  assert((await read('mappings-ex-u-polar')).tex.includes('r^{2}\\cos 2\\theta + r\\sin\\theta') && (await read('mappings-ex-v-polar')).tex.includes('r^{2}\\sin 2\\theta - r\\cos\\theta'), 'A3 mappings: u and v in r and theta');
  assert((await ev(() => window.__mv.mappings.state().custom)) === 'z^2 - iz', 'A3 mappings: state().custom');
  assert((await text('mappings-fn-note')).includes('The formula the Rehearsal Room sent.'), 'A3 mappings: the formula note');
  assert((await read('mappings-problem-note')).text.includes('f(z) = z^2 - iz at z = 1 + i'), 'A3 mappings: the note quotes the formula and z');
  assert(await ev(() => document.getElementById('mappings-ex-same').getAttribute('data-agree')) === 'true', 'A3 mappings: the same-point row says both addresses agree');
  await noOverflow('A3 mappings');
  await ctx.shot('fresh-mappings');

  // linear
  await sendFresh({ station: 'linear', problem: '2.1.3', family: '2.1.3', values: { a: { re: 0, im: 1 }, b: { re: 1, im: 0 }, input: { kind: 'verticalLine', x: 1 } } });
  await expectFreshNote('linear', 'A3 linear');
  await expectChips('linear', '2.1.3', 'A3 linear');
  assert((await text('linear-readout')).includes('spin 90°'), 'A3 linear: spin 90');
  st = await ev(() => window.__mv.linear.state());
  assert(st.input === 'custom' && same(st.shape, { kind: 'verticalLine', x: 1 }), `A3 linear: ${JSON.stringify({ input: st.input, shape: st.shape })}`);
  cu = await read('linear-input-custom');
  assert(cu && cu.pressed === 'true' && cu.text === 'The line x = 1', `A3 linear: the custom chip ${JSON.stringify(cu)}`);
  assert((await read('linear-glyph')).label === 'move: turn 90°, stretch 1', 'A3 linear: the glyph');
  assert(await ev(() => window.__mv.linearImage.length > 0 && window.__mv.linearImage.every((p) => Math.abs(p.im - 1) < 1e-9)), 'A3 linear: the image is the line v = 1');
  await noOverflow('A3 linear');
  await ctx.shot('fresh-linear');

  // powermap
  await sendFresh({ station: 'powermap', problem: '2.1.2', family: '2.1.2', values: { n: 2, line: { axis: 'x', c: 3 } } });
  await expectFreshNote('powermap', 'A3 powermap');
  await expectChips('powermap', '2.1.2', 'A3 powermap');
  assert((await text('powermap-readout')).includes('x = 3; image: u = 9 - v²/36'), `A3 powermap: "${await text('powermap-readout')}"`);
  assert((await text('powermap-readout')) === 'x = 3; image: u = 9 - v²/36; focus 0; vertex 9', 'A3 powermap: the whole readout');
  assert(await ev(() => window.__mv.powermapImage.length > 0 && window.__mv.powermapImage.every((p) => Math.abs(p.re - (9 - p.im * p.im / 36)) < 1e-6)), 'A3 powermap: every image point is on u = 9 - v^2/36');
  await noOverflow('A3 powermap');
  await ctx.shot('fresh-powermap');

  // principal-root
  await sendFresh({ station: 'principal-root', problem: '2.2.2', family: '2.2.2', values: { w: { re: -8, im: 0 }, n: 3 } });
  await expectFreshNote('principal-root', 'A3 principal-root');
  await expectChips('principal-root', '2.2.2', 'A3 principal-root');
  assert((await text('principal-root-readout')).includes('w^(1/n) = 2 e^(i π/3) = 1 + 1.732i'), `A3 principal-root: "${await text('principal-root-readout')}"`);
  st = await ev(() => window.__mv.principalRoot.state());
  assert(st.n === 3 && st.sel === 1 && st.fresh === true, `A3 principal-root: ${JSON.stringify({ n: st.n, sel: st.sel, fresh: st.fresh })}`);
  assert((await read('principal-root-trap')).hidden === false && (await text('principal-root-trap')).includes('real root, -2'), 'A3 principal-root: the trap note');
  assert((await text('principal-root-pick-note')).includes('step k = 1'), 'A3 principal-root: step k = 1 is selected');
  await noOverflow('A3 principal-root');
  await ctx.shot('fresh-principal-root');
  log('A3: the five stations open on the Rehearsal Room\'s numbers and say so');

  // ================================================================ A3b: the note goes when the student changes the thing
  await sendFresh({ station: 'sets', problem: '1.5.2', family: '1.5.2', values: A3_SETS() });
  await ev(() => document.getElementById('sets-outer-strict').scrollIntoView({ block: 'center' }));
  await page.check('#sets-outer-strict');
  await settle(page, 3);
  assert((await text('sets-problem')).includes('You changed the set') && !(await exists('sets-problem-note')), 'A3b sets: the note goes when the set changes');
  await page.uncheck('#sets-outer-strict');
  await settle(page, 3);
  await expectFreshNote('sets', 'A3b sets (the set is the sent one again)');

  await sendFresh({ station: 'mappings', problem: '2.1.1', family: '2.1.1', values: { fn: { src: 'z^2 - iz' }, z: { re: 1, im: 1 } } });
  await clickChip(page, 'mappings-fn-sq');
  assert((await read('mappings-problem')).hidden === true, 'A3b mappings: the card hides on another function');
  await clickChip(page, 'mappings-fn-custom');
  assert((await read('mappings-problem')).hidden === false && (await note('mappings')).includes('Fresh numbers'), 'A3b mappings: the custom chip brings the card and the note back');
  assert((await read('mappings-ex-u-cart')).tex.includes('x^{2} - y^{2} + y'), 'A3b mappings: and the table of the typed formula');

  await sendFresh({ station: 'linear', problem: '2.1.3', family: '2.1.3', values: { a: { re: 0, im: 1 }, b: { re: 1, im: 0 }, input: { kind: 'verticalLine', x: 1 } } });
  await clickChip(page, 'linear-preset-2-1-3');
  assert((await read('linear-problem-note')).hidden === true && (await read('linear-problem')).fresh === 'false', 'A3b linear: a preset chip takes the note away');
  cu = await read('linear-input-custom');
  assert(cu && cu.pressed === 'false', 'A3b linear: the custom chip stays, not pressed');
  await clickChip(page, 'linear-input-custom');
  assert((await read('linear-input-custom')).pressed === 'true' && (await text('linear-readout')).includes('spin 90°'), 'A3b linear: pressing it brings the shape back');

  await sendFresh({ station: 'powermap', problem: '2.1.2', family: '2.1.2', values: { n: 2, line: { axis: 'x', c: 3 } } });
  await dragHandle(page, 'powermap-zplane-line', { re: 1, im: 0 });
  await settle(page, 4);
  assert((await note('powermap')) === 'You changed the input. The problem itself is n = 2, x = 2.' && (await read('powermap-problem')).fresh === 'false', `A3b powermap: "${await note('powermap')}"`);
  await dragHandle(page, 'powermap-zplane-line', { re: 3, im: 0 });
  await settle(page, 4);
  assert((await note('powermap')).includes('Fresh numbers') && (await read('powermap-problem')).fresh === 'true', 'A3b powermap: back on 3, the fresh note returns');

  await sendFresh({ station: 'principal-root', problem: '2.2.2', family: '2.2.2', values: { w: { re: -8, im: 0 }, n: 3 } });
  const topFresh = await planeTop('principal-root-plane-viewport');
  await ev(() => window.__mv.principalRoot.setW(1, 1));
  await settle(page, 4);
  assert((await text('principal-root-problem')).startsWith('Your own numbers.'), 'A3b principal-root: the neutral line');
  assert(near(await planeTop('principal-root-plane-viewport'), topFresh, 1), 'A3b principal-root: the plane did not move when the fresh card went');
  await ev(() => window.__mv.principalRoot.setW(-8, 0));
  await settle(page, 4);
  await expectFreshNote('principal-root', 'A3b principal-root (the sent numbers again)');
  assert(near(await planeTop('principal-root-plane-viewport'), topFresh, 1), 'A3b principal-root: and the plane did not move when it came back');
  log('A3b: the note goes when the student changes the thing, and returns with the sent numbers');

  // ================================================================ A3c: more fresh cases
  await sendFresh({ station: 'sets', problem: '1.5.2', family: '1.5.2', values: { center: { re: 3, im: 3 }, r0: 2, r1: 4, innerStrict: true, outerStrict: true } });
  assert((await read('sets-open')).answer === 'yes' && (await read('sets-domain')).answer === 'yes', 'A3c sets: 3 + 3i, 2 < rho < 4 is open and a domain');
  st = await ev(() => window.__mv.sets.state());
  assert(st.half === 9 && same(st.p, { re: 6, im: 3 }) && st.bound.R === 4, `A3c sets: ${JSON.stringify({ half: st.half, p: st.p, R: st.bound.R })}`);
  assert((await ev(() => window.__mv.planes.get('sets-plane').getView().unitsAcross)) === 18, 'A3c sets: the view is 18 units across');
  await noOverflow('A3c sets');
  await ctx.shot('fresh-sets-far');

  await sendFresh({ station: 'mappings', problem: null, family: null, values: { fn: 'sq', z: { re: 1, im: 1 } } });
  assert((await read('mappings-fn-sq')).pressed === 'true' && !(await exists('mappings-fn-custom')) && (await read('mappings-problem')).hidden === true, 'A3c mappings: a catalogue id presses its chip, no custom chip, no card');
  await sendFresh({ station: 'mappings', problem: '2.1.1', family: '2.1.1', values: { fn: { src: 'exp(z)' }, z: { re: 1, im: 1 } } });
  assert((await text('mappings-readout')) === 'z = 1 + i; w = 1.469 + 2.287i; u = 1.469; v = 2.287; polar: u = 1.469; v = 2.287', 'A3c mappings: exp(z)');
  assert((await text('mappings-fn-note')).includes('no short expansion'), 'A3c mappings: the numbers-only note');
  await sendFresh({ station: 'mappings', problem: '2.1.1', family: '2.1.1', values: { fn: { src: 'z^2 +' }, z: { re: 2, im: 0 } } });
  const parseMsg = await ev(async () => { const P = await import('./js/core/parse.js'); try { P.compile('z^2 +'); return ''; } catch (e) { return e.message; } });
  assert(parseMsg === 'The formula stops too early. Something is missing after "+".', `A3c mappings: parse.js says "${parseMsg}"`);
  assert((await text('mappings-fn-error')) === parseMsg && (await read('mappings-fn-problem')).hidden === false, 'A3c mappings: the callout carries the parse message untouched');
  assert(!(await exists('mappings-fn-custom')), 'A3c mappings: no custom chip for a formula that did not parse');
  assert((await text('mappings-readout')) === 'z = 2; w = 4 + 2i; u = 4; v = 2; polar: u = 4; v = 2', 'A3c mappings: z = 2 was applied and the page is on z^2 + iz');
  await ctx.shot('fresh-mappings-bad');
  await clickChip(page, 'mappings-fn-sq');
  assert((await read('mappings-fn-problem')).hidden === true, 'A3c mappings: a function chip hides the callout');
  await sendFresh({ station: 'mappings', problem: '2.1.1', family: '2.1.1', values: { fn: { src: '(1 + 2i)*z^2 + (3 - 3i)*z + 1' }, z: { re: 1, im: 1 } } });
  cu = await read('mappings-fn-custom');
  assert(cu && cu.title === '(1 + 2i)*z^2 + (3 - 3i)*z + 1' && cu.text.length <= 'custom: '.length + 24, `A3c mappings: a long formula is cut on the chip, whole in the title: ${JSON.stringify(cu)}`);
  await noOverflow('A3c mappings long chip');

  await sendFresh({ station: 'linear', problem: 'P3', family: 'P3', values: { a: { re: 1, im: 1 }, b: { re: 1, im: 0 }, input: 'x2', compose: { c: { re: 0, im: 2 }, d: { re: -1, im: 0 } } } });
  assert((await text('linear-compose-readout')) === 'ac = -2 + 2i; ad + b = -i', `A3c linear P3: "${await text('linear-compose-readout')}"`);
  assert((await ev(() => document.getElementById('linear-compose-c').value)) === '2i' && (await ev(() => document.getElementById('linear-compose-d').value)) === '-1', 'A3c linear P3: c and d are in the fields');
  await expectChips('linear', 'P3', 'A3c linear P3');
  await expectFreshNote('linear', 'A3c linear P3');
  assert((await note('linear')).includes('The composition panel opened on c = 2i and d = -1.'), 'A3c linear P3: the note names c and d');
  await sendFresh({ station: 'linear', problem: 'P4', family: 'P4', values: { a: { re: 0, im: 2 }, b: { re: 0, im: 0 }, input: { kind: 'circle', center: { re: 0, im: 0 }, r: 3 } } });
  assert((await text('linear-readout')).includes('spin 90°, stretch 2, slide 0') && (await read('linear-glyph')).label === 'move: turn 90°, stretch 2', 'A3c linear P4: the readout and the glyph');
  assert(await ev(() => window.__mv.linearImage.every((p) => Math.abs(Math.hypot(p.re, p.im) - 6) < 1e-6)), 'A3c linear P4: every image point is at distance 6');
  assert((await ev(() => window.__mv.planes.get('linear-zplane').getView().unitsAcross)) > 10.8, 'A3c linear P4: the planes were refitted');
  await expectChips('linear', 'P4', 'A3c linear P4');
  await ctx.shot('fresh-linear-p4');
  await sendFresh({ station: 'linear', problem: '2.1.3', family: '2.1.3', values: { a: { re: 1, im: 1 }, b: { re: 0, im: 0 }, input: { kind: 'horizontalLine', y: 2 } } });
  assert((await text('linear-input-custom')) === 'The line y = 2', 'A3c linear: the horizontal line chip');
  assert(await ev(() => window.__mv.linearImage.length > 0 && window.__mv.linearImage.every((p) => Math.abs((p.im - p.re) - 4) < 1e-9)), 'A3c linear: the image of y = 2 under (1 + i)z is v = u + 4');
  await noOverflow('A3c linear');

  await sendFresh({ station: 'powermap', problem: '2.1.2', family: '2.1.2', values: { n: 2, line: { axis: 'y', c: 2 } } });
  assert((await text('powermap-readout')).includes('y = 2; image: u = v²/16 - 4; focus 0; vertex -4'), `A3c powermap y: "${await text('powermap-readout')}"`);
  assert((await text('powermap-input-line')) === 'Line y = c', 'A3c powermap y: the chip says y');
  const hz = await handleZ(page, 'powermap-zplane-line');
  assert(near(hz.re, 0, 1e-9) && near(hz.im, 2, 1e-9), `A3c powermap y: the handle is at (0, 2): ${JSON.stringify(hz)}`);
  assert(await ev(() => window.__mv.powermapImage.length > 0 && window.__mv.powermapImage.every((p) => Math.abs(p.re - (p.im * p.im / 16 - 4)) < 1e-6)), 'A3c powermap y: every image point is on u = v^2/16 - 4');
  await expectChips('powermap', '2.1.2', 'A3c powermap y');
  await noOverflow('A3c powermap y');
  await ctx.shot('fresh-powermap-y');
  await sendFresh({ station: 'powermap', problem: '2.2.1', family: '2.2.1', values: { n: 2, sector: { theta0: 0, theta1: Math.PI / 6 } } });
  assert((await text('powermap-readout')).includes('sector 0 < arg z < 0.524 (π/6); image: 0 < arg w < 1.047 (π/3)'), `A3c powermap sector: "${await text('powermap-readout')}"`);
  await expectChips('powermap', '2.2.1', 'A3c powermap sector');
  await expectFreshNote('powermap', 'A3c powermap sector');
  assert((await note('powermap')).includes('0 < arg z < π/6 under w = z^2'), 'A3c powermap sector: the note says the sector');

  await sendFresh({ station: 'principal-root', problem: '2.2.2', family: '2.2.2', values: { w: { re: 0, im: 2 }, n: 3 } });
  assert((await text('principal-root-readout')).includes('w^(1/n) = 1.26 e^(i π/6) = 1.091 + 0.63i'), `A3c principal-root: "${await text('principal-root-readout')}"`);
  log('A3c: more fresh cases (a far ring, typed formulas, a bad formula, P3, P4, y = c, a sector, 2i with n = 3)');

  // ================================================================ M: malformed requests leave the defaults, with no note and no console error
  const bad = [
    ['sets', { center: 'x', r0: 99 }, async () => (await text('sets-readout')) === 'probe: interior; ε = 0.5' && (await ev(() => window.__mv.sets.state().card)) === 'handout'],
    ['mappings', { fn: 5, z: 'x' }, async () => (await text('mappings-readout')) === 'z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3'],
    ['linear', { a: 'x', input: 7, compose: 3 }, async () => (await text('linear-readout')).includes('b = -2i; spin 90°')],
    ['powermap', { n: 99, line: { axis: 'z', c: 'x' } }, async () => (await text('powermap-readout')).includes('x = 2; image: u = 4 - v²/16')],
    ['principal-root', { w: 'x', n: 99 }, async () => (await text('principal-root-readout')).startsWith('w = 2i; n = 2')],
  ];
  for (const [station, values, okDefault] of bad) {
    await sendFresh({ station, problem: null, family: null, values });
    const t = await note(station);
    assert(!t.includes('Fresh numbers'), `M ${station}: no fresh note: "${t}"`);
    assert((await read(`${station}-problem`)).fresh === 'false', `M ${station}: data-fresh is false`);
    assert(await okDefault(), `M ${station}: the default page`);
    await noOverflow(`M ${station}`);
  }
  await sendFresh({ station: 'roots', problem: null, family: null, values: { c: 'x', n: 99 } }).catch(() => {});      // another station's request never reaches ours
  log('M: malformed requests leave the default page, no note, no error');

  // ================================================================ V1, V2: the video host and the motion-time panel
  await go('mappings', 'mappings');
  const order = await ev(() => {
    const host = document.getElementById('mappings-video-host'), wp = document.getElementById('mappings-wplane-viewport'), mo = document.getElementById('mappings-morph');
    if (!host || !wp || !mo) return null;
    const F = Node.DOCUMENT_POSITION_FOLLOWING;
    return { afterPlane: !!(wp.compareDocumentPosition(host) & F), beforeMorph: !!(host.compareDocumentPosition(mo) & F), children: host.children.length, height: host.getBoundingClientRect().height, panel: !!document.getElementById('video-motion-time') };
  });
  assert(order && order.afterPlane && order.beforeMorph, `V1: the host sits after the w-plane and before the morph slider: ${JSON.stringify(order)}`);
  const manifestHasIt = await ev(async () => { const m = await import('./media/manifest.js'); return (m.VIDEOS || []).some((v) => v.id === 'motion-time'); });
  if (!manifestHasIt) assert(!order.panel && order.children === 0 && order.height === 0, `V1: no manifest entry, the host is empty and has no height: ${JSON.stringify(order)}`);
  else assert(order.panel && order.children === 1, 'V1: the manifest has motion-time and the panel is in the host');
  log(`V1: #mappings-video-host after the planes, before the morph (${manifestHasIt ? 'the panel is there' : 'empty until the manifest has motion-time'})`);

  await page.route('**/media/manifest.js', (route) => route.fulfill({
    status: 200, contentType: 'text/javascript',
    body: "export const VIDEOS = [{ id: 'motion-time', title: 'A function moves the plane', summary: 'Time is the parameter.', station: 'mappings', src: 'media/video/motion-time.mp4', captions: 'media/video/motion-time.vtt', seconds: 150, narrated: false, music: false }];\nexport const SITE_AUDIO = {};\n",
  }));
  await page.route('**/media/video/motion-time.mp4', (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.alloc(0) }));
  await page.route('**/media/video/motion-time.vtt', (route) => route.fulfill({ status: 200, contentType: 'text/vtt', body: 'WEBVTT\n' }));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready' && !!document.getElementById('mappings-video-host'), null, { timeout: 12000 });
  await page.waitForFunction(() => !!document.getElementById('video-motion-time'), null, { timeout: 8000 });
  const vid = await ev(() => {
    const host = document.getElementById('mappings-video-host'), p = document.getElementById('video-motion-time'), wp = document.getElementById('mappings-wplane-viewport'), mo = document.getElementById('mappings-morph');
    const F = Node.DOCUMENT_POSITION_FOLLOWING, v = p.querySelector('video'), t = v.querySelector('track');
    return {
      inHost: p.parentElement === host, afterPlane: !!(wp.compareDocumentPosition(p) & F), beforeMorph: !!(p.compareDocumentPosition(mo) & F),
      controls: v.hasAttribute('controls'), playsinline: v.hasAttribute('playsinline'), preload: v.getAttribute('preload'),
      track: !!t && t.getAttribute('kind') === 'captions' && t.hasAttribute('default'),
    };
  });
  assert(vid.inHost && vid.afterPlane && vid.beforeMorph, `V2: the panel is in the host, after the planes, before the morph: ${JSON.stringify(vid)}`);
  assert(vid.controls && vid.playsinline && vid.preload === 'metadata' && vid.track, `V2: the video has controls, playsinline, preload=metadata and a default captions track: ${JSON.stringify(vid)}`);
  await noOverflow('V2');
  await ctx.shot('video-panel');
  await go('home', 'home');
  assert(!(await exists('video-motion-time')), 'V2: leaving removes the panel');
  await go('mappings', 'mappings');
  await page.waitForFunction(() => !!document.getElementById('video-motion-time'), null, { timeout: 8000 });
  assert((await ev(() => document.querySelectorAll('#video-motion-time').length)) === 1, 'V2: coming back gives one panel, not two');
  // the three routes stay for the rest of the run: the manifest the page has already loaded still names the video, and an unrouted file would be a real 404
  log('V2: with a manifest entry the panel appears after the two planes, once, and goes when the station does');

  // ================================================================ U: unmount leaves nothing behind
  for (const [route, station, hook, planeIds] of [
    ['sets', 'sets', 'sets', ['sets-plane']],
    ['mappings', 'mappings', 'mappings', ['mappings-zplane', 'mappings-wplane']],
    ['linear', 'linear', 'linear', ['linear-zplane', 'linear-wplane', 'linear-ab']],
    ['powermap', 'powermap', 'powermapImage', ['powermap-zplane', 'powermap-wplane']],
    ['principal-root', 'principal-root', 'principalRoot', ['principal-root-plane']],
  ]) {
    await go(route, station);
    assert(await ev((h) => window.__mv[h] !== undefined, hook), `U ${station}: the hook exists while mounted`);
    await go('home', 'home');
    assert(await ev(() => ['sets', 'mappings', 'linear', 'powermapImage', 'principalRoot'].every((h) => window.__mv[h] === undefined)), `U ${station}: the hooks are gone`);
    assert(await ev((ids) => ids.every((i) => !window.__mv.planes.has(i)), planeIds), `U ${station}: its planes are gone from window.__mv.planes`);
    assert(!(await exists('video-motion-time')), `U ${station}: no video panel left`);
  }
  log('U: the five stations leave no hook, plane or panel behind');

  function A3_SETS() { return { center: { re: 1, im: -1 }, r0: 1, r1: 3, innerStrict: false, outerStrict: false }; }
}
