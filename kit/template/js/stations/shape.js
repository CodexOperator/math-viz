// One parameter, one 2×2, one square.
// action rotate, stretch, stretch-x, or shear, or a blend of sample matrices. No eval.
// stretch is the same factor on both axes. stretch-x scales only x.
// The green square is the input. The purple square is the image. Blue axes are the plane.
// The hand drags t. The readout names the corner, the determinant, and whether the image is a square.

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
  if (viz.action === 'stretch-x') return [[t, 0], [0, 1]];
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

// A centered axis-aligned square is the same set of points after a quarter turn,
// so the square sits in the first quadrant and one corner is marked.
const SQUARE = [[1.15, 0.2], [1.15, 1.15], [0.2, 1.15], [0.2, 0.2]];
const WITNESS = 0;

export function imageIsSquare(m) {
  const a = m[0][0];
  const b = m[0][1];
  const c = m[1][0];
  const d = m[1][1];
  const u = Math.hypot(a, c);
  const v = Math.hypot(b, d);
  if (u < 1e-6 || v < 1e-6) return false;
  const dot = a * b + c * d;
  // Tight on purpose: a few degrees of shear is already not a spin-and-stretch.
  return Math.abs(u - v) / Math.max(u, v) < 0.02 && Math.abs(dot) / (u * v) < 0.02;
}

function apply(m, x, y) {
  return [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y];
}

function fmt(n) {
  return Object.is(n, -0) ? '0.000' : n.toFixed(3);
}

export function shapeState(viz, t) {
  const m = matrixAt(viz, t);
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const corner = apply(m, SQUARE[WITNESS][0], SQUARE[WITNESS][1]);
  return { m, det, corner, square: imageIsSquare(m) };
}

export function shapeSentence(viz, t, facts) {
  const claim = viz.claim;
  const state = facts || shapeState(viz, t);
  if (!claim || typeof claim.whenTrue !== 'string' || typeof claim.whenFalse !== 'string') return viz.sentence || '';
  if (claim.test === 'image-square') return state.square ? claim.whenTrue : claim.whenFalse;
  if (claim.test === 'det-positive') return state.det > 0.02 ? claim.whenTrue : claim.whenFalse;
  if (claim.test === 'near') {
    const tol = Number.isFinite(claim.tol) ? claim.tol : 0.05;
    return Math.abs(t - Number(claim.value)) <= tol ? claim.whenTrue : claim.whenFalse;
  }
  return viz.sentence || '';
}

export function shapeReadout(t, facts) {
  const state = facts || { det: 0, corner: [0, 0], square: false };
  return `t = ${fmt(t)}, det = ${fmt(state.det)}, corner = (${fmt(state.corner[0])}, ${fmt(state.corner[1])}), image = ${state.square ? 'square' : 'not a square'}`;
}

export function renderShape(c2d, w, h, viz, t) {
  const min = Number.isFinite(viz.min) ? viz.min : 0;
  const max = Number.isFinite(viz.max) ? viz.max : 1;
  const span = max - min || 1;
  const presets = (Array.isArray(viz.presets) ? viz.presets : []).filter((p) => Number.isFinite(Number(p.t)));
  c2d.clearRect(0, 0, w, h);
  c2d.fillStyle = cssVar('--surface') || '#fff';
  c2d.fillRect(0, 0, w, h);
  const planeH = h * 0.78;
  const units = 5;
  const scale = Math.min(w, planeH) / units;
  const cx = w / 2;
  const cy = planeH / 2;
  const toPx = (x, y) => [cx + x * scale, cy - y * scale];
  c2d.strokeStyle = cssVar('--cart') || '#0b63ad';
  c2d.lineWidth = 1.4;
  c2d.beginPath();
  c2d.moveTo(0, cy);
  c2d.lineTo(w, cy);
  c2d.moveTo(cx, 0);
  c2d.lineTo(cx, planeH);
  c2d.stroke();

  const drawPoly = (pts, colour, { dash = false, fill = false } = {}) => {
    c2d.beginPath();
    pts.forEach(([x, y], i) => {
      const [px, py] = toPx(x, y);
      if (i === 0) c2d.moveTo(px, py);
      else c2d.lineTo(px, py);
    });
    c2d.closePath();
    if (fill) {
      c2d.save();
      c2d.globalAlpha = 0.16;
      c2d.fillStyle = colour;
      c2d.fill();
      c2d.restore();
    }
    c2d.save();
    if (dash) c2d.setLineDash([7, 5]);
    c2d.strokeStyle = colour;
    c2d.lineWidth = dash ? 1.8 : 2.6;
    c2d.stroke();
    c2d.restore();
  };
  const mark = (pt, colour) => {
    const [px, py] = toPx(pt[0], pt[1]);
    c2d.fillStyle = colour;
    c2d.beginPath();
    c2d.arc(px, py, 6, 0, Math.PI * 2);
    c2d.fill();
  };
  const green = SQUARE.map(([x, y]) => [x, y]);
  const greenInk = cssVar('--input') || '#006e53';
  const purpleInk = cssVar('--output') || '#9d3a8a';
  const facts = shapeState(viz, t);
  const purple = green.map(([x, y]) => apply(facts.m, x, y));
  drawPoly(purple, purpleInk, { fill: true });
  drawPoly(green, greenInk, { dash: true });
  mark(purple[WITNESS], purpleInk);
  mark(green[WITNESS], greenInk);

  const trackY = h * 0.9;
  const pad = 36;
  const xOf = (value) => pad + ((value - min) / span) * (w - pad * 2);
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
  const handle = xOf(Math.min(max, Math.max(min, t)));
  c2d.fillStyle = cssVar('--input') || '#006e53';
  c2d.beginPath();
  c2d.arc(handle, trackY, 7, 0, Math.PI * 2);
  c2d.fill();
  return facts;
}

export function bindShapePointer(canvas, state, viz, paint) {
  const min = Number.isFinite(viz.min) ? viz.min : 0;
  const max = Number.isFinite(viz.max) ? viz.max : 1;
  const span = max - min || 1;
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  let drag = null;
  const eventT = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const pad = 36;
    const u = (ev.clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2);
    return Math.min(max, Math.max(min, min + u * span));
  };
  const hit = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const pad = 36;
    const trackY = rect.height * 0.9;
    const handleX = pad + ((Math.min(max, Math.max(min, state.t)) - min) / span) * (rect.width - pad * 2);
    const onHandle = Math.hypot(x - handleX, y - trackY) <= 18;
    const onTrack = Math.abs(y - trackY) <= 22 && x >= pad - 8 && x <= rect.width - pad + 8;
    return { onHandle, onTrack };
  };
  const follow = (ev) => {
    state.t = eventT(ev);
    paint();
  };
  on(canvas, 'pointerdown', (ev) => {
    const where = hit(ev);
    if (!where.onHandle && !where.onTrack) return;
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* a synthetic pointer has no capture */ }
    if (where.onHandle) drag = { id: ev.pointerId, moved: false, x: ev.clientX, y: ev.clientY };
    else {
      drag = { id: ev.pointerId, moved: true };
      follow(ev);
    }
  });
  on(window, 'pointermove', (ev) => {
    if (!drag || drag.id !== ev.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 4) return;
      drag.moved = true;
    }
    follow(ev);
  });
  on(window, 'pointerup', (ev) => {
    if (drag && drag.id === ev.pointerId) drag = null;
  });
  on(window, 'pointercancel', () => { drag = null; });
  on(canvas, 'keydown', (ev) => {
    const step = (ev.shiftKey ? 0.25 : 0.05) * span;
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      state.t = Math.min(max, Math.max(min, state.t + (ev.key === 'ArrowLeft' ? -step : step)));
      paint();
    }
  });
  return () => { for (const fn of cleanups) fn(); };
}

export function mount(section, ctx) {
  const station = ctx.station;
  const viz = station.viz || {};
  const min = Number.isFinite(viz.min) ? viz.min : 0;
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
    h('p', { class: 'muted', text: station.observe || 'Drag the track. Green is the square you started with. Purple is its image.' }),
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
  function paint() {
    const w = canvas.clientWidth || 640;
    const hgt = canvas.clientHeight || 360;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(hgt * dpr);
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    const facts = renderShape(c2d, w, hgt, viz, state.t);
    readout.textContent = shapeReadout(state.t, facts);
    note.textContent = shapeSentence(viz, state.t, facts);
    for (const { b, p } of chipButtons) {
      b.setAttribute('aria-pressed', near(state.t, Number(p.t)) ? 'true' : 'false');
    }
  }
  cleanups.push(bindShapePointer(canvas, state, viz, paint));
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  on(window, 'resize', paint);
  cleanups.push(onThemeChange(paint));
  paint();
  return () => { for (const fn of cleanups) fn(); };
}
