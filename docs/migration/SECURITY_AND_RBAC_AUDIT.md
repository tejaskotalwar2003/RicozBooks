# RicozBooks — Security & RBAC Audit Report

## 1. Executive Summary

This security and Role-Based Access Control (RBAC) audit reviews the security hardening, permission enforcement, multi-tenant isolation, and data-integrity protections implemented on branch `migration/next-express-mongodb` for the Express.js + MongoDB API (`apps/api`).

All security assertions have been verified using automated regression tests (`tests/security.test.ts` and `tests/concurrency.test.ts`), passing with 100% success (44/44 tests across all suites).

---

## 2. Authentication & Live Session Validation

### 2.1 JWT Issuance & Cryptographic Verification
- **Algorithm**: HMAC-SHA256 (`HS256`).
- **Secret Management**: Loaded exclusively from environment variables (`JWT_SECRET`). Hardcoded fallback values are strictly prevented in production environments.
- **Payload Structure**:
  ```json
  {
    "sub": "6713994e1cf6f928c0b58e72",
    "email": "developer@ricozbooks.com",
    "role": "SUPER_ADMIN",
    "iat": 1729590000,
    "exp": 1729676400
  }
  ```

### 2.2 Immediate Session Revocation (Live Database Validation)
Unlike standard stateless JWT implementations that remain valid until the expiration timestamp even after an employee is terminated or an account is suspended, `requireAuth` performs live database validation:
1. Verifies token cryptographic signature and expiration.
2. Queries `User.findById(payload.sub)` in MongoDB.
3. If user is null $\to$ rejects immediately with `401 User no longer exists`.
4. If `user.is_active === false` $\to$ rejects immediately with `403 Account is suspended or deactivated`.

---

## 3. Role-Based Access Control (RBAC) & Permission Catalog

The platform enforces 47 granular permissions categorized across the 5 RicozBooks functional departments:

| Department Code | Department Name | Key Permissions Managed |
| :--- | :--- | :--- |
| `FINANCE_ACCOUNTING` | Finance & Accounting | `journals:create`, `journals:approve`, `journals:post`, `journals:reverse`, `accounts:manage`, `reports:view` |
| `OPERATIONS` | Operations & Procurement | `inventory:products:manage`, `purchases:bills:create`, `purchases:bills:post`, `purchases:vendors:manage` |
| `SALES_DEMO` | Sales & Demo Management | `sales:invoice:create`, `sales:invoice:post`, `sales:customers:manage`, `sales:payments:record`, `demos:manage` |
| `CUSTOMER_SUPPORT` | Customer Support | `support:tickets:read`, `support:tickets:manage`, `customers:read` |
| `TECHNICAL_ENGINEERING`| Technical & Engineering | `system:integrations:manage`, `system:diagnostics:read`, `audit:read` |

### 3.1 Developer Console & Super Admin Safety Lock
The Developer Console (`/api/v1/developer/*`) is a central platform administration interface, not an operational department:
- **`requireSuperAdmin` Middleware**: Restricts administrative capabilities (assigning department heads, modifying permission matrices, viewing platform telemetry) strictly to accounts with `is_superuser === true`.
- **Demotion Safety Lock**: Attempting to demote or deactivate the master Super Admin user is blocked by application invariants.
- **Backend Enforcement**: Permission checks are enforced by Express middleware on every API endpoint, ensuring that hiding UI controls on the frontend does not leave API routes unprotected.

---

## 4. Multi-Tenant Data Isolation

Data isolation is guaranteed across both Company (`Organization`) and Entity boundaries:
- **`tenantContext` Middleware**: Extracts tenant context from request headers (`x-company-id`, `x-entity-id`), with safe fallback to the user's `default_company_id` and `default_entity_id`.
- **Compound Multi-Tenant Indexing**: Every business collection enforces compound indexing scoped by `entity_id`:
  - `accounts`: `{ entity_id: 1, code: 1 }` (unique)
  - `journalentries`: `{ entity_id: 1, entry_number: 1 }` (unique)
  - `invoices`: `{ entity_id: 1, invoice_number: 1 }` (unique)
  - `bills`: `{ entity_id: 1, bill_number: 1 }` (unique)
  - `products`: `{ entity_id: 1, sku: 1 }` (unique)
- **Cross-Organization Protection**: Any request attempting to query or modify a resource using an `entity_id` belonging to another company returns HTTP 404 or HTTP 403.

---

## 5. Input Validation, NoSQL Injection & Data Scrubbing

### 5.1 NoSQL Operator Sanitization
To prevent NoSQL injection attacks where attackers submit MongoDB operator objects (e.g. `{"username": {"$gt": ""}}`), the input sanitization layer (`apps/api/src/utils/sanitize.ts`):
- Strips any object key starting with `$` (MongoDB query operators).
- Strips any key containing `.` (nested path manipulation).

### 5.2 Secret Redaction in Audit Logs
The `AuditService` scrubs sensitive parameters before persisting logs to the database:
- Keys matching `password`, `password_hash`, `token`, `access_token`, `secret`, `secret_key`, `current_password`, `new_password` are redacted to `"[REDACTED]"`.

### 5.3 Public Invoice Access via Payment Token
- Public payment links utilize a cryptographically random UUID v4 token: `/pay/:token` and `/api/v1/sales/invoices/public/:token`.
- Only non-sensitive customer invoice summary fields are returned. Internal account IDs, system metadata, and internal audit notes are strictly excluded from public responses.
