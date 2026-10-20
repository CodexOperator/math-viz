// The connective layer: map neighbours and thread neighbours.

import { h } from '../core/dom.js';
import { neighbours, threadNeighbours, threadLabel, threadLinkPrefix, threadsOn, threadById } from '../registry.js';

function dirLink(station, dir, prefix, thread) {
  const tone = thread ? thread.tone : 'accent';
  const text = `${prefix}${station.title}`;
  return h('a', {
    class: 'station-link',
    href: `#${station.id}`,
    'data-dir': dir,
    'data-tone': tone,
    'data-thread': thread ? thread.id : '',
  }, text);
}

export function tieText(station, ctx) {
  if (station.tie) return station.tie;
  const here = threadsOn(station, ctx.map);
  const names = here.map((id) => threadLabel(id)).filter(Boolean);
  const { prev, next } = neighbours(ctx.stations, station.id);
  const where = prev && next
    ? `On the map this sits after ${prev.title} and before ${next.title}.`
    : prev
      ? `On the map this sits after ${prev.title}.`
      : next
        ? `On the map this sits before ${next.title}.`
        : 'This is the only stop on this map.';
  const through = names.length ? `Threads here: ${names.join('; ')}. ` : '';
  return `${through}${where}`;
}

export function connectiveLinks(station, ctx) {
  const nav = h('nav', { class: 'station-links', 'aria-label': 'Where this place sits on the map' });
  const { prev, next } = neighbours(ctx.stations, station.id);
  if (prev) nav.append(dirLink(prev, 'prev', 'Map previous: ', null));
  if (next) nav.append(dirLink(next, 'next', 'Map next: ', null));
  for (const tid of threadsOn(station, ctx.map)) {
    const thread = threadById(tid);
    const tn = threadNeighbours(ctx.stations, station.id, tid, ctx.map);
    if (tn.prev) nav.append(dirLink(tn.prev, 'prev', threadLinkPrefix(tid, 'prev'), thread));
    if (tn.next) nav.append(dirLink(tn.next, 'next', threadLinkPrefix(tid, 'next'), thread));
  }
  if (!nav.childElementCount) return null;
  return nav;
}
