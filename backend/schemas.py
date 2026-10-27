from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ── Auth ───────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str
    institution_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    institution_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Institution ────────────────────────────────────────────────────────────────

class InstitutionCreate(BaseModel):
    institution_id: str
    name: str
    region: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class InstitutionOut(BaseModel):
    id: int
    institution_id: str
    name: str
    region: str
    status: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    deposit_count: int = 0

    class Config:
        from_attributes = True


# ── Deposit ────────────────────────────────────────────────────────────────────

class DepositCreate(BaseModel):
    institution_id: int
    amount: float
    bank_name: str
    branch_name: Optional[str] = None
    receipt_no: Optional[str] = None
    account_holder: Optional[str] = None
    issue_date: str  # ISO date string
    maturity_date: str


class DepositUpdate(BaseModel):
    amount: Optional[float] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    receipt_no: Optional[str] = None
    account_holder: Optional[str] = None
    maturity_date: Optional[str] = None
    lifecycle_status: Optional[str] = None


class DepositOut(BaseModel):
    id: int
    deposit_id: str
    institution_id: int
    institution_name: str = ""
    amount: float
    bank_name: str
    branch_name: Optional[str] = None
    receipt_no: Optional[str] = None
    account_holder: Optional[str] = None
    issue_date: datetime
    maturity_date: datetime
    lifecycle_status: str
    parent_deposit_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    days_to_maturity: int = 0
    document_count: int = 0
    trust_level: str = "UPLOADED"

    class Config:
        from_attributes = True


# ── Document ───────────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: int
    document_id: str
    deposit_id: int
    document_type: str
    file_name: str
    file_hash: Optional[str] = None
    file_size: Optional[int] = None
    upload_time: datetime
    uploaded_by: Optional[str] = None
    version: int
    is_current: bool

    class Config:
        from_attributes = True


class ExtractedFieldOut(BaseModel):
    id: int
    document_id: int
    field_name: str
    extracted_value: Optional[str] = None
    confidence: Optional[float] = None
    page_no: int = 1
    bounding_box: Optional[str] = None
    is_corrected: bool = False
    corrected_value: Optional[str] = None
    corrected_by: Optional[str] = None

    class Config:
        from_attributes = True


class FieldCorrectionRequest(BaseModel):
    corrected_value: str


# ── Verification ───────────────────────────────────────────────────────────────

class VerificationEventOut(BaseModel):
    id: int
    deposit_id: int
    source: str
    checked_at: datetime
    status: str
    fields_compared: Optional[str] = None
    response_reference: Optional[str] = None
    is_simulated: bool = True
    verified_by: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class HumanScrutinyRequest(BaseModel):
    remarks: str


class TrustLadderOut(BaseModel):
    uploaded: bool = False
    integrity_tracked: bool = False
    fields_extracted: bool = False
    cross_check_passed: bool = False
    source_verified: bool = False
    human_confirmed: bool = False
    current_level: str = "NOT_CHECKED"


# ── Task ───────────────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: int
    task_id: str
    deposit_id: int
    deposit_display_id: str = ""
    task_type: str
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    owner_id: Optional[int] = None
    owner_name: str = ""
    status: str
    escalation_level: int = 0
    created_at: datetime
    closed_at: Optional[datetime] = None
    closed_reason: Optional[str] = None
    is_overdue: bool = False

    class Config:
        from_attributes = True


class TaskCloseRequest(BaseModel):
    reason: str


class TaskReassignRequest(BaseModel):
    new_owner_id: int


# ── Release Request ────────────────────────────────────────────────────────────

class ReleaseRequestCreate(BaseModel):
    deposit_id: int


class ReleaseRequestOut(BaseModel):
    id: int
    request_id: str
    deposit_id: int
    deposit_display_id: str = ""
    institution_name: str = ""
    checklist_version: str
    status: str
    submitted_by: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewer_id: Optional[int] = None
    reviewer_notes: Optional[str] = None
    approver_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


class ReleaseStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class ReleaseRejectRequest(BaseModel):
    reason: str


# ── Checklist ──────────────────────────────────────────────────────────────────

class ChecklistItemOut(BaseModel):
    id: int
    rule_id: str
    version: str
    workflow_type: str
    requirement: str
    is_required: bool
    effective_date: Optional[datetime] = None
    source_reference: Optional[str] = None

    class Config:
        from_attributes = True


class ChecklistResultOut(BaseModel):
    id: int
    release_request_id: int
    checklist_item_id: int
    checklist_item: Optional[ChecklistItemOut] = None
    status: str
    document_id: Optional[int] = None
    notes: Optional[str] = None
    evaluated_by: Optional[str] = None
    evaluated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChecklistResultUpdate(BaseModel):
    status: str
    document_id: Optional[int] = None
    notes: Optional[str] = None


# ── Audit ──────────────────────────────────────────────────────────────────────

class AuditEventOut(BaseModel):
    id: int
    actor: str
    action: str
    object_type: Optional[str] = None
    object_id: Optional[str] = None
    timestamp: datetime
    before_value: Optional[str] = None
    after_value: Optional[str] = None
    reason: Optional[str] = None
    evidence_reference: Optional[str] = None

    class Config:
        from_attributes = True


# ── Dashboard ──────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_deposits: int = 0
    active_deposits: int = 0
    expiring_soon: int = 0
    matured: int = 0
    pending_verification: int = 0
    pending_releases: int = 0
    open_tasks: int = 0
    total_institutions: int = 0


class PriorityQueueItem(BaseModel):
    deposit_id: str
    institution_name: str
    reason: str
    priority: str  # HIGH, MEDIUM, LOW
    due_date: Optional[datetime] = None
    owner: str = "Unassigned"
    action: str = ""
    deposit_db_id: int = 0


class MaturityCalendarItem(BaseModel):
    month: str
    count: int


# ── Passport ───────────────────────────────────────────────────────────────────

class PassportEvent(BaseModel):
    event_type: str
    title: str
    description: str
    timestamp: datetime
    actor: Optional[str] = None
    details: Optional[dict] = None
    icon_color: str = "blue"


# ── Consistency Check ──────────────────────────────────────────────────────────

class ConsistencyResult(BaseModel):
    field_name: str
    entered_value: str
    extracted_value: str
    confidence: float
    match: bool
    source_document: str = ""
