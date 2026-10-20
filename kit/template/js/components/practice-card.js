// One practice problem: statement, hint, answer, citation.

import { h } from '../core/dom.js';
import { tex, prose } from '../core/katex.js';
import { stationById } from '../registry.js';
import { sourceTag } from './source.js';

function statementEl(text) {
  const box = h('div', { class: 'statement' });
  String(text ?? '').split('$').forEach((chunk, i) => {
    if (chunk === '') return;
    const span = h('span', { class: i % 2 === 1 ? 'statement-math' : '' });
    if (i % 2 === 1) tex(span, chunk, { display: false });
    else prose(span, chunk);
    box.append(span);
  });
  return box;
}

export function problemCard(problem, { hintOpen = false, showStation = true } = {}) {
  const k = String(problem.id).replace(/[^A-Za-z0-9_-]+/g, '-');
  const card = h('article', {
    class: 'card problem-card',
    id: `problem-${k}`,
    'data-problem': problem.id,
    'data-chapter': problem.chapter != null ? String(problem.chapter) : '',
  });
  card.append(h('h3', { class: 'pc-title' }, h('span', { class: 'badge', text: problem.id })));
  card.append(statementEl(problem.statement));
  card.append(sourceTag(problem.source, { id: `problem-${k}-source` }));

  if (showStation && problem.station) {
    const st = stationById(problem.station);
    card.append(h('p', { class: 'pc-place' }, 'Lives at ', h('a', {
      class: 'chip',
      href: `#${problem.station}`,
      'data-station': problem.station,
    }, st ? st.title : problem.station)));
  }

  const hint = h('p', { class: 'pc-hint', id: `problem-${k}-hint`, hidden: !hintOpen, text: problem.hint || '' });
  const hintBtn = h('button', {
    type: 'button',
    class: 'btn',
    id: `problem-${k}-hint-btn`,
    'aria-expanded': hintOpen ? 'true' : 'false',
    'aria-controls': `problem-${k}-hint`,
  }, hintOpen ? 'Hide the hint' : 'Show a hint');
  hintBtn.addEventListener('click', () => {
    const open = hint.hidden;
    hint.hidden = !open;
    hintBtn.setAttribute('aria-expanded', String(open));
    hintBtn.textContent = open ? 'Hide the hint' : 'Show a hint';
  });

  const answer = h('div', { class: 'answer', id: `problem-${k}-answer`, hidden: true });
  const answerMath = h('div', { class: 'tex-scroll', tabindex: '0' });
  if (problem.answer && problem.answer.includes('$')) {
    const bits = problem.answer.split('$');
    bits.forEach((chunk, i) => {
      if (chunk === '') return;
      const span = h('span');
      if (i % 2 === 1) tex(span, chunk, { display: true });
      else prose(span, chunk);
      answerMath.append(span);
    });
  } else {
    const span = h('div');
    prose(span, problem.answer || '');
    answerMath.append(span);
  }
  answer.append(h('h4', { class: 'pc-label', text: 'Answer' }), answerMath);
  if (problem.answerText) answer.append(h('p', { class: 'mono muted', text: problem.answerText }));

  const answerBtn = h('button', {
    type: 'button',
    class: 'btn btn-primary',
    id: `problem-${k}-answer-btn`,
    'aria-expanded': 'false',
    'aria-controls': `problem-${k}-answer`,
  }, 'Show the answer');
  answerBtn.addEventListener('click', () => {
    const open = answer.hidden;
    answer.hidden = !open;
    answerBtn.setAttribute('aria-expanded', String(open));
    answerBtn.textContent = open ? 'Hide the answer' : 'Show the answer';
  });

  card.append(hint, h('div', { class: 'row' }, hintBtn, answerBtn), answer);
  return card;
}
