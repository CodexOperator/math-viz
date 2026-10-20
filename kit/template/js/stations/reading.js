// A stop whose picture is not in the starter yet.
// The page still says what to look at, cites the source, and sits on the map.
// It does not pretend a widget is there.

import { h } from '../core/dom.js';
import { problemById } from '../registry.js';
import { stationHeader, stationFooter, onTheMap } from '../components/chrome.js';
import { problemCard } from '../components/practice-card.js';

export function mount(section, ctx) {
  const station = ctx.station;
  section.append(stationHeader(station, ctx));
  if (station.observe) {
    section.append(h('section', { class: 'panel', id: `${station.id}-observe`, 'data-tone': 'input' },
      h('h2', { class: 'panel-title', text: 'Look at this' }),
      h('p', { class: 'lede', text: station.observe })));
  }
  section.append(onTheMap(station, ctx));
  const ids = station.problems || [];
  const problems = ids.map((id) => problemById(id)).filter(Boolean);
  if (problems.length) {
    const deck = h('div', { class: 'stack', id: `${station.id}-problems` });
    deck.append(h('h2', { class: 'panel-title', text: 'Practice on this stop' }));
    for (const p of problems) {
      const open = ctx.preset && ctx.preset.kind === 'problem' && ctx.preset.id === p.id;
      deck.append(problemCard(p, { hintOpen: open, showStation: false }));
    }
    section.append(deck);
  }
  const foot = stationFooter(station, ctx);
  if (foot) section.append(foot);
}
