"""
Generate an APP_USERS entry for backend/.env.

Usage:
    python backend/scripts/make_user.py <username> <password> <role>

Example:
    python backend/scripts/make_user.py admin "correct horse battery" ADMIN

Valid roles (must match frontend/src/config/rolePermissions.js):
    ADMIN, SALES_MANAGER, FIELD_USER

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
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)

    username, password, role = sys.argv[1:4]

    if role not in VALID_ROLES:
        print(f"Warning: '{role}' is not one of {sorted(VALID_ROLES)}")

    entry = {
        "username": username,
        "password_hash": hash_password(password),
        "role": role
    }

    print(json.dumps(entry))


if __name__ == "__main__":
    main()
