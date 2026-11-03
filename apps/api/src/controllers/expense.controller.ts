import { Request, Response, NextFunction } from 'express';
import mongoose from 'express';
import { ExpenseCategory, Expense, IExpenseCategory, IExpense } from '../models/Expense';
import { ExpenseEngine } from '../services/expense.engine';
import { AuditService } from '../services/audit.service';

export class ExpenseController {
  // ==========================================
  // Categories
  // ==========================================
  public static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      const filter: any = { is_active: true };
      if (entity_id) filter.entity_id = entity_id;

      const categories = await ExpenseCategory.find(filter).populate('default_account_id').sort({ name: 1 });
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  public static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, code, name, description, default_account_id, tax_rate_percent } = req.body;
      const category = await ExpenseCategory.create({
        entity_id,
        code,
        name,
        description,
        default_account_id,
        tax_rate_percent: tax_rate_percent || 0.0,
      });

      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  }

  public static async getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const category = await ExpenseCategory.findById(id).populate('default_account_id');
      if (!category) {
        res.status(404).json({ detail: 'Expense category not found' });
        return;
      }
      res.json(category);
    } catch (err) {
      next(err);
    }
  }

  public static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const category = await ExpenseCategory.findByIdAndUpdate(id, req.body, { new: true });
      if (!category) {
        res.status(404).json({ detail: 'Expense category not found' });
        return;
      }
      res.json(category);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const category = await ExpenseCategory.findByIdAndUpdate(id, { is_active: false }, { new: true });
      if (!category) {
        res.status(404).json({ detail: 'Expense category not found' });
        return;
      }
      res.json({ message: 'Category deactivated successfully' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Expenses CRUD
  // ==========================================
  public static async listExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        category_id,
        status,
        search,
        start_date,
        end_date,
        page = 1,
        page_size = 50,
        limit,
        skip,
        paginate = 'true',
      } = req.query;

      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (category_id) filter.category_id = category_id;
      if (status && status !== 'ALL') filter.status = status;
      if (start_date || end_date) {
        filter.expense_date = {};
        if (start_date) filter.expense_date.$gte = new Date(start_date as string);
        if (end_date) filter.expense_date.$lte = new Date(end_date as string);
      }
      if (search) {
        const s = String(search);
        filter.$or = [
          { title: { $regex: s, $options: 'i' } },
          { expense_number: { $regex: s, $options: 'i' } },
          { merchant_name: { $regex: s, $options: 'i' } },
        ];
      }

      const total = await Expense.countDocuments(filter);
      const effLimit = Number(limit || page_size);
      const effSkip = skip !== undefined ? Number(skip) : (Number(page) - 1) * effLimit;

      const items = await Expense.find(filter)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'name email first_name last_name')
        .sort({ expense_date: -1 })
        .skip(effSkip)
        .limit(effLimit);

      if (paginate === 'false') {
        res.json(items);
        return;
      }

      res.json({
        items,
        total,
        page: Number(page),
        page_size: effLimit,
        total_pages: Math.ceil(total / effLimit) || 1,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await Expense.findById(id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'name email first_name last_name');

      if (!expense) {
        res.status(404).json({ detail: 'Expense not found' });
        return;
      }
      res.json(expense);
    } catch (err) {
      next(err);
    }
  }

  public static async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const autoPost = req.query.auto_post === 'true' || req.body.auto_post === true;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const expenseNumber = await ExpenseEngine.generateExpenseNumber(req.body.entity_id);

      const subtotal = Number(req.body.subtotal || 0);
      const taxAmount = Number(req.body.tax_amount || 0);
      const totalAmount = Number(req.body.total_amount || (subtotal + taxAmount));

      const initialStatus = req.body.is_reimbursable ? 'SUBMITTED' : 'DRAFT';

      const expense = await Expense.create({
        ...req.body,
        expense_number: expenseNumber,
        user_id: userId,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: initialStatus,
      });

      if (autoPost && !req.body.is_reimbursable) {
        await ExpenseEngine.postExpenseToGL(expense._id, userId);
      }

      await AuditService.log({
        user_id: userId,
        user_email: (req as any).user?.email,
        action: 'CREATE',
        record_type: 'Expense',
        record_id: String(expense._id),
        entity_id: req.body.entity_id,
        details: `Created expense #${expense.expense_number} (${expense.title}) for ₹${totalAmount}`,
      });

      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'name email first_name last_name');

      res.status(201).json(populated);
    } catch (err) {
      next(err);
    }
  }

  public static async updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await Expense.findById(id);
      if (!expense) {
        res.status(404).json({ detail: 'Expense not found' });
        return;
      }

      if (expense.status === 'POSTED' || expense.status === 'PAID') {
        res.status(400).json({ detail: 'Cannot modify a posted or paid expense.' });
        return;
      }

      Object.assign(expense, req.body);
      await expense.save();

      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'name email first_name last_name');

      res.json(populated);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await Expense.findById(id);
      if (!expense) {
        res.status(404).json({ detail: 'Expense not found' });
        return;
      }

      if (expense.status === 'POSTED' || expense.status === 'PAID') {
        res.status(400).json({ detail: 'Cannot delete a posted or paid expense.' });
        return;
      }

      await Expense.findByIdAndDelete(id);
      res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async actionExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action, rejection_reason } = req.body;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const expense = await Expense.findById(id);
      if (!expense) {
        res.status(404).json({ detail: 'Expense not found' });
        return;
      }

      if (action === 'APPROVE') {
        expense.status = 'APPROVED';
        expense.approved_by_id = userId;
        expense.approved_at = new Date();
      } else if (action === 'REJECT') {
        expense.status = 'REJECTED';
        expense.rejection_reason = rejection_reason || 'Expense claim was rejected.';
      } else {
        res.status(400).json({ detail: "Action must be 'APPROVE' or 'REJECT'" });
        return;
      }

      await expense.save();

      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'name email first_name last_name');

      res.json(populated);
    } catch (err) {
      next(err);
    }
  }

  public static async postExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const expense = await ExpenseEngine.postExpenseToGL(id, userId);
      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'name email first_name last_name');

      res.json(populated);
    } catch (err) {
      next(err);
    }
  }

  public static async reimburseExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { payment_account_id, reference_number } = req.body;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const expense = await ExpenseEngine.reimburseExpenseClaim(id, payment_account_id, reference_number, userId);
      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'name email first_name last_name');

      res.json(populated);
    } catch (err) {
      next(err);
    }
  }

  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      if (!entity_id) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const allEntityExpenses = await Expense.find({ entity_id });

      let totalExpensesMonth = 0;
      let pendingApprovalsCount = 0;
      let reimbursableClaimsTotal = 0;
      let postedExpensesTotal = 0;

      allEntityExpenses.forEach((e) => {
        const amt = Number(e.total_amount?.toString() || 0);
        if (e.expense_date >= monthStart) {
          totalExpensesMonth += amt;
        }
        if (['SUBMITTED', 'DRAFT'].includes(e.status)) {
          pendingApprovalsCount += 1;
        }
        if (e.is_reimbursable && e.status !== 'PAID') {
          reimbursableClaimsTotal += amt;
        }
        if (['POSTED', 'PAID'].includes(e.status)) {
          postedExpensesTotal += amt;
        }
      });

      res.json({
        total_expenses_month: Math.round(totalExpensesMonth * 100) / 100,
        pending_approvals_count: pendingApprovalsCount,
        reimbursable_claims_total: Math.round(reimbursableClaimsTotal * 100) / 100,
        posted_expenses_total: Math.round(postedExpensesTotal * 100) / 100,
      });
    } catch (err) {
      next(err);
    }
  }
}
