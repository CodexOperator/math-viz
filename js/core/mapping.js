// js/core/mapping.js - carry a timed curve through a complex function.
//
// Pure module: no imports, no DOM, no globals. A complex number is {re, im}.
//
// pushForward(curve, f) returns the image as pieces. Every image point keeps the t of the input
// point it came from, so "when" on the z-plane matches "when" on the w-plane. The curve is
// refined where the map bends it, and cut where the image runs off to infinity (a pole never
// draws a line across the plane).
//
// Design: docs/designs/iter-1/i1-core-mapping.md (sections 4.2 and 5.2).

export const PUSH_DEFAULTS = Object.freeze({
  maxJump: 3, clampRadius: 40, maxDepth: 4, angleTol: 0.08, maxPoints: 20000,
});

// Not a PUSH_DEFAULTS key: the option is off unless a caller asks for it, so every existing call keeps its output.
//   maxImageStep (positive number, default off): a segment whose image step |w(b) - w(a)| is longer than this is bisected
//   (in z), like a bend, up to maxDepth times and while maxPoints allows. A step next to a dropped sample is left alone.

const HALF_PI = Math.PI / 2;
const MIN_SEGMENTS = 16;
const TINY = 1e-15;

// ----- private helpers ----------------------------------------------------

function lerp(a, b, u) {
  return a === b ? a : a * (1 - u) + b * u;
}

function resolve(opts) {
  const o = { ...PUSH_DEFAULTS };
  const src = opts && typeof opts === 'object' ? opts : {};
  for (const key of Object.keys(PUSH_DEFAULTS)) {
    if (src[key] === undefined || src[key] === null) continue;
    const v = Number(src[key]);
    if (!Number.isNaN(v)) o[key] = v;
  }
  o.maxDepth = Math.min(8, Math.max(0, Math.floor(o.maxDepth)));
  if (!(o.angleTol > 0)) o.angleTol = PUSH_DEFAULTS.angleTol;
  if (!(o.clampRadius > 0)) o.clampRadius = PUSH_DEFAULTS.clampRadius;
  if (!(o.maxJump > 1)) o.maxJump = PUSH_DEFAULTS.maxJump;
  if (!(o.maxPoints >= 16)) o.maxPoints = PUSH_DEFAULTS.maxPoints;
  const step = src.maxImageStep === undefined || src.maxImageStep === null ? NaN : Number(src.maxImageStep);
  o.maxImageStep = step > 0 && Number.isFinite(step) ? step : Infinity;  // Infinity: no step is ever too long
  return o;
}

const NAN_PAIR = () => ({ re: NaN, im: NaN });

// Evaluate f at z. Anything that throws, is not finite or is malformed means "no value".
function evalSafe(f, z) {
  if (typeof f !== 'function') return NAN_PAIR();
  try {
    let w = f({ re: z.re, im: z.im });
    if (typeof w === 'number') w = { re: w, im: 0 };
    if (!w || typeof w !== 'object') return NAN_PAIR();
    const re = w.re;
    const im = w.im;
    if (typeof re !== 'number' || typeof im !== 'number' || !Number.isFinite(re) || !Number.isFinite(im)) return NAN_PAIR();
    return { re, im };
  } catch (e) {
    return NAN_PAIR();
  }
}

// Signed turning angle from direction a to direction b.
function turn(ax, ay, bx, by) {
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

function sample(z, t, g, clampRadius) {
  const w = g(z);
  const ok = Number.isFinite(w.re) && Number.isFinite(w.im) && Math.hypot(w.re, w.im) <= clampRadius;
  return { z, t, w, ok };
}

// How much more the image turns at S[i] than the input does.
function bend(S, i) {
  const a = S[i - 1];
  const b = S[i];
  const c = S[i + 1];
  const z1x = b.z.re - a.z.re;
  const z1y = b.z.im - a.z.im;
  const z2x = c.z.re - b.z.re;
  const z2y = c.z.im - b.z.im;
  const w1x = b.w.re - a.w.re;
  const w1y = b.w.im - a.w.im;
  const w2x = c.w.re - b.w.re;
  const w2y = c.w.im - b.w.im;
  if (Math.hypot(z1x, z1y) < 1e-12 || Math.hypot(z2x, z2y) < 1e-12 ||
      Math.hypot(w1x, w1y) < 1e-12 || Math.hypot(w2x, w2y) < 1e-12) return 0;
  return Math.abs(turn(w1x, w1y, w2x, w2y)) - Math.abs(turn(z1x, z1y, z2x, z2y));
}

// The shared pipeline. g maps one input point to its image point (an {re, im} that may be NaN).
function run(curve, g, o) {
  const P = curve && curve.points;
  if (!Array.isArray(P) || P.length < 2) return [];

  // densify short curves so that a 2-point stroke has interior vertices to refine
  let pts = P;
  const m = P.length - 1;
  if (m < MIN_SEGMENTS) {
    const k = Math.ceil(MIN_SEGMENTS / m);
    pts = [];
    for (let i = 0; i < m; i++) {
      const a = P[i];
      const b = P[i + 1];
      for (let j = 0; j < k; j++) {
        const u = j / k;
        pts.push({ re: lerp(a.re, b.re, u), im: lerp(a.im, b.im, u), t: lerp(a.t, b.t, u) });
      }
    }
    pts.push(P[m]);
  }

  let S = pts.map((p) => sample({ re: p.re, im: p.im }, p.t, g, o.clampRadius));
  let depth = new Array(S.length - 1).fill(0);

  // refine where the image turns more than the input turns, never next to a dropped sample
  for (;;) {
    const split = new Array(S.length - 1).fill(false);
    let any = false;
    let count = 0;
    for (let i = 1; i <= S.length - 2; i++) {
      if (S[i - 1].ok && S[i].ok && S[i + 1].ok && bend(S, i) > o.angleTol) {
        for (let s = i - 1; s <= i; s++) {
          if (depth[s] < o.maxDepth && S[s].ok && S[s + 1].ok) {
            if (!split[s]) { split[s] = true; count++; }
            any = true;
          }
        }
      }
    }
    if (o.maxImageStep < Infinity) {
      for (let s = 0; s < S.length - 1; s++) {
        if (split[s] || depth[s] >= o.maxDepth || !S[s].ok || !S[s + 1].ok) continue;
        if (Math.hypot(S[s + 1].w.re - S[s].w.re, S[s + 1].w.im - S[s].w.im) > o.maxImageStep) {
          split[s] = true;
          count++;
          any = true;
        }
      }
    }
    if (!any) break;
    if (S.length + count > o.maxPoints) break;
    const S2 = [];
    const d2 = [];
    for (let i = 0; i < S.length - 1; i++) {
      S2.push(S[i]);
      if (split[i]) {
        const a = S[i];
        const b = S[i + 1];
        const mid = { re: (a.z.re + b.z.re) / 2, im: (a.z.im + b.z.im) / 2 };
        S2.push(sample(mid, (a.t + b.t) / 2, g, o.clampRadius));
        d2.push(depth[i] + 1, depth[i] + 1);
      } else {
        d2.push(depth[i]);
      }
    }
    S2.push(S[S.length - 1]);
    S = S2;
    depth = d2;
  }

  // runs of kept samples
  const runs = [];
  let cur = [];
  for (const s of S) {
    if (s.ok) cur.push(s);
    else if (cur.length) { runs.push(cur); cur = []; }
  }
  if (cur.length) runs.push(cur);

  // median stretch |dw| / |dz| over every kept step
  const stretches = [];
  for (const r of runs) {
    for (let k = 0; k + 1 < r.length; k++) {
      const dz = Math.hypot(r[k + 1].z.re - r[k].z.re, r[k + 1].z.im - r[k].z.im);
      if (dz >= TINY) {
        const st = Math.hypot(r[k + 1].w.re - r[k].w.re, r[k + 1].w.im - r[k].w.im) / dz;
        if (st > 0) stretches.push(st);
      }
    }
  }
  stretches.sort((a, b) => a - b);
  const med = stretches.length >= 3 ? stretches[Math.floor(stretches.length / 2)] : 0;

  // stretch of the step between r[j] and r[j + 1]; -1 when the input does not move (no information)
  const stretchAt = (r, j) => {
    const dzj = Math.hypot(r[j + 1].z.re - r[j].z.re, r[j + 1].z.im - r[j].z.im);
    return dzj < TINY ? -1 : Math.hypot(r[j + 1].w.re - r[j].w.re, r[j + 1].w.im - r[j].w.im) / dzj;
  };
  const spike = o.maxJump * o.maxJump;

  // Cut leaps. A step is a candidate when its stretch is more than maxJump times the median.
  //   (a) pole leap: the image runs out to infinity and comes back, so the path reverses at both ends
  //       of the step (turn > pi/2); a pole approach is smooth, so it is never hit by rule (b);
  //   (b) teleport (a branch cut such as the principal square root on the negative axis): the path
  //       jumps and carries on in the same direction, so (a) cannot see it; the step's stretch is
  //       more than maxJump^2 times the stretch of every neighbouring step (a run end has one).
  //       The factor is maxJump^2, not maxJump: next to a pole the stretch ratio is exactly maxJump
  //       for a legitimate step (test M4).
  const pieces = [];
  for (const r of runs) {
    let startIdx = 0;
    for (let k = 0; k + 1 < r.length; k++) {
      if (!(med > 0)) break;
      const sx = r[k + 1].w.re - r[k].w.re;
      const sy = r[k + 1].w.im - r[k].w.im;
      const dz = Math.hypot(r[k + 1].z.re - r[k].z.re, r[k + 1].z.im - r[k].z.im);
      const stretch = dz < TINY ? 0 : Math.hypot(sx, sy) / dz;
      if (!(stretch > o.maxJump * med)) continue;
      const before = k >= 1 ? stretchAt(r, k - 1) : -1;
      const after = k + 2 < r.length ? stretchAt(r, k + 1) : -1;
      if ((before >= 0 || after >= 0) && (before < 0 || stretch > spike * before) && (after < 0 || stretch > spike * after)) {
        pieces.push(r.slice(startIdx, k + 1));
        startIdx = k + 1;
        continue;
      }
      let ends = 0;
      let reverses = true;
      if (k >= 1) {
        const px = r[k].w.re - r[k - 1].w.re;
        const py = r[k].w.im - r[k - 1].w.im;
        if (Math.hypot(px, py) > TINY) {
          ends++;
          if (Math.abs(turn(px, py, sx, sy)) <= HALF_PI) reverses = false;
        }
      }
      if (k + 2 < r.length) {
        const nx = r[k + 2].w.re - r[k + 1].w.re;
        const ny = r[k + 2].w.im - r[k + 1].w.im;
        if (Math.hypot(nx, ny) > TINY) {
          ends++;
          if (Math.abs(turn(sx, sy, nx, ny)) <= HALF_PI) reverses = false;
        }
      }
      if (ends > 0 && reverses) {
        pieces.push(r.slice(startIdx, k + 1));
        startIdx = k + 1;
      }
    }
    pieces.push(r.slice(startIdx));
  }

  const kept = pieces.filter((pc) => pc.length >= 2);
  const closed = !!curve.closed && kept.length === 1 && kept[0].length === S.length;
  return kept.map((pc, index) => {
    const out = {
      kind: curve.kind,
      family: curve.family ?? null,
      label: curve.label,
      points: pc.map((s) => ({ re: s.w.re, im: s.w.im, t: s.t })),
      closed: index === 0 && closed,
    };
    if (curve.id !== undefined) {
      out.id = `${curve.id}~${index}`;
      out.source = curve.id;
    }
    return out;
  });
}

// ----- public API ---------------------------------------------------------

export function pushForward(curve, f, opts = {}) {
  if (typeof f !== 'function') return [];
  return run(curve, (z) => evalSafe(f, z), resolve(opts));
}

export function pushForwardAll(curves, f, opts = {}) {
  const out = [];
  for (const c of Array.isArray(curves) ? curves : []) {
    for (const piece of pushForward(c, f, opts)) out.push(piece);
  }
  return out;
}

export function morphPoint(z, w, s) {
  const a = z && typeof z === 'object' ? z : NAN_PAIR();
  const b = w && typeof w === 'object' ? w : NAN_PAIR();
  if (s === 0) return { re: a.re, im: a.im };
  if (s === 1) return { re: b.re, im: b.im };
  return { re: (1 - s) * a.re + s * b.re, im: (1 - s) * a.im + s * b.im };
}

export function morph(curve, s, f, opts = {}) {
  let k = Number(s);
  k = Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 0;
  if (k === 0) {
    if (!curve || typeof curve !== 'object') return [];
    const copy = { ...curve, points: (Array.isArray(curve.points) ? curve.points : []).map((p) => ({ re: p.re, im: p.im, t: p.t })) };
    if (curve.id !== undefined) {
      copy.source = curve.id;
      copy.id = `${curve.id}~0`; // the same id as every piece at s > 0, so a host can key by id across the slider
    }
    return [copy];
  }
  if (k === 1) return pushForward(curve, f, opts);
  if (typeof f !== 'function') return [];
  return run(curve, (z) => morphPoint(z, evalSafe(f, z), k), resolve(opts));
}

export function bounds(curves) {
  const list = Array.isArray(curves) ? curves : (curves ? [curves] : []);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const c of list) {
    const P = c && Array.isArray(c.points) ? c.points : [];
    for (const p of P) {
      if (!p || !Number.isFinite(p.re) || !Number.isFinite(p.im)) continue;
      if (p.re < x0) x0 = p.re;
      if (p.re > x1) x1 = p.re;
      if (p.im < y0) y0 = p.im;
      if (p.im > y1) y1 = p.im;
    }
  }
  if (x0 > x1 || y0 > y1) return null;
  return { xRange: [x0, x1], yRange: [y0, y1] };
}

export function lift(curve, f) {
  const P = curve && Array.isArray(curve.points) ? curve.points : [];
  return P.map((p) => ({ re: p.re, im: p.im, t: p.t, w: evalSafe(f, p) }));
}

export function pointOnPieces(pieces, t) {
  if (!Array.isArray(pieces) || !Number.isFinite(t)) return null;
  for (const pc of pieces) {
    const P = pc && pc.points;
    if (!P || P.length === 0) continue;
    const n = P.length;
    if (t < P[0].t || t > P[n - 1].t) continue;
    if (n === 1) return { re: P[0].re, im: P[0].im };
    if (t <= P[0].t) return { re: P[0].re, im: P[0].im };
    if (t >= P[n - 1].t) return { re: P[n - 1].re, im: P[n - 1].im };
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (P[mid].t <= t) lo = mid;
      else hi = mid;
    }
    const a = P[lo];
    const b = P[lo + 1];
    const gap = b.t - a.t;
    if (!(gap > 0)) return { re: a.re, im: a.im };
    const u = (t - a.t) / gap;
    return { re: lerp(a.re, b.re, u), im: lerp(a.im, b.im, u) };
  }
  return null;
}
