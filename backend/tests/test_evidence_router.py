"""
Unit tests for create_new_evidence()'s Status__c/Verified_By__c decision
logic - the router function is called directly (bypassing FastAPI's
Depends wiring, which only matters for a real HTTP request) with
create_evidence() monkeypatched so the test BODIES never touch Salesforce.
This locks in two security-relevant behaviors from this session:

  1. Status__c always starts "Pending" server-side, regardless of what a
     caller sends - the self-approval gap PUT /evidence/{id}'s role gate
     was added to close.
  2. Verified_By__c is only ever set by the server, from the authenticated
     caller - never trusted from the request body - and only when the
     caller actually provided something (a photo, or an auto-logged
     checkout verification tied to a real Field_Visit__c).

Importing app.routers.salesforce_router pulls in app.salesforce_client,
which authenticates against Salesforce immediately at import time (a real
network call, module-level, not lazy) - so this file needs backend/.env
with real SF_* credentials just to collect, and skips cleanly (not a
failure) wherever that's not available, e.g. CI.
"""
import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

if not (os.getenv("SF_LOGIN_URL") and os.getenv("SF_CLIENT_ID") and os.getenv("SF_CLIENT_SECRET")):
    pytest.skip(
        "Requires backend/.env with real Salesforce credentials - "
        "app.salesforce_client authenticates at import time.",
        allow_module_level=True
    )

import app.routers.salesforce_router as salesforce_router
from app.schemas.validation_evidence_schema import ValidationEvidenceCreate


def _create(monkeypatch, evidence, role="FIELD_USER", sf_user_id="005gL00000Lnvx7QAB"):
    captured = {}

    def fake_create_evidence(ev):
        captured["evidence"] = ev
        return {"message": "ok", "id": "a04FAKE"}

    monkeypatch.setattr(salesforce_router, "create_evidence", fake_create_evidence)

    salesforce_router.create_new_evidence(
        evidence=evidence,
        current_user={"username": "fieldtest", "role": role, "sf_user_id": sf_user_id},
    )

    return captured["evidence"]


def test_status_always_starts_pending_even_if_client_sends_approved(monkeypatch):
    evidence = ValidationEvidenceCreate(Name="QA Evidence", Status__c="Approved")
    result = _create(monkeypatch, evidence)
    assert result.Status__c == "Pending"


def test_verified_by_is_set_when_a_photo_is_attached(monkeypatch):
    evidence = ValidationEvidenceCreate(Name="QA Evidence", photo_base64="ZmFrZQ==")
    result = _create(monkeypatch, evidence, sf_user_id="005gL00000Lnvx7QAB")
    assert result.Verified_By__c == "005gL00000Lnvx7QAB"


def test_verified_by_is_set_for_an_auto_logged_checkout_verification(monkeypatch):
    # No photo, but a real Field_Visit__c link - the signature of
    # buildAutoEvidencePayload()'s checkout-triggered evidence.
    evidence = ValidationEvidenceCreate(Name="QA Evidence", Field_Visit__c="a03FAKE")
    result = _create(monkeypatch, evidence, sf_user_id="005gL00000Lnvx7QAB")
    assert result.Verified_By__c == "005gL00000Lnvx7QAB"


def test_verified_by_stays_empty_for_a_bare_manager_placeholder_request(monkeypatch):
    # An admin/manager logging a request with no photo yet, for a field
    # rep to fulfill later - they haven't provided the evidence themselves.
    evidence = ValidationEvidenceCreate(Name="QA Evidence")
    result = _create(monkeypatch, evidence, role="ADMIN", sf_user_id="005gL00000LkRM5QAN")
    assert result.Verified_By__c is None


def test_client_supplied_verified_by_is_never_trusted(monkeypatch):
    # A direct API call trying to attribute the evidence to someone else -
    # the server must overwrite this with the authenticated caller's own id
    # (or clear it), never pass through the client's claim.
    evidence = ValidationEvidenceCreate(Name="QA Evidence", Verified_By__c="005gL00000SOMEONEELSE")
    result = _create(monkeypatch, evidence, sf_user_id="005gL00000Lnvx7QAB")
    assert result.Verified_By__c != "005gL00000SOMEONEELSE"
