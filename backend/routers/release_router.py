from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import (
    ReleaseRequest, ReleaseStatus, Deposit, ChecklistItem, ChecklistResult,
    ChecklistItemStatus, User, Institution, UserRole, LifecycleStatus,
    VerificationEvent, VerificationStatus, ExtractedField, Document, Task, TaskType, TaskStatus
)
from schemas import (
    ReleaseRequestCreate, ReleaseRequestOut, ReleaseStatusUpdate,
    ReleaseRejectRequest, ChecklistResultOut, ChecklistResultUpdate, ChecklistItemOut
)
from auth import get_current_user, require_role
from utils import generate_id, log_audit
from ocr_service import compare_field_values

router = APIRouter(prefix="/api/releases", tags=["Release Requests"])


def _to_out(r: ReleaseRequest, db: Session) -> ReleaseRequestOut:
    dep = db.query(Deposit).filter(Deposit.id == r.deposit_id).first()
    inst = db.query(Institution).filter(Institution.id == dep.institution_id).first() if dep else None
    return ReleaseRequestOut(
        id=r.id, request_id=r.request_id, deposit_id=r.deposit_id,
        deposit_display_id=dep.deposit_id if dep else "",
        institution_name=inst.name if inst else "",
        checklist_version=r.checklist_version, status=r.status.value,
        submitted_by=r.submitted_by, submitted_at=r.submitted_at,
        reviewer_id=r.reviewer_id, reviewer_notes=r.reviewer_notes,
        approver_id=r.approver_id, approved_at=r.approved_at,
        rejection_reason=r.rejection_reason,
    )


@router.get("", response_model=list[ReleaseRequestOut])
@router.get("/", response_model=list[ReleaseRequestOut])
def list_releases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ReleaseRequest).join(Deposit)
    if current_user.role == UserRole.INSTITUTION:
        query = query.filter(Deposit.institution_id == current_user.institution_id)
    releases = query.order_by(ReleaseRequest.submitted_at.desc()).all()
    return [_to_out(r, db) for r in releases]


@router.post("", response_model=ReleaseRequestOut)
@router.post("/", response_model=ReleaseRequestOut)
def create_release(
    data: ReleaseRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dep = db.query(Deposit).filter(Deposit.id == data.deposit_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deposit not found")

    if current_user.role == UserRole.INSTITUTION and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Cannot create release request for another institution")

    existing = db.query(ReleaseRequest).filter(
        ReleaseRequest.deposit_id == data.deposit_id,
        ReleaseRequest.status.notin_([ReleaseStatus.REJECTED, ReleaseStatus.CLOSED])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="An active release request already exists for this deposit")

    release = ReleaseRequest(
        request_id=generate_id("REL"),
        deposit_id=data.deposit_id,
        checklist_version="1.0",
        status=ReleaseStatus.DRAFT,
        submitted_by=current_user.username,
    )
    db.add(release)
    db.commit()
    db.refresh(release)

    # Auto-create checklist results from RELEASE checklist items
    items = db.query(ChecklistItem).filter(ChecklistItem.workflow_type == "RELEASE").all()
    for item in items:
        result = ChecklistResult(
            release_request_id=release.id,
            checklist_item_id=item.id,
            status=ChecklistItemStatus.NOT_EVALUATED,
        )
        db.add(result)
    db.commit()

    log_audit(db, current_user.username, "RELEASE_CREATED", "ReleaseRequest", release.request_id,
              after_value={"deposit": dep.deposit_id})
    return _to_out(release, db)


@router.get("/{rel_id}", response_model=ReleaseRequestOut)
def get_release(rel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    release = db.query(ReleaseRequest).filter(ReleaseRequest.id == rel_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release request not found")

    dep = db.query(Deposit).filter(Deposit.id == release.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied to this release request")

    return _to_out(release, db)


@router.put("/{rel_id}/status")
def update_status(
    rel_id: int, data: ReleaseStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER", "APPROVER"])),
):
    release = db.query(ReleaseRequest).filter(ReleaseRequest.id == rel_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release request not found")

    dep = db.query(Deposit).filter(Deposit.id == release.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    old_status = release.status.value
    try:
        new_status = ReleaseStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    release.status = new_status
    if data.notes:
        release.reviewer_notes = data.notes

    # If being scrutinized or forwarded to authority, record reviewer_id
    if new_status in (ReleaseStatus.UNDER_SCRUTINY, ReleaseStatus.AWAITING_AUTHORITY) or current_user.role == UserRole.REVIEWER:
        if not release.reviewer_id:
            release.reviewer_id = current_user.id

    if new_status == ReleaseStatus.SUBMITTED:
        release.submitted_at = datetime.utcnow()
    db.commit()

    log_audit(db, current_user.username, "RELEASE_STATUS_CHANGED", "ReleaseRequest", release.request_id,
              before_value={"status": old_status}, after_value={"status": new_status.value},
              reason=data.notes)
    return {"message": f"Status updated to {new_status.value}"}


@router.post("/{rel_id}/submit")
def submit_release(rel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    release = db.query(ReleaseRequest).filter(ReleaseRequest.id == rel_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release request not found")

    dep = db.query(Deposit).filter(Deposit.id == release.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    release.status = ReleaseStatus.SUBMITTED
    release.submitted_at = datetime.utcnow()
    release.submitted_by = current_user.username
    db.commit()
    log_audit(db, current_user.username, "RELEASE_SUBMITTED", "ReleaseRequest", release.request_id)
    return {"message": "Release request submitted"}


@router.post("/{rel_id}/approve")
def approve_release(
    rel_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["APPROVER", "ADMIN"])),
):
    release = db.query(ReleaseRequest).filter(ReleaseRequest.id == rel_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release request not found")

    dep = db.query(Deposit).filter(Deposit.id == release.deposit_id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Associated deposit not found")

    # 1. Maker-Checker Enforcement: Reviewer cannot be Approver
    if release.reviewer_id and release.reviewer_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Maker-Checker violation: The reviewer who scrutinized/forwarded this release cannot be the approver."
        )
    if release.submitted_by and release.submitted_by == current_user.username:
        raise HTTPException(
            status_code=400,
            detail="Maker-Checker violation: The user who created/submitted this release cannot approve it."
        )

    # 2. Bank Verification Rule: Deposit must have a verified bank confirmation
    latest_verif = db.query(VerificationEvent).filter(
        VerificationEvent.deposit_id == release.deposit_id
    ).order_by(VerificationEvent.checked_at.desc()).first()

    if not latest_verif or latest_verif.status != VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=400,
            detail="Approval blocked: Bank verification status must be VERIFIED before release can be approved. Currently unverified or mismatch."
        )

    # 3. Unresolved Mismatch Rule: No OCR/field mismatches or open mismatch tasks
    fields = db.query(ExtractedField).join(Document).filter(Document.deposit_id == release.deposit_id).all()
    entered_vals = {
        "amount": str(dep.amount),
        "bank_name": dep.bank_name or "",
        "receipt_no": dep.receipt_no or "",
    }
    for f in fields:
        if f.field_name in entered_vals:
            ext_val = f.corrected_value if f.is_corrected else (f.extracted_value or "")
            if not compare_field_values(f.field_name, entered_vals[f.field_name], ext_val):
                raise HTTPException(
                    status_code=400,
                    detail=f"Approval blocked: Unresolved mismatch in field '{f.field_name}'. Entered: '{entered_vals[f.field_name]}', Extracted: '{ext_val}'. Please correct or resolve before approval."
                )

    open_mismatches = db.query(Task).filter(
        Task.deposit_id == release.deposit_id,
        Task.task_type == TaskType.MISMATCH_REVIEW,
        Task.status.in_([TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.ESCALATED])
    ).all()
    if open_mismatches:
        raise HTTPException(
            status_code=400,
            detail=f"Approval blocked: {len(open_mismatches)} open mismatch review tasks must be closed before approval."
        )

    # 4. Check all required checklist items are satisfied
    results = db.query(ChecklistResult).filter(ChecklistResult.release_request_id == rel_id).all()
    for r in results:
        item = db.query(ChecklistItem).filter(ChecklistItem.id == r.checklist_item_id).first()
        if item and item.is_required and r.status not in (ChecklistItemStatus.SATISFIED, ChecklistItemStatus.NOT_APPLICABLE):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve: checklist item '{item.requirement}' is not satisfied"
            )

    # All checks passed! Transition release and deposit
    release.status = ReleaseStatus.APPROVED
    release.approver_id = current_user.id
    release.approved_at = datetime.utcnow()

    # Update deposit lifecycle to RELEASED
    dep.lifecycle_status = LifecycleStatus.RELEASED
    db.commit()

    log_audit(db, current_user.username, "RELEASE_APPROVED", "ReleaseRequest", release.request_id,
              after_value={"deposit_id": dep.deposit_id, "deposit_status": "RELEASED"})
    return {"message": "Release request approved and FDR lifecycle updated to RELEASED"}


@router.post("/{rel_id}/reject")
def reject_release(
    rel_id: int, data: ReleaseRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["APPROVER", "ADMIN", "REVIEWER"])),
):
    release = db.query(ReleaseRequest).filter(ReleaseRequest.id == rel_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release request not found")
    release.status = ReleaseStatus.REJECTED
    release.rejection_reason = data.reason
    release.approver_id = current_user.id
    db.commit()
    log_audit(db, current_user.username, "RELEASE_REJECTED", "ReleaseRequest", release.request_id, reason=data.reason)
    return {"message": "Release request rejected"}


@router.get("/{rel_id}/checklist", response_model=list[ChecklistResultOut])
def get_checklist(rel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    release = db.query(ReleaseRequest).filter(ReleaseRequest.id == rel_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release request not found")

    dep = db.query(Deposit).filter(Deposit.id == release.deposit_id).first()
    if current_user.role == UserRole.INSTITUTION and dep and dep.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    results = db.query(ChecklistResult).filter(ChecklistResult.release_request_id == rel_id).all()
    out = []
    for r in results:
        item = db.query(ChecklistItem).filter(ChecklistItem.id == r.checklist_item_id).first()
        item_out = ChecklistItemOut(
            id=item.id, rule_id=item.rule_id, version=item.version,
            workflow_type=item.workflow_type, requirement=item.requirement,
            is_required=item.is_required, effective_date=item.effective_date,
            source_reference=item.source_reference,
        ) if item else None
        out.append(ChecklistResultOut(
            id=r.id, release_request_id=r.release_request_id,
            checklist_item_id=r.checklist_item_id, checklist_item=item_out,
            status=r.status.value, document_id=r.document_id,
            notes=r.notes, evaluated_by=r.evaluated_by, evaluated_at=r.evaluated_at,
        ))
    return out


@router.put("/{rel_id}/checklist/{result_id}")
def update_checklist_result(
    rel_id: int, result_id: int, data: ChecklistResultUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER", "VERIFIER"])),
):
    result = db.query(ChecklistResult).filter(
        ChecklistResult.id == result_id, ChecklistResult.release_request_id == rel_id
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Checklist result not found")

    try:
        new_status = ChecklistItemStatus(data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    old_status = result.status.value
    result.status = new_status
    result.document_id = data.document_id
    result.notes = data.notes
    result.evaluated_by = current_user.username
    result.evaluated_at = datetime.utcnow()
    db.commit()

    release = db.query(ReleaseRequest).filter(ReleaseRequest.id == rel_id).first()
    log_audit(db, current_user.username, "CHECKLIST_UPDATED", "ReleaseRequest",
              release.request_id if release else str(rel_id),
              before_value={"status": old_status}, after_value={"status": new_status.value})
    return {"message": "Checklist item updated"}
