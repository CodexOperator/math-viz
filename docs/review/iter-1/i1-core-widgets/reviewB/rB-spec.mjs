// Review B: independent A1/A2 spec checks, written from the goal text (not from the builder's test file).
import fs from 'node:fs';
import vm from 'node:vm';
import { argSteps, homeStep } from '../../../../../js/core/staircase.js';
import * as K from '../../../../../js/core/katex.js';
const PI = Math.PI; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const near = (a, b, e = 1e-12) => Math.abs(a - b) <= e;

// A1
const s = argSteps(2 * PI / 3, -2, 2);
ok(s.length === 5 && s.every((e, i) => e.k === i - 2 && near(e.theta, 2 * PI / 3 + 2 * PI * (i - 2))), 'A1 argSteps 5 entries k=-2..2');
let h = homeStep(2 * PI / 3 + 4 * PI); ok(h.k === -2 && near(h.theta, 2 * PI / 3), 'homeStep(2pi/3+4pi) = {-2, 2pi/3}');
h = homeStep(PI); ok(h.k === 0 && near(h.theta, PI), 'homeStep(pi)');
h = homeStep(-PI); ok(h.k === 1 && near(h.theta, PI), 'homeStep(-pi) = {1, pi}');
h = homeStep(PI, 0); ok(h.k === 0 && near(h.theta, PI), 'homeStep(pi,0)');
h = homeStep(-PI / 2, 0); ok(h.k === 1 && near(h.theta, 3 * PI / 2), 'homeStep(-pi/2,0)');
h = homeStep(2 * PI, 0); ok(h.k === 0 && near(h.theta, 2 * PI), 'homeStep(2pi,0)');

// A2 with katex loaded
const src = fs.readFileSync(new URL('../../../../../vendor/katex/katex.min.js', import.meta.url), 'utf8');
vm.runInThisContext(src);
ok(typeof globalThis.katex?.renderToString === 'function', 'katex loaded');
ok(K.texToHtml('\\frac{2\\pi}{3}').includes('class="katex"'), 'texToHtml frac has class="katex"');
ok(/^\\textcolor\{.+\}\{x\}$/.test(K.tint('x', '--cart')), 'tint matches regex (no getComputedStyle)');
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#2563eb' });
ok(/^\\textcolor\{.+\}\{x\}$/.test(K.tint('x', '--cart')), 'tint matches regex (stubbed)');
let r; try { r = K.texToHtml('\\badcommand{'); ok(typeof r === 'string', 'bad tex returns string: ' + r.slice(0, 60)); } catch (e) { ok(false, 'bad tex threw'); }
// fakeEl variants
for (const [name, mk] of [
  ['classList', () => { const c = new Set(); return { textContent: '', classList: { add: x => c.add(x), remove: x => c.delete(x), contains: x => c.has(x) }, _c: c, has: x => c.has(x) }; }],
  ['className only', () => { const o = { textContent: '', className: '', has: x => o.className.split(' ').includes(x) }; return o; }],
  ['dom-like w/ setAttribute', () => { const c = new Set(); return { textContent: '', innerHTML: '', classList: { add: x => c.add(x), remove: x => c.delete(x) }, setAttribute() {}, removeAttribute() {}, has: x => c.has(x) }; }],
]) { const el = mk(); try { K.tex(el, '\\badcommand{'); ok(el.textContent === '\\badcommand{' && el.has('tex-error'), `tex(fakeEl[${name}], bad) sets textContent + tex-error`); } catch (e) { ok(false, `tex fakeEl ${name} threw ${e}`); } }
delete globalThis.getComputedStyle;
delete globalThis.katex;
try { r = K.texToHtml('a<b & "c"'); ok(r === 'a&lt;b &amp; &quot;c&quot;', 'no katex: escaped ' + r); } catch (e) { ok(false, 'no katex threw'); }
try { r = K.texToHtml('<script>alert(1)</script>'); ok(!r.includes('<script>'), 'no katex: script escaped'); } catch (e) { ok(false, 'threw'); }
console.log(fails ? `${fails} FAILURES` : 'ALL OK'); process.exit(fails ? 1 : 0);
