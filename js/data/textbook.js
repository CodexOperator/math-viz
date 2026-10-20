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
// Chapter 1, § 4 opens as polar form and Arg. The product is later: Identity
// 1.4.10 and Figure 1.4.13, lengths multiply and angles add. The link opens
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

// The moves Test 1 already taught, cited where this book teaches them.
// The printed line is still the section. The url opens on the picture or the
// equation the card is about, because the top of § 4 is Arg and the top of
// § 5 is the power, not the roots.
export const SLIDE_SOURCE = section('1', '3', 'sec_geometry-1.html#fig_ch-01-08');
export const PRODUCT_SOURCE = section('1', '4', 'sec_geometry-2.html#fig_ch-01-17');
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

// A citation is shown only when the book, the chapter, and the section are all present.
export function citationText(source) {
  if (!source || typeof source !== 'object') return '';
  const book = typeof source.book === 'string' ? source.book.trim() : '';
  const chapter = source.chapter == null ? '' : String(source.chapter).trim();
  const section = source.section == null ? '' : String(source.section).trim();
  if (!book || !chapter || !section) return '';
  return `${book}, Chapter ${chapter}, § ${section}`;
}
