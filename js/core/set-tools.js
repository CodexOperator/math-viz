// Loop, deep zoom, fine nudges, and the orbit disk. One module for every set picture.
//
// The main gesture stays the handle. Loop sits beside Play again. The formula,
// the window, and K and R sit in More, and open with the loop when that is the
// thing on screen. The clock is createMotion. A paused or hidden loop posts no frame.

import { createMotion, pageHidden } from './anim.js';
import { mountValueControl } from './stepper.js';
import { parsePath, evalPath, rangeFor } from './path-expr.js';
import { PATH_PRESETS, presetById, smoothLoop, pointOnLoop, compileFormula } from './path-geom.js';
import { orbitUntil, orbitSentence } from './orbit-settle.js';
import { fillMandelbrot } from './deep-fill.js';
import { paintJulia } from './fractal.js';
import { suggestIter } from './set-render.js';
import { ddFromDecimal, ddToDecimal, WIDTH_FLOOR, DOUBLE_EDGE } from './deep-fill.js';

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}

function viewOf(plane) {
  const v = plane.getView();
  const c = v.center || { re: 0, im: 0 };
  return {
    centerRe: c.re, centerIm: c.im,
    centerReLo: c.reLo || 0, centerImLo: c.imLo || 0,
    unitsAcross: v.unitsAcross,
  };
}

function zoomFactorOf(step) {
  const s = Math.abs(Number(step) || 0);
  return 1 + (s > 0 ? s : 0.01);
}

export function mountSetTools(opts) {
  const id = opts.id;
  const planeOf = opts.plane;
  const fractalOf = opts.fractal;
  const getStep = opts.getStep;
  const reduced = opts.reduced || (() => false);
  let fine = false;
  let loopOn = false;
  let playing = false;
  let tLoop = 0;
  let formulaState = null;
  let drawn = null;
  let source = 'circle';
  let drawing = null;
  const values = Object.create(null);
  let worker = null;
  let token = 0;
  let inflight = 0;
  let wantSharp = false;
  let busy = false;
  let pendingDraft = null;
  let owed = null;
  const motion = createMotion();
  const zoomMotion = createMotion();
  let zoomDir = 0;
  let K = 5;
  let R = 0.25;
  let lastOrbit = null;
  let presentCount = 0;
  const varControls = [];
  let zReCtl = null;
  let zImCtl = null;

  const loopBox = el('input', { type: 'checkbox', id: `${id}-loop` });
  const loopLabel = el('label', { class: 'loop-toggle', for: `${id}-loop` }, loopBox, 'Loop');
  const loopPlay = el('button', { type: 'button', class: 'btn', id: `${id}-loop-play`, hidden: '' }, 'Play');
  const fineBtn = el('button', {
    type: 'button', class: 'btn', id: `${id}-fine`, 'aria-pressed': 'false',
    'aria-label': 'Fine step. Each slider travels one step, centred on its current value.',
    title: 'Each slider travels one step, centred on its current value',
  }, 'Fine step');
  const loopRow = el('div', { class: 'loop-row', id: `${id}-loop-row` }, loopLabel, loopPlay, fineBtn);
  if (opts.replay && opts.replay.parentElement) opts.replay.after(loopRow);
  else if (opts.host) opts.host.append(loopRow);

  const picker = el('select', { id: `${id}-path-source`, 'aria-label': 'Path' });
  picker.append(el('option', { value: 'drawn' }, 'Drawn path'));
  for (const p of PATH_PRESETS) picker.append(el('option', { value: p.id }, p.label));
  picker.append(el('option', { value: 'custom' }, 'Custom formula'));
  picker.value = 'circle';
  const formula = el('textarea', {
    id: `${id}-path-formula`, rows: '2', spellcheck: 'false', autocomplete: 'off',
    'aria-label': 'Path formula in t',
  });
  const hint = el('p', { class: 'step-hint', id: `${id}-path-hint`, hidden: '' });
  const speed = el('p', { class: 'step-readout', id: `${id}-loop-speed` });
  const varsHost = el('div', { id: `${id}-path-vars` });
  const pad = el('canvas', { id: `${id}-path-pad`, class: 'path-pad', width: '200', height: '200' });
  pad.setAttribute('aria-label', opts.padLabel || 'Draw a closed path for c. The faint picture is the Mandelbrot set.');
  const panel = el('div', { class: 'path-panel', id: `${id}-path-panel`, hidden: '' },
    el('label', { for: `${id}-path-source` }, 'Path'),
    picker,
    el('label', { for: `${id}-path-formula` }, 'Formula'),
    formula, hint, speed, varsHost, pad);
  loopRow.after(panel);

  const cre = el('input', { type: 'text', id: `${id}-center-re`, inputmode: 'decimal', 'aria-label': 'Centre, real part' });
  const cim = el('input', { type: 'text', id: `${id}-center-im`, inputmode: 'decimal', 'aria-label': 'Centre, imaginary part' });
  const width = el('input', { type: 'text', id: `${id}-width`, inputmode: 'decimal', 'aria-label': 'Width' });
  const zoomIn = el('button', { type: 'button', class: 'btn', id: `${id}-zoom-in` }, 'Zoom in');
  const zoomOut = el('button', { type: 'button', class: 'btn', id: `${id}-zoom-out` }, 'Zoom out');
  const zoomGo = el('button', { type: 'button', class: 'btn', id: `${id}-zoom-play` }, 'Zoom in continuously');
  const zoomOutGo = el('button', { type: 'button', class: 'btn', id: `${id}-zoom-out-play` }, 'Zoom out continuously');
  const precision = el('p', { id: `${id}-precision` });
  const widthHint = el('p', { class: 'step-hint', id: `${id}-width-hint`, hidden: '' });
  const kInput = el('input', { type: 'number', id: `${id}-orbit-k`, min: '2', step: '1', value: '5', inputmode: 'numeric' });
  const rInput = el('input', { type: 'number', id: `${id}-orbit-r`, min: '0.00001', step: '0.01', value: '0.25', inputmode: 'decimal' });
  const clusterBtn = el('button', { type: 'button', class: 'btn', id: `${id}-zoom-cluster`, hidden: '' }, 'Zoom to the cluster');
  const orbitLine = el('p', { id: `${id}-orbit-line` });
  const more = el('details', { class: 'set-more', id: `${id}-more` },
    el('summary', null, 'More'),
    el('p', null, 'The centre and the width are the window. + and − on the picture zoom by the step. Fine, or Shift on a slider, makes that slider one step wide.'),
    el('div', { class: 'fractal-fields' },
      el('div', { class: 'field' }, el('label', { for: `${id}-center-re` }, 'Centre, real'), cre),
      el('div', { class: 'field' }, el('label', { for: `${id}-center-im` }, 'Centre, imaginary'), cim),
      el('div', { class: 'field' }, el('label', { for: `${id}-width` }, 'Width'), width)),
    widthHint,
    el('div', { class: 'loop-row' }, zoomIn, zoomOut, zoomGo, zoomOutGo),
    precision,
    el('div', { class: 'fractal-fields' },
      el('div', { class: 'field' }, el('label', { for: `${id}-orbit-k` }, 'Points in the disk (K)'), kInput),
      el('div', { class: 'field' }, el('label', { for: `${id}-orbit-r` }, 'Disk radius R'), rInput)),
    orbitLine, clusterBtn);
  panel.after(more);

  function plane() { return planeOf ? planeOf() : null; }
  function fractal() { return fractalOf ? fractalOf() : null; }

  function applyZoomFactor() {
    const p = plane();
    if (p && p.setZoomFactor) p.setZoomFactor(zoomFactorOf(getStep()));
    const f = zoomFactorOf(getStep());
    const step = getStep();
    speed.textContent = loopOn
      ? `The loop advances ${step} of a turn each second. Each + zooms in by ${f.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')}.`
      : `Each + zooms in by ${f.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')}. The step is also the nudge.`;
  }

  function loadFormula(text, keepValues) {
    const parsed = parsePath(text);
    formula.value = text;
    if (!parsed.ok) {
      formulaState = null;
      hint.hidden = false;
      hint.textContent = parsed.hint;
      return;
    }
    const env = Object.create(null);
    for (const name of parsed.vars) {
      const raw = values[name];
      env[name] = Number.isFinite(raw) ? raw : 0;
    }
    const compiled = compileFormula(text, env);
    if (!compiled.ok) {
      formulaState = null;
      hint.hidden = false;
      hint.textContent = compiled.hint;
      return;
    }
    formulaState = compiled;
    hint.hidden = true;
    hint.textContent = '';
    buildVars();
  }

  function buildVars() {
    for (const c of varControls) c.destroy();
    varControls.length = 0;
    varsHost.replaceChildren();
    if (!formulaState) return;
    for (const name of formulaState.vars) {
      const range = rangeFor(name, formulaState.env[name]);
      const ctl = mountValueControl(varsHost, {
        id: `${id}-var-${name}`,
        label: name,
        min: range.min,
        max: range.max,
        value: formulaState.env[name],
        getStep,
        fine: () => fine,
        onChange(v) {
          formulaState.env[name] = v;
          values[name] = v;
          if (playing) return;
          paintPad();
          if (loopOn) pushParam(false);
        },
      });
      varControls.push(ctl);
    }
  }

  function pathAt(t) {
    if (source === 'drawn') {
      if (!drawn || drawn.length < 2) return null;
      return pointOnLoop(drawn, t);
    }
    if (!formulaState) return null;
    const ev = evalPath(formulaState.ast, t, formulaState.env);
    if (!ev.ok) {
      hint.hidden = false;
      hint.textContent = ev.hint;
      return null;
    }
    hint.hidden = true;
    return ev.z;
  }

  function pushParam(fromPlay) {
    const z = pathAt(tLoop);
    if (!z || !opts.setParam) return;
    opts.setParam(z, fromPlay ? 'loop' : 'nudge');
    if (fromPlay || (loopOn && playing)) postFrame(true);
    else if (loopOn) {
      wantSharp = true;
      postFrame(false);
    }
  }

  function colours() {
    return opts.colours ? opts.colours() : null;
  }

  function job(draft) {
    const p = plane();
    if (!p) return null;
    const sz = p.getSize();
    const long = Math.max(sz.w, sz.h, 2);
    const edge = draft ? 112 : Math.max(64, Math.min(480, Math.round(long)));
    const w = Math.max(2, Math.round(edge * (sz.w / long)));
    const h = Math.max(2, Math.round(edge * (sz.h / long)));
    const view = viewOf(p);
    const kind = opts.kind || 'julia';
    const maxIter = suggestIter(kind, view, draft);
    const base = {
      kind, w, h, view, maxIter, colours: colours(),
    };
    if (kind === 'newton') {
      base.roots = opts.roots ? opts.roots() : [];
      base.tol2 = opts.tol2 || 1e-4;
    } else if (kind === 'mandelbrot') {
      base.escape2 = 4;
    } else {
      const c = opts.getParam ? opts.getParam() : { re: 0, im: 0 };
      base.c = { re: c.re, im: c.im };
      base.escape2 = opts.escape2 ? opts.escape2(c) : 4;
    }
    return base;
  }

  function ensureWorker() {
    if (worker) return worker;
    try {
      worker = new Worker(new URL('./set-worker.js', import.meta.url), { type: 'module' });
    } catch (err) {
      console.error('[set] worker failed', err);
      return null;
    }
    worker.onmessage = (ev) => {
      const msg = ev.data;
      if (!msg || msg.token !== inflight) return;
      busy = false;
      inflight = 0;
      const hidden = pageHidden();
      const stale = msg.token !== token || !msg.buffer;
      if (hidden || stale) {
        if (hidden && (playing || wantSharp || zoomDir)) owed = !wantSharp;
        else drain();
        return;
      }
      if (!playing && !wantSharp && !zoomDir) {
        drain();
        return;
      }
      const fr = fractal();
      if (fr && fr.present) {
        presentCount += 1;
        fr.present(new ImageData(new Uint8ClampedArray(msg.buffer), msg.w, msg.h));
      }
      if (wantSharp) wantSharp = false;
      drain();
    };
    return worker;
  }

  function drain() {
    if (pageHidden()) return;
    if (pendingDraft == null) return;
    if (!playing && !wantSharp && !zoomDir) { pendingDraft = null; return; }
    const draft = pendingDraft;
    pendingDraft = null;
    postFrame(draft);
  }

  function postFrame(draft) {
    if (pageHidden()) {
      owed = !!draft;
      return;
    }
    owed = null;
    const body = job(draft);
    if (!body) return;
    const wkr = ensureWorker();
    const fr = fractal();
    if (!wkr || !fr) return;
    if (busy) { pendingDraft = draft; return; }
    busy = true;
    const my = ++token;
    inflight = my;
    try { wkr.postMessage({ op: 'render', token: my, ...body }); }
    catch (err) { busy = false; inflight = 0; }
  }

  // Drop the picture that is already running. The worker stops between bands,
  // and the page does not wait for that picture before starting the next one.
  function haltWorker() {
    token += 1;
    if (worker) {
      try { worker.postMessage({ op: 'cancel', token }); } catch (err) { /* worker already stopped */ }
    }
    busy = false;
    inflight = 0;
    pendingDraft = null;
  }

  function stopPlayback() {
    playing = false;
    motion.cancel();
    haltWorker();
    loopPlay.textContent = reduced() ? 'One step' : 'Play';
    if (opts.onPause) opts.onPause();
  }

  function playLoop() {
    if (reduced()) {
      loopPlay.textContent = 'One step';
      tLoop = (tLoop + Math.abs(Number(getStep()) || 0.08)) % 1;
      wantSharp = true;
      pushParam(true);
      paintPad();
      if (opts.onTick) opts.onTick(tLoop);
      return;
    }
    playing = true;
    loopPlay.textContent = 'Pause';
    const fr = fractal();
    if (fr && fr.suspend) fr.suspend();
    motion.drive((dt) => {
      if (!playing || !loopOn) return false;
      const step = Math.abs(Number(getStep()) || 1e-5);
      tLoop = (tLoop + (step * dt) / 1000) % 1;
      const z = pathAt(tLoop);
      if (z && opts.setParam) opts.setParam(z, 'loop');
      postFrame(true);
      paintPad();
      if (opts.onTick) opts.onTick(tLoop);
      return true;
    });
  }

  function stopLoop() {
    if (!loopOn && !playing) return;
    loopOn = false;
    loopBox.checked = false;
    panel.hidden = true;
    stopPlayback();
    wantSharp = false;
    const fr = fractal();
    if (fr && fr.resume) fr.resume();
    if (fr && fr.request) fr.request(false);
    if (opts.onLoop) opts.onLoop(false);
  }

  function startLoop() {
    loopOn = true;
    panel.hidden = false;
    loopPlay.hidden = false;
    applyZoomFactor();
    if (source === 'drawn' && (!drawn || drawn.length < 2)) {
      hint.hidden = false;
      hint.textContent = 'Draw a closed path on the pad, or pick a shape. The shape loads its formula.';
    }
    const fr = fractal();
    if (fr && fr.suspend) fr.suspend();
    if (opts.onLoop) opts.onLoop(true);
    loopPlay.textContent = reduced() ? 'One step' : 'Play';
    if (!reduced()) playLoop();
    else {
      wantSharp = true;
      pushParam(true);
    }
  }

  loopBox.addEventListener('change', () => {
    if (loopBox.checked) startLoop();
    else stopLoop();
  });
  loopPlay.addEventListener('click', () => {
    if (!loopOn) return;
    if (playing) {
      stopPlayback();
      wantSharp = true;
      postFrame(false);
      return;
    }
    playLoop();
  });
  fineBtn.addEventListener('click', () => {
    fine = !fine;
    fineBtn.setAttribute('aria-pressed', fine ? 'true' : 'false');
    refreshValues();
    for (const d of dressed) d.paint();
    if (opts.onFine) opts.onFine(fine);
  });

  picker.addEventListener('change', () => {
    source = picker.value;
    if (source === 'drawn' || source === 'custom') {
      if (source === 'custom' && formula.value.trim()) loadFormula(formula.value, true);
      paintPad();
      return;
    }
    const preset = presetById(source);
    if (!preset) return;
    for (const name of Object.keys(preset.values)) values[name] = preset.values[name];
    loadFormula(preset.formula, false);
    for (const name of Object.keys(preset.values)) {
      if (formulaState) formulaState.env[name] = preset.values[name];
    }
    buildVars();
    paintPad();
    if (loopOn && !playing) pushParam(false);
  });
  formula.addEventListener('change', () => {
    source = 'custom';
    picker.value = 'custom';
    loadFormula(formula.value, true);
    paintPad();
  });

  function padPoint(ev) {
    const r = pad.getBoundingClientRect();
    const x = r.width ? (ev.clientX - r.left) / r.width : 0;
    const y = r.height ? (ev.clientY - r.top) / r.height : 0;
    return { re: -1.6 + Math.min(1, Math.max(0, x)) * 3.2, im: 1.6 - Math.min(1, Math.max(0, y)) * 3.2 };
  }
  pad.addEventListener('pointerdown', (ev) => {
    if (source !== 'drawn') { source = 'drawn'; picker.value = 'drawn'; }
    drawing = [padPoint(ev)];
    try { pad.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic */ }
    ev.preventDefault();
  });
  pad.addEventListener('pointermove', (ev) => {
    if (!drawing) return;
    const z = padPoint(ev);
    const last = drawing[drawing.length - 1];
    if (!last || Math.hypot(z.re - last.re, z.im - last.im) > 0.02) drawing.push(z);
    paintPad(drawing);
  });
  const endDraw = () => {
    if (!drawing) return;
    const raw = drawing;
    drawing = null;
    if (raw.length >= 2) {
      drawn = smoothLoop(raw, 160);
      source = 'drawn';
      picker.value = 'drawn';
      hint.hidden = true;
    }
    paintPad();
  };
  pad.addEventListener('pointerup', endDraw);
  pad.addEventListener('pointercancel', endDraw);

  let padReady = false;
  function paintPad(live) {
    const ctx = pad.getContext('2d');
    if (!ctx) return;
    const w = pad.width;
    const h = pad.height;
    ctx.clearRect(0, 0, w, h);
    if (padReady) ctx.drawImage(pad._bg, 0, 0, w, h);
    const toX = (re) => ((re + 1.6) / 3.2) * w;
    const toY = (im) => ((1.6 - im) / 3.2) * h;
    const path = live || (source === 'drawn' ? drawn : sampleFormula());
    if (path && path.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--polar').trim() || '#c45c26';
      ctx.lineWidth = 2;
      path.forEach((p, i) => {
        const x = toX(p.re);
        const y = toY(p.im);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (!live) ctx.closePath();
      ctx.stroke();
    }
    const mark = pathAt(tLoop);
    if (mark) {
      ctx.beginPath();
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--cart').trim() || '#0b63ad';
      ctx.arc(toX(mark.re), toY(mark.im), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function sampleFormula() {
    if (source === 'drawn' || !formulaState) return null;
    const pts = [];
    for (let i = 0; i < 96; i++) {
      const ev = evalPath(formulaState.ast, i / 96, formulaState.env);
      if (ev.ok) pts.push(ev.z);
    }
    return pts;
  }

  function warmPad() {
    if (!opts.showMap) { paintPad(); return; }
    const w = 160;
    const h = 160;
    const field = new Float32Array(w * h);
    const view = { centerRe: 0, centerIm: 0, unitsAcross: 3.2 };
    fillMandelbrot(field, w, h, 0, h, view, 40, 4);
    const pixels = new Uint8ClampedArray(w * h * 4);
    const root = getComputedStyle(document.documentElement);
    const inside = cssRgb(root.getPropertyValue('--cart'), { r: 11, g: 99, b: 173 });
    const slow = cssRgb(root.getPropertyValue('--polar'), { r: 168, g: 67, b: 0 });
    const fast = cssRgb(root.getPropertyValue('--surface-2') || root.getPropertyValue('--surface'), { r: 230, g: 224, b: 214 });
    paintJulia(pixels, field, w, h, 0, h, 40, inside, slow, fast);
    for (let i = 0; i < w * h; i++) pixels[i * 4 + 3] = field[i] < 0 ? 120 : 48;
    const bg = document.createElement('canvas');
    bg.width = w; bg.height = h;
    bg.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
    pad._bg = bg;
    padReady = true;
    paintPad();
  }

  function cssRgb(raw, fallback) {
    const s = String(raw || '').trim();
    if (s.startsWith('#')) {
      const hx = s.slice(1);
      const full = hx.length === 3 ? hx.split('').map((c) => c + c).join('') : hx;
      return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
    }
    return fallback;
  }

  function readCenter() {
    const re = ddFromDecimal(cre.value);
    const im = ddFromDecimal(cim.value);
    const w = Number(String(width.value).trim().replace(/\u2212/g, '-'));
    const p = plane();
    if (!p || !re || !im || !(w > 0)) {
      widthHint.hidden = false;
      widthHint.textContent = 'Use a real centre and a positive width. A tiny width looks like 1e-8.';
      syncWindow();
      return;
    }
    let used = w;
    if (used < WIDTH_FLOOR) {
      used = WIDTH_FLOOR;
      widthHint.hidden = false;
      widthHint.textContent = 'Stopped at width 1e-28. Two doubles run out of digits past that.';
    } else widthHint.hidden = true;
    p.setView({
      center: { re: re.hi, im: im.hi, reLo: re.lo, imLo: im.lo },
      unitsAcross: used,
    });
  }
  function syncWindow() {
    const p = plane();
    if (!p) return;
    const v = viewOf(p);
    const digits = v.unitsAcross < 1e-4 ? Math.min(28, Math.ceil(-Math.log10(v.unitsAcross)) + 4) : 8;
    if (document.activeElement !== cre) {
      cre.value = v.unitsAcross < DOUBLE_EDGE
        ? ddToDecimal({ hi: v.centerRe, lo: v.centerReLo }, digits)
        : String(Math.round(v.centerRe * 1e8) / 1e8);
    }
    if (document.activeElement !== cim) {
      cim.value = v.unitsAcross < DOUBLE_EDGE
        ? ddToDecimal({ hi: v.centerIm, lo: v.centerImLo }, digits)
        : String(Math.round(v.centerIm * 1e8) / 1e8);
    }
    if (document.activeElement !== width) {
      width.value = v.unitsAcross < 1e-4 ? v.unitsAcross.toExponential(4) : String(Math.round(v.unitsAcross * 1e6) / 1e6);
    }
    precision.textContent = v.unitsAcross < DOUBLE_EDGE
      ? 'Two doubles. The centre boxes keep the extra digits. This picture stops at width 1e-28.'
      : 'One double. Below width 1e-13 the picture switches to two doubles.';
    if (v.unitsAcross <= WIDTH_FLOOR * 1.0000001) {
      widthHint.hidden = false;
      widthHint.textContent = 'Stopped at width 1e-28. Two doubles run out of digits past that.';
    } else if (widthHint.textContent.startsWith('Stopped at width')) {
      widthHint.hidden = true;
      widthHint.textContent = '';
    }
  }
  cre.addEventListener('change', readCenter);
  cim.addEventListener('change', readCenter);
  width.addEventListener('change', readCenter);
  zoomIn.addEventListener('click', () => { const p = plane(); if (p && p.zoomBy) p.zoomBy(zoomFactorOf(getStep())); });
  zoomOut.addEventListener('click', () => { const p = plane(); if (p && p.zoomBy) p.zoomBy(1 / zoomFactorOf(getStep())); });

  function runZoom(dir) {
    if (zoomDir === dir) {
      zoomDir = 0;
      zoomMotion.cancel();
      zoomGo.textContent = 'Zoom in continuously';
      zoomOutGo.textContent = 'Zoom out continuously';
      return;
    }
    zoomDir = dir;
    zoomGo.textContent = dir > 0 && !reduced() ? 'Pause' : 'Zoom in continuously';
    zoomOutGo.textContent = dir < 0 && !reduced() ? 'Pause' : 'Zoom out continuously';
    if (reduced()) {
      const p = plane();
      const f = zoomFactorOf(getStep());
      if (p && p.zoomBy) p.zoomBy(dir > 0 ? f : 1 / f);
      zoomDir = 0;
      zoomGo.textContent = 'Zoom in continuously';
      zoomOutGo.textContent = 'Zoom out continuously';
      return;
    }
    zoomMotion.drive((dt) => {
      if (!zoomDir) return false;
      const p = plane();
      if (!p || !p.zoomBy) return false;
      const f = zoomFactorOf(getStep());
      const step = Math.exp(Math.log(f) * dt / 450);
      p.zoomBy(zoomDir > 0 ? step : 1 / step);
      return true;
    });
  }
  zoomGo.addEventListener('click', () => runZoom(1));
  zoomOutGo.addEventListener('click', () => runZoom(-1));

  function readOrbit() {
    const k = Math.round(Number(kInput.value));
    if (!Number.isFinite(k) || k < 2) {
      kInput.value = '2';
      K = 2;
    } else K = k;
    const r = Number(rInput.value);
    R = Number.isFinite(r) && r > 0 ? r : 0.25;
    if (!(r > 0)) rInput.value = String(R);
    if (opts.onOrbit) opts.onOrbit();
  }
  kInput.addEventListener('change', readOrbit);
  rInput.addEventListener('change', readOrbit);
  clusterBtn.addEventListener('click', () => {
    if (!lastOrbit || !lastOrbit.disk) return;
    const d = lastOrbit.disk;
    if (opts.onCluster) { opts.onCluster(d); return; }
    const p = plane();
    if (!p) return;
    p.setView({ center: { re: d.re, im: d.im }, unitsAcross: Math.max(8 * d.radius, WIDTH_FLOOR) });
  });

  function settle(start) {
    const p = plane();
    const result = orbitUntil(start, opts.stepPoint, {
      K, R,
      escapes: opts.escapes,
      offScreen: (z) => {
        if (opts.offScreen) return opts.offScreen(z);
        if (!p || !opts.screen) return false;
        const v = p.getView();
        const halfW = v.unitsAcross / 2;
        const sz = p.getSize();
        const halfH = halfW * ((sz.h || 1) / Math.max(1, sz.w || 1));
        return Math.abs(z.re - v.center.re) > halfW * 1.05 || Math.abs(z.im - v.center.im) > halfH * 1.05;
      },
    });
    lastOrbit = result;
    orbitLine.textContent = orbitSentence(result);
    clusterBtn.hidden = result.reason !== 'cluster';
    return result;
  }

  function dress(input, spec) {
    if (!input || !input.parentElement) return null;
    const field = input.parentElement;
    field.classList.add('nudge-field');
    const slider = el('input', {
      type: 'range', id: `${spec.id}-slider`, min: '0', max: '1000', step: '1',
      'aria-label': spec.label,
    });
    const minus = el('button', { type: 'button', class: 'btn nudge-btn', id: `${spec.id}-dec` }, '−');
    const plus = el('button', { type: 'button', class: 'btn nudge-btn', id: `${spec.id}-inc` }, '+');
    minus.setAttribute('aria-label', `Decrease ${spec.label}`);
    plus.setAttribute('aria-label', `Increase ${spec.label}`);
    const pair = el('span', { class: 'nudge-pair' });
    input.replaceWith(pair);
    pair.append(minus, input, plus);
    field.insertBefore(slider, pair);
    let fineDrag = null;
    let painting = false;
    const read = () => spec.get();
    function stepSize() { return Math.abs(Number(getStep()) || 0); }
    function windowOf() {
      const v = read();
      const step = stepSize();
      if (fineDrag) return { min: fineDrag.min, max: fineDrag.max, fine: true };
      if (fine && step > 0) return { min: v - step / 2, max: v + step / 2, fine: true };
      return { min: spec.min, max: spec.max, fine: false };
    }
    function lockFine() {
      const v = read();
      const step = stepSize();
      const half = step > 0 ? step / 2 : (spec.max - spec.min) / 2;
      fineDrag = { min: v - half, max: v + half };
    }
    function paint() {
      const v = read();
      const s = windowOf();
      const u = s.max === s.min ? 0.5 : (v - s.min) / (s.max - s.min);
      const next = String(Math.round(Math.min(1, Math.max(0, u)) * 1000));
      painting = true;
      if (slider.value !== next) slider.value = next;
      painting = false;
      slider.dataset.fine = s.fine ? '1' : '0';
      slider.setAttribute('aria-valuetext', String(v));
    }
    slider.addEventListener('pointerdown', (e) => {
      if ((e.shiftKey || fine) && stepSize() > 0) lockFine();
      else fineDrag = null;
      paint();
    });
    const endFine = () => {
      if (!fineDrag) return;
      fineDrag = null;
      paint();
    };
    slider.addEventListener('pointerup', endFine);
    slider.addEventListener('pointercancel', endFine);
    slider.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') endFine();
    });
    slider.addEventListener('blur', endFine);
    slider.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if ((e.shiftKey || fine) && !fineDrag) lockFine();
    });
    slider.addEventListener('input', () => {
      if (painting) return;
      const s = fineDrag || windowOf();
      const v = Math.min(spec.max, Math.max(spec.min, s.min + (s.max - s.min) * (Number(slider.value) / 1000)));
      spec.set(v);
    });
    const bump = (sign) => {
      endFine();
      const step = stepSize();
      const v = Math.min(spec.max, Math.max(spec.min, read() + sign * step));
      spec.set(v);
      paint();
    };
    minus.addEventListener('click', () => bump(-1));
    plus.addEventListener('click', () => bump(1));
    paint();
    return { paint };
  }

  const dressed = [];
  for (const spec of opts.nudges || []) {
    const ctl = dress(spec.input, spec);
    if (ctl) dressed.push(ctl);
  }
  if (opts.zFields && opts.fields) {
    zReCtl = mountValueControl(opts.fields, {
      id: `${id}-z-re`, label: `Real part of ${opts.zName || 'z₀'}`,
      min: opts.zMin == null ? -2 : opts.zMin, max: opts.zMax == null ? 2 : opts.zMax,
      value: opts.getZ ? opts.getZ().re : 0, getStep, fine: () => fine,
      onChange(v) { if (opts.setZ && opts.getZ) opts.setZ({ re: v, im: opts.getZ().im }); },
    });
    zImCtl = mountValueControl(opts.fields, {
      id: `${id}-z-im`, label: `Imaginary part of ${opts.zName || 'z₀'}`,
      min: opts.zMin == null ? -2 : opts.zMin, max: opts.zMax == null ? 2 : opts.zMax,
      value: opts.getZ ? opts.getZ().im : 0, getStep, fine: () => fine,
      onChange(v) { if (opts.setZ && opts.getZ) opts.setZ({ re: opts.getZ().re, im: v }); },
    });
  }

  function refreshValues() {
    for (const c of varControls) if (c.refresh) c.refresh();
    if (zReCtl && zReCtl.refresh) zReCtl.refresh();
    if (zImCtl && zImCtl.refresh) zImCtl.refresh();
  }

  function syncZ() {
    if (!opts.getZ || !zReCtl || !zImCtl) return;
    const z = opts.getZ();
    if (Math.abs(zReCtl.get() - z.re) > 1e-12) zReCtl.set(z.re, false);
    if (Math.abs(zImCtl.get() - z.im) > 1e-12) zImCtl.set(z.im, false);
  }

  const preset = presetById('circle');
  for (const name of Object.keys(preset.values)) values[name] = preset.values[name];
  loadFormula(preset.formula, false);
  applyZoomFactor();
  warmPad();

  let offView = null;
  const onVis = () => {
    if (pageHidden() || owed == null) return;
    const draft = owed;
    owed = null;
    if (playing || wantSharp || zoomDir) postFrame(draft);
  };
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', onVis);
  }
  const p0 = plane();
  if (p0 && p0.on) {
    offView = p0.on('viewchange', () => {
      syncWindow();
      applyZoomFactor();
      if (opts.onView) opts.onView();
      if (loopOn && !playing) {
        wantSharp = zoomDir === 0;
        postFrame(zoomDir !== 0);
      }
    });
    syncWindow();
  }

  return {
    stopLoop,
    isLoop: () => loopOn,
    isPlaying: () => playing,
    isZooming: () => zoomDir !== 0,
    getT: () => tLoop,
    varNames: () => (formulaState ? formulaState.vars.slice() : []),
    hint: () => hint.textContent,
    presents: () => presentCount,
    settle,
    lastOrbit: () => lastOrbit,
    refreshNudges() { syncZ(); for (const d of dressed) d.paint(); refreshValues(); },
    noteStep() { applyZoomFactor(); for (const d of dressed) d.paint(); },
    overlayPoints() {
      if (!loopOn) return null;
      if (source === 'drawn') return drawn;
      return sampleFormula();
    },
    marker() { return loopOn ? pathAt(tLoop) : null; },
    destroy() {
      stopLoop();
      zoomMotion.cancel();
      haltWorker();
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', onVis);
      }
      if (worker) worker.terminate();
      if (offView) offView();
      motion.cancel();
    },
  };
}
