// Interaction checks for js/core/three-view.js (goal i1-core-three), criterion A4.
//
//   node tests/interact/i1-core-three.mjs [--out dir]
//        standalone: starts a static server over the repo root, serves one in-memory page
//        (/__three-check.html, tokens only), and runs every step at desktop and phone width
//        in headless Chromium with the smoke launch flags (swiftshader). Needs no index.html.
//   node tools/smoke.mjs --route home --script tests/interact/i1-core-three.mjs --out docs/review/iter-1/i1-core-three
//        the same steps through the project harness, on whatever page the route loads.
//
// Steps S0 to S12 are the table in docs/designs/iter-1/i1-core-three.md section 7.3; S13 to S22 are listed in its Appendix D. Each step builds its
// own host element (fixed at the top-left, overlapping the others) and disposes it before the next step,
// except the S1 view, which S2 to S6 reuse and S11 disposes.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------------
// The steps (work on any page served from the repo root)
// ------------------------------------------------------------------------------------------------

export async function runChecks(page, assert, log, shot) {
  const messages = [];
  const onConsole = (m) => messages.push({ type: m.type(), text: m.text() });
  page.on('console', onConsole);
  // T3_ONLY=S19,S22 runs S0 and the named steps only (a debugging aid; a full run leaves it unset)
  const only = String(process.env.T3_ONLY || '').split(',').map((x) => x.trim()).filter(Boolean);
  const step = async (name, fn) => {
    if (only.length && !name.startsWith('S0 ') && !only.some((p) => name.startsWith(p + ' '))) return;
    try { await fn(); } catch (e) { throw new Error(`${name}: ${e.message}`); }
    log(`ok ${name}`);
  };
  const near = (a, b, eps) => Math.abs(a - b) <= eps;

  try {
    // ---------------------------------------------------------------- S0 import
    await step('S0 import', async () => {
      const r = await page.evaluate(async () => {
        const m = await import('./js/core/three-view.js');
        window.__t3 = {
          m,
          baseViews: (window.__mv && window.__mv.views3d) ? window.__mv.views3d.size : 0,
          themeAttr: document.documentElement.getAttribute('data-theme'),
        };
        const t3 = window.__t3;
        t3.makeHost = ({ id = '', width = 'min(400px, 100vw)', height = 300 } = {}) => {
          const d = document.createElement('div');
          d.setAttribute('data-t3-host', '');
          if (id) d.id = id;
          Object.assign(d.style, { position: 'fixed', left: '0', top: '0', width, height: height + 'px', background: '#fff', zIndex: '2147483000' });
          document.body.appendChild(d);
          return d;
        };
        t3.pixels = (canvas) => {
          const c2 = document.createElement('canvas');
          c2.width = canvas.width; c2.height = canvas.height;
          const ctx = c2.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(canvas, 0, 0);
          return ctx.getImageData(0, 0, c2.width, c2.height);
        };
        t3.pick = (img, x, y) => { const i = (Math.round(y) * img.width + Math.round(x)) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
        t3.diffFraction = (img, thr = 6) => {
          const [r0, g0, b0] = [img.data[0], img.data[1], img.data[2]];
          let n = 0;
          for (let i = 0; i < img.data.length; i += 4) {
            if (Math.abs(img.data[i] - r0) > thr || Math.abs(img.data[i + 1] - g0) > thr || Math.abs(img.data[i + 2] - b0) > thr) n++;
          }
          return n / (img.data.length / 4);
        };
        t3.diffBetween = (a, b, thr = 6) => {
          let n = 0;
          for (let i = 0; i < a.data.length; i += 4) {
            if (Math.abs(a.data[i] - b.data[i]) > thr || Math.abs(a.data[i + 1] - b.data[i + 1]) > thr || Math.abs(a.data[i + 2] - b.data[i + 2]) > thr) n++;
          }
          return n / (a.data.length / 4);
        };
        t3.z2 = (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im });
        t3.circlePts = () => Array.from({ length: 100 }, (_, k) => {
          const t = -1.2 + 2.4 * k / 99;
          return { re: 2 * Math.cos(t) * Math.cos(t), im: 2 * Math.cos(t) * Math.sin(t), t: k / 99 };
        });
        t3.cleanup = () => document.querySelectorAll('[data-t3-host]').forEach((e) => e.remove());
        t3.buildGallery = (hintOn) => {
          const m = t3.m;
          const g = document.createElement('div');
          g.setAttribute('data-t3-host', '');
          g.id = 'three-gallery';
          g.style.cssText = 'position:absolute;top:0;left:0;width:100%;box-sizing:border-box;padding:16px;background:var(--bg,#fff);color:var(--text,#111);' +
            'z-index:2147483000;display:grid;gap:12px;grid-template-columns:repeat(auto-fit, minmax(min(100%, 340px), 1fr));font-family:var(--font,system-ui,sans-serif)';
          document.body.appendChild(g);
          const gallery = { views: [], g };
          const cell = (title, id) => {
            const fig = document.createElement('figure');
            fig.style.cssText = 'margin:0;min-width:0';
            const cap = document.createElement('figcaption');
            cap.textContent = title;
            cap.style.cssText = 'font:600 14px var(--font,system-ui,sans-serif);margin:0 0 6px';
            const box = document.createElement('div');
            box.id = id;
            box.style.cssText = 'height:260px;width:100%';
            fig.append(cap, box);
            g.appendChild(fig);
            return box;
          };
          const mk = (title, id, opts, build) => {
            const box = cell(title, id);
            const v = m.createView3D(box, { hint: hintOn, label: title, ...opts });
            build(v);
            gallery.views.push(v);
            return v;
          };
          const I = { re: 0, im: 1 };
          mk('Modulus landscape of z squared: height |w|, hue Arg w', 'gal-landscape', { gridSize: 4, axisLabels: ['Re z', 'Im z', '|w|'] },
            (v) => v.add(m.modulusLandscape({ f: t3.z2 })));
          mk('Im surface of z squared: height Im w, colour Re w', 'gal-im', { gridSize: 4, axisLabels: ['x', 'y', 'v'] },
            (v) => v.add(m.reImSurface({ f: t3.z2, part: 'im' })));
          mk('Riemann surface of the cube root: three sheets', 'gal-root', { gridSize: 4, grid: 'polar', axisLabels: ['x', 'y', 'Im w'] },
            (v) => v.add(m.riemannSurfaceRoot({ n: 3 })));
          mk('4D graph of z squared, uv 0.6, yv 0.3', 'gal-4d', { gridSize: 4, axisLabels: ['x', 'y', 'u'] },
            (v) => v.add(m.graph4D({ f: t3.z2, angles: { uv: 0.6, yv: 0.3 } }).mesh));
          mk('Staircase of arg z: z = -1 + i sqrt 3, seam on the negative real axis', 'gal-helix', { gridSize: 6, grid: 'polar', axisLabels: ['Re z', 'Im z', 'angle'] },
            (v) => { const h = m.argHelix({ z: { re: -1, im: Math.sqrt(3) }, turns: 3 }); v.add(h.group); });
          mk('Riemann sphere: the circle |z - 1| = 1', 'gal-sphere', { grid: false, axes: false },
            (v) => { const s = m.riemannSphere(); v.add(s.group); s.addCurve(t3.circlePts(), '--input'); });
          mk('The same circle after the half-turn: 1/z, now the line Re w = 1/2', 'gal-sphere-half', { grid: false, axes: false },
            (v) => { const s = m.riemannSphere(); v.add(s.group); s.addCurve(t3.circlePts(), '--input'); s.setHalfTurn(Math.PI); s.showAxis(true); });
          void I;
          return gallery;
        };
        const names = ['createView3D', 'surfaceFromFunction', 'modulusLandscape', 'reImSurface', 'graph4D', 'riemannSurfaceRoot',
          'argHelix', 'riemannSphere', 'curveToLine', 'createMarker', 'disposeObject', 'stereographic', 'inverseStereographic',
          'rotate4', 'project4to3', 'toScene', 'fromScene', 'srgbToLinear', 'hslToRgb', 'argColor', 'hiddenRamp', 'hiddenRampCss', 'riemannPoint'];
        return { missing: names.filter((n) => typeof m[n] !== 'function'), rev: m.THREE.REVISION, pitch: m.HELIX_PITCH };
      });
      assert(r.missing.length === 0, `missing exports: ${r.missing.join(', ')}`);
      assert(r.rev === '160', `three.js revision ${r.rev}`);
      assert(r.pitch === 1.2, 'HELIX_PITCH');
    });

    // ---------------------------------------------------------------- S1 view up
    await step('S1 view up', async () => {
      const r = await page.evaluate(() => {
        const t3 = window.__t3;
        const host = t3.makeHost();
        t3.host = host;
        t3.view = t3.m.createView3D(host, { grid: false, axes: false, autoFrame: false, cameraPosition: [0, 6, 0.001], background: '#ffffff', hint: false });
        const v = t3.view;
        const reset = host.querySelector('#' + v.id + '-reset');
        return {
          unavailable: v.unavailable, gl: !!(v.renderer && v.renderer.getContext()), canvas: !!host.querySelector('canvas'),
          role: host.getAttribute('role'), label: host.getAttribute('aria-label'), roledesc: host.getAttribute('aria-roledescription'),
          tabindex: host.getAttribute('tabindex'), resetText: reset ? reset.textContent : null,
          resetLabel: reset ? reset.getAttribute('aria-label') : null, id: v.id, hasHint: !!host.querySelector('.three-hint'),
          describedby: host.getAttribute('aria-describedby'), canvasHidden: v.canvas.getAttribute('aria-hidden'),
          touchAction: v.canvas.style.touchAction, registered: window.__mv.views3d.get(v.id) === v,
        };
      });
      assert(r.unavailable === false, 'WebGL should be available in the smoke browser');
      assert(r.gl && r.canvas, 'renderer context and canvas exist');
      assert(r.role === 'group' && r.roledesc === '3D view' && r.label === '3D view' && r.tabindex === '0', `container attributes ${JSON.stringify(r)}`);
      assert(r.resetText === 'Reset view', `reset button text ${r.resetText}`);
      assert(r.resetLabel === 'Reset view to its starting angle', `reset aria-label: ${r.resetLabel}`);
      assert(r.resetLabel.toLowerCase().includes(r.resetText.toLowerCase()), 'the accessible name contains the visible text (WCAG 2.5.3 Label in Name)');
      assert(r.hasHint === false && r.describedby === null, 'hint: false leaves no hint element and no aria-describedby');
      assert(r.canvasHidden === 'true', 'canvas is aria-hidden');
      assert(/^three-view-\d+$/.test(r.id), `uid ${r.id}`);
      assert(r.registered, 'view registered in window.__mv.views3d');
    });

    // ---------------------------------------------------------------- S2 hue convention
    await step('S2 hue convention (pixels)', async () => {
      const px = await page.evaluate(() => {
        const t3 = window.__t3, v = t3.view;
        const f = (z) => (z.re > 0 ? (z.im > 0 ? { re: 1, im: 0 } : { re: 0, im: -1 }) : (z.im > 0 ? { re: 0, im: 1 } : { re: -1, im: 0 }));
        const mesh = t3.m.modulusLandscape({ f, nx: 64, ny: 64, wire: false });
        v.add(mesh);
        v.renderNow();
        const img = t3.pixels(v.canvas);
        const k = v.canvas.height / 300, cx = v.canvas.width / 2, cy = v.canvas.height / 2;
        const out = {
          q1: t3.pick(img, cx + 72 * k, cy - 72 * k), q2: t3.pick(img, cx - 72 * k, cy - 72 * k),
          q3: t3.pick(img, cx - 72 * k, cy + 72 * k), q4: t3.pick(img, cx + 72 * k, cy + 72 * k),
        };
        v.remove(mesh); t3.m.disposeObject(mesh);
        return out;
      });
      const want = { q1: [230, 26, 26], q2: [128, 230, 26], q3: [26, 230, 230], q4: [128, 26, 230] };
      for (const q of Object.keys(want)) {
        assert(px[q].every((c, i) => near(c, want[q][i], 8)), `${q} pixel ${px[q]} expected about ${want[q]}`);
      }
    });

    // ---------------------------------------------------------------- S3 render on demand
    await step('S3 render on demand', async () => {
      await page.evaluate(() => window.__t3.view.start());
      await sleep(400);
      const a = await page.evaluate(() => window.__t3.view.renderer.info.render.frame);
      await sleep(400);
      const b = await page.evaluate(() => window.__t3.view.renderer.info.render.frame);
      assert(b - a <= 1, `idle frames rendered: ${b - a} (expected 0)`);
      await page.evaluate(() => window.__t3.view.requestRender());
      await sleep(150);
      const c = await page.evaluate(() => window.__t3.view.renderer.info.render.frame);
      assert(c - b === 1, `one requestRender should add exactly 1 render, added ${c - b}`);
      await page.evaluate(() => { const v = window.__t3.view; v.requestRender(); v.requestRender(); v.requestRender(); });
      await sleep(150);
      const d = await page.evaluate(() => window.__t3.view.renderer.info.render.frame);
      assert(d - c === 1, `requests coalesce into one render, got ${d - c}`);
    });

    // ---------------------------------------------------------------- S4 resize
    await step('S4 resize', async () => {
      await page.evaluate(() => { window.__t3.host.style.width = '300px'; });
      await sleep(250);
      const r = await page.evaluate(() => {
        const t3 = window.__t3, v = t3.view, h = t3.host;
        return { w: v.canvas.width, h: v.canvas.height, cw: h.clientWidth, ch: h.clientHeight, aspect: v.camera.aspect,
          dpr: window.devicePixelRatio || 1, outer: h.getBoundingClientRect().width };
      });
      // The canvas fills the container's padding box. The container has a 1px border (border-box), so a 300px
      // container has clientWidth 298; the design's "300" was measured in a prototype without the border.
      assert(r.outer === 300, `host width ${r.outer}`);
      assert(r.w === Math.round(r.cw * Math.min(r.dpr, 2)), `canvas.width ${r.w} for clientWidth ${r.cw} and dpr ${r.dpr}`);
      assert(r.h === Math.round(r.ch * Math.min(r.dpr, 2)), `canvas.height ${r.h} for clientHeight ${r.ch}`);
      assert(near(r.aspect, r.cw / r.ch, 0.01), `camera.aspect ${r.aspect} vs ${r.cw / r.ch}`);
      await page.evaluate(() => { window.__t3.host.style.width = 'min(400px, 100vw)'; });
      await sleep(200);
    });

    // ---------------------------------------------------------------- S5 theme
    await step('S5 theme', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, root = document.documentElement;
        const host = t3.makeHost({ id: 'three-theme-host' });
        const v = t3.m.createView3D(host, { background: '--surface', hint: false });
        const hex = () => v.scene.background.getHex();
        const wait = () => new Promise((res) => setTimeout(res, 120));
        const set = async (theme) => { root.setAttribute('data-theme', theme); document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } })); await wait(); };
        await set('light'); const light1 = hex();
        const lightGrid = v.scene.getObjectByName('furniture').children[0].material.opacity;
        await set('dark'); const dark = hex();
        const darkGrid = v.scene.getObjectByName('furniture').children[0].material.opacity;
        await set('light'); const light2 = hex();
        if (t3.themeAttr === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t3.themeAttr);
        const ids = { reset: !!host.querySelector('#three-theme-host-reset'), canvas: !!host.querySelector('#three-theme-host-canvas'), hint: !!host.querySelector('#three-theme-host-hint') };
        v.dispose(); host.remove();
        return { light1, dark, light2, lightGrid, darkGrid, ids };
      });
      assert(r.dark !== r.light1, `dark background (${r.dark.toString(16)}) must differ from light (${r.light1.toString(16)})`);
      assert(r.light2 === r.light1, 'switching back restores the light background');
      assert(r.darkGrid < r.lightGrid, `grid alpha dark ${r.darkGrid} < light ${r.lightGrid}`);
      assert(r.ids.reset && r.ids.canvas, 'children ids derive from the container id');
    });

    // ---------------------------------------------------------------- S6 keyboard
    await step('S6 keyboard', async () => {
      const r = await page.evaluate(() => {
        const t3 = window.__t3, v = t3.view, host = t3.host;
        host.focus();
        const az = () => Math.atan2(v.camera.position.x - v.controls.target.x, v.camera.position.z - v.controls.target.z);
        const phi = () => { const o = v.camera.position.clone().sub(v.controls.target); return Math.acos(o.y / o.length()); };
        const press = (key, extra = {}) => { const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }); const notPrevented = host.dispatchEvent(e); return !notPrevented; };
        const dist = () => v.camera.position.distanceTo(v.controls.target);
        const start = v.camera.position.clone();
        const phi0 = phi();
        const out = { focused: document.activeElement === host };
        const a0 = az(); out.rightPrevented = press('ArrowRight'); out.dRight = az() - a0;
        const a1 = az(); out.leftPrevented = press('ArrowLeft'); out.dLeft = az() - a1;
        const a2 = az(); press('ArrowRight', { shiftKey: true }); out.dShift = az() - a2;
        out.noSnap = Math.abs(phi() - phi0) < 1e-9;             // sideways keys never change the tilt
        for (let i = 0; i < 5; i++) press('ArrowDown');           // leave the top-down pose (tilt is clamped near the poles)
        const p0 = phi(); press('ArrowUp'); out.dUp = phi() - p0;
        const p1 = phi(); press('ArrowDown'); out.dDown = phi() - p1;
        const d0 = dist(); press('+'); out.zoomIn = dist() / d0;
        const d1 = dist(); press('-'); out.zoomOut = dist() / d1;
        out.unhandledPrevented = press('q');
        // the tilt is clamped away from the poles
        for (let i = 0; i < 80; i++) press('ArrowUp');
        out.minPhi = phi();
        for (let i = 0; i < 80; i++) press('ArrowDown');
        out.maxPhi = phi();
        out.zeroPrevented = press('0');
        out.resetError = v.camera.position.distanceTo(start);
        const evt = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
        const child = host.querySelector('button'); const a3 = az(); child.dispatchEvent(evt); out.fromChildMoved = Math.abs(az() - a3) > 1e-9;
        return out;
      });
      assert(r.focused, 'host takes focus');
      assert(near(r.dRight, 0.12, 0.001), `ArrowRight changes the azimuth by ${r.dRight} (expected 0.12)`);
      assert(near(r.dLeft, -0.12, 0.001), `ArrowLeft changes the azimuth by ${r.dLeft}`);
      assert(near(r.dShift, 0.36, 0.001), `Shift+ArrowRight changes the azimuth by ${r.dShift} (expected 0.36)`);
      assert(r.noSnap, 'sideways keys leave the tilt alone');
      assert(near(r.dUp, -0.12, 0.001), `ArrowUp changes the polar angle by ${r.dUp}`);
      assert(near(r.dDown, 0.12, 0.001), `ArrowDown changes the polar angle by ${r.dDown}`);
      assert(r.maxPhi <= Math.PI - 0.05 + 1e-9 && r.maxPhi > Math.PI - 0.1, `tilt clamped at pi - 0.05, got ${r.maxPhi}`);
      assert(near(r.zoomIn, 0.88, 0.001) && near(r.zoomOut, 1.14, 0.001), `zoom factors ${r.zoomIn}, ${r.zoomOut}`);
      assert(r.rightPrevented && r.leftPrevented && r.zeroPrevented, 'handled keys call preventDefault');
      assert(r.unhandledPrevented === false, 'an unhandled key is left alone');
      assert(r.minPhi >= 0.05 - 1e-9 && r.minPhi < 0.1, `tilt clamped at 0.05, got ${r.minPhi}`);
      assert(r.resetError < 1e-6, `0 returns to the saved position (error ${r.resetError})`);
      assert(r.fromChildMoved === false, 'keys that bubble from a child (the reset button) are not handled');
      // a real key press goes through the same handler
      await page.evaluate(() => window.__t3.host.focus());
      const before = await page.evaluate(() => { const v = window.__t3.view; return Math.atan2(v.camera.position.x - v.controls.target.x, v.camera.position.z - v.controls.target.z); });
      await page.keyboard.press('ArrowLeft');
      const after = await page.evaluate(() => { const v = window.__t3.view; return Math.atan2(v.camera.position.x - v.controls.target.x, v.camera.position.z - v.controls.target.z); });
      assert(near(after - before, -0.12, 0.001), `a real ArrowLeft press turned the view by ${after - before}`);
      await page.keyboard.press('0');
      // the reset button
      const rb = await page.evaluate(() => {
        const t3 = window.__t3, v = t3.view, start = v.camera.position.clone();
        v.camera.position.set(2, 2, 2); v.controls.update();
        document.getElementById(v.id + '-reset').click();
        return v.camera.position.distanceTo(start);
      });
      assert(rb < 1e-6, `Reset view button restores the camera (error ${rb})`);
    });

    // ---------------------------------------------------------------- S7 pointer and wheel
    await step('S7 pointer and wheel', async () => {
      await page.evaluate(() => {
        const t3 = window.__t3;
        const host = t3.makeHost({ id: 'three-pointer-host' });
        t3.pHost = host;
        t3.pView = t3.m.createView3D(host, {});
        t3.wheel = [];
        t3.wheelHandler = (e) => setTimeout(() => t3.wheel.push(e.defaultPrevented));
        window.addEventListener('wheel', t3.wheelHandler, { capture: true, passive: true });
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      });
      const snap = () => page.evaluate(() => { const v = window.__t3.pView; return { p: v.camera.position.toArray(), d: v.camera.position.distanceTo(v.controls.target), hintHidden: document.querySelector('#three-pointer-host-hint').getAttribute('data-hidden') }; });
      await sleep(150);
      const s0 = await snap();
      assert(s0.hintHidden === null, 'hint visible before first use');
      await page.mouse.move(200, 150);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) await page.mouse.move(200 + 80 * i / 6, 150 + 30 * i / 6);
      await page.mouse.up();
      await sleep(400);
      const s1 = await snap();
      const moved = Math.hypot(...s1.p.map((c, i) => c - s0.p[i]));
      assert(moved > 0.1, `dragging should turn the view, moved ${moved}`);
      assert(s1.hintHidden === 'true', 'hint hides on first pointer use');
      await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.__t3.wheel.length = 0; });
      const focusedBefore = await page.evaluate(() => document.activeElement === window.__t3.pHost);
      assert(!focusedBefore, 'host not focused before the unfocused wheel test');
      await page.mouse.move(200, 150);
      await page.mouse.wheel(0, -300);
      await sleep(300);
      const s2 = await snap();
      const w1 = await page.evaluate(() => window.__t3.wheel.slice());
      assert(near(s2.d, s1.d, 1e-9), `an unfocused wheel must not zoom (distance ${s1.d} -> ${s2.d})`);
      assert(w1.length >= 1 && w1.every((x) => x === false), `an unfocused wheel must not be defaultPrevented (${w1})`);
      await page.mouse.click(200, 150);                          // click gives the container focus
      const focusedAfter = await page.evaluate(() => document.activeElement === window.__t3.pHost);
      assert(focusedAfter, 'clicking the view focuses it');
      await page.evaluate(() => { window.__t3.wheel.length = 0; });
      await page.mouse.wheel(0, -300);
      await sleep(300);
      const s3 = await snap();
      const w2 = await page.evaluate(() => window.__t3.wheel.slice());
      assert(s2.d - s3.d > 0.05, `a focused wheel should zoom in (distance ${s2.d} -> ${s3.d})`);
      assert(w2.length >= 1 && w2.every((x) => x === true), `a focused wheel is defaultPrevented (${w2})`);
      // Ctrl + wheel (a trackpad pinch) zooms even when the view is not focused
      await page.evaluate(() => { document.activeElement.blur(); window.__t3.wheel.length = 0; });
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -300);
      await page.keyboard.up('Control');
      await sleep(300);
      const s4 = await snap();
      assert(s3.d - s4.d > 0.05, `Ctrl+wheel zooms without focus (distance ${s3.d} -> ${s4.d})`);
      await page.evaluate(() => {
        const t3 = window.__t3;
        window.removeEventListener('wheel', t3.wheelHandler, { capture: true });
        t3.pView.dispose(); t3.pHost.remove();
      });
    });

    // ---------------------------------------------------------------- S8 all helpers render
    await step('S8 all helpers render', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const out = {};
        const makers = {
          landscape: (v) => v.add(m.modulusLandscape({ f: t3.z2 })),
          'im-surface': (v) => v.add(m.reImSurface({ f: t3.z2, part: 'im' })),
          'riemann-root': (v) => v.add(m.riemannSurfaceRoot({ n: 3 })),
          graph4d: (v) => v.add(m.graph4D({ f: t3.z2, angles: { uv: 0.6, yv: 0.3 } }).mesh),
          helix: (v) => v.add(m.argHelix({ z: { re: -1, im: Math.sqrt(3) }, turns: 3 }).group),
          sphere: (v) => {
            const s = m.riemannSphere();
            s.addCurve(t3.circlePts(), '--input');
            s.addCurve([{ re: -3, im: 0, t: 0 }, { re: 3, im: 0, t: 1 }], '--output');
            v.add(s.group);
          },
        };
        for (const [name, make] of Object.entries(makers)) {
          const host = t3.makeHost();
          const v = m.createView3D(host, { grid: false, axes: false, hint: false, background: '#ffffff' });
          make(v);
          v.renderNow();
          const img = t3.pixels(v.canvas);
          out[name] = { frac: t3.diffFraction(img), unavailable: v.unavailable };
          v.dispose(); host.remove();
        }
        return out;
      });
      for (const [name, x] of Object.entries(r)) {
        assert(x.unavailable === false, `${name}: view available`);
        assert(x.frac > 0.03, `${name}: only ${(100 * x.frac).toFixed(2)} percent of pixels differ from the background`);
      }
      log(`   coverage ${Object.entries(r).map(([k, x]) => `${k} ${(100 * x.frac).toFixed(1)}%`).join(', ')}`);

      // auto redraw: a station never has to call requestRender after setAngles
      const ar = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const host = t3.makeHost();
        const v = m.createView3D(host, { grid: false, axes: false, hint: false, background: '#ffffff' });
        const g = m.graph4D({ f: t3.z2, angles: { uv: 0, yv: 0 } });
        v.add(g.mesh);
        v.renderNow();
        const A = t3.pixels(v.canvas);
        await new Promise((r) => setTimeout(r, 300));
        const f0 = v.renderer.info.render.frame;
        g.setAngles({ uv: Math.PI / 2 });                      // deliberately no requestRender()
        await new Promise((r) => setTimeout(r, 150));
        const f1 = v.renderer.info.render.frame;
        v.renderNow();
        const B = t3.pixels(v.canvas);
        const res = { rose: f1 - f0, differ: t3.diffBetween(A, B), version: g.mesh.userData.version };
        v.dispose(); host.remove();
        return res;
      });
      assert(ar.rose === 1, `setAngles should trigger exactly 1 render by itself, got ${ar.rose}`);
      assert(ar.differ > 0.01, `the 4D graph should change when uv turns (${(100 * ar.differ).toFixed(2)} percent differ)`);

      // auto frame
      const af = await page.evaluate(() => {
        const t3 = window.__t3, m = t3.m, THREE = m.THREE;
        const host = t3.makeHost();
        const v = m.createView3D(host, { grid: false, axes: false, hint: false });
        const mesh = m.modulusLandscape({ f: t3.z2 });
        v.add(mesh);
        const box = new THREE.Box3().setFromObject(mesh), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        const R = size.length() / 2, vFov = v.camera.fov * Math.PI / 180, hFov = 2 * Math.atan(Math.tan(vFov / 2) * v.camera.aspect);
        const want = R * 1.25 / Math.sin(Math.min(vFov, hFov) / 2);
        const res = { target: v.controls.target.distanceTo(c), dist: v.camera.position.distanceTo(v.controls.target), want, size: size.toArray(), R };
        v.dispose(); host.remove();
        return res;
      });
      assert(af.target < 1e-6, `auto-frame target off by ${af.target}`);
      assert(Math.abs(af.dist / af.want - 1) < 0.01, `auto-frame distance ${af.dist} vs ${af.want}`);
      // the box is 4 x (6 - 0.0009) x 4: an even 96-point grid has no vertex at z = 0, so the lowest height is 2 * 0.0211^2
      assert(near(af.size[0], 4, 1e-6) && near(af.size[1], 6, 0.01) && near(af.size[2], 4, 1e-6), `landscape box ${af.size}`);
    });

    // ---------------------------------------------------------------- S9 sphere half-turn in the browser
    await step('S9 sphere half-turn', async () => {
      const r = await page.evaluate(() => {
        const t3 = window.__t3, m = t3.m;
        const host = t3.makeHost();
        const v = m.createView3D(host, { grid: false, axes: false, hint: false });
        const s = m.riemannSphere();
        v.add(s.group);
        const vFov = v.camera.fov * Math.PI / 180, hFov = 2 * Math.atan(Math.tan(vFov / 2) * v.camera.aspect);
        const frame = { dist: v.camera.position.distanceTo(v.controls.target), want: 1.25 / Math.sin(Math.min(vFov, hFov) / 2), target: v.controls.target.length() };
        const line = s.addCurve(t3.circlePts(), '--input');
        const resid = (sign) => {
          s.group.updateMatrixWorld(true);
          const pos = line.geometry.attributes.position;
          let worst = 0;
          for (let i = 0; i < pos.count; i++) {
            const p = new m.THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(line.matrixWorld);
            const [X, , Z] = m.fromScene([p.x, p.y, p.z]).map((c) => c / 1.004);
            worst = Math.max(worst, Math.abs(2 * X + sign * Z - 1));
          }
          return worst;
        };
        s.setHalfTurn(0); const plane0 = resid(-1);
        s.setHalfTurn(Math.PI); const plane1 = resid(+1);
        s.setHalfTurn(Math.PI); const stillInput = resid(-1);   // and it is NOT on the input plane any more
        v.dispose(); host.remove();
        return { plane0, plane1, stillInput, frame };
      });
      assert(r.frame.target < 1e-9 && Math.abs(r.frame.dist / r.frame.want - 1) < 0.01, `the sphere frames as a ball of radius 1: distance ${r.frame.dist} vs ${r.frame.want}, target off by ${r.frame.target}`);
      assert(r.plane0 < 1e-6, `half-turn 0: stroke on the plane 2X - Z = 1 (residual ${r.plane0})`);
      assert(r.plane1 < 1e-6, `half-turn pi: stroke on the plane 2X + Z = 1 (residual ${r.plane1})`);
      assert(r.stillInput > 0.1, 'after the half-turn the stroke has left the input plane');
    });

    // ---------------------------------------------------------------- S10 no-WebGL state
    await step('S10 no-WebGL state', async () => {
      const r = await page.evaluate(() => {
        const t3 = window.__t3, m = t3.m;
        const host = t3.makeHost({ id: 'three-nogl-host' });
        const before = Array.from(host.attributes).map((a) => a.name + '=' + a.value).sort().join('|');
        let v, threw = null;
        try { v = m.createView3D(host, { forceUnavailable: true, label: 'Test view' }); } catch (e) { threw = String(e); }
        const out = { threw };
        if (v) {
          const st = host.querySelector('.three-status');
          out.unavailable = v.unavailable; out.status = st ? st.textContent : null; out.role = st ? st.getAttribute('role') : null;
          out.nulls = [v.renderer, v.controls, v.canvas].every((x) => x === null);
          out.hasScene = v.scene && v.camera ? true : false;
          out.canvasCount = host.querySelectorAll('canvas').length;
          const mesh = m.modulusLandscape({ f: t3.z2, nx: 8, ny: 8 });
          try { v.add(mesh); v.requestRender(); v.renderNow(); v.fitTo(); v.resetCamera(); v.resize(); v.start(); v.stop(); v.onFrame(() => {})(); v.remove(mesh); v.add(mesh); out.safe = true; } catch (e) { out.safe = String(e); }
          out.sceneHasMesh = v.scene.children.includes(mesh);
          out.registered = window.__mv.views3d.has(v.id);
          v.dispose(); v.dispose();
          out.after = host.children.length;
          out.attrsRestored = Array.from(host.attributes).map((a) => a.name + '=' + a.value).sort().join('|') === before;
          out.unregistered = !window.__mv.views3d.has(v.id);
        }
        host.remove();
        return out;
      });
      assert(r.threw === null, `createView3D threw: ${r.threw}`);
      assert(r.unavailable === true, 'view.unavailable');
      assert(r.status && r.status.startsWith('This 3D view needs WebGL'), `status text: ${r.status}`);
      assert(r.role === 'status', 'status has role=status');
      assert(r.nulls && r.hasScene, 'renderer, controls, canvas are null; scene and camera still exist');
      assert(r.canvasCount === 0, 'no canvas in the unavailable state');
      assert(r.safe === true, `methods are safe no-ops: ${r.safe}`);
      assert(r.sceneHasMesh, 'the scene stays consistent');
      assert(r.registered && r.unregistered, 'registered while alive, removed on dispose');
      assert(r.after === 0, `host should be empty after dispose, has ${r.after} children`);
      assert(r.attrsRestored, 'dispose restores the attributes it set on the container');
    });

    // ---------------------------------------------------------------- S11 disposal and contexts
    await step('S11 disposal and contexts', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m, v = t3.view, host = t3.host;
        const info = v.renderer.info;
        const mesh = m.modulusLandscape({ f: t3.z2, nx: 16, ny: 16 });
        v.add(mesh); v.renderNow();
        const geometriesBefore = info.memory.geometries;
        let twice = null;
        try { v.dispose(); v.dispose(); } catch (e) { twice = String(e); }
        const afterOne = { children: host.children.length, geometries: info.memory.geometries, textures: info.memory.textures };
        const noopsOk = (() => { try { v.add(mesh); v.requestRender(); v.renderNow(); v.fitTo(); v.resetCamera(); return true; } catch (e) { return String(e); } })();
        host.remove();
        const cycles = [];
        for (let i = 0; i < 24; i++) {
          const h = t3.makeHost();
          const vv = m.createView3D(h, { hint: false });
          vv.add(m.modulusLandscape({ f: t3.z2, nx: 24, ny: 24 }));
          vv.renderNow();
          const inf = vv.renderer.info;
          vv.dispose();
          cycles.push({ children: h.children.length, g: inf.memory.geometries, t: inf.memory.textures });
          h.remove();
          await new Promise((res) => requestAnimationFrame(res));
        }
        return { geometriesBefore, twice, afterOne, noopsOk, cycles, views: window.__mv.views3d.size, base: t3.baseViews };
      });
      assert(r.geometriesBefore > 0, 'the view had geometry before disposal');
      assert(r.twice === null, `dispose twice threw ${r.twice}`);
      assert(r.afterOne.children === 0, `container has ${r.afterOne.children} children after dispose`);
      assert(r.afterOne.geometries === 0 && r.afterOne.textures === 0, `info.memory after dispose ${JSON.stringify(r.afterOne)}`);
      assert(r.noopsOk === true, `methods after dispose are no-ops: ${r.noopsOk}`);
      assert(r.cycles.every((c) => c.children === 0 && c.g === 0 && c.t === 0), `a cycle left something behind: ${JSON.stringify(r.cycles.find((c) => c.children || c.g || c.t))}`);
      assert(r.views === r.base, `window.__mv.views3d.size is ${r.views}, expected ${r.base}`);
      const tooMany = messages.filter((x) => /Too many active WebGL contexts/i.test(x.text));
      assert(tooMany.length === 0, `${tooMany.length} 'Too many active WebGL contexts' warnings over 24 create/dispose cycles`);
    });

    // ---------------------------------------------------------------- S12 screenshot gallery
    await step('S12 gallery', async () => {
      await page.evaluate(async () => {
        const t3 = window.__t3;
        t3.gallery = t3.buildGallery(false);
        for (const v of t3.gallery.views) v.renderNow();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 700));
      });
      await shot('gallery');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(overflow <= 1, `horizontal overflow of ${overflow}px`);
      await page.evaluate(async () => {
        const t3 = window.__t3;
        document.documentElement.setAttribute('data-theme', 'dark');
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'dark' } }));
        await new Promise((r) => setTimeout(r, 400));
        for (const v of t3.gallery.views) v.renderNow();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 500));
      });
      await shot('gallery-dark');
      const cov = await page.evaluate(() => {
        const t3 = window.__t3;
        return t3.gallery.views.map((v) => { v.renderNow(); return t3.diffFraction(t3.pixels(v.canvas), 6); });
      });
      assert(cov.every((c) => c > 0.01), `a gallery cell looks empty in dark mode: ${cov.map((c) => c.toFixed(3))}`);
      await page.evaluate(() => {
        const t3 = window.__t3, root = document.documentElement;
        t3.gallery.views.forEach((v) => v.dispose());
        t3.gallery.g.remove();
        if (t3.themeAttr === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t3.themeAttr);
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t3.themeAttr || 'light' } }));
        t3.cleanup();
      });
    });

    // ---------------------------------------------------------------- S13 context lost and restored
    await step('S13 context lost and restored', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const host = t3.makeHost({ id: 'three-ctx-host' });
        const v = m.createView3D(host, { hint: false, background: '#ffffff', grid: false, axes: false });
        v.add(m.modulusLandscape({ f: t3.z2, nx: 24, ny: 24, wire: false }));
        v.renderNow();
        const ext = v.renderer.getContext().getExtension('WEBGL_lose_context');
        ext.loseContext();
        await wait(250);
        const st = host.querySelector('.three-status');
        const lost = { text: st ? st.textContent : null, role: st ? st.getAttribute('role') : null };
        const f0 = v.renderer.info.render.frame;
        v.renderNow();
        const skipped = v.renderer.info.render.frame === f0;
        ext.restoreContext();
        await wait(600);
        const statusGone = !host.querySelector('.three-status');
        v.requestRender();
        await wait(250);
        v.renderNow();
        const frac = t3.diffFraction(t3.pixels(v.canvas));
        const rendered = v.renderer.info.render.frame > f0;
        v.dispose(); host.remove();
        return { lost, skipped, statusGone, frac, rendered };
      });
      assert(r.lost.text && r.lost.text.startsWith('The 3D view paused'), `context-lost text: ${r.lost.text}`);
      assert(r.lost.role === 'status', 'context-lost status has role=status');
      assert(r.skipped, 'no render is attempted while the context is lost');
      assert(r.statusGone, 'the status text goes away when the context is restored');
      assert(r.rendered && r.frac > 0.03, `the view draws again after restore (${(100 * r.frac).toFixed(1)} percent of pixels differ)`);
    });

    // ---------------------------------------------------------------- S14 off-screen views schedule no frames
    await step('S14 off-screen view', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const host = t3.makeHost();
        host.style.top = '5000px';                              // fixed, outside the viewport
        const v = m.createView3D(host, { hint: false });
        v.add(m.modulusLandscape({ f: t3.z2, nx: 16, ny: 16 }));
        await wait(500);
        const a = v.renderer.info.render.frame;
        v.requestRender(); v.requestRender();
        await wait(300);
        const b = v.renderer.info.render.frame;
        host.style.top = '0';                                   // scroll it into view
        await wait(500);
        const c = v.renderer.info.render.frame;
        await wait(300);
        const d = v.renderer.info.render.frame;
        v.dispose(); host.remove();
        return { a, b, c, d };
      });
      assert(r.a <= 1, `an off-screen view rendered ${r.a} frames at start (expected at most the first)`);
      assert(r.b === r.a, `an off-screen view must not render on requestRender (${r.a} -> ${r.b})`);
      assert(r.c > r.b, `one render happens when it becomes visible (${r.b} -> ${r.c})`);
      assert(r.d === r.c, `and then it is idle again (${r.c} -> ${r.d})`);
    });

    // ---------------------------------------------------------------- S15 onFrame
    await step('S15 onFrame callbacks', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const host = t3.makeHost();
        const v = m.createView3D(host, { hint: false });
        await wait(900);                                        // let the loop go dormant first
        const idleFrames = v.renderer.info.render.frame;
        await wait(300);
        const stillIdle = v.renderer.info.render.frame === idleFrames;
        const seen = [];
        const off = v.onFrame((dt, t, view) => { seen.push({ dt, t, same: view === v }); view.requestRender(); });
        const f0 = v.renderer.info.render.frame;
        await wait(400);
        const n1 = seen.length, f1 = v.renderer.info.render.frame;
        off();
        await wait(150);
        const n2 = seen.length;
        await wait(250);
        const n3 = seen.length;
        const errs = [];
        const orig = console.error;
        console.error = (...a) => errs.push(a.map(String).join(' '));
        let thrown = 0;
        v.onFrame(() => { thrown++; throw new Error('boom'); });
        await wait(400);
        console.error = orig;
        const fa = v.renderer.info.render.frame;
        v.requestRender();
        await wait(150);
        const loopAlive = v.renderer.info.render.frame > fa;
        v.dispose(); host.remove();
        return { stillIdle, n1, f1, f0, n2, n3, same: seen.every((x) => x.same && x.dt >= 0 && x.dt <= 0.1), thrown, errs, loopAlive };
      });
      assert(r.stillIdle, 'the loop is dormant with no callback');
      assert(r.n1 >= 5, `onFrame callbacks run every frame (${r.n1} calls in 400 ms)`);
      assert(r.f1 - r.f0 >= 5, `a callback that requests renders gets them (${r.f1 - r.f0})`);
      assert(r.same, 'callback arguments are (dt in 0..0.1, t, view)');
      assert(r.n3 === r.n2, `after unsubscribing no more calls arrive (${r.n2} -> ${r.n3})`);
      assert(r.thrown === 1, `a throwing callback is unsubscribed after one call (${r.thrown})`);
      assert(r.errs.length === 1 && r.errs[0].startsWith('three-view: onFrame callback threw'), `logged once: ${JSON.stringify(r.errs)}`);
      assert(r.loopAlive, 'the loop keeps running after a callback threw');
    });

    // ---------------------------------------------------------------- S16 reduced motion
    await step('S16 reduced motion', async () => {
      const probe = () => page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const host = t3.makeHost();
        const v = m.createView3D(host, { autoRotate: true, hint: true });
        v.add(m.modulusLandscape({ f: t3.z2, nx: 16, ny: 16 }));
        const out = {
          damping: v.controls.enableDamping, rotate: v.controls.autoRotate,
          transition: getComputedStyle(host.querySelector('.three-hint')).transitionDuration,
        };
        const f0 = v.renderer.info.render.frame;
        await wait(400);
        out.framesWhileAutoRotating = v.renderer.info.render.frame - f0;
        t3.view2 = v; t3.host2 = host;
        return out;
      });
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const reduced = await probe();
        assert(reduced.damping === false && reduced.rotate === false, `reduced motion turns damping and autoRotate off ${JSON.stringify(reduced)}`);
        // the app shell may squash every transition to 1e-5s instead of 0s; both mean "no visible fade"
        const seconds = (d) => (/ms$/.test(d) ? parseFloat(d) / 1000 : parseFloat(d));
        assert(seconds(reduced.transition) <= 0.001, `hint has no visible transition under reduced motion (${reduced.transition})`);
        await page.evaluate(() => { window.__t3.view2.dispose(); window.__t3.host2.remove(); });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const normal = await probe();
        assert(normal.damping === true && normal.rotate === true, `without the preference damping and autoRotate are on ${JSON.stringify(normal)}`);
        assert(normal.framesWhileAutoRotating >= 5, `autoRotate keeps rendering (${normal.framesWhileAutoRotating} frames in 400 ms)`);
        // the preference changing while mounted is picked up
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await sleep(200);
        const live = await page.evaluate(() => ({ damping: window.__t3.view2.controls.enableDamping, rotate: window.__t3.view2.controls.autoRotate }));
        assert(live.damping === false && live.rotate === false, `a live change is honoured ${JSON.stringify(live)}`);
      } finally {
        await page.emulateMedia({ reducedMotion: null });
        await page.evaluate(() => { const t3 = window.__t3; if (t3.view2) { t3.view2.dispose(); t3.host2.remove(); t3.view2 = null; } });
      }
    });

    // ---------------------------------------------------------------- S17 coarse pointer and hint
    await step('S17 coarse pointer and hint', async () => {
      const r = await page.evaluate(() => {
        const t3 = window.__t3, m = t3.m;
        const orig = window.matchMedia;
        const out = {};
        const make = () => {
          const host = t3.makeHost({ id: 'three-hint-host' });
          const v = m.createView3D(host, {});
          const hint = host.querySelector('.three-hint');
          const res = {
            touchAction: v.canvas.style.touchAction, hint: hint.textContent, hintId: hint.id,
            describedby: host.getAttribute('aria-describedby'), hidden0: hint.getAttribute('data-hidden'),
          };
          host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          res.hidden1 = hint.getAttribute('data-hidden');
          res.stillInDom = !!host.querySelector('#three-hint-host-hint');
          v.dispose(); host.remove();
          return res;
        };
        window.matchMedia = (q) => (String(q).includes('pointer: coarse')
          ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
          : orig.call(window, q));
        try { out.coarse = make(); } finally { window.matchMedia = orig; }
        out.fine = make();
        return out;
      });
      assert(r.coarse.touchAction === 'pan-y', `coarse pointer: touch-action ${r.coarse.touchAction}`);
      assert(r.coarse.hint === 'Swipe sideways to turn. Pinch to zoom. Swipe up or down to scroll the page.', `coarse hint: ${r.coarse.hint}`);
      assert(r.fine.touchAction === 'none', `fine pointer: touch-action ${r.fine.touchAction}`);
      assert(r.fine.hint === 'Drag to turn. Click the view, then scroll to zoom. Arrow keys turn, + and - zoom, 0 resets.', `fine hint: ${r.fine.hint}`);
      for (const k of ['coarse', 'fine']) {
        assert(r[k].describedby === r[k].hintId, `${k}: aria-describedby points at the hint`);
        assert(r[k].hidden0 === null && r[k].hidden1 === 'true' && r[k].stillInDom, `${k}: the hint hides on first pointerdown and stays in the DOM`);
      }
    });

    // ---------------------------------------------------------------- S18 helix floor point keeps the --cart colour
    // Review fix 1. The point z on the helix floor must read as --cart whatever the helicoid sheets do above or below it:
    // for Arg z > 0 the sheets are above it, for Arg z < 0 below, on the positive real axis the larger home bead sits on it.
    await step('S18 helix floor point keeps the --cart colour', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m, root = document.documentElement;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const rgbOf = (css) => {
          const c = document.createElement('canvas'); c.width = c.height = 1;
          const x = c.getContext('2d'); x.fillStyle = css; x.fillRect(0, 0, 1, 1);
          return Array.from(x.getImageData(0, 0, 1, 1).data).slice(0, 3);
        };
        const probe = document.createElement('canvas');
        const host = t3.makeHost();
        const v = m.createView3D(host, { grid: false, axes: false, hint: false, background: '#ffffff' });
        const h = m.argHelix({ z: { re: -1, im: Math.sqrt(3) }, turns: 3 });
        v.add(h.group);
        const target = v.controls.target.clone(), dist0 = v.camera.position.distanceTo(target), home = v.camera.position.clone();
        const pose = (az, phi) => {
          if (az === null) v.camera.position.copy(home);
          else v.camera.position.set(target.x + dist0 * Math.sin(phi) * Math.sin(az), target.y + dist0 * Math.cos(phi), target.z + dist0 * Math.sin(phi) * Math.cos(az));
          v.camera.lookAt(target);
          v.camera.updateMatrixWorld();
        };
        const readAt = () => {
          v.renderNow();
          const W = v.canvas.width, H = v.canvas.height;
          probe.width = W; probe.height = H;
          const ctx = probe.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(v.canvas, 0, 0);
          const p = h.group.userData.floorPoint.getWorldPosition(new m.THREE.Vector3()).project(v.camera);
          const x = Math.round((p.x * 0.5 + 0.5) * W), y = Math.round((-p.y * 0.5 + 0.5) * H);
          if (x < 0 || y < 0 || x >= W || y >= H) return null;
          return Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3);
        };
        const zs = [['-1+i sqrt3 (Arg > 0)', { re: -1, im: Math.sqrt(3) }], ['1.2-1.2i (Arg < 0)', { re: 1.2, im: -1.2 }],
          ['1 (Arg = 0)', { re: 1, im: 0 }], ['-2 (Arg = pi)', { re: -2, im: 0 }], ['0.5i', { re: 0, im: 0.5 }],
          ['-0.5-i', { re: -0.5, im: -1 }], ['0.3+0.1i', { re: 0.3, im: 0.1 }]];
        const poses = [[null, 0], [0.8, 1.1], [2.4, 0.9], [4.0, 0.2], [1.0, 2.3]];   // default, two oblique, near top-down, from below
        const results = [];
        try {
          for (const theme of ['light', 'dark']) {
            root.setAttribute('data-theme', theme);
            document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
            await wait(150);
            const want = rgbOf(getComputedStyle(root).getPropertyValue('--cart').trim());
            for (const [pi, [az, phi]] of poses.entries()) {
              pose(az, phi);
              for (const [name, z] of zs) {
                h.update(z);
                results.push({ theme, pose: pi, z: name, px: readAt(), want });
              }
            }
          }
        } finally {
          if (t3.themeAttr === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t3.themeAttr);
          v.dispose(); host.remove();
        }
        return results;
      });
      let worst = null;
      for (const x of r) {
        assert(x.px !== null, `${x.z}, pose ${x.pose}, ${x.theme}: the point is outside the canvas`);
        const d = Math.max(...x.px.map((c, i) => Math.abs(c - x.want[i])));
        if (!worst || d > worst.d) worst = { d, ...x };
      }
      assert(worst.d <= 14, `the floor point at ${worst.z}, pose ${worst.pose}, ${worst.theme} reads ${worst.px}, --cart is ${worst.want} (off by ${worst.d})`);
      log(`   ${r.length} readings of the floor point, worst channel error ${worst.d}`);
    });

    // ---------------------------------------------------------------- S19 Reset right after a drag
    // Review fix 2. OrbitControls.reset() leaves the damping residue behind, so Reset pressed soon after a drag let the
    // picture creep away from the saved pose again.
    await step('S19 Reset view right after a drag', async () => {
      await page.evaluate(() => {
        const t3 = window.__t3;
        const host = t3.makeHost({ id: 'three-reset-host' });
        t3.rHost = host;
        t3.rView = t3.m.createView3D(host, {});
        t3.rView.add(t3.m.modulusLandscape({ f: t3.z2 }));
      });
      await sleep(200);
      const geo = await page.evaluate(() => {
        const r = document.getElementById('three-reset-host').getBoundingClientRect();
        const b = document.getElementById('three-reset-host-reset').getBoundingClientRect();
        const v = window.__t3.rView;
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, bx: b.left + b.width / 2, by: b.top + b.height / 2, damping: v.controls.enableDamping };
      });
      assert(geo.damping === true, 'damping is on (the residue only exists with damping)');
      const drift = () => page.evaluate(() => { const v = window.__t3.rView; return v.camera.position.distanceTo(v.controls.position0) + v.controls.target.distanceTo(v.controls.target0); });
      for (const gapMs of [50, 300]) {
        await page.mouse.move(geo.cx - 75, geo.cy);
        await page.mouse.down();
        for (let i = 1; i <= 6; i++) { await page.mouse.move(geo.cx - 75 + 150 * i / 6, geo.cy + 5 * i / 6); await sleep(40); }
        await page.mouse.up();
        const moved = await drift();
        assert(moved > 1, `the drag turned the view (${moved})`);
        await sleep(gapMs);
        await page.mouse.click(geo.bx, geo.by);
        await sleep(500);
        const d1 = await drift();
        await sleep(700);
        const d2 = await drift();
        assert(d1 < 1e-6, `${gapMs} ms after the drag, 500 ms after Reset the camera is ${d1} away from the saved pose (it must be 0)`);
        assert(d2 < 1e-6, `and 1200 ms after Reset it is still ${d2} away`);
      }
      // the 0 key does the same, and damping is back on afterwards
      await page.evaluate(() => window.__t3.rHost.focus());
      await page.mouse.move(geo.cx - 75, geo.cy + 40);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) { await page.mouse.move(geo.cx - 75 + 150 * i / 6, geo.cy + 40); await sleep(40); }
      await page.mouse.up();
      await page.evaluate(() => window.__t3.rHost.focus());
      await page.keyboard.press('0');
      await sleep(600);
      assert(await drift() < 1e-6, 'the 0 key also leaves no creep');
      const damping = await page.evaluate(() => window.__t3.rView.controls.enableDamping);
      assert(damping === true, 'damping is switched back on after a reset');
      await page.evaluate(() => { const t3 = window.__t3; t3.rView.dispose(); t3.rHost.remove(); });
    });

    // ---------------------------------------------------------------- S20 the hint leaves room for the picture
    // Review fix 3. With the default hint the picture is framed above the hint, as in the design wireframes 2.1 and 2.2.
    await step('S20 the hint does not cover the picture', async () => {
      const r = await page.evaluate(() => {
        const t3 = window.__t3, m = t3.m, THREE = m.THREE;
        const out = [];
        const extent = (v, host, obj) => {
          const pts = [];
          if (obj.userData.frameRadius) {
            const R = obj.userData.frameRadius, c = obj.getWorldPosition(new THREE.Vector3()), n = 2000;
            for (let i = 0; i < n; i++) {
              const y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), th = i * 2.399963;
              pts.push(new THREE.Vector3(c.x + R * rr * Math.cos(th), c.y + R * y, c.z + R * rr * Math.sin(th)));
            }
          } else {
            const b = new THREE.Box3().setFromObject(obj);
            for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) pts.push(new THREE.Vector3(x, y, z));
          }
          let top = 1e9, bottom = -1e9, left = 1e9, right = -1e9;
          for (const p of pts) {
            p.project(v.camera);
            const x = (p.x * 0.5 + 0.5) * host.clientWidth, y = (-p.y * 0.5 + 0.5) * host.clientHeight;
            top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
          }
          return { top, bottom, left, right };
        };
        for (const [W, H] of [[358, 269], [400, 300], [560, 420]]) {
          for (const kind of ['sphere', 'landscape', 'helix']) {
            const host = t3.makeHost({ width: W + 'px', height: H });
            const v = m.createView3D(host, { grid: false, axes: false, background: '#ffffff' });      // the hint is on by default
            const obj = kind === 'sphere' ? m.riemannSphere().group
              : kind === 'landscape' ? m.modulusLandscape({ f: t3.z2 }) : m.argHelix({ z: { re: -1, im: Math.sqrt(3) }, turns: 3 }).group;
            v.add(obj);
            v.renderNow();
            const hint = host.querySelector('.three-hint');
            const e = extent(v, host, obj);
            const row = { W, H, kind, hintTop: hint.offsetTop, hintH: hint.offsetHeight, cw: host.clientWidth, ch: host.clientHeight, ...e };
            // the hint fades on first use: the picture must not jump under the student's hand
            const before = v.camera.projectionMatrix.toArray().join(',') + '|' + v.camera.position.toArray().join(',');
            host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            v.renderNow();
            row.hidden = hint.getAttribute('data-hidden');
            row.stable = before === v.camera.projectionMatrix.toArray().join(',') + '|' + v.camera.position.toArray().join(',');
            // a later fitTo, with the hint gone, frames the whole view again (no leftover shift)
            v.fitTo();
            row.viewShift = v.camera.view && v.camera.view.enabled ? v.camera.view.offsetY : 0;
            const after = extent(v, host, obj);
            row.refit = { top: after.top, bottom: after.bottom };
            out.push(row);
            v.dispose(); host.remove();
          }
        }
        return out;
      });
      for (const x of r) {
        const tag = `${x.kind} in ${x.W}x${x.H} (hint ${x.hintH}px high at y=${x.hintTop})`;
        assert(x.hintH > 0 && x.hintTop > 0, `${tag}: the hint is laid out`);
        assert(x.bottom <= x.hintTop - 4, `${tag}: the picture reaches y=${x.bottom.toFixed(1)}, into the hint that starts at y=${x.hintTop}`);
        assert(x.top >= 0 && x.left >= 0 && x.right <= x.cw, `${tag}: the picture leaves the view (${x.top.toFixed(1)}, ${x.left.toFixed(1)}, ${x.right.toFixed(1)} of ${x.cw})`);
        assert(x.hidden === 'true' && x.stable, `${tag}: the hint hides and the picture stays put (${x.hidden}, stable ${x.stable})`);
        assert(x.viewShift === 0, `${tag}: refit with no hint leaves a view shift of ${x.viewShift}`);
        assert(x.refit.bottom > x.bottom, `${tag}: refit with no hint uses the freed space (${x.bottom.toFixed(1)} -> ${x.refit.bottom.toFixed(1)})`);
        if (x.kind === 'sphere') assert(Math.abs((x.refit.top + x.refit.bottom) / 2 - x.ch / 2) < 4, `${tag}: refit centres the sphere (${((x.refit.top + x.refit.bottom) / 2).toFixed(1)} of ${x.ch})`);
      }
      log(`   picture bottoms vs hint tops: ${r.map((x) => `${x.kind}@${x.W}: ${x.bottom.toFixed(0)}<${x.hintTop}`).join(', ')}`);
      // the S12 gallery again, with the default hints on, for the screenshot
      await page.evaluate(async () => {
        const t3 = window.__t3;
        t3.hintGallery = t3.buildGallery(true);
        for (const v of t3.hintGallery.views) v.renderNow();
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        await new Promise((res) => setTimeout(res, 600));
      });
      await shot('gallery-hint');
      await page.evaluate(() => { const t3 = window.__t3; t3.hintGallery.views.forEach((v) => v.dispose()); t3.hintGallery.g.remove(); t3.hintGallery = null; });
    });

    // ---------------------------------------------------------------- S21 the container id
    // Review fix 4. Design 2.3: the container's id is uid.
    await step('S21 the container carries the view id', async () => {
      const r = await page.evaluate(() => {
        const t3 = window.__t3, m = t3.m;
        const out = {};
        const a = t3.makeHost();
        out.hadId = a.hasAttribute('id');
        const va = m.createView3D(a, { hint: false });
        out.a = { id: a.id, viewId: va.id, found: document.getElementById(va.id) === a, canvas: va.canvas.id, reset: !!a.querySelector('#' + va.id + '-reset') };
        va.dispose();
        out.a.after = a.hasAttribute('id');
        const b = t3.makeHost();
        const vb = m.createView3D(b, { forceUnavailable: true });
        out.b = { id: b.id, viewId: vb.id, status: !!b.querySelector('#' + vb.id + '-status') };
        vb.dispose();
        out.b.after = b.hasAttribute('id');
        const c = t3.makeHost({ id: 'my-own-id' });
        const vc = m.createView3D(c, { hint: false });
        out.c = { id: c.id, viewId: vc.id };
        vc.dispose();
        out.c.after = c.id;
        t3.cleanup();
        return out;
      });
      assert(r.hadId === false, 'the test host starts without an id');
      assert(/^three-view-\d+$/.test(r.a.id) && r.a.id === r.a.viewId, `container.id ${r.a.id} equals view.id ${r.a.viewId}`);
      assert(r.a.found && r.a.canvas === r.a.id + '-canvas' && r.a.reset, 'the children ids derive from the container id');
      assert(r.a.after === false, 'dispose removes the generated id again');
      assert(r.b.id === r.b.viewId && r.b.status && r.b.after === false, `the unavailable state too: ${JSON.stringify(r.b)}`);
      assert(r.c.id === 'my-own-id' && r.c.viewId === 'my-own-id' && r.c.after === 'my-own-id', `an id the container already has is kept: ${JSON.stringify(r.c)}`);
    });

    // ---------------------------------------------------------------- S22 axis label halo and the seam over the axis
    // Review fix 7.
    await step('S22 axis label halo and the seam strip', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m, root = document.documentElement, THREE = m.THREE;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const rgbOf = (css) => {
          const c = document.createElement('canvas'); c.width = c.height = 1;
          const x = c.getContext('2d'); x.fillStyle = css; x.fillRect(0, 0, 1, 1);
          return Array.from(x.getImageData(0, 0, 1, 1).data).slice(0, 3);
        };
        const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        const out = { halo: [], seam: null };
        const host = t3.makeHost();
        const v = m.createView3D(host, { background: '--surface', hint: false, axisLabels: ['Re z', 'Im z', '|w|'] });
        try {
          for (const theme of ['light', 'dark']) {
            root.setAttribute('data-theme', theme);
            document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
            await wait(150);
            const surface = rgbOf(getComputedStyle(root).getPropertyValue('--surface').trim());
            const labels = v.scene.getObjectByName('furniture').children.filter((o) => o.userData.kind === 'label');
            for (const sprite of labels) {
              const cvs = sprite.material.map.image;
              const d = cvs.getContext('2d').getImageData(0, 0, cvs.width, cvs.height).data;
              let halo = 0, text = 0;
              for (let i = 0; i < d.length; i += 4) {
                const near = dist([d[i], d[i + 1], d[i + 2]], surface);
                if (d[i + 3] >= 120 && near < 30) halo++;
                else if (d[i + 3] >= 240 && near > 60) text++;
              }
              out.halo.push({ theme, label: sprite.userData.text, halo, text });
            }
          }
        } finally {
          if (t3.themeAttr === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t3.themeAttr);
          document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t3.themeAttr || 'light' } }));
          v.dispose(); host.remove();
        }
        // the seam strip must read over the axis line (default seam -pi lies along the -x axis)
        const host2 = t3.makeHost();
        const v2 = m.createView3D(host2, { grid: false, axes: true, hint: false, background: '#ffffff' });
        const h = m.argHelix({ z: { re: 1, im: 1 }, turns: 2 });
        const u = h.group.userData;
        for (const o of [u.homeSheet, u.ghostSheet, u.riser, u.floor, u.floorPoint, u.axis, ...u.beads]) o.visible = false;
        v2.add(h.group);
        const tg = v2.controls.target.clone(), d0 = v2.camera.position.distanceTo(tg);
        v2.camera.position.set(tg.x + d0 * Math.sin(0.6) * Math.sin(0.4), tg.y + d0 * Math.cos(0.6), tg.z + d0 * Math.sin(0.6) * Math.cos(0.4));
        v2.camera.lookAt(tg);
        v2.camera.updateMatrixWorld();
        v2.renderNow();
        const probe = document.createElement('canvas');
        probe.width = v2.canvas.width; probe.height = v2.canvas.height;
        const ctx = probe.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(v2.canvas, 0, 0);
        const p = new THREE.Vector3(-0.46, 0.004, 0).project(v2.camera);      // the middle of the dash from 0.40 to 0.52 along -x
        const cx = Math.round((p.x * 0.5 + 0.5) * probe.width), cy = Math.round((-p.y * 0.5 + 0.5) * probe.height);
        const seam = rgbOf(getComputedStyle(root).getPropertyValue('--seam').trim()), cart = rgbOf(getComputedStyle(root).getPropertyValue('--cart').trim());
        let best = null;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const px = Array.from(ctx.getImageData(cx + dx, cy + dy, 1, 1).data).slice(0, 3);
          if (!best || dist(px, seam) < dist(best, seam)) best = px;
        }
        out.seam = { px: best, dSeam: dist(best, seam), dCart: dist(best, cart), seam, cart };
        v2.dispose(); host2.remove();
        return out;
      });
      for (const x of r.halo) {
        assert(x.halo >= 25 && x.text >= 25, `label "${x.label}" (${x.theme}): ${x.halo} halo pixels and ${x.text} text pixels (a halo in the background colour and the text itself are both expected)`);
      }
      assert(r.seam.dSeam < 40 && r.seam.dSeam < r.seam.dCart / 2, `the seam strip over the -x axis reads ${r.seam.px}, --seam is ${r.seam.seam}, --cart is ${r.seam.cart}`);
    });

    // ---------------------------------------------------------------- S23 the hint goes when the view is used, not when the page is
    // Residue C2 (wave 0, 103): a wheel that only scrolls the page past the view, Tab and a key the view ignores no longer hide the hint.
    await step('S23 the hint stays through a page scroll, Tab and unused keys, and goes when the view is used', async () => {
      const r = await page.evaluate(() => {
        const t3 = window.__t3, m = t3.m;
        const out = {};
        const fresh = (id) => {
          const host = t3.makeHost({ id });
          const v = m.createView3D(host, {});
          const hint = host.querySelector('.three-hint');
          return { host, v, hidden: () => hint.getAttribute('data-hidden') === 'true' };
        };
        const wheel = (host, extra = {}) => host.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true, ...extra }));
        const key = (host, k, extra = {}) => host.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra }));
        const run = (name, setup) => {
          const f = fresh('three-hint-' + name);
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
          out[name + '0'] = f.hidden();
          setup(f.host);
          out[name] = f.hidden();
          f.v.dispose(); f.host.remove();
        };
        run('pageWheel', (h) => wheel(h));                                    // unfocused: the page scrolls
        run('tab', (h) => { h.focus(); key(h, 'Tab'); });
        run('shift', (h) => { h.focus(); key(h, 'Shift', { shiftKey: true }); });
        run('unused', (h) => { h.focus(); key(h, 'q'); });
        run('ctrlA', (h) => { h.focus(); key(h, 'a', { ctrlKey: true }); });
        run('arrow', (h) => { h.focus(); key(h, 'ArrowRight'); });
        run('plus', (h) => { h.focus(); key(h, '+'); });
        run('zero', (h) => { h.focus(); key(h, '0'); });
        run('focusedWheel', (h) => { h.focus(); wheel(h); });
        run('ctrlWheel', (h) => wheel(h, { ctrlKey: true }));
        run('pointer', (h) => h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
        return out;
      });
      for (const k of ['pageWheel', 'tab', 'shift', 'unused', 'ctrlA', 'arrow', 'plus', 'zero', 'focusedWheel', 'ctrlWheel', 'pointer']) assert(r[k + '0'] === false, `${k}: the hint starts visible`);
      for (const k of ['pageWheel', 'tab', 'shift', 'unused', 'ctrlA']) assert(r[k] === false, `${k} leaves the hint alone`);
      for (const k of ['arrow', 'plus', 'zero', 'focusedWheel', 'ctrlWheel', 'pointer']) assert(r[k] === true, `${k} hides the hint (the view was used)`);
    });

    // ---------------------------------------------------------------- S24 a lost context lets the loop go dormant
    // Residue C2 (wave 0, 101): renderNow() used to return early without clearing needsRender, so the rAF loop ran on until a restore.
    await step('S24 a lost context lets the render loop go dormant', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const host = t3.makeHost({ id: 'three-dormant-host' });
        const v = m.createView3D(host, { hint: false, background: '#ffffff', grid: false, axes: false });
        v.add(m.modulusLandscape({ f: t3.z2, nx: 24, ny: 24, wire: false }));
        v.renderNow();
        const ext = v.renderer.getContext().getExtension('WEBGL_lose_context');
        ext.loseContext();
        await wait(200);
        v.requestRender();                                       // a change while the context is lost: needsRender is now true
        await wait(1500);                                        // longer than the 45 idle frames
        const orig = window.requestAnimationFrame;
        let scheduled = 0;
        window.requestAnimationFrame = (cb) => { scheduled++; return orig.call(window, cb); };
        await wait(700);
        window.requestAnimationFrame = orig;
        const f0 = v.renderer.info.render.frame;
        ext.restoreContext();
        await wait(600);
        v.requestRender();
        await wait(300);
        v.renderNow();
        const frac = t3.diffFraction(t3.pixels(v.canvas));
        const drew = v.renderer.info.render.frame > f0;
        v.dispose(); host.remove();
        return { scheduled, frac, drew };
      });
      assert(r.scheduled <= 2, `the loop asked for ${r.scheduled} animation frames in 700 ms while the context was lost (expected none)`);
      assert(r.drew && r.frac > 0.03, `and the view draws again after the restore (${(100 * r.frac).toFixed(1)} percent of pixels differ)`);
    });

    // ---------------------------------------------------------------- S25 renderNow draws an off-screen view
    // Residue C2 (wave 1, powermap-reciprocal): an off-screen view does not render by itself (S14), renderNow() is how a script or a
    // full-page screenshot gets a current picture.
    await step('S25 renderNow() draws a view that is off screen', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const host = t3.makeHost();
        host.style.top = '5000px';                               // fixed, outside the viewport
        const v = m.createView3D(host, { hint: false, background: '#ffffff', grid: false, axes: false });
        const s = m.riemannSphere();
        v.add(s.group);
        await wait(500);
        const a = v.renderer.info.render.frame;
        s.addCurve(t3.circlePts(), '--input', { lineWidth: 0.04 });   // a change while off screen: no frame comes of it
        await wait(300);
        const b = v.renderer.info.render.frame;
        v.renderNow();
        const c = v.renderer.info.render.frame;
        const frac = t3.diffFraction(t3.pixels(v.canvas));
        const stillIdle = (await wait(300), v.renderer.info.render.frame);
        v.dispose(); host.remove();
        return { a, b, c, frac, stillIdle };
      });
      assert(r.b === r.a, `an off-screen view does not render on its own (${r.a} -> ${r.b})`);
      assert(r.c === r.b + 1, `renderNow() draws one frame at once (${r.b} -> ${r.c})`);
      assert(r.frac > 0.05, `and the canvas holds the sphere (${(100 * r.frac).toFixed(1)} percent of pixels differ from the background)`);
      assert(r.stillIdle === r.c, 'the loop stays asleep afterwards');
    });

    // ---------------------------------------------------------------- S26 the hint inset is measured again after a resize
    // Residue C2 (wave 0, 104): the picture's shift for the hint used to stay as fitTo measured it when the hint re-wrapped.
    await step('S26 a resize re-measures the room the hint takes', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const host = t3.makeHost({ id: 'three-inset-host', width: '300px', height: 300 });
        const v = m.createView3D(host, { grid: false, axes: false });
        const hint = host.querySelector('.three-hint');
        v.add(m.riemannSphere().group);                          // frames itself: the shift is measured now
        await wait(400);
        const offset = () => (v.camera.view && v.camera.view.enabled ? v.camera.view.offsetY : 0);
        const expected = () => Math.min(hint.offsetHeight + 14, 0.4 * host.clientHeight) / 2;
        const out = { narrow: { shift: offset(), expected: expected(), h: hint.offsetHeight } };
        host.style.width = '760px';                              // the hint now fits on fewer lines
        await wait(500);
        out.wide = { shift: offset(), expected: expected(), h: hint.offsetHeight };
        host.style.width = '300px';
        await wait(500);
        out.narrowAgain = { shift: offset(), expected: expected(), h: hint.offsetHeight };
        // once the hint is hidden the picture keeps its place: a resize leaves the shift alone
        host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        const before = offset();
        host.style.width = '760px';
        await wait(500);
        out.hidden = { before, after: offset() };
        v.dispose(); host.remove();
        return out;
      });
      assert(r.narrow.h > r.wide.h, `the hint wraps onto fewer lines when wider (${r.narrow.h} px -> ${r.wide.h} px)`);
      for (const k of ['narrow', 'wide', 'narrowAgain']) assert(Math.abs(r[k].shift - r[k].expected) <= 1, `${k}: shift ${r[k].shift} against the hint's ${r[k].expected}`);
      assert(Math.abs(r.wide.shift - r.narrow.shift) >= 3, `the shift followed the hint (${r.narrow.shift} -> ${r.wide.shift})`);
      assert(r.hidden.after === r.hidden.before, `a hidden hint leaves the shift where it was (${r.hidden.before} -> ${r.hidden.after})`);
    });

    // ---------------------------------------------------------------- S27 riemannSphere({ frameLabels }) frames the infinity label
    // Residue C2 (wave 1, lab): fitTo(group) framed the ball only, the infinity label (1.14 R) was outside, and every caller padded 1.25.
    await step('S27 frameLabels: fitTo at padding 1.0 frames the labels, the ball is an exact fit without it', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m, THREE = m.THREE;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const out = [];
        for (const hint of [false, true]) {
          for (const h of [220, 300, 420]) {
            for (const frameLabels of [false, true]) {
              const host = t3.makeHost({ width: '360px', height: h });
              const v = m.createView3D(host, { grid: false, axes: false, hint, background: '#ffffff' });
              const s = m.riemannSphere({ frameLabels });
              v.add(s.group);
              v.fitTo(s.group, { padding: 1.0 });
              v.camera.updateMatrixWorld();
              const ndc = (p) => p.clone().project(v.camera);
              let ballX = 0, ballY = 0;
              for (let i = 0; i < 60; i++) for (let j = 0; j < 120; j++) {
                const th = Math.PI * i / 59, ph = 2 * Math.PI * j / 120;
                const q = ndc(new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)));
                ballX = Math.max(ballX, Math.abs(q.x)); ballY = Math.max(ballY, Math.abs(q.y));
              }
              const inf = s.group.userData.labels.find((l) => l.userData.text === '∞');
              const q = ndc(inf.getWorldPosition(new THREE.Vector3()));
              await wait(120);
              v.renderNow();
              const img = t3.pixels(v.canvas);
              // the outer rows and columns of the canvas hold nothing but the background (the free part ends at the hint, so the bottom rows only without it)
              const bg = [img.data[0], img.data[1], img.data[2]];
              const stray = (x, y) => { const i = (y * img.width + x) * 4; return Math.abs(img.data[i] - bg[0]) + Math.abs(img.data[i + 1] - bg[1]) + Math.abs(img.data[i + 2] - bg[2]) > 12; };
              let edge = 0;
              for (let x = 0; x < img.width; x++) for (const y of [0, 1]) if (stray(x, y)) edge++;
              for (let y = 0; y < img.height; y++) for (const x of [0, 1, img.width - 2, img.width - 1]) if (stray(x, y)) edge++;
              if (!hint) for (let x = 0; x < img.width; x++) for (const y of [img.height - 2, img.height - 1]) if (stray(x, y)) edge++;
              // the label's glyph: pixels well away from the (white) background in a box around its projected centre (the label is light in the dark theme, so "dark" would miss it)
              const px = Math.round((q.x * 0.5 + 0.5) * img.width), py = Math.round((-q.y * 0.5 + 0.5) * img.height);
              let glyph = 0;
              for (let y = py - 9; y <= py + 9; y++) for (let x = px - 12; x <= px + 12; x++) if (x >= 0 && y >= 0 && x < img.width && y < img.height) { const i = (y * img.width + x) * 4; if (Math.abs(img.data[i] - bg[0]) + Math.abs(img.data[i + 1] - bg[1]) + Math.abs(img.data[i + 2] - bg[2]) > 120) glyph++; }
              out.push({ hint, h, frameLabels, ballX, ballY, infY: q.y, edge, glyph, frameRadius: s.group.userData.frameRadius });
              v.dispose(); host.remove();
            }
          }
        }
        return out;
      });
      for (const x of r) {
        const tag = `hint ${x.hint}, ${x.h} px, frameLabels ${x.frameLabels}`;
        assert(x.ballX <= 1.002 && x.ballY <= 1.002, `${tag}: the ball is inside the view at padding 1.0 (|NDC| ${x.ballX.toFixed(3)}, ${x.ballY.toFixed(3)})`);
        if (x.frameLabels) {
          assert(x.frameRadius === 1.2 && x.infY < 0.97, `${tag}: the infinity label (centre NDC y ${x.infY.toFixed(3)}) is inside the frame`);
          assert(x.edge === 0 && x.glyph >= 4, `${tag}: nothing touches the edge of the canvas (${x.edge} stray pixels) and the ∞ glyph is drawn (${x.glyph} pixels)`);
        } else {
          assert(x.frameRadius === 1 && Math.max(x.ballX, x.ballY) > 0.998, `${tag}: without it the ball is an exact fit, tangent to the narrower side (|NDC| ${x.ballX.toFixed(4)}, ${x.ballY.toFixed(4)})`);
          if (x.ballY > 0.998) assert(x.infY > 1.05, `${tag}: and the label (${x.infY.toFixed(3)}) is outside it, which is why callers padded`);   // height-limited views only: a tall one has room to spare
        }
      }
      log(`frameLabels framing (label centre NDC y, glyph pixels): ${r.filter((x) => x.frameLabels).map((x) => `${x.h}${x.hint ? 'h' : ''}: ${x.infY.toFixed(2)}, ${x.glyph}`).join('; ')}`);
    });

    // ---------------------------------------------------------------- S28 sphere curves: round dots, tubes, the ramp weight (pixels)
    await step('S28 sphere dots are round, a tube is wider than a line, rampWeight keeps the family colour', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const out = {};
        const make = () => {
          const host = t3.makeHost({ width: '400px', height: 300 });
          const v = m.createView3D(host, { grid: false, axes: false, hint: false, autoFrame: false, background: '#ffffff', cameraPosition: [0, 0, 3] });
          const s = m.riemannSphere();
          for (const o of s.group.children) if (/^sphere-(parallel|meridian|equator|real|imag)/.test(o.name)) o.visible = false;   // the graticule off: only the curve is left
          s.group.getObjectByName('sphere-body').visible = false;
          v.add(s.group);
          return { host, v, s };
        };
        const pixelsOf = (v) => { v.camera.updateMatrixWorld(); v.renderNow(); return t3.pixels(v.canvas); };
        const dark = (img, x, y) => { const i = (y * img.width + x) * 4; return img.data[i] < 150 || img.data[i + 1] < 150 || img.data[i + 2] < 150; };
        // the arc of the unit circle from 1 to i seen from +x, +y (scene): looking at the middle of it
        const arc = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ re: Math.cos(t * Math.PI / 2), im: Math.sin(t * Math.PI / 2), t }));
        // 1. dots: hide the curve's own line, keep its dots, and measure the shape of the dot at t = 1/2
        {
          const { host, v, s } = make();
          const c = s.addCurve(arc, '--input');
          c.material.visible = false;
          const mid = s.project({ re: Math.SQRT1_2, im: Math.SQRT1_2 }).multiplyScalar(1.004);
          v.camera.position.copy(mid).multiplyScalar(3); v.camera.lookAt(0, 0, 0);
          const img = pixelsOf(v);
          let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
          for (let y = 140; y <= 160; y++) for (let x = 190; x <= 210; x++) if (dark(img, x, y)) { n++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
          out.dot = { n, w: maxX - minX + 1, h: maxY - minY + 1, fill: n / ((maxX - minX + 1) * (maxY - minY + 1)), corners: [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]].map(([x, y]) => dark(img, x, y)) };
          v.dispose(); host.remove();
        }
        // 2. a tube is wider than a one-pixel line: scan across the arc's middle
        for (const [name, lineWidth] of [['line', 0], ['tube', 0.05]]) {
          const { host, v, s } = make();
          const c = s.addCurve(arc, '--input', { lineWidth });
          if (c.userData.dots) c.userData.dots.visible = false;
          const mid = s.project({ re: Math.SQRT1_2, im: Math.SQRT1_2 }).multiplyScalar(1.004);
          v.camera.position.copy(mid).multiplyScalar(3); v.camera.lookAt(0, 0, 0);
          const img = pixelsOf(v);
          // the arc runs along the scene's diagonal in the picture: measure across it on the horizontal and the vertical, take the narrower
          const run = (dx, dy) => { let best = 0, k = 0; for (let t = -40; t <= 40; t++) { if (dark(img, 200 + dx * t, 150 + dy * t)) { k++; best = Math.max(best, k); } else k = 0; } return best; };
          out[name] = Math.min(run(1, 0), run(0, 1));
          v.dispose(); host.remove();
        }
        // 3. a heavy ramp (the old default, 0.65) turns an orange stroke brown at t = 0; the default (0.4) keeps more of it; a lighter weight keeps it orange
        {
          const { host, v, s } = make();
          const colourAt = (opts) => {
            const c = s.addCurve(arc, '--polar', { lineWidth: 0.05, ...opts });
            c.userData.dots.visible = false;
            const col = c.geometry.getAttribute('color');
            const lin = (x) => (x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
            const rgb = [col.getX(0), col.getY(0), col.getZ(0)].map(lin).map((x) => Math.round(255 * x));
            s.clearCurves();
            return rgb;
          };
          out.polar = Array.from(getComputedStyle(document.documentElement).getPropertyValue('--polar').trim().match(/[0-9a-f]{2}/gi) || []).map((h) => parseInt(h, 16));
          out.def = colourAt({});
          out.heavy = colourAt({ rampWeight: 0.65 });
          out.light = colourAt({ rampWeight: 0.3 });
          v.dispose(); host.remove();
        }
        return out;
      });
      assert(r.dot.n >= 20 && r.dot.n <= 60, `a dot has ${r.dot.n} pixels`);
      assert(r.dot.fill < 0.92 && r.dot.corners.every((c) => c === false), `the dot is a disc, not a square: fill ${r.dot.fill.toFixed(2)} of its ${r.dot.w} x ${r.dot.h} box, corners dark ${r.dot.corners}`);
      assert(r.tube >= 4 && r.line <= 2, `a tube of width 0.05 is ${r.tube} px across, a line is ${r.line} px`);
      const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      assert(r.polar.length === 3 && d(r.light, r.polar) < d(r.def, r.polar) && d(r.def, r.polar) < d(r.heavy, r.polar) && d(r.light, r.polar) < 0.6 * d(r.heavy, r.polar),
        `rampWeight 0.3 keeps --polar ${r.polar} at t = 0 (${r.light}) closer than the default 0.4 (${r.def}), which is closer than 0.65 (${r.heavy})`);
    });

    // ---------------------------------------------------------------- S29 domainSphere is painted like the 2D domain colouring
    await step('S29 domainSphere has the colours of domaincolor.js', async () => {
      const r = await page.evaluate(async () => {
        const t3 = window.__t3, m = t3.m;
        const dc = await import('./js/core/domaincolor.js');
        const f = t3.z2;
        const host = t3.makeHost({ width: '400px', height: 300 });
        const v = m.createView3D(host, { grid: false, axes: false, hint: false, autoFrame: false, background: '#ffffff' });
        const d = m.domainSphere({ f });
        v.add(d.group);
        const out = [];
        const rgb = [0, 0, 0];
        for (const z of [{ re: 1, im: 1 }, { re: -0.7, im: 0.4 }, { re: 0.3, im: -2.5 }, { re: -1.8, im: -0.6 }]) {
          const p = d.project(z).clone().normalize();                // the point of the ball that stands for z
          v.camera.position.copy(p).multiplyScalar(3); v.camera.lookAt(0, 0, 0); v.camera.updateMatrixWorld();
          v.renderNow();
          const img = t3.pixels(v.canvas);
          const got = t3.pick(img, img.width / 2, img.height / 2);
          dc.colorOf(f(z), rgb, false);
          out.push({ z, got, want: rgb.slice() });
        }
        out.push({ bodyHidden: d.group.getObjectByName('sphere-body').visible === false, mesh: d.mesh.name });
        v.dispose(); host.remove();
        return out;
      });
      const checks = r.filter((x) => x.got);
      assert(checks.length === 4, 'four points checked');
      for (const x of checks) {
        const err = Math.max(...x.got.map((c, i) => Math.abs(c - x.want[i])));
        assert(err <= 14, `z = ${x.z.re} + ${x.z.im}i: the sphere shows ${x.got}, domaincolor.js gives ${x.want} (largest channel difference ${err})`);
      }
      const last = r[r.length - 1];
      assert(last.bodyHidden && last.mesh === 'domain-sphere', 'the pale body is hidden under the painted mesh');
    });
  } finally {
    page.off('console', onConsole);
    await page.evaluate(() => {
      const t3 = window.__t3;
      if (!t3) return;
      try { document.querySelectorAll('[data-t3-host]').forEach((e) => e.remove()); } catch { /* ignore */ }
      try {
        const root = document.documentElement;
        if (t3.themeAttr === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t3.themeAttr);
      } catch { /* ignore */ }
    }).catch(() => {});
  }
}

// ------------------------------------------------------------------------------------------------
// Harness entry point (tools/smoke.mjs --script)
// ------------------------------------------------------------------------------------------------

export default async function (page, ctx) {
  await runChecks(page, ctx.assert, ctx.log, ctx.shot);
}

// ------------------------------------------------------------------------------------------------
// Standalone runner
// ------------------------------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
};

const CHECK_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>three-view check</title><style>
:root{--bg:#fff;--surface:#fff;--surface-2:#f3f4f6;--text:#111827;--text-muted:#4b5563;--border:#d1d5db;--focus:#2563eb;--cart:#2563eb;--polar:#c2410c;--input:#0f766e;--output:#7c3aed;--seam:#6b7280;--t0:#1e293b;--t1:#d97706;--radius:10px;--font:system-ui,sans-serif}
:root[data-theme=dark]{--bg:#111827;--surface:#111827;--surface-2:#1f2937;--text:#f3f4f6;--text-muted:#9ca3af;--border:#374151;--focus:#60a5fa;--cart:#60a5fa;--polar:#fb923c;--input:#2dd4bf;--output:#a78bfa;--seam:#9ca3af;--t0:#64748b;--t1:#fde68a}
body{background:var(--bg);color:var(--text);margin:0;font-family:var(--font)}
</style></head><body></body></html>`;

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (urlPath === '/__three-check.html') { res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' }); res.end(CHECK_PAGE); return; }
    const file = path.join(ROOT, urlPath);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall back to the global install */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  const require = createRequire(path.join(globalRoot, 'noop.js'));
  return require(path.join(globalRoot, 'playwright'));
}

async function standalone() {
  const argv = process.argv.slice(2);
  let out = 'docs/review/iter-1/i1-core-three';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out = argv[++i];
    else { console.error(`Unknown argument: ${argv[i]}`); process.exit(2); }
  }
  const { chromium } = await loadPlaywright();
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const views = [{ label: 'desktop', width: 1280, height: 860 }, { label: 'phone', width: 390, height: 844 }];
  let failed = 0;
  for (const v of views) {
    const context = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const problems = [];
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
    const shot = async (name) => {
      fs.mkdirSync(path.join(ROOT, out), { recursive: true });
      const file = path.join(out, `three-check--${v.label}--${name}.png`);
      await page.screenshot({ path: path.join(ROOT, file), fullPage: true });
      console.log(`  [${v.label}] screenshot ${file}`);
      return file;
    };
    const log = (msg) => console.log(`  [${v.label}] ${msg}`);
    const assert = (cond, msg) => { if (!cond) throw new Error(`assertion failed: ${msg}`); };
    try {
      await page.goto(`${base}/__three-check.html`, { waitUntil: 'load' });
      await runChecks(page, assert, log, shot);
    } catch (e) {
      problems.push(`checks failed: ${e.message}`);
    }
    console.log(`${problems.length ? 'FAIL' : 'ok  '} i1-core-three (${v.label})`);
    for (const p of problems) console.log(`       - ${p}`);
    if (problems.length) failed++;
    await context.close();
  }
  await browser.close();
  server.close();
  console.log(failed ? `\ni1-core-three: ${failed} viewport(s) failed` : '\ni1-core-three: all checks passed');
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await standalone();
