// node tools/oauth-mock.mjs
// Google and X, with fetch replaced by a local stand-in. No network, no real secrets.

import { beginAuth, finishAuth } from '../functions/_lib/oauth.js';
import { b64urlToBytes, bytesToB64url } from '../functions/_lib/session.js';

const secret = 'test-session-secret-not-a-real-value';
const env = {
  SESSION_SECRET: secret,
  GOOGLE_CLIENT_ID: 'google-client',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  X_CLIENT_ID: 'x-client',
  X_CLIENT_SECRET: 'sec+ret',
  PROGRESS: { async get() { return null; }, async put() {} },
};

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name);
  } else {
    console.log('ok  ', name);
  }
}

const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
publicJwk.kid = 'test-key';
publicJwk.alg = 'RS256';
publicJwk.use = 'sig';

const other = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign'],
);

function b64urlJson(obj) {
  return bytesToB64url(new TextEncoder().encode(JSON.stringify(obj)));
}

async function signJwt(key, payload, header) {
  const head = b64urlJson({ alg: 'RS256', typ: 'JWT', kid: 'test-key', ...header });
  const body = b64urlJson(payload);
  const data = new TextEncoder().encode(`${head}.${body}`);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  return `${head}.${body}.${bytesToB64url(sig)}`;
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function payloadOf(token) {
  const data = token.slice(0, token.lastIndexOf('.'));
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(data)));
}

function cookiePair(response) {
  const rows = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie') || ''];
  return rows.map((row) => row.split(';')[0]).join('; ');
}

const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  const body = init && init.body ? String(init.body) : '';
  calls.push(u);
  if (u === 'https://www.googleapis.com/oauth2/v3/certs') return jsonResponse({ keys: [publicJwk] });
  if (u === 'https://oauth2.googleapis.com/token') {
    const params = new URLSearchParams(body);
    if (params.get('code_verifier') !== expected.verifier) return jsonResponse({ error: 'pkce' }, 400);
    if (params.get('redirect_uri') !== expected.redirect) return jsonResponse({ error: 'redirect' }, 400);
    const code = params.get('code');
    const base = {
      aud: env.GOOGLE_CLIENT_ID,
      sub: '1001',
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: expected.nonce,
      email: 'ada@example.com',
      email_verified: true,
    };
    if (code === 'good') {
      const idToken = await signJwt(pair.privateKey, { iss: 'https://accounts.google.com', ...base });
      return jsonResponse({ id_token: idToken });
    }
    if (code === 'bad-nonce') {
      const idToken = await signJwt(pair.privateKey, { iss: 'https://accounts.google.com', ...base, nonce: 'other-nonce' });
      return jsonResponse({ id_token: idToken });
    }
    if (code === 'bad-iss') {
      const idToken = await signJwt(pair.privateKey, { ...base, iss: 'https://evil.example' });
      return jsonResponse({ id_token: idToken });
    }
    if (code === 'bad-aud') {
      const idToken = await signJwt(pair.privateKey, { iss: 'https://accounts.google.com', ...base, aud: 'other-client' });
      return jsonResponse({ id_token: idToken });
    }
    if (code === 'alg-none') {
      const head = b64urlJson({ alg: 'none', kid: 'test-key' });
      const tokenBody = b64urlJson({ iss: 'https://accounts.google.com', ...base });
      return jsonResponse({ id_token: `${head}.${tokenBody}.` });
    }
    if (code === 'bad-sig') {
      const idToken = await signJwt(other.privateKey, { iss: 'https://accounts.google.com', ...base });
      return jsonResponse({ id_token: idToken });
    }
    return jsonResponse({ error: 'code' }, 400);
  }
  if (u === 'https://api.x.com/2/oauth2/token') {
    const params = new URLSearchParams(body);
    const auth = init.headers && (init.headers.authorization || init.headers.get?.('authorization'));
    xSaw.auth = auth || '';
    xSaw.verifier = params.get('code_verifier');
    xSaw.redirect = params.get('redirect_uri');
    if (params.get('code') !== 'good') return jsonResponse({ error: 'code' }, 400);
    return jsonResponse({ access_token: 'x-access-token', token_type: 'bearer' });
  }
  if (u === 'https://api.x.com/2/users/me') {
    const auth = init.headers && (init.headers.authorization || init.headers.get?.('authorization'));
    if (auth !== 'Bearer x-access-token') return jsonResponse({ error: 'token' }, 401);
    return jsonResponse({ data: { id: '99', username: 'ada' } });
  }
  return realFetch(url, init);
};

const expected = { verifier: '', nonce: '', redirect: '' };
const xSaw = { auth: '', verifier: '', redirect: '' };

function sessionCookie(response) {
  const rows = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  return rows.find((row) => row.startsWith('mv_session=')) || '';
}

async function start(provider) {
  calls.length = 0;
  const response = await beginAuth({
    request: new Request(`https://complexanalysis.pages.dev/auth/${provider}/start?return=%2F%23book`),
    env,
  }, provider);
  const location = new URL(response.headers.get('location'));
  const raw = cookiePair(response).split('; ').find((part) => part.startsWith('mv_oauth='));
  const token = decodeURIComponent(raw.slice('mv_oauth='.length));
  const payload = payloadOf(token);
  return { response, location, payload, cookie: `mv_oauth=${encodeURIComponent(token)}` };
}

const google = await start('google');
expected.verifier = google.payload.verifier;
expected.nonce = google.payload.nonce;
expected.redirect = 'https://complexanalysis.pages.dev/api/auth/google/callback';
const challenge = google.location.searchParams.get('code_challenge');
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(google.payload.verifier));
check('google sends S256 of the verifier and the /api/auth callback',
  google.location.pathname === '/o/oauth2/v2/auth'
  && google.location.searchParams.get('code_challenge_method') === 'S256'
  && challenge === bytesToB64url(digest)
  && google.location.searchParams.get('redirect_uri') === expected.redirect
  && /Path=\/api\/auth/.test(google.response.headers.get('set-cookie') || ''));

async function finish(provider, cookie, code, state) {
  calls.length = 0;
  return finishAuth({
    request: new Request(`https://complexanalysis.pages.dev/api/auth/${provider}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
      headers: { cookie },
    }),
    env,
  }, provider);
}

const wrong = await finish('google', google.cookie, 'good', 'not-the-state');
check('a mismatched state is refused before the token request',
  wrong.status === 302 && wrong.headers.get('location') === '/#book' && !calls.includes('https://oauth2.googleapis.com/token') && !sessionCookie(wrong));

for (const code of ['bad-nonce', 'bad-iss', 'bad-aud', 'alg-none', 'bad-sig']) {
  const refused = await finish('google', google.cookie, code, google.payload.state);
  check(`google ${code} does not sign in`, refused.status === 302 && refused.headers.get('location') === '/#book' && !sessionCookie(refused));
}

const signed = await finish('google', google.cookie, 'good', google.payload.state);
const session = sessionCookie(signed);
check('google sign-in sets a session cookie and returns to the book',
  signed.status === 302
  && signed.headers.get('location') === '/#book'
  && /HttpOnly/.test(session) && /Secure/.test(session) && /SameSite=Lax/.test(session)
  && calls.includes('https://oauth2.googleapis.com/token'));

const x = await start('x');
const xDone = await finish('x', x.cookie, 'good', x.payload.state);
const xSession = sessionCookie(xDone);
check('x sign-in sends the encoded client secret, the verifier, and the /api/auth callback',
  xDone.status === 302
  && xDone.headers.get('location') === '/#book'
  && /HttpOnly/.test(xSession)
  && xSaw.verifier === x.payload.verifier
  && xSaw.redirect === 'https://complexanalysis.pages.dev/api/auth/x/callback'
  && xSaw.auth === `Basic ${btoa(`${encodeURIComponent(env.X_CLIENT_ID)}:${encodeURIComponent(env.X_CLIENT_SECRET)}`)}`
  && calls.includes('https://api.x.com/2/users/me'));

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('oauth mock passed');
