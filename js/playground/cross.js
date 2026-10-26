// The crossing. One number, two planes.
// Left: the set of c, Figure 4.6, page 114. The orange ring is c.
// Right: the Julia set of that c, Theorem 4.9, page 113.
// f_c(0) = c, so the marked point on the Julia pane is the first landing
// of the orbit of 0. The book does not number this split.

export function criticalOrbit(c, limit = 14) {
  const re = Number(c && c[0]) || 0;
  const im = Number(c && c[1]) || 0;
  const pts = [[0, 0]];
  let x = 0;
  let y = 0;
  for (let i = 0; i < limit; i++) {
    const nx = x * x - y * y + re;
    const ny = 2 * x * y + im;
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || Math.hypot(nx, ny) > 6) break;
    pts.push([nx, ny]);
    x = nx;
    y = ny;
  }
  return pts;
}

function toPx(frame, win, z) {
  const aspect = frame.w / Math.max(1, frame.h);
  const span = win && win.span > 0 ? win.span : 2.6;
  const cx = win && Number.isFinite(win.cx) ? win.cx : 0;
  const cy = win && Number.isFinite(win.cy) ? win.cy : 0;
  const u = (z[0] - cx) / (span * aspect) + 0.5;
  const v = 0.5 - (z[1] - cy) / span;
  return [frame.x + u * frame.w, frame.y + v * frame.h];
}

export function paintCross(ctx, frames, opts) {
  const julia = frames && frames.julia;
  if (!julia) return;
  const ink = opts.ink || {};
  const px = Math.max(1, opts.scale || 1);
  const c = opts.c || [0, 1];
  const win = opts.juliaWin || { cx: 0, cy: 0, span: 2.6 };
  const pts = criticalOrbit(c).map((z) => toPx(julia, win, z));
  const rgb = (col, a) => {
    const src = col || [230, 236, 245];
    return `rgba(${src[0] | 0},${src[1] | 0},${src[2] | 0},${a})`;
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(julia.x, julia.y, julia.w, julia.h);
  ctx.clip();
  ctx.lineWidth = Math.max(1.25, 1.6 * px);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgb(ink.cart, 0.95);
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  });
  ctx.stroke();
  const dot = Math.max(3.5, 4.2 * px);
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.fillStyle = i === 0 ? rgb(ink.text, 0.95) : rgb(ink.cart, 0.95);
    ctx.arc(p[0], p[1], i === 1 ? dot * 0.7 : dot * 0.45, 0, Math.PI * 2);
    ctx.fill();
  });
  if (pts[1]) {
    ctx.beginPath();
    ctx.strokeStyle = rgb(ink.polar, 1);
    ctx.lineWidth = Math.max(1.5, 2 * px);
    ctx.arc(pts[1][0], pts[1][1], Math.max(6, 7.5 * px), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
