// One point on a line. The built-in picture for a single real parameter.

import { h } from '../core/dom.js';
import { cssVar, onThemeChange } from '../core/theme.js';
import { problemsOnStation } from '../registry.js';
import { stationHeader, stationFooter } from '../components/chrome.js';
import { problemCard } from '../components/practice-card.js';

function near(a, b) {
  return Math.abs(a - b) < 1e-6;
}

export function mount(section, ctx) {
  const station = ctx.station;
  const viz = station.viz || {};
  const min = Number.isFinite(viz.min) ? viz.min : -2;
  const max = Number.isFinite(viz.max) ? viz.max : 2;
  const span = max - min || 1;
  const presets = (Array.isArray(viz.presets) ? viz.presets : []).filter((p) => Number.isFinite(Number(p.x)));
  const state = { x: Number.isFinite(viz.start) ? viz.start : 0 };
  const sentence = viz.sentence || station.observe || '';

  section.append(stationHeader(station, ctx));
  const frame = h('div', { class: 'plane-frame', id: `${station.id}-line` });
  const canvas = h('canvas', {
    id: `${station.id}-canvas`,
    tabindex: '0',
    role: 'application',
    'aria-label': 'Draggable point on a number line. Arrow keys move it. Orange ticks are the named examples.',
  });
  frame.append(canvas);
  const readout = h('p', { class: 'readout', id: `${station.id}-readout` });
  const note = h('p', { class: 'lede', id: `${station.id}-sentence`, text: sentence });
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
    h('p', { class: 'muted', text: 'Drag the dot. Arrow keys move it.' }),
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
    const y = h * 0.55;
    const pad = 36;
    const xOf = (t) => pad + ((t - min) / span) * (w - pad * 2);
    c2d.strokeStyle = cssVar('--text-muted') || '#515b6c';
    c2d.lineWidth = 1.6;
    c2d.beginPath();
    c2d.moveTo(pad, y);
    c2d.lineTo(w - pad, y);
    c2d.stroke();
    c2d.fillStyle = cssVar('--text-muted') || '#515b6c';
    c2d.font = '12px ui-monospace, monospace';
    c2d.textAlign = 'center';
    for (let t = Math.ceil(min); t <= Math.floor(max); t += 1) {
      const x = xOf(t);
      c2d.beginPath();
      c2d.moveTo(x, y - 6);
      c2d.lineTo(x, y + 6);
      c2d.stroke();
      c2d.fillText(String(t), x, y + 22);
    }
    c2d.strokeStyle = cssVar('--polar') || '#a84300';
    c2d.lineWidth = 2.4;
    for (const p of presets) {
      const tick = xOf(Math.min(max, Math.max(min, Number(p.x))));
      c2d.beginPath();
      c2d.moveTo(tick, y - 16);
      c2d.lineTo(tick, y + 16);
      c2d.stroke();
    }
    const x = xOf(Math.min(max, Math.max(min, state.x)));
    c2d.fillStyle = cssVar('--input') || '#006e53';
    c2d.beginPath();
    c2d.arc(x, y, 8, 0, Math.PI * 2);
    c2d.fill();
    readout.textContent = `x = ${state.x.toFixed(3)}`;
    for (const { b, p } of chipButtons) {
      b.setAttribute('aria-pressed', near(state.x, Number(p.x)) ? 'true' : 'false');
    }
  }

  function setFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const pad = 36;
    const t = (ev.clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2);
    state.x = Math.min(max, Math.max(min, min + t * span));
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
  return () => { for (const fn of cleanups) fn(); };
}
