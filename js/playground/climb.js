// The orbit of 0 on the book's sphere. A walk that leaves ends at the north
// pole, which is infinity, one point. A walk that stays never reaches it.
// Figure 2.5.2 is the sphere. Exercise 14 gives the coordinates.
// Theorem 4.2.11 is the sentence: one piece when the orbit stays bounded,
// dust when it leaves. The book does not number this picture.

import { bookLift, geodesic, unitFromLift, BOOK_CENTER, BOOK_R } from './bend.js';

const YAW = 0.38;
const TILT = 0.78;

export function criticalWalk(c, limit = 32) {
  const cre = Number(c && c[0]) || 0;
  const cim = Number(c && c[1]) || 0;
  const points = [[0, 0]];
  let re = 0;
  let im = 0;
  let left = false;
  const cusp = Math.abs(cim) < 1e-8 && Math.abs(cre - 0.25) <= 1e-9;
  for (let n = 0; n < limit; n++) {
    const nr = re * re - im * im + cre;
    const ni = 2 * re * im + cim;
    re = nr;
    im = ni;
    if (!Number.isFinite(re) || re * re + im * im > 4) {
      left = true;
      break;
    }
    const prev = points[points.length - 1];
    if (Math.hypot(re - prev[0], im - prev[1]) > 1e-4) points.push([re, im]);
  }
  let fate = 'stay';
  if (left) fate = 'leave';
  else if (cusp) fate = 'cusp';
  return { points, left, fate };
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

export function paintClimbSphere(ctx, frame, opts) {
  if (!frame) return;
  const ink = opts.ink;
  const px = Math.max(1, opts.scale || 1);
  const walk = criticalWalk(opts.c);
  const cx = frame.x + frame.w * 0.5;
  const cy = frame.y + frame.h * 0.52;
  const rad = Math.min(frame.w, frame.h) * 0.4;
  const scale = rad / BOOK_R;
  const rgb = (c) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;
  const pole = project({ x: 0, y: 0, z: 1 }, cx, cy, scale);

  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();

  ctx.strokeStyle = `rgba(${rgb(ink.muted)},0.55)`;
  ctx.lineWidth = Math.max(1, px);
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();

  const equator = [];
  const realMeridian = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    equator.push(project(bookLift(Math.cos(t), Math.sin(t)), cx, cy, scale));
    const u = -8 + (16 * i) / 64;
    realMeridian.push(project(bookLift(u, 0), cx, cy, scale));
  }
  ctx.strokeStyle = `rgba(${rgb(ink.muted)},0.35)`;
  stroke(ctx, equator);
  stroke(ctx, realMeridian);

  // Each step is a point of the orbit. The stroke between them is the short
  // arc on the book's sphere. A straight screen line would cut through the
  // ball, and the sentence is a climb on the surface. A leaving walk ends
  // at the north pole, which is infinity, one point.
  const lifts = walk.points.map((q) => bookLift(q[0], q[1]));
  const poleP = { x: 0, y: 0, z: 1 };
  const knots = walk.left ? lifts.concat([poleP]) : lifts;
  const screen = knots.map((p) => project(p, cx, cy, scale));
  const trail = [];
  for (let i = 0; i < knots.length; i++) {
    if (i === 0) {
      trail.push(screen[0]);
      continue;
    }
    const arc = geodesic(unitFromLift(knots[i - 1]), unitFromLift(knots[i]), 16);
    for (let k = 1; k < arc.length; k++) trail.push(project(arc[k], cx, cy, scale));
  }
  ctx.strokeStyle = `rgba(${rgb(ink.polar)},1)`;
  ctx.lineWidth = Math.max(2.2, px * 1.6);
  stroke(ctx, trail);
  screen.forEach((s, i) => {
    const last = i === screen.length - 1;
    ctx.fillStyle = last && walk.left
      ? `rgba(${rgb(ink.polar)},1)`
      : `rgba(${rgb(ink.input)},0.95)`;
    ctx.beginPath();
    ctx.arc(s[0], s[1], (last ? 6.2 : 4.2) * px, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = `rgba(${rgb(ink.polar)},1)`;
  ctx.beginPath();
  ctx.arc(pole[0], pole[1], 6.5 * px, 0, Math.PI * 2);
  ctx.fill();

  const fontPx = Math.max(15 * px, 15);
  ctx.font = `600 ${fontPx}px ${opts.font || ink.font || 'system-ui, sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const plate = ink.bg || [13, 18, 28];
  const pad = 4 * px;
  const margin = 8 * px;
  const gap = 12 * px;
  // The corner chip "the orbit of 0" is painted on the bitmap under this overlay.
  const chipPadX = fontPx * 0.42;
  const chipPadY = fontPx * 0.28;
  const chipMargin = 12 * px;
  const chipTw = ctx.measureText('the orbit of 0').width;
  const taken = [{
    l: frame.x + chipMargin,
    r: frame.x + chipMargin + chipTw + chipPadX * 2,
    t: frame.y + chipMargin,
    b: frame.y + chipMargin + fontPx + chipPadY * 2,
  }];
  const segments = [];
  for (let i = 1; i < trail.length; i++) segments.push([trail[i - 1], trail[i]]);
  const hitsPoint = (box, p, r) => p[0] >= box.l - r && p[0] <= box.r + r && p[1] >= box.t - r && p[1] <= box.b + r;
  const hitsBox = (a, b) => a.l < b.r + 8 * px && a.r + 8 * px > b.l && a.t < b.b + 8 * px && a.b + 8 * px > b.t;
  // The plate stays a full tap off the arc. Four pixels was the ink touching the stroke.
  const arcClear = 16 * px;
  const hitsSeg = (box, a, b) => {
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (4 * px)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (hitsPoint(box, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], arcClear)) return true;
    }
    return false;
  };
  const clear = (box) => {
    if (box.l < frame.x + margin || box.r > frame.x + frame.w - margin) return false;
    if (box.t < frame.y + margin || box.b > frame.y + frame.h - margin) return false;
    if (hitsPoint(box, pole, 8 * px)) return false;
    if (screen.some((p) => hitsPoint(box, p, 8 * px))) return false;
    if (segments.some((s) => hitsSeg(box, s[0], s[1]))) return false;
    if (taken.some((r) => hitsBox(box, r))) return false;
    return true;
  };
  const name = (text, anchor, prefer) => {
    const tw = ctx.measureText(text).width;
    const order = prefer === 'left' ? ['left', 'above', 'right', 'below']
      : prefer === 'right' ? ['right', 'above', 'left', 'below']
      : ['above', 'right', 'left', 'below'];
    const at = {
      left: [anchor[0] - tw - gap, anchor[1] + fontPx * 0.35],
      right: [anchor[0] + gap, anchor[1] + fontPx * 0.35],
      above: [anchor[0] - tw * 0.5, anchor[1] - gap],
      below: [anchor[0] - tw * 0.5, anchor[1] + fontPx + gap],
    };
    let chosen = null;
    for (const side of order) {
      const [left, base] = at[side];
      const box = { l: left - pad, r: left + tw + pad, t: base - fontPx, b: base - fontPx + fontPx * 1.28 };
      if (!clear(box)) continue;
      chosen = { left, base, box };
      break;
    }
    if (!chosen) {
      // The preferred sides are full. Step the plate up, then down, and keep the point clear.
      // The plate includes its pad. A clamp that stops at the word, and not the pad,
      // sets a phone-width word one pad past the pane, and clear() drops it.
      // "approaches" is that word. A long arc can fill the first eight steps.
      // "climbs" on the opening walk is that arc. Keep looking until the plate
      // has left the pane. A place that already fit is still the first one found.
      const minL = frame.x + margin + pad;
      const maxL = frame.x + frame.w - margin - pad - tw;
      for (let step = 0; step < 28 && !chosen; step++) {
        for (const dir of [-1, 1]) {
          for (const shift of [0, -1, 1, -2, 2]) {
            const base = anchor[1] + dir * (fontPx + arcClear + step * (fontPx * 0.55));
            const left = Math.max(minL, Math.min(maxL, anchor[0] - tw * 0.5 + shift * Math.max(arcClear, tw * 0.35)));
            const box = { l: left - pad, r: left + tw + pad, t: base - fontPx, b: base - fontPx + fontPx * 1.28 };
            if (clear(box)) { chosen = { left, base, box }; break; }
          }
        }
      }
    }
    if (!chosen) return;
    ctx.fillStyle = `rgba(${rgb(plate)},0.92)`;
    ctx.fillRect(chosen.box.l, chosen.box.t, chosen.box.r - chosen.box.l, chosen.box.b - chosen.box.t);
    ctx.fillStyle = `rgba(${rgb(ink.text)},0.96)`;
    ctx.fillText(text, chosen.left, chosen.base);
    taken.push(chosen.box);
  };
  name('north pole', pole, 'above');
  const word = walk.fate === 'leave' ? 'climbs' : walk.fate === 'cusp' ? 'approaches' : 'stays';
  // The verb names the fate, so it sits on the end of the walk. On a cusp
  // the second step is still near 0. The approach is the last finite point.
  const anchor = screen[Math.max(0, lifts.length - 1)] || screen[0];
  if (anchor) name(word, anchor, walk.fate === 'leave' ? 'left' : 'above');
  ctx.restore();
  return walk;
}
