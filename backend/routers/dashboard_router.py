from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import (
    Deposit, Institution, LifecycleStatus, VerificationEvent, VerificationStatus,
    Task, TaskStatus, ReleaseRequest, ReleaseStatus, AuditEvent, User, UserRole, Document, ExtractedField
)
from schemas import DashboardStats, PriorityQueueItem, MaturityCalendarItem, AuditEventOut
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    thirty_days = now + timedelta(days=30)

    dep_query = db.query(Deposit)
    if current_user.role == UserRole.INSTITUTION:
        dep_query = dep_query.filter(Deposit.institution_id == current_user.institution_id)

    total = dep_query.count()
    active = dep_query.filter(Deposit.lifecycle_status == LifecycleStatus.ACTIVE).count()
    expiring = dep_query.filter(
        Deposit.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.EXPIRING]),
        Deposit.maturity_date <= thirty_days,
        Deposit.maturity_date > now,
    ).count()
    matured = dep_query.filter(Deposit.lifecycle_status == LifecycleStatus.MATURED).count()

    # Deposits with no VERIFIED verification event
    all_deposit_ids = {d.id for d in dep_query.filter(
        Deposit.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.EXPIRING])
    ).all()}
    
    verif_query = db.query(VerificationEvent.deposit_id).filter(
        VerificationEvent.status == VerificationStatus.VERIFIED
    )
    if current_user.role == UserRole.INSTITUTION:
        verif_query = verif_query.join(Deposit).filter(Deposit.institution_id == current_user.institution_id)
    verified_ids = {v.deposit_id for v in verif_query.all()}
    pending_verif = len(all_deposit_ids - verified_ids)

    rel_query = db.query(ReleaseRequest).join(Deposit).filter(
        ReleaseRequest.status.notin_([ReleaseStatus.APPROVED, ReleaseStatus.REJECTED, ReleaseStatus.CLOSED, ReleaseStatus.RELEASED])
    )
    if current_user.role == UserRole.INSTITUTION:
        rel_query = rel_query.filter(Deposit.institution_id == current_user.institution_id)
    pending_releases = rel_query.count()

    task_query = db.query(Task).join(Deposit).filter(Task.status != TaskStatus.CLOSED)
    if current_user.role == UserRole.INSTITUTION:
        task_query = task_query.filter(Deposit.institution_id == current_user.institution_id)
    open_tasks = task_query.count()

    total_inst = 1 if current_user.role == UserRole.INSTITUTION else db.query(Institution).count()

    return DashboardStats(
        total_deposits=total, active_deposits=active, expiring_soon=expiring,
        matured=matured, pending_verification=pending_verif,
        pending_releases=pending_releases, open_tasks=open_tasks,
        total_institutions=total_inst,
    )


@router.get("/maturity-calendar", response_model=list[MaturityCalendarItem])
def maturity_calendar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Deposit).filter(
        Deposit.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.EXPIRING]),
        Deposit.maturity_date.isnot(None),
    )
    if current_user.role == UserRole.INSTITUTION:
        q = q.filter(Deposit.institution_id == current_user.institution_id)
    deposits = q.all()

    monthly = defaultdict(int)
    for d in deposits:
        key = d.maturity_date.strftime("%Y-%m")
        monthly[key] += 1

    result = [MaturityCalendarItem(month=k, count=v) for k, v in sorted(monthly.items())]
    return result


@router.get("/priority-queue", response_model=list[PriorityQueueItem])
def priority_queue(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    items = []

    # 1. Matured deposits with unresolved actions
    matured_q = db.query(Deposit).filter(Deposit.lifecycle_status == LifecycleStatus.MATURED)
    if current_user.role == UserRole.INSTITUTION:
        matured_q = matured_q.filter(Deposit.institution_id == current_user.institution_id)
    matured = matured_q.all()

    for d in matured:
        inst = db.query(Institution).filter(Institution.id == d.institution_id).first()
        items.append(PriorityQueueItem(
            deposit_id=d.deposit_id, institution_name=inst.name if inst else "",
            reason="Deposit matured — follow-up action required",
            priority="HIGH", due_date=d.maturity_date,
            action="Review and initiate renewal or release", deposit_db_id=d.id,
        ))

    # 2. Deposits with MISMATCH verification
    mismatches_q = db.query(VerificationEvent).filter(VerificationEvent.status == VerificationStatus.MISMATCH)
    if current_user.role == UserRole.INSTITUTION:
        mismatches_q = mismatches_q.join(Deposit).filter(Deposit.institution_id == current_user.institution_id)
    mismatches = mismatches_q.all()

    seen_deps = set()
    for v in mismatches:
        if v.deposit_id in seen_deps:
            continue
        seen_deps.add(v.deposit_id)
        dep = db.query(Deposit).filter(Deposit.id == v.deposit_id).first()
        if not dep:
            continue
        inst = db.query(Institution).filter(Institution.id == dep.institution_id).first()
        items.append(PriorityQueueItem(
            deposit_id=dep.deposit_id, institution_name=inst.name if inst else "",
            reason="Verification mismatch detected — conflicting details",
            priority="HIGH", due_date=v.checked_at,
            action="Review field-level mismatch and request correction", deposit_db_id=dep.id,
        ))

    # 3. Expiring within 30 days
    thirty = now + timedelta(days=30)
    expiring_q = db.query(Deposit).filter(
        Deposit.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.EXPIRING]),
        Deposit.maturity_date <= thirty, Deposit.maturity_date > now,
    )
    if current_user.role == UserRole.INSTITUTION:
        expiring_q = expiring_q.filter(Deposit.institution_id == current_user.institution_id)
    expiring = expiring_q.all()

    for d in expiring:
        inst = db.query(Institution).filter(Institution.id == d.institution_id).first()
        days_left = (d.maturity_date - now).days
        items.append(PriorityQueueItem(
            deposit_id=d.deposit_id, institution_name=inst.name if inst else "",
            reason=f"Matures in {days_left} days",
            priority="MEDIUM" if days_left > 7 else "HIGH",
            due_date=d.maturity_date, action="Monitor and prepare for renewal",
            deposit_db_id=d.id,
        ))

    # 4. Pending release requests
    pending_q = db.query(ReleaseRequest).join(Deposit).filter(
        ReleaseRequest.status.in_([ReleaseStatus.SUBMITTED, ReleaseStatus.UNDER_SCRUTINY, ReleaseStatus.AWAITING_AUTHORITY])
    )
    if current_user.role == UserRole.INSTITUTION:
        pending_q = pending_q.filter(Deposit.institution_id == current_user.institution_id)
    pending = pending_q.all()

    for r in pending:
        dep = db.query(Deposit).filter(Deposit.id == r.deposit_id).first()
        inst = db.query(Institution).filter(Institution.id == dep.institution_id).first() if dep else None
        items.append(PriorityQueueItem(
            deposit_id=dep.deposit_id if dep else "", institution_name=inst.name if inst else "",
            reason=f"Release request {r.request_id} — Status: {r.status.value}",
            priority="MEDIUM", due_date=r.submitted_at,
            action="Review and process release request", deposit_db_id=dep.id if dep else 0,
        ))

    # Sort by priority
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    items.sort(key=lambda x: priority_order.get(x.priority, 2))
    return items


@router.get("/recent-activity", response_model=list[AuditEventOut])
def recent_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(AuditEvent)
    if current_user.role == UserRole.INSTITUTION:
        inst_deposit_ids = [d.deposit_id for d in db.query(Deposit.deposit_id).filter(Deposit.institution_id == current_user.institution_id).all()]
        inst_obj = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
        inst_code = inst_obj.institution_id if inst_obj else ""
        
        q = q.filter(
            (AuditEvent.actor == current_user.username) |
            (AuditEvent.object_id.in_(inst_deposit_ids)) |
            (AuditEvent.object_id == inst_code)
        )

    events = q.order_by(AuditEvent.timestamp.desc()).limit(15).all()
    return [
        AuditEventOut(
            id=e.id, actor=e.actor, action=e.action,
            object_type=e.object_type, object_id=e.object_id,
            timestamp=e.timestamp, before_value=e.before_value,
            after_value=e.after_value, reason=e.reason,
            evidence_reference=e.evidence_reference,
        ) for e in events
    ]
