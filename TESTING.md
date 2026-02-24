# Testing & Validation Guide

Complete guide to ensure the Clarity Agentic App Seed runs correctly and operates as expected.

## 📋 Pre-Flight Validation

Before starting the application, run the validation script to check your environment:

```bash
# Navigate to backend directory
cd backend

# Run validation script
python validate_startup.py
```

This will check:
- ✅ Environment variables (ANTHROPIC_API_KEY, DATABASE_URL)
- ✅ Python dependencies (FastAPI, SQLAlchemy, Anthropic, Clarity SDK)
- ✅ Database connection
- ✅ SDK component registration (agents, workflows, triggers)

**Expected Output**:
```
============================================================
Clarity Agentic App - Startup Validation
============================================================

🔍 Validating environment variables...
  ✅ ANTHROPIC_API_KEY = sk-ant-xxx...
  ✅ DATABASE_URL = postgresql...
✅ All required environment variables are set

🔍 Validating imports...
  ✅ FastAPI
  ✅ SQLAlchemy
  ✅ Pydantic
  ✅ Anthropic
  ✅ APScheduler
  ✅ pytz
  ✅ Clarity SDK decorators
  ✅ WorkflowExecutor
  ✅ DynamicTriggerManager
✅ All imports successful

🔍 Validating database connection...
  ✅ Database connection successful
  ✅ Database URL: postgresql://clarity_user:***@localhost:5432/clarity_agentic_app

🔍 Validating SDK registration...
  ✅ Agents registered: 2
  ✅ Workflows registered: 2
  ✅ Trigger templates registered: 4

============================================================
Validation Summary
============================================================
Environment Variables: ✅ PASSED
Python Imports: ✅ PASSED
Database Connection: ✅ PASSED
SDK Registration: ✅ PASSED
============================================================

🎉 All validations passed! Ready to start the application.

Run: python main.py
```

## 🐳 Docker Build & Startup Test

### 1. Build Docker Images

```bash
# Navigate to project root
cd clarity-agentic-app-seed

# Build all services
docker-compose build

# Expected: Successful builds for postgres, backend, frontend
# Build time: ~5-10 minutes for first build
```

**What to Look For**:
- ✅ No "COPY failed" errors
- ✅ All Python dependencies install successfully
- ✅ Frontend npm dependencies install successfully
- ✅ No compilation errors

### 2. Start Services

```bash
# Start all services with logs
docker-compose up

# Or run in background
docker-compose up -d
```

**Expected Startup Logs**:

**PostgreSQL**:
```
clarity-agentic-db | database system is ready to accept connections
```

**Backend**:
```
clarity-agentic-backend | 🚀 Starting Clarity Agentic App...
clarity-agentic-backend | 📊 Initializing database...
clarity-agentic-backend | 🤖 Loading agents, workflows, and triggers...
clarity-agentic-backend | ✅ Successfully imported all components
clarity-agentic-backend | ✅ Registered 2 agents
clarity-agentic-backend | ✅ Registered 2 workflows
clarity-agentic-backend | ✅ Registered 4 trigger templates
clarity-agentic-backend | 🔄 Initializing DynamicTriggerManager...
clarity-agentic-backend | ✅ DynamicTriggerManager initialized (0 triggers active)
clarity-agentic-backend | ✅ Clarity Agentic App ready!
clarity-agentic-backend | INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Frontend**:
```
clarity-agentic-frontend | Clarity Agentic Frontend started on port 3200
```

### 3. Health Checks

```bash
# Check backend health
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","timestamp":"2026-02-18T...:","version":"1.0.0"}

# Check frontend accessibility
curl -I http://localhost:3200

# Expected: HTTP/1.1 200 OK
```

## 🧪 API Endpoint Testing

### 1. Discovery Endpoints

```bash
# List all agents
curl http://localhost:8000/api/agents | jq

# Expected: 2 agents (TaskAnalyzerAgent, EmailComposerAgent)

# List all workflows
curl http://localhost:8000/api/workflows | jq

# Expected: 2 workflows (task_review_workflow, task_notification_workflow)

# List all trigger templates
curl http://localhost:8000/api/trigger-templates | jq

# Expected: 4 templates (daily-task-review, interval-task-check, task-threshold, webhook-task-trigger)
```

**What to Verify**:
- ✅ Agent metadata includes id, name, description, inputs, outputs
- ✅ Workflow metadata includes execution_mode, steps
- ✅ Trigger templates include config_fields for user configuration

### 2. Widget Endpoint (Required by Clarity Platform)

```bash
# Test widget endpoint (requires auth)
curl -H "Authorization: Bearer test-user-123" \
  "http://localhost:8000/api/widget?size=large" | jq

# Expected response:
# {
#   "active_triggers": 0,
#   "total_executions": 0,
#   "success_rate": 0,
#   "recent_executions": []
# }
```

### 3. Trigger Management

**Create a trigger**:
```bash
curl -X POST http://localhost:8000/api/my/triggers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-user-123" \
  -d '{
    "template_id": "daily-task-review",
    "name": "My Morning Review",
    "config": {
      "time": "09:00",
      "timezone": "America/New_York",
      "days_of_week": ["MON", "TUE", "WED", "THU", "FRI"]
    }
  }' | jq

# Expected: Returns created trigger with id, enabled=true
```

**List user triggers**:
```bash
curl -H "Authorization: Bearer test-user-123" \
  http://localhost:8000/api/my/triggers | jq

# Expected: Shows the trigger we just created
```

**Update a trigger**:
```bash
curl -X PATCH http://localhost:8000/api/my/triggers/{trigger-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-user-123" \
  -d '{"enabled": false}' | jq

# Expected: Trigger is now disabled
```

**Delete a trigger**:
```bash
curl -X DELETE \
  -H "Authorization: Bearer test-user-123" \
  http://localhost:8000/api/my/triggers/{trigger-id}

# Expected: {"message": "Trigger deleted successfully"}
```

### 4. Workflow Execution

```bash
# Execute a workflow manually
curl -X POST http://localhost:8000/api/workflows/task-review-workflow/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-user-123" \
  -d '{
    "task_description": "Complete project documentation",
    "priority": "high"
  }' | jq

# Expected response:
# {
#   "execution_id": "uuid-here",
#   "workflow_id": "task-review-workflow",
#   "status": "completed",
#   "success": true,
#   "outputs": {...},
#   "duration_seconds": 2.5
# }
```

**Get execution details**:
```bash
curl -H "Authorization: Bearer test-user-123" \
  http://localhost:8000/api/workflows/executions/{execution-id} | jq

# Expected: Full execution record with input_data, output_data, status
```

## 🌐 Frontend Testing

### 1. Access Frontend

Open browser and navigate to: `http://localhost:3200`

**Expected**:
- ✅ Clean UI loads without errors
- ✅ Dark mode toggle in header works
- ✅ Navigation shows: Dashboard, Triggers
- ✅ Widget displays on dashboard (0 triggers, 0% success rate initially)

### 2. Dashboard Page

**What to Verify**:
- ✅ "Active Triggers" card shows count
- ✅ "Success Rate" shows percentage
- ✅ "Recent Executions" table (empty initially)
- ✅ Agent list shows 2 agents with categories
- ✅ Workflow list shows 2 workflows with execution modes

### 3. Trigger Manager Page

Click "Triggers" in navigation.

**What to Verify**:
- ✅ "Available Templates" section shows 4 cards
- ✅ Each template card has:
  - Name and description
  - Category badge
  - "Create Trigger" button
  - Max instances indicator

**Create a Trigger**:
1. Click "Create Trigger" on "Daily Task Review" template
2. Fill in form:
   - Name: "Morning Review"
   - Time: "09:00"
   - Timezone: Select your timezone
   - Days: Check Mon-Fri
3. Click "Create"

**Expected**:
- ✅ Success message appears
- ✅ Trigger appears in "My Triggers" section
- ✅ Shows: name, enabled status, stats (0 executions)
- ✅ Has "Pause" and "Delete" buttons

**Test Pause**:
- Click "Pause" button
- Expected: Button changes to "Resume", trigger shows as disabled

**Test Resume**:
- Click "Resume" button
- Expected: Button changes to "Pause", trigger shows as enabled

**Test Delete**:
- Click "Delete" button
- Confirm deletion
- Expected: Trigger removed from list

### 4. Dark Mode

- Click dark mode toggle in header
- Expected: Theme switches smoothly, all components readable

## 🗄️ Database Verification

### 1. Check Database Tables

```bash
# Connect to database
docker-compose exec postgres psql -U clarity_user -d clarity_agentic_app

# List tables
\dt

# Expected tables:
# - user_trigger_instances
# - trigger_executions
# - workflow_executions
# - user_integrations
```

### 2. Verify Trigger Data

```sql
-- Check created triggers
SELECT id, user_id, template_id, name, enabled, total_executions
FROM user_trigger_instances;

-- Check workflow executions
SELECT id, workflow_id, status, duration_seconds, started_at
FROM workflow_executions
ORDER BY started_at DESC
LIMIT 5;
```

## 🔄 Trigger Scheduling Test

### 1. Create Interval Trigger

Create a trigger that runs every 2 minutes for testing:

```bash
curl -X POST http://localhost:8000/api/my/triggers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-user-123" \
  -d '{
    "template_id": "interval-task-check",
    "name": "Test Interval Trigger",
    "config": {
      "interval_minutes": 2
    }
  }' | jq
```

### 2. Monitor Execution Logs

```bash
# Watch backend logs
docker-compose logs -f backend

# Expected logs every 2 minutes:
# 🔥 Trigger fired: interval-task-check (instance-id)
# ⚙️ Executing workflow: task-review-workflow
# ✅ Workflow execution completed (duration: X.Xs)
# ✅ Trigger execution completed
```

### 3. Verify Execution Records

After 5-10 minutes:

```bash
# Check executions via API
curl -H "Authorization: Bearer test-user-123" \
  "http://localhost:8000/api/widget?size=large" | jq

# Expected:
# - total_executions > 0
# - recent_executions shows multiple entries
# - success_rate shows percentage
```

## 🐛 Common Issues & Troubleshooting

### Issue: Backend fails to start

**Error**: "ModuleNotFoundError: No module named 'pytz'"
**Fix**: Rebuild backend Docker image: `docker-compose build backend`

**Error**: "Connection refused to database"
**Fix**: Wait for PostgreSQL to be ready (check with `docker-compose logs postgres`)

### Issue: Frontend can't connect to backend

**Error**: "Network Error" in browser console
**Fix**:
1. Verify backend is running: `docker-compose ps`
2. Check CORS configuration in backend/main.py (should include http://localhost:3200)
3. Verify VITE_API_URL in frontend/.env points to http://localhost:8000

### Issue: Triggers not scheduling

**Check trigger manager logs**:
```bash
docker-compose logs backend | grep "DynamicTriggerManager"
```

**Expected**:
```
✅ DynamicTriggerManager initialized (N triggers active)
```

**If 0 triggers active**:
- Check database for user_trigger_instances with enabled=true
- Verify trigger config is valid JSON
- Check for error logs when trigger was created

### Issue: Validation script fails

**Error**: "ANTHROPIC_API_KEY not set"
**Fix**: Add to .env file: `echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env`

**Error**: "Database connection failed"
**Fix**:
1. Start PostgreSQL: `docker-compose up -d postgres`
2. Wait 10 seconds for startup
3. Try validation again

## ✅ Complete Testing Checklist

Use this checklist to verify everything works:

### Environment
- [ ] `.env` file created with ANTHROPIC_API_KEY
- [ ] validation script passes all checks
- [ ] Docker builds complete without errors

### Backend
- [ ] Backend starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] 2 agents registered
- [ ] 2 workflows registered
- [ ] 4 trigger templates registered
- [ ] DynamicTriggerManager initialized

### Database
- [ ] PostgreSQL running and healthy
- [ ] All tables created (4 tables)
- [ ] Can insert and query data

### API Endpoints
- [ ] `/api/agents` returns 2 agents
- [ ] `/api/workflows` returns 2 workflows
- [ ] `/api/trigger-templates` returns 4 templates
- [ ] `/api/widget` returns statistics
- [ ] Can create trigger via POST
- [ ] Can list user triggers
- [ ] Can update trigger (pause/resume)
- [ ] Can delete trigger
- [ ] Can execute workflow manually
- [ ] Execution record created in database

### Frontend
- [ ] Frontend loads at http://localhost:3200
- [ ] Dashboard shows widget with stats
- [ ] Agents list displays 2 agents
- [ ] Workflows list displays 2 workflows
- [ ] Trigger templates show 4 cards
- [ ] Can create trigger via UI
- [ ] Form auto-generates from config_fields
- [ ] Created trigger appears in "My Triggers"
- [ ] Can pause/resume trigger
- [ ] Can delete trigger
- [ ] Dark mode toggle works

### Integration
- [ ] Trigger created in UI appears in database
- [ ] Trigger created via API appears in UI
- [ ] Manual workflow execution creates execution record
- [ ] Interval trigger executes on schedule
- [ ] Execution statistics update in widget
- [ ] Logs show trigger firing and workflow execution

### Cleanup Test
- [ ] Can stop all services: `docker-compose down`
- [ ] Can restart services: `docker-compose up -d`
- [ ] Triggers persist after restart
- [ ] Execution history preserved

## 📊 Performance Testing

### Load Test (Optional)

Test with multiple concurrent trigger executions:

```bash
# Create 10 triggers rapidly
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/my/triggers \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-user-123" \
    -d "{
      \"template_id\": \"interval-task-check\",
      \"name\": \"Test Trigger $i\",
      \"config\": {\"interval_minutes\": 5}
    }"
done

# Wait 5 minutes and check execution count
curl -H "Authorization: Bearer test-user-123" \
  "http://localhost:8000/api/widget?size=large" | jq
```

**Expected**:
- All 10 triggers created successfully
- Multiple executions occur simultaneously (parallel execution)
- No errors in logs
- Success rate remains high (>90%)

## 🎉 Success Criteria

Your Clarity Agentic App Seed is fully operational if:

✅ **All validation checks pass**
✅ **Docker services start without errors**
✅ **Backend serves all API endpoints correctly**
✅ **Frontend UI loads and operates smoothly**
✅ **Triggers can be created, updated, and deleted**
✅ **Workflows execute successfully**
✅ **Scheduled triggers fire on time**
✅ **Execution records appear in database and UI**
✅ **Dark mode works correctly**
✅ **No errors in logs during normal operation**

---

## 🔧 Advanced Testing

### Testing with Real Anthropic API

To test AI agent functionality:

1. Ensure `ANTHROPIC_API_KEY` is set to a valid key
2. Execute workflow that uses AI agents:

```bash
curl -X POST http://localhost:8000/api/workflows/task-review-workflow/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-user-123" \
  -d '{
    "task_description": "Research competitive landscape for AI code assistants",
    "priority": "high",
    "deadline": "2026-02-25"
  }' | jq
```

3. Check execution output includes AI-generated analysis
4. Verify Anthropic API calls in logs

### Testing Custom Agents

To add and test your own agents:

1. Create new agent file in `backend/agents/`
2. Add to `backend/agents/__init__.py`
3. Restart backend: `docker-compose restart backend`
4. Verify agent appears in `/api/agents`
5. Test execution via `/api/agents/{agent-id}/execute`

### Testing Error Recovery

Test that system handles errors gracefully:

```bash
# Test with invalid workflow input
curl -X POST http://localhost:8000/api/workflows/task-review-workflow/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-user-123" \
  -d '{"invalid": "data"}'

# Expected: 500 error with clear message
# Execution record created with status="failed"
# No crashes or unhandled exceptions
```

---

**Testing Complete!**

Your Clarity Agentic App Seed is now verified and ready for development. 🚀
