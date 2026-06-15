# Workflow Implementation Prompt (v2 manifest-first)

**Quick reference for adding a workflow.** A workflow is a **YAML DAG declared in
`intelligence.yaml#workflows`** — there are NO `backend/workflows/*.py` files and NO
`@workflow`/`@uses_agent` decorators. The SDK's workflow engine runs the YAML.

> Canonical reference: `.claude/skills/agentic-app-authoring.md` and the seed's `intelligence.yaml`.

---

## Declare the workflow in `intelligence.yaml`

```yaml
workflows:
  - id: your-workflow-id              # kebab-case, unique
    inputs:
      user_id: { type: string, required: true }
    steps:
      - id: fetch
        agent: fetch-agent            # EITHER agent: <id> OR tool: <id>
        input:
          user_id: "${input.user_id}"
      - id: analyze
        agent: analyze-agent
        input:
          user_id: "${input.user_id}"
          items: "${steps.fetch.output.items}"   # pipe an upstream step's output
        onError: { strategy: skip }              # don't abort the DAG on failure
      - id: report
        agent: report-agent
        input:
          user_id: "${input.user_id}"
          analysis: "${steps.analyze.output.analysis}"
    outputs:
      summary: "${steps.report.output.summary}"
```

### Expressions (how steps pass data)

- `${input.<key>}` — a workflow input.
- `${steps.<stepId>.output.<key>}` — an upstream step's output.
- A **missing reference FAILS the run** (no silent default). Only reference values you pass.

### Ordering / parallelism

The engine derives execution order from the data dependencies in the `${steps...}`
expressions. Two steps that don't reference each other can run in parallel; a step that
references another's output runs after it. There is no `execution_mode` flag — wire the
dependencies and the engine does the rest.

### Error handling

Per step: `onError: { strategy: skip }` (continue the DAG) or `{ strategy: retry }`.

### Multi-tenancy

Declare `user_id` in `inputs` and pass `user_id: "${input.user_id}"` into every step that
touches user data. The backend injects the caller's id when a trigger sends no body.

---

## ❌ FORBIDDEN (v1 — the runtime ignores these)

- `backend/workflows/*.py` files; `@workflow(...)`, `@uses_agent(...)`, `ExecutionMode`,
  `WorkflowContext`, `context.get_step_result(...)`.
- Doing external API calls / DB writes "between steps" in Python — there is no Python
  workflow body. Put that work in a `@tool` and add it as a step (`tool: <id>`).

---

## Run it

Locally there is no scheduler — run on demand:

```bash
curl -X POST http://localhost:8000/api/workflows/your-workflow-id/execute \
  -H "Content-Type: application/json" -d '{}'
```

(The backend injects `user_id`; the widget updates after a run.) On the platform, a trigger
in `intelligence.yaml#triggers` fires the workflow on schedule.

## ✅ Checklist

- [ ] Workflow declared in `intelligence.yaml#workflows` (id, inputs, steps, outputs).
- [ ] Each step uses `agent:` or `tool:` + an `input:` map.
- [ ] Data piped via `${input.*}` / `${steps.*.output.*}`; every reference resolves.
- [ ] `user_id` declared in inputs and passed to each step.
- [ ] `onError` set where a step's failure should not abort the DAG.
- [ ] NO `backend/workflows/*.py`, NO `@workflow`/`@uses_agent`.

## 📚 Related

- `intelligence.yaml` — the manifest the SDK runs (see the workflows section)
- `.claude/prompts/implement-agent.md` — the agents these steps call
- `.claude/skills/agentic-app-authoring.md` — canonical authoring guide
