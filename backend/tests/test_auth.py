"""
Pure unit tests for app.auth - password hashing, JWT round-trip, and the
require_role() authorization gate. None of these touch Salesforce or the
network, so they're safe to run anywhere (including CI) with no live
credentials.
"""
import time

import pytest
from fastapi import HTTPException

from app.auth import (
    ADMIN_ONLY,
    ANY_ROLE,
    MANAGER_UP,
    create_access_token,
    decode_token,
    hash_password,
    require_role,
    verify_password,
)


def test_hash_password_round_trip():
    stored = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", stored)


def test_hash_password_rejects_wrong_password():
    stored = hash_password("correct horse battery staple")
    assert not verify_password("wrong password", stored)


def test_hash_password_uses_a_fresh_salt_each_time():
    # Two hashes of the same password must never be byte-identical - this
    # is exactly the bug this test guards against (backend/.env once had
    # two different users sharing one copy-pasted hash).
    first = hash_password("same password")
    second = hash_password("same password")
    assert first != second


def test_verify_password_rejects_malformed_hash():
    assert not verify_password("anything", "not-a-real-hash-no-dollar-sign")


def test_access_token_round_trip():
    token = create_access_token("fieldtest", "FIELD_USER", sf_user_id="005gL00000Lnvx7QAB")
    decoded = decode_token(token)

    assert decoded == {
        "username": "fieldtest",
        "role": "FIELD_USER",
        "sf_user_id": "005gL00000Lnvx7QAB",
    }


def test_decode_token_rejects_garbage():
    assert decode_token("not.a.jwt") is None


def test_decode_token_rejects_empty_string():
    assert decode_token("") is None


def test_decode_token_rejects_expired_token(monkeypatch):
    # Force ACCESS_TOKEN_EXPIRE_MINUTES-independent expiry by minting a
    # token whose exp is already in the past.
    import jwt as pyjwt
    from datetime import datetime, timedelta, timezone

    import app.auth as auth_module

    payload = {
        "sub": "fieldtest",
        "role": "FIELD_USER",
        "sf_user_id": None,
        "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
    }
    expired_token = pyjwt.encode(payload, auth_module.JWT_SECRET_KEY, algorithm=auth_module.JWT_ALGORITHM)

    assert decode_token(expired_token) is None


def _call_require_role(*allowed_roles, role):
    """require_role() returns a FastAPI dependency (a function expecting
    current_user via Depends) - calling its inner _check directly with a
    plain dict sidesteps needing a real FastAPI request/TestClient."""
    checker = require_role(*allowed_roles)
    return checker(current_user={"username": "someone", "role": role})


def test_require_role_allows_a_listed_role():
    result = _call_require_role(*MANAGER_UP, role="SALES_MANAGER")
    assert result["role"] == "SALES_MANAGER"


def test_require_role_rejects_an_unlisted_role():
    with pytest.raises(HTTPException) as exc_info:
        _call_require_role(*ADMIN_ONLY, role="FIELD_USER")

    assert exc_info.value.status_code == 403


def test_require_role_any_role_allows_all_three_app_roles():
    for role in ("ADMIN", "SALES_MANAGER", "FIELD_USER"):
        assert _call_require_role(*ANY_ROLE, role=role)["role"] == role
