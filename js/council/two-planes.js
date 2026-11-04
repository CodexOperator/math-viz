// The two floating sheets of w = f(z), and the strings between them.
//
// Drag turns the pair. The function changes from a chip or from the formula box.
// Turning does not recompute the forest. A hidden tab draws nothing.
// Live code: this module does not import from kit/.

import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { pageHidden } from '../core/anim.js';
import { colorXY, drawColorWheel, DOMAIN_LEGEND } from '../core/domaincolor.js';
import { compile, ParseError } from '../core/parse.js';
import {
  PRESETS, presetForSrc, describe, density, lift, frameOutput, buildForest, ev,
} from './planes-model.js';

const PIXEL_BUDGET = 1.4e6;
const PR_MAX = 1.5;

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function token(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) return v;
  } catch { /* no document */ }
  return fallback;
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
    return true;
  } catch {
    return false;
  }
}

function cssWidthOf(el) {
  const w = el && el.clientWidth;
  return w >= 2 ? w : 360;
}

export function start() {
  const stage = document.getElementById('stage');
  const claim = document.getElementById('claim');
  const status = document.getElementById('status');
  const error = document.getElementById('error');
  const cite = document.getElementById('cite');
  const formula = document.getElementById('formula');
  const tex = document.getElementById('formula-tex');
  const hint = document.getElementById('hint');
  const chips = Array.from(document.querySelectorAll('[data-src]'));
  const wheel = document.getElementById('wheel');
  if (!stage || !claim || !formula) return;

  if (wheel) {
    wheel.setAttribute('aria-label', DOMAIN_LEGEND.aria);
    drawColorWheel(wheel, { size: 84 });
  }
  const legend = document.getElementById('legend-short');
  if (legend) legend.textContent = DOMAIN_LEGEND.short;

  const coarse = (() => {
    try { return matchMedia('(pointer: coarse)').matches; } catch { return false; }
  })();
  const reduced = (() => {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  })();
  if (hint) hint.textContent = coarse ? 'Swipe to turn. Pinch to zoom.' : 'Drag to turn. Scroll to zoom. Arrow keys turn. 0 resets.';

  let compiled = null;
  try { compiled = compile(formula.value || 'z^2'); } catch { compiled = compile('z^2'); formula.value = 'z^2'; }

  const useWebgl = webglAvailable();
  if (useWebgl) startWebGL({ stage, claim, status, error, cite, formula, tex, hint, chips, compiled, reduced });
  else startFlat({ stage, claim, status, error, cite, formula, tex, chips, compiled });
}

function bindFormula({ formula, chips, error, tex, apply }) {
  const paintChips = () => {
    const src = formula.value.trim();
    for (const chip of chips) chip.setAttribute('aria-pressed', chip.dataset.src === src ? 'true' : 'false');
  };
  const commit = () => {
    const src = formula.value.trim();
    if (!src) {
      error.textContent = 'Type a formula in z, for example z^2.';
      return;
    }
    let next;
    try { next = compile(src); }
    catch (err) {
      error.textContent = err instanceof ParseError ? err.message : 'That formula could not be read.';
      return;
    }
    error.textContent = '';
    apply(next);
    paintChips();
  };
  formula.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); formula.blur(); commit(); }
  });
  formula.addEventListener('change', commit);
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      formula.value = chip.dataset.src;
      commit();
    });
  }
  paintChips();
  return { paintChips, commit };
}

function showTex(texEl, src) {
  if (!texEl) return;
  let body = src;
  try { body = compile(src).tex; } catch { /* keep the source */ }
  if (window.katex && typeof window.katex.render === 'function') {
    window.katex.render('w = ' + body, texEl, { throwOnError: false });
  } else {
    texEl.textContent = 'w = ' + src;
  }
}

function publish(stage, claim, status, cite, desc, preset, count, renderer) {
  claim.textContent = desc.text;
  claim.dataset.holds = desc.holds ? 'true' : 'false';
  stage.dataset.ready = '1';
  stage.dataset.renderer = renderer;
  stage.dataset.strings = String(count);
  stage.dataset.holds = desc.holds ? '1' : '0';
  stage.dataset.src = preset ? preset.src : '';
  stage.setAttribute('aria-label', 'Green input sheet and purple output sheet, joined by strings. ' + desc.text);
  if (status) {
    const n = count.toLocaleString('en-US');
    status.textContent = n + ' strings. Turning the picture does not recompute them.';
  }
  if (cite) cite.textContent = preset ? preset.cite : 'Typed with the same formula language as the lab. Howell & Mathews, Complex Analysis, 202 Updated Edition.';
}

function startWebGL(ui) {
  const { stage, claim, status, error, cite, formula, tex, hint, chips, reduced } = ui;
  let compiled = ui.compiled;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.touchAction = 'none';
  stage.append(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove();
    startFlat(ui);
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.85;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI - 0.12;
  controls.target.set(0, 1, 0);
  controls.listenToKeyEvents(stage);
  camera.position.set(4, 4, 6);

  let root = null;
  let running = true;
  let rafId = 0;
  let needsRender = true;
  let idle = 0;
  let orbiting = false;
  let narrow = null;
  let lost = false;

  function requestRender() {
    needsRender = true;
    idle = 0;
    schedule();
  }

  function schedule() {
    if (pageHidden() || !running || rafId) return;
    rafId = requestAnimationFrame(loop);
  }

  function renderNow() {
    if (lost) { needsRender = false; return; }
    renderer.render(scene, camera);
    needsRender = false;
  }

  const pose = new THREE.Vector3();
  const poseTarget = new THREE.Vector3();
  function loop() {
    rafId = 0;
    if (!running || pageHidden()) return;
    pose.copy(camera.position);
    poseTarget.copy(controls.target);
    let changed = controls.update();
    if (!orbiting && controls.enableDamping && changed) {
      const radius = Math.max(1e-3, camera.position.distanceTo(controls.target));
      const moved = camera.position.distanceTo(pose) + controls.target.distanceTo(poseTarget);
      if (moved / radius < 0.0015) {
        controls.enableDamping = false;
        if (controls.update()) needsRender = true;
        controls.enableDamping = !reduced;
        changed = false;
      }
    }
    if (changed) { needsRender = true; idle = 0; } else idle += 1;
    if (needsRender) renderNow();
    if (needsRender || orbiting || idle < 8) schedule();
  }

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w < 2 || h < 2) return;
    const pr = Math.min(window.devicePixelRatio || 1, PR_MAX, Math.max(1, Math.sqrt(PIXEL_BUDGET / (w * h))));
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    requestRender();
  }

  function disposeRoot() {
    if (!root) return;
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? [].concat(o.material) : [];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    });
    scene.remove(root);
    root = null;
  }

  function colourOf(hex) {
    return new THREE.Color(hex);
  }

  function sheetTexture(data, n) {
    const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  }

  function paint(f, win, n, mode) {
    const data = new Uint8Array(n * n * 4);
    const tmp = [0, 0, 0];
    const x0 = win.x[0], x1 = win.x[1], y0 = win.y[0], y1 = win.y[1];
    for (let j = 0; j < n; j++) {
      const y = y0 + (y1 - y0) * ((j + 0.5) / n);
      for (let i = 0; i < n; i++) {
        const x = x0 + (x1 - x0) * ((i + 0.5) / n);
        let re = x;
        let im = y;
        if (mode === 'input') {
          const w = ev(f, { re: x, im: y });
          if (!w) { re = NaN; im = NaN; }
          else { re = w.re; im = w.im; }
        }
        colorXY(re, im, tmp, true);
        const p = (j * n + i) * 4;
        data[p] = tmp[0];
        data[p + 1] = tmp[1];
        data[p + 2] = tmp[2];
        data[p + 3] = 255;
      }
    }
    return sheetTexture(data, n);
  }

  function addSheet(group, win, h, texture) {
    const w = win.x[1] - win.x[0];
    const d = win.y[1] - win.y[0];
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    const cx = (win.x[0] + win.x[1]) / 2;
    const cy = (win.y[0] + win.y[1]) / 2;
    mesh.position.set(cx, h, -cy);
    group.add(mesh);
    return mesh;
  }

  function frameOf(win) {
    const x0 = win.x[0], x1 = win.x[1], y0 = win.y[0], y1 = win.y[1];
    return [
      Float32Array.of(x0, y0, x1, y0),
      Float32Array.of(x1, y0, x1, y1),
      Float32Array.of(x1, y1, x0, y1),
      Float32Array.of(x0, y1, x0, y0),
    ];
  }

  function addAxes(group, win, h, color) {
    const pts = [];
    const x0 = win.x[0], x1 = win.x[1], y0 = win.y[0], y1 = win.y[1];
    if (y0 <= 0 && y1 >= 0) {
      pts.push(new THREE.Vector3(x0, h, 0), new THREE.Vector3(x1, h, 0));
    }
    if (x0 <= 0 && x1 >= 0) {
      pts.push(new THREE.Vector3(0, h, -y0), new THREE.Vector3(0, h, -y1));
    }
    if (!pts.length) return;
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color })));
  }

  function ribbon(points, h, half) {
    const n = points.length / 2;
    if (n < 2) return null;
    const pos = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const u = points[i * 2];
      const v = points[i * 2 + 1];
      const i1 = i < n - 1 ? i + 1 : i - 1;
      let tx = points[i1 * 2] - u;
      let tz = -(points[i1 * 2 + 1] - v);
      if (i === n - 1) { tx = u - points[i1 * 2]; tz = -(v - points[i1 * 2 + 1]); }
      const len = Math.hypot(tx, tz) || 1;
      const nx = -tz / len * half;
      const nz = tx / len * half;
      const o = i * 6;
      pos[o] = u + nx;
      pos[o + 1] = h;
      pos[o + 2] = -v + nz;
      pos[o + 3] = u - nx;
      pos[o + 4] = h;
      pos[o + 5] = -v - nz;
    }
    const index = new Uint32Array((n - 1) * 6);
    let k = 0;
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      index[k++] = a; index[k++] = a + 1; index[k++] = a + 2;
      index[k++] = a + 1; index[k++] = a + 3; index[k++] = a + 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    return geo;
  }

  function addRibbons(group, parts, h, color, half) {
    const geos = [];
    for (const part of parts) {
      const g = ribbon(part, h, half);
      if (g) geos.push(g);
    }
    if (!geos.length) return;
    const merged = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    group.add(new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })));
  }

  function mergeGeometries(geos) {
    let verts = 0;
    let indexes = 0;
    for (const g of geos) {
      verts += g.getAttribute('position').count;
      indexes += g.getIndex().count;
    }
    const pos = new Float32Array(verts * 3);
    const index = new Uint32Array(indexes);
    let v = 0;
    let k = 0;
    for (const g of geos) {
      const p = g.getAttribute('position').array;
      const ix = g.getIndex().array;
      pos.set(p, v * 3);
      for (let i = 0; i < ix.length; i++) index[k++] = ix[i] + v;
      v += p.length / 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    return geo;
  }

  function addStrings(group, forest, h0, h1, opacity) {
    const tmp = [0, 0, 0];
    const pos = new Float32Array(forest.count * 2 * 3);
    const col = new Float32Array(forest.count * 2 * 3);
    for (let i = 0; i < forest.count; i++) {
      const x = forest.strings[i * 4];
      const y = forest.strings[i * 4 + 1];
      const u = forest.strings[i * 4 + 2];
      const v = forest.strings[i * 4 + 3];
      const o = i * 6;
      pos[o] = x; pos[o + 1] = h0; pos[o + 2] = -y;
      pos[o + 3] = u; pos[o + 4] = h1; pos[o + 5] = -v;
      colorXY(u, v, tmp, true);
      const r = srgbToLinear(tmp[0] / 255);
      const g = srgbToLinear(tmp[1] / 255);
      const b = srgbToLinear(tmp[2] / 255);
      col[o] = r; col[o + 1] = g; col[o + 2] = b;
      col[o + 3] = r; col[o + 4] = g; col[o + 5] = b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity, depthWrite: false });
    group.add(new THREE.LineSegments(geo, mat));
  }

  function addDot(group, x, y, h, color, radius) {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.position.set(x, h, -y);
    group.add(mesh);
  }

  function inWin(w, win) {
    return w && w.re >= win.x[0] && w.re <= win.x[1] && w.im >= win.y[0] && w.im <= win.y[1];
  }

  function fit(input, output, h) {
    const box = new THREE.Box3();
    const corners = [
      [input.x[0], 0, input.y[0]], [input.x[1], 0, input.y[1]],
      [output.x[0], h, output.y[0]], [output.x[1], h, output.y[1]],
      [input.x[0], 0, input.y[1]], [output.x[1], h, output.y[0]],
    ];
    for (const c of corners) box.expandByPoint(new THREE.Vector3(c[0], c[1], -c[2]));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(0.8, 0.5 * Math.hypot(size.x, size.y, size.z));
    const aspect = Math.max(0.2, camera.aspect || 1);
    const vFov = camera.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const dist = (radius * 1.22) / Math.sin(Math.min(vFov, hFov) / 2);
    const el = 0.52;
    const az = 0.82;
    const dir = new THREE.Vector3(
      Math.cos(el) * Math.sin(az),
      Math.sin(el),
      Math.cos(el) * Math.cos(az),
    );
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(dir, dist);
    camera.near = Math.max(0.04, dist / 180);
    camera.far = dist * 14;
    camera.updateProjectionMatrix();
    controls.minDistance = dist / 6;
    controls.maxDistance = dist * 2.8;
    controls.update();
    controls.saveState();
  }

  function rebuild() {
    const desc = describe(compiled.f);
    const preset = presetForSrc(compiled.src);
    const input = preset ? preset.input : { x: [-2, 2], y: [-2, 2] };
    const output = preset && preset.output ? preset.output : frameOutput(compiled.f, input);
    const spec = density(cssWidthOf(stage));
    narrow = spec.strings === 36;
    const h = lift(input, output);
    const forest = buildForest(compiled.f, input, output, spec.strings, spec.guides);
    const cart = colourOf(token('--cart', '#62adf2'));
    const polar = colourOf(token('--polar', '#ff9d5c'));
    const inputInk = colourOf(token('--input', '#3fd0a0'));
    const outputInk = colourOf(token('--output', '#e48fd2'));
    const span = Math.max(input.x[1] - input.x[0], output.x[1] - output.x[0], 1);

    disposeRoot();
    const group = new THREE.Group();
    addSheet(group, input, 0, paint(compiled.f, input, spec.texture, 'input'));
    addSheet(group, output, h, paint(compiled.f, output, spec.texture, 'output'));
    const rim = span * 0.011;
    addRibbons(group, frameOf(input), 0.045, inputInk, rim);
    addRibbons(group, frameOf(output), h + 0.045, outputInk, rim);
    addAxes(group, input, 0.03, cart);
    addAxes(group, output, h + 0.03, cart);

    const sourceParts = forest.grid.map((g) => g.source);
    addRibbons(group, sourceParts, 0.04, cart, span * 0.004);
    const imageParts = [];
    for (const g of forest.grid) for (const part of g.parts) imageParts.push(part);
    addRibbons(group, imageParts, h + 0.045, cart, span * 0.0055);

    if (desc.cut) {
      const ray = new Float32Array([Math.min(input.x[0], -0.02), 0, -0.02, 0]);
      addRibbons(group, [ray], 0.06, polar, span * 0.012);
      addRibbons(group, forest.cut.upper.concat(forest.cut.lower), h + 0.06, polar, span * 0.01);
    }

    addStrings(group, forest, 0.05, h - 0.04, spec.strings >= 50 ? 0.42 : 0.7);

    const dot = Math.max(0.07, span * 0.02);
    if (desc.cut) {
      addDot(group, -1, 0.08, 0.1, inputInk, dot);
      addDot(group, -1, -0.08, 0.1, inputInk, dot);
      if (inWin(desc.above, output)) addDot(group, desc.above.re, desc.above.im, h + 0.1, polar, dot);
      if (inWin(desc.below, output)) addDot(group, desc.below.re, desc.below.im, h + 0.1, polar, dot);
    } else if (desc.doubleCover) {
      addDot(group, desc.z.re, desc.z.im, 0.08, inputInk, dot);
      addDot(group, desc.mz.re, desc.mz.im, 0.08, inputInk, dot);
      if (inWin(desc.fz, output)) addDot(group, desc.fz.re, desc.fz.im, h + 0.08, outputInk, dot);
    }

    root = group;
    scene.add(root);
    resize();
    fit(input, output, h);
    publish(stage, claim, status, cite, desc, preset, forest.count, 'webgl');
    showTex(tex, compiled.src);
    requestRender();
  }

  function resetCamera() {
    controls.enableDamping = false;
    controls.update();
    controls.reset();
    controls.enableDamping = !reduced;
    requestRender();
  }

  bindFormula({
    formula, chips, error, tex,
    apply(next) { compiled = next; rebuild(); },
  });

  controls.addEventListener('start', () => {
    orbiting = true;
    if (hint) hint.dataset.hidden = 'true';
    schedule();
  });
  controls.addEventListener('end', () => { orbiting = false; schedule(); });
  controls.addEventListener('change', requestRender);
  canvas.addEventListener('pointerdown', () => { stage.focus({ preventScroll: true }); });
  stage.addEventListener('keydown', (e) => {
    if (e.key === '0') { resetCamera(); e.preventDefault(); }
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    if (status) status.textContent = 'The 3D view paused because the graphics card reset. It should come back on its own.';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    rebuild();
  });

  document.addEventListener('visibilitychange', () => {
    if (pageHidden()) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      return;
    }
    requestRender();
  });

  const ro = new ResizeObserver(() => {
    const next = cssWidthOf(stage) < 700;
    resize();
    if (narrow !== null && next !== narrow) rebuild();
  });
  ro.observe(stage);

  const boot = () => { resize(); rebuild(); };
  if (stage.clientWidth >= 2) boot();
  else requestAnimationFrame(boot);
}

function startFlat(ui) {
  const { stage, claim, status, error, cite, formula, tex, chips } = ui;
  let compiled = ui.compiled;
  stage.dataset.renderer = 'canvas';
  const note = document.createElement('p');
  note.className = 'tp-fallback';
  note.textContent = 'This 3D view needs WebGL and this browser has it switched off. The two flat sheets show the same map.';
  const wrap = document.createElement('div');
  wrap.className = 'tp-flat';
  const inCanvas = document.createElement('canvas');
  const outCanvas = document.createElement('canvas');
  inCanvas.setAttribute('aria-label', 'Input sheet, domain colouring of f.');
  outCanvas.setAttribute('aria-label', 'Output sheet, coloured by the value itself.');
  wrap.append(inCanvas, outCanvas);
  stage.append(note, wrap);

  function drawPlane(canvasEl, win, mode, forest, which) {
    const css = Math.max(160, Math.floor(wrap.clientWidth / (wrap.clientWidth < 640 ? 1 : 2)) - 8);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(2, Math.round(css * dpr));
    canvasEl.width = px;
    canvasEl.height = px;
    canvasEl.style.width = '100%';
    canvasEl.style.height = 'auto';
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const n = 100;
    const img = ctx.createImageData(n, n);
    const tmp = [0, 0, 0];
    for (let j = 0; j < n; j++) {
      const y = win.y[1] - (win.y[1] - win.y[0]) * ((j + 0.5) / n);
      for (let i = 0; i < n; i++) {
        const x = win.x[0] + (win.x[1] - win.x[0]) * ((i + 0.5) / n);
        let re = x;
        let im = y;
        if (mode === 'input') {
          const w = ev(compiled.f, { re: x, im: y });
          if (!w) { re = NaN; im = NaN; }
          else { re = w.re; im = w.im; }
        }
        colorXY(re, im, tmp, true);
        const p = (j * n + i) * 4;
        img.data[p] = tmp[0];
        img.data[p + 1] = tmp[1];
        img.data[p + 2] = tmp[2];
        img.data[p + 3] = 255;
      }
    }
    const off = document.createElement('canvas');
    off.width = n;
    off.height = n;
    off.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, px, px);
    const map = (x, y) => [
      (x - win.x[0]) / (win.x[1] - win.x[0]) * px,
      (win.y[1] - y) / (win.y[1] - win.y[0]) * px,
    ];
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeStyle = token('--cart', '#62adf2');
    ctx.beginPath();
    const lines = which === 'input' ? forest.grid.map((g) => g.source) : forest.grid.flatMap((g) => g.parts);
    for (const part of lines) {
      const m = part.length / 2;
      for (let i = 0; i < m; i++) {
        const [px0, py0] = map(part[i * 2], part[i * 2 + 1]);
        if (i === 0) ctx.moveTo(px0, py0);
        else ctx.lineTo(px0, py0);
      }
    }
    ctx.stroke();
  }

  function rebuild() {
    const desc = describe(compiled.f);
    const preset = presetForSrc(compiled.src);
    const input = preset ? preset.input : { x: [-2, 2], y: [-2, 2] };
    const output = preset && preset.output ? preset.output : frameOutput(compiled.f, input);
    const spec = density(cssWidthOf(stage));
    const forest = buildForest(compiled.f, input, output, Math.min(spec.strings, 28), spec.guides);
    drawPlane(inCanvas, input, 'input', forest, 'input');
    drawPlane(outCanvas, output, 'output', forest, 'output');
    publish(stage, claim, status, cite, desc, preset, forest.count, 'canvas');
    if (status) status.textContent = forest.count.toLocaleString('en-US') + ' strings, drawn flat. WebGL is off, so the sheets do not turn.';
    showTex(tex, compiled.src);
  }

  bindFormula({
    formula, chips, error, tex,
    apply(next) { compiled = next; rebuild(); },
  });
  rebuild();
}
