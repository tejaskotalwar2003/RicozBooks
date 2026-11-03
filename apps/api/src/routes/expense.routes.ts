import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protect all expense routes
router.use(authenticate);

// Category endpoints
router.get('/categories', ExpenseController.getCategories);
router.post('/categories', ExpenseController.createCategory);
router.get('/categories/:id', ExpenseController.getCategory);
router.put('/categories/:id', ExpenseController.updateCategory);
router.delete('/categories/:id', ExpenseController.deleteCategory);

// Summary metrics
router.get('/expenses-summary', ExpenseController.getSummary);

// Expenses endpoints (nested under /expenses/expenses as called by some clients)
router.get('/expenses', ExpenseController.listExpenses);
router.post('/expenses', ExpenseController.createExpense);
router.get('/expenses/:id', ExpenseController.getExpense);
router.put('/expenses/:id', ExpenseController.updateExpense);
router.delete('/expenses/:id', ExpenseController.deleteExpense);
router.post('/expenses/:id/action', ExpenseController.actionExpense);
router.post('/expenses/:id/post', ExpenseController.postExpense);
router.post('/expenses/:id/reimburse', ExpenseController.reimburseExpense);

// Direct endpoints on router root (e.g. GET /expenses?entity_id=...)
router.get('/', ExpenseController.listExpenses);
router.post('/', ExpenseController.createExpense);
router.get('/:id', ExpenseController.getExpense);
router.put('/:id', ExpenseController.updateExpense);
router.delete('/:id', ExpenseController.deleteExpense);
router.post('/:id/action', ExpenseController.actionExpense);
router.post('/:id/post', ExpenseController.postExpense);
router.post('/:id/reimburse', ExpenseController.reimburseExpense);

export default router;
