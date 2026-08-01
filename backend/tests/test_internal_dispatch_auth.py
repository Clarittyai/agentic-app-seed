"""The app's own front door.

`/internal/run-workflow`, `/internal/run-due-triggers` and
`/internal/trigger-webhook` are guarded by `verify_internal_dispatch`. It
checked the shared `CLARITY_INTERNAL_SECRET` — identical in every deployed app,
so it cannot say WHO is calling — and, more dangerously, treated an unset secret
as "local dev, allow everything". Removing that variable from the app
environment would therefore not have tightened these routes, it would have
silently unauthenticated them.

The per-app secret (HMAC(master, appId), given to the app as
CLARITY_APP_INTEGRATION_SECRET) is OURS: a caller presenting it proves it holds
the master or was given this app's own value. Accepting it is what makes the
shared secret removable rather than merely unchecked.
"""

import os

import pytest
from fastapi import HTTPException

from backend.main import verify_internal_dispatch

SHARED = "platform-shared-secret"
PER_APP = "a1b2c3-per-app-hmac"


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    monkeypatch.delenv("CLARITY_INTERNAL_SECRET", raising=False)
    monkeypatch.delenv("CLARITY_APP_INTEGRATION_SECRET", raising=False)


def _call(internal=None, app_secret=None):
    verify_internal_dispatch(
        x_claritty_internal=internal, x_claritty_app_secret=app_secret
    )


def test_per_app_secret_is_accepted(monkeypatch):
    monkeypatch.setenv("CLARITY_APP_INTEGRATION_SECRET", PER_APP)
    _call(app_secret=PER_APP)  # no exception


def test_shared_secret_still_accepted(monkeypatch):
    monkeypatch.setenv("CLARITY_INTERNAL_SECRET", SHARED)
    _call(internal=SHARED)


def test_either_credential_opens_the_door(monkeypatch):
    monkeypatch.setenv("CLARITY_INTERNAL_SECRET", SHARED)
    monkeypatch.setenv("CLARITY_APP_INTEGRATION_SECRET", PER_APP)
    _call(internal=SHARED)
    _call(app_secret=PER_APP)


def test_an_app_without_the_shared_secret_is_still_guarded(monkeypatch):
    """The whole point.

    Previously `expected` was None here and every caller was allowed. Taking the
    shared secret out of app env would have opened these routes rather than
    closed them — the failure would have looked exactly like success.
    """
    monkeypatch.setenv("CLARITY_APP_INTEGRATION_SECRET", PER_APP)
    with pytest.raises(HTTPException) as e:
        _call()
    assert e.value.status_code == 401

    with pytest.raises(HTTPException):
        _call(internal=SHARED)  # a secret we have nothing to check against


def test_wrong_credentials_are_refused(monkeypatch):
    monkeypatch.setenv("CLARITY_INTERNAL_SECRET", SHARED)
    monkeypatch.setenv("CLARITY_APP_INTEGRATION_SECRET", PER_APP)
    for bad in (("nope", None), (None, "nope"), ("nope", "nope"), (None, None)):
        with pytest.raises(HTTPException) as e:
            _call(internal=bad[0], app_secret=bad[1])
        assert e.value.status_code == 401


def test_local_dev_with_no_secrets_configured_still_allows():
    # Nothing to check against; refusing would make the app un-runnable locally.
    assert os.getenv("CLARITY_INTERNAL_SECRET") is None
    _call()


def test_an_empty_configured_secret_is_not_a_credential(monkeypatch):
    # An empty env var must not become an accepted password.
    monkeypatch.setenv("CLARITY_APP_INTEGRATION_SECRET", "")
    monkeypatch.setenv("CLARITY_INTERNAL_SECRET", SHARED)
    with pytest.raises(HTTPException):
        _call(app_secret="")
    _call(internal=SHARED)
