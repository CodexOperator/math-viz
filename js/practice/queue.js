// Two orders. A section walk is worked example, then the faded proof, then
// the other items. Test prep interleaves sections by a seeded round-robin.

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
export function sectionWalk(items) {
  const live = items.filter((it) => it.kind !== 'flash').sort(bySectionThenKind);
  const out = [];
  for (const item of live) {
    if (item.kind === 'proof-blank') out.push({ source: item, seed: 1, view: 'worked' });
    out.push({ source: item, seed: 1, view: 'faded' });
  }
  return out;
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
  return out.map((item) => ({ source: item, seed: 1, view: 'faded' }));
}

// The mixed set opens on one worked proof, then that proof with the blanks.
export function testPrepEntries(items, seed = 1) {
  const live = items.filter((it) => it.kind !== 'flash');
  const proof = live.find((it) => it.kind === 'proof-blank');
  const rest = interleave(live.filter((it) => it !== proof), seed);
  const out = [];
  if (proof) {
    out.push({ source: proof, seed: 1, view: 'worked' });
    out.push({ source: proof, seed: 1, view: 'faded' });
  }
  return out.concat(rest);
}

export function practiceEntries(items, { mode, seed }) {
  if (mode === 'walk') return sectionWalk(items);
  return testPrepEntries(items, seed);
}
