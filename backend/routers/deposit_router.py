import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import (
    Deposit, Institution, Document, ExtractedField, VerificationEvent,
    Task, ReleaseRequest, AuditEvent, LifecycleStatus, VerificationStatus, User, UserRole
)
from schemas import (
    DepositCreate, DepositUpdate, DepositOut, PassportEvent, ConsistencyResult
)
from auth import get_current_user, require_role
from utils import generate_id, log_audit
from ocr_service import compare_field_values

router = APIRouter(prefix="/api/deposits", tags=["Deposits"])


def _compute_trust(deposit: Deposit, db: Session) -> str:
    docs = db.query(Document).filter(Document.deposit_id == deposit.id).count()
    if docs == 0:
        return "NOT_CHECKED"

    has_fields = db.query(ExtractedField).join(Document).filter(Document.deposit_id == deposit.id).count() > 0
    has_hash = db.query(Document).filter(Document.deposit_id == deposit.id, Document.file_hash.isnot(None)).count() > 0

    verifications = db.query(VerificationEvent).filter(VerificationEvent.deposit_id == deposit.id).all()
    has_verified = any(v.status == VerificationStatus.VERIFIED and v.source != "HUMAN_SCRUTINY" for v in verifications)
    has_human = any(v.status == VerificationStatus.VERIFIED and v.source == "HUMAN_SCRUTINY" for v in verifications)

    if has_human:
        return "HUMAN_CONFIRMED"
    if has_verified:
        return "SOURCE_VERIFIED"
    if has_fields:
        return "FIELDS_EXTRACTED"
    if has_hash:
        return "INTEGRITY_TRACKED"
    return "UPLOADED"


def _to_out(dep: Deposit, db: Session) -> DepositOut:
    inst = db.query(Institution).filter(Institution.id == dep.institution_id).first()
    days = (dep.maturity_date - datetime.utcnow()).days if dep.maturity_date else 0
    doc_count = db.query(Document).filter(Document.deposit_id == dep.id).count()
    trust = _compute_trust(dep, db)
    return DepositOut(
        id=dep.id, deposit_id=dep.deposit_id, institution_id=dep.institution_id,
        institution_name=inst.name if inst else "", amount=dep.amount,
        bank_name=dep.bank_name, branch_name=dep.branch_name,
        receipt_no=dep.receipt_no, account_holder=dep.account_holder,
        issue_date=dep.issue_date, maturity_date=dep.maturity_date,
        lifecycle_status=dep.lifecycle_status.value,
        parent_deposit_id=dep.parent_deposit_id,
        created_at=dep.created_at, updated_at=dep.updated_at,
        created_by=dep.created_by, days_to_maturity=days,
        document_count=doc_count, trust_level=trust,
    )


@router.get("", response_model=list[DepositOut])
@router.get("/", response_model=list[DepositOut])
def list_deposits(
    status: str = Query(None), bank: str = Query(None),
    institution_id: int = Query(None), search: str = Query(None),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    q = db.query(Deposit)
    # Role-based multi-tenant scoping: Colleges can ONLY view their own institution's FDRs
    if current_user.role == UserRole.INSTITUTION:
        q = q.filter(Deposit.institution_id == current_user.institution_id)
    elif institution_id:
        q = q.filter(Deposit.institution_id == institution_id)

    if status:
        q = q.filter(Deposit.lifecycle_status == status)
    if bank:
        q = q.filter(Deposit.bank_name.ilike(f"%{bank}%"))
    if search:
        q = q.filter(
            (Deposit.deposit_id.ilike(f"%{search}%")) | (Deposit.receipt_no.ilike(f"%{search}%"))
        )
    deposits = q.order_by(Deposit.maturity_date).all()
    return [_to_out(d, db) for d in deposits]


@router.post("", response_model=DepositOut)
@router.post("/", response_model=DepositOut)
def create_deposit(
    data: DepositCreate, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Enforce institution ownership if role is INSTITUTION
    if current_user.role == UserRole.INSTITUTION:
        data.institution_id = current_user.institution_id

    inst = db.query(Institution).filter(Institution.id == data.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    dep = Deposit(
        deposit_id=generate_id("DEP"),
        institution_id=data.institution_id, amount=data.amount,
        bank_name=data.bank_name, branch_name=data.branch_name,
        receipt_no=data.receipt_no, account_holder=data.account_holder,
        issue_date=datetime.fromisoformat(data.issue_date),
        maturity_date=datetime.fromisoformat(data.maturity_date),
        lifecycle_status=LifecycleStatus.ACTIVE,
        created_by=current_user.username,
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)
    log_audit(db, current_user.username, "DEPOSIT_CREATED", "Deposit", dep.deposit_id,
              after_value={"amount": dep.amount, "bank": dep.bank_name, "institution": inst.name})
    return _to_out(dep, db)


@router.get("/{dep_id}", response_model=DepositOut)
def get_deposit(dep_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dep = db.query(Deposit).filter(Deposit.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if current_user.role == UserRole.INSTITUTION and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied: You can only inspect your own institution's security deposits.")
    return _to_out(dep, db)


@router.put("/{dep_id}", response_model=DepositOut)
def update_deposit(
    dep_id: int, data: DepositUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER", "INSTITUTION"])),
):
    dep = db.query(Deposit).filter(Deposit.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if current_user.role == UserRole.INSTITUTION and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied: You cannot update deposits for another institution.")
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")

    before = {"amount": dep.amount, "status": dep.lifecycle_status.value, "bank": dep.bank_name}
    if data.amount is not None:
        dep.amount = data.amount
    if data.bank_name is not None:
        dep.bank_name = data.bank_name
    if data.branch_name is not None:
        dep.branch_name = data.branch_name
    if data.receipt_no is not None:
        dep.receipt_no = data.receipt_no
    if data.account_holder is not None:
        dep.account_holder = data.account_holder
    if data.maturity_date is not None:
        dep.maturity_date = datetime.fromisoformat(data.maturity_date)
    if data.lifecycle_status is not None:
        dep.lifecycle_status = LifecycleStatus(data.lifecycle_status)

    dep.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(dep)
    after = {"amount": dep.amount, "status": dep.lifecycle_status.value, "bank": dep.bank_name}
    log_audit(db, current_user.username, "DEPOSIT_UPDATED", "Deposit", dep.deposit_id,
              before_value=before, after_value=after)
    return _to_out(dep, db)


@router.post("/{dep_id}/replace", response_model=DepositOut)
def create_replacement(
    dep_id: int, data: DepositCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old = db.query(Deposit).filter(Deposit.id == dep_id).first()
    if not old:
        raise HTTPException(status_code=404, detail="Original deposit not found")

    if current_user.role == UserRole.INSTITUTION:
        if old.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Access denied: Cannot replace another institution's deposit")
        data.institution_id = current_user.institution_id

    new_dep = Deposit(
        deposit_id=generate_id("DEP"),
        institution_id=data.institution_id, amount=data.amount,
        bank_name=data.bank_name, branch_name=data.branch_name,
        receipt_no=data.receipt_no, account_holder=data.account_holder,
        issue_date=datetime.fromisoformat(data.issue_date),
        maturity_date=datetime.fromisoformat(data.maturity_date),
        lifecycle_status=LifecycleStatus.ACTIVE,
        parent_deposit_id=old.id,
        created_by=current_user.username,
    )
    old.lifecycle_status = LifecycleStatus.REPLACED
    old.updated_at = datetime.utcnow()
    db.add(new_dep)
    db.commit()
    db.refresh(new_dep)

    # Check coverage gap
    gap_days = 0
    if old.maturity_date and new_dep.issue_date:
        gap_days = (new_dep.issue_date - old.maturity_date).days

    log_audit(db, current_user.username, "DEPOSIT_REPLACED", "Deposit", old.deposit_id,
              after_value={"new_deposit": new_dep.deposit_id, "coverage_gap_days": gap_days})
    return _to_out(new_dep, db)


@router.get("/{dep_id}/chain")
def get_chain(dep_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dep = db.query(Deposit).filter(Deposit.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if current_user.role == UserRole.INSTITUTION and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Walk up to the root
    root = dep
    while root.parent_deposit_id:
        parent = db.query(Deposit).filter(Deposit.id == root.parent_deposit_id).first()
        if not parent:
            break
        root = parent

    # Walk down collecting the chain
    chain = []
    current = root
    while current:
        inst = db.query(Institution).filter(Institution.id == current.institution_id).first()
        gap_days = None
        if chain:
            prev = chain[-1]
            if prev.get("maturity_date") and current.issue_date:
                prev_mat = datetime.fromisoformat(prev["maturity_date"]) if isinstance(prev["maturity_date"], str) else prev["maturity_date"]
                gap_days = (current.issue_date - prev_mat).days

        chain.append({
            "id": current.id,
            "deposit_id": current.deposit_id,
            "amount": current.amount,
            "bank_name": current.bank_name,
            "issue_date": current.issue_date.isoformat() if current.issue_date else None,
            "maturity_date": current.maturity_date.isoformat() if current.maturity_date else None,
            "lifecycle_status": current.lifecycle_status.value,
            "institution_name": inst.name if inst else "",
            "coverage_gap_days": gap_days,
        })
        # Find child
        child = db.query(Deposit).filter(Deposit.parent_deposit_id == current.id).first()
        current = child

    return chain


@router.get("/{dep_id}/passport", response_model=list[PassportEvent])
def get_passport(dep_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dep = db.query(Deposit).filter(Deposit.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if current_user.role == UserRole.INSTITUTION and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    events = []

    # Creation event
    events.append(PassportEvent(
        event_type="SUBMISSION", title="Deposit Registered",
        description=f"Deposit {dep.deposit_id} registered with amount ₹{dep.amount:,.0f}",
        timestamp=dep.created_at, actor=dep.created_by or "System", icon_color="blue",
    ))

    # Document events
    docs = db.query(Document).filter(Document.deposit_id == dep.id).order_by(Document.upload_time).all()
    for doc in docs:
        events.append(PassportEvent(
            event_type="DOCUMENT", title=f"Document Uploaded: {doc.document_type.value}",
            description=f"{doc.file_name} (SHA-256: {doc.file_hash[:16]}...)" if doc.file_hash else doc.file_name,
            timestamp=doc.upload_time, actor=doc.uploaded_by or "System", icon_color="purple",
            details={"hash": doc.file_hash, "type": doc.document_type.value},
        ))

        # Extraction events
        fields = db.query(ExtractedField).filter(ExtractedField.document_id == doc.id).all()
        if fields:
            low_conf = [f for f in fields if f.confidence and f.confidence < 0.75]
            events.append(PassportEvent(
                event_type="EXTRACTION", title="Fields Extracted via OCR",
                description=f"{len(fields)} fields extracted. {len(low_conf)} low-confidence.",
                timestamp=doc.upload_time, actor="OCR Engine", icon_color="indigo",
                details={"field_count": len(fields), "low_confidence_count": len(low_conf)},
            ))

    # Verification events
    verifs = db.query(VerificationEvent).filter(VerificationEvent.deposit_id == dep.id).order_by(VerificationEvent.checked_at).all()
    for v in verifs:
        color = "green" if v.status == VerificationStatus.VERIFIED else "red" if v.status == VerificationStatus.MISMATCH else "amber"
        events.append(PassportEvent(
            event_type="VERIFICATION", title=f"Verification: {v.status.value}",
            description=v.notes or f"Source: {v.source}",
            timestamp=v.checked_at, actor=v.verified_by or "System", icon_color=color,
            details={"status": v.status.value, "simulated": v.is_simulated, "reference": v.response_reference},
        ))

    # Task events
    tasks = db.query(Task).filter(Task.deposit_id == dep.id).order_by(Task.created_at).all()
    for t in tasks:
        events.append(PassportEvent(
            event_type="TASK", title=t.title,
            description=t.description or f"Task {t.task_type.value}",
            timestamp=t.created_at, actor="System", icon_color="amber",
            details={"status": t.status.value, "type": t.task_type.value},
        ))

    # Release request events
    releases = db.query(ReleaseRequest).filter(ReleaseRequest.deposit_id == dep.id).order_by(ReleaseRequest.submitted_at).all()
    for r in releases:
        events.append(PassportEvent(
            event_type="RELEASE", title=f"Release Request: {r.status.value}",
            description=f"Request {r.request_id} — Status: {r.status.value}",
            timestamp=r.submitted_at or dep.created_at, actor=r.submitted_by or "System", icon_color="cyan",
        ))

    # Audit trail for status changes
    audits = db.query(AuditEvent).filter(
        AuditEvent.object_type == "Deposit", AuditEvent.object_id == dep.deposit_id
    ).order_by(AuditEvent.timestamp).all()
    for a in audits:
        if a.action not in ("DEPOSIT_CREATED",):  # Skip duplicate of creation
            events.append(PassportEvent(
                event_type="STATUS_CHANGE", title=a.action.replace("_", " ").title(),
                description=a.reason or f"Action: {a.action}",
                timestamp=a.timestamp, actor=a.actor, icon_color="gray",
            ))

    events.sort(key=lambda e: e.timestamp)
    return events


@router.post("/{dep_id}/consistency-check", response_model=list[ConsistencyResult])
def consistency_check(dep_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dep = db.query(Deposit).filter(Deposit.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    if current_user.role == UserRole.INSTITUTION and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    docs = db.query(Document).filter(Document.deposit_id == dep.id, Document.is_current == True).all()
    results = []
    entered = {
        "bank_name": dep.bank_name or "",
        "account_holder": dep.account_holder or "",
        "receipt_no": dep.receipt_no or "",
        "amount": str(dep.amount),
        "issue_date": dep.issue_date.strftime("%Y-%m-%d") if dep.issue_date else "",
        "maturity_date": dep.maturity_date.strftime("%Y-%m-%d") if dep.maturity_date else "",
        "branch_name": dep.branch_name or "",
    }

    for doc in docs:
        fields = db.query(ExtractedField).filter(ExtractedField.document_id == doc.id).all()
        for f in fields:
            entered_val = entered.get(f.field_name, "")
            extracted_val = f.corrected_value if f.is_corrected else (f.extracted_value or "")
            match = compare_field_values(f.field_name, entered_val, extracted_val)
            results.append(ConsistencyResult(
                field_name=f.field_name,
                entered_value=entered_val,
                extracted_value=extracted_val,
                confidence=f.confidence or 0.0,
                match=match,
                source_document=doc.file_name,
            ))
    return results
