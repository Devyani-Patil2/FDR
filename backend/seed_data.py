"""Seed synthetic demo data for FDR GUARDIAN prototype."""
import json
from datetime import datetime, timedelta
from database import engine, SessionLocal, Base
from models import *
from auth import get_password_hash
from utils import generate_id


def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ── Institutions ───────────────────────────────────────────────────────
    institutions = [
        Institution(institution_id="INST-001", name="National Institute of Technology, Delhi",
                    region="North", contact_email="admin@nitdelhi.ac.in", contact_phone="011-26127586",
                    address="Sector-3, Dwarka, New Delhi-110078"),
        Institution(institution_id="INST-002", name="Rajiv Gandhi College of Engineering, Pune",
                    region="West", contact_email="office@rgce.edu.in", contact_phone="020-25678901",
                    address="Hinjewadi Phase 2, Pune-411057"),
        Institution(institution_id="INST-003", name="Sri Venkateswara Institute of Technology, Chennai",
                    region="South", contact_email="principal@svit.edu.in", contact_phone="044-23456789",
                    address="Sriperumbudur, Chennai-602117"),
        Institution(institution_id="INST-004", name="Bengal Engineering College, Kolkata",
                    region="East", contact_email="info@bec.ac.in", contact_phone="033-26684561",
                    address="Howrah, Kolkata-711103"),
        Institution(institution_id="INST-005", name="Madhya Pradesh Technical University, Bhopal",
                    region="Central", contact_email="registrar@mptu.edu.in", contact_phone="0755-2761234",
                    address="Airport Road, Bhopal-462033"),
    ]
    db.add_all(institutions)
    db.commit()

    # ── Users ──────────────────────────────────────────────────────────────
    pw = get_password_hash("password123")
    users = [
        User(username="admin", email="admin@fdrguardian.gov.in", hashed_password=pw,
             full_name="Rajesh Kumar (Admin)", role=UserRole.ADMIN),
        User(username="institution1", email="user@nitdelhi.ac.in", hashed_password=pw,
             full_name="Priya Sharma (NIT Delhi)", role=UserRole.INSTITUTION, institution_id=1),
        User(username="reviewer", email="reviewer@aicte.gov.in", hashed_password=pw,
             full_name="Amit Verma (Reviewer)", role=UserRole.REVIEWER),
        User(username="verifier", email="verifier@aicte.gov.in", hashed_password=pw,
             full_name="Sunita Patel (Verifier)", role=UserRole.VERIFIER),
        User(username="approver", email="approver@aicte.gov.in", hashed_password=pw,
             full_name="Dr. V.K. Singh (Approver)", role=UserRole.APPROVER),
        User(username="auditor", email="auditor@aicte.gov.in", hashed_password=pw,
             full_name="Meena Gupta (Auditor)", role=UserRole.AUDITOR),
    ]
    db.add_all(users)
    db.commit()

    # ── Deposits ───────────────────────────────────────────────────────────
    now = datetime.utcnow()
    deposits = [
        # INST-001: Active, expiring soon
        Deposit(deposit_id="DEP-2026-001", institution_id=1, amount=1000000,
                bank_name="State Bank of India", branch_name="Dwarka Branch",
                receipt_no="SBI-FDR-78234", account_holder="NIT Delhi Trust",
                issue_date=now - timedelta(days=335), maturity_date=now + timedelta(days=30),
                lifecycle_status=LifecycleStatus.EXPIRING, created_by="institution1"),
        # INST-001: Active, healthy
        Deposit(deposit_id="DEP-2026-002", institution_id=1, amount=2500000,
                bank_name="Punjab National Bank", branch_name="Connaught Place",
                receipt_no="PNB-FDR-45612", account_holder="NIT Delhi Trust",
                issue_date=now - timedelta(days=100), maturity_date=now + timedelta(days=265),
                lifecycle_status=LifecycleStatus.ACTIVE, created_by="institution1"),
        # INST-002: Matured
        Deposit(deposit_id="DEP-2025-003", institution_id=2, amount=1500000,
                bank_name="Bank of Baroda", branch_name="Hinjewadi Branch",
                receipt_no="BOB-FDR-33198", account_holder="RGCE Society",
                issue_date=now - timedelta(days=400), maturity_date=now - timedelta(days=35),
                lifecycle_status=LifecycleStatus.MATURED, created_by="institution1"),
        # INST-002: Active
        Deposit(deposit_id="DEP-2026-004", institution_id=2, amount=1000000,
                bank_name="Canara Bank", branch_name="Pune Main",
                receipt_no="CAN-FDR-22876", account_holder="RGCE Society",
                issue_date=now - timedelta(days=60), maturity_date=now + timedelta(days=305),
                lifecycle_status=LifecycleStatus.ACTIVE, created_by="institution1"),
        # INST-003: Replaced (old)
        Deposit(deposit_id="DEP-2024-005", institution_id=3, amount=2000000,
                bank_name="Indian Bank", branch_name="Sriperumbudur",
                receipt_no="IB-FDR-11234", account_holder="SVIT Trust",
                issue_date=now - timedelta(days=730), maturity_date=now - timedelta(days=365),
                lifecycle_status=LifecycleStatus.REPLACED, created_by="institution1"),
        # INST-003: Replacement (current, active)
        Deposit(deposit_id="DEP-2025-006", institution_id=3, amount=2000000,
                bank_name="Indian Bank", branch_name="Sriperumbudur",
                receipt_no="IB-FDR-55678", account_holder="SVIT Trust",
                issue_date=now - timedelta(days=350), maturity_date=now + timedelta(days=15),
                lifecycle_status=LifecycleStatus.EXPIRING, parent_deposit_id=5, created_by="institution1"),
        # INST-004: Active
        Deposit(deposit_id="DEP-2026-007", institution_id=4, amount=1800000,
                bank_name="Union Bank of India", branch_name="Howrah Branch",
                receipt_no="UBI-FDR-99012", account_holder="BEC Trust",
                issue_date=now - timedelta(days=150), maturity_date=now + timedelta(days=215),
                lifecycle_status=LifecycleStatus.ACTIVE, created_by="institution1"),
        # INST-004: Expiring
        Deposit(deposit_id="DEP-2025-008", institution_id=4, amount=500000,
                bank_name="State Bank of India", branch_name="Salt Lake",
                receipt_no="SBI-FDR-44567", account_holder="BEC Trust",
                issue_date=now - timedelta(days=358), maturity_date=now + timedelta(days=7),
                lifecycle_status=LifecycleStatus.EXPIRING, created_by="institution1"),
        # INST-005: Active
        Deposit(deposit_id="DEP-2026-009", institution_id=5, amount=1200000,
                bank_name="Bank of Baroda", branch_name="Airport Road Bhopal",
                receipt_no="BOB-FDR-77456", account_holder="MPTU Fund",
                issue_date=now - timedelta(days=200), maturity_date=now + timedelta(days=165),
                lifecycle_status=LifecycleStatus.ACTIVE, created_by="institution1"),
        # INST-005: Released
        Deposit(deposit_id="DEP-2024-010", institution_id=5, amount=800000,
                bank_name="Canara Bank", branch_name="Bhopal Main",
                receipt_no="CAN-FDR-66234", account_holder="MPTU Fund",
                issue_date=now - timedelta(days=800), maturity_date=now - timedelta(days=435),
                lifecycle_status=LifecycleStatus.RELEASED, created_by="institution1"),
        # INST-001: Another active one
        Deposit(deposit_id="DEP-2026-011", institution_id=1, amount=3000000,
                bank_name="State Bank of India", branch_name="Parliament Street",
                receipt_no="SBI-FDR-88912", account_holder="NIT Delhi Trust",
                issue_date=now - timedelta(days=50), maturity_date=now + timedelta(days=315),
                lifecycle_status=LifecycleStatus.ACTIVE, created_by="institution1"),
        # INST-003: Active
        Deposit(deposit_id="DEP-2026-012", institution_id=3, amount=1500000,
                bank_name="State Bank of India", branch_name="Chennai Main",
                receipt_no="SBI-FDR-12398", account_holder="SVIT Trust",
                issue_date=now - timedelta(days=80), maturity_date=now + timedelta(days=285),
                lifecycle_status=LifecycleStatus.ACTIVE, created_by="institution1"),
    ]
    db.add_all(deposits)
    db.commit()

    # ── Documents ──────────────────────────────────────────────────────────
    docs = [
        Document(document_id="DOC-001", deposit_id=1, document_type=DocumentType.FDR_RECEIPT,
                 file_name="SBI_FDR_78234.pdf", file_hash="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
                 storage_path="uploads/DOC-001.pdf", file_size=245000, uploaded_by="institution1"),
        Document(document_id="DOC-002", deposit_id=1, document_type=DocumentType.APPROVAL_LETTER,
                 file_name="NIT_Delhi_Approval_2026.pdf", file_hash="b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
                 storage_path="uploads/DOC-002.pdf", file_size=180000, uploaded_by="institution1"),
        Document(document_id="DOC-003", deposit_id=3, document_type=DocumentType.FDR_RECEIPT,
                 file_name="BOB_FDR_33198.pdf", file_hash="c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
                 storage_path="uploads/DOC-003.pdf", file_size=210000, uploaded_by="institution1"),
        Document(document_id="DOC-004", deposit_id=6, document_type=DocumentType.FDR_RECEIPT,
                 file_name="IB_FDR_55678.pdf", file_hash="d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
                 storage_path="uploads/DOC-004.pdf", file_size=195000, uploaded_by="institution1"),
    ]
    db.add_all(docs)
    db.commit()

    # ── Extracted Fields (simulating OCR) ──────────────────────────────────
    fields = [
        # Doc 1 fields – one amount mismatch for demo
        ExtractedField(document_id=1, field_name="bank_name", extracted_value="State Bank of India", confidence=0.97, page_no=1, bounding_box='{"x":120,"y":85,"width":220,"height":25}'),
        ExtractedField(document_id=1, field_name="receipt_no", extracted_value="SBI-FDR-78234", confidence=0.95, page_no=1, bounding_box='{"x":120,"y":120,"width":180,"height":25}'),
        ExtractedField(document_id=1, field_name="amount", extracted_value="800000", confidence=0.72, page_no=1, bounding_box='{"x":120,"y":155,"width":150,"height":25}'),  # Mismatch!
        ExtractedField(document_id=1, field_name="account_holder", extracted_value="NIT Delhi Trust", confidence=0.94, page_no=1, bounding_box='{"x":120,"y":190,"width":200,"height":25}'),
        ExtractedField(document_id=1, field_name="maturity_date", extracted_value=(now + timedelta(days=30)).strftime("%Y-%m-%d"), confidence=0.91, page_no=1, bounding_box='{"x":120,"y":225,"width":150,"height":25}'),
        ExtractedField(document_id=1, field_name="issue_date", extracted_value=(now - timedelta(days=335)).strftime("%Y-%m-%d"), confidence=0.93, page_no=1, bounding_box='{"x":120,"y":260,"width":150,"height":25}'),
    ]
    db.add_all(fields)
    db.commit()

    # ── Verification Events ────────────────────────────────────────────────
    verif_events = [
        VerificationEvent(deposit_id=1, source="Mock Bank Verification Service (Simulated)",
                          status=VerificationStatus.MISMATCH,
                          fields_compared=json.dumps({"amount": {"submitted": "1000000", "bank_record": "800000", "match": False},
                                                      "bank_name": {"submitted": "State Bank of India", "bank_record": "State Bank of India", "match": True}}),
                          response_reference="SIM-VER-A1B2C3D4", is_simulated=True, verified_by="verifier",
                          notes="Mismatch detected in amount field. [SIMULATED RESPONSE]"),
        VerificationEvent(deposit_id=2, source="Mock Bank Verification Service (Simulated)",
                          status=VerificationStatus.VERIFIED,
                          fields_compared=json.dumps({"amount": {"submitted": "2500000", "bank_record": "2500000", "match": True}}),
                          response_reference="SIM-VER-E5F6G7H8", is_simulated=True, verified_by="verifier",
                          notes="All fields match. [SIMULATED RESPONSE]"),
        VerificationEvent(deposit_id=7, source="Mock Bank Verification Service (Simulated)",
                          status=VerificationStatus.PENDING,
                          fields_compared=json.dumps({"status": "pending", "reason": "Processing delay"}),
                          response_reference="SIM-VER-I9J0K1L2", is_simulated=True, verified_by="verifier",
                          notes="Verification pending. [SIMULATED RESPONSE]"),
    ]
    db.add_all(verif_events)
    db.commit()

    # ── Tasks ──────────────────────────────────────────────────────────────
    tasks = [
        Task(task_id="TSK-001", deposit_id=1, task_type=TaskType.MATURITY_REMINDER,
             title="30-day Maturity Alert: DEP-2026-001",
             description="Deposit DEP-2026-001 (₹10,00,000) matures in 30 days.",
             due_date=now + timedelta(days=30), owner_id=3, status=TaskStatus.OPEN),
        Task(task_id="TSK-002", deposit_id=3, task_type=TaskType.OVERDUE_ACTION,
             title="OVERDUE: Deposit DEP-2025-003 matured 35 days ago",
             description="Deposit DEP-2025-003 (₹15,00,000) has matured. Follow-up required.",
             due_date=now - timedelta(days=35), owner_id=3, status=TaskStatus.OPEN),
        Task(task_id="TSK-003", deposit_id=1, task_type=TaskType.MISMATCH_REVIEW,
             title="Mismatch Review: DEP-2026-001 amount conflict",
             description="Bank verification shows ₹8,00,000 vs submitted ₹10,00,000.",
             due_date=now + timedelta(days=3), owner_id=3, status=TaskStatus.OPEN),
        Task(task_id="TSK-004", deposit_id=8, task_type=TaskType.MATURITY_REMINDER,
             title="7-day Maturity Alert: DEP-2025-008",
             description="Deposit DEP-2025-008 (₹5,00,000) matures in 7 days. Urgent.",
             due_date=now + timedelta(days=7), owner_id=3, status=TaskStatus.OPEN),
        Task(task_id="TSK-005", deposit_id=6, task_type=TaskType.MATURITY_REMINDER,
             title="30-day Maturity Alert: DEP-2025-006",
             description="Deposit DEP-2025-006 (₹20,00,000) matures in 15 days.",
             due_date=now + timedelta(days=15), owner_id=3, status=TaskStatus.OPEN),
    ]
    db.add_all(tasks)
    db.commit()

    # ── Checklist Items (RELEASE workflow) ─────────────────────────────────
    checklist_items = [
        ChecklistItem(rule_id="REL-001", version="1.0", workflow_type="RELEASE",
                      requirement="Request letter from the institution on official letterhead",
                      is_required=True, source_reference="APH 2024-2027, Clause 6.46"),
        ChecklistItem(rule_id="REL-002", version="1.0", workflow_type="RELEASE",
                      requirement="Original FDR receipt or certified copy",
                      is_required=True, source_reference="APH 2024-2027, Clause 6.46"),
        ChecklistItem(rule_id="REL-003", version="1.0", workflow_type="RELEASE",
                      requirement="Affidavit on stamp paper as per prescribed format",
                      is_required=True, source_reference="APH 2024-2027, Clause 6.46"),
        ChecklistItem(rule_id="REL-004", version="1.0", workflow_type="RELEASE",
                      requirement="Latest approval letter / Extension of Approval (EoA)",
                      is_required=True, source_reference="APH 2024-2027, Clause 6.46"),
        ChecklistItem(rule_id="REL-005", version="1.0", workflow_type="RELEASE",
                      requirement="No-dues certificate from relevant departments",
                      is_required=True, source_reference="APH 2024-2027, Clause 6.46"),
        ChecklistItem(rule_id="REL-006", version="1.0", workflow_type="RELEASE",
                      requirement="Bank account details for refund transfer",
                      is_required=True, source_reference="APH 2024-2027, Clause 6.46"),
        ChecklistItem(rule_id="REL-007", version="1.0", workflow_type="RELEASE",
                      requirement="Governing body resolution (if applicable)",
                      is_required=False, source_reference="APH 2024-2027"),
    ]
    db.add_all(checklist_items)
    db.commit()

    # ── Release Requests ───────────────────────────────────────────────────
    release1 = ReleaseRequest(
        request_id="REL-2026-001", deposit_id=10, checklist_version="1.0",
        status=ReleaseStatus.UNDER_SCRUTINY, submitted_by="institution1",
        submitted_at=now - timedelta(days=10), reviewer_id=3,
        reviewer_notes="Documents under review. Awaiting no-dues certificate.",
    )
    db.add(release1)
    db.commit()

    # Checklist results for release1
    for i, item_id in enumerate(range(1, 8), 1):
        status_map = {1: ChecklistItemStatus.SATISFIED, 2: ChecklistItemStatus.SATISFIED,
                      3: ChecklistItemStatus.DEFICIENT, 4: ChecklistItemStatus.SATISFIED,
                      5: ChecklistItemStatus.PENDING_VERIFICATION, 6: ChecklistItemStatus.SATISFIED,
                      7: ChecklistItemStatus.NOT_APPLICABLE}
        result = ChecklistResult(
            release_request_id=release1.id, checklist_item_id=item_id,
            status=status_map.get(i, ChecklistItemStatus.NOT_EVALUATED),
            evaluated_by="reviewer" if i <= 6 else None,
            evaluated_at=now - timedelta(days=5) if i <= 6 else None,
        )
        db.add(result)
    db.commit()

    release2 = ReleaseRequest(
        request_id="REL-2026-002", deposit_id=3, checklist_version="1.0",
        status=ReleaseStatus.DRAFT, submitted_by="institution1",
    )
    db.add(release2)
    db.commit()
    for item_id in range(1, 8):
        db.add(ChecklistResult(release_request_id=release2.id, checklist_item_id=item_id,
                               status=ChecklistItemStatus.NOT_EVALUATED))
    db.commit()

    # ── Audit Events ───────────────────────────────────────────────────────
    audit_events = [
        AuditEvent(actor="institution1", action="DEPOSIT_CREATED", object_type="Deposit",
                   object_id="DEP-2026-001", timestamp=now - timedelta(days=335),
                   after_value=json.dumps({"amount": 1000000, "bank": "State Bank of India"})),
        AuditEvent(actor="institution1", action="DOCUMENT_UPLOADED", object_type="Document",
                   object_id="DOC-001", timestamp=now - timedelta(days=334),
                   after_value=json.dumps({"file": "SBI_FDR_78234.pdf", "type": "FDR_RECEIPT"})),
        AuditEvent(actor="reviewer", action="OCR_EXTRACTION", object_type="Document",
                   object_id="DOC-001", timestamp=now - timedelta(days=333),
                   after_value=json.dumps({"fields_extracted": 6})),
        AuditEvent(actor="verifier", action="VERIFICATION_RUN", object_type="Deposit",
                   object_id="DEP-2026-001", timestamp=now - timedelta(days=330),
                   after_value=json.dumps({"status": "MISMATCH", "simulated": True})),
        AuditEvent(actor="institution1", action="DEPOSIT_CREATED", object_type="Deposit",
                   object_id="DEP-2026-002", timestamp=now - timedelta(days=100),
                   after_value=json.dumps({"amount": 2500000, "bank": "Punjab National Bank"})),
        AuditEvent(actor="verifier", action="VERIFICATION_RUN", object_type="Deposit",
                   object_id="DEP-2026-002", timestamp=now - timedelta(days=95),
                   after_value=json.dumps({"status": "VERIFIED", "simulated": True})),
        AuditEvent(actor="institution1", action="RELEASE_CREATED", object_type="ReleaseRequest",
                   object_id="REL-2026-001", timestamp=now - timedelta(days=10),
                   after_value=json.dumps({"deposit": "DEP-2024-010"})),
        AuditEvent(actor="reviewer", action="RELEASE_STATUS_CHANGED", object_type="ReleaseRequest",
                   object_id="REL-2026-001", timestamp=now - timedelta(days=8),
                   before_value=json.dumps({"status": "SUBMITTED"}),
                   after_value=json.dumps({"status": "UNDER_SCRUTINY"})),
    ]
    db.add_all(audit_events)
    db.commit()

    # ── Notifications ──────────────────────────────────────────────────────
    notifications = [
        Notification(user_id=3, title="New Maturity Alert", message="DEP-2026-001 matures in 30 days",
                     notification_type=NotificationType.MATURITY_ALERT, related_object_type="Deposit",
                     related_object_id="DEP-2026-001"),
        Notification(user_id=3, title="Mismatch Detected", message="Verification mismatch on DEP-2026-001",
                     notification_type=NotificationType.VERIFICATION_RESULT, related_object_type="Deposit",
                     related_object_id="DEP-2026-001"),
        Notification(user_id=2, title="Release Under Scrutiny", message="Your release request REL-2026-001 is under review",
                     notification_type=NotificationType.STATUS_CHANGE, related_object_type="ReleaseRequest",
                     related_object_id="REL-2026-001"),
    ]
    db.add_all(notifications)
    db.commit()

    db.close()
    print("[OK] Seed data created successfully!")
    print("   6 users | 5 institutions | 12 deposits | 4 documents | 3 verifications | 5 tasks | 2 releases | 7 checklist items | 8 audit events")
    print("   Login credentials: any username above with password 'password123'")


if __name__ == "__main__":
    seed()
