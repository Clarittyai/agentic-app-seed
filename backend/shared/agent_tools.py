"""
B4 — Agent-side reuse: persist a triaged/drafted item from a custom tool.

Every "draft → approve → send" app needs one custom tool its agent calls to save
a PENDING_APPROVAL item on the spine (so the /approve route + audit + widgets all
apply). `persist_item` is that logic, once — so an app's save tool shrinks to a
handful of lines that map the agent's tool input onto the model:

    # backend/custom/tools/app_save_<x>/impl.py
    from claritty_sdk import tool, ToolCtx
    from backend.database import SessionLocal
    from backend.models import Ticket
    from backend.shared.agent_tools import persist_item

    @tool(id="app.save_ticket")
    def run(input, ctx: ToolCtx):
        db = SessionLocal()
        try:
            tid = persist_item(
                db, Ticket, user_id=ctx.user_id,
                title=input.get("title") or input.get("subject"),
                body=input.get("draft_text"), source="gmail",
                score=int(input.get("score") or 0),
                reason=input.get("reason"),
                payload={"thread_id": input.get("thread_id"),
                         "in_reply_to": input.get("message_id")},
                extra={"contact_email": input.get("contact_email")},
            )
            return {"ticket_id": tid}
        finally:
            db.close()

The read-side twin is `fetch_items` + `items_summary`: read what previous runs
persisted at the START of a run (or before answering in team chat), so every run
builds on prior runs instead of starting blind — see their docstrings.

See PATTERNS.md (same folder) for the five reusable agent system-prompt patterns.
"""

from typing import Any, Dict, List, Optional, Sequence

from backend.shared.spine import ItemStatus, record_audit


def derive_priority(score: Optional[int]) -> str:
    """Map a 0–100 score to the spine's priority bucket (shared so every app
    ranks consistently)."""
    if score is None:
        return "medium"
    if score >= 80:
        return "urgent"
    if score >= 60:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def persist_item(
    db,
    Model,
    *,
    user_id: str,
    title: str,
    body: Optional[str] = None,
    kind: Optional[str] = None,
    source: str = "agent",
    payload: Optional[Dict[str, Any]] = None,
    priority: Optional[str] = None,
    score: Optional[int] = None,
    status: str = ItemStatus.PENDING_APPROVAL,
    actor: str = "agent",
    reason: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> str:
    """Create a spine item (PENDING_APPROVAL by default) + an audit row; return its id.

    Spine fields are set directly; `score` and any `extra` domain fields are
    applied only if the model actually has that column (so the same helper works
    across Lead/Ticket/Invoice/… without knowing their domain columns). The
    caller owns the session lifecycle; this commits.
    """
    item = Model(
        user_id=user_id,
        title=title,
        body=body,
        kind=kind,
        source=source,
        payload=payload,
        status=status,
        priority=priority or derive_priority(score),
    )
    if score is not None and hasattr(item, "score"):
        item.score = score
    for key, value in (extra or {}).items():
        if hasattr(item, key):
            setattr(item, key, value)

    db.add(item)
    db.flush()  # assign id before auditing
    record_audit(
        db, item=item, action="drafted", actor=actor,
        after={"status": status, "score": score}, detail=reason,
    )
    db.commit()
    return item.id


def fetch_items(
    db,
    Model,
    *,
    user_id: str,
    kind: Optional[str] = None,
    limit: int = 20,
) -> List[Any]:
    """Read the user's most recent spine items (newest first) — the read-side
    twin of `persist_item`.

    THE PATTERN: read history at run start so runs BUILD ON prior runs. An
    agent/workflow that persisted items yesterday should see them today —
    dedupe against them, continue where it left off, or answer "what have you
    found so far?" from real rows instead of guessing. Call this at the top of
    a custom tool (or before composing an agent's prompt) and fold the digest
    from `items_summary` into the prompt context:

        # backend/custom/tools/app_recall_<x>/impl.py
        from backend.database import SessionLocal
        from backend.models import Ticket
        from backend.shared.agent_tools import fetch_items, items_summary

        db = SessionLocal()
        try:
            history = fetch_items(db, Ticket, user_id=ctx.user_id, limit=10)
            prompt_context = items_summary(history)  # goes into the LLM prompt
        finally:
            db.close()

    Filters by `user_id` (multi-tenancy — never omit it) and optionally by the
    spine's `kind` column; orders by `created_at` desc. Works with any
    ItemMixin-shaped model (needs `user_id` + `created_at`, `kind` only when
    the filter is used). The caller owns the session lifecycle.
    """
    q = db.query(Model).filter(Model.user_id == user_id)
    if kind is not None:
        q = q.filter(Model.kind == kind)
    return q.order_by(Model.created_at.desc()).limit(max(1, limit)).all()


def items_summary(rows: Sequence[Any], *, max_body_chars: int = 120) -> str:
    """Render fetched rows into a compact one-line-per-item text digest an
    agent can drop straight into its prompt context.

    Each line: `- [kind/status] title — body-snippet (YYYY-MM-DD)`, with every
    part optional-safe (missing columns are simply skipped), bodies whitespace-
    collapsed and clipped to `max_body_chars`. Returns "(none)" for an empty
    list so the prompt still states explicitly that there is no history —
    an agent told "(none)" won't hallucinate prior results.
    """
    lines: List[str] = []
    for r in rows or []:
        tag = "/".join(
            str(v) for v in (getattr(r, "kind", None), getattr(r, "status", None)) if v
        )
        title = getattr(r, "title", None) or getattr(r, "id", None) or "(untitled)"
        line = f"- {'[' + tag + '] ' if tag else ''}{title}"
        body = getattr(r, "body", None)
        if body:
            snippet = " ".join(str(body).split())
            if len(snippet) > max_body_chars:
                snippet = snippet[: max_body_chars - 1].rstrip() + "…"
            line += f" — {snippet}"
        created = getattr(r, "created_at", None)
        if created is not None:
            try:
                line += f" ({created.date().isoformat()})"
            except Exception:
                pass
        lines.append(line)
    return "\n".join(lines) if lines else "(none)"
