# from salesforce_client import sf

# print("=" * 50)
# print("CONNECTED TO SALESFORCE")
# print("=" * 50)

# print("Instance URL:")
# print(sf["instance_url"])

# print()

# print("Token Type:")
# print(sf["token_type"])

# print()

# print("Access Token:")
# print(sf["access_token"][:50] + "...")

from salesforce_client import sf
import requests

headers = {
    "Authorization": f"Bearer {sf['access_token']}"
}

url = f"{sf['instance_url']}/services/data/v64.0/"

response = requests.get(url, headers=headers)

print("Status Code:", response.status_code)
print(response.json())