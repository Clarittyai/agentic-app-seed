"""
Read-only integration status for the in-app setup surface.

The credential-bearing routes (save BYO credentials, the OAuth auth-url +
callback exchange, and disconnect) are RETIRED: connecting now happens on the
Claritty platform, which holds tokens in its KMS-encrypted broker and executes
provider calls server-side — the app never stores or exchanges credentials.
Those routes now return **410 Gone** with a `connect_url` so any stale frontend
degrades to the platform connect flow instead of writing tokens into the app DB.

Remaining (read-only, no secrets):
  GET  /api/integrations                 catalog + per-user status
  GET  /api/integrations/{id}            one entry + status
  POST /api/integrations/{id}/test       liveness (reads status only)

Connect status for the first-run checklist lives in
`backend/routes/integrations_setup.py` (the sanctioned surface). All routes
require a trusted, edge-verified user (`backend.security.require_user`).
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.security import require_user
from backend.integrations import catalog, store

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


def _entry_or_404(integration_id: str) -> Dict[str, Any]:
    entry = catalog.get_integration(integration_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Unknown integration '{integration_id}'")
    return entry


def _connect_url(integration_id: str) -> Optional[str]:
    """Platform connect deep link for this integration (None on older SDK / local)."""
    try:
        from claritty_sdk.integrations.platform_creds import connect_url

        return connect_url(integration_id)
    except Exception:  # noqa: BLE001
        return None


def _moved(integration_id: str) -> HTTPException:
    """410 Gone: the in-app credential/OAuth flow is retired. Connecting happens on
    the platform (the broker holds tokens; the app never does). Hand back the
    platform connect deep link so a stale client degrades to the new flow."""
    return HTTPException(
        status_code=410,
        detail={
            "error": "moved",
            "message": (
                "Connect this integration on Claritty — the app no longer stores "
                "credentials. Use the in-app Connect button / setup checklist."
            ),
            "connect_url": _connect_url(integration_id),
        },
    )


def _public_entry(entry: Dict[str, Any], db: Session, user_id: str) -> Dict[str, Any]:
    """Catalog metadata + connection status. Never includes secret values."""
    out: Dict[str, Any] = {
        "id": entry["id"],
        "name": entry["name"],
        "icon": entry.get("icon"),
        "authKind": entry["authKind"],
        "summary": entry.get("summary"),
        "capabilities": entry.get("capabilities", []),
        "credentialFields": entry.get("credentialFields", []),
        "setupGuide": entry.get("setupGuide", []),
        "status": store.get_status(db, user_id, entry["id"]),
        "connectUrl": _connect_url(entry["id"]),
    }
    return out


@router.get("")
def list_all(user_id: str = Depends(require_user), db: Session = Depends(get_db)):
    return {
        "integrations": [
            _public_entry(e, db, user_id) for e in catalog.list_integrations()
        ]
    }


@router.get("/{integration_id}")
def get_one(
    integration_id: str,
    user_id: str = Depends(require_user),
    db: Session = Depends(get_db),
):
    return _public_entry(_entry_or_404(integration_id), db, user_id)


# ── Retired credential-bearing routes → 410 Gone (connect on the platform) ──


@router.post("/{integration_id}/credentials")
def save_creds(integration_id: str, user_id: str = Depends(require_user)):
    raise _moved(integration_id)


@router.post("/{integration_id}/oauth/auth-url")
def oauth_auth_url(integration_id: str, user_id: str = Depends(require_user)):
    raise _moved(integration_id)


@router.post("/{integration_id}/oauth/callback")
def oauth_callback(integration_id: str, user_id: str = Depends(require_user)):
    raise _moved(integration_id)


@router.delete("/{integration_id}")
def disconnect(integration_id: str, user_id: str = Depends(require_user)):
    # Disconnect is now a platform action (revoke the per-app credential); the app
    # holds nothing to delete.
    raise _moved(integration_id)


@router.post("/{integration_id}/test")
def test_connection(
    integration_id: str,
    user_id: str = Depends(require_user),
    db: Session = Depends(get_db),
):
    _entry_or_404(integration_id)
    status = store.get_status(db, user_id, integration_id)
    if not status.get("connected"):
        return {"ok": False, "detail": "Not connected."}
    # Per-provider liveness via the shared adapter registry (gmail, slack, …).
    from backend.shared.adapters import run_liveness

    result = run_liveness(db, user_id, integration_id)
    if result is not None:
        return result
    return {"ok": True}
