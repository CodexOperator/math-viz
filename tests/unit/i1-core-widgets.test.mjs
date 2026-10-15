import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { argSteps, homeStep, exactPi, fmtDec, stepText, argReadout, windowText, seamJump, homeLabelFor } from '../../js/core/staircase.js';
import { texToHtml, tex, tint, cart, polar, input, output, texColor, escapeHtml, clearTexCache } from '../../js/core/katex.js';
import { sanitizeId, shortHeading } from '../../js/core/explainer.js';

const PI = Math.PI;
const near = (a, b, e = 1e-12) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);

// ---------------- A1
test('A1 argSteps', () => {
  const s = argSteps(2 * PI / 3, -2, 2);
  assert.equal(s.length, 5);
  s.forEach((e, i) => { assert.equal(e.k, i - 2); near(e.theta, 2 * PI / 3 + 2 * PI * (i - 2)); });
  assert.deepEqual(argSteps(1, 3, 1), []);
  assert.deepEqual(argSteps(NaN), []);
  assert.equal(argSteps(0).length, 5);                       // defaults -2..2
});
test('A1 homeStep (the spec cases)', () => {
  const cases = [[[2 * PI / 3 + 4 * PI], -2, 2 * PI / 3], [[PI], 0, PI], [[-PI], 1, PI], [[PI, 0], 0, PI], [[-PI / 2, 0], 1, 3 * PI / 2], [[2 * PI, 0], 0, 2 * PI]];
  for (const [args, k, th] of cases) { const r = homeStep(...args); assert.equal(r.k, k, JSON.stringify(args)); near(r.theta, th); }
});
test('A1 homeStep (problem angles and the half-open window)', () => {
  const cases = [                     // [theta, seam, k, home]
    [0, -PI, 0, 0], [0, 0, 1, 2 * PI],
    [10 * PI / 6, -PI, -1, -PI / 3],                         // 1.3.2: 5pi/3 is -pi/3
    [PI / 2, -PI, 0, PI / 2],                                // 2.2.2: Arg(2i)
    [-3 * PI, -PI, 2, PI], [3 * PI, -PI, -1, PI], [PI, -PI, 0, PI],
    [-PI + 1e-13, -PI, 1, PI],                               // float noise just above the seam is on the seam (residue 65): the top step, pi
    [-PI + 1e-8, -PI, 0, -PI + 1e-8],                        // a real angle 1e-8 above the seam stays where it is
    [PI, 0, 0, PI],                                          // 2.4.1: pi is inside (0, 2pi]
  ];
  for (const [t, seam, k, th] of cases) {
    const r = homeStep(t, seam);
    assert.equal(r.k, k, `${t} seam ${seam}`); near(r.theta, th, 1e-9);
    assert.ok(r.theta > seam && r.theta <= seam + 2 * PI, 'result is in (seam, seam + 2pi]');
  }
  for (let i = 0; i < 2000; i++) {                           // postcondition on random inputs, any seam
    const t = (Math.random() - 0.5) * 200, seam = (Math.random() - 0.5) * 8, r = homeStep(t, seam);
    assert.ok(r.theta > seam && r.theta <= seam + 2 * PI); near(r.theta, t + 2 * PI * r.k, 1e-9);
  }
});
test('homeStep: a representative within float noise of the seam reads as the top step, never as -pi (residue 65)', () => {
  for (let n = -99; n <= 99; n += 2) {                       // every odd multiple of pi, as computed by n * Math.PI
    const r = homeStep(n * PI);
    assert.equal(r.theta, PI, `homeStep(${n}pi) is exactly pi`);
    assert.equal(argReadout('arg z', r.theta), 'Arg z = 3.142 (\u03c0)', `${n}pi reads Arg z = pi`);
    assert.ok(Math.abs(n * PI + 2 * PI * r.k - PI) < 1e-9, `${n}pi: k = ${r.k} is the number of turns that reaches pi`);
  }
  assert.equal(homeStep(13 * PI).theta, PI);                 // the case from the review
  assert.equal(homeStep(13 * PI).k, -6);
  assert.equal(homeStep(-15 * PI).theta, PI);
  for (let n = -100; n <= 100; n += 2) assert.equal(exactPi(homeStep(n * PI).theta), '0', `${n}pi (even) is the step 0`);
  // the window is still half open: just below the top is inside, on the seam is the top, a hair above the top wraps back to it
  assert.equal(homeStep(PI).theta, PI);
  assert.equal(homeStep(-PI).theta, PI);
  assert.equal(homeStep(PI + 1e-12).theta, PI);
  assert.equal(homeStep(PI - 1e-8).theta, PI - 1e-8);
  assert.equal(homeStep(PI - 5e-10).theta, PI);
  // any seam: within 1e-9 above it is the top step, seam + 2pi; 1e-8 above stays
  for (const seam of [0, 1, -2, -PI, PI / 2]) {
    assert.equal(homeStep(seam, seam).theta, seam + 2 * PI, `theta = seam ${seam}`);
    assert.equal(homeStep(seam + 5e-10, seam).theta, seam + 2 * PI, `theta = seam ${seam} + 5e-10`);
    near(homeStep(seam + 1e-8, seam).theta, seam + 1e-8, 1e-15);
    near(homeStep(seam + 2 * PI * 3 + 1e-12, seam).theta, seam + 2 * PI, 1e-9);
  }
  // the text agrees with the window on all of them: no "-π" anywhere for the home step
  for (let n = -49; n <= 49; n += 2) {
    const home = homeStep(n * PI).theta;
    assert.ok(!argReadout('arg z', home).includes('-'), `Arg z readout for ${n}pi`);
    assert.equal(stepText(home, 0).text, 'π');
    assert.equal(stepText(home, -1).text, 'π - 2π = -π');
  }
});
test('exactPi', () => {
  const T = [[2 * PI / 3, '2π/3'], [8 * PI / 3, '8π/3'], [-PI / 3, '-π/3'], [PI, 'π'], [0, '0'], [2 * PI, '2π'], [3 * PI / 2, '3π/2'], [-4 * PI / 3, '-4π/3'], [14 * PI / 3, '14π/3'],
    [-10 * PI / 3, '-10π/3'], [5 * PI / 3, '5π/3'], [PI / 12, 'π/12'], [PI / 13, null], [0.5, null], [2.0944, null], [-PI, '-π'], [4 * PI, '4π'], [85 * PI / 12, '85π/12'], [NaN, null], [Infinity, null]];
  for (const [x, e] of T) assert.equal(exactPi(x), e, String(x));
  assert.equal(exactPi(Math.atan2(Math.sqrt(3), -1)), '2π/3');          // 1.3.1 as computed by atan2
  assert.equal(exactPi(10 * PI / 6 - 2 * PI), '-π/3');
});
test('fmtDec', () => {
  const T = [[2 * PI / 3, '2.094'], [PI, '3.142'], [0, '0'], [-1e-7, '0'], [1, '1'], [-PI / 3, '-1.047'], [2 * PI, '6.283'], [8 * PI / 3, '8.378'], [1.5, '1.5'], [PI - 0.001, '3.141'], [PI + 0.001, '3.143']];
  for (const [x, e] of T) assert.equal(fmtDec(x), e, String(x));
});
test('stepText: the rows of the staircase for the review problems', () => {
  const rows = [      // [home, k, text, dec]
    [2 * PI / 3, -2, '2π/3 - 4π = -10π/3', '-10.472'], [2 * PI / 3, -1, '2π/3 - 2π = -4π/3', '-4.189'], [2 * PI / 3, 0, '2π/3', '2.094'],
    [2 * PI / 3, 1, '2π/3 + 2π = 8π/3', '8.378'], [2 * PI / 3, 2, '2π/3 + 4π = 14π/3', '14.661'],             // 1.3.1
    [-PI / 3, -2, '-π/3 - 4π = -13π/3', '-13.614'], [-PI / 3, -1, '-π/3 - 2π = -7π/3', '-7.33'], [-PI / 3, 0, '-π/3', '-1.047'],
    [-PI / 3, 1, '-π/3 + 2π = 5π/3', '5.236'], [-PI / 3, 2, '-π/3 + 4π = 11π/3', '11.519'],                  // 1.3.2
    [0, 1, '0 + 2π = 2π', '6.283'], [0, 2, '0 + 4π = 4π', '12.566'], [0, 5, '0 + 10π = 10π', '31.416'],      // 1.4.1
    [PI / 2, 1, 'π/2 + 2π = 5π/2', '7.854'], [PI / 2, -1, 'π/2 - 2π = -3π/2', '-4.712'],                     // 2.2.2
    [PI, 0, 'π', '3.142'],                                                                                   // 2.4.1 at -1
    [0.7, 1, '0.7 + 2π', '6.983'], [0.7, -1, '0.7 - 2π', '-5.583'],                                           // no exact form: no "= decimal" tail (the decimal column shows it)
    [3.142, 5, '3.142 + 10π', '34.558'], [3.142, 0, '3.142', '3.142'],
  ];
  for (const [h, k, text, dec] of rows) { const r = stepText(h, k); assert.equal(r.text, text, `${h} k=${k}`); assert.equal(r.dec, dec); near(r.total, h + 2 * PI * k); }
});
test('stepText: full is the text plus the total, for the accessible name', () => {
  assert.equal(stepText(2 * PI / 3, 1).full, '2π/3 + 2π = 8π/3');                     // exact: text already says it
  assert.equal(stepText(2 * PI / 3, 0).full, '2π/3');
  assert.equal(stepText(0.7, 1).full, '0.7 + 2π = 6.983');                              // inexact: the total is added back
  assert.equal(stepText(0.7, -1).full, '0.7 - 2π = -5.583');
  assert.equal(stepText(0.7, 0).full, '0.7');
  for (const [h, k] of [[2 * PI / 3, 2], [-PI / 3, -2], [0, 5], [PI, 1], [0.7, 3]]) assert.ok(stepText(h, k).full.startsWith(stepText(h, k).text));
});
test('readouts and labels', () => {
  assert.equal(argReadout('arg z', 2 * PI / 3), 'Arg z = 2.094 (2π/3)');
  assert.equal(argReadout('arg z', -PI / 3), 'Arg z = -1.047 (-π/3)');
  assert.equal(argReadout('arg z', 0), 'Arg z = 0');
  assert.equal(argReadout('arg c', PI), 'Arg c = 3.142 (π)');
  assert.equal(argReadout('arg z', 0.7), 'Arg z = 0.7');
  assert.equal(windowText(-PI), '(-π, π]'); assert.equal(windowText(0), '(0, 2π]'); assert.equal(windowText(-PI / 2), '(-π/2, 3π/2]');
  assert.equal(homeLabelFor('arg z'), 'Arg z'); assert.equal(homeLabelFor('arg(z₁z₂)'), 'Arg(z₁z₂)'); assert.equal(homeLabelFor('angle'), 'angle');
});
test('seamJump', () => {
  assert.equal(seamJump(PI - 0.1, -PI + 0.1), 1); assert.equal(seamJump(-PI + 0.1, PI - 0.1), -1);
  assert.equal(seamJump(PI - 0.1, 0.5), 0); assert.equal(seamJump(1, 1.2), 0); assert.equal(seamJump(2 * PI / 3, -PI / 2), 0);
  assert.equal(seamJump(2 * PI - 0.1, 0.1), 1);              // seam 0: Arg 2π-0.1 -> 0.1 is the same kind of jump
});
test('explainer helpers', () => {
  assert.equal(sanitizeId('r^n'), 'r-n'); assert.equal(sanitizeId('ok_1-a'), 'ok_1-a'); assert.equal(sanitizeId('a b.c'), 'a-b-c');
  assert.equal(shortHeading('Cartesian (slide)'), 'Cartesian'); assert.equal(shortHeading('Polar (spin-and-stretch)'), 'Polar'); assert.equal(shortHeading('As a motion'), 'As a motion'); assert.equal(shortHeading('(x)'), '(x)');
});

// ---------------- A2
const KATEX_SRC = fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8');
function loadKatex() { delete globalThis.katex; vm.runInThisContext(KATEX_SRC); assert.equal(typeof globalThis.katex.renderToString, 'function'); }
function fakeEl() { const cls = new Set(); return { textContent: '', innerHTML: '', cls, attrs: {}, classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } }; }

test('A2 KaTeX renders, including the shared macros', () => {
  loadKatex(); clearTexCache();
  assert.ok(texToHtml('\\frac{2\\pi}{3}').includes('class="katex"'));
  assert.ok(texToHtml('\\frac{2\\pi}{3}', { display: true }).includes('katex-display'));
  assert.ok(!texToHtml('x^2', { mathml: false }).includes('katex-mathml'));
  assert.ok(texToHtml('x^2').includes('katex-mathml'));
  assert.ok(texToHtml('\\Arg z + \\Re z + \\Im z + \\cj{z}').includes('class="katex"'));
  assert.ok(!texToHtml('\\Re z').includes('tex-error'));
  assert.equal(texToHtml(''), ''); assert.equal(texToHtml(null), '');
});
test('A2 bad TeX never throws and is reported', () => {
  loadKatex();
  const h = texToHtml('\\badcommand{');
  assert.equal(typeof h, 'string'); assert.ok(h.includes('tex-error')); assert.ok(h.includes('\\badcommand{'));
  const el = fakeEl(); tex(el, '\\badcommand{');
  assert.equal(el.textContent, '\\badcommand{'); assert.ok(el.cls.has('tex-error'));
  const ok = fakeEl(); tex(ok, 'x^2');
  assert.ok(ok.innerHTML.includes('katex')); assert.ok(!ok.cls.has('tex-error'));
  tex(ok, '\\badcommand{'); assert.ok(ok.cls.has('tex-error')); tex(ok, 'y'); assert.ok(!ok.cls.has('tex-error'));   // the class is cleared again
  assert.doesNotThrow(() => tex(null, 'x'));
  assert.doesNotThrow(() => tex({ textContent: '', className: '' }, '\\badcommand{'));                                  // element without classList
});
test('A2 tint', () => {
  loadKatex();
  assert.match(tint('x', '--cart'), /^\\textcolor\{.+\}\{x\}$/);
  assert.equal(tint('x', '--cart'), '\\textcolor{currentColor}{x}');                 // no document in Node: KaTeX-safe fallback
  const saved = globalThis.getComputedStyle;
  try {
    globalThis.getComputedStyle = () => ({ getPropertyValue: () => ' #2563eb ' });
    assert.equal(tint('x', '--cart'), '\\textcolor{#2563eb}{x}');
    assert.equal(cart('x'), '\\textcolor{#2563eb}{x}'); assert.equal(polar('r'), '\\textcolor{#2563eb}{r}');
    assert.equal(input('a'), '\\textcolor{#2563eb}{a}'); assert.equal(output('b'), '\\textcolor{#2563eb}{b}');
    assert.ok(texToHtml(tint('x', '--cart')).includes('color:#2563eb'));
    globalThis.getComputedStyle = () => ({ getPropertyValue: () => 'rgb(1, 2, 3)' });                   // KaTeX rejects rgb(); never emit it
    assert.equal(texColor('--cart'), 'currentColor');
    assert.ok(!texToHtml(tint('x', '--cart')).includes('tex-error'));
    assert.equal(texColor('red'), 'red'); assert.equal(texColor('#abc'), '#abc'); assert.equal(texColor(''), 'currentColor');
  } finally { if (saved === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = saved; }
});
test('A2 without KaTeX', () => {
  const saved = globalThis.katex; delete globalThis.katex;
  try {
    assert.equal(texToHtml('a<b & "c"'), 'a&lt;b &amp; &quot;c&quot;');
    assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
    const el = fakeEl(); tex(el, 'x<y'); assert.equal(el.textContent, 'x<y'); assert.ok(el.cls.has('tex-error'));
  } finally { globalThis.katex = saved; }
});
