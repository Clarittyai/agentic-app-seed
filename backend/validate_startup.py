"""
Startup validation script - Run this to check if everything is configured correctly
"""

import sys
import os
from pathlib import Path

def validate_environment():
    """Validate environment variables"""
    print("🔍 Validating environment variables...")

    required_vars = {
        'ANTHROPIC_API_KEY': 'Anthropic API key for AI features',
        'DATABASE_URL': 'PostgreSQL connection string',
    }

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

        # Clarity SDK
        from claritty_sdk import agent, workflow, trigger_template
        print("  ✅ Clarity SDK decorators")

        from claritty_sdk.executor import WorkflowExecutor
        print("  ✅ WorkflowExecutor")

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
    """Validate SDK components register correctly"""
    print("🔍 Validating SDK registration...")

    try:
        from claritty_sdk.registry import AgentRegistry, WorkflowRegistry, TriggerTemplateRegistry

        # Import agents, workflows, triggers
        from backend import agents, workflows, triggers

        agent_count = len(AgentRegistry.list_agents())
        workflow_count = len(WorkflowRegistry.list_workflows())
        template_count = len(TriggerTemplateRegistry.list_templates())

        print(f"  ✅ Agents registered: {agent_count}")
        print(f"  ✅ Workflows registered: {workflow_count}")
        print(f"  ✅ Trigger templates registered: {template_count}\n")

        if agent_count == 0:
            print("  ⚠️  Warning: No agents registered (expected at least 2)")
        if workflow_count == 0:
            print("  ⚠️  Warning: No workflows registered (expected at least 3)")
        if template_count == 0:
            print("  ⚠️  Warning: No trigger templates registered (expected at least 4)")

        return True

    except Exception as e:
        print(f"\n❌ SDK registration failed: {e}")
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
