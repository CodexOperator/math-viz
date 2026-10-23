// The Mandelbrot picture and the cardioid stop share one layout.
//
// The big picture is the set of c. The small picture is the Julia set of the
// c under the pointer, or of the orange point when the pointer is off.
// Loop runs on the big picture. The orbit until it decides is drawn on the
// small picture, because that walk lives in z, not in c.

import { createPlane, drawSegment, drawDot, drawCircle, cssColor } from '../core/plane.js';
import { attachFractal } from '../core/fractal-view.js';
import { paintJulia, juliaWalk, parseCssColor, effectiveEscape } from '../core/fractal.js';
import { fillAutoJulia, fillAutoMandelbrot, iterForWidth } from '../core/deep-fill.js';
import { mountSetTools } from '../core/set-tools.js';
import { orbitSentence, criticalPeriod } from '../core/orbit-settle.js';
import { mountStepControl } from '../core/stepper.js';
import { tex } from '../core/katex.js';
import { fmtCart } from '../core/complex.js';
import { h, mountFractalPage, addDragHandle } from '../core/fractal-station.js';
import { publishFilmParams } from '../core/film.js';

const ESCAPE_R = 2;

function rgb(token) {
  return parseCssColor(cssColor(token)) || { r: 90, g: 90, b: 90 };
}

function cardioidPoints() {
  const pts = [];
  for (let k = 0; k <= 180; k++) {
    const phi = (2 * Math.PI * k) / 180;
    pts.push({
      re: Math.cos(phi) / 2 - Math.cos(2 * phi) / 4,
      im: Math.sin(phi) / 2 - Math.sin(2 * phi) / 4,
    });
  }
  return pts;
}

const CARDIOID = cardioidPoints();

export function mountFamily(el, ctx, spec) {
  const state = {
    c: spec.c0 ? { re: spec.c0.re, im: spec.c0.im } : { re: -0.5, im: 0 },
    z: { re: 0, im: 0 },
  };
  let hover = null;
  let tools = null;
  let mIter = 64;
  let jIter = 40;
  const parts = { plane: null, fractal: null, juliaPlane: null, juliaFractal: null, offTheme: null };
  let cHandle = null;

  const page = mountFractalPage(el, ctx, {
    id: spec.id,
    source: spec.source,
    lede: spec.lede,
    ruleTitle: spec.ruleTitle,
    ruleText: spec.ruleText,
    chipLabel: 'Values of c',
    fields: true,
    step: true,
    pictureTitle: spec.pictureTitle,
    pictureCaption: spec.pictureCaption,
  });
  tex(page.formula, spec.tex || 'z_{n+1} = z_n^2 + c', { display: true });

  const reInput = h('input', {
    type: 'text', id: `${spec.id}-c-re`, inputmode: 'decimal', autocomplete: 'off', value: String(state.c.re),
  });
  const imInput = h('input', {
    type: 'text', id: `${spec.id}-c-im`, inputmode: 'decimal', autocomplete: 'off', value: String(state.c.im),
  });
  page.fields.append(
    h('div', { class: 'field' }, h('label', { for: `${spec.id}-c-re` }, 'Real part of c'), reInput),
    h('div', { class: 'field' }, h('label', { for: `${spec.id}-c-im` }, 'Imaginary part of c'), imInput),
  );
  const presetButtons = (spec.presets || []).map((p) => {
    const b = h('button', { type: 'button', class: 'chip', id: `${spec.id}-preset-${p.id}`, 'aria-pressed': 'false' }, p.label);
    page.chips.append(b);
    return b;
  });

  const juliaHost = h('div', { id: `${spec.id}-julia-host` });
  const juliaNote = h('p', { class: 'muted', id: `${spec.id}-julia-note` });
  const side = h('div', { class: 'julia-side', id: `${spec.id}-side` },
    h('p', { class: 'muted' }, 'Julia set of the c under the pointer, or of the orange point. Blue stayed. Orange left.'),
    juliaHost,
    juliaNote);
  const pair = h('div', { class: 'set-pair', id: `${spec.id}-pair` });
  page.stage.replaceWith(pair);
  pair.append(page.stage, side);
  const loopHost = h('div', { id: `${spec.id}-loop-host` });
  page.readout.after(loopHost);
  if (spec.filmId) loopHost.after(h('div', { id: `${spec.id}-film-slot`, 'data-film-slot': '' }));

  const stepControl = mountStepControl(page.step.host, {
    id: `${spec.id}-step`,
    min: 1e-5,
    max: 0.2,
    value: 0.08,
    legend: 'Loop step',
    label: 'Fraction of the loop each second, and the nudge',
    onChange: () => { if (tools) tools.noteStep(); },
  });

  function shownC() {
    return hover || state.c;
  }

  function writeReadout() {
    const orbit = tools ? tools.settle(state.z) : null;
    const period = criticalPeriod(state.c);
    const critical = juliaWalk({ re: 0, im: 0 }, state.c, 48, 4);
    const piece = critical.escaped
      ? 'Dust. The orbit of 0 left, so the Julia set is not one piece.'
      : 'Connected. The orbit of 0 stayed, so the Julia set is one piece. Theorem 4.2.11.';
    let periodLine = '';
    if (!period.bounded) periodLine = 'The orbit of 0 left. Period 0.';
    else if (period.period == null) periodLine = 'The orbit of 0 stayed, and no cycle of length 32 or less showed up.';
    else if (period.period === 1) periodLine = 'Period 1. A fixed point attracts. That is the main cardioid of Theorem 4.2.20.';
    else periodLine = `Period ${period.period}. The orbit of 0 fell into a cycle of that length.`;
    const lines = [
      `c = ${fmtCart(state.c)}`,
      piece,
      periodLine,
    ];
    if (hover) lines.push(`Pointer c = ${fmtCart(hover)}. The orange point is still ${fmtCart(state.c)}.`);
    if (orbit) lines.push(orbitSentence(orbit));
    page.readout.textContent = lines.filter(Boolean).join('\n');
    juliaNote.textContent = piece;
    if (document.activeElement !== reInput) reInput.value = showNum(state.c.re);
    if (document.activeElement !== imInput) imInput.value = showNum(state.c.im);
    presetButtons.forEach((b, i) => {
      const p = spec.presets[i];
      const on = !hover && Math.hypot(p.re - state.c.re, p.im - state.c.im) < 1e-3;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (tools && !tools.isPlaying()) tools.refreshNudges();
    if (spec.filmId && (!tools || !tools.isPlaying())) {
      publishFilmParams(el, spec.filmId, { re: state.c.re, im: state.c.im });
    }
  }

  function showNum(v) {
    const step = stepControl.get();
    const digits = Math.min(8, Math.max(3, Math.ceil(-Math.log10(Math.max(step, 1e-8))) + 2));
    const f = 10 ** digits;
    const n = Math.round(Number(v) * f) / f;
    return String(Object.is(n, -0) ? 0 : n);
  }

  function requestJulia(draft) {
    if (parts.juliaFractal) parts.juliaFractal.request(!!draft);
  }

  function requestMain(draft) {
    if (tools && tools.isLoop()) return;
    if (parts.fractal) parts.fractal.request(!!draft);
    if (parts.plane) parts.plane.requestDraw();
  }

  function putC(z, { draft = false } = {}) {
    if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return;
    hover = null;
    state.c = { re: z.re, im: z.im };
    if (cHandle) cHandle.set(state.c, { silent: true });
    writeReadout();
    if (parts.plane) parts.plane.requestDraw();
    if (!(tools && tools.isLoop())) requestMain(draft);
    requestJulia(draft || (tools && tools.isPlaying()));
  }

  function offJulia(z) {
    const p = parts.juliaPlane;
    if (!p) return Math.hypot(z.re, z.im) > 2.2;
    const v = p.getView();
    const halfW = v.unitsAcross / 2;
    const sz = p.getSize();
    const halfH = halfW * ((sz.h || 1) / Math.max(1, sz.w || 1));
    return Math.abs(z.re - v.center.re) > halfW * 1.05 || Math.abs(z.im - v.center.im) > halfH * 1.05;
  }

  try {
    const plane = createPlane(page.planeHost, {
      id: `${spec.id}-plane`,
      xRange: [-2.1, 1.1], yRange: [-1.4, 1.4],
      grid: 'cart', axisLabels: ['Re c', 'Im c'],
      deep: true,
      minUnitsAcross: 1e-28, maxUnitsAcross: 8, maxWidth: 720,
      ariaLabel: spec.aria,
    });
    parts.plane = plane;
    cHandle = addDragHandle(plane, {
      id: 'c', z: state.c, label: 'c', color: '--polar', radius: 8, step: 0.01, symbol: 'c', zOrder: 2,
      describe: (z) => `c = ${fmtCart(z)}.`,
    }, {
      onStart: () => { if (tools) tools.stopLoop(); },
      onMove: (z) => putC(z, { draft: true }),
      onRelease: (z) => putC(z, { draft: false }),
      onCommit: (z) => putC(z, { draft: false }),
    });
    plane.addLayer((ctx2d, p) => {
      if (spec.cardioid) {
        for (let i = 1; i < CARDIOID.length; i++) {
          drawSegment(ctx2d, p, CARDIOID[i - 1], CARDIOID[i], { color: '--polar', width: 1.5, alpha: 0.9 });
        }
      }
      const path = tools && tools.overlayPoints();
      if (path && path.length > 1) {
        const shown = path.length > 200 ? path.filter((_, i) => i % Math.ceil(path.length / 200) === 0) : path;
        for (let i = 1; i < shown.length; i++) {
          drawSegment(ctx2d, p, shown[i - 1], shown[i], { color: '--input', width: 2, alpha: 0.95 });
        }
      }
      const mark = tools && tools.marker();
      if (mark) drawDot(ctx2d, p, mark, { color: '--cart', radius: 6, halo: true });
    }, { order: 30 });
    parts.fractal = attachFractal(plane, {
      draftEdge: 200,
      get reduced() { return !!(ctx.theme && ctx.theme.prefersReducedMotion()); },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      fill: (field, w, h, y0, y1, view) => {
        mIter = iterForWidth(view.unitsAcross, 64);
        fillAutoMandelbrot(field, w, h, y0, y1, view, mIter, 4);
      },
      paint: (pixels, field, w, h, y0, y1, colours) => {
        paintJulia(pixels, field, w, h, y0, y1, mIter, colours.inside, colours.slow, colours.fast);
      },
      onStatus: ({ phase, crisp, w }) => {
        page.planeHost.dataset.fractal = phase === 'ready' || phase === 'draft' || phase === 'drawing' ? phase : 'drawing';
        if (w) page.planeHost.dataset.edge = String(w);
        page.planeHost.dataset.crisp = crisp ? '1' : '0';
        page.drawStatus.textContent = phase === 'drawing' ? 'Drawing the set…' : '';
      },
    });

    const juliaPlane = createPlane(juliaHost, {
      id: `${spec.id}-julia-plane`,
      xRange: [-2, 2], yRange: [-2, 2],
      grid: 'cart', axisLabels: ['Re', 'Im'],
      deep: true,
      minUnitsAcross: 1e-28, maxUnitsAcross: 8, maxWidth: 480,
      ariaLabel: 'Julia set of the chosen c',
    });
    parts.juliaPlane = juliaPlane;
    juliaPlane.addLayer((ctx2d, p) => {
      const orbit = tools ? tools.lastOrbit() : null;
      const pts = orbit && orbit.points ? orbit.points.slice(0, 200) : [];
      for (let i = 1; i < pts.length; i++) drawSegment(ctx2d, p, pts[i - 1], pts[i], { color: '--input', width: 2 });
      for (let i = 1; i < pts.length; i++) drawDot(ctx2d, p, pts[i], { color: '--input', radius: 3, halo: true });
      if (orbit && orbit.disk) {
        drawCircle(ctx2d, p, { re: orbit.disk.re, im: orbit.disk.im }, orbit.disk.radius, {
          color: '--input', dash: [5, 4], width: 1.5, fill: '--input', fillAlpha: 0.14,
        });
      }
    }, { order: 30 });
    parts.juliaFractal = attachFractal(juliaPlane, {
      draftEdge: 160,
      get reduced() { return !!(ctx.theme && ctx.theme.prefersReducedMotion()); },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      fill: (field, w, h, y0, y1, view) => {
        const c = shownC();
        jIter = iterForWidth(view.unitsAcross, 40);
        const R = effectiveEscape(c, ESCAPE_R);
        fillAutoJulia(field, w, h, y0, y1, view, c, jIter, R * R);
      },
      paint: (pixels, field, w, h, y0, y1, colours) => {
        paintJulia(pixels, field, w, h, y0, y1, jIter, colours.inside, colours.slow, colours.fast);
      },
    });
    plane.on('pointermove', (e) => {
      if (!e || !e.z || (tools && tools.isLoop())) return;
      if (e.dragging) return;
      hover = { re: e.z.re, im: e.z.im };
      juliaNote.textContent = `Pointer c = ${fmtCart(hover)}.`;
      requestJulia(true);
    });
    plane.canvas.addEventListener('pointerleave', () => {
      if (!hover) return;
      hover = null;
      writeReadout();
      requestJulia(false);
    });

    tools = mountSetTools({
      id: spec.id,
      host: loopHost,
      plane: () => parts.plane,
      fractal: () => parts.fractal,
      getStep: () => stepControl.get(),
      reduced: () => !!(ctx.theme && ctx.theme.prefersReducedMotion()),
      kind: 'mandelbrot',
      showMap: false,
      padLabel: 'Draw a closed path for c. The picture behind the path is this set.',
      getParam: () => state.c,
      setParam(z) { putC(z, { draft: true }); },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      stepPoint: (z) => ({
        re: z.re * z.re - z.im * z.im + state.c.re,
        im: 2 * z.re * z.im + state.c.im,
      }),
      escapes: (z) => z.re * z.re + z.im * z.im > 4,
      offScreen: offJulia,
      nudges: [
        {
          input: reInput, id: `${spec.id}-nudge-re`, label: 'Real part of c', min: -2, max: 2,
          get: () => state.c.re,
          set: (v) => { if (tools) tools.stopLoop(); putC({ re: v, im: state.c.im }); },
        },
        {
          input: imInput, id: `${spec.id}-nudge-im`, label: 'Imaginary part of c', min: -2, max: 2,
          get: () => state.c.im,
          set: (v) => { if (tools) tools.stopLoop(); putC({ re: state.c.re, im: v }); },
        },
      ],
      zFields: true,
      fields: page.fields,
      zName: 'z₀',
      zMin: -2,
      zMax: 2,
      getZ: () => state.z,
      setZ: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        if (parts.juliaPlane) parts.juliaPlane.requestDraw();
      },
      onTick: () => {
        if (parts.plane) parts.plane.requestDraw();
        requestJulia(true);
      },
      onPause: () => {
        if (spec.filmId) publishFilmParams(el, spec.filmId, { re: state.c.re, im: state.c.im });
      },
      onCluster: (disk) => {
        if (!parts.juliaPlane) return;
        parts.juliaPlane.setView({
          center: { re: disk.re, im: disk.im },
          unitsAcross: Math.max(8 * disk.radius, 1e-28),
        });
      },
    });
  } catch (err) {
    console.error(`[${spec.id}] the set could not start`, err);
    page.planeHost.replaceChildren(h('p', { class: 'callout' }, 'The picture could not start in this browser.'));
  }

  function readBox() {
    const re = Number(String(reInput.value).trim().replace(/\u2212/g, '-'));
    const im = Number(String(imInput.value).trim().replace(/\u2212/g, '-'));
    if (!Number.isFinite(re) || !Number.isFinite(im)) { writeReadout(); return; }
    if (tools) tools.stopLoop();
    putC({ re, im });
  }
  reInput.addEventListener('change', readBox);
  imInput.addEventListener('change', readBox);
  (spec.presets || []).forEach((p, i) => presetButtons[i].addEventListener('click', () => {
    if (tools) tools.stopLoop();
    putC({ re: p.re, im: p.im });
  }));
  if (ctx.theme && ctx.theme.onThemeChange) {
    parts.offTheme = ctx.theme.onThemeChange(() => {
      requestMain(false);
      requestJulia(false);
    });
  }
  writeReadout();
  if (parts.fractal) parts.fractal.request(false);
  if (parts.juliaFractal) parts.juliaFractal.request(false);

  const api = {
    setC(re, im) { putC({ re: Number(re), im: Number(im) }); },
    getC: () => ({ re: state.c.re, im: state.c.im }),
    generation: () => (parts.fractal ? parts.fractal.generation() : 0),
    phase: () => (parts.fractal ? parts.fractal.phase() : 'missing'),
    presents: () => (tools ? tools.presents() : 0),
    loopOn: () => !!(tools && tools.isLoop()),
    loopPlaying: () => !!(tools && tools.isPlaying()),
    hint: () => (tools ? tools.hint() : ''),
    varNames: () => (tools ? tools.varNames() : []),
  };
  const mv = (window.__mv = window.__mv || {});
  mv[spec.id] = api;

  return function unmount() {
    if (tools) tools.destroy();
    if (parts.offTheme) parts.offTheme();
    if (parts.juliaFractal) parts.juliaFractal.destroy();
    if (parts.fractal) parts.fractal.destroy();
    if (parts.juliaPlane) parts.juliaPlane.destroy();
    if (parts.plane) parts.plane.destroy();
    page.releaseStyle();
    if (window.__mv && window.__mv[spec.id] === api) delete window.__mv[spec.id];
  };
}
