// Node checks for the Test 2 map split and the Julia / Newton arithmetic.
// Run: node tools/fractal-smoke.mjs

import { stationsForMap, stationForTopic, stationById, threadsOn, stationPart, STATIONS } from '../js/registry.js';
import { stationNeighbours } from '../js/stations/problems.js';
import { parseRoute, groupStations, mapForcedByRoute } from '../js/app.js';
import { fillJulia, fillNewton, juliaWalk, newtonWalk, monicCoeffs, effectiveEscape, samplePath } from '../js/core/fractal.js';

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
check('test 2 is home, julia, newton', t2.length === 3 && t2.includes('home') && t2.includes('julia') && t2.includes('newton') && !t2.includes('addresses'));
check('topic T1.1 still opens addresses', stationForTopic('T1.1').id === 'addresses');
check('topic J1 opens julia', stationForTopic('J1').id === 'julia');
check('topic N2 opens newton', stationForTopic('N2').id === 'newton');
check('route #julia', parseRoute('#julia').station === 'julia');
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
check('test 2 home thread is F1', threadsOn(stationById('home'), 'test2').join() === 'F1');
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

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('all checks passed');
