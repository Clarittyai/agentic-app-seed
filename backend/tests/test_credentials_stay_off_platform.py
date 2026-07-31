"""A hosted app must not hold, read, or resolve a credential itself.

The managed model is: the credential lives on the platform, the app calls a
brokered tool, and the token never enters this process. Two legacy self-host
paths also ran when hosted, quietly re-introducing exactly the exposure the
broker exists to remove:

  1. `store.get_credentials` decrypted the app's own credential table. The WRITE
     routes have returned 410 for a while, so a hosted app cannot put anything
     there — but a live reader plus a live `APP_ENCRYPTION_KEY` is a decryption
     path inside the process, and legacy rows from before the routes closed
     would still decrypt.
  2. The agent-execute endpoint loaded those rows into `integration_resolver`,
     handing credentials straight to agent code and, through it, within reach of
     the model.

Both are now gated on `CLARITTY_PLATFORM_URL`. Self-host keeps working, which is
why this is a gate rather than a deletion.
"""

import os

import pytest

from backend.integrations import store


@pytest.fixture
def on_platform(monkeypatch):
    monkeypatch.setenv("CLARITTY_PLATFORM_URL", "https://api.claritty.ai")


@pytest.fixture
def self_hosted(monkeypatch):
    monkeypatch.delenv("CLARITTY_PLATFORM_URL", raising=False)


def test_get_credentials_refuses_on_platform(on_platform):
    # No DB touched at all — the refusal is before the query, so a legacy row
    # cannot be decrypted even if one exists.
    assert store.get_credentials(None, "u1", "gmail") is None


def test_get_credentials_still_reads_when_self_hosted(self_hosted, monkeypatch):
    monkeypatch.setattr(
        store, "_row", lambda db, uid, svc: type("R", (), {"credentials": "enc"})()
    )
    monkeypatch.setattr(store.crypto, "decrypt", lambda blob: {"access_token": "t"})
    assert store.get_credentials(None, "u1", "gmail") == {"access_token": "t"}


def test_the_gate_is_the_platform_url_not_a_separate_flag(on_platform):
    # One switch decides "am I hosted", and it is the same one the adapters use
    # (`_platform_mode` / `_use_executor`). A second, independent flag is how the
    # two halves drift apart.
    assert os.environ.get("CLARITTY_PLATFORM_URL")
    assert store.get_credentials(None, "u1", "slack") is None


def test_agent_execute_does_not_load_credentials_when_hosted():
    """Guards the call site, not just the store — the endpoint built the resolver
    dict itself rather than going through `get_credentials`."""
    src = open("backend/main.py", encoding="utf8").read()
    start = src.index("# Get user integrations")
    window = src[start : start + 900]
    assert 'if not os.environ.get("CLARITTY_PLATFORM_URL")' in window
    # And the dead loader that copied envelopes into a dict is gone.
    assert "_load_user_integrations" not in src
