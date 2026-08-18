import logging

from fastapi import APIRouter
from app.realtime import broadcast_event
from app.services.salesforce_service import update_account
from app.salesforce_client import get_salesforce_users
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class UserRoleUpdate(BaseModel):
    role: str

from app.services.salesforce_service import  (
    get_accounts,
    get_leads,
    get_opportunities,
    get_discovery_candidates,
    get_territory_assignments,
    get_route_plans,
    get_field_visits,
    get_validation_evidence,
    create_account,
    delete_account,
    create_lead,
    update_lead,
    delete_lead,
    create_opportunity,
    update_opportunity,
    delete_opportunity,
    create_discovery_candidate,
    update_discovery_candidate,
    delete_discovery_candidate,
    create_territory,
    update_territory,
    delete_territory,
    create_route,
    update_route,
    delete_route,
    create_visit,
    update_visit,
    delete_visit,
    create_evidence,
    update_evidence,
    delete_evidence,
    get_accounts_by_territory,
    get_leads_by_territory,
    get_discovery_candidates_by_territory,
    get_routes_by_territory,
    get_routes_by_representative,
    get_todays_routes,
    get_visits_by_route,
    get_visits_by_representative,
    get_visits_by_date,
    get_visits_by_outcome,
    get_evidence_by_visit,
    get_evidence_by_account,
    get_evidence_by_lead,
    get_evidence_by_status,
    get_evidence_by_type,
    get_dashboard_summary,
    get_leads_by_status,
    get_leads_by_source,
    get_qualified_leads,
    get_converted_leads,
    get_monthly_leads,
    get_total_accounts,
    get_accounts_by_priority,
    get_accounts_by_validation,
    get_recently_visited_accounts,
    get_overdue_accounts,
    get_total_territories,
    get_active_territories,
    get_inactive_territories,
    get_territories_by_manager,
    get_total_routes,
    get_pending_routes,
    get_approved_routes,
    get_rejected_routes,
    get_total_distance,
    get_total_estimated_time,
    get_total_visits,
    get_today_visits,
    get_followup_visits,
    get_successful_meetings,
    get_accounts_map,
    get_account_location,
    get_accounts_priority,
    get_accounts_validation,
    get_leads_map,
    get_lead_location,
    get_leads_priority, 
    get_leads_validation,
    get_discovery_candidates_map,
    get_discovery_candidate_location,
    get_discovery_by_validation,
    get_discovery_by_review,
    get_discovery_by_source,
    get_territories_map,
    get_territory_location,
    get_territories_by_status,
    get_routes_map,
    get_route_location,
    get_routes_by_territory_map,
    get_routes_by_sales_rep_map,
    get_routes_by_date_map,
    get_field_visits_map,
    get_field_visit_location,
    get_field_visits_by_sales_rep,
    get_field_visits_by_date,
    get_field_visits_by_outcome,
    update_salesforce_user_role,

)

from app.schemas.account_schema import (
    AccountCreate,
    AccountUpdate,
)

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

router = APIRouter(
    prefix="/salesforce",
    tags=["Salesforce"]
)

@router.get("/accounts")
def read_accounts():
    return get_accounts()

@router.get("/leads")
def read_leads():
    return get_leads()

@router.get("/opportunities")
def read_opportunities():
    return get_opportunities()

@router.get("/discovery-candidates")
def read_discovery_candidates():
    return get_discovery_candidates()

@router.get("/territories")
def territories():
    return get_territory_assignments()


@router.get("/routes")
def routes():
    return get_route_plans()


@router.get("/visits")
def visits():
    return get_field_visits()


@router.get("/evidence")
def evidence():
    return get_validation_evidence()

@router.post("/accounts")
def add_account(account: AccountCreate):
    return create_account(account)

# @router.put("/accounts/{account_id}")
# def edit_account(account_id: str, account: AccountUpdate):
#     return update_account(account_id, account)

@router.delete("/accounts/{account_id}")
def remove_account(account_id: str):
    return delete_account(account_id)

@router.post("/leads")
def add_lead(lead: LeadCreate):
    return create_lead(lead)



@router.delete("/leads/{lead_id}")
def remove_lead(lead_id: str):
    return delete_lead(lead_id)

@router.post("/opportunities")
def add_opportunity(opportunity: OpportunityCreate):
    return create_opportunity(opportunity)


@router.put("/opportunities/{opportunity_id}")
def edit_opportunity(
    opportunity_id: str,
    opportunity: OpportunityUpdate
):
    return update_opportunity(opportunity_id, opportunity)


@router.delete("/opportunities/{opportunity_id}")
def remove_opportunity(opportunity_id: str):
    return delete_opportunity(opportunity_id)

@router.post("/discovery-candidates")
def add_discovery_candidate(
    candidate: DiscoveryCandidateCreate
):
    return create_discovery_candidate(candidate)


@router.put("/discovery-candidates/{candidate_id}")
def edit_discovery_candidate(
    candidate_id: str,
    candidate: DiscoveryCandidateUpdate
):
    return update_discovery_candidate(
        candidate_id,
        candidate
    )


@router.delete("/discovery-candidates/{candidate_id}")
def remove_discovery_candidate(
    candidate_id: str
):
    return delete_discovery_candidate(candidate_id)

@router.post("/territories")
def create_new_territory(territory: TerritoryCreate):
    return create_territory(territory)


@router.put("/territories/{territory_id}")
def update_existing_territory(
    territory_id: str,
    territory: TerritoryUpdate
):
    return update_territory(
        territory_id,
        territory
    )


@router.delete("/territories/{territory_id}")
def delete_existing_territory(territory_id: str):
    return delete_territory(territory_id)

@router.post("/routes")
def routes(route: RouteCreate):
    return create_route(route)


@router.put("/routes/{route_id}")
def routes(route_id: str, route: RouteUpdate):
    return update_route(route_id, route)


@router.delete("/routes/{route_id}")
def routes(route_id: str):
    return delete_route(route_id)

@router.post("/visits")
def create_new_visit(visit: FieldVisitCreate):
    return create_visit(visit)


@router.put("/visits/{visit_id}")
async def update_existing_visit(
    visit_id: str,
    visit: FieldVisitUpdate
):
    updated_visit = update_visit(
        visit_id,
        visit
    )

    try:
        await broadcast_event(
            "field_visit_updated",
            updated_visit
        )
    except Exception:
        logger.exception(
            "Field visit WebSocket broadcast failed for %s",
            visit_id
        )

    return updated_visit


@router.delete("/visits/{visit_id}")
def delete_existing_visit(visit_id: str):
    return delete_visit(visit_id)

@router.post("/evidence")
def create_new_evidence(evidence: ValidationEvidenceCreate):
    return create_evidence(evidence)


@router.put("/evidence/{evidence_id}")
def update_existing_evidence(
    evidence_id: str,
    evidence: ValidationEvidenceUpdate
):
    return update_evidence(evidence_id, evidence)


@router.delete("/evidence/{evidence_id}")
def delete_existing_evidence(evidence_id: str):
    return delete_evidence(evidence_id)

@router.get("/territories/{territory_id}/accounts")
def accounts_by_territory(territory_id: str):
    return get_accounts_by_territory(territory_id)

@router.get("/territories/{territory_id}/leads")
def leads_by_territory(territory_id: str):
    return get_leads_by_territory(territory_id)

@router.get("/territories/{territory_id}/discovery-candidates")
def discovery_candidates_by_territory(territory_id: str):
    return get_discovery_candidates_by_territory(territory_id)

@router.get("/territories/{territory_id}/routes")
def routes_by_territory(territory_id: str):
    return get_routes_by_territory(territory_id)

@router.get("/representatives/{user_id}/routes")
def routes_by_representative(user_id: str):
    return get_routes_by_representative(user_id)

@router.get("/routes/today")
def todays_routes():
    return get_todays_routes()

@router.get("/visits/route/{route_id}")

def visits_by_route(route_id: str):

    return get_visits_by_route(route_id)

@router.get("/visits/representative/{user_id}")
def visits_by_representative(user_id: str):
    return get_visits_by_representative(user_id)

@router.get("/visits/date/{visit_date}")
def visits_by_date(visit_date: str):
    return get_visits_by_date(visit_date)

@router.get("/visits/outcome/{outcome}")
def visits_by_outcome(outcome: str):
    return get_visits_by_outcome(outcome)

@router.get("/evidence/visit/{visit_id}")
def evidence_by_visit(visit_id: str):

    return get_evidence_by_visit(visit_id)

@router.get("/evidence/account/{account_id}")
def evidence_by_account(account_id: str):
    return get_evidence_by_account(account_id)

@router.get("/evidence/lead/{lead_id}")
def evidence_by_lead(lead_id: str):
    return get_evidence_by_lead(lead_id)

@router.get("/evidence/status/{status}")
def evidence_by_status(status: str):
    return get_evidence_by_status(status)

@router.get("/evidence/type/{evidence_type}")
def evidence_by_type(evidence_type: str):
    return get_evidence_by_type(evidence_type)

@router.get("/dashboard/summary")
def dashboard_summary():
    return get_dashboard_summary()

@router.get("/dashboard/leads/status")
def leads_by_status():
    return get_leads_by_status()

@router.get("/dashboard/leads/source")
def leads_by_source():
    return get_leads_by_source()

@router.get("/dashboard/leads/qualified")
def qualified_leads():
    return get_qualified_leads()

@router.get("/dashboard/leads/converted")
def converted_leads():
    return get_converted_leads()

@router.get("/dashboard/leads/monthly")
def monthly_leads():
    return get_monthly_leads()

@router.get("/dashboard/accounts/total", tags=["Dashboard"])
def total_accounts():
    return get_total_accounts()

@router.get("/dashboard/accounts/priority/{priority}", tags=["Dashboard"])
def accounts_by_priority(priority: str):
    return get_accounts_by_priority(priority)

@router.get("/dashboard/accounts/validation/{status}", tags=["Dashboard"])
def accounts_validation(status: str):
    return get_accounts_by_validation(status)

@router.get("/dashboard/accounts/recent-visits", tags=["Dashboard"])
def recent_visits():
    return get_recently_visited_accounts()

@router.get("/dashboard/accounts/overdue-visits", tags=["Dashboard"])
def overdue_visits():
    return get_overdue_accounts()

@router.get("/dashboard/territories/total", tags=["Dashboard"])
def total_territories():
    return get_total_territories()

@router.get("/dashboard/territories/active", tags=["Dashboard"])
def active_territories():
    return get_active_territories()

@router.get("/dashboard/territories/inactive", tags=["Dashboard"])
def inactive_territories():
    return get_inactive_territories()

@router.get("/dashboard/territories/manager/{user_id}", tags=["Dashboard"])
def territories_by_manager(user_id: str):
    return get_territories_by_manager(user_id)

@router.get("/dashboard/routes/total")
def total_routes():
    return get_total_routes()

@router.get("/dashboard/routes/pending")
def pending_routes():
    return get_pending_routes()

@router.get("/dashboard/routes/approved")
def approved_routes():
    return get_approved_routes()

@router.get("/dashboard/routes/rejected")
def rejected_routes():
    return get_rejected_routes()

@router.get("/dashboard/routes/distance")
def total_distance():
    return get_total_distance()

@router.get("/dashboard/routes/time")
def total_time():
    return get_total_estimated_time()

@router.get("/dashboard/visits/total")
def total_visits():
    return get_total_visits()

@router.get("/dashboard/visits/today")
def today_visits():
    return get_today_visits()

@router.get("/dashboard/visits/followup")
def followup_visits():
    return get_followup_visits()

@router.get("/dashboard/visits/successful")
def successful_meetings():
    return get_successful_meetings()

@router.get("/gis/accounts")
def gis_accounts():
    return get_accounts_map()

@router.get("/gis/accounts/{account_id}")
def gis_account(account_id: str):
    return get_account_location(account_id)

@router.get("/gis/accounts/priority/{priority}")
def gis_accounts_priority(priority: str):
    return get_accounts_priority(priority)

@router.get("/gis/accounts/validation/{status}")
def gis_accounts_validation(status: str):
    return get_accounts_validation(status)

@router.get("/gis/leads")
def gis_leads():
    return get_leads_map()

@router.get("/gis/leads/{lead_id}")
def gis_lead(lead_id: str):
    return get_lead_location(lead_id)

@router.get("/gis/leads/priority/{priority}")
def gis_leads_priority(priority: str):
    return get_leads_priority(priority)

@router.get("/gis/leads/validation/{status}")
def gis_leads_validation(status: str):
    return get_leads_validation(status)

@router.get("/gis/discovery")
def gis_discovery():
    return get_discovery_candidates_map()

@router.get("/gis/discovery/{candidate_id}")
def gis_discovery_candidate(candidate_id: str):
    return get_discovery_candidate_location(candidate_id)

@router.get("/gis/discovery/validation/{status}")
def gis_discovery_validation(status: str):
    return get_discovery_by_validation(status)

@router.get("/gis/discovery/review/{review}")
def gis_discovery_review(review: str):
    return get_discovery_by_review(review)

@router.get("/gis/discovery/source/{source}")
def gis_discovery_source(source: str):
    return get_discovery_by_source(source)

@router.get("/gis/territories")
def gis_territories():
    return get_territories_map()

@router.get("/gis/territories/{territory_id}")
def gis_territory(territory_id: str):
    return get_territory_location(territory_id)

@router.get("/gis/territories/manager/{manager_id}")
def gis_territories_manager(manager_id: str):
    return get_territories_by_manager(manager_id)

@router.get("/gis/territories/status/{status}")
def gis_territories_status(status: str):
    return get_territories_by_status(status)

@router.get("/gis/routes")
def gis_routes():
    return get_routes_map()

@router.get("/gis/routes/{route_id}")
def gis_route(route_id: str):
    return get_route_location(route_id)

@router.get("/gis/routes/territory/{territory_id}")
def gis_routes_territory(territory_id: str):
    return get_routes_by_territory_map(territory_id)

@router.get("/gis/routes/sales-rep/{user_id}")
def gis_routes_sales_rep(user_id: str):
    return get_routes_by_sales_rep_map(user_id)

@router.get("/gis/routes/date/{route_date}")
def gis_routes_date(route_date: str):
    return get_routes_by_date_map(route_date)

@router.get("/gis/field-visits")
def gis_field_visits():
    return get_field_visits_map()

@router.get("/gis/field-visits/{visit_id}")
def gis_field_visit(visit_id: str):
    return get_field_visit_location(visit_id)

@router.get("/gis/field-visits/sales-rep/{user_id}")
def gis_field_visits_sales_rep(user_id: str):
    return get_field_visits_by_sales_rep(user_id)

@router.get("/gis/field-visits/date/{visit_date}")
def gis_field_visits_date(visit_date: str):
    return get_field_visits_by_date(visit_date)

@router.get("/gis/field-visits/outcome/{outcome}")
def gis_field_visits_outcome(outcome: str):
    return get_field_visits_by_outcome(outcome)


@router.put("/accounts/{account_id}")
async def update_salesforce_account(
    account_id: str,
    payload: AccountUpdate
):
    updated_account = update_account(
        account_id,
        payload
    )

    try:
        await broadcast_event(
            "account_updated",
            updated_account
        )
    except Exception:
        logger.exception(
            "Account WebSocket broadcast failed for %s",
            account_id
        )

    return updated_account

@router.get("/users")
def read_salesforce_users():
    return get_salesforce_users()

@router.put("/users/{user_id}/role")

def update_user_role(
    user_id: str,
    data: UserRoleUpdate
):
    return update_salesforce_user_role(
        user_id,
        data.role
    )

@router.put("/leads/{lead_id}")
def edit_lead(
    lead_id: str,
    lead: LeadUpdate
):
    return update_lead(
        lead_id,
        lead
    )