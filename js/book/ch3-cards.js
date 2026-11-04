// A local card for data/practice/ch3.json, until js/practice/ renders the same schema.
// One step at a time. Hint and answer stay closed until the learner answers.
// A generator fills the step from integer arithmetic. The seed is the only randomness.

import items from '../../data/practice/ch3.json' with { type: 'json' };
import { sectionHref } from '../data/book.js';
import { h, appendRich, sourceTag } from '../stations/test2-ui.js';
import { generate as generateCr } from '../practice/gen/cr-poly.js';
import { generate as generateHarmonic } from '../practice/gen/harmonic-conjugate.js';

const GENS = Object.freeze({
  'cr-poly': generateCr,
  'harmonic-conjugate': generateHarmonic,
});

const S31 = 'sec_diff-analytic.html';
const S32 = 'sec_cauchy-riemann.html';
const S33 = 'sec_harmonic-functions.html';

const HREF = Object.freeze({
  'Equation (3.1)': sectionHref(S31, 'Deriv_Def_1'),
  'Definition 3.1': sectionHref(S31, 'Analytic_Def'),
  'Definition 3.2': sectionHref(S31, 'Entire_Def'),
  'Singular points': sectionHref(S31, 'sec_diff-analytic-12'),
  'Equations (3.4)–(3.10)': sectionHref(S31, 'sec_diff-analytic-14'),
  'Theorem 3.1': sectionHref(S31, 'Diffl_Implies_Cont'),
  'Theorem 3.2': sectionHref(S31, 'LH_s_rule'),
  'Theorem 3.3': sectionHref(S32, 'CR_EQ_Thm'),
  'Theorem 3.4': sectionHref(S32, 'Sufficient_Conditions'),
  'Theorem 3.5': sectionHref(S32, 'Sufficient_Conditions_Polar'),
  'Theorem 3.6': sectionHref(S32, 'Abs_Const_implies_Const'),
  'Theorem 3.7': sectionHref(S32, 'Df_0_implies_f_const'),
  "Laplace's equation": sectionHref(S33, 'Laplace_s_Equation'),
  'Harmonic conjugate': sectionHref(S33, 'sec_harmonic-functions-5'),
  'Theorem 3.8': sectionHref(S33, 'Harmonic_Theorem'),
  'Theorem 3.9': sectionHref(S33, 'Conjugate_Construction'),
  '§3.1, Exercise 1(a)': sectionHref(S31, 'x3_1_1'),
  '§3.1, Exercise 2(a)': sectionHref(S31, 'x3_1_2'),
  '§3.2, Exercise 1(a)': sectionHref(S32, 'x3_2_1'),
  '§3.2, Exercise 1': sectionHref(S32, 'x3_2_1'),
  '§3.2, Exercise 7(b)': sectionHref(S32, 'x3_2_7'),
  '§3.3, Exercise 5(a)': sectionHref(S33, 'x3_3_5'),
  '§3.3, Exercise 5': sectionHref(S33, 'x3_3_5'),
});

export function practiceItems() {
  return items;
}

function citeOf(item) {
  const ref = item.cite && item.cite.ref;
  const page = item.cite && item.cite.page;
  return {
    pin: page ? `${ref}, page ${page}` : String(ref || ''),
    href: HREF[ref] || sectionHref(item.section === '3.3' ? S33 : item.section === '3.2' ? S32 : S31),
  };
}

function write(el, text) {
  el.replaceChildren();
  appendRich(el, String(text || '').replace(/\\\(/g, '$').replace(/\\\)/g, '$'));
}

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\\,/g, '')
    .replace(/[{}]/g, '')
    .replace(/[−–]/g, '-')
    .replace(/_/g, '')
    .replace(/\((x0|y0|x|y|z0|z)(,(x0|y0|x|y))*\)/g, '');
}

function accepted(step, given) {
  const want = [step.answer, ...(step.accept || [])].map(norm);
  return want.includes(norm(given));
}

function materialize(item, seed) {
  if (!item.generator) return item;
  const gen = GENS[item.generator.template];
  if (!gen) return item;
  const made = gen(item.generator.params || {}, seed);
  return {
    ...item,
    prompt: made.prompt || item.prompt,
    steps: made.steps,
    memory: made.memory || item.memory,
  };
}

export function mountPractice(host, sectionId) {
  const list = items.filter((item) => item.section === sectionId && item.kind !== 'flash');
  const cleanups = [];
  for (const item of list) host.append(card(item, cleanups));
  return function unmount() {
    for (const fn of cleanups) fn();
  };
}

function card(source, cleanups) {
  let seed = 1;
  let item = materialize(source, seed);
  let index = 0;
  const cite = citeOf(source);
  const prompt = h('p', { id: `${source.id}-prompt` });
  const step = h('p', { id: `${source.id}-step` });
  const why = h('p', { class: 'hint-note', id: `${source.id}-why`, hidden: '' });
  const field = h('input', { type: 'text', id: `${source.id}-answer`, autocomplete: 'off', 'aria-label': 'The missing step' });
  const choices = h('div', { class: 'ch3-choices', id: `${source.id}-choices` });
  const check = h('button', { type: 'button', class: 'btn', id: `${source.id}-check` }, 'Check');
  const next = h('button', { type: 'button', class: 'btn', id: `${source.id}-next`, hidden: '' }, 'Next step');
  const another = h('button', { type: 'button', class: 'btn', id: `${source.id}-another` }, 'Another');
  const count = h('p', { class: 'book-page', id: `${source.id}-count` });
  const memory = h('p', { class: 'book-page', id: `${source.id}-memory`, hidden: '' });

  function mc() {
    const current = item.steps[index];
    return !!(current && current.choices && current.choices.length);
  }

  function paint() {
    write(prompt, item.prompt);
    const current = item.steps[index];
    if (!current) {
      count.textContent = 'Done.';
      step.replaceChildren();
      field.hidden = true;
      choices.hidden = true;
      check.hidden = true;
      next.hidden = true;
      write(memory, item.memory || '');
      memory.hidden = !item.memory;
      return;
    }
    memory.hidden = true;
    count.textContent = `Step ${index + 1} of ${item.steps.length}.`;
    write(step, current.text);
    why.hidden = true;
    why.replaceChildren();
    next.hidden = true;
    const useMc = mc();
    field.hidden = useMc;
    field.value = '';
    choices.hidden = !useMc;
    choices.replaceChildren();
    check.hidden = useMc;
    if (useMc) {
      current.choices.forEach((choice, n) => {
        const b = h('button', { type: 'button', class: 'btn', id: `${source.id}-choice-${n}` });
        write(b, choice);
        b.addEventListener('click', () => judge(choice));
        choices.append(b);
      });
    }
  }

  function judge(given) {
    const current = item.steps[index];
    if (!current) return;
    const right = accepted(current, given);
    write(why, current.why || (right ? 'Yes.' : `The step is ${current.answer}.`));
    why.hidden = false;
    const node = hostOf();
    if (node) node.dataset.right = right ? 'true' : 'false';
    if (right) {
      check.hidden = true;
      if (mc()) {
        for (const b of choices.querySelectorAll('button')) b.disabled = true;
      }
      next.hidden = false;
      next.textContent = index + 1 >= item.steps.length ? 'Done' : 'Next step';
    }
  }

  function hostOf() {
    return document.getElementById(source.id);
  }

  check.addEventListener('click', () => judge(field.value));
  field.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      judge(field.value);
    }
  });
  next.addEventListener('click', () => {
    if (index + 1 >= item.steps.length) {
      index = item.steps.length;
    } else {
      index += 1;
    }
    paint();
  });
  if (source.generator) {
    another.addEventListener('click', () => {
      seed += 1;
      item = materialize(source, seed);
      index = 0;
      const node = hostOf();
      if (node) delete node.dataset.right;
      paint();
    });
  }

  const kids = [
    h('h3', { id: `${source.id}-title` }, cite.pin),
    sourceTag(cite),
    prompt,
    count,
    step,
    field,
    choices,
    h('div', { class: 'problem-actions' }, check, next, source.generator ? another : null),
    why,
    memory,
  ];
  const node = h('article', {
    class: 'card chapter-card ch3-card',
    id: source.id,
    'data-kind': source.kind,
    'data-section': source.section,
  }, ...kids);
  cleanups.push(() => {});
  paint();
  return node;
}

export function mountDeck(host, sectionId) {
  const list = items.filter((item) => item.section === sectionId && item.kind === 'flash');
  if (!list.length) return function unmount() {};
  let index = 0;
  let open = false;
  const count = h('p', { class: 'book-page', id: `chapter-deck-${sectionId}-count` });
  const front = h('p', { id: `chapter-deck-${sectionId}-front` });
  const back = h('p', { class: 'hint-note', id: `chapter-deck-${sectionId}-back`, hidden: '' });
  const show = h('button', { type: 'button', class: 'btn', id: `chapter-deck-${sectionId}-show` }, 'Show');
  const next = h('button', { type: 'button', class: 'btn', id: `chapter-deck-${sectionId}-next` }, 'Next card');
  const cite = h('p', { class: 'book-page', id: `chapter-deck-${sectionId}-cite` });

  function paint() {
    const item = list[index];
    count.textContent = `Card ${index + 1} of ${list.length}.`;
    write(front, item.prompt);
    write(back, item.steps[0] ? item.steps[0].answer : '');
    back.hidden = !open;
    show.hidden = open;
    const pin = citeOf(item);
    cite.replaceChildren(sourceTag(pin));
  }

  show.addEventListener('click', () => {
    open = true;
    paint();
  });
  next.addEventListener('click', () => {
    index = (index + 1) % list.length;
    open = false;
    paint();
  });
  host.append(h('article', {
    class: 'card chapter-card ch3-card',
    id: `chapter-deck-${sectionId}`,
  },
    h('h3', { id: `chapter-deck-${sectionId}-title` }, 'Cards'),
    count,
    front,
    back,
    cite,
    h('div', { class: 'problem-actions' }, show, next)));
  paint();
  return function unmount() {};
}

export function memoryLines(sectionId) {
  return items
    .filter((item) => item.section === sectionId && item.kind === 'flash' && item.memory)
    .map((item) => item.memory);
}
