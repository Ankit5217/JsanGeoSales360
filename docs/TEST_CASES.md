# JSAN GeoSales 360 — Test Case Checklist

Formal manual/QA test cases for the FastAPI + React/Vite Salesforce-integrated GIS field-sales app. Every test case that touches Salesforce data should be verified against the actual Salesforce org (via Salesforce UI, Workbench, or a SOQL query), not just the app's own screen — the point of several of these cases is to catch the app silently disagreeing with the org it's supposed to be a client for.

Each case has: **ID**, **Title**, **Preconditions**, numbered **Steps**, and **Expected Result**.

Legend for roles: **ADMIN** (all permissions, `ROLE_PERMISSIONS.ADMIN = "ALL"`), **SALES_MANAGER**, **FIELD_USER** — as defined in `frontend/src/config/rolePermissions.js`.

---

## 1. Auth & Roles

### AUTH-01 — Valid login succeeds
**Preconditions:** A valid user exists in the `APP_USERS` env var with a known username/password and role.
**Steps:**
1. Navigate to the login screen.
2. Enter the valid username and password.
3. Submit.

**Expected Result:** Login succeeds, a JWT is stored (`sessionStorage` key `gs360_token`), and the user lands on the module their role defaults to. No error banner is shown.

### AUTH-02 — Invalid credentials are rejected
**Preconditions:** None.
**Steps:**
1. Navigate to the login screen.
2. Enter a username that doesn't exist, or a valid username with the wrong password.
3. Submit.

**Expected Result:** Login is rejected (HTTP 401 from `/auth/login` or equivalent). An error message is shown. No token is stored, and the user stays on the login screen.

### AUTH-03 — Expired/invalid JWT forces re-login
**Preconditions:** Logged in with a valid token. `ACCESS_TOKEN_EXPIRE_MINUTES` (backend `app/auth.py`, default 480 = 8 hours if `ACCESS_TOKEN_EXPIRE_MINUTES` is unset in `.env`) confirmed from the running server's `.env`.
**Steps:**
1. Note the configured token lifetime.
2. Either wait for the token to expire, or manually corrupt/replace the stored `gs360_token` value in `sessionStorage` with an invalid string.
3. Trigger any authenticated API call (e.g. reload the Accounts module).

**Expected Result:** The API returns 401 ("Invalid or expired token"). The frontend's `authFetch` helper (`frontend/src/config/apiBase.js`) clears the stored token and fires `auth:logout`, which `AuthContext` listens for and bounces the user back to the login screen.

### AUTH-04 — ADMIN sees the full module list
**Preconditions:** Logged in as a user with role `ADMIN`.
**Steps:**
1. Log in.
2. Inspect the sidebar.

**Expected Result:** Because `ROLE_PERMISSIONS.ADMIN` is the wildcard `"ALL"`, every module in `MODULE_ACCESS` is visible: **Dashboard, Accounts, Leads, Opportunities, Discovery, Territories, Routes, Field Visits, Evidence, GIS Map, User Roles**.

### AUTH-05 — SALES_MANAGER sees exactly its permitted modules
**Preconditions:** Logged in as a user with role `SALES_MANAGER`.
**Steps:**
1. Log in.
2. Inspect the sidebar.

**Expected Result:** `SALES_MANAGER`'s permissions are `VIEW_ACCOUNTS, EDIT_ACCOUNTS, VIEW_LEADS, EDIT_LEADS, CREATE_WORK_ORDER, ASSIGN_WORK_ORDER, VIEW_WORK_ORDER, VIEW_GIS, MANAGE_TERRITORIES`. Cross-referenced against `MODULE_ACCESS`, the sidebar shows exactly: **Dashboard, Accounts, Leads, Territories, Routes, Field Visits, GIS Map** (7 modules).
Not shown: **Opportunities** and **Discovery** (both have an empty `MODULE_ACCESS` list — reachable only via the `ADMIN` wildcard, not by holding any specific permission), **Evidence** (requires `UPLOAD_EVIDENCE`, which `SALES_MANAGER` lacks), and **User Roles** (empty `MODULE_ACCESS` list, admin-only).

### AUTH-06 — FIELD_USER sees exactly its permitted modules
**Preconditions:** Logged in as a user with role `FIELD_USER`.
**Steps:**
1. Log in.
2. Inspect the sidebar.

**Expected Result:** `FIELD_USER`'s permissions are `VIEW_ASSIGNED_ACCOUNTS, VIEW_ASSIGNED_LEADS, VIEW_WORK_ORDER, UPDATE_WORK_ORDER, COMPLETE_WORK_ORDER, UPLOAD_EVIDENCE, VIEW_GIS`. Cross-referenced against `MODULE_ACCESS`, the sidebar shows exactly: **Accounts** (via `VIEW_ASSIGNED_ACCOUNTS`), **Leads** (via `VIEW_ASSIGNED_LEADS`), **Field Visits** (via `VIEW_WORK_ORDER`/`UPDATE_WORK_ORDER`/`COMPLETE_WORK_ORDER`), **Evidence** (via `UPLOAD_EVIDENCE`), **GIS Map** (via `VIEW_GIS`) (5 modules).
Not shown: **Dashboard, Opportunities, Discovery, User Roles** (all empty `MODULE_ACCESS`, admin-only), **Territories** (needs `MANAGE_TERRITORIES`, which `FIELD_USER` lacks), **Routes** (needs `CREATE_WORK_ORDER` or `ASSIGN_WORK_ORDER`, which `FIELD_USER` lacks).

### AUTH-07 — Role without EDIT_ACCOUNTS cannot create/edit Accounts
**Preconditions:** Logged in as `FIELD_USER` (no `EDIT_ACCOUNTS`).
**Steps:**
1. Open the Accounts module.
2. Look for a "Log New Account" (or equivalent create) button.
3. Look for a per-row "Edit" button/action on any listed account.

**Expected Result:** `canEdit` (`can("EDIT_ACCOUNTS")` in `frontend/src/components/modules/Accounts.jsx`) is false, so neither the create button, the create form, nor any row's Edit button is rendered. The account list itself is still viewable (read-only), scoped to assigned accounts via `VIEW_ASSIGNED_ACCOUNTS`.

### AUTH-08 — Role without EDIT_LEADS cannot create/edit Leads
**Preconditions:** Logged in as `FIELD_USER` (no `EDIT_LEADS`).
**Steps:**
1. Open the Leads module.
2. Look for a "Log New Lead" (or equivalent create) button.
3. Look for a per-row "Edit" button/action on any listed lead.

**Expected Result:** `canEdit` (`can("EDIT_LEADS")` in `frontend/src/components/modules/Leads.jsx`) is false, so neither the create button, the create form, nor any row's Edit button is rendered.

### AUTH-09 — SALES_MANAGER can create/edit Accounts and Leads
**Preconditions:** Logged in as `SALES_MANAGER` (has `EDIT_ACCOUNTS` and `EDIT_LEADS`).
**Steps:**
1. Open Accounts, confirm the create button and per-row Edit buttons are visible.
2. Open Leads, confirm the same.

**Expected Result:** Both create and edit controls are visible and functional on both modules.

### AUTH-10 — Role without MANAGE_TERRITORIES doesn't see the Territory Boundaries panel in GIS Map
**Preconditions:** Logged in as `FIELD_USER` (no `MANAGE_TERRITORIES`).
**Steps:**
1. Open the GIS Map module.
2. Open the map's side controls panel.

**Expected Result:** `canManageTerritories` (`can("MANAGE_TERRITORIES")` in `frontend/src/components/mapview.jsx`) is false, so the entire "Territory Boundaries" section — the draw/edit dropdown, "Recalculate Territory Assignments" button, and "Realign Coordinates to Territories" button — is not rendered.

### AUTH-11 — Role without CREATE_WORK_ORDER/ASSIGN_WORK_ORDER doesn't see the Route Planning panel in GIS Map
**Preconditions:** Logged in as `FIELD_USER` (has neither `CREATE_WORK_ORDER` nor `ASSIGN_WORK_ORDER`).
**Steps:**
1. Open the GIS Map module.
2. Open the map's side controls panel.

**Expected Result:** `canPlanRoutes` (`can("CREATE_WORK_ORDER") || can("ASSIGN_WORK_ORDER")` in `mapview.jsx`) is false, so the "Route Planning" section (territory selector, "Generate Route" flow) is not rendered.

### AUTH-12 — Role without UPDATE_WORK_ORDER doesn't see check-in/check-out controls in GIS Map
**Preconditions:** A role/user without `UPDATE_WORK_ORDER` (e.g. `SALES_MANAGER`, which lacks it).
**Steps:**
1. Open the GIS Map module.
2. Click a pin for an Account or Lead whose visit status is pending or whose validation status isn't "Validated".
3. Inspect the detail panel's "Field Visit" section.

**Expected Result:** `canUpdateWorkOrder` (`can("UPDATE_WORK_ORDER")` in `mapview.jsx`) is false, so the "Check in (verify geofence)" button and the rest of the check-in/outcome/check-out flow do not render — only the read-only visit status line is shown.

---

## 2. Discovery Candidate Workflow

### DISC-01 — Log a new discovery candidate
**Preconditions:** Logged in as a role with access to Discovery (ADMIN).
**Steps:**
1. Open the Discovery module.
2. Fill in candidate name/business name, phone, address, and location.
3. Submit.

**Expected Result:** A new `Discovery_Candidate__c` record is created in Salesforce with the submitted fields and an initial `Duplicate_Status__c`/`Review_Status__c`. The candidate appears in the Discovery list.

### DISC-02 — Duplicate detection flags a near-match by phone
**Preconditions:** An existing Lead, Account, or Discovery Candidate exists with a known phone number.
**Steps:**
1. Log (or run "check duplicates" on) a new candidate using the same phone number as the existing record, with a different name/address.
2. Trigger the duplicate check.

**Expected Result:** The exact phone match (normalized digits-only comparison) contributes 40 of 100 scoring points (`backend/app/services/duplicate_detection.py`, `_score_match`). Combined with any name/address similarity, the match is surfaced in the duplicate panel with `"phone"` listed among `matched_on` reasons, score ≥ 30 (`MIN_REPORTABLE_SCORE`).

### DISC-03 — Duplicate detection flags a near-match by name/address text similarity
**Preconditions:** An existing record with a similar (not identical) business name and address.
**Steps:**
1. Log a candidate with a name ≥60% similar (`SequenceMatcher` ratio) to the existing record's name, and a similar address.
2. Trigger the duplicate check.

**Expected Result:** Name similarity contributes up to 35 points, address similarity up to 15 points, both flagged in `matched_on` when their ratio is ≥ 0.6. The match appears in the duplicate panel with a combined score.

### DISC-04 — Duplicate detection flags a near-match by spatial proximity
**Preconditions:** An existing record with a known lat/lng.
**Steps:**
1. Log a candidate whose coordinates are within 50m of the existing record's coordinates (different name/phone/address).
2. Trigger the duplicate check.

**Expected Result:** Distance ≤50m contributes 25 points; ≤150m contributes 15 points; ≤500m contributes 5 points (`_spatial_score`). The match is surfaced with `"location"` in `matched_on` and the actual computed `distance_meters` shown in the duplicate panel.

### DISC-05 — Duplicate classification thresholds
**Preconditions:** Duplicate detection has run against a candidate.
**Steps:**
1. Log a candidate that scores ≥65 against an existing Lead → confirm status is `Existing Lead`.
2. Log a candidate that scores ≥65 against an existing Account → confirm status is `Existing Account`.
3. Log a candidate that scores ≥80 (but not against a Lead/Account at ≥65) → confirm status is `Confirmed Duplicate`.
4. Log a candidate that scores 50–79 → confirm status is `Possible Duplicate`.
5. Log a candidate that scores <50 with no matches → confirm status is `Unique`.

**Expected Result:** `Duplicate_Status__c` on the candidate matches the classification rules in `classify_duplicate_status()` for each scenario.

### DISC-06 — Manager approves a candidate
**Preconditions:** A candidate exists with `Review_Status__c` not yet `Approved`. Logged in as a role that can review (ADMIN/SALES_MANAGER).
**Steps:**
1. Open the Discovery module.
2. Click "Approve" on the candidate.

**Expected Result:** `Review_Status__c` updates to `Approved` in Salesforce. The "Approve" button becomes disabled; "Convert to Lead" becomes enabled (previously disabled/tooltipped "Approve this candidate first").

### DISC-07 — Manager rejects a candidate
**Preconditions:** A candidate exists with `Review_Status__c` not yet `Rejected`.
**Steps:**
1. Open the Discovery module.
2. Click "Reject" on the candidate.

**Expected Result:** `Review_Status__c` updates to `Rejected` in Salesforce. "Convert to Lead" remains disabled (tooltip: "Approve this candidate first").

### DISC-08 — Approved, non-duplicate candidate converts to a real Lead
**Preconditions:** A candidate with `Review_Status__c = Approved` and `Duplicate_Status__c = Unique` (or otherwise not blocked).
**Steps:**
1. Open the Discovery module.
2. Click "Convert to Lead" on the approved candidate.
3. Confirm the action if prompted.

**Expected Result:** `POST /discovery-candidates/{id}/convert-to-lead` succeeds. A new real `Lead` record is created in Salesforce (verify via Salesforce UI/SOQL, not just the app) carrying over the candidate's name, phone, address, and coordinates. The Discovery list marks the candidate "Converted ✓" and the "Convert to Lead" button becomes permanently disabled for that candidate. The new Lead is visible in the Leads module and on the GIS Map.

---

## 3. Territories

### TERR-01 — Draw and save a territory boundary polygon
**Preconditions:** Logged in as a role with `MANAGE_TERRITORIES` (ADMIN or SALES_MANAGER). A territory exists with no boundary yet.
**Steps:**
1. Open GIS Map → Territory Boundaries panel.
2. Select the territory from "Draw / edit a territory...".
3. Use the map's drawing tool (top-right corner) to draw a polygon.
4. Click "Save Boundary".

**Expected Result:** The territory's `Boundary_GeoJSON__c` field is updated in Salesforce with the drawn polygon's GeoJSON. Re-selecting the territory in the dropdown now shows "(has boundary)". The polygon renders on the map when "Show territory boundaries" is checked.

### TERR-02 — Delete a boundary via trash tool and verify Salesforce is actually cleared
**Preconditions:** A territory with an existing saved boundary (from TERR-01).
**Steps:**
1. Open GIS Map → Territory Boundaries panel, select the territory with a boundary.
2. Use the map's trash tool, click the drawn shape, then click its checkmark to confirm deletion in the map UI.
3. Click "Save (Clear Boundary)".
4. Reload the page (hard refresh) and re-open the Territory Boundaries panel for the same territory.
5. Independently query the territory record in Salesforce (Workbench/SOQL) for `Boundary_GeoJSON__c`.

**Expected Result:** After step 3, the button flow completes without error. After step 4, the dropdown option for that territory no longer shows "(has boundary)" — confirming the deletion persisted server-side and isn't just a client-side visual removal. Step 5 confirms `Boundary_GeoJSON__c` is null/blank directly in Salesforce.

### TERR-03 — Recalculate Territory Assignments moves records into the boundary that actually contains them
**Preconditions:** At least two territories have saved boundary polygons. At least one Account or Lead has coordinates that fall inside a boundary different from its currently assigned territory.
**Steps:**
1. Note the current territory assignment of the misassigned record.
2. Open GIS Map → Territory Boundaries panel, click "Recalculate Territory Assignments".
3. Wait for the success message.
4. Re-check the record's territory assignment (in Accounts/Leads module or on the map).

**Expected Result:** The backend runs point-in-polygon (`point_in_geojson_polygon`, ray-casting) against every territory's real boundary (falling back to the compass-direction sector derived from the territory's name for any territory without a drawn boundary — see `find_territory_code_for_point` in `backend/app/services/territory_assignment_service.py`) and reassigns each record to whichever territory's polygon actually contains its coordinates. The previously-misassigned record now shows the correct territory, matching where its lat/lng geometrically falls.

### TERR-04 — Realign Coordinates to Territories moves each record's pin inside its assigned territory
**Preconditions:** At least one record is assigned to a territory but its stored lat/lng falls outside that territory's real boundary (or outside the compass sector implied by the territory's name, for territories without a drawn boundary).
**Steps:**
1. Open GIS Map → Territory Boundaries panel, click "Realign Coordinates to Territories".
2. Wait for the success message.
3. For a sample of Accounts, Leads, and Discovery Candidates, compare each record's new coordinates against its assigned territory's boundary polygon (or, if the territory has no drawn boundary, against the compass direction implied by the territory's name — e.g. "Hyderabad North" records should end up north of the metro-area center).

**Expected Result:** For every checked record, the new coordinate satisfies `point_in_geojson_polygon` against its territory's real saved boundary if one exists, otherwise `point_in_direction_sector` (within 45° of the territory's compass bearing) if the territory name encodes a direction (`generate_point_for_territory` / `random_point_in_polygon`). No record ends up with a pin outside both checks.

---

## 4. GIS Map

### GIS-01 — Pins render for Accounts, Leads, and Opportunities
**Preconditions:** At least one Account, one Lead, and one Opportunity exist with valid coordinates.
**Steps:**
1. Open the GIS Map module with no filters applied.

**Expected Result:** Pins are visible on the map for all three record types, visually distinguishable (e.g. by icon/color per type), matching the counts of geolocated records returned by `/gis/accounts`, `/gis/leads`, `/gis/opportunities`.

### GIS-02 — Territory filter narrows the pin set correctly
**Preconditions:** Records exist across at least two different territories.
**Steps:**
1. Open GIS Map.
2. Select a specific territory from the Territory filter dropdown.

**Expected Result:** Only pins whose `territory` matches the selected value remain visible; pins from other territories disappear. Clearing the filter (back to "All") restores the full pin set.

### GIS-03 — Priority filter narrows the pin set correctly
**Preconditions:** Records exist with varying priority (e.g. High/Medium/Low).
**Steps:**
1. Open GIS Map.
2. Select a specific priority from the Priority filter dropdown.

**Expected Result:** Only pins matching the selected priority remain visible.

### GIS-04 — Type filter narrows the pin set correctly
**Preconditions:** Records exist for Accounts, Leads, and Opportunities.
**Steps:**
1. Open GIS Map.
2. Set the Record Type filter to "Accounts" only.
3. Repeat for "Leads" and "Opportunities".

**Expected Result:** In each case, only pins of the selected `type` (`customer` / `lead` / `opportunity`) remain visible; all others are hidden.

### GIS-05 — Search filter narrows the pin set correctly
**Preconditions:** Records with distinct, known names exist.
**Steps:**
1. Open GIS Map.
2. Type a specific record's name (or a distinctive substring) into the search box.

**Expected Result:** Only pins whose name/relevant fields match the search text remain visible.

### GIS-06 — Combined filters apply as AND, not OR
**Preconditions:** Records exist that vary independently on territory, priority, and type.
**Steps:**
1. Set a Territory filter, a Priority filter, and a Type filter simultaneously (values chosen so at least one record matches all three and at least one record matches only some).

**Expected Result:** Only records matching all active filters simultaneously remain visible (per the `filteredMapRecords` logic in `mapview.jsx`, which ANDs `typeFilter`, `territoryFilter`, `priorityFilter`, and the search text together).

### GIS-07 — Clicking a pin opens the detail panel
**Preconditions:** At least one pin is rendered on the map.
**Steps:**
1. Click any pin.

**Expected Result:** A detail panel opens showing the record's name, territory, priority/stage, owner, opportunity value, and (for Accounts/Leads) discovery source, validation status, last/next visit, and the Field Visit section.

---

## 5. Route Generation

### ROUTE-01 — Generate Route for a territory with 2+ pending stops returns a real road-following route
**Preconditions:** Logged in as a role with `canPlanRoutes` (`CREATE_WORK_ORDER` or `ASSIGN_WORK_ORDER`). A territory has at least 2 Accounts/Leads with pending visit status and valid coordinates. `ORS_API_KEY` is configured on the backend.
**Steps:**
1. Open GIS Map → Route Planning panel.
2. Select the territory with ≥2 pending stops.
3. Click "Generate Route".

**Expected Result:** `POST /routing/optimize` calls OpenRouteService's VROOM-based `/optimization` endpoint (`backend/app/services/routing_service.py`) and returns a real, optimized visiting order plus actual road-following route `geometry`, a non-zero `distance_meters`, and a non-zero `duration_seconds`. The rendered route on the map visibly follows roads (curves/turns matching the street network) rather than drawing a straight line between stops. Distance and ETA shown in the UI are plausible for the stops' real-world separation (not, e.g., a straight-line haversine distance).

### ROUTE-02 — Generate Route with no stops fails gracefully
**Preconditions:** A territory with zero pending Accounts/Leads.
**Steps:**
1. Open Route Planning, select the empty territory.
2. Click "Generate Route".

**Expected Result:** Request fails with a clear error (backend returns HTTP 400 "No stops provided for route optimization"); UI surfaces the error instead of hanging or showing a blank/broken route.

### ROUTE-03 — Generate Route fails clearly when ORS is not configured
**Preconditions:** `ORS_API_KEY` unset on the backend (staging/test only — do not disable in production).
**Steps:**
1. Attempt to generate a route for any valid territory.

**Expected Result:** Backend returns HTTP 503 ("Routing is not configured"); UI shows a clear error rather than a silent failure or fake straight-line route.

---

## 6. Field Visit Lifecycle

### VISIT-01 — Check in within the 150m geofence succeeds and shows real distance
**Preconditions:** Logged in as a role with `UPDATE_WORK_ORDER`. Browser location permission granted. A selected Account/Lead has saved coordinates, and the tester's actual/simulated GPS position is within 150m of them.
**Steps:**
1. Open GIS Map, click the pin for the target Account/Lead.
2. In the Field Visit section, click "Check in (verify geofence)".

**Expected Result:** The browser's `getCurrentPosition` is used to compute the real haversine distance between the device's position and the record's stored coordinates (`useFieldVisit.js`). Since distance ≤ `GEOFENCE_RADIUS_METERS` (150), the panel shows "✓ {distance}m from location — within 150m geofence" with the actual rounded distance in meters, and reveals the Outcome/Notes/Follow-up/Check-out form.

### VISIT-02 — Check in outside the geofence fails with the distance shown
**Preconditions:** Same as VISIT-01, but the tester's GPS position is more than 150m from the record's coordinates.
**Steps:**
1. Open the pin's detail panel.
2. Click "Check in (verify geofence)".

**Expected Result:** Computed distance exceeds 150m; the panel shows "⚠ Outside geofence — {distance}m away, move closer and retry" with the real computed distance. The outcome/notes/check-out form is not revealed. A "Check in" retry button remains available.

### VISIT-03 — Check in with no saved location on the record is rejected clearly
**Preconditions:** An Account/Lead with null lat/lng.
**Steps:**
1. Open its detail panel and click "Check in".

**Expected Result:** Error shown: "This record has no saved location to verify your position against." `geofenceOk` is set to false; no distance is claimed.

### VISIT-04 — Log outcome/notes/follow-up and check out
**Preconditions:** Successfully checked in within geofence (VISIT-01 state).
**Steps:**
1. Select a Visit Outcome from the dropdown.
2. Enter free-text Notes.
3. Optionally set a Follow-up Date.
4. Click "Check out".

**Expected Result:** `updateAccount`/`updateLead` sets `Last_Visit_Date__c` to today and `GIS_Validation_Status__c` to `"Validated"` on the underlying Salesforce record. A new `Field_Visit__c` record is created (`createFieldVisit`) with `Check_In_Time__c` set to the actual check-in timestamp and `Check_Out_Time__c` set to the check-out timestamp, plus the entered `Visit_Outcome__c`, `Notes__c`, and `Follow_up_Date__c`. The check-in/outcome form resets after success.

### VISIT-05 — Verify the real Field_Visit__c record and validation status in Salesforce
**Preconditions:** VISIT-04 completed for a known Account/Lead.
**Steps:**
1. Independently query Salesforce (Workbench/SOQL or the Salesforce UI) for the newly created `Field_Visit__c` record related to that Account/Lead.
2. Query the parent Account/Lead's `GIS_Validation_Status__c` and `Last_Visit_Date__c`.

**Expected Result:** The `Field_Visit__c` record exists with real, non-null `Check_In_Time__c` and `Check_Out_Time__c` timestamps matching when the check-in/check-out actually occurred (not placeholder/zero values), and the correct `Visit_Outcome__c`/`Notes__c`/`Follow_up_Date__c`. The parent record's `GIS_Validation_Status__c` is `"Validated"` and `Last_Visit_Date__c` is today's date — confirmed directly in Salesforce, not just in the app's UI.

---

## 7. Opportunities

### OPP-01 — Open an Opportunity against a validated Account
**Preconditions:** An Account exists with `GIS_Validation_Status__c = Validated` (e.g. from VISIT-04/05). Logged in as ADMIN (Opportunities is admin-only per `MODULE_ACCESS`).
**Steps:**
1. Open the Opportunities module.
2. Create/open an Opportunity linked to the validated Account.

**Expected Result:** The Opportunity opens/creates successfully, `StageName` defaults to a valid stage (e.g. "Prospecting"), and the linked Account is the validated one.

### OPP-02 — Progress an Opportunity through stages to Closed Won
**Preconditions:** An Opportunity exists in an early stage.
**Steps:**
1. Edit the Opportunity and step its stage forward through the picklist: Prospecting → Qualification → Needs Analysis → Value Proposition → Id. Decision Makers → Perception Analysis → Proposal/Price Quote → Negotiation/Review → Closed Won, saving at each step (or in one edit to the final stage).

**Expected Result:** Each stage transition persists (`StageName` updated in Salesforce via `PUT /opportunities/{id}`). At "Closed Won", the Opportunity is visually tagged with the Closed Won color treatment and its value is reflected in the "Closed Won Value" summary total on the Opportunities screen.

### OPP-03 — Progress an Opportunity to Closed Lost
**Preconditions:** An Opportunity exists in an open stage.
**Steps:**
1. Edit the Opportunity's stage to "Closed Lost" and save.

**Expected Result:** `StageName` updates to "Closed Lost" in Salesforce; the record is tagged with the Closed Lost color treatment and no longer counts toward the Closed Won summary.

---

## 8. Dashboard / AI Executive Analytics

### DASH-01 — Closed Won count matches a direct Salesforce count exactly
**Preconditions:** A known, fixed set of Opportunities with `StageName = "Closed Won"` exists in Salesforce.
**Steps:**
1. Independently query Salesforce (SOQL: `SELECT COUNT(Id) FROM Opportunity WHERE StageName = 'Closed Won'`, or count via the Salesforce UI) for the Closed Won count/value.
2. Open the Dashboard / AI Executive Analytics panel in the app.
3. Read the "Closed Won Value" (or equivalent Closed Won KPI).

**Expected Result:** The app's figure exactly matches the independently-queried Salesforce figure — no off-by-one, no stale cache, no double-counting. If they differ, this is a defect regardless of which direction the discrepancy runs.

### DASH-02 — Executive Health Score and Validation Rate are internally consistent
**Preconditions:** Dashboard loaded with real data.
**Steps:**
1. Note `validationRate` and `executiveHealthScore` shown.
2. Spot-check `validationRate` by independently counting `GIS_Validation_Status__c = 'Validated'` records over total records in Salesforce.

**Expected Result:** Displayed validation rate matches the independently-counted percentage (within rounding).

---

## 9. Real-time (WebSocket)

### RT-01 — Field visit check-out in one tab updates another tab's Live AI Alerts/Activity Feed automatically
**Preconditions:** Two browser tabs/windows are open and logged in (same or different eligible users), both on a screen where the live feed WebSocket connects (GIS Map). Both tabs' WebSocket connections are confirmed open (console log "Real-time WebSocket connected" in both).
**Steps:**
1. In Tab A, complete a full field visit check-out (VISIT-04) for any Account/Lead.
2. Without refreshing, observe Tab B's Live AI Alerts and Activity Feed panels.

**Expected Result:** The backend's `PUT /visits/{visit_id}` broadcasts a `field_visit_updated` WebSocket event (`backend/app/realtime.py` / `salesforce_router.py`) to all connected clients. Tab B — with no manual refresh or navigation — receives the event via its open WebSocket (`useLiveFeed.js`), automatically reloads accounts/leads, and prepends a new "Field Visit Updated" entry to both the Live Alerts list and the Activity Feed, each stamped with the current time.

### RT-02 — WebSocket reconnect / disconnect is silent to the user
**Preconditions:** A tab has an open live-feed WebSocket connection.
**Steps:**
1. Briefly stop and restart the backend (or otherwise force the WebSocket connection to drop).
2. Observe the tab.

**Expected Result:** Console logs "WebSocket disconnected" without a user-facing crash. (Note: confirm whether the client auto-reconnects — if not, flag as a gap, since `useLiveFeed.js`'s effect only opens the connection once on mount.)

---

## 10. Exports

### EXPORT-01 — Download PDF produces the executive report with no console errors
**Preconditions:** Dashboard / AI Executive Analytics panel loaded with data. Browser dev console open.
**Steps:**
1. Click "Download PDF" (executive report).

**Expected Result:** A file named `JSAN_GeoSales_Executive_Report.pdf` downloads. Opening it shows the JSAN GeoSales 360 header, "AI Executive Report" subtitle, a generation timestamp, and populated Executive Summary, Business Health, Territory Performance, and AI Executive Recommendation sections with real (non-placeholder) numbers matching the on-screen analytics. No errors appear in the browser console during generation.

### EXPORT-02 — Export CSV produces business data with no console errors
**Preconditions:** GIS Map or Dashboard loaded with account/opportunity records. Browser dev console open.
**Steps:**
1. Click "Export CSV" (business data).

**Expected Result:** A file named `JSAN_GeoSales_Business_Data.csv` downloads, with header row `Account,Territory,Priority,Revenue,Latitude,Longitude` and one data row per record, values matching what's shown on screen. No console errors.

### EXPORT-03 — Export AI Report produces the activity CSV with no console errors
**Preconditions:** Live Activity Feed has at least one entry (e.g. from RT-01). Browser dev console open.
**Steps:**
1. Click "Export AI Report" (activity CSV).

**Expected Result:** A file named `JSAN_GeoSales_AI_Activity_Report.csv` downloads, with header row `Time,Activity,Message` and one row per activity-feed entry, matching what's shown in the Activity Feed panel. No console errors.

---

## Summary

| Section | Test Case IDs | Count |
|---|---|---|
| Auth & Roles | AUTH-01 – AUTH-12 | 12 |
| Discovery Candidate Workflow | DISC-01 – DISC-08 | 8 |
| Territories | TERR-01 – TERR-04 | 4 |
| GIS Map | GIS-01 – GIS-07 | 7 |
| Route Generation | ROUTE-01 – ROUTE-03 | 3 |
| Field Visit Lifecycle | VISIT-01 – VISIT-05 | 5 |
| Opportunities | OPP-01 – OPP-03 | 3 |
| Dashboard / AI Executive Analytics | DASH-01 – DASH-02 | 2 |
| Real-time | RT-01 – RT-02 | 2 |
| Exports | EXPORT-01 – EXPORT-03 | 3 |
| **Total** | | **49** |
