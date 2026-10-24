// Which map a route forces. One function, used by the kit router and by a
// course that already has its own shell. The course passes its own lookup.
// A station owned by one map forces that map. A shared station forces nothing,
// except a thread token, which opens the first map that thread lists.

export function mapForcedByRoute(station, route, lookup) {
  const { mapOf, threadByToken, normalizeMapId } = lookup || {};
  if (!station || typeof mapOf !== 'function') return null;
  const owned = mapOf(station);
  if (owned !== 'shared') return owned;
  const token = route && route.preset && route.preset.kind === 'token' ? String(route.preset.token) : '';
  const thread = typeof threadByToken === 'function' ? threadByToken(token) : null;
  if (thread && Array.isArray(thread.maps) && thread.maps.length) {
    return typeof normalizeMapId === 'function' ? normalizeMapId(thread.maps[0]) : thread.maps[0];
  }
  return null;
}
