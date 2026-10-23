// Stereographic projection used by the playground sphere.
// The north pole is +Y and it is the point at infinity. The plane is (x, z),
// the same axes the latitude shader samples. A walk that leaves ends here.

const POLE = 0.985;

export function liftToSphere(re, im) {
  if (!Number.isFinite(re) || !Number.isFinite(im)) return { x: 0, y: 1, z: 0, infinite: true };
  const s = re * re + im * im;
  if (s > 1e12) return { x: 0, y: 1, z: 0, infinite: true };
  const d = s + 1;
  return { x: (2 * re) / d, y: (s - 1) / d, z: (2 * im) / d, infinite: false };
}

// Inverse of liftToSphere. Null at the north pole, where the plane has no finite point.
export function planeFromSphere(x, y, z) {
  if (![x, y, z].every(Number.isFinite)) return null;
  const den = 1 - y;
  if (!(den > 1 - POLE)) return null;
  return { re: x / den, im: z / den };
}

export function slerp(a, b, t) {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z;
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-4) return { x: a.x, y: a.y, z: a.z };
  const s = Math.sin(omega);
  const u = Math.sin((1 - t) * omega) / s;
  const v = Math.sin(t * omega) / s;
  return { x: u * a.x + v * b.x, y: u * a.y + v * b.y, z: u * a.z + v * b.z };
}

// Unit-sphere samples of an orbit. An escape appends the north pole.
// Long chords are cut so the line stays on the sphere.
export function orbitOnSphere(points, escaped, radius = 1.012) {
  const lifts = [];
  const src = points || [];
  const cap = Math.min(src.length, 256);
  const start = src.length - cap;
  for (let i = start; i < src.length; i++) {
    const p = src[i];
    if (!p || !Number.isFinite(p.re) || !Number.isFinite(p.im)) break;
    const s = liftToSphere(p.re, p.im);
    if (s.infinite) break;
    lifts.push(s);
  }
  if (escaped) lifts.push({ x: 0, y: 1, z: 0, infinite: true });
  const out = [];
  const poleIndex = escaped ? lifts.length - 1 : -1;
  for (let i = 0; i < lifts.length; i++) {
    const cur = lifts[i];
    if (i === 0) {
      out.push({ x: cur.x * radius, y: cur.y * radius, z: cur.z * radius, pole: i === poleIndex });
      continue;
    }
    const prev = lifts[i - 1];
    const dot = Math.max(-1, Math.min(1, prev.x * cur.x + prev.y * cur.y + prev.z * cur.z));
    const steps = Math.max(1, Math.ceil(Math.acos(dot) / 0.12));
    for (let k = 1; k <= steps; k++) {
      const q = slerp(prev, cur, k / steps);
      out.push({
        x: q.x * radius, y: q.y * radius, z: q.z * radius,
        pole: i === poleIndex && k === steps,
      });
    }
  }
  return out;
}
