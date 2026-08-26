# Deployment & Operations Runbook

JSAN GeoSales 360 is deployed as two independent services:

- **Backend** (FastAPI, `backend/`) → **Render**, as a web service.
- **Frontend** (React/Vite, `frontend/`) → **Vercel**, as a static site.

They talk to each other over plain HTTPS/WSS, so the two most common ways
this deployment breaks are (1) an env var typo on one side and (2) the two
sides' URLs drifting out of sync (see [CORS handshake](#3-the-cors-handshake)
below). Read that section before touching either service's config.

---

## 1. Backend on Render

**Service type:** Web Service (not a Static Site or Background Worker — it
needs a persistent process listening on a port, and it serves a WebSocket
endpoint).

**Root directory:** `backend/`

**Build command:**

```
pip install -r requirements.txt
```

**Start command:**

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Render injects `$PORT` itself — don't hardcode a port number.

### Required environment variables

Set these in the Render dashboard under the service's **Environment** tab.
Descriptions below are pulled from `backend/.env.example`; do not commit real
values anywhere in the repo.

| Variable | Purpose |
|---|---|
| `SF_LOGIN_URL` | Salesforce org login URL for the connected app (client_credentials OAuth flow), e.g. `https://your-instance.my.salesforce.com`. |
| `SF_CLIENT_ID` | Salesforce connected app's Consumer Key. |
| `SF_CLIENT_SECRET` | Salesforce connected app's Consumer Secret. |
| `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` | Currently unused by the app itself; kept for reference/future use. Safe to leave blank. |
| `FRONTEND_URL` | The deployed Vercel origin (protocol + host, no trailing slash). Used to build the CORS allow-list — see [section 3](#3-the-cors-handshake). |
| `JWT_SECRET_KEY` | Long random string used to sign/verify login JWTs. Generate with `python -c "import secrets; print(secrets.token_hex(32))"`. Without this set, login and every Salesforce endpoint fail (the app logs a startup warning). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional. Minutes before a login token expires. Defaults to `480` (8 hours) if unset. |
| `APP_USERS` | JSON array of login accounts: `[{"username": "...", "password_hash": "...", "role": "..."}]`. Without this set, no one can log in. See the [user & role management runbook](#4-user--role-management-runbook) below for how to generate and edit entries. |
| `ORS_API_KEY` | Free OpenRouteService API key, used by "Generate Route" on the GIS Map to produce a real road-following route instead of a straight-line estimate. Sign up at https://openrouteservice.org/dev/#/signup. See [free-tier limits](#5-free-tier-limits-worth-knowing). |

**Redeploy behavior:** changing any env var in the Render dashboard triggers
an automatic redeploy of the service — no manual "deploy" click needed.
This typically completes within 1–2 minutes. Watch the Render service's
**Logs** tab to confirm the new process actually started cleanly (e.g. no
startup warning about a missing `JWT_SECRET_KEY`/`APP_USERS`, no crash on
`APP_USERS` JSON parsing).

---

## 2. Frontend on Vercel

**Root directory:** `frontend/`

**Build command:**

```
npm run build
```

(runs `vite build`, per `frontend/package.json`)

**Output directory:** `dist` (Vite's default; `frontend/vite.config.js` uses
no custom `build.outDir`, so Vercel's framework preset for Vite should
auto-detect `dist` correctly).

### Required environment variable

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the live Render backend, e.g. `https://your-app.onrender.com`. Consumed in `frontend/src/config/apiBase.js`; also used to derive the WebSocket URL (`ws(s)://.../ws`) by swapping the `http` scheme for `ws`. If unset, the app falls back to `http://127.0.0.1:8000` — i.e. it will silently try to talk to a local backend instead of Render. |

**This must be set as a Vercel project environment variable** (Project
Settings → Environment Variables), not just in a local `frontend/.env.local`
file. `.env.local` is gitignored and never reaches Vercel's build — it only
affects your own machine. Vite bakes `VITE_*` vars into the static bundle at
build time, so after adding/changing `VITE_API_BASE_URL` in Vercel you must
trigger a new deployment (a git push, or "Redeploy" in the dashboard) for it
to take effect — unlike Render, Vercel does not rebuild automatically just
because you edited an env var.

If your Vercel project has separate Preview and Production environments,
set `VITE_API_BASE_URL` for both (they can point at the same Render backend,
or different ones if you run a staging backend).

---

## 3. The CORS handshake

The backend only accepts cross-origin requests from origins it's explicitly
told about. In `backend/app/main.py`, the CORS allow-list is:

```
["http://localhost:5173", "http://127.0.0.1:5173", FRONTEND_URL]
```

`FRONTEND_URL` (Render env var) **must exactly match** the frontend's live
Vercel origin: same protocol (`https://`), same host, **no trailing slash**.
`https://your-app.vercel.app/` (trailing slash) or `http://your-app.vercel.app`
(wrong protocol) will not match `https://your-app.vercel.app` and every
request from the real frontend will be blocked by the browser's CORS check —
silently, from the app's point of view: the backend never even sees a
rejected preflight as an application-level error, it just looks like the
frontend "can't reach the API."

**These two values move together.** If you:
- change the Vercel production domain, or
- start pointing the frontend at a different Vercel deployment (e.g. a
  preview URL) that also needs to hit the live backend,

...you must update `FRONTEND_URL` on Render to match. Conversely, if you
point `VITE_API_BASE_URL` at a different Render backend, make sure that
backend's `FRONTEND_URL` includes your Vercel origin.

Only one `FRONTEND_URL` is supported at a time (plus the two hardcoded
localhost dev origins). A Vercel *preview* deployment (a different,
per-branch URL) will not be in the CORS allow-list unless you temporarily
set `FRONTEND_URL` to that preview URL — previews are not automatically
covered by the production `FRONTEND_URL` value.

---

## 4. User & role management runbook

Login accounts are **not** stored in Salesforce or a database — they live
entirely in the `APP_USERS` Render environment variable, as a JSON array:

```json
[{"username": "jane", "password_hash": "<hash>", "role": "SALES_MANAGER"}]
```

### Valid roles

Exactly three, case-sensitive, no others exist:

- `ADMIN`
- `SALES_MANAGER`
- `FIELD_USER`

There used to be an older 5-role system with different names (e.g.
`"Administrator"`). It was replaced by the three roles above. If any
`APP_USERS` entry still has an old-style role string, that user is not
denied login — they authenticate fine — but `role` won't match anything the
frontend's permission checks expect, so **every module silently denies them
access** once they're in the app. If a user reports "I can log in but I
can't see anything," check their `role` string first.

### To add or update a user

1. Run locally (needs the backend's Python environment, since it imports
   `app.auth.hash_password`):

   ```
   python backend/scripts/make_user.py <username> <password> <role>
   ```

   Example:

   ```
   python backend/scripts/make_user.py jane "correct horse battery" SALES_MANAGER
   ```

   This prints a single JSON object, e.g.:

   ```json
   {"username": "jane", "password_hash": "a1b2...$c3d4...", "role": "SALES_MANAGER"}
   ```

2. On Render, open the backend service's **Environment** tab and edit
   `APP_USERS`. It's a JSON array — **keep the existing entries** and either
   append the new object (new user) or replace one entry with the same
   `username` (updating a password or role for an existing user).

3. Save. Render redeploys automatically (typically within 1–2 minutes).

### Critical gotcha: existing sessions don't pick up the change

After Render finishes redeploying with the new `APP_USERS` value, anyone
who was **already logged in** keeps working against their old JWT — the
token itself is self-contained (signed with `JWT_SECRET_KEY`, carries
`username`/`role`/`exp`) and is never re-checked against the live
`APP_USERS` list on each request. A page refresh does not fix this, because
the token is still valid and still in the browser's `sessionStorage`.

If you changed or removed someone's role (or password), they must
**explicitly sign out and log back in** to get a fresh JWT reflecting the
new `APP_USERS` entry. Tell them this directly — "just refresh the page"
will not work.

### Who can change roles, and how

Only `ADMIN` users can manage other users from inside the app itself — the
User Roles module and its two backend endpoints
(`GET /salesforce/users`, `PUT /salesforce/users/{user_id}/role`) are gated
by `require_role("ADMIN")` in `backend/app/auth.py`. That in-app flow covers
role changes for records the app already knows about; it does **not** touch
`APP_USERS`. Every login-account change — new user, password reset, role
change for someone's login — has to go through the `APP_USERS` Render env
var process above, done manually by whoever has Render dashboard access.

---

## 5. Free-tier limits worth knowing

- **Render free web service tier cold-starts.** After a period of
  inactivity, the service spins down; the next incoming request wakes it up,
  and that first request can take noticeably longer (tens of seconds) before
  it responds. This is expected — don't treat a slow first login/API call
  after idle time as an outage. Subsequent requests are fast until it idles
  out again.
- **OpenRouteService free tier caps at 2,500 route requests/day**
  (`ORS_API_KEY`). Once the daily quota is hit, "Generate Route" on the GIS
  Map starts failing until the quota resets (ORS resets daily). If route
  generation reports failures in bulk, check the ORS dashboard for the key
  before assuming it's an app bug.

---

## 6. Deployment health checklist

After any deploy (backend, frontend, or an env var change on either), verify:

1. **Backend is up and returns real errors, not crashes.**
   `POST {RENDER_URL}/auth/login` with a bad username/password returns
   **401**, not a 500. (A 500 here usually means `JWT_SECRET_KEY` isn't set —
   check the Render logs for the startup warning.)
2. **CORS is correctly wired.** Load the live Vercel frontend, open the
   browser devtools Network tab, and confirm API calls succeed (no CORS
   error in the console, no failed preflight `OPTIONS` request).
3. **Login works end-to-end** with a real `APP_USERS` account and returns a
   token; the app lands on the dashboard, not stuck on the login screen.
4. **WebSocket connects.** With devtools open, confirm a live connection to
   `{WS_URL}/ws` (derived from `VITE_API_BASE_URL`) — check the Network tab's
   WS filter for a 101 Switching Protocols, not a failed/red connection.
5. **One real Salesforce read succeeds**, e.g. the dashboard's summary
   widgets populate, or `GET /salesforce/accounts` returns data rather than
   an auth/connection error — confirms `SF_LOGIN_URL` /`SF_CLIENT_ID`/
   `SF_CLIENT_SECRET` are correct and the connected app is reachable.
6. **Route generation works** (optional, but worth a spot-check after
   deploys touching routing) — confirms `ORS_API_KEY` is valid and under
   quota.

If step 1 or 2 fails, re-check [section 3](#3-the-cors-handshake) first —
it's the most common cause of "the whole app is broken" reports right after
a deploy.
