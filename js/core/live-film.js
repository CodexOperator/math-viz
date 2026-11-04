// A live film is a pure picture of time and of the number the hand is holding.
//
// Manim, Motion Canvas, and a GSAP tween each own a clock. This site already has
// one, js/core/anim.js. createMotion is the only loop. Pause, a hidden tab, and
// a gap longer than a frame draw nothing and do not move t. Reduced motion never
// schedules a frame: it steps to the finished stops of the branch |z| is in now.
//
// The hand does not own t. Scrub borrows t and pauses, the same rule as the film
// panel. The hand owns z. setParams writes z. If the clock is running, the next
// tick reads it and t is not rewound. If the clock is stopped, that write paints
// once, synchronously, and nothing is scheduled.
//
// The scene is the §4.1 sequence film (films/film-settle.html): the terms 1, z,
// z^2, ... . Every term is recomputed from the current z. They are not a trail
// the point left behind. Crossing the unit circle changes the branch, the claim,
// and the beats. It does not restart the walk.

import { createMotion } from './anim.js';

export const DURATION = 8;
export const TERMS = 8;
export const TAIL = 0.35;
export const WINDOW = 1.35;
export const CIRCLE_SNAP = 0.06;
export const SETTLED = Object.freeze({ re: 0.5, im: 0.25 });

const END_EPS = 1e-3;

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

export function fateOf(mod) {
  if (!(mod >= 0)) return 'settle';
  if (mod < 1 - 1e-9) return 'settle';
  if (mod <= 1 + 1e-9) return 'stay';
  return 'leave';
}

// Keep the green point on the plane. A radius within CIRCLE_SNAP of 1 lands on
// the circle, so "stays" is a place the hand can hold and not a set of measure zero.
export function placeSeed(re, im) {
  let x = Number(re);
  let y = Number(im);
  if (!Number.isFinite(x)) x = SETTLED.re;
  if (!Number.isFinite(y)) y = SETTLED.im;
  x = clamp(x, -WINDOW, WINDOW);
  y = clamp(y, -WINDOW, WINDOW);
  const mod = Math.hypot(x, y);
  if (mod > 1e-9 && Math.abs(mod - 1) <= CIRCLE_SNAP) {
    return { re: x / mod, im: y / mod, snapped: true };
  }
  return { re: x, im: y, snapped: false };
}

// z^0 through z^n. One multiplication per term. No history.
export function powers(re, im, n = TERMS) {
  const pts = [{ re: 1, im: 0 }];
  let x = 1;
  let y = 0;
  const count = Math.max(0, n | 0);
  for (let k = 1; k <= count; k += 1) {
    const nx = x * re - y * im;
    const ny = x * im + y * re;
    x = nx;
    y = ny;
    pts.push({ re: x, im: y });
  }
  return pts;
}

// Beats are a function of the branch, not a label baked into a timeline.
// settle: the moment the walking term enters the disk of radius TAIL.
// leave: the moment it crosses the window. stay: it is still on the circle.
export function beatsFor(mod, duration = DURATION, terms = TERMS) {
  const D = duration;
  const N = terms;
  const tFirst = D / N;
  const fate = fateOf(mod);
  if (fate === 'stay') return [0, tFirst, D / 2, D];
  if (fate === 'leave') {
    const n = Math.log(1.4) / Math.log(mod);
    const tOut = clamp((n / N) * D, tFirst + 0.2, D - 0.2);
    return [0, tFirst, tOut, D];
  }
  if (!(mod > 0)) return [0, tFirst, Math.min(D - 0.2, tFirst + 0.2), D];
  const n = Math.log(TAIL) / Math.log(mod);
  const tIn = clamp((n / N) * D, tFirst + 0.2, D - 0.2);
  return [0, tFirst, tIn, D];
}

// Same cut as filmStops in js/core/film.js. Reduced motion lands just before
// each interior beat, then on the end. Kept here so the player does not load
// the HyperFrames panel. tools/live-film-smoke.mjs checks the two agree.
export function finishedStops(duration, beats) {
  const D = Math.max(0, Number(duration) || 0);
  const b = (Array.isArray(beats) ? beats : [])
    .map(Number)
    .filter((x) => Number.isFinite(x) && x > 0.1 && x < D - 0.1)
    .sort((x, y) => x - y);
  const stops = b.map((x) => Math.max(0, x - 0.05));
  stops.push(D);
  return [...new Set(stops.map((x) => Math.round(x * 1000) / 1000))];
}

export function settleClaim(fate, termMod, index) {
  if (fate === 'stay') {
    return { holds: false, text: 'Stays. The modulus is 1, so the terms do not settle.' };
  }
  if (fate === 'leave') {
    return { holds: false, text: 'Leaves. The modulus is bigger than 1.' };
  }
  const holds = index >= 1 && termMod < TAIL;
  return {
    holds,
    text: holds
      ? 'Settles at 0. The tail sits in the disk.'
      : 'Not settled yet. These terms are still outside the disk around 0.',
  };
}

export function settleFrame(t, params, opts = {}) {
  const D = opts.duration || DURATION;
  const N = opts.terms || TERMS;
  const seed = placeSeed(params && params.re, params && params.im);
  const mod = Math.hypot(seed.re, seed.im);
  const fate = fateOf(mod);
  const shown = clamp(Number(t) || 0, 0, D) / D * N;
  const index = Math.min(N, Math.floor(shown + 1e-12));
  const frac = index >= N ? 0 : Math.min(1, Math.max(0, shown - index));
  const pts = powers(seed.re, seed.im, N);
  const next = pts[Math.min(N, index + 1)];
  const cursor = {
    re: pts[index].re + (next.re - pts[index].re) * frac,
    im: pts[index].im + (next.im - pts[index].im) * frac,
  };
  const termMod = Math.hypot(cursor.re, cursor.im);
  return {
    t: clamp(Number(t) || 0, 0, D),
    re: seed.re,
    im: seed.im,
    snapped: seed.snapped,
    mod,
    fate,
    shown,
    index,
    frac,
    pts,
    cursor,
    termMod,
    beats: beatsFor(mod, D, N),
    claim: settleClaim(fate, termMod, index),
  };
}

// env.motion is a createMotion(). env.reduced() is the OS setting.
// env.onFrame(scene) paints. env.onState(state) is the button and the scrubber.
// env.scene(t, params) defaults to settleFrame.
export function createLivePlayer(env = {}) {
  const D = Math.max(0.001, Number(env.duration) || DURATION);
  const motion = env.motion || createMotion();
  const reduced = typeof env.reduced === 'function' ? env.reduced : () => false;
  const sceneOf = typeof env.scene === 'function' ? env.scene : (t, params) => settleFrame(t, params, { duration: D });
  let params = placeSeed(
    env.params && env.params.re !== undefined ? env.params.re : SETTLED.re,
    env.params && env.params.im !== undefined ? env.params.im : SETTLED.im,
  );
  let t = D;
  let playing = false;
  let watched = false;
  let dead = false;

  const atEnd = () => t >= D - END_EPS;
  function scene() {
    return sceneOf(t, params);
  }
  function stops() {
    return finishedStops(D, scene().beats);
  }
  function label() {
    if (reduced()) return atEnd() && watched ? 'Start again' : 'Next step';
    if (playing) return 'Pause';
    if (atEnd() && watched) return 'Play again';
    return 'Play';
  }
  function state() {
    const s = scene();
    return {
      t,
      duration: D,
      playing,
      watched,
      atEnd: atEnd(),
      label: label(),
      reduced: !!reduced(),
      fate: s.fate,
      holds: s.claim.holds,
    };
  }
  function paint() {
    if (typeof env.onFrame === 'function') env.onFrame(scene());
  }
  function emit() {
    if (typeof env.onState === 'function') env.onState(state());
  }
  function pause() {
    if (!playing) return;
    motion.cancel();
    playing = false;
    emit();
  }
  function play() {
    if (dead || reduced()) return;
    if (atEnd()) t = 0;
    watched = true;
    playing = true;
    paint();
    motion.drive((dt) => {
      if (dead || !playing) return false;
      t = Math.min(D, t + dt / 1000);
      if (t >= D - END_EPS) {
        t = D;
        playing = false;
        paint();
        emit();
        return false;
      }
      paint();
      emit();
      return true;
    });
    emit();
  }
  function step() {
    if (dead) return;
    motion.cancel();
    playing = false;
    const list = stops();
    if (!watched || atEnd()) {
      watched = true;
      t = list[0];
    } else {
      const next = list.find((s) => s > t + END_EPS);
      t = next === undefined ? D : next;
    }
    paint();
    emit();
  }
  function nearestStop(v) {
    const list = stops();
    let best = list[list.length - 1];
    let bestD = Infinity;
    for (const s of list) {
      const d = Math.abs(s - v);
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }
  function scrub(v) {
    if (dead) return;
    if (playing) {
      motion.cancel();
      playing = false;
    }
    watched = true;
    const raw = Number(v);
    t = clamp(reduced() ? nearestStop(raw) : raw, 0, D);
    paint();
    emit();
  }
  function setParams(next) {
    if (dead) return;
    const prev = params;
    params = placeSeed(
      next && Number.isFinite(+next.re) ? +next.re : prev.re,
      next && Number.isFinite(+next.im) ? +next.im : prev.im,
    );
    // Playing: this paints the frame the hand just asked for, at the current t.
    // The clock is already scheduled and will paint the next one. t is not moved.
    // Paused: this one paint is the whole draw. Nothing is scheduled.
    paint();
    emit();
  }
  function noteMotion() {
    if (dead) return;
    if (reduced() && playing) {
      motion.cancel();
      playing = false;
    }
    emit();
  }
  function toggle() {
    if (reduced()) return step();
    if (playing) return pause();
    return play();
  }
  function destroy() {
    dead = true;
    motion.cancel();
    playing = false;
  }

  paint();
  emit();

  return {
    toggle,
    play,
    pause,
    step,
    scrub,
    setParams,
    noteMotion,
    destroy,
    state,
    scene,
    stops,
    get t() { return t; },
    get playing() { return playing; },
    get params() { return { re: params.re, im: params.im }; },
  };
}
