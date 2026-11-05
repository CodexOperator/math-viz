// One still of each Chapter 4 picture, drawn once. No clock, no drag.
// The colours are the same tokens the Julia station paints with.

import { fillJulia, paintJulia, parseCssColor } from '../core/fractal.js';
import { fillMandelbrot } from '../core/deep-fill.js';

function tokenRgb(name, fallback) {
  let raw = '';
  try { raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch { raw = ''; }
  return parseCssColor(raw) || fallback;
}

export function paintSetStill(canvas, kind, cssPx) {
  if (!canvas || typeof canvas.getContext !== 'function') return false;
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(2, window.devicePixelRatio) : 1;
  const shown = Math.round(Number(cssPx) || canvas.clientWidth || 0);
  if (shown < 8) return false;
  const edge = Math.max(8, Math.round(shown * dpr));
  if (canvas.dataset.edge === String(edge) && canvas.dataset.kind === kind) return true;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return false;
  const w = edge;
  const h = edge;
  canvas.width = w;
  canvas.height = h;
  canvas.dataset.edge = String(edge);
  canvas.dataset.kind = kind;
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
  return true;
}
