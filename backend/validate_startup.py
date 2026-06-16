"""
Startup validation script - Run this to check if everything is configured correctly
"""

import sys
import os
from pathlib import Path

def validate_environment():
    """Validate environment variables"""
    print("🔍 Validating environment variables...")

    # No provider API key here — LLM access is via the platform proxy
    # (CLARITTY_AUTH_TOKEN + CLARITTY_PLATFORM_URL, injected by the platform).
    required_vars = {
        'DATABASE_URL': 'PostgreSQL connection string',
    }

    # SECURITY: in production these MUST be set, or the app silently degrades to
    # an open / shared-identity state — ALB_AUTH_SECRET is what require_user uses
    # to reject forged X-User-Id (without it, identity can't be trusted), and
    # APP_ENCRYPTION_KEY encrypts per-user integration credentials. Treat the app
    # as production when NODE_ENV says so, or when the platform proxy is wired
    # (CLARITTY_PLATFORM_URL) and we're not explicitly in dev. Fail fast there.
    node_env = os.getenv('NODE_ENV', '').lower()
    is_dev = node_env in ('development', 'dev', 'local', 'test')
    is_prod = node_env in ('production', 'prod') or (
        bool(os.getenv('CLARITTY_PLATFORM_URL')) and not is_dev
    )
    prod_required = {
        'ALB_AUTH_SECRET': 'edge admission secret — trusted multi-tenant identity',
        'APP_ENCRYPTION_KEY': 'integration credential encryption key',
    }
    if is_prod:
        required_vars.update(prod_required)
    else:
        for var, description in prod_required.items():
            if not os.getenv(var):
                print(f"  ⚠️  {var} not set — REQUIRED in production ({description})")

    missing = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing.append(f"  ❌ {var} - {description}")
        else:
            # Mask sensitive values
            value = os.getenv(var)
            masked = value[:10] + '...' if len(value) > 10 else '***'
            print(f"  ✅ {var} = {masked}")

    if missing:
        print("\n⚠️  Missing required environment variables:")
        for msg in missing:
            print(msg)
        print("\nPlease set these in your .env file")
        return False

    print("✅ All required environment variables are set\n")
    return True


def validate_imports():
    """Validate all imports work"""
    print("🔍 Validating imports...")

    try:
        # Core dependencies
        import fastapi
        print("  ✅ FastAPI")

        import sqlalchemy
        print("  ✅ SQLAlchemy")

        import pydantic
        print("  ✅ Pydantic")

        import anthropic
        print("  ✅ Anthropic")

        import apscheduler
        print("  ✅ APScheduler")

        import pytz
        print("  ✅ pytz")

        # Clarity SDK (v2 manifest-first)
        from claritty_sdk import agent, tool, build_graph
        print("  ✅ Clarity SDK (agent, tool)")

        from claritty_sdk.runtime.bootstrap import load as _bootstrap_load
        print("  ✅ Runtime bootstrap (WorkflowEngine)")

        print("✅ All imports successful\n")
        return True

    except ImportError as e:
        print(f"\n❌ Import failed: {e}")
        print("\nPlease run: pip install -r requirements.txt")
        return False


def validate_database():
    """Validate database connection"""
    print("🔍 Validating database connection...")

    try:
        import sqlalchemy
        from backend.database import engine

        # Try to connect
        with engine.connect() as conn:
            result = conn.execute(sqlalchemy.text("SELECT 1"))
            result.fetchone()

        print("  ✅ Database connection successful")
        print(f"  ✅ Database URL: {engine.url}\n")
        return True

    except Exception as e:
        print(f"\n❌ Database connection failed: {e}")
        print("\nPlease ensure:")
        print("  1. PostgreSQL is running")
        print("  2. DATABASE_URL is correct in .env")
        print("  3. Database exists and is accessible")
        return False


def validate_sdk_registration():
    """Validate the app's v2 manifest loads and declares components."""
    print("🔍 Validating manifest (intelligence.yaml)...")

    try:
        from claritty_sdk.runtime.bootstrap import load as _bootstrap_load
        from backend.manifest_path import resolve_manifest_name

        boot = _bootstrap_load(resolve_manifest_name())
        m = boot.manifest

        agent_count = len(m.agents or [])
        workflow_count = len(m.workflows or [])
        template_count = len(m.triggers or [])

        print(f"  ✅ Agents declared: {agent_count}")
        print(f"  ✅ Workflows declared: {workflow_count}")
        print(f"  ✅ Trigger templates declared: {template_count}\n")

        if agent_count == 0:
            print("  ⚠️  Warning: No agents declared in the manifest")

        return True

    except Exception as e:
        print(f"\n❌ Manifest validation failed: {e}")
        return False


def main():
    """Run all validations"""
    print("=" * 60)
    print("Clarity Agentic App - Startup Validation")
    print("=" * 60)
    print()

    # Load .env file
    from dotenv import load_dotenv
    load_dotenv()

    validations = [
        ("Environment Variables", validate_environment),
        ("Python Imports", validate_imports),
        ("Database Connection", validate_database),
        ("SDK Registration", validate_sdk_registration),
    ]

    results = []
    for name, func in validations:
        try:
            result = func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Validation '{name}' crashed: {e}")
            results.append((name, False))

    # Summary
    print("=" * 60)
    print("Validation Summary")
    print("=" * 60)

    all_passed = True
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{name}: {status}")
        if not result:
            all_passed = False

    print("=" * 60)

    if all_passed:
        print("\n🎉 All validations passed! Ready to start the application.")
        print("\nRun: python main.py")
        return 0
    else:
        print("\n⚠️  Some validations failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
