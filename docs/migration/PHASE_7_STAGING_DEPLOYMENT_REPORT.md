# RicozBooks — Phase 7: Free Staging Deployment on Render & MongoDB Atlas M0

**Document Version:** 1.1.0  
**Phase:** Phase 7 — Free Staging Deployment on Render  
**Dedicated Branch:** `migration/next-express-mongodb`  
**GitHub Repository:** `https://github.com/tejaskotalwar2003/RicozBooks.git`  
**Latest Pushed Commit SHA:** `705cbd4`  
**Target Services:** `ricozbooks-api-staging` & `ricozbooks-web-staging`  
**Target Cloud Database:** MongoDB Atlas M0 Free Tier (AWS us-west-2, Oregon)  

---

## 1. Executive Summary & Pre-Deployment Audit

Phase 7 executes staging preparation for **RicozBooks** on Render and MongoDB Atlas utilizing **100% free-tier resources** with zero paid service upgrades.

### 1.1 Pre-Deployment Verification Checklist:
- [x] **Git Safety & Isolation:** Working strictly on `migration/next-express-mongodb`. Branch `main` and original directories `backend/` and `frontend/` have **zero diffs** against production.
- [x] **Reproducible Test Baseline:**
  - Original FastAPI backend: **148 / 148 passed (100%)**
  - Migrated Express.js API: **52 / 52 passed across 9 suites (100%)**
  - Shared package TypeScript build: **0 errors**
  - Express API production build: **0 errors**
  - Next.js 14 App Router production build: **0 errors**
  - Tailwind CSS styling bundle: **90,971 bytes (~91 KB)** verified with Plus Jakarta Sans and Burgundy/Gold palette.
- [x] **Authentication Flow Audit:**
  - Verified `apps/web/src` contains **zero** hardcoded references to `localhost:8000` or legacy FastAPI routes.
  - Standard login routes through `useAuth().login` $\to$ `api.login` $\to$ `POST /api/v1/auth/login`.
  - Developer console login routes through `DeveloperLogin.tsx` $\to$ `api.developerLogin` $\to$ `POST /api/v1/auth/developer/login` (with aliasing in `apps/api/src/routes/developer.routes.ts` supporting `POST /api/v1/developer/login`).
- [x] **Render Port Binding Audit:**
  - API binds to dynamic `$PORT` via `config.port = parseInt(process.env.PORT || '5000', 10)`. Hardcoded `PORT: 8000` removed from Blueprint.
  - Frontend binds to dynamic `$PORT` via `next start` in `apps/web/package.json`.
- [x] **Staging Isolation & Routing:**
  - `apps/web/src/services/api.ts` audited to ensure browser sessions on `ricozbooks-web-staging.onrender.com` dynamically target `ricozbooks-api-staging`, completely preventing traffic leakage to production.
  - `apps/web/next.config.js` rewrites `/api/v1/:path*` to `${rawApiUrl}/api/v1/:path*`.
- [x] **Super Admin & Seed Security:**
  - Removed hardcoded default passwords for staging and production in `SeedService.seedSuperAdmin()`.
  - Render Blueprint uses `generateValue: true` for `SUPERADMIN_PASSWORD` and `JWT_SECRET`.
  - Demo accounts (`admin@ricozbooks.com` with `admin123`) are explicitly disabled in staging and production environments.

---

## 2. MongoDB Atlas M0 Free Tier Compatibility & Architecture

The application is prepared for a dedicated staging database: `ricozbooks_staging`.

### 2.1 M0 Technical Compatibility Matrix:

| Feature / Requirement | Application Need | Atlas M0 Capability | Verification Finding |
| :--- | :--- | :--- | :--- |
| **High Availability** | Resilience | 3-node replica set | Native on Atlas M0 |
| **ACID Transactions** | Multi-document transactions (`session.withTransaction`) | WiredTiger storage engine | Supported natively on M0 |
| **Storage Allocation** | Staging data | 512 MB storage | Ample for accounting records & audit logs |
| **Connection Pooling** | Concurrency management | 500 maximum connections | Application pool capped at `maxPoolSize: 10` |
| **Cost** | Zero paid upgrades | $0.00 / month forever | 100% free tier compliant |
| **Inactivity Pause** | Standby behavior | Pauses after 60 days of inactivity | Auto-resumes in ~1–2 mins upon connection request |
| **Data Backup / Export**| Snapshot capability | `mongodump` archive utility | Handled via standard CLI: `mongodump --archive --gzip` |

### 2.2 Security & Least-Privilege Access:
- **User:** `ricoz_staging_admin`
- **Role:** Scoped strictly to `readWrite` on database `ricozbooks_staging`.
- **Network Access:** `0.0.0.0/0` (required for Render dynamic container egress). Transport encrypted via TLS; authentication via SCRAM-SHA-256.

---

## 3. Render Staging Blueprint Audit (`render.staging.yaml`)

The Blueprint creates **only two staging services**, leaving production untouched:

```yaml
services:
  # 1. Express Backend API Service
  - type: web
    name: ricozbooks-api-staging
    runtime: node
    plan: free
    region: oregon
    autoDeploy: false
    branch: migration/next-express-mongodb
    buildCommand: "npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/api"
    startCommand: "node apps/api/dist/server.js"
    healthCheckPath: /api/v1/health
    envVars:
      - key: NODE_ENV
        value: staging
      - key: API_PREFIX
        value: /api/v1
      - key: APP_VERSION
        value: 1.3.0
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 24h
      - key: MONGODB_URI
        sync: false
      - key: CORS_ORIGIN
        value: https://ricozbooks-web-staging.onrender.com,http://localhost:3000
      - key: SUPERADMIN_EMAIL
        value: admin@ricoz.in
      - key: SUPERADMIN_PASSWORD
        generateValue: true

  # 2. Next.js 14 Frontend Web Service
  - type: web
    name: ricozbooks-web-staging
    runtime: node
    plan: free
    region: oregon
    autoDeploy: false
    branch: migration/next-express-mongodb
    buildCommand: "npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/web"
    startCommand: "npm run start --workspace=apps/web"
    healthCheckPath: /
    envVars:
      - key: NODE_ENV
        value: production
      - key: API_URL
        value: https://ricozbooks-api-staging.onrender.com
      - key: NEXT_PUBLIC_API_URL
        value: https://ricozbooks-api-staging.onrender.com
      - key: NEXT_PUBLIC_APP_ENV
        value: staging
```

---

## 4. AWS Cloud Portability Design

The staging stack has been engineered to maintain strict cloud portability for future migration to AWS:

1. **Standard 12-Factor Configuration:** All application parameters (`MONGODB_URI`, `PORT`, `JWT_SECRET`, `CORS_ORIGIN`, `API_URL`) are loaded from standard environment variables. Zero proprietary Render SDKs or hooks are used.
2. **Container Portability:** The backend and frontend run standard Node.js runtime commands (`node apps/api/dist/server.js`, `next start`), making them instantly packagable into container images for AWS App Runner, AWS ECS (Fargate), or AWS EKS.
3. **Database Portability:** The Mongoose ORM layer connects via standard MongoDB wire protocol. In AWS, this can point directly to Amazon DocumentDB (MongoDB-compatible) or an AWS VPC-peered MongoDB Atlas dedicated cluster with zero code modifications.

---

## 5. Mandatory User Action Required to Deploy

Because Render and MongoDB Atlas require personal account authentication, deployment requires these two manual actions:

### Action 1: Provision MongoDB Atlas M0 Free Tier Database
1. Log in to [MongoDB Atlas Console](https://cloud.mongodb.com).
2. Click **Build a Database** $\to$ select **M0 Free Tier**.
3. Choose Cloud Provider **AWS** and Region **us-west-2 (Oregon)** (co-located with Render).
4. Set Cluster Name: `ricozbooks-staging-cluster`.
5. Under **Database Access**:
   - Add database user: `ricoz_staging_admin`
   - Set password authentication (generate a strong password).
   - Assign built-in role: `readWrite` on database `ricozbooks_staging`.
6. Under **Network Access**:
   - Add IP Access: `0.0.0.0/0`
7. Copy the SRV connection string:
   ```text
   mongodb+srv://ricoz_staging_admin:<PASSWORD>@ricozbooks-staging-cluster.xxxx.mongodb.net/ricozbooks_staging?retryWrites=true&w=majority
   ```

### Action 2: Apply Blueprint in Render Dashboard
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\to$ select **Blueprint**.
3. Connect repository: `tejaskotalwar2003/RicozBooks`.
4. Configure parameters:
   - **Branch:** `migration/next-express-mongodb`
   - **Blueprint File Path:** `render.staging.yaml`
5. Render will detect `ricozbooks-api-staging` and `ricozbooks-web-staging`.
6. In the environment inputs for `ricozbooks-api-staging`, paste your `MONGODB_URI` from Action 1.
7. Click **Apply**.

---

## 6. Staging Validation & Smoke Test Execution

Once Render completes deploying:

1. Retrieve the auto-generated `SUPERADMIN_PASSWORD` from Render Dashboard $\to$ `ricozbooks-api-staging` $\to$ **Environment**.
2. Run the automated smoke test suite:
   ```powershell
   $env:SUPERADMIN_PASSWORD="<RENDER_GENERATED_PASSWORD>"
   node scripts/staging-smoke-test.js
   ```
3. The runner executes 10 end-to-end verification steps covering API health, frontend delivery, Super Admin login, canonical departments, chart of accounts, double-entry balance constraints, Trial Balance equality, Balance Sheet accounting equation, and negative security checks.

---

## 7. Status & Production Cutover Safeguard

- **Staging Code Status:** Committed and pushed to GitHub on branch `migration/next-express-mongodb` at commit `705cbd4`.
- **Production Status:** Production `main` remains untouched at commit `b56ab44` with active services `ricozbooks-api` and `ricozbooks-web`.
- **Production Cutover Guard:** **No cutover will occur without explicit review of the staging smoke test results and separate user authorization.**
