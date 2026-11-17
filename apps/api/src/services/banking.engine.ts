import mongoose from 'mongoose';
import { BankAccountType, BankTxType, BankTxStatus, ReconciliationStatus, AccountType, NormalBalance, JournalStatus } from '@ricozbooks/shared';
import { BankAccount, IBankAccount, BankTransaction, IBankTransaction, BankReconciliation, IBankReconciliation, BankStatementLine, IBankStatementLine, BankTransfer, IBankTransfer } from '../models/Banking';
import { Account } from '../models/Account';
import { JournalEntry } from '../models/JournalEntry';
import { AccountingEngine } from './accounting.engine';
import { AuditService } from './audit.service';
import { toDecimal, fromDecimal, quantizeAmount } from '../utils/decimal';

export class BankingEngine {
  /**
   * Create a new Bank Account and link to an eligible General Ledger asset account
   */
  public static async createBankAccount(
    data: {
      entity_id: mongoose.Types.ObjectId | string;
      bank_name: string;
      account_name: string;
      account_number: string;
      account_type?: BankAccountType;
      ifsc_code?: string;
      swift_bic?: string;
      branch_name?: string;
      currency?: string;
      gl_account_id?: mongoose.Types.ObjectId | string;
      opening_balance?: number;
    },
    userId?: mongoose.Types.ObjectId | string
  ): Promise<IBankAccount> {
    const entityId = new mongoose.Types.ObjectId(String(data.entity_id));

    // 1. Validate mandatory linked GL asset account
    if (!data.gl_account_id) {
      const err = new Error('Linked General Ledger asset account is mandatory');
      (err as any).statusCode = 400;
      throw err;
    }

    // 2. Validate that the GL account exists
    const glAccount = await Account.findById(data.gl_account_id);
    if (!glAccount) {
      const err = new Error('Selected General Ledger account not found in Chart of Accounts');
      (err as any).statusCode = 400;
      throw err;
    }

    // 3. Verify that the selected account belongs to the active organization / legal entity
    if (glAccount.entity_id.toString() !== entityId.toString()) {
      const err = new Error('Selected General Ledger account does not belong to the active organization');
      (err as any).statusCode = 403;
      throw err;
    }

    // 4. Verify that the account is an eligible active ASSET account
    if (glAccount.account_type !== AccountType.ASSET && (glAccount.account_type as any) !== 'ASSET') {
      const err = new Error(
        `Account '${glAccount.code} - ${glAccount.name}' is of type '${glAccount.account_type}'. Only ASSET accounts can be linked to a Bank Account.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    if (glAccount.is_active === false) {
      const err = new Error(`Account '${glAccount.code} - ${glAccount.name}' is inactive and cannot be linked.`);
      (err as any).statusCode = 400;
      throw err;
    }

    // 5. Prevent duplicate bank account numbers within the same legal entity
    const existingBank = await BankAccount.findOne({
      entity_id: entityId,
      account_number: data.account_number.trim(),
    });
    if (existingBank) {
      const err = new Error(`Bank account with account number '${data.account_number.trim()}' already exists for this organization.`);
      (err as any).statusCode = 409;
      throw err;
    }

    const openBal = quantizeAmount(data.opening_balance || 0.0);

    const bankAccount = await BankAccount.create({
      entity_id: entityId,
      bank_name: data.bank_name.trim(),
      account_name: (data.account_name || `${data.bank_name} Account`).trim(),
      account_number: data.account_number.trim(),
      account_type: data.account_type || BankAccountType.CHECKING,
      ifsc_code: data.ifsc_code ? data.ifsc_code.trim().toUpperCase() : '',
      swift_bic: data.swift_bic ? data.swift_bic.trim().toUpperCase() : '',
      branch_name: data.branch_name ? data.branch_name.trim() : '',
      currency: data.currency || glAccount.currency || 'INR',
      gl_account_id: glAccount._id,
      opening_balance: toDecimal(openBal),
      current_balance: toDecimal(openBal),
      is_active: true,
    });

    // 6. Handle opening balance accounting integration if opening_balance > 0
    if (openBal > 0) {
      let journalId: mongoose.Types.ObjectId | null = null;
      try {
        // Find standard Retained Earnings / Equity account to offset the initial debit
        let equityAccount = await Account.findOne({ entity_id: entityId, code: '3100' });
        if (!equityAccount) {
          equityAccount = await Account.findOne({ entity_id: entityId, account_type: AccountType.EQUITY, is_active: true });
        }

        if (equityAccount) {
          const entryNumber = await AccountingEngine.generateEntryNumber(entityId, 'JE');
          const journal = await JournalEntry.create({
            entity_id: entityId,
            entry_number: entryNumber,
            entry_date: new Date(),
            status: JournalStatus.POSTED,
            memo: `Opening balance for bank account: ${bankAccount.bank_name} (${bankAccount.account_number.slice(-4)})`,
            reference: `OPENING-BAL-${bankAccount.account_number.slice(-4)}`,
            currency: bankAccount.currency || 'INR',
            exchange_rate: toDecimal(1.0),
            total_debit: toDecimal(openBal),
            total_credit: toDecimal(openBal),
            lines: [
              {
                account_id: glAccount._id,
                debit: toDecimal(openBal),
                credit: toDecimal(0),
                description: `Bank Opening Balance: ${bankAccount.account_name}`,
              },
              {
                account_id: equityAccount._id,
                debit: toDecimal(0),
                credit: toDecimal(openBal),
                description: `Offsetting equity for bank opening balance`,
              },
            ],
            created_by_user_id: userId ? new mongoose.Types.ObjectId(String(userId)) : null,
            posted_by_user_id: userId ? new mongoose.Types.ObjectId(String(userId)) : null,
            posted_at: new Date(),
          });
          journalId = journal._id;
        }
      } catch (jeErr) {
        console.warn('[BANKING] Notice: Could not post automatic opening balance journal:', jeErr);
      }

      // Record initial bank transaction for opening balance
      await BankTransaction.create({
        bank_account_id: bankAccount._id,
        transaction_type: BankTxType.DEPOSIT,
        transaction_date: new Date(),
        amount: toDecimal(openBal),
        is_credit: true,
        running_balance: toDecimal(openBal),
        reference_number: `OP-BAL-${bankAccount.account_number.slice(-4)}`,
        counterparty: 'Initial Setup',
        description: 'Opening Balance',
        status: BankTxStatus.UNRECONCILED,
        journal_entry_id: journalId,
      });
    }

    if (userId) {
      await AuditService.log({
        action: 'BANK_ACCOUNT_CREATED',
        resource_type: 'BankAccount',
        resource_id: bankAccount.account_number,
        entity_id: entityId,
        user_id: new mongoose.Types.ObjectId(String(userId)),
        details: {
          bank_name: bankAccount.bank_name,
          account_number: bankAccount.account_number,
          gl_account_id: glAccount._id.toString(),
          opening_balance: openBal,
        },
      });
    }

    return bankAccount;
  }

  /**
   * Aggregate liquid cash, active bank accounts, and unreconciled counts
   */
  public static async getBankingSummary(entityId: mongoose.Types.ObjectId | string): Promise<{
    total_liquid_cash: number;
    active_bank_accounts_count: number;
    unreconciled_transactions_count: number;
    accounts_summary: Array<{
      id: string;
      bank_name: string;
      account_name: string;
      account_number: string;
      balance: number;
      currency: string;
    }>;
  }> {
    const eId = new mongoose.Types.ObjectId(String(entityId));
    const bankAccounts = await BankAccount.find({ entity_id: eId, is_active: true });
    const accountIds = bankAccounts.map((a) => a._id);

    const unreconciledCount = await BankTransaction.countDocuments({
      bank_account_id: { $in: accountIds },
      status: BankTxStatus.UNRECONCILED,
    });

    let totalLiquid = 0.0;
    const accountsSummary = bankAccounts.map((acc) => {
      const bal = fromDecimal(acc.current_balance);
      totalLiquid += bal;
      return {
        id: acc._id.toString(),
        bank_name: acc.bank_name,
        account_name: acc.account_name,
        account_number: acc.account_number,
        balance: quantizeAmount(bal),
        currency: acc.currency || 'INR',
      };
    });

    return {
      total_liquid_cash: quantizeAmount(totalLiquid),
      active_bank_accounts_count: bankAccounts.length,
      unreconciled_transactions_count: unreconciledCount,
      accounts_summary: accountsSummary,
    };
  }

  /**
   * Record a bank transaction (Deposit, Withdrawal, Fee, Transfer)
   */
  public static async recordTransaction(data: {
    bank_account_id: mongoose.Types.ObjectId | string;
    transaction_type: BankTxType;
    transaction_date: Date;
    amount: number;
    is_credit: boolean; // true = inflow, false = outflow
    reference_number?: string;
    counterparty?: string;
    description?: string;
    journal_entry_id?: mongoose.Types.ObjectId | string;
  }): Promise<IBankTransaction> {
    const bankAccount = await BankAccount.findById(data.bank_account_id);
    if (!bankAccount) {
      const err = new Error('Bank account not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const amt = quantizeAmount(data.amount);
    if (amt <= 0.0) {
      const err = new Error('Transaction amount must be strictly positive');
      (err as any).statusCode = 400;
      throw err;
    }

    const currentBal = fromDecimal(bankAccount.current_balance);
    const newBal = quantizeAmount(data.is_credit ? currentBal + amt : currentBal - amt);

    bankAccount.current_balance = toDecimal(newBal);
    await bankAccount.save();

    const tx = await BankTransaction.create({
      bank_account_id: bankAccount._id,
      transaction_type: data.transaction_type,
      transaction_date: data.transaction_date,
      amount: toDecimal(amt),
      is_credit: data.is_credit,
      running_balance: toDecimal(newBal),
      reference_number: data.reference_number || '',
      counterparty: data.counterparty || '',
      description: data.description || '',
      status: BankTxStatus.UNRECONCILED,
      journal_entry_id: data.journal_entry_id || null,
    });

    return tx;
  }

  /**
   * Execute an internal bank-to-bank transfer with dual transactions & balanced journal entry
   */
  public static async createBankTransfer(
    data: {
      entity_id: mongoose.Types.ObjectId | string;
      from_bank_account_id: mongoose.Types.ObjectId | string;
      to_bank_account_id: mongoose.Types.ObjectId | string;
      transfer_date: Date;
      amount: number;
      fee_amount?: number;
      reference_number?: string;
      notes?: string;
    },
    userId?: mongoose.Types.ObjectId | string
  ): Promise<IBankTransfer> {
    const entityId = new mongoose.Types.ObjectId(String(data.entity_id));

    if (String(data.from_bank_account_id) === String(data.to_bank_account_id)) {
      const err = new Error('Source and destination bank accounts must be different');
      (err as any).statusCode = 400;
      throw err;
    }

    const amount = quantizeAmount(data.amount);
    if (amount <= 0) {
      const err = new Error('Transfer amount must be strictly positive');
      (err as any).statusCode = 400;
      throw err;
    }

    const feeAmount = quantizeAmount(data.fee_amount || 0);

    const fromAcc = await BankAccount.findById(data.from_bank_account_id);
    const toAcc = await BankAccount.findById(data.to_bank_account_id);

    if (!fromAcc || !toAcc) {
      const err = new Error('One or both bank accounts not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (fromAcc.entity_id.toString() !== entityId.toString() || toAcc.entity_id.toString() !== entityId.toString()) {
      const err = new Error('Bank accounts must belong to the active legal entity');
      (err as any).statusCode = 403;
      throw err;
    }

    const transferNum = `TRF-${Date.now().toString().slice(-6)}`;
    const totalDeduction = quantizeAmount(amount + feeAmount);

    // Update balances
    const fromBal = fromDecimal(fromAcc.current_balance);
    const newFromBal = quantizeAmount(fromBal - totalDeduction);
    fromAcc.current_balance = toDecimal(newFromBal);
    await fromAcc.save();

    const toBal = fromDecimal(toAcc.current_balance);
    const newToBal = quantizeAmount(toBal + amount);
    toAcc.current_balance = toDecimal(newToBal);
    await toAcc.save();

    // Balanced Journal Entry
    let journalId: mongoose.Types.ObjectId | null = null;
    try {
      const entryNumber = await AccountingEngine.generateEntryNumber(entityId, 'JE');
      const lines: any[] = [
        {
          account_id: toAcc.gl_account_id,
          debit: toDecimal(amount),
          credit: toDecimal(0),
          description: `Internal transfer receipt into ${toAcc.bank_name}`,
        },
      ];

      if (feeAmount > 0) {
        // Find bank charges expense account (e.g. 5200 or 5800)
        let feeAccount = await Account.findOne({ entity_id: entityId, code: '5800' });
        if (!feeAccount) {
          feeAccount = await Account.findOne({ entity_id: entityId, account_type: AccountType.EXPENSE, is_active: true });
        }
        if (feeAccount) {
          lines.push({
            account_id: feeAccount._id,
            debit: toDecimal(feeAmount),
            credit: toDecimal(0),
            description: `Bank transfer fee`,
          });
        }
      }

      lines.push({
        account_id: fromAcc.gl_account_id,
        debit: toDecimal(0),
        credit: toDecimal(totalDeduction),
        description: `Internal transfer disbursement from ${fromAcc.bank_name}`,
      });

      const journal = await JournalEntry.create({
        entity_id: entityId,
        entry_number: entryNumber,
        entry_date: data.transfer_date,
        status: JournalStatus.POSTED,
        memo: `Internal bank transfer from ${fromAcc.bank_name} to ${toAcc.bank_name}`,
        reference: data.reference_number || transferNum,
        currency: fromAcc.currency || 'INR',
        exchange_rate: toDecimal(1.0),
        total_debit: toDecimal(totalDeduction),
        total_credit: toDecimal(totalDeduction),
        lines,
        created_by_user_id: userId ? new mongoose.Types.ObjectId(String(userId)) : null,
        posted_by_user_id: userId ? new mongoose.Types.ObjectId(String(userId)) : null,
        posted_at: new Date(),
      });
      journalId = journal._id;
    } catch (jeErr) {
      console.warn('[BANKING] Notice: Could not post transfer journal:', jeErr);
    }

    // Record Outflow Transaction on source account
    await BankTransaction.create({
      bank_account_id: fromAcc._id,
      transaction_type: BankTxType.TRANSFER_OUT,
      transaction_date: data.transfer_date,
      amount: toDecimal(totalDeduction),
      is_credit: false,
      running_balance: toDecimal(newFromBal),
      reference_number: data.reference_number || transferNum,
      counterparty: toAcc.bank_name,
      description: `Transfer to ${toAcc.bank_name} (${toAcc.account_number.slice(-4)})`,
      status: BankTxStatus.UNRECONCILED,
      journal_entry_id: journalId,
    });

    // Record Inflow Transaction on destination account
    await BankTransaction.create({
      bank_account_id: toAcc._id,
      transaction_type: BankTxType.TRANSFER_IN,
      transaction_date: data.transfer_date,
      amount: toDecimal(amount),
      is_credit: true,
      running_balance: toDecimal(newToBal),
      reference_number: data.reference_number || transferNum,
      counterparty: fromAcc.bank_name,
      description: `Transfer from ${fromAcc.bank_name} (${fromAcc.account_number.slice(-4)})`,
      status: BankTxStatus.UNRECONCILED,
      journal_entry_id: journalId,
    });

    const transfer = await BankTransfer.create({
      entity_id: entityId,
      transfer_number: transferNum,
      from_bank_account_id: fromAcc._id,
      to_bank_account_id: toAcc._id,
      transfer_date: data.transfer_date,
      amount: toDecimal(amount),
      fee_amount: toDecimal(feeAmount),
      currency: fromAcc.currency || 'INR',
      reference_number: data.reference_number || '',
      notes: data.notes || '',
      journal_entry_id: journalId,
    });

    if (userId) {
      await AuditService.log({
        action: 'BANK_TRANSFER_CREATED',
        resource_type: 'BankTransfer',
        resource_id: transferNum,
        entity_id: entityId,
        user_id: new mongoose.Types.ObjectId(String(userId)),
        details: {
          transfer_number: transferNum,
          from_account_id: fromAcc._id.toString(),
          to_account_id: toAcc._id.toString(),
          amount,
          fee_amount: feeAmount,
        },
      });
    }

    return transfer;
  }

  /**
   * List all bank transfers for an entity
   */
  public static async listBankTransfers(entityId: mongoose.Types.ObjectId | string): Promise<IBankTransfer[]> {
    const eId = new mongoose.Types.ObjectId(String(entityId));
    return BankTransfer.find({ entity_id: eId })
      .populate('from_bank_account_id', 'bank_name account_name account_number')
      .populate('to_bank_account_id', 'bank_name account_name account_number')
      .sort({ transfer_date: -1, created_at: -1 });
  }

  /**
   * Start a new bank reconciliation session
   */
  public static async startReconciliation(data: {
    bank_account_id: mongoose.Types.ObjectId | string;
    statement_date: Date;
    statement_balance: number;
    notes?: string;
  }): Promise<IBankReconciliation> {
    const bankAccount = await BankAccount.findById(data.bank_account_id);
    if (!bankAccount) {
      const err = new Error('Bank account not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const bookBalance = quantizeAmount(fromDecimal(bankAccount.current_balance));
    const statementBalance = quantizeAmount(data.statement_balance);
    const difference = quantizeAmount(statementBalance - bookBalance);

    const recon = await BankReconciliation.create({
      bank_account_id: bankAccount._id,
      statement_date: data.statement_date,
      statement_balance: toDecimal(statementBalance),
      book_balance: toDecimal(bookBalance),
      reconciled_balance: toDecimal(bookBalance),
      difference: toDecimal(difference),
      status: ReconciliationStatus.DRAFT,
      notes: data.notes || '',
    });

    return recon;
  }

  /**
   * Fetch bank reconciliation details and imported statement lines
   */
  public static async getReconciliationDetail(
    reconciliationId: string | mongoose.Types.ObjectId
  ): Promise<{ reconciliation: IBankReconciliation; statement_lines: IBankStatementLine[] }> {
    const recon = await BankReconciliation.findById(reconciliationId).populate('bank_account_id');
    if (!recon) {
      const err = new Error('Bank reconciliation session not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const lines = await BankStatementLine.find({ reconciliation_id: recon._id }).sort({ transaction_date: 1 });
    return { reconciliation: recon, statement_lines: lines };
  }

  /**
   * Perform automated reconciliation matching between imported statement lines and ledger transactions
   */
  public static async autoMatchTransactions(reconciliationId: string | mongoose.Types.ObjectId): Promise<{
    matchedCount: number;
    unmatchedCount: number;
    difference: number;
  }> {
    const recon = await BankReconciliation.findById(reconciliationId);
    if (!recon) {
      const err = new Error('Bank reconciliation session not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const statementLines = await BankStatementLine.find({ reconciliation_id: recon._id });
    const unreconciledTx = await BankTransaction.find({
      bank_account_id: recon.bank_account_id,
      status: BankTxStatus.UNRECONCILED,
    });

    let matchedCount = 0;
    const matchedTxIds = new Set<string>();

    for (const line of statementLines) {
      if (line.is_matched) continue;

      const lineAmt = quantizeAmount(fromDecimal(line.amount));
      const lineCredit = line.is_credit;

      // Find best match by exact amount and direction
      const match = unreconciledTx.find((tx) => {
        if (matchedTxIds.has(tx._id.toString())) return false;
        const txAmt = quantizeAmount(fromDecimal(tx.amount));
        return txAmt === lineAmt && tx.is_credit === lineCredit;
      });

      if (match) {
        matchedTxIds.add(match._id.toString());
        line.is_matched = true;
        line.matched_transaction_id = match._id;
        await line.save();

        match.status = BankTxStatus.RECONCILED;
        match.reconciled_at = new Date();
        match.reconciliation_id = recon._id;
        await match.save();

        matchedCount++;
      }
    }

    const unmatchedCount = statementLines.length - matchedCount;

    // Recalculate reconciled balance and difference
    const remainingUnmatchedLines = statementLines.filter((l) => !l.is_matched);
    let unmatchedDiff = 0.0;
    for (const ul of remainingUnmatchedLines) {
      const uAmt = quantizeAmount(fromDecimal(ul.amount));
      unmatchedDiff += ul.is_credit ? uAmt : -uAmt;
    }

    recon.difference = toDecimal(quantizeAmount(unmatchedDiff));
    recon.status = unmatchedCount === 0 ? ReconciliationStatus.IN_PROGRESS : ReconciliationStatus.DRAFT;
    await recon.save();

    return {
      matchedCount,
      unmatchedCount,
      difference: quantizeAmount(unmatchedDiff),
    };
  }

  /**
   * Finalize and lock bank reconciliation
   */
  public static async finalizeReconciliation(
    reconciliationId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<IBankReconciliation> {
    const recon = await BankReconciliation.findById(reconciliationId);
    if (!recon) {
      const err = new Error('Bank reconciliation session not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const diff = Math.abs(fromDecimal(recon.difference));
    if (diff > 0.01) {
      const err = new Error(
        `Cannot complete reconciliation with an unresolved difference of ${diff.toFixed(2)}. Reconciliation must balance to 0.00.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    recon.status = ReconciliationStatus.COMPLETED;
    recon.reconciled_by_user_id = new mongoose.Types.ObjectId(String(userId));
    recon.completed_at = new Date();
    await recon.save();

    return recon;
  }
}
