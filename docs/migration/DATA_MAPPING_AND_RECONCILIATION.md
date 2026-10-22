# RicozBooks — Data Mapping & Database Reconciliation Specification

## 1. Overview

This document specifies the exact mapping between the source PostgreSQL relational schema and the target MongoDB document model. It addresses numeric precision, relational integrity, multi-tenant compound indexing, and zero-data-loss reconciliation.

---

## 2. Numeric Precision & Monetary Fields

Financial systems cannot tolerate floating-point rounding errors (e.g., $0.1 + 0.2 = 0.30000000000000004$).

### 2.1 Type Comparison
| Property | PostgreSQL Source | MongoDB Target | TypeScript / Runtime |
| :--- | :--- | :--- | :--- |
| **Data Type** | `NUMERIC(15, 2)` / `NUMERIC(12, 2)` | `mongoose.Schema.Types.Decimal128` | `mongoose.Types.Decimal128` |
| **Format** | Fixed-point arbitrary precision | IEEE 754-2008 128-bit decimal float | Handled via helper functions |
| **Precision** | Up to 15 digits, 2 decimal places | Up to 34 decimal digits of precision | Rounding: `ROUND_HALF_UP` (0.01) |

### 2.2 Conversion Utilities
The target application uses `apps/api/src/utils/decimal.ts`:
- `toDecimal(val)`: Safely converts string, number, or null to `mongoose.Types.Decimal128`.
- `fromDecimal(val)`: Converts `Decimal128` to JavaScript `number` for client JSON serialization.
- `quantizeAmount(val)`: Rounds numbers to two decimal places using exact monetary half-up rounding.
- `isBalanced(dr, cr, epsilon = 0.001)`: Validates that debits and credits balance within precision tolerance.

---

## 3. Entity & Schema Mapping Table

| Source Table (PostgreSQL) | Target Collection (MongoDB) | Primary Key Mapping | Multi-Tenant Compound Index | Key Foreign Keys -> ObjectId |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `users` | `id (int)` -> `_id (ObjectId)` | `{ email: 1 }` (unique) | `department_id`, `default_company_id`, `default_entity_id` |
| `departments` | `departments` | `id (int)` -> `_id (ObjectId)` | `{ code: 1 }` (unique) | `head_user_id` |
| `roles` | `roles` | `id (int)` -> `_id (ObjectId)` | `{ name: 1 }` (unique) | None |
| `companies` / `entities` | `entities` | `id (int)` -> `_id (ObjectId)` | `{ code: 1 }`, `{ gstin: 1 }` | `company_id` |
| `accounts` | `accounts` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, code: 1 }` (unique) | `entity_id`, `parent_id` |
| `journal_entries` | `journalentries` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, entry_number: 1 }` (unique) | `entity_id`, `created_by_user_id`, `reversal_of_entry_id` |
| `journal_entry_lines` | Embedded inside `journalentries.lines` | `id (int)` -> `_id (ObjectId)` | Sub-document array | `account_id`, `dimension_id` |
| `customers` | `customers` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, name: 1 }` | `entity_id` |
| `vendors` | `vendors` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, name: 1 }` | `entity_id` |
| `products` | `products` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, sku: 1 }` (unique) | `entity_id`, `sales_account_id`, `cogs_account_id`, `inventory_account_id` |
| `invoices` | `invoices` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, invoice_number: 1 }` (unique) | `entity_id`, `customer_id`, `journal_entry_id`, `payment_token` (unique) |
| `invoice_lines` | Embedded inside `invoices.lines` | `id (int)` -> `_id (ObjectId)` | Sub-document array | `product_id` |
| `customer_payments` | `customerpayments` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, payment_number: 1 }` | `entity_id`, `customer_id`, `invoice_id`, `deposit_to_account_id`, `journal_entry_id` |
| `bills` | `bills` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, bill_number: 1 }` (unique) | `entity_id`, `vendor_id`, `journal_entry_id` |
| `bill_lines` | Embedded inside `bills.lines` | `id (int)` -> `_id (ObjectId)` | Sub-document array | `product_id`, `expense_account_id` |
| `vendor_payments` | `vendorpayments` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, payment_number: 1 }` | `entity_id`, `vendor_id`, `bill_id`, `paid_from_account_id`, `journal_entry_id` |
| `inventory_movements` | `inventorymovements` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, product_id: 1, movement_date: -1 }` | `entity_id`, `product_id`, `journal_entry_id`, `created_by_user_id` |
| `bank_accounts` | `bankaccounts` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, account_number: 1 }` (unique) | `entity_id`, `gl_account_id` |
| `bank_transactions` | `banktransactions` | `id (int)` -> `_id (ObjectId)` | `{ bank_account_id: 1, transaction_date: -1 }` | `bank_account_id`, `reconciliation_id`, `journal_entry_id` |
| `bank_reconciliations` | `bankreconciliations` | `id (int)` -> `_id (ObjectId)` | `{ bank_account_id: 1, statement_date: -1 }` | `bank_account_id`, `reconciled_by_user_id` |
| `fiscal_periods` | `fiscalperiods` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, start_date: 1, end_date: 1 }` | `entity_id`, `closed_by_user_id` |
| `close_periods` | `closeperiods` | `id (int)` -> `_id (ObjectId)` | `{ entity_id: 1, fiscal_year: 1, month: 1 }` (unique) | `entity_id`, `closed_by_user_id` |
| `audit_logs` | `auditlogs` | `id (int)` -> `_id (ObjectId)` | `{ timestamp: -1 }`, `{ entity_id: 1 }` | `user_id`, `company_id`, `entity_id` |

---

## 4. Zero-Loss Data Verification Strategy

When live data extraction and migration scripts run:
1. **Checksum Matching**:
   $$\text{Checksum} = \text{MD5}(\text{Record ID} + \text{Timestamp} + \text{Total Amount})$$
2. **Double-Entry Reconciliation**:
   Before and after migration, verify that the sum of all debits across all posted journal entries matches the sum of credits exactly:
   $$\sum \text{Debits}_{\text{PG}} = \sum \text{Credits}_{\text{PG}} = \sum \text{Debits}_{\text{Mongo}} = \sum \text{Credits}_{\text{Mongo}}$$
3. **Inventory Quantity Reconciliation**:
   For every SKU, verify:
   $$\text{Initial Stock} + \sum \text{Purchases} - \sum \text{Sales} + \sum \text{Adjustments} = \text{Current Stock}$$

