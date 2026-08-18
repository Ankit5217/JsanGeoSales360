from app.services.salesforce_service import get_accounts

accounts = get_accounts()

print(accounts["totalSize"])

for account in accounts["records"]:
    print(account["Name"])