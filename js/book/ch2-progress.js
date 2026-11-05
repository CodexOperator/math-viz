// Stage marks for the Chapter 2 mountain. Signed-out, in the same store as the
// other book progress. A stage id this page does not own is ignored.

export const CH2_KEY = 'progress.ch2';
export const CH2_FLASH_KEY = 'progress.ch2.flash';
export const CH2_STAGES = Object.freeze(['2.1', '2.2', '2.3', '2.4', '2.5']);
const FLASH_DAYS = Object.freeze([0, 1, 3, 7, 21]);

export function loadChapter2Marks(store) {
  let raw = {};
  try { raw = store.get(CH2_KEY, {}) || {}; } catch { raw = {}; }
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of CH2_STAGES) if (raw[id] === true) out[id] = true;
  return out;
}

export function saveChapter2Marks(store, marks) {
  const next = {};
  for (const id of CH2_STAGES) if (marks && marks[id] === true) next[id] = true;
  try { store.set(CH2_KEY, next); } catch { /* this visit still shows the mark */ }
  return next;
}

function flashRaw(store) {
  let raw = {};
  try { raw = store.get(CH2_FLASH_KEY, {}) || {}; } catch { raw = {}; }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

export function loadFlashBox(store, id) {
  const row = flashRaw(store)[id];
  if (!row || typeof row !== 'object') return { box: 0, due: 0 };
  const box = Math.max(0, Math.min(4, Math.round(Number(row.box)) || 0));
  const due = Number(row.due);
  return { box, due: Number.isFinite(due) ? due : 0 };
}

// box 0 is due now. A remembered card waits 1, 3, 7, then 21 days.
export function saveFlashBox(store, id, knew, now) {
  const prev = flashRaw(store);
  const current = loadFlashBox(store, id);
  const box = knew ? Math.min(4, current.box + 1) : 0;
  const day = FLASH_DAYS[box] || 0;
  const due = (Number.isFinite(now) ? now : Date.now()) + day * 86400000;
  const next = { ...prev, [id]: { box, due } };
  try { store.set(CH2_FLASH_KEY, next); } catch { /* this visit still hides the card */ }
  return next[id];
}
