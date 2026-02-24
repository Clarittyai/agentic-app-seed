"""
Task Analyzer Agent

Analyzes tasks and provides priority, estimated duration, and suggested actions.
"""

from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


@agent(
    id="task-analyzer",
    name="Task Analyzer",
    description="Analyzes tasks to determine priority, estimate duration, and suggest next actions",
    category="productivity",
    inputs={
        "task_title": {
            "type": "string",
            "description": "The task title",
            "required": True
        },
        "task_description": {
            "type": "string",
            "description": "Detailed task description",
            "required": False
        },
        "due_date": {
            "type": "string",
            "description": "Task due date (ISO format)",
            "required": False
        }
    },
    outputs={
        "priority": {
            "type": "string",
            "description": "Task priority (low, medium, high, urgent)",
        },
        "estimated_duration_minutes": {
            "type": "integer",
            "description": "Estimated time to complete in minutes"
        },
        "suggested_actions": {
            "type": "array",
            "description": "List of suggested next actions"
        },
        "analysis": {
            "type": "string",
            "description": "Detailed analysis text"
        }
    },
    integrations=[],  # No external integrations required
    timeout=30
)
class TaskAnalyzerAgent(BaseAgent):
    """
    Analyzes tasks using Claude AI to provide intelligent insights.
    """

    async def execute(self, context: AgentContext) -> AgentResult:
        """
        Execute task analysis.
        """
        try:
            # Get input data
            task_title = context.get_input("task_title")
            task_description = context.get_input("task_description", "")
            due_date = context.get_input("due_date", None)

            context.log("info", f"Analyzing task: {task_title}")

            # Simple rule-based analysis (in production, use Claude API)
            priority = self._calculate_priority(task_title, task_description, due_date)
            duration = self._estimate_duration(task_title, task_description)
            actions = self._suggest_actions(task_title, task_description)
            analysis = self._generate_analysis(task_title, priority, duration)

            result_data = {
                "priority": priority,
                "estimated_duration_minutes": duration,
                "suggested_actions": actions,
                "analysis": analysis
            }

            context.log("info", f"Analysis complete: priority={priority}, duration={duration}min")

            return AgentResult(
                success=True,
                data=result_data,
                metadata={
                    "agent_id": "task-analyzer",
                    "task_title": task_title
                }
            )

        except Exception as e:
            logger.error(f"Task analysis failed: {e}")
            return AgentResult(
                success=False,
                error=f"Analysis failed: {str(e)}"
            )

    def _calculate_priority(self, title: str, description: str, due_date: str) -> str:
        """
        Simple rule-based priority calculation.
        In production, use Claude API for intelligent analysis.
        """
        title_lower = title.lower()

        # Check for urgent keywords
        if any(word in title_lower for word in ["urgent", "asap", "critical", "emergency"]):
            return "urgent"

        # Check for high priority keywords
        if any(word in title_lower for word in ["important", "deadline", "meeting", "presentation"]):
            return "high"

        # Check if due date is soon
        if due_date:
            # In production, parse date and check if it's within 24 hours
            return "high"

        # Default to medium
        return "medium"

    def _estimate_duration(self, title: str, description: str) -> int:
        """
        Estimate task duration in minutes.
        In production, use Claude API for better estimates.
        """
        # Simple heuristic based on description length
        description_length = len(description) if description else 0

        if description_length > 500:
            return 120  # 2 hours for complex tasks
        elif description_length > 200:
            return 60  # 1 hour for medium tasks
        elif description_length > 50:
            return 30  # 30 minutes for small tasks
        else:
            return 15  # 15 minutes for quick tasks

    def _suggest_actions(self, title: str, description: str) -> list:
        """
        Suggest next actions for the task.
        In production, use Claude API for intelligent suggestions.
        """
        actions = ["Review task requirements"]

        title_lower = title.lower()

        if "meeting" in title_lower:
            actions.extend([
                "Check calendar availability",
                "Prepare agenda",
                "Send meeting invite"
            ])
        elif "email" in title_lower or "contact" in title_lower:
            actions.extend([
                "Draft email",
                "Verify recipient address",
                "Schedule send time"
            ])
        elif "research" in title_lower:
            actions.extend([
                "Identify key sources",
                "Create research outline",
                "Allocate time blocks"
            ])
        else:
            actions.extend([
                "Break down into subtasks",
                "Identify dependencies",
                "Set milestone checkpoints"
            ])

        return actions

    def _generate_analysis(self, title: str, priority: str, duration: int) -> str:
        """
        Generate analysis summary.
        """
        return (
            f"Task '{title}' has been classified as {priority} priority "
            f"with an estimated completion time of {duration} minutes. "
            f"Consider scheduling this task based on its priority level and your available time."
        )
