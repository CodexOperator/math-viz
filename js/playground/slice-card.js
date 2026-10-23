// The slice as a card, turned from the set of c up to the Julia plane.
// This is a picture of the angle, not a projection that drops a coordinate
// and pretends the missing axis is still there. The texture is the real slice.

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const n = Math.hypot(a[0], a[1], a[2]);
  return n > 0 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 1, 0];
}
function rgba(rgb, a) {
  const c = rgb || [98, 173, 242];
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

function cardCorners(phi) {
  const s = Math.sin(phi);
  const co = Math.cos(phi);
  return [[-1, 0], [1, 0], [1, 1], [-1, 1]].map(([a, b]) => [a, b * s, b * co]);
}

function projector(w, h) {
  const eye = [2.2, 1.65, 2.7];
  const at = [0, 0.2, 0.25];
  const z = norm(sub(eye, at));
  const x = norm(cross([0, 1, 0], z));
  const y = norm(cross(z, x));
  const fov = 1.2;
  const sc = Math.min(w, h) * 0.46;
  return (p) => {
    const r = sub(p, eye);
    const depth = -dot(r, z);
    if (depth < 0.08) return null;
    const k = sc / (depth * fov);
    return { x: w / 2 + dot(r, x) * k, y: h / 2 - dot(r, y) * k };
  };
}

function affine(src, dst) {
  const [s0, s1, s2] = src;
  const [d0, d1, d2] = dst;
  const den = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(den) < 1e-4) return null;
  const solve = (a0, a1, a2) => {
    const A = (a0 * (s1.y - s2.y) + a1 * (s2.y - s0.y) + a2 * (s0.y - s1.y)) / den;
    const B = (a0 * (s2.x - s1.x) + a1 * (s0.x - s2.x) + a2 * (s1.x - s0.x)) / den;
    const C = (a0 * (s1.x * s2.y - s2.x * s1.y) + a1 * (s2.x * s0.y - s0.x * s2.y) + a2 * (s0.x * s1.y - s1.x * s0.y)) / den;
    return [A, B, C];
  };
  const X = solve(d0.x, d1.x, d2.x);
  const Y = solve(d0.y, d1.y, d2.y);
  return [X[0], Y[0], X[1], Y[1], X[2], Y[2]];
}

function strokeQuad(ctx, pts, style) {
  if (pts.some((p) => !p)) return;
  ctx.beginPath();
  ctx.strokeStyle = style;
  ctx.lineWidth = 1.25;
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
}

function paintTextured(ctx, img, quad) {
  if (!img || quad.some((p) => !p)) return;
  const sw = img.width;
  const sh = img.height;
  const src = [
    [{ x: 0, y: 0 }, { x: sw, y: 0 }, { x: sw, y: sh }],
    [{ x: 0, y: 0 }, { x: sw, y: sh }, { x: 0, y: sh }],
  ];
  const dst = [
    [quad[0], quad[1], quad[2]],
    [quad[0], quad[2], quad[3]],
  ];
  for (let t = 0; t < 2; t++) {
    const m = affine(src[t], dst[t]);
    if (!m) continue;
    ctx.save();
    ctx.beginPath();
    dst[t].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}

function paintChip(ctx, text, x, baseline, color, ink, px) {
  ctx.font = `600 ${px}px ${ink.font || 'system-ui, sans-serif'}`;
  ctx.textBaseline = 'alphabetic';
  const width = ctx.measureText(text).width;
  const padX = px * 0.42;
  const padY = px * 0.28;
  const top = baseline - px - padY;
  ctx.fillStyle = rgba(ink.bg, 0.92);
  ctx.fillRect(x, top, width + padX * 2, px + padY * 2);
  ctx.fillStyle = rgba(color, 1);
  ctx.fillText(text, x + padX, baseline);
}

// rect is the pane. image is a canvas of the slice. theta is 0..1.
// scale is canvas pixels per CSS pixel, so the labels stay at least 15px.
export function paintSliceCard(ctx, rect, theta, image, ink, scale) {
  const phi = Math.max(0, Math.min(1, Number(theta) || 0)) * Math.PI / 2;
  const px = Math.max(15, 15 * (scale > 0 ? scale : 1));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.translate(rect.x, rect.y);
  const proj = projector(rect.w, rect.h);
  const ghost = (ang, color) => strokeQuad(ctx, cardCorners(ang).map(proj), rgba(color, 0.55));
  ghost(0, ink.polar);
  ghost(Math.PI / 2, ink.cart);
  const quad = cardCorners(phi).map(proj);
  paintTextured(ctx, image, quad);
  strokeQuad(ctx, quad, rgba(ink.output, 0.95));
  const deg = Math.round((phi * 180) / Math.PI);
  paintChip(ctx, 'Julia', 12, 16 + px, ink.cart, ink, px);
  paintChip(ctx, `${deg}°`, 12, 16 + px * 2.45, ink.output, ink, px);
  paintChip(ctx, 'schematic', 12, 16 + px * 3.9, ink.text, ink, px);
  paintChip(ctx, 'set of c', 12, rect.h - 16, ink.polar, ink, px);
  ctx.restore();
}
