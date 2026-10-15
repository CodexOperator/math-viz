// tests/unit/wave0-sync.test.mjs
// Pins for the wave-0 sync (docs/review/iter-1/wave0-sync.md): the prose helper in katex.js, the two doc edits that other
// goals asked for, and the section of ARCHITECTURE that the station builders are told to follow.
// The browser checks of the same sync are in tests/interact/wave0-sync.mjs.
// Run: node --test tests/unit/wave0-sync.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proseParts, proseToHtml, prose } from '../../js/core/katex.js';
import { toTex, evaluate } from '../../js/core/parse.js';
import { texNumber } from '../../js/core/complex.js';
import { PROBLEMS, TOPICS } from '../../js/data/problems.js';
import { FUNCTIONS } from '../../js/data/functions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ------------------------------------------------------------------------------------------------------
// proseParts / proseToHtml / prose: exponent notation in prose
// ------------------------------------------------------------------------------------------------------

const P = (text) => ({ sup: false, text });
const S = (text) => ({ sup: true, text });

test('proseParts: braces, brackets and one-token exponents become superscript runs', () => {
  const rows = [
    ['e^{iθ}', [P('e'), S('iθ')]],
    ['2e^{i(θ + π/2)} sits at 2i', [P('2e'), S('i(θ + π/2)'), P(' sits at 2i')]],
    ['r^(1/3) and w^(1/n)', [P('r'), S('1/3'), P(' and w'), S('1/n')]],
    ['e^(−iθ)', [P('e'), S('−iθ')]],
    ['u = e^x cos y', [P('u = e'), S('x'), P(' cos y')]],
    ['2^10 + 1', [P('2'), S('10'), P(' + 1')]],
    ['z^-1 and x^2.5y', [P('z'), S('-1'), P(' and x'), S('2.5'), P('y')]],
    ['e^{−i(θ₁ + θ₂)}', [P('e'), S('−i(θ₁ + θ₂)')]],
    ['|w|^(1/n) e^{i Arg(w)/n}', [P('|w|'), S('1/n'), P(' e'), S('i Arg(w)/n')]],
    ['x^2.', [P('x'), S('2'), P('.')]],                                  // a sentence-final dot is not a decimal point
    ['e^{a{b}c}', [P('e'), S('a{b}c')]],                                 // nested braces
    ['e^{i^2}', [P('e'), S('i^2')]],                                     // no nested superscripts: text inside is kept as typed
  ];
  for (const [src, want] of rows) assert.deepEqual(proseParts(src), want, src);
});

test('proseParts: a caret that cannot be an exponent stays literal', () => {
  for (const src of ['^x', 'a ^ b', 'e^', 'e^{open', 'e^(open', 'e^{}', 'e^ x', 'plain text', '', 'a^+']) {
    assert.deepEqual(proseParts(src), src === '' ? [] : [P(src)], JSON.stringify(src));
  }
  assert.deepEqual(proseParts(null), []);
  assert.deepEqual(proseParts(undefined), []);
  assert.deepEqual(proseParts(42), [P('42')]);
});

test('proseToHtml escapes everything and writes only <sup class="prose-sup">', () => {
  assert.equal(proseToHtml('e^{iθ} & 1 < 2'), 'e<sup class="prose-sup">iθ</sup> &amp; 1 &lt; 2');
  assert.equal(proseToHtml('<img src=x onerror=alert(1)>^{<b>}'), '&lt;img src=x onerror=alert(1)&gt;<sup class="prose-sup">&lt;b&gt;</sup>');
  assert.equal(proseToHtml('r^(1/3)'), 'r<sup class="prose-sup">1/3</sup>');
  assert.equal(proseToHtml(''), '');
  assert.equal(proseToHtml('a "quoted" it\'s'), 'a &quot;quoted&quot; it&#39;s');
});

test('prose(el, text) fills an element, never throws, and ignores a missing element', () => {
  const el = { innerHTML: 'old' };
  prose(el, 'e^{iπ} = -1');
  assert.equal(el.innerHTML, 'e<sup class="prose-sup">iπ</sup> = -1');
  prose(el, '');
  assert.equal(el.innerHTML, '');
  assert.doesNotThrow(() => prose(null, 'e^x'));
  assert.doesNotThrow(() => prose(undefined, 'e^x'));
  const hostile = { set innerHTML(v) { throw new Error('detached'); } };
  assert.doesNotThrow(() => prose(hostile, 'e^x'));
});

function proseFields() {
  const out = [];
  for (const p of PROBLEMS) for (const k of ['aha', 'addressWhy']) out.push([`${p.id}.${k}`, p[k]]);
  for (const p of PROBLEMS) for (const k of ['cart', 'polar']) out.push([`${p.id}.routes.${k}`, p.routes[k]]);
  for (const t of TOPICS) {
    out.push([`${t.id}.summary`, t.summary]);
    t.covers.forEach((c, i) => out.push([`${t.id}.covers[${i}]`, c]));
  }
  for (const f of FUNCTIONS) out.push([`${f.id}.note`, f.note], [`${f.id}.label`, f.label]);
  return out;
}

test('every prose field of the data renders with no exponent bracket left over', () => {
  const fields = proseFields();
  assert.ok(fields.length > 200);
  let withSup = 0;
  for (const [name, text] of fields) {
    const parts = proseParts(text);
    const plain = parts.filter((p) => !p.sup).map((p) => p.text).join('');
    assert.ok(!/\^[{(]/.test(plain), `${name} keeps a literal ^{ or ^( : ${plain.slice(0, 80)}`);
    assert.ok(!/[A-Za-z0-9)]\^[A-Za-z0-9]/.test(plain), `${name} keeps a literal one-token exponent: ${plain.slice(0, 80)}`);
    if (parts.some((p) => p.sup)) withSup++;
    // nothing is invented or lost: the letters and digits of the runs are the letters and digits of the source
    const keep = (x) => x.replace(/[^\p{L}\p{N}]/gu, '');
    assert.equal(keep(parts.map((p) => p.text).join('')), keep(text), `${name} keeps every letter and digit`);
  }
  assert.ok(withSup >= 40, `only ${withSup} fields carry a superscript`);
});

test('the data prose that the residue named renders as intended', () => {
  const by = Object.fromEntries(proseFields());
  const sups = (text) => proseParts(text).filter((p) => p.sup).map((p) => p.text);
  assert.ok(sups(by['1.4.2.routes.polar']).length >= 1, '1.4.2 routes.polar has a superscript');
  assert.deepEqual(sups(by['x-over-z.note']).filter((t) => /θ/.test(t)), ['−iθ'], 'the e^(−iθ) of the x-over-z note');
  assert.ok(sups(by['cbrt.label']).includes('1/3'), 'the z^(1/3) label');
});

// ------------------------------------------------------------------------------------------------------
// rows the i1-core-math review asked to pin (the mutants that survived its 31 tests)
// ------------------------------------------------------------------------------------------------------

test('toTex keeps the brackets that make a formula right: negated sums and products, a negative right factor', () => {
  const rows = [
    ['-(z+1)', '-\\left(z + 1\\right)'],           // without the wrap this would print -z + 1, a wrong formula
    ['-(2z)', '-\\left(2z\\right)'],
    ['-(z*z)', '-\\left(z \\cdot z\\right)'],
    ['2*-z', '2\\left(-z\\right)'],                 // not 2-z
    ['z*-z', 'z \\cdot \\left(-z\\right)'],
    ['z/-z', '\\frac{z}{-z}'],
  ];
  for (const [src, want] of rows) assert.equal(toTex(src), want, src);
});

test('texNumber keeps its exact-form limits: denominators up to 24, surds over at most 4, strict tolerance', () => {
  assert.equal(texNumber(1 / 25), '0.04');
  assert.equal(texNumber(1 / 24), '\\frac{1}{24}');
  assert.equal(texNumber(Math.SQRT2 / 5), '0.283');             // q = 5 is past the surd limit of 4
  assert.equal(texNumber(1.4142), '1.414');                      // not mistaken for \sqrt{2}
});

test('an integer power of i is exact: evaluate("z^2") at i is -1 with a zero imaginary part, not 1.2e-16', () => {
  assert.deepStrictEqual(evaluate('z^2', { re: 0, im: 1 }), { re: -1, im: 0 });
  assert.deepStrictEqual(evaluate('z^3', { re: 0, im: 1 }), { re: 0, im: -1 });
});

// ------------------------------------------------------------------------------------------------------
// the two edits other goals asked for
// ------------------------------------------------------------------------------------------------------

test('STORY section 3, row 2.2.2: take the square root of the length and halve the angle (|2i| = 2, the root has length sqrt 2)', () => {
  const story = read('docs/STORY.md');
  const row = story.split('\n').find((l) => l.startsWith('| 2.2.2 principal'));
  assert.ok(row, 'the 2.2.2 row exists');
  assert.match(row, /take the square root of the length and halve the angle/);   // the very words of the data's aha (i1-data compares the two strictly)
  assert.doesNotMatch(row, /halve both/);
  assert.ok(!/halve both/.test(story), 'no other "halve both" in STORY');
});

test('goal i1-core-widgets lets explainer.js import ./katex.js', () => {
  const goals = JSON.parse(read('docs/goals/iter-1.json')).goals;
  const g = goals.find((x) => x.id === 'i1-core-widgets');
  assert.ok(g);
  assert.match(g.interfaces, /explainer\.js may import \.\/katex\.js/);
  assert.doesNotMatch(g.interfaces, /No imports between the three files/);
  // and the code does what the goal now says
  assert.match(read('js/core/explainer.js'), /^import \{ tex \} from '\.\/katex\.js';$/m);
  for (const f of ['js/core/katex.js', 'js/core/staircase.js']) assert.doesNotMatch(read(f), /^import /m, `${f} imports nothing`);
});

// ------------------------------------------------------------------------------------------------------
// ARCHITECTURE section 10: the rules the station builders are told to follow
// ------------------------------------------------------------------------------------------------------

test('ARCHITECTURE has the section "Rules for station builders (from wave 0)" with the binding rules in it', () => {
  const doc = read('docs/ARCHITECTURE.md');
  const m = /^## \d+\. Rules for station builders \(from wave 0\)$/m.exec(doc);
  assert.ok(m, 'heading present');
  const body = doc.slice(m.index);
  const must = [
    /cart\(\)[^\n]*polar\(\)[^\n]*input\(\)[^\n]*output\(\)[^\n]*render time/,   // tint at render time, never at mount
    /statementParts/,
    /overflow-x: ?auto/,
    /prose\(/,
    /href[^\n]*route/,
    /scrollTo/,
    /clampRadius/,
    /pointOnPieces/,
    /curve\.family/,
    /window\.__mv/,
    /rangesFromView/,
    /fitTo/,
    /\{ persist: false \}/,
    /'transparent'/,
  ];
  for (const re of must) assert.match(body, re, `section 10 must mention ${re}`);
});
