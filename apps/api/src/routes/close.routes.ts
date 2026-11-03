import { Router } from 'express';
import { CloseController } from '../controllers/close.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/periods', CloseController.getPeriods);
router.post('/periods', CloseController.createPeriod);
router.get('/periods/:id', CloseController.getPeriodDetail);
router.post('/periods/:id/lock', CloseController.lockPeriod);
router.post('/periods/:id/reopen', CloseController.reopenPeriod);

router.put('/tasks/:id', CloseController.updateTask);
router.patch('/tasks/:id', CloseController.updateTask);

export default router;
