import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('sales:customers:read'), SalesController.listCustomers);
router.post('/', requirePermission('sales:customers:manage'), SalesController.createCustomer);
router.get('/:id/statement', requirePermission('sales:customers:read'), SalesController.getCustomerStatement);
router.get('/:id/ledger', requirePermission('sales:customers:read'), SalesController.getCustomerStatement);
router.get('/:id', requirePermission('sales:customers:read'), SalesController.getCustomer);
router.put('/:id', requirePermission('sales:customers:manage'), SalesController.updateCustomer);
router.delete('/:id', requirePermission('sales:customers:manage'), SalesController.deleteCustomer);

export default router;

