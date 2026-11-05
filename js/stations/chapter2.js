// Chapter 2 as a mountain of five stages.
// Order on a stage: why, picture, claim, worked, practice, memory, then the summit.
// The summit and Stage complete stay hidden until the claim has been both ways and one problem is right.
// Until then a line names the missing piece. Go to the next stage writes the mark, then moves.
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
      { text: 'On $x = a \\neq 0$, $u = a^2 - y^2$ and $v = 2ay$, so $u = a^2 - v^2/(4a^2)$. Equation (2.10), page 56.' },
      { text: 'The $n$ roots of a nonzero number: modulus to the $1/n$, argument $(\\operatorname{Arg} + 2\\pi k)/n$ for $k = 0, \\ldots, n-1$. Equation (1.45), page 32.' },
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
      { pin: 'The origin is the branch point, page 69', href: sectionHref(S24) },
    ],
  },
  '2.5': {
    why: '$1/z$ sends the line $x = 1$ to a circle.',
    summit: '$1/z$ sends the line $x = 1$ to the circle $|w - 1/2| = 1/2$.',
    example: 'Example 2.24, page 76. On the line $x = 1$, $u = 1/(1+y^2)$ and $v = -y/(1+y^2)$, which is the circle $|w - 1/2| = 1/2$. At $0$, $1/z$ is not a point of the plane. Equation (2.32), page 74, sends it to $\\infty$, the north pole.',
    picture: mountReciprocal,
    next: null,
    sheet: [
      { text: 'On $x = a \\neq 0$, the centre is $1/(2a)$ and the radius is $|1/(2a)|$. Example 2.24, page 76.' },
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

  function dragged(id, row) {
    if (id === '2.4') return row.sawUpper === true && row.sawLower === true;
    return row.sawTrue === true && row.sawFalse === true;
  }

  function paint() {
    const done = CH2_STAGES.filter((id) => marks[id] === true).length;
    status.textContent = `${done} of ${CH2_STAGES.length} stages marked.`;
    for (const id of CH2_STAGES) {
      const node = path.querySelector(`[data-section="${id}"]`);
      const row = live[id];
      if (!node || !row) continue;
      const finished = marks[id] === true;
      const both = dragged(id, row);
      const earned = finished || (both && row.item);
      node.setAttribute('data-state', finished ? 'done' : 'ahead');
      row.waiting.hidden = earned;
      if (!earned) row.waiting.textContent = both ? 'Finish one practice card' : 'Drag until the sentence changes';
      row.summitLabel.hidden = !earned;
      row.summit.hidden = !earned;
      row.mark.hidden = !earned;
      row.mark.disabled = !earned;
      row.mark.setAttribute('aria-pressed', finished ? 'true' : 'false');
      row.mark.textContent = finished ? 'Marked' : 'Stage complete';
      if (row.go) row.go.hidden = !earned;
    }
  }

  for (const section of chapter.sections) {
    const copy = COPY[section.id];
    const scope = `chapter-section-${slug(section.id)}`;
    const row = { sawTrue: false, sawFalse: false, sawUpper: false, sawLower: false, item: false };
    live[section.id] = row;

    const why = h('p', { class: 'section-idea', id: `${scope}-why` });
    richLine(why, copy.why);
    const picture = h('div', { class: 'ch2-picture', id: `${scope}-picture` });
    stops.push(copy.picture(picture, {
      onClaim(spoken) {
        const side = spoken && typeof spoken === 'object' ? spoken.side : '';
        const holds = spoken === true || (spoken && spoken.holds === true);
        if (side === 'upper') row.sawUpper = true;
        else if (side === 'lower') row.sawLower = true;
        else if (holds) row.sawTrue = true;
        else if (!side) row.sawFalse = true;
        paint();
      },
    }));
    const example = h('p', { class: 'section-idea', id: `${scope}-example` });
    richLine(example, copy.example);
    const practice = h('div', {
      class: 'chapter-exercises', id: `${scope}-practice`, 'data-practice': '', 'data-section': section.id,
    });
    practice.append(h('p', { class: 'book-page' }, 'Practice is loading.'));
    const sheet = h('ul', { class: 'book-read', id: `${scope}-sheet`, hidden: '' });
    for (const line of copy.sheet || []) {
      const li = h('li');
      richLine(li, line.text);
      sheet.append(li);
    }
    const memBtn = h('button', {
      type: 'button', class: 'btn', id: `${scope}-memory-open`, 'aria-expanded': 'false', 'aria-controls': `${scope}-sheet`,
    }, 'Memory sheet');
    memBtn.addEventListener('click', () => {
      const open = memBtn.getAttribute('aria-expanded') === 'true';
      memBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
      sheet.hidden = open;
    });
    const summit = h('p', { class: 'ch2-summit', id: `${scope}-summit`, hidden: '' });
    richLine(summit, copy.summit);
    row.summit = summit;
    const summitLabel = h('h3', { class: 'book-label', id: `${scope}-summit-label`, hidden: '' }, 'Summit');
    row.summitLabel = summitLabel;
    const waiting = h('p', { class: 'book-page ch2-waiting', id: `${scope}-waiting` }, 'Drag until the sentence changes');
    row.waiting = waiting;
    const mark = h('button', {
      type: 'button', class: 'btn ch2-complete', id: `${scope}-complete`, 'data-stage': section.id,
      'aria-pressed': 'false', disabled: '', hidden: '',
    }, 'Stage complete');
    row.mark = mark;
    mark.addEventListener('click', () => {
      if (mark.disabled) return;
      marks = { ...marks, [section.id]: marks[section.id] !== true };
      saveChapter2Marks(store, marks);
      paint();
    });
    const go = copy.next
      ? h('a', {
        class: 'btn', id: `${scope}-next`, href: `#chapter-2-${slug(copy.next)}`, hidden: '',
      }, `Go to ${copy.next}`)
      : null;
    if (go) {
      go.addEventListener('click', () => {
        if (marks[section.id] === true) return;
        marks = { ...marks, [section.id]: true };
        saveChapter2Marks(store, marks);
        paint();
      });
    }
    row.go = go;
    const read = h('ul', { class: 'book-read', id: `${scope}-read` });
    copy.read.forEach((item, i) => {
      read.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
      }, item.pin)));
    });

    const done = h('div', { class: 'ch2-done', id: `${scope}-done` }, mark);
    if (go) done.append(go);

    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    },
      h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id),
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
      why,
      picture,
      h('h3', { class: 'book-label', id: `${scope}-worked` }, 'Worked'),
      example,
      h('h3', { class: 'book-label', id: `${scope}-faded` }, 'Practice'),
      practice,
      h('div', { class: 'ch2-memory-block', id: `${scope}-memory` }, memBtn, sheet),
      waiting,
      summitLabel,
      summit,
      done,
      h('h3', { class: 'book-label', id: `${scope}-pins` }, 'Further reading'),
      read));
  }

  paint();

  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back', class: 'book-tap' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 2. Complex Functions'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Five stages. Drag the green point. Purple is where it lands. Blue is the line or circle you test, and orange is the curve it maps to.'),
      sourceTag({ pin: 'Chapter 2, Complex Functions, page 43', href: sectionHref(S21) })),
    path,
    status,
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end', class: 'book-tap' }, 'Back to the book')));

  const restoring = Number.isFinite(ctx && ctx.restoreY);
  const restore = () => {
    if (restoring) window.scrollTo(0, ctx.restoreY);
  };

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
      }));
    }
    restore();
  }).catch(() => {
    if (!alive) return;
    for (const host of el.querySelectorAll('[data-practice]')) {
      host.replaceChildren(h('p', { class: 'book-page' }, 'The practice file did not load.'));
    }
    restore();
  });

  const target = focus ? el.querySelector(`#chapter-section-${slug(String(focus).split('.').slice(0, 2).join('.'))}`) : null;
  const exact = focus ? el.querySelector(`#chapter-section-${slug(focus)}`) : null;
  const node = exact || target;
  if (node && !restoring) {
    node.classList.add('is-target');
    node.scrollIntoView({ block: 'start' });
  }
  restore();

  return function unmount() {
    alive = false;
    for (const stop of stops) {
      try { if (typeof stop === 'function') stop(); } catch { /* the page is leaving */ }
    }
  };
}
