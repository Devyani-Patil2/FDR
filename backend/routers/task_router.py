from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Task, TaskType, TaskStatus, Deposit, LifecycleStatus, User, UserRole, Notification, NotificationType
from schemas import TaskOut, TaskCloseRequest, TaskReassignRequest
from auth import get_current_user, require_role
from utils import generate_id, log_audit
from scheduler import run_compliance_and_escalation_job

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


def _to_out(t: Task, db: Session) -> TaskOut:
    dep = db.query(Deposit).filter(Deposit.id == t.deposit_id).first()
    owner = db.query(User).filter(User.id == t.owner_id).first() if t.owner_id else None
    overdue = t.due_date and t.due_date < datetime.utcnow() and t.status not in (TaskStatus.CLOSED,)
    return TaskOut(
        id=t.id, task_id=t.task_id, deposit_id=t.deposit_id,
        deposit_display_id=dep.deposit_id if dep else "",
        task_type=t.task_type.value, title=t.title,
        description=t.description, due_date=t.due_date,
        owner_id=t.owner_id, owner_name=owner.full_name if owner else "Unassigned",
        status=t.status.value, escalation_level=t.escalation_level or 0,
        created_at=t.created_at, closed_at=t.closed_at,
        closed_reason=t.closed_reason,
        is_overdue=overdue,
    )


@router.get("", response_model=list[TaskOut])
@router.get("/", response_model=list[TaskOut])
def list_tasks(
    status: str = Query(None), task_type: str = Query(None),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    q = db.query(Task).join(Deposit)
    if current_user.role == UserRole.INSTITUTION:
        q = q.filter(Deposit.institution_id == current_user.institution_id)
    if status:
        q = q.filter(Task.status == status)
    if task_type:
        q = q.filter(Task.task_type == task_type)
    tasks = q.order_by(Task.due_date).all()
    return [_to_out(t, db) for t in tasks]


@router.get("/my-tasks", response_model=list[TaskOut])
def my_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Task).join(Deposit)
    if current_user.role == UserRole.INSTITUTION:
        q = q.filter(Deposit.institution_id == current_user.institution_id)
    tasks = q.filter(Task.owner_id == current_user.id).order_by(Task.due_date).all()
    return [_to_out(t, db) for t in tasks]


@router.put("/{task_id}/acknowledge")
def acknowledge_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    dep = db.query(Deposit).filter(Deposit.id == task.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    task.status = TaskStatus.ACKNOWLEDGED
    db.commit()
    log_audit(db, current_user.username, "TASK_ACKNOWLEDGED", "Task", task.task_id)
    return {"message": "Task acknowledged"}


@router.put("/{task_id}/close")
def close_task(task_id: int, data: TaskCloseRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    dep = db.query(Deposit).filter(Deposit.id == task.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    task.status = TaskStatus.CLOSED
    task.closed_at = datetime.utcnow()
    task.closed_reason = data.reason
    db.commit()
    log_audit(db, current_user.username, "TASK_CLOSED", "Task", task.task_id, reason=data.reason)
    return {"message": "Task closed"}


@router.put("/{task_id}/reassign")
def reassign_task(
    task_id: int, data: TaskReassignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER", "APPROVER"])),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    new_owner = db.query(User).filter(User.id == data.new_owner_id).first()
    if not new_owner:
        raise HTTPException(status_code=404, detail="New owner not found")

    old_owner_id = task.owner_id
    task.owner_id = data.new_owner_id
    db.commit()
    log_audit(db, current_user.username, "TASK_REASSIGNED", "Task", task.task_id,
              before_value={"owner_id": old_owner_id}, after_value={"owner_id": data.new_owner_id})
    return {"message": f"Task reassigned to {new_owner.full_name}"}


@router.post("/run-scheduler-now")
def run_scheduler_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER", "APPROVER"])),
):
    """
    Manually triggers the background APScheduler compliance & auto-escalation job immediately.
    """
    res = run_compliance_and_escalation_job(db)
    log_audit(db, current_user.username, "SCHEDULER_JOB_TRIGGERED", "System", "APScheduler",
              after_value=res)
    return {
        "message": f"Scheduler executed: {res['alerts_created']} alerts created, {res['matured_count']} deposits matured, {res['escalated_count']} tasks auto-escalated.",
        **res
    }


@router.post("/generate-maturity-alerts")
def generate_maturity_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER"])),
):
    res = run_compliance_and_escalation_job(db)
    return {
        "message": f"Generated {res['alerts_created']} new maturity alerts and auto-escalated {res['escalated_count']} overdue tasks",
        "alerts_created": res["alerts_created"],
        "escalated_count": res["escalated_count"]
    }
