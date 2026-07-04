# B4 — Agent pattern library

Five reusable agent shapes that cover the department portfolio. Each is a custom
agent (manifest-first SDK v2: a class with a `system_prompt`, driven by the
tool-use loop) wired in `intelligence.yaml`. They compose the same two reusable pieces:

- **`persist_item`** (`backend/shared/agent_tools.py`) — the agent's save tool
  calls this to drop a PENDING_APPROVAL item on the spine (audit + lifecycle for
  free). Each app's `backend/custom/tools/app_save_<x>/impl.py` is ~10 lines.
- The integration tools (`gmail.list_messages`, `gmail.send`, …) that
  materialize from `intelligence.yaml#integrations` at boot.

Reference implementation: the Sales flagship's `lead-assistant`
(`sales-lead-triage/backend/custom/agents/lead_assistant/agent.py`).

## The five patterns

1. **triage-classify** — read a stream (inbox/tickets/forms), classify each by
   type + urgency, score 0–100, drop the ones that matter as items. *(Sales,
   Support, HR, IT.)* Tool: `app.save_<item>` → `persist_item(..., score=...)`.

2. **draft-generate** — for each item that needs a reply/output, write a
   concise draft grounded ONLY in the source, save as PENDING_APPROVAL. NEVER
   send — approval happens in the app UI. *(Sales/Support follow-ups, Marketing
   content.)* Usually combined with triage-classify in one agent.

3. **extract-structured** — turn a document/email (invoice, resume, contract)
   into a typed record; save with the parsed fields in `payload` + domain
   columns via `extra`. *(Finance, HR, Operations, Legal.)*

4. **summarize-digest** — read across sources (read-only), produce one digest +
   highlights; surface via the DigestWidget/KpiMetricWidget — for Finance/Sales
   KPIs include a `trend` series so the widget shows the sparkline. No write
   side = safest demo. *(Exec daily digest, Support feedback, Finance KPI.)*

5. **schedule-dispatch** — decide timing/recipient for an approved item and hand
   to an adapter. *(Reminders, payment nudges, onboarding sequences.)* Pairs with
   a trigger; the actual external send still goes through the HITL `/approve`.

## System-prompt skeleton (adapt per app)

```
You are a <role>. On each run you <goal> and prepare <output> for the user to approve.

1. Call <integration>.<list-tool> (limit from input, default N). If not connected,
   finish immediately with counts=0 and summary="Connect <service> to ….".
2. For each item, decide <classification> and a score 0–100 (<criteria>). Reason
   from the content only — never invent senders/content.
3. For the items that qualify, <draft/extract> grounded ONLY in that item, then
   call app.save_<x> with {…}. You NEVER act externally — saving a PENDING item
   for the user to approve is all you do.
4. Call __finish with {triaged_count, drafted_count, summary} (one short sentence).

Rules: be conservative about what qualifies; keep drafts concise/in the user's
voice; never fabricate a recipient; finish calmly when there's nothing to do.
```

## Wiring checklist (per app)

- `intelligence.yaml`: declare the integration(s), the `app.save_<x>` custom tool, the
  agent (referencing the tool + integration), a workflow, and a daily trigger.
- `backend/custom/agents/<name>/agent.py`: the class + `system_prompt`.
- `backend/custom/tools/app_save_<x>/impl.py`: map tool input → `persist_item`.
- Frontend: compose the matching widget from `components/widgets/`
  (ApprovalCard for 1–2/draft-generate, Kpi + `trend` / Digest for
  summarize-digest). Data-heavy categories also LEAD the landing page with
  `frontend/src/components/charts` — see `docs/golden/INDEX.md`.
- Tailor every agent to the user: implement `before(ctx)` appending
  `profile_context(db, ctx.user_id)` (backend/shared/onboarding.py) to
  `ctx.user_context`, and let deterministic fallbacks read `get_answers(...)`
  for thresholds/goals. The onboarding CONVERSATION (persona + ask/ack script +
  the `lead_view` question) lives in `app-config.json` → `onboarding`; surface
  progress vs the user's stated target on the landing page.
- **Team shape — prefer 2–3 members with DISTINCT cognitive jobs** over one
  do-everything agent. The proven pair for goal-driven apps: a **per-item
  analyst** (judge each record: flags, next best action) chained into a
  **cross-book strategist** (coverage math vs the user's onboarding targets →
  the top plays this week + a coach note, persisted for the dashboard). Same
  workflow, one step each; the strategist reads the profile via `before(ctx)`
  like every agent.
