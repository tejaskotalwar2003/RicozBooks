# RICOZBOOKS — Risks, Blockers & Mitigation Register

**Document Version:** 1.0.0  
**Phase:** Phase 1 Deliverable  
**Scope:** Risk identification, impact rating, mitigation strategy, and contingency planning for zero-loss migration.

---

## 1. Risk Evaluation Matrix

| Risk ID | Risk Description | Category | Severity | Probability | Mitigation Strategy & Contingency Plan |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **RSK-01** | **Render PostgreSQL Database Expiration / Inaccessibility** | Database | **HIGH** | **HIGH** | The internal DNS name `dpg-dalpi665vjqs73880hpg-a` no longer resolves on Render due to 30-day Free Tier expiration. Check Render Dashboard for suspended backup snapshot. If recoverable without cost or if paid upgrade is approved, dump via `pg_dump`. If unrecoverable, document limitation transparently and bootstrap MongoDB using verified idempotent seeders (`migrate_entities.py`, `seed.py`). Never invent fake records. |
| **RSK-02** | **Floating-Point Precision Errors in MongoDB** | Financial | **CRITICAL**| **MEDIUM** | In MongoDB, standard numeric fields default to double precision (IEEE 754), which causes rounding errors in accounting calculations (e.g. `0.1 + 0.2 = 0.30000000000000004`). **Mitigation:** Mandate `Decimal128` (or integer minor-units: paisa/cents) across all Mongoose schemas for balances, debit, credit, tax, and inventory rates. |
| **RSK-03** | **Non-Atomic Journal Posting / Partial Writes** | Financial | **CRITICAL**| **MEDIUM** | In a distributed document store, saving an invoice without updating AR or stock would break double-entry ledger balance. **Mitigation:** Require multi-document ACID transactions via `session.withTransaction()` on MongoDB replica sets (supported on MongoDB Atlas M0 Free Tier). |
| **RSK-04** | **API Contract Drift Between FastAPI & Express.js** | Integration| **HIGH** | **MEDIUM** | If Express.js controllers alter field naming (e.g. `camelCase` vs `snake_case`) or response envelopes, the frontend UI will fail with runtime errors. **Mitigation:** Maintain strict field parity using Zod schemas matching existing Pydantic models. Preserve `/api/v1/*` route structure and identical JSON response contracts. |
| **RSK-05** | **Next.js SSR Hydration & Router Hook Regressions** | Frontend | **MEDIUM** | **MEDIUM** | Porting React Router DOM (`useNavigate`, `useLocation`, `useParams`) directly to Next.js App Router can trigger SSR hydration mismatches. **Mitigation:** Use `'use client'` on interactive views, leverage Next.js native hooks (`useRouter`, `usePathname`, `useSearchParams`), and verify zero hydration warnings in browser console. |
| **RSK-06** | **Accidental Exposure of Secrets or Connection Strings** | Security | **CRITICAL**| **LOW** | MongoDB connection URIs contain username/password strings that must never be committed. **Mitigation:** Strict `.gitignore`, automated pre-commit hook checks, `.env.example` templates without values, and server-side environment injection on Render / Atlas. |
| **RSK-07** | **MongoDB Atlas Free Tier Connection Exhaustion** | Infrastructure | **MEDIUM** | **MEDIUM** | MongoDB Atlas Free Tier (M0) enforces a limit of 500 concurrent connections. Serverless or multiple Express instances can exhaust connections if unmanaged. **Mitigation:** Configure Mongoose connection pool: `maxPoolSize: 10`, reuse cached connection singleton across requests. |
| **RSK-08** | **Production Rollback Complexity** | Operational| **HIGH** | **LOW** | Deploying a broken migration could disrupt live user access without a rapid rollback mechanism. **Mitigation:** In accordance with Absolute Rule #14, keep the existing working Render deployment (`ricozbooks-api` and `ricozbooks-web`) live and intact during migration until staging validation is approved. |

---

## 2. Active Blockers & Required User Decisions

### Blocker 1: Production PostgreSQL Database Recovery Decision
- **Current Fact:** Render backend health check confirms `(psycopg2.OperationalError) could not translate host name "dpg-dalpi665vjqs73880hpg-a"`.
- **Action Required by User:**
  1. Inspect `https://dashboard.render.com` under `ricozbooks-db`.
  2. Determine if a downloadable snapshot or a paid un-suspend option ($7/mo) exists.
  3. Inform the architect whether to proceed with paid recovery or proceed with clean idempotent seed bootstrap in MongoDB.

---

### Blocker 2: Phase 1 Sign-Off & Phase 2 Authorization
- **Current Fact:** Phase 1 audit and documentation are 100% complete. In accordance with the prompt ("Stop after Phase 1 and wait for approval before modifying application files"), no application code or branch changes will be initiated until explicit approval is granted.
- **Action Required by User:** Review Phase 1 deliverables and authorize creation of branch `migration/next-express-mongodb`.

