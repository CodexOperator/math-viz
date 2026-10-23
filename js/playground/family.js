// A 2D slice of the (z, c) family. t = 0 is the set of c (z0 = 0).
// t = 1 is the Julia set at the pinned c. The plane between them is
// z = w sin φ, c = c0 sin φ + w cos φ, with φ = t · π/2.
// No clock and no model. The same t and w always give the same point.

export function clamp01(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function slicePhi(t) {
  return clamp01(t) * Math.PI / 2;
}

// The ends are exact. cos(π/2) is not 0 in floating point, and the Julia end must hold c.
function sliceSinCos(t) {
  const u = clamp01(t);
  if (u <= 0) return { phi: 0, s: 0, co: 1 };
  if (u >= 1) return { phi: Math.PI / 2, s: 1, co: 0 };
  const phi = u * Math.PI / 2;
  return { phi, s: Math.sin(phi), co: Math.cos(phi) };
}

// w and cPin are [re, im]. Returns the point of C² on this slice.
export function sliceLift(w, t, cPin) {
  const { phi, s, co } = sliceSinCos(t);
  const pin = Array.isArray(cPin) ? cPin : [0, 0];
  const wr = Number(w && w[0]) || 0;
  const wi = Number(w && w[1]) || 0;
  const pr = Number(pin[0]) || 0;
  const pi = Number(pin[1]) || 0;
  return {
    phi,
    z: [wr * s, wi * s],
    c: [pr * s + wr * co, pi * s + wi * co],
  };
}

// The set of c sits left of 0. A Julia set sits on 0. The bias slides
// the window with φ and does not change the stored centre.
export function sliceCenter(win, t) {
  const { co } = sliceSinCos(t);
  const cx = win && Number.isFinite(win.cx) ? win.cx : 0;
  const cy = win && Number.isFinite(win.cy) ? win.cy : 0;
  return { cx: cx - 0.55 * co, cy };
}

export function sliceEnds(t) {
  const u = clamp01(t);
  if (u < 0.04) return 'mandel';
  if (u > 0.96) return 'julia';
  return 'between';
}
