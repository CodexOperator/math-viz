// Newton's walk for (z−1)(z²+z+c), on the plane and on the book's sphere.
// At c = 1 the polynomial is z³ − 1, Equation (1.43), page 31. Figure 4.3, page 112
// colour z³ + 1. Example 4.7, page 110 is z² + 1. This picture colours this cubic.
// Figure 2.22, page 73 is the sphere. Exercise 14 gives the coordinates. The north
// pole is infinity, and it is not a root. The book does not number this cubic,
// and it does not number Newton's walk for it on this sphere.

import { bookLift, geodesic, unitFromLift, BOOK_CENTER, BOOK_R } from './bend.js';
import { csqrt, newtonRoots, newtonStep, samplePoint, basinHue } from './field.js';
import { sphereStage, paintOutside } from './fall.js';

const YAW = 0.42;
const TILT = 0.62;

export function leanCritical(c) {
  const re = (1 - (Number(c && c[0]) || 0)) / 3;
  const im = -(Number(c && c[1]) || 0) / 3;
  const s = csqrt(re, im);
  return [[s[0], s[1]], [-s[0], -s[1]]];
}

export function leanBroke(z, c) {
  const step = newtonStep(z, c);
  if (!step || !Number.isFinite(step[0]) || !Number.isFinite(step[1])) return true;
  return leanCritical(c).some((q) => Math.hypot(z[0] - q[0], z[1] - q[1]) < 1e-3);
}

export function leanWalk(z0, c, limit = 18) {
  const cc = [Number(c && c[0]) || 0, Number(c && c[1]) || 0];
  const roots = newtonRoots(cc);
  const z = [Number(z0 && z0[0]) || 0, Number(z0 && z0[1]) || 0];
  const points = [[z[0], z[1]]];
  let broke = false;
  let root = -1;
  const first = newtonStep(z, cc);
  if (!first || !Number.isFinite(first[0]) || !Number.isFinite(first[1])) {
    return { points, broke: true, root, roots, c: cc };
  }
  for (let k = 0; k < limit; k++) {
    const next = newtonStep(points[points.length - 1], cc);
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
  if (root < 0 && !broke) {
    const last = points[points.length - 1];
    const hit = samplePoint('newton', last, cc, 2, 8, 'basin');
    if (hit && hit.root >= 0 && hit.n < 8) root = hit.root;
  }
  return { points, broke, root, roots, c: cc };
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

function stipple(c, frame) {
  const key = `${c[0].toFixed(5)}|${c[1].toFixed(5)}|${frame.w | 0}|${frame.h | 0}`;
  if (key === stippleKey) return stipplePts;
  const pts = [];
  const cols = 22;
  const rows = 16;
  const reach = 1.8;
  for (let j = 0; j < rows; j++) {
    const im = -reach + (2 * reach) * ((j + 0.5) / rows);
    for (let i = 0; i < cols; i++) {
      const re = -reach + (2 * reach) * ((i + 0.5) / cols);
      const s = samplePoint('newton', [re, im], c, 2, 24, 'basin');
      pts.push({ p: bookLift(re, im), root: s.root });
    }
  }
  stippleKey = key;
  stipplePts = pts;
  return pts;
}

export function paintLean(ctx, frames, opts) {
  if (!frames || !frames.index || !frames.julia) return null;
  const ink = opts.ink;
  const px = Math.max(1, opts.scale || 1);
  const c = opts.c || [0.5, 0];
  const guess = opts.guess || [0.2, 0.55];
  const win = opts.win;
  const walk = leanWalk(guess, c);
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
    ctx.fillStyle = `rgba(${rgb(basinHue(i, 3, ink, 0))},0.95)`;
    ctx.beginPath();
    ctx.arc(s[0], s[1], 5 * px, 0, Math.PI * 2);
    ctx.fill();
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
  for (const dot of stipple(c, right)) {
    const s = project(dot.p, cx, cy, scale);
    const hue = basinHue(dot.root, 3, ink, ((s[0] + s[1]) / 8 | 0) & 1);
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
    ctx.fillStyle = `rgba(${rgb(basinHue(i, 3, ink, 0))},1)`;
    ctx.beginPath();
    ctx.arc(s[0], s[1], 6 * px, 0, Math.PI * 2);
    ctx.fill();
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
