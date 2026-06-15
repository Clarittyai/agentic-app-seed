# Agent Implementation Prompt (v2 manifest-first)

**Quick reference for adding an agent.** The runtime is v2: an agent's "code" is a
**system prompt**, not a Python method. The SDK's tool-use loop drives the model and
invokes tools; the agent class NEVER implements `execute()`.

> Canonical reference: `.claude/skills/agentic-app-authoring.md` and the seed's `intelligence.yaml`.

---

## 1. Declare the agent in `intelligence.yaml` (schema lives here)

```yaml
agents:
  - id: your-agent-id                 # kebab-case, unique
    source: custom
    # ONE instruction source — prefer promptFile (zero-Python):
    promptFile: backend/custom/agents/your_agent_id/prompt.md
    # …or a Python handler class (only when you need before/after/fallback hooks):
    # handler: backend.agents.your_agent:YourAgent
    description: What this agent does in one sentence.
    model: claude-sonnet-4-6
    integrations: []                  # ids the agent's tools need (e.g. [gmail])
    tools: [app.save_item]            # tool ids the agent may call
    input:
      user_id: { type: string, required: true }
      limit:   { type: integer, required: false }
    output:
      saved_count: { type: integer, required: true }
      summary:     { type: string,  required: true }
    timeout: 120
```

## 2a. Zero-Python agent (PREFERRED) — author a prompt

Create `backend/custom/agents/your_agent_id/prompt.md` — pure prose, no code:

```markdown
You are <role>. On each run you <goal> for the user to review.

Steps on every invocation:
1. Call <tool-id> to read/act on the user's data (reference tools by their intelligence.yaml id).
2. For each item, <decide/draft> grounded ONLY in that data — never fabricate.
3. Call app.save_item per item with {…} (it persists a PENDING_APPROVAL item).
4. Call __finish with {saved_count, summary} matching the agent's output schema.

Rules: be conservative; never invent a value; finish calmly with the schema fields.
```

The SDK binds its `GenericAgent` and runs the tool-use loop from this prompt. No Python.

## 2b. Handler-class agent (only when you need hooks/offline fallback)

```python
"""Your agent — v2: a system_prompt + optional hooks. NO execute()."""
from claritty_sdk import agent, AgentContext, BaseAgent

SYSTEM_PROMPT = """You are <role>. … call <tool-id> … then call __finish with {…}."""

@agent(id="your-agent-id")            # id ONLY — schema is in intelligence.yaml
class YourAgent(BaseAgent):
    system_prompt = SYSTEM_PROMPT

    def fallback(self, ctx: AgentContext) -> dict:
        """No-LLM local path: deterministic result matching the output schema.
        The SDK calls this instead of the model when the proxy is unconfigured."""
        return {"saved_count": 0, "summary": "Local run (no LLM proxy)."}
```

---

## ❌ FORBIDDEN (this is the v1 shape — the runtime rejects it at boot; the app does nothing)

- `def execute(self, ...)` / returning `AgentResult` — the v2 runtime never calls `execute()`.
- `get_llm_client()`, `from claritty_sdk.llm import …`, `run_tool(...)` — the loop drives the
  model and invokes tools; the agent must not.
- `import openai|anthropic|aiohttp|requests|httpx` inside an agent — agents do NO HTTP/LLM I/O.
  Reach external services ONLY from `@tool` functions via `ctx.integration(...)`.
- Schema in the `@agent(...)` decorator — schema lives in `intelligence.yaml`. The decorator takes `id` only.

---

## Tools (how an agent does real work)

Agents act through tools declared in `intelligence.yaml#tools` and listed in the agent's `tools:`.
A custom tool is `backend/custom/tools/<id>/impl.py`:

```python
from claritty_sdk import tool, ToolCtx

@tool(id="app.save_item")
def run(input: dict, ctx: ToolCtx) -> dict:
    # scope by ctx.user_id; reach a connected service via ctx.integration("gmail")
    return {"item_id": "..."}
```

Multi-tenancy: every tool/route/model scopes data by a single `user_id` (the X-User-ID key).
The workflow passes it as `${input.user_id}`.

---

## ✅ Checklist

- [ ] Agent declared in `intelligence.yaml#agents` with full input/output schema + tools + integrations.
- [ ] Exactly ONE instruction source: `promptFile` (preferred) or a `handler` class.
- [ ] NO `execute()` / `AgentResult` / `get_llm_client` / `run_tool` / HTTP-LLM imports.
- [ ] System prompt tells the agent which tools to call and to end with `__finish` matching the output schema.
- [ ] Handler-class agents needing the model ship a `fallback(ctx) -> dict`.
- [ ] All data access scoped by `user_id`.

## 📚 Related

- `backend/agents/example_agent.py` — v2 reference (system_prompt + fallback)
- `intelligence.yaml` — the manifest the SDK runs
- `.claude/skills/agentic-app-authoring.md` — canonical authoring guide
