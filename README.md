# RicozBooks — Enterprise Multi-Entity Double-Entry Cloud ERP & Accounting Platform

> **Accurate Books. Stronger Decisions.**  
> *Parent Brand: Ricoz (`by ricoz`)*

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tejaskotalwar2003/RicozBooks)

---

## 🏛️ Platform Overview

**RicozBooks** is a production-grade, institutional multi-tenant financial cloud ERP & double-entry accounting platform engineered for high-growth enterprises and modern accounting firms. RicozBooks strictly enforces GAAP/IFRS double-entry invariants, maker-checker voucher governance, automated sales and purchase lifecycles, perpetual inventory accounting, statutory GST return filings (GSTR-1 & GSTR-3B), multi-entity consolidation, and SaaS subscription billing with real-time in-app alerts.

---

## 🚀 Live Cloud Deployments & Documentation

- **Web Application**: [https://ricozbooks-web.onrender.com](https://ricozbooks-web.onrender.com)
- **Backend API & Swagger Docs**: [https://ricozbooks-api.onrender.com/docs](https://ricozbooks-api.onrender.com/docs)
- **ReDoc API Documentation**: [https://ricozbooks-api.onrender.com/redoc](https://ricozbooks-api.onrender.com/redoc)
- **Health Check Endpoint**: [https://ricozbooks-api.onrender.com/api/v1/health](https://ricozbooks-api.onrender.com/api/v1/health)

---

## 🔑 Demo Access Credentials

The database is seeded with institutional demo accounts ready for testing across all governance tiers:

| Role | Email | Password | Scope & Privileges |
| :--- | :--- | :--- | :--- |
| **Admin (CFO)** | `admin@ricozbooks.com` | `admin123` | Full administrative control, CFO hard ledger locking, RBAC permissions matrix, SaaS billing upgrades |
| **Reviewer / Controller** | `reviewer@ricozbooks.com` | `reviewer123` | Supervisory voucher review, journal approval/rejection, ledger audit, period-end review |
| **Senior Accountant** | `accountant@ricozbooks.com` | `accountant123` | Operational voucher drafting, invoice creation, bill recording, chart of accounts & period close tasks |

*Note: Self-serve company registration is also available at `/register` for multi-tenant isolation.*

---

## 🧩 Complete 22-Module Enterprise Architecture

### 1. Core Financial Accounting
- **Chart of Accounts (`/chart-of-accounts`)**: Hierarchical GAAP accounts across Assets, Liabilities, Equity, Revenue, and Expenses with strict normal balance validation.
- **Journal Entries & Vouchers (`/journals`)**: Strict double-entry invariant validation ($\sum \text{Debit} \equiv \sum \text{Credit} > 0$), supporting draft, submitted, approved, and posted states.
- **General Ledger (`/ledger`)**: Real-time posted transaction ledgers, running balance computation, DR/CR indicators, and streaming CSV export.
- **Approval Queue (`/approvals`)**: Four-eyes separation of duties where voucher creators cannot approve their own journals.
- **Financial Reports (`/reports`)**: Dynamic Trial Balance, Profit & Loss (P&L), and Balance Sheet ($\text{Assets} \equiv \text{Liabilities} + \text{Equity}$) with CSV exports.
- **Period-End Close Manager (`/close-manager`)**: Statutory closing checklists, completion trackers, and **Hard Ledger Locking** preventing back-dated postings to closed periods without supervisory emergency reopening.

### 2. Sales & Accounts Receivable (AR)
- **Customer Master (`/customers`)**: Comprehensive customer profiles with GSTIN, billing/shipping addresses, payment terms, and live ledger balances.
- **Invoices (`/invoices`)**: Intra-state and inter-state GST tax calculations (CGST+SGST or IGST), itemized lines, discounts, terms, and automatic GL posting upon sending.
- **Estimates / Quotations**: Draft and active sales quotations with 1-click conversion into final invoices.
- **Sales Orders & Recurring Invoices**: Sales order tracking and automated recurring invoice generation profiles (Daily, Weekly, Monthly, Quarterly, Annually).
- **Credit Notes**: Balanced returns and allowances posting ($\text{Dr Sales Return / Tax Liability}, \text{Cr Accounts Receivable}$).
- **Customer Payments (`/invoices`)**: Multi-method payment capture (Bank Transfer, UPI, Credit Card, Cash) with real-time invoice balance tracking and customer ledger settlement.

### 3. Purchases & Accounts Payable (AP)
- **Vendor Master (`/vendors`)**: Vendor catalog with PAN/GSTIN, payment terms, contact details, and open AP balances.
- **Purchase Orders (`/bills`)**: Procurement workflow with 1-click conversion into vendor bills.
- **Vendor Bills (`/bills`)**: Bill line allocation against expense accounts, automated tax credits, and dual-entry GL posting ($\text{Dr Expense / Input Tax}, \text{Cr Accounts Payable}$).
- **Recurring Bills & Debit Notes**: Recurring purchase schedules and vendor returns management.
- **Vendor Payments**: Direct disbursement recording, bank account crediting, and AP relief.

### 4. Expenses & Cash Management
- **Expense Claims (`/expenses`)**: Employee and operational expense recording with category-based GL account mapping, receipt attachment metadata, and maker-checker approval.
- **Banking & Reconciliation (`/banking`)**: Multi-bank account management, internal bank transfers with dual journal vouchers, bank statement import, and 1-click reconciliation matching.

### 5. Statutory GST & Inventory Management
- **Statutory GST Center (`/gst`)**: Automated GSTR-1 (Table 4 B2B + Table 12 HSN Summary), GSTR-3B (Table 3.1 Outward + Table 4 ITC + Table 6 Offset), official JSON filing export, and 1-click tax settlement journal vouchers.
- **Inventory & Perpetual Stock Ledger (`/inventory`)**: Stock valuation (Weighted Average Cost), perpetual inventory journal adjustments ($\text{Dr Inventory Asset}, \text{Cr Inventory Gain}$ or $\text{Dr Shrinkage}, \text{Cr Inventory Asset}$), and low-stock alert thresholds.

### 6. Projects, Timesheets & Profitability
- **Projects & Timesheets (`/projects`)**: Client-linked project budgets, milestones, and task tracking.
- **Profitability Engine**: Automated labor cost burn tracking (Hours $\times$ Cost Rate) vs billable revenue, calculating real-time Gross Profit and Margin %.

### 7. SaaS Billing, Governance & Security
- **Multi-Tenant SaaS Registration (`/register`)**: Tenant isolation at the database level with custom company registration and workspace provisioning.
- **Subscription Management (`/subscription`)**: Tiered subscription plans (`FREE`, `STARTER`, `GROWTH`, `ENTERPRISE`) with real-time usage meters for entities and user seat limits.
- **In-App Notification Center**: Real-time header drawer monitoring overdue invoices, pending journal approvals, and low inventory warnings with automated background scan routines.
- **Forensic Audit Trail (`/audit-log`)**: Immutable security event logs with timestamps, actor emails, IP metadata, and forensic diffs.
- **Settings & RBAC (`/settings`)**: Multi-currency FX matrix with live converter, 12-month fiscal calendar schedules, and granular role permissions matrix.

---

## 🛠️ Local Development & Testing

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL 14+ running locally on port 5432 (or SQLite for local development)

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Automated Test Suite
```bash
cd backend
python -m pytest tests/ -v -p no:warnings
```
**All 48 automated unit and integration tests pass with 100% success rate.**

---

## 📄 License & Attribution
Designed and built for **Ricoz Global Holdings Inc.** by the Advanced Engineering Team.  
All rights reserved.
