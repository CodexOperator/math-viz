// Shared station header and the "on the map" line.

import { h } from '../core/dom.js';
import { proseParts } from '../core/katex.js';
import { threadById, threadLabel, threadsOn, threadsToDraw } from '../registry.js';
import { sourceTag } from './source.js';
import { connectiveLinks, tieText } from './links.js';

export function titleFrag(title) {
  const frag = document.createDocumentFragment();
  for (const part of proseParts(title)) {
    frag.append(part.sup ? h('sup', { class: 'prose-sup', text: part.text }) : document.createTextNode(part.text));
  }
  return frag;
}

export function stationHeader(station, ctx) {
  const header = h('header', { class: 'station-header', id: `${station.id}-header` });
  const h1 = h('h1');
  h1.append(titleFrag(station.title));
  header.append(h1);

  const drawn = new Set(threadsToDraw(ctx.threads, ctx.stations, ctx.map).map((t) => t.id));
  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'Story threads that pass through this place' });
  for (const id of threadsOn(station, ctx.map)) {
    if (!drawn.has(id)) continue;
    const t = threadById(id);
    if (!t) continue;
    badges.append(h('li', {}, h('span', {
      class: 'thread-badge',
      'data-thread': t.id,
      'data-tone': t.tone || 'accent',
      'data-mark': t.mark || 'disc',
      title: t.summary || '',
    }, threadLabel(t))));
  }
  if (badges.childElementCount) header.append(badges);

  if (station.summary) header.append(h('p', { class: 'station-lede', text: station.summary }));
  header.append(sourceTag(station.source, { id: `${station.id}-source` }));
  return header;
}

export function onTheMap(station, ctx) {
  return h('p', { class: 'callout', 'data-tone': 'accent', id: `${station.id}-tie`, text: tieText(station, ctx) });
}

export function stationFooter(station, ctx) {
  return connectiveLinks(station, ctx);
}
