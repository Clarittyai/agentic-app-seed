---
name: agentic-app-authoring
description: Auto-loads when Claude Code is in a Claritty agentic seed worktree. Teaches the five-primitive model, the manifest schema, the safe custom-tool escape hatch, and what NEVER to write to the repo.
trigger: project
---

# Agentic App Authoring (Claritty)

Auto-loaded when this seed is open. Read once per session, then act on it.

## You are authoring an app composed of five primitives

- **Integration** — a connected third-party (Gmail, Slack, GitHub…). Catalog-only. Lists provided tools.
- **Tool** — a typed function the runtime calls. Catalog (provided by an integration or standalone) or **custom** (you write it).
- **Agent** — an LLM + a toolset. Catalog or custom.
- **Workflow** — a declarative DAG. Always YAML in `intelligence.yaml`.
- **Trigger** — what fires a workflow (schedule, webhook). Catalog-only.

The single source of truth is **`intelligence.yaml`** at the seed root. Decorators
in `claritty_sdk` are binders; the manifest carries the data.

## Before writing any code: ground yourself

1. Read [`AGENTIC.md`](../../AGENTIC.md) (one-page overview).
2. Grep [`catalog/INDEX.md`](../../catalog/INDEX.md) for the integration / tool / agent you need. If it's there, reference it by id in `intelligence.yaml`. Don't reinvent.
3. If you must build something new, the **only** custom escape is custom tools and custom agents (custom integrations and custom triggers are refused — the platform owns OAuth and the dispatcher).
4. Skim [`SECURITY.md`](../../SECURITY.md). Internalize what you must never write.

## Custom tool template — copy/adapt, don't deviate

```python
from typing import Any, Dict
from claritty_sdk import tool, ToolCtx


@tool(id="app.your_id_here")  # MUST match the directory name
def run(input: Dict[str, Any], ctx: ToolCtx) -> Dict[str, Any]:
    """One-sentence description (shows up in the agent's tool list)."""
    # Call any integration the calling agent is bound to:
    # gmail = ctx.integration("gmail")
    # gmail.send(to=..., subject=..., body=...)
    return {"key": "value"}
```

Rules enforced by `claritty seed verify` AND by the platform's
`CustomToolService` (one rules file, two consumers —
`catalog/validators/custom-tools.rules.yaml`):

- Exact signature: `def run(input: Dict[str, Any], ctx: ToolCtx) -> Dict[str, Any]:`
- Decorator `@tool(id="…")` must match the tool's directory name
- File size ≤ 64 KiB UTF-8
- **Forbidden patterns**: `subprocess`, `eval`, `exec`, `compile`, `ctypes`, `__import__`, `os.system`, `open("/etc/…")`
- Imports allowed: `typing`, `claritty_sdk`, pure-Python stdlib without subprocess/eval/exec/ctypes surface. No third-party packages — use `ctx.integration(...)` for everything external

## Custom agent template

```python
from claritty_sdk import agent, BaseAgent


@agent(id="app.your_agent_id")
class Agent(BaseAgent):
    prompt_file = "prompt.md"  # the file next to this one
```

Then write `prompt.md` next to it. The `tools:` / `integrations:` /
`inputs:` / `outputs:` schema lives in `manifest.json` in the same dir,
NOT inline in Python.

## The secret boundary — non-negotiable

**Never write to the repo:**
- OAuth `client_id` / `client_secret` (the platform owns these)
- Access tokens or refresh tokens (per-invocation, from the platform)
- KMS keys, `CLARITTY_INTERNAL_SECRET`, `INTEGRATION_OAUTH_STATE_SECRET`
- Encrypted credential blobs
- Hard-coded URLs to internal endpoints

**Never log:**
- `ctx.integration(...)` return values
- `credentials.data`, `.token`, `.access_token`, `.refresh_token`, `.api_key`
- Full request/response bodies of integration calls

The SDK's `Credentials.__repr__` is redacted and the logger filter
strips token fields — but those are backstops, not your safety net.
Don't put secrets into `print()` or `f"…{token}…"`.

**Dev-time mock creds** (safe pattern): the SDK reads
`CLARITTY_FAKE_CREDS_<INTEGRATION_ID>` env vars during local testing.
Use these in `.env` (which is `.gitignored`). NEVER commit a real token
behind this pattern.

## Verify before you push

```sh
claritty seed verify   # validates intelligence.yaml, custom tools, scans for secrets
```

Pre-commit hook runs it automatically. CI runs it again on the PR. Both
hard-fail on token-shaped strings — there is no "warn-only" mode.

If a legitimate string trips the scanner (e.g. a CSS class that looks
like `sk-…`), add it to `.claritty-allowlist` (one regex per line) — but
think twice before doing so.

## Design & UI — make it look designed, not generated

When you build the frontend (`Dashboard.tsx`, `Widget.tsx`, pages), match the
**golden references** — they are the bar for polish and state-handling:

- [`docs/golden/Dashboard.golden.tsx`](../../docs/golden/Dashboard.golden.tsx)
- [`docs/golden/Widget.golden.tsx`](../../docs/golden/Widget.golden.tsx)

Study their hierarchy, spacing, and state handling; then ADAPT to this app's
domain — do not copy the content. The five non-negotiables they demonstrate:

1. **Theme tokens only** — `text-foreground` / `text-muted-foreground` /
   `text-accent` / `bg-card` / `border`. NEVER hardcode hex or a fixed Tailwind
   palette (`bg-indigo-500`, `#6366f1`) — it fights the per-app theme. Fill
   `frontend/src/theme.css` with the app's palette first.
2. **One primary action per view**; everything else is quiet/secondary.
3. **All three states, high-contrast** — skeleton while loading, a calm empty
   state (short line + the primary action), and a legible inline error with
   retry. Never a blank screen, a raw spinner, or muted-on-glass text.
4. **Mobile-first** — single column → grid at `md`; tap targets ≥ 44px; no
   horizontal scroll. (The Widget is the exception: fixed-frame, branches on the
   `size` prop only — no responsive prefixes inside it.)
5. **No AI tells** — no emoji in chrome, no decorative icons glued to headings,
   no rainbow/multi-stop gradients, no "Welcome to…" hero. lucide icons only
   where they aid scanning; sentence case; concise domain copy.

## When you don't know

- "Is this integration in the catalog?" → grep `catalog/INDEX.md`
- "What's the manifest schema?" → read `catalog/SCHEMA.json` (machine) or `claritty_sdk.manifest` (canonical Pydantic source)
- "What can a custom tool import?" → see the forbidden list above; anything not on it is OK if it's stdlib
- "Where do credentials come from at runtime?" → `ctx.integration(id)` — never construct them yourself
- "Why is my custom tool failing the validator?" → run `claritty seed verify` and read the line:col

## Anti-patterns Claude Code should refuse

- Writing OAuth code in the seed (refuse → "use a catalog integration; if it doesn't exist, surface as an unmatched intent")
- Inlining a token as a default arg (refuse → "platform-injected at runtime via `ctx.integration(...)`")
- Adding a third-party package to `requirements.txt` for an external API the catalog covers (refuse → "use the catalog integration")
- Inventing an integration id that's not in `catalog/INDEX.md` (refuse → "list the closest match + propose adding it to the catalog")
- Editing files under `catalog/` from the seed (refuse → "catalog is upstream; changes happen there, not in an app worktree")
