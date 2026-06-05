# CLAUDE.MD - AI Assistant Guide for Agentic App Development

**For AI assistants working with developers on the Claritty Platform**

---

## ⚠️ READ FIRST — this is a TEMPLATE, make the app its OWN

The #1 failure mode is shipping an app that still **looks exactly like this seed**
(same indigo palette, same template landing page, same Claritty logo, same example
agents). Swapping the backend logic is NOT enough.

Your job has two halves:
1. **KEEP** the platform contract (endpoints, SDK decorators, widget sizes, infra,
   multi-tenancy, CSS token *names*).
2. **REPLACE** the template identity completely — palette + typography
   (`frontend/src/theme.css`), the landing page (`frontend/src/pages/Dashboard.tsx`),
   the header mark (`frontend/src/components/Layout.tsx`), the app name
   (`frontend/src/lib/app-meta.ts`), and the example agent/workflow/trigger.

👉 **The full KEEP-vs-REPLACE manifest + redesign checklist is in [IDENTITY.md](IDENTITY.md). Read it before building.**

An automated **identity gate** (`scripts/check-not-template.mjs`, wired as a Claude
Code Stop hook, `npm run check:identity`, and CI) will **refuse to let the build be
"done"** while template residue remains. First thing when you start:

```bash
rm .claritty-seed-pristine   # activates the identity gate
```

---

## 🎯 Repository Purpose

This is a **minimal template repository** for developers building agentic apps that deploy to Claritty Platform.

**Target users**: Anyone with an idea for an agentic app (not just experienced developers)

**Developer workflow**:
```
1. Clone this repo
2. Open in Claude Code; run `rm .claritty-seed-pristine` to activate the identity gate
3. Brainstorm app idea AND its design identity (/superpowers:brainstorming) — see .claude/prompts/brainstorm.md
4. Give the app its own identity: theme.css palette/type, real landing page, own logo, app name (IDENTITY.md)
5. Implement agents/workflows/triggers (delete the seed examples; follow the minimal patterns)
6. Make `npm run check:identity` pass, then deploy to Claritty Platform (one click)
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
5. **Widgets**: What should users see at a glance? (small: 170×170px, medium: 360×170px, large: 360×360px)

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
- Implement small (170×170px), medium (360×170px), and large (360×360px) views
- Test widget endpoint performance

Phase 5: Testing & Hosting
- Test locally (docker compose up --build)
- Push to your repo
- Host the container anywhere (keep the required env vars)
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
│   └── Widget.tsx               # 3 widget sizes (small/medium/large) - customize this
│
├── lib/
│   └── widget-sizes.ts          # canonical widget dimensions (source of truth)
│
└── pages/
    └── Dashboard.tsx            # Full app interface (Tasks example)
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

### 📋 Infrastructure files (yours to change — test after editing)

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

2. **Environment Variables (required to run — don't delete these)**
   - `DATABASE_URL` - PostgreSQL connection (required)
   - `CLARITTY_PLATFORM_URL` + `CLARITTY_AUTH_TOKEN` - the Claritty LLM proxy
     (required for real AI; unset → the SDK calls each agent's `fallback(ctx)`, a no-AI result)
   - There is NO `CLARITY_WORKSPACE_ID` — tenancy is the `X-User-ID` header.

3. **User-Provided Variables** (Developer sets in `.env.example`)
   - NO provider API keys — AI runs through the Claritty LLM proxy
     (`CLARITTY_AUTH_TOKEN` + `CLARITTY_PLATFORM_URL`, injected by the platform;
     call models via `claritty_sdk.llm.get_llm_client`).
   - App-specific integration secrets only (Slack webhook, Stripe key, etc.)

4. **Widget Specifications** — Apple HIG 3-size standard
   - Small: **170×170px** (1:1 square) - single quick info (battery, status indicator)
   - Medium: **360×170px** (2.1:1 wide rectangle) - list views, calendar, multi-day forecast
   - Large: **360×360px** (4×4 footprint) - complex graphs, large photos, multi-step reminders

#### 🚫 Widget Must Be Window-Size Invariant (Hard Rule)

The Widget surface (`frontend/src/components/Widget.tsx` and `frontend/src/pages/WidgetPage.tsx`) MUST look **identical at every viewport size — mobile, tablet, desktop, embedded iframe**. The widget is a fixed-frame surface (170×170, 360×170, or 360×360). Its appearance is controlled **only by the `size` prop** (small / medium / large), never by the browser window.

**Forbidden inside `Widget.tsx` and `WidgetPage.tsx`:**
- Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- CSS `@media` rules targeting widget classes
- `useBreakpoint()`, `useMediaQuery()`, `window.innerWidth`, `window.matchMedia`, `ResizeObserver`
- Any conditional that swaps the `size` prop based on viewport

**⚠️ Also watch out — global CSS leaks:** any `@media` block in `index.css` (or any global stylesheet) that uses a **bare element selector** (`a`, `button`, `*`, `html`, `body`, `input`, …) silently applies to the widget too, because those selectors match elements *inside* the widget root. Real example: `@media (max-width: 920px) { button { min-height: 44px } }` inflates the widget's small signal buttons at narrow viewports and breaks the fixed frame. If such a global rule is needed for the rest of the app, **scope it away from the widget** — the widget root carries `data-widget-size="small"` or `data-widget-size="large"`, so add a reset:

```css
[data-widget-size] a, [data-widget-size] button {
  min-height: 0;
  min-width: 0;
}
```

**Allowed:** the `size === 'small'` / `size === 'medium'` / `size === 'large'` branches — those are driven by the `size` prop the host passes, not by the browser window.

**Scope:** this rule applies **only to the Widget surface**. Full app pages (Dashboard, settings, modals, etc.) remain free to use breakpoints for their own layouts.

**Why:** the widget renders inside a fixed frame at one of the three sizes. Window-dependent styling would make it render differently across host dashboards, breaking the Apple-HIG fixed-frame contract.

**Verification:** this grep MUST return no matches:
```bash
grep -nE '\b(sm|md|lg|xl|2xl):|@media|useBreakpoint|window\.innerWidth|matchMedia|ResizeObserver' \
  frontend/src/components/Widget.tsx \
  frontend/src/pages/WidgetPage.tsx
```

**📚 See**: `WIDGETS.md` → "Window-Size Invariance (Hard Rule)" for the full design rationale.

#### 🎬 Widget Button Actions (Hard Rule)

Widget buttons MUST use the action contract — `triggerDeepLink({ path })` or `runQuickAction({ actionId, run })` from `frontend/src/lib/widget-actions.ts`. Never call `useNavigate()`, `router.push()`, or `window.parent.location` from inside the widget — the widget renders in an iframe, so router navigation only changes the iframe (confusing the user), and `window.parent.location` is blocked by the sandbox.

- **Quick action**: calls the app's own API directly, widget updates in place, host gets an analytics ping.
- **Deep link**: posts a message to the host; the host opens the app modal with the iframe pointed at the given path.

**📚 See**: `WIDGETS.md` → "Widget Action Patterns" for the contract, helpers, and examples.

5. **Multi-Tenancy**
   - Get the caller with `user_id: str = Depends(require_user)` (from `backend.security`) — the edge-verified identity. NEVER read `X-User-ID` by hand and NEVER fall back to a shared default like `"test-user"` (it silently merges every user's data). Locally `require_user` returns `"dev-user"`.
   - Every user-data model has a `user_id` column; filter EVERY query by it
   - Never query across users (there is no `CLARITY_WORKSPACE_ID`)

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


## 🎯 Common Tasks (Quick Reference)

### Task 1: Add a New Agent

**Steps:**
1. Create `backend/agents/my_agent.py`:
```python
from claritty_sdk import agent, BaseAgent, AgentResult, AgentContext

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
from claritty_sdk import workflow, uses_agent, ExecutionMode

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
from claritty_sdk import trigger_template, TriggerTemplateType

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

> 🎨 **Match the golden references** before writing UI: [`docs/golden/Widget.golden.tsx`](docs/golden/Widget.golden.tsx) and [`docs/golden/Dashboard.golden.tsx`](docs/golden/Dashboard.golden.tsx) show the bar for hierarchy, theme-token discipline, and loading/empty/error states. Adapt them to your domain — don't copy. (Full rationale: `.claude/skills/agentic-app-authoring.md` → "Design & UI".)

**Steps:**
1. Update `frontend/src/components/Widget.tsx`:
```typescript
// Apple HIG 3-size standard
type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetProps {
  size?: WidgetSize;
}

export default function Widget({ size = 'medium' }: WidgetProps) {
  const { data } = useQuery(['widget', size], () =>
    api.getWidgetData(size)
  );

  // Build widgets with the Claritty UI kit — WidgetContainer owns the size,
  // glass surface, radius, padding + overflow; use WidgetButton / WidgetBadge.
  // import { WidgetContainer, WidgetButton, WidgetBadge } from '@clarittyai/widget-toolkit';

  if (size === 'small') {
    // Small 170×170 — one focal metric + (at most) one action
    return (
      <WidgetContainer size="small">
        <div className="text-4xl font-bold text-foreground">{data.activeTriggers}</div>
        <div className="text-xs text-muted-foreground">active triggers</div>
        <WidgetButton variant="primary" onClick={() => handleAction('add-trigger')}>Add</WidgetButton>
      </WidgetContainer>
    );
  }

  if (size === 'medium') {
    // Medium 360×170 — metric + a short peek
    return (
      <WidgetContainer size="medium">
        {data.recentExecutions.slice(0, 2).map(exec => (
          <ExecutionItem key={exec.id} {...exec} />
        ))}
      </WidgetContainer>
    );
  }

  // Large 360×360 — header + a short ranked list
  return (
    <WidgetContainer size="large">
      {data.recentExecutions.slice(0, 5).map(exec => (
        <ExecutionItem key={exec.id} {...exec} />
      ))}
      <WidgetButton variant="primary" onClick={() => handleAction('add-trigger')}>
        Add Trigger
      </WidgetButton>
    </WidgetContainer>
  );
}
```

2. Update backend widget endpoint `backend/main.py`:
```python
@app.get("/api/widget")
async def get_widget_data(
    size: str = "medium",  # 'small' | 'medium' | 'large'
    user_id: str = Depends(get_current_user)
):
    if size == "small":
        # Minimal data for quick glance (< 200ms response)
        return {
            "activeTriggers": get_trigger_count(user_id),
            "successRate": calculate_success_rate(user_id)
        }

    if size == "medium":
        # Medium widget: list view (< 400ms response)
        return {
            "activeTriggers": get_trigger_count(user_id),
            "successRate": calculate_success_rate(user_id),
            "recentExecutions": get_recent_executions(user_id, limit=2),
        }

    # Large widget: full detail (< 500ms response)
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
5. **Creating widgets at non-Apple dimensions** — only small (170×170px), medium (360×170px), and large (360×360px) exist!
6. **Adding window-size media queries to the Widget** - The widget must look identical at every viewport (mobile, tablet, desktop, iframe). No `sm:`/`md:`/`lg:` prefixes, no `useBreakpoint`, no `window.innerWidth`, no `@media` rules inside `Widget.tsx` or `WidgetPage.tsx`. Responsive prefixes and breakpoint hooks belong in full app pages, not in the widget surface. See "🚫 Widget Must Be Window-Size Invariant" above.
7. **Direct router navigation from widget buttons** - Never call `useNavigate()`, `router.push()`, `window.location.href = ...`, or `window.parent.location` from inside `Widget.tsx`. The widget runs in an iframe; router calls only navigate the iframe, and `window.parent.location` is sandbox-blocked. Use `triggerDeepLink({ path })` from `frontend/src/lib/widget-actions.ts` — the host catches the message and opens its app modal at the deep-link path. See "🎬 Widget Button Actions" above and `WIDGETS.md` → "Widget Action Patterns".
8. **Database queries without workspace filtering**:
   ```python
   # ❌ WRONG - returns data across all users
   users = db.query(User).all()

   # ✅ CORRECT - filters by the caller (X-User-ID header → user_id)
   users = db.query(User).filter(User.user_id == user_id).all()
   ```

### ⚠️ WARN Before Suggesting

**Before suggesting modifications to these files, warn the developer:**

1. **Provider API keys** (`ANTHROPIC_API_KEY`, importing `anthropic`/`openai`)
   > ⚠️ Call models through `claritty_sdk.llm.get_llm_client` instead — no keys.

2. **Deleting required env vars** (`DATABASE_URL`, `CLARITTY_PLATFORM_URL`, `CLARITTY_AUTH_TOKEN`)
   > ⚠️ The app won't run / won't reach the LLM without these.

3. **Hardcoded API base URLs**
   > ⚠️ Use relative URLs (empty `VITE_API_URL`) so the frontend calls `/api/...` on its own origin.

4. **Ad-hoc schema changes**
   > ⚠️ Adding a column? Write an Alembic migration — `create_all` won't ALTER an existing table, so the change silently won't apply.

---

## 📚 Documentation Index

### Core Documentation (Minimal, Always Available)
- **README.md** - 5-minute quick start, self-hosting, core concepts
- **CLAUDE.md** (this file) - AI assistant guide
- **WIDGETS.md** - Widget design specifications (3 sizes, the UI kit)
- **LLM_PROXY.md** - how agents call Claude via the Claritty SDK proxy
- **.cursorrules** - concise editing rules (single source of the canonical facts)

### Archived (historical reference only — may be out of date)
- **docs/archive/** - older comprehensive guides

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

**Widget Sizes** — Apple HIG 3-size standard:
- Small: 170×170px (quick status)
- Medium: 360×170px (list views, detailed + actions)
- Large: 360×360px (complex multi-row content)

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

**Q: Can I modify the Dockerfile / nginx?**
A: Yes — you self-host this app, so the infra is yours. Test with
`docker compose up --build` after changing it.

**Q: How do I run my app locally?**
A: `docker compose up --build` then open http://localhost:3200.

**Q: How do I deploy it?**
A: It's a normal Docker app — host it anywhere you can run the container +
Postgres. Keep `DATABASE_URL` and the `CLARITTY_*` LLM-proxy env vars set.

**Q: What widget sizes are available?**
A: Apple HIG, three sizes: small (170×170), medium (360×170), large (360×360).

**Q: How do I handle multi-tenancy?**
A: Read the caller from the `X-User-ID` header and filter every user-data query
by `Model.user_id`. There is no `CLARITY_WORKSPACE_ID`.

---

## 🧩 Build patterns that make the app actually WORK

The identity gate ensures the app doesn't *look* like the template. These patterns ensure it
*does its job* end-to-end. Apply the ones the app needs.

### External connections (if the app acts on an outside service)
If the core verb hits an external system — **post** to LinkedIn, **send** email, **charge** with
Stripe, **sync** to Notion — then generating content is only half the app. You MUST also ship a way
for the user to **connect** that service. Add it **proactively**, even if the user didn't name the
platform (infer the obvious one and confirm).
- Pattern (copy it): a **Connect page** (the platform stores creds encrypted — you store nothing) +
  the action performed through a real catalog tool (e.g. `linkedin.create_post`) reached via
  `ctx.integration(...)`. When the service isn't connected, surface a **409 / connect prompt** —
  **never simulate or fake a success**. Full guide + code: **[INTEGRATIONS.md](INTEGRATIONS.md)**.
- Locally, set `CLARITTY_FAKE_CREDS_<INTEGRATION>` (JSON) to exercise the path without OAuth.

### Approval / human-in-the-loop (AI proposes → user approves → system acts)
Many apps shouldn't act autonomously. Model a lifecycle instead of a bare boolean:
- `status`: `draft → approved → published | failed` on the domain model.
- An `/approve` endpoint that performs the action through the real tool, then flips status: a
  not-connected result → **409** (connect prompt), a real failure → **5xx** (row stays for retry),
  and only a genuine external id flips to `published`. Store `published_at` / `external_id`. Never
  swallow the error and mark it done.
- A widget **quick action** to approve the top item in place (`runQuickAction`), and a review queue
  in the UI. Don't auto-publish what a human should sign off on.

### Scheduling reality (local vs platform)
There is **no local scheduler**. `SCHEDULE_DAILY`/interval triggers only fire once the app runs on
the Claritty platform (it calls `/internal/run-due-triggers`). **Locally**, run a workflow on demand:
`POST /api/workflows/{id}/execute` (or a "generate now" button) — the widget only updates after a
run. Say this to the user so they don't wait for a schedule that won't fire locally. Still ship the
trigger template — it works on the platform.

### Definition of done (verify the value path, not just the build)
Before calling it done, confirm the app actually solves the problem end-to-end:
- the agent runs (`POST /api/agents/{id}/execute` returns data),
- the workflow persists (`POST /api/workflows/{id}/execute`),
- `GET /api/widget` returns real data and the widget renders it,
- the **real action** happens when connected (a real external id), or returns a clear
  not-connected/connect-prompt when not — never a faked success.
Capture this as one concrete success sentence in the brainstorm + `app-config.json` `core_action.definition_of_done`.

---

## 🚀 Success Checklist

Before deployment, ensure:

**Identity — the app no longer looks like the seed (enforced by `npm run check:identity`):**
- [ ] `rm .claritty-seed-pristine` done (gate active)
- [ ] `frontend/src/theme.css` filled with YOUR palette + font (`--brand-*` values)
- [ ] `frontend/src/lib/app-meta.ts` has your real `appName` + `appDescription`
- [ ] `frontend/src/pages/Dashboard.tsx` is your real landing page (template showcase removed)
- [ ] `frontend/src/components/Layout.tsx` uses your own logo/mark (not `claritty-logo.png`)
- [ ] Seed example agent/workflow/trigger deleted and replaced by your domain

**Function (the value path — see "Build patterns" above):**
- [ ] Created custom agent(s) following minimal example
- [ ] Created workflow(s) chaining agents
- [ ] Created trigger template(s) for user configuration
- [ ] Customized widget (small, medium & large views) using the UI kit
- [ ] If the app acts on an external service: a **Connect** screen + the action via a real catalog tool / `ctx.integration`, with a 409/connect-prompt when not connected — never simulated (see INTEGRATIONS.md)
- [ ] If it shouldn't act autonomously: a **draft → approve → act** lifecycle with an approve action
- [ ] `app-config.json` `core_action.definition_of_done` is filled, and that end-to-end path is verified
- [ ] The problem the app solves is delivered end-to-end (agent → workflow → widget → real action)
- [ ] Tested locally (`docker compose up --build`, curl endpoints)
- [ ] No hardcoded localhost URLs
- [ ] Multi-tenancy: every user-data query filters by `user_id` (X-User-ID)
- [ ] Schema changes via Alembic migration (not bare `create_all`)
- [ ] Required env vars kept: `DATABASE_URL`, `CLARITTY_PLATFORM_URL`, `CLARITTY_AUTH_TOKEN`

---

## 🎯 Your Mission as AI Assistant

Help developers:

1. **Brainstorm** great agentic app ideas
2. **Implement** agents/workflows/triggers following best practices
3. **Use the Claritty pieces**: AI via the SDK proxy, widgets via the UI kit
4. **Keep it working**: don't delete required env vars; migrate the schema
5. **Test** locally (`docker compose up --build`) before shipping to your host

**Result**: High-quality agentic apps that solve real problems and delight users!

---

**Questions?** Check [README.md](README.md) | [WIDGETS.md](WIDGETS.md) | [.cursorrules](.cursorrules)
