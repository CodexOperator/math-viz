// The practice catalog. Chapter files are the shared schema in the brief.

import ch4 from '../../data/practice/ch4.json' with { type: 'json' };
import ch5 from '../../data/practice/ch5.json' with { type: 'json' };
import { GENERATORS, generateItem } from './gen/index.js';

export const KINDS = Object.freeze([
  'proof-blank', 'proof-mc', 'next-step-blank', 'next-step-mc', 'blank', 'mc', 'flash',
]);

export const PRACTICE = Object.freeze([...ch4, ...ch5]);

export function catalogIssues(items = PRACTICE) {
  const issues = [];
  const ids = new Set();
  for (const it of items) {
    if (!it || typeof it !== 'object') {
      issues.push('item is not an object');
      continue;
    }
    if (!it.id || ids.has(it.id)) issues.push(`id ${it.id || '(missing)'}`);
    ids.add(it.id);
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
