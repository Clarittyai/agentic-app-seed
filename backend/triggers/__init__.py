"""
Triggers Package (DEPRECATED for v2 — triggers live in app.yaml)

In the v2 manifest-first runtime a trigger is YAML declared in
app.yaml#triggers — there are NO python trigger files and NO @trigger_template
decorators (the runtime ignores them). The platform fires triggers; the app has
no in-process scheduler.

Example (in app.yaml, NOT here):
    triggers:
      - id: my-trigger
        type: SCHEDULE                 # or WEBHOOK
        workflow: my-workflow
        configFields:
          - { key: time, type: time, required: true, default: "09:00" }
          - { key: timezone, type: timezone, required: true }

This package is kept only so legacy auto-discovery imports don't crash.
"""

# No imports needed - triggers are declared in app.yaml.
__all__ = []
