import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', AccountController.listAccounts);
router.post('/', requirePermission('accounts:manage'), AccountController.createAccount);
router.get('/:id', AccountController.getAccount);

export default router;

