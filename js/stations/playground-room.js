// A Story Map room that opens one playground picture. The visit is the hash.
// The assembler still chooses when Next may offer that picture.

const ROOMS = {
  'pg-twin': { hash: 'twins', title: 'The Twin' },
  'pg-bulbs': { hash: 'bulbs', title: 'The Bulbs' },
  'pg-cascade': { hash: 'cascade', title: 'The Real Cascade' },
  'pg-rays': { hash: 'rays', title: 'The Rays' },
  'pg-pole': { hash: 'pole', title: 'The Pole' },
  'pg-join': { hash: 'join', title: 'The Join' },
  'pg-climb': { hash: 'climb', title: 'The Climb' },
  'pg-fall': { hash: 'fall', title: 'The Fall' },
  'pg-lean': { hash: 'lean', title: 'The Lean' },
};

export function mount(el, ctx) {
  const id = ctx && ctx.station && ctx.station.id;
  const room = ROOMS[id] || ROOMS['pg-rays'];
  const href = new URL(`playground.html#${room.hash}`, document.baseURI).href;
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.id = 'playground-room-open';
  a.href = href;
  a.textContent = room.title;
  p.append(a);
  const note = document.createElement('p');
  note.textContent = 'The book does not number this room. The picture is on the playground.';
  el.replaceChildren(p, note);
  try { location.assign(href); } catch { /* the link stays */ }
  return function unmount() {};
}
