"""
Example Agent - Task Analyzer

This is a MINIMAL example to demonstrate:
- How to create an agent with @agent decorator
- Input/output schema definition
- Simple AI logic (replace with your Claude API calls)
- Error handling patterns

REPLACE THIS with your own agent!
"""

from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


@agent(
    id="example-agent",
    name="Example Agent",
    description="Analyzes tasks to determine priority and suggest actions (replace with your logic)",
    category="productivity",
    inputs={
        "task_title": {
            "type": "string",
            "description": "The task title to analyze",
            "required": True
        },
        "task_description": {
            "type": "string",
            "description": "Optional detailed description",
            "required": False
        }
    },
    outputs={
        "priority": {
            "type": "string",
            "description": "Task priority (low, medium, high, urgent)",
        },
        "suggested_actions": {
            "type": "array",
            "description": "List of suggested next steps"
        }
    },
    timeout=30
)
class ExampleAgent(BaseAgent):
    """
    Minimal agent example.

    In production: Replace this logic with Claude API calls for intelligent analysis.
    """

    async def execute(self, context: AgentContext) -> AgentResult:
        """
        Execute the agent's core logic.

        This is where you:
        1. Get input data from context
        2. Call Claude API or other services
        3. Process results
        4. Return AgentResult with success/failure
        """
        try:
            # Step 1: Get input data
            task_title = context.get_input("task_title")
            task_description = context.get_input("task_description", "")

            context.log("info", f"Analyzing task: {task_title}")

            # Step 2: Your AI logic here (currently simple rules)
            # TODO: Replace with Claude API call using ANTHROPIC_API_KEY
            priority = self._calculate_priority(task_title)
            actions = self._suggest_actions(task_title)

            # Step 3: Return results
            result_data = {
                "priority": priority,
                "suggested_actions": actions
            }

            context.log("info", f"Analysis complete: priority={priority}")

            return AgentResult(
                success=True,
                data=result_data,
                metadata={
                    "agent_id": "example-agent",
                    "task_title": task_title
                }
            )

        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            return AgentResult(
                success=False,
                error=f"Analysis failed: {str(e)}"
            )

    def _calculate_priority(self, title: str) -> str:
        """
        Simple rule-based priority calculation.

        TODO: Replace with Claude API for intelligent analysis:

        from anthropic import Anthropic
        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            messages=[{
                "role": "user",
                "content": f"Analyze priority of task: {title}"
            }]
        )
        """
        title_lower = title.lower()

        if any(word in title_lower for word in ["urgent", "asap", "critical"]):
            return "urgent"
        elif any(word in title_lower for word in ["important", "deadline"]):
            return "high"
        else:
            return "medium"

    def _suggest_actions(self, title: str) -> list:
        """
        Suggest next actions.

        TODO: Replace with Claude API for intelligent suggestions.
        """
        actions = ["Review task requirements"]

        if "meeting" in title.lower():
            actions.extend([
                "Check calendar availability",
                "Prepare agenda",
                "Send meeting invite"
            ])
        else:
            actions.extend([
                "Break down into subtasks",
                "Identify dependencies"
            ])

        return actions
