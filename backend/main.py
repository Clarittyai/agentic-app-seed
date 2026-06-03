"""
Clarity Agentic App Backend - FastAPI Application

Main FastAPI application with:
- Core API endpoints (health, widget)
- Agent/workflow discovery
- User trigger management
- Execution endpoints
"""

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import logging

from backend.database import get_db, init_db, seed_example_tasks, engine
from backend import models
from claritty_sdk import (
    AgentRegistry,
    WorkflowRegistry,
    TriggerTemplateRegistry,
    AgentContext,
    WorkflowContext,
    build_graph,
    use_user_context,
)
from claritty_sdk.executor import WorkflowExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Clarity Agentic App",
    description="AI-powered application with user-configurable triggers",
    version="1.0.0"
)

# Include infrastructure routers (health checks, etc.)
from backend.infrastructure import health_router
app.include_router(health_router)

# Auto-include app-specific routers from backend/routes/*.py (each exposes a
# module-level `router = APIRouter()`). Registered HERE — before the inline
# example endpoints further down — so a generated backend/routes/app.py can
# OVERRIDE them: FastAPI dispatches to the FIRST route registered for a given
# path+method. Generated apps overwrite backend/routes/app.py with their own
# data endpoints; the inline examples below remain as shadowed fallbacks.
import importlib as _importlib
import pkgutil as _pkgutil
from fastapi import APIRouter as _APIRouter

try:
    from backend import routes as _routes_pkg

    for _m in _pkgutil.iter_modules(_routes_pkg.__path__):
        try:
            _mod = _importlib.import_module(f"backend.routes.{_m.name}")
            _router = getattr(_mod, "router", None)
            if isinstance(_router, _APIRouter):
                app.include_router(_router)
                logger.info(f"Included app router: backend.routes.{_m.name}")
        except Exception as _e:  # noqa: BLE001
            logger.error(
                f"Failed to include app router backend.routes.{_m.name}: {_e}"
            )
except Exception as _e:  # noqa: BLE001
    logger.warning(f"No app routers package to include: {_e}")

# Triggers are managed by the Claritty platform; the app only exposes the
# /internal dispatch endpoints below (no in-app scheduler).

# Configure CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3200")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],  # Include Clarity platform
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency: Get current user ID from header
def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    authorization: Optional[str] = Header(None)
) -> str:
    """
    Extract user ID from Clarity platform headers or Bearer token.

    Authentication priority:
    1. X-User-ID header (injected by Clarity platform proxy)
    2. Bearer token from Authorization header (for direct API access)

    When deployed on Clarity platform, all requests are proxied and include
    X-User-ID header for seamless multi-tenant authentication.
    """
    # Priority 1: Clarity platform header (production)
    if x_user_id:
        logger.debug(f"Authenticated via X-User-ID header: {x_user_id}")
        return x_user_id

    # Priority 2: Bearer token (development / direct access)
    if authorization:
        try:
            # Extract user ID from Bearer token
            # In production, implement proper JWT validation here
            user_id = authorization.replace("Bearer ", "").strip()
            logger.debug(f"Authenticated via Bearer token: {user_id}")
            return user_id
        except Exception as e:
            logger.error(f"Failed to parse authorization header: {e}")
            raise HTTPException(status_code=401, detail="Invalid authorization token")

    # No authentication provided
    raise HTTPException(
        status_code=401,
        detail="Authentication required. Provide X-User-ID header or Authorization token."
    )


# ============================================================================
# CORE ENDPOINTS
# ============================================================================
# Note: the health endpoint is provided by backend/infrastructure/health.py.
# The app's data endpoints — including the REQUIRED `GET /api/widget` — live in
# backend/routes/app.py (auto-included above). Generated apps overwrite that
# file with their own routes; main.py stays generic (discovery + execution).


# ============================================================================
# DISCOVERY ENDPOINTS
# ============================================================================

@app.get("/api/agents")
async def list_agents():
    """
    List all registered agents.
    Returns agent metadata for discovery.
    """
    agents = AgentRegistry.list_agents()
    return {
        "agents": [
            {
                "id": agent.id,
                "name": agent.name,
                "description": agent.description,
                "category": agent.category,
                "inputs": agent.inputs,
                "outputs": agent.outputs,
                "integrations": [
                    {
                        "service": integration.service,
                        "required": integration.required,
                        "auth_type": integration.auth_type
                    }
                    for integration in agent.integrations
                ]
            }
            for agent in agents
        ]
    }


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    """
    Get specific agent metadata.
    """
    agent = AgentRegistry.get_metadata(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return {
        "id": agent.id,
        "name": agent.name,
        "description": agent.description,
        "category": agent.category,
        "inputs": agent.inputs,
        "outputs": agent.outputs,
        "timeout": agent.timeout,
        "integrations": [
            {
                "service": integration.service,
                "required": integration.required,
                "auth_type": integration.auth_type,
                "config_fields": integration.config_fields
            }
            for integration in agent.integrations
        ]
    }


@app.get("/api/workflows")
async def list_workflows():
    """
    List all registered workflows.
    """
    workflows = WorkflowRegistry.list_workflows()
    return {
        "workflows": [
            {
                "id": workflow.id,
                "name": workflow.name,
                "description": workflow.description,
                "execution_mode": workflow.execution_mode.value,
                "steps": [
                    {
                        "agent_id": step.agent_id,
                        "output_key": step.output_key
                    }
                    for step in workflow.steps
                ]
            }
            for workflow in workflows
        ]
    }


@app.get("/api/trigger-templates")
async def list_trigger_templates():
    """
    List all available trigger templates.
    Users can create instances from these templates.
    """
    templates = TriggerTemplateRegistry.list_templates()
    return {
        "templates": [
            {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "template_type": template.template_type.value,
                "workflow_id": template.workflow_id,
                "category": template.category,
                "config_fields": [
                    {
                        "key": field.key,
                        "label": field.label,
                        "type": field.type,
                        "required": field.required,
                        "default": field.default,
                        "options": field.options,
                        "validation": field.validation
                    }
                    for field in template.config_fields
                ],
                "max_instances_per_user": template.max_instances_per_user
            }
            for template in templates
        ]
    }


@app.get("/api/graph")
async def get_graph():
    """The app's agent/workflow/trigger graph (v1 contract) for the Claritty
    canvas: nodes (agents + triggers) + edges (agent→agent from input_from,
    trigger→entry-agent). Single source of truth — identical for manual and
    generated apps, served live from the SDK registries."""
    return build_graph()


# ============================================================================
# EXECUTION ENDPOINTS
# ============================================================================

@app.post("/api/agents/{agent_id}/execute")
async def execute_agent(
    agent_id: str,
    input_data: Dict[str, Any],
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a single agent with provided input data.
    """
    # Get agent class
    agent_class = AgentRegistry.get_agent(agent_id)
    if not agent_class:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Get user integrations
    integrations = {}
    user_integrations = db.query(models.UserIntegration).filter(
        models.UserIntegration.user_id == user_id,
        models.UserIntegration.is_active == True
    ).all()

    for integration in user_integrations:
        integrations[integration.service] = integration.credentials

    # Per-agent user context (the platform's "how to do your job" instructions)
    # arrives alongside the inputs; pull it out and bind it so the SDK injects
    # it into the agent's LLM system prompt.
    user_context = input_data.pop("user_context", "") if isinstance(input_data, dict) else ""

    context = AgentContext(
        user_id=user_id,
        input_data=input_data,
        integrations=integrations,
        metadata={},
        user_context=user_context,
    )

    # Execute agent
    try:
        agent_instance = agent_class()
        with use_user_context(user_context):
            result = await agent_instance.execute(context)

        return {
            "success": result.success,
            "data": result.data,
            "error": result.error,
            "metadata": result.metadata
        }
    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")


# ============================================================================
# INTERNAL TRIGGER DISPATCH (platform → app)
# ============================================================================
# The Claritty platform owns trigger instances + scheduling and dispatches due
# work here (see clarity-api/src/modules/triggers/SEED_CONTRACT.md). Auth is the
# platform↔app shared secret (X-Claritty-Internal); the ALB also gates these on
# X-Claritty-Auth at the edge. Never reachable by end users directly.


def verify_internal_dispatch(
    x_claritty_internal: Optional[str] = Header(None, alias="X-Claritty-Internal"),
) -> None:
    """Reject unless the platform's shared internal secret matches. When no
    secret is configured (local dev) we allow, since the platform always sets
    it in production."""
    expected = os.getenv("CLARITY_INTERNAL_SECRET")
    if expected and x_claritty_internal != expected:
        raise HTTPException(status_code=401, detail="Invalid internal dispatch secret")


def _load_user_integrations(db: Session, user_id: str) -> Dict[str, Any]:
    integrations: Dict[str, Any] = {}
    rows = db.query(models.UserIntegration).filter(
        models.UserIntegration.user_id == user_id,
        models.UserIntegration.is_active == True,
    ).all()
    for row in rows:
        integrations[row.service] = row.credentials
    return integrations


async def _run_workflow_for_trigger(
    db: Session, *, workflow_id: str, user_id: str, trigger_data: Dict[str, Any]
) -> Dict[str, Any]:
    if not WorkflowRegistry.get_metadata(workflow_id):
        raise HTTPException(
            status_code=404, detail=f"Workflow '{workflow_id}' not found"
        )
    integrations = _load_user_integrations(db, user_id)
    body = dict(trigger_data or {})
    agent_context = body.pop("agent_context", {}) or {}
    executor = WorkflowExecutor()
    return await executor.execute_workflow(
        workflow_id=workflow_id,
        trigger_data=body,
        user_id=user_id,
        integrations=integrations,
        agent_context=agent_context,
    )


@app.post("/internal/run-due-triggers")
async def run_due_triggers(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_dispatch),
):
    """Run a platform-dispatched batch of due SCHEDULE instances.

    The dispatcher records the HTTP status as the batch outcome, so we only
    fail (500) when EVERY instance errored; otherwise we report per-instance.
    """
    instances = payload.get("instances") or []
    results = []
    any_ok = False
    for inst in instances:
        instance_id = inst.get("instanceId")
        try:
            r = await _run_workflow_for_trigger(
                db,
                workflow_id=inst.get("workflowId"),
                user_id=inst.get("userId"),
                trigger_data=inst.get("config") or {},
            )
            ok = bool(r.get("success"))
            any_ok = any_ok or ok
            results.append(
                {"instanceId": instance_id, "success": ok, "error": r.get("error")}
            )
        except Exception as e:
            logger.error(f"run-due-triggers: instance {instance_id} failed: {e}")
            results.append(
                {"instanceId": instance_id, "success": False, "error": str(e)}
            )
    if instances and not any_ok:
        raise HTTPException(status_code=500, detail="all due triggers failed")
    return {"ok": True, "results": results}


@app.post("/internal/trigger-webhook")
async def run_trigger_webhook(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_dispatch),
):
    """Run the workflow mapped to a webhook trigger. The inbound webhook
    headers + body are exposed to the workflow under `trigger_data['webhook']`,
    alongside the instance's configured fields."""
    workflow_id = payload.get("workflowId")
    user_id = payload.get("userId")
    if not workflow_id or not user_id:
        raise HTTPException(
            status_code=400, detail="workflowId and userId are required"
        )
    trigger_data = {
        **(payload.get("config") or {}),
        "webhook": {
            "headers": payload.get("headers") or {},
            "body": payload.get("body"),
        },
    }
    result = await _run_workflow_for_trigger(
        db, workflow_id=workflow_id, user_id=user_id, trigger_data=trigger_data
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=500, detail=result.get("error") or "workflow failed"
        )
    return {"ok": True, "outputs": result.get("outputs", {})}


@app.post("/api/workflows/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    input_data: Optional[Dict[str, Any]] = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute a workflow immediately.

    Creates execution record and runs workflow synchronously.
    Returns execution results.
    """
    # Get workflow metadata
    workflow_metadata = WorkflowRegistry.get_metadata(workflow_id)
    if not workflow_metadata:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Get user integrations
    integrations = {}
    user_integrations = db.query(models.UserIntegration).filter(
        models.UserIntegration.user_id == user_id,
        models.UserIntegration.is_active == True
    ).all()

    for integration in user_integrations:
        integrations[integration.service] = integration.credentials

    logger.info(f"Starting workflow execution: {workflow_id}")

    # Per-agent user context map (agentId -> instructions) travels in the body
    # under `agent_context`; the rest of the body is the workflow trigger data.
    body = dict(input_data or {})
    agent_context = body.pop("agent_context", {}) or {}

    # Execute workflow. Measure duration here ourselves — the SDK executor's
    # return shape varies across versions and may omit `duration_seconds`, so we
    # never index it directly (a missing key used to 500 the whole request).
    executor = WorkflowExecutor()
    started_at = datetime.utcnow()
    try:
        result = await executor.execute_workflow(
            workflow_id=workflow_id,
            trigger_data=body,
            user_id=user_id,
            integrations=integrations,
            agent_context=agent_context,
        )

        success = bool(result.get("success", True))
        duration = result.get("duration_seconds")
        if duration is None:
            duration = (datetime.utcnow() - started_at).total_seconds()

        # Create execution record
        execution = models.WorkflowExecution(
            workflow_id=workflow_id,
            user_id=user_id,
            status="completed" if success else "failed",
            input_data=input_data or {},
            output_data=result.get("outputs", {}),
            error_message=result.get("error"),
            started_at=started_at,
            completed_at=datetime.utcnow(),
            duration_seconds=int(duration),
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)

        logger.info(f"Workflow execution completed: {execution.id} (success={success})")

        return {
            "execution_id": execution.id,
            "workflow_id": workflow_id,
            "status": execution.status,
            "success": success,
            "outputs": result.get("outputs", {}),
            "error": result.get("error"),
            "duration_seconds": int(duration),
        }

    except Exception as e:
        logger.error(f"Workflow execution failed: {workflow_id} - {e}")

        # Create failed execution record
        execution = models.WorkflowExecution(
            workflow_id=workflow_id,
            user_id=user_id,
            status="failed",
            input_data=input_data or {},
            error_message=str(e),
            started_at=started_at,
            completed_at=datetime.utcnow(),
            duration_seconds=0
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)

        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


@app.get("/api/workflows/executions/{execution_id}")
async def get_workflow_execution(
    execution_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get workflow execution status and results.
    """
    execution = db.query(models.WorkflowExecution).filter(
        models.WorkflowExecution.id == execution_id,
        models.WorkflowExecution.user_id == user_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    return {
        "id": execution.id,
        "workflow_id": execution.workflow_id,
        "status": execution.status,
        "input_data": execution.input_data,
        "output_data": execution.output_data,
        "error_message": execution.error_message,
        "started_at": execution.started_at.isoformat(),
        "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
        "duration_seconds": execution.duration_seconds
    }


# ============================================================================
# STARTUP/SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Initialize database and load agents/workflows/triggers on startup.
    """
    logger.info("🚀 Starting Clarity Agentic App...")

    # Initialize database
    logger.info("📊 Initializing database...")
    init_db()

    # Seed a few example tasks on first run so the widget shows real content
    # (makes the small/medium/large sizes visibly different). Idempotent.
    seed_example_tasks()

    # Auto-discover and register all components
    logger.info("🤖 Auto-discovering agents, workflows, and triggers...")
    try:
        from backend.infrastructure import discover_and_register_components
        discover_and_register_components()
    except Exception as e:
        logger.error(f"Failed to discover components: {e}")
        raise

    # Log registered components
    agents = AgentRegistry.list_agents()
    workflows = WorkflowRegistry.list_workflows()
    templates = TriggerTemplateRegistry.list_templates()

    logger.info(f"✅ Registered {len(agents)} agents")
    logger.info(f"✅ Registered {len(workflows)} workflows")
    logger.info(f"✅ Registered {len(templates)} trigger templates")

    # Cache the graph for the platform's build-time / unreachable fallback
    # (same build_graph() the /api/graph endpoint serves on demand). This is a
    # COLD-START hot path: on Lambda the task dir is READ-ONLY, so the write
    # always failed (and build_graph() ran for nothing) on every cold init.
    # Only do the work where the FS is writable AND the cache is missing — so
    # it's written once at build/first-run and skipped entirely on Lambda.
    try:
        import os as _os
        from pathlib import Path as _Path
        _cache_dir = _Path(__file__).parent / ".clarity"
        _graph_file = _cache_dir / "graph.json"
        if not _graph_file.exists() and _os.access(_cache_dir.parent, _os.W_OK):
            import json as _json
            _cache_dir.mkdir(exist_ok=True)
            _graph_file.write_text(_json.dumps(build_graph(), indent=2))
            logger.info("✅ Wrote graph cache to backend/.clarity/graph.json")
    except Exception as _e:
        logger.warning(f"⚠️  Failed to write graph cache: {_e}")

    # Triggers are owned by the Claritty platform: it stores instances, computes
    # schedules, and dispatches due work to the /internal endpoints below. No
    # in-process scheduler runs here (it wouldn't survive on Lambda anyway).
    logger.info("✅ Clarity Agentic App ready!")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Cleanup on shutdown.
    """
    logger.info("👋 Shutting down Clarity Agentic App...")
    logger.info("✅ Shutdown complete")


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "false").lower() == "true"

    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
