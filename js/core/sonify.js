// js/core/sonify.js
// The ear for one point. Pure: no DOM, no AudioContext, no timers.
//
// One complex value w = f(z) becomes one voice. The same two numbers domain colouring
// already uses, plus the local stretch |f'(z)| and the distance to a known zero or pole.
//
//   pitch class  = Arg w, one turn around one octave
//   octave       = log2|w|, clamped to two octaves either side of |w| = 1
//   loudness     = that same clamped log, and silent at |w| <= 1/4
//   timbre       = |f'(z)|, a sine when the derivative vanishes, brighter as it grows
//   beat         = closer to a zero or a pole, faster, and never above 6.5 Hz
//
// A branch point is not a pole: it does not beat. Escape time is a rhythm for a Julia
// picture; this file computes it and the domain-colouring page does not play it.

import { sin, cos, div, exp, log } from './complex.js';

export const HOME_HZ = 220;
export const GAIN_CAP = 0.1;
export const OCTAVE_SPAN = 2;
export const BEAT_CAP_HZ = 6.5;
export const BEAT_RADIUS = 0.5;

const TAU = 2 * Math.PI;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function tan(z) {
  return div(sin(z), cos(z));
}

function finiteParts(w) {
  return !!w && Number.isFinite(w.re) && Number.isFinite(w.im);
}

export function modulusOf(w) {
  if (!finiteParts(w)) return Infinity;
  return Math.hypot(w.re, w.im);
}

// Arg w as a fraction of a turn in [0, 1). Undefined when w has run off.
export function pitchClassOf(w) {
  if (!finiteParts(w) || (w.re === 0 && w.im === 0)) return 0;
  let h = Math.atan2(w.im, w.re) / TAU;
  if (h < 0) h += 1;
  if (h >= 1) h = 0;
  return h;
}

// Loudness and octave from |w|. At |w| = 1 the unit is 1/2 and the octave is 0.
// At |w| <= 1/4 the unit is 0 (silence). At |w| >= 4 both sit on the ceiling.
export function sizeEar(mod) {
  if (mod === 0) return { raw: -Infinity, octave: -OCTAVE_SPAN, unit: 0 };
  if (!Number.isFinite(mod)) return { raw: Infinity, octave: OCTAVE_SPAN, unit: 1 };
  const raw = Math.log2(mod);
  const octave = clamp(raw, -OCTAVE_SPAN, OCTAVE_SPAN);
  let unit = (octave + OCTAVE_SPAN) / (2 * OCTAVE_SPAN);
  if (raw < -OCTAVE_SPAN) unit = 0;
  return { raw, octave, unit };
}

export function stretchOf(f, z) {
  const h = 1e-4;
  let a;
  let b;
  try {
    a = f({ re: z.re + h, im: z.im });
    b = f({ re: z.re - h, im: z.im });
  } catch (e) {
    return Infinity;
  }
  if (!finiteParts(a) || !finiteParts(b)) return Infinity;
  return Math.hypot((a.re - b.re) / (2 * h), (a.im - b.im) / (2 * h));
}

function nearest(z, marks) {
  let best = null;
  const list = Array.isArray(marks) ? marks : [];
  for (const m of list) {
    const d = Math.hypot(z.re - m.re, z.im - m.im);
    if (!best || d < best.d) best = { kind: m.kind, re: m.re, im: m.im, d };
  }
  return best;
}

function beatFor(dist) {
  if (!(dist < BEAT_RADIUS)) return { hz: 0, mix: 0 };
  return {
    hz: Math.min(BEAT_CAP_HZ, 0.48 / Math.max(dist, 0.05)),
    mix: 1 - dist / BEAT_RADIUS,
  };
}

// partial2 and partial3 are fractions of the fundamental gain.
export function timbreOf(stretch) {
  if (!Number.isFinite(stretch)) return { partial2: 0.5, partial3: 0.22, word: 'bright', bright: 1 };
  const s = stretch > 0 ? stretch : 0;
  const bright = clamp(Math.log2(1 + s) / 4, 0, 1);
  const partial2 = 0.5 * bright;
  const partial3 = 0.22 * bright;
  const word = partial2 < 0.08 ? 'pure' : partial2 < 0.28 ? 'warm' : 'bright';
  return { partial2, partial3, word, bright };
}

export function voiceOf({ w, stretch = 0, z = { re: 0, im: 0 }, marks = [] } = {}) {
  const ranOff = !finiteParts(w);
  const modulus = modulusOf(w);
  const size = sizeEar(modulus);
  const pitchClass = ranOff ? null : pitchClassOf(w);
  const pc = pitchClass === null ? 0 : pitchClass;
  const freq = HOME_HZ * 2 ** (size.octave + pc);
  const gain = GAIN_CAP * size.unit;
  const timbre = timbreOf(stretch);
  const near = nearest(z, marks);
  const beating = near && (near.kind === 'zero' || near.kind === 'pole') ? beatFor(near.d) : { hz: 0, mix: 0 };
  const beatKind = beating.hz > 0 ? near.kind : 'none';
  return {
    freq,
    gain,
    partial2: timbre.partial2,
    partial3: timbre.partial3,
    timbre: timbre.word,
    beatHz: beatKind === 'none' ? 0 : beating.hz,
    beatMix: beatKind === 'none' ? 0 : beating.mix,
    beatKind,
    pitchClass,
    octave: size.octave,
    modulus,
    stretch: Number.isFinite(stretch) ? stretch : Infinity,
    ranOff,
    near,
  };
}

export const CLAIMS = Object.freeze({
  zero: 'This is a zero. w is near 0, so the note goes quiet and low.',
  pole: 'This is a pole. The size of w runs off, so the note climbs, brightens, and beats.',
  plain: 'w is neither a zero nor a pole. Pitch is the angle of w, and loudness is its size.',
  'exp-home': 'This is the resting note. e^0 is 1, so the pitch is home and the loudness is the middle.',
  'exp-loud': 'You are on the real axis, away from 0. Only the size of e^z has changed, so only the loudness moves.',
  'exp-pitch': 'You are on the imaginary axis, away from 0. Only the angle of e^z has changed, so only the pitch moves.',
  'exp-both': 'Size and angle are both away from the resting value, so loudness and pitch are both off the home note.',
  'log-cut': 'You are on the branch cut. A small step across jumps the pitch and leaves the loudness put.',
  'log-branch': 'This is the branch point at 0, not a pole. The size of Log grows as you come closer, and the note does not beat.',
  'log-plain': 'Log is continuous here. A small step does not jump the pitch.',
});

export function claimFor(preset, z, voice) {
  if (preset.id === 'exp') {
    const ax = Math.abs(z.re);
    const ay = Math.abs(z.im);
    if (ax <= 0.12 && ay <= 0.12) return 'exp-home';
    if (ax >= 0.5 && ay <= 0.1) return 'exp-loud';
    if (ay >= 0.8 && ax <= 0.1) return 'exp-pitch';
    return 'exp-both';
  }
  const n = voice.near;
  if (preset.id === 'log') {
    if (n && n.kind === 'zero' && n.d < 0.34 && voice.modulus < 0.35) return 'zero';
    const onCut = z.re < -0.05 && Math.abs(z.im) <= 0.1 && (!n || n.kind !== 'branch' || n.d > 0.22);
    if (onCut) return 'log-cut';
    if (n && n.kind === 'branch' && n.d < 0.28 && voice.modulus > 1.15) return 'log-branch';
    return 'log-plain';
  }
  if (n && n.kind === 'zero' && n.d < 0.4 && voice.modulus < 0.35) return 'zero';
  if (n && n.kind === 'pole' && n.d < 0.4 && voice.modulus > 2.5) return 'pole';
  return 'plain';
}

export const MAPPING = Object.freeze([
  Object.freeze({
    ear: 'Pitch',
    math: `The angle of w, one full turn around one octave. Home is ${HOME_HZ} Hz when the angle is 0 and the size is 1.`,
  }),
  Object.freeze({
    ear: 'Loudness and octave',
    math: 'Both follow log2 of the size of w, and the angle still picks the note inside that octave. At size 1/4 and below, the note is silent. At size 4 and above, loudness and the octave sit on the ceiling.',
  }),
  Object.freeze({
    ear: 'Timbre',
    math: 'The size of the derivative. A derivative of 0 is a pure sine. A large derivative adds higher partials, so the note brightens.',
  }),
  Object.freeze({
    ear: 'Beat',
    math: 'Closer to a zero or a pole, the beat is faster, and it never goes past 6.5 Hz. A branch point does not beat. A zero is the quiet beat. A pole is the loud one.',
  }),
]);

const PI = Math.PI;

export const PRESETS = Object.freeze({
  tan: Object.freeze({
    id: 'tan',
    label: 'tan z',
    f: tan,
    xRange: Object.freeze([-0.55, 3.7]),
    yRange: Object.freeze([-1.65, 1.65]),
    start: Object.freeze({ re: 0.72, im: 0.55 }),
    marks: Object.freeze([
      Object.freeze({ kind: 'zero', re: 0, im: 0 }),
      Object.freeze({ kind: 'zero', re: PI, im: 0 }),
      Object.freeze({ kind: 'pole', re: PI / 2, im: 0 }),
    ]),
    cut: false,
    observe: 'Drag the green point. Black is a zero of tan, where the note goes quiet. The bright spot is where cos z is 0, so tan runs off and the note climbs. Arrow keys move the point once the picture is focused.',
  }),
  exp: Object.freeze({
    id: 'exp',
    label: 'e^z',
    f: exp,
    xRange: Object.freeze([-1.7, 1.7]),
    yRange: Object.freeze([-3.5, 3.5]),
    start: Object.freeze({ re: 0.25, im: 0.55 }),
    marks: Object.freeze([]),
    cut: false,
    observe: 'Drag the green point. Across changes only the size of e^z, so only the loudness. Up changes only the angle, so only the pitch. The angle repeats every 2\u03c0 upward.',
  }),
  log: Object.freeze({
    id: 'log',
    label: 'Log z',
    f: log,
    xRange: Object.freeze([-1.5, 1.8]),
    yRange: Object.freeze([-1.6, 1.6]),
    start: Object.freeze({ re: 0.55, im: 0.7 }),
    marks: Object.freeze([
      Object.freeze({ kind: 'zero', re: 1, im: 0 }),
      Object.freeze({ kind: 'branch', re: 0, im: 0 }),
    ]),
    cut: true,
    observe: 'Drag the green point across the dashed cut. Log jumps there, and so does the pitch, while the loudness stays. The black spot at 1 is a zero of Log. The origin is a branch point, not a pole: no beat.',
  }),
});

export function sample(id, z) {
  const preset = PRESETS[id];
  if (!preset) throw new RangeError('unknown preset ' + id);
  const w = preset.f(z);
  const stretch = stretchOf(preset.f, z);
  const voice = voiceOf({ w, stretch, z, marks: preset.marks });
  const claim = claimFor(preset, z, voice);
  return { w, voice, claim, text: CLAIMS[claim], preset };
}

// One pulse on a zero, two on a pole. Reduced motion and anything else: nothing.
export function hapticPattern(kind, reduced) {
  if (reduced) return null;
  if (kind === 'zero') return [16];
  if (kind === 'pole') return [12, 36, 12];
  return null;
}

// Steps of z -> z^2 + c until |z| > radius, or max if it stays.
export function escapeSteps(z, c, max = 40, radius = 2) {
  let re = z.re;
  let im = z.im;
  const cr = c.re;
  const ci = c.im;
  const r2 = radius * radius;
  for (let n = 0; n < max; n++) {
    if (re * re + im * im > r2) return n;
    const nre = re * re - im * im + cr;
    im = 2 * re * im + ci;
    re = nre;
  }
  return max;
}

// A stay is a held tone. A leave ticks faster the sooner it leaves, and never past 8 Hz.
export function escapeRhythm(steps, max = 40) {
  if (steps >= max) return { held: true, pulsesPerSec: 0, periodMs: 0 };
  const pulsesPerSec = Math.min(8, 10 / Math.max(1, steps));
  return { held: false, pulsesPerSec, periodMs: 1000 / pulsesPerSec };
}
