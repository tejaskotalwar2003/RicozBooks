import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AccountType, InvoiceStatus, JournalStatus, NormalBalance, InventoryMovementType, PaymentMode } from '@ricozbooks/shared';
import { Invoice, IInvoice, CustomerPayment, ICustomerPayment } from '../models/Invoice';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { InventoryMovement } from '../models/InventoryMovement';
import { JournalEntry } from '../models/JournalEntry';
import { AccountingEngine } from './accounting.engine';
import { AuditService } from './audit.service';
import { toDecimal, fromDecimal, quantizeAmount } from '../utils/decimal';

export class SalesEngine {
  /**
   * Generates sequential invoice number: INV-YYYY-0001
   */
  public static async generateInvoiceNumber(entityId: mongoose.Types.ObjectId | string): Promise<string> {
    const year = new Date().getFullYear();
    const regex = new RegExp(`^INV-${year}-`);
    const count = await Invoice.countDocuments({
      entity_id: entityId,
      invoice_number: { $regex: regex },
    });

    let seq = count + 1;
    while (true) {
      const candidate = `INV-${year}-${String(seq).padStart(4, '0')}`;
      const existing = await Invoice.findOne({
        entity_id: entityId,
        invoice_number: candidate,
      });
      if (!existing) {
        return candidate;
      }
      seq++;
    }
  }

  /**
   * Generates sequential payment number: RCP-YYYY-0001
   */
  public static async generatePaymentNumber(entityId: mongoose.Types.ObjectId | string): Promise<string> {
    const year = new Date().getFullYear();
    const regex = new RegExp(`^RCP-${year}-`);
    const count = await CustomerPayment.countDocuments({
      entity_id: entityId,
      payment_number: { $regex: regex },
    });

    let seq = count + 1;
    while (true) {
      const candidate = `RCP-${year}-${String(seq).padStart(4, '0')}`;
      const existing = await CustomerPayment.findOne({
        entity_id: entityId,
        payment_number: candidate,
      });
      if (!existing) {
        return candidate;
      }
      seq++;
    }
  }

  /**
   * Create a new sales invoice
   */
  public static async createInvoice(data: {
    entity_id: mongoose.Types.ObjectId | string;
    customer_id: mongoose.Types.ObjectId | string;
    issue_date: Date;
    due_date: Date;
    is_interstate?: boolean;
    lines: Array<{
      product_id?: mongoose.Types.ObjectId | string | null;
      description: string;
      quantity: number;
      unit_price: number;
      discount_percentage?: number;
      tax_rate?: number;
    }>;
    created_by_user_id: mongoose.Types.ObjectId | string;
  }): Promise<IInvoice> {
    const customer = await Customer.findOne({
      _id: data.customer_id,
      entity_id: data.entity_id,
    });
    if (!customer) {
      const err = new Error('Customer not found for this organization');
      (err as any).statusCode = 404;
      throw err;
    }

    if (!data.lines || data.lines.length === 0) {
      const err = new Error('An invoice must have at least one line item');
      (err as any).statusCode = 400;
      throw err;
    }

    const isInterstate = Boolean(data.is_interstate);
    let subtotal = 0.0;
    let cgstTotal = 0.0;
    let sgstTotal = 0.0;
    let igstTotal = 0.0;
    let taxTotal = 0.0;
    let totalAmount = 0.0;

    const formattedLines = [];

    for (const line of data.lines) {
      const qty = quantizeAmount(line.quantity || 1.0);
      const unitPrice = quantizeAmount(line.unit_price || 0.0);
      const discountPct = quantizeAmount(line.discount_percentage || 0.0);
      const taxRate = quantizeAmount(line.tax_rate !== undefined ? line.tax_rate : 18.0);

      const grossLine = quantizeAmount(qty * unitPrice);
      const discountAmt = quantizeAmount(grossLine * (discountPct / 100.0));
      const lineSubtotal = quantizeAmount(grossLine - discountAmt);

      let cgstRate = 0.0;
      let cgstAmt = 0.0;
      let sgstRate = 0.0;
      let sgstAmt = 0.0;
      let igstRate = 0.0;
      let igstAmt = 0.0;

      if (!isInterstate) {
        cgstRate = quantizeAmount(taxRate / 2.0);
        sgstRate = quantizeAmount(taxRate / 2.0);
        cgstAmt = quantizeAmount(lineSubtotal * (cgstRate / 100.0));
        sgstAmt = quantizeAmount(lineSubtotal * (sgstRate / 100.0));
      } else {
        igstRate = taxRate;
        igstAmt = quantizeAmount(lineSubtotal * (igstRate / 100.0));
      }

      const lineTax = quantizeAmount(cgstAmt + sgstAmt + igstAmt);
      const lineTotal = quantizeAmount(lineSubtotal + lineTax);

      subtotal += lineSubtotal;
      cgstTotal += cgstAmt;
      sgstTotal += sgstAmt;
      igstTotal += igstAmt;
      taxTotal += lineTax;
      totalAmount += lineTotal;

      formattedLines.push({
        product_id: line.product_id ? new mongoose.Types.ObjectId(String(line.product_id)) : null,
        description: line.description || '',
        quantity: toDecimal(qty),
        unit_price: toDecimal(unitPrice),
        discount_percentage: toDecimal(discountPct),
        tax_rate: toDecimal(taxRate),
        cgst_rate: toDecimal(cgstRate),
        cgst_amount: toDecimal(cgstAmt),
        sgst_rate: toDecimal(sgstRate),
        sgst_amount: toDecimal(sgstAmt),
        igst_rate: toDecimal(igstRate),
        igst_amount: toDecimal(igstAmt),
        line_subtotal: toDecimal(lineSubtotal),
        line_total: toDecimal(lineTotal),
      });
    }

    subtotal = quantizeAmount(subtotal);
    cgstTotal = quantizeAmount(cgstTotal);
    sgstTotal = quantizeAmount(sgstTotal);
    igstTotal = quantizeAmount(igstTotal);
    taxTotal = quantizeAmount(taxTotal);
    totalAmount = quantizeAmount(totalAmount);

    const invoiceNumber = await this.generateInvoiceNumber(data.entity_id);
    const paymentToken = uuidv4();

    const invoice = await Invoice.create({
      entity_id: data.entity_id,
      customer_id: data.customer_id,
      invoice_number: invoiceNumber,
      issue_date: data.issue_date,
      due_date: data.due_date,
      status: InvoiceStatus.DRAFT,
      subtotal: toDecimal(subtotal),
      tax_total: toDecimal(taxTotal),
      cgst_total: toDecimal(cgstTotal),
      sgst_total: toDecimal(sgstTotal),
      igst_total: toDecimal(igstTotal),
      total_amount: toDecimal(totalAmount),
      amount_paid: toDecimal(0.0),
      balance_due: toDecimal(totalAmount),
      is_interstate: isInterstate,
      payment_token: paymentToken,
      lines: formattedLines,
      created_by_user_id: data.created_by_user_id,
    });

    await AuditService.log({
      action: 'INVOICE_CREATED',
      resource_type: 'Invoice',
      resource_id: invoiceNumber,
      entity_id: new mongoose.Types.ObjectId(String(data.entity_id)),
      user_id: new mongoose.Types.ObjectId(String(data.created_by_user_id)),
      details: {
        invoice_number: invoiceNumber,
        customer_name: customer.name,
        total_amount: totalAmount,
      },
    });

    return invoice;
  }

  /**
   * Finalizes an Invoice and posts balanced double-entry transaction to General Ledger:
   * 1. Accounts Receivable (1200) Debit
   * 2. Operating Sales Revenue (4000) Credit
   * 3. CGST (2100) / SGST (2110) or IGST (2120) Credit
   * 4. For inventory tracked products:
   *    Debit: Cost of Goods Sold (5700)
   *    Credit: Merchandise Inventory Asset (1300)
   *    Stock Decrement & InventoryMovement record
   * 5. Customer balance increment
   */
  public static async postInvoiceToGeneralLedger(
    invoiceId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<{ invoice: IInvoice; journalEntry: any }> {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      const err = new Error('Invoice not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (invoice.journal_entry_id || [InvoiceStatus.PAID, InvoiceStatus.POSTED, InvoiceStatus.SENT].includes(invoice.status)) {
      const err = new Error('Invoice is already posted to the General Ledger.');
      (err as any).statusCode = 400;
      throw err;
    }

    // 1. Period open check
    await AccountingEngine.validatePeriodOpen(invoice.entity_id, invoice.issue_date);

    // 2. Resolve default accounts
    const arAccount = await AccountingEngine.getOrCreateAccount(
      invoice.entity_id,
      '1200',
      'Accounts Receivable (AR)',
      AccountType.ASSET,
      NormalBalance.DEBIT
    );

    const defaultRevenueAccount = await AccountingEngine.getOrCreateAccount(
      invoice.entity_id,
      '4000',
      'Operating Sales Revenue',
      AccountType.REVENUE,
      NormalBalance.CREDIT
    );

    const defaultCogsAccount = await AccountingEngine.getOrCreateAccount(
      invoice.entity_id,
      '5700',
      'Cost of Goods Sold (COGS)',
      AccountType.EXPENSE,
      NormalBalance.DEBIT
    );

    const defaultInventoryAccount = await AccountingEngine.getOrCreateAccount(
      invoice.entity_id,
      '1300',
      'Merchandise Inventory',
      AccountType.ASSET,
      NormalBalance.DEBIT
    );

    // 3. Inspect products and verify stock availability
    const productMap = new Map<string, any>();
    const requiredStockMap = new Map<string, number>();

    for (const line of invoice.lines) {
      if (line.product_id) {
        const prodId = line.product_id.toString();
        let prod = productMap.get(prodId);
        if (!prod) {
          prod = await Product.findOne({ _id: line.product_id, entity_id: invoice.entity_id });
          if (!prod) {
            const err = new Error(`Selected item #${line.product_id} not found for this company/entity.`);
            (err as any).statusCode = 400;
            throw err;
          }
          if (!prod.is_active) {
            const err = new Error(`Item '${prod.name}' is inactive and cannot be posted.`);
            (err as any).statusCode = 400;
            throw err;
          }
          productMap.set(prodId, prod);
        }

        if (prod.track_inventory) {
          const qty = fromDecimal(line.quantity);
          if (qty <= 0) {
            const err = new Error(`Quantity for '${prod.name}' must be strictly positive.`);
            (err as any).statusCode = 400;
            throw err;
          }
          requiredStockMap.set(prodId, (requiredStockMap.get(prodId) || 0) + qty);
        }
      }
    }

    // Negative stock check
    for (const [prodId, reqQty] of requiredStockMap.entries()) {
      const prod = productMap.get(prodId);
      const avail = fromDecimal(prod.current_stock);
      if (avail < reqQty) {
        const err = new Error(
          `Insufficient stock for product '${prod.name}' (SKU: ${prod.sku || 'N/A'}). Available: ${avail}, Required: ${reqQty}.`
        );
        (err as any).statusCode = 400;
        throw err;
      }
    }

    // 4. Construct Balanced Journal Lines
    const totalInvoiceAmt = quantizeAmount(fromDecimal(invoice.total_amount));
    let totalDeb = 0.0;
    let totalCred = 0.0;
    const journalLines: any[] = [];

    // Line 1: Debit Accounts Receivable (AR)
    journalLines.push({
      account_id: arAccount._id,
      debit: toDecimal(totalInvoiceAmt),
      credit: toDecimal(0.0),
      description: `Receivable - Inv #${invoice.invoice_number}`,
    });
    totalDeb += totalInvoiceAmt;

    // Sales Revenue lines
    for (const line of invoice.lines) {
      const lineSubtotal = quantizeAmount(fromDecimal(line.line_subtotal));
      if (lineSubtotal > 0) {
        let revAccId = defaultRevenueAccount._id;
        if (line.product_id) {
          const prod = productMap.get(line.product_id.toString());
          if (prod && prod.sales_account_id) {
            revAccId = prod.sales_account_id;
          }
        }

        journalLines.push({
          account_id: revAccId,
          debit: toDecimal(0.0),
          credit: toDecimal(lineSubtotal),
          description: `Sales Revenue (${line.description}) - Inv #${invoice.invoice_number}`,
        });
        totalCred += lineSubtotal;
      }
    }

    // Output GST lines
    const cgstAmt = quantizeAmount(fromDecimal(invoice.cgst_total));
    if (cgstAmt > 0) {
      const cgstAcc = await AccountingEngine.getOrCreateAccount(
        invoice.entity_id,
        '2100',
        'Statutory Tax / CGST Output',
        AccountType.LIABILITY,
        NormalBalance.CREDIT
      );
      journalLines.push({
        account_id: cgstAcc._id,
        debit: toDecimal(0.0),
        credit: toDecimal(cgstAmt),
        description: `Output CGST - Inv #${invoice.invoice_number}`,
      });
      totalCred += cgstAmt;
    }

    const sgstAmt = quantizeAmount(fromDecimal(invoice.sgst_total));
    if (sgstAmt > 0) {
      const sgstAcc = await AccountingEngine.getOrCreateAccount(
        invoice.entity_id,
        '2110',
        'Statutory Tax / SGST Output',
        AccountType.LIABILITY,
        NormalBalance.CREDIT
      );
      journalLines.push({
        account_id: sgstAcc._id,
        debit: toDecimal(0.0),
        credit: toDecimal(sgstAmt),
        description: `Output SGST - Inv #${invoice.invoice_number}`,
      });
      totalCred += sgstAmt;
    }

    const igstAmt = quantizeAmount(fromDecimal(invoice.igst_total));
    if (igstAmt > 0) {
      const igstAcc = await AccountingEngine.getOrCreateAccount(
        invoice.entity_id,
        '2120',
        'Statutory Tax / IGST Output',
        AccountType.LIABILITY,
        NormalBalance.CREDIT
      );
      journalLines.push({
        account_id: igstAcc._id,
        debit: toDecimal(0.0),
        credit: toDecimal(igstAmt),
        description: `Output IGST - Inv #${invoice.invoice_number}`,
      });
      totalCred += igstAmt;
    }

    // Rounding adjustment on sales side if slight fraction difference
    const salesDiff = quantizeAmount(totalInvoiceAmt - totalCred);
    if (salesDiff !== 0.0 && Math.abs(salesDiff) <= 0.05 && journalLines.length > 1) {
      const currentCred = fromDecimal(journalLines[1].credit);
      journalLines[1].credit = toDecimal(quantizeAmount(currentCred + salesDiff));
      totalCred = quantizeAmount(totalCred + salesDiff);
    }

    // 5. COGS & Inventory Asset Lines (for tracked items)
    const inventoryMovementsToRecord: any[] = [];

    for (const line of invoice.lines) {
      if (line.product_id) {
        const prod = productMap.get(line.product_id.toString());
        if (prod && prod.track_inventory) {
          const qty = fromDecimal(line.quantity);
          const purchasePrice = fromDecimal(prod.purchase_price);
          const openingStockRate = fromDecimal(prod.opening_stock_rate);
          const unitCost = quantizeAmount(purchasePrice > 0 ? purchasePrice : openingStockRate);
          const lineCogs = quantizeAmount(qty * unitCost);

          const cogsAccId = prod.cogs_account_id || defaultCogsAccount._id;
          const invAccId = prod.inventory_account_id || defaultInventoryAccount._id;

          if (lineCogs > 0) {
            // Debit COGS
            journalLines.push({
              account_id: cogsAccId,
              debit: toDecimal(lineCogs),
              credit: toDecimal(0.0),
              description: `COGS: ${prod.name} (${qty} ${prod.unit || 'PCS'} @ ${unitCost}) - Inv #${invoice.invoice_number}`,
            });
            totalDeb += lineCogs;

            // Credit Inventory Asset
            journalLines.push({
              account_id: invAccId,
              debit: toDecimal(0.0),
              credit: toDecimal(lineCogs),
              description: `Inventory Reduction: ${prod.name} (${qty} ${prod.unit || 'PCS'}) - Inv #${invoice.invoice_number}`,
            });
            totalCred += lineCogs;
          }

          inventoryMovementsToRecord.push({
            product: prod,
            quantity: qty,
            unitCost: unitCost,
            totalCost: lineCogs,
          });
        }
      }
    }

    totalDeb = quantizeAmount(totalDeb);
    totalCred = quantizeAmount(totalCred);

    // Double-entry balance check
    if (Math.abs(totalDeb - totalCred) > 0.001) {
      const err = new Error(
        `Double-entry imbalance: Total Debit (${totalDeb}) != Total Credit (${totalCred})`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // 6. Create General Ledger Journal Entry
    const jeEntryNumber = await AccountingEngine.generateEntryNumber(invoice.entity_id, 'JE');
    const journalEntry = await JournalEntry.create({
      entity_id: invoice.entity_id,
      entry_number: jeEntryNumber,
      entry_date: invoice.issue_date,
      status: JournalStatus.POSTED,
      memo: `Sales Invoice #${invoice.invoice_number}`,
      reference: invoice.invoice_number,
      currency: 'INR',
      exchange_rate: toDecimal(1.0),
      total_debit: toDecimal(totalDeb),
      total_credit: toDecimal(totalCred),
      lines: journalLines,
      created_by_user_id: userId,
      posted_by_user_id: userId,
    });

    // 7. Decrement Stock and Record Inventory Movements
    for (const mov of inventoryMovementsToRecord) {
      const prod = mov.product;
      const currentStock = fromDecimal(prod.current_stock);
      prod.current_stock = toDecimal(currentStock - mov.quantity);
      await prod.save();

      await InventoryMovement.create({
        entity_id: invoice.entity_id,
        product_id: prod._id,
        movement_type: InventoryMovementType.SALE,
        movement_date: invoice.issue_date,
        quantity: toDecimal(mov.quantity),
        unit_cost: toDecimal(mov.unitCost),
        total_cost: toDecimal(mov.totalCost),
        reference_type: 'INVOICE',
        reference_id: invoice.invoice_number,
        warehouse_location: prod.warehouse_location || 'Main Warehouse',
        notes: `Sales Dispatch for Invoice #${invoice.invoice_number} (${mov.quantity} ${prod.unit || 'PCS'})`,
        journal_entry_id: journalEntry._id,
        created_by_user_id: userId,
      });
    }

    // 8. Update Invoice and Customer Balance
    invoice.journal_entry_id = journalEntry._id;
    const paidAmt = fromDecimal(invoice.amount_paid);
    if (paidAmt >= totalInvoiceAmt) {
      invoice.status = InvoiceStatus.PAID;
    } else if (paidAmt > 0) {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    } else {
      invoice.status = InvoiceStatus.SENT;
    }
    await invoice.save();

    const customer = await Customer.findById(invoice.customer_id);
    if (customer) {
      const currentCustBal = fromDecimal(customer.current_balance);
      customer.current_balance = toDecimal(quantizeAmount(currentCustBal + totalInvoiceAmt));
      await customer.save();
    }

    await AuditService.log({
      action: 'INVOICE_POSTED',
      resource_type: 'Invoice',
      resource_id: invoice.invoice_number,
      entity_id: invoice.entity_id,
      user_id: new mongoose.Types.ObjectId(String(userId)),
      details: {
        invoice_number: invoice.invoice_number,
        journal_entry_number: jeEntryNumber,
        total_amount: totalInvoiceAmt,
      },
    });

    return { invoice, journalEntry };
  }

  /**
   * Record Customer Payment, update invoice balance, update customer ledger,
   * and post balanced double-entry transaction:
   * Debit: Bank / Cash (deposit_to_account_id)
   * Credit: Accounts Receivable (1200)
   */
  public static async recordCustomerPayment(data: {
    entity_id: mongoose.Types.ObjectId | string;
    invoice_id: mongoose.Types.ObjectId | string;
    amount: number;
    payment_mode: PaymentMode;
    payment_date: Date;
    deposit_to_account_id: mongoose.Types.ObjectId | string;
    reference_number?: string;
    user_id: mongoose.Types.ObjectId | string;
  }): Promise<{ payment: ICustomerPayment; invoice: IInvoice }> {
    const payAmt = quantizeAmount(data.amount);
    if (payAmt <= 0.0) {
      const err = new Error('Payment amount must be greater than zero.');
      (err as any).statusCode = 400;
      throw err;
    }

    const invoice = await Invoice.findOne({
      _id: data.invoice_id,
      entity_id: data.entity_id,
    });
    if (!invoice) {
      const err = new Error('Invoice not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const balanceDue = quantizeAmount(fromDecimal(invoice.balance_due));
    if (payAmt > balanceDue + 0.001) {
      const err = new Error(`Payment amount (${payAmt}) exceeds balance due (${balanceDue}).`);
      (err as any).statusCode = 400;
      throw err;
    }

    const arAccount = await AccountingEngine.getOrCreateAccount(
      data.entity_id,
      '1200',
      'Accounts Receivable (AR)',
      AccountType.ASSET,
      NormalBalance.DEBIT
    );

    const paymentNumber = await this.generatePaymentNumber(data.entity_id);

    // Create Balanced Journal Entry for Payment: Debit Bank, Credit AR
    const jeEntryNumber = await AccountingEngine.generateEntryNumber(data.entity_id, 'JE');
    const journalEntry = await JournalEntry.create({
      entity_id: data.entity_id,
      entry_number: jeEntryNumber,
      entry_date: data.payment_date,
      status: JournalStatus.POSTED,
      memo: `Customer Payment ${paymentNumber} for Inv #${invoice.invoice_number}`,
      reference: paymentNumber,
      currency: 'INR',
      exchange_rate: toDecimal(1.0),
      total_debit: toDecimal(payAmt),
      total_credit: toDecimal(payAmt),
      lines: [
        {
          account_id: new mongoose.Types.ObjectId(String(data.deposit_to_account_id)),
          debit: toDecimal(payAmt),
          credit: toDecimal(0.0),
          description: `Payment deposit for Inv #${invoice.invoice_number}`,
        },
        {
          account_id: arAccount._id,
          debit: toDecimal(0.0),
          credit: toDecimal(payAmt),
          description: `Receivable settlement for Inv #${invoice.invoice_number}`,
        },
      ],
      created_by_user_id: data.user_id,
      posted_by_user_id: data.user_id,
    });

    const payment = await CustomerPayment.create({
      entity_id: data.entity_id,
      customer_id: invoice.customer_id,
      invoice_id: invoice._id,
      payment_number: paymentNumber,
      payment_date: data.payment_date,
      amount: toDecimal(payAmt),
      payment_mode: data.payment_mode,
      reference_number: data.reference_number || null,
      deposit_to_account_id: data.deposit_to_account_id,
      journal_entry_id: journalEntry._id,
    });

    // Update Invoice balances
    const currentPaid = fromDecimal(invoice.amount_paid);
    const newPaid = quantizeAmount(currentPaid + payAmt);
    const newBalDue = quantizeAmount(balanceDue - payAmt);

    invoice.amount_paid = toDecimal(newPaid);
    invoice.balance_due = toDecimal(newBalDue);
    if (newBalDue <= 0.0) {
      invoice.status = InvoiceStatus.PAID;
    } else {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    }
    await invoice.save();

    // Decrement Customer Outstanding Balance
    const customer = await Customer.findById(invoice.customer_id);
    if (customer) {
      const custBal = fromDecimal(customer.current_balance);
      customer.current_balance = toDecimal(quantizeAmount(Math.max(0, custBal - payAmt)));
      await customer.save();
    }

    await AuditService.log({
      action: 'PAYMENT_RECEIVED',
      resource_type: 'CustomerPayment',
      resource_id: paymentNumber,
      entity_id: new mongoose.Types.ObjectId(String(data.entity_id)),
      user_id: new mongoose.Types.ObjectId(String(data.user_id)),
      details: {
        payment_number: paymentNumber,
        invoice_number: invoice.invoice_number,
        amount: payAmt,
      },
    });

    return { payment, invoice };
  }
}

