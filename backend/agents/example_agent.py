"""Example agent — v2 (manifest-first) shape.

Compare to the v1 file this replaces: that one carried the full schema
in the ``@agent(...)`` kwargs and implemented ``async def execute(self,
context) -> AgentResult`` that hand-rolled an LLM call and a
``json.loads``.

In v2 the decorator is a pure binder: id only. The schema (input,
output, model, tools, integrations, timeout) lives in
``app.yaml#agents``. The class supplies ``system_prompt`` (or a
Markdown prompt loaded by the catalog renderer) and optional
``before(ctx)`` / ``after(ctx, output)`` hooks; the SDK's
``claritty_sdk.runtime.tool_loop.run_agent`` drives the Anthropic
tool-use loop and validates the final output against the manifest's
``output:`` schema before returning it.
"""

from claritty_sdk import agent, BaseAgent


@agent(id="example-agent")
class ExampleAgent(BaseAgent):
    system_prompt = """\
You are a friendly greeting bot.

When invoked, you receive `{name: string}`. Call the `app.echo` tool
with a greeting message, then call `__finish` with
`{greeting: <the greeting>}`. Do not invent extra fields.
"""
