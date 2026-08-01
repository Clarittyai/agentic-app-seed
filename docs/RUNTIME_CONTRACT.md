# Runtime contract

`RUNTIME_CONTRACT` at the repo root holds a single integer. It is forked into
every app's source, so it travels with the code that ends up in the image, and
the platform reads it back to know **what the app it is about to deploy can
actually do** — as opposed to when the deploy happened, which says nothing.

Bump it when the app's side of a platform↔app protocol changes in a way the
platform must not assume. Never reuse a number.

| Contract | The app can... |
|---|---|
| *(absent)* | Only the original protocol: authenticate inbound calls with the shared `CLARITY_INTERNAL_SECRET`, and present it outbound. |
| `2` | Verify **inbound** calls against its own per-app secret (`CLARITY_APP_INTEGRATION_SECRET`), and present per-app identity **outbound** via `claritty_sdk.internal_auth`. Needs `claritty-sdk >= 2.10.0`. |

## Why the platform needs this

`CLARITY_INTERNAL_SECRET` is the same value in every deployed app, and it is the
key every per-app secret is derived from:

```
perAppIntegrationSecret(appId) = HMAC-SHA256(CLARITY_INTERNAL_SECRET, appId)
```

So any app that can read its own environment can derive every other app's
identity. Removing it from app environments is the structural fix, and contract
`2` is what makes removal safe to do **per app**: an app on an older image needs
the shared secret in both directions, and taking it away would break its
integrations while simultaneously unauthenticating its `/internal/*` routes —
because the old inbound guard treats an unset secret as "allow everything".

The platform stamps the contract it read onto the app row when it lays down
source, and withholds the shared secret from any app at contract `2` or above.
Apps drain as they are redeployed; nothing has to happen fleet-wide at once.

## Adding a contract level

1. Ship the app-side capability (seed code, and an SDK floor bump if needed).
2. Bump `RUNTIME_CONTRACT` and add a row above.
3. Teach the platform what the new level permits.

Step 3 last: the platform must never assume a capability before an app can
report it.
