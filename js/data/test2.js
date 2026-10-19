// js/data/test2.js — topics for the Test 2 map (Julia sets and Newton fractals).
// Pure data. No imports, no DOM. Test 1 topics stay in js/data/problems.js.

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

// J* opens the Julia station, N* opens Newton. The router turns J1 into #topic-J1.
export const TEST2_TOPICS = deepFreeze([
  {
    id: 'J1', title: 'The filled Julia set', station: 'julia',
    summary: 'Start at a point and repeat “square, then add c”. If the walk never runs away from 0, the point is in the filled Julia set. That is the solid region.',
  },
  {
    id: 'J2', title: 'The slide c', station: 'julia',
    summary: 'c is added at every step. It is a slide. Drag it and the solid region changes shape, because every walk uses the new slide.',
  },
  {
    id: 'N1', title: 'Newton’s step', station: 'newton',
    summary: 'From a guess z, Newton’s step goes to where the tangent line of p hits zero: z minus p(z) over p′(z). Do it again. The green walk is those steps.',
  },
  {
    id: 'N2', title: 'Basins of the roots', station: 'newton',
    summary: 'Paint each starting guess by which root it finds. That colour is the basin of the root. Drag the root and the basin moves with it.',
  },
]);

export function test2TopicById(id) {
  return TEST2_TOPICS.find((t) => t.id === id) || null;
}
