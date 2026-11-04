// Node checks for the two-plane model. The page is not loaded here.
// Run: node tools/planes-smoke.mjs

import { exp, log, pow, sqrt } from '../js/core/complex.js';
import { compile } from '../js/core/parse.js';
import {
  PRESETS, describe, buildForest, frameOutput, density, lift, presetForSrc,
} from '../js/council/planes-model.js';

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name);
  } else {
    console.log('ok  ', name);
  }
}

const sq = (z) => pow(z, 2);
const dSq = describe(sq);
check('z^2 has no cut and covers twice', dSq.cut === false && dSq.doubleCover === true && dSq.holds === false);
check('z^2 names both landings', dSq.text.includes('both strings land') && dSq.text.includes('-0.28 + 0.96i'));

const dExp = describe(exp);
check('exp has no cut and is the strip', dExp.cut === false && dExp.expShape === true && dExp.doubleCover === false);
check('exp sentence names the empty origin', dExp.text.includes('no string lands on 0') && dExp.text.includes('circles'));

const dLog = describe(log);
check('log is a cut a full turn apart', dLog.cut === true && dLog.gap > 5 && dLog.holds === true);
check('log sentence names the cut', dLog.text.includes('branch cut') && dLog.text.includes('full turn'));

const dSqrt = describe(sqrt);
check('sqrt is a cut and not a full turn', dSqrt.cut === true && dSqrt.gap > 1.2 && dSqrt.gap < 4);
check('sqrt sentence does not claim a full turn', dSqrt.text.includes('do not meet') && !dSqrt.text.includes('full turn'));

const dShift = describe((z) => {
  const w = pow(z, 2);
  return { re: w.re + 1, im: w.im };
});
check('z^2+1 still covers twice', dShift.doubleCover === true && dShift.cut === false);

const oneOver = (z) => {
  const m = z.re * z.re + z.im * z.im;
  if (m === 0) return null;
  return { re: z.re / m, im: -z.im / m };
};
const dInv = describe(oneOver);
check('1/z is not a cut and not a double cover', dInv.cut === false && dInv.doubleCover === false && dInv.expShape === false);

const sqPreset = PRESETS.find((p) => p.id === 'sq');
const expPreset = PRESETS.find((p) => p.id === 'exp');
const logPreset = PRESETS.find((p) => p.id === 'log');
check('chips match the formula box', presetForSrc('z^2') === sqPreset && presetForSrc('exp(z)') === expPreset && presetForSrc('nope') === null);

const n = 36;
const forestSq = buildForest(sq, sqPreset.input, sqPreset.output, n, 7);
check('every z^2 sample lands on the sheet', forestSq.count === n * n);
check('z^2 guide lines do not jump', forestSq.grid.every((g) => g.parts.length === 1));

const forestExp = buildForest(exp, expPreset.input, expPreset.output, n, 7);
check('exp keeps a full forest', forestExp.count > n * n * 0.9);
check('exp guide lines stay in one piece', forestExp.grid.every((g) => g.parts.length === 1));

const forestLog = buildForest(log, logPreset.input, logPreset.output, n, 7);
check('log drops the strings that leave the sheet', forestLog.count > n * n * 0.5 && forestLog.count < n * n);
const broken = forestLog.grid.filter((g) => g.axis === 'y' && g.at < -0.2 && g.parts.length >= 2);
check('log breaks the guide that crosses the cut', broken.length >= 1);
check('log draws both edges of the cut', forestLog.cut.upper.length >= 1 && forestLog.cut.lower.length >= 1);

let nan = false;
for (let i = 0; i < forestSq.count * 4; i++) if (!Number.isFinite(forestSq.strings[i])) nan = true;
check('string buffer is finite', nan === false);

const typed = frameOutput(sqrt, { x: [-2, 2], y: [-2, 2] });
check('a typed sqrt gets a finite window', typed.x[0] < typed.x[1] && typed.y[0] < typed.y[1]);
check('the gap is a positive lift', lift(sqPreset.input, sqPreset.output) > 2);

const phone = density(360);
const desk = density(1100);
check('a phone draws fewer strings than a desk', phone.strings < desk.strings && phone.texture <= 160 && desk.texture >= 256);

const eToZ = compile('e^z');
const expZ = compile('exp(z)');
let close = true;
for (const z of [{ re: 0.4, im: -1.2 }, { re: -0.7, im: 2 }, { re: 1, im: 0 }]) {
  const a = eToZ.f(z);
  const b = expZ.f(z);
  if (Math.hypot(a.re - b.re, a.im - b.im) > 1e-9) close = false;
}
check('e^z and exp(z) agree', close === true && describe(expZ.f).expShape === true);
check('log(z) is the cut', describe(compile('log(z)').f).cut === true);
check('a bad name is a ParseError', (() => { try { compile('ln(z)'); return false; } catch (e) { return /log/.test(e.message); } })());

const t0 = Date.now();
buildForest(exp, expPreset.input, expPreset.output, desk.strings, 7);
const forestMs = Date.now() - t0;
let texMs = 0;
{
  const t1 = Date.now();
  const f = exp;
  const win = expPreset.input;
  const N = desk.texture;
  let sink = 0;
  for (let j = 0; j < N; j++) {
    const y = win.y[0] + (win.y[1] - win.y[0]) * ((j + 0.5) / N);
    for (let i = 0; i < N; i++) {
      const x = win.x[0] + (win.x[1] - win.x[0]) * ((i + 0.5) / N);
      const w = f({ re: x, im: y });
      sink += w.re + w.im;
    }
  }
  texMs = Date.now() - t1;
  if (sink === 0) console.log('sink', sink);
}
console.log('bench forest', desk.strings + '^2', forestMs + 'ms; texture evals', desk.texture + '^2', texMs + 'ms');
check('a desk rebuild of the forest stays under 80ms', forestMs < 80);
check('a desk sheet of exp stays under 120ms', texMs < 120);

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('planes-smoke ok');
