// tests/interact/i2-decisions-everywhere-a.mjs: the two decisions, the move glyph and fresh numbers on addresses, distance, powers, roots, curves.
//   node tools/smoke.mjs --route addresses --script tests/interact/i2-decisions-everywhere-a.mjs --dark
// Steps: A1 the chips on every problem card, A2 the move glyph, A3 fresh numbers from a StationRequest, then the extras the design pins
// (ids unique, the video host, the roots slot does not move, a preset takes the note away, the phone fits, the glyph wears --polar).
// The whole run starts on #addresses and visits the other routes by navigation; it runs at desktop, phone and dark desktop.

import { settle, dragHandle, setSlider, clickChip } from './_helpers.mjs';
import { problemById } from '../../js/data/problems.js';
import { namesMeaning, addressMeaning } from '../../js/core/decisions.js';

// The only lines this script provokes on purpose: leaving an addresses page aborts the metadata request of the two-addresses video (the panel is
// mounted once media/manifest.js lists it), and tools/smoke.mjs counts an aborted request as 'request failed'. Nothing else is allowed.
export const expectedErrors = [/^request failed: \S+\/media\/video\/two-addresses\.(?:mp4|vtt)$/];

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 600;
  const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const attr = (sel, a) => page.evaluate(([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null; }, [sel, a]);
  const exists = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);

  // navigate() sets the hash, or re-mounts when it already is the hash; the route and the state tell when the new page is up
  const go = async (route, state = 'ready') => {
    await page.evaluate((r) => window.__mv.app.navigate(r), route);
    await page.waitForFunction(([r, s]) => { const v = document.getElementById('view'); return !!v && v.dataset.route === r && v.dataset.state === s; }, [route, state], { timeout: 15000 });
    await settle(page, 3);
  };
  // what the Rehearsal Room does: write the request, then open the station from a different page so the router really mounts it
  const fresh = async (station, problem, values) => {
    await go('nosuchplace', 'nosuchplace');
    await page.evaluate((req) => window.__mv.app.request(req), { station, problem, family: problem, values });
    await go(station);
  };
  const fits = async (what) => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `${what}: the page scrolls sideways by ${over}px`);
  };
  const noDuplicateIds = async (what) => {
    const dup = await page.evaluate(() => { const seen = new Map(); for (const e of document.querySelectorAll('#view [id]')) seen.set(e.id, (seen.get(e.id) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([k]) => k); });
    assert(dup.length === 0, `${what}: duplicate ids ${dup.join(', ')}`);
  };

  // ---------------------------------------------------------------- A1 both chips on every problem card, from the data
  const A1 = [['problem-1-3-1', 'addresses', '1.3.1'], ['problem-1-2-1', 'distance', '1.2.1'], ['problem-1-3-2', 'powers', '1.3.2'],
    ['problem-1-4-2', 'roots', '1.4.2'], ['problem-1-5-1', 'curves', '1.5.1']];
  for (const [route, st, pid] of A1) {
    await go(route);
    const p = problemById(pid);
    const pre = `#${st}-problem`;
    assert((await attr(`${pre}-address`, 'data-value')) === p.address, `A1 ${route}: address chip ${await attr(`${pre}-address`, 'data-value')}, data says ${p.address}`);
    assert((await attr(`${pre}-names`, 'data-value')) === p.names, `A1 ${route}: names chip ${await attr(`${pre}-names`, 'data-value')}, data says ${p.names}`);
    assert(await page.evaluate((s) => { const h = document.getElementById(s); return !!h && h.querySelectorAll('.decision-chip').length === 2; }, `${st}-problem-decisions`), `A1 ${route}: #${st}-problem-decisions holds the two chips`);
    assert((await text(`${pre}-names`)) === `names: ${p.names}`, `A1 ${route}: names chip text`);
    assert((await attr(`${pre}-meaning`, 'hidden')) !== null, `A1 ${route}: the meaning starts hidden`);
    await page.click(`${pre}-names`);
    assert((await text(`${pre}-meaning`)) === namesMeaning(p.names) && (await attr(`${pre}-names`, 'aria-expanded')) === 'true', `A1 ${route}: tap shows "${namesMeaning(p.names)}"`);
    await page.click(`${pre}-address`);
    assert((await text(`${pre}-meaning`)) === addressMeaning(p.address), `A1 ${route}: the address chip switches the meaning`);
    await page.click(`${pre}-address`);
    assert((await attr(`${pre}-meaning`, 'hidden')) !== null, `A1 ${route}: a second tap hides it`);
    await noDuplicateIds(`A1 ${route}`);
    await fits(`A1 ${route}`);
  }
  // the chips follow the active problem
  await go('problem-1-2-1');
  await clickChip(page, 'distance-mode-two');
  assert((await attr('#distance-problem-address', 'data-value')) === 'C' && (await attr('#distance-problem-names', 'data-value')) === 'none', 'A1 distance: the two-point mode shows 1.2.2 (C, none)');
  assert((await page.evaluate(() => document.querySelector('#distance-problem-decisions .decisions').dataset.problem)) === '1.2.2', 'A1 distance: the chips say which problem they belong to');
  await clickChip(page, 'distance-mode-triangle');
  assert(!(await exists('#distance-problem-address')) && !(await exists('#distance-problem-names')), 'A1 distance: the triangle is a topic, so there are no chips');
  await go('problem-1-4-2');
  await clickChip(page, 'roots-preset-1');
  assert((await attr('#roots-problem-address', 'data-value')) === 'P' && (await attr('#roots-problem-names', 'data-value')) === 'all', 'A1 roots: the preset c = 1, n = 5 shows 1.4.1 (P, all)');
  await clickChip(page, 'roots-preset-i');
  assert(!(await exists('#roots-problem-address')), 'A1 roots: c = i, n = 3 matches no problem, so there are no chips');
  assert((await attr('#roots-quadratic-problem-address', 'data-value')) === 'C' && (await attr('#roots-quadratic-problem-names', 'data-value')) === 'all', 'A1 roots: the quadratic panel carries 1.4.3 (C, all)');
  await noDuplicateIds('A1 roots after the callout changed');
  log('A1 chips on the five problem cards, from the data; meaning on tap; they follow distance mode and roots numbers');

  // ---------------------------------------------------------------- A2 the move glyph beside z and zⁿ
  await go('problem-1-3-1');
  assert((await attr('#addresses-glyph', 'aria-label')) === 'move: turn 120°, stretch 2', `A2 addresses glyph: ${await attr('#addresses-glyph', 'aria-label')}`);
  assert((await text('#addresses-readout')) === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)', `A2 the readout is unchanged: ${await text('#addresses-readout')}`);
  assert(await page.evaluate(() => { const g = document.getElementById('addresses-glyph'), r = document.getElementById('addresses-readout'); return !r.contains(g) && !g.contains(r) && g.parentElement === r.parentElement; }), 'A2 the glyph is a sibling of the readout, not inside it');
  await dragHandle(page, 'addresses-plane-z', { re: 2, im: 0 });
  assert((await attr('#addresses-glyph', 'aria-label')) === 'move: turn 0°, stretch 2', `A2 after the drag to 2: ${await attr('#addresses-glyph', 'aria-label')}`);
  await page.evaluate(() => window.__mv.planes.get('addresses-plane').getHandle('z').set({ re: 0, im: 0 }));
  await settle(page, 3);
  assert((await attr('#addresses-glyph', 'aria-label')) === 'no move: 0' && (await text('#addresses-readout')) === 'z = 0; |z| = 0; Arg z: no angle at 0', 'A2 at 0 the glyph says there is no move');
  const polarColour = await page.evaluate(() => { const t = document.createElement('i'); t.style.color = 'var(--polar)'; document.body.append(t); const c = getComputedStyle(t).color; t.remove(); return c; });
  assert((await page.evaluate(() => getComputedStyle(document.getElementById('addresses-glyph')).color)) === polarColour, `A2 the glyph is drawn in --polar (${polarColour}) in ${ctx.label}`);
  await go('problem-1-3-2');
  assert((await attr('#powers-glyph', 'aria-label')) === 'move: turn -60°, stretch 1024', `A2 powers glyph: ${await attr('#powers-glyph', 'aria-label')}`);
  assert((await text('#powers-readout')) === 'zⁿ = 512 - 886.81i; |z|ⁿ = 1024; nθ = 5.236 (5π/3); home step = -1.047 (-π/3)', `A2 the powers readout is unchanged: ${await text('#powers-readout')}`);
  assert(await page.evaluate(() => { const g = document.getElementById('powers-glyph'), r = document.getElementById('powers-readout'); return !r.contains(g) && g.parentElement === r.parentElement; }), 'A2 the powers glyph is a sibling of the readout');
  await setSlider(page, 'powers-n', 2);
  assert((await attr('#powers-glyph', 'aria-label')) === 'move: turn 60°, stretch 4', `A2 z² = 2 + 3.464i: ${await attr('#powers-glyph', 'aria-label')}`);
  await setSlider(page, 'powers-n', 12);
  assert((await attr('#powers-glyph', 'aria-label')) === 'move: turn 0°, stretch 4096', `A2 z^12 = 4096: ${await attr('#powers-glyph', 'aria-label')}`);
  await page.evaluate(() => window.__mv.planes.get('powers-plane').getHandle('z').set({ re: 0, im: 0 }));
  await settle(page, 3);
  assert((await attr('#powers-glyph', 'aria-label')) === 'no move: 0', 'A2 powers at z = 0');
  log('A2 glyphs: addresses 120 degrees and stretch 2, then 0 degrees, then none at 0; powers -60 degrees and 1024');

  // ---------------------------------------------------------------- A3 fresh numbers
  const A3 = [
    { st: 'addresses', pid: '1.3.1', values: { z: { re: 0, im: 2 } }, check: async () => {
      const z = await page.evaluate(() => window.__mv.addresses.state().z);
      assert(z.re === 0 && z.im === 2, `A3 addresses z = ${JSON.stringify(z)}`);
      assert((await text('#addresses-readout')).includes('Arg z = 1.571 (π/2)'), `A3 addresses readout: ${await text('#addresses-readout')}`);
    } },
    { st: 'distance', pid: '1.2.2', values: { mode: 'two', z1: { re: 1, im: 5 }, z2: { re: -2, im: 1 } }, check: async () => {
      assert((await text('#distance-readout')).includes('d = 5'), `A3 distance readout: ${await text('#distance-readout')}`);
    } },
    { st: 'powers', pid: '1.3.2', values: { z: { re: Math.SQRT2, im: Math.SQRT2 }, n: 4 }, check: async () => {
      assert(/zⁿ = -16\b/.test(await text('#powers-readout')), `A3 powers readout: ${await text('#powers-readout')}`);
    } },
    { st: 'roots', pid: '1.4.2', values: { c: { re: -81, im: 0 }, n: 4 }, check: async () => {
      assert((await text('#roots-readout')).includes('c = -81; n = 4; |c|^(1/n) = 3'), `A3 roots readout: ${await text('#roots-readout')}`);
    } },
    { st: 'curves', pid: '1.5.1', values: { a: { re: 1, im: 2 }, b: { re: -1, im: -2 } }, check: async () => {
      await setSlider(page, 'curves-t', 0.5);
      assert((await text('#curves-readout')).includes('z(t) = 0'), `A3 curves readout: ${await text('#curves-readout')}`);
    } },
  ];
  for (const c of A3) {
    await fresh(c.st, c.pid, c.values);
    await c.check();
    const note = await text(`#${c.st}-problem-note`);
    assert(note && note.includes('Fresh numbers'), `A3 ${c.st}: the card says so: "${note}"`);
    assert(note.includes('Opened with'), `A3 ${c.st}: and says what it opened with: "${note}"`);
    await noDuplicateIds(`A3 ${c.st}`);
    await fits(`A3 ${c.st}`);
  }
  // the request is used once: a plain visit afterwards has the station's own numbers and no note
  await go('nosuchplace', 'nosuchplace');
  await go('addresses');
  assert((await text('#addresses-problem-note')) === '', 'A3 the note is gone on the next plain visit');
  assert((await text('#addresses-readout')).startsWith('z = -1 + 1.732i'), 'A3 and so are the numbers');
  // a malformed request leaves the station on its default, with no note
  await fresh('roots', null, { c: 'x', n: 99 });
  const st = await page.evaluate(() => window.__mv.roots.state());
  assert(st.c.re === 1 && st.c.im === 0 && st.n === 5, `A3 malformed roots request: c = ${JSON.stringify(st.c)}, n = ${st.n}`);
  assert((await text('#roots-readout')).startsWith('c = 1; n = 5;'), 'A3 and the readout says so');
  assert((await text('#roots-problem-note')) === '', 'A3 nothing was applied, so nothing is claimed');
  // the other stations survive the same
  for (const s of ['addresses', 'distance', 'powers', 'curves']) {
    await fresh(s, null, { z: 'x', n: 'y', z1: 3, mode: 'nope', a: null, b: [], R: -1 });
    assert((await text(`#${s}-problem-note`) || '') === '', `A3 ${s}: a malformed request claims no fresh numbers`);
  }
  // the quadratic and the partly good request
  await fresh('roots', '1.4.3', { quadratic: { a: 1, b: -6, c: 25 } });
  assert((await text('#roots-quadratic-readout')).startsWith('(z - 3)² = -16; square roots: ±4i; roots: 3 + 4i, 3 - 4i'), `A3 roots quadratic: ${await text('#roots-quadratic-readout')}`);
  assert((await text('#roots-readout')).startsWith('c = -16; n = 2;') && (await text('#roots-problem-note')).includes('Fresh numbers'), 'A3 roots quadratic: the big picture shows the square roots of d, with the note');
  await fresh('powers', '1.3.2', { z: { re: 1, im: 1 }, n: 99 });
  assert((await text('#powers-readout')).startsWith('zⁿ = ') && (await page.evaluate(() => window.__mv.powers.state().n)) === 10 && (await page.evaluate(() => window.__mv.powers.state().z.re)) === 1, 'A3 powers: a good z with a bad n keeps n = 10');
  await fresh('distance', '1.2.1', { mode: 'circle', a: { re: -4, im: 3 }, R: 4 });
  assert((await text('#distance-readout')) === 'circle: center -4 + 3i, radius 4' && (await text('#distance-problem-note')).includes('Fresh numbers'), `A3 distance circle: ${await text('#distance-readout')}`);
  assert(await page.evaluate(() => { const p = window.__mv.planes.get('distance-plane'), v = p.getView(), s = p.getSize(), a = p.toPixel({ re: -4, im: 3 }); return a.x > 0 && a.x < s.w && a.y > 0 && a.y < s.h && v.center.re < 1.5; }), 'A3 distance: the view was fitted (it moved left of the default centre 2) so the centre -4 + 3i is on the plane');
  await fresh('curves', '1.5.1', { a: { re: -5, im: 4 }, b: { re: 5, im: -4 } });
  assert(await page.evaluate(() => { const p = window.__mv.planes.get('curves-plane'), s = p.getSize(); return [{ re: -5, im: 4 }, { re: 5, im: -4 }].every((z) => { const q = p.toPixel(z); return q.x > 0 && q.x < s.w && q.y > 0 && q.y < s.h; }); }), 'A3 curves: the ends -5 + 4i and 5 - 4i are both on the plane');
  log('A3 fresh numbers on the five stations, the note, one use only, malformed requests, quadratic, fitted views');

  // ---------------------------------------------------------------- extras
  // a preset or a mode puts the handout's numbers back and takes the note away
  await fresh('addresses', '1.3.1', { z: { re: 0, im: 2 } });
  await clickChip(page, 'addresses-preset-sqrt3-i');
  assert((await text('#addresses-problem-note')) === '', 'a preset clears the addresses note');
  await fresh('powers', '1.3.2', { z: { re: 1, im: 1 }, n: 8 });
  await clickChip(page, 'powers-preset-i');
  assert((await text('#powers-problem-note')) === '', 'a preset clears the powers note');
  await fresh('curves', '1.5.1', { a: { re: 1, im: 2 }, b: { re: -1, im: -2 } });
  await clickChip(page, 'curves-preset-circle');
  assert((await text('#curves-problem-note')) === '', 'a preset clears the curves note');
  await fresh('roots', '1.4.2', { c: { re: -81, im: 0 }, n: 4 });
  assert((await text('#roots-problem')).includes('4th roots of') && (await attr('#roots-problem-address', 'data-value')) === 'P->C', 'roots: fresh numbers on 1.4.2 show its card and chips');
  assert(await page.evaluate(() => { const n = document.getElementById('roots-problem-note'); return !document.getElementById('roots-problem').contains(n); }), 'roots: the note is outside the slot, so a swap of the callout cannot move the planes');
  const top0 = await page.evaluate(() => document.querySelector('.plane[data-plane-id="roots-plane"]').getBoundingClientRect().top + window.scrollY);
  await dragHandle(page, 'roots-plane-c', { re: -1, im: 1 });
  assert((await text('#roots-problem')).startsWith('Your own numbers.'), `roots: after the drag the callout is neutral: ${await text('#roots-problem')}`);
  const top1 = await page.evaluate(() => document.querySelector('.plane[data-plane-id="roots-plane"]').getBoundingClientRect().top + window.scrollY);
  assert(Math.abs(top1 - top0) < 1, `roots: the c plane did not move when the callout changed: ${top0} -> ${top1}`);
  assert((await text('#roots-problem-note')).includes('Fresh numbers'), 'roots: a drag keeps the note (only a preset takes it away)');
  await clickChip(page, 'roots-preset-m16');
  assert((await text('#roots-problem-note')) === '', 'roots: a preset clears the note');
  // distance: the note belongs to the mode that was opened
  await fresh('distance', '1.2.2', { mode: 'two', z1: { re: 1, im: 5 }, z2: { re: -2, im: 1 } });
  await clickChip(page, 'distance-mode-circle');
  assert((await text('#distance-problem-note')) === '', 'distance: the circle mode has no fresh numbers, so no note');
  await clickChip(page, 'distance-mode-two');
  assert((await text('#distance-problem-note')).includes('Fresh numbers'), 'distance: and the two-point mode still does');
  // the video host sits after the plane; a panel appears in it only when the manifest lists the video
  await go('addresses');
  const vid = await page.evaluate(async () => {
    const host = document.getElementById('addresses-video-host'), plane = document.getElementById('addresses-plane-host');
    const after = !!host && !!(plane.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING);
    const { loadManifest, videoFor } = await import('./js/core/listen.js');
    const listed = !!videoFor(await loadManifest(), 'two-addresses');
    const panel = document.getElementById('video-two-addresses');
    return { after, listed, panel: !!panel, inside: !!panel && host.contains(panel), empty: !!host && host.children.length === 0 };
  });
  assert(vid.after, 'the video host is after the plane');
  assert(vid.listed ? (vid.panel && vid.inside) : vid.empty, `the video panel is there exactly when the manifest lists it: ${JSON.stringify(vid)}`);
  // the I6, I7 and I8 scans of tests/interact/i1-integration.mjs on these five pages, on plain visits and on pages opened with fresh numbers
  // (that script stops earlier today, at the stations of other goals): one style of readout and of note (the quoted handout answer is typeset: the
  // radical, the pi sign, the less-or-equal sign, raised exponents), an id on every control (the ghosts of the roots slot and the new chips included),
  // an id on every link and tab stop after the answers are opened, no duplicate id, no z1 / z2 / z0 in a label or tooltip
  const bad = [
    [/(?<![A-Za-z\\])\d*\.?\d*\s?pi(?![A-Za-z(])/, 'ASCII pi'], [/(?<![A-Za-z0-9_])[zwf]0(?![A-Za-z0-9_])/, 'z0 / w0'], [/\d deg\b/, '"deg"'], [/\d\s?degrees?\b/, '"degrees" (write 90°)'], [/\bsqrt\(/, 'sqrt('],
    [/\b(eps|delta|rho) =/, 'eps / delta / rho'], [/\d[eE]\+\d/, '1.5e+25'], [/NaN|Infinity/, 'NaN / Infinity'], [/ <= | >= /, '<= or >='],
  ];
  // the notes under the problem statements are new in iteration 2 and are held to more: no caret (exponents are raised), no "+-", no brace
  const badNote = [[/\^/, 'a caret (exponents are raised)'], [/ \+- /, '+-'], [/[{}]/, 'a brace']];
  const scan = async (route) => {
    const lines = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('#view .readout, #view .callout, #view p, #view li, #view h2, #view h3, #view label, #view button, #view output, #view figcaption')) {
        if (el.closest('.tex-scroll, .katex, [aria-hidden="true"]') || el.matches('p.muted.mono')) continue;
        if (el.children.length > 6 && !el.matches('.readout')) continue;
        const t = el.innerText;
        if (t && t.length < 600) out.push(t);
      }
      return out;
    });
    for (const line of lines.flatMap((l) => l.split('\n'))) {
      for (const [re, what] of bad) assert(!re.test(line), `I6 ${route} prints ${what}: "${line.slice(0, 120)}"`);
      if (line.startsWith('Fresh numbers')) for (const [re, what] of badNote) assert(!re.test(line), `I6 ${route} note prints ${what}: "${line.slice(0, 160)}"`);
    }
    const loose = await page.evaluate(() => [...document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view summary')].filter((e) => !e.id).map((e) => e.tagName.toLowerCase()));
    assert(loose.length === 0, `I7 ${route}: controls without an id: ${loose.join(', ')}`);
    await page.evaluate(() => { for (const d of document.querySelectorAll('#view details')) d.open = true; });
    await page.waitForTimeout(250);
    const noId = await page.evaluate(() => [...document.querySelectorAll('#view a[href], #view [tabindex]:not([tabindex^="-"]), #view [role="button"]')].filter((e) => !e.id).map((e) => e.tagName.toLowerCase() + ' "' + (e.textContent || '').trim().slice(0, 24) + '"'));
    assert(noId.length === 0, `I8 ${route}: links or tab stops without an id: ${noId.join(', ')}`);
    await noDuplicateIds(`I8 ${route}`);
    const lab = await page.evaluate(() => [...document.querySelectorAll('#view [aria-label], #view [title]')].map((e) => (e.getAttribute('aria-label') || '') + ' | ' + (e.getAttribute('title') || '')).filter((t) => /(?<![A-Za-z0-9_])[zw][012](?![A-Za-z0-9_(])/.test(t)));
    assert(lab.length === 0, `I8 ${route}: a label or tooltip with z1, z2 or z0: ${lab.slice(0, 3).join(' ; ')}`);
  };
  for (const route of ['addresses', 'distance', 'powers', 'roots', 'curves', 'problem-1-3-1', 'problem-1-4-3']) { await go(route); await scan(route); }
  // ... and the same pages opened with fresh numbers for every problem the five stations own, so the note's quoted answer is scanned too
  const FRESH = [
    ['addresses', '1.3.1', { z: { re: 0, im: 2 } }], ['distance', '1.2.1', { mode: 'circle', a: { re: 1, im: 2 }, R: 3 }], ['distance', '1.2.2', { mode: 'two', z1: { re: 1, im: 5 }, z2: { re: -2, im: 1 } }],
    ['powers', '1.3.2', { z: { re: Math.SQRT2, im: Math.SQRT2 }, n: 4 }], ['roots', '1.4.1', { c: { re: 1, im: 0 }, n: 7 }], ['roots', '1.4.2', { c: { re: -81, im: 0 }, n: 4 }],
    ['roots', '1.4.3', { quadratic: { a: 1, b: -6, c: 25 } }], ['curves', '1.5.1', { a: { re: 1, im: 2 }, b: { re: -1, im: -2 } }],
  ];
  for (const [st, pid, values] of FRESH) {
    await fresh(st, pid, values);
    await scan(`${st} fresh ${pid}`);
    const note = await page.evaluate((id) => { const n = document.getElementById(id); return n ? { text: n.textContent, sup: n.querySelectorAll('sup').length, h: n.getBoundingClientRect().height } : null; }, `${st}-problem-note`);
    assert(note && /^Fresh numbers from the Rehearsal Room\. Opened with /.test(note.text) && note.text.includes("the handout's own numbers have this answer: "), `the ${st} ${pid} note leads with what was opened, then the handout's answer: "${note && note.text}"`);
  }
  // what the typeset answer looks like in the two notes the reviewer read as ASCII
  await fresh('roots', '1.4.2', { c: { re: -81, im: 0 }, n: 4 });
  const rootsNote = await text('#roots-problem-note');
  assert(rootsNote.includes('2e') && rootsNote.includes('√2 + √2i') && rootsNote.includes('π/4') && !/sqrt|pi\b|\^/.test(rootsNote), `roots note is typeset: "${rootsNote}"`);
  assert((await page.evaluate(() => document.querySelectorAll('#roots-problem-note sup').length)) === 4, 'roots note: the four exponents of e are raised');
  await fresh('addresses', '1.3.1', { z: { re: 0, im: 2 } });
  const adNote = await text('#addresses-problem-note');
  assert(adNote.includes('2π/3') && adNote.includes('k any integer') && !/[{}^]|pi\b/.test(adNote), `addresses note is typeset: "${adNote}"`);
  await fresh('curves', '1.5.1', { a: { re: 1, im: 2 }, b: { re: -1, im: -2 } });
  assert((await text('#curves-problem-note')).includes('0 ≤ t ≤ 1'), `curves note is typeset: "${await text('#curves-problem-note')}"`);
  await fresh('distance', '1.2.1', { mode: 'circle', a: { re: 1, im: 2 }, R: 3 });
  assert((await page.evaluate(() => document.querySelector('#distance-problem-note sup')?.textContent)) === '2', 'distance note: (x - 1)^2 is raised');
  if (phone) {
    await go('problem-1-4-2');
    await page.click('#roots-problem-names');
    await fits('phone: roots with a meaning open');
    await page.click('#roots-quadratic-problem-names');
    await fits('phone: roots quadratic card');
  }
  log('extras: presets take the note away, roots slot stays put, the video host, the I6 I7 I8 scans, the phone');
}
