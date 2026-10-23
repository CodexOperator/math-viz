// The book's sphere, and the bend of its surface.
// Howell & Mathews, §2.5: diameter 1, centre (0, 0, 1/2), north pole (0, 0, 1).
// Exercise 14 is the lift. The radius is 1/2, so the curvature is 1/R² = 4.
// Girard's count (excess = curvature × area) is not a numbered exercise.
// The page says so. This file only measures the sphere the book defines.

export const BOOK_R = 0.5;
export const BOOK_CENTER = [0, 0, 0.5];
export const OCTANT = [[0, 0], [1, 0], [0, 1]];

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function norm(a) {
  const n = Math.hypot(a[0], a[1], a[2]);
  return n > 0 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 0];
}

// Exercise 14. Infinity is the north pole, and it has no finite preimage.
export function bookLift(re, im) {
  if (!Number.isFinite(re) || !Number.isFinite(im)) return { x: 0, y: 0, z: 1, infinite: true };
  const r2 = re * re + im * im;
  if (r2 > 1e12) return { x: 0, y: 0, z: 1, infinite: true };
  const d = r2 + 1;
  return { x: re / d, y: im / d, z: r2 / d, infinite: false };
}

export function planeFromBook(p) {
  if (!p || p.infinite) return null;
  const den = 1 - p.z;
  if (!(den > 1e-5)) return null;
  return [p.x / den, p.y / den];
}

export function unitFromLift(p) {
  return norm(sub([p.x, p.y, p.z], BOOK_CENTER));
}

// Spherical area scale of the stereographic chart. 1 at 0, and it dies at the pole.
export function areaScale(re, im) {
  const r2 = re * re + im * im;
  const lam = 1 / (1 + r2);
  return lam * lam;
}

function angleAt(u, v, w) {
  const tv = norm(sub(v, scale(u, dot(v, u))));
  const tw = norm(sub(w, scale(u, dot(w, u))));
  const c = Math.max(-1, Math.min(1, dot(tv, tw)));
  return Math.acos(c);
}

// Short great-circle arc, including both ends, as points on the sphere.
export function geodesic(a, b, n = 28) {
  const u = norm(a);
  const v = norm(b);
  let d = Math.max(-1, Math.min(1, dot(u, v)));
  const omega = Math.acos(d);
  const out = [];
  const steps = Math.max(2, n | 0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let dir;
    if (omega < 1e-4) dir = u;
    else {
      const s = Math.sin(omega);
      dir = add(scale(u, Math.sin((1 - t) * omega) / s), scale(v, Math.sin(t * omega) / s));
    }
    out.push({
      x: BOOK_CENTER[0] + dir[0] * BOOK_R,
      y: BOOK_CENTER[1] + dir[1] * BOOK_R,
      z: BOOK_CENTER[2] + dir[2] * BOOK_R,
    });
  }
  return out;
}

export function sphereTriangle(zs) {
  const pts = Array.isArray(zs) ? zs : [];
  if (pts.length < 3) return { degenerate: true, angles: [0, 0, 0], excess: 0, area: 0, curvature: null };
  const lifts = pts.slice(0, 3).map((p) => bookLift(p[0], p[1]));
  if (lifts.some((p) => p.infinite)) return { degenerate: true, angles: [0, 0, 0], excess: 0, area: 0, curvature: null, lifts };
  const U = lifts.map(unitFromLift);
  const vol = Math.abs(dot(U[0], cross(U[1], U[2])));
  if (vol < 1e-7) return { degenerate: true, angles: [0, 0, 0], excess: 0, area: 0, curvature: null, lifts, U };
  const angles = [angleAt(U[0], U[1], U[2]), angleAt(U[1], U[0], U[2]), angleAt(U[2], U[0], U[1])];
  const excess = angles[0] + angles[1] + angles[2] - Math.PI;
  const area = BOOK_R * BOOK_R * excess;
  const curvature = Math.abs(area) > 1e-6 ? excess / area : null;
  return { degenerate: false, angles, excess, area, curvature, lifts, U };
}

export function euclidArea(zs) {
  const a = zs[0];
  const b = zs[1];
  const c = zs[2];
  return 0.5 * Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
}

export function chartFor(tri) {
  let max = 1.15;
  for (const p of tri) max = Math.max(max, Math.abs(p[0] || 0), Math.abs(p[1] || 0));
  return { cx: 0, cy: 0, half: Math.max(1.7, max * 1.28) };
}

export function complexAt(px, py, rect, chart) {
  const re = chart.cx + ((px - rect.x) / Math.max(1, rect.w) - 0.5) * chart.half * 2;
  const im = chart.cy + (0.5 - (py - rect.y) / Math.max(1, rect.h)) * chart.half * 2;
  return [re, im];
}

export function screenAt(z, rect, chart) {
  const sx = rect.x + ((z[0] - chart.cx) / (chart.half * 2) + 0.5) * rect.w;
  const sy = rect.y + (0.5 - (z[1] - chart.cy) / (chart.half * 2)) * rect.h;
  return [sx, sy];
}

// Which pane is which. A narrow window stacks: the plane is the control, on top.
export function bendFrames(w, h, kind, stacked) {
  const split = kind === 'bend';
  if (!split) {
    const inset = Math.min(w, h) * 0.42;
    const margin = Math.max(16, Math.min(w, h) * 0.04);
    return {
      sphere: { x: 0, y: 0, w, h },
      plane: { x: w - inset - margin, y: h - inset - margin, w: inset, h: inset },
      stacked: false,
    };
  }
  if (stacked) {
    const pane = Math.max(1, h >> 1);
    return {
      plane: { x: 0, y: 0, w, h: pane },
      sphere: { x: 0, y: pane, w, h: h - pane },
      stacked: true,
    };
  }
  const pane = Math.max(1, w >> 1);
  return {
    plane: { x: 0, y: 0, w: pane, h },
    sphere: { x: pane, y: 0, w: w - pane, h },
    stacked: false,
  };
}

function rgba(rgb, a) {
  const c = rgb || [98, 173, 242];
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

function projectSphere(U, lifts) {
  let n = norm(add(add(U[0], U[1]), U[2]));
  if (dot(n, U[0]) < 0) n = scale(n, -1);
  const up0 = Math.abs(n[2]) < 0.85 ? [0, 0, 1] : [1, 0, 0];
  const right = norm(cross(up0, n));
  const up = norm(cross(n, right));
  const toScreen = (p) => {
    const r = sub([p.x, p.y, p.z], BOOK_CENTER);
    return [dot(r, right), dot(r, up)];
  };
  return { toScreen, lifts };
}

function paintWash(ctx, rect, chart, ink) {
  const [cx, cy] = screenAt([chart.cx, chart.cy], rect, chart);
  const rings = 10;
  for (let i = rings; i >= 1; i--) {
    const rho = (i / rings) * chart.half;
    const rx = (rho / (chart.half * 2)) * rect.w;
    const ry = (rho / (chart.half * 2)) * rect.h;
    const a = areaScale(rho, 0) * 0.28;
    ctx.beginPath();
    ctx.fillStyle = rgba(ink.cart, a);
    ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function cornerScale(ink) {
  return ink && ink.px > 0 ? ink.px : 1;
}

function paintCorner(ctx, x, y, color, index, ink) {
  const px = cornerScale(ink);
  const picked = ink && ink.pick === index;
  const r = (picked ? 7.5 : 6) * px;
  if (picked) {
    ctx.beginPath();
    ctx.lineWidth = Math.max(1.5, 2 * px);
    ctx.strokeStyle = rgba(ink.text, 1);
    ctx.arc(x, y, r + 4 * px, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.fillStyle = rgba(color, 1);
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (!picked) return;
  const label = String(index + 1);
  const size = Math.max(15 * px, 15);
  ctx.font = `600 ${size}px ${ink.font || 'system-ui, sans-serif'}`;
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(label).width;
  const lx = x + r + 5 * px;
  const ly = y;
  ctx.fillStyle = rgba(ink.bg, 0.92);
  ctx.fillRect(lx - 3 * px, ly - size * 0.65, tw + 6 * px, size * 1.3);
  ctx.fillStyle = rgba(ink.text, 1);
  ctx.fillText(label, lx, ly);
  ctx.textBaseline = 'alphabetic';
}

function paintPlane(ctx, rect, tri, chart, triData, ink) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  paintWash(ctx, rect, chart, ink);
  const eq = [];
  for (let i = 0; i <= 48; i++) {
    const th = (i / 48) * Math.PI * 2;
    eq.push(screenAt([Math.cos(th), Math.sin(th)], rect, chart));
  }
  ctx.beginPath();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = rgba(ink.polar, 0.85);
  ctx.lineWidth = 1.25;
  eq.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  ctx.setLineDash([]);
  const straight = tri.map((z) => screenAt(z, rect, chart));
  ctx.beginPath();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = rgba(ink.text, 0.85);
  straight.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  if (triData && triData.U) {
    ctx.beginPath();
    ctx.strokeStyle = rgba(ink.cart, 1);
    ctx.lineWidth = 2;
    for (let e = 0; e < 3; e++) {
      const arc = geodesic(triData.U[e], triData.U[(e + 1) % 3], 32);
      arc.forEach((p, i) => {
        const z = planeFromBook(p);
        if (!z) return;
        const s = screenAt(z, rect, chart);
        if (i) ctx.lineTo(s[0], s[1]);
        else ctx.moveTo(s[0], s[1]);
      });
    }
    ctx.stroke();
  }
  const tones = [ink.cart, ink.polar, ink.input];
  tri.forEach((z, i) => {
    const s = screenAt(z, rect, chart);
    paintCorner(ctx, s[0], s[1], tones[i], i, ink);
  });
  paintTag(ctx, 'area scale', rect.x + 10 * cornerScale(ink), rect.y + 10 * cornerScale(ink), ink);
  ctx.restore();
}

function paintTag(ctx, text, x, y, ink) {
  const px = Math.max(15, 15 * cornerScale(ink));
  ctx.font = `600 ${px}px ${ink.font || 'system-ui, sans-serif'}`;
  ctx.textBaseline = 'top';
  const width = ctx.measureText(text).width;
  const padX = px * 0.42;
  const padY = px * 0.28;
  ctx.fillStyle = rgba(ink.bg, 0.92);
  ctx.fillRect(x, y, width + padX * 2, px + padY * 2);
  ctx.fillStyle = rgba(ink.text, 1);
  ctx.fillText(text, x + padX, y + padY);
  ctx.textBaseline = 'alphabetic';
}

function paintSphere(ctx, rect, triData, ink) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const rad = Math.min(rect.w, rect.h) * 0.38;
  const scalePx = rad / BOOK_R;
  if (!triData || !triData.U) {
    ctx.beginPath();
    ctx.strokeStyle = rgba(ink.polar, 0.7);
    ctx.lineWidth = 1.5;
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return [];
  }
  const { toScreen } = projectSphere(triData.U, triData.lifts);
  const xy = (p) => {
    const s = toScreen(p);
    return [cx + s[0] * scalePx, cy - s[1] * scalePx];
  };
  ctx.beginPath();
  ctx.fillStyle = rgba(ink.surface, 0.94);
  ctx.strokeStyle = rgba(ink.polar, 0.9);
  ctx.lineWidth = Math.max(1.25, 1.5 * cornerScale(ink));
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const equator = [];
  for (let i = 0; i <= 64; i++) {
    const th = (i / 64) * Math.PI * 2;
    equator.push(bookLift(Math.cos(th), Math.sin(th)));
  }
  ctx.beginPath();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = rgba(ink.polar, 0.7);
  equator.forEach((p, i) => {
    const s = xy(p);
    if (i) ctx.lineTo(s[0], s[1]);
    else ctx.moveTo(s[0], s[1]);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  const arcs = [0, 1, 2].map((e) => geodesic(triData.U[e], triData.U[(e + 1) % 3], 24).map(xy));
  ctx.beginPath();
  ctx.fillStyle = rgba(ink.output, 0.28);
  arcs[0].forEach((s, i) => (i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])));
  arcs[1].forEach((s) => ctx.lineTo(s[0], s[1]));
  arcs[2].forEach((s) => ctx.lineTo(s[0], s[1]));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(ink.cart, 1);
  ctx.lineWidth = 2;
  arcs.forEach((arc) => {
    ctx.beginPath();
    arc.forEach((s, i) => (i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])));
    ctx.stroke();
  });
  const tones = [ink.cart, ink.polar, ink.input];
  const pts = triData.lifts.map((p) => xy(p));
  pts.forEach((s, i) => paintCorner(ctx, s[0], s[1], tones[i], i, ink));
  ctx.restore();
  return pts;
}

// Draws the sphere, and the plane when the frame asks for it.
// Returns the chart and the frames so a tap can find a corner.
export function paintBend(ctx, w, h, tri, kind, stacked, ink, pick, scale) {
  const frames = bendFrames(w, h, kind, stacked);
  const chart = chartFor(tri);
  const data = sphereTriangle(tri);
  const paint = {
    ...(ink || {}),
    pick: pick | 0,
    px: scale > 0 ? scale : 1,
  };
  ctx.clearRect(0, 0, w, h);
  if (kind === 'bend') {
    ctx.save();
    ctx.strokeStyle = rgba(paint.muted, 0.55);
    ctx.beginPath();
    if (stacked) {
      ctx.moveTo(0, frames.sphere.y);
      ctx.lineTo(w, frames.sphere.y);
    } else {
      ctx.moveTo(frames.sphere.x, 0);
      ctx.lineTo(frames.sphere.x, h);
    }
    ctx.stroke();
    ctx.restore();
  } else if (frames.plane) {
    const p = frames.plane;
    ctx.save();
    ctx.fillStyle = rgba(paint.surface, 0.96);
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = rgba(paint.muted, 0.85);
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    ctx.restore();
  }
  const spherePts = paintSphere(ctx, frames.sphere, data, paint) || [];
  if (frames.plane) paintPlane(ctx, frames.plane, tri, chart, data, paint);
  return { frames, chart, data, spherePts };
}

export function nearestCorner(px, py, tri, rect, chart, hit) {
  let best = -1;
  const reach = hit > 0 ? hit : 22;
  let bestD = reach * reach;
  tri.forEach((z, i) => {
    const s = screenAt(z, rect, chart);
    const d = (s[0] - px) ** 2 + (s[1] - py) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

export function deg(rad) {
  return (rad * 180) / Math.PI;
}
