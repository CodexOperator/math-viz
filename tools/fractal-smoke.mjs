// Node checks for the Test 2 map split and the Julia / Newton arithmetic.
// Run: node tools/fractal-smoke.mjs

import { readFileSync } from 'node:fs';
import { stationsForMap, stationForTopic, stationForProblem, stationById, threadsOn, stationPart, STATIONS } from '../js/registry.js';
import { stationNeighbours } from '../js/stations/problems.js';
import { parseRoute, groupStations, mapForcedByRoute } from '../js/app.js';
import { fillJulia, fillNewton, juliaWalk, newtonWalk, monicCoeffs, effectiveEscape, samplePath } from '../js/core/fractal.js';
import { parsePath, evalPath } from '../js/core/path-expr.js';
import { smoothLoop, presetById, compileFormula } from '../js/core/path-geom.js';
import { fromDouble, ddAdd, ddDiv, ddMul, addressPlaces, centrePlaces, formatZoomScalar } from '../js/core/doubledouble.js';
import { needsDeep, DOUBLE_EDGE, WIDTH_FLOOR } from '../js/core/deep-fill.js';
import {
  orbitUntil, orbitSentence, criticalPeriod, radiusInWorld, applyDisplayedGuard, PARABOLIC_LAM, PARABOLIC_EXTRA, CUSP_EXTRA,
  CUSP_OUTSIDE_SENTENCE, PARABOLIC_SENTENCE, BULB2_SENTENCE,
  ORBIT_K_DEFAULT, ORBIT_K_MAX, ORBIT_R_PX, ORBIT_PERIOD_MAX, quadraticAbsDeriv,
  newtonAbsDeriv, newtonPolyAbs, NEWTON_ROOT_TOL,
} from '../js/core/orbit-settle.js';
import { liftToSphere, planeFromSphere, orbitOnSphere } from '../js/playground/sphere.js';
import { bakeChordal, poleDistance, tipJuliaWindow } from '../js/playground/field.js';
import { external, rayCurves } from '../js/playground/rays.js';
import { REAL_MARKS, PERIOD16_BIRTH } from '../js/playground/cascade.js';
import { createRenderEpoch, frameIsCurrent } from '../js/core/render-epoch.js';
import { formatStep, formatValue, stepToUnit, unitToStep, runSubsteps, substepsForFrame, quantize } from '../js/core/stepper.js';
import { describePaper, newtonFactor, PAPER_CAP, LANDED_TOL2 } from '../js/stations/paper.js';
import { TEST2_PROBLEMS, HOMEWORK_IDS, HOMEWORK_SET, test2ProblemById, problemMarkdown } from '../js/data/test2-problems.js';
import { filmsFor } from '../js/data/films.js';
import { TEST2_TOPICS } from '../js/data/test2.js';
import { THROUGHLINE } from '../js/data/matrix.js';
import { buildTest2SearchItems } from '../js/stations/home-test2.js';
import { searchItems, layoutMap } from '../js/stations/home.js';
import { phasorClaim, impedanceClaim, waveClaim, waveAt, sameLength, PSI } from '../js/stations/circuit-model.js';
import { test2LinkList } from '../js/stations/test2-ui.js';
import { initialState as rootsInitial } from '../js/stations/roots.js';
import {
  JULIA_SOURCE, NEWTON_SOURCE, citationText,
  SLIDE_SOURCE, PRODUCT_SOURCE, ARG_SOURCE, ARG_DEF_SOURCE, POWER_SOURCE, UNITY_SOURCE,
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
check('test 1 is 24 stops', t1.length === 24);
{
  const c1 = stationsForMap('test1').filter((s) => (s.threads || []).includes('C1')).map((s) => s.id);
  check('C1 crosses the plane and the circuit', ['addresses', 'arithmetic', 'staircase', 'powers', 'phasor-current', 'complex-impedance', 'wave-phase'].every((id) => c1.includes(id)));
  check('C1 skips at least one stop', c1.length >= 2 && c1.length < t1.length && !c1.includes('distance') && !c1.includes('roots'));
  const geom = layoutMap(stationsForMap('test1'), 900);
  const strand = geom.threads.find((t) => t.id === 'C1');
  check('C1 draws a line and dots only on its stops', !!strand && strand.d.startsWith('M') && strand.stops.length === c1.length && !strand.stops.some((s) => s.station === 'distance'));
}
{
  const peak = phasorClaim(Math.PI / 2);
  const flat = phasorClaim(0);
  check('phasor claim flips', peak.holds === true && flat.holds === false && peak.text !== flat.text);
  check('phasor says straight up only while the point is up', phasorClaim(Math.PI / 2 - 0.07).holds === true && phasorClaim(Math.PI / 2 - 0.2).holds === false);
  const real = impedanceClaim({ re: 2, im: 0 });
  const coil = impedanceClaim({ re: 0, im: 2 });
  const stub = impedanceClaim({ re: 0.1, im: 0 });
  const slant = impedanceClaim({ re: 0.16, im: 0.11 });
  check('impedance claim flips', real.holds === true && coil.holds === false && real.text !== coil.text);
  check('a short real Z still points with the current', stub.holds === false && /points with the current/.test(stub.text) && !/do not share/.test(stub.text));
  check('a slanted short Z does not claim the phases match', slant.holds === false && /do not share/.test(slant.text));
  const homePhase = waveClaim(0);
  const half = waveClaim(Math.PI);
  const spun = waveAt(Math.PI);
  check('wave claim flips and the length stays', homePhase.holds === true && half.holds === false && sameLength(spun.phased, PSI));
}
const EXPECT_T2 = ['home', 'sequence', 'series', 'repeat', 'disk', 'julia', 'zero', 'mandelbrot', 'bulbs', 'seeds', 'newton-step', 'newton', 'half', 'geometric', 'powerseries', 'harmonic', 'index', 'paper', 'playground', 'pg-twin', 'pg-bulbs', 'pg-cascade', 'pg-rays', 'pg-pole', 'pg-join', 'pg-climb', 'pg-fall', 'pg-lean', 'pg-warp', 'pg-cross'];
check('test 2 places', t2.join() === EXPECT_T2.join() && !t2.includes('addresses'));
{
  const pg = readFileSync(new URL('../js/playground/app.js', import.meta.url), 'utf8');
  check('the playground learns the Mandelbrot set on its own station', pg.includes("'index.html#mandelbrot'") && pg.includes('The Mandelbrot Set') && !pg.includes('index.html#seeds') && !pg.includes('Which c Keep 0 Bounded'));
  check('the playground judges an orbit with the shared screen disk', /import \{[^}]*\borbitUntil\b/.test(pg) && pg.includes('radiusInWorld') && pg.includes('ORBIT_R_PX') && !/import \{[^}]*\bsettle\b/.test(pg));
  check('a p-cycle is named as settles, stays, or leaves', pg.includes('it settles, it stays, or it leaves'));
}
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
check('#home-f2 is the Test 2 thread', mapForcedByRoute(stationById('home'), parseRoute('#home-f2')) === 'test2');
check('an unknown hash forces no map', mapForcedByRoute(null, parseRoute('#nope')) === null);
check('the shipped route rule matches the kit helper',
  readFileSync(new URL('../js/core/map-route.js', import.meta.url), 'utf8')
  === readFileSync(new URL('../kit/template/js/core/map-route.js', import.meta.url), 'utf8'));
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

check('30 cited problems', TEST2_PROBLEMS.length === 30);
check('every problem cites a section', TEST2_PROBLEMS.every((p) => p.href.startsWith('https://complexanalysis.org/web/') && p.section && p.pin && p.scope && p.station && stationById(p.station)));
check('every topic cites a section', TEST2_TOPICS.every((t) => t.source && t.source.href.startsWith('https://complexanalysis.org/') && t.source.pin && t.scope && t.station));
check('4.3 and 4.4 stay likely', test2ProblemById('4.3.1').scope === 'likely' && test2ProblemById('4.3.5').scope === 'likely' && test2ProblemById('4.4.6').scope === 'likely' && test2ProblemById('4.4.3').scope === 'likely' && stationById('geometric').scope === 'likely');
check('3.3 stays possible', test2ProblemById('3.3.1').scope === 'possible' && test2ProblemById('3.3.5').scope === 'possible' && stationById('harmonic').scope === 'possible');
check('4.2.1 stays core', test2ProblemById('4.2.1').scope === 'core');
const coreGroups = TEST2_PROBLEMS.filter((p) => p.scope === 'core').map((p) => p.group).join('');
check('core index follows the map', TEST2_PROBLEMS[0].id === '4.1.1' && coreGroups === `${'A'.repeat(6)}${'B'.repeat(4)}${'C'.repeat(4)}${'D'.repeat(9)}`);
const filmByHomework = {
  '4.1.3': ['settle'],
  '4.1.13': ['settle'],
  '4.2.3': ['newton-walk'],
  '4.2.4': [],
  '4.2.5': ['orbit'],
  '4.3.1': [],
  '4.3.2': [],
};
check('homework set is ch4-oct26', HOMEWORK_SET === 'ch4-oct26' && HOMEWORK_IDS.join() === '4.1.3,4.1.13,4.2.3,4.2.4,4.2.5,4.3.1,4.3.2' && HOMEWORK_IDS.every((id) => {
  const p = test2ProblemById(id);
  const films = filmsFor(p.station).map((f) => f.id).join();
  return p && p.homework === HOMEWORK_SET && p.book == null && p.added == null && p.hint && p.station && films === filmByHomework[id].join();
}) && test2ProblemById('4.3.1').assigned === 'b');
const md431 = problemMarkdown(test2ProblemById('4.1.3'));
const md411 = problemMarkdown(test2ProblemById('4.1.1'));
const md424 = problemMarkdown(test2ProblemById('4.2.4'));
const md425 = problemMarkdown(test2ProblemById('4.2.5'));
const md431b = problemMarkdown(test2ProblemById('4.3.1'));
check('copy markdown keeps the statement and omits the answer key', TEST2_PROBLEMS.every((p) => {
  const md = problemMarkdown(p);
  const hintAt = md.indexOf('## Hint');
  const hint = md.slice(hintAt, md.indexOf('## Your solution'));
  return md.startsWith(`# ${p.pin}`)
    && md.includes(p.statement)
    && md.includes(p.href)
    && md.includes(`#${p.station}`)
    && md.includes('## Your solution')
    && md.includes('(paste your work here)')
    && md.includes('This export deliberately omits an answer key.')
    && !hint.includes(p.book || '___no_book___')
    && !hint.includes(p.added || '___no_added___');
}) && md431.includes('[A Sequence Has a Fate](#sequence)')
  && md431.includes('[The terms land, or they do not](#sequence)')
  && md431.includes('#index-4-1-3')
  && !md411.includes('(a) $0$')
  && md411.includes('Work it at #sequence. The book print stays behind Show on the card.')
  && md424.includes('[When c Is 0, a Disk](#disk)')
  && md424.includes('[Julia Sets: Square, then Slide](#julia)')
  && !md424.includes('Demo / film')
  && !md424.includes('dyadic')
  && md425.includes('[The orbit of 0: square, then slide](#zero)')
  && md425.includes('[The Crossing](#pg-cross)')
  && !md425.includes('\\{-2, 2, 2')
  && !md431b.includes('\\dfrac{3-i}{2}')
  && !problemMarkdown(test2ProblemById('4.2.3')).includes('One step is enough'));
check('Mandelbrot exercises sit on seeds', ['4.2.7', '4.2.8', '4.2.9', '4.2.10', '4.2.11', '4.2.12', '4.2.13', 'E4.2.16', 'E4.2.23'].every((id) => test2ProblemById(id).station === 'seeds'));
check('an added check is not stored as the book text', TEST2_PROBLEMS.every((p) => p.added == null || p.book !== p.added));
check('finder opens 4.2.4', searchItems('4.2.4', buildTest2SearchItems()).results[0].id === '4.2.4');
const groups = groupStations(stationsForMap('test2'), 'test2').map((g) => g.part).join('');
check('test 2 parts run A to D, then F, H, G, J', groups === 'ABCDFHGJ');
const path = test2LinkList();
check('next from the radius is the index', stationNeighbours(path, 'powerseries').next === 'index');
check('next from the index is the paper', stationNeighbours(path, 'index').next === 'paper');
check('Next from the paper is the twin', stationNeighbours(path, 'paper').next === 'pg-twin');
check('the eleven rooms run twin, bulbs, cascade, rays, pole, join, climb, fall, lean, warp, crossing', stationNeighbours(path, 'pg-twin').next === 'pg-bulbs' && stationNeighbours(path, 'pg-bulbs').next === 'pg-cascade' && stationNeighbours(path, 'pg-cascade').next === 'pg-rays' && stationNeighbours(path, 'pg-rays').next === 'pg-pole' && stationNeighbours(path, 'pg-pole').next === 'pg-join' && stationNeighbours(path, 'pg-join').next === 'pg-climb' && stationNeighbours(path, 'pg-climb').next === 'pg-fall' && stationNeighbours(path, 'pg-fall').next === 'pg-lean' && stationNeighbours(path, 'pg-lean').next === 'pg-warp' && stationNeighbours(path, 'pg-warp').next === 'pg-cross' && stationNeighbours(path, 'pg-cross').next == null);
check('the lean card is F3, and the cubic stays unnumbered', threadsOn(stationById('pg-lean'), 'test2').join() === 'F3' && threadsOn(stationById('pg-fall'), 'test2').join() === 'F3' && /Equation \(1\.43\)/.test(stationById('pg-lean').summary) && /does not number this cubic/.test(stationById('pg-lean').summary) && /does not number Newton/.test(stationById('pg-lean').summary));
check('the warp card wears no thread, and the distance stays unnumbered', threadsOn(stationById('pg-warp'), 'test2').join() === '' && /Figure 2\.22/.test(stationById('pg-warp').summary) && /Exercise 14/.test(stationById('pg-warp').summary) && /curvature is 4/.test(stationById('pg-warp').summary) && /No exercise numbers the chordal distance/.test(stationById('pg-warp').summary) && /does not wear a thread/.test(stationById('pg-warp').summary) && /Chapter 1/.test(stationById('pg-warp').summary));
check('the crossing follows the warp and wears F1 and F2', threadsOn(stationById('pg-cross'), 'test2').join() === 'F1,F2' && /Figure 4\.6, page 114/.test(stationById('pg-cross').summary) && /Theorem 4\.9, page 113/.test(stationById('pg-cross').summary) && /Example 4\.10, page 113/.test(stationById('pg-cross').summary) && /does not number this split/.test(stationById('pg-cross').summary));
const homeMap = readFileSync(new URL('../js/stations/home-test2.js', import.meta.url), 'utf8');
check('the map does not call the lean the fall’s question', homeMap.includes('leave that equal spacing') && homeMap.includes('At c = 1/2 the roots lean') && !homeMap.includes('asks the same question'));
check('section 3.3 is off Next', !path.some((s) => s.id === 'harmonic') && stationById('harmonic').order > stationById('paper').order);
check('the assembler is off Next', !path.some((s) => s.id === 'playground'));

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
check('the argument figure is Figure 1.15, not the product', citationText(ARG_SOURCE) === `${CH1}4` && ARG_SOURCE.url.endsWith('#fig_ch-01-15') && !ARG_SOURCE.url.includes('fig_ch-01-17'));
check('Arg z opens Definition 1.11', citationText(ARG_DEF_SOURCE) === `${CH1}4` && ARG_DEF_SOURCE.url.endsWith('#Arg_z'));
{
  const stored = { cx: 0, cy: 0, span: 2.6 };
  const phone = tipJuliaWindow(195, 326, [-2, 0], stored);
  const wide = tipJuliaWindow(640, 280, [-2, 0], stored);
  const cusp = tipJuliaWindow(195, 326, [0.25, 0], stored);
  const holds = (win, w, h) => {
    const aspect = w / h;
    const half = win.span * aspect * 0.5;
    return win.cx - half <= -2.18 && win.cx + half >= 2.18;
  };
  check('a phone Julia pane at the tip holds z from -2 to 2', holds(phone, 195, 326) && phone.span > 2.6);
  check('a wide Julia pane at the tip keeps span 2.6', wide.span === 2.6 && holds(wide, 640, 280));
  check('away from the tip the Julia span stays 2.6', cusp.span === 2.6);
  const curves = rayCurves();
  const third = curves.find((r) => r.label === '1/3');
  const two = curves.find((r) => r.label === '2/3');
  const half = curves.find((r) => r.label === '1/2');
  const end = (r) => r.samples[r.samples.length - 1];
  const prev = (r) => r.samples[r.samples.length - 2];
  check('angles 1/3 and 2/3 land together at c = -3/4', Math.abs(end(third)[0] + 0.75) < 1e-9 && end(third)[1] === 0 && Math.abs(end(two)[0] + 0.75) < 1e-9 && prev(third)[1] > 0 && prev(two)[1] < 0);
  check('angle 1/2 lands at the tip', end(half)[0] === -2 && end(half)[1] === 0);
  check('real rays stay on the axis and the pair keeps its angle', curves.every((r) => {
    if (!r.complex) return r.samples.every((p) => p[1] === 0);
    return r.samples.slice(0, -1).every((p) => {
      const got = external(p[0], p[1]);
      return got != null && Math.abs(got - r.angle) < 0.01;
    });
  }));
  check('period 16 is a cascade tick', REAL_MARKS.some((m) => m.birth === 16 && m.c === PERIOD16_BIRTH));
}
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
check('the same-move row carries Mandelbrot, the crossing, and the cardioid', THROUGHLINE.find((r) => r.id === 'R16').stops.map((s) => s.id).join() === 'sequence,zero,julia,mandelbrot,pg-cross,bulbs,newton');
check('the exercises sit after the cardioid', stationById('seeds').summary.includes('before this one') && !stationById('seeds').summary.includes('next stop'));
{
  const px = radiusInWorld(4, 800);
  const still = orbitUntil({ re: 0, im: 0 }, (z) => z, { R: px });
  check('four screen pixels are the disk, and a still orbit settles as period 1', px === ORBIT_R_PX * 4 / 800 && still.K === ORBIT_K_DEFAULT && still.R === px && still.reason === 'cluster' && still.period === 1 && still.disks.length === 1 && orbitSentence(still).startsWith('Settles. Period 1.'));
  const huge = orbitUntil({ re: 0, im: 0 }, (z) => z, { K: 80, R: px });
  check('K stops at 64', huge.K === ORBIT_K_MAX && huge.K === 64);
  const toolsSrc = readFileSync(new URL('../js/core/set-tools.js', import.meta.url), 'utf8');
  check('loadFormula does not take keepValues', !toolsSrc.includes('keepValues'));
  const familySrc = readFileSync(new URL('../js/stations/mandelbrot-family.js', import.meta.url), 'utf8');
  check('the Mandelbrot companion fills on a worker', familySrc.includes('worker: true') && familySrc.includes("kind: 'julia'"));
  const mandelSrc = readFileSync(new URL('../js/stations/mandelbrot.js', import.meta.url), 'utf8');
  const bulbsSrc = readFileSync(new URL('../js/stations/bulbs.js', import.meta.url), 'utf8');
  check('Figure 4.6, page 114, is the book picture of the set', mandelSrc.includes('Figure 4.6, page 114') && bulbsSrc.includes('Figure 4.6, page 114'));
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
  check('the period of the orbit of 0 is read off the cycle', p0.bounded && p0.period === 1 && pOut.bounded === false && pOut.period === 0 && p2.bounded && p2.period === 1 && p2.parabolic === true && pBulb.bounded && pBulb.period === 2);
  const quad = (c) => (z) => ({
    re: z.re * z.re - z.im * z.im + c.re,
    im: 2 * z.re * z.im + c.im,
  });
  const escapes = (z) => z.re * z.re + z.im * z.im > 4;
  const screenR = radiusInWorld(4, 800);
  const cycle2 = orbitUntil({ re: 0, im: 0 }, quad({ re: -1, im: 0 }), { K: 5, R: screenR, escapes });
  const apart = cycle2.disks.length === 2 ? Math.hypot(cycle2.disks[0].re - cycle2.disks[1].re, cycle2.disks[0].im - cycle2.disks[1].im) : 0;
  check('a period-2 orbit settles as two disks, not as Stays', cycle2.reason === 'cluster' && cycle2.period === 2 && apart > 0.5 && orbitSentence(cycle2).startsWith('Settles. Period 2.'));
  const fixed = orbitUntil({ re: 0, im: 0 }, quad({ re: -0.5, im: 0 }), { K: 5, R: screenR, escapes });
  check('an attracting fixed point settles as period 1', fixed.reason === 'cluster' && fixed.period === 1);
  const basilica = orbitUntil({ re: 0, im: 0 }, quad({ re: -0.75, im: 0 }), { K: 5, R: screenR, escapes });
  check('c = −0.75 is the parabolic root, period 1, not an attracting 2-cycle', basilica.reason === 'bulb2' && basilica.period === 1 && orbitSentence(basilica) === BULB2_SENTENCE);
  const dust = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.4, im: 0 }), { K: 5, R: screenR, escapes });
  check('outside the set the orbit leaves', dust.reason === 'escape' && orbitSentence(dust).startsWith('Leaves'));
  const zoomed = radiusInWorld(1e-6, 800);
  check('the disk shrinks in world units when the window shrinks', zoomed < screenR && zoomed > 0);
  const epoch = createRenderEpoch();
  const mainToken = epoch.next();
  const same = mainToken;
  check('one loop frame is one token', epoch.next() === mainToken + 1 && frameIsCurrent(same, same, same - 1) && !frameIsCurrent(same, same + 1, same - 1) && !frameIsCurrent(same, same, same));
  const toolsSrc2 = readFileSync(new URL('../js/core/set-tools.js', import.meta.url), 'utf8');
  const familySrc2 = readFileSync(new URL('../js/stations/mandelbrot-family.js', import.meta.url), 'utf8');
  const juliaSrc = readFileSync(new URL('../js/stations/julia.js', import.meta.url), 'utf8');
  check('the loop hands one token to the companion', toolsSrc2.includes('function emitFrame') && toolsSrc2.includes('onTick(tLoop, token)') && /function requestJulia\(draft, token\)[\s\S]*?request\(!!draft, token\)/.test(familySrc2) && familySrc2.includes('epoch'));
  const closeR = radiusInWorld(4, 320);
  const close = orbitUntil({ re: 0, im: 0 }, quad({ re: -0.751, im: 0 }), { K: 5, R: closeR, escapes });
  const closeSep = close.disks.length === 2 ? Math.hypot(close.disks[0].re - close.disks[1].re, close.disks[0].im - close.disks[1].im) : 99;
  const zoomUnits = close.disk ? 8 * close.disk.radius : 0;
  const zoomOrbit = orbitUntil({ re: 0, im: 0 }, quad({ re: -0.751, im: 0 }), { K: 5, R: radiusInWorld(zoomUnits, 320), escapes });
  const zoomSep = zoomOrbit.disks.length === 2 ? Math.hypot(zoomOrbit.disks[0].re - zoomOrbit.disks[1].re, zoomOrbit.disks[0].im - zoomOrbit.disks[1].im) : 0;
  check('an attracting period-2 cycle just inside the bulb overlaps on the screen and separates when the window shrinks', close.reason === 'cluster' && close.period === 2 && closeSep < 3 * closeR && orbitSentence(close).includes('those places overlap') && zoomOrbit.period === 2 && zoomSep / zoomUnits > closeSep / 4);
  check('Julia names the one step', juliaSrc.includes("legend: 'Step size'") && juliaSrc.includes('Drag spacing, loop, nudge, and zoom'));
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

{
  const quad = (c) => (z) => ({
    re: z.re * z.re - z.im * z.im + c.re,
    im: 2 * z.re * z.im + c.im,
  });
  const escapes = (z) => z.re * z.re + z.im * z.im > 4;
  const screenR = radiusInWorld(4, 800);
  const guard = { K: 5, escapes, quadratic: true, absDeriv: quadraticAbsDeriv };
  const rabbit = { re: -0.122561166877, im: 0.74486176662 };
  const atI = orbitUntil({ re: 0, im: 0 }, quad({ re: 0, im: 1 }), { ...guard, R: 1e-2 });
  const atIScreen = orbitUntil({ re: 0, im: 0 }, quad({ re: 0, im: 1 }), { ...guard, R: screenR });
  const atITiny = orbitUntil({ re: 0, im: 0 }, quad({ re: 0, im: 1 }), { ...guard, R: 1e-6 });
  check('c = i stays, the repelling cycle is not Settles',
    [atI, atIScreen, atITiny].every((r) => r.reason === 'closed' && r.period === 2 && r.multiplier > 5 && orbitSentence(r).startsWith('Stays. Period 2.')));
  const atMinus2 = orbitUntil({ re: 0, im: 0 }, quad({ re: -2, im: 0 }), { ...guard, R: screenR });
  const atMinus2Wide = orbitUntil({ re: 0, im: 0 }, quad({ re: -2, im: 0 }), { ...guard, R: 1 });
  check('c = −2 stays on the repelling fixed point',
    atMinus2.reason === 'closed' && atMinus2.period === 1 && atMinus2.multiplier === 4
    && atMinus2Wide.reason === 'closed' && orbitSentence(atMinus2).startsWith('Stays. Period 1.'));
  const dust = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.26, im: 0 }), { ...guard, R: 1e-2 });
  check('c = 0.26, the orbit of 0 leaves', dust.reason === 'escape' && dust.steps === 30 && orbitSentence(dust).startsWith('Leaves'));
  let gateLeft = 0;
  for (let i = 0; i < 24; i++) {
    const start = { re: 0.42 + (i % 6) * 0.03, im: ((i % 5) - 2) * 0.04 };
    const row = orbitUntil(start, quad({ re: 0.26, im: 0 }), { ...guard, R: 1e-2 });
    if (row.reason === 'escape') gateLeft += 1;
  }
  check('c = 0.26 near z = 1/2 leaves inside the screen disk', gateLeft === 24);
  const bare = orbitUntil({ re: 3, im: 0 }, quad({ re: 0.26, im: 0 }), { K: 5, R: 1e-2, quadratic: true });
  check('a quadratic walk without its own escape test still leaves at |z| > 2', bare.reason === 'escape' && bare.steps === 1);
  const cusp = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.26, im: 0 }), { ...guard, R: screenR });
  const near = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.251, im: 0 }), { ...guard, R: screenR, maxPoints: 2000 });
  check('just outside the cusp, 1e-2 and 1e-3 still leave', cusp.reason === 'escape' && near.reason === 'escape' && near.steps === 97);
  const slow = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.2501, im: 0 }), { ...guard, R: 1e-2 });
  const slowWide = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.2501, im: 0 }), { ...guard, R: screenR });
  const slower = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.25001, im: 0 }), { ...guard, R: screenR });
  const bareSlow = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.2501, im: 0 }), { K: 5, R: screenR, escapes, maxPoints: 2000 });
  check('c = 1/4 + 1e-4 leaves once the near-1 window keeps walking',
    slow.reason === 'escape' && slow.steps === 312 && orbitSentence(slow).startsWith('Leaves')
    && slowWide.reason === 'escape' && slowWide.steps === 312);
  check('c = 1/4 + 1e-5 leaves on the same walk', slower.reason === 'escape' && slower.steps === 991 && orbitSentence(slower).startsWith('Leaves'));
  const outside8 = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.25 + 1e-8, im: 0 }), { ...guard, R: screenR });
  check('c = 1/4 + 1e-8 leaves on the real climb, and does not claim Settles',
    outside8.reason === 'escape' && outside8.steps === 31414 && orbitSentence(outside8).startsWith('Leaves'));
  const parabolic = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.25, im: 0 }), { ...guard, R: screenR });
  const outside9 = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.25 + 1e-9, im: 0 }), { ...guard, R: screenR });
  const outside9Page = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.25 + 1e-9, im: 0 }), { ...guard, R: 0.07 });
  check('c = 1/4 is the cusp. The closed disk is not Settles',
    parabolic.reason === 'parabolic' && parabolic.period === 1 && parabolic.multiplier === 1
    && orbitSentence(parabolic) === PARABOLIC_SENTENCE
    && PARABOLIC_SENTENCE.includes('not Settles') && PARABOLIC_SENTENCE.includes('not Leaves'));
  check('c = 1/4 + 1e-9 is Leaves, the same sentence on both disks',
    outside9.reason === 'cusp' && orbitSentence(outside9) === CUSP_OUTSIDE_SENTENCE
    && outside9Page.reason === 'cusp' && orbitSentence(outside9Page) === CUSP_OUTSIDE_SENTENCE
    && CUSP_OUTSIDE_SENTENCE.startsWith('Leaves. Exercise 8. A real c bigger than 1/4 is not in the set.'));
  const outsideStart = orbitUntil({ re: 0.2, im: 0 }, quad({ re: 0.25 + 1e-9, im: 0 }), { ...guard, R: screenR });
  const parabolicStart = orbitUntil({ re: 0.4, im: 0 }, quad({ re: 0.25, im: 0 }), { ...guard, R: screenR });
  check('a real start past the cusp is Leaves, the same sentence',
    outsideStart.reason === 'cusp' && orbitSentence(outsideStart) === CUSP_OUTSIDE_SENTENCE);
  check('a real start at the parabolic point is the cusp, not Settles',
    parabolicStart.reason === 'parabolic' && parabolicStart.period === 1 && parabolicStart.multiplier === 1
    && orbitSentence(parabolicStart) === PARABOLIC_SENTENCE);
  const probe9 = criticalPeriod({ re: 0.25 + 1e-9, im: 0 }, { maxIter: 4096, periodMax: 96 });
  const probeQuarter = criticalPeriod({ re: 0.25, im: 0 }, { maxIter: 4096, periodMax: 96 });
  check('the long critical probe agrees: past 1/4 is period 0, and 1/4 is period 1',
    probe9.bounded === false && probe9.period === 0 && probeQuarter.bounded === true && probeQuarter.period === 1);
  check('the real-climb lookahead is longer than the basilica continuation', CUSP_EXTRA === 40000 && CUSP_EXTRA > PARABOLIC_EXTRA);
  const south = liftToSphere(0, 0);
  const back = planeFromSphere(liftToSphere(0.4, -0.2).x, liftToSphere(0.4, -0.2).y, liftToSphere(0.4, -0.2).z);
  const leftLine = orbitOnSphere([{ re: 0, im: 0 }, { re: 1.2, im: 0.2 }, { re: 3, im: 0 }], true);
  const chordInk = { navy: [13, 18, 28], cart: [98, 173, 242], polar: [255, 157, 92], input: [63, 208, 160], output: [228, 143, 210] };
  const chordComp = {
    map: { kind: 'julia', c: [-0.75, 0], d: 2 },
    view: { kind: 'chordal', window: { cx: 0, cy: 0, span: 3.2 } },
    colour: 'smooth',
  };
  const chordGrid = bakeChordal(chordComp, 24, 32, chordInk, 1.2);
  const chordAt = (x, y) => y * chordGrid.w + x;
  const chordRim = poleDistance(chordComp.map.c) * 1.35;
  const chordCorner = (x, y) => {
    const i = chordAt(x, y);
    return chordGrid.pole[i] === 1
      && Math.abs(chordGrid.G[i] - chordRim) < 1e-5
      && chordGrid.rgb[i * 3] === 255 && chordGrid.rgb[i * 3 + 1] === 157 && chordGrid.rgb[i * 3 + 2] === 92;
  };
  check('the chordal corners are one finite point, and the valley is lower',
    chordCorner(0, 0) && chordCorner(23, 0) && chordCorner(0, 23) && chordCorner(23, 23)
    && chordGrid.pole[chordAt(12, 12)] === 0
    && chordGrid.G[chordAt(12, 12)] < chordGrid.G[0] - 0.05);
  check('the playground sphere puts infinity at the north pole',
    south.y === -1 && south.infinite === false
    && Math.abs(back.re - 0.4) < 1e-12 && Math.abs(back.im + 0.2) < 1e-12
    && planeFromSphere(0, 1, 0) === null
    && leftLine.length >= 2 && leftLine[leftLine.length - 1].pole === true && leftLine[leftLine.length - 1].y > 1);
  check('without |f′| the cusp disk still closes, which is the assembler walk',
    bareSlow.reason === 'cluster' && bareSlow.multiplier == null && bareSlow.steps === 68);
  check('the continuation is the near-1 window, long enough for 1e-7', PARABOLIC_LAM === 0.93 && PARABOLIC_EXTRA === 12000);
  const pageR = 0.07;
  const slowPage = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.25001, im: 0 }), { ...guard, R: pageR });
  const basilicaPage = orbitUntil({ re: 0, im: 0 }, quad({ re: -0.75, im: 0 }), { ...guard, R: pageR });
  check('on the station disk, c = 1/4 + 1e-5 still leaves', slowPage.reason === 'escape' && slowPage.steps === 991 && orbitSentence(slowPage).startsWith('Leaves'));
  check('on the station disk, c = −0.75 is parabolic period 1', basilicaPage.reason === 'bulb2' && basilicaPage.period === 1 && orbitSentence(basilicaPage) === BULB2_SENTENCE);
  const insideCusp = orbitUntil({ re: 0, im: 0 }, quad({ re: 0.2499, im: 0 }), { ...guard, R: screenR });
  check('just inside the cusp still settles', insideCusp.reason === 'cluster' && insideCusp.period === 1 && insideCusp.multiplier < 1 && orbitSentence(insideCusp).startsWith('Settles. Period 1.'));
  const basilicaG = orbitUntil({ re: 0, im: 0 }, quad({ re: -0.75, im: 0 }), { ...guard, R: screenR });
  const super2 = orbitUntil({ re: 0, im: 0 }, quad({ re: -1, im: 0 }), { ...guard, R: screenR });
  const rabbitG = orbitUntil({ re: 0, im: 0 }, quad(rabbit), { ...guard, R: screenR });
  check('c = −0.75 is parabolic period 1', basilicaG.reason === 'bulb2' && basilicaG.period === 1 && orbitSentence(basilicaG) === BULB2_SENTENCE);
  const repellerRoot = orbitUntil({ re: 1.5, im: 0 }, quad({ re: -0.75, im: 0 }), { ...guard, R: screenR });
  check('the repeller 3/2 is not the parabolic root', repellerRoot.reason !== 'bulb2' && repellerRoot.period === 1);
  check('c = −1 still settles, and the critical value keeps the product at 0', super2.reason === 'cluster' && super2.period === 2 && super2.multiplier === 0);
  check('the rabbit still settles as period 3', rabbitG.reason === 'cluster' && rabbitG.period === 3 && rabbitG.multiplier < 1);
  const S3 = Math.sqrt(3);
  const unity = [{ re: 1, im: 0 }, { re: -0.5, im: S3 / 2 }, { re: -0.5, im: -S3 / 2 }];
  const newtonStep = (z) => {
    let sx = 0;
    let sy = 0;
    for (const r of unity) {
      const dx = z.re - r.re;
      const dy = z.im - r.im;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1e-4) return { re: z.re, im: z.im };
      sx += dx / d2;
      sy += -dy / d2;
    }
    const s2 = sx * sx + sy * sy;
    return { re: z.re - sx / s2, im: z.im + sy / s2 };
  };
  const rooted = orbitUntil({ re: 0.8, im: 0.1 }, newtonStep, {
    K: 5, R: screenR,
    absDeriv: (z) => newtonAbsDeriv(z, unity),
    polyAbs: (z) => newtonPolyAbs(z, unity),
    polyTol: NEWTON_ROOT_TOL,
  });
  check('a Newton root still settles, and |p(z)| counts as small', rooted.reason === 'cluster' && rooted.period === 1 && rooted.root === true && rooted.multiplier === 0);
  const coeffs = [2, -2, 0, 1];
  const evalPoly = (z) => {
    let px = 0;
    let py = 0;
    for (let k = coeffs.length - 1; k >= 0; k--) {
      const nx = px * z.re - py * z.im + coeffs[k];
      py = px * z.im + py * z.re;
      px = nx;
    }
    return { re: px, im: py };
  };
  const evalDeriv = (z) => {
    let px = 0;
    let py = 0;
    for (let k = coeffs.length - 1; k >= 1; k--) {
      const nx = px * z.re - py * z.im + k * coeffs[k];
      py = px * z.im + py * z.re;
      px = nx;
    }
    return { re: px, im: py };
  };
  const cycleStep = (z) => {
    const p = evalPoly(z);
    const d = evalDeriv(z);
    const den = d.re * d.re + d.im * d.im;
    return { re: z.re - (p.re * d.re + p.im * d.im) / den, im: z.im - (p.im * d.re - p.re * d.im) / den };
  };
  const absN = (z) => {
    const p = evalPoly(z);
    const d = evalDeriv(z);
    const pp = { re: 6 * z.re, im: 6 * z.im };
    const numRe = p.re * pp.re - p.im * pp.im;
    const numIm = p.re * pp.im + p.im * pp.re;
    const denRe = d.re * d.re - d.im * d.im;
    const denIm = 2 * d.re * d.im;
    const denM = denRe * denRe + denIm * denIm;
    return Math.hypot((numRe * denRe + numIm * denIm) / denM, (numIm * denRe - numRe * denIm) / denM);
  };
  const cyc = orbitUntil({ re: 0, im: 0 }, cycleStep, {
    K: 5, R: screenR, absDeriv: absN, polyAbs: (z) => Math.hypot(evalPoly(z).re, evalPoly(z).im), polyTol: NEWTON_ROOT_TOL, maxPoints: 40,
  });
  check('an attracting Newton cycle settles and is not called a root', cyc.reason === 'cluster' && cyc.period === 2 && cyc.root === false && cyc.multiplier < 1 && orbitSentence(cyc).includes('not a root'));
  const mandelSrc2 = readFileSync(new URL('../js/stations/mandelbrot.js', import.meta.url), 'utf8');
  const bulbsSrc2 = readFileSync(new URL('../js/stations/bulbs.js', import.meta.url), 'utf8');
  const newtonSrc = readFileSync(new URL('../js/stations/newton.js', import.meta.url), 'utf8');
  const juliaGuard = readFileSync(new URL('../js/stations/julia.js', import.meta.url), 'utf8');
  const familyGuard = readFileSync(new URL('../js/stations/mandelbrot-family.js', import.meta.url), 'utf8');
  check('Julia and the set of c pass the quadratic multiplier', juliaGuard.includes('quadratic: true') && juliaGuard.includes('quadraticAbsDeriv') && familyGuard.includes('quadratic: true') && familyGuard.includes('absDeriv: quadraticAbsDeriv'));
  const bareI = orbitUntil({ re: 0, im: 0 }, quad({ re: 0, im: 1 }), { K: 5, R: screenR, escapes });
  const pageI = applyDisplayedGuard(bareI, { absDeriv: quadraticAbsDeriv });
  check('the page guard turns the repelling period 2 into Stays, same step',
    bareI.reason === 'cluster' && pageI.reason === 'closed' && pageI.period === 2 && pageI.steps === bareI.steps
    && pageI.multiplier > 5 && orbitSentence(pageI).startsWith('Stays. Period 2.'));
  const bareM = orbitUntil({ re: 0, im: 0 }, quad({ re: -2, im: 0 }), { K: 5, R: screenR, escapes });
  const pageM = applyDisplayedGuard(bareM, { absDeriv: quadraticAbsDeriv });
  check('the page guard turns the repelling fixed point into Stays',
    bareM.reason === 'cluster' && pageM.reason === 'closed' && pageM.period === 1 && pageM.multiplier === 4
    && orbitSentence(pageM).startsWith('Stays. Period 1.'));
  const bareB = orbitUntil({ re: 0, im: 0 }, quad({ re: -0.75, im: 0 }), { K: 5, R: screenR, escapes });
  const pageB = applyDisplayedGuard(bareB, { absDeriv: quadraticAbsDeriv });
  check('the page guard leaves the parabolic root alone', pageB.reason === 'bulb2' && pageB.period === 1 && pageB === bareB && orbitSentence(pageB) === BULB2_SENTENCE);
  const pgGuard = readFileSync(new URL('../js/playground/app.js', import.meta.url), 'utf8');
  check('the playground page applies that guard and does not pass it into the assembler',
    pgGuard.includes('applyDisplayedGuard') && pgGuard.includes('guardOrbit')
    && pgGuard.includes('The assembler file is not asked') && pgGuard.includes('absDeriv:')
    && !/from '\.\/playground\.js'[^;]*\bsettle\b/.test(pgGuard));
  check('an escaped critical orbit is dust even when the short probe has not left',
    familyGuard.includes('criticalStart') && familyGuard.includes("orbit.reason === 'escape'") && familyGuard.includes("orbit.reason === 'cusp'") && familyGuard.includes('The orbit of 0 left'));
  const pgApp = readFileSync(new URL('../js/playground/app.js', import.meta.url), 'utf8');
  const sceneSrc = readFileSync(new URL('../js/playground/scene3d.js', import.meta.url), 'utf8');
  check('Figure 4.6 on the playground opens the shared figure anchor',
    pgApp.includes('MANDELBROT_FIGURE_SOURCE') && pgApp.includes('MANDELBROT_FIGURE_SOURCE.url') && pgApp.includes('fig_ch-04-cp-6') === false
    && readFileSync(new URL('../js/data/textbook.js', import.meta.url), 'utf8').includes("export const MANDELBROT_FIGURE_SOURCE"));
  check('a cusp leave ends on the sphere at the north pole, and the badge calls it a leave',
    sceneSrc.includes("reason === 'cusp'") && pgApp.includes("reason === 'cusp'"));
  check('four decimals do not rename 1/4 + 1e-5 as the cusp',
    familyGuard.includes("short === '0.25'") && familyGuard.includes("short === '-0.75'") && familyGuard.includes('Number(short) !== v'));
  const nucleusRe = -0.7468707761049912;
  const nucleusIm = 0.13335830940823915;
  check('a deep zoom spells the stored nucleus',
    addressPlaces(3.5e-8, 4) === 17 && centrePlaces(3.5e-8) === 17
    && formatZoomScalar(nucleusRe, 17) === String(nucleusRe)
    && formatZoomScalar(nucleusIm, 17) === String(nucleusIm));
  const nucleus = { re: nucleusRe, im: nucleusIm };
  const nucleusShort = criticalPeriod(nucleus);
  const nucleusLong = criticalPeriod(nucleus, { maxIter: 4096, periodMax: 96 });
  const nucleusDisk = orbitUntil({ re: 0, im: 0 }, quad(nucleus), { ...guard, R: 0.07, maxPoints: 800 });
  const nucleusSaid = orbitSentence(nucleusDisk);
  check('the period-70 nucleus is not a cycle of length 32, and the fat disk is only a return',
    nucleusShort.bounded === true && nucleusShort.period == null
    && nucleusLong.bounded === true && nucleusLong.period === 70
    && nucleusDisk.reason === 'cap' && nucleusDisk.period === 26
    && nucleusSaid.includes('return of 26') && nucleusSaid.includes('not the attracting period') && nucleusSaid.includes(String(ORBIT_PERIOD_MAX)));
  const longProbe = { maxIter: 4096, periodMax: 96 };
  const samePeriod = [
    { re: 0, im: 0 }, { re: -0.5, im: 0 }, { re: 0.2, im: 0 }, { re: 0.25, im: 0 },
    { re: -0.75, im: 0 }, { re: -1, im: 0 }, rabbit, { re: 0.4, im: 0 },
  ].every((c) => criticalPeriod(c).period === criticalPeriod(c, longProbe).period);
  check('the longer critical probe keeps the ordinary presets', samePeriod);
  check('the companion names the screen return and runs the longer probe',
    familyGuard.includes('CRITICAL_PROBE') && familyGuard.includes('periodMax: 96')
    && familyGuard.includes('is not the attracting period') && familyGuard.includes('ORBIT_PERIOD_MAX'));
  check('the Leaving caption matches the film', mandelSrc2.includes('dust once that orbit leaves'));
  check('a wide window keeps the short c and the 8-place centre',
    addressPlaces(3.2, 4) === 4 && centrePlaces(3.2) === 8 && formatZoomScalar(-0.5, 8) === '-0.5');
  check('Newton passes |N′| and |p(z)|', newtonSrc.includes('newtonAbsDeriv') && newtonSrc.includes('newtonPolyAbs') && newtonSrc.includes('polyTol: NEWTON_ROOT_TOL'));
  check('the rendered films are wired to the two stops', mandelSrc2.includes('media/films/leaving-1280x720.mp4') && mandelSrc2.includes('media/films/leaving-720x1280.mp4') && mandelSrc2.includes('media/films/minibrot-1280x720.mp4') && mandelSrc2.includes('media/films/minibrot-720x1280.mp4') && mandelSrc2.includes('Deep zoom to a minibrot') && bulbsSrc2.includes('media/films/cardioid-1280x720.mp4') && bulbsSrc2.includes('media/films/cardioid-720x1280.mp4') && !bulbsSrc2.includes('minibrot'));
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
