// js/stations/home-test2.js — the Test 2 front page. Home stays one route (#home);
// app.js decides which map is showing, and home.js hands Test 2 to this mount.
//
// Two stops, and that is the page. A topic link still opens its station, but this
// page does not list topics: a topic does not change the picture.

import { stationsForMap } from '../registry.js';
import { mapSwitch } from './map-switch.js';

const CSS = `
.test2-home-list { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--space-3); }
.test2-place { border-top: 4px solid var(--tone, var(--border-strong)); }
.test2-place h3 { margin: 0 0 var(--space-2); }
.test2-place p { margin: 0; }
.test2-place a { color: inherit; }
`;

// The three-line plan, folded into the two stops. Julia gets the first line.
// Newton gets the other two, as one paragraph.
const STOP_TEXT = {
  julia: 'Leave c at 0 and see the disk. Then drag c until the disk is no longer a disk, and say what c is.',
  newton: 'Leave the roots at the three cube roots of 1. Drag the green guess and watch its walk reach a root. Then drag a root. The colour that belongs to that root moves with it. That colour is its basin.',
};

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

export function mountTest2Home(el, ctx) {
  const style = document.createElement('style');
  style.setAttribute('data-for', 'home-test2');
  style.textContent = CSS;
  document.head.appendChild(style);

  const places = stationsForMap('test2').filter((s) => s.id !== 'home').sort((a, b) => a.order - b.order);

  const header = h('header', { class: 'station-header' },
    mapSwitch(ctx, 'home-which'),
    h('h1', null, 'Test 2'),
    h('p', { class: 'station-lede' },
      'Two pictures. A point is a place you can start. The colour says what one rule does if you start there. Drag the rule and the colours move.'));

  const list = h('ol', { class: 'test2-home-list', id: 'home-test2-places' });
  for (const st of places) {
    list.append(h('li', null,
      h('article', { class: 'panel test2-place', id: `home-place-${st.id}` },
        h('h3', null,
          h('span', { class: 'home-spine-num' }, String(st.order)),
          ' ',
          h('a', { id: `home-open-${st.id}`, href: `#${st.id}` }, st.title)),
        h('p', null, STOP_TEXT[st.id] || st.summary))));
  }

  el.append(header, list);

  return function unmount() {
    style.remove();
  };
}
