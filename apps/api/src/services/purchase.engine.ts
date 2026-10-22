import mongoose from 'mongoose';
import { AccountType, BillStatus, JournalStatus, NormalBalance, PaymentMode, InventoryMovementType } from '@ricozbooks/shared';
import { Bill, IBill, VendorPayment, IVendorPayment } from '../models/Bill';
import { Vendor } from '../models/Vendor';
import { Product } from '../models/Product';
import { InventoryMovement } from '../models/InventoryMovement';
import { JournalEntry } from '../models/JournalEntry';
import { AccountingEngine } from './accounting.engine';
import { AuditService } from './audit.service';
import { toDecimal, fromDecimal, quantizeAmount } from '../utils/decimal';

export class PurchaseEngine {
  /**
   * Generates sequential bill number: BILL-YYYY-0001
   */
  public static async generateBillNumber(entityId: mongoose.Types.ObjectId | string): Promise<string> {
    const year = new Date().getFullYear();
    const regex = new RegExp(`^BILL-${year}-`);
    const count = await Bill.countDocuments({
      entity_id: entityId,
      bill_number: { $regex: regex },
    });

    let seq = count + 1;
    while (true) {
      const candidate = `BILL-${year}-${String(seq).padStart(4, '0')}`;
      const existing = await Bill.findOne({
        entity_id: entityId,
        bill_number: candidate,
      });
      if (!existing) {
        return candidate;
      }
      seq++;
    }
  }

  /**
   * Generates sequential vendor payment number: VPAY-YYYY-0001
   */
  public static async generateVendorPaymentNumber(entityId: mongoose.Types.ObjectId | string): Promise<string> {
    const year = new Date().getFullYear();
    const regex = new RegExp(`^VPAY-${year}-`);
    const count = await VendorPayment.countDocuments({
      entity_id: entityId,
      payment_number: { $regex: regex },
    });

    let seq = count + 1;
    while (true) {
      const candidate = `VPAY-${year}-${String(seq).padStart(4, '0')}`;
      const existing = await VendorPayment.findOne({
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
   * Create a new vendor bill (DRAFT)
   */
  public static async createBill(data: {
    entity_id: mongoose.Types.ObjectId | string;
    vendor_id: mongoose.Types.ObjectId | string;
    bill_date: Date;
    due_date: Date;
    lines: Array<{
      product_id?: mongoose.Types.ObjectId | string | null;
      expense_account_id?: mongoose.Types.ObjectId | string | null;
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate?: number;
    }>;
  }): Promise<IBill> {
    const vendor = await Vendor.findOne({
      _id: data.vendor_id,
      entity_id: data.entity_id,
    });
    if (!vendor) {
      const err = new Error('Vendor not found for this organization');
      (err as any).statusCode = 404;
      throw err;
    }

    if (!data.lines || data.lines.length === 0) {
      const err = new Error('A bill must have at least one line item');
      (err as any).statusCode = 400;
      throw err;
    }

    let subtotal = 0.0;
    let taxTotal = 0.0;
    let totalAmount = 0.0;
    const formattedLines = [];

    for (const line of data.lines) {
      const qty = quantizeAmount(line.quantity || 1.0);
      const unitPrice = quantizeAmount(line.unit_price || 0.0);
      const taxRate = quantizeAmount(line.tax_rate || 0.0);

      const lineSubtotal = quantizeAmount(qty * unitPrice);
      const lineTax = quantizeAmount(lineSubtotal * (taxRate / 100.0));
      const lineTotal = quantizeAmount(lineSubtotal + lineTax);

      subtotal += lineSubtotal;
      taxTotal += lineTax;
      totalAmount += lineTotal;

      formattedLines.push({
        product_id: line.product_id ? new mongoose.Types.ObjectId(String(line.product_id)) : null,
        expense_account_id: line.expense_account_id ? new mongoose.Types.ObjectId(String(line.expense_account_id)) : null,
        description: line.description || '',
        quantity: toDecimal(qty),
        unit_price: toDecimal(unitPrice),
        tax_rate: toDecimal(taxRate),
        line_total: toDecimal(lineTotal),
      });
    }

    subtotal = quantizeAmount(subtotal);
    taxTotal = quantizeAmount(taxTotal);
    totalAmount = quantizeAmount(totalAmount);

    const billNumber = await this.generateBillNumber(data.entity_id);

    const bill = await Bill.create({
      entity_id: data.entity_id,
      vendor_id: data.vendor_id,
      bill_number: billNumber,
      bill_date: data.bill_date,
      due_date: data.due_date,
      status: BillStatus.DRAFT,
      subtotal: toDecimal(subtotal),
      tax_total: toDecimal(taxTotal),
      total_amount: toDecimal(totalAmount),
      amount_paid: toDecimal(0.0),
      balance_due: toDecimal(totalAmount),
      lines: formattedLines,
    });

    return bill;
  }

  /**
   * Posts vendor bill to General Ledger:
   * Debit: 5000 Expense (or 1300 Inventory Asset)
   * Debit: 1400 Input CGST / 1410 Input SGST / 1420 Input IGST
   * Credit: 2000 Accounts Payable (AP)
   * Increments stock for inventory products
   * Updates Vendor AP balance
   */
  public static async postBillToGeneralLedger(
    billId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<{ bill: IBill; journalEntry: any }> {
    const bill = await Bill.findById(billId);
    if (!bill) {
      const err = new Error('Bill not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (bill.journal_entry_id || bill.status === BillStatus.POSTED) {
      const err = new Error('Bill is already posted to General Ledger');
      (err as any).statusCode = 400;
      throw err;
    }

    await AccountingEngine.validatePeriodOpen(bill.entity_id, bill.bill_date);

    const apAccount = await AccountingEngine.getOrCreateAccount(
      bill.entity_id,
      '2000',
      'Accounts Payable (AP)',
      AccountType.LIABILITY,
      NormalBalance.CREDIT
    );

    const defaultExpenseAccount = await AccountingEngine.getOrCreateAccount(
      bill.entity_id,
      '5000',
      'Operating & Purchase Expenses',
      AccountType.EXPENSE,
      NormalBalance.DEBIT
    );

    const defaultInventoryAccount = await AccountingEngine.getOrCreateAccount(
      bill.entity_id,
      '1300',
      'Merchandise Inventory',
      AccountType.ASSET,
      NormalBalance.DEBIT
    );

    const inputTaxAccount = await AccountingEngine.getOrCreateAccount(
      bill.entity_id,
      '1400',
      'Input GST Tax Credit',
      AccountType.ASSET,
      NormalBalance.DEBIT
    );

    const totalBill = quantizeAmount(fromDecimal(bill.total_amount));
    const subtotal = quantizeAmount(fromDecimal(bill.subtotal));
    const taxTotal = quantizeAmount(fromDecimal(bill.tax_total));

    const journalLines: any[] = [];
    let totalDeb = 0.0;
    let totalCred = 0.0;

    // Line 1: Debit Expense or Inventory Asset
    for (const line of bill.lines) {
      const lineTotal = quantizeAmount(fromDecimal(line.line_total));
      const taxRate = quantizeAmount(fromDecimal(line.tax_rate));
      const lineTaxable = quantizeAmount(taxRate > 0 ? (lineTotal / (1 + taxRate / 100)) : lineTotal);

      let targetAccount = defaultExpenseAccount._id;
      if (line.expense_account_id) {
        targetAccount = line.expense_account_id;
      } else if (line.product_id) {
        const prod = await Product.findById(line.product_id);
        if (prod && prod.track_inventory) {
          targetAccount = prod.inventory_account_id || defaultInventoryAccount._id;
        }
      }

      journalLines.push({
        account_id: targetAccount,
        debit: toDecimal(lineTaxable),
        credit: toDecimal(0.0),
        description: `Purchase - ${line.description} - Bill #${bill.bill_number}`,
      });
      totalDeb += lineTaxable;
    }

    // Input Tax Debit line
    if (taxTotal > 0.0) {
      journalLines.push({
        account_id: inputTaxAccount._id,
        debit: toDecimal(taxTotal),
        credit: toDecimal(0.0),
        description: `Input GST Credit - Bill #${bill.bill_number}`,
      });
      totalDeb += taxTotal;
    }

    // Credit Accounts Payable
    journalLines.push({
      account_id: apAccount._id,
      debit: toDecimal(0.0),
      credit: toDecimal(totalBill),
      description: `Vendor AP - Bill #${bill.bill_number}`,
    });
    totalCred += totalBill;

    // Small rounding adjustment
    totalDeb = quantizeAmount(totalDeb);
    totalCred = quantizeAmount(totalCred);
    const diff = quantizeAmount(totalDeb - totalCred);
    if (diff !== 0.0 && Math.abs(diff) <= 0.05 && journalLines.length > 0) {
      const currDeb = fromDecimal(journalLines[0].debit);
      journalLines[0].debit = toDecimal(quantizeAmount(currDeb - diff));
      totalDeb = quantizeAmount(totalDeb - diff);
    }

    if (Math.abs(totalDeb - totalCred) > 0.001) {
      const err = new Error(`Imbalance in bill posting: Debit ${totalDeb} != Credit ${totalCred}`);
      (err as any).statusCode = 400;
      throw err;
    }

    // Post to General Ledger
    const jeEntryNumber = await AccountingEngine.generateEntryNumber(bill.entity_id, 'JE');
    const journalEntry = await JournalEntry.create({
      entity_id: bill.entity_id,
      entry_number: jeEntryNumber,
      entry_date: bill.bill_date,
      status: JournalStatus.POSTED,
      memo: `Purchase Bill #${bill.bill_number}`,
      reference: bill.bill_number,
      currency: 'INR',
      exchange_rate: toDecimal(1.0),
      total_debit: toDecimal(totalDeb),
      total_credit: toDecimal(totalCred),
      lines: journalLines,
      created_by_user_id: userId,
      posted_by_user_id: userId,
    });

    // Update Inventory for tracked items
    for (const line of bill.lines) {
      if (line.product_id) {
        const prod = await Product.findOne({ _id: line.product_id, entity_id: bill.entity_id });
        if (prod && prod.track_inventory) {
          const qty = fromDecimal(line.quantity);
          const unitPrice = fromDecimal(line.unit_price);
          const currentStock = fromDecimal(prod.current_stock);

          prod.current_stock = toDecimal(currentStock + qty);
          // Update purchase price if new purchase
          if (unitPrice > 0) {
            prod.purchase_price = toDecimal(unitPrice);
          }
          await prod.save();

          await InventoryMovement.create({
            entity_id: bill.entity_id,
            product_id: prod._id,
            movement_type: InventoryMovementType.PURCHASE,
            movement_date: bill.bill_date,
            quantity: toDecimal(qty),
            unit_cost: toDecimal(unitPrice),
            total_cost: toDecimal(quantizeAmount(qty * unitPrice)),
            reference_type: 'BILL',
            reference_id: bill.bill_number,
            warehouse_location: prod.warehouse_location || 'Main Warehouse',
            notes: `Purchase Receipt for Bill #${bill.bill_number}`,
            journal_entry_id: journalEntry._id,
            created_by_user_id: userId,
          });
        }
      }
    }

    // Update Bill & Vendor Balance
    bill.journal_entry_id = journalEntry._id;
    bill.status = BillStatus.POSTED;
    await bill.save();

    const vendor = await Vendor.findById(bill.vendor_id);
    if (vendor) {
      const venBal = fromDecimal(vendor.current_balance);
      vendor.current_balance = toDecimal(quantizeAmount(venBal + totalBill));
      await vendor.save();
    }

    await AuditService.log({
      action: 'BILL_POSTED',
      resource_type: 'Bill',
      resource_id: bill.bill_number,
      entity_id: bill.entity_id,
      user_id: new mongoose.Types.ObjectId(String(userId)),
      details: {
        bill_number: bill.bill_number,
        total_amount: totalBill,
      },
    });

    return { bill, journalEntry };
  }

  /**
   * Record payment to vendor:
   * Debit: Accounts Payable (2000)
   * Credit: Bank / Cash (paid_from_account_id)
   */
  public static async recordVendorPayment(data: {
    entity_id: mongoose.Types.ObjectId | string;
    bill_id: mongoose.Types.ObjectId | string;
    amount: number;
    payment_mode: PaymentMode;
    payment_date: Date;
    paid_from_account_id: mongoose.Types.ObjectId | string;
    user_id: mongoose.Types.ObjectId | string;
  }): Promise<{ payment: IVendorPayment; bill: IBill }> {
    const payAmt = quantizeAmount(data.amount);
    if (payAmt <= 0.0) {
      const err = new Error('Payment amount must be greater than zero.');
      (err as any).statusCode = 400;
      throw err;
    }

    const bill = await Bill.findOne({
      _id: data.bill_id,
      entity_id: data.entity_id,
    });
    if (!bill) {
      const err = new Error('Bill not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const balanceDue = quantizeAmount(fromDecimal(bill.balance_due));
    if (payAmt > balanceDue + 0.001) {
      const err = new Error(`Payment amount (${payAmt}) exceeds balance due (${balanceDue}).`);
      (err as any).statusCode = 400;
      throw err;
    }

    const apAccount = await AccountingEngine.getOrCreateAccount(
      data.entity_id,
      '2000',
      'Accounts Payable (AP)',
      AccountType.LIABILITY,
      NormalBalance.CREDIT
    );

    const paymentNumber = await this.generateVendorPaymentNumber(data.entity_id);

    // Create Balanced Journal Entry for Vendor Payment: Debit AP, Credit Bank
    const jeEntryNumber = await AccountingEngine.generateEntryNumber(data.entity_id, 'JE');
    const journalEntry = await JournalEntry.create({
      entity_id: data.entity_id,
      entry_number: jeEntryNumber,
      entry_date: data.payment_date,
      status: JournalStatus.POSTED,
      memo: `Vendor Payment ${paymentNumber} for Bill #${bill.bill_number}`,
      reference: paymentNumber,
      currency: 'INR',
      exchange_rate: toDecimal(1.0),
      total_debit: toDecimal(payAmt),
      total_credit: toDecimal(payAmt),
      lines: [
        {
          account_id: apAccount._id,
          debit: toDecimal(payAmt),
          credit: toDecimal(0.0),
          description: `AP settlement for Bill #${bill.bill_number}`,
        },
        {
          account_id: new mongoose.Types.ObjectId(String(data.paid_from_account_id)),
          debit: toDecimal(0.0),
          credit: toDecimal(payAmt),
          description: `Disbursement for Bill #${bill.bill_number}`,
        },
      ],
      created_by_user_id: data.user_id,
      posted_by_user_id: data.user_id,
    });

    const payment = await VendorPayment.create({
      entity_id: data.entity_id,
      vendor_id: bill.vendor_id,
      bill_id: bill._id,
      payment_number: paymentNumber,
      payment_date: data.payment_date,
      amount: toDecimal(payAmt),
      payment_mode: data.payment_mode,
      paid_from_account_id: data.paid_from_account_id,
      journal_entry_id: journalEntry._id,
    });

    // Update Bill balances
    const currentPaid = fromDecimal(bill.amount_paid);
    const newPaid = quantizeAmount(currentPaid + payAmt);
    const newBalDue = quantizeAmount(balanceDue - payAmt);

    bill.amount_paid = toDecimal(newPaid);
    bill.balance_due = toDecimal(newBalDue);
    if (newBalDue <= 0.0) {
      bill.status = BillStatus.PAID;
    } else {
      bill.status = BillStatus.PARTIALLY_PAID;
    }
    await bill.save();

    // Decrement Vendor AP balance
    const vendor = await Vendor.findById(bill.vendor_id);
    if (vendor) {
      const venBal = fromDecimal(vendor.current_balance);
      vendor.current_balance = toDecimal(quantizeAmount(Math.max(0, venBal - payAmt)));
      await vendor.save();
    }

    await AuditService.log({
      action: 'VENDOR_PAYMENT_MADE',
      resource_type: 'VendorPayment',
      resource_id: paymentNumber,
      entity_id: new mongoose.Types.ObjectId(String(data.entity_id)),
      user_id: new mongoose.Types.ObjectId(String(data.user_id)),
      details: {
        payment_number: paymentNumber,
        bill_number: bill.bill_number,
        amount: payAmt,
      },
    });

    return { payment, bill };
  }
}

