from typing import Any, List, Optional

from pydantic import BaseModel


class TerritoryBalanceMove(BaseModel):
    record_type: str  # "Account" | "Lead"
    id: str
    name: Optional[str] = None
    from_code: str
    to_code: str


class TerritoryBalanceTerritoryState(BaseModel):
    # Territory_Assignment__c's own Id - needed on apply to PATCH the right
    # record; territory_code alone isn't guaranteed unique enough to trust.
    territory_id: str
    territory_code: str
    territory_name: Optional[str] = None
    workload_before: int
    workload_after: int
    potential_before: float
    potential_after: float
    # GeoJSON Polygon geometry (dict) - only set when this territory's
    # boundary actually changed. None means "no redraw needed."
    boundary_after: Optional[Any] = None


class TerritoryBalanceExcluded(BaseModel):
    territory_code: Optional[str] = None
    territory_name: Optional[str] = None
    reason: str


class TerritoryBalanceProposal(BaseModel):
    """
    Returned by POST /territories/analyze-balance (zero writes) and sent
    back unmodified to POST /territories/apply-balance - the same shape for
    both so "what you previewed" and "what gets applied" can never drift
    apart.
    """
    fair_workload: float
    threshold_pct: float
    territories: List[TerritoryBalanceTerritoryState] = []
    moves: List[TerritoryBalanceMove] = []
    excluded_territories: List[TerritoryBalanceExcluded] = []
    message: Optional[str] = None
