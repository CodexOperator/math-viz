// The book's sphere as a stage. Every external ray leaves the north pole,
// which is infinity, one point, and lands on the set of c. §2.5 Exercise 14
// (HTML id x2_5_20) gives the coordinates of z = x + iy on that sphere.
// Figure 2.5.2 is the sphere. The book does not number the rays.

import { bookLift, BOOK_CENTER, BOOK_R } from './bend.js';
import { rayCurves } from './rays.js';

// c = −2 sits near infinity on this sphere, so a steep view hides it under
// the pole. This turn drops the tip down the front, and 1/3 and 2/3 still
// leave as two strokes.
const YAW = 0.4;
const TILT = 0.5;

let insideCache = null;
function insideSet() {
  if (insideCache) return insideCache;
  const dots = [];
  const re0 = -2.05;
  const re1 = 0.55;
  const im0 = -1.25;
  const im1 = 1.25;
  const cols = 46;
  const rows = 30;
  for (let j = 0; j < rows; j++) {
    const im = im0 + (im1 - im0) * ((j + 0.5) / rows);
    for (let i = 0; i < cols; i++) {
      const re = re0 + (re1 - re0) * ((i + 0.5) / cols);
      let zre = 0;
      let zim = 0;
      let stay = true;
      for (let n = 0; n < 40; n++) {
        const nr = zre * zre - zim * zim + re;
        const ni = 2 * zre * zim + im;
        zre = nr;
        zim = ni;
        if (zre * zre + zim * zim > 4) { stay = false; break; }
      }
      if (stay) dots.push(bookLift(re, im));
    }
  }
  insideCache = dots;
  return dots;
}

function project(p, cx, cy, scale) {
  const x = p.x;
  const y = p.y;
  const z = p.z - BOOK_CENTER[2];
  const cyaw = Math.cos(YAW);
  const syaw = Math.sin(YAW);
  const xr = x * cyaw - y * syaw;
  const yr = x * syaw + y * cyaw;
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);
  const up = -yr * st + z * ct;
  return [cx + xr * scale, cy - up * scale];
}

function stroke(ctx, pts) {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

// A name beside a stroke. `away` is a unit vector. The plate stays inside the pane.
function namePlate(ctx, text, anchor, away, frame, px, ink, font) {
  const fontPx = Math.max(15 * px, 15);
  ctx.font = `600 ${fontPx}px ${font || 'system-ui, sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(text).width;
  const pad = 3 * px;
  const gap = 12 * px;
  let left = anchor[0] + away[0] * gap - tw / 2;
  let base = anchor[1] + away[1] * gap + fontPx * 0.35;
  const minL = frame.x + 3;
  const maxL = frame.x + frame.w - 3 - tw;
  if (left < minL) left = minL;
  if (left > maxL) left = Math.max(minL, maxL);
  const minBase = frame.y + 3 + fontPx;
  const maxBase = frame.y + frame.h - 3;
  if (base < minBase) base = minBase;
  if (base > maxBase) base = maxBase;
  const plate = ink.bg || [13, 18, 28];
  const rgb = (c) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
  ctx.fillStyle = `rgba(${rgb(plate)},0.92)`;
  ctx.fillRect(left - pad, base - fontPx, tw + pad * 2, fontPx * 1.28);
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.96)`;
  ctx.fillText(text, left, base);
}

export function paintPole(ctx, frame, opts) {
  if (!frame) return;
  const ink = opts.ink;
  const active = opts.active || 'pair';
  const px = Math.max(1, opts.scale || 1);
  const cx = frame.x + frame.w * 0.5;
  const cy = frame.y + frame.h * 0.56;
  const rad = Math.min(frame.w, frame.h) * 0.38;
  const scale = rad / BOOK_R;
  const at = (re, im) => project(bookLift(re, im), cx, cy, scale);
  const rgb = (c) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;

  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();

  const dots = insideSet();
  ctx.fillStyle = `rgba(${rgb(ink.cart)},0.55)`;
  for (const p of dots) {
    const s = project(p, cx, cy, scale);
    ctx.fillRect(s[0], s[1], Math.max(1.2, px), Math.max(1.2, px));
  }

  ctx.strokeStyle = `rgba(${rgb(ink.muted)},0.55)`;
  ctx.lineWidth = Math.max(1, px);
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();

  const equator = [];
  const realMeridian = [];
  const imagMeridian = [];
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    equator.push(at(Math.cos(t), Math.sin(t)));
    const u = -6 + (12 * i) / 72;
    realMeridian.push(at(u, 0));
    imagMeridian.push(at(0, u));
  }
  ctx.strokeStyle = `rgba(${rgb(ink.muted)},0.4)`;
  stroke(ctx, equator);
  stroke(ctx, realMeridian);
  stroke(ctx, imagMeridian);

  const pole = project({ x: 0, y: 0, z: 1 }, cx, cy, scale);
  // The other rays stay visible, quieter, so the lit landing is the sentence.
  // Two lit strokes that meet are two angles. A loop with no names is wallpaper.
  const named = [];
  for (const ray of rayCurves()) {
    const on = ray.name === active;
    // The stroke starts on the pole itself. A sample at large |c| is already
    // near infinity, and without this point the tip reads as a stub.
    const pts = [pole, ...ray.samples.map((c) => at(c[0], c[1]))];
    ctx.strokeStyle = on
      ? `rgba(${rgb(ink.polar)},1)`
      : `rgba(${rgb(ink.muted)},0.42)`;
    ctx.lineWidth = Math.max(on ? 2.4 : 1.3, px * (on ? 1.6 : 1));
    stroke(ctx, pts);
    const land = pts[pts.length - 1];
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(land[0], land[1], (on ? 6.5 : 3.2) * px, 0, Math.PI * 2);
    ctx.fill();
    if (on) named.push({ ray, pts, land });
  }

  // Far samples pile up at the pole, so a fraction of the sample list
  // still sits under the pole plate. The fraction is of the drawn stroke.
  // Angle 1/2 is named near the landing, to the left, clear of that plate.
  const along = { 0: 0.62, 0.5: 0.78, [1 / 3]: 0.55, [2 / 3]: 0.8 };
  const spoken = { 0: 'angle 0', 0.5: 'angle 1/2' };
  const pointAlong = (pts, frac) => {
    let total = 0;
    const acc = [0];
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      acc.push(total);
    }
    const want = Math.max(0, Math.min(1, frac)) * total;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < want) i += 1;
    return pts[i] || pts[pts.length - 1];
  };
  for (const item of named) {
    const key = item.ray.angle;
    const t = along[key] != null ? along[key] : 0.55;
    const anchor = pointAlong(item.pts, t);
    let sx;
    let sy;
    if (item.ray.label === '1/2') {
      sx = -1;
      sy = 0.2;
    } else {
      const ox = anchor[0] - cx;
      const oy = anchor[1] - cy;
      const tx = anchor[0] - pole[0];
      const ty = anchor[1] - pole[1];
      const len = Math.hypot(tx, ty) || 1;
      sx = -ty / len;
      sy = tx / len;
      if (sx * ox + sy * oy < 0) { sx = -sx; sy = -sy; }
    }
    const text = spoken[key] || item.ray.label;
    namePlate(ctx, text, anchor, [sx, sy], frame, px, ink, opts.font);
  }

  ctx.fillStyle = `rgba(${rgb(ink.polar)},1)`;
  ctx.beginPath();
  ctx.arc(pole[0], pole[1], 6.5 * px, 0, Math.PI * 2);
  ctx.fill();
  const label = 'north pole';
  const fontPx = Math.max(15 * px, 15);
  ctx.font = `600 ${fontPx}px ${opts.font || 'system-ui, sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(label).width;
  const pad = 4 * px;
  // To the right of the dot. If that side is the pair, the name sits above.
  // It does not drop under the dot: angle 1/2 lives on that side of the pole.
  let left = pole[0] + 12 * px;
  let base = pole[1] + fontPx * 0.3;
  if (left + tw > frame.x + frame.w - 4) {
    left = pole[0] - tw - 12 * px;
  }
  if (left < frame.x + 3) {
    left = pole[0] - tw / 2;
    base = pole[1] - fontPx - 8 * px;
  }
  if (left < frame.x + 3) left = frame.x + 3;
  if (left + tw > frame.x + frame.w - 4) left = frame.x + frame.w - 4 - tw;
  if (base - fontPx < frame.y + 4) base = frame.y + 4 + fontPx;
  if (base > pole[1] - 4 * px) base = Math.max(frame.y + 4 + fontPx, pole[1] - fontPx - 8 * px);
  const plate = ink.bg || [13, 18, 28];
  ctx.fillStyle = `rgba(${rgb(plate)},0.92)`;
  ctx.fillRect(left - pad, base - fontPx, tw + pad * 2, fontPx * 1.3);
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.96)`;
  ctx.fillText(label, left, base);
  ctx.restore();
}
