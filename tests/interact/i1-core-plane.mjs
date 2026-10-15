// tests/interact/i1-core-plane.mjs
// Run: node tools/smoke.mjs --route i1-core-plane --script tests/interact/i1-core-plane.mjs --out docs/review/iter-1/i1-core-plane
// (add --dark once to also capture the loaded route in dark; this script switches theme itself).
//
// The route is unknown to the router, whose "No such place" panel is fine: this script builds its own fixture in
// document.body (never inside #view), drives it with REAL mouse and keyboard events, and runs at both harness
// viewports (desktop 1280x860, phone 390x844) on fresh pages. Steps S0 to S13 follow docs/designs/iter-1/i1-core-plane.md 7.3.
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
  const crop = async (name, shotFile) => {
    if (!shotFile) return;
    const out = path.join(path.dirname(shotFile), `${path.basename(shotFile, '.png')}-crop.png`);
    await page.locator('#pt-plane-viewport').screenshot({ path: out });
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
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push({ re: -2.5, im: -3 + 6 * t, t }); }
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
    const [lre, lim] = nums(label);
    near(lre, end.re, 0.001, 'S1 label re matches the handle'); near(Math.abs(lim), Math.abs(end.im), 0.001, 'S1 label im matches the handle');
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
    return { early: px({ re: -2.5, im: -2.4 }), late: px({ re: -2.5, im: 2.4 }) };
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
