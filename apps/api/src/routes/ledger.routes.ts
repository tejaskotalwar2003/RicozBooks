import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/accounts/:id', requirePermission('ledger:view'), ReportController.getAccountLedger);
router.get('/trial-balance', requirePermission('reports:view'), ReportController.getTrialBalance);

export default router;
