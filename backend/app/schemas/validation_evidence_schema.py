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

    # A real camera-captured photo, base64-encoded (no "data:" prefix) -
    # not the Photo_URL__c field above, which stays available for a
    # manually typed URL. When present, the service layer uploads this as
    # a real Salesforce File (ContentVersion + ContentDocumentLink) after
    # creating the record, then sets Photo_URL__c to the resulting file's
    # download URL - no separate field needed on the read side.
    photo_base64: Optional[str] = None
    photo_filename: Optional[str] = None


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