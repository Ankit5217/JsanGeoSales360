import logging
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

logger = logging.getLogger(__name__)

LOGIN_URL = os.getenv("SF_LOGIN_URL")
CLIENT_ID = os.getenv("SF_CLIENT_ID")
CLIENT_SECRET = os.getenv("SF_CLIENT_SECRET")


def get_access_token():
    url = f"{LOGIN_URL}/services/oauth2/token"

    payload = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }

    response = requests.post(
        url,
        data=payload,
        timeout=15
    )
    response.raise_for_status()

    return response.json()
sf = get_access_token()

ACCESS_TOKEN = sf["access_token"]
INSTANCE_URL = sf["instance_url"]


def refresh_access_token():
    """Re-authenticate with Salesforce and swap in a fresh access token.

    Called by sf_request() when a call comes back 401 (expired session),
    since the token above is otherwise only ever fetched once, at import.
    """
    global ACCESS_TOKEN

    logger.warning("Salesforce access token expired or invalid; refreshing")

    sf = get_access_token()
    ACCESS_TOKEN = sf["access_token"]


def headers():
    return {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

def get_salesforce_users():

    query = """
    SELECT
        Id,
        Name,
        Username,
        Email,
        IsActive,
        Profile.Name,
        GeoSales_Role__c
    FROM User
    WHERE IsActive = true
    ORDER BY Name
    """

    url = f"{INSTANCE_URL}/services/data/v64.0/query"

    response = requests.get(
        url,
        params={"q": query},
        headers=headers(),
        timeout=15
    )

    if not response.ok:
        logger.error(
            "Salesforce Users request failed (%s): %s",
            response.status_code, response.text
        )

    response.raise_for_status()

    result = response.json()

    # Renamed to the shape AdminUsers.jsx actually reads (user.id/.name/
    # .email/.profile/.geoSalesRole) - the raw Salesforce-cased records
    # returned here previously left every column blank in the UI.
    users = []

    for record in result["records"]:
        profile = record.get("Profile") or {}

        users.append({
            "id": record.get("Id"),
            "name": record.get("Name"),
            "username": record.get("Username"),
            "email": record.get("Email"),
            "isActive": record.get("IsActive"),
            "profile": profile.get("Name"),
            "geoSalesRole": record.get("GeoSales_Role__c")
        })

    return users

def update_salesforce_user_role(user_id: str, role: str):

    url = f"{INSTANCE_URL}/services/data/v64.0/sobjects/User/{user_id}"

    payload = {
        "GeoSales_Role__c": role
    }

    response = requests.patch(
        url,
        json=payload,
        headers=headers(),
        timeout=15
    )

    if not response.ok:
        logger.error(
            "Update user role failed (%s): %s",
            response.status_code, response.text
        )

    response.raise_for_status()

    return {
        "success": True,
        "user_id": user_id,
        "role": role
    }

# users = get_salesforce_users()

# for user in users:
#     print(
#         user["Ankit Saxena"],
#         "|",
#         user["saxenaankit035.86a20b307d3a@agentforce.com"],
#         "|",
#         user.get("System Administrator")
#     )