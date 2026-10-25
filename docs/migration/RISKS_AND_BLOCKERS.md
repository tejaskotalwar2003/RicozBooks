# RICOZBOOKS — Risks, Blockers & Mitigation Register

**Document Version:** 1.7.0  
**Phase:** Phase 7 Deliverable  
**Scope:** Risk identification, impact rating, transaction concurrency, debit-credit policy verification, UI visual regression resolution, staging deployment security, and cloud release tracking.

---

## 1. Risk Evaluation & Status Matrix

| Risk ID | Risk Description | Category | Severity | Probability | Status / Resolution in Phase 7 |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **RSK-01** | **Render PostgreSQL Database Expiration** | Database | **HIGH** | **HIGH** | **RESOLVED & MITIGATED**: SeedService bootstraps standard Chart of Accounts, canonical departments, roles, permissions, workspace, and Super Admin. Standalone & replica set paths verified. |
| **RSK-02** | **Floating-Point Precision Errors** | Financial | **CRITICAL**| **LOW** | **RESOLVED**: `mongoose.Schema.Types.Decimal128` implemented across all monetary fields. Math utilities verified; Trial Balance and Balance Sheet equation checks verified with 0.00 delta. |
| **RSK-03** | **Non-Atomic Journal Posting / Concurrency** | Financial | **CRITICAL**| **LOW** | **RESOLVED**: Transaction utility `withTransaction` wraps critical paths. Automated embedded Replica Set with WiredTiger transactions available locally; MongoDB Atlas replica sets used in staging/production. |
| **RSK-04** | **API Contract Drift** | Integration| **HIGH** | **LOW** | **RESOLVED**: 100% route and envelope parity implemented. All endpoints verified via direct port 5000 and Next.js reverse proxy port 3000. |
| **RSK-05** | **Next.js SSR Hydration & Router Mismatches** | Frontend | **MEDIUM** | **LOW** | **RESOLVED**: App Router client-side dynamic boundary (`AppWrapper.tsx`) and `app/[...slug]/page.tsx` serve all 32 existing screens with 0 errors. |
| **RSK-06** | **Accidental Exposure of Secrets** | Security | **CRITICAL**| **LOW** | **RESOLVED**: Sensitive keys scrubbed from audit logs (`sanitizeAuditDetails`); NoSQL query injection operators (`$gt`, `$ne`) stripped. JWT secret loaded exclusively from environment. Hardcoded seed password removed for staging/production. |
| **RSK-07** | **Atlas Connection Exhaustion** | Infrastructure | **MEDIUM** | **LOW** | **RESOLVED**: Configured connection pool with `maxPoolSize: 10`, re-using cached Mongoose singleton across requests. |
| **RSK-08** | **Production Rollback Complexity** | Operational| **HIGH** | **LOW** | **RESOLVED**: Production `main` and original `backend/` and `frontend/` directories remain untouched and operational on Render. Staging services run under dedicated names. |
| **RSK-09** | **Tailwind CSS Utility Class Purging** | Frontend | **HIGH** | **LOW** | **RESOLVED**: Corrected `tailwind.config.js` content paths to scan `./src/**/*.{js,ts,jsx,tsx,mdx}`. Restored 91 KB CSS bundle matching original 93 KB Vite stylesheet. |
| **RSK-10** | **Local Zero-Config MongoDB Startup** | Development | **MEDIUM** | **LOW** | **RESOLVED**: Integrated `scripts/ensure-db.js` into `scripts/start-all.js` and `scripts/dev-all.js` to automatically detect or start embedded Replica Set on port 27017. |
| **RSK-11** | **Staging Environment Routing Cross-Contamination** | Network | **HIGH** | **LOW** | **RESOLVED**: Hardened `apps/web/src/services/api.ts` so staging domain dynamically routes exclusively to `ricozbooks-api-staging`, completely preventing traffic leakage to production. |
| **RSK-12** | **Render Dynamic Port Binding** | Deployment | **MEDIUM** | **LOW** | **RESOLVED**: Updated `apps/web/package.json` to `next start` (respecting dynamic `$PORT`), and added `API_URL` environment mapping to `render.staging.yaml`. |

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
- **Local Development / Standalone Node**: If running without an external MongoDB daemon, `scripts/ensure-db.js` launches an embedded single-node Replica Set with WiredTiger storage engine supporting multi-document transactions.

---

## 3. Staging Deployment Status & Gate

All code, configuration files, and dependencies are committed and pushed to GitHub:
- **Git Branch:** `migration/next-express-mongodb`
- **Pushed Commit:** `d0bbbd1`
- **Staging Blueprint:** [`render.staging.yaml`](file:///c:/Users/hp/Documents/RicozBooks/render.staging.yaml)
- **Status:** Ready for user to apply Blueprint in Render Dashboard with MongoDB Atlas M0 connection string.
- **Next Phase:** Phase 8 — Staging Verification & Production Cutover Plan (contingent upon staging smoke test pass and explicit user sign-off).
