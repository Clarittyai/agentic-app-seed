# GitHub Copilot Instructions - Clarity Agentic App Seed

## 🚨 Infrastructure Files - PROTECTED

**CRITICAL**: The following files are managed by the Clarity Platform and MUST NOT be modified. When suggesting code, NEVER recommend changes to:

### Protected Files

1. **`docker-compose.yml`** - Port configuration and service orchestration
2. **`frontend/Dockerfile`** - Build configuration with VITE_API_URL
3. **`frontend/nginx.conf`** - Nginx reverse proxy configuration
4. **`frontend/src/lib/api.ts`** - API client base URL (only the `API_BASE_URL` constant)

### Why Protected?

This template uses **monolithic container architecture** with Nginx reverse proxy:
```
Single Container (port 3200):
  ├── Nginx (serves frontend + proxies /api/*)
  └── FastAPI (port 8000, accessible via localhost)
  Managed by supervisord
```

**Key requirement**: MUST use relative URLs (empty VITE_API_URL) for production deployment on the Clarity Platform. Required for single-container ECS deployment.

## ❌ NEVER Suggest These Patterns

### 1. Hardcoded Localhost URLs
```typescript
// ❌ WRONG - breaks production
const API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = 'http://localhost:8001';

// ✅ CORRECT - works everywhere
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
```

### 2. Removing Nginx /api/ Proxy
```nginx
# ❌ WRONG - breaks API communication
location / {
    try_files $uri $uri/ /index.html;
}

# ✅ CORRECT - keeps proxy block (same container)
location /api/ {
    proxy_pass http://localhost:8000;
    # ... headers
}
location / {
    try_files $uri $uri/ /index.html;
}
```

### 3. Hardcoded Ports in docker-compose.yml
```yaml
# ❌ WRONG - conflicts with platform
ports:
  - "8000:8000"  # Hardcoded

# ✅ CORRECT - uses environment variables
ports:
  - "${BACKEND_PORT:-8000}:${BACKEND_INTERNAL_PORT:-8000}"
```

### 4. Setting VITE_API_URL to Localhost in Dockerfile
```dockerfile
# ❌ WRONG - breaks production
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=http://localhost:8001

# ✅ CORRECT - empty for relative URLs
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
```

## ✅ Safe Suggestions

You CAN suggest changes to:

### In `docker-compose.yml`:
- Adding environment variables for app-specific configuration
- Adjusting resource limits (memory, CPU)
- Adding volumes for data persistence
- Adding new services (but keep existing port patterns)

### In `frontend/nginx.conf`:
- Adding new `location` blocks for custom routes
- Adjusting cache settings for static assets
- Adding custom headers (preserving /api/ proxy)

### In `frontend/src/lib/api.ts`:
- Adding new API client methods
- Customizing request/response interceptors
- Adding authentication logic
- **NOT** changing the `API_BASE_URL` constant

### In `frontend/Dockerfile`:
- Changing Node version
- Adding build optimizations
- Installing additional dependencies
- **NOT** changing `VITE_API_URL` ARG/ENV

## 🎯 Widget Development Rules

**CRITICAL**: Platform supports EXACTLY two widget sizes (Apple HIG):
- **Small**: 190×190px (1:1 square)
- **Large**: 400×190px (2.1:1 wide rectangle)
- **NO MEDIUM SIZE**

### Widget Implementation Pattern

```typescript
// ✅ CORRECT - only two sizes
interface WidgetProps {
  size?: 'small' | 'large';  // Never 'small' | 'medium' | 'large'
}

export default function Widget({ size = 'large' }: WidgetProps) {
  if (size === 'small') {
    return <SmallWidgetView />;  // 190×190px
  }
  return <LargeWidgetView />;    // 400×190px
}
```

### Backend Widget Endpoint

```python
@app.get("/api/widget")
async def get_widget_data(
    size: str = "large",  # Only "small" or "large"
    user_id: str = Depends(get_current_user)
):
    if size == "small":
        # Minimal data for 190×190px widget
        return {"active_triggers": 5, "success_rate": "95%"}
    else:  # large (not elif)
        # Full data for 400×190px widget
        return {
            "active_triggers": 5,
            "total_executions": 42,
            "recent_executions": [...]
        }
```

## 🏗️ Project Architecture

### Directory Structure

Focus development on these areas:

```
clarity-agentic-app-seed/
├── backend/
│   ├── agents/          ✅ Add your AI agents here
│   ├── workflows/       ✅ Add your workflows here
│   ├── triggers/        ✅ Add your trigger templates here
│   ├── main.py          ✅ Add API endpoints here
│   └── models.py        ✅ Add database models here
├── frontend/
│   ├── src/
│   │   ├── components/  ✅ Add React components here
│   │   ├── pages/       ✅ Add React pages here
│   │   └── lib/api.ts   ⚠️ Add API methods (NOT base URL)
│   ├── Dockerfile       🚫 DO NOT MODIFY
│   └── nginx.conf       🚫 DO NOT MODIFY (except adding locations)
└── docker-compose.yml   🚫 DO NOT MODIFY (except env vars)
```

### Monolithic Container Pattern

The Clarity Platform deploys ONLY ONE container per app. This template provides:
- Root `Dockerfile` that combines frontend + backend
- Supervisord to run both Nginx and FastAPI in same container
- Nginx proxies `/api/*` to `localhost:8000` (not `backend:8000`)

**DO NOT**:
- Separate into multiple Dockerfiles
- Use Docker Compose multi-service pattern in production
- Proxy to `backend:8000` (use `localhost:8000`)

### Required Patterns

#### 1. All Agents Use Decorators
```python
from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

@agent(
    id="my-agent",
    name="My Agent",
    description="What it does",
    inputs={"input": {"type": "string", "required": True}},
    outputs={"output": {"type": "string"}}
)
class MyAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        # Implementation
        return AgentResult(success=True, data={"output": result})
```

#### 2. All Execute Methods Are Async
```python
# ✅ CORRECT
async def execute(self, context: AgentContext) -> AgentResult:
    return result

# ❌ WRONG
def execute(self, context):  # Not async
    return result
```

#### 3. All Components Must Be Registered
```python
# backend/agents/__init__.py
from backend.agents.my_agent import MyAgent
__all__ = ["MyAgent", "OtherAgent"]  # Add to __all__
```

#### 4. User-Configurable Triggers (Not Hardcoded)
```python
# ❌ WRONG - hardcoded schedule
@cron("0 9 * * *")
def daily_task():
    pass

# ✅ CORRECT - user-configurable
@trigger_template(
    id="daily-task",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="my-workflow",
    config_fields=[
        {"key": "time", "label": "What time?", "type": "time", "required": True},
        {"key": "timezone", "label": "Timezone", "type": "timezone", "required": True}
    ]
)
class DailyTaskTrigger:
    pass
```

## 📚 When Developer Needs Help

If developer asks about modifying protected files:

1. **STOP** and warn them:
   > ⚠️ **Warning**: This file is managed by the Clarity Platform. Modifying it may break production deployment. See `INFRASTRUCTURE.md` for details.

2. **DIRECT** them to:
   - `INFRASTRUCTURE.md` - Complete infrastructure guide
   - `README.md` - Quick reference
   - `CLAUDE.md` - Comprehensive AI assistant guide

3. **EXPLAIN** why the file is protected (multi-service architecture, dynamic ports, relative URLs)

4. **SUGGEST** alternatives that don't require modifying protected files

## 🎓 Code Suggestion Guidelines

### DO Suggest:
- ✅ New agents in `backend/agents/`
- ✅ New workflows in `backend/workflows/`
- ✅ New trigger templates in `backend/triggers/`
- ✅ New React components in `frontend/src/components/`
- ✅ New API methods in `frontend/src/lib/api.ts`
- ✅ Environment variables for app logic
- ✅ Widget implementations (2 sizes: 190×190px, 400×190px)

### DON'T Suggest:
- ❌ Hardcoded localhost URLs
- ❌ Changing `API_BASE_URL` in `api.ts`
- ❌ Removing `/api/` proxy from `nginx.conf`
- ❌ Hardcoded ports in `docker-compose.yml`
- ❌ Setting `VITE_API_URL` to localhost in `Dockerfile`
- ❌ Three widget sizes (no medium!)

## 🚀 Summary for AI Code Suggestions

**Focus development on**:
- AI agents, workflows, and triggers
- React components and pages
- Database models and API endpoints
- Widget implementations (2 sizes only!)

**Protect from modification**:
- Infrastructure files (docker-compose, Dockerfile, nginx.conf)
- API base URL configuration
- Port mappings and VITE_API_URL settings

**Key principles**:
- Use relative URLs (empty VITE_API_URL)
- Use environment variables for ports
- Keep /api/ proxy in nginx.conf
- Only 2 widget sizes: 190×190px (small) and 400×190px (large)
- Always use decorators and async patterns
- Always register new components in __init__.py

**When in doubt**: Direct developer to `INFRASTRUCTURE.md` for detailed explanations.
