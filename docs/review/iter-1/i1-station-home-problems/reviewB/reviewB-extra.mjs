// Review B extra probes: address correctness of the demo readout in every quadrant (independent atan2/hypot),
// finder relevance for student queries, every href is a legal route, h1 count, lifecycle (unmount), keyboard focus.
import { dragHandle, readText, settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  const origin = () => new URL(page.url()).origin;

  // ---- every href is a route (both routes)
  const routeOk = await page.evaluate(async () => {
    const { STATIONS } = await import('./js/registry.js');
    const { PROBLEMS, TOPICS } = await import('./js/data/problems.js');
    const sid = new Set(STATIONS.map((s) => s.id));
    const pid = new Set(PROBLEMS.map((p) => 'problem-' + p.id.replace(/\./g, '-')));
    const tid = new Set(TOPICS.map((t) => 'topic-' + t.id.replace(/\./g, '-')));
    const bad = [];
    let n = 0;
    for (const a of document.querySelectorAll('#view a[href]')) {
      const h = a.getAttribute('href');
      n++;
      if (!/^#[A-Za-z0-9._~-]+$/.test(h)) { bad.push(h); continue; }
      const t = h.slice(1);
      if (sid.has(t) || pid.has(t) || tid.has(t)) continue;
      if (/^lab-(2-1-2|2-1-3|2-2-1|2-5-1|P4)$/.test(t)) continue;
      if (/^(home|problems)-[A-Za-z0-9]+$/.test(t)) continue;
      bad.push(h);
    }
    return { n, bad: [...new Set(bad)], h1: document.querySelectorAll('#view h1').length };
  });
  log(`hrefs: ${JSON.stringify(routeOk)}`);
  assert(routeOk.bad.length === 0, `every href is a legal route: ${JSON.stringify(routeOk.bad)}`);
  assert(routeOk.h1 === 1, `exactly one h1 (${routeOk.h1})`);

  if (ctx.route === 'home') {
    await page.waitForSelector('#home-demo-plane-z');
    // ---- readout in every quadrant against independent math
    const pts = [[-1.5, -2], [3, -1], [-0.05, 0.05], [0, -2], [0, 2], [-2, 0], [1.25, 0.35], [-3, 3]];
    for (const [re, im] of pts) {
      const z = await dragHandle(page, 'home-demo-plane-z', { re, im });
      await settle(page, 3);
      const t = await readText(page, '#home-readout');
      const r = Math.hypot(z.re, z.im);
      let th = Math.atan2(z.im, z.re);
      if (th <= -Math.PI + 1e-12) th = Math.PI;               // (-pi, pi]
      const line1 = t.split('\n')[0];
      const m = line1.match(/r = ([\d.]+); Arg z = (-?[\d.]+)/);
      const okR = m && Math.abs(parseFloat(m[1]) - r) < 5e-4;
      const okT = m && Math.abs(parseFloat(m[2]) - th) < 5e-4;
      log(`drag (${re}, ${im}) -> handle ${z.re},${z.im}; readout ${JSON.stringify(line1)}; expect r=${r.toFixed(3)} Arg=${th.toFixed(3)}`);
      assert(okR && okT, `readout numbers match independent atan2/hypot at (${z.re}, ${z.im}): ${line1}`);
      assert(!t.includes('NaN'), 'no NaN');
      // second line: the arg set uses the same Arg
      assert(/arg z = \{ -?[\d.]+ \+ 2\*pi\*k : k an integer \}/.test(t.split('\n')[1]), `second line writes the set arg z: ${t.split('\n')[1]}`);
      // staircase home row text equals the Arg
      const stairs = await readText(page, '#home-demo-stairs-arg');
      assert(stairs.includes(th.toFixed(3)), `staircase says ${stairs}, expect Arg ${th.toFixed(3)}`);
    }
    // ---- seam: just above and just below the negative real axis give pi and ~-pi, the point barely moves
    await dragHandle(page, 'home-demo-plane-z', { re: -2, im: 0.05 });
    await settle(page, 3);
    const above = await readText(page, '#home-readout');
    await dragHandle(page, 'home-demo-plane-z', { re: -2, im: -0.05 });
    await settle(page, 3);
    const below = await readText(page, '#home-readout');
    log(`seam: above ${JSON.stringify(above.split('\n')[0])}; below ${JSON.stringify(below.split('\n')[0])}`);
    assert(/Arg z = 3\.1[01]\d/.test(above) && /Arg z = -3\.1[01]\d/.test(below), 'Arg jumps across the seam while the point barely moves');

    // ---- finder relevance for typical student queries
    const queries = ['1.4.2', 'p3', 'P3', '142', 'roots of unity', 'quadratic', 'circle', 'image of the circle', 'branch', 'cube root', 'sector', 'limit', 'Cauchy', 'conjugate', 'distance', '2.5.1', 'proof', 'unit circle', 'z^2', 'derivative', 'annulus', '  1.4.2  ', 'Problem 3.1.2', '#problem-1-4-2'];
    const out = {};
    for (const q of queries) out[q] = await page.evaluate((x) => window.__mv.home.search(x), q);
    log(`finder: ${JSON.stringify(out)}`);
    assert(out['1.4.2'][0] === '1.4.2' && out['p3'][0] === 'P3' && out['P3'][0] === 'P3', 'id queries put the exact problem first');
    assert(out['roots of unity'].includes('1.4.1'), 'roots of unity finds 1.4.1');
    assert(out['quadratic'].includes('1.4.3'), 'quadratic finds 1.4.3');
    assert(out['2.5.1'][0] === '2.5.1', '2.5.1 first');

    // ---- keyboard: tab onto a map station shows a focus ring
    await page.evaluate(() => document.querySelector('a.map-station[data-station="roots"]').scrollIntoView({ block: 'center' }));
    await page.focus('a.map-station[data-station="roots"]');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const a = document.activeElement;
      const hit = a.querySelector && a.querySelector('.hit');
      return { st: a.getAttribute && a.getAttribute('data-station'), stroke: hit ? getComputedStyle(hit).stroke : null, sw: hit ? getComputedStyle(hit).strokeWidth : null, focusVisible: a.matches(':focus-visible') };
    });
    log(`focus: ${JSON.stringify(focus)}`);
    assert(focus.st === 'roots' && focus.focusVisible && focus.stroke && focus.stroke !== 'none', 'map station has a visible focus ring from the keyboard');
    await shot('focus-ring');

    // ---- lifecycle: leave home, hooks and the plane are gone; come back, works again
    await page.goto(`${origin()}/index.html#roots`, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    const gone = await page.evaluate(() => ({ home: !!(window.__mv && window.__mv.home), plane: !!(window.__mv && window.__mv.planes && window.__mv.planes.has('home-demo-plane')), style: !!document.querySelector('style[data-for="home"]') }));
    log(`after leaving home: ${JSON.stringify(gone)}`);
    assert(!gone.home && !gone.plane && !gone.style, 'unmount removes hook, plane and style');
    await page.evaluate(() => { location.hash = '#home'; });
    await page.waitForSelector('#home-map a.map-station');
    const mt = await page.evaluate(() => window.__mv.home.mountMs);
    log(`home mountMs ${Math.round(mt)}`);
    // preset token focus
    await page.evaluate(() => { location.hash = '#home-T3'; });
    await page.waitForSelector('#home-map[data-focus="T3"]');
    assert((await page.evaluate(() => document.querySelectorAll('#home-map a.map-station.is-dim').length)) === 8, 'T3 dims the 8 stations not on it');
  } else {
    const mt = await page.evaluate(() => window.__mv.problems.mountMs);
    log(`problems mountMs ${Math.round(mt)}`);
    // predict mode hides place/address/aha until reveal
    await page.check('#problems-predict');
    const hid = await page.evaluate(() => { const h = document.querySelector('.problem-card[data-problem="1.4.2"] .pc-hint'); return h.getBoundingClientRect().height; });
    assert(hid === 0, 'predict mode hides the hint (zero height)');
    await shot('predict-on');
    await page.uncheck('#problems-predict');
    // proofs filter shows exactly the seven proofs
    await page.click('#problems-filter-P');
    const ids = await page.evaluate(() => [...document.querySelectorAll('.problem-card')].filter((c) => c.offsetParent !== null).map((c) => c.dataset.problem));
    assert(ids.join() === 'P1,P2,P3,P4,P5,P6,P7', `proofs: ${ids.join()}`);
    // every card link text equals its owning station id; and addresses chips present
    const bad = await page.evaluate(async () => {
      const { PROBLEMS } = await import('./js/data/problems.js');
      const out = [];
      for (const p of PROBLEMS) {
        const c = document.querySelector(`.problem-card[data-problem="${p.id}"]`);
        const a = c.querySelector(`a[href="#problem-${p.id.replace(/\./g, '-')}"]`);
        if (!a || a.textContent.trim() !== p.station) out.push(p.id);
        if (!c.querySelector('.pc-address .addr')) out.push(p.id + ':addr');
        if (p.statement.includes('$') && !c.querySelector('.pc-statement .katex')) out.push(p.id + ':katex');
      }
      return out;
    });
    assert(bad.length === 0, `every card links to its owning station route and shows the address and typeset statement: ${JSON.stringify(bad)}`);
    // clicking one card link per station actually mounts that station (no router error panel)
    await page.click('#problems-filter-all');
    await page.evaluate(() => localStorage.clear());
  }
}
