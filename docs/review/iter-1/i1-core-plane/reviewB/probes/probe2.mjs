// Independent probe 2: focus/pan, handle under zoom buttons, listener balance, y label clamp, a11y labels, theme refresh, coalescing.
import { dragHandle, planePixel, handleZ, readHandleLabel, settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  const { viewport, log, assert } = ctx;
  const phone = viewport.width <= 400;
  // Count add/removeEventListener on every element created (by wrapping the prototype) BEFORE the plane is built.
  await page.evaluate(async () => {
    const counts = { add: 0, remove: 0, perEl: new Map() };
    const ea = EventTarget.prototype.addEventListener, er = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (t, f, o) {
      if (this instanceof HTMLButtonElement && this.classList.contains('plane-handle')) {
        const k = this; const m = counts.perEl.get(k) || { add: 0, remove: 0 }; m.add++; counts.perEl.set(k, m);
      }
      return ea.call(this, t, f, o);
    };
    EventTarget.prototype.removeEventListener = function (t, f, o) {
      if (this instanceof HTMLButtonElement && this.classList.contains('plane-handle')) {
        const k = this; const m = counts.perEl.get(k) || { add: 0, remove: 0 }; m.remove++; counts.perEl.set(k, m);
      }
      return er.call(this, t, f, o);
    };
    window.__cnt = counts;
    const mod = await import(new URL('./js/core/plane.js', location.href).href);
    const host = document.createElement('section');
    host.id = 'p2-host';
    host.style.cssText = 'grid-column:1/-1;justify-self:center;width:100%;max-width:480px;margin:16px 0;padding:0 16px;box-sizing:border-box';
    const slot = document.createElement('div'); slot.id = 'p2-slot'; host.appendChild(slot);
    document.body.appendChild(host);
    const plane = mod.createPlane(slot, { id: 'p2', xRange: [-4, 4], yRange: [-4, 4], grid: 'both' });
    const a = plane.addPoint({ id: 'a', z: { re: 1, im: 1 }, label: 'a' });
    const b = plane.addPoint({ id: 'b', z: { re: 0, im: 0 }, label: 'b', color: '--output' });
    window.__p2 = { mod, plane, a, b };
  });
  await settle(page, 3);

  // ---- Issue 2: focus after a drag to the inset must not pan ----
  const view = () => page.evaluate(() => { const v = window.__p2.plane.getView(); return { re: v.center.re, im: v.center.im, u: v.unitsAcross }; });
  const v0 = await view();
  // drag far beyond the canvas edge (top-right-ish but away from the controls: left edge)
  const rect = await page.evaluate(() => { window.__p2.plane.canvas.scrollIntoView({ block: 'center' }); const r = window.__p2.plane.canvas.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  const hb = await page.locator('[id="p2-a"]').boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.l - 80, rect.t + rect.h * 0.6, { steps: 10 });
  await page.mouse.up();
  await settle(page, 3);
  const za = await handleZ(page, 'p2-a');
  const pa = await page.evaluate(() => window.__p2.plane.toPixel(window.__p2.a.z));
  log(`dragged to the left beyond the edge: a.z=${JSON.stringify(za)} pixel=${JSON.stringify(pa)}`);
  assert(pa.x >= 9.9 && pa.x <= 10.1, `a dot rests at the inset (x=${pa.x})`);
  // blur then focus programmatically and by keyboard
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
  const v1 = await view();
  await page.evaluate(() => document.getElementById('p2-a').focus());
  await settle(page, 3);
  const v2 = await view();
  log(`view before focus ${JSON.stringify(v1)} after focus ${JSON.stringify(v2)}`);
  assert(Math.abs(v2.re - v1.re) < 1e-9 && Math.abs(v2.im - v1.im) < 1e-9, 'focus after a drag to the inset does not pan');
  // keyboard focus via Tab to a handle
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); document.getElementById('p2-viewport').focus(); });
  await page.keyboard.press('Tab');
  await settle(page, 2);
  const active = await page.evaluate(() => document.activeElement && document.activeElement.id);
  const v3 = await view();
  log(`Tab landed on ${active}; view ${JSON.stringify(v3)}`);
  assert(Math.abs(v3.re - v1.re) < 1e-9 && Math.abs(v3.im - v1.im) < 1e-9, 'Tab focus does not pan for an in-view handle');

  // A handle whose dot is genuinely off-canvas (via set()) DOES pan on focus, and the dot ends whole inside.
  await page.evaluate(() => window.__p2.a.set({ re: -3.99, im: 3.99 }, { silent: true }));
  await settle(page, 2);
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); document.getElementById('p2-a').focus(); });
  await settle(page, 3);
  const pa2 = await page.evaluate(() => ({ p: window.__p2.plane.toPixel(window.__p2.a.z), s: window.__p2.plane.getSize() }));
  log(`edge handle after focus: ${JSON.stringify(pa2)}`);
  assert(pa2.p.x >= 7 && pa2.p.y >= 7 && pa2.p.x <= pa2.s.w - 7 && pa2.p.y <= pa2.s.h - 7, 'the dot is whole inside the canvas after focus');
  await page.evaluate(() => window.__p2.plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 }));
  await page.evaluate(() => window.__p2.a.set({ re: 1, im: 1 }, { silent: true }));
  await settle(page, 2);

  // ---- Issue 3: a handle under the zoom buttons ----
  const btnInfo = await page.evaluate(() => {
    const p = window.__p2.plane;
    const cr = document.querySelector('#p2-viewport .plane-controls').getBoundingClientRect();
    const canvasR = p.canvas.getBoundingClientRect();
    return { zin: document.getElementById('p2-zoom-in').getBoundingClientRect().toJSON(), cx: cr.left - canvasR.left + cr.width / 2, cy: cr.top - canvasR.top + 16, canvasLeft: canvasR.left, canvasTop: canvasR.top };
  });
  // put b exactly under the zoom-in button centre
  await page.evaluate(({ cx, cy }) => { const z = window.__p2.plane.fromPixel(cx, cy); window.__p2.b.set(z, { silent: true }); }, btnInfo);
  await settle(page, 3);
  const hit = await page.evaluate(() => {
    const el = document.getElementById('p2-b'), r = el.getBoundingClientRect();
    const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const pts = [[0, 0]];
    for (let k = 0; k < 8; k++) pts.push([Math.cos(k * Math.PI / 4) * 7, Math.sin(k * Math.PI / 4) * 7]);
    return pts.map(([dx, dy]) => { const t = document.elementFromPoint(c.x + dx, c.y + dy); return t && (el.contains(t) ? 'handle' : t.id || t.tagName); });
  });
  log(`elementFromPoint at dot centre and 8 rim points: ${hit.join(',')}`);
  assert(hit.every((h) => h === 'handle'), 'the handle under the zoom button is on top');
  const cls = await page.evaluate(() => document.getElementById('p2-b').className);
  log(`handle class: ${cls}`);
  // Drag it away from under the button using the real helper
  const back = await dragHandle(page, 'p2-b', { re: -2, im: -2 });
  log(`dragged away: ${JSON.stringify(back)}`);
  assert(Math.abs(back.re + 2) < 0.2 && Math.abs(back.im + 2) < 0.2, 'dragHandle moves the handle that sat under the buttons');
  // The buttons remain keyboard-reachable even when the handle sits on them: tab order includes them
  await page.evaluate(({ cx, cy }) => { const z = window.__p2.plane.fromPixel(cx, cy); window.__p2.b.set(z, { silent: true }); }, btnInfo);
  await settle(page, 2);
  const focusable = await page.evaluate(() => ['p2-zoom-in', 'p2-zoom-out', 'p2-zoom-reset'].map((id) => { const e = document.getElementById(id); e.focus(); return document.activeElement === e; }));
  log(`zoom buttons keyboard-focusable with the handle on top: ${focusable.join(',')}`);
  assert(focusable.every(Boolean), 'zoom buttons still focusable');
  // the zoom button outside the dot still clickable by mouse? click far side of the "Reset" button (dot at zoom-in)
  const resetBox = await page.locator('#p2-zoom-reset').boundingBox();
  await page.mouse.click(resetBox.x + resetBox.width / 2, resetBox.y + resetBox.height / 2);
  await settle(page, 2);
  log(`clicked Reset -> view ${JSON.stringify(await view())}`);
  await page.evaluate(() => window.__p2.b.set({ re: 0, im: 0 }, { silent: true }));

  // ---- Issue 4: listener balance ----
  const bal = await page.evaluate(() => {
    const c = window.__cnt, b = document.getElementById('p2-b'); const el = b;
    const before = c.perEl.get(el) || { add: 0, remove: 0 };
    window.__p2.b.remove();
    const after = c.perEl.get(el);
    return { before: { ...before }, after: { ...after } };
  });
  log(`handle b listeners: ${JSON.stringify(bal)}`);
  assert(bal.after.add === bal.after.remove && bal.after.add > 0, `listeners on a removed handle: added ${bal.after.add}, removed ${bal.after.remove}`);

  // ---- Issue 5: a label centred on its anchor (y label) stays inside the canvas at the top and bottom edges ----
  const clampRes = await page.evaluate(async () => {
    const { mod, plane } = window.__p2;
    const out = [];
    let cur = { re: 2, im: 1 };
    const rec = [];
    const proto = CanvasRenderingContext2D.prototype, orig = proto.fillText;
    let on = false;
    proto.fillText = function (t, x, y, m) { if (on) { const mm = this.measureText(t); rec.push({ t: String(t), x, y, a: mm.actualBoundingBoxAscent, d: mm.actualBoundingBoxDescent, l: mm.actualBoundingBoxLeft, r: mm.actualBoundingBoxRight }); } return orig.call(this, t, x, y, m); };
    plane.addLayer((c, p) => { mod.drawCartAddress(c, p, cur); mod.drawPolarAddress(c, p, cur); });
    const s = plane.getSize();
    for (const im of [3.98, 3.9, 3.7, -3.98, -3.9, -3.7, 3.99, -3.99]) for (const re of [2, -2, 0.5]) {
      cur = { re, im };
      rec.length = 0; on = true; plane.requestDraw();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      on = false;
      for (const q of rec) if (/^(x =|y =|r =|Arg|also)/.test(q.t)) {
        const y0 = q.y - q.a, y1 = q.y + q.d, x0 = q.x - q.l, x1 = q.x + q.r;
        if (y0 < 0 || y1 > s.h || x0 < 0 || x1 > s.w) out.push({ re, im, t: q.t, y0, y1, h: s.h, x0, x1, w: s.w });
      }
    }
    proto.fillText = orig;
    return { out, s };
  });
  log(`edge-label clamp: ${clampRes.out.length} labels outside canvas ${JSON.stringify(clampRes.out.slice(0, 5))}`);
  assert(clampRes.out.length === 0, 'no address label leaves the canvas near the top and bottom edges');

  // ---- A2: aria labels updated on set() ----
  await page.evaluate(() => window.__p2.a.set({ re: -1, im: Math.sqrt(3) }));
  const lab = await readHandleLabel(page, 'p2-a');
  log(`aria-label after set(): ${lab}`);
  assert(/z = -1 \+ 1\.732i; r = 2, θ = 2\.094 \(2π\/3, Arg\)/.test(lab) || /z = -1 \+ 1\.732i; r = 2, θ = 2\.094/.test(lab), 'aria label holds both addresses');
  const tag = await page.evaluate(() => { const e = document.getElementById('p2-a'); return [e.tagName, e.type, e.className]; });
  log(`handle element: ${tag.join(' | ')}`);

  // ---- A3: theme refresh: switching data-theme (and dispatching themechange) changes the drawn colours; redraws coalesce ----
  const theme = await page.evaluate(async () => {
    const { plane, mod } = window.__p2;
    const probe = [];
    const px = () => { const c = plane.canvas, g = c.getContext('2d'); const s = plane.getSize(); const d = c.width / s.w; const p = plane.toPixel({ re: 0, im: 0 }); const im = g.getImageData(Math.round((p.x + 20) * d), Math.round(p.y * d) - 1, 1, 1).data; return [im[0], im[1], im[2], im[3]]; };
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    document.documentElement.setAttribute('data-theme', 'light');
    document.dispatchEvent(new Event('themechange'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const light = px(), cartLight = getComputedStyle(document.documentElement).getPropertyValue('--cart').trim();
    document.documentElement.setAttribute('data-theme', 'dark');
    document.dispatchEvent(new Event('themechange'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const dark = px(), cartDark = getComputedStyle(document.documentElement).getPropertyValue('--cart').trim();
    // coalescing: 50 requestDraw calls in one tick -> one draw
    const before = plane.getStats().draws;
    for (let i = 0; i < 50; i++) plane.requestDraw();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = plane.getStats().draws;
    document.documentElement.removeAttribute('data-theme');
    return { light, dark, cartLight, cartDark, draws: after - before };
  });
  log(`theme: axis pixel light=${theme.light} dark=${theme.dark}; --cart ${theme.cartLight} vs ${theme.cartDark}; 50 requestDraw -> ${theme.draws} draw(s)`);
  assert(JSON.stringify(theme.light) !== JSON.stringify(theme.dark), 'canvas pixels differ between light and dark (tokens re-read)');
  assert(theme.draws === 1, `redraws coalesce (${theme.draws})`);
}
