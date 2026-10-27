"""
Mock Bank Verification Connector for FDR GUARDIAN prototype.
All responses are clearly marked as simulated.
"""
import random
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from models import Deposit, VerificationEvent, VerificationStatus


def run_mock_verification(db: Session, deposit_id: int, actor: str) -> VerificationEvent:
    """Simulate bank verification with controlled outcome distribution."""
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        return None

    # Weighted random outcome
    roll = random.random()
    if roll < 0.50:
        status = VerificationStatus.VERIFIED
        fields = _verified_fields(deposit)
        notes = "All fields match the bank records. [SIMULATED RESPONSE]"
    elif roll < 0.75:
        status = VerificationStatus.MISMATCH
        fields = _mismatch_fields(deposit)
        notes = "Mismatch detected in one or more fields. [SIMULATED RESPONSE]"
    elif roll < 0.90:
        status = VerificationStatus.PENDING
        fields = {"status": "pending", "reason": "Bank system processing delay"}
        notes = "Verification request is being processed by the bank. [SIMULATED RESPONSE]"
    else:
        status = VerificationStatus.UNAVAILABLE
        fields = {"status": "unavailable", "reason": "Bank verification service temporarily unavailable"}
        notes = "Unable to connect to bank verification service. [SIMULATED RESPONSE]"

    ref = f"SIM-VER-{uuid.uuid4().hex[:8].upper()}"

    event = VerificationEvent(
        deposit_id=deposit_id,
        source="Mock Bank Verification Service (Simulated)",
        checked_at=datetime.utcnow(),
        status=status,
        fields_compared=json.dumps(fields),
        response_reference=ref,
        is_simulated=True,
        verified_by=actor,
        notes=notes,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _verified_fields(deposit: Deposit) -> dict:
    return {
        "amount": {"submitted": str(deposit.amount), "bank_record": str(deposit.amount), "match": True},
        "bank_name": {"submitted": deposit.bank_name, "bank_record": deposit.bank_name, "match": True},
        "receipt_no": {"submitted": deposit.receipt_no, "bank_record": deposit.receipt_no, "match": True},
        "account_holder": {"submitted": deposit.account_holder, "bank_record": deposit.account_holder, "match": True},
        "maturity_date": {
            "submitted": deposit.maturity_date.strftime("%Y-%m-%d") if deposit.maturity_date else "N/A",
            "bank_record": deposit.maturity_date.strftime("%Y-%m-%d") if deposit.maturity_date else "N/A",
            "match": True
        },
    }


def _mismatch_fields(deposit: Deposit) -> dict:
    # Introduce a realistic mismatch
    mismatched_amount = deposit.amount + random.choice([100000, 200000, -100000, -200000])
    return {
        "amount": {"submitted": str(deposit.amount), "bank_record": str(mismatched_amount), "match": False},
        "bank_name": {"submitted": deposit.bank_name, "bank_record": deposit.bank_name, "match": True},
        "receipt_no": {"submitted": deposit.receipt_no, "bank_record": deposit.receipt_no, "match": True},
        "account_holder": {"submitted": deposit.account_holder, "bank_record": deposit.account_holder, "match": True},
        "maturity_date": {
            "submitted": deposit.maturity_date.strftime("%Y-%m-%d") if deposit.maturity_date else "N/A",
            "bank_record": deposit.maturity_date.strftime("%Y-%m-%d") if deposit.maturity_date else "N/A",
            "match": True
        },
    }
