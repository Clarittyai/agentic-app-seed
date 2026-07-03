"""
B6 — AI onboarding: the per-user profile that tailors the app's intelligence.

Every app ships a short first-run interview (frontend/src/components/
OnboardingFlow.tsx). The questions are AUTHORED PER APP in app-config.json →
`onboarding.questions` (filled at generation time to fit the domain); the
answers are stored here as a per-user `OnboardingProfile` and composed into a
`context_text` block that agents inject into the model via `before(ctx)`:

    from claritty_sdk import agent, AgentContext, BaseAgent

    @agent(id="my-agent")
    class MyAgent(BaseAgent):
        system_prompt = "..."

        def before(self, ctx: AgentContext) -> None:
            from backend.database import SessionLocal
            from backend.shared.onboarding import profile_context
            db = SessionLocal()
            try:
                extra = profile_context(db, ctx.user_id)
                if extra:
                    ctx.user_context = f"{ctx.user_context}\\n{extra}".strip()
            finally:
                db.close()

`ctx.user_context` is injected into the agent's LLM system prompt by the SDK
tool-use loop, so the user's stated goals/thresholds/priorities shape every
run — and deterministic fallbacks can read the raw `answers` for the same
tailoring without a model. The onboarding also defines the user's "good
progress": record target numbers among the questions and surface progress
against them on the dashboard.

Composition is deterministic (label: value lines). An app that wants an
LLM-polished profile summary can post-process `context_text` through
`claritty_sdk.llm.get_llm_client` — always keep the deterministic text as the
fallback.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.orm import Session

from backend.database import Base, get_db
from backend.security import require_user


class OnboardingProfile(Base):
    """One row per user: their onboarding answers + the composed context the
    agents read. KEEP this model (platform pattern, like UserIntegration)."""

    __tablename__ = "onboarding_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)  # multi-tenancy key
    answers = Column(JSON, default=dict)
    context_text = Column(Text)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "answers": self.answers or {},
            "completed": self.completed_at is not None,
        }


# ── Questions (app-authored, app-config.json → onboarding.questions) ────────


def _app_config() -> Dict[str, Any]:
    path = Path(__file__).resolve().parents[2] / "app-config.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def onboarding_questions() -> List[Dict[str, Any]]:
    """The app's onboarding questions ([] when the app defines none — the
    whole onboarding surface then stays hidden)."""
    block = _app_config().get("onboarding") or {}
    questions = block.get("questions") or []
    return [q for q in questions if isinstance(q, dict) and q.get("key") and q.get("label")]


# ── Profile access (what agents + heuristics call) ──────────────────────────


def get_profile(db: Session, user_id: str) -> Optional[OnboardingProfile]:
    return (
        db.query(OnboardingProfile)
        .filter(OnboardingProfile.user_id == user_id)
        .first()
    )


def get_answers(db: Session, user_id: str) -> Dict[str, Any]:
    """The user's raw answers ({} before onboarding) — for deterministic
    fallbacks/heuristics that tailor without a model."""
    profile = get_profile(db, user_id)
    return dict(profile.answers or {}) if profile else {}


def profile_context(db: Session, user_id: str) -> str:
    """The composed context block agents append to `ctx.user_context`.
    Empty string before onboarding — always safe to concatenate."""
    profile = get_profile(db, user_id)
    return (profile.context_text or "") if profile else ""


def _compose_context(answers: Dict[str, Any]) -> str:
    """Deterministic composition: one `label: value` line per answered
    question, framed so the model treats it as the owner's standing goals."""
    questions = {q["key"]: q for q in onboarding_questions()}
    lines = []
    for key, value in answers.items():
        if value in (None, ""):
            continue
        q = questions.get(key, {})
        label = q.get("label", key)
        display = value
        for opt in q.get("options") or []:
            if isinstance(opt, dict) and opt.get("value") == value:
                display = opt.get("label", value)
                break
        lines.append(f"- {label}: {display}")
    if not lines:
        return ""
    return (
        "The owner's stated goals and preferences (from onboarding — tailor "
        "your analysis, priorities, and recommendations to these):\n" + "\n".join(lines)
    )


# ── Routes (auto-included via backend/routes/onboarding.py) ─────────────────


class OnboardingSave(BaseModel):
    answers: Dict[str, Any]


def make_onboarding_router() -> APIRouter:
    router = APIRouter()

    @router.get("/api/onboarding")
    async def get_onboarding(
        user_id: str = Depends(require_user),
        db: Session = Depends(get_db),
    ):
        profile = get_profile(db, user_id)
        return {
            "questions": onboarding_questions(),
            "completed": bool(profile and profile.completed_at),
            "answers": dict(profile.answers or {}) if profile else {},
        }

    @router.post("/api/onboarding")
    async def save_onboarding(
        payload: OnboardingSave,
        user_id: str = Depends(require_user),
        db: Session = Depends(get_db),
    ):
        if not isinstance(payload.answers, dict):
            raise HTTPException(status_code=400, detail="answers must be an object")
        allowed = {q["key"] for q in onboarding_questions()}
        answers = {k: v for k, v in payload.answers.items() if k in allowed}

        profile = get_profile(db, user_id)
        if profile is None:
            profile = OnboardingProfile(user_id=user_id)
            db.add(profile)
        merged = {**(profile.answers or {}), **answers}
        profile.answers = merged
        profile.context_text = _compose_context(merged)
        profile.completed_at = profile.completed_at or datetime.utcnow()
        db.commit()
        db.refresh(profile)
        return {
            "questions": onboarding_questions(),
            "completed": True,
            "answers": dict(profile.answers or {}),
        }

    return router
