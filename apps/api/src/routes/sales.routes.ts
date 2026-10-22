import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

// Public link for customer viewing and payment
router.get('/invoices/public/:token', SalesController.getPublicInvoice);

// Protected routes
router.use(requireAuth);

router.get('/invoices', SalesController.listInvoices);
router.post('/invoices', requirePermission('sales:invoice:create'), SalesController.createInvoice);
router.get('/invoices/:id', SalesController.getInvoice);
router.post('/invoices/:id/post', requirePermission('sales:invoice:post'), SalesController.postInvoice);
router.post('/invoices/:id/payments', requirePermission('sales:payments:record'), SalesController.recordPayment);

router.get('/customers', requirePermission('sales:customers:read'), SalesController.listCustomers);
router.post('/customers', requirePermission('sales:customers:manage'), SalesController.createCustomer);

router.get('/items', requirePermission('inventory:products:read'), SalesController.listItems);
router.post('/items', requirePermission('inventory:products:manage'), SalesController.createItem);

export default router;

