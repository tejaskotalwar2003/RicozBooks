# RicozBooks-Next — Enterprise Multi-Entity Double-Entry Cloud ERP & Accounting Platform

> **Accurate Books. Stronger Decisions.**  
> *Parent Brand: Ricoz (`by ricoz`)*

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 🏛️ Platform Overview

**RicozBooks-Next** is a production-grade, multi-tenant financial cloud ERP and double-entry accounting platform engineered for high-growth enterprises and modern accounting firms. RicozBooks strictly enforces GAAP/IFRS double-entry invariants, maker-checker voucher governance, automated sales and purchase lifecycles, perpetual inventory accounting, statutory GST return filings (GSTR-1 & GSTR-3B), multi-entity consolidation, and SaaS subscription billing with real-time in-app alerts.

The platform is architected as a modern TypeScript monorepo powered by **Next.js 14**, **Node.js + Express.js**, **MongoDB Atlas**, and **npm workspaces**.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14** (App Router & Pages), React 18, TypeScript, Tailwind CSS, Lucide Icons | Responsive enterprise UI with client error boundaries and dynamic rendering |
| **Backend API** | **Node.js 20**, **Express.js**, TypeScript | RESTful API with helmet, CORS, rate limiting, and centralized error handling |
| **Database** | **MongoDB Atlas** (v7.0+), Mongoose ODM | Cloud document database with replica set transactions and Decimal128 math |
| **Shared Package** | **@ricozbooks/shared** (TypeScript, Zod) | Monorepo package with shared DTOs, Zod validation schemas, and enum definitions |
| **Monorepo** | **npm workspaces** (`packages/*`, `apps/*`) | Unified dependency management and decoupled package builds |
| **Deployment** | **Render Web Services** (`render.yaml`) | Dual managed cloud web services with zero-downtime auto-deploys |

---

## 📁 Repository Structure

```text
RicozBooks-Next/
├── apps/
│   ├── api/                   # Express.js REST API server (@ricozbooks/api)
│   │   ├── src/
│   │   │   ├── config/        # Environment and database configuration
│   │   │   ├── controllers/   # Express route controllers
│   │   │   ├── middleware/    # Auth, RBAC, tenant isolation, rate limiting
│   │   │   ├── models/        # Mongoose database models and schemas
│   │   │   ├── routes/        # Modular API routes (/api/v1/*)
│   │   │   ├── services/      # Business logic (accounting, GST, close manager, seed)
│   │   │   ├── app.ts         # Express application factory
│   │   │   └── server.ts      # HTTP server entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                   # Next.js 14 frontend web application (@ricozbooks/web)
│       ├── public/            # Static assets and logo
│       ├── src/
│       │   ├── app/           # Next.js App Router entry and layouts
│       │   ├── components/    # Reusable UI components, modals, and error boundaries
│       │   ├── context/       # React Context (Auth, InternalAuth)
│       │   ├── services/      # Frontend API clients and interceptors
│       │   └── views/         # Application page views (22+ modules)
│       ├── next.config.js
│       ├── package.json
│       ├── tailwind.config.js
│       └── tsconfig.json
├── packages/
│   └── shared/                # Shared types, Zod schemas, and utilities (@ricozbooks/shared)
│       ├── src/               # TypeScript source files
│       ├── package.json
│       └── tsconfig.json
├── package.json               # Root monorepo workspace configuration
├── package-lock.json          # Root lockfile
├── render.yaml                # Render Infrastructure-as-Code Blueprint
├── .gitignore                 # Monorepo git exclusion rules
└── README.md                  # Project documentation
```

---

## 🚀 Live Cloud Deployments

- **Web Application**: [https://ricozbooks-web.onrender.com](https://ricozbooks-web.onrender.com)
- **Backend API**: [https://ricozbooks-api.onrender.com](https://ricozbooks-api.onrender.com)
- **API Health Check**: [https://ricozbooks-api.onrender.com/api/v1/health](https://ricozbooks-api.onrender.com/api/v1/health)

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
- **Subscription Management (`/subscription`)**: Tiered subscription plans (`COMMUNITY`, `STARTER`, `GROWTH`, `ENTERPRISE`) with real-time usage meters for entities and user seat limits.
- **Super Admin & Developer Console (`/developer`)**: Department management (5 canonical departments), User management, Granular RBAC permissions matrix (47 permissions), and forensic audit logs.
- **In-App Notification Center**: Real-time header drawer monitoring overdue invoices, pending journal approvals, and low inventory warnings.
- **Forensic Audit Trail (`/audit-log`)**: Immutable security event logs with timestamps, actor emails, IP metadata, and forensic diffs.

---

## 🛠️ Local Development Quickstart

### Prerequisites
- **Node.js**: v18.18.0 or later (v20.x LTS recommended)
- **npm**: v9.0.0 or later
- **MongoDB**: MongoDB Atlas connection URI or local MongoDB v6.0+ instance

### 1. Installation
Clone the repository and install all workspace dependencies from the root directory:
```bash
git clone https://github.com/<your-username>/RicozBooks-Next.git
cd RicozBooks-Next
npm install
```

### 2. Environment Configuration
Create an `.env` file in `apps/api/` based on `apps/api/.env.example`:
```bash
cp apps/api/.env.example apps/api/.env
```
Ensure `MONGODB_URI` points to your MongoDB Atlas cluster:
```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/ricozbooks_dev?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
```

### 3. Build Shared Package & Applications
```bash
# Build shared package
npm run build:shared

# Build Express API
npm run build:api

# Build Next.js Web Frontend
npm run build:web

# Or build all workspaces in one command:
npm run build
```

### 4. Running the Applications
```bash
# Start backend API (http://localhost:5000)
npm run start:api

# Start frontend web application (http://localhost:3000)
npm run start:web

# For local development with hot reload:
npm run dev:api    # runs tsx watch on backend
npm run dev:web    # runs next dev on frontend
```

### 5. Running Automated Tests
```bash
npm run test
```

---

## ☁️ Deployment on Render

This repository includes a production-ready `render.yaml` specification that provisions both services automatically.

### 1. Backend Service (`ricozbooks-api`)
- **Runtime**: Node.js (20.11.0)
- **Root Directory**: `.`
- **Build Command**: `npm install && npm run build:api`
- **Start Command**: `npm run start:api`
- **Health Check Path**: `/api/v1/health`
- **Required Environment Variables**:
  - `MONGODB_URI`: Secure connection string to MongoDB Atlas
  - `JWT_SECRET`: Random 256-bit secret string (generated automatically)
  - `CORS_ORIGIN`: Allowed origins (e.g. `https://ricozbooks-web.onrender.com`)
  - `FRONTEND_URL`: `https://ricozbooks-web.onrender.com`

### 2. Frontend Service (`ricozbooks-web`)
- **Runtime**: Node.js (20.11.0)
- **Root Directory**: `.`
- **Build Command**: `npm install && npm run build:web`
- **Start Command**: `npm run start:web`
- **Health Check Path**: `/`
- **Required Environment Variables**:
  - `API_URL`: Backend URL for SSR requests (`https://ricozbooks-api.onrender.com`)
  - `NEXT_PUBLIC_API_URL`: Public API URL for client-side requests (`https://ricozbooks-api.onrender.com`)

---

## 🔒 Security Best Practices

- **Zero Committed Secrets**: `.env` and environment credentials are strictly excluded by `.gitignore`.
- **Database Transport Security**: MongoDB Atlas connections require TLS/SSL encryption.
- **RBAC & Tenant Isolation**: All incoming requests are authenticated via JWT and scoped to the active tenant organization.
- **Double-Entry Balance Verification**: Every journal posting mathematically verifies $\sum \text{Debit} \equiv \sum \text{Credit}$.

---

## 📄 License

Proprietary © 2026 Ricoz Technologies Pvt Ltd. All rights reserved.
