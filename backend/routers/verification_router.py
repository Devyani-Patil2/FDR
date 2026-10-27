import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import (
    Deposit, Document, ExtractedField, VerificationEvent, VerificationStatus, User, UserRole
)
from schemas import VerificationEventOut, TrustLadderOut, HumanScrutinyRequest
from auth import get_current_user, require_role
from verification_service import run_mock_verification
from ocr_service import compare_field_values
from utils import log_audit

router = APIRouter(prefix="/api/verification", tags=["Verification"])


@router.post("/verify/{deposit_id}", response_model=VerificationEventOut)
def verify_deposit(
    deposit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER", "VERIFIER"])),
):
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    if current_user.role == UserRole.INSTITUTION and deposit.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied to this deposit")

    event = run_mock_verification(db, deposit_id, current_user.username)
    if not event:
        raise HTTPException(status_code=500, detail="Verification failed")

    log_audit(db, current_user.username, "VERIFICATION_RUN", "Deposit", deposit.deposit_id,
              after_value={"status": event.status.value, "simulated": True, "ref": event.response_reference})

    return VerificationEventOut(
        id=event.id, deposit_id=event.deposit_id, source=event.source,
        checked_at=event.checked_at, status=event.status.value,
        fields_compared=event.fields_compared, response_reference=event.response_reference,
        is_simulated=event.is_simulated, verified_by=event.verified_by, notes=event.notes,
    )


@router.post("/confirm-human/{deposit_id}", response_model=TrustLadderOut)
def confirm_human_scrutiny(
    deposit_id: int,
    req: HumanScrutinyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "REVIEWER", "APPROVER"])),
):
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    if not req.remarks or not req.remarks.strip():
        raise HTTPException(status_code=400, detail="Scrutiny remarks are required for human certification")

    # Record dedicated human scrutiny verification event
    ref = f"HUMAN-SCRUTINY-{current_user.id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    fields_payload = json.dumps({
        "certified_by": current_user.full_name or current_user.username,
        "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        "remarks": req.remarks.strip(),
        "timestamp": datetime.utcnow().isoformat(),
    })

    event = VerificationEvent(
        deposit_id=deposit_id,
        source="HUMAN_SCRUTINY",
        checked_at=datetime.utcnow(),
        status=VerificationStatus.VERIFIED,
        fields_compared=fields_payload,
        response_reference=ref,
        is_simulated=False,
        verified_by=current_user.username,
        notes=req.remarks.strip(),
    )
    db.add(event)
    db.commit()

    log_audit(
        db, current_user.username, "HUMAN_CLEARANCE_CONFIRMED", "Deposit", deposit.deposit_id,
        after_value={"remarks": req.remarks.strip(), "trust_level": "HUMAN_CONFIRMED", "reference": ref}
    )

    return trust_ladder(deposit_id, db, current_user)


@router.get("/history/{deposit_id}", response_model=list[VerificationEventOut])
def verification_history(
    deposit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    if current_user.role == UserRole.INSTITUTION and deposit.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied to this deposit")

    events = db.query(VerificationEvent).filter(
        VerificationEvent.deposit_id == deposit_id
    ).order_by(VerificationEvent.checked_at.desc()).all()

    return [
        VerificationEventOut(
            id=e.id, deposit_id=e.deposit_id, source=e.source,
            checked_at=e.checked_at, status=e.status.value,
            fields_compared=e.fields_compared, response_reference=e.response_reference,
            is_simulated=e.is_simulated, verified_by=e.verified_by, notes=e.notes,
        ) for e in events
    ]


@router.get("/trust-ladder/{deposit_id}", response_model=TrustLadderOut)
def trust_ladder(
    deposit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    if current_user.role == UserRole.INSTITUTION and deposit.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied to this deposit")

    docs = db.query(Document).filter(Document.deposit_id == deposit_id).all()
    uploaded = len(docs) > 0
    integrity = any(d.file_hash for d in docs)

    fields = db.query(ExtractedField).join(Document).filter(Document.deposit_id == deposit_id).all()
    extracted = len(fields) > 0

    # Cross-check: compare entered vs extracted using robust comparison logic
    cross_passed = False
    if extracted:
        mismatches = 0
        checks = 0
        entered_vals = {
            "amount": str(deposit.amount),
            "bank_name": deposit.bank_name or "",
            "receipt_no": deposit.receipt_no or "",
        }
        for f in fields:
            if f.field_name in entered_vals:
                checks += 1
                ext_val = f.corrected_value if f.is_corrected else (f.extracted_value or "")
                if not compare_field_values(f.field_name, entered_vals[f.field_name], ext_val):
                    mismatches += 1
        cross_passed = checks > 0 and mismatches == 0

    verifications = db.query(VerificationEvent).filter(VerificationEvent.deposit_id == deposit_id).all()
    source_verified = any(v.status == VerificationStatus.VERIFIED and v.source != "HUMAN_SCRUTINY" for v in verifications)
    human_confirmed = any(v.status == VerificationStatus.VERIFIED and v.source == "HUMAN_SCRUTINY" for v in verifications)

    if human_confirmed:
        level = "HUMAN_CONFIRMED"
    elif source_verified:
        level = "SOURCE_VERIFIED"
    elif cross_passed:
        level = "CROSS_CHECK_PASSED"
    elif extracted:
        level = "FIELDS_EXTRACTED"
    elif integrity:
        level = "INTEGRITY_TRACKED"
    elif uploaded:
        level = "UPLOADED"
    else:
        level = "NOT_CHECKED"

    return TrustLadderOut(
        uploaded=uploaded, integrity_tracked=integrity,
        fields_extracted=extracted, cross_check_passed=cross_passed,
        source_verified=source_verified, human_confirmed=human_confirmed,
        current_level=level,
    )
