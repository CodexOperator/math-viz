// The practice catalog. Chapters 1–7 with no file are empty. The browser
// fetches only PRACTICE_FILES, so it never imports node:fs and never 404s a
// chapter that is not on this branch. catalogIssues checks the shared schema,
// including a missing why and a repeated id. A generator must be generate(seed, params).

import { GENERATORS, generateItem, seedFirst } from './gen/index.js';

export const KINDS = Object.freeze([
  'proof-blank', 'proof-mc', 'next-step-blank', 'next-step-mc', 'blank', 'mc', 'flash',
]);

// Files that exist under data/practice/. Node checks this list against the
// directory. The browser requests these URLs and no others.
export const PRACTICE_FILES = Object.freeze([2, 4, 5]);

let cache = null;

function runningInNode() {
  return import.meta.url.startsWith('file:');
}

async function assertFileList() {
  if (!runningInNode()) return;
  const { readdir } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const dir = fileURLToPath(new URL('../../data/practice/', import.meta.url));
  const found = (await readdir(dir))
    .map((name) => /^ch(\d+)\.json$/.exec(name))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);
  const listed = [...PRACTICE_FILES].sort((a, b) => a - b);
  if (found.join() !== listed.join()) {
    throw new Error(`Practice files on disk are ${found.join(', ')}; the browser list is ${listed.join(', ')}`);
  }
}

async function readChapter(n) {
  const url = new URL(`../../data/practice/ch${n}.json`, import.meta.url);
  if (runningInNode()) {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const text = await readFile(fileURLToPath(url), 'utf8');
    const rows = JSON.parse(text);
    return Array.isArray(rows) ? rows : [];
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Practice chapter ${n} failed to load`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function loadCatalog() {
  if (cache) return cache;
  await assertFileList();
  const lists = await Promise.all(PRACTICE_FILES.map((n) => readChapter(n)));
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
