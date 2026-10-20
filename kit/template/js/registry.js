// Routes, threads, and lookups. Pure data in generated/data.js. No DOM.

import { DATA } from './generated/data.js';

export const SITE = DATA.site;
export const MAPS = DATA.maps;
export const PARTS = DATA.parts || {};
export const THREADS = DATA.threads || [];
export const STATIONS = DATA.stations || [];
export const COLOUR_KEYS = DATA.colourKeys || {};
export const PROBLEMS = DATA.problems || [];
export const FLASHCARDS = DATA.flashcards || [];
export const CONCEPTS = DATA.concepts || [];
export const MAP_STORAGE_KEY = 'map';

const firstMapId = () => (MAPS[0] && MAPS[0].id) || 'main';

export function normalizeMapId(id) {
  return MAPS.some((m) => m.id === id) ? id : firstMapId();
}

export function mapOf(station) {
  if (!station || station.map == null) return firstMapId();
  if (station.map === 'shared') return 'shared';
  if (MAPS.some((m) => m.id === station.map)) return station.map;
  return firstMapId();
}

export function stationPart(station, mapId) {
  if (!station) return '';
  if (station.partByMap && Object.prototype.hasOwnProperty.call(station.partByMap, mapId)) return station.partByMap[mapId];
  return station.part || '';
}

export function threadsOn(station, mapId) {
  if (!station) return [];
  if (station.threadsByMap && Object.prototype.hasOwnProperty.call(station.threadsByMap, mapId)) return station.threadsByMap[mapId];
  return station.threads || [];
}

export function stationsForMap(mapId, stations = STATIONS) {
  const id = normalizeMapId(mapId);
  return stations.filter((s) => {
    const m = s.map || firstMapId();
    return m === 'shared' || m === id;
  });
}

export function threadsForMap(mapId) {
  return THREADS.filter((t) => !t.maps || t.maps.includes(mapId));
}

export function threadById(id) {
  return THREADS.find((t) => t.id === id) || null;
}

export function threadLabel(thread) {
  const th = typeof thread === 'string' ? threadById(thread) : thread;
  if (!th || !th.id) return String(thread ?? '');
  return `${th.id} · ${String(th.title).split(/[:;]/)[0].trim()}`;
}

export function threadLinkPrefix(threadId, dir) {
  return `${threadId} ${dir === 'prev' ? 'previous' : 'next'}: `;
}

export function stationById(id) {
  return STATIONS.find((s) => s.id === id) || null;
}

export function problemById(id) {
  return PROBLEMS.find((p) => p.id === id) || null;
}

export function threadByToken(token) {
  const key = String(token || '').toLowerCase();
  if (!key) return null;
  return THREADS.find((t) => String(t.id).toLowerCase() === key) || null;
}

// A problem sits on the picture either by id on the station or by station on the problem.
export function problemsOnStation(station) {
  if (!station) return [];
  const ids = [];
  const seen = new Set();
  const add = (id) => {
    if (id == null || id === '' || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const id of station.problems || []) add(id);
  for (const p of PROBLEMS) if (p.station === station.id) add(p.id);
  return ids.map((id) => problemById(id)).filter(Boolean);
}

// Cards and problems follow the station they name, so one map does not show another's drill.
export function onThisMap(item, mapId) {
  if (!item || !item.station) return true;
  const station = stationById(item.station);
  if (!station) return true;
  const owned = mapOf(station);
  return owned === 'shared' || owned === normalizeMapId(mapId);
}

export function conceptById(id) {
  return CONCEPTS.find((c) => c.id === id) || null;
}

const INDEX_KINDS = new Set(['practice', 'flashcards', 'map']);

export function stationForProblem(problemId) {
  const owned = problemById(problemId);
  if (owned && owned.station) {
    const st = stationById(owned.station);
    if (st && !INDEX_KINDS.has(st.kind)) return st;
  }
  return STATIONS.find((s) => !INDEX_KINDS.has(s.kind) && (s.problems || []).includes(problemId)) || null;
}

export function stationForTopic(topicId) {
  const concept = conceptById(topicId);
  if (concept && concept.station) {
    const st = stationById(concept.station);
    if (st) return st;
  }
  return STATIONS.find((s) => !INDEX_KINDS.has(s.kind) && (s.topics || []).includes(topicId)) || null;
}

export function neighbours(stations, id) {
  const list = [...stations].sort((a, b) => a.order - b.order);
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: list[i - 1] || null, next: list[i + 1] || null };
}

export function threadNeighbours(stations, id, threadId, mapId) {
  const list = [...stations]
    .filter((s) => threadsOn(s, mapId).includes(threadId))
    .sort((a, b) => a.order - b.order);
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: list[i - 1] || null, next: list[i + 1] || null };
}

// A thread earns a line when it crosses at least two stops and is not the whole map.
// One thread through every stop is the map order already; a second line only repeats it.
export function threadsToDraw(threads, stations, mapId) {
  if (!threads || threads.length < 2) return [];
  return threads.filter((t) => {
    const n = stations.filter((s) => threadsOn(s, mapId).includes(t.id)).length;
    return n >= 2 && n < stations.length;
  });
}

export function conceptsForMap(mapId) {
  return CONCEPTS.filter((c) => {
    const st = c.station ? stationById(c.station) : null;
    if (!st) return false;
    const m = mapOf(st);
    return m === 'shared' || m === normalizeMapId(mapId);
  });
}
