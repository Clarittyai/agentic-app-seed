"""
Triggers Package

Add your trigger template files here - they will be auto-discovered on startup!

No need to edit this file. Just create your triggers.py files in this directory:

Example:
    backend/triggers/my_triggers.py

    from claritty_sdk import trigger_template, TriggerTemplateType

    @trigger_template(
        id="my-trigger",
        name="My Trigger",
        template_type=TriggerTemplateType.SCHEDULE_DAILY,
        workflow_id="my-workflow",
        config_fields=[...]
    )
    class MyTrigger:
        pass

That's it! Your trigger template will be automatically registered on app startup.
"""

# No imports needed - auto-discovery handles it!
__all__ = []
