import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { BankAccount, BankTransaction, BankReconciliation, BankTransfer } from '../models/Banking';
import { BankingEngine } from '../services/banking.engine';
import { fromDecimal } from '../utils/decimal';

export class BankingController {
  public static async listAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, is_active } = req.query;
      const filter: any = {};

      if (entity_id) {
        filter.entity_id = new mongoose.Types.ObjectId(String(entity_id));
      } else if (req.currentEntityId || req.user?.default_entity_id) {
        filter.entity_id = req.currentEntityId || req.user?.default_entity_id;
      }

      if (is_active !== undefined) {
        filter.is_active = is_active === 'true';
      }

      const accounts = await BankAccount.find(filter).populate('gl_account_id', 'code name account_type');
      const result = accounts.map((acc) => {
        const glAcc = acc.gl_account_id as any;
        return {
          id: acc._id.toString(),
          _id: acc._id.toString(),
          entity_id: acc.entity_id?.toString(),
          bank_name: acc.bank_name,
          account_name: acc.account_name,
          account_number: acc.account_number,
          account_type: acc.account_type,
          ifsc_code: acc.ifsc_code,
          swift_bic: acc.swift_bic,
          branch_name: acc.branch_name,
          currency: acc.currency,
          gl_account: glAcc,
          gl_account_id: glAcc?._id ? glAcc._id.toString() : (acc.gl_account_id ? acc.gl_account_id.toString() : ''),
          gl_account_code: glAcc?.code || '',
          gl_account_name: glAcc?.name || '',
          opening_balance: fromDecimal(acc.opening_balance),
          current_balance: fromDecimal(acc.current_balance),
          is_active: acc.is_active,
          created_at: acc.created_at,
          updated_at: acc.updated_at,
        };
      });

      res.status(200).json({ success: true, count: result.length, data: result, accounts: result, items: result });
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

      if (!bank_name || !account_number) {
        res.status(400).json({ success: false, detail: 'bank_name and account_number are required' });
        return;
      }

      if (!gl_account_id) {
        res.status(400).json({ success: false, detail: 'Linked General Ledger asset account is mandatory' });
        return;
      }

      const bankAccount = await BankingEngine.createBankAccount(
        {
          entity_id: targetEntityId,
          bank_name,
          account_name,
          account_number,
          account_type,
          ifsc_code,
          swift_bic,
          branch_name,
          currency,
          opening_balance: opening_balance !== undefined ? parseFloat(opening_balance) : 0,
          gl_account_id,
        },
        req.user?._id
      );

      const populated = await BankAccount.findById(bankAccount._id).populate('gl_account_id', 'code name');
      const glAcc = populated?.gl_account_id as any;

      const formatted = {
        id: bankAccount._id.toString(),
        _id: bankAccount._id.toString(),
        entity_id: bankAccount.entity_id?.toString(),
        bank_name: bankAccount.bank_name,
        account_name: bankAccount.account_name,
        account_number: bankAccount.account_number,
        account_type: bankAccount.account_type,
        ifsc_code: bankAccount.ifsc_code,
        swift_bic: bankAccount.swift_bic,
        branch_name: bankAccount.branch_name,
        currency: bankAccount.currency,
        gl_account_id: glAcc?._id ? glAcc._id.toString() : gl_account_id.toString(),
        gl_account_code: glAcc?.code || '',
        gl_account_name: glAcc?.name || '',
        opening_balance: fromDecimal(bankAccount.opening_balance),
        current_balance: fromDecimal(bankAccount.current_balance),
        is_active: bankAccount.is_active,
        created_at: bankAccount.created_at,
        updated_at: bankAccount.updated_at,
      };

      res.status(201).json({ success: true, data: formatted });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }

  public static async getBankingSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const summary = await BankingEngine.getBankingSummary(String(targetEntityId));
      res.status(200).json({ success: true, data: summary, ...summary });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }

  public static async listTransfers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const transfers = await BankingEngine.listBankTransfers(String(targetEntityId));
      const result = transfers.map((t) => ({
        id: t._id.toString(),
        _id: t._id.toString(),
        entity_id: t.entity_id?.toString(),
        transfer_number: t.transfer_number,
        from_bank_account_id: (t.from_bank_account_id as any)?._id?.toString() || t.from_bank_account_id?.toString(),
        from_bank_account: t.from_bank_account_id,
        to_bank_account_id: (t.to_bank_account_id as any)?._id?.toString() || t.to_bank_account_id?.toString(),
        to_bank_account: t.to_bank_account_id,
        transfer_date: t.transfer_date,
        amount: fromDecimal(t.amount),
        fee_amount: fromDecimal(t.fee_amount),
        currency: t.currency,
        reference_number: t.reference_number,
        notes: t.notes,
        created_at: t.created_at,
      }));

      res.status(200).json({ success: true, count: result.length, data: result, transfers: result, items: result });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }

  public static async createTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        from_bank_account_id,
        to_bank_account_id,
        transfer_date,
        amount,
        fee_amount,
        reference_number,
        notes,
      } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      if (!from_bank_account_id || !to_bank_account_id) {
        res.status(400).json({ success: false, detail: 'Source and destination bank accounts are required' });
        return;
      }

      const transfer = await BankingEngine.createBankTransfer(
        {
          entity_id: targetEntityId,
          from_bank_account_id,
          to_bank_account_id,
          transfer_date: transfer_date ? new Date(transfer_date) : new Date(),
          amount: parseFloat(amount),
          fee_amount: fee_amount ? parseFloat(fee_amount) : 0,
          reference_number,
          notes,
        },
        req.user?._id
      );

      res.status(201).json({ success: true, data: transfer });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
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
        id: t._id.toString(),
        _id: t._id.toString(),
        bank_account_id: t.bank_account_id?.toString(),
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

      res.status(200).json({ success: true, count: result.length, data: result, transactions: result, items: result });
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
        amount: parseFloat(amount),
        is_credit: is_credit === true || is_credit === 'true',
        reference_number,
        counterparty,
        description,
      });

      res.status(201).json({ success: true, data: tx });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }

  public static async startReconciliation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bank_account_id, statement_date, statement_balance, notes } = req.body;

      const recon = await BankingEngine.startReconciliation({
        bank_account_id,
        statement_date: statement_date ? new Date(statement_date) : new Date(),
        statement_balance: parseFloat(statement_balance),
        notes,
      });

      res.status(201).json({ success: true, data: recon });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }

  public static async getReconciliationDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const detail = await BankingEngine.getReconciliationDetail(id);
      res.status(200).json({ success: true, data: detail.reconciliation, statement_lines: detail.statement_lines });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }

  public static async autoMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await BankingEngine.autoMatchTransactions(id);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }

  public static async completeReconciliation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const recon = await BankingEngine.finalizeReconciliation(id, req.user!._id);
      res.status(200).json({ success: true, data: recon });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }

  public static async uploadStatementCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      res.status(200).json({ success: true, message: 'Statement uploaded', lines_imported: 0, difference: 0 });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, detail: err.message });
        return;
      }
      next(err);
    }
  }
}
