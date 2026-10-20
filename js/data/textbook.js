// js/data/textbook.js — where a Test 2 idea sits in the course textbook.
//
// Julia and Newton both read this file. The line on the page stays blank until
// an entry names a book this repo already names. Do not invent a title, a
// chapter, or a section.
//
// When the book is known, set the station to
//   { book: 'Title', chapter: '4', section: '3' }
// and the shared layout prints "Textbook: Title, Chapter 4, § 3."

export const JULIA_SOURCE = null;
export const NEWTON_SOURCE = null;

// A citation is shown only when the book, the chapter, and the section are all present.
export function citationText(source) {
  if (!source || typeof source !== 'object') return '';
  const book = typeof source.book === 'string' ? source.book.trim() : '';
  const chapter = source.chapter == null ? '' : String(source.chapter).trim();
  const section = source.section == null ? '' : String(source.section).trim();
  if (!book || !chapter || !section) return '';
  return `${book}, Chapter ${chapter}, § ${section}`;
}
