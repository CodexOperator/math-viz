// One dot, two addresses. The built-in picture for "the same object, read two ways."
// The dot is the control. Chips jump to a named example and stay lit only on that value.

import { h } from '../core/dom.js';
import { cssVar, onThemeChange } from '../core/theme.js';
import { tex } from '../core/katex.js';
import { problemById } from '../registry.js';
import { stationHeader, stationFooter } from '../components/chrome.js';
import { problemCard } from '../components/practice-card.js';

const TAU = Math.PI * 2;

function arg(z) {
  if (Math.hypot(z.re, z.im) < 1e-9) return null;
  return Math.atan2(z.im, z.re);
}

function fmt(n) {
  if (Object.is(n, -0)) return '0.000';
  return n.toFixed(3);
}

function near(a, b) {
  return Math.abs(a - b) < 1e-6;
}

function same(z, p) {
  return near(z.re, p.re) && near(z.im, p.im);
}

export function mount(section, ctx) {
  const station = ctx.station;
  const viz = station.viz || {};
  const start = viz.start || { re: 1, im: 1 };
  const presets = Array.isArray(viz.presets) ? viz.presets : [];
  const sentence = viz.sentence || station.observe || '';
  const state = { z: { re: Number(start.re) || 0, im: Number(start.im) || 0 } };

  section.append(stationHeader(station, ctx));

  const frame = h('div', { class: 'plane-frame', id: `${station.id}-plane` });
  const canvas = h('canvas', {
    id: `${station.id}-canvas`,
    tabindex: '0',
    role: 'application',
    'aria-label': 'Draggable point. Arrow keys move it. Cartesian drops are blue. The polar ray is orange.',
  });
  frame.append(canvas);

  const formula = h('div', { id: `${station.id}-formula` });
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
    }, p.label || `${p.re} + ${p.im}i`);
    b.addEventListener('click', () => {
      state.z = { re: Number(p.re) || 0, im: Number(p.im) || 0 };
      paint();
    });
    chipButtons.push({ b, p });
    chips.append(b);
  }

  section.append(h('section', { class: 'panel', id: `${station.id}-picture` },
    frame,
    h('p', { class: 'muted', text: 'Drag the dot. Arrow keys move it.' }),
    formula,
    readout,
    note,
    chips.childElementCount ? chips : null));

  const problems = (station.problems || []).map((id) => problemById(id)).filter(Boolean);
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

  function colour(name, fallback) {
    return cssVar(name) || fallback;
  }

  function metrics() {
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 480;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    const units = 8;
    const scale = w / units;
    return { w, h, scale, units };
  }

  function toPx(z, m) {
    return [m.w / 2 + z.re * m.scale, m.h / 2 - z.im * m.scale];
  }

  function fromPx(x, y, m) {
    return { re: (x - m.w / 2) / m.scale, im: (m.h / 2 - y) / m.scale };
  }

  function paint() {
    const m = metrics();
    const { w, h, scale } = m;
    c2d.clearRect(0, 0, w, h);
    c2d.fillStyle = colour('--surface', '#fff');
    c2d.fillRect(0, 0, w, h);
    c2d.lineWidth = 1;
    c2d.strokeStyle = colour('--border', '#d8d2c4');
    c2d.beginPath();
    for (let u = -4; u <= 4; u += 1) {
      const [x] = toPx({ re: u, im: 0 }, m);
      const [, y] = toPx({ re: 0, im: u }, m);
      c2d.moveTo(x, 0); c2d.lineTo(x, h);
      c2d.moveTo(0, y); c2d.lineTo(w, y);
    }
    c2d.stroke();
    c2d.strokeStyle = colour('--text-muted', '#515b6c');
    c2d.lineWidth = 1.4;
    c2d.beginPath();
    c2d.moveTo(0, h / 2); c2d.lineTo(w, h / 2);
    c2d.moveTo(w / 2, 0); c2d.lineTo(w / 2, h);
    c2d.stroke();

    const seam = colour('--seam', '#6b7384');
    c2d.save();
    c2d.setLineDash([6, 5]);
    c2d.strokeStyle = seam;
    c2d.beginPath();
    c2d.moveTo(0, h / 2);
    c2d.lineTo(w / 2, h / 2);
    c2d.stroke();
    c2d.restore();

    const [px, py] = toPx(state.z, m);
    const cart = colour('--cart', '#0b63ad');
    const polar = colour('--polar', '#a84300');
    c2d.save();
    c2d.setLineDash([5, 4]);
    c2d.strokeStyle = cart;
    c2d.lineWidth = 1.8;
    c2d.beginPath();
    c2d.moveTo(px, py); c2d.lineTo(px, h / 2);
    c2d.moveTo(px, py); c2d.lineTo(w / 2, py);
    c2d.stroke();
    c2d.restore();

    c2d.strokeStyle = polar;
    c2d.lineWidth = 2.2;
    c2d.beginPath();
    c2d.moveTo(w / 2, h / 2);
    c2d.lineTo(px, py);
    c2d.stroke();

    const theta = arg(state.z);
    if (theta != null) {
      const r = Math.min(36, Math.hypot(state.z.re, state.z.im) * scale * 0.45);
      c2d.beginPath();
      c2d.arc(w / 2, h / 2, Math.max(18, r), -theta, 0, theta > 0);
      c2d.stroke();
    }

    c2d.fillStyle = colour('--input', '#006e53');
    c2d.beginPath();
    c2d.arc(px, py, 7, 0, TAU);
    c2d.fill();
    c2d.strokeStyle = colour('--surface', '#fff');
    c2d.lineWidth = 2;
    c2d.stroke();

    const r = Math.hypot(state.z.re, state.z.im);
    const th = theta == null ? null : theta;
    const cartTex = `${fmt(state.z.re)} ${state.z.im < 0 ? '-' : '+'} ${fmt(Math.abs(state.z.im))}i`;
    const polarTex = th == null ? '0' : `${fmt(r)} e^{i ${fmt(th)}}`;
    tex(formula, `z = ${cartTex} = ${polarTex}`, { display: true });
    const jump = state.z.re < -0.05 && Math.abs(state.z.im) < 0.15;
    readout.textContent = jump
      ? `x = ${fmt(state.z.re)}, y = ${fmt(state.z.im)}, r = ${fmt(r)}, Arg is on the seam`
      : `x = ${fmt(state.z.re)}, y = ${fmt(state.z.im)}, r = ${fmt(r)}, Arg = ${th == null ? 'undefined' : fmt(th)}`;
    note.textContent = jump
      ? 'The dot is crossing the negative real axis. Arg jumps. The point does not.'
      : sentence;
    for (const { b, p } of chipButtons) {
      b.setAttribute('aria-pressed', same(state.z, { re: Number(p.re) || 0, im: Number(p.im) || 0 }) ? 'true' : 'false');
    }
  }

  function setFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const m = { w: rect.width, h: rect.height, scale: rect.width / 8 };
    state.z = fromPx(ev.clientX - rect.left, ev.clientY - rect.top, m);
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
    const step = ev.shiftKey ? 0.5 : 0.1;
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[ev.key];
    if (!move) return;
    ev.preventDefault();
    state.z = { re: state.z.re + move[0] * step, im: state.z.im + move[1] * step };
    paint();
  });
  on(window, 'resize', paint);
  cleanups.push(onThemeChange(paint));
  paint();

  return () => {
    for (const fn of cleanups) fn();
  };
}
