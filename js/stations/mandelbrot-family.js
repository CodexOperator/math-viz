// The Mandelbrot picture and the cardioid stop share one layout.
//
// The big picture is the set of c. The small picture is the Julia set of the
// c under the pointer, or of the orange point when the pointer is off.
// Loop runs on the big picture. The orbit until it decides is drawn on the
// small picture, because that walk lives in z, not in c.

import { createPlane, drawSegment, drawDot, cssColor } from '../core/plane.js';
import { attachFractal } from '../core/fractal-view.js';
import { paintJulia, parseCssColor, effectiveEscape } from '../core/fractal.js';
import { fillAutoJulia, fillAutoMandelbrot, iterForWidth, WIDTH_FLOOR, addressPlaces, formatZoomScalar } from '../core/deep-fill.js';
import { mountSetTools, drawParamPath, drawOrbitDisks } from '../core/set-tools.js';
import { createRenderEpoch } from '../core/render-epoch.js';
import { orbitSentence, criticalPeriod, quadraticAbsDeriv, ORBIT_PERIOD_MAX } from '../core/orbit-settle.js';
import { mountStepControl } from '../core/stepper.js';
import { tex } from '../core/katex.js';
import { h, mountFractalPage, addDragHandle } from '../core/fractal-station.js';
import { publishFilmParams } from '../core/film.js';
import { mountRenderedFilm, cardioidTurn } from '../core/rendered-film.js';

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

// The crossing's Set door names four points. Two of them collide with chips
// already on this stop: "disk" is c = 0.2, and "out" is c = 0.4. The door
// uses i, zero, quarter, and past so a hash opens the crossing's c.
const CROSS_ROUTE_C = {
  i: { re: 0, im: 1 },
  zero: { re: 0, im: 0 },
  quarter: { re: -0.2, im: 0 },
  past: { re: 0.5, im: 0 },
};

function cFromRoute(ctx, spec) {
  const base = spec.c0 ? { re: spec.c0.re, im: spec.c0.im } : { re: -0.5, im: 0 };
  const token = ctx && ctx.preset && ctx.preset.kind === 'token' ? String(ctx.preset.token).toLowerCase() : '';
  if (!token) return base;
  const chip = (spec.presets || []).find((p) => p.id === token);
  if (chip) return { re: chip.re, im: chip.im };
  if (spec.id === 'mandelbrot' && CROSS_ROUTE_C[token]) return { re: CROSS_ROUTE_C[token].re, im: CROSS_ROUTE_C[token].im };
  return base;
}

export function mountFamily(el, ctx, spec) {
  const state = {
    c: cFromRoute(ctx, spec),
    z: { re: 0, im: 0 },
  };
  let hover = null;
  let tools = null;
  const epoch = createRenderEpoch();
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
    earlier: spec.earlier,
  });
  page.lede.append(document.createTextNode(' '), h('a', { href: '#paper', id: `${spec.id}-link-paper` }, 'Open the flat paper'));
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
    h('p', { class: 'muted' }, 'Julia set of the c under the pointer, or of the orange point. Settles and stays are blue. Leaves is orange. Green is the walk from z₀.'),
    juliaHost,
    juliaNote);
  const pair = h('div', { class: 'set-pair', id: `${spec.id}-pair` });
  page.stage.replaceWith(pair);
  pair.append(page.stage, side);
  const loopHost = h('div', { id: `${spec.id}-loop-host` });
  page.readout.after(loopHost);
  const filmSlot = spec.filmId
    ? h('div', { id: `${spec.id}-film-slot`, 'data-film-slot': '', hidden: true })
    : null;
  if (filmSlot) loopHost.after(filmSlot);
  const captionEl = document.getElementById(`${spec.id}-picture-caption`);
  const liveCaption = spec.pictureCaption || '';
  function syncFilmChrome(film, mode) {
    const pageFilm = mode === 'rendered' && film && film.kind === 'page';
    if (filmSlot) filmSlot.hidden = !pageFilm;
    if (!captionEl) return;
    if (pageFilm) {
      captionEl.hidden = true;
      return;
    }
    captionEl.hidden = false;
    captionEl.textContent = mode === 'rendered' && film && film.caption ? film.caption : liveCaption;
  }
  let renderedFilm = null;
  if (spec.rendered) {
    renderedFilm = mountRenderedFilm(pair.parentElement, {
      id: spec.id,
      before: pair,
      films: spec.rendered.films,
      landscape: spec.rendered.landscape,
      portrait: spec.rendered.portrait,
      posterLand: spec.rendered.posterLand,
      posterPort: spec.rendered.posterPort,
      framesUrl: spec.rendered.frames,
      source: spec.source,
      caption: spec.rendered.caption,
      onFilm(film, mode) { syncFilmChrome(film, mode); },
      onMode(mode) {
        const film = mode === 'rendered';
        pair.hidden = film;
        page.readout.hidden = film;
        page.drawStatus.hidden = film;
        loopHost.hidden = film;
        // These edit the live picture. The film does not follow them, and a
        // return to Live replaces c with the frame, so they stay out of the way.
        page.chips.hidden = film;
        if (page.fields) page.fields.hidden = film;
        if (page.step && page.step.row) page.step.row.hidden = film;
        const row = document.getElementById(`${spec.id}-loop-row`);
        if (row) row.hidden = film;
        const panel = document.getElementById(`${spec.id}-path-panel`);
        if (panel) panel.hidden = film || !(tools && tools.isLoop());
        if (film && tools && tools.isPlaying()) tools.pause();
      },
      onSeed(c) {
        if (!c || !Number.isFinite(c.re) || !Number.isFinite(c.im)) return;
        // A logged width is the film's window. The orange point moves to that
        // centre, and the live picture opens on the same deep zoom.
        if (Number.isFinite(c.width) && c.width > 0 && parts.plane && parts.plane.setView) {
          if (tools && tools.isLoop()) tools.stopLoop();
          else if (tools && tools.isPlaying()) tools.pause();
          parts.plane.setView({
            center: { re: c.re, im: c.im },
            unitsAcross: Math.max(c.width, WIDTH_FLOOR),
          });
          putC({ re: c.re, im: c.im });
          return;
        }
        if (tools && tools.isLoop() && tools.sourceId() === 'cardioid') {
          const turn = cardioidTurn(c);
          if (turn != null) {
            tools.seek(turn);
            return;
          }
        }
        if (tools && tools.isPlaying()) tools.pause();
        putC({ re: c.re, im: c.im });
      },
    });
  }

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
    // 240 steps and a cap of 32 miss a period-70 nucleus: the screen disk then
    // names the first return that fits, which is 26. The longer probe is the
    // attracting period. The screen sentence still says when its own return
    // is not that period.
    const CRITICAL_PROBE = { maxIter: 4096, periodMax: 96 };
    const period = criticalPeriod(state.c, CRITICAL_PROBE);
    // Just outside the cusp the orbit of 0 leaves later than a short probe,
    // so a critical start that has already escaped is dust, not a fixed point.
    const criticalStart = Math.hypot(state.z.re, state.z.im) < 1e-12;
    const left = criticalStart && orbit && (orbit.reason === 'escape' || orbit.reason === 'screen' || orbit.reason === 'cusp');
    const bounded = !left && period.bounded;
    const piece = !bounded
      ? 'The orbit of 0 left, so the Julia set is dust.'
      : 'Theorem 4.9, page 113: the orbit of 0 stayed bounded, so the Julia set is one piece.';
    let periodLine = '';
    if (!bounded) periodLine = 'Period 0.';
    else if (period.parabolic) {
      periodLine = 'Period 1. Parabolic. The period-2 bulb meets the cardioid. The fixed point does not attract, so this c is not inside the main cardioid of Theorem 4.11, page 116.';
    } else if (period.period == null) periodLine = `No cycle of length ${CRITICAL_PROBE.periodMax} or less showed up.`;
    else if (period.period === 1) {
      periodLine = orbit && orbit.reason === 'closed'
        ? 'Period 1. The fixed point does not attract, so this c is not inside the main cardioid of Theorem 4.11, page 116.'
        : 'Period 1. A fixed point attracts. That is the main cardioid of Theorem 4.11, page 116.';
    }
    else periodLine = `Period ${period.period}. The cycle has ${period.period} places.`;
    if (bounded && !period.parabolic && orbit && orbit.reason !== 'bulb2' && period.period && orbit.period && orbit.period !== period.period) {
      periodLine += ` The screen disk saw a return of ${orbit.period}. It only tests periods up to ${ORBIT_PERIOD_MAX}, and ${orbit.period} is not the attracting period.`;
    }
    const lines = [
      `c = ${showCart(state.c)}`,
    ];
    if (orbit) lines.push(orbitSentence(orbit));
    lines.push(piece, periodLine);
    if (hover) lines.push(`Pointer c = ${showCart(hover)}. The orange point is still ${showCart(state.c)}.`);
    page.readout.textContent = lines.filter(Boolean).join('\n');
    if (renderedFilm) renderedFilm.setAddress(state.c);
    juliaNote.textContent = piece;
    if (document.activeElement !== reInput) reInput.value = showPart(state.c.re);
    if (document.activeElement !== imInput) imInput.value = showPart(state.c.im);
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

  function viewWidth() {
    const p = parts.plane;
    if (!p || !p.getView) return 0;
    const v = p.getView();
    return v && v.unitsAcross > 0 ? v.unitsAcross : 0;
  }

  function cPlaces() {
    const step = Math.max(stepControl.get(), 1e-8);
    const fromStep = Math.min(8, Math.max(3, Math.ceil(-Math.log10(step)) + 2));
    return addressPlaces(viewWidth(), fromStep);
  }

  function showPart(v) {
    const short = formatZoomScalar(v, cPlaces());
    // 1/4 and −3/4 are the parabolic points this picture teaches. Four decimals
    // turn 1/4 + 1e-5 into 0.25, and 0.25 is the cusp, not the outside point.
    // The sentence is about the stored c, so a short spelling that is the
    // landmark itself gives way to the stored digits. A wide-window value
    // such as 0.2585 still rounds.
    if ((short === '0.25' || short === '-0.75') && Number(short) !== v) return String(v);
    return short;
  }

  function showCart(z) {
    const re = showPart(z.re);
    const im = showPart(z.im);
    if (im === '0') return re;
    const neg = im[0] === '-';
    const absM = neg ? im.slice(1) : im;
    const coef = absM === '1' ? '' : absM;
    if (re === '0') return (neg ? '-' : '') + coef + 'i';
    return re + (neg ? ' - ' : ' + ') + coef + 'i';
  }

  function requestJulia(draft, token) {
    if (parts.juliaFractal) parts.juliaFractal.request(!!draft, token);
  }

  function requestMain(draft) {
    if (tools && tools.isLoop()) return;
    if (parts.fractal) parts.fractal.request(!!draft);
    if (parts.plane) parts.plane.requestDraw();
  }

  function homeJulia() {
    const p = parts.juliaPlane;
    if (!p || !p.getView || !p.setView) return;
    const v = p.getView();
    const center = v.center || { re: 0, im: 0 };
    if (Math.abs(v.unitsAcross - 4) < 0.02 && Math.hypot(center.re || 0, center.im || 0) < 0.02) return;
    // The cluster zoom belongs to the previous c. A new c is read on the whole set.
    p.setView({ center: { re: 0, im: 0 }, unitsAcross: 4 });
  }

  function putC(z, { draft = false, fromLoop = false } = {}) {
    if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return;
    hover = null;
    state.c = { re: z.re, im: z.im };
    if (cHandle) cHandle.set(state.c, { silent: true });
    homeJulia();
    writeReadout();
    if (fromLoop) {
      if (parts.plane) parts.plane.requestDraw();
      return;
    }
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
      describe: (z) => `c = ${showCart(z)}.`,
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
      drawParamPath(ctx2d, p, tools && tools.overlayPoints(), '--polar');
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
      const pts = orbit && orbit.points ? orbit.points.slice(-200) : [];
      for (let i = 1; i < pts.length; i++) drawSegment(ctx2d, p, pts[i - 1], pts[i], { color: '--input', width: 2 });
      for (let i = 1; i < pts.length; i++) drawDot(ctx2d, p, pts[i], { color: '--input', radius: 3, halo: true });
      drawOrbitDisks(ctx2d, p, orbit);
    }, { order: 30 });
    parts.juliaFractal = attachFractal(juliaPlane, {
      draftEdge: 160,
      worker: true,
      epoch,
      get reduced() { return !!(ctx.theme && ctx.theme.prefersReducedMotion()); },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      workerSpec(view) {
        const c = shownC();
        jIter = iterForWidth(view.unitsAcross, 40);
        const R = effectiveEscape(c, ESCAPE_R);
        return {
          kind: 'julia',
          c: { re: c.re, im: c.im },
          maxIter: jIter,
          escape2: R * R,
          colours: { inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') },
        };
      },
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
      juliaNote.textContent = `Pointer c = ${showCart(hover)}.`;
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
      epoch,
      orbitPlane: () => parts.juliaPlane,
      cancelCompanion(token) {
        if (parts.juliaFractal) parts.juliaFractal.cancel(token);
      },
      plane: () => parts.plane,
      fractal: () => parts.fractal,
      getStep: () => stepControl.get(),
      reduced: () => !!(ctx.theme && ctx.theme.prefersReducedMotion()),
      path: spec.path,
      kind: 'mandelbrot',
      showMap: false,
      padLabel: 'Draw a closed path for c. The picture behind the path is this set.',
      getParam: () => state.c,
      setParam(z, source) { putC(z, { draft: true, fromLoop: source === 'loop' }); },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      stepPoint: (z) => ({
        re: z.re * z.re - z.im * z.im + state.c.re,
        im: 2 * z.re * z.im + state.c.im,
      }),
      escapes: (z) => z.re * z.re + z.im * z.im > 4,
      quadratic: true,
      absDeriv: quadraticAbsDeriv,
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
      onOrbit: () => {
        writeReadout();
        if (parts.juliaPlane) parts.juliaPlane.requestDraw();
      },
      onTick: (_t, token) => {
        if (parts.plane) parts.plane.requestDraw();
        if (token != null) requestJulia(!!(tools && tools.isPlaying()), token);
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
    if (renderedFilm) renderedFilm.destroy();
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
