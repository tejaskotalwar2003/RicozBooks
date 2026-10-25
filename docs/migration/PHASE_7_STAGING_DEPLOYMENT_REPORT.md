# RicozBooks — Phase 7: Render Staging Deployment & Blueprint Report

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Render Staging Deployment  
**Dedicated Branch:** `migration/next-express-mongodb`  
**GitHub Repository:** `https://github.com/tejaskotalwar2003/RicozBooks.git`  
**Latest Verified & Pushed Commit SHA:** `d0bbbd1`  
**Target Services:** `ricozbooks-api-staging` & `ricozbooks-web-staging`  
**Target Cloud Database:** MongoDB Atlas M0 Replica Set (AWS us-west-2, Oregon)  

---

## 1. Executive Summary & Readiness Status

Phase 7 prepares, secures, and publishes the staging deployment configuration for **RicozBooks** on Render. All code, configuration files, and dependencies on dedicated branch `migration/next-express-mongodb` have been pushed to GitHub origin and audited against strict production-safety invariants.

### Key Milestones Completed:
1. **Pushed to GitHub Origin:** Branch `migration/next-express-mongodb` is successfully synced with GitHub at commit `d0bbbd1`.
2. **Reproducible Test Baseline:**
   - Original FastAPI regression suite: **148 / 148 passed (100%)**.
   - Migrated Express.js API test suite: **52 / 52 passed across 9 suites (100%)**.
   - Shared package TypeScript build: **0 errors**.
   - Express API production build: **0 errors**.
   - Next.js 14 App Router production build: **0 errors**.
   - CSS styling fidelity: **90,971 bytes (~91 KB)** stylesheet verified with Plus Jakarta Sans and Burgundy/Gold palette.
3. **Render Blueprint Specification (`render.staging.yaml`):**
   - Declares isolated staging services: `ricozbooks-api-staging` and `ricozbooks-web-staging`.
   - Production services (`ricozbooks-api` and `ricozbooks-web`) on branch `main` remain completely untouched.
4. **Security & Seed Hardening:**
   - Removed hardcoded password fallbacks for staging and production in `SeedService.seedSuperAdmin()`.
   - Render's `generateValue: true` dynamically creates unique high-entropy secrets for `SUPERADMIN_PASSWORD` and `JWT_SECRET`.
   - Disabled demo accounts with default passwords (`admin123`) from seeding into staging.
5. **Staging Network & Port Configuration:**
   - Updated `apps/web/package.json` to `"start": "next start"` to respect Render's dynamic `$PORT`.
   - Hardened `apps/web/src/services/api.ts` with staging-aware host routing to prevent staging traffic from ever reaching production API endpoints.
   - Enhanced `apps/web/next.config.js` rewrites to forward `/api/v1/*` to `https://ricozbooks-api-staging.onrender.com/api/v1/*`.

---

## 2. Infrastructure Configuration & Blueprint Audit

### Staging Services Defined in [`render.staging.yaml`](file:///c:/Users/hp/Documents/RicozBooks/render.staging.yaml):

| Property | Express Backend (`ricozbooks-api-staging`) | Next.js Frontend (`ricozbooks-web-staging`) |
| :--- | :--- | :--- |
| **Service Type** | Web Service | Web Service |
| **Runtime Environment** | Node | Node |
| **Plan / Tier** | Free | Free |
| **Region** | Oregon (us-west-2) | Oregon (us-west-2) |
| **Git Branch** | `migration/next-express-mongodb` | `migration/next-express-mongodb` |
| **Build Command** | `npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/api` | `npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/web` |
| **Start Command** | `node apps/api/dist/server.js` | `npm run start --workspace=apps/web` |
| **Health Check Path** | `/api/v1/health` | `/` |
| **Target URL** | `https://ricozbooks-api-staging.onrender.com` | `https://ricozbooks-web-staging.onrender.com` |
| **Secret Management** | `JWT_SECRET` (Render auto-gen), `SUPERADMIN_PASSWORD` (Render auto-gen), `MONGODB_URI` (Atlas connection string) | `API_URL`, `NEXT_PUBLIC_API_URL` |

---

## 3. Mandatory User Action Required to Complete Cloud Deployment

Because deployment on Render requires authentication to the user's personal Render and MongoDB Atlas accounts (which are not accessible from the local CLI sandbox), the following 2 user steps are required to initiate the cloud build:

### Step 1: Provision MongoDB Atlas M0 Staging Database
1. Go to [MongoDB Atlas](https://cloud.mongodb.com) and create an **M0 Free Tier** cluster in AWS region **us-west-2 (Oregon)** named `ricozbooks-staging-cluster`.
2. Under **Database Access**, create a user `ricoz_staging_admin` with password authentication and `readWriteAnyDatabase` role.
3. Under **Network Access**, add IP `0.0.0.0/0` (required for Render dynamic egress).
4. Copy the connection string:
   ```text
   mongodb+srv://ricoz_staging_admin:<PASSWORD>@ricozbooks-staging-cluster.xxxx.mongodb.net/ricozbooks_staging?retryWrites=true&w=majority
   ```

### Step 2: Apply the Blueprint in Render Dashboard
1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\to$ **Blueprint**.
3. Connect the repository: `tejaskotalwar2003/RicozBooks`.
4. Configure blueprint settings:
   - **Branch:** `migration/next-express-mongodb`
   - **Blueprint File Path:** `render.staging.yaml`
5. Render will detect the 2 staging services (`ricozbooks-api-staging` and `ricozbooks-web-staging`).
6. Paste your `MONGODB_URI` into the environment variable field for `ricozbooks-api-staging`.
7. Click **Apply**.

---

## 4. Post-Deployment Verification & Smoke Testing

Once Render finishes deploying both services:

1. Retrieve the auto-generated `SUPERADMIN_PASSWORD` from Render Dashboard $\to$ `ricozbooks-api-staging` $\to$ **Environment**.
2. Run the automated smoke test suite locally:
   ```bash
   $env:SUPERADMIN_PASSWORD="<RENDER_GENERATED_PASSWORD>"
   node scripts/staging-smoke-test.js
   ```
3. The runner validates:
   - API health probe: `GET https://ricozbooks-api-staging.onrender.com/api/v1/health`
   - Web frontend SSR probe: `GET https://ricozbooks-web-staging.onrender.com`
   - Super Admin authentication with JWT issuance
   - Canonical 5 departments and 47 granular permissions
   - General Ledger double-entry balance constraints (rejection of imbalanced entries)
   - Trial Balance mathematical equality ($\sum Dr = \sum Cr$)
   - Balance Sheet equation check ($\text{Assets} = \text{Liabilities} + \text{Equity}$)
   - Negative security check: rejection of tampered tokens (HTTP 401)

---

## 5. Rollback Safety & Production Cutover Gate

- **Zero Risk to Production:** Production services (`ricozbooks-api` and `ricozbooks-web`) run from branch `main` with independent database connections. Staging changes have 0% impact on production availability.
- **Rollback Procedure:** If staging exhibits unexpected behavior, simply suspend the staging services in the Render Dashboard. Details documented in [`docs/migration/DEPLOYMENT_AND_ROLLBACK.md`](file:///c:/Users/hp/Documents/RicozBooks/docs/migration/DEPLOYMENT_AND_ROLLBACK.md).
- **Cutover Policy:** **No production cutover will be attempted without explicit review and approval.**
