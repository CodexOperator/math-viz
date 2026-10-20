// The matrix board on both homes. Rows are what a picture shows. Columns are
// the stage of the move. The serpentine map below is still the book's walk.

import { matrixGrid, matrixOf } from '../data/matrix.js';
import { shortTitle } from './problems.js';

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
  const grid = matrixGrid(stations);
  const board = h('div', { class: 'matrix-board', id: 'matrix-board', 'data-map': mapId || '' });
  for (const row of grid) {
    const block = h('section', { class: 'matrix-row', 'data-row': row.id });
    block.append(
      h('h3', { class: 'matrix-row-title', id: `matrix-${row.id}` }, `${row.id} · ${row.title}`),
      h('p', { class: 'matrix-row-note' }, row.note),
    );
    const stages = h('div', { class: 'matrix-stages' });
    for (const stage of row.stages) {
      const cell = h('div', { class: 'matrix-cell', 'data-stage': stage.id });
      cell.append(h('p', { class: 'matrix-stage' }, stage.title));
      const chips = h('div', { class: 'chips' });
      for (const st of stage.stations) {
        const meta = matrixOf(st.id);
        const a = h('a', { class: 'chip', href: `#${st.id}`, id: `matrix-${st.id}` }, shortTitle(st.title));
        if (meta && meta.shadow) a.dataset.shadow = meta.shadow;
        if (meta && meta.side) a.dataset.side = 'true';
        chips.append(a);
        if (meta && meta.note) cell.append(h('p', { class: 'matrix-cell-note', id: `matrix-note-${st.id}` }, meta.note));
      }
      cell.append(chips);
      stages.append(cell);
    }
    block.append(stages);
    board.append(block);
  }
  return h('section', { class: 'panel', id: 'home-matrix', 'aria-labelledby': 'home-matrix-title' },
    h('h2', { id: 'home-matrix-title' }, 'One course, five pictures'),
    h('p', { class: 'muted', id: 'home-matrix-lede' },
      'Each row is what the picture shows. The codes are the same ones on the map above. Layout puts the objects down, reveal shows a name that was hidden, transform carries them, emphasize singles one feature out. These are the same stops, grouped so a picture is easier to find.'),
    board);
}
