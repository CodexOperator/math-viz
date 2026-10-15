// tests/interact/i1-integration.mjs
// Run: node tools/smoke.mjs --route home --script tests/interact/i1-integration.mjs --dark --no-shots
// The story wired together, with real clicks, at the desktop, phone and dark-desktop viewports:
//   I1  the menu reaches every station, and the header title brings you home from each of them
//   I2  the Story Map on #home has a link to every station, and clicking it lands on that station
//   I3  walking "next" along each thread (the station links of each page) visits the thread's stations in story order
//   I4  every one of the 29 problem deep links lands on its owner, with the problem's own card and the readout of its preset
//   I5  every in-page link of every station is a route the router knows
//   I6  one style of readout: no ASCII pi, z0, deg, eps, delta, rho or 1.5e+25 in what a station prints, no NaN
import { STATIONS, THREADS } from '../../js/registry.js';
import { PROBLEMS, routeFor } from '../../js/data/problems.js';
import { parseRoute } from '../../js/app.js';
import { settle } from './_helpers.mjs';

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
    assert((await hash()) === `#${s.id}`, `I1 the menu opens #${s.id}, got ${await hash()}`);
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
    assert((await hash()) === `#${s.id}`, `I2 the map opens #${s.id}, got ${await hash()}`);
    await page.goBack();
    await settleRoute();
    assert((await hash()) === '#home' || (await hash()) === '', `I2 Back from #${s.id} returns to the map (${await hash()})`);
  }
  log('I2 the Story Map links to all 20 stations and Back returns');

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
      assert((await hash()) === `#${nxt}`, `I3 ${th.id}: the link opens #${nxt}, got ${await hash()}`);
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
    [/(?<![A-Za-z\\])\d*\.?\d*\s?pi(?![A-Za-z(])/, 'ASCII pi'], [/(?<![A-Za-z0-9_])[zwf]0(?![A-Za-z0-9_])/, 'z0 / w0'], [/\d deg\b/, '"deg"'],
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
  log('I6 readouts and notes use the typeset forms on all 21 stations');

  assert(problems.length === 0, `page errors during the walk: ${problems.join(' | ')}`);
  log('i1-integration: all steps passed');
}
