import mongoose from 'mongoose';
import { AccountType, JournalStatus, NormalBalance } from '@ricozbooks/shared';
import { Account, IAccount } from '../models/Account';
import { JournalEntry } from '../models/JournalEntry';
import { Entity, IEntity } from '../models/Organization';
import { quantizeAmount, isBalanced } from '../utils/decimal';

export interface TrialBalanceItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface TrialBalanceResponse {
  entity_id: string;
  entity_name: string;
  currency: string;
  start_date: string;
  end_date: string;
  include_unposted: boolean;
  items: TrialBalanceItem[];
  total_opening_debit: number;
  total_opening_credit: number;
  total_period_debit: number;
  total_period_credit: number;
  total_closing_debit: number;
  total_closing_credit: number;
  is_balanced: boolean;
  difference: number;
}

export interface ProfitLossAccountItem {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
  percentage_of_revenue: number;
}

export interface ProfitLossResponse {
  entity_id: string;
  entity_name: string;
  currency: string;
  start_date: string;
  end_date: string;
  include_unposted: boolean;
  revenue_accounts: ProfitLossAccountItem[];
  total_revenue: number;
  expense_accounts: ProfitLossAccountItem[];
  total_expense: number;
  gross_profit: number;
  net_profit_loss: number;
  net_margin_pct: number;
}

export interface BalanceSheetAccountItem {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
}

export interface BalanceSheetResponse {
  entity_id: string;
  entity_name: string;
  currency: string;
  as_of_date: string;
  include_unposted: boolean;
  asset_accounts: BalanceSheetAccountItem[];
  total_assets: number;
  liability_accounts: BalanceSheetAccountItem[];
  total_liabilities: number;
  equity_accounts: BalanceSheetAccountItem[];
  total_equity_before_earnings: number;
  current_period_earnings: number;
  total_equity: number;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
  difference: number;
}

export class ReportingEngine {
  private static getAllowedStatuses(includeUnposted: boolean): string[] {
    return includeUnposted
      ? [JournalStatus.POSTED, JournalStatus.APPROVED, JournalStatus.SUBMITTED]
      : [JournalStatus.POSTED];
  }

  public static async generateTrialBalance(
    entityId: string,
    startDate: Date,
    endDate: Date,
    includeUnposted: boolean = false
  ): Promise<TrialBalanceResponse> {
    const entity = await Entity.findById(entityId);
    if (!entity) {
      const err = new Error(`Entity with ID ${entityId} not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const accounts = await Account.find({
      entity_id: entity._id,
      is_active: true,
    }).sort({ code: 1 });

    const allowedStatuses = this.getAllowedStatuses(includeUnposted);

    // 1. Opening sums before start_date
    const openPipeline = [
      {
        $match: {
          entity_id: entity._id,
          entry_date: { $lt: startDate },
          status: { $in: allowedStatuses },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.account_id',
          total_dr: { $sum: '$lines.debit' },
          total_cr: { $sum: '$lines.credit' },
        },
      },
    ];
    const openResults = await JournalEntry.aggregate(openPipeline);
    const openMap = new Map<string, { dr: number; cr: number }>();
    openResults.forEach((r) => {
      openMap.set(String(r._id), {
        dr: Number(r.total_dr || 0),
        cr: Number(r.total_cr || 0),
      });
    });

    // 2. Period sums between start_date and end_date
    const periodPipeline = [
      {
        $match: {
          entity_id: entity._id,
          entry_date: { $gte: startDate, $lte: endDate },
          status: { $in: allowedStatuses },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.account_id',
          total_dr: { $sum: '$lines.debit' },
          total_cr: { $sum: '$lines.credit' },
        },
      },
    ];
    const periodResults = await JournalEntry.aggregate(periodPipeline);
    const periodMap = new Map<string, { dr: number; cr: number }>();
    periodResults.forEach((r) => {
      periodMap.set(String(r._id), {
        dr: Number(r.total_dr || 0),
        cr: Number(r.total_cr || 0),
      });
    });

    const items: TrialBalanceItem[] = [];
    let totOpenDr = 0;
    let totOpenCr = 0;
    let totPerDr = 0;
    let totPerCr = 0;
    let totCloseDr = 0;
    let totCloseCr = 0;

    for (const acc of accounts) {
      const accIdStr = String(acc._id);
      const open = openMap.get(accIdStr) || { dr: 0, cr: 0 };
      const period = periodMap.get(accIdStr) || { dr: 0, cr: 0 };

      let openDr = 0;
      let openCr = 0;
      let closeDr = 0;
      let closeCr = 0;

      if (acc.normal_balance === NormalBalance.DEBIT) {
        const netOpen = open.dr - open.cr;
        openDr = netOpen >= 0 ? netOpen : 0;
        openCr = netOpen < 0 ? Math.abs(netOpen) : 0;

        const closingSigned = (open.dr - open.cr) + (period.dr - period.cr);
        closeDr = closingSigned >= 0 ? closingSigned : 0;
        closeCr = closingSigned < 0 ? Math.abs(closingSigned) : 0;
      } else {
        const netOpen = open.cr - open.dr;
        openCr = netOpen >= 0 ? netOpen : 0;
        openDr = netOpen < 0 ? Math.abs(netOpen) : 0;

        const closingSigned = (open.cr - open.dr) + (period.cr - period.dr);
        closeCr = closingSigned >= 0 ? closingSigned : 0;
        closeDr = closingSigned < 0 ? Math.abs(closingSigned) : 0;
      }

      openDr = quantizeAmount(openDr);
      openCr = quantizeAmount(openCr);
      const perDr = quantizeAmount(period.dr);
      const perCr = quantizeAmount(period.cr);
      closeDr = quantizeAmount(closeDr);
      closeCr = quantizeAmount(closeCr);

      totOpenDr += openDr;
      totOpenCr += openCr;
      totPerDr += perDr;
      totPerCr += perCr;
      totCloseDr += closeDr;
      totCloseCr += closeCr;

      items.push({
        account_id: accIdStr,
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.account_type,
        normal_balance: acc.normal_balance,
        opening_debit: openDr,
        opening_credit: openCr,
        period_debit: perDr,
        period_credit: perCr,
        closing_debit: closeDr,
        closing_credit: closeCr,
      });
    }

    totOpenDr = quantizeAmount(totOpenDr);
    totOpenCr = quantizeAmount(totOpenCr);
    totPerDr = quantizeAmount(totPerDr);
    totPerCr = quantizeAmount(totPerCr);
    totCloseDr = quantizeAmount(totCloseDr);
    totCloseCr = quantizeAmount(totCloseCr);

    const diff = quantizeAmount(Math.abs(totCloseDr - totCloseCr));
    const balanced = isBalanced(totCloseDr, totCloseCr);

    return {
      entity_id: String(entity._id),
      entity_name: entity.name,
      currency: entity.currency,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      include_unposted: includeUnposted,
      items,
      total_opening_debit: totOpenDr,
      total_opening_credit: totOpenCr,
      total_period_debit: totPerDr,
      total_period_credit: totPerCr,
      total_closing_debit: totCloseDr,
      total_closing_credit: totCloseCr,
      is_balanced: balanced,
      difference: diff,
    };
  }

  public static async generateProfitAndLoss(
    entityId: string,
    startDate: Date,
    endDate: Date,
    includeUnposted: boolean = false
  ): Promise<ProfitLossResponse> {
    const entity = await Entity.findById(entityId);
    if (!entity) {
      const err = new Error(`Entity with ID ${entityId} not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const accounts = await Account.find({
      entity_id: entity._id,
      account_type: { $in: [AccountType.REVENUE, AccountType.EXPENSE] },
      is_active: true,
    }).sort({ code: 1 });

    const allowedStatuses = this.getAllowedStatuses(includeUnposted);

    const periodPipeline = [
      {
        $match: {
          entity_id: entity._id,
          entry_date: { $gte: startDate, $lte: endDate },
          status: { $in: allowedStatuses },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.account_id',
          total_dr: { $sum: '$lines.debit' },
          total_cr: { $sum: '$lines.credit' },
        },
      },
    ];
    const periodResults = await JournalEntry.aggregate(periodPipeline);
    const balanceMap = new Map<string, { dr: number; cr: number }>();
    periodResults.forEach((r) => {
      balanceMap.set(String(r._id), {
        dr: Number(r.total_dr || 0),
        cr: Number(r.total_cr || 0),
      });
    });

    const revenueAccounts: ProfitLossAccountItem[] = [];
    const expenseAccounts: ProfitLossAccountItem[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;
    let cogsExpense = 0;

    for (const acc of accounts) {
      const b = balanceMap.get(String(acc._id)) || { dr: 0, cr: 0 };
      if (acc.account_type === AccountType.REVENUE) {
        // Revenue is Credit normal
        const net = quantizeAmount(b.cr - b.dr);
        totalRevenue += net;
        revenueAccounts.push({
          account_id: String(acc._id),
          account_code: acc.code,
          account_name: acc.name,
          amount: net,
          percentage_of_revenue: 0,
        });
      } else if (acc.account_type === AccountType.EXPENSE) {
        // Expense is Debit normal
        const net = quantizeAmount(b.dr - b.cr);
        totalExpense += net;
        if (acc.code === '5700' || acc.name.toLowerCase().includes('cogs') || acc.name.toLowerCase().includes('cost of goods sold')) {
          cogsExpense += net;
        }
        expenseAccounts.push({
          account_id: String(acc._id),
          account_code: acc.code,
          account_name: acc.name,
          amount: net,
          percentage_of_revenue: 0,
        });
      }
    }

    totalRevenue = quantizeAmount(totalRevenue);
    totalExpense = quantizeAmount(totalExpense);
    cogsExpense = quantizeAmount(cogsExpense);

    // Compute percentages
    for (const r of revenueAccounts) {
      r.percentage_of_revenue = totalRevenue > 0 ? quantizeAmount((r.amount / totalRevenue) * 100) : 0;
    }
    for (const e of expenseAccounts) {
      e.percentage_of_revenue = totalRevenue > 0 ? quantizeAmount((e.amount / totalRevenue) * 100) : 0;
    }

    const grossProfit = quantizeAmount(totalRevenue - cogsExpense);
    const netProfitLoss = quantizeAmount(totalRevenue - totalExpense);
    const netMarginPct = totalRevenue > 0 ? quantizeAmount((netProfitLoss / totalRevenue) * 100) : 0;

    return {
      entity_id: String(entity._id),
      entity_name: entity.name,
      currency: entity.currency,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      include_unposted: includeUnposted,
      revenue_accounts: revenueAccounts,
      total_revenue: totalRevenue,
      expense_accounts: expenseAccounts,
      total_expense: totalExpense,
      gross_profit: grossProfit,
      net_profit_loss: netProfitLoss,
      net_margin_pct: netMarginPct,
    };
  }

  public static async generateBalanceSheet(
    entityId: string,
    asOfDate: Date,
    includeUnposted: boolean = false
  ): Promise<BalanceSheetResponse> {
    const entity = await Entity.findById(entityId);
    if (!entity) {
      const err = new Error(`Entity with ID ${entityId} not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const accounts = await Account.find({
      entity_id: entity._id,
      is_active: true,
    }).sort({ code: 1 });

    const allowedStatuses = this.getAllowedStatuses(includeUnposted);

    // Cumulative sums as of asOfDate
    const pipeline = [
      {
        $match: {
          entity_id: entity._id,
          entry_date: { $lte: asOfDate },
          status: { $in: allowedStatuses },
        },
      },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.account_id',
          total_dr: { $sum: '$lines.debit' },
          total_cr: { $sum: '$lines.credit' },
        },
      },
    ];
    const results = await JournalEntry.aggregate(pipeline);
    const balanceMap = new Map<string, { dr: number; cr: number }>();
    results.forEach((r) => {
      balanceMap.set(String(r._id), {
        dr: Number(r.total_dr || 0),
        cr: Number(r.total_cr || 0),
      });
    });

    const assetAccounts: BalanceSheetAccountItem[] = [];
    const liabilityAccounts: BalanceSheetAccountItem[] = [];
    const equityAccounts: BalanceSheetAccountItem[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquityBeforeEarnings = 0;
    let cumulativeRevenue = 0;
    let cumulativeExpense = 0;

    for (const acc of accounts) {
      const b = balanceMap.get(String(acc._id)) || { dr: 0, cr: 0 };

      if (acc.account_type === AccountType.ASSET) {
        const net = quantizeAmount(b.dr - b.cr);
        totalAssets += net;
        assetAccounts.push({
          account_id: String(acc._id),
          account_code: acc.code,
          account_name: acc.name,
          amount: net,
        });
      } else if (acc.account_type === AccountType.LIABILITY) {
        const net = quantizeAmount(b.cr - b.dr);
        totalLiabilities += net;
        liabilityAccounts.push({
          account_id: String(acc._id),
          account_code: acc.code,
          account_name: acc.name,
          amount: net,
        });
      } else if (acc.account_type === AccountType.EQUITY) {
        const net = quantizeAmount(b.cr - b.dr);
        totalEquityBeforeEarnings += net;
        equityAccounts.push({
          account_id: String(acc._id),
          account_code: acc.code,
          account_name: acc.name,
          amount: net,
        });
      } else if (acc.account_type === AccountType.REVENUE) {
        cumulativeRevenue += (b.cr - b.dr);
      } else if (acc.account_type === AccountType.EXPENSE) {
        cumulativeExpense += (b.dr - b.cr);
      }
    }

    const currentPeriodEarnings = quantizeAmount(cumulativeRevenue - cumulativeExpense);
    totalAssets = quantizeAmount(totalAssets);
    totalLiabilities = quantizeAmount(totalLiabilities);
    totalEquityBeforeEarnings = quantizeAmount(totalEquityBeforeEarnings);
    const totalEquity = quantizeAmount(totalEquityBeforeEarnings + currentPeriodEarnings);
    const totalLiabilitiesAndEquity = quantizeAmount(totalLiabilities + totalEquity);

    const diff = quantizeAmount(Math.abs(totalAssets - totalLiabilitiesAndEquity));
    const balanced = isBalanced(totalAssets, totalLiabilitiesAndEquity);

    return {
      entity_id: String(entity._id),
      entity_name: entity.name,
      currency: entity.currency,
      as_of_date: asOfDate.toISOString().split('T')[0],
      include_unposted: includeUnposted,
      asset_accounts: assetAccounts,
      total_assets: totalAssets,
      liability_accounts: liabilityAccounts,
      total_liabilities: totalLiabilities,
      equity_accounts: equityAccounts,
      total_equity_before_earnings: totalEquityBeforeEarnings,
      current_period_earnings: currentPeriodEarnings,
      total_equity: totalEquity,
      total_liabilities_and_equity: totalLiabilitiesAndEquity,
      is_balanced: balanced,
      difference: diff,
    };
  }

  public static async getAccountLedger(
    entityId: string,
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const account = await Account.findOne({ _id: accountId, entity_id: entityId });
    if (!account) {
      const err = new Error('Account not found in specified entity');
      (err as any).statusCode = 404;
      throw err;
    }

    const start = startDate || new Date(0);
    const end = endDate || new Date();

    // Opening balance before start
    const openPipeline = [
      {
        $match: {
          entity_id: new mongoose.Types.ObjectId(entityId),
          entry_date: { $lt: start },
          status: JournalStatus.POSTED,
          'lines.account_id': new mongoose.Types.ObjectId(accountId),
        },
      },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.account_id': new mongoose.Types.ObjectId(accountId),
        },
      },
      {
        $group: {
          _id: null,
          total_dr: { $sum: '$lines.debit' },
          total_cr: { $sum: '$lines.credit' },
        },
      },
    ];
    const openRes = await JournalEntry.aggregate(openPipeline);
    const openDr = Number(openRes[0]?.total_dr || 0);
    const openCr = Number(openRes[0]?.total_cr || 0);
    let openingBalance = account.normal_balance === NormalBalance.DEBIT
      ? (openDr - openCr)
      : (openCr - openDr);
    openingBalance = quantizeAmount(openingBalance);

    // Entries in period
    const entries = await JournalEntry.find({
      entity_id: entityId,
      entry_date: { $gte: start, $lte: end },
      status: JournalStatus.POSTED,
      'lines.account_id': accountId,
    }).sort({ entry_date: 1, entry_number: 1 });

    let running = openingBalance;
    const ledgerLines: any[] = [];

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (String(line.account_id) === String(accountId)) {
          const dr = quantizeAmount(Number(line.debit || 0));
          const cr = quantizeAmount(Number(line.credit || 0));
          if (account.normal_balance === NormalBalance.DEBIT) {
            running = quantizeAmount(running + dr - cr);
          } else {
            running = quantizeAmount(running + cr - dr);
          }

          ledgerLines.push({
            journal_id: entry._id,
            entry_number: entry.entry_number,
            entry_date: entry.entry_date,
            description: line.description || entry.memo || '',
            reference: entry.reference,
            debit: dr,
            credit: cr,
            running_balance: running,
          });
        }
      }
    }

    return {
      account: {
        id: account._id,
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        normal_balance: account.normal_balance,
        currency: account.currency,
      },
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      opening_balance: openingBalance,
      closing_balance: running,
      entries: ledgerLines,
    };
  }
}
