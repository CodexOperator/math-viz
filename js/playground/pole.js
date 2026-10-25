// The book's sphere as a stage. Every external ray leaves the north pole,
// which is infinity, one point, and lands on the set of c. §2.5 Exercise 14
// (HTML id x2_5_20) gives the coordinates of z = x + iy on that sphere.
// Figure 2.5.2 is the sphere. The book does not number the rays.

import { bookLift, BOOK_CENTER, BOOK_R } from './bend.js';
import { rayCurves } from './rays.js';

const YAW = 0.85;
const TILT = 0.62;

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

  for (const ray of rayCurves()) {
    const on = ray.name === active;
    const pts = ray.samples.map((c) => at(c[0], c[1]));
    ctx.strokeStyle = on
      ? `rgba(${rgb(ink.polar)},1)`
      : `rgba(${rgb(ink.muted)},0.8)`;
    ctx.lineWidth = Math.max(on ? 2.4 : 1.3, px * (on ? 1.6 : 1));
    stroke(ctx, pts);
    const land = pts[pts.length - 1];
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(land[0], land[1], (on ? 5.5 : 3.5) * px, 0, Math.PI * 2);
    ctx.fill();
  }

  const pole = project({ x: 0, y: 0, z: 1 }, cx, cy, scale);
  ctx.fillStyle = `rgba(${rgb(ink.polar)},1)`;
  ctx.beginPath();
  ctx.arc(pole[0], pole[1], 6 * px, 0, Math.PI * 2);
  ctx.fill();
  const label = 'infinity';
  const fontPx = Math.max(15 * px, 15);
  ctx.font = `600 ${fontPx}px ${opts.font || 'system-ui, sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(label).width;
  const pad = 4 * px;
  let left = pole[0] + 8 * px;
  let base = pole[1] - 6 * px;
  if (left + tw > frame.x + frame.w - 4) left = pole[0] - tw - 8 * px;
  if (base - fontPx < frame.y + 4) base = pole[1] + fontPx + 8 * px;
  const plate = ink.bg || [13, 18, 28];
  ctx.fillStyle = `rgba(${rgb(plate)},0.92)`;
  ctx.fillRect(left - pad, base - fontPx, tw + pad * 2, fontPx * 1.3);
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.96)`;
  ctx.fillText(label, left, base);
  ctx.restore();
}
