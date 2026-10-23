// The set of c whose orbit of 0 stays bounded. The book names it the Mandelbrot set.

import { mountFamily } from './mandelbrot-family.js';
import { MANDELBROT_SOURCE } from '../data/textbook.js';

const PRESETS = [
  { id: 'inside', label: 'c = −0.5', re: -0.5, im: 0 },
  { id: 'disk', label: 'c = 0.2', re: 0.2, im: 0 },
  { id: 'cusp', label: 'c = 1/4', re: 0.25, im: 0 },
  { id: 'out', label: 'c = 0.4', re: 0.4, im: 0 },
];

export function mount(el, ctx) {
  return mountFamily(el, ctx, {
    id: 'mandelbrot',
    source: MANDELBROT_SOURCE,
    filmId: 'boundary',
    c0: { re: -0.5, im: 0 },
    presets: PRESETS,
    lede: 'The Mandelbrot set is the c for which the orbit of 0 under z² + c stays bounded. Example 4.2.16 [PDF Example 4.11] puts the disk |c| ≤ 1/4 inside it. Theorem 4.2.11 [PDF Theorem 4.9] says the Julia set is one piece exactly when that orbit stays. Drag c, or turn on Loop and watch the Julia set as c crosses the edge. Figure 4.2.13 is the book’s picture of the set. PDF number not checked.',
    ruleTitle: 'The map of c',
    ruleText: 'Blue means the orbit of 0 stayed. Orange means it left. The orange point is one c. The small picture is the Julia set of the c under the pointer, or of that point.',
    pictureTitle: 'The set of c',
    pictureCaption: 'Loop draws a path on this picture. The Julia set beside it is the set of that c: one piece while c is inside, dust after c leaves.',
    aria: 'The Mandelbrot set. Drag the orange point to choose c. The Julia set of that c is beside it.',
    cardioid: false,
    tex: 'z_{n+1} = z_n^2 + c',
  });
}
