// Small response helpers for the Pages Functions. Cookies are HttpOnly,
// Secure, and SameSite=Lax. The session rolls forward on each signed-in API
// call; the browser drops it after SESSION_TTL_SEC without a call.

import { OAUTH_COOKIE, SESSION_COOKIE, SESSION_TTL_SEC } from './session.js';

export function originOf(request) {
  return new URL(request.url).origin;
}

export function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(eq + 1).trim()); } catch { return ''; }
  }
  return '';
}

export function cookiePair(name, value, { maxAge, path }) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Path=${path}`,
    `Max-Age=${maxAge}`,
  ].join('; ');
}

export function sessionCookie(token) {
  return cookiePair(SESSION_COOKIE, token, { maxAge: SESSION_TTL_SEC, path: '/' });
}

export function clearCookie(name, path) {
  return cookiePair(name, '', { maxAge: 0, path });
}

export function json(data, status = 200, extra) {
  const headers = new Headers(extra || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers });
}

export function redirect(location, cookies = []) {
  const headers = new Headers({
    location,
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

export function plain(text, status) {
  return new Response(text, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function sameSiteWrite(request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === originOf(request);
}

export function safeReturn(raw, origin) {
  const home = '/#book';
  if (typeof raw !== 'string' || !raw || raw.length > 400) return home;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return home;
  if (raw.includes('\\') || raw.includes('://')) return home;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return home;
    if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return home;
    return `${url.pathname}${url.search}${url.hash}` || home;
  } catch {
    return home;
  }
}

export function kvReady(env) {
  return !!(env && env.PROGRESS && typeof env.PROGRESS.get === 'function' && typeof env.PROGRESS.put === 'function');
}

export function secretReady(env) {
  return !!(env && typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 16);
}

export function googleReady(env) {
  return secretReady(env) && kvReady(env)
    && typeof env.GOOGLE_CLIENT_ID === 'string' && env.GOOGLE_CLIENT_ID.length > 0
    && typeof env.GOOGLE_CLIENT_SECRET === 'string' && env.GOOGLE_CLIENT_SECRET.length > 0;
}

export function xReady(env) {
  return secretReady(env) && kvReady(env)
    && typeof env.X_CLIENT_ID === 'string' && env.X_CLIENT_ID.length > 0
    && typeof env.X_CLIENT_SECRET === 'string' && env.X_CLIENT_SECRET.length > 0;
}

export function providerFlags(env) {
  return { google: googleReady(env), x: xReady(env) };
}

// The callback lives under /api/auth. The state cookie has to use that path
// or the browser will not send it when Google or X redirects back.
export const OAUTH_COOKIE_PATH = '/api/auth';

export function callbackPath(provider) {
  if (provider !== 'google' && provider !== 'x') return '/#book';
  return `/api/auth/${provider}/callback`;
}

export function legacyCallbackRedirect(request, provider) {
  const url = new URL(request.url);
  return redirect(`${callbackPath(provider)}${url.search}`);
}

export async function readBodyLimited(request, max) {
  const declared = request.headers.get('content-length');
  if (declared != null) {
    const n = declared.trim();
    if (!/^\d+$/.test(n) || Number(n) > max) return { error: 'size' };
  }
  if (!request.body) return { text: '' };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        try { await reader.cancel(); } catch { /* the cap already failed the read */ }
        return { error: 'size' };
      }
      chunks.push(value);
    }
  } catch {
    return { error: 'read' };
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(buf) };
}

export function oauthCookie(token) {
  return cookiePair(OAUTH_COOKIE, token, { maxAge: 600, path: OAUTH_COOKIE_PATH });
}

export { OAUTH_COOKIE, SESSION_COOKIE, SESSION_TTL_SEC };
