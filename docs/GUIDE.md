# Complete Usage Guide

This guide covers everything you need to build sophisticated agentic applications with user-configurable triggers.

## Table of Contents

1. [Understanding the Architecture](#understanding-the-architecture)
2. [Building Your First Agent](#building-your-first-agent)
3. [Creating Workflows](#creating-workflows)
4. [User-Configurable Triggers](#user-configurable-triggers)
5. [Integration Management](#integration-management)
6. [Testing](#testing)
7. [Deployment](#deployment)

---

## Understanding the Architecture

### 2-Part Structure

```
clarity-agentic-app-seed/
├── clarity_sdk/          # Python SDK for defining agents/workflows/triggers
│   ├── agent.py          # @agent decorator
│   ├── workflow.py       # @workflow and @uses_agent decorators
│   ├── trigger.py        # @trigger_template decorator
│   ├── executor.py       # WorkflowExecutor (4 execution modes)
│   ├── trigger_manager.py # DynamicTriggerManager
│   └── ...
├── backend/              # FastAPI server + AI agents
│   ├── main.py           # FastAPI application (17 endpoints)
│   ├── infrastructure/   # Auto-discovery and health checks
│   ├── database.py       # SQLAlchemy configuration
│   ├── models.py         # Database models
│   ├── agents/           # Your agent implementations
│   ├── workflows/        # Your workflow definitions
│   └── triggers/         # Your trigger templates
├── frontend/             # React + Vite UI
│   ├── src/components/   # Widget and UI components
│   ├── src/pages/        # Dashboard and Trigger Manager
│   └── src/lib/          # API client
└── docker-compose.yml    # Full stack orchestration
```

### Technology Stack

**Backend**:
- FastAPI - Modern Python web framework
- SQLAlchemy - ORM and database management
- Pydantic - Data validation and type safety
- LangChain + Anthropic - AI agent framework
- APScheduler - Dynamic job scheduling

**Database**:
- PostgreSQL 15+ - Production-grade relational database
- Connection pooling for performance
- Full-text search support

**Frontend**:
- React 18 + TypeScript
- Vite for fast builds
- Tailwind CSS + shadcn/ui
- React Query for state management

---

## Building Your First Agent

### 1. Define an Agent

Create `backend/agents/my_agent.py`:

```python
from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

@agent(
    id="greeting-agent",
    name="Greeting Agent",
    description="Generates personalized greetings",
    category="communication",
    inputs={
        "name": {
            "type": "string",
            "description": "Person's name",
            "required": True
        }
    },
    outputs={
        "greeting": {
            "type": "string",
            "description": "Personalized greeting"
        }
    },
    timeout=30
)
class GreetingAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        name = context.get_input("name")
        greeting = f"Hello, {name}! Welcome to Clarity!"

        return AgentResult(
            success=True,
            data={"greeting": greeting}
        )
```

### 2. No Registration Needed!

**That's it!** The auto-discovery system (added in 2026) automatically finds and registers your agent on startup. No need to edit `__init__.py` files.

### 3. Test It

```bash
# Restart backend (auto-discovers new agent)
docker-compose restart backend

# Execute agent
curl -X POST http://localhost:8000/api/agents/greeting-agent/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-123" \
  -d '{"name": "Alice"}'

# Response:
# {
#   "success": true,
#   "data": {"greeting": "Hello, Alice! Welcome to Clarity!"},
#   "error": null
# }
```

---

## Creating Workflows

### Sequential Workflow

Workflows execute agents in order, passing data between steps:

```python
from clarity_sdk import workflow, uses_agent, ExecutionMode

@workflow(
    id="onboarding-workflow",
    name="User Onboarding",
    description="Complete onboarding process",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("greeting-agent", output_key="greeting")
@uses_agent("email-composer", input_from="greeting", output_key="email")
async def onboarding_workflow(context):
    """
    1. Generate greeting
    2. Compose welcome email using the greeting
    """
    pass
```

### Parallel Workflow

Execute multiple agents simultaneously for better performance:

```python
@workflow(
    id="multi-channel-notify",
    name="Multi-Channel Notification",
    execution_mode=ExecutionMode.PARALLEL
)
@uses_agent("email-composer", output_key="email")
@uses_agent("slack-notifier", output_key="slack")
@uses_agent("sms-sender", output_key="sms")
async def multi_channel_workflow(context):
    """
    Send notifications via email, Slack, and SMS simultaneously
    """
    pass
```

### DAG (Directed Acyclic Graph) Workflow

Complex workflows with multiple dependency chains:

```python
@workflow(
    id="content-pipeline",
    execution_mode=ExecutionMode.DAG
)
@uses_agent("research-agent", output_key="research")
@uses_agent("outline-agent", input_from="research", output_key="outline")
@uses_agent("writer-agent", input_from="outline", output_key="draft")
@uses_agent("editor-agent", input_from="draft", output_key="edited")
@uses_agent("seo-agent", input_from="research", output_key="seo")  # Parallel with writing
@uses_agent("publish-agent", input_from=["edited", "seo"], output_key="published")
async def content_pipeline_workflow(context):
    """
    Complex content pipeline:
    1. Research topic
    2. Create outline (depends on research)
    3. Write draft (depends on outline)
    4. Edit draft (depends on draft)
    5. SEO optimization (depends on research, runs parallel to writing)
    6. Publish (depends on both edited content and SEO)
    """
    pass
```

### Conditional Workflow

Skip steps based on conditions:

```python
@workflow(
    id="smart-routing",
    execution_mode=ExecutionMode.CONDITIONAL
)
@uses_agent("classifier-agent", output_key="category")
@uses_agent("urgent-handler",
    input_from="category",
    output_key="result",
    condition=lambda outputs: outputs.get("category") == "urgent"
)
@uses_agent("normal-handler",
    input_from="category",
    output_key="result",
    condition=lambda outputs: outputs.get("category") != "urgent"
)
async def smart_routing_workflow(context):
    """
    Route to different handlers based on classification
    """
    pass
```

---

## User-Configurable Triggers

### The Key Innovation

**Traditional approach**: Developers hardcode trigger schedules
```python
# ❌ Users can't customize this
@cron("0 9 * * *")  # Fixed: 9am every day
def daily_review():
    pass
```

**Clarity approach**: Developers define templates, users create instances
```python
# ✅ Users configure when they want it
@trigger_template(
    id="daily-review",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="task-review",
    config_fields=[
        {"key": "time", "label": "What time?", "type": "time"},
        {"key": "timezone", "label": "Timezone", "type": "timezone"}
    ]
)
class DailyReviewTrigger:
    pass
```

**Result**: User A configures 9am EST, User B configures 6pm PST - same template, personalized experience!

### 1. Define a Trigger Template

Create `backend/triggers/my_triggers.py`:

```python
from clarity_sdk import trigger_template, TriggerTemplateType

@trigger_template(
    id="morning-standup",
    name="Morning Standup Reminder",
    description="Daily standup reminder at your preferred time",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="standup-workflow",
    category="productivity",
    config_fields=[
        {
            "key": "time",
            "label": "What time is your standup?",
            "type": "time",
            "required": True,
            "default": "10:00"
        },
        {
            "key": "timezone",
            "label": "Your timezone",
            "type": "timezone",
            "required": True,
            "default": "America/New_York"
        },
        {
            "key": "reminder_minutes",
            "label": "Remind me ___ minutes before",
            "type": "number",
            "required": False,
            "default": 15,
            "validation": {"min": 5, "max": 60}
        }
    ],
    max_instances_per_user=3
)
class MorningStandupTrigger:
    pass
```

### 2. Users Create Instances

Via API:

```bash
curl -X POST http://localhost:8000/api/my/triggers \
  -H "Authorization: Bearer user-123" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "morning-standup",
    "name": "My Team Standup",
    "config": {
      "time": "10:30",
      "timezone": "America/Los_Angeles",
      "reminder_minutes": 10
    }
  }'
```

Via UI:
1. User browses trigger templates
2. Clicks "morning-standup"
3. Fills in form (auto-generated from config_fields)
4. Clicks "Create"
5. Done! Their personalized trigger is active

### 3. System Schedules Dynamically

The `DynamicTriggerManager`:
1. Loads user instances from database on startup
2. Parses user's config values
3. Schedules jobs with APScheduler
4. Executes workflows at configured times
5. Updates on trigger create/update/delete

### Available Trigger Types

```python
class TriggerTemplateType:
    SCHEDULE_DAILY = "schedule_daily"       # Daily at specific time
    SCHEDULE_WEEKLY = "schedule_weekly"     # Weekly on specific day
    SCHEDULE_MONTHLY = "schedule_monthly"   # Monthly on specific date
    SCHEDULE_CRON = "schedule_cron"         # Custom cron expression
    WEBHOOK = "webhook"                     # HTTP webhook trigger
    EVENT = "event"                         # Platform event trigger
```

---

## Integration Management

Agents can declare integration requirements for external services:

```python
@agent(
    id="gmail-sender",
    name="Gmail Sender",
    integrations=[
        {
            "service": "gmail",
            "auth_type": "oauth",
            "required": True,
            "scopes": ["https://www.googleapis.com/auth/gmail.send"],
            "config_fields": []
        }
    ]
)
class GmailSenderAgent(BaseAgent):
    async def execute(self, context: AgentContext):
        # Get user's Gmail credentials
        gmail_creds = context.get_integration("gmail")

        if not gmail_creds:
            return AgentResult(
                success=False,
                error="Gmail not connected. Please connect in settings."
            )

        # Use credentials to send email
        access_token = gmail_creds["access_token"]
        # ... send email using Gmail API ...

        return AgentResult(success=True, data={"sent": True})
```

The platform:
1. Detects required integrations from agent metadata
2. Prompts user to connect (OAuth flow, API key, etc.)
3. Stores encrypted credentials in `UserIntegration` table
4. Provides credentials to agent via context

---

## Testing

### Run Example Agent

```bash
cd clarity_sdk
python tests/examples/simple_agent_example.py
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# List agents
curl http://localhost:8000/api/agents

# Execute agent
curl -X POST http://localhost:8000/api/agents/task-analyzer/execute \
  -H "Authorization: Bearer test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "task_title": "Prepare presentation",
    "task_description": "Create slides for quarterly review"
  }'

# List trigger templates
curl http://localhost:8000/api/trigger-templates

# Create trigger instance
curl -X POST http://localhost:8000/api/my/triggers \
  -H "Authorization: Bearer test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "daily-task-review",
    "name": "My Daily Review",
    "config": {"time": "09:00", "timezone": "America/New_York"}
  }'
```

### Pre-Flight Validation

The backend includes comprehensive validation:

```bash
cd backend
python validate_startup.py

# Expected output:
# ✅ Environment variables configured
# ✅ Python imports successful
# ✅ Database connection working
# ✅ SDK registration working
# ✅ 2 agents registered
# ✅ 2 workflows registered
# ✅ 4 trigger templates registered
```

---

## Deployment

### Docker Production Build

```bash
# Build production image
docker build -t clarity-agentic-app:latest .

# Run with production settings
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e ANTHROPIC_API_KEY=sk-ant-xxxxx \
  -e DEBUG=false \
  clarity-agentic-app:latest
```

### Environment Variables

**Required** (only 1!):
- `ANTHROPIC_API_KEY` - Claude API key (get at console.anthropic.com)

**Optional** (smart defaults provided):
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8000)
- `FRONTEND_URL` - Frontend URL for CORS
- `DEBUG` - Debug mode (default: false)
- `LOG_LEVEL` - Logging level (default: INFO)

### Scaling

**Horizontal Scaling**:
- Backend is stateless - run multiple instances behind load balancer
- Database connection pooling handles concurrent requests
- Use Redis for distributed trigger scheduling across instances

**Database Scaling**:
- PostgreSQL read replicas for query scaling
- Connection pooling (configured in `database.py`)
- Indexes on `user_id`, `template_id`, `status` fields

**Monitoring**:
- Health endpoint: `GET /health`
- Execution history: `GET /api/workflows/executions`
- Trigger statistics: `GET /api/my/triggers`

---

## Database Models

### UserTriggerInstance

Stores user-configured trigger instances:

```python
{
  "id": "trigger-uuid",
  "user_id": "user-123",
  "template_id": "morning-standup",
  "name": "My Team Standup",
  "config": {
    "time": "10:30",
    "timezone": "America/Los_Angeles",
    "reminder_minutes": 10
  },
  "enabled": true,
  "total_executions": 42,
  "total_failures": 2,
  "last_triggered_at": "2026-02-18T10:30:00Z",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-02-18T10:30:00Z"
}
```

### TriggerExecution

Audit trail of all trigger fires:

```python
{
  "id": "execution-uuid",
  "trigger_instance_id": "trigger-uuid",
  "workflow_execution_id": "workflow-uuid",
  "triggered_at": "2026-02-18T10:30:00Z",
  "success": true,
  "trigger_data": { /* snapshot of trigger config at execution time */ }
}
```

### WorkflowExecution

Complete workflow execution history:

```python
{
  "id": "workflow-uuid",
  "workflow_id": "standup-workflow",
  "user_id": "user-123",
  "status": "completed",  # pending, in_progress, completed, failed
  "input_data": { /* workflow inputs */ },
  "output_data": { /* workflow outputs */ },
  "error_message": null,
  "started_at": "2026-02-18T10:30:00Z",
  "completed_at": "2026-02-18T10:30:15Z",
  "duration_seconds": 15
}
```

### UserIntegration

Stores encrypted credentials for external services:

```python
{
  "id": "integration-uuid",
  "user_id": "user-123",
  "service": "gmail",
  "credentials": { /* encrypted OAuth tokens or API keys */ },
  "is_active": true,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-02-18T00:00:00Z"
}
```

---

## Example Applications

What you can build with this template:

- **Task Management** - AI-powered task prioritization with deadline reminders
- **CRM System** - Lead scoring, follow-up automation, email composition
- **Content Pipeline** - Scheduled content generation, review, publishing
- **Customer Support** - Ticket analysis, response drafting, escalation
- **Analytics Dashboard** - Scheduled data analysis, anomaly detection, reporting
- **IoT Monitoring** - Sensor data analysis, threshold alerts, predictive maintenance
- **Social Media Manager** - Scheduled posting, engagement analysis, content suggestions
- **Email Assistant** - Smart inbox triage, draft responses, follow-up reminders

---

For API reference, see [API.md](API.md)

For marketplace submission requirements, see [SUBMISSION_REQUIREMENTS.md](SUBMISSION_REQUIREMENTS.md)

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md)
