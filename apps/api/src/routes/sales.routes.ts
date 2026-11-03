import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();

// Public links for customer viewing and payment
router.get('/public/invoices/:token', SalesController.getPublicInvoice);
router.post('/public/invoices/:token/pay', SalesController.payPublicInvoice);
router.get('/invoices/public/:token', SalesController.getPublicInvoice);

// Scoped auth protection for sales paths only
const protectedSalesPaths = [
  '/invoices',
  '/customers',
  '/items',
  '/products',
  '/payments',
  '/estimates',
  '/orders',
  '/credit-notes',
  '/recurring',
];
protectedSalesPaths.forEach((p) => router.use(p, requireAuth));

// Products & Items master
router.get('/items/summary', SalesController.getItemsSummary);
router.get('/products/summary', SalesController.getItemsSummary);
router.get('/items/categories', SalesController.getItemsCategories);
router.get('/products/categories', SalesController.getItemsCategories);

router.get('/items', requirePermission('inventory:products:read'), SalesController.listItems);
router.post('/items', requirePermission('inventory:products:manage'), SalesController.createItem);
router.get('/items/:id', requirePermission('inventory:products:read'), SalesController.getItem);
router.put('/items/:id', requirePermission('inventory:products:manage'), SalesController.updateItem);
router.patch('/items/:id/status', requirePermission('inventory:products:manage'), SalesController.patchItemStatus);

router.get('/products', requirePermission('inventory:products:read'), SalesController.listItems);
router.post('/products', requirePermission('inventory:products:manage'), SalesController.createItem);
router.get('/products/:id', requirePermission('inventory:products:read'), SalesController.getItem);
router.put('/products/:id', requirePermission('inventory:products:manage'), SalesController.updateItem);
router.patch('/products/:id/status', requirePermission('inventory:products:manage'), SalesController.patchItemStatus);

// Invoices
router.get('/invoices', SalesController.listInvoices);
router.post('/invoices', requirePermission('sales:invoice:create'), SalesController.createInvoice);
router.get('/invoices/:id', SalesController.getInvoice);
router.post('/invoices/:id/post', requirePermission('sales:invoice:post'), SalesController.postInvoice);
router.post('/invoices/:id/payments', requirePermission('sales:payments:record'), SalesController.recordPayment);

// Customers
router.get('/customers', requirePermission('sales:customers:read'), SalesController.listCustomers);
router.post('/customers', requirePermission('sales:customers:manage'), SalesController.createCustomer);
router.get('/customers/:id/statement', requirePermission('sales:customers:read'), SalesController.getCustomerStatement);
router.get('/customers/:id/ledger', requirePermission('sales:customers:read'), SalesController.getCustomerStatement);
router.get('/customers/:id', requirePermission('sales:customers:read'), SalesController.getCustomer);
router.put('/customers/:id', requirePermission('sales:customers:manage'), SalesController.updateCustomer);
router.delete('/customers/:id', requirePermission('sales:customers:manage'), SalesController.deleteCustomer);

// Payments
router.get('/payments', SalesController.listPayments);
router.post('/payments', requirePermission('sales:payments:record'), SalesController.recordCustomerPaymentDirect);
router.get('/payments/customer', SalesController.listPayments);
router.post('/payments/customer', requirePermission('sales:payments:record'), SalesController.recordCustomerPaymentDirect);

// Estimates / Quotations
router.get('/estimates', SalesController.listEstimates);
router.post('/estimates', SalesController.createEstimate);
router.get('/estimates/:id', SalesController.getEstimate);
router.post('/estimates/:estimateId/convert', SalesController.convertEstimate);
router.post('/estimates/:estimateId/convert-to-invoice', SalesController.convertEstimate);

// Sales Orders
router.get('/orders', SalesController.listOrders);
router.post('/orders', SalesController.createOrder);

// Credit Notes
router.get('/credit-notes', SalesController.listCreditNotes);
router.post('/credit-notes', SalesController.createCreditNote);

// Recurring Invoices
router.get('/recurring', SalesController.listRecurring);
router.post('/recurring', SalesController.createRecurring);

export default router;
