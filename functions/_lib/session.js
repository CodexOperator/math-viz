// Signed cookies. HMAC-SHA256 through Web Crypto, so Pages Functions and the
// node test share one implementation. The payload is base64url(JSON), then a
// dot, then base64url(signature).

const enc = new TextEncoder();

export const SESSION_COOKIE = 'mv_session';
export const OAUTH_COOKIE = 'mv_oauth';
export const SESSION_TTL_SEC = 60 * 60 * 8;

export function bytesToB64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i += 1) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function b64urlToBytes(text) {
  const pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = enc.encode(a);
  const right = enc.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function jsonUrl(obj) {
  return bytesToB64url(enc.encode(JSON.stringify(obj)));
}

function jsonFromUrl(text) {
  try {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(text)));
  } catch {
    return null;
  }
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function hmac(secret, data) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data));
  return bytesToB64url(sig);
}

export async function signToken(secret, payload) {
  if (!secret || typeof secret !== 'string') throw new Error('missing secret');
  const data = jsonUrl(payload);
  const sig = await hmac(secret, data);
  return `${data}.${sig}`;
}

export async function verifyToken(secret, token, nowMs = Date.now()) {
  if (!secret || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!data || !sig) return null;
  let sigBytes;
  try { sigBytes = b64urlToBytes(sig); } catch { return null; }
  let ok = false;
  try {
    // subtle.verify is the constant-time compare. A JS xor loop returns early
    // on a different length and is not a stand-in for that.
    ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), sigBytes, enc.encode(data));
  } catch {
    return null;
  }
  if (!ok) return null;
  const payload = jsonFromUrl(data);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;
  return payload;
}

export function cleanHandle(raw) {
  const text = String(raw || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  return text || 'student';
}

export function cleanId(raw) {
  const text = String(raw || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(text)) return null;
  return text;
}

export async function signSession(secret, fields, nowMs = Date.now()) {
  const provider = fields && (fields.provider === 'google' || fields.provider === 'x') ? fields.provider : null;
  const id = cleanId(fields && fields.id);
  if (!provider || !id) throw new Error('bad session');
  const iat = Math.floor(nowMs / 1000);
  return signToken(secret, {
    v: 1,
    kind: 'session',
    provider,
    id,
    handle: cleanHandle(fields.handle),
    iat,
    exp: iat + SESSION_TTL_SEC,
  });
}

export async function readSession(secret, token, nowMs = Date.now()) {
  const payload = await verifyToken(secret, token, nowMs);
  if (!payload || payload.v !== 1 || payload.kind !== 'session') return null;
  if (payload.provider !== 'google' && payload.provider !== 'x') return null;
  if (!cleanId(payload.id)) return null;
  return payload;
}

export function randomB64url(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToB64url(buf);
}
