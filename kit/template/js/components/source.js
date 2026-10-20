// Visible citation. Every station, card, concept, and problem renders one.

import { h } from '../core/dom.js';
import { SITE } from '../registry.js';

export function sourceLabel(source, textbook = SITE.textbook) {
  const parts = [];
  if (textbook && textbook.title) parts.push(textbook.title);
  if (source && source.chapter != null && source.chapter !== '') {
    parts.push(Number(source.chapter) === 0 ? 'Outside the numbered chapters' : `Chapter ${source.chapter}`);
  }
  if (source && source.section) {
    const name = source.sectionTitle ? ` ${source.sectionTitle}` : '';
    parts.push(`§${source.section}${name}`);
  }
  if (source && source.exercise) parts.push(`Exercise ${source.exercise}`);
  return parts.join(' · ');
}

export function sourceTag(source, { id } = {}) {
  const textbook = SITE.textbook || {};
  const label = sourceLabel(source, textbook);
  const p = h('p', {
    class: 'source-tag',
    id,
    'data-chapter': source && source.chapter != null ? String(source.chapter) : '',
    'data-section': source && source.section ? String(source.section) : '',
    'data-exercise': source && source.exercise ? String(source.exercise) : '',
  });
  p.append(h('span', { class: 'source-tag-text', text: label || 'Source missing' }));
  const href = (source && source.url) || textbook.htmlUrl || textbook.url;
  if (href) {
    p.append(h('a', {
      class: 'source-tag-link',
      href,
      rel: 'noopener noreferrer',
    }, 'Open'));
  }
  if (source && source.note) p.append(h('span', { class: 'source-tag-note', text: source.note }));
  return p;
}
