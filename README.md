# JSAN GeoSales 360

A GIS-driven field-sales platform that connects territory management to Salesforce. Reps discover businesses in the field, get them approved and converted into Salesforce Leads, receive a real road-optimized route to visit them, check in with GPS geofence verification, and log the outcome as a Salesforce Field Visit — all from one map-centric app. Built for sales organizations that manage territory-based field reps and want their prospecting-to-visit pipeline backed by real Salesforce records rather than spreadsheets.

## How it works

1. A rep spots a business and logs it as a **Discovery Candidate**.
2. The candidate is duplicate-checked against existing records.
3. Once approved, it's converted into a **Salesforce Lead**.
4. The Lead is assigned to a **territory** — either by point-in-polygon match against a drawn boundary, or a compass-direction fallback when no boundary covers it.
5. The rep gets a **road-optimized route** (via OpenRouteService) to the Lead.
6. On arrival, the rep **checks in**, verified by GPS geofence (150m radius).
7. The rep logs the visit outcome and **checks out**, writing a real Salesforce `Field_Visit__c` record.
8. A successful visit turns the Lead into a validated **Account**, against which an **Opportunity** can be opened.

## Tech stack

**Backend** (`backend/`)
- Python, [FastAPI](https://fastapi.tiangolo.com/) 0.141
- [simple-salesforce](https://github.com/simple-salesforce/simple-salesforce) for Salesforce integration (client-credentials OAuth via Authlib)
- PyJWT for login token issuance/verification
- Uvicorn as the ASGI server

**Frontend** (`frontend/`)
- React 19 + Vite 8
- Plain CSS and inline styles — no Tailwind or component library
- [react-leaflet](https://react-leaflet.js.org/) / Leaflet + Leaflet-Draw for the GIS map and territory boundary drawing
- [Recharts](https://recharts.org/) for dashboard charts
- [jsPDF](https://github.com/parallax/jsPDF) for PDF report export

**Deployment**: backend on [Render](https://render.com), frontend on [Vercel](https://vercel.com).

## Quick start

```bash
git clone <repo-url>
cd JSAN-GeoSales-360
```

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
copy .env.example .env         # fill in Salesforce, JWT, and ORS values
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

```bash
npm run dev
```

Login accounts are configured via the backend's `APP_USERS` environment variable (a JSON array of `{username, password_hash, role}`) — generate a password hash with `python backend/scripts/make_user.py <username> <password> <role>`.

Full setup detail (Salesforce connected app, OpenRouteService key, etc.) lives in [`docs/SETUP.md`](docs/SETUP.md).

## Roles

Defined in [`frontend/src/config/rolePermissions.js`](frontend/src/config/rolePermissions.js):

| Role | Can do |
|---|---|
| `ADMIN` | Everything — full access to every module and permission. |
| `SALES_MANAGER` | View/edit Accounts and Leads, create and assign work orders/routes, view work orders, manage territories, view the GIS map. |
| `FIELD_USER` | View their own assigned Accounts and Leads, view/update/complete their assigned work orders, upload visit evidence, view the GIS map. |

## Documentation

- [`docs/SETUP.md`](docs/SETUP.md) — full local setup, environment variables, and Salesforce connected app configuration.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture and how the pieces fit together.
- [`docs/SALESFORCE_SCHEMA.md`](docs/SALESFORCE_SCHEMA.md) — Salesforce objects and fields the app reads/writes.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying the backend to Render and the frontend to Vercel.
- [`docs/TEST_CASES.md`](docs/TEST_CASES.md) — test cases covering the app's core flows.
- [`docs/postman/JSAN-GeoSales-360.postman_collection.json`](docs/postman/JSAN-GeoSales-360.postman_collection.json) — Postman collection for the API.
- [`docs/workflow.html`](docs/workflow.html) — a supplementary visual architecture diagram. Note: its "Roles" section predates the current 3-role system (`ADMIN` / `SALES_MANAGER` / `FIELD_USER`) and is stale — refer to the table above instead.
