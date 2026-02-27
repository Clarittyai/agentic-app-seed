# 🚀 Clarity Agentic App Template

**Build AI-powered applications that work for users on their schedule**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## 🌟 What is Clarity Platform?

**Clarity** is an AI-native platform that brings intelligent automation to everyone through a unified dashboard. Instead of juggling dozens of disconnected AI tools, users discover, install, and use **agentic applications** that work together seamlessly.

### The Vision

Imagine your workday where AI handles routine tasks automatically:
- Your email inbox is triaged every morning at 8 AM
- Task priorities are analyzed before your standup at 9 AM
- Reports are generated and sent every Friday at 4 PM
- Customer inquiries get drafted responses within minutes

**The key**: You control when these things happen. You set the schedule. The AI agents work on your terms.

This is **Clarity** - a marketplace of intelligent applications that automate your work, your way.

---

## 🤖 What Are Agentic Apps?

**Agentic apps** are fundamentally different from traditional applications:

### Traditional Apps
```
You open the app → Perform the task manually → Close the app
Repeat daily...
```

### Agentic Apps
```
You configure once → AI agents work automatically → You review results
Automation runs on your schedule without manual intervention
```

### The Three Components

Every agentic app has:

**1. Agents** - AI-powered workers that perform specific tasks
- Analyze tasks and estimate time
- Draft emails and responses
- Generate reports and summaries
- Process data and extract insights

**2. Workflows** - Chains of agents working together
- Sequential: One agent after another
- Parallel: Multiple agents working simultaneously
- Complex: Conditional logic and decision trees

**3. Triggers** - User-controlled schedules
- "Run every weekday at 9 AM"
- "Check every 2 hours between 8 AM - 6 PM"
- "Execute every Friday at 4 PM"
- Users choose their own times and frequencies

---

## 👥 How Users Experience These Apps

### Discovery & Installation
1. **Browse the Clarity Marketplace** - Discover apps built by developers
2. **View app widgets** - See live previews with real functionality
3. **Install with one click** - App appears on their dashboard instantly

### Daily Interaction

Users interact primarily through **widgets** on their Clarity dashboard:

#### Small Widget (Quick Glance)
```
┌─────────────────────┐
│  Email Assistant    │
│  ──────────────────  │
│  ✉️  3 important     │
│  🚨 1 urgent         │
│  ✅ 95% handled      │
└─────────────────────┘
```
Shows key metrics at a glance

#### Large Widget (Detailed View)
```
┌──────────────────────────────────────┐
│  Email Assistant                      │
│  ────────────────────────────────────  │
│  📊 Last 24 Hours:                    │
│    • 47 emails processed              │
│    • 3 marked important               │
│    • 1 requires immediate attention   │
│                                        │
│  🔥 Urgent:                            │
│  "RE: Q1 Budget Review" - CFO         │
│  → Suggested response ready           │
│                                        │
│  [View All]  [Settings]               │
└──────────────────────────────────────┘
```
Enough detail to act without opening the full app

### Configuration

Users control when and how apps work:
- **Set triggers**: "Check my email every 2 hours"
- **Choose times**: 9 AM in New York or 6 PM in San Francisco
- **Configure behavior**: How aggressive should prioritization be?
- **Connect services**: Gmail, Slack, Calendar, etc.

### The Result

**One unified dashboard** where users:
- See all their automations at a glance
- Control when everything runs
- Get notified of important items
- Take action without context switching

---

## 🎯 The Goal of Agentic Apps

### For End Users

**Transform work from reactive to proactive:**
- ❌ Checking email constantly → ✅ AI triages and surfaces important items
- ❌ Manual task prioritization → ✅ AI analyzes and recommends priorities
- ❌ Remembering to send reports → ✅ Automated generation and delivery
- ❌ 10 separate tools and logins → ✅ One unified dashboard

**The promise**: Automation that respects your time and preferences.

### For Organizations

- **Consistency**: Every team member has AI-powered assistance
- **Efficiency**: Routine tasks handled automatically
- **Scalability**: Add more apps as needs grow
- **Control**: Central management and governance

### For Developers (That's You!)

Build applications that:
- **Reach users instantly** through the Clarity Marketplace
- **Integrate seamlessly** with the Clarity ecosystem
- **Scale automatically** with platform infrastructure
- **Generate revenue** through the marketplace

---

## 🛠️ About This Template

This template helps you **build agentic apps for Clarity Platform**. It provides everything you need:

### What You Get

- 🤖 **SDK for defining AI agents** - Simple decorator-based API
- 🔄 **Workflow orchestration** - Chain agents in any pattern
- ⏰ **User-configurable triggers** - Let users set their own schedules
- 🎨 **Widget components** - Pre-built UI for dashboard integration
- 🔒 **Security & multi-tenancy** - Built-in user isolation
- 🚀 **Auto-discovery** - No manual registration needed
- 📦 **One-command deployment** - Start coding immediately

### The Key Innovation

**You define templates, users create instances:**

```python
# You write this once:
@trigger_template(
    id="daily-review",
    name="Daily Task Review",
    config_fields=[
        {"key": "time", "label": "What time?", "type": "time"},
        {"key": "timezone", "label": "Your timezone", "type": "timezone"}
    ]
)
class DailyReview:
    pass

# Sarah (New York) creates: 9:00 AM EST
# John (San Francisco) creates: 6:00 PM PST
# Maria (London) creates: 7:30 AM GMT

# System schedules all three automatically!
```

**Same app, personalized for every user.**

---

## ⚡ Quick Start for Developers

### One-Command Setup

```bash
git clone https://github.com/Clarittyai/agentic-app-seed.git
cd agentic-app-seed
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
./start.sh  # Mac/Linux or start.bat for Windows
```

**That's it!** 🎉
- 📖 Frontend: http://localhost:3200
- 🔧 Backend API: http://localhost:8000
- 📚 API Docs: http://localhost:8000/docs

### Build Your First Agent (3 Steps)

#### 1. Create Agent File

`backend/agents/task_analyzer.py`:

```python
from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

@agent(
    id="task-analyzer",
    name="Task Analyzer",
    description="Analyzes tasks and provides insights"
)
class TaskAnalyzer(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        task = context.get_input("task_description")

        # Use Claude AI to analyze
        analysis = await self.analyze_with_ai(task)

        return AgentResult(
            success=True,
            data={
                "priority": analysis.priority,
                "estimated_hours": analysis.time_estimate,
                "insights": analysis.recommendations
            }
        )
```

#### 2. That's It!

**No registration needed.** The auto-discovery system finds your agent automatically.

#### 3. Test It

```bash
curl -X POST http://localhost:8000/api/agents/task-analyzer/execute \
  -H "Authorization: Bearer test-user" \
  -d '{"task_description": "Prepare Q1 budget review"}'

# Response:
# {
#   "success": true,
#   "data": {
#     "priority": "high",
#     "estimated_hours": 3.5,
#     "insights": "Strategic task requiring executive attention..."
#   }
# }
```

---

## 📖 Complete Documentation

### Start Here
- **[Understanding Clarity Platform](docs/CLARITY_PLATFORM.md)** - Complete ecosystem guide
  - What Clarity is and why it exists
  - How agentic apps work
  - User and developer journeys
  - Hosting and deployment model

### Build Your App
- **[Usage Guide](docs/GUIDE.md)** - Building agents, workflows, and triggers
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Technical deep dive
- **[API Reference](docs/API.md)** - Complete endpoint documentation

### Deploy to Marketplace
- **[Submission Requirements](docs/SUBMISSION_REQUIREMENTS.md)** - How to submit your app
- **[AI Assistant Guide](CLAUDE.md)** - For AI assistants working with this code

---

## 🎨 Building for the Widget-First Model

Apps on Clarity are accessed primarily through widgets, not standalone pages.

### Why Widgets?

**Traditional apps**: Users must remember to open them
**Widget apps**: Always visible on dashboard, impossible to forget

### Two Widget Sizes

**Small (300×150px)** - Quick status check
```typescript
// Shows essential metrics
<div>Active: {triggers}</div>
<div>Success: {rate}%</div>
```

**Large (600×400px)** - Actionable detail
```typescript
// Shows recent activity, actions
<Stats {...data} />
<RecentActivity items={items} />
<QuickActions />
```

**[See widget design guide →](docs/ARCHITECTURE.md#widget-first-design)**

---

## 🚀 What You Can Build

Real applications developers have built with this template:

### Productivity Apps
- **AI Task Manager** - Automatically prioritize and schedule tasks
- **Email Assistant** - Triage inbox and draft responses
- **Meeting Summarizer** - Generate summaries and action items

### Business Apps
- **CRM Assistant** - Lead scoring and follow-up automation
- **Customer Support AI** - Ticket analysis and response drafting
- **Report Generator** - Automated weekly/monthly reports

### Content & Marketing
- **Content Pipeline** - Research, write, edit, publish flow
- **Social Media Manager** - Scheduled posting and engagement tracking
- **SEO Analyzer** - Content optimization and keyword research

### Data & Analytics
- **Analytics Dashboard** - Automated data analysis and insights
- **Alert Monitor** - Track metrics and notify on anomalies
- **Data Pipeline** - ETL and transformation workflows

**[See more examples →](docs/GUIDE.md#example-applications)**

---

## 💡 Why Build on Clarity?

### For Developers

**Before Clarity:**
- Build full auth system ❌
- Set up hosting infrastructure ❌
- Handle scaling and monitoring ❌
- Market and acquire users ❌
- No clear monetization path ❌

**With Clarity:**
- Auth handled by platform ✅
- Infrastructure provided ✅
- Auto-scaling included ✅
- Instant access to users ✅
- Built-in marketplace revenue ✅

**Focus on what matters**: Building great AI agents and workflows.

### For Users

**Before Clarity:**
- 10 different AI tools ❌
- 10 different logins ❌
- No integration between tools ❌
- Constant context switching ❌
- Manual scheduling for everything ❌

**With Clarity:**
- One unified dashboard ✅
- Single sign-on ✅
- Apps work together ✅
- Stay in one place ✅
- Set your schedule once ✅

**The promise**: Powerful automation that's actually easy to use.

---

## 🏗️ Architecture Overview

### Two-Part Structure

```
clarity-agentic-app-seed/
├── clarity_sdk/          # SDK for defining agents/workflows/triggers
├── backend/              # FastAPI server (your business logic)
│   ├── agents/           # Your AI agents
│   ├── workflows/        # Your workflow definitions
│   ├── triggers/         # Your trigger templates
│   └── infrastructure/   # Auto-discovery (don't touch)
├── frontend/             # React UI with widgets
└── docker-compose.yml    # One-command startup
```

### Technology Stack

- **AI**: Anthropic Claude + LangChain
- **Backend**: Python, FastAPI, PostgreSQL
- **Frontend**: React, TypeScript, Tailwind CSS
- **Deployment**: Docker containers on Clarity infrastructure

**[Full architecture documentation →](docs/ARCHITECTURE.md)**

---

## 📊 Key Features

### For Developers
- ✅ **Zero Configuration** - Auto-discovery, no setup
- ✅ **One Command Start** - `./start.sh` and you're coding
- ✅ **Type-Safe** - Full TypeScript and Pydantic validation
- ✅ **Hot Reload** - Changes reflect immediately
- ✅ **Comprehensive Examples** - Learn by example

### For End Users
- ✅ **Personalized Scheduling** - Set your own times
- ✅ **Widget Dashboard** - See everything at a glance
- ✅ **Execution History** - Track what happened when
- ✅ **Beautiful Interface** - Modern, intuitive design

---

## 🧪 Testing Your App

```bash
# Health check
curl http://localhost:8000/health

# List agents
curl http://localhost:8000/api/agents

# Execute workflow
curl -X POST http://localhost:8000/api/workflows/my-workflow/execute \
  -H "Authorization: Bearer test-user"

# Run validation
cd backend && python validate_startup.py
```

**[Complete testing guide →](docs/GUIDE.md#testing)**

---

## 🤝 Contributing

This is a **template repository**. Fork it and make it your own!

- Found a bug? Open an issue
- Have a suggestion? Submit a PR
- Need help? Check the docs or ask in discussions

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Built With

- [Anthropic Claude](https://www.anthropic.com/) - AI reasoning and generation
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Docker](https://www.docker.com/) - Containerization

---

## 🌟 Join the Clarity Ecosystem

**Build apps that:**
- Help users reclaim their time
- Integrate AI into daily workflows
- Respect user autonomy and preferences
- Scale to serve thousands of users

**Start building today:**

```bash
git clone https://github.com/Clarittyai/agentic-app-seed.git
cd agentic-app-seed
./start.sh
```

**Welcome to the future of work automation.** 🚀

---

**Built with ❤️ by the Clarity team**

**[Get Started →](#-quick-start-for-developers)** | **[Read Full Guide →](docs/CLARITY_PLATFORM.md)** | **[View API Docs →](docs/API.md)**
