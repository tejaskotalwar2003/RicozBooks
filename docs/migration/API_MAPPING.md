# RICOZBOOKS — API Mapping & Contract Specification
## FastAPI to Express.js Endpoint Migration Matrix

**Document Version:** 1.0.0  
**Phase:** Express.js API Architecture  
**Base URL:** `/api/v1`  
**Response Format:** Standard JSON  
**Error Format:** `{ "detail": string, "error": string, "path": string, "timestamp": string }`

---

## 1. Authentication & Security Endpoints (`/api/v1/auth`)

| Method | Source Route | Express Controller & Method | Required Permissions / Auth | Request Payload | Response Model | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | `authController.login` | Public | `{ email, password, remember_me? }` | `{ access_token, token_type, expires_in, user, default_company_id, default_entity_id }` | 400, 401, 403 |
| `POST` | `/api/v1/auth/register-company` | `authController.registerCompany` | Public | `{ company_name, email, password, full_name, phone?, gstin?, country? }` | `{ access_token, token_type, company_id, entity_id, user }` | 400, 409 |
| `GET` | `/api/v1/auth/me` | `authController.getMe` | `requireAuth` | None | `{ id, email, full_name, role, permissions, is_active, default_company_id, default_entity_id }` | 401, 403 |
| `PUT` | `/api/v1/auth/me` | `authController.updateMe` | `requireAuth` | `{ full_name?, job_title?, phone_number?, default_company_id?, default_entity_id? }` | Updated User Object | 400, 401 |
| `POST` | `/api/v1/auth/change-password` | `authController.changePassword` | `requireAuth` | `{ current_password, new_password }` | `{ message: "Password updated successfully" }` | 400, 401 |
| `GET` | `/api/v1/auth/sessions` | `authController.getSessions` | `requireAuth` | None | `UserSession[]` | 401 |
| `DELETE` | `/api/v1/auth/sessions/:id` | `authController.revokeSession` | `requireAuth` | None | `{ message: "Session revoked successfully" }` | 401, 404 |
| `POST` | `/api/v1/auth/sessions/sign-out-others`| `authController.revokeOtherSessions` | `requireAuth` | None | `{ message: "All other sessions revoked" }` | 401 |
| `GET` | `/api/v1/auth/login-activity` | `authController.getLoginActivity` | `requireAuth` | Query: `{ limit?, skip? }` | `AuditLog[]` | 401 |
| `POST` | `/api/v1/auth/demo-request` | `authController.requestDemo` | Public | `{ full_name, work_email, phone, company, role, entities_count, interest_area?, preferred_date?, preferred_time? }` | `{ reference_code, message: "Demo request scheduled" }` | 400 |
| `POST` | `/api/v1/auth/developer/login` | `developerController.login` | Public (Requires `is_superuser=true`) | `{ email, password }` | `{ access_token, token_type, user: { is_superuser: true } }` | 400, 401, 403 |

---

## 2. Developer Console Endpoints (`/api/v1/developer`)

| Method | Source Route | Express Controller & Method | Required Permissions / Auth | Request Payload | Response Model | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/developer/status` | `developerController.getStatus` | `requireSuperAdmin` | None | `{ status, platform_version, database, metrics }` | 401, 403 |
| `GET` | `/api/v1/developer/dashboard/metrics` | `developerController.getDashboardMetrics` | `requireSuperAdmin` | None | `{ total_users, active_departments, total_roles, audit_count, system_health }` | 401, 403 |
| `GET` | `/api/v1/developer/departments` | `developerController.getDepartments` | `requirePermission('departments:read')` | None | `DepartmentSummary[]` | 401, 403 |
| `POST` | `/api/v1/developer/departments` | `developerController.createDepartment` | `requireSuperAdmin` | `{ code, name, description }` | `Department` | 400, 401, 403 |
| `GET` | `/api/v1/developer/departments/:id` | `developerController.getDepartmentById` | `requirePermission('departments:read')` | None | `DepartmentDetail` | 401, 403, 404 |
| `PUT` | `/api/v1/developer/departments/:id` | `developerController.updateDepartment` | `requirePermission('departments:manage')` | `{ name?, description?, is_active? }` | `Department` | 400, 401, 403, 404 |
| `GET` | `/api/v1/developer/departments/:id/members` | `developerController.getDepartmentMembers` | `requirePermission('departments:read')` | None | `DepartmentMemberSummary[]` | 401, 403, 404 |
| `POST` | `/api/v1/developer/departments/:id/head` | `developerController.assignDepartmentHead` | `requireSuperAdmin` | `{ user_id }` | `{ message: "Department head assigned" }` | 400, 401, 403, 404 |
| `GET` | `/api/v1/developer/users` | `developerController.getUsers` | `requirePermission('users:read')` | Query: `{ department_id?, search?, role?, status?, page?, limit? }` | `PaginatedUsers` | 401, 403 |
| `GET` | `/api/v1/developer/users/:id` | `developerController.getUserById` | `requirePermission('users:read')` | None | `UserDetailResponse` | 401, 403, 404 |
| `PUT` | `/api/v1/developer/users/:id` | `developerController.updateUser` | `requirePermission('users:manage')` | `{ department_id?, role?, job_title? }` | `UserDetailResponse` | 400, 401, 403, 404 |
| `POST` | `/api/v1/developer/users/:id/suspend` | `developerController.suspendUser` | `requirePermission('users:suspend')` | `{ reason? }` | `{ message: "User suspended and sessions terminated" }` | 400, 401, 403, 404 |
| `POST` | `/api/v1/developer/users/:id/reactivate` | `developerController.reactivateUser` | `requirePermission('users:manage')` | None | `{ message: "User reactivated successfully" }` | 400, 401, 403, 404 |
| `GET` | `/api/v1/developer/roles` | `developerController.getRoles` | `requirePermission('roles:read')` | None | `RoleDetailResponse[]` | 401, 403 |
| `POST` | `/api/v1/developer/roles` | `developerController.createRole` | `requirePermission('roles:manage')` | `{ name, description, permission_codes }` | `RoleDetailResponse` | 400, 401, 403 |
| `GET` | `/api/v1/developer/permissions` | `developerController.getPermissions` | `requirePermission('roles:read')` | None | `PermissionItemResponse[]` | 401, 403 |
| `GET` | `/api/v1/developer/roles/:id/permissions` | `developerController.getRolePermissions` | `requirePermission('roles:read')` | None | `{ role_id, role_name, permissions: string[] }` | 401, 403, 404 |
| `PUT` | `/api/v1/developer/roles/:id/permissions` | `developerController.updateRolePermissions` | `requirePermission('roles:manage')` | `{ permissions: string[] }` | `{ message: "Role permissions updated" }` | 400, 401, 403, 404 |
| `POST` | `/api/v1/developer/roles/:id/permissions/reset` | `developerController.resetRolePermissions` | `requireSuperAdmin` | None | `{ message: "Role reset to default matrix" }` | 400, 401, 403, 404 |
| `GET` | `/api/v1/developer/invitations` | `developerController.getInvitations` | `requirePermission('invitations:manage')` | Query: `{ department_id?, status?, page?, limit? }` | `PaginatedInvitations` | 401, 403 |
| `POST` | `/api/v1/developer/invitations` | `developerController.createInvitation` | `requirePermission('invitations:manage')` | `{ email, department_id, role }` | `InvitationDetailResponse` | 400, 401, 403, 409 |
| `POST` | `/api/v1/developer/invitations/:id/resend` | `developerController.resendInvitation` | `requirePermission('invitations:manage')` | None | `{ message: "Invitation resent", invitation_url }` | 401, 403, 404 |
| `DELETE` | `/api/v1/developer/invitations/:id` | `developerController.revokeInvitation` | `requirePermission('invitations:manage')` | None | `{ message: "Invitation revoked" }` | 401, 403, 404 |
| `GET` | `/api/v1/developer/audit-logs` | `developerController.getAuditLogs` | `requirePermission('audit:read')` | Query: `{ search?, action?, record_type?, start_date?, end_date?, page?, limit? }` | `PaginatedAuditLogs` | 401, 403 |
| `GET` | `/api/v1/developer/audit-logs/:id` | `developerController.getAuditLogDetail` | `requirePermission('audit:read')` | None | `AuditLogItemResponse` | 401, 403, 404 |

---

## 3. Legal Entities & Tenant Management (`/api/v1/entities`, `/api/v1/tenants`)

| Method | Source Route | Express Controller & Method | Required Permissions / Auth | Request Payload | Response Model | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/entities` | `entitiesController.listEntities` | `requireAuth` | Query: `{ company_id? }` | `Entity[]` | 401 |
| `POST` | `/api/v1/entities` | `entitiesController.createEntity` | `requirePermission('entities:manage')` | `{ name, legal_name, tax_identifier, gstin?, pan?, address?, city?, state?, currency? }` | `Entity` | 400, 401, 403 |
| `GET` | `/api/v1/entities/:id` | `entitiesController.getEntity` | `requireAuth` | None | `Entity` | 401, 404 |
| `PUT` | `/api/v1/entities/:id` | `entitiesController.updateEntity` | `requirePermission('entities:manage')` | `{ name?, legal_name?, gstin?, pan?, address?, city?, state?, upi_id?, razorpay_key_id? }` | `Entity` | 400, 401, 403, 404 |
| `DELETE` | `/api/v1/entities/:id` | `entitiesController.deleteEntity` | `requirePermission('entities:manage')` | None | `{ message: "Entity deleted" }` | 401, 403, 404 |
| `GET` | `/api/v1/tenants/current` | `tenantsController.getCurrentTenant` | `requireAuth` | None | `{ company, entities, role, permissions }` | 401 |
| `POST` | `/api/v1/tenants/invitations` | `tenantsController.createInvitation` | `requirePermission('tenants:manage')` | `{ email, role }` | `OrganizationInvitation` | 400, 401, 403, 409 |
| `GET` | `/api/v1/tenants/invitations` | `tenantsController.listInvitations` | `requirePermission('tenants:manage')` | None | `OrganizationInvitation[]` | 401, 403 |
| `GET` | `/api/v1/tenants/invitations/validate/:token` | `tenantsController.validateToken` | Public | None | `{ valid: boolean, email, company_name, role }` | 400, 404 |
| `POST` | `/api/v1/tenants/invitations/accept` | `tenantsController.acceptInvitation` | Public | `{ token, full_name, password }` | `{ message: "Invitation accepted", access_token }` | 400, 404 |

---

## 4. Double-Entry General Ledger & Accounts (`/api/v1/accounts`, `/api/v1/journals`, `/api/v1/ledger`)

| Method | Source Route | Express Controller & Method | Required Permissions / Auth | Request Payload | Response Model | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/accounts` | `accountsController.listAccounts` | `requirePermission('accounts:read')` | Query: `{ entity_id?, account_type? }` | `Account[]` | 401, 403 |
| `POST` | `/api/v1/accounts` | `accountsController.createAccount` | `requirePermission('accounts:manage')` | `{ code, name, account_type, normal_balance, entity_id, description? }` | `Account` | 400, 401, 403, 409 |
| `GET` | `/api/v1/accounts/:id` | `accountsController.getAccount` | `requirePermission('accounts:read')` | None | `Account` | 401, 403, 404 |
| `PUT` | `/api/v1/accounts/:id` | `accountsController.updateAccount` | `requirePermission('accounts:manage')` | `{ name?, description?, is_active? }` | `Account` | 400, 401, 403, 404 |
| `GET` | `/api/v1/journals` | `journalsController.listJournals` | `requireAuth` | Query: `{ entity_id?, status?, start_date?, end_date? }` | `JournalEntry[]` | 401 |
| `POST` | `/api/v1/journals` | `journalsController.createJournal` | `requirePermission('journals:create')` | `{ entity_id, date, reference?, memo?, lines: [{ account_id, debit, credit, description? }] }` | `JournalEntry` | 400, 401, 403 |
| `GET` | `/api/v1/journals/:id` | `journalsController.getJournal` | `requireAuth` | None | `JournalEntryDetail` | 401, 404 |
| `POST` | `/api/v1/journals/:id/submit` | `journalsController.submitJournal` | `requirePermission('journals:submit')` | None | `JournalEntry` | 400, 401, 403, 404 |
| `POST` | `/api/v1/journals/:id/approve` | `journalsController.approveJournal` | `requirePermission('journals:approve')` | `{ comments? }` | `JournalEntry` | 400, 401, 403, 404 |
| `POST` | `/api/v1/journals/:id/reject` | `journalsController.rejectJournal` | `requirePermission('journals:reject')` | `{ reason }` | `JournalEntry` | 400, 401, 403, 404 |
| `POST` | `/api/v1/journals/:id/post` | `journalsController.postJournal` | `requirePermission('journals:post')` | None | `JournalEntry` | 400, 401, 403, 404 |
| `POST` | `/api/v1/journals/:id/reverse` | `journalsController.reverseJournal` | `requirePermission('journals:reverse')` | `{ reason? }` | `{ reversal_entry: JournalEntry }` | 400, 401, 403, 404 |
| `GET` | `/api/v1/ledger/accounts/:id` | `ledgerController.getAccountLedger` | `requirePermission('ledger:view')` | Query: `{ start_date?, end_date? }` | `{ account, running_balance, entries: [] }` | 401, 403, 404 |
| `GET` | `/api/v1/ledger/trial-balance` | `ledgerController.getTrialBalance` | `requirePermission('reports:view')` | Query: `{ entity_id, as_of_date? }` | `{ total_debit, total_credit, accounts: [] }` | 400, 401, 403 |

---

## 5. Sales & Invoicing (`/api/v1/sales`)

| Method | Source Route | Express Controller & Method | Required Permissions / Auth | Request Payload | Response Model | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sales/items` | `salesController.listItems` | `requirePermission('inventory:products:read')` | Query: `{ entity_id?, search? }` | `Product[]` | 401, 403 |
| `POST` | `/api/v1/sales/items` | `salesController.createItem` | `requirePermission('inventory:products:manage')` | `{ entity_id, name, sku, product_type, selling_price, purchase_price, tax_rate, hsn_sac_code?, track_inventory?, opening_stock? }` | `Product` | 400, 401, 403, 409 |
| `GET` | `/api/v1/sales/invoices` | `salesController.listInvoices` | `requireAuth` | Query: `{ entity_id?, customer_id?, status?, start_date?, end_date? }` | `InvoiceSummary[]` | 401 |
| `POST` | `/api/v1/sales/invoices` | `salesController.createInvoice` | `requirePermission('sales:invoice:create')` | `{ entity_id, customer_id, issue_date, due_date, items: [{ product_id, quantity, unit_price, tax_rate, discount? }] }` | `Invoice` | 400, 401, 403 |
| `GET` | `/api/v1/sales/invoices/:id` | `salesController.getInvoice` | `requireAuth` | None | `InvoiceDetail` | 401, 404 |
| `POST` | `/api/v1/sales/invoices/:id/post` | `salesController.postInvoice` | `requirePermission('sales:invoice:post')` | None | `{ invoice, journal_entry_id }` | 400, 401, 403, 404 |
| `POST` | `/api/v1/sales/invoices/:id/payments` | `salesController.recordPayment` | `requirePermission('sales:payments:record')` | `{ amount, payment_date, payment_mode, reference_number?, deposit_to_account_id }` | `CustomerPayment` | 400, 401, 403, 404 |
| `GET` | `/api/v1/sales/invoices/public/:token` | `salesController.getPublicInvoice` | Public | None | `{ invoice, entity_name, customer_name, payment_link }` | 404 |
| `GET` | `/api/v1/sales/customers` | `salesController.listCustomers` | `requirePermission('sales:customers:read')` | Query: `{ entity_id?, search? }` | `Customer[]` | 401, 403 |
| `POST` | `/api/v1/sales/customers` | `salesController.createCustomer` | `requirePermission('sales:customers:manage')` | `{ entity_id, name, email?, phone?, gstin?, pan?, billing_address?, city?, state? }` | `Customer` | 400, 401, 403 |

---

## 6. Purchases & Vendor Bills (`/api/v1/purchases`)

| Method | Source Route | Express Controller & Method | Required Permissions / Auth | Request Payload | Response Model | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/purchases/vendors` | `purchasesController.listVendors` | `requirePermission('purchases:vendors:read')` | Query: `{ entity_id?, search? }` | `Vendor[]` | 401, 403 |
| `POST` | `/api/v1/purchases/vendors` | `purchasesController.createVendor` | `requirePermission('purchases:vendors:manage')` | `{ entity_id, name, email?, phone?, gstin?, pan?, address? }` | `Vendor` | 400, 401, 403 |
| `GET` | `/api/v1/purchases/bills` | `purchasesController.listBills` | `requireAuth` | Query: `{ entity_id?, vendor_id?, status? }` | `BillSummary[]` | 401 |
| `POST` | `/api/v1/purchases/bills` | `purchasesController.createBill` | `requirePermission('purchases:bills:create')` | `{ entity_id, vendor_id, bill_number, bill_date, due_date, items: [{ product_id?, description, quantity, unit_price, tax_rate }] }` | `Bill` | 400, 401, 403 |
| `POST` | `/api/v1/purchases/bills/:id/post` | `purchasesController.postBill` | `requirePermission('purchases:bills:post')` | None | `{ bill, journal_entry_id }` | 400, 401, 403, 404 |
| `POST` | `/api/v1/purchases/bills/:id/payments` | `purchasesController.recordPayment` | `requirePermission('purchases:payments:record')` | `{ amount, payment_date, payment_mode, paid_from_account_id }` | `VendorPayment` | 400, 401, 403, 404 |

---

## 7. Banking & Statement Reconciliation (`/api/v1/banking`)

| Method | Source Route | Express Controller & Method | Required Permissions / Auth | Request Payload | Response Model | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/banking/accounts` | `bankingController.listAccounts` | `requirePermission('banking:accounts:read')` | Query: `{ entity_id? }` | `BankAccount[]` | 401, 403 |
| `POST` | `/api/v1/banking/accounts` | `bankingController.createAccount` | `requirePermission('banking:accounts:manage')` | `{ entity_id, account_name, account_number, ifsc_code, bank_name, opening_balance }` | `BankAccount` | 400, 401, 403 |
| `GET` | `/api/v1/banking/transactions` | `bankingController.listTransactions` | `requirePermission('banking:accounts:read')` | Query: `{ bank_account_id?, start_date?, end_date? }` | `BankTransaction[]` | 401, 403 |
| `POST` | `/api/v1/banking/transfers` | `bankingController.transferFunds` | `requirePermission('banking:accounts:manage')` | `{ entity_id, from_account_id, to_account_id, amount, transfer_date, reference? }` | `BankTransfer` | 400, 401, 403 |
| `POST` | `/api/v1/banking/reconciliations/:id/upload-csv` | `bankingController.uploadCsvStatement` | `requirePermission('banking:reconcile')` | Multipart Form / CSV payload | `{ total_parsed, statement_lines: [] }` | 400, 401, 403 |
| `POST` | `/api/v1/banking/reconciliations/:id/match` | `bankingController.matchTransaction` | `requirePermission('banking:reconcile')` | `{ statement_line_id, book_transaction_id }` | `{ message: "Matched successfully" }` | 400, 401, 403, 404 |
| `POST` | `/api/v1/banking/reconciliations/:id/complete` | `bankingController.completeReconciliation`| `requirePermission('banking:reconcile')` | None | `BankReconciliation` | 400, 401, 403, 404 |

---

## 8. Financial Reports (`/api/v1/reports`)

| Method | Source Route | Express Controller & Method | Required Permissions / Auth | Request Payload | Response Model | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/balance-sheet` | `reportsController.getBalanceSheet` | `requirePermission('reports:view')` | Query: `{ entity_id, as_of_date? }` | `BalanceSheetReport` | 400, 401, 403 |
| `GET` | `/api/v1/reports/profit-and-loss` | `reportsController.getProfitAndLoss` | `requirePermission('reports:view')` | Query: `{ entity_id, start_date, end_date }` | `ProfitLossReport` | 400, 401, 403 |
| `GET` | `/api/v1/reports/trial-balance` | `reportsController.getTrialBalance` | `requirePermission('reports:view')` | Query: `{ entity_id, as_of_date? }` | `TrialBalanceReport` | 400, 401, 403 |
| `GET` | `/api/v1/reports/cash-flow` | `reportsController.getCashFlow` | `requirePermission('reports:view')` | Query: `{ entity_id, start_date, end_date }` | `CashFlowReport` | 400, 401, 403 |
| `GET` | `/api/v1/reports/ar-aging` | `reportsController.getArAging` | `requirePermission('reports:view')` | Query: `{ entity_id, as_of_date? }` | `AgingReport` | 400, 401, 403 |
| `GET` | `/api/v1/reports/ap-aging` | `reportsController.getApAging` | `requirePermission('reports:view')` | Query: `{ entity_id, as_of_date? }` | `AgingReport` | 400, 401, 403 |

---

## Summary Contract Preservation Note

Every Express.js endpoint precisely replicates the field names, route parameters, HTTP status codes, and error responses of the existing FastAPI backend. This allows client components and API wrappers in `frontend/src/services/` to transition directly to Next.js without experiencing contract breakage or runtime schema regressions.
