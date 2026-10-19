# RICOZBOOKS — Feature Inventory & Architectural Mapping

**Document Version:** 1.0.0  
**Phase:** Phase 1 Deliverable  
**Scope:** Complete functional inventory of all RicozBooks modules, business logic, endpoints, models, and UI views.

---

## Inventory Status Legend
- **IMPLEMENTED & VERIFIED**: Fully written in codebase and validated via automated regression tests.
- **ACTIVE IN FRONTEND**: Dedicated responsive React page view, forms, modals, and tables deployed.
- **TARGET MAPPING ESTABLISHED**: Documented equivalent schema, controller, and Next.js page designed for the new stack.

---

## 1. Authentication & Session Security

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_auth.py`, `test_security_api.py`) |
| **Source Backend Models** | `User`, `UserSession` |
| **Source API Endpoints** | `POST /api/v1/auth/login`, `POST /api/v1/auth/register-company`, `GET /api/v1/auth/me`, `PUT /api/v1/auth/me`, `POST /api/v1/auth/change-password`, `GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/{id}`, `POST /api/v1/auth/sessions/sign-out-others`, `GET /api/v1/auth/login-activity` |
| **Frontend Pages & Components**| [`frontend/src/pages/Login.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/Login.tsx), [`CompanyRegistrationPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/CompanyRegistrationPage.tsx), [`SecurityPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/SecurityPage.tsx), [`AuthContext.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/context/AuthContext.tsx) |
| **Core Business Rules** | Bcrypt password hashing; live database status check on every request (`user.is_active`); immediate session invalidation upon user suspension; multi-device session tracking with IP, User-Agent, and geolocation metadata; JWT tokens with configurable expiration. |
| **Target Architecture** | Express.js `authController`, `authService`, bcryptjs/argon2, JWT middleware (`authMiddleware`), MongoDB `users` & `userSessions` collections. Next.js App Router `(auth)/login/page.tsx`, `(auth)/register/page.tsx`. |

---

## 2. Multi-Tenant Organizations, Legal Entities & Invitations

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_entities_api.py`, `test_invitation_workflow.py`, `test_multi_tenant_saas.py`) |
| **Source Backend Models** | `Company`, `Entity`, `Currency`, `ExchangeRate`, `FiscalPeriod`, `OrganizationInvitation`, `user_companies`, `user_entities` |
| **Source API Endpoints** | `GET /api/v1/entities`, `POST /api/v1/entities`, `GET /api/v1/entities/{id}`, `PUT /api/v1/entities/{id}`, `DELETE /api/v1/entities/{id}`, `GET /api/v1/tenants/current`, `POST /api/v1/tenants/invitations`, `GET /api/v1/tenants/invitations`, `POST /api/v1/tenants/invitations/{id}/resend`, `DELETE /api/v1/tenants/invitations/{id}`, `GET /api/v1/tenants/invitations/validate/{token}`, `POST /api/v1/tenants/invitations/accept` |
| **Frontend Pages & Components**| [`frontend/src/pages/EntitiesPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/EntitiesPage.tsx), [`SettingsPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/SettingsPage.tsx), [`AcceptInvitationPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/AcceptInvitationPage.tsx), [`Header.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/components/layout/Header.tsx) (Entity Selector) |
| **Core Business Rules** | Every accounting record strictly isolated by `company_id` and `entity_id`; single-use cryptographic invitation tokens with 7-day expiration; duplicate invite refresh; graceful SMTP fallback logging invitation links to DB and console; entity-level GSTIN, PAN, and address configuration. |
| **Target Architecture** | Express.js `tenantMiddleware` injecting `currentCompany` and `currentEntity`, Mongoose `organizations`, `entities`, and `invitations` collections with compound index `{ organizationId: 1, email: 1 }`. Next.js `(tenant)/entities/page.tsx`, `invite/[token]/page.tsx`. |

---

## 3. Platform Developer Console (Super Admin)

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_developer_console_access.py`, `test_developer_department_management.py`, `test_developer_phase5_security_and_readiness.py`) |
| **Source Backend Models** | `Department`, `User`, `Role`, `UserSession`, `AuditLog` |
| **Source API Endpoints** | `POST /api/v1/auth/developer/login`, `GET /api/v1/developer/status`, `GET /api/v1/developer/dashboard/metrics`, `GET /api/v1/developer/departments`, `POST /api/v1/developer/departments`, `GET /api/v1/developer/departments/{id}`, `PUT /api/v1/developer/departments/{id}`, `DELETE /api/v1/developer/departments/{id}`, `GET /api/v1/developer/departments/{id}/members`, `POST /api/v1/developer/departments/{id}/head` |
| **Frontend Pages & Components**| [`frontend/src/pages/developer/DeveloperLogin.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/developer/DeveloperLogin.tsx), [`DeveloperDashboard.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/developer/DeveloperDashboard.tsx), [`DepartmentManagement.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/developer/DepartmentManagement.tsx), [`DeveloperLayout.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/components/developer/DeveloperLayout.tsx), [`DeveloperProtectedRoute.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/components/developer/DeveloperProtectedRoute.tsx) |
| **Core Business Rules** | Platform administration tier completely separated from tenant workspaces; **exactly 5 departments** (`FINANCE_ACCOUNTING`, `OPERATIONS`, `TECHNICAL_ENGINEERING`, `SALES_DEMO`, `CUSTOMER_SUPPORT`); the Developer Console is platform infrastructure, not a 6th department; isolated `/developer/login` requiring `is_superuser=True`; audited super admin provisioning CLI script. |
| **Target Architecture** | Express.js `developerController`, `requireSuperAdmin` middleware, MongoDB `departments` collection. Next.js `developer/login/page.tsx`, `developer/dashboard/page.tsx`, `developer/departments/page.tsx`. |

---

## 4. Role-Based Access Control (RBAC) & Permission Catalog

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_developer_rbac_and_audit_trail.py`, `test_developer_phase5_security_and_readiness.py`) |
| **Source Backend Models** | `Role`, `Permission`, `role_permissions`, `user_roles` |
| **Source API Endpoints** | `GET /api/v1/developer/roles`, `POST /api/v1/developer/roles`, `GET /api/v1/developer/permissions`, `GET /api/v1/developer/roles/{id}/permissions`, `PUT /api/v1/developer/roles/{id}/permissions`, `POST /api/v1/developer/roles/{id}/permissions/reset` |
| **Frontend Pages & Components**| [`frontend/src/pages/developer/RolesPermissionsManagement.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/developer/RolesPermissionsManagement.tsx) |
| **Core Business Rules** | 47 granular permissions across 17 functional modules; standard platform roles (`SUPER_ADMIN`, `ADMIN`, `ORG_ADMIN`, `FINANCE_HEAD`, `OPERATIONS_HEAD`, `TECH_HEAD`, `SALES_HEAD`, `SUPPORT_HEAD`, `ACCOUNTANT`, `MANAGER`, `REVIEWER`, `AUDITOR`, `MEMBER`); mandatory lock preventing revocation of core permissions (`developer:administer`, `roles:manage`, `audit:read`, `users:manage`) from `SUPER_ADMIN`. |
| **Target Architecture** | Express.js `rbacMiddleware.requirePermission(code)`, Mongoose `roles` and `permissions` collections with pre-seeded baseline matrix. Next.js `developer/roles/page.tsx`. |

---

## 5. Central Immutable Audit Trail

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_developer_rbac_and_audit_trail.py`, `test_developer_phase5_security_and_readiness.py`) |
| **Source Backend Models** | `AuditLog` |
| **Source API Endpoints** | `GET /api/v1/developer/audit-logs`, `GET /api/v1/developer/audit-logs/{id}`, `GET /api/v1/audit-logs`, `GET /api/v1/audit-logs/export` |
| **Frontend Pages & Components**| [`frontend/src/pages/developer/AuditTrailViewer.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/developer/AuditTrailViewer.tsx), [`AuditLogPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/AuditLogPage.tsx) |
| **Core Business Rules** | Strictly append-only: `DELETE`, `PUT`, `PATCH` endpoints do not exist (`405 Method Not Allowed`); regex scrubber `_sanitize_audit_details` sanitizes passwords, tokens, hashes, and secrets; searchable by date range, action type, resource, actor ID; JSON payload inspector with clipboard copy. |
| **Target Architecture** | Express.js `auditService.logEvent()`, Mongoose `auditLogs` collection with capped or append-only write rules, compound index on `{ timestamp: -1, action: 1 }`. Next.js `developer/audit-logs/page.tsx` and `(tenant)/audit-log/page.tsx`. |

---

## 6. Chart of Accounts & General Ledger

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_accounting.py`, `test_cogs_and_account_mapping.py`, `test_ledger.py`) |
| **Source Backend Models** | `Account`, `AccountType`, `NormalBalance`, `AccountDimension`, `JournalEntry`, `JournalEntryLine` |
| **Source API Endpoints** | `GET /api/v1/accounts`, `POST /api/v1/accounts`, `GET /api/v1/accounts/{id}`, `PUT /api/v1/accounts/{id}`, `GET /api/v1/ledger/accounts/{id}`, `GET /api/v1/ledger/trial-balance`, `GET /api/v1/ledger/general-ledger`, `GET /api/v1/settings/account-mappings`, `PUT /api/v1/settings/account-mappings` |
| **Frontend Pages & Components**| [`frontend/src/pages/ChartOfAccounts.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/ChartOfAccounts.tsx), [`GeneralLedger.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/GeneralLedger.tsx) |
| **Core Business Rules** | Standard GAAP account classification (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`); normal balance rules (`DEBIT` vs `CREDIT`); mandatory standard account `5700` ("Cost of Goods Sold") auto-provisioned across entities; running balance calculation with date range and dimension filtering. |
| **Target Architecture** | Express.js `accountingEngine`, `ledgerEngine`, MongoDB `accounts` collection with unique index on `{ entityId: 1, code: 1 }`. Next.js `(tenant)/chart-of-accounts/page.tsx`, `(tenant)/ledger/page.tsx`. |

---

## 7. Double-Entry Journal Entries & Approvals Workflow

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_accounting.py`, `test_journal_approvals_workflow.py`) |
| **Source Backend Models** | `JournalEntry`, `JournalEntryLine`, `Approval`, `JournalStatus` |
| **Source API Endpoints** | `GET /api/v1/journals`, `POST /api/v1/journals`, `GET /api/v1/journals/{id}`, `PUT /api/v1/journals/{id}`, `POST /api/v1/journals/{id}/submit`, `POST /api/v1/journals/{id}/approve`, `POST /api/v1/journals/{id}/reject`, `POST /api/v1/journals/{id}/post`, `POST /api/v1/journals/{id}/reverse`, `GET /api/v1/journals/approvals/pending`, `GET /api/v1/journals/approvals/history` |
| **Frontend Pages & Components**| [`frontend/src/pages/JournalEntries.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/JournalEntries.tsx), [`Approvals.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/Approvals.tsx) |
| **Core Business Rules** | Absolute financial balance check: $\sum \text{Debits} == \sum \text{Credits}$; maker-checker segregation of duties (approver cannot be submitter if maker-checker enforced); lifecycle: `DRAFT` $\to$ `SUBMITTED` $\to$ `APPROVED` $\to$ `POSTED`; immutable reversal generating linked reversal journal. |
| **Target Architecture** | Express.js `journalService` with MongoDB atomic multi-document transactions (`session.withTransaction()`). Mongoose `journals` collection with embedded lines or linked lines. Next.js `(tenant)/journals/page.tsx`, `(tenant)/approvals/page.tsx`. |

---

## 8. Customers & Sales Invoicing (with COGS & Inventory Integration)

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_sales_api.py`, `test_sales_invoice_inventory_cogs_workflow.py`, `test_cogs_and_account_mapping.py`) |
| **Source Backend Models** | `Customer`, `Product`, `Invoice`, `InvoiceLine`, `CustomerPayment`, `Estimate`, `SalesOrder`, `CreditNote`, `InventoryMovement` |
| **Source API Endpoints** | `GET /api/v1/sales/invoices`, `POST /api/v1/sales/invoices`, `GET /api/v1/sales/invoices/{id}`, `POST /api/v1/sales/invoices/{id}/post`, `POST /api/v1/sales/invoices/{id}/payments`, `GET /api/v1/sales/invoices/public/{token}`, `GET /api/v1/sales/customers`, `POST /api/v1/sales/customers`, `GET /api/v1/sales/estimates`, `POST /api/v1/sales/estimates`, `GET /api/v1/sales/orders`, `POST /api/v1/sales/orders`, `GET /api/v1/sales/credit-notes` |
| **Frontend Pages & Components**| [`frontend/src/pages/InvoicesPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/InvoicesPage.tsx), [`CustomersPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/CustomersPage.tsx), [`PublicInvoicePage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/PublicInvoicePage.tsx) |
| **Core Business Rules** | Auto-calculated line item subtotal, discount, CGST/SGST/IGST; posting invoice generates double-entry AR debit, Revenue credit, and Tax credits; for physical inventory items, atomically posts COGS debit (Account 5700) and Inventory Asset credit, while simultaneously logging `InventoryMovement` and reducing `current_stock`; public invoice view accessible via secure unguessable payment token. |
| **Target Architecture** | Express.js `salesEngine`, Mongoose `customers`, `invoices`, `payments` collections with MongoDB transactions ensuring atomic stock & ledger updates. Next.js `(tenant)/invoices/page.tsx`, `pay/[token]/page.tsx`. |

---

## 9. Vendors & Purchase Bills

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_purchases_api.py`) |
| **Source Backend Models** | `Vendor`, `PurchaseOrder`, `PurchaseOrderLine`, `Bill`, `BillLine`, `VendorPayment`, `DebitNote`, `RecurringBill` |
| **Source API Endpoints** | `GET /api/v1/purchases/vendors`, `POST /api/v1/purchases/vendors`, `GET /api/v1/purchases/bills`, `POST /api/v1/purchases/bills`, `GET /api/v1/purchases/bills/{id}`, `POST /api/v1/purchases/bills/{id}/post`, `POST /api/v1/purchases/bills/{id}/payments`, `GET /api/v1/purchases/orders`, `POST /api/v1/purchases/orders`, `GET /api/v1/purchases/debit-notes` |
| **Frontend Pages & Components**| [`frontend/src/pages/BillsPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/BillsPage.tsx), [`VendorsPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/VendorsPage.tsx) |
| **Core Business Rules** | Three-way matching capability; posting bill debits Expense/Asset and credits Accounts Payable; records Input Tax Credit (ITC) for GST; payments debit AP and credit Bank/Cash account; payment statuses (`UNPAID`, `PARTIALLY_PAID`, `PAID`). |
| **Target Architecture** | Express.js `purchaseEngine`, Mongoose `vendors`, `bills`, `vendorPayments` collections. Next.js `(tenant)/bills/page.tsx`, `(tenant)/vendors/page.tsx`. |

---

## 10. Expenses & Employee Claims

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_expenses_and_banking_api.py`) |
| **Source Backend Models** | `ExpenseCategory`, `Expense` |
| **Source API Endpoints** | `GET /api/v1/expenses`, `POST /api/v1/expenses`, `GET /api/v1/expenses/{id}`, `PUT /api/v1/expenses/{id}`, `POST /api/v1/expenses/{id}/approve`, `POST /api/v1/expenses/{id}/reimburse`, `GET /api/v1/expenses/categories`, `POST /api/v1/expenses/categories`, `GET /api/v1/expenses/summary` |
| **Frontend Pages & Components**| [`frontend/src/pages/ExpensesPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/ExpensesPage.tsx) |
| **Core Business Rules** | Category-based expense tracking; receipt attachment handling; claim workflow (`DRAFT`, `SUBMITTED`, `APPROVED`, `PAID`, `REJECTED`); approval generates Expense debit and Accounts Payable / Reimbursement credit. |
| **Target Architecture** | Express.js `expenseEngine`, Mongoose `expenses` and `expenseCategories` collections. Next.js `(tenant)/expenses/page.tsx`. |

---

## 11. Banking, Transfers & Bank Reconciliation

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_expenses_and_banking_api.py`) |
| **Source Backend Models** | `BankAccount`, `BankTransaction`, `BankTransfer`, `BankReconciliation`, `BankStatementLine` |
| **Source API Endpoints** | `GET /api/v1/banking/accounts`, `POST /api/v1/banking/accounts`, `GET /api/v1/banking/transactions`, `GET /api/v1/banking/transfers`, `POST /api/v1/banking/transfers`, `POST /api/v1/banking/reconciliations`, `GET /api/v1/banking/reconciliations/{id}`, `POST /api/v1/banking/reconciliations/{id}/upload-csv`, `POST /api/v1/banking/reconciliations/{id}/match`, `POST /api/v1/banking/reconciliations/{id}/complete`, `GET /api/v1/banking/banking-summary` |
| **Frontend Pages & Components**| [`frontend/src/pages/BankingPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/BankingPage.tsx) |
| **Core Business Rules** | Inter-account fund transfers with dual ledger entries (Credit source bank, Debit destination bank); CSV statement import parsing date, amount, description; auto-match heuristic matching date and exact amount; reconciliation session calculates Statement Balance vs Book Balance with difference reporting. |
| **Target Architecture** | Express.js `bankingEngine`, Mongoose `bankAccounts`, `bankTransactions`, `bankReconciliations` collections. Next.js `(tenant)/banking/page.tsx`. |

---

## 12. Items / Products Master & Inventory Management

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_items_master_api.py`, `test_inventory_and_gst_api.py`, `test_sales_invoice_inventory_cogs_workflow.py`) |
| **Source Backend Models** | `Product`, `InventoryMovement`, `StockAdjustment` |
| **Source API Endpoints** | `GET /api/v1/sales/items`, `POST /api/v1/sales/items`, `GET /api/v1/sales/items/{id}`, `PUT /api/v1/sales/items/{id}`, `DELETE /api/v1/sales/items/{id}`, `GET /api/v1/inventory/stock-summary`, `GET /api/v1/inventory/movements`, `POST /api/v1/inventory/adjustments`, `GET /api/v1/inventory/alerts` |
| **Frontend Pages & Components**| [`frontend/src/pages/Items.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/Items.tsx), [`InventoryPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/InventoryPage.tsx) |
| **Core Business Rules** | Distinguishes physical `PRODUCT` (track inventory) from `SERVICE` (no inventory effects); SKU uniqueness per legal entity; HSN/SAC codes; standard GST tax rates (0, 5, 12, 18, 28%); weighted average valuation; min stock alerts; stock adjustments create GL adjustment entries. |
| **Target Architecture** | Express.js `inventoryEngine`, Mongoose `products` and `inventoryMovements` collections. Next.js `(tenant)/items/page.tsx`, `(tenant)/inventory/page.tsx`. |

---

## 13. GST & Statutory Tax Compliance

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_inventory_and_gst_api.py`) |
| **Source Backend Models** | `GSTReturnFiling` |
| **Source API Endpoints** | `GET /api/v1/gst/summary`, `GET /api/v1/gst/returns`, `POST /api/v1/gst/returns/generate`, `POST /api/v1/gst/returns/{id}/file` |
| **Frontend Pages & Components**| [`frontend/src/pages/GstCenterPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/GstCenterPage.tsx) |
| **Core Business Rules** | State code comparison between Entity GSTIN and Customer/Vendor GSTIN to apply intra-state (CGST + SGST) vs inter-state (IGST); GSTR-1 outbound sales return generation; GSTR-3B monthly tax summary; input tax credit offset against output liability. |
| **Target Architecture** | Express.js `gstEngine`, Mongoose `gstReturns` collection. Next.js `(tenant)/gst/page.tsx`. |

---

## 14. Financial Reports & Analytics

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_reports_api.py`, `test_accounting.py`) |
| **Source Backend Models** | Aggregates from `JournalEntryLine`, `Account`, `Invoice`, `Bill` |
| **Source API Endpoints** | `GET /api/v1/reports/balance-sheet`, `GET /api/v1/reports/profit-and-loss`, `GET /api/v1/reports/trial-balance`, `GET /api/v1/reports/cash-flow`, `GET /api/v1/reports/ar-aging`, `GET /api/v1/reports/ap-aging` |
| **Frontend Pages & Components**| [`frontend/src/pages/ReportsPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/ReportsPage.tsx) |
| **Core Business Rules** | GAAP-compliant financial statement generation; Balance Sheet checks $\text{Assets} == \text{Liabilities} + \text{Equity}$; P&L computes Gross Profit, Operating Expenses, Net Income; Aging schedules bucket receivables and payables (Current, 1-30, 31-60, 61-90, 90+ days). |
| **Target Architecture** | Express.js `reportingEngine` with MongoDB aggregation pipelines (`$group`, `$match`, `$facet`). Next.js `(tenant)/reports/page.tsx`. |

---

## 15. Period-End Close Management

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_close_api.py`) |
| **Source Backend Models** | `ClosePeriod`, `CloseTask` |
| **Source API Endpoints** | `GET /api/v1/close/periods`, `POST /api/v1/close/periods`, `GET /api/v1/close/periods/{id}/checklist`, `POST /api/v1/close/tasks/{id}/complete`, `POST /api/v1/close/periods/{id}/lock`, `POST /api/v1/close/periods/{id}/reopen` |
| **Frontend Pages & Components**| [`frontend/src/pages/CloseManagerPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/CloseManagerPage.tsx) |
| **Core Business Rules** | Checklists for month-end and year-end procedures (bank rec, inventory count, depreciation, GST filing); period locking blocks new journal entries or invoice postings with dates inside the closed period unless authorized. |
| **Target Architecture** | Express.js `closeController`, Mongoose `closePeriods` collection. Next.js `(tenant)/close-manager/page.tsx`. |

---

## 16. Projects & Timesheets

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_projects_and_saas_api.py`) |
| **Source Backend Models** | `Project`, `ProjectTask`, `Timesheet` |
| **Source API Endpoints** | `GET /api/v1/projects`, `POST /api/v1/projects`, `GET /api/v1/projects/{id}`, `POST /api/v1/projects/{id}/tasks`, `GET /api/v1/projects/timesheets`, `POST /api/v1/projects/timesheets` |
| **Frontend Pages & Components**| [`frontend/src/pages/ProjectsPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/ProjectsPage.tsx) |
| **Core Business Rules** | Project billing types (`FIXED_FEE`, `TIME_AND_MATERIALS`, `NON_BILLABLE`); time logging with hourly billing rates; integration with invoicing to generate bills from unbilled hours. |
| **Target Architecture** | Express.js `projectEngine`, Mongoose `projects` and `timesheets` collections. Next.js `(tenant)/projects/page.tsx`. |

---

## 17. Subscriptions & Plan Tiers

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_projects_and_saas_api.py`) |
| **Source Backend Models** | `SubscriptionPlan`, `CompanySubscription` |
| **Source API Endpoints** | `GET /api/v1/subscriptions/plans`, `GET /api/v1/subscriptions/current`, `POST /api/v1/subscriptions/upgrade` |
| **Frontend Pages & Components**| [`frontend/src/pages/SubscriptionPage.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/SubscriptionPage.tsx) |
| **Core Business Rules** | Plan tiers (`STARTER`, `GROWTH`, `ENTERPRISE`); limits on entities count, monthly invoices, team members, and storage; enforces plan upgrade modal when limits are reached. |
| **Target Architecture** | Express.js `subscriptionService`, Mongoose `subscriptions` collection. Next.js `(tenant)/subscription/page.tsx`. |

---

## 18. Internal Demo Management Portal

| Attribute | Details |
| :--- | :--- |
| **Status** | **IMPLEMENTED & VERIFIED** (Passes `test_internal_demos_api.py`) |
| **Source Backend Models** | `DemoAdminUser`, `DemoRequest`, `DemoScheduleHistory` |
| **Source API Endpoints** | `POST /api/v1/internal/auth/login`, `GET /api/v1/internal/auth/me`, `GET /api/v1/internal/dashboard/metrics`, `GET /api/v1/internal/demos`, `POST /api/v1/internal/demos`, `GET /api/v1/internal/demos/{id}`, `PUT /api/v1/internal/demos/{id}`, `POST /api/v1/internal/demos/{id}/status`, `POST /api/v1/internal/demos/{id}/assign`, `POST /api/v1/internal/demos/{id}/schedule`, `GET /api/v1/internal/calendar`, `GET /api/v1/internal/team`, `POST /api/v1/internal/team`, `PUT /api/v1/internal/team/{id}`, `DELETE /api/v1/internal/team/{id}` |
| **Frontend Pages & Components**| [`frontend/src/pages/internal/InternalLogin.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/internal/InternalLogin.tsx), [`InternalDashboard.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/internal/InternalDashboard.tsx), [`InternalDemosList.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/internal/InternalDemosList.tsx), [`InternalScheduledDemos.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/internal/InternalScheduledDemos.tsx), [`InternalCalendar.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/internal/InternalCalendar.tsx), [`InternalTeam.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/internal/InternalTeam.tsx), [`InternalSettings.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/pages/internal/InternalSettings.tsx), [`InternalLayout.tsx`](file:///c:/Users/hp/Documents/RicozBooks/frontend/src/components/internal/InternalLayout.tsx) |
| **Core Business Rules** | Completely independent authentication realm (`demo_admin_users`); credentials and tokens cannot access tenant accounting data or Developer Console; lead tracking pipeline (`NEW`, `CONTACTED`, `SCHEDULED`, `COMPLETED`, `CONVERTED`, `CANCELLED`); coordinator assignment and schedule history tracking. |
| **Target Architecture** | Express.js `internalDemoController`, independent `internalAuthMiddleware`, Mongoose `demoAdminUsers`, `demoRequests` collections. Next.js `internal/login/page.tsx`, `internal/dashboard/page.tsx`, etc. |

---

## Summary Assessment

All 18 modules are comprehensively implemented in the source codebase and validated by 148 automated backend regression tests and 43 frontend view components. The target architecture maps 100% of these capabilities to Express.js controllers, Mongoose schemas, and Next.js App Router views without discarding or altering any existing functionality.

