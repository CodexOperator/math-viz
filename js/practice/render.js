// The practice card, the memory sheet, and one flashcard.
// Prose with $...$ goes through appendRich. Nothing here uses innerHTML.

import { h, appendRich, sourceTag } from '../stations/test2-ui.js';

function rich(text, attrs) {
  const node = h('p', attrs || null);
  appendRich(node, text || '');
  return node;
}

function recipeSteps(memory) {
  const parts = String(memory || '').split(/\s(?=\d+\.\s)/).map((s) => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  return parts.length > 1 ? parts : null;
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

export function renderCard(host, vm, act) {
  host.replaceChildren();
  if (vm.done) {
    host.append(h('article', { class: 'card practice-card', id: 'practice-card' },
      h('h2', { id: 'practice-prompt' }, 'Set complete'),
      rich('You retrieved this set. The memory sheet is the short version of the same facts.'),
      h('div', { class: 'problem-actions' },
        h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-to-memory' }, 'Open the memory sheet'))));
    host.querySelector('#practice-to-memory').addEventListener('click', act.memory);
    return;
  }

  const item = vm.item;
  const step = item.steps[vm.step];
  const worked = vm.view === 'worked';
  const kids = [
    h('p', { class: 'book-flag', id: 'practice-kind' }, worked ? 'Worked example' : vm.kindLabel),
    h('p', { class: 'book-page', id: 'practice-count' }, vm.count),
  ];
  const prompt = h('h2', { id: 'practice-prompt' });
  appendRich(prompt, item.prompt || '');
  kids.push(prompt);
  if (item.cite && item.cite.href) {
    kids.push(sourceTag({
      href: item.cite.href,
      pin: `${item.cite.ref}, page ${item.cite.page}`,
    }));
  }

  const list = h('ol', { class: 'practice-steps', id: 'practice-steps' });
  item.steps.forEach((s, i) => {
    const li = h('li', {
      id: `practice-step-${i}`,
      'data-state': i < vm.step ? 'done' : i === vm.step ? 'current' : 'ahead',
    });
    const line = h('p', { class: 'practice-step-text' });
    if (worked || i < vm.step || (i === vm.step && vm.phase === 'told')) fillStep(line, s.text, s.answer);
    else appendRich(line, s.text || '');
    li.append(line);
    if ((worked || i < vm.step) && s.why) li.append(rich(s.why, { class: 'practice-why' }));
    list.append(li);
  });
  kids.push(list);

  if (worked) {
    kids.push(h('div', { class: 'problem-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-next' }, 'Try these steps')));
  } else if (vm.phase === 'ask') {
    const actions = [];
    if (String(item.kind).endsWith('mc')) {
      const choices = h('div', { class: 'practice-choices', id: 'practice-choices', role: 'group', 'aria-label': 'Choices' });
      (step.choices || []).forEach((choice, i) => {
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
        'aria-label': 'Your answer',
      });
      const field = h('label', { class: 'field practice-field', id: 'practice-field', for: 'practice-input' }, 'Your answer', input);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          act.answer(input.value);
        }
      });
      const check = h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-check' }, 'Check');
      check.addEventListener('click', () => act.answer(input.value));
      kids.push(field, h('div', { class: 'problem-actions' }, check));
    }
    if (step.hints && step.hints.length) {
      const hintBtn = h('button', {
        type: 'button', class: 'btn', id: 'practice-hint',
        'aria-expanded': vm.hint > 0 ? 'true' : 'false',
      }, vm.hint > 0 && vm.hint < step.hints.length ? 'Next hint' : 'Hint');
      if (vm.hint >= step.hints.length) hintBtn.disabled = true;
      hintBtn.addEventListener('click', act.hint);
      actions.push(hintBtn);
    }
    if (vm.hint > 0 && step.hints) {
      const shown = step.hints.slice(0, vm.hint);
      const note = h('div', { class: 'hint-note', id: 'practice-hint-note' });
      shown.forEach((line, i) => {
        note.append(rich(line, { class: 'practice-hint-line', id: `practice-hint-line-${i}` }));
      });
      kids.push(note);
    }
    if (actions.length) kids.push(h('div', { class: 'problem-actions' }, ...actions));
  } else {
    const why = rich((vm.why || step.why) || '', { class: 'practice-why', id: 'practice-why' });
    const verdict = h('p', {
      class: 'practice-verdict',
      id: 'practice-verdict',
      'data-right': vm.right ? 'true' : 'false',
    }, vm.right ? 'Yes.' : 'Not that one.');
    const reveal = h('p', { class: 'practice-reveal', id: 'practice-reveal' });
    appendRich(reveal, 'The answer is ');
    const ans = h('span', { class: 'practice-filled' });
    appendRich(ans, step.answer);
    reveal.append(ans, document.createTextNode('.'));
    const actions = [];
    if (vm.showGenerate) {
      actions.push(h('button', { type: 'button', class: 'btn', id: 'practice-generate' }, 'Generate another'));
    }
    const last = vm.step >= item.steps.length - 1;
    const nextLabel = !last ? 'Next step' : (vm.endless && item.generator ? 'Generate another' : 'Next');
    actions.push(h('button', { type: 'button', class: 'btn btn-primary', id: 'practice-next' }, nextLabel));
    kids.push(verdict, (vm.right || vm.slip) ? null : reveal, why, h('div', { class: 'problem-actions' }, ...actions));
  }

  const card = h('article', { class: 'card practice-card', id: 'practice-card', 'data-kind': item.kind, 'data-view': vm.view }, ...kids.filter(Boolean));
  host.append(card);
  const next = host.querySelector('#practice-next');
  const generate = host.querySelector('#practice-generate');
  if (next) next.addEventListener('click', act.next);
  if (generate) generate.addEventListener('click', act.generate);
  if (next && vm.phase === 'told') next.focus({ preventScroll: true });
}

export function renderSheet(host, groups) {
  host.replaceChildren();
  const sheet = h('div', { class: 'practice-sheet', id: 'practice-sheet' });
  sheet.append(
    h('h2', { id: 'practice-sheet-title' }, 'Memory sheet'),
    rich('The formulas and the one-line versions. Print this page when you want the sheet on paper.'),
    h('div', { class: 'problem-actions' },
      h('button', { type: 'button', class: 'btn', id: 'practice-print' }, 'Print')));
  if (!groups.length) {
    sheet.append(rich('Nothing is filed for this chapter yet.'));
  }
  for (const group of groups) {
    const block = h('section', { class: 'card practice-sheet-section', id: `practice-sheet-${group.section.replace(/\./g, '-')}` });
    block.append(h('h3', null, group.title));
    const formulas = group.lines.filter((line) => line.formula);
    if (formulas.length) {
      block.append(h('p', { class: 'book-flag' }, 'Formulas'));
      const ul = h('ul', { class: 'practice-formulas' });
      formulas.forEach((line) => ul.append(h('li', null, rich(line.formula))));
      block.append(ul);
    }
    const recipe = group.lines.length === 1 ? recipeSteps(group.lines[0].memory) : null;
    if (recipe) {
      block.append(h('p', { class: 'book-page' }, `${group.lines[0].ref}, page ${group.lines[0].page}`));
      const ol = h('ol', { class: 'practice-memories' });
      recipe.forEach((line) => {
        const li = h('li');
        appendRich(li, line);
        ol.append(li);
      });
      block.append(ol);
    } else {
      block.append(h('p', { class: 'book-flag' }, 'Takeaways'));
      const ul = h('ul', { class: 'practice-memories' });
      group.lines.forEach((line) => {
        const li = h('li');
        appendRich(li, line.memory);
        li.append(document.createTextNode(` (${line.ref}, page ${line.page})`));
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
    h('p', { class: 'book-flag' }, vm.early ? 'Early' : (vm.box ? `Box ${vm.box}` : 'New')),
    h('p', { class: 'book-page', id: 'practice-count' }, vm.count),
  ];
  const prompt = h('h2', { id: 'practice-prompt' });
  appendRich(prompt, item.prompt || '');
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
    if (back.why) kids.push(rich(back.why, { class: 'practice-why', id: 'practice-why' }));
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
