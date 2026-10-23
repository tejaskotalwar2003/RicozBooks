import { Router } from 'express';
import { EntityController } from '../controllers/entity.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', EntityController.listEntities);
router.post('/', requirePermission('entities:manage'), EntityController.createEntity);
router.get('/:id', EntityController.getEntity);
router.put('/:id', requirePermission('entities:manage'), EntityController.updateEntity);

export default router;
