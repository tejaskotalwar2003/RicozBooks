import mongoose from 'mongoose';
import { AccountingEngine } from '../src/services/accounting.engine';
import { JournalStatus, AccountType, NormalBalance } from '@ricozbooks/shared';
import { JournalEntry } from '../src/models/JournalEntry';
import { FiscalPeriod, ClosePeriod } from '../src/models/FiscalPeriod';
import { AuditService } from '../src/services/audit.service';

describe('AccountingEngine - Double-Entry Ledger Validation', () => {
  const dummyAcc1 = new mongoose.Types.ObjectId();
  const dummyAcc2 = new mongoose.Types.ObjectId();
  const dummyAcc3 = new mongoose.Types.ObjectId();
  const dummyEntity = new mongoose.Types.ObjectId();
  const dummyUser = new mongoose.Types.ObjectId();

  describe('validateJournalBalance', () => {
    it('should reject journal entries with fewer than 2 lines', () => {
      expect(() => {
        AccountingEngine.validateJournalBalance([
          { account_id: dummyAcc1, debit: 100, credit: 0 },
        ]);
      }).toThrow(/must have at least 2 lines/i);
    });

    it('should reject lines with negative debit or credit amounts', () => {
      expect(() => {
        AccountingEngine.validateJournalBalance([
          { account_id: dummyAcc1, debit: -50, credit: 0 },
          { account_id: dummyAcc2, debit: 0, credit: 50 },
        ]);
      }).toThrow(/negative amounts are not allowed/i);

      expect(() => {
        AccountingEngine.validateJournalBalance([
          { account_id: dummyAcc1, debit: 50, credit: 0 },
          { account_id: dummyAcc2, debit: 0, credit: -50 },
        ]);
      }).toThrow(/negative amounts are not allowed/i);
    });

    it('should reject a single line having both Debit and Credit amounts', () => {
      expect(() => {
        AccountingEngine.validateJournalBalance([
          { account_id: dummyAcc1, debit: 100, credit: 50 },
          { account_id: dummyAcc2, debit: 0, credit: 50 },
        ]);
      }).toThrow(/cannot have both debit and credit/i);
    });

    it('should reject lines with both zero Debit and zero Credit', () => {
      expect(() => {
        AccountingEngine.validateJournalBalance([
          { account_id: dummyAcc1, debit: 0, credit: 0 },
          { account_id: dummyAcc2, debit: 100, credit: 0 },
          { account_id: dummyAcc3, debit: 0, credit: 100 },
        ]);
      }).toThrow(/either debit or credit must be greater than zero/i);
    });

    it('should reject unbalanced journal entries (Debits != Credits)', () => {
      expect(() => {
        AccountingEngine.validateJournalBalance([
          { account_id: dummyAcc1, debit: 100, credit: 0 },
          { account_id: dummyAcc2, debit: 0, credit: 99.50 },
        ]);
      }).toThrow(/double-entry balance violation/i);
    });

    it('should reject entries with a zero total balance', () => {
      expect(() => {
        AccountingEngine.validateJournalBalance([
          { account_id: dummyAcc1, debit: 0, credit: 0 },
          { account_id: dummyAcc2, debit: 0, credit: 0 },
        ]);
      }).toThrow();
    });

    it('should accept balanced two-line journal entries', () => {
      const result = AccountingEngine.validateJournalBalance([
        { account_id: dummyAcc1, debit: 2500.50, credit: 0 },
        { account_id: dummyAcc2, debit: 0, credit: 2500.50 },
      ]);
      expect(result.totalDebit).toBe(2500.50);
      expect(result.totalCredit).toBe(2500.50);
    });

    it('should accept multi-line compound journal entries with precise balancing', () => {
      const result = AccountingEngine.validateJournalBalance([
        { account_id: dummyAcc1, debit: 1180.00, credit: 0, description: 'AR Customer' },
        { account_id: dummyAcc2, debit: 0, credit: 1000.00, description: 'Sales Revenue' },
        { account_id: dummyAcc3, debit: 0, credit: 90.00, description: 'CGST Output' },
        { account_id: dummyAcc3, debit: 0, credit: 90.00, description: 'SGST Output' },
      ]);
      expect(result.totalDebit).toBe(1180.00);
      expect(result.totalCredit).toBe(1180.00);
    });
  });

  describe('validatePeriodOpen', () => {
    it('should throw an error if the fiscal period is locked/closed', async () => {
      const testDate = new Date('2025-03-15');
      jest.spyOn(FiscalPeriod, 'findOne').mockResolvedValueOnce({
        name: 'FY 2024-25 Q4',
        is_closed: true,
      } as any);

      await expect(
        AccountingEngine.validatePeriodOpen(dummyEntity, testDate)
      ).rejects.toThrow(/permanently closed/i);
    });

    it('should throw an error if the management close period is locked', async () => {
      const testDate = new Date('2026-09-15');
      jest.spyOn(FiscalPeriod, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(ClosePeriod, 'findOne').mockResolvedValueOnce({
        period_name: 'September 2026 Close',
        status: 'CLOSED',
      } as any);

      await expect(
        AccountingEngine.validatePeriodOpen(dummyEntity, testDate)
      ).rejects.toThrow(/locked and closed by management/i);
    });

    it('should succeed when period is open', async () => {
      const testDate = new Date('2026-10-15');
      jest.spyOn(FiscalPeriod, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(ClosePeriod, 'findOne').mockResolvedValueOnce(null);

      await expect(
        AccountingEngine.validatePeriodOpen(dummyEntity, testDate)
      ).resolves.not.toThrow();
    });
  });

  describe('Journal Entry Lifecycle & Workflow Verification', () => {
    beforeEach(() => {
      jest.spyOn(AuditService, 'log').mockResolvedValue();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('rejectJournalEntry should enforce mandatory reason', async () => {
      await expect(
        AccountingEngine.rejectJournalEntry(new mongoose.Types.ObjectId(), dummyUser, '')
      ).rejects.toThrow(/mandatory when rejecting a journal entry/i);
    });

    it('reopenJournalEntry should forbid reopening POSTED entries', async () => {
      const mockJournal = {
        _id: new mongoose.Types.ObjectId(),
        status: JournalStatus.POSTED,
        lines: [
          { account_id: dummyAcc1, debit: 100, credit: 0 },
          { account_id: dummyAcc2, debit: 0, credit: 100 },
        ],
      };
      jest.spyOn(JournalEntry, 'findById').mockResolvedValueOnce(mockJournal as any);

      await expect(
        AccountingEngine.reopenJournalEntry(mockJournal._id, dummyUser, 'Need correction')
      ).rejects.toThrow(/posted journal entries cannot be reopened/i);
    });

    it('postJournalToLedger should enforce APPROVED status for non-admin users', async () => {
      const mockJournal = {
        _id: new mongoose.Types.ObjectId(),
        status: JournalStatus.DRAFT,
        lines: [
          { account_id: dummyAcc1, debit: 100, credit: 0 },
          { account_id: dummyAcc2, debit: 0, credit: 100 },
        ],
      };
      jest.spyOn(JournalEntry, 'findById').mockResolvedValueOnce(mockJournal as any);

      await expect(
        AccountingEngine.postJournalToLedger(mockJournal._id, dummyUser, false)
      ).rejects.toThrow(/must be approved first/i);
    });

    it('reversePostedJournal should invert debits and credits and mark original as REVERSED', async () => {
      const origId = new mongoose.Types.ObjectId();
      const mockOriginal = {
        _id: origId,
        entity_id: dummyEntity,
        entry_number: 'JE-2026-0001',
        status: JournalStatus.POSTED,
        currency: 'INR',
        exchange_rate: 1.0,
        total_debit: 500,
        total_credit: 500,
        lines: [
          { account_id: dummyAcc1, debit: 500, credit: 0, description: 'Debit Line' },
          { account_id: dummyAcc2, debit: 0, credit: 500, description: 'Credit Line' },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(JournalEntry, 'findById').mockResolvedValueOnce(mockOriginal as any);
      jest.spyOn(FiscalPeriod, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(ClosePeriod, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(JournalEntry, 'countDocuments').mockResolvedValueOnce(0);
      jest.spyOn(JournalEntry, 'findOne').mockResolvedValueOnce(null);

      const mockCreatedReversal = {
        _id: new mongoose.Types.ObjectId(),
        entry_number: 'REV-2026-0001',
        status: JournalStatus.POSTED,
        total_debit: 500,
        total_credit: 500,
        reversal_of_entry_id: origId,
      };
      jest.spyOn(JournalEntry, 'create').mockResolvedValueOnce(mockCreatedReversal as any);

      const rev = await AccountingEngine.reversePostedJournal(origId, dummyUser, 'Test Correction');

      expect(rev.entry_number).toBe('REV-2026-0001');
      expect(mockOriginal.status).toBe(JournalStatus.REVERSED);
      expect(mockOriginal.save).toHaveBeenCalled();
    });
  });
});

