// Optional sign-in. Progress stays in localStorage. When /api/me says a provider
// is configured, the header offers sign-in and this module merges the device
// with the copy in KV, then pushes later edits. With no Functions env the
// header slot stays empty and the site is the local-only site.

import { mergeLeitner } from '../practice/leitner.js';

export const SIGN_IN_LABEL = 'Sign in';
export const SIGN_IN_NOTE = 'for another device';
export const SIGN_IN_NAME = 'Sign in for another device';
export const BOOK_SIGNIN_NOTE = 'Ticks stay on this phone. Sign in copies them to another phone.';
export const SIGNOUT_NOTICE = 'Signed out. Your ticks are still on this phone.';
export const SIGNOUT_FAIL = "Sign-out didn't finish. Your ticks are still on this phone.";
export const DELETE_NOTICE = 'The saved copy is deleted. Your ticks are still on this phone.';
export const DELETE_FAIL = 'The saved copy is still there.';

// Keys the site already writes, plus the names a later page can use for the
// same four memories: stage ticks, the flashcard schedule, practice
// misses/ticks, and homework ticks. UI choices (map, theme, filters, the lab
// drawing) are not progress and are not in this list.
export const PROGRESS_KEYS = Object.freeze([
  'progress',         // Test 1 problem and topic ticks
  'progress.test2',   // chapter exercise ticks, including the homework set
  'book.progress',    // legacy stage marks; folded into progress.test2 on merge
  'stage.ticks',      // a stage mark, when a page stores one
  'homework.ticks',   // a homework mark kept apart from the chapter ticks
  'practice.leitner', // flashcard schedule (box, due, updated)
  'practice.ticks',   // a practice item marked done
  'practice.misses',  // { v, steps: { item: { step: { misses, updated } } } }
]);

const DEBOUNCE_MS = 800;

export function isProgressKey(key) {
  return PROGRESS_KEYS.includes(key);
}

function stampOf(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value.updatedAt != null ? value.updatedAt : value.updated;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function unionTicks(a, b) {
  const out = {};
  for (const src of [a, b]) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    for (const id of Object.keys(src)) if (src[id] === true) out[id] = true;
  }
  return out;
}

function isTickMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value).every((id) => value[id] === true || value[id] === false);
}

function isLeitner(value) {
  return !!(value && typeof value === 'object' && !Array.isArray(value) && value.cards && typeof value.cards === 'object' && !Array.isArray(value.cards));
}

// Latest stamp wins for a practice record that is not a tick map, a flashcard
// deck, or a miss book. A tie keeps the copy already on this device. A bare
// `true` has no stamp: it joins a tick union, and it loses to a stamped record.
function mergeItem(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  const sa = stampOf(a);
  const sb = stampOf(b);
  if (sa == null && sb == null) {
    if (a === true || b === true) return true;
    return a;
  }
  if (sa == null) return b;
  if (sb == null) return a;
  if (sa !== sb) return sb > sa ? b : a;
  const ra = a && typeof a === 'object' ? (a.reviews || 0) : 0;
  const rb = b && typeof b === 'object' ? (b.reviews || 0) : 0;
  return rb > ra ? b : a;
}

function mergeItemMap(a, b) {
  const left = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
  const right = b && typeof b === 'object' && !Array.isArray(b) ? b : {};
  const out = {};
  const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const id of ids) out[id] = mergeItem(left[id], right[id]);
  return out;
}

function cardMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  if (!value.cards || typeof value.cards !== 'object' || Array.isArray(value.cards)) return {};
  return value.cards;
}

function isMissBook(value) {
  return !!(value && typeof value === 'object' && !Array.isArray(value)
    && value.steps && typeof value.steps === 'object' && !Array.isArray(value.steps));
}

function mergeMissStep(prev, rec) {
  if (!prev) return rec;
  if (!rec || typeof rec !== 'object') return prev;
  const more = (Number(rec.misses) || 0) - (Number(prev.misses) || 0);
  if (more > 0 || (more === 0 && (Number(rec.updated) || 0) > (Number(prev.updated) || 0))) return rec;
  return prev;
}

// Same rule as js/practice/misses.js on the practice-engine branch: the larger
// miss count wins, and a tie keeps the later `updated` stamp. The book is
// { v, steps: { itemId: { step: { misses, updated } } } }.
function mergeMissBooks(a, b) {
  const steps = { ...(isMissBook(a) ? a.steps : {}) };
  const incoming = isMissBook(b) ? b.steps : {};
  for (const id of Object.keys(incoming)) {
    const have = { ...(steps[id] && typeof steps[id] === 'object' && !Array.isArray(steps[id]) ? steps[id] : {}) };
    const recs = incoming[id] && typeof incoming[id] === 'object' && !Array.isArray(incoming[id]) ? incoming[id] : {};
    for (const key of Object.keys(recs)) have[key] = mergeMissStep(have[key], recs[key]);
    steps[id] = have;
  }
  return { v: 1, steps };
}

export function mergeValue(key, a, b) {
  if (a == null) return b;
  if (b == null) return a;
  if (key === 'practice.leitner' || isLeitner(a) || isLeitner(b)) {
    return mergeLeitner({ v: 1, cards: cardMap(a) }, { v: 1, cards: cardMap(b) });
  }
  if (key === 'practice.misses' && (isMissBook(a) || isMissBook(b))) return mergeMissBooks(a, b);
  if (isTickMap(a) && isTickMap(b)) return unionTicks(a, b);
  return mergeItemMap(a, b);
}

function asDoc(doc) {
  const keys = doc && doc.keys && typeof doc.keys === 'object' && !Array.isArray(doc.keys) ? doc.keys : {};
  const updatedAt = Number(doc && doc.updatedAt);
  return { updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0, keys };
}

// Union of tick maps. For a record with updatedAt (or the flashcard `updated`
// stamp), the later item wins. Legacy book.progress exercise ticks are copied
// into progress.test2 and the legacy record is marked migrated, which is what
// the book page already does on a single device.
export function mergeProgress(local, remote) {
  const a = asDoc(local);
  const b = asDoc(remote);
  const names = new Set([...Object.keys(a.keys), ...Object.keys(b.keys)].filter(isProgressKey));
  const keys = {};
  for (const name of names) {
    if (name === 'book.progress') continue;
    const merged = mergeValue(name, a.keys[name], b.keys[name]);
    if (!merged || typeof merged !== 'object' || Array.isArray(merged)) continue;
    if (name !== 'practice.leitner' && Object.keys(merged).length === 0) continue;
    keys[name] = merged;
  }
  const bookA = a.keys['book.progress'];
  const bookB = b.keys['book.progress'];
  if (bookA || bookB) {
    const exercises = unionTicks(bookA && bookA.exercises, bookB && bookB.exercises);
    if (Object.keys(exercises).length) keys['progress.test2'] = unionTicks(keys['progress.test2'], exercises);
    keys['book.progress'] = { migrated: true };
  }
  return { updatedAt: Math.max(a.updatedAt, b.updatedAt), keys };
}

function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

// `apply` means this browser is missing something. `upload` means KV is.
// A first sign-in with only local ticks has upload set and apply clear.
export function syncPlan(local, remote) {
  const merged = mergeProgress(local, remote);
  const localKeys = local && local.keys && typeof local.keys === 'object' && !Array.isArray(local.keys) ? local.keys : {};
  const remoteKeys = remote && remote.keys && typeof remote.keys === 'object' && !Array.isArray(remote.keys) ? remote.keys : {};
  return {
    merged,
    apply: canon(merged.keys) !== canon(localKeys),
    upload: canon(merged.keys) !== canon(remoteKeys),
  };
}

export function collectProgress(store, now = Date.now()) {
  const keys = {};
  let names = [];
  try { names = store && store.keys ? store.keys() : []; } catch { names = []; }
  for (const name of names) {
    if (!isProgressKey(name)) continue;
    let value = null;
    try { value = store.get(name, null); } catch { value = null; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    keys[name] = value;
  }
  let updatedAt = 0;
  const walk = (value, depth) => {
    if (!value || typeof value !== 'object' || depth > 6) return;
    const stamp = stampOf(value);
    if (stamp != null && stamp > updatedAt) updatedAt = stamp;
    for (const id of Object.keys(value)) walk(value[id], depth + 1);
  };
  for (const name of Object.keys(keys)) walk(keys[name], 0);
  if (!updatedAt) updatedAt = now;
  return { updatedAt, keys };
}

export function applyProgress(store, doc) {
  if (!store || !store.set) return;
  const keys = doc && doc.keys && typeof doc.keys === 'object' ? doc.keys : {};
  for (const name of Object.keys(keys)) {
    if (!isProgressKey(name)) continue;
    const next = keys[name];
    if (!next || typeof next !== 'object' || Array.isArray(next)) continue;
    let prev = null;
    try { prev = store.get(name, null); } catch { prev = null; }
    if (JSON.stringify(prev) === JSON.stringify(next)) continue;
    try { store.set(name, next); } catch { /* this visit keeps the copy already on screen */ }
  }
}

export function displayHandle(me) {
  const handle = String((me && me.handle) || '').trim() || 'student';
  if (me && me.provider === 'x' && !handle.startsWith('@')) return `@${handle}`;
  return handle;
}

// The header shows the part before @, or @name. The full address stays on
// the accessible name and the title.
export function shortHandle(me) {
  const full = displayHandle(me);
  if (me && me.provider === 'x') return full;
  const at = full.indexOf('@');
  if (at > 0) return full.slice(0, at);
  return full;
}

const TICK_KEYS = ['progress', 'progress.test2', 'stage.ticks', 'homework.ticks', 'practice.ticks'];

function trueCount(map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return 0;
  let n = 0;
  for (const id of Object.keys(map)) if (map[id] === true) n += 1;
  return n;
}

export function tickCount(doc) {
  const keys = doc && doc.keys && typeof doc.keys === 'object' && !Array.isArray(doc.keys) ? doc.keys : {};
  let n = 0;
  for (const name of TICK_KEYS) n += trueCount(keys[name]);
  const book = keys['book.progress'];
  if (book && typeof book === 'object' && book.migrated !== true) n += trueCount(book.exercises);
  return n;
}

function pluralTicks(n) {
  return n === 1 ? 'tick' : 'ticks';
}

// One line for the first signed-in load. Later edits stay quiet.
export function mergeNotice(plan, local) {
  if (!plan || (!plan.upload && !plan.apply)) return '';
  const localTicks = tickCount(local);
  const mergedTicks = tickCount(plan.merged);
  const kept = plan.upload ? localTicks : 0;
  const brought = !!(plan.apply && mergedTicks > localTicks);
  if (brought && kept) return `Kept ${kept} ${pluralTicks(kept)} from this phone. Ticks from your other phone.`;
  if (brought) return 'Ticks from your other phone.';
  if (kept) return `Kept ${kept} ${pluralTicks(kept)} from this phone.`;
  return 'Saved.';
}

// Google is the header control. X stays off until the start URL asks only
// for an identity scope. It still requests users.read and tweet.read.
export function offeredProviders(me) {
  const providers = [];
  if (me && me.providers && me.providers.google) providers.push('google');
  return providers;
}

export function accountView(me) {
  const providers = offeredProviders(me);
  if (me && me.signedIn) {
    return {
      mode: 'in',
      handle: shortHandle(me),
      full: displayHandle(me),
      provider: me.provider || '',
      providers,
    };
  }
  if (!providers.length) return { mode: 'hidden', providers, label: '', name: '' };
  return { mode: 'out', label: SIGN_IN_LABEL, name: SIGN_IN_NAME, providers };
}

export function rememberAuthPlace(storage) {
  try {
    const y = globalThis.window ? globalThis.window.scrollY : 0;
    const depth = globalThis.history ? globalThis.history.length : 0;
    if (!storage) return;
    storage.setItem('mv:auth-scroll', String(Math.max(0, Math.round(y || 0))));
    storage.setItem('mv:auth-depth', String(depth || 0));
  } catch { /* the return hash still names the chapter */ }
}

export function takeAuthLanding(storage) {
  const empty = { notice: '', scroll: null, returned: false };
  if (!storage) return empty;
  try {
    const notice = storage.getItem('mv:auth-notice') || '';
    const raw = storage.getItem('mv:auth-scroll');
    const depth = storage.getItem('mv:auth-depth');
    storage.removeItem('mv:auth-notice');
    storage.removeItem('mv:auth-scroll');
    storage.removeItem('mv:auth-depth');
    const returned = notice !== '' || raw != null || depth != null;
    let scroll = null;
    if (raw != null && raw !== '' && Number.isFinite(Number(raw))) scroll = Number(raw);
    return { notice, scroll, returned };
  } catch {
    return empty;
  }
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of [].concat(children === undefined ? [] : children)) {
    if (child == null) continue;
    node.append(child);
  }
  return node;
}

function authHref(provider, loc) {
  const path = `${loc.pathname || '/'}${loc.search || ''}${loc.hash || ''}` || '/#book';
  return `/auth/${provider}/start?return=${encodeURIComponent(path)}`;
}

const PROVIDER_LABEL = { google: 'Google', x: 'X' };

function signInFace() {
  return [
    el('span', { class: 'account-signin-label' }, SIGN_IN_LABEL),
    el('span', { class: 'account-signin-sub' }, SIGN_IN_NOTE),
  ];
}

function armAuthLinks(slot, storage) {
  for (const anchor of slot.querySelectorAll('a[href^="/auth/"]')) {
    anchor.addEventListener('click', () => rememberAuthPlace(storage));
  }
}

export function paintAccount(slot, me, opts = {}) {
  if (!slot) return;
  const view = accountView(me);
  slot.replaceChildren();
  if (view.mode === 'hidden') return;
  const loc = opts.location || globalThis.location || { pathname: '/', search: '', hash: '' };
  const storage = opts.sessionStorage || globalThis.sessionStorage;
  if (view.mode === 'in') {
    const more = el('details', { class: 'account-more', id: 'account-more' }, [
      el('summary', {
        class: 'account-handle',
        id: 'account-handle',
        title: view.full,
        'aria-label': view.full,
      }, view.handle),
      el('button', {
        type: 'button',
        class: 'btn account-delete',
        id: 'account-delete',
        'aria-label': 'Delete the copy saved for another device',
      }, 'Delete the copy'),
    ]);
    slot.append(
      more,
      el('button', { type: 'button', class: 'btn account-signout', id: 'account-signout' }, 'Sign out'),
    );
    const wide = globalThis.matchMedia && matchMedia('(min-width: 56.25rem)').matches;
    if (wide) {
      more.open = true;
      more.addEventListener('click', (event) => {
        const summary = event.target && event.target.closest ? event.target.closest('summary') : null;
        if (summary) event.preventDefault();
      });
    }
    more.addEventListener('toggle', () => noteHeader());
    const button = slot.querySelector('#account-signout');
    if (button && opts.onSignOut) button.addEventListener('click', opts.onSignOut);
    const del = slot.querySelector('#account-delete');
    if (del && opts.onDelete) {
      del.addEventListener('click', () => {
        if (del.dataset.armed !== 'true') {
          del.dataset.armed = 'true';
          del.textContent = 'Delete it';
          return;
        }
        opts.onDelete();
      });
    }
    return;
  }
  if (view.providers.length === 1) {
    const provider = view.providers[0];
    slot.append(el('a', {
      class: 'btn account-signin',
      id: 'account-signin',
      href: authHref(provider, loc),
      'aria-label': SIGN_IN_NAME,
    }, signInFace()));
    armAuthLinks(slot, storage);
    return;
  }
  const links = view.providers.map((provider) => el('a', {
    class: 'btn account-provider',
    id: `account-${provider}`,
    href: authHref(provider, loc),
  }, PROVIDER_LABEL[provider] || provider));
  slot.append(el('details', { class: 'account-details', id: 'account-details' }, [
    el('summary', {
      class: 'btn account-signin',
      id: 'account-signin',
      'aria-label': SIGN_IN_NAME,
    }, signInFace()),
    el('div', { class: 'account-providers', id: 'account-providers' }, links),
  ]));
  armAuthLinks(slot, storage);
}

function noteHeader() {
  try { window.dispatchEvent(new Event('resize')); } catch { /* the header height is also read on resize */ }
}

function announce(text) {
  if (!text) return;
  const view = globalThis.document && document.getElementById('view');
  const status = globalThis.document && document.getElementById('route-status');
  const ready = view && view.dataset && view.dataset.state && view.dataset.state !== 'loading';
  if (ready && status) {
    status.textContent = text;
    return;
  }
  const mv = (globalThis.window && (window.__mv = window.__mv || {})) || null;
  if (mv) mv.accountNotice = text;
}

function parkLanding(landing) {
  if (!landing || !globalThis.window) return;
  const mv = (window.__mv = window.__mv || {});
  if (landing.notice) mv.accountNotice = landing.notice;
  if (landing.scroll != null) mv.accountScroll = landing.scroll;
}

async function waitForView() {
  const view = globalThis.document && document.getElementById('view');
  if (!view || !view.dataset) return;
  if (view.dataset.state && view.dataset.state !== 'loading') return;
  await new Promise((resolve) => {
    let obs = null;
    const done = () => {
      if (obs) obs.disconnect();
      resolve();
    };
    if (typeof MutationObserver === 'function') {
      obs = new MutationObserver(() => {
        if (view.dataset.state && view.dataset.state !== 'loading') done();
      });
      obs.observe(view, { attributes: true, attributeFilter: ['data-state'] });
    }
    setTimeout(done, 4000);
  });
}

export function mountAccount({ store, slot, fetch: fetchImpl, location: loc, sessionStorage: ss } = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const location = loc || globalThis.location;
  const storage = ss || globalThis.sessionStorage;
  if (!slot || !store || typeof fetchFn !== 'function') return function stop() {};
  let stopped = false;
  let silent = 0;
  let timer = 0;
  let busy = false;
  let queued = false;
  let watching = false;
  let me = null;
  const unsubs = [];
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const landing = takeAuthLanding(storage);
  parkLanding(landing);

  function stop() {
    stopped = true;
    clearTimeout(timer);
    if (ac) ac.abort();
    if (globalThis.window) window.removeEventListener('pageshow', onPageShow);
    for (const fn of unsubs.splice(0)) {
      try { fn(); } catch { /* already gone */ }
    }
  }

  async function readProgress() {
    const res = await fetchFn('/api/progress', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: ac ? ac.signal : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return { rev: Number(data.rev) || 0, updatedAt: Number(data.updatedAt) || 0, keys: data.keys || {} };
  }

  async function writeProgress(doc, rev) {
    const res = await fetchFn('/api/progress', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ rev, updatedAt: doc.updatedAt, keys: doc.keys }),
      signal: ac ? ac.signal : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    const remoteDoc = {
      rev: data && Number.isInteger(Number(data.rev)) && Number(data.rev) >= 0 ? Number(data.rev) : (res.status === 409 ? 0 : (rev || 0) + 1),
      updatedAt: data && Number(data.updatedAt) || 0,
      keys: data && data.keys && typeof data.keys === 'object' ? data.keys : (res.status === 409 ? {} : doc.keys),
    };
    if (res.status === 409) return { status: 'conflict', remote: remoteDoc };
    if (!res.ok) return { status: 'fail' };
    return { status: 'ok', remote: remoteDoc };
  }

  function applyQuiet(doc) {
    silent += 1;
    try { applyProgress(store, doc); }
    finally { silent -= 1; }
  }

  async function pushMerged(remote) {
    let current = remote;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (stopped) return;
      if (!current) current = await readProgress();
      if (!current) return;
      const plan = syncPlan(collectProgress(store), current);
      if (plan.apply) applyQuiet(plan.merged);
      if (!plan.upload) return;
      const wrote = await writeProgress(plan.merged, current.rev || 0);
      if (wrote.status === 'conflict') {
        current = wrote.remote;
        continue;
      }
      if (wrote.status !== 'ok') return;
      current = wrote.remote;
    }
  }

  function schedule() {
    if (silent || stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (busy) { queued = true; return; }
      busy = true;
      pushMerged(null).catch(() => { /* the ticks stay on this device */ }).finally(() => {
        busy = false;
        if (queued && !stopped) {
          queued = false;
          schedule();
        }
      });
    }, DEBOUNCE_MS);
  }

  function watch() {
    if (watching || !store.subscribe) return;
    watching = true;
    for (const name of PROGRESS_KEYS) {
      try { unsubs.push(store.subscribe(name, schedule)); } catch { /* a missing key still syncs on the next visit */ }
    }
  }

  function unwatch() {
    watching = false;
    for (const fn of unsubs.splice(0)) {
      try { fn(); } catch { /* already gone */ }
    }
  }

  function paint(current) {
    paintAccount(slot, current, {
      location,
      sessionStorage: storage,
      onSignOut: () => { signOut().catch(() => {}); },
      onDelete: () => { deleteCopy().catch(() => {}); },
    });
    noteHeader();
  }

  async function refreshOpenPage() {
    const y = globalThis.window ? window.scrollY : 0;
    const detail = { scrollY: y, done: null };
    try {
      window.dispatchEvent(new CustomEvent('mv:account-refresh', { detail }));
    } catch { /* the ticks are in localStorage for the next visit */ }
    if (detail.done && typeof detail.done.then === 'function') {
      try { await detail.done; } catch { /* the open page keeps its scroll */ }
    }
  }

  async function signOut() {
    let ok = false;
    try {
      const res = await fetchFn('/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: '{}',
        signal: ac ? ac.signal : undefined,
      });
      ok = !!(res && res.ok);
    } catch { ok = false; }
    if (!ok) {
      announce(SIGNOUT_FAIL);
      return;
    }
    try { if (storage) storage.removeItem('mv:account-synced'); } catch { /* the next sign-in can say the line again */ }
    unwatch();
    me = { ...(me || {}), signedIn: false };
    paint(me);
    announce(SIGNOUT_NOTICE);
  }

  async function deleteCopy() {
    let ok = false;
    try {
      const res = await fetchFn('/api/progress', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        signal: ac ? ac.signal : undefined,
      });
      ok = !!(res && res.ok);
    } catch { ok = false; }
    announce(ok ? DELETE_NOTICE : DELETE_FAIL);
  }

  async function boot() {
    try {
      const res = await fetchFn('/api/me', {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        signal: ac ? ac.signal : undefined,
      });
      if (!res.ok) return;
      const type = res.headers && res.headers.get ? (res.headers.get('content-type') || '') : '';
      if (type && !type.includes('json')) return;
      me = await res.json();
    } catch {
      return;
    }
    if (stopped || !me) return;
    paint(me);
    if (!me.signedIn) return;
    watch();
    busy = true;
    try {
      await waitForView();
      if (stopped) return;
      const remote = await readProgress();
      if (stopped || !remote) return;
      const local = collectProgress(store);
      const plan = syncPlan(local, remote);
      if (plan.apply) applyQuiet(plan.merged);
      if (plan.upload) await pushMerged(remote);
      let already = false;
      try { already = !!(storage && storage.getItem('mv:account-synced')); } catch { already = false; }
      const line = already ? '' : mergeNotice(plan, local);
      if (line) {
        try { if (storage) storage.setItem('mv:account-synced', '1'); } catch { /* one line is enough */ }
      }
      if (plan.apply) await refreshOpenPage();
      if (line) announce(line);
    } catch { /* signed in, local ticks still on the page */ }
    finally {
      busy = false;
      if (queued && !stopped) {
        queued = false;
        schedule();
      }
    }
  }

  function onPageShow(event) {
    if (!event || !event.persisted || stopped) return;
    const again = takeAuthLanding(storage);
    if (!again.returned) return;
    if (again.notice) announce(again.notice);
    boot().catch(() => {});
  }

  if (globalThis.window) window.addEventListener('pageshow', onPageShow);
  boot().catch(() => {});
  return stop;
}
