# RicozBooks — Enterprise Multi-Entity Double-Entry Accounting Platform

> **Accurate Books. Stronger Decisions.**  
> *Parent Brand: Ricoz (`by ricoz`)*

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tejaskotalwar2003/RicozBooks)

---

## 🏛️ Platform Overview

**RicozBooks** is a production-grade, institutional multi-entity financial accounting platform engineered to enforce GAAP/IFRS double-entry invariants, four-eyes voucher approval workflows, automated general ledgers, trial balance and financial statement reporting, period-end closing governance with hard ledger locks, multi-currency matrices, and granular Role-Based Access Control (RBAC).

---

## 🚀 1-Click Cloud Deployment on Render (100% Free Tier)

RicozBooks is configured with an Infrastructure-as-Code blueprint in [`render.yaml`](./render.yaml).

### Deploy in 3 Steps:
1. Click the **Deploy to Render** button above or navigate to [Render Blueprints](https://dashboard.render.com/blueprints).
2. Connect your GitHub repository: `https://github.com/tejaskotalwar2003/RicozBooks.git`.
3. Click **Apply**: Render will automatically provision:
   - **`ricozbooks-db`**: Free-tier managed PostgreSQL 16 database.
   - **`ricozbooks-api`**: FastAPI backend service (Python 3.11) with automatic database migrations and initial seed execution.
   - **`ricozbooks-web`**: React + Vite SPA static site with automatic reverse-proxy rewrites and environment linking.

---

## 🔑 Demo Access Credentials

Once deployed or running locally, sign in using the seeded test credentials:

| Role | Email | Password | Scope & Privileges |
| :--- | :--- | :--- | :--- |
| **Admin (CFO)** | `admin@ricozbooks.com` | `admin123` | Full administrative control, CFO hard ledger locking, RBAC permissions matrix |
| **Reviewer / Controller** | `reviewer@ricozbooks.com` | `reviewer123` | Supervisory voucher review, journal approval/rejection, ledger & reports audit |
| **Senior Accountant** | `accountant@ricozbooks.com` | `accountant123` | Operational voucher drafting, submission, chart of accounts & period close tasks |

---

## 🧩 Architectural Modules

1. **Multi-Entity Management (`/entities`)**: Multi-currency entity configuration (Ricoz India `INR`, Ricoz US `USD`, Ricoz UK `GBP`), GSTIN, PAN, and user-entity authorization.
2. **Chart of Accounts (`/chart-of-accounts`)**: Hierarchical GAAP accounts across Assets, Liabilities, Equity, Revenue, and Expenses with normal balance rules.
3. **Journal Entries & Vouchers (`/journals`)**: Strict double-entry invariant validation ($\sum \text{Debit} \equiv \sum \text{Credit} > 0$), draft saving, and line validation.
4. **Approval Queue (`/approvals`)**: Four-eyes separation of duties where creators cannot approve their own vouchers.
5. **General Ledger (`/ledger`)**: Real-time posted transaction ledgers, running balance computation, DR/CR indicators, and streaming CSV export.
6. **Financial Reports (`/reports`)**: Dynamic Trial Balance, Profit & Loss (P&L), and Balance Sheet ($\text{Assets} \equiv \text{Liabilities} + \text{Equity}$).
7. **Period-End Close Manager (`/close-manager`)**: Statutory closing checklists, completion trackers, and **Hard Ledger Locking** preventing back-dated postings to closed periods.
8. **Accounting Settings (`/settings`)**: Multi-currency FX rates matrix with live converter, 12-month fiscal calendar schedules, RBAC permission matrix, and statutory tax preferences.
9. **Forensic Audit Trail (`/audit-log`)**: Immutable security event logs with timestamps, actor emails, IP metadata, and forensic diffs.

---

## 🛠️ Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL 14+ running locally on port 5432

### Backend
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

### Automated Test Suite
```bash
cd backend
python -m pytest tests -v
```
*All 27 automated tests pass with 0 errors.*

---

## 📄 License & Attribution
Designed and built for **Ricoz Global Holdings Inc.** by the Advanced Engineering Team.
All rights reserved.

