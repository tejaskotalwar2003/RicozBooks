import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Bill } from '../models/Bill';
import { Vendor } from '../models/Vendor';
import { PurchaseEngine } from '../services/purchase.engine';
import { fromDecimal } from '../utils/decimal';

export class PurchaseController {
  public static async listBills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, vendor_id, status } = req.query;
      const filter: any = {};

      if (entity_id) {
        filter.entity_id = new mongoose.Types.ObjectId(String(entity_id));
      } else if (req.currentEntityId || req.user?.default_entity_id) {
        filter.entity_id = req.currentEntityId || req.user?.default_entity_id;
      }

      if (vendor_id) filter.vendor_id = new mongoose.Types.ObjectId(String(vendor_id));
      if (status) filter.status = status;

      const bills = await Bill.find(filter)
        .populate('vendor_id', 'name email phone')
        .sort({ bill_date: -1, created_at: -1 })
        .limit(100);

      const result = bills.map((b) => ({
        id: b._id,
        bill_number: b.bill_number,
        vendor: b.vendor_id,
        bill_date: b.bill_date,
        due_date: b.due_date,
        status: b.status,
        subtotal: fromDecimal(b.subtotal),
        tax_total: fromDecimal(b.tax_total),
        total_amount: fromDecimal(b.total_amount),
        amount_paid: fromDecimal(b.amount_paid),
        balance_due: fromDecimal(b.balance_due),
        journal_entry_id: b.journal_entry_id,
        created_at: b.created_at,
      }));

      res.status(200).json({ success: true, count: result.length, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async getBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bill = await Bill.findById(id).populate('vendor_id', 'name email phone billing_address gstin');
      if (!bill) {
        res.status(404).json({ success: false, detail: 'Bill not found' });
        return;
      }

      const formatted = {
        id: bill._id,
        entity_id: bill.entity_id,
        bill_number: bill.bill_number,
        vendor: bill.vendor_id,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        status: bill.status,
        subtotal: fromDecimal(bill.subtotal),
        tax_total: fromDecimal(bill.tax_total),
        total_amount: fromDecimal(bill.total_amount),
        amount_paid: fromDecimal(bill.amount_paid),
        balance_due: fromDecimal(bill.balance_due),
        journal_entry_id: bill.journal_entry_id,
        lines: bill.lines.map((l) => ({
          id: (l as any)._id,
          product_id: l.product_id,
          expense_account_id: l.expense_account_id,
          description: l.description,
          quantity: fromDecimal(l.quantity),
          unit_price: fromDecimal(l.unit_price),
          tax_rate: fromDecimal(l.tax_rate),
          line_total: fromDecimal(l.line_total),
        })),
        created_at: bill.created_at,
      };

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  public static async createBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, vendor_id, bill_date, due_date, items, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const bill = await PurchaseEngine.createBill({
        entity_id: targetEntityId,
        vendor_id,
        bill_date: bill_date ? new Date(bill_date) : new Date(),
        due_date: due_date ? new Date(due_date) : new Date(),
        lines: items || lines,
      });

      res.status(201).json({ success: true, data: bill });
    } catch (err) {
      next(err);
    }
  }

  public static async postBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await PurchaseEngine.postBillToGeneralLedger(id, req.user!._id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, payment_mode, payment_date, paid_from_account_id } = req.body;

      const bill = await Bill.findById(id);
      if (!bill) {
        res.status(404).json({ success: false, detail: 'Bill not found' });
        return;
      }

      const result = await PurchaseEngine.recordVendorPayment({
        entity_id: bill.entity_id,
        bill_id: bill._id,
        amount,
        payment_mode,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        paid_from_account_id,
        user_id: req.user!._id,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async listVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, search } = req.query;
      const filter: any = {};

      if (entity_id) {
        filter.entity_id = new mongoose.Types.ObjectId(String(entity_id));
      } else if (req.currentEntityId || req.user?.default_entity_id) {
        filter.entity_id = req.currentEntityId || req.user?.default_entity_id;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: String(search), $options: 'i' } },
          { email: { $regex: String(search), $options: 'i' } },
        ];
      }

      const vendors = await Vendor.find(filter).sort({ name: 1 });
      res.status(200).json({ success: true, count: vendors.length, data: vendors });
    } catch (err) {
      next(err);
    }
  }

  public static async createVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, name, email, phone, gstin, pan, billing_address, city, state, postal_code } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const vendor = await Vendor.create({
        entity_id: targetEntityId,
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : '',
        phone: phone ? phone.trim() : '',
        gstin: gstin ? gstin.trim().toUpperCase() : '',
        pan: pan ? pan.trim().toUpperCase() : '',
        billing_address: billing_address || '',
        city: city || '',
        state: state || '',
        postal_code: postal_code || '',
        country: 'India',
        is_active: true,
      });

      res.status(201).json({ success: true, data: vendor });
    } catch (err) {
      next(err);
    }
  }
}
