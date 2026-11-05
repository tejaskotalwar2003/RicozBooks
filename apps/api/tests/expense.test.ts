import mongoose from 'mongoose';
import { ExpenseEngine } from '../src/services/expense.engine';
import { AccountingEngine } from '../src/services/accounting.engine';
import { Expense, ExpenseCategory } from '../src/models/Expense';
import { Account } from '../src/models/Account';
import { AuditService } from '../src/services/audit.service';
import { AccountType, NormalBalance } from '@ricozbooks/shared';

describe('Expense & Claims Management Engine', () => {
  const dummyEntity = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();
  const dummyExpenseAccount = new mongoose.Types.ObjectId();
  const dummyPaymentAccount = new mongoose.Types.ObjectId();
  const dummyCategory = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.spyOn(AuditService, 'log').mockResolvedValue();
    jest.spyOn(AccountingEngine, 'validatePeriodOpen').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateExpenseNumber', () => {
    it('should generate EXP-00001 for first expense', async () => {
      jest.spyOn(Expense, 'countDocuments').mockResolvedValueOnce(0);
      const num = await ExpenseEngine.generateExpenseNumber(dummyEntity);
      expect(num).toBe('EXP-00001');
    });

    it('should increment expense number sequentially', async () => {
      jest.spyOn(Expense, 'countDocuments').mockResolvedValueOnce(42);
      const num = await ExpenseEngine.generateExpenseNumber(dummyEntity);
      expect(num).toBe('EXP-00043');
    });
  });

  describe('postExpenseToGL - Double-Entry Ledger Posting', () => {
    it('should generate balanced journal lines for direct expense with GST input credit', async () => {
      const expenseId = new mongoose.Types.ObjectId();
      const mockExpense = {
        _id: expenseId,
        entity_id: dummyEntity,
        expense_number: 'EXP-00001',
        title: 'Cloud Infrastructure Hosting',
        subtotal: 10000,
        tax_amount: 1800,
        total_amount: 11800,
        currency: 'INR',
        expense_date: new Date(),
        expense_account_id: dummyExpenseAccount,
        payment_account_id: dummyPaymentAccount,
        is_reimbursable: false,
        journal_entry_id: null,
        status: 'APPROVED',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Expense, 'findById').mockResolvedValueOnce(mockExpense as any);

      const itcAccountId = new mongoose.Types.ObjectId();
      jest.spyOn(AccountingEngine, 'getOrCreateAccount').mockResolvedValueOnce({
        _id: itcAccountId,
        code: '1400',
        name: 'Input GST Tax Credit',
      } as any);

      let createdJournal: any = null;
      jest.spyOn(AccountingEngine, 'createJournalEntry').mockImplementationOnce(async (payload: any) => {
        createdJournal = payload;
        return { _id: new mongoose.Types.ObjectId(), ...payload } as any;
      });

      jest.spyOn(AccountingEngine, 'postJournalToLedger').mockResolvedValueOnce({} as any);

      const result = await ExpenseEngine.postExpenseToGL(expenseId, dummyUser);

      expect(createdJournal).toBeDefined();
      expect(createdJournal.lines).toHaveLength(3);

      // Debit line 1: Expense account = 10000
      expect(createdJournal.lines[0].account_id).toEqual(dummyExpenseAccount);
      expect(createdJournal.lines[0].debit).toBe(10000);
      expect(createdJournal.lines[0].credit).toBe(0);

      // Debit line 2: Input GST = 1800
      expect(createdJournal.lines[1].account_id).toEqual(itcAccountId);
      expect(createdJournal.lines[1].debit).toBe(1800);
      expect(createdJournal.lines[1].credit).toBe(0);

      // Credit line 3: Payment account = 11800
      expect(createdJournal.lines[2].account_id).toEqual(dummyPaymentAccount);
      expect(createdJournal.lines[2].debit).toBe(0);
      expect(createdJournal.lines[2].credit).toBe(11800);

      // Double-entry validation: Total Debits == Total Credits
      const totalDebits = createdJournal.lines.reduce((s: number, l: any) => s + l.debit, 0);
      const totalCredits = createdJournal.lines.reduce((s: number, l: any) => s + l.credit, 0);
      expect(totalDebits).toBe(11800);
      expect(totalCredits).toBe(11800);
      expect(totalDebits).toBe(totalCredits);

      expect(result.status).toBe('POSTED');
      expect(mockExpense.save).toHaveBeenCalled();
    });

    it('should credit Employee Reimbursements Payable for reimbursable claim', async () => {
      const expenseId = new mongoose.Types.ObjectId();
      const mockExpense = {
        _id: expenseId,
        entity_id: dummyEntity,
        expense_number: 'EXP-00002',
        title: 'Team Client Lunch Claim',
        subtotal: 2500,
        tax_amount: 125,
        total_amount: 2625,
        currency: 'INR',
        expense_date: new Date(),
        expense_account_id: dummyExpenseAccount,
        is_reimbursable: true,
        journal_entry_id: null,
        status: 'APPROVED',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Expense, 'findById').mockResolvedValueOnce(mockExpense as any);

      const itcAccountId = new mongoose.Types.ObjectId();
      const reimbPayableId = new mongoose.Types.ObjectId();

      jest.spyOn(AccountingEngine, 'getOrCreateAccount')
        .mockResolvedValueOnce({ _id: itcAccountId, code: '1400' } as any)
        .mockResolvedValueOnce({ _id: reimbPayableId, code: '2150' } as any);

      let createdJournal: any = null;
      jest.spyOn(AccountingEngine, 'createJournalEntry').mockImplementationOnce(async (payload: any) => {
        createdJournal = payload;
        return { _id: new mongoose.Types.ObjectId(), ...payload } as any;
      });

      jest.spyOn(AccountingEngine, 'postJournalToLedger').mockResolvedValueOnce({} as any);

      const result = await ExpenseEngine.postExpenseToGL(expenseId, dummyUser);

      expect(createdJournal.lines[2].account_id).toEqual(reimbPayableId);
      expect(createdJournal.lines[2].credit).toBe(2625);
      expect(result.status).toBe('POSTED');
    });

    it('should reject posting if expense is already posted', async () => {
      const expenseId = new mongoose.Types.ObjectId();
      const mockExpense = {
        _id: expenseId,
        expense_number: 'EXP-00003',
        journal_entry_id: new mongoose.Types.ObjectId(),
      };

      jest.spyOn(Expense, 'findById').mockResolvedValueOnce(mockExpense as any);

      await expect(ExpenseEngine.postExpenseToGL(expenseId, dummyUser)).rejects.toThrow(
        /already posted to the General Ledger/i
      );
    });
  });

  describe('reimburseExpenseClaim - Employee Settlement Workflow', () => {
    it('should settle reimbursable claim and post disbursement journal to GL', async () => {
      const expenseId = new mongoose.Types.ObjectId();
      const mockExpense = {
        _id: expenseId,
        entity_id: dummyEntity,
        expense_number: 'EXP-00004',
        title: 'Taxi & Travel Reimbursement',
        total_amount: 1500,
        currency: 'INR',
        is_reimbursable: true,
        status: 'POSTED',
        reimbursement_journal_id: null,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Expense, 'findById').mockResolvedValueOnce(mockExpense as any);

      const reimbPayableId = new mongoose.Types.ObjectId();
      jest.spyOn(AccountingEngine, 'getOrCreateAccount').mockResolvedValueOnce({
        _id: reimbPayableId,
        code: '2150',
      } as any);

      let disbJournal: any = null;
      jest.spyOn(AccountingEngine, 'createJournalEntry').mockImplementationOnce(async (p: any) => {
        disbJournal = p;
        return { _id: new mongoose.Types.ObjectId(), ...p } as any;
      });

      jest.spyOn(AccountingEngine, 'postJournalToLedger').mockResolvedValueOnce({} as any);

      const bankPaymentAccount = new mongoose.Types.ObjectId();
      const res = await ExpenseEngine.reimburseExpenseClaim(expenseId, bankPaymentAccount, 'UTR-12345', dummyUser);

      expect(disbJournal).toBeDefined();
      expect(disbJournal.lines).toHaveLength(2);
      // Dr Reimbursable Payable
      expect(disbJournal.lines[0].account_id).toEqual(reimbPayableId);
      expect(disbJournal.lines[0].debit).toBe(1500);
      expect(disbJournal.lines[0].credit).toBe(0);
      // Cr Bank Account
      expect(disbJournal.lines[1].account_id).toEqual(bankPaymentAccount);
      expect(disbJournal.lines[1].debit).toBe(0);
      expect(disbJournal.lines[1].credit).toBe(1500);

      expect(res.status).toBe('PAID');
      expect(mockExpense.save).toHaveBeenCalled();
    });

    it('should reject reimbursement if expense is not reimbursable', async () => {
      const expenseId = new mongoose.Types.ObjectId();
      jest.spyOn(Expense, 'findById').mockResolvedValueOnce({
        _id: expenseId,
        is_reimbursable: false,
      } as any);

      await expect(
        ExpenseEngine.reimburseExpenseClaim(expenseId, dummyPaymentAccount, 'UTR-0', dummyUser)
      ).rejects.toThrow(/not marked as reimbursable/i);
    });

    it('should reject reimbursement if already paid', async () => {
      const expenseId = new mongoose.Types.ObjectId();
      jest.spyOn(Expense, 'findById').mockResolvedValueOnce({
        _id: expenseId,
        is_reimbursable: true,
        status: 'PAID',
      } as any);

      await expect(
        ExpenseEngine.reimburseExpenseClaim(expenseId, dummyPaymentAccount, 'UTR-0', dummyUser)
      ).rejects.toThrow(/already been reimbursed/i);
    });
  });

  describe('initializeStandardCategories', () => {
    it('should initialize 9 standard canonical categories when empty', async () => {
      jest.spyOn(ExpenseCategory, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(AccountingEngine, 'getOrCreateAccount').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
      } as any);

      const createdCats: any[] = [];
      jest.spyOn(ExpenseCategory, 'create').mockImplementation(async (doc: any) => {
        createdCats.push(doc);
        return doc as any;
      });

      await ExpenseEngine.initializeStandardCategories(dummyEntity);

      expect(createdCats).toHaveLength(9);
      const codes = createdCats.map(c => c.code);
      expect(codes).toContain('RENT');
      expect(codes).toContain('SALARY');
      expect(codes).toContain('TRAVEL');
      expect(codes).toContain('IT_CLOUD');
      expect(codes).toContain('SUPPLIES');
      expect(codes).toContain('MARKETING');
      expect(codes).toContain('UTILITIES');
      expect(codes).toContain('PROFESSIONAL');
      expect(codes).toContain('GENERAL');
    });

    it('should skip category creation if categories already exist', async () => {
      jest.spyOn(ExpenseCategory, 'countDocuments').mockResolvedValueOnce(5);
      const createSpy = jest.spyOn(ExpenseCategory, 'create');

      await ExpenseEngine.initializeStandardCategories(dummyEntity);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
