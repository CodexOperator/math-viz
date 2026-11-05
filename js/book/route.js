// Hash routes for the book, separate from the two test maps.
//   #book                  the roadmap
//   #chapter-4             an open chapter
//   #chapter-4-4-1         that chapter, scrolled to section 4.1
//   #chapter-4-4-1-3       that chapter, scrolled to exercise 4.1.3
//   #chapter-1             the roadmap, scrolled to a later chapter
// A leftover token on a later chapter is not a page.

import { OPEN_CHAPTERS } from '../data/book-path.js';

const CHAPTER_RE = /^chapter-(1[01]|[1-9])(?:-(.+))?$/;
const PREP_RE = /^test-prep(?:-(1[01]|[1-9])(?:-(.+))?)?$/;

export function parseBookRoute(token) {
  const raw = String(token || '').replace(/^#/, '').toLowerCase();
  if (raw === 'book') return { kind: 'roadmap', chapter: null, focus: null };
  const prep = PREP_RE.exec(raw);
  if (prep) {
    return {
      kind: 'prep',
      chapter: prep[1] ? Number(prep[1]) : null,
      focus: prep[2] ? prep[2].replace(/-/g, '.') : null,
    };
  }
  const m = CHAPTER_RE.exec(raw);
  if (!m) return null;
  const chapter = Number(m[1]);
  const rest = m[2] || '';
  if (!OPEN_CHAPTERS.includes(chapter)) {
    if (rest) return null;
    return { kind: 'roadmap', chapter, focus: null };
  }
  if (!rest) return { kind: 'chapter', chapter, focus: null };
  return { kind: 'chapter', chapter, focus: rest.replace(/-/g, '.') };
}

// #chapter-4-4-1  and  #chapter-4-4-1-3
export function chapterHash(n, focus) {
  const base = `chapter-${n}`;
  if (!focus) return base;
  return `${base}-${String(focus).replace(/\./g, '-')}`;
}

export function prepHash(chapter, section) {
  if (!chapter) return 'test-prep';
  if (!section) return `test-prep-${chapter}`;
  return `test-prep-${chapter}-${String(section).replace(/\./g, '-')}`;
}
