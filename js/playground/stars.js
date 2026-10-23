// A static star field. Drawn once. Device tilt may shift it; a steady tilt does not keep painting.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function starField(seed, count = 2000) {
  const rand = mulberry32(seed >>> 0);
  const stars = [];
  for (let i = 0; i < count; i++) {
    const roll = rand();
    let tone = 'white';
    if (roll > 0.97) tone = 'cart';
    else if (roll > 0.94) tone = 'polar';
    else if (roll > 0.91) tone = 'input';
    else if (roll > 0.88) tone = 'output';
    stars.push({
      x: rand(),
      y: rand(),
      r: 0.4 + rand() * 1.3,
      a: 0.25 + rand() * 0.7,
      tone,
    });
  }
  return stars;
}

const TONE = {
  white: [232, 236, 245],
  cart: null,
  polar: null,
  input: null,
  output: null,
};

export function drawStars(ctx, stars, w, h, ink, shift = { x: 0, y: 0 }) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0d121c';
  ctx.fillRect(0, 0, w, h);
  const tint = {
    white: [232, 236, 245],
    cart: ink.cart,
    polar: ink.polar,
    input: ink.input,
    output: ink.output,
  };
  for (const s of stars) {
    const c = tint[s.tone] || TONE.white;
    const x = ((s.x + shift.x) % 1 + 1) % 1 * w;
    const y = ((s.y + shift.y) % 1 + 1) % 1 * h;
    ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${s.a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
