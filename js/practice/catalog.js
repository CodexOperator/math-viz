// The practice catalog. Each data/practice/ch<N>.json that exists for
// chapters 1–7 is loaded. A missing file is an empty chapter, not an error.
// catalogIssues checks the shared schema, including a missing why and a
// repeated id. A generator must be generate(seed, params).

import { GENERATORS, generateItem, seedFirst } from './gen/index.js';

export const KINDS = Object.freeze([
  'proof-blank', 'proof-mc', 'next-step-blank', 'next-step-mc', 'blank', 'mc', 'flash',
]);

const CHAPTERS = [1, 2, 3, 4, 5, 6, 7];
let cache = null;

async function readChapter(n) {
  const url = new URL(`../../data/practice/ch${n}.json`, import.meta.url);
  try {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const text = await readFile(fileURLToPath(url), 'utf8');
    const rows = JSON.parse(text);
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ERR_MODULE_NOT_FOUND')) return [];
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function loadCatalog() {
  if (cache) return cache;
  const lists = await Promise.all(CHAPTERS.map((n) => readChapter(n)));
  cache = Object.freeze(lists.flat());
  return cache;
}

export function assertGeneratorSignatures(generators = GENERATORS) {
  for (const [id, gen] of Object.entries(generators)) {
    if (!gen || !seedFirst(gen.generate)) {
      throw new Error(`Generator ${id} must be generate(seed, params)`);
    }
  }
}

export function catalogIssues(items = []) {
  assertGeneratorSignatures();
  const issues = [];
  const ids = new Set();
  for (const it of items) {
    if (!it || typeof it !== 'object') {
      issues.push('item is not an object');
      continue;
    }
    if (!it.id || ids.has(it.id)) issues.push(`id ${it.id || '(missing)'}`);
    if (it.id) ids.add(it.id);
    if (!KINDS.includes(it.kind)) issues.push(`${it.id} kind`);
    if (!it.cite || typeof it.cite.page !== 'number' || !it.cite.ref) issues.push(`${it.id} cite`);
    if (typeof it.memory !== 'string' || !it.memory) issues.push(`${it.id} memory`);
    if (it.generator) {
      if (!GENERATORS[it.generator.template]) issues.push(`${it.id} generator`);
    } else if (!Array.isArray(it.steps) || it.steps.length === 0) {
      issues.push(`${it.id} steps`);
    } else {
      it.steps.forEach((step, i) => {
        if (!step || typeof step.answer !== 'string' || !step.answer) issues.push(`${it.id} step ${i} answer`);
        if (typeof step.why !== 'string' || !step.why) issues.push(`${it.id} step ${i} why`);
        if (String(it.kind).endsWith('mc')) {
          if (!Array.isArray(step.choices) || step.choices.length < 3) issues.push(`${it.id} step ${i} choices`);
        }
      });
    }
  }
  return issues;
}

export function realize(item, seed = 1) {
  if (!item.generator) return item;
  const built = generateItem(item.generator.template, seed, item.generator.params);
  return {
    ...item,
    prompt: built.prompt,
    steps: built.steps,
    seed,
  };
}
