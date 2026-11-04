// Chapter 2 as a mountain of five stages.
// Order on a stage: why, picture, claim, worked, practice, summit, stage complete, then the pins.
// The summit and the button wait until the claim has been true and false and one problem is right.
// mount(el, ctx) also reads ctx.book.focus, so a one-line registry entry can open this page.

import { sectionHref } from '../data/book.js';
import { bookChapter } from '../data/book-path.js';
import { loadChapter2Marks, saveChapter2Marks, CH2_STAGES } from '../book/ch2-progress.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountLinear, mountPower, mountLimit, mountBranch, mountReciprocal } from './ch2-picture.js';
import { mountPractice } from './ch2-practice.js';

const S21 = 'sec_functions-mappings.html';
const S22 = 'sec_z_n.html';
const S23 = 'sec_limits-continuity.html';
const S24 = 'sec_branches.html';
const S25 = 'sec_reciprocal-transformation.html';

const COPY = {
  '2.1': {
    why: 'Multiplication by $i$ is a quarter turn, and adding $i$ slides the plane up by 1.',
    summit: 'Multiplication by $i$ is a quarter turn, adding $i$ slides the plane up by 1, and $\\operatorname{Re} z \\ge 1$ lands on $\\operatorname{Im} w \\ge 2$.',
    example: 'Example 2.9, page 50. $w = iz+i$. The orange arc is that quarter turn. The shaded side is the half-plane. A function sends each $z$ to one $w$. A general linear map is a turn, a stretch, then a slide. Here $|i| = 1$, so this picture does not stretch.',
    picture: mountLinear,
    next: '2.2',
    sheet: [
      { text: 'Apply $Az+B$ to each vertex. Page 54.' },
    ],
    read: [
      { pin: 'Function, image, domain, range, page 43', href: sectionHref(S21) },
      { pin: 'Image of a set, into, inverse image, one-to-one, page 46', href: sectionHref(S21) },
      { pin: 'Translation, page 48', href: sectionHref(S21, 'fig_ch-02-05') },
      { pin: 'Rotation, page 49', href: sectionHref(S21, 'fig_ch-02-06') },
      { pin: 'Magnification, page 49', href: sectionHref(S21, 'fig_ch-02-08') },
      { pin: 'Linear transformation, page 50', href: sectionHref(S21, 'fig_ch-02-09') },
      { pin: 'Example 2.9, page 50', href: sectionHref(S21, 'fig_ch-02-09') },
    ],
  },
  '2.2': {
    why: 'Under $w = z^2$, a vertical line lands on a parabola.',
    summit: 'Under $w = z^2$, the blue vertical line lands on the orange curve.',
    example: 'Example 2.12, page 56, worked for the line $x = 1$. Then $u = 1 - y^2$ and $v = 2y$, so $y = v/2$ and $u = 1 - v^2/4$. The practice asks for a different vertical line.',
    picture: mountPower,
    next: '2.3',
    sheet: [
      { text: 'On $x = a$, $y = v/(2a)$ and $u = a^2 - y^2$. Page 59.' },
      { text: 'The $n$ roots: modulus to the $1/n$, argument $(\\operatorname{Arg} + 2\\pi k)/n$. Page 59.' },
    ],
    read: [
      { pin: 'Definition 2.1, principal square root, page 55', href: sectionHref(S22, 'sec_z_n-6') },
      { pin: 'Example 2.12, page 56', href: sectionHref(S22, 'fig_ch-02-13') },
      { pin: 'Definition 2.2, principal nth root, page 59', href: sectionHref(S22, 'def_principal_nth_root') },
      { pin: '§2.2, Exercise 1(b), page 59', href: sectionHref(S22, 'x2_2_1') },
    ],
  },
  '2.3': {
    why: 'The conjugate mirrors the point, and that limit exists.',
    summit: 'For the conjugate, the image disk has the same radius, so $\\delta = \\varepsilon$, and the definition skips $z_0$.',
    example: 'Example 2.16, page 62. The mirror keeps the distance, so $\\delta = \\varepsilon$. Theorem 2.1 says the complex limit is the pair of real limits. One direction bounds the real and imaginary parts by how far $f(z)$ is from $w_0$. The other direction builds one $\\delta$ from the two real ones.',
    picture: mountLimit,
    next: '2.4',
    sheet: [
      { text: 'Take the smaller $\\delta$. Page 62.' },
    ],
    read: [
      { pin: 'Definition 2.3, limit of u(x, y), page 61', href: sectionHref(S23, 'sec_limits-continuity-4') },
      { pin: 'Definition 2.4, limit of f(z), page 62', href: sectionHref(S23, 'LimitDef') },
      { pin: 'Example 2.16, page 62', href: sectionHref(S23, 'conj') },
      { pin: 'Theorem 2.1, page 62', href: sectionHref(S23, 'ReC_Limit_Thm') },
      { pin: 'Theorem 2.2, page 64', href: sectionHref(S23, 'LimitThm') },
      { pin: 'Definition 2.5, continuity of u, page 64', href: sectionHref(S23, 'sec_limits-continuity-20') },
      { pin: 'Definition 2.6, continuity of f, page 64', href: sectionHref(S23, 'sec_limits-continuity-23') },
      { pin: 'Theorem 2.3, page 64', href: sectionHref(S23, 'sec_limits-continuity-26') },
      { pin: 'Theorem 2.4, page 64', href: sectionHref(S23, 'ContThm') },
    ],
  },
  '2.4': {
    why: 'Arg jumps when the point crosses the negative real axis.',
    summit: 'Arg jumps across the negative real axis, and the principal square root jumps with it.',
    example: 'Example 2.21, pages 68–69. At a negative real number the limit from above and the limit from below are different square roots, so the principal square root jumps. A branch is one continuous choice of those values. Definition 2.1, page 55.',
    picture: mountBranch,
    next: '2.5',
    sheet: [
      { text: 'Arg jumps across the negative real axis. Page 68.' },
    ],
    read: [
      { pin: 'Definition 2.1, principal square root, page 55', href: sectionHref(S22, 'sec_z_n-6') },
      { pin: 'A branch of a function, page 68', href: sectionHref(S24, 'sec_branches-2-5') },
      { pin: 'The branch cut along the negative real axis, page 68', href: sectionHref(S24, 'sec_branches') },
    ],
  },
  '2.5': {
    why: '$1/z$ sends the line $x = 1$ to a circle.',
    summit: '$1/z$ sends the line $x = 1$ to the circle $|w - 1/2| = 1/2$.',
    example: 'Example 2.24, page 76. On the line $x = 1$, $u = 1/(1+y^2)$ and $v = -y/(1+y^2)$, which is the circle $|w - 1/2| = 1/2$. At $0$, $1/z$ is not a point of the plane.',
    picture: mountReciprocal,
    next: null,
    sheet: [
      { text: 'On $x = a$, $|w - 1/(2a)| = 1/(2a)$. Page 72. Example 2.24, page 76.' },
    ],
    read: [
      { pin: 'Section 2.5, page 72', href: sectionHref(S25) },
      { pin: 'Figure 2.22, the sphere, page 73', href: sectionHref(S25, 'fig_ch-02-22') },
      { pin: 'Example 2.24, lines to circles, page 76', href: sectionHref(S25, 'fig_ch-02-25') },
    ],
  },
};

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function richLine(el, text) {
  appendRich(el, String(text).replace(/\\\(/g, '$').replace(/\\\)/g, '$'));
}

export function mount(el, ctx, focusArg) {
  const focus = focusArg || (ctx.book && ctx.book.focus) || null;
  const store = ctx.store;
  let marks = loadChapter2Marks(store);
  const chapter = bookChapter(2);
  const stops = [];
  let alive = true;
  const live = {};

  const path = h('ol', { class: 'chapter-path ch2-path', id: 'chapter-path' });
  const status = h('p', { class: 'book-page', id: 'chapter-status' });

  function paint() {
    const done = CH2_STAGES.filter((id) => marks[id] === true).length;
    status.textContent = `${done} of ${CH2_STAGES.length} stages marked.`;
    for (const id of CH2_STAGES) {
      const node = path.querySelector(`[data-section="${id}"]`);
      const row = live[id];
      if (!node || !row) continue;
      const finished = marks[id] === true;
      const earned = finished || (row.sawTrue && row.sawFalse && row.item);
      node.setAttribute('data-state', finished ? 'done' : 'ahead');
      row.summitLabel.hidden = !earned;
      row.summit.hidden = !earned;
      row.mark.disabled = !earned;
      row.mark.setAttribute('aria-pressed', finished ? 'true' : 'false');
      row.mark.textContent = finished ? 'Marked' : 'Stage complete';
    }
  }

  for (const section of chapter.sections) {
    const copy = COPY[section.id];
    const scope = `chapter-section-${slug(section.id)}`;
    const row = { sawTrue: false, sawFalse: false, item: false };
    live[section.id] = row;

    const why = h('p', { class: 'section-idea', id: `${scope}-why` });
    richLine(why, copy.why);
    const picture = h('div', { class: 'ch2-picture', id: `${scope}-picture` });
    stops.push(copy.picture(picture, {
      onClaim(holds) {
        if (holds) row.sawTrue = true;
        else row.sawFalse = true;
        paint();
      },
    }));
    const example = h('p', { class: 'section-idea', id: `${scope}-example` });
    richLine(example, copy.example);
    const practice = h('div', {
      class: 'chapter-exercises', id: `${scope}-practice`, 'data-practice': '', 'data-section': section.id,
    });
    practice.append(h('p', { class: 'book-page' }, 'Practice is loading.'));
    const sheetLabel = h('h3', { class: 'book-label', id: `${scope}-memory-label`, hidden: '' }, 'Memory');
    const sheet = h('ul', { class: 'book-read', id: `${scope}-sheet`, hidden: '' });
    const seen = new Set();
    for (const line of copy.sheet || []) {
      const li = h('li');
      richLine(li, line.text);
      sheet.append(li);
      seen.add(line.text.replace(/\s+/g, ' ').trim());
    }
    const memBtn = h('button', {
      type: 'button', class: 'btn', id: `${scope}-memory-open`, 'aria-expanded': 'false', 'aria-controls': `${scope}-sheet`,
    }, 'Memory sheet');
    memBtn.addEventListener('click', () => {
      const open = memBtn.getAttribute('aria-expanded') === 'true';
      memBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
      sheet.hidden = open;
      sheetLabel.hidden = open;
    });
    const summit = h('p', { class: 'ch2-summit', id: `${scope}-summit`, hidden: '' });
    richLine(summit, copy.summit);
    if (copy.next) {
      summit.append(document.createTextNode(' Next is '));
      summit.append(h('a', { href: `#chapter-2-${slug(copy.next)}` }, copy.next));
      summit.append(document.createTextNode('.'));
    }
    row.summit = summit;
    const summitLabel = h('h3', { class: 'book-label', id: `${scope}-summit-label`, hidden: '' }, 'Summit');
    row.summitLabel = summitLabel;
    const mark = h('button', {
      type: 'button', class: 'btn ch2-complete', id: `${scope}-complete`, 'data-stage': section.id,
      'aria-pressed': 'false', disabled: '',
    }, 'Stage complete');
    row.mark = mark;
    mark.addEventListener('click', () => {
      if (mark.disabled) return;
      marks = { ...marks, [section.id]: marks[section.id] !== true };
      saveChapter2Marks(store, marks);
      paint();
    });
    const read = h('ul', { class: 'book-read', id: `${scope}-read` });
    copy.read.forEach((item, i) => {
      read.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
      }, item.pin)));
    });
    row.note = (line) => {
      const key = String(line).replace(/\\\(|\\\)/g, '').replace(/\s+/g, ' ').trim();
      if (!seen.has(key)) {
        seen.add(key);
        const li = h('li');
        richLine(li, line);
        sheet.append(li);
      }
      sheet.hidden = false;
      sheetLabel.hidden = false;
      memBtn.setAttribute('aria-expanded', 'true');
    };

    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    },
      h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id),
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
      why,
      picture,
      memBtn,
      h('h3', { class: 'book-label', id: `${scope}-worked` }, 'Worked'),
      example,
      h('h3', { class: 'book-label', id: `${scope}-faded` }, 'Practice'),
      practice,
      summitLabel,
      summit,
      h('div', { class: 'problem-actions' }, mark),
      h('h3', { class: 'book-label', id: `${scope}-pins` }, 'Further reading'),
      read,
      sheetLabel,
      sheet));
  }

  paint();

  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 2. Complex Functions'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Five stages. Drag the green point. Purple is where it lands. Blue is the line or circle you test, and orange is the curve it maps to.'),
      sourceTag({ pin: 'Chapter 2, Complex Functions, page 43', href: sectionHref(S21) })),
    path,
    status,
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  const url = new URL('../../data/practice/ch2.json', import.meta.url);
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }).then((items) => {
    if (!alive || !Array.isArray(items)) return;
    for (const host of el.querySelectorAll('[data-practice]')) {
      const section = host.dataset.section;
      const row = live[section];
      host.replaceChildren();
      stops.push(mountPractice(host, items, store, {
        onItem() {
          if (!row) return;
          row.item = true;
          paint();
        },
        onMemory(line) {
          if (row) row.note(line);
        },
      }));
    }
  }).catch(() => {
    if (!alive) return;
    for (const host of el.querySelectorAll('[data-practice]')) {
      host.replaceChildren(h('p', { class: 'book-page' }, 'The practice file did not load.'));
    }
  });

  const target = focus ? el.querySelector(`#chapter-section-${slug(String(focus).split('.').slice(0, 2).join('.'))}`) : null;
  const exact = focus ? el.querySelector(`#chapter-section-${slug(focus)}`) : null;
  const node = exact || target;
  if (node) {
    node.classList.add('is-target');
    node.scrollIntoView({ block: 'start' });
  }

  return function unmount() {
    alive = false;
    for (const stop of stops) {
      try { if (typeof stop === 'function') stop(); } catch { /* the page is leaving */ }
    }
  };
}
