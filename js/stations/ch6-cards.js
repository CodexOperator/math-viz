// A local practice card for data/practice/ch6.json. The shared engine in
// js/practice/ will replace this mount. The schema stays the one in the brief.

import { h, appendRich, sourceTag } from './test2-ui.js';
import { sectionHref } from '../data/book.js';
import { generate as generateCircle } from '../practice/gen/ch6-circle.js';
import { generate as generateSegment } from '../practice/gen/ch6-segment.js';
import { generate as generateCif } from '../practice/gen/ch6-cif.js';
import { sameComplex } from '../book/ch6-math.js';

const GENS = {
  'ch6-circle': generateCircle,
  'ch6-segment': generateSegment,
  'ch6-cif': generateCif,
};

const HREF = {
  'Definition 6.1': sectionHref('sec_complex-integrals.html', 'Integral_Def_1'),
  'Example 6.1': sectionHref('sec_complex-integrals.html', 'sec_complex-integrals-5'),
  'Theorem 6.1': sectionHref('sec_contour-integrals.html', 'thm_contour-integral'),
  'Theorem 6.3': sectionHref('sec_contour-integrals.html', 'ML_Inequality_Thm'),
  'Example 6.7': sectionHref('sec_contour-integrals.html', 'Cont_Int_Ex_1'),
  '§6.2, Exercise 3': sectionHref('sec_contour-integrals.html', 'x6_2_3'),
  'Theorem 6.5': sectionHref('sec_cauchy-goursat.html', 'CG_Thm'),
  'Theorem 6.6': sectionHref('sec_cauchy-goursat.html', 'Deformation_of_Contour'),
  'Corollary 6.1': sectionHref('sec_cauchy-goursat.html', 'x2Pi_or_zero'),
  'Example 6.14': sectionHref('sec_cauchy-goursat.html', 'sec_cauchy-goursat-29'),
  'Example 6.15': sectionHref('sec_cauchy-goursat.html', 'sec_cauchy-goursat-30'),
  'Example 6.16': sectionHref('sec_cauchy-goursat.html', 'Prob_Ex'),
  'Theorem 6.9': sectionHref('sec_integration-theorems.html', 'DInt_Thm'),
  'Theorem 6.10': sectionHref('sec_cauchy-integral-formulas.html', 'Cauchy_Int_Formula'),
  'Theorem 6.12': sectionHref('sec_cauchy-integral-formulas.html', 'Cauchy_Int_Formulas'),
  'Example 6.21': sectionHref('sec_cauchy-integral-formulas.html', 'sec_cauchy-integral-formulas-5'),
  'Example 6.25': sectionHref('sec_cauchy-integral-formulas.html', 'sec_cauchy-integral-formulas-15'),
  'Example 6.11': sectionHref('sec_contour-integrals.html', 'ML_Example'),
  'Example 6.17': sectionHref('sec_integration-theorems.html', 'sec_integration-theorems-10'),
  'Example 6.18': sectionHref('sec_integration-theorems.html', 'sec_integration-theorems-11'),
  'Example 6.19': sectionHref('sec_integration-theorems.html', 'Int_dz_z'),
  'Theorem 6.13': sectionHref('sec_morera-liouville.html', 'Morera_s_Thm'),
  'Theorem 6.17': sectionHref('sec_morera-liouville.html', 'Cauchy_Ineqs'),
  'Theorem 6.18': sectionHref('sec_morera-liouville.html', 'Liouville_s_Thm'),
  'Theorem 6.19': sectionHref('sec_morera-liouville.html', 'FTOA'),
  '§6.2, Exercise 5': sectionHref('sec_contour-integrals.html', 'x6_2_5'),
  '§6.2, Exercise 9': sectionHref('sec_contour-integrals.html', 'x6_2_9'),
  '§6.3, Exercise 1': sectionHref('sec_cauchy-goursat.html', 'x6_3_1'),
  '§6.3, Exercise 2': sectionHref('sec_cauchy-goursat.html', 'x6_3_2'),
  '§6.3, Exercise 3': sectionHref('sec_cauchy-goursat.html', 'x6_3_3'),
  '§6.3, Exercise 4': sectionHref('sec_cauchy-goursat.html', 'exercises_cauchy-goursat-5'),
};

function dollars(src) {
  return String(src || '').replace(/\\\(/g, '$').replace(/\\\)/g, '$');
}

function canon(src) {
  let s = dollars(src).toLowerCase().replace(/\$/g, '');
  s = s.replace(/\\,/g, '').replace(/\\ /g, '');
  s = s.replace(/\\exp/g, 'exp');
  let prev;
  do {
    prev = s;
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  } while (s !== prev);
  s = s.replace(/e\s*\^\s*\{([^{}]*)\}/g, 'exp($1)');
  s = s.replace(/e\s*\^\s*([a-z0-9]+)/g, 'exp($1)');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\/g, '');
  s = s.replace(/[*_()]/g, '');
  s = s.replace(/\s+/g, '');
  s = s.replace(/π/g, 'pi');
  if (s === '0+0i') s = '0';
  return s;
}

export function matches(step, typed) {
  const got = canon(typed);
  if (!got) return false;
  const ok = [step.answer, ...(step.accept || [])];
  if (ok.some((item) => item && canon(item) === got)) return true;
  return ok.some((item) => item && sameComplex(item, typed));
}

function citeOf(item) {
  const pin = `${item.cite.ref}, page ${item.cite.page}`;
  return { pin, href: HREF[item.cite.ref] || sectionHref('sec_complex-integrals.html') };
}

function fillMath(el, src) {
  el.replaceChildren();
  appendRich(el, dollars(src));
}

export function mountPractice(host, items) {
  const stops = [];
  host.replaceChildren();
  if (!items.length) return () => {};
  // 6.6 is one sequence: Liouville, then e^z, then Morera, then the algebra proof.
  // Other sections still open on their flash deck.
  if (items[0] && items[0].section === '6.6') {
    let i = 0;
    while (i < items.length) {
      if (items[i].kind === 'flash') {
        const run = [];
        while (i < items.length && items[i].kind === 'flash') {
          run.push(items[i]);
          i += 1;
        }
        host.append(flashDeck(run, `${host.id || 'ch6'}-${run[0].id}`));
      } else {
        host.append(workCard(items[i], stops));
        i += 1;
      }
    }
    return () => { for (const stop of stops) stop(); };
  }
  const flashes = items.filter((item) => item.kind === 'flash');
  const rest = items.filter((item) => item.kind !== 'flash');
  if (flashes.length) host.append(flashDeck(flashes, host.id || 'ch6'));
  for (const item of rest) host.append(workCard(item, stops));
  return () => { for (const stop of stops) stop(); };
}

function flashDeck(items, scope) {
  let index = 0;
  let open = false;
  const front = h('p', { class: 'ch6-flash-front', id: `${scope}-flash-front` });
  const back = h('p', { class: 'ch6-flash-back', id: `${scope}-flash-back`, hidden: '' });
  const why = h('p', { class: 'hint-note', id: `${scope}-flash-why`, hidden: '' });
  const show = h('button', { type: 'button', class: 'btn', id: `${scope}-flash-show` }, 'Show the back');
  const missed = h('button', { type: 'button', class: 'btn', id: `${scope}-flash-miss` }, 'Missed');
  const recalled = h('button', { type: 'button', class: 'btn', id: `${scope}-flash-next` }, 'Recalled');
  const tag = h('div', { id: `${scope}-flash-cite` });
  const card = h('article', { class: 'card chapter-card', id: `${scope}-flash` });
  function paint() {
    const item = items[index];
    tag.replaceChildren(sourceTag(citeOf(item)));
    fillMath(front, item.prompt);
    fillMath(back, item.steps[0].answer);
    fillMath(why, item.steps[0].why || '');
    back.hidden = !open;
    why.hidden = !open;
    show.hidden = open;
    missed.hidden = !open;
    recalled.hidden = !open;
    show.setAttribute('aria-expanded', open ? 'true' : 'false');
    card.dataset.recalled = 'false';
  }
  show.addEventListener('click', () => { open = true; paint(); });
  missed.addEventListener('click', () => {
    // A miss stays at the front. The back closes until it is recalled.
    if (index !== 0) {
      const [item] = items.splice(index, 1);
      items.unshift(item);
      index = 0;
    }
    open = false;
    paint();
  });
  recalled.addEventListener('click', () => {
    const [item] = items.splice(index, 1);
    items.push(item);
    index = 0;
    open = false;
    paint();
    if (items.length === 1) card.dataset.recalled = 'true';
  });
  paint();
  card.append(
    h('h3', { id: `${scope}-flash-title` }, 'Flashcard'),
    tag, front, show, back, why,
    h('div', { class: 'problem-actions' }, missed, recalled));
  return card;
}

function prepared(item, seed) {
  if (!item.generator) return { prompt: item.prompt, steps: item.steps, seed };
  const gen = GENS[item.generator.template];
  if (!gen) return { prompt: item.prompt, steps: item.steps, seed };
  const made = gen(seed, item.generator.params || {});
  return {
    prompt: made.prompt || item.prompt,
    steps: made.steps || item.steps,
    memory: made.memory || item.memory,
    cite: made.cite || null,
    seed,
  };
}

function workCard(item, stops) {
  let seed = 1;
  const body = h('div', { id: `ch6-card-${item.id}-prompt` });
  const steps = h('div', { class: 'ch6-steps', id: `ch6-card-${item.id}-steps` });
  const tag = h('div', { id: `ch6-card-${item.id}-cite` });
  const again = h('button', { type: 'button', class: 'btn', id: `ch6-card-${item.id}-again` }, 'Another');
  again.hidden = !item.generator;
  function paint() {
    const view = prepared(item, seed);
    const cite = view.cite
      ? { pin: `${view.cite.ref}, page ${view.cite.page}`, href: HREF[view.cite.ref] || citeOf(item).href }
      : citeOf(item);
    tag.replaceChildren(sourceTag(cite));
    fillMath(body, view.prompt);
    steps.replaceChildren();
    view.steps.forEach((step, i) => steps.append(stepView(item, step, i)));
  }
  again.addEventListener('click', () => { seed += 1; paint(); });
  stops.push(() => again.removeEventListener('click', () => {}));
  paint();
  return h('article', { class: 'card chapter-card', id: `ch6-card-${item.id}`, 'data-kind': item.kind },
    h('h3', null, item.cite.ref),
    tag,
    body,
    steps,
    h('div', { class: 'problem-actions' }, again));
}

function stepView(item, step, index) {
  const id = `${item.id}-${index}`;
  const line = h('p', { class: 'ch6-step', id: `ch6-step-${id}`, 'data-right': 'false' });
  const why = h('p', { class: 'hint-note', id: `ch6-why-${id}`, hidden: '' });
  function showNote(right) {
    why.hidden = false;
    fillMath(why, right ? (step.why || '') : (step.miss || 'The value stays covered.'));
  }
  const bits = String(step.text || '').split('___');
  if (step.choices && step.choices.length) {
    bits.forEach((bit, i) => {
      if (bit) appendRich(line, dollars(bit));
      if (i < bits.length - 1) line.append(document.createTextNode(' '));
    });
    if (!step.text) fillMath(line, 'Choose one.');
    const choices = h('div', { class: 'ch6-choices', id: `ch6-choices-${id}` });
    for (const choice of step.choices) {
      const btn = h('button', { type: 'button', class: 'btn ch6-choice', 'data-choice': canon(choice) }, '');
      fillMath(btn, choice);
      btn.addEventListener('click', () => {
        const right = matches(step, choice);
        line.dataset.right = right ? 'true' : 'false';
        showNote(right);
        if (right) {
          for (const kid of choices.querySelectorAll('button')) kid.disabled = true;
        }
      });
      choices.append(btn);
    }
    return h('div', null, line, choices, why);
  }
  const input = h('input', {
    type: 'text',
    class: 'ch6-blank',
    id: `ch6-blank-${id}`,
    'aria-label': 'Your answer',
    autocomplete: 'off',
  });
  const check = h('button', { type: 'button', class: 'btn', id: `ch6-check-${id}` }, 'Check');
  function grade() {
    const right = matches(step, input.value);
    line.dataset.right = right ? 'true' : 'false';
    showNote(right);
  }
  check.addEventListener('click', grade);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') grade();
  });
  bits.forEach((bit, i) => {
    if (bit) appendRich(line, dollars(bit));
    if (i < bits.length - 1) line.append(input);
  });
  if (bits.length < 2) line.append(input);
  return h('div', null, line, h('div', { class: 'problem-actions' }, check), why);
}
