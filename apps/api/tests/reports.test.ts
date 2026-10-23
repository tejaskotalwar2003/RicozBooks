import mongoose from 'mongoose';
import { ReportingEngine } from '../src/services/reporting.engine';
import { Account } from '../src/models/Account';
import { JournalEntry } from '../src/models/JournalEntry';
import { Entity } from '../src/models/Organization';
import { AccountType, NormalBalance } from '@ricozbooks/shared';

describe('ReportingEngine - Financial Accuracy & Mathematical Equations', () => {
  const dummyEntityId = new mongoose.Types.ObjectId();
  const dummyCashId = new mongoose.Types.ObjectId();
  const dummyArId = new mongoose.Types.ObjectId();
  const dummyApId = new mongoose.Types.ObjectId();
  const dummyCapitalId = new mongoose.Types.ObjectId();
  const dummyRevenueId = new mongoose.Types.ObjectId();
  const dummyCogsId = new mongoose.Types.ObjectId();
  const dummyRentId = new mongoose.Types.ObjectId();

  const originalFindById = Entity.findById;
  const originalAccountFind = Account.find;
  const originalAggregate = JournalEntry.aggregate;

  beforeAll(() => {
    (Entity as any).findById = jest.fn().mockImplementation(async (id: any) => {
      if (String(id) === String(dummyEntityId)) {
        return {
          _id: dummyEntityId,
          name: 'Test Operating Entity',
          currency: 'INR',
        };
      }
      return null;
    });

    (Account as any).find = jest.fn().mockImplementation((filter: any) => {
      const allAccounts = [
        { _id: dummyCashId, code: '1000', name: 'Cash', account_type: AccountType.ASSET, normal_balance: NormalBalance.DEBIT, is_active: true },
        { _id: dummyArId, code: '1200', name: 'AR', account_type: AccountType.ASSET, normal_balance: NormalBalance.DEBIT, is_active: true },
        { _id: dummyApId, code: '2000', name: 'AP', account_type: AccountType.LIABILITY, normal_balance: NormalBalance.CREDIT, is_active: true },
        { _id: dummyCapitalId, code: '3000', name: 'Share Capital', account_type: AccountType.EQUITY, normal_balance: NormalBalance.CREDIT, is_active: true },
        { _id: dummyRevenueId, code: '4000', name: 'Sales Revenue', account_type: AccountType.REVENUE, normal_balance: NormalBalance.CREDIT, is_active: true },
        { _id: dummyCogsId, code: '5700', name: 'Cost of Goods Sold (COGS)', account_type: AccountType.EXPENSE, normal_balance: NormalBalance.DEBIT, is_active: true },
        { _id: dummyRentId, code: '5100', name: 'Rent Expense', account_type: AccountType.EXPENSE, normal_balance: NormalBalance.DEBIT, is_active: true },
      ];

      let filtered = allAccounts;
      if (filter?.account_type?.$in) {
        filtered = filtered.filter((a) => filter.account_type.$in.includes(a.account_type));
      }

      return {
        sort: () => Promise.resolve(filtered),
      };
    });
  });

  afterAll(() => {
    (Entity as any).findById = originalFindById;
    (Account as any).find = originalAccountFind;
    (JournalEntry as any).aggregate = originalAggregate;
  });

  describe('Trial Balance Engine', () => {
    it('should generate a balanced trial balance where total debit equals total credit', async () => {
      let callCount = 0;
      (JournalEntry as any).aggregate = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Opening balance before start date (0)
          return [];
        }
        // Period balance
        return [
          { _id: dummyCashId, total_dr: 1000, total_cr: 0 },
          { _id: dummyArId, total_dr: 500, total_cr: 0 },
          { _id: dummyApId, total_dr: 0, total_cr: 300 },
          { _id: dummyCapitalId, total_dr: 0, total_cr: 1000 },
          { _id: dummyRevenueId, total_dr: 0, total_cr: 500 },
          { _id: dummyCogsId, total_dr: 200, total_cr: 0 },
          { _id: dummyRentId, total_dr: 100, total_cr: 0 },
        ];
      });

      const tb = await ReportingEngine.generateTrialBalance(
        String(dummyEntityId),
        new Date('2026-04-01'),
        new Date('2026-09-30'),
        false
      );

      expect(tb.entity_name).toBe('Test Operating Entity');
      expect(tb.is_balanced).toBe(true);
      expect(tb.difference).toBe(0);
      expect(tb.total_closing_debit).toBe(1800);
      expect(tb.total_closing_credit).toBe(1800);
      expect(tb.items.length).toBe(7);
    });
  });

  describe('Profit & Loss Statement', () => {
    it('should calculate revenue, expenses, gross profit, and net profit correctly', async () => {
      (JournalEntry as any).aggregate = jest.fn().mockResolvedValue([
        { _id: dummyRevenueId, total_dr: 0, total_cr: 500 },
        { _id: dummyCogsId, total_dr: 200, total_cr: 0 },
        { _id: dummyRentId, total_dr: 100, total_cr: 0 },
      ]);

      const pl = await ReportingEngine.generateProfitAndLoss(
        String(dummyEntityId),
        new Date('2026-04-01'),
        new Date('2026-09-30'),
        false
      );

      expect(pl.total_revenue).toBe(500);
      expect(pl.total_expense).toBe(300);
      expect(pl.gross_profit).toBe(300);
      expect(pl.net_profit_loss).toBe(200);
      expect(pl.net_margin_pct).toBe(40);
    });
  });

  describe('Balance Sheet Equation', () => {
    it('should strictly satisfy: Total Assets = Total Liabilities + Total Equity', async () => {
      (JournalEntry as any).aggregate = jest.fn().mockResolvedValue([
        { _id: dummyCashId, total_dr: 1000, total_cr: 0 },
        { _id: dummyArId, total_dr: 500, total_cr: 0 },
        { _id: dummyApId, total_dr: 0, total_cr: 300 },
        { _id: dummyCapitalId, total_dr: 0, total_cr: 1000 },
        { _id: dummyRevenueId, total_dr: 0, total_cr: 500 },
        { _id: dummyCogsId, total_dr: 200, total_cr: 0 },
        { _id: dummyRentId, total_dr: 100, total_cr: 0 },
      ]);

      const bs = await ReportingEngine.generateBalanceSheet(
        String(dummyEntityId),
        new Date('2026-09-30'),
        false
      );

      expect(bs.total_assets).toBe(1500);
      expect(bs.total_liabilities).toBe(300);
      expect(bs.total_equity_before_earnings).toBe(1000);
      expect(bs.current_period_earnings).toBe(200);
      expect(bs.total_equity).toBe(1200);
      expect(bs.total_liabilities_and_equity).toBe(1500);
      expect(bs.is_balanced).toBe(true);
      expect(bs.difference).toBe(0);
    });
  });
});
