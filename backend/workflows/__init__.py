"""
Workflows Package

Add your workflow files here - they will be auto-discovered on startup!

No need to edit this file. Just create your workflow.py files in this directory:

Example:
    backend/workflows/my_workflow.py

    from claritty_sdk import workflow, uses_agent, ExecutionMode

    @workflow(id="my-workflow", name="My Workflow", execution_mode=ExecutionMode.SEQUENTIAL)
    @uses_agent("agent-1", output_key="step1")
    @uses_agent("agent-2", input_from="step1", output_key="step2")
    async def my_workflow(context):
        pass

That's it! Your workflow will be automatically registered on app startup.
"""

# No imports needed - auto-discovery handles it!
__all__ = []
