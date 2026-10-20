// The Story Map. One through-line, the thread lines, and a door for every stop.

import { h } from '../core/dom.js';
import { cssVar, onThemeChange } from '../core/theme.js';
import {
  SITE, PARTS, STATIONS, PROBLEMS, stationPart, threadsOn, threadsToDraw, conceptsForMap,
  threadById, threadByToken, problemsOnStation, onThisMap, chooseHomePicture,
} from '../registry.js';
import { bindShapePointer, renderShape, shapeReadout, shapeSentence } from './shape.js';
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

function problemHash(id) {
  return `#problem-${String(id).replace(/\./g, '-')}`;
}

function drawMap(host, stations, threads, mapId, focusId) {
  const width = host.clientWidth || 360;
  const geom = layoutMap(stations.map((s) => ({ ...s, part: stationPart(s, mapId) })), width);
  const byId = new Map(geom.nodes.map((n) => [n.id, n]));
  const drawn = threadsToDraw(threads, stations, mapId);
  const root = svg('svg', {
    viewBox: `0 0 ${geom.width} ${geom.height}`,
    role: 'navigation',
    'aria-label': 'Story map',
  });
  if (focusId) root.setAttribute('data-focus', focusId);

  drawn.forEach((thread, k) => {
    const lane = (k - (drawn.length - 1) / 2) * 7;
    const members = stations
      .filter((s) => threadsOn(s, mapId).includes(thread.id))
      .sort((a, b) => a.order - b.order);
    if (members.length < 2) return;
    const seq = members.map((s) => byId.get(s.id)).filter(Boolean);
    const d = seq.map((n, i) => `${i ? 'L' : 'M'}${n.x.toFixed(1)} ${(n.y + lane).toFixed(1)}`).join('');
    const path = svg('path', {
      class: 'map-thread',
      d,
      'data-thread': thread.id,
      'data-tone': thread.tone || 'accent',
      'data-mark': thread.mark || 'disc',
      'data-stops': members.map((s) => s.id).join(' '),
    });
    if (focusId) path.setAttribute('data-on-focus', thread.id === focusId ? 'true' : 'false');
    root.append(path);
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
    const onFocus = !focusId || threadsOn(s, mapId).includes(focusId);
    const link = svg('a', { href: `#${s.id}`, class: 'map-node' });
    if (focusId) link.setAttribute('data-on-focus', onFocus ? 'true' : 'false');
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
    problemsOnStation(s).slice(0, 3).forEach((p, j) => {
      const dot = svg('a', { href: problemHash(p.id), class: 'map-problem' });
      if (focusId) dot.setAttribute('data-on-focus', onFocus ? 'true' : 'false');
      dot.append(svg('circle', {
        class: 'map-problem-dot',
        cx: n.x + 26 + j * 12,
        cy: n.y - 2,
        r: 4,
      }));
      dot.append(svg('title', {}, String(p.id)));
      root.append(dot);
    });
  }
  host.replaceChildren(root);
}

function homePicture(station) {
  return chooseHomePicture(station, STATIONS);
}

function shapeVizForHome(station) {
  const viz = { ...(station && station.viz ? station.viz : {}) };
  delete viz.presets;
  delete viz.picture;
  if (viz.action || viz.samples) return viz;
  const donor = STATIONS.find((s) => s.visualization === 'shape' && s.viz && (s.viz.action || s.viz.samples));
  if (!donor) return { action: 'shear', min: 0, max: 1, start: 0, ...viz };
  const copy = { ...donor.viz, ...viz };
  delete copy.presets;
  delete copy.picture;
  return copy;
}

export function searchHome(query, items) {
  const q = String(query || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!q) return [];
  const compact = q.replace(/\s+/g, '');
  const scored = [];
  for (const it of items) {
    const id = String(it.id).toLowerCase();
    const text = String(it.text || '').toLowerCase();
    let score = 0;
    if (id === q || id === compact) score = 100;
    else if (id.startsWith(compact)) score = 70;
    else if (text.includes(q)) score = 40;
    else {
      const toks = q.split(' ').filter(Boolean);
      if (toks.length && toks.every((t) => text.includes(t) || id.includes(t))) score = 20;
    }
    if (score) scored.push({ it, score });
  }
  scored.sort((a, b) => b.score - a.score || String(a.it.id).localeCompare(String(b.it.id)));
  return scored.slice(0, 8).map((row) => row.it);
}

function finderItems(ctx) {
  const items = [];
  for (const s of ctx.stations || []) {
    if (!s || s.kind === 'map' || s.kind === 'flashcards' || s.kind === 'practice') continue;
    items.push({
      kind: 'stop',
      id: s.id,
      href: `#${s.id}`,
      text: `${s.title || ''} ${s.summary || ''} ${s.id}`,
      label: s.title || s.id,
    });
  }
  for (const c of conceptsForMap(ctx.map)) {
    items.push({
      kind: 'topic',
      id: c.id,
      href: `#topic-${String(c.id).replace(/\./g, '-')}`,
      text: `${c.title || ''} ${c.id}`,
      label: c.title || c.id,
    });
  }
  for (const p of PROBLEMS) {
    if (!onThisMap(p, ctx.map)) continue;
    const plain = String(p.statement || '').replace(/[$\\{}]/g, ' ').replace(/\s+/g, ' ').trim();
    items.push({
      kind: 'problem',
      id: p.id,
      href: `#problem-${String(p.id).replace(/\./g, '-')}`,
      text: `${p.id} ${plain}`,
      label: plain.slice(0, 90) || p.id,
    });
  }
  return items;
}

function finderBlock(ctx) {
  const items = finderItems(ctx);
  const input = h('input', {
    type: 'search',
    id: 'home-finder',
    placeholder: 'A problem number, or a word',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-controls': 'home-finder-results',
  });
  const results = h('ul', { class: 'finder-results', id: 'home-finder-results' });
  const status = h('p', { class: 'home-finder-status', id: 'home-finder-status', role: 'status' });
  let cursor = -1;
  const paint = () => {
    const found = searchHome(input.value, items);
    cursor = -1;
    results.replaceChildren();
    if (!String(input.value || '').trim()) {
      status.textContent = '';
      return;
    }
    status.textContent = found.length ? `${found.length} matches` : 'Nothing under that name on this map.';
    found.forEach((it, i) => {
      const link = h('a', { href: it.href, id: `home-finder-hit-${i}` },
        h('span', { class: 'fr-kind', text: it.kind }),
        h('span', { class: 'fr-label', text: `${it.id} · ${it.label}` }));
      results.append(h('li', { class: 'finder-result' }, link));
    });
  };
  const mark = () => {
    const links = [...results.querySelectorAll('a')];
    links.forEach((a, i) => a.setAttribute('aria-selected', i === cursor ? 'true' : 'false'));
    if (cursor >= 0 && links[cursor]) input.setAttribute('aria-activedescendant', links[cursor].id);
    else input.removeAttribute('aria-activedescendant');
  };
  input.addEventListener('input', paint);
  input.addEventListener('keydown', (ev) => {
    const links = [...results.querySelectorAll('a')];
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (!links.length) return;
      ev.preventDefault();
      if (ev.key === 'ArrowDown') cursor = Math.min(links.length - 1, cursor + 1);
      else cursor = cursor <= 0 ? 0 : cursor - 1;
      mark();
      return;
    }
    if (ev.key === 'Enter') {
      const pick = links[cursor] || links[0];
      if (!pick) return;
      ev.preventDefault();
      pick.click();
    }
  });
  return h('section', { class: 'panel', id: 'home-finder-panel' },
    h('h2', { class: 'panel-title', id: 'home-finder-title', text: 'Find a stop or a problem' }),
    h('div', { class: 'field home-finder-field' },
      h('label', { for: 'home-finder', text: 'Type a problem number or a word' }),
      input),
    status,
    results);
}

function mountHomePicture(station) {
  const viz = station.viz || {};
  const picture = homePicture(station);
  const frame = h('div', { class: 'plane-frame plane-frame-home', id: 'home-dot-frame' });
  const canvas = h('canvas', {
    id: 'home-dot',
    tabindex: '0',
    role: 'application',
    'aria-label': picture === 'point'
      ? 'One point. Drag it. Arrow keys move it. Blue drops say where it sits. The orange ray says how to reach it.'
      : picture === 'shape'
        ? 'One square. Drag the track. Arrow keys move the parameter. Green is the input. Purple is the image. There are no chips.'
        : 'One point on a line. Drag it. Arrow keys move it.',
  });
  frame.append(canvas);
  const readout = h('p', { class: 'readout', id: 'home-readout' });
  const note = h('p', { class: 'lede', id: 'home-dot-sentence' });
  const node = h('section', { class: 'panel', id: 'home-dot-panel' },
    h('h2', { class: 'panel-title', text: picture === 'shape' ? 'The square' : 'One point' }),
    frame,
    h('p', { class: 'muted', text: station.observe || (picture === 'shape'
      ? 'Drag the track. Green is the square you started with. Purple is where the matrix sends it. No chips.'
      : 'Drag the dot. This is the only control on it.') }),
    readout,
    note);
  const c2d = canvas.getContext('2d');
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const calm = viz.sentence || (picture === 'point'
    ? 'Drag the point. Blue is where it sits. Orange is how you reach it.'
    : 'Drag the point. It is the number.');

  if (picture === 'shape') {
    const viz = shapeVizForHome(station);
    const min = Number.isFinite(viz.min) ? viz.min : 0;
    const state = { t: Number.isFinite(viz.start) ? viz.start : min };
    const paint = () => {
      const w = canvas.clientWidth || 640;
      const hgt = canvas.clientHeight || 220;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(hgt * dpr);
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      const facts = renderShape(c2d, w, hgt, viz, state.t);
      readout.textContent = shapeReadout(state.t, facts);
      note.textContent = shapeSentence(viz, state.t, facts);
    };
    cleanups.push(bindShapePointer(canvas, state, viz, paint));
    on(window, 'resize', paint);
    cleanups.push(onThemeChange(paint));
    paint();
    return { node, cleanup: () => { for (const fn of cleanups) fn(); } };
  }

  if (picture === 'line') {
    const min = Number.isFinite(viz.min) ? viz.min : -2;
    const max = Number.isFinite(viz.max) ? viz.max : 2;
    const span = max - min || 1;
    const state = { x: Number.isFinite(viz.start) ? viz.start : 0 };
    const lineClaim = (x) => {
      const claim = viz.claim;
      if (!claim || typeof claim.whenTrue !== 'string' || typeof claim.whenFalse !== 'string') return calm;
      const v = Number(claim.value);
      const tol = Number.isFinite(claim.tol) ? claim.tol : 1e-6;
      let holds = false;
      if (claim.op === 'gt') holds = x > v;
      else if (claim.op === 'lt') holds = x < v;
      else if (claim.op === 'eq') holds = Math.abs(x - v) <= tol;
      else return calm;
      return holds ? claim.whenTrue : claim.whenFalse;
    };
    const paint = () => {
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 220;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      c2d.fillStyle = cssVar('--surface') || '#fff';
      c2d.fillRect(0, 0, w, h);
      const y = h * 0.55;
      const pad = 28;
      const xOf = (t) => pad + ((t - min) / span) * (w - pad * 2);
      c2d.strokeStyle = cssVar('--text-muted') || '#515b6c';
      c2d.lineWidth = 1.6;
      c2d.beginPath();
      c2d.moveTo(pad, y);
      c2d.lineTo(w - pad, y);
      c2d.stroke();
      const x = xOf(Math.min(max, Math.max(min, state.x)));
      c2d.fillStyle = cssVar('--input') || '#006e53';
      c2d.beginPath();
      c2d.arc(x, y, 8, 0, Math.PI * 2);
      c2d.fill();
      readout.textContent = `x = ${state.x.toFixed(3)}`;
      note.textContent = lineClaim(state.x);
    };
    const setFromEvent = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const pad = 28;
      const t = (ev.clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2);
      state.x = Math.min(max, Math.max(min, min + t * span));
      paint();
    };
    on(canvas, 'pointerdown', (ev) => {
      canvas.setPointerCapture(ev.pointerId);
      setFromEvent(ev);
    });
    on(canvas, 'pointermove', (ev) => {
      if (canvas.hasPointerCapture(ev.pointerId)) setFromEvent(ev);
    });
    on(canvas, 'keydown', (ev) => {
      const step = (ev.shiftKey ? 0.5 : 0.1) * (span / 4);
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      state.x = Math.min(max, Math.max(min, state.x + (ev.key === 'ArrowLeft' ? -step : step)));
      paint();
    });
    on(window, 'resize', paint);
    cleanups.push(onThemeChange(paint));
    paint();
    return { node, cleanup: () => { for (const fn of cleanups) fn(); } };
  }

  const start = viz.start && Number.isFinite(Number(viz.start.re)) ? viz.start : { re: 1, im: 1 };
  const state = { z: { re: Number(start.re) || 0, im: Number(start.im) || 0 } };
  // ±2.5 on the short side, so −1 + i√3 (about 1.73 up) stays on the picture.
  const frameOf = (w, h) => {
    const half = 2.5;
    const scale = Math.min(w, h) / (2 * half);
    const margin = 0.28;
    return {
      scale,
      limit: {
        re: Math.max(half * 0.5, w / 2 / scale - margin),
        im: Math.max(half * 0.5, h / 2 / scale - margin),
      },
    };
  };
  const clampPoint = (z, limit) => ({
    re: Math.min(limit.re, Math.max(-limit.re, z.re)),
    im: Math.min(limit.im, Math.max(-limit.im, z.im)),
  });
  const paint = () => {
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 220;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    c2d.fillStyle = cssVar('--surface') || '#fff';
    c2d.fillRect(0, 0, w, h);
    const frame = frameOf(w, h);
    state.z = clampPoint(state.z, frame.limit);
    const { scale } = frame;
    const toPx = (z) => [w / 2 + z.re * scale, h / 2 - z.im * scale];
    c2d.strokeStyle = cssVar('--text-muted') || '#515b6c';
    c2d.lineWidth = 1.3;
    c2d.beginPath();
    c2d.moveTo(0, h / 2);
    c2d.lineTo(w, h / 2);
    c2d.moveTo(w / 2, 0);
    c2d.lineTo(w / 2, h);
    c2d.stroke();
    c2d.save();
    c2d.setLineDash([6, 5]);
    c2d.strokeStyle = cssVar('--seam') || '#6b7384';
    c2d.beginPath();
    c2d.moveTo(0, h / 2);
    c2d.lineTo(w / 2, h / 2);
    c2d.stroke();
    c2d.restore();
    const [px, py] = toPx(state.z);
    c2d.save();
    c2d.setLineDash([5, 4]);
    c2d.strokeStyle = cssVar('--cart') || '#0b63ad';
    c2d.lineWidth = 1.8;
    c2d.beginPath();
    c2d.moveTo(px, py);
    c2d.lineTo(px, h / 2);
    c2d.moveTo(px, py);
    c2d.lineTo(w / 2, py);
    c2d.stroke();
    c2d.restore();
    c2d.strokeStyle = cssVar('--polar') || '#a84300';
    c2d.lineWidth = 2.2;
    c2d.beginPath();
    c2d.moveTo(w / 2, h / 2);
    c2d.lineTo(px, py);
    c2d.stroke();
    c2d.fillStyle = cssVar('--input') || '#006e53';
    c2d.beginPath();
    c2d.arc(px, py, 7, 0, Math.PI * 2);
    c2d.fill();
    const r = Math.hypot(state.z.re, state.z.im);
    const theta = r < 1e-9 ? null : Math.atan2(state.z.im, state.z.re);
    const onCut = state.z.re < -0.05 && Math.abs(state.z.im) <= 0.04;
    const fmt = (n) => (Object.is(n, -0) ? '0.000' : n.toFixed(3));
    readout.textContent = `x = ${fmt(state.z.re)}, y = ${fmt(state.z.im)}, r = ${fmt(r)}, angle = ${theta == null ? 'none' : fmt(theta)}`;
    note.textContent = onCut
      ? 'This point is on the negative real axis. Cross it and the angle jumps between π and −π. The point does not.'
      : calm;
  };
  const setFromEvent = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const frame = frameOf(rect.width, rect.height);
    state.z = clampPoint({
      re: (ev.clientX - rect.left - rect.width / 2) / frame.scale,
      im: (rect.height / 2 - (ev.clientY - rect.top)) / frame.scale,
    }, frame.limit);
    paint();
  };
  on(canvas, 'pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    setFromEvent(ev);
  });
  on(canvas, 'pointermove', (ev) => {
    if (canvas.hasPointerCapture(ev.pointerId)) setFromEvent(ev);
  });
  on(canvas, 'keydown', (ev) => {
    const step = ev.shiftKey ? 0.5 : 0.1;
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[ev.key];
    if (!move) return;
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const frame = frameOf(rect.width || canvas.clientWidth || 640, rect.height || canvas.clientHeight || 220);
    state.z = clampPoint({ re: state.z.re + move[0] * step, im: state.z.im + move[1] * step }, frame.limit);
    paint();
  });
  on(window, 'resize', paint);
  cleanups.push(onThemeChange(paint));
  paint();
  return { node, cleanup: () => { for (const fn of cleanups) fn(); } };
}

export function mount(section, ctx) {
  const station = ctx.station;
  const lede = (SITE.ledeByMap && SITE.ledeByMap[ctx.map]) || SITE.throughline || station.summary;
  const headerStation = { ...station, summary: lede };
  section.append(stationHeader(headerStation, ctx));

  if (ctx.stations && MAPS_NEED_SWITCH(ctx)) section.append(mapSwitch(ctx));
  section.append(finderBlock(ctx));
  const picture = mountHomePicture(station);
  section.append(picture.node);

  const drawn = threadsToDraw(ctx.threads, ctx.stations, ctx.map);
  const token = ctx.preset && ctx.preset.kind === 'token' ? ctx.preset.token : '';
  const named = threadByToken(token);
  const focus = named && drawn.some((t) => t.id === named.id) ? named : null;
  if (drawn.length) {
    const legend = h('ul', { class: 'legend', id: 'home-legend' });
    for (const t of drawn) {
      const link = h('a', {
        href: `#home-${t.id}`,
        'data-thread': t.id,
      }, h('i', {
        class: 'thread-dot',
        'data-thread': t.id,
        'data-tone': t.tone || 'accent',
        'data-mark': t.mark || 'disc',
        'aria-hidden': 'true',
      }), threadById(t.id) ? `${t.id} · ${t.title}` : t.id);
      if (focus && focus.id === t.id) link.setAttribute('aria-current', 'true');
      legend.append(h('li', {}, link));
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
    drawMap(host, ctx.stations, ctx.threads, ctx.map, focus ? focus.id : '');
  };
  paint();
  const ro = new ResizeObserver(paint);
  ro.observe(host);
  return () => {
    ro.disconnect();
    picture.cleanup();
  };
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
