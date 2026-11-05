# Sign-in for progress

The study site keeps working with no accounts. Ticks and the flashcard schedule stay in the browser. Sign-in is optional. It copies that progress to a Cloudflare KV record so the same student can open the site on another device.

Nothing in this file is a secret. Do not commit client secrets, the session secret, or a KV id.

The Pages project is `complexanalysis`. Production is [https://complexanalysis.pages.dev](https://complexanalysis.pages.dev).

## What you create

Five environment variables, encrypted, on both Production and Preview:

| Name | What it is |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth client id from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret from Google Cloud |
| `X_CLIENT_ID` | OAuth 2.0 client id from the X app (not the OAuth 1.0a API key) |
| `X_CLIENT_SECRET` | OAuth 2.0 client secret from the X app |
| `SESSION_SECRET` | A long random string used only to sign the session cookie |

`SESSION_SECRET` must be at least 16 characters. Generate it locally and paste it into the dashboard:

```sh
openssl rand -base64 32
```

One KV binding:

| Variable name | Kind |
| --- | --- |
| `PROGRESS` | KV namespace |

If a provider's two variables are missing, or `SESSION_SECRET` is missing, or `PROGRESS` is not bound, that provider's button stays hidden. The page does not change.

## Callback URLs

The Functions build the redirect URI from the request origin. Register these paths. No trailing slash.

Production:

- `https://complexanalysis.pages.dev/api/auth/google/callback`
- `https://complexanalysis.pages.dev/api/auth/x/callback`

Preview deployments use the same paths on a `*.complexanalysis.pages.dev` host. Cloudflare serves branch and deployment previews on hosts such as:

- `https://<branch>.complexanalysis.pages.dev/api/auth/google/callback`
- `https://<branch>.complexanalysis.pages.dev/api/auth/x/callback`
- `https://<deployment>.complexanalysis.pages.dev/api/auth/google/callback`
- `https://<deployment>.complexanalysis.pages.dev/api/auth/x/callback`

A branch name with a slash is flattened. `cursor/sign-in` is served at `https://cursor-sign-in.complexanalysis.pages.dev`.

Google's client form and the X app form both refuse a `*` in a callback URL. Add the production URLs, then add each preview host you actually sign in from, spelled out. The code does not send a different path than the two above.

`/auth/google/callback` and `/auth/x/callback` only redirect to the `/api/auth/...` paths. They do not exchange the code. The start URLs stay `/auth/google/start` and `/auth/x/start`.

A click is a document navigation. With `not_found_handling` set to `404-page`, that navigation is the static 404 unless the Function runs first. `assets.run_worker_first` includes `/api/*` and `/auth/*` for that reason. A `fetch` of the same URL is not enough.

Authorized JavaScript origins, if Google asks:

- `https://complexanalysis.pages.dev`
- `https://<each-preview-host>.complexanalysis.pages.dev`

## Google OAuth client

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create or choose a project.
3. Configure the OAuth consent screen before creating the client. User type External is enough. App name can be `MAT 412`. Add the support email. Scopes `openid`, `email`, and `profile` are the ones the start URL requests (`openid email profile`). While the app is in testing, add the Google account that will sign in as a test user.
4. Credentials → Create credentials → OAuth client ID.
5. Application type: Web application.
6. Name: `complexanalysis`.
7. Authorized redirect URIs: the Google callback URLs from the list above. Production first. Add a preview host only when you need to sign in on that preview.
8. Create. Copy the client id into `GOOGLE_CLIENT_ID` and the client secret into `GOOGLE_CLIENT_SECRET`.

The start URL is `/auth/google/start`. The callback checks the OIDC `id_token` (issuer, audience, expiry, nonce, RS256 against Google's certs) and stores `sub` as the account id. The header shows the verified email, or the name when there is no verified email.

## X app

1. Open the [X developer portal](https://developer.x.com/en/portal/dashboard) and create a project and an app on the free tier. `users.read` is available there.
2. Set the app's User authentication settings (OAuth 2.0), not only the consumer keys.
3. App permissions: Read.
4. Type of app: Web App, confidential client.
5. Callback / redirect URI: the X callback URLs from the list above.
6. Website URL: `https://complexanalysis.pages.dev`.
7. Save. Enable the scopes `users.read` and `tweet.read`. The start URL requests `users.read tweet.read`. The site does not post. It only calls `GET /2/users/me` and reads `data.id` and `data.username`.
8. Copy the OAuth 2.0 Client ID into `X_CLIENT_ID` and the Client Secret into `X_CLIENT_SECRET`. Leave the OAuth 1.0a API key and API secret unused.

The start URL is `/auth/x/start`. The token exchange is `POST https://api.x.com/2/oauth2/token` with PKCE. The header shows `@username`.

## Pages settings

In the Cloudflare dashboard, open Workers & Pages → `complexanalysis` → Settings.

Environment variables, for Production and for Preview:

1. Add each of the five names.
2. Mark them encrypted (secret).
3. Paste the value. Do not put the value in the repo, in a pull request, or in a Wrangler file.

KV:

1. Storage & databases → KV → Create a namespace. A name such as `complexanalysis-progress` is fine. The name is not the binding.
2. Back on the Pages project → Settings → Bindings → Add → KV namespace.
3. Variable name: `PROGRESS`. This spelling is what the Functions read (`env.PROGRESS`).
4. Select the namespace. Add the binding for Production and for Preview.
5. Save. A new deployment picks up the binding. Redeploy if the current production build started before the binding existed.

The stored key is `u:google:<sub>` or `u:x:<id>`. The value is JSON: `rev`, `updatedAt`, and `keys`. A PUT larger than 64 KiB, or a body that is not that shape, is rejected. `DELETE /api/progress` from this origin removes that key. The phone's `localStorage` is left as it is.

## After it is saved

Open the production site. The header shows a bordered Sign in, with "for another device" on the control, only when Google is fully configured. X is not offered there yet: the start URL still asks for `users.read tweet.read`, which is more than an identity scope. The X routes stay in the Functions for when that scope is confirmed. Signed in, the header shows the part of the address before `@`, or `@name`. The full address is the control's accessible name and its title. Sign out stays on the page. On a wide window, Delete the copy is on that row. On a phone it is under the name.

Sign out is `POST /auth/logout`. It does not reload, and it does not move the scroll position. The session cookie is `mv_session`, HttpOnly, Secure, SameSite=Lax, and it expires after 8 hours without a request. A signed-in call to `/api/me` or `/api/progress` replaces it, so a study session stays signed in. The value is an HMAC of the account id and the handle, not the ticks.

The state cookie is `mv_oauth`. It is HttpOnly, Secure, SameSite=Lax, Path=`/api/auth`, and it lasts 10 minutes. SameSite=Lax is what lets the browser send it on the top-level redirect back from Google or X. The path is what limits it to the callback.

Ticks on either device stay ticked. An untick on one device does not clear a tick stored on the other. A flashcard keeps the copy with more reviews, and the same review count keeps the later `updated` stamp. A wrong answer on Test prep writes `practice.misses` as `{ v, steps }`. A practice-miss book keeps the larger miss count per step, and the same count keeps the later stamp. The copy that travels is ticks, the flashcard schedule, and those misses. The first signed-in load writes that union. The live region says how many ticks stayed on this phone, or that ticks came from the other phone. A later edit stays quiet. Cancelling at the provider returns to the chapter and says the ticks are still on this phone. The callback page steps back over the provider, so Back does not open the authorize URL. Signing out leaves the browser copy where it is.
