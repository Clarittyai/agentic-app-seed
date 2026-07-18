"""Setup/onboarding surface: which integrations this app needs, and whether the
current user has connected each one.

This powers the in-app **first-run setup checklist** + Integrations page so a
user who opens a freshly generated app immediately sees "Connect LinkedIn to
publish" instead of hitting a silent failure. It is read-only and NEVER returns
credentials — only the app's declared integrations and a boolean connected flag
derived from the platform's per-user credential store (the same store the
agent/tools read via ctx.integration()).

backend/main.py auto-includes `router`.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from backend.security import require_user

logger = logging.getLogger(__name__)

router = APIRouter()


@lru_cache(maxsize=1)
def _required_integrations() -> List[Dict[str, str]]:
    """The integrations this app declares it needs, read once from intelligence.yaml.

    Returns a list of ``{"id", "name"}``. Empty when the app declares none (a
    self-contained app) or intelligence.yaml is absent (local seed dev) — both fine.
    """
    # The manifest (intelligence.yaml preferred, app.yaml legacy) is materialized
    # next to the backend package in generated apps.
    from backend.manifest_path import resolve_manifest_path

    path = resolve_manifest_path()
    if not path:
        return []
    try:
        import yaml

        with open(path, "r", encoding="utf-8") as fh:
            manifest = yaml.safe_load(fh) or {}
    except Exception as exc:  # noqa: BLE001
        logger.warning("could not read intelligence.yaml integrations: %s", exc)
        return []

    # Always-on platform primitives (RAG/model/memory/web/skills/storage) that an
    # app may reference in `integrations:` but a user never "connects" — filtered
    # so NO generated app shows them on the checklist / Settings as accounts.
    from backend.integrations.catalog import is_internal_capability

    out: List[Dict[str, str]] = []
    for entry in manifest.get("integrations") or []:
        if isinstance(entry, str):
            iid, name = entry, _humanize(entry)
        elif isinstance(entry, dict) and entry.get("id"):
            iid = entry["id"]
            name = entry.get("name") or _humanize(iid)
        else:
            continue
        if is_internal_capability(iid):
            continue  # platform primitive, not a user-connectable account
        out.append({"id": iid, "name": name})
    return out


def _humanize(integration_id: str) -> str:
    return integration_id.replace("_", " ").replace("-", " ").title()


def _connect_url(integration_id: str) -> str | None:
    """Platform-hosted connect deep link for this integration (or None when the
    SDK/app-id isn't available — e.g. bare seed dev)."""
    try:
        from claritty_sdk.integrations.platform_creds import connect_url

        return connect_url(integration_id)
    except Exception:  # noqa: BLE001 — older SDK / not importable ⇒ no CTA link
        return None


def _is_connected(integration_id: str, user_id: str) -> bool:
    """Whether this user has THIS app's connection for the integration.

    Prefers the platform's CREDENTIAL-FREE tri-state probe (``connection_state``)
    so it never fetches a raw token — which is what lets brokered/gate-only
    integrations still report status correctly. Falls back to the boolean
    ``is_connected`` / a fetch probe on an OLDER SDK.

    CRITICAL: only a DEFINITIVE not-connected shows "connect". A transient/unknown
    error (network blip, a platform 5xx, or the cold-start probe right after a
    publish/redeploy) must NOT read as disconnected — the connection persists
    server-side, and a false "disconnected" nags the user to reconnect an
    already-connected integration on every publish. So unknown ⇒ treat as
    connected; the real state resolves on the next successful probe (and a
    genuinely not-connected integration still surfaces on the actual tool call)."""
    try:
        from claritty_sdk.integrations import platform_creds
    except Exception:  # noqa: BLE001 — SDK not importable in bare seed dev
        return False
    try:
        # Tri-state (True / False / None-unknown) — the resilient path.
        state_probe = getattr(platform_creds, "connection_state", None)
        if state_probe is not None:
            # None (unknown) ⇒ NOT False ⇒ do not show a false "disconnected".
            return state_probe(integration_id, user_id) is not False
        probe = getattr(platform_creds, "is_connected", None)
        if probe is not None:
            return bool(probe(integration_id, user_id))
        # Legacy SDK without any credential-free probe: a successful fetch ⇒
        # connected. (Discards the credential — only the boolean escapes.)
        platform_creds.fetch_for_user(integration_id, user_id)
        return True
    except platform_creds.CredentialsNotAvailable:
        return False
    except Exception as exc:  # noqa: BLE001 — transient/unknown, NOT "disconnected"
        logger.warning("connection probe for %s failed: %s", integration_id, exc)
        return True


@router.get("/api/integrations/required")
def required_integrations(user_id: str = Depends(require_user)) -> Dict[str, Any]:
    """List the app's required integrations with per-user connection status.

    Shape: ``{ integrations: [{id, name, connected}], all_connected: bool }``.
    The frontend setup checklist renders this; when ``all_connected`` is false
    it shows a connect prompt for each unconnected integration.
    """
    required = _required_integrations()
    items = [
        {
            **entry,
            "connected": _is_connected(entry["id"], user_id),
            # Deep link to the platform-hosted connect popup for THIS app +
            # integration (None locally / when CLARITY_APP_ID is unset). The
            # checklist opens it so the user connects without the app ever
            # touching a credential.
            "connect_url": _connect_url(entry["id"]),
        }
        for entry in required
    ]
    # app_id lets the setup checklist scope the connect flow to THIS app
    # (per-app integration connections). None locally / when unset.
    app_id = None
    try:
        from backend.config import get_platform_config

        app_id = get_platform_config().clarity_app_id
    except Exception:  # pragma: no cover - config import/shape is best-effort
        app_id = None
    return {
        "integrations": items,
        "all_connected": all(i["connected"] for i in items) if items else True,
        "app_id": app_id,
    }
