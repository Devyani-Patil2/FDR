from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import AuditEvent, User, UserRole, Deposit, Institution
from schemas import AuditEventOut
from auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("", response_model=list[AuditEventOut])
@router.get("/", response_model=list[AuditEventOut])
def list_audit_events(
    object_type: str = Query(None),
    actor: str = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    if object_type:
        q = q.filter(AuditEvent.object_type == object_type)
    if actor:
        q = q.filter(AuditEvent.actor.ilike(f"%{actor}%"))

    events = q.order_by(AuditEvent.timestamp.desc()).limit(limit).all()
    return [
        AuditEventOut(
            id=e.id, actor=e.actor, action=e.action,
            object_type=e.object_type, object_id=e.object_id,
            timestamp=e.timestamp, before_value=e.before_value,
            after_value=e.after_value, reason=e.reason,
            evidence_reference=e.evidence_reference,
        ) for e in events
    ]


@router.get("/deposit/{deposit_id}", response_model=list[AuditEventOut])
def deposit_audit(
    deposit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dep = db.query(Deposit).filter(Deposit.deposit_id == deposit_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")

    if current_user.role == UserRole.INSTITUTION and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied to this deposit's audit trail")

    events = db.query(AuditEvent).filter(
        AuditEvent.object_id == deposit_id
    ).order_by(AuditEvent.timestamp.desc()).all()

    return [
        AuditEventOut(
            id=e.id, actor=e.actor, action=e.action,
            object_type=e.object_type, object_id=e.object_id,
            timestamp=e.timestamp, before_value=e.before_value,
            after_value=e.after_value, reason=e.reason,
            evidence_reference=e.evidence_reference,
        ) for e in events
    ]
