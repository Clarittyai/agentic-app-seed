"""
Tests for the AI-onboarding backend (backend/shared/onboarding.py):
partial vs complete saves, script surfacing, the context-provider hook, the
concierge line falling back to the grounded template when no proxy is set,
and the two-pass template renderer.
"""

import json

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.security import require_user
from backend.shared import onboarding as ob
from backend.shared.onboarding import (
    OnboardingProfile,
    make_onboarding_router,
    render_template,
)

CONFIG = {
    "onboarding": {
        "persona": {"name": "Nova", "tagline": "your copilot"},
        "intro": ["Hey — I'm {persona.name}."],
        "voice": "llm",  # proxy unset in tests → must fall back to template
        "questions": [
            {
                "key": "quiet_days",
                "label": "Gone quiet after?",
                "type": "select",
                "options": [{"value": "14", "label": "14 days"}],
                "ask": "After how many silent days is an account gone quiet?",
                "ack": "{label} — that flags {ctx.quiet_preview.{value}} accounts today.",
                "ack_fallback": "{label} it is.",
            },
            {"key": "target", "label": "Target?", "type": "number"},
        ],
        "finale": ["Wiring targets"],
    }
}


def _client(tmp_path, monkeypatch, context_provider=None):
    cfg = tmp_path / "app-config.json"
    cfg.write_text(json.dumps(CONFIG))
    monkeypatch.setenv("APP_CONFIG_PATH", str(cfg))

    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine, tables=[OnboardingProfile.__table__])
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    app = FastAPI()
    app.include_router(make_onboarding_router(context_provider=context_provider))

    def _db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[require_user] = lambda: "u1"
    return TestClient(app), TestSession


def test_get_surfaces_script_and_question_passthrough(tmp_path, monkeypatch):
    client, _ = _client(tmp_path, monkeypatch)
    r = client.get("/api/onboarding").json()
    assert r["persona"]["name"] == "Nova"
    assert r["intro"] == ["Hey — I'm {persona.name}."]
    assert r["finale"] == ["Wiring targets"]
    assert r["questions"][0]["ask"].startswith("After how many")
    assert r["completed"] is False


def test_partial_save_stays_incomplete_then_completes(tmp_path, monkeypatch):
    client, Session = _client(tmp_path, monkeypatch)

    r1 = client.post("/api/onboarding", json={"answers": {"target": 5}, "complete": False}).json()
    assert r1["completed"] is False
    db = Session()
    profile = db.query(OnboardingProfile).one()
    assert profile.completed_at is None
    assert profile.answers == {"target": 5}
    assert "Target?" in (profile.context_text or "")  # agents benefit immediately
    db.close()

    r2 = client.post(
        "/api/onboarding", json={"answers": {"quiet_days": "14"}, "complete": True}
    ).json()
    assert r2["completed"] is True
    assert r2["answers"] == {"target": 5, "quiet_days": "14"}


def test_legacy_payload_still_completes(tmp_path, monkeypatch):
    client, _ = _client(tmp_path, monkeypatch)
    r = client.post("/api/onboarding", json={"answers": {"target": 1}}).json()
    assert r["completed"] is True


def test_context_endpoint_provider_and_resilience(tmp_path, monkeypatch):
    client, _ = _client(tmp_path, monkeypatch)
    assert client.get("/api/onboarding/context").json() == {"facts": {}}

    client2, _ = _client(
        tmp_path, monkeypatch, context_provider=lambda db, uid: {"accounts_count": 8}
    )
    assert client2.get("/api/onboarding/context").json() == {"facts": {"accounts_count": 8}}

    def _boom(db, uid):
        raise RuntimeError("nope")

    client3, _ = _client(tmp_path, monkeypatch, context_provider=_boom)
    assert client3.get("/api/onboarding/context").json() == {"facts": {}}  # never 500


def test_concierge_falls_back_to_grounded_template(tmp_path, monkeypatch):
    monkeypatch.delenv("CLARITTY_PLATFORM_URL", raising=False)
    client, _ = _client(
        tmp_path,
        monkeypatch,
        context_provider=lambda db, uid: {"quiet_preview": {"14": 2}},
    )
    r = client.post(
        "/api/onboarding/concierge",
        json={"step_key": "quiet_days", "value": "14", "label": "14 days"},
    ).json()
    assert r["source"] == "template"
    assert r["text"] == "14 days — that flags 2 accounts today."


def test_concierge_uses_ack_fallback_when_ctx_missing(tmp_path, monkeypatch):
    monkeypatch.delenv("CLARITTY_PLATFORM_URL", raising=False)
    client, _ = _client(tmp_path, monkeypatch)  # no provider → no quiet_preview
    r = client.post(
        "/api/onboarding/concierge",
        json={"step_key": "quiet_days", "value": "14", "label": "14 days"},
    ).json()
    assert r == {"text": "14 days it is.", "source": "template"}


def test_render_template_two_pass():
    r = render_template(
        "{label} — {ctx.quiet_preview.{value}} flagged.",
        value="14",
        label="14 days",
        ctx={"quiet_preview": {"14": 3}},
    )
    assert r == {"text": "14 days — 3 flagged.", "resolved": True}
    r2 = render_template("see {ctx.missing}", ctx={})
    assert r2["resolved"] is False
