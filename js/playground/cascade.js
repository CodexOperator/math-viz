// The real cascade. c runs from the tip to the cusp. The diagram is the
// orbit of 0 after the transient. No clock and no model: the same c is the
// same column. The book does not number this picture.

import { CASCADE_LO, CASCADE_HI, FEIGENBAUM, attractingCycle } from './playground.js';

export { CASCADE_LO, CASCADE_HI, FEIGENBAUM };

export const PLOT = { yLo: -2, yHi: 2 };

// The cusp, the two real hinges a learner can feel, and the accumulation.
// The hinges are where a period meets the next. The book does not number them
// except the cusp, which is Exercise 8.
export const REAL_MARKS = [
  { c: 0.25, name: 'cusp' },
  { c: -0.75, name: 'hinge' },
  { c: -1.25, name: 'hinge' },
  { c: FEIGENBAUM, name: 'pile' },
];

export function cFromU(u) {
  const t = Math.min(1, Math.max(0, Number(u) || 0));
  return CASCADE_LO + (CASCADE_HI - CASCADE_LO) * t;
}

export function uFromC(c) {
  return (c - CASCADE_LO) / (CASCADE_HI - CASCADE_LO);
}

export function orbitColumn(c, transient = 48, plot = 36) {
  let z = 0;
  const ys = [];
  const warm = transient | 0;
  const keep = plot | 0;
  for (let n = 0; n < warm + keep; n++) {
    z = z * z + c;
    if (!Number.isFinite(z) || Math.abs(z) > 8) return ys;
    if (n >= warm) ys.push(z);
  }
  return ys;
}

let columnsCache = null;
export function bifurcationColumns(n) {
  const count = Math.max(40, n | 0);
  if (columnsCache && columnsCache.n === count) return columnsCache.cols;
  const cols = new Array(count);
  const span = CASCADE_HI - CASCADE_LO;
  for (let i = 0; i < count; i++) {
    const c = CASCADE_LO + span * ((i + 0.5) / count);
    cols[i] = { c, ys: orbitColumn(c) };
  }
  columnsCache = { n: count, cols };
  return cols;
}

// The tip sends 0 to the repelling point 2. That flag is not a parabolic bulb.
export function realClass(c) {
  const re = Number(c) || 0;
  if (re <= -1.999) return { kind: 'tip', period: 0, parabolic: false, points: [] };
  const cycle = attractingCycle([re, 0], 280);
  if (!cycle.bounded) return { kind: 'leave', period: 0, parabolic: false, points: [] };
  if (cycle.parabolic) {
    return { kind: 'parabolic', period: cycle.period || 1, parabolic: true, points: cycle.points || [] };
  }
  if (!cycle.period) return { kind: 'pile', period: 0, parabolic: false, points: [] };
  return { kind: 'cycle', period: cycle.period, parabolic: false, points: cycle.points || [] };
}

let ribbonCache = null;
export function periodRibbon(n = 96) {
  const count = Math.max(32, n | 0);
  if (ribbonCache && ribbonCache.n === count) return ribbonCache.rows;
  const rows = new Array(count);
  const span = CASCADE_HI - CASCADE_LO;
  for (let i = 0; i < count; i++) {
    const c = CASCADE_LO + span * ((i + 0.5) / count);
    rows[i] = { c, ...realClass(c) };
  }
  ribbonCache = { n: count, rows };
  return rows;
}

// The run of the same period that contains this c. A later window of the
// same period, past the accumulation, is a different bulb.
export function bandOf(c, rows, info) {
  const here = info || realClass(c);
  if (here.kind !== 'cycle' || !here.period) {
    return { c0: c, c1: c, period: here.period || 0, kind: here.kind };
  }
  let best = null;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind !== 'cycle' || row.period !== here.period) continue;
    const start = i;
    while (i + 1 < rows.length && rows[i + 1].kind === 'cycle' && rows[i + 1].period === here.period) i++;
    const a = rows[start].c;
    const b = rows[i].c;
    if (c >= a - 0.02 && c <= b + 0.02) best = { c0: a, c1: b };
  }
  if (!best) return { c0: c, c1: c, period: here.period, kind: here.kind };
  return { c0: best.c0, c1: best.c1, period: here.period, kind: 'cycle' };
}
