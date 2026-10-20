// js/data/films.js — the films a station carries. Pure data: no DOM, no imports, no side effects.
//
// A film is a HyperFrames page (one paused GSAP timeline on window.__tl) in films/. The page has no
// play button of its own. The station's film panel (js/core/film.js) owns the clock: it seeks the
// timeline from the site's one motion, so Pause, a hidden tab and reduced motion behave the way they
// do on every other picture. The pages are made by the manim-hyperframes-matrix skill (a spin on
// its R0 page cells) and pass that skill's per-frame page QA. Every number on a film is computed.
//
// `station` is the place that carries the film (a registry id). `threads` are the story threads the
// film walks. `links` are the places the same move shows up again: [hash, label]. A label that names
// Test 1 or Test 2 tells the student the chip switches the map. `cites` are Howell & Mathews, open
// edition, HTML numbering, checked against complexanalysis.org on 2026-10-20. `pdf` is filled only
// where this site has already checked the PDF number; otherwise it stays null and the line says so.

const H = 'https://complexanalysis.org/web/';

export const FILMS = Object.freeze([
  Object.freeze({
    id: 'multiply',
    station: 'arithmetic',
    src: 'films/film-multiply.html',
    title: 'Multiply: turn, then stretch',
    lede: 'z = √3 + i times w = 1 + i. The arrow to z turns by the angle of w, then stretches by the length of w, and lands on zw. Lengths multiply and angles add.',
    threads: Object.freeze(['T1']),
    cites: Object.freeze([
      Object.freeze({ pin: '§1.4, Equation (1.4.10) and Figure 1.4.13', href: `${H}sec_geometry-2.html#fig_ch-01-17`, pdf: null }),
    ]),
    links: Object.freeze([
      Object.freeze(['#addresses', 'The two addresses: why multiplying is easy in polar']),
      Object.freeze(['#powers', 'Powers: the same turn and stretch, n times']),
      Object.freeze(['#julia', 'Test 2, Julia: squaring is this move with w = z']),
    ]),
  }),
  Object.freeze({
    id: 'unity',
    station: 'roots',
    src: 'films/film-unity.html',
    title: 'Roots of unity: divide the staircase by 5',
    lede: 'The angles of 1 are 0, 2π, 4π, and so on. Divide each step by 5. Steps 0 to 4 land on five different points of the unit circle. Step 5 lands on step 0 again, so there are only five roots.',
    threads: Object.freeze(['T2', 'T1']),
    cites: Object.freeze([
      Object.freeze({ pin: '§1.5, Equation (1.5.5), the n-th roots of unity', href: `${H}sec_algebra-2.html#Roots_of_Unity`, pdf: null }),
    ]),
    links: Object.freeze([
      Object.freeze(['#staircase', 'The staircase: every name of one angle']),
      Object.freeze(['#principal-root', 'Principal roots: the home-step root']),
      Object.freeze(['#powers', 'Powers: each root, raised to the 5th, turns back to 1']),
    ]),
  }),
  Object.freeze({
    id: 'orbit',
    station: 'zero',
    src: 'films/film-orbit.html',
    title: 'The orbit of 0: square, then slide',
    lede: 'Each step squares (the angle doubles, the length squares) and then slides by c. For c = i the walk from 0 cycles between −1 + i and −i, so it stays. For c = 0.3 the walk creeps right and then leaves.',
    threads: Object.freeze(['F1', 'F2']),
    cites: Object.freeze([
      Object.freeze({ pin: '§4.2, Theorem 4.2.11 [PDF Theorem 4.9]', href: `${H}sec_julia-mandelbrot.html#Kc_Connected`, pdf: 'Theorem 4.9' }),
      Object.freeze({ pin: '§4.2, Example 4.2.12', href: `${H}sec_julia-mandelbrot.html#Julia_Connected_Ex`, pdf: null }),
      Object.freeze({ pin: '§4.2, Exercise 8', href: `${H}sec_julia-mandelbrot.html#x4_2_8`, pdf: null }),
    ]),
    links: Object.freeze([
      Object.freeze(['#arithmetic', 'Test 1, multiply: the square is that turn and stretch']),
      Object.freeze(['#julia', 'Julia sets: every start, not only 0']),
      Object.freeze(['#seeds', 'Which c keep 0 bounded']),
      Object.freeze(['#paper', 'The flat paper: c is the hollow square']),
    ]),
  }),
]);

export function filmsFor(stationId) {
  return FILMS.filter((f) => f.station === stationId);
}

export function filmById(id) {
  return FILMS.find((f) => f.id === id) || null;
}
