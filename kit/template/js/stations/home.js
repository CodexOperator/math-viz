// The Story Map. One through-line, the thread lines, and a door for every stop.

import { h } from '../core/dom.js';
import {
  SITE, PARTS, stationPart, threadsOn, threadsToDraw, conceptsForMap, threadById,
} from '../registry.js';
import { stationHeader } from '../components/chrome.js';

const SVG = 'http://www.w3.org/2000/svg';

function svg(name, attrs, ...kids) {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) node.setAttribute(k, String(v));
  for (const c of kids.flat()) if (c) node.append(c);
  return node;
}

function wrapLabel(text, max = 22) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) {
    const keep = lines.slice(0, 3);
    keep[2] = `${keep[2].slice(0, Math.max(1, max - 1))}…`;
    return keep;
  }
  return lines;
}

export function layoutMap(stations, width) {
  const list = [...stations].sort((a, b) => a.order - b.order);
  const W = Math.max(280, Math.round(Number(width) || 360));
  const wide = W >= 720;
  const cols = wide ? 4 : 1;
  const padX = 24;
  const top = 28;
  const pitchY = wide ? 132 : 78;
  const colW = (W - padX * 2) / cols;
  const nodes = list.map((s, i) => {
    const row = Math.floor(i / cols);
    const c = i % cols;
    const serpentine = wide && row % 2 === 1;
    const col = serpentine ? cols - 1 - c : c;
    return {
      id: s.id,
      order: s.order,
      part: s.part,
      title: s.title,
      index: i,
      x: padX + colW * (col + 0.5),
      y: top + pitchY * row + 36,
    };
  });
  const rows = Math.max(1, Math.ceil(list.length / cols) || 1);
  const height = top + pitchY * Math.max(0, rows - 1) + 100;
  return { width: W, height, nodes, wide };
}

function drawMap(host, stations, threads, mapId) {
  const width = host.clientWidth || 360;
  const geom = layoutMap(stations.map((s) => ({ ...s, part: stationPart(s, mapId) })), width);
  const byId = new Map(geom.nodes.map((n) => [n.id, n]));
  const drawn = threadsToDraw(threads, stations, mapId);
  const root = svg('svg', {
    viewBox: `0 0 ${geom.width} ${geom.height}`,
    role: 'navigation',
    'aria-label': 'Story map',
  });

  drawn.forEach((thread, k) => {
    const lane = (k - (drawn.length - 1) / 2) * 7;
    const members = stations
      .filter((s) => threadsOn(s, mapId).includes(thread.id))
      .sort((a, b) => a.order - b.order);
    if (members.length < 2) return;
    const first = members[0].order;
    const last = members[members.length - 1].order;
    const seq = geom.nodes.filter((n) => n.order >= first && n.order <= last);
    const d = seq.map((n, i) => `${i ? 'L' : 'M'}${n.x.toFixed(1)} ${(n.y + lane).toFixed(1)}`).join('');
    root.append(svg('path', {
      class: 'map-thread',
      d,
      'data-tone': thread.tone || 'accent',
      'data-mark': thread.mark || 'disc',
    }));
  });

  const seenPart = new Set();
  for (const s of [...stations].sort((a, b) => a.order - b.order)) {
    const n = byId.get(s.id);
    if (!n) continue;
    const part = stationPart(s, mapId);
    if (part && !seenPart.has(part)) {
      seenPart.add(part);
      const meta = PARTS[part] || { title: part, note: '' };
      root.append(svg('text', {
        class: 'map-part',
        x: geom.wide ? n.x : 16,
        y: n.y - 30,
        'text-anchor': geom.wide ? 'middle' : 'start',
      }, `${part} · ${meta.title}`));
    }
    const link = svg('a', { href: `#${s.id}`, class: 'map-node' });
    link.append(svg('rect', {
      class: 'map-hit',
      x: n.x - (geom.wide ? 70 : 120),
      y: n.y - 22,
      width: geom.wide ? 140 : 240,
      height: 70,
    }));
    link.append(svg('rect', { class: 'map-pill', x: n.x - 16, y: n.y - 16, width: 32, height: 28, rx: 8 }));
    link.append(svg('text', { class: 'map-num', x: n.x, y: n.y + 3 }, s.order === 0 ? '·' : String(s.order)));
    const label = svg('text', { class: 'map-label', y: n.y + 28 });
    wrapLabel(s.title, geom.wide ? 18 : 28).forEach((line, i) => {
      label.append(svg('tspan', { x: n.x, dy: i === 0 ? 0 : 14 }, line));
    });
    const title = svg('title', {}, s.title);
    link.append(label, title);
    root.append(link);
  }
  host.replaceChildren(root);
}

export function mount(section, ctx) {
  const station = ctx.station;
  const lede = (SITE.ledeByMap && SITE.ledeByMap[ctx.map]) || SITE.throughline || station.summary;
  const headerStation = { ...station, summary: lede };
  section.append(stationHeader(headerStation, ctx));

  if (ctx.stations && MAPS_NEED_SWITCH(ctx)) section.append(mapSwitch(ctx));

  const drawn = threadsToDraw(ctx.threads, ctx.stations, ctx.map);
  if (drawn.length) {
    const legend = h('ul', { class: 'legend', id: 'home-legend' });
    for (const t of drawn) {
      legend.append(h('li', {}, h('i', {
        class: 'thread-dot',
        'data-thread': t.id,
        'data-tone': t.tone || 'accent',
        'data-mark': t.mark || 'disc',
        'aria-hidden': 'true',
      }), threadById(t.id) ? `${t.id} · ${t.title}` : t.id));
    }
    section.append(legend);
  }

  const concepts = conceptsForMap(ctx.map);
  if (concepts.length >= 6) {
    const row = h('div', { class: 'chips topic-row', id: 'home-topics', role: 'group', 'aria-label': 'Topics' });
    for (const c of concepts) {
      row.append(h('a', { class: 'chip', href: `#topic-${String(c.id).replace(/\./g, '-')}`, 'data-topic': c.id }, c.title || c.id));
    }
    section.append(h('section', { class: 'panel', id: 'home-topic-panel' }, h('h2', { class: 'panel-title', text: 'Find a topic' }), row));
  }

  const host = h('div', { class: 'story-map panel', id: 'home-map' });
  section.append(host);
  let lastW = -1;
  const paint = () => {
    const w = Math.round(host.clientWidth || 0);
    if (w === lastW && host.querySelector('svg')) return;
    lastW = w;
    drawMap(host, ctx.stations, ctx.threads, ctx.map);
  };
  paint();
  const ro = new ResizeObserver(paint);
  ro.observe(host);
  return () => ro.disconnect();
}

function MAPS_NEED_SWITCH(ctx) {
  return Array.isArray(ctx.siteMaps) ? ctx.siteMaps.length > 1 : false;
}

function mapSwitch(ctx) {
  const row = h('div', { class: 'map-switch', id: 'home-map-switch', role: 'group', 'aria-label': 'Which map' });
  for (const m of ctx.siteMaps) {
    const b = h('button', {
      type: 'button',
      class: 'chip',
      'data-map': m.id,
      'aria-pressed': m.id === ctx.map ? 'true' : 'false',
      title: m.note || '',
    }, m.title);
    b.addEventListener('click', () => ctx.chooseMap(m.id));
    row.append(b);
  }
  return h('div', { class: 'map-switch-block' }, h('p', { class: 'map-switch-label', text: 'Which map' }), row);
}
