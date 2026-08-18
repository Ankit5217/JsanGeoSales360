from pydantic import BaseModel
from datetime import date


class AccountCreate(BaseModel):
    Name: str
    Phone: str | None = None
    Type: str | None = None
    BillingCity: str | None = None


class AccountUpdate(BaseModel):
    Name: str | None = None
    Phone: str | None = None
    Type: str | None = None
    BillingCity: str | None = None

    # GIS / Field Visit fields
    Last_Visit_Date__c: date | None = None
    GIS_Validation_Status__c: str | None = None