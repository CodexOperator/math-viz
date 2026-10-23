// js/stations/newton.js — basins of Newton's method for a polynomial.
//
// The polynomial is the one with the roots you see. It opens as z³ − 1.
// Drag a root off that example, or off z² − 1, and the formula becomes the product.
// Drag the green guess and the walk z → z − p(z)/p'(z) is drawn on top of the basins.
//
// The page is the shared fractal layout. The iteration lives in js/core/fractal.js.

import { createPlane, drawSegment, drawDot, drawCircle, cssColor } from '../core/plane.js';
import { attachFractal } from '../core/fractal-view.js';
import { createFrame, createMotion } from '../core/anim.js';
import { mountStepControl, substepsForFrame, quantize } from '../core/stepper.js';
import { paintNewton, newtonWalk, parseCssColor } from '../core/fractal.js';
import { fillAutoNewton, iterForWidth } from '../core/deep-fill.js';
import { mountSetTools, drawParamPath } from '../core/set-tools.js';
import { orbitSentence } from '../core/orbit-settle.js';
import { tex } from '../core/katex.js';
import { fmtCart } from '../core/complex.js';
import { h, mountFractalPage, addDragHandle } from '../core/fractal-station.js';
import { NEWTON_EARLIER, NEWTON_SOURCE } from '../data/textbook.js';

const SQRT3 = Math.sqrt(3);
const UNITY = [
  { re: 1, im: 0 },
  { re: -0.5, im: SQRT3 / 2 },
  { re: -0.5, im: -SQRT3 / 2 },
];
const QUADRATIC = [
  { re: 1, im: 0 },
  { re: -1, im: 0 },
  { re: -0.5, im: SQRT3 / 2 },
];

const COLOUR_TOKEN = ['--cart', '--polar', '--output'];
const COLOUR_NAME = ['blue', 'orange', 'purple'];
const ROOT_LABEL = ['r1', 'r2', 'r3'];
const TOL2 = 1e-4;
const MAX_ITER = 24;

const PRESETS = [
  { id: 'unity', label: 'z^3 − 1', tex: 'p(z) = z^3 - 1', degree: 3, roots: UNITY },
  { id: 'quadratic', label: 'z^2 − 1', tex: 'p(z) = z^2 - 1', degree: 2, roots: QUADRATIC },
];

function rgb(token) {
  return parseCssColor(cssColor(token)) || { r: 90, g: 90, b: 90 };
}

function copyZ(z) {
  return { re: z.re, im: z.im };
}

function trimNum(x) {
  const n = Math.round(x * 1000) / 1000;
  if (Object.is(n, -0) || Math.abs(n) < 5e-4) return '0';
  return String(n);
}

function productTex(roots) {
  const factors = roots.map((z) => {
    const re = Math.abs(z.re) < 5e-4 ? 0 : z.re;
    const im = Math.abs(z.im) < 5e-4 ? 0 : z.im;
    if (im === 0) {
      if (re === 0) return 'z';
      if (re < 0) return `\\left(z+${trimNum(-re)}\\right)`;
      return `\\left(z-${trimNum(re)}\\right)`;
    }
    const imAbs = Math.abs(im);
    const imBody = Math.abs(imAbs - 1) < 5e-4 ? 'i' : `${trimNum(imAbs)}i`;
    const inside = re === 0
      ? (im < 0 ? `-${imBody}` : imBody)
      : `${trimNum(re)}${im < 0 ? '-' : '+'}${imBody}`;
    return `\\left(z-\\left(${inside}\\right)\\right)`;
  });
  return `p(z) = ${factors.join('')}`;
}

export function mount(el, ctx) {
  const token = ctx && ctx.preset && ctx.preset.kind === 'token' ? String(ctx.preset.token).toLowerCase() : '';
  const opening = PRESETS.find((p) => p.id === token) || PRESETS[0];
  const state = {
    degree: opening.degree,
    roots: opening.roots.map(copyZ),
    z: { re: 0.35, im: 0.45 },
  };

  const page = mountFractalPage(el, ctx, {
    id: 'newton',
    source: NEWTON_SOURCE,
    lede: 'The colour is which root. Orange on a pin is that root. Orange on a landing, on the flat paper, means the walk left. Landed means within 0.01.',
    ruleTitle: 'The polynomial',
    ruleText: 'p is the polynomial with the roots on the picture. One step replaces the guess by the place where the tangent line of p crosses zero. Then do it again.',
    chipLabel: 'Example polynomials',
    polynomial: true,
    pictureTitle: 'The basins',
    pictureCaption: 'Blue, orange, and purple are the three roots. Orange on a pin is that root. Green is one guess: drag it and watch the steps arrive at one of them. Drag a root and its colour moves with it.',
    earlier: NEWTON_EARLIER,
  });
  page.lede.append(document.createTextNode(' '), h('a', { href: '#paper', id: 'newton-link-paper' }, 'Open the flat paper'));
  tex(page.formula, 'z_{n+1} = z_n - \\dfrac{p(z_n)}{p\'(z_n)}', { display: true });

  const presetButtons = PRESETS.map((p) => {
    const b = h('button', { type: 'button', class: 'chip', id: `newton-preset-${p.id}`, 'aria-pressed': 'false' }, p.label);
    page.chips.append(b);
    return b;
  });

  const parts = { plane: null, fractal: null, offTheme: null };
  const handles = [null, null, null];
  let tools = null;
  let pictureIter = MAX_ITER;
  const stepHost = h('div', { id: 'newton-step-host' });
  page.chips.after(stepHost);
  const play = h('button', { type: 'button', class: 'btn', id: 'newton-play' }, 'Play the walk');
  let playing = false;
  let reveal = null;
  const walkMotion = createMotion();
  const stepControl = mountStepControl(stepHost, {
    id: 'newton-walk-step',
    min: 1e-5,
    max: 1,
    value: 1,
    legend: 'Walk step',
    label: 'Fraction of a Newton step',
    onChange: () => {
      if (parts.plane && !playing) parts.plane.requestDraw();
    },
  });
  stepControl.root.prepend(play);
  const loopHost = h('div', { id: 'newton-loop-host' });
  page.readout.after(loopHost);
  const rRe = h('input', { type: 'text', id: 'newton-r1-re', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'Real part of r1' });
  const rIm = h('input', { type: 'text', id: 'newton-r1-im', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'Imaginary part of r1' });
  const rFields = h('div', { class: 'fractal-fields', id: 'newton-fields' },
    h('div', { class: 'field' }, h('label', { for: 'newton-r1-re' }, 'Real part of r1'), rRe),
    h('div', { class: 'field' }, h('label', { for: 'newton-r1-im' }, 'Imaginary part of r1'), rIm));
  stepHost.after(rFields);
  const loopStepHost = h('div', { id: 'newton-loop-step-host' });
  rFields.after(loopStepHost);
  const loopStep = mountStepControl(loopStepHost, {
    id: 'newton-loop-step',
    min: 1e-5,
    max: 0.2,
    value: 0.08,
    legend: 'Loop step',
    label: 'Fraction of the loop each second, and the nudge',
    onChange: () => { if (tools) tools.noteStep(); },
  });

  function liveRoots() {
    return state.roots.slice(0, state.degree).map(copyZ);
  }

  function newtonStepPoint(z) {
    const roots = liveRoots();
    let sx = 0;
    let sy = 0;
    for (let k = 0; k < roots.length; k++) {
      const dx = z.re - roots[k].re;
      const dy = z.im - roots[k].im;
      const d2 = dx * dx + dy * dy;
      if (d2 <= TOL2) return { re: z.re, im: z.im };
      sx += dx / d2;
      sy += -dy / d2;
    }
    const s2 = sx * sx + sy * sy;
    if (!(s2 > 1e-18) || !Number.isFinite(s2)) return { re: NaN, im: NaN };
    return { re: z.re - sx / s2, im: z.im + sy / s2 };
  }

  function matchedPreset() {
    return PRESETS.find((p) => p.degree === state.degree && p.roots.slice(0, p.degree).every((r, k) => Math.hypot(r.re - state.roots[k].re, r.im - state.roots[k].im) < 1e-6)) || null;
  }

  function writePoly() {
    const named = matchedPreset();
    tex(page.poly, named ? named.tex : productTex(liveRoots()), { display: true });
  }

  function writeReadout() {
    const roots = liveRoots();
    const lines = [];
    roots.forEach((r, i) => {
      lines.push(`${ROOT_LABEL[i]} = ${fmtCart(r)}   ${COLOUR_NAME[i]}`);
    });
    const walk = newtonWalk(state.z, roots, MAX_ITER, TOL2);
    lines.push(`guess z = ${fmtCart(state.z)}`);
    if (walk.root >= 0) lines.push(`reaches the ${COLOUR_NAME[walk.root]} root (${ROOT_LABEL[walk.root]}) in ${walk.steps} steps`);
    else lines.push(`has not reached a root after ${walk.steps} steps`);
    const orbit = tools ? tools.settle(state.z) : null;
    if (orbit) lines.push(orbitSentence(orbit));
    page.readout.textContent = lines.join('\n');
    const rootDigits = Math.min(8, Math.max(3, Math.ceil(-Math.log10(Math.max(stepControl.get(), 1e-8))) + 2));
    const showRoot = (x) => {
      const f = 10 ** rootDigits;
      const n = Math.round(x * f) / f;
      return String(Object.is(n, -0) ? 0 : n);
    };
    if (document.activeElement !== rRe) rRe.value = showRoot(state.roots[0].re);
    if (document.activeElement !== rIm) rIm.value = showRoot(state.roots[0].im);
    if (tools && !tools.isPlaying()) tools.refreshNudges();
    PRESETS.forEach((p, i) => {
      presetButtons[i].setAttribute('aria-pressed', matchedPreset() === p ? 'true' : 'false');
    });
  }

  const textFrame = createFrame();

  function requestPicture() {
    if (parts.fractal) parts.fractal.request(false);
    if (parts.plane) parts.plane.requestDraw();
  }

  function paintText() {
    writeReadout();
    writePoly();
  }

  function moveRoot(i, z, drag) {
    state.roots[i] = { re: z.re, im: z.im };
    if (drag) {
      // The formula is typeset on release. During the drag the readout and the coarse picture share one frame.
      textFrame.arm(writeReadout);
      if (parts.fractal) parts.fractal.request(true);
      if (parts.plane) parts.plane.requestDraw();
      return;
    }
    textFrame.stop();
    paintText();
    requestPicture();
  }

  function applyRoots(roots, degree) {
    state.degree = degree;
    for (let i = 0; i < 3; i++) {
      if (roots[i]) state.roots[i] = copyZ(roots[i]);
      if (handles[i]) {
        handles[i].hidden = i >= state.degree;
        if (roots[i]) handles[i].set(state.roots[i], { silent: true });
      }
    }
    writeReadout();
    writePoly();
    requestPicture();
  }

  try {
    const plane = createPlane(page.planeHost, {
      id: 'newton-plane',
      xRange: [-2, 2], yRange: [-2, 2],
      grid: 'cart', axisLabels: ['Re', 'Im'],
      deep: true,
      minUnitsAcross: 1e-28, maxUnitsAcross: 10, maxWidth: 720,
      ariaLabel: 'Basins of Newton’s method. Drag a root to move its basin, or drag the green guess to see its walk',
    });
    parts.plane = plane;
    for (let i = 0; i < 3; i++) {
      handles[i] = addDragHandle(plane, {
        id: `r${i + 1}`,
        z: state.roots[i],
        label: ROOT_LABEL[i],
        color: COLOUR_TOKEN[i],
        radius: 8,
        step: 0.05,
        symbol: ROOT_LABEL[i],
        zOrder: 1,
      }, {
        onStart: () => { if (tools) tools.stopLoop(); },
        onMove: (z) => moveRoot(i, z, true),
        onRelease: (z) => moveRoot(i, z, false),
        onCommit: (z) => moveRoot(i, z, false),
      });
      handles[i].hidden = i >= state.degree;
    }
    addDragHandle(plane, {
      id: 'z', z: state.z, label: 'z', color: '--input', radius: 7, step: 0.05,
    }, {
      onStart: () => { if (tools) tools.stopLoop(); },
      onMove: (z) => {
        state.z = { re: z.re, im: z.im };
        textFrame.arm(writeReadout);
        plane.requestDraw();
      },
      onRelease: (z) => {
        state.z = { re: z.re, im: z.im };
        textFrame.stop();
        writeReadout();
        plane.requestDraw();
      },
      onCommit: (z) => {
        state.z = { re: z.re, im: z.im };
        textFrame.stop();
        writeReadout();
        plane.requestDraw();
      },
    });
    plane.addLayer((ctx2d, p) => {
      const orbit = tools ? tools.lastOrbit() : null;
      const pts = orbit && orbit.points ? orbit.points.slice(0, 200) : [];
      const limit = reveal == null ? pts.length - 1 : Math.min(pts.length - 1, reveal);
      const whole = Math.floor(limit + 1e-9);
      const frac = limit - whole;
      for (let i = 1; i <= whole && i < pts.length; i++) drawSegment(ctx2d, p, pts[i - 1], pts[i], { color: '--input', width: 2.5, alpha: 0.95 });
      if (frac > 1e-4 && whole + 1 < pts.length) {
        const a = pts[whole];
        const b = pts[whole + 1];
        drawSegment(ctx2d, p, a, { re: a.re + (b.re - a.re) * frac, im: a.im + (b.im - a.im) * frac }, { color: '--input', width: 2.5, alpha: 0.95 });
      }
      for (let i = 1; i <= whole && i < pts.length; i++) drawDot(ctx2d, p, pts[i], { color: '--input', radius: 3.5, halo: true });
      if (orbit && orbit.disk && reveal == null) {
        drawCircle(ctx2d, p, { re: orbit.disk.re, im: orbit.disk.im }, orbit.disk.radius, {
          color: '--input', dash: [5, 4], width: 1.5, fill: '--input', fillAlpha: 0.12,
        });
      }
      drawParamPath(ctx2d, p, tools && tools.overlayPoints(), '--cart');
    }, { order: 30 });

    parts.fractal = attachFractal(plane, {
      draftEdge: 220,
      get reduced() { return !!(ctx.theme && ctx.theme.prefersReducedMotion()); },
      colours: () => ({
        basins: COLOUR_TOKEN.slice(0, state.degree).map(rgb),
        none: rgb('--t0'),
      }),
      sample: () => liveRoots(),
      fill: (field, w, h, y0, y1, view, roots) => {
        pictureIter = iterForWidth(view.unitsAcross, MAX_ITER);
        fillAutoNewton(field, w, h, y0, y1, view, roots, pictureIter, TOL2);
      },
      paint: (pixels, field, w, h, y0, y1, colours) => {
        paintNewton(pixels, field, w, h, y0, y1, colours);
      },
      onStatus: ({ phase, crisp, w }) => {
        page.planeHost.dataset.fractal = phase === 'ready' || phase === 'draft' || phase === 'drawing' ? phase : 'drawing';
        if (w) page.planeHost.dataset.edge = String(w);
        page.planeHost.dataset.crisp = crisp ? '1' : '0';
        page.drawStatus.textContent = phase === 'drawing' ? 'Drawing the basins…' : '';
      },
    });
    tools = mountSetTools({
      id: 'newton',
      host: loopHost,
      plane: () => parts.plane,
      fractal: () => parts.fractal,
      getStep: () => loopStep.get(),
      reduced: () => !!(ctx.theme && ctx.theme.prefersReducedMotion()),
      kind: 'newton',
      showMap: false,
      ink: '--cart',
      mark: 'dot',
      padLabel: 'Draw a closed path for the blue root. The Mandelbrot set is the map of c, so it is not drawn here.',
      getParam: () => state.roots[0],
      setParam(z) {
        state.roots[0] = { re: Number(z.re), im: Number(z.im) };
        if (handles[0]) handles[0].set(state.roots[0], { silent: true });
        writeReadout();
        if (!tools.isPlaying()) writePoly();
        if (parts.plane) parts.plane.requestDraw();
      },
      roots: () => liveRoots(),
      tol2: TOL2,
      colours: () => ({
        basins: COLOUR_TOKEN.slice(0, state.degree).map(rgb),
        none: rgb('--t0'),
      }),
      stepPoint: newtonStepPoint,
      screen: true,
      nudges: [
        {
          input: rRe, id: 'newton-nudge-re', label: 'Real part of r1', min: -4, max: 4,
          get: () => state.roots[0].re,
          set: (v) => {
            if (tools) tools.stopLoop();
            moveRoot(0, { re: v, im: state.roots[0].im }, false);
          },
        },
        {
          input: rIm, id: 'newton-nudge-im', label: 'Imaginary part of r1', min: -4, max: 4,
          get: () => state.roots[0].im,
          set: (v) => {
            if (tools) tools.stopLoop();
            moveRoot(0, { re: state.roots[0].re, im: v }, false);
          },
        },
      ],
      zFields: true,
      fields: rFields,
      zName: 'z₀',
      zMin: -4,
      zMax: 4,
      getZ: () => state.z,
      setZ: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        if (parts.plane) parts.plane.requestDraw();
      },
      onOrbit: () => {
        writeReadout();
        if (parts.plane) parts.plane.requestDraw();
      },
      onLoop: (on) => {
        if (!on) return;
        walkMotion.cancel();
        playing = false;
        reveal = null;
        play.textContent = (ctx.theme && ctx.theme.prefersReducedMotion()) ? 'One step' : 'Play the walk';
      },
      onPause: () => writePoly(),
    });
  } catch (err) {
    console.error('[newton] the picture could not start', err);
    page.planeHost.replaceChildren(h('p', { class: 'callout' }, 'The picture could not start in this browser.'));
  }

  function readRootBox() {
    const re = Number(String(rRe.value).trim().replace(/\u2212/g, '-'));
    const im = Number(String(rIm.value).trim().replace(/\u2212/g, '-'));
    if (!Number.isFinite(re) || !Number.isFinite(im)) { writeReadout(); return; }
    if (tools) tools.stopLoop();
    moveRoot(0, { re, im }, false);
  }
  rRe.addEventListener('change', readRootBox);
  rIm.addEventListener('change', readRootBox);
  PRESETS.forEach((p, i) => presetButtons[i].addEventListener('click', () => {
    if (tools) tools.stopLoop();
    applyRoots(p.roots, p.degree);
  }));
  play.addEventListener('click', () => {
    if (tools && tools.isLoop()) tools.stopLoop();
    const reduced = !!(ctx.theme && ctx.theme.prefersReducedMotion());
    if (playing) {
      walkMotion.cancel();
      playing = false;
      play.textContent = reduced ? 'One step' : 'Play the walk';
      if (parts.plane) parts.plane.requestDraw();
      return;
    }
    if (reduced) {
      const q = stepControl.get();
      const cap = Math.max(2, (tools && tools.lastOrbit() ? tools.lastOrbit().points.length : 2) - 1);
      reveal = reveal == null ? q : Math.min(cap, quantize(reveal + q, q));
      if (reveal >= cap) reveal = null;
      play.textContent = 'One step';
      if (parts.plane) parts.plane.requestDraw();
      return;
    }
    playing = true;
    reveal = 0;
    play.textContent = 'Pause';
    walkMotion.drive((dtMs) => {
      if (!playing) return false;
      const q = stepControl.get();
      const plan = substepsForFrame({ dtMs, step: q, ratePerSec: 1.4 });
      const cap = Math.max(2, (tools && tools.lastOrbit() ? tools.lastOrbit().points.length : 2) - 1);
      reveal = Math.min(cap, quantize((reveal || 0) + plan.advanced, q));
      if (parts.plane) parts.plane.requestDraw();
      if (reveal >= cap - 1e-9) {
        playing = false;
        reveal = null;
        play.textContent = 'Play the walk';
        if (parts.plane) parts.plane.requestDraw();
        return false;
      }
      return true;
    });
  });

  if (ctx.theme && ctx.theme.onThemeChange) {
    parts.offTheme = ctx.theme.onThemeChange(() => requestPicture());
  }

  writeReadout();
  writePoly();
  if (parts.fractal) parts.fractal.request(false);

  const api = {
    setRoot(index, re, im) {
      const i = index | 0;
      if (i < 0 || i >= state.degree || !handles[i]) return;
      handles[i].set({ re: Number(re), im: Number(im) });
    },
    setDegree(n) { applyRoots(state.roots, n === 2 ? 2 : 3); },
    getRoots: () => liveRoots(),
    generation: () => (parts.fractal ? parts.fractal.generation() : 0),
    phase: () => (parts.fractal ? parts.fractal.phase() : 'missing'),
    presents: () => (tools ? tools.presents() : 0),
    loopOn: () => !!(tools && tools.isLoop()),
    loopPlaying: () => !!(tools && tools.isPlaying()),
    hint: () => (tools ? tools.hint() : ''),
    varNames: () => (tools ? tools.varNames() : []),
  };
  const mv = (window.__mv = window.__mv || {});
  mv.newton = api;

  return function unmount() {
    walkMotion.cancel();
    textFrame.stop();
    if (tools) tools.destroy();
    if (parts.offTheme) parts.offTheme();
    if (parts.fractal) parts.fractal.destroy();
    if (parts.plane) parts.plane.destroy();
    page.releaseStyle();
    if (window.__mv && window.__mv.newton === api) delete window.__mv.newton;
  };
}
