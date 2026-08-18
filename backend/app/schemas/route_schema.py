from typing import Optional
from datetime import date
from pydantic import BaseModel


class RouteCreate(BaseModel):
    Route_Name__c: str
    Route_Date__c: date

    Estimated_Time__c: Optional[int] = None
    Total_Distance__c: Optional[int] = None
    Status__c: Optional[str] = None

    Territory__c: Optional[str] = None
    Sales_Representative__c: Optional[str] = None
    Account__c: Optional[str] = None
    Lead__c: Optional[str] = None


class RouteUpdate(BaseModel):
    Route_Name__c: Optional[str] = None
    Route_Date__c: Optional[date] = None

    Estimated_Time__c: Optional[int] = None
    Total_Distance__c: Optional[int] = None
    Status__c: Optional[str] = None

    Territory__c: Optional[str] = None
    Sales_Representative__c: Optional[str] = None
    Account__c: Optional[str] = None
    Lead__c: Optional[str] = None