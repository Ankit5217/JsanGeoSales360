import requests
from salesforce_client import INSTANCE_URL, headers

url = (
    f"{INSTANCE_URL}/services/data/v64.0/query/"
    "?q=SELECT+Id,Name,Type+FROM+Account"
)

response = requests.get(url, headers=headers())

print("Status:", response.status_code)

data = response.json()

print(data)