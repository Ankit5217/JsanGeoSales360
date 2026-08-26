# Local Development Setup

This guide gets a full local instance of JSAN GeoSales 360 running: the FastAPI backend, the React/Vite frontend, and the environment variables that connect them to Salesforce and to each other.

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.11+ | No strict pin is declared anywhere in the repo (no `runtime.txt`/`pyproject.toml` version pin). The reference dev environment used to build this project runs 3.14. Anything reasonably recent that supports the pinned `requirements.txt` packages (FastAPI 0.141, Pydantic 2.13, etc.) will work. |
| Node.js | `^20.19.0` or `>=22.12.0` | This is Vite 8's own `engines` requirement (`frontend/node_modules/vite/package.json`) — an older Node will fail to start the dev server. |
| npm | bundled with Node | No alternate package manager lockfile is present; use npm. |
| A Salesforce org | — | With a connected app configured for the OAuth 2.0 **client credentials** flow (the backend talks to Salesforce via `simple-salesforce` + Authlib using `SF_CLIENT_ID`/`SF_CLIENT_SECRET`, not a username/password login). Setting up the connected app itself is Salesforce-admin work outside this doc — see `docs/SALESFORCE_SCHEMA.md` for the objects/fields the app expects to exist in that org. |
| An OpenRouteService API key | — | Free tier, from https://openrouteservice.org/dev/#/signup. Powers the GIS Map's "Generate Route" feature (real road-following routes instead of straight lines). |

## 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

Copy the example env file and fill it in:

```bash
copy .env.example .env         # Windows; `cp .env.example .env` on macOS/Linux
```

`backend/.env` variables (see `backend/.env.example` for the authoritative comments):

- **`SF_LOGIN_URL`** — your Salesforce instance's login URL (e.g. `https://your-instance.my.salesforce.com`).
- **`SF_CLIENT_ID`** / **`SF_CLIENT_SECRET`** — consumer key/secret from your Salesforce connected app, used for the client-credentials OAuth flow.
- **`SF_USERNAME`** / **`SF_PASSWORD`** / **`SF_SECURITY_TOKEN`** — currently unused by the app itself; leave blank unless you know you need them.
- **`FRONTEND_URL`** — the frontend origin CORS should trust, **in addition to** the two origins already hardcoded into `backend/app/main.py` (`http://localhost:5173` and `http://127.0.0.1:5173`, Vite's default dev port). For plain local dev on the default port you can leave this blank. You need it set correctly for anything running on a different origin — see [Common pitfalls](#4-common-pitfalls) below.
- **`JWT_SECRET_KEY`** — a long random string that signs login tokens. Generate one locally:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- **`ACCESS_TOKEN_EXPIRE_MINUTES`** — optional, defaults to `480` (8 hours) if omitted.
- **`APP_USERS`** — a JSON array of login accounts: `[{"username": "...", "password_hash": "...", "role": "..."}]`. This is how you create logins for the app — there's no signup flow or user database. See below for generating entries.
- **`ORS_API_KEY`** — your OpenRouteService API key.

### Generate a login user

`APP_USERS` doesn't take plaintext passwords — you generate a hashed entry with the helper script and paste the output into the array:

```bash
python backend/scripts/make_user.py <username> <password> <role>
```

Valid roles: `ADMIN`, `SALES_MANAGER`, `FIELD_USER` (must match `frontend/src/config/rolePermissions.js`).

Example:

```bash
python backend/scripts/make_user.py admin "correct horse battery" ADMIN
```

This prints a single JSON object, e.g.:

```json
{"username": "admin", "password_hash": "...", "role": "ADMIN"}
```

Paste it into `APP_USERS` as a one-element array:

```
APP_USERS=[{"username": "admin", "password_hash": "...", "role": "ADMIN"}]
```

To create more than one login, run the script again for each user and combine the printed objects into **one** JSON array (comma-separated, still one `APP_USERS` line):

```
APP_USERS=[{"username": "admin", "password_hash": "...", "role": "ADMIN"}, {"username": "rep1", "password_hash": "...", "role": "FIELD_USER"}]
```

### Run the backend

```bash
uvicorn app.main:app --reload
```

Runs on `http://127.0.0.1:8000` by default (Uvicorn's default port; nothing in this repo overrides it). The API is now live at `http://127.0.0.1:8000` and interactive docs at `http://127.0.0.1:8000/docs`.

## 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

This must match whatever host/port the backend is actually running on. If you omit this file entirely, `frontend/src/config/apiBase.js` falls back to the same default (`http://127.0.0.1:8000`), so it's optional only if you're using the default backend port.

Then either:

**Hot-reload development:**

```bash
npm run dev
```

Starts Vite's dev server on `http://localhost:5173` (its default port — already whitelisted by the backend's CORS config, no extra setup needed).

**Production-like check** (builds the real bundle and serves it, closer to what Vercel deploys):

```bash
npm run build
npm run preview
```

`vite preview` defaults to port `4173` — **not** 5173 — which is important for CORS (see below).

## 4. Common pitfalls

**Changing `.env` while `uvicorn` is running does nothing until you restart it.**
`python-dotenv` reads `.env` once, at process startup, into `os.environ`. Uvicorn's `--reload` flag only watches `.py` source files — it has no idea `.env` changed. If you edit `APP_USERS` to fix a login's role, add a new user, or rotate `JWT_SECRET_KEY`, the running process keeps using the old values until you stop it (Ctrl+C) and run `uvicorn app.main:app --reload` again.

**CORS is an exact-origin allowlist, not a wildcard.**
`backend/app/main.py` builds `allow_origins` from two hardcoded entries (`http://localhost:5173`, `http://127.0.0.1:5173`) plus `FRONTEND_URL` if set. Any origin not in that list is silently blocked by the browser (the request fails with a CORS error, not a helpful backend error message). Concretely:
- Plain `npm run dev` on the default port 5173 works out of the box.
- `npm run preview` defaults to port **4173**, which is *not* in the hardcoded list — set `FRONTEND_URL=http://localhost:4173` (matching whatever host/protocol you're using) in `backend/.env` before testing a preview build, then restart uvicorn (per the pitfall above).
- If port 5173 (or 4173) is already in use by something else, Vite silently picks the next free port instead (5173 → 5174 → 5175, etc.) and prints the port it actually chose. If that happens, either free the original port first, or update `FRONTEND_URL` to match the port Vite actually printed — and restart uvicorn.

**A logged-in tab keeps using its old JWT after you change roles/permissions.**
The login token is stored in `sessionStorage` (`frontend/src/config/apiBase.js`) and is never re-validated against the backend on its own — a browser refresh does not fetch a new token, so the tab keeps acting under the old role until the token expires or the backend rejects it outright. After changing a user's role in `APP_USERS` (and restarting uvicorn), you must explicitly **sign out and log back in** in that browser tab to pick up the new role/permissions.

## 5. Day-to-day workflow and verifying it works

Run both servers in separate terminals:

```bash
# Terminal 1
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2
cd frontend
npm run dev
```

Then open `http://localhost:5173`:

1. You should see the login screen. Log in with a username/password you generated via `make_user.py`.
2. On success you should land on the **Dashboard**, with charts populated from live Salesforce data (not placeholders — if Salesforce env vars are wrong, expect API errors here instead).
3. Open the **GIS Map** view and confirm it renders (Leaflet tiles, account/opportunity markers, territory boundaries) — this confirms both the frontend-to-backend connection and the backend-to-Salesforce connection are working end to end.

If login fails immediately, double check `APP_USERS` is valid JSON and uvicorn was restarted after editing `.env`. If login works but data doesn't load, check the Salesforce env vars and the backend terminal's logs for the actual error.
