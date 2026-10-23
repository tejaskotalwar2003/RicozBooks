import { Request, Response } from 'express';
import { Entity } from '../models/Organization';
import { JournalEntry } from '../models/JournalEntry';
import { FiscalPeriod } from '../models/FiscalPeriod';
import { ReportingEngine } from '../services/reporting.engine';
import { JournalStatus } from '@ricozbooks/shared';
import { quantizeAmount } from '../utils/decimal';

function getCurrencySymbol(curr: string): string {
  const m: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    SGD: 'S$',
  };
  return m[curr.toUpperCase()] || '₹';
}

export class DashboardController {
  public static async getMetrics(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      let targetEntityId = (req.query.entity_id as string) || (user?.default_entity_id ? String(user.default_entity_id) : undefined);

      if (!targetEntityId) {
        const firstEntity = await Entity.findOne({ is_active: true });
        if (firstEntity) {
          targetEntityId = String(firstEntity._id);
        } else {
          return res.status(404).json({ detail: 'No active operating entities found.' });
        }
      }

      const entity = await Entity.findById(targetEntityId);
      if (!entity) {
        return res.status(404).json({ detail: `Entity with ID ${targetEntityId} not found.` });
      }

      const today = new Date();
      const currentYear = today.getFullYear();
      const fyStart = today.getMonth() >= 3 ? new Date(currentYear, 3, 1) : new Date(currentYear - 1, 3, 1);

      // 1. P&L and Balance Sheet reports
      const pl = await ReportingEngine.generateProfitAndLoss(targetEntityId, fyStart, today, false);
      const bs = await ReportingEngine.generateBalanceSheet(targetEntityId, today, false);

      // 2. Trajectory for past 6 months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trajectoryMonths = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

        const mPl = await ReportingEngine.generateProfitAndLoss(targetEntityId, mStart, mEnd, false);
        trajectoryMonths.push({
          month: monthNames[d.getMonth()],
          month_num: d.getMonth() + 1,
          year: d.getFullYear(),
          revenue: mPl.total_revenue,
          expense: mPl.total_expense,
        });
      }

      // 3. Fiscal Period / Close Status
      const period = await FiscalPeriod.findOne({
        entity_id: entity._id,
        start_date: { $lte: today },
        end_date: { $gte: today },
      });

      const closeStatus = period
        ? {
            has_period: true,
            period_id: period._id,
            period_name: period.name,
            completion_percentage: period.is_closed ? 100 : 40,
            completed_tasks: period.is_closed ? 5 : 2,
            pending_tasks: period.is_closed ? 0 : 3,
            blocked_tasks: 0,
            status: period.is_closed ? 'CLOSED' : 'OPEN',
          }
        : {
            has_period: false,
            period_id: null,
            period_name: 'No Active Period',
            completion_percentage: 0,
            completed_tasks: 0,
            pending_tasks: 0,
            blocked_tasks: 0,
            status: 'NONE',
          };

      // 4. Journal Counts
      const allJournals = await JournalEntry.find({ entity_id: entity._id });
      const counts = {
        total: allJournals.length,
        draft: allJournals.filter((j) => j.status === JournalStatus.DRAFT).length,
        pending: allJournals.filter((j) => j.status === JournalStatus.SUBMITTED).length,
        approved: allJournals.filter((j) => j.status === JournalStatus.APPROVED).length,
        posted: allJournals.filter((j) => j.status === JournalStatus.POSTED).length,
        rejected: allJournals.filter((j) => j.status === JournalStatus.REJECTED).length,
      };

      // 5. Recent Journals
      const recent = await JournalEntry.find({ entity_id: entity._id })
        .sort({ created_at: -1 })
        .limit(5);

      const recentJournals = recent.map((j) => ({
        id: j._id,
        entry_number: j.entry_number,
        entry_date: j.entry_date.toISOString().split('T')[0],
        description: j.memo || '',
        entity_name: entity.name,
        amount: quantizeAmount(Number(j.total_debit || 0)),
        status: j.status,
      }));

      return res.json({
        entity_id: String(entity._id),
        entity_name: entity.name,
        currency: entity.currency,
        currency_symbol: getCurrencySymbol(entity.currency),
        total_revenue: pl.total_revenue,
        total_expense: pl.total_expense,
        net_profit: pl.net_profit_loss,
        net_margin_pct: pl.net_margin_pct,
        total_assets: bs.total_assets,
        is_balanced: bs.is_balanced,
        monthly_trajectory: trajectoryMonths,
        close_status: closeStatus,
        journal_counts: counts,
        recent_journals: recentJournals,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ detail: err.message });
    }
  }
}
