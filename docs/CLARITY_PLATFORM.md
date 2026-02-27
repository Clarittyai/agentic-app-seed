# Understanding Clarity Platform

**A comprehensive guide to the Clarity ecosystem, agentic apps, and how everything works together**

---

## Table of Contents

1. [What is Clarity Platform?](#what-is-clarity-platform)
2. [Understanding Agentic Apps](#understanding-agentic-apps)
3. [How Apps Work on Clarity](#how-apps-work-on-clarity)
4. [Hosting & Deployment Model](#hosting--deployment-model)
5. [The User Journey](#the-user-journey)
6. [The Developer Journey](#the-developer-journey)
7. [Why This Matters](#why-this-matters)

---

## What is Clarity Platform?

### The Vision

Imagine a world where AI doesn't just answer questions—it **acts** on your behalf. Where your daily tasks don't require manual intervention because intelligent agents handle them automatically. Where you control **when** and **how** these AI agents work, not the developers.

**That's Clarity.**

### What Clarity Actually Is

Clarity is an **AI-native application platform** and **marketplace** where:

- **End Users** discover and use AI-powered applications through a unified dashboard
- **Developers** build "agentic apps" that run workflows with AI agents
- **Everyone** benefits from intelligent automation without complexity

Think of it as:
- **Like an App Store** - Users browse, install, and use apps
- **But for AI Agents** - Apps contain AI agents that perform tasks
- **With User Control** - Users decide when workflows run, not developers
- **Via a Dashboard** - Apps appear as widgets, not standalone websites

### The Core Problem Clarity Solves

**Traditional AI Tools:**
```
❌ Standalone websites with separate logins
❌ Developers hardcode when things happen
❌ No integration between tools
❌ Users have to remember to use them
❌ Each tool is a separate system
```

**Clarity's Approach:**
```
✅ One unified dashboard with all your apps
✅ Users control trigger schedules (9am EST vs 6pm PST)
✅ Apps work together in your Clarity workspace
✅ Widgets show status without opening apps
✅ Everything in one place, one login
```

### Who Uses Clarity?

**End Users** (Knowledge Workers, Professionals):
- Install apps from the marketplace to automate their work
- Configure when workflows should run (morning standup, end-of-day review, etc.)
- Interact primarily through widgets on their dashboard
- Control all automations from one place

**Developers** (You!):
- Build agentic apps using this template
- Define AI agents, workflows, and trigger templates
- Submit apps to the Clarity Marketplace
- Earn revenue (optional) while helping users automate their work

---

## Understanding Agentic Apps

### What is an "Agentic App"?

An **agentic app** is fundamentally different from traditional applications:

**Traditional App:**
```
User → Opens app → Performs action → Gets result → Closes app
```

**Agentic App:**
```
User → Configures triggers once → App runs automatically → User reviews results in widget
```

### The Three Core Components

Every agentic app has three layers:

#### 1. **Agents** - The Workers

Agents are AI-powered components that perform specific tasks.

**Example**: A "Task Analyzer" agent that:
- Takes a task description as input
- Uses Claude AI to analyze complexity, priority, and time estimate
- Returns structured insights

**Think of agents as**: Specialized employees in a company. Each has expertise in one area.

```python
# An agent is just a Python class with an execute method
@agent(id="task-analyzer")
class TaskAnalyzer(BaseAgent):
    async def execute(self, context):
        # Use AI to analyze the task
        # Return insights
```

#### 2. **Workflows** - The Process

Workflows chain multiple agents together to accomplish complex goals.

**Example**: A "Daily Review" workflow that:
1. **Analyze** all tasks for the day (Agent 1)
2. **Prioritize** them by importance (Agent 2)
3. **Generate** a summary email (Agent 3)
4. **Send** the email to the user (Agent 4)

**Think of workflows as**: Business processes. Multiple specialists work together to complete a job.

```python
# A workflow is a sequence of agents
@workflow(execution_mode=SEQUENTIAL)
@uses_agent("task-analyzer")
@uses_agent("prioritizer")
@uses_agent("email-composer")
async def daily_review_workflow(context):
    # Agents execute in order, passing data between them
```

#### 3. **Triggers** - The Schedule

Triggers let **users** decide when workflows run. This is the key innovation.

**Example**: A "Daily Review" trigger template that asks users:
- "What time should this run?" → User enters "9:00 AM"
- "What timezone are you in?" → User selects "America/New_York"
- "How many days back to review?" → User enters "1"

**Think of triggers as**: A customizable alarm clock for workflows.

```python
# Developer defines the template
@trigger_template(
    workflow_id="daily-review",
    config_fields=[
        {"key": "time", "type": "time"},
        {"key": "timezone", "type": "timezone"}
    ]
)
class DailyReviewTrigger:
    pass

# User creates their instance:
# Name: "My Morning Review"
# Time: 9:00 AM
# Timezone: America/New_York

# System automatically schedules it!
```

### Why "Agentic"?

The term "agentic" emphasizes **autonomy**:

- **Agents** act independently with AI reasoning
- **Users** have agency to control scheduling
- **System** operates autonomously once configured

It's the opposite of "on-demand" where users must manually trigger every action.

### Real-World Example

**Scenario**: You want to stay on top of your emails without checking constantly.

**Traditional App Approach:**
1. Open email app
2. Manually scan for important messages
3. Decide what to respond to
4. Repeat multiple times per day

**Agentic App Approach:**
1. Install "Email Assistant" from Clarity Marketplace
2. Configure trigger: "Check every 2 hours between 9 AM - 5 PM on weekdays"
3. Widget shows: "3 important emails, 1 urgent, 12 can wait"
4. Click widget to see summaries and suggested responses
5. Review and send with one click

**Result**: You're aware of important emails without constantly checking. The agent works for you on your schedule.

---

## How Apps Work on Clarity

### The Widget-First Model

This is **critical** to understand: Apps on Clarity are accessed primarily through widgets, not standalone web pages.

#### Traditional Web App Model:
```
User types URL → Full page loads → User interacts → User closes tab
```

#### Clarity App Model:
```
User sees widget on dashboard → Widget shows key info → User clicks if needed → Full app opens (optional)
```

### The Three Interaction Surfaces

#### 1. **Small Widget** (300×150px)

The "at-a-glance" view:
```
┌─────────────────────┐
│  Email Assistant    │
│  ──────────────────  │
│  ✉️  3 important     │
│  🚨 1 urgent         │
│  ✅ 95% handled      │
└─────────────────────┘
```

**Purpose**: Quick status check without interrupting flow
**Data**: Minimal - just the most critical metrics
**Use Case**: Dashboard scanning

#### 2. **Large Widget** (600×400px)

The "detailed preview" view:
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

**Purpose**: Enough detail to act on most things
**Data**: Recent activity, actionable items
**Use Case**: Primary interaction surface

#### 3. **Full App** (Full Page)

The "advanced features" view:
- Detailed configuration
- Historical data and analytics
- Complex workflows
- Settings and preferences

**Purpose**: Deep dives and configuration
**Data**: Everything
**Use Case**: Initial setup, troubleshooting, advanced use

### How Users Interact with Your App

**Day-to-day (95% of interactions):**
1. User opens Clarity dashboard
2. Scans widgets for updates
3. Sees important info in your large widget
4. Takes action directly from widget (if possible)
5. Closes dashboard

**Occasionally (5% of interactions):**
1. User needs to configure something
2. Clicks widget to open full app
3. Adjusts settings
4. Returns to dashboard

**The key insight**: Your widget must be **useful on its own**, not just a link to the full app.

### Multi-Tenant Architecture

Every app on Clarity serves multiple users simultaneously with complete data isolation.

**What this means:**

```
User A (Sarah):
  - Her triggers run at 9 AM EST
  - Her data is isolated
  - Her widget shows her stats

User B (John):
  - His triggers run at 6 PM PST
  - His data is separate from Sarah's
  - His widget shows his stats

Same App Instance:
  - One deployment
  - Handles both users
  - Complete isolation
  - Per-user configuration
```

**Technical Implementation:**

Every API request includes either:
- `X-User-ID` header (injected by Clarity platform)
- Bearer token with user ID

Your app filters ALL database queries by `user_id`:

```python
# ✅ Correct - filters by user
triggers = db.query(UserTrigger).filter_by(user_id=user_id).all()

# ❌ Wrong - returns data for all users (security issue!)
triggers = db.query(UserTrigger).all()
```

---

## Hosting & Deployment Model

### Where Apps Run

**Your app runs on Clarity's infrastructure**, not your own servers.

```
Developer's Computer (Development):
  ├── Docker containers locally
  └── Test with mock data

Clarity's Infrastructure (Production):
  ├── Kubernetes clusters
  ├── Auto-scaling based on load
  ├── Managed PostgreSQL databases
  ├── Load balancers
  ├── Health monitoring
  └── Automatic backups
```

### The Deployment Process

1. **Development**: Build using this template, test locally
2. **Submission**: Submit to Clarity Marketplace via GitHub
3. **Review**: Clarity team reviews code (security, quality)
4. **Approval**: App listed in marketplace
5. **Deployment**: Clarity deploys and manages infrastructure
6. **Updates**: Push updates, Clarity handles rolling deployments

### Containerization Model

Apps are deployed as **Docker containers**:

**Your Responsibilities:**
- ✅ Define agents, workflows, triggers
- ✅ Implement business logic
- ✅ Create widget endpoint
- ✅ Handle user data properly

**Clarity's Responsibilities:**
- ✅ Docker orchestration (Kubernetes)
- ✅ Database provisioning (PostgreSQL)
- ✅ Scaling up/down based on usage
- ✅ SSL certificates and networking
- ✅ Monitoring and health checks
- ✅ Backup and disaster recovery

### Resource Allocation

Each app gets:

**Minimum Resources:**
- 512 MB RAM
- 1 CPU core
- 500 MB storage
- PostgreSQL database (isolated)

**Automatic Scaling:**
- More users install → More resources allocated
- High load detected → Additional containers spin up
- Low usage → Scale down to save resources

**Rate Limits (per user):**
- 60 requests/minute for general endpoints
- 10 agent executions/minute
- 50 workflow executions/hour

### Health Monitoring

Clarity constantly monitors your app:

```python
# Your app must respond to health checks
GET /health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-02-27T10:30:00Z"
}
```

If health checks fail:
1. **First failure**: Retry after 10 seconds
2. **Second failure**: Alert Clarity operations
3. **Third failure**: Restart container
4. **Persistent failures**: Notify developer, disable app

### Security Scanning

Before deployment, Clarity scans your app for:

- **Dependency vulnerabilities**: Outdated packages with known CVEs
- **SQL injection risks**: Unsafe query construction
- **Secret leakage**: Hardcoded API keys, passwords
- **Docker security**: Base image vulnerabilities
- **CORS misconfiguration**: Overly permissive origins

**Your app must pass all checks before deployment.**

---

## The User Journey

Let's follow a real user through their entire experience with your app.

### Stage 1: Discovery

**User's Goal**: Find apps to help with task management

1. **Opens Clarity dashboard** → Sees all installed apps
2. **Clicks "Marketplace"** → Browses available apps
3. **Searches "task management"** → Finds your "AI Task Manager" app
4. **Views app page**:
   - Sees widget screenshots (small & large)
   - Reads description
   - Reviews features list
   - Checks reviews/ratings

**What catches their attention**:
- Clear widget screenshots showing real data
- Concise description of value proposition
- Specific use cases they identify with

### Stage 2: Installation

**User's Goal**: Add the app to their dashboard

1. **Clicks "Install"** button
2. **Grants permissions** (if app needs integrations like Gmail)
3. **App appears on dashboard** automatically
4. **Widget shows default state** (empty or sample data)

**What happens behind the scenes**:
- Clarity provisions database space for this user
- Your app container receives first request with user's ID
- Health check confirms app is responding
- Widget loads for the first time

### Stage 3: Configuration

**User's Goal**: Set up triggers for their workflow

1. **Clicks widget** → Opens full app
2. **Sees "Set up triggers" prompt** (first-time experience)
3. **Browses available trigger templates**:
   - Daily task review at 9 AM
   - Weekly summary on Fridays
   - Urgent task notifications
4. **Configures first trigger**:
   - Template: "Daily task review"
   - Name: "My morning review"
   - Time: 9:00 AM
   - Timezone: America/New_York
5. **Clicks "Create"** → Trigger activates immediately
6. **Returns to dashboard** → Widget now shows "1 active trigger"

**What happens behind the scenes**:
```python
# 1. User creates trigger via UI
POST /api/my/triggers
{
  "template_id": "daily-review",
  "name": "My morning review",
  "config": {"time": "09:00", "timezone": "America/New_York"}
}

# 2. Your app stores it in database
UserTriggerInstance.create(user_id="sarah-123", ...)

# 3. DynamicTriggerManager schedules it
APScheduler.add_job(
  trigger="cron",
  hour=9,
  minute=0,
  timezone="America/New_York",
  func=execute_workflow
)

# 4. Tomorrow at 9 AM, workflow runs automatically
```

### Stage 4: Daily Use

**User's Routine**: Check dashboard each morning

**9:00 AM - Trigger Fires:**
- Workflow executes automatically
- Agents analyze tasks, generate summary
- Results stored in database

**9:15 AM - User Opens Dashboard:**

Sees large widget:
```
┌──────────────────────────────────────┐
│  AI Task Manager              [⚙️]    │
│  ────────────────────────────────────  │
│  📋 Daily Review Complete             │
│  ✨ Last run: Today at 9:00 AM        │
│                                        │
│  🎯 Top Priorities Today:             │
│    1. ⚠️  Budget review (Due today)   │
│    2. 📧 Respond to client inquiry    │
│    3. 📊 Prepare weekly report        │
│                                        │
│  ⏱️  Estimated time: 3.5 hours        │
│  💡 Suggestion: Block 9:30-1pm        │
│                                        │
│  [View All Tasks]  [Adjust Schedule]  │
└──────────────────────────────────────┘
```

**User actions**:
- Sees priorities without opening full app ✅
- Gets time estimate for planning ✅
- Receives actionable suggestion ✅
- Can click through if needs detail

**Key point**: User got value without leaving dashboard.

### Stage 5: Optimization

**After 2 weeks of use**, user fine-tunes:

1. **Adjusts trigger time** → Changes 9 AM to 8:30 AM
2. **Adds second trigger** → Weekly summary on Fridays at 4 PM
3. **Configures filters** → Only high-priority tasks in widget
4. **Connects integrations** → Syncs with their calendar

**What happens behind the scenes**:
```python
# User updates trigger
PATCH /api/my/triggers/trigger-uuid
{
  "config": {"time": "08:30"}  # Changed from 09:00
}

# DynamicTriggerManager updates schedule
APScheduler.reschedule_job(
  job_id="trigger-uuid",
  trigger="cron",
  hour=8,  # Changed
  minute=30  # Changed
)

# Next day, runs at new time automatically
```

---

## The Developer Journey

Let's walk through your experience building and deploying an app.

### Stage 1: Local Development

**Your Goal**: Build a task management agentic app

1. **Clone template**: `git clone clarity-agentic-app-seed`
2. **Set up environment**: Add `ANTHROPIC_API_KEY` to `.env`
3. **Start services**: `./start.sh` → Everything runs locally
4. **Create first agent**:

```python
# backend/agents/task_analyzer.py
@agent(id="task-analyzer")
class TaskAnalyzer(BaseAgent):
    async def execute(self, context):
        task = context.get_input("task_description")

        # Use Claude AI to analyze
        analysis = await self.anthropic.analyze(task)

        return AgentResult(
            success=True,
            data={"priority": "high", "time_estimate": 2.5}
        )
```

**No registration needed!** The auto-discovery system finds it automatically.

5. **Test agent**: `curl http://localhost:8000/api/agents/task-analyzer/execute`
6. **Create workflow**: Chain multiple agents together
7. **Create trigger template**: Let users configure scheduling
8. **Test full flow**: Create trigger, wait for execution

### Stage 2: Widget Development

**Your Goal**: Create useful small & large widgets

**Small Widget** (quick glance):
```typescript
<div className="w-[300px] h-[150px]">
  <h3>Active: {data.active_triggers}</h3>
  <p>Success: {data.success_rate}%</p>
</div>
```

**Large Widget** (detailed view):
```typescript
<div className="w-[600px] h-[400px]">
  <Stats {...data.stats} />
  <RecentExecutions executions={data.recent_executions} />
  <QuickActions />
</div>
```

**Backend endpoint**:
```python
@app.get("/api/widget")
async def get_widget_data(size: str, user_id: str):
    if size == "small":
        return {
            "active_triggers": count_triggers(user_id),
            "success_rate": calculate_success_rate(user_id)
        }
    else:  # large
        return {
            "stats": get_stats(user_id),
            "recent_executions": get_executions(user_id, limit=5)
        }
```

### Stage 3: Testing

**Before submission**, verify everything works:

1. **Multi-user testing**: Create triggers for different "users", ensure data isolation
2. **Widget testing**: Verify both sizes display correctly
3. **Trigger testing**: Test all trigger types and configurations
4. **Error handling**: Test failure scenarios
5. **Performance**: Ensure fast response times
6. **Security**: No hardcoded secrets, SQL injection prevention

Run pre-flight validation:
```bash
cd backend
python validate_startup.py

# Expected:
# ✅ All environment variables configured
# ✅ All agents registered (2 found)
# ✅ All workflows registered (2 found)
# ✅ All triggers registered (3 found)
# ✅ Database connection healthy
# ✅ No security issues detected
```

### Stage 4: Submission

**Your Goal**: Get app approved for marketplace

1. **Create GitHub repository**: Push your code
2. **Add required files**:
   - `app-config.json` - Marketplace metadata
   - `README.md` - Clear documentation
   - `screenshots/widget-small.png` - Small widget with real data
   - `screenshots/widget-large.png` - Large widget with real data
   - `.env.example` - Configuration template

3. **Submit to Clarity**:
   - Fill out marketplace submission form
   - Provide GitHub repo URL
   - Write app description and use cases
   - Select category and tags

4. **Wait for review** (typically 3-5 business days)

### Stage 5: Review Process

**Clarity team checks**:

**Automated Checks** (instant):
- ✅ Docker build succeeds
- ✅ Health endpoint responds
- ✅ Widget endpoint works
- ✅ Security scan passes
- ✅ No hardcoded secrets

**Manual Review** (3-5 days):
- ✅ Code quality and best practices
- ✅ User data isolation implemented correctly
- ✅ Widget provides value (not just a link)
- ✅ Clear documentation
- ✅ Good user experience

**Common rejection reasons**:
- ❌ Poor widget design (not useful standalone)
- ❌ Missing user data isolation
- ❌ Hardcoded secrets or API keys
- ❌ Security vulnerabilities
- ❌ Poor documentation
- ❌ Misleading description

### Stage 6: Approval & Deployment

**Once approved**:

1. **App listed** in Clarity Marketplace
2. **Auto-deployed** to Clarity infrastructure
3. **Users can install** immediately
4. **You get notified** with marketplace link

### Stage 7: Maintenance

**Ongoing responsibilities**:

**Bug Fixes**:
- Users report bugs via Clarity support
- You fix in your repo
- Push to GitHub
- Clarity auto-deploys update

**Feature Updates**:
- Add new agents, workflows, or triggers
- Update version in `app-config.json`
- Submit update for review
- Users get update automatically

**Monitoring**:
- Clarity dashboard shows app health
- Error logs available for debugging
- Usage analytics (installs, active users)

---

## Why This Matters

### For End Users

**Before Clarity**:
- 10 different AI tools, 10 different logins
- Have to remember to use each tool
- No integration between tools
- Constant context switching

**With Clarity**:
- One dashboard, one login
- Apps work automatically on your schedule
- See everything at a glance via widgets
- Apps can integrate with each other

**Result**: More automation with less effort.

### For Developers

**Before Clarity**:
- Build full-stack app from scratch
- Handle user auth, databases, hosting
- Market and acquire users yourself
- No clear monetization path

**With Clarity**:
- Use template, focus on business logic
- Auth, databases, hosting provided
- Instant access to Clarity's user base
- Built-in monetization options

**Result**: Ship faster, reach more users, earn revenue.

### The Platform Effect

As more apps join Clarity:
- Users get more value (more automation)
- Network effects increase (apps integrate)
- Developers reach larger audience
- Platform becomes more valuable

This is the **platform play**: Create the infrastructure that makes it easy for developers to build valuable apps that users want.

---

## Next Steps

Now that you understand the Clarity ecosystem:

- **Start Building** → [Complete Usage Guide](GUIDE.md)
- **Technical Details** → [Architecture Documentation](ARCHITECTURE.md)
- **API Reference** → [API Documentation](API.md)
- **Submit Your App** → [Marketplace Requirements](SUBMISSION_REQUIREMENTS.md)

**Welcome to the Clarity Platform!** 🚀

We're excited to see what you build.

---

**Questions?**
- 📚 Documentation: https://docs.clarity.ai
- 💬 Developer Community: https://community.clarity.ai
- 📧 Support: developer@clarity.ai
