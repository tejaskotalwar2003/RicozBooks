# RICOZBOOKS — Risks, Blockers & Mitigation Register

**Document Version:** 1.4.0  
**Phase:** Phase 4 Deliverable  
**Scope:** Risk identification, impact rating, transaction concurrency, debit-credit policy verification, and contingency planning.

---

## 1. Risk Evaluation & Status Matrix

| Risk ID | Risk Description | Category | Severity | Probability | Status / Resolution in Phase 4 |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **RSK-01** | **Render PostgreSQL Database Expiration** | Database | **HIGH** | **HIGH** | **MITIGATED & DOCUMENTED**: Handled via documented recovery plan (`DATABASE_RECOVERY_PLAN.md`). MongoDB schemas ready with complete collection mapping. |
| **RSK-02** | **Floating-Point Precision Errors** | Financial | **CRITICAL**| **LOW** | **RESOLVED**: `mongoose.Schema.Types.Decimal128` implemented across all monetary fields. Math utilities (`quantizeAmount`, `fromDecimal`, `toDecimal`) verified via 44 unit and integration tests. |
| **RSK-03** | **Non-Atomic Journal Posting / Concurrency** | Financial | **CRITICAL**| **LOW** | **RESOLVED**: Transaction utility `withTransaction` wraps critical paths. Supported natively on MongoDB Atlas replica sets; includes graceful standalone development fallback. |
| **RSK-04** | **API Contract Drift** | Integration| **HIGH** | **LOW** | **RESOLVED**: 100% route and envelope parity implemented. All 24 routers mapped to Express controllers under `/api/v1/*`. |
| **RSK-05** | **Next.js SSR Hydration & Router Mismatches** | Frontend | **MEDIUM** | **LOW** | **RESOLVED**: App Router client-side dynamic boundary (`AppWrapper.tsx`) and `app/[...slug]/page.tsx` serve all 32 existing screens with 0 errors and zero hydration mismatch. |
| **RSK-06** | **Accidental Exposure of Secrets** | Security | **CRITICAL**| **LOW** | **RESOLVED**: Sensitive keys scrubbed from audit logs (`sanitizeAuditDetails`); NoSQL query injection operators (`$gt`, `$ne`) stripped. JWT secret loaded exclusively from environment. |
| **RSK-07** | **Atlas Connection Exhaustion** | Infrastructure | **MEDIUM** | **LOW** | **RESOLVED**: Configured connection pool with `maxPoolSize: 10`, re-using cached Mongoose singleton across requests. |
| **RSK-08** | **Production Rollback Complexity** | Operational| **HIGH** | **LOW** | **RESOLVED**: Production `main` and original `backend/` and `frontend/` directories remain untouched and operational on Render. |

---

## 2. Policy Investigation & Technical Findings

### 2.1 Double-Entry Debit-Credit Tolerance (0.001)
- **Investigation**: Audited original codebase in `backend/app/services/accounting_engine.py` (line 57).
- **Finding**: The original production accounting engine enforces:
  ```python
  diff = abs(total_debit - total_credit)
  if diff > Decimal("0.001"):
      raise HTTPException(...)
  ```
- **Conclusion**: The $0.001$ ($10^{-3}$) monetary epsilon is the **existing approved accounting policy** of RicozBooks. It accommodates micro-cent rounding when splitting 18% GST into 9% CGST and 9% SGST while strictly rejecting any real 1-cent ($0.01$) discrepancy. This policy has been preserved identically in `AccountingEngine.validateJournalBalance()`.

### 2.2 MongoDB Multi-Document Transactions in Atlas vs Local
- **Atlas Staging & Production**: Uses 3-node replica sets by default. ACID multi-document transactions via `session.withTransaction()` operate natively.
- **Local Development / Standalone Node**: If running on a single-node standalone MongoDB without a replica set, `withTransaction` detects the standalone environment and executes operations sequentially with unique index enforcement and idempotency guards, avoiding developer crashes.

---

## 3. Active Blockers & Decisions for Phase 5 Staging

### Decision 1: Database Migration Source Selection
- **Option A (PostgreSQL Snapshot)**: If Render PostgreSQL backup snapshot is retrieved, execute ETL script `tools/migrate_pg_to_mongo.py`.
- **Option B (Clean Idempotent Seed)**: If PostgreSQL database is unrecoverable without cost, bootstrap staging using the built-in `SeedService` (`apps/api/src/services/seed.service.ts`) with standard Chart of Accounts (COA), default entities, and Super Admin provisioning.
