// The spherical metric as a chart of the book's sphere.
// Left: the stereographic chart. The wash is the area scale, heaviest at 0
// and gone at the pole. The orange corners are infinity, one point.
// Right: the same point on the sphere of Figure 2.22, page 73.
// Exercise 14 is the lift. The radius is 1/2, so the curvature is 4.
// No exercise numbers the distance, and no exercise numbers the area scale.

import { bookLift, areaScale, BOOK_CENTER, BOOK_R } from './bend.js';
import { chartPoint, chartOf, chordal, poleDistance } from './field.js';

export const WARP_SPAN = 3.2;
const RINGS = [0.5, 0.8];

export function warpPlace(c, infinite) {
  if (infinite) return { infinite: true, re: Infinity, im: 0 };
  const re = Number(c && c[0]) || 0;
  const im = Number(c && c[1]) || 0;
  if (!Number.isFinite(re) || !Number.isFinite(im)) return { infinite: true, re: Infinity, im: 0 };
  return { infinite: false, re, im };
}

export function warpRead(place) {
  if (!place || place.infinite) return { toZero: 1, toPole: 0, scale: 0 };
  return {
    toZero: chordal([place.re, place.im], [0, 0]),
    toPole: poleDistance([place.re, place.im]),
    scale: areaScale(place.re, place.im),
  };
}

function chartFrame(frame) {
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  const rad = Math.min(frame.w, frame.h) * 0.46;
  return { cx, cy, rad };
}

export function warpChart(frame, x, y) {
  const box = chartFrame(frame);
  const nu = (x - box.cx) / box.rad;
  const nv = (box.cy - y) / box.rad;
  const hit = chartPoint(nu, nv, WARP_SPAN);
  return { ...hit, nu, nv, ...box };
}

function screenOf(frame, re, im) {
  const box = chartFrame(frame);
  if (!Number.isFinite(re) || !Number.isFinite(im)) return null;
  const at = chartOf(re, im, WARP_SPAN);
  return [box.cx + at.nu * box.rad, box.cy - at.nv * box.rad];
}

function radiusFor(distance) {
  const d = Math.min(0.98, Math.max(0, distance));
  return d / Math.sqrt(1 - d * d);
}

const YAW = 0.42;
const TILT = 0.62;

function project(p, cx, cy, scale) {
  const z = p.z - BOOK_CENTER[2];
  const cyaw = Math.cos(YAW);
  const syaw = Math.sin(YAW);
  const xr = p.x * cyaw - p.y * syaw;
  const yr = p.x * syaw + p.y * cyaw;
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);
  const up = -yr * st + z * ct;
  return [cx + xr * scale, cy - up * scale];
}

function stroke(ctx, pts) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function ringPoints(distance, n = 72) {
  const r = radiusFor(distance);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

export function paintWarp(ctx, frames, opts) {
  const index = frames.index;
  const sphere = frames.julia;
  if (!index || !sphere) return;
  const ink = opts.ink;
  const px = Math.max(1, opts.scale || 1);
  const place = warpPlace(opts.c, opts.infinite);
  const read = warpRead(place);
  const rgb = (c) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
  const box = chartFrame(index);

  const img = ctx.createImageData(index.w, index.h);
  const data = img.data;
  const navy = ink.navy || [12, 18, 32];
  const cart = ink.cart || [11, 99, 173];
  for (let y = 0; y < index.h; y++) {
    for (let x = 0; x < index.w; x++) {
      const nu = (x + 0.5 - (box.cx - index.x)) / box.rad;
      const nv = ((box.cy - index.y) - (y + 0.5)) / box.rad;
      const hit = chartPoint(nu, nv, WARP_SPAN);
      const i = (y * index.w + x) * 4;
      if (hit.pole) {
        data[i] = ink.polar[0];
        data[i + 1] = ink.polar[1];
        data[i + 2] = ink.polar[2];
        data[i + 3] = 255;
        continue;
      }
      const s = Math.max(0, Math.min(1, areaScale(hit.re, hit.im)));
      data[i] = navy[0] + (cart[0] - navy[0]) * s;
      data[i + 1] = navy[1] + (cart[1] - navy[1]) * s;
      data[i + 2] = navy[2] + (cart[2] - navy[2]) * s;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, index.x, index.y);

  ctx.save();
  ctx.beginPath();
  ctx.rect(index.x, index.y, index.w, index.h);
  ctx.clip();
  ctx.strokeStyle = `rgba(${rgb(ink.text)},0.55)`;
  ctx.lineWidth = Math.max(1, px);
  for (const d of RINGS) {
    const pts = ringPoints(d).map((p) => screenOf(index, p[0], p[1])).filter(Boolean);
    stroke(ctx, pts);
  }
  if (!place.infinite) {
    const here = ringPoints(read.toZero).map((p) => screenOf(index, p[0], p[1])).filter(Boolean);
    ctx.strokeStyle = `rgba(${rgb(ink.input)},0.95)`;
    ctx.lineWidth = Math.max(1.6, px * 1.4);
    stroke(ctx, here);
    const at = screenOf(index, place.re, place.im);
    if (at) {
      ctx.fillStyle = `rgba(${rgb(ink.input)},1)`;
      ctx.beginPath();
      ctx.arc(at[0], at[1], Math.max(5, 6 * px), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.92)`;
  ctx.font = `${Math.max(12, 13 * px)}px ${ink.font || 'sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('the chart', index.x + 10 * px, index.y + 8 * px);
  ctx.restore();

  const cx = sphere.x + sphere.w * 0.5;
  const cy = sphere.y + sphere.h * 0.52;
  const rad = Math.min(sphere.w, sphere.h) * 0.38;
  const scale = rad / BOOK_R;
  ctx.save();
  ctx.beginPath();
  ctx.rect(sphere.x, sphere.y, sphere.w, sphere.h);
  ctx.clip();
  ctx.fillStyle = `rgb(${navy[0] | 0},${navy[1] | 0},${navy[2] | 0})`;
  ctx.fillRect(sphere.x, sphere.y, sphere.w, sphere.h);
  ctx.strokeStyle = `rgba(${rgb(ink.muted)},0.7)`;
  ctx.lineWidth = Math.max(1, px);
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();
  const equator = [];
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    equator.push(project(bookLift(Math.cos(t), Math.sin(t)), cx, cy, scale));
  }
  ctx.strokeStyle = `rgba(${rgb(ink.muted)},0.4)`;
  stroke(ctx, equator);
  for (const d of RINGS) {
    const pts = ringPoints(d).map((p) => project(bookLift(p[0], p[1]), cx, cy, scale));
    ctx.strokeStyle = `rgba(${rgb(ink.text)},0.55)`;
    stroke(ctx, pts);
  }
  const pole = project({ x: 0, y: 0, z: 1 }, cx, cy, scale);
  const south = project(bookLift(0, 0), cx, cy, scale);
  ctx.fillStyle = `rgba(${rgb(ink.polar)},1)`;
  ctx.beginPath();
  ctx.arc(pole[0], pole[1], Math.max(4, 5 * px), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${rgb(ink.cart)},0.9)`;
  ctx.beginPath();
  ctx.arc(south[0], south[1], Math.max(3, 3.5 * px), 0, Math.PI * 2);
  ctx.fill();
  if (!place.infinite) {
    const here = ringPoints(read.toZero).map((p) => project(bookLift(p[0], p[1]), cx, cy, scale));
    ctx.strokeStyle = `rgba(${rgb(ink.input)},0.95)`;
    ctx.lineWidth = Math.max(1.6, px * 1.4);
    stroke(ctx, here);
    const at = project(bookLift(place.re, place.im), cx, cy, scale);
    ctx.fillStyle = `rgba(${rgb(ink.input)},1)`;
    ctx.beginPath();
    ctx.arc(at[0], at[1], Math.max(5, 6 * px), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = `rgba(${rgb(ink.input)},1)`;
    ctx.lineWidth = Math.max(2, px * 1.6);
    ctx.beginPath();
    ctx.arc(pole[0], pole[1], Math.max(8, 9 * px), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.92)`;
  ctx.font = `${Math.max(12, 13 * px)}px ${ink.font || 'sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('the sphere', sphere.x + 10 * px, sphere.y + 8 * px);
  ctx.restore();
}
