# 🚀 Deploying to Claritty Platform

**Quick deployment guide for agentic app developers**

---

## 🎯 Overview

Claritty Platform handles ALL infrastructure complexity:
- ✅ Dockerfile generation (ECR Public Gallery base images)
- ✅ nginx configuration (fullstack apps)
- ✅ Database provisioning (PostgreSQL)
- ✅ Environment variable injection
- ✅ Multi-tenant isolation
- ✅ Health checks and monitoring

**You focus on code. We handle deployment.**

---

## ⚡ Quick Deployment (3 Steps)

### Step 1: Test Locally

```bash
# Ensure everything works
docker-compose up -d

# Test endpoints
curl http://localhost:8000/health           # Health check
curl http://localhost:8000/api/widget?size=small   # Small widget
curl http://localhost:8000/api/widget?size=large   # Large widget
```

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 3: Submit to Claritty

1. Go to [Claritty Developer Portal](https://claritty.ai/developers)
2. Click **"Submit App"**
3. Paste your GitHub URL
4. Click **"Submit"**

**Done!** Platform handles validation, build, and deployment.

---

## 🔍 What Happens After Submission

### Phase 1: Validation (Automatic)

Platform runs these checks:

1. **Multi-Tenancy Validator**
   - ✅ All database queries filter by `CLARITY_WORKSPACE_ID`
   - ✅ No cross-tenant data access
   - ✅ Proper workspace isolation

2. **Widget Validator**
   - ✅ Apple HIG 3-size set (170×170px small, 360×170px medium, 360×376px large)
   - ✅ Apple HIG compliance (44px touch targets, 12px min font)
   - ✅ Performance (< 200ms small, < 400ms medium, < 500ms large)

3. **Security Scanner**
   - ✅ No OWASP vulnerabilities
   - ✅ Dependency security audit
   - ✅ SQL injection prevention

4. **Structure Validator**
   - ✅ Required files present (`package.json`, `requirements.txt`, etc.)
   - ✅ Backend and frontend structure correct
   - ✅ Database migrations valid

**If any check fails**: Platform provides detailed error report

### Phase 2: Dockerfile Generation (Automatic)

Platform auto-generates production Dockerfile:

**For Python Fullstack Apps**:
```dockerfile
# Stage 1: Build Vite Frontend
FROM public.ecr.aws/docker/library/node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund --prefer-offline
COPY frontend/ ./
RUN npm run build

# Stage 2: Python + nginx
FROM public.ecr.aws/docker/library/python:3.11-slim
# ... (platform handles the rest)
```

**Key Features**:
- ✅ ECR Public Gallery base images (no Docker Hub rate limits)
- ✅ Resilient package installation (handles lockfile mismatches)
- ✅ Multi-stage builds (frontend + backend)
- ✅ nginx.conf generated inline with `/health` endpoint
- ✅ supervisor for multi-process management

**📚 See**: `INFRASTRUCTURE.md` for complete Dockerfile generation details

### Phase 3: Build (AWS CodeBuild)

1. Platform packages your code to S3
2. CodeBuild pulls Dockerfile and source
3. Builds Docker image with cache
4. Pushes image to ECR (private container registry)

**Build time**: 2-5 minutes depending on dependencies

### Phase 4: Deployment (AWS ECS)

1. Creates multi-tenant ECS container
2. Injects platform environment variables
3. Configures ALB health checks
4. Starts container with your app

**Deployment time**: 1-3 minutes for container startup

**Your app is now live!** 🎉

---

## 🔐 Environment Variables

### Platform-Injected (Automatic)

**NEVER set these in your `.env` file**:

```bash
DATABASE_URL           # PostgreSQL connection (platform-managed)
PORT                   # Application port (dynamically assigned)
CLARITY_APP_ID         # Your unique app ID
CLARITY_WORKSPACE_ID   # Tenant/workspace identifier
JWT_SECRET             # JWT signing secret
REDIS_URL              # Redis connection (if needed)
```

### User-Provided (Required)

**Create `.env.example` with your secrets**:

```bash
# ✅ Your app-specific secrets
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
STRIPE_SECRET_KEY=sk_test_xxx

# Add any app-specific environment variables
YOUR_CUSTOM_API_KEY=xxx
YOUR_CUSTOM_SETTING=value
```

**How it works**:
1. Developer provides `.env.example` in GitHub repo
2. User installs app to their workspace
3. Platform prompts user to fill in secrets
4. Secrets are encrypted and injected at runtime

---

## 🧪 Pre-Deployment Checklist

Before submitting to Claritty Platform, verify:

### Required Files

- [ ] `backend/main.py` - FastAPI application
- [ ] `backend/requirements.txt` - Python dependencies
- [ ] `frontend/package.json` - Frontend dependencies
- [ ] `frontend/src/components/Widget.tsx` - Widget implementation
- [ ] `.env.example` - User-provided environment variables
- [ ] `README.md` - Setup instructions

### Multi-Tenancy

- [ ] All database queries filter by `CLARITY_WORKSPACE_ID`:
  ```python
  workspace_id = os.getenv('CLARITY_WORKSPACE_ID')
  users = db.query(User).filter(User.workspace_id == workspace_id).all()
  ```

### Widgets

- [ ] Apple HIG 3-size set implemented (small: 170×170px, medium: 360×170px, large: 360×376px)
- [ ] Widget endpoint responds in < 200ms (small), < 400ms (medium), < 500ms (large)
- [ ] Widgets follow Apple HIG guidelines (44px touch targets, 12px min font)

### Infrastructure Files

- [ ] **DO NOT** modify `Dockerfile` (platform controls this)
- [ ] **DO NOT** modify `docker-compose.yml` port numbers
- [ ] **DO NOT** modify `frontend/nginx.conf` API proxy
- [ ] **DO NOT** hardcode `localhost` URLs in `frontend/src/lib/api.ts`

### API Endpoints

- [ ] `/health` endpoint returns `200 OK`
- [ ] `/api/widget?size=small` works locally
- [ ] `/api/widget?size=medium` works locally
- [ ] `/api/widget?size=large` works locally

---

## 🐛 Troubleshooting

### Issue 1: Validation Fails - Multi-Tenancy

**Error**:
```
Multi-tenancy check failed: Database queries do not filter by workspace
```

**Solution**:
Ensure ALL database queries include workspace filtering:

```python
# ❌ WRONG - Returns data across all tenants
users = db.query(User).all()

# ✅ CORRECT - Filters by workspace
workspace_id = os.getenv('CLARITY_WORKSPACE_ID')
users = db.query(User).filter(User.workspace_id == workspace_id).all()
```

### Issue 2: Validation Fails - Widget Compliance

**Error**:
```
Widget validation failed: Found widget at off-spec dimensions
```

**Solution**:
Use only the Apple HIG sizes:
- Small: 170×170px
- Medium: 360×170px
- Large: 360×376px

### Issue 3: Build Fails - Missing Dependencies

**Error**:
```
ModuleNotFoundError: No module named 'anthropic'
```

**Solution**:
Add missing dependencies to `requirements.txt`:

```txt
anthropic>=0.18.0
fastapi>=0.110.0
uvicorn>=0.27.0
```

### Issue 4: Health Check Fails

**Error**:
```
Target health check failed: HTTP 404 /health
```

**Solution**:
Ensure `/health` endpoint exists in `backend/main.py`:

```python
@app.get("/health")
def health():
    return {"status": "ok"}
```

**Note**: Fullstack apps get `/health` automatically from platform-generated nginx.conf!

### Issue 5: Database Connection Fails

**Error**:
```
Connection refused to localhost:5432
```

**Solution**:
Use `DATABASE_URL` environment variable instead of hardcoding:

```python
# ❌ WRONG - Hardcoded localhost
engine = create_engine('postgresql://localhost:5432/mydb')

# ✅ CORRECT - Uses platform-injected DATABASE_URL
import os
from sqlalchemy import create_engine

engine = create_engine(os.getenv('DATABASE_URL'))
```

---

## 🔄 Updating Your App

### How to Update Deployed App

1. **Make changes locally** and test with `docker-compose up`
2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Update feature X"
   git push origin main
   ```
3. **Revalidate in Claritty Platform**:
   - Go to Developer Portal
   - Find your app
   - Click **"Reinstall"** or **"Revalidate"**

**Platform handles**:
- ✅ Re-runs validation checks
- ✅ Rebuilds Docker image
- ✅ Zero-downtime deployment
- ✅ Preserves user data and environment variables

**Update time**: 5-10 minutes (validation + build + deployment)

---

## 📊 Monitoring & Logs

### Viewing App Status

**Developer Portal**:
- Installation status (Provisioning → Deploying → Active)
- Validation results (pass/fail for each check)
- Build logs (CodeBuild output)
- Deployment logs (ECS container startup)

### Health Monitoring

Platform automatically monitors:
- ✅ `/health` endpoint (every 30 seconds)
- ✅ Container CPU/memory usage
- ✅ Request latency
- ✅ Error rates

**Alerts**: Platform notifies you if health checks fail

### Application Logs

**Coming Soon**: Real-time log streaming from ECS containers

---

## 🎯 Deployment Best Practices

### 1. Test Locally First

**Always test with docker-compose before submitting**:
```bash
docker-compose up -d
curl http://localhost:8000/health
curl http://localhost:8000/api/widget?size=small
```

### 2. Use Minimal Dependencies

**Smaller images = faster builds**:
- Only include production dependencies
- Avoid unnecessary packages
- Use alpine base images (platform does this automatically)

### 3. Handle Environment Variables Properly

**Use platform-injected variables**:
```python
# ✅ CORRECT - Reads from environment
DATABASE_URL = os.getenv('DATABASE_URL')
WORKSPACE_ID = os.getenv('CLARITY_WORKSPACE_ID')
API_KEY = os.getenv('ANTHROPIC_API_KEY')  # User-provided

# ❌ WRONG - Hardcoded values
DATABASE_URL = 'postgresql://localhost:5432/mydb'
```

### 4. Implement Graceful Shutdown

**Handle SIGTERM for zero-downtime deployments**:
```python
import signal
import sys

def handle_sigterm(signum, frame):
    print("Received SIGTERM, shutting down gracefully...")
    # Close database connections, finish pending requests
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)
```

### 5. Optimize Widget Performance

**Widgets are the primary interface - make them fast**:
- Cache data where possible
- Use database indexes
- Minimize API calls
- Return only necessary data

**Target response times**:
- Small widget: < 200ms
- Large widget: < 500ms

---

## 📚 Related Documentation

- **README.md** - Quick start and core concepts
- **CLAUDE.md** - AI assistant guide
- **WIDGETS.md** - Widget design specifications
- **INFRASTRUCTURE.md** - Infrastructure files explanation
- **claritty-core/INFRASTRUCTURE.md** - Complete platform infrastructure guide

---

## 🆘 Need Help?

**Platform Issues**:
- 📧 Email: support@claritty.ai
- 📚 Documentation: https://docs.claritty.ai
- 💬 Discord: https://discord.gg/claritty

**Development Questions**:
- Check `docs/archive/FAQ.md` for common questions
- Review `docs/archive/DEVELOPER_GUIDE.md` for detailed workflows
- Use Claude Code `/superpowers:systematic-debugging` for debugging

---

**Ready to deploy?** Push to GitHub and submit your app! 🚀
