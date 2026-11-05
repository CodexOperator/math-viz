// A local card for data/practice/ch1.json, until js/practice/ renders these items.
// One flashcard at a time. A blank or a choice stays closed until the student answers.

import ITEMS from '../../data/practice/ch1.json' with { type: 'json' };
import { generate, matches, normMath } from '../practice/gen/ch1-arithmetic.js';
import { citeHref, diskPlace } from '../data/chapter1.js';
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

export function mountPractice(parent, items, onItem) {
  for (const item of items) parent.append(practiceCard(item, onItem));
}

function missFor(step, raw) {
  const got = normMath(raw);
  const slips = Array.isArray(step.slips) ? step.slips : [];
  for (const slip of slips) {
    const list = slip.match || [];
    if (list.some((item) => normMath(item) === got)) return slip.miss;
  }
  if (/^-?\d+(\.\d+)?$/.test(got)) {
    const n = Number(got);
    for (const slip of slips) {
      if (typeof slip.near === 'number' && Math.abs(n - slip.near) < 1e-9) return slip.miss;
    }
  }
  if (step.miss) return step.miss;
  return 'That is a different move.';
}

function diskNow() {
  const host = document.getElementById('ch1-disk-host');
  return host && host._point ? host._point : null;
}

function diskWhy(place) {
  if (place === 'inside') return 'Inside means $|z|<1$. Example 1.25, page 38.';
  if (place === 'boundary') return 'The open disk does not include $|z|=1$. Example 1.25, page 38.';
  return 'Outside means $|z|>1$. Example 1.25, page 38.';
}

function diskMiss(picked, place) {
  if (!place) return 'Drag the green point on the picture, then choose again.';
  if (picked === 'inside' && place === 'outside') return 'The length from $0$ is greater than $1$.';
  if (picked === 'inside' && place === 'boundary') return 'The open disk does not include the circle.';
  if (picked === 'outside' && place === 'inside') return 'The length from $0$ is less than $1$.';
  if (picked === 'outside' && place === 'boundary') return 'The green point is on the orange circle.';
  if (picked === 'boundary' && place === 'outside') return 'The green point is not on the orange circle.';
  if (picked === 'boundary' && place === 'inside') return 'The boundary is the circle. This point is off that circle.';
  return 'Look at the green point against the orange circle.';
}

function practiceCard(item, onItem) {
  let seed = seedOf(item.id);
  const slug = domId(item.id);
  const card = h('article', { class: 'ch1-item', id: `ch1-card-${slug}` });
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
      stepsHost.append(stepRow(item, step, index, () => {
        memory.hidden = false;
        if (typeof onItem === 'function') onItem(item.id);
      }));
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
  const reveal = (right, line) => {
    row.dataset.right = right ? 'true' : 'false';
    note.hidden = false;
    note.replaceChildren();
    const text = right ? (line || step.why || '') : (line || missFor(step, ''));
    appendRich(note, text);
    if (!right) return;
    const next = row.nextElementSibling;
    if (next) next.hidden = false;
    else onRight();
  };
  if (step.live === 'disk' && step.choices && step.choices.length) {
    const ask = h('p', { class: 'ch1-ask' });
    withBlank(ask, step.text, null);
    const choices = h('div', { class: 'ch1-choices', id: `ch1-choices-${slug}-${index}` });
    const places = step.places || [];
    step.choices.forEach((choice, n) => {
      const b = h('button', { type: 'button', class: 'btn', id: `ch1-choice-${slug}-${index}-${n}` });
      appendRich(b, choice);
      b.addEventListener('click', () => {
        if (row.dataset.right === 'true') return;
        const z = diskNow();
        const place = z ? diskPlace(z) : null;
        const picked = places[n];
        const right = place != null && picked === place;
        b.dataset.right = right ? 'true' : 'false';
        reveal(right, right ? diskWhy(place) : diskMiss(picked, place));
      });
      choices.append(b);
    });
    row.append(ask, choices, note);
  } else if (step.choices && step.choices.length) {
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
        reveal(right, right ? step.why : missFor(step, choice));
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
      reveal(right, right ? step.why : missFor(step, input.value));
      if (right) input.disabled = true;
    };
    check.addEventListener('click', go);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    row.append(ask, h('div', { class: 'problem-actions' }, check), note);
  }
  return row;
}

const FLASH_KEY = 'ch1.flash';
const FLASH_DAY = 24 * 60 * 60 * 1000;

function knownMap(store) {
  if (!store) return {};
  let raw = {};
  try { raw = store.get(FLASH_KEY, {}) || {}; } catch { raw = {}; }
  const now = Date.now();
  const out = {};
  for (const id of Object.keys(raw)) {
    if (typeof raw[id] === 'number' && now - raw[id] < FLASH_DAY) out[id] = raw[id];
  }
  return out;
}

export function mountDeck(parent, items, store) {
  if (!items.length) return () => {};
  let i = 0;
  const sectionSlug = domId(items[0].section);
  const count = h('p', { class: 'ch1-note', id: `ch1-deck-count-${sectionSlug}` });
  const face = h('div', { id: `ch1-deck-${sectionSlug}` });
  const got = h('button', { type: 'button', class: 'btn', id: `ch1-got-${sectionSlug}` }, 'Got it');
  const missed = h('button', { type: 'button', class: 'btn', id: `ch1-missed-${sectionSlug}` }, 'Missed');
  const actions = h('div', { class: 'problem-actions', id: `ch1-deck-actions-${sectionSlug}` }, got, missed);

  function pile() {
    const known = knownMap(store);
    return items.filter((item) => !known[item.id]);
  }

  function paint() {
    const left = pile();
    if (!left.length) {
      count.textContent = 'You know these until tomorrow.';
      face.replaceChildren();
      actions.hidden = true;
      return;
    }
    actions.hidden = false;
    if (i >= left.length) i = 0;
    const item = left[i];
    count.textContent = `Card ${i + 1} of ${left.length}.`;
    face.replaceChildren(flashCard(item));
  }

  function mark(keep) {
    const left = pile();
    const item = left[i] || left[0];
    if (keep && item && store) {
      const next = knownMap(store);
      next[item.id] = Date.now();
      try { store.set(FLASH_KEY, next); } catch { /* this visit still hides it */ }
    } else if (left.length > 1) {
      i = (i + 1) % left.length;
    }
    paint();
  }

  got.addEventListener('click', () => mark(true));
  missed.addEventListener('click', () => mark(false));
  parent.append(count, face, actions);
  paint();
  return () => {};
}

function flashCard(item) {
  const slug = domId(item.id);
  const card = h('article', { class: 'ch1-item', id: `ch1-flash-${slug}` });
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
