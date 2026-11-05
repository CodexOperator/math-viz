// Leitner boxes for flashcards.
// Stored at localStorage key mv:practice.leitner (the store prefix is mv:).
// A future signed-in sync merges two decks with mergeLeitner: the card with
// more reviews wins, and a tie keeps the later updated stamp.
// Box gaps, in days: 1, 2, 4, 8, 16. A miss returns the card to box 1.

export const LEITNER_KEY = 'practice.leitner';
const GAPS = [0, 1, 2, 4, 8, 16];

export function emptyDeck() {
  return { v: 1, cards: {} };
}

export function localDay(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return localDay(dt);
}

export function loadDeck(store) {
  const raw = store && store.get ? store.get(LEITNER_KEY, null) : null;
  if (!raw || raw.v !== 1 || !raw.cards || typeof raw.cards !== 'object') return emptyDeck();
  return { v: 1, cards: { ...raw.cards } };
}

export function saveDeck(store, deck) {
  if (store && store.set) store.set(LEITNER_KEY, deck);
}

function practiceCount(rec) {
  return rec.reviews || 0;
}

export function mergeLeitner(a, b) {
  const cards = { ...(a && a.cards) };
  const incoming = (b && b.cards) || {};
  for (const id of Object.keys(incoming)) {
    const rec = incoming[id];
    const have = cards[id];
    if (!have) {
      cards[id] = rec;
      continue;
    }
    const more = practiceCount(rec) - practiceCount(have);
    if (more > 0 || (more === 0 && (rec.updated || 0) > (have.updated || 0))) cards[id] = rec;
  }
  return { v: 1, cards };
}

// grade is 'again' or 'good'. nowMs stamps the record so a merge can order ties.
export function reviewCard(deck, id, grade, today, nowMs = Date.now()) {
  const prev = deck.cards[id] || { box: 0, due: today, reviews: 0, lapses: 0, updated: 0 };
  let box = prev.box || 1;
  let lapses = prev.lapses || 0;
  if (grade === 'again') {
    box = 1;
    lapses += 1;
  } else {
    box = Math.min(5, (prev.box || 0) + 1);
  }
  const cards = {
    ...deck.cards,
    [id]: {
      box,
      due: addDays(today, GAPS[box]),
      reviews: (prev.reviews || 0) + 1,
      lapses,
      updated: nowMs,
    },
  };
  return { v: 1, cards };
}

export function isDue(rec, today) {
  if (!rec) return true;
  return String(rec.due || '') <= today;
}

// Due cards first (lower box, then id). Unseen cards count as due.
export function dueOrder(items, deck, today) {
  const cards = items.filter((it) => it.kind === 'flash');
  const due = [];
  const later = [];
  for (const it of cards) {
    const rec = deck.cards[it.id];
    (isDue(rec, today) ? due : later).push({ item: it, rec });
  }
  const byBox = (a, b) => {
    const ba = a.rec ? a.rec.box : 0;
    const bb = b.rec ? b.rec.box : 0;
    if (ba !== bb) return ba - bb;
    return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
  };
  due.sort(byBox);
  later.sort((a, b) => String(a.rec.due).localeCompare(String(b.rec.due)) || byBox(a, b));
  return { due, later };
}
