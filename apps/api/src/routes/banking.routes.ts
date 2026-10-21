import { Router } from 'express';
import { BankingController } from '../controllers/banking.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/accounts', requirePermission('banking:accounts:read'), BankingController.listAccounts);
router.post('/accounts', requirePermission('banking:accounts:manage'), BankingController.createAccount);
router.get('/transactions', requirePermission('banking:accounts:read'), BankingController.listTransactions);
router.post('/transactions', requirePermission('banking:accounts:manage'), BankingController.createTransaction);

router.post('/reconciliations', requirePermission('banking:reconcile'), BankingController.startReconciliation);
router.post('/reconciliations/:id/match', requirePermission('banking:reconcile'), BankingController.autoMatch);
router.post('/reconciliations/:id/complete', requirePermission('banking:reconcile'), BankingController.completeReconciliation);

export default router;
