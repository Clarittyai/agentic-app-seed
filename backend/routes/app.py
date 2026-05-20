"""
App-specific API routes (the regenerable API layer).

This file is the SINGLE place app data endpoints live. The frontend client at
frontend/src/lib/api.ts calls exactly these routes — keep the two in sync (same
paths, methods, and response shapes). backend/main.py auto-includes `router`.

Generated apps OVERWRITE this file with their own endpoints. The default below
is the seed's email-filter example — replace it for your app, but ALWAYS keep a
`GET /api/widget` that returns the data your frontend Widget renders.

Conventions:
- Multi-tenancy: read the caller via the `X-User-ID` header (fallback "test-user").
- Query backend.models with SQLAlchemy via the `db` dependency.
- Return plain dicts/lists (FastAPI serializes to JSON).
"""

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import logging

from backend.database import get_db
from backend import models

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/widget")
async def get_widget_data(
    size: str = "large",
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    """
    Widget data endpoint - REQUIRED by Clarity platform.

    Returns the data the dashboard widget renders. Supports sizes
    small | medium | large. Replace the body for your app, but keep the route.
    """
    user_id = x_user_id if x_user_id else "test-user"

    yesterday = datetime.utcnow() - timedelta(days=1)

    important_emails_today = (
        db.query(models.ProcessedEmail)
        .filter(
            models.ProcessedEmail.user_id == user_id,
            models.ProcessedEmail.is_important == True,  # noqa: E712
            models.ProcessedEmail.processed_at >= yesterday,
        )
        .count()
    )

    total_emails_processed = (
        db.query(models.ProcessedEmail)
        .filter(
            models.ProcessedEmail.user_id == user_id,
            models.ProcessedEmail.processed_at >= yesterday,
        )
        .count()
    )

    feedback_emails = (
        db.query(models.ProcessedEmail)
        .filter(
            models.ProcessedEmail.user_id == user_id,
            models.ProcessedEmail.user_feedback.in_(
                ["correct", "false_positive", "false_negative"]
            ),
        )
        .all()
    )

    if feedback_emails:
        correct_predictions = sum(
            1 for e in feedback_emails if e.user_feedback == "correct"
        )
        detection_accuracy = int((correct_predictions / len(feedback_emails)) * 100)
    else:
        detection_accuracy = 95

    last_email = (
        db.query(models.ProcessedEmail)
        .filter(models.ProcessedEmail.user_id == user_id)
        .order_by(models.ProcessedEmail.processed_at.desc())
        .first()
    )

    if last_email:
        time_diff = datetime.utcnow() - last_email.processed_at
        if time_diff.seconds < 60:
            last_checked = "just now"
        elif time_diff.seconds < 3600:
            minutes = time_diff.seconds // 60
            last_checked = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            hours = time_diff.seconds // 3600
            last_checked = f"{hours} hour{'s' if hours != 1 else ''} ago"
    else:
        last_checked = "not yet checked"

    if size == "small":
        return {
            "important_emails_today": important_emails_today,
            "detection_accuracy": f"{detection_accuracy}%",
            "last_checked": last_checked,
        }

    recent_important_emails = (
        db.query(models.ProcessedEmail)
        .filter(
            models.ProcessedEmail.user_id == user_id,
            models.ProcessedEmail.is_important == True,  # noqa: E712
        )
        .order_by(models.ProcessedEmail.processed_at.desc())
        .limit(5)
        .all()
    )

    return {
        "important_emails_today": important_emails_today,
        "total_emails_processed": total_emails_processed,
        "detection_accuracy": detection_accuracy,
        "recent_important_emails": [
            {
                "sender": email.sender,
                "subject": email.subject,
                "importance_score": email.importance_score,
                "urgency_level": email.urgency_level or "medium",
                "detected_at": email.processed_at.isoformat(),
                "snippet": email.snippet[:100] if email.snippet else "",
            }
            for email in recent_important_emails
        ],
        "last_checked": last_checked,
    }


@router.post("/api/emails/mark-read")
async def mark_urgent_emails_as_read(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    """Mark all urgent emails as read (clears important flags)."""
    user_id = x_user_id if x_user_id else "test-user"

    yesterday = datetime.utcnow() - timedelta(days=1)

    urgent_emails = (
        db.query(models.ProcessedEmail)
        .filter(
            models.ProcessedEmail.user_id == user_id,
            models.ProcessedEmail.is_important == True,  # noqa: E712
            models.ProcessedEmail.processed_at >= yesterday,
        )
        .all()
    )

    count = 0
    for email in urgent_emails:
        email.is_important = False
        count += 1

    db.commit()

    logger.info(f"Marked {count} urgent emails as read for user {user_id}")

    return {
        "success": True,
        "marked_count": count,
        "message": f"Marked {count} urgent email{'s' if count != 1 else ''} as read",
    }
