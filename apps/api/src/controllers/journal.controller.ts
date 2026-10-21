import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { JournalEntry } from '../models/JournalEntry';
import { AccountingEngine } from '../services/accounting.engine';
import { fromDecimal } from '../utils/decimal';

export class JournalController {
  public static async listJournals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, status, start_date, end_date } = req.query;
      const filter: any = {};

      if (entity_id) {
        filter.entity_id = new mongoose.Types.ObjectId(String(entity_id));
      } else if (req.currentEntityId || req.user?.default_entity_id) {
        filter.entity_id = req.currentEntityId || req.user?.default_entity_id;
      }

      if (status) {
        filter.status = status;
      }

      if (start_date || end_date) {
        filter.entry_date = {};
        if (start_date) filter.entry_date.$gte = new Date(String(start_date));
        if (end_date) filter.entry_date.$lte = new Date(String(end_date));
      }

      const journals = await JournalEntry.find(filter)
        .sort({ entry_date: -1, created_at: -1 })
        .limit(100);

      const result = journals.map((j) => ({
        id: j._id,
        entry_number: j.entry_number,
        entry_date: j.entry_date,
        status: j.status,
        memo: j.memo,
        reference: j.reference,
        currency: j.currency,
        total_debit: fromDecimal(j.total_debit),
        total_credit: fromDecimal(j.total_credit),
        created_at: j.created_at,
      }));

      res.status(200).json({ success: true, count: result.length, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async getJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const journal = await JournalEntry.findById(id).populate('lines.account_id', 'code name account_type normal_balance');
      if (!journal) {
        res.status(404).json({ success: false, detail: 'Journal entry not found' });
        return;
      }

      const formatted = {
        id: journal._id,
        entity_id: journal.entity_id,
        entry_number: journal.entry_number,
        entry_date: journal.entry_date,
        status: journal.status,
        memo: journal.memo,
        reference: journal.reference,
        currency: journal.currency,
        total_debit: fromDecimal(journal.total_debit),
        total_credit: fromDecimal(journal.total_credit),
        lines: journal.lines.map((l) => ({
          id: (l as any)._id,
          account: l.account_id,
          debit: fromDecimal(l.debit),
          credit: fromDecimal(l.credit),
          description: l.description,
        })),
        created_by_user_id: journal.created_by_user_id,
        submitted_by_user_id: journal.submitted_by_user_id,
        approved_by_user_id: journal.approved_by_user_id,
        posted_by_user_id: journal.posted_by_user_id,
        reversal_of_entry_id: journal.reversal_of_entry_id,
        created_at: journal.created_at,
        updated_at: journal.updated_at,
      };

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  public static async createJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, entry_date, memo, reference, currency, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const journal = await AccountingEngine.createJournalEntry({
        entity_id: targetEntityId,
        entry_date: entry_date ? new Date(entry_date) : new Date(),
        memo,
        reference,
        currency,
        lines,
        created_by_user_id: req.user!._id,
      });

      res.status(201).json({ success: true, data: journal });
    } catch (err) {
      next(err);
    }
  }

  public static async submitJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const journal = await AccountingEngine.submitJournalForReview(id, req.user!._id);
      res.status(200).json({ success: true, data: journal });
    } catch (err) {
      next(err);
    }
  }

  public static async approveJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const journal = await AccountingEngine.approveJournalEntry(id, req.user!._id, comments);
      res.status(200).json({ success: true, data: journal });
    } catch (err) {
      next(err);
    }
  }

  public static async rejectJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const journal = await AccountingEngine.rejectJournalEntry(id, req.user!._id, reason);
      res.status(200).json({ success: true, data: journal });
    } catch (err) {
      next(err);
    }
  }

  public static async reopenJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const journal = await AccountingEngine.reopenJournalEntry(id, req.user!._id, reason);
      res.status(200).json({ success: true, data: journal });
    } catch (err) {
      next(err);
    }
  }

  public static async postJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const isAdminOrSuper = req.user?.is_superuser || false;
      const journal = await AccountingEngine.postJournalToLedger(id, req.user!._id, isAdminOrSuper);
      res.status(200).json({ success: true, data: journal });
    } catch (err) {
      next(err);
    }
  }

  public static async reverseJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const reversal = await AccountingEngine.reversePostedJournal(id, req.user!._id, reason);
      res.status(200).json({ success: true, data: reversal });
    } catch (err) {
      next(err);
    }
  }
}
