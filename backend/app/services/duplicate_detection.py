import math
import re
from difflib import SequenceMatcher
from urllib.parse import quote

from app.salesforce_client import INSTANCE_URL

# Below this, a match isn't worth surfacing to a reviewer at all.
MIN_REPORTABLE_SCORE = 30.0


def _normalize_phone(phone):
    if not phone:
        return None

    digits = re.sub(r"\D", "", phone)

    return digits or None


def _text_similarity(a, b):
    if not a or not b:
        return 0.0

    return SequenceMatcher(None, a.strip().lower(), b.strip().lower()).ratio()


def _haversine_meters(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None

    radius = 6371000

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )

    return 2 * radius * math.asin(math.sqrt(a))


def _spatial_score(lat1, lon1, lat2, lon2):
    distance = _haversine_meters(lat1, lon1, lat2, lon2)

    if distance is None:
        return 0.0, None
    if distance <= 50:
        return 25.0, distance
    if distance <= 150:
        return 15.0, distance
    if distance <= 500:
        return 5.0, distance

    return 0.0, distance


def _score_match(
    name, phone, address, latitude, longitude,
    other_name, other_phone, other_address, other_lat, other_lon
):
    score = 0.0
    reasons = []

    norm_phone = _normalize_phone(phone)
    norm_other_phone = _normalize_phone(other_phone)
    if norm_phone and norm_other_phone and norm_phone == norm_other_phone:
        score += 40.0
        reasons.append("phone")

    name_ratio = _text_similarity(name, other_name)
    if name_ratio > 0:
        score += name_ratio * 35.0
        if name_ratio >= 0.6:
            reasons.append("name")

    address_ratio = _text_similarity(address, other_address)
    if address_ratio > 0:
        score += address_ratio * 15.0
        if address_ratio >= 0.6:
            reasons.append("address")

    spatial_points, distance = _spatial_score(latitude, longitude, other_lat, other_lon)
    if spatial_points > 0:
        score += spatial_points
        reasons.append("location")

    return round(min(score, 100.0), 1), reasons, distance


def find_duplicate_matches(
    name, business, phone, address,
    latitude=None, longitude=None, exclude_id=None
):
    """
    Compares a discovery candidate's identifying details against existing
    Leads, Accounts, and other Discovery Candidates, and returns scored
    potential matches (0-100 confidence, heuristic - not exact matching).

    Imports sf_request lazily to avoid a circular import: salesforce_service
    imports this module at load time, so this module cannot import back
    from salesforce_service at load time.
    """
    from app.services.salesforce_service import sf_request

    matches = []
    match_name = business or name

    lead_query = """
    SELECT Id, Name, Company, Phone,
        Location__Latitude__s, Location__Longitude__s
    FROM Lead
    """
    lead_url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(lead_query)}"
    lead_records = sf_request("GET", lead_url).json().get("records", [])

    for record in lead_records:
        score, reasons, distance = _score_match(
            match_name, phone, None, latitude, longitude,
            record.get("Company") or record.get("Name"), record.get("Phone"), None,
            record.get("Location__Latitude__s"), record.get("Location__Longitude__s")
        )
        if score >= MIN_REPORTABLE_SCORE:
            matches.append({
                "source_type": "Lead",
                "id": record.get("Id"),
                "name": record.get("Company") or record.get("Name"),
                "score": score,
                "matched_on": reasons,
                "distance_meters": round(distance, 1) if distance is not None else None
            })

    account_query = """
    SELECT Id, Name, Phone, BillingStreet, BillingCity,
        Location__Latitude__s, Location__Longitude__s
    FROM Account
    """
    account_url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(account_query)}"
    account_records = sf_request("GET", account_url).json().get("records", [])

    for record in account_records:
        billing_address = ", ".join(
            part for part in [record.get("BillingStreet"), record.get("BillingCity")] if part
        ) or None

        score, reasons, distance = _score_match(
            match_name, phone, address, latitude, longitude,
            record.get("Name"), record.get("Phone"), billing_address,
            record.get("Location__Latitude__s"), record.get("Location__Longitude__s")
        )
        if score >= MIN_REPORTABLE_SCORE:
            matches.append({
                "source_type": "Account",
                "id": record.get("Id"),
                "name": record.get("Name"),
                "score": score,
                "matched_on": reasons,
                "distance_meters": round(distance, 1) if distance is not None else None
            })

    candidate_query = """
    SELECT Id, Name, Candidate_Name__c, Business_Name__c, Phone__c, Address__c,
        Location__Latitude__s, Location__Longitude__s
    FROM Discovery_Candidate__c
    """
    candidate_url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(candidate_query)}"
    candidate_records = sf_request("GET", candidate_url).json().get("records", [])

    for record in candidate_records:
        if exclude_id and record.get("Id") == exclude_id:
            continue

        other_name = (
            record.get("Business_Name__c")
            or record.get("Candidate_Name__c")
            or record.get("Name")
        )

        score, reasons, distance = _score_match(
            match_name, phone, address, latitude, longitude,
            other_name, record.get("Phone__c"), record.get("Address__c"),
            record.get("Location__Latitude__s"), record.get("Location__Longitude__s")
        )
        if score >= MIN_REPORTABLE_SCORE:
            matches.append({
                "source_type": "Discovery Candidate",
                "id": record.get("Id"),
                "name": other_name,
                "score": score,
                "matched_on": reasons,
                "distance_meters": round(distance, 1) if distance is not None else None
            })

    matches.sort(key=lambda m: m["score"], reverse=True)

    return matches


def classify_duplicate_status(matches):
    """
    Reduces a scored match list to one of the 5 Duplicate_Status__c
    picklist values on Discovery_Candidate__c (verified via describe:
    Unique, Possible Duplicate, Confirmed Duplicate, Existing Lead,
    Existing Account), plus a 0-100 confidence score for the best match.
    """
    if not matches:
        return "Unique", 0.0

    top_score = matches[0]["score"]

    lead_matches = [m for m in matches if m["source_type"] == "Lead" and m["score"] >= 65]
    if lead_matches:
        return "Existing Lead", max(m["score"] for m in lead_matches)

    account_matches = [m for m in matches if m["source_type"] == "Account" and m["score"] >= 65]
    if account_matches:
        return "Existing Account", max(m["score"] for m in account_matches)

    if top_score >= 80:
        return "Confirmed Duplicate", top_score

    if top_score >= 50:
        return "Possible Duplicate", top_score

    return "Unique", top_score
