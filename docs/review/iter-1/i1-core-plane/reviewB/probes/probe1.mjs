// Independent probe: label geometry measured from what the real canvas actually draws (fillText hook + actualBoundingBox).
export default async function (page, ctx) {
  const { viewport, log, assert } = ctx;
  const out = await page.evaluate(async () => {
    const mod = await import(new URL('./js/core/plane.js', location.href).href);
    // hook fillText
    const rec = [];
    const proto = CanvasRenderingContext2D.prototype;
    const orig = proto.fillText;
    let recording = false;
    proto.fillText = function (text, x, y, mw) {
      if (recording) {
        const m = this.measureText(text);
        const tr = this.getTransform();
        rec.push({ text: String(text), x, y, align: this.textAlign, base: this.textBaseline, left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, scaleX: tr.a, font: this.font });
      }
      return orig.call(this, text, x, y, mw);
    };
    const results = {};
    const widths = [340, 446, 560, 358];
    const rng = (() => { let s = 12345; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
    const segHitsBox = (a, b, bx, pad) => {
      const x0 = bx.x0 - pad, x1 = bx.x1 + pad, y0 = bx.y0 - pad, y1 = bx.y1 + pad, dx = b.x - a.x, dy = b.y - a.y;
      let t0 = 0, t1 = 1;
      const clip = (p, q) => { if (p === 0) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
      return clip(-dx, a.x - x0) && clip(dx, x1 - a.x) && clip(-dy, a.y - y0) && clip(dy, y1 - a.y);
    };
    const ov = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    for (const W of widths) {
      const host = document.createElement('div');
      host.style.cssText = `position:absolute;left:0;top:0;width:${W}px;`;
      document.body.appendChild(host);
      const plane = mod.createPlane(host, { id: `pr${W}`, xRange: [-4, 4], yRange: [-4, 4], grid: 'both' });
      const zh = plane.addPoint({ id: 'z', z: { re: 1, im: 1 }, label: 'z' });
      let cur = { re: 1, im: 1 };
      plane.addLayer((c, p) => { mod.drawCartAddress(c, p, cur); mod.drawPolarAddress(c, p, cur, { ghosts: 1 }); mod.drawSeam(c, p); });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const sz = plane.getSize ? plane.getSize() : { w: plane.canvas.clientWidth, h: plane.canvas.clientHeight };
      const pts = [];
      // fixed points
      for (const [re, im] of [[-1, Math.sqrt(3)], [2, 0.01], [-2, 0], [-2, -0.4], [2.2, 0.05], [3, 3], [-3, -2], [0.5, 0.2], [0, 2], [0, -2], [1, 1], [-1, -1], [2, 1], [3, -2]]) pts.push({ re, im });
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + 0.07; pts.push({ re: 2.2 * Math.cos(a), im: 2.2 * Math.sin(a) }); }
      for (let i = 0; i < 200; i++) pts.push({ re: (rng() * 2 - 1) * 3.5, im: (rng() * 2 - 1) * 3.5 });
      let nStruck = 0, nStruckDrop = 0, nLabelOverlap = 0, nUnderDot = 0, nOutside = 0, nRfar = 0, nArcTouch = 0, nMissingR = 0, nMissingArg = 0;
      const bad = [];
      for (const z of pts) {
        cur = z;
        rec.length = 0; recording = true;
        plane.requestDraw();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        recording = false;
        const T = plane.toPixel;
        const O = T({ re: 0, im: 0 }), Z = T(z), Fx = T({ re: z.re, im: 0 }), Fy = T({ re: 0, im: z.im });
        if (Math.hypot(Z.x - O.x, Z.y - O.y) < 6) continue;
        const boxes = rec.filter((r2) => r2.scaleX > 0 && /^(x =|y =|r =|Arg|also|seam)/.test(r2.text)).map((r2) => {
          const sx = 1; // coordinates are in CSS px under the dpr transform
          let x = r2.x;
          const l = r2.left, rr = r2.right; // actualBoundingBoxLeft is distance to the left of the alignment point
          const x0 = x - l, x1 = x + rr;
          const y0 = r2.y - r2.asc, y1 = r2.y + r2.desc;
          return { text: r2.text, x0, x1, y0, y1 };
        });
        const rbox = boxes.find((b) => /^r = /.test(b.text));
        if (!rbox) { nMissingR++; bad.push({ W, z, why: 'no r label' }); }
        if (!boxes.find((b) => /^Arg z/.test(b.text))) nMissingArg++;
        let flagged = false;
        if (rbox) {
          if (segHitsBox(O, Z, rbox, 0)) { nStruck++; flagged = true; bad.push({ W, z, why: 'r struck by own ray', rbox }); }
          if (segHitsBox(Z, Fx, rbox, 0) || segHitsBox(Z, Fy, rbox, 0)) { nStruckDrop++; flagged = true; bad.push({ W, z, why: 'r struck by drop line', rbox }); }
          // distance of the r label centre to the ray's line
          const cx = (rbox.x0 + rbox.x1) / 2, cy = (rbox.y0 + rbox.y1) / 2;
          const dx = Z.x - O.x, dy = Z.y - O.y, L = Math.hypot(dx, dy);
          const dist = Math.abs((cx - O.x) * dy - (cy - O.y) * dx) / L;
          if (dist > 56) nRfar++;
          // dot
          if (ov(rbox, { x0: Z.x - 8, x1: Z.x + 8, y0: Z.y - 8, y1: Z.y + 8 })) { nUnderDot++; bad.push({ W, z, why: 'r under dot' }); }
        }
        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i];
          if (b.x0 < 0 || b.x1 > sz.w || b.y0 < 0 || b.y1 > sz.h) { nOutside++; bad.push({ W, z, why: 'label outside canvas', text: b.text, b: b }); }
          if (ov(b, { x0: Z.x - 8, x1: Z.x + 8, y0: Z.y - 8, y1: Z.y + 8 }) ) { nUnderDot++; bad.push({ W, z, why: 'label under dot', text: b.text }); }
          for (let j = i + 1; j < boxes.length; j++) {
            // the Arg block and its "also" lines legitimately sit together: ignore pairs among Arg-block lines
            const a1 = /^Arg z|^also/.test(b.text), a2 = /^Arg z|^also/.test(boxes[j].text);
            if (a1 && a2) continue;
            if (ov(b, boxes[j])) { nLabelOverlap++; bad.push({ W, z, why: 'label overlap', a: b.text, b: boxes[j].text }); }
          }
        }
      }
      results[W] = { n: pts.length, nStruck, nStruckDrop, nLabelOverlap, nUnderDot, nOutside, nRfar, nMissingR, nMissingArg, bad: bad.slice(0, 12) };
      plane.destroy(); host.remove();
    }
    proto.fillText = orig;
    return results;
  });
  for (const W of Object.keys(out)) {
    const r = out[W];
    log(`W=${W}: n=${r.n} struckByRay=${r.nStruck} struckByDrop=${r.nStruckDrop} labelOverlap=${r.nLabelOverlap} underDot=${r.nUnderDot} outside=${r.nOutside} rFar(>56px)=${r.nRfar} missingR=${r.nMissingR} missingArg=${r.nMissingArg}`);
    for (const b of r.bad) log('   ' + JSON.stringify(b));
  }
}
