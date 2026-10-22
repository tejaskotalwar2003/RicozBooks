import mongoose from 'mongoose';
import { BankAccountType, BankTxType, BankTxStatus, ReconciliationStatus, AccountType, NormalBalance } from '@ricozbooks/shared';
import { BankAccount, IBankAccount, BankTransaction, IBankTransaction, BankReconciliation, IBankReconciliation, BankStatementLine, IBankStatementLine } from '../models/Banking';
import { AccountingEngine } from './accounting.engine';
import { AuditService } from './audit.service';
import { toDecimal, fromDecimal, quantizeAmount } from '../utils/decimal';

export class BankingEngine {
  /**
   * Create a new Bank Account and link to General Ledger asset account
   */
  public static async createBankAccount(data: {
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
  }): Promise<IBankAccount> {
    let glAccountId = data.gl_account_id;

    if (!glAccountId) {
      // Default Bank GL Account: 1100 Cash and Cash Equivalents
      const bankGL = await AccountingEngine.getOrCreateAccount(
        data.entity_id,
        '1100',
        `Bank Account - ${data.bank_name} (${data.account_number.slice(-4)})`,
        AccountType.ASSET,
        NormalBalance.DEBIT,
        data.currency || 'INR'
      );
      glAccountId = bankGL._id;
    }

    const openBal = quantizeAmount(data.opening_balance || 0.0);

    const bankAccount = await BankAccount.create({
      entity_id: data.entity_id,
      bank_name: data.bank_name,
      account_name: data.account_name,
      account_number: data.account_number,
      account_type: data.account_type || BankAccountType.CHECKING,
      ifsc_code: data.ifsc_code || '',
      swift_bic: data.swift_bic || '',
      branch_name: data.branch_name || '',
      currency: data.currency || 'INR',
      gl_account_id: glAccountId,
      opening_balance: toDecimal(openBal),
      current_balance: toDecimal(openBal),
      is_active: true,
    });

    return bankAccount;
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

