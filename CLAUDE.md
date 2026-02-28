# CLAUDE.md - Guide for AI Assistants

This file helps AI assistants (like Claude Code) understand and work effectively with the Clarity Agentic App Seed codebase.

## 🎯 Project Purpose

This is a **production-ready template** for building AI-powered agentic applications with **user-configurable triggers**. The key innovation is that end users control WHEN workflows execute, not developers hardcoding schedules.

## 🎨 CRITICAL: Widget-First Design Philosophy

**⚠️ MOST IMPORTANT CONCEPT - READ THIS FIRST**

When building apps with this template for the **Clarity Marketplace**, understand this fundamental principle:

### **Widgets Are THE Primary Interface**

Apps built with this template are NOT traditional web applications. They are **widget-first** applications:

**The Reality:**
1. ✅ **Users interact primarily through WIDGETS** on their Clarity dashboard
2. ✅ **Widgets are always visible** in the user's dashboard grid
3. ✅ **Full app pages are secondary** - accessed by clicking widget for details
4. ❌ **Users do NOT navigate to standalone web pages** as their primary interaction

**Think of it as:**
```
Widget = Your app's "storefront" (always visible, primary interaction)
Full App = Your app's "back office" (detailed operations, advanced features)
```

### Two Widget Sizes ONLY

**❌ DO NOT implement 3 widget sizes**
**✅ ONLY implement 2 widget sizes: small and large**

#### Small Widget (300x150px)
- **Purpose**: Quick glance at key metrics
- **Data**: Minimal - active triggers count, success rate
- **When used**: User scans their dashboard grid for status

#### Large Widget (600x400px)
- **Purpose**: Detailed monitoring and interaction
- **Data**: Full metrics, execution history, interactive elements
- **When used**: User actively monitors or manages the app

### Implementation Requirements

**Backend (`backend/main.py` line 115):**
```python
@app.get("/api/widget")
async def get_widget_data(
    size: str = "large",  # Only "small" or "large"
    user_id: str = Depends(get_current_user)
):
    if size == "small":
        return {"active_triggers": 5, "success_rate": "95%"}
    else:  # large (not elif - only two options)
        return {"active_triggers": 5, "total_executions": 42, "recent_executions": [...]}
```

**Frontend (`frontend/src/components/Widget.tsx`):**
```typescript
interface WidgetProps {
  size?: 'small' | 'large';  // NOT 'small' | 'medium' | 'large'
}

export default function Widget({ size = 'large' }: WidgetProps) {
  if (size === 'small') {
    return <SmallWidgetView />;
  }
  return <LargeWidgetView />;  // No medium option
}
```

**Frontend API (`frontend/src/lib/api.ts`):**
```typescript
export const getWidgetData = async (size: 'small' | 'large' = 'large'): Promise<WidgetData> => {
  const response = await api.get(`/api/widget?size=${size}`);
  return response.data;
};
```

### Authentication: X-User-ID Header (Priority 1)

**CRITICAL**: Frontend MUST send X-User-ID header for marketplace integration:

```typescript
// frontend/src/lib/api.ts
api.interceptors.request.use((config) => {
  // Priority 1: X-User-ID header (Clarity platform marketplace)
  const userId = localStorage.getItem('user_id');
  if (userId) {
    config.headers['X-User-ID'] = userId;
  }

  // Priority 2: Bearer token (development fallback)
  const token = localStorage.getItem('auth_token') || 'test-user';
  config.headers.Authorization = `Bearer ${token}`;

  return config;
});
```

### Required Screenshots

**MUST include** in `./screenshots/` directory:
- `widget-small.png` - Screenshot of small widget with real data
- `widget-large.png` - Screenshot of large widget with real data

Configure in `app-config.json`:
```json
"screenshots": [
  {
    "url": "./screenshots/widget-small.png",
    "type": "widget-small",
    "required": true
  },
  {
    "url": "./screenshots/widget-large.png",
    "type": "widget-large",
    "required": true
  }
]
```

### When User Needs Full App

Full app pages (`/dashboard`, `/triggers`) are accessed when:
- User clicks "View Details" or similar button on widget
- User needs advanced configuration (e.g., creating new triggers)
- User wants comprehensive data beyond widget's compact view

**Remember**: Design widgets as if they're the ONLY interface users will see most of the time, because they are!

## 🏗️ Architecture Overview

### Clean Template Structure (PyPI-Based)

```
clarity-agentic-app-seed/
├── backend/              # FastAPI server (port 8000)
│   ├── requirements.txt  # Includes clarity-sdk>=1.0.0,<2.0.0
│   ├── agents/           # Your agent implementations
│   ├── workflows/        # Your workflow definitions
│   └── triggers/         # Your trigger templates
├── frontend/             # React UI (port 3200)
└── docker-compose.yml    # Orchestration
```

**Clarity SDK**: Installed from PyPI as a standard Python package
```bash
pip install clarity-sdk  # Automatically installed from requirements.txt
```

### Technology Stack

- **Clarity SDK**: `pip install clarity-sdk` - PyPI package with decorators, executors, triggers
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, LangChain, Anthropic Claude
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Axios
- **Deployment**: Docker, docker-compose

**SDK Repository**: https://github.com/Clarittyai/clarity-sdk

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

**Layer 1: Clarity SDK (PyPI Package)** - Decorator-based API
- Installed via `pip install clarity-sdk`
- Provides: `@agent`, `@workflow`, `@trigger_template` decorators
- Includes: `WorkflowExecutor`, `DynamicTriggerManager`
- **You import it**, you don't modify it

**Layer 2: Backend (backend/)** - FastAPI application
- REST API (17 endpoints)
- Database (PostgreSQL with SQLAlchemy)
- Agent/workflow registration on startup
- Trigger lifecycle management
- **This is where you write your code**

**Layer 3: Frontend (frontend/)** - React UI
- Dashboard (view agents/workflows)
- Trigger Manager (CRUD triggers with dynamic forms)
- Widget (2 sizes: small and large for Clarity marketplace)

## 📂 Template File Structure

### What's in the Template

You work with **your own code**, not the SDK:

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
- `components/Widget.tsx` - 2-size widget (small/large) for marketplace
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
**SDK Reference**: https://github.com/Clarittyai/clarity-sdk (for understanding SDK internals)
**SDK Documentation**: `pip show clarity-sdk` then check the README
**Frontend forms**: Look at `frontend/src/pages/TriggerManager.tsx` (lines 200-300)

## 🎓 Learning Resources

- **Main Documentation**: `README.md` - Complete guide with quick start, architecture, and testing
- **Marketplace Submission**: `SUBMISSION_REQUIREMENTS.md` - Checklist for submitting to Clarity Marketplace
- **API Docs**: http://localhost:8000/docs (when running) - Interactive API documentation

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
