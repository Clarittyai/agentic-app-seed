"""
Workflow → Result bridge.

Maps a workflow run's OUTPUTS into `Result` rows (the default "what your
automation produced" store) so the app UI shows the REAL output the intelligence
produced, not an empty placeholder. Without this bridge a workflow's output only
reaches `WorkflowExecution.output_data` (an audit blob the UI never reads), so
the widget stays empty unless the app hand-wires `persist_item`. This closes the
value path (workflow → store → UI) for EVERY app by construction.

Best-effort + non-fatal: a persistence error here must NEVER fail the run — the
work already happened; the display is secondary.
"""

from typing import Any, Dict, List
import json
import logging

from backend.shared.agent_tools import persist_item
from backend.shared.spine import ItemStatus

logger = logging.getLogger(__name__)

# Keys we look at (in order) to pull a human title / body out of an output item.
_TITLE_KEYS = ("title", "name", "subject", "headline", "label", "heading")
_BODY_KEYS = (
    "body",
    "summary",
    "text",
    "content",
    "description",
    "draft",
    "message",
    "result",
)
# Output keys that conventionally hold a LIST of produced items.
_LIST_KEYS = ("items", "results", "drafts", "records", "rows", "entries", "posts")


def _as_items(outputs: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Best-effort: pull a list of item-shaped dicts out of a workflow's outputs.

    Prefers an explicit list under a common key (``items``/``results``/…), else
    the first list-of-dicts found; otherwise treats the whole output dict as ONE
    result so nothing produced is ever silently dropped.
    """
    if not isinstance(outputs, dict) or not outputs:
        return []
    for key in _LIST_KEYS:
        v = outputs.get(key)
        if isinstance(v, list) and any(isinstance(x, dict) for x in v):
            return [x for x in v if isinstance(x, dict)]
    for v in outputs.values():
        if isinstance(v, list) and v and all(isinstance(x, dict) for x in v):
            return v
    return [outputs]


def _pick(d: Dict[str, Any], keys) -> Any:
    for k in keys:
        val = d.get(k)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def persist_workflow_results(
    db, *, user_id: str, workflow_id: str, outputs: Dict[str, Any]
) -> int:
    """Persist a workflow's outputs as `Result` rows. Returns the count written.

    Never raises — returns 0 on any problem so the caller (the run path) is
    unaffected.
    """
    try:
        import backend.models as models  # local import: avoid import cycles
    except Exception:  # pragma: no cover - defensive
        return 0
    Result = getattr(models, "Result", None)
    if Result is None:
        return 0

    items = _as_items(outputs)
    written = 0
    for it in items:
        try:
            title = _pick(it, _TITLE_KEYS) or f"{workflow_id} result"
            body = _pick(it, _BODY_KEYS)
            if body is None:
                try:
                    body = json.dumps(it, default=str)[:4000]
                except Exception:
                    body = str(it)[:4000]
            persist_item(
                db,
                Result,
                user_id=user_id,
                title=str(title)[:300],
                body=body,
                kind=workflow_id,
                source="workflow",
                payload=it if isinstance(it, dict) else None,
                status=ItemStatus.NEW,
                actor="workflow",
                reason=f"auto-persisted from workflow {workflow_id}",
            )
            written += 1
        except Exception as e:  # one bad item must not lose the others
            logger.warning("persist_workflow_results: skipped one item (%s)", e)
    return written
