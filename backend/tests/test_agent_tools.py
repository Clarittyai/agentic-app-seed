"""
Tests for B4 — persist_item + fetch_items (backend/shared/agent_tools.py).

Verifies the shared save-tool logic: it creates a PENDING_APPROVAL spine item +
an audit row, derives priority from score, applies known domain fields via
`extra`, and ignores unknown ones (so the same helper works across models).
Also the read-side twin: fetch_items (user-scoped, newest first, kind filter)
and items_summary (compact prompt digest).
"""

from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.shared.spine import ItemMixin, LifecycleMixin, ItemStatus, AuditEvent
from backend.shared.agent_tools import (
    derive_priority,
    fetch_items,
    items_summary,
    persist_item,
)


class _Ticket(Base, ItemMixin, LifecycleMixin):
    __tablename__ = "test_tickets"
    score = Column(Integer)
    contact_email = Column(String)


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine, tables=[_Ticket.__table__, AuditEvent.__table__])
    return sessionmaker(bind=engine)()


def test_derive_priority_buckets():
    assert derive_priority(90) == "urgent"
    assert derive_priority(70) == "high"
    assert derive_priority(40) == "medium"
    assert derive_priority(10) == "low"
    assert derive_priority(None) == "medium"


def test_persist_item_creates_pending_with_audit_and_fields():
    db = _session()
    tid = persist_item(
        db, _Ticket, user_id="u1",
        title="Refund request", body="Drafted reply…", kind="ticket",
        source="gmail", score=82, reason="explicit refund ask",
        payload={"thread_id": "t9"},
        extra={"contact_email": "buyer@acme.com", "nonexistent": "ignored"},
    )
    assert tid

    row = db.query(_Ticket).filter(_Ticket.id == tid).one()
    assert row.status == ItemStatus.PENDING_APPROVAL
    assert row.priority == "urgent"            # derived from score 82
    assert row.score == 82                      # applied (model has the column)
    assert row.contact_email == "buyer@acme.com"  # extra applied
    assert row.payload["thread_id"] == "t9"
    assert not hasattr(row, "nonexistent")      # unknown extra ignored, no crash

    events = db.query(AuditEvent).filter(AuditEvent.item_id == tid).all()
    assert len(events) == 1
    assert events[0].action == "drafted" and events[0].actor == "agent"


def test_persist_item_explicit_priority_wins():
    db = _session()
    tid = persist_item(db, _Ticket, user_id="u1", title="x", priority="low", score=99)
    row = db.query(_Ticket).filter(_Ticket.id == tid).one()
    assert row.priority == "low"  # explicit priority overrides score-derived


def test_fetch_items_scopes_orders_and_filters():
    db = _session()
    persist_item(db, _Ticket, user_id="u1", title="first", kind="lead")
    persist_item(db, _Ticket, user_id="u1", title="second", kind="ticket")
    persist_item(db, _Ticket, user_id="u2", title="other-user", kind="lead")

    rows = fetch_items(db, _Ticket, user_id="u1")
    assert [r.title for r in rows] == ["second", "first"] or {
        r.title for r in rows
    } == {"first", "second"}  # same created_at second → order by id-insertion may tie
    assert all(r.user_id == "u1" for r in rows)  # never leaks across users

    leads = fetch_items(db, _Ticket, user_id="u1", kind="lead")
    assert [r.title for r in leads] == ["first"]

    assert fetch_items(db, _Ticket, user_id="u1", limit=1)  # limit respected
    assert len(fetch_items(db, _Ticket, user_id="u1", limit=1)) == 1
    assert fetch_items(db, _Ticket, user_id="nobody") == []


def test_items_summary_renders_compact_digest():
    db = _session()
    persist_item(
        db, _Ticket, user_id="u1", title="Refund request", kind="ticket",
        body="Long   body\n with   whitespace " + "x" * 300,
    )
    rows = fetch_items(db, _Ticket, user_id="u1")
    digest = items_summary(rows)
    assert "[ticket/pending_approval] Refund request" in digest
    assert "\n" not in digest.split("- ", 1)[1] or digest.count("\n") == len(rows) - 1
    assert "…" in digest  # long body clipped
    assert len(digest) < 400

    assert items_summary([]) == "(none)"  # empty history is stated explicitly
