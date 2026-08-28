import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Load .env directly rather than relying on some other module (e.g.
# salesforce_client) to have loaded it first - this module is imported
# before salesforce_router in main.py, so that ordering can't be assumed.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

security = HTTPBearer()


def _load_app_users():
    raw = os.getenv("APP_USERS", "[]")

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error("APP_USERS env var is not valid JSON")
        return []


def hash_password(password: str, salt: bytes | None = None) -> str:
    if salt is None:
        salt = os.urandom(16)

    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)

    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, _ = stored_hash.split("$")
    except ValueError:
        return False

    salt = bytes.fromhex(salt_hex)
    expected = hash_password(password, salt)

    return hmac.compare_digest(expected, stored_hash)


def authenticate_user(username: str, password: str):
    for user in _load_app_users():
        if (
            user.get("username") == username
            and verify_password(password, user.get("password_hash", ""))
        ):
            return {
                "username": username,
                "role": user.get("role"),
                # Optional: the real Salesforce User this login represents,
                # set via APP_USERS' "sf_user_id" - lets checkout attribute
                # a Field_Visit__c's Representative__c lookup to a real
                # person instead of leaving it blank. None when unset.
                "sf_user_id": user.get("sf_user_id")
            }

    return None


def create_access_token(username: str, role: str, sf_user_id: str | None = None) -> str:
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not set")

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": username,
        "role": role,
        "sf_user_id": sf_user_id,
        "exp": expire
    }

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str):
    """
    Shared JWT decode used by both the HTTP auth dependency below and the
    WebSocket handshake (main.py), which can't use Depends(HTTPBearer) since
    a browser WebSocket handshake can't carry a custom Authorization header.
    Returns None on any failure instead of raising - a WS failure means
    "close the connection", not an HTTP error response.
    """
    if not JWT_SECRET_KEY or not token:
        return None

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None

    username = payload.get("sub")

    if not username:
        return None

    return {
        "username": username,
        "role": payload.get("role"),
        "sf_user_id": payload.get("sf_user_id")
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not JWT_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth is not configured"
        )

    user = decode_token(credentials.credentials)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


def require_role(*allowed_roles: str):
    """
    A second Depends() layered on top of get_current_user for endpoints
    that need real authorization, not just authentication - e.g. managing
    other users' roles. Every salesforce_router endpoint already requires
    a valid JWT (see main.py's include_router), but that alone doesn't
    stop one valid, logged-in user from calling an endpoint meant for a
    different role.
    """

    def _check(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )

        return current_user

    return _check
