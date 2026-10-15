// tests/interact/wave0-sync.mjs
// Run: node tools/smoke.mjs --route wave0-sync --script tests/interact/wave0-sync.mjs --out <dir>
//
// Browser checks for the wave-0 sync (docs/review/iter-1/wave0-sync.md). The route is unknown to the router, whose "No such
// place" panel is fine: the script builds its own fixtures in document.body and runs at both harness viewports.
//   W1  plane background 'transparent': the plane element is see-through, the canvas is only ever cleared, so a domain-colouring
//       canvas under it shows; a default plane still paints its surface through CSS and its canvas is clear too
//   W2  plane.addCurve accepts the mapping fields (kind, family, source, label, reversed) and ignores them
//   W3  window.__mv initialisation is idempotent: an existing __mv (with or without planes) is kept and extended
//   W4  katex.prose() in a real DOM: exponent notation becomes <sup>, no literal braces, no layout overflow
export default async function (page, ctx) {
  const { viewport, log, assert } = ctx;
  const phone = viewport.width <= 400;

  // ---------------------------------------------------------------------------------------------
  // Fixture: one host, a DC canvas under a transparent plane, a default plane beside it
  // ---------------------------------------------------------------------------------------------
  await page.evaluate(async () => {
    const base = location.href;
    const planeMod = await import(new URL('./js/core/plane.js', base).href);
    const dcMod = await import(new URL('./js/core/domaincolor.js', base).href);
    const shapes = await import(new URL('./js/core/shapes.js', base).href);
    const mapping = await import(new URL('./js/core/mapping.js', base).href);
    const katex = await import(new URL('./js/core/katex.js', base).href);
    const host = document.createElement('section');
    host.id = 'ws-host';
    host.style.cssText = 'grid-column:1/-1;justify-self:center;width:100%;max-width:480px;margin:16px 0;padding:0 16px;box-sizing:border-box';
    host.innerHTML = '<div id="ws-over"></div><div id="ws-plain" style="margin-top:16px"></div><p id="ws-prose"></p>';
    document.body.appendChild(host);
    window.__ws = { planeMod, dcMod, shapes, mapping, katex, host };
  });

  // ---------------------------------------------------------------------------------------------
  // W1 transparent plane over a domain-colouring canvas
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const { planeMod, dcMod, host } = window.__ws;
      const over = planeMod.createPlane(document.getElementById('ws-over'), { id: 'ws-over-plane', background: 'transparent', grid: 'both', interactive: false });
      const plain = planeMod.createPlane(document.getElementById('ws-plain'), { id: 'ws-plain-plane' });
      over.addPoint({ id: 'z', z: { re: 1, im: 1 }, label: 'z' });
      over.addLayer((c, p) => { planeMod.drawCartAddress(c, p, { re: 1, im: 1 }); planeMod.drawPolarAddress(c, p, { re: 1, im: 1 }); });
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      // The way a station puts domain colouring under a plane: the DC canvas is the FIRST child of plane.el (so it fills the same
      // padding box as the plane's own canvas, inside the plane's 1 px border), and never takes the pointer.
      const dcCanvas = document.createElement('canvas');
      dcCanvas.id = 'ws-dc';
      dcCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      over.el.prepend(dcCanvas);
      const size = over.getSize();
      dcCanvas.width = Math.round(size.w);
      dcCanvas.height = Math.round(size.h);
      const dc = dcMod.createDomainColoring(dcCanvas, { f: (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im }), xRange: [-4, 4], yRange: [-4, 4] });
      dc.render('idle');
      const alphaStats = (cv) => {
        const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
        let clear = 0, drawn = 0;
        for (let i = 3; i < d.length; i += 4) { if (d[i] === 0) clear++; else drawn++; }
        return { clear, drawn, total: clear + drawn };
      };
      const bgOf = (p) => getComputedStyle(p.el).backgroundColor;
      const out = {
        overBg: bgOf(over), plainBg: bgOf(plain),
        overAlpha: alphaStats(over.canvas), plainAlpha: alphaStats(plain.canvas),
        dcDrawn: alphaStats(dcCanvas).drawn, dcTotal: dcCanvas.width * dcCanvas.height,
        cssVar: over.el.style.getPropertyValue('--plane-bg'),
      };
      Object.assign(window.__ws, { over, plain, dc, dcCanvas });
      return out;
    });
    assert(r.overBg === 'rgba(0, 0, 0, 0)', `W1 a transparent plane has no background fill (${r.overBg})`);
    assert(r.plainBg !== 'rgba(0, 0, 0, 0)', `W1 a default plane paints its surface through CSS (${r.plainBg})`);
    assert(r.cssVar === 'transparent', `W1 --plane-bg is 'transparent' (${r.cssVar})`);
    const frac = (a) => a.drawn / a.total;
    assert(frac(r.overAlpha) > 0 && frac(r.overAlpha) < 0.2, `W1 the transparent plane's canvas holds only the grid, axes and overlays (${(100 * frac(r.overAlpha)).toFixed(1)}% drawn)`);
    assert(frac(r.plainAlpha) === 0 || frac(r.plainAlpha) < 0.2, `W1 a default plane's canvas is cleared, not filled (${(100 * frac(r.plainAlpha)).toFixed(1)}% drawn)`);
    assert(r.dcDrawn === r.dcTotal, `W1 the domain-colouring canvas under it is fully painted (${r.dcDrawn} of ${r.dcTotal})`);
    // the plane and the DC canvas cover the same box, so the colours show through the transparent plane
    const same = await page.evaluate(() => {
      const { over, dcCanvas } = window.__ws;
      over.canvas.scrollIntoView({ block: 'center', behavior: 'instant' });
      const a = over.canvas.getBoundingClientRect(), b = dcCanvas.getBoundingClientRect();
      const mid = over.toPixel({ re: -3, im: -3 });                      // an empty spot: the topmost element there is the plane's canvas
      const top = document.elementFromPoint(a.left + mid.x, a.top + mid.y);
      return {
        box: Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5,
        top: top === over.canvas, first: over.el.firstElementChild === dcCanvas,
      };
    });
    assert(same.box, 'W1 the plane canvas and the domain-colouring canvas cover exactly the same box');
    assert(same.top && same.first, `W1 the domain-colouring canvas sits under the plane's canvas and takes no pointer (${JSON.stringify(same)})`);
    log(`W1 transparent plane over a domain-colouring canvas: ok (overlay ${(100 * frac(r.overAlpha)).toFixed(1)}% drawn)`);
  }

  // ---------------------------------------------------------------------------------------------
  // W2 mapping pieces go straight into addCurve
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const { shapes, mapping, over } = window.__ws;
      const recip = (z) => { const d = z.re * z.re + z.im * z.im; return { re: z.re / d, im: -z.im / d }; };
      const pieces = mapping.pushForward(Object.assign(shapes.circle({ re: 1, im: 0 }, 1), { id: 'c1' }), recip, { clampRadius: 12 });
      const grid = shapes.cartGrid({ xRange: [-1, 1], yRange: [-1, 1], step: 0.5 });
      const layers = [];
      let threw = null;
      try {
        for (const piece of pieces) layers.push(over.addCurve(piece));
        for (const g of grid) layers.push(over.addCurve({ ...g, color: g.family === 'cart' ? '--cart' : '--polar' }));
      } catch (e) { threw = String(e); }
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const first = layers[0];
      const out = {
        threw, pieces: pieces.length, grid: grid.length, layers: layers.length, stats: over.getStats().layers,
        ids: layers.slice(0, pieces.length).map((l) => l.id),
        sameArray: !!first && first.points === pieces[0].points,
        leaked: ['family', 'source', 'kind', 'label', 'reversed'].filter((k) => k in first),
        piece0: { id: pieces[0].id, source: pieces[0].source, family: pieces[0].family, kind: pieces[0].kind },
      };
      for (const l of layers) l.remove();
      out.afterRemove = over.getStats().layers;
      return out;
    });
    assert(r.threw === null, `W2 addCurve accepts mapping curves without throwing (${r.threw})`);
    assert(r.pieces >= 1 && r.grid === 10 && r.layers === r.pieces + r.grid, `W2 pieces and grid lines became layers (${r.pieces} pieces, ${r.grid} grid lines, ${r.layers} layers)`);
    assert(r.piece0.source === 'c1' && r.piece0.kind === 'circle' && r.piece0.family === 'polar', `W2 the pieces carry the mapping fields (${JSON.stringify(r.piece0)})`);
    assert(r.sameArray, 'W2 the layer draws the piece points as they are');
    assert(r.leaked.length === 0, `W2 the extra fields are ignored, not copied onto the layer (${r.leaked})`);
    assert(r.afterRemove === r.stats - r.layers, `W2 removing the curve layers leaves the others (${r.afterRemove} of ${r.stats})`);
    log(`W2 addCurve with mapping fields: ok (${r.pieces} pieces + ${r.grid} grid lines)`);
  }

  // ---------------------------------------------------------------------------------------------
  // W3 window.__mv initialisation is idempotent
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(() => {
      const { planeMod } = window.__ws;
      const saved = window.__mv;
      const out = {};
      const slot = document.createElement('div');
      document.getElementById('ws-host').appendChild(slot);
      try {
        window.__mv = { keep: 7 };                                       // another module created it first, without planes
        const a = planeMod.createPlane(slot, { id: 'ws-mv-a' });
        out.keptOther = window.__mv.keep === 7;
        out.planesIsMap = window.__mv.planes instanceof Map;
        out.registered = window.__mv.planes.get('ws-mv-a') === a;
        const map = window.__mv.planes;
        const b = planeMod.createPlane(slot, { id: 'ws-mv-b' });
        out.sameMap = window.__mv.planes === map && map.get('ws-mv-b') === b && map.get('ws-mv-a') === a;
        a.destroy();
        out.destroyedOnlyA = !map.has('ws-mv-a') && map.has('ws-mv-b');
        const again = planeMod.createPlane(slot, { id: 'ws-mv-b' });       // same id before the old one is destroyed
        b.destroy();
        out.newerSurvives = map.get('ws-mv-b') === again;
        again.destroy();
        out.cleaned = !map.has('ws-mv-b');
        window.__mv = {};                                                // no planes at all, and a second shape
        const c = planeMod.createPlane(slot, { id: 'ws-mv-c' });
        out.fromEmpty = window.__mv.planes.get('ws-mv-c') === c;
        c.destroy();
      } catch (e) { out.threw = String(e); }
      finally { window.__mv = saved; slot.remove(); }
      out.restored = window.__mv === saved && window.__mv.planes === saved.planes && saved.planes.has('ws-over-plane');
      return out;
    });
    assert(!r.threw, `W3 no throw (${r.threw})`);
    assert(r.keptOther && r.planesIsMap && r.registered, `W3 an existing __mv without planes is kept and gets a planes Map: ${JSON.stringify(r)}`);
    assert(r.sameMap && r.destroyedOnlyA && r.newerSurvives && r.cleaned, `W3 the planes Map is reused, and destroy only removes its own entry: ${JSON.stringify(r)}`);
    assert(r.fromEmpty && r.restored, `W3 an empty __mv works too: ${JSON.stringify(r)}`);
    log('W3 window.__mv initialisation is idempotent: ok');
  }

  // ---------------------------------------------------------------------------------------------
  // W4 prose() in a real DOM
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const base = location.href;
      const { katex } = window.__ws;
      const { PROBLEMS, TOPICS } = await import(new URL('./js/data/problems.js', base).href);
      const { FUNCTIONS } = await import(new URL('./js/data/functions.js', base).href);
      const p = document.getElementById('ws-prose');
      katex.prose(p, 'The point is 2e^{iπ/3} = r^(1/3) and e^x cos y, not <b>bold</b>.');
      const sups = [...p.querySelectorAll('sup.prose-sup')].map((s) => s.textContent);
      const out = {
        sups, text: p.textContent, bold: p.querySelectorAll('b').length,
        align: getComputedStyle(p.querySelector('sup')).verticalAlign,
      };
      // every prose field of the data renders with no literal exponent brackets
      const fields = [];
      for (const q of PROBLEMS) fields.push(q.aha, q.addressWhy, q.routes.cart, q.routes.polar);
      for (const t of TOPICS) fields.push(t.summary, ...t.covers);
      for (const f of FUNCTIONS) fields.push(f.note, f.label);
      const box = document.createElement('div');
      box.style.cssText = 'width:100%';
      document.getElementById('ws-host').appendChild(box);
      let bad = 0, withSup = 0;
      for (const s of fields) {
        const el = document.createElement('p');
        katex.prose(el, s);
        box.appendChild(el);
        if (el.querySelector('sup')) withSup++;
        const plain = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
        if (/\^[{(]/.test(plain)) bad++;
      }
      out.fields = fields.length; out.withSup = withSup; out.bad = bad;
      out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      box.remove();
      return out;
    });
    assert(JSON.stringify(r.sups) === JSON.stringify(['iπ/3', '1/3', 'x']), `W4 three superscripts (${JSON.stringify(r.sups)})`);
    assert(!/[\^{}]/.test(r.text), `W4 no literal caret or brace left (${r.text})`);
    assert(r.text.includes('<b>bold</b>') && r.bold === 0, 'W4 markup in the text is shown as text, not parsed');
    assert(r.align === 'super', `W4 the superscript is raised (${r.align})`);
    assert(r.fields > 200 && r.withSup >= 40 && r.bad === 0, `W4 every data prose field renders with no ^{ or ^( left (${r.fields} fields, ${r.withSup} with a superscript, ${r.bad} bad)`);
    assert(r.overflow <= 0, `W4 no horizontal page overflow (${r.overflow}px)`);
    log(`W4 prose(): ok (${r.withSup} of ${r.fields} data fields carry a superscript${phone ? ', phone' : ''})`);
  }

  await page.evaluate(() => {
    const { over, plain, dc, host } = window.__ws;
    dc.destroy(); over.destroy(); plain.destroy(); host.remove();
    delete window.__ws;
  });
}
