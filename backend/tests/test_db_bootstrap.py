"""Boot-time database wiring: migrations must run, and must not leak the password.

Both defects here were found in a live app's CloudWatch logs, on the same line:

    ⚠️  Alembic step skipped (invalid interpolation syntax in
    'postgresql://app_7ac1b8d7:<a real password>@claritty-production-postgres...
    ?options=-csearch_path%3Dtenant_x_app_y&sslmode=require' at position 197)

That one line is two problems:

  1. Alembic's Config is a ConfigParser with BasicInterpolation, so the `%3D` in
     the platform-issued search_path made every `upgrade head` raise. Migrations
     have never applied on any multi-tenant app; the additive reconciler kept the
     schema close enough to the models that nothing looked wrong.
  2. The exception text is the connection string, so printing it wrote a live
     database credential into CloudWatch on every cold start — retained,
     searchable, and readable by a far wider audience than the secret store.
"""

import configparser

from backend.database import _redact_db_urls

# The password here is FAKE. The shape is copied from a real log line —
# that is the point, since the bug is that this exact string was printed —
# but the credential itself must never be the live one.
REAL_SHAPE = (
    "postgresql://app_7ac1b8d7_891de962:NOT_A_REAL_PASSWORD_0000000000000"
    "@claritty-production-postgres.cqzamoyumjyf.us-east-1.rds.amazonaws.com:5432"
    "/clarity_platform?options=-csearch_path%3Dtenant_7ac1b8d7&sslmode=require"
)


def test_password_never_survives_redaction():
    out = _redact_db_urls(f"invalid interpolation syntax in '{REAL_SHAPE}' at position 197")
    assert "NOT_A_REAL_PASSWORD_0000000000000" not in out
    assert "***" in out


def test_redaction_keeps_the_message_diagnosable():
    # Host, user and the offending query string all stay — the point is to keep
    # the error useful, not to blank it out.
    out = _redact_db_urls(REAL_SHAPE)
    assert "app_7ac1b8d7_891de962" in out
    assert "rds.amazonaws.com" in out
    assert "search_path%3Dtenant_7ac1b8d7" in out


def test_redaction_leaves_ordinary_text_alone():
    msg = "relation 'items' already exists"
    assert _redact_db_urls(msg) == msg


def test_percent_must_be_doubled_before_alembic_reads_it():
    """The exact failure: a raw `%` is rejected the moment the option is SET —
    `before_set` validates interpolation — and doubling it is what lets the URL
    through. The message this raises ("invalid interpolation syntax in
    '<url>' at position N") is verbatim what production logged, password and all,
    which is why the redaction above matters.
    """
    cfg = configparser.ConfigParser()
    cfg.add_section("alembic")

    try:
        cfg.set("alembic", "sqlalchemy.url", REAL_SHAPE)
        raised = None
    except ValueError as e:
        raised = str(e)
    assert raised is not None, "expected a raw % to be rejected — the production bug"
    assert "invalid interpolation syntax" in raised

    cfg.set("alembic", "sqlalchemy.url", REAL_SHAPE.replace("%", "%%"))
    assert cfg.get("alembic", "sqlalchemy.url") == REAL_SHAPE


def test_env_py_doubles_the_percent():
    """Guards the call site itself, not just the technique."""
    from pathlib import Path

    src = (Path(__file__).resolve().parents[1] / "migrations" / "env.py").read_text()
    assert 'set_main_option("sqlalchemy.url", _db_url.replace("%", "%%"))' in src
