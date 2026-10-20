// js/data/textbook.js — where a Test 2 idea sits in the course textbook.
//
// Julia and Newton both read this file. The line on the page stays blank until
// book, chapter, and section are all present.
//
// The course book is Howell & Mathews, Complex Analysis, the free open edition
// (CC BY 4.0). Section 4.2, "Julia and Mandelbrot Sets", is the one section that
// treats both pictures: Newton's method for a complex polynomial, then the
// filled Julia set of z^2 + c. In this book that is Chapter 4, section 2.
// https://complexanalysis.org/web/sec_julia-mandelbrot.html

const SECTION_42 = Object.freeze({
  book: 'Howell & Mathews, Complex Analysis',
  chapter: '4',
  section: '2',
  url: 'https://complexanalysis.org/web/sec_julia-mandelbrot.html',
});

export const JULIA_SOURCE = SECTION_42;
export const NEWTON_SOURCE = SECTION_42;

// A citation is shown only when the book, the chapter, and the section are all present.
export function citationText(source) {
  if (!source || typeof source !== 'object') return '';
  const book = typeof source.book === 'string' ? source.book.trim() : '';
  const chapter = source.chapter == null ? '' : String(source.chapter).trim();
  const section = source.section == null ? '' : String(source.section).trim();
  if (!book || !chapter || !section) return '';
  return `${book}, Chapter ${chapter}, § ${section}`;
}
