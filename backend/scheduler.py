import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from database import SessionLocal
from models import (
    Deposit, LifecycleStatus, Task, TaskType, TaskStatus,
    User, UserRole, Notification, NotificationType
)
from utils import generate_id, log_audit

logger = logging.getLogger("scheduler")
scheduler = BackgroundScheduler()


def run_compliance_and_escalation_job(db: Session = None):
    """
    Automated Nightly / Triggered Compliance & Escalation Runner:
    1. Checks deposit maturity windows (90, 60, 30, 7 days) and creates reminder tasks.
    2. Marks deposits past maturity date as MATURED and creates OVERDUE_ACTION tasks.
    3. Auto-escalates open tasks overdue by > 3 days:
       - Increments escalation_level
       - Sets status to ESCALATED
       - Reassigns task to a supervisor (Approver/Admin)
       - Sends notification and logs audit event.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        now = datetime.utcnow()
        windows = [90, 60, 30, 7]
        deposits = db.query(Deposit).filter(
            Deposit.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.EXPIRING])
        ).all()

        reviewers = db.query(User).filter(User.role.in_([UserRole.REVIEWER, UserRole.ADMIN])).all()
        default_reviewer = reviewers[0] if reviewers else None

        approvers = db.query(User).filter(User.role.in_([UserRole.APPROVER, UserRole.ADMIN])).all()
        default_supervisor = approvers[0] if approvers else None

        alerts_created = 0
        matured_count = 0

        # --- 1 & 2. Maturity Checks & Status Transitions ---
        for dep in deposits:
            if not dep.maturity_date:
                continue
            days_left = (dep.maturity_date - now).days

            if days_left <= 0:
                dep.lifecycle_status = LifecycleStatus.MATURED
                matured_count += 1
                existing = db.query(Task).filter(
                    Task.deposit_id == dep.id,
                    Task.task_type == TaskType.OVERDUE_ACTION,
                    Task.status != TaskStatus.CLOSED
                ).first()
                if not existing:
                    task = Task(
                        task_id=generate_id("TSK"),
                        deposit_id=dep.id,
                        task_type=TaskType.OVERDUE_ACTION,
                        title=f"OVERDUE: Deposit {dep.deposit_id} matured {abs(days_left)} days ago",
                        description=f"Deposit {dep.deposit_id} (₹{dep.amount:,.0f}) has matured. Immediate follow-up action required.",
                        due_date=dep.maturity_date,
                        owner_id=default_reviewer.id if default_reviewer else None,
                        status=TaskStatus.OPEN,
                        escalation_level=0,
                    )
                    db.add(task)
                    alerts_created += 1
                continue

            if days_left <= 90:
                dep.lifecycle_status = LifecycleStatus.EXPIRING

            for window in windows:
                if days_left <= window:
                    existing = db.query(Task).filter(
                        Task.deposit_id == dep.id,
                        Task.task_type == TaskType.MATURITY_REMINDER,
                        Task.title.ilike(f"%{window}-day%"),
                        Task.status != TaskStatus.CLOSED,
                    ).first()
                    if not existing:
                        task = Task(
                            task_id=generate_id("TSK"),
                            deposit_id=dep.id,
                            task_type=TaskType.MATURITY_REMINDER,
                            title=f"{window}-day Maturity Alert: {dep.deposit_id}",
                            description=f"Deposit {dep.deposit_id} (₹{dep.amount:,.0f}) matures in {days_left} days on {dep.maturity_date.strftime('%Y-%m-%d')}.",
                            due_date=dep.maturity_date - timedelta(days=window),
                            owner_id=default_reviewer.id if default_reviewer else None,
                            status=TaskStatus.OPEN,
                            escalation_level=0,
                        )
                        db.add(task)
                        alerts_created += 1
                    break

        db.commit()

        # --- 3. Auto-Escalation (> 3 Days Past Due Date) ---
        escalation_threshold = now - timedelta(days=3)
        open_tasks = db.query(Task).filter(
            Task.status.in_([TaskStatus.OPEN, TaskStatus.ACKNOWLEDGED, TaskStatus.IN_PROGRESS, TaskStatus.ESCALATED]),
            Task.due_date.isnot(None),
            Task.due_date < escalation_threshold,
        ).all()

        escalated_count = 0
        for task in open_tasks:
            prev_level = task.escalation_level or 0
            task.escalation_level = prev_level + 1
            task.status = TaskStatus.ESCALATED

            old_owner_id = task.owner_id
            if default_supervisor and task.owner_id != default_supervisor.id:
                task.owner_id = default_supervisor.id

            escalated_count += 1

            # Notify supervisor
            if default_supervisor:
                notif = Notification(
                    user_id=default_supervisor.id,
                    title=f"ESCALATION: Task {task.task_id} Overdue > 3 Days",
                    message=f"Task '{task.title}' on deposit #{task.deposit_id} is overdue by > 3 days and has been auto-escalated to Level {task.escalation_level}.",
                    notification_type=NotificationType.TASK_ASSIGNED,
                    related_object_type="Task",
                    related_object_id=task.task_id,
                )
                db.add(notif)

            # Audit event
            log_audit(
                db,
                actor="SYSTEM_SCHEDULER",
                action="TASK_AUTO_ESCALATED",
                object_type="Task",
                object_id=task.task_id,
                before_value={"escalation_level": prev_level, "owner_id": old_owner_id},
                after_value={"escalation_level": task.escalation_level, "owner_id": task.owner_id, "status": "ESCALATED"},
                reason=f"Task remained unclosed > 3 days past due date ({task.due_date.strftime('%Y-%m-%d')})"
            )

        db.commit()

        logger.info(
            f"Scheduler job completed: {alerts_created} alerts created, {matured_count} deposits matured, {escalated_count} tasks escalated."
        )
        return {
            "alerts_created": alerts_created,
            "matured_count": matured_count,
            "escalated_count": escalated_count,
            "executed_at": now.isoformat(),
        }

    except Exception as e:
        logger.error(f"Error executing compliance and escalation scheduler job: {e}")
        db.rollback()
        raise e
    finally:
        if close_db:
            db.close()


def start_scheduler():
    """Starts the background APScheduler nightly job."""
    if not scheduler.running:
        # Run daily at midnight (00:00:00)
        scheduler.add_job(
            run_compliance_and_escalation_job,
            CronTrigger(hour=0, minute=0),
            id="nightly_compliance_escalation",
            replace_existing=True,
            misfire_grace_time=3600,
        )
        scheduler.start()
        logger.info("APScheduler started successfully: Nightly compliance & auto-escalation active.")


def shutdown_scheduler():
    """Gracefully shuts down the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
