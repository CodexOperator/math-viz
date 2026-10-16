// tests/interact/i2-decisions-kit.mjs: the shared station pieces of iteration 2, built and driven on a page that is not their station.
//   node tools/smoke.mjs --route home,nosuchplace --script tests/interact/i2-decisions-kit.mjs --dark
// Steps: (a) decision chips, (b) decision picker, (c) move glyph, (d) header, problem card and links, (e) the router turns a
// station.request into a values preset once, (f) the card's statement is the index's statement, (g) the pieces fit a phone,
// (h) the tokens carry both themes. Everything is appended to a host in #view and removed at the end.

import { settle } from './_helpers.mjs';

const MEANING_ALL = 'Every name gives a different answer: roots take all n steps.';
const STATUS_ANY = 'Address: right. Names: wrong. It is "any". Any name of the angle works: powers, products, directions, cos and sin.';

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 600;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ev = (fn, arg) => page.evaluate(fn, arg);

  await ev(() => {
    const host = document.createElement('div');
    host.id = 'kit-host';
    host.style.cssText = 'display:grid;gap:16px;padding:8px 0';
    document.getElementById('view').append(host);
  });

  // ---------------------------------------------------------------- (a) decision chips
  await ev(async () => {
    const D = await import('./js/core/decisions.js');
    const P = await import('./js/data/problems.js');
    const row = document.createElement('div');
    row.id = 'kit-chips';
    row.append(D.chips(P.problemById('1.4.2'), { idPrefix: 't' }));
    document.getElementById('kit-host').append(row);
  });
  const read = (sel) => ev((s) => { const e = document.querySelector(s); return e ? { text: e.textContent, hidden: e.hidden, expanded: e.getAttribute('aria-expanded'), value: e.dataset.value, tag: e.tagName, tone: e.dataset.tone, controls: e.getAttribute('aria-controls'), title: e.getAttribute('title') } : null; }, sel);
  let c = await read('[id="t-address"]');
  assert(c.text === 'Polar, then Cartesian' && c.value === 'P->C' && c.tag === 'BUTTON' && c.expanded === 'false' && c.controls === 't-meaning', `address chip: ${JSON.stringify(c)}`);
  assert(c.tone === undefined, 'a two-address chip has no single tone (its dots show the order)');
  c = await read('[id="t-names"]');
  assert(c.text === 'names: all' && c.value === 'all' && c.expanded === 'false', `names chip: ${JSON.stringify(c)}`);
  assert(c.title === MEANING_ALL, `the hover text is the meaning: ${c.title}`);
  assert((await read('[id="t-meaning"]')).hidden === true, 'the meaning starts hidden');
  assert(await ev(() => document.querySelector('[id="t-meaning"]').getAttribute('role') === 'status' && document.querySelector('.decisions').dataset.problem === '1.4.2'), 'meaning is a status region; the host names the problem');
  await page.click('[id="t-names"]');
  let m = await read('[id="t-meaning"]');
  assert(m.hidden === false && m.text.includes('Every name gives a different answer'), `tap shows the meaning: ${JSON.stringify(m)}`);
  assert((await read('[id="t-names"]')).expanded === 'true' && (await read('[id="t-address"]')).expanded === 'false', 'aria-expanded follows the tap');
  if (process.env.KIT_SHOTS) await page.locator('#kit-chips').screenshot({ path: `${process.env.KIT_SHOTS}/${ctx.route}-${ctx.label}-chips-open.png` });
  await page.click('[id="t-address"]');
  m = await read('[id="t-meaning"]');
  assert(m.hidden === false && m.text === 'Work in polar, then write the answer as x + iy.', `the other chip switches the meaning: ${m.text}`);
  assert((await read('[id="t-names"]')).expanded === 'false' && (await read('[id="t-address"]')).expanded === 'true', 'one chip open at a time');
  await page.click('[id="t-address"]');
  assert((await read('[id="t-meaning"]')).hidden === true && (await read('[id="t-address"]')).expanded === 'false', 'a second tap hides it');
  await page.focus('[id="t-names"]');
  await page.keyboard.press('Enter');
  assert((await read('[id="t-meaning"]')).hidden === false, 'Enter on a focused chip opens it');
  await page.keyboard.press('Escape');
  assert((await read('[id="t-meaning"]')).hidden === true && (await ev(() => document.activeElement.id)) === 't-names', 'Escape hides it and keeps focus on the chip');
  // every problem, both chips from its own data; the read-only variant has no buttons and no meaning span
  const all = await ev(async () => {
    const D = await import('./js/core/decisions.js');
    const P = await import('./js/data/problems.js');
    const out = [];
    for (const p of P.PROBLEMS) {
      const el = D.chips(p, { idPrefix: 'x', meaning: false });
      const a = el.querySelector('[data-decision="address"]'), n = el.querySelector('[data-decision="names"]');
      out.push([p.id, a.textContent === P.addressLabel(p.address), n.textContent === D.namesLabel(p.names), a.tagName, el.querySelector('.decision-meaning') === null, n.getAttribute('aria-expanded')]);
    }
    return out;
  });
  assert(all.length === 29 && all.every((r) => r[2] && r[1] && r[3] === 'SPAN' && r[4] && r[5] === null), `29 problems, 2 chips each: ${JSON.stringify(all.filter((r) => !(r[1] && r[2])))}`);
  assert((await ev(() => { try { return 'no throw: ' + document.querySelectorAll('[id="t-names"]').length; } catch (e) { return String(e); } })) === 'no throw: 1', 'ids are unique');
  const bad = await ev(async () => {
    const D = await import('./js/core/decisions.js');
    const e1 = D.chips({ id: 'q', address: 'zz', names: 'qq' }, { idPrefix: 'bad' });
    const e2 = D.chips(null, { idPrefix: 'bad2' });
    let thrown = null;
    try { D.chips({}, {}); } catch (e) { thrown = e.constructor.name; }
    return [e1.children.length, e2.children.length, thrown];
  });
  assert(same(bad, [1, 1, 'TypeError']), `bad data gives no chips, only the (hidden) meaning span; no idPrefix throws TypeError: ${JSON.stringify(bad)}`);
  log('(a) chips: labels, tap, switch, second tap, Enter, Escape, 29 problems, bad data');

  // ---------------------------------------------------------------- (b) decision picker
  await ev(async () => {
    const D = await import('./js/core/decisions.js');
    window.__picks = [];
    window.__picker = D.picker({ idPrefix: 'p', onPick: (d, v) => window.__picks.push([d, v]) });
    document.getElementById('kit-host').append(window.__picker.el);
  });
  const ids = await ev(() => [...document.querySelectorAll('[id^="p-"]')].map((e) => e.id));
  for (const id of ['p-address-row', 'p-names-row', 'p-status', 'p-address-c', 'p-address-p', 'p-address-c-p', 'p-address-p-c', 'p-address-c-p-c', 'p-address-both',
    'p-names-none', 'p-names-any', 'p-names-all', 'p-names-home', 'p-names-continuous']) assert(ids.includes(id), `picker id ${id}`);
  assert(await ev(() => document.getElementById('p').tagName === 'FIELDSET' && document.getElementById('p').className.includes('decisions-picker')), 'the picker is a fieldset');
  assert(await ev(() => [...document.querySelectorAll('.dp-opt')].every((b) => b.getAttribute('aria-pressed') === 'false' && b.type === 'button')), 'nothing is pressed at the start');
  await page.click('[id="p-address-p"]');
  await page.click('[id="p-names-all"]');
  assert(same(await ev(() => window.__picker.get()), { address: 'P', names: 'all' }), 'get() after two taps');
  assert(same(await ev(() => window.__picks), [['address', 'P'], ['names', 'all']]), 'onPick reports each tap');
  assert(await ev(() => document.getElementById('p-address-p').getAttribute('aria-pressed') === 'true' && document.getElementById('p-address-c').getAttribute('aria-pressed') === 'false'), 'one pressed per row');
  await ev(() => window.__picker.mark({ address: true, names: false, expected: { address: 'P', names: 'any' } }));
  const mk = await ev(() => ({
    nr: document.getElementById('p-names-row').dataset.mark, ni: document.getElementById('p-names-row').getAttribute('aria-invalid'),
    ar: document.getElementById('p-address-row').dataset.mark, ai: document.getElementById('p-address-row').getAttribute('aria-invalid'),
    status: document.getElementById('p-status').textContent, expected: document.getElementById('p-names-any').dataset.expected, none: document.getElementById('p-names-none').dataset.expected,
  }));
  assert(mk.nr === 'wrong' && mk.ni === 'true' && mk.ar === 'right' && mk.ai === null, `marks: ${JSON.stringify(mk)}`);
  assert(mk.status.includes('Names: wrong') && mk.status === STATUS_ANY, `status: ${mk.status}`);
  assert(mk.expected === 'true' && mk.none === undefined, 'the expected chip of a wrong row is outlined');
  await ev(() => window.__picker.mark({ address: true, names: true, expected: { address: 'P', names: 'all' } }));
  assert((await read('[id="p-status"]')).text === 'Address: right. Names: right.', 'both right');
  await ev(() => window.__picker.mark({ address: false, names: null, expected: { address: 'P->C', names: 'all' } }));
  assert((await read('[id="p-status"]')).text === 'Address: wrong. It is "Polar, then Cartesian". Work in polar, then write the answer as x + iy.', 'a wrong address names the right one');
  await ev(() => window.__picker.mark({ address: null, names: null }));
  assert((await read('[id="p-status"]')).text === '' && await ev(() => !document.getElementById('p-names-row').hasAttribute('data-mark')), 'null clears the marks and the sentence');
  await ev(() => window.__picker.disable(true));
  const dis = await ev(() => { document.getElementById('p-names-home').click(); return { got: window.__picker.get(), off: [...document.querySelectorAll('.dp-opt')].every((b) => b.disabled) }; });
  assert(dis.off && same(dis.got, { address: 'P', names: 'all' }), `disabled picker ignores taps: ${JSON.stringify(dis)}`);
  await ev(() => window.__picker.disable(false));
  await page.click('[id="p-names-all"]');
  assert(same(await ev(() => window.__picker.get()), { address: 'P', names: null }), 'a second tap on the pressed chip clears it');
  assert(same((await ev(() => window.__picks)).slice(-1)[0], ['names', null]), 'and tells onPick null');
  await page.focus('[id="p-address-c"]');
  await page.keyboard.press('ArrowRight');
  assert((await ev(() => document.activeElement.id)) === 'p-address-p', 'ArrowRight moves focus along the row');
  await page.keyboard.press('End');
  assert((await ev(() => document.activeElement.id)) === 'p-address-both', 'End goes to the last chip');
  await page.keyboard.press('Space');
  assert((await ev(() => window.__picker.get().address)) === 'both', 'Space presses it');
  await ev(() => window.__picker.set({ names: 'home', address: 'nonsense' }));
  assert(same(await ev(() => window.__picker.get()), { address: 'both', names: 'home' }), 'set() takes valid codes only');
  await ev(() => window.__picker.reset());
  assert(same(await ev(() => window.__picker.get()), { address: null, names: null }) && await ev(() => [...document.querySelectorAll('.dp-opt')].every((b) => b.getAttribute('aria-pressed') === 'false')), 'reset() clears');
  await ev(() => window.__picker.destroy());
  assert((await ev(() => document.getElementById('p'))) === null, 'destroy() removes the fieldset');
  await ev(() => window.__picker.destroy());
  log('(b) picker: ids, taps, marks, status sentences, disable, deselect, keyboard, set, reset, destroy');

  // ---------------------------------------------------------------- (c) move glyph
  await ev(async () => {
    const G = await import('./js/core/moveglyph.js');
    const line = document.createElement('p');
    line.id = 'kit-glyph-line';
    line.style.fontSize = '20px';
    line.append('z = -1 + 1.732i ', G.moveGlyph({ re: -1, im: Math.sqrt(3) }, { id: 'kit-glyph' }));
    document.getElementById('kit-host').append(line);
  });
  const gl = () => ev(() => {
    const s = document.getElementById('kit-glyph');
    return { label: s.getAttribute('aria-label'), arcs: s.querySelectorAll('path.glyph-arc').length, rays: s.querySelectorAll('line.glyph-ray').length, units: s.querySelectorAll('circle.glyph-unit').length,
      r: s.dataset.r, theta: s.dataset.theta, clipped: s.dataset.clipped, title: s.querySelector('title').textContent, w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height,
      role: s.getAttribute('role'), vb: s.getAttribute('viewBox'), size: s.getAttribute('width'), d: (s.querySelector('path.glyph-arc') || { getAttribute: () => null }).getAttribute('d'),
      x2: s.querySelector('line.glyph-ray').getAttribute('x2'), y2: s.querySelector('line.glyph-ray').getAttribute('y2'), cls: s.getAttribute('class'), tag: s.tagName };
  });
  let g = await gl();
  assert(g.tag === 'svg' && g.cls === 'move-glyph' && g.label === 'move: turn 120°, stretch 2' && g.title === g.label && g.role === 'img', `glyph label: ${JSON.stringify(g)}`);
  assert(g.arcs === 1 && g.rays === 1 && g.units === 1 && g.r === '2' && g.theta === '2.094' && g.clipped === 'false' && g.vb === '0 0 24 24' && g.size === '1.1em', `glyph parts: ${JSON.stringify(g)}`);
  assert(g.d === 'M 18 12 A 6 6 0 0 0 9 6.804' && g.x2 === '6' && g.y2 === '1.608', `glyph path ${g.d} ray ${g.x2},${g.y2}`);
  assert(Math.abs(g.w - 22) < 0.6 && Math.abs(g.h - 22) < 0.6, `1.1em at 20px is 22px: ${g.w} x ${g.h}`);
  await ev(async () => (await import('./js/core/moveglyph.js')).updateGlyph(document.getElementById('kit-glyph'), 0));
  g = await gl();
  assert(g.label === 'no move: 0' && g.arcs === 0 && g.rays === 1 && g.r === '0' && g.x2 === '12' && g.y2 === '12', `origin: ${JSON.stringify(g)}`);
  await ev(async () => (await import('./js/core/moveglyph.js')).updateGlyph(document.getElementById('kit-glyph'), { re: 0, im: -2 }));
  g = await gl();
  assert(g.label === 'move: turn -90°, stretch 2' && g.arcs === 1 && g.d === 'M 18 12 A 6 6 0 0 1 12 18' && g.y2 === '24', `down: ${JSON.stringify(g)}`);
  await ev(async () => (await import('./js/core/moveglyph.js')).updateGlyph(document.getElementById('kit-glyph'), { re: 512, im: -886.81 }));
  g = await gl();
  assert(g.clipped === 'true' && g.label === 'move: turn -60°, stretch 1024', `clipped: ${JSON.stringify(g)}`);
  const kept = await ev(async () => {
    const G = await import('./js/core/moveglyph.js');
    const s = document.getElementById('kit-glyph');
    const same1 = G.updateGlyph(s, { re: 3, im: 2 }) === s;
    const arc1 = s.querySelector('path.glyph-arc');
    G.updateGlyph(s, { re: 3, im: 2 });
    return [same1, s.querySelector('path.glyph-arc') === arc1, s.querySelectorAll('path.glyph-arc').length, document.querySelectorAll('svg.move-glyph').length];
  });
  assert(same(kept, [true, true, 1, 1]), `updateGlyph redraws the same element in place and never stacks arcs: ${JSON.stringify(kept)}`);
  const gcol = await ev(() => { const s = document.getElementById('kit-glyph'); const p = document.createElement('i'); p.style.color = 'var(--polar)'; document.body.append(p); const want = getComputedStyle(p).color; p.remove(); return [getComputedStyle(s.querySelector('.glyph-ray')).stroke, want]; });
  assert(gcol[0] === gcol[1], `the ray is drawn in --polar: ${JSON.stringify(gcol)}`);
  assert((await ev(async () => { try { (await import('./js/core/moveglyph.js')).updateGlyph(document.body, 1); return 'no'; } catch (e) { return e.constructor.name; } })) === 'TypeError', 'updateGlyph on a foreign element is a TypeError');
  log('(c) glyph: parts, label, path, 1.1em, origin, down, clipped, in place, colour');

  // ---------------------------------------------------------------- (d) header, problem card, links
  const d = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const R = await import('./js/registry.js');
    const P = await import('./js/data/problems.js');
    const { createStore } = await import('./js/core/store.js');
    const store = createStore('kit-test:', { storage: null });
    window.__nav = [];
    const kctx = { station: R.stationById('roots'), stations: R.STATIONS, threads: R.THREADS, store, navigate: (t) => window.__nav.push(t), theme: {} };
    window.__kctx = kctx;
    const host = document.getElementById('kit-host');
    const hd = S.header(kctx, { lede: 'x', active: '1.4.2' });
    const card = S.problemCard(kctx, P.problemById('1.4.2'), { id: 't-problem' });
    const nav = S.links(kctx);
    const wrap = document.createElement('div');
    wrap.id = 'kit-station';
    wrap.append(hd, card.el, nav);
    host.append(wrap);
    window.__card = card;
    return { ok: true };
  });
  assert(d.ok, 'built');
  const hd = await ev(() => {
    const h = document.querySelector('#kit-station .station-header');
    const chips = [...h.querySelectorAll('a.problem-chip')];
    return { h1: h.querySelector('h1').textContent, h1count: h.querySelectorAll('h1').length, lede: h.querySelector('p.station-lede').textContent, ids: chips.map((a) => a.id), hrefs: chips.map((a) => a.getAttribute('href')),
      current: chips.map((a) => a.getAttribute('aria-current')), badges: [...h.querySelectorAll('ul.thread-badges > li > span.thread-badge')].map((b) => [b.dataset.thread, b.textContent]),
      group: h.querySelector('.chips').getAttribute('aria-label'), texts: chips.map((a) => a.textContent), tipOk: chips.every((a) => a.title.length > 10 && !/\^[{(]/.test(a.title)) };
  });
  assert(hd.h1 === 'Roots: Divide the Staircase' && hd.h1count === 1 && hd.lede === 'x', `header: ${JSON.stringify(hd)}`);
  assert(same(hd.ids, ['roots-problem-chip-1-4-1', 'roots-problem-chip-1-4-2', 'roots-problem-chip-1-4-3']) && same(hd.hrefs, ['#problem-1-4-1', '#problem-1-4-2', '#problem-1-4-3']) && same(hd.current, [null, 'true', null]), `problem chips: ${JSON.stringify(hd)}`);
  assert(same(hd.badges, [['T2', 'T2 · The staircase'], ['T1', 'T1 · One point, two addresses']]) && hd.group === 'Problems on this page' && same(hd.texts, ['1.4.1', '1.4.2', '1.4.3']) && hd.tipOk, `badges and chips: ${JSON.stringify(hd)}`);
  const cd = await ev(() => {
    const q = (id) => document.getElementById(id);
    const card = q('t-problem');
    return { tag: card.tagName, cls: card.className, problem: card.dataset.problem, tone: card.dataset.tone, title: q('t-problem-title').textContent, statement: q('t-problem-statement').textContent, hasKatex: !!q('t-problem-statement').querySelector('.katex'),
      chips: q('t-problem-decisions').querySelectorAll('.decision-chip').length, toggle: q('t-problem-answer-toggle').textContent, text: q('t-problem-answer-text').textContent, answerOpen: q('t-problem-answer').open, tag2: q('t-problem-answer').tagName,
      note: q('t-problem-note').textContent, slot: q('t-problem-slot').children.length, why: q('t-problem-why').textContent, labelled: card.getAttribute('aria-labelledby'), aha: q('t-problem-aha').textContent,
      tex: q('t-problem-answer-tex').className, texAttrs: [q('t-problem-answer-tex').getAttribute('tabindex'), q('t-problem-answer-tex').getAttribute('role')], hint: q('t-problem-answer-hint').textContent, ans: window.__card.els.answerText === q('t-problem-answer-text') };
  });
  const P142 = await ev(async () => (await import('./js/data/problems.js')).problemById('1.4.2').answer.text);
  assert(cd.tag === 'ASIDE' && cd.cls === 'callout problem-card' && cd.problem === '1.4.2' && cd.tone === 'accent' && cd.title === 'Problem 1.4.2' && cd.labelled === 't-problem-title', `card frame: ${JSON.stringify(cd)}`);
  assert(cd.statement.includes('roots of') && cd.hasKatex && cd.chips === 2 && cd.toggle === 'Show the answer' && cd.text === P142 && cd.answerOpen === false && cd.tag2 === 'DETAILS', `card parts: ${JSON.stringify(cd)}`);
  assert(cd.note === '' && cd.slot === 0 && cd.why.startsWith('Why this address. Find the roots in polar') && cd.aha.startsWith('The aha. ') && cd.hint === 'Scroll sideways to see the rest.' && cd.ans, `card text: ${JSON.stringify(cd)}`);
  assert(cd.tex.includes('tex-scroll') && same(cd.texAttrs, ['0', 'group']), `the answer scroller is focusable and named: ${JSON.stringify(cd)}`);
  await page.click('[id="t-problem-answer-toggle"]');
  const open = await ev(() => ({ open: document.getElementById('t-problem-answer').open, toggle: document.getElementById('t-problem-answer-toggle').textContent, katex: !!document.getElementById('t-problem-answer-tex').querySelector('.katex') }));
  assert(open.open && open.toggle === 'Show the answer' && open.katex, `the answer opens: ${JSON.stringify(open)}`);
  // chips inside the card work and use the card id as their prefix
  await page.click('[id="t-problem-names"]');
  assert((await read('[id="t-problem-meaning"]')).text === MEANING_ALL, 'the card chips explain themselves');
  // the neutral state, a fresh-numbers note, and the programmatic API
  const st = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const P = await import('./js/data/problems.js');
    const card = window.__card;
    const out = {};
    card.setProblem(null);
    out.neutral = [card.el.textContent.startsWith('Your own numbers.'), card.els.note.textContent, card.el.dataset.problem === undefined, card.el.dataset.empty, card.els.title.hidden, card.els.answer.hidden, card.els.decisions.children.length];
    card.setProblem(P.problemById('P3'), { note: S.freshNote(P.problemById('P3'), { kind: 'values', problem: 'P3', family: 'P3', values: {} }) });
    out.p3 = [card.el.dataset.problem, card.el.dataset.tone, card.els.title.textContent, card.els.note.textContent.startsWith('Fresh numbers from the Rehearsal Room. '), card.el.dataset.empty === undefined, card.els.answer.hidden, card.els.answerText.textContent === P.problemById('P3').answer.text,
      card.els.decisions.querySelector('#t-problem-address').dataset.value, card.els.decisions.querySelector('#t-problem-names').dataset.value];
    card.setNote('hello');
    out.note = card.els.note.textContent;
    card.setAnswerOpen(true);
    out.open = [card.els.answer.open, !!card.els.answerTex.querySelector('.katex'), card.els.answer.firstElementChild.textContent];
    card.setAnswerOpen(false);
    out.closed = card.els.answer.open;
    card.setProblem(P.problemById('1.4.2'));
    out.back = [card.el.dataset.problem, card.els.note.textContent, card.el.dataset.tone, card.els.statement.textContent.includes('roots of')];
    return out;
  });
  assert(same(st.neutral, [true, 'Your own numbers.', true, 'true', true, true, 0]), `neutral card: ${JSON.stringify(st.neutral)}`);
  assert(same(st.p3, ['P3', 'cart', 'Problem P3', true, true, false, true, 'C', 'none']), `P3 card: ${JSON.stringify(st.p3)}`);
  assert(st.note === 'hello' && same(st.open, [true, true, 'Show the answer']) && st.closed === false && same(st.back, ['1.4.2', '', 'accent', true]), `card API: ${JSON.stringify(st)}`);
  // options: open answer, no answer, why: false, routes, tone, title, aliases
  const op = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const P = await import('./js/data/problems.js');
    const k = window.__kctx;
    const a = S.problemCard(k, P.problemById('1.3.1'), { id: 'o1', answer: 'open', routes: true, tone: 'polar', title: 'On the test: 1.3.1' });
    const b = S.problemCard(k, P.problemById('1.3.1'), { id: 'o2', answer: 'none', why: false });
    const c = S.problemCard(k, P.problemById('2.1.3'), { id: 'o3', aliases: { answer: 'o3-old-box', card: 'o3-old-card' } });
    document.getElementById('kit-host').append(a.el, b.el, c.el);
    const q = (id) => document.getElementById(id);
    window.__opt = [a, b, c];
    return {
      a: [q('o1-answer').tagName, q('o1-answer-toggle'), q('o1-route-cart').textContent.startsWith('In Cartesian (slide)'), q('o1-route-polar').textContent.startsWith('In polar (spin and stretch)'), a.el.dataset.tone, q('o1-title').textContent, q('o1-answer').contains(q('o1-route-cart'))],
      b: [q('o2-answer'), q('o2-answer-text'), q('o2-why'), b.els.answer, b.els.why, q('o2-statement') !== null],
      c: [q('o3-old-box').className.includes('tex-scroll'), q('o3-old-box').getAttribute('tabindex'), q('o3-old-box').nextElementSibling.textContent, q('o3-answer-tex').contains(q('o3-old-box')), q('o3-old-card').contains(q('o3')), c.el === q('o3-old-card'), c.els.answerTex === q('o3-old-box'),
        document.querySelector('[id="o3-answer"] .tex-scroll').id],
    };
  });
  assert(op.a[0] === 'DIV' && op.a[1] === null && op.a[2] && op.a[3] && op.a[4] === 'polar' && op.a[5] === 'On the test: 1.3.1' && op.a[6], `open answer card: ${JSON.stringify(op.a)}`);
  assert(op.b.slice(0, 5).every((x) => x === null) && op.b[5], `answer none and why false leave no answer or why element: ${JSON.stringify(op.b)}`);
  assert(op.c[0] && op.c[1] === '0' && op.c[2] === 'Scroll sideways to see the rest.' && op.c[3] && op.c[4] && op.c[5] && op.c[6] && op.c[7] === 'o3-old-box', `aliases keep the old ids: ${JSON.stringify(op.c)}`);
  await ev(() => { for (const c of window.__opt) c.destroy(); window.__card.destroy(); });
  assert((await ev(() => [document.getElementById('o1'), document.getElementById('o3-old-card'), document.getElementById('t-problem')].every((x) => x === null))), 'destroy() removes the cards');
  await ev(() => { document.querySelector('#kit-station').append(window.__card.el); });
  // the links
  const lk = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const k = window.__kctx;
    const nav = document.getElementById('roots-links');
    const a = [...nav.querySelectorAll('a')];
    const o = { label: nav.getAttribute('aria-label'), cls: nav.className, anchors: a.map((x) => [x.id, x.getAttribute('href'), x.dataset.dir || null, x.dataset.thread || null, x.textContent, x.children.length, x.firstElementChild.tagName, x.childNodes.length]), button: nav.querySelector('button') };
    const lab = S.links(k, { lab: { fn: 'recip', shapes: [], view: 'side', problem: null, predictFirst: false }, extras: [{ href: '#staircase', text: 'The Staircase', prefix: 'Related: ' }, { href: '#powers', text: 'dup' }, { href: '#powermap', text: 'dup too', thread: 'T2', dir: 'next' }, { nope: 1 }], label: 'More' });
    document.getElementById('kit-host').append(lab);
    const btn = lab.querySelector('#roots-open-lab');
    btn.click();
    o.lab = { label: lab.getAttribute('aria-label'), ids: [...lab.children].map((x) => x.id), btn: btn.textContent, type: btn.type, nav: window.__nav.slice(), req: k.store.get('lab.request'), extra: lab.querySelector('#roots-link-staircase').textContent };
    lab.remove();
    // a station with nothing around it, a lab request with no store, and a ctx with no station
    const bare = S.links({ station: { id: 'zz', threads: [] }, stations: [{ id: 'zz', order: 0, threads: [] }] });
    o.bare = [bare.hidden, bare.children.length];
    let e1 = null, e2 = null;
    try { S.links({ station: k.station, stations: k.stations }, { lab: {} }); } catch (e) { e1 = e.constructor.name; }
    try { S.header({}); } catch (e) { e2 = e.constructor.name; }
    o.errors = [e1, e2];
    return o;
  });
  assert(lk.label === 'Where next' && lk.cls === 'station-links' && lk.button === null, `links frame: ${JSON.stringify(lk)}`);
  assert(same(lk.anchors.map((x) => x.slice(0, 4)), [
    ['roots-link-powers', '#powers', 'prev', null], ['roots-link-curves', '#curves', 'next', null], ['roots-link-powermap', '#powermap', 'next', 'T2'], ['roots-link-sets', '#sets', 'next', 'T1'],
  ]), `link ids and data: ${JSON.stringify(lk.anchors)}`);
  assert(lk.anchors.every((x) => x[5] === 1 && x[6] === 'SPAN' && x[7] === 1), `every anchor's text goes through one span: ${JSON.stringify(lk.anchors)}`);
  assert(same(lk.anchors.map((x) => x[4]), ['Powers: Spin n Times', 'Curves and Time', 'T2 next: zⁿ: Fans and Parabolas'.replace('ⁿ', 'n'), 'T1 next: Disks, Annuli, Boundaries']), `link text: ${JSON.stringify(lk.anchors.map((x) => x[4]))}`);
  assert(lk.lab.label === 'More' && same(lk.lab.ids, ['roots-link-powers', 'roots-link-curves', 'roots-link-powermap', 'roots-link-sets', 'roots-link-staircase', 'roots-open-lab']), `extras are added, duplicates dropped: ${JSON.stringify(lk.lab.ids)}`);
  assert(lk.lab.btn === 'Open in the Lab' && lk.lab.type === 'button' && same(lk.lab.nav, ['lab']) && lk.lab.req.fn === 'recip' && lk.lab.extra === 'Related: The Staircase', `lab button: ${JSON.stringify(lk.lab)}`);
  assert(same(lk.bare, [true, 0]) && same(lk.errors, ['TypeError', 'TypeError']), `empty and error cases: ${JSON.stringify([lk.bare, lk.errors])}`);
  const ts = await ev(async () => { const S = await import('./js/core/station-kit.js'); const s = S.titleSpan('z^n: Fans and Parabolas'); return [s.tagName, s.children.length, s.querySelector('sup.prose-sup').textContent, s.textContent]; });
  assert(same(ts, ['SPAN', 1, 'n', 'zn: Fans and Parabolas']), `titleSpan: ${JSON.stringify(ts)}`);
  log('(d) header, card (every option, aliases, neutral, fresh note, API), links (order, one span, extras, lab button, errors), titleSpan');

  // ---------------------------------------------------------------- (f) the card's statement is the index's statement
  const par = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const P = await import('./js/data/problems.js');
    const PS = await import('./js/stations/problems.js');
    const bad = [];
    for (const p of P.PROBLEMS) {
      const card = S.problemCard(window.__kctx, p, { id: 'par' });
      const ref = document.createElement('p');
      PS.appendStatement(ref, P.statementParts(p.statement), '');
      if (card.els.statement.innerHTML !== ref.innerHTML) bad.push(p.id);
      card.destroy();
    }
    return bad;
  });
  assert(par.length === 0, `the card statement is the index statement for all 29 problems; differs: ${par.join(', ')}`);
  log('(f) statement markup equals problems.js appendStatement for all 29');

  // ---------------------------------------------------------------- (h) the tokens carry both themes
  const themes = await ev(async () => {
    const out = {};
    const probe = (prop, token) => { const p = document.createElement('i'); p.style[prop] = `var(${token})`; document.body.append(p); const v = getComputedStyle(p)[prop]; p.remove(); return v; };
    const D = await import('./js/core/decisions.js');
    const P = await import('./js/data/problems.js');
    const host = document.createElement('div');
    for (const [id, p] of [['th-all', P.problemById('1.4.2')], ['th-any', P.problemById('1.3.2')], ['th-none', P.problemById('1.1.1')], ['th-home', P.problemById('1.3.1')], ['th-cont', P.problemById('2.4.1')]]) host.append(D.chips(p, { idPrefix: id }));
    document.getElementById('kit-host').append(host);
    for (const theme of ['light', 'dark']) {
      document.documentElement.dataset.theme = theme;
      const cs = (id) => getComputedStyle(document.getElementById(id));
      out[theme] = {
        allBg: cs('th-all-names').backgroundColor === probe('backgroundColor', '--polar'), allFg: cs('th-all-names').color === probe('color', '--on-accent'),
        anyBorder: cs('th-any-names').borderTopColor === probe('borderTopColor', '--polar'), anyBg: cs('th-any-names').backgroundColor === probe('backgroundColor', '--surface'),
        noneFg: cs('th-none-names').color === probe('color', '--text-muted'), contStyle: cs('th-cont-names').borderTopStyle, anyStyle: cs('th-any-names').borderTopStyle,
        addrCart: cs('th-none-address').borderTopColor === probe('borderTopColor', '--cart'), homeBg: cs('th-home-names').backgroundColor !== probe('backgroundColor', '--surface'),
        glyph: getComputedStyle(document.querySelector('#kit-glyph .glyph-ray')).stroke === probe('color', '--polar'),
      };
    }
    delete document.documentElement.dataset.theme;
    host.remove();
    return out;
  });
  for (const theme of ['light', 'dark']) {
    const t = themes[theme];
    assert(t.allBg && t.allFg && t.anyBorder && t.anyBg && t.noneFg && t.addrCart && t.homeBg && t.glyph && t.contStyle === 'dashed' && t.anyStyle === 'solid', `${theme} tokens on the chips and the glyph: ${JSON.stringify(t)}`);
  }
  log('(h) both themes: filled, outlined, grey, tinted and dashed Names chips, tinted address chip, glyph colour');

  // ---------------------------------------------------------------- (g) phone: nothing is wider than the page
  await ev(async () => {
    const D = await import('./js/core/decisions.js');
    const pk = D.picker({ idPrefix: 'pp', address: 'C->P->C', names: 'continuous' });
    pk.mark({ address: false, names: false, expected: { address: 'both', names: 'none' } });
    document.getElementById('kit-host').append(pk.el);
    window.__pk2 = pk;
  });
  const fit = await ev(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('#kit-host *')].filter((e) => e.getBoundingClientRect().right > vw + 1 && !e.closest('.tex-scroll') && !e.closest('.katex')).map((e) => (e.id || e.className || e.tagName).toString().slice(0, 40));
    return { over: document.documentElement.scrollWidth - vw, wide: wide.slice(0, 6) };
  });
  assert(fit.over <= 1 && fit.wide.length === 0, `no horizontal overflow with the kit on the page (${phone ? 'phone' : 'desktop'}): ${JSON.stringify(fit)}`);
  const tap = await ev(() => [...document.querySelectorAll('#pp .dp-opt')].map((b) => Math.round(b.getBoundingClientRect().height)));
  assert(tap.every((hgt) => hgt >= 44), `option chips are at least 44 px tall: ${tap.join(',')}`);
  await ctx.shot('kit');
  if (process.env.KIT_SHOTS) await page.locator('#kit-host').screenshot({ path: `${process.env.KIT_SHOTS}/${ctx.route}-${ctx.label}-host.png` });
  // and at 320 px, the narrowest phone: the kit's own box must not be wider than its column
  await page.setViewportSize({ width: 320, height: 800 });
  await settle(page, 3);
  const narrow = await ev(() => {
    const host = document.getElementById('kit-host'), vw = document.documentElement.clientWidth;
    const wide = [...host.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > vw + 1 && !e.closest('.tex-scroll') && !e.closest('.katex')).map((e) => (e.id || e.className || e.tagName).toString().slice(0, 40));
    const chip = document.getElementById('pp-address-c-p-c').getBoundingClientRect();
    return { vw, hostOver: host.scrollWidth - host.clientWidth, wide: wide.slice(0, 6), longest: Math.round(chip.width) };
  });
  assert(narrow.hostOver <= 1 && narrow.wide.length === 0, `the kit fits a ${narrow.vw} px viewport: ${JSON.stringify(narrow)}`);
  await page.setViewportSize(ctx.viewport);
  await settle(page, 2);
  await ev(() => { window.__pk2.destroy(); });
  log(`(g) fits ${ctx.viewport.width} px and 320 px: overflow 0, chips ${Math.min(...tap)} px tall or more, longest chip ${narrow.longest} px`);

  // ---------------------------------------------------------------- (e) the router turns a station.request into a values preset, once
  await ev(() => document.getElementById('kit-host').remove());
  const go = async (token) => {
    await ev((t) => { location.hash = '#' + t; }, token);
    await page.waitForFunction((t) => { const v = document.querySelector('#view'); return v.dataset.route === t && v.dataset.state !== 'loading'; }, token, { timeout: 8000 });
    await page.waitForTimeout(150);
  };
  const preset = () => ev(() => window.__mv.app.preset());
  const REQ = { station: 'roots', problem: '1.4.2', family: '1.4.2', values: { c: { re: -81, im: 0 }, n: 4 } };
  assert(await ev(() => typeof window.__mv.app.request === 'function' && typeof window.__mv.app.preset === 'function'), 'window.__mv.app has request() and preset()');
  await ev((r) => window.__mv.app.request(r), REQ);
  await go('roots');
  await page.waitForTimeout(450);
  assert(same(await preset(), { kind: 'values', ...REQ }), `the request becomes the values preset: ${JSON.stringify(await preset())}`);
  assert(await ev(() => Object.isFrozen(window.__mv.app.preset()) && Object.isFrozen(window.__mv.app.preset().values)), 'the preset is frozen');
  assert((await ev(() => document.querySelector('#view').dataset.state)) === 'ready' && (await ev(() => document.querySelectorAll('[data-station-error]').length)) === 0, 'roots mounted with it (iteration-1 stations ignore a values preset)');
  await go('home');
  assert((await preset()) === null, 'home has no preset');
  await go('roots');
  assert((await preset()) === null, 'consumed once: the same station again has none');
  // a request for another station waits for it
  await ev(() => window.__mv.app.request({ station: 'sets', problem: '1.5.2', family: '1.5.2', values: { preset: 'annulus' } }));
  await go('roots');
  assert((await preset()) === null, 'a request for sets is not given to roots');
  await go('sets');
  assert(same(await preset(), { kind: 'values', station: 'sets', problem: '1.5.2', family: '1.5.2', values: { preset: 'annulus' } }), 'and waits for sets');
  await go('home');
  await go('sets');
  assert((await preset()) === null, 'sets got it once');
  // a request wins over a hash preset; the next visit gets the hash preset again
  await ev(() => window.__mv.app.request({ station: 'roots', problem: null, family: null, values: { n: 5 } }));
  await go('problem-1-4-1');
  assert(same(await preset(), { kind: 'values', station: 'roots', problem: null, family: null, values: { n: 5 } }), 'a request wins over #problem-1-4-1');
  await go('home');
  await go('problem-1-4-1');
  assert(same(await preset(), { kind: 'problem', id: '1.4.1' }), 'the hash preset is back without a request');
  await go('topic-T1-4');
  assert(same(await preset(), { kind: 'topic', id: 'T1.4' }), 'topic presets are untouched');
  // bad requests: dropped, never a broken station
  for (const bad of [{ station: 'nosuchplace', values: {} }, { station: 'roots', values: 5 }, { station: 'roots' }, 'roots', 42, null, [1]]) {
    await ev((r) => window.__mv.app.request(r), bad);
    await go('roots');
    assert((await preset()) === null && (await ev(() => document.querySelectorAll('[data-station-error]').length)) === 0, `a malformed request is dropped: ${JSON.stringify(bad)}`);
    await go('home');
  }
  await ev(() => window.__mv.app.request({ station: 'roots', problem: 'ZZ.9', family: 7, values: { c: 'banana', n: 1e9 } }));
  await go('roots');
  assert(same(await preset(), { kind: 'values', station: 'roots', problem: null, family: null, values: { c: 'banana', n: 1e9 } }), 'an unknown problem id becomes null; the values are the station\'s to validate');
  assert((await ev(() => document.querySelectorAll('[data-station-error]').length)) === 0, 'and roots still mounts');
  await go('nosuchplace');
  assert((await preset()) === null, 'No such place has no preset');
  log('(e) router: preset, once, other station waits, request beats hash, bad requests dropped');
}
