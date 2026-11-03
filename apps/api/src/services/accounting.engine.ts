import mongoose from 'mongoose';
import { AccountType, JournalStatus, NormalBalance } from '@ricozbooks/shared';
import { Account, IAccount } from '../models/Account';
import { JournalEntry, IJournalEntry, IJournalLine } from '../models/JournalEntry';
import { FiscalPeriod } from '../models/FiscalPeriod';
import { ClosePeriod } from '../models/Close';
import { AuditService } from './audit.service';
import { toDecimal, fromDecimal, isBalanced, quantizeAmount } from '../utils/decimal';

export class AccountingEngine {
  /**
   * Strict double-entry validation:
   * 1. Total Debit must equal Total Credit within standard epsilon (0.001).
   * 2. Total must be strictly positive (> 0).
   * 3. At least 2 lines required.
   * 4. Each line cannot have both Debit and Credit > 0.
   * 5. No negative amounts allowed.
   */
  public static validateJournalBalance(lines: Array<{
    account_id: mongoose.Types.ObjectId | string;
    debit?: number | string | mongoose.Types.Decimal128;
    credit?: number | string | mongoose.Types.Decimal128;
    description?: string;
  }>): { totalDebit: number; totalCredit: number } {
    if (!lines || lines.length < 2) {
      const err = new Error('Double-entry rule violation: A journal entry must have at least 2 lines.');
      (err as any).statusCode = 400;
      throw err;
    }

    let totalDebit = 0.0;
    let totalCredit = 0.0;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const dr = quantizeAmount(line.debit || 0);
      const cr = quantizeAmount(line.credit || 0);

      if (dr < 0 || cr < 0) {
        const err = new Error(`Line ${idx + 1}: Negative amounts are not allowed. Debit: ${dr}, Credit: ${cr}`);
        (err as any).statusCode = 400;
        throw err;
      }

      if (dr > 0 && cr > 0) {
        const err = new Error(`Line ${idx + 1}: A single line cannot have both Debit and Credit amounts.`);
        (err as any).statusCode = 400;
        throw err;
      }

      if (dr === 0 && cr === 0) {
        const err = new Error(`Line ${idx + 1}: Either Debit or Credit must be greater than zero.`);
        (err as any).statusCode = 400;
        throw err;
      }

      totalDebit += dr;
      totalCredit += cr;
    }

    totalDebit = quantizeAmount(totalDebit);
    totalCredit = quantizeAmount(totalCredit);

    const diff = Math.abs(totalDebit - totalCredit);
    if (!isBalanced(totalDebit, totalCredit)) {
      const err = new Error(
        `Double-entry balance violation: Total Debit (${totalDebit.toFixed(2)}) does not equal ` +
        `Total Credit (${totalCredit.toFixed(2)}). Difference is ${diff.toFixed(2)}. ` +
        `The journal cannot be submitted or posted.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    if (totalDebit <= 0.0) {
      const err = new Error('Journal total must be greater than zero.');
      (err as any).statusCode = 400;
      throw err;
    }

    return { totalDebit, totalCredit };
  }

  /**
   * Ensures the entry date does not fall within a locked or closed fiscal/accounting period.
   */
  public static async validatePeriodOpen(entityId: mongoose.Types.ObjectId | string, entryDate: Date): Promise<void> {
    const closedFiscal = await FiscalPeriod.findOne({
      entity_id: entityId,
      start_date: { $lte: entryDate },
      end_date: { $gte: entryDate },
      is_closed: true,
    });

    if (closedFiscal) {
      const err = new Error(
        `Posting forbidden: The fiscal period '${closedFiscal.name}' covering ${entryDate.toISOString().split('T')[0]} is permanently closed.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const month = entryDate.getMonth() + 1;
    const closedClose = await ClosePeriod.findOne({
      entity_id: entityId,
      month: month,
      status: 'CLOSED',
    });

    if (closedClose) {
      const err = new Error(
        `Posting forbidden: The accounting period '${closedClose.period_name}' is locked and closed by management.`
      );
      (err as any).statusCode = 400;
      throw err;
    }
  }

  /**
   * Generates sequential non-colliding entry numbers (e.g. JE-2026-0001 or REV-2026-0001)
   */
  public static async generateEntryNumber(
    entityId: mongoose.Types.ObjectId | string,
    prefix: string = 'JE'
  ): Promise<string> {
    const year = new Date().getFullYear();
    const regex = new RegExp(`^${prefix}-${year}-`);
    const count = await JournalEntry.countDocuments({
      entity_id: entityId,
      entry_number: { $regex: regex },
    });

    let seq = count + 1;
    while (true) {
      const candidate = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
      const existing = await JournalEntry.findOne({
        entity_id: entityId,
        entry_number: candidate,
      });
      if (!existing) {
        return candidate;
      }
      seq++;
    }
  }

  /**
   * Get or create a ledger account
   */
  public static async getOrCreateAccount(
    entityId: mongoose.Types.ObjectId | string,
    code: string,
    name: string,
    accountType: AccountType,
    normalBalance: NormalBalance,
    currency: string = 'INR'
  ): Promise<IAccount> {
    let account = await Account.findOne({
      entity_id: entityId,
      code: code.trim(),
    });

    if (!account) {
      account = await Account.create({
        entity_id: entityId,
        code: code.trim(),
        name: name.trim(),
        account_type: accountType,
        normal_balance: normalBalance,
        currency: currency,
        is_active: true,
        is_system: true,
      });
    }

    return account;
  }

  /**
   * Create a new Journal Entry (DRAFT)
   */
  public static async createJournalEntry(data: {
    entity_id: mongoose.Types.ObjectId | string;
    entry_date: Date;
    memo?: string;
    reference?: string;
    currency?: string;
    exchange_rate?: number;
    lines: Array<{
      account_id: mongoose.Types.ObjectId | string;
      debit?: number | string | mongoose.Types.Decimal128;
      credit?: number | string | mongoose.Types.Decimal128;
      description?: string;
      dimension_id?: mongoose.Types.ObjectId | null;
    }>;
    created_by_user_id: mongoose.Types.ObjectId | string;
  }): Promise<IJournalEntry> {
    const { totalDebit, totalCredit } = this.validateJournalBalance(data.lines);
    await this.validatePeriodOpen(data.entity_id, data.entry_date);

    const entryNumber = await this.generateEntryNumber(data.entity_id, 'JE');

    const formattedLines = data.lines.map((l) => ({
      account_id: new mongoose.Types.ObjectId(String(l.account_id)),
      debit: toDecimal(l.debit || 0),
      credit: toDecimal(l.credit || 0),
      description: l.description || '',
      dimension_id: l.dimension_id ? new mongoose.Types.ObjectId(String(l.dimension_id)) : null,
    }));

    const journal = await JournalEntry.create({
      entity_id: data.entity_id,
      entry_number: entryNumber,
      entry_date: data.entry_date,
      status: JournalStatus.DRAFT,
      memo: data.memo || '',
      reference: data.reference || '',
      currency: data.currency || 'INR',
      exchange_rate: toDecimal(data.exchange_rate || 1.0),
      total_debit: toDecimal(totalDebit),
      total_credit: toDecimal(totalCredit),
      lines: formattedLines,
      created_by_user_id: data.created_by_user_id,
    });

    await AuditService.log({
      action: 'JOURNAL_CREATED',
      resource_type: 'JournalEntry',
      resource_id: entryNumber,
      entity_id: new mongoose.Types.ObjectId(String(data.entity_id)),
      user_id: new mongoose.Types.ObjectId(String(data.created_by_user_id)),
      details: {
        entry_number: entryNumber,
        total_debit: totalDebit,
        total_credit: totalCredit,
        lines_count: formattedLines.length,
      },
    });

    return journal;
  }

  /**
   * Submit draft or rejected journal for supervisory review
   */
  public static async submitJournalForReview(
    journalId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<IJournalEntry> {
    const journal = await JournalEntry.findById(journalId);
    if (!journal) {
      const err = new Error('Journal entry not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (![JournalStatus.DRAFT, JournalStatus.REJECTED].includes(journal.status)) {
      const err = new Error(
        `Cannot submit journal with status '${journal.status}'. Only DRAFT or REJECTED journals can be submitted.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    this.validateJournalBalance(journal.lines);
    await this.validatePeriodOpen(journal.entity_id, journal.entry_date);

    journal.status = JournalStatus.SUBMITTED;
    journal.submitted_by_user_id = new mongoose.Types.ObjectId(String(userId));
    await journal.save();

    await AuditService.log({
      action: 'JOURNAL_SUBMITTED',
      resource_type: 'JournalEntry',
      resource_id: journal.entry_number,
      entity_id: journal.entity_id,
      user_id: new mongoose.Types.ObjectId(String(userId)),
      details: {
        entry_number: journal.entry_number,
        total_debit: fromDecimal(journal.total_debit),
      },
    });

    return journal;
  }

  /**
   * Approve submitted journal entry
   */
  public static async approveJournalEntry(
    journalId: string | mongoose.Types.ObjectId,
    reviewerId: string | mongoose.Types.ObjectId,
    comments?: string
  ): Promise<IJournalEntry> {
    const journal = await JournalEntry.findById(journalId);
    if (!journal) {
      const err = new Error('Journal entry not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (journal.status !== JournalStatus.SUBMITTED) {
      const err = new Error(
        `Cannot approve journal with status '${journal.status}'. Must be SUBMITTED.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    this.validateJournalBalance(journal.lines);
    await this.validatePeriodOpen(journal.entity_id, journal.entry_date);

    journal.status = JournalStatus.APPROVED;
    journal.approved_by_user_id = new mongoose.Types.ObjectId(String(reviewerId));
    await journal.save();

    await AuditService.log({
      action: 'JOURNAL_APPROVED',
      resource_type: 'JournalEntry',
      resource_id: journal.entry_number,
      entity_id: journal.entity_id,
      user_id: new mongoose.Types.ObjectId(String(reviewerId)),
      details: {
        entry_number: journal.entry_number,
        comments: comments || 'Approved for posting',
      },
    });

    return journal;
  }

  /**
   * Reject submitted journal entry
   */
  public static async rejectJournalEntry(
    journalId: string | mongoose.Types.ObjectId,
    reviewerId: string | mongoose.Types.ObjectId,
    reason: string
  ): Promise<IJournalEntry> {
    if (!reason || !reason.trim()) {
      const err = new Error('A specific rejection reason is mandatory when rejecting a journal entry.');
      (err as any).statusCode = 400;
      throw err;
    }

    const journal = await JournalEntry.findById(journalId);
    if (!journal) {
      const err = new Error('Journal entry not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (journal.status !== JournalStatus.SUBMITTED) {
      const err = new Error(
        `Cannot reject journal with status '${journal.status}'. Must be SUBMITTED.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    journal.status = JournalStatus.REJECTED;
    journal.memo = `Rejected: ${reason.trim()} | ${journal.memo || ''}`.trim();
    await journal.save();

    await AuditService.log({
      action: 'JOURNAL_REJECTED',
      resource_type: 'JournalEntry',
      resource_id: journal.entry_number,
      entity_id: journal.entity_id,
      user_id: new mongoose.Types.ObjectId(String(reviewerId)),
      details: {
        entry_number: journal.entry_number,
        reason: reason.trim(),
      },
    });

    return journal;
  }

  /**
   * Reopens an approved (unposted) journal back to SUBMITTED state
   */
  public static async reopenJournalEntry(
    journalId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    reason: string
  ): Promise<IJournalEntry> {
    if (!reason || !reason.trim()) {
      const err = new Error('A mandatory reason is required to reopen an approved journal entry.');
      (err as any).statusCode = 400;
      throw err;
    }

    const journal = await JournalEntry.findById(journalId);
    if (!journal) {
      const err = new Error('Journal entry not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (journal.status === JournalStatus.POSTED) {
      const err = new Error(
        'Posted journal entries cannot be reopened. They must be reversed or corrected via reversal entry.'
      );
      (err as any).statusCode = 400;
      throw err;
    }

    if (journal.status !== JournalStatus.APPROVED) {
      const err = new Error(
        `Cannot reopen journal with status '${journal.status}'. Only APPROVED journals can be reopened for review.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    this.validateJournalBalance(journal.lines);

    journal.status = JournalStatus.SUBMITTED;
    journal.memo = `Reopened: ${reason.trim()} | ${journal.memo || ''}`.trim();
    await journal.save();

    await AuditService.log({
      action: 'JOURNAL_REOPENED',
      resource_type: 'JournalEntry',
      resource_id: journal.entry_number,
      entity_id: journal.entity_id,
      user_id: new mongoose.Types.ObjectId(String(userId)),
      details: {
        entry_number: journal.entry_number,
        reason: reason.trim(),
      },
    });

    return journal;
  }

  /**
   * Commits an approved journal to the general ledger
   */
  public static async postJournalToLedger(
    journalId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    isAdminOrSuper: boolean = false
  ): Promise<IJournalEntry> {
    const journal = await JournalEntry.findById(journalId);
    if (!journal) {
      const err = new Error('Journal entry not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (journal.status === JournalStatus.POSTED) {
      const err = new Error('Journal is already posted.');
      (err as any).statusCode = 400;
      throw err;
    }

    if (journal.status !== JournalStatus.APPROVED && !isAdminOrSuper) {
      const err = new Error(
        `Cannot post journal with status '${journal.status}'. Entry must be APPROVED first.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    this.validateJournalBalance(journal.lines);
    await this.validatePeriodOpen(journal.entity_id, journal.entry_date);

    journal.status = JournalStatus.POSTED;
    journal.posted_by_user_id = new mongoose.Types.ObjectId(String(userId));
    await journal.save();

    await AuditService.log({
      action: 'JOURNAL_POSTED',
      resource_type: 'JournalEntry',
      resource_id: journal.entry_number,
      entity_id: journal.entity_id,
      user_id: new mongoose.Types.ObjectId(String(userId)),
      details: {
        entry_number: journal.entry_number,
        total_debit: fromDecimal(journal.total_debit),
      },
    });

    return journal;
  }

  /**
   * Generates an exact reversing journal entry with debits and credits inverted
   */
  public static async reversePostedJournal(
    journalId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    reason?: string
  ): Promise<IJournalEntry> {
    const original = await JournalEntry.findById(journalId);
    if (!original) {
      const err = new Error('Original journal entry not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (original.status !== JournalStatus.POSTED) {
      const err = new Error(
        `Only POSTED journals can be reversed. Current status: '${original.status}'`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const today = new Date();
    await this.validatePeriodOpen(original.entity_id, today);

    const reversalNumber = await this.generateEntryNumber(original.entity_id, 'REV');
    const reversalDesc = `Reversal of ${original.entry_number}: ${reason || 'Accounting adjustment'}`;

    // Invert lines: original debit becomes credit, original credit becomes debit
    const invertedLines: IJournalLine[] = original.lines.map((line) => ({
      account_id: line.account_id,
      debit: line.credit,
      credit: line.debit,
      description: `Reversal: ${line.description || original.memo || ''}`.trim(),
      dimension_id: line.dimension_id || null,
    }));

    const reversalEntry = await JournalEntry.create({
      entity_id: original.entity_id,
      entry_number: reversalNumber,
      entry_date: today,
      status: JournalStatus.POSTED,
      memo: reversalDesc,
      reference: `REV-${original.entry_number}`,
      currency: original.currency,
      exchange_rate: original.exchange_rate,
      total_debit: original.total_credit,
      total_credit: original.total_debit,
      lines: invertedLines,
      created_by_user_id: userId,
      posted_by_user_id: userId,
      reversal_of_entry_id: original._id,
    });

    // Mark original as REVERSED
    original.status = JournalStatus.REVERSED;
    await original.save();

    await AuditService.log({
      action: 'JOURNAL_REVERSED',
      resource_type: 'JournalEntry',
      resource_id: original.entry_number,
      entity_id: original.entity_id,
      user_id: new mongoose.Types.ObjectId(String(userId)),
      details: {
        original_entry_number: original.entry_number,
        reversal_entry_number: reversalNumber,
        reason: reason || 'Adjustment',
      },
    });

    return reversalEntry;
  }
}

