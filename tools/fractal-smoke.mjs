// Node checks for the Test 2 map split and the Julia / Newton arithmetic.
// Run: node tools/fractal-smoke.mjs

import { readFileSync } from 'node:fs';
import { stationsForMap, stationForTopic, stationForProblem, stationById, threadsOn, stationPart, STATIONS } from '../js/registry.js';
import { stationNeighbours } from '../js/stations/problems.js';
import { parseRoute, groupStations, mapForcedByRoute } from '../js/app.js';
import { fillJulia, fillNewton, juliaWalk, newtonWalk, monicCoeffs, effectiveEscape, samplePath } from '../js/core/fractal.js';
import { parsePath, evalPath } from '../js/core/path-expr.js';
import { smoothLoop, presetById, compileFormula } from '../js/core/path-geom.js';
import { fromDouble, ddAdd, ddDiv, ddMul } from '../js/core/doubledouble.js';
import { needsDeep, DOUBLE_EDGE, WIDTH_FLOOR } from '../js/core/deep-fill.js';
import { orbitUntil, orbitSentence, criticalPeriod, ORBIT_K_DEFAULT, ORBIT_K_MAX, ORBIT_R_DEFAULT } from '../js/core/orbit-settle.js';
import { formatStep, formatValue, stepToUnit, unitToStep, runSubsteps, substepsForFrame, quantize } from '../js/core/stepper.js';
import { describePaper, newtonFactor, PAPER_CAP, LANDED_TOL2 } from '../js/stations/paper.js';
import { TEST2_PROBLEMS, test2ProblemById } from '../js/data/test2-problems.js';
import { TEST2_TOPICS } from '../js/data/test2.js';
import { THROUGHLINE } from '../js/data/matrix.js';
import { buildTest2SearchItems } from '../js/stations/home-test2.js';
import { searchItems } from '../js/stations/home.js';
import { test2LinkList } from '../js/stations/test2-ui.js';
import { initialState as rootsInitial } from '../js/stations/roots.js';
import {
  JULIA_SOURCE, NEWTON_SOURCE, citationText,
  SLIDE_SOURCE, PRODUCT_SOURCE, POWER_SOURCE, UNITY_SOURCE,
  JULIA_EARLIER, NEWTON_EARLIER, MANDELBROT_EARLIER, BULBS_EARLIER,
} from '../js/data/textbook.js';

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name);
  } else {
    console.log('ok  ', name);
  }
}

const t1 = stationsForMap('test1').map((s) => s.id);
const t2 = stationsForMap('test2').map((s) => s.id);
check('test 1 keeps addresses and drops fractals', t1.includes('addresses') && t1.includes('problems') && !t1.includes('julia') && !t1.includes('newton'));
check('test 1 is 21 stops', t1.length === 21);
const EXPECT_T2 = ['home', 'sequence', 'series', 'repeat', 'disk', 'julia', 'zero', 'mandelbrot', 'bulbs', 'seeds', 'newton-step', 'newton', 'half', 'geometric', 'powerseries', 'harmonic', 'index', 'paper'];
check('test 2 places', t2.join() === EXPECT_T2.join() && !t2.includes('addresses'));
check('topic T1.1 still opens addresses', stationForTopic('T1.1').id === 'addresses');
check('topic J1 opens julia', stationForTopic('J1').id === 'julia');
check('topic N1 opens newton-step', stationForTopic('N1').id === 'newton-step');
check('topic N2 opens newton', stationForTopic('N2').id === 'newton');
check('topic J3 opens zero', stationForTopic('J3').id === 'zero');
check('topic S1 opens sequence', stationForTopic('S1').id === 'sequence');
check('topic M1 opens mandelbrot', stationForTopic('M1').id === 'mandelbrot');
check('topic M2 opens bulbs', stationForTopic('M2').id === 'bulbs');
check('topic G1 opens geometric', stationForTopic('G1').id === 'geometric');
check('topic H1 opens harmonic', stationForTopic('H1').id === 'harmonic');
check('route #julia', parseRoute('#julia').station === 'julia');
check('route #roots-cube', parseRoute('#roots-cube').station === 'roots' && parseRoute('#roots-cube').preset.token === 'cube');
check('#roots-cube forces test 1', mapForcedByRoute(stationById('roots'), parseRoute('#roots-cube')) === 'test1');
check('route #arithmetic-add', parseRoute('#arithmetic-add').station === 'arithmetic' && parseRoute('#arithmetic-add').preset.token === 'add');
check('route #topic-J1', parseRoute('#topic-J1').station === 'julia' && parseRoute('#topic-J1').preset.id === 'J1');
check('route #topic-T1-1 still addresses', parseRoute('#topic-T1-1').station === 'addresses');
check('#julia forces test 2', mapForcedByRoute(stationById('julia'), parseRoute('#julia')) === 'test2');
check('#topic-J1 forces test 2', mapForcedByRoute(stationById('julia'), parseRoute('#topic-J1')) === 'test2');
check('#addresses forces test 1', mapForcedByRoute(stationById('addresses'), parseRoute('#addresses')) === 'test1');
check('#home keeps the remembered map', mapForcedByRoute(stationById('home'), parseRoute('#home')) === null);
check('#home-t2 is the Test 1 thread, not Test 2', mapForcedByRoute(stationById('home'), parseRoute('#home-t2')) === 'test1');
check('an unknown hash forces no map', mapForcedByRoute(null, parseRoute('#nope')) === null);
check('test 1 groups have no part A', !groupStations(stationsForMap('test1'), 'test1').some((g) => g.part === 'A'));
check('test 2 home sits in part A', stationPart(stationById('home'), 'test2') === 'A');
check('test 2 home threads are F1, F2, F3', threadsOn(stationById('home'), 'test2').join() === 'F1,F2,F3');
check('#problem-4.2.4 opens the disk', parseRoute('#problem-4.2.4').station === 'disk' && parseRoute('#problem-4-2-4').station === 'disk');
check('#problem-E4.2.12 opens the orbit of 0', parseRoute('#problem-E4.2.12').station === 'zero');
check('the index does not steal a topic', stationForTopic('J1').id !== 'index' && stationForProblem('4.2.4').id !== 'index');
check('test 1 home threads unchanged', threadsOn(stationById('home'), 'test1').join() === 'T1,T2,T3');
check('Test 1 next from home is still addresses', stationNeighbours(stationsForMap('test1'), 'home').next === 'addresses');
check('full manifest next from home is still addresses', stationNeighbours(STATIONS, 'home').next === 'addresses');

const S3 = Math.sqrt(3);
const unity = [{ re: 1, im: 0 }, { re: -0.5, im: S3 / 2 }, { re: -0.5, im: -S3 / 2 }];
const coeffs = monicCoeffs(unity);
check('z^3 - 1 leading 1', Math.abs(coeffs[3].re - 1) < 1e-9 && Math.abs(coeffs[3].im) < 1e-9);
check('z^3 - 1 no z^2', Math.hypot(coeffs[2].re, coeffs[2].im) < 1e-8);
check('z^3 - 1 no z', Math.hypot(coeffs[1].re, coeffs[1].im) < 1e-8);
check('z^3 - 1 constant -1', Math.abs(coeffs[0].re + 1) < 1e-8 && Math.abs(coeffs[0].im) < 1e-8);

const quad = monicCoeffs([{ re: 1, im: 0 }, { re: -1, im: 0 }]);
check('z^2 - 1', Math.abs(quad[2].re - 1) < 1e-9 && Math.abs(quad[1].re) < 1e-9 && Math.abs(quad[0].re + 1) < 1e-9);

function sampleJulia(re, im, c, iter = 40) {
  const field = new Float32Array(1);
  const R = effectiveEscape(c, 2);
  fillJulia(field, 1, 1, 0, 1, { centerRe: re, centerIm: im, unitsAcross: 1 }, c, iter, R * R);
  return field[0];
}

check('c = 0 keeps the origin', sampleJulia(0, 0, { re: 0, im: 0 }) < 0);
check('c = 0 lets 1.5 escape', sampleJulia(1.5, 0, { re: 0, im: 0 }) >= 0);
const insideDisk = sampleJulia(0.4, 0.2, { re: 0, im: 0 });
const moved = sampleJulia(0.4, 0.2, { re: -0.75, im: 0.4 });
check('dragging c changes the fate of one point', insideDisk < 0 && moved >= 0);

const walk0 = juliaWalk({ re: 0.45, im: 0.2 }, { re: 0, im: 0 }, 40, 4);
check('green walk stays in the disk', walk0.escaped === false);
const walkOut = juliaWalk({ re: 0.45, im: 0.2 }, { re: 0.8, im: 0.6 }, 40, 4);
check('same start leaves once c moves', walkOut.escaped === true);

function sampleNewton(re, im, roots) {
  const field = new Float32Array(1);
  fillNewton(field, 1, 1, 0, 1, { centerRe: re, centerIm: im, unitsAcross: 1 }, roots, 24, 1e-4);
  return field[0];
}
const near1 = sampleNewton(0.8, 0.1, unity);
check('a start near 1 finds the blue root', Math.floor(near1) - 1 === 0);
const leftOf0 = sampleNewton(-0.8, 0, unity);
check('a start left of 0 still finds the blue root', Math.floor(leftOf0) - 1 === 0);
const shifted = unity.map((r, i) => (i === 0 ? { re: -0.2, im: 0.2 } : r));
const before = sampleNewton(0, 0, unity);
const afterDrag = sampleNewton(0, 0, shifted);
check('moving the blue root changes the start at 0', before === 0 && Math.floor(afterDrag) - 1 === 0);

const guess = newtonWalk({ re: 0.35, im: 0.45 }, unity, 24, 1e-4);
check('the sample guess reaches a root', guess.root >= 0 && guess.steps > 0 && guess.steps <= 24);

const straight = samplePath([{ re: 0, im: 0 }, { re: 1, im: 0 }], { step: 0.25, maxFrames: 48 });
check('a straight drag stays on the line', straight.length === 5 && straight.every((p) => Math.abs(p.im) < 1e-9) && Math.abs(straight[0].re) < 1e-9 && Math.abs(straight[straight.length - 1].re - 1) < 1e-9);
check('frames sit on the step', [0, 0.25, 0.5, 0.75, 1].every((x, i) => Math.abs(straight[i].re - x) < 1e-9));

const elbow = samplePath([{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 1 }], { step: 0.25, maxFrames: 48 });
const corner = elbow.some((p) => Math.hypot(p.re - 1, p.im) < 1e-9);
const diagonalOnly = elbow.every((p) => Math.abs(p.re - p.im) < 0.15);
check('an L-shaped drag keeps the corner', elbow.length >= 4 && corner && !diagonalOnly && Math.abs(elbow[elbow.length - 1].im - 1) < 1e-9);
const skinny = samplePath([{ re: 0, im: 0 }, { re: 0.05, im: 0 }, { re: 0.05, im: 1.5 }], { step: 0.25, maxFrames: 48 });
check('a short leg still keeps the corner', skinny.some((p) => Math.hypot(p.re - 0.05, p.im) < 1e-9) && Math.abs(skinny[skinny.length - 1].im - 1.5) < 1e-9);
const tight = samplePath([{ re: 0, im: 0 }, { re: 0.05, im: 0 }, { re: 0.05, im: 0.02 }], { step: 0.08, maxFrames: 48 });
check('a short corner is still a frame', tight.some((p) => Math.hypot(p.re - 0.05, p.im) < 1e-9) && Math.abs(tight[tight.length - 1].im - 0.02) < 1e-9);

const toQuarter = samplePath([{ re: 0, im: 0 }, { re: 0.45, im: 0 }], { step: 0.08, maxFrames: 48 });
check('a drag to 0.45 passes the cusp at 1/4', toQuarter.some((p) => Math.abs(p.re - 0.25) <= 0.04) && Math.abs(toQuarter[toQuarter.length - 1].re - 0.45) < 1e-9);
const shortHop = samplePath([{ re: 0, im: 0 }, { re: 0.3, im: 0 }], { step: 0.08, maxFrames: 48 });
const longHop = samplePath([{ re: 0, im: 0 }, { re: 1.2, im: 0 }], { step: 0.08, maxFrames: 48 });
check('a longer drag gets more frames', longHop.length > shortHop.length);
check('a smaller step gets more frames', samplePath([{ re: 0, im: 0 }, { re: 1, im: 0 }], { step: 0.04 }).length > samplePath([{ re: 0, im: 0 }, { re: 1, im: 0 }], { step: 0.2 }).length);

const twitch = samplePath([{ re: 0, im: 0 }, { re: 0.01, im: 0 }], { step: 0.08, minLength: 0.04 });
check('a click is not a film', twitch.length === 1);
check('frame count is capped', samplePath(
  Array.from({ length: 40 }, (_, i) => ({ re: i * 0.1, im: 0 })),
  { step: 0.04, maxFrames: 8 },
).length === 8);
const loop = [
  { re: 0, im: 0 },
  { re: 1.425, im: 0 },
  { re: 1.425, im: 1.425 },
  { re: 0, im: 1.425 },
  { re: 0, im: 0 },
];
const fine = samplePath(loop, { step: 0.04, maxFrames: 96 });
const mid = samplePath(loop, { step: 0.08, maxFrames: 96 });
const wide = samplePath(loop, { step: 0.12, maxFrames: 96 });
check('a long loop changes with the step', fine.length > mid.length && mid.length > wide.length && wide.length > 2);
check('a capped step is the one the frames use', fine.length === 96 && fine.spacing > 0.04 && fine.spacing < 0.08 && Math.abs(mid.spacing - 0.08) < 1e-9 && Math.abs(fine[fine.length - 1].re) < 1e-9 && Math.abs(fine[fine.length - 1].im) < 1e-9);

check('27 cited problems', TEST2_PROBLEMS.length === 27);
check('every problem cites a section', TEST2_PROBLEMS.every((p) => p.href.startsWith('https://complexanalysis.org/web/') && p.section && p.pin && p.scope && p.station && stationById(p.station)));
check('every topic cites a section', TEST2_TOPICS.every((t) => t.source && t.source.href.startsWith('https://complexanalysis.org/') && t.source.pin && t.scope && t.station));
check('4.3 and 4.4 stay likely', test2ProblemById('4.3.1').scope === 'likely' && test2ProblemById('4.3.5').scope === 'likely' && test2ProblemById('4.4.6').scope === 'likely' && test2ProblemById('4.4.3').scope === 'likely' && stationById('geometric').scope === 'likely');
check('3.3 stays possible', test2ProblemById('3.3.1').scope === 'possible' && test2ProblemById('3.3.5').scope === 'possible' && stationById('harmonic').scope === 'possible');
check('4.2.1 stays core', test2ProblemById('4.2.1').scope === 'core');
const coreGroups = TEST2_PROBLEMS.filter((p) => p.scope === 'core').map((p) => p.group).join('');
check('core index follows the map', TEST2_PROBLEMS[0].id === '4.1.1' && coreGroups === `${'A'.repeat(4)}${'B'.repeat(4)}${'C'.repeat(4)}${'D'.repeat(9)}`);
check('Mandelbrot exercises sit on seeds', ['4.2.7', '4.2.8', '4.2.9', '4.2.10', '4.2.11', '4.2.12', '4.2.13', 'E4.2.16', 'E4.2.23'].every((id) => test2ProblemById(id).station === 'seeds'));
check('an added check is not stored as the book text', TEST2_PROBLEMS.every((p) => p.added == null || p.book !== p.added));
check('finder opens 4.2.4', searchItems('4.2.4', buildTest2SearchItems()).results[0].id === '4.2.4');
const groups = groupStations(stationsForMap('test2'), 'test2').map((g) => g.part).join('');
check('test 2 parts run A to D, then F, H, G', groups === 'ABCDFHG');
const path = test2LinkList();
check('next from the radius is the index', stationNeighbours(path, 'powerseries').next === 'index');
check('next from the index is the paper', stationNeighbours(path, 'index').next === 'paper');
check('the paper ends Next', stationNeighbours(path, 'paper').next == null);
check('section 3.3 is off Next', !path.some((s) => s.id === 'harmonic') && stationById('harmonic').order > stationById('paper').order);

const bookNewton = [[-0.875, 1.125], [-0.22212, 0.83942], [0.03624, 0.97638], [-0.00086, 0.99958]];
const traced = newtonWalk({ re: 0.25, im: 0.25 }, [{ re: 0, im: 1 }, { re: 0, im: -1 }], 6, 1e-18);
check('Example 4.2.1 table, added against the book digits', bookNewton.every(([re, im], i) => {
  const p = traced.points[i + 1];
  return p && Math.hypot(p.re - re, p.im - im) < 2e-4;
}) && Math.hypot(traced.points[5].re, traced.points[5].im - 1) < 1e-3);

const z0 = { re: 0.5, im: 0.1 };
let zx = z0.re;
let zy = z0.im;
let modOk = true;
for (let k = 1; k <= 6; k++) {
  const nx = zx * zx - zy * zy;
  const ny = 2 * zx * zy;
  zx = nx;
  zy = ny;
  if (Math.abs(Math.hypot(zx, zy) - Math.hypot(z0.re, z0.im) ** (2 ** k)) > 1e-8) modOk = false;
}
check('Exercise 4.2.4 modulus, added', modOk);
check('Exercise 4.4.6 radii, added', Math.abs(Math.hypot(4, -1) - Math.sqrt(17)) < 1e-12 && Math.hypot(2, 3) < Math.hypot(4, 1));
function lapLog(x, y) {
  const r2 = x * x + y * y;
  const uxx = 2 * (y * y - x * x) / (r2 * r2);
  const uyy = 2 * (x * x - y * y) / (r2 * r2);
  return uxx + uyy;
}
check('Exercise 3.3.1(b) laplacian, added', Math.abs(lapLog(1, 2)) < 1e-12 && Math.abs(lapLog(-0.3, 0.7)) < 1e-12);
function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
const sum431 = cdiv({ re: 2, im: 1 }, { re: 1, im: 1 });
check('Exercise 4.3.1(b) geometric sum, added', Math.abs(sum431.re - 1.5) < 1e-12 && Math.abs(sum431.im + 0.5) < 1e-12);

const eighth = describePaper({
  grip: 'twist', z: { re: Math.SQRT1_2, im: Math.SQRT1_2 }, c: { re: 0, im: 0 }, steps: 8,
});
check('eighth powers stay and squares settle', eighth.fates.find((f) => f.id === 'powers').word === 'stays' && eighth.fates.find((f) => f.id === 'squares').word === 'settles');
check('eighth product runs out while the place stays', Math.abs(eighth.place - 1) < 1e-9 && Math.abs(eighth.oneStep - 2) < 1e-9 && Math.abs(eighth.product - 256) < 1e-6);
check('the notch is on the twist', eighth.notch && Math.hypot(eighth.notch.re, eighth.notch.im) < 1e-12);
const quarter = describePaper({ grip: 'twist', z: { re: 0.5, im: 0.25 }, c: { re: 0, im: 0 }, steps: 4 });
check('inside the circle |2z| is outside it', quarter.place < 1 && quarter.oneStep > 1 && quarter.product < 0.01 && quarter.fates.every((f) => f.word === 'settles'));
check('landed is the Newton picture test', LANDED_TOL2 === 1e-4);
const bookStep = describePaper({ grip: 'newton2', z: { re: 0.25, im: 0.25 }, c: { re: 0, im: 0 }, steps: 5 });
check('five Newton steps name i', bookStep.fates[0].word === 'which' && bookStep.fates[0].token === 'cart' && bookStep.fates[0].text.includes('Landed at step 4') && bookStep.trails[0].points.length === 6);
const purple = describePaper({ grip: 'newton3', z: { re: 0.35, im: 0.45 }, c: { re: 0, im: 0 }, steps: 5 });
check('the sample guess names the purple root', purple.fates[0].word === 'which' && purple.fates[0].token === 'output' && purple.fates[0].text.includes('Landed at step 5') && purple.fates[0].text.includes('0.01'));
const early = describePaper({ grip: 'newton3', z: { re: 0.35, im: 0.45 }, c: { re: 0, im: 0 }, steps: 4 });
check('four steps of the guess have not landed', early.fates[0].word === 'which' && early.fates[0].text.includes('Not landed') && early.trails[0].points.length === 5);
const realSeed = describePaper({ grip: 'newton2', z: { re: 0.5, im: 0 }, c: { re: 0, im: 0 }, steps: 8 });
check('a real seed does not name a root', realSeed.fates[0].word === 'leaves' && realSeed.notch === null);
const geom = describePaper({ grip: 'stack', z: { re: 0.5, im: 0.5 }, c: { re: 0, im: 0 }, steps: 8 });
check('the geometric pile settles', geom.fates.find((f) => f.id === 'bags').word === 'settles' && geom.fates.find((f) => f.id === 'pile').word === 'settles');
const belt = describePaper({ grip: 'stack', z: { re: Math.SQRT1_2, im: Math.SQRT1_2 }, c: { re: 0, im: 0 }, steps: 8 });
check('on the circle the bags stay', belt.fates.every((f) => f.word === 'stays'));
check('Again stops at eight', PAPER_CAP === 8 && describePaper({ grip: 'twist', z: { re: 0.2, im: 0 }, c: { re: 0, im: 0 }, steps: 40 }).steps === 8);
const atI = newtonFactor({ re: 0, im: 1 }, [{ re: 0, im: 1 }, { re: 0, im: -1 }]);
const away = newtonFactor({ re: 0.25, im: 0.25 }, [{ re: 0, im: 1 }, { re: 0, im: -1 }]);
const exact = { re: 0.25, im: 0.25 };
const z2 = exact.re * exact.re - exact.im * exact.im;
const zz = 2 * exact.re * exact.im;
const expectN = cdiv({ re: z2 + 1, im: zz }, { re: 2 * z2, im: 2 * zz });
check('Newton multiplier is 0 at a simple root', atI && Math.hypot(atI.re, atI.im) < 1e-9);
check('Newton multiplier matches (z^2+1)/(2z^2)', away && Math.hypot(away.re - expectN.re, away.im - expectN.im) < 1e-9);
check('the flat paper is Test 2 only', stationById('paper').map === 'test2' && !stationsForMap('test1').some((s) => s.id === 'paper'));
const SECTION_42 = 'Howell & Mathews, Complex Analysis, Chapter 4, § 2';
const SECTION_42_URL = 'https://complexanalysis.org/web/sec_julia-mandelbrot.html';
check('julia names section 4.2', citationText(JULIA_SOURCE) === SECTION_42 && JULIA_SOURCE.url === SECTION_42_URL);
check('newton names the same section', citationText(NEWTON_SOURCE) === SECTION_42 && NEWTON_SOURCE.url === SECTION_42_URL);
check('a full citation names book, chapter, and section', citationText({ book: 'Example', chapter: '4', section: '2' }) === 'Example, Chapter 4, § 2');
check('a half citation stays blank', citationText({ book: 'Example' }) === '');

const CH1 = 'Howell & Mathews, Complex Analysis, Chapter 1, § ';
check('a slide cites chapter 1 section 3', citationText(SLIDE_SOURCE) === `${CH1}3` && SLIDE_SOURCE.url.endsWith('#fig_ch-01-08'));
check('one product cites chapter 1 section 4', citationText(PRODUCT_SOURCE) === `${CH1}4` && PRODUCT_SOURCE.url.endsWith('#fig_ch-01-17'));
check('a power cites chapter 1 section 5', citationText(POWER_SOURCE) === `${CH1}5` && POWER_SOURCE.url.endsWith('#De_Moivre_s_formula'));
check('roots of unity cite chapter 1 section 5', citationText(UNITY_SOURCE) === `${CH1}5` && UNITY_SOURCE.url.endsWith('#Roots_of_Unity'));
check('julia points at powers and the slide', JULIA_EARLIER.ideas.map((i) => i.station).join() === 'powers,arithmetic' && JULIA_EARLIER.ideas[0].tone === 'polar' && JULIA_EARLIER.ideas[1].tone === 'cart' && JULIA_EARLIER.ideas[1].token === 'add');
check('newton points at roots of unity', NEWTON_EARLIER.ideas.length === 1 && NEWTON_EARLIER.ideas[0].station === 'roots' && NEWTON_EARLIER.ideas[0].tone === 'polar' && NEWTON_EARLIER.ideas[0].token === 'cube' && citationText(NEWTON_EARLIER.noteSource) === SECTION_42 && NEWTON_EARLIER.noteSource.url.endsWith('#fig_ch-04-cp-1'));
const cube = rootsInitial({ kind: 'token', token: 'cube' });
check('the newton card opens three cube roots of 1', cube.n === 3 && cube.c.re === 1 && cube.c.im === 0);
check('roots still opens on five fifth-roots', rootsInitial(null).n === 5);
check('every earlier card cites a chapter and a section', [...JULIA_EARLIER.ideas, ...NEWTON_EARLIER.ideas, ...MANDELBROT_EARLIER.ideas, ...BULBS_EARLIER.ideas].every((idea) => idea.sources.length > 0 && idea.sources.every((s) => citationText(s) !== '')));
check('mandelbrot earlier cards are the square, the slide, and the Julia picture', MANDELBROT_EARLIER.ideas.map((i) => `${i.station}:${i.tone}`).join() === 'powers:polar,arithmetic:cart,julia:input' && MANDELBROT_EARLIER.ideas[1].token === 'add');
check('the cardioid earlier cards are the derivative, the set, and the orbit of 0', BULBS_EARLIER.ideas.map((i) => `${i.station}:${i.tone}`).join() === 'derivative:output,mandelbrot:cart,zero:input');
check('the same-move row carries Mandelbrot and the cardioid', THROUGHLINE.find((r) => r.id === 'R16').stops.map((s) => s.id).join() === 'sequence,zero,julia,mandelbrot,bulbs,newton');
check('the exercises sit after the cardioid', stationById('seeds').summary.includes('before this one') && !stationById('seeds').summary.includes('next stop'));
{
  const still = orbitUntil({ re: 0, im: 0 }, (z) => z);
  check('the disk defaults are K 5 and R 0.001, and a still orbit settles', still.K === ORBIT_K_DEFAULT && still.R === ORBIT_R_DEFAULT && still.reason === 'cluster' && orbitSentence(still).startsWith('Settles'));
  const huge = orbitUntil({ re: 0, im: 0 }, (z) => z, { K: 80, R: 0.001 });
  check('K stops at 64', huge.K === ORBIT_K_MAX && huge.K === 64);
  const toolsSrc = readFileSync(new URL('../js/core/set-tools.js', import.meta.url), 'utf8');
  check('loadFormula does not take keepValues', !toolsSrc.includes('keepValues'));
  const familySrc = readFileSync(new URL('../js/stations/mandelbrot-family.js', import.meta.url), 'utf8');
  check('the Mandelbrot companion fills on a worker', familySrc.includes('worker: true') && familySrc.includes("kind: 'julia'"));
  const mandelSrc = readFileSync(new URL('../js/stations/mandelbrot.js', import.meta.url), 'utf8');
  const bulbsSrc = readFileSync(new URL('../js/stations/bulbs.js', import.meta.url), 'utf8');
  check('Figure 4.2.13 stays flagged', mandelSrc.includes('PDF number not checked') && bulbsSrc.includes('PDF number was not checked'));
}

check('a step of 0.00001 is written in plain digits', formatStep(1e-5) === '0.00001' && formatStep(0.08) === '0.08');
check('the log slider round-trips a fine step', Math.abs(unitToStep(stepToUnit(1e-5)) - 1e-5) < 1e-12 && Math.abs(unitToStep(stepToUnit(0.2)) - 0.2) < 1e-9);
{
  let clock = 0;
  const ran = runSubsteps(100000, () => {}, 8, () => { clock += 0.3; return clock; });
  check('a fine step stops inside the frame budget', ran > 64 && ran < 4000);
}
{
  const plan = substepsForFrame({ dtMs: 16.7, step: 1e-5, ratePerSec: 0.45, maxCount: 8000 });
  check('one frame can advance many fine steps', plan.count > 100 && plan.count <= 8000 && plan.advanced > 0.005 && plan.advanced < 0.02);
  check('a pure increment has a closed form', Math.abs(quantize(plan.advanced, 1e-5) - plan.advanced) < 1e-9);
}
{
  const w = 96;
  const h = 96;
  const field = new Float64Array(w * h);
  const t0 = performance.now();
  fillJulia(field, w, h, 0, h, { centerRe: 0, centerIm: 0, unitsAcross: 4 }, { re: -0.75, im: 0 }, 24, 4);
  const ms = performance.now() - t0;
  check('one coarse Julia frame stays under 30 ms', ms < 30);
}

{
  const good = parsePath('0.7885*exp(2*pi*i*t)');
  check('a path formula parses', good.ok && good.vars.length === 0);
  const bad = parsePath('2+');
  check('a bad path formula names the problem', !bad.ok && typeof bad.hint === 'string' && bad.hint.length > 0);
  const circle = presetById('circle');
  const compiled = compileFormula(circle.formula, circle.values);
  check('the circle preset names cx, cy, and r', compiled.ok && compiled.vars.join() === 'cx,cy,r');
  const at0 = evalPath(compiled.ast, 0, compiled.env);
  check('the circle starts at r', at0.ok && Math.hypot(at0.z.re - 0.7885, at0.z.im) < 1e-9);
  const drawn = smoothLoop([{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 1 }, { re: 0, im: 1 }], 32);
  const gaps = [];
  for (let i = 1; i < drawn.length; i++) gaps.push(Math.hypot(drawn[i].re - drawn[i - 1].re, drawn[i].im - drawn[i - 1].im));
  const gap0 = gaps[0];
  const meanGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  check('a drawn loop is resampled at constant speed', drawn.length === 32 && gaps.every((g) => Math.abs(g - meanGap) < meanGap * 0.02));
  const shifted = ddAdd(fromDouble(0.25), fromDouble(1e-20));
  check('a shift of 1e-20 survives beside 0.25', shifted.lo !== 0 && (0.25 + 1e-20) === 0.25);
  check('deep iteration starts below width 1e-13 and stops at 1e-28', needsDeep({ unitsAcross: 1e-14 }) && !needsDeep({ unitsAcross: 1 }) && DOUBLE_EDGE === 1e-13 && WIDTH_FLOOR === 1e-28);
  const clustered = orbitUntil({ re: 0.2, im: 0.1 }, () => ({ re: 0.2, im: 0.1 }), { K: 5, R: 0.25 });
  check('an orbit that sits still is a cluster', clustered.reason === 'cluster' && clustered.disk && clustered.points.length >= 5);
  const escaped = orbitUntil({ re: 0, im: 0 }, (z) => ({ re: z.re + 3, im: 0 }), { K: 5, R: 0.25, escapes: (z) => z.re * z.re + z.im * z.im > 4 });
  check('an orbit that leaves is an escape', escaped.reason === 'escape' && escaped.disk == null);
  const p0 = criticalPeriod({ re: 0, im: 0 });
  const pOut = criticalPeriod({ re: 0.3, im: 0 });
  const p2 = criticalPeriod({ re: -0.75, im: 0 });
  const pBulb = criticalPeriod({ re: -1, im: 0 });
  check('the period of the orbit of 0 is read off the cycle', p0.bounded && p0.period === 1 && pOut.bounded === false && pOut.period === 0 && p2.bounded && p2.period === 2 && pBulb.bounded && pBulb.period === 2);
  const tinyK = orbitUntil({ re: 0, im: 0 }, (z) => z, { K: 1, R: 0.25 });
  check('K cannot fall below 2', tinyK.K === 2 && tinyK.reason === 'cluster');
  check('a circle radius keeps the digits the step formatter would drop', formatValue(0.7885) === '0.7885' && formatStep(0.08) === '0.08');
  const named = parsePath('__proto__ + constructor');
  const env = Object.create(null);
  env['__proto__'] = 0.5;
  env.constructor = 0.25;
  const namedAt = evalPath(named.ast, 0, env);
  const inherited = evalPath(named.ast, 0, {});
  check('a path name is a number, not a prototype lookup', named.ok && namedAt.ok && Math.abs(namedAt.z.re - 0.75) < 1e-12 && inherited.ok && inherited.z.re === 0);
  const parserSrc = readFileSync(new URL('../js/core/path-expr.js', import.meta.url), 'utf8');
  check('the path parser does not call eval', !/\beval\s*\(/.test(parserSrc) && !/new\s+Function\s*\(/.test(parserSrc));
  const back = ddMul(ddDiv(fromDouble(1), ddAdd(fromDouble(1), fromDouble(1e-18))), ddAdd(fromDouble(1), fromDouble(1e-18)));
  check('a double-double reciprocal keeps the low word', Math.abs((back.hi + back.lo) - 1) < 1e-30);
}

await runViewChecks();

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('all checks passed');

async function runViewChecks() {
  const queue = [];
  let seq = 0;
  globalThis.requestAnimationFrame = (fn) => {
    const id = ++seq;
    queue.push({ id, fn });
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    const i = queue.findIndex((q) => q.id === id);
    if (i >= 0) queue.splice(i, 1);
  };
  const listeners = new Map();
  globalThis.document = {
    hidden: false,
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            putImageData() {},
            drawImage() {},
            clearRect() {},
            setTransform() {},
            createImageData(w, h) {
              return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
            },
          };
        },
      };
    },
    addEventListener(type, fn) {
      const list = listeners.get(type) || [];
      list.push(fn);
      listeners.set(type, list);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((f) => f !== fn));
    },
  };
  const { attachFractal } = await import('../js/core/fractal-view.js');
  const { createFrame, createMotion, nextFilmFrame } = await import('../js/core/anim.js');

  function flush(n) {
    for (let i = 0; i < n; i += 1) {
      const item = queue.shift();
      if (!item) return;
      item.fn(i * 16);
    }
  }
  function flushAll() {
    let guard = 0;
    while (queue.length && guard < 40) {
      flush(1);
      guard += 1;
    }
  }

  let draws = 0;
  const plane = {
    canvas: { width: 320, height: 240 },
    getSize: () => ({ w: 320, h: 240 }),
    getView: () => ({ center: { re: 0, im: 0 }, unitsAcross: 4 }),
    requestDraw() { draws += 1; },
    addLayer() { return { remove() {} }; },
    on() { return () => {}; },
  };
  const hooks = {
    budgetMs: 0,
    reduced: false,
    colours: () => ({}),
    fill() {},
    paint() {},
  };
  const live = attachFractal(plane, hooks);
  live.request(false);
  flush(1);
  check('one band of a final is not published', draws === 0 && live.phase() === 'drawing');
  live.suspend();
  flushAll();
  check('suspend cancels the loop', draws === 0 && queue.length === 0 && live.pending === false);

  draws = 0;
  const gone = attachFractal(plane, hooks);
  gone.request(false);
  flush(1);
  gone.destroy();
  flushAll();
  check('destroy cancels the loop', draws === 0 && queue.length === 0);

  draws = 0;
  const full = attachFractal(plane, hooks);
  full.request(false);
  flushAll();
  check('a finished final is published once', draws === 1 && full.phase() === 'ready');
  full.destroy();

  let ran = 0;
  const frame = createFrame();
  frame.arm(() => { ran += 1; });
  frame.stop();
  flushAll();
  check('a stopped frame does not run', ran === 0 && frame.pending === false);

  draws = 0;
  const sharpen = attachFractal(plane, hooks);
  sharpen.request(true);
  flushAll();
  check('a finished draft is not called drawing', sharpen.phase() === 'draft');
  sharpen.request(false);
  flush(1);
  check('a sharp pass keeps the finished draft on screen', sharpen.phase() === 'draft');
  flushAll();
  check('the sharp pass then publishes ready', sharpen.phase() === 'ready');
  sharpen.destroy();

  let moved = -1;
  let finished = false;
  const motion = createMotion({
    raf: (fn) => {
      const id = ++seq;
      queue.push({ id, fn });
      return id;
    },
    cancel: (id) => {
      const i = queue.findIndex((q) => q.id === id);
      if (i >= 0) queue.splice(i, 1);
    },
    hidden: () => false,
  });
  motion.run(100, (u) => { moved = u; }, () => { finished = true; });
  motion.cancel();
  flushAll();
  check('a cancelled motion does not finish', finished === false && moved < 0);

  const waiting = nextFilmFrame(200, 90, 4, 1);
  check('a film does not skip a frame that is not ready', waiting.index === 0 && waiting.due === 2 && waiting.done === false);
  const early = nextFilmFrame(360, 90, 4, 3);
  check('a film is not done until the last frame exists', early.done === false);
  const done = nextFilmFrame(360, 90, 4, 4);
  check('a film is done after the last beat', done.done === true && done.index === 3);

  const { readFileSync } = await import('node:fs');
  const animSrc = readFileSync(new URL('../js/core/anim.js', import.meta.url), 'utf8');
  check('the shared clock caps device pixels at 3', animSrc.includes('maxDpr : 3'));
  check('the shared clock exports the play motion', animSrc.includes('export function createMotion'));

  let liveMark = 1;
  const bands = [];
  const snap = attachFractal(plane, {
    budgetMs: 0,
    draftEdge: 64,
    reduced: false,
    colours: () => ({}),
    sample: () => liveMark,
    fill(_field, _w, _h, _y0, _y1, _view, sample) { bands.push(sample); },
    paint() {},
  });
  snap.request(true);
  flush(1);
  check('a coarse pass paints one band before it is published', bands.length === 1 && bands[0] === 1 && snap.phase() !== 'draft');
  liveMark = 9;
  snap.request(true);
  let guard = 0;
  while (snap.phase() !== 'draft' && guard < 20) {
    flush(1);
    guard += 1;
  }
  const firstBands = bands.length;
  check('a retained coarse pass keeps the sample from when it began', firstBands > 1 && bands.every((sample) => sample === 1) && snap.phase() === 'draft');
  liveMark = 4;
  flush(1);
  check('the next pass samples again when it begins', bands.length > firstBands && bands[firstBands] === 9);
  snap.destroy();

  const newtonSrc = readFileSync(new URL('../js/stations/newton.js', import.meta.url), 'utf8');
  check('Newton fills a pass from the roots sampled at the start', newtonSrc.includes('sample: () => liveRoots()') && newtonSrc.includes('fillAutoNewton(field, w, h, y0, y1, view, roots, pictureIter, TOL2)'));

  function motionAt(envQueue) {
    return (now) => {
      const item = envQueue.shift();
      if (item) item.fn(now);
    };
  }
  const replayQueue = [];
  const replay = createMotion({
    raf: (fn) => {
      const id = ++seq;
      replayQueue.push({ id, fn });
      return id;
    },
    cancel: (id) => {
      const i = replayQueue.findIndex((item) => item.id === id);
      if (i >= 0) replayQueue.splice(i, 1);
    },
    hidden: () => false,
  });
  const replayAt = motionAt(replayQueue);
  const replayU = [];
  replay.run(1000, (u) => { replayU.push(u); });
  replayAt(1000);
  replayAt(2000);
  replayU.length = 0;
  replay.run(1000, (u) => { replayU.push(u); });
  replayAt(2200);
  replayAt(2216);
  check('a replay after an idle gap starts at the beginning', replayU.length >= 2 && replayU[0] < 0.02 && replayU[1] > replayU[0] && replayU[1] < 0.05);

  const resumeU = [];
  replay.run(1000, (u) => { resumeU.push(u); });
  replayAt(4000);
  replayAt(4016);
  replay.cancel();
  resumeU.length = 0;
  replay.run(1000, (u) => { resumeU.push(u); });
  replayAt(4416);
  replayAt(4432);
  check('a resume after a pause gap starts the new run at zero', resumeU.length >= 2 && resumeU[0] < 0.02 && resumeU[1] > resumeU[0] && resumeU[1] < 0.05);

  const driveDt = [];
  replay.drive((dt) => {
    driveDt.push(dt);
    return driveDt.length < 2;
  });
  replayAt(5000);
  replayAt(5016);
  replay.cancel();
  driveDt.length = 0;
  replay.drive((dt) => {
    driveDt.push(dt);
    return true;
  });
  replayAt(5600);
  replayAt(5616);
  replay.cancel();
  check('a drive after a pause gap does not spend the idle time', driveDt.length >= 2 && driveDt[0] < 1 && driveDt[1] > 10 && driveDt[1] < 30);
}
