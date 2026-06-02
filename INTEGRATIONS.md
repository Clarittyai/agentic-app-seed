# Connecting external services (do this when your app acts on the outside world)

> If your app's core verb hits an external system — **post** to LinkedIn, **send** an email,
> **charge** with Stripe, **sync** to Notion — then "generate the content" is only half the app.
> You MUST also ship a way for the user to **connect** that service, or the app can't do its job.
> The AI assistant should add this **proactively**, even if the user didn't name the platform.

This is the lightweight, reliable pattern (no heavy framework). It's exactly what the example
LinkedIn app uses. Copy it.

---

## The rule

If the brainstorm's **external action** is non-empty, build all three:
1. a **Connect** screen so the user can link the service,
2. **per-user credential storage** (the `UserIntegration` model — already in the seed),
3. a **pluggable action** that uses real creds when present and **simulates** otherwise — so the
   app always demos end-to-end, even before the user connects anything.

Never block the whole app on a missing key: degrade to a clearly-labeled "simulated" result.

---

## Backend

### 1. Store creds per user (reuse `UserIntegration`)
`backend/models.py` already ships `UserIntegration` (`user_id`, `service`, `credentials` JSON,
`is_active`). Don't invent a new table. Store your service's creds as plain JSON under a
`service` key (e.g. `"linkedin"`). For stronger at-rest encryption see *Advanced* below.

### 2. Settings endpoints (in `backend/routes/app.py`)
```python
class LinkedInConnect(BaseModel):
    access_token: str
    author_urn: str

def _creds(db, user_id):
    """Prefer the user's connected creds; fall back to env; else (None, None)."""
    integ = (db.query(models.UserIntegration)
             .filter(models.UserIntegration.user_id == user_id,
                     models.UserIntegration.service == "linkedin",
                     models.UserIntegration.is_active == True).first())
    if integ and integ.credentials:
        c = integ.credentials
        if c.get("access_token") and c.get("author_urn"):
            return c["access_token"], c["author_urn"]
    return os.getenv("LINKEDIN_ACCESS_TOKEN"), os.getenv("LINKEDIN_AUTHOR_URN")

@router.get("/api/settings/linkedin")
async def li_status(x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
                    db: Session = Depends(get_db)):
    tok, urn = _creds(db, _resolve_user(x_user_id))
    return {"connected": bool(tok and urn), "author_urn": urn if (tok and urn) else None}

@router.put("/api/settings/linkedin")
async def li_connect(payload: LinkedInConnect,
                     x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
                     db: Session = Depends(get_db)):
    user_id = _resolve_user(x_user_id)
    integ = (db.query(models.UserIntegration)
             .filter(models.UserIntegration.user_id == user_id,
                     models.UserIntegration.service == "linkedin").first())
    if not integ:
        integ = models.UserIntegration(user_id=user_id, service="linkedin", auth_type="api-key")
        db.add(integ)
    integ.credentials = {"access_token": payload.access_token.strip(),
                         "author_urn": payload.author_urn.strip()}
    integ.is_active = True
    db.commit()
    return {"connected": True, "author_urn": integ.credentials["author_urn"]}
```
Never return the token to the client — only connection status.

### 3. Pluggable action (real or simulated)
```python
async def publish(content, token, author):
    if not token or not author:
        return {"ok": True, "simulated": True, "external_id": None}   # works without creds
    import httpx
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post("https://api.linkedin.com/v2/ugcPosts", headers={...}, json={...})
    return {"ok": r.status_code in (200, 201), "simulated": False,
            "external_id": r.headers.get("x-restli-id"), "error": None if r.status_code < 300 else r.text}
```
Call it from your `/approve` (or act) route with `token, author = _creds(db, user_id)` and store
`simulated` / `external_id` / `status` on the row.

### Runtime read inside an agent/workflow
`backend/main.py` builds an `integrations` dict onto the agent context from `UserIntegration`
rows, so an agent can read `context.integrations.get("linkedin")`. (For the simple pattern above,
reading in the route via `_creds()` is enough.)

---

## Frontend

- A **Connect page** (`frontend/src/pages/Settings.tsx`, route `/settings`, in the nav): inputs for
  the token/fields, a connected/simulated status badge, Save + Disconnect. `httpx`/axios to the
  endpoints above (`getLinkedInStatus`, `connectLinkedIn`, `disconnectLinkedIn` in `lib/api.ts`).
- A **status banner** on the landing page: when not connected, "approvals publish in *simulated*
  mode — tap to connect"; when connected, confirm it's live. (See the example app.)

---

## Secrets & env

- **Local:** creds entered in the Connect UI are stored in the DB. App-specific env vars (e.g.
  `LINKEDIN_ACCESS_TOKEN`) now reach the backend because `docker-compose.yml` loads `env_file: .env`
  — add them to `.env`.
- **Production:** the Claritty platform injects secrets; don't commit real tokens.
- Keep using `claritty_sdk.llm.get_llm_client` for the model — that's separate from user integrations.

---

## Advanced (optional)
The seed also contains a generic, catalog-driven integrations layer
(`backend/integrations/*`, `shared/integrations-catalog.json`, OAuth + Fernet encryption via
`APP_ENCRYPTION_KEY`). It's powerful but heavier and not wired by default. Most apps should use the
lightweight pattern above; reach for the generic layer only if you need OAuth or encrypted-at-rest
storage across many services.
