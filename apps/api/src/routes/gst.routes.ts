import { Router } from 'express';
import { GSTController } from '../controllers/gst.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/metrics', GSTController.getMetrics);
router.get('/gstr1', GSTController.getGSTR1);
router.get('/gstr3b', GSTController.getGSTR3B);
router.post('/settle', GSTController.settleReturn);

export default router;
