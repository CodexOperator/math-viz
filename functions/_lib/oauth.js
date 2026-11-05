// Google OIDC and X OAuth 2.0, both with PKCE and a signed state cookie.
// Redirect URIs are the request origin plus /api/auth/<provider>/callback.
// Those are the URLs registered with Google and X. A preview host works once
// that host is listed on the OAuth app.

import {
  b64urlToBytes, bytesToB64url, cleanHandle, cleanId, randomB64url, readSession, safeEqual, signSession, signToken, verifyToken,
} from './session.js';
import {
  OAUTH_COOKIE, OAUTH_COOKIE_PATH, callbackPath, clearCookie, googleReady, oauthCookie, originOf, plain, readCookie, redirect, safeReturn, sessionCookie, xReady,
} from './http.js';

const OAUTH_TTL_SEC = 600;

async function sha256B64url(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bytesToB64url(digest);
}

function googleAuthUrl({ clientId, redirectUri, state, nonce, challenge }) {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

function xAuthUrl({ clientId, redirectUri, state, challenge }) {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'users.read tweet.read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${query}`;
}

function returnPath(request, origin) {
  const url = new URL(request.url);
  const asked = url.searchParams.get('return');
  if (asked) return safeReturn(asked, origin);
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const from = new URL(referer);
      if (from.origin === origin) return safeReturn(`${from.pathname}${from.search}${from.hash}`, origin);
    } catch { /* the cookie still sends the student back to the book */ }
  }
  return '/#book';
}

export async function beginAuth(context, provider) {
  const { request, env } = context;
  const ready = provider === 'google' ? googleReady(env) : provider === 'x' ? xReady(env) : false;
  if (!ready) return plain('Sign-in is not configured.', 404);
  const origin = originOf(request);
  const state = randomB64url(32);
  const verifier = randomB64url(32);
  const nonce = randomB64url(16);
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(env.SESSION_SECRET, {
    v: 1,
    kind: 'oauth',
    provider,
    state,
    verifier,
    nonce,
    returnTo: returnPath(request, origin),
    iat: now,
    exp: now + OAUTH_TTL_SEC,
  });
  const challenge = await sha256B64url(verifier);
  const redirectUri = `${origin}${callbackPath(provider)}`;
  const dest = provider === 'google'
    ? googleAuthUrl({ clientId: env.GOOGLE_CLIENT_ID, redirectUri, state, nonce, challenge })
    : xAuthUrl({ clientId: env.X_CLIENT_ID, redirectUri, state, challenge });
  return redirect(dest, [oauthCookie(token)]);
}

export const CANCEL_NOTICE = 'Sign-in cancelled. Your ticks are still on this phone.';
export const FAIL_NOTICE = "Sign-in didn't finish. Your ticks are still on this phone.";

function clearOauthCookies() {
  return [
    clearCookie(OAUTH_COOKIE, OAUTH_COOKIE_PATH),
    clearCookie(OAUTH_COOKIE, '/auth'),
  ];
}

export function cancelError(error) {
  return error === 'access_denied' || error === 'denied' || error === 'cancelled';
}

// How many history entries to step back over so Back lands on the chapter.
// depth is history.length on the chapter, saved before the provider navigation.
// Two steps is chapter <- provider <- callback. One step is a provider whose
// redirect already replaced itself. Zero means location.replace instead.
export function historySteps(historyLength, depth) {
  const length = Number(historyLength) || 0;
  const from = Number(depth) || 0;
  const steps = from > 0 ? length - from : (length > 2 ? 2 : 0);
  if (steps < 1 || steps > 4) return 0;
  return steps;
}

function jsConst(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function attrEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// A document, not a 302. The script steps back over the provider entry.
// A 302 would leave that entry under the chapter, and Back would open it again.
function land(returnTo, cookies, notice) {
  const dest = returnTo || '/#book';
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
  });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Returning</title></head><body><p><a href="${attrEscape(dest)}">Back</a></p><script>(function () {
  var dest = ${jsConst(dest)};
  var note = ${jsConst(notice || '')};
  try { if (note) sessionStorage.setItem('mv:auth-notice', note); } catch (e) {}
  var depth = 0;
  try { depth = Number(sessionStorage.getItem('mv:auth-depth')) || 0; } catch (e) {}
  var steps = depth > 0 ? history.length - depth : (history.length > 2 ? 2 : 0);
  if (steps < 1 || steps > 4) { location.replace(dest); return; }
  var left = false;
  addEventListener('pagehide', function () { left = true; });
  history.go(-steps);
  setTimeout(function () {
    if (left || document.visibilityState === 'hidden') return;
    location.replace(dest);
  }, 700);
})();</script></body></html>`;
  return new Response(html, { status: 200, headers });
}

let googleCerts = { at: 0, keys: [] };

async function loadGoogleCerts(force) {
  if (!force && googleCerts.keys.length && Date.now() - googleCerts.at < 60 * 60 * 1000) return googleCerts.keys;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs', { headers: { accept: 'application/json' } });
  if (!res.ok) return googleCerts.keys;
  const json = await res.json();
  googleCerts = { at: Date.now(), keys: Array.isArray(json.keys) ? json.keys : [] };
  return googleCerts.keys;
}

async function verifyGoogleIdToken(idToken, { clientId, nonce }) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(head)));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
  } catch {
    return null;
  }
  if (!header || header.alg !== 'RS256' || !header.kid) return null;
  if (!payload || typeof payload !== 'object') return null;
  let keys = await loadGoogleCerts(false);
  let jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    keys = await loadGoogleCerts(true);
    jwk = keys.find((key) => key.kid === header.kid);
  }
  if (!jwk) return null;
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const data = new TextEncoder().encode(`${head}.${body}`);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(sig), data);
  if (!ok) return null;
  const issOk = payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com';
  if (!issOk) return null;
  const audOk = payload.aud === clientId || (Array.isArray(payload.aud) && payload.aud.includes(clientId));
  if (!audOk) return null;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;
  if (typeof payload.nonce !== 'string' || typeof nonce !== 'string' || !safeEqual(payload.nonce, nonce)) return null;
  if (!payload.sub) return null;
  return payload;
}

async function googleUser({ env, code, verifier, nonce, redirectUri }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code_verifier: verifier,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  });
  if (!res.ok) return null;
  const json = await res.json();
  const payload = await verifyGoogleIdToken(json.id_token, { clientId: env.GOOGLE_CLIENT_ID, nonce });
  if (!payload) return null;
  const id = cleanId(payload.sub);
  if (!id) return null;
  // The header shows a verified email, or the name. An unverified address is not a handle.
  const email = payload.email_verified === true && typeof payload.email === 'string' ? payload.email : '';
  const name = typeof payload.name === 'string' ? payload.name : '';
  return { provider: 'google', id, handle: cleanHandle(email || name || id) };
}

function xBasic(id, secret) {
  // RFC 6749 §2.3.1. encodeURIComponent matches the form encoding for the
  // characters that show up in a client secret (`+`, `/`, `=`).
  return btoa(`${encodeURIComponent(id)}:${encodeURIComponent(secret)}`);
}

async function xUser({ env, code, verifier, redirectUri }) {
  const basic = xBasic(env.X_CLIENT_ID, env.X_CLIENT_SECRET);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
  });
  if (!tokenRes.ok) return null;
  const token = await tokenRes.json();
  if (!token.access_token) return null;
  const me = await fetch('https://api.x.com/2/users/me', {
    headers: { authorization: `Bearer ${token.access_token}`, accept: 'application/json' },
  });
  if (!me.ok) return null;
  const json = await me.json();
  const id = cleanId(json && json.data && json.data.id);
  const username = json && json.data && json.data.username;
  if (!id || !username) return null;
  return { provider: 'x', id, handle: cleanHandle(username) };
}

export async function finishAuth(context, provider) {
  const { request, env } = context;
  const ready = provider === 'google' ? googleReady(env) : provider === 'x' ? xReady(env) : false;
  if (!ready) return plain('Sign-in is not configured.', 404);
  const origin = originOf(request);
  const url = new URL(request.url);
  const sent = await verifyToken(env.SESSION_SECRET, readCookie(request, OAUTH_COOKIE));
  const back = sent && sent.returnTo ? safeReturn(sent.returnTo, origin) : '/#book';
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const error = url.searchParams.get('error') || '';
  const stateOk = !!(sent && sent.kind === 'oauth' && sent.provider === provider && sent.verifier && safeEqual(sent.state || '', state));
  if (!stateOk || !code || error) {
    const notice = stateOk && cancelError(error) ? CANCEL_NOTICE : FAIL_NOTICE;
    return land(back, clearOauthCookies(), notice);
  }
  try {
    const redirectUri = `${origin}${callbackPath(provider)}`;
    const user = provider === 'google'
      ? await googleUser({ env, code, verifier: sent.verifier, nonce: sent.nonce, redirectUri })
      : await xUser({ env, code, verifier: sent.verifier, redirectUri });
    if (!user) return land(back, clearOauthCookies(), FAIL_NOTICE);
    const session = await signSession(env.SESSION_SECRET, user);
    const check = await readSession(env.SESSION_SECRET, session);
    if (!check) return land(back, clearOauthCookies(), FAIL_NOTICE);
    return land(back, [sessionCookie(session), ...clearOauthCookies()], '');
  } catch {
    console.error(`[mv] ${provider} sign-in failed`);
    return land(back, clearOauthCookies(), FAIL_NOTICE);
  }
}
