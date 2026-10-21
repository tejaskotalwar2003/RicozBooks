import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BankAccount, BankTransaction, BankReconciliation } from '../models/Banking';
import { BankingEngine } from '../services/banking.engine';
import { fromDecimal } from '../utils/decimal';

export class BankingController {
  public static async listAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      const filter: any = {};

      if (entity_id) {
        filter.entity_id = new mongoose.Types.ObjectId(String(entity_id));
      } else if (req.currentEntityId || req.user?.default_entity_id) {
        filter.entity_id = req.currentEntityId || req.user?.default_entity_id;
      }

      const accounts = await BankAccount.find(filter).populate('gl_account_id', 'code name');
      const result = accounts.map((acc) => ({
        id: acc._id,
        bank_name: acc.bank_name,
        account_name: acc.account_name,
        account_number: acc.account_number,
        account_type: acc.account_type,
        ifsc_code: acc.ifsc_code,
        swift_bic: acc.swift_bic,
        currency: acc.currency,
        gl_account: acc.gl_account_id,
        opening_balance: fromDecimal(acc.opening_balance),
        current_balance: fromDecimal(acc.current_balance),
        is_active: acc.is_active,
      }));

      res.status(200).json({ success: true, count: result.length, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        bank_name,
        account_name,
        account_number,
        account_type,
        ifsc_code,
        swift_bic,
        branch_name,
        currency,
        opening_balance,
        gl_account_id,
      } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const bankAccount = await BankingEngine.createBankAccount({
        entity_id: targetEntityId,
        bank_name,
        account_name,
        account_number,
        account_type,
        ifsc_code,
        swift_bic,
        branch_name,
        currency,
        opening_balance,
        gl_account_id,
      });

      res.status(201).json({ success: true, data: bankAccount });
    } catch (err) {
      next(err);
    }
  }

  public static async listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bank_account_id, start_date, end_date } = req.query;
      const filter: any = {};

      if (bank_account_id) {
        filter.bank_account_id = new mongoose.Types.ObjectId(String(bank_account_id));
      }

      if (start_date || end_date) {
        filter.transaction_date = {};
        if (start_date) filter.transaction_date.$gte = new Date(String(start_date));
        if (end_date) filter.transaction_date.$lte = new Date(String(end_date));
      }

      const transactions = await BankTransaction.find(filter)
        .sort({ transaction_date: -1, created_at: -1 })
        .limit(100);

      const result = transactions.map((t) => ({
        id: t._id,
        bank_account_id: t.bank_account_id,
        transaction_type: t.transaction_type,
        transaction_date: t.transaction_date,
        amount: fromDecimal(t.amount),
        is_credit: t.is_credit,
        running_balance: fromDecimal(t.running_balance),
        reference_number: t.reference_number,
        counterparty: t.counterparty,
        description: t.description,
        status: t.status,
        reconciled_at: t.reconciled_at,
        created_at: t.created_at,
      }));

      res.status(200).json({ success: true, count: result.length, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bank_account_id, transaction_type, transaction_date, amount, is_credit, reference_number, counterparty, description } = req.body;

      const tx = await BankingEngine.recordTransaction({
        bank_account_id,
        transaction_type,
        transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
        amount,
        is_credit,
        reference_number,
        counterparty,
        description,
      });

      res.status(201).json({ success: true, data: tx });
    } catch (err) {
      next(err);
    }
  }

  public static async startReconciliation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bank_account_id, statement_date, statement_balance, notes } = req.body;

      const recon = await BankingEngine.startReconciliation({
        bank_account_id,
        statement_date: statement_date ? new Date(statement_date) : new Date(),
        statement_balance,
        notes,
      });

      res.status(201).json({ success: true, data: recon });
    } catch (err) {
      next(err);
    }
  }

  public static async autoMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await BankingEngine.autoMatchTransactions(id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async completeReconciliation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const recon = await BankingEngine.finalizeReconciliation(id, req.user!._id);
      res.status(200).json({ success: true, data: recon });
    } catch (err) {
      next(err);
    }
  }
}
