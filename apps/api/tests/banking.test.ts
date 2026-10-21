import mongoose from 'mongoose';
import { BankingEngine } from '../src/services/banking.engine';
import { BankAccountType, BankTxType, BankTxStatus, ReconciliationStatus } from '@ricozbooks/shared';
import { BankAccount, BankTransaction, BankReconciliation, BankStatementLine } from '../src/models/Banking';
import { Account } from '../src/models/Account';
import { toDecimal } from '../src/utils/decimal';

describe('Banking & Reconciliation Engine', () => {
  const dummyEntity = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();
  const dummyBankAccount = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createBankAccount', () => {
    it('should link bank account to GL account and record opening balance', async () => {
      jest.spyOn(Account, 'findOne').mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        code: '1100',
        name: 'Bank Account GL',
      } as any);

      let createdBankDoc: any = null;
      jest.spyOn(BankAccount, 'create').mockImplementationOnce(async (doc: any) => {
        createdBankDoc = doc;
        return { ...doc, _id: dummyBankAccount } as any;
      });

      const bank = await BankingEngine.createBankAccount({
        entity_id: dummyEntity,
        bank_name: 'HDFC Bank',
        account_name: 'Main Operating Account',
        account_number: '50100234567890',
        opening_balance: 50000.00,
      });

      expect(createdBankDoc).toBeDefined();
      expect(createdBankDoc.bank_name).toBe('HDFC Bank');
      expect(createdBankDoc.opening_balance.toString()).toBe('50000.00');
      expect(createdBankDoc.current_balance.toString()).toBe('50000.00');
    });
  });

  describe('recordTransaction', () => {
    it('should correctly increment balance on credit/deposit and decrement on debit/withdrawal', async () => {
      const mockBankAccount = {
        _id: dummyBankAccount,
        current_balance: toDecimal(50000.00),
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
        amount: 15000.00,
        is_credit: true,
        description: 'Customer Payment Deposit',
      });

      expect(mockBankAccount.current_balance.toString()).toBe('65000.00'); // 50000 + 15000

      // 2. Outflow / Withdrawal of 5,000
      await BankingEngine.recordTransaction({
        bank_account_id: dummyBankAccount,
        transaction_type: BankTxType.WITHDRAWAL,
        transaction_date: new Date(),
        amount: 5000.00,
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
        current_balance: toDecimal(10000.00),
      };
      jest.spyOn(BankAccount, 'findById').mockResolvedValueOnce(mockBankAccount as any);

      let createdReconDoc: any = null;
      const dummyReconId = new mongoose.Types.ObjectId();
      jest.spyOn(BankReconciliation, 'create').mockImplementationOnce(async (doc: any) => {
        createdReconDoc = doc;
        return { ...doc, _id: dummyReconId } as any;
      });

      // Starting recon with statement balance 10,000 against book balance 10,000
      const recon = await BankingEngine.startReconciliation({
        bank_account_id: dummyBankAccount,
        statement_date: new Date('2026-10-31'),
        statement_balance: 10000.00,
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
        amount: toDecimal(1500.00),
        is_credit: true,
        is_matched: false,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(BankStatementLine, 'find').mockResolvedValueOnce([mockStatementLine] as any);

      const mockBookTx = {
        _id: new mongoose.Types.ObjectId(),
        amount: toDecimal(1500.00),
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
        difference: toDecimal(250.00), // difference of 250
      };
      jest.spyOn(BankReconciliation, 'findById').mockResolvedValueOnce(mockRecon as any);

      await expect(
        BankingEngine.finalizeReconciliation(mockRecon._id, dummyUser)
      ).rejects.toThrow(/unresolved difference/i);
    });

    it('should complete and lock reconciliation when difference is zero', async () => {
      const mockRecon = {
        _id: new mongoose.Types.ObjectId(),
        difference: toDecimal(0.00),
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
