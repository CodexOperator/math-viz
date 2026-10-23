// The course, read through the manim-hyperframes matrix.
//
// THROUGHLINE is what both homes draw: the one motion, across the two tests.
// The cell table under it is the classification record. It is not a second
// catalog. A stage name (layout, reveal, transform, emphasize) is how a film
// is built. It is not a lesson, and the map banners do not teach it.
//
// A row in the record is WHAT the picture shows. A stage is how that picture
// moves. `shadow` is a stop that shows a picture another stop already draws.
// `side` is off the Next path.

// The chain a learner can walk. Each row names the mark and the sentence that
// flips. Stops on the other test are still listed; the board says which test.
export const THROUGHLINE = Object.freeze([
  Object.freeze({
    id: 'R2',
    title: 'The turn',
    note: 'Watch the arrow. It turns by an angle, then stretches by a length. The sentence flips from turn, to stretch, to land.',
    stops: Object.freeze([
      Object.freeze({ id: 'arithmetic', label: 'Multiply' }),
      Object.freeze({ id: 'powers', label: 'Powers' }),
    ]),
  }),
  Object.freeze({
    id: 'R21',
    title: 'That angle, divided',
    note: 'Watch the stair. Divide the turn by n. The sentence flips when step n lands on step 0.',
    stops: Object.freeze([
      Object.freeze({ id: 'staircase', label: 'The staircase' }),
      Object.freeze({ id: 'roots', label: 'Roots of unity' }),
    ]),
  }),
  Object.freeze({
    id: 'R16',
    title: 'The same move, again',
    note: 'Watch the latest step. Squaring is that turn with w equal to z. The sentence flips: settles, stays, or leaves. On Newton the colour is which root.',
    stops: Object.freeze([
      Object.freeze({ id: 'sequence', label: 'A sequence' }),
      Object.freeze({ id: 'zero', label: 'Orbit of 0' }),
      Object.freeze({ id: 'julia', label: 'Julia' }),
      Object.freeze({ id: 'newton', label: 'Newton' }),
    ]),
  }),
]);

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
  mandelbrot: { row: 'R16', stage: 'layout', note: 'The set of c, drawn. The Julia set of the chosen c sits beside it.' },
  bulbs: { row: 'R16', stage: 'emphasize', note: 'The main cardioid, and the period read from the orbit of 0.' },
  seeds: { row: 'R16', stage: 'layout', note: 'The exercises on the set of c. The picture is the Mandelbrot stop.' },
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
