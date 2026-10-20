#!/usr/bin/env node
// Turn a study-site config into a folder the template can run.
// Exit 2 when the textbook is missing: ask the user. Do not guess a book.

import { readFile, writeFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = join(here, 'template');
const repoRoot = resolve(here, '..');

const BAD_TITLES = new Set([
  'ask', 'todo', 'tbd', 'unknown', 'textbook', 'your textbook', 'n/a', 'none', 'placeholder',
]);
const PALETTE_KEYS = new Set([
  'bg', 'surface', 'surface-2', 'text', 'text-muted', 'border', 'border-strong',
  'accent', 'on-accent', 'focus', 'cart', 'polar', 'input', 'output', 'seam',
  't0', 't1', 'ok', 'warn', 'danger',
]);
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const STATION_ID = /^[a-z0-9][a-z0-9-]*$/;
const PREFIX_OK = /^[A-Za-z][A-Za-z0-9._:-]{0,24}$/;
const KINDS = new Set(['map', 'reading', 'viz', 'flashcards', 'practice', 'custom']);
const TONES = new Set(['cart', 'polar', 'input', 'output', 'accent']);
const MARKS = new Set(['disc', 'ring', 'diamond']);
const VIZ = new Set(['two-addresses', 'number-line', 'graph', 'shape']);
const MAX_CONTROLS = 3;
const CUSTOM_MODULE = /^\.\/stations\/([a-z0-9][a-z0-9-]*)\.js$/;
const SHELL_STATIONS = new Set(['home', 'reading', 'addresses', 'number-line', 'graph', 'shape', 'deck', 'practice']);
const GRAPH_FN = new Set(['poly', 'abs', 'arg']);
const SHAPE_ACTION = new Set(['rotate', 'stretch', 'shear']);
const STAMP_OPEN = 'export const STAMP_OPEN = true;';

function parseArgs(argv) {
  const out = { config: null, out: null, force: false, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--config') out.config = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--force') out.force = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return out;
}

function help() {
  return `Usage: node kit/scaffold.mjs --config kit/study-site.config.example.json --out <folder> [--force]

Copies kit/template, writes js/generated/data.js from the config, copies vendor/katex,
and rewrites the title, description, footer, palette, and storage prefix.
Built-in pictures are two-addresses, number-line, graph, and shape.
A custom station copies stations/<id>.js from beside the config into the site.
An answer is { tex, text, values }. A picture has at most 3 preset chips.
Exit 2 means the textbook title is missing: ask the user. Do not guess.`;
}

// A custom picture is stations/<id>.js beside the config, copied on every scaffold.
// The matching module path is how the page imports it. A shell name would overwrite the kit.
export function customModuleName(station) {
  if (!station || station.kind !== 'custom') return null;
  const id = station.id || '?';
  const match = CUSTOM_MODULE.exec(typeof station.module === 'string' ? station.module : '');
  if (!match || match[1] !== station.id) {
    return { error: `${id} kind custom needs module "./stations/${station.id}.js", the picture file beside the config` };
  }
  if (SHELL_STATIONS.has(match[1])) {
    return { error: `${id} uses a shell station name. Stamp a new id.` };
  }
  return { file: `${match[1]}.js`, id: match[1] };
}

export function stampStillOpen(source) {
  return typeof source === 'string' && source.includes(STAMP_OPEN);
}

// A reading station is a placeholder. The picture is not there yet.
export function unfinishedReading(config) {
  return (config && config.stations || [])
    .filter((s) => s && (s.kind || 'reading') === 'reading')
    .map((s) => s.id);
}

export function textbookMissing(textbook) {
  if (!textbook || typeof textbook.title !== 'string') return true;
  const title = textbook.title.trim();
  if (title.length < 3) return true;
  if (BAD_TITLES.has(title.toLowerCase())) return true;
  return false;
}

function sourceErrors(source, label, { exercise = false } = {}) {
  const errors = [];
  if (!source || typeof source !== 'object') {
    errors.push(`${label} is missing source`);
    return errors;
  }
  if (source.chapter == null || source.chapter === '' || Number.isNaN(Number(source.chapter))) {
    errors.push(`${label} needs source.chapter`);
  }
  if (typeof source.section !== 'string' || !source.section.trim()) {
    errors.push(`${label} needs source.section`);
  }
  if (exercise && (typeof source.exercise !== 'string' || !source.exercise.trim())) {
    errors.push(`${label} needs source.exercise`);
  }
  return errors;
}

function answerErrors(answer, label) {
  const errors = [];
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    errors.push(`${label} needs answer as { tex, text, values }`);
    return errors;
  }
  if (typeof answer.tex !== 'string' || !answer.tex.trim()) errors.push(`${label} needs answer.tex`);
  if (typeof answer.text !== 'string' || !answer.text.trim()) errors.push(`${label} needs answer.text`);
  else if (/\$|\\[a-zA-Z]/.test(answer.text)) errors.push(`${label} answer.text is plain text, with no $ and no TeX`);
  if (!answer.values || typeof answer.values !== 'object' || Array.isArray(answer.values)) {
    errors.push(`${label} needs answer.values, an object of numbers ({} when there is no number)`);
  } else {
    for (const [key, value] of Object.entries(answer.values)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${label} answer.values.${key} must be a finite number`);
    }
  }
  return errors;
}

function sameSection(errors, item, label, stationsById) {
  if (!item || !item.station || !item.source) return;
  const station = stationsById.get(item.station);
  if (!station || !station.source) return;
  if (String(item.source.section) !== String(station.source.section)) {
    errors.push(`${label} section ${item.source.section} does not match station ${item.station} section ${station.source.section}`);
  }
}

export function validateConfig(config) {
  const errors = [];
  let askTextbook = false;
  if (!config || typeof config !== 'object') {
    return { errors: ['Config must be a JSON object'], askTextbook: false };
  }
  if (textbookMissing(config.textbook)) {
    askTextbook = true;
    errors.push('textbook.title is missing');
  } else if (typeof config.textbook.confidence === 'number') {
    if (config.textbook.confidence < 0 || config.textbook.confidence > 1) errors.push('textbook.confidence must be between 0 and 1');
    else if (config.textbook.confidence < 1 && (typeof config.textbook.note !== 'string' || config.textbook.note.trim().length < 20)) {
      errors.push('textbook.confidence below 1 needs a note explaining what is still uncertain');
    }
  }
  if (typeof config.siteTitle !== 'string' || !config.siteTitle.trim()) errors.push('siteTitle is required');
  if (typeof config.course !== 'string' || !config.course.trim()) errors.push('course is required');
  if (typeof config.throughline !== 'string' || !config.throughline.trim()) errors.push('throughline is required');
  if (!Array.isArray(config.maps) || config.maps.length === 0) errors.push('maps must list at least one map');
  else {
    for (const m of config.maps) {
      if (!m || !STATION_ID.test(m.id || '')) errors.push(`map id "${m && m.id}" must be a lowercase slug`);
      if (!m || typeof m.title !== 'string') errors.push('each map needs a title');
    }
  }
  if (!Array.isArray(config.threads) || config.threads.length === 0) errors.push('threads must list at least one thread');
  else {
    for (const t of config.threads) {
      if (!t || typeof t.id !== 'string' || !t.id.trim()) errors.push('each thread needs an id');
      if (!t || typeof t.title !== 'string' || !t.title.trim()) errors.push(`thread ${t && t.id} needs a title`);
      if (!t || !TONES.has(t.tone)) errors.push(`thread ${t && t.id} tone must be cart, polar, input, output, or accent`);
      if (!t || !MARKS.has(t.mark)) errors.push(`thread ${t && t.id} mark must be disc, ring, or diamond`);
    }
  }
  if (!Array.isArray(config.stations) || config.stations.length === 0) errors.push('stations must list at least one station');
  const ids = new Set();
  const stationsById = new Map();
  let homes = 0;
  for (const s of config.stations || []) {
    if (!s || !STATION_ID.test(s.id || '')) errors.push(`station id "${s && s.id}" must be a lowercase slug`);
    else if (ids.has(s.id)) errors.push(`duplicate station id ${s.id}`);
    else ids.add(s.id);
    if (s && s.id) stationsById.set(s.id, s);
    if (s && s.kind === 'map') homes += 1;
    if (s && s.kind != null && !KINDS.has(s.kind)) errors.push(`${s.id} kind "${s.kind}" is not a station kind`);
    if (s && s.kind === 'viz' && !VIZ.has(s.visualization)) errors.push(`${s.id} kind viz needs visualization two-addresses, number-line, graph, or shape`);
    if (s) errors.push(...vizErrors(s));
    if (s && s.kind === 'custom') {
      const named = customModuleName(s);
      if (named && named.error) errors.push(named.error);
    }
    if (s && s.viz && Array.isArray(s.viz.presets) && s.viz.presets.length > MAX_CONTROLS) {
      errors.push(`${s.id} has ${s.viz.presets.length} preset chips. A station has at most ${MAX_CONTROLS} controls.`);
    }
    if (!s || typeof s.title !== 'string') errors.push('each station needs a title');
    if (!s || typeof s.summary !== 'string' || !s.summary.trim()) errors.push(`${s && s.id} needs summary`);
    if (!s || typeof s.observe !== 'string' || !s.observe.trim()) errors.push(`${s && s.id} needs observe (what the learner should look at)`);
    if (s) errors.push(...sourceErrors(s.source, `station ${s.id || '?'}`));
  }
  if (homes !== 1) errors.push('exactly one station must have kind "map"');
  for (const card of config.flashcards || []) {
    if (!card || typeof card.front !== 'string' || typeof card.back !== 'string') errors.push('each flashcard needs front and back');
    errors.push(...sourceErrors(card && card.source, `flashcard ${card && card.id}`));
    sameSection(errors, card, `flashcard ${card && card.id}`, stationsById);
  }
  for (const p of config.problems || []) {
    if (!p || typeof p.statement !== 'string') errors.push('each problem needs a statement');
    if (!p || typeof p.hint !== 'string') errors.push(`${p && p.id} needs a hint`);
    if (p && p.answerText != null) errors.push(`${p.id} uses answerText. Put the plain answer in answer.text`);
    errors.push(...answerErrors(p && p.answer, `problem ${p && p.id}`));
    if (p && p.station && !ids.has(p.station)) errors.push(`problem ${p.id} points at unknown station ${p.station}`);
    errors.push(...sourceErrors(p && p.source, `problem ${p && p.id}`, { exercise: true }));
    sameSection(errors, p, `problem ${p && p.id}`, stationsById);
  }
  for (const c of config.concepts || []) {
    if (!c || typeof c.id !== 'string') errors.push('each concept needs an id');
    if (c && c.station && !ids.has(c.station)) errors.push(`concept ${c.id} points at unknown station ${c.station}`);
    errors.push(...sourceErrors(c && c.source, `concept ${c && c.id}`));
    sameSection(errors, c, `concept ${c && c.id}`, stationsById);
  }
  if (config.storagePrefix != null && !PREFIX_OK.test(config.storagePrefix)) {
    errors.push('storagePrefix must be a short token such as "study:"');
  }
  const palette = config.palette || {};
  for (const mode of ['light', 'dark']) {
    const block = palette[mode];
    if (!block) continue;
    for (const [key, value] of Object.entries(block)) {
      if (!PALETTE_KEYS.has(key)) errors.push(`palette.${mode}.${key} is not a theme token`);
      else if (typeof value !== 'string' || !HEX.test(value)) errors.push(`palette.${mode}.${key} must be a hex colour`);
    }
  }
  return { errors, askTextbook };
}

function moduleFor(station) {
  if (station.kind === 'custom' && typeof station.module === 'string' && station.module.startsWith('./')) return station.module;
  if (station.kind === 'map') return './stations/home.js';
  if (station.kind === 'flashcards') return './stations/deck.js';
  if (station.kind === 'practice') return './stations/practice.js';
  if (station.visualization === 'two-addresses') return './stations/addresses.js';
  if (station.visualization === 'number-line') return './stations/number-line.js';
  if (station.visualization === 'graph') return './stations/graph.js';
  if (station.visualization === 'shape') return './stations/shape.js';
  return './stations/reading.js';
}

function matrixOk(m) {
  return Array.isArray(m) && m.length === 2 && m.every((row) => Array.isArray(row) && row.length === 2 && row.every((n) => Number.isFinite(n)));
}

function vizErrors(s) {
  const viz = s.viz || {};
  const errors = [];
  if (viz.picture != null && viz.picture !== 'point' && viz.picture !== 'line') {
    errors.push(`${s.id} viz.picture must be point or line`);
  }
  if (viz.claim && (typeof viz.claim.whenTrue !== 'string' || typeof viz.claim.whenFalse !== 'string')) {
    errors.push(`${s.id} claim needs whenTrue and whenFalse`);
  }
  if (s.kind !== 'viz') return errors;
  if (s.visualization === 'graph') {
    const fn = viz.fn || 'poly';
    if (!GRAPH_FN.has(fn)) errors.push(`${s.id} graph fn must be poly, abs, or arg`);
    if (fn === 'poly') {
      const poly = viz.poly;
      if (!Array.isArray(poly) || poly.length < 1 || poly.length > 8 || poly.some((c) => !Number.isFinite(c))) {
        errors.push(`${s.id} graph poly needs 1 to 8 finite coefficients, constant term first`);
      }
    }
  }
  if (s.visualization === 'shape') {
    const hasAction = typeof viz.action === 'string';
    const hasSamples = Array.isArray(viz.samples);
    if (!hasAction && !hasSamples) errors.push(`${s.id} shape needs an action (rotate, stretch, or shear) or sample matrices`);
    if (hasAction && hasSamples) errors.push(`${s.id} shape uses an action or sample matrices, and not both`);
    if (hasAction && !hasSamples && !SHAPE_ACTION.has(viz.action)) errors.push(`${s.id} shape action must be rotate, stretch, or shear`);
    if (hasSamples && !hasAction) {
      if (viz.samples.length < 2 || viz.samples.length > 4) errors.push(`${s.id} shape samples need 2 to 4 matrices`);
      else if (viz.samples.some((sample) => !sample || !Number.isFinite(sample.t) || !matrixOk(sample.m))) {
        errors.push(`${s.id} shape sample needs a finite t and a 2×2 matrix`);
      }
    }
  }
  return errors;
}

function pickStation(s, index) {
  return {
    id: s.id,
    title: s.title,
    kind: s.kind || 'reading',
    visualization: s.visualization || null,
    module: moduleFor(s),
    map: s.map || null,
    part: s.part || '',
    partByMap: s.partByMap || null,
    order: Number.isFinite(s.order) ? s.order : index,
    threads: s.threads || [],
    threadsByMap: s.threadsByMap || null,
    topics: s.topics || [],
    problems: s.problems || [],
    summary: s.summary,
    observe: s.observe,
    tie: s.tie || null,
    chapter: s.chapter ?? null,
    source: s.source,
    viz: s.viz || null,
  };
}

export function buildData(config) {
  const prefix = config.storagePrefix || 'study:';
  return {
    site: {
      title: config.siteTitle,
      course: config.course,
      tagline: config.tagline || '',
      description: config.description || config.throughline,
      throughline: config.throughline,
      storagePrefix: prefix,
      footer: config.footer || `${config.course}. It runs in your browser and works offline.`,
      footerByMap: config.footerByMap || {},
      ledeByMap: config.ledeByMap || {},
      textbook: config.textbook,
      loop: config.loop || null,
    },
    maps: config.maps,
    parts: config.parts || {},
    threads: config.threads,
    colourKeys: config.colourKeys || {},
    chapters: config.chapters || [],
    stations: (config.stations || []).map(pickStation),
    concepts: config.concepts || [],
    flashcards: config.flashcards || [],
    problems: config.problems || [],
  };
}

function paletteCss(palette) {
  if (!palette) return '/* Teaching-colour overrides. None in this config. */\n';
  const lines = (block) => Object.entries(block || {})
    .filter(([key, value]) => PALETTE_KEYS.has(key) && HEX.test(value))
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
  let css = '/* Written by scaffold.mjs from the config palette. */\n';
  if (palette.light && lines(palette.light)) css += `:root {\n${lines(palette.light)}\n}\n`;
  if (palette.dark && lines(palette.dark)) {
    css += `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${lines(palette.dark)}\n  }\n}\n`;
    css += `:root[data-theme="dark"] {\n${lines(palette.dark)}\n}\n`;
  }
  return css;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function customSources(config, configDir) {
  const copies = [];
  for (const station of config.stations || []) {
    const named = customModuleName(station);
    if (!named) continue;
    if (named.error) continue;
    if (!configDir) {
      throw new Error(`${station.id} is custom. Run scaffold on the config file so stations/${named.file} beside it can be copied. A module path does not create the picture.`);
    }
    const src = join(resolve(configDir), 'stations', named.file);
    let text;
    try {
      text = await readFile(src, 'utf8');
    } catch {
      throw new Error(`${station.id} points at ./stations/${named.file}, and ${src} is not there. Run: node kit/stamp-station.mjs --id ${station.id} --config <config>. Draw the lesson in that file. Do not edit only the output folder.`);
    }
    copies.push({ id: station.id, file: named.file, text, open: stampStillOpen(text) });
  }
  return copies;
}

export async function scaffold(config, outDir, { force = false, configDir = null } = {}) {
  const { errors, askTextbook } = validateConfig(config);
  if (errors.length) {
    const err = new Error(errors.join('\n'));
    err.askTextbook = askTextbook;
    err.errors = errors;
    throw err;
  }
  const copies = await customSources(config, configDir);
  const out = resolve(outDir);
  const relTemplate = relative(templateDir, out);
  if (out === repoRoot || out === here || out === templateDir || (!relTemplate.startsWith('..') && relTemplate !== '')) {
    throw new Error(`Refusing to write into ${out}`);
  }
  let exists = false;
  try { await stat(out); exists = true; } catch { exists = false; }
  if (exists) {
    if (!force) throw new Error(`${out} already exists. Pass --force to replace it.`);
    await rm(out, { recursive: true, force: true });
  }
  await mkdir(out, { recursive: true });
  await cp(templateDir, out, { recursive: true });
  const data = buildData(config);
  await writeFile(join(out, 'js/generated/data.js'), `// Generated by kit/scaffold.mjs. Do not edit by hand.\nexport const DATA = ${JSON.stringify(data, null, 2)};\n`);
  await writeFile(join(out, 'css/palette.css'), paletteCss(config.palette));

  const prefix = data.site.storagePrefix;
  for (const rel of ['index.html', 'js/core/theme.js']) {
    const file = join(out, rel);
    let text = await readFile(file, 'utf8');
    text = text.replaceAll('study:theme', `${prefix}theme`);
    if (rel === 'index.html') {
      text = text.replace('<title>Study map</title>', `<title>${esc(data.site.title)}</title>`);
      text = text.replace('content="An interactive study map."', `content="${esc(data.site.description)}"`);
      text = text.replace('>Study map</span>', `>${esc(data.site.title)}</span>`);
      text = text.replace(
        'A study map. It runs in your browser and works offline.',
        esc(data.site.footerByMap[data.maps[0].id] || data.site.footer),
      );
    }
    await writeFile(file, text);
  }

  const katexFrom = join(repoRoot, 'vendor/katex');
  try {
    await cp(katexFrom, join(out, 'vendor/katex'), { recursive: true });
  } catch (err) {
    console.warn(`[scaffold] vendor/katex was not copied (${err.message}). Formulas will fall back to text.`);
  }
  for (const copy of copies) {
    await writeFile(join(out, 'js/stations', copy.file), copy.text);
  }
  return {
    out,
    stations: data.stations.length,
    problems: data.problems.length,
    flashcards: data.flashcards.length,
    unfinishedStamps: copies.filter((copy) => copy.open).map((copy) => copy.id),
  };
}

async function main() {
  let args;
  try { args = parseArgs(process.argv); }
  catch (err) {
    console.error(err.message);
    console.error(help());
    process.exit(1);
  }
  if (args.help || !args.config || !args.out) {
    console.log(help());
    process.exit(args.help ? 0 : 1);
  }
  let config;
  try { config = JSON.parse(await readFile(resolve(args.config), 'utf8')); }
  catch (err) {
    console.error(`Could not read config: ${err.message}`);
    process.exit(1);
  }
  try {
    const result = await scaffold(config, args.out, { force: args.force, configDir: dirname(resolve(args.config)) });
    console.log(`Wrote ${result.out}`);
    console.log(`${result.stations} stations, ${result.flashcards} flashcards, ${result.problems} problems`);
    const open = unfinishedReading(config);
    if (open.length) {
      console.log(`${open.length} reading stops are not finished stations: ${open.join(', ')}`);
      console.log('Build the picture or cut the stop before the batch is done.');
    }
    if (result.unfinishedStamps.length) {
      console.log(`${result.unfinishedStamps.length} stamped pictures are not drawn yet: ${result.unfinishedStamps.join(', ')}`);
      console.log('Fill drawLesson and delete the STAMP_OPEN line, or cut the stop.');
    }
  } catch (err) {
    if (err.askTextbook) {
      console.error('Stop. Ask the user for the textbook (title, authors, edition, and a URL or chapter list).');
      console.error('Do not guess a book, and do not invent section numbers or exercise text.');
      console.error(err.message);
      process.exit(2);
    }
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
