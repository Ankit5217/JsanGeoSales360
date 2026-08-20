import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
                "role": user.get("role")
            }

    return None


def create_access_token(username: str, role: str) -> str:
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY is not set")

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": username,
        "role": role,
        "exp": expire
    }

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not JWT_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth is not configured"
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    username = payload.get("sub")

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return {
        "username": username,
        "role": payload.get("role")
    }
