// Two orders. A section walk is worked example, then the faded proof, then
// the other items. Test prep interleaves sections by a seeded round-robin.
// The same seed rebuilds the same order. A new seed is a new set.

import { mulberry32 } from './seed.js';

const KIND_ORDER = {
  'proof-blank': 0,
  'proof-mc': 1,
  'next-step-blank': 2,
  'next-step-mc': 3,
  blank: 4,
  mc: 5,
  flash: 6,
};

export function sectionOfFocus(focus) {
  if (!focus) return null;
  const m = /^(\d+\.\d+)/.exec(String(focus));
  return m ? m[1] : null;
}

export function selectItems(items, { chapter = null, section = null } = {}) {
  return items.filter((it) => {
    if (chapter && it.chapter !== chapter) return false;
    if (section && it.section !== section) return false;
    return true;
  });
}

function bySectionThenKind(a, b) {
  if (a.section !== b.section) return a.section < b.section ? -1 : 1;
  const ag = a.generator ? 1 : 0;
  const bg = b.generator ? 1 : 0;
  if (ag !== bg) return ag - bg;
  return (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
}

// Worked example, then faded steps, for each proof written as a blank.
// The walk order does not move. The seed is what shuffles choices and generators.
export function sectionWalk(items, seed = 1) {
  const live = items.filter((it) => it.kind !== 'flash').sort(bySectionThenKind);
  const stamp = Number(seed) || 1;
  const out = [];
  for (const item of live) {
    if (item.kind === 'proof-blank') out.push({ source: item, seed: stamp, view: 'worked' });
    out.push({ source: item, seed: stamp, view: 'faded' });
  }
  return withSectionModels(out);
}

// Round-robin across sections so a run does not drill one section to exhaustion.
export function interleave(items, seed = 1) {
  const live = items.filter((it) => it.kind !== 'flash');
  const buckets = new Map();
  for (const it of live) {
    if (!buckets.has(it.section)) buckets.set(it.section, []);
    buckets.get(it.section).push(it);
  }
  const keys = [...buckets.keys()];
  const start = keys.length ? Math.abs(Number(seed) || 0) % keys.length : 0;
  const order = keys.slice(start).concat(keys.slice(0, start));
  const out = [];
  let guard = live.length + 1;
  while (out.length < live.length && guard > 0) {
    guard -= 1;
    for (const key of order) {
      const bucket = buckets.get(key);
      if (bucket.length) out.push(bucket.shift());
    }
  }
  const stamp = Number(seed) || 1;
  return out.map((item) => ({ source: item, seed: stamp, view: 'faded' }));
}

// The mixed set opens on one worked proof, then that proof with the blanks.
// The page passes only the open chapters. This function does not drop a chapter.
export function testPrepEntries(items, seed = 1) {
  const live = items.filter((it) => it.kind !== 'flash');
  const proof = live.find((it) => it.kind === 'proof-blank');
  const stamp = Number(seed) || 1;
  const rest = interleave(live.filter((it) => it !== proof), stamp);
  const out = [];
  if (proof) {
    out.push({ source: proof, seed: stamp, view: 'worked' });
    out.push({ source: proof, seed: stamp, view: 'faded' });
  }
  return withSectionModels(out.concat(rest));
}

// Closed chapters stay out of the mixed deck. A chapter page still asks for its own items.
export function mixedItems(items, closed) {
  const skip = new Set(closed || []);
  return items.filter((it) => !skip.has(it.chapter));
}

// §4.2, §4.4, and §5.1 are not proofs. The first card is that item filled in.
const MODEL_SECTIONS = new Set(['4.2', '4.4', '5.1']);

function withSectionModels(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const sec = entry.source.section;
    if (entry.view === 'worked' && MODEL_SECTIONS.has(sec)) seen.add(sec);
    const firstBlank = entry.view === 'faded'
      && MODEL_SECTIONS.has(sec)
      && !seen.has(sec)
      && entry.source.kind !== 'proof-blank';
    if (firstBlank) {
      out.push({ source: entry.source, seed: entry.seed, view: 'worked' });
      seen.add(sec);
    }
    out.push(entry);
  }
  return out;
}

export function practiceEntries(items, { mode, seed }) {
  if (mode === 'walk') return sectionWalk(items, seed);
  return testPrepEntries(items, seed);
}

// Fisher-Yates with mulberry32. The same seed returns the same order.
export function orderedChoices(choices, seed) {
  const list = (choices || []).slice();
  const rand = mulberry32(seed || 1);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

// One seed per step, so two blanks on one card do not share a shuffle.
export function choiceSeed(seed, id, step) {
  let h = (Number(seed) >>> 0) || 1;
  const text = `${id}:${step}`;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return h || 1;
}
