// Chapter 2 as a mountain. Stages 2.1–2.3 are walked. Stages 2.4 and 2.5 are titles.
// One drag per stage. Practice comes from data/practice/ch2.json.

import { sectionHref } from '../data/book.js';
import { bookChapter } from '../data/book-path.js';
import { loadChapter2Marks, saveChapter2Marks, CH2_STAGES } from '../book/ch2-progress.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountLinear, mountPower, mountLimit } from './ch2-picture.js';
import { mountPractice } from './ch2-practice.js';

const S21 = 'sec_functions-mappings.html';
const S22 = 'sec_z_n.html';
const S23 = 'sec_limits-continuity.html';
const S24 = 'sec_branches.html';
const S25 = 'sec_reciprocal-transformation.html';

const COPY = {
  '2.1': {
    why: 'Every later picture is a set moving. A linear map is the one you can name before you draw it: a turn, a stretch, then a slide.',
    summit: 'A linear map turns the plane, stretches it, and slides it, and a half-plane stays a half-plane.',
    example: 'Example 2.9, page 50. Multiplication by i turns the plane a quarter turn, and adding i lifts it by 1. The half-plane Re z ≥ 1 becomes the half-plane Im w ≥ 2.',
    picture: mountLinear,
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
    why: 'Powers move a ray by multiplying its angle. Roots, the exponential, and the Julia set all start from that.',
    summit: 'z^n multiplies angles by n, so a thin sector opens n times as wide.',
    example: 'Example 2.12, page 56, and Exercise 1(b), page 59. The line x = 2 goes to the parabola u = 4 − v²/16. The line x = −2 goes to that same parabola. On this picture, a point on x = 2 lands on the curve.',
    picture: mountPower,
    read: [
      { pin: 'Definition 2.1, principal square root, page 55', href: sectionHref(S22, 'sec_z_n-6') },
      { pin: 'Example 2.12, page 56', href: sectionHref(S22, 'fig_ch-02-13') },
      { pin: 'Definition 2.2, principal nth root, page 59', href: sectionHref(S22, 'def_principal_nth_root') },
      { pin: '§2.2, Exercise 1(b), page 59', href: sectionHref(S22, 'x2_2_1') },
    ],
  },
  '2.3': {
    why: 'A derivative is a limit. If two paths into the same point disagree, the limit is not there, and neither is the derivative.',
    summit: 'The limit exists only when every path agrees, which is the same as both real limits existing.',
    example: 'Example 2.16, page 62. For f(z) = conjugate(z), the distance to the limit equals the distance to z0, so δ = ε. The definition does not ask for the value at z0.',
    picture: mountLimit,
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
    stub: true,
    read: [
      { pin: 'A branch of a function, page 68', href: sectionHref(S24, 'sec_branches-2-5') },
      { pin: 'The branch cut along the negative real axis, page 68', href: sectionHref(S24, 'sec_branches') },
    ],
  },
  '2.5': {
    stub: true,
    read: [
      { pin: 'Section 2.5, page 72', href: sectionHref(S25) },
      { pin: 'Figure 2.22, the sphere, page 73', href: sectionHref(S25, 'fig_ch-02-22') },
    ],
  },
};

function slug(id) {
  return String(id).replace(/\./g, '-');
}

export function mount(el, ctx, focus) {
  const store = ctx.store;
  let marks = loadChapter2Marks(store);
  const chapter = bookChapter(2);
  const stops = [];
  let alive = true;

  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'chapter-next' }, 'Next');
  const path = h('ol', { class: 'chapter-path', id: 'chapter-path' });

  function nextId() {
    return CH2_STAGES.find((id) => marks[id] !== true) || null;
  }

  function paint() {
    const done = CH2_STAGES.filter((id) => marks[id] === true).length;
    const next = nextId();
    status.textContent = next
      ? `Next is ${next}. ${done} of ${CH2_STAGES.length} stages marked.`
      : `Done. ${done} of ${CH2_STAGES.length} stages. Sections 2.4 and 2.5 are titles.`;
    if (next && next !== '2.1') {
      nextBtn.hidden = false;
      nextBtn.textContent = `Go to ${next}`;
      nextBtn.dataset.jump = next;
    } else if (!next) {
      nextBtn.hidden = false;
      nextBtn.textContent = 'Back to the book';
      nextBtn.dataset.jump = 'book';
    } else {
      nextBtn.hidden = true;
      nextBtn.dataset.jump = '';
    }
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      if (id === '2.4' || id === '2.5') {
        node.setAttribute('data-state', 'ahead');
        continue;
      }
      const finished = marks[id] === true;
      node.setAttribute('data-state', finished ? 'done' : (next === id ? 'next' : 'ahead'));
      const btn = node.querySelector('[data-stage]');
      if (!btn) continue;
      btn.setAttribute('aria-pressed', finished ? 'true' : 'false');
      btn.textContent = finished ? 'Marked' : 'Stage complete';
    }
  }

  nextBtn.addEventListener('click', () => {
    const jump = nextBtn.dataset.jump;
    if (jump === 'book') {
      ctx.navigate('book');
      return;
    }
    const node = el.querySelector(`#chapter-section-${slug(jump)}`);
    if (node) node.scrollIntoView({ block: 'start' });
  });

  for (const section of chapter.sections) {
    const copy = COPY[section.id];
    const scope = `chapter-section-${slug(section.id)}`;
    const read = h('ul', { class: 'book-read', id: `${scope}-read` });
    (copy.read || []).forEach((item, i) => {
      read.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
      }, item.pin)));
    });
    const kids = [
      h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id),
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
    ];
    if (copy.stub) {
      kids.push(h('p', { class: 'section-idea', id: `${scope}-idea` }, 'Title and citations. The picture is a later batch.'));
      kids.push(read);
    } else {
      const why = h('p', { class: 'section-idea', id: `${scope}-why` });
      appendRich(why, copy.why);
      const picture = h('div', { class: 'ch2-picture', id: `${scope}-picture` });
      stops.push(copy.picture(picture));
      const example = h('p', { class: 'section-idea', id: `${scope}-example` });
      appendRich(example, copy.example);
      const summit = h('p', { class: 'ch2-summit', id: `${scope}-summit` });
      appendRich(summit, copy.summit);
      const practice = h('div', { class: 'chapter-exercises', id: `${scope}-practice`, 'data-practice': '', 'data-section': section.id });
      practice.append(h('p', { class: 'book-page' }, 'Practice is loading.'));
      const sheet = h('ul', { class: 'book-read', id: `${scope}-sheet` });
      const mark = h('button', {
        type: 'button', class: 'btn', id: `${scope}-complete`, 'data-stage': section.id, 'aria-pressed': 'false',
      }, 'Stage complete');
      mark.addEventListener('click', () => {
        marks = { ...marks, [section.id]: marks[section.id] === true ? false : true };
        saveChapter2Marks(store, marks);
        paint();
      });
      kids.push(
        why,
        picture,
        h('h3', { class: 'book-label', id: `${scope}-pins` }, 'Pinned'),
        read,
        h('h3', { class: 'book-label', id: `${scope}-worked` }, 'Worked'),
        example,
        h('h3', { class: 'book-label', id: `${scope}-faded` }, 'Practice'),
        practice,
        h('h3', { class: 'book-label', id: `${scope}-memory-label` }, 'Memory'),
        sheet,
        h('h3', { class: 'book-label', id: `${scope}-summit-label` }, 'Summit'),
        summit,
        h('div', { class: 'problem-actions' }, mark),
      );
    }
    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    }, ...kids));
  }

  paint();

  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 2. Complex Functions'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Five stages. Drag the green point. Purple is where it lands. Blue is the line or circle you test, and orange is the curve it maps to.'),
      sourceTag({ pin: 'Chapter 2, Complex Functions, page 43', href: sectionHref(S21) })),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status, nextBtn),
    path,
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  const url = new URL('../../data/practice/ch2.json', import.meta.url);
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }).then((items) => {
    if (!alive || !Array.isArray(items)) return;
    for (const host of el.querySelectorAll('[data-practice]')) {
      host.replaceChildren();
      stops.push(mountPractice(host, items, store));
      const section = host.dataset.section;
      const sheet = el.querySelector(`#chapter-section-${slug(section)}-sheet`);
      if (!sheet) continue;
      for (const item of items) {
        if (item.section !== section || item.kind !== 'flash' || !item.memory) continue;
        const li = h('li');
        richLine(li, item.memory);
        sheet.append(li);
      }
    }
  }).catch(() => {
    if (!alive) return;
    for (const host of el.querySelectorAll('[data-practice]')) {
      host.replaceChildren(h('p', { class: 'book-page' }, 'The practice file did not load.'));
    }
  });

  const target = focus ? el.querySelector(`#chapter-section-${slug(focus)}`) : null;
  if (target) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'start' });
  }

  return function unmount() {
    alive = false;
    for (const stop of stops) {
      try { if (typeof stop === 'function') stop(); } catch { /* the page is leaving */ }
    }
  };
}

function richLine(el, text) {
  appendRich(el, String(text).replace(/\\\(/g, '$').replace(/\\\)/g, '$'));
}
