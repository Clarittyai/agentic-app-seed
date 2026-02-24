# 🚀 Agentic App Template

**Build AI apps where users control WHEN workflows run**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## ⚡ 60-Second Start

```bash
git clone https://github.com/Clarittyai/agentic-app-seed.git
cd agentic-app-seed
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env
docker-compose up
```

**Done! 🎉**
- 📖 API Docs: http://localhost:8000/docs
- 🏥 Health Check: http://localhost:8000/health
- 🎨 Frontend: http://localhost:3200

---

## 🎯 Overview

The **Clarity Agentic App Seed** is a complete, production-ready template for building sophisticated AI-powered applications with:

- 🤖 **AI Agent System** - Define intelligent agents using simple decorators
- 🔄 **Workflow Orchestration** - Chain agents together with sequential, parallel, or DAG execution
- ⏰ **User-Configurable Triggers** - Let users control WHEN workflows run (not developers!)
- 🎨 **Beautiful UI** - Pre-built React components for agent management and monitoring
- 🔒 **Enterprise-Ready** - Security, scalability, and observability built-in

### The Key Innovation: User-Configurable Triggers

**Traditional approach**: Developers hardcode trigger schedules in code
```python
# ❌ Users can't customize this
@cron("0 9 * * *")  # Fixed: 9am every day
def daily_review():
    pass
```

**Clarity approach**: Developers define templates, users create instances with their own configurations
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

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose (recommended)
- PostgreSQL 15+ (or use Docker)
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### 1. Clone and Setup

```bash
# Clone the template
git clone https://github.com/Clarittyai/agentic-app-seed.git
cd agentic-app-seed

# Copy environment file
cp .env.example .env

# Add your Anthropic API key to .env
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 2. Start with Docker (Recommended)

```bash
# Start all services (PostgreSQL + Backend)
docker-compose up

# Backend available at: http://localhost:8000
# API docs: http://localhost:8000/docs
```

### 3. Or Start Locally

```bash
# Install SDK
cd clarity_sdk
pip install -e .

# Install backend dependencies
cd ../backend
pip install -r requirements.txt

# Start PostgreSQL (separately)
# Update DATABASE_URL in .env

# Run backend
python main.py
```

### 4. Validate Your Setup

```bash
# Run pre-flight validation (recommended)
cd backend
python validate_startup.py

# Expected: All checks pass ✅
# - Environment variables
# - Python imports
# - Database connection
# - SDK registration
```

### 5. Test It Out

```bash
# Health check
curl http://localhost:8000/health

# List registered agents (expect 2)
curl http://localhost:8000/api/agents

# List trigger templates (expect 4)
curl http://localhost:8000/api/trigger-templates
```

### 6. Complete Testing

For comprehensive testing and troubleshooting, see:
- **[TESTING.md](TESTING.md)** - Complete testing guide (400+ lines)
- **[VALIDATION_FIXES.md](VALIDATION_FIXES.md)** - System verification and fixes applied

---

## 📚 Architecture

### 2-Part Structure

```
clarity-agentic-app-seed/
├── clarity_sdk/          # Python SDK for defining agents/workflows/triggers
│   ├── agent.py          # @agent decorator
│   ├── workflow.py       # @workflow and @uses_agent decorators
│   ├── trigger.py        # @trigger_template decorator
│   └── ...
├── backend/              # FastAPI server + AI agents
│   ├── main.py           # FastAPI application (17 endpoints)
│   ├── database.py       # SQLAlchemy configuration
│   ├── models.py         # Database models
│   ├── agents/           # Your agent implementations
│   ├── workflows/        # Your workflow definitions
│   └── triggers/         # Your trigger templates
├── frontend/             # React + Vite (Week 4)
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

**Frontend** (Week 4):
- React 18 + TypeScript
- Vite for fast builds
- Tailwind CSS + shadcn/ui
- React Query for state management

---

## 🤖 Building Your First Agent

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

### 2. Register the Agent

Update `backend/agents/__init__.py`:

```python
from backend.agents.my_agent import GreetingAgent

__all__ = ["GreetingAgent"]
```

### 3. Test It

```bash
# Restart backend
# Agent automatically registers on startup

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

## 🔄 Building Workflows

### Sequential Workflow

```python
from clarity_sdk import workflow, uses_agent, ExecutionMode

@workflow(
    id="onboarding-workflow",
    name="User Onboarding",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("greeting-agent", output_key="greeting")
@uses_agent("email-composer", input_from="greeting", output_key="email")
async def onboarding_workflow(context):
    """
    1. Generate greeting
    2. Compose welcome email
    """
    pass
```

### Parallel Workflow

```python
@workflow(
    id="multi-channel-notify",
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

---

## ⏰ User-Configurable Triggers

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
            "default": 15
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

Via UI (Week 4):
- User browses trigger templates
- Clicks "morning-standup"
- Fills in form (auto-generated from config_fields)
- Clicks "Create"
- Done! Their personalized trigger is active

### 3. System Schedules Dynamically

The `DynamicTriggerManager` (Week 3):
1. Loads user instances from database on startup
2. Parses user's config values
3. Schedules jobs with APScheduler
4. Executes workflows at configured times
5. Updates on trigger create/update/delete

---

## 🗄️ Database Models

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
  "last_triggered_at": "2026-02-18T10:30:00Z"
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
  "trigger_data": { /* snapshot of trigger config */ }
}
```

### WorkflowExecution

Complete workflow execution history:

```python
{
  "id": "workflow-uuid",
  "workflow_id": "standup-workflow",
  "status": "completed",
  "input_data": { /* workflow inputs */ },
  "output_data": { /* workflow outputs */ },
  "started_at": "2026-02-18T10:30:00Z",
  "completed_at": "2026-02-18T10:30:15Z",
  "duration_seconds": 15
}
```

---

## 🔌 Integration Management

Agents can declare integration requirements:

```python
@agent(
    id="gmail-sender",
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
        # ...
```

The platform:
1. Detects required integrations from agent metadata
2. Prompts user to connect (OAuth flow, API key, etc.)
3. Stores encrypted credentials in `UserIntegration` table
4. Provides credentials to agent via context

---

## 📊 Monitoring & Observability

### Health Checks

```bash
GET /health
```

### Execution History

```bash
# List user's workflow executions
GET /api/workflows/executions?user_id=user-123&limit=50

# Get specific execution
GET /api/workflows/executions/{execution_id}
```

### Trigger Statistics

```bash
# List user's triggers with execution counts
GET /api/my/triggers
# Returns: total_executions, total_failures, last_triggered_at
```

### Widget Endpoint (Clarity Platform Integration)

```bash
# Small widget
GET /api/widget?size=small
# Returns: active_triggers, success_rate

# Large widget
GET /api/widget?size=large
# Returns: full execution history, detailed stats
```

---

## 🔒 Security

### Authentication

Currently uses simple Bearer token authentication. For production:

```python
def get_current_user(authorization: str = Header(...)):
    # Validate JWT token
    # Extract user_id from token
    # Check permissions
    # Return user_id
```

### Data Isolation

All database queries filter by `user_id`:

```python
# ✅ Good - Per-user filtering
triggers = db.query(UserTriggerInstance).filter(
    UserTriggerInstance.user_id == user_id
).all()

# ❌ Bad - Leaks data across users
triggers = db.query(UserTriggerInstance).all()
```

### Encrypted Credentials

Integration credentials stored encrypted:

```python
# UserIntegration.credentials is JSON encrypted at rest
# Decrypt only when needed for agent execution
```

### Rate Limiting

Implement rate limiting per user:

```python
# TODO: Add rate limiting middleware
# Max 100 agent executions per hour per user
```

---

## 🚀 Deployment

### Docker Production Build

```bash
# Build production image
docker build -t clarity-agentic-app:latest .

# Run with production settings
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e DEBUG=false \
  clarity-agentic-app:latest
```

### Environment Variables

Required:
- `ANTHROPIC_API_KEY` - Claude API key (get at console.anthropic.com)
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `PORT` - Server port (default: 8000)
- `DEBUG` - Debug mode (default: false)
- `FRONTEND_URL` - Frontend URL for CORS
- `REDIS_URL` - Redis for distributed scheduling
- `LOG_LEVEL` - Logging level (INFO, DEBUG, etc.)

### Scaling

**Horizontal Scaling**:
- Backend is stateless - run multiple instances behind load balancer
- Database connection pooling handles concurrent requests
- Use Redis for distributed trigger scheduling

**Database Scaling**:
- PostgreSQL read replicas for query scaling
- Connection pooling (configured in `database.py`)
- Indexes on user_id, template_id, status fields

---

## 📖 API Documentation

### Interactive Docs

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/widget` | Widget data (3 sizes) |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/{id}` | Get agent details |
| POST | `/api/agents/{id}/execute` | Execute agent |
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows/{id}/execute` | Execute workflow |
| GET | `/api/workflows/executions/{id}` | Get execution status |
| GET | `/api/trigger-templates` | List trigger templates |
| GET | `/api/my/triggers` | List user's triggers |
| POST | `/api/my/triggers` | Create trigger instance |
| PATCH | `/api/my/triggers/{id}` | Update trigger |
| DELETE | `/api/my/triggers/{id}` | Delete trigger |

---

## 🧪 Testing

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
```

---

## 📈 Roadmap

- ✅ **Week 1**: SDK Foundation (Complete)
- ✅ **Week 2**: Backend Core Implementation (Complete)
- ⏳ **Week 3**: Trigger System (DynamicTriggerManager, APScheduler)
- ⏳ **Week 4**: Frontend (React UI, trigger management)
- ⏳ **Week 5**: Example App (Full TaskManager implementation)
- ⏳ **Week 6**: Documentation & Polish

**Current Progress**: 33.3% Complete (2 of 6 weeks)

See [PROGRESS.md](PROGRESS.md) for detailed implementation status.

---

## 📝 Example Applications

Ideas for what you can build with this template:

- **Task Management** - AI-powered task prioritization with deadline reminders
- **CRM System** - Lead scoring, follow-up automation, email composition
- **Content Pipeline** - Scheduled content generation, review, publishing
- **Customer Support** - Ticket analysis, response drafting, escalation
- **Analytics Dashboard** - Scheduled data analysis, anomaly detection, reporting
- **IoT Monitoring** - Sensor data analysis, threshold alerts, predictive maintenance

---

## 🤝 Contributing

This is a template repository. Fork it and make it your own!

For issues or suggestions, please open an issue.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [LangChain](https://www.langchain.com/) - AI agent framework
- [Anthropic Claude](https://www.anthropic.com/) - Powerful AI model
- [SQLAlchemy](https://www.sqlalchemy.org/) - Python ORM
- [APScheduler](https://apscheduler.readthedocs.io/) - Job scheduling

---

## 📞 Support

For questions or support:
- 📖 Read the [full design document](AGENTIC_APP_SEED_COMPLETE_DESIGN.md)
- 📊 Check [implementation progress](PROGRESS.md)
- 🔧 Review [trigger system design](TRIGGER_SYSTEM_DESIGN.md)

---

**Built with ❤️ by the Clarity team**
