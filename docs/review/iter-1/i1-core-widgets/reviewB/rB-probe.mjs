// Review B independent probe. Run:
//   node tools/smoke.mjs --route widgets-fixture --script docs/review/iter-1/i1-core-widgets/reviewB/rB-probe.mjs --dark --out docs/review/iter-1/i1-core-widgets/reviewB/probe-shots
// Written from the goal text and ARCHITECTURE 3.6-3.8, not from the builder's script.

const frames = (page, n = 2) => page.evaluate((n) => new Promise((res) => { let i = 0; const f = () => (++i >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

export default async function (page, ctx) {
  const { assert, log, shot, viewport } = ctx;
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

  await page.evaluate(async () => {
    const kx = await import('./js/core/katex.js');
    const ex = await import('./js/core/explainer.js');
    const st = await import('./js/core/staircase.js');
    const sec = document.createElement('section'); sec.id = 'rb'; sec.style.cssText = 'padding:8px;display:grid;gap:12px;';
    (document.getElementById('view') || document.body).appendChild(sec);
    window.__rb = { kx, ex, st, sec };
  });

  // ---- 1. clipping: widgets live in overflow:hidden wraps, so overflow would be silent. Check every descendant stays inside.
  const widths = [280, 320, 360, 390, 559, 560, 561, 640, 720];
  const longPolar = 'r^2e^{2i\\theta} + re^{i(\\theta + \\pi/2)} = (r^2\\cos 2\\theta - r\\sin\\theta) + i(r^2\\sin 2\\theta + r\\cos\\theta)';
  const longCart = '(x+iy)^2 + i(x+iy) = (x^2 - y^2 - y) + i(2xy + x)';
  for (const w of widths) {
    const res = await page.evaluate(async ([w, longPolar, longCart]) => {
      const { ex, st, kx, sec } = window.__rb;
      const host = document.createElement('div'); host.style.width = `min(${w}px, 100%)`; sec.appendChild(host);
      const e = ex.createExplainer(host, { id: 'rbx' + w, title: 'Check at ' + w, columns: [
        { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart' }, { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar' }, { key: 'motion', heading: 'As a motion', tone: '--output', tint: true }],
        rows: [
          { id: 'f', label: 'f(z) in full', native: 'polar', cart: () => kx.cart(longCart), polar: () => kx.polar(longPolar), motion: () => ({ text: 'halve the angle, take the square root of the length, then spin' }) },
          { id: 'n', label: 'a long label of a row here', cart: () => kx.cart('\\frac{-1 + i\\sqrt{3}}{2} = e^{2\\pi i/3}'), polar: () => kx.polar('\\sqrt[10]{1024}\\,e^{i\\,(2\\pi/3 + 2\\pi k)/10}') },
        ],
        same: () => ({ cart: kx.cart('1 - 1i'), polar: kx.polar('1 - 1i'), agree: true }) });
      e.update({}); e.flush();
      const hostB = document.createElement('div'); hostB.style.width = host.style.width; sec.appendChild(hostB);
      const s = st.createStaircase(hostB, { id: 'rbs' + w, kMin: -12, kMax: 12, onPick: () => {} }); s.update(0.7 + 2 * Math.PI * 7);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const bad = [];
      const check = (wrapSel, root) => {
        const wrap = root.querySelector(wrapSel); const wr = wrap.getBoundingClientRect();
        for (const n of wrap.querySelectorAll('*')) {
          const r = n.getBoundingClientRect(); if (r.width === 0 && r.height === 0) continue;
          if ((n.closest('svg') && n.closest('svg') !== n) || n.closest('.katex-mathml') || (n.closest('thead') && getComputedStyle(n.closest('thead')).position === 'absolute')) continue; // visually-hidden: MathML mirror, stacked header
          if (r.right > wr.right + 1.5 || r.left < wr.left - 1.5) bad.push(`${wrapSel} ${n.tagName}.${(n.className && n.className.baseVal === undefined ? n.className : '').toString().slice(0, 30)} [${Math.round(r.left - wr.left)},${Math.round(r.right - wr.left)}] vs wrap ${Math.round(wr.width)}`);
        }
        return { wrapW: Math.round(wr.width), scrollW: wrap.scrollWidth, clientW: wrap.clientWidth };
      };
      const a = check('.explainer-wrap', host); const b = check('.staircase-wrap', hostB);
      const narrow = host.querySelector('.explainer-wrap').dataset.narrow;
      const stacked = (() => { const c = document.getElementById(`rbx${w}-f-cart`).getBoundingClientRect(), p = document.getElementById(`rbx${w}-f-polar`).getBoundingClientRect(); return p.top >= c.bottom - 1; })();
      const out = { w, a, b, narrow, stacked, bad: bad.slice(0, 6), pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      e.destroy(); s.destroy(); host.remove(); hostB.remove();
      return out;
    }, [w, longPolar, longCart]);
    log(`width ${w}: ${JSON.stringify(res)}`);
    assert(res.bad.length === 0, `no descendant is clipped by the overflow:hidden wraps at ${w}px: ${res.bad.join(' | ')}`);
    assert(res.a.scrollW <= res.a.clientW + 1 && res.b.scrollW <= res.b.clientW + 1, `no scrollWidth > clientWidth at ${w}px ${JSON.stringify([res.a, res.b])}`);
    assert(res.pageOverflow <= 1, `no page overflow at ${w}px`);
    if (res.a.wrapW <= 560) assert(res.stacked, `stacked when the widget is ${res.a.wrapW}px wide`);
  }

  // ---- 2. id contract (ARCHITECTURE 3.7 / 3.8), checked from scratch
  const ids = await page.evaluate(() => {
    const { ex, st, kx, sec } = window.__rb;
    const host = document.createElement('div'); sec.appendChild(host);
    const e = ex.createExplainer(host, { id: 'idc', columns: [{ key: 'cart', heading: 'C', tone: '--cart' }, { key: 'polar', heading: 'P', tone: '--polar' }], rows: [{ id: 'sum', label: 's', cart: () => 'a', polar: () => 'b' }, { id: 'u_x', label: 'u', cart: () => 'a', polar: () => 'b' }], same: () => ({ cart: 'a', polar: 'b', agree: false }) });
    e.update({}); e.flush();
    const hb = document.createElement('div'); sec.appendChild(hb);
    const s = st.createStaircase(hb, { id: 'idc-s', kMin: -2, kMax: 2 }); s.update(2 * Math.PI / 3);
    const out = {
      cells: ['idc-sum-cart', 'idc-sum-polar', 'idc-u_x-cart', 'idc-u_x-polar', 'idc-same'].map((i) => !!document.getElementById(i)),
      tableClass: host.querySelector('table').className,
      sameText: document.getElementById('idc-same').textContent.replace(/\s+/g, ' '),
      lis: [-2, -1, 0, 1, 2].map((k) => { const li = document.getElementById(`idc-s-k${k}`); return li && li.tagName + ':' + li.getAttribute('data-k') + ':' + li.classList.contains('is-home'); }),
      olClass: hb.querySelector('ol').className, arg: document.getElementById('idc-s-arg').textContent,
      home: [...hb.querySelectorAll('li.is-home')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
    };
    e.destroy(); s.destroy(); host.remove(); hb.remove(); return out;
  });
  log('ids: ' + JSON.stringify(ids));
  assert(ids.cells.every(Boolean) && ids.tableClass === 'explainer', 'cell ids `${id}-${row.id}-${col.key}` and footer `${id}-same` exist; table.explainer');
  assert(/same point: differ/.test(ids.sameText), 'footer text "same point: differ" when agree=false: ' + ids.sameText);
  assert(ids.lis.join() === 'LI:-2:false,LI:-1:false,LI:0:true,LI:1:false,LI:2:false' && ids.olClass === 'staircase', 'li ids ${id}-k${k}, data-k, is-home only on the home step, ol.staircase');
  assert(ids.arg === 'Arg z = 2.094 (2π/3)' && ids.home.length === 1 && ids.home[0].startsWith('Arg z ='), 'home row carries the "Arg z = " prefix: ' + JSON.stringify(ids.home));

  // ---- 3. rAF coalescing counted independently: count render passes through a Proxy-free route (cell function call count per frame)
  const co = await page.evaluate(async () => {
    const { ex, kx, sec } = window.__rb; const host = document.createElement('div'); sec.appendChild(host);
    let calls = 0;
    const e = ex.createExplainer(host, { id: 'coal', rows: [{ id: 'a', label: 'a', cart: (s) => { calls++; return kx.cart(String(s.v)); }, polar: (s) => kx.polar(String(s.v)) }] });
    e.update({ v: 0 }); const first = calls; // synchronous first render
    for (let i = 1; i <= 100; i++) e.update({ v: i });
    const sync = calls;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
    const afterFrames = calls;
    const shown = document.getElementById('coal-a-cart').textContent;
    e.destroy(); host.remove();
    return { first, sync, afterFrames, shown };
  });
  log('coalescing: ' + JSON.stringify(co));
  assert(co.first === 1 && co.sync === 1, 'first update renders once synchronously and 100 more do not render synchronously');
  assert(co.afterFrames <= 3, 'the 100 queued updates collapse to a handful of renders within 3 frames, not 100: ' + co.afterFrames);
  assert(/100/.test(co.shown), 'the last state wins: cell shows ' + co.shown);

  // ---- 4. staircase pulse clears; note clears
  await page.evaluate(() => {
    const { st, sec } = window.__rb; const h = document.createElement('div'); h.id = 'rb-st'; sec.appendChild(h);
    window.__rb.s = st.createStaircase(h, { id: 'rbp' }); window.__rb.s.update(Math.PI - 0.01); window.__rb.s.update(-Math.PI + 0.01);
  });
  assert(await page.evaluate(() => document.querySelector('#rb-st .staircase-wrap').classList.contains('is-jump')), 'pulse class set on a seam crossing');
  await page.waitForTimeout(1200);
  assert(!(await page.evaluate(() => document.querySelector('#rb-st .staircase-wrap').classList.contains('is-jump'))), 'pulse class clears after ~0.9s (the ring in the builder screenshots was transient)');
  await page.waitForTimeout(2600);
  assert((await page.evaluate(() => document.getElementById('rbp-note').textContent)) === '', 'the seam note clears after ~3.5s');

  // ---- 5. hostile inputs never throw
  const hostile = await page.evaluate(() => {
    const { st, ex, kx, sec } = window.__rb; const out = [];
    const s = window.__rb.s;
    for (const v of [NaN, Infinity, -Infinity, undefined, null, '1', 1e300, -1e300, 0, -0, 1e-300, {}, []]) { try { s.update(v); out.push(document.getElementById('rbp-arg').textContent); } catch (e) { out.push('THROW ' + e.message); } }
    const h = document.createElement('div'); sec.appendChild(h);
    let e2; try { e2 = ex.createExplainer(h, { id: 'hs', rows: [{ id: 'a', label: '<img src=x onerror=alert(1)>', cart: () => '<img src=x onerror=1>', polar: () => ({ text: '<b>x</b>' }) }, { id: 'a', label: 'dup' }, null, { label: 'noid' }] }); e2.update(); e2.flush(); e2.setRows(null); e2.setRows([{ id: 'q', cart: () => 5, polar: () => true }]); e2.update(undefined); e2.flush(); out.push('ex ok ' + h.querySelectorAll('img').length + ' imgs'); } catch (e) { out.push('EX THROW ' + e.message); }
    try { ex.createExplainer(h, {}); } catch (e) { out.push('expected throw: ' + e.constructor.name); }
    try { st.createStaircase(h, {}); } catch (e) { out.push('expected throw: ' + e.constructor.name); }
    try { const g = st.createStaircase(h, { id: 'weird id!', kMin: 5, kMax: -5 }); g.update(1); out.push('swapped k ok ' + h.querySelectorAll('#weird-id--list > li').length); g.destroy(); } catch (e) { out.push('SC THROW ' + e.message); }
    try { const g = st.createStaircase(h, { id: 'big', kMin: -100, kMax: 100 }); g.update(1); out.push('big rows ' + h.querySelectorAll('#big-list > li').length); g.destroy(); } catch (e) { out.push('BIG THROW ' + e.message); }
    e2 && e2.destroy(); h.remove();
    out.push('html-escape: ' + kx.texToHtml('<img src=x onerror=alert(1)>').slice(0, 40));
    return out;
  });
  log('hostile: ' + JSON.stringify(hostile));
  assert(!hostile.some((x) => /THROW/.test(x) && !/expected/.test(x)), 'no unexpected throw: ' + hostile.filter((x) => /THROW/.test(x)).join(','));
  assert(hostile.includes('ex ok 0 imgs'), 'row label and cell strings never become live HTML (no <img> created)');

  // ---- 6. theme event: tinted cells recolour via the shell's `themechange` custom event (what theme.js dispatches)
  const th = await page.evaluate(async () => {
    const { ex, kx, sec } = window.__rb; const h = document.createElement('div'); sec.appendChild(h);
    const e = ex.createExplainer(h, { id: 'thm', rows: [{ id: 'a', label: 'a', cart: () => kx.cart('x'), polar: () => kx.polar('y') }] });
    e.update({}); e.flush();
    const col = () => getComputedStyle(h.querySelector('#thm-a-cart .katex-html [style*="color"]')).color;
    const before = col(); const t0 = document.documentElement.getAttribute('data-theme');
    document.documentElement.style.setProperty('--cart', '#ff0000');            // a token change announced the way theme.js announces it
    document.dispatchEvent(new CustomEvent('themechange', { detail: {} }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = col();
    document.documentElement.style.removeProperty('--cart');
    e.destroy(); h.remove(); return { before, after };
  });
  log('theme: ' + JSON.stringify(th));
  assert(th.after === 'rgb(255, 0, 0)' && th.before !== th.after, 'a themechange event re-tints a tinted cell to the new --cart');

  // ---- 7. throughput of a drag-like stream (2.1.1-style explainer + staircase), phone-class budget
  const perf = await page.evaluate(async () => {
    const { ex, st, kx, sec } = window.__rb; const h = document.createElement('div'); const hb = document.createElement('div'); sec.append(h, hb);
    const e = ex.createExplainer(h, { id: 'pf', rows: [
      { id: 'f', label: 'f', cart: (s) => kx.cart(`(${s.x.toFixed(3)} + ${s.y.toFixed(3)}i)^2 = ${(s.x * s.x - s.y * s.y).toFixed(3)} + ${(2 * s.x * s.y).toFixed(3)}i`), polar: (s) => kx.polar(`${(s.x * s.x + s.y * s.y).toFixed(3)}\\,e^{i\\,${(2 * Math.atan2(s.y, s.x)).toFixed(3)}}`) },
      { id: 'u', label: 'u', cart: (s) => kx.cart(s.x.toFixed(3)), polar: (s) => kx.polar(s.y.toFixed(3)) },
      { id: 'v', label: 'v', cart: (s) => kx.cart(s.y.toFixed(3)), polar: (s) => kx.polar(s.x.toFixed(3)) }], same: (s) => ({ cart: kx.cart(s.x.toFixed(3)), polar: kx.polar(s.y.toFixed(3)), agree: true }) });
    const s = st.createStaircase(hb, { id: 'pfs', onPick: () => {} });
    const T = 1200; const t0 = performance.now(); let n = 0; let maxFrame = 0, last = t0, longFrames = 0, frames = 0;
    await new Promise((res) => { const f = (t) => { const dt = t - last; last = t; frames++; if (dt > maxFrame) maxFrame = dt; if (dt > 50) longFrames++; const a = (t - t0) / 400; e.update({ x: 1.5 * Math.cos(a), y: 1.5 * Math.sin(a) }); s.update(a); n++; if (t - t0 < T) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    const out = { frames, n, maxFrameMs: Math.round(maxFrame), longFrames, renders: e.stats.renders, refines: e.stats.refines };
    e.destroy(); s.destroy(); h.remove(); hb.remove(); return out;
  });
  log('perf (headless, software rendering, informational): ' + JSON.stringify(perf));
  assert(perf.longFrames <= Math.ceil(perf.frames * 0.1), `no more than 10% of frames over 50ms during a drag-like stream ${JSON.stringify(perf)}`);

  // ---- finish
  await page.evaluate(() => { document.getElementById('rb').remove(); delete window.__rb; });
  log('console warnings seen (deliberate misuse in step 5): ' + errs.filter((e) => /^warning/.test(e)).join(' | '));
  const bad = errs.filter((e) => !/^warning/.test(e) && !/Failed to load resource.*fonts|fonts\.(googleapis|gstatic)/.test(e));
  assert(bad.length === 0, 'no console errors or warnings: ' + bad.join(' | '));
}
