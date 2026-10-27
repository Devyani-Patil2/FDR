# FDR GUARDIAN

### Intelligent Security Deposit & FDR Lifecycle Management Portal
**AICTE Problem Statement 26265** | Department: **Regulation Bureau** | Theme: **Smart Automation** | Category: **Software**


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

