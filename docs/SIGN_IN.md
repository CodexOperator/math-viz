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

The Functions build the redirect URI from the request origin.

Production:

- `https://complexanalysis.pages.dev/auth/google/callback`
- `https://complexanalysis.pages.dev/auth/x/callback`

Preview deployments use the same paths on a `*.complexanalysis.pages.dev` host. Cloudflare serves branch and deployment previews on hosts such as:

- `https://<branch>.complexanalysis.pages.dev/auth/google/callback`
- `https://<branch>.complexanalysis.pages.dev/auth/x/callback`
- `https://<deployment>.complexanalysis.pages.dev/auth/google/callback`
- `https://<deployment>.complexanalysis.pages.dev/auth/x/callback`

A branch name with a slash is flattened. `cursor/sign-in` is served at `https://cursor-sign-in.complexanalysis.pages.dev`.

Google's client form and the X app form both refuse a `*` in a callback URL. Add the production URLs, then add each preview host you actually sign in from, spelled out. The code does not send a different path than the two above.

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

The stored key is `u:google:<sub>` or `u:x:<id>`. The value is JSON: `rev`, `updatedAt`, and `keys`. A PUT larger than 64 KiB, or a body that is not that shape, is rejected.

## After it is saved

Open the production site. The header, including on The Book, shows "Sign in to keep your progress" only when that provider is fully configured. Google, X, or both, depending on which secrets are set. Signed in, the header shows the handle and Sign out.

Sign out is `POST /auth/logout`. The session cookie is `mv_session`, HttpOnly, Secure, SameSite=Lax, and it expires after 8 hours without a request. A signed-in call to `/api/me` or `/api/progress` replaces it, so a study session stays signed in.

Ticks on either device stay ticked. A flashcard or a practice record with `updatedAt` (the Leitner deck uses `updated`) keeps the later one.
