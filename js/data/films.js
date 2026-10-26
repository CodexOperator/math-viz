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
// Test 1 or Test 2 tells the student the chip switches the map. `cites` are Howell & Mathews,
// 202 Updated Edition. `pdf` is the printed number. A null pdf still says the number was not
// checked. Links open the HTML edition.

const H = 'https://complexanalysis.org/web/';

export const FILMS = Object.freeze([
  Object.freeze({
    id: 'multiply',
    station: 'arithmetic',
    src: 'films/film-multiply.html',
    title: 'Multiply: turn, then stretch',
    kicker: 'Worked example',
    lede: 'The arrow to z turns by the angle of w, then stretches by the length of w, and lands on zw. Lengths multiply and angles add. That rule is Equation (1.36), page 25. This stop opens on problem 1.1.1, (3 − 2i)(−1 + 4i) = 5 + 14i, and the film uses those two numbers. Figure 1.17, page 26, is the product schematic. The book does not print √3 + i times 1 + i, and the film shows it only when those numbers are on the plane. The same turn, divided by n, is a root of unity. Squared, with w = z, it is the orbit of 0.',
    threads: Object.freeze(['T1']),
    cites: Object.freeze([
      Object.freeze({ pin: '§1.4, Equation (1.36), page 25. Figure 1.17, page 26, is the product schematic. The book does not print √3 + i times 1 + i', href: `${H}sec_geometry-2.html#fig_ch-01-17`, pdf: 'Equation (1.36); Figure 1.17' }),
    ]),
    links: Object.freeze([
      Object.freeze(['#addresses', 'The two addresses: why multiplying is easy in polar']),
      Object.freeze(['#roots', 'Roots of unity: divide that angle by n']),
      Object.freeze(['#powers', 'Powers: the same turn and stretch, n times']),
      Object.freeze(['#zero', 'Test 2, orbit of 0: squaring is this turn with w = z']),
    ]),
  }),
  Object.freeze({
    id: 'unity',
    station: 'roots',
    src: 'films/film-unity.html',
    title: 'Roots of unity: divide the staircase by n',
    lede: 'The angles of a point are θ, θ + 2π, θ + 4π, and so on. Divide each step by the n on this stop. That divide is the multiply turn run backwards. The film follows that n: steps 0 through n − 1 are n different points, and step n lands on step 0.',
    threads: Object.freeze(['T2', 'T1']),
    cites: Object.freeze([
      Object.freeze({ pin: '§1.5, Equation (1.43), page 31, the n-th roots of unity', href: `${H}sec_algebra-2.html#Roots_of_Unity`, pdf: 'Equation (1.43)' }),
    ]),
    links: Object.freeze([
      Object.freeze(['#arithmetic', 'Multiply: the turn this divide reverses']),
      Object.freeze(['#staircase', 'The staircase: every name of one angle']),
      Object.freeze(['#powers', 'Powers: each root, raised to n, turns back to 1']),
      Object.freeze(['#zero', 'Test 2, orbit of 0: squaring is this turn, and the length can leave 1']),
    ]),
  }),
  Object.freeze({
    id: 'orbit',
    station: 'zero',
    src: 'films/film-orbit.html',
    title: 'The orbit of 0: square, then slide',
    lede: 'Each step squares (the angle doubles, the length squares) and then slides by c. The chip on this stop chooses c, and the film walks that orbit. The line says settles, stays, or leaves, the same words as the chip. For c = i the walk stays, and the steps cycle. For c = 0.3 it leaves. Squaring is the multiply turn with w = z. Theorem 4.9, page 113: the Julia set is connected exactly when this orbit stays bounded.',
    threads: Object.freeze(['F1', 'F2']),
    cites: Object.freeze([
      Object.freeze({ pin: '§4.2, Theorem 4.9, page 113', href: `${H}sec_julia-mandelbrot.html#Kc_Connected`, pdf: 'Theorem 4.9' }),
      Object.freeze({ pin: '§4.2, Example 4.10, page 113', href: `${H}sec_julia-mandelbrot.html#Julia_Connected_Ex`, pdf: 'Example 4.10' }),
      Object.freeze({ pin: '§4.2, Exercise 8, page 117', href: `${H}sec_julia-mandelbrot.html#x4_2_8`, pdf: 'Exercise 8' }),
    ]),
    links: Object.freeze([
      Object.freeze(['#arithmetic', 'Test 1, multiply: the square is that turn and stretch']),
      Object.freeze(['#roots', 'Test 1, roots of unity: divide that angle; the length stays 1']),
      Object.freeze(['#julia', 'Julia sets: every start, not only 0']),
      Object.freeze(['#seeds', 'Which c keep 0 bounded']),
    ]),
  }),
  Object.freeze({
    id: 'seam',
    station: 'staircase',
    src: 'films/film-seam.html',
    title: 'Arg jumps at the seam',
    lede: 'Walk once around 0. The point is smooth. Arg z jumps by a full turn when the walk crosses the seam. The modulus is the one on the staircase.',
    threads: Object.freeze(['T2']),
    cites: Object.freeze([
      Object.freeze({ pin: '§1.4, Definition 1.11, page 23, Arg z', href: `${H}sec_geometry-2.html`, pdf: 'Definition 1.11' }),
    ]),
    links: Object.freeze([
      Object.freeze(['#addresses', 'The two addresses of the same point']),
      Object.freeze(['#branches', 'The branch cut is this seam']),
      Object.freeze(['#roots', 'Roots: divide that turn by n']),
      Object.freeze(['#limits', 'A spiral approach never settles the angle']),
    ]),
    step: Object.freeze({ min: 1e-5, max: 1, value: 0.2, legend: 'Angle step', label: 'Angle step in radians' }),
  }),
  Object.freeze({
    id: 'settle',
    station: 'sequence',
    src: 'films/film-settle.html',
    title: 'The terms land, or they do not',
    lede: 'z^n for the sequence on this stop. Inside the unit circle the terms settle at 0. On the circle they stay. Outside, they leave.',
    threads: Object.freeze(['F1']),
    cites: Object.freeze([
      Object.freeze({ pin: '§4.1, Definition 4.1, page 103', href: `${H}sec_sequences-series.html#Seq_Lim_Def`, pdf: 'Definition 4.1' }),
    ]),
    links: Object.freeze([
      Object.freeze(['#series', 'The bags must settle before the pile can']),
      Object.freeze(['#powers', 'Test 1, Powers: one more turn and stretch']),
      Object.freeze(['#zero', 'Test 2, the orbit of 0 is this kind of list']),
      Object.freeze(['#geometric', 'Inside the unit disk the geometric series settles']),
    ]),
    step: Object.freeze({ min: 1e-5, max: 1, value: 0.25, legend: 'Term step', label: 'How far the index moves' }),
  }),
  Object.freeze({
    id: 'approach',
    station: 'limits',
    src: 'films/film-approach.html',
    title: 'Every direction must agree',
    lede: 'Walk toward 0 along the path on this stop. g(z) = z² / |z|². A straight arrival locks g(z) to one direction. The spiral keeps turning, so the values never settle.',
    threads: Object.freeze(['T3']),
    cites: Object.freeze([
      Object.freeze({ pin: '§2.3, Definition 2.4, page 62', href: `${H}sec_limits-continuity.html`, pdf: 'Definition 2.4' }),
    ]),
    links: Object.freeze([
      Object.freeze(['#derivative', 'The derivative asks this of the difference quotient']),
      Object.freeze(['#curves', 'A path is a walk in t']),
      Object.freeze(['#staircase', 'Arg is what the spiral refuses to settle']),
      Object.freeze(['#mappings', 'g as a motion of the plane']),
    ]),
    step: Object.freeze({ min: 1e-5, max: 0.2, value: 0.02, legend: 'Distance step', label: 'Distance step' }),
  }),
  Object.freeze({
    id: 'newton-walk',
    station: 'newton-step',
    src: 'films/film-newton-walk.html',
    title: 'Five Newton steps land on i',
    lede: 'z² + 1, from the start on this stop. One Newton step is z − 1/z, halved. Five of them land on i.',
    threads: Object.freeze(['F1', 'F3']),
    cites: Object.freeze([
      Object.freeze({ pin: '§4.2, Example 4.7, page 110', href: `${H}sec_julia-mandelbrot.html#Newton_s_Method_Ex`, pdf: 'Example 4.7' }),
    ]),
    links: Object.freeze([
      Object.freeze(['#newton', 'The basins: every start, coloured by the root']),
      Object.freeze(['#derivative', 'Test 1, the derivative is the denominator']),
      Object.freeze(['#zero', 'Another orbit: square, then slide']),
      Object.freeze(['#half', 'A real start for z² + 1 never lands']),
    ]),
    step: Object.freeze({ min: 1e-5, max: 1, value: 0.2, legend: 'Newton step', label: 'Fraction of a Newton step' }),
  }),
  Object.freeze({
    id: 'boundary',
    station: 'mandelbrot',
    src: 'films/film-boundary.html',
    title: 'c crosses the cardioid',
    kicker: 'Worked example',
    lede: 'c walks from inside the main cardioid, through the cusp at 1/4, and out. While the orbit of 0 stays, the Julia set is one piece. After that orbit leaves, the Julia set is dust. Theorem 4.9, page 113 is that test. The live loop on this stop follows a path you draw. This film is the same crossing, on a fixed path.',
    threads: Object.freeze(['F2', 'F1']),
    cites: Object.freeze([
      Object.freeze({ pin: '§4.2, Theorem 4.9, page 113', href: `${H}sec_julia-mandelbrot.html#Kc_Connected`, pdf: 'Theorem 4.9' }),
      Object.freeze({ pin: '§4.2, Example 4.11, page 115', href: `${H}sec_julia-mandelbrot.html#Disk__25_in_M`, pdf: 'Example 4.11' }),
    ]),
    links: Object.freeze([
      Object.freeze(['#julia', 'Julia sets: the picture that breaks apart']),
      Object.freeze(['#zero', 'The orbit of 0, one c at a time']),
      Object.freeze(['#bulbs', 'The cardioid, and the period of that orbit']),
      Object.freeze(['#seeds', 'The exercises on this set']),
    ]),
  }),
]);

export function filmsFor(stationId) {
  return FILMS.filter((f) => f.station === stationId);
}

export function filmById(id) {
  return FILMS.find((f) => f.id === id) || null;
}
