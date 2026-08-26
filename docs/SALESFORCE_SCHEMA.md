# Salesforce Schema Reference

JSAN GeoSales 360 talks to a real Salesforce org over REST. This document
covers every object and field the backend reads or writes, as of the
current codebase.

**Source of truth**: `backend/app/schemas/*.py` (Pydantic request models)
cross-checked against the actual SOQL `SELECT` clauses in
`backend/app/services/salesforce_service.py`, since some fields the app
uses (e.g. GPS coordinates, GIS status, priority) are read/written
directly and never appear in a Pydantic model.

## API version and auth

- **REST API version**: `v64.0` — every endpoint is built as
  `{INSTANCE_URL}/services/data/v64.0/...` (see `backend/app/salesforce_client.py`
  and `backend/app/services/salesforce_service.py`). There is no central
  version constant; `v64.0` is hardcoded into each URL.
- **Auth method**: OAuth 2.0 **client credentials** flow against a
  connected app. `backend/app/salesforce_client.py` POSTs
  `grant_type=client_credentials` to `{SF_LOGIN_URL}/services/oauth2/token`
  at process import time, caches the resulting `access_token` /
  `instance_url`, and re-authenticates (`refresh_access_token()`)
  whenever a call comes back `401`.
- **Env vars** (`backend/.env.example`):
  - `SF_LOGIN_URL` — org/connected-app login URL (e.g. `https://your-instance.my.salesforce.com`)
  - `SF_CLIENT_ID` — connected app consumer key
  - `SF_CLIENT_SECRET` — connected app consumer secret
  - `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` — present in `.env.example` but **unused** by the app (kept for reference/future use, e.g. a username-password flow)
- Every list/detail request carries `Authorization: Bearer {ACCESS_TOKEN}`
  and `Content-Type: application/json` (`headers()` in `salesforce_client.py`).

## Shared conventions worth knowing before reading the tables

- **GPS coordinates** on `Account`, `Lead`, and `Discovery_Candidate__c` are
  not plain Number fields — they are the two auto-generated components
  (`Location__Latitude__s`, `Location__Longitude__s`) of a custom
  **Geolocation** compound field named `Location__c`. The app always
  reads/writes the `__Latitude__s`/`__Longitude__s` pair directly, never
  `Location__c` itself.
- **"Territory" fields are string codes, not lookups.** `Territory_ID__c`
  (Account/Lead) and `Assigned_Territory__c` (Discovery Candidate) hold a
  copy of `Territory_Assignment__c.Territory_Code__c` (a plain string,
  e.g. `HYD-NORTH`), not a Salesforce lookup relationship to the
  territory record. Matching a point to a territory is done in app code
  (`territory_assignment_service.py`) via point-in-polygon against
  `Boundary_GeoJSON__c`, falling back to a compass-direction sector
  implied by the territory's name.
- **Newly created Accounts/Leads/Discovery Candidates get a random
  Hyderabad-area coordinate** on creation (`_assign_random_location` in
  `salesforce_service.py`), since the "Log New X" forms don't collect a
  real location — this keeps every record visible/searchable on the GIS
  Map until real geocoding exists.
- Several picklist-like fields are written by app logic, not typed
  in by users (e.g. `Duplicate_Status__c`, `Confidence_Score__c` are
  computed by `duplicate_detection.py`).
- Two dev-org sample-data exclusion lists exist purely to hide
  Salesforce's own demo records: `SAMPLE_LEAD_IDS` (stock Developer
  Edition sample Leads) and `SAMPLE_ACCOUNT_OWNER_IDS` /
  `SAMPLE_OPPORTUNITY_OWNER_ID` (Accounts/Opportunities owned by the
  org's demo system users). These aren't schema, just query filters.

---

## Account (standard object)

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text | Account/company name | Standard |
| `Phone` | Phone | Contact number | Standard |
| `Type` | Picklist | Account type | Standard |
| `BillingCity` | Text | City (used in list views) | Standard |
| `AnnualRevenue` | Currency | Shown on the GIS Map account popup | Standard |
| `OwnerId` / `Owner.Name` | Lookup(User) | Record owner; also used to filter out Salesforce's stock demo Accounts | Standard |
| `Location__Latitude__s` | Number (Geolocation component) | GPS latitude, drives GIS Map pin placement | Custom |
| `Location__Longitude__s` | Number (Geolocation component) | GPS longitude, drives GIS Map pin placement | Custom |
| `Territory_ID__c` | Text | Territory code assigned by point-in-polygon match | Custom |
| `Sales_Priority__c` | Picklist | Sales priority (e.g. High/Medium/Low), used for map filtering and prioritization | Custom |
| `GIS_Validation_Status__c` | Picklist | Field-validation status of the record's location/data | Custom |
| `Discovery_Source__c` | Picklist/Text | How the Account originated (e.g. converted from a Discovery Candidate) | Custom |
| `Last_Visit_Date__c` | Date | Date of the most recent field visit | Custom |
| `Next_Visit_Date__c` | Date | Scheduled/expected next visit; drives the "overdue accounts" list | Custom |

**App usage**:
- `Location__Latitude__s`/`Location__Longitude__s` — set randomly on create (`_assign_random_location`), read by the GIS Map, Accounts list, and territory point-in-polygon logic.
- `Territory_ID__c` — set by `_assign_territory_by_point`/`assign_territories_by_boundary` (territory point-in-polygon assignment, triggered from the GIS Map), read by the GIS Map and Accounts list/filter-by-territory.
- `Sales_Priority__c` — read/filtered by the Accounts list and GIS Map ("filter by priority"); settable via `AccountUpdate` is **not** exposed (only `Last_Visit_Date__c`/`GIS_Validation_Status__c` are in `AccountUpdate`) — it's populated directly in Salesforce or by other flows.
- `GIS_Validation_Status__c` — read/written by the Accounts detail view (`AccountUpdate.GIS_Validation_Status__c`) and filtered on the GIS Map.
- `Discovery_Source__c` — read by the GIS Map account popup/list.
- `Last_Visit_Date__c` — written by `AccountUpdate.Last_Visit_Date__c` (e.g. after a Field Visit check-out), read by the Dashboard's "recently visited accounts" list.
- `Next_Visit_Date__c` — read by the Dashboard's "overdue accounts" list (`Next_Visit_Date__c < TODAY`).

---

## Lead (standard object)

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text | Full display name | Standard |
| `FirstName` | Text | First name | Standard |
| `LastName` | Text | Last name (required) | Standard |
| `Company` | Text | Company name (required) | Standard |
| `Status` | Picklist | Lead status (used in dashboard breakdowns) | Standard |
| `Phone` | Phone | Contact number | Standard |
| `Email` | Email | Contact email | Standard |
| `LeadSource` | Picklist | Lead source (dashboard breakdown by source) | Standard |
| `IsConverted` | Checkbox | Whether the Lead has been converted | Standard |
| `CreatedDate` | DateTime | Used for monthly lead-volume dashboard chart | Standard |
| `Location__Latitude__s` | Number (Geolocation component) | GPS latitude for GIS Map | Custom |
| `Location__Longitude__s` | Number (Geolocation component) | GPS longitude for GIS Map | Custom |
| `Territory_ID__c` | Text | Territory code assigned by point-in-polygon match | Custom |
| `Sales_Priority__c` | Picklist | Sales priority, used for map filtering | Custom |
| `GIS_Validation_Status__c` | Picklist | Field-validation status | Custom |
| `Last_Visit_Date__c` | Date | Date of most recent field visit | Custom |

**App usage**:
- `Location__Latitude__s`/`Location__Longitude__s` — set randomly on create (also on conversion from a Discovery Candidate), read by the GIS Map and territory assignment logic.
- `Territory_ID__c` — same assignment mechanism as Account; read by GIS Map/Leads list filter-by-territory.
- `Sales_Priority__c`, `GIS_Validation_Status__c` — read/filtered on the GIS Map and Leads list; `GIS_Validation_Status__c` and `Last_Visit_Date__c` are writable via `LeadUpdate`.
- The app permanently excludes a fixed list of Salesforce's own dev-org sample Lead IDs (`SAMPLE_LEAD_IDS`) from every Lead query so demo data never shows up in the UI.

---

## Opportunity (standard object)

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text | Opportunity name (required) | Standard |
| `StageName` | Picklist | Sales stage (required) | Standard |
| `Amount` | Currency | Deal value | Standard |
| `Probability` | Percent | Win probability | Standard |
| `CloseDate` | Date | Expected/actual close date (required) | Standard |
| `Type` | Picklist | Opportunity type | Standard |
| `LeadSource` | Picklist | Source of the opportunity | Standard |
| `AccountId` / `Account.Name` | Lookup(Account) | Related Account | Standard |
| `Account.Territory_ID__c`, `Account.GIS_Validation_Status__c`, `Account.Location__Latitude__s`, `Account.Location__Longitude__s` | (via relationship) | Pulled through the parent Account for the Opportunities map view | Custom (on Account) |
| `Owner.Name` | Lookup(User) | Owning rep, also used to filter out demo Opportunities | Standard |

No custom fields live on Opportunity itself — `OpportunityCreate`/`OpportunityUpdate` only touch standard fields. The GIS "Opportunities Map" feature joins through `AccountId` to read the parent Account's GIS/territory fields.

---

## Discovery_Candidate__c (custom object)

Prospective leads surfaced by discovery/scraping sources, pending review before becoming a real Lead.

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text/Auto Number | Record name | Standard |
| `Candidate_Name__c` | Text | Contact/person name | Custom |
| `Business_Name__c` | Text | Business name | Custom |
| `Address__c` | Text | Street address | Custom |
| `Phone__c` | Phone/Text | Contact number, used in duplicate matching | Custom |
| `Location__Latitude__s` | Number (Geolocation component) | GPS latitude for GIS Map | Custom |
| `Location__Longitude__s` | Number (Geolocation component) | GPS longitude for GIS Map | Custom |
| `Discovery_Source__c` | Picklist | Where the candidate was discovered | Custom |
| `Confidence_Score__c` | Number/Percent | Duplicate-match confidence, computed by `duplicate_detection.py` | Custom |
| `Validation_Status__c` | Picklist | GIS/data validation status | Custom |
| `Review_Status__c` | Picklist | Human review status (e.g. `Approved`), gates conversion to Lead | Custom |
| `Duplicate_Status__c` | Picklist | Computed duplicate classification | Custom |
| `Assigned_Territory__c` | Text | Territory code assigned by point-in-polygon match | Custom |
| `Assigned_Representative__c` | Lookup(User)/Text | Rep assigned to work the candidate | Custom |
| `Related_Account__c` | Lookup(Account) | Set if the candidate matches/becomes an existing Account | Custom |
| `Related_Lead__c` | Lookup(Lead) | **Link to the Lead this candidate converted into** — set by `convert_discovery_candidate_to_lead`, also used to block converting the same candidate twice | Custom |

**App usage**:
- `Duplicate_Status__c`/`Confidence_Score__c` — computed and written by `create_discovery_candidate`/`check_discovery_candidate_duplicates` (`duplicate_detection.py`), read by the Discovery Candidates review UI.
- `Assigned_Territory__c` — same point-in-polygon assignment as Account/Lead's `Territory_ID__c`.
- `Related_Lead__c` — written once, by `convert_discovery_candidate_to_lead`, when a candidate with `Review_Status__c = 'Approved'` is converted; the endpoint refuses to convert again if this is already set.
- `Location__Latitude__s`/`Location__Longitude__s` — random placeholder assigned on create (same reasoning as Account/Lead), deliberately excluded from duplicate spatial scoring since it's synthetic.

---

## Territory_Assignment__c (custom object)

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text/Auto Number | Record name | Standard |
| `Territory_Name__c` | Text | Display name of the territory | Custom |
| `Territory_Code__c` | Text | Short code stored on Account/Lead/Discovery Candidate's territory field | Custom |
| `Coverage_Percentage__c` | Number/Percent | Territory coverage metric | Custom |
| `Status__c` | Picklist | Territory status (e.g. `Approved`, `Pending`) | Custom |
| `Notes__c` | Long Text Area | Free-form notes | Custom |
| `Account__c` | Lookup(Account) | Optional related Account | Custom |
| `Lead__c` | Lookup(Lead) | Optional related Lead | Custom |
| `Representative__c` | Lookup(User) | Rep assigned to the territory | Custom |
| `Territory_Manager__c` | Lookup(User) | Manager who owns the territory | Custom |
| `Boundary_GeoJSON__c` | Long Text Area | **GeoJSON polygon** defining the territory's real boundary | Custom |

**App usage**:
- `Boundary_GeoJSON__c` — drawn/edited on the GIS Map's territory-boundary tool; read by `territory_assignment_service.py` for point-in-polygon matching when assigning Accounts/Leads/Discovery Candidates to a territory. Falls back to a compass-direction sector derived from `Territory_Name__c`/`Territory_Code__c` when no boundary is saved.
- `Status__c` — filters the Dashboard's active vs. inactive/pending territory lists.
- `Territory_Manager__c` — used to look up "territories by manager."

---

## Route_Plan__c (custom object)

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text | Record name (set from `Route_Name__c` on create) | Standard |
| `Route_Name__c` | Text | Route display name (required) | Custom |
| `Route_Date__c` | Date | Date the route is planned for (required) | Custom |
| `Estimated_Time__c` | Number | Estimated travel time | Custom |
| `Total_Distance__c` | Number | Estimated/optimized total distance | Custom |
| `Status__c` | Picklist | Route status | Custom |
| `Territory__c` | Lookup(Territory_Assignment__c) | Territory the route covers | Custom |
| `Sales_Representative__c` | Lookup(User) | Rep the route is assigned to | Custom |
| `Account__c` | Lookup(Account) | Optional related Account stop | Custom |
| `Lead__c` | Lookup(Lead) | Optional related Lead stop | Custom |

**App usage**: created/edited from the GIS Map's "Generate Route" flow (route optimization itself uses the OpenRouteService API via `RouteOptimizeRequest`/`RouteStop`/`RouteStart` in `routing_schema.py`, which are request-only DTOs, not Salesforce fields). `Territory__c` and `Sales_Representative__c` are used to filter routes by territory/rep.

---

## Field_Visit__c (custom object)

Check-in/check-out record for a rep visiting an Account or Lead.

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text | Record name (required) | Standard |
| `Account__c` / `Account__r.Name` | Lookup(Account) | Account visited | Custom |
| `Lead__c` / `Lead__r.Name` | Lookup(Lead) | Lead visited | Custom |
| `Representative__c` / `Representative__r.Name` | Lookup(User) | Rep who made the visit | Custom |
| `Route_Plan__c` | Lookup(Route_Plan__c) | Route this visit belongs to, if planned | Custom |
| `Visit_Date__c` | DateTime | Planned/actual visit date | Custom |
| `Check_In_Time__c` | DateTime | Check-in timestamp | Custom |
| `Check_Out_Time__c` | DateTime | Check-out timestamp | Custom |
| `Follow_up_Date__c` | Date | Follow-up date | Custom |
| `Visit_Outcome__c` | Picklist | Outcome of the visit | Custom |
| `Notes__c` | Long Text Area | Free-form visit notes | Custom |

**App usage**: written by the field check-in/check-out flow; `Account__c`/`Lead__c` link back to the visited record; `Check_In_Time__c`/`Check_Out_Time__c` and `Visit_Outcome__c` drive Account's `Last_Visit_Date__c` updates and the Dashboard's visit metrics. `Validation_Evidence__c` records attach to a Field Visit via `Field_Visit__c`.

---

## Validation_Evidence__c (custom object)

Photo/evidence proof attached to a Field Visit.

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text | Record name (required) | Standard |
| `Account__c` / `Account__r.Name` | Lookup(Account) | Account the evidence relates to | Custom |
| `Lead__c` | Lookup(Lead) | Lead the evidence relates to | Custom |
| `Field_Visit__c` / `Field_Visit__r.Name` | Lookup(Field_Visit__c) | **The visit this evidence was captured during** | Custom |
| `Verified_By__c` / `Verified_By__r.Name` | Lookup(User) | User who verified the evidence | Custom |
| `Evidence_Type__c` | Picklist | Type of evidence (e.g. photo) | Custom |
| `Photo_URL__c` | URL/Text | Link to the stored photo | Custom |
| `Validation_Date__c` | Date | Date the evidence was validated | Custom |
| `Status__c` | Picklist | Validation status | Custom |
| `Remarks__c` | Long Text Area | Reviewer remarks | Custom |

**App usage**: created from the Field Visit detail/GIS validation flow; queried by visit (`get_evidence_by_visit`), by Account (`get_evidence_by_account`), and by Lead, each pulling the related record's name through `Account__r`/`Lead__r`/`Field_Visit__r`/`Verified_By__r`.

---

## User (standard object, referenced heavily)

Not created/edited by this app as a record, but every rep/manager/verifier lookup above (`Representative__c`, `Sales_Representative__c`, `Territory_Manager__c`, `Verified_By__c`, `Owner`) points at `User`, and the app manages one custom field on it directly.

| Field API Name | Type | Purpose | Standard/Custom |
|---|---|---|---|
| `Id` | Id | Record ID | Standard |
| `Name` | Text | Display name | Standard |
| `Username` | Text | Salesforce username | Standard |
| `Email` | Email | Email address | Standard |
| `IsActive` | Checkbox | Whether the user is active (only active users are queried) | Standard |
| `GeoSales_Role__c` | Picklist/Text | This app's role for the user (maps to `ADMIN` / `SALES_MANAGER` / `FIELD_USER` in `frontend/src/config/rolePermissions.js`) | Custom |

**App usage**: `backend/app/salesforce_client.py`'s `get_salesforce_users()`/`update_salesforce_user_role()` read and write `GeoSales_Role__c` for the app's user-management screen; it's separate from the app's own JWT login (`APP_USERS` env var), which authenticates into the app rather than into Salesforce.
