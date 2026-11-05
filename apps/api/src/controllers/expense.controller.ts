import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ExpenseCategory, Expense, IExpenseCategory, IExpense } from '../models/Expense';
import { ExpenseEngine } from '../services/expense.engine';
import { AuditService } from '../services/audit.service';
import { fromDecimal } from '../utils/decimal';

function formatCategory(cat: any): any {
  if (!cat) return null;
  const obj = cat.toObject ? cat.toObject() : cat;
  return {
    ...obj,
    id: String(obj._id),
    _id: String(obj._id),
    entity_id: String(obj.entity_id),
    tax_rate_percent: fromDecimal(obj.tax_rate_percent),
    default_account_id: obj.default_account_id ? (obj.default_account_id._id ? String(obj.default_account_id._id) : String(obj.default_account_id)) : null,
  };
}

function formatExpense(exp: any): any {
  if (!exp) return null;
  const obj = exp.toObject ? exp.toObject() : exp;
  const category = obj.category_id && typeof obj.category_id === 'object' ? obj.category_id : null;
  const expenseAccount = obj.expense_account_id && typeof obj.expense_account_id === 'object' ? obj.expense_account_id : null;
  const paymentAccount = obj.payment_account_id && typeof obj.payment_account_id === 'object' ? obj.payment_account_id : null;
  const user = obj.user_id && typeof obj.user_id === 'object' ? obj.user_id : null;

  return {
    ...obj,
    id: String(obj._id),
    _id: String(obj._id),
    entity_id: String(obj.entity_id),
    category_id: category ? String(category._id) : (obj.category_id ? String(obj.category_id) : undefined),
    category_name: category ? category.name : undefined,
    expense_account_id: expenseAccount ? String(expenseAccount._id) : (obj.expense_account_id ? String(obj.expense_account_id) : undefined),
    expense_account_name: expenseAccount ? `${expenseAccount.code} - ${expenseAccount.name}` : undefined,
    payment_account_id: paymentAccount ? String(paymentAccount._id) : (obj.payment_account_id ? String(obj.payment_account_id) : undefined),
    payment_account_name: paymentAccount ? `${paymentAccount.code} - ${paymentAccount.name}` : undefined,
    bank_account_id: obj.bank_account_id ? String(obj.bank_account_id) : undefined,
    submitter_name: user ? (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || user.email) : 'System User',
    subtotal: fromDecimal(obj.subtotal),
    tax_amount: fromDecimal(obj.tax_amount),
    total_amount: fromDecimal(obj.total_amount),
    gst_rate: Number(obj.gst_rate || 0),
    expense_date: obj.expense_date ? (obj.expense_date instanceof Date ? obj.expense_date.toISOString().split('T')[0] : String(obj.expense_date).split('T')[0]) : new Date().toISOString().split('T')[0],
  };
}

export class ExpenseController {
  // ==========================================
  // Categories
  // ==========================================
  public static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entityId = req.query.entity_id || (req as any).currentEntityId || (req as any).user?.default_entity_id;
      const filter: any = { is_active: true };
      if (entityId) filter.entity_id = entityId;

      let categories = await ExpenseCategory.find(filter).populate('default_account_id').sort({ name: 1 });

      if (categories.length === 0 && entityId) {
        await ExpenseEngine.initializeStandardCategories(entityId);
        categories = await ExpenseCategory.find(filter).populate('default_account_id').sort({ name: 1 });
      }

      res.json(categories.map(formatCategory));
    } catch (err) {
      next(err);
    }
  }

  public static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, code, name, description, default_account_id, tax_rate_percent } = req.body;
      const targetEntityId = entity_id || (req as any).currentEntityId || (req as any).user?.default_entity_id;

      const category = await ExpenseCategory.create({
        entity_id: targetEntityId,
        code: String(code).trim().toUpperCase(),
        name: String(name).trim(),
        description: description || null,
        default_account_id: default_account_id && mongoose.isValidObjectId(default_account_id) ? default_account_id : null,
        tax_rate_percent: tax_rate_percent || 0.0,
      });

      res.status(201).json(formatCategory(category));
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
      res.json(formatCategory(category));
    } catch (err) {
      next(err);
    }
  }

  public static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const category = await ExpenseCategory.findByIdAndUpdate(id, req.body, { new: true }).populate('default_account_id');
      if (!category) {
        res.status(404).json({ detail: 'Expense category not found' });
        return;
      }
      res.json(formatCategory(category));
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
        is_reimbursable,
        page = 1,
        page_size = 20,
        limit,
        skip,
        paginate = 'true',
      } = req.query;

      const targetEntityId = entity_id || (req as any).currentEntityId || (req as any).user?.default_entity_id;
      const filter: any = {};
      if (targetEntityId) filter.entity_id = targetEntityId;
      if (category_id && category_id !== 'ALL' && mongoose.isValidObjectId(category_id)) {
        filter.category_id = category_id;
      }
      if (status && status !== 'ALL') filter.status = status;
      if (is_reimbursable !== undefined) filter.is_reimbursable = String(is_reimbursable) === 'true';

      if (start_date || end_date) {
        filter.expense_date = {};
        if (start_date) filter.expense_date.$gte = new Date(start_date as string);
        if (end_date) filter.expense_date.$lte = new Date(end_date as string);
      }
      if (search) {
        const s = String(search).trim();
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
        .populate('user_id', 'full_name name email first_name last_name')
        .sort({ expense_date: -1, created_at: -1 })
        .skip(effSkip)
        .limit(effLimit);

      const formattedItems = items.map(formatExpense);

      if (paginate === 'false') {
        res.json(formattedItems);
        return;
      }

      res.json({
        items: formattedItems,
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
        .populate('user_id', 'full_name name email first_name last_name');

      if (!expense) {
        res.status(404).json({ detail: 'Expense not found' });
        return;
      }
      res.json(formatExpense(expense));
    } catch (err) {
      next(err);
    }
  }

  public static async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const autoPost = req.query.auto_post === 'true' || req.body.auto_post === true;
      const userId = (req as any).user?.id || (req as any).user?._id;
      const targetEntityId = req.body.entity_id || (req as any).currentEntityId || (req as any).user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const title = String(req.body.title || '').trim();
      if (!title) {
        res.status(400).json({ detail: 'Expense title is required' });
        return;
      }

      const subtotal = Number(req.body.subtotal || 0);
      if (subtotal <= 0) {
        res.status(400).json({ detail: 'Expense subtotal must be greater than 0' });
        return;
      }

      if (!req.body.expense_account_id) {
        res.status(400).json({ detail: 'Expense GL Account is required' });
        return;
      }

      const taxAmount = Number(req.body.tax_amount || 0);
      const totalAmount = Number(req.body.total_amount || (subtotal + taxAmount));
      const expenseNumber = await ExpenseEngine.generateExpenseNumber(targetEntityId);

      const categoryId = req.body.category_id && mongoose.isValidObjectId(req.body.category_id)
        ? req.body.category_id
        : null;

      const paymentAccountId = req.body.payment_account_id && mongoose.isValidObjectId(req.body.payment_account_id)
        ? req.body.payment_account_id
        : null;

      const bankAccountId = req.body.bank_account_id && mongoose.isValidObjectId(req.body.bank_account_id)
        ? req.body.bank_account_id
        : null;

      const initialStatus = req.body.is_reimbursable ? 'SUBMITTED' : 'DRAFT';

      const expense = await Expense.create({
        entity_id: targetEntityId,
        expense_number: expenseNumber,
        title,
        category_id: categoryId,
        user_id: userId,
        expense_date: req.body.expense_date ? new Date(req.body.expense_date) : new Date(),
        expense_account_id: req.body.expense_account_id,
        payment_account_id: paymentAccountId,
        bank_account_id: bankAccountId,
        payment_method: req.body.payment_method || 'BANK_TRANSFER',
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        gst_rate: Number(req.body.gst_rate || 0),
        currency: req.body.currency || 'INR',
        merchant_name: req.body.merchant_name ? String(req.body.merchant_name).trim() : null,
        reference_number: req.body.reference_number ? String(req.body.reference_number).trim() : null,
        description: req.body.description ? String(req.body.description).trim() : null,
        notes: req.body.notes ? String(req.body.notes).trim() : null,
        receipt_url: req.body.receipt_url || null,
        is_reimbursable: Boolean(req.body.is_reimbursable),
        is_billable: Boolean(req.body.is_billable),
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
        entity_id: targetEntityId,
        details: `Created expense #${expense.expense_number} (${expense.title}) for ₹${totalAmount}`,
      });

      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'full_name name email first_name last_name');

      res.status(201).json(formatExpense(populated));
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

      const updateData: any = { ...req.body };
      delete updateData._id;
      delete updateData.id;
      delete updateData.expense_number;

      if (updateData.subtotal !== undefined || updateData.tax_amount !== undefined) {
        const sub = Number(updateData.subtotal !== undefined ? updateData.subtotal : expense.subtotal);
        const tax = Number(updateData.tax_amount !== undefined ? updateData.tax_amount : expense.tax_amount);
        updateData.subtotal = sub;
        updateData.tax_amount = tax;
        updateData.total_amount = sub + tax;
      }

      Object.assign(expense, updateData);
      await expense.save();

      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'full_name name email first_name last_name');

      res.json(formatExpense(populated));
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

  public static async submitExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await Expense.findById(id);
      if (!expense) {
        res.status(404).json({ detail: 'Expense not found' });
        return;
      }

      if (expense.status !== 'DRAFT') {
        res.status(400).json({ detail: `Cannot submit expense with status '${expense.status}'. Only DRAFT expenses can be submitted.` });
        return;
      }

      expense.status = 'SUBMITTED';
      await expense.save();

      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'full_name name email first_name last_name');

      res.json(formatExpense(populated));
    } catch (err) {
      next(err);
    }
  }

  public static async approveExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const expense = await Expense.findById(id);
      if (!expense) {
        res.status(404).json({ detail: 'Expense not found' });
        return;
      }

      if (expense.status !== 'SUBMITTED' && expense.status !== 'DRAFT') {
        res.status(400).json({ detail: `Cannot approve expense with status '${expense.status}'.` });
        return;
      }

      expense.status = 'APPROVED';
      expense.approved_by_id = userId;
      expense.approved_at = new Date();
      await expense.save();

      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'full_name name email first_name last_name');

      res.json(formatExpense(populated));
    } catch (err) {
      next(err);
    }
  }

  public static async rejectExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;

      const expense = await Expense.findById(id);
      if (!expense) {
        res.status(404).json({ detail: 'Expense not found' });
        return;
      }

      expense.status = 'REJECTED';
      expense.rejection_reason = rejection_reason || 'Expense claim was rejected.';
      await expense.save();

      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'full_name name email first_name last_name');

      res.json(formatExpense(populated));
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
        .populate('user_id', 'full_name name email first_name last_name');

      res.json(formatExpense(populated));
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
        .populate('user_id', 'full_name name email first_name last_name');

      res.json(formatExpense(populated));
    } catch (err) {
      next(err);
    }
  }

  public static async reimburseExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { payment_account_id, reference_number } = req.body;
      const userId = (req as any).user?.id || (req as any).user?._id;

      if (!payment_account_id) {
        res.status(400).json({ detail: 'payment_account_id is required for reimbursement disbursement.' });
        return;
      }

      const expense = await ExpenseEngine.reimburseExpenseClaim(id, payment_account_id, reference_number, userId);
      const populated = await Expense.findById(expense._id)
        .populate('category_id')
        .populate('expense_account_id')
        .populate('payment_account_id')
        .populate('user_id', 'full_name name email first_name last_name');

      res.json(formatExpense(populated));
    } catch (err) {
      next(err);
    }
  }

  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entityId = req.query.entity_id || (req as any).currentEntityId || (req as any).user?.default_entity_id;
      if (!entityId) {
        res.json({
          total_expenses_month: 0,
          pending_approvals_count: 0,
          reimbursable_claims_total: 0,
          posted_expenses_total: 0,
        });
        return;
      }

      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const allEntityExpenses = await Expense.find({ entity_id: entityId });

      let totalExpensesMonth = 0;
      let pendingApprovalsCount = 0;
      let reimbursableClaimsTotal = 0;
      let postedExpensesTotal = 0;

      allEntityExpenses.forEach((e) => {
        const amt = fromDecimal(e.total_amount);
        if (e.expense_date && new Date(e.expense_date) >= monthStart) {
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
