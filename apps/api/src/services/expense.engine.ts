import mongoose from 'mongoose';
import { Expense, IExpense } from '../models/Expense';
import { Account } from '../models/Account';
import { AccountingEngine } from './accounting.engine';
import { AccountType, NormalBalance, JournalStatus } from '@ricozbooks/shared';

export class ExpenseEngine {
  public static async generateExpenseNumber(entityId: mongoose.Types.ObjectId | string): Promise<string> {
    const count = await Expense.countDocuments({ entity_id: entityId });
    const num = (count + 1).toString().padStart(5, '0');
    return `EXP-${num}`;
  }

  public static async postExpenseToGL(expenseId: string | mongoose.Types.ObjectId, userId: string | mongoose.Types.ObjectId): Promise<IExpense> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      const err = new Error('Expense record not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (expense.journal_entry_id) {
      const err = new Error(`Expense #${expense.expense_number} is already posted to the General Ledger.`);
      (err as any).statusCode = 400;
      throw err;
    }

    await AccountingEngine.validatePeriodOpen(expense.entity_id, expense.expense_date);

    const subtotal = Number(expense.subtotal?.toString() || 0);
    const taxAmt = Number(expense.tax_amount?.toString() || 0);
    const totalAmt = Number(expense.total_amount?.toString() || (subtotal + taxAmt));

    const lines: Array<{
      account_id: mongoose.Types.ObjectId | string;
      debit: number;
      credit: number;
      description: string;
    }> = [];

    // Line 1: Dr Expense Account
    lines.push({
      account_id: expense.expense_account_id,
      debit: subtotal,
      credit: 0,
      description: `Expense: ${expense.title}`,
    });

    // Line 2: Dr Input GST (if tax > 0)
    if (taxAmt > 0) {
      const itcAccount = await AccountingEngine.getOrCreateAccount(
        expense.entity_id,
        '1400',
        'Input GST Tax Credit',
        AccountType.ASSET,
        NormalBalance.DEBIT,
        'Input tax credit on business expenses'
      );
      lines.push({
        account_id: itcAccount._id,
        debit: taxAmt,
        credit: 0,
        description: `Input GST on Expense #${expense.expense_number}`,
      });
    }

    // Line 3: Credit Line
    if (expense.is_reimbursable) {
      const reimbPayable = await AccountingEngine.getOrCreateAccount(
        expense.entity_id,
        '2150',
        'Employee Reimbursements Payable',
        AccountType.LIABILITY,
        NormalBalance.CREDIT,
        'Accrued employee claims pending disbursement'
      );
      lines.push({
        account_id: reimbPayable._id,
        debit: 0,
        credit: totalAmt,
        description: `Employee claim payable: ${expense.title}`,
      });
    } else {
      let creditAccountId = expense.payment_account_id;
      if (!creditAccountId) {
        const cashAcct = await AccountingEngine.getOrCreateAccount(
          expense.entity_id,
          '1010',
          'Operating Bank / Cash Account',
          AccountType.ASSET,
          NormalBalance.DEBIT,
          'Primary cash/bank account'
        );
        creditAccountId = cashAcct._id;
      }
      lines.push({
        account_id: creditAccountId,
        debit: 0,
        credit: totalAmt,
        description: `Payment for Expense #${expense.expense_number}`,
      });
    }

    const journal = await AccountingEngine.createJournalEntry({
      entity_id: expense.entity_id,
      entry_date: expense.expense_date,
      memo: `GL Post for Expense #${expense.expense_number} - ${expense.title}`,
      reference: expense.expense_number,
      currency: expense.currency || 'INR',
      created_by_user_id: userId,
      lines,
    });

    // Directly post the journal entry
    await AccountingEngine.postJournalToLedger(journal._id, userId, true);

    expense.journal_entry_id = journal._id;
    expense.status = expense.is_reimbursable ? 'APPROVED' : 'POSTED';
    await expense.save();

    return expense;
  }

  public static async reimburseExpenseClaim(
    expenseId: string | mongoose.Types.ObjectId,
    paymentAccountId: string | mongoose.Types.ObjectId,
    referenceNumber: string | undefined,
    userId: string | mongoose.Types.ObjectId
  ): Promise<IExpense> {
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      const err = new Error('Expense not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (!expense.is_reimbursable) {
      const err = new Error('Expense is not marked as reimbursable.');
      (err as any).statusCode = 400;
      throw err;
    }

    if (expense.status === 'PAID') {
      const err = new Error('Expense has already been reimbursed.');
      (err as any).statusCode = 400;
      throw err;
    }

    const totalAmt = Number(expense.total_amount?.toString() || 0);

    const reimbPayable = await AccountingEngine.getOrCreateAccount(
      expense.entity_id,
      '2150',
      'Employee Reimbursements Payable',
      AccountType.LIABILITY,
      NormalBalance.CREDIT,
      'Accrued employee claims pending disbursement'
    );

    const lines = [
      {
        account_id: reimbPayable._id,
        debit: totalAmt,
        credit: 0,
        description: `Settlement of claim #${expense.expense_number}`,
      },
      {
        account_id: paymentAccountId,
        debit: 0,
        credit: totalAmt,
        description: `Disbursement for claim #${expense.expense_number} (${referenceNumber || 'N/A'})`,
      },
    ];

    const journal = await AccountingEngine.createJournalEntry({
      entity_id: expense.entity_id,
      entry_date: new Date(),
      memo: `Reimbursement disbursement for claim #${expense.expense_number}`,
      reference: referenceNumber || expense.expense_number,
      currency: expense.currency || 'INR',
      created_by_user_id: userId,
      lines,
    });

    await AccountingEngine.postJournalToLedger(journal._id, userId, true);

    expense.reimbursement_journal_id = journal._id;
    expense.status = 'PAID';
    await expense.save();

    return expense;
  }
}
