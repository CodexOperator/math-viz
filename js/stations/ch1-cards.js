// A local card for data/practice/ch1.json, until js/practice/ renders these items.
// One flashcard at a time. A blank or a choice stays closed until the student answers.

import ITEMS from '../../data/practice/ch1.json' with { type: 'json' };
import { generate, matches } from '../practice/gen/ch1-arithmetic.js';
import { citeHref } from '../data/chapter1.js';
import { h, appendRich, sourceTag } from './test2-ui.js';

export function itemsFor(section, kind) {
  return ITEMS.filter((item) => item.section === section && (kind ? item.kind === kind : true));
}

export function practiceItems(section) {
  return ITEMS.filter((item) => item.section === section && item.kind !== 'flash');
}

export function flashItems(section) {
  return itemsFor(section, 'flash');
}

function domId(id) {
  return String(id).replace(/\./g, '-');
}

function seedOf(id) {
  let n = 2166136261;
  for (const c of String(id)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0 || 1;
}

function material(item, seed) {
  if (!item.generator) return { prompt: item.prompt, steps: item.steps };
  const g = generate(seed, item.generator.params);
  return { prompt: g.prompt, steps: g.steps };
}

function withBlank(parent, text, control) {
  const bits = String(text || '').split('___');
  if (bits.length === 1) {
    if (text) appendRich(parent, text);
    if (control) parent.append(control);
    return;
  }
  bits.forEach((bit, i) => {
    if (bit) appendRich(parent, bit);
    if (i < bits.length - 1 && control) parent.append(control);
  });
}

export function mountPractice(parent, items) {
  for (const item of items) parent.append(practiceCard(item));
}

function practiceCard(item) {
  let seed = seedOf(item.id);
  const slug = domId(item.id);
  const card = h('article', { class: 'card chapter-card ch1-card', id: `ch1-card-${slug}` });
  const prompt = h('div', { id: `ch1-prompt-${slug}` });
  const stepsHost = h('ol', { class: 'ch1-steps', id: `ch1-steps-${slug}` });
  const memory = h('p', { class: 'ch1-note', id: `ch1-memory-${slug}` });
  appendRich(memory, item.memory || '');
  memory.hidden = true;
  card.append(
    h('h3', { id: `ch1-title-${slug}` }, item.cite.ref),
    sourceTag({ pin: `${item.cite.ref}, page ${item.cite.page}`, href: citeHref(item.cite.ref) }),
    prompt,
    stepsHost,
    memory,
  );
  if (item.generator) {
    const again = h('button', { type: 'button', class: 'btn', id: `ch1-again-${slug}` }, 'Another');
    again.addEventListener('click', () => { seed += 1; paint(); });
    card.append(again);
  }
  function paint() {
    const view = material(item, seed);
    prompt.replaceChildren();
    appendRich(prompt, view.prompt);
    stepsHost.replaceChildren();
    memory.hidden = true;
    view.steps.forEach((step, index) => {
      stepsHost.append(stepRow(item, step, index, () => { memory.hidden = false; }));
    });
    openFirst(stepsHost);
  }
  paint();
  return card;
}

function openFirst(list) {
  const rows = [...list.children];
  rows.forEach((row, i) => { row.hidden = i !== 0; });
}

function stepRow(item, step, index, onRight) {
  const slug = domId(item.id);
  const row = h('li', { class: 'ch1-step', id: `ch1-step-${slug}-${index}`, 'data-right': 'false' });
  const note = h('p', { class: 'ch1-note', id: `ch1-why-${slug}-${index}` });
  note.hidden = true;
  const reveal = (right) => {
    row.dataset.right = right ? 'true' : 'false';
    note.hidden = false;
    note.replaceChildren();
    appendRich(note, right ? step.why : 'Not that one.');
    if (!right) return;
    const next = row.nextElementSibling;
    if (next) next.hidden = false;
    else onRight();
  };
  if (step.choices && step.choices.length) {
    const ask = h('p', { class: 'ch1-ask' });
    withBlank(ask, step.text, null);
    const choices = h('div', { class: 'ch1-choices', id: `ch1-choices-${slug}-${index}` });
    step.choices.forEach((choice, n) => {
      const b = h('button', { type: 'button', class: 'btn', id: `ch1-choice-${slug}-${index}-${n}` });
      appendRich(b, choice);
      b.addEventListener('click', () => {
        if (row.dataset.right === 'true') return;
        const right = matches(choice, step);
        b.dataset.right = right ? 'true' : 'false';
        reveal(right);
      });
      choices.append(b);
    });
    row.append(ask, choices, note);
  } else {
    const input = h('input', {
      type: 'text',
      class: 'ch1-blank',
      id: `ch1-blank-${slug}-${index}`,
      autocomplete: 'off',
      'aria-label': 'Your answer',
    });
    const check = h('button', { type: 'button', class: 'btn', id: `ch1-check-${slug}-${index}` }, 'Check');
    const ask = h('div', { class: 'ch1-ask' });
    withBlank(ask, step.text, input);
    const go = () => {
      if (row.dataset.right === 'true') return;
      const right = matches(input.value, step);
      reveal(right);
      if (right) input.disabled = true;
    };
    check.addEventListener('click', go);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    row.append(ask, h('div', { class: 'problem-actions' }, check), note);
  }
  return row;
}

export function mountDeck(parent, items) {
  if (!items.length) return () => {};
  let i = 0;
  const sectionSlug = domId(items[0].section);
  const count = h('p', { class: 'ch1-note', id: `ch1-deck-count-${sectionSlug}` });
  const face = h('div', { id: `ch1-deck-${sectionSlug}` });
  const next = h('button', { type: 'button', class: 'btn', id: `ch1-deck-next-${sectionSlug}` }, 'Next card');
  function paint() {
    const item = items[i];
    count.textContent = `Card ${i + 1} of ${items.length}.`;
    face.replaceChildren(flashCard(item));
    next.hidden = items.length < 2;
  }
  next.addEventListener('click', () => { i = (i + 1) % items.length; paint(); });
  parent.append(count, face, next);
  paint();
  return () => {};
}

function flashCard(item) {
  const slug = domId(item.id);
  const card = h('article', { class: 'card chapter-card ch1-card', id: `ch1-flash-${slug}` });
  const front = h('p', { id: `ch1-front-${slug}` });
  appendRich(front, item.prompt);
  const back = h('div', { id: `ch1-back-${slug}`, hidden: '' });
  const answer = h('p');
  appendRich(answer, item.steps[0].answer);
  const memory = h('p', { class: 'ch1-note' });
  appendRich(memory, item.memory || '');
  back.append(answer, memory);
  const show = h('button', { type: 'button', class: 'btn', id: `ch1-show-${slug}`, 'aria-expanded': 'false' }, 'Show the back');
  show.addEventListener('click', () => {
    back.hidden = false;
    show.hidden = true;
    show.setAttribute('aria-expanded', 'true');
  });
  card.append(
    h('h3', null, item.cite.ref),
    sourceTag({ pin: `${item.cite.ref}, page ${item.cite.page}`, href: citeHref(item.cite.ref) }),
    front,
    show,
    back,
  );
  return card;
}
