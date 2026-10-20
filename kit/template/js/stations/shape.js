// One parameter, one 2×2, one square.
// action rotate, stretch, or shear, or a blend of sample matrices. No eval.
// The green square is the input. The purple square is the image. The hand drags t.

import { h } from '../core/dom.js';
import { cssVar, onThemeChange } from '../core/theme.js';
import { problemsOnStation } from '../registry.js';
import { stationHeader, stationFooter } from '../components/chrome.js';
import { problemCard } from '../components/practice-card.js';

function near(a, b) {
  return Math.abs(a - b) < 1e-6;
}

export function matrixAt(viz, t) {
  if (viz.action === 'rotate') {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return [[c, -s], [s, c]];
  }
  if (viz.action === 'stretch') return [[t, 0], [0, t]];
  if (viz.action === 'shear') return [[1, t], [0, 1]];
  const list = [...(viz.samples || [])].filter((s) => s && Number.isFinite(s.t) && s.m).sort((a, b) => a.t - b.t);
  if (!list.length) return [[1, 0], [0, 1]];
  if (t <= list[0].t) return list[0].m;
  const last = list[list.length - 1];
  if (t >= last.t) return last.m;
  let i = 0;
  while (i < list.length - 1 && t > list[i + 1].t) i += 1;
  const a = list[i];
  const b = list[i + 1];
  const u = (t - a.t) / ((b.t - a.t) || 1);
  return [0, 1].map((r) => [0, 1].map((c) => a.m[r][c] * (1 - u) + b.m[r][c] * u));
}

export function imageIsSquare(m) {
  const a = m[0][0];
  const b = m[0][1];
  const c = m[1][0];
  const d = m[1][1];
  const u = Math.hypot(a, c);
  const v = Math.hypot(b, d);
  if (u < 1e-6 || v < 1e-6) return false;
  const dot = a * b + c * d;
  return Math.abs(u - v) / Math.max(u, v) < 0.08 && Math.abs(dot) / (u * v) < 0.08;
}

function claimText(viz, t, square) {
  const claim = viz.claim;
  if (!claim || typeof claim.whenTrue !== 'string' || typeof claim.whenFalse !== 'string') return viz.sentence || '';
  if (claim.test === 'image-square') return square ? claim.whenTrue : claim.whenFalse;
  if (claim.test === 'near') {
    const tol = Number.isFinite(claim.tol) ? claim.tol : 0.05;
    return Math.abs(t - Number(claim.value)) <= tol ? claim.whenTrue : claim.whenFalse;
  }
  return viz.sentence || '';
}

function apply(m, x, y) {
  return [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y];
}

export function mount(section, ctx) {
  const station = ctx.station;
  const viz = station.viz || {};
  const min = Number.isFinite(viz.min) ? viz.min : 0;
  const max = Number.isFinite(viz.max) ? viz.max : 1;
  const span = max - min || 1;
  const presets = (Array.isArray(viz.presets) ? viz.presets : []).filter((p) => Number.isFinite(Number(p.t)));
  const state = { t: Number.isFinite(viz.start) ? viz.start : min };

  section.append(stationHeader(station, ctx));
  const frame = h('div', { class: 'plane-frame', id: `${station.id}-shape` });
  const canvas = h('canvas', {
    id: `${station.id}-canvas`,
    tabindex: '0',
    role: 'application',
    'aria-label': 'Drag the parameter. The green square is the input. The purple square is where the matrix sends it. Arrow keys move the parameter.',
  });
  frame.append(canvas);
  const readout = h('p', { class: 'readout', id: `${station.id}-readout` });
  const note = h('p', { class: 'lede', id: `${station.id}-sentence` });
  const chips = h('div', { class: 'chips', id: `${station.id}-presets`, role: 'group', 'aria-label': 'Examples' });
  const chipButtons = [];
  for (const p of presets) {
    const b = h('button', {
      type: 'button',
      class: 'chip',
      'data-preset': p.id || '',
      'aria-pressed': 'false',
    }, p.label || String(p.t));
    b.addEventListener('click', () => {
      state.t = Number(p.t);
      paint();
    });
    chipButtons.push({ b, p });
    chips.append(b);
  }
  section.append(h('section', { class: 'panel', id: `${station.id}-picture` },
    frame,
    h('p', { class: 'muted', text: 'Drag the parameter. Green is the square you started with. Purple is its image.' }),
    readout,
    note,
    chips.childElementCount ? chips : null));
  const problems = problemsOnStation(station);
  if (problems.length) {
    const deck = h('div', { class: 'stack', id: `${station.id}-problems` });
    deck.append(h('h2', { class: 'panel-title', text: 'The exercise on this picture' }));
    for (const p of problems) {
      const open = ctx.preset && ctx.preset.kind === 'problem' && ctx.preset.id === p.id;
      deck.append(problemCard(p, { hintOpen: open, showStation: false }));
    }
    section.append(deck);
  }
  const foot = stationFooter(station, ctx);
  if (foot) section.append(foot);

  const c2d = canvas.getContext('2d');
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];

  function paint() {
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 360;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    c2d.clearRect(0, 0, w, h);
    c2d.fillStyle = cssVar('--surface') || '#fff';
    c2d.fillRect(0, 0, w, h);
    const planeH = h * 0.78;
    const units = 5;
    const scale = Math.min(w, planeH) / units;
    const cx = w / 2;
    const cy = planeH / 2;
    const toPx = (x, y) => [cx + x * scale, cy - y * scale];
    c2d.strokeStyle = cssVar('--text-muted') || '#515b6c';
    c2d.lineWidth = 1.2;
    c2d.beginPath();
    c2d.moveTo(0, cy);
    c2d.lineTo(w, cy);
    c2d.moveTo(cx, 0);
    c2d.lineTo(cx, planeH);
    c2d.stroke();

    const drawPoly = (pts, colour) => {
      c2d.beginPath();
      pts.forEach(([x, y], i) => {
        const [px, py] = toPx(x, y);
        if (i === 0) c2d.moveTo(px, py);
        else c2d.lineTo(px, py);
      });
      c2d.closePath();
      c2d.strokeStyle = colour;
      c2d.lineWidth = 2.4;
      c2d.stroke();
    };
    const green = corners.map(([x, y]) => [x * 0.7, y * 0.7]);
    drawPoly(green, cssVar('--input') || '#006e53');
    const m = matrixAt(viz, state.t);
    const purple = green.map(([x, y]) => apply(m, x, y));
    drawPoly(purple, cssVar('--output') || '#9d3a8a');

    const trackY = h * 0.9;
    const pad = 36;
    const xOf = (t) => pad + ((t - min) / span) * (w - pad * 2);
    c2d.strokeStyle = cssVar('--text-muted') || '#515b6c';
    c2d.lineWidth = 1.6;
    c2d.beginPath();
    c2d.moveTo(pad, trackY);
    c2d.lineTo(w - pad, trackY);
    c2d.stroke();
    c2d.strokeStyle = cssVar('--polar') || '#a84300';
    c2d.lineWidth = 2.4;
    for (const p of presets) {
      const tick = xOf(Math.min(max, Math.max(min, Number(p.t))));
      c2d.beginPath();
      c2d.moveTo(tick, trackY - 10);
      c2d.lineTo(tick, trackY + 10);
      c2d.stroke();
    }
    const handle = xOf(Math.min(max, Math.max(min, state.t)));
    c2d.fillStyle = cssVar('--input') || '#006e53';
    c2d.beginPath();
    c2d.arc(handle, trackY, 7, 0, Math.PI * 2);
    c2d.fill();

    const square = imageIsSquare(m);
    readout.textContent = `t = ${state.t.toFixed(3)}, image = ${square ? 'square' : 'smear'}`;
    note.textContent = claimText(viz, state.t, square);
    for (const { b, p } of chipButtons) {
      b.setAttribute('aria-pressed', near(state.t, Number(p.t)) ? 'true' : 'false');
    }
  }

  function setFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const pad = 36;
    const t = (ev.clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2);
    state.t = Math.min(max, Math.max(min, min + t * span));
    paint();
  }

  on(canvas, 'pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    setFromEvent(ev);
  });
  on(canvas, 'pointermove', (ev) => {
    if (canvas.hasPointerCapture(ev.pointerId)) setFromEvent(ev);
  });
  on(canvas, 'keydown', (ev) => {
    const step = (ev.shiftKey ? 0.25 : 0.05) * span;
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      state.t = Math.min(max, Math.max(min, state.t + (ev.key === 'ArrowLeft' ? -step : step)));
      paint();
    }
  });
  on(window, 'resize', paint);
  cleanups.push(onThemeChange(paint));
  paint();
  return () => { for (const fn of cleanups) fn(); };
}
