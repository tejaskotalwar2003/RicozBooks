import { Router } from 'express';
import { EntityController } from '../controllers/entity.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', EntityController.listCompanies);

export default router;
