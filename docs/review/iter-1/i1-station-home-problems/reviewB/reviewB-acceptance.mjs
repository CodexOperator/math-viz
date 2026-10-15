// Review B (throwaway): independent execution of A2, A3, A4 exactly as the goal's "how" text words them,
// with NO stubbed station modules, plus extra probes for the contract (overflow, dark mode, labels, display).
// Run: node tools/smoke.mjs --route home,problems --dark --script docs/review/iter-1/i1-station-home-problems/reviewB/reviewB-acceptance.mjs --out <dir>
import { dragHandle, readText, settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
  const hash = () => page.evaluate(() => location.hash);
  const origin = () => new URL(page.url()).origin;
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  if (ctx.route === 'home') await home();
  else if (ctx.route === 'problems') await problems();

  async function home() {
    await page.waitForSelector('#home-map a.map-station', { timeout: 8000 });
    // ---- A2: map
    const ids = await page.evaluate(async () => (await import('./js/registry.js')).STATIONS.map((s) => s.id));
    const dataIds = await page.evaluate(() => [...document.querySelectorAll('#home-map a.map-station')].map((a) => a.getAttribute('data-station')));
    assert(dataIds.length === 21, `A2: 21 a.map-station (got ${dataIds.length})`);
    assert(JSON.stringify([...dataIds].sort()) === JSON.stringify([...ids].sort()), 'A2: data-station set equals registry ids');
    assert(new Set(dataIds).size === 21, 'A2: every station once');
    const lines = await page.evaluate(() => [...document.querySelectorAll('path.thread-line')].map((p) => ({ t: p.getAttribute('data-thread'), dash: p.getAttribute('stroke-dasharray') })));
    assert(lines.length === 3, `A2: exactly three path.thread-line (got ${lines.length})`);
    assert(['T1', 'T2', 'T3'].every((t) => lines.some((l) => l.t === t)), 'A2: threads T1, T2, T3 present');
    const t2 = lines.find((l) => l.t === 'T2');
    assert(t2 && t2.dash && t2.dash.trim().length > 0, `A2: T2 has non-empty stroke-dasharray (${t2 && t2.dash})`);
    log(`A2 map ok: ${dataIds.length} stations, lines ${JSON.stringify(lines)}`);

    // ---- A2: finder
    await page.fill('#home-finder', '1.4.2');
    await page.waitForSelector('#home-finder-results a[href="#problem-1-4-2"]', { timeout: 4000 });
    const lt = await readText(page, '#home-finder-results a[href="#problem-1-4-2"]');
    assert(lt.includes('roots'), `A2: finder link text includes "roots": ${JSON.stringify(lt)}`);
    await page.click('#home-finder-results a[href="#problem-1-4-2"]');
    await page.waitForFunction(() => location.hash === '#problem-1-4-2', null, { timeout: 5000 });
    assert((await hash()) === '#problem-1-4-2', 'A2: location.hash === #problem-1-4-2');
    await page.waitForTimeout(1200);
    const mounted = await page.evaluate(() => ({ st: document.getElementById('view').dataset.station, h1: (document.querySelector('#view h1') || {}).textContent, err: !!document.querySelector('.station-error, .under-construction') }));
    log(`after finder click: ${JSON.stringify(mounted)}`);
    await shot('after-finder-click');

    // ---- A3 (fresh load of home)
    await page.goto(`${origin()}/index.html#home`, { waitUntil: 'load' });
    await page.waitForSelector('#home-demo-plane-z', { timeout: 8000 });
    await page.waitForTimeout(500);
    const z = await dragHandle(page, 'home-demo-plane-z', { re: 2, im: 1 });
    await settle(page, 4);
    const t = await readText(page, '#home-readout');
    log(`A3 readout: ${JSON.stringify(t)} handle=${JSON.stringify(z)}`);
    for (const want of ['2.236', '0.464', 'r = 2.236']) assert(t.includes(want), `A3: readout has ${want}`);
    assert(t.includes('2 + i') || t.includes('2 + 1i'), 'A3: readout has "2 + i" or "2 + 1i"');
    assert(!t.includes('NaN'), 'A3: readout has no NaN');
    await shot('after-drag');

    // ---- map quality probes (labels, strands) in the current layout
    const probe = await page.evaluate(() => {
      const svg = document.getElementById('home-map');
      const texts = [...svg.querySelectorAll('text.map-label, text.map-part')].map((t) => {
        const b = t.getBBox();
        return { cls: t.getAttribute('class'), s: t.textContent.trim(), x: b.x, y: b.y, w: b.width, h: b.height };
      });
      const overlaps = [];
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], b = texts[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 1 && oy > 1) overlaps.push([a.s, b.s, Math.round(ox), Math.round(oy)]);
      }
      // strand points that fall inside a text bbox
      const hits = [];
      for (const p of svg.querySelectorAll('path.thread-line')) {
        const L = p.getTotalLength();
        for (let d = 0; d < L; d += 2) {
          const q = p.getPointAtLength(d);
          for (const t of texts) if (q.x > t.x && q.x < t.x + t.w && q.y > t.y && q.y < t.y + t.h) { hits.push([p.getAttribute('data-thread'), t.s]); }
        }
      }
      const vb = svg.viewBox.baseVal;
      const outside = texts.filter((t) => t.x < -1 || t.x + t.w > vb.width + 1).map((t) => t.s);
      return { mode: svg.getAttribute('data-mode'), n: texts.length, overlaps, strandHits: [...new Set(hits.map((h) => h.join('~')))], outside, vb: [vb.width, vb.height] };
    });
    log(`map probe: ${JSON.stringify(probe)}`);
    assert(probe.overlaps.length === 0, `map labels do not overlap each other: ${JSON.stringify(probe.overlaps)}`);
    assert(probe.outside.length === 0, `no label leaves the svg viewBox: ${JSON.stringify(probe.outside)}`);
    assert(probe.strandHits.length === 0, `no strand runs through a label: ${JSON.stringify(probe.strandHits)}`);

    // computed stroke colours of the strands (dark mode check) and that none is a literal clash with the background
    const colours = await page.evaluate(() => {
      const bg = getComputedStyle(document.body).backgroundColor;
      const s = [...document.querySelectorAll('path.thread-line')].map((p) => ({ t: p.getAttribute('data-thread'), stroke: getComputedStyle(p).stroke, w: getComputedStyle(p).strokeWidth }));
      return { bg, s };
    });
    log(`strand colours: ${JSON.stringify(colours)}`);
    assert(new Set(colours.s.map((x) => x.stroke)).size === 3, 'three distinct strand colours');
    assert(colours.s.every((x) => x.stroke !== colours.bg), 'no strand has the background colour');

    const ov = await overflow();
    assert(ov <= 1, `no horizontal page overflow (${ov}px)`);
    // the map host and every panel stay inside the viewport
    const wide = await page.evaluate(() => [...document.querySelectorAll('#view *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.tex-scroll, .pc-final, canvas, .katex-display'); }).slice(0, 8).map((e) => `${e.tagName}#${e.id}.${e.className && e.className.baseVal === undefined ? e.className : ''}`));
    log(`elements sticking past the viewport edge: ${JSON.stringify(wide)}`);
    await shot('home-final-B');
  }

  async function problems() {
    await page.waitForSelector('.problem-card', { timeout: 8000 });
    // ---- A4 literal
    assert((await count('.problem-card')) === 29, 'A4: 29 .problem-card');
    assert((await count('.topic-card')) === 12, 'A4: 12 .topic-card');
    const hiddenAtStart = await page.evaluate(() => {
      const a = document.querySelector('.problem-card[data-problem="1.4.2"] .answer');
      return { offsetParent: a.offsetParent === null, hidden: a.hidden, display: getComputedStyle(a).display, h: a.getBoundingClientRect().height };
    });
    log(`1.4.2 answer at start: ${JSON.stringify(hiddenAtStart)}`);
    assert(hiddenAtStart.offsetParent && hiddenAtStart.h === 0, 'A4: answer hidden (offsetParent null, zero height, display none)');
    await page.click('#problems-reveal-1-4-2');
    const shown = await page.evaluate(() => {
      const a = document.querySelector('.problem-card[data-problem="1.4.2"] .answer');
      return { vis: a.offsetParent !== null && a.getBoundingClientRect().height > 20, inner: a.innerText, tc: a.textContent.length, katex: a.querySelectorAll('.katex').length };
    });
    log(`1.4.2 answer after reveal: visible=${shown.vis} katex=${shown.katex} innerText=${JSON.stringify(shown.inner.slice(0, 260))}`);
    assert(shown.vis, 'A4: answer visible after click');
    assert(shown.katex > 0, 'A4: answer has rendered KaTeX');
    assert(shown.inner.includes('2'), 'A4: visible text has "2"');
    assert(/π|pi/.test(shown.inner), 'A4: visible text has pi');
    assert(/√2|sqrt/.test(shown.inner), 'A4: visible text has sqrt2');
    const link = await page.evaluate(() => [...document.querySelectorAll('.problem-card[data-problem="1.4.2"] a[href="#problem-1-4-2"]')].map((a) => a.textContent.trim()));
    assert(link.length >= 1 && link.every((x) => x === 'roots'), `A4: card links to #problem-1-4-2 with text "roots": ${JSON.stringify(link)}`);
    await page.click('#problems-filter-3');
    const vis3 = await page.evaluate(() => [...document.querySelectorAll('.problem-card')].filter((c) => c.offsetParent !== null).map((c) => c.dataset.problem));
    assert(vis3.length === 3 && vis3.every((x) => x.startsWith('3.')), `A4: filter 3 -> exactly 3 visible cards of 3.x: ${vis3.join(',')}`);
    await page.click('#problems-filter-all');
    await page.check('#problems-tick-1-1-1');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(800);
    assert(await page.isChecked('#problems-tick-1-1-1'), 'A4: tick still checked after reload + 800 ms');

    // ---- probes: every answer open, phone/desktop overflow, hidden attribute vs display on all [hidden] things
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((b) => b.click()));
    await settle(page, 4);
    const ov = await overflow();
    assert(ov <= 1, `no horizontal page overflow with all 29 answers open (${ov}px)`);
    const info = await page.evaluate(() => {
      const open = [...document.querySelectorAll('.answer')].filter((a) => !a.hidden).length;
      const cuts = [...document.querySelectorAll('.pc-final')].map((f) => ({ id: f.closest('.problem-card').dataset.problem, sw: f.scrollWidth, cw: f.clientWidth, hint: !f.parentElement.querySelector('.pc-scroll-hint').hidden }));
      const needHint = cuts.filter((c) => c.sw > c.cw + 1);
      const missingHint = needHint.filter((c) => !c.hint);
      return { open, needHint: needHint.length, missingHint };
    });
    log(`all open: ${JSON.stringify(info)}`);
    assert(info.open === 29 && info.missingHint.length === 0, 'every wide answer shows the scroll hint');
    await shot('problems-all-open');
    const noKatexErr = await page.evaluate(() => document.querySelectorAll('.katex-error').length);
    assert(noKatexErr === 0, `no KaTeX error nodes (${noKatexErr})`);
    await page.evaluate(() => document.getElementById('problems-hide-all').click());
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('problems-top-B');
    // clean up the tick so the next viewport starts empty
    await page.evaluate(() => localStorage.clear());
  }
}
