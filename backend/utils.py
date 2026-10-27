import hashlib
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from models import AuditEvent


def compute_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def generate_id(prefix: str) -> str:
    short = uuid.uuid4().hex[:8].upper()
    return f"{prefix}-{short}"


def log_audit(
    db: Session,
    actor: str,
    action: str,
    object_type: str = None,
    object_id: str = None,
    before_value: dict = None,
    after_value: dict = None,
    reason: str = None,
    evidence_reference: str = None,
    ip_address: str = None,
):
    event = AuditEvent(
        actor=actor,
        action=action,
        object_type=object_type,
        object_id=object_id,
        timestamp=datetime.utcnow(),
        before_value=json.dumps(before_value) if before_value else None,
        after_value=json.dumps(after_value) if after_value else None,
        reason=reason,
        evidence_reference=evidence_reference,
        ip_address=ip_address,
    )
    db.add(event)
    db.commit()
    return event
