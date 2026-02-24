# Quick Start Guide

Get your Clarity Agentic App running in **5 minutes**! ⚡

## Prerequisites

- Docker & Docker Compose (recommended)
- OR: Python 3.11+, Node.js 20+, PostgreSQL 15+
- Anthropic API key ([Get one free](https://console.anthropic.com/))

## 🚀 Start with Docker (Recommended)

### 1. Clone and Setup

```bash
cd clarity-agentic-app-seed

# Copy environment file
cp .env.example .env

# Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env
```

### 2. Start Everything

```bash
docker-compose up
```

That's it! The system will:
- ✅ Start PostgreSQL database
- ✅ Start backend API (port 8000)
- ✅ Start frontend UI (port 3200)
- ✅ Initialize database tables
- ✅ Register all agents, workflows, and triggers
- ✅ Load any existing user triggers

### 3. Access the Application

- **Frontend**: http://localhost:3200
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🎯 Your First Trigger (2 minutes)

### 1. Open the UI

Navigate to http://localhost:3200

### 2. Go to Triggers Page

Click "Triggers" in the navigation

### 3. Create a Trigger

1. Scroll to "Available Templates"
2. Click "Create Trigger" on **"Daily Task Review"**
3. Fill in the form:
   - **Name**: My Morning Review
   - **Time**: 09:00
   - **Timezone**: America/New_York
   - **Days**: Monday, Tuesday, Wednesday, Thursday, Friday
4. Click "Create Trigger"

### 4. See It Scheduled

Your trigger now appears in "My Triggers" section!

The backend has automatically:
- ✅ Created database record
- ✅ Parsed your configuration
- ✅ Built a cron schedule (9am EST, Mon-Fri)
- ✅ Registered with APScheduler
- ✅ Will execute `task-review-workflow` every weekday at 9am

## 🧪 Test Manual Execution

Want to test without waiting? Execute a workflow manually:

```bash
curl -X POST http://localhost:8000/api/workflows/task-review-workflow/execute \
  -H "Authorization: Bearer test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "task_title": "Prepare presentation",
    "task_description": "Create slides for quarterly review"
  }'
```

Response:
```json
{
  "execution_id": "uuid",
  "workflow_id": "task-review-workflow",
  "status": "completed",
  "success": true,
  "outputs": {
    "analysis": {
      "priority": "high",
      "estimated_duration_minutes": 120,
      "suggested_actions": [...]
    }
  },
  "duration_seconds": 2.5
}
```

## 📊 View Execution History

Navigate to Dashboard → See recent executions in the large widget!

## 🛠️ Development Setup (Without Docker)

### Backend

```bash
# Install SDK
cd clarity_sdk
pip install -e .

# Install backend
cd ../backend
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY=sk-ant-your-key-here
export DATABASE_URL=postgresql://user:password@localhost:5432/clarity

# Run backend
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🎨 What You Can Do Now

### Create Different Trigger Types

**Daily Schedule**:
- Morning standup reminders
- Evening review summaries
- Weekly reports

**Interval-Based**:
- Check for urgent tasks every 30 minutes
- Poll for new data every hour
- Health checks every 15 minutes

**Data Threshold**:
- Alert when pending tasks > 20
- Notify when deadline approaching
- Warning when failure rate > 10%

**Webhook**:
- Task created events
- External system integrations
- Real-time notifications

### Manage Triggers

- ⏸️ **Pause**: Temporarily disable without deleting
- ▶️ **Resume**: Re-enable paused triggers
- 🗑️ **Delete**: Remove trigger and unschedule
- ✏️ **View Stats**: See execution count and failures

### Execute Workflows

- **Manual**: Click "Execute" on Dashboard
- **Scheduled**: Configured via triggers
- **API**: Call execution endpoint programmatically

## 🔍 Monitor Execution

### Dashboard Widget

Shows at-a-glance:
- Active triggers count
- Total executions
- Success rate
- Recent execution history

### Database

Query execution history:
```sql
-- Recent workflow executions
SELECT * FROM workflow_executions
ORDER BY started_at DESC
LIMIT 10;

-- Trigger statistics
SELECT
  template_id,
  COUNT(*) as instances,
  SUM(total_executions) as total_runs,
  SUM(total_failures) as total_failures
FROM user_trigger_instances
WHERE enabled = true
GROUP BY template_id;
```

### Logs

```bash
# View backend logs
docker-compose logs -f backend

# Look for:
# "🔥 Trigger fired: daily-task-review"
# "✅ Workflow execution completed: task-review-workflow"
```

## 🚨 Troubleshooting

### Backend won't start

```bash
# Check environment variables
docker-compose exec backend env | grep ANTHROPIC_API_KEY

# Check database connection
docker-compose exec backend python -c "from backend.database import engine; print(engine.url)"

# Check logs
docker-compose logs backend
```

### Trigger not firing

```bash
# Check if trigger is enabled
curl http://localhost:8000/api/my/triggers \
  -H "Authorization: Bearer test-user"

# Check APScheduler jobs
# View backend logs for "Registered trigger" messages
docker-compose logs backend | grep "Registered trigger"
```

### Frontend not connecting

```bash
# Check frontend environment
docker-compose exec frontend cat /usr/share/nginx/html/assets/*.js | grep API_URL

# Check CORS settings in backend
docker-compose logs backend | grep CORS
```

## 🎓 Next Steps

### 1. Create Your Own Agent

```python
from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

@agent(
    id="my-agent",
    name="My Custom Agent",
    description="Does something amazing",
    inputs={"input_text": {"type": "string", "required": True}},
    outputs={"result": {"type": "string"}}
)
class MyAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        input_text = context.get_input("input_text")
        result = f"Processed: {input_text}"
        return AgentResult(success=True, data={"result": result})
```

### 2. Create Your Own Workflow

```python
from clarity_sdk import workflow, uses_agent

@workflow(id="my-workflow", name="My Workflow")
@uses_agent("my-agent", output_key="step1")
@uses_agent("task-analyzer", input_from="step1", output_key="step2")
async def my_workflow(context):
    pass
```

### 3. Create Your Own Trigger Template

```python
from clarity_sdk import trigger_template, TriggerTemplateType

@trigger_template(
    id="my-trigger",
    name="My Custom Trigger",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="my-workflow",
    config_fields=[
        {"key": "time", "label": "When?", "type": "time", "required": True}
    ]
)
class MyTrigger:
    pass
```

### 4. Register Your Components

Add to `backend/agents/__init__.py`:
```python
from backend.agents.my_agent import MyAgent

__all__ = ["MyAgent", ...]
```

Restart backend → Your components are live!

## 📚 Learn More

- **Full Documentation**: See [README.md](README.md)
- **Architecture Details**: See [AGENTIC_APP_SEED_COMPLETE_DESIGN.md](AGENTIC_APP_SEED_COMPLETE_DESIGN.md)
- **Trigger System**: See [TRIGGER_SYSTEM_DESIGN.md](TRIGGER_SYSTEM_DESIGN.md)
- **API Reference**: http://localhost:8000/docs (when running)
- **Frontend Code**: See [frontend/README.md](frontend/README.md)

## 🎉 You're Ready!

You now have a **complete agentic application** with:
- ✅ User-configurable triggers
- ✅ AI-powered agents
- ✅ Workflow orchestration
- ✅ Beautiful web UI
- ✅ Production-ready architecture

**Build something amazing!** 🚀
