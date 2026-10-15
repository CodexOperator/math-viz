// tests/unit/i1-shell.test.mjs
// Pure and stubbed-DOM tests for the app shell: route parsing, nav grouping, store, theme,
// and static checks on index.html, css/theme.css and css/components.css.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Importing must not touch the DOM (A1, A6).
const app = await import('../../js/app.js');
const { parseRoute, groupStations, documentTitle, SITE_TITLE } = app;
const { STATIONS, stationForProblem, stationForTopic } = await import('../../js/registry.js');
const { createStore } = await import('../../js/core/store.js');
const themeMod = await import('../../js/core/theme.js');

// ------------------------------------------------------------------ A1: parseRoute

test('parseRoute: the forms named in the goal', () => {
  const cases = [
    ['', 'home', null],
    ['#', 'home', null],
    ['#roots', 'roots', null],
    ['#problem-1-4-2', 'roots', { kind: 'problem', id: '1.4.2' }],
    ['#problem-P3', 'linear', { kind: 'problem', id: 'P3' }],
    ['#topic-T2-4', 'staircase', { kind: 'topic', id: 'T2.4' }],
    ['#lab-2-5-1', 'lab', { kind: 'token', token: '2-5-1' }],
    ['#principal-root-sweep', 'principal-root', { kind: 'token', token: 'sweep' }],
    ['#cauchy-riemann', 'cauchy-riemann', null],
    ['#nosuchplace', null, null],
  ];
  for (const [hash, station, preset] of cases) {
    const r = parseRoute(hash);
    assert.equal(r.station, station, `station for ${JSON.stringify(hash)}`);
    assert.deepEqual(r.preset, preset, `preset for ${JSON.stringify(hash)}`);
    assert.equal(typeof r.raw, 'string');
  }
});

test('parseRoute: raw is the token without the leading #', () => {
  assert.equal(parseRoute('#roots').raw, 'roots');
  assert.equal(parseRoute('roots').station, 'roots');
  assert.equal(parseRoute('').raw, '');
  assert.equal(parseRoute('#nosuchplace').raw, 'nosuchplace');
  assert.equal(parseRoute(undefined).station, 'home');
});

test('parseRoute: every problem and topic deep link resolves to the registry owner', () => {
  const index = STATIONS.find((s) => s.id === 'problems');
  assert.equal(index.problems.length, 29);
  assert.equal(index.topics.length, 12);
  const expectedProblem = {
    '1.1.1': 'arithmetic', '1.1.2': 'arithmetic', '1.2.1': 'distance', '1.2.2': 'distance',
    '1.3.1': 'addresses', '1.3.2': 'powers', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'roots',
    '1.5.1': 'curves', '1.5.2': 'sets', '2.1.1': 'mappings', '2.1.2': 'powermap', '2.1.3': 'linear',
    '2.2.1': 'powermap', '2.2.2': 'principal-root', '2.3.1': 'limits', '2.4.1': 'branches',
    '2.5.1': 'reciprocal', '3.1.1': 'derivative', '3.1.2': 'derivative', '3.2.1': 'cauchy-riemann',
    P1: 'arithmetic', P2: 'arithmetic', P3: 'linear', P4: 'linear', P5: 'limits', P6: 'derivative', P7: 'cauchy-riemann',
  };
  for (const id of index.problems) {
    const r = parseRoute(`#problem-${id.replace(/\./g, '-')}`);
    assert.equal(r.station, expectedProblem[id], `problem ${id}`);
    assert.equal(r.station, stationForProblem(id).id);
    assert.deepEqual(r.preset, { kind: 'problem', id });
  }
  const expectedTopic = {
    'T1.1': 'addresses', 'T1.2': 'distance', 'T1.3': 'addresses', 'T1.4': 'powers', 'T1.5': 'curves',
    'T2.1': 'mappings', 'T2.2': 'powermap', 'T2.3': 'limits', 'T2.4': 'staircase', 'T2.5': 'reciprocal',
    'T3.1': 'derivative', 'T3.2': 'cauchy-riemann',
  };
  for (const id of index.topics) {
    const r = parseRoute(`#topic-${id.replace('.', '-')}`);
    assert.equal(r.station, expectedTopic[id], `topic ${id}`);
    assert.equal(r.station, stationForTopic(id).id);
    assert.deepEqual(r.preset, { kind: 'topic', id });
  }
});

test('parseRoute: every station id is its own route', () => {
  for (const s of STATIONS) assert.deepEqual(parseRoute(`#${s.id}`), { station: s.id, preset: null, raw: s.id });
});

test('parseRoute: unknown, malformed and over-long tokens are No such place', () => {
  const bad = [
    '#a=b', '#roots?x=1', '#roots/', '#/roots', '#roots%20', '#roots-', '#problem-', '#problem-9-9-9',
    '#problem-1-4', '#topic-T9-9', '#topic-', '#problem-1--2', '#home extra', '#' + 'a'.repeat(500),
  ];
  for (const hash of bad) {
    const r = parseRoute(hash);
    assert.equal(r.station, null, hash.slice(0, 40));
    assert.equal(r.preset, null);
  }
});

test('parseRoute: a longer station id wins over a shorter prefix; presets keep their case', () => {
  assert.equal(parseRoute('#principal-root-sweep').station, 'principal-root');
  assert.deepEqual(parseRoute('#lab-P4').preset, { kind: 'token', token: 'P4' });
  assert.deepEqual(parseRoute('#roots-unity'), { station: 'roots', preset: { kind: 'token', token: 'unity' }, raw: 'roots-unity' });
});

test('parseRoute: station and id letter case is forgiven', () => {
  assert.equal(parseRoute('#Roots').station, 'roots');
  assert.deepEqual(parseRoute('#problem-p3').preset, { kind: 'problem', id: 'P3' });
  assert.deepEqual(parseRoute('#Topic-t2-4').preset, { kind: 'topic', id: 'T2.4' });
  assert.equal(parseRoute('#LAB-2-5-1').station, 'lab');
});

// ------------------------------------------------------------------ nav model and title

test('groupStations: five parts in order with the registry stations', () => {
  const g = groupStations(STATIONS);
  assert.deepEqual(g.map((x) => x.part), ['I', 'II', 'III', 'IV', 'V']);
  assert.deepEqual(g.map((x) => x.stations.length), [7, 2, 7, 2, 3]);
  assert.equal(g.reduce((n, x) => n + x.stations.length, 0), STATIONS.length);
  assert.equal(g[0].stations[0].id, 'home');
  assert.deepEqual(g.map((x) => x.title), ['The point', 'Curves and sets', 'Motions', 'Zoom', 'The diary and the index']);
  const orders = g.flatMap((x) => x.stations.map((s) => s.order));
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.equal(groupStations([{ id: 'x', title: 'X', order: 1, part: 'IX' }])[0].title, 'Part IX');
  assert.deepEqual(groupStations([]), []);
});

test('documentTitle', () => {
  assert.equal(SITE_TITLE, 'One Point, Two Addresses');
  assert.equal(documentTitle('The Map'), 'The Map · One Point, Two Addresses');
  assert.equal(documentTitle(''), 'One Point, Two Addresses');
});

// ------------------------------------------------------------------ store

function fakeStorage() {
  const m = new Map();
  return {
    m,
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

test('store: round trip, JSON under the prefix, fresh copies', () => {
  const storage = fakeStorage();
  const s = createStore('mv:', { storage });
  assert.equal(s.get('progress', 'none'), 'none');
  assert.equal(s.set('progress', { done: ['1.1.1'], n: 1 }), true);
  assert.equal(storage.m.get('mv:progress'), '{"done":["1.1.1"],"n":1}');
  const a = s.get('progress');
  a.done.push('x');
  assert.deepEqual(s.get('progress'), { done: ['1.1.1'], n: 1 });
  const s2 = createStore('mv:', { storage });
  assert.deepEqual(s2.get('progress'), { done: ['1.1.1'], n: 1 });
  assert.deepEqual(s.keys(), ['progress']);
  s.remove('progress');
  assert.equal(storage.m.has('mv:progress'), false);
  assert.equal(s.get('progress'), undefined);
});

test('store: a throwing or missing localStorage never throws', () => {
  const boom = { get length() { throw new Error('x'); }, key() { throw new Error('x'); }, getItem() { throw new Error('x'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } };
  for (const storage of [boom, null]) {
    const s = createStore('mv:', { storage });
    assert.equal(s.get('a', 7), 7);
    assert.equal(s.set('a', [1, 2]), false);
    assert.deepEqual(s.get('a'), [1, 2]);
    assert.deepEqual(s.keys(), ['a']);
    s.remove('a');
    assert.equal(s.get('a', 'gone'), 'gone');
  }
});

test('store: persist false stays in memory and clears any stale stored copy', () => {
  const storage = fakeStorage();
  const s = createStore('mv:', { storage });
  s.set('lab.request', { fn: 'recip' });
  assert.equal(storage.m.has('mv:lab.request'), true);
  assert.equal(s.set('lab.request', { fn: 'sq' }, { persist: false }), false);
  assert.equal(storage.m.has('mv:lab.request'), false);
  assert.deepEqual(s.get('lab.request'), { fn: 'sq' });
});

test('store: corrupt JSON gives the fallback; unserialisable values are refused', () => {
  const storage = fakeStorage();
  storage.setItem('mv:bad', '{oops');
  const s = createStore('mv:', { storage });
  assert.equal(s.get('bad', 'fallback'), 'fallback');
  const cyc = {};
  cyc.self = cyc;
  const warn = console.warn;
  console.warn = () => {};
  try { assert.equal(s.set('cyc', cyc), false); } finally { console.warn = warn; }
  assert.equal(s.get('cyc', 'none'), 'none');
  s.set('x', 1);
  s.set('x', undefined);
  assert.equal(s.get('x', 'gone'), 'gone');
});

test('store: subscribe sees set and remove, unsubscribe stops it, a throwing listener is isolated', () => {
  const s = createStore('mv:', { storage: fakeStorage() });
  const seen = [];
  const un = s.subscribe('k', (v) => seen.push(v));
  const other = [];
  s.subscribe('other', (v) => other.push(v));
  const err = console.error;
  console.error = () => {};
  try { s.subscribe('k', () => { throw new Error('listener'); }); s.set('k', 1); } finally { console.error = err; }
  s.set('k', { a: 2 });
  s.remove('k');
  un();
  s.set('k', 3);
  assert.deepEqual(seen, [1, { a: 2 }, undefined]);
  assert.deepEqual(other, []);
  s.remove('never-set');
  assert.deepEqual(other, []);
});

test('store: prefixes isolate keys', () => {
  const storage = fakeStorage();
  const a = createStore('a:', { storage });
  const b = createStore('b:', { storage });
  a.set('k', 1);
  assert.equal(b.get('k', 'none'), 'none');
  assert.deepEqual(b.keys(), []);
});

// ------------------------------------------------------------------ theme (stubbed DOM)

function installDom({ dark = false, stored = null, throwingStorage = false } = {}) {
  const attrs = new Map();
  const doc = new EventTarget();
  const meta = { content: '', setAttribute(k, v) { if (k === 'content') this.content = v; } };
  const meta2 = { content: '', setAttribute(k, v) { if (k === 'content') this.content = v; } };   // index.html has one theme-color meta per colour scheme
  doc.documentElement = {
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    hasAttribute: (k) => attrs.has(k),
  };
  doc.querySelector = (sel) => (sel === 'meta[name="theme-color"]' ? meta : null);
  doc.querySelectorAll = (sel) => (sel === 'meta[name="theme-color"]' ? [meta, meta2] : []);
  const storage = fakeStorage();
  if (stored) storage.setItem('mv:theme', stored);
  const listeners = [];
  globalThis.document = doc;
  globalThis.localStorage = throwingStorage
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } }
    : storage;
  globalThis.getComputedStyle = () => ({ getPropertyValue: (n) => (n === '--bg' ? ' #f6f3ec ' : n === '--cart' ? ' #0b63ad ' : '') });
  globalThis.matchMedia = (q) => ({
    matches: q.includes('prefers-color-scheme') ? dark : false,
    addEventListener: (_t, fn) => listeners.push(fn),
    removeEventListener: (_t, fn) => listeners.splice(listeners.indexOf(fn), 1),
  });
  return { attrs, doc, storage, meta, meta2, listeners };
}
function uninstallDom() {
  for (const k of ['document', 'localStorage', 'getComputedStyle', 'matchMedia']) delete globalThis[k];
}

test('theme: cssVar trims; getTheme follows data-theme, then the OS preference', () => {
  const env = installDom({ dark: true });
  try {
    assert.equal(themeMod.cssVar('--cart'), '#0b63ad');
    assert.equal(themeMod.getTheme(), 'dark');
    env.attrs.set('data-theme', 'light');
    assert.equal(themeMod.getTheme(), 'light');
  } finally { uninstallDom(); }
  const env2 = installDom({ dark: false });
  try { assert.equal(themeMod.getTheme(), 'light'); } finally { uninstallDom(); }
});

test('theme: setTheme sets the attribute, stores a raw string, fires one themechange', () => {
  const env = installDom({ dark: false });
  try {
    const events = [];
    const un = themeMod.onThemeChange((t) => events.push(['cb', t]));
    env.doc.addEventListener('themechange', (e) => events.push(['evt', e.detail.theme, e.detail.mode]));
    themeMod.setTheme('dark');
    assert.equal(env.attrs.get('data-theme'), 'dark');
    assert.equal(env.storage.getItem('mv:theme'), 'dark');
    assert.equal(env.meta.content, '#f6f3ec');
    assert.deepEqual(events, [['cb', 'dark'], ['evt', 'dark', 'dark']]);
    themeMod.setTheme('light');
    assert.equal(themeMod.getTheme(), 'light');
    assert.equal(env.storage.getItem('mv:theme'), 'light');
    un();
    events.length = 0;
    themeMod.setTheme('dark');
    assert.deepEqual(events.map((e) => e[0]), ['evt']);
    themeMod.setTheme('auto');
    assert.equal(env.attrs.has('data-theme'), false);
    assert.equal(env.storage.getItem('mv:theme'), null);
    const warn = console.warn;
    console.warn = () => {};
    try { themeMod.setTheme('purple'); } finally { console.warn = warn; }
    assert.equal(env.attrs.has('data-theme'), false);
  } finally { uninstallDom(); }
});

test('theme: a blocked localStorage does not stop the switch', () => {
  const env = installDom({ throwingStorage: true });
  try {
    let n = 0;
    env.doc.addEventListener('themechange', () => n++);
    themeMod.setTheme('dark');
    assert.equal(env.attrs.get('data-theme'), 'dark');
    assert.equal(n, 1);
    themeMod.setTheme('auto');
  } finally { uninstallDom(); }
});

test('theme: initTheme applies a stored choice silently and follows the OS only in auto mode', () => {
  const env = installDom({ stored: 'dark' });
  try {
    let n = 0;
    env.doc.addEventListener('themechange', () => n++);
    const dispose = themeMod.initTheme();
    assert.equal(env.attrs.get('data-theme'), 'dark');
    assert.equal(n, 0);
    assert.equal(env.listeners.length, 1);
    env.listeners[0]();
    assert.equal(n, 0, 'explicit choice ignores OS changes');
    env.attrs.delete('data-theme');
    env.listeners[0]();
    assert.equal(n, 1, 'auto mode follows the OS');
    dispose();
    assert.equal(env.listeners.length, 0);
  } finally { uninstallDom(); }
});

test('theme: prefersReducedMotion is false without matchMedia', () => {
  assert.equal(themeMod.prefersReducedMotion(), false);
});

// ------------------------------------------------------------------ A5: tokens

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (h) => { const [r, g, b] = hexToRgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

function themeBlocks() {
  const css = read('css/theme.css');
  const decls = (body) => Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const light = css.match(/(?:^|\n):root\s*\{([^}]*)\}/);
  const darkMedia = css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}\s*\}/);
  const darkAttr = css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
  assert.ok(light, ':root block');
  assert.ok(darkMedia, 'prefers-color-scheme dark block guarded by :not([data-theme="light"])');
  assert.ok(darkAttr, ':root[data-theme="dark"] block');
  return { css, light: decls(light[1]), darkMedia: decls(darkMedia[1]), darkAttr: decls(darkAttr[1]) };
}

const COLOUR_TOKENS = ['--bg', '--surface', '--surface-2', '--text', '--text-muted', '--border', '--border-strong', '--accent', '--on-accent', '--focus',
  '--cart', '--polar', '--input', '--output', '--seam', '--t0', '--t1', '--ok', '--warn', '--danger'];
const THEME_TOKENS = [...COLOUR_TOKENS, '--ghost-alpha', '--shadow', '--icon-sun', '--icon-moon'];
const SHARED_TOKENS = ['--font', '--font-display', '--font-mono', '--radius', '--radius-sm', '--space-1', '--space-2', '--space-3', '--space-4', '--space-5',
  '--gutter', '--tap', '--header-h', '--sidebar-w', '--content-max'];

test('theme.css: every theme token is in all three blocks; the two dark blocks are identical', () => {
  const b = themeBlocks();
  for (const t of THEME_TOKENS) for (const name of ['light', 'darkMedia', 'darkAttr']) assert.ok(t in b[name], `${t} missing from ${name}`);
  for (const t of SHARED_TOKENS) assert.ok(t in b.light, `${t} missing from :root`);
  assert.deepEqual(b.darkMedia, b.darkAttr);
  for (const t of COLOUR_TOKENS) for (const name of ['light', 'darkMedia', 'darkAttr']) assert.match(b[name][t], /^#[0-9a-f]{6}$/, `${t} in ${name}`);
  for (const t of ['--font', '--font-display', '--font-mono']) assert.doesNotMatch(b.light[t], /https?:|url\(/);
});

test('theme.css: body has an explicit background token and reduced motion is honoured', () => {
  const { css } = themeBlocks();
  assert.match(css, /body\s*\{[^}]*background:\s*var\(--bg\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus\)/);
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none/);
});

test('theme.css: ghost arcs never exceed alpha 0.35 in any theme', () => {
  const b = themeBlocks();
  for (const name of ['light', 'darkMedia', 'darkAttr']) {
    const a = parseFloat(b[name]['--ghost-alpha']);
    assert.ok(a > 0 && a <= 0.35, `${name}: ${b[name]['--ghost-alpha']}`);
  }
});

test('contrast helper matches the WCAG reference values', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrast('#777777', '#ffffff').toFixed(2), '4.48');
  assert.equal(contrast('#767676', '#ffffff').toFixed(2), '4.54');
  assert.equal(contrast('#1a2230', '#ffffff').toFixed(2), '15.96');
});

test('theme.css: contrast thresholds hold in light and dark', () => {
  const b = themeBlocks();
  for (const [name, T] of [['light', b.light], ['dark', b.darkAttr]]) {
    for (const bg of ['--bg', '--surface', '--surface-2']) {
      const at = (tok) => contrast(T[tok], T[bg]);
      assert.ok(at('--text') >= 7, `${name} --text on ${bg}`);
      for (const tok of ['--text-muted', '--accent', '--cart', '--polar', '--input', '--output', '--ok', '--warn', '--danger']) assert.ok(at(tok) >= 4.5, `${name} ${tok} on ${bg}: ${at(tok).toFixed(2)}`);
      for (const tok of ['--seam', '--border-strong', '--focus', '--t0', '--t1']) assert.ok(at(tok) >= 3, `${name} ${tok} on ${bg}: ${at(tok).toFixed(2)}`);
    }
    assert.ok(contrast(T['--on-accent'], T['--accent']) >= 4.5, `${name} on-accent`);
    assert.ok(luminance(T['--t0']) < luminance(T['--t1']), `${name} time ramp runs dark to bright`);
    assert.ok(contrast(T['--cart'], T['--polar']) >= 1.0);
  }
});

test('theme.css: the pinned palette (light) from the design', () => {
  const { light } = themeBlocks();
  assert.equal(light['--cart'], '#0b63ad');
  assert.equal(light['--polar'], '#a84300');
  assert.equal(light['--input'], '#006e53');
  assert.equal(light['--output'], '#9d3a8a');
});

test('components.css: no colour literals, no bare outline removal', () => {
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'hex colour');
  assert.doesNotMatch(css, /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/, 'colour function');
  const named = /(?:color|background|border(?:-[a-z]+)*|fill|stroke|outline(?:-color)?)\s*:[^;{}]*\b(?:white|black|red|green|blue|gray|grey|orange|purple|yellow|pink|silver|navy|teal|maroon)\b/i;
  assert.doesNotMatch(css, named, 'named colour');
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (/outline\s*:\s*(none|0)\b/.test(m[2])) assert.match(m[1].trim(), /^#view:focus$/, `outline removed on ${m[1].trim()}`);
  }
});

test('components.css: flex summaries get a drawn chevron (display:flex removes the browser triangle)', () => {
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.colour-key summary::before/);
  assert.match(css, /\.error-details summary::before/);
  assert.match(css, /\[open\] > summary::before/);
});

// ------------------------------------------------------------------ A6 and the page itself

test('app.js imports only the registry and the three shell helpers (theme, store, ids)', () => {
  const src = read('js/app.js');
  const specs = [...src.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]).sort();
  assert.deepEqual(specs, ['./core/ids.js', './core/store.js', './core/theme.js', './registry.js']);
  assert.doesNotMatch(src, /import\(\s*['"]/, 'the only import() is the station module taken from the registry');
  assert.match(src, /await import\(st\.module\)/);
  assert.match(src, /data-station-error/);
  assert.match(src, /console\.error/);
  assert.doesNotMatch(src, /\bfrom\s+['"]\//, 'no absolute imports');
});

test('index.html: landmarks, ids, local assets only, KaTeX before the module', () => {
  const html = read('index.html');
  for (const id of ['site-header', 'site-title', 'theme-toggle', 'nav-toggle', 'site-nav', 'view', 'skip-link', 'route-status', 'colour-key']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<a class="site-title" id="site-title" href="#home">/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /name="viewport"/);
  const urls = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
  for (const u of urls) assert.ok(u.startsWith('#') || u.startsWith('data:') || !/^(?:[a-z]+:)?\/\//i.test(u), `external URL in index.html: ${u}`);
  for (const u of urls.filter((x) => !x.startsWith('#') && !x.startsWith('data:'))) assert.ok(fs.existsSync(path.join(ROOT, u)), `missing file: ${u}`);
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
  assert.ok(html.indexOf('vendor/katex/katex.min.js') < html.indexOf('type="module"'));
  assert.ok(html.indexOf('css/theme.css') < html.indexOf('css/components.css'));
  assert.match(html, /import\('\.\/js\/app\.js'\)/);
  assert.match(html, /m\.start\(\)/);
});

// ------------------------------------------------------------------ fix round: drawer, retry, race, key arcs

test('app.js: any nav link activation closes the drawer (a link to the current place fires no hashchange)', () => {
  const src = read('js/app.js');
  const m = src.match(/listen\(nav, 'click', \(e\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(m, 'a click listener on the nav');
  assert.match(m[1], /closest\('a\.nav-link'\)/);
  assert.match(m[1], /setNavOpen\(false\)/);
  assert.match(m[1], /view\.focus\(/, 'focus must not be left on a link inside the closed drawer');
});

test('app.js: the page behind the open drawer is inert, and the CSS locks its scroll', () => {
  const src = read('js/app.js');
  assert.match(src, /toggleAttribute\('inert', open\)/);
  assert.match(src, /getElementById\('site-footer'\)/);
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /body\[data-nav-open="true"\]\s*\{[^}]*overflow:\s*hidden/);
});

test('app.js: a stale navigation that fails must not clear the newer navigation\'s loading timer', () => {
  const src = read('js/app.js');
  const renderSrc = src.slice(src.indexOf('async function render()'));
  const catchBlock = renderSrc.match(/\} catch \(err\) \{\n([\s\S]*?)\n    \}\n  \}\n/);
  assert.ok(catchBlock, 'the render() catch block');
  const code = catchBlock[1].replace(/^\s*\/\/.*$/gm, '');
  assert.ok(code.indexOf('seq !== state.seq') >= 0 && code.indexOf('seq !== state.seq') < code.indexOf('clearTimeout'), 'the seq check comes before clearTimeout');
});

test('app.js: the under-construction panel announces once and its button reloads the page', () => {
  const src = read('js/app.js');
  const fn = src.match(/function buildUnderConstruction\(st, err\) \{([\s\S]*?)\n  \}\n/);
  assert.ok(fn, 'buildUnderConstruction');
  assert.doesNotMatch(fn[1], /role:/, '#route-status is the live region; the panel must not be a second one');
  assert.match(fn[1], /location\.reload\(\)/);
  assert.match(fn[1], /'Reload the page'/);
  assert.doesNotMatch(fn[1], /'Try again'/, 'a button that cannot recover must not promise to');
});

test('index.html: the arg and Arg key entries are drawn as arcs, one solid and a stack of faint ones', () => {
  const html = read('index.html');
  const items = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]).filter((x) => x.includes('key-line'));
  const home = items.find((x) => x.includes('arg-home'));
  const ghost = items.find((x) => x.includes('arg-ghost'));
  assert.ok(home && ghost);
  const arcs = (x, cls) => {
    const d = x.match(new RegExp(`class="${cls}" d="([^"]+)"`))[1];
    return d.split('M').filter(Boolean).map((seg) => /A\d/.test(seg));
  };
  assert.deepEqual(arcs(home, 'arg-home'), [true], 'one solid arc');
  assert.ok(arcs(ghost, 'arg-ghost').length >= 3 && arcs(ghost, 'arg-ghost').every(Boolean), 'at least three faint arcs');
  assert.doesNotMatch(home, /<line class="arg-home"/);
  assert.doesNotMatch(ghost, /<line class="arg-ghost"/);
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.key-line path\s*\{[^}]*fill:\s*none/, 'arc swatches must not be filled');
  assert.match(css, /\.key-line \.arg-ghost\s*\{[^}]*opacity:\s*var\(--ghost-alpha\)/);
});

// ------------------------------------------------------------------ residue fixes (iteration 1 cleanup, group C3)

test('theme-color: index.html has a light and a dark default, and theme.js sets every theme-color meta to --bg (residue 10)', () => {
  const html = read('index.html');
  const metas = [...html.matchAll(/<meta name="theme-color" content="(#[0-9a-f]{6})"(?: media="([^"]+)")?>/g)].map((m) => ({ content: m[1], media: m[2] }));
  assert.deepEqual(metas.map((m) => m.media), ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']);
  const b = themeBlocks();
  assert.equal(metas[0].content, b.light['--bg'], 'the light default is the light --bg');
  assert.equal(metas[1].content, b.darkAttr['--bg'], 'the dark default is the dark --bg');
  const env = installDom({ dark: false });
  try {
    themeMod.setTheme('dark');
    assert.equal(env.meta.content, '#f6f3ec', 'the first meta follows --bg');
    assert.equal(env.meta2.content, '#f6f3ec', 'and so does the second: an explicit choice must not lose to the OS preference');
    // a DOM without querySelectorAll (the older stub) still gets its one meta
    delete env.doc.querySelectorAll;
    env.meta.content = ''; env.meta2.content = '';
    themeMod.setTheme('light');
    assert.equal(env.meta.content, '#f6f3ec');
    assert.equal(env.meta2.content, '');
  } finally { uninstallDom(); }
});

test('components.css: T3 is a diamond (a shape cue, not hue alone); the key line for T3 is dotted, T2 dashed, T1 solid (residue 1)', () => {
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.thread-dot\[data-thread="T3"\]\s*\{[^}]*transform:\s*rotate\(45deg\)/, 'the menu dot for T3');
  assert.match(css, /\.thread-badge\[data-thread="T3"\]::before\s*\{[^}]*transform:\s*rotate\(45deg\)/, 'the station badge for T3 matches the menu dot');
  assert.match(css, /\.thread-dot\[data-thread="T2"\]\s*\{[^}]*border-style:\s*dashed/);
  const dash = (cls) => (css.match(new RegExp(`\\.key-line \\.${cls}\\s*\\{([^}]*)\\}`)) || [])[1];
  assert.ok(dash('thread-t1') && !/dasharray/.test(dash('thread-t1')), 'T1 is a solid line');
  assert.match(dash('thread-t2'), /stroke-dasharray:\s*5 4/);
  assert.match(dash('thread-t3'), /stroke-dasharray:\s*0\.1 5\.2/);
  const html = read('index.html');
  assert.match(html, /T1 a blue disc \(solid line\), T2 an orange dashed ring \(dashed line\), T3 a purple diamond \(dotted line\)/);
});

test('index.html: the colour key says the solid arc belongs to arg z, and draws it inside the ghost swatch (residue 2)', () => {
  const html = read('index.html');
  const items = [...html.matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]).filter((x) => /key-(?:swatch|line)/.test(x));
  assert.equal(items.length, 9, 'nine colour key entries (the interaction script counts them)');
  const ghost = items.find((x) => x.includes('arg-ghost'));
  assert.ok(ghost, 'the ghost-arc entry');
  assert.match(ghost, /class="arg-home"/, 'the solid Arg arc is drawn in the same swatch');
  assert.ok(ghost.indexOf('arg-ghost') < ghost.indexOf('arg-home'), 'the solid arc is drawn on top of the faint ones');
  const plain = ghost.replace(/<[^>]+>/g, '');                                     // the names arg z and Arg z sit in nowrap spans
  assert.match(plain, /other members of arg z/);
  assert.match(plain, /solid arc is Arg z/);
  assert.match(plain, /belong to the set arg z/);
  assert.doesNotMatch(plain, /Faint extra arcs are arg z/, 'the old wording read as if arg z excluded Arg z');
  // the solid-arc entry keeps saying what Arg is
  assert.ok(items.some((x) => /A solid arc is Arg z: the one angle we agreed to use/.test(x)));
});

test('components.css: sup.prose-sup is small and never stretches a line (residue: prose() exponents in chips and buttons)', () => {
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const m = css.match(/sup\.prose-sup\s*\{([^}]*)\}/);
  assert.ok(m, 'a sup.prose-sup rule');
  assert.match(m[1], /font-size:\s*0\.85em/);
  assert.match(m[1], /line-height:\s*0/);
});

test('app.js: the menu sets a station title exponent as a superscript, the same way prose() does (residue: sidebar caret)', async () => {
  const src = read('js/app.js');
  const body = src.slice(src.indexOf('const EXPONENT'), src.indexOf('const THEME_API'));
  assert.ok(body.includes('function titleNodes'), 'titleNodes is in app.js');
  const el = (tag, attrs, child) => ({ tag, attrs, child });
  const titleNodes = new Function('el', body + '; return titleNodes;')(el);
  const { proseParts } = await import('../../js/core/katex.js');
  const shape = (nodes) => nodes.map((n) => (typeof n === 'string' ? { sup: false, text: n } : { sup: true, text: n.child }));
  const strings = [...STATIONS.map((st) => st.title), ...STATIONS.map((st) => st.summary), 'z^n: Fans and Parabolas', 'e^{iθ} and r^(1/3) and 2^10 and z^-1', '^n first', 'a ^ b', 'z^', 'z^{', 'x^()', 'plain', ''];
  for (const t of strings) assert.deepEqual(shape(titleNodes(t)).filter((p) => p.text !== ''), proseParts(t), `titleNodes(${JSON.stringify(t)}) agrees with proseParts`);
  const n = titleNodes('z^n: Fans and Parabolas');
  assert.equal(n.length, 3);
  assert.equal(n[0], 'z'); assert.equal(n[1].tag, 'sup'); assert.equal(n[1].attrs.class, 'prose-sup'); assert.equal(n[1].child, 'n'); assert.equal(n[2], ': Fans and Parabolas');
  assert.deepEqual(titleNodes('The Map'), ['The Map']);
  assert.match(src, /titleNodes\(st\.title\)/, 'the nav title goes through titleNodes');
  assert.match(src, /navToggle\.setAttribute\('title', open \? 'Hide the places' : 'Show the places'\)/, 'the tooltip follows the drawer (residue 8)');
});
