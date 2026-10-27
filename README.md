# FDR GUARDIAN

### Intelligent Security Deposit & FDR Lifecycle Management Portal
**AICTE Problem Statement 26265** | Department: **Regulation Bureau** | Theme: **Smart Automation** | Category: **Software**

---

## 🎯 Executive Overview & Pitch

> **"FDR GUARDIAN turns scattered FDR and security-deposit files into one traceable lifecycle record, where every deposit has a Lifecycle Passport, every deadline becomes an accountable task, every claim is labelled as submitted, extracted or source-verified, and every release request passes through human authorization gates."**

---

## 🚀 Key Differentiators & Implemented USPs

1. **Deposit Lifecycle Passport (Core USP):** Single continuous provenance timeline for each deposit recording initial registration, SHA-256 document hashing, OCR field extraction, bank verification responses, maturity alerts, and release closures.
2. **Trust Ladder (Trust-State Separation):** Strict 6-level separation:
   * Level 1: Uploaded (file received; authenticity not established)
   * Level 2: Integrity Tracked (SHA-256 hash computed)
   * Level 3: Fields Extracted (OCR parsed with confidence scores)
   * Level 4: Cross-Check Passed (internal consistency between form & document)
   * Level 5: Source Verified (independent bank verification confirmation)
   * Level 6: Human Confirmed (authorized officer clearance with evidence)
3. **Cross-Document Consistency Engine & Mismatch Map:** Side-by-side comparison between submitted form values and OCR receipt outputs (e.g. catches ₹10L vs ₹8L conflicts) with explainable triage notices.
4. **Deadline-to-Task Automation:** Automated scheduler calculates 90/60/30/7-day windows and overdue milestones, converting them into owned, trackable tasks with escalation levels.
5. **Replacement Lineage with Coverage-Gap Detection:** Chains original instruments through successive replacements (`Original → Replacement → Current`) with visual gap alerts.
6. **Policy-Aware Release Readiness Checker:** Versioned checklist mapped directly to **AICTE Approval Process Handbook (APH 2024–2027 Clause 6.46)** requirements.
7. **Safe Bank Connector Sandbox:** Simulates normalized bank verification responses (`is_simulated=True`) with realistic CBS states (`VERIFIED`, `MISMATCH`, `PENDING`, `UNAVAILABLE`).
8. **Explainable Priority Queue:** Transparent rule-based triage on the dashboard indicating exact rationale and recommended bureau action.
9. **Auto-Generated Deficiency Notice:** One-click formal notice generator citing specific missing or deficient items under AICTE regulations.
10. **Immutable Audit Trail:** Append-only log recording actor, timestamp, before/after values, and justification reasons.

---

## 🛠️ Technology Stack

* **Backend:** Python 3.12, FastAPI, SQLAlchemy ORM, Pydantic, Python-Jose (JWT), Passlib/Bcrypt
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, Date-fns
* **Database:** SQLite (pre-seeded with 5 institutions, 12 deposits, documents, verification events, tasks, releases, audit history)

---

## 🔑 Demo Credentials (Password for all: `password123`)

| Username | Full Name | Role | Capability / Access Scope |
|---|---|---|---|
| `reviewer` | Amit Verma | **REVIEWER** | Scrutiny Officer (OCR reviews, checklist evaluation, observation remarks) |
| `verifier` | Sunita Patel | **VERIFIER** | Bank Verification Officer (execute bank connector checks) |
| `approver` | Dr. V.K. Singh | **APPROVER** | Approving Authority (final release/refund approval gates) |
| `institution1` | Priya Sharma | **INSTITUTION** | Technical Institution (NIT Delhi — view portfolio, submit requests) |
| `admin` | Rajesh Kumar | **ADMIN** | System Administrator (full access, user & institution creation) |
| `auditor` | Meena Gupta | **AUDITOR** | Compliance Auditor (read-only inspect audit logs & passports) |

---

## ⚡ Quick Start Guide

### 1. Launch Backend API (Port 8000)
Double-click `run_backend.bat` or run:
```powershell
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Launch Frontend (Port 5173)
Double-click `run_frontend.bat` or run:
```powershell
cd frontend
npm run dev
```
Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 🎬 4-Minute Hackathon Demonstration Script

1. **Dashboard & Explainable Priority Queue:**
   * Login as `reviewer` (or use one-click persona button).
   * Note the 6 KPI cards, the monthly maturity distribution chart, and the Explainable Priority Queue.
   * Click **"Run Maturity Alert Scheduler"** to demonstrate automated 90/60/30/7-day milestone generation.
2. **Unified FDR Registry:**
   * Navigate to **FDR Registry** (`/deposits`).
   * Filter by status (`EXPIRING`, `MATURED`, `ACTIVE`) or bank name.
   * Click on deposit `DEP-2026-001` (NIT Delhi).
3. **Deposit Lifecycle Passport & Trust Ladder:**
   * Switch to the **Lifecycle Passport** tab to demonstrate the complete provenance timeline.
   * Switch to the **Trust Ladder** tab to show that uploaded documents are strictly separated from source-verified facts.
4. **Documents & Cross-Document Mismatch Map:**
   * Switch to **Documents & OCR** tab.
   * View the side-by-side **Mismatch Map** displaying the ₹10,00,000 vs ₹8,00,000 conflict detected between submitted form data and extracted OCR values.
5. **Safe Bank Connector Sandbox:**
   * Switch to **Bank Verification** tab and click **"Execute Bank Check"**.
   * Note the simulated normalized response and how it updates the Lifecycle Passport.
6. **Replacement Lineage Chain:**
   * Open deposit `DEP-2025-006` (SVIT Chennai) and click **Replacement Chain** tab.
   * Observe the arrow connector showing `DEP-2024-005 → DEP-2025-006` with continuous coverage validation.
7. **Policy-Aware Release Workflow & Deficiency Notice:**
   * Navigate to **Release Requests** (`/releases`) and open `REL-2026-001`.
   * View the **APH Clause 6.46 Checklist** and evaluate individual items.
   * Click **"Generate Deficiency Letter"** to show the auto-formatted official notice ready for dispatch.
8. **Audit Trail:**
   * Navigate to **Audit Trail** (`/audit`) to review the immutable event log.
