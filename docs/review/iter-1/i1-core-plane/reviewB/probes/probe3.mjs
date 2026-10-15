// Independent probe 3: interface conformance (ARCHITECTURE 3.5), robustness, wheel/zoom, drawing events, teardown.
import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { viewport, log, assert } = ctx;
  const res = await page.evaluate(async () => {
    const mod = await import(new URL('./js/core/plane.js', location.href).href);
    const out = {};
    const exportsWanted = ['createPlane', 'cssColor', 'rampColor', 'drawCartAddress', 'drawPolarAddress', 'drawSeam', 'drawCircle', 'drawRay', 'drawSegment', 'drawArc', 'drawTimedCurve', 'drawDot', 'drawLabel', 'drawPolygonFill', 'makeTransform', 'mixColor', 'niceGridStep'];
    out.missingExports = exportsWanted.filter((k) => typeof mod[k] !== 'function');
    const host = document.createElement('div'); host.style.cssText = 'grid-column:1/-1;justify-self:center;width:300px;margin:16px 0'; document.body.appendChild(host);
    const errs = []; const oe = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); oe.apply(console, a); };
    const plane = mod.createPlane(host, { id: 'q', xRange: [-4, 4], yRange: [-2, 2], grid: 'polar', axisLabels: ['u', 'v'] });
    const keys = ['el', 'canvas', 'toPixel', 'fromPixel', 'getView', 'setView', 'fitTo', 'setGrid', 'addPoint', 'addLayer', 'addCurve', 'on', 'setDrawMode', 'requestDraw', 'resize', 'destroy'];
    out.missingPlaneKeys = keys.filter((k) => !(k in plane));
    out.dataAttrs = { id: plane.el.dataset.planeId, cre: plane.el.dataset.centerRe, cim: plane.el.dataset.centerIm, scale: plane.el.dataset.scale };
    out.registered = window.__mv && window.__mv.planes.get('q') === plane;
    // the shorter axis is expanded so 1 unit is square: xRange [-4,4], yRange [-2,2] -> canvas 300 wide; height?
    const v = plane.getView(); out.view = { unitsAcross: v.unitsAcross, scale: v.scale, canvas: [plane.canvas.clientWidth, plane.canvas.clientHeight] };
    out.squareUnits = Math.abs((plane.canvas.clientHeight / plane.getView().scale) - 4) < 0.05 || 'height/scale=' + plane.canvas.clientHeight / plane.getView().scale;
    // handle API
    const hd = plane.addPoint({ id: 'p', z: { re: 1, im: 2 }, label: 'p' });
    out.handleKeys = ['id', 'z', 'el', 'set', 'remove', 'hidden'].filter((k) => !(k in hd));
    // bad input robustness
    try { plane.addPoint({ id: 'nan', z: { re: NaN, im: 0 } }); out.nanOK = true; } catch (e) { out.nanOK = 'threw ' + e.message; }
    try { hd.set({ re: Infinity, im: 0 }); hd.set({ re: 1, im: 1 }); out.setInfOK = true; } catch (e) { out.setInfOK = 'threw ' + e.message; }
    try { plane.addPoint({ id: 'p', z: { re: 0, im: 0 } }); out.dupOK = 'no throw'; } catch (e) { out.dupOK = 'threw: ' + e.message; }
    try { plane.fitTo([]); plane.fitTo([{ re: 1, im: 1 }]); plane.fitTo([{ re: 0, im: 0 }, { re: 3, im: 4 }]); out.fitOK = true; } catch (e) { out.fitOK = 'threw ' + e.message; }
    // curve
    const pts = Array.from({ length: 30 }, (_, i) => ({ re: Math.cos(i / 5), im: Math.sin(i / 5), t: i / 29 }));
    const cv = plane.addCurve({ id: 'c', points: pts });
    out.curveKeys = ['update', 'setColor', 'remove', 'hidden'].filter((k) => !(k in cv));
    plane.setGrid('both'); plane.setGrid('none'); plane.setGrid('cart');
    // pointer events on empty canvas
    const events = []; for (const k of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'viewchange']) plane.on(k, (e) => events.push(k));
    out.events = events;
    window.__q = { plane, mod, hd, cv, errs, events };
    return out;
  });
  log(JSON.stringify(res));
  assert(res.missingExports.length === 0, `exports missing: ${res.missingExports}`);
  assert(res.missingPlaneKeys.length === 0, `plane keys missing: ${res.missingPlaneKeys}`);
  assert(res.registered, 'registered in window.__mv.planes');
  assert(res.handleKeys.length === 0, `handle keys missing ${res.handleKeys}`);
  assert(res.curveKeys.length === 0, `curve keys missing ${res.curveKeys}`);
  await settle(page, 3);

  // real pointer events on empty canvas: draw mode
  const info = await page.evaluate(() => { const p = window.__q.plane; p.canvas.scrollIntoView({ block: 'center' }); const r = p.canvas.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  await page.evaluate(() => window.__q.plane.setDrawMode(true));
  const v0 = await page.evaluate(() => JSON.stringify(window.__q.plane.getView()));
  await page.mouse.move(info.l + 100, info.t + info.h * 0.3);
  await page.mouse.down();
  await page.mouse.move(info.l + 150, info.t + info.h * 0.3 + 20, { steps: 5 });
  await page.mouse.up();
  const v1 = await page.evaluate(() => JSON.stringify(window.__q.plane.getView()));
  log(`draw mode: view unchanged=${v0 === v1}; events=${await page.evaluate(() => window.__q.events.join(','))}`);
  assert(v0 === v1, 'draw mode disables pan');
  await page.evaluate(() => window.__q.plane.setDrawMode(false));
  await page.mouse.move(info.l + 100, info.t + info.h * 0.3);
  await page.mouse.down();
  await page.mouse.move(info.l + 150, info.t + info.h * 0.3 + 20, { steps: 5 });
  await page.mouse.up();
  const v2 = await page.evaluate(() => JSON.stringify(window.__q.plane.getView()));
  assert(v2 !== v1, 'drag on empty canvas pans when not in draw mode');
  // plane keyboard zoom
  await page.evaluate(() => document.getElementById('q-viewport').focus());
  const u0 = await page.evaluate(() => window.__q.plane.getView().unitsAcross);
  await page.keyboard.press('+');
  const u1 = await page.evaluate(() => window.__q.plane.getView().unitsAcross);
  await page.keyboard.press('0');
  await settle(page, 2);
  const u2 = await page.evaluate(() => window.__q.plane.getView().unitsAcross);
  log(`zoom: ${u0} -> + -> ${u1} -> 0 -> ${u2}`);
  assert(u1 < u0, '+ zooms in');
  // teardown: destroy removes DOM, unregisters, no console errors
  const td = await page.evaluate(async () => {
    const { plane, errs } = window.__q;
    plane.destroy();
    plane.destroy();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { registered: window.__mv.planes.has('q'), domLeft: !!document.getElementById('q-viewport'), errs, handleLeft: !!document.getElementById('q-p') };
  });
  log(`teardown: ${JSON.stringify(td)}`);
  assert(!td.registered && !td.domLeft && !td.handleLeft, 'destroy cleans up');
  assert(td.errs.length === 0, `console.error during robustness probe: ${td.errs.join(' || ')}`);
  // zero-size / hidden container
  const hid = await page.evaluate(async () => {
    const mod = await import(new URL('./js/core/plane.js', location.href).href);
    const errs = []; const oe = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
    const h = document.createElement('div'); h.style.display = 'none'; document.body.appendChild(h);
    const p = mod.createPlane(h, { id: 'hid', grid: 'both' });
    p.addPoint({ id: 'z', z: { re: 1, im: 1 } }); p.addLayer((c, pl) => { mod.drawCartAddress(c, pl, { re: 1, im: 1 }); mod.drawPolarAddress(c, pl, { re: 1, im: 1 }, { ghosts: 2 }); mod.drawSeam(c, pl); });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    h.style.display = 'block'; h.style.width = '280px';
    await new Promise((r) => setTimeout(r, 200));
    const size = p.getSize ? p.getSize() : null;
    p.destroy(); h.remove(); console.error = oe;
    return { errs, size };
  });
  log(`hidden-then-shown container: ${JSON.stringify(hid)}`);
  assert(hid.errs.length === 0, 'no console errors with a hidden container');
}
