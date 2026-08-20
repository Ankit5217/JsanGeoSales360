import logging

import requests
from fastapi import HTTPException

from app.salesforce_client import INSTANCE_URL, headers, refresh_access_token
from app.schemas.account_schema import AccountCreate
from app.schemas.account_schema import AccountUpdate
from app.schemas.lead_schema import LeadCreate, LeadUpdate
from app.schemas.opportunity_schema import (
    OpportunityCreate,
    OpportunityUpdate
)
from app.schemas.discovery_candidate_schema import (
    DiscoveryCandidateCreate,
    DiscoveryCandidateUpdate
)
from app.schemas.territory_schema import (
    TerritoryCreate,
    TerritoryUpdate
)
from app.schemas.route_schema import (
    RouteCreate,
    RouteUpdate
)
from app.schemas.field_visit_schema import (
    FieldVisitCreate,
    FieldVisitUpdate,
)
from app.schemas.validation_evidence_schema import (
    ValidationEvidenceCreate,
    ValidationEvidenceUpdate,
)
from urllib.parse import quote
from datetime import date

logger = logging.getLogger(__name__)


def sf_request(method: str, url: str, **kwargs):
    kwargs.setdefault("timeout", 15)

    try:
        response = requests.request(method, url, headers=headers(), **kwargs)

        if response.status_code == 401:
            refresh_access_token()
            response = requests.request(method, url, headers=headers(), **kwargs)

        response.raise_for_status()
        return response

    except requests.exceptions.HTTPError as e:
        logger.error(
            "Salesforce %s %s failed: %s | %s",
            method, url, e, response.text
        )
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        ) from e

    except requests.exceptions.RequestException as e:
        logger.error(
            "Salesforce %s %s request failed: %s",
            method, url, e
        )
        raise HTTPException(
            status_code=502,
            detail=f"Salesforce request failed: {e}"
        ) from e


def get_accounts():
    query = """
    SELECT
        Id,
        Name,
        Type,
        Phone,
        BillingCity
    FROM Account
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
        f"?q={query}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    accounts = []

    for record in data["records"]:
        accounts.append({
            "id": record.get("Id"),
            "name": record.get("Name"),
            "type": record.get("Type"),
            "phone": record.get("Phone"),
            "city": record.get("BillingCity")
        })

    return accounts

def create_account(account: AccountCreate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Account"

    response = sf_request(
        "POST",
        url,
        json=account.model_dump()
    )

    return response.json()

def update_account(account_id: str, account: AccountUpdate):

    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Account/{account_id}"

    payload = account.model_dump(
        mode="json",
        exclude_none=True
    )

    logger.info("Updating Salesforce Account %s: %s", account_id, payload)

    sf_request(
        "PATCH",
        url,
        json=payload
    )

    return {
        "success": True,
        "message": "Account updated successfully",
        "id": account_id
    }
    
    

def update_lead(lead_id: str, lead_data):

    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Lead/{lead_id}"

    payload = lead_data.model_dump(
        mode="json",
        exclude_none=True
    )

    logger.info("Updating Salesforce Lead %s: %s", lead_id, payload)

    sf_request(
        "PATCH",
        url,
        json=payload
    )

    return {
        "success": True,
        "message": "Lead updated successfully",
        "id": lead_id
    }

def delete_account(account_id: str):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Account/{account_id}"

    sf_request("DELETE", url)

    return {
        "message": "Account deleted successfully"
    }

# Salesforce Developer Edition orgs ship with a fixed batch of generic
# sample leads (Bertha Boxer, Phyllis Cotton, etc.) pre-loaded. These
# are that exact batch's record Ids, so get_leads() can exclude them and
# show only leads actually created through real use of this app.
SAMPLE_LEAD_IDS = [
    "00QgL00000Yl4B3UAJ", "00QgL00000Yl4B4UAJ", "00QgL00000Yl4B5UAJ",
    "00QgL00000Yl4B6UAJ", "00QgL00000Yl4B7UAJ", "00QgL00000Yl4B8UAJ",
    "00QgL00000Yl4B9UAJ", "00QgL00000Yl4BAUAZ", "00QgL00000Yl4BBUAZ",
    "00QgL00000Yl4BCUAZ", "00QgL00000Yl4BDUAZ", "00QgL00000Yl4BEUAZ",
    "00QgL00000Yl4BFUAZ", "00QgL00000Yl4BGUAZ", "00QgL00000Yl4BHUAZ",
    "00QgL00000Yl4BIUAZ", "00QgL00000Yl4BJUAZ", "00QgL00000Yl4BKUAZ",
    "00QgL00000Yl4BLUAZ", "00QgL00000Yl4BMUAZ", "00QgL00000Yl4BNUAZ",
    "00QgL00000Yl4BOUAZ"
]

def get_leads():
    excluded_ids = ", ".join(f"'{lead_id}'" for lead_id in SAMPLE_LEAD_IDS)

    query = f"""
    SELECT
        Id,
        Name,
        FirstName,
        LastName,
        Company,
        Status,
        Phone,
        Email,
        Sales_Priority__c,
        GIS_Validation_Status__c,
        Location__Latitude__s,
        Location__Longitude__s,
        Territory_ID__c
    FROM Lead
    WHERE Id NOT IN ({excluded_ids})
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
        f"?q={query}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    leads = []

    for record in data["records"]:
        leads.append({
            "Id": record.get("Id"),
            "Name": record.get("Name"),
            "FirstName": record.get("FirstName"),
            "LastName": record.get("LastName"),
            "Company": record.get("Company"),
            "Status": record.get("Status"),
            "Phone": record.get("Phone"),
            "Email": record.get("Email"),
            "Sales_Priority__c": record.get("Sales_Priority__c"),
            "GIS_Validation_Status__c": record.get("GIS_Validation_Status__c"),
            "Location__Latitude__s": record.get("Location__Latitude__s"),
            "Location__Longitude__s": record.get("Location__Longitude__s"),
            "Territory_ID__c": record.get("Territory_ID__c")
        })

    return leads

def delete_lead(lead_id: str):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Lead/{lead_id}"

    sf_request("DELETE", url)

    return {
        "message": "Lead deleted successfully"
    }

    

def create_lead(lead: LeadCreate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Lead"

    response = sf_request(
        "POST",
        url,
        json=lead.model_dump()
    )

    return response.json()

def get_opportunities():
    query = """
    SELECT
        Id,
        Name,
        StageName,
        Amount,
        CloseDate
    FROM Opportunity
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
        f"?q={query}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    opportunities = []

    for record in data["records"]:
        opportunities.append({
            "id": record.get("Id"),
            "name": record.get("Name"),
            "stage": record.get("StageName"),
            "amount": record.get("Amount"),
            "close_date": record.get("CloseDate")
        })

    return opportunities

def create_opportunity(opportunity: OpportunityCreate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Opportunity"

    response = sf_request(
        "POST",
        url,
        json=opportunity.model_dump(mode="json")
    )

    return response.json()

def update_opportunity(opportunity_id: str, opportunity: OpportunityUpdate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Opportunity/{opportunity_id}"

    sf_request(
        "PATCH",
        url,
        json=opportunity.model_dump(
            exclude_none=True,
            mode="json"
        )
    )

    return {
        "message": "Opportunity updated successfully"
    }

def delete_opportunity(opportunity_id: str):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Opportunity/{opportunity_id}"

    sf_request("DELETE", url)

    return {
        "message": "Opportunity deleted successfully"
    }


def get_discovery_candidates():
    query = """
    SELECT
        Id,
        Name,
        Candidate_Name__c,
        Business_Name__c,
        Address__c,
        Phone__c,
        Location__Latitude__s,
        Location__Longitude__s,
        Discovery_Source__c,
        Confidence_Score__c,
        Validation_Status__c,
        Review_Status__c,
        Duplicate_Status__c,
        Assigned_Territory__c,
        Assigned_Representative__c,
        Related_Account__c,
        Related_Lead__c
    FROM Discovery_Candidate__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
        f"?q={query}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    candidates = []

    for record in data["records"]:
        candidates.append({
            "id": record.get("Id"),
            "record_name": record.get("Name"),
            "candidate_name": record.get("Candidate_Name__c"),
            "business_name": record.get("Business_Name__c"),
            "address": record.get("Address__c"),
            "phone": record.get("Phone__c"),
            "latitude": record.get("Location__Latitude__s"),
            "longitude": record.get("Location__Longitude__s"),
            "discovery_source": record.get("Discovery_Source__c"),
            "confidence_score": record.get("Confidence_Score__c"),
            "validation_status": record.get("Validation_Status__c"),
            "review_status": record.get("Review_Status__c"),
            "duplicate_status": record.get("Duplicate_Status__c"),
            "assigned_territory": record.get("Assigned_Territory__c"),
            "assigned_representative": record.get("Assigned_Representative__c"),
            "related_account": record.get("Related_Account__c"),
            "related_lead": record.get("Related_Lead__c")
        })

    return candidates

def create_discovery_candidate(candidate: DiscoveryCandidateCreate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Discovery_Candidate__c"

    response = sf_request(
        "POST",
        url,
        json=candidate.model_dump(exclude_none=True)
    )

    return response.json()

def update_discovery_candidate(
    candidate_id: str,
    candidate: DiscoveryCandidateUpdate
):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Discovery_Candidate__c/{candidate_id}"

    sf_request(
        "PATCH",
        url,
        json=candidate.model_dump(exclude_none=True)
    )

    return {
        "message": "Discovery Candidate updated successfully"
    }

def delete_discovery_candidate(candidate_id: str):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Discovery_Candidate__c/{candidate_id}"

    sf_request("DELETE", url)

    return {
        "message": "Discovery Candidate deleted successfully"
    }

def convert_discovery_candidate_to_lead(candidate_id: str):
    detail_url = (
        f"{INSTANCE_URL}/services/data/v64.0/sobjects/Discovery_Candidate__c/{candidate_id}"
    )

    response = sf_request(
        "GET",
        detail_url,
        params={
            "fields": (
                "Name,Candidate_Name__c,Business_Name__c,Phone__c,"
                "Related_Lead__c,Review_Status__c"
            )
        }
    )

    candidate = response.json()

    if candidate.get("Related_Lead__c"):
        raise HTTPException(
            status_code=409,
            detail="This candidate has already been converted to a Lead"
        )

    if candidate.get("Review_Status__c") != "Approved":
        raise HTTPException(
            status_code=400,
            detail="Only approved candidates can be converted to a Lead"
        )

    lead_name = (
        candidate.get("Candidate_Name__c")
        or candidate.get("Name")
        or "Unknown"
    )

    lead_payload = {
        "LastName": lead_name,
        "Company": candidate.get("Business_Name__c") or lead_name,
        "Phone": candidate.get("Phone__c")
    }

    lead_url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Lead"

    lead_response = sf_request(
        "POST",
        lead_url,
        json={k: v for k, v in lead_payload.items() if v is not None}
    )

    lead_id = lead_response.json()["id"]

    sf_request(
        "PATCH",
        detail_url,
        json={
            "Related_Lead__c": lead_id
        }
    )

    return {
        "message": "Discovery Candidate converted to Lead successfully",
        "lead_id": lead_id
    }


def get_territory_assignments():
    query = """
    SELECT
        Id,
        Name,
        Territory_Name__c,
        Territory_Code__c,
        Status__c,
        Coverage_Percentage__c
    FROM Territory_Assignment__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
        f"?q={query}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    territories = []

    for record in data["records"]:
        territories.append({
            "id": record.get("Id"),
            "name": record.get("Name"),
            "territory_name": record.get("Territory_Name__c"),
            "territory_code": record.get("Territory_Code__c"),
            "status": record.get("Status__c"),
            "coverage": record.get("Coverage_Percentage__c")
        })

    return territories

def get_route_plans():
    query = """
    SELECT
        Id,
        Name,
        Route_Name__c,
        Route_Date__c,
        Estimated_Time__c,
        Total_Distance__c,
        Status__c
    FROM Route_Plan__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
        f"?q={query}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    routes = []

    for record in data["records"]:
        routes.append({
            "id": record.get("Id"),
            "name": record.get("Name"),
            "route_name": record.get("Route_Name__c"),
            "route_date": record.get("Route_Date__c"),
            "estimated_time": record.get("Estimated_Time__c"),
            "distance": record.get("Total_Distance__c"),
            "status": record.get("Status__c")
        })

    return routes

def get_field_visits():
    query = """
    SELECT
        Id,
        Name,
        Visit_Date__c,
        Check_In_Time__c,
        Check_Out_Time__c,
        Visit_Outcome__c,
        Follow_Up_Date__c
    FROM Field_Visit__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
        f"?q={query}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    visits = []

    for record in data["records"]:
        visits.append({
            "id": record.get("Id"),
            "name": record.get("Name"),
            "visit_date": record.get("Visit_Date__c"),
            "check_in": record.get("Check_In_Time__c"),
            "check_out": record.get("Check_Out_Time__c"),
            "outcome": record.get("Visit_Outcome__c"),
            "follow_up": record.get("Follow_Up_Date__c")
        })

    return visits

def get_validation_evidence():
    query = """
    SELECT
        Id,
        Name,
        Evidence_Type__c,
        Photo_URL__c,
        Validation_Date__c,
        Status__c,
        Remarks__c
    FROM Validation_Evidence__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
        f"?q={query}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    evidence = []

    for record in data["records"]:
        evidence.append({
            "id": record.get("Id"),
            "name": record.get("Name"),
            "type": record.get("Evidence_Type__c"),
            "photo": record.get("Photo_URL__c"),
            "validation_date": record.get("Validation_Date__c"),
            "status": record.get("Status__c"),
            "remarks": record.get("Remarks__c")
        })

    return evidence

def create_territory(territory: TerritoryCreate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Territory_Assignment__c"

    response = sf_request(
        "POST",
        url,
        json=territory.model_dump(exclude_none=True)
    )

    return response.json()
def update_territory(
    territory_id: str,
    territory: TerritoryUpdate
):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Territory_Assignment__c/{territory_id}"

    sf_request(
        "PATCH",
        url,
        json=territory.model_dump(exclude_none=True)
    )

    return {
        "message": "Territory updated successfully"
    }
def delete_territory(territory_id: str):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Territory_Assignment__c/{territory_id}"

    sf_request("DELETE", url)

    return {
        "message": "Territory deleted successfully"
    }

def create_route(route: RouteCreate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Route_Plan__c"

    payload = route.model_dump(mode="json", exclude_none=True)
    payload["Name"] = route.Route_Name__c

    response = sf_request(
        "POST",
        url,
        json=payload
    )

    return {
        "message": "Route created successfully",
        "id": response.json()["id"]
    }
def update_route(route_id: str, route: RouteUpdate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Route_Plan__c/{route_id}"

    payload = route.model_dump(
        mode="json",
        exclude_none=True
    )

    sf_request(
        "PATCH",
        url,
        json=payload
    )

    return {
        "message": "Route updated successfully"
    }

def delete_route(route_id: str):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Route_Plan__c/{route_id}"

    sf_request("DELETE", url)

    return {
        "message": "Route deleted successfully"
    }

def create_visit(visit: FieldVisitCreate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Field_Visit__c"

    payload = visit.model_dump(
        mode="json",
        exclude_none=True
    )

    response = sf_request(
        "POST",
        url,
        json=payload
    )

    return {
        "message": "Visit created successfully",
        "id": response.json()["id"]
    }

def update_visit(visit_id: str, visit: FieldVisitUpdate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Field_Visit__c/{visit_id}"

    payload = visit.model_dump(
        mode="json",
        exclude_none=True
    )

    logger.info("Updating Salesforce Field Visit %s: %s", visit_id, payload)

    sf_request(
        "PATCH",
        url,
        json=payload
    )

    return {
        "success": True,
        "message": "Visit updated successfully",
        "id": visit_id
    }

def delete_visit(visit_id: str):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Field_Visit__c/{visit_id}"

    sf_request("DELETE", url)

    return {
        "message": "Visit deleted successfully"
    }

def create_evidence(evidence: ValidationEvidenceCreate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Validation_Evidence__c"

    payload = evidence.model_dump(
        mode="json",
        exclude_none=True
    )

    response = sf_request(
        "POST",
        url,
        json=payload
    )

    return {
        "message": "Validation Evidence created successfully",
        "id": response.json()["id"]
    }

def update_evidence(evidence_id: str, evidence: ValidationEvidenceUpdate):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Validation_Evidence__c/{evidence_id}"

    payload = evidence.model_dump(
        mode="json",
        exclude_none=True
    )

    sf_request(
        "PATCH",
        url,
        json=payload
    )

    return {
        "message": "Validation Evidence updated successfully"
    }

def delete_evidence(evidence_id: str):
    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/Validation_Evidence__c/{evidence_id}"

    sf_request("DELETE", url)

    return {
        "message": "Validation Evidence deleted successfully"
    }

#****************************************************************************
#Business Logic APIs

def get_accounts_by_territory(territory_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Phone,
        BillingCity,
        Territory_ID__c
    FROM Account
    WHERE Territory_ID__c = '{territory_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
    )

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    return response.json()["records"]

def get_leads_by_territory(territory_id: str):

    query = f"""
    SELECT
        Id,
        FirstName,
        LastName,
        Company,
        Phone,
        Status,
        Territory_ID__c
    FROM Lead
    WHERE Territory_ID__c = '{territory_id}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    return response.json()["records"]

def get_discovery_candidates_by_territory(territory_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Candidate_Name__c,
        Business_Name__c,
        Phone__c,
        Validation_Status__c,
        Review_Status__c,
        Assigned_Territory__c
    FROM Discovery_Candidate__c
    WHERE Assigned_Territory__c = '{territory_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
    )

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    return response.json()["records"]

def get_routes_by_territory(territory_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory__c,
        Sales_Representative__c,
        Route_Date__c,
        Status__c
    FROM Route_Plan__c
    WHERE Territory__c = '{territory_id}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    routes = []

    for record in records:

        routes.append({

            "id": record.get("Id"),
            "name": record.get("Name"),
            "territory": record.get("Territory__c"),
            "sales_representative": record.get("Sales_Representative__c"),
            "route_date": record.get("Route_Date__c"),
            "status": record.get("Status__c")

        })

    return routes

def get_routes_by_representative(user_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory__r.Name,
        Sales_Representative__r.Name,
        Route_Date__c,
        Status__c
    FROM Route_Plan__c
    WHERE Sales_Representative__c = '{user_id}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    routes = []

    for record in records:

        routes.append({

            "id": record.get("Id"),
            "name": record.get("Name"),

            "territory": (
                record.get("Territory__r", {})
                .get("Name")
                if record.get("Territory__r")
                else None
            ),

            "sales_representative": (
                record.get("Sales_Representative__r", {})
                .get("Name")
                if record.get("Sales_Representative__r")
                else None
            ),

            "route_date": record.get("Route_Date__c"),
            "status": record.get("Status__c")

        })

    return routes

def get_todays_routes():

    today = date.today().isoformat()

    query = f"""
    SELECT
        Id,
        Name,
        Territory__r.Name,
        Sales_Representative__r.Name,
        Route_Date__c,
        Status__c
    FROM Route_Plan__c
    WHERE Route_Date__c = {today}
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    routes = []

    for record in records:

        routes.append({

            "id": record.get("Id"),
            "name": record.get("Name"),

            "territory": (
                record.get("Territory__r", {}).get("Name")
                if record.get("Territory__r")
                else None
            ),

            "sales_representative": (
                record.get("Sales_Representative__r", {}).get("Name")
                if record.get("Sales_Representative__r")
                else None
            ),

            "route_date": record.get("Route_Date__c"),
            "status": record.get("Status__c")

        })

    return routes

def get_visits_by_route(route_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Representative__r.Name,
        Route_Plan__r.Name
    FROM Field_Visit__c
    WHERE Route_Plan__c = '{route_id}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    return response.json()["records"]

def get_visits_by_representative(user_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Representative__r.Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Route_Plan__r.Name
    FROM Field_Visit__c
    WHERE Representative__c = '{user_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
    )

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    return response.json()

def get_visits_by_date(visit_date: str):

    query = f"""
    SELECT
        Id,
        Name,
        Account__r.Name,
        Lead__r.Name,
        Representative__r.Name,
        Route_Plan__r.Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Notes__c
    FROM Field_Visit__c
    WHERE DAY_ONLY(Visit_Date__c) = {visit_date}
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    visits = []

    for record in records:

        visits.append({

            "id": record.get("Id"),
            "name": record.get("Name"),

            "account": (
                record.get("Account__r", {}).get("Name")
                if record.get("Account__r")
                else None
            ),

            "lead": (
                record.get("Lead__r", {}).get("Name")
                if record.get("Lead__r")
                else None
            ),

            "representative": (
                record.get("Representative__r", {}).get("Name")
                if record.get("Representative__r")
                else None
            ),

            "route": (
                record.get("Route_Plan__r", {}).get("Name")
                if record.get("Route_Plan__r")
                else None
            ),

            "visit_date": record.get("Visit_Date__c"),
            "visit_outcome": record.get("Visit_Outcome__c"),
            "notes": record.get("Notes__c")

        })

    return visits

def get_visits_by_outcome(outcome: str):

    query = f"""
    SELECT
        Id,
        Name,
        Account__r.Name,
        Lead__r.Name,
        Representative__r.Name,
        Route_Plan__r.Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Notes__c
    FROM Field_Visit__c
    WHERE Visit_Outcome__c = '{outcome}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    visits = []

    for record in records:

        visits.append({

            "id": record.get("Id"),
            "name": record.get("Name"),

            "account": (
                record.get("Account__r", {}).get("Name")
                if record.get("Account__r")
                else None
            ),

            "lead": (
                record.get("Lead__r", {}).get("Name")
                if record.get("Lead__r")
                else None
            ),

            "representative": (
                record.get("Representative__r", {}).get("Name")
                if record.get("Representative__r")
                else None
            ),

            "route": (
                record.get("Route_Plan__r", {}).get("Name")
                if record.get("Route_Plan__r")
                else None
            ),

            "visit_date": record.get("Visit_Date__c"),
            "visit_outcome": record.get("Visit_Outcome__c"),
            "notes": record.get("Notes__c")

        })

    return visits

def get_evidence_by_visit(visit_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Evidence_Type__c,
        Status__c,
        Validation_Date__c,
        Photo_URL__c,
        Remarks__c,
        Verified_By__r.Name,
        Field_Visit__r.Name
    FROM Validation_Evidence__c
    WHERE Field_Visit__c = '{visit_id}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    evidence = []

    for record in records:

        evidence.append({

            "id": record.get("Id"),
            "name": record.get("Name"),

            "field_visit": (
                record.get("Field_Visit__r", {}).get("Name")
                if record.get("Field_Visit__r")
                else None
            ),

            "verified_by": (
                record.get("Verified_By__r", {}).get("Name")
                if record.get("Verified_By__r")
                else None
            ),

            "evidence_type": record.get("Evidence_Type__c"),
            "status": record.get("Status__c"),
            "validation_date": record.get("Validation_Date__c"),
            "photo_url": record.get("Photo_URL__c"),
            "remarks": record.get("Remarks__c")

        })

    return evidence

def get_evidence_by_account(account_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Account__r.Name,
        Field_Visit__r.Name,
        Evidence_Type__c,
        Status__c,
        Validation_Date__c,
        Photo_URL__c,
        Remarks__c
    FROM Validation_Evidence__c
    WHERE Account__c = '{account_id}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    evidence = []

    for record in records:

        evidence.append({

            "id": record.get("Id"),
            "name": record.get("Name"),

            "account": (
                record.get("Account__r", {}).get("Name")
                if record.get("Account__r")
                else None
            ),

            "field_visit": (
                record.get("Field_Visit__r", {}).get("Name")
                if record.get("Field_Visit__r")
                else None
            ),

            "evidence_type": record.get("Evidence_Type__c"),
            "status": record.get("Status__c"),
            "validation_date": record.get("Validation_Date__c"),
            "photo_url": record.get("Photo_URL__c"),
            "remarks": record.get("Remarks__c")

        })

    return evidence

def get_evidence_by_lead(lead_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Lead__r.Name,
        Field_Visit__r.Name,
        Evidence_Type__c,
        Status__c,
        Validation_Date__c,
        Photo_URL__c,
        Remarks__c
    FROM Validation_Evidence__c
    WHERE Lead__c = '{lead_id}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    evidence = []

    for record in records:

        evidence.append({

            "id": record.get("Id"),
            "name": record.get("Name"),

            "lead": (
                record.get("Lead__r", {}).get("Name")
                if record.get("Lead__r")
                else None
            ),

            "field_visit": (
                record.get("Field_Visit__r", {}).get("Name")
                if record.get("Field_Visit__r")
                else None
            ),

            "evidence_type": record.get("Evidence_Type__c"),
            "status": record.get("Status__c"),
            "validation_date": record.get("Validation_Date__c"),
            "photo_url": record.get("Photo_URL__c"),
            "remarks": record.get("Remarks__c")

        })

    return evidence

def get_evidence_by_status(status: str):

    query = f"""
    SELECT
        Id,
        Name,
        Evidence_Type__c,
        Status__c,
        Validation_Date__c,
        Photo_URL__c,
        Remarks__c
    FROM Validation_Evidence__c
    WHERE Status__c = '{status}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    evidence = []

    for record in records:

        evidence.append({

            "id": record.get("Id"),
            "name": record.get("Name"),
            "evidence_type": record.get("Evidence_Type__c"),
            "status": record.get("Status__c"),
            "validation_date": record.get("Validation_Date__c"),
            "photo_url": record.get("Photo_URL__c"),
            "remarks": record.get("Remarks__c")

        })

    return evidence

def get_evidence_by_type(evidence_type: str):

    query = f"""
    SELECT
        Id,
        Name,
        Evidence_Type__c,
        Status__c,
        Validation_Date__c,
        Photo_URL__c,
        Remarks__c
    FROM Validation_Evidence__c
    WHERE Evidence_Type__c = '{evidence_type}'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    evidence = []

    for record in records:

        evidence.append({

            "id": record.get("Id"),
            "name": record.get("Name"),
            "evidence_type": record.get("Evidence_Type__c"),
            "status": record.get("Status__c"),
            "validation_date": record.get("Validation_Date__c"),
            "photo_url": record.get("Photo_URL__c"),
            "remarks": record.get("Remarks__c")

        })

    return evidence

def get_dashboard_summary():

    objects = [
        ("Account", "accounts"),
        ("Lead", "leads"),
        ("Discovery_Candidate__c", "discovery_candidates"),
        ("Territory_Assignment__c", "territories"),
        ("Route_Plan__c", "routes"),
        ("Field_Visit__c", "field_visits"),
        ("Validation_Evidence__c", "validation_evidence")
    ]

    summary = {}

    for object_name, key in objects:

        query = f"SELECT COUNT() FROM {object_name}"

        url = f"{INSTANCE_URL}/services/data/v64.0/query"

        response = sf_request(
            "GET",
            url,
            params={"q": query}
        )

        data = response.json()

        summary[key] = data["totalSize"]

    return summary

def get_leads_by_status():

    query = """
    SELECT
        Status,
        COUNT(Id)
    FROM Lead
    GROUP BY Status
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    result = []

    for record in records:

        result.append({

            "status": record.get("Status"),

            "count": record.get("expr0")

        })

    return result

def get_leads_by_source():

    query = """
    SELECT
        LeadSource,
        COUNT(Id)
    FROM Lead
    GROUP BY LeadSource
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    result = []

    for record in records:

        result.append({

            "lead_source": record.get("LeadSource"),

            "count": record.get("expr0")

        })

    return result

def get_qualified_leads():

    query = """
    SELECT COUNT(Id)
    FROM Lead
    WHERE Status = 'Working - Contacted'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    record = response.json()["records"][0]

    return {
        "qualified_leads": record.get("expr0")
    }

def get_converted_leads():

    query = """
    SELECT COUNT(Id)
    FROM Lead
    WHERE IsConverted = TRUE
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    record = response.json()["records"][0]

    return {

        "converted_leads": record.get("expr0")

    }

def get_monthly_leads():

    query = """
    SELECT
        CALENDAR_YEAR(CreatedDate),
        CALENDAR_MONTH(CreatedDate),
        COUNT(Id)
    FROM Lead
    GROUP BY
        CALENDAR_YEAR(CreatedDate),
        CALENDAR_MONTH(CreatedDate)
    ORDER BY
        CALENDAR_YEAR(CreatedDate),
        CALENDAR_MONTH(CreatedDate)
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    records = response.json()["records"]

    result = []

    for record in records:

        result.append({

            "year": record.get("expr0"),

            "month": record.get("expr1"),

            "count": record.get("expr2")

        })

    return result

def get_total_accounts():

    query = """
    SELECT COUNT(Id)
    FROM Account
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "total_accounts": data["records"][0]["expr0"]
    }

def get_accounts_by_priority(priority: str):

    query = f"""
    SELECT
        Id,
        Name,
        Sales_Priority__c
    FROM Account
    WHERE Sales_Priority__c = '{priority}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_accounts_by_validation(status: str):

    query = f"""
    SELECT
        Id,
        Name,
        GIS_Validation_Status__c
    FROM Account
    WHERE GIS_Validation_Status__c = '{status}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_recently_visited_accounts():

    query = """
    SELECT
        Id,
        Name,
        Last_Visit_Date__c
    FROM Account
    WHERE Last_Visit_Date__c != NULL
    ORDER BY Last_Visit_Date__c DESC
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_overdue_accounts():

    query = """
    SELECT
        Id,
        Name,
        Next_Visit_Date__c
    FROM Account
    WHERE Next_Visit_Date__c < TODAY
    ORDER BY Next_Visit_Date__c ASC
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_total_territories():

    query = """
    SELECT COUNT(Id)
    FROM Territory_Assignment__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "total_territories": data["records"][0]["expr0"]
    }

def get_active_territories():

    query = """
    SELECT
        Id,
        Name,
        Territory_Name__c,
        Territory_Manager__r.Name,
        Status__c
    FROM Territory_Assignment__c
    WHERE Status__c='Approved'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_inactive_territories():

    query = """
    SELECT
        Id,
        Name,
        Territory_Name__c,
        Territory_Manager__r.Name,
        Status__c
    FROM Territory_Assignment__c
    WHERE Status__c='Pending'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_territories_by_manager(user_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory_Name__c,
        Territory_Manager__r.Name,
        Status__c
    FROM Territory_Assignment__c
    WHERE Territory_Manager__c='{user_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_total_routes():

    query = """
    SELECT Id
    FROM Route_Plan__c
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "total_routes": data["totalSize"]
    }

def get_pending_routes():

    query = """
    SELECT Id
    FROM Route_Plan__c
    WHERE Status__c='Pending'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "pending_routes": data["totalSize"]
    }

def get_approved_routes():

    query = """
    SELECT Id
    FROM Route_Plan__c
    WHERE Status__c='Approved'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "approved_routes": data["totalSize"]
    }

def get_rejected_routes():

    query = """
    SELECT Id
    FROM Route_Plan__c
    WHERE Status__c='Rejected'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "rejected_routes": data["totalSize"]
    }

def get_total_distance():

    query = """
    SELECT Total_Distance__c
    FROM Route_Plan__c
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    records = response.json()["records"]

    total = sum(
        record.get("Total_Distance__c") or 0
        for record in records
    )

    return {
        "total_distance": total
    }

def get_total_estimated_time():

    query = """
    SELECT Estimated_Time__c
    FROM Route_Plan__c
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    records = response.json()["records"]

    total = sum(
        record.get("Estimated_Time__c") or 0
        for record in records
    )

    return {
        "estimated_time": total
    }

def get_total_visits():

    query = """
    SELECT Id
    FROM Field_Visit__c
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "total_visits": data["totalSize"]
    }

def get_today_visits():

    today = date.today().isoformat()

    query = f"""
    SELECT Id
    FROM Field_Visit__c
    WHERE DAY_ONLY(Visit_Date__c) = {today}
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "today_visits": data["totalSize"]
    }

def get_followup_visits():

    today = date.today().isoformat()

    query = f"""
    SELECT Id
    FROM Field_Visit__c
    WHERE Follow_up_Date__c >= {today}
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "followup_visits": data["totalSize"]
    }

def get_successful_meetings():

    query = """
    SELECT Id
    FROM Field_Visit__c
    WHERE Visit_Outcome__c = 'Successful Meeting'
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"

    response = sf_request(
        "GET",
        url
    )

    data = response.json()

    return {
        "successful_meetings": data["totalSize"]
    }

ACCOUNT_MAP_FIELDS = """
        Id,
        Name,
        Location__Latitude__s,
        Location__Longitude__s,
        Sales_Priority__c,
        GIS_Validation_Status__c,
        Territory_ID__c,
        Discovery_Source__c,
        Last_Visit_Date__c,
        Next_Visit_Date__c,
        AnnualRevenue,
        Owner.Name
"""

def get_accounts_map():

    query = f"""
    SELECT {ACCOUNT_MAP_FIELDS}
    FROM Account
    WHERE Location__Latitude__s != NULL
    AND Location__Longitude__s != NULL
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

# Same fields as get_accounts_map(), minus the "must already have
# coordinates" filter - that filter is correct for map pin placement,
# wrong for a plain list (silently hid every account that hasn't been
# geolocated yet, same root cause as the earlier Leads list bug).
def get_all_accounts():

    query = f"""
    SELECT {ACCOUNT_MAP_FIELDS}
    FROM Account
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_account_location(account_id: str):

    query = f"""
    SELECT
    Id,
    Name,
    Location__Latitude__s,
    Location__Longitude__s,
    Sales_Priority__c,
    GIS_Validation_Status__c
    FROM Account
    WHERE Id='{account_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    records = response.json()["records"]

    if len(records) == 0:
        return {
            "message": "Account not found"
        }

    return records[0]

def get_accounts_priority(priority: str):

    query = f"""
    SELECT
        Id,
        Name,
        Location__Latitude__s,
        Location__Longitude__s,
        Sales_Priority__c,
        GIS_Validation_Status__c
FROM Account
WHERE Sales_Priority__c = '{priority}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_accounts_validation(status: str):

    query = f"""
    SELECT
        Id,
        Name,
        Location__Latitude__s,
        Location__Longitude__s,
        Sales_Priority__c,
        GIS_Validation_Status__c
    FROM Account
    WHERE GIS_Validation_Status__c = '{status}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_leads_map():

    query = """
    SELECT
        Id,
        Name,
        Company,
        Location__Latitude__s,
        Location__Longitude__s,
        Sales_Priority__c,
        GIS_Validation_Status__c,
        Territory_ID__c
    FROM Lead
    WHERE Location__Latitude__s != NULL
    AND Location__Longitude__s != NULL
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_lead_location(lead_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Company,
        Location__Latitude__s,
        Location__Longitude__s,
        Sales_Priority__c,
        GIS_Validation_Status__c
    FROM Lead
    WHERE Id='{lead_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    records = response.json()["records"]

    if len(records) == 0:

        return {
            "message": "Lead not found"
        }

    return records[0]

def get_leads_priority(priority: str):

    query = f"""
    SELECT
        Id,
        Name,
        Company,
        Location__Latitude__s,
        Location__Longitude__s,
        Sales_Priority__c,
        GIS_Validation_Status__c
    FROM Lead
    WHERE Sales_Priority__c = '{priority}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_leads_validation(status: str):

    query = f"""
    SELECT
        Id,
        Name,
        Company,
        Location__Latitude__s,
        Location__Longitude__s,
        Sales_Priority__c,
        GIS_Validation_Status__c
    FROM Lead
    WHERE GIS_Validation_Status__c = '{status}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_discovery_candidates_map():

    query = """
    SELECT
        Id,
        Name,
        Candidate_Name__c,
        Business_Name__c,
        Location__Latitude__s,
        Location__Longitude__s,
        Confidence_Score__c,
        Validation_Status__c,
        Review_Status__c,
        Discovery_Source__c
    FROM Discovery_Candidate__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_discovery_candidate_location(candidate_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Candidate_Name__c,
        Business_Name__c,
        Location__Latitude__s,
        Location__Longitude__s,
        Confidence_Score__c,
        Validation_Status__c,
        Review_Status__c
    FROM Discovery_Candidate__c
    WHERE Id='{candidate_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    records = response.json()["records"]

    if len(records) == 0:

        return {
            "message": "Discovery Candidate not found"
        }

    return records[0]

def get_discovery_by_validation(status: str):

    query = f"""
    SELECT
        Id,
        Name,
        Candidate_Name__c,
        Business_Name__c,
        Location__Latitude__s,
        Location__Longitude__s,
        Validation_Status__c
    FROM Discovery_Candidate__c
    WHERE Validation_Status__c = '{status}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_discovery_by_review(review: str):

    query = f"""
    SELECT
        Id,
        Name,
        Candidate_Name__c,
        Business_Name__c,
        Location__Latitude__s,
        Location__Longitude__s,
        Review_Status__c
    FROM Discovery_Candidate__c
    WHERE Review_Status__c = '{review}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_discovery_by_source(source: str):

    query = f"""
    SELECT
        Id,
        Name,
        Candidate_Name__c,
        Business_Name__c,
        Location__Latitude__s,
        Location__Longitude__s,
        Discovery_Source__c
    FROM Discovery_Candidate__c
    WHERE Discovery_Source__c = '{source}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_territories_map():

    query = """
    SELECT
        Id,
        Name,
        Territory_Name__c,
        Territory_Code__c,
        Territory_Manager__r.Name,
        Status__c,
        Coverage_Percentage__c
    FROM Territory_Assignment__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_territory_location(territory_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory_Name__c,
        Territory_Code__c,
        Territory_Manager__r.Name,
        Status__c,
        Coverage_Percentage__c
    FROM Territory_Assignment__c
    WHERE Id='{territory_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    records = response.json()["records"]

    if len(records) == 0:

        return {
            "message": "Territory not found"
        }

    return records[0]

def get_territories_by_manager(manager_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory_Name__c,
        Territory_Code__c,
        Territory_Manager__r.Name,
        Status__c,
        Coverage_Percentage__c
    FROM Territory_Assignment__c
    WHERE Territory_Manager__c = '{manager_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_territories_by_status(status: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory_Name__c,
        Territory_Code__c,
        Territory_Manager__r.Name,
        Status__c,
        Coverage_Percentage__c
    FROM Territory_Assignment__c
    WHERE Status__c = '{status}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_routes_map():

    query = """
    SELECT
        Id,
        Name,
        Territory__r.Name,
        Sales_Representative__r.Name,
        Route_Date__c,
        Status__c
    FROM Route_Plan__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_route_location(route_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory__r.Name,
        Sales_Representative__r.Name,
        Route_Date__c,
        Status__c
    FROM Route_Plan__c
    WHERE Id='{route_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    records = response.json()["records"]

    if len(records) == 0:

        return {
            "message": "Route not found"
        }

    return records[0]

def get_routes_by_territory_map(territory_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory__r.Name,
        Sales_Representative__r.Name,
        Route_Date__c,
        Status__c
    FROM Route_Plan__c
    WHERE Territory__c = '{territory_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_routes_by_sales_rep_map(user_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory__r.Name,
        Sales_Representative__r.Name,
        Route_Date__c,
        Status__c
    FROM Route_Plan__c
    WHERE Sales_Representative__c = '{user_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_routes_by_date_map(route_date: str):

    query = f"""
    SELECT
        Id,
        Name,
        Territory__r.Name,
        Sales_Representative__r.Name,
        Route_Date__c,
        Status__c
    FROM Route_Plan__c
    WHERE Route_Date__c = {route_date}
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_field_visits_map():

    query = """
    SELECT
        Id,
        Name,
        Representative__r.Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Account__r.Name,
        Lead__r.Name
    FROM Field_Visit__c
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_field_visit_location(visit_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Representative__r.Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Account__r.Name,
        Lead__r.Name
    FROM Field_Visit__c
    WHERE Id='{visit_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    records = response.json()["records"]

    if len(records) == 0:

        return {
            "message": "Field Visit not found"
        }

    return records[0]

def get_field_visits_by_sales_rep(user_id: str):

    query = f"""
    SELECT
        Id,
        Name,
        Representative__r.Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Account__r.Name,
        Lead__r.Name
    FROM Field_Visit__c
    WHERE Representative__c = '{user_id}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_field_visits_by_date(visit_date: str):

    query = f"""
    SELECT
        Id,
        Name,
        Representative__r.Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Account__r.Name,
        Lead__r.Name
    FROM Field_Visit__c
    WHERE DAY_ONLY(Visit_Date__c) = {visit_date}
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_field_visits_by_outcome(outcome: str):

    query = f"""
    SELECT
        Id,
        Name,
        Representative__r.Name,
        Visit_Date__c,
        Visit_Outcome__c,
        Account__r.Name,
        Lead__r.Name
    FROM Field_Visit__c
    WHERE Visit_Outcome__c = '{outcome}'
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query?q={quote(query)}"
    )

    response = sf_request(
        "GET",
        url
    )

    return response.json()["records"]

def get_salesforce_users():

    query = """
    SELECT
        Id,
        Name,
        Username,
        Email,
        IsActive,
        GeoSales_Role__c
    FROM User
    WHERE IsActive = true
    ORDER BY Name
    """

    url = (
        f"{INSTANCE_URL}/services/data/v64.0/query"
    )

    response = sf_request(
        "GET",
        url,
        params={"q": query}
    )

    return response.json()["records"]

def update_salesforce_user_role(user_id: str, role: str):
    """
    Update GeoSales_Role__c for a Salesforce User.
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/User/{user_id}"

    payload = {
        "GeoSales_Role__c": role
    }

    sf_request(
        "PATCH",
        url,
        json=payload
    )

    return {
        "success": True,
        "user_id": user_id,
        "role": role
    }

    