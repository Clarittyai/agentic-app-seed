# 🚀 Clarity Agentic App Template

**Build AI-powered apps where users control WHEN workflows run**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## ⚡ One-Command Start

```bash
git clone https://github.com/Clarittyai/agentic-app-seed.git
cd agentic-app-seed
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
./start.sh  # Mac/Linux
# OR
start.bat   # Windows
```

**That's it! 🎉**
- 📖 Frontend: http://localhost:3200
- 🔧 Backend API: http://localhost:8000
- 📚 API Docs: http://localhost:8000/docs

---

## 🎯 What Is This?

A **production-ready template** for building agentic AI applications with:

- 🤖 **AI Agents** - Define intelligent agents using simple decorators
- 🔄 **Workflows** - Chain agents together (sequential, parallel, or DAG execution)
- ⏰ **User-Configurable Triggers** - Let users control WHEN workflows run
- 🎨 **Beautiful UI** - Pre-built React components with widget support
- 🔒 **Enterprise-Ready** - Security, scalability, and observability built-in

## 🌟 About Clarity Platform

This template helps you build apps for the **Clarity Platform** - an AI-native marketplace where users discover and use agentic applications through widgets on a unified dashboard.

**Think of it as**:
- App Store for AI agents
- One dashboard for all automation
- Users control when things happen
- Widgets show status without opening apps

**New to Clarity?** → [Understanding Clarity Platform](docs/CLARITY_PLATFORM.md)

This comprehensive guide explains:
- What Clarity is and why it exists
- How agentic apps work vs traditional apps
- The widget-first interaction model
- How apps are hosted and deployed
- Complete user and developer journeys

### The Key Innovation

**Traditional approach**: Developers hardcode schedules
```python
@cron("0 9 * * *")  # ❌ Fixed: 9am every day
def daily_review():
    pass
```

**Clarity approach**: Users configure their own schedules
```python
@trigger_template(  # ✅ Users choose their time
    config_fields=[{"key": "time", "type": "time"}]
)
class DailyReview:
    pass
```

**Result**: User A configures 9am EST, User B configures 6pm PST - same template, personalized!

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose (recommended)
- Python 3.11+ (if running without Docker)
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Setup

```bash
# 1. Clone and configure
git clone https://github.com/Clarittyai/agentic-app-seed.git
cd agentic-app-seed
cp .env.example .env

# 2. Add your API key to .env
echo "ANTHROPIC_API_KEY=sk-ant-xxxxx" >> .env

# 3. Start everything
./start.sh  # Mac/Linux
# OR
start.bat   # Windows
```

The start script will:
- ✅ Check Docker is running
- ✅ Validate your API key
- ✅ Start all services
- ✅ Wait for health checks
- ✅ Show you the URLs

### Manual Start (Alternative)

```bash
# Start with docker-compose
docker-compose up

# Backend: http://localhost:8000
# Frontend: http://localhost:3200
# API Docs: http://localhost:8000/docs
```

---

## 🤖 Building Your First Agent

### 1. Create Agent File

Create `backend/agents/greeting_agent.py`:

```python
from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

@agent(
    id="greeting-agent",
    name="Greeting Agent",
    description="Generates personalized greetings",
    inputs={"name": {"type": "string", "required": True}},
    outputs={"greeting": {"type": "string"}}
)
class GreetingAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        name = context.get_input("name")
        greeting = f"Hello, {name}! Welcome to Clarity!"
        return AgentResult(success=True, data={"greeting": greeting})
```

### 2. That's It!

**No registration needed!** The auto-discovery system automatically finds and registers your agent on startup.

### 3. Test It

```bash
# Restart backend
docker-compose restart backend

# Execute agent
curl -X POST http://localhost:8000/api/agents/greeting-agent/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-123" \
  -d '{"name": "Alice"}'
```

---

## 📖 Documentation

### Essential Guides

- **[Complete Usage Guide](docs/GUIDE.md)** - Building agents, workflows, and triggers
- **[Architecture Documentation](docs/ARCHITECTURE.md)** - Technical deep dive
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Marketplace Submission](docs/SUBMISSION_REQUIREMENTS.md)** - Deploy to Clarity Marketplace
- **[AI Assistant Guide](CLAUDE.md)** - Guide for AI assistants working with this code

### Quick Links

- 🏗️ [2-Part Architecture](#architecture) - SDK + Backend structure
- 🔄 [Workflow Examples](docs/GUIDE.md#creating-workflows) - Sequential, parallel, DAG, conditional
- ⏰ [Trigger System](docs/GUIDE.md#user-configurable-triggers) - User-configurable scheduling
- 🎨 [Widget Design](docs/ARCHITECTURE.md#widget-first-design) - Widget-first philosophy
- 🧪 [Testing Guide](docs/GUIDE.md#testing) - Testing agents and workflows
- 🚀 [Deployment Guide](docs/GUIDE.md#deployment) - Production deployment

---

## 🏗️ Architecture

### Two-Part Structure

```
clarity-agentic-app-seed/
├── clarity_sdk/          # Python SDK (decorators, executors, triggers)
├── backend/              # FastAPI server (port 8000)
│   ├── agents/           # Your agent implementations
│   ├── workflows/        # Your workflow definitions
│   ├── triggers/         # Your trigger templates
│   └── infrastructure/   # Auto-discovery & health checks
├── frontend/             # React UI (port 3200)
└── docker-compose.yml    # Full stack orchestration
```

### Technology Stack

- **SDK**: Python 3.11+, Pydantic, APScheduler
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, LangChain, Anthropic Claude
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Deployment**: Docker, docker-compose

**[See complete architecture →](docs/ARCHITECTURE.md)**

---

## 🎨 Widget-First Design

Apps built with this template are accessed primarily through **widgets** on the Clarity dashboard, not standalone web pages.

### Two Widget Sizes

- **Small (300x150px)**: Quick glance - active triggers, success rate
- **Large (600x400px)**: Detailed view - execution history, interactive controls

### Implementation

**Backend**:
```python
@app.get("/api/widget")
async def get_widget_data(size: str = "large"):
    if size == "small":
        return {"active_triggers": 5, "success_rate": "95%"}
    return {"active_triggers": 5, "total_executions": 42, "recent_executions": [...]}
```

**Frontend**:
```typescript
<Widget size="small" />  // Quick glance
<Widget size="large" />  // Detailed view
```

**[Learn more about widget-first design →](docs/ARCHITECTURE.md#widget-first-design)**

---

## 📊 Features

### For Developers

- ✅ **Zero Configuration** - Auto-discovery eliminates manual registration
- ✅ **One Command Start** - `./start.sh` handles everything
- ✅ **Type-Safe** - Pydantic validation for all data structures
- ✅ **Hot Reload** - Changes reflected immediately
- ✅ **Comprehensive Examples** - Task analyzer, email composer, and more

### For Users

- ✅ **Personalized Triggers** - Configure workflows to run on their schedule
- ✅ **Widget Dashboard** - Monitor app status at a glance
- ✅ **Execution History** - Track all workflow runs and results
- ✅ **Beautiful UI** - Modern, responsive interface

---

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# List registered agents
curl http://localhost:8000/api/agents

# Execute agent
curl -X POST http://localhost:8000/api/agents/task-analyzer/execute \
  -H "Authorization: Bearer test-user" \
  -H "Content-Type: application/json" \
  -d '{"task_title": "Test", "task_description": "Testing the agent"}'

# Pre-flight validation
cd backend
python validate_startup.py
```

**[See complete testing guide →](docs/GUIDE.md#testing)**

---

## 🚀 What Can You Build?

Example applications built with this template:

- **Task Management** - AI-powered prioritization with deadline reminders
- **CRM System** - Lead scoring, follow-up automation
- **Content Pipeline** - Scheduled generation, review, publishing
- **Customer Support** - Ticket analysis, response drafting
- **Analytics Dashboard** - Scheduled reports and anomaly detection
- **IoT Monitoring** - Sensor analysis and predictive maintenance

**[See more examples →](docs/GUIDE.md#example-applications)**

---

## 🤝 Contributing

This is a template repository. Fork it and make it your own!

For issues or suggestions, please open an issue.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Built With

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [LangChain](https://www.langchain.com/) - AI agent framework
- [Anthropic Claude](https://www.anthropic.com/) - Powerful AI model
- [React](https://react.dev/) - UI library
- [PostgreSQL](https://www.postgresql.org/) - Database

---

**Built with ❤️ by the Clarity team**

**[Get started now →](#-one-command-start)** | **[Read the full guide →](docs/GUIDE.md)** | **[View API docs →](docs/API.md)**
