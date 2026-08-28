"""
Generate an APP_USERS entry for backend/.env.

Usage:
    python backend/scripts/make_user.py <username> <password> <role> [sf_user_id]

Example:
    python backend/scripts/make_user.py admin "correct horse battery" ADMIN
    python backend/scripts/make_user.py shafre "correct horse battery" FIELD_USER 005gL00000Lnvx7QAB

Valid roles (must match frontend/src/config/rolePermissions.js):
    ADMIN, SALES_MANAGER, FIELD_USER

sf_user_id (optional) is the 18-char Id of the real Salesforce User this
login represents - GET /salesforce/users lists them. Without it, this
login's Field Visits leave Representative__c blank ("Not Assigned" in the
UI), since there's no other way for the app to know which real person is
behind an app login.

Paste the printed JSON object into the APP_USERS array in your .env
(APP_USERS is a JSON array, so multiple users look like:
[{"username": "a", ...}, {"username": "b", ...}]).
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.auth import hash_password

VALID_ROLES = {
    "ADMIN",
    "SALES_MANAGER",
    "FIELD_USER"
}


def main():
    if len(sys.argv) not in (4, 5):
        print(__doc__)
        sys.exit(1)

    username, password, role = sys.argv[1:4]
    sf_user_id = sys.argv[4] if len(sys.argv) == 5 else None

    if role not in VALID_ROLES:
        print(f"Warning: '{role}' is not one of {sorted(VALID_ROLES)}")

    entry = {
        "username": username,
        "password_hash": hash_password(password),
        "role": role
    }

    if sf_user_id:
        entry["sf_user_id"] = sf_user_id

    print(json.dumps(entry))


if __name__ == "__main__":
    main()
