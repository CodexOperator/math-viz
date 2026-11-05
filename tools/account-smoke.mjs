// node tools/account-smoke.mjs
// Cookie sign/verify, progress merge, and a headless load with no Functions env.

import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../js/core/store.js';
import {
  SIGN_IN_LABEL, SIGN_IN_NAME, SIGNED_IN_LABEL, BOOK_SIGNIN_NOTE, BOOK_SIGNIN_NOTE_WIDE, PROGRESS_KEYS, isProgressKey, mergeProgress, collectProgress,
  accountView, displayHandle, shortHandle, syncPlan, mergeNotice, offeredProviders, rememberAuthPlace, takeAuthLanding,
  DELETE_LABEL, DELETE_CONFIRM, DELETE_ARM_LINE,
} from '../js/core/account.js';
import { recordMiss } from '../js/practice/misses.js';
import {
  SESSION_TTL_SEC, b64urlToBytes, signSession, readSession, verifyToken, signToken,
} from '../functions/_lib/session.js';
import { sessionCookie, safeReturn, cookiePair, readBodyLimited } from '../functions/_lib/http.js';
import { validateProgress, MAX_PROGRESS_BYTES } from '../functions/_lib/progress.js';
import { beginAuth, historySteps, CANCEL_NOTICE, FAIL_NOTICE } from '../functions/_lib/oauth.js';
import { onRequest as progressRequest } from '../functions/api/progress.js';
import { onRequestGet as meRequest } from '../functions/api/me.js';
import { onRequestGet as legacyGoogleCallback } from '../functions/auth/google/callback.js';
import { onRequestGet as legacyXCallback } from '../functions/auth/x/callback.js';
import { onRequestGet as googleCallback } from '../functions/api/auth/google/callback.js';

const root = fileURLToPath(new URL('..', import.meta.url));
let failed = 0;

function check(name, cond, detail = '') {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name, detail);
  } else {
    console.log('ok  ', name);
  }
}

const secret = 'test-session-secret-not-a-real-value';
const now = 1_700_000_000_000;

const token = await signSession(secret, { provider: 'google', id: '1001', handle: 'ada@example.com\n' }, now);
const session = await readSession(secret, token, now + 1000);
check('a signed cookie verifies', session && session.provider === 'google' && session.id === '1001' && session.handle === 'ada@example.com');
check('the session cookie is HttpOnly, Secure, and SameSite=Lax',
  /HttpOnly/.test(sessionCookie(token)) && /Secure/.test(sessionCookie(token)) && /SameSite=Lax/.test(sessionCookie(token)));

const flipped = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
check('a tampered signature is refused', await readSession(secret, flipped, now + 1000) == null);
const dot = token.lastIndexOf('.');
const payload = token.slice(0, dot);
const damaged = `${payload.slice(0, -2)}${payload.endsWith('a') ? 'b' : 'a'}${payload.slice(-1)}.${token.slice(dot + 1)}`;
check('a tampered payload is refused', await verifyToken(secret, damaged, now + 1000) == null);
check('the wrong secret is refused', await readSession('another-session-secret-value', token, now + 1000) == null);
check('an expired cookie is refused', await readSession(secret, token, now + SESSION_TTL_SEC * 1000 + 5) == null);
check('a missing secret is refused', await readSession('', token, now) == null);

const xToken = await signSession(secret, { provider: 'x', id: '42', handle: 'ada' }, now);
const xSession = await readSession(secret, xToken, now);
check('an X session keeps the id and the handle', xSession && xSession.provider === 'x' && xSession.id === '42' && xSession.handle === 'ada');
check('the header shows an X handle with @', displayHandle(xSession) === '@ada');
check('a short handle is the part before @ and the full address stays',
  shortHandle({ provider: 'google', handle: 'shael.student@university.edu' }) === 'shael.student'
  && displayHandle({ provider: 'google', handle: 'shael.student@university.edu' }) === 'shael.student@university.edu');

const mergedTicks = mergeProgress(
  { updatedAt: 1, keys: { 'progress.test2': { '4.1.3': true }, 'homework.ticks': { '4.2.3': true } } },
  { updatedAt: 2, keys: { 'progress.test2': { '4.2.5': true, '4.1.3': false }, 'homework.ticks': { '4.1.13': true } } },
);
check('ticks are a union, including homework',
  mergedTicks.keys['progress.test2']['4.1.3'] === true
  && mergedTicks.keys['progress.test2']['4.2.5'] === true
  && mergedTicks.keys['homework.ticks']['4.2.3'] === true
  && mergedTicks.keys['homework.ticks']['4.1.13'] === true
  && mergedTicks.keys['progress.test2']['4.1.3'] !== false);

const misses = mergeProgress(
  { keys: { 'practice.misses': { a: { misses: 1, updatedAt: 10 }, b: { misses: 2, updatedAt: 30 } } } },
  { keys: { 'practice.misses': { a: { misses: 4, updatedAt: 20 }, c: { misses: 1, updatedAt: 5 } } } },
);
check('the later updatedAt wins per practice item',
  misses.keys['practice.misses'].a.misses === 4
  && misses.keys['practice.misses'].b.misses === 2
  && misses.keys['practice.misses'].c.misses === 1);

const cards = mergeProgress(
  { keys: { 'practice.leitner': { v: 1, cards: { a: { box: 2, reviews: 3, updated: 10 }, b: { box: 1, reviews: 1, updated: 4 } } } } },
  { keys: { 'practice.leitner': { v: 1, cards: { a: { box: 1, reviews: 1, updated: 10 }, c: { box: 3, reviews: 2, updated: 8 } } } } },
);
check('a flashcard tie keeps the card with more reviews, and a later stamp wins',
  cards.keys['practice.leitner'].cards.a.reviews === 3
  && cards.keys['practice.leitner'].cards.b.box === 1
  && cards.keys['practice.leitner'].cards.c.box === 3);

const reviewed = mergeProgress(
  { keys: { 'practice.leitner': { v: 1, cards: { a: { box: 5, reviews: 10, updated: 10 } } } } },
  { keys: { 'practice.leitner': { v: 1, cards: { a: { box: 1, reviews: 2, updated: 50 } } } } },
);
check('more reviews beat a later flashcard stamp', reviewed.keys['practice.leitner'].cards.a.box === 5 && reviewed.keys['practice.leitner'].cards.a.reviews === 10);

const missBook = mergeProgress(
  { keys: { 'practice.misses': { v: 1, steps: { thm: { '0': { misses: 1, updated: 10 } } } } } },
  { keys: { 'practice.misses': { v: 1, steps: { thm: { '0': { misses: 2, updated: 5 }, '1': { misses: 1, updated: 4 } }, other: { '0': { misses: 1, updated: 3 } } } } } },
);
check('a miss book keeps the larger count and the other device\'s steps',
  missBook.keys['practice.misses'].steps.thm['0'].misses === 2
  && missBook.keys['practice.misses'].steps.thm['1'].misses === 1
  && missBook.keys['practice.misses'].steps.other['0'].misses === 1);

const localOnly = { updatedAt: 1, keys: { progress: { '1.3.1': true } } };
const emptyRemote = { rev: 0, updatedAt: 0, keys: {} };
const first = syncPlan(localOnly, emptyRemote);
check('first sign-in uploads local ticks without rewriting the browser',
  first.upload === true && first.apply === false && first.merged.keys.progress['1.3.1'] === true);
const both = syncPlan(
  { keys: { progress: { a: true }, 'progress.test2': { '4.1.3': true } } },
  { keys: { progress: { b: true }, 'progress.test2': { '4.1.3': true, '4.2.5': true } } },
);
check('the union keeps every tick',
  both.merged.keys.progress.a === true && both.merged.keys.progress.b === true
  && both.merged.keys['progress.test2']['4.1.3'] === true && both.merged.keys['progress.test2']['4.2.5'] === true
  && both.upload === true && both.apply === true);
const again = syncPlan(both.merged, { keys: both.merged.keys, updatedAt: both.merged.updatedAt });
check('a second merge of the same union is a no-op', again.upload === false && again.apply === false);
check('the first upload says how many ticks stayed on the phone',
  mergeNotice(first, localOnly) === 'Kept 1 tick from this phone.');
check('ticks from the other phone are named when this phone had none',
  mergeNotice(syncPlan({ keys: {} }, { keys: { progress: { b: true } } }), { keys: {} }) === 'Ticks from your other phone.');
check('a union of both phones says both lines',
  mergeNotice(both, { keys: { progress: { a: true }, 'progress.test2': { '4.1.3': true } } })
  === 'Kept 2 ticks from this phone. Ticks from your other phone.');
check('an unchanged union says nothing', mergeNotice(again, both.merged) === '');

const folded = mergeProgress(
  { keys: { 'book.progress': { exercises: { '4.1.3': true }, sections: { '4.1': true } } } },
  { keys: { 'progress.test2': { '5.1.1': true } } },
);
check('a legacy stage record folds its exercise ticks and is marked migrated',
  folded.keys['progress.test2']['4.1.3'] === true
  && folded.keys['progress.test2']['5.1.1'] === true
  && folded.keys['book.progress'].migrated === true
  && folded.keys['book.progress'].sections == null);

const mem = new Map();
const storage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
  key: (i) => [...mem.keys()][i] || null,
  get length() { return mem.size; },
};
const store = createStore('mv:', { storage });
store.set('progress', { '1.3.1': true });
store.set('progress.test2', { '4.1.3': true });
store.set('practice.leitner', { v: 1, cards: { card: { box: 1, updated: 9, reviews: 1 } } });
store.set('practice.misses', { 'ch4-1': { misses: 2, updatedAt: 9 } });
store.set('stage.ticks', { '4.1': true });
store.set('map', 'test2');
store.set('lab.strokes', [{ kind: 'circle' }]);
store.set('progress.test2.filter', { group: 'homework' });
store.set('problems.predict', true);
const found = collectProgress(store, 50);
check('collect finds the progress keys and skips the map, the lab, and the filter',
  found.keys.progress['1.3.1'] === true
  && found.keys['progress.test2']['4.1.3'] === true
  && found.keys['practice.leitner'].cards.card.updated === 9
  && found.keys['practice.misses']['ch4-1'].misses === 2
  && found.keys['stage.ticks']['4.1'] === true
  && found.keys.map == null
  && found.keys['lab.strokes'] == null
  && found.keys['progress.test2.filter'] == null
  && found.keys['problems.predict'] == null);
check('filter and map keys are not progress', !isProgressKey('progress.test2.filter') && !isProgressKey('map') && PROGRESS_KEYS.includes('practice.leitner'));

check('a signed-out view with no provider is hidden', accountView({ signedIn: false, providers: { google: false, x: false } }).mode === 'hidden');
check('the sign-in control is Sign in, and X is not offered',
  accountView({ signedIn: false, providers: { google: true, x: true } }).label === SIGN_IN_LABEL
  && accountView({ signedIn: false, providers: { google: true, x: true } }).name === SIGN_IN_NAME
  && offeredProviders({ providers: { google: true, x: true } }).join() === 'google');
check('a signed-in view says Signed in and keeps the address',
  accountView({ signedIn: true, provider: 'google', handle: 'ada@example.com', providers: {} }).handle === SIGNED_IN_LABEL
  && accountView({ signedIn: true, provider: 'google', handle: 'ada@example.com', providers: {} }).full === 'ada@example.com');
const memSession = new Map();
const sessionLike = {
  getItem: (k) => (memSession.has(k) ? memSession.get(k) : null),
  setItem: (k, v) => { memSession.set(k, String(v)); },
  removeItem: (k) => { memSession.delete(k); },
};
rememberAuthPlace(sessionLike);
check('leaving for the provider remembers a scroll and a history depth',
  sessionLike.getItem('mv:auth-scroll') != null && sessionLike.getItem('mv:auth-depth') != null);
sessionLike.setItem('mv:auth-notice', CANCEL_NOTICE);
const landed = takeAuthLanding(sessionLike);
check('a cancel notice is read once',
  landed.notice === CANCEL_NOTICE && landed.returned === true && sessionLike.getItem('mv:auth-notice') == null);
check('history steps over the provider and stops if the stack is unrelated',
  historySteps(12, 10) === 2 && historySteps(11, 10) === 1 && historySteps(4, 0) === 2 && historySteps(2, 0) === 0 && historySteps(30, 10) === 0);
const missedBook = recordMiss(store, 'ch4-4.1-sample', 0, 40);
recordMiss(store, 'ch4-4.1-sample', 0, 50);
const mergedMiss = mergeProgress(
  { keys: { 'practice.misses': missedBook } },
  { keys: { 'practice.misses': store.get('practice.misses') } },
);
check('a wrong answer writes a miss book the other phone can merge',
  store.get('practice.misses').steps['ch4-4.1-sample']['0'].misses === 2
  && mergedMiss.keys['practice.misses'].steps['ch4-4.1-sample']['0'].misses === 2);

const good = validateProgress({ rev: 0, keys: { 'progress.test2': { '4.1.3': true } } });
check('a tick document is accepted', good.ok && good.doc.keys['progress.test2']['4.1.3'] === true && good.doc.rev === 0);
check('a fractional rev is refused', validateProgress({ rev: 1.5, keys: { progress: { '1.3.1': true } } }).ok === false);
check('an unknown key is refused', validateProgress({ rev: 0, keys: { map: { test2: true } } }).ok === false);
check('a prototype key is refused', validateProgress(JSON.parse('{"rev":0,"keys":{"progress":{"__proto__":{"admin":true},"1.3.1":true}}}')).ok === false);
const bulky = {};
for (let i = 0; i < 400; i += 1) bulky[`k${i}`] = 'x'.repeat(200);
check('a document over the size cap is refused',
  validateProgress({ rev: 0, keys: { 'practice.misses': bulky } }).ok === false
  && MAX_PROGRESS_BYTES === 64 * 1024);

const home = 'https://complexanalysis.pages.dev';
check('a return path stays on this origin', safeReturn('/#book', home) === '/#book');
check('an off-site return is dropped', safeReturn('https://evil.example/#book', home) === '/#book');
check('a protocol-relative return is dropped', safeReturn('//evil.example/auth', home) === '/#book');
check('a backslash return is dropped', safeReturn('/\\evil.example', home) === '/#book' && safeReturn('///evil.example', home) === '/#book');
check('a callback return is dropped', safeReturn('/auth/google/callback', home) === '/#book' && safeReturn('/api/auth/google/callback?code=1', home) === '/#book');
check('a return with a newline stays one path', !safeReturn('/foo\r\nSet-Cookie: a=b', home).includes('\n') && !safeReturn('/foo\r\nSet-Cookie: a=b', home).includes('\r'));
check('a dot-segment does not become a protocol-relative return',
  safeReturn('/.//evil.example/phish', home) === '/#book'
  && safeReturn('/foo/..//evil.example', home) === '/#book'
  && safeReturn('/%2e//evil.example', home) === '/#book'
  && safeReturn('/%2f%2fevil.example', home) === '/#book'
  && safeReturn('/#chapter-5', home) === '/#chapter-5');

const env = {
  SESSION_SECRET: secret,
  GOOGLE_CLIENT_ID: 'google-client',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  X_CLIENT_ID: 'x-client',
  X_CLIENT_SECRET: 'x-secret',
  PROGRESS: {
    async get(key) { return kv.has(key) ? kv.get(key) : null; },
    async put(key, value) { kv.set(key, value); },
    async delete(key) { kv.delete(key); },
  },
};
const kv = new Map();

const hidden = await beginAuth({ request: new Request('https://complexanalysis.pages.dev/auth/google/start'), env: {} }, 'google');
check('google start without env is not offered', hidden.status === 404);
const xHidden = await beginAuth({ request: new Request('https://complexanalysis.pages.dev/auth/x/start'), env: { ...env, X_CLIENT_ID: '', X_CLIENT_SECRET: '' } }, 'x');
check('x start without its secrets is not offered', xHidden.status === 404);

const started = await beginAuth({
  request: new Request('https://preview.complexanalysis.pages.dev/auth/google/start?return=%2F%23book'),
  env,
}, 'google');
const location = started.headers.get('location') || '';
check('google start redirects to the origin callback with PKCE',
  started.status === 302
  && location.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')
  && location.includes('redirect_uri=https%3A%2F%2Fpreview.complexanalysis.pages.dev%2Fapi%2Fauth%2Fgoogle%2Fcallback')
  && location.includes('code_challenge_method=S256')
  && location.includes('code_challenge='));
const setCookie = started.headers.get('set-cookie') || '';
check('the state cookie is HttpOnly Secure SameSite=Lax on /api/auth',
  /HttpOnly/.test(setCookie) && /Secure/.test(setCookie) && /SameSite=Lax/.test(setCookie) && /Path=\/api\/auth/.test(setCookie));

const sneaky = await beginAuth({
  request: new Request(`https://complexanalysis.pages.dev/auth/google/start?return=${encodeURIComponent('/.//evil.example/phish')}`),
  env,
}, 'google');
const sneakyPair = (sneaky.headers.get('set-cookie') || '').split(';')[0];
const sneakyToken = decodeURIComponent(sneakyPair.slice('mv_oauth='.length));
const sneakyPayload = JSON.parse(new TextDecoder().decode(b64urlToBytes(sneakyToken.slice(0, sneakyToken.lastIndexOf('.')))));
const sneakyBack = await googleCallback({
  request: new Request(`https://complexanalysis.pages.dev/api/auth/google/callback?error=access_denied&state=${encodeURIComponent(sneakyPayload.state)}`, {
    headers: { cookie: `mv_oauth=${encodeURIComponent(sneakyToken)}` },
  }),
  env,
});
const sneakyHtml = await sneakyBack.text();
check('a dot-segment return is stored and rendered on this site',
  sneakyPayload.returnTo === '/#book'
  && sneakyHtml.includes('/#book')
  && !sneakyHtml.includes('evil.example'));

const xStart = await beginAuth({
  request: new Request('https://complexanalysis.pages.dev/auth/x/start?return=%2F%23book'),
  env,
}, 'x');
const xLocation = xStart.headers.get('location') || '';
check('x start asks for users.read and tweet.read and the origin callback',
  xLocation.startsWith('https://twitter.com/i/oauth2/authorize?')
  && xLocation.includes('scope=users.read+tweet.read')
  && xLocation.includes('redirect_uri=https%3A%2F%2Fcomplexanalysis.pages.dev%2Fapi%2Fauth%2Fx%2Fcallback'));

const meOff = await meRequest({ request: new Request('https://complexanalysis.pages.dev/api/me'), env: {} });
const meBody = await meOff.json();
check('me without env reports no providers', meBody.signedIn === false && meBody.providers.google === false && meBody.providers.x === false);

function progressCall(method, body, cookie) {
  const headers = {
    origin: 'https://complexanalysis.pages.dev',
    cookie: `mv_session=${encodeURIComponent(cookie)}`,
    'content-type': 'application/json',
  };
  return progressRequest({
    request: new Request('https://complexanalysis.pages.dev/api/progress', {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(body),
    }),
    env,
  });
}

const sessionCookieValue = await signSession(secret, { provider: 'google', id: 'abc', handle: 'ada@example.com' });
const firstGet = await progressCall('GET', null, sessionCookieValue);
const empty = await firstGet.json();
check('progress GET starts empty', firstGet.status === 200 && empty.rev === 0 && Object.keys(empty.keys).length === 0);
const saved = await progressCall('PUT', { rev: 0, keys: { 'progress.test2': { '4.1.3': true }, 'practice.leitner': { v: 1, cards: { a: { box: 1, updated: 3 } } } } }, sessionCookieValue);
const savedBody = await saved.json();
check('progress PUT stores u:google:abc', saved.status === 200 && savedBody.rev === 1 && kv.has('u:google:abc'));
const conflict = await progressCall('PUT', { rev: 0, keys: { progress: { '1.3.1': true } } }, sessionCookieValue);
check('a stale rev is a conflict and keeps the stored ticks', conflict.status === 409 && JSON.parse(kv.get('u:google:abc')).keys['progress.test2']['4.1.3'] === true);
const cross = await progressRequest({
  request: new Request('https://complexanalysis.pages.dev/api/progress', {
    method: 'PUT',
    headers: { origin: 'https://evil.example', cookie: `mv_session=${encodeURIComponent(sessionCookieValue)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ rev: 1, keys: { progress: { '1.3.1': true } } }),
  }),
  env,
});
check('a cross-site PUT is refused', cross.status === 403);
const rolled = saved.headers.get('set-cookie') || '';
check('a signed-in progress call rolls the session cookie', /mv_session=/.test(rolled) && /HttpOnly/.test(rolled) && /SameSite=Lax/.test(rolled));
check('cookiePair keeps the attributes', /HttpOnly/.test(cookiePair('mv_session', 'v', { maxAge: 10, path: '/' })) && /Secure/.test(cookiePair('mv_session', 'v', { maxAge: 10, path: '/' })));

const xSameId = await signSession(secret, { provider: 'x', id: 'abc', handle: 'ada' });
const xRow = await progressCall('GET', null, xSameId);
const xRowBody = await xRow.json();
check('google and x with the same id do not share a KV row',
  xRow.status === 200 && xRowBody.rev === 0 && kv.has('u:google:abc') && !kv.has('u:x:abc'));

kv.set('u:google:abc', JSON.stringify({ rev: 3, updatedAt: 9, keys: { map: { test2: true }, 'progress.test2': { '4.1.3': true } } }));
const cleaned = await progressCall('GET', null, sessionCookieValue);
const cleanedBody = await cleaned.json();
check('progress GET drops a key that is not progress',
  cleaned.status === 200 && cleanedBody.keys.map == null && cleanedBody.keys['progress.test2']['4.1.3'] === true && cleanedBody.rev === 3);

const huge = await progressRequest({
  request: new Request('https://complexanalysis.pages.dev/api/progress', {
    method: 'PUT',
    headers: { origin: 'https://complexanalysis.pages.dev', cookie: `mv_session=${encodeURIComponent(sessionCookieValue)}`, 'content-type': 'application/json' },
    body: 'x'.repeat(MAX_PROGRESS_BYTES + 1),
  }),
  env,
});
check('a body over 64 KiB is refused', huge.status === 413 && JSON.parse(kv.get('u:google:abc')).rev === 3);
const declared = await readBodyLimited({
  headers: new Headers({ 'content-length': '999999' }),
  body: { getReader() { throw new Error('should not read'); } },
}, 1024);
check('a declared body over the cap is refused before it is read', declared.error === 'size');
const crossDelete = await progressRequest({
  request: new Request('https://complexanalysis.pages.dev/api/progress', {
    method: 'DELETE',
    headers: { origin: 'https://evil.example', cookie: `mv_session=${encodeURIComponent(sessionCookieValue)}` },
  }),
  env,
});
check('a cross-site DELETE is refused', crossDelete.status === 403 && kv.has('u:google:abc'));
const removed = await progressCall('DELETE', null, sessionCookieValue);
const afterDelete = await progressCall('GET', null, sessionCookieValue);
const afterBody = await afterDelete.json();
check('DELETE removes the cloud row and the next read is empty',
  removed.status === 200 && !kv.has('u:google:abc') && afterDelete.status === 200 && afterBody.rev === 0 && Object.keys(afterBody.keys).length === 0);

const legacy = await legacyGoogleCallback({
  request: new Request('https://complexanalysis.pages.dev/auth/google/callback?code=abc&state=xyz'),
});
check('the old google callback redirects to /api/auth and keeps the query',
  legacy.status === 302 && legacy.headers.get('location') === '/api/auth/google/callback?code=abc&state=xyz');
const legacyX = await legacyXCallback({
  request: new Request('https://complexanalysis.pages.dev/auth/x/callback?code=abc&state=xyz'),
});
check('the old x callback redirects to /api/auth',
  legacyX.status === 302 && legacyX.headers.get('location') === '/api/auth/x/callback?code=abc&state=xyz');
const missed = await googleCallback({
  request: new Request('https://complexanalysis.pages.dev/api/auth/google/callback?code=abc&state=xyz'),
  env,
});
const missedCookies = missed.headers.getSetCookie ? missed.headers.getSetCookie() : [missed.headers.get('set-cookie') || ''];
const missedText = await missed.text();
check('a callback without the state cookie does not sign in',
  missed.status === 200
  && missed.headers.get('location') == null
  && missedText.includes('/#book')
  && missedText.includes(FAIL_NOTICE)
  && missedText.includes('history.go')
  && missedCookies.every((cookie) => !String(cookie).startsWith('mv_session=')));

const oauthish = await signToken(secret, {
  v: 1, kind: 'oauth', provider: 'google', id: '1001', handle: 'ada', verifier: 'secret-verifier', iat: 1, exp: Math.floor(now / 1000) + 600,
});
check('an oauth cookie is not a session', await readSession(secret, oauthish, now) == null);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function serve(dir) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = normalize(join(dir, pathname));
      if (!file.startsWith(normalize(dir))) {
        res.writeHead(403);
        res.end('no');
        return;
      }
      const buf = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(buf);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('missing');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function startChrome(userDataDir) {
  return new Promise((resolve, reject) => {
    const chrome = spawn('google-chrome', [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let buf = '';
    const timer = setTimeout(() => reject(new Error(`Chrome did not start\n${buf}`)), 20000);
    const onData = (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (!match) return;
      clearTimeout(timer);
      chrome.stderr.off('data', onData);
      chrome.stderr.on('data', () => {});
      resolve({ chrome, browserWs: match[1] });
    };
    chrome.stderr.on('data', onData);
    chrome.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

async function openPage(browserWs) {
  const port = new URL(browserWs).port;
  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let next = 0;
  const pending = new Map();
  const bags = { exceptions: [], console: [], bad: [] };
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') bags.exceptions.push(msg.params.exceptionDetails?.text || 'exception');
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      bags.console.push((msg.params.args || []).map((a) => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Network.responseReceived') {
      const { response } = msg.params;
      if (response.status >= 400 && !/\/api\/(me|progress)/.test(response.url)) bags.bad.push(`${response.status} ${response.url}`);
    }
  });
  const send = (method, params = {}) => {
    const id = ++next;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  return { ws, send, bags, close: () => ws.close() };
}

async function waitFor(send, expression, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.result?.value) return result.result.value;
    await new Promise((r) => setTimeout(r, 80));
  }
  const snap = await send('Runtime.evaluate', {
    expression: `location.href + ' :: ' + (document.getElementById('view') ? document.getElementById('view').dataset.state + ' ' + document.body.innerText.slice(0, 240) : (document.body ? document.body.innerText.slice(0, 240) : 'no body'))`,
    returnByValue: true,
  });
  throw new Error(`timeout: ${expression}\n${snap.result?.value || ''}`);
}

async function evalJson(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || expression);
  return result.result?.value;
}

async function loadAt(page, url, width, height) {
  page.bags.exceptions.length = 0;
  page.bags.console.length = 0;
  page.bags.bad.length = 0;
  await page.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 500,
  });
  const nav = await page.send('Page.navigate', { url });
  if (nav && nav.errorText) throw new Error(nav.errorText);
  await waitFor(page.send, `document.getElementById('view') && document.getElementById('view').dataset.state === 'ready'`);
}

const { server, port } = await serve(root);
const userDataDir = await mkdtemp(join(tmpdir(), 'mv-account-'));
let chrome;
try {
  const startedBrowser = await startChrome(userDataDir);
  chrome = startedBrowser.chrome;
  const page = await openPage(startedBrowser.browserWs);
  for (const [width, height] of [[390, 844], [1280, 800]]) {
    const label = `${width}x${height}`;
    await loadAt(page, `http://127.0.0.1:${port}/`, width, height);
    const home = await evalJson(page.send, `(() => {
      const html = document.documentElement;
      const slot = document.getElementById('account-slot');
      return {
        state: document.getElementById('view').dataset.state,
        kids: slot ? slot.childElementCount : -1,
        text: !!document.getElementById('account-signin') || !!document.getElementById('account-signout'),
        overflow: html.scrollWidth - html.clientWidth,
        header: !!document.getElementById('site-header'),
      };
    })()`);
    check(`${label} home loads with no sign-in env`, home.state === 'ready' && home.header && home.kids === 0 && home.text === false && home.overflow <= 1, JSON.stringify(home));
    check(`${label} home has no console errors`, page.bags.exceptions.length === 0 && page.bags.console.length === 0 && page.bags.bad.length === 0, JSON.stringify(page.bags));

    await loadAt(page, `http://127.0.0.1:${port}/#book`, width, height);
    const book = await evalJson(page.send, `(() => {
      const html = document.documentElement;
      const title = document.getElementById('book-title');
      const slot = document.getElementById('account-slot');
      return {
        state: document.getElementById('view').dataset.state,
        title: title ? title.textContent : '',
        kids: slot ? slot.childElementCount : -1,
        note: (document.getElementById('book-signin-note') || {}).textContent || '',
        noteHidden: !!(document.getElementById('book-signin-note') || {}).hidden,
        overflow: html.scrollWidth - html.clientWidth,
      };
    })()`);
    check(`${label} The Book loads with an empty account slot`, book.state === 'ready' && book.title === 'The Book' && book.kids === 0 && book.note === '' && book.noteHidden === true && book.overflow <= 1, JSON.stringify(book));

    const painted = await evalJson(page.send, `import('./js/core/account.js').then((mod) => {
      const slot = document.getElementById('account-slot');
      mod.paintAccount(slot, { signedIn: false, providers: { google: true, x: true } }, { location: location });
      const signEl = document.getElementById('account-signin');
      const sign = signEl.getBoundingClientRect();
      const theme = document.getElementById('theme-toggle').getBoundingClientRect();
      const header = document.getElementById('site-header').getBoundingClientRect();
      const style = getComputedStyle(signEl);
      const html = document.documentElement;
      window.dispatchEvent(new Event('resize'));
      return {
        text: (signEl.textContent || '').trim(),
        name: signEl.getAttribute('aria-label'),
        signH: Math.round(sign.height),
        signW: Math.round(sign.width),
        font: parseFloat(style.fontSize),
        sub: !!signEl.querySelector('.account-signin-sub'),
        sameRow: Math.abs(sign.top - theme.top) < 8,
        headerH: Math.round(header.height),
        border: parseFloat(style.borderTopWidth) >= 1,
        quiet: signEl.classList.contains('btn-quiet'),
        href: signEl.getAttribute('href'),
        x: !!document.getElementById('account-x'),
        note: (document.getElementById('book-signin-note') || {}).textContent || '',
        noteHidden: !!(document.getElementById('book-signin-note') || {}).hidden,
        overflow: html.scrollWidth - html.clientWidth,
      };
    })`);
    const expectNote = width >= 900 ? BOOK_SIGNIN_NOTE_WIDE : BOOK_SIGNIN_NOTE;
    check(`${label} Sign in is one bordered 44px control on the Chapters row`,
      painted.text === SIGN_IN_LABEL
      && painted.name === SIGN_IN_NAME
      && painted.signH >= 44 && painted.signW >= 44
      && painted.font >= 16.5
      && painted.sub === false
      && painted.sameRow && painted.border && painted.quiet === false
      && painted.x === false
      && painted.note === expectNote
      && painted.noteHidden === false
      && painted.headerH <= (width < 500 ? 120 : 80)
      && painted.overflow <= 1,
      JSON.stringify(painted));
    check(`${label} google link uses this origin's return path`, typeof painted.href === 'string' && painted.href.startsWith('/auth/google/start?return='));

    const signed = await evalJson(page.send, `import('./js/core/account.js').then((mod) => {
      const full = 'shael.student@university.edu';
      mod.paintAccount(document.getElementById('account-slot'), { signedIn: true, provider: 'google', handle: full, providers: { google: true } }, {
        onDelete() {},
      });
      window.dispatchEvent(new Event('resize'));
      const handle = document.getElementById('account-handle');
      const outEl = document.getElementById('account-signout');
      const out = outEl.getBoundingClientRect();
      const theme = document.getElementById('theme-toggle').getBoundingClientRect();
      const header = document.getElementById('site-header').getBoundingClientRect();
      const more = document.getElementById('account-more');
      const label = handle.querySelector('.account-signed-label');
      const addr = document.getElementById('account-address');
      const del = document.getElementById('account-delete');
      const html = document.documentElement;
      const closed = {
        label: label ? label.textContent : '',
        addrDisplay: getComputedStyle(addr).display,
        full: handle.getAttribute('aria-label'),
        title: handle.getAttribute('title'),
        out: outEl.textContent,
        h: Math.round(out.height),
        w: Math.round(out.width),
        handleH: Math.round(handle.getBoundingClientRect().height),
        border: parseFloat(getComputedStyle(handle).borderTopWidth) >= 1,
        sameRow: Math.abs(out.top - theme.top) < 8,
        closedH: Math.round(header.height),
        open: more.open,
        delH: Math.round(del.getBoundingClientRect().height),
        note: (document.getElementById('book-signin-note') || {}).textContent || '',
        overflow: html.scrollWidth - html.clientWidth,
      };
      more.open = true;
      window.dispatchEvent(new Event('resize'));
      const addrBox = addr.getBoundingClientRect();
      const delBox = del.getBoundingClientRect();
      const outOpen = outEl.getBoundingClientRect();
      del.click();
      const opened = {
        addr: addr.textContent,
        addrDisplay: getComputedStyle(addr).display,
        labelDisplay: getComputedStyle(label).display,
        left: addrBox.left,
        right: addrBox.right,
        client: html.clientWidth,
        stacked: addrBox.top < delBox.top && delBox.top < outOpen.top,
        del: del.textContent,
        delH: Math.round(delBox.height),
        line: (document.getElementById('account-status') || {}).textContent || '',
        live: (document.getElementById('route-status') || {}).textContent || '',
        overflow: html.scrollWidth - html.clientWidth,
      };
      const long = 'alexanderthegreat.student@university.edu';
      mod.paintAccount(document.getElementById('account-slot'), { signedIn: true, provider: 'google', handle: long, providers: { google: true } }, {
        onDelete() {},
      });
      const again = document.getElementById('account-more');
      again.open = true;
      window.dispatchEvent(new Event('resize'));
      const longBox = document.getElementById('account-address').getBoundingClientRect();
      opened.longLeft = longBox.left;
      opened.longRight = longBox.right;
      opened.longText = document.getElementById('account-address').textContent;
      opened.longOverflow = html.scrollWidth - html.clientWidth;
      return { closed, opened };
    })`);
    check(`${label} signed-in control is a bordered Signed in, with Sign out, and Delete stays closed`,
      signed.closed.label === SIGNED_IN_LABEL
      && signed.closed.addrDisplay === 'none'
      && signed.closed.full === 'shael.student@university.edu'
      && signed.closed.title === 'shael.student@university.edu'
      && signed.closed.out === 'Sign out'
      && signed.closed.h >= 44 && signed.closed.w >= 44
      && signed.closed.handleH >= 44
      && signed.closed.border
      && signed.closed.sameRow
      && signed.closed.open === false
      && signed.closed.delH === 0
      && signed.closed.note === ''
      && signed.closed.closedH <= (width < 500 ? 120 : 80)
      && signed.closed.overflow <= 1,
      JSON.stringify(signed.closed));
    check(`${label} opened account stacks the address, Delete saved copy, and stays on screen`,
      signed.opened.addr === 'shael.student@university.edu'
      && signed.opened.addrDisplay !== 'none'
      && signed.opened.labelDisplay === 'none'
      && signed.opened.left >= -1
      && signed.opened.right <= signed.opened.client + 1
      && signed.opened.stacked
      && signed.opened.del === DELETE_CONFIRM
      && signed.opened.delH >= 44
      && signed.opened.line === DELETE_ARM_LINE
      && signed.opened.live === DELETE_ARM_LINE
      && signed.opened.overflow <= 1
      && signed.opened.longText === 'alexanderthegreat.student@university.edu'
      && signed.opened.longLeft >= -1
      && signed.opened.longRight <= signed.opened.client + 1
      && signed.opened.longOverflow <= 1,
      JSON.stringify(signed.opened));
  }
  page.close();
} catch (err) {
  failed += 1;
  console.error('FAIL headless', err && err.stack ? err.stack : err);
} finally {
  server.close();
  if (chrome) chrome.kill('SIGKILL');
  await new Promise((r) => setTimeout(r, 300));
  await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('account smoke passed');
