// tests/unit/architecture-sync.test.mjs
// docs/ARCHITECTURE.md section 3 is the contract the station builders read. This test keeps it true of the code:
//   1. every `export function` / `export const f = (...) =>` line in a section 3 code block has the same parameter list
//      as the source of the module named in that section's heading (comments and whitespace are ignored);
//   2. every `export const` / `export class` / `export { }` name in those blocks is really exported;
//   3. every name a module really exports is mentioned in its section, so nothing a station can import is undocumented.
// Run: node --test tests/unit/architecture-sync.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ----- parameter lists, normalised so that layout and comments do not matter ------------------------------

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function normParams(raw) {
  return stripComments(raw)
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .replace(/,\s*\)/g, ')')
    .replace(/,\s*\}/g, ' }')
    .replace(/(?<![.\w])PI\b/g, 'Math.PI')                       // complex.js and staircase.js keep a private PI
    .replace(/\b(\w+): ([A-Za-z_]\w*)(?= =|,| \})/g, '$1')        // a destructuring alias (clamp: doClamp) is private
    .trim();
}

// The text between the parenthesis at src[i] and its partner (nested brackets counted), or null.
function balanced(src, i) {
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '(') depth++;
    else if (src[j] === ')' && --depth === 0) return src.slice(i + 1, j);
  }
  return null;
}

// name -> normalised parameter list, for `export function f(...)` and `export const f = (...) =>`.
function sourceSignatures(rel) {
  const src = read(rel);
  const out = new Map();
  for (const re of [/^export (?:async )?function (\w+)\s*\(/gm, /^export const (\w+) = (?:async )?\(/gm]) {
    let m;
    while ((m = re.exec(src))) {
      const inner = balanced(src, m.index + m[0].length - 1);
      if (inner !== null) out.set(m[1], normParams(inner));
    }
  }
  return out;
}

// ----- the document ----------------------------------------------------------------------------------------

function sections(headingRe = /^### (3\.\d+) (.*)$/) {
  const lines = read('docs/ARCHITECTURE.md').split('\n');
  const out = [];
  let cur = null;
  for (const line of lines) {
    if (/^## /.test(line)) { cur = null; continue; }
    if (/^### /.test(line) && !headingRe.test(line)) { cur = null; continue; }
    const h = headingRe.exec(line);
    if (h) {
      cur = { id: h[1], heading: h[2], modules: [...h[2].matchAll(/`(js\/[\w/.-]+\.js)`/g)].map((m) => m[1]), lines: [] };
      out.push(cur);
    } else if (cur) cur.lines.push(line);
  }
  for (const s of out) s.text = s.lines.join('\n');
  return out;
}

// Declarations at the start of a line inside ```js fences: { kind, name, params | null }.
function declarations(section) {
  const out = [];
  let inFence = false;
  const L = section.lines;
  for (let i = 0; i < L.length; i++) {
    if (/^```/.test(L[i])) { inFence = !inFence; continue; }
    if (!inFence || !/^export /.test(L[i])) continue;
    let m = /^export function (\w+)\s*\(/.exec(L[i]);
    if (m) {
      // comments in the doc may contain brackets: strip them line by line before matching
      const text = L.slice(i, i + 40).map((l) => stripComments(l)).join('\n');
      const open = text.indexOf('(', m[0].length - 1);
      const inner = balanced(text, open);
      assert.notEqual(inner, null, `section ${section.id}: unbalanced parentheses in ${m[1]}`);
      out.push({ kind: 'function', name: m[1], params: normParams(inner) });
      continue;
    }
    m = /^export const (\w+) = (?:async )?\(/.exec(L[i]);
    if (m) {
      const text = L.slice(i, i + 5).map((l) => stripComments(l)).join('\n');
      out.push({ kind: 'function', name: m[1], params: normParams(balanced(text, text.indexOf('(', m[0].length - 1))) });
      continue;
    }
    m = /^export class (\w+)/.exec(L[i]);
    if (m) { out.push({ kind: 'class', name: m[1], params: null }); continue; }
    m = /^export const ([\w\s,]+?)\s*(?:=|\/\/|;|$)/.exec(L[i]);
    if (m) { for (const n of m[1].split(',').map((x) => x.trim()).filter(Boolean)) out.push({ kind: 'const', name: n, params: null }); continue; }
    m = /^export \{ ([\w\s,]+) \}/.exec(L[i]);
    if (m) { for (const n of m[1].split(',').map((x) => x.trim())) out.push({ kind: 'const', name: n, params: null }); continue; }
    assert.fail(`section ${section.id}: cannot read the export line "${L[i]}"`);
  }
  return out;
}

const SECTIONS = sections();

test('ARCHITECTURE section 3 has a section for every module the stations import', () => {
  const documented = new Set(SECTIONS.flatMap((s) => s.modules));
  for (const rel of ['js/core/complex.js', 'js/core/parse.js', 'js/core/plane.js', 'js/core/katex.js', 'js/core/explainer.js',
    'js/core/staircase.js', 'js/core/shapes.js', 'js/core/mapping.js', 'js/core/domaincolor.js', 'js/core/three-view.js',
    'js/core/theme.js', 'js/core/store.js', 'js/app.js', 'js/registry.js', 'js/data/problems.js', 'js/data/functions.js']) {
    assert.ok(documented.has(rel), `${rel} has no section 3 heading`);
  }
});

function checkSignatures(s) {
  assert.ok(s.modules.length > 0, `${s.id} names no module in its heading`);
  const sigs = s.modules.map((m) => [m, sourceSignatures(m)]);
  const decls = declarations(s);
  assert.ok(decls.length > 0, `${s.id} documents no export`);
  for (const d of decls) {
    if (d.kind !== 'function') continue;
    const hit = sigs.find(([, map]) => map.has(d.name));
    assert.ok(hit, `${s.id}: ${d.name} is documented but no ${s.modules.join(' / ')} exports a function of that name`);
    assert.equal(d.params, hit[1].get(d.name), `${s.id}: ${hit[0]} ${d.name}(...) differs from the code`);
  }
}

async function checkExports(s) {
  const real = new Set();
  for (const m of s.modules) {
    const mod = await import(pathToFileURL(path.join(ROOT, m)).href);
    for (const k of Object.keys(mod)) real.add(k);
  }
  for (const d of declarations(s)) assert.ok(real.has(d.name), `${s.id}: ${d.name} is documented but not exported`);
  for (const k of real) {
    assert.ok(new RegExp(`(?<![\\w$])${k}(?![\\w$])`).test(s.text), `${s.id}: export ${k} is not mentioned in its section`);
  }
}

for (const s of SECTIONS) {
  test(`ARCHITECTURE ${s.id}: every documented signature is the one in the code`, () => checkSignatures(s));
  test(`ARCHITECTURE ${s.id}: documented exports exist and every real export is documented`, () => checkExports(s));
}

// Section 11 holds the modules iteration 2 builds, until the integrator promotes each block into section 3 (the promotion
// replaces these tests with the section 3 ones). The three kit modules of i2-decisions-kit are guarded from the day they land;
// the other blocks (11.4 to 11.6) belong to goals that land in the same wave and are guarded by their own goals.
const KIT_MODULES = ['js/core/decisions.js', 'js/core/moveglyph.js', 'js/core/station-kit.js'];
for (const s of sections(/^### (11\.\d+) (.*)$/)) {
  const built = s.modules.length > 0 && s.modules.every((m) => KIT_MODULES.includes(m) && fs.existsSync(path.join(ROOT, m)));
  if (!built) continue;
  test(`ARCHITECTURE ${s.id} (iteration 2): every documented signature is the one in the code`, () => checkSignatures(s));
  test(`ARCHITECTURE ${s.id} (iteration 2): documented exports exist and every real export is documented`, () => checkExports(s));
}

// ----- section 1, "Import rules" --------------------------------------------------------------------------

// The imports each module may have: the iteration-1 rules plus the section 1 "Iteration 2 imports" list. A file may import FEWER
// than its entry (a module that does not need one of them, or one that has not been built yet), never MORE, so a goal that lands
// before the others does not turn the test red.
const ALLOWED_IMPORTS = {
  'js/app.js': ['./registry.js', './core/theme.js', './core/store.js', './core/ids.js', './core/walk.js', './core/listen.js'],
  'js/core/explainer.js': ['./katex.js'],
  'js/core/parse.js': ['./complex.js'],
  'js/core/three-view.js': ['../../vendor/three/three.module.min.js', '../../vendor/three/OrbitControls.js'],
  'js/core/decisions.js': ['../data/problems.js'],
  'js/core/station-kit.js': ['./katex.js', './decisions.js', './moveglyph.js', '../data/problems.js', '../registry.js'],
  'js/core/moveglyph.js': [],
  'js/core/listen.js': [],                          // media/manifest.js is loaded with a dynamic import() inside loadManifest
  'js/core/walk.js': ['./listen.js'],
  'js/data/generators.js': ['../core/complex.js'],
};

test('ARCHITECTURE section 1: every import found is in the allowed list (iteration 1 rules and the Iteration 2 imports)', () => {
  const files = ['js/app.js', 'js/registry.js', ...fs.readdirSync(path.join(ROOT, 'js/core')).map((f) => `js/core/${f}`),
    ...fs.readdirSync(path.join(ROOT, 'js/data')).map((f) => `js/data/${f}`)].filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 16);
  for (const f of files) {
    const found = [...read(f).matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]).sort();
    const allowed = new Set(ALLOWED_IMPORTS[f] || []);
    for (const imp of found) assert.ok(allowed.has(imp), `${f} imports ${imp}, which is not in its allowed list ${JSON.stringify([...allowed])}`);
    assert.equal(new Set(found).size, found.length, `${f} imports the same module twice`);
  }
});

test('ARCHITECTURE section 1: the allowed list carries every row of the "Iteration 2 imports" paragraph, line by line', () => {
  const doc = read('docs/ARCHITECTURE.md').split(/^## 1\. /m)[1].split(/^## 2\. /m)[0];
  const para = doc.slice(doc.indexOf('**Iteration 2 imports**'));
  assert.ok(para.length > 200, 'the paragraph exists');
  for (const f of ['js/core/decisions.js', 'js/core/station-kit.js', 'js/core/moveglyph.js', 'js/core/listen.js', 'js/core/walk.js', 'js/data/generators.js', 'js/app.js']) {
    assert.ok(para.includes('`' + f + '`'), `the paragraph names ${f}`);
    if (f === 'js/app.js') continue;                                          // its row is written as "adds ./core/walk.js and ./core/listen.js"
    for (const imp of ALLOWED_IMPORTS[f]) assert.ok(para.includes('`' + imp + '`'), `the paragraph lists ${imp} for ${f}`);
  }
  for (const imp of ['./core/walk.js', './core/listen.js']) assert.ok(para.includes('`' + imp + '`') && ALLOWED_IMPORTS['js/app.js'].includes(imp), `app.js adds ${imp}`);
  // and the reverse: a file the paragraph gives no import to has none in the list
  assert.deepEqual(ALLOWED_IMPORTS['js/core/moveglyph.js'], []);
});

const STYLE_MODULES = ['decisions.js', 'explainer.js', 'moveglyph.js', 'plane.js', 'staircase.js', 'station-kit.js', 'three-view.js'];

test('ARCHITECTURE section 1: the style tags named in the import rules are the ones the modules inject', () => {
  const injecting = fs.readdirSync(path.join(ROOT, 'js/core')).filter((f) => /data-for/.test(read(`js/core/${f}`))).sort();
  for (const f of injecting) assert.ok(STYLE_MODULES.includes(f), `${f} mentions data-for but is not one of the seven modules that inject a style tag`);
  for (const f of ['decisions.js', 'moveglyph.js', 'station-kit.js']) {                 // the kit modules (i2-decisions-kit) must inject theirs
    if (fs.existsSync(path.join(ROOT, 'js/core', f))) assert.ok(injecting.includes(f), `${f} must inject <style data-for="${f.replace(/\.js$/, '')}">`);
  }
  for (const f of ['explainer.js', 'plane.js', 'staircase.js', 'three-view.js']) assert.ok(injecting.includes(f), `${f} still injects its style`);
});
