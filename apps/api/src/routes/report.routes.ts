import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/trial-balance', requirePermission('reports:view'), ReportController.getTrialBalance);
router.get('/profit-and-loss', requirePermission('reports:view'), ReportController.getProfitAndLoss);
router.get('/balance-sheet', requirePermission('reports:view'), ReportController.getBalanceSheet);

export default router;
