// js/core/lesson.js
// The graded blanks for the Example 4.9 lesson, and the finite fate test a custom f(z) is drawn with.
//
// Pure. The only import is the formula parser. Nothing here calls eval or builds a function from text.
// A blank is graded by compiling the student's typing with that parser, or by matching one of the
// course's three fate words. A wrong answer returns a nudge that does not contain the answer.

import { compile } from './parse.js';

export const FATE_STEPS = 32;
export const ESCAPE_R = 8;
export const SETTLE_DIAM = 1e-2;
export const VALUE_EPS = 1e-6;

export const INSIDE = Object.freeze({ re: 0.5, im: 0 });
export const OUTSIDE = Object.freeze({ re: 1.5, im: 0 });
export const WALL = Object.freeze({ re: -0.5, im: Math.sqrt(3) / 2 });

export const SEEDS = Object.freeze({
  inside: INSIDE,
  outside: OUTSIDE,
  wall: WALL,
});

const FATE_WORD = Object.freeze({
  settles: 'settles',
  settle: 'settles',
  settled: 'settles',
  converges: 'settles',
  converge: 'settles',
  stays: 'stays',
  stay: 'stays',
  cycles: 'stays',
  cycle: 'stays',
  loops: 'stays',
  loop: 'stays',
  leaves: 'leaves',
  leave: 'leaves',
  left: 'leaves',
  diverges: 'leaves',
  diverge: 'leaves',
  escapes: 'leaves',
  escape: 'leaves',
});

const RELATION = Object.freeze({
  '<': '<',
  'less': '<',
  'smaller': '<',
  'shorter': '<',
  'less than': '<',
  'smaller than': '<',
  'shorter than': '<',
  '>': '>',
  'greater': '>',
  'bigger': '>',
  'longer': '>',
  'greater than': '>',
  'bigger than': '>',
  'longer than': '>',
  '=': '=',
  '==': '=',
  'equal': '=',
  'equals': '=',
  'same': '=',
  '<=': '<=',
  '≤': '<=',
  'less or equal': '<=',
  '>=': '>=',
  '≥': '>=',
  'greater or equal': '>=',
});

function partText(t) {
  return Object.freeze({ t });
}
function partTex(tex) {
  return Object.freeze({ tex });
}

export const DISK_STEPS = Object.freeze([
  Object.freeze({
    id: 'image',
    seed: 'inside',
    reveal: 'dot',
    title: 'Square one point',
    observe: 'Type the landing. The picture waits.',
    blankLabel: 'The landing of 1/2',
    canonical: '1/4',
    prompt: Object.freeze([
      partText('The green point is '),
      partTex('\\tfrac{1}{2}'),
      partText('. Its square lands at'),
    ]),
    after: Object.freeze([
      partText('Yes. The landing is '),
      partTex('\\tfrac{1}{4}'),
      partText(', closer to 0.'),
    ]),
    hint: 'Multiply 1/2 by 1/2. The picture stays put until the blank is that product.',
    claim: 'The square of 1/2 is 1/4, closer to 0.',
  }),
  Object.freeze({
    id: 'compare',
    seed: 'inside',
    reveal: 'dot',
    title: 'Which length is shorter?',
    observe: 'Compare the purple landing with the green start.',
    blankLabel: 'How |1/4| compares with |1/2|',
    canonical: '<',
    prompt: Object.freeze([
      partText('The landing’s length is '),
      partTex('\\left|\\tfrac{1}{4}\\right|'),
      partText(' '),
    ]),
    tail: Object.freeze([
      partText(' '),
      partTex('\\left|\\tfrac{1}{2}\\right|'),
      partText('.'),
    ]),
    after: Object.freeze([
      partText('Yes. '),
      partTex('\\tfrac{1}{4}'),
      partText(' is shorter than '),
      partTex('\\tfrac{1}{2}'),
      partText(', so one square steps inward.'),
    ]),
    hint: 'The purple dot is closer to 0 than the green dot. The blank is <, >, or =.',
    claim: 'One square of a point inside the circle steps inward.',
  }),
  Object.freeze({
    id: 'settles',
    seed: 'inside',
    reveal: 'orbit',
    title: 'Name the long list',
    observe: 'Keep squaring. Name what the list does.',
    blankLabel: 'Fate of 1/2',
    canonical: 'settles',
    prompt: Object.freeze([
      partText('Keep squaring '),
      partTex('\\tfrac{1}{2}'),
      partText('. The list '),
    ]),
    after: Object.freeze([
      partText('Yes. It settles at 0. Inside the unit circle the moduli are '),
      partTex('|z|'),
      partText(' raised to 2, 4, 8, ….'),
    ]),
    hint: 'The landings get shorter and walk into one point. The three words are settles, stays, and leaves.',
    claim: 'The start 1/2 settles at 0.',
  }),
  Object.freeze({
    id: 'leaves',
    seed: 'outside',
    reveal: 'orbit',
    title: 'Outside the circle',
    observe: 'The start moved to 3/2. Name the fate.',
    blankLabel: 'Fate of 3/2',
    canonical: 'leaves',
    prompt: Object.freeze([
      partText('The green point is now '),
      partTex('\\tfrac{3}{2}'),
      partText('. Squaring it, the list '),
    ]),
    after: Object.freeze([
      partText('Yes. '),
      partTex('\\tfrac{3}{2}'),
      partText(' leaves. Outside the unit circle the moduli grow, so the orbit runs off every disk.'),
    ]),
    hint: 'The second landing is already past the window. Settles, stays, or leaves.',
    claim: 'The start 3/2 leaves.',
  }),
  Object.freeze({
    id: 'stays',
    seed: 'wall',
    reveal: 'orbit',
    title: 'On the circle',
    observe: 'This start is a non-real cube root of 1. Name the fate.',
    blankLabel: 'Fate of the cube root',
    canonical: 'stays',
    prompt: Object.freeze([
      partText('This point is a non-real cube root of 1, on the unit circle. Squaring swaps it with the other one. The list '),
    ]),
    after: Object.freeze([
      partText('Yes. It stays. The two non-real cube roots swap, and the list does not sit down. On the same circle, −1 squares to 1 and settles, so the circle is not one fate.'),
    ]),
    hint: 'A loop that never sits at one point stays. It does not leave, and it does not settle.',
    claim: 'This start stays, and it does not settle.',
  }),
  Object.freeze({
    id: 'closed',
    seed: 'wall',
    reveal: 'disk',
    title: 'Ink the disk',
    observe: 'The three fates are named. Say which disk they fill.',
    blankLabel: 'Open or closed',
    canonical: 'closed',
    prompt: Object.freeze([
      partText('For '),
      partTex('z^2'),
      partText(', the starts that stay bounded are the '),
    ]),
    tail: Object.freeze([
      partText(' unit disk.'),
    ]),
    after: Object.freeze([
      partText('Yes. The closed unit disk. −1 is on the boundary and its orbit stays bounded, so an open disk is too small. The Julia set is the unit circle. Example 4.9, page 113.'),
    ]),
    hint: '−1 is on the circle. Its square is 1, and 1 stays at 1. An open disk would leave −1 out.',
    claim: 'The bounded starts are the closed unit disk.',
  }),
]);

export function stepById(id) {
  return DISK_STEPS.find((s) => s.id === id) || null;
}

export function bookSquare(z) {
  const re = Number(z.re);
  const im = Number(z.im);
  return { re: re * re - im * im, im: 2 * re * im };
}

function finitePoint(w) {
  return !!w && Number.isFinite(w.re) && Number.isFinite(w.im);
}

export function walk(f, z0, steps = FATE_STEPS) {
  const zRe = Number(z0.re);
  const zIm = Number(z0.im);
  const points = [{ re: zRe, im: zIm }];
  if (!Number.isFinite(zRe) || !Number.isFinite(zIm)) return { points, fate: 'leaves' };
  let z = points[0];
  const n = steps | 0;
  for (let i = 0; i < n; i++) {
    let w;
    try {
      w = f(z);
    } catch {
      return { points, fate: 'leaves' };
    }
    if (!finitePoint(w)) return { points, fate: 'leaves' };
    z = { re: w.re, im: w.im };
    points.push(z);
    if (Math.hypot(z.re, z.im) > ESCAPE_R) return { points, fate: 'leaves' };
  }
  return { points, fate: tailFate(points) };
}

function tailFate(points) {
  const tail = points.slice(-8);
  let diam = 0;
  for (let i = 0; i < tail.length; i++) {
    for (let j = i + 1; j < tail.length; j++) {
      diam = Math.max(diam, Math.hypot(tail[i].re - tail[j].re, tail[i].im - tail[j].im));
    }
  }
  return diam < SETTLE_DIAM ? 'settles' : 'stays';
}

const SQUARE_SAMPLES = Object.freeze([
  INSIDE,
  OUTSIDE,
  WALL,
  Object.freeze({ re: 0, im: 0 }),
  Object.freeze({ re: 1, im: 0 }),
  Object.freeze({ re: 0, im: 1 }),
  Object.freeze({ re: -1, im: 0 }),
  Object.freeze({ re: -0.7, im: 0.2 }),
  Object.freeze({ re: 0.3, im: -0.4 }),
]);

export function sameAsSquare(f) {
  if (typeof f !== 'function') return false;
  for (const z of SQUARE_SAMPLES) {
    let w;
    try {
      w = f(z);
    } catch {
      return false;
    }
    const s = bookSquare(z);
    if (!finitePoint(w) || Math.hypot(w.re - s.re, w.im - s.im) > VALUE_EPS) return false;
  }
  return true;
}

export function compileRule(src) {
  try {
    const compiled = compile(src);
    return {
      ok: true,
      f: compiled.f,
      tex: compiled.tex,
      src: compiled.src,
      same: sameAsSquare(compiled.f),
    };
  } catch (e) {
    const message = e && e.message ? String(e.message) : 'Type a formula in z.';
    return { ok: false, message };
  }
}

export function clipForDraw(points, maxR = 2.2) {
  const out = [];
  for (const p of points) {
    out.push(p);
    if (Math.hypot(p.re, p.im) > maxR) break;
  }
  return out;
}

/** The orbit the picture draws: clipped to the window, and short enough to step through. */
export function picturePoints(points, cap = 8) {
  return clipForDraw(points).slice(0, cap);
}

function fail(nudge) {
  return { ok: false, nudge };
}

function pass(step) {
  return { ok: true, nudge: '', reveal: step.after, claim: step.claim };
}

function tokens(typed) {
  return String(typed || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hasNegation(words) {
  return words.includes('not') || words.includes('never') || words.includes('dont') || words.includes('doesnt');
}

export function parseRelation(typed) {
  const s = String(typed || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return RELATION[s] || null;
}

export function parseFate(typed) {
  const words = tokens(typed);
  if (hasNegation(words)) return null;
  for (const w of words) if (FATE_WORD[w]) return FATE_WORD[w];
  return null;
}

function gradeImage(typed) {
  const step = stepById('image');
  const t = String(typed || '').trim();
  if (!t) return fail('Type the landing.');
  let compiled;
  try {
    compiled = compile(t);
  } catch (e) {
    return fail(e && e.message ? e.message : 'That is not a number I can read.');
  }
  if (compiled.uses.has('z') || compiled.uses.has('x') || compiled.uses.has('y')) {
    return fail('Write the landing as a number. The rule z^2 is already the picture’s rule.');
  }
  let w;
  try {
    w = compiled.f({ re: 0, im: 0 });
  } catch {
    return fail('That did not come out as a number.');
  }
  if (!finitePoint(w)) return fail('That did not come out as a number.');
  if (Math.hypot(w.re - 0.25, w.im) <= VALUE_EPS) return pass(step);
  if (Math.hypot(w.re - 0.5, w.im) <= VALUE_EPS) return fail('That is the green point, not its square.');
  if (Math.hypot(w.re, w.im) > 0.5 + VALUE_EPS) return fail('Squaring a point inside the circle moves it closer to 0, not farther.');
  return fail('Multiply 1/2 by 1/2.');
}

function gradeCompare(typed) {
  const step = stepById('compare');
  const rel = parseRelation(typed);
  if (!rel) return fail('Type <, >, or =.');
  if (rel === '<') return pass(step);
  if (rel === '=' || rel === '<=') return fail('The landing is shorter than the start, and the two lengths are not the same.');
  return fail('The purple landing is closer to 0 than the green point.');
}

function gradeFate(typed, want) {
  const step = stepById(want);
  const words = tokens(typed);
  if (!String(typed || '').trim()) return fail('Type settles, stays, or leaves.');
  if (hasNegation(words)) return fail('Use one word: settles, stays, or leaves.');
  const got = parseFate(typed);
  if (!got) return fail('Use one word: settles, stays, or leaves.');
  if (got === want) return pass(step);
  const nudge = {
    'settles|leaves': 'The landings get shorter. A list that walks into 0 does not leave.',
    'settles|stays': 'The landings walk into one point. A loop that never sits down is a different word.',
    'leaves|settles': 'The second landing is already past the window. The list does not sit down at 0.',
    'leaves|stays': 'The moduli are growing. A loop would keep the same length.',
    'stays|settles': 'The two cube roots swap. The list does not sit down at one point.',
    'stays|leaves': 'Both landings are on the unit circle. The list does not run off.',
  }[want + '|' + got];
  return fail(nudge || 'That word is one of the three, and it is not this start.');
}

function gradeClosed(typed) {
  const step = stepById('closed');
  const words = tokens(typed);
  if (!words.length) return fail('Type open or closed.');
  if (hasNegation(words)) return fail('Say whether the disk is open or closed.');
  const open = words.includes('open');
  const closed = words.includes('closed');
  if (closed && !open) return pass(step);
  if (open && !closed) return fail('−1 is on the circle, and squaring sends it to 1, which stays. An open disk leaves −1 out.');
  return fail('The set is a unit disk. The blank is open or closed.');
}

const GRADERS = Object.freeze({
  image: gradeImage,
  compare: gradeCompare,
  settles: (typed) => gradeFate(typed, 'settles'),
  leaves: (typed) => gradeFate(typed, 'leaves'),
  stays: (typed) => gradeFate(typed, 'stays'),
  closed: gradeClosed,
});

/** Grade one blank of the disk lesson. The book's rule is z^2. The custom rule is drawn, not graded. */
export function grade(stepId, typed) {
  const g = GRADERS[stepId];
  if (!g) return fail('That step is not on this lesson.');
  return g(typed);
}

export function plainParts(parts) {
  return (parts || []).map((p) => (p.tex ? p.tex : p.t)).join('');
}
