import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/bills', PurchaseController.listBills);
router.post('/bills', requirePermission('purchases:bills:create'), PurchaseController.createBill);
router.get('/bills/:id', PurchaseController.getBill);
router.post('/bills/:id/post', requirePermission('purchases:bills:post'), PurchaseController.postBill);
router.post('/bills/:id/payments', requirePermission('purchases:payments:record'), PurchaseController.recordPayment);

router.get('/vendors', requirePermission('purchases:vendors:read'), PurchaseController.listVendors);
router.post('/vendors', requirePermission('purchases:vendors:manage'), PurchaseController.createVendor);

export default router;

