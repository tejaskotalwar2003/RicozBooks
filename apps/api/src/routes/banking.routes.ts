import { Router } from 'express';
import { BankingController } from '../controllers/banking.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

// Bank Accounts
router.get('/accounts', requirePermission('banking:accounts:read'), BankingController.listAccounts);
router.post('/accounts', requirePermission('banking:accounts:manage'), BankingController.createAccount);

// Banking Summary
router.get('/banking-summary', requirePermission('banking:accounts:read'), BankingController.getBankingSummary);
router.get('/summary', requirePermission('banking:accounts:read'), BankingController.getBankingSummary);

// Transactions
router.get('/transactions', requirePermission('banking:accounts:read'), BankingController.listTransactions);
router.post('/transactions', requirePermission('banking:accounts:manage'), BankingController.createTransaction);

// Internal Transfers
router.get('/transfers', requirePermission('banking:accounts:read'), BankingController.listTransfers);
router.post('/transfers', requirePermission('banking:accounts:manage'), BankingController.createTransfer);

// Bank Reconciliations
router.post('/reconciliations', requirePermission('banking:reconcile'), BankingController.startReconciliation);
router.get('/reconciliations/:id', requirePermission('banking:reconcile'), BankingController.getReconciliationDetail);
router.post('/reconciliations/:id/match', requirePermission('banking:reconcile'), BankingController.autoMatch);
router.post('/reconciliations/:id/complete', requirePermission('banking:reconcile'), BankingController.completeReconciliation);
router.post('/reconciliations/:id/upload-csv', requirePermission('banking:reconcile'), BankingController.uploadStatementCsv);

export default router;
