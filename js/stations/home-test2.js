// js/stations/home-test2.js — the Test 2 front page. Home stays one route (#home);
// app.js decides which map is showing, and home.js hands Test 2 to this mount.
//
// Plain DOM. No innerHTML. The Test 1 map, finder and night-before plan are not built here.

import { stationsForMap, threadsForMap, threadLabel } from '../registry.js';
import { TEST2_TOPICS } from '../data/test2.js';
import { prose } from '../core/katex.js';
import { mapSwitch } from './map-switch.js';

const CSS = `
.test2-home-list { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--space-3); }
.test2-place { border-top: 4px solid var(--tone, var(--border-strong)); }
.test2-place h3 { margin: 0 0 var(--space-2); }
.test2-place p { margin: 0 0 var(--space-3); }
.test2-plan { margin: 0; padding-left: 1.4rem; display: grid; gap: var(--space-3); }
.test2-plan .chips { margin-top: var(--space-1); }
`;

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}

function proseEl(tag, attrs, text) {
  const n = h(tag, attrs);
  prose(n, text);
  return n;
}

export function mountTest2Home(el, ctx) {
  const style = document.createElement('style');
  style.setAttribute('data-for', 'home-test2');
  style.textContent = CSS;
  document.head.appendChild(style);

  const places = stationsForMap('test2').filter((s) => s.id !== 'home').sort((a, b) => a.order - b.order);
  const thread = threadsForMap('test2')[0];

  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'Story thread' });
  if (thread) {
    badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': thread.id, title: thread.summary }, threadLabel(thread))));
  }

  const header = h('header', { class: 'station-header' },
    mapSwitch(ctx, 'home-map'),
    h('h1', null, 'Test 2'),
    h('p', { class: 'station-lede' },
      'Two pictures. A point is a place you can start. The colour says what one rule does if you start there. Drag the rule and the colours move.'),
    badges,
    h('div', { class: 'row' },
      h('a', { class: 'btn btn-primary', id: 'home-start', href: '#julia' }, 'Start with Julia sets')));

  const topicChips = h('div', { class: 'chips', id: 'home-topics', role: 'group', 'aria-label': 'Topics on Test 2' });
  for (const t of TEST2_TOPICS) {
    topicChips.append(h('a', {
      class: 'chip',
      href: `#topic-${t.id}`,
      id: `home-topic-${t.id}`,
      title: t.summary,
    }, `${t.id} ${t.title}`));
  }
  const topicPanel = h('section', { class: 'panel', id: 'home-topics-panel', 'aria-labelledby': 'home-topics-title' },
    h('h2', { id: 'home-topics-title' }, 'Pick a topic'),
    h('p', { class: 'muted' }, 'These are the Test 2 topics. Choose one to open the picture that teaches it.'),
    topicChips);

  const list = h('ol', { class: 'test2-home-list', id: 'home-test2-places' });
  for (const st of places) {
    const topics = TEST2_TOPICS.filter((t) => t.station === st.id);
    const chips = h('div', { class: 'chips' });
    for (const t of topics) {
      chips.append(h('a', { class: 'chip', href: `#topic-${t.id}`, id: `home-place-${st.id}-topic-${t.id}` }, t.title));
    }
    list.append(h('li', null,
      h('article', { class: 'panel test2-place', id: `home-place-${st.id}`, 'data-thread': 'F1' },
        h('h3', null, h('span', { class: 'home-spine-num' }, String(st.order)), ' ', st.title),
        h('p', null, st.summary),
        chips,
        h('div', { class: 'row' }, h('a', { class: 'btn', id: `home-open-${st.id}`, href: `#${st.id}` }, 'Open this place')))));
  }
  const mapPanel = h('section', { class: 'panel', id: 'home-map-panel', 'aria-labelledby': 'home-map-title' },
    h('h2', { id: 'home-map-title' }, 'The map'),
    h('p', { class: 'muted' }, 'Two stops, in order. Both use the same idea: the colour of a point is the fate of the walk that starts there.'),
    list);

  const plan = h('ol', { class: 'test2-plan', id: 'home-plan-list' });
  plan.append(
    h('li', { id: 'home-plan-1' }, 'Open Julia sets. Leave c at 0 and see the disk. Then drag c until the disk is no longer a disk, and say what c is.'),
    h('li', { id: 'home-plan-2' }, 'Open Newton. Leave the roots at the three cube roots of 1. Drag the green guess and watch its walk reach a root.'),
    h('li', { id: 'home-plan-3' }, 'Drag a root. The colour that belongs to that root moves with it. That colour is its basin.'));
  const planPanel = h('section', { class: 'panel', id: 'home-plan', 'aria-labelledby': 'home-plan-title' },
    h('h2', { id: 'home-plan-title' }, 'A short way through'),
    plan);

  const note = proseEl('p', { class: 'muted' }, 'Blue, orange and purple are the colours of the roots on the Newton picture. Green is a point you drag. The same colours are named in the colour key on each place.');

  const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  if (places[0]) {
    links.append(h('a', { class: 'station-link', href: `#${places[0].id}`, 'data-dir': 'next', id: 'home-link-next' }, places[0].title));
  }

  el.append(header, topicPanel, mapPanel, planPanel, note, links);

  return function unmount() {
    style.remove();
  };
}
