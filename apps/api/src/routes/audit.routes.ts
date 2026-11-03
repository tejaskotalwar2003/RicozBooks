import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/export', AuditController.exportAuditLogs);
router.get('/', AuditController.getAuditLogs);

export default router;
