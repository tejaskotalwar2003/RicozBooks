import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Account } from '../models/Account';

export class AccountController {
  public static async listAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, account_type, is_active } = req.query;
      const filter: any = {};

      if (entity_id) {
        filter.entity_id = new mongoose.Types.ObjectId(String(entity_id));
      } else if (req.currentEntityId || req.user?.default_entity_id) {
        filter.entity_id = req.currentEntityId || req.user?.default_entity_id;
      }

      if (account_type) {
        filter.account_type = account_type;
      }

      if (is_active !== undefined) {
        filter.is_active = is_active === 'true';
      }

      const accounts = await Account.find(filter).sort({ code: 1 });
      res.status(200).json({ success: true, count: accounts.length, data: accounts });
    } catch (err) {
      next(err);
    }
  }

  public static async getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const account = await Account.findById(id);
      if (!account) {
        res.status(404).json({ success: false, detail: 'Account not found' });
        return;
      }
      res.status(200).json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  }

  public static async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, code, name, account_type, normal_balance, parent_id, currency, description } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const existing = await Account.findOne({ entity_id: targetEntityId, code: code.trim() });
      if (existing) {
        res.status(409).json({ success: false, detail: `Account code '${code}' already exists for this organization.` });
        return;
      }

      const account = await Account.create({
        entity_id: targetEntityId,
        code: code.trim(),
        name: name.trim(),
        account_type,
        normal_balance,
        parent_id: parent_id ? new mongoose.Types.ObjectId(String(parent_id)) : null,
        currency: currency || 'INR',
        description: description || '',
        is_active: true,
        is_system: false,
      });

      res.status(201).json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  }
}
