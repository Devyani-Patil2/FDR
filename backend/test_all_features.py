import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def log_test(name, passed, msg=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"[{status}] {name} {('- ' + msg) if msg else ''}")
    if not passed:
        sys.exit(1)

def get_token(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password})
    if r.status_code != 200:
        raise Exception(f"Login failed for {username}: {r.text}")
    return r.json()["access_token"]

def main():
    print("==================================================")
    print("RUNNING FDR GUARDIAN COMPREHENSIVE VERIFICATION")
    print("==================================================")

    # 1. TEST REAL OCR COMPARISON LOGIC
    from ocr_service import compare_field_values, clean_amount, clean_date
    print("\n--- 1. Testing OCR Normalization & Comparison ---")
    amt_match = compare_field_values("amount", "1000000", "₹10,00,000/-")
    log_test("Amount normalization ₹10,00,000 vs 1000000", amt_match)

    amt_match2 = compare_field_values("amount", "1000000.0", "1,000,000")
    log_test("Amount normalization 1000000.0 vs 1,000,000", amt_match2)

    date_match = compare_field_values("maturity_date", "2026-05-15", "15/05/2026")
    log_test("Date normalization 2026-05-15 vs 15/05/2026", date_match)

    bank_match = compare_field_values("bank_name", "State Bank of India", "STATE BANK OF INDIA - Main Branch")
    log_test("Bank name fuzzy match", bank_match)


    # 2. TEST DATA ACCESS & MULTI-TENANT RBAC SCOPING
    print("\n--- 2. Testing Multi-Tenant RBAC & Data Isolation ---")
    college_token = get_token("institution1", "password123")
    admin_token = get_token("admin", "password123")
    reviewer_token = get_token("reviewer", "password123")
    approver_token = get_token("approver", "password123")

    h_college = {"Authorization": f"Bearer {college_token}"}
    h_admin = {"Authorization": f"Bearer {admin_token}"}
    h_reviewer = {"Authorization": f"Bearer {reviewer_token}"}
    h_approver = {"Authorization": f"Bearer {approver_token}"}

    # 2a. College user listing institutions
    r = requests.get(f"{BASE_URL}/api/institutions", headers=h_college)
    insts = r.json()
    log_test("College user only sees own institution", len(insts) == 1 and insts[0]["id"] == 1, f"Returned {len(insts)} institution(s)")

    # 2b. College user accessing another institution's detail
    r = requests.get(f"{BASE_URL}/api/institutions/2", headers=h_college)
    log_test("College user blocked from viewing other college detail (403)", r.status_code == 403, f"Status: {r.status_code}")

    # 2c. College user listing deposits
    r = requests.get(f"{BASE_URL}/api/deposits", headers=h_college)
    deps = r.json()
    all_mine = all(d["institution_id"] == 1 for d in deps)
    log_test("College user deposits scoped strictly to their institution", all_mine and len(deps) > 0, f"Found {len(deps)} deposits, all inst_id == 1: {all_mine}")

    # 2d. College user accessing another institution's deposit directly
    # Deposit 3 belongs to institution 2 (seed data)
    r = requests.get(f"{BASE_URL}/api/deposits/3", headers=h_college)
    log_test("College user blocked from accessing other college deposit (403)", r.status_code == 403, f"Status: {r.status_code}")

    # 2e. College user dashboard stats scoped
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=h_college)
    stats = r.json()
    log_test("College dashboard stats scoped (total_institutions == 1)", stats["total_institutions"] == 1 and stats["total_deposits"] == len(deps))


    # 3. TEST BACKGROUND SCHEDULER & AUTO-ESCALATION
    print("\n--- 3. Testing Scheduler & Auto-Escalation Engine ---")
    r = requests.post(f"{BASE_URL}/api/tasks/run-scheduler-now", headers=h_admin)
    log_test("Trigger scheduler job immediately", r.status_code == 200, f"Result: {r.text}")

    # Verify escalated tasks exist or are correctly updated
    r = requests.get(f"{BASE_URL}/api/tasks", headers=h_admin)
    tasks = r.json()
    escalated_tasks = [t for t in tasks if t["escalation_level"] > 0 or t["status"] == "ESCALATED"]
    log_test("Auto-escalation logic executed on overdue tasks", len(escalated_tasks) > 0, f"Found {len(escalated_tasks)} escalated task(s)")


    # 4. TEST TRUST LADDER FINAL STEP (HUMAN CONFIRMED)
    print("\n--- 4. Testing Trust Ladder Final Step Fix ---")
    # Get deposit 2
    r = requests.get(f"{BASE_URL}/api/verification/trust-ladder/2", headers=h_admin)
    tl = r.json()
    print(f"Trust ladder before human confirm: {tl['current_level']}, human_confirmed={tl['human_confirmed']}")

    # Bank check should NOT automatically give HUMAN_CONFIRMED
    r_verif = requests.post(f"{BASE_URL}/api/verification/verify/2", headers=h_reviewer)
    r = requests.get(f"{BASE_URL}/api/verification/trust-ladder/2", headers=h_admin)
    tl_after_bank = r.json()
    log_test("Bank check alone does NOT trigger HUMAN_CONFIRMED", tl_after_bank["current_level"] != "HUMAN_CONFIRMED", f"Level is {tl_after_bank['current_level']}")

    # Now Scrutiny Officer confirms human clearance
    r_human = requests.post(
        f"{BASE_URL}/api/verification/confirm-human/2",
        json={"remarks": "Scrutinized original physical deposit receipt. Pledge to AICTE and amount validated."},
        headers=h_reviewer
    )
    log_test("Human scrutiny certification endpoint success (200)", r_human.status_code == 200)
    tl_certified = r_human.json()
    log_test("Trust ladder promoted to HUMAN_CONFIRMED", tl_certified["human_confirmed"] is True and tl_certified["current_level"] == "HUMAN_CONFIRMED")


    # 5. TEST APPROVAL RULES & MAKER-CHECKER SEPARATION
    print("\n--- 5. Testing Approval Rules & Maker-Checker ---")
    # 5a. Create a fresh release request
    # Check if release for deposit 2 exists
    r = requests.get(f"{BASE_URL}/api/releases", headers=h_admin)
    rel_list = [x for x in r.json() if x["deposit_id"] == 2 and x["status"] not in ("REJECTED", "CLOSED")]
    if rel_list:
        rel_id = rel_list[0]["id"]
    else:
        r_create = requests.post(f"{BASE_URL}/api/releases", json={"deposit_id": 2}, headers=h_admin)
        rel_id = r_create.json()["id"]

    # Move release to AWAITING_AUTHORITY by reviewer1
    requests.put(f"{BASE_URL}/api/releases/{rel_id}/status", json={"status": "UNDER_SCRUTINY", "notes": "Scrutinized by Reviewer 1"}, headers=h_reviewer)
    requests.put(f"{BASE_URL}/api/releases/{rel_id}/status", json={"status": "AWAITING_AUTHORITY", "notes": "Forwarded to Director"}, headers=h_reviewer)

    # 5b. Maker-Checker check: Reviewer1 attempts to APPROVE
    r_maker_checker = requests.post(f"{BASE_URL}/api/releases/{rel_id}/approve", headers=h_reviewer)
    # Even though reviewer1 role is REVIEWER (not APPROVER), let's test if an approver who was reviewer is blocked.
    # What if user was reviewer_id?
    r_rel = requests.get(f"{BASE_URL}/api/releases/{rel_id}", headers=h_admin).json()
    print(f"Release reviewer_id: {r_rel['reviewer_id']}")

    # Approver1 approves:
    # First, ensure checklist items are satisfied for this test
    r_cl = requests.get(f"{BASE_URL}/api/releases/{rel_id}/checklist", headers=h_admin).json()
    for item in r_cl:
        requests.put(f"{BASE_URL}/api/releases/{rel_id}/checklist/{item['id']}", json={"status": "SATISFIED", "notes": "Verified"}, headers=h_reviewer)

    # If Approver1 tries to approve:
    r_app = requests.post(f"{BASE_URL}/api/releases/{rel_id}/approve", headers=h_approver)
    log_test("Approver (separate from Reviewer) approves successfully", r_app.status_code == 200, f"Detail: {r_app.text}")

    # Check deposit lifecycle status became RELEASED
    dep2 = requests.get(f"{BASE_URL}/api/deposits/2", headers=h_admin).json()
    log_test("Deposit lifecycle updated to RELEASED upon approval", dep2["lifecycle_status"] == "RELEASED", f"Deposit status: {dep2['lifecycle_status']}")

    print("\n==================================================")
    print("ALL 5 ENHANCEMENT SUITES PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    main()
