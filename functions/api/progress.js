import { json, kvReady, readCookie, sameSiteWrite, secretReady, sessionCookie } from '../_lib/http.js';
import { MAX_PROGRESS_BYTES, validateProgress } from '../_lib/progress.js';
import { SESSION_COOKIE, readSession, signSession } from '../_lib/session.js';

function userKey(session) {
  return `u:${session.provider}:${session.id}`;
}

async function authed(context) {
  const { request, env } = context;
  if (!secretReady(env) || !kvReady(env)) return { error: json({ error: 'unavailable' }, 404) };
  const session = await readSession(env.SESSION_SECRET, readCookie(request, SESSION_COOKIE));
  if (!session) return { error: json({ error: 'signed-out' }, 401) };
  const token = await signSession(env.SESSION_SECRET, session);
  return { session, cookie: sessionCookie(token) };
}

function withCookie(response, cookie) {
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', cookie);
  return new Response(response.body, { status: response.status, headers });
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'GET') return onGet(context);
  if (method === 'PUT') return onPut(context);
  return new Response('Method not allowed', {
    status: 405,
    headers: { allow: 'GET, PUT', 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function onGet(context) {
  const auth = await authed(context);
  if (auth.error) return auth.error;
  const raw = await context.env.PROGRESS.get(userKey(auth.session));
  let doc = { rev: 0, updatedAt: 0, keys: {} };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.keys && typeof parsed.keys === 'object') {
        doc = {
          rev: Number.isInteger(parsed.rev) ? parsed.rev : 0,
          updatedAt: Number(parsed.updatedAt) || 0,
          keys: parsed.keys,
        };
      }
    } catch { /* a broken value is read as empty; the next save replaces it */ }
  }
  return withCookie(json(doc), auth.cookie);
}

async function onPut(context) {
  const { request, env } = context;
  if (!sameSiteWrite(request)) return json({ error: 'origin' }, 403);
  const auth = await authed(context);
  if (auth.error) return auth.error;
  const text = await request.text();
  if (text.length > MAX_PROGRESS_BYTES) return withCookie(json({ error: 'size' }, 413), auth.cookie);
  let body;
  try { body = JSON.parse(text); } catch { return withCookie(json({ error: 'json' }, 400), auth.cookie); }
  const checked = validateProgress(body);
  if (!checked.ok) return withCookie(json({ error: checked.error }, 400), auth.cookie);
  const key = userKey(auth.session);
  let existing = null;
  const existingRaw = await env.PROGRESS.get(key);
  if (existingRaw) {
    try { existing = JSON.parse(existingRaw); } catch { existing = null; }
  }
  const have = existing && Number.isInteger(existing.rev) ? existing.rev : 0;
  if (have !== checked.doc.rev) {
    return withCookie(json({
      error: 'conflict',
      rev: have,
      updatedAt: existing && Number(existing.updatedAt) || 0,
      keys: existing && existing.keys || {},
    }, 409), auth.cookie);
  }
  const stored = { rev: have + 1, updatedAt: Date.now(), keys: checked.doc.keys };
  const serial = JSON.stringify(stored);
  if (serial.length > MAX_PROGRESS_BYTES) return withCookie(json({ error: 'size' }, 413), auth.cookie);
  await env.PROGRESS.put(key, serial);
  return withCookie(json(stored), auth.cookie);
}
