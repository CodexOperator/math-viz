// Drag x. The purple mark is f(x). A number line cannot say this.
// fn is data: poly (coefficients, constant first), abs, or arg. No eval.

import { h } from '../core/dom.js';
import { cssVar, onThemeChange } from '../core/theme.js';
import { syncCanvas, createFrame } from '../core/anim.js';
import { problemsOnStation } from '../registry.js';
import { stationHeader, stationFooter } from '../components/chrome.js';
import { problemCard } from '../components/practice-card.js';

function near(a, b) {
  return Math.abs(a - b) < 1e-6;
}

export function evalGraph(fn, poly, x) {
  if (fn === 'abs') return Math.abs(x);
  if (fn === 'arg') return Math.atan2(Math.sin(x), Math.cos(x));
  const coef = Array.isArray(poly) && poly.length ? poly : [0];
  let y = 0;
  let p = 1;
  for (const c of coef) {
    y += Number(c) * p;
    p *= x;
  }
  return y;
}

function claimText(viz, y) {
  const claim = viz.claim;
  if (!claim || typeof claim.whenTrue !== 'string' || typeof claim.whenFalse !== 'string') return viz.sentence || '';
  const v = Number(claim.value);
  const tol = Number.isFinite(claim.tol) ? claim.tol : 1e-6;
  let holds = false;
  if (claim.op === 'gt') holds = y > v;
  else if (claim.op === 'lt') holds = y < v;
  else if (claim.op === 'eq') holds = Math.abs(y - v) <= tol;
  else return viz.sentence || '';
  return holds ? claim.whenTrue : claim.whenFalse;
}

export function mount(section, ctx) {
  const station = ctx.station;
  const viz = station.viz || {};
  const fn = viz.fn || 'poly';
  const min = Number.isFinite(viz.min) ? viz.min : -2;
  const max = Number.isFinite(viz.max) ? viz.max : 2;
  const span = max - min || 1;
  const presets = (Array.isArray(viz.presets) ? viz.presets : []).filter((p) => Number.isFinite(Number(p.x)));
  const state = { x: Number.isFinite(viz.start) ? viz.start : 0 };

  section.append(stationHeader(station, ctx));
  const frame = h('div', { class: 'plane-frame', id: `${station.id}-graph` });
  const canvas = h('canvas', {
    id: `${station.id}-canvas`,
    tabindex: '0',
    role: 'application',
    'aria-label': 'Drag x. The purple mark is the output value. Arrow keys move x. Orange ticks are the named examples.',
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
    }, p.label || String(p.x));
    b.addEventListener('click', () => {
      state.x = Number(p.x);
      paint();
    });
    chipButtons.push({ b, p });
    chips.append(b);
  }
  section.append(h('section', { class: 'panel', id: `${station.id}-picture` },
    frame,
    h('p', { class: 'muted', text: station.observe || 'Drag x. The purple mark is the value.' }),
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
  const on = (target, type, fnName, opts) => {
    target.addEventListener(type, fnName, opts);
    cleanups.push(() => target.removeEventListener(type, fnName, opts));
  };

  function yOf(x) {
    return evalGraph(fn, viz.poly, x);
  }

  const clock = createFrame();
  let dead = false;
  function paint(drag) {
    const draw = () => { if (!dead) paintNow(); };
    if (drag === true) clock.arm(draw);
    else { clock.stop(); draw(); }
  }
  function paintNow() {
    const box = syncCanvas(canvas, c2d);
    const w = box.cssW;
    const h = box.cssH;
    c2d.clearRect(0, 0, w, h);
    c2d.fillStyle = cssVar('--surface') || '#fff';
    c2d.fillRect(0, 0, w, h);
    const pad = 36;
    const xOf = (t) => pad + ((t - min) / span) * (w - pad * 2);
    const samples = [];
    for (let i = 0; i <= 80; i += 1) samples.push(yOf(min + (span * i) / 80));
    let yMin = Math.min(...samples);
    let yMax = Math.max(...samples);
    if (fn === 'arg') {
      yMin = -Math.PI - 0.4;
      yMax = Math.PI + 0.4;
    }
    if (!(yMax > yMin)) {
      yMin -= 1;
      yMax += 1;
    }
    const ySpan = yMax - yMin;
    const yPx = (y) => pad + ((yMax - y) / ySpan) * (h - pad * 2);
    c2d.strokeStyle = cssVar('--border') || '#d8d2c4';
    c2d.lineWidth = 1;
    c2d.beginPath();
    const axisY = yPx(0);
    if (axisY > pad && axisY < h - pad) {
      c2d.moveTo(pad, axisY);
      c2d.lineTo(w - pad, axisY);
    }
    const axisX = xOf(0);
    if (min < 0 && max > 0) {
      c2d.moveTo(axisX, pad);
      c2d.lineTo(axisX, h - pad);
    }
    c2d.stroke();

    c2d.strokeStyle = cssVar('--text-muted') || '#515b6c';
    c2d.lineWidth = 1.6;
    c2d.beginPath();
    let drawing = false;
    let prev = null;
    for (let i = 0; i <= 80; i += 1) {
      const t = min + (span * i) / 80;
      const y = samples[i];
      if (prev != null && Math.abs(y - prev) > ySpan * 0.45) {
        c2d.stroke();
        c2d.beginPath();
        drawing = false;
      }
      const px = xOf(t);
      const py = yPx(y);
      if (!drawing) c2d.moveTo(px, py);
      else c2d.lineTo(px, py);
      drawing = true;
      prev = y;
    }
    c2d.stroke();

    c2d.strokeStyle = cssVar('--polar') || '#a84300';
    c2d.lineWidth = 2.4;
    for (const p of presets) {
      const tick = xOf(Math.min(max, Math.max(min, Number(p.x))));
      c2d.beginPath();
      c2d.moveTo(tick, h - pad - 14);
      c2d.lineTo(tick, h - pad + 8);
      c2d.stroke();
    }

    const x = Math.min(max, Math.max(min, state.x));
    const y = yOf(x);
    const px = xOf(x);
    const py = yPx(y);
    const base = axisY > pad && axisY < h - pad ? axisY : h - pad;
    c2d.strokeStyle = cssVar('--output') || '#9d3a8a';
    c2d.lineWidth = 1.6;
    c2d.beginPath();
    c2d.moveTo(px, base);
    c2d.lineTo(px, py);
    c2d.stroke();
    c2d.fillStyle = cssVar('--input') || '#006e53';
    c2d.beginPath();
    c2d.arc(px, base, 7, 0, Math.PI * 2);
    c2d.fill();
    c2d.fillStyle = cssVar('--output') || '#9d3a8a';
    c2d.beginPath();
    c2d.arc(px, py, 7, 0, Math.PI * 2);
    c2d.fill();

    readout.textContent = `x = ${x.toFixed(3)}, value = ${y.toFixed(3)}`;
    note.textContent = claimText(viz, y);
    for (const { b, p } of chipButtons) {
      b.setAttribute('aria-pressed', near(state.x, Number(p.x)) ? 'true' : 'false');
    }
  }

  function setFromEvent(ev, drag) {
    const rect = canvas.getBoundingClientRect();
    const pad = 36;
    const t = (ev.clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2);
    state.x = Math.min(max, Math.max(min, min + t * span));
    paint(drag);
  }

  on(canvas, 'pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    setFromEvent(ev, false);
  });
  on(canvas, 'pointermove', (ev) => {
    if (canvas.hasPointerCapture(ev.pointerId)) setFromEvent(ev, true);
  });
  on(canvas, 'pointerup', (ev) => {
    if (canvas.hasPointerCapture(ev.pointerId)) paint();
  });
  on(canvas, 'keydown', (ev) => {
    const step = (ev.shiftKey ? 0.5 : 0.1) * (span / 4);
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      state.x = Math.min(max, Math.max(min, state.x + (ev.key === 'ArrowLeft' ? -step : step)));
      paint();
    }
  });
  on(window, 'resize', paint);
  cleanups.push(onThemeChange(paint));
  paint();
  return () => { dead = true; clock.stop(); for (const fnCleanup of cleanups) fnCleanup(); };
}
