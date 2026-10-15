// tests/interact/i1-core-widgets.mjs
// Run:  node tools/smoke.mjs --route widgets-fixture --script tests/interact/i1-core-widgets.mjs --dark
// The route token is deliberately unknown: the router shows its "No such place" panel, which is a normal page,
// so this script needs the shell (index.html, KaTeX script, theme.css) but no station.
// All fixtures are built inside the page from the real modules and appended to #view (the shell's body is a grid, so a stray <body> child would get a sidebar-sized cell).

const frames = (page, n = 2) => page.evaluate((n) => new Promise((res) => {
  let i = 0; const f = () => (++i >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);

export default async function (page, ctx) {
  const { assert, log, shot, viewport } = ctx;
  const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
  const attr = (sel, a) => page.evaluate(([s, a]) => { const e = document.querySelector(s); return e ? e.getAttribute(a) : null; }, [sel, a]);
  const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
  const hasClass = (sel, c) => page.evaluate(([s, c]) => { const e = document.querySelector(s); return !!e && e.classList.contains(c); }, [sel, c]);
  const rect = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
  const run = (fn, arg) => page.evaluate(fn, arg);
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e)));
  await page.evaluate(() => { window.__iwWinErrors = []; window.addEventListener('error', (e) => window.__iwWinErrors.push(String(e.message))); });

  // ---------------------------------------------------------------- fixtures
  await run(async () => {
    const kx = await import('./js/core/katex.js');
    const ex = await import('./js/core/explainer.js');
    const st = await import('./js/core/staircase.js');
    const sec = document.createElement('section');
    sec.id = 'iw-fixture';
    sec.style.cssText = 'padding:12px;display:grid;gap:16px;';
    sec.innerHTML = `
      <div style="width:min(720px,100%)"><div id="iw-ex-host"></div></div>
      <div style="width:320px;max-width:100%"><div id="iw-ex2-host"></div></div>
      <div style="width:min(720px,100%)"><div id="iw-ex3-host"></div></div>
      <div style="width:min(720px,100%)"><div id="iw-ex4-host"></div></div>
      <div style="width:min(720px,100%)"><div id="iw-ex5-host"></div></div>
      <div style="width:min(420px,100%)"><div id="iw-st-host"></div></div>
      <div style="width:min(420px,100%)"><div id="iw-st2-host"></div></div>`;
    (document.getElementById('view') || document.body).appendChild(sec);      // inside #view: <body> is a grid in the real shell
    const { cart, polar } = kx;
    const fmt = (x) => { const s = String(Math.round(x * 1000) / 1000); return s === '-0' ? '0' : s; };
    const cx = (re, im) => `${fmt(re)} ${im < 0 ? '-' : '+'} ${fmt(Math.abs(im))}i`;
    const mul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
    const abs = (z) => Math.hypot(z.re, z.im); const arg = (z) => Math.atan2(z.im, z.re);
    const D = (id) => document.getElementById(id);

    // E1: problem 1.1.1 (multiply) -- default columns, native badges, empty row, throwing row, bad TeX
    const rows1 = () => [
      { id: 'product', label: 'z\u2081z\u2082', native: 'polar',
        cart: (s) => { const p = mul(s.z1, s.z2); return cart(cx(p.re, p.im)); },
        polar: (s) => polar(`${fmt(abs(s.z1) * abs(s.z2))}\\,e^{i\\,${fmt(arg(s.z1) + arg(s.z2))}}`) },
      { id: 'sum', label: 'z\u2081 + z\u2082', native: 'cart',
        cart: (s) => cart(cx(s.z1.re + s.z2.re, s.z1.im + s.z2.im)),
        polar: (s) => { const z = { re: s.z1.re + s.z2.re, im: s.z1.im + s.z2.im }; return polar(`${fmt(abs(z))}\\,e^{i\\,${fmt(arg(z))}}`); } },
      { id: 'blank', label: 'nothing', cart: () => null, polar: () => '' },
      { id: 'boom', label: 'throws', cart: () => { throw new Error('boom'); }, polar: () => '\\badcommand{' },
    ];
    const same1 = (s) => { const p = mul(s.z1, s.z2); return { cart: cart(cx(p.re, p.im)), polar: polar(`${fmt(abs(p))}\\,e^{i\\,${fmt(arg(p))}}`), agree: s.agree !== false }; };
    const s0 = { z1: { re: 3, im: -2 }, z2: { re: -1, im: 4 } };
    const prevErr = console.error; const caught = []; console.error = (...a) => { caught.push(a.join(' ')); };
    const ex1 = ex.createExplainer(D('iw-ex-host'), { id: 'iw-ex', title: 'Multiply z\u2081 by z\u2082', rows: rows1(), same: same1 });
    const ex2 = ex.createExplainer(D('iw-ex2-host'), { id: 'iw-ex2', rows: rows1().slice(0, 2), same: same1 });
    ex1.update(s0); ex2.update(s0);
    console.error = prevErr;

    // E2: problem 2.1.1, f(z) = z^2 + iz in both addresses; `same` compares the two evaluations numerically
    const rows3 = [
      { id: 'expand', label: 'f(z)',
        cart: () => cart('(x+iy)^2 + i(x+iy) = (x^2 - y^2 - y) + i(2xy + x)'),
        polar: () => polar('r^2e^{2i\\theta} + re^{i(\\theta + \\pi/2)} = (r^2\\cos 2\\theta - r\\sin\\theta) + i(r^2\\sin 2\\theta + r\\cos\\theta)') },
      { id: 'u', label: 'u', cart: (s) => cart(fmt(s.x * s.x - s.y * s.y - s.y)), polar: (s) => polar(fmt(s.r * s.r * Math.cos(2 * s.t) - s.r * Math.sin(s.t))) },
      { id: 'v', label: 'v', cart: (s) => cart(fmt(2 * s.x * s.y + s.x)), polar: (s) => polar(fmt(s.r * s.r * Math.sin(2 * s.t) + s.r * Math.cos(s.t))) },
    ];
    const same3 = (s) => {
      const u1 = s.x * s.x - s.y * s.y - s.y; const v1 = 2 * s.x * s.y + s.x;
      const u2 = s.r * s.r * Math.cos(2 * s.t) - s.r * Math.sin(s.t); const v2 = s.r * s.r * Math.sin(2 * s.t) + s.r * Math.cos(s.t);
      return { cart: cart(cx(u1, v1)), polar: polar(cx(u2, v2)), agree: Math.abs(u1 - u2) < 1e-9 && Math.abs(v1 - v2) < 1e-9 };
    };
    const at = (x, y) => ({ x, y, r: Math.hypot(x, y), t: Math.atan2(y, x) });
    const ex3 = ex.createExplainer(D('iw-ex3-host'), { id: 'iw-ex3', title: 'f(z) = z\u00b2 + iz', rows: rows3, same: same3 });
    ex3.update(at(1, 1));

    // E3: problem 3.2.1, custom column keys (along dx / along dy), no native badge
    const E = (s) => Math.exp(s.x);
    const cols4 = [{ key: 'dx', heading: 'along \u0394x', tone: '--cart', short: '\u0394x' }, { key: 'dy', heading: 'along i\u0394y', tone: '--polar', short: 'i\u0394y' }];
    const ex4 = ex.createExplainer(D('iw-ex4-host'), { id: 'iw-ex4', columns: cols4,
      rows: [{ id: 'limit', label: 'f\u2032(z\u2080)',
        dx: (s) => cart(`u_x + i v_x = ${cx(E(s) * Math.cos(s.y), E(s) * Math.sin(s.y))}`),
        dy: (s) => polar(`v_y - i u_y = ${cx(E(s) * Math.cos(s.y), E(s) * Math.sin(s.y))}`) }],
      same: (s) => ({ dx: cart(cx(E(s) * Math.cos(s.y), E(s) * Math.sin(s.y))), dy: polar(cx(E(s) * Math.cos(s.y), E(s) * Math.sin(s.y))), agree: true }) });
    ex4.update({ x: 0.5, y: 0.8 });

    // E4: problem 2.2.2, three columns (the third is "as a motion")
    const cols5 = [{ key: 'cart', heading: 'Cartesian (slide)', tone: '--cart' }, { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar' },
      { key: 'motion', heading: 'As a motion', tone: '--output', short: 'Motion', tint: true }];
    const ex5 = ex.createExplainer(D('iw-ex5-host'), { id: 'iw-ex5', columns: cols5,
      rows: [{ id: 'root', label: '(2i)^{1/2}', native: 'polar', cart: () => cart('1 + i'), polar: () => polar('\\sqrt{2}\\,e^{i\\pi/4}'), motion: () => ({ text: 'halve the angle, take the square root of the length' }) }] });
    ex5.update({});

    // staircases: iw-st (k -2..2, onPick) and iw-st2 (k 0..5, no onPick)
    const picks = [];
    const stairs = st.createStaircase(D('iw-st-host'), { id: 'iw-st', kMin: -2, kMax: 2, onPick: (k) => picks.push(k) });
    stairs.update(2 * Math.PI / 3);
    const stairs2 = st.createStaircase(D('iw-st2-host'), { id: 'iw-st2', kMin: 0, kMax: 5, label: 'arg c' });
    stairs2.update(0);
    window.__iw = { kx, ex, st, ex1, ex2, ex3, ex4, ex5, stairs, stairs2, picks, s0, rows1, at, caught };
  });
  await frames(page);

  // ---------------------------------------------------------------- A3: explainer
  log('explainer: structure, ids, headings, tinting (problem 1.1.1)');
  assert(await count('#iw-ex-host table.explainer') === 1, 'table.explainer rendered');
  for (const id of ['iw-ex-product-cart', 'iw-ex-product-polar', 'iw-ex-sum-cart', 'iw-ex-sum-polar', 'iw-ex-same', 'iw-ex-same-cart', 'iw-ex-same-polar']) {
    assert(await count('#' + id) === 1, `#${id} exists exactly once`);
  }
  assert((await attr('#iw-ex-product-cart', 'data-tex')).includes('5 + 14i'), 'z1 z2 = 5 + 14i');
  assert((await attr('#iw-ex-product-polar', 'data-tex')).includes('14.866') && (await attr('#iw-ex-product-polar', 'data-tex')).includes('1.228'), 'z1 z2 = 14.866 e^(i 1.228)');
  assert(await count('#iw-ex-product-cart .katex') === 1 && await count('#iw-ex-product-polar .katex') === 1, 'both cells are KaTeX');
  assert((await text('#iw-ex-same')).includes('same point: agree') && await attr('#iw-ex-same', 'data-agree') === 'true', 'footer: same point: agree');
  assert((await text('#iw-ex-host caption')) === 'Multiply z\u2081 by z\u2082', 'title is the table caption');
  assert(await attr('#iw-ex-host table', 'role') === 'table' && await count('#iw-ex-host th[scope="row"]') >= 5, 'explicit table roles and row headers');
  const colours = await run(() => {
    const probe = (v) => { const p = document.createElement('span'); p.style.color = `var(${v})`; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const th = (c) => getComputedStyle(document.querySelector(`#iw-ex-host thead th[data-col="${c}"]`)).color;
    const inner = (id) => { const s = document.querySelector(`#${id} .katex-html [style*="color"]`); return s ? getComputedStyle(s).color : null; };
    return { cart: probe('--cart'), polar: probe('--polar'), thCart: th('cart'), thPolar: th('polar'), tintCart: inner('iw-ex-product-cart'), tintPolar: inner('iw-ex-product-polar') };
  });
  assert(colours.cart !== colours.polar, '--cart and --polar differ');
  assert(colours.thCart === colours.cart && colours.thPolar === colours.polar, `column headings use the tone tokens ${JSON.stringify(colours)}`);
  assert(colours.tintCart === colours.cart && colours.tintPolar === colours.polar, `tinted TeX equals the tokens ${JSON.stringify(colours)}`);
  const headText = await text('#iw-ex-host thead');
  assert(headText.includes('Cartesian (slide)') && headText.includes('Polar (spin-and-stretch)'), 'default headings');
  assert((await text('#iw-ex-host tr[data-row="product"] .ex-native')) === 'easy in Polar', 'native badge on the product row');
  assert(await attr('#iw-ex-product-polar', 'data-native') === 'true' && await attr('#iw-ex-product-cart', 'data-native') === 'false', 'native flags on cells');

  log('explainer: empty and error cells never break the table');
  assert((await text('#iw-ex-blank-cart')) === '\u2014' && await hasClass('#iw-ex-blank-cart', 'is-empty'), 'null and empty TeX show an em dash');
  assert((await text('#iw-ex-boom-cart')) === 'n/a' && await hasClass('#iw-ex-boom-cart', 'tex-error'), 'a throwing row function shows n/a');
  assert(await hasClass('#iw-ex-boom-polar', 'tex-error') && (await text('#iw-ex-boom-polar')) === '\\badcommand{', 'bad TeX shows its source with tex-error');
  assert(await run(() => window.__iw.caught.length === 1 && /boom/.test(window.__iw.caught[0])), 'the row exception was logged once');

  log('explainer: layout, side by side vs stacked (container width and viewport)');
  const place = async (pre, row) => ({ a: await rect(`#${pre}-${row}-cart`), b: await rect(`#${pre}-${row}-polar`), w: (await rect(`#${pre}-${row}-cart`)) && (await rect(`#${pre}-table`)).w });
  for (const [pre, row] of [['iw-ex', 'product'], ['iw-ex2', 'product']]) {
    const { a, b, w } = await place(pre, row);
    const stacked = viewport.width <= 560 || w <= 560;
    if (stacked) assert(b.t >= a.b - 1 && Math.abs(a.l - b.l) < 2, `${pre} stacked (table ${Math.round(w)}px, viewport ${viewport.width}px)`);
    else assert(Math.abs(a.t - b.t) < 2 && b.l >= a.r - 1, `${pre} side by side (table ${Math.round(w)}px)`);
  }
  const narrow = await place('iw-ex2', 'product');
  assert(narrow.b.t >= narrow.a.b - 1, 'a 320px container stacks even on a wide viewport (container query)');
  if (viewport.width >= 800) { const wide = await place('iw-ex', 'product'); assert(Math.abs(wide.a.t - wide.b.t) < 2, 'a 720px container is side by side on a wide viewport'); }
  assert(await run(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'no horizontal page overflow with all fixtures');
  if (viewport.width >= 800) {                                      // a live resize flips the layout (ResizeObserver), no re-create needed
    await run(() => { document.getElementById('iw-ex2-host').parentElement.style.width = 'min(720px,100%)'; });
    await frames(page, 3);
    const grown = await place('iw-ex2', 'product');
    assert(Math.abs(grown.a.t - grown.b.t) < 2 && grown.b.l >= grown.a.r - 1, 'growing the container from 320px to 720px switches to side by side');
    await run(() => { document.getElementById('iw-ex2-host').parentElement.style.width = '320px'; });
    await frames(page, 3);
    const shrunk = await place('iw-ex2', 'product');
    assert(shrunk.b.t >= shrunk.a.b - 1, 'and shrinking it back stacks again');
  }

  log('explainer: the 560px boundary is pinned (residue 71): 540 stacks, 600 sits side by side, data-narrow follows the width');
  const boundary = await run(async () => {
    const frames2 = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(res))));
    const { createExplainer } = window.__iw.ex;
    const out = [];
    for (const w of [320, 540, 562, 563, 600, 720]) {            // the wrapper has a 1px border, so 562 outside is 560 inside
      const box = document.createElement('div');
      box.style.cssText = `width:${w}px;max-width:100%`;
      document.getElementById('iw-fixture').appendChild(box);
      const ex = createExplainer(box, { id: `iw-b${w}`, rows: [{ id: 'r', label: 'row', cart: () => '1', polar: () => '2' }] });
      ex.update({});
      await frames2();
      const wrap = box.querySelector('.explainer-wrap');
      const a = box.querySelector(`#iw-b${w}-r-cart`).getBoundingClientRect(), b = box.querySelector(`#iw-b${w}-r-polar`).getBoundingClientRect();
      out.push({ w, width: wrap.clientWidth, narrow: wrap.dataset.narrow, rowDisplay: getComputedStyle(box.querySelector('tr.ex-row')).display, sideBySide: Math.abs(a.top - b.top) < 2 && b.left >= a.right - 1 });
      ex.destroy();
      box.remove();
    }
    return out;
  });
  for (const r of boundary) {
    const narrow = r.width <= 560;
    assert(r.narrow === String(narrow), `a ${r.w}px box (${r.width}px inside) has data-narrow=${narrow}: ${JSON.stringify(r)}`);
    if (viewport.width >= 800 || narrow) assert(r.sideBySide === !narrow && (r.rowDisplay === 'block') === narrow, `a ${r.width}px table is ${narrow ? 'stacked' : 'side by side'} (rows ${narrow ? 'block' : 'table-row'}): ${JSON.stringify(r)}`);
  }
  if (viewport.width >= 800) assert(boundary.find((r) => r.w === 540).narrow === 'true' && boundary.find((r) => r.w === 562).narrow === 'true' && boundary.find((r) => r.w === 563).narrow === 'false' && boundary.find((r) => r.w === 600).narrow === 'false', '540 and 562 are narrow, 563 and 600 are wide on a desktop viewport');

  log('explainer: flipping between the stacked and the side-by-side layout raises no ResizeObserver loop error (residue 66)');
  if (viewport.width >= 800) {
    await run(async () => {
      const frames2 = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const host = document.getElementById('iw-ex2-host').parentElement;
      for (let i = 0; i < 14; i++) { host.style.width = i % 2 ? '420px' : '700px'; await frames2(); }
      host.style.width = '320px';
      await frames2();
    });
  }
  assert(await run(() => window.__iwWinErrors.filter((m) => /ResizeObserver/.test(m)).length === 0), `no ResizeObserver loop window error: ${await run(() => JSON.stringify(window.__iwWinErrors))}`);

  log('explainer: coalescing, skipping unchanged TeX, live update');
  const base = await run(() => ({ ...window.__iw.ex1.stats }));
  const mid = await run(() => { const e = window.__iw.ex1; for (let i = 0; i < 50; i++) e.update({ z1: { re: 1, im: i % 2 }, z2: { re: 1, im: 1 } }); return { ...e.stats }; });
  assert(mid.renders === base.renders, 'update() after the first never renders synchronously');
  await page.waitForFunction((n) => window.__iw.ex1.stats.renders >= n, base.renders + 1, { timeout: 3000 });
  await page.waitForTimeout(600);                                   // past the 220 ms refine pass
  const after = await run(() => ({ ...window.__iw.ex1.stats }));
  assert(after.renders === base.renders + 1, `50 updates in one task make exactly 1 render (got ${after.renders - base.renders})`);
  assert(after.refines === base.refines + 1, `and exactly 1 idle refine pass (got ${after.refines - base.refines})`);
  const cw = await run(() => { const e = window.__iw.ex1; const a = e.stats.cellWrites; const S = { z1: { re: 2, im: 1 }, z2: { re: 1, im: 1 } };
    e.update(S); e.flush(); const b = e.stats.cellWrites; e.update({ z1: { ...S.z1 }, z2: { ...S.z2 } }); e.flush(); return { a, b, c: e.stats.cellWrites }; });
  assert(cw.b > cw.a && cw.c === cw.b, `unchanged TeX is not re-rendered ${JSON.stringify(cw)}`);
  assert((await attr('#iw-ex-product-cart', 'data-tex')).includes('1 + 3i'), '(2 + i)(1 + i) = 1 + 3i in Cartesian');
  assert((await attr('#iw-ex-product-polar', 'data-tex')).includes('3.162\\,e^{i\\,1.249}'), '... and sqrt(10) e^(i 1.249) in polar');

  log('explainer: same-point verdicts');
  await run(() => { window.__iw.ex1.update({ ...window.__iw.s0, agree: false }); window.__iw.ex1.flush(); });
  assert((await text('#iw-ex-same')).includes('same point: differ') && await attr('#iw-ex-same', 'data-agree') === 'false', 'differ');
  await run(() => { window.__iw.ex1.update(window.__iw.s0); window.__iw.ex1.flush(); });
  assert((await text('#iw-ex-same')).includes('same point: agree'), 'agree again');

  log('explainer: setRows keeps the last state');
  await run(() => window.__iw.ex1.setRows(window.__iw.rows1().slice(1, 2)));
  assert(await count('#iw-ex-product-cart') === 0 && await count('#iw-ex-sum-cart') === 1, 'setRows replaced the rows');
  assert((await attr('#iw-ex-sum-cart', 'data-tex')).includes('2 + 2i'), 'the new row rendered with the last state: z1 + z2 = 2 + 2i');
  await run(() => window.__iw.ex1.setRows(window.__iw.rows1()));

  log('explainer: problem 2.1.1, both addresses agree at three points');
  const checks211 = [[[1, 1], '-1', '3'], [[0, 2], '-6', '0'], [[-1, 0], '1', '-1']];
  for (const [[x, y], u, v] of checks211) {
    await run(([x, y]) => { window.__iw.ex3.update(window.__iw.at(x, y)); window.__iw.ex3.flush(); }, [x, y]);
    for (const col of ['cart', 'polar']) {
      assert((await attr(`#iw-ex3-u-${col}`, 'data-tex')).endsWith(`{${u}}`) && (await attr(`#iw-ex3-v-${col}`, 'data-tex')).endsWith(`{${v}}`), `z = ${x}+${y}i ${col}: u = ${u}, v = ${v}`);
    }
    assert(await attr('#iw-ex3-same', 'data-agree') === 'true', `z = ${x}+${y}i: same point agrees`);
  }
  assert(await count('#iw-ex3-table .tex-error') === 0, 'the u + iv formulas in both addresses are valid KaTeX');
  assert((await attr('#iw-ex3-expand-polar', 'data-tex')).includes('\\cos 2\\theta'), 'the polar derivation row is present');

  log('explainer: a static cell keeps its MathML while updates stream (no downgrade, no wasted write)');
  const r0 = await run(() => {
    const w = window.__iw; w.ex3.update(w.at(1, 1)); w.ex3.flush();
    w.keep = document.querySelector('#iw-ex3-expand-cart .katex');
    w.ex3.update(w.at(1.2, 1)); w.ex3.update(w.at(1.4, 1));
    return w.ex3.stats.renders;
  });
  await page.waitForFunction((n) => window.__iw.ex3.stats.renders > n, r0, { timeout: 3000 });
  assert(await run(() => { const k = window.__iw.keep; return !!k && document.querySelector('#iw-ex3-expand-cart .katex') === k && !!k.querySelector('.katex-mathml'); }), 'a streaming render leaves the unchanged derivation cell as it was (same node, MathML intact)');
  await page.waitForTimeout(400);                                   // past the refine pass
  assert(await run(() => document.querySelector('#iw-ex3-expand-cart .katex') === window.__iw.keep), 'the refine pass leaves the unchanged cell untouched');
  assert((await attr('#iw-ex3-u-cart', 'data-tex')).endsWith('{-0.04}') && (await attr('#iw-ex3-v-cart', 'data-tex')).endsWith('{4.2}'), 'and the changed cells show the latest state: u = -0.04, v = 4.2 at 1.4 + i');
  await run(() => { const w = window.__iw; delete w.keep; w.ex3.update(w.at(-1, 0)); w.ex3.flush(); });

  log('explainer: problem 3.2.1, custom column keys');
  assert(await count('#iw-ex4-limit-dx') === 1 && await count('#iw-ex4-limit-dy') === 1 && await count('#iw-ex4-same-dx') === 1, 'ids use the custom keys');
  assert((await text('#iw-ex4-table thead')).includes('along \u0394x') && (await text('#iw-ex4-table thead')).includes('along i\u0394y'), 'custom headings');
  assert((await attr('#iw-ex4-limit-dx', 'data-tex')).includes('1.149 + 1.183i') && (await attr('#iw-ex4-limit-dy', 'data-tex')).includes('1.149 + 1.183i'), "f'(0.5+0.8i) = 1.149 + 1.183i along both axes");
  assert(await attr('#iw-ex4-same', 'data-agree') === 'true', 'the two limits agree');

  log('explainer: problem 2.2.2, three columns');
  assert(await count('#iw-ex5-table thead th[data-col]') === 3 && await count('#iw-ex5-root-motion') === 1, 'third column present');
  assert((await text('#iw-ex5-root-motion')) === 'halve the angle, take the square root of the length' && await count('#iw-ex5-root-motion .katex') === 0 && await hasClass('#iw-ex5-root-motion', 'ex-tinted'), 'third column: { text } renders as plain prose, tinted by its tone');
  assert((await text('#iw-ex5-table tr[data-row="root"] .ex-native')) === 'easy in Polar', 'native badge on the root row');
  if (viewport.width >= 800) { const a = await rect('#iw-ex5-root-cart'), b = await rect('#iw-ex5-root-polar'), c = await rect('#iw-ex5-root-motion'); assert(Math.abs(a.t - c.t) < 2 && c.l >= b.r - 1, 'three columns side by side'); }

  log('advisory: contrast of the tone tokens on --surface (logged, not a gate: the tokens belong to the shell goal)');
  const contrast = await run(() => {
    const rgb = (v) => { const p = document.createElement('span'); p.style.color = `var(${v})`; document.body.appendChild(p); const c = getComputedStyle(p).color.match(/[\d.]+/g).map(Number); p.remove(); return c; };
    const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const bg = rgb('--surface'); const out = {};
    for (const t of ['--cart', '--polar', '--output', '--text', '--text-muted', '--ok', '--warn', '--danger']) out[t] = +ratio(rgb(t), bg).toFixed(2);
    return out;
  });
  for (const [t, r] of Object.entries(contrast)) if (r < 4.5) log(`WARNING ${t} has contrast ${r}:1 on --surface (< 4.5:1); small tinted text will be hard to read`);
  log(`contrast on --surface: ${JSON.stringify(contrast)}`);

  log('katex: colour tokens in any CSS syntax become something KaTeX accepts');
  const cc = await run(() => {
    const kx = window.__iw.kx;
    document.documentElement.style.setProperty('--iw-oklch', 'oklch(0.6 0.2 260)');
    const out = { rgb: kx.texColor('rgb(37, 99, 235)'), hex4: kx.texColor('#abcd'), oklch: kx.texColor('--iw-oklch'), missing: kx.texColor('--iw-no-such-token'),
      okRender: !kx.texToHtml(kx.tint('x', '--iw-oklch')).includes('tex-error') && !kx.texToHtml(kx.tint('x', '--iw-no-such-token')).includes('tex-error') };
    document.documentElement.style.removeProperty('--iw-oklch');
    return out;
  });
  assert(cc.rgb === '#2563eb' && cc.hex4 === '#aabbcc' && /^#[0-9a-f]{6}$/.test(cc.oklch) && cc.missing === 'currentColor' && cc.okRender, `texColor ${JSON.stringify(cc)}`);

  log('explainer: theme switch re-tints the cells');
  await run(() => document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
  await frames(page, 4);
  const themed = await run(() => {
    const p = document.createElement('span'); p.style.color = 'var(--cart)'; document.body.appendChild(p); const want = getComputedStyle(p).color; p.remove();
    const s = document.querySelector('#iw-ex-product-cart .katex-html [style*="color"]');
    return { want, got: s ? getComputedStyle(s).color : null };
  });
  assert(themed.got === themed.want, `after a theme switch the tint follows --cart ${JSON.stringify(themed)}`);
  await shot('theme-flipped');
  await run(() => document.documentElement.removeAttribute('data-theme'));
  await frames(page, 4);

  // ---------------------------------------------------------------- A4: staircase
  log('staircase: problem 1.3.1, z = -1 + i sqrt3, Arg z = 2pi/3');
  assert((await text('#iw-st-arg')) === 'Arg z = 2.094 (2\u03c0/3)', `readout ${await text('#iw-st-arg')}`);
  assert((await text('#iw-st-set')) === 'arg z = { 2\u03c0/3 + 2\u03c0k : k is any integer }', 'the set is stated');
  assert(await count('#iw-st-list > li') === 5 && await count('#iw-st-list > li.is-home') === 1 && await hasClass('#iw-st-k0', 'is-home'), 'five steps, exactly one home step (k = 0)');
  const rowText = async (id) => (await text(`#${id} .stair-prefix`)) + (await text(`#${id} .stair-text`));
  const expected = { '-2': '2\u03c0/3 - 4\u03c0 = -10\u03c0/3', '-1': '2\u03c0/3 - 2\u03c0 = -4\u03c0/3', 0: 'Arg z = 2\u03c0/3', 1: '2\u03c0/3 + 2\u03c0 = 8\u03c0/3', 2: '2\u03c0/3 + 4\u03c0 = 14\u03c0/3' };
  for (const [k, t] of Object.entries(expected)) assert((await rowText(`iw-st-k${k}`)) === t, `step k = ${k}: "${await rowText(`iw-st-k${k}`)}" should be "${t}"`);
  assert((await text('#iw-st-k1 .stair-dec')) === '8.378' && (await text('#iw-st-k-2 .stair-dec')) === '-10.472', 'decimals beside the exact forms');
  assert((await attr('#iw-st-host .staircase-home', 'data-window')) === '(-\u03c0, \u03c0]' && (await text('#iw-st-window')).includes('(-\u03c0, \u03c0]'), 'the home window (-pi, pi] is stated');
  const encloses = async (stairsSel, rowSel) => { const b = await rect(`${stairsSel} .staircase-home`), r = await rect(rowSel); return Math.abs(b.t - r.t) < 1.5 && Math.abs(b.b - r.b) < 1.5; };
  assert(await encloses('#iw-st-host', '#iw-st-k0'), 'the shaded band sits exactly behind the home row');

  log('staircase: any representative gives the same list; problem 1.3.2 wraps 10pi/6 to -pi/3');
  await run(() => window.__iw.stairs.update(2 * Math.PI / 3 + 4 * Math.PI));
  assert((await text('#iw-st-arg')) === 'Arg z = 2.094 (2\u03c0/3)' && await hasClass('#iw-st-k0', 'is-home'), '14pi/3 is just another name for 2pi/3');
  await run(() => window.__iw.stairs.update(-Math.PI));
  assert((await text('#iw-st-arg')) === 'Arg z = 3.142 (\u03c0)', '-pi is reported as pi (the window is (-pi, pi])');
  await run(() => window.__iw.stairs.update(10 * Math.PI / 6));
  assert((await text('#iw-st-arg')) === 'Arg z = -1.047 (-\u03c0/3)', '10pi/6 = 5pi/3 wraps to -pi/3');
  assert((await rowText('iw-st-k1')) === '-\u03c0/3 + 2\u03c0 = 5\u03c0/3' && (await rowText('iw-st-k-1')) === '-\u03c0/3 - 2\u03c0 = -7\u03c0/3', '5pi/3 is the step above -pi/3');

  log('staircase: problem 2.2.2, Arg(2i) = pi/2 is the home step, 5pi/2 is the other name');
  await run(() => window.__iw.stairs.update(Math.PI / 2));
  assert((await text('#iw-st-arg')) === 'Arg z = 1.571 (\u03c0/2)' && (await rowText('iw-st-k1')) === '\u03c0/2 + 2\u03c0 = 5\u03c0/2', 'pi/2 and pi/2 + 2pi');

  log('staircase: problem 1.4.1, the staircase of c = 1 (k = 0..5, no onPick, label arg c)');
  assert((await text('#iw-st2-arg')) === 'Arg c = 0' && await count('#iw-st2-list > li') === 6 && await count('#iw-st2-list button') === 0, 'Arg c = 0, six steps, no buttons without onPick');
  assert((await rowText('iw-st2-k1')) === '0 + 2\u03c0 = 2\u03c0' && (await rowText('iw-st2-k5')) === '0 + 10\u03c0 = 10\u03c0' && await hasClass('#iw-st2-k0', 'is-home'), 'steps 2pi ... 10pi; k = 0 is home');
  assert(await encloses('#iw-st2-host', '#iw-st2-k0'), 'the band follows the home row even when it is the bottom row');

  log('staircase: movable seam; problem 2.4.1, the window (0, 2pi] is continuous across the negative real axis');
  await run(() => { const s = window.__iw.stairs; s.setSeam(0); s.update(-Math.PI / 2); });
  assert((await text('#iw-st-arg')) === 'Arg z = 4.712 (3\u03c0/2)' && (await text('#iw-st-window')).includes('(0, 2\u03c0]'), 'seam 0: -pi/2 is named 3pi/2 in the window (0, 2pi]');
  assert(await encloses('#iw-st-host', '#iw-st-k0') && await hasClass('#iw-st-k0', 'is-home') && (await rowText('iw-st-k0')) === 'Arg z = 3\u03c0/2', 'a moved seam does not move the band: it stays on k = 0 and the labels re-anchor');
  await run(() => { const s = window.__iw.stairs; s.update(Math.PI - 0.001); s.update(-Math.PI + 0.001); });
  assert((await text('#iw-st-arg')) === 'Arg z = 3.143' && await attr('#iw-st-host .staircase-wrap', 'data-jumps') === '0', 'seam 0: crossing the negative real axis is continuous (3.141 then 3.143), no jump');
  await run(() => { const s = window.__iw.stairs; s.setSeam(-Math.PI); s.update(Math.PI - 0.001); s.update(-Math.PI + 0.001); });
  assert((await text('#iw-st-arg')) === 'Arg z = -3.141' && await attr('#iw-st-host .staircase-wrap', 'data-jumps') === '1', 'principal seam: the same crossing jumps from 3.141 to -3.141');
  assert((await text('#iw-st-note')).includes('Seam crossed: Arg z dropped by 2\u03c0. The set arg z did not move.'), 'the note says what happened');
  await run(() => window.__iw.stairs.update(0.5));
  assert(await attr('#iw-st-host .staircase-wrap', 'data-jumps') === '1', 'a big move that is not a seam crossing is not counted');
  assert((await rowText('iw-st-k1')) === '0.5 + 2\u03c0' && (await text('#iw-st-k1 .stair-dec')) === '6.783' && (await text('#iw-st-k-1 .stair-text')) === '0.5 - 2\u03c0', 'no exact form: the row omits the "= decimal" tail, the decimal column carries it');
  assert((await attr('#iw-st-k1 button', 'aria-label')) === 'step k = 1: 0.5 + 2\u03c0 = 6.783', 'but the accessible name still says the total');

  log('staircase: picking, roving focus, keyboard');
  await run(() => window.__iw.stairs.update(2 * Math.PI / 3));
  await page.click('#iw-st-k1 button');
  assert(await run(() => JSON.stringify(window.__iw.picks)) === '[1]' && await attr('#iw-st-k1 button', 'aria-pressed') === 'true' && await hasClass('#iw-st-k1', 'is-picked'), 'click picks step 1');
  assert((await attr('#iw-st-k1 button', 'aria-label')) === 'step k = 1: 2\u03c0/3 + 2\u03c0 = 8\u03c0/3', 'accessible name of a step');
  assert(await count('#iw-st-list button[tabindex="0"]') === 1, 'one tab stop (roving tabindex)');
  await page.focus('#iw-st-k0 button');
  const ringOf = (sel) => run((s) => {
    const b = document.querySelector(s), c = getComputedStyle(b);
    const p = document.createElement('span'); p.style.color = 'var(--focus)'; document.body.appendChild(p); const focus = getComputedStyle(p).color; p.remove();
    return { focused: document.activeElement === b, outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`, outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth, outlineColor: c.outlineColor, mark: c.boxShadow, focus };
  }, sel);
  const pickedIdle = await ringOf('#iw-st-k1 button');                // picked, not focused
  assert(!pickedIdle.focused && pickedIdle.outlineStyle === 'none' && pickedIdle.mark !== 'none', `picked and not focused: the picked mark is not an outline ${JSON.stringify(pickedIdle)}`);
  await page.keyboard.press('ArrowUp');
  assert(await run(() => document.activeElement.closest('li').id) === 'iw-st-k1', 'ArrowUp moves to the next higher step');
  const pickedFocused = await ringOf('#iw-st-k1 button');             // picked and keyboard focused
  assert(pickedFocused.focused && pickedFocused.outline !== pickedIdle.outline && pickedFocused.outlineStyle === 'solid' && pickedFocused.outlineWidth === '3px' && pickedFocused.outlineColor === pickedFocused.focus,
    `a focused, picked step shows the 3px --focus ring, distinct from the picked mark ${JSON.stringify(pickedFocused)}`);
  assert(pickedFocused.mark === pickedIdle.mark && pickedFocused.mark !== 'none', 'and the picked mark is still drawn under the ring');
  await page.keyboard.press('ArrowDown');
  const plainFocused = await ringOf('#iw-st-k0 button');              // not picked, keyboard focused
  assert(plainFocused.focused && plainFocused.outlineStyle === 'solid' && plainFocused.outlineWidth === '3px' && plainFocused.outlineColor === plainFocused.focus && plainFocused.mark === 'none', `a focused, unpicked step shows the ring and no picked mark ${JSON.stringify(plainFocused)}`);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  assert(await run(() => document.activeElement.closest('li').id) === 'iw-st-k-2', 'End moves to the lowest step');
  await page.keyboard.press('Enter');
  assert(await run(() => JSON.stringify(window.__iw.picks)) === '[1,-2]', 'Enter picks the focused step');
  await run(() => window.__iw.stairs.setPicked(null));
  assert(await count('#iw-st-list li.is-picked') === 0, 'setPicked(null) clears the highlight');

  log('staircase: z = 0 has no angle');
  await run(() => window.__iw.stairs.update(null));
  assert((await text('#iw-st-arg')) === 'Arg z = undefined' && await count('#iw-st-list > li.is-home') === 0 && (await text('#iw-st-window')).includes('The point 0 has no angle'), 'undefined state');
  const bandAt0 = await run(() => { const w = document.querySelector('#iw-st-host .staircase-wrap'); return { display: getComputedStyle(w.querySelector('.staircase-home')).display, flag: w.getAttribute('data-home-visible') }; });
  assert(bandAt0.display === 'none' && bandAt0.flag === 'false', `z = 0: no home row, so the shaded band is hidden too ${JSON.stringify(bandAt0)}`);
  assert((await text('#iw-st-k0 .stair-text')) === '\u2014' && await count('#iw-st-list > li.is-empty') === 5, 'z = 0: every row shows an em dash');
  await run(() => window.__iw.stairs.update(2 * Math.PI / 3));
  assert(await count('#iw-st-list > li.is-home') === 1, 'recovers');
  const bandBack = await run(() => { const w = document.querySelector('#iw-st-host .staircase-wrap'); return { display: getComputedStyle(w.querySelector('.staircase-home')).display, flag: w.getAttribute('data-home-visible') }; });
  assert(bandBack.display === 'block' && bandBack.flag === 'true' && await encloses('#iw-st-host', '#iw-st-k0'), `on the next number the band is back behind the home row ${JSON.stringify(bandBack)}`);
  const outside = await run(() => {                                  // home step outside kMin..kMax: no row is home, no band
    const host = document.createElement('div'); document.getElementById('iw-fixture').appendChild(host);
    const s = window.__iw.st.createStaircase(host, { id: 'iw-st3', kMin: 1, kMax: 3 }); s.update(0.5);
    const out = { display: getComputedStyle(host.querySelector('.staircase-home')).display, homes: host.querySelectorAll('li.is-home').length, arg: host.querySelector('#iw-st3-arg').textContent };
    s.destroy(); host.remove(); return out;
  });
  assert(outside.display === 'none' && outside.homes === 0 && outside.arg === 'Arg z = 0.5', `home step outside the rows: band hidden, Arg readout still right ${JSON.stringify(outside)}`);

  log('reduced motion: the band never slides; the seam-crossing pulse on the Arg line is the only motion');
  const pulse = () => run(() => {
    const s = window.__iw.stairs; s.setSeam(-Math.PI); s.update(Math.PI - 0.001); s.update(-Math.PI + 0.001);    // a seam crossing adds is-jump to the wrap
    const w = document.querySelector('#iw-st-host .staircase-wrap');
    return { jump: w.classList.contains('is-jump'), anim: getComputedStyle(w.querySelector('.stair-arg')).animationName, slide: parseFloat(getComputedStyle(w.querySelector('.staircase-home')).transitionDuration) };
  });
  const motion = await pulse();
  assert(motion.jump && motion.anim === 'stair-pulse' && motion.slide === 0, `normal motion: the Arg line pulses on a seam crossing, the band has no transition ${JSON.stringify(motion)}`);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await run(() => window.__iw.stairs.update(0.5));
  const still = await pulse();
  assert(still.jump && still.anim === 'none' && still.slide <= 0.001, `reduced motion: no pulse, still no slide (0s from the widget, 1e-05s under the shell global rule) ${JSON.stringify(still)}`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await run(() => window.__iw.stairs.update(2 * Math.PI / 3));

  await shot('fixtures');

  log('explainer: spec.sameLabel renames the footer (residue: "same point" is loose for a distance, a radius, a room around p)');
  const labels = await run(async () => {
    const { createExplainer } = window.__iw.ex;
    const host = document.createElement('div');
    document.getElementById('iw-fixture').appendChild(host);
    const rows = [{ id: 'd', label: 'd', cart: () => '1', polar: () => '1' }];
    const same = (s) => ({ cart: '1', polar: '1', agree: s.ok !== false });
    const prevErr = console.error; const caught = []; console.error = (...a) => caught.push(a.join(' '));
    const mk = (id, extra) => { const b = document.createElement('div'); host.appendChild(b); const ex = createExplainer(b, { id, rows, same, ...extra }); ex.update({}); ex.flush(); return { ex, foot: () => b.querySelector(`#${id}-same th`).textContent, row: () => b.querySelector(`#${id}-same`) }; };
    const out = {};
    out.def = mk('iw-l0', {}).foot();
    out.str = mk('iw-l1', { sameLabel: 'same distance' }).foot();
    out.colon = mk('iw-l2', { sameLabel: 'room around p:' }).foot();
    const dyn = mk('iw-l3', { sameLabel: (s) => (s.mode === 'circle' ? 'same radius' : 'same distance') });
    dyn.ex.update({ mode: 'circle' }); dyn.ex.flush(); out.dyn1 = dyn.foot();
    dyn.ex.update({ mode: 'two' }); dyn.ex.flush(); out.dyn2 = dyn.foot();
    dyn.ex.update({ mode: 'two', ok: false }); dyn.ex.flush(); out.dyn3 = dyn.foot(); out.dyn3agree = dyn.row().dataset.agree;
    out.bad = [mk('iw-l4', { sameLabel: 42 }).foot(), mk('iw-l5', { sameLabel: '' }).foot(), mk('iw-l6', { sameLabel: '   ' }).foot(), mk('iw-l7', { sameLabel: null }).foot()];
    out.throwing = mk('iw-l8', { sameLabel: () => { throw new Error('label boom'); } }).foot();
    console.error = prevErr;
    out.caught = caught.filter((c) => /label boom/.test(c)).length;
    host.remove();
    return out;
  });
  assert(labels.def === 'same point: agree' || labels.def.startsWith('same point: '), `the default label is still "same point": ${JSON.stringify(labels.def)}`);
  assert(labels.str.startsWith('same distance: ') && labels.str.includes('agree'), `a string label: ${JSON.stringify(labels.str)}`);
  assert(labels.colon.startsWith('room around p: ') && !labels.colon.includes('::'), `a trailing colon is not doubled: ${JSON.stringify(labels.colon)}`);
  assert(labels.dyn1.startsWith('same radius: ') && labels.dyn2.startsWith('same distance: ') && labels.dyn3.startsWith('same distance: ') && labels.dyn3agree === 'false' && labels.dyn3.includes('differ'), `a function label follows the state: ${JSON.stringify([labels.dyn1, labels.dyn2, labels.dyn3])}`);
  assert(labels.bad.every((t) => t.startsWith('same point: ')), `a number, '', blanks and null fall back to the default: ${JSON.stringify(labels.bad)}`);
  assert(labels.throwing.startsWith('same point: ') && labels.caught === 1, `a throwing label function falls back and is logged once: ${JSON.stringify([labels.throwing, labels.caught])}`);

  log('staircase: homeLabel, showK, compact, the aria-label at z = 0, a restarted pulse, and float noise on the seam');
  const opts = await run(async () => {
    const { createStaircase } = window.__iw.st;
    const frames2 = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const mkHost = (w) => { const h = document.createElement('div'); h.style.cssText = `width:${w}px;max-width:100%`; document.getElementById('iw-fixture').appendChild(h); return h; };
    const out = {};
    // homeLabel: the set line keeps saying arg z, the home row says what the station calls it
    const h1 = mkHost(420);
    const s1 = createStaircase(h1, { id: 'iw-o1', label: 'arg z', homeLabel: 'chosen θ', kMin: -1, kMax: 2, onPick: () => {} });
    s1.update(2 * Math.PI / 3);
    const T = (id) => h1.querySelector(id).textContent;
    out.hl = { set: T('#iw-o1-set'), arg: T('#iw-o1-arg'), win: T('#iw-o1-window'), home: T('#iw-o1-k0 .stair-prefix'), aria: h1.querySelector('#iw-o1-k0 button').getAttribute('aria-label'), list: h1.querySelector('#iw-o1-list').getAttribute('aria-label') };
    s1.setSeam(0); s1.update(-Math.PI / 2); s1.update(Math.PI - 0.001); s1.update(-Math.PI + 0.001);
    s1.setSeam(-Math.PI); s1.update(Math.PI - 0.001); s1.update(-Math.PI + 0.001);
    out.hlNote = T('#iw-o1-note');
    s1.update(null);
    out.hlZero = { set: T('#iw-o1-set'), arg: T('#iw-o1-arg'), win: T('#iw-o1-window'), aria: [...h1.querySelectorAll('#iw-o1-list button')].map((b) => b.getAttribute('aria-label')), text: [...h1.querySelectorAll('#iw-o1-list .stair-text')].map((e) => e.textContent) };
    s1.setHomeLabel('Arg z'); s1.update(1); out.hlBack = T('#iw-o1-arg');
    s1.setHomeLabel(null); out.hlDerived = T('#iw-o1-arg');
    s1.setHomeLabel('   '); out.hlBlank = T('#iw-o1-arg');
    s1.destroy(); h1.remove();
    // no homeLabel: unchanged behaviour
    const h2 = mkHost(420);
    const s2 = createStaircase(h2, { id: 'iw-o2', label: 'arg w' });
    s2.update(1); out.plain = { arg: h2.querySelector('#iw-o2-arg').textContent, k: h2.querySelectorAll('.stair-k').length, compact: h2.querySelector('.staircase-wrap').getAttribute('data-compact'), showK: h2.querySelector('.staircase-wrap').getAttribute('data-show-k') };
    s2.destroy(); h2.remove();
    // showK + compact
    const h3 = mkHost(240);
    const s3 = createStaircase(h3, { id: 'iw-o3', kMin: -2, kMax: 2, showK: true, compact: true });
    s3.update(-Math.PI / 3);
    out.k = [...h3.querySelectorAll('#iw-o3-list li')].map((li) => ({ id: li.id, tag: li.querySelector('.stair-k') && li.querySelector('.stair-k').textContent, text: li.querySelector('.stair-prefix').textContent + li.querySelector('.stair-text').textContent }));
    const wrap3 = h3.querySelector('.staircase-wrap');
    const row3 = h3.querySelector('#iw-o3-k1 .stair-row');
    out.compact = { attr: wrap3.getAttribute('data-compact'), showK: wrap3.getAttribute('data-show-k'), decDisplay: getComputedStyle(h3.querySelector('#iw-o3-k1 .stair-dec')).display, rowFont: parseFloat(getComputedStyle(row3).fontSize), rowH: Math.round(row3.getBoundingClientRect().height), overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      clipped: [...h3.querySelectorAll('#iw-o3-list .stair-text')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent) };
    const h4 = mkHost(240);
    const s4 = createStaircase(h4, { id: 'iw-o4', kMin: -2, kMax: 2 });
    s4.update(-Math.PI / 3);
    const row4 = h4.querySelector('#iw-o4-k1 .stair-row');
    out.regular = { rowFont: parseFloat(getComputedStyle(row4).fontSize), decDisplay: getComputedStyle(h4.querySelector('#iw-o4-k1 .stair-dec')).display, clipped: [...h4.querySelectorAll('#iw-o4-list .stair-text')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent) };
    s3.destroy(); h3.remove(); s4.destroy(); h4.remove();
    // pulse restart: a second crossing inside 0.9 s starts the animation again
    const h5 = mkHost(420);
    const s5 = createStaircase(h5, { id: 'iw-o5' });
    s5.update(Math.PI - 0.001); s5.update(-Math.PI + 0.001);
    await new Promise((r) => setTimeout(r, 350));
    const arg5 = h5.querySelector('#iw-o5-arg');
    const t1 = (arg5.getAnimations()[0] || {}).currentTime;
    s5.update(Math.PI - 0.001);
    await frames2();
    const t2 = (arg5.getAnimations()[0] || {}).currentTime;
    out.pulse = { before: t1, after: t2, jumps: h5.querySelector('.staircase-wrap').dataset.jumps };
    s5.destroy(); h5.remove();
    // float noise on the seam: 13 * pi is the home step pi, never -pi
    const h6 = mkHost(420);
    const s6 = createStaircase(h6, { id: 'iw-o6', kMin: -1, kMax: 1 });
    s6.update(13 * Math.PI);
    out.seam = { arg: h6.querySelector('#iw-o6-arg').textContent, home: h6.querySelector('#iw-o6-k0 .stair-prefix').textContent + h6.querySelector('#iw-o6-k0 .stair-text').textContent, below: h6.querySelector('#iw-o6-km1 .stair-text, #iw-o6-k-1 .stair-text').textContent, data: h6.querySelector('.staircase-wrap').getAttribute('data-arg') };
    s6.destroy(); h6.remove();
    return out;
  });
  assert(opts.hl.set === 'arg z = { 2\u03c0/3 + 2\u03c0k : k is any integer }' && opts.hl.arg === 'chosen \u03b8 = 2.094 (2\u03c0/3)' && opts.hl.home === 'chosen \u03b8 = ' && opts.hl.aria === 'step k = 0: chosen \u03b8 = 2\u03c0/3' && opts.hl.list === 'Names of the angle arg z' && opts.hl.win.includes('chosen \u03b8 is the step inside it'),
    `homeLabel names the home row and leaves the set line alone: ${JSON.stringify(opts.hl)}`);
  assert(opts.hlNote.includes('Seam crossed: chosen \u03b8 dropped by 2\u03c0. The set arg z did not move.'), `the seam note uses both names: ${opts.hlNote}`);
  assert(opts.hlZero.set === 'arg z is not defined here' && opts.hlZero.arg === 'chosen \u03b8 = undefined' && opts.hlZero.win.includes('so arg z is not defined'), `z = 0 with a homeLabel: ${JSON.stringify(opts.hlZero)}`);
  assert(opts.hlZero.aria.length === 4 && opts.hlZero.aria.every((a, i) => a === `step k = ${2 - i}: no angle at 0`) && opts.hlZero.text.every((t) => t === '\u2014'), `at z = 0 each step button keeps a real name, not a dash (residue 77): ${JSON.stringify(opts.hlZero.aria)}`);
  assert(opts.hlBack === 'Arg z = 1' && opts.hlDerived === 'Arg z = 1' && opts.hlBlank === 'Arg z = 1', `setHomeLabel('Arg z'), then null and blank go back to the derived name: ${JSON.stringify([opts.hlBack, opts.hlDerived, opts.hlBlank])}`);
  assert(opts.plain.arg === 'Arg w = 1' && opts.plain.k === 0 && opts.plain.compact === null && opts.plain.showK === null, `without the options nothing changes: ${JSON.stringify(opts.plain)}`);
  assert(opts.k.length === 5 && opts.k.every((r, i) => r.tag === `k = ${2 - i}`), `showK prints k = n on every row: ${JSON.stringify(opts.k.map((r) => r.tag))}`);
  assert(opts.k.find((r) => r.id === 'iw-o3-k0').text === 'Arg z = -\u03c0/3' && opts.k.find((r) => r.id === 'iw-o3-k1').text === '-\u03c0/3 + 2\u03c0 = 5\u03c0/3', `the rows still read as before: ${JSON.stringify(opts.k)}`);
  assert(opts.compact.attr === 'true' && opts.compact.showK === 'true' && opts.compact.decDisplay === 'none' && opts.compact.rowFont < opts.regular.rowFont && opts.compact.rowH <= 33 && opts.compact.overflow, `compact: smaller type, tighter rows, no decimal column, no page overflow: ${JSON.stringify(opts.compact)} vs ${JSON.stringify(opts.regular)}`);
  assert(opts.compact.clipped.length === 0, `in a 240px host the compact list shows every row without an ellipsis (the regular list clips ${opts.regular.clipped.length}): ${JSON.stringify(opts.compact.clipped)}`);
  assert(opts.regular.decDisplay !== 'none', 'the regular list keeps its decimal column');
  assert(typeof opts.pulse.before === 'number' && opts.pulse.before > 250 && typeof opts.pulse.after === 'number' && opts.pulse.after < opts.pulse.before - 150 && opts.pulse.jumps === '2', `a second seam crossing restarts the pulse (animation time ${opts.pulse.before} -> ${opts.pulse.after}): ${JSON.stringify(opts.pulse)}`);
  assert(opts.seam.arg === 'Arg z = 3.142 (\u03c0)' && opts.seam.home === 'Arg z = \u03c0' && opts.seam.below === '\u03c0 - 2\u03c0 = -\u03c0' && Number(opts.seam.data) === Math.PI, `13 pi reads Arg z = pi against the window (-pi, pi]: ${JSON.stringify(opts.seam)}`);

  log('setLabel and destroy');
  await run(() => window.__iw.stairs.setLabel('arg w'));
  assert((await text('#iw-st-arg')).startsWith('Arg w = ') && (await text('#iw-st-set')).startsWith('arg w = {'), 'label follows setLabel');
  await run(() => { const w = window.__iw; for (const k of ['ex1', 'ex2', 'ex3', 'ex4', 'ex5']) w[k].destroy(); w.stairs.destroy(); w.stairs2.destroy(); w.ex1.update({}); w.stairs.update(1); w.ex1.destroy(); });
  assert(await count('#iw-fixture .explainer-wrap, #iw-fixture .staircase-wrap') === 0, 'destroy removes the DOM and later calls are harmless');
  assert(consoleErrors.length === 0, `no console errors: ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `no page errors: ${pageErrors.join(' | ')}`);
  assert(await run(() => window.__iwWinErrors.length === 0), `no window error events at all: ${await run(() => JSON.stringify(window.__iwWinErrors))}`);
  await run(() => { delete window.__iw; delete window.__iwWinErrors; document.getElementById('iw-fixture').remove(); });
}
