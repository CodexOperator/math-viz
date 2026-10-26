// Newton's walk for z^d − 1, on the plane and on the book's sphere.
// Equation (1.43), page 31 is the roots. Figure 4.3, page 112 colours z^3 + 1.
// This picture colours z^d − 1. Figure 2.22, page 73 is the sphere. Exercise 14
// gives the coordinates. The north pole is infinity, and it is not a root.
// The book does not number Newton's walk on this sphere.

import { bookLift, geodesic, unitFromLift, BOOK_CENTER, BOOK_R } from './bend.js';
import { unityRoots, unityStep, unityDegree, sampleUnity, basinHue } from './field.js';

const YAW = 0.42;
const TILT = 0.62;

export function newtonWalk(z0, d, limit = 18) {
  const n = unityDegree(d);
  const roots = unityRoots(n);
  const z = [Number(z0 && z0[0]) || 0, Number(z0 && z0[1]) || 0];
  const points = [[z[0], z[1]]];
  let broke = false;
  let root = -1;
  if (Math.hypot(z[0], z[1]) < 1e-8) {
    const step = unityStep(z, n);
    broke = !step;
    return { points, broke, root, degree: n, roots };
  }
  for (let k = 0; k < limit; k++) {
    const next = unityStep(points[points.length - 1], n);
    if (!next || !Number.isFinite(next[0]) || !Number.isFinite(next[1])) {
      broke = true;
      break;
    }
    points.push(next);
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < roots.length; i++) {
      const dist = Math.hypot(next[0] - roots[i][0], next[1] - roots[i][1]);
      if (dist < bestD) { bestD = dist; best = i; }
    }
    if (bestD < 1e-4) {
      root = best;
      break;
    }
    if (Math.hypot(next[0], next[1]) > 12) break;
  }
  if (root < 0) {
    const last = points[points.length - 1];
    const hit = sampleUnity(last, n, 8);
    if (hit && hit.root >= 0 && hit.n < 8) root = hit.root;
  }
  return { points, broke, root, degree: n, roots };
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

function rgb(c) {
  return `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
}

let stippleKey = '';
let stipplePts = [];

function stipple(degree, frame) {
  const key = `${degree}|${frame.w | 0}|${frame.h | 0}`;
  if (key === stippleKey) return stipplePts;
  const pts = [];
  const cols = 22;
  const rows = 16;
  const reach = 1.8;
  for (let j = 0; j < rows; j++) {
    const im = -reach + (2 * reach) * ((j + 0.5) / rows);
    for (let i = 0; i < cols; i++) {
      const re = -reach + (2 * reach) * ((i + 0.5) / cols);
      const s = sampleUnity([re, im], degree, 24);
      pts.push({ p: bookLift(re, im), root: s.root, degree: s.degree || degree });
    }
  }
  stippleKey = key;
  stipplePts = pts;
  return pts;
}

function plate(ctx, text, left, base, fontPx, ink) {
  const tw = ctx.measureText(text).width;
  const pad = 4;
  ctx.fillStyle = `rgba(${rgb(ink.bg || [13, 18, 28])},0.92)`;
  ctx.fillRect(left - pad, base - fontPx, tw + pad * 2, fontPx * 1.28);
  ctx.fillStyle = `rgba(${rgb(ink.text)},0.96)`;
  ctx.fillText(text, left, base);
}

// The north pole sits inside the silhouette. A plate measured from that dot
// lands on the ring. The bands keep a label entirely above the ring, and a
// second label entirely below it, with a line of air on both.
export function sphereStage(pane, px) {
  const fontPx = Math.max(15 * px, 15);
  const air = 12 * px;
  const edge = 8 * px;
  const plateH = fontPx * 1.28;
  const band = edge + plateH + air;
  const roomW = Math.max(48, pane.w - edge * 2);
  const roomH = Math.max(48, pane.h - band * 2);
  const rad = Math.min(roomW, roomH) * 0.46;
  return {
    cx: pane.x + pane.w * 0.5,
    cy: pane.y + band + (pane.h - band * 2) * 0.5,
    rad,
    fontPx,
    air,
    edge,
    plateH,
  };
}

export function paintOutside(ctx, text, pane, stage, where, ink) {
  const tw = ctx.measureText(text).width;
  let left = pane.x + (pane.w - tw) / 2;
  const minL = pane.x + stage.edge;
  const maxL = pane.x + pane.w - stage.edge - tw;
  if (left < minL) left = minL;
  if (left > maxL) left = Math.max(minL, maxL);
  const base = where === 'below'
    ? stage.cy + stage.rad + stage.air + stage.fontPx
    : stage.cy - stage.rad - stage.air - 0.28 * stage.fontPx;
  plate(ctx, text, left, base, stage.fontPx, ink);
}

export function paintFall(ctx, frames, opts) {
  if (!frames || !frames.index || !frames.julia) return null;
  const ink = opts.ink;
  const px = Math.max(1, opts.scale || 1);
  const degree = unityDegree(opts.degree);
  const guess = opts.guess || [0.45, 0.35];
  const win = opts.win;
  const walk = newtonWalk(guess, degree);
  const left = frames.index;
  const right = frames.julia;
  const aspect = left.w / Math.max(1, left.h);
  const toXY = (re, im) => {
    const u = (re - win.cx) / (win.span * aspect) + 0.5;
    const v = (win.cy - im) / win.span + 0.5;
    return [left.x + u * left.w, left.y + v * left.h];
  };

  ctx.save();
  ctx.beginPath();
  ctx.rect(left.x, left.y, left.w, left.h);
  ctx.clip();
  const screen = walk.points.map((p) => toXY(p[0], p[1]));
  ctx.lineWidth = Math.max(2, 1.6 * px);
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(${rgb(ink.input || ink.polar)},0.95)`;
  ctx.beginPath();
  let moved = false;
  const inset = Math.max(16 * px, 16);
  const box = {
    l: left.x + inset,
    t: left.y + inset,
    r: left.x + left.w - inset,
    b: left.y + left.h - inset,
  };
  for (let i = 0; i < screen.length; i++) {
    const p = screen[i];
    const inside = p[0] >= box.l && p[0] <= box.r && p[1] >= box.t && p[1] <= box.b;
    if (!inside) {
      if (moved) ctx.stroke();
      moved = false;
      continue;
    }
    if (!moved) { ctx.moveTo(p[0], p[1]); moved = true; }
    else ctx.lineTo(p[0], p[1]);
  }
  if (moved) ctx.stroke();
  const gxy = screen[0];
  if (gxy) {
    ctx.strokeStyle = `rgba(${rgb(ink.input || [70, 170, 90])},1)`;
    ctx.lineWidth = Math.max(2, 1.5 * px);
    ctx.beginPath();
    ctx.arc(gxy[0], gxy[1], 7 * px, 0, Math.PI * 2);
    ctx.stroke();
  }
  walk.roots.forEach((r, i) => {
    const s = toXY(r[0], r[1]);
    const hue = basinHue(i, degree, ink, 0);
    ctx.fillStyle = `rgba(${rgb(hue)},0.95)`;
    ctx.beginPath();
    ctx.arc(s[0], s[1], 5 * px, 0, Math.PI * 2);
    ctx.fill();
    if (degree > 3 && i >= 3) {
      const alt = basinHue(i, degree, ink, 1);
      ctx.fillStyle = `rgba(${rgb(alt)},0.95)`;
      ctx.beginPath();
      ctx.arc(s[0], s[1], 5 * px, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }
  });
  ctx.restore();

  const stage = sphereStage(right, px);
  const cx = stage.cx;
  const cy = stage.cy;
  const rad = stage.rad;
  const scale = rad / BOOK_R;
  const at = (re, im) => project(bookLift(re, im), cx, cy, scale);
  const pole = project({ x: 0, y: 0, z: 1 }, cx, cy, scale);

  ctx.save();
  ctx.beginPath();
  ctx.rect(right.x, right.y, right.w, right.h);
  ctx.clip();
  ctx.fillStyle = `rgba(${rgb(ink.muted)},0.45)`;
  for (const dot of stipple(degree, right)) {
    const s = project(dot.p, cx, cy, scale);
    const hue = basinHue(dot.root, degree, ink, ((s[0] + s[1]) / 8 | 0) & 1);
    ctx.fillStyle = `rgba(${rgb(hue)},0.55)`;
    ctx.fillRect(s[0], s[1], Math.max(1.4, px), Math.max(1.4, px));
  }
  ctx.strokeStyle = `rgba(${rgb(ink.muted)},0.7)`;
  ctx.lineWidth = Math.max(1.2, px);
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();

  const lifts = walk.points.map((p) => bookLift(p[0], p[1]));
  ctx.strokeStyle = `rgba(${rgb(ink.input || ink.polar)},0.95)`;
  ctx.lineWidth = Math.max(2, 1.6 * px);
  ctx.beginPath();
  let started = false;
  for (let i = 1; i < lifts.length; i++) {
    const arc = geodesic(unitFromLift(lifts[i - 1]), unitFromLift(lifts[i]), 10);
    for (const q of arc) {
      const s = project(q, cx, cy, scale);
      if (!started) { ctx.moveTo(s[0], s[1]); started = true; }
      else ctx.lineTo(s[0], s[1]);
    }
  }
  if (started) ctx.stroke();

  walk.roots.forEach((r, i) => {
    const s = at(r[0], r[1]);
    const hue = basinHue(i, degree, ink, 0);
    ctx.fillStyle = `rgba(${rgb(hue)},1)`;
    ctx.beginPath();
    ctx.arc(s[0], s[1], 6 * px, 0, Math.PI * 2);
    ctx.fill();
    if (degree > 3 && i >= 3) {
      const alt = basinHue(i, degree, ink, 1);
      ctx.fillStyle = `rgba(${rgb(alt)},1)`;
      ctx.beginPath();
      ctx.arc(s[0], s[1], 6 * px, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }
  });

  const gs = at(guess[0], guess[1]);
  ctx.strokeStyle = `rgba(${rgb(ink.input || [70, 170, 90])},1)`;
  ctx.lineWidth = Math.max(2, 1.6 * px);
  ctx.beginPath();
  ctx.arc(gs[0], gs[1], 7.5 * px, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `rgba(${rgb(ink.polar)},1)`;
  ctx.beginPath();
  ctx.arc(pole[0], pole[1], 6 * px, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `600 ${stage.fontPx}px ${opts.font || ink.font || 'system-ui, sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  paintOutside(ctx, 'not a root', right, stage, 'above', ink);
  if (walk.broke) paintOutside(ctx, 'step breaks', right, stage, 'below', ink);
  ctx.restore();
  return walk;
}
