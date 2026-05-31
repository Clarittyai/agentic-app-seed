"""
Example Agent — Prioritize Task

A REAL agent that calls Claude (via the Claritty LLM proxy) to triage a task:
it assigns a priority and a one-line suggested next action. It degrades
gracefully to a keyword heuristic when the LLM proxy isn't configured (local
dev / CI), so the app always works.

Pattern to copy for your own agents:
- decorate the class with @agent (id, inputs/outputs schema, timeout)
- do the real work in async `execute(context)` and return an AgentResult
- ALWAYS call the model through `claritty_sdk.llm.get_llm_client` (proxy-aware,
  metered, BYOK-aware) — never a raw provider SDK, which won't work in prod
- wrap the sync LLM call in `asyncio.to_thread` so you don't block the loop

REPLACE THIS with your own agent!
"""

from __future__ import annotations

from claritty_sdk import agent, BaseAgent, AgentResult, AgentContext
from claritty_sdk.llm import get_llm_client
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
MODEL = "claude-sonnet-4-6"

_SYSTEM = (
    "You triage to-do tasks. Given a task title and optional notes, decide a "
    "priority and one short next action. Reply with ONLY compact JSON: "
    '{"priority": "low|medium|high|urgent", "suggested_action": "<=12 words"}. '
    "No prose, no code fences."
)


def _heuristic(title: str) -> dict:
    """Deterministic fallback used when the LLM proxy isn't available."""
    t = (title or "").lower()
    if any(w in t for w in ("urgent", "asap", "critical", "now", "emergency")):
        priority = "urgent"
    elif any(w in t for w in ("important", "deadline", "today", "due", "review")):
        priority = "high"
    elif any(w in t for w in ("someday", "maybe", "idea", "later")):
        priority = "low"
    else:
        priority = "medium"
    return {"priority": priority, "suggested_action": "Break it into the first concrete step."}


async def prioritize_task(title: str, notes: str = "") -> dict:
    """
    Return {"priority", "suggested_action"} for a task. Calls Claude through the
    Claritty proxy; on ANY failure (no proxy creds locally/CI, network, bad
    JSON) it falls back to the keyword heuristic so callers never error.

    Shared by this agent's `execute()` and the create-task route, so a task is
    enriched the same way whether created via the API or run through a workflow.
    """
    prompt = f"Task: {title}".strip()
    if notes:
        prompt += f"\nNotes: {notes}"

    try:
        client = get_llm_client(MODEL)
        result = await asyncio.to_thread(
            client.chat,
            [{"role": "user", "content": prompt}],
            system=_SYSTEM,
            max_tokens=120,
            temperature=0.2,
        )
        parsed = json.loads(result.content)
        priority = str(parsed.get("priority", "medium")).lower()
        if priority not in VALID_PRIORITIES:
            priority = "medium"
        action = str(parsed.get("suggested_action") or "").strip()
        return {
            "priority": priority,
            "suggested_action": action or "Break it into the first concrete step.",
        }
    except Exception as e:  # missing proxy creds locally, network, parse error
        logger.info(f"prioritize_task falling back to heuristic ({e})")
        return _heuristic(title)


@agent(
    id="example-agent",
    name="Prioritize Task",
    description="Triages a task: assigns a priority and a suggested next action.",
    category="productivity",
    inputs={
        "task_title": {"type": "string", "description": "The task title", "required": True},
        "task_description": {"type": "string", "description": "Optional notes", "required": False},
    },
    outputs={
        "priority": {"type": "string", "description": "low | medium | high | urgent"},
        "suggested_action": {"type": "string", "description": "One short next step"},
    },
    timeout=30,
)
class ExampleAgent(BaseAgent):
    """Wraps `prioritize_task` so it's runnable via /api/agents/{id}/execute and workflows."""

    async def execute(self, context: AgentContext) -> AgentResult:
        try:
            title = context.get_input("task_title")
            notes = context.get_input("task_description", "") or ""
            context.log("info", f"Prioritizing task: {title}")

            result = await prioritize_task(title, notes)

            context.log("info", f"Priority={result['priority']}")
            return AgentResult(
                success=True,
                data=result,
                metadata={"agent_id": "example-agent", "task_title": title},
            )
        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            return AgentResult(success=False, error=f"Prioritization failed: {str(e)}")
