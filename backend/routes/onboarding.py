"""AI onboarding routes — auto-included by main.py (this module exports
`router`). All logic lives in backend/shared/onboarding.py; apps normally
never edit this file (author your questions in app-config.json →
`onboarding.questions` instead)."""

from backend.shared.onboarding import make_onboarding_router

router = make_onboarding_router()
