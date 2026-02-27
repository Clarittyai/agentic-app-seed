"""
Agents Package

Add your agent files here - they will be auto-discovered on startup!

No need to edit this file. Just create your agent.py files in this directory:

Example:
    backend/agents/my_agent.py

    from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

    @agent(id="my-agent", name="My Agent")
    class MyAgent(BaseAgent):
        async def execute(self, context: AgentContext) -> AgentResult:
            return AgentResult(success=True, data={"result": "done"})

That's it! Your agent will be automatically registered on app startup.
"""

# No imports needed - auto-discovery handles it!
__all__ = []
