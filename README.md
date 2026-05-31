# 🚀 Agentic App Seed - Claritty Platform Template

**Build production-ready agentic apps in minutes** - optimized for Claude Code

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Claritty Platform](https://img.shields.io/badge/Claritty-Platform_Ready-green.svg)](https://claritty.ai)

---

## 🎯 What is This?

A **minimal, best-practice, self-hostable template** for building agentic apps
(FastAPI + React + Postgres). You host it yourself — anywhere you can run Docker.
Its only Claritty dependencies are **the LLM (via the `claritty_sdk` proxy)** and
**the widget UI kit (`@clarittyai/widget-toolkit`)**.

**Perfect for:**
- Developers with an agentic app idea
- Anyone wanting to automate tasks with AI
- Shipping a real agentic app in hours, not weeks

**Developer workflow:**
```bash
1. Clone this repo
2. Open in Claude Code or Cursor
3. Brainstorm your app idea with AI
4. Implement agents/workflows/triggers + your UI
5. docker compose up --build  →  host it wherever you like
```

---

## ⚡ 5-Minute Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/Clarittyai/agentic-app-seed.git my-awesome-app
cd my-awesome-app
cp .env.example .env
# No API keys needed — AI runs through the Claritty platform proxy
# (and falls back to a built-in heuristic when running locally).
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
│   ├── components/Widget.tsx   # 3 widget sizes (small/medium/large)
│   ├── lib/widget-sizes.ts     # canonical widget dimensions
│   ├── pages/Dashboard.tsx     # Full app interface (Tasks example)
│   └── lib/api.ts              # API client
```

### Platform Integration
- ✅ **Dockerfile** (ECR Public Gallery, resilient builds)
- ✅ **Environment variables** (DATABASE_URL, PORT auto-injected)
- ✅ **Widget specifications** (Apple HIG: 170×170px, 360×170px, 360×360px)
- ✅ **Multi-tenancy** (user isolation built-in)
- ✅ **Health checks** (ALB-compatible)

---

## 🎨 Core Concepts

### 1. Agentic Apps = AI Workers on User's Schedule

**Traditional apps:** User does the work manually
**Agentic apps:** AI agents work automatically

**Example** (the seed's `example-agent`):
```python
@agent(id="example-agent")
class ExampleAgent(BaseAgent):
    async def execute(self, context):
        # Calls Claude via the SDK proxy to triage a task
        # → { priority, suggested_action }
        return AgentResult(...)
```

### 2. Widgets = Primary Interface

Users interact mainly through dashboard widgets (Apple HIG 3-size standard):
- **Small (170×170px)**: Single quick info
- **Medium (360×170px)**: List view, calendar, detailed + actions
- **Large (360×360px)**: Complex multi-row content

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
- **[CLAUDE.md](CLAUDE.md)** - AI assistant guide (for Claude Code / Cursor)
- **[WIDGETS.md](WIDGETS.md)** - Widget design specifications (3 sizes, the UI kit)
- **[LLM_PROXY.md](LLM_PROXY.md)** - calling Claude via the Claritty SDK proxy

### Detailed Reference (When Needed)
- **[docs/archive/](docs/archive/)** - Comprehensive guides (not loaded by default)

---

## 🔧 Common Tasks

### Add a New Agent
1. Create `backend/agents/my_agent.py`:
```python
from claritty_sdk import agent, BaseAgent, AgentResult

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
from claritty_sdk import workflow, uses_agent

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
from claritty_sdk import trigger_template, TriggerTemplateType

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

## 🚀 Host it

This is a normal Docker app — run it anywhere you can run a container + Postgres.

```bash
# Build + run locally (nginx → FastAPI on one container, + Postgres)
docker compose up --build
# → app on http://localhost:3200
```

**Required env vars** (set in `.env` — don't delete them):
- `DATABASE_URL` — Postgres connection
- `CLARITTY_PLATFORM_URL` + `CLARITTY_AUTH_TOKEN` — the Claritty LLM proxy
  (for real AI; without them, agents fall back to a built-in heuristic)

To deploy, ship the same image to your host of choice (any container platform) and
point `DATABASE_URL` at your Postgres. The schema is managed by Alembic migrations
(`backend/alembic.ini`); the app runs `upgrade head` on startup.

---

## 🛠 Infrastructure files (yours)

You self-host, so `Dockerfile`, `docker-compose.yml`, and `frontend/nginx.conf`
are yours to change. Two things to keep working:
- `frontend/src/lib/api.ts` uses **relative** URLs (empty `VITE_API_URL`) so the
  frontend calls `/api/...` on its own origin.
- Test with `docker compose up --build` after editing infra.

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
4. ✅ **Test locally** - `docker compose up --build`
5. ✅ **Host it** - ship the container anywhere (keep the required env vars)

---

## 🆘 Need Help?

**For Claude Code users:**
- Run `/superpowers:brainstorming` to design your app
- Run `/superpowers:systematic-debugging` for issues
- Check [CLAUDE.md](CLAUDE.md) for AI assistant guidance

**For developers:**
- Check [CLAUDE.md](CLAUDE.md) + [WIDGETS.md](WIDGETS.md)
- `docker compose up --build` to run it
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

**Questions?** Check [CLAUDE.md](CLAUDE.md) | [WIDGETS.md](WIDGETS.md) | [docs/archive/](docs/archive/)
