from pydantic import BaseModel


class TerritoryCreate(BaseModel):

    Name: str

    Territory_Name__c: str | None = None

    Territory_Code__c: str | None = None

    Coverage_Percentage__c: float | None = None

    Status__c: str | None = None

    Notes__c: str | None = None

    Account__c: str | None = None

    Lead__c: str | None = None

    Representative__c: str | None = None

    Territory_Manager__c: str | None = None

    Boundary_GeoJSON__c: str | None = None


class TerritoryUpdate(BaseModel):

    Name: str | None = None

    Territory_Name__c: str | None = None

    Territory_Code__c: str | None = None

    Coverage_Percentage__c: float | None = None

    Status__c: str | None = None

    Notes__c: str | None = None

    Account__c: str | None = None

    Lead__c: str | None = None

    Representative__c: str | None = None

    Territory_Manager__c: str | None = None

    Boundary_GeoJSON__c: str | None = None
