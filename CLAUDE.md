# CLAUDE.MD - AI Assistant Guide for Agentic App Development

**For AI assistants working with developers on the Claritty Platform**

---

## 🎯 Repository Purpose

This is a **minimal template repository** for developers building agentic apps that deploy to Claritty Platform.

**Target users**: Anyone with an idea for an agentic app (not just experienced developers)

**Developer workflow**:
```
1. Clone this repo
2. Open in Claude Code
3. Brainstorm app idea with AI (/superpowers:brainstorming)
4. Implement agents/workflows/triggers following minimal examples
5. Deploy to Claritty Platform (one click)
```

**Your role as AI assistant**: Help developers transform ideas into production-ready agentic apps with minimal friction.

---

## 📖 Quick Navigation

- [Claude Code Workflow](#-claude-code-workflow) - Start here for brainstorming
- [File Structure](#-lean-file-structure) - What to touch, what to avoid
- [Platform Integration](#-platform-integration-critical) - Claritty-specific rules
- [Common Tasks](#-common-tasks-quick-reference) - Task-based index
- [Best Practices](#-best-practices-for-ai-assistants) - DO/DON'T/WARN patterns
- [Examples](#-minimal-examples) - Code patterns to follow
- [Related Documentation](#-documentation-index) - External references

---

## 🤖 Claude Code Workflow

### Step 1: Brainstorming (ALWAYS START HERE)

When a developer opens this template, **immediately suggest**:

```
Let's brainstorm your agentic app idea! Run:

/superpowers:brainstorming
```

**Ask these questions:**
1. **Problem**: What problem does your app solve?
2. **Users**: Who will use this app?
3. **Automation**: What tasks should agents handle automatically?
4. **Schedule**: When/how often should it run? (user-configurable triggers)
5. **Widgets**: What should users see at a glance? (small: 190×190px, large: 400×190px)

**Output**: Clear design for agents, workflows, triggers, and widgets.

### Step 2: Implementation Planning

After brainstorming, create an implementation plan:

```
Based on your idea, here's the implementation plan:

Phase 1: Core Agent
- Create `backend/agents/[name]_agent.py`
- Implement core AI logic with Claude
- Test via API

Phase 2: Workflow
- Create `backend/workflows/[name]_workflow.py`
- Chain agents together
- Test execution

Phase 3: Triggers
- Create `backend/triggers/[name]_triggers.py`
- Define user-configurable templates
- Test trigger creation UI

Phase 4: Widgets
- Update `frontend/src/components/Widget.tsx`
- Implement small (190×190px) and large (400×190px) views
- Test widget endpoint performance

Phase 5: Testing & Deployment
- Test locally (docker-compose up)
- Push to GitHub
- Submit to Claritty Platform
```

### Step 3: Iterative Development

Use superpowers skills throughout:
- `/superpowers:test-driven-development` - Write tests first
- `/superpowers:systematic-debugging` - Debug issues
- `/superpowers:requesting-code-review` - Review before deployment

---

## 📂 Lean File Structure

### ✅ Files You WILL Modify Often

```
backend/
├── agents/
│   ├── __init__.py              # Register agents here
│   └── example_agent.py         # ONE minimal example (replace with yours)
│
├── workflows/
│   ├── __init__.py              # Register workflows here
│   └── example_workflow.py      # ONE minimal example (replace with yours)
│
├── triggers/
│   ├── __init__.py              # Register triggers here
│   └── example_trigger.py       # ONE minimal template (replace with yours)
│
frontend/src/
├── components/
│   └── Widget.tsx               # 2 widget sizes (small/large) - customize this
│
└── pages/
    └── Dashboard.tsx            # Full app interface (optional)
```

### ⚠️ Files You SHOULD NOT Modify (Platform-Controlled)

```
Dockerfile                       # Platform generates production Dockerfile
docker-compose.yml               # Platform manages port allocation
frontend/nginx.conf              # Required /api/ proxy for monolithic container
frontend/src/lib/api.ts          # Must use relative URLs (VITE_API_URL='')
backend/infrastructure/          # Auto-discovery system (platform-managed)
```

**Why?** Platform uses:
- ECR Public Gallery base images (not Docker Hub)
- Resilient package installation (`npm install --no-audit --no-fund --prefer-offline`)
- Dynamic port allocation for multi-tenancy
- Health endpoint injection

**📚 See**: `INFRASTRUCTURE.md` and `claritty-core/INFRASTRUCTURE.md` for details

### 📋 Core Infrastructure Files (Don't Touch Unless You Know Why)

```
backend/
├── main.py                      # Core FastAPI app (extend with routes)
├── database.py                  # Database configuration
├── models.py                    # Database models
└── config.py                    # Configuration management
```

---

## 🏗️ Platform Integration (CRITICAL)

### What Claritty Platform Controls

1. **Docker Image Generation**
   - Platform auto-generates Dockerfile during validation
   - Uses ECR Public Gallery base images (`public.ecr.aws/docker/library/*`)
   - Resilient package installation (handles lockfile mismatches)
   - Health endpoints baked in

2. **Environment Variables (Auto-Injected)**
   - `DATABASE_URL` - PostgreSQL connection (platform-configured)
   - `PORT` - Application port (dynamically assigned)
   - `CLARITY_APP_ID` - Unique app identifier
   - `CLARITY_WORKSPACE_ID` - Tenant/workspace ID (for multi-tenancy)
   - `JWT_SECRET` - JWT signing secret
   - `REDIS_URL` - Redis connection (if needed)

3. **User-Provided Variables** (Developer sets in `.env.example`)
   - `ANTHROPIC_API_KEY` - Claude API key
   - `OPENAI_API_KEY` - OpenAI API key (if needed)
   - App-specific secrets (Slack webhook, Stripe key, etc.)

4. **Widget Specifications** (EXACTLY 2 sizes, no medium!)
   - Small: **190×190px** (1:1 square) - quick status check
   - Large: **400×190px** (2.1:1 wide rectangle) - detailed view + actions
   - **NO MEDIUM SIZE EXISTS**

#### 🚫 Widget Must Be Window-Size Invariant (Hard Rule)

The Widget surface (`frontend/src/components/Widget.tsx` and `frontend/src/pages/WidgetPage.tsx`) MUST look **identical at every viewport size — mobile, tablet, desktop, embedded iframe**. The widget is a fixed-frame surface (190×190 or 400×190). Its appearance is controlled **only by the `size` prop** (small / large), never by the browser window.

**Forbidden inside `Widget.tsx` and `WidgetPage.tsx`:**
- Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- CSS `@media` rules targeting widget classes
- `useBreakpoint()`, `useMediaQuery()`, `window.innerWidth`, `window.matchMedia`, `ResizeObserver`
- Any conditional that swaps the `size` prop based on viewport

**Allowed:** the `size === 'small'` vs `size === 'large'` branches — those are driven by the marketplace host, not by the browser window.

**Scope:** this rule applies **only to the Widget surface**. Full app pages (Dashboard, settings, modals, etc.) remain free to use breakpoints for their own layouts.

**Why:** the widget is rendered inside the Clarity marketplace host, which gives it a fixed frame. Window-dependent styling would make the widget render differently on a mobile-hosted dashboard vs. a desktop-hosted one, breaking the Apple-HIG fixed-frame contract and failing marketplace validation.

**Verification:** this grep MUST return no matches:
```bash
grep -nE '\b(sm|md|lg|xl|2xl):|@media|useBreakpoint|window\.innerWidth|matchMedia|ResizeObserver' \
  frontend/src/components/Widget.tsx \
  frontend/src/pages/WidgetPage.tsx
```

**📚 See**: `WIDGETS.md` → "Window-Size Invariance (Hard Rule)" for the full design rationale.

5. **Multi-Tenancy**
   - All database queries MUST filter by `CLARITY_WORKSPACE_ID`
   - User isolation enforced at platform level
   - Never query across workspaces

### Your Dockerfile vs Platform Dockerfile

**Your Dockerfile** (this repo):
- Uses Docker Hub images for local development convenience
- Basic setup for testing locally

**Platform Dockerfile** (auto-generated):
- Uses ECR Public Gallery (`public.ecr.aws/docker/library/*`)
- Resilient npm install with `--no-audit --no-fund --prefer-offline`
- Health endpoints baked in
- Platform environment variables injected

**Why different?** Platform ensures consistency, avoids Docker Hub rate limits, handles lockfile integrity issues.

**📚 See**: `claritty-core/INFRASTRUCTURE.md` for complete platform infrastructure guide

---

## 🎯 Common Tasks (Quick Reference)

### Task 1: Add a New Agent

**Steps:**
1. Create `backend/agents/my_agent.py`:
```python
from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

@agent(
    id="my-agent",
    name="My Agent",
    description="Does something useful",
    inputs={"task": {"type": "string", "required": True}},
    outputs={"result": {"type": "string"}}
)
class MyAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        task = context.get_input("task")

        # Your AI logic here (use Claude, process data, etc.)
        result = f"Processed: {task}"

        return AgentResult(
            success=True,
            data={"result": result}
        )
```

2. Register in `backend/agents/__init__.py`:
```python
from backend.agents.my_agent import MyAgent
__all__ = ["MyAgent", ...]  # Add to list
```

3. Restart backend - done!

**📚 See**: `backend/agents/example_agent.py` for complete minimal example

### Task 2: Add a New Workflow

**Steps:**
1. Create `backend/workflows/my_workflow.py`:
```python
from clarity_sdk import workflow, uses_agent, ExecutionMode

@workflow(
    id="my-workflow",
    name="My Workflow",
    description="Chains agents together",
    execution_mode=ExecutionMode.SEQUENTIAL  # or PARALLEL, DAG
)
@uses_agent("agent-1", output_key="step1")
@uses_agent("agent-2", input_from="step1", output_key="step2")
async def my_workflow(context):
    """Workflow automatically chains agents"""
    pass  # Execution handled by decorator
```

2. Register in `backend/workflows/__init__.py`

3. Test via API or frontend

**📚 See**: `backend/workflows/example_workflow.py` for complete example

### Task 3: Add a User-Configurable Trigger

**Steps:**
1. Create `backend/triggers/my_trigger.py`:
```python
from clarity_sdk import trigger_template, TriggerTemplateType

@trigger_template(
    id="my-trigger",
    name="My Daily Trigger",
    description="User configures when this runs daily",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="my-workflow",  # Links to your workflow
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
    pass  # Just a template, platform handles execution
```

2. Register in `backend/triggers/__init__.py`

3. Frontend automatically generates configuration UI!

**📚 See**: `backend/triggers/example_trigger.py` for complete example

### Task 4: Customize Widgets

**Steps:**
1. Update `frontend/src/components/Widget.tsx`:
```typescript
interface WidgetProps {
  size?: 'small' | 'large';  // ONLY 2 sizes, no 'medium'
}

export default function Widget({ size = 'large' }: WidgetProps) {
  const { data } = useQuery(['widget', size], () =>
    api.getWidgetData(size)
  );

  if (size === 'small') {
    // Small widget: 190×190px - quick status check
    return (
      <div className="widget-small">
        <h3>{data.appName}</h3>
        <div className="metrics">
          <span>Active: {data.activeTriggers}</span>
          <span>Success: {data.successRate}%</span>
        </div>
      </div>
    );
  }

  // Large widget: 400×190px - detailed view + actions
  return (
    <div className="widget-large">
      <h3>{data.appName}</h3>
      <div className="recent-activity">
        {data.recentExecutions.map(exec => (
          <ExecutionItem key={exec.id} {...exec} />
        ))}
      </div>
      <div className="quick-actions">
        <button onClick={() => handleAction('add-trigger')}>
          Add Trigger
        </button>
      </div>
    </div>
  );
}
```

2. Update backend widget endpoint `backend/main.py`:
```python
@app.get("/api/widget")
async def get_widget_data(
    size: str = "large",  # 'small' or 'large' only
    user_id: str = Depends(get_current_user)
):
    if size == "small":
        # Minimal data for quick glance (< 200ms response)
        return {
            "activeTriggers": get_trigger_count(user_id),
            "successRate": calculate_success_rate(user_id)
        }

    # Detailed data for large widget (< 500ms response)
    return {
        "activeTriggers": get_trigger_count(user_id),
        "totalExecutions": get_execution_count(user_id),
        "successRate": calculate_success_rate(user_id),
        "recentExecutions": get_recent_executions(user_id, limit=5),
        "alerts": get_urgent_alerts(user_id)
    }
```

**📚 See**: `WIDGETS.md` for complete widget design specifications

---

## 💡 Best Practices for AI Assistants

### ✅ DO Suggest

1. **Adding agents/workflows/triggers** following the minimal examples
2. **Customizing widgets** for the specific app idea
3. **Adding dependencies** to `requirements.txt` or `frontend/package.json`
4. **Testing locally** with `docker-compose up` before deployment
5. **Using Claude Code superpowers**:
   - `/superpowers:brainstorming` - Design phase
   - `/superpowers:test-driven-development` - Implementation
   - `/superpowers:systematic-debugging` - Debugging
   - `/superpowers:requesting-code-review` - Pre-deployment

### ❌ DON'T Suggest

1. **Modifying Dockerfile** - Platform controls this
2. **Hardcoding localhost URLs** in `frontend/src/lib/api.ts`:
   ```typescript
   // ❌ WRONG - breaks in production
   const API_BASE_URL = 'http://localhost:8000';

   // ✅ CORRECT - works everywhere
   const API_BASE_URL = import.meta.env.VITE_API_URL || '';
   ```

3. **Changing port numbers** in `docker-compose.yml`
4. **Removing /api/ proxy** from `frontend/nginx.conf`
5. **Creating 3 widget sizes** - Only small (190×190px) and large (400×190px) exist!
6. **Adding window-size media queries to the Widget** - The widget must look identical at every viewport (mobile, tablet, desktop, iframe). No `sm:`/`md:`/`lg:` prefixes, no `useBreakpoint`, no `window.innerWidth`, no `@media` rules inside `Widget.tsx` or `WidgetPage.tsx`. Responsive prefixes and breakpoint hooks belong in full app pages, not in the widget surface. See "🚫 Widget Must Be Window-Size Invariant" above.
7. **Database queries without workspace filtering**:
   ```python
   # ❌ WRONG - returns data across all tenants
   users = db.query(User).all()

   # ✅ CORRECT - filters by workspace
   workspace_id = os.getenv('CLARITY_WORKSPACE_ID')
   users = db.query(User).filter(User.workspace_id == workspace_id).all()
   ```

### ⚠️ WARN Before Suggesting

**Before suggesting modifications to these files, warn the developer:**

1. **Infrastructure files** (`Dockerfile`, `docker-compose.yml`, `nginx.conf`, `api.ts`)
   > ⚠️ **Warning**: This file is managed by Claritty Platform. Modifying it may break production deployment. See `INFRASTRUCTURE.md` for details.

2. **Port configuration changes**
   > ⚠️ **Warning**: Platform uses dynamic port allocation for multi-tenancy. Hardcoding ports will break deployment.

3. **API base URL changes**
   > ⚠️ **Warning**: Frontend MUST use relative URLs (empty string) for production. Hardcoding localhost breaks deployment.

4. **Base image changes in Dockerfile**
   > ⚠️ **Warning**: Platform uses ECR Public Gallery base images to avoid Docker Hub rate limits. Your local Dockerfile is for development only.

---

## 📚 Documentation Index

### Core Documentation (Minimal, Always Available)
- **README.md** - 5-minute quick start, core concepts
- **CLAUDE.md** (this file) - AI assistant guide
- **PLATFORM.md** - Claritty deployment guide
- **WIDGETS.md** - Widget design specifications
- **INFRASTRUCTURE.md** - Infrastructure files explanation

### Comprehensive Guides (Archived, Reference Only)
- **docs/archive/README.comprehensive.md** - Full platform explanation
- **docs/archive/DEVELOPER_GUIDE.md** - Detailed development workflow
- **docs/archive/API.md** - Complete API reference
- **docs/archive/ARCHITECTURE.md** - System architecture deep dive
- **docs/archive/FAQ.md** - Frequently asked questions
- **docs/archive/WIDGET_*.md** - Comprehensive widget guides

### Platform Documentation (External References)
- **claritty-core/INFRASTRUCTURE.md** - Platform infrastructure guide
- **claritty-core/CLAUDE.md** - Platform-level AI assistant guide

---

## 🎓 Key Concepts

### 1. Agentic Apps = AI Workers on User's Schedule

**Not** traditional apps where users do work manually.
**Are** apps where AI agents work automatically on user-defined schedules.

**Example**: Email Assistant
- **Traditional**: User opens email app, manually reads/sorts/responds
- **Agentic**: AI triages emails every 2 hours (user-configured), drafts responses, surfaces urgent items in widget

### 2. Widget-First Design

**NOT** traditional web apps where users navigate pages.
**ARE** dashboard-first apps where widgets are the primary interface.

**Reality**:
- Users see widgets 90% of the time
- Full app pages used 10% (setup, advanced features)
- Design widgets FIRST, full app SECOND

**Widget Sizes** (EXACTLY 2, no medium):
- Small: 190×190px (quick status)
- Large: 400×190px (detailed + actions)

### 3. User-Configurable Triggers

**You define templates, users create instances:**

```python
# Developer writes once:
@trigger_template(
    config_fields=[
        {"key": "time", "type": "time"},
        {"key": "timezone", "type": "timezone"}
    ]
)

# User A: 9am EST
# User B: 6pm PST
# Both run automatically!
```

**Not**: Hardcoded schedules
**Is**: User-personalized automation

---

## 🔧 Minimal Examples

### Example Agent

See `backend/agents/example_agent.py` for complete annotated example.

### Example Workflow

See `backend/workflows/example_workflow.py` for complete annotated example.

### Example Trigger

See `backend/triggers/example_trigger.py` for complete annotated example.

### Example Widget

See `frontend/src/components/Widget.tsx` for complete annotated example.

---

## 🆘 When Developers Need Help

### Common Questions & Answers

**Q: How do I add a new agent?**
A: See [Task 1: Add a New Agent](#task-1-add-a-new-agent)

**Q: Why can't I modify the Dockerfile?**
A: Platform generates production Dockerfile. See `INFRASTRUCTURE.md`

**Q: How do I test my app locally?**
A: `docker-compose up -d` then check http://localhost:8000/health

**Q: What's the deployment process?**
A: Push to GitHub → Submit to Claritty → Platform validates/builds/deploys. See `PLATFORM.md`

**Q: Why only 2 widget sizes?**
A: Platform follows Apple HIG standards (190×190px, 400×190px). No medium size exists.

**Q: How do I handle multi-tenancy?**
A: Filter all DB queries by `CLARITY_WORKSPACE_ID` environment variable.

---

## 🚀 Success Checklist

Before deployment, ensure:

- [ ] Created custom agent(s) following minimal example
- [ ] Created workflow(s) chaining agents
- [ ] Created trigger template(s) for user configuration
- [ ] Customized widget (small & large views)
- [ ] Tested locally (`docker-compose up`, curl endpoints)
- [ ] No hardcoded localhost URLs
- [ ] No infrastructure file modifications
- [ ] Multi-tenancy queries (workspace filtering)
- [ ] Widget performance (< 200ms small, < 500ms large)
- [ ] Screenshots captured (widget-small.png, widget-large.png)

---

## 🎯 Your Mission as AI Assistant

Help developers:

1. **Brainstorm** great agentic app ideas
2. **Implement** agents/workflows/triggers following best practices
3. **Avoid** platform-controlled file modifications
4. **Test** locally before deploying
5. **Deploy** successfully to Claritty Platform

**Result**: High-quality agentic apps that solve real problems and delight users!

---

**Questions?** Check [README.md](README.md) | [PLATFORM.md](PLATFORM.md) | [docs/archive/](docs/archive/)
