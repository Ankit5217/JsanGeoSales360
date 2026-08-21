from pydantic import BaseModel
from typing import Optional
from datetime import date

class LeadCreate(BaseModel):
    LastName: str
    Company: str
    FirstName: str | None = None
    Phone: str | None = None
    Email: str | None = None
    Status: str | None = None

class LeadUpdate(BaseModel):
    LastName: str | None = None
    Company: str | None = None
    FirstName: str | None = None
    Phone: str | None = None
    Email: str | None = None
    Status: str | None = None
    Last_Visit_Date__c: Optional[date] = None
    GIS_Validation_Status__c: Optional[str] = None