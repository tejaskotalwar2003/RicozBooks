import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { SalesEngine } from '../services/sales.engine';
import { fromDecimal, toDecimal, quantizeAmount } from '../utils/decimal';

function formatCustomer(c: any) {
  const obj = c.toObject ? c.toObject() : c;
  return {
    ...obj,
    id: String(obj._id),
    _id: String(obj._id),
    opening_balance: fromDecimal(obj.opening_balance || 0),
    current_balance: fromDecimal(obj.current_balance || 0),
  };
}
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
      const { entity_id, search, paginate, page = 1, page_size = 20 } = req.query;
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
          { company_name: { $regex: String(search), $options: 'i' } },
          { phone: { $regex: String(search), $options: 'i' } },
        ];
      }

      const total = await Customer.countDocuments(filter);
      const isPaginated = String(paginate) === 'true';

      let query = Customer.find(filter).sort({ name: 1 });
      if (isPaginated) {
        const p = Math.max(1, parseInt(String(page), 10));
        const ps = Math.max(1, Math.min(100, parseInt(String(page_size), 10)));
        query = query.skip((p - 1) * ps).limit(ps);
      }

      const customers = await query;
      const formatted = customers.map(formatCustomer);

      if (isPaginated) {
        const p = Math.max(1, parseInt(String(page), 10));
        const ps = Math.max(1, Math.min(100, parseInt(String(page_size), 10)));
        const totalPages = Math.ceil(total / ps) || 1;
        res.status(200).json({
          items: formatted,
          data: formatted,
          total,
          page: p,
          page_size: ps,
          total_pages: totalPages,
        });
      } else {
        res.status(200).json(formatted);
      }
    } catch (err) {
      next(err);
    }
  }

  public static async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entity_id,
        name,
        company_name,
        email,
        phone,
        gstin,
        pan,
        billing_address,
        shipping_address,
        city,
        state,
        postal_code,
        country = 'India',
        payment_terms_days = 30,
        opening_balance = 0.0,
        currency = 'INR',
      } = req.body;

      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, detail: 'Customer name is required' });
        return;
      }

      const opBal = quantizeAmount(opening_balance || 0.0);
      const customer = await Customer.create({
        entity_id: targetEntityId,
        name: name.trim(),
        company_name: company_name ? company_name.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        gstin: gstin ? gstin.trim().toUpperCase() : null,
        pan: pan ? pan.trim().toUpperCase() : null,
        billing_address: billing_address ? billing_address.trim() : null,
        shipping_address: shipping_address ? shipping_address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        postal_code: postal_code ? postal_code.trim() : null,
        country: country || 'India',
        payment_terms_days: Number(payment_terms_days) || 30,
        opening_balance: toDecimal(opBal),
        current_balance: toDecimal(opBal),
        currency: currency || 'INR',
        is_active: true,
      });

      const formatted = formatCustomer(customer);
      res.status(201).json(formatted);
    } catch (err) {
      next(err);
    }
  }

  public static async getCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await Customer.findById(id);
      if (!customer) {
        res.status(404).json({ detail: 'Customer not found' });
        return;
      }
      res.status(200).json(formatCustomer(customer));
    } catch (err) {
      next(err);
    }
  }

  public static async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: any = { ...req.body };
      delete updateData._id;
      delete updateData.id;

      if (updateData.opening_balance !== undefined) {
        updateData.opening_balance = toDecimal(quantizeAmount(updateData.opening_balance));
      }
      if (updateData.current_balance !== undefined) {
        updateData.current_balance = toDecimal(quantizeAmount(updateData.current_balance));
      }
      if (updateData.name) updateData.name = updateData.name.trim();
      if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
      if (updateData.gstin) updateData.gstin = updateData.gstin.trim().toUpperCase();
      if (updateData.pan) updateData.pan = updateData.pan.trim().toUpperCase();

      const customer = await Customer.findByIdAndUpdate(id, updateData, { new: true });
      if (!customer) {
        res.status(404).json({ detail: 'Customer not found' });
        return;
      }
      res.status(200).json(formatCustomer(customer));
    } catch (err) {
      next(err);
    }
  }

  public static async deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await Customer.findByIdAndDelete(id);
      if (!customer) {
        res.status(404).json({ detail: 'Customer not found' });
        return;
      }
      res.status(200).json({ message: 'Customer deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  public static async getCustomerStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, customerId } = req.params;
      const custId = id || customerId;
      const customer = await Customer.findById(custId);
      if (!customer) {
        res.status(404).json({ detail: 'Customer not found' });
        return;
      }

      const invoices = await Invoice.find({
        customer_id: customer._id,
        status: { $ne: 'CANCELLED' },
      }).sort({ issue_date: 1, _id: 1 });

      const opBal = fromDecimal(customer.opening_balance || 0);
      let runningBal = opBal;
      let totInvoiced = 0;
      let totPaid = 0;

      const timeline: any[] = [];
      if (opBal > 0) {
        timeline.push({
          date: customer.created_at,
          type: 'OPENING_BALANCE',
          reference: 'OP-BAL',
          description: 'Opening Balance B/F',
          debit: opBal,
          credit: 0,
          sort_key: `${customer.created_at}-0`,
        });
        totInvoiced += opBal;
      }

      for (const inv of invoices) {
        const total = fromDecimal(inv.total_amount);
        const paid = fromDecimal(inv.amount_paid);
        totInvoiced += total;
        timeline.push({
          date: inv.issue_date,
          type: 'INVOICE',
          reference: inv.invoice_number,
          description: `Sales Invoice #${inv.invoice_number} (${inv.status})`,
          debit: total,
          credit: 0,
          sort_key: `${inv.issue_date}-1-${inv._id}`,
        });

        if (paid > 0) {
          totPaid += paid;
          timeline.push({
            date: inv.issue_date,
            type: 'PAYMENT',
            reference: `PAY-${inv.invoice_number}`,
            description: `Payment for Invoice #${inv.invoice_number}`,
            debit: 0,
            credit: paid,
            sort_key: `${inv.issue_date}-2-${inv._id}`,
          });
        }
      }

      timeline.sort((a, b) => (a.sort_key > b.sort_key ? 1 : -1));

      const entries = timeline.map((item, idx) => {
        runningBal = runningBal + item.debit - item.credit;
        return {
          id: idx + 1,
          date: item.date,
          type: item.type,
          reference: item.reference,
          description: item.description,
          debit: item.debit,
          credit: item.credit,
          running_balance: runningBal,
        };
      });

      res.status(200).json({
        customer_id: customer._id,
        customer_name: customer.name,
        company_name: customer.company_name,
        gstin: customer.gstin,
        currency: customer.currency,
        opening_balance: opBal,
        total_invoiced: totInvoiced,
        total_paid: totPaid,
        current_balance: runningBal,
        statement_period: 'All Time',
        entries,
      });
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
