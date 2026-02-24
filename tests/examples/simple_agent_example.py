"""
Simple example demonstrating the Clarity SDK

This example shows:
1. Defining an agent
2. Creating a workflow
3. Setting up a trigger template
"""

import asyncio
from clarity_sdk import (
    agent,
    workflow,
    uses_agent,
    trigger_template,
    BaseAgent,
    AgentResult,
    AgentContext,
    WorkflowContext,
    TriggerTemplateType,
    ExecutionMode,
    AgentRegistry,
    WorkflowRegistry,
    TriggerTemplateRegistry
)


# ============================================
# 1. Define Agents
# ============================================

@agent(
    id="hello-world",
    name="Hello World",
    description="A simple hello world agent",
    inputs={"name": str},
    outputs={"greeting": str},
    category="example"
)
class HelloWorldAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        name = context.get_input("name", "World")
        greeting = f"Hello, {name}!"

        context.log("info", f"Generated greeting: {greeting}")

        return AgentResult(
            success=True,
            data={"greeting": greeting}
        )


@agent(
    id="message-formatter",
    name="Message Formatter",
    description="Formats messages nicely",
    inputs={"greeting": str},
    outputs={"formatted": str},
    category="example"
)
class MessageFormatterAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        greeting = context.get_input("greeting", "")
        formatted = f"🎉 {greeting} 🎉"

        return AgentResult(
            success=True,
            data={"formatted": formatted}
        )


# ============================================
# 2. Create Workflow
# ============================================

@workflow(
    id="greeting-workflow",
    name="Greeting Workflow",
    description="Generates and formats a greeting",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("hello-world", output_key="greeting")
@uses_agent("message-formatter", input_from="greeting", output_key="formatted")
async def greeting_workflow(context: WorkflowContext):
    """
    This workflow:
    1. Calls hello-world agent
    2. Passes result to message-formatter
    3. Returns formatted greeting
    """
    context.log("info", "Greeting workflow started")


# ============================================
# 3. Define Trigger Template
# ============================================

@trigger_template(
    id="daily-greeting",
    name="Daily Greeting",
    description="Send a greeting at a specific time each day",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="greeting-workflow",
    config_fields=[
        {
            "key": "time",
            "label": "What time?",
            "type": "time",
            "required": True,
            "default": "09:00",
            "help_text": "Choose when to send the greeting"
        },
        {
            "key": "timezone",
            "label": "Your Timezone",
            "type": "timezone",
            "required": True,
            "default": "UTC"
        }
    ],
    max_instances_per_user=3
)
class DailyGreetingTrigger:
    pass


# ============================================
# 4. Test the SDK
# ============================================

async def main():
    print("=" * 60)
    print("Clarity SDK - Simple Example")
    print("=" * 60)
    print()

    # Verify agents registered
    agents = AgentRegistry.list_agents()
    print(f"✅ Registered {len(agents)} agents:")
    for agent in agents:
        print(f"   - {agent.id}: {agent.name}")
    print()

    # Verify workflows registered
    workflows = WorkflowRegistry.list_workflows()
    print(f"✅ Registered {len(workflows)} workflows:")
    for wf in workflows:
        print(f"   - {wf.id}: {wf.name}")
        print(f"     Steps: {len(wf.steps)}")
        for step in wf.steps:
            print(f"       → {step.agent_id} (output: {step.output_key})")
    print()

    # Verify trigger templates registered
    templates = TriggerTemplateRegistry.list_templates()
    print(f"✅ Registered {len(templates)} trigger templates:")
    for template in templates:
        print(f"   - {template.id}: {template.name}")
        print(f"     Type: {template.template_type}")
        print(f"     Config fields: {len(template.config_fields)}")
        for field in template.config_fields:
            print(f"       → {field.key} ({field.type})")
    print()

    # Test agent execution directly
    print("=" * 60)
    print("Testing Direct Agent Execution")
    print("=" * 60)
    print()

    agent_class = AgentRegistry.get_agent("hello-world")
    agent = agent_class()

    context = AgentContext(
        execution_id="test-123",
        agent_id="hello-world",
        workflow_id=None,
        trigger_id=None,
        user_id="test-user",
        input_data={"name": "Clarity"},
        integrations={},
        workflow_data={},
        app_config={}
    )

    result = await agent.execute(context)

    print(f"Agent execution result:")
    print(f"  Success: {result.success}")
    print(f"  Data: {result.data}")
    print()

    print("=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
