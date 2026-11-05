// The practice card, the memory sheet, and one flashcard.
// Prose with $...$ goes through appendRich. Nothing here uses innerHTML.

import { h, appendRich, sourceTag } from '../stations/test2-ui.js';
import { orderedChoices } from './queue.js';

function rich(text, attrs) {
  const node = h('p', attrs || null);
  appendBroken(node, text || '');
  return node;
}

function appendBroken(parent, text) {
  const lines = String(text || '').split('\n');
  lines.forEach((line, i) => {
    if (i) parent.append(h('br'));
    appendRich(parent, line);
  });
}

function escapeReg(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The sheet names a line once, in the parenthesis. A memory that already
// ends with that citation does not say it again.
function withoutTrailingCite(memory, ref, page) {
  let text = String(memory || '').trim();
  const refText = String(ref || '').trim();
  const tail = refText.includes(',') ? refText.split(',').pop().trim() : refText;
  const pages = String(page);
  const tails = [...new Set([refText, tail].filter((part) => part.length > 1))];
  for (const part of tails) {
    const re = new RegExp(`(?:^|\\s)${escapeReg(part)},?\\s*page\\s*${escapeReg(pages)}\\.?\\s*$`);
    text = text.replace(re, '').trim();
  }
  return text;
}

function fillStep(parent, text, answer) {
  const parts = String(text || '').split('___');
  if (parts.length === 1) {
    appendRich(parent, text || '');
    return;
  }
  appendRich(parent, parts[0]);
  const mark = h('span', { class: 'practice-filled' });
  appendRich(mark, answer || '');
  parent.append(mark);
  if (parts[1]) appendRich(parent, parts[1]);
}

function mathPlain(text) {
  return String(text || '')
    .replace(/\$/g, '')
    .replace(/\\(?:varepsilon|epsilon)/gi, 'epsilon')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function spoilNeedles(conceal) {
  if (!conceal) return [];
  const raw = [conceal.answer].concat(conceal.accept || []);
  const out = [];
  for (const value of raw) {
    const plain = mathPlain(value);
    if (plain && !out.includes(plain)) out.push(plain);
  }
  return out;
}

function leaks(text, needles) {
  if (!needles.length || !text) return false;
  const hay = mathPlain(text);
  return needles.some((needle) => {
    if (needle.length >= 3) return hay.includes(needle);
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(hay);
  });
}

// The front is the gloss after the number: "absolute convergence implies convergence".
export function cardGloss(item) {
  const prompt = String((item && item.prompt) || '');
  const ref = item && item.cite && item.cite.ref ? String(item.cite.ref) : '';
  if (ref && prompt.startsWith(ref)) {
    const rest = prompt.slice(ref.length).replace(/^[\s,.:;\-–—]+/, '').trim();
    if (rest) return rest;
  }
  return prompt;
}

function choicePlainLength(choice) {
  return String(choice || '').replace(/\$/g, '').replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').trim().length;
}

// A title that asks a question is answered by the last step. On the worked card that line comes first.
function shownIndex(item, view, step) {
  if (view !== 'worked' || !item || !item.steps || item.steps.length < 2) return step;
  const prompt = String(item.prompt || '').trim();
  if (!prompt.endsWith('?')) return step;
  const last = item.steps.length - 1;
  if (step === 0) return last;
  if (step === last) return 0;
  return step;
}

function hintButton(vm, act) {
  const hintBtn = h('button', {
    type: 'button', class: 'btn', id: 'practice-hint',
    'aria-expanded': vm.hint > 0 ? 'true' : 'false',
  }, vm.hint > 0 ? 'Next hint' : 'Hint');
  hintBtn.addEventListener('click', act.hint);
  return hintBtn;
}

export function renderCard(host, vm, act) {
  host.replaceChildren();
  if (vm.done) {
    const facts = vm.facts || [];
    const kids = [h('h2', { id: 'practice-prompt' }, 'Set complete')];
    if (facts.length > 1) facts.forEach((line) => kids.push(rich(line)));
    else if (!facts.length) kids.push(rich('You retrieved this set.'));
    kids.push(h('div', { class: 'problem-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-to-memory' }, 'Open the memory sheet')));
    host.append(h('article', { class: 'card practice-card', id: 'practice-card' }, ...kids));
    host.querySelector('#practice-to-memory').addEventListener('click', act.memory);
    return;
  }

  const item = vm.item;
  const focus = shownIndex(item, vm.view, vm.step);
  const step = item.steps[focus];
  const worked = vm.view === 'worked';
  const kids = [
    h('div', { class: 'practice-kicker' },
      h('p', { class: 'book-flag', id: 'practice-kind' }, worked ? 'Worked example' : vm.kindLabel),
      h('p', { class: 'book-page', id: 'practice-count' }, vm.count)),
  ];
  const prompt = h('h2', { id: 'practice-prompt' });
  appendRich(prompt, item.prompt || '');
  kids.push(prompt);
  if (worked && vm.reading) kids.push(rich(vm.reading, { class: 'practice-idea', id: 'practice-idea' }));
  if (item.cite && item.cite.href) {
    kids.push(sourceTag({
      href: item.cite.href,
      pin: `${item.cite.ref}, page ${item.cite.page}`,
    }));
  }

  const list = h('ol', {
    class: 'practice-steps',
    id: 'practice-steps',
    start: String((worked ? vm.step : 0) + 1),
  });
  item.steps.forEach((s, i) => {
    if (worked && i !== focus) return;
    if (!worked && i > vm.step) return;
    const onStep = worked ? i === focus : i === vm.step;
    const li = h('li', {
      id: `practice-step-${i}`,
      'data-state': !worked && i < vm.step ? 'done' : onStep ? 'current' : 'ahead',
    });
    const line = h('p', { class: 'practice-step-text' });
    const revealAnswer = worked || i < vm.step || (i === vm.step && vm.revealAnswer);
    if (revealAnswer) fillStep(line, s.text, s.answer);
    else appendRich(line, s.text || '');
    li.append(line);
    if ((worked || i < vm.step) && s.why) {
      li.append(rich(s.why, { class: 'practice-why', id: worked && i === focus ? 'practice-why' : null }));
    }
    list.append(li);
  });
  kids.push(list);

  if (worked) {
    const last = vm.step >= item.steps.length - 1;
    kids.push(h('div', { class: 'problem-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-next' }, last ? 'Try these steps' : 'Next')));
  } else if (vm.phase === 'ask' || vm.phase === 'hint') {
    if (String(item.kind).endsWith('mc')) {
      const choiceList = step.choices || [];
      const choices = h('div', { class: 'practice-choices', id: 'practice-choices', role: 'group', 'aria-label': 'Choices' });
      if (choiceList.length >= 4 && choiceList.every((choice) => choicePlainLength(choice) <= 16)) {
        choices.setAttribute('data-cols', '2');
      }
      orderedChoices(choiceList, vm.choiceSeed || 1).forEach((choice, i) => {
        const btn = h('button', { type: 'button', class: 'btn practice-choice', id: `practice-choice-${i}` });
        appendRich(btn, choice);
        btn.addEventListener('click', () => act.answer(choice));
        choices.append(btn);
      });
      kids.push(choices);
    } else {
      const input = h('input', {
        id: 'practice-input',
        type: 'text',
        autocomplete: 'off',
        spellcheck: 'false',
        'aria-labelledby': 'practice-answer-label',
      });
      const field = h('div', { class: 'practice-field', id: 'practice-field' },
        h('span', { class: 'practice-answer-label', id: 'practice-answer-label' }, 'Your answer'),
        input);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          act.answer(input.value);
        }
      });
      input.addEventListener('focus', () => { if (act.focus) act.focus(); });
      const check = h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-check' }, 'Check');
      check.addEventListener('click', () => act.answer(input.value));
      const row = h('div', { class: 'problem-actions practice-check-row', id: 'practice-check-row' }, check);
      if (step.hints && step.hints.length && vm.hint < step.hints.length) row.append(hintButton(vm, act));
      kids.push(field, row);
    }
    if (vm.phase === 'hint') {
      kids.push(h('p', { class: 'practice-verdict', id: 'practice-verdict', 'data-right': 'false' }, 'Not that one.'));
    }
    const hinted = step.hints && vm.hint > 0 ? step.hints.slice(0, vm.hint) : [];
    const lines = hinted.length ? hinted : (vm.phase === 'hint' && vm.missLine ? [vm.missLine] : []);
    if (lines.length) {
      const note = h('div', { class: 'hint-note', id: 'practice-hint-note' });
      lines.forEach((line, i) => {
        note.append(rich(line, { class: 'practice-hint-line', id: `practice-hint-line-${i}` }));
      });
      kids.push(note);
    }
    if (vm.returns) {
      kids.push(rich('This step comes back.', { class: 'practice-returns', id: 'practice-returns' }));
    }
    const hintLater = String(item.kind).endsWith('mc')
      && step.hints && step.hints.length && vm.hint < step.hints.length;
    if (hintLater) {
      kids.push(h('div', { class: 'problem-actions practice-word-row' }, hintButton(vm, act)));
    }
  } else {
    const why = rich(step.why || '', { class: 'practice-why', id: 'practice-why' });
    const verdict = h('p', {
      class: 'practice-verdict',
      id: 'practice-verdict',
      'data-right': vm.right ? 'true' : 'false',
    }, vm.right ? 'Yes.' : 'Not that one.');
    const actions = [];
    if (vm.showGenerate) {
      actions.push(h('button', { type: 'button', class: 'btn', id: 'practice-generate' }, 'Generate another'));
    }
    const last = vm.step >= item.steps.length - 1;
    const nextLabel = !last ? 'Next step' : (vm.endless && item.generator ? 'Generate another' : 'Next');
    actions.push(h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-next' }, nextLabel));
    kids.push(verdict, why, h('div', { class: 'problem-actions practice-act-row' }, ...actions));
  }

  const card = h('article', { class: 'card practice-card', id: 'practice-card', 'data-kind': item.kind, 'data-view': vm.view }, ...kids.filter(Boolean));
  host.append(card);
  const next = host.querySelector('#practice-next');
  const generate = host.querySelector('#practice-generate');
  if (next) next.addEventListener('click', act.next);
  if (generate) generate.addEventListener('click', act.generate);
  if (next && vm.phase === 'told') next.focus({ preventScroll: true });
}

export function renderSheet(host, groups, conceal) {
  host.replaceChildren();
  const needles = spoilNeedles(conceal);
  const sheet = h('div', { class: 'practice-sheet', id: 'practice-sheet' });
  sheet.append(
    h('h2', { id: 'practice-sheet-title' }, 'Memory sheet'),
    rich('Print this page when you want the sheet on paper.'),
    h('div', { class: 'problem-actions' },
      h('button', { type: 'button', class: 'btn', id: 'practice-print' }, 'Print')));
  if (!groups.length) {
    sheet.append(rich('Nothing is filed for this chapter yet.'));
  }
  for (const group of groups) {
    const formulas = group.lines.filter((line) => line.formula && !leaks(line.formula, needles));
    const memories = group.lines.filter((line) => line.memory && !leaks(line.memory, needles));
    if (!formulas.length && !memories.length) continue;
    const block = h('section', { class: 'card practice-sheet-section', id: `practice-sheet-${group.section.replace(/\./g, '-')}` });
    block.append(h('h3', null, group.title));
    if (formulas.length) {
      block.append(h('p', { class: 'book-flag' }, 'Formulas'));
      const ul = h('ul', { class: 'practice-formulas' });
      formulas.forEach((line) => {
        const li = h('li', line.formula.includes('\n') ? { class: 'practice-break' } : null);
        li.append(rich(line.formula));
        ul.append(li);
      });
      block.append(ul);
    }
    if (memories.length) {
      block.append(h('p', { class: 'book-flag' }, 'Takeaways'));
      const ul = h('ul', { class: 'practice-memories' });
      memories.forEach((line) => {
        const body = withoutTrailingCite(line.memory, line.ref, line.page);
        const broken = body.includes('\n');
        const li = h('li', broken ? { class: 'practice-break' } : null);
        appendBroken(li, body);
        if (broken) li.append(h('br'));
        li.append(document.createTextNode(`${broken ? '' : ' '}(${line.ref}, page ${line.page})`));
        ul.append(li);
      });
      block.append(ul);
    }
    sheet.append(block);
  }
  host.append(sheet);
  const print = host.querySelector('#practice-print');
  if (print) print.addEventListener('click', () => window.print());
}

export function renderFlash(host, vm, act) {
  host.replaceChildren();
  if (!vm.item) {
    host.append(h('article', { class: 'card practice-card', id: 'practice-card' },
      h('h2', { id: 'practice-prompt' }, 'No cards in this set'),
      rich('This chapter has no flashcards yet.')));
    return;
  }
  const item = vm.item;
  const back = item.steps[0];
  const kids = [
    h('div', { class: 'practice-kicker' },
      h('p', { class: 'book-flag' }, vm.early ? 'Early' : (vm.box ? `Box ${vm.box}` : 'New')),
      h('p', { class: 'book-page', id: 'practice-count' }, vm.count)),
  ];
  const prompt = h('h2', { id: 'practice-prompt' });
  appendRich(prompt, cardGloss(item));
  kids.push(prompt);
  if (item.cite && item.cite.href) {
    kids.push(sourceTag({ href: item.cite.href, pin: `${item.cite.ref}, page ${item.cite.page}` }));
  }
  if (!vm.show) {
    kids.push(h('div', { class: 'problem-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-show' }, 'Show the back')));
  } else {
    const answer = h('p', { class: 'practice-back', id: 'practice-back' });
    appendRich(answer, back.answer);
    kids.push(answer);
    kids.push(h('div', { class: 'problem-actions' },
      h('button', { type: 'button', class: 'btn', id: 'practice-again' }, 'Again'),
      h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-good' }, 'Got it')));
  }
  host.append(h('article', { class: 'card practice-card', id: 'practice-card', 'data-kind': 'flash' }, ...kids));
  const show = host.querySelector('#practice-show');
  const again = host.querySelector('#practice-again');
  const good = host.querySelector('#practice-good');
  if (show) show.addEventListener('click', act.show);
  if (again) again.addEventListener('click', () => act.grade('again'));
  if (good) good.addEventListener('click', () => act.grade('good'));
}
