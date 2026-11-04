// One still of each Chapter 4 picture, drawn once. No clock, no drag.
// The colours are the same tokens the Julia station paints with.

import { fillJulia, paintJulia, parseCssColor } from '../core/fractal.js';
import { fillMandelbrot } from '../core/deep-fill.js';

const EDGE = 160;

function tokenRgb(name, fallback) {
  let raw = '';
  try { raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch { raw = ''; }
  return parseCssColor(raw) || fallback;
}

export function paintSetStill(canvas, kind) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const w = EDGE;
  const h = EDGE;
  canvas.width = w;
  canvas.height = h;
  const field = new Float32Array(w * h);
  const iter = kind === 'julia' ? 40 : 48;
  const view = kind === 'julia'
    ? { centerRe: 0, centerIm: 0, unitsAcross: 3.2 }
    : { centerRe: -0.5, centerIm: 0, unitsAcross: 3.2 };
  if (kind === 'julia') fillJulia(field, w, h, 0, h, view, { re: 0, im: 0 }, iter, 4);
  else fillMandelbrot(field, w, h, 0, h, view, iter, 4);
  const img = ctx.getImageData(0, 0, w, h);
  paintJulia(
    img.data, field, w, h, 0, h, iter,
    tokenRgb('--cart', { r: 11, g: 99, b: 173 }),
    tokenRgb('--polar', { r: 168, g: 67, b: 0 }),
    tokenRgb('--surface-2', { r: 236, g: 232, b: 222 }),
  );
  ctx.putImageData(img, 0, 0);
}
