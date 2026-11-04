// How much picture a step buys, and how far one click of zoom moves.
//
// The moving frame at the default step (0.08) is the old coarse picture.
// A smaller step asks for more pixels, in proportion to 0.08 / step, until
// four times the pixels. Past that, a moving frame would freeze the tab, so
// the count stops and `capped` is true. Iterations on that moving frame stay
// put: the zoom is what adds iterations.

export const DETAIL_BASE_STEP = 0.08;
export const DETAIL_PIXEL_CAP = 4;

function positive(step, fallback) {
  const s = Math.abs(Number(step));
  return Number.isFinite(s) && s > 0 ? s : fallback;
}

export function detailForStep(step, opts = {}) {
  const baseStep = positive(opts.baseStep, DETAIL_BASE_STEP);
  const baseEdge = Math.max(2, opts.baseEdge ?? 96);
  const baseIter = Math.max(1, Math.round(opts.baseIter ?? 24));
  const longEdge = Math.max(baseEdge, opts.longEdge ?? 480);
  const pixelCap = opts.pixelCap ?? DETAIL_PIXEL_CAP;
  const quantum = positive(step, baseStep);
  const asked = baseStep / quantum;
  const pixelRatio = Math.min(pixelCap, Math.max(1, asked));
  let edge = Math.round(baseEdge * Math.sqrt(pixelRatio));
  edge = Math.max(baseEdge, Math.min(longEdge, edge));
  return {
    edge,
    iter: baseIter,
    asked,
    pixelRatio,
    pixels: edge * edge,
    capped: asked > pixelCap + 1e-9,
  };
}

// One click divides the width by this factor.
// 0.08 zooms by 1.08, the same rule as before. A step so small that 1 + step
// does not move a pixel used to leave live zoom looking frozen. The floor is
// two percent. The ceiling keeps the largest step a small jump.
export function zoomFactorOf(step) {
  const s = Math.abs(Number(step) || 0);
  let raw = 1 + (s > 0 ? s : DETAIL_BASE_STEP);
  if (!(raw > 1)) raw = 1 + DETAIL_BASE_STEP;
  if (raw < 1.02) return 1.02;
  if (raw > 1.25) return 1.25;
  return raw;
}
