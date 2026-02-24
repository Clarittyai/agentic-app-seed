# CLAUDE.md - Guide for AI Assistants

This file helps AI assistants (like Claude Code) understand and work effectively with the Clarity Agentic App Seed codebase.

## 🎯 Project Purpose

This is a **production-ready template** for building AI-powered agentic applications with **user-configurable triggers**. The key innovation is that end users control WHEN workflows execute, not developers hardcoding schedules.

## 🏗️ Architecture Overview

### Two-Part Structure

```
clarity-agentic-app-seed/
├── clarity_sdk/          # Python SDK (decorators, executors, triggers)
├── backend/              # FastAPI server (port 8000)
├── frontend/             # React UI (port 3200)
└── docker-compose.yml    # Orchestration
```

### Technology Stack

- **SDK**: Python 3.11+, Pydantic, APScheduler
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, LangChain, Anthropic Claude
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Axios
- **Deployment**: Docker, docker-compose

## 🔑 Key Concepts

### 1. User-Configurable Triggers (THE INNOVATION)

**Problem Solved**: Traditional approach = developers hardcode schedules
**Our Approach**: Developers define templates, users create instances with their own values

**Example**:
```python
# Developer defines template
@trigger_template(
    id="daily-review",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="task-review-workflow",
    config_fields=[
        {"key": "time", "label": "What time?", "type": "time"},
        {"key": "timezone", "label": "Timezone", "type": "timezone"}
    ]
)
class DailyReview:
    pass

# User A creates instance: 9am EST
# User B creates instance: 6pm PST
# System schedules both independently
```

### 2. Three-Layer Architecture

**Layer 1: SDK (clarity_sdk/)** - Decorator-based API
- `@agent` - Define AI agents
- `@workflow` - Chain agents together
- `@trigger_template` - Define user-configurable triggers
- `WorkflowExecutor` - Execute workflows (sequential, parallel, DAG)
- `DynamicTriggerManager` - Schedule user triggers

**Layer 2: Backend (backend/)** - FastAPI application
- REST API (17 endpoints)
- Database (PostgreSQL with SQLAlchemy)
- Agent/workflow registration on startup
- Trigger lifecycle management

**Layer 3: Frontend (frontend/)** - React UI
- Dashboard (view agents/workflows)
- Trigger Manager (CRUD triggers with dynamic forms)
- Widget (3 sizes for embedding)

## 📂 File Structure & Locations

### SDK Files (`clarity_sdk/`)

**Core decorators**:
- `agent.py` - @agent decorator
- `workflow.py` - @workflow, @uses_agent decorators
- `trigger.py` - @trigger_template decorator

**Execution**:
- `executor.py` - WorkflowExecutor (550 lines, 4 modes)
- `trigger_manager.py` - DynamicTriggerManager (500 lines)

**Models & Context**:
- `models.py` - Pydantic models (AgentMetadata, TriggerTemplate, etc.)
- `context.py` - AgentContext, WorkflowContext
- `registry.py` - Global registries

### Backend Files (`backend/`)

**Core**:
- `main.py` - FastAPI app with 17 endpoints (600+ lines)
- `database.py` - SQLAlchemy config
- `models.py` - Database models (4 models)

**Examples** (Users should add their own here):
- `agents/` - Agent implementations (TaskAnalyzerAgent, EmailComposerAgent)
- `workflows/` - Workflow definitions (task_review_workflow, etc.)
- `triggers/` - Trigger templates (DailyTaskReviewTrigger, etc.)

### Frontend Files (`frontend/src/`)

**Core components**:
- `components/Layout.tsx` - App shell
- `components/Widget.tsx` - 3-size widget (230 lines)
- `pages/Dashboard.tsx` - Main dashboard (160 lines)
- `pages/TriggerManager.tsx` - Trigger CRUD UI (400 lines)

**API**:
- `lib/api.ts` - Complete API client (180 lines)
- `lib/utils.ts` - Utilities

## 🚫 What NOT to Do

### ❌ DO NOT Create Files Outside Designated Folders

**WRONG**:
```
backend/custom_agents/my_agent.py  # ❌ Wrong location
backend/my_workflow.py             # ❌ Wrong location
```

**RIGHT**:
```
backend/agents/my_agent.py         # ✅ Correct
backend/workflows/my_workflow.py   # ✅ Correct
backend/triggers/my_trigger.py     # ✅ Correct
```

### ❌ DO NOT Hardcode Schedules

**WRONG**:
```python
@cron("0 9 * * *")  # ❌ Users can't customize this
def daily_task():
    pass
```

**RIGHT**:
```python
@trigger_template(  # ✅ Users configure their own times
    config_fields=[{"key": "time", "type": "time"}]
)
class DailyTask:
    pass
```

### ❌ DO NOT Skip Registration

All agents/workflows/triggers MUST be registered:

**WRONG**:
```python
# Created agent but didn't add to __init__.py
# Result: Agent never registers, users can't see it
```

**RIGHT**:
```python
# backend/agents/__init__.py
from backend.agents.my_agent import MyAgent
__all__ = ["MyAgent", ...]
```

### ❌ DO NOT Use Synchronous Code

**WRONG**:
```python
def execute(self, context):  # ❌ Not async
    return result
```

**RIGHT**:
```python
async def execute(self, context: AgentContext) -> AgentResult:  # ✅ Async
    return result
```

## ✅ Common Tasks

### Adding a New Agent

1. Create `backend/agents/my_agent.py`:
```python
from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

@agent(
    id="my-agent",
    name="My Agent",
    description="Does X",
    inputs={"input": {"type": "string", "required": True}},
    outputs={"output": {"type": "string"}}
)
class MyAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        input_val = context.get_input("input")
        result = f"Processed: {input_val}"
        return AgentResult(success=True, data={"output": result})
```

2. Register in `backend/agents/__init__.py`:
```python
from backend.agents.my_agent import MyAgent
__all__ = ["MyAgent", ...]
```

3. Restart backend → Agent available!

### Adding a New Workflow

1. Create `backend/workflows/my_workflow.py`:
```python
from clarity_sdk import workflow, uses_agent, ExecutionMode

@workflow(
    id="my-workflow",
    name="My Workflow",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("agent-1", output_key="step1")
@uses_agent("agent-2", input_from="step1", output_key="step2")
async def my_workflow(context):
    """Workflow description"""
    pass
```

2. Register in `backend/workflows/__init__.py`

3. Restart → Workflow available!

### Adding a New Trigger Template

1. Create `backend/triggers/my_trigger.py`:
```python
from clarity_sdk import trigger_template, TriggerTemplateType

@trigger_template(
    id="my-trigger",
    name="My Trigger",
    description="User-friendly description",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="my-workflow",
    config_fields=[
        {
            "key": "time",
            "label": "What time should this run?",
            "type": "time",
            "required": True,
            "default": "09:00"
        },
        {
            "key": "timezone",
            "label": "Your timezone",
            "type": "timezone",
            "required": True
        }
    ],
    max_instances_per_user=5  # Optional limit
)
class MyTrigger:
    pass
```

2. Register in `backend/triggers/__init__.py`

3. Restart → Template available in UI!

4. **Frontend automatically generates form** from config_fields!

### Testing Workflow Execution

```bash
# Manual execution via API
curl -X POST http://localhost:8000/api/workflows/my-workflow/execute \
  -H "Authorization: Bearer test-user" \
  -H "Content-Type: application/json" \
  -d '{"input_data": "test"}'

# Check execution record
curl http://localhost:8000/api/workflows/executions/{execution_id} \
  -H "Authorization: Bearer test-user"
```

### Debugging Triggers

```bash
# View backend logs
docker-compose logs -f backend

# Look for:
# "✅ Registered trigger: template-id"
# "🔥 Trigger fired: template-id"
# "✅ Trigger execution completed"

# Query database
docker-compose exec backend python -c "
from backend.database import SessionLocal
from backend.models import UserTriggerInstance
db = SessionLocal()
triggers = db.query(UserTriggerInstance).all()
for t in triggers:
    print(f'{t.id}: {t.name} - enabled={t.enabled}')
"
```

## 📋 Checklist for New Features

When adding new functionality:

- [ ] Agent has `@agent` decorator with all metadata
- [ ] Agent class extends `BaseAgent`
- [ ] Agent has `async def execute(self, context: AgentContext)`
- [ ] Agent returns `AgentResult`
- [ ] Agent registered in `__init__.py`
- [ ] Workflow has `@workflow` decorator
- [ ] Workflow uses `@uses_agent` for each step
- [ ] Workflow is `async def`
- [ ] Workflow registered in `__init__.py`
- [ ] Trigger template has `@trigger_template` decorator
- [ ] Trigger has `config_fields` for user configuration
- [ ] Trigger references existing `workflow_id`
- [ ] Trigger registered in `__init__.py`
- [ ] Backend restarted after changes
- [ ] Tested via API or UI
- [ ] Documentation updated (if public-facing)

## 🔍 Understanding the Flow

### User Creates Trigger

1. **Frontend**: User clicks "Create Trigger" on template
2. **Frontend**: Form auto-generates from `config_fields`
3. **Frontend**: User fills in values, submits
4. **API**: `POST /api/my/triggers` receives request
5. **Backend**: Creates `UserTriggerInstance` in database
6. **Backend**: Calls `trigger_manager.register_trigger()`
7. **DynamicTriggerManager**: Parses config, builds APScheduler trigger
8. **APScheduler**: Schedules job for user's configured time
9. **Frontend**: Refreshes, shows trigger in "My Triggers"

### Trigger Fires

1. **APScheduler**: Time matches, fires callback
2. **DynamicTriggerManager**: Callback executes
3. **WorkflowExecutor**: Executes workflow (sequential/parallel/DAG)
4. **Agents**: Execute in order, pass data between steps
5. **Database**: Records `WorkflowExecution` and `TriggerExecution`
6. **UserTriggerInstance**: Updates statistics (total_executions++)
7. **Frontend**: Dashboard shows updated stats

### Workflow Execution Modes

- **SEQUENTIAL**: A → B → C (one at a time)
- **PARALLEL**: A, B, C (all at once)
- **DAG**: A → B, A → C, B+C → D (dependency-based)
- **CONDITIONAL**: Skip steps based on conditions

## 🐛 Common Issues & Solutions

### Issue: Agent not appearing in Dashboard

**Cause**: Not registered in `__init__.py`
**Solution**: Add to `__all__` list and import

### Issue: Trigger not scheduling

**Cause**: Invalid config or DynamicTriggerManager not started
**Solution**: Check logs for errors, verify config_fields match

### Issue: Workflow execution fails

**Cause**: Agent not found, input validation failed, or exception
**Solution**: Check WorkflowExecution.error_message in database

### Issue: Frontend not connecting to backend

**Cause**: CORS misconfiguration or wrong API_URL
**Solution**: Check `VITE_API_URL` and `FRONTEND_URL` in .env files

## 📚 Key Files to Reference

When working on specific tasks:

**Adding agents**: Look at `backend/agents/task_analyzer.py`
**Adding workflows**: Look at `backend/workflows/task_management.py`
**Adding triggers**: Look at `backend/triggers/task_triggers.py`
**API endpoints**: Look at `backend/main.py` (lines 280-478)
**Workflow execution**: Look at `clarity_sdk/executor.py`
**Trigger scheduling**: Look at `clarity_sdk/trigger_manager.py`
**Frontend forms**: Look at `frontend/src/pages/TriggerManager.tsx` (lines 200-300)

## 🎓 Learning Resources

- **Architecture**: `AGENTIC_APP_SEED_COMPLETE_DESIGN.md`
- **Triggers**: `TRIGGER_SYSTEM_DESIGN.md`
- **Quick Start**: `QUICK_START.md`
- **Progress**: `PROGRESS.md`
- **API Docs**: http://localhost:8000/docs (when running)

## 💡 Pro Tips

1. **Always use decorators** - They handle registration automatically
2. **Always async** - All execute methods must be async
3. **Always return AgentResult** - Standard format for all agents
4. **Always validate inputs** - Use Pydantic models in metadata
5. **Always test manually first** - Before creating triggers
6. **Always check logs** - They show exactly what's happening
7. **Always update __init__.py** - New components won't work otherwise

## 🚀 You're Ready!

You now understand the complete architecture and can:
- ✅ Add new agents
- ✅ Create workflows
- ✅ Define trigger templates
- ✅ Debug issues
- ✅ Extend the system

**Happy coding!** 🎉
