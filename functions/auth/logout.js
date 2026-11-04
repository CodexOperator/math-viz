import { OAUTH_COOKIE, SESSION_COOKIE, clearCookie, json, plain, sameSiteWrite } from '../_lib/http.js';

export function onRequestPost({ request }) {
  if (!sameSiteWrite(request)) return plain('Cross-site sign-out is refused.', 403);
  const headers = new Headers();
  headers.append('Set-Cookie', clearCookie(SESSION_COOKIE, '/'));
  headers.append('Set-Cookie', clearCookie(OAUTH_COOKIE, '/auth'));
  return json({ ok: true }, 200, headers);
}
