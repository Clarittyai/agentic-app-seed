# Connecting external services (do this when your app acts on the outside world)

> If your app's core verb hits an external system — **post** to LinkedIn, **send** an email,
> **charge** with Stripe, **sync** to Notion — then "generate the content" is only half the app.
> You MUST also ship a way for the user to **connect** that service, or the app can't do its job.
> The AI assistant should add this **proactively**, even if the user didn't name the platform.

Integrations are **platform-owned**. The user connects a service once (OAuth/API key) through the
platform; credentials are stored **encrypted at rest (KMS) on the platform**, never in the app's own
database and never in the app's env. Your code reaches a connected service through the SDK — it never
sees raw OAuth client secrets.

---

## The rule (read this — it's the #1 thing apps get wrong)

If the app's **external action** is non-empty, do all three:
1. **Declare** the integration in `intelligence.yaml#integrations` (`- id: <id>`). Connecting is
   platform-brokered — OAuth/keys run on the platform and tokens live in the broker; the app **never
   stores or exchanges a credential**. The end user connects IN-CONTEXT via the seed's shared
   primitives (`<IntegrationsChecklist>`, `<ConnectButton>`, `toast.showApiError`), which open the
   platform-hosted connect popup. **Do NOT build your own OAuth exchange, credential storage, or a
   bespoke Integrations settings page** (see "Frontend — connect IN-CONTEXT" below).
2. the **action**, performed through a real catalog tool (e.g. `linkedin.create_post`),
3. **honest failure**: when the service isn't connected, surface a clear "connect X to do this"
   state (HTTP **409** from the route, an inline prompt at the action) — and when the external call
   fails, surface the error.

**NEVER fake success.** Do not "simulate" a post, do not swallow the error and mark the row as done,
do not downgrade `posted` → `approved` in an `except`. A user who clicks Approve and sees "posted"
must actually have a post on LinkedIn. Faking it is the worst possible outcome — it hides a broken app.

---

## How an agent or tool reaches a connected service

Inside a `@tool` handler (or an agent's tools), call `ctx.integration("<id>")` — or use the
integration's **provided catalog tool** directly. The catalog ships real tools; e.g. the `linkedin`
integration provides `linkedin.fetch_posts` and `linkedin.create_post`. Reference them by their
dotted id in your agent's `system_prompt` and list them in `intelligence.yaml#agents[].tools`; the tool-use
loop dispatches them. A provided tool returns `{"error": "<id>_not_connected"}` when the user hasn't
connected the service — handle that, don't crash.

```python
from claritty_sdk import tool, ToolCtx

@tool(id="app.publish_draft")
def publish_draft(input: dict, ctx: ToolCtx) -> dict:
    li = ctx.integration("linkedin")          # ConnectedIntegration or None
    if li is None:
        return {"error": "linkedin_not_connected"}
    # ... call li / a provided tool; raise on a real failure, never fake a post id.
```

Agents do **not** call the LLM or import `openai`/`requests` themselves, and do **not** call a
`run_tool()` helper (there is none). They declare tools in `intelligence.yaml`; the loop invokes them.

---

## Publishing from a human-in-the-loop route (the Approve button)

When the user approves a draft, the route should invoke the real publish tool and translate the
result into honest HTTP:

```python
import inspect
from claritty_sdk import decorators as _sdk
from claritty_sdk.context import ToolCtx
from claritty_sdk.integrations.client import make_resolver

@router.post("/{item_id}/approve")
async def approve_post(item_id: str, db=Depends(get_db), user_id: str = Depends(require_user)):
    row = _get_owned_draft(db, item_id, user_id)        # 404 if missing, 400 if not a draft
    handler = _sdk.get_registered_tool("linkedin.create_post")
    if handler is None:
        raise HTTPException(500, "publish tool not registered")
    ctx = ToolCtx(user_id=user_id, integration_resolver=make_resolver(user_id, optional_ids=set()))
    result = handler({"text": row.draft_text}, ctx)
    if inspect.isawaitable(result):
        result = await result
    if isinstance(result, dict) and result.get("error") == "linkedin_not_connected":
        raise HTTPException(409, "LinkedIn not connected — connect it to publish")
    post_id = result["post_id"]                          # KeyError → 500; do NOT swallow
    row.status, row.external_id = "posted", str(post_id)
    db.commit(); db.refresh(row)
    return row.to_dict()
```

A missing connection is a **409** (the UI turns it into a connect prompt); a real LinkedIn failure
bubbles up as a 5xx with the row left un-posted for retry. Only a genuine `post_id` flips to `posted`.

---

## Frontend — connect IN-CONTEXT, using the provided primitives

The end user connects **inside the app**, but the app **never handles a credential**: connecting
opens a platform-hosted popup (`app.claritty.ai/connect/{appId}/{integration}`) that runs OAuth / key
entry on the platform and stores the token in the broker. The app only opens the deep link and
listens for a "connected" message. Use the SHARED pieces the seed ships — do NOT hand-roll any of it:

- **First-run checklist:** `<IntegrationsChecklist>` is already mounted in `Layout.tsx`. It reads
  `GET /api/integrations/required` (each item carries a `connect_url`) and renders a `<ConnectButton>`
  per unconnected integration. It hides itself once everything is connected.
- **Inline CTA at the action:** on a not-connected **409**, call `toast.showApiError(err, { onConnected })`
  — it turns the error into an actionable "Connect {service}" toast (from the 409's `connect_url`) and
  runs `onConnected` (retry the action) after the popup returns. `toApiError` surfaces `service` +
  `connectUrl`.
- **Anywhere else:** `<ConnectButton integrationId name connectUrl onConnected />` (opens the popup via
  `lib/connect.ts#openConnectPopup`, with a redirect fallback if popups are blocked).

**Do NOT** build your own OAuth exchange, store credentials in the app DB, vendor OAuth client secrets,
or add a bespoke Integrations settings page. The legacy in-app connect/OAuth routes are retired
(they now return **410 Gone** with a `connect_url`). Declaring the integration in
`intelligence.yaml#integrations` + using the primitives above is the whole job.

---

## Secrets

- **Production:** the platform injects `CLARITTY_PLATFORM_URL` + `CLARITY_INTERNAL_SECRET`; the SDK
  uses them to fetch the user's decrypted credentials at call time. You store nothing.
- **Local:** set `CLARITTY_FAKE_CREDS_<INTEGRATION>` to a JSON bundle (e.g.
  `CLARITTY_FAKE_CREDS_LINKEDIN='{"access_token":"…","sub":"…"}'`) to exercise the path without OAuth.
- Keep using `claritty_sdk.llm.get_llm_client` for the model — that's separate from user integrations,
  and agents should not call it directly (the tool-use loop drives the model).
