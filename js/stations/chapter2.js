// Chapter 2. The chapter loop fills this page. The shell only requires mount,
// and the route's section or exercise is ctx.book.focus (2.1, or 2.1.3).

import { bookChapter } from '../data/book-path.js';
import { h } from './test2-ui.js';

function sectionFor(focus) {
  const ch = bookChapter(2);
  if (!ch || !focus) return null;
  return ch.sections.find((s) => focus === s.id || String(focus).startsWith(`${s.id}.`)) || null;
}

export function mount(el, ctx) {
  const focus = ctx && ctx.book ? ctx.book.focus : null;
  const section = sectionFor(focus);
  const lede = section
    ? `${section.id} ${section.title}. Page ${section.page}.`
    : 'Five sections, from linear maps to the reciprocal.';
  el.append(
    h('header', { class: 'station-header' },
      h('a', { class: 'station-link', id: 'chapter-back', href: '#book', 'data-dir': 'prev' }, 'The Book'),
      h('h1', { id: 'chapter-title' }, 'Chapter 2. Complex Functions'),
      h('p', { class: 'where-line', id: 'where-line' }, 'Chapter 2 · Complex Functions'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, lede),
      h('p', { class: 'book-page', id: 'chapter-focus' }, focus ? `Open at ${focus}.` : 'The chapter, from the start.')),
    h('a', { class: 'station-link', id: 'chapter-back-end', href: '#book', 'data-dir': 'prev' }, 'The Book'));
  return function unmount() {};
}
