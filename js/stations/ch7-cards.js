// A local card for data/practice/ch7.json. The shared engine in js/practice/
// replaces this when it lands. The schema is the same: prompt, steps, why
// after an answer, flash front and back. No flip animation.

import { h, appendRich } from './test2-ui.js';
import { answerMatches } from '../core/ch7-series.js';
import { generate as laurentGenerate } from '../practice/gen/laurent-annulus.js';
import { generate as orderGenerate } from '../practice/gen/singularity-order.js';
import { generate as threeGenerate } from '../practice/gen/laurent-three.js';
import { generate as classGenerate } from '../practice/gen/singularity-class.js';

const GENERATORS = {
  'laurent-annulus': laurentGenerate,
  'singularity-order': orderGenerate,
  'laurent-three': threeGenerate,
  'singularity-class': classGenerate,
};

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function rich(el, text) {
  el.replaceChildren();
  appendRich(el, text || '');
}

function showMath(text) {
  return String(text || '').replace(/\\\[/g, '$').replace(/\\\]/g, '$').replace(/\\\(/g, '$').replace(/\\\)/g, '$');
}

const LOOK = {
  '7.1': 'Look at the readout under the picture.',
  '7.2': 'Look at the orange circle.',
  '7.3': 'Look at which side of the orange circles the point is on.',
  '7.4': 'Look at the purple image.',
  '7.5': 'Look at the readout near 0.',
};

function missLine(item) {
  return item.look || LOOK[item.section] || 'Look at the picture.';
}

export function mountPracticeItem(item, opts) {
  const onDone = opts && opts.onDone;
  const id = slug(item.id);
  const card = h('article', { class: 'card problem-card chapter-card ch7-card', id: `ch7-card-${id}`, 'data-practice': item.id });
  const prompt = h('div', { id: `ch7-prompt-${id}` });
  rich(prompt, showMath(item.prompt));
  const stepsHost = h('div', { class: 'ch7-steps', id: `ch7-steps-${id}` });
  card.append(
    h('h3', { id: `ch7-title-${id}` }, item.cite ? `${item.cite.ref}, page ${item.cite.page}` : item.id),
    prompt,
    stepsHost,
  );

  let steps = item.steps.slice();
  let seed = (opts && opts.seed) || 1;
  const state = steps.map(() => false);

  function paint() {
    stepsHost.replaceChildren();
    steps.forEach((step, i) => {
      if (i > 0 && !state[i - 1]) return;
      stepsHost.append(stepView(step, i));
    });
  }

  function stepView(step, i) {
    const wrap = h('div', { class: 'ch7-step', id: `ch7-step-${id}-${i + 1}` });
    const line = h('p', { class: 'ch7-step-text' });
    rich(line, showMath(step.text));
    wrap.append(line);
    const why = h('p', { class: 'hint-note', id: `ch7-why-${id}-${i + 1}`, hidden: '' });
    if (state[i]) {
      const done = h('p', { class: 'ch7-answered' });
      rich(done, showMath(step.answer));
      rich(why, showMath(step.why));
      why.hidden = false;
      wrap.append(done, why);
      return wrap;
    }
    if (item.kind.endsWith('-mc') || (step.choices && step.choices.length)) {
      const choices = h('div', { class: 'ch7-choices', id: `ch7-choices-${id}-${i + 1}` });
      step.choices.forEach((choice, c) => {
        const btn = h('button', {
          type: 'button',
          class: 'btn ch7-choice',
          id: `ch7-choice-${id}-${i + 1}-${c + 1}`,
        });
        rich(btn, showMath(choice));
        btn.addEventListener('click', () => {
          const right = answerMatches(choice, step);
          why.hidden = false;
          if (right) rich(why, showMath(step.why));
          else {
            const specific = step.choiceWhy && step.choiceWhy[c];
            why.replaceChildren();
            why.append(document.createTextNode('Not yet. '));
            const mem = document.createElement('span');
            rich(mem, showMath(specific || missLine(item)));
            why.append(mem);
          }
          btn.setAttribute('aria-pressed', 'true');
          btn.dataset.right = right ? 'true' : 'false';
          if (right) {
            state[i] = true;
            paint();
            if (state.every(Boolean) && onDone) onDone(item.id);
          }
        });
        choices.append(btn);
      });
      wrap.append(choices, why);
      return wrap;
    }
    const row = h('div', { class: 'ch7-blank-row' });
    const input = h('input', {
      type: 'text',
      id: `ch7-blank-${id}-${i + 1}`,
      class: 'ch7-blank',
      autocomplete: 'off',
      'aria-label': 'Fill the blank',
    });
    const check = h('button', { type: 'button', class: 'btn', id: `ch7-check-${id}-${i + 1}` }, 'Check');
    const note = h('p', { class: 'ch7-miss', id: `ch7-miss-${id}-${i + 1}`, hidden: '' });
    function grade() {
      if (answerMatches(input.value, step)) {
        state[i] = true;
        paint();
        if (state.every(Boolean) && onDone) onDone(item.id);
        return;
      }
      note.hidden = false;
      note.replaceChildren();
      note.append(document.createTextNode('Not yet. '));
      const mem = document.createElement('span');
      rich(mem, showMath(missLine(item)));
      note.append(mem);
      input.dataset.right = 'false';
    }
    check.addEventListener('click', grade);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        grade();
      }
    });
    row.append(input, check);
    wrap.append(row, note, why);
    return wrap;
  }

  if (item.generator && GENERATORS[item.generator.template]) {
    const again = h('button', { type: 'button', class: 'btn', id: `ch7-again-${id}` }, 'Another function');
    again.addEventListener('click', () => {
      const nextSeed = seed + 1;
      const next = GENERATORS[item.generator.template](nextSeed, item.generator.params);
      const extra = mountPracticeItem({
        ...item,
        id: `${item.id}-s${nextSeed}`,
        prompt: next.prompt,
        steps: next.steps,
      }, { seed: nextSeed });
      card.insertAdjacentElement('afterend', extra);
      again.hidden = true;
    });
    card.append(again);
  }

  paint();
  return card;
}

export function mountFlashDeck(items, prefix, opts) {
  if (!items.length) return h('div');
  let index = 0;
  let open = false;
  const host = h('div', { class: 'ch7-flash', id: `${prefix}-flash` });
  const count = h('p', { class: 'ch7-read', id: `${prefix}-flash-count` });
  const front = h('p', { class: 'ch7-flash-face', id: `${prefix}-flash-front` });
  const back = h('p', { class: 'ch7-flash-face', id: `${prefix}-flash-back`, hidden: '' });
  const show = h('button', { type: 'button', class: 'btn', id: `${prefix}-flash-show` }, 'Show the back');
  const next = h('button', { type: 'button', class: 'btn', id: `${prefix}-flash-next` }, 'Next card');
  function paint() {
    const item = items[index];
    count.textContent = `Card ${index + 1} of ${items.length}`;
    rich(front, showMath(item.prompt));
    rich(back, showMath(item.steps[0] && item.steps[0].answer));
    back.hidden = !open;
    show.hidden = open;
    show.setAttribute('aria-expanded', open ? 'true' : 'false');
    next.hidden = items.length < 2;
  }
  show.addEventListener('click', () => {
    open = true;
    paint();
    if (opts && opts.onSeen) opts.onSeen();
  });
  next.addEventListener('click', () => {
    index = (index + 1) % items.length;
    open = false;
    paint();
  });
  host.append(count, front, show, back, next);
  paint();
  return host;
}
