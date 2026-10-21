import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { SalesEngine } from '../services/sales.engine';
import { fromDecimal, toDecimal, quantizeAmount } from '../utils/decimal';

export class SalesController {
  public static async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, status, start_date, end_date } = req.query;
      const filter: any = {};

      if (entity_id) {
        filter.entity_id = new mongoose.Types.ObjectId(String(entity_id));
      } else if (req.currentEntityId || req.user?.default_entity_id) {
        filter.entity_id = req.currentEntityId || req.user?.default_entity_id;
      }

      if (customer_id) filter.customer_id = new mongoose.Types.ObjectId(String(customer_id));
      if (status) filter.status = status;
      if (start_date || end_date) {
        filter.issue_date = {};
        if (start_date) filter.issue_date.$gte = new Date(String(start_date));
        if (end_date) filter.issue_date.$lte = new Date(String(end_date));
      }

      const invoices = await Invoice.find(filter)
        .populate('customer_id', 'name email phone')
        .sort({ issue_date: -1, created_at: -1 })
        .limit(100);

      const result = invoices.map((inv) => ({
        id: inv._id,
        invoice_number: inv.invoice_number,
        customer: inv.customer_id,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        status: inv.status,
        total_amount: fromDecimal(inv.total_amount),
        amount_paid: fromDecimal(inv.amount_paid),
        balance_due: fromDecimal(inv.balance_due),
        journal_entry_id: inv.journal_entry_id,
        created_at: inv.created_at,
      }));

      res.status(200).json({ success: true, count: result.length, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id).populate('customer_id', 'name email phone billing_address gstin');
      if (!invoice) {
        res.status(404).json({ success: false, detail: 'Invoice not found' });
        return;
      }

      const formatted = {
        id: invoice._id,
        entity_id: invoice.entity_id,
        invoice_number: invoice.invoice_number,
        customer: invoice.customer_id,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        status: invoice.status,
        subtotal: fromDecimal(invoice.subtotal),
        tax_total: fromDecimal(invoice.tax_total),
        cgst_total: fromDecimal(invoice.cgst_total),
        sgst_total: fromDecimal(invoice.sgst_total),
        igst_total: fromDecimal(invoice.igst_total),
        total_amount: fromDecimal(invoice.total_amount),
        amount_paid: fromDecimal(invoice.amount_paid),
        balance_due: fromDecimal(invoice.balance_due),
        payment_token: invoice.payment_token,
        journal_entry_id: invoice.journal_entry_id,
        lines: invoice.lines.map((l) => ({
          id: (l as any)._id,
          product_id: l.product_id,
          description: l.description,
          quantity: fromDecimal(l.quantity),
          unit_price: fromDecimal(l.unit_price),
          discount_percentage: fromDecimal(l.discount_percentage),
          tax_rate: fromDecimal(l.tax_rate),
          line_subtotal: fromDecimal(l.line_subtotal),
          line_total: fromDecimal(l.line_total),
        })),
        created_at: invoice.created_at,
      };

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  public static async getPublicInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const invoice = await Invoice.findOne({ payment_token: token }).populate('customer_id', 'name email phone billing_address');
      if (!invoice) {
        res.status(404).json({ success: false, detail: 'Invoice not found or invalid payment token' });
        return;
      }

      const formatted = {
        id: invoice._id,
        invoice_number: invoice.invoice_number,
        customer: invoice.customer_id,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        status: invoice.status,
        subtotal: fromDecimal(invoice.subtotal),
        tax_total: fromDecimal(invoice.tax_total),
        total_amount: fromDecimal(invoice.total_amount),
        amount_paid: fromDecimal(invoice.amount_paid),
        balance_due: fromDecimal(invoice.balance_due),
        lines: invoice.lines.map((l) => ({
          description: l.description,
          quantity: fromDecimal(l.quantity),
          unit_price: fromDecimal(l.unit_price),
          line_total: fromDecimal(l.line_total),
        })),
      };

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  public static async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, issue_date, due_date, is_interstate, items, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const invoice = await SalesEngine.createInvoice({
        entity_id: targetEntityId,
        customer_id,
        issue_date: issue_date ? new Date(issue_date) : new Date(),
        due_date: due_date ? new Date(due_date) : new Date(),
        is_interstate,
        lines: items || lines,
        created_by_user_id: req.user!._id,
      });

      res.status(201).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  public static async postInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await SalesEngine.postInvoiceToGeneralLedger(id, req.user!._id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, payment_mode, payment_date, deposit_to_account_id, reference_number } = req.body;

      const invoice = await Invoice.findById(id);
      if (!invoice) {
        res.status(404).json({ success: false, detail: 'Invoice not found' });
        return;
      }

      const result = await SalesEngine.recordCustomerPayment({
        entity_id: invoice.entity_id,
        invoice_id: invoice._id,
        amount,
        payment_mode,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        deposit_to_account_id,
        reference_number,
        user_id: req.user!._id,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const customers = await Customer.find(filter).sort({ name: 1 });
      res.status(200).json({ success: true, count: customers.length, data: customers });
    } catch (err) {
      next(err);
    }
  }

  public static async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, name, email, phone, gstin, pan, billing_address, city, state, postal_code } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const customer = await Customer.create({
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

      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  public static async listItems(req: Request, res: Response, next: NextFunction): Promise<void> {
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
          { sku: { $regex: String(search), $options: 'i' } },
        ];
      }

      const products = await Product.find(filter).sort({ name: 1 });
      const result = products.map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        product_type: p.product_type,
        category: p.category,
        unit: p.unit,
        selling_price: fromDecimal(p.selling_price),
        purchase_price: fromDecimal(p.purchase_price),
        tax_rate: fromDecimal(p.tax_rate),
        track_inventory: p.track_inventory,
        current_stock: fromDecimal(p.current_stock),
        is_active: p.is_active,
      }));

      res.status(200).json({ success: true, count: result.length, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async createItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        name,
        sku,
        product_type,
        category,
        unit,
        selling_price,
        purchase_price,
        tax_rate,
        track_inventory,
        opening_stock,
        opening_stock_rate,
      } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const existing = await Product.findOne({ entity_id: targetEntityId, sku: sku.trim() });
      if (existing) {
        res.status(409).json({ success: false, detail: `Product with SKU '${sku}' already exists.` });
        return;
      }

      const openStock = quantizeAmount(opening_stock || 0.0);
      const product = await Product.create({
        entity_id: targetEntityId,
        name: name.trim(),
        sku: sku.trim(),
        product_type: product_type || 'PRODUCT',
        category: category || 'General',
        unit: unit || 'PCS',
        selling_price: toDecimal(selling_price || 0.0),
        purchase_price: toDecimal(purchase_price || 0.0),
        tax_rate: toDecimal(tax_rate !== undefined ? tax_rate : 18.0),
        track_inventory: track_inventory !== undefined ? track_inventory : true,
        opening_stock: toDecimal(openStock),
        current_stock: toDecimal(openStock),
        opening_stock_rate: toDecimal(opening_stock_rate || purchase_price || 0.0),
        is_active: true,
      });

      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
}
