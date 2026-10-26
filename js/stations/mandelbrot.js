// The set of c whose orbit of 0 stays bounded. The book names it the Mandelbrot set.

import { mountFamily } from './mandelbrot-family.js';
import { MANDELBROT_SOURCE, MANDELBROT_EARLIER } from '../data/textbook.js';

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
    lede: 'Square, then slide, done again for every c. The orbit of 0 settles into a cycle, stays bounded without settling, or leaves. The Mandelbrot set is the c for which that orbit does not leave. Example 4.11, page 115 puts the disk |c| ≤ 1/4 inside it. Theorem 4.9, page 113 says the Julia set is one piece exactly when that orbit stays bounded. Drag the orange point, or turn on Loop and watch the Julia set as c crosses the edge. Figure 4.6, page 114 is the book’s picture of the set.',
    ruleTitle: 'The map of c',
    ruleText: 'Settles and stays are blue. Leaves is orange. The orange point is one c. The small picture is the Julia set of the c under the pointer, or of that point. Green there is the walk from z₀.',
    pictureTitle: 'The set of c',
    pictureCaption: 'Loop draws the path of c in orange, the same colour as the point. The Julia set beside it is one piece while the orbit of 0 stays bounded, and dust once that orbit leaves.',
    earlier: MANDELBROT_EARLIER,
    aria: 'The Mandelbrot set. Drag the orange point to choose c. The Julia set of that c is beside it.',
    cardioid: false,
    tex: 'z_{n+1} = z_n^2 + c',
    rendered: {
      films: [
        {
          id: 'leaving',
          label: 'Leaving into dust',
          caption: 'The Julia set is one piece while the orbit of 0 stays bounded, and dust once that orbit leaves.',
          landscape: 'media/films/leaving-1280x720.mp4',
          portrait: 'media/films/leaving-720x1280.mp4',
          posterLand: 'media/films/leaving-1280x720.png',
          posterPort: 'media/films/leaving-720x1280.png',
          frames: 'media/films/leaving-frames.jsonl',
        },
        {
          id: 'minibrot',
          label: 'Deep zoom to a minibrot',
          caption: 'A deep zoom, centred on a period-70 nucleus. The copy is the set again, smaller.',
          landscape: 'media/films/minibrot-1280x720.mp4',
          portrait: 'media/films/minibrot-720x1280.mp4',
          posterLand: 'media/films/minibrot-1280x720.png',
          posterPort: 'media/films/minibrot-720x1280.png',
          frames: 'media/films/minibrot-frames.jsonl',
          // k = 570 is the clock tick after the last written frame.
          maxK: 569,
          cite: {
            text: 'Wikimedia Commons, File:Mandelbrot_sequence_new.gif',
            url: 'https://commons.wikimedia.org/wiki/File:Mandelbrot_sequence_new.gif',
            note: 'That file picks the neighbourhood. The period-70 nucleus is this picture\'s Newton solve.',
          },
        },
        {
          id: 'boundary',
          label: 'c crosses the cardioid',
          kind: 'page',
        },
      ],
    },
  });
}
