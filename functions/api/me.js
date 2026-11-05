import { json, providerFlags, readCookie, secretReady, sessionCookie } from '../_lib/http.js';
import { SESSION_COOKIE, readSession, signSession } from '../_lib/session.js';

export async function onRequestGet({ request, env }) {
  const providers = providerFlags(env);
  if (!secretReady(env)) return json({ signedIn: false, providers });
  const session = await readSession(env.SESSION_SECRET, readCookie(request, SESSION_COOKIE));
  if (!session) return json({ signedIn: false, providers });
  const token = await signSession(env.SESSION_SECRET, session);
  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie(token));
  return json({
    signedIn: true,
    provider: session.provider,
    handle: session.handle,
    providers,
  }, 200, headers);
}
