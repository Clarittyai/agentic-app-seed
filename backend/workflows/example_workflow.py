"""
Example Workflow — Capture & Triage a Task

Demonstrates the full intake pattern a workflow does:
1. `@uses_agent` runs an agent step automatically (here: the prioritize agent
   on the trigger data — the task passed by a manual run or the trigger).
2. The function body does custom orchestration — here it PERSISTS the triaged
   task (so it actually shows up in the app + dashboard widget), then returns a
   digest of the user's open tasks. Whatever dict the body returns is merged
   into the workflow's outputs.

This is what makes the trigger affect the widget: run it with a task and a new,
prioritized task appears in the widget. Bound to `example-trigger` (a daily
schedule — which has no task input, so it just digests) or run manually via
`POST /api/workflows/example-workflow/execute` with `{"task_title": "..."}`.

REPLACE THIS with your own workflow!
"""

from claritty_sdk import workflow, uses_agent, WorkflowContext, ExecutionMode
import logging

logger = logging.getLogger(__name__)

PRIORITY_RANK = {"urgent": 3, "high": 2, "medium": 1, "low": 0}


@workflow(
    id="example-workflow",
    name="Capture & Triage a Task",
    description="Triages an incoming task, saves it, then summarizes open tasks.",
    execution_mode=ExecutionMode.SEQUENTIAL,
)
@uses_agent("example-agent", output_key="triage")
async def example_workflow(context: WorkflowContext):
    """
    The @uses_agent step above already ran the prioritize agent on the trigger
    data and stored it under "triage". If the trigger carried a task, persist it
    with that triage (this is the visible effect on the widget), then build a
    digest of the user's open tasks.
    """
    from backend.database import SessionLocal
    from backend import models

    # The body has DB access via SessionLocal; always scope by context.user_id.
    created_task = None
    title = (context.trigger_data or {}).get("task_title")

    if context.user_id and title:
        triage = context.get_step_result("triage")
        data = (triage.data if triage and getattr(triage, "data", None) else {}) or {}
        db = SessionLocal()
        try:
            task = models.Task(
                user_id=context.user_id,
                title=str(title).strip(),
                priority=data.get("priority", "medium"),
                suggested_action=data.get("suggested_action"),
            )
            db.add(task)
            db.commit()
            db.refresh(task)
            created_task = task.to_dict()
            context.log("info", f"Captured task '{task.title}' (priority={task.priority})")
        finally:
            db.close()

    open_tasks = []
    if context.user_id:
        db = SessionLocal()
        try:
            open_tasks = (
                db.query(models.Task)
                .filter(
                    models.Task.user_id == context.user_id,
                    models.Task.done == False,  # noqa: E712
                )
                .all()
            )
        finally:
            db.close()

    by_priority: dict = {}
    for t in open_tasks:
        by_priority[t.priority] = by_priority.get(t.priority, 0) + 1

    top = sorted(
        open_tasks, key=lambda t: PRIORITY_RANK.get(t.priority, 1), reverse=True
    )[:3]

    if open_tasks:
        lead = ", ".join(f"{n} {p}" for p, n in sorted(
            by_priority.items(), key=lambda kv: PRIORITY_RANK.get(kv[0], 1), reverse=True
        ))
        digest = f"You have {len(open_tasks)} open task(s) ({lead})."
    else:
        digest = "No open tasks — you're all caught up."

    context.log("info", digest)
    return {
        "created_task": created_task,
        "open_count": len(open_tasks),
        "by_priority": by_priority,
        "top_tasks": [t.title for t in top],
        "digest": digest,
    }


# Multi-agent chaining example (uncomment to use): each step's output feeds the
# next via `input_from`. Parallel mode (ExecutionMode.PARALLEL) fans all steps
# out against the trigger data instead.
#
# @workflow(id="multi-step", name="Multi-Step", execution_mode=ExecutionMode.SEQUENTIAL)
# @uses_agent("agent-1", output_key="step1")
# @uses_agent("agent-2", output_key="step2", input_from="step1")
# async def multi_step(context: WorkflowContext):
#     pass
