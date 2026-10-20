// n points on a circle. None of the four gestures draws this, so it lives beside the config.
// The hand presses a count. The gaps stay equal. The sentence is true only for the count the exercise asks for.

import { h } from '../core/dom.js';
import { cssVar, onThemeChange } from '../core/theme.js';
import { problemsOnStation } from '../registry.js';
import { stationHeader, stationFooter } from '../components/chrome.js';
import { problemCard } from '../components/practice-card.js';

function claimText(viz, n) {
  const claim = viz.claim;
  if (!claim || typeof claim.whenTrue !== 'string' || typeof claim.whenFalse !== 'string') return viz.sentence || '';
  if (claim.op === 'eq') return n === Number(claim.value) ? claim.whenTrue : claim.whenFalse;
  return viz.sentence || '';
}

export function mount(section, ctx) {
  const station = ctx.station;
  const viz = station.viz || {};
  const presets = (Array.isArray(viz.presets) ? viz.presets : []).filter((p) => Number.isFinite(Number(p.n)) && Number(p.n) >= 1);
  const state = { n: Number.isFinite(viz.start) ? viz.start : 5 };

  section.append(stationHeader(station, ctx));
  const frame = h('div', { class: 'plane-frame', id: `${station.id}-roots` });
  const canvas = h('canvas', {
    id: `${station.id}-canvas`,
    role: 'img',
    'aria-label': 'Equally spaced points on a circle. The chips change how many.',
  });
  frame.append(canvas);
  const readout = h('p', { class: 'readout', id: `${station.id}-readout` });
  const note = h('p', { class: 'lede', id: `${station.id}-sentence` });
  const chips = h('div', { class: 'chips', id: `${station.id}-presets`, role: 'group', 'aria-label': 'How many roots' });
  const chipButtons = [];
  for (const p of presets) {
    const b = h('button', {
      type: 'button',
      class: 'chip',
      'data-preset': p.id || '',
      'aria-pressed': 'false',
    }, p.label || String(p.n));
    b.addEventListener('click', () => {
      state.n = Number(p.n);
      paint();
    });
    chipButtons.push({ b, p });
    chips.append(b);
  }
  section.append(h('section', { class: 'panel', id: `${station.id}-picture` },
    frame,
    h('p', { class: 'muted', text: station.observe || 'Press a count. Count the gaps.' }),
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
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.32;
    c2d.strokeStyle = cssVar('--text-muted') || '#515b6c';
    c2d.lineWidth = 1.4;
    c2d.beginPath();
    c2d.arc(cx, cy, radius, 0, Math.PI * 2);
    c2d.stroke();
    const n = Math.max(1, Math.round(state.n));
    const polar = cssVar('--polar') || '#a84300';
    const output = cssVar('--output') || '#9d3a8a';
    for (let k = 0; k < n; k += 1) {
      const theta = (Math.PI * 2 * k) / n;
      const x = cx + radius * Math.cos(theta);
      const y = cy - radius * Math.sin(theta);
      c2d.strokeStyle = polar;
      c2d.lineWidth = 1.6;
      c2d.beginPath();
      c2d.moveTo(cx, cy);
      c2d.lineTo(x, y);
      c2d.stroke();
      c2d.fillStyle = output;
      c2d.beginPath();
      c2d.arc(x, y, 7, 0, Math.PI * 2);
      c2d.fill();
    }
    readout.textContent = `n = ${n}, gaps = ${n}`;
    note.textContent = claimText(viz, n);
    for (const { b, p } of chipButtons) {
      b.setAttribute('aria-pressed', n === Number(p.n) ? 'true' : 'false');
    }
  }

  on(window, 'resize', paint);
  cleanups.push(onThemeChange(paint));
  paint();
  return () => { for (const fn of cleanups) fn(); };
}
