// The chain under the Story Map. The map is the book's walk. This strip is
// the one motion that walk is made of, across both tests. It is not a second
// list of every stop.

import { THROUGHLINE } from '../data/matrix.js';
import { stationById, mapOf } from '../registry.js';

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return n;
}

export function mountMatrixBoard(stations, mapId) {
  const here = mapId === 'test2' ? 'test2' : 'test1';
  const known = new Map((stations || []).filter((s) => s && s.id).map((s) => [s.id, s]));
  const board = h('div', { class: 'matrix-board', id: 'matrix-board', 'data-map': here });
  for (const row of THROUGHLINE) {
    const block = h('section', { class: 'matrix-row', 'data-row': row.id });
    block.append(
      h('h3', { class: 'matrix-row-title', id: `matrix-${row.id}` }, row.title),
      h('p', { class: 'matrix-row-note' }, row.note),
    );
    const chips = h('div', { class: 'chips' });
    for (const stop of row.stops) {
      const st = known.get(stop.id) || stationById(stop.id);
      if (!st) continue;
      const owned = mapOf(st);
      const other = owned !== 'shared' && owned !== here;
      const prefix = !other ? '' : (owned === 'test2' ? 'Test 2, ' : 'Test 1, ');
      const a = h('a', { class: 'chip', href: `#${stop.id}`, id: `matrix-${stop.id}` }, prefix + stop.label);
      if (other) a.dataset.map = owned;
      chips.append(a);
    }
    block.append(chips);
    board.append(block);
  }
  return h('section', { class: 'panel', id: 'home-matrix', 'aria-labelledby': 'home-matrix-title' },
    h('h2', { id: 'home-matrix-title' }, 'The same turn'),
    h('p', { class: 'muted', id: 'home-matrix-lede' },
      'The map above is the book’s walk. These three rows are the one motion that walk is made of. A chip that names the other test switches the map. The switch at the top brings you back.'),
    board);
}
