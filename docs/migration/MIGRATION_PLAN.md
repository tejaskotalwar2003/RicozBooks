# RICOZBOOKS — Master Migration Plan & Phased Roadmap
## Zero-Loss Migration to Next.js + Node.js/Express.js + MongoDB

**Document Version:** 1.0.0  
**Phase:** Phase 1 Deliverable  
**Architect:** Senior Full-Stack Architect, Security Engineer & QA Lead  
**Governing Standard:** Zero-loss preservation of code, features, design, accounting rules, and security.

---

## 1. Architectural Blueprint & Target Monorepo Structure

To maintain separation of concerns, strict type sharing, and high modularity, the codebase will transition into a standard TypeScript monorepo using npm workspaces:

```text
ricozbooks/
├── apps/
│   ├── web/                                 # Frontend: Next.js 14+ (App Router) + TypeScript
│   │   ├── public/                          # Static brand assets, favicon, logo
│   │   ├── src/
│   │   │   ├── app/                         # App Router layout & page hierarchy
│   │   │   │   ├── (auth)/                  # Public auth: login, register, forgot-password
│   │   │   │   ├── (tenant)/                # Authenticated customer tenant workspace
│   │   │   │   │   ├── dashboard/           # Financial executive dashboard
│   │   │   │   │   ├── invoices/            # Sales invoices & line items
│   │   │   │   │   ├── customers/           # Customer directory & balances
│   │   │   │   │   ├── bills/               # Vendor bills & payments
│   │   │   │   │   ├── vendors/             # Vendor directory & AP ledger
│   │   │   │   │   ├── expenses/            # Expense claims & categories
│   │   │   │   │   ├── banking/             # Bank accounts & CSV reconciliation
│   │   │   │   │   ├── items/               # Items & Products Master
│   │   │   │   │   ├── inventory/           # Stock movements & adjustments
│   │   │   │   │   ├── gst/                 # GSTR-1, GSTR-3B compliance
│   │   │   │   │   ├── projects/            # Timesheets & project costing
│   │   │   │   │   ├── chart-of-accounts/   # Standard GAAP accounts & COGS 5700
│   │   │   │   │   ├── journals/            # Double-entry journals & approvals
│   │   │   │   │   ├── ledger/              # General Ledger & trial balance
│   │   │   │   │   ├── reports/             # Balance Sheet, P&L, Aging
│   │   │   │   │   ├── close-manager/       # Period-end close checklists
│   │   │   │   │   ├── entities/            # Legal entities management
│   │   │   │   │   ├── settings/            # Organization & team settings
│   │   │   │   │   └── security/            # User sessions & password security
│   │   │   │   ├── internal/                # Demo Management Portal (/internal/*)
│   │   │   │   ├── developer/               # Platform Developer Console (/developer/*)
│   │   │   │   ├── invite/[token]/          # Single-use invitation acceptance
│   │   │   │   ├── pay/[token]/             # Public customer payment portal
│   │   │   │   ├── layout.tsx               # Root Next.js layout & metadata
│   │   │   │   └── page.tsx                 # Public marketing landing page
│   │   │   ├── components/                  # Reusable UI components (100% design preserved)
│   │   │   ├── context/                     # AuthContext, InternalAuthContext
│   │   │   ├── hooks/                       # Custom React hooks
│   │   │   ├── lib/                         # Client utilities & React Query client
│   │   │   └── services/                    # Typed API client services
│   │   ├── package.json
│   │   ├── tailwind.config.js               # Preserved brand color palette
│   │   └── tsconfig.json
│   │
│   └── api/                                 # Backend: Node.js + Express.js + TypeScript
│       ├── src/
│       │   ├── config/                      # Environment settings & constants
│       │   ├── controllers/                 # HTTP controllers (24 modular domains)
│       │   ├── middleware/                  # Auth, RBAC, tenant isolation, error handler, rate limit
│       │   ├── models/                      # Mongoose models with Decimal128 & indexes
│       │   ├── repositories/                # Database query abstractions & atomic transactions
│       │   ├── routes/                      # Express routers mounted at /api/v1/*
│       │   ├── schemas/                     # Zod request validation schemas
│       │   ├── services/                    # Financial engines (sales, inventory, journal, gst)
│       │   ├── utils/                       # JWT, password hashing, audit sanitization, formatting
│       │   ├── app.ts                       # Express application setup & middleware chain
│       │   └── server.ts                    # Server listener & database connection lifecycle
│       ├── tests/                           # Jest / Supertest test suites (148 test parity)
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                              # Shared TypeScript types, enums & Zod schemas
│       ├── src/
│       │   ├── enums/                       # Roles, permissions, account types, invoice status
│       │   ├── types/                       # User, entity, journal, invoice data transfer objects
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                                    # Living migration documentation
│   └── migration/
├── scripts/                                 # Database migration, seed, and provisioning scripts
├── .env.example
├── .gitignore
├── package.json                             # Root npm workspace configuration
└── README.md
```

---

## 2. Phased Migration Execution Sequence

### Phase 1: Comprehensive Read-Only Audit (Current Step)
- **Goal:** Establish verified baseline across code, tests, database, and deployments without modifying application code.
- **Deliverables:**
  - `docs/migration/PHASE_1_AUDIT.md`
  - `docs/migration/FEATURE_INVENTORY.md`
  - `docs/migration/DATABASE_RECOVERY_PLAN.md`
  - `docs/migration/MIGRATION_PLAN.md`
  - `docs/migration/RISKS_AND_BLOCKERS.md`
- **Gating Check:** Stop and obtain user approval before creating branches or writing code.

---

### Approval Gate 1: Review Phase 1 Findings
*The architect presents Phase 1 findings, architecture designs, database recovery status, and obtains explicit permission to proceed to Phase 2.*

---

### Phase 2: Safe Migration Workspace Setup
- **Action:**
  1. Ensure `main` branch remains 100% clean and pristine.
  2. Create isolated migration branch: `git checkout -b migration/next-express-mongodb`.
  3. Initialize root npm monorepo workspaces (`apps/web`, `apps/api`, `packages/shared`).
  4. Preserve original `backend/` and `frontend/` directories intact side-by-side during active migration to ensure continuous side-by-side regression comparison.
  5. Configure TypeScript paths, shared packages, and test runners.

---

### Phase 3: Express.js Backend Migration & Security Implementation
- **Action:**
  1. Build strict TypeScript Express.js API mirroring all 24 routers and 247 endpoints.
  2. Implement core middleware:
     - `authMiddleware`: live database user validation, JWT verification, session termination on suspension.
     - `tenantMiddleware`: tenant isolation injecting `companyId` and `entityId`.
     - `rbacMiddleware`: server-side check for 47 granular permissions with Super Admin mandatory locks.
     - `errorHandler`: standard JSON errors with CORS headers preserved.
     - `rateLimiter`: brute-force protection on `/api/v1/auth/*`.
  3. Implement request validation with Zod schemas matching existing Pydantic models.
  4. Implement business engines:
     - `salesEngine`: invoice calculation, CGST/SGST/IGST, automated COGS debit, inventory decrementing.
     - `accountingEngine`: double-entry validation ($\sum \text{Debits} == \sum \text{Credits}$).
     - `inventoryEngine`: weighted average valuation, stock adjustments, movement logs.
     - `auditService`: append-only logs with regex secret redaction.
  5. Port all 148 backend tests to Jest/Supertest and achieve 100% passing parity.

---

### Phase 4: MongoDB Schema Engineering & Data Migration
- **Action:**
  1. Design and register 21 Mongoose schemas using `Decimal128` for monetary fields.
  2. Implement compound indexes for multi-tenant isolation:
     - `{ entityId: 1, code: 1 }` on `accounts` (unique).
     - `{ entityId: 1, sku: 1 }` on `products` (unique).
     - `{ organizationId: 1, invoiceNumber: 1 }` on `invoices` (unique).
     - `{ organizationId: 1, email: 1 }` on `invitations` (unique).
  3. Wrap financial postings in MongoDB multi-document transactions.
  4. Execute recovery procedure per `DATABASE_RECOVERY_PLAN.md`:
     - If PostgreSQL dump is provided, execute automated ETL transformation to MongoDB with checksum reconciliation.
     - If database is unrecoverable, execute verified idempotent seed script provisioning system entities, default accounts, departments, and roles.
  5. Verify trial balance and debit-credit equality.

---

### Phase 5: Next.js Frontend Migration (Zero Design Redesign)
- **Action:**
  1. Scaffold Next.js 14 App Router application in `apps/web`.
  2. Copy and adapt Tailwind configuration, CSS variables, and Plus Jakarta Sans typography.
  3. Migrate all 43 page views, layouts, headers, sidebars, and modals:
     - Preserve exact pixel-level layouts, responsive drawer, breadcrumbs, search bars, and action buttons.
     - Adapt `react-router-dom` hooks (`useNavigate`, `useLocation`, `useParams`) to Next.js equivalents (`useRouter`, `usePathname`, `useSearchParams`).
     - Wrap interactive components in `'use client'` while maintaining fast server-rendered shells.
  4. Port `AuthContext` and `InternalAuthContext` preserving login state, token refresh, and permissions caching.
  5. Update API clients to target the Express.js backend at `/api/v1/*`.

---

### Phase 6: Financial Correctness, RBAC & Audit Verification
- **Action:**
  1. Verify double-entry balancing rules across all journal, invoice, bill, and payment workflows.
  2. Verify maker-checker workflow: approver cannot approve their own submitted journals when maker-checker is active.
  3. Verify Developer Console: 5 canonical departments, user lifecycle, suspension immediate token revocation, and immutable audit trail.
  4. Verify multi-tenant boundary isolation: Tenant A cannot view or manipulate Tenant B's accounts, invoices, or customers.

---

### Phase 7: Automated Testing, Visual Regression & Acceptance
- **Action:**
  1. Execute unit and integration test suite (achieving $\ge 148$ passing tests).
  2. Perform visual regression testing against original screenshots across desktop (1440px), laptop (1024px), tablet (768px), and mobile (375px).
  3. Verify zero console errors and zero broken links.
  4. Produce `docs/migration/TEST_REPORT.md` and `docs/migration/UI_REGRESSION_REPORT.md`.

---

### Approval Gate 2: Staging Acceptance
*The architect presents test execution logs, visual regression diffs, and financial reconciliation reports to the user for formal staging sign-off.*

---

### Phase 8: Staging Deployment (Render + MongoDB Atlas)
- **Action:**
  1. Configure free-tier MongoDB Atlas cluster (M0 replica set) with network access controls and dedicated database user.
  2. Update `render.yaml` with staging definitions for `ricozbooks-api-node` and `ricozbooks-web-next`.
  3. Deploy staging services and verify `/health` and live UI navigation.

---

### Approval Gate 3: Explicit Production Cutover Approval
*Review staging environment, rollback readiness, and obtain user sign-off prior to production DNS or domain cutover.*

---

### Phase 9: Safe Production Release & Rollback Readiness
- **Action:**
  1. Maintain previous deployment on Render untouched until acceptance window elapses.
  2. Deploy production Next.js and Express.js containers.
  3. Run live smoke test on `/developer/login`, `/internal/login`, and `/login`.
  4. Provide documented one-click rollback procedure.
  5. Publish `docs/migration/FINAL_MIGRATION_REPORT.md`.

