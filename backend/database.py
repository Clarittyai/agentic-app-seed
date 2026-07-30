"""
Database configuration and session management

Uses SQLAlchemy for ORM and connection pooling.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/clarity")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before using
    echo=os.getenv("DEBUG", "false").lower() == "true"
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _redact_db_urls(text: str) -> str:
    """Strip the password out of any connection URL in `text`.

    Driver and config errors quote the connection string back at you, password
    and all. Printing one puts a live database credential in CloudWatch, where it
    is retained, searchable, and readable by anyone with log access — a much
    wider audience than the secret store it came from. This was doing exactly
    that on every cold start of every deployed app.

    Redacts the credential portion of any `scheme://user:secret@host` it finds,
    keeping the user and host so the message stays diagnosable.
    """
    import re

    return re.sub(
        r"(\b[a-zA-Z][a-zA-Z0-9+.-]*://[^:/?#\s]+:)[^@\s]+(@)",
        r"\1***\2",
        text,
    )

# Base class for models
Base = declarative_base()


def get_db() -> Session:
    """
    Dependency to get database session.

    Usage in FastAPI:
        @app.get("/api/items")
        async def list_items(db: Session = Depends(get_db)):
            items = db.query(Item).all()
            return items
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _reconcile_missing_columns(engine):
    """
    Additively bring EXISTING tables up to the models: `ADD COLUMN` for any model
    column that the live table is missing. NEVER drops or alters a column — so
    data is always preserved.

    This closes the one gap that breaks generated apps on a redeploy: each app has
    a PERSISTENT per-app schema, and `create_all` only creates missing *tables* —
    it never ALTERs an existing one. So when an edit adds a field to a model whose
    table already exists, the live table keeps its old shape and the app fails with
    `column ... does not exist`. Here we diff the model against the live table and
    add only what's missing.

    Safety: strictly additive (only `ADD COLUMN`), idempotent (we skip columns the
    table already has), and the column is added NULLABLE even if the model marks it
    NOT NULL — a NOT NULL column can't be added to a table with existing rows
    without a backfill, and we must never fail or rewrite data. The ORM still
    enforces the model's constraints on new writes. Best-effort per column.
    """
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    existing = set(insp.get_table_names())
    for table in Base.metadata.sorted_tables:
        if table.name not in existing:
            continue  # create_all() (already run) creates missing tables in full
        live_cols = {c["name"] for c in insp.get_columns(table.name)}
        for col in table.columns:
            if col.name in live_cols:
                continue
            try:
                coltype = col.type.compile(dialect=engine.dialect)
            except Exception as e:  # exotic/custom type — skip, don't crash boot
                print(f"  ⚠️  skip {table.name}.{col.name}: can't render type ({e})")
                continue
            ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {coltype}'
            if col.server_default is not None:
                try:
                    arg = col.server_default.arg
                    ddl += f" DEFAULT {arg.text if hasattr(arg, 'text') else arg}"
                except Exception:
                    pass  # Python-side default → ORM applies it on insert; fine
            try:
                with engine.begin() as conn:
                    conn.execute(text(ddl))
                print(f"  ➕ added column {table.name}.{col.name}")
            except Exception as e:
                print(f"  ⚠️  could not add {table.name}.{col.name}: {e}")


def init_db():
    """
    Bring the database schema up to the models on startup — additively, never
    destructively (data is always preserved). Three layers, each fail-open so a
    hiccup never blocks boot:

      1. Alembic (`upgrade head` / `stamp head`) — the proper migration history
         for the template tables and any committed migrations.
      2. `create_all` — additively creates any model TABLE not yet present (the
         app's domain tables that aren't in a migration). It only ever CREATEs
         missing tables; it never ALTERs an existing one.
      3. `_reconcile_missing_columns` — `ADD COLUMN` for any model column missing
         on an already-created table (the drift `create_all` can't fix). Strictly
         additive.

    Together these guarantee the live schema always GAINS what the models need
    (tables + columns) across redeploys, while never dropping or rewriting data.
    """
    from backend import models  # noqa: F401  (register models on Base.metadata)
    import os

    # 1. Alembic migration history (template tables + any committed migrations).
    try:
        from alembic.config import Config
        from alembic import command
        from sqlalchemy import inspect

        cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
        insp = inspect(engine)
        has_alembic = insp.has_table("alembic_version")

        # Does the database already hold THIS app's schema? Derived from the models
        # rather than hardcoded, because the old check was
        # `insp.has_table("tasks")` — "tasks" is the SEED's own example table, which
        # every real app renames or replaces. So `has_legacy_tables` was always
        # False, the adopt branch never ran, and `upgrade` was attempted against a
        # schema that step 2's create_all had already built. Alembic then died on
        # the first `create_table` ("relation ... already exists") and NO migration
        # ever applied — silently, because the reconciler below kept the schema
        # close enough to the models that nothing looked wrong.
        existing = set(insp.get_table_names())
        has_our_schema = any(t.name in existing for t in Base.metadata.sorted_tables)

        if has_our_schema and not has_alembic:
            # Adopt: the tables are already right, so record that we're at head
            # instead of replaying history over them. Subsequent boots take the
            # upgrade path and apply only genuinely new revisions.
            command.stamp(cfg, "head")
            print("✅ Database schema adopted into Alembic (stamped head)")
        else:
            command.upgrade(cfg, "head")
            print("✅ Database migrated to head")
    except Exception as e:  # never block boot — create_all below still runs
        # LOUD. This printed a mild "skipped" line while migrations silently never
        # ran; the additive reconciler below covered for it, so the warning scrolled
        # past unread for months. Anything that means "your migrations are not being
        # applied" has to look like a failure, not a note.
        print("=" * 72)
        print("❌ ALEMBIC DID NOT RUN — migrations are NOT being applied.")
        # Redacted: this exception is routinely the connection string, and it was
        # printing a live database password into CloudWatch on every cold start.
        print(f"   {type(e).__name__}: {_redact_db_urls(str(e))}")
        print("   The additive reconciler below still creates missing tables and")
        print("   columns, but anything a migration does BEYOND that (backfills,")
        print("   index changes, data moves) has silently not happened.")
        print("=" * 72)

    # 2. Additively create any model table not yet present (idempotent; never
    #    alters existing tables).
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"⚠️  create_all skipped ({_redact_db_urls(str(e))})")

    # 3. Additively add any model column missing on an existing table.
    try:
        _reconcile_missing_columns(engine)
    except Exception as e:
        print(f"⚠️  column reconcile skipped ({_redact_db_urls(str(e))})")

    print("✅ Database schema reconciled to models (additive, data-preserving)")
