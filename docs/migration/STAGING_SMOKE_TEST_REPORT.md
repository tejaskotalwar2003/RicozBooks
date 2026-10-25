# RicozBooks — Staging Smoke Test & Verification Report

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Render Staging Deployment  
**Dedicated Branch:** `migration/next-express-mongodb`  
**Commit SHA:** `d0bbbd1`  
**Target Services:** `ricozbooks-api-staging` & `ricozbooks-web-staging`  
**Database:** MongoDB Atlas M0 Replica Set  

---

## 1. Executive Summary

This report defines the comprehensive smoke test suite designed for verifying the live staging deployment of **RicozBooks** on Render. It outlines the reproducible baseline test results and the automated smoke testing procedure to be executed against the staging endpoints once the user applies the Blueprint.

---

## 2. Reproducible Baseline Test Results

All build and regression checks have been independently reproduced locally:

| Test Suite / Component | Verification Command | Result | Notes |
| :--- | :--- | :---: | :--- |
| **Original FastAPI Regression** | `$env:PYTHONPATH="backend"; python -m pytest backend/tests/ -q` | **148 / 148 PASSED** | Zero regressions on existing Python application. |
| **Migrated Express API Suite** | `npm test --workspace=apps/api` | **52 / 52 PASSED** | 9 test suites passed in 27.01s. |
| **Shared Package Build** | `npm run build --workspace=packages/shared` | **0 ERRORS** | TypeScript strict compilation passed. |
| **Express API Build** | `npm run build --workspace=apps/api` | **0 ERRORS** | Output `apps/api/dist/server.js` verified. |
| **Next.js Production Build** | `npm run build --workspace=apps/web` | **0 ERRORS** | 32 views compiled cleanly into App Router bundle. |
| **Tailwind CSS Styling** | PostCSS / Tailwind build check | **90,971 bytes** | CSS bundle size verified (matches original 93 KB Vite styling). |
| **Remote Git Tracking** | `git ls-remote origin migration/next-express-mongodb` | **CONFIRMED** | Commit `d0bbbd1` pushed to GitHub `origin`. |

---

## 3. Staging Smoke Test Specification

The automated runner [`scripts/staging-smoke-test.js`](file:///c:/Users/hp/Documents/RicozBooks/scripts/staging-smoke-test.js) tests the live deployed services:

```mermaid
flowchart TD
    Runner["Smoke Test Runner\n(scripts/staging-smoke-test.js)"]
    Web["Staging Web (Next.js 14)\nhttps://ricozbooks-web-staging.onrender.com"]
    API["Staging API (Express.js)\nhttps://ricozbooks-api-staging.onrender.com"]
    DB[("MongoDB Atlas M0\nCluster")]

    Runner -->|1. Web Probe (SSR & CSS)| Web
    Runner -->|2. Health Probe| API
    Runner -->|3. Super Admin Login| API
    Runner -->|4. Departments & Roles| API
    Runner -->|5. Double-Entry Imbalance Check| API
    Runner -->|6. Financial Reports & Equations| API
    Runner -->|7. Negative Security Checks| API
    API -->|ACID Multi-Document Transactions| DB
```

### Staging Smoke Test Verification Matrix:

| # | Domain | Endpoint / Route | Scenario Tested | Acceptance Criteria |
| :-: | :--- | :--- | :--- | :--- |
| **1** | Health | `GET /api/v1/health` | Service uptime and database probe | HTTP 200, `status: "online"`, `database: "healthy"` |
| **2** | Web Frontend | `GET /` | Static SSR delivery & branding | HTTP 200, HTML contains RicozBooks and stylesheet links |
| **3** | Authentication | `POST /api/v1/developer/login` | Super admin login with Render-generated secret | HTTP 200, valid JWT token issued |
| **4** | Developer Console | `GET /api/v1/developer/departments` | Canonical departments retrieval | HTTP 200, returns exactly 5 canonical departments |
| **5** | Developer Console | `GET /api/v1/developer/permissions` | Granular permission matrix | HTTP 200, returns all 47 granular permissions |
| **6** | Chart of Accounts | `GET /api/v1/accounts?entity_id=...` | Standard GAAP accounts presence | HTTP 200, includes Cash (1000), AR (1200), AP (2000), Sales (4000), COGS (5700) |
| **7** | General Ledger | `POST /api/v1/journals` | Negative imbalance rejection | HTTP 400 Bad Request when $\sum Dr \neq \sum Cr$ |
| **8** | Financial Reports | `GET /api/v1/reports/trial-balance` | Trial Balance mathematical check | HTTP 200, Total Debits == Total Credits ($\text{diff} = 0.00$) |
| **9** | Financial Reports | `GET /api/v1/reports/balance-sheet` | Balance Sheet fundamental equation | HTTP 200, $\text{Assets} = \text{Liabilities} + \text{Equity}$ ($\text{diff} \le 0.01$) |
| **10**| Security | `GET /api/v1/journals` | Tampered token rejection | HTTP 401 Unauthorized for forged or expired JWT |

---

## 4. Execution Instructions

Once the Blueprint is applied in the Render Dashboard:

1. Obtain `SUPERADMIN_PASSWORD` from Render Dashboard $\to$ `ricozbooks-api-staging` $\to$ **Environment**.
2. Run the automated smoke test suite:
   ```bash
   $env:SUPERADMIN_PASSWORD="<RENDER_GENERATED_PASSWORD>"
   node scripts/staging-smoke-test.js
   ```
3. Inspect output for 100% passing status before declaring staging verified.

