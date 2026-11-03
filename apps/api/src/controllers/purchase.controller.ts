import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Bill, VendorPayment } from '../models/Bill';
import { Vendor } from '../models/Vendor';
import { PurchaseOrder, DebitNote } from '../models/CommercialDocuments';
import { PurchaseEngine } from '../services/purchase.engine';
import { AccountingEngine } from '../services/accounting.engine';
import { fromDecimal, toDecimal } from '../utils/decimal';
import { AccountType, NormalBalance } from '@ricozbooks/shared';

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

  public static async getVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const vendor = await Vendor.findById(id);
      if (!vendor) {
        res.status(404).json({ detail: 'Vendor not found' });
        return;
      }
      res.json(vendor);
    } catch (err) {
      next(err);
    }
  }

  public static async updateVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const vendor = await Vendor.findByIdAndUpdate(id, req.body, { new: true });
      if (!vendor) {
        res.status(404).json({ detail: 'Vendor not found' });
        return;
      }
      res.json(vendor);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const vendor = await Vendor.findByIdAndUpdate(id, { is_active: false }, { new: true });
      if (!vendor) {
        res.status(404).json({ detail: 'Vendor not found' });
        return;
      }
      res.json({ message: 'Vendor deactivated successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async getVendorStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, vendorId } = req.params;
      const targetVendorId = id || vendorId;
      const vendor = await Vendor.findById(targetVendorId);
      if (!vendor) {
        res.status(404).json({ detail: 'Vendor not found' });
        return;
      }

      const bills = await Bill.find({ vendor_id: vendor._id }).sort({ bill_date: 1 });
      const payments = await VendorPayment.find({ vendor_id: vendor._id }).sort({ payment_date: 1 });

      const transactions: any[] = [];
      let runningBalance = fromDecimal(vendor.opening_balance || 0);

      bills.forEach((b: any) => {
        const amt = fromDecimal(b.total_amount);
        runningBalance += amt;
        transactions.push({
          date: b.bill_date,
          type: 'BILL',
          reference: b.bill_number,
          debit: 0,
          credit: amt,
          balance: runningBalance,
        });
      });

      payments.forEach((p: any) => {
        const amt = fromDecimal(p.amount);
        runningBalance -= amt;
        transactions.push({
          date: p.payment_date,
          type: 'PAYMENT',
          reference: p.payment_number,
          debit: amt,
          credit: 0,
          balance: runningBalance,
        });
      });

      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      res.json({
        vendor_id: vendor._id,
        vendor_name: vendor.name,
        opening_balance: fromDecimal(vendor.opening_balance || 0),
        closing_balance: runningBalance,
        transactions,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Purchase Orders
  // ==========================================
  public static async listPurchaseOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, vendor_id, status } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (vendor_id) filter.vendor_id = vendor_id;
      if (status && status !== 'ALL') filter.status = status;

      const pos = await PurchaseOrder.find(filter)
        .populate('vendor_id', 'name email company_name')
        .sort({ po_date: -1 });

      res.json(pos);
    } catch (err) {
      next(err);
    }
  }

  public static async createPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, vendor_id, delivery_date, notes, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      const count = await PurchaseOrder.countDocuments({ entity_id: targetEntityId });
      const poNumber = `PO-${(count + 1).toString().padStart(5, '0')}`;

      let subtotal = 0;
      let taxTotal = 0;
      const processedLines = (lines || []).map((l: any) => {
        const qty = Number(l.quantity || 1);
        const price = Number(l.unit_price || 0);
        const taxRate = Number(l.tax_rate || 0);
        const lineSub = Math.round(qty * price * 100) / 100;
        const lineTax = Math.round(lineSub * (taxRate / 100) * 100) / 100;
        const lineTot = Math.round((lineSub + lineTax) * 100) / 100;

        subtotal += lineSub;
        taxTotal += lineTax;

        return {
          product_id: l.product_id || null,
          description: l.description,
          quantity: toDecimal(qty),
          unit_price: toDecimal(price),
          tax_rate: toDecimal(taxRate),
          line_total: toDecimal(lineTot),
        };
      });

      const po = await PurchaseOrder.create({
        entity_id: targetEntityId,
        vendor_id,
        po_number: poNumber,
        po_date: new Date(),
        delivery_date: delivery_date ? new Date(delivery_date) : null,
        status: 'ISSUED',
        subtotal: toDecimal(subtotal),
        tax_total: toDecimal(taxTotal),
        total_amount: toDecimal(subtotal + taxTotal),
        notes,
        lines: processedLines,
      });

      res.status(201).json(po);
    } catch (err) {
      next(err);
    }
  }

  public static async getPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const po = await PurchaseOrder.findById(id).populate('vendor_id', 'name email company_name');
      if (!po) {
        res.status(404).json({ detail: 'Purchase order not found' });
        return;
      }
      res.json(po);
    } catch (err) {
      next(err);
    }
  }

  public static async convertPurchaseOrderToBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const poId = req.params.poId || req.params.id;
      const po = await PurchaseOrder.findById(poId);
      if (!po) {
        res.status(404).json({ detail: 'Purchase order not found' });
        return;
      }

      const billData = {
        entity_id: po.entity_id,
        vendor_id: po.vendor_id,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: po.lines.map((l: any) => ({
          product_id: l.product_id,
          description: l.description,
          quantity: fromDecimal(l.quantity),
          unit_price: fromDecimal(l.unit_price),
          tax_rate: fromDecimal(l.tax_rate),
        })),
      };

      const bill = await PurchaseEngine.createBill(billData as any);
      po.status = 'BILLED';
      po.converted_bill_id = bill._id;
      await po.save();

      res.json(bill);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Debit Notes
  // ==========================================
  public static async listDebitNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, vendor_id } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (vendor_id) filter.vendor_id = vendor_id;

      const debitNotes = await DebitNote.find(filter)
        .populate('vendor_id', 'name email company_name')
        .populate('bill_id', 'bill_number')
        .sort({ issue_date: -1 });

      res.json(debitNotes);
    } catch (err) {
      next(err);
    }
  }

  public static async createDebitNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, vendor_id, bill_id, reason, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const count = await DebitNote.countDocuments({ entity_id: targetEntityId });
      const dnNumber = `DN-${(count + 1).toString().padStart(5, '0')}`;

      let subtotal = 0;
      let taxTotal = 0;
      const processedLines = (lines || []).map((l: any) => {
        const qty = Number(l.quantity || 1);
        const price = Number(l.unit_price || 0);
        const taxRate = Number(l.tax_rate || 0);
        const lineSub = Math.round(qty * price * 100) / 100;
        const lineTax = Math.round(lineSub * (taxRate / 100) * 100) / 100;
        const lineTot = Math.round((lineSub + lineTax) * 100) / 100;

        subtotal += lineSub;
        taxTotal += lineTax;

        return {
          product_id: l.product_id || null,
          description: l.description,
          quantity: toDecimal(qty),
          unit_price: toDecimal(price),
          tax_rate: toDecimal(taxRate),
          line_total: toDecimal(lineTot),
        };
      });

      const totalAmount = Math.round((subtotal + taxTotal) * 100) / 100;

      const debitNote = await DebitNote.create({
        entity_id: targetEntityId,
        vendor_id,
        bill_id: bill_id || null,
        debit_note_number: dnNumber,
        issue_date: new Date(),
        status: 'OPEN',
        subtotal: toDecimal(subtotal),
        tax_total: toDecimal(taxTotal),
        total_amount: toDecimal(totalAmount),
        reason,
        lines: processedLines,
      });

      // Post Debit Note to GL (Dr Accounts Payable, Cr Purchase Returns/Expenses)
      try {
        const apAccount = await AccountingEngine.getOrCreateAccount(
          targetEntityId,
          '2000',
          'Accounts Payable',
          AccountType.LIABILITY,
          NormalBalance.CREDIT,
          'Trade vendor payables'
        );

        const purchaseReturns = await AccountingEngine.getOrCreateAccount(
          targetEntityId,
          '5200',
          'Purchase Returns & Allowances',
          AccountType.EXPENSE,
          NormalBalance.CREDIT,
          'Contra expense account for vendor debit notes'
        );

        const journal = await AccountingEngine.createJournalEntry({
          entity_id: targetEntityId,
          entry_date: new Date(),
          memo: `Debit Note #${dnNumber} issued to vendor`,
          reference: dnNumber,
          currency: 'INR',
          created_by_user_id: userId,
          lines: [
            {
              account_id: apAccount._id,
              debit: totalAmount,
              credit: 0,
              description: `AP reduction for DN #${dnNumber}`,
            },
            {
              account_id: purchaseReturns._id,
              debit: 0,
              credit: totalAmount,
              description: `Purchase return on DN #${dnNumber}`,
            },
          ],
        });

        await AccountingEngine.postJournalToLedger(journal._id, userId, true);
        debitNote.journal_entry_id = journal._id;
        await debitNote.save();
      } catch (glErr) {
        console.error('Failed to post debit note to GL:', glErr);
      }

      res.status(201).json(debitNote);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Vendor Payments
  // ==========================================
  public static async listVendorPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, vendor_id } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (vendor_id) filter.vendor_id = vendor_id;

      const payments = await VendorPayment.find(filter)
        .populate('vendor_id', 'name email company_name')
        .populate('bill_id', 'bill_number total_amount')
        .sort({ payment_date: -1 });

      const items = payments.map((p: any) => ({
        id: p._id,
        payment_number: p.payment_number,
        payment_date: p.payment_date,
        amount: fromDecimal(p.amount),
        payment_mode: p.payment_mode,
        vendor_id: p.vendor_id?._id || p.vendor_id,
        vendor_name: p.vendor_id?.name || null,
        bill_id: p.bill_id?._id || p.bill_id,
        bill_number: p.bill_id?.bill_number || null,
        created_at: p.created_at,
      }));

      res.json(items);
    } catch (err) {
      next(err);
    }
  }

  public static async recordVendorPaymentDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, vendor_id, bill_id, amount, payment_mode, payment_date, paid_from_account_id } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const result = await PurchaseEngine.recordVendorPayment({
        entity_id: targetEntityId,
        bill_id,
        amount: Number(amount),
        payment_mode: payment_mode || 'BANK_TRANSFER',
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        paid_from_account_id,
        user_id: userId,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
