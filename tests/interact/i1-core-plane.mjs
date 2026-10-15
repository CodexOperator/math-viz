// tests/interact/i1-core-plane.mjs
// Run: node tools/smoke.mjs --route i1-core-plane --script tests/interact/i1-core-plane.mjs --out docs/review/iter-1/i1-core-plane
// (add --dark once to also capture the loaded route in dark; this script switches theme itself).
//
// The route is unknown to the router, whose "No such place" panel is fine: this script builds its own fixture in
// document.body (never inside #view), drives it with REAL mouse and keyboard events, and runs at both harness
// viewports (desktop 1280x860, phone 390x844) on fresh pages. Steps S0 to S13 follow docs/designs/iter-1/i1-core-plane.md 7.3;
// S14 to S17 are the fix-round checks (label collisions and the r label against its own ray, measured on the real canvas;
// handles at the edges, under the zoom buttons and on keyboard focus; the wheel cap; listener balance, handles included).
// S18 to S23 are the residue round: the ramp weight, the handle options (labelSide, setLabel, symbol, describe, zOrder, altKey),
// handle labels that step off the zoom buttons, tick numbers and each other, axes near the canvas edge, the label placer and
// obstacles in a real frame, and the text caches. (The destroy and re-create step keeps its name S13 and runs last.)
import path from 'node:path';
import { dragHandle, dragHandleAround, planePixel, handleZ, readHandleLabel, settle, nums } from './_helpers.mjs';

export default async function (page, ctx) {
  const { viewport, log, assert, shot } = ctx;
  const phone = viewport.width <= 400;
  const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: expected ${b} (+-${tol}), got ${a}`);
  const view = () => page.evaluate(() => window.__pt.plane.getView());
  const stat = (name) => page.evaluate((n) => window.__pt.plane.getStats()[n], name);
  const wait = (ms) => page.waitForTimeout(ms);

  // Writes a crop of the plane next to the harness screenshot, so the builder can LOOK at the plane itself.
  const crop = async (name, shotFile, sel = '#pt-plane-viewport') => {
    if (!shotFile) return;
    const out = path.join(path.dirname(shotFile), `${path.basename(shotFile, '.png')}-crop.png`);
    await page.locator(sel).screenshot({ path: out });
  };

  // ---------------------------------------------------------------------------------------------
  // Fixture
  // ---------------------------------------------------------------------------------------------
  await page.evaluate(async () => {
    const mod = await import(new URL('./js/core/plane.js', location.href).href);        // the module instance the app would use
    const host = document.createElement('section');
    host.id = 'pt-host';
    // The shell lays <body> out as a grid; span all columns and centre the 480 px host explicitly.
    host.style.cssText = 'grid-column:1/-1;justify-self:center;width:100%;max-width:480px;margin:16px 0;padding:0 16px;box-sizing:border-box';
    const slot = document.createElement('div');
    slot.id = 'pt-slot';
    host.appendChild(slot);
    document.body.appendChild(host);
    window.__pt = { mod, host, slot, log: [], views: [], events: [] };
    const plane = mod.createPlane(slot, { id: 'pt-plane', xRange: [-4, 4], yRange: [-4, 4], grid: 'both' });
    const z = plane.addPoint({ id: 'z', z: { re: 2, im: 1 }, label: 'z',
      onDrag: (zz, info) => window.__pt.log.push({ re: zz.re, im: zz.im, final: info.final, source: info.source }) });
    const w = plane.addPoint({ id: 'w', z: { re: -3, im: -2 }, color: '--output', label: 'w', draggable: false });
    plane.addLayer((c, p) => { mod.drawCartAddress(c, p, z.z); mod.drawPolarAddress(c, p, z.z, { ghosts: 1 }); mod.drawSeam(c, p); });
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push({ re: -2.1, im: -3 + 6 * t, t }); }      // x = -2.1: clear of the "w" label (it was -2.5, under it on the phone)
    plane.addCurve({ id: 'ramp', points: pts, color: '--input', width: 3 });
    plane.on('viewchange', (v) => window.__pt.views.push(v.reason));
    Object.assign(window.__pt, { plane, z, w });
  });
  await settle(page, 3);

  // ---------------------------------------------------------------------------------------------
  // S0 static structure and accessibility at run time (A2)
  // ---------------------------------------------------------------------------------------------
  {
    const s = await page.evaluate(() => {
      const z = document.getElementById('pt-plane-z'), w = document.getElementById('pt-plane-w');
      const pl = document.querySelector('.plane[data-plane-id="pt-plane"]');
      const cv = document.getElementById('pt-plane-canvas');
      const vp = document.getElementById('pt-plane-viewport');
      return {
        zTag: z.tagName, zType: z.getAttribute('type'), zClass: z.className, zLabel: z.getAttribute('aria-label'), wLabel: w.getAttribute('aria-label'),
        zText: z.textContent.trim(),
        id: pl.dataset.planeId, cre: pl.dataset.centerRe, cim: pl.dataset.centerIm, scale: Number(pl.dataset.scale), cw: cv.clientWidth, ch: cv.clientHeight,
        registered: window.__mv.planes.get('pt-plane') === window.__pt.plane,
        role: vp.getAttribute('role'), tabindex: vp.getAttribute('tabindex'), vpLabel: vp.getAttribute('aria-label'),
        controls: ['zoom-in', 'zoom-out', 'zoom-reset', 'status'].map((k) => !!document.getElementById(`pt-plane-${k}`)),
        canvasHidden: cv.getAttribute('aria-hidden'),
        noteHidden: document.querySelector('#pt-plane-viewport .plane-note').hidden,
        styleTags: document.head.querySelectorAll('style[data-for="plane"]').length,
      };
    });
    assert(s.zTag === 'BUTTON' && s.zType === 'button' && /\bplane-handle\b/.test(s.zClass), `handle is a button.plane-handle (${s.zTag}, ${s.zType}, ${s.zClass})`);
    assert(s.zLabel === 'z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)', `z aria-label: ${s.zLabel}`);
    assert(s.wLabel === 'w: z = -3 - 2i; r = 3.606, θ = -2.554 (Arg)', `w aria-label: ${s.wLabel}`);
    assert(s.zText === 'z', `the handle shows its label "z" (${s.zText})`);
    assert(s.id === 'pt-plane' && s.cre === '0' && s.cim === '0', `data attributes: ${s.id} ${s.cre} ${s.cim}`);
    near(s.scale, s.cw / 8, 0.01, 'data-scale is canvas width / unitsAcross');
    assert(s.registered, 'window.__mv.planes.get("pt-plane") is the plane');
    assert(s.role === 'group' && s.tabindex === '0', `viewport role/tabindex: ${s.role} ${s.tabindex}`);
    assert(/Arrow keys pan, plus and minus zoom, zero resets the view\./.test(s.vpLabel), `viewport label: ${s.vpLabel}`);
    assert(s.controls.every(Boolean), `zoom buttons and status exist: ${s.controls}`);
    assert(s.canvasHidden === 'true' && s.noteHidden === true, 'canvas is aria-hidden and the failure note is hidden');
    assert(s.styleTags === 1, `exactly one <style data-for="plane"> (${s.styleTags})`);
    near(s.cw, s.ch, 1, 'the canvas is square');
  }

  // ---------------------------------------------------------------------------------------------
  // S1 drag with the real mouse (A2, A5)
  // ---------------------------------------------------------------------------------------------
  {
    const target = { re: -1, im: Math.sqrt(3) };
    const end = await dragHandle(page, 'pt-plane-z', target);
    near(end.re, target.re, 0.012, 'S1 re');
    near(end.im, target.im, 0.012, 'S1 im');
    // The label always describes the position the handle ended at (3 decimals), in both addresses.
    const label = await readHandleLabel(page, 'pt-plane-z');
    assert(/^z = .* [+-] .*i; r = .*, θ = .*Arg\)$/.test(label), `S1 label shape: ${label}`);
    const [lre, lim] = nums(label);                         // nums() reads the spaced minus of "3 - 2i" as a sign
    near(lre, end.re, 0.001, 'S1 label re matches the handle'); near(lim, end.im, 0.001, 'S1 label im matches the handle (with its sign)');
    // Put the handle exactly on -1 + i sqrt 3 with the API so the pinned label and the screenshots are exact.
    await page.evaluate(() => window.__pt.z.set({ re: -1, im: Math.sqrt(3) }, { silent: true }));
    await settle(page, 2);
    assert((await readHandleLabel(page, 'pt-plane-z')) === 'z = -1 + 1.732i; r = 2, θ = 2.094 (2π/3, Arg)', 'S1 pinned aria-label');
    const log = await page.evaluate(() => window.__pt.log.slice());
    assert(log.length >= 5, `S1 onDrag fired at least 5 times (${log.length})`);
    assert(log.slice(0, -1).every((e) => e.final === false) && log[log.length - 1].final === true, 'S1 final:false ... then one final:true');
    assert(log.every((e) => e.source === 'pointer'), 'S1 every call has source "pointer", none "api"');
    const f = await shot('plane-light');
    await crop('plane-light', f);
  }

  // ---------------------------------------------------------------------------------------------
  // S2 keyboard
  // ---------------------------------------------------------------------------------------------
  {
    const z0 = await handleZ(page, 'pt-plane-z');
    const n0 = await page.evaluate(() => window.__pt.log.length);
    await page.focus('#pt-plane-z');
    await page.keyboard.press('ArrowRight');
    let z1 = await handleZ(page, 'pt-plane-z');
    near(z1.re, z0.re + 0.1, 1e-6, 'S2 ArrowRight re'); near(z1.im, z0.im, 1e-6, 'S2 ArrowRight im');
    await page.keyboard.press('Shift+ArrowUp');
    z1 = await handleZ(page, 'pt-plane-z');
    near(z1.im, z0.im + 1, 1e-6, 'S2 Shift+ArrowUp im');
    await page.keyboard.press('Alt+ArrowLeft');
    z1 = await handleZ(page, 'pt-plane-z');
    near(z1.re, z0.re + 0.1 - 0.01, 1e-6, 'S2 Alt+ArrowLeft re');
    const entries = await page.evaluate((n) => window.__pt.log.slice(n), n0);
    assert(entries.length === 3 && entries.every((e) => e.source === 'keyboard' && e.final === true), `S2 keyboard log: ${JSON.stringify(entries)}`);
    await wait(450);
    const status = await page.textContent('#pt-plane-status');
    assert(status === (await readHandleLabel(page, 'pt-plane-z')), `S2 live region announces the label: "${status}"`);
    // the non-draggable handle does not move
    await page.focus('#pt-plane-w');
    await page.keyboard.press('ArrowRight');
    assert((await page.getAttribute('#pt-plane-w', 'data-re')) === '-3', 'S2 the non-draggable handle stays put');
    // Escape during a real pointer drag puts the point back
    await page.evaluate((z) => window.__pt.z.set(z, { silent: true }), { re: 1, im: 1 });
    await settle(page, 2);
    const start = await planePixel(page, 'pt-plane', { re: 1, im: 1 });
    const away = await planePixel(page, 'pt-plane', { re: -2, im: 2 });
    const nEsc = await page.evaluate(() => window.__pt.log.length);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(away.x, away.y, { steps: 6 });
    const during = await handleZ(page, 'pt-plane-z');
    assert(Math.hypot(during.re + 2, during.im - 2) < 0.05, `S2 the handle follows the pointer before Escape (${JSON.stringify(during)})`);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    const after = await handleZ(page, 'pt-plane-z');
    near(after.re, 1, 1e-6, 'S2 Escape restores re'); near(after.im, 1, 1e-6, 'S2 Escape restores im');
    const escLog = await page.evaluate((n) => window.__pt.log.slice(n), nEsc);
    assert(escLog.length >= 2 && escLog[escLog.length - 1].final === true && Math.abs(escLog[escLog.length - 1].re - 1) < 1e-6, 'S2 Escape ends the drag with final:true at the start');
    await page.evaluate(() => window.__pt.z.set({ re: -1, im: Math.sqrt(3) }, { silent: true }));
    await settle(page, 2);
  }

  // ---------------------------------------------------------------------------------------------
  // S3 zoom controls and keys
  // ---------------------------------------------------------------------------------------------
  {
    const centre = () => page.evaluate(() => window.__pt.plane.getView().center);
    const scaleNow = () => page.evaluate(() => Number(document.querySelector('[data-plane-id="pt-plane"].plane').dataset.scale));
    const cw = await page.evaluate(() => document.getElementById('pt-plane-canvas').clientWidth);
    const showPlane = () => page.evaluate(() => document.getElementById('pt-plane-canvas').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await showPlane();
    await page.click('#pt-plane-zoom-in');
    near((await view()).unitsAcross, 6.4, 1e-9, 'S3 zoom in button'); near(await scaleNow(), cw / 6.4, 0.01, 'S3 data-scale follows zoom in');
    await page.click('#pt-plane-zoom-out');
    near((await view()).unitsAcross, 8, 1e-9, 'S3 zoom out button'); near(await scaleNow(), cw / 8, 0.01, 'S3 data-scale follows zoom out');
    await page.focus('#pt-plane-viewport');
    await page.keyboard.press('+');
    near((await view()).unitsAcross, 6.4, 1e-9, 'S3 + key');
    await page.keyboard.press('-');
    near((await view()).unitsAcross, 8, 1e-9, 'S3 - key');
    await page.keyboard.press('ArrowRight');
    near((await centre()).re, 0.8, 1e-6, 'S3 ArrowRight pans 10% of the width');
    await page.keyboard.press('Shift+ArrowUp');
    near((await centre()).im, 4, 0.05, 'S3 Shift+ArrowUp pans 50% of the height');
    await page.keyboard.press('0');
    let v = await view();
    near(v.center.re, 0, 1e-9, 'S3 0 resets centre re'); near(v.center.im, 0, 1e-9, 'S3 0 resets centre im'); near(v.unitsAcross, 8, 1e-9, 'S3 0 resets unitsAcross');
    for (let i = 0; i < 15; i++) await page.keyboard.press('+');
    near((await view()).unitsAcross, 0.5, 1e-9, 'S3 15 x + clamps at minUnitsAcross');
    assert((await page.getAttribute('#pt-plane-zoom-in', 'aria-disabled')) === 'true', 'S3 zoom in is aria-disabled at the limit');
    await wait(450);
    assert((await page.textContent('#pt-plane-status')) === 'That is as far in as it goes.', `S3 limit message: "${await page.textContent('#pt-plane-status')}"`);
    await page.keyboard.press('0');
    assert((await page.getAttribute('#pt-plane-zoom-in', 'aria-disabled')) === 'false', 'S3 zoom in is enabled again after reset');
    const reasons = await page.evaluate(() => window.__pt.views);
    assert(reasons.includes('zoom') && reasons.includes('reset') && reasons.includes('pan'), `S3 viewchange reasons: ${reasons}`);
  }

  // ---------------------------------------------------------------------------------------------
  // S4 pan, wheel policy, pinch
  // ---------------------------------------------------------------------------------------------
  {
    const p0 = await planePixel(page, 'pt-plane', { re: 3, im: -3 });
    const x0 = Math.round(p0.x), y0 = Math.round(p0.y);                    // integer pixels: the expected offsets are exact
    const sc = (await view()).scale;
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x0 - 60, y0 - 40, { steps: 6 });
    assert(await page.evaluate(() => document.querySelector('[data-plane-id="pt-plane"].plane').classList.contains('is-panning')), 'S4 is-panning while dragging');
    await page.mouse.up();
    const v = await view();
    near(v.center.re, 60 / sc, 1e-6, 'S4 pan re'); near(v.center.im, -40 / sc, 1e-6, 'S4 pan im');
    assert(!(await page.evaluate(() => document.querySelector('[data-plane-id="pt-plane"].plane').classList.contains('is-panning'))), 'S4 is-panning is gone after the drag');

    // wheel without focus must NOT zoom (the page keeps scrolling)
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    const q = await planePixel(page, 'pt-plane', { re: 1.5, im: -2.5 });
    const qx = Math.round(q.x), qy = Math.round(q.y);
    await page.mouse.move(qx, qy);
    await page.mouse.wheel(0, -240);
    await wait(120);
    near((await view()).unitsAcross, 8, 1e-9, 'S4 wheel without focus leaves unitsAcross alone');

    // clicking empty space focuses the plane; a click is not a pan
    const c0 = (await view()).center;
    const e = await planePixel(page, 'pt-plane', { re: 3, im: -3 });
    await page.mouse.click(Math.round(e.x), Math.round(e.y));
    assert((await page.evaluate(() => document.activeElement && document.activeElement.id)) === 'pt-plane-viewport', 'S4 click on empty space focuses the plane');
    const c1 = (await view()).center;
    near(c1.re, c0.re, 1e-9, 'S4 a click does not pan'); near(c1.im, c0.im, 1e-9, 'S4 a click does not pan (im)');

    // wheel with focus zooms about the cursor
    const q2 = await planePixel(page, 'pt-plane', { re: 1.5, im: -2.5 });
    const rx = Math.round(q2.x), ry = Math.round(q2.y);
    const under = () => page.evaluate(({ rx, ry }) => {
      const r = document.getElementById('pt-plane-canvas').getBoundingClientRect();
      return window.__pt.plane.fromPixel(rx - r.left, ry - r.top);
    }, { rx, ry });
    const before = await under();
    await page.mouse.move(rx, ry);
    await page.mouse.wheel(0, -240);
    await wait(120);
    const after = await under();
    const u = (await view()).unitsAcross;
    assert(u > 4 && u < 7.9, `S4 wheel with focus zooms in (unitsAcross ${u})`);
    near(after.re, before.re, 1e-6, 'S4 the point under the cursor stays put (re)'); near(after.im, before.im, 1e-6, 'S4 the point under the cursor stays put (im)');
    await page.keyboard.press('0');
    near((await view()).unitsAcross, 8, 1e-9, 'S4 0 resets after the wheel');

    // two-finger pinch (synthetic touch pointer events): spread the fingers to twice the distance -> half the units
    await page.evaluate(() => {
      const cv = document.getElementById('pt-plane-canvas'), r = cv.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const fire = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 101, clientX: x, clientY: y, button: 0, bubbles: true }));
      fire('pointerdown', 101, cx - 40, cy); fire('pointerdown', 102, cx + 40, cy);
      fire('pointermove', 101, cx - 80, cy); fire('pointermove', 102, cx + 80, cy);
      fire('pointerup', 101, cx - 80, cy); fire('pointerup', 102, cx + 80, cy);
    });
    const pv = await view();
    near(pv.unitsAcross, 4, 1e-6, 'S4 pinch to twice the finger distance halves unitsAcross');
    near(pv.center.re, 0, 1e-6, 'S4 a symmetric pinch about the centre does not pan');
    await page.keyboard.press('0');
  }

  // ---------------------------------------------------------------------------------------------
  // S5 draw mode and station events
  // ---------------------------------------------------------------------------------------------
  {
    await page.evaluate(() => {
      const { plane, events } = window.__pt;
      window.__pt.off = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].map((t) => plane.on(t, (e) => events.push({ type: e.type, re: e.z.re, im: e.z.im, dragging: e.dragging, pointerType: e.pointerType })));
      plane.setDrawMode(true);
    });
    const info = await page.evaluate(() => ({
      mode: window.__pt.plane.isDrawMode(),
      cls: document.querySelector('[data-plane-id="pt-plane"].plane').classList.contains('is-drawing'),
      ta: getComputedStyle(document.getElementById('pt-plane-canvas')).touchAction,
    }));
    assert(info.mode && info.cls && info.ta === 'none', `S5 draw mode: ${JSON.stringify(info)}`);
    const a = await planePixel(page, 'pt-plane', { re: -2, im: -3 });
    const b = await planePixel(page, 'pt-plane', { re: 2, im: -3 });
    const c0 = (await view()).center;
    await page.mouse.move(a.x, a.y);                       // hover onto the start point (a hover move is reported too)
    await page.evaluate(() => { window.__pt.events.length = 0; });
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    const ev = await page.evaluate(() => window.__pt.events.slice());
    const downs = ev.filter((e) => e.type === 'pointerdown'), moves = ev.filter((e) => e.type === 'pointermove' && e.dragging), ups = ev.filter((e) => e.type === 'pointerup');
    assert(ev[0] && ev[0].type === 'pointerdown', `S5 the first event is pointerdown (${ev[0] && ev[0].type})`);
    near(ev[0].re, -2, 0.02, 'S5 pointerdown z re'); near(ev[0].im, -3, 0.02, 'S5 pointerdown z im');
    assert(downs.length === 1 && moves.length >= 6 && ups.length === 1, `S5 event counts: ${downs.length} down, ${moves.length} moves, ${ups.length} up`);
    assert(ev[ev.length - 1].type === 'pointerup', 'S5 the last event is pointerup');
    const c1 = (await view()).center;
    near(c1.re, c0.re, 1e-9, 'S5 no pan in draw mode'); near(c1.im, c0.im, 1e-9, 'S5 no pan in draw mode (im)');
    // hover: moves with dragging false
    await page.evaluate(() => { window.__pt.events.length = 0; });
    const h1 = await planePixel(page, 'pt-plane', { re: 1, im: -3.2 });
    await page.mouse.move(h1.x, h1.y);
    await page.mouse.move(h1.x + 20, h1.y - 10, { steps: 3 });
    const hover = await page.evaluate(() => window.__pt.events.slice());
    assert(hover.length >= 1 && hover.every((e) => e.type === 'pointermove' && e.dragging === false), `S5 hover moves have dragging:false (${JSON.stringify(hover.slice(0, 2))})`);
    // dragging a handle never reaches the station events
    await page.evaluate(() => { window.__pt.events.length = 0; });
    await dragHandle(page, 'pt-plane-z', { re: 1, im: 1 });
    const hd = await page.evaluate(() => window.__pt.events.slice());
    assert(!hd.some((e) => e.type === 'pointerdown' || e.type === 'pointerup' || (e.type === 'pointermove' && e.dragging)), `S5 a handle drag adds no pointerdown, pointerup or dragging moves (${hd.length} events)`);
    // leave draw mode: a drag pans again
    await page.evaluate(() => { window.__pt.off.forEach((f) => f()); window.__pt.plane.setDrawMode(false); });
    assert(!(await page.evaluate(() => window.__pt.plane.isDrawMode())), 'S5 draw mode is off again');
    const p = await planePixel(page, 'pt-plane', { re: 3, im: -3 });
    const px = Math.round(p.x), py = Math.round(p.y);
    await page.mouse.move(px, py);
    await page.mouse.down();
    await page.mouse.move(px - 40, py, { steps: 4 });
    await page.mouse.up();
    assert(Math.abs((await view()).center.re) > 0.1, 'S5 after draw mode a drag pans again');
    await page.keyboard.press('0');
    await page.evaluate(() => window.__pt.z.set({ re: -1, im: Math.sqrt(3) }, { silent: true }));
    await settle(page, 2);
  }

  // ---------------------------------------------------------------------------------------------
  // S6 time ramp pixels (A4), and S7 theme and coalescing (A3)
  // ---------------------------------------------------------------------------------------------
  const lumas = () => page.evaluate(() => {
    const { plane } = window.__pt, cv = plane.canvas, c2 = cv.getContext('2d'), k = cv.width / cv.clientWidth;
    const px = (z) => { const q = plane.toPixel(z), d = c2.getImageData(Math.floor(q.x * k), Math.floor(q.y * k), 1, 1).data; return { a: d[3], luma: 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2] }; };
    return { early: px({ re: -2.1, im: -2.4 }), late: px({ re: -2.1, im: 2.4 }) };
  });
  const hasT0 = await page.evaluate(() => !!getComputedStyle(document.documentElement).getPropertyValue('--t0').trim());
  {
    if (!hasT0) log('S6 skipped: --t0 is not defined (the shell is not merged)');
    else {
      const l = await lumas();
      assert(l.early.a === 255 && l.late.a === 255, `S6 the stroke is opaque at t = 0.1 and 0.9 (${l.early.a}, ${l.late.a})`);
      assert(l.late.luma - l.early.luma > 20, `S6 later is lighter: luma(0.9) - luma(0.1) = ${(l.late.luma - l.early.luma).toFixed(1)}`);
      log(`S6 luma(0.1) = ${l.early.luma.toFixed(0)}, luma(0.9) = ${l.late.luma.toFixed(0)}`);
    }
  }
  {
    await settle(page, 3);
    // Switch to the OTHER theme than the one the page started in (the harness also runs a dark-scheme desktop with --dark).
    const startDark = await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
    const target = startDark ? 'light' : 'dark';
    const r = await page.evaluate(async (target) => {
      const raf = () => new Promise((res) => requestAnimationFrame(res));
      const { plane, mod } = window.__pt;
      await raf(); await raf();
      const d0 = plane.getStats().draws;
      for (let i = 0; i < 50; i++) plane.requestDraw();
      await raf(); await raf();
      const d1 = plane.getStats().draws;
      const lightCart = mod.cssColor('--cart'), lightBg = getComputedStyle(plane.el).backgroundColor;
      document.documentElement.setAttribute('data-theme', target);
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: target } }));
      await raf(); await raf();
      const d2 = plane.getStats().draws;
      return { d0, d1, d2, lightCart, darkCart: mod.cssColor('--cart'), lightBg, darkBg: getComputedStyle(plane.el).backgroundColor };
    }, target);
    assert(r.d1 - r.d0 >= 1 && r.d1 - r.d0 <= 2, `S7 50 requestDraw calls coalesce into 1 to 2 draws (${r.d1 - r.d0})`);
    assert(r.d2 - r.d1 >= 1, `S7 a themechange repaints (${r.d2 - r.d1} draws)`);
    assert(r.lightCart !== r.darkCart || r.lightBg !== r.darkBg, `S7 the tokens changed with the theme (${r.lightCart} -> ${r.darkCart}; ${r.lightBg} -> ${r.darkBg})`);
    const f = await shot(`plane-${target}`);
    await crop(`plane-${target}`, f);
    if (hasT0) {
      const l = await lumas();
      assert(l.late.luma - l.early.luma > 20, `S7 ${target}: later is lighter: luma(0.9) - luma(0.1) = ${(l.late.luma - l.early.luma).toFixed(1)}`);
      log(`S7 ${target} luma(0.1) = ${l.early.luma.toFixed(0)}, luma(0.9) = ${l.late.luma.toFixed(0)}`);
    }
    await page.evaluate(async (startDark) => {
      document.documentElement.removeAttribute('data-theme');
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: startDark ? 'dark' : 'light' } }));
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    }, startDark);
  }

  // ---------------------------------------------------------------------------------------------
  // S8 resize
  // ---------------------------------------------------------------------------------------------
  {
    const check = async (label) => {
      const m = await page.evaluate(() => {
        const { plane, z } = window.__pt, cv = plane.canvas, r = cv.getBoundingClientRect(), b = document.getElementById('pt-plane-z').getBoundingClientRect(), q = plane.toPixel(z.z);
        return { cw: cv.clientWidth, scale: Number(plane.el.dataset.scale), dx: b.left + b.width / 2 - r.left - q.x, dy: b.top + b.height / 2 - r.top - q.y };
      });
      return m;
    };
    await page.evaluate(() => { window.__pt.host.style.maxWidth = '332px'; });
    await page.waitForFunction(() => document.getElementById('pt-plane-canvas').clientWidth === 298 && Number(document.querySelector('[data-plane-id="pt-plane"].plane').dataset.scale).toFixed(2) === (298 / 8).toFixed(2), null, { timeout: 4000 });
    let m = await check('narrow');
    assert(m.cw === 298, `S8 canvas width is 298 (${m.cw})`);
    near(m.scale, 298 / 8, 0.05, 'S8 data-scale follows the width');
    assert(Math.abs(m.dx) < 0.6 && Math.abs(m.dy) < 0.6, `S8 the handle sits on its point after resize (${m.dx.toFixed(2)}, ${m.dy.toFixed(2)})`);
    await page.evaluate(() => { window.__pt.host.style.maxWidth = '480px'; });
    await page.waitForFunction(() => document.getElementById('pt-plane-canvas').clientWidth !== 298, null, { timeout: 4000 });
    await settle(page, 3);
    m = await check('restored');
    assert(Math.abs(m.dx) < 0.6 && Math.abs(m.dy) < 0.6, `S8 the handle sits on its point after restoring (${m.dx.toFixed(2)}, ${m.dy.toFixed(2)})`);
    near(m.scale, m.cw / 8, 0.05, 'S8 data-scale after restoring');
    assert((await page.evaluate(() => window.__pt.views)).includes('resize'), 'S8 viewchange reported reason "resize"');
  }

  // ---------------------------------------------------------------------------------------------
  // S9 layout
  // ---------------------------------------------------------------------------------------------
  {
    const m = await page.evaluate(() => {
      const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { w: r.width, h: r.height }; };
      return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, cw: document.getElementById('pt-plane-canvas').clientWidth,
        z: box('#pt-plane-z'), btn: box('#pt-plane-zoom-in'), reset: box('#pt-plane-zoom-reset') };
    });
    assert(m.z.w >= 32 && m.z.h >= 32, `S9 the handle hit area is at least 32 x 32 (${m.z.w} x ${m.z.h})`);
    assert(m.btn.h >= 32 && m.reset.h >= 32, `S9 control buttons are at least 32 high (${m.btn.h}, ${m.reset.h})`);
    if (phone) {
      assert(m.over <= 1, `S9 no horizontal overflow on the phone (${m.over}px)`);
      assert(m.cw <= 359, `S9 the canvas fits 358 px on the phone (${m.cw})`);
      const f = await shot('plane-phone');
      await crop('plane-phone', f);
    } else {
      assert(m.cw >= 400, `S9 the canvas is at least 400 px on the desktop (${m.cw})`);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // S10 circular drag across the Arg seam
  // ---------------------------------------------------------------------------------------------
  {
    await page.evaluate(() => { window.__pt.plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 }); window.__pt.z.set({ re: 1.5, im: 0 }, { silent: true }); });
    await settle(page, 2);
    const args = [];
    let calls = 0;
    await dragHandleAround(page, 'pt-plane-z', { radius: 1.5, startAngle: 0, turns: 1, steps: 48 }, async (pg, angle, i) => {
      calls++;
      const z = await handleZ(pg, 'pt-plane-z');
      near(Math.hypot(z.re, z.im), 1.5, 0.02, `S10 |z| at step ${i}`);
      let a = Math.atan2(z.im, z.re);
      if (a === -Math.PI) a = Math.PI;
      args.push(a);
    });
    assert(calls === 49, `S10 onStep ran 49 times (${calls})`);
    let jumps = 0, maxStep = 0;
    for (let i = 1; i < args.length; i++) {
      const d = Math.abs(args[i] - args[i - 1]);
      if (d > Math.PI) jumps++; else maxStep = Math.max(maxStep, d);
    }
    assert(jumps === 1, `S10 exactly one Arg jump across the seam (${jumps})`);
    assert(maxStep < 0.4, `S10 every other Arg step is small (${maxStep.toFixed(3)})`);
    log(`S10 Arg jump seen once, largest other step ${maxStep.toFixed(3)} rad`);
  }

  // ---------------------------------------------------------------------------------------------
  // S11 view API
  // ---------------------------------------------------------------------------------------------
  {
    const pts = [{ re: 4, im: 2 }, { re: -2, im: 2 }, { re: 1, im: 5 }, { re: 1, im: -1 }];
    await page.evaluate((p) => window.__pt.plane.fitTo(p), pts);
    let v = await view();
    near(v.center.re, 1, 1e-6, 'S11 fitTo centre re'); near(v.center.im, 2, 1e-6, 'S11 fitTo centre im'); near(v.unitsAcross, 7.8, 1e-6, 'S11 fitTo unitsAcross');
    await page.evaluate(() => window.__pt.plane.setView({ center: { re: -3, im: 1 }, unitsAcross: 3 }));
    await page.evaluate(() => window.__pt.plane.resetView());
    v = await view();
    near(v.center.re, 1, 1e-6, 'S11 resetView returns to the fitted view (re)'); near(v.unitsAcross, 7.8, 1e-6, 'S11 resetView returns to the fitted view');
    await page.evaluate(() => window.__pt.plane.setView({ unitsAcross: 1000 }));
    near((await view()).unitsAcross, 200, 1e-9, 'S11 setView clamps to maxUnitsAcross');
    await page.evaluate(() => window.__pt.plane.setView({ unitsAcross: 0.01 }));
    near((await view()).unitsAcross, 0.5, 1e-9, 'S11 setView clamps to minUnitsAcross');
    const n0 = await page.evaluate(() => window.__pt.views.length);
    await page.evaluate(() => window.__pt.plane.setView({ unitsAcross: 0.5 }));
    await page.evaluate(() => window.__pt.plane.setView({ center: { re: NaN, im: 0 } }));
    assert((await page.evaluate(() => window.__pt.views.length)) === n0, 'S11 an identical or non-finite setView emits no viewchange');
    const reasons = await page.evaluate(() => window.__pt.views);
    for (const r of ['fit', 'set', 'reset', 'resize']) assert(reasons.includes(r), `S11 saw reason "${r}" (${[...new Set(reasons)]})`);
    // a non-finite point hides its handle without throwing, and a finite one brings it back
    await page.evaluate(() => { window.__pt.w.set({ re: NaN, im: 0 }); });
    assert(await page.evaluate(() => document.getElementById('pt-plane-w').hidden), 'S11 a non-finite handle is hidden');
    await page.evaluate(() => { window.__pt.w.set({ re: -3, im: -2 }); });
    assert(!(await page.evaluate(() => document.getElementById('pt-plane-w').hidden)), 'S11 a finite z shows the handle again');
    await page.evaluate(() => { window.__pt.plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 }); window.__pt.plane.setHome(); });
  }

  // ---------------------------------------------------------------------------------------------
  // S12 performance
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const { plane, z } = window.__pt, raf = () => new Promise((res) => requestAnimationFrame(res));
      await raf(); await raf();
      const d0 = plane.getStats().draws; let sum = 0;
      for (let i = 0; i < 60; i++) {
        const a = i * 0.1;
        z.set({ re: 1.5 * Math.cos(a), im: 1.5 * Math.sin(a) }, { silent: true });
        await raf();
        sum += plane.getStats().lastDrawMs;
      }
      return { avg: sum / 60, draws: plane.getStats().draws - d0 };
    });
    assert(r.avg < 25, `S12 average draw time ${r.avg.toFixed(2)} ms is below 25 ms`);
    assert(r.draws <= 62, `S12 at most one draw per frame (${r.draws})`);
    log(`S12 average draw ${r.avg.toFixed(2)} ms over 60 frames (${r.draws} draws)`);
  }

  // ---------------------------------------------------------------------------------------------
  // S12b a plane created in a hidden container is "not measured yet": nothing drawn, finite maths, then it measures
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const raf = () => new Promise((res) => requestAnimationFrame(res));
      const host = document.createElement('div');
      host.style.cssText = 'display:none;width:300px';
      document.body.appendChild(host);
      const p = window.__pt.mod.createPlane(host, { id: 'pt-hidden' });
      p.addPoint({ id: 'a', z: { re: 1, im: 1 } });
      p.addCurve({ id: 'c', points: [{ re: 0, im: 0, t: 0 }, { re: 1, im: 1, t: 1 }] });
      await raf(); await raf();
      const hidden = { size: p.getSize(), px: p.toPixel({ re: 1, im: 1 }), draws: p.getStats().draws };
      host.style.display = 'block';
      await raf(); await raf(); await raf();
      const shown = { size: p.getSize(), draws: p.getStats().draws, view: p.getView(), hit: document.getElementById('pt-hidden-a').getBoundingClientRect().width };
      p.destroy(); host.remove();
      return { hidden, shown };
    });
    assert(r.hidden.size.w === 400 && Number.isFinite(r.hidden.px.x) && Number.isFinite(r.hidden.px.y) && r.hidden.draws === 0, `S12b hidden plane: nominal size, finite maths, nothing drawn (${JSON.stringify(r.hidden)})`);
    assert(r.shown.size.w === 298 && r.shown.draws >= 1 && r.shown.view.unitsAcross === 8 && r.shown.view.center.re === 0 && r.shown.hit >= 32, `S12b once shown it measures and draws without moving the view (${JSON.stringify(r.shown)})`);
  }

  // ---------------------------------------------------------------------------------------------
  // S14 label collisions, measured on the REAL canvas (fix round, review issue 1)
  // Wraps fillText/clearRect to record every label of the last frame with its real measured width, then checks that no two
  // labels overlap, none is under the handle dot or its "z" label or the zoom buttons, and all stay inside the canvas.
  // ---------------------------------------------------------------------------------------------
  {
    await page.evaluate(async () => {
      const mod = window.__pt.mod;
      const host = document.createElement('section');
      host.id = 'pt-lab-host';
      host.style.cssText = 'grid-column:1/-1;justify-self:center;width:100%;max-width:560px;margin:16px 0;padding:0 16px;box-sizing:border-box';
      const slot = document.createElement('div');
      host.appendChild(slot);
      document.body.appendChild(host);
      const plane = mod.createPlane(slot, { id: 'pt-lab', xRange: [-4, 4], yRange: [-4, 4], grid: 'both' });
      const z = plane.addPoint({ id: 'z', z: { re: 2.2, im: 0.05 }, label: 'z' });
      plane.addLayer((c, p) => { mod.drawCartAddress(c, p, z.z); mod.drawPolarAddress(c, p, z.z, { ghosts: 1 }); mod.drawSeam(c, p); });
      const rec = [];
      const proto = CanvasRenderingContext2D.prototype, fill0 = proto.fillText, clear0 = proto.clearRect;
      proto.clearRect = function (...a) { if (this.canvas.id === 'pt-lab-canvas') rec.push({ frame: true }); return clear0.apply(this, a); };
      proto.fillText = function (t, x, y, ...r) {
        if (this.canvas.id === 'pt-lab-canvas') rec.push({ t, x, y, align: this.textAlign, base: this.textBaseline, px: parseFloat(this.font), w: this.measureText(t).width });
        return fill0.call(this, t, x, y, ...r);
      };
      window.__lab = { plane, z, host, rec, restore() { proto.fillText = fill0; proto.clearRect = clear0; } };
    });
    await settle(page, 3);
    const measure = (zz) => page.evaluate(async (zz) => {
      const { plane, z, rec } = window.__lab, raf = () => new Promise((res) => requestAnimationFrame(res));
      z.set(zz, { silent: true });
      await raf(); await raf();
      let i = rec.length - 1;
      while (i >= 0 && !rec[i].frame) i--;
      const last = rec.slice(i + 1).filter((e) => /^(x =|y =|r =|Arg |also |seam)/.test(e.t));
      rec.length = 0;
      const cv = plane.canvas.getBoundingClientRect(), rel = (el) => { const b = el.getBoundingClientRect(); return { x0: b.left - cv.left, y0: b.top - cv.top, x1: b.right - cv.left, y1: b.bottom - cv.top }; };
      const grow = (b, d) => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });
      const dot = grow(rel(document.querySelector('#pt-lab-z .plane-handle-dot')), 6);        // the dot plus its 6 px halo
      const lab = document.querySelector('#pt-lab-z .plane-handle-label');
      const obstacles = [{ name: 'dot', ...dot }, { name: 'zoom buttons', ...rel(document.querySelector('#pt-lab-viewport .plane-controls')) }];
      if (lab) obstacles.push({ name: 'handle label', ...rel(lab) });
      const boxes = last.map((e) => {
        const x0 = e.align === 'left' ? e.x : e.align === 'center' ? e.x - e.w / 2 : e.x - e.w;
        const top = e.base === 'middle' ? e.y - e.px / 2 - 2 : e.y - e.px + 1, bottom = e.base === 'middle' ? e.y + e.px / 2 + 2 : e.y + 4;
        return { text: e.t, x0, y0: top, x1: x0 + e.w, y1: bottom };
      });
      const lines = boxes.filter((b) => /^(Arg |also )/.test(b.text)), singles = boxes.filter((b) => !/^(Arg |also )/.test(b.text));
      if (lines.length) singles.push({ text: lines[0].text, x0: Math.min(...lines.map((b) => b.x0)), x1: Math.max(...lines.map((b) => b.x1)), y0: Math.min(...lines.map((b) => b.y0)), y1: Math.max(...lines.map((b) => b.y1)) });
      const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
      // Liang-Barsky: does the segment a-b pass through the box? (the r label against its own ray O-Z, the seam label against the seam)
      const crosses = (a, b, box) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        let t0 = 0, t1 = 1;
        for (const [pp, q] of [[-dx, a.x - box.x0], [dx, box.x1 - a.x], [-dy, a.y - box.y0], [dy, box.y1 - a.y]]) {
          if (pp === 0) { if (q < 0) return false; continue; }
          const rr = q / pp;
          if (pp < 0) { if (rr > t1) return false; if (rr > t0) t0 = rr; } else { if (rr < t0) return false; if (rr < t1) t1 = rr; }
        }
        return true;
      };
      const bad = [];
      const O = plane.toPixel({ re: 0, im: 0 }), Z = plane.toPixel(zz), rBox = singles.find((b) => /^r = /.test(b.text)), sBox = singles.find((b) => b.text === 'seam');
      if (rBox && Math.hypot(Z.x - O.x, Z.y - O.y) >= 6 && crosses(O, Z, rBox)) bad.push(`"${rBox.text}" is struck through by its own ray`);
      if (sBox && crosses(O, { x: O.x - 4 * cv.width, y: O.y }, sBox)) bad.push('"seam" is struck through by its own seam');
      // the r label must not sit on the Arg arc (radius R, 0 to Arg z) or on the one ghost winding (radius R + 7, a full turn at most)
      const rayPx = Math.hypot(Z.x - O.x, Z.y - O.y), R = Math.min(28, Math.max(8, 0.6 * rayPx)), th = Math.atan2(zz.im, zz.re);
      const onArc = (radius, end, b) => {
        const sweep = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, end));
        for (let j = 0; j <= 720; j++) { const phi = sweep * j / 720, x = O.x + radius * Math.cos(phi), y = O.y - radius * Math.sin(phi); if (x > b.x0 - 1 && x < b.x1 + 1 && y > b.y0 - 1 && y < b.y1 + 1) return true; }
        return false;
      };
      if (rBox && rayPx >= 6 && onArc(R, th, rBox)) bad.push(`"${rBox.text}" sits on the Arg arc`);
      if (rBox && rayPx >= 6 && onArc(R + 7, th + 2 * Math.PI, rBox)) bad.push(`"${rBox.text}" sits on the ghost winding`);
      for (let a = 0; a < singles.length; a++) {
        for (let b = a + 1; b < singles.length; b++) if (hit(singles[a], singles[b])) bad.push(`"${singles[a].text}" over "${singles[b].text}"`);
        for (const o of obstacles) if (hit(singles[a], o)) bad.push(`"${singles[a].text}" under the ${o.name}`);
        const b = singles[a];
        if (b.x0 < 0 || b.y0 < 0 || b.x1 > cv.width || b.y1 > cv.height) bad.push(`"${b.text}" leaves the canvas`);
      }
      return { bad, texts: boxes.map((b) => b.text), size: cv.width };
    }, zz);
    const cases = [['2.2+0.05i', { re: 2.2, im: 0.05 }], ['-2-0.4i', { re: -2, im: -0.4 }], ['-2', { re: -2, im: 0 }], ['2', { re: 2, im: 0 }], ['2i', { re: 0, im: 2 }], ['-2.2+0.05i', { re: -2.2, im: 0.05 }]];
    for (let k = 0; k < 16; k++) { const a = 2 * Math.PI * k / 16 + 0.03; cases.push([`ring${k}`, { re: 2.2 * Math.cos(a), im: 2.2 * Math.sin(a) }]); }
    let worst = 0;
    for (const [name, zz] of cases) {
      const r = await measure(zz);
      worst = Math.max(worst, r.bad.length);
      assert(r.bad.length === 0, `S14 labels at z = ${name} on a ${r.size}-px plane: ${r.bad.join('; ')}`);
      assert(r.texts.some((t) => t.startsWith('r = ')) && r.texts.some((t) => t.startsWith('Arg z')), `S14 r and Arg labels are drawn at z = ${name}`);
    }
    log(`S14 ${cases.length} points checked on the real canvas, worst case ${worst} collisions`);
    // 40 pseudo-random points at each of three plane widths (the reviewer measured the r label against its own ray at 340 and 446 px;
    // on the phone the canvas is capped by the viewport, so there the three runs are the same width). The ray must never cross the label.
    let st = 412;
    const rnd = () => (st = (Math.imul(st, 1664525) + 1013904223) >>> 0) / 4294967296;
    let rayStrikes = 0, checked = 0;
    for (const maxWidth of [374, 480, 560]) {
      await page.evaluate((mw) => { window.__lab.host.style.maxWidth = `${mw}px`; }, maxWidth);
      await settle(page, 4);
      for (let k = 0; k < 40; k++) {
        const zz = { re: (rnd() * 2 - 1) * 3.9, im: (rnd() * 2 - 1) * 3.9 };
        if (Math.hypot(zz.re, zz.im) < 0.3) continue;
        const r = await measure(zz);
        checked++;
        rayStrikes += r.bad.filter((b) => /own (ray|seam)/.test(b)).length;
        assert(r.bad.length === 0, `S14 random z = ${zz.re.toFixed(3)} + ${zz.im.toFixed(3)}i on a ${r.size}-px plane: ${r.bad.join('; ')}`);
      }
    }
    assert(rayStrikes === 0, `S14 the r label (and the seam label) is never struck through by its own line (${rayStrikes} of ${checked})`);
    log(`S14 ${checked} random points at three plane widths: r label struck through by its own ray ${rayStrikes} times`);
    await page.evaluate(() => { window.__lab.host.style.maxWidth = '560px'; });
    await settle(page, 4);
    // the screenshots the reviewer asked to see again: the positive real axis and the seam moment
    for (const [name, zz] of [['labels-posreal', { re: 2.2, im: 0.05 }], ['labels-seam', { re: -2, im: -0.4 }], ['labels-negreal', { re: -2, im: 0 }]]) {
      await page.evaluate((zz) => { window.__lab.z.set(zz, { silent: true }); document.getElementById('pt-lab-canvas').scrollIntoView({ block: 'center', behavior: 'instant' }); }, zz);
      await settle(page, 3);
      const f = await shot(name);
      await crop(name, f, '#pt-lab-viewport');
    }
    await page.evaluate(() => { window.__lab.restore(); window.__lab.plane.destroy(); window.__lab.host.remove(); delete window.__lab; });
  }

  // ---------------------------------------------------------------------------------------------
  // S15 a handle dragged into a corner or onto an edge stays whole, keeps its label, and stays above the zoom buttons
  // (fix round, review issues 4 and 5)
  // ---------------------------------------------------------------------------------------------
  {
    await page.evaluate(() => { const { plane, z } = window.__pt; plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 }); z.set({ re: 1, im: 1 }, { silent: true }); });
    await settle(page, 2);
    const geometry = () => page.evaluate(() => {
      const cv = document.getElementById('pt-plane-canvas').getBoundingClientRect(), btn = document.getElementById('pt-plane-z');
      const d = btn.querySelector('.plane-handle-dot').getBoundingClientRect(), l = btn.querySelector('.plane-handle-label').getBoundingClientRect();
      // a point on the dot toward the plane's corner: the dot's exact centre can fall outside a zoom button's rounded corner
      const cx = d.left + d.width / 2 - 4, cy = d.top + d.height / 2 + 4, top = document.elementFromPoint(cx, cy);
      return {
        dot: { x0: d.left - cv.left, y0: d.top - cv.top, x1: d.right - cv.left, y1: d.bottom - cv.top },
        label: { x0: l.left - cv.left, y0: l.top - cv.top, x1: l.right - cv.left, y1: l.bottom - cv.top },
        w: cv.width, h: cv.height, onTop: !!top && btn.contains(top), topIs: top ? `${top.tagName}#${top.id}` : null,
      };
    });
    const inside = (b, w, h) => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= w && b.y1 <= h;
    for (const [name, target] of [['top-right corner', { re: 3.95, im: 3.95 }], ['top-left corner', { re: -3.95, im: 3.95 }], ['bottom-right corner', { re: 3.95, im: -3.95 }], ['top edge', { re: 0, im: 3.95 }], ['right edge', { re: 3.95, im: 0 }]]) {
      await dragHandle(page, 'pt-plane-z', target);
      const g = await geometry();
      assert(inside(g.dot, g.w, g.h), `S15 ${name}: the whole dot is on the canvas (${JSON.stringify(g.dot)} in ${g.w}x${g.h})`);
      assert(inside(g.label, g.w, g.h), `S15 ${name}: the "z" label is on the canvas (${JSON.stringify(g.label)})`);
      assert(g.onTop, `S15 ${name}: the dot is the topmost element at its centre, not a zoom button (${g.topIs})`);
    }
    // and it can be grabbed again from the corner it was left in
    await dragHandle(page, 'pt-plane-z', { re: 3.95, im: 3.95 });
    const back = await dragHandle(page, 'pt-plane-z', { re: 1, im: 1 });
    near(back.re, 1, 0.02, 'S15 re-grabbed from the corner (re)'); near(back.im, 1, 0.02, 'S15 re-grabbed from the corner (im)');
    // Keyboard focus on a handle that was dragged to the inset must not nudge the view: ensureVisible's margin is below the drag inset
    // (review issue 2: the view used to pan by 2 px and emit a 'pan' viewchange).
    await dragHandle(page, 'pt-plane-z', { re: -3.99, im: -3.99 });
    {
      const panCount = () => page.evaluate(() => window.__pt.views.filter((r) => r === 'pan').length);
      const v0 = await view(), p0 = await panCount();
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.focus('#pt-plane-z');
      const v1 = await view();
      near(v1.center.re, v0.center.re, 1e-9, 'S15 focusing a handle dragged to the inset leaves the view alone (re)');
      near(v1.center.im, v0.center.im, 1e-9, 'S15 focusing a handle dragged to the inset leaves the view alone (im)');
      assert((await panCount()) === p0, 'S15 focusing a handle dragged to the inset emits no "pan" viewchange');
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
    }
    // A point parked under the zoom buttons stays whole and can be grabbed with the mouse (review issue 3): the handle is raised above them.
    {
      const probe = () => page.evaluate(() => {
        const btn = document.getElementById('pt-plane-z'), dot = btn.querySelector('.plane-handle-dot');
        document.getElementById('pt-plane-canvas').scrollIntoView({ block: 'center', behavior: 'instant' });
        const d = dot.getBoundingClientRect(), cx = d.left + d.width / 2, cy = d.top + d.height / 2, rad = d.width / 2 - 1, bad = [];
        for (let k = -1; k < 8; k++) {                                     // the centre, then 8 points around the dot's rim
          const x = k < 0 ? cx : cx + rad * Math.cos(k * Math.PI / 4), y = k < 0 ? cy : cy + rad * Math.sin(k * Math.PI / 4), top = document.elementFromPoint(x, y);
          if (!top || !btn.contains(top)) bad.push(`${k}:${top ? top.tagName + '#' + top.id : null}`);
        }
        return { bad, raised: btn.classList.contains('is-above-controls'), focused: document.activeElement === btn };
      });
      const park = async (px, py) => page.evaluate(({ px, py }) => {
        const { plane, z } = window.__pt, cw = plane.canvas.clientWidth;
        plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 });
        z.set(plane.fromPixel(px < 0 ? cw + px : px, py), { silent: true });
        document.activeElement && document.activeElement.blur();
      }, { px, py });
      await park(-24, 30);                                                  // dot centre 30 px from the top and 24 px from the right
      let g = await probe();
      assert(!g.focused && g.raised, `S15 a dot parked under the zoom buttons is raised above them (${JSON.stringify(g)})`);
      assert(g.bad.length === 0, `S15 the whole dot is on top, not under a zoom button: ${g.bad.join(', ')}`);
      const grabbed = await dragHandle(page, 'pt-plane-z', { re: 1, im: 1 });   // throws when the handle is covered
      near(grabbed.re, 1, 0.02, 'S15 grabbed from under the zoom buttons (re)'); near(grabbed.im, 1, 0.02, 'S15 grabbed from under the zoom buttons (im)');
      g = await probe();
      assert(!g.raised, 'S15 away from the buttons the handle drops back under them (they stay clickable)');
      // the preset 3 + 3i leaves the dot against the buttons on a phone-width plane
      await page.evaluate(() => { const { plane, z } = window.__pt; plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 }); z.set({ re: 3, im: 3 }, { silent: true }); document.activeElement && document.activeElement.blur(); });
      g = await probe();
      assert(g.bad.length === 0, `S15 z = 3 + 3i: the whole dot is on top (${g.bad.join(', ')})`);
      if (phone) assert(g.raised, 'S15 z = 3 + 3i on the phone-width plane is raised above the zoom buttons');
      // and the buttons still work when no handle is near them
      await page.evaluate(() => { const { plane, z } = window.__pt; z.set({ re: -1, im: -1 }, { silent: true }); plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 }); });
      await page.click('#pt-plane-zoom-in');
      near((await view()).unitsAcross, 6.4, 1e-9, 'S15 the zoom-in button still works');
      await page.click('#pt-plane-zoom-reset');
      near((await view()).unitsAcross, 8, 1e-9, 'S15 the reset button still works');
    }
    // the 'Re' axis name steps left of the zoom buttons when the real axis is panned into the button column
    const re = await page.evaluate(async () => {
      const { plane } = window.__pt, cv = plane.canvas, proto = CanvasRenderingContext2D.prototype, f0 = proto.fillText, rec = [];
      const raf = () => new Promise((res) => requestAnimationFrame(res));
      proto.fillText = function (t, x, y, ...r) { if (this.canvas === cv && t === 'Re') rec.push({ x, y }); return f0.call(this, t, x, y, ...r); };
      try {
        plane.setView({ center: { re: 0, im: -3.4 }, unitsAcross: 8 });         // the real axis about 34 px from the top
        await raf(); await raf();
        const e = rec[rec.length - 1], c = document.querySelector('#pt-plane-viewport .plane-controls').getBoundingClientRect(), r = cv.getBoundingClientRect();
        return { right: e && e.x, y: e && e.y, buttonsLeft: c.left - r.left, buttonsBottom: c.bottom - r.top };
      } finally { proto.fillText = f0; plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 }); }
    });
    assert(re.right !== undefined && re.y < re.buttonsBottom, `S15 setup: the Re name is drawn in the button rows (${JSON.stringify(re)})`);
    assert(re.right <= re.buttonsLeft, `S15 the Re name stops left of the zoom buttons (${re.right} <= ${re.buttonsLeft})`);
    await page.evaluate(() => window.__pt.z.set({ re: -1, im: Math.sqrt(3) }, { silent: true }));
    await settle(page, 2);
  }

  // ---------------------------------------------------------------------------------------------
  // S16 Ctrl+wheel: a mouse-wheel notch is capped at 1.5x per event, a trackpad pinch (small deltas) is not (review issue 7)
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(() => {
      const { plane } = window.__pt, rect = plane.canvas.getBoundingClientRect();
      plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 });
      const fire = (dy, ctrl = true) => plane.el.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, ctrlKey: ctrl, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, bubbles: true, cancelable: true }));
      const out = {};
      fire(-100); out.notch = plane.getView().unitsAcross;                // 8 / 1.5
      plane.setView({ unitsAcross: 8 });
      fire(-300); out.big = plane.getView().unitsAcross;                  // still 8 / 1.5
      plane.setView({ unitsAcross: 8 });
      fire(-5); out.pinch = plane.getView().unitsAcross;                  // 8 / exp(0.05)
      plane.setView({ unitsAcross: 8 });
      fire(100); out.out = plane.getView().unitsAcross;                   // 8 * 1.5
      plane.setView({ center: { re: 0, im: 0 }, unitsAcross: 8 });
      return out;
    });
    near(r.notch, 8 / 1.5, 1e-6, 'S16 one Ctrl+wheel notch zooms in by at most 1.5x');
    near(r.big, 8 / 1.5, 1e-6, 'S16 a 300 px Ctrl+wheel does not jump further');
    near(r.pinch, 8 / Math.exp(0.05), 1e-6, 'S16 a small pinch delta is not capped');
    near(r.out, 12, 1e-6, 'S16 zooming out is capped at 1.5x too');
  }

  // ---------------------------------------------------------------------------------------------
  // S17 destroy() removes every listener it added on the plane, its canvas and its buttons (review issue 8)
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const proto = EventTarget.prototype, add0 = proto.addEventListener, rem0 = proto.removeEventListener, live = [];
      const cap = (o) => (typeof o === 'boolean' ? o : !!(o && o.capture));
      const same = (e, t, type, fn, c) => e.t === t && e.type === type && e.fn === fn && e.capture === c;
      proto.addEventListener = function (type, fn, o) { if (typeof fn === 'function' && !live.some((e) => same(e, this, type, fn, cap(o)))) live.push({ t: this, type, fn, capture: cap(o) }); return add0.call(this, type, fn, o); };
      proto.removeEventListener = function (type, fn, o) { const i = live.findIndex((e) => same(e, this, type, fn, cap(o))); if (i >= 0) live.splice(i, 1); return rem0.call(this, type, fn, o); };
      let out;
      try {
        const host = document.createElement('div');
        host.style.cssText = 'grid-column:1/-1;width:300px';
        document.body.appendChild(host);
        const winDoc0 = live.filter((e) => e.t === window || e.t === document).length;
        const p = window.__pt.mod.createPlane(host, { id: 'pt-bal' });
        p.addPoint({ id: 'a', z: { re: 1, im: 1 }, label: 'a' });
        p.addCurve({ id: 'c', points: [{ re: 0, im: 0, t: 0 }, { re: 1, im: 1, t: 1 }] });
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        // a handle button is tracked by class, so it still counts after it has been detached from the plane
        const el = p.el, tracked = (t) => t === el || t === p.canvas || (t.classList && (t.classList.contains('plane-handle') || (t.classList.contains('plane-btn') && el.contains(t))));
        const added = live.filter((e) => tracked(e.t)).length;
        // Handle.remove() takes every listener off its button (design 5.8): nine are added, none are left
        const hb = p.addPoint({ id: 'b', z: { re: -1, im: 1 }, label: 'b' });
        const onB = live.filter((e) => e.t === hb.el).length;
        hb.remove();
        const leftB = live.filter((e) => e.t === hb.el).length;
        p.destroy();
        host.remove();
        out = { added, onB, leftB, left: live.filter((e) => tracked(e.t)).map((e) => `${e.t.id || e.t.className}:${e.type}`), winDocDelta: live.filter((e) => e.t === window || e.t === document).length - winDoc0 };
      } finally { proto.addEventListener = add0; proto.removeEventListener = rem0; }
      return out;
    });
    assert(r.added >= 17, `S17 the plane really added listeners on its element, canvas, zoom buttons and handle (${r.added})`);
    assert(r.onB === 9 && r.leftB === 0, `S17 a handle button gets nine listeners and Handle.remove() takes them all off (${r.onB} added, ${r.leftB} left)`);
    assert(r.left.length === 0, `S17 destroy() removed them all; still attached: ${r.left.join(', ')}`);
    assert(r.winDocDelta === 0, `S17 window and document listeners are back to where they were (${r.winDocDelta})`);
  }

  // ---------------------------------------------------------------------------------------------
  // The residue round (S18 to S25). Shared page-side tools first: a plane in its own host, a recorder for the words a canvas
  // draws (with their real measured widths), and box arithmetic.
  // ---------------------------------------------------------------------------------------------
  await page.evaluate(() => {
    const T = window.__tt = {};
    T.mk = (id, { maxWidth = 480, ...opts } = {}) => {
      const host = document.createElement('section');
      host.id = `${id}-host`;
      host.style.cssText = `grid-column:1/-1;justify-self:center;width:100%;max-width:${maxWidth}px;margin:16px 0;padding:0 16px;box-sizing:border-box`;
      const slot = document.createElement('div');
      host.appendChild(slot);
      document.body.appendChild(host);
      const plane = window.__pt.mod.createPlane(slot, { id, ...opts });
      return { host, plane };
    };
    T.raf = () => new Promise((res) => requestAnimationFrame(res));
    T.frames = async (n = 3) => { for (let i = 0; i < n; i++) await T.raf(); };
    T.hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    T.grow = (b, d) => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });
    // every fillText of one canvas, frame by frame
    T.record = (canvasId) => {
      const proto = CanvasRenderingContext2D.prototype, f0 = proto.fillText, c0 = proto.clearRect, rec = [];
      proto.clearRect = function (...a) { if (this.canvas.id === canvasId) rec.push({ frame: true }); return c0.apply(this, a); };
      proto.fillText = function (t, x, y, ...r) {
        if (this.canvas.id === canvasId) rec.push({ t, x, y, align: this.textAlign, base: this.textBaseline, px: parseFloat(this.font), w: this.measureText(t).width });
        return f0.call(this, t, x, y, ...r);
      };
      return { rec, last() { let i = rec.length - 1; while (i >= 0 && !rec[i].frame) i--; return rec.slice(i + 1); }, restore() { proto.fillText = f0; proto.clearRect = c0; } };
    };
    T.boxOf = (e) => {
      const x0 = e.align === 'left' ? e.x : e.align === 'center' ? e.x - e.w / 2 : e.x - e.w;
      const top = e.base === 'middle' ? e.y - e.px / 2 - 2 : e.y - e.px + 1, bottom = e.base === 'middle' ? e.y + e.px / 2 + 2 : e.y + 4;
      return { text: e.t, x0, y0: top, x1: x0 + e.w, y1: bottom };
    };
    // a DOM element's rectangle in the plane's canvas pixels
    T.rel = (plane, el) => { const c = plane.canvas.getBoundingClientRect(), b = el.getBoundingClientRect(); return { x0: b.left - c.left, y0: b.top - c.top, x1: b.right - c.left, y1: b.bottom - c.top }; };
    T.tokenRgb = (name) => {
      const c = document.createElement('canvas').getContext('2d');
      c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      c.fillRect(0, 0, 1, 1);
      const d = c.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    T.pixel = (plane, z) => {
      const cv = plane.canvas, k = cv.width / cv.clientWidth, q = plane.toPixel(z), d = cv.getContext('2d').getImageData(Math.floor(q.x * k), Math.floor(q.y * k), 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    };
  });

  // ---------------------------------------------------------------------------------------------
  // S18 rampWeight: per curve, on drawTimedCurve, live through set(), and in the legend (residue: lab, issue 7)
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const T = window.__tt, mod = window.__pt.mod;
      const stops = [], proto = CanvasGradient.prototype, add0 = proto.addColorStop;
      proto.addColorStop = function (o, c) { stops.push([o, c]); return add0.call(this, o, c); };
      const { host, plane } = T.mk('pt-rw', { grid: 'none', axes: false, interactive: false, controls: false });
      try {
        const line = (x) => [0, 0.25, 0.5, 0.75, 1].map((t) => ({ re: x, im: -3 + 6 * t, t }));
        const look = { color: '--polar', width: 8, dots: false, arrow: false };
        const a = plane.addCurve({ id: 'a', points: line(-3), ...look });
        const b = plane.addCurve({ id: 'b', points: line(-1.5), ...look, rampWeight: 0 });
        const c = plane.addCurve({ id: 'c', points: line(0), ...look, rampWeight: 1 });
        plane.addLayer((ctx2, pl) => mod.drawTimedCurve(ctx2, pl, line(1.5), { ...look, rampWeight: 0 }));            // the helper called directly, as a station does
        const e = plane.addCurve({ id: 'e', points: line(3), ...look, ramp: false, rampWeight: 1 });                // no ramp: the weight has nothing to do
        await T.frames(3);
        const base = T.tokenRgb('--polar'), t0 = T.tokenRgb('--t0'), t1 = T.tokenRgb('--t1');
        const expect = (w, k) => base.map((v, i) => Math.round(v * (1 - w) + (t0[i] + (t1[i] - t0[i]) * (Math.round(k * 64) / 64)) * w));
        // the segment from t = 0.25 to 0.5 is drawn in bin floor(0.375 * 32) = 12, i.e. t = 12.5 / 32 (sample at t = 0.4)
        const kBin = 12.5 / 32, at = (x) => T.pixel(plane, { re: x, im: -0.6 });
        const out = { base, k: kBin, dflt: at(-3), zero: at(-1.5), one: at(0), helper: at(1.5), flat: at(3),
          wantDefault: expect(0.4, kBin), wantOne: expect(1, kBin) };
        // live: set() changes the weight on the next frame
        a.set({ rampWeight: 0.2 }); await T.frames(2);
        out.live = at(-3); out.wantLive = expect(0.2, kBin);
        a.set({ rampWeight: 'junk' }); await T.frames(2);
        out.junk = at(-3);
        // the legend takes the first ramped curve's weight
        stops.length = 0;
        a.set({ rampWeight: 0 }); await T.frames(2);
        out.legend0 = stops.slice(-5).map((s) => s[1]);
        stops.length = 0;
        a.set({ rampWeight: 0.8 }); await T.frames(2);
        out.legend8 = stops.slice(-5).map((s) => s[1]);
        out.rampColor = [mod.rampColor('--polar', 0.5), mod.rampColor('--polar', 0.5, 0.4), mod.rampColor('--polar', 0.5, 0), mod.rampColor('--polar', 0.5, 0.65)];
        return out;
      } finally { proto.addColorStop = add0; plane.destroy(); host.remove(); }
    });
    const same = (p, q, tol, msg) => assert(p.slice(0, 3).every((v, i) => Math.abs(v - q[i]) <= tol), `${msg}: got ${p.slice(0, 3)}, want ${q}`);
    same(r.dflt, r.wantDefault, 2, 'S18 a curve with no rampWeight is 0.6 base + 0.4 ramp');
    same(r.zero, r.base, 1, 'S18 rampWeight 0 on addCurve is the plain base colour');
    same(r.one, r.wantOne, 2, 'S18 rampWeight 1 on addCurve is the pure ramp colour');
    same(r.helper, r.base, 1, 'S18 drawTimedCurve({ rampWeight: 0 }) is the plain base colour');
    same(r.flat, r.base, 1, 'S18 ramp: false ignores the weight');
    same(r.live, r.wantLive, 2, 'S18 CurveLayer.set({ rampWeight }) takes effect on the next frame');
    same(r.junk, r.wantDefault, 2, 'S18 a junk weight means the default');
    assert(r.legend0.length === 5 && r.legend0.every((c) => c === r.legend0[0]), `S18 the legend of a weight-0 curve is one colour: ${r.legend0}`);
    assert(r.legend8.length === 5 && r.legend8[0] !== r.legend8[4], `S18 the legend of a weight-0.8 curve is a ramp: ${r.legend8}`);
    assert(r.rampColor[1] === r.rampColor[0] && r.rampColor[2] !== r.rampColor[1] && r.rampColor[3] !== r.rampColor[1], `S18 rampColor defaults to 0.4: ${r.rampColor}`);
    log(`S18 weight 0.4 (default) ${r.dflt.slice(0, 3)}, 0 ${r.zero.slice(0, 3)}, 1 ${r.one.slice(0, 3)}`);
  }

  // ---------------------------------------------------------------------------------------------
  // S19 handle options: labelSide, setLabel, symbol, describe, zOrder, and altKey in the onDrag info
  // (residue: arithmetic, curves-linear, powermap-reciprocal, distance-sets)
  // ---------------------------------------------------------------------------------------------
  {
    const made = await page.evaluate(async () => {
      const T = window.__tt;
      const { host, plane } = T.mk('pt-h', { xRange: [-4, 4], yRange: [-4, 4] });
      window.__h = { host, plane, infos: [], T };
      const log2 = (name) => (z, info) => window.__h.infos.push({ name, final: info.final, source: info.source, altKey: info.altKey });
      plane.addPoint({ id: 'a', z: { re: -2, im: 1 }, label: 'a', labelSide: 'below-left', onDrag: log2('a') });
      plane.addPoint({ id: 'top', z: { re: 0, im: 3.9 }, label: 'top', labelSide: 'above-right' });
      plane.addPoint({ id: 'sym', z: { re: 3, im: -2 }, label: 'w', symbol: 'w', color: '--output' });
      plane.addPoint({ id: 'named', z: { re: 3, im: -3 }, label: 'q', name: 'image', symbol: 'w', color: '--output' });
      plane.addPoint({ id: 'desc', z: { re: 1, im: 2 }, label: 'p', describe: (z) => `probe at x ${z.re.toFixed(1)}`, color: '--polar', onDrag: log2('desc') });
      plane.addPoint({ id: 'bad', z: { re: -1, im: -2 }, label: 'b', describe: () => 42, color: '--polar' });
      await T.frames(3);
      return true;
    });
    assert(made, 'S19 fixture');
    const info = () => page.evaluate(() => {
      const { plane, T } = window.__h, out = {};
      for (const h of plane.handles()) {
        const dot = T.rel(plane, h.el.querySelector('.plane-handle-dot')), lab = h.el.querySelector('.plane-handle-label');
        out[h.id] = { dot, label: lab ? T.rel(plane, lab) : null, text: lab ? lab.textContent : null, cls: lab ? lab.className : null, aria: h.el.getAttribute('aria-label') };
      }
      out.size = plane.getSize();
      return out;
    });
    let h = await info();
    // symbol: a w handle says "w = ..." and, having no separate name, does not say "w: w = ..."
    assert(h.sym.aria === 'w = 3 - 2i; r = 3.606, θ = -0.588 (Arg)', `S19 symbol "w" and no name: the announcement says "w = ...": ${h.sym.aria}`);
    // labelSide: a fixed side is where the word goes
    assert(/is-below/.test(h.a.cls) && /is-left/.test(h.a.cls), `S19 labelSide below-left: ${h.a.cls}`);
    assert(h.a.label.x1 <= h.a.dot.x0 + 1 && h.a.label.y0 >= h.a.dot.y1 - 1, `S19 the "a" word is below and left of its dot (${JSON.stringify(h.a.label)} vs ${JSON.stringify(h.a.dot)})`);
    // a fixed side still gives way where the word would be cut off (the top edge)
    assert(/is-below/.test(h.top.cls) && h.top.label.y0 >= 0 && h.top.label.y1 <= h.size.h, `S19 a fixed above-right word at the top edge drops below the dot (${h.top.cls}; ${JSON.stringify(h.top.label)})`);
    // runtime change
    await page.evaluate(async () => { window.__h.plane.getHandle('a').labelSide = 'above-right'; await window.__h.T.frames(2); });
    h = await info();
    assert(!/is-below|is-left/.test(h.a.cls) && h.a.label.x0 >= h.a.dot.x1 - 1 && h.a.label.y1 <= h.a.dot.y0 + 1, `S19 labelSide set at run time: ${h.a.cls}`);
    assert((await page.evaluate(() => window.__h.plane.getHandle('a').labelSide)) === 'above-right', 'S19 the labelSide getter');
    await page.evaluate(() => { window.__h.plane.getHandle('a').labelSide = 'junk'; });
    assert((await page.evaluate(() => window.__h.plane.getHandle('a').labelSide)) === 'auto', 'S19 an unknown side is auto');
    // setLabel: the text, the width, the announcement (a handle given no name follows its label), and removing and restoring the word
    const w0 = h.sym.label.x1 - h.sym.label.x0;
    await page.evaluate(async () => { const p = window.__h.plane; p.getHandle('sym').setLabel('image of z'); p.getHandle('named').setLabel('longer word here'); await window.__h.T.frames(2); });
    h = await info();
    assert(h.sym.text === 'image of z' && h.sym.label.x1 - h.sym.label.x0 > w0 + 20, `S19 setLabel changes the word and its box (${h.sym.text}, ${w0} -> ${h.sym.label.x1 - h.sym.label.x0})`);
    assert(h.named.aria.startsWith('image: w = 3 - 3i'), `S19 an explicit name stays through setLabel: ${h.named.aria}`);
    assert(h.sym.aria.startsWith('image of z: w = 3 - 2i'), `S19 a handle given no name is announced under its new word: ${h.sym.aria}`);
    await page.evaluate(async () => { window.__h.plane.getHandle('sym').setLabel(''); await window.__h.T.frames(2); });
    assert((await page.evaluate(() => !window.__h.plane.getHandle('sym').el.querySelector('.plane-handle-label'))), 'S19 setLabel("") removes the word');
    await page.evaluate(async () => { window.__h.plane.getHandle('sym').setLabel('back'); await window.__h.T.frames(2); });
    h = await info();
    assert(h.sym.text === 'back' && h.sym.label, 'S19 setLabel after removal brings the word back');
    // describe: the announcement
    assert(h.desc.aria === 'probe at x 1.0', `S19 describe(z) is the announcement: ${h.desc.aria}`);
    assert(/^b: z = -1 - 2i; r = 2.236/.test(h.bad.aria), `S19 a describe that returns a non-string falls back to the default words: ${h.bad.aria}`);
    // the first announcement of a plain handle is unchanged: "z = ..."
    const plain = await page.evaluate(() => { const p = window.__h.plane.addPoint({ id: 'plain', z: { re: 2, im: 1 } }); return p.el.getAttribute('aria-label'); });
    assert(plain === 'z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)', `S19 a handle with no options says what it always said: ${plain}`);
    await page.evaluate(() => window.__h.plane.getHandle('plain').remove());

    // describe follows a drag
    const dz = await dragHandle(page, 'pt-h-desc', { re: -1, im: 3 });
    assert((await readHandleLabel(page, 'pt-h-desc')) === `probe at x ${dz.re.toFixed(1)}`, `S19 describe follows a drag: ${await readHandleLabel(page, 'pt-h-desc')}`);

    // altKey in the onDrag info
    await page.evaluate(() => { window.__h.infos.length = 0; });
    await dragHandle(page, 'pt-h-a', { re: -3, im: 2 });
    let infos = await page.evaluate(() => window.__h.infos.filter((i) => i.name === 'a'));
    assert(infos.length >= 5 && infos.every((i) => i.altKey === false && i.source === 'pointer'), `S19 a plain drag reports altKey false: ${JSON.stringify(infos.slice(0, 2))}`);
    await page.evaluate(() => { window.__h.infos.length = 0; });
    await dragHandle(page, 'pt-h-a', { re: -2, im: 1 }, { modifiers: ['Alt'] });
    infos = await page.evaluate(() => window.__h.infos.filter((i) => i.name === 'a'));
    assert(infos.length >= 5 && infos.every((i) => i.altKey === true), `S19 a drag with Alt held reports altKey true on every call, the final one too: ${JSON.stringify(infos.slice(-2))}`);
    assert(infos[infos.length - 1].final === true, 'S19 and the last call is the final one');
    await page.evaluate(() => { window.__h.infos.length = 0; });
    await page.focus('#pt-h-a');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Alt+ArrowRight');
    await page.evaluate(() => window.__h.plane.getHandle('a').set({ re: 0, im: 0 }));
    infos = await page.evaluate(() => window.__h.infos.filter((i) => i.name === 'a'));
    assert(infos.length === 3 && infos[0].source === 'keyboard' && infos[0].altKey === false && infos[1].source === 'keyboard' && infos[1].altKey === true && infos[2].source === 'api' && infos[2].altKey === false,
      `S19 keyboard Alt+Arrow reports altKey true, plain Arrow false, set() false: ${JSON.stringify(infos)}`);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());

    // zOrder: two handles on one spot. The later one used to cover the earlier; a higher zOrder is on top whichever has focus.
    const z = await page.evaluate(async () => {
      const { plane, T } = window.__h, spot = { re: -3, im: -3 };
      const first = plane.addPoint({ id: 'zfirst', z: spot, label: '', zOrder: 1, color: '--cart' });
      const second = plane.addPoint({ id: 'zsecond', z: spot, label: '', color: '--polar' });
      const third = plane.addPoint({ id: 'zthird', z: spot, label: '', zOrder: -1, color: '--output' });
      await T.frames(2);
      const top = () => { first.el.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = first.el.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && e.closest('.plane-handle') ? e.closest('.plane-handle').id : null; };
      const out = { initial: top(), order: [...document.querySelectorAll('#pt-h-host .plane-handle')].map((e) => e.id).filter((i) => i.startsWith('pt-h-z')) };
      second.el.focus(); out.afterFocusSecond = top();
      third.el.focus(); out.afterFocusThird = top();
      first.zOrder = 0; out.equalThenLaterWins = (first.el.blur(), top());
      first.zOrder = 3; out.raised = top();
      out.getter = first.zOrder; first.zOrder = 99; out.clampHigh = first.zOrder; first.zOrder = -99; out.clampLow = first.zOrder; first.zOrder = 'x'; out.junk = first.zOrder; first.zOrder = 1;
      out.cssVar = first.el.style.getPropertyValue('--zo');
      return out;
    });
    assert(z.initial === 'pt-h-zfirst', `S19 zOrder 1 is on top of a later handle with zOrder 0 and an even later one at -1 (${z.initial})`);
    assert(z.order.join() === 'pt-h-zfirst,pt-h-zsecond,pt-h-zthird', `S19 the DOM (Tab) order is the add order (${z.order})`);
    assert(z.afterFocusSecond === 'pt-h-zfirst' && z.afterFocusThird === 'pt-h-zfirst', `S19 focus does not lift a lower zOrder above a higher one (${z.afterFocusSecond}, ${z.afterFocusThird})`);
    assert(z.equalThenLaterWins === 'pt-h-zthird' || z.equalThenLaterWins === 'pt-h-zsecond', `S19 at equal zOrder the later handle is on top, as before (${z.equalThenLaterWins})`);
    assert(z.raised === 'pt-h-zfirst' && z.getter === 3 && z.clampHigh === 5 && z.clampLow === -5 && z.junk === 0 && z.cssVar === '1', `S19 zOrder setter and clamps: ${JSON.stringify(z)}`);
    // the covered handle can be grabbed with the real mouse: dragHandle throws "is covered by" otherwise
    const moved = await dragHandle(page, 'pt-h-zfirst', { re: -3, im: 0 });
    assert(Math.abs(moved.im) < 0.05 && Math.abs(moved.re + 3) < 0.05, `S19 the raised handle was dragged, not its neighbour (${JSON.stringify(moved)})`);
    const stay = await page.evaluate(() => ['zsecond', 'zthird'].map((k) => window.__h.plane.getHandle(k).z.im));
    assert(stay.every((v) => v === -3), `S19 and the handles under it stayed put (${stay})`);
    // a zOrder 5 handle parked under the zoom buttons is above them (is-above-controls), one parked clear of them does not cover them
    const buttons = await page.evaluate(async () => {
      const { plane, T } = window.__h, cr = T.rel(plane, document.querySelector('#pt-h-viewport .plane-controls'));
      plane.getHandle('zfirst').zOrder = 5;
      plane.getHandle('zfirst').set(plane.fromPixel((cr.x0 + cr.x1) / 2, (cr.y0 + cr.y1) / 2), { silent: true });
      await T.frames(2);
      const el = plane.getHandle('zfirst').el, r = el.getBoundingClientRect();
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r2 = el.getBoundingClientRect(), e = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
      const raisedNow = el.classList.contains('is-above-controls');
      const away = plane.fromPixel(40, 200);
      plane.getHandle('zfirst').set(away, { silent: true });
      await T.frames(2);
      const reset = document.getElementById('pt-h-zoom-reset'); reset.scrollIntoView({ block: 'center', behavior: 'instant' });
      const rr = reset.getBoundingClientRect(), e2 = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2);
      return { over: !!e && el.contains(e), raised: raisedNow, resetOk: e2 === reset };
    });
    assert(buttons.over && buttons.raised && buttons.resetOk, `S19 zOrder 5 over the zoom buttons is still raised above them, and the Reset button is clickable again once it leaves: ${JSON.stringify(buttons)}`);
    await page.evaluate(() => { window.__h.plane.destroy(); window.__h.host.remove(); delete window.__h; });
  }

  // ---------------------------------------------------------------------------------------------
  // S20 a handle's word steps off the zoom buttons, a tick number, or another handle when a free side exists, and stays put otherwise
  // (residue: curves-linear 'start' under Reset and 'censtart', arithmetic z2 on the tick '4', powermap 'p' against 'r = ...')
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const T = window.__tt;
      const { host, plane } = T.mk('pt-fl', { xRange: [-6, 6], yRange: [-6, 6], maxWidth: 480 });
      const rec = T.record('pt-fl-canvas');
      try {
        await T.frames(3);
        const cr = T.rel(plane, document.querySelector('#pt-fl-viewport .plane-controls'));
        const at = (x, y) => plane.fromPixel(x, y);
        const O = plane.toPixel({ re: 0, im: 0 }), scale = plane.getView().scale;
        // 1. beside the zoom buttons: the default word (above and right of the dot) would run under them
        const ym = (cr.y0 + cr.y1) / 2;
        plane.addPoint({ id: 'start', z: at(cr.x0 - 16, ym), label: 'start' });
        plane.addPoint({ id: 'pinned', z: at(cr.x0 - 16, cr.y1 + 30), label: 'start', labelSide: 'above-right' });          // a fixed side is kept (this one is clear anyway)
        // 2. on the tick numbers: the dot 20 px under the '2' of the imaginary axis, 25 px left of the axis: the word would sit on the '2'
        plane.addPoint({ id: 'tick', z: at(O.x - 25, O.y - 2 * scale + 20), label: 'k' });
        plane.addPoint({ id: 'tickpin', z: at(O.x - 25, O.y + 2 * scale + 20), label: 'k', labelSide: 'above-right' });
        // 3. two handles close together: the word of the first would run under the dot of the second
        const P = { x: 90, y: 330 };
        plane.addPoint({ id: 'centre', z: at(P.x, P.y), label: 'centre' });
        plane.addPoint({ id: 'next', z: at(P.x + 45, P.y - 14), label: 'next' });
        // 3b. the word of the second handle would run under the word of the first (and touches neither dot)
        const P2 = { x: 260, y: 390 };
        plane.addPoint({ id: 'lab1', z: at(P2.x, P2.y), label: 'centre' });
        plane.addPoint({ id: 'lab2', z: at(P2.x + 40, P2.y + 8), label: 'lab2' });
        // 4. alone in the open: the default sides of the first release
        plane.addPoint({ id: 'alone', z: at(O.x + 3 * scale, O.y + 3 * scale), label: 'alone' });
        plane.addPoint({ id: 'edge', z: at(O.x + 5.9 * scale, O.y + 1.5 * scale), label: 'edge' });                    // the right edge: the word goes left, as it always did
        await T.frames(4);
        const last = rec.last(), ticks = last.filter((e) => e.px === 11 && e.base !== 'alphabetic' ? true : e.px === 11).map(T.boxOf);
        const out = { size: plane.getSize(), ticks: ticks.length, handles: {} };
        const buttons = [...document.querySelectorAll('#pt-fl-viewport .plane-btn')].map((b) => T.rel(plane, b));
        for (const h of plane.handles()) {
          const lab = h.el.querySelector('.plane-handle-label');
          out.handles[h.id] = { dot: T.rel(plane, h.el.querySelector('.plane-handle-dot')), label: T.rel(plane, lab), cls: lab.className };
        }
        out.buttons = buttons;
        out.tickBoxes = ticks;
        return out;
      } finally { rec.restore(); plane.destroy(); host.remove(); }
    });
    const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
    const shrink = (b, d) => ({ x0: b.x0 + d, y0: b.y0 + d, x1: b.x1 - d, y1: b.y1 - d });
    const inCanvas = (b) => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= r.size.w && b.y1 <= r.size.h;
    const H = r.handles;
    assert(r.ticks > 8, `S20 setup: the tick numbers were recorded (${r.ticks})`);
    // 1. the zoom buttons
    assert(!r.buttons.some((b) => hit(shrink(H.start.label, 1), b)), `S20 the "start" word is clear of every zoom button (${JSON.stringify(H.start.label)} vs ${JSON.stringify(r.buttons)})`);
    assert(/is-left|is-below/.test(H.start.cls) && inCanvas(H.start.label), `S20 "start" stepped to another side and is on the canvas (${H.start.cls})`);
    // 2. the tick numbers
    assert(!r.tickBoxes.some((t) => hit(shrink(H.tick.label, 1), t)), `S20 the "k" word is clear of every tick number (${JSON.stringify(H.tick.label)})`);
    assert(/is-left|is-below/.test(H.tick.cls), `S20 "k" stepped to another side (${H.tick.cls})`);
    assert(r.tickBoxes.some((t) => hit(shrink(H.tickpin.label, 1), t)) && !/is-left|is-below/.test(H.tickpin.cls), `S20 a handle with labelSide 'above-right' keeps its side even over a tick number (${H.tickpin.cls})`);
    // 3. two handles close together: nothing among the two dots and two words overlaps
    const parts = [['centre dot', H.centre.dot], ['centre word', H.centre.label], ['next dot', H.next.dot], ['next word', H.next.label]];
    const clash = [];
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      if ((i === 0 && j === 1) || (i === 2 && j === 3)) continue;
      if (hit(shrink(parts[i][1], 1), shrink(parts[j][1], 1))) clash.push(`${parts[i][0]} over ${parts[j][0]}`);
    }
    assert(clash.length === 0, `S20 "centre" and "next" do not run into each other: ${clash.join('; ')}`);
    // 3b. two words that would overlap each other: the later one steps aside
    const parts2 = [['lab1 dot', H.lab1.dot], ['lab1 word', H.lab1.label], ['lab2 dot', H.lab2.dot], ['lab2 word', H.lab2.label]];
    const clash2 = [];
    for (let i = 0; i < parts2.length; i++) for (let j = i + 1; j < parts2.length; j++) {
      if ((i === 0 && j === 1) || (i === 2 && j === 3)) continue;
      if (hit(shrink(parts2[i][1], 1), shrink(parts2[j][1], 1))) clash2.push(`${parts2[i][0]} over ${parts2[j][0]}`);
    }
    assert(clash2.length === 0, `S20 the word of "lab2" does not run under the word of "lab1": ${clash2.join('; ')} (${H.lab2.cls})`);
    assert(/is-left|is-below/.test(H.lab2.cls), `S20 "lab2" stepped to another side (${H.lab2.cls})`);
    // 4. nothing in the way: the default sides, exactly as before
    assert(!/is-left|is-below/.test(H.alone.cls), `S20 a handle with a free default keeps it (${H.alone.cls})`);
    assert(/is-left/.test(H.edge.cls) && !/is-below/.test(H.edge.cls) && inCanvas(H.edge.label), `S20 at the right edge the word goes left, as it always did (${H.edge.cls})`);
  }

  // ---------------------------------------------------------------------------------------------
  // S21 an axis near the canvas edge no longer runs through its own numbers and name (residue: mappings-cr, keepAxesClear)
  // Run with the zoom buttons (they push 'Re' and 'Im' away from the top-right corner) and without them (a plane with controls: false,
  // as the roots station has), so the names near the right and top edges are tested where nothing else moves them.
  // ---------------------------------------------------------------------------------------------
  for (const withControls of [true, false]) {
    const r = await page.evaluate(async (withControls) => {
      const T = window.__tt;
      const { host, plane } = T.mk('pt-ax', { xRange: [-4, 4], yRange: [-4, 4], maxWidth: 400, controls: withControls });
      const rec = T.record('pt-ax-canvas');
      try {
        await T.frames(3);
        const { w, h } = plane.getSize(), scale = plane.getView().scale, bad = [];
        let checked = 0;
        const check = async (Ox, Oy) => {
          plane.setView({ center: { re: (w / 2 - Ox) / scale, im: (Oy - h / 2) / scale } });
          await T.frames(2);
          const words = rec.last().filter((e) => e.px === 11 || e.px === 12).map((e) => ({ ...T.boxOf(e), px: e.px, align: e.align, base: e.base }));
          const O = plane.toPixel({ re: 0, im: 0 });
          const xOn = O.y >= 0 && O.y <= h, yOn = O.x >= 0 && O.x <= w, tag = `${withControls ? 'with' : 'without'} buttons, origin at (${Ox}, ${Oy})`;
          for (const b of words) {
            const horiz = xOn && O.y > b.y0 + 1 && O.y < b.y1 - 1, vert = yOn && O.x > b.x0 + 1 && O.x < b.x1 - 1;
            // a tick number or the 0 or an axis name is struck by the axis it belongs to when the axis passes through its box
            if (b.text === 'Re' || (b.px === 11 && b.align === 'center')) { if (horiz) bad.push(`${tag}: "${b.text}" is struck by the real axis`); }
            else if (b.text === 'Im' || (b.px === 11 && b.base === 'middle')) { if (vert) bad.push(`${tag}: "${b.text}" is struck by the imaginary axis`); }
            else if (b.text === '0') { if (horiz || vert) bad.push(`${tag}: the 0 is struck by an axis`); }
          }
          checked += words.length;
        };
        for (let y = h - 44; y <= h + 6; y += 2) await check(w / 2, y);                       // the real axis sliding off the bottom
        for (let x = -6; x <= 64; x += 2) await check(x, h / 2);                               // the imaginary axis sliding off the left
        for (let y = -6; y <= 40; y += 2) await check(w / 2, y);                               // the real axis near the top ('Re')
        for (let x = w - 64; x <= w + 6; x += 2) await check(x, h / 2);                        // the imaginary axis near the right ('Im')
        for (const [x, y] of [[8, h - 8], [w - 8, 8], [8, 8], [w - 8, h - 8], [w / 2, h / 2]]) await check(x, y);
        // the centred layout is exactly what it was: x numbers 14 px under the axis, y numbers right-aligned 6 px left of it
        plane.setView({ center: { re: 0, im: 0 } });
        await T.frames(2);
        const O = plane.toPixel({ re: 0, im: 0 }), centred = rec.last().filter((e) => e.px === 11).map((e) => ({ t: e.t, x: e.x, y: e.y, align: e.align, base: e.base }));
        const xs = centred.filter((e) => e.align === 'center'), ys = centred.filter((e) => e.base === 'middle');
        const names = rec.last().filter((e) => e.px === 12).map((e) => ({ t: e.t, x: e.x - O.x, y: e.y - O.y, w: e.w, align: e.align }));
        return { bad: bad.slice(0, 8), nBad: bad.length, checked, names, centred: { xRow: [...new Set(xs.map((e) => e.y - O.y))], yCol: [...new Set(ys.map((e) => e.x - O.x))], yAlign: [...new Set(ys.map((e) => e.align))] } };
      } finally { rec.restore(); plane.destroy(); host.remove(); }
    }, withControls);
    assert(r.nBad === 0, `S21 ${withControls ? 'with' : 'without'} zoom buttons: ${r.nBad} struck labels, for example: ${r.bad.join(' | ')}`);
    assert(r.centred.xRow.length === 1 && r.centred.xRow[0] === 14 && r.centred.yCol.length === 1 && r.centred.yCol[0] === -6 && r.centred.yAlign[0] === 'right', `S21 a centred origin keeps the old layout: ${JSON.stringify(r.centred)}`);
    const re = r.names.find((n) => n.t === 'Re'), im = r.names.find((n) => n.t === 'Im');
    assert(re && im && re.y === -8 && im.x === 8 && im.align === 'left', `S21 the names of a centred origin are where they were (Re 8 px above the axis, Im 8 px right of it): ${JSON.stringify(r.names)}`);
    log(`S21 ${withControls ? 'with' : 'without'} buttons: ${r.checked} words checked over 150 origin positions near the four edges: none struck by its own axis`);
  }

  // ---------------------------------------------------------------------------------------------
  // S22 createLabelPlacer, registerObstacle and the obstacle option in a real plane frame (residue: distance-sets, roots, branches, curves-linear)
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const T = window.__tt, mod = window.__pt.mod;
      const { host, plane } = T.mk('pt-pl', { xRange: [-4, 4], yRange: [-4, 4], maxWidth: 480 });
      const rec = T.record('pt-pl-canvas');
      const S = window.__pl = { obstacle: null, segment: false, results: {}, word: null, cands: null };
      try {
        const z = plane.addPoint({ id: 'z', z: { re: -1, im: Math.sqrt(3) }, label: 'z' });
        const curve = plane.addCurve({ id: 'c', points: [], color: '--input', dots: false, arrow: false, ramp: false, order: 10 });
        plane.addLayer((c, p) => {
          mod.drawCartAddress(c, p, z.z);
          mod.drawPolarAddress(c, p, z.z, { ghosts: 1 });
          if (S.obstacle) mod.registerObstacle(p, S.obstacle);
          if (S.segment) mod.drawSegment(c, p, S.segment[0], S.segment[1], { color: '--input', dash: [4, 3], obstacle: true });
          if (S.word) { const put = mod.createLabelPlacer(c, p); S.results[S.word] = put(S.word, S.cands(p), { color: '--output' }, S.opts || {}); }
        });
        await T.frames(3);
        const words = () => rec.last().map(T.boxOf);
        const find = (pre) => words().find((b) => b.text.startsWith(pre));
        const segCrosses = (a, b, box) => {                                       // Liang-Barsky, independent of plane.js
          const dx = b.x - a.x, dy = b.y - a.y; let t0 = 0, t1 = 1;
          for (const [pp, q] of [[-dx, a.x - box.x0], [dx, box.x1 - a.x], [-dy, a.y - box.y0], [dy, box.y1 - a.y]]) {
            if (pp === 0) { if (q < 0) return false; continue; }
            const rr = q / pp; if (pp < 0) { if (rr > t1) return false; if (rr > t0) t0 = rr; } else { if (rr < t0) return false; if (rr < t1) t1 = rr; }
          }
          return true;
        };
        const out = {};
        const Fy = plane.toPixel({ re: 0, im: z.z.im });
        out.size = plane.getSize();
        // a. a station word is where the placer put it, and the plane's own y label (queued to the end of the frame) steps off it:
        //    the y label's default spot is 8 px right of the imaginary axis at the height of z
        const y0 = find('y = ');
        S.word = 'station word'; S.cands = () => [{ x: Fy.x + 8, y: Fy.y, align: 'left', baseline: 'middle' }, { x: 60, y: 60, align: 'left' }];
        plane.requestDraw(); await T.frames(2);
        const w1 = find('station word'), y1 = find('y = ');
        out.a = { placed: !!w1 && Math.abs(w1.x0 - (Fy.x + 8)) < 1, hit: w1 && y1 ? T.hit(w1, y1) : null, yMoved: !!y0 && !!y1 && (Math.abs(y1.x0 - y0.x0) > 1 || Math.abs(y1.y0 - y0.y0) > 1), result: S.results['station word'] };
        // b. a word never goes under the zoom buttons or a handle's own word
        const cr = T.rel(plane, document.querySelector('#pt-pl-viewport .plane-controls')), hl = T.rel(plane, z.el.querySelector('.plane-handle-label'));
        S.word = 'second word'; S.cands = () => [{ x: (cr.x0 + cr.x1) / 2, y: (cr.y0 + cr.y1) / 2, align: 'center' }, { x: (hl.x0 + hl.x1) / 2, y: hl.y1 - 2, align: 'center' }, { x: 80, y: 420, align: 'left' }];
        plane.requestDraw(); await T.frames(2);
        const w2 = find('second word');
        out.b = { drawn: !!w2, clearOfButtons: !!w2 && !T.hit(w2, cr), clearOfHandleWord: !!w2 && !T.hit(w2, hl), at: w2 && [w2.x0, w2.y0] };
        // c. an optional word with no free spot is not printed; with the same candidates and maxCost it is
        const tick = rec.last().filter((e) => e.px === 11 && e.align === 'center').map(T.boxOf)[0];
        S.word = 'tick word'; S.cands = () => [{ x: (tick.x0 + tick.x1) / 2, y: tick.y1 - 2, align: 'center' }]; S.opts = { optional: true };
        plane.requestDraw(); await T.frames(2);
        out.c = { optional: S.results['tick word'], drawn: !!find('tick word') };
        S.word = 'tick word 2'; S.opts = { maxCost: 8 };
        plane.requestDraw(); await T.frames(2);
        out.c.accepted = S.results['tick word 2']; out.c.drawn2 = !!find('tick word 2');
        S.word = null; S.opts = null; S.results = {};
        // d. registerObstacle and the obstacle option move the r label off a line through its default spot
        plane.requestDraw(); await T.frames(2);
        const rBox = find('r = '), cy = (rBox.y0 + rBox.y1) / 2, a = plane.fromPixel(rBox.x0 - 30, cy), b = plane.fromPixel(rBox.x1 + 30, cy);
        const pa = { x: rBox.x0 - 30, y: cy }, pb = { x: rBox.x1 + 30, y: cy };
        out.d = { before: rBox, crossesBefore: segCrosses(pa, pb, rBox) };
        const tryForm = async (name, set, clear) => {
          set(); plane.requestDraw(); await T.frames(2);
          const rb = find('r = '); out.d[name] = { box: rb && [rb.x0, rb.y0], crosses: rb ? segCrosses(pa, pb, rb) : null, drawn: !!rb };
          clear(); plane.requestDraw(); await T.frames(2);
          const back = find('r = '); out.d[name].back = back && Math.abs(back.x0 - rBox.x0) < 0.01 && Math.abs(back.y0 - rBox.y0) < 0.01;
        };
        await tryForm('registerObstacle', () => { S.obstacle = { a, b }; }, () => { S.obstacle = null; });
        await tryForm('polyline', () => { S.obstacle = { points: [a, plane.fromPixel((pa.x + pb.x) / 2, cy), b] }; }, () => { S.obstacle = null; });
        await tryForm('drawSegment', () => { S.segment = [a, b]; }, () => { S.segment = false; });
        await tryForm('curve', () => { curve.set({ obstacle: true }); curve.update([0, 0.5, 1].map((t, i) => ({ ...(i === 0 ? a : i === 1 ? plane.fromPixel((pa.x + pb.x) / 2, cy) : b), t }))); }, () => { curve.set({ obstacle: false }); });
        out.d.curveThere = true;
        return out;
      } finally { rec.restore(); plane.destroy(); host.remove(); delete window.__pl; }
    });
    assert(r.a.placed && r.a.hit === false && r.a.yMoved && r.a.result === true, `S22 a station word is placed where asked and the plane's y label steps off it: ${JSON.stringify(r.a)}`);
    assert(r.b.drawn && r.b.clearOfButtons && r.b.clearOfHandleWord, `S22 a word skips the zoom buttons and the handle's own word: ${JSON.stringify(r.b)}`);
    assert(r.c.optional === false && r.c.drawn === false, `S22 an optional word with only a tick number to sit on is not printed: ${JSON.stringify(r.c)}`);
    assert(r.c.accepted === true && r.c.drawn2 === true, `S22 maxCost 8 lets it sit on a tick number: ${JSON.stringify(r.c)}`);
    assert(r.d.crossesBefore, 'S22 setup: the line really does run through the r label\'s default spot');
    for (const k of ['registerObstacle', 'polyline', 'drawSegment', 'curve']) {
      assert(r.d[k].drawn && r.d[k].crosses === false, `S22 ${k}: the r label is off the line (${JSON.stringify(r.d[k])})`);
      assert(r.d[k].back === true, `S22 ${k}: and back at its default spot once the obstacle is gone (${JSON.stringify(r.d[k])})`);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // S23 the text caches: one --font read per frame, and a repeated word is measured once (residue: distance-sets profile)
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const T = window.__tt, mod = window.__pt.mod;
      const { host, plane } = T.mk('pt-cache', { xRange: [-4, 4], yRange: [-4, 4], maxWidth: 480 });
      const z = plane.addPoint({ id: 'z', z: { re: -1, im: Math.sqrt(3) }, label: 'z' });
      plane.addLayer((c, p) => {
        mod.drawCartAddress(c, p, z.z); mod.drawPolarAddress(c, p, z.z, { ghosts: 2 }); mod.drawSeam(c, p);
        const put = mod.createLabelPlacer(c, p);
        for (let i = 0; i < 24; i++) put(`word ${i % 6}`, [{ x: 30 + (i % 6) * 60, y: 380 + (i % 3) * 14, align: 'left' }], {}, { optional: true });
        mod.drawLabel(c, p, { re: 2, im: -2 }, 'drawLabel'); mod.drawLabel(c, p, { re: 2, im: -2.5 }, 'drawLabel');
      });
      await T.frames(4);
      const gp0 = CSSStyleDeclaration.prototype.getPropertyValue, mt0 = CanvasRenderingContext2D.prototype.measureText;
      const cnt = { font: 0, measure: 0 };
      CSSStyleDeclaration.prototype.getPropertyValue = function (n) { if (n === '--font') cnt.font++; return gp0.call(this, n); };
      CanvasRenderingContext2D.prototype.measureText = function (t) { if (this.canvas.id === 'pt-cache-canvas') cnt.measure++; return mt0.call(this, t); };
      try {
        const d0 = plane.getStats().draws;
        plane.requestDraw(); await T.frames(2);
        const warm = { draws: plane.getStats().draws - d0, ...cnt };
        cnt.font = 0; cnt.measure = 0;
        document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');   // a theme change drops the caches once
        await T.frames(3);
        const afterTheme = { ...cnt };
        document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        document.documentElement.removeAttribute('data-theme');
        await T.frames(3);
        return { warm, afterTheme };
      } finally {
        CSSStyleDeclaration.prototype.getPropertyValue = gp0; CanvasRenderingContext2D.prototype.measureText = mt0;
        plane.destroy(); host.remove();
      }
    });
    assert(r.warm.draws >= 1 && r.warm.font <= r.warm.draws, `S23 at most one --font read per frame, however many words (${r.warm.font} reads in ${r.warm.draws} frames)`);
    assert(r.warm.measure === 0, `S23 a warm frame measures nothing: every word width comes from the cache (${r.warm.measure} measureText calls)`);
    assert(r.afterTheme.measure > 0 && r.afterTheme.measure < 40, `S23 a theme change drops the widths once and they are measured again, once each (${r.afterTheme.measure})`);
    log(`S23 warm frame: ${r.warm.font} --font reads, ${r.warm.measure} measureText calls; after a theme change ${r.afterTheme.measure} measures`);
  }

  // ---------------------------------------------------------------------------------------------
  // S13 destroy and re-create
  // ---------------------------------------------------------------------------------------------
  {
    const r = await page.evaluate(async () => {
      const { plane, mod, slot, host } = window.__pt;
      const out = {};
      plane.destroy();
      out.registered = window.__mv.planes.has('pt-plane');
      out.elements = document.querySelectorAll('[data-plane-id="pt-plane"]').length;
      out.destroyed = plane.getStats().destroyed;
      try { plane.requestDraw(); plane.addPoint({ id: 'late', z: { re: 0, im: 0 } }); plane.addCurve({ id: 'late', points: [] }); plane.resize(); plane.destroy(); out.threw = null; }
      catch (e) { out.threw = String(e); }
      const again = mod.createPlane(slot, { id: 'pt-plane' });
      out.recreated = window.__mv.planes.get('pt-plane') === again;
      again.destroy();
      out.afterSecond = window.__mv.planes.has('pt-plane');
      host.remove();
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      return out;
    });
    assert(r.registered === false && r.elements === 0 && r.destroyed === true, `S13 destroyed plane is unregistered and removed: ${JSON.stringify(r)}`);
    assert(r.threw === null, `S13 calls after destroy do not throw (${r.threw})`);
    assert(r.recreated === true && r.afterSecond === false, `S13 re-creating the id works and cleans up: ${JSON.stringify(r)}`);
  }
}
