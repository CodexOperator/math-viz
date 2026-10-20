// js/core/store.js
// A tiny key-value store: memory first, mirrored to localStorage as JSON.
// Every storage access is in try/catch; with storage blocked or full the store still works
// for the life of the page. Values must be JSON-serialisable. No top-level DOM access.
//
//   const store = createStore('mv:');
//   store.get(key, fallback)                 -> a fresh copy of the value, or fallback
//   store.set(key, value, { persist: true }) -> true when the value reached localStorage
//   store.remove(key)
//   store.subscribe(key, cb)                 -> unsubscribe; cb(value | undefined), this page only
//   store.keys()                             -> sorted array of keys (without the prefix)
//
// The key 'theme' is reserved: theme.js keeps a raw (non-JSON) string at localStorage 'mv:theme'.
// Second argument { storage } exists for unit tests (a localStorage-like object, or null).

export function createStore(prefix = 'mv:', options = {}) {
  const mem = new Map(); // key -> JSON string
  const subs = new Map(); // key -> Set<{ cb }>
  let storage; // undefined: not looked up yet; null: unavailable

  function ls() {
    if (storage !== undefined) return storage;
    try {
      storage = 'storage' in options ? options.storage : globalThis.localStorage;
    } catch {
      storage = null;
    }
    if (!storage) storage = null;
    return storage;
  }

  function read(key) {
    if (mem.has(key)) return mem.get(key);
    const s = ls();
    if (!s) return null;
    try {
      const raw = s.getItem(prefix + key);
      if (raw !== null && raw !== undefined) {
        mem.set(key, raw);
        return raw;
      }
    } catch {
      /* blocked */
    }
    return null;
  }

  function notify(key, value) {
    const set = subs.get(key);
    if (!set) return;
    for (const entry of [...set]) {
      try {
        entry.cb(value);
      } catch (err) {
        console.error(`[mv] store subscriber for "${key}" threw`, err);
      }
    }
  }

  function remove(key) {
    const had = read(key) !== null;
    mem.delete(key);
    try {
      const s = ls();
      if (s) s.removeItem(prefix + key);
    } catch {
      /* blocked */
    }
    if (had) notify(key, undefined);
  }

  return {
    get(key, fallback) {
      const raw = read(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    set(key, value, { persist = true } = {}) {
      if (value === undefined) {
        remove(key);
        return false;
      }
      let json;
      try {
        json = JSON.stringify(value);
      } catch (err) {
        console.warn(`[mv] store.set("${key}") skipped: value is not JSON-serialisable`, err);
        return false;
      }
      if (json === undefined) {
        remove(key);
        return false;
      }
      mem.set(key, json);
      let persisted = false;
      const s = ls();
      if (s) {
        try {
          if (persist) {
            s.setItem(prefix + key, json);
            persisted = true;
          } else {
            s.removeItem(prefix + key); // no stale copy may come back after a reload
          }
        } catch {
          /* quota or blocked: memory only */
        }
      }
      notify(key, JSON.parse(json));
      return persisted;
    },

    remove,

    subscribe(key, cb) {
      let set = subs.get(key);
      if (!set) subs.set(key, (set = new Set()));
      const entry = { cb };
      set.add(entry);
      return function unsubscribe() {
        set.delete(entry);
        if (set.size === 0 && subs.get(key) === set) subs.delete(key);
      };
    },

    keys() {
      const out = new Set(mem.keys());
      const s = ls();
      if (s) {
        try {
          for (let i = 0; i < s.length; i++) {
            const k = s.key(i);
            if (k && k.startsWith(prefix)) out.add(k.slice(prefix.length));
          }
        } catch {
          /* blocked */
        }
      }
      return [...out].sort();
    },
  };
}
