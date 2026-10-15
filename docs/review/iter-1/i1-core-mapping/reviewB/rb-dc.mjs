export default async function (page, ctx) {
  const { assert, log } = ctx;
  const r = await page.evaluate(async () => {
    const dc = await import(`${location.origin}/js/core/domaincolor.js`);
    const out = {};
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; document.body.appendChild(c); c.style.display='none'; return c; };
    // sizes
    const c1 = mk(800, 600);
    const d1 = dc.createDomainColoring(c1, { f: (z) => z, xRange: [-2, 2], yRange: [-1.5, 1.5] });
    d1.render('drag'); out.drag800 = d1.info();
    // count f calls == offscreen pixels
    let calls = 0;
    const c2 = mk(500, 300);
    const d2 = dc.createDomainColoring(c2, { f: (z) => { calls++; return z; }, xRange: [-2, 2], yRange: [-1, 1], quality: { idle: 1, drag: 0.5 } });
    d2.render('drag'); out.callsDrag = calls; out.dragInfo2 = d2.info();
    await new Promise((r) => setTimeout(r, 600));
    out.afterRefineInfo = d2.info(); out.callsAfter = calls;
    // function set to null mid-drag
    const c3 = mk(300, 300);
    const d3 = dc.createDomainColoring(c3, { f: (z) => z, xRange: [-2, 2], yRange: [-2, 2] });
    d3.render('drag'); d3.setFunction(null);
    await new Promise((r) => setTimeout(r, 400));
    out.nullFn = { pending: d3.info().pending, flag: c3.dataset.dcPending };
    // canvas resized to 0 then drag render
    const c4 = mk(300, 300);
    const d4 = dc.createDomainColoring(c4, { f: (z) => z, xRange: [-2, 2], yRange: [-2, 2] });
    d4.render('drag'); c4.width = 0; c4.height = 0;
    await new Promise((r) => setTimeout(r, 400));
    out.zeroSize = { pending: d4.info().pending, flag: c4.dataset.dcPending };
    // huge canvas
    const c5 = mk(2400, 1400);
    const d5 = dc.createDomainColoring(c5, { f: (z) => z, xRange: [-2, 2], yRange: [-2, 2] });
    d5.render('drag'); out.dragHuge = d5.info();
    d5.destroy(); d1.destroy(); d2.destroy();
    // timing of a drag frame on an 800x600 canvas with a moderately costly f
    const c6 = mk(1000, 700);
    const d6 = dc.createDomainColoring(c6, { f: (z) => { const a = z.re * z.re - z.im * z.im, b = 2 * z.re * z.im; return { re: Math.sin(a) * Math.cosh(b), im: Math.cos(a) * Math.sinh(b) }; }, xRange: [-4, 4], yRange: [-2.8, 2.8] });
    const t0 = performance.now(); for (let k = 0; k < 10; k++) d6.render('drag'); out.dragMs = (performance.now() - t0) / 10;
    d6.destroy();
    for (const c of document.querySelectorAll('body > canvas')) c.remove();
    return out;
  });
  log(JSON.stringify(r));
  assert(r.drag800.width === 240 && r.drag800.height === 180, 'drag size 240x180');
  assert(r.callsDrag === r.dragInfo2.width * r.dragInfo2.height, `f called once per offscreen pixel: ${r.callsDrag} vs ${r.dragInfo2.width}x${r.dragInfo2.height}`);
  assert(r.afterRefineInfo.width === 500 && r.afterRefineInfo.height === 300 && !r.afterRefineInfo.pending, 'refined to full size');
  assert(r.nullFn.pending === false && r.nullFn.flag === undefined, 'null function clears pending');
  assert(r.zeroSize.pending === false && r.zeroSize.flag === undefined, 'zero-size clears pending');
}
