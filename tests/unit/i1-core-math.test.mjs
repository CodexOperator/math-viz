// tests/unit/i1-core-math.test.mjs
// Unit tests for js/core/complex.js and js/core/parse.js (goal i1-core-math, acceptance A1 to A6).
// Run: node --test tests/unit/i1-core-math.test.mjs
// One test per design id U1..U30 (docs/designs/iter-1/i1-core-math.md, section 7.3). The expectation
// tables below are the design's machine-checked `expression => expected` lines.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as X from '../../js/core/complex.js';
import * as P from '../../js/core/parse.js';

const {
  C, ZERO, ONE, I, fromPolar, toPolar, add, sub, mul, div, neg, conj, inv, scale, abs, abs2, Arg, wrapArg,
  argSet, expi, exp, log, sqrt, sin, cos, pow, powc, rootsOf, rootsOfUnity, principalRoot, branchRoot,
  branchArg, isPrimitiveRoot, quadraticRoots, eq, isFiniteC, numericPartials, jacobian, localLinear,
  directionalQuotients, fmtNum, fmtCart, fmtPolar, fmtAngle, exactAngle, texNumber, texCart, texPolar, texAngle,
} = X;
const { parse, compile, evaluate, toTex, ParseError } = P;

const PI = Math.PI;
const S2 = Math.SQRT2;
const S3 = Math.sqrt(3);
const z1 = C(3, -2);
const z2 = C(-1, 4);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ----- helpers ------------------------------------------------------------------------------

const approx = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
// Modulus-relative on purpose: pow(5+5i, 8) is exactly 6250000 by squaring while de Moivre gives
// 6250000 - 1.5e-9 i, so a component-wise absolute tolerance would reject the more accurate answer.
const approxC = (z, w, tol = 1e-9) => Math.hypot(z.re - w.re, z.im - w.im) <= tol * Math.max(1, Math.hypot(w.re, w.im));
const sameAngle = (a, b, tol = 1e-9) => Math.abs(wrapArg(a - b)) < tol;
const okC = (z, w, tol, msg) => assert.ok(approxC(z, w, tol), `${msg || ''} expected ${JSON.stringify(w)} got ${JSON.stringify(z)}`);
const okN = (a, b, tol, msg) => assert.ok(approx(a, b, tol), `${msg || ''} expected ${b} got ${a}`);

const SAMPLES = [C(3, -2), C(-1, 4), C(-1, S3), C(S3, 1), C(0.3, -0.7), C(-2, -0.5), C(0, 2), C(-3, 0), C(1e-3, 2e-3), C(5, 5), C(-1, 1), C(-1, 2)];

// ----- the table runner ---------------------------------------------------------------------

const ENV = { ...X, parse, compile, evaluate, toTex, ParseError, PI, S2, S3 };
const ENV_NAMES = Object.keys(ENV);
const ENV_VALUES = ENV_NAMES.map((k) => ENV[k]);
const js = (src) => new Function(...ENV_NAMES, `return (${src});`)(...ENV_VALUES);

// Numbers to 1e-9 (relative above 1), NaN equals NaN, strings and booleans exactly, objects and arrays by key.
function same(actual, expected) {
  if (typeof expected === 'number') {
    if (typeof actual !== 'number') return false;
    if (Number.isNaN(expected)) return Number.isNaN(actual);
    return approx(actual, expected, 1e-9);
  }
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && expected.every((e, i) => same(actual[i], e));
  }
  if (expected && typeof expected === 'object') {
    return actual && typeof actual === 'object' && Object.keys(expected).every((k) => same(actual[k], expected[k]));
  }
  return actual === expected;
}

function checkLine(line) {
  const at = line.lastIndexOf(' => ');
  const exprSrc = line.slice(0, at);
  const expSrc = line.slice(at + 4).trim();
  const thrown = /^throws ParseError@(\d+)$/.exec(expSrc);
  if (thrown) {
    try {
      js(exprSrc);
    } catch (e) {
      return e instanceof ParseError && e.position === Number(thrown[1]) ? null : `${line}  (threw ${e.name} at ${e.position})`;
    }
    return `${line}  (did not throw)`;
  }
  const raw = /^"([^"]*)"$/.exec(expSrc);
  const expected = raw ? raw[1] : js(expSrc);
  let actual;
  try {
    actual = js(exprSrc);
  } catch (e) {
    return `${line}  (threw ${e && e.message})`;
  }
  return same(actual, expected) ? null : `${line}  (got ${JSON.stringify(actual)})`;
}

function runTable(name) {
  const lines = TABLES[name].split('\n').filter((l) => l.trim());
  assert.ok(lines.length > 0, `table ${name} is empty`);
  const failures = lines.map(checkLine).filter(Boolean);
  assert.equal(failures.length, 0, `${failures.length} of ${lines.length} rows of table "${name}" failed:\n${failures.join('\n')}`);
  return lines.length;
}

// ----- expectation tables, copied from docs/designs/iter-1/i1-core-math.md (sections 6.2, 7.4 to 7.6) ----
// Each line is `expression => expected`; the expression is JavaScript run with the exports of both
// modules in scope (plus PI, S2, S3). A quoted expected string is raw (backslashes are TeX, not escapes).
const TABLES = {
  // 1.1.1 z1 = 3 - 2i, z2 = -1 + 4i: compute z1 z2 and z1/z2
  p111: String.raw`
mul(C(3,-2), C(-1,4)) => C(5, 14)
div(C(3,-2), C(-1,4)) => C(-11/17, -10/17)
abs(C(3,-2)) => 3.6055512755
Arg(C(3,-2)) => -0.5880026035
abs(C(-1,4)) => 4.1231056256
Arg(C(-1,4)) => 1.8157749899
abs(mul(C(3,-2), C(-1,4))) => 14.8660687473
Arg(mul(C(3,-2), C(-1,4))) => 1.2277723864
abs(div(C(3,-2), C(-1,4))) => 0.8744746322
Arg(div(C(3,-2), C(-1,4))) => -2.4037775934
Arg(C(3,-2)) + Arg(C(-1,4)) => 1.2277723864
Arg(C(3,-2)) - Arg(C(-1,4)) => -2.4037775934
`,
  // 1.1.2 Im(conj(z1 - z2))
  p112: String.raw`
sub(C(3,-2), C(-1,4)) => C(4, -6)
conj(sub(C(3,-2), C(-1,4))) => C(4, 6)
conj(sub(C(3,-2), C(-1,4))).im => 6
abs(C(4,-6)) => 7.2111025509
Arg(C(4,6)) => 0.9827937232
abs(C(4,6)) * Math.sin(Arg(C(4,6))) => 6
`,
  // 1.3.1 z = -1 + i sqrt3: polar form, exponential form, Arg z
  p131: String.raw`
toPolar(C(-1, S3)) => {r: 2, theta: 2*PI/3}
fromPolar(2, 2*PI/3) => C(-1, S3)
Arg(C(-1, S3)) => 2.0943951024
argSet(C(-1, S3), {kMin: -1, kMax: 1}).map((e) => e.theta) => [-4.1887902048, 2.0943951024, 8.3775804096]
argSet(C(-1, S3), {kMin: -1, kMax: 1}).map((e) => fmtAngle(e.theta)) => ["-4pi/3", "2pi/3", "8pi/3"]
argSet(C(-1, S3)).every((e) => eq(fromPolar(2, e.theta), C(-1, S3))) => true
fmtCart(C(-1, S3)) => "-1 + 1.732i"
texCart(C(-1, S3)) => "-1 + \sqrt{3}\,i"
fmtPolar(C(-1, S3)) => "2 e^(i 2.094)"
texPolar(C(-1, S3)) => "2\,e^{i\frac{2\pi}{3}}"
`,
  // 1.3.2 (sqrt3 + i)^10 in the form x + iy
  p132: String.raw`
pow(C(S3, 1), 10) => C(512, -512*S3)
Arg(pow(C(S3, 1), 10)) => -PI/3
abs(pow(C(S3, 1), 10)) => 1024
pow(C(S3, 1), 2) => C(2, 2*S3)
pow(C(S3, 1), 4) => C(-8, 8*S3)
pow(C(S3, 1), 8) => C(-128, -128*S3)
wrapArg(10*PI/6) => -PI/3
fmtCart(pow(C(S3, 1), 10)) => "512 - 886.81i"
texCart(pow(C(S3, 1), 10)) => "512 - 512\sqrt{3}\,i"
texPolar(pow(C(S3, 1), 10)) => "1024\,e^{-i\frac{\pi}{3}}"
`,
  // 1.4.1 The 5th roots of unity
  p141: String.raw`
rootsOfUnity(5)[1] => C(Math.cos(2*PI/5), Math.sin(2*PI/5))
rootsOfUnity(5)[1] => C(0.3090169944, 0.9510565163)
rootsOfUnity(5)[2] => C(-0.8090169944, 0.5877852523)
rootsOfUnity(5)[3] => C(-0.8090169944, -0.5877852523)
rootsOfUnity(5)[4] => C(0.3090169944, -0.9510565163)
rootsOfUnity(5).map((r) => abs(pow(r, 5))) => [1, 1, 1, 1, 1]
rootsOfUnity(5).map((r) => pow(r, 5)).every((p) => eq(p, 1)) => true
rootsOfUnity(5).reduce((s, r) => add(s, r)) => C(0, 0)
rootsOfUnity(5).map((r) => Arg(r)) => [0, 2*PI/5, 4*PI/5, -4*PI/5, -2*PI/5]
[0, 1, 2, 3, 4].map((k) => isPrimitiveRoot(k, 5)) => [false, true, true, true, true]
rootsOfUnity(5)[1].re => (Math.sqrt(5) - 1)/4
texPolar(rootsOfUnity(5)[1]) => "e^{i\frac{2\pi}{5}}"
texPolar(rootsOfUnity(5)[3]) => "e^{-i\frac{4\pi}{5}}"
`,
  // 1.4.2 The 4th roots of -16, in exponential and Cartesian form
  p142: String.raw`
rootsOf(C(-16, 0), 4) => [C(S2, S2), C(-S2, S2), C(-S2, -S2), C(S2, -S2)]
rootsOf(C(-16, 0), 4).map((r) => pow(r, 4)).every((p) => eq(p, -16)) => true
rootsOf(C(-16, 0), 4).map((r) => abs(r)) => [2, 2, 2, 2]
rootsOf(C(-16, 0), 4).map((r) => Arg(r)) => [PI/4, 3*PI/4, -3*PI/4, -PI/4]
argSet(C(-16, 0), {kMin: 0, kMax: 3}).map((e) => e.theta / 4) => [PI/4, 3*PI/4, 5*PI/4, 7*PI/4]
principalRoot(C(-16, 0), 4) => C(S2, S2)
texCart(rootsOf(C(-16, 0), 4)[2]) => "-\sqrt{2} - \sqrt{2}\,i"
texPolar(rootsOf(C(-16, 0), 4)[2]) => "2\,e^{-i\frac{3\pi}{4}}"
fmtPolar(rootsOf(C(-16, 0), 4)[0]) => "2 e^(i 0.785)"
`,
  // 1.4.3 z^2 - 4z + 13 = 0
  p143: String.raw`
quadraticRoots(1, -4, 13) => [C(2, 3), C(2, -3)]
add(quadraticRoots(1, -4, 13)[0], quadraticRoots(1, -4, 13)[1]) => C(4, 0)
mul(quadraticRoots(1, -4, 13)[0], quadraticRoots(1, -4, 13)[1]) => C(13, 0)
sqrt(C(-36, 0)) => C(0, 6)
Arg(C(2, 3)) => 0.9827937232
abs(C(2, 3)) => 3.6055512755
texPolar(C(2, 3)) => "3.606\,e^{i\,0.983}"
`,
  // 2.2.2 Principal value of (2i)^{1/2}
  p222: String.raw`
principalRoot(C(0, 2), 2) => C(1, 1)
sqrt(C(0, 2)) => C(1, 1)
rootsOf(C(0, 2), 2)[1] => C(-1, -1)
Arg(C(0, 2)) => PI/2
abs(C(0, 2)) => 2
pow(C(1, 1), 2) => C(0, 2)
texPolar(principalRoot(C(0, 2), 2)) => "\sqrt{2}\,e^{i\frac{\pi}{4}}"
texCart(principalRoot(C(0, 2), 2)) => "1 + i"
principalRoot(C(-8, 0), 3) => C(1, S3)
`,
  // 2.4.1 A branch of z^{1/3} continuous along the negative x-axis
  p241: String.raw`
branchRoot(C(-1, 0), 3, 0) => C(0.5, S3/2)
branchRoot(C(-1, 0), 3, -PI) => C(0.5, S3/2)
branchRoot(C(-1, 1e-9), 3, 0) => C(0.5, S3/2)
branchRoot(C(-1, -1e-9), 3, 0) => C(0.5, S3/2)
branchRoot(C(-1, -1e-12), 3, 0).im > 0.8 => true
branchRoot(C(-1, -1e-12), 3, -PI).im < 0 => true
abs(sub(branchRoot(C(-1, 1e-9), 3, -PI), branchRoot(C(-1, -1e-9), 3, -PI))) => S3
branchArg(C(-1, 0), 0) => PI
branchArg(C(1, 0), 0) => 2*PI
branchArg(C(0, -1), 0) => 3*PI/2
branchArg(C(1, 0), -PI) => 0
branchRoot(C(1, 0), 3, 0) => C(-0.5, S3/2)
texCart(branchRoot(C(-1, 0), 3, 0)) => "\frac{1}{2} + \frac{\sqrt{3}}{2}i"
`,
  // 3.1.1 f(z) = z^2 + z is differentiable everywhere; find f'
  p311: String.raw`
compile("z^2 + z").f(C(1,1)) => C(1, 3)
localLinear(compile("z^2 + z").f, C(1,1)).A => C(3, 2)
abs(localLinear(compile("z^2 + z").f, C(1,1)).B) < 1e-6 => true
numericPartials(compile("z^2 + z").f, C(1,1)).fx => C(3, 2)
numericPartials(compile("z^2 + z").f, C(1,1)).fy => C(-2, 3)
directionalQuotients(compile("z^2 + z").f, C(1,1), 1e-3, 4).map((e) => e.q).map((q) => Math.round(q.re*1000)/1000 + "," + Math.round(q.im*1000)/1000) => ["3.001,2", "3,2.001", "2.999,2", "3,1.999"]
abs(C(3, 2)) => 3.6055512755
Arg(C(3, 2)) => 0.5880026035
`,
  // 3.1.2 f(z) = |z|^2 is differentiable only at 0
  p312: String.raw`
localLinear(compile("abs(z)^2").f, C(1,1)).A => C(1, -1)
localLinear(compile("abs(z)^2").f, C(1,1)).B => C(1, 1)
abs(localLinear(compile("abs(z)^2").f, C(1,1)).B) => 1.4142135624
localLinear(compile("abs(z)^2").f, C(0,0)).A => C(0, 0)
localLinear(compile("abs(z)^2").f, C(0,0)).B => C(0, 0)
directionalQuotients(compile("abs(z)^2").f, C(1,1), 1e-3, 4).map((e) => e.q).map((q) => Math.round(q.re*10)/10 + "," + Math.round(q.im*10)/10) => ["2,0", "0,-2", "2,0", "0,-2"]
abs(sub(directionalQuotients(compile("abs(z)^2").f, C(1,1), 1e-3, 8)[3].q, add(conj(C(1,1)), mul(C(1,1), expi(-2*(2*PI*3/8)))))) < 2e-3 => true
`,
  // P1 conj(z1) conj(z2) = conj(z1 z2)
  pP1: String.raw`
mul(conj(C(3,-2)), conj(C(-1,4))) => C(5, -14)
conj(mul(C(3,-2), C(-1,4))) => C(5, -14)
`,
  // P2 |z| = sqrt(z conj z)
  pP2: String.raw`
mul(C(3,-2), conj(C(3,-2))) => C(13, 0)
abs2(C(3,-2)) => 13
Math.sqrt(mul(C(3,-2), conj(C(3,-2))).re) => abs(C(3,-2))
abs(C(3,-2)) => 3.6055512755
`,
  // P6 f(z) = Re z is not differentiable
  pP6: String.raw`
localLinear(compile("Re(z)").f, C(0.3,-0.7)).A => C(0.5, 0)
localLinear(compile("Re(z)").f, C(0.3,-0.7)).B => C(0.5, 0)
directionalQuotients(compile("Re(z)").f, C(0.3,-0.7), 1e-3, 4).map((e) => e.q).map((q) => Math.round(q.re*10)/10 + "," + Math.round(q.im*10)/10) => ["1,0", "0,0", "1,0", "0,0"]
`,
  // 7.4.1 Plain text (each line is call => expected; strings are raw, no escaping)
  fmtText: String.raw`
fmtNum(2.2360679, 3) => "2.236"
fmtNum(-1e-7) => "0"
fmtNum(2) => "2"
fmtNum(0.5) => "0.5"
fmtNum(-0.0004) => "0"
fmtNum(-0.0005) => "-0.001"
fmtNum(1234.5678, 0) => "1235"
fmtNum(1.5e16) => "1.5×10¹⁶"
fmtNum(-3e30) => "-3×10³⁰"
fmtSci(8.528580126914589e25) => "8.529×10²⁵"
fmtSci(2.44e-4) => "2.44×10⁻⁴"
fmtSci(1e6) => "1×10⁶"
fmtSci(3.6e-15, 1) => "3.6×10⁻¹⁵"
fmtSci(0) => "0"
fmtSci(NaN) => "undefined"
fmtSci(-Infinity) => "-inf"
fmtNum(0.9996) => "1"
fmtNum(-0) => "0"
fmtNum(100) => "100"
fmtNum(NaN) => "undefined"
fmtNum(Infinity) => "inf"
fmtNum(-Infinity) => "-inf"
fmtNum(-2.5, 1) => "-2.5"
fmtNum(1/3, 6) => "0.333333"
fmtCart(C(3, -2)) => "3 - 2i"
fmtCart(I) => "i"
fmtCart(C(0, -1)) => "-i"
fmtCart(C(2, 0.5)) => "2 + 0.5i"
fmtCart(ZERO) => "0"
fmtCart(C(1, 1)) => "1 + i"
fmtCart(C(1, -1)) => "1 - i"
fmtCart(C(-2, 0)) => "-2"
fmtCart(C(-11/17, -10/17)) => "-0.647 - 0.588i"
fmtCart(C(NaN, NaN)) => "undefined"
fmtCart(C(1e-9, 2)) => "2i"
fmtCart(C(5, 14)) => "5 + 14i"
fmtCart(C(-1, S3)) => "-1 + 1.732i"
fmtCart(C(Infinity, 0)) => "inf"
fmtCart(C(0.9996, 0.0004)) => "1"
fmtCart(C(2, 3), 0) => "2 + 3i"
fmtPolar(C(-1, S3)) => "2 e^(i 2.094)"
fmtPolar(C(3, -2)) => "3.606 e^(-i 0.588)"
fmtPolar(I) => "e^(i 1.571)"
fmtPolar(C(2, 0)) => "2"
fmtPolar(ZERO) => "0"
fmtPolar(C(-16, 0)) => "16 e^(i 3.142)"
fmtPolar(C(NaN, 0)) => "undefined"
fmtAngle(2*PI/3) => "2pi/3"
fmtAngle(-PI/3) => "-pi/3"
fmtAngle(1.234) => "1.234"
fmtAngle(PI) => "pi"
fmtAngle(-PI) => "-pi"
fmtAngle(0) => "0"
fmtAngle(2*PI) => "2pi"
fmtAngle(PI/2) => "pi/2"
fmtAngle(-5*PI/6) => "-5pi/6"
fmtAngle(2*PI/3 + 2*PI) => "8pi/3"
fmtAngle(-5*PI/6 + 6*PI) => "31pi/6"
fmtAngle(5*PI/3) => "5pi/3"
fmtAngle(PI/12) => "pi/12"
fmtAngle(PI/13) => "0.242"
fmtAngle(2*PI/3, {pi: false}) => "2.094"
fmtAngle(2*PI/3, {unicode: true}) => "2π/3"
fmtAngle(Math.atan2(-2, 3)) => "-0.588"
fmtAngle(1) => "1"
fmtAngle(2.094) => "2.094"
fmtAngle(NaN) => "undefined"
fmtAngle(1.234, {digits: 1}) => "1.2"
exactAngle(2*PI/3) => {p: 2, q: 3}
exactAngle(1.234) => null
exactAngle(0) => {p: 0, q: 1}
exactAngle(-PI) => {p: -1, q: 1}
`,
  // 7.4.2 TeX
  fmtTex: String.raw`
texNumber(-11/17) => "-\frac{11}{17}"
texNumber(S2) => "\sqrt{2}"
texNumber(-512*S3) => "-512\sqrt{3}"
texNumber(S3/2) => "\frac{\sqrt{3}}{2}"
texNumber(-S2/2) => "-\frac{\sqrt{2}}{2}"
texNumber(3*S2/2) => "\frac{3\sqrt{2}}{2}"
texNumber(0) => "0"
texNumber(1e-13) => "0"
texNumber(5) => "5"
texNumber(-7) => "-7"
texNumber(0.5) => "\frac{1}{2}"
texNumber(0.123) => "0.123"
texNumber(2.2360679) => "2.236"
texNumber(PI) => "\pi"
texNumber(2*PI/3) => "\frac{2\pi}{3}"
texNumber(-PI/4) => "-\frac{\pi}{4}"
texNumber(Math.sqrt(13)) => "3.606"
texNumber(NaN) => "\text{undefined}"
texNumber(Infinity) => "\infty"
texNumber(-Infinity) => "-\infty"
texNumber(511.99999999999994) => "512"
texNumber(1e7) => "10000000"
texAngle(2*PI/3) => "\frac{2\pi}{3}"
texAngle(-PI/3) => "-\frac{\pi}{3}"
texAngle(1.234) => "1.234"
texAngle(PI) => "\pi"
texAngle(0) => "0"
texAngle(3*PI) => "3\pi"
texAngle(-PI) => "-\pi"
texAngle(NaN) => "\text{undefined}"
texCart(C(3, -2)) => "3 - 2i"
texCart(C(S2, S2)) => "\sqrt{2} + \sqrt{2}\,i"
texCart(C(-S2, S2)) => "-\sqrt{2} + \sqrt{2}\,i"
texCart(C(-11/17, -10/17)) => "-\frac{11}{17} - \frac{10}{17}i"
texCart(I) => "i"
texCart(C(0, -1)) => "-i"
texCart(ZERO) => "0"
texCart(C(-1, S3)) => "-1 + \sqrt{3}\,i"
texCart(C(0.5, S3/2)) => "\frac{1}{2} + \frac{\sqrt{3}}{2}i"
texCart(C(512, -512*S3)) => "512 - 512\sqrt{3}\,i"
texCart(C(2, 3)) => "2 + 3i"
texCart(C(0.30901699437494745, 0.9510565162951535)) => "0.309 + 0.951i"
texCart(C(0, -S3)) => "-\sqrt{3}\,i"
texCart(C(0, 2*PI)) => "2\pi\,i"
texCart(C(NaN, 1)) => "\text{undefined}"
texCart(C(5, 14)) => "5 + 14i"
texCart(C(1, 1)) => "1 + i"
texPolar(C(-1, S3)) => "2\,e^{i\frac{2\pi}{3}}"
texPolar(C(1, 1)) => "\sqrt{2}\,e^{i\frac{\pi}{4}}"
texPolar(C(3, -2)) => "3.606\,e^{-i\,0.588}"
texPolar(I) => "e^{i\frac{\pi}{2}}"
texPolar(C(-16, 0)) => "16\,e^{i\pi}"
texPolar(C(2, 0)) => "2"
texPolar(ONE) => "1"
texPolar(ZERO) => "0"
texPolar(C(S2, -S2)) => "2\,e^{-i\frac{\pi}{4}}"
texPolar(pow(C(S3, 1), 10)) => "1024\,e^{-i\frac{\pi}{3}}"
texPolar(fromPolar(2, 2.1)) => "2\,e^{i\,2.1}"
`,
  // 7.5.1 Handout (A5 values)
  handout: String.raw`
evaluate("z^2 + iz", C(1,1)) => C(-1, 3)
evaluate("(1+i)z", I) => C(-1, 1)
evaluate("iz - 2i", C(2,3)) => C(-3, 0)
evaluate("sqrt(z)", C(0,2)) => C(1, 1)
evaluate("1/z", C(2,0)) => C(0.5, 0)
evaluate("1/z", 2) => C(0.5, 0)
evaluate("z^(1/3)", C(-1,0)) => C(0.5, S3/2)
evaluate("abs(z)^2", C(3,-2)) => C(13, 0)
evaluate("z^2/abs(z)^2", C(1,1)) => C(0, 1)
Math.abs(evaluate("(x^2 - y^2 + 2ixy)/(x^2 + y^2)", C(0.01, 0.0001)).re - 1) < 1e-3 => true
evaluate("(Re(1+z) - 1)/z", C(0, 0.5)) => C(0, 0)
evaluate("exp(z)", C(0, PI/2)) => C(0, 1)
evaluate("conj(z)", C(1,2)) => C(1, -2)
evaluate("-z^2", I) => C(1, 0)
evaluate("2z", C(1,1)) => C(2, 2)
evaluate("z(z+1)", C(1,0)) => C(2, 0)
parse("z +") => throws ParseError@3
parse("foo(z)") => throws ParseError@0
toTex("z^2 + iz") => "z^{2} + iz"
`,
  // 7.5.2 The ARCHITECTURE 3.4 catalogue (and sin, cos, log), independent values from Python cmath
  catalogue: String.raw`
evaluate("z^2", C(0.3,-0.7)) => C(-0.4, -0.42)
evaluate("z^3", C(0.3,-0.7)) => C(-0.414, 0.154)
evaluate("1/z", C(0.3,-0.7)) => C(0.5172413793, 1.2068965517)
evaluate("iz - 2i", C(0.3,-0.7)) => C(0.7, -1.7)
evaluate("(1+i)z", C(0.3,-0.7)) => C(1, -0.4)
evaluate("z^2 + iz", C(0.3,-0.7)) => C(0.3, -0.12)
evaluate("z^2 + z", C(0.3,-0.7)) => C(-0.1, -1.12)
evaluate("exp(z)", C(0.3,-0.7)) => C(1.0324289629, -0.8696029191)
evaluate("conj(z)", C(0.3,-0.7)) => C(0.3, 0.7)
evaluate("Re(z)", C(0.3,-0.7)) => C(0.3, 0)
evaluate("abs(z)^2", C(0.3,-0.7)) => C(0.58, 0)
evaluate("z^2/abs(z)^2", C(0.3,-0.7)) => C(-0.6896551724, -0.7241379310)
evaluate("sqrt(z)", C(0.3,-0.7)) => C(0.7285524383, -0.4804046787)
evaluate("z^(1/3)", C(0.3,-0.7)) => C(0.8451106965, -0.3460390184)
evaluate("(Re(1+z) - 1)/z", C(0.3,-0.7)) => C(0.1551724138, 0.3620689655)
evaluate("sin(z)", C(0.3,-0.7)) => C(0.3709278039, -0.7247026904)
evaluate("cos(z)", C(0.3,-0.7)) => C(1.1991087511, 0.2241768123)
evaluate("log(z)", C(0.3,-0.7)) => C(-0.2723635877, -1.1659045405)
evaluate("z^2", C(1,1)) => C(0, 2)
evaluate("z^3", C(1,1)) => C(-2, 2)
evaluate("1/z", C(1,1)) => C(0.5, -0.5)
evaluate("exp(z)", C(1,1)) => C(1.4686939399, 2.2873552872)
evaluate("sqrt(z)", C(1,1)) => C(1.0986841135, 0.4550898606)
evaluate("z^(1/3)", C(1,1)) => C(1.0842150815, 0.2905145555)
evaluate("(Re(1+z) - 1)/z", C(1,1)) => C(0.5, -0.5)
evaluate("z^(1/3)", C(-1,0)) => C(0.5, S3/2)
evaluate("sqrt(z)", C(-1,0)) => C(0, 1)
evaluate("log(z)", C(-1,0)) => C(0, PI)
evaluate("1/z", C(0,0)).re => NaN
evaluate("z^2/abs(z)^2", C(0,0)).re => NaN
`,
  // 7.5.3 Grammar (U23)
  grammar: String.raw`
evaluate("-z^2", I) => C(1, 0)
evaluate("2^3^2", ZERO) => C(512, 0)
evaluate("1/2z", C(2,0)) => C(1, 0)
evaluate("1/(2z)", C(2,0)) => C(0.25, 0)
evaluate("z^-1", C(0,2)) => C(0, -0.5)
evaluate("2ixy", C(1,2)) => C(0, 4)
evaluate("x^2 - y^2 + 2ixy", C(1,2)) => C(-3, 4)
evaluate("e^z", C(0, PI)) => C(-1, 0)
evaluate("z**2", C(0,2)) => C(-4, 0)
evaluate("2−z", C(1,1)) => C(1, -1)
evaluate("πz", ONE) => C(PI, 0)
evaluate("z²", I) => C(-1, 0)
evaluate("2×z", C(1,1)) => C(2, 2)
evaluate("0.5z + .5", C(2,0)) => C(1.5, 0)
evaluate("  z  +  1 ", C(2,0)) => C(3, 0)
evaluate("z + -z", C(1,2)) => C(0, 0)
evaluate("2*-z", C(1,1)) => C(-2, -2)
evaluate("--z", C(1,1)) => C(1, 1)
evaluate("+z", C(1,1)) => C(1, 1)
evaluate("i i", ZERO) => C(-1, 0)
evaluate("xy", C(2,3)) => C(6, 0)
evaluate("z z", I) => C(-1, 0)
evaluate("2(z+1)", ONE) => C(4, 0)
evaluate("(z+1)(z-1)", C(2,0)) => C(3, 0)
evaluate("sin(z)cos(z)", ZERO) => C(0, 0)
evaluate("z^2i", ONE) => C(0, 1)
evaluate("abs(z)", C(3,4)) => C(5, 0)
evaluate("Arg(z)", C(-1,0)) => C(PI, 0)
evaluate("arg(z)", C(0,-1)) => C(-PI/2, 0)
evaluate("Im(z^2)", C(1,1)) => C(2, 0)
evaluate("log(z)", C(Math.E,0)) => C(1, 0)
evaluate("0^z", ZERO) => C(1, 0)
evaluate("z^0", ZERO) => C(1, 0)
evaluate("pi", ZERO) => C(PI, 0)
evaluate("e", ZERO) => C(Math.E, 0)
evaluate("i", ZERO) => C(0, 1)
evaluate("z^(2z)", ONE) => C(1, 0)
evaluate("z^2^2", I) => C(1, 0)
evaluate("1e-3", ZERO) => C(0.001, 0)
evaluate("2e3", ZERO) => C(2000, 0)
evaluate("3E12 + 1e12i", ZERO) => C(3e12, 1e12)
evaluate("1.5e2z", ONE) => C(150, 0)
evaluate("2e^z", ZERO) => C(2, 0)
evaluate("2e", ZERO) => C(2 * Math.E, 0)
evaluate("2 e - 3", ZERO) => C(2 * Math.E - 3, 0)
evaluate("e-3", ZERO) => C(Math.E - 3, 0)
`,
  // 7.5.4 toTex pinned strings (U26)
  toTexRows: String.raw`
toTex("z^2 + iz") => "z^{2} + iz"
toTex("(1+i)z") => "\left(1 + i\right)z"
toTex("iz - 2i") => "iz - 2i"
toTex("exp(z)") => "e^{z}"
toTex("conj(z)") => "\overline{z}"
toTex("Re(z)") => "\operatorname{Re}\left(z\right)"
toTex("abs(z)^2") => "\left|z\right|^{2}"
toTex("z^2/abs(z)^2") => "\frac{z^{2}}{\left|z\right|^{2}}"
toTex("sqrt(z)") => "\sqrt{z}"
toTex("z^(1/3)") => "z^{\frac{1}{3}}"
toTex("1/z") => "\frac{1}{z}"
toTex("(x^2 - y^2 + 2ixy)/(x^2 + y^2)") => "\frac{x^{2} - y^{2} + 2ixy}{x^{2} + y^{2}}"
toTex("(Re(1+z) - 1)/z") => "\frac{\operatorname{Re}\left(1 + z\right) - 1}{z}"
toTex("-z^2") => "-z^{2}"
toTex("(-z)^2") => "\left(-z\right)^{2}"
toTex("2*3") => "2 \cdot 3"
toTex("2*z") => "2z"
toTex("z - (z + 1)") => "z - \left(z + 1\right)"
toTex("2^-1") => "2^{-1}"
toTex("exp(z)^2") => "\left(e^{z}\right)^{2}"
toTex("z/2/z") => "\frac{\frac{z}{2}}{z}"
toTex("arg(z)") => "\arg\left(z\right)"
toTex("Arg(z)") => "\operatorname{Arg}\left(z\right)"
toTex("pi") => "\pi"
toTex("e^(i pi)") => "e^{i\pi}"
toTex("0.5z") => "0.5z"
toTex("z(z+1)") => "z\left(z + 1\right)"
toTex("log(z)") => "\log\left(z\right)"
toTex("pi z") => "\pi\,z"
toTex("piz") => "\pi\,z"
toTex("pi x") => "\pi\,x"
toTex("pi e") => "\pi\,e"
toTex("-pi z") => "-\pi\,z"
toTex("2 pi z") => "2\pi\,z"
toTex("2 pi i z") => "2\pi\,iz"
toTex("exp(i pi z)") => "e^{i\pi\,z}"
toTex("e^(2 pi i z)") => "e^{2\pi\,iz}"
toTex("pi(z+1)") => "\pi\left(z + 1\right)"
toTex("pi abs(z)") => "\pi\left|z\right|"
toTex("pi z^2") => "\pi\,z^{2}"
toTex("z pi") => "z\pi"
toTex("2 pi") => "2\pi"
toTex("pi pi") => "\pi\pi"
toTex("pi*z") => "\pi \cdot z"
toTex("pi/z") => "\frac{\pi}{z}"
`,
  // 7.6 ParseError rows (U24)
  errors: String.raw`
"" || 0 || 1 || Type a formula in z, for example z^2 + i z. || M1
"   " || 0 || 1 || Type a formula in z, for example z^2 + i z. || M1
"foo(z)" || 0 || 3 || I don't know the name "foo". You can use z, x, y, i, e, pi and the functions conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos. || M2
"sinh(z)" || 0 || 4 || I don't know the name "sinh". You can use z, x, y, i, e, pi and the functions conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos. || M2
"zfoo" || 0 || 4 || I don't know the name "zfoo". You can use z, x, y, i, e, pi and the functions conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos. || M2
"Z" || 0 || 1 || I don't know the name "Z". Names are case-sensitive; did you mean "z"? || M3
"SQRT(z)" || 0 || 4 || I don't know the name "SQRT". Names are case-sensitive; did you mean "sqrt"? || M3
"re(z)" || 0 || 2 || I don't know the name "re". Names are case-sensitive; did you mean "Re"? || M3
"i Z" || 2 || 1 || I don't know the name "Z". Names are case-sensitive; did you mean "z"? || M3
"z @ 2" || 2 || 1 || I don't understand the character "@". Use numbers, z, x, y, i, e, pi, + - * / ^ and brackets ( ). || M4
"|z - (1+2i)|" || 0 || 1 || Bars are not supported. Use abs(z) for the modulus, like abs(z - 1). || M4
"z - |z|" || 4 || 1 || Bars are not supported. Use abs(z) for the modulus, like abs(z - 1). || M4
"\u221az" || 0 || 1 || The root sign is not supported. Use sqrt(z) for a square root, like sqrt(z + 1). || M4
"1 + \u221a(z)" || 4 || 1 || The root sign is not supported. Use sqrt(z) for a square root, like sqrt(z + 1). || M4
"1.2.3" || 3 || 1 || This number has two decimal points. || M5
"." || 0 || 1 || A "." must have digits next to it, like 0.5. || M6
"9".repeat(320) || 0 || 320 || That number is too big. || M7
"z+".repeat(300) + "z" || 400 || 1 || That formula is too long (more than 400 characters). || M8
"(".repeat(100) + "z" + ")".repeat(100) || 80 || 1 || This formula is nested too deeply. || M9
"sin z" || 0 || 3 || "sin" needs brackets around its input, like sin(z). || M10
"abs z" || 0 || 3 || "abs" needs brackets around its input, like abs(z). || M10
"cosz" || 0 || 3 || "cos" needs brackets around its input, like cos(z). || M10
"Im" || 0 || 2 || "Im" needs brackets around its input, like Im(z). || M10
"z +" || 3 || 1 || The formula stops too early. Something is missing after "+". || M11
"sin(" || 4 || 1 || The formula stops too early. Something is missing after "(". || M11
"z^" || 2 || 1 || The formula stops too early. Something is missing after "^". || M11
"z^(1+" || 5 || 1 || The formula stops too early. Something is missing after "+". || M11
"*z" || 0 || 1 || A formula can't have "*" here. I expected a number, a variable or "(". || M12
"z + * 2" || 4 || 1 || A formula can't have "*" here. I expected a number, a variable or "(". || M12
"z ^^ 2" || 3 || 1 || A formula can't have "^" here. I expected a number, a variable or "(". || M12
"z)" || 1 || 1 || This ")" has no matching "(". || M13
"2z)" || 2 || 1 || This ")" has no matching "(". || M13
")(" || 0 || 1 || This ")" has no matching "(". || M13
"()" || 0 || 2 || There is nothing between this "(" and ")". Put a formula inside the brackets. || M14
"(z" || 0 || 1 || This "(" is never closed. Add a ")" at the end. || M15
"(z + 1" || 0 || 1 || This "(" is never closed. Add a ")" at the end. || M15
"conj(z" || 4 || 1 || This "(" is never closed. Add a ")" at the end. || M15
"z2" || 1 || 1 || I did not expect the number "2" here. Put the number first (2z, not z2) or use * between them. || M16
"2 3" || 2 || 1 || I did not expect the number "3" here. Put the number first (2z, not z2) or use * between them. || M16
"(z2)" || 2 || 1 || I did not expect the number "2" here. Put the number first (2z, not z2) or use * between them. || M16
"(2)3" || 3 || 1 || I did not expect the number "3" here. Put the number first (2z, not z2) or use * between them. || M16
"(z+)" || 3 || 1 || Something is missing between "+" and this ")". Put a number or a variable there. || M17
"sin(z+)" || 6 || 1 || Something is missing between "+" and this ")". Put a number or a variable there. || M17
"(z*)" || 3 || 1 || Something is missing between "*" and this ")". Put a number or a variable there. || M17
"(z-)" || 3 || 1 || Something is missing between "-" and this ")". Put a number or a variable there. || M17
"(z/)" || 3 || 1 || Something is missing between "/" and this ")". Put a number or a variable there. || M17
"z^(2+)" || 5 || 1 || Something is missing between "+" and this ")". Put a number or a variable there. || M17
"(z^)" || 3 || 1 || Something is missing between "^" and this ")". Put a number or a variable there. || M17
"(z**)" || 4 || 1 || Something is missing between "**" and this ")". Put a number or a variable there. || M17
"z^(1/(2-))" || 8 || 1 || Something is missing between "-" and this ")". Put a number or a variable there. || M17
`,
};

// ===== A1: arithmetic and conversions give the handout answers =================================

test('U1 handout arithmetic (1.1.1, 1.1.2, 1.2.2)', () => {
  runTable('p111');
  runTable('p112');
  okN(abs(sub(C(4, 3), C(-1, 1))), Math.sqrt(29), 1e-9, '1.2.2 distance');
  okC(add(z1, z2), C(2, 2));
  okC(scale(C(1, -2), 3), C(3, -6));
  okC(mul(C(1, 1), C(1, 1)), C(0, 2));
  okC(inv(C(1, 1)), C(0.5, -0.5));
  okC(neg(C(1, -1)), C(-1, 1));
  assert.ok(Object.is(neg(ZERO).re, 0) && Object.is(neg(ZERO).im, 0), 'neg(ZERO) has no negative zero');
  for (const bad of [div(ONE, ZERO), inv(ZERO)]) assert.ok(Number.isNaN(bad.re) && Number.isNaN(bad.im), 'division by zero is NaN, no throw');
  for (const z of SAMPLES) {
    okC(conj(conj(z)), z, 1e-9, 'conj conj');
    okC(inv(z), div(ONE, z), 1e-9, 'inv = 1/z');
  }
});

test('U2 bare real numbers are accepted wherever a complex number is', () => {
  okC(mul(2, C(1, 1)), C(2, 2));
  okC(add(1, 2), C(3, 0));
  okC(div(1, C(0, 1)), C(0, -1));
  assert.equal(Arg(-1), PI);
  assert.equal(Arg(0), 0);
  assert.equal(abs(-3), 3);
  assert.equal(abs2(-3), 9);
  okC(conj(5), C(5, 0));
  okC(neg(5), C(-5, 0));
  okC(inv(4), C(0.25, 0));
  okC(scale(2, 3), C(6, 0));
  assert.deepEqual(toPolar(-1), { r: 1, theta: PI });
  okC(pow(2, 3), C(8, 0));
  okC(powc(2, 0.5), C(S2, 0));
  okC(sqrt(-4), C(0, 2));
  okC(exp(0), ONE);
  okC(log(1), ZERO);
  assert.deepEqual(rootsOf(-16, 4), rootsOf(C(-16, 0), 4));
  okC(principalRoot(-16, 4), C(S2, S2));
  okC(branchRoot(-1, 3, 0), C(0.5, S3 / 2));
  assert.equal(branchArg(-1, 0), PI);
  okC(quadraticRoots(1, -4, 13)[0], C(2, 3));
  assert.ok(eq(1, 1 + 1e-12));
  assert.ok(isFiniteC(2) && !isFiniteC(NaN));
  assert.equal(argSet(-1, { kMin: 0, kMax: 0 })[0].theta, PI);
  okC(localLinear((z) => mul(z, z), 0.5).A, C(1, 0), 1e-6);
  assert.equal(fmtCart(2), '2');
  assert.equal(texCart(-2), '-2');
  assert.equal(fmtPolar(-1), 'e^(i 3.142)');
  assert.equal(texPolar(-1), 'e^{i\\pi}');
});

test('U3 constants and constructor', () => {
  assert.ok(Object.isFrozen(ZERO) && Object.isFrozen(ONE) && Object.isFrozen(I));
  assert.deepEqual({ ...ZERO }, { re: 0, im: 0 });
  assert.deepEqual({ ...ONE }, { re: 1, im: 0 });
  assert.deepEqual({ ...I }, { re: 0, im: 1 });
  assert.deepEqual({ ...C(3) }, { re: 3, im: 0 });
  assert.deepEqual({ ...C(3, -2) }, { re: 3, im: -2 });
  for (const f of [() => add(ZERO, ZERO), () => mul(ONE, ONE), () => pow(I, 1), () => rootsOf(ONE, 1)[0], () => conj(ONE)]) {
    const r = f();
    assert.ok(r !== ZERO && r !== ONE && r !== I && !Object.isFrozen(r), 'results are fresh, never the frozen constants');
  }
});

test('U4 the two addresses: toPolar, fromPolar, and multiplication agrees in both', () => {
  runTable('p131');
  const p = toPolar(C(-1, S3));
  okN(p.r, 2, 1e-9);
  okN(p.theta, 2 * PI / 3, 1e-9);
  okC(fromPolar(2, 2 * PI / 3), C(-1, S3));
  for (const z of SAMPLES) okC(fromPolar(toPolar(z).r, toPolar(z).theta), z, 1e-12, 'round trip');
  for (const a of SAMPLES) {
    for (const b of SAMPLES) {
      const pa = toPolar(a);
      const pb = toPolar(b);
      okC(fromPolar(pa.r * pb.r, pa.theta + pb.theta), mul(a, b), 1e-9, 'mul in polar equals mul in Cartesian');
      okN(abs(mul(a, b)), abs(a) * abs(b), 1e-9);
      okN(abs(div(a, b)), abs(a) / abs(b), 1e-9);
      assert.ok(sameAngle(Arg(mul(a, b)), Arg(a) + Arg(b)), 'Arg of a product is the wrapped sum');
      assert.ok(sameAngle(Arg(div(a, b)), Arg(a) - Arg(b)), 'Arg of a quotient is the wrapped difference');
    }
  }
  okN(Arg(mul(z1, z2)), wrapArg(Arg(z1) + Arg(z2)), 1e-12, 'A1: Arg(z1 z2) = wrapArg(Arg z1 + Arg z2)');
});

test('U5 Arg and wrapArg', () => {
  assert.equal(Arg(C(-1, 0)), PI);
  assert.equal(Arg({ re: -1, im: -0 }), PI);
  assert.equal(Arg(C(0, 0)), 0);
  assert.ok(Object.is(Arg({ re: 0, im: -0 }), 0), 'Arg(-0 imaginary part) is +0');
  assert.ok(Object.is(Arg({ re: 1, im: -0 }), 0));
  assert.equal(Arg(C(1, 0)), 0);
  okN(Arg(C(0, 1)), PI / 2, 1e-15);
  okN(Arg(C(0, -1)), -PI / 2, 1e-15);
  const below = Arg(C(-1, -1e-12));
  assert.ok(below > -PI && below < 0, 'just below the seam is just above -pi (the principal jump is real)');
  const above = Arg(C(-1, 1e-12));
  assert.ok(above > 3.14 && above < PI);
  assert.equal(Arg(C(-1, -1e-17)), PI, 'never -pi');
  okN(wrapArg(5 * PI / 3), -PI / 3, 1e-12);
  assert.equal(wrapArg(PI), PI);
  assert.equal(wrapArg(-PI), PI);
  assert.equal(wrapArg(0), 0);
  assert.ok(Object.is(wrapArg(-0), 0), 'wrapArg never returns -0');
  assert.equal(wrapArg(3 * PI), PI);
  assert.equal(wrapArg(-3 * PI), PI);
  okN(wrapArg(7 * PI / 2), -PI / 2, 1e-12);
  okN(wrapArg(-7 * PI / 2), PI / 2, 1e-12);
  okN(wrapArg(2 * PI + 0.1), 0.1, 1e-12);
  okN(wrapArg(-2 * PI - 0.1), -0.1, 1e-12);
  assert.ok(Number.isNaN(wrapArg(NaN)) && Number.isNaN(wrapArg(Infinity)) && Number.isNaN(wrapArg(-Infinity)));
  // The seam snap: a sum that lands within 1e-12 of -pi (off by more than rounding, so the snap and not
  // exactness is what makes it +pi) is the seam, and the seam belongs to +pi. Just outside it is not snapped.
  for (const k of [-100, -7, -3, -2, -1, 1, 2, 3, 5, 100]) {
    assert.equal(wrapArg(-PI + 1e-13 + 2 * PI * k), PI, `wrapArg(-pi + 1e-13 + 2 pi (${k})) lands on the seam`);
    const off = wrapArg(-PI + 1e-9 + 2 * PI * k);
    assert.ok(off < -3.14 && off > -PI, `a sum 1e-9 above the seam (k = ${k}) is not snapped: ${off}`);
  }
  // Odd multiples of pi, 2 pi k - pi, as floating-point sums: whichever side of the true seam rounding puts
  // them, the answer is pi to within 1e-12 and never a value next to -pi.
  for (let k = -400; k <= 400; k++) {
    const w = wrapArg(2 * PI * k - PI);
    assert.ok(Math.abs(w - PI) < 1e-12, `wrapArg(2 pi (${k}) - pi) = ${w} is pi, not -pi`);
  }
  for (let k = -400; k <= 400; k++) {
    const t = 0.0317 * k + 0.001;
    const w = wrapArg(t);
    assert.ok(w > -PI && w <= PI, `wrapArg(${t}) = ${w} is on the home step`);
    assert.equal(wrapArg(w), w, 'idempotent');
    assert.ok(sameAngle(w, t), 'same direction as the input');
  }
});

test('U31 neg, conj, inv, mul, div, pow and Arg never return negative zero', () => {
  const plusZero = (z, msg) => {
    assert.ok(Object.is(z.re, 0) || z.re !== 0, `${msg}: re is ${z.re}`);
    assert.ok(Object.is(z.im, 0) || z.im !== 0, `${msg}: im is ${z.im}`);
  };
  assert.ok(Object.is(div(1, -1).im, 0), 'div(1, -1).im is +0');
  assert.deepEqual(div(1, -1), { re: -1, im: 0 });
  assert.deepEqual(div(0, -1), { re: 0, im: 0 });
  assert.deepEqual(div(C(0, 0), C(-2, 0)), { re: 0, im: 0 });
  assert.deepEqual(pow(C(0, -1), 2), { re: -1, im: 0 });
  assert.ok(Object.is(pow(C(0, -1), 2).im, 0), 'pow(-i, 2).im is +0');
  assert.deepEqual(pow(C(0, -1), -2), { re: -1, im: 0 });
  assert.deepEqual(mul(C(0, -1), C(0, 1)), { re: 1, im: 0 });
  assert.deepEqual(mul(C(-1, 0), C(0, 0)), { re: 0, im: 0 });
  assert.deepEqual(inv({ re: -0, im: 1 }), { re: 0, im: -1 });
  assert.deepEqual(inv({ re: 1e300, im: 1e-300 }), { re: 0, im: 0 }, 'an underflowing quotient is +0');
  assert.deepEqual(conj({ re: -0, im: 0 }), { re: 0, im: 0 });
  assert.deepEqual(neg(ZERO), { re: 0, im: 0 });
  assert.ok(Object.is(Arg({ re: 1e300, im: -5e-324 }), 0), 'Arg of a point whose atan2 underflows is +0, never -0');
  assert.ok(Object.is(toPolar({ re: 1e300, im: -5e-324 }).theta, 0));
  assert.ok(Object.is(Arg({ re: 1e300, im: 5e-324 }), 0));
  assert.equal(Arg({ re: -1e300, im: -5e-324 }), PI, 'and still +pi on the negative axis side');
  for (const a of SAMPLES.concat([ZERO, ONE, I, C(0, -1), C(-1, 0), C(0, -2), C(-3, -0)])) {
    for (const b of SAMPLES.concat([ONE, I, C(0, -1), C(-1, 0), C(-2, 0)])) {
      plusZero(mul(a, b), 'mul');
      plusZero(div(a, b), 'div');
    }
    plusZero(inv(a), 'inv');
    plusZero(conj(a), 'conj');
    plusZero(neg(a), 'neg');
    for (const n of [-3, -2, -1, 2, 3, 4]) plusZero(pow(a, n), `pow(${JSON.stringify(a)}, ${n})`);
  }
});

test('U6 argSet: the staircase; k = 0 is Arg z; every step reaches the same point', () => {
  const z = C(-1, S3);
  const s = argSet(z, { kMin: -1, kMax: 1 });
  assert.deepEqual(s.map((e) => e.k), [-1, 0, 1]);
  [2 * PI / 3 - 2 * PI, 2 * PI / 3, 2 * PI / 3 + 2 * PI].forEach((t, i) => okN(s[i].theta, t, 1e-12));
  const d = argSet(z);
  assert.deepEqual(d.map((e) => e.k), [-2, -1, 0, 1, 2]);
  assert.equal(d[2].theta, Arg(z), 'entry k = 0 is exactly Arg z');
  for (const e of d) okC(fromPolar(abs(z), e.theta), z, 1e-9, `step k=${e.k} reaches z`);
  assert.deepEqual(argSet(z, { kMin: 2, kMax: 1 }), []);
  assert.deepEqual(argSet(z, { kMin: -0.5, kMax: 1.5 }).map((e) => e.k), [0, 1], 'no negative zero in k');
  assert.throws(() => argSet(z, { kMin: 0, kMax: 200000 }), RangeError);
  runTable('p131');
});

test('U7 proofs P1 and P2', () => {
  runTable('pP1');
  runTable('pP2');
  for (const a of SAMPLES) {
    for (const b of SAMPLES) okC(mul(conj(a), conj(b)), conj(mul(a, b)), 1e-12, 'P1');
  }
  okC(mul(conj(z1), conj(z2)), C(5, -14), 1e-12);
  okN(abs2(z1), 13, 1e-12);
  assert.equal(mul(z1, conj(z1)).re, 13);
  assert.deepEqual({ ...mul(z1, conj(z1)) }, { re: 13, im: 0 });
  for (const z of SAMPLES) okN(abs(z), Math.sqrt(mul(z, conj(z)).re), 1e-12, 'P2');
});

test('U8 elementary functions', () => {
  okC(exp(C(0, PI)), C(-1, 0));
  okC(exp(ZERO), ONE);
  okC(log(C(-1, 0)), C(0, PI));
  okC(log(I), C(0, PI / 2));
  assert.equal(log(ZERO).re, -Infinity);
  for (const z of SAMPLES) {
    okC(exp(log(z)), z, 1e-12, 'exp(log z)');
    okC(mul(sqrt(z), sqrt(z)), z, 1e-12, 'sqrt(z)^2');
  }
  assert.deepEqual(sqrt(C(-4, 0)), { re: 0, im: 2 });
  assert.deepEqual(sqrt({ re: -4, im: -0 }), { re: 0, im: 2 });
  assert.ok(sqrt(C(-4, -1e-12)).im < 0);
  okC(sqrt(C(0, 2)), C(1, 1));
  assert.deepEqual(sqrt(ZERO), { re: 0, im: 0 });
  okC(sin(ZERO), ZERO);
  okC(cos(ZERO), ONE);
  okC(cos(C(PI, 0)), C(-1, 0));
  okC(sin(C(0, PI / 2)), C(0, Math.sinh(PI / 2)));
  for (const z of SAMPLES.slice(0, 6)) okC(add(mul(sin(z), sin(z)), mul(cos(z), cos(z))), ONE, 1e-9, 'sin^2 + cos^2');
  okC(expi(PI), C(-1, 0));
  assert.ok(eq(C(1, 1), C(1 + 1e-12, 1)));
  assert.ok(!eq(C(1, 1), C(1.001, 1)));
  assert.ok(eq(C(1, 1), C(1.001, 1), 1e-2));
  assert.ok(!eq(C(NaN, 0), C(NaN, 0)));
  assert.ok(isFiniteC(C(1, 2)) && !isFiniteC(C(NaN, 0)) && !isFiniteC(C(0, Infinity)));
});

// ===== A2: powers and roots =====================================================================

test('U9 pow: de Moivre by squaring (1.3.2)', () => {
  runTable('p132');
  const b = C(S3, 1);
  okC(pow(b, 10), C(512, -512 * S3), 1e-6);
  okN(Arg(pow(b, 10)), -PI / 3, 1e-9);
  okN(abs(pow(b, 10)), 1024, 1e-9);
  okC(pow(b, 2), C(2, 2 * S3));
  okC(pow(b, 4), C(-8, 8 * S3));
  okC(pow(b, 8), C(-128, -128 * S3));
  okC(pow(C(1, 1), 2), C(0, 2));
  okC(pow(ZERO, 0), ONE);
  okC(pow(C(2, 3), 0), ONE);
  okC(pow(ZERO, 3), ZERO);
  assert.ok(Number.isNaN(pow(ZERO, -1).re) && Number.isNaN(pow(ZERO, -1).im));
  okC(pow(C(2, 0), -2), C(0.25, 0));
  okC(pow(I, 4), ONE);
  okC(pow(C(1, 1), -2), C(0, -0.5));
  assert.equal(Arg(pow(C(0, -1), 2)), PI, 'an exact seam hit stays exactly on the seam');
  for (const a of SAMPLES) {
    const p = toPolar(a);
    for (let n = -7; n <= 12; n++) okC(pow(a, n), fromPolar(Math.pow(p.r, n), n * p.theta), 1e-9, `pow(${JSON.stringify(a)}, ${n}) vs de Moivre`);
  }
  okC(pow(C(1, 1), 1.5), powc(C(1, 1), C(1.5, 0)), 1e-12);
  okC(pow(C(0, 1), 1e10), pow(C(0, 1), 1e10 % 4), 1e-9, 'no 32-bit overflow in the loop');
});

test('U10 powc: principal complex power', () => {
  okC(powc(C(-1, 0), C(0.5, 0)), I);
  okC(powc(C(2, 0), C(3, 0)), C(8, 0));
  okC(powc(I, I), C(Math.exp(-PI / 2), 0));
  okC(powc(ZERO, C(2, 0)), ZERO);
  okC(powc(ZERO, ZERO), ONE);
  for (const w of [C(-1, 0), C(0, 1)]) {
    const r = powc(ZERO, w);
    assert.ok(Number.isNaN(r.re) && Number.isNaN(r.im));
  }
  okC(powc(C(-1, 0), C(1 / 3, 0)), C(0.5, S3 / 2));
  okC(powc(C(2, 1), 3), pow(C(2, 1), 3), 1e-12);
});

test('U11 rootsOf: the 4th roots of -16 (1.4.2)', () => {
  runTable('p142');
  const r = rootsOf(C(-16, 0), 4);
  assert.equal(r.length, 4);
  [C(S2, S2), C(-S2, S2), C(-S2, -S2), C(S2, -S2)].forEach((w, k) => okC(r[k], w));
  for (const w of r) {
    okC(pow(w, 4), C(-16, 0), 1e-9);
    okN(abs(w), 2, 1e-12);
  }
  for (let k = 0; k < 4; k++) okC(r[(k + 1) % 4], mul(r[k], I), 1e-12, 'consecutive roots differ by a quarter turn');
  okC(principalRoot(C(-16, 0), 4), C(S2, S2));
});

test('U12 rootsOfUnity: the 5th roots of unity (1.4.1) and rootsOf edge cases', () => {
  runTable('p141');
  const r = rootsOfUnity(5);
  okC(r[1], C(Math.cos(2 * PI / 5), Math.sin(2 * PI / 5)), 1e-12);
  okC(r[0], ONE);
  okC(r[2], C(-0.8090169943749475, 0.5877852522924731), 1e-12);
  okC(r[3], C(-0.8090169943749475, -0.5877852522924731), 1e-12);
  okC(r[4], C(0.30901699437494745, -0.9510565162951535), 1e-12);
  okN(r[1].re, (Math.sqrt(5) - 1) / 4, 1e-12);
  okN(r[2].re, -(Math.sqrt(5) + 1) / 4, 1e-12);
  for (const w of r) {
    okC(pow(w, 5), ONE, 1e-9);
    okN(abs(w), 1, 1e-12);
  }
  okC(r.reduce((s, w) => add(s, w)), ZERO, 1e-12);
  for (let n = 2; n <= 12; n++) okC(rootsOfUnity(n).reduce((s, w) => add(s, w)), ZERO, 1e-12, `sum of the ${n}th roots of unity`);
  assert.equal(rootsOfUnity(1).length, 1);
  okC(rootsOfUnity(1)[0], ONE);
  assert.deepEqual(rootsOf(ZERO, 3), [{ re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }]);
  okC(rootsOf(C(8, 0), 3)[0], C(2, 0));
  for (const bad of [0, -1, 2.5, NaN]) assert.throws(() => rootsOf(ONE, bad), RangeError, `n = ${bad}`);
  for (const z of SAMPLES) {
    for (const n of [2, 3, 5, 7]) {
      const roots = rootsOf(z, n);
      assert.equal(roots.length, n);
      for (const w of roots) okC(pow(w, n), z, 1e-9, `root^${n} = z`);
      okC(principalRoot(z, n), roots[0], 1e-12);
    }
  }
});

test('U13 isPrimitiveRoot is Definition 1.5.6 (smallest m with w^m = 1 is n)', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((k) => isPrimitiveRoot(k, 5)), [false, true, true, true, true]);
  assert.equal(isPrimitiveRoot(2, 4), false);
  assert.equal(isPrimitiveRoot(1, 4), true);
  assert.equal(isPrimitiveRoot(3, 4), true);
  assert.equal(isPrimitiveRoot(0, 1), true);
  assert.equal(isPrimitiveRoot(0, 4), false);
  assert.equal(isPrimitiveRoot(6, 12), false);
  assert.equal(isPrimitiveRoot(5, 12), true);
  assert.equal(isPrimitiveRoot(7, 12), true);
  assert.equal(isPrimitiveRoot(-1, 5), true);
  assert.equal(isPrimitiveRoot(5, 5), false);
  assert.equal(isPrimitiveRoot(1.5, 5), false);
  assert.equal(isPrimitiveRoot(1, 0), false);
  const totient = [1, 1, 2, 2, 4, 2, 6, 4, 6, 4, 10, 4];
  for (let n = 1; n <= 12; n++) {
    const roots = rootsOfUnity(n);
    let primitive = 0;
    for (let k = 0; k < n; k++) {
      let order = 1;
      while (!eq(pow(roots[k], order), ONE, 1e-9)) order++;
      assert.equal(isPrimitiveRoot(k, n), order === n, `k=${k}, n=${n}: order ${order}`);
      if (isPrimitiveRoot(k, n)) primitive++;
    }
    assert.equal(primitive, totient[n - 1], `Euler totient of ${n}`);
  }
});

test('U14 principalRoot (2.2.2)', () => {
  runTable('p222');
  assert.deepEqual(principalRoot(ZERO, 3), { re: 0, im: 0 });
  okC(principalRoot(C(-8, 0), 3), C(1, S3), 1e-12, 'the principal cube root of -8 is not -2');
});

function walk(a0, a1, seam) {
  let prev = null;
  let worst = 0;
  for (let i = 0; i <= 600; i++) {
    const w = branchRoot(fromPolar(1, a0 + (a1 - a0) * i / 600), 3, seam);
    if (prev) worst = Math.max(worst, abs(sub(w, prev)));
    prev = w;
  }
  return worst;
}

test('U15 branchArg and branchRoot, with the seam walk (2.4.1)', () => {
  runTable('p241');
  for (const seam of [-PI, -PI / 2, 0, 1, PI]) {
    for (const z of SAMPLES) {
      const t = branchArg(z, seam);
      assert.ok(t > seam && t <= seam + 2 * PI, `branchArg in (seam, seam + 2pi] for seam ${seam}, z ${JSON.stringify(z)}: ${t}`);
      assert.ok(sameAngle(t, Arg(z)), 'same direction as Arg');
    }
  }
  for (const z of SAMPLES) okC(branchRoot(z, 3, -PI), principalRoot(z, 3), 1e-12, 'seam -pi is the principal branch');
  assert.deepEqual(branchRoot(ZERO, 3, 0), { re: 0, im: 0 });
  okC(branchRoot(C(0, -1), 2, 0), C(-S2 / 2, S2 / 2));
  okC(sqrt(C(0, -1)), C(S2 / 2, -S2 / 2));
  assert.ok(walk(PI - 0.1, PI + 0.1, 0) < 0.01, 'seam 0 is continuous across the negative axis');
  const principalJump = walk(PI - 0.1, PI + 0.1, -PI);
  assert.ok(principalJump > 1.5 && Math.abs(principalJump - S3) < 0.01, `principal branch jumps by sqrt(3): ${principalJump}`);
  assert.ok(walk(-0.1, 0.1, 0) > 1.5, 'seam 0 jumps across the positive axis');
  assert.ok(walk(0.01, 2 * PI - 0.01, 0) < 0.02, 'a loop that avoids the seam never jumps');
});

test('U16 quadraticRoots (1.4.3)', () => {
  runTable('p143');
  const byIm = (a, b) => b.im - a.im;
  const r = quadraticRoots(1, -4, 13).sort(byIm);
  okC(r[0], C(2, 3));
  okC(r[1], C(2, -3));
  const u = quadraticRoots(1, 0, 1);
  okC(u[0], I);
  okC(u[1], C(0, -1));
  const real = quadraticRoots(1, -3, 2).map((w) => w.re).sort();
  okN(real[0], 1, 1e-12);
  okN(real[1], 2, 1e-12);
  for (const w of quadraticRoots(1, 2, 1)) okC(w, C(-1, 0), 1e-9);
  const q = quadraticRoots(ONE, ZERO, C(0, 4));
  for (const w of q) okC(mul(w, w), C(0, -4), 1e-9);
  okC(add(q[0], q[1]), ZERO, 1e-12);
  for (const w of quadraticRoots(0, 1, 1)) assert.ok(Number.isNaN(w.re) && Number.isNaN(w.im));
  for (const [a, b, c] of [[2, 3, 5], [1, C(0, 1), 1], [C(1, 1), C(2, -1), C(0, 3)]]) {
    for (const w of quadraticRoots(a, b, c)) okC(add(add(mul(a, mul(w, w)), mul(b, w)), c), ZERO, 1e-9, 'a w^2 + b w + c = 0');
  }
});

// ===== A3: numeric calculus ====================================================================

const abs2f = (z) => ({ re: abs2(z), im: 0 });
const reF = (z) => ({ re: z.re, im: 0 });

test('U17 localLinear, jacobian, numericPartials: the A/B decomposition (3.1.1, 3.1.2, P6)', () => {
  runTable('p311');
  runTable('p312');
  runTable('pP6');
  let l = localLinear(abs2f, C(1, 1));
  okC(l.A, C(1, -1), 1e-6);
  okC(l.B, C(1, 1), 1e-6);
  l = localLinear(reF, C(0.3, -0.7));
  okC(l.A, C(0.5, 0), 1e-6);
  okC(l.B, C(0.5, 0), 1e-6);
  l = localLinear(compile('z^2 + z').f, C(1, 1));
  okC(l.A, C(3, 2), 1e-6);
  assert.ok(abs(l.B) < 1e-6, '|B| = 0 for an analytic function');
  for (const z0 of [C(1, 1), C(0.3, -0.7)]) {
    l = localLinear(conj, z0);
    okC(l.A, ZERO, 1e-6);
    okC(l.B, ONE, 1e-6);
  }
  okC(localLinear(exp, ZERO).A, ONE, 1e-6);
  const j0 = jacobian(exp, ZERO);
  okN(j0.ux, 1, 1e-6); okN(j0.uy, 0, 1e-6); okN(j0.vx, 0, 1e-6); okN(j0.vy, 1, 1e-6);
  l = localLinear(exp, C(0.3, 0.2));
  okC(l.A, exp(C(0.3, 0.2)), 1e-6);
  assert.ok(abs(l.B) < 1e-6);
  const np = numericPartials(compile('z^2 + z').f, C(1, 1));
  okC(np.fx, C(3, 2), 1e-6);
  okC(np.fy, C(-2, 3), 1e-6);
  const jc = jacobian(exp, C(0.5, 0.8));
  okN(jc.ux, jc.vy, 1e-6, 'Cauchy-Riemann u_x = v_y');
  okN(jc.uy, -jc.vx, 1e-6, 'Cauchy-Riemann u_y = -v_x');
  const ja = jacobian(abs2f, C(1, 1));
  okN(ja.ux, 2, 1e-6); okN(ja.uy, 2, 1e-6); okN(ja.vx, 0, 1e-6); okN(ja.vy, 0, 1e-6);
  l = localLinear(abs2f, ZERO);
  okC(l.A, ZERO, 1e-6);
  okC(l.B, ZERO, 1e-6);
  const jb = jacobian(abs2f, C(0.7, -0.4));
  okN(2 * abs(localLinear(abs2f, C(0.7, -0.4)).B), Math.hypot(jb.ux - jb.vy, jb.vx + jb.uy), 1e-6, '2|B| = hypot(ux - vy, vx + uy)');
  assert.throws(() => numericPartials(abs2f, ONE, 0), RangeError);
});

test('U18 directionalQuotients: the circle A + B e^{-2 i phi}', () => {
  const z0 = C(1, 1);
  const q = directionalQuotients(abs2f, z0, 1e-3, 8);
  assert.equal(q.length, 8);
  q.forEach((e, j) => {
    okN(e.phi, 2 * PI * j / 8, 1e-12);
    assert.ok(eq(e.q, add(conj(z0), mul(z0, expi(-2 * e.phi))), 2e-3), `quotient ${j} lies on the circle`);
    assert.ok(Math.abs(abs(sub(e.q, C(1, -1))) - S2) < 2e-3, 'centre conj z0, radius |z0|');
  });
  assert.equal(directionalQuotients(abs2f, z0).length, 72);
  for (const e of directionalQuotients(compile('z^2 + z').f, z0, 1e-3, 8)) assert.ok(eq(e.q, C(3, 2), 2e-3), 'analytic: one point');
  for (const e of directionalQuotients(reF, C(0.3, -0.7), 1e-3, 16)) {
    assert.ok(eq(e.q, add(C(0.5, 0), scale(expi(-2 * e.phi), 0.5)), 2e-3), 'P6: circle of centre 1/2 and radius 1/2');
  }
  assert.throws(() => directionalQuotients(abs2f, z0, 0, 8), RangeError);
  assert.throws(() => directionalQuotients(abs2f, z0, 1e-3, 0), RangeError);
});

// ===== A4: formatting ==========================================================================

test('U19 plain-text formatting (table 7.4.1)', () => {
  runTable('fmtText');
  assert.equal(fmtNum(1234.5678, 20), '1234.5678');
  assert.equal(fmtNum(1 / 3, 20), '0.333333333333', 'digits clamp to 12');
  assert.deepEqual(exactAngle(-5 * PI / 6 + 6 * PI), { p: 31, q: 6 });
});

test('U20 TeX formatting (table 7.4.2)', () => {
  runTable('fmtTex');
  const count = (s, sub) => s.split(sub).length - 1;
  const c = texCart(C(S2, S2));
  assert.equal(count(c, '\\sqrt{2}'), 2);
  assert.ok(c.includes('+'));
  const p = texPolar(C(-1, S3));
  assert.ok(p.includes('2') && p.includes('\\frac{2\\pi}{3}'));
  assert.equal(texNumber(0.3), '\\frac{3}{10}', 'the exact-form rule is literal');
});

test('U21 plain-text output never contains a Unicode minus or dash', () => {
  const bad = /[−–—]/;
  for (const z of SAMPLES.concat([C(-0.001, -0.002), C(-1e-12, -5)])) {
    for (const s of [fmtCart(z), fmtPolar(z), fmtAngle(Arg(z)), fmtNum(z.re), fmtNum(z.im), fmtAngle(Arg(z), { pi: false })]) {
      assert.ok(!bad.test(s) && s.length > 0, `"${s}"`);
    }
  }
});

// ===== A5: the parser ==========================================================================

test('U22 pinned evaluations: the handout and the catalogue', () => {
  runTable('handout');
  runTable('catalogue');
  okC(compile('z').f(3), C(3, 0), 1e-12, 'a bare number is read as a complex number');
  okC(evaluate('z^2', 2), C(4, 0), 1e-12);
});

test('U23 grammar: precedence, implicit multiplication, spellings', () => {
  runTable('grammar');
});

test('U24 ParseError: every message M1..M17 with its position and length', () => {
  const rows = TABLES.errors.split('\n').filter((l) => l.trim()).map((l) => l.split(' || '));
  assert.ok(rows.length >= 50, 'all error rows are present');
  const seen = new Set();
  for (const [srcExpr, position, length, message, id] of rows) {
    const src = js(srcExpr);
    seen.add(id.trim());
    for (const fn of [() => parse(src), () => compile(src), () => toTex(src)]) {
      let err = null;
      try { fn(); } catch (e) { err = e; }
      assert.ok(err, `${id}: ${srcExpr} must throw`);
      assert.ok(err instanceof ParseError && err instanceof Error, `${id}: ParseError from ${srcExpr}`);
      assert.equal(err.name, 'ParseError');
      assert.equal(typeof err.position, 'number');
      assert.equal(err.position, Number(position), `${id} position for ${srcExpr}`);
      assert.equal(err.length, Number(length), `${id} length for ${srcExpr}`);
      assert.equal(err.message, message, `${id} message for ${srcExpr}`);
    }
  }
  for (let n = 1; n <= 17; n++) assert.ok(seen.has('M' + n), `row for M${n}`);
  for (const bad of ['('.repeat(100) + 'z' + ')'.repeat(100), 'z+'.repeat(300) + 'z', '9'.repeat(320), null, undefined, 42, '-'.repeat(100) + 'z', 'z^'.repeat(100) + 'z']) {
    assert.throws(() => parse(bad), ParseError);
  }
  // scientific notation: the e must touch the digits on both sides; everything else keeps e as Euler's number (residue: 1e-3 used to be e - 3, 3e12 had a misleading message)
  assert.deepEqual(evaluate('1e-3', 0), { re: 0.001, im: 0 });
  assert.deepEqual(evaluate('3e12 + 1e12i', 0), { re: 3e12, im: 1e12 });
  assert.equal(toTex('1e-7'), '1\\times 10^{-7}');
  assert.throws(() => parse('1e3.5'), (e) => e instanceof ParseError && e.position === 3 && e.message === 'The power of ten in a number like 1e3 must be a whole number.');
  assert.throws(() => parse('1e-400'), (e) => e instanceof ParseError && e.position === 0 && e.length === 6 && e.message === 'That number is too small.');
  assert.throws(() => parse('1e999'), (e) => e instanceof ParseError && e.message === 'That number is too big.');
  // M4 reports whole characters: an emoji is one character, two UTF-16 units long, never a lone surrogate half.
  const emoji = String.fromCodePoint(0x1F600);
  for (const fn of [parse, compile, toTex]) {
    assert.throws(() => fn('z + ' + emoji), (e) => e instanceof ParseError && e.position === 4 && e.length === 2
      && e.message === `I don't understand the character "${emoji}". Use numbers, z, x, y, i, e, pi, + - * / ^ and brackets ( ).`);
  }
  for (const [ch, hex] of [['\u200b', 'U+200B'], ['\u200d', 'U+200D'], ['\u0301', 'U+0301'], ['\u0007', 'U+0007'], ['\ud83d', 'U+D83D']]) {
    assert.throws(() => parse('z' + ch + ' + 1'), (e) => e instanceof ParseError && e.position === 1 && e.length === 1
      && e.message === `There is a hidden character (${hex}) here that I can't read. Delete it and retype that part of the formula.`, `hidden character ${hex}`);
  }
  assert.throws(() => parse(emoji), (e) => e.position === 0 && e.length === 2);
  const lone = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
  for (const bad of [emoji, 'z' + emoji, '\ud83d', 'z\ude00']) {
    assert.throws(() => parse(bad), (e) => e instanceof ParseError && !lone.test(e.message), 'no lone surrogate in an M4 message');
  }
});

test('U25 compile contract: f, src, tex, uses, fresh results, bounded cache', () => {
  const c = compile('x^2 - y^2 + 2ixy');
  assert.equal(typeof c.f, 'function');
  assert.equal(c.src, 'x^2 - y^2 + 2ixy');
  assert.ok(typeof c.tex === 'string' && c.tex.length > 0);
  assert.deepEqual([...c.uses].sort(), ['x', 'y']);
  assert.deepEqual([...compile('z^2').uses], ['z']);
  assert.equal(compile('2').uses.size, 0);
  okC(compile('2').f(C(5, 5)), C(2, 0));
  assert.equal(compile('z^2'), compile('z^2'), 'cached by source text');
  const z = C(1, 2);
  const w = compile('z').f(z);
  assert.notEqual(w, z, 'a fresh object, not the input');
  w.re = 99;
  assert.equal(z.re, 1);
  assert.equal(compile('z').f(z).re, 1);
  assert.deepEqual(z, C(1, 2));
  for (let k = 0; k < 100; k++) compile(`z + ${k}`);
  okC(compile('z + 1').f(C(1, 0)), C(2, 0));
  // The cache is bounded (CACHE_MAX = 64, oldest out first): after 70 newer sources the first is gone and
  // compiles again to a new object; the newest is still cached; a repeat hit does not grow the cache.
  const first = compile('z + 7001');
  assert.equal(compile('z + 7001'), first, 'a fresh entry is cached');
  for (let k = 0; k < 70; k++) compile(`z + 7002 + ${k}`);
  const newest = compile('z + 7002 + 69');
  assert.equal(compile('z + 7002 + 69'), newest, 'the newest entry is still cached');
  const again = compile('z + 7001');
  assert.notEqual(again, first, 'the oldest entry was evicted once 70 newer sources had been compiled');
  assert.equal(again.src, first.src);
  okC(again.f(C(1, 0)), C(7002, 0), 1e-9, 'the recompiled formula still works');
  okC(first.f(C(1, 0)), C(7002, 0), 1e-9, 'the evicted result object still works too');
  assert.equal(compile(' z^2 ').src, ' z^2 ');
  assert.ok(compile('z^2 + iz').tex.includes('z^{2}'));
  assert.equal(compile('z^2 + iz').tex, toTex('z^2 + iz'));
  assert.equal(typeof evaluate('z', ONE).re, 'number');
  assert.ok(isFiniteC(ONE) && !isFiniteC(evaluate('1/z', ZERO)), 'a pole is NaN, never an exception');
});

test('U26 toTex pinned strings (table 7.5.4)', () => {
  runTable('toTexRows');
  assert.equal(toTex('z^2 + iz'), 'z^{2} + iz');
  assert.ok(toTex('z^2 + iz').length > 0);
  assert.equal(toTex('(2)(3)'), '2 \\cdot 3', 'juxtaposed numbers never run together as 23');
});

function loadKatex() {
  const katexPath = ROOT + 'vendor/katex/katex.min.js';
  if (!fs.existsSync(katexPath)) return null;
  const ctx = { self: {} };
  ctx.window = ctx.self;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(katexPath, 'utf8'), ctx);
  return ctx.self.katex || ctx.katex || null;
}

// The TeX control words toTex may emit. A control word glued to the next letter ("\\piz") is not in this set,
// so this catches that bug without KaTeX.
const TEX_WORDS = new Set(['pi', 'frac', 'left', 'right', 'overline', 'sqrt', 'operatorname', 'arg', 'log', 'sin', 'cos', 'cdot']);
function badControlWord(texString) {
  const found = texString.match(/\\[A-Za-z]+/g) || [];
  return found.find((w) => !TEX_WORDS.has(w.slice(1))) || null;
}

// Deterministic formulas built from the grammar, so most of them parse: atoms, unary minus, the five
// operators, juxtaposition with or without a space (which is where "pi z" and "piz" come from), powers,
// brackets and every function.
function fuzzFormulas(seed, count) {
  let state = seed;
  const rnd = (n) => { state = (state * 1664525 + 1013904223) >>> 0; return (state >>> 8) % n; };
  const atoms = ['z', 'x', 'y', 'i', 'e', 'pi', 'pi', 'pi', '\u03c0', '2', '3', '0.5', '1.25'];
  const funcs = ['sin', 'cos', 'exp', 'abs', 'Re', 'Im', 'conj', 'sqrt', 'log', 'arg', 'Arg'];
  const seps = ['+', '-', '*', '/', '^', ' ', '', '', ' ', ' * '];
  const gen = (d) => {
    const r = d <= 0 ? rnd(3) : rnd(12);
    if (r < 3) return atoms[rnd(atoms.length)];
    if (r === 3) return '-' + gen(d - 1);
    if (r === 4) return '(' + gen(d - 1) + ')';
    if (r === 5) return funcs[rnd(funcs.length)] + '(' + gen(d - 1) + ')';
    return gen(d - 1) + seps[rnd(seps.length)] + gen(d - 1);
  };
  const out = [];
  for (let n = 0; n < count; n++) out.push(gen(1 + rnd(4)));
  return out;
}

test('U27 the vendored KaTeX accepts every TeX string', (t) => {
  const katex = loadKatex();
  if (!katex) { t.skip('vendor/katex/katex.min.js is not available'); return; }
  const points = SAMPLES.concat([ZERO, ONE, I, C(0, -1), C(NaN, NaN), C(Infinity, 0), C(S2, S2), C(512, -512 * S3), C(-11 / 17, -10 / 17), C(0, 2 * PI)]);
  const strings = [];
  for (const z of points) strings.push(texCart(z), texPolar(z));
  for (const a of [0, PI, -PI, PI / 2, -PI / 3, 2 * PI / 3, 8 * PI / 3, 1.234, NaN, 31 * PI / 6]) strings.push(texAngle(a));
  for (const x of [0, 1, -1, 0.5, -11 / 17, S2, -S2 / 2, S3 / 2, 886.81, PI, -PI / 4, 3.14, NaN, Infinity, -Infinity, 1e7]) strings.push(texNumber(x));
  const catalogue = ['z^2', 'z^3', '1/z', 'iz - 2i', '(1+i)z', 'z^2 + iz', 'z^2 + z', 'exp(z)', 'conj(z)', 'Re(z)', 'abs(z)^2', 'z^2/abs(z)^2', 'sqrt(z)', 'z^(1/3)', '(Re(1+z) - 1)/z', 'sin(z)', 'cos(z)', 'log(z)'];
  const extras = ['(x^2 - y^2 + 2ixy)/(x^2 + y^2)', 'z^z^z', '(-z)^2', 'exp(z)^2', 'sin(z)cos(z)', 'z/2/z', 'e^(i pi)', 'Arg(z)', 'arg(z)', 'Im(z)', '2*3', '-z^2', 'z - (z + 1)',
    // pi followed by a letter: "\\piz" is one unknown control word, so toTex puts a thin space after \\pi.
    'pi z', 'piz', '2 pi i z', 'exp(i pi z)', 'e^(2 pi i z)', 'pi x', 'pi y', 'pi i', 'pi e', 'pi(z+1)', 'z pi', 'pi pi', '-pi z', 'pi abs(z)', 'pi sin(z)', '2pi z^2', '(pi z)^2', 'pi z/2', 'e^(pi i z)'];
  for (const src of catalogue.concat(extras)) strings.push(toTex(src));
  assert.ok(strings.length > 80, `${strings.length} strings`);
  for (const s of strings) {
    assert.doesNotThrow(() => katex.renderToString(s, { throwOnError: true, strict: 'error' }), `KaTeX rejected: ${s}`);
  }

  // The pi regression, row by row: the exact strings the Lab and the explainer would put in front of KaTeX.
  for (const src of ['pi z', 'piz', '2 pi i z', 'exp(i pi z)', 'e^(2 pi i z)', 'pi x', 'pi(z+1)']) {
    const tx = toTex(src);
    assert.ok(!/\\pi[A-Za-z]/.test(tx), `toTex(${JSON.stringify(src)}) = ${tx} glues \\pi to a letter`);
    assert.equal(compile(src).tex, tx, 'compile().tex is the same string');
    assert.doesNotThrow(() => katex.renderToString(tx, { throwOnError: true, strict: 'error' }), `KaTeX rejected toTex(${JSON.stringify(src)}) = ${tx}`);
  }

  // Fuzz: render the toTex of every parseable formula of two deterministic generators through KaTeX.
  const sources = fuzzFormulas(2024, 4000);
  let seed = 777;
  const rnd = (n) => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 8) % n; };
  const pieces = ['z', 'x', 'y', 'i', 'e', 'pi', '2', '3.5', '(', ')', '+', '-', '*', '/', '^', ' ', 'sin', 'cos', 'exp', 'abs', 'Re', 'Im', 'conj', 'sqrt', 'log', 'arg', 'Arg', '**', '\u00b2', '\u03c0', '\u2212', '\u00d7'];
  for (let n = 0; n < 20000; n++) {
    let src = '';
    for (let k = 1 + rnd(8); k > 0; k--) src += pieces[rnd(pieces.length)];
    sources.push(src);
  }
  let rendered = 0;
  let withPi = 0;
  for (const src of sources) {
    let tx;
    try { tx = toTex(src); } catch (e) { assert.ok(e instanceof ParseError, `only ParseError escapes: ${JSON.stringify(src)}`); continue; }
    rendered++;
    if (/\\pi[,\\]*[A-Za-z]/.test(tx)) withPi++;
    assert.equal(badControlWord(tx), null, `unknown control word in toTex(${JSON.stringify(src)}) = ${tx}`);
    assert.doesNotThrow(() => katex.renderToString(tx, { throwOnError: true, strict: 'error' }), `KaTeX rejected toTex(${JSON.stringify(src)}) = ${tx}`);
  }
  assert.ok(rendered > 2500, `${rendered} fuzzed formulas parsed and rendered`);
  assert.ok(withPi > 100, `${withPi} fuzzed formulas had pi next to a letter`);
});

test('U30 deterministic fuzz: only ParseError ever escapes; formatters never throw or print NaN', () => {
  let seed = 12345;
  const rnd = (n) => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 8) % n; };
  const pieces = ['z', 'x', 'y', 'i', 'e', 'pi', '2', '3.5', '.', '(', ')', '+', '-', '*', '/', '^', ' ', 'sin', 'cos', 'exp', 'abs', 'Re', 'Im', 'conj', 'sqrt', 'log', 'arg', 'Arg', 'q', '@', '**', '²', 'π', '−', '×'];
  let parsed = 0;
  for (let n = 0; n < 5000; n++) {
    const count = 1 + rnd(12);
    let s = '';
    for (let k = 0; k < count; k++) s += pieces[rnd(pieces.length)];
    try {
      parse(s);
    } catch (e) {
      assert.ok(e instanceof ParseError, `non-ParseError for ${JSON.stringify(s)}: ${e && e.stack}`);
      assert.ok(Number.isInteger(e.position) && e.position >= 0 && e.position <= s.length, `position ${e.position} out of range for ${JSON.stringify(s)}`);
      assert.ok(e.length >= 1);
      continue;
    }
    parsed++;
    assert.ok(toTex(s).length > 0, `toTex of ${JSON.stringify(s)}`);
    assert.equal(badControlWord(toTex(s)), null, `toTex of ${JSON.stringify(s)} has a control word glued to a letter`);
    const v = compile(s).f(C(0.3, -0.7));
    assert.ok(typeof v.re === 'number' && typeof v.im === 'number', `value of ${JSON.stringify(s)}`);
  }
  assert.ok(parsed > 100, `${parsed} of 5000 strings parsed`);
  const vals = [0, -0, 1, -1, 0.5, 1e-300, 1e300, 1e15, 1e21, NaN, Infinity, -Infinity, PI, -PI, 12345.6789, 0.0004999, 999999.9999];
  for (const a of vals) {
    for (const b of vals) {
      for (const s of [fmtCart(C(a, b)), fmtPolar(C(a, b)), texCart(C(a, b)), texPolar(C(a, b))]) {
        assert.ok(typeof s === 'string' && s.length > 0 && !/−/.test(s) && !/NaN/.test(s), `formatter output "${s}" for ${a}, ${b}`);
      }
    }
    for (const s of [fmtNum(a), fmtAngle(a), texNumber(a), texAngle(a)]) {
      assert.ok(typeof s === 'string' && s.length > 0 && !/NaN/.test(s), `formatter output "${s}" for ${a}`);
    }
  }
});

// ===== A6: both modules are pure ===============================================================

test('U28 every export named in ARCHITECTURE 3.1 and 3.2 is a function', () => {
  const complexNames = ['C', 'fromPolar', 'toPolar', 'add', 'sub', 'mul', 'div', 'neg', 'conj', 'inv', 'scale', 'abs', 'abs2', 'Arg', 'wrapArg', 'argSet', 'expi', 'exp', 'log', 'sqrt', 'sin', 'cos', 'pow', 'powc', 'rootsOf', 'rootsOfUnity', 'principalRoot', 'branchRoot', 'branchArg', 'isPrimitiveRoot', 'quadraticRoots', 'eq', 'isFiniteC', 'numericPartials', 'jacobian', 'localLinear', 'directionalQuotients', 'fmtNum', 'fmtSci', 'fmtCart', 'fmtPolar', 'fmtAngle', 'texNumber', 'texCart', 'texPolar', 'texAngle'];
  for (const name of complexNames) assert.equal(typeof X[name], 'function', `complex.js exports ${name}`);
  for (const name of ['ZERO', 'ONE', 'I']) assert.equal(typeof X[name], 'object', `complex.js exports ${name}`);
  assert.equal(typeof X.exactAngle, 'function');
  assert.equal(Object.keys(X).length, 50, 'complex.js exports exactly 50 names');
  for (const name of ['ParseError', 'parse', 'compile', 'toTex', 'evaluate']) assert.equal(typeof P[name], 'function', `parse.js exports ${name}`);
  assert.equal(Object.keys(P).length, 5, 'parse.js exports exactly 5 names');
});

test('U29 purity: pure ASCII, no DOM, no timers, no colours, the right imports', () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const forbidden = /\b(document|window|localStorage|sessionStorage|requestAnimationFrame|setTimeout|setInterval|fetch|XMLHttpRequest|navigator|Math\.random|Date|performance|process|require|toLocaleString|Intl)\b/;
  for (const [file, imports] of [['js/core/complex.js', 0], ['js/core/parse.js', 1]]) {
    const raw = fs.readFileSync(ROOT + file, 'utf8');
    assert.ok(/^[\x00-\x7f]*$/.test(raw), `${file} is pure ASCII`);
    const code = strip(raw);
    const hit = forbidden.exec(code);
    assert.ok(!hit, `${file} uses the forbidden word "${hit && hit[0]}"`);
    assert.ok(!forbidden.exec(raw), `${file}: a plain grep for forbidden words is clean, even in comments`);
    for (const re of [/#[0-9a-fA-F]{3,8}\b/, /rgb\(/, /hsl\(/, /textcolor/]) assert.ok(!re.test(code), `${file} contains a colour (${re})`);
    assert.equal((code.match(/^\s*import\s/gm) || []).length, imports, `${file} import count`);
    assert.ok(!/import\(/.test(code), `${file} has no dynamic import`);
    assert.ok(!/export\s+default/.test(code), `${file} has no default export`);
    assert.ok(!/\beval\s*\(|new\s+Function/.test(code), `${file} never builds code from text`);
    if (imports === 1) assert.ok(/^\s*import\s[^;]*from\s+'\.\/complex\.js'/m.test(code), 'parse.js imports ./complex.js');
  }
});

// ===== residue fixes (iteration 1 cleanup, group C3) ==============================================

test('R1 exactAngle and the pi forms cover the 10-degree steps (q = 18) and add no false positive', () => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  // every p pi / q for q in 1..12 and 18 is found, in lowest terms, as the same rational
  for (const q of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18]) {
    for (let p = -60; p <= 60; p++) {
      const f = exactAngle(p * PI / q);
      assert.ok(f, `${p}pi/${q} has an exact form`);
      assert.equal(gcd(f.p, f.q), 1, `${p}pi/${q} comes back in lowest terms: ${JSON.stringify(f)}`);
      assert.equal(f.p * q, p * f.q, `${p}pi/${q} comes back as the same rational: ${JSON.stringify(f)}`);
    }
  }
  assert.deepEqual(exactAngle(5 * PI / 18), { p: 5, q: 18 });
  assert.deepEqual(exactAngle(2 * PI / 18), { p: 1, q: 9 }, 'pi/9 is found at q = 9, before q = 18');
  assert.deepEqual(exactAngle(-17 * PI / 18), { p: -17, q: 18 });
  for (const [p, text] of [[1, 'pi/18'], [5, '5pi/18'], [7, '7pi/18'], [11, '11pi/18'], [-13, '-13pi/18'], [17, '17pi/18']]) {
    assert.equal(fmtAngle(p * PI / 18), text, `fmtAngle(${p}pi/18)`);
  }
  assert.equal(fmtAngle(5 * PI / 18, { unicode: true }), '5π/18');
  assert.equal(texAngle(5 * PI / 18), '\\frac{5\\pi}{18}');
  assert.equal(texAngle(-7 * PI / 18), '-\\frac{7\\pi}{18}');
  assert.equal(texNumber(5 * PI / 18), '\\frac{5\\pi}{18}');
  // the sector readout of powermap: both 50 degrees and 100 degrees are exact now
  assert.equal(fmtNum(5 * PI / 18), '0.873');
  assert.equal(fmtAngle(5 * PI / 9), '5pi/9');
  // denominators that were not added stay decimals
  for (const q of [13, 14, 15, 16, 17, 19, 20, 24, 36]) assert.equal(exactAngle(PI / q), null, `pi/${q} is still a decimal`);
  // a decimal that merely looks like an angle is never mistaken for one: no number with at most 3 decimals except 0 is p pi / q
  for (let k = -6000; k <= 6000; k++) {
    if (k === 0) continue;
    assert.equal(exactAngle(k / 1000), null, `${k / 1000} is not an exact angle`);
  }
  for (const x of [0.873, 0.175, 0.349, 0.524, 1.745, 2.618, 1.234, 3.1416, 0.7854]) assert.equal(exactAngle(x), null, `${x}`);
});

test('R2 toTex never writes two minus signs in a row (residue 24)', () => {
  const rows = [
    ['--z', '-\\left(-z\\right)'], ['-(-z)', '-\\left(-z\\right)'], ['-(-(-z))', '-\\left(-\\left(-z\\right)\\right)'],
    ['z-(-z)', 'z - \\left(-z\\right)'], ['z - -z', 'z - \\left(-z\\right)'], ['z + -z', 'z + \\left(-z\\right)'], ['z * -z', 'z \\cdot \\left(-z\\right)'],
    ['z - -z - -z', 'z - \\left(-z\\right) - \\left(-z\\right)'],
    // unchanged: one minus is one minus
    ['-z^2', '-z^{2}'], ['-z - z', '-z - z'], ['(-z)^2', '\\left(-z\\right)^{2}'], ['z - (z + 1)', 'z - \\left(z + 1\\right)'], ['-(z + 1)', '-\\left(z + 1\\right)'],
    ['-pi z', '-\\pi\\,z'], ['2^-1', '2^{-1}'], ['exp(-z)', 'e^{-z}'], ['z + 2', 'z + 2'], ['1 - z', '1 - z'],
  ];
  for (const [src, want] of rows) assert.equal(toTex(src), want, src);
  // the brackets change the picture, not the maths: the formula still evaluates the same
  const w = C(1, 2);
  for (const [src, want] of [['--z', w], ['z - -z', scale(w, 2)], ['z + -z', ZERO], ['z * -z', neg(mul(w, w))]]) okC(evaluate(src, w), want, 1e-12, src);
  // fuzz: no parseable formula puts two minus signs, or a plus and a minus, next to each other
  let n = 0;
  for (const src of fuzzFormulas(2024, 4000)) {
    let tx;
    try { tx = toTex(src); } catch (e) { continue; }
    n++;
    assert.ok(!/-\s*-|\+\s*-/.test(tx), `toTex(${JSON.stringify(src)}) = ${tx}`);
  }
  assert.ok(n > 2000, `${n} fuzzed formulas parsed`);
});
