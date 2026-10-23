// One picture of a Julia set, a Mandelbrot set, or Newton basins.
// The worker and the page both call this. Colours are already {r,g,b}.

import { paintJulia, paintNewton } from './fractal.js';
import { fillAutoJulia, fillAutoMandelbrot, fillAutoNewton, iterForWidth } from './deep-fill.js';

export function renderSet(spec) {
  const w = spec.w | 0;
  const h = spec.h | 0;
  const y0 = spec.y0 | 0;
  const y1 = spec.y1 == null ? h : spec.y1 | 0;
  const field = spec.field || new Float32Array(w * h);
  const view = spec.view;
  const iter = spec.maxIter | 0;
  if (spec.kind === 'newton') {
    fillAutoNewton(field, w, h, y0, y1, view, spec.roots || [], iter, spec.tol2 || 1e-4);
  } else if (spec.kind === 'mandelbrot') {
    fillAutoMandelbrot(field, w, h, y0, y1, view, iter, spec.escape2 || 4);
  } else {
    fillAutoJulia(field, w, h, y0, y1, view, spec.c || { re: 0, im: 0 }, iter, spec.escape2 || 4);
  }
  return field;
}

export function paintSet(pixels, field, spec) {
  const w = spec.w | 0;
  const h = spec.h | 0;
  const y0 = spec.y0 | 0;
  const y1 = spec.y1 == null ? h : spec.y1 | 0;
  if (spec.kind === 'newton') {
    paintNewton(pixels, field, w, h, y0, y1, spec.colours);
  } else {
    const colours = spec.colours || {};
    paintJulia(pixels, field, w, h, y0, y1, spec.maxIter, colours.inside, colours.slow, colours.fast);
  }
}

export function suggestIter(kind, view, draft) {
  const base = kind === 'newton' ? 24 : kind === 'mandelbrot' ? 64 : 40;
  const full = iterForWidth(view && view.unitsAcross, base);
  if (!draft) return full;
  return Math.max(24, Math.min(full, Math.round(full * 0.55)));
}
