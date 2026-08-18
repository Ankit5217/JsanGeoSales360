from pydantic import BaseModel


class DiscoveryCandidateCreate(BaseModel):

    Name: str

    Candidate_Name__c: str | None = None

    Business_Name__c: str | None = None

    Address__c: str | None = None

    Phone__c: str | None = None

    Discovery_Source__c: str | None = None

    Confidence_Score__c: float | None = None

    Validation_Status__c: str | None = None

    Review_Status__c: str | None = None

    Duplicate_Status__c: str | None = None

    Assigned_Territory__c: str | None = None

    Assigned_Representative__c: str | None = None

    Related_Account__c: str | None = None

    Related_Lead__c: str | None = None


class DiscoveryCandidateUpdate(BaseModel):

    Name: str | None = None

    Candidate_Name__c: str | None = None

    Business_Name__c: str | None = None

    Address__c: str | None = None

    Phone__c: str | None = None

    Discovery_Source__c: str | None = None

    Confidence_Score__c: float | None = None

    Validation_Status__c: str | None = None

    Review_Status__c: str | None = None

    Duplicate_Status__c: str | None = None

    Assigned_Territory__c: str | None = None

    Assigned_Representative__c: str | None = None

    Related_Account__c: str | None = None

    Related_Lead__c: str | None = None