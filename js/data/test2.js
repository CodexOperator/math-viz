// js/data/test2.js — topics for the Test 2 map.
// Each topic cites Howell & Mathews. HTML numbering, with the PDF number in brackets
// where the two editions differ. Exercise numbers are the same in both.

import { sectionHref } from './book.js';

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

const S41 = 'sec_sequences-series.html';
const S42 = 'sec_julia-mandelbrot.html';
const S43 = 'sec_convergence-theorems.html';
const S44 = 'sec_power-series.html';
const S33 = 'sec_harmonic-functions.html';

// scope: 'core' (4.1 and 4.2), 'likely' (4.3 and 4.4), 'possible' (3.3).
export const TEST2_TOPICS = deepFreeze([
  {
    id: 'S1', title: 'Limit of a sequence', station: 'sequence', scope: 'core', thread: 'F1',
    summary: 'A sequence settles when its terms eventually sit in every disk around the limit.',
    source: { section: '§4.1', pin: 'Definition 4.1, page 103', href: sectionHref(S41, 'Seq_Lim_Def') },
  },
  {
    id: 'S2', title: 'Bounded sequences', station: 'sequence', scope: 'core', thread: 'F1',
    summary: 'A convergent sequence is bounded. Section 4.2 uses that fact for orbits.',
    source: { section: '§4.1', pin: 'Definition 4.2, page 104, and Theorem 4.2, page 105', href: sectionHref(S41, 'Bounded_Def') },
  },
  {
    id: 'S3', title: 'Terms of a series go to 0', station: 'series', scope: 'core', thread: 'F1',
    summary: 'If a series converges, its general term goes to 0. The converse is false.',
    source: { section: '§4.1', pin: 'Theorem 4.5, page 106', href: sectionHref(S41, 'Conv_terms_go_to_0') },
  },
  {
    id: 'R1', title: 'An orbit', station: 'repeat', scope: 'core', thread: 'F1',
    summary: 'Start at z and repeat one function. That list is the orbit.',
    source: { section: '§4.2', pin: 'iteration, after the Newton pictures', href: sectionHref(S42) },
  },
  {
    id: 'J0', title: 'The disk at c = 0', station: 'disk', scope: 'core', thread: 'F2',
    summary: 'For z², the filled set is the closed unit disk and the Julia set is the unit circle.',
    source: { section: '§4.2', pin: 'Example 4.9, page 113', href: sectionHref(S42, 'K-0') },
  },
  {
    id: 'J1', title: 'The filled Julia set', station: 'julia', scope: 'core', thread: 'F2',
    summary: 'K_c is every start whose orbit under z² + c stays bounded. The Julia set is the edge of K_c.',
    source: { section: '§4.2', pin: 'K_c, after Example 4.9, page 113', href: sectionHref(S42, 'K-0') },
  },
  {
    id: 'J2', title: 'The slide c', station: 'julia', scope: 'core', thread: 'F2',
    summary: 'c is added at every step. Drag it and every walk changes.',
    source: { section: '§4.2', pin: 'f_c(z) = z² + c', href: sectionHref(S42, 'K-0') },
  },
  {
    id: 'J3', title: 'The orbit of 0', station: 'zero', scope: 'core', thread: 'F2',
    summary: 'The Julia set of z² + c is connected exactly when the orbit of 0 is bounded.',
    source: { section: '§4.2', pin: 'Theorem 4.9, page 113', href: sectionHref(S42, 'Kc_Connected') },
  },
  {
    id: 'N1', title: 'Newton’s step', station: 'newton-step', scope: 'core', thread: 'F3',
    summary: 'From a guess z, step to z − f(z)/f′(z). For z² + 1, five steps from 1/4 + i/4 land on i.',
    source: { section: '§4.2', pin: 'Example 4.7, page 110', href: sectionHref(S42, 'Newton_s_Method_Ex') },
  },
  {
    id: 'N2', title: 'Basins of the roots', station: 'newton', scope: 'core', thread: 'F3',
    summary: 'Paint each start by which root Newton’s method finds. The book colours z³ + 1. This picture colours z³ − 1.',
    source: { section: '§4.2', pin: 'Figure 4.3, page 111', href: sectionHref(S42, 'fig_ch-04-cp-1') },
  },
  {
    id: 'N3', title: 'Half-planes', station: 'half', scope: 'core', thread: 'F3',
    summary: 'For z² + 1, the upper half-plane walks to i and a real seed never leaves the real line.',
    source: { section: '§4.2', pin: 'Example 4.8, page 110 and Exercise 1', href: sectionHref(S42, 'ex_4_8') },
  },
  {
    id: 'M1', title: 'Which c keep 0 bounded', station: 'mandelbrot', scope: 'core', thread: 'F2',
    summary: 'The Mandelbrot set is the c whose orbit of 0 stays bounded. The Julia set of the chosen c is drawn beside it.',
    source: { section: '§4.2', pin: 'Example 4.11, page 115', href: sectionHref(S42, 'Disk__25_in_M') },
  },
  {
    id: 'M2', title: 'Attracting fixed points', station: 'bulbs', scope: 'core', thread: 'F2',
    summary: 'A fixed point with |f′(z₀)| < 1 pulls nearby orbits in. For z² + c that condition is a cardioid.',
    source: { section: '§4.2', pin: 'Definitions 4.9 and 4.10, page 115, and Theorem 4.11, page 116', href: sectionHref(S42, 'Fixed_point_Def') },
  },
  {
    id: 'G1', title: 'Geometric series', station: 'geometric', scope: 'likely', thread: 'F1',
    summary: 'Inside the unit disk, Σ zⁿ = 1/(1 − z). Marked likely: the rest of Chapter 4.',
    source: { section: '§4.3', pin: 'Theorem 4.12, page 118', href: sectionHref(S43, 'Geometric_Series') },
  },
  {
    id: 'W1', title: 'Radius of convergence', station: 'powerseries', scope: 'likely', thread: 'F1',
    summary: 'A power series converges inside a disk and diverges outside it. Marked likely.',
    source: { section: '§4.4', pin: 'Theorems 4.15 and 4.16, pages 124 and 125', href: sectionHref(S44, 'Regions_of_Convergence') },
  },
  {
    id: 'H1', title: 'Harmonic functions', station: 'harmonic', scope: 'possible', thread: '',
    summary: 'The real and imaginary parts of an analytic function are harmonic. Test 1 stopped before this section.',
    source: { section: '§3.3', pin: 'Theorem 3.8, page 95', href: sectionHref(S33, 'Harmonic_Theorem') },
  },
]);

export function test2TopicById(id) {
  return TEST2_TOPICS.find((t) => t.id === id) || null;
}

export const TEST2_PART_LABELS = Object.freeze({
  A: 'Sequences (4.1)',
  B: 'One step (4.2)',
  C: 'Julia (4.2)',
  D: 'Newton (4.2)',
  E: 'Which c (4.2)',
  F: 'Likely (4.3–4.4)',
  G: 'Possible (3.3)',
  H: 'The index and the paper',
  J: 'After the paper',
});
