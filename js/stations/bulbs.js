// The main cardioid, and the period read from the orbit of 0.

import { mountFamily } from './mandelbrot-family.js';
import { BULBS_SOURCE, BULBS_EARLIER } from '../data/textbook.js';

const PRESETS = [
  { id: 'cardioid', label: 'c = 0', re: 0, im: 0 },
  { id: 'period2', label: 'c = −1', re: -1, im: 0 },
  { id: 'basilica', label: 'c = −0.75', re: -0.75, im: 0 },
  { id: 'out', label: 'c = 0.3', re: 0.3, im: 0 },
];

export function mount(el, ctx) {
  return mountFamily(el, ctx, {
    id: 'bulbs',
    source: BULBS_SOURCE,
    c0: { re: 0, im: 0 },
    presets: PRESETS,
    lede: 'Theorem 4.2.20 [PDF Theorem 4.11] says a fixed point with |f′(z₀)| < 1 pulls nearby orbits in. That pull is settles: the orbit of 0 falls into one disk. For z² + c the condition is the main cardioid, drawn here in orange. A longer cycle settles into one disk for each point of the cycle. If the orbit leaves, the period is 0 and the Julia set is dust. Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10] name an attracting fixed point. Higher bulbs are not outlined: the book draws them in Figure 4.2.13, and that figure’s PDF number was not checked.',
    ruleTitle: 'Period, from the orbit of 0',
    ruleText: 'Pick c. The line names the period of the orbit of 0. Period 1 settles into one disk: that is the main cardioid. A longer cycle settles into that many disks. If those places overlap on this screen, Zoom to the clusters separates them. The outline does not draw those bulbs. If the orbit leaves, the period is 0 and the Julia set is dust. Loop rides this cardioid.',
    pictureTitle: 'The cardioid',
    pictureCaption: 'The orange curve is the main cardioid, c = λ/2 − λ²/4 for |λ| = 1. It is the boundary of the fixed-point condition in Theorem 4.2.20. Inside it, the orbit of 0 settles. A loop path of c is the same orange.',
    earlier: BULBS_EARLIER,
    aria: 'The Mandelbrot set with the main cardioid outlined. Drag c to read the period of the orbit of 0.',
    cardioid: true,
    path: 'cardioid',
    tex: 'c = \\lambda/2 - \\lambda^2/4',
    rendered: {
      landscape: 'media/films/cardioid-1280x720.mp4',
      portrait: 'media/films/cardioid-720x1280.mp4',
      posterLand: 'media/films/cardioid-1280x720.png',
      posterPort: 'media/films/cardioid-720x1280.png',
      frames: 'media/films/cardioid-frames.jsonl',
    },
  });
}
