import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

// Scoped auth protection for purchase paths only
const protectedPurchasePaths = [
  '/bills',
  '/vendors',
  '/purchase-orders',
  '/debit-notes',
  '/vendor-payments',
  '/payments/vendor',
];
protectedPurchasePaths.forEach((p) => router.use(p, requireAuth));

// Bills
router.get('/bills', PurchaseController.listBills);
router.post('/bills', requirePermission('purchases:bills:create'), PurchaseController.createBill);
router.get('/bills/:id', PurchaseController.getBill);
router.post('/bills/:id/post', requirePermission('purchases:bills:post'), PurchaseController.postBill);
router.post('/bills/:id/payments', requirePermission('purchases:payments:record'), PurchaseController.recordPayment);

// Vendors
router.get('/vendors', requirePermission('purchases:vendors:read'), PurchaseController.listVendors);
router.post('/vendors', requirePermission('purchases:vendors:manage'), PurchaseController.createVendor);
router.get('/vendors/:id/statement', requirePermission('purchases:vendors:read'), PurchaseController.getVendorStatement);
router.get('/vendors/:id/ledger', requirePermission('purchases:vendors:read'), PurchaseController.getVendorStatement);
router.get('/vendors/:id', requirePermission('purchases:vendors:read'), PurchaseController.getVendor);
router.put('/vendors/:id', requirePermission('purchases:vendors:manage'), PurchaseController.updateVendor);
router.delete('/vendors/:id', requirePermission('purchases:vendors:manage'), PurchaseController.deleteVendor);

// Purchase Orders
router.get('/purchase-orders', PurchaseController.listPurchaseOrders);
router.post('/purchase-orders', PurchaseController.createPurchaseOrder);
router.get('/purchase-orders/:id', PurchaseController.getPurchaseOrder);
router.post('/purchase-orders/:poId/convert-to-bill', PurchaseController.convertPurchaseOrderToBill);
router.post('/purchase-orders/:poId/convert', PurchaseController.convertPurchaseOrderToBill);

// Debit Notes
router.get('/debit-notes', PurchaseController.listDebitNotes);
router.post('/debit-notes', PurchaseController.createDebitNote);

// Vendor Payments
router.get('/vendor-payments', PurchaseController.listVendorPayments);
router.post('/vendor-payments', PurchaseController.recordVendorPaymentDirect);
router.get('/payments/vendor', PurchaseController.listVendorPayments);
router.post('/payments/vendor', PurchaseController.recordVendorPaymentDirect);

export default router;
