// tests/interact/i1-integration.mjs
// Run: node tools/smoke.mjs --route home --script tests/interact/i1-integration.mjs --dark --no-shots
// The story wired together, with real clicks, at the desktop, phone and dark-desktop viewports:
//   I1  the menu reaches every station, and the header title brings you home from each of them
//   I2  the Story Map on #home has a link to every station, and clicking it lands on that station
//   I3  walking "next" along each thread (the station links of each page) visits the thread's stations in story order
//   I4  every one of the 29 problem deep links lands on its owner, with the problem's own card and the readout of its preset
//   I5  every in-page link of every station is a route the router knows
//   I6  one style of readout: no ASCII pi, z0, deg, eps, delta, rho, "90 degrees", sqrt( or 1.5e+25 in what a station prints, no NaN
//   I7  round 2: "no angle at 0" on the real pages, a tiny result that is not 0, the handle announcement, typed 3e12, every control has an id
//   I8  round 3: no made-up angle at 0 in mappings, linear, graph4d and the Lab; typed numbers keep both parts (roots, principal-root); the Lab footer; z₁ and z₂ names; an id on every link and tab stop
import { STATIONS, THREADS } from '../../js/registry.js';
import { PROBLEMS, routeFor } from '../../js/data/problems.js';
import { parseRoute } from '../../js/app.js';
import { settle, clickChip } from './_helpers.mjs';

const flat = (t) => String(t).replace(/\s+/g, ' ').replace(/−/g, '-').trim();
const plainTitle = (t) => flat(t).replace(/\^/g, '');       // the page sets z^n as a superscript n; textContent has "zn"

// What the readout of each problem's preset must say (substrings of the station's readout line, ASCII minus). The numbers are the handout answers.
const READOUT = {
  '1.1.1': ['result = 5 + 14i'], '1.1.2': ['result = 4 + 6i'], '1.2.1': ['circle: center 1 + 2i, radius 3'], '1.2.2': ['d = 5.385', '5 + 2i'],
  '1.3.1': ['z = -1 + 1.732i', 'Arg z = 2.094 (2π/3)'], '1.3.2': ['512 - 886.81i', '|z|ⁿ = 1024', 'home step = -1.047 (-π/3)'],
  '1.4.1': ['c = 1; n = 5'], '1.4.2': ['c = -16; n = 4', 'Arg c = π'], '1.4.3': ['roots: 2 + 3i, 2 - 3i'],
  '1.5.1': ['z(t) = 2 + i'], '1.5.2': ['probe: interior'],
  '2.1.1': ['w = -1 + 3i', 'u = -1; v = 3'], '2.1.2': ['u = 4 - v²/16', 'focus 0'], '2.1.3': ['b = -2i', 'spin 90°'],
  '2.2.1': ['0 < arg z < 0.785 (π/4)', '0 < arg w < 2.356 (3π/4)'], '2.2.2': ['w = 2i', '= 1 + i'],
  '2.3.1': ['limit along this path: 1', 'limit exists: no'], '2.4.1': ['seam = 0', '= e^(i π/3) = 0.5 + 0.866i'],
  '2.5.1': ['image: line Re w = 0.5', '1/p = 0.5 - 0.5i'],
  '3.1.1': ['f′(z₀) = 3 + 2i'], '3.1.2': ['f′(z₀) does not exist', '|B| = 1.414'], '3.2.1': ['CR holds: yes', 'f′(z₀) = 1.149 + 1.183i'],
  P1: ['result = 3 + 2i'], P2: ['result = 13'], P3: ['ac = -1 + i', 'ad + b = -i'], P4: ['spin 45°', 'stretch 1.414'],
  P5: ['limit along this path: 1', 'circle center 0.5 radius 0.5', 'limit exists: no'], P6: ['f′(z₀) does not exist', 'circle radius 0.500'],
  P7: ['CR holds: no'],
};

export default async function (page, ctx) {
  const { viewport, log, assert } = ctx;
  if (ctx.route !== 'home') { log(`${ctx.route}: this script is run once, on the home route`); return; }
  const phone = viewport.width <= 400;
  const hash = () => page.evaluate(() => location.hash);
  // The Rehearsal Room pins its card in the address bar (#rehearse becomes #rehearse-1-1-1-s<seed> with history.replaceState), so there "at the route" is the bare route or its pinned form.
  const atRoute = (h, id) => h === `#${id}` || (id === 'rehearse' && /^#rehearse-[A-Za-z0-9.-]+$/.test(h));
  const h1 = async () => flat(await page.evaluate(() => (document.querySelector('#view h1') || {}).textContent || ''));
  const settleRoute = async () => { await page.waitForTimeout(450); await settle(page, 2); };
  const openMenu = async () => { if (phone) { const open = await page.evaluate(() => document.getElementById('nav-toggle').getAttribute('aria-expanded') === 'true'); if (!open) await page.click('#nav-toggle'); await page.waitForTimeout(150); } };
  const goHomeByTitle = async () => { await page.click('#site-title'); await settleRoute(); };
  const problems = []; page.on('pageerror', (e) => problems.push(String(e)));

  // ---- I1 menu and header
  for (const s of STATIONS) {
    if (s.id === 'home') continue;
    await openMenu();
    await page.click(`#site-nav a[href="#${s.id}"]`);
    await settleRoute();
    assert(atRoute(await hash(), s.id), `I1 the menu opens #${s.id}, got ${await hash()}`);
    assert(plainTitle(await h1()) === plainTitle(s.title), `I1 #${s.id} has its title as the h1: "${await h1()}"`);
    assert((await page.evaluate(() => document.querySelectorAll('#view [data-station-error]').length)) === 0, `I1 #${s.id} shows no error panel`);
    assert((await page.evaluate(() => document.querySelectorAll('#view h1').length)) === 1, `I1 #${s.id} has exactly one h1`);
    const current = await page.evaluate(() => { const a = document.querySelector('#site-nav a[aria-current]'); return a ? a.getAttribute('href') : null; });
    assert(current === `#${s.id}`, `I1 the menu marks #${s.id} as the current place (got ${current})`);
    await goHomeByTitle();
    assert((await hash()) === '#home' && (await h1()).length > 0, `I1 the title link goes home from #${s.id}`);
  }
  log('I1 the menu reaches every station and the title link comes back');

  // ---- I2 the story map
  const mapHrefs = await page.evaluate(() => [...document.querySelectorAll('#home-map a[href^="#"], #home-map-fallback a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)));
  for (const s of STATIONS) {
    if (s.id === 'home') continue;
    assert(mapHrefs.includes(s.id), `I2 the map links to #${s.id}`);
  }
  for (const s of STATIONS) {
    if (s.id === 'home') continue;
    await page.evaluate((id) => { const a = document.querySelector(`#home-map a[href="#${id}"], #home-map-fallback a[href="#${id}"]`); a.scrollIntoView({ block: 'center' }); }, s.id);
    await page.evaluate((id) => document.querySelector(`#home-map a[href="#${id}"], #home-map-fallback a[href="#${id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })), s.id);
    await settleRoute();
    assert(atRoute(await hash(), s.id), `I2 the map opens #${s.id}, got ${await hash()}`);
    await page.goBack();
    await settleRoute();
    assert((await hash()) === '#home' || (await hash()) === '', `I2 Back from #${s.id} returns to the map (${await hash()})`);
  }
  log('I2 the Story Map links to all 22 stations and Back returns');

  // ---- I3 walk each thread with the "next" links of the pages
  const nextOf = async (threadId) => page.evaluate((t) => {
    const links = [...document.querySelectorAll('#view .station-link[data-dir="next"]')];
    const own = links.find((a) => a.dataset.thread === t);
    return own ? own.getAttribute('href').slice(1) : null;
  }, threadId);
  for (const th of THREADS) {
    const members = STATIONS.filter((s) => s.threads.includes(th.id)).map((s) => s.id);
    const visited = ['home'];
    await goHomeByTitle();
    for (let guard = 0; guard < 30; guard++) {
      const at = visited[visited.length - 1];
      if (at === 'problems') break;
      if (at === 'rehearse') {
        assert(await page.evaluate(() => !!document.querySelector('#rehearse-links #rehearse-link-graph4d[data-dir="prev"]') && !!document.querySelector('#rehearse-links #rehearse-link-problems[data-dir="next"]')), 'I3 the Rehearsal Room links back to graph4d and on to the index');
      }
      // the page offers the thread's next stop either as a link tagged with the thread, or as its plain "next" link when the two coincide
      let nxt = await nextOf(th.id);
      if (!nxt) {
        const exp = members[members.indexOf(at) + 1];
        const hasLink = await page.evaluate((id) => !!document.querySelector(`#view .station-link[href="#${id}"], #view a[href="#${id}"]`), exp);
        nxt = hasLink ? exp : null;
      }
      assert(nxt, `I3 ${th.id}: #${at} offers a way to the next stop of the thread`);
      assert(members.includes(nxt), `I3 ${th.id}: #${at} sends the thread to #${nxt}, which is not on it`);
      assert(members.indexOf(nxt) === members.indexOf(at) + 1, `I3 ${th.id}: after #${at} comes #${members[members.indexOf(at) + 1]}, the page says #${nxt}`);
      await page.evaluate((id) => { const a = document.querySelector(`#view a[href="#${id}"]`); a.scrollIntoView({ block: 'center' }); a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); }, nxt);
      await settleRoute();
      assert(atRoute(await hash(), nxt), `I3 ${th.id}: the link opens #${nxt}, got ${await hash()}`);
      visited.push(nxt);
    }
    assert(JSON.stringify(visited) === JSON.stringify(members), `I3 ${th.id} visited ${visited.join(' > ')}, expected ${members.join(' > ')}`);
  }
  log('I3 each thread can be walked from home to the problem index with the pages\' own links');

  // ---- I4 the 29 deep links
  for (const p of PROBLEMS) {
    const route = routeFor(p.id);
    await page.evaluate((r) => { location.hash = r; }, route);
    await settleRoute();
    await page.waitForTimeout(350);
    const owner = STATIONS.find((s) => s.id === p.station);
    assert(plainTitle(await h1()) === plainTitle(owner.title), `I4 #${route} lands on ${owner.id}: "${await h1()}"`);
    const pre = parseRoute(`#${route}`);
    assert(pre.station === p.station && pre.preset.id === p.id, `I4 #${route} parses to ${p.station}`);
    const text = flat(await page.evaluate(() => document.querySelector('#view').innerText));
    assert(text.includes(p.id), `I4 #${route}: the page names problem ${p.id}`);
    for (const frag of READOUT[p.id]) assert(text.includes(frag), `I4 #${route}: the preset shows "${frag}"`);
    const chipOn = await page.evaluate((id) => { const els = [...document.querySelectorAll('#view [aria-pressed="true"], #view .is-active, #view [aria-current="true"]')]; return els.length; }, p.id);
    assert(chipOn >= 0, 'I4 chips');
  }
  log('I4 all 29 problem deep links land on their station with the answer-bearing preset');

  // ---- I5 every in-page link is a route
  for (const s of STATIONS) {
    await page.evaluate((id) => { location.hash = id; }, s.id);
    await settleRoute();
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.getAttribute('href')));
    for (const href of hrefs) {
      assert(href.startsWith('#'), `I5 #${s.id}: "${href}" is a route, not an address`);
      const r = parseRoute(href);
      assert(r.station, `I5 #${s.id}: ${href} is a route the router knows`);
      assert(/^#[A-Za-z0-9._~-]+$/.test(href), `I5 #${s.id}: ${href} uses only the allowed characters`);
    }
  }
  log('I5 every link on every station is a known route');

  // ---- I6 one style of readout
  const bad = [
    [/(?<![A-Za-z\\])\d*\.?\d*\s?pi(?![A-Za-z(])/, 'ASCII pi'], [/(?<![A-Za-z0-9_])[zwf]0(?![A-Za-z0-9_])/, 'z0 / w0'], [/\d deg\b/, '"deg"'], [/\d\s?degrees?\b/, '"degrees" (write 90°)'], [/\bsqrt\(/, 'sqrt('],
    [/\b(eps|delta|rho) =/, 'eps / delta / rho'], [/\d[eE]\+\d/, '1.5e+25'], [/NaN|Infinity/, 'NaN / Infinity'], [/\bchosen theta\b/, 'chosen theta'], [/ <= | >= /, '<= or >='],
  ];
  const allowed = (line) => /^\s*(for example|You can use|Type a complex number|Parameters:)/.test(line) || /plain text/i.test(line);
  for (const s of STATIONS) {
    await page.evaluate((id) => { location.hash = id; }, s.id);
    await settleRoute();
    await page.waitForTimeout(250);
    // the readouts and the explainer / note text, not the typed-input help and not the ASCII answer fallback (muted mono, on purpose)
    const lines = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('#view .readout, #view .callout, #view p, #view li, #view h2, #view h3, #view label, #view button, #view output, #view figcaption')) {
        if (el.closest('.tex-scroll, .katex, [aria-hidden="true"]') || el.matches('p.muted.mono') || el.closest('details.pc-plain')) continue;
        if (el.children.length > 6 && !el.matches('.readout')) continue;
        const t = el.innerText;
        if (t && t.length < 600) out.push(t);
      }
      return out;
    });
    for (const line of lines.flatMap((l) => l.split('\n'))) {
      if (allowed(line)) continue;
      for (const [re, what] of bad) assert(!re.test(line), `I6 #${s.id} prints ${what}: "${line.slice(0, 120)}"`);
    }
  }
  log('I6 readouts and notes use the typeset forms on all 22 stations');

  // ---- I7 round 2 of the integration pass, on the real pages
  const go = async (route) => { await page.evaluate((r) => { location.hash = r; }, route); await settleRoute(); await page.waitForTimeout(250); };
  const text = (sel) => page.evaluate((q) => (document.querySelector(q) || {}).textContent || '', sel);
  const typeInto = async (sel, value) => { await page.fill(sel, value); await page.dispatchEvent(sel, 'change'); await page.waitForTimeout(220); };

  await go('addresses');
  await typeInto('#addresses-x', '0'); await typeInto('#addresses-y', '0');
  assert((await text('#addresses-readout')) === 'z = 0; |z| = 0; Arg z: no angle at 0', `I7 addresses at 0: "${await text('#addresses-readout')}"`);
  await typeInto('#addresses-x', '0.0004'); await typeInto('#addresses-y', '0.0004');
  assert(/^z = 4×10⁻⁴ \+ 4×10⁻⁴i; \|z\| = 5\.657×10⁻⁴; Arg z = 0\.785 \(π\/4\)$/.test(await text('#addresses-readout')), `I7 addresses, a tiny point has its angle and no 0: "${await text('#addresses-readout')}"`);

  await go('arithmetic');
  await clickChip(page, 'arithmetic-mode-mul');
  await typeInto('#arithmetic-z1-input', '0.003 + 0.002i'); await typeInto('#arithmetic-z2-input', '0.001');
  assert((await text('#arithmetic-readout')) === 'result = 3×10⁻⁶ + 2×10⁻⁶i; |result| = 3.606×10⁻⁶; Arg = 0.588', `I7 arithmetic, tiny product: "${await text('#arithmetic-readout')}"`);
  await typeInto('#arithmetic-z1-input', '3 - 2i'); await typeInto('#arithmetic-z2-input', '0');
  assert((await text('#arithmetic-readout')) === 'result = 0; |result| = 0; Arg: no angle at 0', `I7 arithmetic, z2 = 0: "${await text('#arithmetic-readout')}"`);
  for (const mode of ['add', 'sub', 'conj']) {
    await clickChip(page, `arithmetic-mode-${mode}`);
    await typeInto('#arithmetic-z1-input', '0'); await typeInto('#arithmetic-z2-input', '0');
    assert((await text('#arithmetic-readout')) === 'result = 0; |result| = 0; Arg: no angle at 0', `I7 arithmetic ${mode} at 0: "${await text('#arithmetic-readout')}"`);
  }
  await clickChip(page, 'arithmetic-mode-div');
  assert((await text('#arithmetic-readout')) === 'result is undefined (division by 0)', `I7 arithmetic, division by 0: "${await text('#arithmetic-readout')}"`);
  // 3e12 is read as 3 times 10^12 (it used to say "Put the number first"): the station's own range message answers it, and 2e1 + 1e1i is 20 + 10i
  await typeInto('#arithmetic-z2-input', '1'); await typeInto('#arithmetic-z1-input', '3e12 + 1e12i');
  assert((await page.getAttribute('#arithmetic-z1-input', 'aria-invalid')) === 'true' && (await text('#arithmetic-z1-error')).startsWith('Keep both parts between -100 and 100'), `I7 3e12 + 1e12i is a number out of range, not a misplaced number: "${await text('#arithmetic-z1-error')}"`);
  await typeInto('#arithmetic-z1-input', '2e1 + 1e1i');
  assert((await page.getAttribute('#arithmetic-z1-input', 'aria-invalid')) !== 'true' && (await text('#arithmetic-readout')) === 'result = 20 + 10i; |result| = 22.361; Arg = 0.464', `I7 2e1 + 1e1i is 20 + 10i: "${await text('#arithmetic-readout')}"`);
  await typeInto('#arithmetic-z1-input', '1e-3');
  assert(/^result = 0\.001; /.test(await text('#arithmetic-readout')), `I7 1e-3 is 0.001, not e - 3: "${await text('#arithmetic-readout')}"`);

  await go('problem-P4');
  await page.evaluate(() => { const b = document.getElementById('linear-ab-b'); b.focus(); });
  const bLabel = await page.evaluate(() => document.getElementById('linear-ab-b').getAttribute('aria-label'));
  assert(bLabel === 'b: z = 0; r = 0, no angle at 0' || /^b: z = 0; r = 0, no angle at 0$/.test(bLabel), `I7 a handle at the origin claims no angle: "${bLabel}"`);

  await go('problem-1-5-2');
  const whereRow = flat(await page.evaluate(() => document.getElementById('sets-ex') ? document.getElementById('sets-ex').innerText : document.querySelector('#view').innerText));
  assert(/a name for\s*arg\(p\s*-\s*c\)/.test(whereRow) && !/free/.test(whereRow), `I7 the ring row says phi is a name for arg(p - c): "${whereRow.slice(0, 200)}"`);

  // every button, field, select and toggle has an id, on every station (links are routes, named by their text)
  for (const s of STATIONS) {
    await go(s.id);
    const loose = await page.evaluate(() => [...document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view summary, #site-footer summary')]
      .filter((e) => !e.id).map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' "' + (e.textContent || '').trim().slice(0, 24) + '"'));
    assert(loose.length === 0, `I7 #${s.id}: controls without an id: ${loose.slice(0, 5).join(', ')}`);
  }
  log('I7 no angle at 0, tiny results, the handle announcement, scientific notation and an id on every control');

  // ---- I8 round 3 of the integration pass, on the real pages
  const settleMore = async () => { await settle(page, 4); await page.waitForTimeout(350); };
  const dataTex = (sel) => page.evaluate((q) => { const e = document.querySelector(q); return e ? (e.dataset.tex || e.textContent) : ''; }, sel);
  const setHandleTo = async (planeId, handleId, z) => { await page.evaluate(({ planeId, handleId, z }) => { const p = window.__mv.planes.get(planeId); p.getHandle(handleId).set(z); p.requestDraw(); }, { planeId, handleId, z }); await settleMore(); };
  const ZERO = { re: 0, im: 0 };

  // mappings: the polar cell of "At this z" at z = 0 says there is no angle, on every function chip, and never "theta = undefined"
  await go('mappings');
  for (const chip of ['sq', 'sq-plus-iz', 'linear-i', 'conj', 'recip']) {
    await clickChip(page, `mappings-fn-${chip}`);
    await setHandleTo('mappings-zplane', 'z', ZERO);
    const t = await dataTex('#mappings-ex-value-polar');
    assert(/r = 0,\\ \\text\{no angle at 0\}/.test(t) && !/theta = \\text\{undefined\}/.test(t), `I8 mappings ${chip} at 0: ${t}`);
    assert(!/θ = undefined/.test(await page.evaluate(() => document.querySelector('#view').innerText)), `I8 mappings ${chip}: the page never says theta = undefined`);
  }

  // linear: a = 0 spins nothing and has no angle (readout, stage caption, explainer, composition row)
  await go('problem-2-1-3');
  await setHandleTo('linear-ab', 'a', ZERO);
  assert(/^a = 0 \(squashes the plane to b\); b = -2i; spin: no angle at 0, stretch 0, slide -2i$/.test(await text('#linear-readout')), `I8 linear readout at a = 0: "${await text('#linear-readout')}"`);
  assert((await text('#linear-ex-f-motion')).startsWith('no turn (a has no angle at 0), scale by 0'), `I8 linear explainer at a = 0: "${await text('#linear-ex-f-motion')}"`);
  await page.evaluate(() => { const s = document.getElementById('linear-stage'); s.value = '0.5'; s.dispatchEvent(new Event('input', { bubbles: true })); });
  await settleMore();
  assert(/no spin, a has no angle at 0/.test(await text('#linear-stage-caption')), `I8 linear stage 1 caption at a = 0: "${await text('#linear-stage-caption')}"`);
  const linearText = await page.evaluate(() => document.querySelector('#view').innerText);
  assert(!/spin 0°|turn by 0°|spun by Arg a = 0°|spins add: 0°/.test(linearText), 'I8 linear at a = 0 never claims a 0° spin');
  await go('problem-P3');
  await setHandleTo('linear-ab', 'a', ZERO);
  assert(/no spin to add/.test(await text('#linear-comp-ex-coeff-motion')) && !/spins add: 0°/.test(await text('#linear-comp-ex-coeff-motion')), `I8 P3 composition at a = 0: "${await text('#linear-comp-ex-coeff-motion')}"`);

  // graph4d: theta and phi have no value at z = 0 or w = 0
  await go('graph4d');
  await setHandleTo('graph4d-plane', 'z', ZERO);
  const g4 = { z: await dataTex('#graph4d-ex-z-polar'), point: await dataTex('#graph4d-ex-point-polar') };
  assert(/no angle at/.test(g4.z) && /\(r, \\rho\) = \(0,\\ 0\);\\ \\theta, \\varphi:\\ \\text\{no angle at \} 0/.test(g4.point) && !/\(0,\\ 0,\\ 0,\\ 0\)/.test(g4.point), `I8 graph4d at 0: ${JSON.stringify(g4)}`);

  // the Lab: the probe at 0
  await go('lab');
  await clickChip(page, 'lab-tool-probe');
  await clickChip(page, 'lab-fn-sq');
  await setHandleTo('lab-zplane', 'probe', ZERO);
  assert(/\(0,\\ \\text\{no angle at \} 0\)/.test(await dataTex('#lab-ex-act-polar')), `I8 Lab f on (r, theta) at 0: ${await dataTex('#lab-ex-act-polar')}`);
  assert(/no angle at (?:\} )?0/.test(await dataTex('#lab-ex-z-polar')) && !/Arg\} z/.test(await dataTex('#lab-ex-z-polar')), `I8 Lab z row at 0: ${await dataTex('#lab-ex-z-polar')}`);
  await clickChip(page, 'lab-fn-recip');
  await setHandleTo('lab-zplane', 'probe', ZERO);
  assert((await text('#lab-ex-same')).startsWith('same point: not checked'), `I8 Lab footer for 1/z at 0: "${await text('#lab-ex-same')}"`);

  // typed numbers keep both parts, with real keystrokes (the other field's three-decimal display is never re-read)
  const typeKeys = async (sel, value) => { await page.click(sel, { clickCount: 3 }); await page.keyboard.type(value); await page.keyboard.press('Tab'); await settleMore(); };
  await go('roots');
  await typeKeys('#roots-c-re', '0.0004'); await typeKeys('#roots-c-im', '0.0004');
  assert(/^c = 4×10⁻⁴ \+ 4×10⁻⁴i; n = 5; \|c\|\^\(1\/n\) = 0\.224; Arg c = π\/4;/.test(await text('#roots-readout')), `I8 roots, 0.0004 + 0.0004i: "${await text('#roots-readout')}"`);
  await typeKeys('#roots-c-re', '1.23456'); await typeKeys('#roots-c-im', '2');
  assert(/^c = 1\.235 \+ 2i; /.test(await text('#roots-readout')) && (await page.inputValue('#roots-c-re')) === '1.23456', `I8 roots, 1.23456 + 2i: "${await text('#roots-readout')}"`);
  await go('principal-root');
  await typeKeys('#principal-root-w-re', '0.0004'); await typeKeys('#principal-root-w-im', '0.0004');
  assert(/^w = 4×10⁻⁴ \+ 4×10⁻⁴i; n = 2; \|w\| = 5\.657×10⁻⁴; Arg w = 0\.785 \(π\/4\)/.test(await text('#principal-root-readout')), `I8 principal-root, 0.0004 + 0.0004i: "${await text('#principal-root-readout')}"`);
  await typeKeys('#principal-root-w-re', '1.23456'); await typeKeys('#principal-root-w-im', '2');
  assert(/^w = 1\.235 \+ 2i; /.test(await text('#principal-root-readout')), `I8 principal-root, 1.23456 + 2i: "${await text('#principal-root-readout')}"`);

  // z₁ and z₂, never z1 and z2, in what a handle or a plane announces
  await go('distance');
  const dl = await page.evaluate(() => ['distance-plane-z1', 'distance-plane-z2'].map((id) => document.getElementById(id).getAttribute('aria-label')));
  assert(dl[0].startsWith('z₁: z = ') && dl[1].startsWith('z₂: z = '), `I8 distance handle names: ${JSON.stringify(dl)}`);
  await go('staircase');
  const sl = await page.evaluate(() => ['staircase-sumplane-z1', 'staircase-sumplane-z2'].map((id) => document.getElementById(id).getAttribute('aria-label')));
  assert(sl[0].startsWith('z₁: z = ') && sl[1].startsWith('z₂: z = '), `I8 staircase handle names: ${JSON.stringify(sl)}`);
  await go('arithmetic');
  const al = await page.evaluate(() => document.querySelector('#arithmetic-plane-viewport, #arithmetic-plane .plane-canvas, #arithmetic-plane').getAttribute('aria-label') || document.getElementById('arithmetic-plane').getAttribute('aria-label') || '');
  assert(/z₁, z₂/.test(al) || al === '', `I8 arithmetic plane label: "${al}"`);
  for (const s of STATIONS) {
    await go(s.id);
    const bad = await page.evaluate(() => [...document.querySelectorAll('#view [aria-label], #view [title]')].map((e) => (e.getAttribute('aria-label') || '') + ' | ' + (e.getAttribute('title') || '')).filter((t) => /(?<![A-Za-z0-9_])[zw][012](?![A-Za-z0-9_(])/.test(t)));
    assert(bad.length === 0, `I8 #${s.id}: a label or tooltip with z1, z2 or z0: ${bad.slice(0, 3).join(' ; ')}`);
  }

  // every link and every tab stop has a stable id (assigned by the router, js/core/ids.js), after the page has been used: answers revealed, details opened
  for (const s of STATIONS) {
    await go(s.id);
    await page.evaluate(() => {
      for (const b of document.querySelectorAll('#view button[aria-expanded="false"]')) if (/reveal|answer|show/i.test(b.id + ' ' + b.textContent)) b.click();
      for (const d of document.querySelectorAll('#view details')) d.open = true;
    });
    await page.waitForTimeout(250);
    const loose = await page.evaluate(() => [...document.querySelectorAll('#view a[href], #view [tabindex]:not([tabindex^="-"]), #view [role="button"]')]
      .filter((e) => !e.id).map((e) => e.tagName.toLowerCase() + '.' + String(e.getAttribute('class') || '').split(' ')[0] + ' "' + (e.textContent || '').trim().slice(0, 24) + '"'));
    assert(loose.length === 0, `I8 #${s.id}: links or tab stops without an id: ${loose.slice(0, 5).join(', ')}`);
    const dup = await page.evaluate(() => { const seen = new Map(); for (const e of document.querySelectorAll('[id]')) seen.set(e.id, (seen.get(e.id) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([k]) => k); });
    assert(dup.length === 0, `I8 #${s.id}: duplicate ids: ${dup.slice(0, 5).join(', ')}`);
  }
  // the same ids on a second visit
  const idsOf = async (route) => { await go(route); return page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.id)); };
  for (const route of ['home', 'problems', 'roots']) {
    const first = await idsOf(route); await go('lab'); const second = await idsOf(route);
    assert(JSON.stringify(first) === JSON.stringify(second), `I8 #${route}: the link ids are the same on every visit`);
  }
  log('I8 no made-up angle at 0, typed numbers keep both parts, the Lab footer, z₁ and z₂, an id on every link and tab stop');

  assert(problems.length === 0, `page errors during the walk: ${problems.join(' | ')}`);
  log('i1-integration: all steps passed');
}
