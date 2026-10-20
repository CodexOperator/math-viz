// js/data/textbook.js — where a Test 2 idea sits in the course textbook.
//
// Julia and Newton both read this file. The line on the page stays blank until
// book, chapter, and section are all present.
//
// The course book is Howell & Mathews, Complex Analysis, the free open edition
// (CC BY 4.0). HTML numbering.
//
// Chapter 1, § 3 is the slide: addition is the parallelogram of two vectors.
// Chapter 1, § 4 is one multiplication: the product turns by the angle and
// stretches by the length.
// Chapter 1, § 5 repeats that move (a power) and places the roots of unity.
// Chapter 4, § 2 is both pictures: Newton's method, then z^2 + c.
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

export const JULIA_SOURCE = SECTION_42;
export const NEWTON_SOURCE = SECTION_42;

// The moves Test 1 already taught, cited where this book teaches them.
export const SLIDE_SOURCE = section('1', '3', 'sec_geometry-1.html');
export const PRODUCT_SOURCE = section('1', '4', 'sec_geometry-2.html');
export const POWER_SOURCE = section('1', '5', 'sec_algebra-2.html');
export const UNITY_SOURCE = section('1', '5', 'sec_algebra-2.html');

// Cards under each picture. `station` is a place on this branch. The Test 2
// story map, when it lands, is still #home, so these cards do not name a
// station that exists only on that map.
export const JULIA_EARLIER = Object.freeze({
  text: 'Squaring repeats one multiplication: turn by the angle, stretch by the length, then do it again. Adding c is a slide. The colour is what those two moves do from every start.',
  ideas: Object.freeze([
    Object.freeze({
      station: 'powers',
      tone: 'polar',
      text: 'z^2 is that turn and stretch, done twice. On Powers the same move is one point, repeated.',
      sources: Object.freeze([PRODUCT_SOURCE, POWER_SOURCE]),
    }),
    Object.freeze({
      station: 'arithmetic',
      tone: 'cart',
      text: 'Adding c is the slide. The same move is the one you drag on Slide, Spin, Stretch, Mirror.',
      sources: Object.freeze([SLIDE_SOURCE]),
    }),
  ]),
});

export const NEWTON_EARLIER = Object.freeze({
  text: 'The roots open on the cube roots of 1. Those are the roots of unity for n = 3. The book colours z^3 + 1. This picture colours z^3 − 1. The colour still means which root the walk finds.',
  noteSource: NEWTON_SOURCE,
  ideas: Object.freeze([
    Object.freeze({
      station: 'roots',
      tone: 'polar',
      text: 'On Roots, set c = 1 and n = 3. The three points are the same three roots this picture opens on.',
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
