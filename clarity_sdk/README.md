# Clarity SDK

Professional Python SDK for building AI-powered agentic applications on the Clarity platform.

## Features

- **🤖 Agent Decorator** - Define AI agents with clean, declarative syntax
- **🔄 Workflow Orchestration** - Chain agents into multi-step workflows
- **⏰ User-Configurable Triggers** - Let users control when workflows run
- **🔌 Integration Management** - OAuth/API key handling built-in
- **📊 Type Safety** - Full Pydantic validation
- **🧪 Production Ready** - Error handling, retries, timeouts included

## Installation

```bash
pip install clarity-sdk
```

## Quick Start

### 1. Define an Agent

```python
from clarity_sdk import agent, BaseAgent, AgentContext, AgentResult

@agent(
    id="task-prioritizer",
    name="Task Prioritizer",
    description="Analyzes tasks and suggests priorities",
    inputs={"tasks": list},
    outputs={"priorities": dict},
    category="productivity"
)
class TaskPrioritizerAgent(BaseAgent):
    async def execute(self, context: AgentContext) -> AgentResult:
        tasks = context.get_input("tasks", [])

        # Your AI logic here
        priorities = self._analyze_tasks(tasks)

        return AgentResult(
            success=True,
            data={"priorities": priorities}
        )

    def _analyze_tasks(self, tasks):
        # Use LangChain, Claude SDK, or your own logic
        return {"high": [], "medium": [], "low": []}
```

### 2. Create a Workflow

```python
from clarity_sdk import workflow, uses_agent, ExecutionMode

@workflow(
    id="daily-task-summary",
    name="Daily Task Summary",
    description="Analyzes tasks and sends Slack summary",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("task-prioritizer", output_key="priorities")
@uses_agent("slack-notifier", input_from="priorities")
async def daily_task_summary(context):
    # Workflow executes automatically based on @uses_agent chain
    pass
```

### 3. Define a Trigger Template

```python
from clarity_sdk import trigger_template, TriggerTemplateType

@trigger_template(
    id="daily-review",
    name="Daily Task Review",
    description="Review your tasks at a specific time each day",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="daily-task-summary",
    config_fields=[
        {
            "key": "time",
            "label": "What time?",
            "type": "time",
            "required": True,
            "default": "09:00"
        },
        {
            "key": "timezone",
            "label": "Your Timezone",
            "type": "timezone",
            "required": True
        }
    ]
)
class DailyReviewTrigger:
    pass
```

**User Experience:**
- User sees "Daily Task Review" in platform UI
- User clicks "Create Trigger"
- User configures: 9:00 AM, America/New_York
- Workflow runs every day at 9 AM EST for that user!

## Core Concepts

### Agents

Agents are individual AI-powered units that perform specific tasks.

```python
@agent(
    id="unique-id",
    name="User-Facing Name",
    description="What this agent does",
    inputs={"key": type},      # Expected inputs
    outputs={"key": type},     # Expected outputs
    category="productivity",   # Category
    timeout=300               # Timeout in seconds
)
class MyAgent(BaseAgent):
    async def execute(self, context):
        # Your logic
        return AgentResult(success=True, data={...})
```

### Workflows

Workflows orchestrate multiple agents.

```python
@workflow(id="my-workflow", name="My Workflow")
@uses_agent("agent-1", output_key="step1")
@uses_agent("agent-2", input_from="step1", output_key="step2")
async def my_workflow(context):
    # Optional custom logic
    pass
```

### Triggers

Triggers define when workflows run - **configured by end users**.

```python
@trigger_template(
    id="my-trigger",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="my-workflow",
    config_fields=[...]  # User-configurable fields
)
class MyTrigger:
    pass
```

## Integration Requirements

Agents can declare integration requirements (OAuth, API keys):

```python
@agent(
    id="slack-notifier",
    integrations=[{
        "service": "slack",
        "auth_type": "oauth",
        "description": "Connect your Slack workspace",
        "scopes": ["chat:write"],
        "config_fields": [{
            "key": "bot_token",
            "label": "Bot Token",
            "type": "password",
            "required": True
        }]
    }]
)
class SlackNotifierAgent(BaseAgent):
    async def execute(self, context):
        # Get user's connected Slack credentials
        slack = context.get_integration("slack")

        if not slack:
            return AgentResult(
                success=False,
                error="Slack not connected"
            )

        # Use credentials
        # ...
```

## Context Objects

### AgentContext

Provided to agents during execution:

```python
# Get input data
tasks = context.get_input("tasks", [])

# Get integration credentials
slack = context.get_integration("slack")

# Get workflow data
previous_result = context.get_workflow_data("previous_step")

# Get app config
api_key = context.get_config("api_key")

# Log
context.log("info", "Processing tasks", count=len(tasks))
```

### WorkflowContext

Provided to workflows:

```python
# Get trigger data
trigger_data = context.get_trigger_data()

# Get step outputs
analysis = context.get_step_output("analysis")

# Log
context.log("info", "Workflow started")
```

## Trigger Template Types

| Type | Description | User Configures |
|------|-------------|-----------------|
| `SCHEDULE_DAILY` | Daily at specific time | Time, timezone, days |
| `SCHEDULE_CRON` | Custom cron expression | Cron expression, timezone |
| `SCHEDULE_INTERVAL` | Every X seconds | Interval duration |
| `DATA_THRESHOLD` | When value crosses threshold | Metric, threshold, operator |
| `DATA_CHANGE` | When database record changes | Table, operation, filter |
| `WEBHOOK` | External webhook | Endpoint, auth |
| `MANUAL` | User clicks button | Nothing (just execute) |

## Config Field Types

For `config_fields` in trigger templates:

| Type | Description | Example |
|------|-------------|---------|
| `time` | Time picker (HH:MM) | "09:00" |
| `timezone` | Timezone selector | "America/New_York" |
| `number` | Numeric input | 42 |
| `text` | Text input | "My trigger" |
| `select` | Dropdown | "option1" |
| `multiselect` | Multiple choice | ["opt1", "opt2"] |
| `boolean` | Toggle | true |
| `cron` | Cron expression | "0 9 * * 1-5" |
| `secret` | Auto-generated secret | (hidden) |
| `date` | Date picker | "2026-02-18" |
| `datetime` | DateTime picker | "2026-02-18T09:00:00Z" |

## Development

### Install for Development

```bash
git clone https://github.com/clarity-platform/clarity-sdk
cd clarity-sdk
pip install -e ".[dev]"
```

### Run Tests

```bash
pytest
pytest --cov=clarity_sdk  # With coverage
```

### Type Checking

```bash
mypy clarity_sdk
```

### Formatting

```bash
black clarity_sdk
```

## Examples

See the `/examples` directory for complete examples:

- `examples/task_manager/` - Task management app with Slack integration
- `examples/data_pipeline/` - Data processing pipeline with parallel execution
- `examples/chatbot/` - Conversational agent with memory

## Documentation

- [Complete Design Document](../AGENTIC_APP_SEED_COMPLETE_DESIGN.md)
- [Trigger System Design](../TRIGGER_SYSTEM_DESIGN.md)
- [API Reference](https://docs.clarity.com/sdk)

## Support

- **Discord**: https://discord.gg/clarity
- **Documentation**: https://docs.clarity.com
- **Issues**: https://github.com/clarity-platform/clarity-sdk/issues

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

**Built with ❤️ by the Clarity Platform team**
