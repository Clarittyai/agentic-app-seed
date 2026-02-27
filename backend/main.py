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

from backend.database import get_db, init_db, engine
from backend import models
from clarity_sdk import (
    AgentRegistry,
    WorkflowRegistry,
    TriggerTemplateRegistry,
    AgentContext,
    WorkflowContext
)
from clarity_sdk.trigger_manager import DynamicTriggerManager
from clarity_sdk.executor import WorkflowExecutor

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

# Global trigger manager (initialized on startup)
trigger_manager: Optional[DynamicTriggerManager] = None

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
# Note: Health check endpoint is provided by backend/infrastructure/health.py

@app.get("/api/widget")
async def get_widget_data(
    size: str = "large",
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Widget data endpoint - REQUIRED by Clarity platform.

    Returns data to display in the user's Clarity dashboard widget.
    Supports two sizes: small (quick glance), large (detailed view)
    """
    # Get user's active triggers
    active_triggers = db.query(models.UserTriggerInstance).filter(
        models.UserTriggerInstance.user_id == user_id,
        models.UserTriggerInstance.enabled == True
    ).count()

    # Get recent executions
    recent_executions = db.query(models.WorkflowExecution).filter(
        models.WorkflowExecution.user_id == user_id
    ).order_by(
        models.WorkflowExecution.started_at.desc()
    ).limit(5).all()

    # Calculate success rate
    total_executions = len(recent_executions)
    successful = sum(1 for e in recent_executions if e.status == "completed")
    success_rate = (successful / total_executions * 100) if total_executions > 0 else 0

    # Return different data based on widget size
    if size == "small":
        # Small widget: Quick glance - active triggers and success rate only
        return {
            "active_triggers": active_triggers,
            "success_rate": f"{success_rate:.0f}%"
        }
    else:  # large
        # Large widget: Detailed view - full dashboard with execution history
        return {
            "active_triggers": active_triggers,
            "total_executions": total_executions,
            "success_rate": success_rate,
            "recent_executions": [
                {
                    "workflow_id": e.workflow_id,
                    "status": e.status,
                    "started_at": e.started_at.isoformat(),
                    "duration_seconds": e.duration_seconds
                }
                for e in recent_executions
            ]
        }


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


# ============================================================================
# TRIGGER MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/my/triggers")
async def list_user_triggers(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List current user's trigger instances.
    """
    triggers = db.query(models.UserTriggerInstance).filter(
        models.UserTriggerInstance.user_id == user_id
    ).order_by(
        models.UserTriggerInstance.created_at.desc()
    ).all()

    return {
        "triggers": [
            {
                "id": trigger.id,
                "template_id": trigger.template_id,
                "name": trigger.name,
                "config": trigger.config,
                "enabled": trigger.enabled,
                "created_at": trigger.created_at.isoformat(),
                "last_triggered_at": trigger.last_triggered_at.isoformat() if trigger.last_triggered_at else None,
                "total_executions": trigger.total_executions,
                "total_failures": trigger.total_failures
            }
            for trigger in triggers
        ]
    }


@app.post("/api/my/triggers")
async def create_trigger_instance(
    template_id: str,
    name: str,
    config: Dict[str, Any],
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new trigger instance from a template.

    User provides:
    - template_id: Which template to use
    - name: Custom name for this trigger
    - config: User's configured values (e.g., {"time": "09:00", "timezone": "America/New_York"})
    """
    # Validate template exists
    template = TriggerTemplateRegistry.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Trigger template not found")

    # Check max instances limit
    if template.max_instances_per_user:
        existing_count = db.query(models.UserTriggerInstance).filter(
            models.UserTriggerInstance.user_id == user_id,
            models.UserTriggerInstance.template_id == template_id
        ).count()

        if existing_count >= template.max_instances_per_user:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {template.max_instances_per_user} instances allowed per user"
            )

    # TODO: Validate config against template.config_fields

    # Create trigger instance
    trigger = models.UserTriggerInstance(
        user_id=user_id,
        template_id=template_id,
        name=name,
        config=config,
        enabled=True
    )

    db.add(trigger)
    db.commit()
    db.refresh(trigger)

    logger.info(f"Created trigger instance {trigger.id} for user {user_id}")

    # Register trigger with DynamicTriggerManager
    if trigger_manager:
        try:
            await trigger_manager.register_trigger(
                trigger_instance_id=trigger.id,
                user_id=user_id,
                template_id=template_id,
                config=config
            )
        except Exception as e:
            logger.error(f"Failed to schedule trigger {trigger.id}: {e}")
            # Continue anyway - trigger is created in DB

    return {
        "id": trigger.id,
        "template_id": trigger.template_id,
        "name": trigger.name,
        "config": trigger.config,
        "enabled": trigger.enabled,
        "created_at": trigger.created_at.isoformat()
    }


@app.patch("/api/my/triggers/{trigger_id}")
async def update_trigger_instance(
    trigger_id: str,
    name: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a trigger instance.
    User can update name, config, or enabled status.
    """
    trigger = db.query(models.UserTriggerInstance).filter(
        models.UserTriggerInstance.id == trigger_id,
        models.UserTriggerInstance.user_id == user_id
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")

    # Update fields
    if name is not None:
        trigger.name = name
    if config is not None:
        trigger.config = config
    if enabled is not None:
        trigger.enabled = enabled

    trigger.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(trigger)

    logger.info(f"Updated trigger instance {trigger_id}")

    # Update trigger with DynamicTriggerManager
    if trigger_manager:
        try:
            await trigger_manager.update_trigger(
                trigger_instance_id=trigger_id,
                user_id=user_id,
                template_id=trigger.template_id,
                config=trigger.config,
                enabled=trigger.enabled
            )
        except Exception as e:
            logger.error(f"Failed to update scheduled trigger {trigger_id}: {e}")

    return {
        "id": trigger.id,
        "name": trigger.name,
        "config": trigger.config,
        "enabled": trigger.enabled,
        "updated_at": trigger.updated_at.isoformat()
    }


@app.delete("/api/my/triggers/{trigger_id}")
async def delete_trigger_instance(
    trigger_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a trigger instance.
    """
    trigger = db.query(models.UserTriggerInstance).filter(
        models.UserTriggerInstance.id == trigger_id,
        models.UserTriggerInstance.user_id == user_id
    ).first()

    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")

    db.delete(trigger)
    db.commit()

    logger.info(f"Deleted trigger instance {trigger_id}")

    # Unregister trigger with DynamicTriggerManager
    if trigger_manager:
        try:
            await trigger_manager.unregister_trigger(trigger_id)
        except Exception as e:
            logger.error(f"Failed to unschedule trigger {trigger_id}: {e}")

    return {"message": "Trigger deleted successfully"}


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

    # Create context
    context = AgentContext(
        user_id=user_id,
        input_data=input_data,
        integrations=integrations,
        metadata={}
    )

    # Execute agent
    try:
        agent_instance = agent_class()
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

    # Execute workflow
    executor = WorkflowExecutor()
    try:
        result = await executor.execute_workflow(
            workflow_id=workflow_id,
            trigger_data=input_data or {},
            user_id=user_id,
            integrations=integrations
        )

        # Create execution record
        execution = models.WorkflowExecution(
            workflow_id=workflow_id,
            user_id=user_id,
            status="completed" if result["success"] else "failed",
            input_data=input_data or {},
            output_data=result.get("outputs", {}),
            error_message=result.get("error"),
            started_at=datetime.utcnow() - timedelta(seconds=result["duration_seconds"]),
            completed_at=datetime.utcnow(),
            duration_seconds=int(result["duration_seconds"])
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)

        logger.info(f"Workflow execution completed: {execution.id} (success={result['success']})")

        return {
            "execution_id": execution.id,
            "workflow_id": workflow_id,
            "status": execution.status,
            "success": result["success"],
            "outputs": result.get("outputs", {}),
            "error": result.get("error"),
            "duration_seconds": result["duration_seconds"]
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
            started_at=datetime.utcnow(),
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

    # Initialize DynamicTriggerManager
    logger.info("🔄 Initializing DynamicTriggerManager...")
    global trigger_manager
    from backend.database import SessionLocal
    trigger_manager = DynamicTriggerManager(
        db_session_factory=SessionLocal,
        workflow_executor=WorkflowExecutor()
    )
    await trigger_manager.start()
    logger.info(f"✅ DynamicTriggerManager initialized ({trigger_manager.get_active_trigger_count()} triggers active)")

    logger.info("✅ Clarity Agentic App ready!")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Cleanup on shutdown.
    """
    logger.info("👋 Shutting down Clarity Agentic App...")

    # Stop DynamicTriggerManager
    if trigger_manager:
        await trigger_manager.stop()

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
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
