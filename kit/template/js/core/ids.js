// js/core/ids.js
// The router's id pass. CONSTRAINTS says every control has a stable id. A widget (button, field, select, summary) gets its id from the station that
// builds it, by rule 10.7.3. A link, and a tab stop that is not a widget (a scrolling answer box, the SVG map's nodes), is built in so many
// places that one pass names them all the same way, so no station can leave one out and no two stations name them differently:
//
//   <scope>-to-<route token>       a link: the nearest ancestor that has an id (or the station id), then where it goes
//                                  (roots-to-lab, problems-card-1-4-2-to-roots, home-map-to-roots)
//   <scope>-scroll, <scope>-stop   a tab stop that is not a link: a .tex-scroll box, anything else with a tabindex of 0
//
// A second link with the same scope and target gets -2, -3 ... in document order, so the ids are the same on every mount.
// Pure helpers (idSlug, linkTarget) are importable from Node; the DOM functions only touch the element they are given.

// What the pass names: links and tab stops. tabindex="-1" is a programmatic focus target, not a tab stop, and is left alone.
export const ID_CANDIDATES = 'a[href], [tabindex]:not([tabindex^="-"]), [role="button"], video[controls], audio[controls]';

// Text -> [A-Za-z0-9_-]+ ('1.4.2' -> '1-4-2', 'problem-P3' stays); '' when nothing is left.
export function idSlug(text) {
  return String(text == null ? '' : text).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

// The part of a link's id that says where it goes: '#roots' -> 'roots', '#problem-1-4-2' -> 'problem-1-4-2', 'x.html' -> 'x-html'.
export function linkTarget(href) {
  return idSlug(String(href == null ? '' : href).replace(/^#/, '')) || 'link';
}

function kindOf(el) {
  const href = el.getAttribute('href') || el.getAttribute('xlink:href');
  if (href !== null && el.localName === 'a') return 'to-' + linkTarget(href);
  if (el.classList && el.classList.contains('tex-scroll')) return 'scroll';
  return 'stop';
}

// The id an element would get: its scope, then its kind. `scopeId` is the station id, used when no ancestor has an id of its own
// (or the only one is the station's own <section id="station-...">).
export function idBase(el, scopeId) {
  let scope = scopeId;
  const up = el.parentElement ? el.parentElement.closest('[id]') : null;
  if (up && up.id && !/^station-/.test(up.id) && up.id !== 'view') scope = up.id;
  return `${scope}-${kindOf(el)}`;
}

// Give every candidate under `root` (and `root` itself) that has no id one. Returns how many it named.
export function assignIds(root, scopeId, nodes) {
  if (!root || !root.ownerDocument) return 0;
  const doc = root.ownerDocument;
  const found = new Set();
  const take = (n) => {
    if (!n || n.nodeType !== 1) return;
    if (n.matches(ID_CANDIDATES)) found.add(n);
    for (const c of n.querySelectorAll(ID_CANDIDATES)) found.add(c);
  };
  if (nodes) for (const n of nodes) take(n); else take(root);
  const todo = [...found].filter((el) => !el.id && root.contains(el));
  todo.sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1));               // document order, so the numbering is the same on every mount
  for (const el of todo) {
    const base = idBase(el, scopeId);
    let id = base, n = 1;
    while (doc.getElementById(id)) id = `${base}-${++n}`;
    el.id = id;
  }
  return todo.length;
}

// Name what is there now, then whatever the station adds later (an answer that opens, a result list, a rebuilt card). Returns stop().
export function watchIds(root, scopeId) {
  assignIds(root, scopeId);
  if (typeof MutationObserver === 'undefined') return () => {};
  const mo = new MutationObserver((records) => {
    const nodes = [];
    for (const r of records) {
      if (r.type === 'attributes') nodes.push(r.target);
      else for (const n of r.addedNodes) nodes.push(n);
    }
    if (nodes.length) assignIds(root, scopeId, nodes);
  });
  mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'tabindex'] });
  return () => mo.disconnect();
}
