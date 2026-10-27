export type UserRole = 'INSTITUTION' | 'REVIEWER' | 'VERIFIER' | 'APPROVER' | 'ADMIN' | 'AUDITOR';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Institution {
  id: number;
  institution_id: string;
  name: string;
  region: string;
  status: 'ACTIVE' | 'INACTIVE';
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at?: string;
  deposit_count: number;
}

export type LifecycleStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'MATURED' | 'RENEWED' | 'REPLACED' | 'RELEASED';

export interface Deposit {
  id: number;
  deposit_id: string;
  institution_id: number;
  institution_name: string;
  amount: number;
  bank_name: string;
  branch_name?: string;
  receipt_no?: string;
  account_holder?: string;
  issue_date: string;
  maturity_date: string;
  lifecycle_status: LifecycleStatus;
  parent_deposit_id?: number | null;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  days_to_maturity: number;
  document_count: number;
  trust_level: string;
}

export type DocumentType = 'FDR_RECEIPT' | 'AFFIDAVIT' | 'REQUEST_LETTER' | 'APPROVAL_LETTER' | 'PAYMENT_PROOF' | 'OTHER';

export interface DocumentItem {
  id: number;
  document_id: string;
  deposit_id: number;
  document_type: DocumentType;
  file_name: string;
  file_hash?: string;
  file_size?: number;
  upload_time: string;
  uploaded_by?: string;
  version: number;
  is_current: boolean;
}

export interface ExtractedField {
  id: number;
  document_id: number;
  field_name: string;
  extracted_value?: string;
  confidence?: number;
  page_no: number;
  bounding_box?: string;
  is_corrected: boolean;
  corrected_value?: string;
  corrected_by?: string;
}

export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'EXPIRED' | 'PENDING' | 'UNAVAILABLE' | 'MANUAL_REVIEW' | 'NOT_CHECKED';

export interface VerificationEvent {
  id: number;
  deposit_id: number;
  source: string;
  checked_at: string;
  status: VerificationStatus;
  fields_compared?: string;
  response_reference?: string;
  is_simulated: boolean;
  verified_by?: string;
  notes?: string;
}

export interface TrustLadder {
  uploaded: boolean;
  integrity_tracked: boolean;
  fields_extracted: boolean;
  cross_check_passed: boolean;
  source_verified: boolean;
  human_confirmed: boolean;
  current_level: string;
}

export type TaskType = 'MATURITY_REMINDER' | 'VERIFICATION_PENDING' | 'MISMATCH_REVIEW' | 'RENEWAL_DUE' | 'RELEASE_REVIEW' | 'OVERDUE_ACTION' | 'CORRECTION_REQUIRED';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'ACKNOWLEDGED' | 'ESCALATED' | 'CLOSED';

export interface Task {
  id: number;
  task_id: string;
  deposit_id: number;
  deposit_display_id: string;
  task_type: TaskType;
  title: string;
  description?: string;
  due_date?: string;
  owner_id?: number;
  owner_name: string;
  status: TaskStatus;
  escalation_level: number;
  created_at: string;
  closed_at?: string;
  closed_reason?: string;
  is_overdue: boolean;
}

export type ReleaseStatus = 'DRAFT' | 'SUBMITTED' | 'DOCUMENTS_INCOMPLETE' | 'UNDER_SCRUTINY' | 'CORRECTION_REQUIRED' | 'PENDING_CLEARANCE' | 'AWAITING_AUTHORITY' | 'APPROVED' | 'REJECTED' | 'RELEASED' | 'CLOSED';

export interface ReleaseRequest {
  id: number;
  request_id: string;
  deposit_id: number;
  deposit_display_id: string;
  institution_name: string;
  checklist_version: string;
  status: ReleaseStatus;
  submitted_by?: string;
  submitted_at?: string;
  reviewer_id?: number;
  reviewer_notes?: string;
  approver_id?: number;
  approved_at?: string;
  rejection_reason?: string;
}

export interface ChecklistItem {
  id: number;
  rule_id: string;
  version: string;
  workflow_type: string;
  requirement: string;
  is_required: boolean;
  effective_date?: string;
  source_reference?: string;
}

export interface ChecklistResult {
  id: number;
  release_request_id: number;
  checklist_item_id: number;
  checklist_item?: ChecklistItem;
  status: 'SATISFIED' | 'DEFICIENT' | 'NOT_APPLICABLE' | 'NOT_EVALUATED' | 'PENDING_VERIFICATION';
  document_id?: number;
  notes?: string;
  evaluated_by?: string;
  evaluated_at?: string;
}

export interface AuditEvent {
  id: number;
  actor: string;
  action: string;
  object_type?: string;
  object_id?: string;
  timestamp: string;
  before_value?: string;
  after_value?: string;
  reason?: string;
  evidence_reference?: string;
}

export interface DashboardStats {
  total_deposits: number;
  active_deposits: number;
  expiring_soon: number;
  matured: number;
  pending_verification: number;
  pending_releases: number;
  open_tasks: number;
  total_institutions: number;
}

export interface PriorityQueueItem {
  deposit_id: string;
  institution_name: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  due_date?: string;
  owner: string;
  action: string;
  deposit_db_id: number;
}

export interface MaturityCalendarItem {
  month: string;
  count: number;
}

export interface PassportEvent {
  event_type: string;
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  details?: Record<string, any>;
  icon_color: string;
}

export interface ConsistencyResult {
  field_name: string;
  entered_value: string;
  extracted_value: string;
  confidence: number;
  match: boolean;
  source_document: string;
}

export interface ChainNode {
  id: number;
  deposit_id: string;
  amount: number;
  bank_name: string;
  issue_date?: string;
  maturity_date?: string;
  lifecycle_status: LifecycleStatus;
  institution_name: string;
  coverage_gap_days?: number | null;
}
