# RicozBooks — Subscription Page Client-Side Exception Fix Report

## Executive Summary

On route `http://localhost:3000/subscription`, Next.js rendered a fatal client-side crash:
> *"Application error: a client-side exception has occurred (see the browser console for more information)."*

This investigation identified and resolved four root causes spanning frontend rendering resilience, Mongoose Decimal128 serialization, Next.js rewrite IPv6 (`::1`) network proxy conflicts, and the absence of a React Error Boundary. Following the fix, headless browser automation (Edge CDP) verified that `/subscription` renders with zero exceptions and the subscription plan switch workflow completes seamlessly.

---

## 1. Root Cause Analysis

### Cause 1: Mongoose `Decimal128` JSON Serialization
- **Issue**: In `apps/api/src/models/Subscription.ts`, `monthly_price` and `annual_price` are stored as `Schema.Types.Decimal128`. When serialized to JSON by Express/Mongoose without transformation, they output BSON wrapper objects:
  ```json
  { "monthly_price": { "$numberDecimal": "29.00" } }
  ```
- **Crash Trigger**: `SubscriptionPage.tsx` executed `Number(plan.monthly_price).toFixed(0)`, which yielded `NaN`. Furthermore, if raw objects were processed by React children or math routines, React threw fatal rendering exceptions.

### Cause 2: Unsafe Array & Property Access
- **Issue**: In `SubscriptionPage.tsx`, `plans.map()` and `plan.features.map()` assumed array types unconditionally. If the API returned an error object or if any database document lacked the `features` property, runtime execution threw:
  ```
  TypeError: Cannot read properties of undefined (reading 'map')
  ```
- Similarly, React keys used `key={plan.id}`, but Mongoose documents use `_id`, producing undefined keys for all plan cards.

### Cause 3: Node.js IPv6 (`::1`) vs IPv4 (`127.0.0.1`) Proxy Refusal
- **Issue**: In `apps/web/next.config.js`, `defaultTarget` was configured as `http://localhost:5000`. On Windows, Node.js 18+ resolves `localhost` to IPv6 `::1` first. Since the Express backend bound to IPv4 `127.0.0.1` / `0.0.0.0`, Next.js rewrite requests failed with:
  ```
  [WEB ERR] Failed to proxy http://localhost:5000/api/v1/subscriptions/plans Error: connect ECONNREFUSED ::1:5000
  ```
  This returned a 500 status to the client-side API layer, triggering downstream rendering failures.

### Cause 4: Missing React Error Boundary
- **Issue**: The application lacked a React `ErrorBoundary`. Any transient error inside a child view bubbled up to Next.js's top-level error boundary, replacing the entire UI (including header, sidebar, and navigation) with a blank white error screen.

### Cause 5: Organization ID Parameter Mismatch in `upgradePlan`
- **Issue**: `SubscriptionController.upgradePlan` expected `req.body.plan_tier` and `req.user.organization_id`, but the frontend sent `{ tier }` and the authenticated user payload carried `company_id` / `default_company_id`. This caused plan upgrade requests to fail with HTTP 400.

---

## 2. Implemented Resolutions

### A. Frontend Resilience & Null Safety (`apps/web/src/views/SubscriptionPage.tsx`)
- Added `parsePrice(val)` helper that gracefully handles numbers, numeric strings, and `{ $numberDecimal: "..." }` BSON objects.
- Guarded `plans` with `Array.isArray(safePlans) ? safePlans : []`.
- Guarded `plan.features` with `Array.isArray(plan.features) ? plan.features : []`.
- Provided fallback React keys: `plan.id || plan._id || plan.tier || 'plan-idx'`.
- Added a full skeleton loading state (`Loader2` spinner and animated card placeholders) during `isLoading`.
- Added safe date string parsing for `current_period_end`.
- Synchronized billing cycle enum between `'MONTHLY'` and `'ANNUALLY'` / `'ANNUAL'`.

### B. Production-Grade React Error Boundary (`apps/web/src/components/common/ErrorBoundary.tsx`)
- Created a reusable React class component that catches rendering errors in child components.
- Displays an enterprise RicozBooks error card with the error message, a "Try Again" reload button, and a "Dashboard" navigation button.
- Integrated `ErrorBoundary` into:
  - `AppShell.tsx` around the view `<Outlet />` (preserving navigation and session on error).
  - `AppWrapper.tsx` around the top-level `<App />`.

### C. Backend API Sanitization (`apps/api/src/controllers/subscription.controller.ts`)
- Added `sanitizePlan(doc)` to normalize all plan documents:
  - `monthly_price`: standard JavaScript number (`Number(p.monthly_price)`).
  - `annual_price`: standard JavaScript number (`Number(p.annual_price)`).
  - `id`: string (`String(p._id)`).
  - `features`: array of strings guaranteed.
- Updated `upgradePlan` to support both `tier` and `plan_tier`.
- Resolved `organizationId` robustly from `user.organization_id`, `user.default_company_id`, `tokenPayload.company_id`, or `req.body.company_id`.

### D. Next.js IPv4 Proxy Configuration (`apps/web/next.config.js`)
- Changed `defaultTarget` from `http://localhost:5000` to `http://127.0.0.1:5000`.
- Added automatic string replacement for `localhost` -> `127.0.0.1` in `backendTarget` to eliminate `ECONNREFUSED ::1:5000` failures.

### E. Database Initialization (`scripts/ensure-db.js` & `apps/api/src/server.ts`)
- Configured dynamic, safe loading of `mongodb-memory-server` in dev so `scripts/start-all.js` spins up an embedded replica set automatically when port 27017 is free.
- Added `mongoose.set('bufferCommands', false)` when running in offline mode so queries fail fast rather than hanging 10,000ms.

---

## 3. Verification & Validation Evidence

### Automated Test Suite
- Executed full Jest test suite across `apps/api`:
  - **11 test suites passed (100%)**
  - **83 tests passed (100%)**

### Headless Browser CDP Verification (Microsoft Edge)
Automated Chrome DevTools Protocol (CDP) test executed against live `http://localhost:3000/subscription`:
1. Authenticated session injected via `localStorage`.
2. Direct navigation to `http://localhost:3000/subscription`.
3. Observed DOM output:
   - Header: *Ricoz Technologies Pvt Ltd • FY 2026-27 • Vikram Sharma (CFO)*
   - Current Plan: *Business Growth (ACTIVE) • Renews on 2026-12-07*
   - Quota Meters: *Legal Entities 1 / 5 • User Seats 1 / 10*
   - 4 Plan Comparison Cards: *Community Free ($0/mo), Professional Starter ($24/mo), Business Growth ($66/mo), Enterprise Scale ($166/mo)*
4. Total runtime errors / console exceptions captured: **0**.
5. Executed plan upgrade to *Enterprise Scale*: Status **200 OK**, plan and quota meters updated immediately.
