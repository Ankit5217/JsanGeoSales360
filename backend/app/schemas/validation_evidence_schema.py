from pydantic import BaseModel
from datetime import date
from typing import Optional


class ValidationEvidenceCreate(BaseModel):

    Name: str

    Account__c: Optional[str] = None
    Lead__c: Optional[str] = None
    Field_Visit__c: Optional[str] = None
    Verified_By__c: Optional[str] = None

    Evidence_Type__c: Optional[str] = None
    Photo_URL__c: Optional[str] = None
    Validation_Date__c: Optional[date] = None
    Status__c: Optional[str] = None
    Remarks__c: Optional[str] = None


class ValidationEvidenceUpdate(BaseModel):

    Name: Optional[str] = None

    Account__c: Optional[str] = None
    Lead__c: Optional[str] = None
    Field_Visit__c: Optional[str] = None
    Verified_By__c: Optional[str] = None

    Evidence_Type__c: Optional[str] = None
    Photo_URL__c: Optional[str] = None
    Validation_Date__c: Optional[date] = None
    Status__c: Optional[str] = None
    Remarks__c: Optional[str] = None