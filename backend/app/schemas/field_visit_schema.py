from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class FieldVisitCreate(BaseModel):

    Name: str

    Account__c: Optional[str] = None
    Lead__c: Optional[str] = None
    Representative__c: Optional[str] = None
    Route_Plan__c: Optional[str] = None

    Visit_Date__c: Optional[datetime] = None
    Check_In_Time__c: Optional[datetime] = None
    Check_Out_Time__c: Optional[datetime] = None
    Follow_up_Date__c: Optional[date] = None

    Visit_Outcome__c: Optional[str] = None
    Notes__c: Optional[str] = None


class FieldVisitUpdate(BaseModel):

    Name: Optional[str] = None

    Account__c: Optional[str] = None
    Lead__c: Optional[str] = None
    Representative__c: Optional[str] = None
    Route_Plan__c: Optional[str] = None

    Visit_Date__c: Optional[datetime] = None
    Check_In_Time__c: Optional[datetime] = None
    Check_Out_Time__c: Optional[datetime] = None
    Follow_up_Date__c: Optional[date] = None

    Visit_Outcome__c: Optional[str] = None
    Notes__c: Optional[str] = None