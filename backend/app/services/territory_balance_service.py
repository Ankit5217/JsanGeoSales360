import json
import math
from urllib.parse import quote

from app.salesforce_client import INSTANCE_URL
from app.schemas.territory_balance_schema import TerritoryBalanceProposal
from app.services.salesforce_service import (
    SAMPLE_LEAD_IDS,
    get_territory_assignments,
    sf_request,
)

# An assumed average deal size per Lead priority, in the org's currency -
# Leads have no revenue field to sum, so "potential" for a Lead is this flat
# estimate rather than a real number. Disclosed to the caller via the
# response, not hidden.
LEAD_PRIORITY_WEIGHT = {
    "High": 500000,
    "Medium": 200000,
    "Low": 50000,
}

OVERLOAD_THRESHOLD = 0.2  # 20% above/below fair share triggers a rebalance
HULL_PADDING_FACTOR = 1.12  # expand a recomputed hull ~12% outward from its centroid
SINGLETON_PAD_DEGREES = 0.015  # ~1.5km square drawn around 1-2 leftover points


def _escape(value):
    return (value or "").replace("'", "\\'")


def _distance(a, b):
    return math.hypot(a["lat"] - b[0], a["lng"] - b[1])


def _centroid(members):
    if not members:
        return None
    return (
        sum(m["lat"] for m in members) / len(members),
        sum(m["lng"] for m in members) / len(members),
    )


def _boundary_centroid_fallback(boundary_geojson):
    """Cheap centroid stand-in (bbox midpoint) for a territory with no
    members left to average - just needs to be roughly in the right place
    for ranking incoming candidates, not exact."""
    try:
        geometry = json.loads(boundary_geojson)
        coords = geometry.get("coordinates")
        points = coords[0] if geometry.get("type") == "Polygon" else coords[0][0]
        lats = [p[1] for p in points]
        lngs = [p[0] for p in points]
        return (sum(lats) / len(lats), sum(lngs) / len(lngs))
    except Exception:
        return None


def _convex_hull(points):
    """Andrew's monotone chain. `points` is a list of (lng, lat) tuples
    (GeoJSON coordinate order). Returns the hull in the same order, open
    (first point not repeated)."""
    pts = sorted(set(points))

    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]


def _boundary_for_members(members):
    """Builds a GeoJSON Polygon geometry that contains every member point,
    padded outward so the boundary comfortably contains them (not passes
    exactly through them). None if there are no members to bound."""
    if not members:
        return None

    lng_lat_points = [(m["lng"], m["lat"]) for m in members]
    hull = _convex_hull(lng_lat_points) if len(lng_lat_points) >= 3 else lng_lat_points

    # Also covers the degenerate case where 3+ points are (near-)collinear -
    # the hull collapses to 2 points, same as a real singleton/pair.
    if len(hull) < 3:
        cx = sum(p[0] for p in lng_lat_points) / len(lng_lat_points)
        cy = sum(p[1] for p in lng_lat_points) / len(lng_lat_points)
        ring = [
            (cx - SINGLETON_PAD_DEGREES, cy - SINGLETON_PAD_DEGREES),
            (cx + SINGLETON_PAD_DEGREES, cy - SINGLETON_PAD_DEGREES),
            (cx + SINGLETON_PAD_DEGREES, cy + SINGLETON_PAD_DEGREES),
            (cx - SINGLETON_PAD_DEGREES, cy + SINGLETON_PAD_DEGREES),
        ]
    else:
        cx = sum(p[0] for p in hull) / len(hull)
        cy = sum(p[1] for p in hull) / len(hull)
        ring = [
            (cx + (x - cx) * HULL_PADDING_FACTOR, cy + (y - cy) * HULL_PADDING_FACTOR)
            for x, y in hull
        ]

    ring.append(ring[0])  # GeoJSON rings must close

    return {
        "type": "Polygon",
        "coordinates": [[[round(lng, 6), round(lat, 6)] for lng, lat in ring]],
    }


def _fetch_members(territory_codes):
    """Every Account/Lead currently assigned to one of `territory_codes`,
    with coordinates - the raw material for both scoring and geometry."""
    if not territory_codes:
        return []

    codes = ", ".join(f"'{_escape(c)}'" for c in territory_codes)
    members = []

    account_query = f"""
    SELECT Id, Name, Location__Latitude__s, Location__Longitude__s,
           Territory_ID__c, AnnualRevenue
    FROM Account
    WHERE Territory_ID__c IN ({codes})
    AND Location__Latitude__s != NULL
    """
    accounts = sf_request(
        "GET", f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(account_query)}"
    ).json()["records"]

    for record in accounts:
        members.append({
            "record_type": "Account",
            "id": record.get("Id"),
            "name": record.get("Name"),
            "lat": record.get("Location__Latitude__s"),
            "lng": record.get("Location__Longitude__s"),
            "territory_code": record.get("Territory_ID__c"),
            "value": record.get("AnnualRevenue") or 0,
        })

    excluded_ids = ", ".join(f"'{lead_id}'" for lead_id in SAMPLE_LEAD_IDS)
    lead_query = f"""
    SELECT Id, Name, Location__Latitude__s, Location__Longitude__s,
           Territory_ID__c, Sales_Priority__c
    FROM Lead
    WHERE Territory_ID__c IN ({codes})
    AND Location__Latitude__s != NULL
    AND Id NOT IN ({excluded_ids})
    """
    leads = sf_request(
        "GET", f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(lead_query)}"
    ).json()["records"]

    for record in leads:
        members.append({
            "record_type": "Lead",
            "id": record.get("Id"),
            "name": record.get("Name"),
            "lat": record.get("Location__Latitude__s"),
            "lng": record.get("Location__Longitude__s"),
            "territory_code": record.get("Territory_ID__c"),
            "value": LEAD_PRIORITY_WEIGHT.get(record.get("Sales_Priority__c"), 0),
        })

    return members


def compute_territory_balance():
    """
    Analyzes workload (Account+Lead count) vs. potential (revenue) across
    every territory that has a real drawn boundary, and proposes moving
    records from overloaded territories to underloaded neighbors - the
    records nearest the shared edge move first. Pure read - writes nothing.
    Territories with no boundary yet are excluded (nothing to redraw).
    """
    all_territories = get_territory_assignments()
    eligible = [t for t in all_territories if t.get("boundary_geojson")]
    excluded = [
        {
            "territory_code": t.get("territory_code"),
            "territory_name": t.get("territory_name"),
            "reason": "No boundary drawn yet - draw one first to include this territory.",
        }
        for t in all_territories if not t.get("boundary_geojson")
    ]

    if len(eligible) < 2:
        return TerritoryBalanceProposal(
            fair_workload=0,
            threshold_pct=OVERLOAD_THRESHOLD,
            excluded_territories=excluded,
            message="Fewer than 2 territories have a drawn boundary - nothing to balance.",
        )

    codes = [t["territory_code"] for t in eligible]
    members = _fetch_members(codes)

    # Working copy: territory_code -> mutable list of its current members.
    by_territory = {code: [] for code in codes}
    for m in members:
        if m["territory_code"] in by_territory:
            by_territory[m["territory_code"]].append(m)

    original_by_territory = {code: list(ms) for code, ms in by_territory.items()}
    original_centroids = {
        code: _centroid(ms) or _boundary_centroid_fallback(
            next(t["boundary_geojson"] for t in eligible if t["territory_code"] == code)
        )
        for code, ms in by_territory.items()
    }

    total_members = len(members)
    fair_workload = total_members / len(eligible)

    overloaded = sorted(
        (
            (code, len(ms) - fair_workload)
            for code, ms in by_territory.items()
            if len(ms) > fair_workload * (1 + OVERLOAD_THRESHOLD)
        ),
        key=lambda pair: -pair[1],
    )
    underloaded = sorted(
        (
            (code, fair_workload - len(ms))
            for code, ms in by_territory.items()
            if len(ms) < fair_workload * (1 - OVERLOAD_THRESHOLD)
        ),
        key=lambda pair: -pair[1],
    )

    remaining_excess = {code: excess for code, excess in overloaded}
    remaining_deficit = {code: deficit for code, deficit in underloaded}

    moves = []

    for over_code, _ in overloaded:
        if remaining_excess[over_code] <= 0:
            continue

        own_centroid = original_centroids[over_code]

        for under_code, _ in underloaded:
            if remaining_excess[over_code] <= 0:
                break
            if remaining_deficit[under_code] <= 0:
                continue

            other_centroid = original_centroids[under_code]

            candidates = sorted(
                by_territory[over_code],
                key=lambda m: _distance(m, own_centroid) - _distance(m, other_centroid),
                reverse=True,
            )

            for member in candidates:
                if remaining_excess[over_code] <= 0 or remaining_deficit[under_code] <= 0:
                    break

                advantage = (
                    _distance(member, own_centroid) - _distance(member, other_centroid)
                )
                if advantage <= 0:
                    break  # remaining candidates are only worse - stop here

                by_territory[over_code].remove(member)
                by_territory[under_code].append(member)
                remaining_excess[over_code] -= 1
                remaining_deficit[under_code] -= 1

                moves.append({
                    "record_type": member["record_type"],
                    "id": member["id"],
                    "name": member["name"],
                    "from_code": over_code,
                    "to_code": under_code,
                })

    def potential(ms):
        return float(sum(m["value"] for m in ms))

    territory_states = []
    for t in eligible:
        code = t["territory_code"]
        before = original_by_territory[code]
        after = by_territory[code]
        changed = {m["id"] for m in before} != {m["id"] for m in after}

        territory_states.append({
            "territory_id": t["id"],
            "territory_code": code,
            "territory_name": t.get("territory_name"),
            "workload_before": len(before),
            "workload_after": len(after),
            "potential_before": potential(before),
            "potential_after": potential(after),
            "boundary_after": _boundary_for_members(after) if changed else None,
        })

    return TerritoryBalanceProposal(
        fair_workload=fair_workload,
        threshold_pct=OVERLOAD_THRESHOLD,
        territories=territory_states,
        moves=moves,
        excluded_territories=excluded,
    )


def apply_territory_balance(proposal: TerritoryBalanceProposal):
    """
    Applies a proposal returned by compute_territory_balance() exactly as
    previewed - reassigns each moved record's Territory_ID__c, then
    redraws each affected territory's boundary. Takes the proposal object
    back from the caller rather than recomputing it, so what was previewed
    is exactly what gets applied even if data changed in between.
    """
    for move in proposal.moves:
        sf_request(
            "PATCH",
            f"{INSTANCE_URL}/services/data/v64.0/sobjects/{move.record_type}/{move.id}",
            json={"Territory_ID__c": move.to_code},
        )

    boundaries_updated = 0
    for territory in proposal.territories:
        if territory.boundary_after is None:
            continue

        sf_request(
            "PATCH",
            f"{INSTANCE_URL}/services/data/v64.0/sobjects/Territory_Assignment__c/{territory.territory_id}",
            json={"Boundary_GeoJSON__c": json.dumps(territory.boundary_after)},
        )
        boundaries_updated += 1

    return {
        "message": "Territory balance applied successfully",
        "records_moved": len(proposal.moves),
        "boundaries_updated": boundaries_updated,
    }
