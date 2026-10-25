// js/data/textbook.js — where a Test 2 idea sits in the course textbook.
//
// Julia and Newton both read this file. The line on the page stays blank until
// book, chapter, and section are all present.
//
// The course book is Howell & Mathews, Complex Analysis, the free open edition
// (CC BY 4.0). HTML numbering.
//
// HTML section numbers, checked against the open edition (not the handout).
// Chapter 1, § 3 is the slide: Figure 1.3.2, the parallelogram. The link opens
// on that figure. The section also does modulus and conjugation.
// Chapter 1, § 4 opens as polar form and Arg. The product is later: Equation
// (1.4.10) and Figure 1.4.13, lengths multiply and angles add. The link opens
// on the figure.
// Chapter 1, § 5 does both remaining moves. De Moivre (1.5.2) repeats one
// multiplication. The roots of unity are Equation 1.5.5, further down. The
// two links open on those two anchors.
// Chapter 4, § 2 is both pictures: Newton's method, then z^2 + c.
// Figure 4.2.5, anchor fig_ch-04-cp-1, colours z^3 + 1.
// https://complexanalysis.org/web/sec_julia-mandelbrot.html

const BOOK = 'Howell & Mathews, Complex Analysis';

function section(chapter, sectionNumber, file) {
  return Object.freeze({
    book: BOOK,
    chapter,
    section: sectionNumber,
    url: `https://complexanalysis.org/web/${file}`,
  });
}

const SECTION_42 = section('4', '2', 'sec_julia-mandelbrot.html');
// The colouring of z^3 + 1. The header stays on the section. This note opens
// on the figure, which is where the book paints a root a colour.
const NEWTON_FIGURE = section('4', '2', 'sec_julia-mandelbrot.html#fig_ch-04-cp-1');

export const JULIA_SOURCE = SECTION_42;
export const NEWTON_SOURCE = SECTION_42;
// Example 4.2.16 is the disk |c| ≤ 1/4 inside the set of c. The Mandelbrot
// picture opens on that example. Theorem 4.2.11 is the connectedness test.
const MANDELBROT_ANCHOR = section('4', '2', 'sec_julia-mandelbrot.html#Disk__25_in_M');
// Theorem 4.2.20 is the cardioid of attracting fixed points.
const BULBS_ANCHOR = section('4', '2', 'sec_julia-mandelbrot.html#Fixed_point_Def');
export const MANDELBROT_SOURCE = MANDELBROT_ANCHOR;
export const BULBS_SOURCE = BULBS_ANCHOR;
// HTML Figure 4.2.13, id fig_ch-04-cp-6, is the Mandelbrot set. In the open-edition
// PDF that picture is Figure 4.6, and the printed page number on that page is 114.
const MANDELBROT_FIGURE = section('4', '2', 'sec_julia-mandelbrot.html#fig_ch-04-cp-6');
export const MANDELBROT_FIGURE_SOURCE = MANDELBROT_FIGURE;
// Chapter 2, § 5 is the reciprocal transformation and the extended plane.
// HTML Figure 2.5.2, id fig_ch-02-22, is the Riemann sphere. The open-edition PDF
// calls it Figure 2.22, on printed page 73. The north pole is the point at infinity.
export const SPHERE_SOURCE = section('2', '5', 'sec_reciprocal-transformation.html#fig_ch-02-22');

// The moves Test 1 already taught, cited where this book teaches them.
// The printed line is still the section. The url opens on the picture or the
// equation the card is about, because the top of § 4 is Arg and the top of
// § 5 is the power, not the roots.
export const SLIDE_SOURCE = section('1', '3', 'sec_geometry-1.html#fig_ch-01-08');
export const PRODUCT_SOURCE = section('1', '4', 'sec_geometry-2.html#fig_ch-01-17');
// HTML Figure 1.4.1, id fig_ch-01-15, is the polar picture: θ measured from
// the positive real axis. The open-edition PDF calls that picture Figure 1.15,
// printed page 22. Definition 1.4.6 is Arg z. The equation anchor is Arg_z.
// The PDF calls that definition Definition 1.11, printed page 23.
// The product is a later figure, Figure 1.4.13, id fig_ch-01-17.
export const ARG_SOURCE = section('1', '4', 'sec_geometry-2.html#fig_ch-01-15');
export const ARG_DEF_SOURCE = section('1', '4', 'sec_geometry-2.html#Arg_z');
export const POWER_SOURCE = section('1', '5', 'sec_algebra-2.html#De_Moivre_s_formula');
export const UNITY_SOURCE = section('1', '5', 'sec_algebra-2.html#Roots_of_Unity');

// Cards under each picture. `station` is a place on this branch. The Test 2
// story map, when it lands, is still #home, so these cards do not name a
// station that exists only on that map.
export const JULIA_EARLIER = Object.freeze({
  text: 'Squaring repeats one multiplication: turn by the angle, stretch by the length, then do it again. Adding c is that slide, the same one at every step. Do both again and again. Blue is every start that stays near 0. Example 4.2.8 [PDF Example 4.9], and the rule f_c(z) = z^2 + c.',
  ideas: Object.freeze([
    Object.freeze({
      station: 'powers',
      tone: 'polar',
      text: 'z^2 is that turn and stretch, done twice. On Powers the same move is one point, repeated.',
      sources: Object.freeze([PRODUCT_SOURCE, POWER_SOURCE]),
    }),
    Object.freeze({
      station: 'arithmetic',
      token: 'add',
      tone: 'cart',
      text: 'Adding c is the slide. This opens on z₁ + z₂, which is that slide.',
      sources: Object.freeze([SLIDE_SOURCE]),
    }),
  ]),
});

export const NEWTON_EARLIER = Object.freeze({
  text: 'The colour is which root the walk finds. These roots are the cube roots of 1, the roots of unity for n = 3. The book’s Figure 4.2.5 colours z^3 + 1. This picture colours z^3 − 1.',
  noteSource: NEWTON_FIGURE,
  ideas: Object.freeze([
    Object.freeze({
      station: 'roots',
      token: 'cube',
      tone: 'polar',
      text: 'Opens on c = 1 and n = 3. The three points are the roots this picture opens on.',
      sources: Object.freeze([UNITY_SOURCE]),
    }),
  ]),
});

// Equation 3.1.1, the same anchor the flat paper already uses. No PDF number is added here.
const DERIV_SOURCE = section('3', '1', 'sec_diff-analytic.html#Deriv_Def_1');
const JULIA_KC_SOURCE = section('4', '2', 'sec_julia-mandelbrot.html#K-0');
const KC_CONNECTED = section('4', '2', 'sec_julia-mandelbrot.html#Kc_Connected');

export const MANDELBROT_EARLIER = Object.freeze({
  text: 'This is the same motion as Julia, collected over c. Square, then slide, and read the fate of the orbit of 0. It settles, it stays, or it leaves. Blue is a c whose orbit stayed. Orange is a c whose orbit left. The orange point is one c.',
  ideas: Object.freeze([
    Object.freeze({
      station: 'powers',
      tone: 'polar',
      text: 'z^2 is that turn and stretch, done twice. On Powers the same move is one point, repeated.',
      sources: Object.freeze([PRODUCT_SOURCE, POWER_SOURCE]),
    }),
    Object.freeze({
      station: 'arithmetic',
      token: 'add',
      tone: 'cart',
      text: 'Adding c is the slide. This opens on z₁ + z₂, which is that slide.',
      sources: Object.freeze([SLIDE_SOURCE]),
    }),
    Object.freeze({
      station: 'julia',
      tone: 'input',
      text: 'One c, and every start. The green walk is one start. This set is the fate of the orbit of 0, for every c.',
      sources: Object.freeze([JULIA_KC_SOURCE]),
    }),
  ]),
});

export const BULBS_EARLIER = Object.freeze({
  text: 'A fixed point attracts when |f′(z₀)| < 1. That number is the derivative from Test 1, read at the landing. For z² + c it is |2z₀|. Inside the orange curve the orbit of 0 settles.',
  ideas: Object.freeze([
    Object.freeze({
      station: 'derivative',
      tone: 'output',
      text: 'The derivative is a zoom. Equation 3.1.1 is that zoom. |f′(z₀)| < 1 is the pull in Theorem 4.2.20.',
      sources: Object.freeze([DERIV_SOURCE]),
    }),
    Object.freeze({
      station: 'mandelbrot',
      tone: 'cart',
      text: 'The set of c. The cardioid is the main body, where the orbit of 0 settles.',
      sources: Object.freeze([MANDELBROT_ANCHOR]),
    }),
    Object.freeze({
      station: 'zero',
      tone: 'input',
      text: 'The orbit of 0, one c at a time. Green is that walk. The period on this stop is the cycle it falls into.',
      sources: Object.freeze([KC_CONNECTED]),
    }),
  ]),
});

// A citation is shown only when the book, the chapter, and the section are all present.
export function citationText(source) {
  if (!source || typeof source !== 'object') return '';
  const book = typeof source.book === 'string' ? source.book.trim() : '';
  const chapter = source.chapter == null ? '' : String(source.chapter).trim();
  const section = source.section == null ? '' : String(source.section).trim();
  if (!book || !chapter || !section) return '';
  return `${book}, Chapter ${chapter}, § ${section}`;
}
