// A local card for data/practice/ch2.json, until js/practice/ lands.
// One step at a time. A generator item computes its answer. A flash card is one
// card: the back stays closed until asked, and Again / Knew it sets the next due date.

import { generate, answerMatches, choiceRuns } from '../practice/gen/ch2-maps.js';
import { loadFlashBox, saveFlashBox } from '../book/ch2-progress.js';
import { h, appendRich } from './test2-ui.js';

function rich(el, text) {
  const src = String(text == null ? '' : text).replace(/\\\(/g, '$').replace(/\\\)/g, '$');
  appendRich(el, src);
}

function withPage(item) {
  const line = item && item.memory ? String(item.memory) : '';
  if (!line) return '';
  if (/page\s+\d+/i.test(line.replace(/\\\(|\\\)/g, ''))) return line;
  const page = item.cite && item.cite.page;
  return page ? `${line} Page ${page}.` : line;
}

function renderChoice(el, choice) {
  for (const run of choiceRuns(choice)) {
    if (!run.math) el.append(document.createTextNode(run.text));
    else rich(el, `\\(${run.text}\\)`);
  }
}

function stepOf(item, made, index) {
  if (made) {
    const step = (made.steps && made.steps[0]) || {};
    return {
      text: step.text || made.prompt,
      answer: step.answer || made.answer,
      accept: step.accept || made.accept || [],
      choices: step.choices || made.choices || null,
      why: step.why || made.why,
      miss: step.miss || made.miss || null,
      form: step.form || made.form || '',
      values: made.values,
    };
  }
  return (item.steps || [])[index] || {};
}

export function mountPractice(host, items, store, hooks) {
  const list = (items || []).filter((item) => item && item.section === host.dataset.section);
  const work = list.filter((item) => item.kind !== 'flash');
  const flashes = list.filter((item) => item.kind === 'flash');
  if (!work.length && !flashes.length) {
    host.append(h('p', { class: 'book-page' }, 'No practice on this stage yet.'));
    return function unmount() {};
  }
  const done = () => { if (hooks && hooks.onItem) hooks.onItem(); };
  for (const item of work) host.append(card(item, store, done));
  if (flashes.length) host.append(flashDeck(flashes, store, host.dataset.section || 'stage'));
  return function unmount() {};
}

function card(item, store, onDone) {
  const id = item.id;
  const node = h('article', { class: 'card problem-card chapter-card ch2-card', id: `ch2-card-${id}` });
  const cite = item.cite ? `${item.cite.ref}, page ${item.cite.page}` : item.section;
  const title = h('h3', { id: `ch2-card-title-${id}` });
  rich(title, cite);
  node.append(title);
  const prompt = h('div', { id: `ch2-card-prompt-${id}` });
  node.append(prompt);
  const why = h('p', { class: 'hint-note', id: `ch2-card-why-${id}`, hidden: '' });
  const memory = h('p', { class: 'ch2-memory', id: `ch2-card-memory-${id}`, hidden: '' });
  if (item.memory) rich(memory, withPage(item));

  let seed = 1;
  let made = item.generator ? generate(seed, item.generator.params || {}) : null;
  let index = 0;
  const body = h('div', { class: 'ch2-step', id: `ch2-card-step-${id}` });
  node.append(body, why, memory);

  function current() {
    return stepOf(item, made, index);
  }

  function paintPrompt() {
    prompt.replaceChildren();
    const step = current();
    const text = made
      ? `${made.prompt}${made.ask ? ` ${made.ask}` : ''}`
      : (index === 0 ? `${item.prompt} ${step.text || ''}` : step.text || '');
    rich(prompt, text);
  }

  function showWhy(step) {
    why.hidden = false;
    why.replaceChildren();
    rich(why, step.why || '');
    if (!made && index < (item.steps || []).length - 1) {
      const next = h('button', { type: 'button', class: 'btn', id: `ch2-card-next-${id}` }, 'Next step');
      next.addEventListener('click', () => {
        index += 1;
        why.hidden = true;
        paintPrompt();
        paintBody();
      });
      why.append(document.createTextNode(' '));
      why.append(next);
    } else {
      memory.hidden = false;
      onDone();
    }
  }

  function sayMiss(note, step, choice) {
    const named = step.miss && choice != null ? step.miss[choice] : '';
    const line = named || step.form || 'A number written like 3+2i.';
    note.hidden = false;
    note.replaceChildren();
    rich(note, line);
  }

  function paintBody() {
    body.replaceChildren();
    const step = current();
    const choices = made ? made.choices : step.choices;
    const useMc = item.kind.endsWith('mc') || (made && made.kind === 'mc');
    const note = h('p', { class: 'book-page', id: `ch2-card-miss-${id}`, hidden: '' });
    if (useMc && choices) {
      const rowClass = item.section === '2.4' && choices.length === 4 && choices.every((c) => String(c).length <= 3)
        ? 'ch2-choices ch2-choices-row'
        : 'ch2-choices';
      const row = h('div', { class: rowClass, id: `ch2-card-choices-${id}` });
      choices.forEach((choice, i) => {
        const b = h('button', { type: 'button', class: 'btn', id: `ch2-card-choice-${id}-${i}` }, '');
        renderChoice(b, choice);
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const ok = answerMatches(choice, { answer: step.answer, accept: step.accept, values: step.values });
          b.dataset.right = ok ? 'true' : 'false';
          if (!ok) {
            sayMiss(note, step, choice);
            return;
          }
          note.hidden = true;
          for (const other of row.querySelectorAll('button')) other.disabled = true;
          showWhy(step);
        });
        row.append(b);
      });
      body.append(row, note);
    } else {
      const field = h('label', { class: 'ch2-blank', id: `ch2-card-blank-${id}` }, 'Your answer');
      const input = h('input', { type: 'text', id: `ch2-card-input-${id}`, autocomplete: 'off', spellcheck: 'false' });
      const check = h('button', { type: 'button', class: 'btn', id: `ch2-card-check-${id}` }, 'Check');
      const grade = () => {
        const ok = answerMatches(input.value, { answer: step.answer, accept: step.accept, values: step.values });
        input.dataset.right = ok ? 'true' : 'false';
        if (!ok) {
          sayMiss(note, step, null);
          return;
        }
        note.hidden = true;
        input.disabled = true;
        check.disabled = true;
        showWhy(step);
      };
      check.addEventListener('click', grade);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          grade();
        }
      });
      field.append(input);
      body.append(field, check, note);
    }
    if (item.generator) {
      const another = h('button', { type: 'button', class: 'btn', id: `ch2-card-another-${id}` }, 'Another');
      another.addEventListener('click', () => {
        seed += 1;
        made = generate(seed, item.generator.params || {});
        index = 0;
        why.hidden = true;
        memory.hidden = true;
        paintPrompt();
        paintBody();
      });
      body.append(another);
    }
  }

  paintPrompt();
  paintBody();
  return node;
}

function flashDeck(items, store, section) {
  let at = 0;
  const sid = String(section).replace(/\./g, '-');
  const node = h('article', { class: 'card problem-card chapter-card ch2-card', id: `ch2-flash-deck-${sid}` });
  const title = h('h3', { id: `ch2-flash-title-${sid}` }, 'Card');
  const prompt = h('div', { id: `ch2-flash-prompt-${sid}` });
  const show = h('button', { type: 'button', class: 'btn', id: `ch2-flash-show-${sid}` }, 'Show the back');
  const why = h('p', { class: 'hint-note', id: `ch2-flash-back-${sid}`, hidden: '' });
  const memory = h('p', { class: 'ch2-memory', id: `ch2-flash-memory-${sid}`, hidden: '' });
  const again = h('button', { type: 'button', class: 'btn', id: `ch2-flash-again-${sid}`, hidden: '' }, 'Again');
  const knew = h('button', { type: 'button', class: 'btn', id: `ch2-flash-knew-${sid}`, hidden: '' }, 'Knew it');
  const due = h('p', { class: 'book-page', id: `ch2-flash-due-${sid}` });
  node.append(title, prompt, show, why, memory, h('div', { class: 'problem-actions' }, again, knew), due);

  function current() {
    return items[at] || items[0];
  }

  function paint() {
    const item = current();
    const cite = item.cite ? `${item.cite.ref}, page ${item.cite.page}` : item.section;
    title.textContent = cite;
    prompt.replaceChildren();
    rich(prompt, item.prompt);
    show.hidden = false;
    why.hidden = true;
    why.replaceChildren();
    memory.hidden = true;
    memory.replaceChildren();
    if (item.memory) rich(memory, withPage(item));
    again.hidden = true;
    knew.hidden = true;
    const dueNow = items.filter((it) => loadFlashBox(store, it.id).due <= Date.now());
    if (!dueNow.length) {
      show.hidden = true;
      const soon = Math.min(...items.map((it) => loadFlashBox(store, it.id).due));
      const days = Math.max(1, Math.round((soon - Date.now()) / 86400000));
      due.textContent = `Nothing is due. The next card returns ${days === 1 ? 'tomorrow' : `in ${days} days`}.`;
      return;
    }
    const box = loadFlashBox(store, item.id);
    const place = `${at + 1} of ${items.length}`;
    due.textContent = box.box ? `${place}. Box ${box.box}.` : place;
  }

  function openBack() {
    const item = current();
    const back = (item.steps && item.steps[0]) || {};
    show.hidden = true;
    why.hidden = false;
    why.replaceChildren();
    rich(why, back.answer || '');
    memory.hidden = false;
    again.hidden = false;
    knew.hidden = false;
  }

  function grade(knewIt) {
    const item = current();
    saveFlashBox(store, item.id, knewIt, Date.now());
    const now = Date.now();
    let next = -1;
    for (let k = 1; k <= items.length; k += 1) {
      const i = (at + k) % items.length;
      if (loadFlashBox(store, items[i].id).due <= now) {
        next = i;
        break;
      }
    }
    at = next === -1 ? (at + 1) % items.length : next;
    paint();
  }

  show.addEventListener('click', openBack);
  again.addEventListener('click', () => grade(false));
  knew.addEventListener('click', () => grade(true));
  paint();
  return node;
}
