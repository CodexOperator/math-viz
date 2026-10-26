// The book's sphere as a stage. Every external ray leaves the north pole,
// which is infinity, one point, and lands on the set of c. §2.5 Exercise 14
// (HTML id x2_5_20) gives the coordinates of z = x + iy on that sphere.
// Figure 2.22, page 73 is the sphere. The book does not number the rays.

import { bookLift, BOOK_CENTER, BOOK_R } from './bend.js';
import { rayCurves } from './rays.js';

// c = −2 sits near infinity on this sphere, so a steep view hides it under
// the pole. The wide view drops the tip down the front, and 1/3 and 2/3
// still leave as two strokes. The tip picture zooms that short stroke.
const YAW = 0.4;
const TILT = 0.5;
const TIP_YAW = 0.15;
const TIP_TILT = 0.5;

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

function rawProject(p, yaw, tilt) {
  const x = p.x;
  const y = p.y;
  const z = p.z - BOOK_CENTER[2];
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const xr = x * cyaw - y * syaw;
  const yr = x * syaw + y * cyaw;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const up = -yr * st + z * ct;
  return [xr, -up];
}

function project(p, cx, cy, scale, yaw, tilt) {
  const r = rawProject(p, yaw, tilt);
  return [cx + r[0] * scale, cy + r[1] * scale];
}

function stroke(ctx, pts) {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function clipSeg(a, b, box) {
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const pk = [-dx, dx, -dy, dy];
  const qk = [a[0] - box.x0, box.x1 - a[0], a[1] - box.y0, box.y1 - a[1]];
  for (let k = 0; k < 4; k++) {
    if (pk[k] === 0) {
      if (qk[k] < 0) return null;
    } else {
      const t = qk[k] / pk[k];
      if (pk[k] < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  if (t1 < t0) return null;
  return {
    a: [a[0] + t0 * dx, a[1] + t0 * dy],
    b: [a[0] + t1 * dx, a[1] + t1 * dy],
    enter: t0 > 0.001,
    leave: t1 < 0.999,
  };
}

// A stroke that would leave the pane fades to nothing at an inset, and an
// open ring marks the cut. A filled dot is a landing. The ring is not one.
function strokeInset(ctx, pts, frame, inset, rgb, alpha, ring) {
  const box = {
    x0: frame.x + inset,
    y0: frame.y + inset,
    x1: frame.x + frame.w - inset,
    y1: frame.y + frame.h - inset,
  };
  const ink = (a) => `rgba(${rgb},${a})`;
  let exit = null;
  ctx.save();
  ctx.lineCap = 'butt';
  let pen = false;
  ctx.beginPath();
  ctx.strokeStyle = ink(alpha);
  for (let i = 1; i < pts.length; i++) {
    const seg = clipSeg(pts[i - 1], pts[i], box);
    if (!seg) {
      if (pen) { ctx.stroke(); pen = false; }
      continue;
    }
    if (seg.enter || seg.leave) {
      if (pen) { ctx.stroke(); pen = false; }
      const grad = ctx.createLinearGradient(seg.a[0], seg.a[1], seg.b[0], seg.b[1]);
      grad.addColorStop(0, ink(seg.enter ? 0 : alpha));
      grad.addColorStop(0.5, ink(alpha));
      grad.addColorStop(1, ink(seg.leave ? 0 : alpha));
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(seg.a[0], seg.a[1]);
      ctx.lineTo(seg.b[0], seg.b[1]);
      ctx.stroke();
      ctx.strokeStyle = ink(alpha);
      if (seg.leave) exit = seg.b;
      else {
        ctx.beginPath();
        ctx.moveTo(seg.b[0], seg.b[1]);
        pen = true;
      }
    } else {
      if (!pen) {
        ctx.beginPath();
        ctx.moveTo(seg.a[0], seg.a[1]);
        pen = true;
      }
      ctx.lineTo(seg.b[0], seg.b[1]);
    }
  }
  if (pen) ctx.stroke();
  if (exit) {
    ctx.strokeStyle = ink(Math.max(0.9, alpha));
    ctx.lineWidth = Math.max(1.6, ctx.lineWidth);
    ctx.beginPath();
    ctx.arc(exit[0], exit[1], ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  return { exit, box };
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
  const margin = 10 * px;
  let left = anchor[0] + away[0] * gap - tw / 2;
  let base = anchor[1] + away[1] * gap + fontPx * 0.35;
  const minL = frame.x + margin;
  const maxL = frame.x + frame.w - margin - tw;
  if (left < minL) left = minL;
  if (left > maxL) left = Math.max(minL, maxL);
  const minBase = frame.y + margin + fontPx;
  const maxBase = frame.y + frame.h - margin;
  if (base < minBase) base = minBase;
  if (base > maxBase) base = maxBase;
  const plate = ink.bg || [13, 18, 28];
  const rgb = (c) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
  ctx.fillStyle = `rgba(${rgb(plate)},0.92)`;
  ctx.fillRect(left - pad, base - fontPx, tw + pad * 2, fontPx * 1.28);
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.96)`;
  ctx.fillText(text, left, base);
  return { left, base, tw, fontPx, pad };
}

// angle 1/2 sits under the landing, off the pane edge, and a leader meets the stroke.
function tipName(ctx, text, landing, frame, px, ink, font) {
  const fontPx = Math.max(15 * px, 15);
  ctx.font = `600 ${fontPx}px ${font || 'system-ui, sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(text).width;
  const pad = 4 * px;
  const margin = 12 * px;
  let left = landing[0] - tw * 0.15;
  let base = landing[1] + fontPx + 16 * px;
  const minL = frame.x + margin;
  const maxL = frame.x + frame.w - margin - tw;
  if (left < minL) left = minL;
  if (left > maxL) left = Math.max(minL, maxL);
  const maxBase = frame.y + frame.h - margin;
  const minBase = frame.y + margin + fontPx;
  if (base > maxBase) base = Math.max(minBase, landing[1] - 14 * px);
  if (base < minBase) base = minBase;
  const plate = ink.bg || [13, 18, 28];
  const rgb = (c) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
  const top = base - fontPx;
  ctx.fillStyle = `rgba(${rgb(plate)},0.94)`;
  ctx.fillRect(left - pad, top, tw + pad * 2, fontPx * 1.28);
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.96)`;
  ctx.fillText(text, left, base);
  // The plate used to cover the leader, so a dark gap sat between the
  // stroke and the glyphs. The leader is painted after the letters and
  // starts on them, so angle 1/2 meets the stroke.
  const above = landing[1] <= top + 1;
  const meetX = Math.max(left + px, Math.min(left + tw - px, landing[0]));
  const meetY = above ? base - fontPx * 0.72 : base - px;
  ctx.strokeStyle = `rgba(${rgb(ink.polar)},0.95)`;
  ctx.lineWidth = Math.max(1.5, px);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(meetX, meetY);
  ctx.lineTo(landing[0], landing[1]);
  ctx.stroke();
}

export function paintPole(ctx, frame, opts) {
  if (!frame) return;
  const ink = opts.ink;
  const active = opts.active || 'pair';
  const px = Math.max(1, opts.scale || 1);
  const tip = active === 'tip';
  const yaw = tip ? TIP_YAW : YAW;
  const tilt = tip ? TIP_TILT : TILT;
  const rgb = (c) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
  let cx;
  let cy;
  let scale;
  let rad;
  if (tip) {
    // c = −2 is near the pole, so the wide view draws a stub. This frame
    // zooms until the stroke is a real share of the pane. The landing and
    // the pole both stay on the glass.
    const poleRaw = rawProject({ x: 0, y: 0, z: 1 }, yaw, tilt);
    const landRaw = rawProject(bookLift(-2, 0), yaw, tilt);
    const dist = Math.hypot(poleRaw[0] - landRaw[0], poleRaw[1] - landRaw[1]) || 0.4;
    const want = Math.min(frame.w * 0.7, frame.h * 0.48);
    scale = want / dist;
    const mid = [(poleRaw[0] + landRaw[0]) / 2, (poleRaw[1] + landRaw[1]) / 2];
    cx = frame.x + frame.w * 0.5 - mid[0] * scale;
    cy = frame.y + frame.h * 0.42 - mid[1] * scale;
    rad = scale * BOOK_R;
  } else {
    cx = frame.x + frame.w * 0.5;
    cy = frame.y + frame.h * 0.56;
    rad = Math.min(frame.w, frame.h) * 0.38;
    scale = rad / BOOK_R;
  }
  const at = (re, im) => project(bookLift(re, im), cx, cy, scale, yaw, tilt);

  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();

  const dots = insideSet();
  ctx.fillStyle = `rgba(${rgb(ink.cart)},0.55)`;
  for (const p of dots) {
    const s = project(p, cx, cy, scale, yaw, tilt);
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

  const pole = project({ x: 0, y: 0, z: 1 }, cx, cy, scale, yaw, tilt);
  // The other rays stay visible, quieter, so the lit landing is the sentence.
  // Two lit strokes that meet are two angles. A loop with no names is wallpaper.
  const named = [];
  for (const ray of rayCurves()) {
    const on = ray.name === active;
    // The stroke starts on the pole itself. A sample at large |c| is already
    // near infinity, and without this point the tip reads as a stub.
    const pts = [pole, ...ray.samples.map((c) => at(c[0], c[1]))];
    const rgbNow = on ? rgb(ink.polar) : rgb(ink.muted);
    const alpha = on ? 1 : 0.42;
    ctx.lineWidth = Math.max(on ? 2.4 : 1.3, px * (on ? 1.6 : 1));
    const inset = Math.max(18 * px, 18);
    const drawn = strokeInset(ctx, pts, frame, inset, rgbNow, alpha, (on ? 8 : 5.5) * px);
    const land = pts[pts.length - 1];
    const box = drawn.box;
    const held = land[0] >= box.x0 && land[0] <= box.x1 && land[1] >= box.y0 && land[1] <= box.y1;
    if (held) {
      ctx.fillStyle = `rgba(${rgbNow},${alpha})`;
      ctx.beginPath();
      ctx.arc(land[0], land[1], (on ? 6.5 : 3.2) * px, 0, Math.PI * 2);
      ctx.fill();
    }
    if (on) named.push({ ray, pts, land });
  }

  // Far samples pile up at the pole, so a fraction of the sample list
  // still sits under the pole plate. The fraction is of the drawn stroke.
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
    const text = spoken[key] || item.ray.label;
    if (item.ray.label === '1/2') {
      tipName(ctx, text, item.land, frame, px, ink, opts.font);
      continue;
    }
    const t = along[key] != null ? along[key] : 0.55;
    const anchor = pointAlong(item.pts, t);
    const ox = anchor[0] - cx;
    const oy = anchor[1] - cy;
    const tx = anchor[0] - pole[0];
    const ty = anchor[1] - pole[1];
    const len = Math.hypot(tx, ty) || 1;
    let sx = -ty / len;
    let sy = tx / len;
    if (sx * ox + sy * oy < 0) { sx = -sx; sy = -sy; }
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
  const margin = 10 * px;
  // Beside the dot, then above it if that side leaves the pane.
  // The tip's angle name lives under the landing, so this name can sit above.
  let left = pole[0] + 12 * px;
  let base = pole[1] + fontPx * 0.3;
  if (left + tw > frame.x + frame.w - margin) left = pole[0] - tw - 12 * px;
  if (left < frame.x + margin) {
    left = pole[0] - tw / 2;
    base = pole[1] - fontPx - 10 * px;
  }
  if (left < frame.x + margin) left = frame.x + margin;
  if (left + tw > frame.x + frame.w - margin) left = frame.x + frame.w - margin - tw;
  if (base - fontPx < frame.y + margin) base = frame.y + margin + fontPx;
  if (base > frame.y + frame.h - margin) base = frame.y + frame.h - margin;
  const plate = ink.bg || [13, 18, 28];
  ctx.fillStyle = `rgba(${rgb(plate)},0.92)`;
  ctx.fillRect(left - pad, base - fontPx, tw + pad * 2, fontPx * 1.3);
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.96)`;
  ctx.fillText(label, left, base);
  ctx.restore();
}
