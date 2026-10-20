// The course, read through the manim-hyperframes matrix.
//
// A row is WHAT the picture shows. A stage is how that picture moves:
//   layout     the objects are put down
//   reveal     something that was hidden appears (a name, a seam, a jump)
//   transform  a motion carries the picture somewhere else
//   emphasize  one feature is singled out (agreement, a root, a fate)
//
// The Story Map still walks the book. This table is the other door: the same
// stops, grouped so Test 1 and Test 2 are one course. `shadow` is a stop that
// shows a picture another stop already draws. `side` is off the Next path.

export const MATRIX_ROWS = Object.freeze([
  Object.freeze({ id: 'R21', title: 'Complex plane', note: 'One point, its addresses, and the regions it lives in.' }),
  Object.freeze({ id: 'R2', title: 'Linear maps', note: 'Turn, stretch, and slide. Multiplication is this row.' }),
  Object.freeze({ id: 'R14', title: 'Flows', note: 'A point moving in time. z(t), then the same move done again.' }),
  Object.freeze({ id: 'R11', title: 'Functions and limits', note: 'A motion of the plane, then the question of whether every direction agrees.' }),
  Object.freeze({ id: 'R16', title: 'Sequences and limits', note: 'Do the motion again. The list settles, stays, or leaves.' }),
]);

export const MATRIX_STAGES = Object.freeze([
  Object.freeze({ id: 'layout', title: 'Layout' }),
  Object.freeze({ id: 'reveal', title: 'Reveal' }),
  Object.freeze({ id: 'transform', title: 'Transform' }),
  Object.freeze({ id: 'emphasize', title: 'Emphasize' }),
]);

// Doors are on the map and not in a cell: the map itself, and the indexes.
const CELLS = Object.freeze({
  addresses: { row: 'R21', stage: 'layout' },
  distance: { row: 'R21', stage: 'layout' },
  sets: { row: 'R21', stage: 'layout' },
  disk: { row: 'R21', stage: 'layout' },
  staircase: { row: 'R21', stage: 'reveal' },
  'principal-root': { row: 'R21', stage: 'reveal' },
  branches: { row: 'R21', stage: 'reveal' },
  powers: { row: 'R21', stage: 'transform' },
  roots: { row: 'R21', stage: 'transform' },
  julia: { row: 'R21', stage: 'transform' },
  arithmetic: { row: 'R2', stage: 'transform' },
  linear: { row: 'R2', stage: 'transform' },
  curves: { row: 'R14', stage: 'transform' },
  repeat: { row: 'R14', stage: 'transform' },
  mappings: { row: 'R11', stage: 'transform' },
  powermap: { row: 'R11', stage: 'transform' },
  reciprocal: { row: 'R11', stage: 'transform' },
  lab: { row: 'R11', stage: 'transform' },
  graph4d: { row: 'R11', stage: 'layout', shadow: 'lab', note: 'The lab already turns this graph. This stop opens that one view on its own.' },
  limits: { row: 'R11', stage: 'emphasize' },
  derivative: { row: 'R11', stage: 'emphasize' },
  'cauchy-riemann': { row: 'R11', stage: 'emphasize' },
  'newton-step': { row: 'R11', stage: 'transform' },
  newton: { row: 'R11', stage: 'emphasize' },
  half: { row: 'R11', stage: 'emphasize' },
  harmonic: { row: 'R11', stage: 'emphasize', side: true, note: 'Section 3.3, marked possible. Not on Next.' },
  sequence: { row: 'R16', stage: 'reveal' },
  series: { row: 'R16', stage: 'emphasize' },
  zero: { row: 'R16', stage: 'emphasize' },
  seeds: { row: 'R16', stage: 'layout', note: 'The set of c is this orbit, collected. The page states it and does not draw it.' },
  geometric: { row: 'R16', stage: 'transform' },
  powerseries: { row: 'R16', stage: 'layout' },
  paper: { row: 'R16', stage: 'emphasize' },
});

export function matrixOf(id) {
  return CELLS[id] || null;
}

export function matrixRows() {
  return MATRIX_ROWS;
}

export function matrixStages() {
  return MATRIX_STAGES;
}

// Stations of one map, grouped into row × stage. Map order is kept inside a cell.
export function matrixGrid(stations) {
  const list = (stations || []).filter((s) => s && s.id !== 'home' && matrixOf(s.id));
  return MATRIX_ROWS.map((row) => ({
    ...row,
    stages: MATRIX_STAGES.map((stage) => ({
      ...stage,
      stations: list.filter((s) => {
        const c = matrixOf(s.id);
        return c && c.row === row.id && c.stage === stage.id;
      }),
    })).filter((stage) => stage.stations.length),
  })).filter((row) => row.stages.length);
}
