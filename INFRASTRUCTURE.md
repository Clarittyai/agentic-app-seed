# Infrastructure Files - Do Not Modify

**This document explains which infrastructure files are managed by the Claritty Platform.**

## 🏗️ Platform-Controlled Infrastructure

**Philosophy:** You write code. We handle infrastructure.

Claritty Platform follows a **platform-controlled infrastructure** approach:
- ✅ **You focus on**: Application code (backend, frontend, business logic)
- ✅ **Platform handles**: Docker, nginx, deployment, health checks, multi-tenancy, databases

**In Production:**
- Platform auto-generates optimized Dockerfile with ECR Public Gallery base images
- Platform injects environment variables (DATABASE_URL, PORT, CLARITY_WORKSPACE_ID)
- Platform configures health endpoints and load balancing

**📚 See**: `claritty-core/INFRASTRUCTURE.md` for complete platform infrastructure guide

---

This document explains which **local development** files mirror production behavior and should NOT be modified unless you fully understand the implications.

## ⚠️ Critical Infrastructure Files

### 1. `docker-compose.yml`
**DO NOT MODIFY:** Port configuration and service orchestration

**Why:** The Clarity Platform uses dynamic port allocation for multi-tenancy. When your app is deployed, the platform automatically assigns unique ports to prevent conflicts between different apps and users.

**Managed by Platform:**
- `POSTGRES_PORT` - Database port
- `BACKEND_PORT` - Backend API port
- `FRONTEND_PORT` - Frontend web server port
- `CONTAINER_PREFIX` - Container naming for isolation
- `VITE_API_URL` - API base URL (must be empty for relative URLs)

**What you CAN modify:**
- Environment variables specific to your app logic
- Resource limits (memory, CPU) if needed
- Database credentials (though defaults work fine)

### 2. Root `Dockerfile`
**DO NOT MODIFY IN PRODUCTION:** Platform auto-generates production Dockerfile

**Why:** The Claritty Platform auto-generates an optimized production Dockerfile during validation with:
- ✅ ECR Public Gallery base images (`public.ecr.aws/docker/library/*`) - no Docker Hub rate limits
- ✅ Resilient package installation (`npm install --no-audit --no-fund --prefer-offline`)
- ✅ Health endpoint injection
- ✅ Platform environment variables (DATABASE_URL, PORT, etc.)

**Local Development Dockerfile:**
This repository's Dockerfile mirrors production behavior for local testing. It uses:
```dockerfile
# Multi-stage build with ECR Public Gallery images
FROM public.ecr.aws/docker/library/node:20-alpine AS frontend-builder
# ... build frontend with resilient npm install

FROM public.ecr.aws/docker/library/python:3.11-slim
# ... install nginx, supervisor, python deps
# ... copy frontend build from stage 1
# ... configure supervisord to run both services
```

**Why monolithic?** The platform's ECS deployment architecture expects a single container per app. Separating into multiple containers would break deployment.

**📚 See**: `claritty-core/INFRASTRUCTURE.md` (lines 74-141) for complete Dockerfile generation details

**What you CAN modify locally:**
- Test different dependency versions
- Add build-time optimizations
- Debug container build issues

**Note**: Platform-generated Dockerfile will override this in production!

### 3. `frontend/nginx.conf`
**DO NOT REMOVE:** The `/api/` location block

**Why:** This is the critical piece that enables the monolithic container pattern. It proxies all `/api/*` requests from Nginx to FastAPI running on localhost:8000 in the same container.

**Critical section:**
```nginx
location /api/ {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # ... other headers
}
```

**What you CAN modify:**
- Add additional location blocks for custom routes
- Adjust cache settings for static assets
- Add custom headers (but don't break the /api/ proxy)

### 4. `frontend/src/lib/api.ts`
**DO NOT MODIFY:** The API_BASE_URL default

**Critical line:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
```

**Why empty string?** This makes the Axios client use **relative URLs**. When your app runs at `https://your-app.apps.claritty.ai/`, API calls like `/api/widget` automatically go to the same domain and are proxied to the backend by Nginx.

**What you CAN modify:**
- Add new API methods
- Customize request/response interceptors
- Add authentication logic

## 🏗️ Monolithic Container Architecture

Your app runs in a single container with two processes managed by supervisord:

```
┌─────────────────────────────────────────────────┐
│  https://your-app.apps.claritty.ai/            │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  Single Container (Port 3200)           │  │
│  │  Managed by supervisord                 │  │
│  │                                          │  │
│  │  ┌────────────────────────────────────┐ │  │
│  │  │ Nginx (Port 3200)                  │ │  │
│  │  │ • /          → React SPA           │ │  │
│  │  │ • /widget    → React Widget        │ │  │
│  │  │ • /api/*     → Proxy to localhost  │ │  │
│  │  └───────────────────┬────────────────┘ │  │
│  │                      ↓                   │  │
│  │  ┌────────────────────────────────────┐ │  │
│  │  │ FastAPI (Port 8000, localhost)     │ │  │
│  │  │ • /health    → Health check        │ │  │
│  │  │ • /api/widget → Widget data        │ │  │
│  │  │ • /api/agents → Agent management   │ │  │
│  │  └────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

Why monolithic? Clarity Platform deploys ONE container per app to ECS.
```

## ✅ What You SHOULD Modify

### Application Logic
- `frontend/src/` - Your React components and pages
- `backend/api/` - Your FastAPI routes and business logic
- `backend/workflows/` - Your AI agents and workflows

### Dependencies
- `frontend/package.json` - Add frontend dependencies
- `backend/requirements.txt` - Add Python dependencies

### Database Schema
- `backend/models/` - Your database models
- `backend/migrations/` - Database migrations (if using Alembic)

### Environment Variables
- `.env` - Add your own environment variables (API keys, etc.)
- Just don't modify the PORT variables unless you know what you're doing

## 🚨 Common Mistakes

### ❌ DON'T: Hardcode localhost URLs
```typescript
// WRONG - breaks in production
const API_BASE_URL = 'http://localhost:8000';
```

### ✅ DO: Use relative URLs
```typescript
// CORRECT - works in both dev and production
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
```

### ❌ DON'T: Remove the /api/ proxy from nginx.conf
```nginx
# WRONG - API calls will fail
location / {
    try_files $uri $uri/ /index.html;
}
```

### ✅ DO: Keep the /api/ proxy block
```nginx
# CORRECT - proxies API calls to FastAPI (same container)
location /api/ {
    proxy_pass http://localhost:8000;
    # ... headers
}
```

### ❌ DON'T: Change port mappings in docker-compose.yml
```yaml
# WRONG - conflicts with Clarity Platform
ports:
  - "8000:8000"  # Hardcoded port
```

### ✅ DO: Use environment variables
```yaml
# CORRECT - dynamic port allocation
ports:
  - "${BACKEND_PORT:-8000}:${BACKEND_INTERNAL_PORT:-8000}"
```

## 📚 Further Reading

**Core Documentation:**
- **PLATFORM.md** - Deployment guide for Claritty Platform
- **WIDGETS.md** - Widget design specifications
- **CLAUDE.md** - AI assistant guide
- **README.md** - Quick start and core concepts

**Platform Infrastructure:**
- **claritty-core/INFRASTRUCTURE.md** - Complete platform infrastructure guide
  - Lines 74-141: Dockerfile generation (ECR Public Gallery, resilient npm install)
  - Lines 142-220: nginx configuration (auto-generated for fullstack apps)
  - Lines 360-382: Reserved environment variables (platform-injected)

**Local Files:**
- `docker-compose.yml` - Port configuration and service orchestration
- `frontend/nginx.conf` - API proxy configuration
- `Dockerfile` - Monolithic container build (mirrors production)

## 🆘 Need Help?

If you need to modify infrastructure files for a specific reason:
1. Read this document carefully to understand the implications
2. Check the warning comments in the files themselves
3. Test locally with `docker-compose up` before deploying
4. Contact Clarity Platform support if you're unsure

Remember: **These files are configured to work out of the box.** Most apps never need to modify them!
