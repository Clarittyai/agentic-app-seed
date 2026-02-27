"""
Health Check Infrastructure

Automatic health check endpoint - users don't need to modify this.
Provides standard health status for monitoring and platform integration.
"""

from fastapi import APIRouter
from datetime import datetime
from typing import Dict, Any

router = APIRouter()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint.

    Required by Clarity platform for app monitoring and orchestration.
    Returns basic health status and version information.

    This endpoint is automatically available and doesn't need user configuration.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }
