#!/usr/bin/env node
// Write the source of one custom station beside a config.
// Scaffold copies that file into the site. Editing the output folder does not last.

import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATION_ID = /^[a-z0-9][a-z0-9-]*$/;
const SHELL_STATIONS = new Set(['home', 'reading', 'addresses', 'number-line', 'graph', 'shape', 'deck', 'practice']);

export const STAMP_OPEN_LINE = 'export const STAMP_OPEN = true;';

function parseArgs(argv) {
  const out = { id: null, config: null, force: false, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--id') out.id = argv[++i];
    else if (a === '--config') out.config = argv[++i];
    else if (a === '--force') out.force = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return out;
}

function help() {
  return `Usage: node kit/stamp-station.mjs --id <station-id> --config <study-site.config.json> [--force]

Writes stations/<id>.js next to the config. Draw the lesson in drawLesson, then delete
the STAMP_OPEN line. Scaffold copies the file. It does not draw the picture.
--force replaces a picture source that is already there.`;
}

export function stampSource(id) {
  return `// Picture for ${id}. The config only points here.
// Draw the lesson in drawLesson, then delete the STAMP_OPEN line.
// Until that line is gone, this stop is unfinished and the batch is not done.
// One gesture: drag the point, or press a chip. Chips stay pressed only while the value matches.
// Blue, orange, green, and purple keep the colour key. Do not add a second control.

import { h } from '../core/dom.js';
import { cssVar, onThemeChange } from '../core/theme.js';
import { problemsOnStation } from '../registry.js';
import { stationHeader, stationFooter } from '../components/chrome.js';
import { problemCard } from '../components/practice-card.js';

${STAMP_OPEN_LINE}

function near(a, b) {
  return Math.abs(a - b) < 1e-6;
}

// Replace the body. The dot below only proves the page can load.
// state.x is the dragged number. state.y runs from 0 at the top to 1 at the bottom.
// cssVar('--cart') blue, --polar orange, --input green, --output purple.
// Make the sentence false of some other state, for example:
//   els.note.textContent = state.x > 0 ? 'Positive.' : 'Not positive.';
export function drawLesson(c2d, w, h, state, els) {
  const span = state.max - state.min || 1;
  const pad = 36;
  const x = pad + ((state.x - state.min) / span) * (w - pad * 2);
  const y = pad + state.y * (h - pad * 2);
  c2d.fillStyle = cssVar('--input') || '#006e53';
  c2d.beginPath();
  c2d.arc(x, y, 8, 0, Math.PI * 2);
  c2d.fill();
  void els;
}

export function mount(section, ctx) {
  const station = ctx.station;
  const viz = station.viz || {};
  const min = Number.isFinite(viz.min) ? viz.min : -2;
  const max = Number.isFinite(viz.max) ? viz.max : 2;
  const presets = (Array.isArray(viz.presets) ? viz.presets : []).filter((p) => Number.isFinite(Number(p.x)));
  const sentence = viz.sentence || station.observe || '';
  const state = { x: Number.isFinite(viz.start) ? viz.start : 0, y: 0.5, min, max };
  const els = { note: null, sentence };

  section.append(stationHeader(station, ctx));
  const frame = h('div', { class: 'plane-frame', id: \`\${station.id}-picture-frame\` });
  const canvas = h('canvas', {
    id: \`\${station.id}-canvas\`,
    tabindex: '0',
    role: 'application',
    'aria-label': 'Draggable picture. Arrow keys move the point. Chips jump to named examples.',
  });
  frame.append(canvas);
  const readout = h('p', { class: 'readout', id: \`\${station.id}-readout\` });
  els.note = h('p', { class: 'lede', id: \`\${station.id}-sentence\`, text: sentence });
  const chips = h('div', { class: 'chips', id: \`\${station.id}-presets\`, role: 'group', 'aria-label': 'Examples' });
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
  section.append(h('section', { class: 'panel', id: \`\${station.id}-picture\` },
    frame,
    h('p', { class: 'muted', text: 'Drag the point. Arrow keys move it.' }),
    readout,
    els.note,
    chips.childElementCount ? chips : null));
  const problems = problemsOnStation(station);
  if (problems.length) {
    const deck = h('div', { class: 'stack', id: \`\${station.id}-problems\` });
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
    drawLesson(c2d, w, h, state, els);
    readout.textContent = \`x = \${state.x.toFixed(3)}\`;
    for (const { b, p } of chipButtons) {
      b.setAttribute('aria-pressed', near(state.x, Number(p.x)) ? 'true' : 'false');
    }
  }

  function setFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const pad = 36;
    const span = max - min || 1;
    const t = (ev.clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2);
    state.x = Math.min(max, Math.max(min, min + t * span));
    state.y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / Math.max(1, rect.height)));
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
    const step = (ev.shiftKey ? 0.5 : 0.1) * ((max - min) / 4 || 0.1);
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
`;
}

export async function stampStation({ id, configDir, force = false }) {
  if (typeof id !== 'string' || !STATION_ID.test(id)) {
    throw new Error(`station id "${id}" must be a lowercase slug`);
  }
  if (SHELL_STATIONS.has(id)) throw new Error(`${id} is a shell station. Pick another id.`);
  if (!configDir) throw new Error('stamp needs the folder that holds the config');
  const dir = join(resolve(configDir), 'stations');
  const file = join(dir, `${id}.js`);
  await mkdir(dir, { recursive: true });
  let exists = false;
  try {
    await stat(file);
    exists = true;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (exists && !force) throw new Error(`${file} already exists. Pass --force to replace the picture source.`);
  await writeFile(file, stampSource(id));
  return file;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv); }
  catch (err) {
    console.error(err.message);
    console.error(help());
    process.exit(1);
  }
  if (args.help || !args.id || !args.config) {
    console.log(help());
    process.exit(args.help ? 0 : 1);
  }
  const configDir = dirname(resolve(args.config));
  let parent = null;
  try { parent = await stat(configDir); } catch { parent = null; }
  if (!parent || !parent.isDirectory()) {
    console.error(`No folder for ${args.config}. Create the course folder first.`);
    process.exit(1);
  }
  try {
    const file = await stampStation({ id: args.id, configDir, force: args.force });
    console.log(`Wrote ${file}`);
    console.log(`In the config, set kind "custom" and module "./stations/${args.id}.js".`);
    console.log('Then draw the lesson in drawLesson and delete the STAMP_OPEN line.');
    console.log('Scaffold copies this file. An edit made only in the output folder is discarded.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
