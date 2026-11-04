// js/core/progress.js
// Mastery for the Book roadmap. A node is one lesson. Ink is every blank of that lesson
// correct once. A node stays locked until every node it requires is inked.
//
// Chapter pages read nodesForChapter and nodeState. They do not invent a second store.
// The key is lesson-progress, under the site prefix the store adds (mv:lesson-progress).
// Station hashes stay open. This module does not hide #julia. The lock is the next lesson door.
//
// Pure. Pass a store from js/core/store.js. With no store, loadProgress is not used.

export const LESSON_KEY = 'lesson-progress';
export const RULE_KEY = 'lesson-rule';

export const ROADMAP = Object.freeze([
  Object.freeze({
    id: '4.1.fate',
    chapter: 4,
    section: '4.1',
    title: 'A sequence has a fate',
    short: '§4.1',
    station: 'sequence',
    built: false,
    requires: Object.freeze([]),
    steps: Object.freeze(['modulus', 'inside', 'circle', 'outside']),
    scope: 'core',
  }),
  Object.freeze({
    id: '4.2.disk',
    chapter: 4,
    section: '4.2',
    title: 'The closed disk',
    short: 'Disk',
    href: 'lessons/disk.html',
    station: 'disk',
    built: true,
    requires: Object.freeze([]),
    steps: Object.freeze(['image', 'compare', 'settles', 'leaves', 'stays', 'closed']),
    scope: 'core',
  }),
  Object.freeze({
    id: '4.2.slide',
    chapter: 4,
    section: '4.2',
    title: 'Square, then slide',
    short: 'Slide',
    station: 'julia',
    built: false,
    requires: Object.freeze(['4.2.disk']),
    steps: Object.freeze(['off-zero']),
    scope: 'core',
  }),
  Object.freeze({
    id: '4.2.which',
    chapter: 4,
    section: '4.2',
    title: 'Which c',
    short: 'Which c',
    station: 'mandelbrot',
    built: false,
    requires: Object.freeze(['4.2.slide']),
    steps: Object.freeze(['orbit-of-zero']),
    scope: 'core',
  }),
  Object.freeze({
    id: '4.2.newton',
    chapter: 4,
    section: '4.2',
    title: 'One Newton step',
    short: 'Newton',
    station: 'newton-step',
    built: false,
    requires: Object.freeze([]),
    steps: Object.freeze(['step']),
    scope: 'core',
  }),
  Object.freeze({
    id: '4.3.geometric',
    chapter: 4,
    section: '4.3',
    title: 'The same disk, as a sum',
    short: 'Sum',
    station: 'geometric',
    built: false,
    requires: Object.freeze(['4.2.disk']),
    steps: Object.freeze(['sum']),
    scope: 'likely',
  }),
  Object.freeze({
    id: '5.4.current',
    chapter: 5,
    section: '5.4',
    title: 'The current is the imaginary part',
    short: 'Current',
    station: 'phasor-current',
    built: false,
    requires: Object.freeze([]),
    steps: Object.freeze(['imag']),
    scope: 'core',
  }),
]);

export const DISK_STRIP = Object.freeze(['4.1.fate', '4.2.disk', '4.2.slide', '4.2.which']);

export function nodeById(id) {
  return ROADMAP.find((n) => n.id === id) || null;
}

export function nodesForChapter(chapter, { includeLikely = true } = {}) {
  return ROADMAP.filter((n) => n.chapter === chapter && (includeLikely || n.scope !== 'likely'));
}

export function emptyProgress() {
  return normalizeProgress(null);
}

export function normalizeProgress(raw) {
  const src = raw && typeof raw === 'object' && raw.nodes && typeof raw.nodes === 'object' ? raw.nodes : {};
  const nodes = {};
  for (const node of ROADMAP) {
    const row = src[node.id];
    const steps = {};
    const got = row && row.steps && typeof row.steps === 'object' ? row.steps : {};
    for (const id of node.steps) steps[id] = got[id] === true;
    nodes[node.id] = { steps };
  }
  return { nodes };
}

export function isInked(progress, nodeId) {
  const node = nodeById(nodeId);
  if (!node) return false;
  const steps = progress && progress.nodes && progress.nodes[nodeId] ? progress.nodes[nodeId].steps : null;
  if (!steps) return false;
  return node.steps.every((id) => steps[id] === true);
}

export function inkFraction(progress, nodeId) {
  const node = nodeById(nodeId);
  if (!node || node.steps.length === 0) return 0;
  const steps = progress && progress.nodes && progress.nodes[nodeId] ? progress.nodes[nodeId].steps : {};
  let n = 0;
  for (const id of node.steps) if (steps[id] === true) n += 1;
  return n / node.steps.length;
}

/** 'locked' | 'open' | 'inked'. Unknown ids are locked. */
export function nodeState(progress, nodeId) {
  const node = nodeById(nodeId);
  if (!node) return 'locked';
  const base = progress && progress.nodes ? progress : emptyProgress();
  for (const id of node.requires) {
    if (!isInked(base, id)) return 'locked';
  }
  return isInked(base, nodeId) ? 'inked' : 'open';
}

export function markStep(progress, nodeId, stepId) {
  const base = normalizeProgress(progress);
  const node = nodeById(nodeId);
  if (!node || !node.steps.includes(stepId)) return base;
  const steps = { ...base.nodes[nodeId].steps, [stepId]: true };
  return { nodes: { ...base.nodes, [nodeId]: { steps } } };
}

/** Site-root path of the door, or null when the node has nowhere to send a student. */
export function doorHref(node) {
  if (!node) return null;
  if (node.href) return node.href;
  if (node.station) return `index.html#${node.station}`;
  return null;
}

export function loadProgress(store) {
  if (!store) return emptyProgress();
  return normalizeProgress(store.get(LESSON_KEY, null));
}

export function saveProgress(store, progress) {
  if (!store) return false;
  return store.set(LESSON_KEY, normalizeProgress(progress));
}

export function loadRule(store) {
  if (!store) return '';
  const v = store.get(RULE_KEY, '');
  return typeof v === 'string' ? v : '';
}

export function saveRule(store, src) {
  if (!store) return false;
  const text = typeof src === 'string' ? src : '';
  return store.set(RULE_KEY, text);
}
