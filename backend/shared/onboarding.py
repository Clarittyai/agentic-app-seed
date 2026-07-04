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
from typing import Any, Callable, Dict, List, Optional
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
    """app-config.json, tried across runtimes: repo root (local/docker),
    APP_CONFIG_PATH override, and the process cwd (Lambda task root — the
    platform stages the file next to the manifest there)."""
    import os

    candidates = [
        Path(os.environ.get("APP_CONFIG_PATH") or "/nonexistent"),  # explicit override wins
        Path(__file__).resolve().parents[2] / "app-config.json",
        Path.cwd() / "app-config.json",
    ]
    for path in candidates:
        try:
            if path.is_file():
                return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
    return {}


def onboarding_questions() -> List[Dict[str, Any]]:
    """The app's onboarding questions ([] when the app defines none — the
    whole onboarding surface then stays hidden)."""
    block = _app_config().get("onboarding") or {}
    questions = block.get("questions") or []
    return [q for q in questions if isinstance(q, dict) and q.get("key") and q.get("label")]


def onboarding_script() -> Dict[str, Any]:
    """The conversational script blocks (persona/intro/finale/voice) the
    concierge modal renders. All optional — bare `questions` apps get a
    synthesized script on the frontend."""
    block = _app_config().get("onboarding") or {}
    return {
        "persona": block.get("persona") or None,
        "intro": block.get("intro") or [],
        "intro_fallback": block.get("intro_fallback") or [],
        "finale": block.get("finale") or [],
        "voice": block.get("voice") or "template",
    }


def render_template(
    text: str,
    *,
    value: Any = None,
    label: Any = None,
    ctx: Optional[Dict[str, Any]] = None,
    persona: Optional[Dict[str, Any]] = None,
    app_name: str = "",
) -> Dict[str, Any]:
    """Two-pass deterministic template renderer (mirrors the frontend's).

    Pass 1: {value} {label} {persona.name} {persona.tagline} {appName}.
    Pass 2: {ctx.<dot.path>} against the grounding facts — pass 1 first makes
    dynamic lookups like {ctx.quiet_preview.{value}} work. Returns
    {text, resolved}; callers chain to *_fallback when resolved is False.
    """
    import re

    out = str(text or "")
    p = persona or {}
    for token, val in (
        ("{value}", value),
        ("{label}", label),
        ("{persona.name}", p.get("name")),
        ("{persona.tagline}", p.get("tagline")),
        ("{appName}", app_name),
    ):
        if val is not None:
            out = out.replace(token, str(val))

    facts = ctx or {}

    def _lookup(match: "re.Match[str]") -> str:
        node: Any = facts
        for part in match.group(1).split("."):
            if isinstance(node, dict) and part in node:
                node = node[part]
            else:
                return match.group(0)  # unresolved — leave the token
        return str(node)

    out = re.sub(r"\{ctx\.([A-Za-z0-9_.]+)\}", _lookup, out)
    resolved = "{" not in out or not re.search(r"\{[A-Za-z_]", out)
    return {"text": out, "resolved": resolved}


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
    # False = incremental per-step save from the concierge (profile stays
    # incomplete → resumable). Default True keeps Settings-form / old-client
    # behavior exactly.
    complete: bool = True


class ConciergeAsk(BaseModel):
    step_key: str
    value: Any = None
    label: Any = None


#: (db, user_id) -> grounding facts for the conversation. Apps plug their own
#: (e.g. pipeline numbers, per-threshold previews); facts must be display-ready.
ContextProvider = Callable[[Session, str], Dict[str, Any]]


def make_onboarding_router(context_provider: Optional[ContextProvider] = None) -> APIRouter:
    router = APIRouter()

    def _facts(db: Session, user_id: str) -> Dict[str, Any]:
        if context_provider is None:
            return {}
        try:
            return context_provider(db, user_id) or {}
        except Exception:
            return {}  # grounding is a garnish — never break the modal

    @router.get("/api/onboarding")
    async def get_onboarding(
        user_id: str = Depends(require_user),
        db: Session = Depends(get_db),
    ):
        profile = get_profile(db, user_id)
        script = onboarding_script()
        return {
            "questions": onboarding_questions(),
            "persona": script["persona"],
            "intro": script["intro"],
            "intro_fallback": script["intro_fallback"],
            "finale": script["finale"],
            "completed": bool(profile and profile.completed_at),
            "answers": dict(profile.answers or {}) if profile else {},
        }

    @router.get("/api/onboarding/context")
    async def get_onboarding_context(
        user_id: str = Depends(require_user),
        db: Session = Depends(get_db),
    ):
        """Deterministic grounding facts the concierge weaves into its lines."""
        return {"facts": _facts(db, user_id)}

    @router.post("/api/onboarding/concierge")
    async def concierge_line(
        payload: ConciergeAsk,
        user_id: str = Depends(require_user),
        db: Session = Depends(get_db),
    ):
        """One in-persona ack line for a step. The authored template (rendered
        with the user's value + live facts) is ALWAYS the guaranteed answer;
        when the app opts in (onboarding.voice == "llm") and the LLM proxy is
        configured, a single short model call may rephrase it — grounded ONLY
        on the same facts, never inventing numbers. Any miss → the template.
        """
        import asyncio
        import os

        question = next(
            (q for q in onboarding_questions() if q.get("key") == payload.step_key),
            None,
        )
        script = onboarding_script()
        facts = _facts(db, user_id)
        persona = script["persona"] or {}

        tpl = (question or {}).get("ack") or "Got it — {label}."
        rendered = render_template(
            tpl, value=payload.value, label=payload.label, ctx=facts, persona=persona
        )
        if not rendered["resolved"]:
            fb = (question or {}).get("ack_fallback")
            if fb:
                rendered = render_template(
                    fb, value=payload.value, label=payload.label, ctx=facts, persona=persona
                )
        text = rendered["text"]

        if script["voice"] == "llm" and os.getenv("CLARITTY_PLATFORM_URL"):
            try:
                from claritty_sdk.llm import get_llm_client

                model = persona.get("model") or "claude-haiku-4-5-20251001"
                system = (
                    f"You are {persona.get('name') or 'the app'}"
                    f"{', ' + persona['tagline'] if persona.get('tagline') else ''} — "
                    "speaking one short line in an onboarding conversation. "
                    "Rephrase the draft warmly and concisely (max 2 short sentences). "
                    "You may ONLY reference these facts (never invent numbers or names): "
                    f"{facts}. No emoji. No questions."
                )
                user_msg = (
                    f"The user answered '{payload.label or payload.value}' to the "
                    f"question '{(question or {}).get('label', payload.step_key)}'. "
                    f"Draft reply: {text}"
                )

                def _call() -> str:
                    client = get_llm_client(model)
                    result = client.chat(
                        [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user_msg},
                        ]
                    )
                    return str(getattr(result, "content", "") or "").strip()

                line = await asyncio.wait_for(asyncio.to_thread(_call), timeout=4.0)
                if line:
                    return {"text": line, "source": "llm"}
            except Exception:
                pass  # template below is the guaranteed answer
        return {"text": text, "source": "template"}

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
        if payload.complete:
            profile.completed_at = profile.completed_at or datetime.utcnow()
        db.commit()
        db.refresh(profile)
        return {
            "questions": onboarding_questions(),
            "completed": profile.completed_at is not None,
            "answers": dict(profile.answers or {}),
        }

    return router
