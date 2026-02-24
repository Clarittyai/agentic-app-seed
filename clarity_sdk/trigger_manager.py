"""
Dynamic Trigger Manager - Loads and schedules user-configured triggers

This is the KEY INNOVATION of the Clarity Agentic App:
- Developer defines TEMPLATES with config_fields
- Users create INSTANCES with their own values
- This manager loads instances from database and schedules dynamically

Example:
- Developer: "Daily review is possible" (template)
- User A: "9am EST" (instance)
- User B: "6pm PST" (instance)
- Manager: Schedules both according to their preferences
"""

from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, time as datetime_time, timedelta
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
import pytz

from clarity_sdk.models import TriggerTemplateType
from clarity_sdk.registry import TriggerTemplateRegistry, WorkflowRegistry
from clarity_sdk.executor import WorkflowExecutor
from clarity_sdk.exceptions import TriggerError

logger = logging.getLogger(__name__)


class DynamicTriggerManager:
    """
    Manages dynamic loading and scheduling of user-configured triggers.

    Key Responsibilities:
    1. Load user trigger instances from database on startup
    2. Parse user configurations (time, timezone, interval, etc.)
    3. Schedule jobs with APScheduler
    4. Execute workflows when triggers fire
    5. Handle trigger create/update/delete at runtime
    6. Maintain audit trail

    Workflow:
    - Startup: load_all_triggers()
    - User creates trigger: register_trigger()
    - User updates trigger: update_trigger()
    - User deletes trigger: unregister_trigger()
    - Trigger fires: _execute_trigger_callback()
    """

    def __init__(
        self,
        db_session_factory: Callable,
        workflow_executor: Optional[WorkflowExecutor] = None
    ):
        """
        Initialize trigger manager.

        Args:
            db_session_factory: Factory function to create database sessions
            workflow_executor: WorkflowExecutor instance (creates new if None)
        """
        self.db_session_factory = db_session_factory
        self.workflow_executor = workflow_executor or WorkflowExecutor()

        # APScheduler
        self.scheduler = AsyncIOScheduler()

        # Track registered jobs: {trigger_instance_id: job_id}
        self.active_jobs: Dict[str, str] = {}

    async def start(self):
        """
        Start the trigger manager.

        Initializes APScheduler and loads all enabled user triggers.
        """
        logger.info("🚀 Starting DynamicTriggerManager...")

        # Start scheduler
        self.scheduler.start()
        logger.info("✅ APScheduler started")

        # Load all enabled triggers
        await self.load_all_triggers()

        logger.info(f"✅ DynamicTriggerManager ready ({len(self.active_jobs)} triggers scheduled)")

    async def stop(self):
        """
        Stop the trigger manager.

        Shuts down APScheduler gracefully.
        """
        logger.info("👋 Stopping DynamicTriggerManager...")

        # Shutdown scheduler
        self.scheduler.shutdown(wait=True)

        logger.info("✅ DynamicTriggerManager stopped")

    async def load_all_triggers(self):
        """
        Load all enabled user triggers from database and schedule them.

        Called on startup to restore trigger state.
        """
        # Import here to avoid circular dependency
        from backend.models import UserTriggerInstance

        db = self.db_session_factory()

        try:
            # Query all enabled triggers
            triggers = db.query(UserTriggerInstance).filter(
                UserTriggerInstance.enabled == True
            ).all()

            logger.info(f"📊 Loading {len(triggers)} enabled triggers from database...")

            success_count = 0
            for trigger_instance in triggers:
                try:
                    await self.register_trigger(
                        trigger_instance_id=trigger_instance.id,
                        user_id=trigger_instance.user_id,
                        template_id=trigger_instance.template_id,
                        config=trigger_instance.config
                    )
                    success_count += 1
                except Exception as e:
                    logger.error(
                        f"Failed to load trigger {trigger_instance.id} "
                        f"(user={trigger_instance.user_id}, template={trigger_instance.template_id}): {e}"
                    )

            logger.info(f"✅ Loaded {success_count}/{len(triggers)} triggers successfully")

        finally:
            db.close()

    async def register_trigger(
        self,
        trigger_instance_id: str,
        user_id: str,
        template_id: str,
        config: Dict[str, Any]
    ):
        """
        Register a user trigger instance and schedule it.

        Args:
            trigger_instance_id: Unique ID of the trigger instance
            user_id: User who created this trigger
            template_id: Template this instance was created from
            config: User's configured values

        Raises:
            TriggerError: If trigger cannot be registered
        """
        # Get template
        template = TriggerTemplateRegistry.get_template(template_id)
        if not template:
            raise TriggerError(f"Trigger template not found: {template_id}")

        # Verify workflow exists
        workflow = WorkflowRegistry.get_metadata(template.workflow_id)
        if not workflow:
            raise TriggerError(f"Workflow not found: {template.workflow_id}")

        # Build APScheduler trigger based on template type
        apscheduler_trigger = self._build_apscheduler_trigger(
            template.template_type,
            config
        )

        # Create callback
        callback = self._create_trigger_callback(
            trigger_instance_id=trigger_instance_id,
            user_id=user_id,
            template_id=template_id,
            workflow_id=template.workflow_id,
            config=config
        )

        # Schedule job
        job = self.scheduler.add_job(
            callback,
            trigger=apscheduler_trigger,
            id=trigger_instance_id,
            name=f"trigger-{trigger_instance_id}",
            replace_existing=True
        )

        # Track job
        self.active_jobs[trigger_instance_id] = job.id

        logger.info(
            f"✅ Registered trigger: {template_id} "
            f"(instance={trigger_instance_id[:8]}, user={user_id})"
        )

    async def update_trigger(
        self,
        trigger_instance_id: str,
        user_id: str,
        template_id: str,
        config: Dict[str, Any],
        enabled: bool = True
    ):
        """
        Update an existing trigger.

        If enabled, reschedule with new config.
        If disabled, unregister it.

        Args:
            trigger_instance_id: Trigger instance ID
            user_id: User ID
            template_id: Template ID
            config: New configuration
            enabled: Whether trigger is enabled
        """
        # Unregister existing job if any
        if trigger_instance_id in self.active_jobs:
            await self.unregister_trigger(trigger_instance_id)

        # Re-register if enabled
        if enabled:
            await self.register_trigger(
                trigger_instance_id=trigger_instance_id,
                user_id=user_id,
                template_id=template_id,
                config=config
            )

        logger.info(
            f"✅ Updated trigger: {template_id} "
            f"(instance={trigger_instance_id[:8]}, enabled={enabled})"
        )

    async def unregister_trigger(self, trigger_instance_id: str):
        """
        Unregister a trigger and remove its scheduled job.

        Args:
            trigger_instance_id: Trigger instance ID to remove
        """
        if trigger_instance_id not in self.active_jobs:
            logger.warning(f"Trigger not found in active jobs: {trigger_instance_id}")
            return

        # Remove from APScheduler
        job_id = self.active_jobs[trigger_instance_id]
        self.scheduler.remove_job(job_id)

        # Remove from tracking
        del self.active_jobs[trigger_instance_id]

        logger.info(f"✅ Unregistered trigger: {trigger_instance_id[:8]}")

    def _build_apscheduler_trigger(
        self,
        template_type: TriggerTemplateType,
        config: Dict[str, Any]
    ):
        """
        Build APScheduler trigger from template type and user config.

        Args:
            template_type: Type of trigger template
            config: User's configured values

        Returns:
            APScheduler trigger object (CronTrigger, IntervalTrigger, etc.)

        Raises:
            TriggerError: If config is invalid
        """
        if template_type == TriggerTemplateType.SCHEDULE_DAILY:
            return self._build_daily_trigger(config)
        elif template_type == TriggerTemplateType.SCHEDULE_CRON:
            return self._build_cron_trigger(config)
        elif template_type == TriggerTemplateType.SCHEDULE_INTERVAL:
            return self._build_interval_trigger(config)
        elif template_type == TriggerTemplateType.DATA_THRESHOLD:
            # Data threshold triggers poll on interval
            return self._build_interval_trigger(config)
        else:
            raise TriggerError(f"Unsupported trigger type for scheduling: {template_type}")

    def _build_daily_trigger(self, config: Dict[str, Any]) -> CronTrigger:
        """
        Build daily trigger from user config.

        Config format:
        {
            "time": "09:00",  # HH:MM format
            "timezone": "America/New_York",
            "days_of_week": ["monday", "tuesday", ...]  # Optional
        }
        """
        # Parse time
        time_str = config.get("time", "09:00")
        try:
            hour, minute = map(int, time_str.split(":"))
        except (ValueError, AttributeError):
            raise TriggerError(f"Invalid time format: {time_str}. Expected HH:MM")

        # Parse timezone
        timezone_str = config.get("timezone", "UTC")
        try:
            timezone = pytz.timezone(timezone_str)
        except pytz.UnknownTimeZoneError:
            raise TriggerError(f"Unknown timezone: {timezone_str}")

        # Parse days of week (optional)
        days_of_week = config.get("days_of_week", None)
        if days_of_week:
            # Convert day names to APScheduler format
            day_map = {
                "monday": "mon",
                "tuesday": "tue",
                "wednesday": "wed",
                "thursday": "thu",
                "friday": "fri",
                "saturday": "sat",
                "sunday": "sun"
            }
            day_of_week = ",".join([day_map[day.lower()] for day in days_of_week])
        else:
            day_of_week = None

        return CronTrigger(
            hour=hour,
            minute=minute,
            day_of_week=day_of_week,
            timezone=timezone
        )

    def _build_cron_trigger(self, config: Dict[str, Any]) -> CronTrigger:
        """
        Build cron trigger from user config.

        Config format:
        {
            "cron_expression": "0 9 * * MON-FRI",
            "timezone": "America/New_York"
        }
        """
        cron_expr = config.get("cron_expression")
        if not cron_expr:
            raise TriggerError("Missing cron_expression in config")

        timezone_str = config.get("timezone", "UTC")
        try:
            timezone = pytz.timezone(timezone_str)
        except pytz.UnknownTimeZoneError:
            raise TriggerError(f"Unknown timezone: {timezone_str}")

        return CronTrigger.from_crontab(cron_expr, timezone=timezone)

    def _build_interval_trigger(self, config: Dict[str, Any]) -> IntervalTrigger:
        """
        Build interval trigger from user config.

        Config format:
        {
            "check_interval_minutes": 60  # Or other time unit
        }
        """
        interval_minutes = config.get("check_interval_minutes")
        if not interval_minutes:
            raise TriggerError("Missing check_interval_minutes in config")

        return IntervalTrigger(minutes=int(interval_minutes))

    def _create_trigger_callback(
        self,
        trigger_instance_id: str,
        user_id: str,
        template_id: str,
        workflow_id: str,
        config: Dict[str, Any]
    ) -> Callable:
        """
        Create callback function for trigger execution.

        This function will be called by APScheduler when the trigger fires.

        Args:
            trigger_instance_id: Trigger instance ID
            user_id: User ID
            template_id: Template ID
            workflow_id: Workflow to execute
            config: User configuration

        Returns:
            Async callable that executes the workflow
        """
        async def callback():
            """Execute workflow when trigger fires"""
            logger.info(
                f"🔥 Trigger fired: {template_id} "
                f"(instance={trigger_instance_id[:8]}, user={user_id})"
            )

            # Import here to avoid circular dependency
            from backend.models import TriggerExecution, WorkflowExecution, UserTriggerInstance, UserIntegration

            db = self.db_session_factory()

            try:
                # Get user integrations
                integrations = {}
                user_integrations = db.query(UserIntegration).filter(
                    UserIntegration.user_id == user_id,
                    UserIntegration.is_active == True
                ).all()

                for integration in user_integrations:
                    integrations[integration.service] = integration.credentials

                # Execute workflow
                trigger_data = {
                    "trigger_id": trigger_instance_id,
                    "trigger_template_id": template_id,
                    "triggered_at": datetime.utcnow().isoformat(),
                    "trigger_config": config
                }

                result = await self.workflow_executor.execute_workflow(
                    workflow_id=workflow_id,
                    trigger_data=trigger_data,
                    user_id=user_id,
                    integrations=integrations
                )

                # Create workflow execution record
                workflow_exec = WorkflowExecution(
                    workflow_id=workflow_id,
                    trigger_id=trigger_instance_id,
                    user_id=user_id,
                    status="completed" if result["success"] else "failed",
                    input_data=trigger_data,
                    output_data=result.get("outputs", {}),
                    error_message=result.get("error"),
                    started_at=datetime.utcnow() - timedelta(seconds=result["duration_seconds"]),
                    completed_at=datetime.utcnow(),
                    duration_seconds=int(result["duration_seconds"])
                )
                db.add(workflow_exec)

                # Create trigger execution record
                trigger_exec = TriggerExecution(
                    trigger_instance_id=trigger_instance_id,
                    user_id=user_id,
                    workflow_execution_id=workflow_exec.id,
                    triggered_at=datetime.utcnow(),
                    success=result["success"],
                    error_message=result.get("error"),
                    trigger_data=trigger_data
                )
                db.add(trigger_exec)

                # Update trigger instance statistics
                trigger_instance = db.query(UserTriggerInstance).filter(
                    UserTriggerInstance.id == trigger_instance_id
                ).first()

                if trigger_instance:
                    trigger_instance.last_triggered_at = datetime.utcnow()
                    trigger_instance.total_executions += 1
                    if not result["success"]:
                        trigger_instance.total_failures += 1

                db.commit()

                logger.info(
                    f"✅ Trigger execution completed: {template_id} "
                    f"(success={result['success']}, duration={result['duration_seconds']}s)"
                )

            except Exception as e:
                logger.error(f"❌ Trigger execution failed: {template_id} - {e}")

                # Record failure
                try:
                    trigger_exec = TriggerExecution(
                        trigger_instance_id=trigger_instance_id,
                        user_id=user_id,
                        triggered_at=datetime.utcnow(),
                        success=False,
                        error_message=str(e),
                        trigger_data=trigger_data
                    )
                    db.add(trigger_exec)

                    # Update failure count
                    trigger_instance = db.query(UserTriggerInstance).filter(
                        UserTriggerInstance.id == trigger_instance_id
                    ).first()
                    if trigger_instance:
                        trigger_instance.total_failures += 1

                    db.commit()
                except Exception as record_error:
                    logger.error(f"Failed to record trigger failure: {record_error}")

            finally:
                db.close()

        return callback

    def get_next_run_time(self, trigger_instance_id: str) -> Optional[datetime]:
        """
        Get next scheduled run time for a trigger.

        Args:
            trigger_instance_id: Trigger instance ID

        Returns:
            Next run time as datetime, or None if not scheduled
        """
        if trigger_instance_id not in self.active_jobs:
            return None

        job_id = self.active_jobs[trigger_instance_id]
        job = self.scheduler.get_job(job_id)

        if job:
            return job.next_run_time

        return None

    def get_active_trigger_count(self) -> int:
        """
        Get count of active scheduled triggers.

        Returns:
            Number of active triggers
        """
        return len(self.active_jobs)

    def get_active_trigger_ids(self) -> List[str]:
        """
        Get list of active trigger instance IDs.

        Returns:
            List of trigger instance IDs
        """
        return list(self.active_jobs.keys())
