import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Invoice, CustomerPayment } from '../models/Invoice';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Estimate, SalesOrder, CreditNote, RecurringInvoice } from '../models/CommercialDocuments';
import { InventoryMovement } from '../models/InventoryMovement';
import { SalesEngine } from '../services/sales.engine';
import { AccountingEngine } from '../services/accounting.engine';
import { AuditService } from '../services/audit.service';
import { fromDecimal, toDecimal, quantizeAmount } from '../utils/decimal';
import { AccountType, NormalBalance, ProductType, InventoryMovementType } from '@ricozbooks/shared';

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

function formatProduct(p: any) {
  const obj = p.toObject ? p.toObject() : p;
  const salesAcc = obj.sales_account_id;
  const cogsAcc = obj.cogs_account_id;
  const invAcc = obj.inventory_account_id;

  return {
    ...obj,
    id: String(obj._id),
    _id: String(obj._id),
    entity_id: String(obj.entity_id),
    name: obj.name,
    sku: obj.sku || '',
    barcode: obj.barcode || null,
    product_type: obj.product_type || 'PRODUCT',
    category: obj.category || 'General',
    unit: obj.unit || 'PCS',
    description: obj.description || '',
    selling_price: fromDecimal(obj.selling_price || 0),
    purchase_price: fromDecimal(obj.purchase_price || 0),
    hsn_sac_code: obj.hsn_sac_code || '',
    tax_rate: fromDecimal(obj.tax_rate || 0),
    track_inventory: obj.track_inventory ?? true,
    opening_stock: fromDecimal(obj.opening_stock || 0),
    current_stock: fromDecimal(obj.current_stock || 0),
    opening_stock_rate: fromDecimal(obj.opening_stock_rate || 0),
    reorder_level: fromDecimal(obj.reorder_level || 0),
    min_stock_alert: fromDecimal(obj.min_stock_alert || obj.reorder_level || 0),
    warehouse_location: obj.warehouse_location || 'Main Warehouse',
    sales_account_id: salesAcc ? (salesAcc._id ? String(salesAcc._id) : String(salesAcc)) : null,
    income_account_id: salesAcc ? (salesAcc._id ? String(salesAcc._id) : String(salesAcc)) : null,
    cogs_account_id: cogsAcc ? (cogsAcc._id ? String(cogsAcc._id) : String(cogsAcc)) : null,
    purchase_account_id: cogsAcc ? (cogsAcc._id ? String(cogsAcc._id) : String(cogsAcc)) : null,
    expense_account_id: cogsAcc ? (cogsAcc._id ? String(cogsAcc._id) : String(cogsAcc)) : null,
    inventory_account_id: invAcc ? (invAcc._id ? String(invAcc._id) : String(invAcc)) : null,
    income_account_name: salesAcc?.name || undefined,
    expense_account_name: cogsAcc?.name || undefined,
    inventory_account_name: invAcc?.name || undefined,
    is_active: obj.is_active ?? true,
    created_at: obj.created_at,
    updated_at: obj.updated_at,
  };
}
export class SalesController {
  public static async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, status, start_date, end_date, paginate, page = 1, page_size = 20, search } = req.query;
      const filter: any = {};

      if (entity_id) {
        filter.entity_id = new mongoose.Types.ObjectId(String(entity_id));
      } else if (req.currentEntityId || req.user?.default_entity_id) {
        filter.entity_id = req.currentEntityId || req.user?.default_entity_id;
      }

      if (customer_id) filter.customer_id = new mongoose.Types.ObjectId(String(customer_id));
      if (status && status !== 'ALL') filter.status = status;
      if (start_date || end_date) {
        filter.issue_date = {};
        if (start_date) filter.issue_date.$gte = new Date(String(start_date));
        if (end_date) filter.issue_date.$lte = new Date(String(end_date));
      }

      if (search) {
        filter.$or = [
          { invoice_number: { $regex: String(search), $options: 'i' } },
        ];
      }

      const isPaginated = String(paginate) === 'true';
      const total = await Invoice.countDocuments(filter);

      let query = Invoice.find(filter)
        .populate('customer_id', 'name email phone company_name gstin')
        .sort({ issue_date: -1, created_at: -1 });

      if (isPaginated) {
        const p = Math.max(1, parseInt(String(page), 10));
        const ps = Math.max(1, Math.min(100, parseInt(String(page_size), 10)));
        query = query.skip((p - 1) * ps).limit(ps);
      } else {
        query = query.limit(200);
      }

      const invoices = await query;

      const result = invoices.map((inv) => {
        const cust = inv.customer_id as any;
        return {
          id: inv._id.toString(),
          _id: inv._id.toString(),
          invoice_number: inv.invoice_number,
          customer: cust,
          customer_id: cust?._id ? cust._id.toString() : (inv.customer_id ? inv.customer_id.toString() : ''),
          customer_name: cust?.name || 'Unknown Customer',
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          status: inv.status,
          subtotal: fromDecimal(inv.subtotal),
          tax_total: fromDecimal(inv.tax_total),
          cgst_total: fromDecimal(inv.cgst_total),
          sgst_total: fromDecimal(inv.sgst_total),
          igst_total: fromDecimal(inv.igst_total),
          total_amount: fromDecimal(inv.total_amount),
          amount_paid: fromDecimal(inv.amount_paid),
          balance_due: fromDecimal(inv.balance_due),
          balance_amount: fromDecimal(inv.balance_due),
          is_interstate: inv.is_interstate,
          journal_entry_id: inv.journal_entry_id,
          lines: inv.lines,
          created_at: inv.created_at,
        };
      });

      if (isPaginated) {
        const p = Math.max(1, parseInt(String(page), 10));
        const ps = Math.max(1, Math.min(100, parseInt(String(page_size), 10)));
        const totalPages = Math.ceil(total / ps) || 1;
        res.status(200).json({
          success: true,
          items: result,
          data: result,
          total,
          page: p,
          page_size: ps,
          total_pages: totalPages,
        });
      } else {
        res.status(200).json({ success: true, count: result.length, data: result, items: result });
      }
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

      const cust = invoice.customer_id as any;
      const formatted = {
        id: invoice._id.toString(),
        _id: invoice._id.toString(),
        entity_id: invoice.entity_id,
        invoice_number: invoice.invoice_number,
        customer: cust,
        customer_id: cust?._id ? cust._id.toString() : (invoice.customer_id ? invoice.customer_id.toString() : ''),
        customer_name: cust?.name || 'Unknown Customer',
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
        balance_amount: fromDecimal(invoice.balance_due),
        is_interstate: invoice.is_interstate,
        payment_token: invoice.payment_token,
        journal_entry_id: invoice.journal_entry_id,
        lines: invoice.lines.map((l) => ({
          id: (l as any)._id ? (l as any)._id.toString() : undefined,
          product_id: l.product_id ? l.product_id.toString() : null,
          description: l.description,
          quantity: fromDecimal(l.quantity),
          unit_price: fromDecimal(l.unit_price),
          discount_percentage: fromDecimal(l.discount_percentage || 0),
          tax_rate: fromDecimal(l.tax_rate || 0),
          line_subtotal: fromDecimal(l.line_subtotal || 0),
          line_total: fromDecimal(l.line_total || 0),
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
      const {
        entity_id,
        customer_id,
        customerId,
        issue_date,
        invoice_date,
        due_date,
        is_interstate,
        supply_state,
        notes,
        terms,
        items,
        lines,
      } = req.body;

      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;
      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const rawCustomerId = customer_id || customerId;
      if (!rawCustomerId) {
        res.status(400).json({ success: false, detail: 'customer_id is required' });
        return;
      }

      const rawLines = items || lines;
      if (!rawLines || !Array.isArray(rawLines) || rawLines.length === 0) {
        res.status(400).json({ success: false, detail: 'An invoice must have at least one line item' });
        return;
      }

      const effectiveIssueDate = issue_date ? new Date(issue_date) : (invoice_date ? new Date(invoice_date) : new Date());
      const effectiveDueDate = due_date ? new Date(due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await SalesEngine.createInvoice({
        entity_id: targetEntityId,
        customer_id: String(rawCustomerId),
        issue_date: effectiveIssueDate,
        due_date: effectiveDueDate,
        is_interstate: is_interstate !== undefined ? Boolean(is_interstate) : undefined,
        supply_state: supply_state ? String(supply_state).trim() : undefined,
        lines: rawLines.map((l: any) => ({
          product_id: l.product_id ? String(l.product_id) : null,
          description: l.description || '',
          quantity: Number(l.quantity) || 1,
          unit_price: Number(l.unit_price) || 0,
          discount_percentage: l.discount_percentage !== undefined ? Number(l.discount_percentage) : (l.discount_pct !== undefined ? Number(l.discount_pct) : 0),
          tax_rate: l.tax_rate !== undefined ? Number(l.tax_rate) : undefined,
        })),
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
      const {
        entity_id,
        search,
        name_search,
        sku_search,
        type,
        product_type,
        status,
        is_active,
        category,
        page = 1,
        page_size = 20,
        paginate = 'true',
      } = req.query;

      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;
      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      const filter: any = { entity_id: new mongoose.Types.ObjectId(String(targetEntityId)) };

      // Name search
      if (name_search) {
        filter.name = { $regex: String(name_search).trim(), $options: 'i' };
      }

      // SKU search
      if (sku_search) {
        filter.sku = { $regex: String(sku_search).trim(), $options: 'i' };
      }

      // General search across name, sku, description, hsn_sac_code
      if (search && !name_search && !sku_search) {
        filter.$or = [
          { name: { $regex: String(search).trim(), $options: 'i' } },
          { sku: { $regex: String(search).trim(), $options: 'i' } },
          { description: { $regex: String(search).trim(), $options: 'i' } },
          { hsn_sac_code: { $regex: String(search).trim(), $options: 'i' } },
        ];
      }

      // Product Type filter
      const effectiveType = type || product_type;
      if (effectiveType && effectiveType !== 'ALL') {
        if (effectiveType === 'PRODUCT' || effectiveType === 'GOODS') {
          filter.product_type = { $in: ['PRODUCT', 'GOODS'] };
        } else {
          filter.product_type = effectiveType;
        }
      }

      // Status filter
      if (status && status !== 'ALL') {
        if (status === 'ACTIVE') filter.is_active = true;
        if (status === 'INACTIVE') filter.is_active = false;
      } else if (is_active !== undefined) {
        filter.is_active = String(is_active) === 'true';
      }

      // Category filter
      if (category && category !== 'ALL') {
        filter.category = String(category);
      }

      const shouldPaginate = String(paginate) === 'true';
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(String(page_size), 10) || 20));

      const total = await Product.countDocuments(filter);
      const queryBuilder = Product.find(filter)
        .populate('sales_account_id', 'code name')
        .populate('cogs_account_id', 'code name')
        .populate('inventory_account_id', 'code name')
        .sort({ name: 1 });

      if (shouldPaginate) {
        queryBuilder.skip((pageNum - 1) * limitNum).limit(limitNum);
      }

      const products = await queryBuilder;
      const result = products.map(formatProduct);
      const totalPages = Math.max(1, Math.ceil(total / limitNum));

      res.status(200).json({
        success: true,
        items: result,
        data: result,
        count: total,
        total,
        page: pageNum,
        page_size: limitNum,
        total_pages: totalPages,
      });
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
        barcode,
        product_type,
        category,
        unit,
        description,
        selling_price,
        purchase_price,
        tax_rate,
        hsn_sac_code,
        track_inventory,
        opening_stock,
        opening_stock_rate,
        reorder_level,
        min_stock_alert,
        warehouse_location,
        sales_account_id,
        income_account_id,
        cogs_account_id,
        purchase_account_id,
        expense_account_id,
        inventory_account_id,
        is_active,
      } = req.body;

      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;
      if (!targetEntityId) {
        res.status(400).json({ success: false, detail: 'entity_id is required' });
        return;
      }

      if (!name || !name.trim()) {
        res.status(400).json({ success: false, detail: 'Item Name is required' });
        return;
      }

      const effectiveType = (product_type === 'SERVICE') ? ProductType.SERVICE : ProductType.PRODUCT;
      const isService = effectiveType === ProductType.SERVICE;

      // Handle SKU
      let itemSku = (sku && typeof sku === 'string' && sku.trim()) ? sku.trim().toUpperCase() : '';
      if (!itemSku) {
        const prefix = isService ? 'SRV' : 'ITM';
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        itemSku = `${prefix}-${randomSuffix}`;
      }

      // Check SKU uniqueness within entity
      const existing = await Product.findOne({
        entity_id: new mongoose.Types.ObjectId(String(targetEntityId)),
        sku: itemSku,
      });
      if (existing) {
        res.status(409).json({ success: false, detail: `An item with SKU '${itemSku}' already exists for this organization.` });
        return;
      }

      const shouldTrack = isService ? false : (track_inventory !== undefined ? Boolean(track_inventory) : true);
      const openStock = shouldTrack ? quantizeAmount(opening_stock || 0.0) : 0.0;
      const openStockRate = shouldTrack ? quantizeAmount(opening_stock_rate || purchase_price || 0.0) : 0.0;
      const reorderLvl = shouldTrack ? quantizeAmount(reorder_level || min_stock_alert || 0.0) : 0.0;

      // Resolve account IDs
      const salesAccId = (sales_account_id || income_account_id) ? new mongoose.Types.ObjectId(String(sales_account_id || income_account_id)) : null;
      const cogsAccId = (cogs_account_id || purchase_account_id || expense_account_id) ? new mongoose.Types.ObjectId(String(cogs_account_id || purchase_account_id || expense_account_id)) : null;
      const invAccId = (shouldTrack && inventory_account_id) ? new mongoose.Types.ObjectId(String(inventory_account_id)) : null;

      const product = await Product.create({
        entity_id: new mongoose.Types.ObjectId(String(targetEntityId)),
        name: name.trim(),
        sku: itemSku,
        barcode: barcode ? String(barcode).trim() : null,
        product_type: effectiveType,
        category: category ? String(category).trim() : 'General',
        unit: (unit ? String(unit).trim().toUpperCase() : 'PCS'),
        description: description ? String(description).trim() : '',
        selling_price: toDecimal(selling_price || 0.0),
        purchase_price: toDecimal(purchase_price || 0.0),
        hsn_sac_code: hsn_sac_code ? String(hsn_sac_code).trim() : null,
        tax_rate: toDecimal(tax_rate !== undefined ? tax_rate : 18.0),
        track_inventory: shouldTrack,
        opening_stock: toDecimal(openStock),
        current_stock: toDecimal(openStock),
        opening_stock_rate: toDecimal(openStockRate),
        reorder_level: toDecimal(reorderLvl),
        min_stock_alert: toDecimal(reorderLvl),
        warehouse_location: warehouse_location ? String(warehouse_location).trim() : 'Main Warehouse',
        sales_account_id: salesAccId,
        cogs_account_id: cogsAccId,
        inventory_account_id: invAccId,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      });

      // Record opening stock movement if tracked and quantity > 0
      if (shouldTrack && openStock > 0) {
        try {
          await InventoryMovement.create({
            entity_id: product.entity_id,
            product_id: product._id,
            movement_type: InventoryMovementType.ADJUSTMENT_IN,
            movement_date: new Date(),
            quantity: toDecimal(openStock),
            unit_cost: toDecimal(openStockRate),
            total_cost: toDecimal(openStock * openStockRate),
            reference_type: 'OPENING_STOCK',
            reference_id: product._id.toString(),
            warehouse_location: product.warehouse_location,
            notes: 'Initial opening stock entry',
            created_by_user_id: req.user?._id || req.user?.id || null,
          });
        } catch (invErr) {
          console.warn('[ITEMS] Notice: Could not record initial inventory movement:', invErr);
        }
      }

      const populatedProduct = await Product.findById(product._id)
        .populate('sales_account_id', 'code name')
        .populate('cogs_account_id', 'code name')
        .populate('inventory_account_id', 'code name');

      const formatted = formatProduct(populatedProduct || product);

      res.status(201).json({
        success: true,
        data: formatted,
        ...formatted
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await Product.findById(id)
        .populate('sales_account_id', 'code name')
        .populate('cogs_account_id', 'code name')
        .populate('inventory_account_id', 'code name');

      if (!product) {
        res.status(404).json({ success: false, detail: 'Product not found' });
        return;
      }

      const formatted = formatProduct(product);
      res.json({
        success: true,
        data: formatted,
        ...formatted
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      if (updateData.name !== undefined) updateData.name = String(updateData.name).trim();
      if (updateData.selling_price !== undefined) updateData.selling_price = toDecimal(updateData.selling_price);
      if (updateData.purchase_price !== undefined) updateData.purchase_price = toDecimal(updateData.purchase_price);
      if (updateData.tax_rate !== undefined) updateData.tax_rate = toDecimal(updateData.tax_rate);
      if (updateData.opening_stock !== undefined) updateData.opening_stock = toDecimal(updateData.opening_stock);
      if (updateData.current_stock !== undefined) updateData.current_stock = toDecimal(updateData.current_stock);
      if (updateData.opening_stock_rate !== undefined) updateData.opening_stock_rate = toDecimal(updateData.opening_stock_rate);
      if (updateData.reorder_level !== undefined) {
        updateData.reorder_level = toDecimal(updateData.reorder_level);
        updateData.min_stock_alert = updateData.reorder_level;
      } else if (updateData.min_stock_alert !== undefined) {
        updateData.min_stock_alert = toDecimal(updateData.min_stock_alert);
        updateData.reorder_level = updateData.min_stock_alert;
      }

      // Resolve aliases
      if (updateData.sales_account_id || updateData.income_account_id) {
        updateData.sales_account_id = new mongoose.Types.ObjectId(String(updateData.sales_account_id || updateData.income_account_id));
      }
      if (updateData.cogs_account_id || updateData.purchase_account_id || updateData.expense_account_id) {
        updateData.cogs_account_id = new mongoose.Types.ObjectId(String(updateData.cogs_account_id || updateData.purchase_account_id || updateData.expense_account_id));
      }
      if (updateData.inventory_account_id) {
        updateData.inventory_account_id = new mongoose.Types.ObjectId(String(updateData.inventory_account_id));
      }

      // If SKU updated, check uniqueness within entity
      if (updateData.sku) {
        updateData.sku = String(updateData.sku).trim().toUpperCase();
        const currentProd = await Product.findById(id);
        const entityId = updateData.entity_id || currentProd?.entity_id;
        const existing = await Product.findOne({
          _id: { $ne: id },
          entity_id: entityId,
          sku: updateData.sku,
        });
        if (existing) {
          res.status(409).json({ success: false, detail: `An item with SKU '${updateData.sku}' already exists.` });
          return;
        }
      }

      // If service, disable track_inventory
      if (updateData.product_type === 'SERVICE') {
        updateData.track_inventory = false;
        updateData.current_stock = toDecimal(0);
        updateData.opening_stock = toDecimal(0);
        updateData.inventory_account_id = null;
      }

      const product = await Product.findByIdAndUpdate(id, updateData, { new: true })
        .populate('sales_account_id', 'code name')
        .populate('cogs_account_id', 'code name')
        .populate('inventory_account_id', 'code name');

      if (!product) {
        res.status(404).json({ success: false, detail: 'Product not found' });
        return;
      }

      const formatted = formatProduct(product);
      res.json({
        success: true,
        data: formatted,
        ...formatted
      });
    } catch (err) {
      next(err);
    }
  }

  public static async patchItemStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const product = await Product.findByIdAndUpdate(id, { is_active: Boolean(is_active) }, { new: true });
      if (!product) {
        res.status(404).json({ success: false, detail: 'Product not found' });
        return;
      }
      const formatted = formatProduct(product);
      res.json({
        success: true,
        data: formatted,
        ...formatted
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getItemsSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entityId = req.query.entity_id || req.currentEntityId || req.user?.default_entity_id;
      if (!entityId) {
        res.status(400).json({ detail: 'entity_id is required' });
        return;
      }

      const products = await Product.find({ entity_id: new mongoose.Types.ObjectId(String(entityId)) });
      const totalCount = products.length;
      const productsCount = products.filter((p) => p.product_type === 'PRODUCT' || (p.product_type as any) === 'GOODS').length;
      const servicesCount = products.filter((p) => p.product_type === 'SERVICE').length;
      const activeCount = products.filter((p) => p.is_active).length;
      const inactiveCount = products.filter((p) => !p.is_active).length;
      const inventoryTrackedCount = products.filter((p) => p.track_inventory && p.product_type !== 'SERVICE').length;
      const lowStockCount = products.filter((p) => {
        if (!p.track_inventory || p.product_type === 'SERVICE' || !p.is_active) return false;
        const currentStock = fromDecimal(p.current_stock);
        const threshold = fromDecimal(p.reorder_level || p.min_stock_alert || 0);
        return currentStock <= threshold;
      }).length;

      const summary = {
        total_items: totalCount,
        products_count: productsCount,
        services_count: servicesCount,
        active_items: activeCount,
        inactive_items: inactiveCount,
        inventory_tracked: inventoryTrackedCount,
        inventory_tracked_count: inventoryTrackedCount,
        low_stock_items: lowStockCount,
      };

      res.json({
        success: true,
        data: summary,
        ...summary,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getItemsCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entityId = req.query.entity_id || req.currentEntityId || req.user?.default_entity_id;
      const filter: any = {};
      if (entityId) filter.entity_id = new mongoose.Types.ObjectId(String(entityId));

      const categories = await Product.distinct('category', filter);
      res.json(categories.filter(Boolean));
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Customer Payments
  // ==========================================
  public static async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (customer_id) filter.customer_id = customer_id;

      const payments = await CustomerPayment.find(filter)
        .populate('customer_id', 'name email company_name')
        .populate('invoice_id', 'invoice_number total_amount')
        .sort({ payment_date: -1 });

      const items = payments.map((p: any) => ({
        id: p._id,
        _id: p._id,
        payment_number: p.payment_number,
        payment_date: p.payment_date,
        amount: fromDecimal(p.amount),
        payment_mode: p.payment_mode,
        reference_number: p.reference_number,
        customer_id: p.customer_id?._id || p.customer_id,
        customer_name: p.customer_id?.name || null,
        invoice_id: p.invoice_id?._id || p.invoice_id,
        invoice_number: p.invoice_id?.invoice_number || null,
        created_at: p.created_at,
      }));

      res.json(items);
    } catch (err) {
      next(err);
    }
  }

  public static async recordCustomerPaymentDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, invoice_id, amount, payment_mode, reference_number, deposit_to_account_id, payment_date } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const result = await SalesEngine.recordCustomerPayment({
        entity_id: targetEntityId,
        invoice_id,
        amount: Number(amount),
        payment_mode: payment_mode || 'BANK_TRANSFER',
        reference_number,
        deposit_to_account_id,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        user_id: userId,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Estimates / Quotations
  // ==========================================
  public static async listEstimates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, status } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (customer_id) filter.customer_id = customer_id;
      if (status && status !== 'ALL') filter.status = status;

      const estimates = await Estimate.find(filter)
        .populate('customer_id', 'name email company_name')
        .sort({ estimate_date: -1 });

      res.json(estimates);
    } catch (err) {
      next(err);
    }
  }

  public static async createEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, expiry_date, notes, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      const count = await Estimate.countDocuments({ entity_id: targetEntityId });
      const estimateNumber = `EST-${(count + 1).toString().padStart(5, '0')}`;

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
          line_subtotal: toDecimal(lineSub),
          line_total: toDecimal(lineTot),
        };
      });

      const totalAmount = Math.round((subtotal + taxTotal) * 100) / 100;

      const estimate = await Estimate.create({
        entity_id: targetEntityId,
        customer_id,
        estimate_number: estimateNumber,
        estimate_date: new Date(),
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        status: 'DRAFT',
        subtotal: toDecimal(subtotal),
        tax_total: toDecimal(taxTotal),
        total_amount: toDecimal(totalAmount),
        notes,
        lines: processedLines,
      });

      res.status(201).json(estimate);
    } catch (err) {
      next(err);
    }
  }

  public static async getEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const estimate = await Estimate.findById(id).populate('customer_id', 'name email company_name');
      if (!estimate) {
        res.status(404).json({ detail: 'Estimate not found' });
        return;
      }
      res.json(estimate);
    } catch (err) {
      next(err);
    }
  }

  public static async convertEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const estimateId = req.params.estimateId || req.params.id;
      const estimate = await Estimate.findById(estimateId);
      if (!estimate) {
        res.status(404).json({ detail: 'Estimate not found' });
        return;
      }

      const userId = (req as any).user?.id || (req as any).user?._id;

      // Create invoice from estimate lines
      const invoiceData = {
        entity_id: estimate.entity_id,
        customer_id: estimate.customer_id,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: estimate.lines.map((l: any) => ({
          product_id: l.product_id,
          description: l.description,
          quantity: fromDecimal(l.quantity),
          unit_price: fromDecimal(l.unit_price),
          tax_rate: fromDecimal(l.tax_rate),
        })),
        created_by_user_id: userId,
      };

      const invoice = await SalesEngine.createInvoice(invoiceData as any);
      estimate.status = 'INVOICED';
      estimate.converted_invoice_id = invoice._id;
      await estimate.save();

      res.json(invoice);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Sales Orders
  // ==========================================
  public static async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, status } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (customer_id) filter.customer_id = customer_id;
      if (status && status !== 'ALL') filter.status = status;

      const orders = await SalesOrder.find(filter)
        .populate('customer_id', 'name email company_name')
        .sort({ order_date: -1 });

      res.json(orders);
    } catch (err) {
      next(err);
    }
  }

  public static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, expected_delivery_date, notes, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

      const count = await SalesOrder.countDocuments({ entity_id: targetEntityId });
      const orderNumber = `SO-${(count + 1).toString().padStart(5, '0')}`;

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

      const order = await SalesOrder.create({
        entity_id: targetEntityId,
        customer_id,
        order_number: orderNumber,
        order_date: new Date(),
        expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : null,
        status: 'CONFIRMED',
        subtotal: toDecimal(subtotal),
        tax_total: toDecimal(taxTotal),
        total_amount: toDecimal(subtotal + taxTotal),
        notes,
        lines: processedLines,
      });

      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Credit Notes
  // ==========================================
  public static async listCreditNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;
      if (customer_id) filter.customer_id = customer_id;

      const creditNotes = await CreditNote.find(filter)
        .populate('customer_id', 'name email company_name')
        .populate('invoice_id', 'invoice_number')
        .sort({ issue_date: -1 });

      res.json(creditNotes);
    } catch (err) {
      next(err);
    }
  }

  public static async createCreditNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, invoice_id, reason, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;
      const userId = (req as any).user?.id || (req as any).user?._id;

      const count = await CreditNote.countDocuments({ entity_id: targetEntityId });
      const cnNumber = `CN-${(count + 1).toString().padStart(5, '0')}`;

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

      const creditNote = await CreditNote.create({
        entity_id: targetEntityId,
        customer_id,
        invoice_id: invoice_id || null,
        credit_note_number: cnNumber,
        issue_date: new Date(),
        status: 'OPEN',
        subtotal: toDecimal(subtotal),
        tax_total: toDecimal(taxTotal),
        total_amount: toDecimal(totalAmount),
        reason,
        lines: processedLines,
      });

      // Post Credit Note to GL (Dr Sales Returns/Revenue, Cr Accounts Receivable)
      try {
        const salesReturnsAccount = await AccountingEngine.getOrCreateAccount(
          targetEntityId,
          '4100',
          'Sales Returns & Allowances',
          AccountType.REVENUE,
          NormalBalance.DEBIT,
          'Contra revenue account for customer credit notes'
        );

        const arAccount = await AccountingEngine.getOrCreateAccount(
          targetEntityId,
          '1100',
          'Accounts Receivable',
          AccountType.ASSET,
          NormalBalance.DEBIT,
          'Trade customer receivables'
        );

        const journal = await AccountingEngine.createJournalEntry({
          entity_id: targetEntityId,
          entry_date: new Date(),
          memo: `Credit Note #${cnNumber} issued to customer`,
          reference: cnNumber,
          currency: 'INR',
          created_by_user_id: userId,
          lines: [
            {
              account_id: salesReturnsAccount._id,
              debit: totalAmount,
              credit: 0,
              description: `Sales return on CN #${cnNumber}`,
            },
            {
              account_id: arAccount._id,
              debit: 0,
              credit: totalAmount,
              description: `AR reduction for CN #${cnNumber}`,
            },
          ],
        });

        await AccountingEngine.postJournalToLedger(journal._id, userId, true);
        creditNote.journal_entry_id = journal._id;
        await creditNote.save();
      } catch (glErr) {
        console.error('Failed to post credit note to GL:', glErr);
      }

      res.status(201).json(creditNote);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Recurring Invoices
  // ==========================================
  public static async listRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id } = req.query;
      const filter: any = {};
      if (entity_id) filter.entity_id = entity_id;

      const recurring = await RecurringInvoice.find(filter)
        .populate('customer_id', 'name email company_name')
        .sort({ created_at: -1 });

      res.json(recurring);
    } catch (err) {
      next(err);
    }
  }

  public static async createRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity_id, customer_id, profile_name, frequency, start_date, end_date, total_occurrences, lines } = req.body;
      const targetEntityId = entity_id || req.currentEntityId || req.user?.default_entity_id;

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

      const recurring = await RecurringInvoice.create({
        entity_id: targetEntityId,
        customer_id,
        profile_name,
        frequency: frequency || 'MONTHLY',
        start_date: start_date ? new Date(start_date) : new Date(),
        next_issue_date: start_date ? new Date(start_date) : new Date(),
        end_date: end_date ? new Date(end_date) : null,
        total_occurrences: total_occurrences || null,
        status: 'ACTIVE',
        subtotal: toDecimal(subtotal),
        tax_total: toDecimal(taxTotal),
        total_amount: toDecimal(subtotal + taxTotal),
        lines: processedLines,
      });

      res.status(201).json(recurring);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Public Invoice Payment
  // ==========================================
  public static async payPublicInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const { amount, payment_mode, reference_number } = req.body;

      const invoice = await Invoice.findOne({ payment_token: token });
      if (!invoice) {
        res.status(404).json({ detail: 'Invoice not found or invalid payment token' });
        return;
      }

      const payAmt = amount ? Number(amount) : fromDecimal(invoice.balance_due);

      const cashAccount = await AccountingEngine.getOrCreateAccount(
        invoice.entity_id,
        '1010',
        'Operating Bank / Cash Account',
        AccountType.ASSET,
        NormalBalance.DEBIT,
        'Primary cash/bank account'
      );

      const paymentResult = await SalesEngine.recordCustomerPayment({
        entity_id: invoice.entity_id,
        invoice_id: invoice._id,
        amount: payAmt,
        payment_mode: payment_mode || 'ONLINE_GATEWAY',
        reference_number: reference_number || `ONLINE-${Date.now()}`,
        deposit_to_account_id: cashAccount._id,
        payment_date: new Date(),
        user_id: invoice.created_by_user_id,
      });

      const updatedInvoice = await Invoice.findById(invoice._id).populate('customer_id');

      res.json({
        message: 'Payment received successfully',
        payment_id: paymentResult.payment._id,
        balance_due: fromDecimal(updatedInvoice?.balance_due || 0),
        status: updatedInvoice?.status,
      });
    } catch (err) {
      next(err);
    }
  }
}
