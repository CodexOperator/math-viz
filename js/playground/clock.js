// One step of a playing path. The period is one full loop.
// A hidden tab does not move. A visible frame whose elapsed time was swallowed
// (a long paint, longer than one frame) still takes one frame, so Play cannot
// sit on the first sample.

export function advancePathTime(t, dtMs, periodMs, hidden) {
  const cur = Number(t);
  const base = Number.isFinite(cur) ? cur : 0;
  if (hidden) return base;
  const period = Math.max(1, Number(periodMs) || 1);
  const dt = Number(dtMs);
  const step = dt > 0 ? dt : 16;
  let next = base + step / period;
  next %= 1;
  if (next < 0) next += 1;
  return next;
}
