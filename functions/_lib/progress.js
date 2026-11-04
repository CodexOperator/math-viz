// The KV value is the progress document plus updatedAt. PUT bodies are
// size-capped and checked before they are stored. Keys have to be progress
// keys the client already knows.

import { isProgressKey } from '../../js/core/account.js';

export const MAX_PROGRESS_BYTES = 64 * 1024;
const MAX_DEPTH = 8;
const MAX_KEYS = 400;
const MAX_STRING = 500;
const MAX_ARRAY = 40;
const BAD_NAME = new Set(['__proto__', 'constructor', 'prototype']);
const BAD = Symbol('bad');

function sanitize(value, depth) {
  if (value === null) return null;
  const kind = typeof value;
  if (kind === 'boolean') return value;
  if (kind === 'number') return Number.isFinite(value) ? value : BAD;
  if (kind === 'string') return value.length <= MAX_STRING ? value : BAD;
  if (depth >= MAX_DEPTH) return BAD;
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) return BAD;
    const out = [];
    for (const item of value) {
      const next = sanitize(item, depth + 1);
      if (next === BAD) return BAD;
      out.push(next);
    }
    return out;
  }
  if (kind !== 'object') return BAD;
  const names = Object.keys(value);
  if (names.length > MAX_KEYS) return BAD;
  const out = {};
  for (const name of names) {
    if (BAD_NAME.has(name) || name.length > 80) return BAD;
    const next = sanitize(value[name], depth + 1);
    if (next === BAD) return BAD;
    out[name] = next;
  }
  return out;
}

export function validateProgress(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body' };
  if (!body.keys || typeof body.keys !== 'object' || Array.isArray(body.keys)) return { ok: false, error: 'keys' };
  const names = Object.keys(body.keys);
  if (names.length > MAX_KEYS) return { ok: false, error: 'keys' };
  const keys = {};
  for (const name of names) {
    if (!isProgressKey(name)) return { ok: false, error: 'key' };
    const value = sanitize(body.keys[name], 0);
    if (value === BAD || !value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'value' };
    keys[name] = value;
  }
  const rev = Number(body.rev);
  const doc = {
    rev: Number.isInteger(rev) && rev >= 0 ? rev : 0,
    keys,
  };
  if (JSON.stringify(doc).length > MAX_PROGRESS_BYTES) return { ok: false, error: 'size' };
  return { ok: true, doc };
}
