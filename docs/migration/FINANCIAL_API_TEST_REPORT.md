# RicozBooks — Financial API & Workflow Test Report

## 1. Test Suite Architecture

The test suite for the migrated Node.js + Express + MongoDB backend (`apps/api`) is implemented using **Jest** and **ts-jest**, covering double-entry accounting integrity, mathematical rounding, period locking, maker-checker authorization, inventory updates, and banking reconciliation.

### Summary Results
- **Test Suites**: 5 passed, 5 total
- **Tests**: 31 passed, 31 total
- **Execution Time**: ~13.7 seconds
- **Pass Rate**: 100.0%

---

## 2. Test Breakdown by Module

### 2.1 Double-Entry General Ledger (`tests/journal.test.ts`)
| Test Case | Scenario / Condition | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| `Single-line entry` | Journal entry with only 1 line | Rejection: "must have at least 2 lines" | PASS |
| `Negative debit` | Line with debit = -50.00 | Rejection: "negative amounts are not allowed" | PASS |
| `Negative credit` | Line with credit = -50.00 | Rejection: "negative amounts are not allowed" | PASS |
| `Dual debit & credit` | Single line with debit = 100, credit = 50 | Rejection: "cannot have both debit and credit" | PASS |
| `Zero-amount line` | Line with debit = 0, credit = 0 | Rejection: "either debit or credit must be > 0" | PASS |
| `Imbalanced entry` | Debit = 100.00, Credit = 99.50 | Rejection: "double-entry balance violation" | PASS |
| `Zero total entry` | All lines zero | Rejection: "journal total must be > 0" | PASS |
| `Balanced 2-line entry` | Debit = 2500.50, Credit = 2500.50 | Validated with total 2500.50 | PASS |
| `Compound 4-line entry` | AR 1180 = Rev 1000 + CGST 90 + SGST 90 | Validated with total 1180.00 | PASS |
| `Fiscal period lock` | Date in closed fiscal period | Rejection: "permanently closed" | PASS |
| `Close period lock` | Month in closed accounting period | Rejection: "locked and closed by management" | PASS |
| `Rejection reason` | Rejecting journal with empty reason | Rejection: "mandatory when rejecting" | PASS |
| `Reopen posted journal` | Attempting to reopen POSTED journal | Rejection: "posted entries cannot be reopened" | PASS |
| `Post unapproved journal`| Standard user posting DRAFT journal | Rejection: "must be approved first" | PASS |
| `Reversal entry generation`| Reversing posted journal entry | Inverts lines, marks original REVERSED | PASS |

### 2.2 Sales Invoicing & Inventory/COGS (`tests/sales.test.ts`)
| Test Case | Scenario / Condition | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| `Intra-state GST` | Supply within same state | Subtotal 1800 -> 9% CGST (162) + 9% SGST (162) | PASS |
| `Inter-state GST` | Supply across state borders | Subtotal 5000 -> 18% IGST (900) | PASS |
| `Insufficient stock` | Requested 10 units with only 5 in stock | Rejection: "insufficient stock" | PASS |
| `Perpetual COGS & Stock` | Selling 2 units @ cost 300 | Current stock decremented by 2, COGS 600 posted | PASS |
| `Double-entry balance` | Invoice total 1180 + COGS 600 | $\sum \text{Debit} (1780) = \sum \text{Credit} (1780)$ | PASS |
| `Customer ledger update` | Posting invoice | Customer `current_balance` incremented | PASS |
| `Excess payment rejection`| Payment amount > balance due | Rejection: "exceeds balance due" | PASS |
| `Customer payment receipt`| Full invoice payment | Invoice -> PAID, customer balance cleared | PASS |

### 2.3 Purchase Bills & Accounts Payable (`tests/purchase.test.ts`)
| Test Case | Scenario / Condition | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| `Bill tax calculation` | Purchase 5 units @ 200, tax 18% | Subtotal 1000, Tax 180, Total 1180 | PASS |
| `Inventory replenishment`| Receiving 5 units of tracked item | Stock incremented from 15 to 20 | PASS |
| `Purchase price update` | New unit price recorded | `purchase_price` updated to 200 | PASS |
| `AP double-entry balance`| Bill posting | Debit Expense (1000) + Tax (180) = Credit AP (1180) | PASS |
| `Vendor disbursement` | Recording vendor payment | Debit AP 1180, Credit Bank 1180, Bill -> PAID | PASS |

### 2.4 Banking & Statement Reconciliation (`tests/banking.test.ts`)
| Test Case | Scenario / Condition | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| `Bank GL linking` | Create bank account | Linked to GL 1100, opening balance stored | PASS |
| `Deposit balance adjustment`| Inflow transaction of 15,000 | Balance incremented: 50,000 -> 65,000 | PASS |
| `Withdrawal balance adjustment`| Outflow transaction of 5,000 | Balance decremented: 65,000 -> 60,000 | PASS |
| `Automated matching` | Statement line matched with book tx | Status -> RECONCILED, matchedCount = 1 | PASS |
| `Unbalanced recon lock` | Attempting to finalize with diff 250 | Rejection: "unresolved difference of 250.00" | PASS |
| `Balanced recon completion`| Finalizing with diff 0.00 | Status -> COMPLETED, completed_at set | PASS |

### 2.5 Health & Root Endpoints (`tests/health.test.ts`)
| Test Case | Scenario / Condition | Expected Outcome | Result |
| :--- | :--- | :--- | :--- |
| `Application root` | `GET /` | Returns API name, version 1.3.0, docs path | PASS |
| `Health status` | `GET /api/v1/health` | Returns online status, version 1.3.0 | PASS |

