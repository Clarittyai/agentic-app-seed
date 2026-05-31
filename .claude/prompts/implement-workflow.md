# Workflow Implementation Prompt

**Quick reference for implementing workflows**

---

## 📂 File Location

Create: `backend/workflows/{your_workflow_name}.py`

---

## 🎯 Workflow Template

```python
"""
[Workflow Name]

[Brief description of what this workflow does]
"""

from claritty_sdk import workflow, uses_agent, WorkflowContext, ExecutionMode
import logging

logger = logging.getLogger(__name__)


@workflow(
    id="your-workflow-id",  # kebab-case, unique
    name="Your Workflow Name",  # Human-readable
    description="What this workflow does in one sentence",
    execution_mode=ExecutionMode.SEQUENTIAL  # or PARALLEL, DAG
)
@uses_agent("agent-1-id", output_key="step1")
@uses_agent("agent-2-id", output_key="step2", input_from="step1")
async def your_workflow_name(context: WorkflowContext):
    """
    Detailed workflow description.

    This workflow:
    1. Runs agent-1 (e.g., fetch data)
    2. Passes results to agent-2 (e.g., analyze data)
    3. Returns combined results

    Triggered by: [trigger-template-id] or manual execution
    """
    context.log("info", "Starting workflow")

    # Step 1: Agent 1 executes automatically (decorator)
    # step1_result = context.get_step_result("step1")

    # Step 2: Agent 2 executes with step1 output
    # step2_result = context.get_step_result("step2")

    # Optional: Add custom logic between steps
    # - Conditional branching
    # - Data transformation
    # - External API calls
    # - Database operations

    context.log("info", "Workflow complete")
```

---

## 🔄 Execution Modes

### Sequential (Most Common)

Agents run one after another. Output of Agent 1 → Input of Agent 2.

```python
@workflow(
    id="sequential-workflow",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("fetch-data", output_key="data")
@uses_agent("analyze-data", output_key="analysis", input_from="data")
@uses_agent("generate-report", output_key="report", input_from="analysis")
async def sequential_workflow(context: WorkflowContext):
    # Executes in order: fetch → analyze → report
    pass
```

**Use when**: Agents depend on each other's output

### Parallel (Faster)

All agents run simultaneously. No dependencies between agents.

```python
@workflow(
    id="parallel-workflow",
    execution_mode=ExecutionMode.PARALLEL
)
@uses_agent("fetch-source-a", output_key="source_a")
@uses_agent("fetch-source-b", output_key="source_b")
@uses_agent("fetch-source-c", output_key="source_c")
async def parallel_workflow(context: WorkflowContext):
    # All agents run at the same time
    # Results available after all complete
    pass
```

**Use when**: Agents are independent (e.g., fetching from multiple sources)

### DAG (Directed Acyclic Graph)

Mix of sequential and parallel. Complex dependencies.

```python
@workflow(
    id="dag-workflow",
    execution_mode=ExecutionMode.DAG
)
@uses_agent("fetch-data", output_key="data")
@uses_agent("analyze-emails", output_key="email_analysis", input_from="data")
@uses_agent("analyze-tasks", output_key="task_analysis", input_from="data")
@uses_agent("generate-report", output_key="report", input_from=["email_analysis", "task_analysis"])
async def dag_workflow(context: WorkflowContext):
    # fetch-data runs first
    # analyze-emails and analyze-tasks run in parallel (both depend on data)
    # generate-report runs last (depends on both analyses)
    pass
```

**Use when**: Some agents can run in parallel, others need to wait

---

## 🔌 Common Patterns

### Pattern 1: Accessing Step Results

```python
async def your_workflow(context: WorkflowContext):
    context.log("info", "Starting workflow")

    # Get result from step1
    step1_result = context.get_step_result("step1")

    if step1_result.success:
        data = step1_result.data
        context.log("info", f"Step 1 produced: {data}")
    else:
        context.log("error", f"Step 1 failed: {step1_result.error}")
        # Handle failure

    # Get result from step2
    step2_result = context.get_step_result("step2")
    # ... process
```

### Pattern 2: Conditional Execution

```python
async def conditional_workflow(context: WorkflowContext):
    # Get first step result
    analysis = context.get_step_result("analysis")

    if analysis.data["priority"] == "urgent":
        context.log("info", "Urgent task - sending immediate notification")
        # Trigger additional agent or action
        await send_urgent_notification(analysis.data)
    else:
        context.log("info", "Normal priority - queuing for later")
        # Queue for batch processing
```

### Pattern 3: Database Operations

```python
from backend.database import get_db
from backend.models import WorkflowRun
import os

async def workflow_with_db(context: WorkflowContext):
    db = get_db()

    # Store workflow execution record (scope by the caller's user_id)
    run = WorkflowRun(
        user_id=context.user_id,
        workflow_id="your-workflow-id",
        status="running",
        started_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()

    try:
        # Execute workflow steps
        result = context.get_step_result("final_step")

        # Update record
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        run.status = "failed"
        run.error = str(e)
        db.commit()
        raise
```

### Pattern 4: External API Calls

```python
import httpx

async def workflow_with_api(context: WorkflowContext):
    # Get results from agents
    analysis = context.get_step_result("analysis")

    # Send results to external service
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.example.com/results",
            json=analysis.data,
            headers={
                "Authorization": f"Bearer {os.getenv('EXTERNAL_API_KEY')}"
            },
            timeout=10.0
        )

        if response.status_code != 200:
            context.log("error", f"API call failed: {response.status_code}")
            raise Exception("Failed to send results")

        context.log("info", "Results sent to external service")
```

---

## ✅ Checklist

Before marking workflow complete:

- [ ] Decorator has unique `id` (kebab-case)
- [ ] Execution mode chosen correctly (SEQUENTIAL/PARALLEL/DAG)
- [ ] All `@uses_agent` decorators reference valid agent IDs
- [ ] `output_key` is unique for each step
- [ ] `input_from` correctly links steps (if sequential/DAG)
- [ ] Database operations filter by the caller's `user_id` (X-User-ID)
- [ ] Error handling for failed steps
- [ ] Logging at key workflow stages

---

## 🧪 Testing

```bash
# Test via API
curl -X POST http://localhost:8000/api/workflows/your-workflow-id/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "task_title": "Test task"
    }
  }'

# Check logs
docker-compose logs backend -f
```

---

## 📚 Related

- `backend/workflows/example_workflow.py` - Reference implementation
- `backend/agents/` - Available agents to chain
- `backend/triggers/` - Trigger templates that run workflows
- `CLAUDE.md` - Full workflow development guide
