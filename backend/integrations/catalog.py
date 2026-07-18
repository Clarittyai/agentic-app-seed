"""
Loads the integration catalog (single source of truth) and exposes helpers.

The catalog is `shared/integrations-catalog.json`, forked into every app. It is
also read at plan time by clarity-api, so the instructions shown to the user and
the credentials the code expects always come from the same description.
"""
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

# backend/integrations/catalog.py -> parents[2] == <app_root>
_CATALOG_PATH = (
    Path(__file__).resolve().parents[2] / "shared" / "integrations-catalog.json"
)


@lru_cache(maxsize=1)
def _load() -> Dict[str, Any]:
    path = _CATALOG_PATH
    if not path.exists():
        alt = Path.cwd() / "shared" / "integrations-catalog.json"
        if alt.exists():
            path = alt
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"version": 1, "integrations": []}


# Always-on platform primitives that agents reference in `integrations:` but a
# user never "connects" — RAG, the model, agent memory, web, skills, storage.
# They ship with every Claritty app via the SDK, so surfacing them as connectable
# accounts anywhere (Settings, setup checklist) is meaningless and confusing.
# Canonical here; the setup/checklist route imports this same set.
INTERNAL_CAPABILITIES = frozenset(
    {
        "knowledge",
        "memory",
        "llm",
        "web",
        "web-search",
        "web_search",
        "websearch",
        "search",
        "skills",
        "skill",
        "storage",
        "vector",
        "embeddings",
        "data-source",
        "data_source",
        "datasource",
    }
)


def is_internal_capability(integration_id: str) -> bool:
    return (integration_id or "").strip().lower() in INTERNAL_CAPABILITIES


def list_integrations() -> List[Dict[str, Any]]:
    """All catalog entries EXCEPT internal platform capabilities — so no
    user-facing connect surface can ever list knowledge/llm/memory/etc."""
    return [
        e
        for e in _load().get("integrations", [])
        if not is_internal_capability(e.get("id", ""))
    ]


def get_integration(integration_id: str) -> Optional[Dict[str, Any]]:
    for entry in list_integrations():
        if entry.get("id") == integration_id:
            return entry
    return None


def app_origin() -> str:
    """Public origin of this deployed app, used to build OAuth redirect URIs."""
    origin = os.getenv("APP_URL") or os.getenv("FRONTEND_URL") or ""
    return origin.rstrip("/")


def redirect_uri(entry: Dict[str, Any]) -> Optional[str]:
    path = entry.get("redirectPath")
    if not path:
        return None
    origin = app_origin()
    return f"{origin}{path}" if origin else None
