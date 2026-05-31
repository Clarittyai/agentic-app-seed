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


def init_db():
    """
    Bring the database schema to the latest migration on startup.

    Uses Alembic so schema changes preserve data (`create_all` only creates
    missing tables, it never ALTERs them — adding a column would silently not
    apply and break the app). Handles three cases:
      - fresh DB           → `upgrade head` creates everything,
      - legacy create_all DB (tables but no alembic_version) → `stamp head`
        adopts the existing schema without re-creating it,
      - alembic unavailable / migration error → fall back to `create_all` so the
        app still boots (first-run safety net).
    """
    from backend import models  # noqa: F401  (register models on Base.metadata)
    import os

    try:
        from alembic.config import Config
        from alembic import command
        from sqlalchemy import inspect

        cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
        insp = inspect(engine)
        has_alembic = insp.has_table("alembic_version")
        has_legacy_tables = insp.has_table("tasks")

        if has_legacy_tables and not has_alembic:
            command.stamp(cfg, "head")  # adopt an existing (create_all) schema
            print("✅ Database schema adopted into Alembic (stamped head)")
        else:
            command.upgrade(cfg, "head")
            print("✅ Database migrated to head")
    except Exception as e:  # never block boot on a migration hiccup
        print(f"⚠️  Alembic migration failed ({e}); falling back to create_all")
        Base.metadata.create_all(bind=engine)
        print("✅ Database initialized (create_all fallback)")


def seed_example_tasks():
    """
    Populate the example "Tasks" app with a few sample rows on first run so the
    template's widget (and dashboard) show real, varied content out of the box —
    this is what makes the small/medium/large widget sizes visibly different.

    Idempotent: only seeds when the tasks table is completely empty. Seeds for
    the default user ("test-user", the fallback in routes/app.py:_resolve_user),
    which is who the widget reads when no X-User-ID header is present.

    This is template/example data only — generated apps overwrite the models and
    this layer with their own, so it never leaks into a real app.
    """
    from backend import models

    db = SessionLocal()
    try:
        if db.query(models.Task).count() > 0:
            return  # already has data — don't duplicate

        DEMO_USER = "test-user"
        # (title, priority, suggested_action, done) — mixed so open_count,
        # top_priority, and done_today are all non-zero.
        samples = [
            ("Fix the failing checkout webhook", "urgent",
             "Replay the last failed event and check the signature.", False),
            ("Reply to the partnership email", "high",
             "Draft a short yes and propose three times.", False),
            ("Review the Q3 roadmap draft", "high",
             "Skim for scope creep, flag the top two risks.", False),
            ("Prep slides for the demo", "medium",
             "Reuse last month's deck, swap in new metrics.", False),
            ("Refill coffee beans", "low",
             "Order the usual two bags.", False),
            ("Book dentist appointment", "medium",
             "Call before noon, they close early today.", False),
            ("Submit expense report", "medium", None, True),
            ("Merge the docs PR", "low", None, True),
        ]

        for title, priority, action, done in samples:
            db.add(models.Task(
                user_id=DEMO_USER,
                title=title,
                priority=priority,
                suggested_action=action,
                done=done,
            ))
        db.commit()
        print(f"✅ Seeded {len(samples)} example tasks for '{DEMO_USER}'")
    except Exception as e:  # never block startup on seed failure
        db.rollback()
        print(f"⚠️  Failed to seed example tasks: {e}")
    finally:
        db.close()
