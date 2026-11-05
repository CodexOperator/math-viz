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

export function clampPlane(x, y, limit) {
  const cap = limit > 0 ? limit : 1.6;
  let px = Number(x);
  let py = Number(y);
  if (!Number.isFinite(px)) px = 0;
  if (!Number.isFinite(py)) py = 0;
  const m = Math.hypot(px, py);
  if (m > cap) {
    px = (px / m) * cap;
    py = (py / m) * cap;
  }
  return { re: px, im: py };
}
