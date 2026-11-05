// Pure pictures for the Chapter 3 stages. No DOM.
// Colours stay in the page: green is the hand, purple is the image, blue is the axes, orange is an angle.
// A claim is true of one state and false of another.

const TAU = Math.PI * 2;

export function wrapPi(rad) {
  let x = rad % TAU;
  if (x <= -Math.PI) x += TAU;
  if (x > Math.PI) x -= TAU;
  return x;
}

export function fmtDeg(rad) {
  if (!Number.isFinite(rad)) return '';
  let d = Math.round((wrapPi(rad) * 180) / Math.PI);
  if (d === -180) d = 180;
  return `${d}°`;
}

export function fmtStretch(x) {
  if (!Number.isFinite(x)) return '';
  if (Math.abs(x) < 1e-9) return '0';
  const n = x / Math.SQRT2;
  if (Math.abs(n - Math.round(n)) < 1e-6) {
    const k = Math.round(n);
    if (k === 1) return '√2';
    if (k === -1) return '−√2';
    return `${k}√2`;
  }
  if (Math.abs(x - Math.round(x)) < 1e-6) return String(Math.round(x));
  const t = Math.round(x * 100) / 100;
  return String(t);
}

function fmtCoord(x) {
  if (!Number.isFinite(x) || Math.abs(x) < 1e-9) return '0';
  if (Math.abs(x - Math.round(x)) < 1e-6) return String(Math.round(x));
  return String(Math.round(x * 100) / 100);
}

export function fmtPoint(re, im) {
  const a = fmtCoord(re);
  const b = fmtCoord(im);
  if (b === '0') return a;
  const imag = b === '1' ? 'i' : b === '-1' ? '-i' : (b.startsWith('-') ? `-${b.slice(1)}i` : `${b}i`);
  if (a === '0') return imag;
  if (imag.startsWith('-')) return `${a} - ${imag.slice(1)}`;
  return `${a} + ${imag}`;
}

// Circles at the origin have nothing to compare. Put the point back on the opening spot.
export function circleComparePoint(z) {
  const re = Number(z && z.re) || 0;
  const im = Number(z && z.im) || 0;
  if (Math.hypot(re, im) < 1e-8) return { re: 1, im: 0.45 };
  return { re, im };
}

function rot(x, y, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [c * x - s * y, s * x + c * y];
}

// Stage 3.1. The clock owns the direction. The hand owns the base point.
// z² multiplies every step by the same number. conj mirrors the step.
export function derivativeScene(fn, z, phi) {
  const re = Number(z && z.re);
  const im = Number(z && z.im);
  const angle = Number(phi) || 0;
  const h = { re: Math.cos(angle), im: Math.sin(angle) };
  if (fn === 'conj') {
    const image = { re: h.re, im: -h.im };
    const turn = wrapPi(Math.atan2(image.im, image.re) - angle);
    return {
      fn: 'conj',
      h,
      image,
      stretch: 1,
      turn,
      claim: {
        holds: false,
        text: `The purple arrow mirrors the green one. The turn is ${fmtDeg(turn)}, and it moves.`,
      },
    };
  }
  const fp = { re: 2 * re, im: 2 * im };
  const stretch = Math.hypot(fp.re, fp.im);
  const image = {
    re: fp.re * h.re - fp.im * h.im,
    im: fp.re * h.im + fp.im * h.re,
  };
  const turn = stretch < 1e-9 ? 0 : Math.atan2(fp.im, fp.re);
  const home = Math.abs(re - 1) < 1e-9 && Math.abs(im - 1) < 1e-9;
  let text;
  if (stretch < 1e-9) text = 'The stretch is 0. Every direction agrees, so the derivative is 0.';
  else if (home) text = `The turn stays ${fmtDeg(turn)} and the stretch stays ${fmtStretch(stretch)}, for every direction.`;
  else text = `At ${fmtPoint(re, im)}, the turn is ${fmtDeg(turn)} and the stretch is ${fmtStretch(stretch)}.`;
  const claim = { holds: true, text };
  return { fn: 'sq', h, image, stretch, turn, claim };
}

// Stage 3.2. A tiny square, one corner marked, and its image.
// "Turn" is multiplication by 1+i. "Stretch" is x + 2iy.
export function squareScene(mode, theta) {
  const s = 1;
  const local = [[s, s], [-s, s], [-s, -s], [s, -s]];
  const corners = local.map(([x, y]) => rot(x, y, theta));
  const image = corners.map(([x, y]) => (mode === 'stretch' ? [x, 2 * y] : [x - y, x + y]));
  const sideA = [image[1][0] - image[0][0], image[1][1] - image[0][1]];
  const sideB = [image[3][0] - image[0][0], image[3][1] - image[0][1]];
  const lenA = Math.hypot(sideA[0], sideA[1]);
  const lenB = Math.hypot(sideB[0], sideB[1]);
  const dot = sideA[0] * sideB[0] + sideA[1] * sideB[1];
  const cross = sideA[0] * sideB[1] - sideA[1] * sideB[0];
  const right = Math.abs(dot) <= 0.04 * lenA * lenB;
  const equal = Math.abs(lenA - lenB) <= 0.04 * Math.max(lenA, lenB);
  const square = right && equal && cross > 0;
  let text;
  if (square) text = 'Right angle, equal sides, and the marked corner still leads. A square.';
  else if (right) text = 'A right angle, and the sides are not equal. Not a square.';
  else if (equal) text = 'Equal sides, and not a right angle. Not a square.';
  else text = 'Neither a right angle nor equal sides. Not a square.';
  return { mode: mode === 'stretch' ? 'stretch' : 'turn', corners, image, claim: { holds: square, text } };
}

// Stage 3.3. Orange levels of u = x² − y². Purple levels of a conjugate, or of circles.
export function levelScene(mode, x, y) {
  const px = Number(x) || 0;
  const py = Number(y) || 0;
  const gu = [2 * px, -2 * py];
  const gv = mode === 'circles' ? [2 * px, 2 * py] : [2 * py, 2 * px];
  const au = Math.hypot(gu[0], gu[1]);
  const av = Math.hypot(gv[0], gv[1]);
  const u = px * px - py * py;
  const v = mode === 'circles' ? px * px + py * py : 2 * px * py;
  if (au < 1e-8 || av < 1e-8) {
    return {
      mode: mode === 'circles' ? 'circles' : 'conj',
      u, v, gu, gv,
      claim: { holds: false, text: 'Both slopes vanish, so there is no angle to read.' },
    };
  }
  const dot = gu[0] * gv[0] + gu[1] * gv[1];
  const holds = Math.abs(dot) <= 0.08 * au * av;
  return {
    mode: mode === 'circles' ? 'circles' : 'conj',
    u, v, gu, gv,
    claim: {
      holds,
      text: holds
        ? 'The two curves cross at a right angle.'
        : 'The two curves do not cross at a right angle.',
    },
  };
}

// The axes draw a square. A drag stays on that square: each coordinate stops at the frame.
// Past the frame the picture ends the drag. The point does not ride a disk.
export function clampRect(x, y, limit) {
  const cap = limit > 0 ? limit : 1.6;
  const cut = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    if (n > cap) return cap;
    if (n < -cap) return -cap;
    return n;
  };
  return { re: cut(x), im: cut(y) };
}

// The derivative square is 480px on a side. One unit is 480 / (2 span) pixels.
export const PLANE_SIZE = 480;

// Shared scale for the step and its image when both tips fit with room to spare.
// The opening picture at 1+i uses this and does not get a second scale.
export function sharedGain(z, vectors, span) {
  const limit = span - 0.28;
  const re = Number(z && z.re) || 0;
  const im = Number(z && z.im) || 0;
  const fits = (scale) => vectors.every((v) => {
    const x = re + scale * v.re;
    const y = im + scale * v.im;
    return Math.abs(x) <= limit && Math.abs(y) <= limit;
  });
  if (fits(0.72)) return 0.72;
  let lo = 0;
  let hi = 0.72;
  for (let n = 0; n < 18; n += 1) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function scaleInside(z, v, span) {
  const limit = span - 0.02;
  const re = Number(z && z.re) || 0;
  const im = Number(z && z.im) || 0;
  const room = (comp, delta) => {
    if (Math.abs(delta) < 1e-12) return Infinity;
    const edge = delta > 0 ? limit : -limit;
    return (edge - comp) / delta;
  };
  const fit = Math.min(room(re, v.re), room(im, v.im));
  return fit > 0 ? fit : 0;
}

// Near the frame the shared scale shrinks the short step until it vanishes.
// Top that arrow up to a readable mark, and stop the tip inside the square.
export function markScale(z, vector, span, shared, minPx) {
  const len = Math.hypot(Number(vector && vector.re) || 0, Number(vector && vector.im) || 0);
  if (!(len > 1e-9)) return 0;
  const pxPer = PLANE_SIZE / (2 * span);
  const sharedLen = shared * len * pxPer;
  if (sharedLen >= minPx) return shared;
  const need = minPx / (len * pxPer);
  const fit = scaleInside(z, vector, span);
  const scale = Math.min(fit, Math.max(shared, need));
  return scale > 0 ? scale : 0;
}

// The step, the image, and the turn (when the turn is not zero) are the three
// marks. A zero-length image has nothing to draw. The page hides an arrow
// shorter than 4px and a turn whose arc cannot sit inside the square.
export function marksDrawn(fn, z, phi, span) {
  const scene = derivativeScene(fn, z, phi);
  const shared = sharedGain(z, [scene.h, scene.image], span);
  const pxPer = PLANE_SIZE / (2 * span);
  const lengthPx = (vector, scale) => {
    const len = Math.hypot(Number(vector && vector.re) || 0, Number(vector && vector.im) || 0);
    if (!(len > 1e-9)) return Infinity;
    return scale * len * pxPer;
  };
  const gs = markScale(z, scene.h, span, shared, 11);
  const ps = markScale(z, scene.image, span, shared, 11);
  if (lengthPx(scene.h, gs) < 4 || lengthPx(scene.image, ps) < 4) return false;
  const turn = scene.turn || 0;
  if (Math.abs(turn) <= 0.12) return true;
  const ox = ((Number(z.re) + span) / (2 * span)) * PLANE_SIZE;
  const oy = ((span - Number(z.im)) / (2 * span)) * PLANE_SIZE;
  return arcRadius(ox, oy, Number(phi) || 0, (Number(phi) || 0) + turn) > 0;
}

function lastDrawn(fn, from, to, phi, span) {
  if (!marksDrawn(fn, from, phi, span)) return null;
  let lo = 0;
  let hi = 1;
  let best = from;
  for (let n = 0; n < 20; n += 1) {
    const t = (lo + hi) / 2;
    const mid = {
      re: from.re + (to.re - from.re) * t,
      im: from.im + (to.im - from.im) * t,
    };
    if (marksDrawn(fn, mid, phi, span)) {
      best = mid;
      lo = t;
    } else {
      hi = t;
    }
  }
  return best;
}

// The finger may ask for the frame. Keep the coordinate that still fits, and
// stop the other at the last place the three marks are drawn. A horizontal
// drag at Im = 1 stays on that line.
export function clampDrawn(fn, re, im, phi, span) {
  const asked = clampRect(re, im, span);
  if (marksDrawn(fn, asked, phi, span)) return asked;
  return lastDrawn(fn, { re: 0, im: asked.im }, asked, phi, span)
    || lastDrawn(fn, { re: asked.re, im: 0 }, asked, phi, span)
    || lastDrawn(fn, { re: 0, im: 0 }, asked, phi, span)
    || { re: 0, im: 0 };
}

// Orange turn. Shrink the radius until the arc sits inside the square.
export function arcRadius(ox, oy, a0, a1) {
  const delta = a1 - a0;
  const margin = 3;
  const inside = (rad) => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const a = a0 + delta * t;
      const x = ox + rad * Math.cos(a);
      const y = oy - rad * Math.sin(a);
      if (x < margin || x > PLANE_SIZE - margin || y < margin || y > PLANE_SIZE - margin) return false;
    }
    return true;
  };
  for (let r = 72; r >= 8; r -= 4) {
    if (inside(r)) return r;
  }
  return 0;
}
