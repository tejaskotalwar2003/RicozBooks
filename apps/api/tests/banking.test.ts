import mongoose from 'mongoose';
import { BankingEngine } from '../src/services/banking.engine';
import { BankAccount, BankTransaction, BankReconciliation, BankStatementLine, BankTransfer } from '../src/models/Banking';
import { Account } from '../src/models/Account';
import { JournalEntry } from '../src/models/JournalEntry';
import { FiscalPeriod, ClosePeriod } from '../src/models/FiscalPeriod';
import { BankTxType, BankTxStatus, ReconciliationStatus, AccountType } from '@ricozbooks/shared';
import { toDecimal } from '../src/utils/decimal';

describe('Banking & Reconciliation Engine', () => {
  const dummyEntity = new mongoose.Types.ObjectId();
  const otherEntity = new mongoose.Types.ObjectId();
  const dummyBankAccount = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();
  const dummyGlAssetId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createBankAccount', () => {
    it('should link bank account to eligible GL asset account and record opening balance', async () => {
      jest.spyOn(Account, 'findById').mockResolvedValueOnce({
        _id: dummyGlAssetId,
        entity_id: dummyEntity,
        code: '1100',
        name: 'Operating Bank Account',
        account_type: AccountType.ASSET,
        is_active: true,
        currency: 'INR',
      } as any);

      jest.spyOn(BankAccount, 'findOne').mockResolvedValueOnce(null);
      const dummyRetainedEarningsId = new mongoose.Types.ObjectId();
      jest.spyOn(Account, 'findOne').mockResolvedValueOnce({
        _id: dummyRetainedEarningsId,
        entity_id: dummyEntity,
        code: '3100',
        name: 'Retained Earnings',
        account_type: AccountType.EQUITY,
        is_active: true,
      } as any);
      jest.spyOn(Account, 'find').mockResolvedValue([
        { _id: dummyGlAssetId, entity_id: dummyEntity, code: '1100', is_active: true }
      ] as any);
      jest.spyOn(FiscalPeriod, 'findOne').mockResolvedValue(null);
      jest.spyOn(ClosePeriod, 'findOne').mockResolvedValue(null);
      jest.spyOn(JournalEntry, 'findOne').mockResolvedValue(null);
      jest.spyOn(JournalEntry, 'countDocuments').mockResolvedValue(0 as any);
      jest.spyOn(JournalEntry, 'create').mockImplementationOnce(async (doc: any) => ({
        ...doc,
        _id: new mongoose.Types.ObjectId(),
      }) as any);

      let createdBankDoc: any = null;
      jest.spyOn(BankAccount, 'create').mockImplementationOnce(async (doc: any) => {
        createdBankDoc = doc;
        return { ...doc, _id: dummyBankAccount } as any;
      });

      jest.spyOn(BankTransaction, 'create').mockImplementationOnce(async (doc: any) => ({
        ...doc,
        _id: new mongoose.Types.ObjectId(),
      }) as any);

      const bank = await BankingEngine.createBankAccount({
        entity_id: dummyEntity,
        bank_name: 'HDFC Bank',
        account_name: 'Main Operating Account',
        account_number: '50100234567890',
        gl_account_id: dummyGlAssetId,
        opening_balance: 50000.0,
      });

      expect(createdBankDoc).toBeDefined();
      expect(createdBankDoc.bank_name).toBe('HDFC Bank');
      expect(createdBankDoc.gl_account_id.toString()).toBe(dummyGlAssetId.toString());
      expect(createdBankDoc.opening_balance.toString()).toBe('50000.00');
      expect(createdBankDoc.current_balance.toString()).toBe('50000.00');
    });

    it('should reject creation if linked GL account is missing', async () => {
      await expect(
        BankingEngine.createBankAccount({
          entity_id: dummyEntity,
          bank_name: 'HDFC Bank',
          account_name: 'Main Operating Account',
          account_number: '50100234567890',
        })
      ).rejects.toThrow(/mandatory/i);
    });

    it('should reject creation if linked GL account is an EXPENSE or LIABILITY account', async () => {
      const dummyExpenseGlId = new mongoose.Types.ObjectId();
      jest.spyOn(Account, 'findById').mockResolvedValueOnce({
        _id: dummyExpenseGlId,
        entity_id: dummyEntity,
        code: '5100',
        name: 'Rent Expense',
        account_type: AccountType.EXPENSE,
        is_active: true,
      } as any);

      await expect(
        BankingEngine.createBankAccount({
          entity_id: dummyEntity,
          bank_name: 'HDFC Bank',
          account_name: 'Main Operating Account',
          account_number: '50100234567890',
          gl_account_id: dummyExpenseGlId,
        })
      ).rejects.toThrow(/Only ASSET accounts can be linked/i);
    });

    it('should reject creation if linked GL account belongs to another organization/entity', async () => {
      const foreignGlId = new mongoose.Types.ObjectId();
      jest.spyOn(Account, 'findById').mockResolvedValueOnce({
        _id: foreignGlId,
        entity_id: otherEntity,
        code: '1100',
        name: 'Foreign Bank GL',
        account_type: AccountType.ASSET,
        is_active: true,
      } as any);

      await expect(
        BankingEngine.createBankAccount({
          entity_id: dummyEntity,
          bank_name: 'HDFC Bank',
          account_name: 'Main Operating Account',
          account_number: '50100234567890',
          gl_account_id: foreignGlId,
        })
      ).rejects.toThrow(/does not belong to the active organization/i);
    });

    it('should reject creation if linked GL account is inactive', async () => {
      const inactiveGlId = new mongoose.Types.ObjectId();
      jest.spyOn(Account, 'findById').mockResolvedValueOnce({
        _id: inactiveGlId,
        entity_id: dummyEntity,
        code: '1100',
        name: 'Inactive Bank GL',
        account_type: AccountType.ASSET,
        is_active: false,
      } as any);

      await expect(
        BankingEngine.createBankAccount({
          entity_id: dummyEntity,
          bank_name: 'HDFC Bank',
          account_name: 'Main Operating Account',
          account_number: '50100234567890',
          gl_account_id: inactiveGlId,
        })
      ).rejects.toThrow(/inactive/i);
    });
  });

  describe('getBankingSummary', () => {
    it('should aggregate liquid cash and counts for entity', async () => {
      const mockAccounts = [
        {
          _id: new mongoose.Types.ObjectId(),
          bank_name: 'HDFC Bank',
          account_name: 'Operating Current',
          account_number: '12345',
          current_balance: toDecimal(75000.0),
          currency: 'INR',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          bank_name: 'SBI Bank',
          account_name: 'Treasury Current',
          account_number: '67890',
          current_balance: toDecimal(25000.0),
          currency: 'INR',
        },
      ];

      jest.spyOn(BankAccount, 'find').mockResolvedValueOnce(mockAccounts as any);
      jest.spyOn(BankTransaction, 'countDocuments').mockResolvedValueOnce(3 as any);

      const summary = await BankingEngine.getBankingSummary(dummyEntity);

      expect(summary.total_liquid_cash).toBe(100000.0);
      expect(summary.active_bank_accounts_count).toBe(2);
      expect(summary.unreconciled_transactions_count).toBe(3);
      expect(summary.accounts_summary.length).toBe(2);
    });
  });

  describe('createBankTransfer', () => {
    it('should reject transfer between same bank account', async () => {
      await expect(
        BankingEngine.createBankTransfer({
          entity_id: dummyEntity,
          from_bank_account_id: dummyBankAccount,
          to_bank_account_id: dummyBankAccount,
          transfer_date: new Date(),
          amount: 5000,
        })
      ).rejects.toThrow(/must be different/i);
    });

    it('should successfully execute transfer between different accounts', async () => {
      const toBankId = new mongoose.Types.ObjectId();
      const mockFromAcc = {
        _id: dummyBankAccount,
        entity_id: dummyEntity,
        bank_name: 'HDFC Bank',
        account_number: '1111',
        current_balance: toDecimal(50000.0),
        gl_account_id: dummyGlAssetId,
        currency: 'INR',
        save: jest.fn().mockResolvedValue(true),
      };
      const mockToAcc = {
        _id: toBankId,
        entity_id: dummyEntity,
        bank_name: 'ICICI Bank',
        account_number: '2222',
        current_balance: toDecimal(10000.0),
        gl_account_id: new mongoose.Types.ObjectId(),
        currency: 'INR',
        save: jest.fn().mockResolvedValue(true),
      };

      (jest.spyOn(BankAccount, 'findById') as any).mockImplementation(async (id: any) => {
        if (id.toString() === dummyBankAccount.toString()) return mockFromAcc as any;
        if (id.toString() === toBankId.toString()) return mockToAcc as any;
        return null;
      });

      jest.spyOn(Account, 'find').mockResolvedValue([
        { _id: dummyGlAssetId, entity_id: dummyEntity, code: '1100', is_active: true },
        { _id: mockToAcc.gl_account_id, entity_id: dummyEntity, code: '1101', is_active: true }
      ] as any);
      jest.spyOn(FiscalPeriod, 'findOne').mockResolvedValue(null);
      jest.spyOn(ClosePeriod, 'findOne').mockResolvedValue(null);
      jest.spyOn(JournalEntry, 'findOne').mockResolvedValue(null);
      jest.spyOn(JournalEntry, 'countDocuments').mockResolvedValue(0 as any);
      jest.spyOn(JournalEntry, 'create').mockImplementation(async (doc: any) => ({
        ...doc,
        _id: new mongoose.Types.ObjectId(),
      }) as any);
      jest.spyOn(BankTransaction, 'create').mockImplementation(async (doc: any) => ({ ...doc, _id: new mongoose.Types.ObjectId() }) as any);
      jest.spyOn(BankTransfer, 'create').mockImplementation(async (doc: any) => ({ ...doc, _id: new mongoose.Types.ObjectId() }) as any);

      const transfer = await BankingEngine.createBankTransfer({
        entity_id: dummyEntity,
        from_bank_account_id: dummyBankAccount,
        to_bank_account_id: toBankId,
        transfer_date: new Date(),
        amount: 15000,
        fee_amount: 10,
      });

      expect(transfer).toBeDefined();
      expect(mockFromAcc.current_balance.toString()).toBe('34990.00'); // 50000 - 15010
      expect(mockToAcc.current_balance.toString()).toBe('25000.00'); // 10000 + 15000
    });
  });

  describe('recordTransaction', () => {
    it('should correctly increment balance on credit/deposit and decrement on debit/withdrawal', async () => {
      const mockBankAccount = {
        _id: dummyBankAccount,
        current_balance: toDecimal(50000.0),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(BankAccount, 'findById').mockResolvedValue(mockBankAccount as any);
      jest.spyOn(BankTransaction, 'create').mockImplementation(async (doc: any) => ({
        ...doc,
        _id: new mongoose.Types.ObjectId(),
      }) as any);

      // 1. Inflow / Deposit of 15,000
      await BankingEngine.recordTransaction({
        bank_account_id: dummyBankAccount,
        transaction_type: BankTxType.DEPOSIT,
        transaction_date: new Date(),
        amount: 15000.0,
        is_credit: true,
        description: 'Customer Payment Deposit',
      });

      expect(mockBankAccount.current_balance.toString()).toBe('65000.00'); // 50000 + 15000

      // 2. Outflow / Withdrawal of 5,000
      await BankingEngine.recordTransaction({
        bank_account_id: dummyBankAccount,
        transaction_type: BankTxType.WITHDRAWAL,
        transaction_date: new Date(),
        amount: 5000.0,
        is_credit: false,
        description: 'Office Rent Payment',
      });

      expect(mockBankAccount.current_balance.toString()).toBe('60000.00'); // 65000 - 5000
    });
  });

  describe('startReconciliation & autoMatchTransactions', () => {
    it('should compute initial difference and auto-match matching statement lines', async () => {
      const mockBankAccount = {
        _id: dummyBankAccount,
        current_balance: toDecimal(10000.0),
      };
      jest.spyOn(BankAccount, 'findById').mockResolvedValueOnce(mockBankAccount as any);

      let createdReconDoc: any = null;
      const dummyReconId = new mongoose.Types.ObjectId();
      jest.spyOn(BankReconciliation, 'create').mockImplementationOnce(async (doc: any) => {
        createdReconDoc = doc;
        return { ...doc, _id: dummyReconId } as any;
      });

      // Starting recon with statement balance 10,000 against book balance 10,000
      await BankingEngine.startReconciliation({
        bank_account_id: dummyBankAccount,
        statement_date: new Date('2026-10-31'),
        statement_balance: 10000.0,
      });

      expect(createdReconDoc.difference.toString()).toBe('0.00');

      // Auto-match test
      const mockRecon = {
        _id: dummyReconId,
        bank_account_id: dummyBankAccount,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(BankReconciliation, 'findById').mockResolvedValueOnce(mockRecon as any);

      const mockStatementLine = {
        _id: new mongoose.Types.ObjectId(),
        amount: toDecimal(1500.0),
        is_credit: true,
        is_matched: false,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(BankStatementLine, 'find').mockResolvedValueOnce([mockStatementLine] as any);

      const mockBookTx = {
        _id: new mongoose.Types.ObjectId(),
        amount: toDecimal(1500.0),
        is_credit: true,
        status: BankTxStatus.UNRECONCILED,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(BankTransaction, 'find').mockResolvedValueOnce([mockBookTx] as any);

      const matchResult = await BankingEngine.autoMatchTransactions(dummyReconId);

      expect(matchResult.matchedCount).toBe(1);
      expect(matchResult.unmatchedCount).toBe(0);
      expect(mockStatementLine.is_matched).toBe(true);
      expect(mockBookTx.status).toBe(BankTxStatus.RECONCILED);
    });
  });

  describe('finalizeReconciliation', () => {
    it('should reject finalization if unresolved difference exists', async () => {
      const mockRecon = {
        _id: new mongoose.Types.ObjectId(),
        difference: toDecimal(250.0), // difference of 250
      };
      jest.spyOn(BankReconciliation, 'findById').mockResolvedValueOnce(mockRecon as any);

      await expect(
        BankingEngine.finalizeReconciliation(mockRecon._id, dummyUser)
      ).rejects.toThrow(/unresolved difference/i);
    });

    it('should complete and lock reconciliation when difference is zero', async () => {
      const mockRecon = {
        _id: new mongoose.Types.ObjectId(),
        difference: toDecimal(0.0),
        status: ReconciliationStatus.IN_PROGRESS,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(BankReconciliation, 'findById').mockResolvedValueOnce(mockRecon as any);

      const result = await BankingEngine.finalizeReconciliation(mockRecon._id, dummyUser);

      expect(result.status).toBe(ReconciliationStatus.COMPLETED);
      expect(mockRecon.save).toHaveBeenCalled();
    });
  });
});
