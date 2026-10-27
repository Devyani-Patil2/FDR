import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from database import Base


# ── Enums ──────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    INSTITUTION = "INSTITUTION"
    REVIEWER = "REVIEWER"
    VERIFIER = "VERIFIER"
    APPROVER = "APPROVER"
    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"


class LifecycleStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    EXPIRING = "EXPIRING"
    MATURED = "MATURED"
    RENEWED = "RENEWED"
    REPLACED = "REPLACED"
    RELEASED = "RELEASED"


class DocumentType(str, enum.Enum):
    FDR_RECEIPT = "FDR_RECEIPT"
    AFFIDAVIT = "AFFIDAVIT"
    REQUEST_LETTER = "REQUEST_LETTER"
    APPROVAL_LETTER = "APPROVAL_LETTER"
    PAYMENT_PROOF = "PAYMENT_PROOF"
    OTHER = "OTHER"


class VerificationStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    MISMATCH = "MISMATCH"
    EXPIRED = "EXPIRED"
    PENDING = "PENDING"
    UNAVAILABLE = "UNAVAILABLE"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    NOT_CHECKED = "NOT_CHECKED"


class TaskType(str, enum.Enum):
    MATURITY_REMINDER = "MATURITY_REMINDER"
    VERIFICATION_PENDING = "VERIFICATION_PENDING"
    MISMATCH_REVIEW = "MISMATCH_REVIEW"
    RENEWAL_DUE = "RENEWAL_DUE"
    RELEASE_REVIEW = "RELEASE_REVIEW"
    OVERDUE_ACTION = "OVERDUE_ACTION"
    CORRECTION_REQUIRED = "CORRECTION_REQUIRED"


class TaskStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    ESCALATED = "ESCALATED"
    CLOSED = "CLOSED"


class ReleaseStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    DOCUMENTS_INCOMPLETE = "DOCUMENTS_INCOMPLETE"
    UNDER_SCRUTINY = "UNDER_SCRUTINY"
    CORRECTION_REQUIRED = "CORRECTION_REQUIRED"
    PENDING_CLEARANCE = "PENDING_CLEARANCE"
    AWAITING_AUTHORITY = "AWAITING_AUTHORITY"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RELEASED = "RELEASED"
    CLOSED = "CLOSED"


class ChecklistItemStatus(str, enum.Enum):
    SATISFIED = "SATISFIED"
    DEFICIENT = "DEFICIENT"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    NOT_EVALUATED = "NOT_EVALUATED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class InstitutionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class NotificationType(str, enum.Enum):
    MATURITY_ALERT = "MATURITY_ALERT"
    TASK_ASSIGNED = "TASK_ASSIGNED"
    STATUS_CHANGE = "STATUS_CHANGE"
    VERIFICATION_RESULT = "VERIFICATION_RESULT"
    SYSTEM = "SYSTEM"


# ── Models ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(300), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    institution = relationship("Institution", back_populates="users")
    tasks = relationship("Task", back_populates="owner", foreign_keys="Task.owner_id")
    notifications = relationship("Notification", back_populates="user")


class Institution(Base):
    __tablename__ = "institutions"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(300), nullable=False)
    region = Column(String(100), nullable=False)
    status = Column(SAEnum(InstitutionStatus), default=InstitutionStatus.ACTIVE)
    contact_email = Column(String(200))
    contact_phone = Column(String(20))
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="institution")
    deposits = relationship("Deposit", back_populates="institution")


class Deposit(Base):
    __tablename__ = "deposits"
    id = Column(Integer, primary_key=True, index=True)
    deposit_id = Column(String(50), unique=True, index=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    amount = Column(Float, nullable=False)
    bank_name = Column(String(200), nullable=False)
    branch_name = Column(String(200))
    receipt_no = Column(String(100))
    account_holder = Column(String(200))
    issue_date = Column(DateTime, nullable=False)
    maturity_date = Column(DateTime, nullable=False)
    lifecycle_status = Column(SAEnum(LifecycleStatus), default=LifecycleStatus.ACTIVE)
    parent_deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))

    institution = relationship("Institution", back_populates="deposits")
    parent = relationship("Deposit", remote_side="Deposit.id", backref="replacements")
    documents = relationship("Document", back_populates="deposit")
    verification_events = relationship("VerificationEvent", back_populates="deposit")
    tasks = relationship("Task", back_populates="deposit")
    release_requests = relationship("ReleaseRequest", back_populates="deposit")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(50), unique=True, index=True, nullable=False)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)
    document_type = Column(SAEnum(DocumentType), nullable=False)
    file_name = Column(String(300), nullable=False)
    file_hash = Column(String(64))
    storage_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    upload_time = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String(100))
    version = Column(Integer, default=1)
    is_current = Column(Boolean, default=True)

    deposit = relationship("Deposit", back_populates="documents")
    extracted_fields = relationship("ExtractedField", back_populates="document")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    extracted_value = Column(String(500))
    confidence = Column(Float)
    page_no = Column(Integer, default=1)
    bounding_box = Column(Text)  # JSON string
    is_corrected = Column(Boolean, default=False)
    corrected_value = Column(String(500))
    corrected_by = Column(String(100))

    document = relationship("Document", back_populates="extracted_fields")


class VerificationEvent(Base):
    __tablename__ = "verification_events"
    id = Column(Integer, primary_key=True, index=True)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)
    source = Column(String(200), default="Mock Bank Verification Service")
    checked_at = Column(DateTime, default=datetime.utcnow)
    status = Column(SAEnum(VerificationStatus), nullable=False)
    fields_compared = Column(Text)  # JSON string
    response_reference = Column(String(200))
    is_simulated = Column(Boolean, default=True)
    verified_by = Column(String(100))
    notes = Column(Text)

    deposit = relationship("Deposit", back_populates="verification_events")


class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, nullable=False)
    version = Column(String(20), default="1.0")
    workflow_type = Column(String(50), nullable=False)  # REGISTRATION, RELEASE, RENEWAL
    requirement = Column(String(500), nullable=False)
    is_required = Column(Boolean, default=True)
    effective_date = Column(DateTime, default=datetime.utcnow)
    source_reference = Column(String(300))
    created_at = Column(DateTime, default=datetime.utcnow)


class ChecklistResult(Base):
    __tablename__ = "checklist_results"
    id = Column(Integer, primary_key=True, index=True)
    release_request_id = Column(Integer, ForeignKey("release_requests.id"), nullable=False)
    checklist_item_id = Column(Integer, ForeignKey("checklist_items.id"), nullable=False)
    status = Column(SAEnum(ChecklistItemStatus), default=ChecklistItemStatus.NOT_EVALUATED)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    notes = Column(Text)
    evaluated_by = Column(String(100))
    evaluated_at = Column(DateTime)

    release_request = relationship("ReleaseRequest", back_populates="checklist_results")
    checklist_item = relationship("ChecklistItem")
    document = relationship("Document")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(50), unique=True, index=True, nullable=False)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)
    task_type = Column(SAEnum(TaskType), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    due_date = Column(DateTime)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.OPEN)
    escalation_level = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime)
    closed_reason = Column(Text)

    deposit = relationship("Deposit", back_populates="tasks")
    owner = relationship("User", back_populates="tasks", foreign_keys=[owner_id])


class ReleaseRequest(Base):
    __tablename__ = "release_requests"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(50), unique=True, index=True, nullable=False)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)
    checklist_version = Column(String(20), default="1.0")
    status = Column(SAEnum(ReleaseStatus), default=ReleaseStatus.DRAFT)
    submitted_by = Column(String(100))
    submitted_at = Column(DateTime)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_notes = Column(Text)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)

    deposit = relationship("Deposit", back_populates="release_requests")
    checklist_results = relationship("ChecklistResult", back_populates="release_request")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    approver = relationship("User", foreign_keys=[approver_id])


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(100), nullable=False)
    action = Column(String(200), nullable=False)
    object_type = Column(String(100))
    object_id = Column(String(100))
    timestamp = Column(DateTime, default=datetime.utcnow)
    before_value = Column(Text)  # JSON
    after_value = Column(Text)   # JSON
    reason = Column(Text)
    evidence_reference = Column(String(300))
    ip_address = Column(String(50))


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(300), nullable=False)
    message = Column(Text)
    notification_type = Column(SAEnum(NotificationType), default=NotificationType.SYSTEM)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    related_object_type = Column(String(100))
    related_object_id = Column(String(100))

    user = relationship("User", back_populates="notifications")
