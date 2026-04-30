# 🚀 Agentic App Seed - Claritty Platform Template

**Build production-ready agentic apps in minutes** - optimized for Claude Code

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Claritty Platform](https://img.shields.io/badge/Claritty-Platform_Ready-green.svg)](https://claritty.ai)

---

## 🎯 What is This?

A **minimal, best-practice template** for building agentic apps that deploy to Claritty Platform.

**Perfect for:**
- Developers with an agentic app idea
- Anyone wanting to automate tasks with AI
- Building marketplace-ready apps in hours, not weeks

**Developer workflow:**
```bash
1. Clone this repo
2. Open in Claude Code
3. Brainstorm your app idea with AI
4. Implement agents/workflows/triggers
5. Deploy to Claritty Platform
```

---

## ⚡ 5-Minute Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/Clarittyai/agentic-app-seed.git my-awesome-app
cd my-awesome-app
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

### 2. Start Development Environment
```bash
docker-compose up -d
```

**That's it!** ✅
- **Frontend**: http://localhost:3200
- **Backend API**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 3. Open Claude Code & Brainstorm
```bash
code .  # Open in VS Code with Claude Code extension
```

In Claude Code, run:
```
/superpowers:brainstorming
```

**Tell Claude:**
- What problem your app solves
- What tasks should be automated
- When/how users want it to run

**Claude will help you design:**
- AI agents for specific tasks
- Workflows to chain agents
- User-configurable triggers
- Widget interfaces (small & large)

---

## 🏗️ What's Included

### Backend (FastAPI + Python)
```
backend/
├── agents/           # ONE minimal agent example
├── workflows/        # ONE minimal workflow example
├── triggers/         # ONE minimal trigger template
├── main.py           # Core API (ready to extend)
└── infrastructure/   # Auto-discovery (platform-managed)
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/Widget.tsx   # 2 widget sizes (small/large)
│   ├── pages/Dashboard.tsx     # Full app interface
│   └── lib/api.ts              # API client
```

### Platform Integration
- ✅ **Dockerfile** (ECR Public Gallery, resilient builds)
- ✅ **Environment variables** (DATABASE_URL, PORT auto-injected)
- ✅ **Widget specifications** (190×190px, 400×190px)
- ✅ **Multi-tenancy** (user isolation built-in)
- ✅ **Health checks** (ALB-compatible)

---

## 🎨 Core Concepts

### 1. Agentic Apps = AI Workers on User's Schedule

**Traditional apps:** User does the work manually
**Agentic apps:** AI agents work automatically

**Example:**
```python
@agent(id="email-analyzer")
class EmailAnalyzer(BaseAgent):
    async def execute(self, context):
        # AI analyzes emails, prioritizes, drafts responses
        return AgentResult(...)
```

### 2. Widgets = Primary Interface

Users interact mainly through dashboard widgets:
- **Small (190×190px)**: Quick status check
- **Large (400×190px)**: Detailed view + actions

**NOT a traditional web app** - widgets come first!

### 3. User-Configurable Triggers

**You define templates, users create instances:**
```python
@trigger_template(
    config_fields=[
        {"key": "time", "type": "time"},      # User picks time
        {"key": "timezone", "type": "timezone"}  # User picks timezone
    ]
)
class DailyReview:
    pass

# User A: 9am EST
# User B: 6pm PST
# Both run automatically!
```

---

## 📚 Documentation

### Core Guides (Start Here)
- **[CLAUDE.md](CLAUDE.md)** - AI assistant guide (for Claude Code)
- **[PLATFORM.md](PLATFORM.md)** - Claritty deployment guide
- **[WIDGETS.md](WIDGETS.md)** - Widget design specifications

### Detailed Reference (When Needed)
- **[docs/archive/](docs/archive/)** - Comprehensive guides (not loaded by default)

---

## 🔧 Common Tasks

### Add a New Agent
1. Create `backend/agents/my_agent.py`:
```python
from clarity_sdk import agent, BaseAgent, AgentResult

@agent(id="my-agent", name="My Agent")
class MyAgent(BaseAgent):
    async def execute(self, context):
        # Your logic here
        return AgentResult(success=True, data={...})
```

2. Register in `backend/agents/__init__.py`
3. Restart backend - done!

### Add a New Workflow
1. Create `backend/workflows/my_workflow.py`:
```python
from clarity_sdk import workflow, uses_agent

@workflow(id="my-workflow")
@uses_agent("agent-1", output_key="step1")
@uses_agent("agent-2", input_from="step1")
async def my_workflow(context):
    pass
```

2. Register in `backend/workflows/__init__.py`
3. Test via API or frontend

### Add a New Trigger Template
1. Create `backend/triggers/my_trigger.py`:
```python
from clarity_sdk import trigger_template, TriggerTemplateType

@trigger_template(
    id="my-trigger",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="my-workflow",
    config_fields=[...]
)
class MyTrigger:
    pass
```

2. Frontend automatically generates UI!

**📖 See [CLAUDE.md](CLAUDE.md) for complete examples**

---

## 🚀 Deploy to Claritty Platform

### 1. Test Locally
```bash
# Verify everything works
curl http://localhost:8000/health
curl http://localhost:8000/api/widget?size=small
curl http://localhost:8000/api/widget?size=large
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Initial commit: My Awesome App"
git push origin main
```

### 3. Submit to Claritty
1. Go to [Claritty Developer Portal](https://claritty.ai/developers)
2. Click "Submit App"
3. Paste your GitHub URL
4. Platform validates, builds, deploys!

**Platform handles:**
- ✅ Multi-tenancy validation
- ✅ Security scanning
- ✅ Docker image build (ECR Public Gallery)
- ✅ ECS deployment
- ✅ Environment variable injection
- ✅ Health checks & monitoring

**📖 See [PLATFORM.md](PLATFORM.md) for deployment details**

---

## ⚠️ Platform-Controlled Files

**DO NOT modify these** (managed by Claritty Platform):
- `Dockerfile` - Platform generates production Dockerfile
- `docker-compose.yml` - Port allocation
- `frontend/nginx.conf` - API proxy configuration
- `frontend/src/lib/api.ts` - API base URL (must use relative URLs)

**Why?** Platform uses dynamic port allocation and ECR Public Gallery base images for multi-tenancy.

**📖 See [INFRASTRUCTURE.md](INFRASTRUCTURE.md) for details**

---

## 🧪 Testing

```bash
# Manual API testing
curl http://localhost:8000/api/agents
curl -X POST http://localhost:8000/api/workflows/my-workflow/execute

# Startup validation
cd backend && python validate_startup.py

# Widget testing
curl http://localhost:8000/api/widget?size=small  # Should be < 200ms
curl http://localhost:8000/api/widget?size=large  # Should be < 500ms
```

---

## 💡 Best Practices

### Design Workflow
1. ✅ **Start with widgets** - Design small/large widgets first
2. ✅ **Think user schedule** - What do users want automated?
3. ✅ **Minimize examples** - Keep template clean
4. ✅ **Use Claude Code** - Leverage /superpowers:brainstorming

### Implementation Workflow
1. ✅ **One agent at a time** - Build, test, iterate
2. ✅ **Chain into workflows** - Compose agents
3. ✅ **Add trigger templates** - Let users configure
4. ✅ **Test locally** - docker-compose up
5. ✅ **Deploy to platform** - Submit to Claritty

---

## 🆘 Need Help?

**For Claude Code users:**
- Run `/superpowers:brainstorming` to design your app
- Run `/superpowers:systematic-debugging` for issues
- Check [CLAUDE.md](CLAUDE.md) for AI assistant guidance

**For developers:**
- Check [docs/archive/FAQ.md](docs/archive/FAQ.md) for common issues
- See [PLATFORM.md](PLATFORM.md) for deployment help
- Email support@claritty.ai

---

## 🌟 What You Can Build

**Real examples:**
- **AI Task Manager** - Auto-prioritize tasks, suggest schedules
- **Email Assistant** - Triage inbox, draft responses
- **CRM Agent** - Lead scoring, follow-up automation
- **Report Generator** - Automated weekly/monthly reports
- **Content Pipeline** - Research → Write → Edit → Publish
- **Data Monitor** - Track metrics, alert on anomalies

**The limit is your imagination!**

---

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

## 🚀 Get Started Now

```bash
git clone https://github.com/Clarittyai/agentic-app-seed.git
cd agentic-app-seed
docker-compose up -d
code .  # Open Claude Code and run /superpowers:brainstorming
```

**Build something amazing!** 🎉

---

**Questions?** Check [CLAUDE.md](CLAUDE.md) | [PLATFORM.md](PLATFORM.md) | [docs/archive/](docs/archive/)
