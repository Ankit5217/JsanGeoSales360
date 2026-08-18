from pydantic import BaseModel
from datetime import date


class OpportunityCreate(BaseModel):
    Name: str
    StageName: str
    CloseDate: date
    Amount: float | None = None


class OpportunityUpdate(BaseModel):
    Name: str | None = None
    StageName: str | None = None
    CloseDate: date | None = None
    Amount: float | None = None